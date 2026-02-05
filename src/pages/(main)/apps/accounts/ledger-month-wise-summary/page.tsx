'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AutoCompleteChangeEvent, AutoCompleteCompleteEvent, type AutoComplete } from 'primereact/autocomplete';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { type DataTableFilterEvent, type DataTableFilterMeta } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import { useNavigate } from 'react-router-dom';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppDateInput from '@/components/AppDateInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppReportActions from '@/components/AppReportActions';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { resolveLedgerGroupFilter } from '@/lib/accounts/ledgerGroupFilter';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';

interface LedgerLookupRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    ledgerGroupId: number | null;
    address: string | null;
    openingBalanceAmount: string | null;
    balanceType: number | null;
}

interface LedgerLookupOption extends LedgerLookupRow {
    label: string;
}

interface MonthRow {
    monthKey: string;
    label: string;
    debit: number;
    credit: number;
    balance: number;
    drCr: string;
    isOpening: boolean;
}

interface MonthDisplayRow extends MonthRow {
    rowKey: string;
    closing: number;
    closingAbs: number;
}

type SummaryFilters = {
    ledgerId: number | null;
    ledgerGroupId: number | null;
    fromDate: Date | null;
    toDate: Date | null;
};

const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $ledgerGroupId: Int) {
        ledgerSummaries(
            search: $search
            ledgerGroupId: $ledgerGroupId
            limit: $limit
            offset: 0
            sortField: "name"
            sortOrder: 1
        ) {
            items {
                ledgerId
                name
                groupName
                ledgerGroupId
                address
                openingBalanceAmount
                balanceType
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

const LEDGER_MONTH_SUMMARY = gql`
    query LedgerMonthWiseSummary(
        $ledgerId: Int!
        $ledgerGroupId: Int
        $fromDate: String
        $toDate: String
    ) {
        ledgerMonthWiseSummary(
            ledgerId: $ledgerId
            ledgerGroupId: $ledgerGroupId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: 0
        ) {
            monthKey
            label
            debit
            credit
            balance
            drCr
            isOpening
        }
    }
`;

const ALL_LEDGER_LIMIT = 10000;
const SEARCH_LEDGER_LIMIT = 200;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

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
    label: {
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
    closingAbs: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    drCr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

const buildMultiSelectFilterElement =
    <T extends string | number>(items: FilterOption<T>[], placeholder = 'All') =>
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

const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
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

const resolveOptionLabel = (
    value: number | null,
    options: Array<{ value: number; label: string }>,
    fallback: string
) => {
    if (value == null) return 'All';
    const match = options.find((option) => Number(option.value) === Number(value));
    return match?.label ?? `${fallback} ${value}`;
};

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

const monthLabel = (key: string) => {
    const safe = key?.trim();
    if (!safe || safe.length < 7) return key;
    const date = new Date(`${safe}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${date.getFullYear()} - ${month}`;
};

const monthRangeFromKey = (key: string) => {
    const match = key.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (Number.isNaN(year) || Number.isNaN(month)) return null;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { from: toDateText(start), to: toDateText(end) };
};

export default function AccountsLedgerMonthWiseSummaryPage() {
    const navigate = useNavigate();
    const { companyContext } = useAuth();
    const { setPageTitle } = useContext(LayoutContext);
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [ledgerGroupId, setLedgerGroupId] = useState<number | null>(null);
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerLookupRow[]>([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [ledgerSuggestions, setLedgerSuggestions] = useState<LedgerLookupOption[]>([]);
    const [ledgerPanelOpen, setLedgerPanelOpen] = useState(false);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState<LedgerLookupOption | null>(null);
    const [previewLedger, setPreviewLedger] = useState<LedgerLookupOption | null>(null);
    const initialRangeRef = useRef<ReturnType<typeof resolveFiscalRange> | null>(null);
    if (!initialRangeRef.current) {
        initialRangeRef.current = resolveFiscalRange(
            companyContext?.fiscalYearStart ?? null,
            companyContext?.fiscalYearEnd ?? null
        );
    }

    useEffect(() => {
        setPageTitle('Ledger Month-wise Summary');
        return () => setPageTitle(null);
    }, [setPageTitle]);
    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current?.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current?.end ?? null);
    const [appliedFilters, setAppliedFilters] = useState<SummaryFilters | null>(null);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ groupId: number | null; search: string; mode: 'all' | 'search' } | null>(
        null
    );
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const ledgerGroupInputRef = useRef<AutoComplete>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const ledgerEnterRef = useRef(false);
    const hasTouchedDatesRef = useRef(false);
    const refreshButtonId = 'ledger-month-summary-refresh';

    const { options: ledgerGroupOptions, loading: groupsLoading } = useLedgerGroupOptions();
    const ledgerGroupFilter = useMemo(
        () => resolveLedgerGroupFilter(ledgerGroupId, ledgerGroupOptions),
        [ledgerGroupId, ledgerGroupOptions]
    );
    const [loadLedgerLookup, { error: ledgerError }] = useLazyQuery(LEDGER_LOOKUP, { fetchPolicy: 'network-only' });

    const fetchLedgers = async (args?: { search?: string | null; groupId?: number | null; mode?: 'all' | 'search' }) => {
        const trimmed = args?.search?.trim() ?? '';
        const groupId = args?.groupId ?? ledgerGroupFilter.fetchGroupId;
        const resolvedGroupId = groupId != null && groupId > 0 ? groupId : null;
        const mode = args?.mode ?? 'search';
        const lastFetch = ledgerLastFetchRef.current;

        if (!resolvedGroupId && !trimmed && mode !== 'all') {
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
            lastFetch.groupId === resolvedGroupId &&
            ledgerLookupRows.length > 0
        ) {
            setLedgerLookupRows((prev) => (prev.length ? [...prev] : prev));
            setIsLedgerLoading(false);
            return;
        }

        const requestId = ++ledgerRequestRef.current;
        const limit =
            mode === 'all'
                ? resolvedGroupId
                    ? 2000
                    : ALL_LEDGER_LIMIT
                : resolvedGroupId
                  ? 2000
                  : SEARCH_LEDGER_LIMIT;
        setIsLedgerLoading(true);
        try {
            const result = await loadLedgerLookup({
                variables: {
                    search: trimmed ? trimmed : null,
                    ledgerGroupId: resolvedGroupId,
                    limit
                }
            });
            if (ledgerRequestRef.current !== requestId) return;
            const items = result.data?.ledgerSummaries?.items ?? [];
            setLedgerLookupRows(Array.isArray(items) ? [...(items as LedgerLookupRow[])] : []);
            ledgerLastFetchRef.current = { groupId: resolvedGroupId, search: trimmed, mode };
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

    const [loadSummary, { data: summaryData, loading: summaryLoading, error: summaryError }] = useLazyQuery(
        LEDGER_MONTH_SUMMARY,
        { fetchPolicy: 'network-only' }
    );

    const todayText = useMemo(() => toDateText(new Date()), []);
    const balanceToDateText = todayText;
    const { data: balanceData, loading: balanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: ledgerId == null,
        variables: {
            ledgerId: ledgerId ?? 0,
            toDate: balanceToDateText
        }
    });

    const ledgerRows = useMemo(() => ledgerLookupRows, [ledgerLookupRows]);

    const ledgerOptions = useMemo<LedgerLookupOption[]>(() => {
        const filterIds = ledgerGroupFilter.filterIds;
        const filtered =
            filterIds.length > 0
                ? ledgerRows.filter((l) => filterIds.includes(Number(l.ledgerGroupId)))
                : ledgerRows;
        return filtered
            .map((l) => ({
                ...l,
                label: `${l.name ?? ''}`.trim() || `Ledger ${l.ledgerId}`
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [ledgerRows, ledgerGroupFilter.filterIds]);

    const showLedgerSpinner = isLedgerLoading && ledgerPanelOpen;

    const focusNextOnEnter = (event: React.KeyboardEvent, next: React.RefObject<HTMLElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        next.current?.focus();
    };

    const focusInputAndSelect = (ref: React.RefObject<HTMLInputElement>) => {
        const input = ref.current;
        if (!input) return;
        input.focus();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                if (document.activeElement !== input) return;
                input.select();
            }, 160);
        } else if (typeof input.select === 'function') {
            input.select();
        }
    };

    const focusAutoComplete = (ref: React.RefObject<AutoComplete>) => {
        ref.current?.focus();
    };

    const focusRefreshButton = () => {
        const button = document.getElementById(refreshButtonId) as HTMLButtonElement | null;
        button?.focus();
    };

    const focusLedgerGroupInput = () => {
        focusAutoComplete(ledgerGroupInputRef);
    };

    const focusLedgerInput = () => {
        focusInputAndSelect(ledgerInputRef);
    };

    const clearLedgerGroupSelection = () => {
        setLedgerGroupId(null);
        setLedgerId(null);
        setSelectedLedger(null);
        setPreviewLedger(null);
        setLedgerQuery('');
        setLedgerLookupRows([]);
        setLedgerPanelOpen(false);
    };

    const handleLedgerGroupChange = (value: number | null) => {
        if (value == null) {
            clearLedgerGroupSelection();
            return;
        }
        setLedgerGroupId(value);
        setLedgerId(null);
        setSelectedLedger(null);
        setPreviewLedger(null);
        setLedgerQuery('');
        setLedgerLookupRows([]);
        setLedgerPanelOpen(false);
        const nextFilter = resolveLedgerGroupFilter(value, ledgerGroupOptions);
        void fetchLedgers({ groupId: nextFilter.fetchGroupId, mode: 'all' });
    };

    const syncLedgerPreviewFromHighlight = () => {
        if (typeof document === 'undefined') return;
        const input = ledgerInputRef.current;
        if (!input) return;
        const fallback = selectedLedger ?? null;
        const listId = input.getAttribute('aria-controls');
        if (!listId) {
            setPreviewLedger(fallback);
            return;
        }
        const list = document.getElementById(listId);
        if (!list) {
            setPreviewLedger(fallback);
            return;
        }
        const highlighted = list.querySelector('li[data-p-highlight="true"] [data-ledger-id]') as HTMLElement | null;
        if (!highlighted) {
            setPreviewLedger(fallback);
            return;
        }
        const ledgerId = highlighted.getAttribute('data-ledger-id');
        if (!ledgerId) {
            setPreviewLedger(fallback);
            return;
        }
        const match = ledgerSuggestions.find((item) => Number(item.ledgerId) === Number(ledgerId)) ?? null;
        setPreviewLedger(match ?? fallback);
    };

    useEffect(() => {
        setLedgerSuggestions(ledgerOptions);
    }, [ledgerOptions]);

    useEffect(() => {
        if (!ledgerPanelOpen) return;
        if (!ledgerSuggestions.length) {
            setPreviewLedger(selectedLedger ?? null);
            return;
        }
        if (typeof window === 'undefined') return;
        window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
    }, [ledgerSuggestions, ledgerPanelOpen]);

    useEffect(() => {
        if (ledgerId == null) {
            setSelectedLedger(null);
            return;
        }
        if (selectedLedger && Number(selectedLedger.ledgerId) === Number(ledgerId)) return;
        const match = ledgerOptions.find((l) => Number(l.ledgerId) === Number(ledgerId)) ?? null;
        if (match) setSelectedLedger(match);
    }, [ledgerId, ledgerOptions, selectedLedger]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const initialRange = useMemo(() => {
        const start = fiscalRange?.start ?? null;
        const end = fiscalRange?.end ?? null;
        if (!start && !end) return null;
        const today = new Date();
        let toDate = end;
        if (start && end && today >= start && today <= end) {
            toDate = today;
        } else if (!end) {
            toDate = today;
        }
        return [start ?? null, toDate ?? null] as [Date | null, Date | null];
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

    const handleFromDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setFromDate(nextValue);
        setDateErrors((prev) => ({ ...prev, fromDate: undefined }));
    };

    const handleToDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setToDate(nextValue);
        setDateErrors((prev) => ({ ...prev, toDate: undefined }));
    };

    const canQuery = Boolean(fromDate && toDate);
    const hasApplied = appliedFilters != null;
    const appliedLedgerId = appliedFilters?.ledgerId ?? null;

    const currentBalanceLabel = useMemo(() => {
        if (!ledgerId) return null;
        if (balanceLoading) return 'Loading...';
        const balance = balanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [ledgerId, balanceLoading, balanceData]);

    const currentBalanceSeverity = useMemo(() => {
        if (balanceLoading) return 'warning';
        const drCr = balanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'danger' : 'success';
    }, [balanceData, balanceLoading]);

    const displayLedger = previewLedger ?? selectedLedger;
    const showBalanceBadges = Boolean(
        currentBalanceLabel &&
            selectedLedger &&
            displayLedger &&
            Number(displayLedger.ledgerId) === Number(selectedLedger.ledgerId)
    );
    const summaryLoadingApplied = hasApplied && summaryLoading;
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                rowKey: `skeleton-${idx}`,
                isSkeleton: true,
                monthKey: '',
                label: '',
                debit: 0,
                credit: 0,
                balance: 0,
                drCr: '',
                isOpening: false,
                closing: 0,
                closingAbs: 0
            })),
        []
    );

    const rawRows: MonthRow[] = useMemo(
        () => (hasApplied ? summaryData?.ledgerMonthWiseSummary ?? [] : []),
        [summaryData, hasApplied]
    );

    const openingSigned = useMemo(() => {
        if (!hasApplied) return 0;
        const openingRow = rawRows.find((row) => row.isOpening);
        if (!openingRow) return 0;
        const amount = Number(openingRow.balance ?? 0);
        if (Number.isNaN(amount)) return 0;
        return openingRow.drCr === 'Cr' ? -Math.abs(amount) : Math.abs(amount);
    }, [hasApplied, rawRows]);

    const displayRows = useMemo(() => {
        if (!hasApplied) return [];
        return rawRows.map((row, idx) => {
            const balance = Number(row.balance ?? 0);
            const signedBalance = row.drCr === 'Cr' ? -Math.abs(balance) : Math.abs(balance);
            return {
                rowKey: row.isOpening ? 'opening' : `month-${row.monthKey || idx}`,
                closing: signedBalance,
                closingAbs: Math.abs(signedBalance),
                ...row,
                label: row.label || monthLabel(row.monthKey)
            };
        });
    }, [hasApplied, rawRows]);

    const filterSourceRows = useMemo(() => displayRows, [displayRows]);
    const monthFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.label)),
        [filterSourceRows]
    );
    const debitFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterSourceRows.map((row) => row.debit)),
        [filterSourceRows]
    );
    const creditFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterSourceRows.map((row) => row.credit)),
        [filterSourceRows]
    );
    const closingFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterSourceRows.map((row) => row.closingAbs)),
        [filterSourceRows]
    );
    const drCrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.drCr)),
        [filterSourceRows]
    );

    const monthFilterElement = useMemo(
        () => buildMultiSelectFilterElement(monthFilterOptions, 'All'),
        [monthFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions, 'All'),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions, 'All'),
        [creditFilterOptions]
    );
    const closingFilterElement = useMemo(
        () => buildMultiSelectFilterElement(closingFilterOptions, 'All'),
        [closingFilterOptions]
    );
    const drCrFilterElement = useMemo(
        () => buildMultiSelectFilterElement(drCrFilterOptions, 'All'),
        [drCrFilterOptions]
    );

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const rowsPerPage = 10;
    const { isPrinting, printRows, triggerPrint } = useReportPrint<MonthDisplayRow>({ rows: displayRows });
    const tableRows = isPrinting && printRows ? printRows : summaryLoadingApplied ? skeletonRows : displayRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const totals = useMemo(() => {
        if (!hasApplied) return { debit: 0, credit: 0, closing: 0 };
        const debit = rawRows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
        const credit = rawRows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
        const lastRow = rawRows.length ? rawRows[rawRows.length - 1] : null;
        const lastBalance = Number(lastRow?.balance ?? 0);
        const closing =
            lastRow && !Number.isNaN(lastBalance)
                ? lastRow.drCr === 'Cr'
                    ? -Math.abs(lastBalance)
                    : Math.abs(lastBalance)
                : openingSigned;
        return { debit, credit, closing };
    }, [hasApplied, rawRows, openingSigned]);

    const monthBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.label;
    const debitBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.debit ?? 0));
    const creditBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.credit ?? 0));
    const closingBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Math.abs(row.closing));
    const drCrBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('2.5rem') : row.drCr;

    const debitFooter = summaryLoadingApplied ? skeletonCell('3rem') : formatAmount(totals.debit);
    const creditFooter = summaryLoadingApplied ? skeletonCell('3rem') : formatAmount(totals.credit);

    const openLedgerStatement = (row: MonthDisplayRow) => {
        if (!appliedLedgerId || row.isOpening) return;
        const range = monthRangeFromKey(row.monthKey);
        if (!range) return;
        const params = new URLSearchParams({
            ledgerId: String(appliedLedgerId),
            fromDate: range.from,
            toDate: range.to
        });
        navigate(`/apps/accounts/ledger?${params.toString()}`);
    };

    const onRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const fromDateText = fromDate ? toDateText(fromDate) : null;
        const toDateTextValue = toDate ? toDateText(toDate) : null;
        setAppliedFilters({
            ledgerId,
            ledgerGroupId,
            fromDate,
            toDate
        });
        setLastRefreshedAt(new Date());
        loadSummary({
            variables: {
                ledgerId: ledgerId ?? 0,
                ledgerGroupId,
                fromDate: fromDateText,
                toDate: toDateTextValue
            }
        });
    };

    const handleRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onRefresh();
        event.currentTarget.blur();
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Ledger Month-wise Summary (${reportPeriod})` : 'Ledger Month-wise Summary';
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
        if (appliedFilters.ledgerGroupId != null && appliedFilters.ledgerGroupId > 0) {
            parts.push(
                `Ledger Group: ${resolveOptionLabel(appliedFilters.ledgerGroupId, ledgerGroupOptions, 'Group')}`
            );
        }
        if (appliedFilters.ledgerId != null && appliedFilters.ledgerId > 0) {
            parts.push(`Ledger: ${resolveOptionLabel(appliedFilters.ledgerId, ledgerOptions, 'Ledger')}`);
        }
        return parts.length ? parts.join(' | ') : null;
    }, [appliedFilters, ledgerGroupOptions, ledgerOptions]);

    const exportColumns = useMemo<ReportExportColumn<MonthDisplayRow>[]>(
        () => [
            { header: 'Month', value: (row) => row.label ?? '' },
            { header: 'Debit', value: (row) => (row.debit ? Number(row.debit).toFixed(2) : '') },
            { header: 'Credit', value: (row) => (row.credit ? Number(row.credit).toFixed(2) : '') },
            { header: 'Closing', value: (row) => (row.closing ? Number(Math.abs(row.closing)).toFixed(2) : '') },
            { header: 'Dr/Cr', value: (row) => row.drCr ?? '' }
        ],
        []
    );
    const exportFileName = `ledger-month-summary_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
    const exportContext = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            rows: displayRows,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [exportColumns, exportFileName, displayRows, filterSummary, reportTitle, companyInfo.name, companyInfo.address, printFooterLeft]
    );

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const handleExportCsv = () => exportReportCsv(exportContext);
    const handleExportExcel = () => {
        void exportReportExcel(exportContext);
    };
    const handleExportPdf = () => exportReportPdf(exportContext);

    const summaryCount = rawRows.filter((row) => !row.isOpening).length;

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
                        <h2 className="m-0">Ledger Month-wise Summary</h2>
                        <p className="mt-2 mb-0 text-600">Month-wise debit/credit totals for the selected ledger or group.</p>
                    </div>
                </div>
                {(ledgerError || summaryError) && (
                    <p className="text-red-500 m-0">
                        Error loading month summary: {ledgerError?.message || summaryError?.message}
                    </p>
                )}
            </div>

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 12, 24, 50]}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                dataKey="rowKey"
                stripedRows
                size="small"
                loadingState={summaryLoadingApplied}
                loadingSummaryEnabled={hasApplied}
                emptyMessage={
                    summaryLoadingApplied ? '' : hasApplied ? 'No results found' : 'Press Refresh to load summary'
                }
                onRowDoubleClick={(e) => openLedgerStatement(e.data as MonthDisplayRow)}
                className="summary-table ledger-month-summary-table"
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
                                style={{ width: '150px' }}
                            />
                            <AppDateInput
                                value={toDate}
                                onChange={handleToDateChange}
                                placeholder="To date"
                                fiscalYearStart={fiscalYearStartDate}
                                fiscalYearEnd={fiscalYearEndDate}
                                inputRef={toDateInputRef}
                                onEnterNext={focusLedgerGroupInput}
                                style={{ width: '150px' }}
                            />
                            {(dateErrors.fromDate || dateErrors.toDate) && (
                                <span className="p-error text-sm">
                                    {dateErrors.fromDate || dateErrors.toDate}
                                </span>
                            )}
                            <LedgerGroupAutoComplete
                                value={ledgerGroupId}
                                options={ledgerGroupOptions}
                                loading={groupsLoading}
                                onChange={(nextValue) => handleLedgerGroupChange(nextValue)}
                                placeholder="Select group"
                                loadingPlaceholder="Loading groups..."
                                onSelectNext={focusLedgerInput}
                                inputId="ledger-group-autocomplete"
                                ref={ledgerGroupInputRef}
                                style={{ minWidth: '200px' }}
                            />
                            <LedgerAutoComplete
                                value={selectedLedger ?? ledgerQuery}
                                suggestions={ledgerSuggestions}
                                completeMethod={(e: AutoCompleteCompleteEvent) => {
                                    const query = e.query ?? '';
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
                                onChange={(e: AutoCompleteChangeEvent) => {
                                    const value = e.value as LedgerLookupOption | string | null;
                                    const shouldFocusRefresh = ledgerEnterRef.current;
                                    ledgerEnterRef.current = false;
                                    if (value == null) {
                                        setLedgerQuery('');
                                        setSelectedLedger(null);
                                        setLedgerId(null);
                                        setPreviewLedger(null);
                                        return;
                                    }
                                    if (typeof value === 'string') {
                                        setLedgerQuery(value);
                                        setSelectedLedger(null);
                                        setLedgerId(null);
                                        setPreviewLedger(null);
                                        if (shouldFocusRefresh) {
                                            focusRefreshButton();
                                        }
                                        return;
                                    }
                                    setLedgerQuery('');
                                    setSelectedLedger(value);
                                    setLedgerId(Number(value.ledgerId));
                                    setPreviewLedger(null);
                                    if (shouldFocusRefresh) {
                                        focusRefreshButton();
                                    }
                                }}
                                itemTemplate={(option: LedgerLookupOption) => (
                                    <span
                                        data-ledger-id={option.ledgerId}
                                        onMouseEnter={() => setPreviewLedger(option)}
                                    >
                                        {option.label}
                                    </span>
                                )}
                                field="label"
                                loading={showLedgerSpinner}
                                showEmptyMessage
                                placeholder={showLedgerSpinner ? 'Loading ledgers...' : 'Select ledger'}
                                inputId="ledger-autocomplete"
                                onShow={() => {
                                    setLedgerPanelOpen(true);
                                    setPreviewLedger(selectedLedger ?? null);
                                    if (typeof window !== 'undefined') {
                                        window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
                                    }
                                }}
                                onHide={() => {
                                    setLedgerPanelOpen(false);
                                    setPreviewLedger(null);
                                    if (ledgerEnterRef.current) {
                                        ledgerEnterRef.current = false;
                                        focusRefreshButton();
                                    }
                                }}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                                    if (typeof window !== 'undefined') {
                                        window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
                                    }
                                }
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                event.stopPropagation();
                                ledgerEnterRef.current = true;
                                if (!ledgerPanelOpen) {
                                    ledgerEnterRef.current = false;
                                    focusRefreshButton();
                                }
                            }}
                            virtualScrollerOptions={{ itemSize: 36 }}
                                inputRef={ledgerInputRef}
                                style={{ minWidth: '260px' }}
                            />
                        {displayLedger && (
                            <LedgerMetaPanel
                                address={displayLedger.address}
                                balanceLabel={currentBalanceLabel ?? null}
                                balanceSeverity={currentBalanceSeverity}
                                showBalance={showBalanceBadges}
                            />
                        )}
                        </div>
                    </div>
                }
                headerRight={
                    <AppReportActions
                        onRefresh={handleRefreshClick}
                        onPrint={handlePrintClick}
                        onExportCsv={handleExportCsv}
                        onExportExcel={handleExportExcel}
                        onExportPdf={handleExportPdf}
                        refreshDisabled={!canQuery}
                        exportDisabled={!hasApplied || summaryLoading || displayRows.length === 0}
                        refreshButtonId={refreshButtonId}
                    />
                }
                recordSummary={
                    hasApplied
                        ? summaryLoadingApplied
                            ? 'Loading summary...'
                            : `${summaryCount} month${summaryCount === 1 ? '' : 's'}`
                        : 'Press Refresh to load summary'
                }
            >
                <Column
                    field="label"
                    header="Month"
                    body={monthBody}
                    sortField="monthKey"
                    style={{ width: '12rem' }}
                    footer="Total"
                    footerStyle={{ fontWeight: 600 }}
                    headerClassName="summary-left summary-filter-inline"
                    bodyClassName="summary-left"
                    filterElement={monthFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="debit"
                    header="Debit"
                    body={debitBody}
                    style={{ width: '9rem' }}
                    headerClassName="summary-number summary-filter-inline"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    footer={debitFooter}
                    footerStyle={{ fontWeight: 600 }}
                    filterElement={debitFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="credit"
                    header="Credit"
                    body={creditBody}
                    style={{ width: '9rem' }}
                    headerClassName="summary-number summary-filter-inline"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    footer={creditFooter}
                    footerStyle={{ fontWeight: 600 }}
                    filterElement={creditFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="closingAbs"
                    header="Closing"
                    body={closingBody}
                    style={{ width: '9rem' }}
                    headerClassName="summary-number summary-filter-inline"
                    bodyClassName="summary-number"
                    filterElement={closingFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="drCr"
                    header="Dr/Cr"
                    body={drCrBody}
                    style={{ width: '6rem' }}
                    headerClassName="summary-left summary-filter-inline"
                    bodyClassName="summary-left"
                    filterElement={drCrFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
            </ReportDataTable>
        </div>
    );
}
