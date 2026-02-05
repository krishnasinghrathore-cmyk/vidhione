'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import type { PurchaseInvoice, PurchaseInvoiceLine, PurchaseInvoiceListItem } from '@/lib/invoicing/api';
import * as invoicingApi from '@/lib/invoicing/api';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate } from '@/lib/reportDateValidation';
import { formatAmount, formatVoucherDate, makeKey, toDateText } from './helpers';
import type { LedgerLookupResult } from './useLedgerLookup';

type PurchaseLineDraft = {
    key: string;
    itemText: string;
    quantity: number | null;
    unitPrice: number | null;
    taxRate: number | null;
};

type Props = {
    ledgerLookup: LedgerLookupResult;
};

export function PurchaseInvoicesTab({ ledgerLookup }: Props) {
    const { companyContext } = useAuth();
    const { ledgerById, ledgerOptions, loading: ledgerLoading, error: ledgerError } = ledgerLookup;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceListItem[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [voucherNumber, setVoucherNumber] = useState('');
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [remarks, setRemarks] = useState('');
    const [lines, setLines] = useState<PurchaseLineDraft[]>([]);

    const [viewOpen, setViewOpen] = useState(false);
    const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const loadPurchaseInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await invoicingApi.listPurchaseInvoices();
            setPurchaseInvoices(res.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load purchase invoices');
        } finally {
            setLoading(false);
        }
    }, []);

    const openCreate = () => {
        setVoucherDate(new Date());
        setVoucherNumber('');
        setLedgerId(null);
        setRemarks('');
        setLines([{ key: makeKey(), itemText: '', quantity: 1, unitPrice: null, taxRate: 18 }]);
        setCreateOpen(true);
    };

    const computed = useMemo(() => {
        const linesComputed = lines.map((l) => {
            const qty = Number(l.quantity || 0);
            const rate = Number(l.unitPrice || 0);
            const taxRateValue = Number(l.taxRate || 0);
            const lineAmount = qty * rate;
            const taxAmount = lineAmount * (taxRateValue / 100);
            const netAmount = lineAmount + taxAmount;
            return { ...l, qty, rate, taxRateValue, lineAmount, taxAmount, netAmount };
        });
        const totalAmount = linesComputed.reduce((sum, l) => sum + l.lineAmount, 0);
        const totalTaxAmount = linesComputed.reduce((sum, l) => sum + l.taxAmount, 0);
        const totalNetAmount = linesComputed.reduce((sum, l) => sum + l.netAmount, 0);
        return { lines: linesComputed, totalAmount, totalTaxAmount, totalNetAmount };
    }, [lines]);

    const canCreate = !!voucherDate && !!ledgerId && computed.lines.length > 0 && computed.lines.every((l) => l.qty > 0 && l.rate > 0);

    const createInvoice = async () => {
        const dateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!dateValidation.ok) {
            const message = dateValidation.errors.date ?? 'Voucher date is required';
            setVoucherDateError(message);
            return;
        }
        setVoucherDateError(null);
        if (!canCreate || !voucherDate || !ledgerId) return;
        setLoading(true);
        setError(null);
        try {
            await invoicingApi.createPurchaseInvoice({
                voucherDateText: toDateText(voucherDate),
                voucherNumber: voucherNumber.trim() ? voucherNumber.trim() : null,
                ledgerId,
                remarks: remarks.trim() ? remarks.trim() : null,
                lines: computed.lines.map((l) => ({
                    quantity: l.qty,
                    unitPrice: l.rate,
                    taxRate: l.taxRateValue,
                    remarks: l.itemText.trim() ? l.itemText.trim() : null
                }))
            });
            setCreateOpen(false);
            await loadPurchaseInvoices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
        } finally {
            setLoading(false);
        }
    };

    const openInvoice = async (purchaseInvoiceId: number) => {
        setViewOpen(true);
        setViewInvoice(null);
        setLoading(true);
        setError(null);
        try {
            const res = await invoicingApi.getPurchaseInvoice(purchaseInvoiceId);
            setViewInvoice(res.invoice);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load purchase invoice');
            setViewOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mt-4">
                <div>
                    <h3 className="m-0">Purchase Invoices</h3>
                    <p className="mt-2 mb-0 text-500">Common purchase invoice flow for all tenants.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-content-end">
                    <Button icon="pi pi-refresh" label="Refresh" outlined onClick={loadPurchaseInvoices} disabled={loading} />
                    <Button icon="pi pi-plus" label="New Purchase Invoice" onClick={openCreate} disabled={loading} />
                </div>
            </div>

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}

            <DataTable value={purchaseInvoices} loading={loading} paginator rows={10} className="mt-3" dataKey="purchaseInvoiceId" responsiveLayout="scroll">
                <Column field="purchaseInvoiceId" header="ID" sortable style={{ width: '7rem' }} />
                <Column field="voucherNumber" header="Voucher No" sortable body={(row: PurchaseInvoiceListItem) => row.voucherNumber || '-'} />
                <Column field="voucherDateText" header="Date" sortable body={(row: PurchaseInvoiceListItem) => formatVoucherDate(row.voucherDateText)} />
                <Column
                    header="Supplier"
                    body={(row: PurchaseInvoiceListItem) => {
                        if (!row.ledgerId) return '-';
                        const ledger = ledgerById.get(row.ledgerId) ?? null;
                        return ledger?.name || `Ledger ${row.ledgerId}`;
                    }}
                />
                <Column
                    field="totalNetAmount"
                    header="Total"
                    sortable
                    body={(row: PurchaseInvoiceListItem) => formatAmount(Number(row.totalNetAmount || 0))}
                />
                <Column
                    header="Actions"
                    body={(row: PurchaseInvoiceListItem) => (
                        <Button icon="pi pi-eye" label="View" outlined onClick={() => openInvoice(row.purchaseInvoiceId)} />
                    )}
                />
            </DataTable>

            <Dialog
                header="New Purchase Invoice"
                visible={createOpen}
                style={{ width: '52rem' }}
                modal
                onHide={() => setCreateOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={() => setCreateOpen(false)} />
                        <Button label="Create" icon="pi pi-check" disabled={!canCreate || loading} onClick={createInvoice} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <div className="flex flex-column gap-2">
                            <small className="text-500">Voucher Date</small>
                            <AppDateInput
                                value={voucherDate}
                                onChange={(value) => {
                                    setVoucherDate(value);
                                    setVoucherDateError(null);
                                }}
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                            />
                            {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                        </div>
                    </div>
                    <div className="col-12 md:col-4">
                        <span className="p-float-label">
                            <InputText id="purchase-voucher-number" value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} />
                            <label htmlFor="purchase-voucher-number">Voucher Number (optional)</label>
                        </span>
                    </div>
                    <div className="col-12 md:col-4">
                            <div className="flex flex-column gap-2">
                                <small className="text-500">Supplier Ledger</small>
                                <AppDropdown
                                    value={ledgerId}
                                    options={ledgerOptions}
                                    onChange={(e) => setLedgerId((e.value as number) ?? null)}
                                    placeholder={ledgerLoading ? 'Loading ledgers…' : 'Select supplier'}
                                    filter
                                showClear
                                className="w-full"
                            />
                            {ledgerError && (
                                <span className="p-float-label mt-2">
                                    <InputNumber value={ledgerId} onValueChange={(e) => setLedgerId(e.value ?? null)} useGrouping={false} />
                                    <label>Supplier Ledger ID</label>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="col-12">
                        <span className="p-float-label">
                            <InputText id="purchase-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                            <label htmlFor="purchase-remarks">Remarks (optional)</label>
                        </span>
                    </div>

                    <div className="col-12">
                        <div className="flex align-items-center justify-content-between gap-2">
                            <h4 className="m-0">Lines</h4>
                            <Button
                                icon="pi pi-plus"
                                label="Add Line"
                                outlined
                                onClick={() => setLines((prev) => [...prev, { key: makeKey(), itemText: '', quantity: 1, unitPrice: null, taxRate: 18 }])}
                            />
                        </div>

                        <DataTable value={computed.lines} dataKey="key" className="mt-3" responsiveLayout="scroll">
                            <Column
                                header="#"
                                body={(_row: any, opts: any) => <span className="text-500">{(opts.rowIndex ?? 0) + 1}</span>}
                                style={{ width: '3.5rem' }}
                            />
                            <Column
                                header="Item/Service"
                                body={(row: any) => (
                                    <InputText
                                        value={row.itemText}
                                        onChange={(e) => setLines((prev) => prev.map((l) => (l.key === row.key ? { ...l, itemText: e.target.value } : l)))}
                                        placeholder="Item/Service"
                                    />
                                )}
                            />
                            <Column
                                header="Qty"
                                body={(row: any) => (
                                    <InputNumber
                                        value={row.quantity}
                                        onValueChange={(e) => setLines((prev) => prev.map((l) => (l.key === row.key ? { ...l, quantity: e.value ?? null } : l)))}
                                        min={0}
                                        useGrouping={false}
                                    />
                                )}
                                style={{ width: '8.5rem' }}
                            />
                            <Column
                                header="Rate"
                                body={(row: any) => (
                                    <InputNumber
                                        value={row.unitPrice}
                                        onValueChange={(e) => setLines((prev) => prev.map((l) => (l.key === row.key ? { ...l, unitPrice: e.value ?? null } : l)))}
                                        min={0}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                    />
                                )}
                                style={{ width: '10rem' }}
                            />
                            <Column
                                header="Tax %"
                                body={(row: any) => (
                                    <InputNumber
                                        value={row.taxRateValue}
                                        onValueChange={(e) => setLines((prev) => prev.map((l) => (l.key === row.key ? { ...l, taxRate: e.value ?? null } : l)))}
                                        min={0}
                                        max={100}
                                        useGrouping={false}
                                    />
                                )}
                                style={{ width: '8rem' }}
                            />
                            <Column header="Amount" body={(row: any) => <span>{formatAmount(row.lineAmount)}</span>} style={{ width: '9rem' }} />
                            <Column header="Tax" body={(row: any) => <span>{formatAmount(row.taxAmount)}</span>} style={{ width: '8rem' }} />
                            <Column header="Total" body={(row: any) => <span className="font-medium">{formatAmount(row.netAmount)}</span>} style={{ width: '9rem' }} />
                            <Column
                                header=""
                                body={(row: any) => (
                                    <Button
                                        icon="pi pi-trash"
                                        severity="danger"
                                        text
                                        onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== row.key)))}
                                        disabled={lines.length <= 1}
                                    />
                                )}
                                style={{ width: '4rem' }}
                            />
                        </DataTable>

                        <div className="flex flex-column align-items-end mt-3 gap-1">
                            <div className="text-600">
                                Amount: <span className="font-medium">{formatAmount(computed.totalAmount)}</span>
                            </div>
                            <div className="text-600">
                                Tax: <span className="font-medium">{formatAmount(computed.totalTaxAmount)}</span>
                            </div>
                            <div className="text-600">
                                Net: <span className="font-bold">{formatAmount(computed.totalNetAmount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header={viewInvoice ? `Purchase Invoice • #${viewInvoice.purchaseInvoiceId}` : 'Purchase Invoice'}
                visible={viewOpen}
                style={{ width: '52rem' }}
                modal
                onHide={() => {
                    setViewOpen(false);
                    setViewInvoice(null);
                }}
                footer={
                    <div className="flex justify-content-end">
                        <Button
                            label="Close"
                            outlined
                            onClick={() => {
                                setViewOpen(false);
                                setViewInvoice(null);
                            }}
                        />
                    </div>
                }
            >
                {!viewInvoice ? (
                    <div className="p-3 text-500">{loading ? 'Loading…' : 'No invoice loaded'}</div>
                ) : (
                    <div className="flex flex-column gap-3">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <div className="text-500 text-sm">Voucher No</div>
                                <div className="font-medium">{viewInvoice.voucherNumber || '-'}</div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="text-500 text-sm">Date</div>
                                <div className="font-medium">{formatVoucherDate(viewInvoice.voucherDateText)}</div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="text-500 text-sm">Supplier</div>
                                <div className="font-medium">
                                    {viewInvoice.ledgerId ? ledgerById.get(viewInvoice.ledgerId)?.name || `Ledger ${viewInvoice.ledgerId}` : '-'}
                                </div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="text-500 text-sm">Remarks</div>
                                <div className="font-medium">{viewInvoice.remarks || '-'}</div>
                            </div>
                        </div>

                        <DataTable value={viewInvoice.lines} dataKey="purchaseInvoiceLineId" responsiveLayout="scroll">
                            <Column field="lineNumber" header="#" style={{ width: '4rem' }} />
                            <Column field="quantity" header="Qty" body={(row: PurchaseInvoiceLine) => row.quantity ?? '-'} />
                            <Column
                                field="unitPrice"
                                header="Rate"
                                body={(row: PurchaseInvoiceLine) => (row.unitPrice != null ? formatAmount(row.unitPrice) : '-')}
                            />
                            <Column field="taxRate" header="Tax %" body={(row: PurchaseInvoiceLine) => row.taxRate ?? '-'} />
                            <Column
                                field="lineAmount"
                                header="Amount"
                                body={(row: PurchaseInvoiceLine) => (row.lineAmount != null ? formatAmount(row.lineAmount) : '-')}
                            />
                            <Column
                                field="taxAmount"
                                header="Tax"
                                body={(row: PurchaseInvoiceLine) => (row.taxAmount != null ? formatAmount(row.taxAmount) : '-')}
                            />
                            <Column
                                header="Total"
                                body={(row: PurchaseInvoiceLine) => {
                                    const net = Number(row.lineAmount || 0) + Number(row.taxAmount || 0);
                                    return <span className="font-medium">{formatAmount(net)}</span>;
                                }}
                            />
                            <Column field="remarks" header="Item/Service" body={(row: PurchaseInvoiceLine) => row.remarks ?? '-'} />
                        </DataTable>

                        <div className="flex flex-column align-items-end mt-1 gap-1">
                            <div className="text-600">
                                Amount: <span className="font-medium">{formatAmount(viewInvoice.totalAmount)}</span>
                            </div>
                            <div className="text-600">
                                Tax: <span className="font-medium">{formatAmount(viewInvoice.totalTaxAmount)}</span>
                            </div>
                            <div className="text-600">
                                Net: <span className="font-bold">{formatAmount(viewInvoice.totalNetAmount)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
}
