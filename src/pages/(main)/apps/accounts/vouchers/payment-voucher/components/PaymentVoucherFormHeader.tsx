'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { LabelWithIcon } from './LabelWithIcon';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';

type PaymentVoucherFormHeaderProps = {
    viewProps: PaymentVoucherViewProps;
};

export function PaymentVoucherFormHeader({ viewProps }: PaymentVoucherFormHeaderProps) {
    const { cancelForm, paymentMode, saving, editingId, voucherNo } = viewProps;
    const modeLabel = paymentMode === 'bank' ? 'Bank' : 'Cash';
    const trimmedVoucherNo = voucherNo?.trim() ?? '';
    const formTitle = editingId ? (trimmedVoucherNo ? `Edit Voucher #${trimmedVoucherNo}` : 'Edit Voucher') : 'New Voucher';

    return (
        <div className="app-entry-form-header app-entry-form-header--three-col">
            <div className="app-entry-form-header__left">
                <Button
                    label="← Back to Register"
                    className="p-button-text p-button-sm app-entry-form-header__back"
                    onClick={cancelForm}
                    disabled={saving}
                />
            </div>
            <div className="app-entry-form-header__center">
                <span className="app-entry-form-title" title={formTitle}>
                    {formTitle}
                </span>
            </div>
            <div className="app-entry-form-header__right">
                <span className="app-entry-form-header__mode">
                    <LabelWithIcon icon="pi-credit-card">Payment Mode: {modeLabel}</LabelWithIcon>
                </span>
            </div>
        </div>
    );
}
