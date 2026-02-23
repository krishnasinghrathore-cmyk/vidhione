'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { formatReportLoadDuration, useReportLoadTime } from '@/lib/reportLoadTime';
import type { VoucherViewProps } from '../useVoucherState';
import { formatAmountWithCurrency } from '../utils';

type VoucherTableActionsProps = {
    viewProps: VoucherViewProps;
};

export function VoucherTableActions({ viewProps }: VoucherTableActionsProps) {
    const {
        totals,
        receiptRegisterTotals,
        voucherProfileKey,
        paymentMode,
        printMenuItems,
        printMenuRef,
        refreshButtonId,
        handleRefresh,
        voucherActions,
        loading,
        registerQueryLoading,
        pageIndexLoading,
        activePageIndexLoadMs,
        lastPageIndexLoadMs
    } = viewProps;
    const { activeLoadMs, lastLoadMs } = useReportLoadTime({
        loadingState: registerQueryLoading,
        enabled: true
    });
    const loadSummaryText = loading && activeLoadMs != null
        ? `Load: ${formatReportLoadDuration(activeLoadMs)} (loading...)`
        : lastLoadMs != null
            ? `Load: ${formatReportLoadDuration(lastLoadMs)}`
            : null;
    const pageLoadSummaryText = pageIndexLoading && loading && activePageIndexLoadMs != null
        ? `Page: ${formatReportLoadDuration(activePageIndexLoadMs)} (loading...)`
        : lastPageIndexLoadMs != null
            ? `Page: ${formatReportLoadDuration(lastPageIndexLoadMs)}`
            : null;
    const isReceiptRegister = voucherProfileKey === 'receipt' && (paymentMode === 'cash' || paymentMode === 'bank');
    const showChequeReturnStatusTotal = Boolean(receiptRegisterTotals && Number(receiptRegisterTotals.chequeReturnCount) > 0);
    const receiptTotals = receiptRegisterTotals
        ? [
              { label: 'Total Amt', value: formatAmountWithCurrency(receiptRegisterTotals.totalAmount) },
              { label: 'Discount', value: formatAmountWithCurrency(receiptRegisterTotals.discountAmount) },
              { label: 'Net Amt', value: formatAmountWithCurrency(receiptRegisterTotals.netAmount) },
              { label: 'Adjusted Amt', value: formatAmountWithCurrency(receiptRegisterTotals.adjustedAmount) },
              { label: 'Diff Amt', value: formatAmountWithCurrency(receiptRegisterTotals.diffAmount) },
              ...(showChequeReturnStatusTotal
                  ? [{ label: 'Cheque Return Status', value: String(receiptRegisterTotals.chequeReturnCount) }]
                  : []),
              { label: 'Cheque Return Charges', value: formatAmountWithCurrency(receiptRegisterTotals.chequeReturnCharges) }
          ]
        : [];

    return (
        <div className="voucher-register-actions">
            {isReceiptRegister && receiptRegisterTotals ? (
                <div className="voucher-register-totals" aria-label="Receipt register totals">
                    {receiptTotals.map((item) => (
                        <span key={item.label} className="voucher-register-totals__item">
                            <span className="voucher-register-totals__label">{item.label}</span>
                            <span className="voucher-register-totals__value">{item.value}</span>
                        </span>
                    ))}
                </div>
            ) : (
                <span className="text-700 font-semibold">Total {formatAmountWithCurrency(totals)}</span>
            )}
            <div className="voucher-register-actions__buttons">
                <Menu model={printMenuItems} popup ref={printMenuRef} />
                {voucherActions.refresh.visible ? (
                    <Button
                        label="Refresh"
                        icon="pi pi-refresh"
                        className="p-button-text app-action-refresh"
                        id={refreshButtonId}
                        onClick={handleRefresh}
                        disabled={voucherActions.refresh.disabled}
                    />
                ) : null}
                {loadSummaryText ? (
                    <span className="text-600 text-sm" aria-live="polite">
                        {loadSummaryText}
                    </span>
                ) : null}
                {pageLoadSummaryText ? (
                    <span className="text-600 text-sm" aria-live="polite">
                        {pageLoadSummaryText}
                    </span>
                ) : null}
                {voucherActions.printRegister.visible ? (
                    <Button
                        label="Print Register"
                        icon="pi pi-print"
                        className="p-button-text app-action-print"
                        onClick={(event) => printMenuRef.current?.toggle(event)}
                        disabled={voucherActions.printRegister.disabled}
                    />
                ) : null}
            </div>
        </div>
    );
}
