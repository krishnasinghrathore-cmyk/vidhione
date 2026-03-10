'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import type { AutoComplete } from 'primereact/autocomplete';
import { AppRegisterSearch } from '@/components/AppRegisterSearch';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import type { VoucherTypeOption } from '@/lib/accounts/voucherTypes';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { TrialBalanceReportFilters } from './components/TrialBalanceReportFilters';
import { TrialBalanceReportSummary } from './components/TrialBalanceReportSummary';
import { TrialBalanceReportTable } from './components/TrialBalanceReportTable';

import type {
    AppliedFilters,
    EntryType,
    TrialBalanceDisplayRow,
    TrialBalanceGroup,
    TrialBalanceReportProps,
    TrialBalanceRow,
    TrialBalanceViewMode,
    VoucherTypeRow
} from './types';
import { TRIAL_BALANCE, VOUCHER_TYPES } from './graphql';
import {
    BALANCE_STATUS_OPTIONS,
    DISPLAY_MODE_OPTIONS,
    ENTRY_TYPE_OPTIONS,
    RCM_OPTIONS,
    TAX_TYPE_OPTIONS,
    buildDefaultColumnFilters,
    buildMultiSelectFilterElement,
    buildNumberFilterOptions,
    buildTextFilterOptions,
    formatAmount,
    formatDateRangeLabel,
    resolveDrCrFromSigned,
    resolveFiscalRange,
    resolveOptionLabel,
    resolveSignedAmount,
    toDateText,
    viewOptionLabel
} from './utils';

export function TrialBalanceReportContainer({ initialView = 'detailed' }: TrialBalanceReportProps) {
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
    const [globalSearchValue, setGlobalSearchValue] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printRows, setPrintRows] = useState<TrialBalanceDisplayRow[] | null>(null);

    useEffect(() => {
        const label = viewMode === 'detailed' ? 'Trial Balance (Detailed)' : 'Trial Balance (Summarized)';
        setPageTitle(label);
        return () => setPageTitle(null);
    }, [setPageTitle, viewMode]);

    const hasTouchedDatesRef = useRef(false);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const voucherTypeInputRef = useRef<AutoComplete>(null);
    const balanceStatusRef = useRef<Dropdown>(null);
    const entryTypeRef = useRef<Dropdown>(null);
    const taxTypeRef = useRef<Dropdown>(null);
    const rcmRef = useRef<Dropdown>(null);

    const { data: voucherTypesData, loading: voucherTypesLoading } = useQuery(VOUCHER_TYPES);

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

    const focusAutoComplete = (ref: React.RefObject<AutoComplete>) => {
        ref.current?.getInput?.()?.focus();
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

    const voucherTypeOptions = useMemo<VoucherTypeOption[]>(() => {
        const rows = (voucherTypesData?.voucherTypeMasters ?? []) as VoucherTypeRow[];
        return rows.map((row) => ({
            label: row.displayName || row.voucherTypeName || `Voucher ${row.voucherTypeId}`,
            value: Number(row.voucherTypeId),
            voucherTypeName: row.voucherTypeName,
            displayName: row.displayName
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

    const handleBalanceStatusChange = (value: number) => {
        setBalanceStatus(value);
        clearAppliedFilters();
    };

    const handleEntryTypeChange = (value: EntryType) => {
        setEntryType(value);
        clearAppliedFilters();
    };

    const handleTaxTypeChange = (value: number) => {
        setTaxType(value);
        clearAppliedFilters();
    };

    const handleRcmStatusChange = (value: number) => {
        setRcmStatus(value);
        clearAppliedFilters();
    };

    const canRefresh = Boolean(fromDate && toDate);
    const refreshButtonId = 'trial-balance-refresh';
    const optionsValue = viewMode === 'summarized' ? 0 : 1;
    const entryTypeConfig = ENTRY_TYPE_OPTIONS.find((option) => option.value === entryType) ?? ENTRY_TYPE_OPTIONS[0];

    const handleRefresh = () => {
        if (!canRefresh) return;
        const validation = validateDateRange({ fromDate, toDate });
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

    const onVoucherTypeSelectNext = () => focusDropdown(balanceStatusRef);
    const onBalanceStatusKeyDown = handleEnterFocusDropdown(entryTypeRef);
    const onEntryTypeKeyDown = handleEnterFocusDropdown(taxTypeRef);
    const onTaxTypeKeyDown = handleEnterFocusDropdown(rcmRef);
    const onRcmKeyDown = handleEnterFocusById(refreshButtonId);

    const headerLeft = (
        <TrialBalanceReportFilters
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={handleFromDateChange}
            onToDateChange={handleToDateChange}
            fiscalYearStart={initialRangeRef.current.start ?? null}
            fiscalYearEnd={initialRangeRef.current.end ?? null}
            fromDateInputRef={fromDateInputRef}
            toDateInputRef={toDateInputRef}
            voucherTypeInputRef={voucherTypeInputRef}
            onFromDateEnterNext={() => focusInput(toDateInputRef)}
            onToDateEnterNext={() => focusAutoComplete(voucherTypeInputRef)}
            dateErrors={dateErrors}
            voucherTypeId={voucherTypeId}
            voucherTypeOptions={voucherTypeOptions}
            voucherTypesLoading={voucherTypesLoading}
            onVoucherTypeChange={handleVoucherTypeChange}
            onVoucherTypeSelectNext={onVoucherTypeSelectNext}
            balanceStatus={balanceStatus}
            onBalanceStatusChange={handleBalanceStatusChange}
            onBalanceStatusKeyDown={onBalanceStatusKeyDown}
            balanceStatusRef={balanceStatusRef}
            entryType={entryType}
            onEntryTypeChange={handleEntryTypeChange}
            onEntryTypeKeyDown={onEntryTypeKeyDown}
            entryTypeRef={entryTypeRef}
            taxType={taxType}
            onTaxTypeChange={handleTaxTypeChange}
            onTaxTypeKeyDown={onTaxTypeKeyDown}
            taxTypeRef={taxTypeRef}
            rcmStatus={rcmStatus}
            onRcmStatusChange={handleRcmStatusChange}
            onRcmKeyDown={onRcmKeyDown}
            rcmRef={rcmRef}
        />
    );

    const errorMessage = reportError?.message ?? null;
    const headerSearch = (
        <AppRegisterSearch
            value={globalSearchValue}
            onValueChange={setGlobalSearchValue}
            matchCase={globalSearchMatchCase}
            onMatchCaseChange={setGlobalSearchMatchCase}
            wholeWord={globalSearchWholeWord}
            onWholeWordChange={setGlobalSearchWholeWord}
            placeholder="Search register..."
            helperText="Aa: Match Case · W: Whole Word"
            className="app-report-header-search app-register-search--compact"
            disabled={loadingApplied && tableRows.length === 0}
        />
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
            <TrialBalanceReportSummary errorMessage={errorMessage} rightSlot={headerSearch} />
            <TrialBalanceReportTable
                tableRows={tableRows}
                isPrinting={isPrinting}
                tablePageSize={tablePageSize}
                loadingApplied={loadingApplied}
                appliedFilters={appliedFilters}
                reportLoading={reportLoading}
                baseRowsCount={baseRows.length}
                columnFilters={columnFilters}
                onColumnFilter={handleColumnFilter}
                globalSearchValue={globalSearchValue}
                onGlobalSearchValueChange={setGlobalSearchValue}
                globalSearchMatchCase={globalSearchMatchCase}
                onGlobalSearchMatchCaseChange={setGlobalSearchMatchCase}
                globalSearchWholeWord={globalSearchWholeWord}
                onGlobalSearchWholeWordChange={setGlobalSearchWholeWord}
                headerLeft={headerLeft}
                canToggleExpand={canToggleExpand}
                expandAllDisabled={expandAllDisabled}
                collapseAllDisabled={collapseAllDisabled}
                onExpandAll={expandAllGroups}
                onCollapseAll={collapseAllGroups}
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
                hasAnyDiff={hasAnyDiff}
                hasOpeningDiff={hasOpeningDiff}
                hasPeriodDiff={hasPeriodDiff}
                hasClosingDiff={hasClosingDiff}
                openingDiffLabel={openingDiffLabel}
                periodDiffLabel={periodDiffLabel}
                closingDiffLabel={closingDiffLabel}
                viewMode={viewMode}
                ledgerGroupBody={ledgerGroupBody}
                annexureBody={annexureBody}
                ledgerBody={ledgerBody}
                openingBody={openingBody}
                openingDrCrBody={openingDrCrBody}
                debitBody={debitBody}
                creditBody={creditBody}
                closingBody={closingBody}
                closingDrCrBody={closingDrCrBody}
                openingFooter={openingFooter}
                openingDrCrFooter={openingDrCrFooter}
                debitFooter={debitFooter}
                creditFooter={creditFooter}
                closingFooter={closingFooter}
                closingDrCrFooter={closingDrCrFooter}
                ledgerGroupFilterElement={ledgerGroupFilterElement}
                annexureFilterElement={annexureFilterElement}
                ledgerFilterElement={ledgerFilterElement}
                openingBalanceFilterElement={openingBalanceFilterElement}
                openingDrCrFilterElement={openingDrCrFilterElement}
                debitFilterElement={debitFilterElement}
                creditFilterElement={creditFilterElement}
                closingBalanceFilterElement={closingBalanceFilterElement}
                closingDrCrFilterElement={closingDrCrFilterElement}
                transferToFilterElement={transferToFilterElement}
            />
        </div>
    );
}
