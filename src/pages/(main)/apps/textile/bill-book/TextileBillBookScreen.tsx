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
import { listSaleInvoices, type SaleInvoiceListItem } from '@/lib/invoicing/api';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { formatAmount, formatVoucherDate } from '../../billing/helpers';
import { useTextileLookups } from '../documents/lookups';
import { useTextileSharedAccess } from '../statements/shared';

type TextileBillBookFilters = {
    search: string;
    partyLedgerId: string;
    jobberLedgerId: string;
    fromDate: Date | null;
    toDate: Date | null;
    includeCancelled: boolean;
};

type TextileBillBookRow = SaleInvoiceListItem & Record<string, unknown> & { rowKey: string };

const DEFAULT_FILTERS: TextileBillBookFilters = {
    search: '',
    partyLedgerId: '',
    jobberLedgerId: '',
    fromDate: null,
    toDate: null,
    includeCancelled: false
};

const buildRemarkLabel = (row: SaleInvoiceListItem) => {
    const parts = [row.textileRemarkForStatement, row.remarks]
        .map((value) => value?.trim() || null)
        .filter((value): value is string => Boolean(value));
    return parts.length > 0 ? parts.join(' | ') : '-';
};

export function TextileBillBookScreen() {
    const navigate = useNavigate();
    const { setPageTitle } = useContext(LayoutContext);
    const lookups = useTextileLookups();
    const { isTextileTenant, canAccessSharedReports } = useTextileSharedAccess();
    const [filters, setFilters] = useState<TextileBillBookFilters>(DEFAULT_FILTERS);
    const [rows, setRows] = useState<TextileBillBookRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setPageTitle('Textile Bill Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const loadBook = async (activeFilters: TextileBillBookFilters) => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const result = await listSaleInvoices({
                fromDate: toYmdOrNull(activeFilters.fromDate),
                toDate: toYmdOrNull(activeFilters.toDate),
                ledgerId: activeFilters.partyLedgerId ? Number(activeFilters.partyLedgerId) : null,
                textileJobberLedgerId: activeFilters.jobberLedgerId ? Number(activeFilters.jobberLedgerId) : null,
                search: activeFilters.search.trim() || null,
                includeCancelled: activeFilters.includeCancelled,
                includeProductNames: false,
                limit: 1000,
                offset: 0
            });
            setRows(result.items.map((row) => ({ ...row, rowKey: String(row.saleInvoiceId) })));
        } catch (error: any) {
            setErrorMessage(error.message || 'Unable to load textile bill book');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadBook(DEFAULT_FILTERS);
    }, []);

    const recordSummary = useMemo(() => {
        const totalNet = rows.reduce((sum, row) => sum + Number(row.totalNetAmount ?? 0), 0);
        const totalPaid = rows.reduce((sum, row) => sum + Number(row.paidAmount ?? 0), 0);
        const totalDue = rows.reduce((sum, row) => sum + Number(row.dueAmount ?? 0), 0);
        return `Invoices: ${rows.length} | Net: ${formatAmount(totalNet)} | Paid: ${formatAmount(totalPaid)} | Due: ${formatAmount(totalDue)}`;
    }, [rows]);

    const headerLeft = useMemo(
        () => (
            <>
                <AppInput
                    value={filters.search}
                    placeholder="Search voucher, bill, party, challan, or remarks"
                    style={{ minWidth: '240px' }}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
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
                        inputId="textile-bill-book-cancelled"
                        checked={filters.includeCancelled}
                        onChange={(event) => setFilters((prev) => ({ ...prev, includeCancelled: Boolean(event.checked) }))}
                    />
                    <label htmlFor="textile-bill-book-cancelled">Include cancelled</label>
                </div>
            </>
        ),
        [filters, lookups.ledgerOptions]
    );

    if (!isTextileTenant) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Textile Bill Book</h2>
                <p className="text-600 mb-3">This report is only available when the tenant industry is Textile.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    if (!canAccessSharedReports) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Textile Bill Book</h2>
                <p className="text-600 mb-3">This report is available only for textile tenants with operational textile capabilities enabled.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex align-items-center justify-content-between gap-3 mb-3">
                    <div>
                        <h2 className="m-0">Textile Bill Book</h2>
                        <p className="mt-2 mb-0 text-600">Textile GST invoice register with shared processor and jobwork visibility from the common billing engine.</p>
                    </div>
                    <Button
                        type="button"
                        label="Textile Workspace"
                        className="p-button-text app-action-compact"
                        onClick={() => navigate('/apps/textile')}
                    />
                </div>
            </div>

            {lookups.loading && (
                <div className="col-12">
                    <Message severity="info" text="Loading textile lookup masters for bill-book labels and filters." className="w-full" />
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
                        value={rows}
                        loading={loading}
                        dataKey="rowKey"
                        paginator
                        rows={20}
                        rowsPerPageOptions={[20, 50, 100]}
                        stripedRows
                        size="small"
                        emptyMessage="No textile invoices found for the selected filters."
                        recordSummary={recordSummary}
                        exportFileName="textile-bill-book"
                        headerLeft={headerLeft}
                        headerRight={
                            <>
                                <Button
                                    type="button"
                                    label="Refresh"
                                    icon="pi pi-refresh"
                                    className="p-button-text app-action-compact"
                                    onClick={() => void loadBook(filters)}
                                />
                                <Button
                                    type="button"
                                    label="New GST Invoice"
                                    icon="pi pi-plus"
                                    className="app-action-compact"
                                    onClick={() => navigate('/apps/textile/gst-invoices/new')}
                                />
                            </>
                        }
                    >
                        <Column
                            header="Invoice"
                            body={(row: TextileBillBookRow) => (
                                <div className="flex flex-column gap-1">
                                    <span className="font-medium text-900">{row.voucherNumber || `Invoice ${row.saleInvoiceId}`}</span>
                                    <small className="text-600">{formatVoucherDate(row.voucherDateText)} | Bill {row.billNumber || '-'}</small>
                                </div>
                            )}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Party"
                            body={(row: TextileBillBookRow) => (
                                <div className="flex flex-column gap-1">
                                    <span>{row.ledgerName || '-'}</span>
                                    <small className="text-600">GSTIN {row.ledgerGstin || '-'}</small>
                                </div>
                            )}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Jobber"
                            body={(row: TextileBillBookRow) => {
                                const jobberName = row.textileJobberLedgerId
                                    ? lookups.ledgerNameById.get(String(row.textileJobberLedgerId)) ?? `Ledger ${row.textileJobberLedgerId}`
                                    : '-';
                                return (
                                    <div className="flex flex-column gap-1">
                                        <span>{jobberName}</span>
                                        <small className="text-600">
                                            Challan {row.textileJobberChallanNo || '-'} | {formatVoucherDate(row.textileJobberChallanDateText || null)}
                                        </small>
                                    </div>
                                );
                            }}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Remarks"
                            body={(row: TextileBillBookRow) => buildRemarkLabel(row)}
                            style={{ minWidth: '16rem' }}
                        />
                        <Column
                            header="Amounts"
                            body={(row: TextileBillBookRow) => (
                                <div className="flex flex-column gap-1">
                                    <small>Net: {formatAmount(Number(row.totalNetAmount ?? 0))}</small>
                                    <small>Paid: {formatAmount(Number(row.paidAmount ?? 0))}</small>
                                    <small>Due: {formatAmount(Number(row.dueAmount ?? 0))}</small>
                                </div>
                            )}
                            style={{ width: '11rem' }}
                        />
                        <Column
                            header="Status"
                            body={(row: TextileBillBookRow) => (
                                <div className="flex flex-column gap-2">
                                    <Tag value={row.isCancelled ? 'Cancelled' : 'Open'} severity={row.isCancelled ? 'danger' : 'success'} />
                                    <small className="text-600">{row.deliveryStatus || 'Pending'}</small>
                                </div>
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="Actions"
                            exportable={false}
                            body={(row: TextileBillBookRow) => (
                                <Button
                                    type="button"
                                    label="Open"
                                    className="p-button-text app-action-compact"
                                    onClick={() => navigate(`/apps/textile/gst-invoices/edit/${row.saleInvoiceId}`)}
                                />
                            )}
                            style={{ width: '7rem' }}
                        />
                    </AppDataTable>
                </div>
            </div>
        </div>
    );
}
