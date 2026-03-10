'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type DataTableFilterEvent, type DataTableFilterMeta, type DataTablePageEvent } from 'primereact/datatable';
import { type AutoComplete } from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useSearchParams } from 'react-router-dom';
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { buildSkeletonRows } from '@/components/reportSkeleton';
import AppReportActions from '@/components/AppReportActions';
import { ReportHeader } from '@/components/ReportHeader';
import { ReportRegisterSearch } from '@/components/ReportRegisterSearch';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { resolveLedgerGroupFilter } from '@/lib/accounts/ledgerGroupFilter';
import { ACCOUNT_MASTER_LAZY_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useVoucherTypeOptions } from '@/lib/accounts/voucherTypes';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { formatReportTimestamp } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import {
    buildDefaultColumnFilters,
    useLedgerReportColumns,
    type LedgerReportDisplayRow
} from './components/LedgerReportColumns';
import { LedgerReportFilters } from './components/LedgerReportFilters';
import { LedgerReportSummary } from './components/LedgerReportSummary';
import { LedgerReportTable } from './components/LedgerReportTable';
import {
    LEDGER_CURRENT_BALANCE,
    LEDGER_LOOKUP,
    LEDGER_OPENING_BALANCE,
    LEDGER_REPORT,
    SEND_LEDGER_STATEMENT_SMS,
    SEND_LEDGER_STATEMENT_WHATSAPP,
    CITIES
} from './graphql';
import type {
    CityRow,
    ColumnFilterConstraint,
    ColumnFilterMeta,
    LedgerLookupOption,
    LedgerLookupRow,
    LedgerReportFilters,
    LedgerReportRow,
    LedgerStatementSmsResult,
    LedgerStatementWhatsAppResult,
    SelectOption
} from './types';
import {
    buildDefaultFiscalRange,
    formatAmount,
    formatBalance,
    formatDate,
    formatDateRangeLabel,
    parseDateParam,
    resolveFiscalRange,
    toDateText
} from './utils';

const ALL_LEDGER_LIMIT = 10000;
const SEARCH_LEDGER_LIMIT = 200;

type ActiveColumnFilter = {
    field: string;
    values: Array<string | number>;
};

const isEmptyFilterValue = (value: unknown) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
};

const buildActiveColumnFilters = (filters: DataTableFilterMeta): ActiveColumnFilter[] => {
    const active: ActiveColumnFilter[] = [];
    Object.entries(filters).forEach(([field, meta]) => {
        if (!meta || field === 'global') return;
        const columnMeta = meta as ColumnFilterMeta;
        const constraint = Array.isArray(columnMeta.constraints) ? columnMeta.constraints[0] : null;
        const rawValue = constraint?.value ?? columnMeta.value;
        if (isEmptyFilterValue(rawValue)) return;
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        active.push({
            field,
            values: values as Array<string | number>
        });
    });
    return active;
};


export function LedgerReportContainer() {
    const { companyContext } = useAuth();
    const { setPageTitle } = useContext(LayoutContext);
    const apolloClient = useApolloClient();
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [ledgerGroupId, setLedgerGroupId] = useState<number | null>(null);
    const [cityId, setCityId] = useState<number | null>(null);
    const [cityQuery, setCityQuery] = useState('');
    const [citySuggestions, setCitySuggestions] = useState<SelectOption[]>([]);
    const [selectedCity, setSelectedCity] = useState<SelectOption | null>(null);
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerLookupRow[]>([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [ledgerSuggestions, setLedgerSuggestions] = useState<LedgerLookupOption[]>([]);
    const [selectedLedger, setSelectedLedger] = useState<LedgerLookupOption | null>(null);
    const [previewLedger, setPreviewLedger] = useState<LedgerLookupOption | null>(null);
    const [appliedLedger, setAppliedLedger] = useState<LedgerLookupOption | null>(null);
    const [cityPanelOpen, setCityPanelOpen] = useState(false);
    const [ledgerPanelOpen, setLedgerPanelOpen] = useState(false);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [voucherTypeId, setVoucherTypeId] = useState<number | null>(null);
    const [todayOnly, setTodayOnly] = useState(false);
    const [detailView, setDetailView] = useState(true);
    const [showNarration, setShowNarration] = useState(true);
    const [reportFormat, setReportFormat] = useState<1 | 2>(1);
    const [openingBalanceAbove, setOpeningBalanceAbove] = useState(true);
    const [tableFirst, setTableFirst] = useState(0);
    const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingSms, setIsSendingSms] = useState(false);
    const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
    const [printRows, setPrintRows] = useState<Array<LedgerReportRow & { running: number }> | null>(null);
    const [appliedFilters, setAppliedFilters] = useState<LedgerReportFilters | null>(null);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        setPageTitle('Ledger Statement');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const cancelled: -1 | 0 | 1 = 0;

    const initialRangeRef = useRef<ReturnType<typeof resolveFiscalRange> | null>(null);
    if (!initialRangeRef.current) {
        initialRangeRef.current = resolveFiscalRange(
            companyContext?.fiscalYearStart ?? null,
            companyContext?.fiscalYearEnd ?? null
        );
    }
    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current?.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current?.end ?? null);

    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ groupId: number | null; search: string; mode: 'all' | 'search' } | null>(
        null
    );
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const ledgerGroupInputRef = useRef<AutoComplete>(null);
    const cityAutoCompleteRef = useRef<AutoComplete>(null);
    const cityInputRef = useRef<HTMLInputElement>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const voucherTypeInputRef = useRef<AutoComplete>(null);
    const detailViewInputRef = useRef<HTMLInputElement>(null);
    const cityEnterRef = useRef(false);
    const ledgerEnterRef = useRef(false);
    const hasTouchedDatesRef = useRef(false);
    const autoRefreshRef = useRef(false);
    const toastRef = useRef<Toast>(null);

    const focusInputAndSelect = (ref: React.RefObject<HTMLInputElement>) => {
        const input = ref.current;
        if (!input) return;
        input.focus();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                if (document.activeElement !== input) return;
                if (typeof input.select === 'function') input.select();
            }, 160);
        } else if (typeof input.select === 'function') {
            input.select();
        }
    };

    const focusAutoComplete = (ref: React.RefObject<AutoComplete>) => {
        ref.current?.focus();
    };

    const focusTodayInput = () => focusInputAndSelect(todayInputRef);
    const focusLedgerGroupInput = () => focusAutoComplete(ledgerGroupInputRef);
    const focusCityInput = () => focusInputAndSelect(cityInputRef);
    const focusLedgerInput = () => focusInputAndSelect(ledgerInputRef);
    const focusVoucherTypeInput = () => focusAutoComplete(voucherTypeInputRef);
    const focusDetailViewInput = () => focusInputAndSelect(detailViewInputRef);

    const { options: ledgerGroupOptions, loading: groupsLoading } = useLedgerGroupOptions();
    const ledgerGroupFilter = useMemo(
        () => resolveLedgerGroupFilter(ledgerGroupId, ledgerGroupOptions),
        [ledgerGroupId, ledgerGroupOptions]
    );
    const { data: citiesData, loading: citiesLoading } = useQuery(CITIES, {
        variables: { search: null, limit: 2000 }
    });
    const { options: voucherTypeOptions, loading: voucherTypesLoading } = useVoucherTypeOptions();

    const [loadLedgerLookup, { error: ledgerError }] = useLazyQuery(LEDGER_LOOKUP, {
        ...ACCOUNT_MASTER_LAZY_QUERY_OPTIONS
    });

    const [loadLedgerReport, { data, loading, error }] = useLazyQuery(LEDGER_REPORT, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const [loadOpeningBalance, { data: openingData, loading: openingLoading }] = useLazyQuery(LEDGER_OPENING_BALANCE, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const balanceLedgerId = ledgerId;
    const balanceToDate = appliedFilters?.toDate ?? toDate;
    const balanceToDateText = useMemo(
        () => (balanceToDate ? toDateText(balanceToDate) : null),
        [balanceToDate]
    );
    const { data: balanceData, loading: balanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: balanceLedgerId == null || !balanceToDateText,
        variables: {
            ledgerId: balanceLedgerId ?? 0,
            toDate: balanceToDateText,
            cancelled
        }
    });

    const fetchLedgers = useCallback(
        async (args?: { search?: string | null; groupId?: number | null; mode?: 'all' | 'search' }) => {
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
            const limit = mode === 'all' ? ALL_LEDGER_LIMIT : SEARCH_LEDGER_LIMIT;
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
        },
        [ledgerGroupFilter.fetchGroupId, ledgerLookupRows.length, loadLedgerLookup]
    );

    const cityOptions = useMemo<SelectOption[]>(() => {
        const rows = (citiesData?.cities ?? []) as CityRow[];
        const sorted = [...rows].sort((a, b) =>
            (a.name ?? '').localeCompare(b.name ?? '', 'en', { sensitivity: 'base' })
        );
        return sorted.map((c) => ({
            label: `${c.name ?? `City ${c.cityId}`}${c.stateName ? ` (${c.stateName})` : ''}`,
            value: Number(c.cityId)
        }));
    }, [citiesData]);

    const ledgerOptions = useMemo<LedgerLookupOption[]>(() => {
        const filterIds = ledgerGroupFilter.filterIds;
        const filtered = ledgerLookupRows.filter((l) => {
            if (filterIds.length > 0 && !filterIds.includes(Number(l.ledgerGroupId))) {
                return false;
            }
            if (cityId != null && cityId > 0 && Number(l.cityId) !== Number(cityId)) {
                return false;
            }
            return true;
        });
        return filtered
            .map((l) => ({
                ...l,
                label: l.name?.trim() || `Ledger ${l.ledgerId}`
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [ledgerLookupRows, ledgerGroupFilter.filterIds, cityId]);

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
        const highlightedId = highlighted.getAttribute('data-ledger-id');
        if (!highlightedId) {
            setPreviewLedger(fallback);
            return;
        }
        const match = ledgerSuggestions.find((item) => Number(item.ledgerId) === Number(highlightedId)) ?? null;
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
    }, [ledgerSuggestions, ledgerPanelOpen, selectedLedger]);

    useEffect(() => {
        setCitySuggestions(cityOptions);
    }, [cityOptions]);

    useEffect(() => {
        if (cityId == null) {
            setSelectedCity((current) => (current?.value == null ? current : null));
            return;
        }
        const match = cityOptions.find((c) => Number(c.value) === Number(cityId)) ?? null;
        setSelectedCity(match);
    }, [cityId, cityOptions]);

    useEffect(() => {
        if (ledgerId == null) {
            setSelectedLedger(null);
            return;
        }
        if (selectedLedger && Number(selectedLedger.ledgerId) === Number(ledgerId)) return;
        const match = ledgerOptions.find((l) => Number(l.ledgerId) === Number(ledgerId)) ?? null;
        if (match) setSelectedLedger(match);
    }, [ledgerId, ledgerOptions, selectedLedger]);

    useEffect(() => {
        if (!appliedFilters?.ledgerId) {
            setAppliedLedger(null);
            return;
        }
        if (appliedLedger && Number(appliedLedger.ledgerId) === Number(appliedFilters.ledgerId)) return;
        const match = ledgerOptions.find((l) => Number(l.ledgerId) === Number(appliedFilters.ledgerId)) ?? null;
        if (match) setAppliedLedger(match);
    }, [appliedFilters, appliedLedger, ledgerOptions]);

    useEffect(() => {
        const ledgerIdRaw = searchParams.get('ledgerId');
        if (ledgerIdRaw) {
            const nextLedgerId = Number(ledgerIdRaw);
            if (!Number.isNaN(nextLedgerId) && nextLedgerId > 0) {
                setLedgerId(nextLedgerId);
            }
        }

        const fromParam = parseDateParam(searchParams.get('fromDate'));
        const toParam = parseDateParam(searchParams.get('toDate'));
        if (fromParam || toParam) {
            hasTouchedDatesRef.current = true;
            if (fromParam) setFromDate(fromParam);
            if (toParam) setToDate(toParam);
        }

        if (ledgerIdRaw || fromParam || toParam) {
            autoRefreshRef.current = true;
        }
    }, [searchParams]);

    const handleRefresh = useCallback(() => {
        if (!ledgerId) return;
        const validation = validateDateRange({ fromDate, toDate });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const fromDateText = toDateText(fromDate);
        const toDateTextValue = toDateText(toDate);
        setTableFirst(0);
        setAppliedFilters({
            ledgerId,
            voucherTypeId,
            cancelled,
            fromDate,
            toDate
        });
        setAppliedLedger(selectedLedger ?? null);
        setLastRefreshedAt(new Date());

        loadLedgerReport({
            variables: {
                ledgerId: ledgerId ?? 0,
                search: null,
                voucherTypeId,
                fromDate: fromDateText,
                toDate: toDateTextValue,
                cancelled,
                limit: tableRowsPerPage,
                offset: 0
            }
        });

        loadOpeningBalance({
            variables: {
                ledgerId: ledgerId ?? 0,
                fromDate: fromDateText,
                cancelled
            }
        });
    }, [
        cancelled,
        fromDate,
        ledgerId,
        loadLedgerReport,
        loadOpeningBalance,
        selectedLedger,
        tableRowsPerPage,
        toDate,
        voucherTypeId
    ]);

    useEffect(() => {
        if (!autoRefreshRef.current) return;
        if (!ledgerId || !fromDate || !toDate) return;
        autoRefreshRef.current = false;
        void fetchLedgers({ groupId: ledgerGroupFilter.fetchGroupId, mode: 'all' });
        handleRefresh();
    }, [fetchLedgers, fromDate, handleRefresh, ledgerGroupFilter.fetchGroupId, ledgerId, toDate]);

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
        setAppliedLedger(null);
    };

    const handleFromDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setFromDate(nextValue);
        setDateErrors((prev) => ({ ...prev, fromDate: undefined }));
        clearAppliedFilters();
    };

    const handleToDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setToDate(nextValue);
        setDateErrors((prev) => ({ ...prev, toDate: undefined }));
        clearAppliedFilters();
    };

    const handleTodayToggle = (nextValue: boolean) => {
        clearAppliedFilters();
        setTodayOnly(nextValue);
        hasTouchedDatesRef.current = true;
        if (nextValue) {
            const today = new Date();
            setFromDate(today);
            setToDate(today);
            setOpeningBalanceAbove(false);
            return;
        }
        const fallback = initialRangeRef.current ?? buildDefaultFiscalRange();
        setFromDate(fallback.start ?? null);
        setToDate(fallback.end ?? null);
        setOpeningBalanceAbove(true);
    };

    const resetLedgerSelection = () => {
        setLedgerId(null);
        setLedgerQuery('');
        setSelectedLedger(null);
        setPreviewLedger(null);
        clearAppliedFilters();
    };

    const handleLedgerGroupChange = (value: number | null) => {
        setLedgerGroupId(value);
        setLedgerLookupRows([]);
        ledgerLastFetchRef.current = null;
        resetLedgerSelection();
        const nextFilter = resolveLedgerGroupFilter(value, ledgerGroupOptions);
        void fetchLedgers({ groupId: nextFilter.fetchGroupId, mode: 'all' });
    };

    const handleCityChange = (value: number | null) => {
        setCityId(value);
        resetLedgerSelection();
        if (!ledgerLookupRows.length) {
            void fetchLedgers({ groupId: ledgerGroupFilter.fetchGroupId, mode: 'all' });
        }
    };

    const handleVoucherTypeChange = (value: number | null) => {
        clearAppliedFilters();
        setVoucherTypeId(value);
    };

    const showLedgerSpinner = isLedgerLoading && ledgerPanelOpen;
    const hasApplied = appliedFilters != null;
    const displayLedger = previewLedger ?? selectedLedger;

    const currentBalanceLabel = useMemo(() => {
        if (!balanceLedgerId) return null;
        if (balanceLoading) return 'Loading...';
        const balance = balanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [balanceLedgerId, balanceLoading, balanceData]);

    const currentBalanceSeverity = useMemo(() => {
        if (balanceLoading) return 'warning';
        const drCr = balanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'danger' : 'success';
    }, [balanceData, balanceLoading]);

    const showBalanceBadges = Boolean(
        currentBalanceLabel &&
            selectedLedger &&
            displayLedger &&
            Number(displayLedger.ledgerId) === Number(selectedLedger.ledgerId)
    );
    const currentBalanceTooltip = useMemo(() => {
        if (!showBalanceBadges) return null;
        if (balanceToDateText) {
            const toDateLabel = formatDate(balanceToDateText);
            return toDateLabel
                ? `Current balance up to To Date (${toDateLabel})`
                : 'Current balance up to selected To Date';
        }
        return 'Current balance as on current date';
    }, [balanceToDateText, showBalanceBadges]);

    const rawRows: LedgerReportRow[] = useMemo(
        () => (hasApplied ? data?.ledgerReport?.items ?? [] : []),
        [data, hasApplied]
    );
    const reportLoading = hasApplied && (loading || openingLoading);
    const showSkeletonRows = reportLoading && rawRows.length === 0;
    const reportReady = hasApplied && !showSkeletonRows;
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                id: -(idx + 1),
                isSkeleton: true,
                running: 0
            })),
        []
    );

    const openingSigned = useMemo(() => {
        if (!reportReady) return 0;
        const opening = openingData?.ledgerOpeningBalance;
        if (!opening) return 0;
        const amount = Number(opening.amount ?? 0);
        if (Number.isNaN(amount)) return 0;
        return opening.drCr === 'Cr' ? -Math.abs(amount) : Math.abs(amount);
    }, [reportReady, openingData]);

    const totalRecords = useMemo(() => {
        const count = data?.ledgerReport?.totalCount;
        if (count == null) return rawRows.length;
        const numeric = Number(count);
        return Number.isFinite(numeric) ? numeric : rawRows.length;
    }, [data, rawRows.length]);

    const buildRowsWithBalance = useCallback(
        (
            rows: LedgerReportRow[],
            options?: {
                includeOpening?: boolean;
                isFirstPage?: boolean;
                isLastPage?: boolean;
            }
        ) => {
            const detailRows = rows.map((row) => ({
                ...row,
                running: openingSigned + Number(row.runningDelta ?? 0)
            }));
            if (!options?.includeOpening) return detailRows;
            const openingRow = {
                id: -1,
                date: null,
                voucherNo: null,
                voucherType: 'Opening',
                counterLedger: null,
                counterLedgerDetail: null,
                narration: null,
                debit: openingSigned > 0 ? Math.abs(openingSigned) : 0,
                credit: openingSigned < 0 ? Math.abs(openingSigned) : 0,
                running: openingSigned
            };
            const isFirstPage = options?.isFirstPage ?? true;
            const isLastPage = options?.isLastPage ?? true;
            if (openingBalanceAbove) {
                return isFirstPage ? [openingRow, ...detailRows] : detailRows;
            }
            return isLastPage ? [...detailRows, openingRow] : detailRows;
        },
        [openingBalanceAbove, openingSigned]
    );

    const isFirstPage = tableFirst === 0;
    const isLastPage = totalRecords === 0 ? true : tableFirst + tableRowsPerPage >= totalRecords;

    const rowsWithBalance = useMemo(
        () =>
            reportReady
                ? buildRowsWithBalance(rawRows, {
                      includeOpening: true,
                      isFirstPage,
                      isLastPage
                  })
                : [],
        [buildRowsWithBalance, isFirstPage, isLastPage, rawRows, reportReady]
    );

    const totals = useMemo(() => {
        if (!reportReady) return { debitTotal: 0, creditTotal: 0, closing: 0 };
        const baseDebitTotal = Number(data?.ledgerReport?.debitTotal ?? 0);
        const baseCreditTotal = Number(data?.ledgerReport?.creditTotal ?? 0);
        const openingDebit = openingSigned > 0 ? Math.abs(openingSigned) : 0;
        const openingCredit = openingSigned < 0 ? Math.abs(openingSigned) : 0;
        const debitTotal = baseDebitTotal + openingDebit;
        const creditTotal = baseCreditTotal + openingCredit;
        const closing = openingSigned + baseDebitTotal - baseCreditTotal;
        return { debitTotal, creditTotal, closing };
    }, [data, reportReady, openingSigned]);

    const recordSummary = useMemo(() => {
        if (!hasApplied) return 'Press Refresh to load ledger statement';
        if (showSkeletonRows) return 'Loading ledger statement...';
        return `${totalRecords} posting${totalRecords === 1 ? '' : 's'} | Dr ${formatAmount(totals.debitTotal)} | Cr ${formatAmount(totals.creditTotal)}`;
    }, [hasApplied, showSkeletonRows, totalRecords, totals.creditTotal, totals.debitTotal]);

    useEffect(() => {
        if (!isPrinting || typeof window === 'undefined' || !printRows) return;
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            setIsPrinting(false);
            setPrintRows(null);
        };
        const handleAfterPrint = () => finish();
        window.addEventListener('afterprint', handleAfterPrint);
        const timer = window.setTimeout(() => {
            window.print();
            finish();
        }, 0);
        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
            window.clearTimeout(timer);
        };
    }, [isPrinting, printRows]);

    const handleTablePage = (event: DataTablePageEvent) => {
        const nextFirst = event.first ?? 0;
        const nextRows = event.rows ?? tableRowsPerPage;
        setTableFirst(nextFirst);
        if (event.rows != null) {
            setTableRowsPerPage(nextRows);
        }
        if (!appliedFilters?.ledgerId || !appliedFilters.fromDate || !appliedFilters.toDate) return;
        loadLedgerReport({
            variables: {
                ledgerId: appliedFilters.ledgerId ?? 0,
                search: null,
                voucherTypeId: appliedFilters.voucherTypeId,
                fromDate: toDateText(appliedFilters.fromDate),
                toDate: toDateText(appliedFilters.toDate),
                cancelled,
                limit: nextRows,
                offset: nextFirst
            }
        });
    };

    const handleRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        handleRefresh();
        event.currentTarget.blur();
    };

    const fetchAllLedgerRows = useCallback(async () => {
        if (!appliedFilters?.ledgerId || !appliedFilters.fromDate || !appliedFilters.toDate) return [];
        if (totalRecords <= 0) return [];
        const result = await apolloClient.query({
            query: LEDGER_REPORT,
            fetchPolicy: 'network-only',
            variables: {
                ledgerId: appliedFilters.ledgerId ?? 0,
                search: null,
                voucherTypeId: appliedFilters.voucherTypeId,
                fromDate: toDateText(appliedFilters.fromDate),
                toDate: toDateText(appliedFilters.toDate),
                cancelled,
                limit: totalRecords,
                offset: 0
            }
        });
        const items = result.data?.ledgerReport?.items ?? [];
        return Array.isArray(items) ? (items as LedgerReportRow[]) : [];
    }, [apolloClient, appliedFilters, cancelled, totalRecords]);

    const triggerPrint = useCallback(async () => {
        if (typeof window === 'undefined' || !reportReady) return;
        let allRows = rawRows;
        if (totalRecords > rawRows.length) {
            try {
                const fetched = await fetchAllLedgerRows();
                if (fetched.length) {
                    allRows = fetched;
                }
            } catch {
                allRows = rawRows;
            }
        }
        const printableRows = buildRowsWithBalance(allRows, {
            includeOpening: true,
            isFirstPage: true,
            isLastPage: true
        });
        setPrintRows(printableRows);
        setIsPrinting(true);
    }, [buildRowsWithBalance, fetchAllLedgerRows, rawRows, reportReady, totalRecords]);

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const handleStatementClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const sendLedgerStatementSms = useCallback(async () => {
        if (!appliedFilters?.ledgerId || !appliedFilters.fromDate || !appliedFilters.toDate) return;

        const fromDateText = toDateText(appliedFilters.fromDate);
        const toDateTextValue = toDateText(appliedFilters.toDate);
        if (!fromDateText || !toDateTextValue) return;

        setIsSendingSms(true);
        try {
            const result = await apolloClient.mutate<{ sendLedgerStatementSms: LedgerStatementSmsResult }>({
                mutation: SEND_LEDGER_STATEMENT_SMS,
                variables: {
                    ledgerId: appliedFilters.ledgerId,
                    fromDate: fromDateText,
                    toDate: toDateTextValue,
                    voucherTypeId: appliedFilters.voucherTypeId,
                    cancelled: appliedFilters.cancelled
                }
            });
            const payload = result.data?.sendLedgerStatementSms;
            if (!payload) {
                throw new Error('Failed to send ledger statement SMS');
            }

            const ledgerName =
                appliedLedger?.name ??
                appliedLedger?.label ??
                payload.recipientName ??
                `Ledger ${payload.ledgerId}`;
            const detail = payload.duplicate
                ? payload.note ?? `Ledger statement SMS was already prepared for ${ledgerName}.`
                : `SMS ${payload.status} for ${ledgerName} to ${payload.recipientPhone}.`;
            toastRef.current?.show({
                severity: payload.duplicate ? 'warn' : 'success',
                summary: 'SMS',
                detail
            });
        } catch (nextError) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'SMS failed',
                detail: nextError instanceof Error ? nextError.message : 'Failed to send ledger statement SMS'
            });
        } finally {
            setIsSendingSms(false);
        }
    }, [apolloClient, appliedFilters, appliedLedger]);

    const sendLedgerStatementWhatsApp = useCallback(async () => {
        if (!appliedFilters?.ledgerId || !appliedFilters.fromDate || !appliedFilters.toDate) return;

        const fromDateText = toDateText(appliedFilters.fromDate);
        const toDateTextValue = toDateText(appliedFilters.toDate);
        if (!fromDateText || !toDateTextValue) return;

        setIsSendingWhatsApp(true);
        try {
            const result = await apolloClient.mutate<{ sendLedgerStatementWhatsApp: LedgerStatementWhatsAppResult }>({
                mutation: SEND_LEDGER_STATEMENT_WHATSAPP,
                variables: {
                    ledgerId: appliedFilters.ledgerId,
                    fromDate: fromDateText,
                    toDate: toDateTextValue,
                    voucherTypeId: appliedFilters.voucherTypeId,
                    cancelled: appliedFilters.cancelled,
                    sendNow: true
                }
            });
            const payload = result.data?.sendLedgerStatementWhatsApp;
            if (!payload) {
                throw new Error('Failed to send ledger statement WhatsApp message');
            }

            const ledgerName =
                appliedLedger?.name ??
                appliedLedger?.label ??
                payload.recipientName ??
                `Ledger ${payload.ledgerId}`;
            const templateLabel = payload.templateName ?? payload.templateKey ?? payload.bindingKey;
            toastRef.current?.show({
                severity: 'success',
                summary: 'WhatsApp',
                detail: `WhatsApp message ${payload.status} for ${ledgerName} to ${payload.recipientPhone} using ${templateLabel}.`
            });
        } catch (nextError) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'WhatsApp failed',
                detail: nextError instanceof Error ? nextError.message : 'Failed to send ledger statement WhatsApp message'
            });
        } finally {
            setIsSendingWhatsApp(false);
        }
    }, [apolloClient, appliedFilters, appliedLedger]);

    const handleSendLedgerStatementSmsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void sendLedgerStatementSms();
    };

    const handleSendLedgerStatementWhatsAppClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void sendLedgerStatementWhatsApp();
    };

    const canQuery = Boolean(ledgerId && fromDate && toDate);
    const canSendLedgerStatementSms = Boolean(
        reportReady && appliedFilters?.ledgerId && appliedFilters.fromDate && appliedFilters.toDate
    );
    const canSendLedgerStatementWhatsApp = Boolean(
        reportReady && appliedFilters?.ledgerId && appliedFilters.fromDate && appliedFilters.toDate
    );
    const isFormatTwo = reportFormat === 2;

    const resolveParticularsText = useCallback(
        (row: LedgerReportRow & { running: number }) => {
            let base = '';
            if (row.voucherType === 'Opening') {
                base = 'Opening';
            } else if (isFormatTwo) {
                base = detailView ? row.counterLedgerDetail ?? row.counterLedger ?? '' : row.counterLedger ?? '';
            } else if (detailView) {
                base = row.counterLedger ?? '';
            }
            if (showNarration && row.narration) {
                return `${base}${base && row.narration ? '\n' : ''}${row.narration}`;
            }
            return base;
        },
        [detailView, isFormatTwo, showNarration]
    );

    const rowsWithMeta = useMemo<LedgerReportDisplayRow[]>(
        () =>
            reportReady
                ? rowsWithBalance.map((row) => ({
                      ...row,
                      balance: Number(row.running ?? 0),
                      particulars: resolveParticularsText(row)
                  }))
                : [],
        [reportReady, resolveParticularsText, rowsWithBalance]
    );

    const activeColumnFilters = useMemo(() => buildActiveColumnFilters(columnFilters), [columnFilters]);
    const filteredRows = useMemo(() => {
        if (!activeColumnFilters.length) return rowsWithMeta;
        return rowsWithMeta.filter((row) =>
            activeColumnFilters.every((filter) => {
                let value: string | number | null | undefined;
                if (filter.field === 'balance') {
                    value = row.balance;
                } else if (filter.field === 'particulars') {
                    value = row.particulars;
                } else {
                    value = (row as Record<string, string | number | null | undefined>)[filter.field];
                }
                if (value == null || value === '') return false;
                return filter.values.includes(value);
            })
        );
    }, [activeColumnFilters, rowsWithMeta]);

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Ledger Statement (${reportPeriod})` : 'Ledger Statement';
    const ledgerLabel = useMemo(() => {
        if (!appliedFilters) return '';
        return (
            appliedLedger?.name ??
            appliedLedger?.label ??
            (appliedFilters.ledgerId ? `Ledger ${appliedFilters.ledgerId}` : '')
        );
    }, [appliedFilters, appliedLedger]);
    const printFooterLeft = useMemo(() => {
        const parts: string[] = [];
        if (lastRefreshedAt) {
            parts.push(`Refreshed: ${formatReportTimestamp(lastRefreshedAt)}`);
        }
        if (ledgerLabel) {
            parts.push(`Ledger: ${ledgerLabel}`);
        }
        if (reportPeriod) {
            parts.push(`Period: ${reportPeriod}`);
        }
        return parts.length ? parts.join(' | ') : undefined;
    }, [lastRefreshedAt, ledgerLabel, reportPeriod]);
    const filterSummary = useMemo(() => {
        if (!appliedFilters) return null;
        const parts: string[] = [];
        if (ledgerLabel) parts.push(`Ledger: ${ledgerLabel}`);
        if (appliedFilters.voucherTypeId) {
            const voucherLabel =
                voucherTypeOptions.find((option) => Number(option.value) === Number(appliedFilters.voucherTypeId))
                    ?.label ?? `Voucher Type ${appliedFilters.voucherTypeId}`;
            parts.push(`Voucher Type: ${voucherLabel}`);
        }
        return parts.length ? parts.join(' | ') : null;
    }, [appliedFilters, ledgerLabel, voucherTypeOptions]);

    const exportColumns: ReportExportColumn<LedgerReportRow & { running: number }>[] = isFormatTwo
        ? [
              { header: 'Date', value: (row) => formatDate(row.date ?? null) },
              { header: 'Voucher No', value: (row) => row.voucherNo ?? '' },
              { header: 'Particulars', value: (row) => resolveParticularsText(row) },
              { header: 'Type', value: (row) => row.voucherType ?? '' },
              { header: 'Dr Amt', value: (row) => (row.debit ? Number(row.debit).toFixed(2) : '') },
              { header: 'Cr Amt', value: (row) => (row.credit ? Number(row.credit).toFixed(2) : '') },
              { header: 'Balance', value: (row) => formatBalance(Number(row.running ?? 0)) }
          ]
        : [
              { header: 'Date', value: (row) => formatDate(row.date ?? null) },
              { header: 'Voucher No', value: (row) => row.voucherNo ?? '' },
              { header: 'Type', value: (row) => row.voucherType ?? '' },
              ...(detailView ? [{ header: 'Ag. Ledger', value: (row) => row.counterLedger ?? '' }] : []),
              ...(showNarration ? [{ header: 'Narration', value: (row) => row.narration ?? '' }] : []),
              { header: 'Dr Amt', value: (row) => (row.debit ? Number(row.debit).toFixed(2) : '') },
              { header: 'Cr Amt', value: (row) => (row.credit ? Number(row.credit).toFixed(2) : '') },
              { header: 'Balance', value: (row) => formatBalance(Number(row.running ?? 0)) }
          ];
    const fromText = fromDate ? toDateText(fromDate) : 'all';
    const toText = toDate ? toDateText(toDate) : 'all';
    const exportContextBase = useMemo(
        () => ({
            fileName: `ledger-statement_${fromText}_${toText}`,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [companyInfo.address, companyInfo.name, exportColumns, filterSummary, fromText, reportTitle, toText, printFooterLeft]
    );

    const buildExportRows = useCallback(async () => {
        if (!reportReady) return [];
        let allRows = rawRows;
        if (totalRecords > rawRows.length) {
            try {
                const fetched = await fetchAllLedgerRows();
                if (fetched.length) {
                    allRows = fetched;
                }
            } catch {
                allRows = rawRows;
            }
        }
        return buildRowsWithBalance(allRows, {
            includeOpening: true,
            isFirstPage: true,
            isLastPage: true
        });
    }, [buildRowsWithBalance, fetchAllLedgerRows, rawRows, reportReady, totalRecords]);

    const handleExportCsv = () => {
        void (async () => {
            const rows = await buildExportRows();
            if (!rows.length && !reportReady) return;
            exportReportCsv({ ...exportContextBase, rows });
        })();
    };
    const handleExportExcel = () => {
        void (async () => {
            const rows = await buildExportRows();
            if (!rows.length && !reportReady) return;
            await exportReportExcel({ ...exportContextBase, rows });
        })();
    };
    const handleExportPdf = () => {
        void (async () => {
            const rows = await buildExportRows();
            if (!rows.length && !reportReady) return;
            exportReportPdf({ ...exportContextBase, rows });
        })();
    };

    const columns = useLedgerReportColumns({
        rows: rowsWithMeta,
        reportLoading: showSkeletonRows,
        totals,
        detailView,
        showNarration,
        isFormatTwo
    });

    const tableRows = isPrinting && printRows ? printRows : showSkeletonRows ? skeletonRows : filteredRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : tableRowsPerPage;

    const errorMessage = ledgerError?.message || error?.message || null;

    const headerLeft = (
        <LedgerReportFilters
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={handleFromDateChange}
            onToDateChange={handleToDateChange}
            fiscalYearStartDate={fiscalYearStartDate}
            fiscalYearEndDate={fiscalYearEndDate}
            fromDateInputRef={fromDateInputRef}
            toDateInputRef={toDateInputRef}
            dateErrors={dateErrors}
            todayInputRef={todayInputRef}
            todayOnly={todayOnly}
            onTodayToggle={handleTodayToggle}
            focusTodayInputNext={focusTodayInput}
            focusLedgerGroupInput={focusLedgerGroupInput}
            ledgerGroupId={ledgerGroupId}
            ledgerGroupOptions={ledgerGroupOptions}
            groupsLoading={groupsLoading}
            onLedgerGroupChange={handleLedgerGroupChange}
            focusCityInput={focusCityInput}
            ledgerGroupInputRef={ledgerGroupInputRef}
            cityAutoCompleteRef={cityAutoCompleteRef}
            cityQuery={cityQuery}
            setCityQuery={setCityQuery}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            citySuggestions={citySuggestions}
            setCitySuggestions={setCitySuggestions}
            cityOptions={cityOptions}
            onCityChange={handleCityChange}
            cityPanelOpen={cityPanelOpen}
            setCityPanelOpen={setCityPanelOpen}
            cityEnterRef={cityEnterRef}
            focusLedgerInput={focusLedgerInput}
            cityId={cityId}
            citiesLoading={citiesLoading}
            cityInputRef={cityInputRef}
            selectedLedger={selectedLedger}
            setSelectedLedger={setSelectedLedger}
            ledgerQuery={ledgerQuery}
            setLedgerQuery={setLedgerQuery}
            ledgerSuggestions={ledgerSuggestions}
            setLedgerSuggestions={setLedgerSuggestions}
            ledgerOptions={ledgerOptions}
            fetchLedgers={fetchLedgers}
            ledgerGroupFetchGroupId={ledgerGroupFilter.fetchGroupId}
            ledgerEnterRef={ledgerEnterRef}
            clearAppliedFilters={clearAppliedFilters}
            resetLedgerSelection={resetLedgerSelection}
            setPreviewLedger={setPreviewLedger}
            setLedgerId={setLedgerId}
            focusVoucherTypeInput={focusVoucherTypeInput}
            showLedgerSpinner={showLedgerSpinner}
            syncLedgerPreviewFromHighlight={syncLedgerPreviewFromHighlight}
            ledgerInputRef={ledgerInputRef}
            setLedgerPanelOpen={setLedgerPanelOpen}
            ledgerPanelOpen={ledgerPanelOpen}
            displayLedger={displayLedger}
            currentBalanceLabel={currentBalanceLabel}
            currentBalanceSeverity={currentBalanceSeverity}
            currentBalanceTooltip={currentBalanceTooltip}
            showBalanceBadges={showBalanceBadges}
            voucherTypeId={voucherTypeId}
            voucherTypeOptions={voucherTypeOptions}
            voucherTypesLoading={voucherTypesLoading}
            onVoucherTypeChange={handleVoucherTypeChange}
            focusDetailViewInput={focusDetailViewInput}
            voucherTypeInputRef={voucherTypeInputRef}
            reportFormat={reportFormat}
            setReportFormat={setReportFormat}
            detailViewInputRef={detailViewInputRef}
            detailView={detailView}
            setDetailView={setDetailView}
            showNarration={showNarration}
            setShowNarration={setShowNarration}
            openingBalanceAbove={openingBalanceAbove}
            setOpeningBalanceAbove={setOpeningBalanceAbove}
        />
    );

    const headerRight = (
        <>
            <Button
                label="SMS"
                icon="pi pi-mobile"
                className="p-button-text"
                onClick={handleSendLedgerStatementSmsClick}
                disabled={!canSendLedgerStatementSms || isSendingSms}
                loading={isSendingSms}
            />
            <Button
                label="WhatsApp"
                icon="pi pi-comments"
                className="p-button-text"
                onClick={handleSendLedgerStatementWhatsAppClick}
                disabled={!canSendLedgerStatementWhatsApp || isSendingWhatsApp}
                loading={isSendingWhatsApp}
            />
            <AppReportActions
                onRefresh={handleRefreshClick}
                onStatement={handleStatementClick}
                onPrint={handlePrintClick}
                onExportCsv={handleExportCsv}
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                loadingState={reportLoading}
                refreshDisabled={!canQuery}
                exportDisabled={!reportReady || rowsWithBalance.length === 0}
            />
        </>
    );

    return (
        <>
            <Toast ref={toastRef} />
            <div className="card app-gradient-card">
            <ReportPrintHeader
                className="mb-3"
                companyName={companyInfo.name}
                companyAddress={companyInfo.address}
                title={reportTitle}
                subtitle={filterSummary ?? undefined}
            />
            <ReportPrintFooter left={printFooterLeft} />
            <ReportHeader
                title="Ledger Statement"
                subtitle="Ledger entries with running balance for the selected filters."
                rightSlot={
                    <ReportRegisterSearch
                        value={globalSearchText}
                        onValueChange={setGlobalSearchText}
                        matchCase={globalSearchMatchCase}
                        onMatchCaseChange={setGlobalSearchMatchCase}
                        wholeWord={globalSearchWholeWord}
                        onWholeWordChange={setGlobalSearchWholeWord}
                    />
                }
                className="mb-3"
            />
            <LedgerReportSummary errorMessage={errorMessage} />

            <LedgerReportTable
                rows={tableRows}
                isPrinting={isPrinting}
                tablePageSize={tablePageSize}
                hasApplied={hasApplied}
                totalRecords={totalRecords}
                tableFirst={tableFirst}
                reportLoading={showSkeletonRows}
                onPage={handleTablePage}
                columnFilters={columnFilters}
                onFilter={handleColumnFilter}
                headerLeft={headerLeft}
                headerRight={headerRight}
                recordSummary={recordSummary}
                globalSearchValue={globalSearchText}
                onGlobalSearchValueChange={setGlobalSearchText}
                globalSearchMatchCase={globalSearchMatchCase}
                onGlobalSearchMatchCaseChange={setGlobalSearchMatchCase}
                globalSearchWholeWord={globalSearchWholeWord}
                onGlobalSearchWholeWordChange={setGlobalSearchWholeWord}
                columns={columns}
            />

            {appliedLedger && (
                <div className="mt-3 text-600 text-sm">
                    <span className="font-medium text-700">{appliedLedger.name}</span>
                    {appliedLedger.groupName ? <span> | {appliedLedger.groupName}</span> : null}
                </div>
            )}
            </div>
        </>
    );
}
