'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Button } from 'primereact/button';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppCompactToggle from '@/components/AppCompactToggle';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppInput from '@/components/AppInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppReportActions from '@/components/AppReportActions';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import { ReportHeader } from '@/components/ReportHeader';
import { ReportRegisterSearch } from '@/components/ReportRegisterSearch';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';

interface LedgerSummaryRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
}

interface ChequeIssueBookRow {
    chequeIssueBookId: number;
    bankLedgerId: number | null;
    voucherNumber: string | null;
    voucherDate: string | null;
    chequeStartNumber: number | null;
    chequeEndNumber: number | null;
    usedChequeCount: number | null;
    cancelledChequeCount: number | null;
    unusedChequeCount: number | null;
    totalChequeCount: number | null;
    minUsedChequeNumber: number | null;
    maxUsedChequeNumber: number | null;
    isFullyConsumed: boolean | null;
    remarks: string | null;
    isCancelledFlag: number | null;
}

interface ChequeIssueBookConsumedEntryRow {
    voucherId: number;
    voucherNumber: string | null;
    voucherDate: string | null;
    chequeNumber: number | null;
    chequeDate: string | null;
    isCancelledFlag: number | null;
}

type LedgerOption = {
    label: string;
    value: number | null;
    groupName: string;
    name: string;
};

type ChequeIssueBookTableRow = ChequeIssueBookRow & {
    issueDateKey: number | null;
    bankLedgerName: string;
    usedCount: number;
    cancelledCount: number;
    unusedCount: number;
    usageBucket: string;
    usageSortKey: number;
    statusText: string;
};

type FormValidationErrors = {
    bankLedgerId?: string;
    voucherDate?: string;
    chequeStartNumber?: string;
    chequeEndNumber?: string;
    remarks?: string;
};

const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                groupName
            }
        }
    }
`;

const CHEQUE_ISSUE_BOOKS = gql`
    query ChequeIssueBooks($bankLedgerId: Int, $fromDate: String, $toDate: String, $cancelled: Int, $limit: Int, $offset: Int) {
        chequeIssueBooks(bankLedgerId: $bankLedgerId, fromDate: $fromDate, toDate: $toDate, cancelled: $cancelled, limit: $limit, offset: $offset) {
            chequeIssueBookId
            bankLedgerId
            voucherNumber
            voucherDate
            chequeStartNumber
            chequeEndNumber
            usedChequeCount
            cancelledChequeCount
            unusedChequeCount
            totalChequeCount
            minUsedChequeNumber
            maxUsedChequeNumber
            isFullyConsumed
            remarks
            isCancelledFlag
        }
    }
`;

const CHEQUE_ISSUE_BOOK_CONSUMED_ENTRIES = gql`
    query ChequeIssueBookConsumedEntries($chequeIssueBookId: Int!, $limit: Int, $offset: Int) {
        chequeIssueBookConsumedEntries(chequeIssueBookId: $chequeIssueBookId, limit: $limit, offset: $offset) {
            voucherId
            voucherNumber
            voucherDate
            chequeNumber
            chequeDate
            isCancelledFlag
        }
    }
`;

const NEXT_CHEQUE_ISSUE_BOOK_NUMBER = gql`
    query NextChequeIssueBookNumber {
        nextChequeIssueBookNumber
    }
`;

const CREATE_CHEQUE_ISSUE_BOOK = gql`
    mutation CreateChequeIssueBook(
        $bankLedgerId: Int!
        $voucherNumber: String
        $voucherDateText: String!
        $chequeStartNumber: Int
        $chequeEndNumber: Int
        $remarks: String
    ) {
        createChequeIssueBook(
            bankLedgerId: $bankLedgerId
            voucherNumber: $voucherNumber
            voucherDateText: $voucherDateText
            chequeStartNumber: $chequeStartNumber
            chequeEndNumber: $chequeEndNumber
            remarks: $remarks
        ) {
            chequeIssueBookId
        }
    }
`;

const UPDATE_CHEQUE_ISSUE_BOOK = gql`
    mutation UpdateChequeIssueBook(
        $chequeIssueBookId: Int!
        $bankLedgerId: Int
        $voucherNumber: String
        $voucherDateText: String
        $chequeStartNumber: Int
        $chequeEndNumber: Int
        $remarks: String
    ) {
        updateChequeIssueBook(
            chequeIssueBookId: $chequeIssueBookId
            bankLedgerId: $bankLedgerId
            voucherNumber: $voucherNumber
            voucherDateText: $voucherDateText
            chequeStartNumber: $chequeStartNumber
            chequeEndNumber: $chequeEndNumber
            remarks: $remarks
        ) {
            chequeIssueBookId
        }
    }
`;

const SET_CANCELLED = gql`
    mutation SetChequeIssueBookCancelled($chequeIssueBookId: Int!, $isCancelledFlag: Int!) {
        setChequeIssueBookCancelled(chequeIssueBookId: $chequeIssueBookId, isCancelledFlag: $isCancelledFlag)
    }
`;

const DELETE_CHEQUE_ISSUE_BOOK = gql`
    mutation DeleteChequeIssueBook($chequeIssueBookId: Int!) {
        deleteChequeIssueBook(chequeIssueBookId: $chequeIssueBookId)
    }
`;

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

const toIssueDateKey = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{8}$/.test(trimmed)) {
        const key = Number(trimmed);
        return Number.isFinite(key) ? key : null;
    }

    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const key = Number(`${iso[1]}${iso[2]}${iso[3]}`);
        return Number.isFinite(key) ? key : null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    const yyyy = String(parsed.getFullYear());
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const key = Number(`${yyyy}${mm}${dd}`);
    return Number.isFinite(key) ? key : null;
};

const toPositiveWholeNumber = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return null;
    if (!Number.isInteger(value) || value <= 0) return null;
    return Number(value);
};

const trimToNull = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart <= bEnd && bStart <= aEnd;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
} as const;

type SelectFilterOption<T extends string | number> = {
    label: string;
    value: T;
};

const buildTextSelectOptions = (values: Array<string | null | undefined>): SelectFilterOption<string>[] => {
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

const buildNumberSelectOptions = (values: Array<number | null | undefined>): SelectFilterOption<number>[] => {
    const unique = new Set<number>();
    values.forEach((value) => {
        if (value == null || !Number.isFinite(value)) return;
        unique.add(Number(value));
    });
    return Array.from(unique.values())
        .sort((a, b) => a - b)
        .map((value) => ({ label: String(value), value }));
};

const buildDateSelectOptions = (values: Array<string | null | undefined>): SelectFilterOption<string>[] => {
    const unique = new Map<string, string>();
    values.forEach((value) => {
        if (!value) return;
        const label = formatDate(value);
        if (!label) return;
        unique.set(value, label);
    });
    return Array.from(unique.entries())
        .sort((left, right) => {
            const leftKey = toIssueDateKey(left[0]) ?? Number.MAX_SAFE_INTEGER;
            const rightKey = toIssueDateKey(right[0]) ?? Number.MAX_SAFE_INTEGER;
            return leftKey - rightKey;
        })
        .map(([value, label]) => ({ label, value }));
};

const buildMultiSelectFilterElement =
    <T extends string | number>(options: SelectFilterOption<T>[], placeholder = 'Any') =>
    (templateOptions: ColumnFilterElementTemplateOptions) => (
        <AppMultiSelect
            value={(templateOptions.value ?? []) as T[]}
            options={options}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => templateOptions.filterCallback(event.value)}
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder={placeholder}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={options.length > 0 ? 'No values found' : 'No values'}
            emptyFilterMessage="No results found"
            disabled={options.length === 0}
            style={{ minWidth: '18rem' }}
        />
    );

const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    voucherNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherDate: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    bankLedgerName: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    chequeStartNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    chequeEndNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    usageBucket: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    remarks: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    statusText: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

export default function AccountsChequeBookIssuePage() {
    const { companyContext } = useAuth();
    const toastRef = useRef<Toast>(null);
    const [cancelled, setCancelled] = useState<0 | 1>(0);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'cheque-book-issue-refresh';
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [searchMatchCase, setSearchMatchCase] = useState(false);
    const [searchWholeWord, setSearchWholeWord] = useState(false);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [viewDialogVisible, setViewDialogVisible] = useState(false);
    const [selectedIssueBookId, setSelectedIssueBookId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [viewingRow, setViewingRow] = useState<ChequeIssueBookTableRow | null>(null);
    const [saving, setSaving] = useState(false);

    const [voucherNo, setVoucherNo] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [formErrors, setFormErrors] = useState<FormValidationErrors>({});
    const [formBankLedgerId, setFormBankLedgerId] = useState<number | null>(null);
    const [startNo, setStartNo] = useState<number | null>(null);
    const [endNo, setEndNo] = useState<number | null>(null);
    const [remarks, setRemarks] = useState('');

    const { data: ledgerData, loading: ledgerLoading } = useQuery(LEDGER_LOOKUP, {
        variables: { search: null, limit: 5000 },
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const { data: nextNoData, refetch: refetchNextNo } = useQuery(NEXT_CHEQUE_ISSUE_BOOK_NUMBER);

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const hasTouchedDatesRef = useRef(false);
    const canRefresh = Boolean(fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };
    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const queryVariables = useMemo(
        () => ({
            bankLedgerId: null,
            fromDate,
            toDate,
            cancelled,
            limit: 5000,
            offset: 0
        }),
        [cancelled, fromDate, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof queryVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(CHEQUE_ISSUE_BOOKS, {
        variables: appliedVariables ?? queryVariables,
        skip: !appliedVariables,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const shouldLoadFormRows = dialogVisible && formBankLedgerId != null && Number(formBankLedgerId) > 0;
    const { data: formRowsData, loading: formRowsLoading } = useQuery(CHEQUE_ISSUE_BOOKS, {
        skip: !shouldLoadFormRows,
        variables: {
            bankLedgerId: formBankLedgerId ?? 0,
            fromDate: null,
            toDate: null,
            cancelled: -1,
            limit: 5000,
            offset: 0
        },
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first'
    });
    const [createChequeIssueBook] = useMutation(CREATE_CHEQUE_ISSUE_BOOK);
    const [updateChequeIssueBook] = useMutation(UPDATE_CHEQUE_ISSUE_BOOK);
    const [setCancelledMutation] = useMutation(SET_CANCELLED);
    const [deleteChequeIssueBook] = useMutation(DELETE_CHEQUE_ISSUE_BOOK);
    const { data: consumedEntriesData, loading: consumedEntriesLoading } = useQuery(CHEQUE_ISSUE_BOOK_CONSUMED_ENTRIES, {
        skip: selectedIssueBookId == null,
        variables: {
            chequeIssueBookId: selectedIssueBookId ?? 0,
            limit: 5000,
            offset: 0
        },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        setFirst(0);
        const refreshVariables = { ...queryVariables };
        if (!hasApplied) {
            setAppliedVariables(refreshVariables);
            return;
        }
        setAppliedVariables(refreshVariables);
        void refetch(refreshVariables);
    };

    const ledgerOptions = useMemo<LedgerOption[]>(() => {
        const rows = (ledgerData?.ledgerSummaries?.items ?? []) as LedgerSummaryRow[];
        return rows.map((l) => ({
            label: `${l.name ?? ''}${l.groupName ? ` (${l.groupName})` : ''}`.trim() || `Ledger ${l.ledgerId}`,
            value: Number(l.ledgerId),
            groupName: String(l.groupName ?? ''),
            name: l.name ?? ''
        }));
    }, [ledgerData]);

    const ledgerNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const o of ledgerOptions) map.set(Number(o.value), String(o.name ?? ''));
        return map;
    }, [ledgerOptions]);

    const rows: ChequeIssueBookRow[] = useMemo(() => (hasApplied ? data?.chequeIssueBooks ?? [] : []), [data, hasApplied]);
    const formRows: ChequeIssueBookRow[] = useMemo(() => (formRowsData?.chequeIssueBooks ?? []) as ChequeIssueBookRow[], [formRowsData]);
    const reportLoading = Boolean(hasApplied && loading);
    const tableLoading = reportLoading && rows.length === 0;

    const filteredRows = useMemo(() => {
        const term = searchText.trim();
        if (!term) return rows;

        const matcher = searchWholeWord
            ? new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(term)}(?=$|[^A-Za-z0-9])`, searchMatchCase ? '' : 'i')
            : null;
        const normalizedTerm = searchMatchCase ? term : term.toLowerCase();

        return rows.filter((r) => {
            const parts = [
                r.voucherNumber ?? '',
                r.remarks ?? '',
                r.bankLedgerId ? ledgerNameById.get(r.bankLedgerId) ?? '' : '',
                r.chequeStartNumber != null ? String(r.chequeStartNumber) : '',
                r.chequeEndNumber != null ? String(r.chequeEndNumber) : ''
            ];
            const haystack = parts.join(' ');
            if (matcher) return matcher.test(haystack);
            const normalizedHaystack = searchMatchCase ? haystack : haystack.toLowerCase();
            return normalizedHaystack.includes(normalizedTerm);
        });
    }, [ledgerNameById, rows, searchMatchCase, searchText, searchWholeWord]);

    const tableRows = useMemo<ChequeIssueBookTableRow[]>(
        () =>
            filteredRows
                .map((row) => {
                    const consumedCount =
                        row.usedChequeCount != null && Number.isFinite(Number(row.usedChequeCount))
                            ? Math.max(0, Number(row.usedChequeCount))
                            : 0;
                    const cancelledCountRaw =
                        row.cancelledChequeCount != null && Number.isFinite(Number(row.cancelledChequeCount))
                            ? Math.max(0, Number(row.cancelledChequeCount))
                            : 0;
                    const cancelledCount = Math.min(consumedCount, cancelledCountRaw);
                    const usedCount = Math.max(0, consumedCount - cancelledCount);
                    const totalCount =
                        row.totalChequeCount != null && Number.isFinite(Number(row.totalChequeCount))
                            ? Math.max(0, Number(row.totalChequeCount))
                            : row.chequeStartNumber != null &&
                                row.chequeEndNumber != null &&
                                Number.isFinite(Number(row.chequeStartNumber)) &&
                                Number.isFinite(Number(row.chequeEndNumber))
                              ? Math.max(0, Number(row.chequeEndNumber) - Number(row.chequeStartNumber) + 1)
                              : null;
                    const unusedCountFromRow =
                        row.unusedChequeCount != null && Number.isFinite(Number(row.unusedChequeCount))
                            ? Math.max(0, Number(row.unusedChequeCount))
                            : null;
                    const unusedCount = Math.max(
                        0,
                        unusedCountFromRow ?? (totalCount != null ? totalCount - consumedCount : 0)
                    );
                    const usageBucket =
                        usedCount === 0 && cancelledCount === 0
                            ? 'Fresh'
                            : unusedCount === 0
                              ? 'Fully consumed'
                              : 'Partially consumed';

                    return {
                        ...row,
                        issueDateKey: toIssueDateKey(row.voucherDate),
                        bankLedgerName: row.bankLedgerId ? ledgerNameById.get(row.bankLedgerId) ?? '' : '',
                        usedCount,
                        cancelledCount,
                        unusedCount,
                        usageBucket,
                        usageSortKey: usedCount * 1_000_000 + cancelledCount * 1_000 + unusedCount,
                        statusText: row.isCancelledFlag ? 'Cancelled' : 'Active'
                    };
                })
                .sort((left, right) => {
                    const leftKey = left.issueDateKey ?? Number.MAX_SAFE_INTEGER;
                    const rightKey = right.issueDateKey ?? Number.MAX_SAFE_INTEGER;
                    if (leftKey !== rightKey) return leftKey - rightKey;
                    return left.chequeIssueBookId - right.chequeIssueBookId;
                }),
        [filteredRows, ledgerNameById]
    );

    const selectedRow = useMemo(
        () => tableRows.find((row) => Number(row.chequeIssueBookId) === Number(selectedIssueBookId)) ?? null,
        [selectedIssueBookId, tableRows]
    );

    useEffect(() => {
        if (selectedIssueBookId == null) return;
        if (tableRows.some((row) => Number(row.chequeIssueBookId) === Number(selectedIssueBookId))) return;
        setSelectedIssueBookId(null);
        if (viewDialogVisible) {
            setViewDialogVisible(false);
            setViewingRow(null);
        }
    }, [selectedIssueBookId, tableRows, viewDialogVisible]);

    const consumedEntries = useMemo(
        () =>
            ((consumedEntriesData?.chequeIssueBookConsumedEntries ?? []) as ChequeIssueBookConsumedEntryRow[]).map((entry) => ({
                ...entry,
                statusText: Number(entry.isCancelledFlag ?? 0) === 1 ? 'Cancelled' : 'Used'
            })),
        [consumedEntriesData]
    );

    const issueNoFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.voucherNumber)),
        [tableRows]
    );
    const issueDateFilterOptions = useMemo(
        () => buildDateSelectOptions(tableRows.map((row) => row.voucherDate)),
        [tableRows]
    );
    const bankLedgerFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.bankLedgerName)),
        [tableRows]
    );
    const chequeStartFilterOptions = useMemo(
        () => buildNumberSelectOptions(tableRows.map((row) => row.chequeStartNumber)),
        [tableRows]
    );
    const chequeEndFilterOptions = useMemo(
        () => buildNumberSelectOptions(tableRows.map((row) => row.chequeEndNumber)),
        [tableRows]
    );
    const usageFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.usageBucket)),
        [tableRows]
    );
    const remarkFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.remarks)),
        [tableRows]
    );
    const statusFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.statusText)),
        [tableRows]
    );

    const issueNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(issueNoFilterOptions),
        [issueNoFilterOptions]
    );
    const issueDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(issueDateFilterOptions),
        [issueDateFilterOptions]
    );
    const bankLedgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(bankLedgerFilterOptions),
        [bankLedgerFilterOptions]
    );
    const chequeStartFilterElement = useMemo(
        () => buildMultiSelectFilterElement(chequeStartFilterOptions),
        [chequeStartFilterOptions]
    );
    const chequeEndFilterElement = useMemo(
        () => buildMultiSelectFilterElement(chequeEndFilterOptions),
        [chequeEndFilterOptions]
    );
    const usageFilterElement = useMemo(
        () => buildMultiSelectFilterElement(usageFilterOptions),
        [usageFilterOptions]
    );
    const remarkFilterElement = useMemo(
        () => buildMultiSelectFilterElement(remarkFilterOptions),
        [remarkFilterOptions]
    );
    const statusFilterElement = useMemo(
        () => buildMultiSelectFilterElement(statusFilterOptions),
        [statusFilterOptions]
    );

    const resetForm = () => {
        setEditingId(null);
        setVoucherNo(String(nextNoData?.nextChequeIssueBookNumber ?? '').trim());
        setVoucherDate(new Date());
        setFormBankLedgerId(null);
        setStartNo(null);
        setEndNo(null);
        setRemarks('');
        setFormErrors({});
    };

    const openAdd = async () => {
        try {
            const next = await refetchNextNo();
            setViewDialogVisible(false);
            setViewingRow(null);
            setEditingId(null);
            setVoucherNo(String(next?.data?.nextChequeIssueBookNumber ?? '').trim());
            setVoucherDate(new Date());
            setFormBankLedgerId(null);
            setStartNo(null);
            setEndNo(null);
            setRemarks('');
            setFormErrors({});
            setDialogVisible(true);
        } catch {
            resetForm();
            setDialogVisible(true);
        }
    };

    const fiscalRangeRestrictedReason = 'Editing is allowed only within the current fiscal year.';

    const getConsumedCount = (row: {
        usedCount?: number | null;
        cancelledCount?: number | null;
        usedChequeCount?: number | null;
        cancelledChequeCount?: number | null;
    }) => {
        const fromRawRow =
            row.usedChequeCount != null && Number.isFinite(Number(row.usedChequeCount))
                ? Number(row.usedChequeCount)
                : null;
        if (fromRawRow != null) return Math.max(0, fromRawRow);

        const usedCount =
            row.usedCount != null && Number.isFinite(Number(row.usedCount))
                ? Number(row.usedCount)
                : 0;
        const cancelledCount =
            row.cancelledCount != null && Number.isFinite(Number(row.cancelledCount))
                ? Number(row.cancelledCount)
                : row.cancelledChequeCount != null && Number.isFinite(Number(row.cancelledChequeCount))
                  ? Number(row.cancelledChequeCount)
                  : 0;
        return Math.max(0, usedCount + cancelledCount);
    };

    const getDateRestrictionReason = (voucherDateText: string | null) => {
        if (!voucherDateText) return fiscalRangeRestrictedReason;
        const parsed = new Date(`${voucherDateText}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return fiscalRangeRestrictedReason;
        return validateSingleDate({ date: parsed }, fiscalRange).ok ? null : fiscalRangeRestrictedReason;
    };

    const getEditDisabledReason = (row: {
        voucherDate: string | null;
        isCancelledFlag: number | null;
        usedCount?: number | null;
        cancelledCount?: number | null;
        usedChequeCount?: number | null;
        cancelledChequeCount?: number | null;
    }) => {
        const dateReason = getDateRestrictionReason(row.voucherDate);
        if (dateReason) return dateReason;
        if (Number(row.isCancelledFlag ?? 0) === 1) {
            return 'Editing disabled because this cheque issue book is cancelled.';
        }
        const usedCount = getConsumedCount(row);
        if (usedCount > 0) {
            return `Editing disabled: ${usedCount} consumed cheque${usedCount === 1 ? '' : 's'} exist.`;
        }
        return null;
    };

    const getCancelDisabledReason = (row: {
        voucherDate: string | null;
        usedCount?: number | null;
        cancelledCount?: number | null;
        usedChequeCount?: number | null;
        cancelledChequeCount?: number | null;
    }) => {
        const dateReason = getDateRestrictionReason(row.voucherDate);
        if (dateReason) return dateReason;
        const usedCount = getConsumedCount(row);
        if (usedCount > 0) {
            return `Cancel/undo disabled: ${usedCount} consumed cheque${usedCount === 1 ? '' : 's'} exist.`;
        }
        return null;
    };

    const getDeleteDisabledReason = (row: {
        isCancelledFlag: number | null;
        usedCount?: number | null;
        cancelledCount?: number | null;
        usedChequeCount?: number | null;
        cancelledChequeCount?: number | null;
    }) => {
        if (Number(row.isCancelledFlag ?? 0) === 1) {
            return 'Delete is allowed only for active new entries.';
        }
        const usedCount = getConsumedCount(row);
        if (usedCount > 0) {
            return `Delete disabled: ${usedCount} consumed cheque${usedCount === 1 ? '' : 's'} exist.`;
        }
        return null;
    };

    const openView = (row: ChequeIssueBookTableRow) => {
        setSelectedIssueBookId(row.chequeIssueBookId);
        setViewingRow(row);
        setViewDialogVisible(true);
    };

    const closeViewDialog = () => {
        setViewDialogVisible(false);
        setViewingRow(null);
    };

    const openEdit = (row: ChequeIssueBookRow | ChequeIssueBookTableRow) => {
        const disabledReason = getEditDisabledReason(row);
        if (disabledReason) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: disabledReason
            });
            return;
        }
        setViewDialogVisible(false);
        setViewingRow(null);
        setEditingId(row.chequeIssueBookId);
        setVoucherNo(row.voucherNumber ?? '');
        setVoucherDate(row.voucherDate ? new Date(row.voucherDate) : null);
        setFormBankLedgerId(row.bankLedgerId ?? null);
        setStartNo(row.chequeStartNumber ?? null);
        setEndNo(row.chequeEndNumber ?? null);
        setRemarks(row.remarks ?? '');
        setFormErrors({});
        setDialogVisible(true);
    };

    const editingRow = useMemo(
        () =>
            formRows.find((row) => Number(row.chequeIssueBookId) === Number(editingId)) ??
            rows.find((row) => Number(row.chequeIssueBookId) === Number(editingId)) ??
            null,
        [editingId, formRows, rows]
    );

    const editingUsageBounds = useMemo(() => {
        if (!editingRow) return null;
        const usedCount = getConsumedCount(editingRow);
        if (usedCount <= 0) return null;
        const minUsed =
            editingRow.minUsedChequeNumber != null && Number.isFinite(Number(editingRow.minUsedChequeNumber))
                ? Number(editingRow.minUsedChequeNumber)
                : null;
        const maxUsed =
            editingRow.maxUsedChequeNumber != null && Number.isFinite(Number(editingRow.maxUsedChequeNumber))
                ? Number(editingRow.maxUsedChequeNumber)
                : null;
        return {
            usedCount,
            minUsed,
            maxUsed
        };
    }, [editingRow]);

    const editingDisabledReason = useMemo(() => {
        if (!editingRow) return null;
        return getEditDisabledReason(editingRow);
    }, [editingRow]);

    const isEditingLocked = Boolean(editingDisabledReason);

    const validateForm = () => {
        const errors: FormValidationErrors = {};

        const voucherDateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!voucherDateValidation.ok) {
            errors.voucherDate = voucherDateValidation.errors.date ?? 'Issue date is required.';
        }

        if (!formBankLedgerId || Number(formBankLedgerId) <= 0) {
            errors.bankLedgerId = 'Select bank ledger.';
        }

        if (startNo == null) {
            errors.chequeStartNumber = 'Enter cheque start number.';
        } else if (!Number.isInteger(Number(startNo)) || Number(startNo) <= 0) {
            errors.chequeStartNumber = 'Cheque start number must be a positive whole number.';
        }

        if (endNo == null) {
            errors.chequeEndNumber = 'Enter cheque end number.';
        } else if (!Number.isInteger(Number(endNo)) || Number(endNo) <= 0) {
            errors.chequeEndNumber = 'Cheque end number must be a positive whole number.';
        }

        const normalizedStartNo = toPositiveWholeNumber(startNo);
        const normalizedEndNo = toPositiveWholeNumber(endNo);
        if (normalizedStartNo != null && normalizedEndNo != null && normalizedStartNo > normalizedEndNo) {
            const message = 'Cheque start number must be less than or equal to cheque end number.';
            errors.chequeStartNumber = message;
            errors.chequeEndNumber = message;
        }

        if (
            normalizedStartNo != null &&
            normalizedEndNo != null &&
            formBankLedgerId != null &&
            Object.keys(errors).length === 0
        ) {
            const overlappingBook = formRows.find((row) => {
                if (editingId != null && Number(row.chequeIssueBookId) === Number(editingId)) return false;
                if (Number(row.bankLedgerId ?? 0) !== Number(formBankLedgerId)) return false;
                if (Number(row.isCancelledFlag ?? 0) !== 0) return false;
                const existingStart = toPositiveWholeNumber(row.chequeStartNumber);
                const existingEnd = toPositiveWholeNumber(row.chequeEndNumber);
                if (existingStart == null || existingEnd == null) return false;
                return rangesOverlap(normalizedStartNo, normalizedEndNo, existingStart, existingEnd);
            });

            if (overlappingBook) {
                const existingStart = toPositiveWholeNumber(overlappingBook.chequeStartNumber);
                const existingEnd = toPositiveWholeNumber(overlappingBook.chequeEndNumber);
                const existingVoucherLabel = overlappingBook.voucherNumber
                    ? `issue ${overlappingBook.voucherNumber}`
                    : `book ${overlappingBook.chequeIssueBookId}`;
                const message =
                    existingStart != null && existingEnd != null
                        ? `Cheque range overlaps with ${existingVoucherLabel} (${existingStart} to ${existingEnd}).`
                        : `Cheque range overlaps with ${existingVoucherLabel}.`;
                errors.chequeStartNumber = message;
                errors.chequeEndNumber = message;
            }
        }

        if (remarks.trim().length > 250) {
            errors.remarks = 'Remark can be up to 250 characters.';
        }

        return errors;
    };

    const save = async () => {
        if (shouldLoadFormRows && formRowsLoading) {
            toastRef.current?.show({
                severity: 'info',
                summary: 'Please wait',
                detail: 'Cheque range is still loading for validation.'
            });
            return;
        }

        if (isEditingLocked) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Editing disabled',
                detail: editingDisabledReason ?? 'Editing is disabled for this cheque issue book.'
            });
            return;
        }

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            const firstError = Object.values(errors).find(Boolean) ?? 'Please correct the highlighted fields.';
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: firstError });
            return;
        }
        setFormErrors({});

        const voucherDateText = toDateText(voucherDate);
        if (!voucherDateText || !formBankLedgerId) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select issue date and bank ledger.' });
            return;
        }

        try {
            setSaving(true);
            const variables = {
                bankLedgerId: formBankLedgerId,
                voucherNumber: trimToNull(voucherNo),
                voucherDateText,
                chequeStartNumber: toPositiveWholeNumber(startNo),
                chequeEndNumber: toPositiveWholeNumber(endNo),
                remarks: trimToNull(remarks)
            };

            if (editingId) {
                await updateChequeIssueBook({ variables: { chequeIssueBookId: editingId, ...variables } });
            } else {
                await createChequeIssueBook({ variables });
            }

            setDialogVisible(false);
            await refetch(queryVariables);
            await refetchNextNo();
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to save.' });
        } finally {
            setSaving(false);
        }
    };

    const toggleCancelled = async (row: ChequeIssueBookTableRow) => {
        const cancelDisabledReason = getCancelDisabledReason(row);
        if (cancelDisabledReason) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: cancelDisabledReason
            });
            return;
        }
        try {
            const next = row.isCancelledFlag ? 0 : 1;
            await setCancelledMutation({ variables: { chequeIssueBookId: row.chequeIssueBookId, isCancelledFlag: next } });
            await refetch(queryVariables);
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to update status.' });
        }
    };

    const removeIssueBook = async (row: ChequeIssueBookTableRow) => {
        const deleteDisabledReason = getDeleteDisabledReason(row);
        if (deleteDisabledReason) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: deleteDisabledReason
            });
            return;
        }
        try {
            await deleteChequeIssueBook({ variables: { chequeIssueBookId: row.chequeIssueBookId } });
            if (selectedIssueBookId === row.chequeIssueBookId) {
                setSelectedIssueBookId(null);
            }
            if (viewingRow && Number(viewingRow.chequeIssueBookId) === Number(row.chequeIssueBookId)) {
                closeViewDialog();
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: `Cheque issue ${row.voucherNumber ?? row.chequeIssueBookId} deleted.`
            });
            await refetch(queryVariables);
            await refetchNextNo();
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to delete.' });
        }
    };

    useEffect(() => {
        setSearchText('');
        setSearchMatchCase(false);
        setSearchWholeWord(false);
    }, [cancelled, dateRange]);

    const statusBody = (row: ChequeIssueBookRow) =>
        row.isCancelledFlag ? <Tag value="Cancelled" severity="danger" /> : <Tag value="Active" severity="success" />;
    const consumedStatusBody = (row: { isCancelledFlag: number | null }) =>
        Number(row.isCancelledFlag ?? 0) === 1 ? <Tag value="Cancelled" severity="danger" /> : <Tag value="Used" severity="success" />;
    const usageBody = (row: ChequeIssueBookTableRow) => (
        <div
            className="flex align-items-center gap-2 white-space-nowrap"
            title={`Used ${row.usedCount}, Cancelled ${row.cancelledCount}, Unused ${row.unusedCount}`}
        >
            <span
                className="inline-flex align-items-center justify-content-center text-xs font-semibold"
                style={{ minWidth: '32px', padding: '4px 8px', borderRadius: '8px', background: '#5f9c2a', color: '#fff' }}
                title={`Used: ${row.usedCount}`}
            >
                {row.usedCount}
            </span>
            <span
                className="inline-flex align-items-center justify-content-center text-xs font-semibold"
                style={{ minWidth: '32px', padding: '4px 8px', borderRadius: '8px', background: '#d63a35', color: '#fff' }}
                title={`Cancelled: ${row.cancelledCount}`}
            >
                {row.cancelledCount}
            </span>
            <span
                className="inline-flex align-items-center justify-content-center text-xs font-semibold"
                style={{ minWidth: '32px', padding: '4px 8px', borderRadius: '8px', background: '#8f98a3', color: '#fff' }}
                title={`Unused: ${row.unusedCount}`}
            >
                {row.unusedCount}
            </span>
        </div>
    );
    const usageHeader = (
        <div className="flex flex-column gap-1">
            <span>Usage</span>
            <span className="flex align-items-center gap-3 text-xs text-600">
                <span className="flex align-items-center gap-1">
                    <span className="inline-block" style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#5f9c2a' }} />
                    <span>Used</span>
                </span>
                <span className="flex align-items-center gap-1">
                    <span className="inline-block" style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#d63a35' }} />
                    <span>Cancelled</span>
                </span>
                <span className="flex align-items-center gap-1">
                    <span className="inline-block" style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#8f98a3' }} />
                    <span>Unused</span>
                </span>
            </span>
        </div>
    );

    const actionsBody = (row: ChequeIssueBookTableRow) => {
        const editDisabledReason = getEditDisabledReason(row);
        const cancelDisabledReason = getCancelDisabledReason(row);
        const deleteDisabledReason = getDeleteDisabledReason(row);
        const cancelActionLabel = row.isCancelledFlag ? 'Undo cancellation' : 'Cancel book';
        return (
            <div className="flex gap-2">
                <span className="inline-flex" title="View details">
                    <Button
                        icon="pi pi-eye"
                        className="p-button-text p-button-sm"
                        onClick={() => openView(row)}
                    />
                </span>
                <span className="inline-flex" title={editDisabledReason ?? 'Edit'}>
                    <Button
                        icon="pi pi-pencil"
                        className="p-button-text p-button-sm"
                        onClick={() => openEdit(row)}
                        disabled={Boolean(editDisabledReason)}
                    />
                </span>
                <span className="inline-flex" title={cancelDisabledReason ?? cancelActionLabel}>
                    <Button
                        icon={row.isCancelledFlag ? 'pi pi-undo' : 'pi pi-ban'}
                        className="p-button-text p-button-sm"
                        onClick={() => {
                            void toggleCancelled(row);
                        }}
                        disabled={Boolean(cancelDisabledReason)}
                    />
                </span>
                <span className="inline-flex" title={deleteDisabledReason ?? 'Delete'}>
                    <Button
                        icon="pi pi-trash"
                        className="p-button-text p-button-sm p-button-danger"
                        onClick={() => {
                            void removeIssueBook(row);
                        }}
                        disabled={Boolean(deleteDisabledReason)}
                    />
                </span>
            </div>
        );
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />

            <Dialog
                header={editingId ? 'Edit Cheque Book Issue' : 'Add Cheque Book Issue'}
                visible={dialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onHide={() => {
                    setDialogVisible(false);
                    setFormErrors({});
                }}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button
                            label="Cancel"
                            className="p-button-text"
                            onClick={() => {
                                setDialogVisible(false);
                                setFormErrors({});
                            }}
                            disabled={saving}
                        />
                        <Button
                            id="cheque-book-issue-save"
                            label={saving ? 'Saving...' : 'Save'}
                            icon="pi pi-check"
                            onClick={save}
                            disabled={saving || isEditingLocked}
                        />
                    </div>
                }
            >
                {editingId != null && isEditingLocked && (
                    <div className="mb-3 p-2 border-round surface-50 text-700 text-sm">
                        {editingUsageBounds ? (
                            <>
                                Consumed cheques: <strong>{editingUsageBounds.usedCount}</strong>
                                {editingUsageBounds.minUsed != null && editingUsageBounds.maxUsed != null
                                    ? ` entries (${editingUsageBounds.minUsed} to ${editingUsageBounds.maxUsed})`
                                    : ' entries'}
                                . {editingDisabledReason}
                            </>
                        ) : (
                            editingDisabledReason
                        )}
                    </div>
                )}

                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Issue No.</label>
                        <AppInput
                            inputId="cheque-book-issue-form-issue-no"
                            value={voucherNo}
                            disabled={isEditingLocked}
                            onChange={(event) => setVoucherNo(event.target.value)}
                            onEnterNext={() => {
                                const element = document.getElementById('cheque-book-issue-form-issue-date');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Issue Date</label>
                        <AppDateInput
                            value={voucherDate}
                            disabled={isEditingLocked}
                            onChange={(value) => {
                                setVoucherDate(value);
                                setFormErrors((prev) => ({ ...prev, voucherDate: undefined }));
                            }}
                            inputId="cheque-book-issue-form-issue-date"
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            onEnterNext={() => {
                                const element = document.getElementById('cheque-book-issue-form-bank-ledger');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={`w-full${formErrors.voucherDate ? ' p-invalid' : ''}`}
                        />
                        {formErrors.voucherDate && <small className="text-red-500">{formErrors.voucherDate}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Bank Ledger</label>
                        <LedgerAutoComplete
                            variant="purpose"
                            purpose="CONTRA-BANK"
                            inputId="cheque-book-issue-form-bank-ledger"
                            value={formBankLedgerId}
                            disabled={isEditingLocked}
                            onChange={(value) => {
                                setFormBankLedgerId(value);
                                setFormErrors((prev) => ({
                                    ...prev,
                                    bankLedgerId: undefined,
                                    chequeStartNumber: undefined,
                                    chequeEndNumber: undefined
                                }));
                            }}
                            placeholder={ledgerLoading ? 'Loading bank ledgers...' : 'Select bank ledger'}
                            loadingPlaceholder="Loading bank ledgers..."
                            onSelectNext={() => {
                                const element = document.getElementById('cheque-book-issue-form-cheque-start');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                }
                            }}
                            className={`w-full${formErrors.bankLedgerId ? ' p-invalid' : ''}`}
                        />
                        {formErrors.bankLedgerId && <small className="text-red-500">{formErrors.bankLedgerId}</small>}
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Cheque No. From</label>
                        <AppInput
                            inputType="number"
                            inputId="cheque-book-issue-form-cheque-start"
                            value={startNo}
                            disabled={isEditingLocked}
                            onValueChange={(event) => {
                                setStartNo(event.value == null ? null : Number(event.value));
                                setFormErrors((prev) => ({
                                    ...prev,
                                    chequeStartNumber: undefined,
                                    chequeEndNumber: undefined
                                }));
                            }}
                            min={1}
                            mode="decimal"
                            minFractionDigits={0}
                            maxFractionDigits={0}
                            useGrouping={false}
                            onEnterNext={() => {
                                const element = document.getElementById('cheque-book-issue-form-cheque-end');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={`w-full${formErrors.chequeStartNumber ? ' p-invalid' : ''}`}
                        />
                        {formErrors.chequeStartNumber && <small className="text-red-500">{formErrors.chequeStartNumber}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Cheque No. To</label>
                        <AppInput
                            inputType="number"
                            inputId="cheque-book-issue-form-cheque-end"
                            value={endNo}
                            disabled={isEditingLocked}
                            onValueChange={(event) => {
                                setEndNo(event.value == null ? null : Number(event.value));
                                setFormErrors((prev) => ({
                                    ...prev,
                                    chequeStartNumber: undefined,
                                    chequeEndNumber: undefined
                                }));
                            }}
                            min={1}
                            mode="decimal"
                            minFractionDigits={0}
                            maxFractionDigits={0}
                            useGrouping={false}
                            onEnterNext={() => {
                                const element = document.getElementById('cheque-book-issue-form-remark');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={`w-full${formErrors.chequeEndNumber ? ' p-invalid' : ''}`}
                        />
                        {formErrors.chequeEndNumber && <small className="text-red-500">{formErrors.chequeEndNumber}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Remark</label>
                        <AppInput
                            inputId="cheque-book-issue-form-remark"
                            value={remarks}
                            disabled={isEditingLocked}
                            onChange={(event) => {
                                setRemarks(event.target.value);
                                setFormErrors((prev) => ({ ...prev, remarks: undefined }));
                            }}
                            onEnterNext={() => {
                                const element = document.getElementById('cheque-book-issue-save');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={`w-full${formErrors.remarks ? ' p-invalid' : ''}`}
                        />
                        {formErrors.remarks && <small className="text-red-500">{formErrors.remarks}</small>}
                    </div>
                </div>
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <ReportHeader
                    title="Cheque Book Issue"
                    subtitle="Maintain cheque book ranges per bank ledger (required for cheque issue entry)."
                    rightSlot={
                        <ReportRegisterSearch
                            value={searchText}
                            onValueChange={setSearchText}
                            matchCase={searchMatchCase}
                            onMatchCaseChange={setSearchMatchCase}
                            wholeWord={searchWholeWord}
                            onWholeWordChange={setSearchWholeWord}
                            disabled={reportLoading && rows.length === 0}
                        />
                    }
                />
                {error && <p className="text-red-500 m-0">Error loading cheque book issues: {error.message}</p>}
            </div>

            <AppDataTable
                value={tableRows}
                className="app-report-table--inline-filters"
                paginator
                rows={rowsPerPage}
                rowsPerPageOptions={[20, 50, 100]}
                first={first}
                filters={columnFilters}
                onFilter={(event: DataTableFilterEvent) => setColumnFilters(event.filters)}
                filterDisplay="menu"
                filterDelay={400}
                onPage={(event) => {
                    setRowsPerPage(event.rows);
                    setFirst(event.first);
                }}
                dataKey="chequeIssueBookId"
                stripedRows
                size="small"
                loading={tableLoading}
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load cheque book issues'}
                selectionMode="single"
                selection={selectedRow ?? undefined}
                onSelectionChange={(event) => setSelectedIssueBookId(event.value?.chequeIssueBookId ?? null)}
                onRowDoubleClick={(event) => openView(event.data as ChequeIssueBookTableRow)}
                headerLeft={
                    <div className="flex flex-column gap-2 w-full">
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    setFirst(0);
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
                                style={{ width: '150px' }}
                            />
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
                                    setFirst(0);
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [prev[0], value]);
                                    setDateErrors({});
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={toDateInputRef}
                                onEnterNext={focusRefreshButton}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <AppCompactToggle
                                    checked={cancelled === 1}
                                    onChange={(checked) => {
                                        setFirst(0);
                                        setCancelled(checked ? 1 : 0);
                                    }}
                                    onLabel="Cancelled"
                                    offLabel="Not cancelled"
                                />
                            </div>
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                    </div>
                }
                headerRight={
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <Button label="New Book" icon="pi pi-plus" onClick={openAdd} />
                        <AppReportActions
                            onRefresh={handleRefresh}
                            onPrint={() => window.print()}
                            refreshDisabled={!canRefresh}
                            refreshButtonId={refreshButtonId}
                            loadingState={tableLoading}
                            loadingSummaryEnabled={hasApplied}
                        />
                    </div>
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading cheque book issues...'
                            : `${tableRows.length} cheque book issue${tableRows.length === 1 ? '' : 's'}`
                        : 'Press Refresh to load cheque book issues'
                }
            >
                <Column
                    field="voucherNumber"
                    header="Issue No."
                    sortable
                    style={{ width: '9rem' }}
                    filterElement={issueNoFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherDate"
                    sortField="issueDateKey"
                    header="Issue Date"
                    body={(r: ChequeIssueBookRow) => formatDate(r.voucherDate)}
                    sortable
                    style={{ width: '8rem' }}
                    filterElement={issueDateFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="bankLedgerName"
                    header="Bank Ledger"
                    sortable
                    filterElement={bankLedgerFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="chequeStartNumber"
                    header="Start"
                    sortable
                    style={{ width: '8rem', textAlign: 'center' }}
                    filterElement={chequeStartFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="chequeEndNumber"
                    header="End"
                    sortable
                    style={{ width: '8rem', textAlign: 'center' }}
                    filterElement={chequeEndFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="usageBucket"
                    sortField="usageSortKey"
                    header={usageHeader}
                    body={usageBody}
                    sortable
                    style={{ minWidth: '280px' }}
                    filterElement={usageFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="remarks"
                    header="Remark"
                    body={(r: ChequeIssueBookRow) => <span className="text-600">{r.remarks ?? ''}</span>}
                    sortable
                    filterElement={remarkFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="statusText"
                    header="Status"
                    body={statusBody}
                    sortable
                    style={{ width: '7rem' }}
                    filterElement={statusFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column header="Actions" body={actionsBody} style={{ width: '10rem' }} />
            </AppDataTable>

            {selectedRow && (
                <div className="mt-4">
                    <div className="m-0 text-base font-semibold">Consumed Cheques • {selectedRow.voucherNumber ?? selectedRow.chequeIssueBookId}</div>
                    <p className="text-600 mt-1">
                        {consumedEntriesLoading && consumedEntries.length === 0
                            ? 'Loading consumed cheque records...'
                            : `${consumedEntries.length} cheque${consumedEntries.length === 1 ? '' : 's'} consumed against this issue book.`}
                    </p>
                    <AppDataTable
                        value={consumedEntries}
                        paginator
                        rows={10}
                        rowsPerPageOptions={[10, 25, 50]}
                        dataKey="voucherId"
                        stripedRows
                        size="small"
                        loading={consumedEntriesLoading && consumedEntries.length === 0}
                        emptyMessage={consumedEntriesLoading ? 'Loading consumed cheque records...' : 'No consumed cheques found for this issue book.'}
                    >
                        <Column field="chequeNumber" header="Cheque No." sortable style={{ minWidth: '120px' }} />
                        <Column
                            field="chequeDate"
                            header="Cheque Date"
                            sortable
                            body={(row) => formatDate(row.chequeDate ?? row.voucherDate)}
                            style={{ minWidth: '130px' }}
                        />
                        <Column field="voucherNumber" header="Voucher No." sortable style={{ minWidth: '120px' }} />
                        <Column field="voucherDate" header="Voucher Date" sortable body={(row) => formatDate(row.voucherDate)} />
                        <Column field="statusText" header="Status" body={consumedStatusBody} sortable />
                    </AppDataTable>
                </div>
            )}

            <Dialog
                header="Cheque Book Issue Details"
                visible={viewDialogVisible}
                onHide={closeViewDialog}
                style={{ width: 'min(760px, 96vw)' }}
                modal
                footer={(
                    <div className="flex justify-content-end w-full">
                        <Button label="Close" className="p-button-text" onClick={closeViewDialog} />
                    </div>
                )}
            >
                {viewingRow ? (
                    <div className="flex flex-column gap-3">
                        <div className="grid">
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Issue No.</div>
                                <div className="font-medium">{viewingRow.voucherNumber?.trim() || '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Issue Date</div>
                                <div className="font-medium">{formatDate(viewingRow.voucherDate)}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Status</div>
                                <div>{statusBody(viewingRow)}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Bank Ledger</div>
                                <div className="font-medium">{viewingRow.bankLedgerName || '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Cheque No. From</div>
                                <div className="font-medium">{viewingRow.chequeStartNumber ?? '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Cheque No. To</div>
                                <div className="font-medium">{viewingRow.chequeEndNumber ?? '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Total</div>
                                <div className="font-medium">{viewingRow.totalChequeCount ?? '-'}</div>
                            </div>
                            <div className="col-12 md:col-8">
                                <div className="text-600 text-sm">Usage</div>
                                <div>{usageBody(viewingRow)}</div>
                            </div>
                            <div className="col-12">
                                <div className="text-600 text-sm">Remark</div>
                                <div className="font-medium">{viewingRow.remarks?.trim() || '-'}</div>
                            </div>
                        </div>

                        <div>
                            <div className="m-0 mb-2 text-base font-semibold">Consumed Cheque Records</div>
                            <AppDataTable
                                value={consumedEntries}
                                paginator
                                rows={10}
                                rowsPerPageOptions={[10, 25, 50]}
                                dataKey="voucherId"
                                stripedRows
                                size="small"
                                loading={consumedEntriesLoading && consumedEntries.length === 0}
                                emptyMessage={consumedEntriesLoading ? 'Loading consumed cheque records...' : 'No consumed cheques found for this issue book.'}
                            >
                                <Column field="chequeNumber" header="Cheque No." sortable style={{ minWidth: '120px' }} />
                                <Column
                                    field="chequeDate"
                                    header="Cheque Date"
                                    sortable
                                    body={(row) => formatDate(row.chequeDate ?? row.voucherDate)}
                                    style={{ minWidth: '130px' }}
                                />
                                <Column field="voucherNumber" header="Voucher No." sortable style={{ minWidth: '120px' }} />
                                <Column field="voucherDate" header="Voucher Date" sortable body={(row) => formatDate(row.voucherDate)} />
                                <Column field="statusText" header="Status" body={consumedStatusBody} sortable />
                            </AppDataTable>
                        </div>
                    </div>
                ) : null}
            </Dialog>
        </div>
    );
}
