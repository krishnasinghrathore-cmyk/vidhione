import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { z } from 'zod';
import AppMultiSelect from '@/components/AppMultiSelect';
import { ACCOUNTING_AMOUNT_CONFIG } from '@/config/accountingCurrency';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate, type FiscalRange } from '@/lib/reportDateValidation';
import type {
    ColumnFilterMeta,
    DebitLineDraft,
    DrCrOption,
    DrCrValue,
    FilterOption,
    PaymentMode
} from './types';

export const CASH_LEDGER_GROUP_TYPES = [6];
export const BANK_LEDGER_GROUP_TYPES = [1, 2, 3, 29];
export const CASH_IN_HAND_GROUP_TYPE = 6;
export const BANK_ACCOUNT_GROUP_TYPE = 1;
export const PAYMENT_VOUCHER_MODE_STORAGE_KEY = 'accounts.paymentVoucher.mode';

export const normalizePaymentMode = (value: string | null | undefined): PaymentMode | null => {
    if (value === 'cash' || value === 'bank') return value;
    return null;
};

export const getStoredPaymentMode = (): PaymentMode | null => {
    if (typeof window === 'undefined') return null;
    return normalizePaymentMode(window.localStorage.getItem(PAYMENT_VOUCHER_MODE_STORAGE_KEY));
};

export const persistPaymentMode = (mode: PaymentMode) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PAYMENT_VOUCHER_MODE_STORAGE_KEY, mode);
};

export const DR_CR_OPTIONS: DrCrOption[] = [
    { label: 'Dr', value: 'Dr' },
    { label: 'Cr', value: 'Cr' }
];

export const DR_ONLY_VALUE: DrCrValue = 'Dr';
export const CR_ONLY_VALUE: DrCrValue = 'Cr';

export const parseInputNumber = (value: string): number | null | undefined => {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeGroupLabel = (value?: string | null) =>
    (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

export const isCashInHandLabel = (value?: string | null) => normalizeGroupLabel(value).includes('cashinhand');

export const resolveAddress = (...candidates: Array<string | null | undefined>) => {
    for (const candidate of candidates) {
        if (candidate == null) continue;
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
    }
    return null;
};

export const toDateText = (date: Date | null) => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

export const formatDate = (value: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const parseDateText = (value: string | null) => {
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

export const toDateKey = (value: string | null) => {
    const parsed = parseDateText(value);
    return parsed ? toDateText(parsed) : null;
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

const amountFormatter = new Intl.NumberFormat(ACCOUNTING_AMOUNT_CONFIG.locale, {
    minimumFractionDigits: ACCOUNTING_AMOUNT_CONFIG.minimumFractionDigits,
    maximumFractionDigits: ACCOUNTING_AMOUNT_CONFIG.maximumFractionDigits
});

export const AMOUNT_CURRENCY_CODE = ACCOUNTING_AMOUNT_CONFIG.currencyCode;
const amountCurrencySymbolFormatter = new Intl.NumberFormat(ACCOUNTING_AMOUNT_CONFIG.locale, {
    style: 'currency',
    currency: ACCOUNTING_AMOUNT_CONFIG.currencyCode,
    currencyDisplay: 'symbol',
    minimumFractionDigits: ACCOUNTING_AMOUNT_CONFIG.minimumFractionDigits,
    maximumFractionDigits: ACCOUNTING_AMOUNT_CONFIG.maximumFractionDigits
});

const resolveAmountCurrencySymbol = () => {
    const currencyPart = amountCurrencySymbolFormatter
        .formatToParts(0)
        .find((part) => part.type === 'currency')
        ?.value?.trim();
    return currencyPart || AMOUNT_CURRENCY_CODE;
};

const amountCurrencyIconByCode: Partial<Record<string, string>> = {
    INR: '₹',
    USD: 'pi-dollar',
    GBP: 'pi-pound',
    EUR: 'pi-euro'
};

export const AMOUNT_CURRENCY_SYMBOL = resolveAmountCurrencySymbol();
export const AMOUNT_CURRENCY_ICON = amountCurrencyIconByCode[AMOUNT_CURRENCY_CODE] ?? AMOUNT_CURRENCY_SYMBOL;
export const formatAmount = (value: number) => amountFormatter.format(value);
export const formatAmountWithCurrency = (value: number) => `${AMOUNT_CURRENCY_SYMBOL} ${formatAmount(value)}`;

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

export const buildMultiSelectFilterElement =
    <T extends string | number,>(
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

export const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
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
    ledgerCrDrDisplay: {
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

export const isEmptyFilterValue = (value: unknown): boolean => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).every(isEmptyFilterValue);
    }
    return false;
};

export const resolveFilterValue = (meta: ColumnFilterMeta | undefined): unknown => {
    if (!meta) return null;
    if (Array.isArray(meta.constraints)) {
        const constraint = meta.constraints[0];
        return constraint?.value ?? null;
    }
    return meta.value ?? null;
};

export const normalizeTextValue = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const makeKey = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const createDebitLine = (overrides: Partial<DebitLineDraft> = {}): DebitLineDraft => ({
    key: makeKey(),
    ledgerGroupId: null,
    ledgerId: null,
    ledgerOption: null,
    amount: null,
    label: null,
    ...overrides
});

export const resolveReportRange = (fiscalStart: Date | null, fiscalEnd: Date | null) => {
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

export const buildVoucherFormSchema = (range?: FiscalRange | null, refDateLabel?: string) =>
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
