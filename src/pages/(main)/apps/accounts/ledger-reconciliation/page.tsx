'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import type { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import type { Dropdown } from 'primereact/dropdown';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import type { ColumnFilterElementTemplateOptions } from 'primereact/column';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { apolloClient } from '@/lib/apolloClient';
import { useAuth } from '@/lib/auth/context';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { isBankAccountsLabel, resolveLedgerGroupFilter } from '@/lib/accounts/ledgerGroupFilter';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';

interface BankReconciliationRow {
    postingId: number;
    voucherId: number | null;
    ledgerId: number;
    ledgerName: string | null;
    ledgerGroupName: string | null;
    voucherDate: string | null;
    voucherNumber: string | null;
    voucherType: string | null;
    counterLedgerName: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    balance: number;
    drCr: string;
    reconciliationDate: string | null;
    reconciliationRemark: string | null;
    isOpening: boolean;
    chequeNo: string | null;
    discountAmount: number | null;
    chequeCancelCharges: number | null;
}

type ReconEdit = {
    date: Date | null;
    remark: string;
    touchedDate: boolean;
    touchedRemark: boolean;
};

interface LedgerLookupRow {
    ledgerId: number;
    name: string | null;
    ledgerGroupId: number | null;
    address: string | null;
}

interface LedgerLookupOption extends LedgerLookupRow {
    label: string;
}

type ColumnFilterConstraint = {
    value?: unknown;
    matchMode?: string;
};

type ColumnFilterMeta = {
    operator?: string;
    constraints?: ColumnFilterConstraint[];
    value?: unknown;
    matchMode?: string;
};

type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

const buildMultiSelectFilterElement =
    <T extends string | number>(items: FilterOption<T>[], placeholder = 'Any') =>
    (options: ColumnFilterElementTemplateOptions) => (
        <AppMultiSelect
            value={(options.value ?? []) as T[]}
            options={items}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => options.filterCallback(event.value)}
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder={placeholder}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={items.length ? 'No values found' : 'No values'}
            emptyFilterMessage="No results found"
            disabled={items.length === 0}
            style={{ minWidth: '20rem' }}
        />
    );

const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

const ALL_LEDGER_LIMIT = 10000;
const SEARCH_LEDGER_LIMIT = 200;
const RECONCILIATION_LIMIT = 10000;

const BANK_RECONCILIATION = gql`
    query BankReconciliation(
        $bankLedgerId: Int!
        $search: String
        $fromDate: String
        $toDate: String
        $partyLedgerId: Int
        $amount: Float
        $onlyPending: Int
        $filterByReconcileDate: Int
        $limit: Int
        $offset: Int
    ) {
        bankReconciliation(
            bankLedgerId: $bankLedgerId
            search: $search
            fromDate: $fromDate
            toDate: $toDate
            partyLedgerId: $partyLedgerId
            amount: $amount
            onlyPending: $onlyPending
            filterByReconcileDate: $filterByReconcileDate
            limit: $limit
            offset: $offset
        ) {
            items {
                postingId
                voucherId
                ledgerId
                ledgerName
                ledgerGroupName
                voucherDate
                voucherNumber
                voucherType
                counterLedgerName
                narration
                debit
                credit
                balance
                drCr
                reconciliationDate
                reconciliationRemark
                isOpening
                chequeNo
                discountAmount
                chequeCancelCharges
            }
            totalCount
            debitTotal
            creditTotal
        }
    }
`;

const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $ledgerGroupId: Int) {
        ledgerSummaries(search: $search, ledgerGroupId: $ledgerGroupId, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                ledgerGroupId
                address
            }
        }
    }
`;

const UPDATE_RECON = gql`
    mutation UpdateBankReconciliationEntries($entries: [BankReconciliationUpdateInput!]!) {
        updateBankReconciliationEntries(entries: $entries)
    }
`;

const LEDGER_CURRENT_BALANCE = gql`
    query LedgerCurrentBalance($ledgerId: Int!, $toDate: String) {
        ledgerCurrentBalance(ledgerId: $ledgerId, toDate: $toDate, cancelled: 0) {
            amount
            drCr
        }
    }
`;

const LEDGER_RECON_STATEMENT_IMPORT = gql`
    query LedgerReconciliationStatementImport($ledgerId: Int!, $fromDate: String!, $toDate: String!, $includeFile: Boolean) {
        ledgerReconciliationStatementImport(ledgerId: $ledgerId, fromDate: $fromDate, toDate: $toDate, includeFile: $includeFile) {
            statementImportId
            fileName
            contentType
            fileBase64
            createdAt
        }
    }
`;

const UPLOAD_LEDGER_RECON_STATEMENT_IMPORT = gql`
    mutation UploadLedgerReconciliationStatementImport(
        $ledgerId: Int!
        $fromDate: String!
        $toDate: String!
        $fileName: String!
        $contentType: String
        $fileBase64: String!
    ) {
        uploadLedgerReconciliationStatementImport(
            ledgerId: $ledgerId
            fromDate: $fromDate
            toDate: $toDate
            fileName: $fileName
            contentType: $contentType
            fileBase64: $fileBase64
        ) {
            statementImportId
            fileName
            contentType
            createdAt
        }
    }
`;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDate = (value: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()))
        return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return trimmed;
};

const parseDateText = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const toLocalDate = (year: number, month: number, day: number) => {
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
        return new Date(year, month - 1, day);
    };

    if (/^\d{8}$/.test(trimmed)) {
        const year = Number(trimmed.slice(0, 4));
        const month = Number(trimmed.slice(4, 6));
        const day = Number(trimmed.slice(6, 8));
        return toLocalDate(year, month, day);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-').map(Number);
        return toLocalDate(year, month, day);
    }
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const day = Number(slash[1]);
        const month = Number(slash[2]);
        const year = Number(slash[3]);
        return toLocalDate(year, month, day);
    }
    return null;
};

const parseFiscalYearRange = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/(\d{4})\D+(\d{2,4})/);
    if (!match) return null;
    const startYear = Number(match[1]);
    const endText = match[2];
    const endYear = endText.length === 2 ? Number(`${String(startYear).slice(0, 2)}${endText}`) : Number(endText);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
    return { startYear, endYear };
};

const buildDefaultFiscalRange = (baseDate = new Date()) => {
    const startYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
    return {
        start: new Date(startYear, 3, 1),
        end: new Date(startYear + 1, 2, 31)
    };
};

const buildTextFilterOptions = (values: Array<string | null | undefined>): FilterOption<string>[] => {
    const unique = new Map<string, true>();
    values.forEach((value) => {
        if (!value) return;
        const trimmed = value.trim();
        if (!trimmed) return;
        unique.set(trimmed, true);
    });
    return Array.from(unique.keys())
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map((value) => ({ label: value, value }));
};

const buildDateFilterOptions = (values: Array<string | null | undefined>): FilterOption<string>[] => {
    const unique = new Map<string, true>();
    values.forEach((value) => {
        if (!value) return;
        const trimmed = value.trim();
        if (!trimmed) return;
        unique.set(trimmed, true);
    });
    return Array.from(unique.keys())
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map((value) => ({ label: formatDate(value), value }));
};

const buildNumberFilterOptions = (values: Array<number | null | undefined>): FilterOption<number>[] => {
    const unique = new Set<number>();
    values.forEach((value) => {
        if (value == null || !Number.isFinite(value)) return;
        unique.add(value);
    });
    return Array.from(unique.values())
        .sort((a, b) => a - b)
        .map((value) => ({ label: formatAmount(value), value }));
};

const resolveFiscalRange = (startText: string | null, endText: string | null) => {
    let start = parseDateText(startText);
    let end = parseDateText(endText);

    if (start || end) {
        if (start && !end) {
            end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1);
        } else if (!start && end) {
            start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);
        }
        return { start: start ?? null, end: end ?? null };
    }

    const range = parseFiscalYearRange(startText ?? endText);
    if (range) {
        return {
            start: new Date(range.startYear, 3, 1),
            end: new Date(range.endYear, 2, 31)
        };
    }

    return buildDefaultFiscalRange();
};

enum StatementMatchRule {
    ChqAmtDate = 0,
    AmtDateParty = 1,
    AmtDate = 2,
    AmtDateExact = 3
}

type StatementPreviewStatus = 'Matched' | 'Ambiguous' | 'Unmatched' | '';

type StatementEntry = {
    sourceRowNumber: number;
    postDate: Date | null;
    valueDate: Date | null;
    chequeNumber: string;
    description: string;
    debit: number;
    credit: number;
    excelStatus: string;
    excelRemark: string;
    status: StatementPreviewStatus;
    matchedTo?: string;
    reason?: string;
    matchedRowIndices?: number[];
};

type StatementWorkbookInfo = {
    workbook: any;
    sheetName: string;
    headerRowIndex: number;
    colRecStatus: number;
    colRecRemark: number;
};

const STATEMENT_HEADER_SCAN_LIMIT = 200;
const AMOUNT_MATCH_TOLERANCE = 0.01;
const MAX_CANDIDATES_FOR_SUM_MATCH = 28;

const MATCH_RULE_OPTIONS = [
    { label: 'Chq + Amt + Dt(>=)', value: StatementMatchRule.ChqAmtDate },
    { label: 'Amt + Dt(>=) + Party', value: StatementMatchRule.AmtDateParty },
    { label: 'Amt + Dt(>=)', value: StatementMatchRule.AmtDate },
    { label: 'Sum Amt + Dt(=)', value: StatementMatchRule.AmtDateExact }
];

const getRuleShortText = (rule: StatementMatchRule) => {
    if (rule === StatementMatchRule.AmtDateParty) return 'Amt+Dt(>=)+Party';
    if (rule === StatementMatchRule.AmtDate) return 'Amt+Dt(>=)';
    if (rule === StatementMatchRule.AmtDateExact) return 'SumAmt+Dt(=)';
    return 'Chq+Amt+Dt(>=)';
};

const getAutoRemark = (rule: StatementMatchRule) => {
    if (rule === StatementMatchRule.ChqAmtDate) return 'Amt/Chq/Dt>=';
    if (rule === StatementMatchRule.AmtDateParty) return 'Amt/Party/Dt>=';
    if (rule === StatementMatchRule.AmtDateExact) return 'SumAmt/Dt=';
    return 'Amt/Dt>=';
};

const normalizeHeader = (value: unknown) => {
    const text = String(value ?? '').trim();
    if (!text) return '';
    let out = '';
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (/[a-z0-9]/i.test(ch)) {
            out += ch.toUpperCase();
        }
    }
    return out;
};

const normalizeAlphaNumericUpper = (value: string) => {
    if (!value) return '';
    let out = '';
    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if (/[a-z0-9]/i.test(ch)) {
            out += ch.toUpperCase();
        }
    }
    return out;
};

const extractTokens = (value: string) => {
    if (!value) return [] as string[];
    const tokens: string[] = [];
    let current = '';
    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if (/[a-z0-9]/i.test(ch)) {
            current += ch;
        } else if (current) {
            tokens.push(current);
            current = '';
        }
    }
    if (current) tokens.push(current);
    return tokens;
};

const isAllDigits = (value: string) => {
    if (!value) return false;
    for (let i = 0; i < value.length; i += 1) {
        if (!/[0-9]/.test(value[i])) return false;
    }
    return true;
};

const normalizeChequeNumber = (value: string) => {
    if (!value) return '';
    let digits = '';
    for (let i = 0; i < value.length; i += 1) {
        if (/[0-9]/.test(value[i])) digits += value[i];
    }
    let start = 0;
    while (start < digits.length - 1 && digits[start] === '0') start += 1;
    return digits.slice(start);
};

const getChequeNumberText = (value: unknown) => {
    if (value == null) return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
        const rounded = Math.round(value);
        if (Math.abs(value - rounded) < 1e-7) return String(rounded);
        return String(value);
    }
    return String(value ?? '').trim();
};

const parseAmountValue = (value: unknown) => {
    if (value == null) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value);
    const text = String(value).replace(/,/g, '').trim();
    if (!text) return 0;
    const parsed = Number(text);
    if (Number.isFinite(parsed)) return Math.abs(parsed);
    return 0;
};

const parseExcelDateValue = (value: unknown) => {
    if (value == null) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const utc = Math.round((value - 25569) * 86400 * 1000);
        const date = new Date(utc);
        if (!Number.isNaN(date.getTime())) return date;
    }
    const text = String(value ?? '').trim();
    const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dash) {
        const day = Number(dash[1]);
        const month = Number(dash[2]);
        const year = Number(dash[3]);
        if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
            return new Date(year, month - 1, day);
        }
    }
    const parsed = parseDateText(text);
    if (parsed) return parsed;
    const loose = new Date(text);
    if (!Number.isNaN(loose.getTime())) return loose;
    return null;
};

const parseNumericLike = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').trim();
        if (!cleaned) return NaN;
        const num = Number(cleaned);
        return Number.isFinite(num) ? num : NaN;
    }
    return NaN;
};

const resolveAmountValue = (primary: unknown, ...fallbacks: unknown[]) => {
    const primaryNum = parseNumericLike(primary);
    const primaryValid = Number.isFinite(primaryNum);
    const primaryZero = primaryValid && primaryNum === 0;
    if (primaryValid && !primaryZero) return primaryNum;
    let fallbackZero: number | null = primaryValid ? primaryNum : null;
    for (const value of fallbacks) {
        const num = parseNumericLike(value);
        if (!Number.isFinite(num)) continue;
        if (num !== 0) return num;
        if (fallbackZero === null) fallbackZero = num;
    }
    return fallbackZero ?? 0;
};

const dateToLong = (date: Date | null) => {
    if (!date) return 0;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return Number(`${yyyy}${mm}${dd}`);
};

const toUpdatedStatementFileName = (fileName: string) => {
    const trimmed = fileName.trim();
    if (!trimmed) return 'statement-matched.xlsx';
    const match = trimmed.match(/\.(xlsx|xls)$/i);
    if (match) {
        return trimmed.replace(/\.(xlsx|xls)$/i, '-matched.xlsx');
    }
    return `${trimmed}-matched.xlsx`;
};

const updateStatementWorkbook = async (info: StatementWorkbookInfo, entries: StatementEntry[]) => {
    const XLSX = await import('xlsx');
    const workbook = info.workbook;
    const sheet = workbook.Sheets?.[info.sheetName];
    if (!sheet) return null;

    const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    let lastCol = range.e.c ?? 0;
    let statusCol = info.colRecStatus;
    let remarkCol = info.colRecRemark;

    if (statusCol < 0) {
        statusCol = lastCol + 1;
        lastCol = statusCol;
        sheet[XLSX.utils.encode_cell({ r: info.headerRowIndex, c: statusCol })] = { t: 's', v: 'Rec Status' };
    }
    if (remarkCol < 0) {
        remarkCol = lastCol + 1;
        lastCol = remarkCol;
        sheet[XLSX.utils.encode_cell({ r: info.headerRowIndex, c: remarkCol })] = { t: 's', v: 'Rec Remark' };
    }

    if (lastCol > (range.e.c ?? 0)) {
        range.e.c = lastCol;
        sheet['!ref'] = XLSX.utils.encode_range(range);
    }

    entries.forEach((entry) => {
        if (!entry.status) return;
        const rowIndex = Math.max(0, entry.sourceRowNumber - 1);
        const statusText = entry.status;
        const remarkText = entry.status === 'Matched' ? entry.matchedTo ?? '' : entry.reason ?? '';
        sheet[XLSX.utils.encode_cell({ r: rowIndex, c: statusCol })] = { t: 's', v: statusText };
        sheet[XLSX.utils.encode_cell({ r: rowIndex, c: remarkCol })] = { t: 's', v: remarkText };
    });

    return workbook;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};

const base64ToBlob = (base64: string, contentType: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: contentType });
};

const getStatementDate = (entry: StatementEntry) => entry.valueDate ?? entry.postDate ?? null;

const buildMatchDisplayText = (row: BankReconciliationRow) => {
    const voucherNo = row.voucherNumber ?? '';
    const voucherDate = formatDate(row.voucherDate);
    const agLedger = (row.counterLedgerName ?? '').trim();
    const trimmedLedger = agLedger.length > 50 ? `${agLedger.slice(0, 50)}...` : agLedger;
    const parts = [];
    if (voucherNo) parts.push(`V.No. ${voucherNo}`);
    if (voucherDate) parts.push(voucherDate);
    if (trimmedLedger) parts.push(trimmedLedger);
    return parts.join(' | ');
};

const buildMatchDisplayTextForRows = (rows: BankReconciliationRow[], rowIndices: number[]) => {
    if (!rowIndices.length) return '';
    const limit = 3;
    const parts: string[] = [];
    for (let i = 0; i < rowIndices.length && i < limit; i += 1) {
        const row = rows[rowIndices[i]];
        if (!row) continue;
        const text = buildMatchDisplayText(row);
        if (text) parts.push(text);
    }
    let joined = parts.join(' + ');
    if (rowIndices.length > limit) {
        joined = `${joined}${joined ? ' + ' : ''}${rowIndices.length - limit} more`;
    }
    return joined;
};

const getGridMatchText = (row: BankReconciliationRow) => row.counterLedgerName ?? '';

const getPartyMatchScore = (statementDescription: string, gridMatchText: string) => {
    const descNorm = normalizeAlphaNumericUpper(statementDescription);
    if (!descNorm) return 0;
    const gridNorm = normalizeAlphaNumericUpper(gridMatchText);
    if (!gridNorm) return 0;
    if (gridNorm.length >= 4 && descNorm.includes(gridNorm)) {
        return 200 + gridNorm.length;
    }
    let score = 0;
    for (const token of extractTokens(gridMatchText)) {
        const tokenNorm = normalizeAlphaNumericUpper(token);
        if (tokenNorm.length < 4) continue;
        if (isAllDigits(tokenNorm)) continue;
        if (descNorm.includes(tokenNorm)) score += tokenNorm.length;
    }
    return score;
};

const findBestMatchRowIndicesBySumExactDate = (
    rows: BankReconciliationRow[],
    entry: StatementEntry,
    usedRowIndices: Set<number>
) => {
    let reason = '';
    let matchedTo = '';
    let isAmbiguous = false;

    const amount = entry.debit > 0 ? entry.debit : entry.credit;
    if (amount <= 0) {
        return { indices: [] as number[], reason: 'Statement amount is blank/zero.', matchedTo, isAmbiguous };
    }

    const statementDate = getStatementDate(entry);
    const statementDateLong = dateToLong(statementDate);
    if (!statementDateLong) {
        return { indices: [] as number[], reason: 'Statement date is blank/invalid.', matchedTo, isAmbiguous };
    }

    if (entry.debit > 0 && entry.credit > 0) {
        return { indices: [] as number[], reason: 'Statement row has both Debit and Credit amounts.', matchedTo, isAmbiguous };
    }

    const isStatementDebit = entry.debit > 0 && entry.credit <= 0;
    const isStatementCredit = entry.credit > 0 && entry.debit <= 0;
    if (!isStatementDebit && !isStatementCredit) {
        return { indices: [] as number[], reason: 'Statement row Dr/Cr side is not clear.', matchedTo, isAmbiguous };
    }

    const targetCents = Math.round(amount * 100);
    if (targetCents <= 0) {
        return { indices: [] as number[], reason: 'Statement amount is blank/zero.', matchedTo, isAmbiguous };
    }

    const candidates: { rowIndex: number; amountCents: number }[] = [];
    for (let i = 0; i < rows.length; i += 1) {
        if (usedRowIndices.has(i)) continue;
        const row = rows[i];
        if (!row || row.postingId <= 0 || row.isOpening) continue;
        if (row.reconciliationDate) continue;

        const voucherDateLong = dateToLong(parseDateText(row.voucherDate ?? '') ?? null);
        if (!voucherDateLong || voucherDateLong !== statementDateLong) continue;

        const rowDr = row.debit ?? 0;
        const rowCr = row.credit ?? 0;
        const sideAmount = isStatementDebit ? rowCr : rowDr;
        if (sideAmount <= 0) continue;

        const sideCents = Math.round(sideAmount * 100);
        if (sideCents <= 0 || sideCents > targetCents) continue;

        candidates.push({ rowIndex: i, amountCents: sideCents });
    }

    if (!candidates.length) {
        return {
            indices: [],
            reason: 'No pending grid row found on same date with matching Dr/Cr side.',
            matchedTo,
            isAmbiguous
        };
    }

    const singleMatches = candidates.filter((c) => c.amountCents === targetCents).map((c) => c.rowIndex);
    if (singleMatches.length === 1) {
        matchedTo = buildMatchDisplayText(rows[singleMatches[0]]);
        return { indices: singleMatches, reason, matchedTo, isAmbiguous };
    }
    if (singleMatches.length > 1) {
        return {
            indices: [],
            reason: 'Multiple grid rows matched selected rule. Please reconcile manually.',
            matchedTo,
            isAmbiguous: true
        };
    }

    const seen = new Map<number, number[]>();
    let pairSolution: number[] | null = null;
    let pairCount = 0;
    for (const cand of candidates) {
        const complement = targetCents - cand.amountCents;
        const complementRows = seen.get(complement);
        if (complementRows) {
            for (const rowIndex of complementRows) {
                pairCount += 1;
                if (pairCount === 1) {
                    pairSolution = [rowIndex, cand.rowIndex];
                } else {
                    return {
                        indices: [],
                        reason: 'Multiple grid rows matched selected rule. Please reconcile manually.',
                        matchedTo,
                        isAmbiguous: true
                    };
                }
            }
        }
        const list = seen.get(cand.amountCents) ?? [];
        list.push(cand.rowIndex);
        seen.set(cand.amountCents, list);
    }

    if (pairCount === 1 && pairSolution) {
        pairSolution.sort((a, b) => a - b);
        matchedTo = buildMatchDisplayTextForRows(rows, pairSolution);
        return { indices: pairSolution, reason, matchedTo, isAmbiguous };
    }

    if (candidates.length > MAX_CANDIDATES_FOR_SUM_MATCH) {
        return {
            indices: [],
            reason: 'Too many pending rows on same date for total match. Please reconcile manually or filter data.',
            matchedTo,
            isAmbiguous
        };
    }

    candidates.sort((a, b) => b.amountCents - a.amountCents);
    const suffix: number[] = new Array(candidates.length + 1);
    suffix[candidates.length] = 0;
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
        suffix[i] = suffix[i + 1] + candidates[i].amountCents;
    }

    const current: number[] = [];
    let bestSolution: number[] | null = null;
    let solutionCount = 0;

    const dfs = (start: number, sum: number) => {
        if (solutionCount > 1) return;
        if (sum === targetCents) {
            solutionCount += 1;
            if (solutionCount === 1) bestSolution = [...current];
            return;
        }
        if (sum > targetCents) return;
        if (start >= candidates.length) return;
        if (sum + suffix[start] < targetCents) return;

        for (let i = start; i < candidates.length; i += 1) {
            const newSum = sum + candidates[i].amountCents;
            if (newSum > targetCents) continue;
            current.push(candidates[i].rowIndex);
            dfs(i + 1, newSum);
            current.pop();
            if (solutionCount > 1) return;
        }
    };

    dfs(0, 0);

    if (solutionCount === 1 && bestSolution && bestSolution.length > 0) {
        bestSolution.sort((a, b) => a - b);
        matchedTo = buildMatchDisplayTextForRows(rows, bestSolution);
        return { indices: bestSolution, reason, matchedTo, isAmbiguous };
    }

    if (solutionCount > 1) {
        return {
            indices: [],
            reason: 'Multiple grid rows matched selected rule. Please reconcile manually.',
            matchedTo,
            isAmbiguous: true
        };
    }

    return { indices: [], reason: 'No pending row total matched amount on same date.', matchedTo, isAmbiguous };
};

const findBestMatchRowIndex = (
    rows: BankReconciliationRow[],
    entry: StatementEntry,
    usedRowIndices: Set<number>,
    rule: StatementMatchRule
) => {
    let reason = '';
    let matchedTo = '';
    let isAmbiguous = false;

    const amount = entry.debit > 0 ? entry.debit : entry.credit;
    if (amount <= 0) {
        return { index: -1, reason: 'Statement amount is blank/zero.', matchedTo, isAmbiguous };
    }

    const statementDate = getStatementDate(entry);
    const statementDateLong = dateToLong(statementDate);
    if (!statementDateLong) {
        return { index: -1, reason: 'Statement date is blank/invalid.', matchedTo, isAmbiguous };
    }

    const statementChqNo = normalizeChequeNumber(entry.chequeNumber);
    const hasStatementChqNo = statementChqNo !== '';

    if (entry.debit > 0 && entry.credit > 0) {
        return { index: -1, reason: 'Statement row has both Debit and Credit amounts.', matchedTo, isAmbiguous };
    }

    if (rule === StatementMatchRule.ChqAmtDate && !hasStatementChqNo) {
        return {
            index: -1,
            reason: 'Selected rule requires Chq. No. but statement Chq. No. is blank.',
            matchedTo,
            isAmbiguous
        };
    }

    let countChq = 0;
    let countAmount = 0;
    let countDirection = 0;
    let countDate = 0;
    let countParty = 0;
    let candidateCount = 0;
    let candidateRowIndex = -1;

    for (let i = 0; i < rows.length; i += 1) {
        if (usedRowIndices.has(i)) continue;
        const row = rows[i];
        if (!row || row.postingId <= 0 || row.isOpening) continue;
        if (row.reconciliationDate) continue;

        if (rule === StatementMatchRule.ChqAmtDate) {
            const rowChqNo = normalizeChequeNumber(String(row.chequeNo ?? ''));
            if (!rowChqNo || rowChqNo !== statementChqNo) {
                continue;
            }
            countChq += 1;
        }

        const rowDr = row.debit ?? 0;
        const rowCr = row.credit ?? 0;
        const drMatch = Math.abs(rowDr - amount) <= AMOUNT_MATCH_TOLERANCE;
        const crMatch = Math.abs(rowCr - amount) <= AMOUNT_MATCH_TOLERANCE;
        if (!drMatch && !crMatch) continue;
        countAmount += 1;

        let directionMatch = false;
        if (entry.debit > 0 && entry.credit <= 0) {
            directionMatch = crMatch;
        } else if (entry.credit > 0 && entry.debit <= 0) {
            directionMatch = drMatch;
        }
        if (!directionMatch) continue;
        countDirection += 1;

        const voucherDateLong = dateToLong(parseDateText(row.voucherDate ?? '') ?? null);
        if (!voucherDateLong) continue;
        if (statementDateLong < voucherDateLong && rule !== StatementMatchRule.AmtDateExact) continue;
        if (rule === StatementMatchRule.AmtDateExact && statementDateLong !== voucherDateLong) continue;
        countDate += 1;

        if (rule === StatementMatchRule.AmtDateParty) {
            const partyScore = getPartyMatchScore(entry.description, getGridMatchText(row));
            if (partyScore <= 0) continue;
            countParty += 1;
        }

        candidateCount += 1;
        if (candidateCount === 1) {
            candidateRowIndex = i;
        } else {
            isAmbiguous = true;
            return {
                index: -1,
                reason: 'Multiple grid rows matched selected rule. Please reconcile manually.',
                matchedTo,
                isAmbiguous
            };
        }
    }

    if (candidateCount === 1 && candidateRowIndex >= 0) {
        matchedTo = buildMatchDisplayText(rows[candidateRowIndex]);
        return { index: candidateRowIndex, reason, matchedTo, isAmbiguous };
    }

    if (rule === StatementMatchRule.ChqAmtDate) {
        if (countChq === 0) {
            reason = 'No pending grid row found with same Chq. No.';
        } else if (countAmount === 0) {
            reason = 'Chq. No. matched but amount not matched.';
        } else if (countDirection === 0) {
            reason = 'Chq+Amount matched but Dr/Cr side not matched.';
        } else if (countDate === 0) {
            reason = 'Matched Chq+Amount but statement date is before voucher date.';
        } else {
            reason = 'No matching pending row found.';
        }
    } else if (rule === StatementMatchRule.AmtDateParty) {
        if (countAmount === 0) {
            reason = 'No pending row matched amount.';
        } else if (countDirection === 0) {
            reason = 'Amount matched but Dr/Cr side not matched.';
        } else if (countDate === 0) {
            reason = 'Amount matched but statement date is before voucher date.';
        } else if (countParty === 0) {
            reason = 'Amt+Date matched but party not matched.';
        } else {
            reason = 'No matching pending row found.';
        }
    } else if (rule === StatementMatchRule.AmtDateExact) {
        if (countAmount === 0) {
            reason = 'No pending row matched amount.';
        } else if (countDirection === 0) {
            reason = 'Amount matched but Dr/Cr side not matched.';
        } else if (countDate === 0) {
            reason = 'Amount matched but voucher date is not equal to statement date.';
        } else {
            reason = 'No matching pending row found.';
        }
    } else {
        if (countAmount === 0) {
            reason = 'No pending row matched amount.';
        } else if (countDirection === 0) {
            reason = 'Amount matched but Dr/Cr side not matched.';
        } else if (countDate === 0) {
            reason = 'Amount matched but statement date is before voucher date.';
        } else {
            reason = 'No matching pending row found.';
        }
    }

    return { index: -1, reason, matchedTo, isAmbiguous };
};

const readStatementEntriesFromExcel = async (file: File) => {
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('No sheets detected in workbook.');
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: { r: 0, c: 0 } };
    const rangeStartRow = range?.s?.r ?? 0;

    let headerRowIndex = -1;
    let colPostDate = -1;
    let colValueDate = -1;
    let colChequeNumber = -1;
    let colDescription = -1;
    let colDebit = -1;
    let colCredit = -1;
    let colRecStatus = -1;
    let colRecRemark = -1;

    const rowCount = rows.length;
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

    for (let r = 0; r < Math.min(rowCount, STATEMENT_HEADER_SCAN_LIMIT); r += 1) {
        for (let c = 0; c < colCount; c += 1) {
            const header = normalizeHeader(rows[r]?.[c] ?? '');
            if (header === 'POSTDATE') colPostDate = c;
            else if (header === 'VALUEDATE') colValueDate = c;
            else if (header === 'CHEQUENUMBER' || header === 'CHEQUENO' || header === 'CHQNUMBER' || header === 'CHQNO')
                colChequeNumber = c;
            else if (header === 'ACCOUNTDESCRIPTION' || header === 'DESCRIPTION' || header === 'NARRATION')
                colDescription = c;
            else if (header === 'DEBIT') colDebit = c;
            else if (header === 'CREDIT') colCredit = c;
            else if (header === 'RECSTATUS' || header === 'RECONCILESTATUS' || header === 'RECONSTATUS')
                colRecStatus = c;
            else if (header === 'RECREMARK' || header === 'RECONCILEREMARK' || header === 'RECONREMARK')
                colRecRemark = c;
        }
        if (colPostDate >= 0 && colDescription >= 0 && colDebit >= 0 && colCredit >= 0) {
            headerRowIndex = r;
            break;
        }
    }

    if (headerRowIndex < 0) {
        throw new Error('Could not find statement header row (Post Date / Account Description / Debit / Credit).');
    }

    if (colValueDate < 0) {
        colValueDate = colPostDate;
    }

    const entries: StatementEntry[] = [];
    let emptyRowStreak = 0;

    for (let r = headerRowIndex + 1; r < rowCount; r += 1) {
        const row = rows[r] ?? [];
        const description = String(row[colDescription] ?? '').trim();
        if (description.toUpperCase().includes('END OF STATEMENT')) break;

        let postDate = parseExcelDateValue(row[colPostDate]);
        let valueDate = parseExcelDateValue(row[colValueDate]);
        const chequeNumber = colChequeNumber >= 0 ? getChequeNumberText(row[colChequeNumber]) : '';
        const debit = colDebit >= 0 ? parseAmountValue(row[colDebit]) : 0;
        const credit = colCredit >= 0 ? parseAmountValue(row[colCredit]) : 0;

        const hasAnyData = Boolean(postDate || valueDate || chequeNumber || description || debit || credit);
        if (!hasAnyData) {
            emptyRowStreak += 1;
            if (emptyRowStreak >= 10) break;
            continue;
        }
        emptyRowStreak = 0;

        if (!postDate && valueDate) postDate = valueDate;
        if (!valueDate && postDate) valueDate = postDate;

        if (debit === 0 && credit === 0) continue;

        const excelStatus = colRecStatus >= 0 ? String(row[colRecStatus] ?? '').trim() : '';
        const excelRemark = colRecRemark >= 0 ? String(row[colRecRemark] ?? '').trim() : '';
        const statusText = excelStatus.trim().toLowerCase();
        let status: StatementPreviewStatus = '';
        let matchedTo = '';
        let reason = '';
        if (statusText === 'matched') {
            status = 'Matched';
            matchedTo = excelRemark;
        } else if (statusText === 'ambiguous') {
            status = 'Ambiguous';
            reason = excelRemark;
        } else if (statusText === 'unmatched') {
            status = 'Unmatched';
            reason = excelRemark;
        }

        entries.push({
            sourceRowNumber: rangeStartRow + r + 1,
            postDate,
            valueDate,
            chequeNumber,
            description,
            debit,
            credit,
            excelStatus,
            excelRemark,
            status,
            matchedTo,
            reason
        });
    }

    entries.sort((a, b) => {
        const dateA = dateToLong(getStatementDate(a));
        const dateB = dateToLong(getStatementDate(b));
        if (dateA !== dateB) return dateA - dateB;
        return a.sourceRowNumber - b.sourceRowNumber;
    });

    return { entries, sheetName, workbook, headerRowIndex, colRecStatus, colRecRemark, fileBuffer: data };
};

export default function AccountsBankReconciliationPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const toastRef = useRef<Toast>(null);

    const [ledgerGroupId, setLedgerGroupId] = useState<number | null>(null);
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerLookupRow[]>([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [ledgerSuggestions, setLedgerSuggestions] = useState<LedgerLookupOption[]>([]);
    const [ledgerPanelOpen, setLedgerPanelOpen] = useState(false);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [selectedBankLedger, setSelectedBankLedger] = useState<LedgerLookupOption | null>(null);
    const [reconciled, setReconciled] = useState<-1 | 0 | 1>(0);
    const [useReconcileDate, setUseReconcileDate] = useState(false);
    const [matchRule, setMatchRule] = useState<StatementMatchRule>(StatementMatchRule.ChqAmtDate);
    const [statementEntries, setStatementEntries] = useState<StatementEntry[]>([]);
    const [statementDialogVisible, setStatementDialogVisible] = useState(false);
    const [statementFileName, setStatementFileName] = useState('');
    const [statementUpdatedFile, setStatementUpdatedFile] = useState<{ name: string; url: string } | null>(null);
    const [statementImporting, setStatementImporting] = useState(false);
    const [statementMatching, setStatementMatching] = useState(false);
    const statementWorkbookRef = useRef<StatementWorkbookInfo | null>(null);
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [pendingReconEdits, setPendingReconEdits] = useState<Record<number, ReconEdit>>({});
    const [matchApplyOverrides, setMatchApplyOverrides] = useState<
        Record<number, { reconciliationDate: string | null; reconciliationRemark: string | null }>
    >({});
    const [matchApplyDateOverrides, setMatchApplyDateOverrides] = useState<Record<number, Date>>({});
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>({
        voucherNumber: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        chequeNo: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        voucherDate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        voucherType: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        counterLedgerName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        narration: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        debit: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        credit: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        balance: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        discountAmount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] },
        chequeCancelCharges: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.IN }] }
    });
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const ledgerGroupInputRef = useRef<AutoComplete>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const bankLedgerInputRef = useRef<AutoComplete>(null);
    const reconciledInputRef = useRef<Dropdown>(null);
    const matchRuleInputRef = useRef<Dropdown>(null);
    const refreshButtonId = 'ledger-reconciliation-refresh';
    const ledgerEnterRef = useRef(false);
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ groupId: number | null; search: string; mode: 'all' | 'search' } | null>(null);
    const statementFileInputRef = useRef<HTMLInputElement>(null);
    const hasManualLedgerGroupRef = useRef(false);

    const [saving, setSaving] = useState(false);

    const { options: ledgerGroupOptions, loading: ledgerGroupLoading } = useLedgerGroupOptions();
    const ledgerGroupFilter = useMemo(
        () => resolveLedgerGroupFilter(ledgerGroupId, ledgerGroupOptions),
        [ledgerGroupId, ledgerGroupOptions]
    );

    useEffect(() => {
        setPageTitle('Ledger Reconciliation');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    useEffect(() => {
        if (ledgerGroupId != null) return;
        if (!ledgerGroupOptions.length) return;
        if (hasManualLedgerGroupRef.current) return;
        const match = ledgerGroupOptions.find((option) => isBankAccountsLabel(option.label ?? option.name));
        if (match) {
            setLedgerGroupId(match.value);
        }
    }, [ledgerGroupId, ledgerGroupOptions]);

    useEffect(() => {
        if (ledgerGroupId == null) return;
        void fetchLedgers({ groupId: ledgerGroupFilter.fetchGroupId, mode: 'all' });
    }, [ledgerGroupFilter.fetchGroupId, ledgerGroupId]);

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const hasTouchedDatesRef = useRef(false);
    const canRefresh = Boolean(ledgerId && fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };
    const focusDropdown = (ref: React.RefObject<{ focus?: () => void }>) => {
        ref.current?.focus?.();
    };
    const focusMatchRuleInput = () => {
        focusDropdown(matchRuleInputRef);
    };

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const onlyPending = reconciled === -1 ? null : reconciled === 0 ? 1 : 0;
    const reconcileDateFilter = reconciled === 1 && useReconcileDate ? 1 : 0;
    const registerVariables = useMemo(
        () => ({
            bankLedgerId: ledgerId ?? 0,
            search: null,
            fromDate,
            toDate,
            partyLedgerId: null,
            amount: null,
            onlyPending,
            filterByReconcileDate: reconcileDateFilter,
            limit: RECONCILIATION_LIMIT,
            offset: 0
        }),
        [fromDate, ledgerId, onlyPending, reconcileDateFilter, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(BANK_RECONCILIATION, {
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables
    });

    const [loadLedgerLookup] = useLazyQuery(LEDGER_LOOKUP, { fetchPolicy: 'network-only' });
    const [uploadStatementImport] = useMutation(UPLOAD_LEDGER_RECON_STATEMENT_IMPORT);
    const { data: lastImportData, refetch: refetchLastImport } = useQuery(LEDGER_RECON_STATEMENT_IMPORT, {
        variables: {
            ledgerId: ledgerId ?? 0,
            fromDate: fromDate ?? '',
            toDate: toDate ?? '',
            includeFile: false
        },
        skip: !ledgerId || !fromDate || !toDate
    });
    const [loadStatementImportFile] = useLazyQuery(LEDGER_RECON_STATEMENT_IMPORT, { fetchPolicy: 'network-only' });

    const fetchLedgers = async (args?: { search?: string | null; groupId?: number | null; mode?: 'all' | 'search' }) => {
        const trimmed = args?.search?.trim() ?? '';
        const groupId = args?.groupId != null && args.groupId > 0 ? args.groupId : null;
        const mode = args?.mode ?? 'search';
        const lastFetch = ledgerLastFetchRef.current;

        if (!groupId && !trimmed && mode !== 'all') {
            setLedgerLookupRows([]);
            setIsLedgerLoading(false);
            return;
        }
        if (
            mode === 'all' &&
            trimmed.length === 0 &&
            lastFetch &&
            lastFetch.mode === 'all' &&
            lastFetch.search === '' &&
            lastFetch.groupId === groupId &&
            ledgerLookupRows.length > 0
        ) {
            setLedgerLookupRows((prev) => (prev.length ? [...prev] : prev));
            setIsLedgerLoading(false);
            return;
        }

        const requestId = ++ledgerRequestRef.current;
        const limit =
            mode === 'all'
                ? groupId
                    ? 2000
                    : ALL_LEDGER_LIMIT
                : groupId
                  ? 2000
                  : SEARCH_LEDGER_LIMIT;
        setIsLedgerLoading(true);
        try {
            const result = await loadLedgerLookup({
                variables: {
                    search: trimmed ? trimmed : null,
                    ledgerGroupId: groupId,
                    limit
                }
            });
            if (ledgerRequestRef.current !== requestId) return;
            const items = result.data?.ledgerSummaries?.items ?? [];
            setLedgerLookupRows(Array.isArray(items) ? [...(items as LedgerLookupRow[])] : []);
            ledgerLastFetchRef.current = { groupId, search: trimmed, mode };
        } catch {
            if (ledgerRequestRef.current === requestId) {
                setLedgerLookupRows([]);
            }
        } finally {
            if (ledgerRequestRef.current === requestId) {
                setIsLedgerLoading(false);
            }
        }
    };

    const todayBalanceText = useMemo(() => toDateText(new Date()), []);
    const { data: bankBalanceData, loading: bankBalanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        variables: { ledgerId: ledgerId ?? 0, toDate: todayBalanceText },
        skip: !ledgerId
    });

    const [updateRecon] = useMutation(UPDATE_RECON);

    useEffect(() => {
        if (reconciled !== 1 && useReconcileDate) {
            setUseReconcileDate(false);
        }
    }, [reconciled, useReconcileDate]);

    useEffect(() => {
        setFirst(0);
        setPendingReconEdits({});
    }, [fromDate, ledgerId, reconciled, toDate, reconcileDateFilter]);

    useEffect(() => {
        return () => {
            if (statementUpdatedFile?.url) {
                URL.revokeObjectURL(statementUpdatedFile.url);
            }
        };
    }, [statementUpdatedFile]);

    const rawRows: BankReconciliationRow[] = useMemo(() => {
        if (!hasApplied) return [];
        const items = (data?.bankReconciliation?.items ?? []) as BankReconciliationRow[];
        const mapped = items.map((row: any) => ({
            ...row,
            debit: resolveAmountValue(row.debit, row.drAmt, row.dr_amt, row.DrAmt, row.DR_AMT),
            credit: resolveAmountValue(row.credit, row.crAmt, row.cr_amt, row.CrAmt, row.CR_AMT),
            chequeNo: row.chequeNo ?? row.cheque_no ?? row.ChequeNo ?? row.CHEQUE_NO ?? null,
            chequeCancelCharges:
                row.chequeCancelCharges ?? row.cheque_cancel_charges ?? row.ChequeCancelCharges ?? null,
            discountAmount: row.discountAmount ?? row.discount ?? row.Discount ?? null,
            balance: resolveAmountValue(row.balance, row.Balance, row.BALANCE),
            drCr: row.drCr ?? row.DrCr ?? row.DRCR ?? row.DR_CR ?? null,
            reconciliationDate: row.reconciliationDate ?? null,
            reconciliationRemark: row.reconciliationRemark ?? null
        }));
        const hasBalance = mapped.some((row) => Number.isFinite(parseNumericLike(row.balance)));
        if (hasBalance) {
            return mapped.map((row) => {
                const balanceValue = parseNumericLike(row.balance);
                const drCrValue =
                    row.drCr ?? (Number.isFinite(balanceValue) ? (balanceValue >= 0 ? 'Dr' : 'Cr') : null);
                return {
                    ...row,
                    balance: Number.isFinite(balanceValue) ? Math.abs(balanceValue) : row.balance,
                    drCr: drCrValue
                };
            });
        }
        let runningBalance = 0;
        return mapped.map((row) => {
            const debit = resolveAmountValue(row.debit, 0);
            const credit = resolveAmountValue(row.credit, 0);
            runningBalance += debit - credit;
            return {
                ...row,
                balance: Math.abs(runningBalance),
                drCr: runningBalance >= 0 ? 'Dr' : 'Cr'
            };
        });
    }, [data, hasApplied]);

    const rows: BankReconciliationRow[] = useMemo(
        () =>
            rawRows.map((row) => {
                const override = matchApplyOverrides[row.postingId];
                if (!override) return row;
                return {
                    ...row,
                    reconciliationDate: override.reconciliationDate ?? row.reconciliationDate ?? null,
                    reconciliationRemark: override.reconciliationRemark ?? row.reconciliationRemark ?? null
                };
            }),
        [rawRows, matchApplyOverrides]
    );
    const totalPostings = hasApplied ? data?.bankReconciliation?.totalCount ?? 0 : 0;
    const totalRecords = hasApplied ? rows.length : 0;
    const debitTotal = data?.bankReconciliation?.debitTotal ?? 0;
    const creditTotal = data?.bankReconciliation?.creditTotal ?? 0;
    const discountTotal = useMemo(
        () =>
            rows.reduce((sum, row) => sum + resolveAmountValue(row.discountAmount, 0), 0),
        [rows]
    );
    const chequeChargesTotal = useMemo(
        () =>
            rows.reduce((sum, row) => sum + resolveAmountValue(row.chequeCancelCharges, 0), 0),
        [rows]
    );
    const balanceFooterLabel = useMemo(() => {
        if (!rows.length) return '';
        const lastRow = rows[rows.length - 1];
        const value = resolveAmountValue(lastRow.balance, 0);
        if (!Number.isFinite(value) || value === 0) return '';
        return formatAmount(value);
    }, [rows]);
    const balanceFooterDrCr = useMemo(() => {
        if (!rows.length) return '';
        const lastRow = rows[rows.length - 1];
        return lastRow.drCr ?? '';
    }, [rows]);

    const ledgerRows = useMemo(() => ledgerLookupRows, [ledgerLookupRows]);
    const ledgerOptions = useMemo<LedgerLookupOption[]>(() => {
        const filterIds = ledgerGroupFilter.filterIds;
        const filtered =
            filterIds.length > 0
                ? ledgerRows.filter((l) => l.ledgerGroupId != null && filterIds.includes(Number(l.ledgerGroupId)))
                : ledgerRows;
        const candidates =
            ledgerGroupId != null && ledgerGroupId > 0 && filtered.length === 0 && ledgerRows.length > 0
                ? ledgerRows
                : filtered;
        return candidates
            .map((l) => ({
                ...l,
                label: `${l.name ?? ''}`.trim() || `Ledger ${l.ledgerId}`
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [ledgerRows, ledgerGroupFilter.filterIds, ledgerGroupId]);

    useEffect(() => {
        setLedgerSuggestions(ledgerOptions);
    }, [ledgerOptions]);

    useEffect(() => {
        if (ledgerId == null) {
            setSelectedBankLedger(null);
            return;
        }
        if (selectedBankLedger && Number(selectedBankLedger.ledgerId) === Number(ledgerId)) return;
        const match = ledgerOptions.find((option) => Number(option.ledgerId) === Number(ledgerId)) ?? null;
        if (match) setSelectedBankLedger(match);
    }, [ledgerId, ledgerOptions, selectedBankLedger]);

    const showLedgerSpinner = isLedgerLoading && ledgerPanelOpen;
    const hasVoucherRows = rows.some((row) => row.postingId > 0 && !row.isOpening);
    const lastStatementImport = lastImportData?.ledgerReconciliationStatementImport ?? null;
    const statementSummary = useMemo(() => {
        if (!statementEntries.length) return '';
        const matched = statementEntries.filter((entry) => entry.status === 'Matched').length;
        const ambiguous = statementEntries.filter((entry) => entry.status === 'Ambiguous').length;
        const unmatched = statementEntries.filter((entry) => entry.status === 'Unmatched').length;
        return `Loaded: ${statementEntries.length}   Rule: ${getRuleShortText(matchRule)}   Matched: ${matched}   Ambiguous: ${ambiguous}   Unmatched: ${unmatched}`;
    }, [matchRule, statementEntries]);

    const statementPreviewRows = useMemo(
        () =>
            statementEntries.map((entry, index) => ({
                ...entry,
                rowKey: `${entry.sourceRowNumber}-${index}`
            })),
        [statementEntries]
    );
    const formatStatementDate = (value: Date | null) => (value ? formatDate(toDateText(value)) : '');

    const isEmptyFilterValue = (value: unknown) => {
        if (value == null) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        return false;
    };

    const getFilterValues = (filters: DataTableFilterMeta, field: string): unknown[] => {
        const meta = filters[field] as ColumnFilterMeta | undefined;
        if (!meta) return [];
        if (Array.isArray(meta.constraints)) {
            return meta.constraints
                .map((constraint) => constraint.value)
                .filter((value) => !isEmptyFilterValue(value));
        }
        if (isEmptyFilterValue(meta.value)) return [];
        return [meta.value];
    };

    const matchesInText = (value: string | null | undefined, filterValues: unknown[]) => {
        if (!filterValues.length) return true;
        const hay = String(value ?? '').toLowerCase();
        return filterValues.some((item) => String(item ?? '').toLowerCase() === hay);
    };

    const matchesInNumber = (value: number | null | undefined, filterValues: unknown[]) => {
        if (!filterValues.length) return true;
        const actual = value != null ? Number(value) : 0;
        return filterValues.some((item) => {
            const numeric = typeof item === 'number' ? item : Number(String(item).replace(/,/g, ''));
            return Number.isFinite(numeric) && Number(numeric) === Number(actual);
        });
    };

    const displayRows = useMemo(() => {
        const voucherNumberFilters = getFilterValues(columnFilters, 'voucherNumber');
        const chequeNoFilters = getFilterValues(columnFilters, 'chequeNo');
        const voucherDateFilters = getFilterValues(columnFilters, 'voucherDate');
        const voucherTypeFilters = getFilterValues(columnFilters, 'voucherType');
        const ledgerFilters = getFilterValues(columnFilters, 'counterLedgerName');
        const narrationFilters = getFilterValues(columnFilters, 'narration');
        const debitFilters = getFilterValues(columnFilters, 'debit');
        const creditFilters = getFilterValues(columnFilters, 'credit');
        const balanceFilters = getFilterValues(columnFilters, 'balance');
        const discountFilters = getFilterValues(columnFilters, 'discountAmount');
        const chequeChargesFilters = getFilterValues(columnFilters, 'chequeCancelCharges');
        const hasFilters =
            voucherNumberFilters.length ||
            chequeNoFilters.length ||
            voucherDateFilters.length ||
            voucherTypeFilters.length ||
            ledgerFilters.length ||
            narrationFilters.length ||
            debitFilters.length ||
            creditFilters.length ||
            balanceFilters.length ||
            discountFilters.length ||
            chequeChargesFilters.length;
        if (!hasFilters) return rows;
        return rows.filter((row) => {
            if (!matchesInText(row.voucherNumber, voucherNumberFilters)) return false;
            if (!matchesInText(row.chequeNo, chequeNoFilters)) return false;
            if (!matchesInText(row.voucherDate, voucherDateFilters)) return false;
            if (!matchesInText(row.voucherType, voucherTypeFilters)) return false;
            if (!matchesInText(row.counterLedgerName, ledgerFilters)) return false;
            if (!matchesInText(row.narration, narrationFilters)) return false;
            if (!matchesInNumber(row.debit, debitFilters)) return false;
            if (!matchesInNumber(row.credit, creditFilters)) return false;
            if (!matchesInNumber(row.balance, balanceFilters)) return false;
            if (!matchesInNumber(row.discountAmount, discountFilters)) return false;
            if (!matchesInNumber(row.chequeCancelCharges, chequeChargesFilters)) return false;
            return true;
        });
    }, [columnFilters, rows]);

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const voucherNumberFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.voucherNumber)),
        [rows]
    );
    const chequeNoFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.chequeNo)),
        [rows]
    );
    const voucherDateFilterOptions = useMemo(
        () => buildDateFilterOptions(rows.map((row) => row.voucherDate)),
        [rows]
    );
    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.voucherType)),
        [rows]
    );
    const ledgerFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.counterLedgerName)),
        [rows]
    );
    const narrationFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.narration)),
        [rows]
    );

    const debitFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.debit)), [rows]);
    const creditFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.credit)), [rows]);
    const balanceFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.balance)), [rows]);
    const discountFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => resolveAmountValue(row.discountAmount, 0))),
        [rows]
    );
    const chequeChargesFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => resolveAmountValue(row.chequeCancelCharges, 0))),
        [rows]
    );

    const voucherNumberFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherNumberFilterOptions),
        [voucherNumberFilterOptions]
    );
    const chequeNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(chequeNoFilterOptions),
        [chequeNoFilterOptions]
    );
    const voucherDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherDateFilterOptions),
        [voucherDateFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions),
        [voucherTypeFilterOptions]
    );
    const ledgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerFilterOptions),
        [ledgerFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions),
        [narrationFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions),
        [creditFilterOptions]
    );
    const balanceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(balanceFilterOptions),
        [balanceFilterOptions]
    );
    const discountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(discountFilterOptions),
        [discountFilterOptions]
    );
    const chequeChargesFilterElement = useMemo(
        () => buildMultiSelectFilterElement(chequeChargesFilterOptions),
        [chequeChargesFilterOptions]
    );

    const bankBalanceLabel = useMemo(() => {
        if (!ledgerId) return null;
        if (bankBalanceLoading) return 'Loading...';
        const balance = bankBalanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [bankBalanceData, bankBalanceLoading, ledgerId]);

    const bankBalanceSeverity = useMemo(() => {
        if (bankBalanceLoading) return 'warning';
        const drCr = bankBalanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'danger' : 'success';
    }, [bankBalanceData, bankBalanceLoading]);

    const showBankBalance = Boolean(
        bankBalanceLabel && selectedBankLedger && ledgerId && Number(selectedBankLedger.ledgerId) === Number(ledgerId)
    );

    const rowsByPostingId = useMemo(() => {
        const map = new Map<number, BankReconciliationRow>();
        rawRows.forEach((row) => {
            if (row.postingId > 0) {
                map.set(row.postingId, row);
            }
        });
        return map;
    }, [rawRows]);

    const pendingReconCount = useMemo(
        () =>
            Object.entries(pendingReconEdits).filter(([postingId, edit]) => {
                const id = Number(postingId);
                if (!rowsByPostingId.has(id)) return false;
                return edit.touchedDate || edit.touchedRemark;
            }).length,
        [pendingReconEdits, rowsByPostingId]
    );

    const resolveRowReconDate = (row: BankReconciliationRow) => {
        const overrideDate = matchApplyDateOverrides[row.postingId] ?? null;
        if (overrideDate && typeof console !== 'undefined') console.log('[ledger-reconciliation] resolved recDate', row.postingId, overrideDate);
        if (overrideDate) return overrideDate;
        const override = matchApplyOverrides[row.postingId]?.reconciliationDate ?? null;
        const raw = override ?? row.reconciliationDate ?? '';
        return parseDateText(raw) ?? null;
    };

    const resolveReconDateValue = (row: BankReconciliationRow) => {
        const edit = pendingReconEdits[row.postingId];
        if (edit?.touchedDate) return edit.date ?? resolveRowReconDate(row);
        return resolveRowReconDate(row);
    };

    const resolveReconRemarkValue = (row: BankReconciliationRow) => {
        const edit = pendingReconEdits[row.postingId];
        if (edit?.touchedRemark) return edit.remark;
        const override = matchApplyOverrides[row.postingId]?.reconciliationRemark ?? null;
        return override ?? row.reconciliationRemark ?? '';
    };

    const updateReconEdit = (postingId: number, patch: Partial<ReconEdit>) => {
        if (!Number.isFinite(postingId) || postingId <= 0) return;
        setPendingReconEdits((prev) => {
            const existing = prev[postingId] ?? {
                date: null,
                remark: '',
                touchedDate: false,
                touchedRemark: false
            };
            return {
                ...prev,
                [postingId]: {
                    ...existing,
                    ...patch
                }
            };
        });
    };

    const savePendingRecon = async () => {
        if (pendingReconCount === 0) return;
        setSaving(true);
        try {
            const entries = Object.entries(pendingReconEdits).reduce(
                (acc, [key, edit]) => {
                    const postingId = Number(key);
                    if (!Number.isFinite(postingId) || postingId <= 0) return acc;
                    if (!edit.touchedDate && !edit.touchedRemark) return acc;
                    const row = rowsByPostingId.get(postingId);
                    if (!row || row.isOpening) return acc;

                    const baseDate = parseDateText(row.reconciliationDate ?? '') ?? null;
                    const nextDate = edit.touchedDate ? edit.date : baseDate;
                    const baseRemark = row.reconciliationRemark ?? '';
                    const nextRemark = edit.touchedRemark ? edit.remark : baseRemark;
                    const nextDateText = nextDate ? toDateText(nextDate) : null;
                    const baseDateText = baseDate ? toDateText(baseDate) : null;
                    const nextRemarkTrim = nextRemark.trim();
                    const baseRemarkTrim = baseRemark.trim();

                    if ((nextDateText ?? '') === (baseDateText ?? '') && nextRemarkTrim === baseRemarkTrim) {
                        return acc;
                    }

                    acc.push({
                        postingId,
                        reconciliationDate: nextDateText,
                        reconciliationRemark: nextRemarkTrim ? nextRemarkTrim : null
                    });
                    return acc;
                },
                [] as { postingId: number; reconciliationDate: string | null; reconciliationRemark: string | null }[]
            );
            if (typeof console !== 'undefined') console.log('[ledger-reconciliation] save entries', entries.length, 'pending', pendingReconCount);

            if (!entries.length) {
                toastRef.current?.show({ severity: 'info', summary: 'No changes', detail: 'Nothing to save.' });
                return;
            }

            await updateRecon({ variables: { entries } });
            toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: 'Reconciliation updated.' });
            setPendingReconEdits((prev) => {
                const next = { ...prev };
                entries.forEach((entry) => {
                    delete next[entry.postingId];
                });
                return next;
            });
            await refetch(appliedVariables ?? registerVariables);
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to update' });
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (pendingReconCount > 0) {
            setPendingReconEdits({});
            setMatchApplyOverrides({});
            setMatchApplyDateOverrides({});
            toastRef.current?.show({
                severity: 'info',
                summary: 'Cleared pending',
                detail: 'Pending reconciliation changes cleared for refresh.'
            });
        }
        if (!hasApplied) {
            setAppliedVariables(registerVariables);
            return;
        }
        setAppliedVariables(registerVariables);
        void refetch(registerVariables);
    };

    const handleImportStatementClick = () => {
        if (!hasVoucherRows) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'No data',
                detail: 'Please click Refresh to load grid data before importing statement.'
            });
            return;
        }
        statementFileInputRef.current?.click();
    };

    const handleDownloadLastImport = async () => {
        if (!ledgerId || !fromDate || !toDate) return;
        try {
            const result = await loadStatementImportFile({
                variables: {
                    ledgerId,
                    fromDate,
                    toDate,
                    includeFile: true
                }
            });
            const info = result.data?.ledgerReconciliationStatementImport;
            if (!info?.fileBase64) {
                toastRef.current?.show({
                    severity: 'info',
                    summary: 'No file',
                    detail: 'Last import file is not available.'
                });
                return;
            }
            const contentType = info.contentType || 'application/octet-stream';
            const blob = base64ToBlob(info.fileBase64, contentType);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = info.fileName || 'statement.xlsx';
            link.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Download failed',
                detail: err?.message || 'Unable to download last import.'
            });
        }
    };

    const handleStatementFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setStatementImporting(true);
        try {
            const { entries, workbook, sheetName, headerRowIndex, colRecStatus, colRecRemark, fileBuffer } =
                await readStatementEntriesFromExcel(file);
            if (!entries.length) {
                toastRef.current?.show({
                    severity: 'info',
                    summary: 'No rows',
                    detail: 'No statement transactions found in the selected file.'
                });
                return;
            }
            setStatementEntries(entries);
            setStatementFileName(file.name);
            setStatementUpdatedFile(null);
            statementWorkbookRef.current = {
                workbook,
                sheetName,
                headerRowIndex,
                colRecStatus,
                colRecRemark
            };
            if (ledgerId && fromDate && toDate) {
                try {
                    const fileBase64 = arrayBufferToBase64(fileBuffer);
                    await uploadStatementImport({
                        variables: {
                            ledgerId,
                            fromDate,
                            toDate,
                            fileName: file.name,
                            contentType: file.type || 'application/octet-stream',
                            fileBase64
                        }
                    });
                    await refetchLastImport();
                } catch (err: any) {
                    toastRef.current?.show({
                        severity: 'warn',
                        summary: 'Import saved locally',
                        detail: err?.message || 'Failed to upload statement file to server.'
                    });
                }
            }
            setStatementDialogVisible(true);
        } catch (err: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Import failed',
                detail: err?.message || 'Error reading statement file.'
            });
        } finally {
            setStatementImporting(false);
            event.target.value = '';
        }
    };

    const handleMatchAndApply = async () => {
        if (!statementEntries.length) return;
        let matchRows = rows;
        if (hasApplied && totalPostings > rows.length && appliedVariables) {
            try {
                const result = await apolloClient.query({
                    query: BANK_RECONCILIATION,
                    fetchPolicy: 'network-only',
                    variables: { ...appliedVariables, limit: null, offset: 0 }
                });
                matchRows = (result.data?.bankReconciliation?.items ?? []) as BankReconciliationRow[];
            } catch {
                matchRows = rows;
            }
        }
        const pendingRows = matchRows.filter(
            (row) => row.postingId > 0 && !row.isOpening && !row.reconciliationDate
        );
        if (!pendingRows.length) {
            toastRef.current?.show({
                severity: 'info',
                summary: 'No pending rows',
                detail: 'No pending grid rows available to match.'
            });
            return;
        }

        setStatementMatching(true);
        try {
            const usedRowIndices = new Set<number>();
            const nextEntries = statementEntries.map((entry) => ({ ...entry }));
            const updatesMap = new Map<number, { postingId: number; reconciliationDate: string | null; reconciliationRemark: string | null }>();
            const updatesDateMap = new Map<number, Date>();

            for (const entry of nextEntries) {
                if (entry.status === 'Matched') continue;
                const matchResult =
                    matchRule === StatementMatchRule.AmtDateExact
                        ? findBestMatchRowIndicesBySumExactDate(pendingRows, entry, usedRowIndices)
                        : null;

                if (matchRule === StatementMatchRule.AmtDateExact) {
                    const { indices, reason, matchedTo, isAmbiguous } = matchResult!;
                    if (indices.length > 0) {
                        entry.status = 'Matched';
                        entry.matchedTo = matchedTo;
                        entry.reason = '';
                        entry.matchedRowIndices = indices;
                        indices.forEach((idx) => usedRowIndices.add(idx));
                    } else if (isAmbiguous) {
                        entry.status = 'Ambiguous';
                        entry.matchedTo = '';
                        entry.reason = reason;
                    } else {
                        entry.status = 'Unmatched';
                        entry.matchedTo = '';
                        entry.reason = reason;
                    }
                    continue;
                }

                const { index, reason, matchedTo, isAmbiguous } = findBestMatchRowIndex(
                    pendingRows,
                    entry,
                    usedRowIndices,
                    matchRule
                );
                if (index >= 0) {
                    entry.status = 'Matched';
                    entry.matchedTo = matchedTo;
                    entry.reason = '';
                    entry.matchedRowIndices = [index];
                    usedRowIndices.add(index);
                } else if (isAmbiguous) {
                    entry.status = 'Ambiguous';
                    entry.matchedTo = '';
                    entry.reason = reason;
                } else {
                    entry.status = 'Unmatched';
                    entry.matchedTo = '';
                    entry.reason = reason;
                }
            }

            nextEntries.forEach((entry) => {
                if (entry.status !== 'Matched' || !entry.matchedRowIndices?.length) return;
                const recDate = entry.postDate ?? entry.valueDate ?? null;
                if (recDate && typeof console !== 'undefined') console.log('[ledger-reconciliation] match recDate', entry.sourceRowNumber, recDate);
                if (!recDate) return;
                const recDateText = toDateText(recDate);
                for (const idx of entry.matchedRowIndices) {
                    const row = pendingRows[idx];
                    if (!row) continue;
                    const existingRemark = (row.reconciliationRemark ?? '').trim();
                    const remark = existingRemark || getAutoRemark(matchRule);
                    if (!updatesMap.has(row.postingId)) {
                        updatesMap.set(row.postingId, {
                            postingId: row.postingId,
                            reconciliationDate: recDateText,
                            reconciliationRemark: remark || null
                        });
                    }
                    if (!updatesDateMap.has(row.postingId)) {
                        updatesDateMap.set(row.postingId, recDate);
                    }
                }
            });

            nextEntries.forEach((entry) => {
                if (!entry.status) return;
                entry.excelStatus = entry.status;
                entry.excelRemark =
                    entry.status === 'Matched' ? entry.matchedTo ?? '' : entry.reason ?? '';
            });

            setStatementEntries(nextEntries);

            const updates = Array.from(updatesMap.values());
            if (!updates.length) {
                toastRef.current?.show({
                    severity: 'info',
                    summary: 'No matches',
                    detail: 'No statement rows matched the selected rule.'
                });
                return;
            }

            setPendingReconEdits((prev) => {
                const next = { ...prev };
                updates.forEach((update) => {
                    const existing = next[update.postingId] ?? {
                        date: null,
                        remark: '',
                        touchedDate: false,
                        touchedRemark: false
                    };
                    const parsedDate =
                        updatesDateMap.get(update.postingId) ??
                        (update.reconciliationDate ? parseDateText(String(update.reconciliationDate)) : null);
                    next[update.postingId] = {
                        date: parsedDate,
                        remark: update.reconciliationRemark ?? existing.remark ?? '',
                        touchedDate: Boolean(parsedDate),
                        touchedRemark: true
                    };
                });
                return next;
            });
            setMatchApplyOverrides((prev) => {
                const next = { ...prev };
                updates.forEach((update) => {
                    next[update.postingId] = {
                        reconciliationDate: update.reconciliationDate ?? null,
                        reconciliationRemark: update.reconciliationRemark ?? null
                    };
                });
                return next;
            });
            setMatchApplyDateOverrides((prev) => {
                const next = { ...prev };
                updatesDateMap.forEach((value, key) => {
                    next[key] = value;
                });
                return next;
            });
            toastRef.current?.show({
                severity: 'success',
                summary: 'Matched',
                detail: `${updates.length} row${updates.length === 1 ? '' : 's'} queued. Click Save to apply.`
            });

            if (statementWorkbookRef.current) {
                try {
                    const updatedWorkbook = await updateStatementWorkbook(statementWorkbookRef.current, nextEntries);
                    if (updatedWorkbook) {
                        const XLSX = await import('xlsx');
                        const buffer = XLSX.write(updatedWorkbook, { type: 'array', bookType: 'xlsx' });
                        const blob = new Blob([buffer], {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });
                        const url = URL.createObjectURL(blob);
                        const fileName = toUpdatedStatementFileName(statementFileName);
                        setStatementUpdatedFile((prev) => {
                            if (prev?.url) URL.revokeObjectURL(prev.url);
                            return { name: fileName, url };
                        });
                    }
                } catch {
                    // Ignore excel update errors
                }
            }
        } catch (err: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Match failed',
                detail: err?.message || 'Failed to apply matches.'
            });
        } finally {
            setStatementMatching(false);
        }
    };

    return (
        <div className="card app-gradient-card">
            <Toast ref={toastRef} />
            <input
                ref={statementFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleStatementFileChange}
            />
            <Dialog
                header={statementFileName ? `Statement Import (${statementFileName})` : 'Statement Import'}
                visible={statementDialogVisible}
                style={{ width: '90vw', maxWidth: '1200px' }}
                onHide={() => setStatementDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Close"
                            className="p-button-text"
                            onClick={() => setStatementDialogVisible(false)}
                        />
                        {statementUpdatedFile && (
                            <Button
                                label="Download Updated"
                                icon="pi pi-download"
                                className="p-button-text"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = statementUpdatedFile.url;
                                    link.download = statementUpdatedFile.name;
                                    link.click();
                                }}
                            />
                        )}
                        <Button
                            label={statementMatching ? 'Matching...' : 'Match & Apply'}
                            icon="pi pi-check"
                            onClick={handleMatchAndApply}
                            disabled={statementMatching || statementImporting || !statementEntries.length}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-2 statement-import-preview">
                    {statementSummary && <div className="text-600 text-sm">{statementSummary}</div>}
                    <AppDataTable
                        value={statementPreviewRows}
                        dataKey="rowKey"
                        rows={10}
                        paginator={statementPreviewRows.length > 10}
                        size="small"
                        stripedRows
                        loading={statementImporting || statementMatching}
                        rowClassName={(row) => {
                            if (row.status === 'Matched') return 'statement-preview-row--matched';
                            if (row.status === 'Ambiguous') return 'statement-preview-row--ambiguous';
                            if (row.status === 'Unmatched') return 'statement-preview-row--unmatched';
                            return '';
                        }}
                        emptyMessage={statementImporting ? '' : 'No statement rows'}
                    >
                        <Column field="sourceRowNumber" header="Row" style={{ width: '4rem' }} />
                        <Column
                            field="postDate"
                            header="Post Date"
                            body={(row: StatementEntry) => formatStatementDate(row.postDate)}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            field="valueDate"
                            header="Value Date"
                            body={(row: StatementEntry) => formatStatementDate(row.valueDate)}
                            style={{ width: '7rem' }}
                        />
                        <Column field="chequeNumber" header="Chq No." style={{ width: '7rem' }} />
                        <Column
                            field="debit"
                            header="Debit"
                            body={(row: StatementEntry) => (row.debit ? formatAmount(row.debit) : '')}
                            style={{ width: '6.5rem', textAlign: 'right' }}
                        />
                        <Column
                            field="credit"
                            header="Credit"
                            body={(row: StatementEntry) => (row.credit ? formatAmount(row.credit) : '')}
                            style={{ width: '6.5rem', textAlign: 'right' }}
                        />
                        <Column
                            header="Amount"
                            body={(row: StatementEntry) => {
                                const amount = row.debit > 0 ? row.debit : row.credit;
                                return amount ? formatAmount(amount) : '';
                            }}
                            style={{ width: '6.5rem', textAlign: 'right' }}
                        />
                        <Column field="description" header="Description" style={{ minWidth: '14rem' }} />
                        <Column field="status" header="Status" style={{ width: '6rem' }} />
                        <Column field="matchedTo" header="Matched To" style={{ minWidth: '12rem' }} />
                        <Column field="reason" header="Reason" style={{ minWidth: '12rem' }} />
                    </AppDataTable>
                </div>
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Ledger Reconciliation</h2>
                        <p className="mt-2 mb-0 text-600">Mark reconciliation date/remark for ledger postings.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/apps/accounts/audit">
                            <Button label="Posting Details" icon="pi pi-search" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading reconciliation: {error.message}</p>}
            </div>

            <AppDataTable
                value={displayRows}
                paginator
                rows={rowsPerPage}
                rowsPerPageOptions={[20, 50, 100]}
                totalRecords={totalRecords}
                className="summary-table"
                lazy={false}
                first={first}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                rowClassName={(row: BankReconciliationRow) =>
                    row.postingId > 0 && matchApplyOverrides[row.postingId]
                        ? 'ledger-recon-row--matched'
                        : ''
                }
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                }}
                dataKey="postingId"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [value, prev[1]]);
                                    setDateErrors({});
                                }}
                                placeholder="From date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                autoFocus
                                selectOnFocus
                                style={{ width: '130px' }}
                            />
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [prev[0], value]);
                                    setDateErrors({});
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={toDateInputRef}
                                onEnterNext={() => focusDropdown(ledgerGroupInputRef)}
                                style={{ width: '130px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2">
                            <LedgerGroupAutoComplete
                                value={ledgerGroupId}
                                options={ledgerGroupOptions}
                                loading={ledgerGroupLoading}
                                onChange={(nextValue) => {
                                    hasManualLedgerGroupRef.current = true;
                                    setLedgerGroupId(nextValue);
                                    setLedgerId(null);
                                    setSelectedBankLedger(null);
                                    setLedgerLookupRows([]);
                                    setLedgerSuggestions([]);
                                    setLedgerQuery('');
                                    setLedgerPanelOpen(false);
                                    const nextFilter = resolveLedgerGroupFilter(nextValue, ledgerGroupOptions);
                                    void fetchLedgers({ groupId: nextFilter.fetchGroupId, mode: 'all' });
                                }}
                                placeholder="Ledger group"
                                loadingPlaceholder="Loading groups..."
                                onSelectNext={() => focusDropdown(bankLedgerInputRef)}
                                inputId="ledger-recon-ledger-group"
                                ref={ledgerGroupInputRef}
                                style={{ minWidth: '220px' }}
                            />
                        </div>
                        <div className="flex align-items-center gap-2 ledger-ledger-meta">
                            <LedgerAutoComplete
                                value={selectedBankLedger ?? ledgerQuery}
                                suggestions={ledgerSuggestions}
                                ledgerGroupIds={ledgerGroupFilter.filterIds}
                                completeMethod={(event: AutoCompleteCompleteEvent) => {
                                    const query = event.query ?? '';
                                    setLedgerQuery(query);
                                    void fetchLedgers({
                                        search: query,
                                        groupId: ledgerGroupFilter.fetchGroupId,
                                        mode: query.trim().length === 0 ? 'all' : 'search'
                                    });
                                }}
                                onDropdownClick={() => {
                                    setLedgerSuggestions([...ledgerOptions]);
                                    void fetchLedgers({ groupId: ledgerGroupFilter.fetchGroupId, mode: 'all' });
                                }}
                                onChange={(event: AutoCompleteChangeEvent) => {
                                    const value = event.value as LedgerLookupOption | string | null;
                                    const shouldFocusNext = ledgerEnterRef.current;
                                    ledgerEnterRef.current = false;
                                    if (value == null) {
                                        setLedgerQuery('');
                                        setSelectedBankLedger(null);
                                        setLedgerId(null);
                                        return;
                                    }
                                    if (typeof value === 'string') {
                                        const trimmed = value.trim();
                                        const match =
                                            trimmed.length === 0
                                                ? null
                                                : ledgerSuggestions.find(
                                                      (option) =>
                                                          (option.label ?? '').toLowerCase() === trimmed.toLowerCase()
                                                  ) ??
                                                  ledgerOptions.find(
                                                      (option) =>
                                                          (option.label ?? '').toLowerCase() === trimmed.toLowerCase()
                                                  ) ??
                                                  null;
                                        if (match) {
                                            setLedgerQuery('');
                                            setSelectedBankLedger(match);
                                            setLedgerId(Number(match.ledgerId));
                                            if (shouldFocusNext) {
                                                focusDropdown(reconciledInputRef);
                                            }
                                            return;
                                        }
                                        setLedgerQuery(value);
                                        setSelectedBankLedger(null);
                                        setLedgerId(null);
                                        if (shouldFocusNext) {
                                            focusDropdown(reconciledInputRef);
                                        }
                                        return;
                                    }
                                    setLedgerQuery('');
                                    setSelectedBankLedger(value);
                                    setLedgerId(Number(value.ledgerId));
                                    if (shouldFocusNext) {
                                        focusDropdown(reconciledInputRef);
                                    }
                                }}
                                field="label"
                                loading={showLedgerSpinner}
                                showEmptyMessage
                                placeholder={showLedgerSpinner ? 'Loading ledgers...' : 'Select ledger'}
                                inputId="ledger-reconciliation-ledger"
                                ref={bankLedgerInputRef}
                                onShow={() => setLedgerPanelOpen(true)}
                                onHide={() => {
                                    setLedgerPanelOpen(false);
                                    if (ledgerEnterRef.current) {
                                        ledgerEnterRef.current = false;
                                        focusDropdown(reconciledInputRef);
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    ledgerEnterRef.current = true;
                                    if (!ledgerPanelOpen) {
                                        ledgerEnterRef.current = false;
                                        focusDropdown(reconciledInputRef);
                                    }
                                }}
                                virtualScrollerOptions={{ itemSize: 36 }}
                                inputRef={ledgerInputRef}
                                style={{ minWidth: '320px' }}
                            />
                            {selectedBankLedger && (
                                <LedgerMetaPanel
                                    address={selectedBankLedger.address}
                                    balanceLabel={bankBalanceLabel}
                                    balanceSeverity={bankBalanceSeverity}
                                    showBalance={showBankBalance}
                                />
                            )}
                        </div>
                        <AppDropdown
                            value={reconciled}
                            ref={reconciledInputRef}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Unreconciled', value: 0 },
                                { label: 'Reconciled', value: 1 }
                            ]}
                            onChange={(e) => setReconciled(e.value)}
                            placeholder="Reconciled"
                            onEnterNext={focusRefreshButton}
                            style={{ minWidth: '170px' }}
                        />
                        <div className="flex align-items-center gap-2">
                            <InputSwitch
                                checked={useReconcileDate}
                                onChange={(e) => setUseReconcileDate(Boolean(e.value))}
                                disabled={reconciled !== 1}
                            />
                            <span className="text-600 text-sm">Use reconcile date</span>
                        </div>
                    </>
                }
                headerRight={
                    <>
                        <div className="flex align-items-center gap-2">
                            <span className="text-600 text-sm">Match Rule</span>
                            <AppDropdown
                                ref={matchRuleInputRef}
                                value={matchRule}
                                options={MATCH_RULE_OPTIONS}
                                onChange={(e) => setMatchRule(e.value)}
                                placeholder="Match rule"
                                style={{ minWidth: '210px' }}
                            />
                        </div>
                        <Button
                            label={statementImporting ? 'Importing...' : 'Import Statement'}
                            icon="pi pi-upload"
                            className="p-button-text"
                            onClick={handleImportStatementClick}
                            disabled={statementImporting || !hasVoucherRows}
                        />
                        {statementFileName && statementEntries.length > 0 && (
                            <div className="flex align-items-center gap-2">
                                <span className="text-600 text-xs">Current import: {statementFileName}</span>
                                <Button
                                    label="Open"
                                    icon="pi pi-folder-open"
                                    className="p-button-text p-button-sm"
                                    onClick={() => setStatementDialogVisible(true)}
                                />
                            </div>
                        )}
                        {lastStatementImport?.fileName && (
                            <div className="flex align-items-center gap-2">
                                <span className="text-600 text-xs">Last import: {lastStatementImport.fileName}</span>
                                <Button
                                    label="View"
                                    icon="pi pi-eye"
                                    className="p-button-text p-button-sm"
                                    onClick={handleDownloadLastImport}
                                />
                            </div>
                        )}
                        <Button
                            label={saving ? 'Saving...' : `Save${pendingReconCount ? ` (${pendingReconCount})` : ''}`}
                            icon="pi pi-save"
                            className="p-button-text"
                            onClick={savePendingRecon}
                            disabled={saving || pendingReconCount === 0}
                        />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            id={refreshButtonId}
                            onClick={handleRefresh}
                            disabled={!canRefresh}
                        />
                        <Button label="Print" icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
                    </>
                }
                recordSummary={
                    data?.bankReconciliation
                        ? `${totalRecords} row${totalRecords === 1 ? '' : 's'} • Dr ${formatAmount(
                              debitTotal
                          )} • Cr ${formatAmount(creditTotal)}`
                        : ''
                }
            >
                <Column
                    header="Rec. Date"
                    body={(r: BankReconciliationRow) => {
                        const editable = r.postingId > 0 && !r.isOpening;
                        const overrideDate = matchApplyDateOverrides[r.postingId] ?? null;
                        const resolvedDate = overrideDate ?? resolveReconDateValue(r);
                        const dateKey = resolvedDate ? toDateText(resolvedDate) : 'empty';
                        return (
                            <AppDateInput
                                key={`${r.postingId}-${dateKey}`}
                                value={resolvedDate}
                                onChange={(value) =>
                                    updateReconEdit(r.postingId, { date: value, touchedDate: true })
                                }
                                placeholder="Recon date"
                                disabled={!editable}
                                style={{ width: '9rem' }}
                            />
                        );
                    }}
                    style={{ width: '10rem' }}
                />
                <Column
                    header="R. Remark"
                    body={(r: BankReconciliationRow) => {
                        const editable = r.postingId > 0 && !r.isOpening;
                        return (
                            <AppInput
                                value={resolveReconRemarkValue(r)}
                                onChange={(e) =>
                                    updateReconEdit(r.postingId, {
                                        remark: e.target.value,
                                        touchedRemark: true
                                    })
                                }
                                placeholder="Remark"
                                disabled={!editable}
                                style={{ width: '100%' }}
                            />
                        );
                    }}
                    style={{ width: '16rem' }}
                />
                <Column
                    field="voucherDate"
                    header="Voucher Date"
                    body={(r: BankReconciliationRow) => formatDate(r.voucherDate)}
                    sortable
                    style={{ width: '8rem' }}
                    filterElement={voucherDateFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherNumber"
                    header="Voucher No."
                    sortable
                    filterElement={voucherNumberFilterElement}
                    style={{ width: '7rem' }}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="chequeNo"
                    header="Chq. No."
                    body={(r: BankReconciliationRow) => r.chequeNo ?? ''}
                    filterElement={chequeNoFilterElement}
                    style={{ width: '8rem' }}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherType"
                    header="Voucher Type"
                    sortable
                    filterElement={voucherTypeFilterElement}
                    style={{ width: '9rem' }}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="counterLedgerName"
                    header="Ag. Ledger"
                    body={(r: BankReconciliationRow) => r.counterLedgerName ?? ''}
                    filterElement={ledgerFilterElement}
                    footer="Total"
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="debit"
                    header="Dr Amt"
                    body={(r: BankReconciliationRow) => (r.debit ? formatAmount(r.debit) : '')}
                    dataType="numeric"
                    style={{ width: '8.5rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={debitTotal ? formatAmount(debitTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={debitFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="credit"
                    header="Cr Amt"
                    body={(r: BankReconciliationRow) => (r.credit ? formatAmount(r.credit) : '')}
                    dataType="numeric"
                    style={{ width: '8.5rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={creditTotal ? formatAmount(creditTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={creditFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="balance"
                    header="Balance"
                    body={(r: BankReconciliationRow) => (r.balance ? formatAmount(r.balance) : '')}
                    dataType="numeric"
                    style={{ width: '10rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={balanceFooterLabel}
                    footerStyle={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={balanceFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="drCr"
                    header=""
                    style={{ width: '4rem' }}
                    footer={balanceFooterDrCr}
                    footerStyle={{ textAlign: 'left', whiteSpace: 'nowrap' }}
                />
                <Column
                    field="discountAmount"
                    header="Discount"
                    body={(r: BankReconciliationRow) => {
                        const value = resolveAmountValue(r.discountAmount, 0);
                        return value ? formatAmount(value) : '';
                    }}
                    dataType="numeric"
                    style={{ width: '8rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={discountTotal ? formatAmount(discountTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={discountFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="chequeCancelCharges"
                    header="Chq. Charges"
                    body={(r: BankReconciliationRow) => {
                        const value = resolveAmountValue(r.chequeCancelCharges, 0);
                        return value ? formatAmount(value) : '';
                    }}
                    dataType="numeric"
                    style={{ width: '9rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={chequeChargesTotal ? formatAmount(chequeChargesTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={chequeChargesFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
            </AppDataTable>
        </div>
    );
}
