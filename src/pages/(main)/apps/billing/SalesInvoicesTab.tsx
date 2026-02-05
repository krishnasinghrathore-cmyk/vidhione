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
import type { SaleInvoice, SaleInvoiceLine, SaleInvoiceListItem } from '@/lib/invoicing/api';
import * as invoicingApi from '@/lib/invoicing/api';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate } from '@/lib/reportDateValidation';
import { formatAmount, formatVoucherDate, makeKey, toDateText } from './helpers';
import { getSalesProfileFlags, type SalesInvoiceProfileKey } from './salesProfile';
import type { LedgerLookupResult } from './useLedgerLookup';

type LineDraft = {
    key: string;
    itemText: string;
    quantity: number | null;
    unitPrice: number | null;
    sellingRate: number | null;
    taxRate: number | null;
};

type DraftGroup = {
    key: string;
    title: string;
    lines: LineDraft[];
};

type Props = {
    salesProfileKey: SalesInvoiceProfileKey;
    ledgerLookup: LedgerLookupResult;
};

export function SalesInvoicesTab({ salesProfileKey, ledgerLookup }: Props) {
    const { companyContext } = useAuth();
    const { isGstProfile, isRestaurantProfile, isSplitProfile, taxLocked, showTax, showSellingRate } =
        getSalesProfileFlags(salesProfileKey);
    const { ledgerById, ledgerOptions, loading: ledgerLoading, error: ledgerError } = ledgerLookup;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [saleInvoices, setSaleInvoices] = useState<SaleInvoiceListItem[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [voucherNumber, setVoucherNumber] = useState('');
    const [partyLedgerId, setPartyLedgerId] = useState<number | null>(null);
    const [partyName, setPartyName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [groups, setGroups] = useState<DraftGroup[]>([]);

    const [viewOpen, setViewOpen] = useState(false);
    const [viewInvoice, setViewInvoice] = useState<SaleInvoice | null>(null);

    const selectedLedger = partyLedgerId ? ledgerById.get(partyLedgerId) ?? null : null;
    const partyNameDisabled = isGstProfile && partyLedgerId != null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const loadSaleInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await invoicingApi.listSaleInvoices();
            setSaleInvoices(res.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, []);

    const openCreate = () => {
        setVoucherDate(new Date());
        setVoucherNumber('');
        setPartyLedgerId(null);
        setPartyName('');
        setTableNumber('');
        setRemarks('');

        const makeLine = (): LineDraft => ({
            key: makeKey(),
            itemText: '',
            quantity: 1,
            unitPrice: null,
            sellingRate: null,
            taxRate: taxLocked ? 0 : 18
        });

        const initialGroups: DraftGroup[] = isSplitProfile
            ? [
                  { key: makeKey(), title: 'Split 1', lines: [makeLine()] },
                  { key: makeKey(), title: 'Split 2', lines: [makeLine()] }
              ]
            : [{ key: makeKey(), title: 'Invoice', lines: [makeLine()] }];

        setGroups(initialGroups);
        setCreateOpen(true);
    };

    const addSplitGroup = () => {
        if (!isSplitProfile) return;
        setGroups((prev) => {
            const makeLine = (): LineDraft => ({
                key: makeKey(),
                itemText: '',
                quantity: 1,
                unitPrice: null,
                sellingRate: null,
                taxRate: taxLocked ? 0 : 18
            });
            return [...prev, { key: makeKey(), title: `Split ${prev.length + 1}`, lines: [makeLine()] }];
        });
    };

    const removeSplitGroup = (groupKey: string) => {
        if (!isSplitProfile) return;
        setGroups((prev) => {
            if (prev.length <= 1) return prev;
            const next = prev.filter((g) => g.key !== groupKey);
            return next.map((g, idx) => ({ ...g, title: `Split ${idx + 1}` }));
        });
    };

    const updateLine = (groupKey: string, lineKey: string, patch: Partial<LineDraft>) => {
        setGroups((prev) =>
            prev.map((g) =>
                g.key === groupKey ? { ...g, lines: g.lines.map((l) => (l.key === lineKey ? { ...l, ...patch } : l)) } : g
            )
        );
    };

    const addLine = (groupKey: string) => {
        setGroups((prev) =>
            prev.map((g) =>
                g.key === groupKey
                    ? {
                          ...g,
                          lines: [
                              ...g.lines,
                              {
                                  key: makeKey(),
                                  itemText: '',
                                  quantity: 1,
                                  unitPrice: null,
                                  sellingRate: null,
                                  taxRate: taxLocked ? 0 : 18
                              }
                          ]
                      }
                    : g
            )
        );
    };

    const removeLine = (groupKey: string, lineKey: string) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.key !== groupKey) return g;
                if (g.lines.length <= 1) return g;
                return { ...g, lines: g.lines.filter((l) => l.key !== lineKey) };
            })
        );
    };

    const computed = useMemo(() => {
        const groupsComputed = groups.map((group) => {
            const linesComputed = group.lines.map((l) => {
                const qty = Number(l.quantity || 0);
                const rate = Number(l.unitPrice || 0);
                const sellingRateValue = l.sellingRate != null ? Number(l.sellingRate) : null;
                const taxRateValue = taxLocked ? 0 : Number(l.taxRate || 0);
                const lineAmount = qty * rate;
                const taxAmount = lineAmount * (taxRateValue / 100);
                const finalAmount = lineAmount + taxAmount;
                return { ...l, qty, rate, sellingRateValue, taxRateValue, lineAmount, taxAmount, finalAmount };
            });

            const totalAmount = linesComputed.reduce((sum, l) => sum + l.lineAmount, 0);
            const totalTaxAmount = linesComputed.reduce((sum, l) => sum + l.taxAmount, 0);
            const totalNetAmount = linesComputed.reduce((sum, l) => sum + l.finalAmount, 0);
            return { ...group, lines: linesComputed, totalAmount, totalTaxAmount, totalNetAmount };
        });

        const totalAmount = groupsComputed.reduce((sum, g) => sum + g.totalAmount, 0);
        const totalTaxAmount = groupsComputed.reduce((sum, g) => sum + g.totalTaxAmount, 0);
        const totalNetAmount = groupsComputed.reduce((sum, g) => sum + g.totalNetAmount, 0);

        return { groups: groupsComputed, totalAmount, totalTaxAmount, totalNetAmount };
    }, [groups, taxLocked]);

    const headerRemarks = useMemo(() => {
        const parts: string[] = [];
        if (isRestaurantProfile && tableNumber.trim()) parts.push(`Table:${tableNumber.trim()}`);
        if (remarks.trim()) parts.push(remarks.trim());
        return parts.length ? parts.join(' | ') : null;
    }, [isRestaurantProfile, remarks, tableNumber]);

    const canCreate =
        !!voucherDate &&
        !!partyName.trim() &&
        computed.groups.length > 0 &&
        computed.groups.every((g) => g.lines.length > 0 && g.lines.every((l) => l.qty > 0 && l.rate > 0));

    const createInvoice = async () => {
        const dateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!dateValidation.ok) {
            const message = dateValidation.errors.date ?? 'Voucher date is required';
            setVoucherDateError(message);
            return;
        }
        setVoucherDateError(null);
        if (!canCreate || !voucherDate) return;

        setLoading(true);
        setError(null);
        try {
            const voucherDateText = toDateText(voucherDate);
            const baseVoucherNumber = voucherNumber.trim() ? voucherNumber.trim() : null;
            const ledgerId = partyLedgerId;
            const ledgerName = partyName.trim() ? partyName.trim() : null;

            const invoices = computed.groups.map((group, idx) => {
                const splitSuffix = isSplitProfile && baseVoucherNumber ? `-${idx + 1}` : '';
                const groupVoucherNumber = baseVoucherNumber ? `${baseVoucherNumber}${splitSuffix}` : null;
                const groupRemarks =
                    isSplitProfile && computed.groups.length > 1
                        ? [headerRemarks, `Split ${idx + 1}/${computed.groups.length}`].filter(Boolean).join(' | ')
                        : headerRemarks;

                return {
                    voucherDateText,
                    voucherNumber: groupVoucherNumber,
                    ledgerId,
                    ledgerName,
                    remarks: groupRemarks,
                    lines: group.lines.map((l) => ({
                        quantity: l.qty,
                        unitPrice: l.rate,
                        sellingRate: l.sellingRateValue,
                        taxRate: taxLocked ? 0 : l.taxRateValue,
                        remarks: l.itemText.trim() ? l.itemText.trim() : null
                    }))
                };
            });

            if (invoices.length > 1) {
                await invoicingApi.createSaleInvoicesBatch({ invoices });
            } else {
                await invoicingApi.createSaleInvoice(invoices[0]);
            }

            setCreateOpen(false);
            await loadSaleInvoices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
        } finally {
            setLoading(false);
        }
    };

    const openInvoice = async (saleInvoiceId: number) => {
        setViewOpen(true);
        setViewInvoice(null);
        setLoading(true);
        setError(null);
        try {
            const res = await invoicingApi.getSaleInvoice(saleInvoiceId);
            setViewInvoice(res.invoice);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoice');
            setViewOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const titleForParty = isRestaurantProfile ? 'Customer Name' : isGstProfile ? 'Party Ledger' : 'Party Name';

    return (
        <>
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mt-4">
                <div>
                    <h3 className="m-0">Sales Invoices</h3>
                    <p className="mt-2 mb-0 text-500">Create and view sales invoices.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-content-end">
                    <Button icon="pi pi-refresh" label="Refresh" outlined onClick={loadSaleInvoices} disabled={loading} />
                    <Button icon="pi pi-plus" label="New Sales Invoice" onClick={openCreate} disabled={loading} />
                </div>
            </div>

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}

            <DataTable value={saleInvoices} loading={loading} paginator rows={10} className="mt-3" dataKey="saleInvoiceId" responsiveLayout="scroll">
                <Column field="saleInvoiceId" header="ID" sortable style={{ width: '7rem' }} />
                <Column field="voucherNumber" header="Voucher No" sortable body={(row: SaleInvoiceListItem) => row.voucherNumber || '-'} />
                <Column field="voucherDateText" header="Date" sortable body={(row: SaleInvoiceListItem) => formatVoucherDate(row.voucherDateText)} />
                <Column field="ledgerName" header="Party" sortable body={(row: SaleInvoiceListItem) => row.ledgerName || '-'} />
                <Column
                    field="totalNetAmount"
                    header="Total"
                    sortable
                    body={(row: SaleInvoiceListItem) => formatAmount(Number(row.totalNetAmount || 0))}
                />
                <Column
                    header="Actions"
                    body={(row: SaleInvoiceListItem) => <Button icon="pi pi-eye" label="View" outlined onClick={() => openInvoice(row.saleInvoiceId)} />}
                />
            </DataTable>

            <Dialog
                header="New Sales Invoice"
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
                            <InputText id="voucher-number" value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} />
                            <label htmlFor="voucher-number">Voucher Number (optional)</label>
                        </span>
                    </div>
                    <div className="col-12 md:col-4">
                        {isGstProfile ? (
                            <div className="flex flex-column gap-2">
                                <small className="text-500">{titleForParty}</small>
                                <AppDropdown
                                    value={partyLedgerId}
                                    options={ledgerOptions}
                                    onChange={(e) => {
                                        const nextId = (e.value as number) ?? null;
                                        setPartyLedgerId(nextId);
                                        const ledger = nextId ? ledgerById.get(nextId) ?? null : null;
                                        if (ledger?.name) setPartyName(ledger.name);
                                        if (!nextId) setPartyName('');
                                    }}
                                    placeholder={ledgerLoading ? 'Loading ledgers…' : 'Select party ledger'}
                                    filter
                                    showClear
                                    className="w-full"
                                />
                            </div>
                        ) : (
                            <span className="p-float-label">
                                <InputText id="party-name" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
                                <label htmlFor="party-name">{titleForParty}</label>
                            </span>
                        )}
                    </div>

                    {isGstProfile && (
                        <>
                            <div className="col-12 md:col-6">
                                <span className="p-float-label">
                                    <InputText
                                        id="party-name-readonly"
                                        value={partyName}
                                        disabled={partyNameDisabled}
                                        onChange={(e) => setPartyName(e.target.value)}
                                    />
                                    <label htmlFor="party-name-readonly">Party Name</label>
                                </span>
                            </div>
                            <div className="col-12 md:col-6">
                                <span className="p-float-label">
                                    <InputText id="party-gstin" value={selectedLedger?.gstNumber || ''} disabled />
                                    <label htmlFor="party-gstin">GSTIN (from ledger)</label>
                                </span>
                            </div>
                            <div className="col-12">
                                <div className="text-500 text-sm">
                                    {ledgerError ? 'Ledger lookup failed; you can still type Party Name manually.' : selectedLedger?.address || ''}
                                    {selectedLedger?.cityName ? ` ${selectedLedger.cityName}` : ''}
                                    {selectedLedger?.stateName ? `, ${selectedLedger.stateName}` : ''}
                                </div>
                            </div>
                        </>
                    )}

                    {isRestaurantProfile && (
                        <div className="col-12 md:col-4">
                            <span className="p-float-label">
                                <InputText id="table-number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
                                <label htmlFor="table-number">Table No (optional)</label>
                            </span>
                        </div>
                    )}

                    <div className="col-12">
                        <span className="p-float-label">
                            <InputText id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                            <label htmlFor="remarks">Remarks (optional)</label>
                        </span>
                    </div>

                    <div className="col-12">
                        {isSplitProfile && (
                            <div className="flex justify-content-end">
                                <Button icon="pi pi-plus" label="Add Split" outlined onClick={addSplitGroup} />
                            </div>
                        )}

                        {computed.groups.map((group, groupIdx) => (
                            <div key={group.key} className={groupIdx > 0 ? 'mt-4' : ''}>
                                <div className="flex align-items-center justify-content-between gap-2">
                                    <div className="flex align-items-center gap-2">
                                        <h4 className="m-0">{isSplitProfile ? group.title : 'Lines'}</h4>
                                        {isSplitProfile && (
                                            <Button
                                                icon="pi pi-trash"
                                                severity="danger"
                                                text
                                                tooltip="Remove split"
                                                tooltipOptions={{ position: 'top' }}
                                                onClick={() => removeSplitGroup(group.key)}
                                                disabled={computed.groups.length <= 1}
                                            />
                                        )}
                                    </div>
                                    <Button icon="pi pi-plus" label="Add Line" outlined onClick={() => addLine(group.key)} />
                                </div>

                                <DataTable value={group.lines} dataKey="key" className="mt-3" responsiveLayout="scroll">
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
                                                onChange={(e) => updateLine(group.key, row.key, { itemText: e.target.value })}
                                                placeholder="Item/Service"
                                            />
                                        )}
                                    />
                                    <Column
                                        header="Qty"
                                        body={(row: any) => (
                                            <InputNumber
                                                value={row.quantity}
                                                onValueChange={(e) => updateLine(group.key, row.key, { quantity: e.value ?? null })}
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
                                                onValueChange={(e) => updateLine(group.key, row.key, { unitPrice: e.value ?? null })}
                                                min={0}
                                                minFractionDigits={2}
                                                maxFractionDigits={2}
                                            />
                                        )}
                                        style={{ width: '10rem' }}
                                    />
                                    {showSellingRate && (
                                        <Column
                                            header="Selling Rate"
                                            body={(row: any) => (
                                                <InputNumber
                                                    value={row.sellingRate}
                                                    onValueChange={(e) => updateLine(group.key, row.key, { sellingRate: e.value ?? null })}
                                                    min={0}
                                                    minFractionDigits={2}
                                                    maxFractionDigits={2}
                                                />
                                            )}
                                            style={{ width: '10rem' }}
                                        />
                                    )}
                                    {showTax && (
                                        <Column
                                            header="Tax %"
                                            body={(row: any) => (
                                                <InputNumber
                                                    value={row.taxRateValue}
                                                    onValueChange={(e) => updateLine(group.key, row.key, { taxRate: e.value ?? null })}
                                                    min={0}
                                                    max={100}
                                                    useGrouping={false}
                                                />
                                            )}
                                            style={{ width: '8rem' }}
                                        />
                                    )}
                                    <Column header="Amount" body={(row: any) => <span>{formatAmount(row.lineAmount)}</span>} style={{ width: '9rem' }} />
                                    {showTax && <Column header="Tax" body={(row: any) => <span>{formatAmount(row.taxAmount)}</span>} style={{ width: '8rem' }} />}
                                    <Column header="Total" body={(row: any) => <span className="font-medium">{formatAmount(row.finalAmount)}</span>} style={{ width: '9rem' }} />
                                    <Column
                                        header=""
                                        body={(row: any) => (
                                            <Button
                                                icon="pi pi-trash"
                                                severity="danger"
                                                text
                                                onClick={() => removeLine(group.key, row.key)}
                                                disabled={group.lines.length <= 1}
                                            />
                                        )}
                                        style={{ width: '4rem' }}
                                    />
                                </DataTable>

                                <div className="flex flex-column align-items-end mt-3 gap-1">
                                    <div className="text-600">
                                        Amount: <span className="font-medium">{formatAmount(group.totalAmount)}</span>
                                    </div>
                                    {showTax && (
                                        <div className="text-600">
                                            Tax: <span className="font-medium">{formatAmount(group.totalTaxAmount)}</span>
                                        </div>
                                    )}
                                    <div className="text-600">
                                        Net: <span className="font-bold">{formatAmount(group.totalNetAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {computed.groups.length > 1 && (
                            <div className="flex flex-column align-items-end mt-4 gap-1 border-top-1 surface-border pt-3">
                                <div className="text-600">
                                    Grand Amount: <span className="font-medium">{formatAmount(computed.totalAmount)}</span>
                                </div>
                                {showTax && (
                                    <div className="text-600">
                                        Grand Tax: <span className="font-medium">{formatAmount(computed.totalTaxAmount)}</span>
                                    </div>
                                )}
                                <div className="text-600">
                                    Grand Net: <span className="font-bold">{formatAmount(computed.totalNetAmount)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Dialog>

            <Dialog
                header={viewInvoice ? `Sales Invoice • #${viewInvoice.saleInvoiceId}` : 'Sales Invoice'}
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
                                <div className="text-500 text-sm">Party</div>
                                <div className="font-medium">{viewInvoice.ledgerName || '-'}</div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="text-500 text-sm">Remarks</div>
                                <div className="font-medium">{viewInvoice.remarks || '-'}</div>
                            </div>
                        </div>

                        <DataTable value={viewInvoice.lines} dataKey="saleInvoiceLineId" responsiveLayout="scroll">
                            <Column field="lineNumber" header="#" style={{ width: '4rem' }} />
                            <Column field="quantity" header="Qty" body={(row: SaleInvoiceLine) => row.quantity ?? '-'} />
                            <Column
                                field="unitPrice"
                                header="Rate"
                                body={(row: SaleInvoiceLine) => (row.unitPrice != null ? formatAmount(row.unitPrice) : '-')}
                            />
                            {showSellingRate && (
                                <Column
                                    field="sellingRate"
                                    header="Selling Rate"
                                    body={(row: SaleInvoiceLine) => (row.sellingRate != null ? formatAmount(row.sellingRate) : '-')}
                                />
                            )}
                            {showTax && <Column field="taxRate" header="Tax %" body={(row: SaleInvoiceLine) => row.taxRate ?? '-'} />}
                            <Column
                                field="lineAmount"
                                header="Amount"
                                body={(row: SaleInvoiceLine) => (row.lineAmount != null ? formatAmount(row.lineAmount) : '-')}
                            />
                            {showTax && (
                                <Column
                                    field="taxAmount"
                                    header="Tax"
                                    body={(row: SaleInvoiceLine) => (row.taxAmount != null ? formatAmount(row.taxAmount) : '-')}
                                />
                            )}
                            <Column
                                field="finalAmount"
                                header="Total"
                                body={(row: SaleInvoiceLine) => (row.finalAmount != null ? formatAmount(row.finalAmount) : '-')}
                            />
                            <Column field="remarks" header="Item/Service" body={(row: SaleInvoiceLine) => row.remarks ?? '-'} />
                        </DataTable>

                        <div className="flex flex-column align-items-end mt-1 gap-1">
                            <div className="text-600">
                                Amount: <span className="font-medium">{formatAmount(viewInvoice.totalAmount)}</span>
                            </div>
                            {showTax && (
                                <div className="text-600">
                                    Tax: <span className="font-medium">{formatAmount(viewInvoice.totalTaxAmount)}</span>
                                </div>
                            )}
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
