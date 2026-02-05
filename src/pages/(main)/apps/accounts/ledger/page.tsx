'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { type DataTableFilterEvent, type DataTableFilterMeta, type DataTablePageEvent } from 'primereact/datatable';
import { type AutoComplete, type AutoCompleteChangeEvent, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { RadioButton } from 'primereact/radiobutton';
import { Button } from 'primereact/button';
import { Link, useSearchParams } from 'react-router-dom';
import { gql, useApolloClient, useLazyQuery, useQuery } from '@apollo/client';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppDateInput from '@/components/AppDateInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import AppReportActions from '@/components/AppReportActions';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import VoucherTypeAutoComplete from '@/components/VoucherTypeAutoComplete';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { resolveLedgerGroupFilter } from '@/lib/accounts/ledgerGroupFilter';
import { useVoucherTypeOptions } from '@/lib/accounts/voucherTypes';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { formatReportTimestamp } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';

interface LedgerLookupRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    ledgerGroupId: number | null;
    cityId: number | null;
    cityName: string | null;
    address: string | null;
    openingBalanceAmount: string | null;
    balanceType: number | null;
}

interface LedgerLookupOption extends LedgerLookupRow {
    label: string;
}

type SelectOption = {
    label: string;
    value: number | null;
};

interface CityRow {
    cityId: number;
    name: string | null;
    stateName: string | null;
}

interface LedgerReportRow {
    id: number;
    date: string | null;
    voucherNo: string | null;
    voucherType: string | null;
    counterLedger: string | null;
    counterLedgerDetail: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    runningDelta: number;
}

type LedgerReportFilters = {
    ledgerId: number | null;
    voucherTypeId: number | null;
    cancelled: -1 | 0 | 1;
    fromDate: Date | null;
    toDate: Date | null;
};

type FilterOption<T extends string | number> = {
    label: string;
    value: T;
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

const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

const CITIES = gql`
    query Cities($search: String, $limit: Int) {
        cities(search: $search, limit: $limit) {
            cityId
            name
            stateName
        }
    }
`;

const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $ledgerGroupId: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1, ledgerGroupId: $ledgerGroupId) {
            items {
                ledgerId
                name
                groupName
                ledgerGroupId
                cityId
                cityName
                address
                openingBalanceAmount
                balanceType
            }
        }
    }
`;

const LEDGER_REPORT = gql`
    query LedgerReport(
        $ledgerId: Int!
        $search: String
        $voucherTypeId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        ledgerReport(
            ledgerId: $ledgerId
            search: $search
            voucherTypeId: $voucherTypeId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            limit: $limit
            offset: $offset
        ) {
            items {
                id
                date
                voucherNo
                voucherType
                counterLedger
                counterLedgerDetail
                narration
                debit
                credit
                runningDelta
            }
            totalCount
            debitTotal
            creditTotal
        }
    }
`;

const LEDGER_OPENING_BALANCE = gql`
    query LedgerOpeningBalance($ledgerId: Int!, $fromDate: String, $cancelled: Int) {
        ledgerOpeningBalance(ledgerId: $ledgerId, fromDate: $fromDate, cancelled: $cancelled) {
            amount
            drCr
        }
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

const ALL_LEDGER_LIMIT = 10000;
const SEARCH_LEDGER_LIMIT = 200;

const amountFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

const formatAmount = (value: number) => amountFormatter.format(value);

const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDate = (value: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return dateFormatter.format(parsed);
    return trimmed;
};

const formatDateLabel = (value: Date | null) => {
    if (!value) return '';
    return formatDate(toDateText(value));
};

const formatDateRangeLabel = (from: Date | null, to: Date | null) => {
    const fromText = formatDateLabel(from);
    const toText = formatDateLabel(to);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
};

const formatBalance = (signed: number) => {
    const side = signed >= 0 ? 'Dr' : 'Cr';
    return `${formatAmount(Math.abs(signed))} ${side}`;
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
    date: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    counterLedger: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    narration: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    particulars: {
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

const parseDateParam = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return new Date(Number(yyyymmdd[1]), Number(yyyymmdd[2]) - 1, Number(yyyymmdd[3]));
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return null;
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

export default function AccountsLedgerReportPage() {
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
    const [printRows, setPrintRows] = useState<Array<LedgerReportRow & { running: number }> | null>(null);
    const [appliedFilters, setAppliedFilters] = useState<LedgerReportFilters | null>(null);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
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
    const cityInputRef = useRef<HTMLInputElement>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const voucherTypeInputRef = useRef<AutoComplete>(null);
    const detailViewInputRef = useRef<HTMLInputElement>(null);
    const cityEnterRef = useRef(false);
    const ledgerEnterRef = useRef(false);
    const hasTouchedDatesRef = useRef(false);
    const autoRefreshRef = useRef(false);

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
        fetchPolicy: 'network-only'
    });

    const [loadLedgerReport, { data, loading, error }] = useLazyQuery(LEDGER_REPORT, {
        fetchPolicy: 'network-only'
    });

    const [loadOpeningBalance, { data: openingData, loading: openingLoading }] = useLazyQuery(LEDGER_OPENING_BALANCE, {
        fetchPolicy: 'network-only'
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

    const reportLoading = hasApplied && (loading || openingLoading);
    const reportReady = hasApplied && !reportLoading;
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

    const rawRows: LedgerReportRow[] = useMemo(
        () => (reportReady ? data?.ledgerReport?.items ?? [] : []),
        [data, reportReady]
    );

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
        if (reportLoading) return 'Loading ledger statement...';
        return `${totalRecords} posting${totalRecords === 1 ? '' : 's'} | Dr ${formatAmount(totals.debitTotal)} | Cr ${formatAmount(totals.creditTotal)}`;
    }, [hasApplied, reportLoading, totalRecords, totals.creditTotal, totals.debitTotal]);

    const debitFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.debitTotal);
    const creditFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.creditTotal);
    const closingFooter = reportLoading ? skeletonCell('4rem') : formatBalance(totals.closing);

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

    const canQuery = Boolean(ledgerId && fromDate && toDate);
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

    const rowsWithMeta = useMemo(
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

    const dateFilterOptions = useMemo(
        () => buildDateFilterOptions(rowsWithMeta.map((row) => row.date)),
        [rowsWithMeta]
    );
    const voucherNoFilterOptions = useMemo(
        () => buildTextFilterOptions(rowsWithMeta.map((row) => row.voucherNo)),
        [rowsWithMeta]
    );
    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(rowsWithMeta.map((row) => row.voucherType)),
        [rowsWithMeta]
    );
    const counterLedgerFilterOptions = useMemo(
        () => buildTextFilterOptions(rowsWithMeta.map((row) => row.counterLedger)),
        [rowsWithMeta]
    );
    const narrationFilterOptions = useMemo(
        () => buildTextFilterOptions(rowsWithMeta.map((row) => row.narration)),
        [rowsWithMeta]
    );
    const particularsFilterOptions = useMemo(
        () => buildTextFilterOptions(rowsWithMeta.map((row) => row.particulars)),
        [rowsWithMeta]
    );
    const debitFilterOptions = useMemo(
        () => buildNumberFilterOptions(rowsWithMeta.map((row) => row.debit)),
        [rowsWithMeta]
    );
    const creditFilterOptions = useMemo(
        () => buildNumberFilterOptions(rowsWithMeta.map((row) => row.credit)),
        [rowsWithMeta]
    );
    const balanceFilterOptions = useMemo(
        () => buildNumberFilterOptions(rowsWithMeta.map((row) => row.balance)),
        [rowsWithMeta]
    );

    const dateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(dateFilterOptions, 'Any'),
        [dateFilterOptions]
    );
    const voucherNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherNoFilterOptions, 'Any'),
        [voucherNoFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions, 'Any'),
        [voucherTypeFilterOptions]
    );
    const counterLedgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(counterLedgerFilterOptions, 'Any'),
        [counterLedgerFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions, 'Any'),
        [narrationFilterOptions]
    );
    const particularsFilterElement = useMemo(
        () => buildMultiSelectFilterElement(particularsFilterOptions, 'Any'),
        [particularsFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions, 'Any'),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions, 'Any'),
        [creditFilterOptions]
    );
    const balanceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(balanceFilterOptions, 'Any'),
        [balanceFilterOptions]
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

    const dateBody = (row: any) => (isSkeletonRow(row) ? skeletonCell('4.5rem') : formatDate(row.date ?? null));
    const voucherNoBody = (row: any) => (isSkeletonRow(row) ? skeletonCell('5rem') : row.voucherNo ?? '');
    const voucherTypeBody = (row: any) => (isSkeletonRow(row) ? skeletonCell('5rem') : row.voucherType ?? '');
    const counterLedgerBody = (row: any) =>
        isSkeletonRow(row) ? skeletonCell('10rem') : row.counterLedger ?? '';
    const narrationBody = (row: any) => (isSkeletonRow(row) ? skeletonCell('10rem') : row.narration ?? '');
    const particularsCell = (row: any) =>
        isSkeletonRow(row) ? (
            skeletonCell('12rem')
        ) : (
            <span style={{ whiteSpace: 'pre-line' }}>{resolveParticularsText(row)}</span>
        );
    const debitBody = (row: any) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.debit ? formatAmount(row.debit) : '';
    const creditBody = (row: any) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.credit ? formatAmount(row.credit) : '';
    const balanceBody = (row: any) =>
        isSkeletonRow(row) ? skeletonCell('5rem') : formatBalance(Number(row.running ?? 0));

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

    const tableRows = isPrinting && printRows ? printRows : reportLoading ? skeletonRows : filteredRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : tableRowsPerPage;

    const formatTwoColumns = [
        <Column
            key="date"
            field="date"
            header="Date"
            body={dateBody}
            style={{ width: '8rem' }}
            footer="Total"
            footerStyle={{ fontWeight: 600 }}
            filterElement={dateFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherNo"
            field="voucherNo"
            header="Voucher No"
            body={voucherNoBody}
            style={{ width: '7rem' }}
            filterElement={voucherNoFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="particulars"
            field="particulars"
            header="Particulars"
            body={particularsCell}
            filterElement={particularsFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherType"
            field="voucherType"
            header="Type"
            body={voucherTypeBody}
            style={{ width: '9rem' }}
            filterElement={voucherTypeFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="debit"
            field="debit"
            header="Dr Amt"
            body={debitBody}
            style={{ width: '8.5rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={debitFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={debitFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="credit"
            field="credit"
            header="Cr Amt"
            body={creditBody}
            style={{ width: '8.5rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={creditFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={creditFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="balance"
            field="balance"
            header="Balance"
            body={balanceBody}
            style={{ width: '10rem', fontWeight: 600 }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={closingFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={balanceFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />
    ];

    const formatOneColumns = [
        <Column
            key="date"
            field="date"
            header="Date"
            body={dateBody}
            style={{ width: '8rem' }}
            footer="Total"
            footerStyle={{ fontWeight: 600 }}
            filterElement={dateFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherNo"
            field="voucherNo"
            header="Voucher No"
            body={voucherNoBody}
            style={{ width: '7rem' }}
            filterElement={voucherNoFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherType"
            field="voucherType"
            header="Type"
            body={voucherTypeBody}
            style={{ width: '9rem' }}
            filterElement={voucherTypeFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        ...(detailView
            ? [
                  <Column
                      key="counterLedger"
                      field="counterLedger"
                      header="Ag. Ledger"
                      body={counterLedgerBody}
                      filterElement={counterLedgerFilterElement}
                      {...MULTISELECT_COLUMN_PROPS}
                  />
              ]
            : []),
        ...(showNarration
            ? [
                  <Column
                      key="narration"
                      field="narration"
                      header="Narration"
                      body={narrationBody}
                      filterElement={narrationFilterElement}
                      {...MULTISELECT_COLUMN_PROPS}
                  />
              ]
            : []),
        <Column
            key="debit"
            field="debit"
            header="Dr Amt"
            body={debitBody}
            style={{ width: '8.5rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={debitFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={debitFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="credit"
            field="credit"
            header="Cr Amt"
            body={creditBody}
            style={{ width: '8.5rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={creditFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={creditFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="balance"
            field="balance"
            header="Balance"
            body={balanceBody}
            style={{ width: '10rem', fontWeight: 600 }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={closingFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={balanceFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />
    ];

    const tableColumns = isFormatTwo ? formatTwoColumns : formatOneColumns;

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
                        <h2 className="m-0">Ledger Statement</h2>
                        <p className="mt-2 mb-0 text-600">
                            Ledger book using voucher postings. Select a ledger and apply date/voucher filters.
                        </p>
                    </div>
                </div>
                {(ledgerError || error) && (
                    <p className="text-red-500 m-0">
                        Error loading ledger report: {ledgerError?.message || error?.message}
                    </p>
                )}
            </div>

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                lazy={!isPrinting}
                totalRecords={hasApplied ? totalRecords : 0}
                first={isPrinting ? 0 : tableFirst}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                onPage={handleTablePage}
                rowsPerPageOptions={[10, 15, 30, 50, 100]}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                dataKey="id"
                stripedRows
                size="small"
                className="summary-table ledger-statement-table"
                emptyMessage={
                    reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load ledger statement'
                }
                headerLeft={
                    <div className="flex flex-column gap-2">
                        <div className="flex flex-wrap align-items-center gap-2">
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
                                onEnterNext={focusTodayInput}
                                style={{ width: '150px' }}
                            />
                            {(dateErrors.fromDate || dateErrors.toDate) && (
                                <span className="p-error text-sm">
                                    {dateErrors.fromDate || dateErrors.toDate}
                                </span>
                            )}
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="ledger-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(e) => handleTodayToggle(Boolean(e.checked))}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        event.preventDefault();
                                        focusLedgerGroupInput();
                                    }}
                                />
                                <label htmlFor="ledger-today">Today</label>
                            </div>
                        </div>
                        <div className="flex flex-wrap align-items-center gap-2">
                            <LedgerGroupAutoComplete
                                value={ledgerGroupId}
                                options={ledgerGroupOptions}
                                loading={groupsLoading}
                                onChange={(nextValue) => handleLedgerGroupChange(nextValue)}
                                placeholder="Ledger group"
                                loadingPlaceholder="Loading groups..."
                                onSelectNext={focusCityInput}
                                inputId="ledger-group-autocomplete"
                                ref={ledgerGroupInputRef}
                                style={{ minWidth: '220px' }}
                            />
                            <AppAutoComplete
                                value={cityQuery.length ? cityQuery : selectedCity}
                                suggestions={citySuggestions}
                                completeMethod={(event: AutoCompleteCompleteEvent) => {
                                    const query = event.query ?? '';
                                    setCityQuery(query);
                                    const needle = query.trim().toLowerCase();
                                    const filtered = needle
                                        ? cityOptions.filter((c) => c.label.toLowerCase().includes(needle))
                                        : cityOptions;
                                    setCitySuggestions(filtered);
                                }}
                                onDropdownClick={() => {
                                    setCitySuggestions([...cityOptions]);
                                }}
                                onChange={(event: AutoCompleteChangeEvent) => {
                                    const value = event.value as SelectOption | string | null;
                                    const shouldFocusLedger = cityEnterRef.current;
                                    cityEnterRef.current = false;
                                    if (value == null) {
                                        setCityQuery('');
                                        setSelectedCity(null);
                                        handleCityChange(null);
                                        if (shouldFocusLedger) {
                                            focusLedgerInput();
                                        }
                                        return;
                                    }
                                    if (typeof value === 'string') {
                                        setCityQuery(value);
                                        if (!value.trim()) {
                                            setSelectedCity(null);
                                            handleCityChange(null);
                                            if (shouldFocusLedger) {
                                                focusLedgerInput();
                                            }
                                        }
                                        if (shouldFocusLedger) {
                                            focusLedgerInput();
                                        }
                                        return;
                                    }
                                    setCityQuery('');
                                    setSelectedCity(value);
                                    handleCityChange(value.value ?? null);
                                    if (shouldFocusLedger) {
                                        focusLedgerInput();
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    cityEnterRef.current = true;
                                    if (!cityPanelOpen) {
                                        cityEnterRef.current = false;
                                        focusLedgerInput();
                                    }
                                }}
                                onBlur={() => {
                                    setCityQuery('');
                                    if (!cityId || cityId <= 0) {
                                        setSelectedCity(null);
                                        return;
                                    }
                                    const match = cityOptions.find((c) => Number(c.value) === Number(cityId)) ?? null;
                                    setSelectedCity(match);
                                }}
                                onShow={() => setCityPanelOpen(true)}
                                onHide={() => {
                                    setCityPanelOpen(false);
                                    if (cityEnterRef.current) {
                                        cityEnterRef.current = false;
                                        focusLedgerInput();
                                    }
                                }}
                                field="label"
                                placeholder={citiesLoading ? 'Loading cities...' : 'City'}
                                inputId="ledger-city-autocomplete"
                                inputRef={cityInputRef}
                                style={{ minWidth: '220px' }}
                            />
                            <div className="flex align-items-center gap-2 ledger-ledger-meta">
                                <LedgerAutoComplete
                                    value={selectedLedger ?? ledgerQuery}
                                    suggestions={ledgerSuggestions}
                                    completeMethod={(e) => {
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
                                    onChange={(e) => {
                                        const value = e.value as LedgerLookupOption | string | null;
                                        const shouldFocusVoucher = ledgerEnterRef.current;
                                        ledgerEnterRef.current = false;
                                        clearAppliedFilters();
                                        if (value == null) {
                                            setLedgerQuery('');
                                            resetLedgerSelection();
                                            setPreviewLedger(null);
                                            if (shouldFocusVoucher) {
                                                focusVoucherTypeInput();
                                            }
                                            return;
                                        }
                                        if (typeof value === 'string') {
                                            setLedgerQuery(value);
                                            setSelectedLedger(null);
                                            setLedgerId(null);
                                            setPreviewLedger(null);
                                            if (shouldFocusVoucher) {
                                                focusVoucherTypeInput();
                                            }
                                            return;
                                        }
                                        setLedgerQuery('');
                                        setSelectedLedger(value);
                                        setLedgerId(Number(value.ledgerId));
                                        setPreviewLedger(null);
                                        if (shouldFocusVoucher) {
                                            focusVoucherTypeInput();
                                        }
                                    }}
                                    itemTemplate={(option: LedgerLookupOption) => (
                                        <span data-ledger-id={option.ledgerId} onMouseEnter={() => setPreviewLedger(option)}>
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
                                            focusVoucherTypeInput();
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
                                            focusVoucherTypeInput();
                                        }
                                    }}
                                    virtualScrollerOptions={{ itemSize: 36 }}
                                    inputRef={ledgerInputRef}
                                    style={{ minWidth: '260px' }}
                                />
                                {displayLedger && (
                                    <LedgerMetaPanel
                                        address={displayLedger.address}
                                        balanceLabel={currentBalanceLabel}
                                        balanceSeverity={currentBalanceSeverity}
                                        showBalance={showBalanceBadges}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap align-items-center gap-2">
                            <VoucherTypeAutoComplete
                                value={voucherTypeId}
                                options={voucherTypeOptions}
                                loading={voucherTypesLoading}
                                onChange={(nextValue) => handleVoucherTypeChange(nextValue)}
                                placeholder="Voucher type"
                                loadingPlaceholder="Loading voucher types..."
                                onSelectNext={focusDetailViewInput}
                                inputId="ledger-voucher-type-autocomplete"
                                ref={voucherTypeInputRef}
                                style={{ minWidth: '190px' }}
                            />
                        </div>
                        <fieldset className="ledger-report-group">
                            <legend>View Options</legend>
                            <div className="flex flex-wrap align-items-center gap-3 ledger-inline-row">
                                <div className="flex align-items-center gap-2">
                                    <RadioButton
                                        inputId="ledger-format-1"
                                        name="ledger-format"
                                        value={1}
                                        checked={reportFormat === 1}
                                        onChange={() => setReportFormat(1)}
                                    />
                                    <label htmlFor="ledger-format-1">Normal</label>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <RadioButton
                                        inputId="ledger-format-2"
                                        name="ledger-format"
                                        value={2}
                                        checked={reportFormat === 2}
                                        onChange={() => setReportFormat(2)}
                                    />
                                    <label htmlFor="ledger-format-2">Detailed</label>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <Checkbox
                                        inputId="ledger-detail-view"
                                        inputRef={detailViewInputRef}
                                        checked={detailView}
                                        onChange={(e) => setDetailView(Boolean(e.checked))}
                                    />
                                    <label htmlFor="ledger-detail-view">Ag. Ledger</label>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <Checkbox
                                        inputId="ledger-narration"
                                        checked={showNarration}
                                        onChange={(e) => setShowNarration(Boolean(e.checked))}
                                    />
                                    <label htmlFor="ledger-narration">Narration</label>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <Checkbox
                                        inputId="ledger-opening-above"
                                        checked={openingBalanceAbove}
                                        onChange={(e) => setOpeningBalanceAbove(Boolean(e.checked))}
                                    />
                                    <label htmlFor="ledger-opening-above">Opening balance above</label>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                }
                headerRight={
                    <AppReportActions
                        onRefresh={handleRefreshClick}
                        onStatement={handleStatementClick}
                        onPrint={handlePrintClick}
                        onExportCsv={handleExportCsv}
                        onExportExcel={handleExportExcel}
                        onExportPdf={handleExportPdf}
                        refreshDisabled={!canQuery}
                        exportDisabled={!reportReady || rowsWithBalance.length === 0}
                    />
                }
                recordSummary={recordSummary}
            >
                {tableColumns}
            </ReportDataTable>

            {appliedLedger && (
                <div className="mt-3 text-600 text-sm">
                    <span className="font-medium text-700">{appliedLedger.name}</span>
                    {appliedLedger.groupName ? <span> | {appliedLedger.groupName}</span> : null}
                </div>
            )}
        </div>
    );
}
