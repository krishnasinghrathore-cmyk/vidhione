'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { Tag } from 'primereact/tag';
import type { MultiSelect } from 'primereact/multiselect';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppDateInput from '@/components/AppDateInput';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import AppReportActions from '@/components/AppReportActions';
import AppMultiSelect from '@/components/AppMultiSelect';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';

interface AreaRow {
    areaId: number;
    name: string | null;
}

interface AreaOption {
    label: string;
    value: number;
}

interface LedgerSummaryRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    address: string | null;
}

interface LedgerOption extends LedgerSummaryRow {
    label: string;
    value: number;
}

interface InvoiceRolloverRow {
    rowKey: string;
    ledgerId: number | null;
    ledgerName: string | null;
    ledgerGroupId: number | null;
    ledgerGroupName: string | null;
    invoiceId: number | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    voucherTypeId: number | null;
    voucherType: string | null;
    agLedger: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    difference: number | null;
    receiptDate: string | null;
    receiptType: string | null;
    receiptVoucherNo: string | null;
    receiptAmount: number | null;
    totalPaid: number | null;
    isReceiptRow: boolean;
    isSkeleton?: boolean;
}

type InvoiceRolloverFilters = {
    ledgerIds: number[] | null;
    areaIds: number[] | null;
    fromDate: string | null;
    toDate: string | null;
    removeZeroLines: number;
};

type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

const AREAS = gql`
    query Areas($search: String, $limit: Int) {
        areas(search: $search, limit: $limit) {
            areaId
            name
        }
    }
`;

const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $areaIds: [Int!]) {
        ledgerSummaries(
            search: $search
            areaIds: $areaIds
            limit: $limit
            offset: 0
            sortField: "name"
            sortOrder: 1
        ) {
            items {
                ledgerId
                name
                groupName
                address
            }
        }
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

const INVOICE_ROLLOVER = gql`
    query InvoiceRollover(
        $ledgerIds: [Int!]
        $areaIds: [Int!]
        $fromDate: String
        $toDate: String
        $removeZeroLines: Int
    ) {
        invoiceRollover(
            ledgerIds: $ledgerIds
            areaIds: $areaIds
            fromDate: $fromDate
            toDate: $toDate
            removeZeroLines: $removeZeroLines
        ) {
            items {
                rowKey
                ledgerId
                ledgerName
                ledgerGroupId
                ledgerGroupName
                invoiceId
                invoiceNumber
                invoiceDate
                voucherTypeId
                voucherType
                agLedger
                narration
                debit
                credit
                difference
                receiptDate
                receiptType
                receiptVoucherNo
                receiptAmount
                totalPaid
                isReceiptRow
            }
            totalCount
            invoiceTotal
            appliedTotal
            differenceTotal
        }
    }
`;

const AREA_FETCH_LIMIT = 200;
const LEDGER_FETCH_LIMIT = 200;
const FILTER_DEBOUNCE_MS = 250;
const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
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
    ledgerName: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    invoiceDate: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    invoiceNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    agLedger: {
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
    difference: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptDate: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptVoucherNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    totalPaid: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

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

const resolveYear = (yearText: string) => {
    const numeric = Number(yearText);
    if (!Number.isFinite(numeric)) return null;
    if (yearText.length === 2) return 2000 + numeric;
    return numeric;
};

const parseDateFromParts = (yearText: string, monthText: string, dayText: string) => {
    const year = resolveYear(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (year < 1900 || year > 2200) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const candidate = new Date(year, month - 1, day);
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
        return null;
    }
    return candidate;
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

const formatDateLabel = (value: string | null) => {
    if (!value) return '';
    const parsed = parseDateText(value);
    if (!parsed) return value;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateRangeLabel = (from: string | null, to: string | null) => {
    const fromText = formatDateLabel(from);
    const toText = formatDateLabel(to);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
};

const resolveOptionLabels = (
    ids: number[] | null,
    options: Array<{ value: number; label: string }>,
    fallback: string
) => {
    if (!ids || ids.length === 0) return 'All';
    const map = new Map<number, string>();
    options.forEach((option) => {
        map.set(Number(option.value), option.label);
    });
    return ids.map((id) => map.get(id) ?? `${fallback} ${id}`).join(', ');
};

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

export default function InvoiceRolloverPage() {
    const { companyContext } = useAuth();
    const { setPageTitle } = useContext(LayoutContext);
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [areaIds, setAreaIds] = useState<number[]>([]);
    const [ledgerIds, setLedgerIds] = useState<number[]>([]);
    const [appliedFilters, setAppliedFilters] = useState<InvoiceRolloverFilters | null>(null);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());

    useEffect(() => {
        setPageTitle('Invoice Rollover');
        return () => setPageTitle(null);
    }, [setPageTitle]);
    const [areaLookupRows, setAreaLookupRows] = useState<AreaRow[]>([]);
    const [selectedAreaOptions, setSelectedAreaOptions] = useState<AreaOption[]>([]);
    const [isAreaLoading, setIsAreaLoading] = useState(false);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerSummaryRow[]>([]);
    const [selectedLedgerOptions, setSelectedLedgerOptions] = useState<LedgerOption[]>([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const initialRangeRef = useRef<ReturnType<typeof resolveFiscalRange> | null>(null);
    if (!initialRangeRef.current) {
        initialRangeRef.current = resolveFiscalRange(
            companyContext?.fiscalYearStart ?? null,
            companyContext?.fiscalYearEnd ?? null
        );
    }
    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current?.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current?.end ?? null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const hasTouchedDatesRef = useRef(false);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const areaInputRef = useRef<MultiSelect>(null);
    const areaRequestRef = useRef(0);
    const areaLastFetchRef = useRef<{ search: string | null; mode: 'all' | 'search' } | null>(null);
    const areaFilterValueRef = useRef('');
    const areaFilterTimerRef = useRef<number | null>(null);
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ search: string | null; mode: 'all' | 'search'; areaKey: string } | null>(
        null
    );
    const ledgerFilterValueRef = useRef('');
    const ledgerFilterTimerRef = useRef<number | null>(null);

    const [loadAreas] = useLazyQuery(AREAS, { fetchPolicy: 'network-only' });
    const [loadLedgerLookup] = useLazyQuery(LEDGER_LOOKUP, { fetchPolicy: 'network-only' });

    const areaOptions = useMemo<AreaOption[]>(() => {
        const options = new Map<number, AreaOption>();
        selectedAreaOptions.forEach((option) => {
            options.set(Number(option.value), option);
        });
        areaLookupRows.forEach((row) => {
            options.set(Number(row.areaId), {
                label: row.name ?? `Area ${row.areaId}`,
                value: Number(row.areaId)
            });
        });
        return Array.from(options.values()).sort((a, b) =>
            a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
        );
    }, [areaLookupRows, selectedAreaOptions]);

    const ledgerOptions = useMemo<LedgerOption[]>(() => {
        const options = new Map<number, LedgerOption>();
        selectedLedgerOptions.forEach((option) => {
            options.set(Number(option.value), option);
        });
        ledgerLookupRows.forEach((row) => {
            const label =
                `${row.name ?? ''}${row.groupName ? ` (${row.groupName})` : ''}`.trim() ||
                `Ledger ${row.ledgerId}`;
            options.set(Number(row.ledgerId), {
                ...row,
                label,
                value: Number(row.ledgerId)
            });
        });
        return Array.from(options.values()).sort((a, b) =>
            a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
        );
    }, [ledgerLookupRows, selectedLedgerOptions]);

    const selectedLedger = useMemo(() => {
        if (ledgerIds.length !== 1) return null;
        const ledgerId = ledgerIds[0];
        return ledgerOptions.find((l) => Number(l.value) === Number(ledgerId)) ?? null;
    }, [ledgerIds, ledgerOptions]);

    const balanceToDateText = useMemo(() => toDateText(new Date()), []);
    const { data: balanceData, loading: balanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: ledgerIds.length !== 1,
        variables: {
            ledgerId: ledgerIds.length === 1 ? ledgerIds[0] : 0,
            toDate: balanceToDateText
        }
    });

    const currentBalanceLabel = useMemo(() => {
        if (ledgerIds.length !== 1) return null;
        if (balanceLoading) return 'Loading...';
        const balance = balanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [balanceData, balanceLoading, ledgerIds.length]);

    const currentBalanceSeverity = useMemo(() => {
        if (balanceLoading) return 'warning';
        const drCr = balanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'danger' : 'success';
    }, [balanceData, balanceLoading]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const initialRange = useMemo(() => {
        const start = fiscalRange?.start ?? null;
        const end = fiscalRange?.end ?? null;
        if (!start && !end) return null;
        const today = new Date();
        let nextToDate = end;
        if (start && end && today >= start && today <= end) {
            nextToDate = today;
        } else if (!end) {
            nextToDate = today;
        }
        return [start ?? null, nextToDate ?? null] as [Date | null, Date | null];
    }, [fiscalRange]);

    const fiscalYearStartDate = fiscalRange?.start ?? null;
    const fiscalYearEndDate = fiscalRange?.end ?? null;

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        if (!initialRange) return;
        setFromDate(initialRange[0] ?? null);
        setToDate(initialRange[1] ?? null);
    }, [initialRange]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const timer = window.setTimeout(() => {
            const input = fromDateInputRef.current;
            if (!input) return;
            const active = document.activeElement;
            if (active && active !== document.body && active !== document.documentElement) return;
            try {
                input.focus({ preventScroll: true });
            } catch {
                input.focus();
            }
        }, 50);
        return () => window.clearTimeout(timer);
    }, []);

    const focusAreaInput = () => {
        const control = areaInputRef.current;
        if (!control) return;
        if (typeof control.focus === 'function') {
            control.focus();
            return;
        }
        const element = control.getElement?.();
        if (element instanceof HTMLElement) {
            element.focus();
        }
    };

    useEffect(() => {
        return () => {
            if (typeof window === 'undefined') return;
            if (areaFilterTimerRef.current) window.clearTimeout(areaFilterTimerRef.current);
            if (ledgerFilterTimerRef.current) window.clearTimeout(ledgerFilterTimerRef.current);
        };
    }, []);

    const fetchAreas = useCallback(
        async (args?: { search?: string | null; mode?: 'all' | 'search' }) => {
            const trimmed = args?.search?.trim() ?? '';
            const mode = args?.mode ?? 'search';
            const search = trimmed.length ? trimmed : null;
            const lastFetch = areaLastFetchRef.current;

            if (!search && mode !== 'all') {
                setAreaLookupRows([]);
                areaLastFetchRef.current = { search: null, mode };
                return;
            }
            if (lastFetch && lastFetch.search === search && lastFetch.mode === mode) {
                return;
            }

            const requestId = ++areaRequestRef.current;
            setIsAreaLoading(true);
            try {
                const result = await loadAreas({
                    variables: { search, limit: AREA_FETCH_LIMIT }
                });
                if (areaRequestRef.current !== requestId) return;
                const rows = (result.data?.areas ?? []) as AreaRow[];
                setAreaLookupRows(Array.isArray(rows) ? [...rows] : []);
                areaLastFetchRef.current = { search, mode };
            } catch {
                if (areaRequestRef.current === requestId) {
                    setAreaLookupRows([]);
                }
            } finally {
                if (areaRequestRef.current === requestId) {
                    setIsAreaLoading(false);
                }
            }
        },
        [loadAreas]
    );

    const fetchLedgers = useCallback(
        async (args?: { search?: string | null; mode?: 'all' | 'search' }) => {
            const trimmed = args?.search?.trim() ?? '';
            const mode = args?.mode ?? 'search';
            const search = trimmed.length ? trimmed : null;
            const areaKey = areaIds.length > 0 ? [...areaIds].sort((a, b) => a - b).join(',') : '';
            const lastFetch = ledgerLastFetchRef.current;

            if (!search && mode !== 'all') {
                setLedgerLookupRows([]);
                ledgerLastFetchRef.current = { search: null, mode, areaKey };
                return;
            }
            if (
                lastFetch &&
                lastFetch.search === search &&
                lastFetch.mode === mode &&
                lastFetch.areaKey === areaKey
            ) {
                return;
            }

            const requestId = ++ledgerRequestRef.current;
            setIsLedgerLoading(true);
            try {
                const result = await loadLedgerLookup({
                    variables: {
                        search,
                        areaIds: areaIds.length > 0 ? areaIds : null,
                        limit: LEDGER_FETCH_LIMIT
                    }
                });
                if (ledgerRequestRef.current !== requestId) return;
                const rows = (result.data?.ledgerSummaries?.items ?? []) as LedgerSummaryRow[];
                setLedgerLookupRows(Array.isArray(rows) ? [...rows] : []);
                ledgerLastFetchRef.current = { search, mode, areaKey };
            } catch {
                if (ledgerRequestRef.current === requestId) {
                    setLedgerLookupRows([]);
                }
            } finally {
                if (ledgerRequestRef.current === requestId) {
                    setIsLedgerLoading(false);
                }
            }
        },
        [areaIds, loadLedgerLookup]
    );

    const scheduleAreaFetch = useCallback(
        (query: string) => {
            if (typeof window === 'undefined') return;
            if (areaFilterTimerRef.current) window.clearTimeout(areaFilterTimerRef.current);
            areaFilterTimerRef.current = window.setTimeout(() => {
                void fetchAreas({ search: query, mode: query.trim() ? 'search' : 'all' });
            }, FILTER_DEBOUNCE_MS);
        },
        [fetchAreas]
    );

    const scheduleLedgerFetch = useCallback(
        (query: string) => {
            if (typeof window === 'undefined') return;
            if (ledgerFilterTimerRef.current) window.clearTimeout(ledgerFilterTimerRef.current);
            ledgerFilterTimerRef.current = window.setTimeout(() => {
                void fetchLedgers({ search: query, mode: query.trim() ? 'search' : 'all' });
            }, FILTER_DEBOUNCE_MS);
        },
        [fetchLedgers]
    );

    const handleAreaShow = useCallback(() => {
        const search = areaFilterValueRef.current ?? '';
        void fetchAreas({ search, mode: search.trim() ? 'search' : 'all' });
    }, [fetchAreas]);

    const handleLedgerShow = useCallback(() => {
        const search = ledgerFilterValueRef.current ?? '';
        void fetchLedgers({ search, mode: search.trim() ? 'search' : 'all' });
    }, [fetchLedgers]);

    const handleAreaFilter = useCallback(
        (event: { filter: string }) => {
            const query = event.filter ?? '';
            areaFilterValueRef.current = query;
            scheduleAreaFetch(query);
        },
        [scheduleAreaFetch]
    );

    const handleLedgerFilter = useCallback(
        (event: { filter: string }) => {
            const query = event.filter ?? '';
            ledgerFilterValueRef.current = query;
            scheduleLedgerFetch(query);
        },
        [scheduleLedgerFetch]
    );

    const fromDateTextValue = fromDate ? toDateText(fromDate) : null;
    const toDateTextValue = toDate ? toDateText(toDate) : null;

    const pendingFilters = useMemo<InvoiceRolloverFilters>(
        () => ({
            ledgerIds: ledgerIds.length > 0 ? ledgerIds : null,
            areaIds: areaIds.length > 0 ? areaIds : null,
            fromDate: fromDateTextValue,
            toDate: toDateTextValue,
            removeZeroLines: 0
        }),
        [areaIds, fromDateTextValue, ledgerIds, toDateTextValue]
    );

    const [loadReport, { data, loading, error }] = useLazyQuery(INVOICE_ROLLOVER, {
        fetchPolicy: 'network-only'
    });

    const hasApplied = appliedFilters != null;
    const reportLoading = loading && hasApplied;

    const rows: InvoiceRolloverRow[] = useMemo(
        () => (hasApplied ? data?.invoiceRollover?.items ?? [] : []),
        [data, hasApplied]
    );

    const totals = useMemo(
        () => ({
            invoice: hasApplied ? Number(data?.invoiceRollover?.invoiceTotal ?? 0) : 0,
            applied: hasApplied ? Number(data?.invoiceRollover?.appliedTotal ?? 0) : 0,
            diff: hasApplied ? Number(data?.invoiceRollover?.differenceTotal ?? 0) : 0
        }),
        [data, hasApplied]
    );

    const invoiceCount = hasApplied ? Number(data?.invoiceRollover?.totalCount ?? 0) : 0;

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                rowKey: `sk-${idx}`,
                debit: 0,
                credit: 0,
                isReceiptRow: false,
                isSkeleton: true
            })) as InvoiceRolloverRow[],
        []
    );

    const displayRows = reportLoading ? skeletonRows : rows;
    const rowsPerPage = 10;
    const { isPrinting, printRows, triggerPrint } = useReportPrint<InvoiceRolloverRow>({ rows });
    const tableRows = isPrinting && printRows ? printRows : displayRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const ledgerFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.ledgerName)),
        [rows]
    );
    const invoiceDateFilterOptions = useMemo(
        () => buildDateFilterOptions(rows.map((row) => row.invoiceDate)),
        [rows]
    );
    const invoiceNumberFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.invoiceNumber)),
        [rows]
    );
    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.voucherType)),
        [rows]
    );
    const agLedgerFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.agLedger)),
        [rows]
    );
    const debitFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => row.debit)),
        [rows]
    );
    const creditFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => row.credit)),
        [rows]
    );
    const differenceFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => row.difference)),
        [rows]
    );
    const receiptDateFilterOptions = useMemo(
        () => buildDateFilterOptions(rows.map((row) => row.receiptDate)),
        [rows]
    );
    const receiptTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.receiptType)),
        [rows]
    );
    const receiptVoucherFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.receiptVoucherNo)),
        [rows]
    );
    const receiptAmountFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => row.receiptAmount)),
        [rows]
    );
    const totalPaidFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => row.totalPaid)),
        [rows]
    );

    const ledgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerFilterOptions, 'All'),
        [ledgerFilterOptions]
    );
    const invoiceDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(invoiceDateFilterOptions, 'All'),
        [invoiceDateFilterOptions]
    );
    const invoiceNumberFilterElement = useMemo(
        () => buildMultiSelectFilterElement(invoiceNumberFilterOptions, 'All'),
        [invoiceNumberFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions, 'All'),
        [voucherTypeFilterOptions]
    );
    const agLedgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(agLedgerFilterOptions, 'All'),
        [agLedgerFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions, 'All'),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions, 'All'),
        [creditFilterOptions]
    );
    const differenceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(differenceFilterOptions, 'All'),
        [differenceFilterOptions]
    );
    const receiptDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptDateFilterOptions, 'All'),
        [receiptDateFilterOptions]
    );
    const receiptTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptTypeFilterOptions, 'All'),
        [receiptTypeFilterOptions]
    );
    const receiptVoucherFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptVoucherFilterOptions, 'All'),
        [receiptVoucherFilterOptions]
    );
    const receiptAmountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptAmountFilterOptions, 'All'),
        [receiptAmountFilterOptions]
    );
    const totalPaidFilterElement = useMemo(
        () => buildMultiSelectFilterElement(totalPaidFilterOptions, 'All'),
        [totalPaidFilterOptions]
    );

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
    };

    const handleAreaChange = useCallback(
        (nextIds: number[]) => {
            setAreaIds(nextIds);
            setSelectedAreaOptions(areaOptions.filter((option) => nextIds.includes(Number(option.value))));
            setLedgerIds([]);
            setSelectedLedgerOptions([]);
            setLedgerLookupRows([]);
            ledgerLastFetchRef.current = null;
            setAppliedFilters(null);
        },
        [areaOptions]
    );

    const handleLedgerChange = useCallback(
        (nextIds: number[]) => {
            setLedgerIds(nextIds);
            setSelectedLedgerOptions(ledgerOptions.filter((option) => nextIds.includes(Number(option.value))));
            setAppliedFilters(null);
        },
        [ledgerOptions]
    );

    const handleFromDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setFromDate(nextValue);
        clearAppliedFilters();
        setDateErrors({});
    };

    const handleToDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setToDate(nextValue);
        clearAppliedFilters();
        setDateErrors({});
    };

    const handleRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        const validation = validateDateRange({ fromDate, toDate }, initialRangeRef.current);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (!fromDateTextValue || !toDateTextValue) return;
        setAppliedFilters(pendingFilters);
        setLastRefreshedAt(new Date());
        loadReport({ variables: pendingFilters });
        event.currentTarget.blur();
    };

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Invoice Rollover (${reportPeriod})` : 'Invoice Rollover';
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
        if (appliedFilters.ledgerIds.length) {
            parts.push(`Ledgers: ${resolveOptionLabels(appliedFilters.ledgerIds, ledgerOptions, 'Ledger')}`);
        }
        if (appliedFilters.areaIds.length) {
            parts.push(`Areas: ${resolveOptionLabels(appliedFilters.areaIds, areaOptions, 'Area')}`);
        }
        return parts.length ? parts.join(' | ') : null;
    }, [appliedFilters, areaOptions, ledgerOptions]);

    const exportColumns = useMemo<ReportExportColumn<InvoiceRolloverRow>[]>(
        () => [
            { header: 'Ledger', value: (row) => row.ledgerName ?? '' },
            { header: 'Invoice Date', value: (row) => formatDate(row.invoiceDate ?? null) },
            { header: 'Invoice No', value: (row) => row.invoiceNumber ?? '' },
            { header: 'Voucher Type', value: (row) => row.voucherType ?? '' },
            { header: 'Ag. Ledger', value: (row) => row.agLedger ?? '' },
            { header: 'Dr Amt', value: (row) => (row.isReceiptRow ? '' : row.debit ? Number(row.debit).toFixed(2) : '') },
            { header: 'Cr Amt', value: (row) => (row.isReceiptRow ? '' : row.credit ? Number(row.credit).toFixed(2) : '') },
            {
                header: 'Due',
                value: (row) =>
                    row.isReceiptRow ? '' : row.difference != null ? Number(row.difference).toFixed(2) : ''
            },
            { header: 'Receipt Date', value: (row) => formatDate(row.receiptDate ?? null) },
            { header: 'Receipt Type', value: (row) => row.receiptType ?? '' },
            { header: 'Receipt No', value: (row) => row.receiptVoucherNo ?? '' },
            {
                header: 'Receipt Amount',
                value: (row) => (row.receiptAmount != null ? Number(row.receiptAmount).toFixed(2) : '')
            },
            {
                header: 'Total Paid',
                value: (row) => (row.isReceiptRow ? '' : row.totalPaid != null ? Number(row.totalPaid).toFixed(2) : '')
            }
        ],
        []
    );
    const exportFileName = `invoice-rollover_${appliedFilters?.fromDate ?? 'all'}_${appliedFilters?.toDate ?? 'all'}`;
    const exportContext = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            rows,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [exportColumns, exportFileName, rows, filterSummary, reportTitle, companyInfo.name, companyInfo.address, printFooterLeft]
    );

    const handleExportCsv = () => exportReportCsv(exportContext);
    const handleExportExcel = () => {
        void exportReportExcel(exportContext);
    };
    const handleExportPdf = () => exportReportPdf(exportContext);

    const canQuery = Boolean(fromDateTextValue && toDateTextValue && ledgerIds.length > 0);
    const showBalanceBadges = Boolean(currentBalanceLabel && selectedLedger && ledgerIds.length === 1);

    const ledgerBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('10rem');
        if (row.isReceiptRow) return '';
        return row.ledgerName ?? '';
    };

    const invoiceDateBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4.5rem');
        if (row.isReceiptRow) return '';
        return formatDate(row.invoiceDate ?? null);
    };

    const invoiceNumberBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.invoiceNumber ?? '';
    };

    const voucherTypeBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('5rem');
        if (row.isReceiptRow) return '';
        return row.voucherType ?? '';
    };

    const agLedgerBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('7rem');
        if (row.isReceiptRow) return '';
        return row.agLedger ?? '';
    };

    const debitBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.debit ? formatAmount(row.debit) : '';
    };

    const creditBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.credit ? formatAmount(row.credit) : '';
    };

    const differenceBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        if (row.difference == null) return '';
        const diff = Number(row.difference);
        const className = diff > 0 ? 'text-red-600 font-semibold' : diff < 0 ? 'text-green-600 font-semibold' : '';
        return <span className={className}>{formatAmount(diff)}</span>;
    };

    const receiptDateBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4.5rem');
        return formatDate(row.receiptDate ?? null);
    };

    const receiptTypeBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('2.5rem');
        return row.receiptType ?? '';
    };

    const receiptVoucherBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        return row.receiptVoucherNo ?? '';
    };

    const receiptAmountBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        return row.receiptAmount != null ? formatAmount(row.receiptAmount) : '';
    };

    const totalPaidBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.totalPaid != null ? formatAmount(row.totalPaid) : '';
    };

    const debitFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.invoice);
    const differenceFooter = reportLoading ? (
        skeletonCell('3rem')
    ) : (
        <span
            className={
                totals.diff > 0 ? 'text-red-600 font-semibold' : totals.diff < 0 ? 'text-green-600 font-semibold' : ''
            }
        >
            {formatAmount(totals.diff)}
        </span>
    );
    const totalPaidFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.applied);

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
                        <h2 className="m-0">Invoice Rollover</h2>
                        <p className="mt-2 mb-0 text-600">
                            Invoice vs applied receipts summary (ported from legacy Agency Manager workflow).
                        </p>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading invoice rollover: {error.message}</p>}
            </div>

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 20, 50, 100, 200]}
                dataKey="rowKey"
                loading={false}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                className="summary-table invoice-rollover-table"
                emptyMessage={reportLoading || !hasApplied ? '' : 'No results found'}
                headerLeft={
                    <div className="flex flex-column gap-2 w-full">
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppDateInput
                                value={fromDate}
                                onChange={handleFromDateChange}
                                placeholder="From date"
                                fiscalYearStart={fiscalYearStartDate}
                                fiscalYearEnd={fiscalYearEndDate}
                                autoFocus
                                selectOnFocus
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                inputId="invoice-rollover-from-date"
                                style={{ width: '150px' }}
                            />
                            <AppDateInput
                                value={toDate}
                                onChange={handleToDateChange}
                                placeholder="To date"
                                fiscalYearStart={fiscalYearStartDate}
                                fiscalYearEnd={fiscalYearEndDate}
                                inputRef={toDateInputRef}
                                onEnterNext={focusAreaInput}
                                inputId="invoice-rollover-to-date"
                                style={{ width: '150px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppMultiSelect
                                value={areaIds}
                                options={areaOptions}
                                optionLabel="label"
                                optionValue="value"
                                ref={areaInputRef}
                                loading={isAreaLoading}
                                onShow={handleAreaShow}
                                onFilter={handleAreaFilter}
                                onChange={(e) => handleAreaChange((e.value ?? []) as number[])}
                                placeholder={isAreaLoading ? 'Loading areas...' : 'All areas'}
                                emptyMessage={isAreaLoading ? 'Loading...' : 'Type to search'}
                                emptyFilterMessage={isAreaLoading ? 'Loading...' : 'No results found'}
                                filterInputAutoFocus
                                style={{ width: '220px' }}
                            />
                            <div className="flex align-items-center gap-2 ledger-ledger-meta">
                                <AppMultiSelect
                                    value={ledgerIds}
                                    options={ledgerOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    loading={isLedgerLoading}
                                    enterSelectOnEnter
                                    enterFocusNext
                                    onShow={handleLedgerShow}
                                    onFilter={handleLedgerFilter}
                                    onChange={(e) => handleLedgerChange((e.value ?? []) as number[])}
                                    placeholder={isLedgerLoading ? 'Loading parties...' : 'Multiple parties'}
                                    emptyMessage={isLedgerLoading ? 'Loading...' : 'Type to search'}
                                    emptyFilterMessage={isLedgerLoading ? 'Loading...' : 'No results found'}
                                    filterInputAutoFocus
                                    itemTemplate={(option: LedgerOption) => {
                                        const address = option.address?.trim();
                                        return (
                                            <div className="flex flex-column">
                                                <span className="font-medium">{option.label}</span>
                                                {address && <small className="text-600">{address}</small>}
                                            </div>
                                        );
                                    }}
                                    style={{ width: '320px' }}
                                />
                                {selectedLedger && (
                                    <LedgerMetaPanel
                                        address={selectedLedger.address}
                                        balanceLabel={currentBalanceLabel ?? null}
                                        balanceSeverity={currentBalanceSeverity}
                                        showBalance={showBalanceBadges}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                }
                headerRight={
                    <>
                        <Tag value={`Inv ${formatAmount(totals.invoice)}`} severity="info" />
                        <Tag value={`Applied ${formatAmount(totals.applied)}`} severity="success" />
                        <Tag
                            value={`Due ${formatAmount(totals.diff)}`}
                            severity={totals.diff > 0 ? 'danger' : totals.diff < 0 ? 'success' : 'secondary'}
                        />
                        <AppReportActions
                            onRefresh={handleRefreshClick}
                            onPrint={handlePrintClick}
                            onExportCsv={handleExportCsv}
                            onExportExcel={handleExportExcel}
                            onExportPdf={handleExportPdf}
                            refreshDisabled={!canQuery}
                            exportDisabled={!hasApplied || rows.length === 0}
                        />
                    </>
                }
                recordSummary={
                    hasApplied
                        ? `${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}`
                        : 'Press Refresh to load report'
                }
            >
                <Column
                    field="ledgerName"
                    header="Ledger"
                    body={ledgerBody}
                    style={{ width: '14rem' }}
                    filterElement={ledgerFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="invoiceDate"
                    header="Inv. Date"
                    body={invoiceDateBody}
                    style={{ width: '7rem' }}
                    filterElement={invoiceDateFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="invoiceNumber"
                    header="Inv. No"
                    body={invoiceNumberBody}
                    style={{ width: '7rem' }}
                    filterElement={invoiceNumberFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherType"
                    header="Voucher Type"
                    body={voucherTypeBody}
                    style={{ width: '8rem' }}
                    filterElement={voucherTypeFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="agLedger"
                    header="Ag. Ledger"
                    body={agLedgerBody}
                    style={{ width: '9rem' }}
                    filterElement={agLedgerFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="debit"
                    header="Dr Amt"
                    body={debitBody}
                    style={{ width: '8rem' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    footer={debitFooter}
                    footerStyle={{ fontWeight: 600 }}
                    filterElement={debitFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="credit"
                    header="Cr Amt"
                    body={creditBody}
                    style={{ width: '8rem' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    filterElement={creditFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="difference"
                    header="Due"
                    body={differenceBody}
                    style={{ width: '8rem' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    footer={differenceFooter}
                    footerStyle={{ fontWeight: 600 }}
                    filterElement={differenceFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="receiptDate"
                    header="R. Date"
                    body={receiptDateBody}
                    style={{ width: '7rem' }}
                    filterElement={receiptDateFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="receiptType"
                    header="R. Type"
                    body={receiptTypeBody}
                    style={{ width: '4.5rem' }}
                    filterElement={receiptTypeFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="receiptVoucherNo"
                    header="R. V. No"
                    body={receiptVoucherBody}
                    style={{ width: '7rem' }}
                    filterElement={receiptVoucherFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="receiptAmount"
                    header="R. Amount"
                    body={receiptAmountBody}
                    style={{ width: '8rem' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    filterElement={receiptAmountFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="totalPaid"
                    header="Total Paid"
                    body={totalPaidBody}
                    style={{ width: '8rem' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    footer={totalPaidFooter}
                    footerStyle={{ fontWeight: 600 }}
                    filterElement={totalPaidFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
            </ReportDataTable>
        </div>
    );
}
