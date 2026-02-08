import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import AppMultiSelect from '@/components/AppMultiSelect';
import type { EntryType, FilterOption, SelectOption, TrialBalanceViewMode } from './types';

export const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

export const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
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

export const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    ledgerGroupFilter: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    annexure: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    ledger: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    openingBalance: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    openingDrCr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    debitAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    creditAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    closingBalance: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    closingDrCr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    transferTo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

export const buildMultiSelectFilterElement =
    <T extends string | number,>(items: FilterOption<T>[], placeholder = 'All') =>
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

export const toDateText = (date: Date | null) => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDateLabel = (value: Date | null) => {
    if (!value) return '';
    return value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateRangeLabel = (from: Date | null, to: Date | null) => {
    const fromText = formatDateLabel(from);
    const toText = formatDateLabel(to);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
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
    const rangeMatch = trimmed.match(/(\d{4})\D+(\d{2,4})/);
    if (!rangeMatch) return null;
    const startYear = Number(rangeMatch[1]);
    const endText = rangeMatch[2];
    const endYear = endText.length === 2 ? Number(`${String(startYear).slice(0, 2)}${endText}`) : Number(endText);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
    if (startYear < 1900 || endYear < 1900) return null;
    return { startYear, endYear };
};

const buildDefaultFiscalRange = (baseDate = new Date()) => {
    const startYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
    const start = new Date(startYear, 3, 1);
    const end = new Date(startYear + 1, 2, 31);
    return { start, end };
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

export const resolveOptionLabel = (value: number | null, options: SelectOption[], fallback: string) => {
    if (value == null || value === 0) return 'All';
    const match = options.find((option) => Number(option.value) === Number(value));
    return match?.label ?? `${fallback} ${value}`;
};

export const resolveSignedAmount = (amount: number, drCr: string | null | undefined) =>
    drCr === 'Cr' ? -Math.abs(amount) : Math.abs(amount);

export const resolveDrCrFromSigned = (value: number) => (value >= 0 ? 'Dr' : 'Cr');

export const BALANCE_STATUS_OPTIONS = [
    { label: 'All', value: 0 },
    { label: 'Only Zero Balance', value: 1 },
    { label: 'Omit Zero Balance', value: 2 },
    { label: 'Annexure / Outstanding', value: 3 },
    { label: 'Annexure Print', value: 4 }
] as const;

export const ENTRY_TYPE_OPTIONS: Array<{ label: string; value: EntryType; voucherType: number; isTaxation: number }> = [
    { label: 'All', value: 'all', voucherType: -1, isTaxation: -1 },
    { label: 'Sales', value: 'sales', voucherType: 1, isTaxation: -1 },
    { label: 'Purchase', value: 'purchase', voucherType: 0, isTaxation: -1 },
    { label: 'Debit Note', value: 'debit', voucherType: 4, isTaxation: -1 },
    { label: 'Credit Note', value: 'credit', voucherType: 5, isTaxation: -1 },
    { label: 'Journal', value: 'journal', voucherType: -1, isTaxation: 1 }
];

export const TAX_TYPE_OPTIONS = [
    { label: 'ALL', value: -1 },
    { label: 'SGST', value: 6 },
    { label: 'CGST', value: 7 },
    { label: 'IGST', value: 8 },
    { label: 'UGST', value: 9 },
    { label: 'CST', value: 1 },
    { label: 'VAT', value: 0 },
    { label: 'TDS', value: 4 },
    { label: 'EXPORT', value: 10 },
    { label: 'RCM', value: 11 },
    { label: 'OTHER', value: 5 }
];

export const RCM_OPTIONS = [
    { label: 'All', value: -1 },
    { label: 'Applicable', value: 1 },
    { label: 'Not Applicable', value: 0 }
];

export const BALANCE_STATUS_DROPDOWN_OPTIONS = BALANCE_STATUS_OPTIONS.filter((option) => option.value !== 0);
export const ENTRY_TYPE_DROPDOWN_OPTIONS = ENTRY_TYPE_OPTIONS.filter((option) => option.value !== 'all');
export const TAX_TYPE_DROPDOWN_OPTIONS = TAX_TYPE_OPTIONS.filter((option) => option.value !== -1);
export const RCM_DROPDOWN_OPTIONS = RCM_OPTIONS.filter((option) => option.value !== -1);

export const DISPLAY_MODE_OPTIONS = [
    { label: 'Full Trial Balance', value: 'trial' },
    { label: 'Closing Balance Summary', value: 'summary' }
] as const;

export const viewOptionLabel = (value: TrialBalanceViewMode) => (value === 'summarized' ? 'Summarized' : 'Detailed');

export const filterOptions = (options: SelectOption[], query: string) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
};
