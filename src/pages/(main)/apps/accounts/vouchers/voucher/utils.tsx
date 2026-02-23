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
    PaymentMode,
    RecentlySavedVoucher
} from './types';

export const CASH_LEDGER_GROUP_TYPES = [6];
export const BANK_LEDGER_GROUP_TYPES = [1, 2, 3, 29];
export const CASH_IN_HAND_GROUP_TYPE = 6;
export const BANK_ACCOUNT_GROUP_TYPE = 1;
export const PAYMENT_VOUCHER_STORAGE_PREFIX = 'accounts.paymentVoucher';
export const PAYMENT_VOUCHER_MODE_STORAGE_KEY = `${PAYMENT_VOUCHER_STORAGE_PREFIX}.mode`;
export const PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_KEY = `${PAYMENT_VOUCHER_STORAGE_PREFIX}.recentSaved`;
export const PAYMENT_VOUCHER_RECENT_SAVED_LIMIT = 3;
export const PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_LIMIT = PAYMENT_VOUCHER_RECENT_SAVED_LIMIT * 4;

export const normalizePaymentMode = (value: string | null | undefined): PaymentMode | null => {
    if (value === 'cash' || value === 'bank' || value === 'deposit' || value === 'withdrawal' || value === 'transfer') {
        return value;
    }
    return null;
};

const resolveModeStorageKey = (storagePrefix?: string) =>
    storagePrefix?.trim() ? `${storagePrefix.trim()}.mode` : PAYMENT_VOUCHER_MODE_STORAGE_KEY;

const resolveRecentSavedStorageKey = (storagePrefix?: string) =>
    storagePrefix?.trim() ? `${storagePrefix.trim()}.recentSaved` : PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_KEY;

export const getStoredPaymentMode = (storagePrefix?: string): PaymentMode | null => {
    if (typeof window === 'undefined') return null;
    return normalizePaymentMode(window.localStorage.getItem(resolveModeStorageKey(storagePrefix)));
};

export const persistPaymentMode = (mode: PaymentMode, storagePrefix?: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(resolveModeStorageKey(storagePrefix), mode);
};

const isRecentlySavedVoucher = (value: unknown): value is RecentlySavedVoucher => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<RecentlySavedVoucher>;
    const voucherId = Number(candidate.voucherId);
    if (!Number.isFinite(voucherId) || voucherId <= 0) return false;
    if (typeof candidate.voucherNo !== 'string') return false;
    if (!normalizePaymentMode(candidate.mode ?? null)) return false;
    if (typeof candidate.savedAt !== 'string') return false;
    return Number.isFinite(new Date(candidate.savedAt).getTime());
};

export const getStoredRecentSavedVouchers = (storagePrefix?: string): RecentlySavedVoucher[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(resolveRecentSavedStorageKey(storagePrefix));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(isRecentlySavedVoucher)
            .slice(0, PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_LIMIT)
            .map((item) => ({
                ...item,
                voucherId: Number(item.voucherId),
                voucherNo: String(item.voucherNo || item.voucherId),
                mode: normalizePaymentMode(item.mode) ?? 'cash'
            }));
    } catch {
        return [];
    }
};

export const persistRecentSavedVouchers = (items: RecentlySavedVoucher[], storagePrefix?: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
        resolveRecentSavedStorageKey(storagePrefix),
        JSON.stringify(items.slice(0, PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_LIMIT))
    );
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

    const toValidDate = (yyyy: string, mm: string, dd: string) => {
        const year = Number(yyyy);
        const month = Number(mm);
        const day = Number(dd);
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        const candidate = new Date(year, month - 1, day);
        if (Number.isNaN(candidate.getTime())) return null;
        if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
            return null;
        }
        return candidate;
    };

    const dmy = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})(?:\D.*)?$/);
    if (dmy) {
        const [_, dd, mm, yyyy] = dmy;
        return toValidDate(yyyy, mm, dd);
    }
    const ymd = trimmed.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})(?:\D.*)?$/);
    if (ymd) {
        const [_, yyyy, mm, dd] = ymd;
        return toValidDate(yyyy, mm, dd);
    }
    const compact = trimmed.match(/^(\d{8})(?:\D.*)?$/);
    if (compact) {
        const digits = compact[1];
        const yearFirst = Number(digits.slice(0, 4));
        const yearLast = Number(digits.slice(4, 8));
        if (yearFirst >= 1900 && yearFirst <= 2200) {
            return toValidDate(digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8));
        }
        if (yearLast >= 1900 && yearLast <= 2200) {
            return toValidDate(digits.slice(4, 8), digits.slice(2, 4), digits.slice(0, 2));
        }
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
    managerSalesmanDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    bankBranchDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    fullPaidDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    totalDiscountDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    netAdjustedDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    diffAmtDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    chequeReturnStatusDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    chequeCancelChargesDisplay: {
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
    drCrFlag: 0,
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
    const monthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const minDate = range.start && monthStart < range.start ? range.start : monthStart;
    return { start: minDate, end: maxDate };
};

export const buildVoucherFormSchema = (range?: FiscalRange | null, refDateLabel?: string) =>
    z
        .object({
            voucherNo: z.string().trim().min(1, 'Voucher number is required.'),
            voucherDate: z.any(),
            postingDate: z.any(),
            refDate: z.any(),
            voucherTypeId: z.number().positive('Voucher type not found.'),
            cashLedgerId: z.number(),
            cashLedgerAmount: z.number({ invalid_type_error: 'Enter amount.' }),
            debitLines: z
                .array(
                    z.object({
                        ledgerId: z.number().positive('Select ledger.'),
                        amount: z.number().positive('Enter amount.')
                    })
                )
                .min(1, 'Add at least one line.'),
            isCashMode: z.boolean(),
            lineEntryLabel: z.string().default('ledger'),
            lineEntryDrCrLabel: z.enum(['Dr', 'Cr']).default('Dr'),
            requiresManager: z.boolean().default(false),
            managerLabel: z.string().default('manager'),
            managerId: z.number().nullable(),
            lineTotal: z.number()
        })
        .superRefine((data, ctx) => {
            const amountModeLabel = data.isCashMode ? 'Cash' : 'Bank';
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

            const cashBankLedgerId = Number(data.cashLedgerId || 0);
            if (!(cashBankLedgerId > 0)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['cashLedgerId'],
                    message: `Select ${amountModeLabel} ledger.`
                });
            }

            const headerAmount = Number(data.cashLedgerAmount || 0);
            if (!(headerAmount > 0)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['cashLedgerAmount'],
                    message: `Enter ${amountModeLabel} amount.`
                });
            }

            if (headerAmount > 0 && data.lineTotal > 0 && Math.abs(headerAmount - Number(data.lineTotal || 0)) > 0.01) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['cashLedgerAmount'],
                    message: `${amountModeLabel} amount should match total ${data.lineEntryLabel.toLowerCase()} lines.`
                });
            }

            if (data.requiresManager && !data.managerId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['managerId'],
                    message: `Select ${data.managerLabel.toLowerCase()}.`
                });
            }
        });
