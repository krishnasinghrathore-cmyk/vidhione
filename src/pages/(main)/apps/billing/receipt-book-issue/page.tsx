'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { z } from 'zod';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import type {
    AutoComplete,
    AutoCompleteChangeEvent,
    AutoCompleteCompleteEvent
} from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';
import type { DataTableFilterEvent, DataTableFilterMeta, DataTablePageEvent } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppCompactToggle from '@/components/AppCompactToggle';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppInput from '@/components/AppInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import { AppRegisterSearch } from '@/components/AppRegisterSearch';
import AppReportActions from '@/components/AppReportActions';
import { ReportHeader } from '@/components/ReportHeader';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';
import { billingApolloClient } from '@/lib/billingApolloClient';
import { formatReportLoadDuration } from '@/lib/reportLoadTime';

interface IssueBookRow {
    moneyReceiptIssueBookId: number;
    voucherNumber: string | null;
    bookNumber: string | null;
    voucherDateText: string | null;
    receiptStartNumber: number | null;
    receiptEndNumber: number | null;
    salesmanId: number | null;
    salesmanName: string | null;
    remarks: string | null;
    isCancelled: boolean;
}

interface IssueEntryRow {
    moneyReceiptIssueBookId: number;
    receiptNumber: number | null;
    receiptDateText: string | null;
    voucherNumber: string | null;
    status: string | null;
    voucherDateText: string | null;
}

interface SalesmanRow {
    salesmanId: number;
    name: string | null;
}

type SalesmanOption = {
    label: string;
    value: number;
};

type IssueBookTableRow = IssueBookRow & {
    issueDateKey: number | null;
    usedCount: number;
    cancelledCount: number;
    unusedCount: number;
    usageBucket: string;
    usageSortKey: number;
    statusText: string;
};

type IssueBookForm = {
    bookNumber: string;
    voucherDate: Date | null;
    receiptStartNumber: number | null;
    receiptEndNumber: number | null;
    salesmanId: number | null;
    remarks: string;
};

type ParsedIssueBookForm = {
    bookNumber: string;
    voucherDate: Date;
    receiptStartNumber: number;
    receiptEndNumber: number;
    salesmanId: number;
    remarks: string;
};

type IssueBookFormErrors = {
    bookNumber?: string;
    voucherDate?: string;
    receiptStartNumber?: string;
    receiptEndNumber?: string;
    salesmanId?: string;
    remarks?: string;
};

type IssueBookFormErrorKey = keyof IssueBookFormErrors;

type PageIndexLoadRequest = {
    first: number;
    rows: number;
    startedAtMs: number;
};

const SALESMEN = gql`
    query Salesmen($search: String, $limit: Int) {
        salesmen(search: $search, limit: $limit) {
            salesmanId
            name
        }
    }
`;

const ISSUE_BOOK_DETAIL = gql`
    query MoneyReceiptManualBookIssueDetail($input: MoneyReceiptManualBookIssueInput) {
        moneyReceiptManualBookIssueDetail(input: $input) {
            books {
                moneyReceiptIssueBookId
                voucherNumber
                bookNumber
                voucherDateText
                receiptStartNumber
                receiptEndNumber
                salesmanId
                salesmanName
                remarks
                isCancelled
            }
            entries {
                moneyReceiptIssueBookId
                receiptNumber
                receiptDateText
                voucherNumber
                status
                voucherDateText
            }
        }
    }
`;

const ISSUE_BOOKS_FOR_VALIDATION = gql`
    query MoneyReceiptIssueBooksForValidation($input: MoneyReceiptManualBookIssueInput) {
        moneyReceiptManualBookIssueDetail(input: $input) {
            books {
                moneyReceiptIssueBookId
                voucherNumber
                bookNumber
                voucherDateText
                receiptStartNumber
                receiptEndNumber
                salesmanId
                salesmanName
                remarks
                isCancelled
            }
        }
    }
`;

const CREATE_ISSUE_BOOK = gql`
    mutation CreateMoneyReceiptIssueBook($input: MoneyReceiptIssueBookEntryInput!) {
        createMoneyReceiptIssueBook(input: $input) {
            moneyReceiptIssueBookId
        }
    }
`;

const UPDATE_ISSUE_BOOK = gql`
    mutation UpdateMoneyReceiptIssueBook($input: MoneyReceiptIssueBookEntryInput!) {
        updateMoneyReceiptIssueBook(input: $input) {
            moneyReceiptIssueBookId
        }
    }
`;

const CANCEL_ISSUE_BOOK = gql`
    mutation CancelMoneyReceiptIssueBook($moneyReceiptIssueBookId: Int!, $cancelled: Boolean) {
        cancelMoneyReceiptIssueBook(moneyReceiptIssueBookId: $moneyReceiptIssueBookId, cancelled: $cancelled)
    }
`;

const DELETE_ISSUE_BOOK = gql`
    mutation DeleteMoneyReceiptIssueBook($moneyReceiptIssueBookId: Int!) {
        deleteMoneyReceiptIssueBook(moneyReceiptIssueBookId: $moneyReceiptIssueBookId)
    }
`;

const issueBookBaseSchema = z.object({
    bookNumber: z.string().trim().min(1, 'Book number is required').max(50, 'Book number must be at most 50 characters'),
    voucherDate: z.date({
        required_error: 'Issue date is required',
        invalid_type_error: 'Issue date is required'
    }),
    receiptStartNumber: z
        .number({
            required_error: 'Receipt start number is required',
            invalid_type_error: 'Receipt start number is required'
        })
        .int('Receipt start number must be an integer')
        .positive('Receipt start number must be greater than zero'),
    receiptEndNumber: z
        .number({
            required_error: 'Receipt end number is required',
            invalid_type_error: 'Receipt end number is required'
        })
        .int('Receipt end number must be an integer')
        .positive('Receipt end number must be greater than zero'),
    salesmanId: z
        .number({
            required_error: 'Salesman is required',
            invalid_type_error: 'Salesman is required'
        })
        .int('Salesman is required')
        .positive('Salesman is required'),
    remarks: z.string().max(250, 'Remark can be up to 250 characters').optional().default('')
});

const issueBookSchema = issueBookBaseSchema.superRefine((value, ctx) => {
        if (value.receiptStartNumber > value.receiptEndNumber) {
            const message = 'Receipt start number must be less than or equal to receipt end number';
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receiptStartNumber'], message });
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receiptEndNumber'], message });
        }
    });

const toDateText = (date: Date | null) => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const parseDate = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) {
        return new Date(Number(yyyymmdd[1]), Number(yyyymmdd[2]) - 1, Number(yyyymmdd[3]));
    }
    return null;
};

const formatDate = (value: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    return trimmed;
};

const toDateKey = (value: string | null) => {
    const parsed = parseDate(value);
    if (!parsed) return null;
    const text = toDateText(parsed);
    if (!text) return null;
    const key = Number(text);
    return Number.isFinite(key) ? key : null;
};

const formatDateKey = (dateKey: number) => {
    const text = String(dateKey).padStart(8, '0');
    return `${text.slice(6, 8)}/${text.slice(4, 6)}/${text.slice(0, 4)}`;
};

const normalizeBookNumber = (value: string | null) => String(value ?? '').trim().toLowerCase();
const isCancelledEntryStatus = (status: string | null) => String(status ?? '').trim().toLowerCase().includes('cancel');

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number) =>
    startA <= endB && startB <= endA;

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message.trim().length > 0) return error.message;
    return 'Request failed.';
};

const emptyForm = (): IssueBookForm => ({
    bookNumber: '',
    voucherDate: new Date(),
    receiptStartNumber: null,
    receiptEndNumber: null,
    salesmanId: null,
    remarks: ''
});

const areIssueBookFormsEqual = (left: IssueBookForm, right: IssueBookForm) =>
    left.bookNumber === right.bookNumber &&
    (toDateText(left.voucherDate) ?? '') === (toDateText(right.voucherDate) ?? '') &&
    left.receiptStartNumber === right.receiptStartNumber &&
    left.receiptEndNumber === right.receiptEndNumber &&
    left.salesmanId === right.salesmanId &&
    left.remarks === right.remarks;

const reportDateInputStyle = { width: '130px' } as const;
const issueMetaColumnStyle = { width: '9rem' } as const;
const formInputStyle = { width: '100%' } as const;
const formDateInputStyle = { width: '150px' } as const;
const instantDialogTransition = { disabled: true } as const;
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
            const leftKey = toDateKey(left[0]) ?? Number.MAX_SAFE_INTEGER;
            const rightKey = toDateKey(right[0]) ?? Number.MAX_SAFE_INTEGER;
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
    voucherDateText: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    bookNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptStartNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptEndNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    salesmanName: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    remarks: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    usageBucket: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    statusText: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

export default function BillingReceiptBookIssuePage() {
    const toast = useRef<Toast>(null);
    const { companyContext } = useAuth();

    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const hasTouchedDatesRef = useRef(false);

    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [cancelled, setCancelledFilter] = useState<0 | 1>(0);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editing, setEditing] = useState<IssueBookRow | null>(null);
    const [viewingRow, setViewingRow] = useState<IssueBookTableRow | null>(null);
    const [form, setForm] = useState<IssueBookForm>(emptyForm());
    const [initialForm, setInitialForm] = useState<IssueBookForm>(emptyForm());
    const [formErrors, setFormErrors] = useState<IssueBookFormErrors>({});
    const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const [pageIndexLoadRequest, setPageIndexLoadRequest] = useState<PageIndexLoadRequest | null>(null);
    const [activePageIndexLoadMs, setActivePageIndexLoadMs] = useState<number | null>(null);
    const [lastPageIndexLoadMs, setLastPageIndexLoadMs] = useState<number | null>(null);

    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const formSalesmanRef = useRef<AutoComplete>(null);

    const refreshButtonId = 'receipt-book-issue-refresh';
    const saveButtonId = 'receipt-book-issue-save';
    const isDevBuild = import.meta.env.DEV;
    const [salesmanQuery, setSalesmanQuery] = useState('');
    const [salesmanSuggestions, setSalesmanSuggestions] = useState<SalesmanOption[]>([]);
    const [selectedSalesmanOption, setSelectedSalesmanOption] = useState<SalesmanOption | null>(null);
    const [dryCheckDigest, setDryCheckDigest] = useState('');

    const fromDate = toDateText(dateRange[0]);
    const toDate = toDateText(dateRange[1]);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const nextRange = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = nextRange;
        setDateRange([nextRange.start ?? null, nextRange.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const focusIssueDateInput = useCallback(() => {
        if (typeof document === 'undefined') return;
        const tryFocus = () => {
            const element = document.getElementById('receipt-book-issue-form-voucher-date');
            if (element instanceof HTMLElement) {
                element.focus();
                return true;
            }
            return false;
        };
        if (tryFocus()) return;
        window.requestAnimationFrame(() => {
            if (tryFocus()) return;
            window.setTimeout(() => {
                tryFocus();
            }, 0);
        });
    }, []);

    useEffect(() => {
        if (!dialogOpen) return;
        focusIssueDateInput();
    }, [dialogOpen, focusIssueDateInput]);

    const canRefresh = Boolean(fromDate && toDate);

    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };

    const focusSaveButton = () => {
        if (typeof document === 'undefined') return true;
        const element = document.getElementById(saveButtonId);
        if (element instanceof HTMLElement) {
            element.focus();
            return true;
        }
        return false;
    };

    const clearPageIndexLoadMeasurement = useCallback(() => {
        setPageIndexLoadRequest(null);
        setActivePageIndexLoadMs(null);
    }, []);

    const startPageIndexLoadMeasurement = useCallback((nextFirst: number, nextRows: number) => {
        const firstValue = Number.isFinite(nextFirst) ? Math.max(0, Math.trunc(nextFirst)) : 0;
        const rowsValue = Number.isFinite(nextRows) ? Math.max(1, Math.trunc(nextRows)) : Math.max(1, rowsPerPage);
        setPageIndexLoadRequest({
            first: firstValue,
            rows: rowsValue,
            startedAtMs: nowMs()
        });
        setActivePageIndexLoadMs(0);
    }, [rowsPerPage]);

    const { data: salesmanData } = useQuery(SALESMEN, {
        variables: { search: null, limit: 2000 }
    });

    const registerVariables = useMemo(
        () => ({
            input: {
                fromDate,
                toDate,
                salesmanId: null,
                cancelled
            }
        }),
        [cancelled, fromDate, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(ISSUE_BOOK_DETAIL, {
        client: billingApolloClient,
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
        returnPartialData: true
    });

    const shouldLoadValidationBooks = dialogOpen;
    const { data: activeBooksData, loading: activeBooksLoading } = useQuery(ISSUE_BOOKS_FOR_VALIDATION, {
        client: billingApolloClient,
        skip: !shouldLoadValidationBooks,
        variables: { input: { cancelled: 0 } },
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first',
        returnPartialData: true
    });

    const [createBook, { loading: creating }] = useMutation(CREATE_ISSUE_BOOK, { client: billingApolloClient });
    const [updateBook, { loading: updating }] = useMutation(UPDATE_ISSUE_BOOK, { client: billingApolloClient });
    const [setIssueBookCancelled] = useMutation(CANCEL_ISSUE_BOOK, { client: billingApolloClient });
    const [deleteIssueBook] = useMutation(DELETE_ISSUE_BOOK, { client: billingApolloClient });

    const rows = useMemo<IssueBookRow[]>(() => (hasApplied ? data?.moneyReceiptManualBookIssueDetail?.books ?? [] : []), [data, hasApplied]);
    const entries = useMemo<IssueEntryRow[]>(() => (hasApplied ? data?.moneyReceiptManualBookIssueDetail?.entries ?? [] : []), [data, hasApplied]);

    const activeRowsForValidation = useMemo<IssueBookRow[]>(
        () => activeBooksData?.moneyReceiptManualBookIssueDetail?.books ?? [],
        [activeBooksData]
    );

    const nextEntryNumber = useMemo(() => {
        const sourceRows = activeRowsForValidation.length > 0 ? activeRowsForValidation : rows;
        const fromKey = fromDate ? Number(fromDate) : null;
        const toKey = toDate ? Number(toDate) : null;
        const scopedRows = sourceRows.filter((row) => {
            const dateKey = toDateKey(row.voucherDateText);
            if (dateKey == null) return false;
            if (fromKey != null && Number.isFinite(fromKey) && dateKey < fromKey) return false;
            if (toKey != null && Number.isFinite(toKey) && dateKey > toKey) return false;
            return true;
        });
        const maxEntryNo = scopedRows.reduce((maxValue, row) => {
            const raw = String(row.voucherNumber ?? '').trim();
            const parsed = Number(raw);
            if (!Number.isFinite(parsed) || parsed <= 0) return maxValue;
            return Math.max(maxValue, Math.trunc(parsed));
        }, 0);
        return maxEntryNo + 1;
    }, [activeRowsForValidation, fromDate, rows, toDate]);

    const entriesByBookId = useMemo(() => {
        const map = new Map<number, IssueEntryRow[]>();
        const seenByBook = new Map<number, Set<string>>();

        entries.forEach((entry) => {
            const key = entry.moneyReceiptIssueBookId;
            if (!map.has(key)) map.set(key, []);
            if (!seenByBook.has(key)) seenByBook.set(key, new Set<string>());

            const dedupeKey = `${entry.receiptNumber ?? ''}|${entry.voucherNumber ?? ''}|${entry.voucherDateText ?? ''}|${entry.status ?? ''}`;
            const seen = seenByBook.get(key);
            if (seen?.has(dedupeKey)) return;

            seen?.add(dedupeKey);
            map.get(key)?.push(entry);
        });

        map.forEach((bookEntries) => {
            bookEntries.sort((left, right) => {
                const leftReceipt = left.receiptNumber != null ? Number(left.receiptNumber) : Number.MAX_SAFE_INTEGER;
                const rightReceipt = right.receiptNumber != null ? Number(right.receiptNumber) : Number.MAX_SAFE_INTEGER;
                if (leftReceipt !== rightReceipt) return leftReceipt - rightReceipt;
                const leftDateKey = toDateKey(left.voucherDateText);
                const rightDateKey = toDateKey(right.voucherDateText);
                if (leftDateKey == null || rightDateKey == null) return 0;
                return leftDateKey - rightDateKey;
            });
        });

        return map;
    }, [entries]);

    const filteredRows = useMemo(() => {
        const needle = globalSearchText.trim();
        if (!needle) return rows;

        const escapedNeedle = escapeRegExp(needle);
        const wholeWordPattern = globalSearchWholeWord
            ? new RegExp(
                  `(^|[^A-Za-z0-9])${escapedNeedle}(?=$|[^A-Za-z0-9])`,
                  globalSearchMatchCase ? '' : 'i'
              )
            : null;

        return rows.filter((row) => {
            const haystack = [
                row.voucherNumber,
                row.bookNumber,
                row.salesmanName,
                row.receiptStartNumber,
                row.receiptEndNumber,
                formatDate(row.voucherDateText),
                row.remarks
            ]
                .map((value) => String(value ?? ''))
                .join(' ');

            if (wholeWordPattern) return wholeWordPattern.test(haystack);
            if (globalSearchMatchCase) return haystack.includes(needle);
            return haystack.toLowerCase().includes(needle.toLowerCase());
        });
    }, [globalSearchMatchCase, globalSearchText, globalSearchWholeWord, rows]);

    useEffect(() => {
        if (!pageIndexLoadRequest) return;
        const update = () => {
            setActivePageIndexLoadMs(nowMs() - pageIndexLoadRequest.startedAtMs);
        };
        update();
        const intervalId = globalThis.setInterval(update, 200);
        return () => {
            globalThis.clearInterval(intervalId);
        };
    }, [pageIndexLoadRequest]);

    useEffect(() => {
        if (!pageIndexLoadRequest) return;
        if (first !== pageIndexLoadRequest.first || rowsPerPage !== pageIndexLoadRequest.rows) return;

        let rafId = 0;
        let nestedRafId = 0;
        rafId = window.requestAnimationFrame(() => {
            nestedRafId = window.requestAnimationFrame(() => {
                setLastPageIndexLoadMs(nowMs() - pageIndexLoadRequest.startedAtMs);
                clearPageIndexLoadMeasurement();
            });
        });

        return () => {
            window.cancelAnimationFrame(rafId);
            window.cancelAnimationFrame(nestedRafId);
        };
    }, [clearPageIndexLoadMeasurement, first, pageIndexLoadRequest, rowsPerPage]);

    useEffect(() => {
        if (first === 0) return;
        if (first < filteredRows.length) return;
        setFirst(0);
    }, [filteredRows.length, first]);

    const salesmanOptions = useMemo<SalesmanOption[]>(() => {
        const salesmanRows = (salesmanData?.salesmen ?? []) as SalesmanRow[];
        return salesmanRows.map((row) => ({ label: row.name ?? `Salesman ${row.salesmanId}`, value: row.salesmanId }));
    }, [salesmanData]);

    const filterSalesmanOptions = useCallback((query: string) => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            setSalesmanSuggestions([...salesmanOptions]);
            return;
        }
        setSalesmanSuggestions(
            salesmanOptions.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
        );
    }, [salesmanOptions]);

    useEffect(() => {
        if (!dialogOpen) {
            setSalesmanQuery('');
            setSalesmanSuggestions([]);
            setSelectedSalesmanOption(null);
            return;
        }
        setSalesmanSuggestions([...salesmanOptions]);
    }, [dialogOpen, salesmanOptions]);

    useEffect(() => {
        if (!dialogOpen) return;
        const selected = form.salesmanId != null
            ? (salesmanOptions.find((option) => Number(option.value) === Number(form.salesmanId)) ?? null)
            : null;
        setSelectedSalesmanOption(selected);
    }, [dialogOpen, form.salesmanId, salesmanOptions]);

    const selectedBook = useMemo(
        () => rows.find((row) => row.moneyReceiptIssueBookId === selectedBookId) ?? null,
        [rows, selectedBookId]
    );

    const selectedEntries = useMemo(() => {
        if (!selectedBook) return [] as IssueEntryRow[];
        return entriesByBookId.get(selectedBook.moneyReceiptIssueBookId) ?? [];
    }, [entriesByBookId, selectedBook]);

    const viewingEntries = useMemo(() => {
        if (!viewingRow) return [] as IssueEntryRow[];
        return entriesByBookId.get(viewingRow.moneyReceiptIssueBookId) ?? [];
    }, [entriesByBookId, viewingRow]);

    const tableRows = useMemo<IssueBookTableRow[]>(
        () =>
            filteredRows
                .map((row) => {
                    const bookEntries = entriesByBookId.get(row.moneyReceiptIssueBookId) ?? [];
                    const cancelledCount = bookEntries.reduce((count, entry) => (
                        isCancelledEntryStatus(entry.status) ? count + 1 : count
                    ), 0);
                    const usedCount = Math.max(0, bookEntries.length - cancelledCount);
                    const totalReceiptCount = (
                        row.receiptStartNumber != null &&
                        row.receiptEndNumber != null &&
                        Number.isFinite(Number(row.receiptStartNumber)) &&
                        Number.isFinite(Number(row.receiptEndNumber))
                    )
                        ? Math.max(0, Number(row.receiptEndNumber) - Number(row.receiptStartNumber) + 1)
                        : 0;
                    const unusedCount = Math.max(0, totalReceiptCount - usedCount - cancelledCount);
                    const usageBucket = usedCount === 0 && cancelledCount === 0
                        ? 'Fresh'
                        : unusedCount === 0
                          ? 'Fully consumed'
                          : 'Partially consumed';
                    return {
                        ...row,
                        issueDateKey: toDateKey(row.voucherDateText),
                        usedCount,
                        cancelledCount,
                        unusedCount,
                        usageBucket,
                        usageSortKey: usedCount * 1_000_000 + cancelledCount * 1_000 + unusedCount,
                        statusText: row.isCancelled ? 'Cancelled' : 'Active'
                    };
                })
                .sort((left, right) => {
                    const leftKey = left.issueDateKey ?? Number.MAX_SAFE_INTEGER;
                    const rightKey = right.issueDateKey ?? Number.MAX_SAFE_INTEGER;
                    if (leftKey !== rightKey) return leftKey - rightKey;
                    return left.moneyReceiptIssueBookId - right.moneyReceiptIssueBookId;
                }),
        [entriesByBookId, filteredRows]
    );

    const entryNoFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.voucherNumber)),
        [tableRows]
    );
    const issueDateFilterOptions = useMemo(
        () => buildDateSelectOptions(tableRows.map((row) => row.voucherDateText)),
        [tableRows]
    );
    const bookNumberFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.bookNumber)),
        [tableRows]
    );
    const receiptStartFilterOptions = useMemo(
        () => buildNumberSelectOptions(tableRows.map((row) => row.receiptStartNumber)),
        [tableRows]
    );
    const receiptEndFilterOptions = useMemo(
        () => buildNumberSelectOptions(tableRows.map((row) => row.receiptEndNumber)),
        [tableRows]
    );
    const salesmanFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.salesmanName)),
        [tableRows]
    );
    const remarkFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.remarks)),
        [tableRows]
    );
    const usageFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.usageBucket)),
        [tableRows]
    );
    const statusFilterOptions = useMemo(
        () => buildTextSelectOptions(tableRows.map((row) => row.statusText)),
        [tableRows]
    );

    const entryNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(entryNoFilterOptions),
        [entryNoFilterOptions]
    );
    const issueDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(issueDateFilterOptions),
        [issueDateFilterOptions]
    );
    const bookNumberFilterElement = useMemo(
        () => buildMultiSelectFilterElement(bookNumberFilterOptions),
        [bookNumberFilterOptions]
    );
    const receiptStartFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptStartFilterOptions),
        [receiptStartFilterOptions]
    );
    const receiptEndFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptEndFilterOptions),
        [receiptEndFilterOptions]
    );
    const salesmanFilterElement = useMemo(
        () => buildMultiSelectFilterElement(salesmanFilterOptions),
        [salesmanFilterOptions]
    );
    const remarkFilterElement = useMemo(
        () => buildMultiSelectFilterElement(remarkFilterOptions),
        [remarkFilterOptions]
    );
    const usageFilterElement = useMemo(
        () => buildMultiSelectFilterElement(usageFilterOptions),
        [usageFilterOptions]
    );
    const statusFilterElement = useMemo(
        () => buildMultiSelectFilterElement(statusFilterOptions),
        [statusFilterOptions]
    );

    const editingUsageBounds = useMemo(() => {
        if (!editing) return null;
        const allEntries = entriesByBookId.get(editing.moneyReceiptIssueBookId) ?? [];
        const usedEntries = allEntries.filter((entry) => !isCancelledEntryStatus(entry.status));
        const cancelledCount = allEntries.length - usedEntries.length;
        const usedNumbers = usedEntries
            .map((entry) => (entry.receiptNumber != null && Number.isFinite(Number(entry.receiptNumber)) ? Number(entry.receiptNumber) : null))
            .filter((value): value is number => value != null);
        if (usedNumbers.length === 0) {
            return {
                minUsed: null,
                maxUsed: null,
                usedCount: usedEntries.length,
                cancelledCount
            };
        }
        return {
            minUsed: Math.min(...usedNumbers),
            maxUsed: Math.max(...usedNumbers),
            usedCount: usedEntries.length,
            cancelledCount
        };
    }, [editing, entriesByBookId]);
    const getEditDisabledReason = useCallback((row: { isCancelled: boolean; usedCount: number; cancelledCount: number }) => {
        if (row.isCancelled) return 'Editing disabled because this issue book is cancelled.';
        if (row.usedCount > 0 && row.cancelledCount > 0) {
            return `Editing disabled: ${row.usedCount} used and ${row.cancelledCount} cancelled receipts exist.`;
        }
        if (row.usedCount > 0) {
            return `Editing disabled: ${row.usedCount} used receipt${row.usedCount === 1 ? '' : 's'} exist.`;
        }
        if (row.cancelledCount > 0) {
            return `Editing disabled: ${row.cancelledCount} cancelled receipt${row.cancelledCount === 1 ? '' : 's'} exist.`;
        }
        return null;
    }, []);

    const getCancelDisabledReason = useCallback((row: { usedCount: number; cancelledCount: number }) => {
        if (row.usedCount > 0 && row.cancelledCount > 0) {
            return `Cancel/undo disabled: ${row.usedCount} used and ${row.cancelledCount} cancelled receipts exist.`;
        }
        if (row.usedCount > 0) {
            return `Cancel/undo disabled: ${row.usedCount} used receipt${row.usedCount === 1 ? '' : 's'} exist.`;
        }
        if (row.cancelledCount > 0) {
            return `Cancel/undo disabled: ${row.cancelledCount} cancelled receipt${row.cancelledCount === 1 ? '' : 's'} exist.`;
        }
        return null;
    }, []);

    const getDeleteDisabledReason = useCallback((row: { isCancelled: boolean; usedCount: number; cancelledCount: number }) => {
        if (row.isCancelled) return 'Delete is allowed only for active new entries.';
        if (row.usedCount > 0 && row.cancelledCount > 0) {
            return `Delete disabled: ${row.usedCount} used and ${row.cancelledCount} cancelled receipts exist.`;
        }
        if (row.usedCount > 0) {
            return `Delete disabled: ${row.usedCount} used receipt${row.usedCount === 1 ? '' : 's'} exist.`;
        }
        if (row.cancelledCount > 0) {
            return `Delete disabled: ${row.cancelledCount} cancelled receipt${row.cancelledCount === 1 ? '' : 's'} exist.`;
        }
        return null;
    }, []);

    const editingDisabledReason = useMemo(() => {
        if (!editing) return null;
        return getEditDisabledReason({
            isCancelled: Boolean(editing.isCancelled),
            usedCount: editingUsageBounds?.usedCount ?? 0,
            cancelledCount: editingUsageBounds?.cancelledCount ?? 0
        });
    }, [editing, editingUsageBounds, getEditDisabledReason]);

    const isEditingLocked = Boolean(editingDisabledReason);

    const reportLoading = hasApplied && loading;
    const tableLoading = reportLoading && rows.length === 0;
    const pageIndexLoading = pageIndexLoadRequest !== null;
    const pageLoadSummaryText =
        pageIndexLoading && activePageIndexLoadMs != null
            ? `Page: ${formatReportLoadDuration(activePageIndexLoadMs)} (loading...)`
            : lastPageIndexLoadMs != null
              ? `Page: ${formatReportLoadDuration(lastPageIndexLoadMs)}`
              : null;

    const isFormDirty = useMemo(() => !areIssueBookFormsEqual(form, initialForm), [form, initialForm]);
    const formEntryNumberText = useMemo(() => {
        if (editing) {
            const existingEntryNo = String(editing.voucherNumber ?? '').trim();
            return existingEntryNo || String(editing.moneyReceiptIssueBookId);
        }
        return String(nextEntryNumber);
    }, [editing, nextEntryNumber]);
    const currentFormDigest = useMemo(() => JSON.stringify({
        bookNumber: form.bookNumber,
        voucherDateText: toDateText(form.voucherDate),
        receiptStartNumber: form.receiptStartNumber,
        receiptEndNumber: form.receiptEndNumber,
        salesmanId: form.salesmanId,
        remarks: form.remarks
    }), [form]);
    const isDryCheckReady = useMemo(
        () => !isDevBuild || dryCheckDigest === currentFormDigest,
        [currentFormDigest, dryCheckDigest, isDevBuild]
    );
    const canRunDryCheck =
        isDevBuild &&
        isFormDirty &&
        !creating &&
        !updating &&
        !isEditingLocked &&
        !(shouldLoadValidationBooks && activeBooksLoading);
    const canSave = isFormDirty && !creating && !updating && !isEditingLocked && isDryCheckReady;

    const getSchemaValidationResult = useCallback((candidate: IssueBookForm) => {
        const parsed = issueBookSchema.safeParse({
            bookNumber: candidate.bookNumber,
            voucherDate: candidate.voucherDate ?? undefined,
            receiptStartNumber: candidate.receiptStartNumber ?? undefined,
            receiptEndNumber: candidate.receiptEndNumber ?? undefined,
            salesmanId: candidate.salesmanId ?? undefined,
            remarks: candidate.remarks
        });

        const nextErrors: IssueBookFormErrors = {};
        if (!parsed.success) {
            parsed.error.issues.forEach((issue) => {
                const field = issue.path[0];
                if (typeof field !== 'string') return;
                const key = field as IssueBookFormErrorKey;
                if (nextErrors[key]) return;
                nextErrors[key] = issue.message;
            });
        }

        if (parsed.success) {
            const voucherDateValidation = validateSingleDate({ date: parsed.data.voucherDate }, fiscalRange);
            if (!voucherDateValidation.ok) {
                nextErrors.voucherDate = voucherDateValidation.errors.date ?? 'Issue date is outside the fiscal year range';
            }
        }

        return { parsed, nextErrors };
    }, [fiscalRange]);

    const validateComponentFields = useCallback((candidate: IssueBookForm, fields: IssueBookFormErrorKey[]) => {
        const { nextErrors } = getSchemaValidationResult(candidate);
        setFormErrors((prev) => {
            const updated = { ...prev };
            fields.forEach((field) => {
                const message = nextErrors[field];
                if (message) updated[field] = message;
                else delete updated[field];
            });
            return updated;
        });
    }, [getSchemaValidationResult]);

    const clearFormState = () => {
        const resetForm = emptyForm();
        setForm(resetForm);
        setInitialForm(resetForm);
        setFormErrors({});
        setDryCheckDigest('');
        setEditing(null);
        setSalesmanQuery('');
        setSelectedSalesmanOption(null);
        setSalesmanSuggestions([]);
    };

    const closeDialogImmediate = useCallback(() => {
        setDialogOpen(false);
        setFormErrors({});
        setDryCheckDigest('');
        setSalesmanQuery('');
    }, []);

    const handleDialogCancel = useCallback(() => {
        if (creating || updating) return;
        if (!isFormDirty) {
            closeDialogImmediate();
            return;
        }
        confirmDialog({
            header: 'Discard Changes?',
            message: 'Unsaved changes will be lost.',
            icon: 'pi pi-exclamation-triangle',
            rejectLabel: 'Keep Editing',
            acceptLabel: 'Discard',
            acceptClassName: 'p-button-danger',
            accept: () => closeDialogImmediate(),
            reject: () => undefined
        });
    }, [closeDialogImmediate, creating, isFormDirty, updating]);

    const closeViewDialog = () => {
        setViewDialogOpen(false);
        setViewingRow(null);
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        clearPageIndexLoadMeasurement();
        setDateErrors({});
        if (!hasApplied) {
            setAppliedVariables(registerVariables);
            return;
        }
        setAppliedVariables(registerVariables);
        void refetch(registerVariables);
    };

    const refetchAfterMutation = async () => {
        if (!hasApplied) {
            setAppliedVariables(registerVariables);
            return;
        }
        await refetch(registerVariables);
    };

    const openNew = () => {
        closeViewDialog();
        const nextForm = emptyForm();
        setEditing(null);
        setForm(nextForm);
        setInitialForm(nextForm);
        setFormErrors({});
        setDryCheckDigest('');
        setSalesmanQuery('');
        setSelectedSalesmanOption(null);
        setSalesmanSuggestions([...salesmanOptions]);
        setDialogOpen(true);
    };

    const openEdit = (row: IssueBookRow | IssueBookTableRow) => {
        closeViewDialog();
        const nextForm: IssueBookForm = {
            bookNumber: row.bookNumber ?? '',
            voucherDate: parseDate(row.voucherDateText) ?? new Date(),
            receiptStartNumber: row.receiptStartNumber ?? null,
            receiptEndNumber: row.receiptEndNumber ?? null,
            salesmanId: row.salesmanId ?? null,
            remarks: row.remarks ?? ''
        };
        setEditing(row);
        setForm(nextForm);
        setInitialForm(nextForm);
        setFormErrors({});
        setDryCheckDigest('');
        setSalesmanQuery('');
        setSalesmanSuggestions([...salesmanOptions]);
        setDialogOpen(true);
    };

    const openView = (row: IssueBookTableRow) => {
        setSelectedBookId(row.moneyReceiptIssueBookId);
        setViewingRow(row);
        setViewDialogOpen(true);
    };

    const validateForm = (): ParsedIssueBookForm | null => {
        const { parsed, nextErrors } = getSchemaValidationResult(form);

        if (parsed.success) {
            const currentEditingId = editing?.moneyReceiptIssueBookId ?? null;
            const validationRows = activeRowsForValidation.length > 0 ? activeRowsForValidation : rows;

            const comparableRows = validationRows.filter(
                (row) => !row.isCancelled && row.moneyReceiptIssueBookId !== currentEditingId
            );

            const duplicateBookForSalesman = comparableRows.find((row) => {
                const rowSalesmanId = row.salesmanId != null ? Number(row.salesmanId) : null;
                return (
                    rowSalesmanId != null &&
                    rowSalesmanId === parsed.data.salesmanId &&
                    normalizeBookNumber(row.bookNumber) === normalizeBookNumber(parsed.data.bookNumber)
                );
            });

            if (duplicateBookForSalesman) {
                nextErrors.bookNumber = 'Book number already exists for the selected salesman';
            }

            const overlappingRange = comparableRows.find((row) => {
                const rowSalesmanId = row.salesmanId != null ? Number(row.salesmanId) : null;
                if (rowSalesmanId == null || rowSalesmanId !== parsed.data.salesmanId) return false;
                if (row.receiptStartNumber == null || row.receiptEndNumber == null) return false;

                const rowStart = Number(row.receiptStartNumber);
                const rowEnd = Number(row.receiptEndNumber);
                if (!Number.isFinite(rowStart) || !Number.isFinite(rowEnd)) return false;

                return rangesOverlap(parsed.data.receiptStartNumber, parsed.data.receiptEndNumber, rowStart, rowEnd);
            });

            if (overlappingRange) {
                const overlapLabel = overlappingRange.bookNumber?.trim() || `Book ${overlappingRange.moneyReceiptIssueBookId}`;
                const overlapMessage = `Receipt range overlaps with ${overlapLabel} (${overlappingRange.receiptStartNumber}-${overlappingRange.receiptEndNumber})`;
                nextErrors.receiptStartNumber = overlapMessage;
                nextErrors.receiptEndNumber = overlapMessage;
            }

            if (editing) {
                const usedEntries = entriesByBookId.get(editing.moneyReceiptIssueBookId) ?? [];
                if (usedEntries.length > 0) {
                    const editingSalesmanId = editing.salesmanId != null ? Number(editing.salesmanId) : null;
                    if (editingSalesmanId != null && editingSalesmanId !== parsed.data.salesmanId) {
                        nextErrors.salesmanId = 'Salesman cannot be changed because receipts are already used in this book';
                    }

                    const usedNumbers = usedEntries
                        .map((entry) =>
                            entry.receiptNumber != null && Number.isFinite(Number(entry.receiptNumber))
                                ? Number(entry.receiptNumber)
                                : null
                        )
                        .filter((value): value is number => value != null);

                    if (usedNumbers.length > 0) {
                        const minUsed = Math.min(...usedNumbers);
                        const maxUsed = Math.max(...usedNumbers);
                        if (parsed.data.receiptStartNumber > minUsed || parsed.data.receiptEndNumber < maxUsed) {
                            const boundsMessage = `Range must include all used receipts (${minUsed} to ${maxUsed})`;
                            nextErrors.receiptStartNumber = boundsMessage;
                            nextErrors.receiptEndNumber = boundsMessage;
                        }
                    }

                    const earliestUsageDateKey = usedEntries.reduce<number | null>((acc, entry) => {
                        const dateKey = toDateKey(entry.voucherDateText);
                        if (dateKey == null) return acc;
                        if (acc == null || dateKey < acc) return dateKey;
                        return acc;
                    }, null);

                    const issueDateKey = Number(toDateText(parsed.data.voucherDate));
                    if (
                        earliestUsageDateKey != null &&
                        Number.isFinite(issueDateKey) &&
                        issueDateKey > earliestUsageDateKey
                    ) {
                        nextErrors.voucherDate = `Issue date cannot be after first used receipt date (${formatDateKey(earliestUsageDateKey)})`;
                    }
                }
            }
        }

        setFormErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            const detail =
                nextErrors.bookNumber ??
                nextErrors.voucherDate ??
                nextErrors.receiptStartNumber ??
                nextErrors.receiptEndNumber ??
                nextErrors.salesmanId ??
                nextErrors.remarks ??
                'Please fix validation errors.';

            toast.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail
            });
            return null;
        }

        return parsed.success ? parsed.data : null;
    };

    const runDryCheck = () => {
        if (!isDevBuild) return;
        if (isEditingLocked) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Dry check blocked',
                detail: editingDisabledReason ?? 'Editing is disabled for this book.'
            });
            return;
        }

        if (shouldLoadValidationBooks && activeBooksLoading) {
            toast.current?.show({
                severity: 'info',
                summary: 'Please wait',
                detail: 'Validation records are still loading.'
            });
            return;
        }

        if (!isFormDirty) {
            toast.current?.show({
                severity: 'info',
                summary: 'No changes',
                detail: 'No changes to dry check.'
            });
            return;
        }

        const parsedForm = validateForm();
        if (!parsedForm) return;

        const voucherDateText = toDateText(parsedForm.voucherDate);
        if (!voucherDateText) {
            setFormErrors((prev) => ({ ...prev, voucherDate: 'Issue date is required' }));
            toast.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Issue date is required' });
            return;
        }

        setDryCheckDigest(currentFormDigest);
        toast.current?.show({
            severity: 'success',
            summary: 'Dry Check Passed',
            detail: 'Validation passed. You can now save these changes.'
        });
    };

    const handleSave = async () => {
        if (isEditingLocked) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Editing disabled',
                detail: editingDisabledReason ?? 'Editing is disabled for this book.'
            });
            return;
        }

        if (shouldLoadValidationBooks && activeBooksLoading) {
            toast.current?.show({
                severity: 'info',
                summary: 'Please wait',
                detail: 'Validation records are still loading.'
            });
            return;
        }

        if (!isFormDirty) {
            toast.current?.show({
                severity: 'info',
                summary: 'No changes',
                detail: 'No changes to save.'
            });
            return;
        }

        if (isDevBuild && !isDryCheckReady) {
            toast.current?.show({
                severity: 'info',
                summary: 'Run Dry Check',
                detail: 'Run Dry Check first, then click Save.'
            });
            return;
        }

        const parsedForm = validateForm();
        if (!parsedForm) return;

        const voucherDateText = toDateText(parsedForm.voucherDate);
        if (!voucherDateText) {
            setFormErrors((prev) => ({ ...prev, voucherDate: 'Issue date is required' }));
            toast.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Issue date is required' });
            return;
        }

        try {
            const voucherNumber = formEntryNumberText.trim();
            const input = {
                voucherNumber: voucherNumber.length > 0 ? voucherNumber : null,
                bookNumber: parsedForm.bookNumber.trim(),
                voucherDateText,
                receiptStartNumber: parsedForm.receiptStartNumber,
                receiptEndNumber: parsedForm.receiptEndNumber,
                salesmanId: parsedForm.salesmanId,
                remarks: parsedForm.remarks.trim() || null
            };

            if (editing) {
                await updateBook({
                    variables: {
                        input: {
                            moneyReceiptIssueBookId: editing.moneyReceiptIssueBookId,
                            ...input
                        }
                    }
                });
            } else {
                await createBook({ variables: { input } });
            }

            toast.current?.show({ severity: 'success', summary: 'Saved', detail: 'Receipt book issue saved.' });
            setDryCheckDigest('');
            closeDialogImmediate();
            clearFormState();
            await refetchAfterMutation();
        } catch (errorValue: unknown) {
            toast.current?.show({ severity: 'error', summary: 'Save failed', detail: getErrorMessage(errorValue) });
        }
    };

    const handleCancel = async (row: IssueBookTableRow) => {
        const cancelDisabledReason = getCancelDisabledReason(row);
        if (cancelDisabledReason) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Action blocked',
                detail: cancelDisabledReason
            });
            return;
        }
        try {
            await setIssueBookCancelled({
                variables: { moneyReceiptIssueBookId: row.moneyReceiptIssueBookId, cancelled: !row.isCancelled }
            });
            toast.current?.show({
                severity: 'success',
                summary: row.isCancelled ? 'Restored' : 'Cancelled',
                detail: `Issue book ${row.bookNumber ?? row.moneyReceiptIssueBookId} updated.`
            });
            await refetchAfterMutation();
        } catch (errorValue: unknown) {
            toast.current?.show({ severity: 'error', summary: 'Update failed', detail: getErrorMessage(errorValue) });
        }
    };

    const handleDelete = async (row: IssueBookTableRow) => {
        const deleteDisabledReason = getDeleteDisabledReason(row);
        if (deleteDisabledReason) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Action blocked',
                detail: deleteDisabledReason
            });
            return;
        }
        try {
            await deleteIssueBook({
                variables: { moneyReceiptIssueBookId: row.moneyReceiptIssueBookId }
            });
            if (selectedBookId === row.moneyReceiptIssueBookId) {
                setSelectedBookId(null);
            }
            toast.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: `Issue book ${row.bookNumber ?? row.moneyReceiptIssueBookId} deleted.`
            });
            await refetchAfterMutation();
        } catch (errorValue: unknown) {
            toast.current?.show({ severity: 'error', summary: 'Delete failed', detail: getErrorMessage(errorValue) });
        }
    };

    const statusBody = (row: IssueBookRow) => (
        <Tag value={row.isCancelled ? 'Cancelled' : 'Active'} severity={row.isCancelled ? 'danger' : 'success'} />
    );

    const usageBody = (row: IssueBookTableRow) => (
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
    const entryStatusBody = (row: IssueEntryRow) => {
        const cancelled = isCancelledEntryStatus(row.status);
        const label = String(row.status ?? '').trim() || (cancelled ? 'Cancelled' : 'Used');
        return <Tag value={label} severity={cancelled ? 'danger' : 'success'} />;
    };

    const actionsBody = (row: IssueBookTableRow) => {
        const editDisabledReason = getEditDisabledReason(row);
        const cancelDisabledReason = getCancelDisabledReason(row);
        const deleteDisabledReason = getDeleteDisabledReason(row);
        const cancelActionLabel = row.isCancelled ? 'Undo cancellation' : 'Cancel book';
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
                        icon={row.isCancelled ? 'pi pi-undo' : 'pi pi-ban'}
                        className="p-button-text p-button-sm"
                        onClick={() => {
                            void handleCancel(row);
                        }}
                        disabled={Boolean(cancelDisabledReason)}
                    />
                </span>
                <span className="inline-flex" title={deleteDisabledReason ?? 'Delete'}>
                    <Button
                        icon="pi pi-trash"
                        className="p-button-text p-button-sm p-button-danger"
                        onClick={() => {
                            void handleDelete(row);
                        }}
                        disabled={Boolean(deleteDisabledReason)}
                    />
                </span>
            </div>
        );
    };

    return (
        <div className="card app-gradient-card">
            <ConfirmDialog />
            <Toast ref={toast} />

            <ReportHeader
                title="Receipt Book Issue Register"
                subtitle="Maintain receipt book ranges issued to salesmen and review usage."
                rightSlot={
                    <AppRegisterSearch
                        value={globalSearchText}
                        onValueChange={(nextValue) => {
                            clearPageIndexLoadMeasurement();
                            setFirst(0);
                            setGlobalSearchText(nextValue);
                        }}
                        matchCase={globalSearchMatchCase}
                        onMatchCaseChange={(nextValue) => {
                            clearPageIndexLoadMeasurement();
                            setFirst(0);
                            setGlobalSearchMatchCase(nextValue);
                        }}
                        wholeWord={globalSearchWholeWord}
                        onWholeWordChange={(nextValue) => {
                            clearPageIndexLoadMeasurement();
                            setFirst(0);
                            setGlobalSearchWholeWord(nextValue);
                        }}
                        placeholder="Search register..."
                        helperText="Aa: Match Case · W: Whole Word"
                        className="app-register-search--compact"
                    />
                }
                className="mb-3"
            />

            {error && <p className="text-red-500 m-0 mb-3">Error loading books: {error.message}</p>}

            <AppDataTable
                value={tableRows}
                className="app-report-table--inline-filters"
                paginator
                rows={rowsPerPage}
                first={first}
                rowsPerPageOptions={[10, 20, 50, 100]}
                filters={columnFilters}
                onFilter={(event: DataTableFilterEvent) => setColumnFilters(event.filters)}
                filterDisplay="menu"
                filterDelay={400}
                onPage={(event: DataTablePageEvent) => {
                    const nextRows = event.rows ?? rowsPerPage;
                    const nextFirst = event.first ?? first;
                    if (nextRows === rowsPerPage && nextFirst === first) return;
                    startPageIndexLoadMeasurement(nextFirst, nextRows);
                    setRowsPerPage(nextRows);
                    setFirst(nextFirst);
                }}
                dataKey="moneyReceiptIssueBookId"
                stripedRows
                size="small"
                loading={tableLoading}
                emptyMessage={hasApplied ? 'No receipt book issues found' : 'Press Refresh to load receipt book issues'}
                selectionMode="single"
                selection={selectedBook ?? undefined}
                onSelectionChange={(event) => setSelectedBookId(event.value?.moneyReceiptIssueBookId ?? null)}
                onRowDoubleClick={(event) => openView(event.data as IssueBookTableRow)}
                headerLeft={
                    <>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    clearPageIndexLoadMeasurement();
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
                                style={reportDateInputStyle}
                            />
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
                                    clearPageIndexLoadMeasurement();
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
                                style={reportDateInputStyle}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2">
                            <AppCompactToggle
                                checked={cancelled === 1}
                                onChange={(checked) => {
                                    clearPageIndexLoadMeasurement();
                                    setFirst(0);
                                    setCancelledFilter(checked ? 1 : 0);
                                }}
                                onLabel="Cancelled"
                                offLabel="Not cancelled"
                            />
                        </div>
                    </>
                }
                headerRight={
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <Button label="New Book" icon="pi pi-plus" onClick={openNew} />
                        <AppReportActions
                            onRefresh={() => handleRefresh()}
                            refreshButtonId={refreshButtonId}
                            refreshDisabled={!canRefresh}
                            loadingState={tableLoading}
                        />
                        {pageLoadSummaryText ? (
                            <span className="text-600 text-sm" aria-live="polite">
                                {pageLoadSummaryText}
                            </span>
                        ) : null}
                    </div>
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading receipt book issues...'
                            : `${tableRows.length} issue book${tableRows.length === 1 ? '' : 's'}`
                        : 'Press Refresh to load receipt book issues'
                }
            >
                <Column
                    field="voucherNumber"
                    header="Entry No."
                    sortable
                    style={issueMetaColumnStyle}
                    filterElement={entryNoFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="voucherDateText"
                    sortField="issueDateKey"
                    header="Date"
                    body={(row) => formatDate(row.voucherDateText)}
                    sortable
                    style={issueMetaColumnStyle}
                    filterElement={issueDateFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="bookNumber"
                    header="Book No."
                    sortable
                    style={issueMetaColumnStyle}
                    filterElement={bookNumberFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="receiptStartNumber"
                    header="Receipt Start No."
                    sortable
                    style={issueMetaColumnStyle}
                    filterElement={receiptStartFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="receiptEndNumber"
                    header="Receipt End No."
                    sortable
                    style={issueMetaColumnStyle}
                    filterElement={receiptEndFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="salesmanName"
                    header="Salesman"
                    sortable
                    style={{ minWidth: '180px' }}
                    filterElement={salesmanFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column
                    field="remarks"
                    header="Remark"
                    sortable
                    style={{ minWidth: '180px' }}
                    filterElement={remarkFilterElement}
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
                    field="statusText"
                    header="Status"
                    body={statusBody}
                    sortable
                    filterElement={statusFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
                <Column header="Actions" body={actionsBody} />
            </AppDataTable>

            {selectedBook && (
                <div className="mt-4">
                    <div className="m-0 text-base font-semibold">Receipt Entries • {selectedBook.bookNumber ?? selectedBook.moneyReceiptIssueBookId}</div>
                    <p className="text-600 mt-1">{selectedEntries.length} receipts logged against this book.</p>
                    <AppDataTable value={selectedEntries} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} dataKey="receiptNumber" stripedRows size="small">
                        <Column field="receiptNumber" header="Receipt No." sortable style={{ minWidth: '120px' }} />
                        <Column
                            field="receiptDateText"
                            header="Receipt Date"
                            sortable
                            body={(row: IssueEntryRow) => formatDate(row.receiptDateText ?? row.voucherDateText)}
                            style={{ minWidth: '130px' }}
                        />
                        <Column
                            field="voucherNumber"
                            header="Voucher No."
                            sortable
                            body={(row: IssueEntryRow) => row.voucherNumber?.trim() || '-'}
                            style={{ minWidth: '120px' }}
                        />
                        <Column field="voucherDateText" header="Voucher Date" sortable body={(row) => formatDate(row.voucherDateText)} />
                        <Column field="status" header="Status" sortable body={entryStatusBody} style={{ minWidth: '120px' }} />
                    </AppDataTable>
                </div>
            )}

            {viewDialogOpen && viewingRow ? (
                <Dialog
                    header="Receipt Book Issue Details"
                    visible
                    onHide={closeViewDialog}
                    style={{ width: 'min(760px, 96vw)' }}
                    transitionOptions={instantDialogTransition}
                    focusOnShow={false}
                    modal
                    footer={(
                        <div className="flex justify-content-end w-full">
                            <Button label="Close" className="p-button-text" onClick={closeViewDialog} />
                        </div>
                    )}
                >
                    <div className="flex flex-column gap-3">
                        <div className="grid">
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Entry No.</div>
                                <div className="font-medium">{viewingRow.voucherNumber?.trim() || '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Issue Date</div>
                                <div className="font-medium">{formatDate(viewingRow.voucherDateText)}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Status</div>
                                <div>{statusBody(viewingRow)}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Book No.</div>
                                <div className="font-medium">{viewingRow.bookNumber?.trim() || '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Receipt Start No.</div>
                                <div className="font-medium">{viewingRow.receiptStartNumber ?? '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Receipt End No.</div>
                                <div className="font-medium">{viewingRow.receiptEndNumber ?? '-'}</div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-600 text-sm">Salesman</div>
                                <div className="font-medium">{viewingRow.salesmanName?.trim() || '-'}</div>
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
                            <div className="m-0 mb-2 text-base font-semibold">Receipt Entries</div>
                            <AppDataTable
                                value={viewingEntries}
                                paginator
                                rows={10}
                                rowsPerPageOptions={[10, 25, 50]}
                                dataKey="receiptNumber"
                                stripedRows
                                size="small"
                                emptyMessage="No receipt entries found for this issue book."
                            >
                                <Column field="receiptNumber" header="Receipt No." sortable style={{ minWidth: '120px' }} />
                                <Column
                                    field="receiptDateText"
                                    header="Receipt Date"
                                    sortable
                                    body={(row: IssueEntryRow) => formatDate(row.receiptDateText ?? row.voucherDateText)}
                                    style={{ minWidth: '130px' }}
                                />
                                <Column
                                    field="voucherNumber"
                                    header="Voucher No."
                                    sortable
                                    body={(row: IssueEntryRow) => row.voucherNumber?.trim() || '-'}
                                    style={{ minWidth: '120px' }}
                                />
                                <Column field="voucherDateText" header="Voucher Date" sortable body={(row) => formatDate(row.voucherDateText)} />
                                <Column field="status" header="Status" sortable body={entryStatusBody} style={{ minWidth: '120px' }} />
                            </AppDataTable>
                        </div>
                    </div>
                </Dialog>
            ) : null}

            {dialogOpen ? (
                <Dialog
                    header={editing ? 'Edit Receipt Book Issue' : 'New Receipt Book Issue'}
                    visible
                    onShow={focusIssueDateInput}
                    onHide={handleDialogCancel}
                    style={{ width: 'min(700px, 95vw)' }}
                    transitionOptions={instantDialogTransition}
                    focusOnShow={false}
                    modal
                >
                {editing && isEditingLocked && (
                    <div className="mb-3 p-2 border-round surface-50 text-700 text-sm">
                        {editingUsageBounds && (editingUsageBounds.usedCount > 0 || editingUsageBounds.cancelledCount > 0) ? (
                            <>
                                Used receipts: <strong>{editingUsageBounds.usedCount}</strong>
                                {editingUsageBounds.minUsed != null && editingUsageBounds.maxUsed != null
                                    ? ` entries (${editingUsageBounds.minUsed} to ${editingUsageBounds.maxUsed})`
                                    : ' entries'}
                                . Cancelled receipts: <strong>{editingUsageBounds.cancelledCount}</strong>. {editingDisabledReason}
                            </>
                        ) : editingDisabledReason}
                    </div>
                )}

                <div className="grid">
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">
                            Entry No.
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <AppInput
                            inputId="receipt-book-issue-form-entry-no"
                            value={formEntryNumberText}
                            readOnly
                            className="app-field-noneditable"
                            style={formDateInputStyle}
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-voucher-date');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                        />
                    </div>

                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">
                            Issue Date
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <AppDateInput
                            value={form.voucherDate}
                            disabled={isEditingLocked}
                            autoFocus
                            onChange={(value) => {
                                setForm((prev) => {
                                    const next = { ...prev, voucherDate: value };
                                    validateComponentFields(next, ['voucherDate']);
                                    return next;
                                });
                            }}
                            inputId="receipt-book-issue-form-voucher-date"
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            style={formDateInputStyle}
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-book-number');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={formErrors.voucherDate ? 'p-invalid' : undefined}
                        />
                        {formErrors.voucherDate && <small className="p-error">{formErrors.voucherDate}</small>}
                    </div>

                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">
                            Book Number
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <AppInput
                            id="receipt-book-issue-form-book-number"
                            value={form.bookNumber}
                            disabled={isEditingLocked}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setForm((prev) => {
                                    const next = { ...prev, bookNumber: nextValue };
                                    validateComponentFields(next, ['bookNumber']);
                                    return next;
                                });
                            }}
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-receipt-start');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            style={formDateInputStyle}
                            className={formErrors.bookNumber ? 'p-invalid' : undefined}
                        />
                        {formErrors.bookNumber && <small className="p-error">{formErrors.bookNumber}</small>}
                    </div>

                    <div className="col-12 md:col-3" aria-hidden="true" />

                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">
                            Receipt Start No
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <AppInput
                            inputType="number"
                            inputId="receipt-book-issue-form-receipt-start"
                            value={form.receiptStartNumber}
                            disabled={isEditingLocked}
                            onValueChange={(event) => {
                                const parsedValue = event.value == null ? null : Number(event.value);
                                const normalizedValue = parsedValue != null && Number.isFinite(parsedValue)
                                    ? Math.trunc(parsedValue)
                                    : null;
                                setForm((prev) => {
                                    const next = { ...prev, receiptStartNumber: normalizedValue };
                                    validateComponentFields(next, ['receiptStartNumber', 'receiptEndNumber']);
                                    return next;
                                });
                            }}
                            mode="decimal"
                            useGrouping={false}
                            min={1}
                            minFractionDigits={0}
                            maxFractionDigits={0}
                            style={formDateInputStyle}
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-receipt-end');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={formErrors.receiptStartNumber ? 'p-invalid' : undefined}
                        />
                        {formErrors.receiptStartNumber && <small className="p-error">{formErrors.receiptStartNumber}</small>}
                    </div>

                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">
                            Receipt End No
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <AppInput
                            inputType="number"
                            inputId="receipt-book-issue-form-receipt-end"
                            value={form.receiptEndNumber}
                            disabled={isEditingLocked}
                            onValueChange={(event) => {
                                const parsedValue = event.value == null ? null : Number(event.value);
                                const normalizedValue = parsedValue != null && Number.isFinite(parsedValue)
                                    ? Math.trunc(parsedValue)
                                    : null;
                                setForm((prev) => {
                                    const next = { ...prev, receiptEndNumber: normalizedValue };
                                    validateComponentFields(next, ['receiptStartNumber', 'receiptEndNumber']);
                                    return next;
                                });
                            }}
                            mode="decimal"
                            useGrouping={false}
                            min={1}
                            minFractionDigits={0}
                            maxFractionDigits={0}
                            style={formDateInputStyle}
                            onEnterNext={() => {
                                formSalesmanRef.current?.focus?.();
                                return true;
                            }}
                            className={formErrors.receiptEndNumber ? 'p-invalid' : undefined}
                        />
                        {formErrors.receiptEndNumber && <small className="p-error">{formErrors.receiptEndNumber}</small>}
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">
                            Salesman
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <AppAutoComplete
                            ref={formSalesmanRef}
                            inputId="receipt-book-issue-form-salesman"
                            appendTo={typeof document !== 'undefined' ? document.body : 'self'}
                            value={salesmanQuery.length > 0 ? salesmanQuery : selectedSalesmanOption}
                            suggestions={salesmanSuggestions}
                            disabled={isEditingLocked}
                            completeMethod={(event: AutoCompleteCompleteEvent) => {
                                const query = event.query ?? '';
                                setSalesmanQuery(query);
                                filterSalesmanOptions(query);
                            }}
                            onChange={(event: AutoCompleteChangeEvent) => {
                                const value = event.value as SalesmanOption | string | null;
                                if (value == null) {
                                    setSalesmanQuery('');
                                    setSelectedSalesmanOption(null);
                                    setForm((prev) => {
                                        const next = { ...prev, salesmanId: null };
                                        validateComponentFields(next, ['salesmanId']);
                                        return next;
                                    });
                                    return;
                                }
                                if (typeof value === 'string') {
                                    setSalesmanQuery(value);
                                    setSelectedSalesmanOption(null);
                                    setForm((prev) => {
                                        const next = { ...prev, salesmanId: null };
                                        validateComponentFields(next, ['salesmanId']);
                                        return next;
                                    });
                                    return;
                                }
                                setSalesmanQuery('');
                                setSelectedSalesmanOption(value);
                                setForm((prev) => {
                                    const next = { ...prev, salesmanId: value.value };
                                    validateComponentFields(next, ['salesmanId']);
                                    return next;
                                });
                            }}
                            field="label"
                            placeholder="Select salesman"
                            dropdown
                            dropdownMode="blank"
                            onDropdownClick={() => {
                                setSalesmanQuery('');
                                setSalesmanSuggestions([...salesmanOptions]);
                            }}
                            onBlur={() => {
                                setSalesmanQuery('');
                                if (form.salesmanId == null) {
                                    setSelectedSalesmanOption(null);
                                    return;
                                }
                                const selected =
                                    salesmanOptions.find((option) => Number(option.value) === Number(form.salesmanId)) ?? null;
                                setSelectedSalesmanOption(selected);
                            }}
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-remarks');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return focusSaveButton();
                            }}
                            style={formInputStyle}
                            className={formErrors.salesmanId ? 'w-full p-invalid' : 'w-full'}
                        />
                        {formErrors.salesmanId && <small className="p-error">{formErrors.salesmanId}</small>}
                    </div>

                    <div className="col-12">
                        <label className="block text-600 mb-1">Remark</label>
                        <AppInput
                            inputId="receipt-book-issue-form-remarks"
                            value={form.remarks}
                            disabled={isEditingLocked}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setForm((prev) => {
                                    const next = { ...prev, remarks: nextValue };
                                    validateComponentFields(next, ['remarks']);
                                    return next;
                                });
                            }}
                            style={formInputStyle}
                            onEnterNext={focusSaveButton}
                            className={formErrors.remarks ? 'p-invalid' : undefined}
                        />
                        {formErrors.remarks && <small className="p-error">{formErrors.remarks}</small>}
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancel" outlined onClick={handleDialogCancel} disabled={creating || updating} />
                    {isDevBuild ? (
                        <Button
                            label="Dry Check"
                            outlined
                            onClick={runDryCheck}
                            disabled={!canRunDryCheck}
                        />
                    ) : null}
                    <Button
                        id={saveButtonId}
                        label={creating || updating ? 'Saving...' : 'Save'}
                        onClick={handleSave}
                        disabled={!canSave}
                    />
                </div>
                </Dialog>
            ) : null}
        </div>
    );
}
