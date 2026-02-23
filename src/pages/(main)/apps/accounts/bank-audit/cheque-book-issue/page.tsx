'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import type { Dropdown } from 'primereact/dropdown';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppReportActions from '@/components/AppReportActions';
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
    remarks: string | null;
    isCancelledFlag: number | null;
}

type LedgerOption = {
    label: string;
    value: number | null;
    groupName: string;
    name: string;
};

type FormValidationErrors = {
    bankLedgerId?: string;
    voucherDate?: string;
    chequeStartNumber?: string;
    chequeEndNumber?: string;
    remarks?: string;
};

type PageIndexLoadRequest = {
    offset: number;
    limit: number;
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
            remarks
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

export default function AccountsChequeBookIssuePage() {
    const { companyContext } = useAuth();
    const toastRef = useRef<Toast>(null);
    const [bankLedgerId, setBankLedgerId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(-1);
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const bankLedgerInputRef = useRef<Dropdown>(null);
    const refreshButtonId = 'cheque-book-issue-refresh';
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [searchMatchCase, setSearchMatchCase] = useState(false);
    const [searchWholeWord, setSearchWholeWord] = useState(false);
    const [pageIndexLoadRequest, setPageIndexLoadRequest] = useState<PageIndexLoadRequest | null>(null);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
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
    const focusDropdown = (ref: React.RefObject<Dropdown>) => {
        ref.current?.focus?.();
    };

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const queryVariables = useMemo(
        () => ({
            bankLedgerId,
            fromDate,
            toDate,
            cancelled,
            limit: rowsPerPage,
            offset: first
        }),
        [bankLedgerId, cancelled, first, fromDate, rowsPerPage, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof queryVariables>(null);
    const hasApplied = appliedVariables !== null;
    const pageIndexLoading = pageIndexLoadRequest !== null;

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

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        setFirst(0);
        setPageIndexLoadRequest(null);
        const refreshVariables = {
            ...queryVariables,
            limit: rowsPerPage,
            offset: 0
        };
        if (!hasApplied) {
            setAppliedVariables(refreshVariables);
            return;
        }
        setAppliedVariables(refreshVariables);
        void refetch(refreshVariables);
    };
    const [deleteMutation] = useMutation(DELETE_CHEQUE_ISSUE_BOOK);

    const ledgerOptions = useMemo<LedgerOption[]>(() => {
        const rows = (ledgerData?.ledgerSummaries?.items ?? []) as LedgerSummaryRow[];
        return rows.map((l) => ({
            label: `${l.name ?? ''}${l.groupName ? ` (${l.groupName})` : ''}`.trim() || `Ledger ${l.ledgerId}`,
            value: Number(l.ledgerId),
            groupName: String(l.groupName ?? ''),
            name: l.name ?? ''
        }));
    }, [ledgerData]);

    const bankLedgerOptions = useMemo(() => {
        const candidates = ledgerOptions
            .filter((o) => o.value != null)
            .filter((o) => String(o.groupName ?? '').toLowerCase().includes('bank'));
        const withAll = [{ label: 'All bank ledgers', value: null }];
        return candidates.length > 0 ? withAll.concat(candidates) : [{ label: 'All ledgers', value: null }].concat(ledgerOptions);
    }, [ledgerOptions]);

    const ledgerNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const o of ledgerOptions) map.set(Number(o.value), String(o.name ?? ''));
        return map;
    }, [ledgerOptions]);

    const rows: ChequeIssueBookRow[] = useMemo(() => (hasApplied ? data?.chequeIssueBooks ?? [] : []), [data, hasApplied]);
    const formRows: ChequeIssueBookRow[] = useMemo(() => (formRowsData?.chequeIssueBooks ?? []) as ChequeIssueBookRow[], [formRowsData]);
    const reportLoading = Boolean(hasApplied && loading);

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

    useEffect(() => {
        if (!pageIndexLoadRequest) return;
        if (loading) return;
        const appliedOffset = appliedVariables?.offset ?? 0;
        const appliedLimit = appliedVariables?.limit ?? rowsPerPage;
        if (appliedOffset === pageIndexLoadRequest.offset && appliedLimit === pageIndexLoadRequest.limit) {
            setPageIndexLoadRequest(null);
            return;
        }
        setPageIndexLoadRequest(null);
    }, [appliedVariables, loading, pageIndexLoadRequest, rowsPerPage]);

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
            setEditingId(null);
            setVoucherNo(String(next?.data?.nextChequeIssueBookNumber ?? '').trim());
            setVoucherDate(new Date());
            setFormBankLedgerId(bankLedgerId);
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

    const openEdit = (row: ChequeIssueBookRow) => {
        if (!canEditRow(row)) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: 'Editing is allowed only within the current fiscal year.'
            });
            return;
        }
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

    const canEditRow = (row: ChequeIssueBookRow) => {
        if (!row.voucherDate) return false;
        const parsed = new Date(`${row.voucherDate}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return false;
        return validateSingleDate({ date: parsed }, fiscalRange).ok;
    };

    const validateForm = () => {
        const errors: FormValidationErrors = {};

        const voucherDateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!voucherDateValidation.ok) {
            errors.voucherDate = voucherDateValidation.errors.date ?? 'Voucher date is required.';
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
                    ? `voucher ${overlappingBook.voucherNumber}`
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
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select voucher date and bank ledger.' });
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

    const toggleCancelled = async (row: ChequeIssueBookRow) => {
        if (!canEditRow(row)) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: 'Editing is allowed only within the current fiscal year.'
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

    const deleteRow = async (row: ChequeIssueBookRow) => {
        if (!canEditRow(row)) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: 'Deleting is allowed only within the current fiscal year.'
            });
            return;
        }
        if (!window.confirm(`Delete cheque book issue #${row.voucherNumber ?? row.chequeIssueBookId}?`)) return;
        try {
            await deleteMutation({ variables: { chequeIssueBookId: row.chequeIssueBookId } });
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
    }, [bankLedgerId, cancelled, dateRange]);

    const statusBody = (row: ChequeIssueBookRow) =>
        row.isCancelledFlag ? <Tag value="Cancelled" severity="danger" /> : <Tag value="Active" severity="success" />;

    const actionsBody = (row: ChequeIssueBookRow) => {
        const editable = canEditRow(row);
        const restrictedTitle = 'Editing is allowed only within the current fiscal year.';
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    className="p-button-text"
                    onClick={() => openEdit(row)}
                    disabled={!editable}
                    title={editable ? undefined : restrictedTitle}
                />
                <Button
                    icon={row.isCancelledFlag ? 'pi pi-undo' : 'pi pi-times'}
                    className="p-button-text"
                    onClick={() => toggleCancelled(row)}
                    severity={row.isCancelledFlag ? 'secondary' : 'danger'}
                    disabled={!editable}
                    title={editable ? undefined : restrictedTitle}
                />
                <Button
                    icon="pi pi-trash"
                    className="p-button-text"
                    onClick={() => deleteRow(row)}
                    severity="danger"
                    disabled={!editable}
                    title={editable ? undefined : restrictedTitle}
                />
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
                        <Button id="cheque-book-issue-save" label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Voucher No</label>
                        <AppInput value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Voucher Date</label>
                        <AppDateInput
                            value={voucherDate}
                            onChange={(value) => {
                                setVoucherDate(value);
                                setFormErrors((prev) => ({ ...prev, voucherDate: undefined }));
                            }}
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            style={{ width: '100%' }}
                        />
                        {formErrors.voucherDate && <small className="text-red-500">{formErrors.voucherDate}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Bank Ledger</label>
                        <AppDropdown
                            value={formBankLedgerId}
                            options={bankLedgerOptions.filter((o) => o.value != null)}
                            onChange={(e) => {
                                setFormBankLedgerId(e.value);
                                setFormErrors((prev) => ({
                                    ...prev,
                                    bankLedgerId: undefined,
                                    chequeStartNumber: undefined,
                                    chequeEndNumber: undefined
                                }));
                            }}
                            placeholder={ledgerLoading ? 'Loading...' : 'Select bank ledger'}
                            filter
                            showClear
                            loading={ledgerLoading}
                            showLoadingIcon
                            style={{ width: '100%' }}
                        />
                        {formErrors.bankLedgerId && <small className="text-red-500">{formErrors.bankLedgerId}</small>}
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Cheque Start No</label>
                        <AppInput
                            inputType="number"
                            value={startNo}
                            onValueChange={(e) => {
                                setStartNo(e.value == null ? null : Number(e.value));
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
                            style={{ width: '100%' }}
                        />
                        {formErrors.chequeStartNumber && <small className="text-red-500">{formErrors.chequeStartNumber}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Cheque End No</label>
                        <AppInput
                            inputType="number"
                            value={endNo}
                            onValueChange={(e) => {
                                setEndNo(e.value == null ? null : Number(e.value));
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
                            style={{ width: '100%' }}
                        />
                        {formErrors.chequeEndNumber && <small className="text-red-500">{formErrors.chequeEndNumber}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Remark</label>
                        <AppInput
                            value={remarks}
                            onChange={(e) => {
                                setRemarks(e.target.value);
                                setFormErrors((prev) => ({ ...prev, remarks: undefined }));
                            }}
                            style={{ width: '100%' }}
                        />
                        {formErrors.remarks && <small className="text-red-500">{formErrors.remarks}</small>}
                    </div>
                </div>
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Cheque Book Issue</h2>
                        <p className="mt-2 mb-0 text-600">Maintain cheque book ranges per bank ledger (required for cheque issue entry).</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Add" icon="pi pi-plus" onClick={openAdd} />
                        <Link to="/apps/accounts/bank-cheque-issue">
                            <Button label="Cheque Issue Entry" icon="pi pi-credit-card" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading cheque book issues: {error.message}</p>}
            </div>

            <AppDataTable
                value={filteredRows}
                paginator
                rows={rowsPerPage}
                rowsPerPageOptions={[20, 50, 100]}
                first={first}
                lazy
                onPage={(event) => {
                    setRowsPerPage(event.rows);
                    setFirst(event.first);
                    if (!hasApplied) {
                        setPageIndexLoadRequest(null);
                        return;
                    }
                    const nextVariables = {
                        ...queryVariables,
                        limit: event.rows,
                        offset: event.first
                    };
                    setPageIndexLoadRequest({ offset: event.first, limit: event.rows });
                    setAppliedVariables(nextVariables);
                    void refetch(nextVariables).catch(() => {
                        setPageIndexLoadRequest(null);
                    });
                }}
                dataKey="chequeIssueBookId"
                stripedRows
                size="small"
                loading={loading}
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load cheque book issues'}
                onRowDoubleClick={(event) => openEdit(event.data as ChequeIssueBookRow)}
                headerLeft={
                    <>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    setFirst(0);
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [value, prev[1]]);
                                    setDateErrors({});
                                    setPageIndexLoadRequest(null);
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
                                    setFirst(0);
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [prev[0], value]);
                                    setDateErrors({});
                                    setPageIndexLoadRequest(null);
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={toDateInputRef}
                                onEnterNext={() => focusDropdown(bankLedgerInputRef)}
                                style={{ width: '130px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <AppDropdown
                            value={bankLedgerId}
                            options={bankLedgerOptions}
                            ref={bankLedgerInputRef}
                            onChange={(e) => {
                                setFirst(0);
                                setBankLedgerId(e.value);
                                setPageIndexLoadRequest(null);
                            }}
                            placeholder={ledgerLoading ? 'Loading...' : 'Bank ledger'}
                            filter
                            showClear
                            loading={ledgerLoading}
                            showLoadingIcon
                            style={{ minWidth: '260px' }}
                        />
                        <AppDropdown
                            value={cancelled}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Not cancelled', value: 0 },
                                { label: 'Cancelled', value: 1 }
                            ]}
                            onChange={(e) => {
                                setFirst(0);
                                setCancelled(e.value);
                                setPageIndexLoadRequest(null);
                            }}
                            onEnterNext={() => {
                                focusRefreshButton();
                                return true;
                            }}
                            placeholder="Status"
                            style={{ minWidth: '160px' }}
                        />
                    </>
                }
                headerRight={
                    <div className="flex flex-column gap-2 align-items-end">
                        <ReportRegisterSearch
                            value={searchText}
                            onValueChange={setSearchText}
                            matchCase={searchMatchCase}
                            onMatchCaseChange={setSearchMatchCase}
                            wholeWord={searchWholeWord}
                            onWholeWordChange={setSearchWholeWord}
                            disabled={reportLoading && rows.length === 0}
                        />
                        <AppReportActions
                            onRefresh={handleRefresh}
                            onPrint={() => window.print()}
                            refreshDisabled={!canRefresh}
                            refreshButtonId={refreshButtonId}
                            loadingState={reportLoading}
                            loadingSummaryEnabled={hasApplied}
                            pageLoadingState={pageIndexLoading}
                            pageLoadingSummaryEnabled={hasApplied}
                        />
                    </div>
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading cheque book issues...'
                            : `${filteredRows.length} cheque book issue${filteredRows.length === 1 ? '' : 's'}`
                        : 'Press Refresh to load cheque book issues'
                }
            >
                <Column field="voucherNumber" header="Voucher No" sortable style={{ width: '9rem' }} />
                <Column field="voucherDate" header="Voucher Date" body={(r: ChequeIssueBookRow) => formatDate(r.voucherDate)} sortable style={{ width: '8rem' }} />
                <Column
                    header="Bank Ledger"
                    body={(r: ChequeIssueBookRow) => (r.bankLedgerId ? ledgerNameById.get(r.bankLedgerId) ?? '' : '')}
                    sortable
                    sortField="bankLedgerId"
                />
                <Column field="chequeStartNumber" header="Start" sortable style={{ width: '8rem', textAlign: 'right' }} />
                <Column field="chequeEndNumber" header="End" sortable style={{ width: '8rem', textAlign: 'right' }} />
                <Column field="remarks" header="Remark" body={(r: ChequeIssueBookRow) => <span className="text-600">{r.remarks ?? ''}</span>} />
                <Column header="Status" body={statusBody} style={{ width: '7rem' }} />
                <Column header="Actions" body={actionsBody} style={{ width: '10rem' }} />
            </AppDataTable>
        </div>
    );
}
