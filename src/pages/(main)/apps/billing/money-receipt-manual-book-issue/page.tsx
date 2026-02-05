'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';
import { billingApolloClient } from '@/lib/billingApolloClient';

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
    if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}`);
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return new Date(`${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`);
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

const emptyForm = (): IssueBookForm => ({
    bookNumber: '',
    voucherDate: new Date(),
    receiptStartNumber: null,
    receiptEndNumber: null,
    salesmanId: null
});

export default function BillingMoneyReceiptManualBookIssuePage() {
    const toast = useRef<Toast>(null);
    const { companyContext } = useAuth();

    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [salesmanId, setSalesmanId] = useState<number | null>(null);
    const [cancelled, setCancelledFilter] = useState<-1 | 0 | 1>(-1);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<IssueBookRow | null>(null);
    const [form, setForm] = useState<IssueBookForm>(emptyForm());
    const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'money-receipt-manual-refresh';

    const fromDate = toDateText(dateRange[0]);
    const toDate = toDateText(dateRange[1]);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const canRefresh = Boolean(fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };

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
        skip: !appliedVariables
    });

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (!hasApplied) {
            setAppliedVariables(registerVariables);
            return;
        }
        setAppliedVariables(registerVariables);
        void refetch(registerVariables);
    };

    const [createBook, { loading: creating }] = useMutation(CREATE_ISSUE_BOOK, { client: billingApolloClient });
    const [updateBook, { loading: updating }] = useMutation(UPDATE_ISSUE_BOOK, { client: billingApolloClient });
    const [setIssueBookCancelled] = useMutation(CANCEL_ISSUE_BOOK, { client: billingApolloClient });

    const rows = useMemo<IssueBookRow[]>(() => (hasApplied ? data?.moneyReceiptManualBookIssueDetail?.books ?? [] : []), [data, hasApplied]);
    const entries = useMemo<IssueEntryRow[]>(() => (hasApplied ? data?.moneyReceiptManualBookIssueDetail?.entries ?? [] : []), [data, hasApplied]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.bookNumber, row.salesmanName, row.moneyReceiptIssueBookId]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);

    const entriesByBookId = useMemo(() => {
        const map = new Map<number, IssueEntryRow[]>();
        entries.forEach((entry) => {
            const key = entry.moneyReceiptIssueBookId;
            if (!map.has(key)) map.set(key, []);
            map.get(key)?.push(entry);
        });
        return map;
    }, [entries]);

    const salesmanOptions = useMemo(() => {
        const rows = (salesmanData?.salesmen ?? []) as SalesmanRow[];
        return rows.map((row) => ({ label: row.name ?? `Salesman ${row.salesmanId}`, value: row.salesmanId }));
    }, [salesmanData]);

    const selectedBook = useMemo(
        () => filteredRows.find((row) => row.moneyReceiptIssueBookId === selectedBookId) ?? null,
        [filteredRows, selectedBookId]
    );

    const selectedEntries = useMemo(() => {
        if (!selectedBook) return [] as IssueEntryRow[];
        return entriesByBookId.get(selectedBook.moneyReceiptIssueBookId) ?? [];
    }, [entriesByBookId, selectedBook]);

    const openNew = () => {
        setEditing(null);
        setForm(emptyForm());
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
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const voucherDateValidation = validateSingleDate({ date: form.voucherDate }, fiscalRange);
        if (!voucherDateValidation.ok) {
            const message = voucherDateValidation.errors.date ?? 'Voucher date is required';
            setVoucherDateError(message);
            toast.current?.show({ severity: 'warn', summary: 'Voucher date required', detail: message });
            return;
        }
        setVoucherDateError(null);
        if (!form.bookNumber.trim()) {
            toast.current?.show({ severity: 'warn', summary: 'Book number required', detail: 'Enter book number.' });
            return;
        }
        if (!form.voucherDate) {
            toast.current?.show({ severity: 'warn', summary: 'Voucher date required', detail: 'Select voucher date.' });
            return;
        }
        if (form.receiptStartNumber == null || form.receiptEndNumber == null) {
            toast.current?.show({ severity: 'warn', summary: 'Receipt range required', detail: 'Enter receipt range.' });
            return;
        }
        if (form.receiptStartNumber > form.receiptEndNumber) {
            toast.current?.show({ severity: 'warn', summary: 'Invalid range', detail: 'Start must be <= end.' });
            return;
        }
        if (!form.salesmanId) {
            toast.current?.show({ severity: 'warn', summary: 'Salesman required', detail: 'Select salesman.' });
            return;
        }

        try {
            const input = {
                bookNumber: form.bookNumber.trim(),
                voucherDateText: toDateText(form.voucherDate),
                receiptStartNumber: Number(form.receiptStartNumber),
                receiptEndNumber: Number(form.receiptEndNumber),
                salesmanId: Number(form.salesmanId)
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

            toast.current?.show({ severity: 'success', summary: 'Saved', detail: 'Issue book saved.' });
            setDialogOpen(false);
            setEditing(null);
            setForm(emptyForm());
            await refetch();
        } catch (err: any) {
            toast.current?.show({ severity: 'error', summary: 'Save failed', detail: err.message });
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
            await refetch();
        } catch (err: any) {
            toast.current?.show({ severity: 'error', summary: 'Update failed', detail: err.message });
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
        <div className="card">
            <Toast ref={toast} />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Money Receipt Manual Book Issue</h2>
                        <p className="mt-2 mb-0 text-600">Maintain receipt book ranges issued to salesmen.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Book" icon="pi pi-plus" onClick={openNew} />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            outlined
                            id={refreshButtonId}
                            onClick={handleRefresh}
                            disabled={!canRefresh}
                        />
                        <Link to="/apps/billing">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading books: {error.message}</p>}
            </div>

            <AppDataTable
                value={filteredRows}
                paginator
                rows={20}
                rowsPerPageOptions={[20, 50, 100]}
                dataKey="moneyReceiptIssueBookId"
                stripedRows
                size="small"
                loading={loading}
                selectionMode="single"
                selection={selectedBook ?? undefined}
                onSelectionChange={(e) => setSelectedBookId(e.value?.moneyReceiptIssueBookId ?? null)}
                headerLeft={
                    <>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    setDateRange((prev) => [value, prev[1]]);
                                    setDateErrors({});
                                }}
                                placeholder="From date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                style={{ width: '130px' }}
                            />
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
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
                            onChange={(e) => setSalesmanId(e.value)}
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
                            onChange={(e) => setCancelledFilter(e.value)}
                            style={{ minWidth: '150px' }}
                        />
                        <span className="p-input-icon-left" style={{ minWidth: '240px' }}>
                            <i className="pi pi-search" />
                            <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} issue book${filteredRows.length === 1 ? '' : 's'}`}
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
                header={editing ? 'Edit Issue Book' : 'New Issue Book'}
                visible={dialogOpen}
                onHide={() => setDialogOpen(false)}
                style={{ width: 'min(700px, 95vw)' }}
                modal
            >
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label className="font-medium">Book Number</label>
                        <InputText
                            value={form.bookNumber}
                            onChange={(e) => setForm((prev) => ({ ...prev, bookNumber: e.target.value }))}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="font-medium">Issue Date</label>
                        <AppDateInput
                            value={form.voucherDate}
                            onChange={(value) => {
                                setForm((prev) => ({ ...prev, voucherDate: value }));
                                setVoucherDateError(null);
                            }}
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            className="w-full"
                        />
                        {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="font-medium">Receipt Start No</label>
                        <InputNumber
                            value={form.receiptStartNumber}
                            onValueChange={(e) => setForm((prev) => ({ ...prev, receiptStartNumber: e.value ?? null }))}
                            mode="decimal"
                            useGrouping={false}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="font-medium">Receipt End No</label>
                        <InputNumber
                            value={form.receiptEndNumber}
                            onValueChange={(e) => setForm((prev) => ({ ...prev, receiptEndNumber: e.value ?? null }))}
                            mode="decimal"
                            useGrouping={false}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12">
                        <label className="font-medium">Salesman</label>
                        <AppDropdown
                            value={form.salesmanId}
                            options={salesmanOptions}
                            onChange={(e) => setForm((prev) => ({ ...prev, salesmanId: e.value }))}
                            placeholder="Select salesman"
                            showClear
                            filter
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancel" outlined onClick={() => setDialogOpen(false)} />
                    <Button
                        label={creating || updating ? 'Saving...' : 'Save'}
                        onClick={handleSave}
                        disabled={creating || updating}
                    />
                </div>
            </Dialog>
        </div>
    );
}
