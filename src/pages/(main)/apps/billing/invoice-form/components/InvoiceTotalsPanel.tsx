import React from 'react';
import type { InvoiceComputation, TaxSummaryRow } from '../types';
import type { LedgerSummary } from '../../useLedgerLookup';
import { InvoiceTaxSummaryBlock } from './InvoiceTaxSummaryBlock';
import { InvoiceTotalFieldsBlock } from './InvoiceTotalFieldsBlock';

type InvoiceTotalsPanelProps = {
    computation: InvoiceComputation;
    taxSummaryRows: TaxSummaryRow[];
    ledgerById: Map<number, LedgerSummary>;
    onTaxLessChange: (args: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => void;
    onResetTaxLess?: () => void;
    disabled?: boolean;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function InvoiceTotalsPanel({
    computation,
    taxSummaryRows,
    ledgerById,
    onTaxLessChange,
    onResetTaxLess,
    disabled
}: InvoiceTotalsPanelProps) {
    const taxAddTotal = round2(taxSummaryRows.reduce((sum, row) => sum + Number(row.addAmount ?? 0), 0));
    const taxLessTotal = round2(taxSummaryRows.reduce((sum, row) => sum + Number(row.lessAmount ?? 0), 0));
    const taxationAmount = round2(Math.max(0, taxAddTotal - taxLessTotal));

    return (
        <div className="mt-4 grid invoice-summary-grid">
            <div className="col-12 lg:col-6">
                <InvoiceTaxSummaryBlock
                    taxSummaryRows={taxSummaryRows}
                    ledgerById={ledgerById}
                    taxAddTotal={taxAddTotal}
                    taxLessTotal={taxLessTotal}
                    taxationAmount={taxationAmount}
                    disabled={disabled}
                    onTaxLessChange={onTaxLessChange}
                    onResetTaxLess={onResetTaxLess}
                />
            </div>

            <div className="col-12 lg:col-6">
                <InvoiceTotalFieldsBlock computation={computation} taxAddTotal={taxAddTotal} taxLessTotal={taxLessTotal} />
            </div>
        </div>
    );
}
