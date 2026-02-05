'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { InputSwitch } from 'primereact/inputswitch';
import { Menu } from 'primereact/menu';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import type { AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import type { AutoComplete } from 'primereact/autocomplete';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { z } from 'zod';
import AppDataTable from '@/components/AppDataTable';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import { useLedgerOptionsByPurpose, type LedgerOption } from '@/lib/accounts/ledgerOptions';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { isBankAccountsLabel } from '@/lib/accounts/ledgerGroupFilter';
import { VoucherTypeIds } from '@/lib/accounts/voucherTypeIds';
import { useAuth } from '@/lib/auth/context';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate, type FiscalRange } from '@/lib/reportDateValidation';

interface VoucherRow {
    voucherId: number;
    voucherTypeId: number | null;
    voucherTypeCode?: number | null;
    voucherTypeName?: string | null;
    voucherNumber: string | null;
    voucherDate: string | null;
    postingDate: string | null;
    refNo: string | null;
    refDate: string | null;
    debitLedgerName: string | null;
    debitLedgerGroupName: string | null;
    debitLedgerNames?: string | null;
    debitLedgerAmounts?: string | null;
    creditLedgerName?: string | null;
    creditLedgerNames?: string | null;
    creditLedgerAmounts?: string | null;
    totalNetAmount: number;
    narration: string | null;
    isCancelledFlag: number | null;
    managerId: number | null;
    managerName: string | null;
    managerDetails?: string | null;
    managerDetailsAmount?: string | null;
    monthName?: string | null;
    yearMonth?: string | null;
}

type SelectOption = {
    label: string;
    value: number;
};

type PaymentMode = 'cash' | 'bank';
type PaymentViaOption = {
    label: string;
    value: number;
    code?: string | null;
    isActive?: boolean | null;
};
type DrCrValue = 'Dr' | 'Cr';
type DrCrOption = {
    label: string;
    value: DrCrValue;
};

const CASH_LEDGER_GROUP_TYPES = [6];
const BANK_LEDGER_GROUP_TYPES = [1, 2, 3, 29];
const CASH_IN_HAND_GROUP_TYPE = 6;
const BANK_ACCOUNT_GROUP_TYPE = 1;
const DR_CR_OPTIONS: DrCrOption[] = [
    { label: 'Dr', value: 'Dr' },
    { label: 'Cr', value: 'Cr' }
];
const CR_ONLY_VALUE: DrCrValue = 'Cr';
const parseInputNumber = (value: string): number | null | undefined => {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
};
const normalizeGroupLabel = (value?: string | null) =>
    (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const isCashInHandLabel = (value?: string | null) => normalizeGroupLabel(value).includes('cashinhand');

interface ManagerRow {
    managerId: number;
    name: string | null;
}

interface ChequeIssueBookRow {
    chequeIssueBookId: number;
    voucherNumber: string | null;
    chequeStartNumber: number | null;
    chequeEndNumber: number | null;
    remarks?: string | null;
    isCancelledFlag?: number | null;
}

type DebitLineDraft = {
    key: string;
    ledgerGroupId: number | null;
    ledgerId: number | null;
    ledgerOption?: LedgerOption | null;
    amount: number | null;
    label?: string | null;
};

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

const resolveAddress = (...candidates: Array<string | null | undefined>) => {
    for (const candidate of candidates) {
        if (candidate == null) continue;
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
    }
    return null;
};

const VOUCHER_TYPES = gql`
    query VoucherTypes {
        voucherTypes {
            voucherTypeId
            voucherTypeCode
            displayName
            voucherTypeName
        }
    }
`;

const MANAGERS = gql`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
        }
    }
`;

const PAYMENT_VIA_MASTERS = gql`
    query PaymentViaMasters($search: String, $limit: Int, $includeInactive: Boolean) {
        paymentViaMasters(search: $search, limit: $limit, includeInactive: $includeInactive) {
            paymentViaId
            code
            name
            orderNo
            isActive
        }
    }
`;

const CHEQUE_ISSUE_BOOKS = gql`
    query ChequeIssueBooks($bankLedgerId: Int, $limit: Int) {
        chequeIssueBooks(bankLedgerId: $bankLedgerId, limit: $limit) {
            chequeIssueBookId
            voucherNumber
            voucherDate
            chequeStartNumber
            chequeEndNumber
            remarks
            isCancelledFlag
        }
    }
`;

const NEXT_VOUCHER_NUMBER = gql`
    query NextVoucherNumber(
        $voucherTypeId: Int!
        $companyFiscalYearId: Int
        $fiscalYearStart: String
        $fiscalYearEnd: String
    ) {
        nextVoucherNumber(
            voucherTypeId: $voucherTypeId
            companyFiscalYearId: $companyFiscalYearId
            fiscalYearStart: $fiscalYearStart
            fiscalYearEnd: $fiscalYearEnd
        )
    }
`;

const LEDGER_CURRENT_BALANCE = gql`
    query LedgerCurrentBalance($ledgerId: Int!, $toDate: String, $cancelled: Int) {
        ledgerCurrentBalance(ledgerId: $ledgerId, toDate: $toDate, cancelled: $cancelled) {
            amount
            drCr
        }
    }
`;

const VOUCHER_REGISTER_BY_LEDGER = gql`
    query VoucherRegisterByLedgerDetailed(
        $ledgerId: Int
        $ledgerGroupTypeCodes: [Int!]
        $ledgerDrCrFlag: Int
        $againstLedgerId: Int
        $againstDrCrFlag: Int
        $voucherTypeIds: [Int!]
        $managerId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
        $excludeOpening: Boolean
    ) {
        voucherRegisterByLedgerDetailed(
            ledgerId: $ledgerId
            ledgerGroupTypeCodes: $ledgerGroupTypeCodes
            ledgerDrCrFlag: $ledgerDrCrFlag
            againstLedgerId: $againstLedgerId
            againstDrCrFlag: $againstDrCrFlag
            voucherTypeIds: $voucherTypeIds
            managerId: $managerId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            limit: $limit
            offset: $offset
            excludeOpening: $excludeOpening
        ) {
            items {
                voucherId
                voucherTypeId
                voucherTypeCode
                voucherTypeName
                voucherNumber
                voucherDate
                postingDate
                refNo
                refDate
                creditLedgerName
                creditLedgerNames
                creditLedgerAmounts
                debitLedgerName: againstLedgerName
                debitLedgerGroupName: againstLedgerGroupName
                debitLedgerNames: againstLedgerNames
                debitLedgerAmounts: againstLedgerAmounts
                totalNetAmount
                narration
                isCancelledFlag
                managerId
                managerName
                managerDetails
                managerDetailsAmount
                monthName
                yearMonth
            }
            totalCount
            totalNetAmount
        }
    }
`;

const VOUCHER_ENTRY_BY_ID = gql`
    query VoucherEntryById($voucherId: Int!) {
        voucherEntryById(voucherId: $voucherId) {
            header {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDate
                postingDate
                refNo
                refDate
                narration
                totalNetAmount
                isCancelledFlag
                managerId
                chequeInFavourText
                chequeIssueBookId
                paymentViaId
            }
            lines {
                ledgerId
                drCrFlag
                amount
                narrationText
            }
        }
    }
`;

const CREATE_VOUCHER = gql`
    mutation CreateVoucher(
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $purchaseVoucherNumber: String
        $purchaseVoucherDateText: String
        $managerId: Int
        $chequeInFavourText: String
        $chequeIssueBookId: Int
        $paymentViaId: Int
        $primaryLedgerId: Int
        $isCancelledFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        createVoucher(
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            purchaseVoucherNumber: $purchaseVoucherNumber
            purchaseVoucherDateText: $purchaseVoucherDateText
            managerId: $managerId
            chequeInFavourText: $chequeInFavourText
            chequeIssueBookId: $chequeIssueBookId
            paymentViaId: $paymentViaId
            primaryLedgerId: $primaryLedgerId
            isCancelledFlag: $isCancelledFlag
            lines: $lines
        ) {
            voucherId
        }
    }
`;

const UPDATE_VOUCHER = gql`
    mutation UpdateVoucherEntry(
        $voucherId: Int!
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $purchaseVoucherNumber: String
        $purchaseVoucherDateText: String
        $managerId: Int
        $chequeInFavourText: String
        $chequeIssueBookId: Int
        $paymentViaId: Int
        $primaryLedgerId: Int
        $isCancelledFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        updateVoucherEntry(
            voucherId: $voucherId
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            purchaseVoucherNumber: $purchaseVoucherNumber
            purchaseVoucherDateText: $purchaseVoucherDateText
            managerId: $managerId
            chequeInFavourText: $chequeInFavourText
            chequeIssueBookId: $chequeIssueBookId
            paymentViaId: $paymentViaId
            primaryLedgerId: $primaryLedgerId
            isCancelledFlag: $isCancelledFlag
            lines: $lines
        )
    }
`;

const DELETE_VOUCHER = gql`
    mutation DeleteVoucherEntry($voucherId: Int!) {
        deleteVoucherEntry(voucherId: $voucherId)
    }
`;

const toDateText = (date: Date | null) => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDate = (value: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const parseDateText = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const dmy = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (dmy) {
        const [_, dd, mm, yyyy] = dmy;
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    }
    const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
        const [_, yyyy, mm, dd] = ymd;
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    }
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) {
        const [_, yyyy, mm, dd] = yyyymmdd;
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return null;
};

const toDateKey = (value: string | null) => {
    const parsed = parseDateText(value);
    return parsed ? toDateText(parsed) : null;
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

const buildMultiSelectFilterElement =
    <T extends string | number>(
        items: FilterOption<T>[],
        placeholder = 'Any',
        onShow?: () => void,
        loading?: boolean
    ) =>
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
            onShow={onShow}
            loading={loading}
            style={{ minWidth: '16rem' }}
        />
    );

const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    voucherTypeNoDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherPostingDateDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    refDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    ledgerCrDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    ledgerDrDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    netAmtDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    narration: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    managerName: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    debitLedgerGroupName: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

const isEmptyFilterValue = (value: unknown): boolean => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).every(isEmptyFilterValue);
    }
    return false;
};

const resolveFilterValue = (meta: ColumnFilterMeta | undefined): unknown => {
    if (!meta) return null;
    if (Array.isArray(meta.constraints)) {
        const constraint = meta.constraints[0];
        return constraint?.value ?? null;
    }
    return meta.value ?? null;
};

const normalizeTextValue = (value: unknown) => String(value ?? '').trim().toLowerCase();

const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const makeKey = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;
const createDebitLine = (overrides: Partial<DebitLineDraft> = {}): DebitLineDraft => ({
    key: makeKey(),
    ledgerGroupId: null,
    ledgerId: null,
    ledgerOption: null,
    amount: null,
    label: null,
    ...overrides
});

const resolveReportRange = (fiscalStart: Date | null, fiscalEnd: Date | null) => {
    const range = resolveFiscalRange(fiscalStart, fiscalEnd);
    const today = startOfDay(new Date());
    let maxDate = today;
    if (range.end && range.end < maxDate) {
        maxDate = range.end;
    }
    if (range.start && maxDate < range.start) {
        maxDate = range.start;
    }
    return { start: range.start, end: maxDate };
};

const buildVoucherFormSchema = (range?: FiscalRange | null, refDateLabel?: string) =>
    z
        .object({
            voucherNo: z.string().trim().min(1, 'Voucher number is required.'),
            voucherDate: z.any(),
            postingDate: z.any(),
            refDate: z.any(),
            voucherTypeId: z.number().positive('Payment voucher type not found.'),
            cashLedgerId: z.number().positive('Select cash/bank ledger.'),
            cashLedgerAmount: z
                .number({ invalid_type_error: 'Enter cash/bank amount.' })
                .positive('Enter cash/bank amount.'),
            debitLines: z
                .array(
                    z.object({
                        ledgerId: z.number().positive('Select ledger.'),
                        amount: z.number().positive('Enter amount.')
                    })
                )
                .min(1, 'Add at least one debit line.'),
            isCashMode: z.boolean(),
            managerId: z.number().nullable(),
            lineTotal: z.number()
        })
        .superRefine((data, ctx) => {
            const voucherDateValidation = validateSingleDate({ date: data.voucherDate ?? null }, range);
            if (!voucherDateValidation.ok) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['voucherDate'],
                    message: voucherDateValidation.errors.date ?? 'Voucher date is required.'
                });
            }

            const postingDateValidation = validateSingleDate({ date: data.postingDate ?? null }, range);
            if (!postingDateValidation.ok) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['postingDate'],
                    message: postingDateValidation.errors.date ?? 'Posting date is required.'
                });
            }

            if (data.refDate) {
                const refValidation = validateSingleDate({ date: data.refDate ?? null }, range);
                if (!refValidation.ok) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['refDate'],
                        message: refValidation.errors.date ?? `${refDateLabel ?? 'Ref date'} is required.`
                    });
                }
            }

            if (data.lineTotal <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['debitLines'],
                    message: 'Total amount must be greater than zero.'
                });
            }

            if (Math.abs(Number(data.cashLedgerAmount || 0) - Number(data.lineTotal || 0)) > 0.01) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['cashLedgerAmount'],
                    message: 'Cash/Bank amount should match total debit lines.'
                });
            }

            if (data.isCashMode && !data.managerId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['managerId'],
                    message: 'Select paid by.'
                });
            }
        });

export default function AccountsCashExpenditureEntryPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const apolloClient = useApolloClient();
    const toastRef = useRef<Toast>(null);
    const { companyContext, agencyOptions } = useAuth();
    const autoCompleteAppendTarget = typeof window !== 'undefined' ? document.body : undefined;

    const [cashLedgerId, setCashLedgerId] = useState<number | null>(null);
    const [paymentLedgerGroupId, setPaymentLedgerGroupId] = useState<number | null>(null);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
    const [paymentViaId, setPaymentViaId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<0 | 1>(0);
    const initialRangeRef = useRef(resolveReportRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const [printFormat, setPrintFormat] = useState<'format-1' | 'format-2'>('format-1');
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const cashLedgerInputRef = useRef<AutoComplete>(null);
    const cashLedgerAmountInputRef = useRef<HTMLInputElement>(null);
    const paidByInputRef = useRef<AutoComplete>(null);
    const voucherDateInputRef = useRef<HTMLInputElement>(null);
    const lineLedgerRefs = useRef<Record<string, AutoComplete | null>>({});
    const lineAmountRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const refreshButtonId = 'cash-expenditure-refresh';
    const saveButtonId = 'payment-voucher-save';
    const printMenuRef = useRef<Menu>(null);
    const missingConfigRef = useRef(false);

    const [isFormActive, setIsFormActive] = useState(false);
    const [focusNonce, setFocusNonce] = useState(0);
    const [selectedRow, setSelectedRow] = useState<VoucherRow | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [voucherNo, setVoucherNo] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [postingDate, setPostingDate] = useState<Date | null>(new Date());
    const [refNo, setRefNo] = useState('');
    const [refDate, setRefDate] = useState<Date | null>(null);
    const [cashLedgerAmount, setCashLedgerAmount] = useState<number | null>(null);
    const [cashLedgerOption, setCashLedgerOption] = useState<LedgerOption | null>(null);
    const [chequeInFavour, setChequeInFavour] = useState('');
    const [chequeIssueBookId, setChequeIssueBookId] = useState<number | null>(null);
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [postingDateError, setPostingDateError] = useState<string | null>(null);
    const [refDateError, setRefDateError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [narration, setNarration] = useState('');
    const [lines, setLines] = useState<DebitLineDraft[]>([createDebitLine()]);
    const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
    const [formManagerId, setFormManagerId] = useState<number | null>(null);
    const [formManagerQuery, setFormManagerQuery] = useState('');
    const [formManagerSuggestions, setFormManagerSuggestions] = useState<SelectOption[]>([]);
    const [cancelledChecked, setCancelledChecked] = useState(false);
    const [saving, setSaving] = useState(false);
    const paymentModeInitRef = useRef(false);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [filterSourceRows, setFilterSourceRows] = useState<VoucherRow[] | null>(null);
    const [filterSourceLoading, setFilterSourceLoading] = useState(false);

    useEffect(() => {
        setPageTitle('Payment Voucher');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const clearFormError = useCallback((key: string) => {
        setFormErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const renderFormError = (key: string) =>
        formErrors[key] ? <small className="text-red-500">{formErrors[key]}</small> : null;

    const formLevelError = formErrors.form ?? formErrors.voucherTypeId ?? null;

    const { data: voucherTypesData } = useQuery(VOUCHER_TYPES);
    const { data: managersData, loading: managersLoading } = useQuery(MANAGERS, { variables: { search: null, limit: 2000 } });
    const { data: paymentViaData, loading: paymentViaLoading } = useQuery(PAYMENT_VIA_MASTERS, {
        variables: { search: null, limit: 2000, includeInactive: true }
    });
    const { data: chequeBooksData } = useQuery(CHEQUE_ISSUE_BOOKS, {
        variables: { bankLedgerId: cashLedgerId ?? null, limit: 2000 },
        skip: paymentMode !== 'bank' || !cashLedgerId
    });
    const { options: ledgerGroupOptions, loading: ledgerGroupOptionsLoading } = useLedgerGroupOptions();

    const paymentModeOptions = useMemo(
        () => [
            { label: 'CASH', value: 'cash' as PaymentMode },
            { label: 'BANK', value: 'bank' as PaymentMode }
        ],
        []
    );

    useEffect(() => {
        if (activeLineKey || lines.length === 0) return;
        setActiveLineKey(lines[0].key);
    }, [activeLineKey, lines]);
    const paymentViaOptions = useMemo<PaymentViaOption[]>(() => {
        const rows = (paymentViaData?.paymentViaMasters ?? []) as Array<{
            paymentViaId: number;
            code?: string | null;
            name?: string | null;
            isActive?: boolean | null;
        }>;
        return rows
            .filter((row) => row && row.paymentViaId != null)
            .filter((row) => row.isActive !== false)
            .map((row) => ({
                label: row.name ?? row.code ?? `Payment ${row.paymentViaId}`,
                value: Number(row.paymentViaId),
                code: row.code ?? null,
                isActive: row.isActive ?? null
            }));
    }, [paymentViaData]);
    const chequePaymentViaId = useMemo(
        () => paymentViaOptions.find((option) => (option.code ?? '').toUpperCase() === 'CHEQUE')?.value ?? null,
        [paymentViaOptions]
    );
    const selectedPaymentVia = useMemo(
        () => paymentViaOptions.find((option) => option.value === paymentViaId) ?? null,
        [paymentViaId, paymentViaOptions]
    );
    const isCashMode = paymentMode === 'cash';
    const isBankMode = paymentMode === 'bank';
    const isChequePayment = isBankMode && (selectedPaymentVia?.code ?? '').toUpperCase() === 'CHEQUE';
    const paymentLedgerLabel = isCashMode ? 'Cash Ledger (Cr)' : 'Bank Ledger (Cr)';
    const paymentLedgerPurpose = isCashMode ? 'CONTRA-CASH' : 'CONTRA-BANK';
    const paymentLedgerPlaceholder = isCashMode ? 'Cash ledger' : 'Bank ledger';
    const paymentLedgerLoadingPlaceholder = isCashMode ? 'Loading cash ledgers...' : 'Loading bank ledgers...';
    const paymentLedgerPlaceholderResolved = paymentLedgerGroupId ? paymentLedgerPlaceholder : 'Select ledger group first';
    const resolveGroupOption = useCallback(
        (groupTypeCode: number, labelMatcher?: (value?: string | null) => boolean) => {
            if (!ledgerGroupOptions.length) return null;
            const byExactId = ledgerGroupOptions.find((option) => Number(option.value) === Number(groupTypeCode));
            if (byExactId) return byExactId;
            const byType = ledgerGroupOptions.find((option) => Number(option.groupTypeCode) === Number(groupTypeCode));
            if (byType) return byType;
            if (labelMatcher) {
                return ledgerGroupOptions.find((option) => labelMatcher(option.label ?? option.name)) ?? null;
            }
            return null;
        },
        [ledgerGroupOptions]
    );
    const cashLedgerGroupOption = useMemo(
        () => resolveGroupOption(CASH_IN_HAND_GROUP_TYPE, isCashInHandLabel),
        [resolveGroupOption]
    );
    const bankLedgerGroupOption = useMemo(
        () => resolveGroupOption(BANK_ACCOUNT_GROUP_TYPE, isBankAccountsLabel),
        [resolveGroupOption]
    );
    const resolvedPaymentLedgerGroupId = useMemo(() => {
        if (isCashMode) return cashLedgerGroupOption?.value ?? null;
        if (isBankMode) return bankLedgerGroupOption?.value ?? null;
        return null;
    }, [bankLedgerGroupOption, cashLedgerGroupOption, isBankMode, isCashMode]);
    const paymentLedgerGroupDisabled =
        !isFormActive || ledgerGroupOptionsLoading || Boolean(resolvedPaymentLedgerGroupId);
    const refNoLabel = isChequePayment ? 'Cheque No.' : 'Reference No.';
    const refDateLabel = isChequePayment ? 'Cheque Date' : 'Reference Date';
    const defaultLedgerGroupTypeCodes = useMemo(
        () => (isBankMode ? BANK_LEDGER_GROUP_TYPES : CASH_LEDGER_GROUP_TYPES),
        [isBankMode]
    );

    const { options: paymentLedgerOptions, loading: paymentLedgerOptionsLoading } = useLedgerOptionsByPurpose({
        purpose: paymentLedgerPurpose,
        ledgerGroupId: paymentLedgerGroupId ?? null,
        limit: 2000,
        skip: !paymentLedgerPurpose
    });
    const selectedPaymentLedger = useMemo(
        () => paymentLedgerOptions.find((option) => Number(option.value) === Number(cashLedgerId)) ?? null,
        [cashLedgerId, paymentLedgerOptions]
    );
    useEffect(() => {
        if (cashLedgerId == null) {
            setCashLedgerOption(null);
            return;
        }
        if (cashLedgerOption && Number(cashLedgerOption.value) === Number(cashLedgerId)) {
            return;
        }
        if (selectedPaymentLedger) {
            setCashLedgerOption(selectedPaymentLedger);
        }
    }, [cashLedgerId, cashLedgerOption, selectedPaymentLedger]);
    const cashLedgerAddress = useMemo(
        () => resolveAddress(cashLedgerOption?.address, selectedPaymentLedger?.address),
        [cashLedgerOption, selectedPaymentLedger]
    );
    const cashLedgerAddressLabel = cashLedgerId != null ? cashLedgerAddress ?? 'Address not available' : null;
    const cashLedgerLabel = useMemo(
        () => cashLedgerOption?.label ?? selectedPaymentLedger?.label ?? '',
        [cashLedgerOption, selectedPaymentLedger]
    );
    const { options: paymentAgainstOptions } = useLedgerOptionsByPurpose({
        purpose: 'PAYMENT-AGAINST',
        limit: 2000
    });
    const paymentAgainstAddressMap = useMemo(() => {
        const map = new Map<number, string>();
        paymentAgainstOptions.forEach((option) => {
            if (!option.address) return;
            map.set(Number(option.value), option.address);
        });
        return map;
    }, [paymentAgainstOptions]);

    const voucherTypeId = useMemo(() => {
        const rows = voucherTypesData?.voucherTypes ?? [];
        const match = rows.find((v: any) => Number(v.voucherTypeId) === VoucherTypeIds.Payment);
        return match ? Number(match.voucherTypeId) : null;
    }, [voucherTypesData]);

    const companyFiscalYearId = companyContext?.companyFiscalYearId ?? null;
    const fiscalYearStart = companyContext?.fiscalYearStart ?? null;
    const fiscalYearEnd = companyContext?.fiscalYearEnd ?? null;
    const canFetchNextNo = Boolean(voucherTypeId);
    const nextVoucherVariables = useMemo(
        () => ({
            voucherTypeId: voucherTypeId ?? 0,
            companyFiscalYearId: companyFiscalYearId ?? null,
            fiscalYearStart,
            fiscalYearEnd
        }),
        [companyFiscalYearId, fiscalYearEnd, fiscalYearStart, voucherTypeId]
    );

    const { data: nextNoData, refetch: refetchNextNo, error: nextNoError } = useQuery(NEXT_VOUCHER_NUMBER, {
        skip: !canFetchNextNo,
        variables: nextVoucherVariables
    });

    useEffect(() => {
        if (!isFormActive || editingId) {
            missingConfigRef.current = false;
            return;
        }
        if (!nextNoError) {
            missingConfigRef.current = false;
            return;
        }
        if (missingConfigRef.current) return;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Configuration',
            detail: 'Unable to generate voucher number. Please contact administrator.'
        });
        missingConfigRef.current = true;
    }, [editingId, isFormActive, nextNoError]);

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const voucherFormSchema = useMemo(() => buildVoucherFormSchema(fiscalRange, refDateLabel), [fiscalRange, refDateLabel]);
    const maxReportDate = useMemo(
        () => resolveReportRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null).end ?? null,
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const hasTouchedDatesRef = useRef(false);
    const canRefresh = Boolean(fromDate && toDate);
    const clampToMaxReportDate = (value: Date | null) => {
        if (!value || !maxReportDate) return value;
        return value > maxReportDate ? maxReportDate : value;
    };

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveReportRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const registerVariables = useMemo(
        () => ({
            ledgerId: null,
            ledgerGroupTypeCodes: defaultLedgerGroupTypeCodes,
            ledgerDrCrFlag: 2,
            againstLedgerId: null,
            againstDrCrFlag: null,
            voucherTypeIds: [VoucherTypeIds.Payment, VoucherTypeIds.MPayment],
            managerId: null,
            fromDate,
            toDate,
            cancelled,
            limit: rowsPerPage,
            offset: first,
            excludeOpening: true
        }),
        [cancelled, defaultLedgerGroupTypeCodes, first, fromDate, rowsPerPage, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(VOUCHER_REGISTER_BY_LEDGER, {
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables
    });

    const appliedBaseVariables = useMemo(() => {
        if (!appliedVariables) return null;
        const { limit: _limit, offset: _offset, ...rest } = appliedVariables;
        return rest;
    }, [appliedVariables]);
    const appliedBaseKey = useMemo(
        () => (appliedBaseVariables ? JSON.stringify(appliedBaseVariables) : ''),
        [appliedBaseVariables]
    );

    useEffect(() => {
        if (!hasApplied) {
            setFilterSourceRows(null);
            setFilterSourceLoading(false);
            return;
        }
        setFilterSourceRows(null);
        setFilterSourceLoading(false);
    }, [appliedBaseKey, hasApplied]);

    const { data: editData, refetch: refetchEdit } = useQuery(VOUCHER_ENTRY_BY_ID, {
        skip: !editingId,
        variables: { voucherId: editingId ?? 0 }
    });
    const cashLedgerBalanceDate = postingDate ?? voucherDate ?? dateRange[1] ?? null;
    const cashLedgerBalanceToDateText = useMemo(() => toDateText(cashLedgerBalanceDate), [cashLedgerBalanceDate]);
    const { data: cashLedgerBalanceData, loading: cashLedgerBalanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: cashLedgerId == null || !cashLedgerBalanceToDateText,
        variables: {
            ledgerId: cashLedgerId ?? 0,
            toDate: cashLedgerBalanceToDateText,
            cancelled
        }
    });
    const activeLineLedgerId = useMemo(() => {
        const activeLine = lines.find((line) => line.key === activeLineKey) ?? null;
        return activeLine?.ledgerId ?? null;
    }, [activeLineKey, lines]);
    const debitLineBalanceDate = postingDate ?? voucherDate ?? dateRange[1] ?? null;
    const debitLineBalanceToDateText = useMemo(() => toDateText(debitLineBalanceDate), [debitLineBalanceDate]);
    const { data: activeLineBalanceData, loading: activeLineBalanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: activeLineLedgerId == null || !debitLineBalanceToDateText,
        variables: {
            ledgerId: activeLineLedgerId ?? 0,
            toDate: debitLineBalanceToDateText,
            cancelled
        }
    });

    const [createVoucher] = useMutation(CREATE_VOUCHER);
    const [updateVoucher] = useMutation(UPDATE_VOUCHER);
    const [deleteVoucherEntry] = useMutation(DELETE_VOUCHER);

    const filterOptions = <T extends { label: string }>(options: T[], query: string) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return options;
        return options.filter((option) => option.label.toLowerCase().includes(needle));
    };

    const managerOptions = useMemo((): SelectOption[] => {
        const rows = (managersData?.managers ?? []) as ManagerRow[];
        return rows.map((m) => ({ label: m.name ?? `Manager ${m.managerId}`, value: Number(m.managerId) }));
    }, [managersData]);

    const chequeBookOptions = useMemo(() => {
        const rows = (chequeBooksData?.chequeIssueBooks ?? []) as ChequeIssueBookRow[];
        return rows
            .filter((row) => !row.isCancelledFlag)
            .map((row) => {
                const labelParts = [
                    row.voucherNumber ? row.voucherNumber : `Book ${row.chequeIssueBookId}`,
                    row.chequeStartNumber != null && row.chequeEndNumber != null
                        ? `(${row.chequeStartNumber} to ${row.chequeEndNumber})`
                        : null
                ].filter(Boolean);
                return { label: labelParts.join(' '), value: Number(row.chequeIssueBookId) };
            });
    }, [chequeBooksData]);

    const selectedManager = useMemo(
        () => (formManagerId != null ? managerOptions.find((m) => m.value === formManagerId) ?? null : null),
        [formManagerId, managerOptions]
    );
    const managerValue = formManagerQuery.length ? formManagerQuery : selectedManager;

    useEffect(() => {
        setFormManagerSuggestions(filterOptions(managerOptions, formManagerQuery));
    }, [formManagerQuery, managerOptions]);

    const rows: VoucherRow[] = useMemo(
        () => (hasApplied ? data?.voucherRegisterByLedgerDetailed?.items ?? [] : []),
        [data, hasApplied]
    );
    const totalCount = hasApplied ? data?.voucherRegisterByLedgerDetailed?.totalCount ?? rows.length ?? 0 : 0;

    const fetchFilterSourceRows = useCallback(async () => {
        if (!hasApplied || !appliedBaseVariables) return;
        if (filterSourceLoading) return;
        if (filterSourceRows && filterSourceRows.length > 0) return;
        if (totalCount <= 0) return;
        if (totalCount <= rows.length) {
            setFilterSourceRows(rows);
            return;
        }
        setFilterSourceLoading(true);
        try {
            const result = await apolloClient.query({
                query: VOUCHER_REGISTER_BY_LEDGER,
                fetchPolicy: 'network-only',
                variables: {
                    ...appliedBaseVariables,
                    limit: totalCount,
                    offset: 0
                }
            });
            const items = result.data?.voucherRegisterByLedgerDetailed?.items ?? [];
            setFilterSourceRows(Array.isArray(items) ? (items as VoucherRow[]) : []);
        } catch {
            setFilterSourceRows(null);
        } finally {
            setFilterSourceLoading(false);
        }
    }, [
        apolloClient,
        appliedBaseVariables,
        filterSourceLoading,
        filterSourceRows,
        hasApplied,
        rows,
        totalCount
    ]);


    const cashLedgerBalanceLabel = useMemo(() => {
        if (!cashLedgerId) return null;
        if (cashLedgerBalanceLoading) return 'Loading...';
        const balance = cashLedgerBalanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [cashLedgerBalanceData, cashLedgerBalanceLoading, cashLedgerId]);
    const activeLineBalanceLabel = useMemo(() => {
        if (!activeLineLedgerId) return null;
        if (activeLineBalanceLoading) return 'Loading...';
        const balance = activeLineBalanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [activeLineBalanceData, activeLineBalanceLoading, activeLineLedgerId]);

    const cashLedgerBalanceClass = useMemo(() => {
        if (cashLedgerBalanceLoading) return 'text-600';
        const drCr = cashLedgerBalanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'text-red-600' : 'text-green-600';
    }, [cashLedgerBalanceData, cashLedgerBalanceLoading]);
    const activeLineBalanceClass = useMemo(() => {
        if (activeLineBalanceLoading) return 'text-600';
        const drCr = activeLineBalanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'text-red-600' : 'text-green-600';
    }, [activeLineBalanceData, activeLineBalanceLoading]);

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (!hasApplied) {
            setAppliedVariables(registerVariables);
            return;
        }
        setAppliedVariables(registerVariables);
        void refetch(registerVariables);
    };

    const focusLineAmountInput = (key: string) => {
        const input = lineAmountRefs.current[key] ?? null;
        if (!input) return;
        input.focus();
        if (typeof input.setSelectionRange === 'function') {
            const length = input.value?.length ?? 0;
            input.setSelectionRange(0, length);
        }
    };

    const focusLineLedgerInput = (key: string) => {
        const ref = lineLedgerRefs.current[key] ?? null;
        ref?.focus?.();
        ref?.show?.();
    };

    const focusPaymentLedgerInput = () => {
        const ref = cashLedgerInputRef.current ?? null;
        ref?.focus?.();
        ref?.show?.();
    };

    const focusCashLedgerAmountInput = () => {
        const input = cashLedgerAmountInputRef.current ?? null;
        if (!input) return;
        input.focus();
        if (typeof input.setSelectionRange === 'function') {
            const length = input.value?.length ?? 0;
            input.setSelectionRange(0, length);
        }
    };

    const focusPaidByInput = () => {
        const ref = paidByInputRef.current ?? null;
        const input = ref?.getInput?.() ?? null;
        if (!(input instanceof HTMLInputElement)) return;
        input.focus();
        if (typeof input.setSelectionRange === 'function') {
            const length = input.value?.length ?? 0;
            input.setSelectionRange(0, length);
        }
    };

    const focusSaveButton = () => {
        const button = document.getElementById(saveButtonId) as HTMLButtonElement | null;
        button?.focus();
    };

    useEffect(() => {
        if (!paymentModeInitRef.current) {
            paymentModeInitRef.current = true;
            return;
        }
        setCashLedgerId(null);
        setCashLedgerAmount(null);
        setCashLedgerOption(null);
        setPaymentLedgerGroupId(null);
    }, [paymentMode]);

    useEffect(() => {
        if (!resolvedPaymentLedgerGroupId) return;
        setPaymentLedgerGroupId((prev) =>
            Number(prev) === Number(resolvedPaymentLedgerGroupId) ? prev : Number(resolvedPaymentLedgerGroupId)
        );
    }, [resolvedPaymentLedgerGroupId]);

    useEffect(() => {
        if (paymentMode === 'bank') {
            if (paymentViaId == null && chequePaymentViaId != null) {
                setPaymentViaId(chequePaymentViaId);
            }
            return;
        }
        if (paymentViaId != null) {
            setPaymentViaId(null);
        }
    }, [paymentMode, paymentViaId, chequePaymentViaId]);

    useEffect(() => {
        if (!isCashMode) return;
        if (cashLedgerId != null) return;
        const defaultLedgerId = agencyOptions?.defaultExpenditureLedgerId ?? null;
        if (defaultLedgerId != null) {
            setCashLedgerId(defaultLedgerId);
        }
    }, [agencyOptions, cashLedgerId, isCashMode]);

    useEffect(() => {
        if (!isFormActive || editingId) return;
        if (!canFetchNextNo) return;
        refetchNextNo(nextVoucherVariables)
            .then((next) => {
                setVoucherNo(next.data?.nextVoucherNumber ?? '');
            })
            .catch(() => undefined);
    }, [canFetchNextNo, editingId, isFormActive, nextVoucherVariables, refetchNextNo]);

    useEffect(() => {
        if (!isFormActive || !editingId) return;
        refetchEdit({ voucherId: editingId }).catch(() => undefined);
    }, [editingId, isFormActive, refetchEdit]);

    useEffect(() => {
        if (!isFormActive || !editingId) return;
        const header = editData?.voucherEntryById?.header;
        if (!header) return;
        setVoucherNo(header.voucherNumber ?? '');
        setVoucherDate(header.voucherDate ? new Date(`${header.voucherDate}T00:00:00`) : new Date());
        setPostingDate(header.postingDate ? new Date(`${header.postingDate}T00:00:00`) : new Date());
        const fallbackRow =
            selectedRow?.voucherId === editingId ? selectedRow : rows.find((row) => row.voucherId === editingId) ?? null;
        const fallbackRefNo = fallbackRow?.refNo ?? '';
        const fallbackRefDate = fallbackRow?.refDate ?? null;
        const headerRefNo = header.refNo?.trim() ?? '';
        const headerRefDate = header.refDate?.trim() ?? '';
        setRefNo(headerRefNo || fallbackRefNo || '');
        setRefDate(parseDateText(headerRefDate) ?? parseDateText(fallbackRefDate));
        setChequeInFavour(header.chequeInFavourText ?? '');
        setChequeIssueBookId(header.chequeIssueBookId != null ? Number(header.chequeIssueBookId) : null);
        setPaymentViaId(header.paymentViaId != null ? Number(header.paymentViaId) : null);
        setNarration(header.narration ?? '');
        setFormManagerId(header.managerId != null ? Number(header.managerId) : null);
        setCancelledChecked(Number(header.isCancelledFlag) === 1);
        setCashLedgerAmount(null);
        setCashLedgerOption(null);
        setPaymentLedgerGroupId(null);

        const voucherLines = editData?.voucherEntryById?.lines ?? [];
        const debitLines = voucherLines.filter((l: any) => Number(l.drCrFlag) === 1);
        const creditLine = voucherLines.find((l: any) => Number(l.drCrFlag) === 2);
        const fallbackNames = (
            selectedRow?.debitLedgerNames ??
            rows.find((row) => row.voucherId === editingId)?.debitLedgerNames ??
            ''
        )
            .split(/\r?\n/)
            .map((name) => name.trim())
            .filter(Boolean);
        const mappedLines = debitLines.map((line: any, index: number) => ({
            key: makeKey(),
            ledgerGroupId: null,
            ledgerId: line.ledgerId != null ? Number(line.ledgerId) : null,
            ledgerOption: null,
            amount: line.amount != null ? Number(line.amount) : null,
            label: fallbackNames[index] ?? null
        }));
        const nextLines = mappedLines.length > 0 ? mappedLines : [createDebitLine()];
        setLines(nextLines);
        setActiveLineKey(nextLines[0]?.key ?? null);
        setFormManagerQuery('');
        if (creditLine?.ledgerId != null) {
            setCashLedgerId(Number(creditLine.ledgerId));
        }
        if (creditLine?.amount != null) {
            setCashLedgerAmount(Number(creditLine.amount));
        }
    }, [editData, editingId, isFormActive]);

    useEffect(() => {
        if (!selectedRow) return;
        const stillExists = rows.some((row) => row.voucherId === selectedRow.voucherId);
        if (!stillExists) setSelectedRow(null);
    }, [rows, selectedRow]);

    useEffect(() => {
        if (!isFormActive) return;
        const rafId = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                voucherDateInputRef.current?.focus();
            });
        });
        return () => window.cancelAnimationFrame(rafId);
    }, [isFormActive, focusNonce]);

    const focusVoucherDateInput = () => {
        const element = voucherDateInputRef.current;
        if (!element) return;
        element.focus();
        if (typeof element.setSelectionRange === 'function') {
            const length = element.value?.length ?? 0;
            element.setSelectionRange(0, length);
        }
    };

    const openAdd = () => {
        setEditingId(null);
        setSelectedRow(null);
        setIsFormActive(true);
        setFocusNonce((value) => value + 1);
        window.setTimeout(focusVoucherDateInput, 0);
        window.setTimeout(focusVoucherDateInput, 100);
        setCancelledChecked(false);
        setCashLedgerAmount(null);
        setCashLedgerOption(null);
        setPaymentLedgerGroupId(null);
        setFormErrors({});
        setVoucherNo(canFetchNextNo ? nextNoData?.nextVoucherNumber ?? '' : '');
        setVoucherDate(new Date());
        setPostingDate(new Date());
        setRefNo('');
        setRefDate(null);
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setChequeInFavour('');
        setChequeIssueBookId(null);
        setNarration('');
        const freshLine = createDebitLine();
        setLines([freshLine]);
        setActiveLineKey(freshLine.key);
        setFormManagerQuery('');
        setFormManagerId(null);
        setSaving(false);
    };

    const openEdit = () => {
        if (!selectedRow) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select', detail: 'Select a voucher to edit.' });
            return;
        }
        setEditingId(selectedRow.voucherId);
        setIsFormActive(true);
        setFormErrors({});
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setSaving(false);
    };

    const openEditForRow = (row: VoucherRow) => {
        setSelectedRow(row);
        setEditingId(row.voucherId);
        setIsFormActive(true);
        setFormErrors({});
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setSaving(false);
    };

    const updateLine = (key: string, patch: Partial<DebitLineDraft>) => {
        setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
    };

    const syncLineAmountInput = (key: string, rawValue: string) => {
        const parsed = parseInputNumber(rawValue);
        if (parsed === undefined) return;
        updateLine(key, { amount: parsed });
    };

    const syncCashLedgerAmountInput = (rawValue: string) => {
        const parsed = parseInputNumber(rawValue);
        if (parsed === undefined) return;
        setCashLedgerAmount(parsed);
        clearFormError('cashLedgerAmount');
    };

    const confirmRemoveLine = (key: string) => {
        confirmDialog({
            message: 'Delete this line?',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            footer: (options) => (
                <>
                    <Button
                        label="No"
                        icon="pi pi-times"
                        className="p-button-text"
                        onClick={options.reject}
                        autoFocus
                    />
                    <Button
                        label="Yes"
                        icon="pi pi-check"
                        className="p-button-danger"
                        onClick={options.accept}
                    />
                </>
            ),
            accept: () => removeLine(key),
            reject: () => undefined
        });
    };

    const appendLine = () => {
        const nextLine = createDebitLine();
        setLines((prev) => [...prev, nextLine]);
        setActiveLineKey(nextLine.key);
        window.setTimeout(() => focusLineLedgerInput(nextLine.key), 0);
        clearFormError('debitLines');
    };

    const removeLine = (key: string) => {
        setLines((prev) => {
            const next = prev.filter((line) => line.key !== key);
            if (next.length > 0) {
                if (activeLineKey === key) {
                    setActiveLineKey(next[0].key);
                }
                return next;
            }
            const fresh = createDebitLine();
            setActiveLineKey(fresh.key);
            window.setTimeout(() => focusLineLedgerInput(fresh.key), 0);
            return [fresh];
        });
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
    };

    const deleteRow = async (row: VoucherRow) => {
        if (!row?.voucherId || saving) return;
        const confirmDelete = typeof window === 'undefined' ? true : window.confirm(`Delete voucher #${row.voucherNumber ?? row.voucherId}?`);
        if (!confirmDelete) return;
        setSaving(true);
        try {
            await deleteVoucherEntry({ variables: { voucherId: row.voucherId } });
            toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: `Voucher #${row.voucherNumber ?? row.voucherId}` });
            if (selectedRow?.voucherId === row.voucherId) {
                setSelectedRow(null);
            }
            if (editingId === row.voucherId) {
                setEditingId(null);
                setIsFormActive(false);
            }
            await refetch();
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to delete voucher' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingId) {
            toastRef.current?.show({ severity: 'warn', summary: 'Delete', detail: 'Select a voucher to delete.' });
            return;
        }
        const row =
            selectedRow ??
            rows.find((item) => item.voucherId === editingId) ??
            ({ voucherId: editingId, voucherNumber: voucherNo } as VoucherRow);
        await deleteRow(row);
    };

    const cancelForm = () => {
        setIsFormActive(false);
        setEditingId(null);
        setCancelledChecked(false);
        setCashLedgerAmount(null);
        setCashLedgerOption(null);
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setFormErrors({});
        setChequeInFavour('');
        setChequeIssueBookId(null);
        setFormManagerQuery('');
        setActiveLineKey(null);
    };

    const save = async () => {
        if (!isFormActive) return;
        const debitLines = lines
            .filter((line) => line.ledgerId && line.amount && Number(line.amount) > 0)
            .map((line) => ({
                ledgerId: Number(line.ledgerId),
                amount: Number(line.amount)
            }));
        const total = debitLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const headerAmount = cashLedgerAmount != null ? Number(cashLedgerAmount) : 0;

        const parsed = voucherFormSchema.safeParse({
            voucherNo: voucherNo.trim(),
            voucherDate,
            postingDate,
            refDate,
            voucherTypeId: voucherTypeId ?? 0,
            cashLedgerId: cashLedgerId ?? 0,
            cashLedgerAmount: headerAmount,
            debitLines,
            isCashMode,
            managerId: formManagerId ?? null,
            lineTotal: total
        });

        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            let nextVoucherDateError: string | null = null;
            let nextPostingDateError: string | null = null;
            let nextRefDateError: string | null = null;

            parsed.error.issues.forEach((issue) => {
                const pathKey = issue.path[0] ? String(issue.path[0]) : 'form';
                if (pathKey === 'voucherDate') {
                    nextVoucherDateError = issue.message;
                    return;
                }
                if (pathKey === 'postingDate') {
                    nextPostingDateError = issue.message;
                    return;
                }
                if (pathKey === 'refDate') {
                    nextRefDateError = issue.message;
                    return;
                }
                const resolvedKey = pathKey === 'voucherTypeId' ? 'form' : pathKey;
                if (!nextErrors[resolvedKey]) {
                    nextErrors[resolvedKey] = issue.message;
                }
            });

            setVoucherDateError(nextVoucherDateError);
            setPostingDateError(nextPostingDateError);
            setRefDateError(nextRefDateError);
            setFormErrors(nextErrors);
            return;
        }

        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setFormErrors({});

        if (!voucherDate || !postingDate) return;

        setSaving(true);
        try {
            const headerNarration = narration.trim() ? narration.trim() : null;
            const paymentViaValue = isBankMode ? paymentViaId : null;
            const chequeInFavourText =
                isChequePayment && chequeInFavour.trim() ? chequeInFavour.trim() : null;
            const chequeIssueBookValue =
                isChequePayment && chequeIssueBookId != null ? Number(chequeIssueBookId) : null;
            const voucherLines = [
                ...debitLines.map((line) => ({
                    ledgerId: line.ledgerId,
                    amount: line.amount,
                    drCrFlag: 1,
                    narrationText: headerNarration
                })),
                {
                    ledgerId: cashLedgerId,
                    amount: headerAmount,
                    drCrFlag: 2,
                    narrationText: headerNarration
                }
            ];
            const variables = {
                voucherTypeId,
                voucherDateText: toDateText(voucherDate),
                postingDateText: postingDate ? toDateText(postingDate) : null,
                voucherNumber: voucherNo.trim() ? voucherNo.trim() : null,
                narrationText: headerNarration,
                purchaseVoucherNumber: refNo.trim() ? refNo.trim() : null,
                purchaseVoucherDateText: refDate ? toDateText(refDate) : null,
                managerId: isCashMode ? formManagerId : null,
                chequeInFavourText,
                chequeIssueBookId: chequeIssueBookValue,
                paymentViaId: paymentViaValue,
                primaryLedgerId: cashLedgerId,
                isCancelledFlag: cancelledChecked ? 1 : 0,
                lines: voucherLines
            };

            if (editingId) {
                await updateVoucher({ variables: { voucherId: editingId, ...variables } });
                toastRef.current?.show({ severity: 'success', summary: 'Updated', detail: `Voucher #${voucherNo}` });
            } else {
                await createVoucher({ variables });
                toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: `Voucher #${voucherNo}` });
            }

            await refetch();

            setIsFormActive(false);
            setEditingId(null);
            setSelectedRow(null);
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to save voucher' });
        } finally {
            setSaving(false);
        }
    };

    const totalDebit = useMemo(() => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0), [lines]);
    const differenceAmount = useMemo(() => (Number(cashLedgerAmount || 0) || 0) - totalDebit, [cashLedgerAmount, totalDebit]);
    const differenceLabel = useMemo(() => {
        const absValue = Math.abs(differenceAmount);
        const suffix = differenceAmount >= 0 ? 'Cr' : 'Dr';
        return `${formatAmount(absValue)} ${suffix}`;
    }, [differenceAmount]);

    const renderStackedHeader = (top: string, bottom: string) => (
        <div className="flex flex-column">
            <span>{top}</span>
            <span className="text-600 text-sm">{bottom}</span>
        </div>
    );

    const renderStackedValue = (top: React.ReactNode, bottom: React.ReactNode) => (
        <div className="flex flex-column">
            <span>{top ?? ''}</span>
            <span className="text-600 text-sm">{bottom ?? ''}</span>
        </div>
    );

    const mapDisplayRow = useCallback(
        (row: VoucherRow) => {
            const typeId = row.voucherTypeId != null ? Number(row.voucherTypeId) : null;
            const voucherType =
                typeId === VoucherTypeIds.Payment || typeId === VoucherTypeIds.MPayment ? 'Payment' : row.voucherTypeName ?? '';
            const voucherNo = row.voucherNumber ?? '';
            const voucherDateDisplay = formatDate(row.voucherDate);
            const postingDateDisplay = formatDate(row.postingDate);
            const refDateDisplay = formatDate(row.refDate);
            const voucherDateKey = toDateKey(row.voucherDate);
            const postingDateKey = toDateKey(row.postingDate);
            const refDateKey = toDateKey(row.refDate);
            const ledgerDrNames = (row.debitLedgerNames ?? '').trim();
            const ledgerDrPrimary = (row.debitLedgerName ?? '').trim();
            const ledgerDrDisplay = ledgerDrNames || ledgerDrPrimary;
            const creditLedgerPrimary = (row.creditLedgerName ?? '').trim();
            const creditLedgerNames = (row.creditLedgerNames ?? '').trim();
            const creditLedgerFallback =
                creditLedgerNames.length > 0 ? creditLedgerNames.split('\n').map((name) => name.trim()).find(Boolean) ?? '' : '';
            const ledgerCrDisplay = creditLedgerPrimary || creditLedgerFallback || cashLedgerLabel;
            const netAmtDisplay = row.totalNetAmount ? formatAmount(row.totalNetAmount) : '';
            return {
                ...row,
                voucherTypeDisplay: voucherType,
                voucherNoDisplay: voucherNo,
                voucherTypeNoDisplay: `${voucherType} ${row.voucherNumber ?? ''}`.trim(),
                voucherPostingDateDisplay: `${voucherDateDisplay} ${postingDateDisplay}`.trim(),
                refDisplay: `${row.refNo ?? ''} ${refDateDisplay}`.trim(),
                voucherDateKey,
                postingDateKey,
                refDateKey,
                ledgerCrDisplay,
                ledgerDrDisplay,
                netAmtDisplay
            };
        },
        [cashLedgerLabel]
    );

    const displayRows = useMemo(() => rows.map(mapDisplayRow), [rows, mapDisplayRow]);
    const filterRows = useMemo(
        () => (filterSourceRows && filterSourceRows.length > 0 ? filterSourceRows : rows),
        [filterSourceRows, rows]
    );
    const filterDisplayRows = useMemo(() => filterRows.map(mapDisplayRow), [filterRows, mapDisplayRow]);

    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => (row as any).voucherTypeDisplay)),
        [filterDisplayRows]
    );
    const voucherNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => (row as any).voucherNoDisplay)),
        [filterDisplayRows]
    );
    const refNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.refNo)),
        [filterDisplayRows]
    );
    const ledgerCrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => (row as any).ledgerCrDisplay)),
        [filterDisplayRows]
    );
    const ledgerDrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => (row as any).ledgerDrDisplay)),
        [filterDisplayRows]
    );
    const narrationFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.narration)),
        [filterDisplayRows]
    );
    const paidByFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.managerName)),
        [filterDisplayRows]
    );
    const ledgerGroupFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.debitLedgerGroupName)),
        [filterDisplayRows]
    );
    const netAmtFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterDisplayRows.map((row) => row.totalNetAmount)),
        [filterDisplayRows]
    );

    const voucherTypeNoFilterElement = useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const current = (options.value ?? {}) as { voucherTypes?: string[]; voucherNos?: string[] };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '18rem' }}>
                        <AppMultiSelect
                            value={(current.voucherTypes ?? []) as string[]}
                            options={voucherTypeFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => options.filterCallback({ ...current, voucherTypes: event.value })}
                            filter
                            filterInputAutoFocus
                            showSelectAll
                            placeholder="Voucher Type"
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={voucherTypeFilterOptions.length ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={voucherTypeFilterOptions.length === 0}
                            onShow={fetchFilterSourceRows}
                            loading={filterSourceLoading}
                        />
                        <AppMultiSelect
                            value={(current.voucherNos ?? []) as string[]}
                            options={voucherNoFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => options.filterCallback({ ...current, voucherNos: event.value })}
                            filter
                            showSelectAll
                            placeholder="Voucher No."
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={voucherNoFilterOptions.length ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={voucherNoFilterOptions.length === 0}
                            onShow={fetchFilterSourceRows}
                            loading={filterSourceLoading}
                        />
                    </div>
                );
            },
        [fetchFilterSourceRows, filterSourceLoading, voucherNoFilterOptions, voucherTypeFilterOptions]
    );

    const voucherPostingDateFilterElement = useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const current = (options.value ?? {}) as { voucherDate?: string | null; postingDate?: string | null };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '14rem' }}>
                        <AppDateInput
                            value={current.voucherDate ? parseDateText(current.voucherDate) : null}
                            onChange={(value) => options.filterCallback({ ...current, voucherDate: toDateText(value) })}
                            placeholder="Voucher Date"
                            className="app-entry-date"
                        />
                        <AppDateInput
                            value={current.postingDate ? parseDateText(current.postingDate) : null}
                            onChange={(value) => options.filterCallback({ ...current, postingDate: toDateText(value) })}
                            placeholder="Posting Date"
                            className="app-entry-date"
                        />
                    </div>
                );
            },
        []
    );

    const refFilterElement = useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const current = (options.value ?? {}) as { refNos?: string[]; refDate?: string | null };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '18rem' }}>
                        <AppMultiSelect
                            value={(current.refNos ?? []) as string[]}
                            options={refNoFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => options.filterCallback({ ...current, refNos: event.value })}
                            filter
                            filterInputAutoFocus
                            showSelectAll
                            placeholder="Ref. No."
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={refNoFilterOptions.length ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={refNoFilterOptions.length === 0}
                            onShow={fetchFilterSourceRows}
                            loading={filterSourceLoading}
                        />
                        <AppDateInput
                            value={current.refDate ? parseDateText(current.refDate) : null}
                            onChange={(value) => options.filterCallback({ ...current, refDate: toDateText(value) })}
                            placeholder="Ref. Date"
                            className="app-entry-date"
                        />
                    </div>
                );
            },
        [fetchFilterSourceRows, filterSourceLoading, refNoFilterOptions]
    );

    const ledgerCrFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerCrFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, ledgerCrFilterOptions]
    );
    const ledgerDrFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerDrFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, ledgerDrFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, narrationFilterOptions]
    );
    const paidByFilterElement = useMemo(
        () => buildMultiSelectFilterElement(paidByFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, paidByFilterOptions]
    );
    const ledgerGroupFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerGroupFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, ledgerGroupFilterOptions]
    );
    const netAmtFilterElement = useMemo(
        () => buildMultiSelectFilterElement(netAmtFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, netAmtFilterOptions]
    );

    const activeColumnFilters = useMemo(
        () =>
            Object.entries(columnFilters ?? {}).filter(([, meta]) => {
                const value = resolveFilterValue(meta as ColumnFilterMeta);
                return !isEmptyFilterValue(value);
            }),
        [columnFilters]
    );

    const applyColumnFilters = useCallback(
        (rowsToFilter: any[]) => {
            if (activeColumnFilters.length === 0) return rowsToFilter;

            return rowsToFilter.filter((row) =>
                activeColumnFilters.every(([field, meta]) => {
                    const value = resolveFilterValue(meta as ColumnFilterMeta);
                    if (isEmptyFilterValue(value)) return true;

                    switch (field) {
                        case 'voucherTypeNoDisplay': {
                            const data = value as { voucherTypes?: string[]; voucherNos?: string[] } | null;
                            const voucherTypes = data?.voucherTypes ?? [];
                            const voucherNos = data?.voucherNos ?? [];
                            if (voucherTypes.length > 0) {
                                const matchesType = voucherTypes.some(
                                    (type) => normalizeTextValue(type) === normalizeTextValue((row as any).voucherTypeDisplay)
                                );
                                if (!matchesType) return false;
                            }
                            if (voucherNos.length > 0) {
                                const matchesNo = voucherNos.some(
                                    (no) => normalizeTextValue(no) === normalizeTextValue((row as any).voucherNoDisplay)
                                );
                                if (!matchesNo) return false;
                            }
                            return true;
                        }
                        case 'voucherPostingDateDisplay': {
                            const data = value as { voucherDate?: string | null; postingDate?: string | null } | null;
                            const voucherDate = data?.voucherDate ?? null;
                            const postingDate = data?.postingDate ?? null;
                            if (voucherDate && voucherDate !== (row as any).voucherDateKey) return false;
                            if (postingDate && postingDate !== (row as any).postingDateKey) return false;
                            return true;
                        }
                        case 'refDisplay': {
                            const data = value as { refNos?: string[]; refDate?: string | null } | null;
                            const refNos = data?.refNos ?? [];
                            const refDate = data?.refDate ?? null;
                            if (refNos.length > 0) {
                                const matchesRef = refNos.some(
                                    (ref) => normalizeTextValue(ref) === normalizeTextValue((row as any).refNo)
                                );
                                if (!matchesRef) return false;
                            }
                            if (refDate && refDate !== (row as any).refDateKey) return false;
                            return true;
                        }
                        case 'netAmtDisplay': {
                            const list = Array.isArray(value) ? value : [];
                            if (list.length === 0) return true;
                            const amount = Number((row as any).totalNetAmount ?? 0);
                            return list.some((item) => Number(item) === amount);
                        }
                        default: {
                            if (Array.isArray(value)) {
                                if (value.length === 0) return true;
                                const cell = normalizeTextValue((row as any)[field]);
                                return value.some((item) => normalizeTextValue(item) === cell);
                            }
                            const needle = normalizeTextValue(value);
                            const haystack = normalizeTextValue((row as any)[field]);
                            return haystack.includes(needle);
                        }
                    }
                })
            );
        },
        [activeColumnFilters]
    );

    const filteredRows = useMemo(() => applyColumnFilters(displayRows), [applyColumnFilters, displayRows]);
    const filteredAllRows = useMemo(() => applyColumnFilters(filterDisplayRows), [applyColumnFilters, filterDisplayRows]);
    const totalRecordsForTable = activeColumnFilters.length > 0 ? filteredRows.length : totalCount;
    const totals = useMemo(() => {
        if (activeColumnFilters.length > 0) {
            const rowsForTotals = filterSourceRows && filterSourceRows.length > 0 ? filteredAllRows : filteredRows;
            return rowsForTotals.reduce((sum, row) => sum + Number(row.totalNetAmount || 0), 0);
        }
        const totalFromApi = data?.voucherRegisterByLedgerDetailed?.totalNetAmount;
        if (totalFromApi != null && Number.isFinite(Number(totalFromApi))) {
            return Number(totalFromApi);
        }
        return rows.reduce((sum, r) => sum + Number(r.totalNetAmount || 0), 0);
    }, [
        activeColumnFilters.length,
        data?.voucherRegisterByLedgerDetailed?.totalNetAmount,
        filteredAllRows,
        filteredRows,
        filterSourceRows,
        rows
    ]);
    const printMenuItems = useMemo(
        () => [
            {
                label: 'Format 1',
                icon: printFormat === 'format-1' ? 'pi pi-check' : undefined,
                command: () => {
                    setPrintFormat('format-1');
                    window.print();
                }
            },
            {
                label: 'Format 2',
                icon: printFormat === 'format-2' ? 'pi pi-check' : undefined,
                command: () => {
                    setPrintFormat('format-2');
                    window.print();
                }
            }
        ],
        [printFormat]
    );

    return (
        <div className="cash-exp-split">
            <ConfirmDialog />
            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column gap-2">
                    <div>
                        <h2 className="m-0">Payment Voucher</h2>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading payment vouchers: {error.message}</p>}
            </div>
            <div
                className={`cash-exp-split__form p-3 cash-exp-form cash-exp-form--receipt ${
                    paymentMode === 'bank' ? 'cash-exp-form--bank' : 'cash-exp-form--cash'
                }`}
            >
                <div className="app-entry-form-header">
                    <div className="app-entry-form-header__left">
                        <div className="font-semibold">Add/Edit Detail</div>
                    </div>
                    <div className="app-entry-form-header__right">
                        <span className="text-600 text-sm">Payment Mode</span>
                        <SelectButton
                            value={paymentMode}
                            options={paymentModeOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => {
                                if (!event.value) return;
                                setPaymentMode(event.value as PaymentMode);
                                clearFormError('managerId');
                            }}
                            className="app-filter-width app-payment-mode"
                        />
                    </div>
                </div>

                <div className="flex flex-column gap-2">
                    <div className="app-entry-section app-entry-section--header">
                        {formLevelError && <small className="text-red-500">{formLevelError}</small>}
                        <div className="grid">
                            <div className="col-12">
                                <div className="app-entry-row">
                                    <div className="app-entry-field">
                                        <label className="block text-600 mb-1">Voucher No. *</label>
                                        <AppInput
                                            value={voucherNo}
                                            onChange={(e) => {
                                                setVoucherNo(e.target.value);
                                                clearFormError('voucherNo');
                                            }}
                                            className="app-entry-control"
                                            disabled={!isFormActive || saving}
                                        />
                                        {renderFormError('voucherNo')}
                                    </div>
                                    <div className="app-entry-field">
                                        <label className="block text-600 mb-1">Voucher Date *</label>
                                        <AppDateInput
                                            value={voucherDate}
                                            onChange={(value) => {
                                                setVoucherDate(value);
                                                setVoucherDateError(null);
                                            }}
                                            fiscalYearStart={fiscalRange?.start ?? null}
                                            fiscalYearEnd={fiscalRange?.end ?? null}
                                            disabled={!isFormActive}
                                            inputRef={voucherDateInputRef}
                                            focusSignal={focusNonce}
                                            selectOnFocus
                                            className="app-entry-control"
                                        />
                                        {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                                    </div>
                                    <div className="app-entry-field">
                                        <label className="block text-600 mb-1">Posting Date *</label>
                                        <AppDateInput
                                            value={postingDate}
                                            onChange={(value) => {
                                                setPostingDate(value);
                                                setPostingDateError(null);
                                            }}
                                            fiscalYearStart={fiscalRange?.start ?? null}
                                            fiscalYearEnd={fiscalRange?.end ?? null}
                                            disabled={!isFormActive}
                                            className="app-entry-control"
                                        />
                                        {postingDateError && <small className="text-red-500">{postingDateError}</small>}
                                    </div>
                                    {isBankMode && (
                                        <div className="app-entry-field">
                                            <label className="block text-600 mb-1">Payment Via</label>
                                            <AppDropdown
                                                value={paymentViaId}
                                                options={paymentViaOptions}
                                                onChange={(e) => setPaymentViaId(e.value as number | null)}
                                                placeholder="Select"
                                                loading={paymentViaLoading}
                                                showLoadingIcon
                                                disabled={!isFormActive}
                                                className="app-entry-control"
                                            />
                                        </div>
                                    )}
                                    <div className="app-entry-field">
                                        <label className="block text-600 mb-1">{refNoLabel}</label>
                                        <AppInput
                                            value={refNo}
                                            onChange={(e) => setRefNo(e.target.value)}
                                            className="app-entry-control"
                                            disabled={!isFormActive}
                                        />
                                    </div>
                                    <div className="app-entry-field">
                                        <label className="block text-600 mb-1">{refDateLabel}</label>
                                        <AppDateInput
                                            value={refDate}
                                            onChange={(value) => {
                                                setRefDate(value);
                                                setRefDateError(null);
                                            }}
                                            fiscalYearStart={fiscalRange?.start ?? null}
                                            fiscalYearEnd={fiscalRange?.end ?? null}
                                            disabled={!isFormActive}
                                            className="app-entry-control"
                                        />
                                        {refDateError && <small className="text-red-500">{refDateError}</small>}
                                    </div>
                                    {isChequePayment && (
                                        <div className="app-entry-field app-entry-field--wide">
                                            <label className="block text-600 mb-1">Cheque Book</label>
                                            <AppDropdown
                                                value={chequeIssueBookId}
                                                options={chequeBookOptions}
                                                onChange={(e) => setChequeIssueBookId(e.value as number | null)}
                                                placeholder={!cashLedgerId ? 'Select bank first' : 'Select cheque book'}
                                                disabled={!isFormActive || !cashLedgerId}
                                                className="app-entry-control"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="app-entry-ledger-row">
                                    <div className="app-entry-ledger-group">
                                        <div className="app-entry-field app-entry-ledger-field">
                                            <label className="block text-600">Ledger Group</label>
                                            <LedgerGroupAutoComplete
                                                value={paymentLedgerGroupId}
                                                onChange={(nextValue) => {
                                                    setPaymentLedgerGroupId(nextValue);
                                                    setCashLedgerId(null);
                                                    setCashLedgerOption(null);
                                                    clearFormError('cashLedgerId');
                                                }}
                                                placeholder="Ledger group"
                                                loadingPlaceholder="Loading groups..."
                                                onSelectNext={focusPaymentLedgerInput}
                                                style={{ width: '100%', maxWidth: '14rem' }}
                                                panelStyle={{ width: '16rem' }}
                                                disabled={paymentLedgerGroupDisabled}
                                                appendTo={autoCompleteAppendTarget}
                                            />
                                        </div>
                                        <div className="app-entry-field app-entry-field--xwide app-entry-ledger-field">
                                            <div className="app-entry-ledger-label-row">
                                                <label className="block text-600">{paymentLedgerLabel} *</label>
                                                {cashLedgerBalanceLabel && (
                                                    <span className={`app-entry-ledger-balance ${cashLedgerBalanceClass}`}>
                                                        {cashLedgerBalanceLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <LedgerAutoComplete
                                                variant="purpose"
                                                purpose={paymentLedgerPurpose}
                                                value={cashLedgerId}
                                                onChange={(value, option) => {
                                                    setFirst(0);
                                                    setCashLedgerId(value);
                                                    setCashLedgerOption(option ?? null);
                                                    clearFormError('cashLedgerId');
                                                }}
                                                options={paymentLedgerOptions}
                                                loading={paymentLedgerOptionsLoading}
                                                placeholder={paymentLedgerPlaceholderResolved}
                                                loadingPlaceholder={paymentLedgerLoadingPlaceholder}
                                                ref={cashLedgerInputRef}
                                                className="app-entry-control"
                                                disabled={!isFormActive}
                                                ledgerGroupId={paymentLedgerGroupId}
                                                onSelectNext={focusCashLedgerAmountInput}
                                            />
                                            {renderFormError('cashLedgerId')}
                                        </div>
                                        <div className="app-entry-ledger-meta">
                                            <LedgerMetaPanel address={cashLedgerAddressLabel} />
                                        </div>
                                    </div>
                                    <div className="app-entry-field app-entry-ledger-amount app-entry-ledger-amount--wide">
                                        <label className="block text-600 mb-1 app-entry-ledger-amount-label">Amount *</label>
                                        <div className="app-entry-ledger-amount-row">
                                            <AppDropdown
                                                value={CR_ONLY_VALUE}
                                                options={DR_CR_OPTIONS}
                                                disabled
                                                className="app-entry-control app-entry-drcr"
                                            />
                                            <AppInput
                                                inputType="number"
                                                value={cashLedgerAmount}
                                                onValueChange={(e) => {
                                                    setCashLedgerAmount(e.value as number | null);
                                                    clearFormError('cashLedgerAmount');
                                                }}
                                                onInput={(event) => {
                                                    const target = event.target as HTMLInputElement | null;
                                                    if (!target) return;
                                                    syncCashLedgerAmountInput(target.value);
                                                }}
                                                mode="decimal"
                                                minFractionDigits={2}
                                                maxFractionDigits={2}
                                                inputRef={(el) => {
                                                    cashLedgerAmountInputRef.current = el;
                                                }}
                                                inputStyle={{ width: '100%', textAlign: 'right' }}
                                                className="app-entry-control app-entry-ledger-amount-input"
                                                disabled={!isFormActive}
                                            />
                                        </div>
                                        {renderFormError('cashLedgerAmount')}
                                    </div>
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="app-entry-narration">
                                    <label className="block text-600 mb-1">Narration</label>
                                    <AppInput
                                        value={narration}
                                        onChange={(e) => setNarration(e.target.value)}
                                        className="app-entry-control"
                                        disabled={!isFormActive}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="app-entry-section app-entry-section--lines">
                        <div className="app-entry-lines">
                            <div className="app-entry-lines-header">
                                <div className="app-entry-lines-title">To (Ledger Dr)</div>
                            </div>

                            <AppDataTable value={lines} dataKey="key" size="small" stripedRows className="app-entry-lines-table">
                                <Column
                                    header="Ledger Group"
                                    headerClassName="text-center"
                                    body={(line: DebitLineDraft) => (
                                        <LedgerGroupAutoComplete
                                            value={line.ledgerGroupId}
                                            onChange={(nextValue) => {
                                                updateLine(line.key, {
                                                    ledgerGroupId: nextValue,
                                                    ledgerId: null,
                                                    ledgerOption: null,
                                                    label: null
                                                });
                                            }}
                                            placeholder="Ledger group"
                                            loadingPlaceholder="Loading groups..."
                                            onSelectNext={() => focusLineLedgerInput(line.key)}
                                            style={{ width: '100%', maxWidth: '14rem' }}
                                            panelStyle={{ width: '16rem' }}
                                            disabled={!isFormActive}
                                            onFocus={() => setActiveLineKey(line.key)}
                                            appendTo={autoCompleteAppendTarget}
                                        />
                                    )}
                                    style={{ width: '12rem' }}
                                />
                                <Column
                                    header="Ledger (Dr)"
                                    headerClassName="text-center"
                                    body={(line: DebitLineDraft) => {
                                        const fallbackOption =
                                            line.ledgerId != null
                                                ? {
                                                    value: line.ledgerId,
                                                    label: line.label ?? `Ledger ${line.ledgerId}`
                                                }
                                                : null;
                                        return (
                                            <div className="flex flex-column gap-1">
                                                <LedgerAutoComplete
                                                    variant="purpose"
                                                    purpose="PAYMENT-AGAINST"
                                                    value={line.ledgerId}
                                                    selectedOption={line.ledgerOption ?? fallbackOption}
                                                    onChange={(value, option) => {
                                                        const nextLabel =
                                                            value == null ? null : option?.label ?? line.label ?? `Ledger ${value}`;
                                                        updateLine(line.key, {
                                                            ledgerId: value,
                                                            ledgerOption: option ?? null,
                                                            label: nextLabel
                                                        });
                                                    }}
                                                    ledgerGroupId={line.ledgerGroupId}
                                                    onSelectNext={() => focusLineAmountInput(line.key)}
                                                    excludeLedgerId={cashLedgerId ?? null}
                                                    placeholder="Select ledger"
                                                    loadingPlaceholder="Loading ledgers..."
                                                    disabled={!isFormActive}
                                                    style={{ width: '100%', maxWidth: '16rem' }}
                                                    panelStyle={{ width: '20rem' }}
                                                    ref={(el) => {
                                                        lineLedgerRefs.current[line.key] = el;
                                                    }}
                                                    onFocus={() => setActiveLineKey(line.key)}
                                                    appendTo={autoCompleteAppendTarget}
                                                />
                                            </div>
                                        );
                                    }}
                                    style={{ width: '13rem' }}
                                />
                                <Column
                                    header="Address"
                                    headerClassName="text-center"
                                    body={(line: DebitLineDraft) => {
                                        const ledgerAddress = resolveAddress(
                                            line.ledgerOption?.address,
                                            line.ledgerId != null ? paymentAgainstAddressMap.get(Number(line.ledgerId)) ?? null : null
                                        );
                                        const addressLabel = ledgerAddress ?? 'Address not available';
                                        const isActiveLine = line.key === activeLineKey;
                                        const showBalance = Boolean(isActiveLine && line.ledgerId != null && activeLineBalanceLabel);
                                        return (
                                            <div className="flex align-items-center gap-2 ledger-meta-panel">
                                                {addressLabel && (
                                                    <div className="flex align-items-center border-1 surface-border border-round surface-card px-3 py-2 ledger-meta-address">
                                                        <span className="text-700 text-sm">{addressLabel}</span>
                                                    </div>
                                                )}
                                                {showBalance && activeLineBalanceLabel && (
                                                    <div className="flex align-items-center gap-2 ledger-meta-balance">
                                                        <span className={`text-sm font-semibold ${activeLineBalanceClass}`}>
                                                            {activeLineBalanceLabel}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                    style={{ width: '12rem' }}
                                />
                                <Column
                                    header="Dr/Cr"
                                    headerClassName="text-center"
                                    body={() => (
                                        <AppDropdown
                                            value={CR_ONLY_VALUE}
                                            options={DR_CR_OPTIONS}
                                            disabled
                                            className="app-entry-control app-entry-drcr"
                                        />
                                    )}
                                    style={{ width: '5rem' }}
                                />
                                <Column
                                    header="Amount"
                                    headerClassName="text-center"
                                    body={(line: DebitLineDraft, options) => (
                                        <AppInput
                                            inputType="number"
                                            value={line.amount}
                                            onValueChange={(e) => updateLine(line.key, { amount: e.value as number | null })}
                                            onInput={(event) => {
                                                const target = event.target as HTMLInputElement | null;
                                                if (!target) return;
                                                syncLineAmountInput(line.key, target.value);
                                            }}
                                            mode="decimal"
                                            minFractionDigits={2}
                                            maxFractionDigits={2}
                                            inputRef={(el) => {
                                                lineAmountRefs.current[line.key] = el;
                                            }}
                                            inputStyle={{ width: '100%', textAlign: 'right' }}
                                            disabled={!isFormActive}
                                            onFocus={() => setActiveLineKey(line.key)}
                                            onKeyDown={(event) => {
                                                if (event.key !== 'Enter') return;
                                                event.preventDefault();
                                                if (!line.ledgerId || !line.amount || line.amount <= 0) return;
                                                if (isCashMode) {
                                                    const nextTotal = lines.reduce((sum, item) => sum + Number(item.amount || 0), 0);
                                                    const diff = (Number(cashLedgerAmount || 0) || 0) - nextTotal;
                                                    if (Math.abs(diff) <= 0.01 && nextTotal > 0 && Number(line.amount || 0) > 0) {
                                                        window.setTimeout(focusPaidByInput, 0);
                                                        return;
                                                    }
                                                }
                                                const rowIndex = options?.rowIndex ?? 0;
                                                const nextLine = lines[rowIndex + 1];
                                                if (nextLine) {
                                                    setActiveLineKey(nextLine.key);
                                                    window.setTimeout(() => focusLineLedgerInput(nextLine.key), 0);
                                                    return;
                                                }
                                                appendLine();
                                            }}
                                        />
                                    )}
                                    style={{ width: '9rem' }}
                                />
                                <Column
                                    header=""
                                    headerClassName="text-center"
                                    body={(line: DebitLineDraft) => (
                                        <Button
                                            icon="pi pi-trash"
                                            className="p-button-text p-button-danger"
                                            onClick={() => confirmRemoveLine(line.key)}
                                            disabled={!isFormActive || saving}
                                            tooltip="Remove line"
                                            tooltipOptions={{ position: 'left' }}
                                            tabIndex={-1}
                                        />
                                    )}
                                    style={{ width: '3rem' }}
                                />
                            </AppDataTable>
                            <div className="app-entry-lines-summary">
                                <div className="text-600">
                                    Difference (Cr - Dr): <strong>{differenceLabel}</strong>
                                </div>
                                <div className="text-600">
                                    Total (Dr): <strong>{formatAmount(totalDebit)}</strong>
                                </div>
                            </div>
                            {renderFormError('debitLines')}
                        </div>
                    </div>
                    <div className="grid">
                        {isCashMode && (
                            <div className="col-12 md:col-4">
                                <label className="block text-600 mb-1">Paid By</label>
                                <AppAutoComplete
                                    value={managerValue}
                                    suggestions={formManagerSuggestions}
                                    completeMethod={(event: AutoCompleteCompleteEvent) => {
                                        const query = event.query ?? '';
                                        setFormManagerQuery(query);
                                        setFormManagerSuggestions(filterOptions(managerOptions, query));
                                    }}
                                    onFocus={() => {
                                        setFormManagerSuggestions([...managerOptions]);
                                    }}
                                    onDropdownClick={() => setFormManagerSuggestions([...managerOptions])}
                                    onChange={(event: AutoCompleteChangeEvent) => {
                                        const value = event.value as SelectOption | string | null;
                                        clearFormError('managerId');
                                        if (value == null) {
                                            setFormManagerQuery('');
                                            setFormManagerId(null);
                                            return;
                                        }
                                        if (typeof value === 'string') {
                                            const trimmed = value.trim();
                                            if (!trimmed) {
                                                setFormManagerQuery('');
                                                setFormManagerId(null);
                                                return;
                                            }
                                            const match =
                                                formManagerSuggestions.find(
                                                    (option) => option.label.toLowerCase() === trimmed.toLowerCase()
                                                ) ??
                                                managerOptions.find(
                                                    (option) => option.label.toLowerCase() === trimmed.toLowerCase()
                                                ) ??
                                                null;
                                            if (match) {
                                                setFormManagerQuery('');
                                                setFormManagerId(match.value);
                                                return;
                                            }
                                            setFormManagerQuery(value);
                                            setFormManagerId(null);
                                            return;
                                        }
                                        setFormManagerQuery('');
                                        setFormManagerId(Number(value.value));
                                    }}
                                    field="label"
                                    placeholder="Select manager"
                                    showEmptyMessage
                                    loading={managersLoading}
                                    showLoadingIcon
                                    disabled={!isFormActive}
                                    style={{ width: '220px' }}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        const overlay = paidByInputRef.current?.getOverlay?.();
                                        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
                                        if (overlayVisible) return;
                                        event.preventDefault();
                                        event.stopPropagation();
                                        window.setTimeout(focusSaveButton, 0);
                                    }}
                                    ref={paidByInputRef}
                                />
                                {renderFormError('managerId')}
                            </div>
                        )}
                        {isBankMode && isChequePayment && (
                            <div className="col-12 md:col-4">
                                <label className="block text-600 mb-1">Cheque In Favour</label>
                                <AppInput
                                    value={chequeInFavour}
                                    onChange={(e) => setChequeInFavour(e.target.value)}
                                    style={{ width: '100%' }}
                                    disabled={!isFormActive}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex align-items-center justify-content-center flex-wrap mt-3 gap-2 app-entry-actionsbar">
                    <div className="flex flex-wrap app-entry-form-actions">
                        <Button
                            label="Add"
                            icon="pi pi-plus"
                            className={`app-action-compact ${isFormActive ? 'p-button-outlined' : ''}`}
                            onClick={openAdd}
                            disabled={isFormActive || saving}
                        />
                        <Button
                            label="Edit"
                            icon="pi pi-pencil"
                            className="app-action-compact p-button-outlined"
                            onClick={openEdit}
                            disabled={isFormActive || !selectedRow || saving}
                        />
                        <Button
                            label={saving ? 'Saving...' : 'Save'}
                            icon="pi pi-check"
                            className={`app-action-compact ${isFormActive ? '' : 'p-button-outlined'}`}
                            onClick={save}
                            disabled={!isFormActive || saving}
                            id={saveButtonId}
                        />
                        <Button
                            label="Cancel"
                            className="app-action-compact p-button-secondary p-button-outlined"
                            onClick={cancelForm}
                            disabled={!isFormActive || saving}
                        />
                        <Button
                            label="Delete"
                            icon="pi pi-trash"
                            className="app-action-compact p-button-danger p-button-outlined"
                            onClick={handleDelete}
                            disabled={!isFormActive || !editingId || saving}
                        />
                        <Button
                            label={cancelledChecked ? 'Cancelled' : 'Cancel Voucher'}
                            icon={cancelledChecked ? 'pi pi-ban' : 'pi pi-times-circle'}
                            className={`app-action-compact ${cancelledChecked ? 'p-button-danger' : 'p-button-outlined'}`}
                            onClick={() => setCancelledChecked((prev) => !prev)}
                            disabled={!isFormActive}
                        />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="app-action-compact p-button-text"
                            onClick={() => window.print()}
                            disabled={!isFormActive}
                        />
                    </div>
                </div>
            </div>

            <div className="cash-exp-split__list">
                <div className="card app-gradient-card">
                    <Toast ref={toastRef} />

                    <AppDataTable
                        value={filteredRows}
                        paginator
                        rows={rowsPerPage}
                        rowsPerPageOptions={[10, 20, 50, 100]}
                        totalRecords={totalRecordsForTable}
                        lazy
                        first={first}
                        onPage={(e) => {
                            setRowsPerPage(e.rows);
                            setFirst(e.first);
                            if (!hasApplied) return;
                            const nextVariables = { ...registerVariables, limit: e.rows, offset: e.first };
                            setAppliedVariables(nextVariables);
                            refetch(nextVariables);
                        }}
                        dataKey="voucherId"
                        stripedRows
                        size="small"
                        loading={loading}
                        selectionMode="single"
                        selection={selectedRow}
                        onSelectionChange={(e) => setSelectedRow(e.value as VoucherRow | null)}
                        filters={columnFilters}
                        filterDisplay="menu"
                        filterDelay={400}
                        onFilter={(event) => setColumnFilters(event.filters)}
                        headerLeft={
                            <>
                                <div className="flex flex-column gap-1">
                                    <label className="text-600 text-sm">From Date</label>
                                    <AppDateInput
                                        value={dateRange[0]}
                                        onChange={(value) => {
                                            setFirst(0);
                                            hasTouchedDatesRef.current = true;
                                            setDateRange((prev) => [clampToMaxReportDate(value), prev[1]]);
                                            setDateErrors({});
                                        }}
                                        placeholder="From date"
                                        fiscalYearStart={fiscalRange?.start ?? null}
                                        fiscalYearEnd={fiscalRange?.end ?? null}
                                        minDate={fiscalRange?.start ?? undefined}
                                        maxDate={maxReportDate ?? undefined}
                                        inputRef={fromDateInputRef}
                                        onEnterNext={() => toDateInputRef.current?.focus()}
                                        autoFocus
                                        selectOnFocus
                                        className="app-entry-date"
                                    />
                                </div>
                                <div className="flex flex-column gap-1">
                                    <label className="text-600 text-sm">To Date</label>
                                    <AppDateInput
                                        value={dateRange[1]}
                                        onChange={(value) => {
                                            setFirst(0);
                                            hasTouchedDatesRef.current = true;
                                            setDateRange((prev) => [prev[0], clampToMaxReportDate(value)]);
                                            setDateErrors({});
                                        }}
                                        placeholder="To date"
                                        fiscalYearStart={fiscalRange?.start ?? null}
                                        fiscalYearEnd={fiscalRange?.end ?? null}
                                        minDate={fiscalRange?.start ?? undefined}
                                        maxDate={maxReportDate ?? undefined}
                                        inputRef={toDateInputRef}
                                        className="app-entry-date"
                                    />
                                    {(dateErrors.fromDate || dateErrors.toDate) && (
                                        <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                                    )}
                                </div>
                                <div className="flex flex-column gap-1">
                                    <label className="text-600 text-sm">Status</label>
                                    <div className="flex align-items-center gap-2">
                                        <InputSwitch
                                            checked={cancelled === 1}
                                            onChange={(e) => {
                                                setFirst(0);
                                                setCancelled(e.value ? 1 : 0);
                                            }}
                                            className="app-inputswitch"
                                        />
                                        <span className="text-600 text-sm">
                                            {cancelled === 1 ? 'Cancelled' : 'Not cancelled'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        }
                        headerRight={
                            <>
                                <span className="text-700 font-semibold">Total {formatAmount(totals)}</span>
                                <Menu model={printMenuItems} popup ref={printMenuRef} />
                                <Button
                                    label="Refresh"
                                    icon="pi pi-refresh"
                                    className="p-button-text"
                                    id={refreshButtonId}
                                    onClick={handleRefresh}
                                    disabled={!canRefresh}
                                />
                                <Button
                                    label="Print"
                                    icon="pi pi-print"
                                    className="p-button-text"
                                    onClick={(event) => printMenuRef.current?.toggle(event)}
                                />
                            </>
                        }
                        recordSummary={`${filteredRows.length} voucher${filteredRows.length === 1 ? '' : 's'} • Total ${formatAmount(totals)}`}
                    >
                        <Column
                            header={renderStackedHeader('Voucher Type', 'Voucher No.')}
                            body={(r: VoucherRow) => {
                                const typeId = r.voucherTypeId != null ? Number(r.voucherTypeId) : null;
                                const voucherType =
                                    typeId === VoucherTypeIds.Payment || typeId === VoucherTypeIds.MPayment ? 'Payment' : '';
                                return renderStackedValue(voucherType, r.voucherNumber ?? '');
                            }}
                            filterField="voucherTypeNoDisplay"
                            filterElement={voucherTypeNoFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '10rem' }}
                        />
                        <Column
                            header={renderStackedHeader('Voucher Date', 'Posting Date')}
                            body={(r: VoucherRow) => renderStackedValue(formatDate(r.voucherDate), formatDate(r.postingDate))}
                            filterField="voucherPostingDateDisplay"
                            filterElement={voucherPostingDateFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header={renderStackedHeader('Ref. No.', 'Ref. Date')}
                            body={(r: VoucherRow) => renderStackedValue(r.refNo ?? '', formatDate(r.refDate))}
                            filterField="refDisplay"
                            filterElement={refFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="Ledger (Cr)"
                            body={(r: VoucherRow) => {
                                const primary = (r.creditLedgerName ?? '').trim();
                                if (primary) return primary;
                                const list = (r.creditLedgerNames ?? '').split('\n').map((name) => name.trim()).filter(Boolean);
                                if (list.length > 0) return list[0];
                                return cashLedgerLabel;
                            }}
                            filterField="ledgerCrDisplay"
                            filterElement={ledgerCrFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '12rem' }}
                        />
                    <Column
                        header="Ledger (Dr)"
                        body={(r: VoucherRow) => {
                            const detail = (r.debitLedgerNames ?? '').trim();
                            const primary = (r.debitLedgerName ?? '').trim();
                            const amountDetail = (r.debitLedgerAmounts ?? '').trim();
                            const names = (detail ? detail.split("\n") : primary ? [primary] : [])
                                .map((name) => name.trim())
                                .filter((name) => name.length > 0);
                            const amounts = amountDetail ? amountDetail.split("\n").map((value) => value.trim()) : [];
                            const rows = names.map((name, index) => {
                                const rawAmount = amounts[index];
                                const parsed = rawAmount != null && rawAmount !== "" ? Number(rawAmount) : null;
                                const fallback =
                                    parsed == null && index === 0 && (r.totalNetAmount ?? 0) > 0 ? Number(r.totalNetAmount) : null;
                                const displayAmount =
                                    parsed != null && Number.isFinite(parsed)
                                        ? formatAmount(parsed)
                                        : fallback != null && Number.isFinite(fallback)
                                            ? formatAmount(fallback)
                                            : rawAmount ?? "";
                                return { name, amount: displayAmount };
                            });
                            const showAmounts = rows.length > 1;
                            return (
                                <div style={{ display: 'grid', gap: '0.1rem' }} title={detail || primary || undefined}>
                                    {rows.map((row, index) => (
                                        <div
                                            key={`${row.name}-${index}`}
                                            style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
                                        >
                                            <span>{row.name}</span>
                                            {showAmounts && <span style={{ whiteSpace: 'nowrap' }}>{row.amount}</span>}
                                        </div>
                                    ))}
                                </div>
                            );
                        }}
                        filterField="ledgerDrDisplay"
                        filterElement={ledgerDrFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '16rem' }}
                    />
                        <Column
                            field="totalNetAmount"
                            header="Net Amt"
                            body={(r: VoucherRow) => (r.totalNetAmount ? formatAmount(r.totalNetAmount) : '')}
                            filterField="netAmtDisplay"
                            filterElement={netAmtFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '8rem', textAlign: 'right' }}
                        />
                        <Column
                            field="narration"
                            header="Narration"
                            body={(r: VoucherRow) => r.narration ?? ''}
                            filterElement={narrationFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '14rem' }}
                        />
                        <Column
                            field="managerName"
                            header="Paid By"
                            filterElement={paidByFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '12rem' }}
                        />
                        <Column
                            field="debitLedgerGroupName"
                            header="Ledger Group (Dr)"
                            filterElement={ledgerGroupFilterElement}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '12rem' }}
                        />
                        <Column
                            header="Actions"
                            body={(r: VoucherRow) => (
                                <Button
                                    icon="pi pi-pencil"
                                    className="p-button-text p-button-sm"
                                    onClick={() => openEditForRow(r)}
                                    disabled={saving}
                                    tooltip="Edit"
                                    tooltipOptions={{ position: 'top' }}
                                />
                            )}
                            style={{ width: '6rem' }}
                        />
                    </AppDataTable>
                </div>
            </div>
        </div>
    );
}
