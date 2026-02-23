'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { formatReportLoadDuration, useReportLoadTime } from '@/lib/reportLoadTime';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';
import { formatAmountWithCurrency } from '../utils';

type PaymentVoucherTableActionsProps = {
    viewProps: PaymentVoucherViewProps;
};

export function PaymentVoucherTableActions({ viewProps }: PaymentVoucherTableActionsProps) {
    const { totals, printMenuItems, printMenuRef, refreshButtonId, handleRefresh, voucherActions, registerQueryLoading } = viewProps;
    const { activeLoadMs, lastLoadMs } = useReportLoadTime({
        loadingState: registerQueryLoading,
        enabled: true
    });
    const loadSummaryText = registerQueryLoading && activeLoadMs != null
        ? `Load: ${formatReportLoadDuration(activeLoadMs)} (loading...)`
        : lastLoadMs != null
            ? `Load: ${formatReportLoadDuration(lastLoadMs)}`
            : null;

    return (
        <>
            <span className="text-700 font-semibold">Total {formatAmountWithCurrency(totals)}</span>
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
            {voucherActions.printRegister.visible ? (
                <Button
                    label="Print Register"
                    icon="pi pi-print"
                    className="p-button-text app-action-print"
                    onClick={(event) => printMenuRef.current?.toggle(event)}
                    disabled={voucherActions.printRegister.disabled}
                />
            ) : null}
        </>
    );
}
