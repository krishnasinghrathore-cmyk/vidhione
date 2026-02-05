'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { Button } from 'primereact/button';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import { classNames } from 'primereact/utils';
import AppDropdown from '@/components/AppDropdown';
import { AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppDateInput from '@/components/AppDateInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';

type TrialBalanceViewMode = 'summarized' | 'detailed';

type SelectOption = {
    label: string;
    value: number | null;
};

interface TrialBalanceRow {
    id: number;
    ledgerGroup: string | null;
    groupId: number | null;
    annexure: string | null;
    ledger: string | null;
    ledgerId: number | null;
    openingBalance: number;
    openingDrCr: string;
    debitAmount: number;
    creditAmount: number;
    closingBalance: number;
    closingDrCr: string;
    defaultDrCr: string;
    transferTo: string | null;
    postingAmount: number;
    postingDiff: number;
    postingVoucherId: number | null;
    voucherNo: string | null;
    voucherDate: string | null;
    taxRate: number | null;
}

interface VoucherTypeRow {
    voucherTypeId: number;
    voucherTypeName: string | null;
    displayName: string | null;
    voucherTypeCode: number | null;
}

type TrialBalanceRowType = 'detail' | 'group-summary' | 'group-total';

type TrialBalanceDisplayRow = TrialBalanceRow & {
    rowKey: string;
    isSkeleton?: boolean;
    isGroupTotal?: boolean;
    rowType?: TrialBalanceRowType;
    isFirstInGroup?: boolean;
    ledgerGroupFilter?: string;
};

type TrialBalanceGroup = {
    key: string;
    groupId: number | null;
    label: string;
    annexure: string | null;
    taxRate: number | null;
    rows: TrialBalanceDisplayRow[];
    openingSigned: number;
    debit: number;
    credit: number;
};

type AppliedFilters = {
    viewMode: TrialBalanceViewMode;
    displayMode: 'trial' | 'summary';
    fromDate: Date | null;
    toDate: Date | null;
    voucherTypeId: number | null;
    entryType: EntryType;
    balanceStatus: number;
    taxType: number;
    rcmStatus: number;
};

type EntryType = 'all' | 'sales' | 'purchase' | 'debit' | 'credit' | 'journal';

const TRIAL_BALANCE = gql`
    query TrialBalanceLegacy(
        $fromDate: String
        $toDate: String
        $ledgerGroupId: Int
        $ledgerId: Int
        $cityId: Int
        $areaId: Int
        $options: Int
        $balanceStatus: Int
        $taxType: Int
        $isPostingView: Int
        $voucherTypeId: Int
        $voucherType: Int
        $isReverseChargeApplicable: Int
        $isTaxation: Int
    ) {
        trialBalanceLegacy(
            fromDate: $fromDate
            toDate: $toDate
            ledgerGroupId: $ledgerGroupId
            ledgerId: $ledgerId
            cityId: $cityId
            areaId: $areaId
            options: $options
            balanceStatus: $balanceStatus
            taxType: $taxType
            isPostingView: $isPostingView
            voucherTypeId: $voucherTypeId
            voucherType: $voucherType
            isReverseChargeApplicable: $isReverseChargeApplicable
            isTaxation: $isTaxation
        ) {
            id
            ledgerGroup
            groupId
            annexure
            ledger
            ledgerId
            openingBalance
            openingDrCr
            debitAmount
            creditAmount
            closingBalance
            closingDrCr
            defaultDrCr
            transferTo
            postingAmount
            postingDiff
            postingVoucherId
            voucherNo
            voucherDate
            taxRate
        }
    }
`;

const VOUCHER_TYPES = gql`
    query VoucherTypeMasters {
        voucherTypeMasters {
            voucherTypeId
            voucherTypeName
            displayName
            voucherTypeCode
        }
    }
`;

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

const toDateText = (date: Date | null) => {
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

const formatDateRangeLabel = (from: Date | null, to: Date | null) => {
    const fromText = formatDateLabel(from);
    const toText = formatDateLabel(to);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
};

const parseDateFromParts = (yearText: string, monthText: string, dayText: string) => {
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
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

const resolveOptionLabel = (value: number | null, options: SelectOption[], fallback: string) => {
    if (value == null || value === 0) return 'All';
    const match = options.find((option) => Number(option.value) === Number(value));
    return match?.label ?? `${fallback} ${value}`;
};

const resolveSignedAmount = (amount: number, drCr: string | null | undefined) =>
    drCr === 'Cr' ? -Math.abs(amount) : Math.abs(amount);

const resolveDrCrFromSigned = (value: number) => (value >= 0 ? 'Dr' : 'Cr');

const BALANCE_STATUS_OPTIONS = [
    { label: 'All', value: 0 },
    { label: 'Only Zero Balance', value: 1 },
    { label: 'Omit Zero Balance', value: 2 },
    { label: 'Annexure / Outstanding', value: 3 },
    { label: 'Annexure Print', value: 4 }
] as const;

const ENTRY_TYPE_OPTIONS: Array<{ label: string; value: EntryType; voucherType: number; isTaxation: number }> = [
    { label: 'All', value: 'all', voucherType: -1, isTaxation: -1 },
    { label: 'Sales', value: 'sales', voucherType: 1, isTaxation: -1 },
    { label: 'Purchase', value: 'purchase', voucherType: 0, isTaxation: -1 },
    { label: 'Debit Note', value: 'debit', voucherType: 4, isTaxation: -1 },
    { label: 'Credit Note', value: 'credit', voucherType: 5, isTaxation: -1 },
    { label: 'Journal', value: 'journal', voucherType: -1, isTaxation: 1 }
];

const TAX_TYPE_OPTIONS = [
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

const RCM_OPTIONS = [
    { label: 'All', value: -1 },
    { label: 'Applicable', value: 1 },
    { label: 'Not Applicable', value: 0 }
];

const BALANCE_STATUS_DROPDOWN_OPTIONS = BALANCE_STATUS_OPTIONS.filter((option) => option.value !== 0);
const ENTRY_TYPE_DROPDOWN_OPTIONS = ENTRY_TYPE_OPTIONS.filter((option) => option.value !== 'all');
const TAX_TYPE_DROPDOWN_OPTIONS = TAX_TYPE_OPTIONS.filter((option) => option.value !== -1);
const RCM_DROPDOWN_OPTIONS = RCM_OPTIONS.filter((option) => option.value !== -1);

const DISPLAY_MODE_OPTIONS = [
    { label: 'Full Trial Balance', value: 'trial' },
    { label: 'Closing Balance Summary', value: 'summary' }
] as const;

const viewOptionLabel = (value: TrialBalanceViewMode) => (value === 'summarized' ? 'Summarized' : 'Detailed');

const filterOptions = (options: SelectOption[], query: string) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
};

export type TrialBalanceReportProps = {
    initialView?: TrialBalanceViewMode;
};

export const TrialBalanceReport = ({ initialView = 'detailed' }: TrialBalanceReportProps) => {
    const { companyContext } = useAuth();
    const { setPageTitle } = useContext(LayoutContext);
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current.end ?? null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [viewMode] = useState<TrialBalanceViewMode>(initialView);
    const [displayMode, setDisplayMode] = useState<'trial' | 'summary'>('trial');
    const [voucherTypeId, setVoucherTypeId] = useState<number | null>(null);
    const [entryType, setEntryType] = useState<EntryType>('all');
    const [balanceStatus, setBalanceStatus] = useState<number>(2);
    const [taxType, setTaxType] = useState<number>(-1);
    const [rcmStatus, setRcmStatus] = useState<number>(-1);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [isPrinting, setIsPrinting] = useState(false);
    const [printRows, setPrintRows] = useState<TrialBalanceDisplayRow[] | null>(null);

    useEffect(() => {
        const label = viewMode === 'detailed' ? 'Trial Balance (Detailed)' : 'Trial Balance (Summarized)';
        setPageTitle(label);
        return () => setPageTitle(null);
    }, [setPageTitle, viewMode]);

    const [voucherTypeQuery, setVoucherTypeQuery] = useState('');
    const [voucherTypeSuggestions, setVoucherTypeSuggestions] = useState<SelectOption[]>([]);
    const [selectedVoucherType, setSelectedVoucherType] = useState<SelectOption | null>(null);

    const hasTouchedDatesRef = useRef(false);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const voucherTypeInputRef = useRef<HTMLInputElement>(null);
    const balanceStatusRef = useRef<Dropdown>(null);
    const entryTypeRef = useRef<Dropdown>(null);
    const taxTypeRef = useRef<Dropdown>(null);
    const rcmRef = useRef<Dropdown>(null);

    const { data: voucherTypesData } = useQuery(VOUCHER_TYPES);

    const [loadTrialBalance, { data: reportData, loading: reportLoading, error: reportError }] = useLazyQuery(
        TRIAL_BALANCE,
        { fetchPolicy: 'network-only' }
    );

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setFromDate(range.start ?? null);
        setToDate(range.end ?? null);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const focusInput = (ref: React.RefObject<HTMLInputElement>) => {
        const element = ref.current;
        if (element) element.focus();
    };

    const focusDropdown = (ref: React.RefObject<Dropdown>) => {
        ref.current?.focus?.();
    };

    const focusElementById = (id: string) => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(id);
        if (element instanceof HTMLElement) {
            element.focus();
        }
    };

    const handleEnterFocusDropdown =
        (next: React.RefObject<Dropdown>) => (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.key !== 'Enter' || event.defaultPrevented) return;
            event.preventDefault();
            event.stopPropagation();
            focusDropdown(next);
        };

    const handleEnterFocusById = (id: string) => (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        focusElementById(id);
    };

    const voucherTypeOptions = useMemo<SelectOption[]>(() => {
        const rows = (voucherTypesData?.voucherTypeMasters ?? []) as VoucherTypeRow[];
        return rows.map((row) => ({
            label: row.displayName || row.voucherTypeName || `Voucher ${row.voucherTypeId}`,
            value: Number(row.voucherTypeId)
        }));
    }, [voucherTypesData]);

    const clearAppliedFilters = useCallback(() => {
        setAppliedFilters(null);
    }, []);

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

    const handleVoucherTypeChange = (value: number | null) => {
        setVoucherTypeId(value);
        clearAppliedFilters();
    };

    const canRefresh = Boolean(fromDate && toDate);
    const refreshButtonId = 'trial-balance-refresh';
    const optionsValue = viewMode === 'summarized' ? 0 : 1;
    const entryTypeConfig = ENTRY_TYPE_OPTIONS.find((option) => option.value === entryType) ?? ENTRY_TYPE_OPTIONS[0];

    const handleRefresh = () => {
        if (!canRefresh) return;
        const validation = validateDateRange({ fromDate, toDate }, initialRangeRef.current);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        setAppliedFilters({
            viewMode,
            displayMode,
            fromDate,
            toDate,
            voucherTypeId,
            entryType,
            balanceStatus,
            taxType,
            rcmStatus
        });
        setLastRefreshedAt(new Date());
        loadTrialBalance({
            variables: {
                fromDate: toDateText(fromDate),
                toDate: toDateText(toDate),
                ledgerGroupId: 0,
                ledgerId: 0,
                cityId: 0,
                areaId: 0,
                options: optionsValue,
                balanceStatus,
                taxType,
                isPostingView: 0,
                voucherTypeId: voucherTypeId ?? 0,
                voucherType: entryTypeConfig.voucherType,
                isReverseChargeApplicable: rcmStatus,
                isTaxation: entryTypeConfig.isTaxation
            }
        });
    };

    const reportRows: TrialBalanceRow[] = useMemo(
        () => (appliedFilters ? (reportData?.trialBalanceLegacy ?? []) : []),
        [appliedFilters, reportData]
    );

    const baseRows = useMemo<TrialBalanceDisplayRow[]>(() => {
        return reportRows.map((row, idx) => ({
            ...row,
            rowKey: row.ledgerId ? `row-${row.ledgerId}-${idx}` : `row-${idx}`,
            ledgerGroupFilter: row.ledgerGroup ?? ''
        }));
    }, [reportRows]);

    const groupedRows = useMemo<TrialBalanceGroup[]>(() => {
        if (viewMode !== 'detailed') return [];
        const groups = new Map<string, TrialBalanceGroup>();
        const ordered: TrialBalanceGroup[] = [];

        baseRows.forEach((row) => {
            const rawGroupId = row.groupId != null ? Number(row.groupId) : null;
            const rowLabel = (row.ledgerGroup ?? '').trim();
            const fallbackLabel = rawGroupId && rawGroupId > 0 ? `Group ${rawGroupId}` : 'Group';
            const label = rowLabel || fallbackLabel;
            const key = rawGroupId && rawGroupId > 0 ? `id-${rawGroupId}` : `name-${label}`;
            let group = groups.get(key);
            if (!group) {
                group = {
                    key,
                    groupId: rawGroupId,
                    label,
                    annexure: row.annexure ?? null,
                    taxRate: row.taxRate ?? null,
                    rows: [],
                    openingSigned: 0,
                    debit: 0,
                    credit: 0
                };
                groups.set(key, group);
                ordered.push(group);
            }
            group.rows.push(row);
            group.openingSigned += resolveSignedAmount(Number(row.openingBalance ?? 0), row.openingDrCr);
            group.debit += Number(row.debitAmount ?? 0);
            group.credit += Number(row.creditAmount ?? 0);
            if (!group.annexure && row.annexure) {
                group.annexure = row.annexure;
            }
            if (row.taxRate != null) {
                group.taxRate =
                    group.taxRate == null ? row.taxRate : Math.max(group.taxRate, Number(row.taxRate));
            }
            if (rowLabel && group.label !== rowLabel) {
                group.label = rowLabel;
            }
        });

        return ordered;
    }, [baseRows, viewMode]);

    const groupIds = useMemo(
        () => groupedRows.map((group) => group.groupId).filter((id): id is number => id != null && id > 0),
        [groupedRows]
    );

    useEffect(() => {
        if (!appliedFilters) {
            setExpandedGroups(new Set());
            return;
        }
        setExpandedGroups(new Set());
    }, [appliedFilters, groupIds, viewMode]);

    const canToggleExpand = viewMode === 'detailed' && Boolean(appliedFilters) && groupIds.length > 0;
    const allGroupsExpanded = canToggleExpand && expandedGroups.size === groupIds.length;
    const expandAllDisabled = !canToggleExpand || allGroupsExpanded;
    const collapseAllDisabled = !canToggleExpand || expandedGroups.size === 0;

    const toggleGroupExpansion = useCallback((groupId: number) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    }, []);

    const expandAllGroups = useCallback(() => {
        setExpandedGroups(new Set(groupIds));
    }, [groupIds]);

    const collapseAllGroups = useCallback(() => {
        setExpandedGroups(new Set());
    }, []);

    const displayRows = useMemo<TrialBalanceDisplayRow[]>(() => {
        if (!appliedFilters) return [];
        if (viewMode !== 'detailed') return baseRows;
        const rows: TrialBalanceDisplayRow[] = [];

        groupedRows.forEach((group) => {
            const groupId = group.groupId;
            const isExpandable = groupId != null && groupId > 0;
            const isExpanded = !isExpandable || expandedGroups.has(groupId);
            const closingSigned = group.openingSigned + group.debit - group.credit;
            const openingBalance = Math.abs(group.openingSigned);
            const closingBalance = Math.abs(closingSigned);
            const summaryRow: TrialBalanceDisplayRow = {
                id: -1,
                ledgerGroup: group.label,
                groupId: group.groupId,
                annexure: group.annexure ?? '',
                ledger: '',
                ledgerId: null,
                openingBalance,
                openingDrCr: resolveDrCrFromSigned(group.openingSigned),
                debitAmount: group.debit,
                creditAmount: group.credit,
                closingBalance,
                closingDrCr: resolveDrCrFromSigned(closingSigned),
                defaultDrCr: '',
                transferTo: '',
                postingAmount: 0,
                postingDiff: 0,
                postingVoucherId: null,
                voucherNo: null,
                voucherDate: null,
                taxRate: group.taxRate,
                rowKey: `group-summary-${group.key}`,
                rowType: 'group-summary',
                ledgerGroupFilter: group.label
            };
            const totalRow: TrialBalanceDisplayRow = {
                ...summaryRow,
                ledgerGroup: 'Group Total',
                annexure: '',
                rowKey: `group-total-${group.key}`,
                rowType: 'group-total',
                isGroupTotal: true,
                ledgerGroupFilter: group.label
            };

            if (!isExpanded) {
                rows.push(summaryRow);
                return;
            }

            group.rows.forEach((row, idx) => {
                rows.push({
                    ...row,
                    rowType: 'detail',
                    isFirstInGroup: idx === 0,
                    ledgerGroup: idx === 0 ? group.label : '',
                    ledgerGroupFilter: group.label
                });
            });
            rows.push(totalRow);
        });

        return rows;
    }, [appliedFilters, baseRows, expandedGroups, groupedRows, viewMode]);

    const loadingApplied = Boolean(appliedFilters && reportLoading);
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                id: idx + 1,
                ledgerGroup: '',
                groupId: null,
                annexure: '',
                ledger: '',
                ledgerId: null,
                openingBalance: 0,
                openingDrCr: '',
                debitAmount: 0,
                creditAmount: 0,
                closingBalance: 0,
                closingDrCr: '',
                defaultDrCr: '',
                transferTo: '',
                postingAmount: 0,
                postingDiff: 0,
                postingVoucherId: null,
                voucherNo: null,
                voucherDate: null,
                taxRate: null,
                rowKey: `skeleton-${idx}`,
                isSkeleton: true,
                ledgerGroupFilter: ''
            })),
        []
    );

    const tableRows = isPrinting && printRows ? printRows : loadingApplied ? skeletonRows : displayRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : 10;

    const filterSourceRows = useMemo(
        () => baseRows.filter((row) => !row.isGroupTotal),
        [baseRows]
    );
    const ledgerGroupFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.ledgerGroupFilter)),
        [filterSourceRows]
    );
    const annexureFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.annexure)),
        [filterSourceRows]
    );
    const ledgerFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.ledger)),
        [filterSourceRows]
    );
    const openingBalanceFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterSourceRows.map((row) => row.openingBalance)),
        [filterSourceRows]
    );
    const openingDrCrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.openingDrCr)),
        [filterSourceRows]
    );
    const debitFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterSourceRows.map((row) => row.debitAmount)),
        [filterSourceRows]
    );
    const creditFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterSourceRows.map((row) => row.creditAmount)),
        [filterSourceRows]
    );
    const closingBalanceFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterSourceRows.map((row) => row.closingBalance)),
        [filterSourceRows]
    );
    const closingDrCrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.closingDrCr)),
        [filterSourceRows]
    );
    const transferToFilterOptions = useMemo(
        () => buildTextFilterOptions(filterSourceRows.map((row) => row.transferTo)),
        [filterSourceRows]
    );

    const ledgerGroupFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerGroupFilterOptions, 'All'),
        [ledgerGroupFilterOptions]
    );
    const annexureFilterElement = useMemo(
        () => buildMultiSelectFilterElement(annexureFilterOptions, 'All'),
        [annexureFilterOptions]
    );
    const ledgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerFilterOptions, 'All'),
        [ledgerFilterOptions]
    );
    const openingBalanceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(openingBalanceFilterOptions, 'All'),
        [openingBalanceFilterOptions]
    );
    const openingDrCrFilterElement = useMemo(
        () => buildMultiSelectFilterElement(openingDrCrFilterOptions, 'All'),
        [openingDrCrFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions, 'All'),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions, 'All'),
        [creditFilterOptions]
    );
    const closingBalanceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(closingBalanceFilterOptions, 'All'),
        [closingBalanceFilterOptions]
    );
    const closingDrCrFilterElement = useMemo(
        () => buildMultiSelectFilterElement(closingDrCrFilterOptions, 'All'),
        [closingDrCrFilterOptions]
    );
    const transferToFilterElement = useMemo(
        () => buildMultiSelectFilterElement(transferToFilterOptions, 'All'),
        [transferToFilterOptions]
    );

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const totals = useMemo(() => {
        if (!appliedFilters) {
            return { openingSigned: 0, debit: 0, credit: 0, closingSigned: 0 };
        }
        const signedOpening = baseRows.reduce(
            (sum, row) => sum + resolveSignedAmount(Number(row.openingBalance ?? 0), row.openingDrCr),
            0
        );
        const debit = baseRows.reduce((sum, row) => sum + Number(row.debitAmount ?? 0), 0);
        const credit = baseRows.reduce((sum, row) => sum + Number(row.creditAmount ?? 0), 0);
        const closingSigned = signedOpening + debit - credit;
        return { openingSigned: signedOpening, debit, credit, closingSigned };
    }, [appliedFilters, baseRows]);

    const openingFooter = loadingApplied ? skeletonCell('4rem') : formatAmount(Math.abs(totals.openingSigned));
    const openingDrCrFooter = loadingApplied ? skeletonCell('2rem') : resolveDrCrFromSigned(totals.openingSigned);
    const debitFooter = loadingApplied ? skeletonCell('4rem') : formatAmount(totals.debit);
    const creditFooter = loadingApplied ? skeletonCell('4rem') : formatAmount(totals.credit);
    const closingFooter = loadingApplied ? skeletonCell('4rem') : formatAmount(Math.abs(totals.closingSigned));
    const closingDrCrFooter = loadingApplied ? skeletonCell('2rem') : resolveDrCrFromSigned(totals.closingSigned);
    const periodDiffSigned = totals.debit - totals.credit;
    const formatDiffLabel = (value: number) => `${formatAmount(Math.abs(value))} ${resolveDrCrFromSigned(value)}`;
    const openingDiffLabel = loadingApplied ? '...' : formatDiffLabel(totals.openingSigned);
    const periodDiffLabel = loadingApplied ? '...' : formatDiffLabel(periodDiffSigned);
    const closingDiffLabel = loadingApplied ? '...' : formatDiffLabel(totals.closingSigned);
    const diffEpsilon = 0.005;
    const hasOpeningDiff = Math.abs(totals.openingSigned) > diffEpsilon;
    const hasPeriodDiff = Math.abs(periodDiffSigned) > diffEpsilon;
    const hasClosingDiff = Math.abs(totals.closingSigned) > diffEpsilon;
    const hasAnyDiff = hasOpeningDiff || hasPeriodDiff || hasClosingDiff;

    const ledgerGroupBody = (row: TrialBalanceDisplayRow) => {
        if (isSkeletonRow(row)) return skeletonCell('8rem');
        const label = row.ledgerGroup ?? '';
        const groupId = row.groupId != null ? Number(row.groupId) : 0;
        const showToggle = canToggleExpand && groupId > 0 && (row.rowType === 'group-summary' || row.isFirstInGroup);
        if (!showToggle) {
            if (row.rowType === 'group-total') {
                return (
                    <div className="flex align-items-center trial-balance-group-cell">
                        <span className="trial-balance-group-spacer" aria-hidden="true" />
                        <span>{label}</span>
                    </div>
                );
            }
            return label;
        }
        const isExpanded = expandedGroups.has(groupId);
        return (
            <div className="flex align-items-center trial-balance-group-cell">
                <Button
                    type="button"
                    icon={isExpanded ? 'pi pi-minus' : 'pi pi-plus'}
                    className="p-button-text p-button-sm p-0 trial-balance-group-toggle"
                    aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleGroupExpansion(groupId);
                    }}
                />
                <span>{label}</span>
            </div>
        );
    };
    const annexureBody = (row: TrialBalanceDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.annexure;
    const ledgerBody = (row: TrialBalanceDisplayRow) => {
        if (isSkeletonRow(row)) return skeletonCell('10rem');
        if (row.rowType === 'group-summary' || row.isGroupTotal) return '';
        if (!row.ledger) return '';
        return <span className="trial-balance-detail-text">{row.ledger}</span>;
    };
    const openingBody = (row: TrialBalanceDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.openingBalance ?? 0));
    const openingDrCrBody = (row: TrialBalanceDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('2rem') : row.openingDrCr;
    const debitBody = (row: TrialBalanceDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.debitAmount ?? 0));
    const creditBody = (row: TrialBalanceDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.creditAmount ?? 0));
    const closingBody = (row: TrialBalanceDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.closingBalance ?? 0));
    const closingDrCrBody = (row: TrialBalanceDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('2rem') : row.closingDrCr;

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Trial Balance (${reportPeriod})` : 'Trial Balance';
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
        if (appliedFilters.viewMode !== viewMode) {
            parts.push(`View: ${viewOptionLabel(appliedFilters.viewMode)}`);
        }
        if (appliedFilters.displayMode !== 'trial') {
            const layoutLabel =
                DISPLAY_MODE_OPTIONS.find((option) => option.value === appliedFilters.displayMode)?.label ??
                'Full Trial Balance';
            parts.push(`Print Layout: ${layoutLabel}`);
        }
        if (appliedFilters.balanceStatus !== 2) {
            const balanceLabel =
                BALANCE_STATUS_OPTIONS.find((o) => o.value === appliedFilters.balanceStatus)?.label ?? 'All';
            parts.push(`Balance Status: ${balanceLabel}`);
        }
        if (appliedFilters.voucherTypeId) {
            parts.push(`Voucher Type: ${resolveOptionLabel(appliedFilters.voucherTypeId, voucherTypeOptions, 'Voucher')}`);
        }
        if (appliedFilters.entryType !== 'all') {
            parts.push(`Entry Type: ${ENTRY_TYPE_OPTIONS.find((o) => o.value === appliedFilters.entryType)?.label ?? 'All'}`);
        }
        if (appliedFilters.taxType !== -1) {
            parts.push(`Tax Type: ${TAX_TYPE_OPTIONS.find((o) => o.value === appliedFilters.taxType)?.label ?? 'All'}`);
        }
        if (appliedFilters.rcmStatus !== -1) {
            parts.push(`RCM: ${RCM_OPTIONS.find((o) => o.value === appliedFilters.rcmStatus)?.label ?? 'All'}`);
        }
        return parts.length ? parts.join(' | ') : null;
    }, [appliedFilters, viewMode, voucherTypeOptions]);

    const exportRows = useMemo(
        () => displayRows.filter((row) => !row.isSkeleton),
        [displayRows]
    );

    const exportColumns = useMemo<ReportExportColumn<TrialBalanceDisplayRow>[]>(() => {
        const columns: ReportExportColumn<TrialBalanceDisplayRow>[] = [
            { header: 'Ledger Group', value: (row) => row.ledgerGroup ?? '' }
        ];
        if (viewMode === 'detailed') {
            columns.push({ header: 'Ledger', value: (row) => row.ledger ?? '' });
        }
        columns.push({ header: 'Annuxure', value: (row) => row.annexure ?? '' });
        columns.push({ header: 'Op. Bal.', value: (row) => Number(row.openingBalance ?? 0).toFixed(2) });
        columns.push({ header: 'DrCr', value: (row) => row.openingDrCr ?? '' });
        columns.push({ header: 'Debit', value: (row) => Number(row.debitAmount ?? 0).toFixed(2) });
        columns.push({ header: 'Credit', value: (row) => Number(row.creditAmount ?? 0).toFixed(2) });
        columns.push({ header: 'Closing', value: (row) => Number(row.closingBalance ?? 0).toFixed(2) });
        columns.push({ header: 'DrCr', value: (row) => row.closingDrCr ?? '' });
        if (viewMode === 'detailed') {
            columns.push({ header: 'Transfer To', value: (row) => row.transferTo ?? '' });
        }
        return columns;
    }, [viewMode]);

    const handleExportCsv = () => {
        if (!exportRows.length) return;
        exportReportCsv({
            fileName: `trial-balance_${toDateText(fromDate) ?? 'from'}_${toDateText(toDate) ?? 'to'}`,
            rows: exportRows,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        });
    };

    const handleExportExcel = () => {
        if (!exportRows.length) return;
        exportReportExcel({
            fileName: `trial-balance_${toDateText(fromDate) ?? 'from'}_${toDateText(toDate) ?? 'to'}`,
            rows: exportRows,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            sheetName: 'Trial Balance',
            footerLeft: printFooterLeft
        });
    };

    const handleExportPdf = () => {
        if (!exportRows.length) return;
        exportReportPdf({
            fileName: `trial-balance_${toDateText(fromDate) ?? 'from'}_${toDateText(toDate) ?? 'to'}`,
            rows: exportRows,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        });
    };

    const pendingPrintRef = useRef<'trial' | 'summary' | null>(null);
    const restorePrintModeRef = useRef<'trial' | 'summary' | null>(null);
    const startPrint = useCallback(() => {
        setPrintRows(exportRows);
        setIsPrinting(true);
    }, [exportRows]);

    useEffect(() => {
        if (pendingPrintRef.current && pendingPrintRef.current === displayMode) {
            pendingPrintRef.current = null;
            startPrint();
        }
    }, [displayMode, startPrint]);

    useEffect(() => {
        if (!isPrinting || typeof window === 'undefined') return;
        const handleAfterPrint = () => {
            setIsPrinting(false);
            setPrintRows(null);
            if (restorePrintModeRef.current) {
                setDisplayMode(restorePrintModeRef.current);
                restorePrintModeRef.current = null;
            }
        };
        window.addEventListener('afterprint', handleAfterPrint);
        window.requestAnimationFrame(() => window.print());
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, [isPrinting]);

    const triggerPrint = useCallback(
        (mode: 'trial' | 'summary') => {
            if (displayMode !== mode) {
                restorePrintModeRef.current = displayMode;
                pendingPrintRef.current = mode;
                setDisplayMode(mode);
                return;
            }
            pendingPrintRef.current = null;
            startPrint();
        },
        [displayMode, startPrint]
    );

    const printMenuItems = useMemo(
        () => [
            { label: DISPLAY_MODE_OPTIONS[0].label, icon: 'pi pi-print', command: () => triggerPrint('trial') },
            { label: DISPLAY_MODE_OPTIONS[1].label, icon: 'pi pi-print', command: () => triggerPrint('summary') }
        ],
        [triggerPrint]
    );

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
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 trial-balance-header-row">
                    <div>
                        <h2 className="m-0">Trial Balance</h2>
                        <p className="mt-2 mb-0 text-600">
                            Legacy-aligned trial balance with summarized and detailed views. Use filters, then refresh
                            to match legacy output.
                        </p>
                    </div>
                    <div
                        className={classNames(
                            'surface-50 border-1 surface-border border-round p-2 text-sm trial-balance-diff',
                            hasAnyDiff && 'balance-diff-alert'
                        )}
                    >
                        <div className="font-semibold mb-1">Balance Difference</div>
                        <div className="flex flex-column gap-1">
                            <div className="flex align-items-center justify-content-between gap-3">
                                <span>Opening</span>
                                <span className={classNames('font-semibold', hasOpeningDiff && 'balance-diff-value')}>
                                    {openingDiffLabel}
                                </span>
                            </div>
                            <div className="flex align-items-center justify-content-between gap-3">
                                <span>Dr/Cr</span>
                                <span className={classNames('font-semibold', hasPeriodDiff && 'balance-diff-value')}>
                                    {periodDiffLabel}
                                </span>
                            </div>
                            <div className="flex align-items-center justify-content-between gap-3">
                                <span>Closing</span>
                                <span className={classNames('font-semibold', hasClosingDiff && 'balance-diff-value')}>
                                    {closingDiffLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {reportError && <p className="text-red-500 m-0">Error loading trial balance: {reportError.message}</p>}
            </div>

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 15, 30, 50, 100]}
                dataKey="rowKey"
                size="small"
                stripedRows
                className="summary-table trial-balance-table"
                rowClassName={(row: TrialBalanceDisplayRow) =>
                    row.rowType === 'group-summary' || row.isGroupTotal ? 'font-bold' : ''
                }
                loadingState={loadingApplied}
                loadingSummaryEnabled={Boolean(appliedFilters)}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                emptyMessage={
                    reportLoading ? '' : appliedFilters ? 'No results found' : 'Press Refresh to load trial balance'
                }
                headerLeft={
                    <div className="flex flex-column gap-2">
                        <div className="flex flex-wrap align-items-center gap-2">
                            <AppDateInput
                                value={fromDate}
                                onChange={handleFromDateChange}
                                placeholder="From date"
                                fiscalYearStart={initialRangeRef.current.start ?? null}
                                fiscalYearEnd={initialRangeRef.current.end ?? null}
                                autoFocus
                                selectOnFocus
                                inputId="trial-balance-from-date"
                                inputRef={fromDateInputRef}
                                onEnterNext={() => focusInput(toDateInputRef)}
                                style={{ width: '150px' }}
                            />
                            <AppDateInput
                                value={toDate}
                                onChange={handleToDateChange}
                                placeholder="To date"
                                fiscalYearStart={initialRangeRef.current.start ?? null}
                                fiscalYearEnd={initialRangeRef.current.end ?? null}
                                inputId="trial-balance-to-date"
                                inputRef={toDateInputRef}
                                onEnterNext={() => focusInput(voucherTypeInputRef)}
                                style={{ width: '150px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex flex-wrap align-items-center gap-2">
                            <AppAutoComplete
                                value={voucherTypeQuery.length ? voucherTypeQuery : selectedVoucherType}
                                suggestions={voucherTypeSuggestions}
                                completeMethod={(event: AutoCompleteCompleteEvent) => {
                                    const query = event.query ?? '';
                                    setVoucherTypeQuery(query);
                                    setVoucherTypeSuggestions(filterOptions(voucherTypeOptions, query));
                                }}
                                onDropdownClick={() => setVoucherTypeSuggestions([...voucherTypeOptions])}
                                onChange={(event: AutoCompleteChangeEvent) => {
                                    const value = event.value as SelectOption | string | null;
                                    if (value == null) {
                                        setVoucherTypeQuery('');
                                        setSelectedVoucherType(null);
                                        handleVoucherTypeChange(null);
                                        return;
                                    }
                                    if (typeof value === 'string') {
                                        setVoucherTypeQuery(value);
                                        if (!value.trim()) {
                                            setSelectedVoucherType(null);
                                            handleVoucherTypeChange(null);
                                        }
                                        return;
                                    }
                                    setVoucherTypeQuery('');
                                    setSelectedVoucherType(value);
                                    handleVoucherTypeChange(value.value ?? null);
                                }}
                                field="label"
                                placeholder="Voucher type"
                                inputId="trial-balance-voucher-type"
                                inputRef={voucherTypeInputRef}
                                onKeyDown={handleEnterFocusDropdown(balanceStatusRef)}
                                style={{ minWidth: '200px' }}
                            />
                        </div>
                        <div className="flex flex-wrap align-items-start gap-3">
                            <fieldset className="ledger-report-group">
                                <legend>Balance Status</legend>
                                <div className="flex flex-wrap align-items-center gap-2">
                                    <AppDropdown
                                        value={balanceStatus === 0 ? null : balanceStatus}
                                        options={BALANCE_STATUS_DROPDOWN_OPTIONS}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="All"
                                        showClear
                                        ref={balanceStatusRef}
                                        onChange={(event) => {
                                            setBalanceStatus((event.value ?? 0) as number);
                                            clearAppliedFilters();
                                        }}
                                        onKeyDown={handleEnterFocusDropdown(entryTypeRef)}
                                        style={{ minWidth: '220px' }}
                                    />
                                </div>
                            </fieldset>
                            <fieldset className="ledger-report-group">
                                <legend>Tax Entry Type</legend>
                                <div className="flex flex-wrap align-items-center gap-2">
                                    <AppDropdown
                                        value={entryType === 'all' ? null : entryType}
                                        options={ENTRY_TYPE_DROPDOWN_OPTIONS}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="All"
                                        showClear
                                        ref={entryTypeRef}
                                        onChange={(event) => {
                                            setEntryType((event.value ?? 'all') as EntryType);
                                            clearAppliedFilters();
                                        }}
                                        onKeyDown={handleEnterFocusDropdown(taxTypeRef)}
                                        style={{ minWidth: '200px' }}
                                    />
                                </div>
                            </fieldset>
                            <fieldset className="ledger-report-group">
                                <legend>Tax Type</legend>
                                <div className="flex flex-wrap align-items-center gap-2">
                                    <AppDropdown
                                        value={taxType === -1 ? null : taxType}
                                        options={TAX_TYPE_DROPDOWN_OPTIONS}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="ALL"
                                        showClear
                                        ref={taxTypeRef}
                                        onChange={(event) => {
                                            setTaxType((event.value ?? -1) as number);
                                            clearAppliedFilters();
                                        }}
                                        onKeyDown={handleEnterFocusDropdown(rcmRef)}
                                        style={{ minWidth: '180px' }}
                                    />
                                </div>
                            </fieldset>
                            <fieldset className="ledger-report-group">
                                <legend>RCM</legend>
                                <div className="flex flex-wrap align-items-center gap-2">
                                    <AppDropdown
                                        value={rcmStatus === -1 ? null : rcmStatus}
                                        options={RCM_DROPDOWN_OPTIONS}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="All"
                                        showClear
                                        ref={rcmRef}
                                        onChange={(event) => {
                                            setRcmStatus((event.value ?? -1) as number);
                                            clearAppliedFilters();
                                        }}
                                        onKeyDown={handleEnterFocusById(refreshButtonId)}
                                        style={{ minWidth: '160px' }}
                                    />
                                </div>
                            </fieldset>
                        </div>
                    </div>
                }
                headerRight={
                    <div className="flex align-items-center gap-2">
                        {canToggleExpand && (
                            <div className="flex align-items-center gap-2">
                                <Button
                                    type="button"
                                    label="Expand all"
                                    icon="pi pi-plus"
                                    className="p-button-text p-button-sm"
                                    onClick={expandAllGroups}
                                    disabled={expandAllDisabled}
                                />
                                <Button
                                    type="button"
                                    label="Collapse all"
                                    icon="pi pi-minus"
                                    className="p-button-text p-button-sm"
                                    onClick={collapseAllGroups}
                                    disabled={collapseAllDisabled}
                                />
                            </div>
                        )}
                        <AppReportActions
                            onRefresh={handleRefresh}
                            onPrint={() => triggerPrint('trial')}
                            printMenuItems={printMenuItems}
                            onExportCsv={handleExportCsv}
                            onExportExcel={handleExportExcel}
                            onExportPdf={handleExportPdf}
                            refreshDisabled={!canRefresh}
                            printDisabled={!appliedFilters || reportLoading || displayRows.length === 0}
                            exportDisabled={!appliedFilters || reportLoading || displayRows.length === 0}
                            refreshButtonId={refreshButtonId}
                        />
                    </div>
                }
                recordSummary={
                    appliedFilters
                        ? reportLoading
                            ? 'Loading trial balance...'
                            : `${baseRows.length} row${baseRows.length === 1 ? '' : 's'}`
                        : 'Press Refresh to load trial balance'
                }
            >
                <Column
                    field="ledgerGroupFilter"
                    header="Ledger Group"
                    body={ledgerGroupBody}
                    style={{ width: '14rem' }}
                    headerClassName="summary-left trial-balance-header-group"
                    bodyClassName="summary-left"
                    filterElement={ledgerGroupFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="annexure"
                    header="Annuxure"
                    body={annexureBody}
                    style={{ width: '8rem' }}
                    headerClassName="summary-center trial-balance-header-center"
                    bodyClassName="summary-center"
                    filterElement={annexureFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                {viewMode === 'detailed' && (
                    <Column
                        field="ledger"
                        header="Ledger"
                        body={ledgerBody}
                        style={{ width: '16rem' }}
                        headerClassName="summary-left trial-balance-header-ledger"
                        bodyClassName="summary-left"
                        filterElement={ledgerFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                    />
                )}
                <Column
                    field="openingBalance"
                    header="Op. Bal."
                    body={openingBody}
                    footer={openingFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
                    filterElement={openingBalanceFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="openingDrCr"
                    header="DrCr"
                    body={openingDrCrBody}
                    footer={openingDrCrFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '4rem' }}
                    filterElement={openingDrCrFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="debitAmount"
                    header="Debit"
                    body={debitBody}
                    footer={debitFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
                    filterElement={debitFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="creditAmount"
                    header="Credit"
                    body={creditBody}
                    footer={creditFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
                    filterElement={creditFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="closingBalance"
                    header="Closing"
                    body={closingBody}
                    footer={closingFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
                    filterElement={closingBalanceFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="closingDrCr"
                    header="DrCr"
                    body={closingDrCrBody}
                    footer={closingDrCrFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '4rem' }}
                    filterElement={closingDrCrFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                {viewMode === 'detailed' && (
                    <Column
                        field="transferTo"
                        header="Transfer To"
                        body={(row) => row.transferTo ?? ''}
                        style={{ width: '10rem' }}
                        filterElement={transferToFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                    />
                )}
            </ReportDataTable>
        </div>
    );
};

export default TrialBalanceReport;
