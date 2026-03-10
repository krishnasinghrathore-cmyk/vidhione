'use client';
import React, { useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import type { DropdownChangeEvent } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
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
    deliveryById?: number;
    deliveryStatusId?: number;
    checkedById?: number;
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

type DeliveryProcessHeaderRow = {
    deliveryProcessId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    billFromDateText: string | null;
    billToDateText: string | null;
    deliveryById: number | null;
    deliveryByName: string | null;
    otherText: string | null;
    tripNumber: string | null;
    noOfBills: number | null;
    receivedCount: number | null;
    isCancelled: boolean;
};

type DeliveryProcessLineRow = {
    deliveryProcessLineId: number;
    saleInvoiceId: number | null;
    billNumber: string | null;
    billDateText: string | null;
    ledgerName: string | null;
    billAmount: number;
    deliveryStatusId: number | null;
    deliveryStatusName: string | null;
    checkedById: number | null;
    checkedByName: string | null;
    remarkText: string | null;
};

type DeliveryProcessLineForm = {
    saleInvoiceId: number;
    billNumber: string;
    billDateText: string | null;
    ledgerName: string | null;
    billAmount: number;
    deliveryStatusId: number | null;
    checkedById: number | null;
    remarkText: string;
};

type DeliveryProcessForm = {
    voucherNumber: string;
    voucherDate: Date | null;
    billFromDate: Date | null;
    billToDate: Date | null;
    deliveryById: number | null;
    otherText: string;
    tripNumber: string;
    lines: DeliveryProcessLineForm[];
};

type DeliveryProcessFormErrors = {
    voucherDate?: string;
    billFromDate?: string;
    billToDate?: string;
    deliveryById?: string;
};

const DELIVERY_BY = gql`
    query DeliveryBy($search: String, $limit: Int) {
        deliveryBy(search: $search, limit: $limit) {
            deliveryById
            name
        }
    }
`;

const DELIVERY_STATUSES = gql`
    query DeliveryStatuses($search: String, $limit: Int) {
        deliveryStatuses(search: $search, limit: $limit) {
            deliveryStatusId
            name
        }
    }
`;

const CHECKED_BY = gql`
    query CheckedBy($search: String, $limit: Int) {
        checkedBy(search: $search, limit: $limit) {
            checkedById
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

const DELIVERY_PROCESS_BOOK = gql`
    query DeliveryProcessBook($input: DeliveryProcessBookInput) {
        deliveryProcessBook(input: $input) {
            items {
                deliveryProcessId
                voucherNumber
                voucherDateText
                billFromDateText
                billToDateText
                deliveryById
                deliveryByName
                otherText
                tripNumber
                noOfBills
                receivedCount
                isCancelled
            }
            totalCount
        }
    }
`;

const DELIVERY_PROCESS_LINES = gql`
    query DeliveryProcessLines($deliveryProcessId: Int!, $orderByBillNo: Boolean) {
        deliveryProcessLines(deliveryProcessId: $deliveryProcessId, orderByBillNo: $orderByBillNo) {
            deliveryProcessLineId
            saleInvoiceId
            billNumber
            billDateText
            ledgerName
            billAmount
            deliveryStatusId
            deliveryStatusName
            checkedById
            checkedByName
            remarkText
        }
    }
`;

const CREATE_DELIVERY_PROCESS = gql`
    mutation CreateDeliveryProcess($input: DeliveryProcessEntryInput!) {
        createDeliveryProcess(input: $input) {
            deliveryProcessId
        }
    }
`;

const UPDATE_DELIVERY_PROCESS = gql`
    mutation UpdateDeliveryProcess($input: DeliveryProcessEntryInput!) {
        updateDeliveryProcess(input: $input) {
            deliveryProcessId
        }
    }
`;

const CANCEL_DELIVERY_PROCESS = gql`
    mutation CancelDeliveryProcess($deliveryProcessId: Int!, $cancelled: Boolean) {
        cancelDeliveryProcess(deliveryProcessId: $deliveryProcessId, cancelled: $cancelled)
    }
`;

const toOptionList = (
    rows: LookupRow[],
    idKey: 'deliveryById' | 'deliveryStatusId' | 'checkedById',
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

const emptyForm = (dateSeed: Date | null = new Date()): DeliveryProcessForm => ({
    voucherNumber: '',
    voucherDate: dateSeed,
    billFromDate: null,
    billToDate: null,
    deliveryById: null,
    otherText: '',
    tripNumber: '',
    lines: []
});

const DataTableAny = AppDataTable as any;

export default function BillingDeliveryProcessPage() {
    const toast = useRef<Toast>(null);
    const { companyContext } = useAuth();

    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [deliveryByFilter, setDeliveryByFilter] = useState<number | null>(null);
    const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<number | null>(null);
    const [checkedByFilter, setCheckedByFilter] = useState<number | null>(null);
    const [otherTextFilter, setOtherTextFilter] = useState('');
    const [cancelled, setCancelledFilter] = useState<-1 | 0 | 1>(-1);
    const [pendingOnly, setPendingOnly] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<DeliveryProcessHeaderRow | null>(null);
    const [form, setForm] = useState<DeliveryProcessForm>(emptyForm());
    const [formErrors, setFormErrors] = useState<DeliveryProcessFormErrors>({});
    const [invoiceToAddId, setInvoiceToAddId] = useState<number | null>(null);
    const [selectedRegisterRow, setSelectedRegisterRow] = useState<DeliveryProcessHeaderRow | null>(null);

    const fromDate = toDateText(dateRange[0]);
    const toDate = toDateText(dateRange[1]);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const refreshButtonId = 'delivery-process-refresh';
    const canRefresh = Boolean(fromDate && toDate);

    const { data: deliveryByData } = useQuery<{ deliveryBy: LookupRow[] }>(DELIVERY_BY, {
        variables: { search: null, limit: 2000 }
    });
    const { data: deliveryStatusData } = useQuery<{ deliveryStatuses: LookupRow[] }>(DELIVERY_STATUSES, {
        variables: { search: null, limit: 2000 }
    });
    const { data: checkedByData } = useQuery<{ checkedBy: LookupRow[] }>(CHECKED_BY, {
        variables: { search: null, limit: 2000 }
    });

    const deliveryByOptions = useMemo(
        () => toOptionList(deliveryByData?.deliveryBy ?? [], 'deliveryById', 'Delivery By'),
        [deliveryByData?.deliveryBy]
    );
    const deliveryStatusOptions = useMemo(
        () => toOptionList(deliveryStatusData?.deliveryStatuses ?? [], 'deliveryStatusId', 'Status'),
        [deliveryStatusData?.deliveryStatuses]
    );
    const checkedByOptions = useMemo(
        () => toOptionList(checkedByData?.checkedBy ?? [], 'checkedById', 'Checked By'),
        [checkedByData?.checkedBy]
    );

    const registerVariables = useMemo(
        () => ({
            input: {
                fromDate,
                toDate,
                deliveryById: deliveryByFilter ?? null,
                deliveryStatusId: deliveryStatusFilter ?? null,
                checkedById: checkedByFilter ?? null,
                cancelled,
                receivedPendingOnly: pendingOnly,
                otherText: trimToNull(otherTextFilter)
            }
        }),
        [cancelled, checkedByFilter, deliveryByFilter, deliveryStatusFilter, fromDate, otherTextFilter, pendingOnly, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const {
        data: registerData,
        loading: registerLoading,
        error: registerError,
        refetch: refetchRegister
    } = useQuery<{ deliveryProcessBook: { items: DeliveryProcessHeaderRow[] } }>(DELIVERY_PROCESS_BOOK, {
        client: billingApolloClient,
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const registerRows = useMemo<DeliveryProcessHeaderRow[]>(
        () => (hasApplied ? registerData?.deliveryProcessBook?.items ?? [] : []),
        [hasApplied, registerData?.deliveryProcessBook?.items]
    );

    const selectedDeliveryProcessId = selectedRegisterRow?.deliveryProcessId ?? 0;
    const {
        data: selectedLinesData,
        loading: selectedLinesLoading,
        error: selectedLinesError,
        refetch: refetchSelectedLines
    } = useQuery<{ deliveryProcessLines: DeliveryProcessLineRow[] }>(DELIVERY_PROCESS_LINES, {
        client: billingApolloClient,
        variables: { deliveryProcessId: selectedDeliveryProcessId, orderByBillNo: true },
        skip: !selectedRegisterRow,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const selectedLines = useMemo<DeliveryProcessLineRow[]>(
        () => selectedLinesData?.deliveryProcessLines ?? [],
        [selectedLinesData?.deliveryProcessLines]
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

    const [createDeliveryProcess, { loading: creating }] = useMutation(CREATE_DELIVERY_PROCESS, {
        client: billingApolloClient
    });
    const [updateDeliveryProcess, { loading: updating }] = useMutation(UPDATE_DELIVERY_PROCESS, {
        client: billingApolloClient
    });
    const [setDeliveryProcessCancelled] = useMutation(CANCEL_DELIVERY_PROCESS, {
        client: billingApolloClient
    });

    const saving = creating || updating;

    const pendingCount = (row: DeliveryProcessHeaderRow) => {
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

    const openEdit = async (row: DeliveryProcessHeaderRow) => {
        setEditingRow(row);
        setForm({
            voucherNumber: row.voucherNumber ?? '',
            voucherDate: parseDateText(row.voucherDateText),
            billFromDate: parseDateText(row.billFromDateText),
            billToDate: parseDateText(row.billToDateText),
            deliveryById: row.deliveryById,
            otherText: row.otherText ?? '',
            tripNumber: row.tripNumber ?? '',
            lines: []
        });
        setFormErrors({});
        setInvoiceToAddId(null);
        setDialogOpen(true);

        try {
            const { data } = await billingApolloClient.query<{ deliveryProcessLines: DeliveryProcessLineRow[] }>({
                query: DELIVERY_PROCESS_LINES,
                variables: { deliveryProcessId: row.deliveryProcessId, orderByBillNo: true },
                fetchPolicy: 'network-only'
            });
            const lines = data?.deliveryProcessLines ?? [];
            setForm((prev) => ({
                ...prev,
                lines: lines
                    .filter((line) => line.saleInvoiceId != null)
                    .map((line) => ({
                        saleInvoiceId: Number(line.saleInvoiceId),
                        billNumber: line.billNumber ?? `#${line.saleInvoiceId}`,
                        billDateText: line.billDateText ?? null,
                        ledgerName: line.ledgerName ?? null,
                        billAmount: Number(line.billAmount ?? 0),
                        deliveryStatusId: line.deliveryStatusId ?? null,
                        checkedById: line.checkedById ?? null,
                        remarkText: line.remarkText ?? ''
                    }))
            }));
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error?.message ?? 'Failed to load delivery process lines.'
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
                    label: `${row.voucherNumber ?? row.saleInvoiceId} | ${row.ledgerName ?? 'Party'} | ${formatAmount(Number(row.totalNetAmount ?? 0))}`
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
                    billAmount: Number(invoice.totalNetAmount ?? 0),
                    deliveryStatusId: null,
                    checkedById: null,
                    remarkText: ''
                }
            ]
        }));
        setInvoiceToAddId(null);
    };

    const updateLine = <K extends keyof DeliveryProcessLineForm>(
        saleInvoiceId: number,
        key: K,
        value: DeliveryProcessLineForm[K]
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
        const nextErrors: DeliveryProcessFormErrors = {};

        const voucherDateValidation = validateSingleDate({ date: form.voucherDate }, fiscalRange);
        if (!voucherDateValidation.ok) {
            nextErrors.voucherDate = voucherDateValidation.errors.date ?? 'Voucher date is required';
        }

        if (!form.deliveryById) {
            nextErrors.deliveryById = 'Delivery by is required';
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
            deliveryProcessId: editingRow?.deliveryProcessId ?? undefined,
            voucherNumber: trimToNull(form.voucherNumber),
            voucherDateText: toDateText(form.voucherDate),
            billFromDateText: toDateText(form.billFromDate),
            billToDateText: toDateText(form.billToDate),
            deliveryById: form.deliveryById,
            otherText: trimToNull(form.otherText),
            tripNumber: trimToNull(form.tripNumber),
            lines: form.lines.map((line) => ({
                saleInvoiceId: line.saleInvoiceId,
                deliveryStatusId: line.deliveryStatusId,
                checkedById: line.checkedById,
                remarkText: trimToNull(line.remarkText)
            }))
        };

        try {
            if (editingRow) {
                await updateDeliveryProcess({ variables: { input } });
            } else {
                await createDeliveryProcess({ variables: { input } });
            }

            toast.current?.show({
                severity: 'success',
                summary: editingRow ? 'Updated' : 'Saved',
                detail: editingRow ? 'Delivery process updated.' : 'Delivery process created.'
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

    const toggleCancelled = (row: DeliveryProcessHeaderRow, nextCancelled: boolean) => {
        confirmDialog({
            message: nextCancelled
                ? `Cancel delivery process #${row.voucherNumber ?? row.deliveryProcessId}?`
                : `Uncancel delivery process #${row.voucherNumber ?? row.deliveryProcessId}?`,
            header: nextCancelled ? 'Cancel Delivery Process' : 'Uncancel Delivery Process',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            accept: async () => {
                try {
                    await setDeliveryProcessCancelled({
                        variables: { deliveryProcessId: row.deliveryProcessId, cancelled: nextCancelled }
                    });
                    await refetchRegister();
                    if (selectedRegisterRow?.deliveryProcessId === row.deliveryProcessId) {
                        await refetchSelectedLines();
                    }
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Saved',
                        detail: nextCancelled ? 'Delivery process cancelled.' : 'Delivery process restored.'
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

    const statusBody = (row: DeliveryProcessHeaderRow) => (
        <Tag value={row.isCancelled ? 'Cancelled' : 'Active'} severity={row.isCancelled ? 'danger' : 'success'} />
    );

    const actionsBody = (row: DeliveryProcessHeaderRow) => (
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

    const lineActionsBody = (line: DeliveryProcessLineForm) => (
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
                        title="Delivery Process"
                        subtitle="Collections transaction register aligned to legacy workflow."
                        rightSlot={
                            <div className="flex align-items-center gap-2">
                                <Button
                                    label="New Delivery Process"
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
                                inputId="delivery-process-from-date"
                                onEnterNext={() => {
                                    const element = document.getElementById('delivery-process-to-date');
                                    if (element instanceof HTMLElement) {
                                        element.focus();
                                        return true;
                                    }
                                    return false;
                                }}
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
                                inputId="delivery-process-to-date"
                            />
                            {dateErrors.toDate ? <small className="p-error">{dateErrors.toDate}</small> : null}
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">Delivery By</label>
                            <AppDropdown
                                value={deliveryByFilter}
                                options={deliveryByOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="All"
                                showClear
                                filter
                                onChange={(event: DropdownChangeEvent) => setDeliveryByFilter((event.value as number) ?? null)}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">Delivery Status</label>
                            <AppDropdown
                                value={deliveryStatusFilter}
                                options={deliveryStatusOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="All"
                                showClear
                                filter
                                onChange={(event: DropdownChangeEvent) =>
                                    setDeliveryStatusFilter((event.value as number) ?? null)
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-sm mb-2">Checked By</label>
                            <AppDropdown
                                value={checkedByFilter}
                                options={checkedByOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="All"
                                showClear
                                filter
                                onChange={(event: DropdownChangeEvent) => setCheckedByFilter((event.value as number) ?? null)}
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
                                inputId="delivery-process-pending-only"
                                checked={pendingOnly}
                                onChange={(event) => setPendingOnly(Boolean(event.checked))}
                            />
                            <label htmlFor="delivery-process-pending-only">Pending Bills Only</label>
                        </div>
                    </div>

                    {registerError ? (
                        <p className="text-red-500 m-0 mt-2">Error loading delivery process register: {registerError.message}</p>
                    ) : null}

                    <DataTableAny
                        value={registerRows}
                        loading={registerLoading}
                        dataKey="deliveryProcessId"
                        paginator
                        rows={20}
                        rowsPerPageOptions={[20, 50, 100, 200]}
                        responsiveLayout="scroll"
                        emptyMessage={hasApplied ? 'No delivery process entries found.' : 'Set filters and click Refresh.'}
                        className="mt-3"
                        onRowClick={(event: any) => setSelectedRegisterRow(event.data as DeliveryProcessHeaderRow)}
                        recordSummary={hasApplied ? `${registerRows.length} entries` : undefined}
                    >
                        <Column field="voucherNumber" header="Voucher" style={{ minWidth: '8rem' }} />
                        <Column
                            field="voucherDateText"
                            header="Date"
                            body={(row: DeliveryProcessHeaderRow) => formatDateText(row.voucherDateText)}
                            style={{ minWidth: '8rem' }}
                        />
                        <Column
                            header="Bill Range"
                            body={(row: DeliveryProcessHeaderRow) => {
                                const from = formatDateText(row.billFromDateText);
                                const to = formatDateText(row.billToDateText);
                                if (!from && !to) return '-';
                                return `${from || '-'} - ${to || '-'}`;
                            }}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column field="deliveryByName" header="Delivery By" style={{ minWidth: '10rem' }} />
                        <Column field="tripNumber" header="Trip No." style={{ minWidth: '8rem' }} />
                        <Column
                            header="Bills"
                            body={(row: DeliveryProcessHeaderRow) => Number(row.noOfBills ?? 0)}
                            style={{ width: '6rem' }}
                            bodyClassName="text-right"
                            headerClassName="text-right"
                        />
                        <Column
                            header="Received"
                            body={(row: DeliveryProcessHeaderRow) => Number(row.receivedCount ?? 0)}
                            style={{ width: '7rem' }}
                            bodyClassName="text-right"
                            headerClassName="text-right"
                        />
                        <Column
                            header="Pending"
                            body={(row: DeliveryProcessHeaderRow) => pendingCount(row)}
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
                                Lines: #{selectedRegisterRow.voucherNumber ?? selectedRegisterRow.deliveryProcessId}
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
                            dataKey="deliveryProcessLineId"
                            responsiveLayout="scroll"
                            emptyMessage="No bills available for this entry."
                        >
                            <Column field="billNumber" header="Bill No." style={{ minWidth: '8rem' }} />
                            <Column
                                field="billDateText"
                                header="Bill Date"
                                body={(row: DeliveryProcessLineRow) => formatDateText(row.billDateText)}
                                style={{ minWidth: '8rem' }}
                            />
                            <Column field="ledgerName" header="Party" style={{ minWidth: '14rem' }} />
                            <Column
                                field="billAmount"
                                header="Bill Amount"
                                body={(row: DeliveryProcessLineRow) => formatAmount(Number(row.billAmount ?? 0))}
                                style={{ minWidth: '8rem' }}
                                bodyClassName="text-right"
                                headerClassName="text-right"
                            />
                            <Column field="deliveryStatusName" header="Delivery Status" style={{ minWidth: '10rem' }} />
                            <Column field="checkedByName" header="Checked By" style={{ minWidth: '10rem' }} />
                            <Column field="remarkText" header="Remark" style={{ minWidth: '14rem' }} />
                        </DataTableAny>
                    </div>
                </div>
            ) : null}

            <Dialog
                visible={dialogOpen}
                onHide={closeDialog}
                header={editingRow ? 'Edit Delivery Process' : 'New Delivery Process'}
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
                            inputId="delivery-process-form-voucher-date"
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
                    <div className="field col-12 md:col-4">
                        <label className="mb-2 block">Delivery By *</label>
                        <AppDropdown
                            value={form.deliveryById}
                            options={deliveryByOptions}
                            optionLabel="label"
                            optionValue="value"
                            filter
                            placeholder="Select delivery by"
                            className="w-full"
                            onChange={(event: DropdownChangeEvent) => {
                                setForm((prev) => ({ ...prev, deliveryById: (event.value as number) ?? null }));
                                setFormErrors((prev) => ({ ...prev, deliveryById: undefined }));
                            }}
                        />
                        {formErrors.deliveryById ? <small className="p-error">{formErrors.deliveryById}</small> : null}
                    </div>
                    <div className="field col-12 md:col-4">
                        <label className="mb-2 block">Trip Number</label>
                        <AppInput
                            value={form.tripNumber}
                            onChange={(event) => setForm((prev) => ({ ...prev, tripNumber: event.target.value }))}
                            className="w-full"
                        />
                    </div>
                    <div className="field col-12 md:col-4">
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
                        body={(line: DeliveryProcessLineForm) => formatDateText(line.billDateText)}
                        style={{ minWidth: '8rem' }}
                    />
                    <Column field="ledgerName" header="Party" style={{ minWidth: '14rem' }} />
                    <Column
                        field="billAmount"
                        header="Bill Amount"
                        body={(line: DeliveryProcessLineForm) => formatAmount(Number(line.billAmount ?? 0))}
                        style={{ minWidth: '8rem' }}
                        bodyClassName="text-right"
                        headerClassName="text-right"
                    />
                    <Column
                        header="Delivery Status"
                        style={{ minWidth: '11rem' }}
                        body={(line: DeliveryProcessLineForm) => (
                            <AppDropdown
                                value={line.deliveryStatusId}
                                options={deliveryStatusOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Status"
                                className="w-full"
                                onChange={(event: DropdownChangeEvent) =>
                                    updateLine(line.saleInvoiceId, 'deliveryStatusId', (event.value as number) ?? null)
                                }
                            />
                        )}
                    />
                    <Column
                        header="Checked By"
                        style={{ minWidth: '11rem' }}
                        body={(line: DeliveryProcessLineForm) => (
                            <AppDropdown
                                value={line.checkedById}
                                options={checkedByOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Checked by"
                                className="w-full"
                                onChange={(event: DropdownChangeEvent) =>
                                    updateLine(line.saleInvoiceId, 'checkedById', (event.value as number) ?? null)
                                }
                            />
                        )}
                    />
                    <Column
                        header="Remark"
                        style={{ minWidth: '14rem' }}
                        body={(line: DeliveryProcessLineForm) => (
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
