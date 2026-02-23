'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import type { Dropdown } from 'primereact/dropdown';
import type { DataTablePageEvent } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
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
    bookNumber: string | null;
    voucherDateText: string | null;
    receiptStartNumber: number | null;
    receiptEndNumber: number | null;
    salesmanId: number | null;
    salesmanName: string | null;
    isCancelled: boolean;
}

interface IssueEntryRow {
    moneyReceiptIssueBookId: number;
    receiptNumber: number | null;
    status: string | null;
    voucherDateText: string | null;
}

interface SalesmanRow {
    salesmanId: number;
    name: string | null;
}

type IssueBookForm = {
    bookNumber: string;
    voucherDate: Date | null;
    receiptStartNumber: number | null;
    receiptEndNumber: number | null;
    salesmanId: number | null;
};

type ParsedIssueBookForm = {
    bookNumber: string;
    voucherDate: Date;
    receiptStartNumber: number;
    receiptEndNumber: number;
    salesmanId: number;
};

type IssueBookFormErrors = {
    bookNumber?: string;
    voucherDate?: string;
    receiptStartNumber?: string;
    receiptEndNumber?: string;
    salesmanId?: string;
};

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
                bookNumber
                voucherDateText
                receiptStartNumber
                receiptEndNumber
                salesmanId
                salesmanName
                isCancelled
            }
            entries {
                moneyReceiptIssueBookId
                receiptNumber
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
                bookNumber
                voucherDateText
                receiptStartNumber
                receiptEndNumber
                salesmanId
                salesmanName
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

const issueBookSchema = z
    .object({
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
            .positive('Salesman is required')
    })
    .superRefine((value, ctx) => {
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
    salesmanId: null
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
    const [salesmanId, setSalesmanId] = useState<number | null>(null);
    const [cancelled, setCancelledFilter] = useState<-1 | 0 | 1>(-1);
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<IssueBookRow | null>(null);
    const [form, setForm] = useState<IssueBookForm>(emptyForm());
    const [formErrors, setFormErrors] = useState<IssueBookFormErrors>({});
    const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [pageIndexLoadRequest, setPageIndexLoadRequest] = useState<PageIndexLoadRequest | null>(null);
    const [activePageIndexLoadMs, setActivePageIndexLoadMs] = useState<number | null>(null);
    const [lastPageIndexLoadMs, setLastPageIndexLoadMs] = useState<number | null>(null);

    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const formSalesmanRef = useRef<Dropdown>(null);

    const refreshButtonId = 'receipt-book-issue-refresh';
    const saveButtonId = 'receipt-book-issue-save';

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

    useEffect(() => {
        if (!dialogOpen) return;
        const timer = window.setTimeout(() => {
            const element = document.getElementById('receipt-book-issue-form-book-number');
            if (element instanceof HTMLElement) element.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [dialogOpen]);

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
                salesmanId: salesmanId ?? null,
                cancelled
            }
        }),
        [cancelled, fromDate, salesmanId, toDate]
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

    const { data: activeBooksData } = useQuery(ISSUE_BOOKS_FOR_VALIDATION, {
        client: billingApolloClient,
        variables: { input: { cancelled: 0 } },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        returnPartialData: true
    });

    const [createBook, { loading: creating }] = useMutation(CREATE_ISSUE_BOOK, { client: billingApolloClient });
    const [updateBook, { loading: updating }] = useMutation(UPDATE_ISSUE_BOOK, { client: billingApolloClient });
    const [setIssueBookCancelled] = useMutation(CANCEL_ISSUE_BOOK, { client: billingApolloClient });

    const rows = useMemo<IssueBookRow[]>(() => (hasApplied ? data?.moneyReceiptManualBookIssueDetail?.books ?? [] : []), [data, hasApplied]);
    const entries = useMemo<IssueEntryRow[]>(() => (hasApplied ? data?.moneyReceiptManualBookIssueDetail?.entries ?? [] : []), [data, hasApplied]);

    const activeRowsForValidation = useMemo<IssueBookRow[]>(
        () => activeBooksData?.moneyReceiptManualBookIssueDetail?.books ?? [],
        [activeBooksData]
    );

    const entriesByBookId = useMemo(() => {
        const map = new Map<number, IssueEntryRow[]>();
        const seenByBook = new Map<number, Set<string>>();

        entries.forEach((entry) => {
            const key = entry.moneyReceiptIssueBookId;
            if (!map.has(key)) map.set(key, []);
            if (!seenByBook.has(key)) seenByBook.set(key, new Set<string>());

            const dedupeKey = `${entry.receiptNumber ?? ''}|${entry.voucherDateText ?? ''}|${entry.status ?? ''}`;
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
                row.bookNumber,
                row.salesmanName,
                row.moneyReceiptIssueBookId,
                row.receiptStartNumber,
                row.receiptEndNumber,
                formatDate(row.voucherDateText)
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

    const salesmanOptions = useMemo(() => {
        const salesmanRows = (salesmanData?.salesmen ?? []) as SalesmanRow[];
        return salesmanRows.map((row) => ({ label: row.name ?? `Salesman ${row.salesmanId}`, value: row.salesmanId }));
    }, [salesmanData]);

    const selectedBook = useMemo(
        () => rows.find((row) => row.moneyReceiptIssueBookId === selectedBookId) ?? null,
        [rows, selectedBookId]
    );

    const selectedEntries = useMemo(() => {
        if (!selectedBook) return [] as IssueEntryRow[];
        return entriesByBookId.get(selectedBook.moneyReceiptIssueBookId) ?? [];
    }, [entriesByBookId, selectedBook]);

    const editingUsageBounds = useMemo(() => {
        if (!editing) return null;
        const usedEntries = entriesByBookId.get(editing.moneyReceiptIssueBookId) ?? [];
        const usedNumbers = usedEntries
            .map((entry) => (entry.receiptNumber != null && Number.isFinite(Number(entry.receiptNumber)) ? Number(entry.receiptNumber) : null))
            .filter((value): value is number => value != null);
        if (usedNumbers.length === 0) return null;
        return {
            minUsed: Math.min(...usedNumbers),
            maxUsed: Math.max(...usedNumbers),
            usedCount: usedEntries.length
        };
    }, [editing, entriesByBookId]);

    const reportLoading = hasApplied && loading;
    const tableLoading = reportLoading && rows.length === 0;
    const pageIndexLoading = pageIndexLoadRequest !== null;
    const pageLoadSummaryText =
        pageIndexLoading && activePageIndexLoadMs != null
            ? `Page: ${formatReportLoadDuration(activePageIndexLoadMs)} (loading...)`
            : lastPageIndexLoadMs != null
              ? `Page: ${formatReportLoadDuration(lastPageIndexLoadMs)}`
              : null;

    const applyFormError = (key: keyof IssueBookFormErrors) => {
        setFormErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const clearFormState = () => {
        setForm(emptyForm());
        setFormErrors({});
        setEditing(null);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setFormErrors({});
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
        setEditing(null);
        setForm(emptyForm());
        setFormErrors({});
        setDialogOpen(true);
    };

    const openEdit = (row: IssueBookRow) => {
        setEditing(row);
        setForm({
            bookNumber: row.bookNumber ?? '',
            voucherDate: parseDate(row.voucherDateText) ?? new Date(),
            receiptStartNumber: row.receiptStartNumber ?? null,
            receiptEndNumber: row.receiptEndNumber ?? null,
            salesmanId: row.salesmanId ?? null
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const validateForm = (): ParsedIssueBookForm | null => {
        const parsed = issueBookSchema.safeParse({
            bookNumber: form.bookNumber,
            voucherDate: form.voucherDate ?? undefined,
            receiptStartNumber: form.receiptStartNumber ?? undefined,
            receiptEndNumber: form.receiptEndNumber ?? undefined,
            salesmanId: form.salesmanId ?? undefined
        });

        const nextErrors: IssueBookFormErrors = {};

        if (!parsed.success) {
            parsed.error.issues.forEach((issue) => {
                const field = issue.path[0];
                if (typeof field !== 'string') return;
                const key = field as keyof IssueBookFormErrors;
                if (nextErrors[key]) return;
                nextErrors[key] = issue.message;
            });
        }

        if (parsed.success) {
            const voucherDateValidation = validateSingleDate({ date: parsed.data.voucherDate }, fiscalRange);
            if (!voucherDateValidation.ok) {
                nextErrors.voucherDate = voucherDateValidation.errors.date ?? 'Issue date is outside the fiscal year range';
            }

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

    const handleSave = async () => {
        const parsedForm = validateForm();
        if (!parsedForm) return;

        const voucherDateText = toDateText(parsedForm.voucherDate);
        if (!voucherDateText) {
            setFormErrors((prev) => ({ ...prev, voucherDate: 'Issue date is required' }));
            toast.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Issue date is required' });
            return;
        }

        try {
            const input = {
                bookNumber: parsedForm.bookNumber.trim(),
                voucherDateText,
                receiptStartNumber: parsedForm.receiptStartNumber,
                receiptEndNumber: parsedForm.receiptEndNumber,
                salesmanId: parsedForm.salesmanId
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
            closeDialog();
            clearFormState();
            await refetchAfterMutation();
        } catch (errorValue: unknown) {
            toast.current?.show({ severity: 'error', summary: 'Save failed', detail: getErrorMessage(errorValue) });
        }
    };

    const handleCancel = async (row: IssueBookRow) => {
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

    const statusBody = (row: IssueBookRow) => (
        <Tag value={row.isCancelled ? 'Cancelled' : 'Active'} severity={row.isCancelled ? 'danger' : 'success'} />
    );

    const usedCountBody = (row: IssueBookRow) => {
        const count = entriesByBookId.get(row.moneyReceiptIssueBookId)?.length ?? 0;
        return <span className="font-medium">{count}</span>;
    };

    const actionsBody = (row: IssueBookRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" className="p-button-text p-button-sm" onClick={() => openEdit(row)} />
            <Button
                icon={row.isCancelled ? 'pi pi-undo' : 'pi pi-ban'}
                className="p-button-text p-button-sm"
                label={row.isCancelled ? 'Undo' : 'Cancel'}
                onClick={() => handleCancel(row)}
            />
        </div>
    );

    return (
        <div className="card app-gradient-card">
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

            <div className="flex gap-2 flex-wrap mb-3">
                <Button label="New Book" icon="pi pi-plus" onClick={openNew} />
                <Link to="/apps/billing">
                    <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                </Link>
            </div>
            {error && <p className="text-red-500 m-0 mb-3">Error loading books: {error.message}</p>}

            <AppDataTable
                value={filteredRows}
                paginator
                rows={rowsPerPage}
                first={first}
                rowsPerPageOptions={[20, 50, 100]}
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
                onRowDoubleClick={(event) => openEdit(event.data as IssueBookRow)}
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
                                style={{ width: '130px' }}
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
                                style={{ width: '130px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <AppDropdown
                            value={salesmanId}
                            options={salesmanOptions}
                            onChange={(event) => {
                                clearPageIndexLoadMeasurement();
                                setFirst(0);
                                setSalesmanId(event.value);
                            }}
                            placeholder="Salesman"
                            showClear
                            filter
                            style={{ minWidth: '220px' }}
                        />
                        <AppDropdown
                            value={cancelled}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Active', value: 0 },
                                { label: 'Cancelled', value: 1 }
                            ]}
                            onChange={(event) => {
                                clearPageIndexLoadMeasurement();
                                setFirst(0);
                                setCancelledFilter(event.value);
                            }}
                            style={{ minWidth: '150px' }}
                        />
                    </>
                }
                headerRight={
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <AppReportActions
                            onRefresh={() => handleRefresh()}
                            refreshButtonId={refreshButtonId}
                            refreshDisabled={!canRefresh}
                            loadingState={reportLoading}
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
                            : `${filteredRows.length} issue book${filteredRows.length === 1 ? '' : 's'}`
                        : 'Press Refresh to load receipt book issues'
                }
            >
                <Column field="bookNumber" header="Book No" style={{ minWidth: '120px' }} />
                <Column field="voucherDateText" header="Issue Date" body={(row) => formatDate(row.voucherDateText)} />
                <Column field="receiptStartNumber" header="Start" />
                <Column field="receiptEndNumber" header="End" />
                <Column field="salesmanName" header="Salesman" style={{ minWidth: '180px' }} />
                <Column header="Used" body={usedCountBody} />
                <Column header="Status" body={statusBody} />
                <Column header="Actions" body={actionsBody} />
            </AppDataTable>

            {selectedBook && (
                <div className="mt-4">
                    <h4 className="m-0">Used Receipts • {selectedBook.bookNumber ?? selectedBook.moneyReceiptIssueBookId}</h4>
                    <p className="text-600 mt-1">{selectedEntries.length} receipts logged against this book.</p>
                    <AppDataTable value={selectedEntries} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} dataKey="receiptNumber" stripedRows size="small">
                        <Column field="receiptNumber" header="Receipt No" style={{ minWidth: '120px' }} />
                        <Column field="status" header="Status" style={{ minWidth: '120px' }} />
                        <Column field="voucherDateText" header="Voucher Date" body={(row) => formatDate(row.voucherDateText)} />
                    </AppDataTable>
                </div>
            )}

            <Dialog
                header={editing ? 'Edit Receipt Book Issue' : 'New Receipt Book Issue'}
                visible={dialogOpen}
                onHide={closeDialog}
                style={{ width: 'min(700px, 95vw)' }}
                modal
            >
                {editingUsageBounds && (
                    <div className="mb-3 p-2 border-round surface-50 text-700 text-sm">
                        Used receipts: <strong>{editingUsageBounds.usedCount}</strong> entries ({editingUsageBounds.minUsed} to {editingUsageBounds.maxUsed}).
                    </div>
                )}

                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label className="font-medium">Book Number</label>
                        <AppInput
                            id="receipt-book-issue-form-book-number"
                            value={form.bookNumber}
                            onChange={(event) => {
                                setForm((prev) => ({ ...prev, bookNumber: event.target.value }));
                                applyFormError('bookNumber');
                            }}
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-voucher-date');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={`w-full${formErrors.bookNumber ? ' p-invalid' : ''}`}
                        />
                        {formErrors.bookNumber && <small className="p-error">{formErrors.bookNumber}</small>}
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="font-medium">Issue Date</label>
                        <AppDateInput
                            value={form.voucherDate}
                            onChange={(value) => {
                                setForm((prev) => ({ ...prev, voucherDate: value }));
                                applyFormError('voucherDate');
                            }}
                            inputId="receipt-book-issue-form-voucher-date"
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-receipt-start');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={`w-full${formErrors.voucherDate ? ' p-invalid' : ''}`}
                        />
                        {formErrors.voucherDate && <small className="p-error">{formErrors.voucherDate}</small>}
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="font-medium">Receipt Start No</label>
                        <AppInput
                            inputType="number"
                            inputId="receipt-book-issue-form-receipt-start"
                            value={form.receiptStartNumber}
                            onValueChange={(event) => {
                                setForm((prev) => ({ ...prev, receiptStartNumber: event.value ?? null }));
                                applyFormError('receiptStartNumber');
                            }}
                            mode="decimal"
                            useGrouping={false}
                            min={1}
                            maxFractionDigits={0}
                            onEnterNext={() => {
                                const element = document.getElementById('receipt-book-issue-form-receipt-end');
                                if (element instanceof HTMLElement) {
                                    element.focus();
                                    return true;
                                }
                                return false;
                            }}
                            className={`w-full${formErrors.receiptStartNumber ? ' p-invalid' : ''}`}
                        />
                        {formErrors.receiptStartNumber && <small className="p-error">{formErrors.receiptStartNumber}</small>}
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="font-medium">Receipt End No</label>
                        <AppInput
                            inputType="number"
                            inputId="receipt-book-issue-form-receipt-end"
                            value={form.receiptEndNumber}
                            onValueChange={(event) => {
                                setForm((prev) => ({ ...prev, receiptEndNumber: event.value ?? null }));
                                applyFormError('receiptEndNumber');
                            }}
                            mode="decimal"
                            useGrouping={false}
                            min={1}
                            maxFractionDigits={0}
                            onEnterNext={() => {
                                formSalesmanRef.current?.focus?.();
                                return true;
                            }}
                            className={`w-full${formErrors.receiptEndNumber ? ' p-invalid' : ''}`}
                        />
                        {formErrors.receiptEndNumber && <small className="p-error">{formErrors.receiptEndNumber}</small>}
                    </div>

                    <div className="col-12">
                        <label className="font-medium">Salesman</label>
                        <AppDropdown
                            ref={formSalesmanRef}
                            inputId="receipt-book-issue-form-salesman"
                            value={form.salesmanId}
                            options={salesmanOptions}
                            onChange={(event) => {
                                setForm((prev) => ({ ...prev, salesmanId: event.value }));
                                applyFormError('salesmanId');
                            }}
                            placeholder="Select salesman"
                            showClear
                            filter
                            onEnterNext={focusSaveButton}
                            className={`w-full${formErrors.salesmanId ? ' p-invalid' : ''}`}
                        />
                        {formErrors.salesmanId && <small className="p-error">{formErrors.salesmanId}</small>}
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancel" outlined onClick={closeDialog} />
                    <Button
                        id={saveButtonId}
                        label={creating || updating ? 'Saving...' : 'Save'}
                        onClick={handleSave}
                        disabled={creating || updating}
                    />
                </div>
            </Dialog>
        </div>
    );
}
