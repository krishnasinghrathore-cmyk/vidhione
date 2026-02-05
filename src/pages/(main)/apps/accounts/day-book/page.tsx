'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Checkbox } from 'primereact/checkbox';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { gql, useApolloClient, useLazyQuery } from '@apollo/client';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppDateInput from '@/components/AppDateInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';

type SelectOption = {
    label: string;
    value: number;
    address?: string | null;
};

type DayBookRow = {
    rowKey: string;
    id: number;
    date: string | null;
    voucherNo: string | null;
    voucherType: string | null;
    voucherTypeId: number | null;
    ledger: string | null;
    narration: string | null;
    refNo: string | null;
    refDate: string | null;
    debit: number;
    credit: number;
    balance: number;
    drCr: string | null;
    isSkeleton?: boolean;
};

type DayBookFilters = {
    voucherTypeIds: number[];
    ledgerIds: number[];
    fromDate: Date | null;
    toDate: Date | null;
    cancelled: number;
    columnFilters: DataTableFilterMeta;
};

type DayBookFilterOptions = {
    voucherNo: string[];
    date: string[];
    ledger: string[];
    narration: string[];
    voucherType: string[];
    refNo: string[];
    refDate: string[];
    debit: number[];
    credit: number[];
    balance: number[];
    drCr: string[];
};

type LedgerOptionRow = {
    ledgerId: number;
    name: string | null;
    address?: string | null;
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

type LedgerFilterOption = FilterOption<string> & {
    address?: string | null;
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

const DAY_BOOK = gql`
    query DayBook(
        $voucherTypeIds: [Int!]
        $ledgerIds: [Int!]
        $fromDate: String
        $toDate: String
        $sortField: String
        $sortOrder: Int
        $limit: Int
        $offset: Int
        $cancelled: Int
        $columnFilters: String
        $includeFilterOptions: Boolean
    ) {
        dayBook(
            voucherTypeIds: $voucherTypeIds
            ledgerIds: $ledgerIds
            fromDate: $fromDate
            toDate: $toDate
            sortField: $sortField
            sortOrder: $sortOrder
            limit: $limit
            offset: $offset
            cancelled: $cancelled
            columnFilters: $columnFilters
            includeFilterOptions: $includeFilterOptions
        ) {
            items {
                id
                date
                voucherNo
                voucherType
                voucherTypeId
                ledger
                narration
                refNo
                refDate
                debit
                credit
                balance
                drCr
            }
            totalCount
            debitTotal
            creditTotal
            filterOptions {
                voucherNo
                date
                ledger
                narration
                voucherType
                refNo
                refDate
                debit
                credit
                balance
                drCr
            }
        }
    }
`;

const LEDGER_OPTIONS = gql`
    query LedgerOptions($search: String, $limit: Int) {
        ledgerOptions(search: $search, limit: $limit) {
            ledgerId
            name
            address
        }
    }
`;

const ALL_LEDGER_LIMIT = 10000;
const SEARCH_LEDGER_LIMIT = 200;
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

const toDateText = (value: Date) => {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDate = (iso: string | null) => {
    if (!iso) return '';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateLabel = (value: Date | null) => {
    if (!value) return '';
    return value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateRangeLabel = (from: Date | null, to: Date | null) => {
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

const normalizeSelectedIds = (values: number[] | null | undefined) => {
    if (!values) return [];
    const filtered = values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);
    return Array.from(new Set(filtered));
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

const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    voucherNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    date: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    ledger: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    narration: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    refNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    refDate: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    debit: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    credit: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    balance: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    drCr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

const isEmptyFilterValue = (value: unknown) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
};

const serializeColumnFilters = (filters: DataTableFilterMeta) => {
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

const summarizeColumnFilters = (filters: DataTableFilterMeta) => {
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

export default function AccountsDayBookPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();
    const apolloClient = useApolloClient();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [fromDate, setFromDate] = useState<Date | null>(new Date());
    const [toDate, setToDate] = useState<Date | null>(new Date());
    const [todayOnly, setTodayOnly] = useState(true);
    const [showCancelledOnly, setShowCancelledOnly] = useState(false);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [appliedFilters, setAppliedFilters] = useState<DayBookFilters | null>(null);
    const [filterOptions, setFilterOptions] = useState<DayBookFilterOptions | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const defaultSortField = 'date';
    const defaultSortOrder = 1;
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<number | null>(null);
    const hasApplied = Boolean(appliedFilters);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerOptionRow[]>([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ search: string; mode: 'all' | 'search' } | null>(null);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const statusInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'day-book-refresh';

    useEffect(() => {
        setPageTitle('Day Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const [loadLedgerOptions] = useLazyQuery(LEDGER_OPTIONS, { fetchPolicy: 'network-only' });
    const [loadDayBook, { data, loading, error }] = useLazyQuery(DAY_BOOK, { fetchPolicy: 'network-only' });

    useEffect(() => {
        const nextOptions = data?.dayBook?.filterOptions ?? null;
        if (!nextOptions) return;
        setFilterOptions(nextOptions);
    }, [data?.dayBook?.filterOptions]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const ledgerOptions = useMemo(() => {
        const options = new Map<number, SelectOption>();
        ledgerLookupRows.forEach((l) => {
            options.set(Number(l.ledgerId), {
                label: l.name ?? `Ledger ${l.ledgerId}`,
                value: Number(l.ledgerId),
                address: l.address ?? null
            });
        });
        return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [ledgerLookupRows]);

    const ledgerAddressMap = useMemo(() => {
        const map = new Map<string, string>();
        ledgerOptions.forEach((option) => {
            const name = option.label?.trim();
            const address = option.address?.trim();
            if (!name || !address) return;
            map.set(name.toLowerCase(), address);
        });
        return map;
    }, [ledgerOptions]);

    const rawRows = useMemo(() => (hasApplied ? data?.dayBook?.items ?? [] : []), [data, hasApplied]);
    const displayRows = useMemo(
        () =>
            rawRows.map((row: DayBookRow) => ({
                ...row,
                rowKey: String(row.id)
            })),
        [rawRows]
    );

    const voucherNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.voucherNo ?? displayRows.map((row) => row.voucherNo)),
        [filterOptions, displayRows]
    );
    const dateFilterOptions = useMemo(
        () => buildDateFilterOptions(filterOptions?.date ?? displayRows.map((row) => row.date)),
        [filterOptions, displayRows]
    );
    const ledgerFilterOptions = useMemo<LedgerFilterOption[]>(() => {
        const base = buildTextFilterOptions(filterOptions?.ledger ?? displayRows.map((row) => row.ledger));
        return base.map((option) => ({
            ...option,
            address: ledgerAddressMap.get(option.value.trim().toLowerCase()) ?? null
        }));
    }, [filterOptions, displayRows, ledgerAddressMap]);
    const narrationFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.narration ?? displayRows.map((row) => row.narration)),
        [filterOptions, displayRows]
    );
    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.voucherType ?? displayRows.map((row) => row.voucherType)),
        [filterOptions, displayRows]
    );
    const refNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.refNo ?? displayRows.map((row) => row.refNo)),
        [filterOptions, displayRows]
    );
    const refDateFilterOptions = useMemo(
        () => buildDateFilterOptions(filterOptions?.refDate ?? displayRows.map((row) => row.refDate)),
        [filterOptions, displayRows]
    );
    const debitFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterOptions?.debit ?? displayRows.map((row) => row.debit)),
        [filterOptions, displayRows]
    );
    const creditFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterOptions?.credit ?? displayRows.map((row) => row.credit)),
        [filterOptions, displayRows]
    );
    const balanceFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterOptions?.balance ?? displayRows.map((row) => row.balance)),
        [filterOptions, displayRows]
    );
    const drCrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.drCr ?? displayRows.map((row) => row.drCr)),
        [filterOptions, displayRows]
    );

    const voucherNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherNoFilterOptions),
        [voucherNoFilterOptions]
    );
    const dateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(dateFilterOptions),
        [dateFilterOptions]
    );
    const ledgerFilterTemplate = useMemo(
        () => (options: ColumnFilterElementTemplateOptions) => (
            <AppMultiSelect
                value={(options.value ?? []) as string[]}
                options={ledgerFilterOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(event) => options.filterCallback(event.value)}
                filter
                filterInputAutoFocus
                showSelectAll
                placeholder="Any"
                className="p-column-filter"
                display="comma"
                maxSelectedLabels={1}
                emptyMessage={ledgerFilterOptions.length ? 'No values found' : 'No values'}
                emptyFilterMessage="No results found"
                disabled={ledgerFilterOptions.length === 0}
                style={{ minWidth: '20rem' }}
                itemTemplate={(option: LedgerFilterOption) => {
                    const address = option.address?.trim();
                    return (
                        <div className="flex flex-column">
                            <span className="font-medium">{option.label}</span>
                            {address && <small className="text-600">{address}</small>}
                        </div>
                    );
                }}
            />
        ),
        [ledgerFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions),
        [narrationFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions),
        [voucherTypeFilterOptions]
    );
    const refNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(refNoFilterOptions),
        [refNoFilterOptions]
    );
    const refDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(refDateFilterOptions),
        [refDateFilterOptions]
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
    const drCrFilterElement = useMemo(
        () => buildMultiSelectFilterElement(drCrFilterOptions),
        [drCrFilterOptions]
    );

    const reportLoading = Boolean(hasApplied && loading);
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(Math.min(rowsPerPage, 10), (idx) => ({
                rowKey: `skeleton-${idx}`,
                id: -1,
                date: null,
                voucherNo: null,
                voucherType: null,
                voucherTypeId: null,
                ledger: null,
                narration: null,
                refNo: null,
                refDate: null,
                debit: 0,
                credit: 0,
                balance: 0,
                drCr: null,
                isSkeleton: true
            })),
        [rowsPerPage]
    );

    const totalRecords = hasApplied ? data?.dayBook?.totalCount ?? 0 : 0;
    const debitTotal = hasApplied ? data?.dayBook?.debitTotal ?? 0 : 0;
    const creditTotal = hasApplied ? data?.dayBook?.creditTotal ?? 0 : 0;

    const fetchAllDayBookRows = useCallback(async () => {
        if (!appliedFilters) return displayRows;
        if (totalRecords <= displayRows.length) return displayRows;
        const querySort = resolveQuerySort();
        try {
            const { data: fullData } = await apolloClient.query({
                query: DAY_BOOK,
                fetchPolicy: 'network-only',
                variables: {
                    voucherTypeIds: appliedFilters.voucherTypeIds.length ? appliedFilters.voucherTypeIds : null,
                    ledgerIds: appliedFilters.ledgerIds.length ? appliedFilters.ledgerIds : null,
                    fromDate: appliedFilters.fromDate ? toDateText(appliedFilters.fromDate) : null,
                    toDate: appliedFilters.toDate ? toDateText(appliedFilters.toDate) : null,
                    cancelled: appliedFilters.cancelled,
                    sortField: querySort.sortField,
                    sortOrder: querySort.sortOrder,
                    limit: totalRecords,
                    offset: 0,
                    columnFilters: serializeColumnFilters(appliedFilters.columnFilters),
                    includeFilterOptions: false
                }
            });
            const rows = (fullData?.dayBook?.items ?? []) as DayBookRow[];
            return rows.map((row) => ({ ...row, rowKey: String(row.id) }));
        } catch {
            return displayRows;
        }
    }, [apolloClient, appliedFilters, displayRows, totalRecords, sortField, sortOrder]);

    const { isPrinting, printRows, triggerPrint } = useReportPrint<DayBookRow>({
        rows: displayRows,
        getPrintRows: fetchAllDayBookRows
    });

    const tableRows = isPrinting && printRows ? printRows : reportLoading ? skeletonRows : displayRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
        setFilterOptions(null);
    };

    const fetchLedgers = async (args?: { search?: string | null; mode?: 'all' | 'search' }) => {
        const trimmed = args?.search?.trim() ?? '';
        const mode = args?.mode ?? 'search';
        const lastFetch = ledgerLastFetchRef.current;

        if (!trimmed && mode !== 'all') {
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
            ledgerLookupRows.length > 0
        ) {
            setLedgerLookupRows((prev) => (prev.length ? [...prev] : prev));
            setIsLedgerLoading(false);
            return;
        }

        const requestId = ++ledgerRequestRef.current;
        const limit = mode === 'all' && trimmed.length === 0 ? ALL_LEDGER_LIMIT : SEARCH_LEDGER_LIMIT;
        setIsLedgerLoading(true);
        try {
            const result = await loadLedgerOptions({
                variables: {
                    search: trimmed ? trimmed : null,
                    limit
                }
            });
            if (ledgerRequestRef.current !== requestId) return;
            const items = result.data?.ledgerOptions ?? [];
            setLedgerLookupRows(Array.isArray(items) ? [...(items as LedgerOptionRow[])] : []);
            ledgerLastFetchRef.current = { search: trimmed, mode };
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

    useEffect(() => {
        if (!hasApplied) return;
        if (isLedgerLoading) return;
        if (ledgerLookupRows.length > 0) return;
        const lastFetch = ledgerLastFetchRef.current;
        if (lastFetch?.mode === 'all' && lastFetch.search === '') return;
        void fetchLedgers({ mode: 'all' });
    }, [hasApplied, isLedgerLoading, ledgerLookupRows.length]);

    const focusStatusInput = () => {
        const input = statusInputRef.current;
        if (input) input.focus();
    };

    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) {
            element.focus();
        }
    };

    const handleCheckboxEnter = (next: () => void) => (event: React.KeyboardEvent<HTMLInputElement>) => {
        const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter' || event.which === 13;
        if (!isEnter) return;
        event.preventDefault();
        event.stopPropagation();
        next();
    };

    const handleTodayToggle = (nextValue: boolean) => {
        clearAppliedFilters();
        setDateErrors({});
        setTodayOnly(nextValue);
        if (nextValue) {
            const today = new Date();
            setFromDate(today);
            setToDate(today);
            return;
        }
        const fallback = fiscalRange ?? buildDefaultFiscalRange();
        setFromDate(fallback.start ?? null);
        setToDate(fallback.end ?? new Date());
    };

    const buildAppliedFilters = (nextColumnFilters: DataTableFilterMeta): DayBookFilters => ({
        voucherTypeIds: [],
        ledgerIds: [],
        fromDate,
        toDate,
        cancelled: showCancelledOnly ? 1 : 0,
        columnFilters: nextColumnFilters
    });

    const resolveQuerySort = (overrides?: { sortField?: string | null; sortOrder?: number | null }) => {
        const hasFieldOverride = Object.prototype.hasOwnProperty.call(overrides ?? {}, 'sortField');
        const hasOrderOverride = Object.prototype.hasOwnProperty.call(overrides ?? {}, 'sortOrder');
        const nextField = hasFieldOverride ? overrides?.sortField ?? null : sortField;
        const nextOrder = hasOrderOverride ? overrides?.sortOrder ?? null : sortOrder;
        if (nextField) {
            return { sortField: nextField, sortOrder: nextOrder ?? defaultSortOrder };
        }
        return { sortField: defaultSortField, sortOrder: defaultSortOrder };
    };

    const applyFilters = (
        nextColumnFilters: DataTableFilterMeta,
        includeFilterOptions = true,
        sortOverrides?: { sortField?: string | null; sortOrder?: number | null }
    ) => {
        if (!fromDate || !toDate) return;
        const nextFilters = buildAppliedFilters(nextColumnFilters);
        const querySort = resolveQuerySort(sortOverrides);
        setAppliedFilters(nextFilters);
        setFirst(0);
        setLastRefreshedAt(new Date());
        loadDayBook({
            variables: {
                voucherTypeIds: nextFilters.voucherTypeIds.length ? nextFilters.voucherTypeIds : null,
                ledgerIds: nextFilters.ledgerIds.length ? nextFilters.ledgerIds : null,
                fromDate: toDateText(fromDate),
                toDate: toDateText(toDate),
                cancelled: nextFilters.cancelled,
                sortField: querySort.sortField,
                sortOrder: querySort.sortOrder,
                limit: rowsPerPage,
                offset: 0,
                columnFilters: serializeColumnFilters(nextFilters.columnFilters),
                includeFilterOptions
            }
        });
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const clearedFilters = buildDefaultColumnFilters();
        setColumnFilters(clearedFilters);
        setSortField(null);
        setSortOrder(null);
        applyFilters(clearedFilters, true, { sortField: null, sortOrder: null });
    };

    const handlePageChange = (event: { first: number; rows: number }) => {
        setRowsPerPage(event.rows);
        setFirst(event.first);
        if (!appliedFilters) return;
        const querySort = resolveQuerySort();
        loadDayBook({
            variables: {
                voucherTypeIds: appliedFilters.voucherTypeIds.length ? appliedFilters.voucherTypeIds : null,
                ledgerIds: appliedFilters.ledgerIds.length ? appliedFilters.ledgerIds : null,
                fromDate: appliedFilters.fromDate ? toDateText(appliedFilters.fromDate) : null,
                toDate: appliedFilters.toDate ? toDateText(appliedFilters.toDate) : null,
                cancelled: appliedFilters.cancelled,
                sortField: querySort.sortField,
                sortOrder: querySort.sortOrder,
                limit: event.rows,
                offset: event.first,
                columnFilters: serializeColumnFilters(appliedFilters.columnFilters),
                includeFilterOptions: false
            }
        });
    };

    const handleSort = (event: { sortField?: string; sortOrder?: number }) => {
        const nextField = typeof event.sortField === 'string' ? event.sortField : null;
        const nextOrder = event.sortOrder === -1 ? -1 : event.sortOrder === 1 ? 1 : null;
        setSortField(nextField);
        setSortOrder(nextOrder);
        setFirst(0);
        if (!appliedFilters) return;
        const querySort = resolveQuerySort({ sortField: nextField, sortOrder: nextOrder });
        loadDayBook({
            variables: {
                voucherTypeIds: appliedFilters.voucherTypeIds.length ? appliedFilters.voucherTypeIds : null,
                ledgerIds: appliedFilters.ledgerIds.length ? appliedFilters.ledgerIds : null,
                fromDate: appliedFilters.fromDate ? toDateText(appliedFilters.fromDate) : null,
                toDate: appliedFilters.toDate ? toDateText(appliedFilters.toDate) : null,
                cancelled: appliedFilters.cancelled,
                sortField: querySort.sortField,
                sortOrder: querySort.sortOrder,
                limit: rowsPerPage,
                offset: 0,
                columnFilters: serializeColumnFilters(appliedFilters.columnFilters),
                includeFilterOptions: false
            }
        });
    };

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
        applyFilters(event.filters, false);
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Day Book (${reportPeriod})` : 'Day Book';
    const printFooterLeft = useMemo(() => {
        const parts: string[] = [];
        if (lastRefreshedAt) {
            parts.push(`Refreshed: ${formatReportTimestamp(lastRefreshedAt)}`);
        }
        if (reportPeriod) {
            parts.push(`Period: ${reportPeriod}`);
        }
        return parts.length ? parts.join(' | ') : undefined;
    }, [lastRefreshedAt, reportPeriod]);
    const filterSummary = useMemo(() => {
        if (!appliedFilters) return null;
        const parts: string[] = [];
        if (appliedFilters.cancelled === 1) {
            parts.push('Status: Cancelled only');
        }
        const columnSummary = summarizeColumnFilters(appliedFilters.columnFilters);
        if (columnSummary) parts.push(`Column Filters: ${columnSummary}`);
        return parts.join(' | ');
    }, [appliedFilters]);

    const exportColumns = useMemo<ReportExportColumn<DayBookRow>[]>(
        () => [
            { header: 'V. No.', value: (row) => row.voucherNo ?? '' },
            { header: 'Date', value: (row) => formatDate(row.date) },
            { header: 'Ledger', value: (row) => row.ledger ?? '' },
            { header: 'Narration', value: (row) => row.narration ?? '' },
            { header: 'Voucher Type', value: (row) => row.voucherType ?? '' },
            { header: 'Ref. No.', value: (row) => row.refNo ?? '' },
            { header: 'Ref. Date', value: (row) => formatDate(row.refDate) },
            { header: 'Debit Amt', value: (row) => (row.debit ? Number(row.debit).toFixed(2) : '') },
            { header: 'Credit Amt', value: (row) => (row.credit ? Number(row.credit).toFixed(2) : '') },
            { header: 'Balance', value: (row) => (row.balance ? Number(row.balance).toFixed(2) : '') },
            { header: 'Dr/Cr', value: (row) => row.drCr ?? '' }
        ],
        []
    );
    const exportFileName = `day-book_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
    const exportContextBase = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [exportColumns, exportFileName, filterSummary, reportTitle, companyInfo.name, companyInfo.address, printFooterLeft]
    );

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const buildExportRows = useCallback(async () => {
        const rows = await fetchAllDayBookRows();
        return rows.filter((row) => !row.isSkeleton);
    }, [fetchAllDayBookRows]);

    const handleExportCsv = async () => {
        const rows = await buildExportRows();
        exportReportCsv({ ...exportContextBase, rows });
    };
    const handleExportExcel = async () => {
        const rows = await buildExportRows();
        await exportReportExcel({ ...exportContextBase, rows });
    };
    const handleExportPdf = async () => {
        const rows = await buildExportRows();
        exportReportPdf({ ...exportContextBase, rows });
    };

    const canRefresh = Boolean(fromDate && toDate);
    const voucherNoBody = (row: DayBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : row.voucherNo ?? '');
    const dateBody = (row: DayBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatDate(row.date));
    const ledgerBody = (row: DayBookRow) => {
        if (isSkeletonRow(row)) return skeletonCell('7rem');
        const ledgerName = row.ledger ?? '';
        const address = ledgerName ? ledgerAddressMap.get(ledgerName.trim().toLowerCase()) ?? null : null;
        if (!ledgerName) return '';
        if (!address) return ledgerName;
        return (
            <div className="flex flex-column">
                <span>{ledgerName}</span>
                <small className="text-600">{address}</small>
            </div>
        );
    };
    const narrationBody = (row: DayBookRow) => (isSkeletonRow(row) ? skeletonCell('10rem') : row.narration ?? '');
    const voucherTypeBody = (row: DayBookRow) => (isSkeletonRow(row) ? skeletonCell('6rem') : row.voucherType ?? '');
    const refNoBody = (row: DayBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : row.refNo ?? '');
    const refDateBody = (row: DayBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatDate(row.refDate));
    const debitBody = (row: DayBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.debit ? formatAmount(row.debit) : '';
    const creditBody = (row: DayBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.credit ? formatAmount(row.credit) : '';
    const balanceBody = (row: DayBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.balance ? formatAmount(row.balance) : '';
    const drCrBody = (row: DayBookRow) => (isSkeletonRow(row) ? skeletonCell('2.5rem') : row.drCr ?? '');

    const debitFooter = reportLoading ? skeletonCell('3rem') : formatAmount(debitTotal);
    const creditFooter = reportLoading ? skeletonCell('3rem') : formatAmount(creditTotal);

    return (
        <div className="card app-gradient-card">
            <ReportPrintHeader
                className="mb-3"
                companyName={companyInfo.name}
                companyAddress={companyInfo.address}
                title={reportTitle}
                subtitle={filterSummary ?? undefined}
            />
            <ReportPrintFooter left={printFooterLeft} />
            <div className="flex flex-column gap-2 mb-3 report-screen-header">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Day Book</h2>
                        <p className="mt-2 mb-0 text-600">Daily voucher register matching legacy Day Book columns and totals.</p>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading day book: {error.message}</p>}
            </div>

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 20, 50, 100]}
                totalRecords={hasApplied ? totalRecords : 0}
                lazy={!isPrinting}
                first={isPrinting ? 0 : first}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                sortField={sortField ?? undefined}
                sortOrder={sortField ? sortOrder : undefined}
                onSort={handleSort}
                onPage={handlePageChange}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                dataKey="rowKey"
                stripedRows
                size="small"
                loading={false}
                className="summary-table day-book-table"
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load day book'}
                headerLeft={
                    <div className="flex flex-column gap-2 w-full">
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppDateInput
                                value={fromDate}
                                onChange={(value) => {
                                    setFromDate(value);
                                    clearAppliedFilters();
                                    setDateErrors({});
                                }}
                                placeholder="From date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                autoFocus
                                selectOnFocus
                                inputId="day-book-from-date"
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <AppDateInput
                                value={toDate}
                                onChange={(value) => {
                                    setToDate(value);
                                    clearAppliedFilters();
                                    setDateErrors({});
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputId="day-book-to-date"
                                inputRef={toDateInputRef}
                                onEnterNext={() => todayInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="day-book-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(e) => handleTodayToggle(Boolean(e.checked))}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(focusStatusInput)
                                        }
                                    }}
                                />
                                <label htmlFor="day-book-today">Today</label>
                            </div>
                            {(dateErrors.fromDate || dateErrors.toDate) && (
                                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                            )}
                        </div>
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="day-book-cancelled-only"
                                    inputRef={statusInputRef}
                                    checked={showCancelledOnly}
                                    onChange={(e) => {
                                        setShowCancelledOnly(Boolean(e.checked));
                                        clearAppliedFilters();
                                    }}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(focusRefreshButton)
                                        }
                                    }}
                                />
                                <label htmlFor="day-book-cancelled-only">Cancelled only</label>
                            </div>
                        </div>
                    </div>
                }
                headerRight={
                    <AppReportActions
                        onRefresh={handleRefresh}
                        onPrint={handlePrintClick}
                        onExportCsv={handleExportCsv}
                        onExportExcel={handleExportExcel}
                        onExportPdf={handleExportPdf}
                        refreshDisabled={!canRefresh}
                        printDisabled={!hasApplied || reportLoading || totalRecords === 0}
                        exportDisabled={!hasApplied || reportLoading || totalRecords === 0}
                        refreshButtonId={refreshButtonId}
                    />
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading day book...'
                            : `${totalRecords} voucher${totalRecords === 1 ? '' : 's'}`
                        : 'Press Refresh to load day book'
                }
            >
                <Column
                    field="voucherNo"
                    header="V. No."
                    body={voucherNoBody}
                    style={{ width: '7rem' }}
                    filterElement={voucherNoFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="date"
                    header="Date"
                    body={dateBody}
                    style={{ width: '7rem' }}
                    dataType="date"
                    filterElement={dateFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="ledger"
                    header="Ledger"
                    body={ledgerBody}
                    style={{ width: '14rem' }}
                    filterElement={ledgerFilterTemplate}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="narration"
                    header="Narration"
                    body={narrationBody}
                    filterElement={narrationFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherType"
                    header="Voucher Type"
                    body={voucherTypeBody}
                    style={{ width: '9rem' }}
                    filterElement={voucherTypeFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="refNo"
                    header="Ref. No."
                    body={refNoBody}
                    style={{ width: '8rem' }}
                    filterElement={refNoFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="refDate"
                    header="Ref. Date"
                    body={refDateBody}
                    style={{ width: '8rem' }}
                    dataType="date"
                    filterElement={refDateFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="debit"
                    header="Debit Amt"
                    body={debitBody}
                    style={{ width: '8rem' }}
                    dataType="numeric"
                    filterElement={debitFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    footer={debitFooter}
                    footerStyle={{ fontWeight: 600 }}
                />
                <Column
                    field="credit"
                    header="Credit Amt"
                    body={creditBody}
                    style={{ width: '8rem' }}
                    dataType="numeric"
                    filterElement={creditFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    footer={creditFooter}
                    footerStyle={{ fontWeight: 600 }}
                />
                <Column
                    field="balance"
                    header="Balance"
                    body={balanceBody}
                    style={{ width: '8rem' }}
                    dataType="numeric"
                    filterElement={balanceFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                />
                <Column
                    field="drCr"
                    header="Dr/Cr"
                    body={drCrBody}
                    style={{ width: '5rem' }}
                    filterElement={drCrFilterElement}
                    sortable
                    {...MULTISELECT_COLUMN_PROPS}
                />
            </ReportDataTable>
        </div>
    );
}
