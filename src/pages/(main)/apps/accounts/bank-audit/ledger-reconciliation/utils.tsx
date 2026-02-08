import { FilterMatchMode, FilterOperator } from 'primereact/api';
import type { ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import AppMultiSelect from '@/components/AppMultiSelect';
import type {
    BankReconciliationRow,
    FilterOption,
    StatementEntry,
    StatementMatchRule,
    StatementPreviewStatus,
    StatementWorkbookInfo
} from './types';

export const ALL_LEDGER_LIMIT = 10000;
export const SEARCH_LEDGER_LIMIT = 200;
export const RECONCILIATION_LIMIT = 10000;

export const STATEMENT_HEADER_SCAN_LIMIT = 200;
export const AMOUNT_MATCH_TOLERANCE = 0.01;
export const MAX_CANDIDATES_FOR_SUM_MATCH = 28;

export const MATCH_RULE_OPTIONS = [
    { label: 'Chq + Amt + Dt(>=)', value: 0 },
    { label: 'Amt + Dt(>=) + Party', value: 1 },
    { label: 'Amt + Dt(>=)', value: 2 },
    { label: 'Sum Amt + Dt(=)', value: 3 }
];

export const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

export const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
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

export const buildMultiSelectFilterElement =
    <T extends string | number,>(items: FilterOption<T>[], placeholder = 'Any') =>
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

export const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

export const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

export const formatDate = (value: string | null) => {
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

export const parseDateText = (value: string | null) => {
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

export const resolveFiscalRange = (startText: string | null, endText: string | null) => {
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

export const buildTextFilterOptions = (values: Array<string | null | undefined>): FilterOption<string>[] => {
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

export const buildDateFilterOptions = (values: Array<string | null | undefined>): FilterOption<string>[] => {
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

export const buildNumberFilterOptions = (values: Array<number | null | undefined>): FilterOption<number>[] => {
    const unique = new Set<number>();
    values.forEach((value) => {
        if (value == null || !Number.isFinite(value)) return;
        unique.add(value);
    });
    return Array.from(unique.values())
        .sort((a, b) => a - b)
        .map((value) => ({ label: formatAmount(value), value }));
};

export const getRuleShortText = (rule: StatementMatchRule) => {
    if (rule === 1) return 'Amt+Dt(>=)+Party';
    if (rule === 2) return 'Amt+Dt(>=)';
    if (rule === 3) return 'SumAmt+Dt(=)';
    return 'Chq+Amt+Dt(>=)';
};

export const getAutoRemark = (rule: StatementMatchRule) => {
    if (rule === 0) return 'Amt/Chq/Dt>=';
    if (rule === 1) return 'Amt/Party/Dt>=';
    if (rule === 3) return 'SumAmt/Dt=';
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

export const parseNumericLike = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').trim();
        if (!cleaned) return NaN;
        const num = Number(cleaned);
        return Number.isFinite(num) ? num : NaN;
    }
    return NaN;
};

export const resolveAmountValue = (primary: unknown, ...fallbacks: unknown[]) => {
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

export const updateStatementWorkbook = async (info: StatementWorkbookInfo, entries: StatementEntry[]) => {
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

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};

export const base64ToBlob = (base64: string, contentType: string) => {
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

    if (rule === 0 && !hasStatementChqNo) {
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

        if (rule === 0) {
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
        if (statementDateLong < voucherDateLong && rule !== 3) continue;
        if (rule === 3 && statementDateLong !== voucherDateLong) continue;
        countDate += 1;

        if (rule === 1) {
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

    if (rule === 0) {
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
    } else if (rule === 1) {
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
    } else if (rule === 3) {
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

export const matchStatementEntryToRows = (
    rows: BankReconciliationRow[],
    entry: StatementEntry,
    usedRowIndices: Set<number>,
    rule: StatementMatchRule
) => {
    if (rule === 3) {
        const result = findBestMatchRowIndicesBySumExactDate(rows, entry, usedRowIndices);
        if (result.indices.length > 0) {
            return {
                matched: true,
                rowIndex: result.indices[0],
                rowIndices: result.indices,
                matchedTo: result.matchedTo,
                reason: ''
            };
        }
        return {
            matched: false,
            rowIndex: -1,
            rowIndices: [] as number[],
            matchedTo: '',
            reason: result.reason,
            ambiguous: result.isAmbiguous
        };
    }

    const result = findBestMatchRowIndex(rows, entry, usedRowIndices, rule);
    if (result.index >= 0) {
        return {
            matched: true,
            rowIndex: result.index,
            rowIndices: [result.index],
            matchedTo: result.matchedTo,
            reason: ''
        };
    }

    return {
        matched: false,
        rowIndex: -1,
        rowIndices: [] as number[],
        matchedTo: '',
        reason: result.reason,
        ambiguous: result.isAmbiguous
    };
};

export const readStatementEntriesFromExcel = async (file: File) => {
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

export const toStatementDownloadFileName = (fileName: string) => toUpdatedStatementFileName(fileName);
