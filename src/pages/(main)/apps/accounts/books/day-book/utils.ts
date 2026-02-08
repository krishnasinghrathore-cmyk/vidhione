import type { DataTableFilterMeta } from 'primereact/datatable';
import type { ColumnFilterMeta, FilterOption } from './types';

export const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

export const toDateText = (value: Date) => {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

export const formatDate = (iso: string | null) => {
    if (!iso) return '';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

export const buildDefaultFiscalRange = (baseDate = new Date()) => {
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

const isEmptyFilterValue = (value: unknown) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
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
    const unique = new Map<string, string>();
    values.forEach((value) => {
        if (!value) return;
        const label = formatDate(value);
        if (!label) return;
        unique.set(value, label);
    });
    return Array.from(unique.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, label]) => ({ label, value }));
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

export const serializeColumnFilters = (filters: DataTableFilterMeta) => {
    const cleaned: DataTableFilterMeta = {};
    Object.entries(filters).forEach(([field, meta]) => {
        if (!meta || field === 'global') return;
        const columnMeta = meta as ColumnFilterMeta;
        if (Array.isArray(columnMeta.constraints)) {
            const constraints = columnMeta.constraints.filter((constraint) => !isEmptyFilterValue(constraint.value));
            if (!constraints.length) return;
            cleaned[field] = {
                ...(columnMeta.operator ? { operator: columnMeta.operator } : {}),
                constraints
            };
            return;
        }
        if (isEmptyFilterValue(columnMeta.value)) return;
        cleaned[field] = {
            value: columnMeta.value,
            matchMode: columnMeta.matchMode
        };
    });

    return Object.keys(cleaned).length ? JSON.stringify(cleaned) : null;
};

const columnFilterLabels: Record<string, string> = {
    voucherNo: 'V. No.',
    date: 'Date',
    ledger: 'Ledger',
    narration: 'Narration',
    voucherType: 'Voucher Type',
    refNo: 'Ref. No.',
    refDate: 'Ref. Date',
    debit: 'Debit Amt',
    credit: 'Credit Amt',
    balance: 'Balance',
    drCr: 'Dr/Cr'
};

const formatNumberFilterValue = (value: unknown) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return value == null ? '' : String(value);
    return formatAmount(numeric);
};

const columnFilterFormatters: Record<string, (value: unknown) => string> = {
    date: (value) => formatDate(value == null ? null : String(value)),
    refDate: (value) => formatDate(value == null ? null : String(value)),
    debit: formatNumberFilterValue,
    credit: formatNumberFilterValue,
    balance: formatNumberFilterValue
};

const formatColumnFilterValue = (field: string, value: unknown): string => {
    if (value == null) return '';
    if (Array.isArray(value)) {
        return value
            .map((item) => formatColumnFilterValue(field, item))
            .filter(Boolean)
            .join(', ');
    }
    const formatter = columnFilterFormatters[field];
    if (formatter) return formatter(value);
    return String(value);
};

export const summarizeColumnFilters = (filters: DataTableFilterMeta) => {
    const parts: string[] = [];
    Object.entries(filters).forEach(([field, meta]) => {
        if (!meta || field === 'global') return;
        const columnMeta = meta as ColumnFilterMeta;
        const values: string[] = [];
        if (Array.isArray(columnMeta.constraints)) {
            columnMeta.constraints.forEach((constraint) => {
                if (isEmptyFilterValue(constraint.value)) return;
                const formatted = formatColumnFilterValue(field, constraint.value);
                if (formatted) values.push(formatted);
            });
        } else if (!isEmptyFilterValue(columnMeta.value)) {
            const formatted = formatColumnFilterValue(field, columnMeta.value);
            if (formatted) values.push(formatted);
        }
        if (!values.length) return;
        const label = columnFilterLabels[field] ?? field;
        parts.push(`${label}: ${values.join(', ')}`);
    });
    return parts.join('; ');
};
