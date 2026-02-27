import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import { formatAmount } from '../../helpers';
import type { TaxSummaryRow } from '../types';
import type { LedgerSummary } from '../../useLedgerLookup';

type InvoiceTaxSummaryBlockProps = {
    taxSummaryRows: TaxSummaryRow[];
    ledgerById: Map<number, LedgerSummary>;
    taxAddTotal: number;
    taxLessTotal: number;
    taxationAmount: number;
    disabled?: boolean;
    onTaxLessChange: (args: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => void;
    onResetTaxLess?: () => void;
};

export function InvoiceTaxSummaryBlock({
    taxSummaryRows,
    ledgerById,
    taxAddTotal,
    taxLessTotal,
    taxationAmount,
    disabled,
    onTaxLessChange,
    onResetTaxLess
}: InvoiceTaxSummaryBlockProps) {
    return (
        <div className="invoice-summary-card">
            <div className="flex align-items-center justify-content-between gap-2 mb-3">
                <h4 className="m-0">Tax Summary</h4>
                <Button
                    type="button"
                    label="Clear Less"
                    text
                    className="app-action-compact"
                    onClick={onResetTaxLess}
                    disabled={disabled || taxSummaryRows.length === 0}
                />
            </div>
            <DataTable value={taxSummaryRows} dataKey="ledgerId" responsiveLayout="scroll" size="small">
                <Column
                    header="Tax"
                    body={(row: { ledgerId: number }) => ledgerById.get(row.ledgerId)?.name || `Ledger ${row.ledgerId}`}
                />
                <Column
                    header="Add"
                    body={(row: { addAmount: number }) => <span>{formatAmount(row.addAmount)}</span>}
                    style={{ width: '8rem' }}
                />
                <Column
                    header="Less"
                    body={(row: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => (
                        <InputNumber
                            value={row.lessAmount}
                            onValueChange={(event) =>
                                onTaxLessChange({
                                    ledgerId: row.ledgerId,
                                    lessAmount: Number(event.value ?? 0),
                                    addAmount: Number(row.addAmount ?? 0),
                                    taxableAmount: Number(row.taxableAmount ?? 0)
                                })
                            }
                            className="w-full"
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            disabled={disabled}
                        />
                    )}
                    style={{ width: '8rem' }}
                />
            </DataTable>

            <div className="grid text-sm mt-3">
                <div className="col-6 text-600">Total Add</div>
                <div className="col-6 text-right">{formatAmount(taxAddTotal)}</div>
                <div className="col-6 text-600">Total Less</div>
                <div className="col-6 text-right">{formatAmount(taxLessTotal)}</div>
                <div className="col-6 text-600 font-medium">Taxation Amount</div>
                <div className="col-6 text-right font-medium">{formatAmount(taxationAmount)}</div>
            </div>
        </div>
    );
}
