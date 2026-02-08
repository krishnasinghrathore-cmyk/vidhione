'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { LabelWithIcon } from './LabelWithIcon';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';

type PaymentVoucherFormHeaderProps = {
    viewProps: PaymentVoucherViewProps;
};

export function PaymentVoucherFormHeader({ viewProps }: PaymentVoucherFormHeaderProps) {
    const { cancelForm, paymentMode, saving } = viewProps;
    const modeLabel = paymentMode === 'bank' ? 'Bank' : 'Cash';

    return (
        <div className="app-entry-form-header">
            <div className="app-entry-form-header__left">
                <Button
                    label="← Back to Register"
                    className="p-button-text p-button-sm app-entry-form-header__back"
                    onClick={cancelForm}
                    disabled={saving}
                />
            </div>
            <div className="app-entry-form-header__right">
                <span className="app-entry-form-header__mode">
                    <LabelWithIcon icon="pi-credit-card">Payment Mode: {modeLabel}</LabelWithIcon>
                </span>
            </div>
        </div>
    );
}
