'use client';
import React, { useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import type { DropdownChangeEvent } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import type { InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppReportActions from '@/components/AppReportActions';
import { ReportHeader } from '@/components/ReportHeader';
import { useAuth } from '@/lib/auth/context';
import { billingApolloClient } from '@/lib/billingApolloClient';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';
import {
    CANCELLED_FILTER_OPTIONS,
    formatAmount,
    formatDateText,
    parseDateText,
    type DropdownNumberOption,
    toDateText,
    trimToNull
} from '../collectionFormUtils';

type LookupRow = {
    salesmanId?: number;
    billCollectionStatusId?: number;
    name: string | null;
};

type SaleInvoiceLookupRow = {
    saleInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerName: string | null;
    totalNetAmount: number;
    dueAmount: number;
};

type BillCollectionHeaderRow = {
    billCollectionId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    billFromDateText: string | null;
    billToDateText: string | null;
    salesmanId: number | null;
    salesmanName: string | null;
    otherText: string | null;
    noOfBills: number | null;
    receivedCount: number | null;
    isCancelled: boolean;
};

type BillCollectionLineRow = {
    billCollectionLineId: number;
    saleInvoiceId: number | null;
    billNumber: string | null;
    billDateText: string | null;
    ledgerName: string | null;
    dueAmount: number;
    billCollectionStatusId: number | null;
    billCollectionStatusName: string | null;
    remarkText: string | null;
};

type BillCollectionLineForm = {
    saleInvoiceId: number;
    billNumber: string;
    billDateText: string | null;
    ledgerName: string | null;
    dueAmount: number;
    billCollectionStatusId: number | null;
    remarkText: string;
};

type BillCollectionForm = {
    voucherNumber: string;
    voucherDate: Date | null;
    billFromDate: Date | null;
    billToDate: Date | null;
    salesmanId: number | null;
    otherText: string;
    lines: BillCollectionLineForm[];
};

type BillCollectionFormErrors = {
    voucherDate?: string;
    billFromDate?: string;
    billToDate?: string;
    salesmanId?: string;
};

const SALESMEN = gql`
    query Salesmen($search: String, $limit: Int) {
        salesmen(search: $search, limit: $limit) {
            salesmanId
            name
        }
    }
`;

const BILL_COLLECTION_STATUSES = gql`
    query BillCollectionStatuses($search: String, $limit: Int) {
        billCollectionStatuses(search: $search, limit: $limit) {
            billCollectionStatusId
            name
        }
    }
`;

const SALE_INVOICES_LOOKUP = gql`
    query SaleInvoices($fromDate: String, $toDate: String, $includeCancelled: Boolean, $limit: Int) {
        saleInvoices(fromDate: $fromDate, toDate: $toDate, includeCancelled: $includeCancelled, limit: $limit) {
            items {
                saleInvoiceId
                voucherNumber
                voucherDateText
                ledgerName
                totalNetAmount
                dueAmount
            }
        }
    }
`;

const BILL_COLLECTION_BOOK = gql`
    query BillCollectionBook($input: BillCollectionBookInput) {
        billCollectionBook(input: $input) {
            items {
                billCollectionId
                voucherNumber
                voucherDateText
                billFromDateText
                billToDateText
                salesmanId
                salesmanName
                otherText
                noOfBills
                receivedCount
                isCancelled
            }
            totalCount
        }
    }
`;

const BILL_COLLECTION_LINES = gql`
    query BillCollectionLines($billCollectionId: Int!, $orderByBillNo: Boolean) {
        billCollectionLines(billCollectionId: $billCollectionId, orderByBillNo: $orderByBillNo) {
            billCollectionLineId
            saleInvoiceId
            billNumber
            billDateText
            ledgerName
            dueAmount
            billCollectionStatusId
            billCollectionStatusName
            remarkText
        }
    }
`;

const CREATE_BILL_COLLECTION = gql`
    mutation CreateBillCollection($input: BillCollectionEntryInput!) {
        createBillCollection(input: $input) {
            billCollectionId
        }
    }
`;

const UPDATE_BILL_COLLECTION = gql`
    mutation UpdateBillCollection($input: BillCollectionEntryInput!) {
        updateBillCollection(input: $input) {
            billCollectionId
        }
    }
`;

const CANCEL_BILL_COLLECTION = gql`
    mutation CancelBillCollection($billCollectionId: Int!, $cancelled: Boolean) {
        cancelBillCollection(billCollectionId: $billCollectionId, cancelled: $cancelled)
    }
`;

const toOptionList = (
    rows: LookupRow[],
    idKey: 'salesmanId' | 'billCollectionStatusId',
    fallbackLabel: string
): DropdownNumberOption[] =>
    rows
        .map((row) => {
            const value = row[idKey];
            if (!value) return null;
            return {
                value,
                label: row.name?.trim() || `${fallbackLabel} ${value}`
            };
        })
        .filter((row): row is DropdownNumberOption => Boolean(row));

const emptyForm = (dateSeed: Date | null = new Date()): BillCollectionForm => ({
    voucherNumber: '',
    voucherDate: dateSeed,
    billFromDate: null,
    billToDate: null,
    salesmanId: null,
    otherText: '',
    lines: []
});

const DataTableAny = AppDataTable as any;

export default function BillingBillCollectionPage() {
    const toast = useRef<Toast>(null);
    const { companyContext } = useAuth();

    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [salesmanFilter, setSalesmanFilter] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<number | null>(null);
    const [otherTextFilter, setOtherTextFilter] = useState('');
    const [cancelled, setCancelledFilter] = useState<-1 | 0 | 1>(-1);
    const [pendingOnly, setPendingOnly] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<BillCollectionHeaderRow | null>(null);
    const [form, setForm] = useState<BillCollectionForm>(emptyForm());
    const [formErrors, setFormErrors] = useState<BillCollectionFormErrors>({});
    const [invoiceToAddId, setInvoiceToAddId] = useState<number | null>(null);
    const [selectedRegisterRow, setSelectedRegisterRow] = useState<BillCollectionHeaderRow | null>(null);

    const fromDate = toDateText(dateRange[0]);
    const toDate = toDateText(dateRange[1]);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const refreshButtonId = 'bill-collection-refresh';
    const canRefresh = Boolean(fromDate && toDate);

    const { data: salesmenData } = useQuery<{ salesmen: LookupRow[] }>(SALESMEN, {
        variables: { search: null, limit: 2000 }
    });

    const { data: statusData } = useQuery<{ billCollectionStatuses: LookupRow[] }>(BILL_COLLECTION_STATUSES, {
        variables: { search: null, limit: 2000 }
    });

    const salesmanOptions = useMemo(
        () => toOptionList(salesmenData?.salesmen ?? [], 'salesmanId', 'Salesman'),
        [salesmenData?.salesmen]
    );
    const statusOptions = useMemo(
        () => toOptionList(statusData?.billCollectionStatuses ?? [], 'billCollectionStatusId', 'Status'),
        [statusData?.billCollectionStatuses]
    );

    const registerVariables = useMemo(
        () => ({
            input: {
                fromDate,
                toDate,
                salesmanId: salesmanFilter ?? null,
                billCollectionStatusId: statusFilter ?? null,
                cancelled,
                receivedPendingOnly: pendingOnly,
                otherText: trimToNull(otherTextFilter)
            }
        }),
        [cancelled, fromDate, otherTextFilter, pendingOnly, salesmanFilter, statusFilter, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const {
        data: registerData,
        loading: registerLoading,
        error: registerError,
        refetch: refetchRegister
    } = useQuery<{ billCollectionBook: { items: BillCollectionHeaderRow[] } }>(BILL_COLLECTION_BOOK, {
        client: billingApolloClient,
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const registerRows = useMemo<BillCollectionHeaderRow[]>(
        () => (hasApplied ? registerData?.billCollectionBook?.items ?? [] : []),
        [hasApplied, registerData?.billCollectionBook?.items]
    );

    const selectedBillCollectionId = selectedRegisterRow?.billCollectionId ?? 0;
    const {
        data: selectedLinesData,
        loading: selectedLinesLoading,
        error: selectedLinesError,
        refetch: refetchSelectedLines
    } = useQuery<{ billCollectionLines: BillCollectionLineRow[] }>(BILL_COLLECTION_LINES, {
        client: billingApolloClient,
        variables: { billCollectionId: selectedBillCollectionId, orderByBillNo: true },
        skip: !selectedRegisterRow,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const selectedLines = useMemo<BillCollectionLineRow[]>(
        () => selectedLinesData?.billCollectionLines ?? [],
        [selectedLinesData?.billCollectionLines]
    );

    const dialogBillFromDateText = toDateText(form.billFromDate);
    const dialogBillToDateText = toDateText(form.billToDate);
    const shouldFetchSaleInvoices = Boolean(dialogOpen && dialogBillFromDateText && dialogBillToDateText);

    const { data: saleInvoiceData, loading: saleInvoiceLoading } = useQuery<{
        saleInvoices: { items: SaleInvoiceLookupRow[] };
    }>(SALE_INVOICES_LOOKUP, {
        client: billingApolloClient,
        variables: {
            fromDate: dialogBillFromDateText,
            toDate: dialogBillToDateText,
            includeCancelled: false,
            limit: 500
        },
        skip: !shouldFetchSaleInvoices,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const saleInvoiceRows = useMemo<SaleInvoiceLookupRow[]>(() => saleInvoiceData?.saleInvoices?.items ?? [], [saleInvoiceData]);

    const [createBillCollection, { loading: creating }] = useMutation(CREATE_BILL_COLLECTION, {
        client: billingApolloClient
    });
    const [updateBillCollection, { loading: updating }] = useMutation(UPDATE_BILL_COLLECTION, {
        client: billingApolloClient
    });
    const [setBillCollectionCancelled] = useMutation(CANCEL_BILL_COLLECTION, {
        client: billingApolloClient
    });

    const saving = creating || updating;

    const pendingCount = (row: BillCollectionHeaderRow) => {
        const total = Number(row.noOfBills ?? 0);
        const received = Number(row.receivedCount ?? 0);
        return Math.max(total - received, 0);
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        setSelectedRegisterRow(null);
        setAppliedVariables(registerVariables);
    };

    const openNew = () => {
        setEditingRow(null);
        setForm(emptyForm(dateRange[1] ?? new Date()));
        setFormErrors({});
        setInvoiceToAddId(null);
        setDialogOpen(true);
    };

    const openEdit = async (row: BillCollectionHeaderRow) => {
        setEditingRow(row);
        setForm({
            voucherNumber: row.voucherNumber ?? '',
            voucherDate: parseDateText(row.voucherDateText),
            billFromDate: parseDateText(row.billFromDateText),
            billToDate: parseDateText(row.billToDateText),
            salesmanId: row.salesmanId,
            otherText: row.otherText ?? '',
            lines: []
        });
        setFormErrors({});
        setInvoiceToAddId(null);
        setDialogOpen(true);

        try {
            const { data } = await billingApolloClient.query<{ billCollectionLines: BillCollectionLineRow[] }>({
                query: BILL_COLLECTION_LINES,
                variables: { billCollectionId: row.billCollectionId, orderByBillNo: true },
                fetchPolicy: 'network-only'
            });
            const lines = data?.billCollectionLines ?? [];
            setForm((prev) => ({
                ...prev,
                lines: lines
                    .filter((line) => line.saleInvoiceId != null)
                    .map((line) => ({
                        saleInvoiceId: Number(line.saleInvoiceId),
                        billNumber: line.billNumber ?? `#${line.saleInvoiceId}`,
                        billDateText: line.billDateText ?? null,
                        ledgerName: line.ledgerName ?? null,
                        dueAmount: Number(line.dueAmount ?? 0),
                        billCollectionStatusId: line.billCollectionStatusId ?? null,
                        remarkText: line.remarkText ?? ''
                    }))
            }));
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error?.message ?? 'Failed to load bill collection lines.'
            });
        }
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingRow(null);
        setForm(emptyForm(dateRange[1] ?? new Date()));
        setFormErrors({});
        setInvoiceToAddId(null);
    };

    const selectedSaleInvoiceIdSet = useMemo(
        () => new Set(form.lines.map((line) => line.saleInvoiceId)),
        [form.lines]
    );

    const availableInvoiceOptions = useMemo(
        () =>
            saleInvoiceRows
                .filter((row) => !selectedSaleInvoiceIdSet.has(row.saleInvoiceId))
                .map((row) => ({
                    value: row.saleInvoiceId,
                    label: `${row.voucherNumber ?? row.saleInvoiceId} | ${row.ledgerName ?? 'Party'} | Due ${formatAmount(Number(row.dueAmount ?? 0))}`
                })),
        [saleInvoiceRows, selectedSaleInvoiceIdSet]
    );

    const addInvoiceLine = () => {
        if (!invoiceToAddId) return;
        const invoice = saleInvoiceRows.find((row) => row.saleInvoiceId === invoiceToAddId);
        if (!invoice) return;
        setForm((prev) => ({
            ...prev,
            lines: [
                ...prev.lines,
                {
                    saleInvoiceId: invoice.saleInvoiceId,
                    billNumber: invoice.voucherNumber ?? `#${invoice.saleInvoiceId}`,
                    billDateText: invoice.voucherDateText ?? null,
                    ledgerName: invoice.ledgerName ?? null,
                    dueAmount: Number(invoice.dueAmount ?? 0),
                    billCollectionStatusId: null,
                    remarkText: ''
                }
            ]
        }));
        setInvoiceToAddId(null);
    };

    const updateLine = <K extends keyof BillCollectionLineForm>(
        saleInvoiceId: number,
        key: K,
        value: BillCollectionLineForm[K]
    ) => {
        setForm((prev) => ({
            ...prev,
            lines: prev.lines.map((line) =>
                line.saleInvoiceId === saleInvoiceId
                    ? {
                          ...line,
                          [key]: value
                      }
                    : line
            )
        }));
    };

    const removeLine = (saleInvoiceId: number) => {
        setForm((prev) => ({
            ...prev,
            lines: prev.lines.filter((line) => line.saleInvoiceId !== saleInvoiceId)
        }));
    };

    const validateForm = () => {
        const nextErrors: BillCollectionFormErrors = {};

        const voucherDateValidation = validateSingleDate({ date: form.voucherDate }, fiscalRange);
        if (!voucherDateValidation.ok) {
            nextErrors.voucherDate = voucherDateValidation.errors.date ?? 'Voucher date is required';
        }

        if (!form.salesmanId) {
            nextErrors.salesmanId = 'Salesman is required';
        }

        if (form.billFromDate || form.billToDate) {
            const billRangeValidation = validateDateRange(
                { fromDate: form.billFromDate, toDate: form.billToDate },
                fiscalRange
            );
            if (!billRangeValidation.ok) {
                nextErrors.billFromDate = billRangeValidation.errors.fromDate;
                nextErrors.billToDate = billRangeValidation.errors.toDate;
            }
        }

        setFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const save = async () => {
        if (!validateForm()) {
            toast.current?.show({ severity: 'warn', summary: 'Please fix validation errors' });
            return;
        }

        const input = {
            billCollectionId: editingRow?.billCollectionId ?? undefined,
            voucherNumber: trimToNull(form.voucherNumber),
            voucherDateText: toDateText(form.voucherDate),
            billFromDateText: toDateText(form.billFromDate),
            billToDateText: toDateText(form.billToDate),
            salesmanId: form.salesmanId,
            otherText: trimToNull(form.otherText),
            lines: form.lines.map((line) => ({
                saleInvoiceId: line.saleInvoiceId,
                dueAmount: Number(line.dueAmount ?? 0),
                billCollectionStatusId: line.billCollectionStatusId,
                remarkText: trimToNull(line.remarkText)
            }))
        };

        try {
            if (editingRow) {
                await updateBillCollection({ variables: { input } });
            } else {
                await createBillCollection({ variables: { input } });
            }

            toast.current?.show({
                severity: 'success',
                summary: editingRow ? 'Updated' : 'Saved',
                detail: editingRow ? 'Bill collection updated.' : 'Bill collection created.'
            });
            closeDialog();
            if (hasApplied) {
                await refetchRegister();
            }
            if (selectedRegisterRow) {
                await refetchSelectedLines();
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error?.message ?? 'Save failed.'
            });
        }
    };

    const toggleCancelled = (row: BillCollectionHeaderRow, nextCancelled: boolean) => {
        confirmDialog({
            message: nextCancelled
                ? `Cancel bill collection #${row.voucherNumber ?? row.billCollectionId}?`
                : `Uncancel bill collection #${row.voucherNumber ?? row.billCollectionId}?`,
            header: nextCancelled ? 'Cancel Bill Collection' : 'Uncancel Bill Collection',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            accept: async () => {
                try {
                    await setBillCollectionCancelled({
                        variables: { billCollectionId: row.billCollectionId, cancelled: nextCancelled }
                    });
                    await refetchRegister();
                    if (selectedRegisterRow?.billCollectionId === row.billCollectionId) {
                        await refetchSelectedLines();
                    }
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Saved',
                        detail: nextCancelled ? 'Bill collection cancelled.' : 'Bill collection restored.'
                    });
                } catch (error: any) {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: error?.message ?? 'Failed to update cancellation status.'
                    });
                }
            }
        });
    };

    const statusBody = (row: BillCollectionHeaderRow) => (
        <Tag value={row.isCancelled ? 'Cancelled' : 'Active'} severity={row.isCancelled ? 'danger' : 'success'} />
    );

    const actionsBody = (row: BillCollectionHeaderRow) => (
        <div className="flex justify-content-end gap-2">
            <Button
                icon="pi pi-list"
                text
                rounded
                aria-label="View lines"
                tooltip="View lines"
                onClick={() => setSelectedRegisterRow(row)}
            />
            <Button
                icon="pi pi-pencil"
                text
                rounded
                aria-label="Edit"
                tooltip="Edit"
                disabled={row.isCancelled}
                onClick={() => {
                    void openEdit(row);
                }}
            />
            <Button
                icon={row.isCancelled ? 'pi pi-refresh' : 'pi pi-ban'}
                text
                rounded
                severity={row.isCancelled ? 'success' : 'warning'}
                aria-label={row.isCancelled ? 'Uncancel' : 'Cancel'}
                tooltip={row.isCancelled ? 'Uncancel' : 'Cancel'}
                onClick={() => toggleCancelled(row, !row.isCancelled)}
            />
        </div>
    );

    const lineActionsBody = (line: BillCollectionLineForm) => (
        <Button
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            aria-label="Remove line"
            onClick={() => removeLine(line.saleInvoiceId)}
        />
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Close" text onClick={closeDialog} disabled={saving} />
            <Button label="Save" icon="pi pi-save" onClick={save} loading={saving} />
        </div>
    );

    return (
        <div className="grid">
            <div className="col-12">
                <Toast ref={toast} />
                <ConfirmDialog />
                <div className="card">
                    <ReportHeader
                        title="Bill Collection"
                        subtitle="Collections transaction register aligned to legacy workflow."
                        rightSlot={
                            <div className="flex align-items-center gap-2">
                                <Button
                                    label="New Bill Collection"
                                    icon="pi pi-plus"
                                    className="app-action-compact"
                                    onClick={openNew}
                                />
                                <AppReportActions
                                    onRefresh={handleRefresh}
                                    refreshDisabled={!canRefresh}
                                    refreshButtonId={refreshButtonId}
                                    loadingState={registerLoading}
                                />
                            </div>
                        }
                    />

                    <div className="grid mt-3">
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">From Date</label>
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    setDateRange((prev) => [value, prev[1]]);
                                    setDateErrors((prev) => ({ ...prev, fromDate: undefined }));
                                }}
                                fiscalYearStart={fiscalRange.start}
                                fiscalYearEnd={fiscalRange.end}
                                inputId="bill-collection-from-date"
                            />
                            {dateErrors.fromDate ? <small className="p-error">{dateErrors.fromDate}</small> : null}
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">To Date</label>
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
                                    setDateRange((prev) => [prev[0], value]);
                                    setDateErrors((prev) => ({ ...prev, toDate: undefined }));
                                }}
                                fiscalYearStart={fiscalRange.start}
                                fiscalYearEnd={fiscalRange.end}
                                inputId="bill-collection-to-date"
                            />
                            {dateErrors.toDate ? <small className="p-error">{dateErrors.toDate}</small> : null}
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">Salesman</label>
                            <AppDropdown
                                value={salesmanFilter}
                                options={salesmanOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="All"
                                showClear
                                filter
                                onChange={(event: DropdownChangeEvent) => setSalesmanFilter((event.value as number) ?? null)}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">Collection Status</label>
                            <AppDropdown
                                value={statusFilter}
                                options={statusOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="All"
                                showClear
                                filter
                                onChange={(event: DropdownChangeEvent) => setStatusFilter((event.value as number) ?? null)}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">Cancelled</label>
                            <AppDropdown
                                value={cancelled}
                                options={CANCELLED_FILTER_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event: DropdownChangeEvent) =>
                                    setCancelledFilter((event.value as -1 | 0 | 1) ?? -1)
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-sm mb-2">Other Text</label>
                            <AppInput
                                value={otherTextFilter}
                                onChange={(event) => setOtherTextFilter(event.target.value)}
                                placeholder="Optional exact other text filter"
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-3 flex align-items-center gap-2 pt-4">
                            <Checkbox
                                inputId="bill-collection-pending-only"
                                checked={pendingOnly}
                                onChange={(event) => setPendingOnly(Boolean(event.checked))}
                            />
                            <label htmlFor="bill-collection-pending-only">Pending Bills Only</label>
                        </div>
                    </div>

                    {registerError ? (
                        <p className="text-red-500 m-0 mt-2">Error loading bill collection register: {registerError.message}</p>
                    ) : null}

                    <DataTableAny
                        value={registerRows}
                        loading={registerLoading}
                        dataKey="billCollectionId"
                        paginator
                        rows={20}
                        rowsPerPageOptions={[20, 50, 100, 200]}
                        responsiveLayout="scroll"
                        emptyMessage={hasApplied ? 'No bill collection entries found.' : 'Set filters and click Refresh.'}
                        className="mt-3"
                        onRowClick={(event: any) => setSelectedRegisterRow(event.data as BillCollectionHeaderRow)}
                        recordSummary={hasApplied ? `${registerRows.length} entries` : undefined}
                    >
                        <Column field="voucherNumber" header="Voucher" style={{ minWidth: '8rem' }} />
                        <Column
                            field="voucherDateText"
                            header="Date"
                            body={(row: BillCollectionHeaderRow) => formatDateText(row.voucherDateText)}
                            style={{ minWidth: '8rem' }}
                        />
                        <Column
                            header="Bill Range"
                            body={(row: BillCollectionHeaderRow) => {
                                const from = formatDateText(row.billFromDateText);
                                const to = formatDateText(row.billToDateText);
                                if (!from && !to) return '-';
                                return `${from || '-'} - ${to || '-'}`;
                            }}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column field="salesmanName" header="Salesman" style={{ minWidth: '10rem' }} />
                        <Column
                            header="Bills"
                            body={(row: BillCollectionHeaderRow) => Number(row.noOfBills ?? 0)}
                            style={{ width: '6rem' }}
                            bodyClassName="text-right"
                            headerClassName="text-right"
                        />
                        <Column
                            header="Received"
                            body={(row: BillCollectionHeaderRow) => Number(row.receivedCount ?? 0)}
                            style={{ width: '7rem' }}
                            bodyClassName="text-right"
                            headerClassName="text-right"
                        />
                        <Column
                            header="Pending"
                            body={(row: BillCollectionHeaderRow) => pendingCount(row)}
                            style={{ width: '7rem' }}
                            bodyClassName="text-right"
                            headerClassName="text-right"
                        />
                        <Column header="Status" body={statusBody} style={{ width: '8rem' }} />
                        <Column header="Actions" body={actionsBody} exportable={false} style={{ width: '10rem' }} />
                    </DataTableAny>
                </div>
            </div>

            {selectedRegisterRow ? (
                <div className="col-12">
                    <div className="card">
                        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
                            <h3 className="m-0">
                                Lines: #{selectedRegisterRow.voucherNumber ?? selectedRegisterRow.billCollectionId}
                            </h3>
                            <Button
                                label="Close"
                                text
                                icon="pi pi-times"
                                onClick={() => setSelectedRegisterRow(null)}
                            />
                        </div>
                        {selectedLinesError ? (
                            <p className="text-red-500 m-0 mb-2">Error loading lines: {selectedLinesError.message}</p>
                        ) : null}
                        <DataTableAny
                            value={selectedLines}
                            loading={selectedLinesLoading}
                            dataKey="billCollectionLineId"
                            responsiveLayout="scroll"
                            emptyMessage="No bills available for this entry."
                        >
                            <Column field="billNumber" header="Bill No." style={{ minWidth: '8rem' }} />
                            <Column
                                field="billDateText"
                                header="Bill Date"
                                body={(row: BillCollectionLineRow) => formatDateText(row.billDateText)}
                                style={{ minWidth: '8rem' }}
                            />
                            <Column field="ledgerName" header="Party" style={{ minWidth: '14rem' }} />
                            <Column
                                field="dueAmount"
                                header="Due Amount"
                                body={(row: BillCollectionLineRow) => formatAmount(Number(row.dueAmount ?? 0))}
                                style={{ minWidth: '8rem' }}
                                bodyClassName="text-right"
                                headerClassName="text-right"
                            />
                            <Column field="billCollectionStatusName" header="Collection Status" style={{ minWidth: '11rem' }} />
                            <Column field="remarkText" header="Remark" style={{ minWidth: '14rem' }} />
                        </DataTableAny>
                    </div>
                </div>
            ) : null}

            <Dialog
                visible={dialogOpen}
                onHide={closeDialog}
                header={editingRow ? 'Edit Bill Collection' : 'New Bill Collection'}
                style={{ width: '95vw', maxWidth: '1100px' }}
                footer={dialogFooter}
                modal
            >
                <div className="grid formgrid">
                    <div className="field col-12 md:col-3">
                        <label className="mb-2 block">Voucher No.</label>
                        <AppInput
                            value={form.voucherNumber}
                            onChange={(event) => setForm((prev) => ({ ...prev, voucherNumber: event.target.value }))}
                            placeholder="Auto if blank"
                            className="w-full"
                        />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="mb-2 block">Voucher Date *</label>
                        <AppDateInput
                            value={form.voucherDate}
                            onChange={(value) => {
                                setForm((prev) => ({ ...prev, voucherDate: value }));
                                setFormErrors((prev) => ({ ...prev, voucherDate: undefined }));
                            }}
                            fiscalYearStart={fiscalRange.start}
                            fiscalYearEnd={fiscalRange.end}
                        />
                        {formErrors.voucherDate ? <small className="p-error">{formErrors.voucherDate}</small> : null}
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="mb-2 block">Bill From Date</label>
                        <AppDateInput
                            value={form.billFromDate}
                            onChange={(value) => {
                                setForm((prev) => ({ ...prev, billFromDate: value }));
                                setFormErrors((prev) => ({ ...prev, billFromDate: undefined }));
                            }}
                            fiscalYearStart={fiscalRange.start}
                            fiscalYearEnd={fiscalRange.end}
                        />
                        {formErrors.billFromDate ? <small className="p-error">{formErrors.billFromDate}</small> : null}
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="mb-2 block">Bill To Date</label>
                        <AppDateInput
                            value={form.billToDate}
                            onChange={(value) => {
                                setForm((prev) => ({ ...prev, billToDate: value }));
                                setFormErrors((prev) => ({ ...prev, billToDate: undefined }));
                            }}
                            fiscalYearStart={fiscalRange.start}
                            fiscalYearEnd={fiscalRange.end}
                        />
                        {formErrors.billToDate ? <small className="p-error">{formErrors.billToDate}</small> : null}
                    </div>
                    <div className="field col-12 md:col-6">
                        <label className="mb-2 block">Salesman *</label>
                        <AppDropdown
                            value={form.salesmanId}
                            options={salesmanOptions}
                            optionLabel="label"
                            optionValue="value"
                            filter
                            placeholder="Select salesman"
                            className="w-full"
                            onChange={(event: DropdownChangeEvent) => {
                                setForm((prev) => ({ ...prev, salesmanId: (event.value as number) ?? null }));
                                setFormErrors((prev) => ({ ...prev, salesmanId: undefined }));
                            }}
                        />
                        {formErrors.salesmanId ? <small className="p-error">{formErrors.salesmanId}</small> : null}
                    </div>
                    <div className="field col-12 md:col-6">
                        <label className="mb-2 block">Other Text</label>
                        <AppInput
                            value={form.otherText}
                            onChange={(event) => setForm((prev) => ({ ...prev, otherText: event.target.value }))}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="surface-50 border-1 border-200 border-round p-3 mb-3">
                    <div className="grid formgrid align-items-end">
                        <div className="field col-12 md:col-9 mb-0">
                            <label className="mb-2 block">Add Bill</label>
                            <AppDropdown
                                value={invoiceToAddId}
                                options={availableInvoiceOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder={
                                    shouldFetchSaleInvoices
                                        ? availableInvoiceOptions.length
                                            ? 'Select bill'
                                            : 'No bills available for selected date range'
                                        : 'Set Bill From/To dates to load bills'
                                }
                                filter
                                className="w-full"
                                loading={saleInvoiceLoading}
                                onChange={(event: DropdownChangeEvent) =>
                                    setInvoiceToAddId((event.value as number) ?? null)
                                }
                            />
                        </div>
                        <div className="field col-12 md:col-3 mb-0">
                            <Button
                                label="Add Bill"
                                icon="pi pi-plus"
                                className="w-full"
                                onClick={addInvoiceLine}
                                disabled={!invoiceToAddId}
                            />
                        </div>
                    </div>
                </div>

                <DataTableAny
                    value={form.lines}
                    dataKey="saleInvoiceId"
                    responsiveLayout="scroll"
                    emptyMessage="No bills selected."
                >
                    <Column field="billNumber" header="Bill No." style={{ minWidth: '8rem' }} />
                    <Column
                        field="billDateText"
                        header="Bill Date"
                        body={(line: BillCollectionLineForm) => formatDateText(line.billDateText)}
                        style={{ minWidth: '8rem' }}
                    />
                    <Column field="ledgerName" header="Party" style={{ minWidth: '14rem' }} />
                    <Column
                        header="Due Amount"
                        style={{ minWidth: '10rem' }}
                        body={(line: BillCollectionLineForm) => (
                            <AppInput
                                inputType="number"
                                value={Number(line.dueAmount ?? 0)}
                                mode="decimal"
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                className="w-full"
                                onValueChange={(event: InputNumberValueChangeEvent) =>
                                    updateLine(line.saleInvoiceId, 'dueAmount', Number(event.value ?? 0))
                                }
                            />
                        )}
                    />
                    <Column
                        header="Collection Status"
                        style={{ minWidth: '11rem' }}
                        body={(line: BillCollectionLineForm) => (
                            <AppDropdown
                                value={line.billCollectionStatusId}
                                options={statusOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Status"
                                className="w-full"
                                onChange={(event: DropdownChangeEvent) =>
                                    updateLine(line.saleInvoiceId, 'billCollectionStatusId', (event.value as number) ?? null)
                                }
                            />
                        )}
                    />
                    <Column
                        header="Remark"
                        style={{ minWidth: '14rem' }}
                        body={(line: BillCollectionLineForm) => (
                            <AppInput
                                value={line.remarkText}
                                className="w-full"
                                onChange={(event) =>
                                    updateLine(line.saleInvoiceId, 'remarkText', event.target.value)
                                }
                            />
                        )}
                    />
                    <Column header="Actions" body={lineActionsBody} exportable={false} style={{ width: '6rem' }} />
                </DataTableAny>
            </Dialog>
        </div>
    );
}
