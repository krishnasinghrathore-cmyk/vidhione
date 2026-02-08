import React from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { formatAmount } from '../../helpers';
import type { InvoiceComputation } from '../types';
import type { LedgerSummary } from '../../useLedgerLookup';

type InvoiceTotalsPanelProps = {
    computation: InvoiceComputation;
    ledgerById: Map<number, LedgerSummary>;
};

export function InvoiceTotalsPanel({ computation, ledgerById }: InvoiceTotalsPanelProps) {
    return (
        <div className="mt-4 grid">
            <div className="col-12 lg:col-6">
                <div className="p-3 border-1 surface-border border-round">
                    <h4 className="mt-0 mb-3">Tax Summary</h4>
                    <DataTable value={computation.taxSummary} dataKey="ledgerId" responsiveLayout="scroll" size="small">
                        <Column
                            header="Ledger"
                            body={(row: { ledgerId: number }) => ledgerById.get(row.ledgerId)?.name || `Ledger ${row.ledgerId}`}
                        />
                        <Column
                            header="Taxable"
                            body={(row: { taxableAmount: number }) => <span>{formatAmount(row.taxableAmount)}</span>}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="Tax"
                            body={(row: { taxAmount: number }) => <span>{formatAmount(row.taxAmount)}</span>}
                            style={{ width: '8rem' }}
                        />
                    </DataTable>
                </div>
            </div>

            <div className="col-12 lg:col-6">
                <div className="p-3 border-1 surface-border border-round">
                    <h4 className="mt-0 mb-3">Totals</h4>
                    <div className="flex justify-content-between mb-2">
                        <span className="text-600">Total Qty</span>
                        <span>{formatAmount(computation.totals.totalQuantity)}</span>
                    </div>
                    <div className="flex justify-content-between mb-2">
                        <span className="text-600">Before Discount</span>
                        <span>{formatAmount(computation.totals.totalBeforeDiscount)}</span>
                    </div>
                    <div className="flex justify-content-between mb-2">
                        <span className="text-600">Discount</span>
                        <span>{formatAmount(computation.totals.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-content-between mb-2">
                        <span className="text-600">Taxable</span>
                        <span>{formatAmount(computation.totals.totalTaxable)}</span>
                    </div>
                    <div className="flex justify-content-between mb-2">
                        <span className="text-600">Tax</span>
                        <span>{formatAmount(computation.totals.totalTax)}</span>
                    </div>
                    <div className="flex justify-content-between pt-2 border-top-1 surface-border">
                        <span className="font-semibold">Net Amount</span>
                        <span className="font-semibold">{formatAmount(computation.totals.totalNetAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
