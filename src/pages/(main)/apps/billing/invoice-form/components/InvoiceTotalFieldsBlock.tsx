import React from 'react';
import { formatAmount } from '../../helpers';
import type { InvoiceComputation } from '../types';

type InvoiceTotalFieldsBlockProps = {
    computation: InvoiceComputation;
    taxAddTotal: number;
    taxLessTotal: number;
};

export function InvoiceTotalFieldsBlock({ computation, taxAddTotal, taxLessTotal }: InvoiceTotalFieldsBlockProps) {
    const totalRows = [
        { label: 'Total Qty', value: computation.totals.totalQuantity },
        { label: 'Free', value: computation.totals.totalFreeQuantity },
        { label: 'Qty x Rate', value: computation.totals.totalQuantityRateAmount },
        { label: 'Amount', value: computation.totals.totalAmount },
        { label: 'QPS Dis Amount', value: computation.totals.totalQpsDiscountAmount },
        { label: 'Display Amount', value: computation.totals.totalDisplayAmount },
        { label: 'Scheme Amount', value: computation.totals.totalProductDiscountAmount },
        { label: 'Disc Amount', value: computation.totals.totalCashDiscountAmount },
        { label: 'Less Special Amount', value: computation.totals.totalLessSpecialAmount },
        { label: 'Final Amount', value: computation.totals.totalFinalAmount },
        { label: 'Gross Amount', value: computation.totals.totalGrossAmount },
        { label: 'Tax Add', value: taxAddTotal },
        { label: 'Tax Less', value: taxLessTotal },
        { label: 'Taxation Amount', value: computation.totals.totalTaxAmount },
        { label: 'Additional Tax', value: computation.totals.totalAdditionalTaxAmount },
        { label: 'Round Add/Off', value: computation.totals.roundOffAmount }
    ];
    const mid = Math.ceil(totalRows.length / 2);
    const firstColumnRows = totalRows.slice(0, mid);
    const secondColumnRows = totalRows.slice(mid);

    return (
        <div className="invoice-summary-card">
            <h4 className="mt-0 mb-3">Total Fields</h4>
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

            <div className="flex justify-content-between pt-2 border-top-1 surface-border mt-2">
                <span className="font-semibold text-xl text-red-600">Net Amount</span>
                <span className="font-semibold text-xl text-red-600">{formatAmount(computation.totals.totalNetAmount)}</span>
            </div>
        </div>
    );
}
