'use client';
import React from 'react';
import { VoucherBillWiseSection } from './components/VoucherBillWiseSection';
import { VoucherDebitLinesSection } from './components/VoucherDebitLinesSection';
import { VoucherFormFooter } from './components/VoucherFormFooter';
import { VoucherFormHeader } from './components/VoucherFormHeader';
import { VoucherFormMainSection } from './components/VoucherFormMainSection';
import { VoucherSavedSummary } from './components/VoucherSavedSummary';
import { resolveVoucherThemeClass } from './voucherThemeClass';
import type { VoucherViewProps } from './useVoucherState';

export function VoucherForm(props: VoucherViewProps) {
    const {
        formErrors,
        save,
        editingId,
        voucherActions,
        saving,
        cancelForm,
        isFormActive,
        runDrySaveCheck,
        isBankMode,
        paymentMode,
        voucherProfileKey,
        isCashMode,
        searchInvoiceBills
    } = props;

    const handleFormShortcut = React.useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.defaultPrevented) return;
            const hasSaveModifier = event.ctrlKey || event.metaKey;
            const hasCancelModifier = event.ctrlKey;
            const pressedKey = event.key.toLowerCase();
            const isEscapeKey = pressedKey === 'escape' || pressedKey === 'esc';
            if (pressedKey === 'f7') {
                const supportsInvoiceShortcut = voucherProfileKey === 'receipt' || voucherProfileKey === 'journal';
                if (!supportsInvoiceShortcut || !isCashMode || !isFormActive || saving) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                searchInvoiceBills();
                return;
            }
            if (hasCancelModifier && isEscapeKey && !event.altKey && !event.shiftKey) {
                if (!isFormActive || saving || !voucherActions.cancelForm.visible || voucherActions.cancelForm.disabled) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                cancelForm();
                return;
            }

            if (hasSaveModifier && event.shiftKey && pressedKey === 's') {
                event.preventDefault();
                event.stopPropagation();
                if (!isFormActive || saving || !voucherActions.saveForm.visible || voucherActions.saveForm.disabled) return;
                runDrySaveCheck();
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
            isCashMode,
            runDrySaveCheck,
            save,
            saving,
            searchInvoiceBills,
            voucherActions.cancelForm.disabled,
            voucherActions.cancelForm.visible,
            voucherActions.saveForm.disabled,
            voucherActions.saveForm.visible,
            voucherProfileKey
        ]
    );

    const renderFormError = (key: string) =>
        formErrors[key] ? <small className="text-red-500">{formErrors[key]}</small> : null;

    const formLevelError = formErrors.form ?? formErrors.voucherTypeId ?? null;
    const voucherThemeClass = React.useMemo(
        () => resolveVoucherThemeClass(voucherProfileKey, paymentMode),
        [paymentMode, voucherProfileKey]
    );

    return (
        <div
            className={`voucher-form cash-exp-split__form p-3 cash-exp-form cash-exp-form--receipt ${
                isBankMode ? 'cash-exp-form--bank' : 'cash-exp-form--cash'
            } ${voucherThemeClass}`}
            onKeyDownCapture={handleFormShortcut}
        >
            <VoucherFormHeader viewProps={props} />
            <VoucherSavedSummary viewProps={props} />

            <div className="app-voucher-form-stack">
                <VoucherFormMainSection
                    viewProps={props}
                    formLevelError={formLevelError}
                    renderFormError={renderFormError}
                />
                <VoucherBillWiseSection viewProps={props} renderFormError={renderFormError} />
                <VoucherDebitLinesSection viewProps={props} renderFormError={renderFormError} />
                <VoucherFormFooter viewProps={props} renderFormError={renderFormError} />
            </div>
        </div>
    );
}
