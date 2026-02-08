'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import type { Dropdown } from 'primereact/dropdown';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
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
    const [search, setSearch] = useState('');

    const [dialogVisible, setDialogVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const [voucherNo, setVoucherNo] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [formBankLedgerId, setFormBankLedgerId] = useState<number | null>(null);
    const [startNo, setStartNo] = useState<number | null>(null);
    const [endNo, setEndNo] = useState<number | null>(null);
    const [remarks, setRemarks] = useState('');

    const { data: ledgerData, loading: ledgerLoading } = useQuery(LEDGER_LOOKUP, {
        variables: { search: null, limit: 5000 }
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
            limit: 5000,
            offset: 0
        }),
        [bankLedgerId, cancelled, fromDate, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof queryVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(CHEQUE_ISSUE_BOOKS, {
        variables: appliedVariables ?? queryVariables,
        skip: !appliedVariables
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
        if (!hasApplied) {
            setAppliedVariables(queryVariables);
            return;
        }
        setAppliedVariables(queryVariables);
        void refetch(queryVariables);
    };
    const [deleteMutation] = useMutation(DELETE_CHEQUE_ISSUE_BOOK);

    const ledgerOptions = useMemo(() => {
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
            .filter((o: any) => o.value)
            .filter((o: any) => String(o.groupName ?? '').toLowerCase().includes('bank'));
        const withAll = [{ label: 'All bank ledgers', value: null }];
        return candidates.length > 0 ? withAll.concat(candidates) : [{ label: 'All ledgers', value: null }].concat(ledgerOptions);
    }, [ledgerOptions]);

    const ledgerNameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const o of ledgerOptions) map.set(Number(o.value), String(o.name ?? ''));
        return map;
    }, [ledgerOptions]);

    const rows: ChequeIssueBookRow[] = useMemo(() => (hasApplied ? data?.chequeIssueBooks ?? [] : []), [data, hasApplied]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((r) => {
            const parts = [
                r.voucherNumber ?? '',
                r.remarks ?? '',
                r.bankLedgerId ? ledgerNameById.get(r.bankLedgerId) ?? '' : ''
            ];
            return parts.join(' ').toLowerCase().includes(term);
        });
    }, [ledgerNameById, rows, search]);

    const resetForm = () => {
        setEditingId(null);
        setVoucherNo(String(nextNoData?.nextChequeIssueBookNumber ?? '').trim());
        setVoucherDate(new Date());
        setFormBankLedgerId(null);
        setStartNo(null);
        setEndNo(null);
        setRemarks('');
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
            setDialogVisible(true);
        } catch {
            resetForm();
            setDialogVisible(true);
        }
    };

    const openEdit = (row: ChequeIssueBookRow) => {
        setEditingId(row.chequeIssueBookId);
        setVoucherNo(row.voucherNumber ?? '');
        setVoucherDate(row.voucherDate ? new Date(row.voucherDate) : null);
        setFormBankLedgerId(row.bankLedgerId ?? null);
        setStartNo(row.chequeStartNumber ?? null);
        setEndNo(row.chequeEndNumber ?? null);
        setRemarks(row.remarks ?? '');
        setDialogVisible(true);
    };

    const save = async () => {
        const voucherDateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!voucherDateValidation.ok) {
            const message = voucherDateValidation.errors.date ?? 'Voucher date is required';
            setVoucherDateError(message);
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: message });
            return;
        }
        setVoucherDateError(null);
        const voucherDateText = toDateText(voucherDate);
        if (!formBankLedgerId) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select bank ledger.' });
            return;
        }
        if (!voucherDateText) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select voucher date.' });
            return;
        }
        if (startNo != null && endNo != null && startNo > endNo) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Cheque start number must be <= cheque end number.'
            });
            return;
        }

        try {
            setSaving(true);
            const variables = {
                bankLedgerId: formBankLedgerId,
                voucherNumber: voucherNo.trim() ? voucherNo.trim() : null,
                voucherDateText,
                chequeStartNumber: startNo ?? null,
                chequeEndNumber: endNo ?? null,
                remarks: remarks.trim() ? remarks.trim() : null
            };

            if (editingId) {
                await updateChequeIssueBook({ variables: { chequeIssueBookId: editingId, ...variables } });
            } else {
                await createChequeIssueBook({ variables });
            }

            setDialogVisible(false);
            setSaving(false);
            await refetch(queryVariables);
            await refetchNextNo();
        } catch (e: any) {
            setSaving(false);
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to save.' });
        }
    };

    const toggleCancelled = async (row: ChequeIssueBookRow) => {
        try {
            const next = row.isCancelledFlag ? 0 : 1;
            await setCancelledMutation({ variables: { chequeIssueBookId: row.chequeIssueBookId, isCancelledFlag: next } });
            await refetch(queryVariables);
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to update status.' });
        }
    };

    const deleteRow = async (row: ChequeIssueBookRow) => {
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
        setSearch('');
    }, [bankLedgerId, cancelled, dateRange]);

    const statusBody = (row: ChequeIssueBookRow) =>
        row.isCancelledFlag ? <Tag value="Cancelled" severity="danger" /> : <Tag value="Active" severity="success" />;

    const actionsBody = (row: ChequeIssueBookRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
            <Button
                icon={row.isCancelledFlag ? 'pi pi-undo' : 'pi pi-times'}
                className="p-button-text"
                onClick={() => toggleCancelled(row)}
                severity={row.isCancelledFlag ? 'secondary' : 'danger'}
            />
            <Button icon="pi pi-trash" className="p-button-text" onClick={() => deleteRow(row)} severity="danger" />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />

            <Dialog
                header={editingId ? 'Edit Cheque Book Issue' : 'Add Cheque Book Issue'}
                visible={dialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button label="Cancel" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
                        <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Voucher No</label>
                        <InputText value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Voucher Date</label>
                        <AppDateInput
                            value={voucherDate}
                            onChange={(value) => {
                                setVoucherDate(value);
                                setVoucherDateError(null);
                            }}
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            style={{ width: '100%' }}
                        />
                        {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Bank Ledger</label>
                        <AppDropdown
                            value={formBankLedgerId}
                            options={bankLedgerOptions.filter((o: any) => o.value)}
                            onChange={(e) => setFormBankLedgerId(e.value)}
                            placeholder={ledgerLoading ? 'Loading...' : 'Select bank ledger'}
                            filter
                            showClear
                            loading={ledgerLoading}
                            showLoadingIcon
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Cheque Start No</label>
                        <InputNumber value={startNo} onValueChange={(e) => setStartNo(e.value as number)} min={0} mode="decimal" useGrouping={false} />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Cheque End No</label>
                        <InputNumber value={endNo} onValueChange={(e) => setEndNo(e.value as number)} min={0} mode="decimal" useGrouping={false} />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Remark</label>
                        <InputText value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ width: '100%' }} />
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
                rows={15}
                rowsPerPageOptions={[15, 30, 50, 100]}
                dataKey="chequeIssueBookId"
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
                            onChange={(e) => setBankLedgerId(e.value)}
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
                            onChange={(e) => setCancelled(e.value)}
                            placeholder="Status"
                            style={{ minWidth: '160px' }}
                        />
                        <span className="p-input-icon-left" style={{ minWidth: '240px' }}>
                            <i className="pi pi-search" />
                            <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={{ width: '100%' }} />
                        </span>
                    </>
                }
                headerRight={
                    <>
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
                recordSummary={`${filteredRows.length} cheque book issue${filteredRows.length === 1 ? '' : 's'}`}
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
