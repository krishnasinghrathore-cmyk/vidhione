import React from 'react';
import type { InvoiceComputation, TaxSummaryRow } from '../types';
import type { LedgerSummary } from '../../useLedgerLookup';
import { InvoiceTaxSummaryBlock } from './InvoiceTaxSummaryBlock';
import { InvoiceTotalFieldsBlock } from './InvoiceTotalFieldsBlock';

type TaxLedgerOption = {
    label: string;
    value: number;
};

type InvoiceTotalsPanelProps = {
    computation: InvoiceComputation;
    taxSummaryRows: TaxSummaryRow[];
    ledgerById: Map<number, LedgerSummary>;
    taxLedgerOptions?: TaxLedgerOption[];
    loyaltyAppliedAmount?: number;
    giftCertificateAppliedAmount?: number;
    settlementAppliedAmount?: number;
    settlementBalanceAmount?: number;
    settlementExceedsInvoice?: boolean;
    allowTaxLessEdit?: boolean;
    onTaxLessChange: (args: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => void;
    onResetTaxLess?: () => void;
    disabled?: boolean;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function InvoiceTotalsPanel({
    computation,
    taxSummaryRows,
    ledgerById,
    taxLedgerOptions = [],
    loyaltyAppliedAmount = 0,
    giftCertificateAppliedAmount = 0,
    settlementAppliedAmount = 0,
    settlementBalanceAmount = 0,
    settlementExceedsInvoice = false,
    allowTaxLessEdit = false,
    onTaxLessChange,
    onResetTaxLess,
    disabled
}: InvoiceTotalsPanelProps) {
    const taxAddTotal = round2(taxSummaryRows.reduce((sum, row) => sum + Number(row.addAmount ?? 0), 0));
    const taxLessTotal = round2(taxSummaryRows.reduce((sum, row) => sum + Number(row.lessAmount ?? 0), 0));

    return (
        <div className="mt-2 grid invoice-summary-grid">
            <div className="col-12 lg:col-6">
                <InvoiceTaxSummaryBlock
                    taxSummaryRows={taxSummaryRows}
                    ledgerById={ledgerById}
                    taxLedgerOptions={taxLedgerOptions}
                    taxAddTotal={taxAddTotal}
                    taxLessTotal={taxLessTotal}
                    allowTaxLessEdit={allowTaxLessEdit}
                    disabled={disabled}
                    onTaxLessChange={onTaxLessChange}
                    onResetTaxLess={onResetTaxLess}
                />
            </div>

            <div className="col-12 lg:col-6">
                <InvoiceTotalFieldsBlock
                    computation={computation}
                    taxAddTotal={taxAddTotal}
                    taxLessTotal={taxLessTotal}
                    loyaltyAppliedAmount={loyaltyAppliedAmount}
                    giftCertificateAppliedAmount={giftCertificateAppliedAmount}
                    settlementAppliedAmount={settlementAppliedAmount}
                    settlementBalanceAmount={settlementBalanceAmount}
                    settlementExceedsInvoice={settlementExceedsInvoice}
                />
            </div>
        </div>
    );
}
