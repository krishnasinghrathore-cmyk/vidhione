import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import AppMultiSelect from '@/components/AppMultiSelect';
import type {
    ColumnFilterMeta,
    FilterOption,
    ProfitLossLine,
    ProfitLossSide,
    ProfitLossSideFilters
} from './types';

export const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

export const EMPTY_SIDE_FILTERS: ProfitLossSideFilters = { particulars: [], amounts: [] };

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
    leftParticular: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    leftAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    rightParticular: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    rightAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
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
        />
    );

const resolveFilterValues = (filters: DataTableFilterMeta, field: string): unknown[] => {
    const meta = filters[field] as ColumnFilterMeta | undefined;
    if (!meta) return [];
    const normalize = (value: unknown) => {
        if (value == null) return [];
        return Array.isArray(value) ? value : [value];
    };
    if (Array.isArray(meta.constraints)) {
        return meta.constraints.flatMap((constraint) => normalize(constraint.value));
    }
    return normalize(meta.value);
};

const resolveTextFilterValues = (filters: DataTableFilterMeta, field: string): string[] =>
    resolveFilterValues(filters, field).flatMap((value) => {
        if (typeof value !== 'string') return [];
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    });

const resolveNumberFilterValues = (filters: DataTableFilterMeta, field: string): number[] =>
    resolveFilterValues(filters, field)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

const matchesAmountFilter = (amount: number, selections: number[]) =>
    selections.length === 0 || selections.some((value) => Math.abs(value - amount) < 0.005);

export const matchesSideFilters = (label: string, amount: number, filters: ProfitLossSideFilters) => {
    const { particulars, amounts } = filters;
    if (particulars.length) {
        const normalized = label.trim();
        if (!normalized || !particulars.includes(normalized)) return false;
    }
    if (amounts.length && !matchesAmountFilter(amount, amounts)) return false;
    return true;
};

export const resolveSideFilters = (
    filters: DataTableFilterMeta,
    prefix: 'left' | 'right'
): ProfitLossSideFilters => ({
    particulars: resolveTextFilterValues(filters, `${prefix}Particular`),
    amounts: resolveNumberFilterValues(filters, `${prefix}Amount`)
});

export const toDateText = (date: Date) => {
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

export const sumBySide = (lines: ProfitLossLine[], side: ProfitLossSide) =>
    lines.reduce((sum, line) => (line.side === side ? sum + Number(line.amount ?? 0) : sum), 0);
