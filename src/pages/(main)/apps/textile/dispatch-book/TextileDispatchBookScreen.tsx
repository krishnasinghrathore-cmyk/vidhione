'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { toYmdOrNull } from '@/lib/date';
import { listSaleInvoices } from '@/lib/invoicing/api';
import { listTextileDocuments } from '@/lib/textile/api';
import { buildTextileInvoiceSourceRouteState } from '@/lib/textile/navigation';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { formatAmount, formatVoucherDate } from '../../billing/helpers';
import { useTextileLookups } from '../documents/lookups';
import { formatTextileDate, formatTextileNumber, useTextileSharedAccess } from '../statements/shared';
import {
    buildTextileDispatchRows,
    DEFAULT_TEXTILE_DISPATCH_BOOK_FILTERS,
    TEXTILE_DISPATCH_STAGE_OPTIONS,
    type TextileDispatchBookFilters,
    type TextileDispatchBookRow
} from './model';

const getStageLabel = (stage: TextileDispatchBookRow['stage']) => {
    if (stage === 'packing_slip') return 'Packing Slip';
    if (stage === 'delivery_challan') return 'Delivery Challan';
    return 'GST Invoice';
};

const getStageSeverity = (stage: TextileDispatchBookRow['stage']) => {
    if (stage === 'packing_slip') return 'info';
    if (stage === 'delivery_challan') return 'warning';
    return 'success';
};

const buildFlowLabel = (
    row: TextileDispatchBookRow,
    packingNumbersById: Map<string, string>,
    deliveryNumbersById: Map<string, string>,
    invoiceNumbersById: Map<string, string>
) => {
    if (row.stage === 'packing_slip') {
        const deliveryLabel = row.linkedDeliveryChallanId
            ? deliveryNumbersById.get(row.linkedDeliveryChallanId) ?? `Delivery ${row.linkedDeliveryChallanId.slice(0, 8)}`
            : 'Delivery pending';
        const invoiceLabel = row.linkedSaleInvoiceId
            ? invoiceNumbersById.get(row.linkedSaleInvoiceId) ?? `Invoice ${row.linkedSaleInvoiceId}`
            : 'Invoice pending';
        return `${deliveryLabel} | ${invoiceLabel}`;
    }
    if (row.stage === 'delivery_challan') {
        const packingLabel = row.linkedPackingSlipId
            ? packingNumbersById.get(row.linkedPackingSlipId) ?? `Packing ${row.linkedPackingSlipId.slice(0, 8)}`
            : 'Packing not linked';
        const invoiceLabel = row.linkedSaleInvoiceId
            ? invoiceNumbersById.get(row.linkedSaleInvoiceId) ?? `Invoice ${row.linkedSaleInvoiceId}`
            : 'Invoice pending';
        return `${packingLabel} | ${invoiceLabel}`;
    }
    return row.billNumber ? `Bill ${row.billNumber} | ${row.statusText}` : row.statusText;
};

export function TextileDispatchBookScreen() {
    const navigate = useNavigate();
    const { setPageTitle } = useContext(LayoutContext);
    const lookups = useTextileLookups();
    const { isTextileTenant, capabilities } = useTextileSharedAccess();
    const [filters, setFilters] = useState<TextileDispatchBookFilters>(DEFAULT_TEXTILE_DISPATCH_BOOK_FILTERS);
    const [rows, setRows] = useState<TextileDispatchBookRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setPageTitle('Textile Dispatch Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const loadBook = async (activeFilters: TextileDispatchBookFilters) => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const commonDocumentFilters = {
                partyLedgerId: activeFilters.partyLedgerId || null,
                jobberLedgerId: activeFilters.jobberLedgerId || null,
                fromDate: toYmdOrNull(activeFilters.fromDate),
                toDate: toYmdOrNull(activeFilters.toDate),
                search: activeFilters.search.trim() || null,
                includeCancelled: activeFilters.includeCancelled,
                limit: 300,
                offset: 0
            };
            const [packingSlips, deliveryChallans, invoices] = await Promise.all([
                listTextileDocuments({ ...commonDocumentFilters, documentType: 'packing_slip' }),
                listTextileDocuments({ ...commonDocumentFilters, documentType: 'delivery_challan' }),
                listSaleInvoices({
                    fromDate: commonDocumentFilters.fromDate,
                    toDate: commonDocumentFilters.toDate,
                    ledgerId: activeFilters.partyLedgerId ? Number(activeFilters.partyLedgerId) : null,
                    textileJobberLedgerId: activeFilters.jobberLedgerId ? Number(activeFilters.jobberLedgerId) : null,
                    search: commonDocumentFilters.search,
                    includeCancelled: activeFilters.includeCancelled,
                    includeProductNames: false,
                    limit: 300,
                    offset: 0
                })
            ]);
            setRows(buildTextileDispatchRows(packingSlips, deliveryChallans, invoices.items));
        } catch (error: any) {
            setErrorMessage(error.message || 'Unable to load textile dispatch book');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadBook(DEFAULT_TEXTILE_DISPATCH_BOOK_FILTERS);
    }, []);

    const visibleRows = useMemo(
        () => (filters.stage ? rows.filter((row) => row.stage === filters.stage) : rows),
        [filters.stage, rows]
    );

    const recordSummary = useMemo(() => {
        const totalQuantity = visibleRows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
        const totalAmount = visibleRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
        return `Dispatch rows: ${visibleRows.length} | Qty: ${formatTextileNumber(totalQuantity)} | Amount: ${formatAmount(totalAmount)}`;
    }, [visibleRows]);

    const packingNumbersById = useMemo(
        () => new Map(rows.filter((row) => row.stage === 'packing_slip' && row.textileDocumentId).map((row) => [row.textileDocumentId as string, row.documentNumber])),
        [rows]
    );
    const deliveryNumbersById = useMemo(
        () => new Map(rows.filter((row) => row.stage === 'delivery_challan' && row.textileDocumentId).map((row) => [row.textileDocumentId as string, row.documentNumber])),
        [rows]
    );
    const invoiceNumbersById = useMemo(
        () => new Map(rows.filter((row) => row.stage === 'invoice' && row.saleInvoiceId != null).map((row) => [String(row.saleInvoiceId), row.documentNumber])),
        [rows]
    );

    const openDispatchDocument = (row: TextileDispatchBookRow) => {
        if (row.saleInvoiceId != null) {
            navigate('/apps/textile/gst-invoices/edit/' + row.saleInvoiceId);
            return;
        }
        if (!row.textileDocumentId) return;
        const route = row.stage === 'packing_slip' ? '/apps/textile/packing-slips' : '/apps/textile/delivery-challans';
        navigate(route, { state: { textileDocumentId: row.textileDocumentId } });
    };

    const openDispatchInvoice = (row: TextileDispatchBookRow) => {
        if (row.saleInvoiceId != null) {
            navigate('/apps/textile/gst-invoices/edit/' + row.saleInvoiceId);
            return;
        }

        const linkedSaleInvoiceId = Number(row.linkedSaleInvoiceId ?? NaN);
        if (Number.isFinite(linkedSaleInvoiceId) && linkedSaleInvoiceId > 0) {
            navigate('/apps/textile/gst-invoices/edit/' + linkedSaleInvoiceId);
            return;
        }

        if (!row.textileDocumentId) return;
        if (row.stage !== 'packing_slip' && row.stage !== 'delivery_challan') return;

        navigate('/apps/textile/gst-invoices/new', {
            state: buildTextileInvoiceSourceRouteState({
                textileSourceDocumentId: row.textileDocumentId,
                textileSourceDocumentType: row.stage,
                textileSourceDocumentNumber: row.documentNumber
            })
        });
    };

    const headerLeft = useMemo(
        () => (
            <>
                <AppInput
                    value={filters.search}
                    placeholder="Search document, bill, challan, or remarks"
                    style={{ minWidth: '240px' }}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                />
                <AppDropdown
                    value={filters.stage}
                    options={TEXTILE_DISPATCH_STAGE_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Stage"
                    onChange={(event) => setFilters((prev) => ({ ...prev, stage: (event.value ?? '') as TextileDispatchBookFilters['stage'] }))}
                    style={{ minWidth: '190px' }}
                />
                <AppDropdown
                    value={filters.partyLedgerId || null}
                    options={lookups.ledgerOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Party ledger"
                    filter
                    showClear
                    onChange={(event) => setFilters((prev) => ({ ...prev, partyLedgerId: String(event.value ?? '') }))}
                    style={{ minWidth: '220px' }}
                />
                <AppDropdown
                    value={filters.jobberLedgerId || null}
                    options={lookups.ledgerOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Jobber ledger"
                    filter
                    showClear
                    onChange={(event) => setFilters((prev) => ({ ...prev, jobberLedgerId: String(event.value ?? '') }))}
                    style={{ minWidth: '220px' }}
                />
                <AppDateInput value={filters.fromDate} onChange={(value) => setFilters((prev) => ({ ...prev, fromDate: value }))} />
                <AppDateInput value={filters.toDate} onChange={(value) => setFilters((prev) => ({ ...prev, toDate: value }))} />
                <div className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="textile-dispatch-book-cancelled"
                        checked={filters.includeCancelled}
                        onChange={(event) => setFilters((prev) => ({ ...prev, includeCancelled: Boolean(event.checked) }))}
                    />
                    <label htmlFor="textile-dispatch-book-cancelled">Include cancelled</label>
                </div>
            </>
        ),
        [filters, lookups.ledgerOptions]
    );

    if (!isTextileTenant) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Textile Dispatch Book</h2>
                <p className="text-600 mb-3">This report is only available when the tenant industry is Textile.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    if (!capabilities.processor) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Textile Dispatch Book</h2>
                <p className="text-600 mb-3">This report requires the processor textile capability for the active tenant.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex align-items-center justify-content-between gap-3 mb-3">
                    <div>
                        <h2 className="m-0">Textile Dispatch Book</h2>
                        <p className="mt-2 mb-0 text-600">Combined outward register across packing slips, delivery challans, and textile GST invoices.</p>
                    </div>
                    <Button type="button" label="Textile Workspace" className="p-button-text app-action-compact" onClick={() => navigate('/apps/textile')} />
                </div>
            </div>

            {lookups.loading && (
                <div className="col-12">
                    <Message severity="info" text="Loading textile lookup masters for dispatch labels and filters." className="w-full" />
                </div>
            )}

            {lookups.errorMessages.length > 0 && (
                <div className="col-12">
                    <Message severity="warn" text={lookups.errorMessages.join(' | ')} className="w-full" />
                </div>
            )}

            <div className="col-12">
                <div className="card">
                    {errorMessage && <p className="text-red-500 mt-0 mb-3">{errorMessage}</p>}
                    <AppDataTable
                        value={visibleRows}
                        loading={loading}
                        dataKey="rowKey"
                        paginator
                        rows={20}
                        rowsPerPageOptions={[20, 50, 100]}
                        stripedRows
                        size="small"
                        emptyMessage="No textile dispatch rows found for the selected filters."
                        recordSummary={recordSummary}
                        exportFileName="textile-dispatch-book"
                        headerLeft={headerLeft}
                        headerRight={
                            <Button type="button" label="Refresh" icon="pi pi-refresh" className="p-button-text app-action-compact" onClick={() => void loadBook(filters)} />
                        }
                    >
                        <Column
                            header="Stage / Document"
                            body={(row: TextileDispatchBookRow) => (
                                <div className="flex flex-column gap-2">
                                    <div className="flex align-items-center gap-2">
                                        <Tag value={getStageLabel(row.stage)} severity={getStageSeverity(row.stage)} />
                                        <Tag value={row.isCancelled ? 'Cancelled' : row.statusText} severity={row.isCancelled ? 'danger' : row.statusSeverity} />
                                    </div>
                                    <span className="font-medium text-900">{row.documentNumber}</span>
                                    <small className="text-600">
                                        {row.stage === 'invoice' ? formatVoucherDate(row.documentDateText) : formatTextileDate(row.documentDateText)}
                                    </small>
                                </div>
                            )}
                            style={{ minWidth: '16rem' }}
                        />
                        <Column
                            header="Party"
                            body={(row: TextileDispatchBookRow) =>
                                row.partyLedgerId ? lookups.ledgerNameById.get(row.partyLedgerId) ?? `Ledger ${row.partyLedgerId}` : '-'
                            }
                            style={{ minWidth: '13rem' }}
                        />
                        <Column
                            header="Jobber"
                            body={(row: TextileDispatchBookRow) =>
                                row.jobberLedgerId ? lookups.ledgerNameById.get(row.jobberLedgerId) ?? `Ledger ${row.jobberLedgerId}` : '-'
                            }
                            style={{ minWidth: '13rem' }}
                        />
                        <Column header="Reference" body={(row: TextileDispatchBookRow) => row.referenceLabel} style={{ minWidth: '16rem' }} />
                        <Column
                            header="Flow"
                            body={(row: TextileDispatchBookRow) => buildFlowLabel(row, packingNumbersById, deliveryNumbersById, invoiceNumbersById)}
                            style={{ minWidth: '16rem' }}
                        />
                        <Column
                            header="Totals"
                            body={(row: TextileDispatchBookRow) => (
                                <div className="flex flex-column gap-1">
                                    {row.lineCount > 0 && <small>Lines: {formatTextileNumber(row.lineCount)}</small>}
                                    <small>Qty: {formatTextileNumber(row.quantity)}</small>
                                    <small>Amt: {formatAmount(row.amount)}</small>
                                </div>
                            )}
                            style={{ width: '10rem' }}
                        />
                        <Column
                            header="Actions"
                            exportable={false}
                            body={(row: TextileDispatchBookRow) => (
                                <div className="flex align-items-center gap-2 flex-wrap">
                                    <Button
                                        type="button"
                                        label="Open"
                                        className="p-button-text app-action-compact"
                                        onClick={() => openDispatchDocument(row)}
                                    />
                                    {row.stage !== 'invoice' ? (
                                        <Button
                                            type="button"
                                            label={row.linkedSaleInvoiceId ? 'View Invoice' : 'Create Invoice'}
                                            className="p-button-text app-action-compact"
                                            onClick={() => openDispatchInvoice(row)}
                                        />
                                    ) : null}
                                </div>
                            )}
                            style={{ width: '13rem' }}
                        />
                    </AppDataTable>
                </div>
            </div>
        </div>
    );
}

