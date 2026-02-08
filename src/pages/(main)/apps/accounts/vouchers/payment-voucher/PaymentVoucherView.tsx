'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { SelectButton } from 'primereact/selectbutton';
import { PaymentVoucherForm } from './PaymentVoucherForm';
import { PaymentVoucherTable } from './PaymentVoucherTable';
import { LabelWithIcon } from './components/LabelWithIcon';
import type { PaymentMode } from './types';
import type { PaymentVoucherViewProps } from './usePaymentVoucherState';

export function PaymentVoucherView(props: PaymentVoucherViewProps) {
    const {
        error,
        pageHeading,
        isFormActive,
        editingId,
        voucherNo,
        saving,
        openAdd,
        paymentMode,
        paymentModeOptions,
        changePaymentMode,
        totalRecordsForTable
    } = props;
    const subtitle = !isFormActive
        ? 'Register'
        : editingId
          ? voucherNo?.trim()
              ? `Edit Voucher #${voucherNo.trim()}`
              : 'Edit Voucher'
          : 'New Voucher';

    return (
        <div className="cash-exp-split">
            <ConfirmDialog />
            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column gap-1">
                    <div>
                        <h2 className="m-0">{pageHeading}</h2>
                    </div>
                    <small className="text-600">{subtitle}</small>
                </div>
                {error && <p className="text-red-500 m-0">Error loading payment vouchers: {error.message}</p>}
            </div>

            <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="flex flex-column gap-1">
                    <span className="text-600 text-sm">
                        <LabelWithIcon icon="pi-credit-card">Payment Mode</LabelWithIcon>
                    </span>
                    <SelectButton
                        value={paymentMode}
                        options={paymentModeOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(event) => {
                            if (!event.value) return;
                            changePaymentMode(event.value as PaymentMode);
                        }}
                        className="app-filter-width app-payment-mode"
                    />
                </div>
                {totalRecordsForTable > 0 ? (
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <Button
                            label="New Voucher"
                            icon="pi pi-plus"
                            className="app-action-compact"
                            onClick={openAdd}
                            disabled={saving}
                        />
                    </div>
                ) : null}
            </div>
            {isFormActive ? (
                <div className="mb-3">
                    <PaymentVoucherForm {...props} />
                </div>
            ) : null}
            <PaymentVoucherTable {...props} />
        </div>
    );
}
