'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';
import { formatAmountWithCurrency } from '../utils';

type PaymentVoucherTableActionsProps = {
    viewProps: PaymentVoucherViewProps;
};

export function PaymentVoucherTableActions({ viewProps }: PaymentVoucherTableActionsProps) {
    const { totals, printMenuItems, printMenuRef, refreshButtonId, handleRefresh, canRefresh, totalRecordsForTable } = viewProps;
    const canPrint = totalRecordsForTable > 0;

    return (
        <>
            <span className="text-700 font-semibold">Total {formatAmountWithCurrency(totals)}</span>
            <Menu model={printMenuItems} popup ref={printMenuRef} />
            <Button
                label="Refresh"
                icon="pi pi-refresh"
                className="p-button-text app-action-refresh"
                id={refreshButtonId}
                onClick={handleRefresh}
                disabled={!canRefresh}
            />
            <span title={canPrint ? undefined : 'Nothing to print'} style={{ display: 'inline-flex' }}>
                <Button
                    label="Print"
                    icon="pi pi-print"
                    className="p-button-text app-action-print"
                    onClick={(event) => printMenuRef.current?.toggle(event)}
                    disabled={!canPrint}
                />
            </span>
        </>
    );
}
