'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import type { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import type { Dropdown } from 'primereact/dropdown';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { apolloClient } from '@/lib/apolloClient';
import { ACCOUNT_MASTER_LAZY_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useAuth } from '@/lib/auth/context';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { isBankAccountsLabel, resolveLedgerGroupFilter } from '@/lib/accounts/ledgerGroupFilter';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';

import type {
    BankReconciliationRow,
    ColumnFilterMeta,
    LedgerLookupOption,
    LedgerLookupRow,
    ReconEdit,
    StatementEntry,
    StatementWorkbookInfo
} from './types';
import { StatementMatchRule } from './types';
import {
    BANK_RECONCILIATION,
    LEDGER_CURRENT_BALANCE,
    LEDGER_LOOKUP,
    LEDGER_RECON_STATEMENT_IMPORT,
    UPDATE_RECON,
    UPLOAD_LEDGER_RECON_STATEMENT_IMPORT
} from './graphql';
import {
    ALL_LEDGER_LIMIT,
    MATCH_RULE_OPTIONS,
    MULTISELECT_COLUMN_PROPS,
    RECONCILIATION_LIMIT,
    SEARCH_LEDGER_LIMIT,
    arrayBufferToBase64,
    base64ToBlob,
    buildDateFilterOptions,
    buildDefaultColumnFilters,
    buildMultiSelectFilterElement,
    buildNumberFilterOptions,
    buildTextFilterOptions,
    formatAmount,
    formatDate,
    getAutoRemark,
    getRuleShortText,
    matchStatementEntryToRows,
    parseDateText,
    parseNumericLike,
    readStatementEntriesFromExcel,
    resolveAmountValue,
    resolveFiscalRange,
    toDateText,
    toStatementDownloadFileName,
    updateStatementWorkbook
} from './utils';

export default function AccountsBankReconciliationPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const toastRef = useRef<Toast>(null);

    const [ledgerGroupId, setLedgerGroupId] = useState<number | null>(null);
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerLookupRow[]>([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [ledgerSuggestions, setLedgerSuggestions] = useState<LedgerLookupOption[]>([]);
    const [ledgerPanelOpen, setLedgerPanelOpen] = useState(false);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [selectedBankLedger, setSelectedBankLedger] = useState<LedgerLookupOption | null>(null);
    const [reconciled, setReconciled] = useState<-1 | 0 | 1>(0);
    const [useReconcileDate, setUseReconcileDate] = useState(false);
    const [matchRule, setMatchRule] = useState<StatementMatchRule>(StatementMatchRule.ChqAmtDate);
    const [statementEntries, setStatementEntries] = useState<StatementEntry[]>([]);
    const [statementDialogVisible, setStatementDialogVisible] = useState(false);
    const [statementFileName, setStatementFileName] = useState('');
    const [statementUpdatedFile, setStatementUpdatedFile] = useState<{ name: string; url: string } | null>(null);
    const [statementImporting, setStatementImporting] = useState(false);
    const [statementMatching, setStatementMatching] = useState(false);
    const statementWorkbookRef = useRef<StatementWorkbookInfo | null>(null);
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [pendingReconEdits, setPendingReconEdits] = useState<Record<number, ReconEdit>>({});
    const [matchApplyOverrides, setMatchApplyOverrides] = useState<
        Record<number, { reconciliationDate: string | null; reconciliationRemark: string | null }>
    >({});
    const [matchApplyDateOverrides, setMatchApplyDateOverrides] = useState<Record<number, Date>>({});
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(buildDefaultColumnFilters());
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const ledgerGroupInputRef = useRef<AutoComplete>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const bankLedgerInputRef = useRef<AutoComplete>(null);
    const reconciledInputRef = useRef<Dropdown>(null);
    const matchRuleInputRef = useRef<Dropdown>(null);
    const refreshButtonId = 'ledger-reconciliation-refresh';
    const ledgerEnterRef = useRef(false);
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ groupId: number | null; search: string; mode: 'all' | 'search' } | null>(null);
    const statementFileInputRef = useRef<HTMLInputElement>(null);
    const hasManualLedgerGroupRef = useRef(false);

    const [saving, setSaving] = useState(false);

    const { options: ledgerGroupOptions, loading: ledgerGroupLoading } = useLedgerGroupOptions();
    const ledgerGroupFilter = useMemo(
        () => resolveLedgerGroupFilter(ledgerGroupId, ledgerGroupOptions),
        [ledgerGroupId, ledgerGroupOptions]
    );

    useEffect(() => {
        setPageTitle('Ledger Reconciliation');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    useEffect(() => {
        if (ledgerGroupId != null) return;
        if (!ledgerGroupOptions.length) return;
        if (hasManualLedgerGroupRef.current) return;
        const match = ledgerGroupOptions.find((option) => isBankAccountsLabel(option.label ?? option.name));
        if (match) {
            setLedgerGroupId(match.value);
        }
    }, [ledgerGroupId, ledgerGroupOptions]);

    useEffect(() => {
        if (ledgerGroupId == null) return;
        void fetchLedgers({ groupId: ledgerGroupFilter.fetchGroupId, mode: 'all' });
    }, [ledgerGroupFilter.fetchGroupId, ledgerGroupId]);

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const hasTouchedDatesRef = useRef(false);
    const canRefresh = Boolean(ledgerId && fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };
    const focusDropdown = (ref: React.RefObject<{ focus?: () => void }>) => {
        ref.current?.focus?.();
    };
    const focusMatchRuleInput = () => {
        focusDropdown(matchRuleInputRef);
    };

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const onlyPending = reconciled === -1 ? null : reconciled === 0 ? 1 : 0;
    const reconcileDateFilter = reconciled === 1 && useReconcileDate ? 1 : 0;
    const registerVariables = useMemo(
        () => ({
            bankLedgerId: ledgerId ?? 0,
            search: null,
            fromDate,
            toDate,
            partyLedgerId: null,
            amount: null,
            onlyPending,
            filterByReconcileDate: reconcileDateFilter,
            limit: RECONCILIATION_LIMIT,
            offset: 0
        }),
        [fromDate, ledgerId, onlyPending, reconcileDateFilter, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(BANK_RECONCILIATION, {
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const [loadLedgerLookup] = useLazyQuery(LEDGER_LOOKUP, {
        ...ACCOUNT_MASTER_LAZY_QUERY_OPTIONS
    });
    const [uploadStatementImport] = useMutation(UPLOAD_LEDGER_RECON_STATEMENT_IMPORT);
    const { data: lastImportData, refetch: refetchLastImport } = useQuery(LEDGER_RECON_STATEMENT_IMPORT, {
        variables: {
            ledgerId: ledgerId ?? 0,
            fromDate: fromDate ?? '',
            toDate: toDate ?? '',
            includeFile: false
        },
        skip: !ledgerId || !fromDate || !toDate
    });
    const [loadStatementImportFile] = useLazyQuery(LEDGER_RECON_STATEMENT_IMPORT, { fetchPolicy: 'network-only' });

    const fetchLedgers = async (args?: { search?: string | null; groupId?: number | null; mode?: 'all' | 'search' }) => {
        const trimmed = args?.search?.trim() ?? '';
        const groupId = args?.groupId != null && args.groupId > 0 ? args.groupId : null;
        const mode = args?.mode ?? 'search';
        const lastFetch = ledgerLastFetchRef.current;

        if (!groupId && !trimmed && mode !== 'all') {
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
            lastFetch.groupId === groupId &&
            ledgerLookupRows.length > 0
        ) {
            setLedgerLookupRows((prev) => (prev.length ? [...prev] : prev));
            setIsLedgerLoading(false);
            return;
        }

        const requestId = ++ledgerRequestRef.current;
        const limit =
            mode === 'all'
                ? groupId
                    ? 2000
                    : ALL_LEDGER_LIMIT
                : groupId
                  ? 2000
                  : SEARCH_LEDGER_LIMIT;
        setIsLedgerLoading(true);
        try {
            const result = await loadLedgerLookup({
                variables: {
                    search: trimmed ? trimmed : null,
                    ledgerGroupId: groupId,
                    limit
                }
            });
            if (ledgerRequestRef.current !== requestId) return;
            const items = result.data?.ledgerSummaries?.items ?? [];
            setLedgerLookupRows(Array.isArray(items) ? [...(items as LedgerLookupRow[])] : []);
            ledgerLastFetchRef.current = { groupId, search: trimmed, mode };
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

    const todayBalanceText = useMemo(() => toDateText(new Date()), []);
    const { data: bankBalanceData, loading: bankBalanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        variables: { ledgerId: ledgerId ?? 0, toDate: todayBalanceText },
        skip: !ledgerId
    });

    const [updateRecon] = useMutation(UPDATE_RECON);

    useEffect(() => {
        if (reconciled !== 1 && useReconcileDate) {
            setUseReconcileDate(false);
        }
    }, [reconciled, useReconcileDate]);

    useEffect(() => {
        setFirst(0);
        setPendingReconEdits({});
    }, [fromDate, ledgerId, reconciled, toDate, reconcileDateFilter]);

    useEffect(() => {
        return () => {
            if (statementUpdatedFile?.url) {
                URL.revokeObjectURL(statementUpdatedFile.url);
            }
        };
    }, [statementUpdatedFile]);

    const rawRows: BankReconciliationRow[] = useMemo(() => {
        if (!hasApplied) return [];
        const items = (data?.bankReconciliation?.items ?? []) as BankReconciliationRow[];
        const mapped = items.map((row: any) => ({
            ...row,
            debit: resolveAmountValue(row.debit, row.drAmt, row.dr_amt, row.DrAmt, row.DR_AMT),
            credit: resolveAmountValue(row.credit, row.crAmt, row.cr_amt, row.CrAmt, row.CR_AMT),
            chequeNo: row.chequeNo ?? row.cheque_no ?? row.ChequeNo ?? row.CHEQUE_NO ?? null,
            chequeCancelCharges:
                row.chequeCancelCharges ?? row.cheque_cancel_charges ?? row.ChequeCancelCharges ?? null,
            discountAmount: row.discountAmount ?? row.discount ?? row.Discount ?? null,
            balance: resolveAmountValue(row.balance, row.Balance, row.BALANCE),
            drCr: row.drCr ?? row.DrCr ?? row.DRCR ?? row.DR_CR ?? null,
            reconciliationDate: row.reconciliationDate ?? null,
            reconciliationRemark: row.reconciliationRemark ?? null
        }));
        const hasBalance = mapped.some((row) => Number.isFinite(parseNumericLike(row.balance)));
        if (hasBalance) {
            return mapped.map((row) => {
                const balanceValue = parseNumericLike(row.balance);
                const drCrValue =
                    row.drCr ?? (Number.isFinite(balanceValue) ? (balanceValue >= 0 ? 'Dr' : 'Cr') : null);
                return {
                    ...row,
                    balance: Number.isFinite(balanceValue) ? Math.abs(balanceValue) : row.balance,
                    drCr: drCrValue
                };
            });
        }
        let runningBalance = 0;
        return mapped.map((row) => {
            const debit = resolveAmountValue(row.debit, 0);
            const credit = resolveAmountValue(row.credit, 0);
            runningBalance += debit - credit;
            return {
                ...row,
                balance: Math.abs(runningBalance),
                drCr: runningBalance >= 0 ? 'Dr' : 'Cr'
            };
        });
    }, [data, hasApplied]);

    const rows: BankReconciliationRow[] = useMemo(
        () =>
            rawRows.map((row) => {
                const override = matchApplyOverrides[row.postingId];
                if (!override) return row;
                return {
                    ...row,
                    reconciliationDate: override.reconciliationDate ?? row.reconciliationDate ?? null,
                    reconciliationRemark: override.reconciliationRemark ?? row.reconciliationRemark ?? null
                };
            }),
        [rawRows, matchApplyOverrides]
    );
    const totalPostings = hasApplied ? data?.bankReconciliation?.totalCount ?? 0 : 0;
    const totalRecords = hasApplied ? rows.length : 0;
    const debitTotal = data?.bankReconciliation?.debitTotal ?? 0;
    const creditTotal = data?.bankReconciliation?.creditTotal ?? 0;
    const discountTotal = useMemo(
        () =>
            rows.reduce((sum, row) => sum + resolveAmountValue(row.discountAmount, 0), 0),
        [rows]
    );
    const chequeChargesTotal = useMemo(
        () =>
            rows.reduce((sum, row) => sum + resolveAmountValue(row.chequeCancelCharges, 0), 0),
        [rows]
    );
    const balanceFooterLabel = useMemo(() => {
        if (!rows.length) return '';
        const lastRow = rows[rows.length - 1];
        const value = resolveAmountValue(lastRow.balance, 0);
        if (!Number.isFinite(value) || value === 0) return '';
        return formatAmount(value);
    }, [rows]);
    const balanceFooterDrCr = useMemo(() => {
        if (!rows.length) return '';
        const lastRow = rows[rows.length - 1];
        return lastRow.drCr ?? '';
    }, [rows]);

    const ledgerRows = useMemo(() => ledgerLookupRows, [ledgerLookupRows]);
    const ledgerOptions = useMemo<LedgerLookupOption[]>(() => {
        const filterIds = ledgerGroupFilter.filterIds;
        const filtered =
            filterIds.length > 0
                ? ledgerRows.filter((l) => l.ledgerGroupId != null && filterIds.includes(Number(l.ledgerGroupId)))
                : ledgerRows;
        const candidates =
            ledgerGroupId != null && ledgerGroupId > 0 && filtered.length === 0 && ledgerRows.length > 0
                ? ledgerRows
                : filtered;
        return candidates
            .map((l) => ({
                ...l,
                label: `${l.name ?? ''}`.trim() || `Ledger ${l.ledgerId}`
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [ledgerRows, ledgerGroupFilter.filterIds, ledgerGroupId]);

    useEffect(() => {
        setLedgerSuggestions(ledgerOptions);
    }, [ledgerOptions]);

    useEffect(() => {
        if (ledgerId == null) {
            setSelectedBankLedger(null);
            return;
        }
        if (selectedBankLedger && Number(selectedBankLedger.ledgerId) === Number(ledgerId)) return;
        const match = ledgerOptions.find((option) => Number(option.ledgerId) === Number(ledgerId)) ?? null;
        if (match) setSelectedBankLedger(match);
    }, [ledgerId, ledgerOptions, selectedBankLedger]);

    const showLedgerSpinner = isLedgerLoading && ledgerPanelOpen;
    const rowFilterSource = useMemo(() => {
        const next = {
            hasVoucherRows: false,
            voucherNumbers: [] as Array<string | null | undefined>,
            chequeNos: [] as Array<string | null | undefined>,
            voucherDates: [] as Array<string | null | undefined>,
            voucherTypes: [] as Array<string | null | undefined>,
            counterLedgerNames: [] as Array<string | null | undefined>,
            narrations: [] as Array<string | null | undefined>,
            debits: [] as Array<number | null | undefined>,
            credits: [] as Array<number | null | undefined>,
            balances: [] as Array<number | null | undefined>,
            discounts: [] as Array<number | null | undefined>,
            chequeCharges: [] as Array<number | null | undefined>
        };
        rows.forEach((row) => {
            if (!next.hasVoucherRows && row.postingId > 0 && !row.isOpening) {
                next.hasVoucherRows = true;
            }
            next.voucherNumbers.push(row.voucherNumber);
            next.chequeNos.push(row.chequeNo);
            next.voucherDates.push(row.voucherDate);
            next.voucherTypes.push(row.voucherType);
            next.counterLedgerNames.push(row.counterLedgerName);
            next.narrations.push(row.narration);
            next.debits.push(row.debit);
            next.credits.push(row.credit);
            next.balances.push(row.balance);
            next.discounts.push(resolveAmountValue(row.discountAmount, 0));
            next.chequeCharges.push(resolveAmountValue(row.chequeCancelCharges, 0));
        });
        return next;
    }, [rows]);
    const hasVoucherRows = rowFilterSource.hasVoucherRows;
    const lastStatementImport = lastImportData?.ledgerReconciliationStatementImport ?? null;
    const statementSummary = useMemo(() => {
        if (!statementEntries.length) return '';
        const matched = statementEntries.filter((entry) => entry.status === 'Matched').length;
        const ambiguous = statementEntries.filter((entry) => entry.status === 'Ambiguous').length;
        const unmatched = statementEntries.filter((entry) => entry.status === 'Unmatched').length;
        return `Loaded: ${statementEntries.length}   Rule: ${getRuleShortText(matchRule)}   Matched: ${matched}   Ambiguous: ${ambiguous}   Unmatched: ${unmatched}`;
    }, [matchRule, statementEntries]);

    const statementPreviewRows = useMemo(
        () =>
            statementEntries.map((entry, index) => ({
                ...entry,
                rowKey: `${entry.sourceRowNumber}-${index}`
            })),
        [statementEntries]
    );
    const formatStatementDate = (value: Date | null) => (value ? formatDate(toDateText(value)) : '');

    const isEmptyFilterValue = (value: unknown) => {
        if (value == null) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        return false;
    };

    const getFilterValues = (filters: DataTableFilterMeta, field: string): unknown[] => {
        const meta = filters[field] as ColumnFilterMeta | undefined;
        if (!meta) return [];
        if (Array.isArray(meta.constraints)) {
            return meta.constraints
                .map((constraint) => constraint.value)
                .filter((value) => !isEmptyFilterValue(value));
        }
        if (isEmptyFilterValue(meta.value)) return [];
        return [meta.value];
    };

    const toTextFilterSet = (filters: DataTableFilterMeta, field: string) => {
        const values = getFilterValues(filters, field);
        const next = new Set<string>();
        values.forEach((item) => {
            const normalized = String(item ?? '').toLowerCase().trim();
            if (normalized.length > 0) {
                next.add(normalized);
            }
        });
        return next;
    };

    const toNumberFilterSet = (filters: DataTableFilterMeta, field: string) => {
        const values = getFilterValues(filters, field);
        const next = new Set<number>();
        values.forEach((item) => {
            const numeric = typeof item === 'number' ? item : Number(String(item).replace(/,/g, ''));
            if (Number.isFinite(numeric)) {
                next.add(Number(numeric));
            }
        });
        return next;
    };

    const activeFilterValues = useMemo(() => {
        const voucherNumber = toTextFilterSet(columnFilters, 'voucherNumber');
        const chequeNo = toTextFilterSet(columnFilters, 'chequeNo');
        const voucherDate = toTextFilterSet(columnFilters, 'voucherDate');
        const voucherType = toTextFilterSet(columnFilters, 'voucherType');
        const counterLedgerName = toTextFilterSet(columnFilters, 'counterLedgerName');
        const narration = toTextFilterSet(columnFilters, 'narration');
        const debit = toNumberFilterSet(columnFilters, 'debit');
        const credit = toNumberFilterSet(columnFilters, 'credit');
        const balance = toNumberFilterSet(columnFilters, 'balance');
        const discountAmount = toNumberFilterSet(columnFilters, 'discountAmount');
        const chequeCancelCharges = toNumberFilterSet(columnFilters, 'chequeCancelCharges');
        const hasFilters =
            voucherNumber.size > 0 ||
            chequeNo.size > 0 ||
            voucherDate.size > 0 ||
            voucherType.size > 0 ||
            counterLedgerName.size > 0 ||
            narration.size > 0 ||
            debit.size > 0 ||
            credit.size > 0 ||
            balance.size > 0 ||
            discountAmount.size > 0 ||
            chequeCancelCharges.size > 0;
        return {
            hasFilters,
            voucherNumber,
            chequeNo,
            voucherDate,
            voucherType,
            counterLedgerName,
            narration,
            debit,
            credit,
            balance,
            discountAmount,
            chequeCancelCharges
        };
    }, [columnFilters]);

    const matchesInText = (value: string | null | undefined, filterValues: Set<string>) => {
        if (filterValues.size === 0) return true;
        const hay = String(value ?? '').toLowerCase().trim();
        return filterValues.has(hay);
    };

    const matchesInNumber = (value: number | null | undefined, filterValues: Set<number>) => {
        if (filterValues.size === 0) return true;
        const actual = value != null ? Number(value) : 0;
        return filterValues.has(Number(actual));
    };

    const displayRows = useMemo(() => {
        if (!activeFilterValues.hasFilters) return rows;
        return rows.filter((row) => {
            if (!matchesInText(row.voucherNumber, activeFilterValues.voucherNumber)) return false;
            if (!matchesInText(row.chequeNo, activeFilterValues.chequeNo)) return false;
            if (!matchesInText(row.voucherDate, activeFilterValues.voucherDate)) return false;
            if (!matchesInText(row.voucherType, activeFilterValues.voucherType)) return false;
            if (!matchesInText(row.counterLedgerName, activeFilterValues.counterLedgerName)) return false;
            if (!matchesInText(row.narration, activeFilterValues.narration)) return false;
            if (!matchesInNumber(row.debit, activeFilterValues.debit)) return false;
            if (!matchesInNumber(row.credit, activeFilterValues.credit)) return false;
            if (!matchesInNumber(row.balance, activeFilterValues.balance)) return false;
            if (!matchesInNumber(row.discountAmount, activeFilterValues.discountAmount)) return false;
            if (!matchesInNumber(row.chequeCancelCharges, activeFilterValues.chequeCancelCharges)) return false;
            return true;
        });
    }, [activeFilterValues, rows]);

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const voucherNumberFilterOptions = useMemo(
        () => buildTextFilterOptions(rowFilterSource.voucherNumbers),
        [rowFilterSource.voucherNumbers]
    );
    const chequeNoFilterOptions = useMemo(
        () => buildTextFilterOptions(rowFilterSource.chequeNos),
        [rowFilterSource.chequeNos]
    );
    const voucherDateFilterOptions = useMemo(
        () => buildDateFilterOptions(rowFilterSource.voucherDates),
        [rowFilterSource.voucherDates]
    );
    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(rowFilterSource.voucherTypes),
        [rowFilterSource.voucherTypes]
    );
    const ledgerFilterOptions = useMemo(
        () => buildTextFilterOptions(rowFilterSource.counterLedgerNames),
        [rowFilterSource.counterLedgerNames]
    );
    const narrationFilterOptions = useMemo(
        () => buildTextFilterOptions(rowFilterSource.narrations),
        [rowFilterSource.narrations]
    );

    const debitFilterOptions = useMemo(() => buildNumberFilterOptions(rowFilterSource.debits), [rowFilterSource.debits]);
    const creditFilterOptions = useMemo(() => buildNumberFilterOptions(rowFilterSource.credits), [rowFilterSource.credits]);
    const balanceFilterOptions = useMemo(() => buildNumberFilterOptions(rowFilterSource.balances), [rowFilterSource.balances]);
    const discountFilterOptions = useMemo(
        () => buildNumberFilterOptions(rowFilterSource.discounts),
        [rowFilterSource.discounts]
    );
    const chequeChargesFilterOptions = useMemo(
        () => buildNumberFilterOptions(rowFilterSource.chequeCharges),
        [rowFilterSource.chequeCharges]
    );

    const voucherNumberFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherNumberFilterOptions),
        [voucherNumberFilterOptions]
    );
    const chequeNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(chequeNoFilterOptions),
        [chequeNoFilterOptions]
    );
    const voucherDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherDateFilterOptions),
        [voucherDateFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions),
        [voucherTypeFilterOptions]
    );
    const ledgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerFilterOptions),
        [ledgerFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions),
        [narrationFilterOptions]
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
    const discountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(discountFilterOptions),
        [discountFilterOptions]
    );
    const chequeChargesFilterElement = useMemo(
        () => buildMultiSelectFilterElement(chequeChargesFilterOptions),
        [chequeChargesFilterOptions]
    );

    const bankBalanceLabel = useMemo(() => {
        if (!ledgerId) return null;
        if (bankBalanceLoading) return 'Loading...';
        const balance = bankBalanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [bankBalanceData, bankBalanceLoading, ledgerId]);

    const bankBalanceSeverity = useMemo(() => {
        if (bankBalanceLoading) return 'warning';
        const drCr = bankBalanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'danger' : 'success';
    }, [bankBalanceData, bankBalanceLoading]);

    const showBankBalance = Boolean(
        bankBalanceLabel && selectedBankLedger && ledgerId && Number(selectedBankLedger.ledgerId) === Number(ledgerId)
    );

    const rowsByPostingId = useMemo(() => {
        const map = new Map<number, BankReconciliationRow>();
        rawRows.forEach((row) => {
            if (row.postingId > 0) {
                map.set(row.postingId, row);
            }
        });
        return map;
    }, [rawRows]);

    const pendingReconCount = useMemo(
        () =>
            Object.entries(pendingReconEdits).filter(([postingId, edit]) => {
                const id = Number(postingId);
                if (!rowsByPostingId.has(id)) return false;
                return edit.touchedDate || edit.touchedRemark;
            }).length,
        [pendingReconEdits, rowsByPostingId]
    );

    const resolveRowReconDate = (row: BankReconciliationRow) => {
        const overrideDate = matchApplyDateOverrides[row.postingId] ?? null;
        if (overrideDate && typeof console !== 'undefined') console.log('[ledger-reconciliation] resolved recDate', row.postingId, overrideDate);
        if (overrideDate) return overrideDate;
        const override = matchApplyOverrides[row.postingId]?.reconciliationDate ?? null;
        const raw = override ?? row.reconciliationDate ?? '';
        return parseDateText(raw) ?? null;
    };

    const resolveReconDateValue = (row: BankReconciliationRow) => {
        const edit = pendingReconEdits[row.postingId];
        if (edit?.touchedDate) return edit.date ?? resolveRowReconDate(row);
        return resolveRowReconDate(row);
    };

    const resolveReconRemarkValue = (row: BankReconciliationRow) => {
        const edit = pendingReconEdits[row.postingId];
        if (edit?.touchedRemark) return edit.remark;
        const override = matchApplyOverrides[row.postingId]?.reconciliationRemark ?? null;
        return override ?? row.reconciliationRemark ?? '';
    };

    const updateReconEdit = (postingId: number, patch: Partial<ReconEdit>) => {
        if (!Number.isFinite(postingId) || postingId <= 0) return;
        setPendingReconEdits((prev) => {
            const existing = prev[postingId] ?? {
                date: null,
                remark: '',
                touchedDate: false,
                touchedRemark: false
            };
            return {
                ...prev,
                [postingId]: {
                    ...existing,
                    ...patch
                }
            };
        });
    };

    const savePendingRecon = async () => {
        if (pendingReconCount === 0) return;
        setSaving(true);
        try {
            const entries = Object.entries(pendingReconEdits).reduce(
                (acc, [key, edit]) => {
                    const postingId = Number(key);
                    if (!Number.isFinite(postingId) || postingId <= 0) return acc;
                    if (!edit.touchedDate && !edit.touchedRemark) return acc;
                    const row = rowsByPostingId.get(postingId);
                    if (!row || row.isOpening) return acc;

                    const baseDate = parseDateText(row.reconciliationDate ?? '') ?? null;
                    const nextDate = edit.touchedDate ? edit.date : baseDate;
                    const baseRemark = row.reconciliationRemark ?? '';
                    const nextRemark = edit.touchedRemark ? edit.remark : baseRemark;
                    const nextDateText = nextDate ? toDateText(nextDate) : null;
                    const baseDateText = baseDate ? toDateText(baseDate) : null;
                    const nextRemarkTrim = nextRemark.trim();
                    const baseRemarkTrim = baseRemark.trim();

                    if ((nextDateText ?? '') === (baseDateText ?? '') && nextRemarkTrim === baseRemarkTrim) {
                        return acc;
                    }

                    acc.push({
                        postingId,
                        reconciliationDate: nextDateText,
                        reconciliationRemark: nextRemarkTrim ? nextRemarkTrim : null
                    });
                    return acc;
                },
                [] as { postingId: number; reconciliationDate: string | null; reconciliationRemark: string | null }[]
            );
            if (typeof console !== 'undefined') console.log('[ledger-reconciliation] save entries', entries.length, 'pending', pendingReconCount);

            if (!entries.length) {
                toastRef.current?.show({ severity: 'info', summary: 'No changes', detail: 'Nothing to save.' });
                return;
            }

            await updateRecon({ variables: { entries } });
            toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: 'Reconciliation updated.' });
            setPendingReconEdits((prev) => {
                const next = { ...prev };
                entries.forEach((entry) => {
                    delete next[entry.postingId];
                });
                return next;
            });
            await refetch(appliedVariables ?? registerVariables);
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to update' });
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (pendingReconCount > 0) {
            setPendingReconEdits({});
            setMatchApplyOverrides({});
            setMatchApplyDateOverrides({});
            toastRef.current?.show({
                severity: 'info',
                summary: 'Cleared pending',
                detail: 'Pending reconciliation changes cleared for refresh.'
            });
        }
        if (!hasApplied) {
            setAppliedVariables(registerVariables);
            return;
        }
        setAppliedVariables(registerVariables);
        void refetch(registerVariables);
    };

    const handleImportStatementClick = () => {
        if (!hasVoucherRows) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'No data',
                detail: 'Please click Refresh to load grid data before importing statement.'
            });
            return;
        }
        statementFileInputRef.current?.click();
    };

    const handleDownloadLastImport = async () => {
        if (!ledgerId || !fromDate || !toDate) return;
        try {
            const result = await loadStatementImportFile({
                variables: {
                    ledgerId,
                    fromDate,
                    toDate,
                    includeFile: true
                }
            });
            const info = result.data?.ledgerReconciliationStatementImport;
            if (!info?.fileBase64) {
                toastRef.current?.show({
                    severity: 'info',
                    summary: 'No file',
                    detail: 'Last import file is not available.'
                });
                return;
            }
            const contentType = info.contentType || 'application/octet-stream';
            const blob = base64ToBlob(info.fileBase64, contentType);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = info.fileName || 'statement.xlsx';
            link.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Download failed',
                detail: err?.message || 'Unable to download last import.'
            });
        }
    };

    const handleStatementFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setStatementImporting(true);
        try {
            const { entries, workbook, sheetName, headerRowIndex, colRecStatus, colRecRemark, fileBuffer } =
                await readStatementEntriesFromExcel(file);
            if (!entries.length) {
                toastRef.current?.show({
                    severity: 'info',
                    summary: 'No rows',
                    detail: 'No statement transactions found in the selected file.'
                });
                return;
            }
            setStatementEntries(entries);
            setStatementFileName(file.name);
            setStatementUpdatedFile(null);
            statementWorkbookRef.current = {
                workbook,
                sheetName,
                headerRowIndex,
                colRecStatus,
                colRecRemark
            };
            if (ledgerId && fromDate && toDate) {
                try {
                    const fileBase64 = arrayBufferToBase64(fileBuffer);
                    await uploadStatementImport({
                        variables: {
                            ledgerId,
                            fromDate,
                            toDate,
                            fileName: file.name,
                            contentType: file.type || 'application/octet-stream',
                            fileBase64
                        }
                    });
                    await refetchLastImport();
                } catch (err: any) {
                    toastRef.current?.show({
                        severity: 'warn',
                        summary: 'Import saved locally',
                        detail: err?.message || 'Failed to upload statement file to server.'
                    });
                }
            }
            setStatementDialogVisible(true);
        } catch (err: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Import failed',
                detail: err?.message || 'Error reading statement file.'
            });
        } finally {
            setStatementImporting(false);
            event.target.value = '';
        }
    };

    const handleMatchAndApply = async () => {
        if (!statementEntries.length) return;
        let matchRows = rows;
        if (hasApplied && totalPostings > rows.length && appliedVariables) {
            try {
                const result = await apolloClient.query({
                    query: BANK_RECONCILIATION,
                    fetchPolicy: 'network-only',
                    variables: { ...appliedVariables, limit: null, offset: 0 }
                });
                matchRows = (result.data?.bankReconciliation?.items ?? []) as BankReconciliationRow[];
            } catch {
                matchRows = rows;
            }
        }
        const pendingRows = matchRows.filter(
            (row) => row.postingId > 0 && !row.isOpening && !row.reconciliationDate
        );
        if (!pendingRows.length) {
            toastRef.current?.show({
                severity: 'info',
                summary: 'No pending rows',
                detail: 'No pending grid rows available to match.'
            });
            return;
        }

        setStatementMatching(true);
        try {
            const usedRowIndices = new Set<number>();
            const nextEntries = statementEntries.map((entry) => ({ ...entry }));
            const updatesMap = new Map<number, { postingId: number; reconciliationDate: string | null; reconciliationRemark: string | null }>();
            const updatesDateMap = new Map<number, Date>();

            for (const entry of nextEntries) {
                if (entry.status === 'Matched') continue;
                const matchResult = matchStatementEntryToRows(pendingRows, entry, usedRowIndices, matchRule);
                if (matchResult.matched) {
                    entry.status = 'Matched';
                    entry.matchedTo = matchResult.matchedTo;
                    entry.reason = '';
                    entry.matchedRowIndices = matchResult.rowIndices;
                    matchResult.rowIndices.forEach((idx) => usedRowIndices.add(idx));
                } else if (matchResult.ambiguous) {
                    entry.status = 'Ambiguous';
                    entry.matchedTo = '';
                    entry.reason = matchResult.reason;
                } else {
                    entry.status = 'Unmatched';
                    entry.matchedTo = '';
                    entry.reason = matchResult.reason;
                }
            }

            nextEntries.forEach((entry) => {
                if (entry.status !== 'Matched' || !entry.matchedRowIndices?.length) return;
                const recDate = entry.postDate ?? entry.valueDate ?? null;
                if (recDate && typeof console !== 'undefined') console.log('[ledger-reconciliation] match recDate', entry.sourceRowNumber, recDate);
                if (!recDate) return;
                const recDateText = toDateText(recDate);
                for (const idx of entry.matchedRowIndices) {
                    const row = pendingRows[idx];
                    if (!row) continue;
                    const existingRemark = (row.reconciliationRemark ?? '').trim();
                    const remark = existingRemark || getAutoRemark(matchRule);
                    if (!updatesMap.has(row.postingId)) {
                        updatesMap.set(row.postingId, {
                            postingId: row.postingId,
                            reconciliationDate: recDateText,
                            reconciliationRemark: remark || null
                        });
                    }
                    if (!updatesDateMap.has(row.postingId)) {
                        updatesDateMap.set(row.postingId, recDate);
                    }
                }
            });

            nextEntries.forEach((entry) => {
                if (!entry.status) return;
                entry.excelStatus = entry.status;
                entry.excelRemark =
                    entry.status === 'Matched' ? entry.matchedTo ?? '' : entry.reason ?? '';
            });

            setStatementEntries(nextEntries);

            const updates = Array.from(updatesMap.values());
            if (!updates.length) {
                toastRef.current?.show({
                    severity: 'info',
                    summary: 'No matches',
                    detail: 'No statement rows matched the selected rule.'
                });
                return;
            }

            setPendingReconEdits((prev) => {
                const next = { ...prev };
                updates.forEach((update) => {
                    const existing = next[update.postingId] ?? {
                        date: null,
                        remark: '',
                        touchedDate: false,
                        touchedRemark: false
                    };
                    const parsedDate =
                        updatesDateMap.get(update.postingId) ??
                        (update.reconciliationDate ? parseDateText(String(update.reconciliationDate)) : null);
                    next[update.postingId] = {
                        date: parsedDate,
                        remark: update.reconciliationRemark ?? existing.remark ?? '',
                        touchedDate: Boolean(parsedDate),
                        touchedRemark: true
                    };
                });
                return next;
            });
            setMatchApplyOverrides((prev) => {
                const next = { ...prev };
                updates.forEach((update) => {
                    next[update.postingId] = {
                        reconciliationDate: update.reconciliationDate ?? null,
                        reconciliationRemark: update.reconciliationRemark ?? null
                    };
                });
                return next;
            });
            setMatchApplyDateOverrides((prev) => {
                const next = { ...prev };
                updatesDateMap.forEach((value, key) => {
                    next[key] = value;
                });
                return next;
            });
            toastRef.current?.show({
                severity: 'success',
                summary: 'Matched',
                detail: `${updates.length} row${updates.length === 1 ? '' : 's'} queued. Click Save to apply.`
            });

            if (statementWorkbookRef.current) {
                try {
                    const updatedWorkbook = await updateStatementWorkbook(statementWorkbookRef.current, nextEntries);
                    if (updatedWorkbook) {
                        const XLSX = await import('xlsx');
                        const buffer = XLSX.write(updatedWorkbook, { type: 'array', bookType: 'xlsx' });
                        const blob = new Blob([buffer], {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });
                        const url = URL.createObjectURL(blob);
                        const fileName = toStatementDownloadFileName(statementFileName);
                        setStatementUpdatedFile((prev) => {
                            if (prev?.url) URL.revokeObjectURL(prev.url);
                            return { name: fileName, url };
                        });
                    }
                } catch {
                    // Ignore excel update errors
                }
            }
        } catch (err: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Match failed',
                detail: err?.message || 'Failed to apply matches.'
            });
        } finally {
            setStatementMatching(false);
        }
    };

    return (
        <div className="card app-gradient-card">
            <Toast ref={toastRef} />
            <input
                ref={statementFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleStatementFileChange}
            />
            <Dialog
                header={statementFileName ? `Statement Import (${statementFileName})` : 'Statement Import'}
                visible={statementDialogVisible}
                style={{ width: '90vw', maxWidth: '1200px' }}
                onHide={() => setStatementDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Close"
                            className="p-button-text"
                            onClick={() => setStatementDialogVisible(false)}
                        />
                        {statementUpdatedFile && (
                            <Button
                                label="Download Updated"
                                icon="pi pi-download"
                                className="p-button-text"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = statementUpdatedFile.url;
                                    link.download = statementUpdatedFile.name;
                                    link.click();
                                }}
                            />
                        )}
                        <Button
                            label={statementMatching ? 'Matching...' : 'Match & Apply'}
                            icon="pi pi-check"
                            onClick={handleMatchAndApply}
                            disabled={statementMatching || statementImporting || !statementEntries.length}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-2 statement-import-preview">
                    {statementSummary && <div className="text-600 text-sm">{statementSummary}</div>}
                    <AppDataTable
                        value={statementPreviewRows}
                        dataKey="rowKey"
                        rows={10}
                        paginator={statementPreviewRows.length > 10}
                        size="small"
                        stripedRows
                        loading={statementImporting || statementMatching}
                        rowClassName={(row) => {
                            if (row.status === 'Matched') return 'statement-preview-row--matched';
                            if (row.status === 'Ambiguous') return 'statement-preview-row--ambiguous';
                            if (row.status === 'Unmatched') return 'statement-preview-row--unmatched';
                            return '';
                        }}
                        emptyMessage={statementImporting ? '' : 'No statement rows'}
                    >
                        <Column field="sourceRowNumber" header="Row" style={{ width: '4rem' }} />
                        <Column
                            field="postDate"
                            header="Post Date"
                            body={(row: StatementEntry) => formatStatementDate(row.postDate)}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            field="valueDate"
                            header="Value Date"
                            body={(row: StatementEntry) => formatStatementDate(row.valueDate)}
                            style={{ width: '7rem' }}
                        />
                        <Column field="chequeNumber" header="Chq No." style={{ width: '7rem' }} />
                        <Column
                            field="debit"
                            header="Debit"
                            body={(row: StatementEntry) => (row.debit ? formatAmount(row.debit) : '')}
                            style={{ width: '6.5rem', textAlign: 'right' }}
                        />
                        <Column
                            field="credit"
                            header="Credit"
                            body={(row: StatementEntry) => (row.credit ? formatAmount(row.credit) : '')}
                            style={{ width: '6.5rem', textAlign: 'right' }}
                        />
                        <Column
                            header="Amount"
                            body={(row: StatementEntry) => {
                                const amount = row.debit > 0 ? row.debit : row.credit;
                                return amount ? formatAmount(amount) : '';
                            }}
                            style={{ width: '6.5rem', textAlign: 'right' }}
                        />
                        <Column field="description" header="Description" style={{ minWidth: '14rem' }} />
                        <Column field="status" header="Status" style={{ width: '6rem' }} />
                        <Column field="matchedTo" header="Matched To" style={{ minWidth: '12rem' }} />
                        <Column field="reason" header="Reason" style={{ minWidth: '12rem' }} />
                    </AppDataTable>
                </div>
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Ledger Reconciliation</h2>
                        <p className="mt-2 mb-0 text-600">Mark reconciliation date/remark for ledger postings.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/apps/accounts/audit">
                            <Button label="Posting Details" icon="pi pi-search" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading reconciliation: {error.message}</p>}
            </div>

            <AppDataTable
                value={displayRows}
                paginator
                rows={rowsPerPage}
                rowsPerPageOptions={[20, 50, 100]}
                totalRecords={totalRecords}
                className="summary-table"
                lazy={false}
                first={first}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                rowClassName={(row: BankReconciliationRow) =>
                    row.postingId > 0 && matchApplyOverrides[row.postingId]
                        ? 'ledger-recon-row--matched'
                        : ''
                }
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                }}
                dataKey="postingId"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [value, prev[1]]);
                                    setDateErrors({});
                                }}
                                placeholder="From date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                autoFocus
                                selectOnFocus
                                style={{ width: '130px' }}
                            />
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [prev[0], value]);
                                    setDateErrors({});
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={toDateInputRef}
                                onEnterNext={() => focusDropdown(ledgerGroupInputRef)}
                                style={{ width: '130px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2">
                            <LedgerGroupAutoComplete
                                value={ledgerGroupId}
                                options={ledgerGroupOptions}
                                loading={ledgerGroupLoading}
                                onChange={(nextValue) => {
                                    hasManualLedgerGroupRef.current = true;
                                    setLedgerGroupId(nextValue);
                                    setLedgerId(null);
                                    setSelectedBankLedger(null);
                                    setLedgerLookupRows([]);
                                    setLedgerSuggestions([]);
                                    setLedgerQuery('');
                                    setLedgerPanelOpen(false);
                                    const nextFilter = resolveLedgerGroupFilter(nextValue, ledgerGroupOptions);
                                    void fetchLedgers({ groupId: nextFilter.fetchGroupId, mode: 'all' });
                                }}
                                placeholder="Ledger group"
                                loadingPlaceholder="Loading groups..."
                                onSelectNext={() => focusDropdown(bankLedgerInputRef)}
                                inputId="ledger-recon-ledger-group"
                                ref={ledgerGroupInputRef}
                                style={{ minWidth: '220px' }}
                            />
                        </div>
                        <div className="flex align-items-center gap-2 ledger-ledger-meta">
                            <LedgerAutoComplete
                                value={selectedBankLedger ?? ledgerQuery}
                                suggestions={ledgerSuggestions}
                                ledgerGroupIds={ledgerGroupFilter.filterIds}
                                completeMethod={(event: AutoCompleteCompleteEvent) => {
                                    const query = event.query ?? '';
                                    setLedgerQuery(query);
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
                                onChange={(event: AutoCompleteChangeEvent) => {
                                    const value = event.value as LedgerLookupOption | string | null;
                                    const shouldFocusNext = ledgerEnterRef.current;
                                    ledgerEnterRef.current = false;
                                    if (value == null) {
                                        setLedgerQuery('');
                                        setSelectedBankLedger(null);
                                        setLedgerId(null);
                                        return;
                                    }
                                    if (typeof value === 'string') {
                                        const trimmed = value.trim();
                                        const match =
                                            trimmed.length === 0
                                                ? null
                                                : ledgerSuggestions.find(
                                                      (option) =>
                                                          (option.label ?? '').toLowerCase() === trimmed.toLowerCase()
                                                  ) ??
                                                  ledgerOptions.find(
                                                      (option) =>
                                                          (option.label ?? '').toLowerCase() === trimmed.toLowerCase()
                                                  ) ??
                                                  null;
                                        if (match) {
                                            setLedgerQuery('');
                                            setSelectedBankLedger(match);
                                            setLedgerId(Number(match.ledgerId));
                                            if (shouldFocusNext) {
                                                focusDropdown(reconciledInputRef);
                                            }
                                            return;
                                        }
                                        setLedgerQuery(value);
                                        setSelectedBankLedger(null);
                                        setLedgerId(null);
                                        if (shouldFocusNext) {
                                            focusDropdown(reconciledInputRef);
                                        }
                                        return;
                                    }
                                    setLedgerQuery('');
                                    setSelectedBankLedger(value);
                                    setLedgerId(Number(value.ledgerId));
                                    if (shouldFocusNext) {
                                        focusDropdown(reconciledInputRef);
                                    }
                                }}
                                field="label"
                                loading={showLedgerSpinner}
                                showEmptyMessage
                                placeholder={showLedgerSpinner ? 'Loading ledgers...' : 'Select ledger'}
                                inputId="ledger-reconciliation-ledger"
                                ref={bankLedgerInputRef}
                                onShow={() => setLedgerPanelOpen(true)}
                                onHide={() => {
                                    setLedgerPanelOpen(false);
                                    if (ledgerEnterRef.current) {
                                        ledgerEnterRef.current = false;
                                        focusDropdown(reconciledInputRef);
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    ledgerEnterRef.current = true;
                                    if (!ledgerPanelOpen) {
                                        ledgerEnterRef.current = false;
                                        focusDropdown(reconciledInputRef);
                                    }
                                }}
                                virtualScrollerOptions={{ itemSize: 36 }}
                                inputRef={ledgerInputRef}
                                style={{ minWidth: '320px' }}
                            />
                            {selectedBankLedger && (
                                <LedgerMetaPanel
                                    address={selectedBankLedger.address}
                                    balanceLabel={bankBalanceLabel}
                                    balanceSeverity={bankBalanceSeverity}
                                    showBalance={showBankBalance}
                                />
                            )}
                        </div>
                        <AppDropdown
                            value={reconciled}
                            ref={reconciledInputRef}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Unreconciled', value: 0 },
                                { label: 'Reconciled', value: 1 }
                            ]}
                            onChange={(e) => setReconciled(e.value)}
                            placeholder="Reconciled"
                            onEnterNext={focusRefreshButton}
                            style={{ minWidth: '170px' }}
                        />
                        <div className="flex align-items-center gap-2">
                            <InputSwitch
                                checked={useReconcileDate}
                                onChange={(e) => setUseReconcileDate(Boolean(e.value))}
                                disabled={reconciled !== 1}
                            />
                            <span className="text-600 text-sm">Use reconcile date</span>
                        </div>
                    </>
                }
                headerRight={
                    <>
                        <div className="flex align-items-center gap-2">
                            <span className="text-600 text-sm">Match Rule</span>
                            <AppDropdown
                                ref={matchRuleInputRef}
                                value={matchRule}
                                options={MATCH_RULE_OPTIONS}
                                onChange={(e) => setMatchRule(e.value)}
                                placeholder="Match rule"
                                style={{ minWidth: '210px' }}
                            />
                        </div>
                        <Button
                            label={statementImporting ? 'Importing...' : 'Import Statement'}
                            icon="pi pi-upload"
                            className="p-button-text"
                            onClick={handleImportStatementClick}
                            disabled={statementImporting || !hasVoucherRows}
                        />
                        {statementFileName && statementEntries.length > 0 && (
                            <div className="flex align-items-center gap-2">
                                <span className="text-600 text-xs">Current import: {statementFileName}</span>
                                <Button
                                    label="Open"
                                    icon="pi pi-folder-open"
                                    className="p-button-text p-button-sm"
                                    onClick={() => setStatementDialogVisible(true)}
                                />
                            </div>
                        )}
                        {lastStatementImport?.fileName && (
                            <div className="flex align-items-center gap-2">
                                <span className="text-600 text-xs">Last import: {lastStatementImport.fileName}</span>
                                <Button
                                    label="View"
                                    icon="pi pi-eye"
                                    className="p-button-text p-button-sm"
                                    onClick={handleDownloadLastImport}
                                />
                            </div>
                        )}
                        <Button
                            label={saving ? 'Saving...' : `Save${pendingReconCount ? ` (${pendingReconCount})` : ''}`}
                            icon="pi pi-save"
                            className="p-button-text"
                            onClick={savePendingRecon}
                            disabled={saving || pendingReconCount === 0}
                        />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            id={refreshButtonId}
                            onClick={handleRefresh}
                            disabled={!canRefresh}
                        />
                        <Button label="Print" icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
                    </>
                }
                recordSummary={
                    data?.bankReconciliation
                        ? `${totalRecords} row${totalRecords === 1 ? '' : 's'} • Dr ${formatAmount(
                              debitTotal
                          )} • Cr ${formatAmount(creditTotal)}`
                        : ''
                }
            >
                <Column
                    header="Rec. Date"
                    body={(r: BankReconciliationRow) => {
                        const editable = r.postingId > 0 && !r.isOpening;
                        const overrideDate = matchApplyDateOverrides[r.postingId] ?? null;
                        const resolvedDate = overrideDate ?? resolveReconDateValue(r);
                        const dateKey = resolvedDate ? toDateText(resolvedDate) : 'empty';
                        return (
                            <AppDateInput
                                key={`${r.postingId}-${dateKey}`}
                                value={resolvedDate}
                                onChange={(value) =>
                                    updateReconEdit(r.postingId, { date: value, touchedDate: true })
                                }
                                placeholder="Recon date"
                                disabled={!editable}
                                style={{ width: '9rem' }}
                            />
                        );
                    }}
                    style={{ width: '10rem' }}
                />
                <Column
                    header="R. Remark"
                    body={(r: BankReconciliationRow) => {
                        const editable = r.postingId > 0 && !r.isOpening;
                        return (
                            <AppInput
                                value={resolveReconRemarkValue(r)}
                                onChange={(e) =>
                                    updateReconEdit(r.postingId, {
                                        remark: e.target.value,
                                        touchedRemark: true
                                    })
                                }
                                placeholder="Remark"
                                disabled={!editable}
                                style={{ width: '100%' }}
                            />
                        );
                    }}
                    style={{ width: '16rem' }}
                />
                <Column
                    field="voucherDate"
                    header="Voucher Date"
                    body={(r: BankReconciliationRow) => formatDate(r.voucherDate)}
                    sortable
                    style={{ width: '8rem' }}
                    filterElement={voucherDateFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherNumber"
                    header="Voucher No."
                    sortable
                    filterElement={voucherNumberFilterElement}
                    style={{ width: '7rem' }}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="chequeNo"
                    header="Chq. No."
                    body={(r: BankReconciliationRow) => r.chequeNo ?? ''}
                    filterElement={chequeNoFilterElement}
                    style={{ width: '8rem' }}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherType"
                    header="Voucher Type"
                    sortable
                    filterElement={voucherTypeFilterElement}
                    style={{ width: '9rem' }}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="counterLedgerName"
                    header="Ag. Ledger"
                    body={(r: BankReconciliationRow) => r.counterLedgerName ?? ''}
                    filterElement={ledgerFilterElement}
                    footer="Total"
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="debit"
                    header="Dr Amt"
                    body={(r: BankReconciliationRow) => (r.debit ? formatAmount(r.debit) : '')}
                    dataType="numeric"
                    style={{ width: '8.5rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={debitTotal ? formatAmount(debitTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={debitFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="credit"
                    header="Cr Amt"
                    body={(r: BankReconciliationRow) => (r.credit ? formatAmount(r.credit) : '')}
                    dataType="numeric"
                    style={{ width: '8.5rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={creditTotal ? formatAmount(creditTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={creditFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="balance"
                    header="Balance"
                    body={(r: BankReconciliationRow) => (r.balance ? formatAmount(r.balance) : '')}
                    dataType="numeric"
                    style={{ width: '10rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={balanceFooterLabel}
                    footerStyle={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={balanceFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="drCr"
                    header=""
                    style={{ width: '4rem' }}
                    footer={balanceFooterDrCr}
                    footerStyle={{ textAlign: 'left', whiteSpace: 'nowrap' }}
                />
                <Column
                    field="discountAmount"
                    header="Discount"
                    body={(r: BankReconciliationRow) => {
                        const value = resolveAmountValue(r.discountAmount, 0);
                        return value ? formatAmount(value) : '';
                    }}
                    dataType="numeric"
                    style={{ width: '8rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={discountTotal ? formatAmount(discountTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={discountFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="chequeCancelCharges"
                    header="Chq. Charges"
                    body={(r: BankReconciliationRow) => {
                        const value = resolveAmountValue(r.chequeCancelCharges, 0);
                        return value ? formatAmount(value) : '';
                    }}
                    dataType="numeric"
                    style={{ width: '9rem', textAlign: 'right' }}
                    headerStyle={{ textAlign: 'right' }}
                    footer={chequeChargesTotal ? formatAmount(chequeChargesTotal) : ''}
                    footerStyle={{ textAlign: 'right' }}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    filterElement={chequeChargesFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
            </AppDataTable>
        </div>
    );
}
