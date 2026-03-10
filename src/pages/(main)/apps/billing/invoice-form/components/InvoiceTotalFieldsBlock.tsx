import React from 'react';
import { formatAmount } from '../../helpers';
import type { InvoiceComputation } from '../types';

type InvoiceTotalFieldsBlockProps = {
    computation: InvoiceComputation;
    taxAddTotal: number;
    taxLessTotal: number;
    loyaltyAppliedAmount?: number;
    giftCertificateAppliedAmount?: number;
    settlementAppliedAmount?: number;
    settlementBalanceAmount?: number;
    settlementExceedsInvoice?: boolean;
};

export function InvoiceTotalFieldsBlock({
    computation,
    taxAddTotal,
    taxLessTotal,
    loyaltyAppliedAmount = 0,
    giftCertificateAppliedAmount = 0,
    settlementAppliedAmount = 0,
    settlementBalanceAmount = 0,
    settlementExceedsInvoice = false
}: InvoiceTotalFieldsBlockProps) {
    const totalRows = [
        { label: 'Total Qty', value: computation.totals.totalQuantity },
        { label: 'Free Qty', value: computation.totals.totalFreeQuantity },
        { label: 'Qty x Rate', value: computation.totals.totalQuantityRateAmount },
        { label: 'Amount', value: computation.totals.totalAmount },
        { label: 'QPS Dis Amount', value: computation.totals.totalQpsDiscountAmount },
        { label: 'Scheme Amount', value: computation.totals.totalProductDiscountAmount },
        { label: 'Disc Amount', value: computation.totals.totalCashDiscountAmount },
        { label: 'Final Amount', value: computation.totals.totalFinalAmount },
        { label: 'Gross Amount', value: computation.totals.totalGrossAmount },
        { label: 'Tax Add', value: taxAddTotal },
        { label: 'Tax Less', value: taxLessTotal },
        { label: 'Taxation Amount', value: computation.totals.totalTaxAmount },
        { label: 'Additional Tax', value: computation.totals.totalAdditionalTaxAmount },
        { label: 'Round Add/Off', value: computation.totals.roundOffAmount },
        { label: 'Loyalty Applied', value: loyaltyAppliedAmount },
        { label: 'Gift Applied', value: giftCertificateAppliedAmount },
        { label: 'Settlement Total', value: settlementAppliedAmount },
        { label: 'Balance After Settle', value: settlementBalanceAmount }
    ];
    const mid = Math.ceil(totalRows.length / 2);
    const firstColumnRows = totalRows.slice(0, mid);
    const secondColumnRows = totalRows.slice(mid);

    return (
        <div className="invoice-summary-card invoice-summary-card--compact">
            <h4 className="mt-0 mb-2 invoice-summary-card__title">Total Fields</h4>
            <div className="invoice-total-fields-grid text-sm">
                <div className="invoice-total-fields-grid__column">
                    {firstColumnRows.map((row) => (
                        <div key={row.label} className="invoice-total-fields-grid__row">
                            <span className="invoice-total-fields-grid__label">{row.label}</span>
                            <span className="invoice-total-fields-grid__value">{formatAmount(row.value)}</span>
                        </div>
                    ))}
                </div>
                <div className="invoice-total-fields-grid__column">
                    {secondColumnRows.map((row) => (
                        <div key={row.label} className="invoice-total-fields-grid__row">
                            <span className="invoice-total-fields-grid__label">{row.label}</span>
                            <span className="invoice-total-fields-grid__value">{formatAmount(row.value)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="invoice-total-fields-net">
                <span className="invoice-total-fields-net__label">Net Amount</span>
                <span className="invoice-total-fields-net__value">{formatAmount(computation.totals.totalNetAmount)}</span>
            </div>

            {settlementExceedsInvoice ? (
                <div className="text-red-500 text-sm mt-2">
                    Applied settlements exceed the invoice amount by{' '}
                    {formatAmount(settlementAppliedAmount - computation.totals.totalNetAmount)}.
                </div>
            ) : null}
        </div>
    );
}
