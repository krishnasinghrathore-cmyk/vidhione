'use client';
import React from 'react';
import { PaymentVoucherDebitLinesSection } from './components/PaymentVoucherDebitLinesSection';
import { PaymentVoucherFormFooter } from './components/PaymentVoucherFormFooter';
import { PaymentVoucherFormHeader } from './components/PaymentVoucherFormHeader';
import { PaymentVoucherFormMainSection } from './components/PaymentVoucherFormMainSection';
import { PaymentVoucherSavedSummary } from './components/PaymentVoucherSavedSummary';
import type { PaymentVoucherViewProps } from './usePaymentVoucherState';

export function PaymentVoucherForm(props: PaymentVoucherViewProps) {
    const { paymentMode, formErrors, save, editingId, voucherActions, saving, cancelForm, isFormActive } = props;

    const handleFormShortcut = React.useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.defaultPrevented) return;
            const hasSaveModifier = event.ctrlKey || event.metaKey;
            const pressedKey = event.key.toLowerCase();
            const isEscapeKey = pressedKey === 'escape' || pressedKey === 'esc';
            if (!hasSaveModifier && isEscapeKey && !event.altKey && !event.shiftKey) {
                if (!isFormActive || saving || !voucherActions.cancelForm.visible || voucherActions.cancelForm.disabled) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                cancelForm();
                return;
            }

            if (!hasSaveModifier || event.altKey || (pressedKey !== 's' && pressedKey !== 'enter')) return;

            // Suppress browser-level save while the voucher form is active and route to in-app actions.
            event.preventDefault();
            event.stopPropagation();
            if (!isFormActive || saving || !voucherActions.saveForm.visible || voucherActions.saveForm.disabled) return;

            if (pressedKey === 's') {
                void save();
                return;
            }

            if (!editingId) {
                void save({ intent: 'addAnotherShortcut' });
            }
        },
        [
            cancelForm,
            editingId,
            isFormActive,
            save,
            saving,
            voucherActions.cancelForm.disabled,
            voucherActions.cancelForm.visible,
            voucherActions.saveForm.disabled,
            voucherActions.saveForm.visible
        ]
    );

    const renderFormError = (key: string) =>
        formErrors[key] ? <small className="text-red-500">{formErrors[key]}</small> : null;

    const formLevelError = formErrors.form ?? formErrors.voucherTypeId ?? null;

    return (
        <div
            className={`voucher-form cash-exp-split__form p-3 cash-exp-form cash-exp-form--receipt ${
                paymentMode === 'bank' ? 'cash-exp-form--bank' : 'cash-exp-form--cash'
            }`}
            onKeyDownCapture={handleFormShortcut}
        >
            <PaymentVoucherFormHeader viewProps={props} />
            <PaymentVoucherSavedSummary viewProps={props} />

            <div className="app-voucher-form-stack">
                <PaymentVoucherFormMainSection
                    viewProps={props}
                    formLevelError={formLevelError}
                    renderFormError={renderFormError}
                />
                <PaymentVoucherDebitLinesSection viewProps={props} renderFormError={renderFormError} />
                <PaymentVoucherFormFooter viewProps={props} renderFormError={renderFormError} />
            </div>
        </div>
    );
}
