import React from 'react';
import { formatAmount } from '../../helpers';
import type { InvoiceComputation } from '../types';

type InvoiceTotalFieldsBlockProps = {
    computation: InvoiceComputation;
    taxAddTotal: number;
    taxLessTotal: number;
};

export function InvoiceTotalFieldsBlock({ computation, taxAddTotal, taxLessTotal }: InvoiceTotalFieldsBlockProps) {
    return (
        <div className="invoice-summary-card">
            <h4 className="mt-0 mb-3">Total Fields</h4>
            <div className="grid text-sm">
                <div className="col-6 text-600">Total Qty</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalQuantity)}</div>

                <div className="col-6 text-600">Free</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalFreeQuantity)}</div>

                <div className="col-6 text-600">Qty x Rate</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalQuantityRateAmount)}</div>

                <div className="col-6 text-600">Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalAmount)}</div>

                <div className="col-6 text-600">QPS Dis Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalQpsDiscountAmount)}</div>

                <div className="col-6 text-600">Display Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalDisplayAmount)}</div>

                <div className="col-6 text-600">Scheme Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalProductDiscountAmount)}</div>

                <div className="col-6 text-600">Disc Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalCashDiscountAmount)}</div>

                <div className="col-6 text-600">Less Special Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalLessSpecialAmount)}</div>

                <div className="col-6 text-600">Final Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalFinalAmount)}</div>

                <div className="col-6 text-600">Gross Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalGrossAmount)}</div>

                <div className="col-6 text-600">Tax Add</div>
                <div className="col-6 text-right">{formatAmount(taxAddTotal)}</div>

                <div className="col-6 text-600">Tax Less</div>
                <div className="col-6 text-right">{formatAmount(taxLessTotal)}</div>

                <div className="col-6 text-600">Taxation Amount</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalTaxAmount)}</div>

                <div className="col-6 text-600">Additional Tax</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.totalAdditionalTaxAmount)}</div>

                <div className="col-6 text-600">Round Add/Off</div>
                <div className="col-6 text-right">{formatAmount(computation.totals.roundOffAmount)}</div>
            </div>

            <div className="flex justify-content-between pt-2 border-top-1 surface-border mt-2">
                <span className="font-semibold text-xl text-red-600">Net Amount</span>
                <span className="font-semibold text-xl text-red-600">{formatAmount(computation.totals.totalNetAmount)}</span>
            </div>
        </div>
    );
}
