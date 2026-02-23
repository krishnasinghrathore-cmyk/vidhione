'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppInput from '@/components/AppInput';
import AppDropdown from '@/components/AppDropdown';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';
import { billingApolloClient } from '@/lib/billingApolloClient';
import { useLedgerLookup } from '../useLedgerLookup';

interface MoneyReceiptCashRow {
    cashReceiptId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerName: string | null;
    otherLedgerName: string | null;
    salesLedgerName: string | null;
    managerName: string | null;
    salesmanName: string | null;
    isFullPaid: boolean;
    totalAmount: number;
    discountAmount: number;
    netAmount: number;
    adjustedAmount: number;
    diffAmount: number;
    chequeCancelCharges: number;
    isCancelled: boolean;
    isChecked: boolean;
}

interface ManagerRow {
    managerId: number;
    name: string | null;
}

interface SalesmanRow {
    salesmanId: number;
    name: string | null;
}

interface IssueBookRow {
    moneyReceiptIssueBookId: number;
    bookNumber: string | null;
    voucherDateText: string | null;
}

type ReceiptLine = {
    saleInvoiceId: number | null;
    lineAmount: number | null;
    remarkText: string | null;
};

type ReceiptForm = {
    voucherNumber: string;
    voucherDate: Date | null;
    ledgerId: number | null;
    otherLedgerId: number | null;
    salesLedgerId: number | null;
    managerId: number | null;
    salesmanId: number | null;
    issueBookId: number | null;
    isFullPaid: boolean;
    discountAmount: number;
    chequeCancelCharges: number;
    isChecked: boolean;
    remarks: string;
    lines: ReceiptLine[];
};

const MANAGERS = gql`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
        }
    }
`;

const SALESMEN = gql`
    query Salesmen($search: String, $limit: Int) {
        salesmen(search: $search, limit: $limit) {
            salesmanId
            name
        }
    }
`;

const ISSUE_BOOKS = gql`
    query MoneyReceiptManualBookIssueDetail($input: MoneyReceiptManualBookIssueInput) {
        moneyReceiptManualBookIssueDetail(input: $input) {
            books {
                moneyReceiptIssueBookId
                bookNumber
                voucherDateText
            }
        }
    }
`;

const MONEY_RECEIPT_CASH_BOOK = gql`
    query MoneyReceiptCashBook($input: MoneyReceiptCashBookInput) {
        moneyReceiptCashBook(input: $input) {
            items {
                cashReceiptId
                voucherNumber
                voucherDateText
                ledgerName
                otherLedgerName
                salesLedgerName
                managerName
                salesmanName
                isFullPaid
                totalAmount
                discountAmount
                netAmount
                adjustedAmount
                diffAmount
                chequeCancelCharges
                isCancelled
                isChecked
            }
            totalCount
        }
    }
`;

const CREATE_MONEY_RECEIPT_CASH = gql`
    mutation CreateMoneyReceiptCash($input: MoneyReceiptCashEntryInput!) {
        createMoneyReceiptCash(input: $input) {
            cashReceiptId
        }
    }
`;

const CANCEL_MONEY_RECEIPT_CASH = gql`
    mutation CancelMoneyReceiptCash($cashReceiptId: Int!, $cancelled: Boolean) {
        cancelMoneyReceiptCash(cashReceiptId: $cashReceiptId, cancelled: $cancelled)
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
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    return trimmed;
};

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

const emptyForm = (): ReceiptForm => ({
    voucherNumber: '',
    voucherDate: new Date(),
    ledgerId: null,
    otherLedgerId: null,
    salesLedgerId: null,
    managerId: null,
    salesmanId: null,
    issueBookId: null,
    isFullPaid: false,
    discountAmount: 0,
    chequeCancelCharges: 0,
    isChecked: false,
    remarks: '',
    lines: []
});

export default function BillingMoneyReceiptCashPage() {
    const toast = useRef<Toast>(null);
    const { companyContext } = useAuth();
    const { ledgerOptions } = useLedgerLookup();

    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [cancelled, setCancelledFilter] = useState<-1 | 0 | 1>(-1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<ReceiptForm>(emptyForm());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'money-receipt-cash-refresh';

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

    const { data: managerData } = useQuery(MANAGERS, { variables: { search: null, limit: 2000 } });
    const { data: salesmanData } = useQuery(SALESMEN, {
        variables: { search: null, limit: 2000 }
    });
    const { data: issueBookData } = useQuery(ISSUE_BOOKS, {
        client: billingApolloClient,
        variables: { input: { cancelled: 0 } }
    });

    const registerVariables = useMemo(
        () => ({
            input: {
                fromDate,
                toDate,
                ledgerId: ledgerId ?? null,
                cancelled
            }
        }),
        [cancelled, fromDate, ledgerId, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(MONEY_RECEIPT_CASH_BOOK, {
        client: billingApolloClient,
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables
    });

    const [createReceipt, { loading: saving }] = useMutation(CREATE_MONEY_RECEIPT_CASH, {
        client: billingApolloClient
    });
    const [setReceiptCancelled] = useMutation(CANCEL_MONEY_RECEIPT_CASH, { client: billingApolloClient });

    const rows = useMemo<MoneyReceiptCashRow[]>(() => (hasApplied ? data?.moneyReceiptCashBook?.items ?? [] : []), [data, hasApplied]);

    const managerOptions = useMemo(() => {
        const rows = (managerData?.managers ?? []) as ManagerRow[];
        return rows.map((row) => ({ label: row.name ?? `Manager ${row.managerId}`, value: row.managerId }));
    }, [managerData]);

    const salesmanOptions = useMemo(() => {
        const rows = (salesmanData?.salesmen ?? []) as SalesmanRow[];
        return rows.map((row) => ({ label: row.name ?? `Salesman ${row.salesmanId}`, value: row.salesmanId }));
    }, [salesmanData]);

    const issueBookOptions = useMemo(() => {
        const rows = (issueBookData?.moneyReceiptManualBookIssueDetail?.books ?? []) as IssueBookRow[];
        return rows.map((row) => ({
            label: `${row.bookNumber ?? `Book ${row.moneyReceiptIssueBookId}`}${row.voucherDateText ? ` • ${formatDate(row.voucherDateText)}` : ''}`,
            value: row.moneyReceiptIssueBookId
        }));
    }, [issueBookData]);

    const lineTotal = useMemo(
        () => form.lines.reduce((sum, line) => sum + (line.lineAmount ?? 0), 0),
        [form.lines]
    );
    const totalAmount = lineTotal;
    const netAmount = totalAmount - (form.discountAmount || 0) + (form.chequeCancelCharges || 0);
    const totalDiff = totalAmount - netAmount;

    const resetForm = () => setForm(emptyForm());

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

    const openDialog = () => {
        resetForm();
        setDialogOpen(true);
    };

    const addLine = () => {
        setForm((prev) => ({
            ...prev,
            lines: [...prev.lines, { saleInvoiceId: null, lineAmount: null, remarkText: '' }]
        }));
    };

    const updateLine = (index: number, patch: Partial<ReceiptLine>) => {
        setForm((prev) => {
            const next = [...prev.lines];
            next[index] = { ...next[index], ...patch };
            return { ...prev, lines: next };
        });
    };

    const removeLine = (index: number) => {
        setForm((prev) => ({
            ...prev,
            lines: prev.lines.filter((_, idx) => idx !== index)
        }));
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
        if (!form.voucherDate) {
            toast.current?.show({ severity: 'warn', summary: 'Voucher date required', detail: 'Select voucher date.' });
            return;
        }
        if (!form.ledgerId) {
            toast.current?.show({ severity: 'warn', summary: 'Ledger required', detail: 'Select a ledger.' });
            return;
        }
        if (form.lines.length === 0) {
            toast.current?.show({ severity: 'warn', summary: 'Lines required', detail: 'Add at least one line.' });
            return;
        }
        const lines = form.lines
            .filter((line) => line.saleInvoiceId && (line.lineAmount ?? 0) > 0)
            .map((line) => ({
                saleInvoiceId: Number(line.saleInvoiceId),
                lineAmount: Number(line.lineAmount ?? 0),
                remarkText: line.remarkText?.trim() || null
            }));
        if (lines.length === 0) {
            toast.current?.show({ severity: 'warn', summary: 'Valid lines required', detail: 'Add line amounts.' });
            return;
        }

        try {
            await createReceipt({
                variables: {
                    input: {
                        voucherNumber: form.voucherNumber?.trim() || null,
                        voucherDateText: toDateText(form.voucherDate),
                        ledgerId: form.ledgerId,
                        otherLedgerId: form.otherLedgerId,
                        salesLedgerId: form.salesLedgerId,
                        managerId: form.managerId,
                        salesmanId: form.salesmanId,
                        issueBookId: form.issueBookId,
                        isFullPaid: form.isFullPaid,
                        totalAmount,
                        discountAmount: form.discountAmount || 0,
                        netAmount,
                        totalInvoiceAmount: totalAmount,
                        totalDiffAmount: totalDiff,
                        chequeCancelCharges: form.chequeCancelCharges || 0,
                        isChecked: form.isChecked,
                        remarks: form.remarks?.trim() || null,
                        lines
                    }
                }
            });
            toast.current?.show({ severity: 'success', summary: 'Saved', detail: 'Money receipt saved.' });
            setDialogOpen(false);
            resetForm();
            await refetch();
        } catch (err: any) {
            toast.current?.show({ severity: 'error', summary: 'Save failed', detail: err.message });
        }
    };

    const handleCancel = async (row: MoneyReceiptCashRow) => {
        try {
            await setReceiptCancelled({
                variables: { cashReceiptId: row.cashReceiptId, cancelled: !row.isCancelled }
            });
            toast.current?.show({
                severity: 'success',
                summary: row.isCancelled ? 'Restored' : 'Cancelled',
                detail: `Receipt ${row.voucherNumber ?? row.cashReceiptId} updated.`
            });
            await refetch();
        } catch (err: any) {
            toast.current?.show({ severity: 'error', summary: 'Update failed', detail: err.message });
        }
    };

    const statusBody = (row: MoneyReceiptCashRow) => (
        <Tag value={row.isCancelled ? 'Cancelled' : 'Active'} severity={row.isCancelled ? 'danger' : 'success'} />
    );

    const checkedBody = (row: MoneyReceiptCashRow) => (
        <Tag value={row.isChecked ? 'Checked' : 'Unchecked'} severity={row.isChecked ? 'info' : 'warning'} />
    );

    return (
        <div className="card">
            <Toast ref={toast} />
            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Money Receipt (Cash)</h2>
                        <p className="mt-2 mb-0 text-600">Create and manage cash receipts with invoice allocations.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Receipt" icon="pi pi-plus" onClick={openDialog} />
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
                {error && <p className="text-red-500 m-0">Error loading receipts: {error.message}</p>}
            </div>

            <AppDataTable
                value={rows}
                paginator
                rows={20}
                rowsPerPageOptions={[20, 50, 100]}
                dataKey="cashReceiptId"
                stripedRows
                size="small"
                loading={loading}
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
                            value={ledgerId}
                            options={ledgerOptions}
                            onChange={(e) => setLedgerId(e.value)}
                            placeholder="Ledger"
                            showClear
                            filter
                            style={{ minWidth: '240px' }}
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
                    </>
                }
            >
                <Column field="voucherNumber" header="Receipt No" style={{ minWidth: '120px' }} />
                <Column field="voucherDateText" header="Date" body={(row) => formatDate(row.voucherDateText)} />
                <Column field="ledgerName" header="Ledger" style={{ minWidth: '200px' }} />
                <Column field="otherLedgerName" header="Other Ledger" style={{ minWidth: '200px' }} />
                <Column field="salesLedgerName" header="Sales Ledger" style={{ minWidth: '200px' }} />
                <Column field="managerName" header="Manager" style={{ minWidth: '160px' }} />
                <Column field="salesmanName" header="Salesman" style={{ minWidth: '160px' }} />
                <Column
                    field="isFullPaid"
                    header="Full Paid"
                    body={(row) => (row.isFullPaid ? 'Yes' : '')}
                    style={{ width: '6rem' }}
                />
                <Column field="totalAmount" header="Total" body={(row) => formatAmount(row.totalAmount)} />
                <Column field="discountAmount" header="Discount" body={(row) => formatAmount(row.discountAmount)} />
                <Column field="netAmount" header="Net" body={(row) => formatAmount(row.netAmount)} />
                <Column field="adjustedAmount" header="Adjusted" body={(row) => formatAmount(row.adjustedAmount)} />
                <Column field="diffAmount" header="Diff" body={(row) => formatAmount(row.diffAmount)} />
                <Column
                    field="chequeCancelCharges"
                    header="Chq. Cancel"
                    body={(row) => formatAmount(row.chequeCancelCharges)}
                />
                <Column header="Status" body={statusBody} />
                <Column header="Checked" body={checkedBody} />
                <Column
                    header="Actions"
                    body={(row) => (
                        <Button
                            icon={row.isCancelled ? 'pi pi-undo' : 'pi pi-ban'}
                            className="p-button-text p-button-sm"
                            label={row.isCancelled ? 'Undo' : 'Cancel'}
                            onClick={() => handleCancel(row)}
                        />
                    )}
                />
            </AppDataTable>

            <Dialog
                header="New Money Receipt (Cash)"
                visible={dialogOpen}
                onHide={() => setDialogOpen(false)}
                style={{ width: 'min(1000px, 95vw)' }}
                modal
            >
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Voucher Date</label>
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
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Voucher No</label>
                        <AppInput
                            value={form.voucherNumber}
                            onChange={(e) => setForm((prev) => ({ ...prev, voucherNumber: e.target.value }))}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Ledger</label>
                        <AppDropdown
                            value={form.ledgerId}
                            options={ledgerOptions}
                            onChange={(e) => setForm((prev) => ({ ...prev, ledgerId: e.value }))}
                            placeholder="Select ledger"
                            filter
                            showClear
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Other Ledger</label>
                        <AppDropdown
                            value={form.otherLedgerId}
                            options={ledgerOptions}
                            onChange={(e) => setForm((prev) => ({ ...prev, otherLedgerId: e.value }))}
                            placeholder="Optional"
                            filter
                            showClear
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Sales Ledger</label>
                        <AppDropdown
                            value={form.salesLedgerId}
                            options={ledgerOptions}
                            onChange={(e) => setForm((prev) => ({ ...prev, salesLedgerId: e.value }))}
                            placeholder="Optional"
                            filter
                            showClear
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Issue Book</label>
                        <AppDropdown
                            value={form.issueBookId}
                            options={issueBookOptions}
                            onChange={(e) => setForm((prev) => ({ ...prev, issueBookId: e.value }))}
                            placeholder="Optional"
                            showClear
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Manager</label>
                        <AppDropdown
                            value={form.managerId}
                            options={managerOptions}
                            onChange={(e) => setForm((prev) => ({ ...prev, managerId: e.value }))}
                            placeholder="Optional"
                            showClear
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Salesman</label>
                        <AppDropdown
                            value={form.salesmanId}
                            options={salesmanOptions}
                            onChange={(e) => setForm((prev) => ({ ...prev, salesmanId: e.value }))}
                            placeholder="Optional"
                            showClear
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4 flex align-items-center gap-2">
                        <Checkbox
                            inputId="fullPaid"
                            checked={form.isFullPaid}
                            onChange={(e) => setForm((prev) => ({ ...prev, isFullPaid: !!e.checked }))}
                        />
                        <label htmlFor="fullPaid" className="font-medium">
                            Full Paid
                        </label>
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Discount</label>
                        <AppInput inputType="number"
                            value={form.discountAmount}
                            onValueChange={(e) => setForm((prev) => ({ ...prev, discountAmount: e.value ?? 0 }))}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Cheque Cancel Charges</label>
                        <AppInput inputType="number"
                            value={form.chequeCancelCharges}
                            onValueChange={(e) => setForm((prev) => ({ ...prev, chequeCancelCharges: e.value ?? 0 }))}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-4 flex align-items-center gap-2">
                        <Checkbox
                            inputId="checkedFlag"
                            checked={form.isChecked}
                            onChange={(e) => setForm((prev) => ({ ...prev, isChecked: !!e.checked }))}
                        />
                        <label htmlFor="checkedFlag" className="font-medium">
                            Checked
                        </label>
                    </div>
                    <div className="col-12">
                        <label className="font-medium">Remarks</label>
                        <AppInput
                            value={form.remarks}
                            onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <div className="flex align-items-center justify-content-between mb-2">
                        <h4 className="m-0">Invoice Lines</h4>
                        <Button icon="pi pi-plus" label="Add Line" onClick={addLine} className="p-button-sm" />
                    </div>
                    {form.lines.length === 0 && <p className="text-600 m-0">No lines added yet.</p>}
                    {form.lines.map((line, idx) => (
                        <div className="grid align-items-center" key={`line-${idx}`}>
                            <div className="col-12 md:col-3">
                                <AppInput inputType="number"
                                    value={line.saleInvoiceId}
                                    onValueChange={(e) => updateLine(idx, { saleInvoiceId: e.value ?? null })}
                                    placeholder="Invoice Id"
                                    className="w-full"
                                />
                            </div>
                            <div className="col-12 md:col-3">
                                <AppInput inputType="number"
                                    value={line.lineAmount}
                                    onValueChange={(e) => updateLine(idx, { lineAmount: e.value ?? null })}
                                    placeholder="Amount"
                                    mode="decimal"
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                    className="w-full"
                                />
                            </div>
                            <div className="col-12 md:col-5">
                                <AppInput
                                    value={line.remarkText ?? ''}
                                    onChange={(e) => updateLine(idx, { remarkText: e.target.value })}
                                    placeholder="Remark"
                                    className="w-full"
                                />
                            </div>
                            <div className="col-12 md:col-1">
                                <Button
                                    icon="pi pi-trash"
                                    className="p-button-text p-button-danger"
                                    onClick={() => removeLine(idx)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 grid">
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Total Amount</label>
                        <AppInput value={formatAmount(totalAmount)} disabled className="w-full" />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Net Amount</label>
                        <AppInput value={formatAmount(netAmount)} disabled className="w-full" />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="font-medium">Difference</label>
                        <AppInput value={formatAmount(totalDiff)} disabled className="w-full" />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancel" outlined onClick={() => setDialogOpen(false)} />
                    <Button label={saving ? 'Saving...' : 'Save'} onClick={handleSave} disabled={saving} />
                </div>
            </Dialog>
        </div>
    );
}
