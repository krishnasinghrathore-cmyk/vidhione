'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { LabelWithIcon } from './LabelWithIcon';
import type { VoucherViewProps } from '../useVoucherState';

type VoucherFormHeaderProps = {
    viewProps: VoucherViewProps;
};

export function VoucherFormHeader({ viewProps }: VoucherFormHeaderProps) {
    const {
        cancelForm,
        saving,
        editingId,
        voucherNo,
        modeSwitchLabel,
        paymentModeLabel,
        showBillWiseOption,
        isBillWiseMode,
        toggleBillWiseMode,
        isFormActive
    } = viewProps;
    const trimmedVoucherNo = voucherNo?.trim() ?? '';
    const formTitle = editingId ? (trimmedVoucherNo ? `Edit Voucher #${trimmedVoucherNo}` : 'Edit Voucher') : 'New Voucher';
    const backTriggeredFromMouseDownRef = React.useRef(false);

    const handleBackMouseDown = () => {
        backTriggeredFromMouseDownRef.current = true;
        cancelForm();
    };

    const handleBackClick = () => {
        if (backTriggeredFromMouseDownRef.current) {
            backTriggeredFromMouseDownRef.current = false;
            return;
        }
        cancelForm();
    };

    return (
        <div className="app-entry-form-header app-entry-form-header--three-col">
            <div className="app-entry-form-header__left">
                <Button
                    label="← Back to Register"
                    className="p-button-text p-button-sm app-entry-form-header__back"
                    onMouseDown={handleBackMouseDown}
                    onClick={handleBackClick}
                    disabled={saving}
                />
            </div>
            <div className="app-entry-form-header__center">
                <div className="app-entry-form-header__center-stack">
                    <span className="app-entry-form-title" title={formTitle}>
                        {formTitle}
                    </span>
                    {showBillWiseOption ? (
                        <label className="app-entry-form-header__billwise" htmlFor="voucher-bill-wise-mode">
                            <Checkbox
                                inputId="voucher-bill-wise-mode"
                                checked={isBillWiseMode}
                                onChange={(event) => toggleBillWiseMode(Boolean(event.checked))}
                                disabled={!isFormActive || saving}
                            />
                            <span>Bill-wise Entry</span>
                        </label>
                    ) : null}
                </div>
            </div>
            <div className="app-entry-form-header__right">
                <span className="app-entry-form-header__mode">
                    <LabelWithIcon icon="pi-credit-card">{modeSwitchLabel}: {paymentModeLabel}</LabelWithIcon>
                </span>
            </div>
        </div>
    );
}
