'use client';
import React from 'react';
import { PaymentVoucherDebitLinesSection } from './components/PaymentVoucherDebitLinesSection';
import { PaymentVoucherFormFooter } from './components/PaymentVoucherFormFooter';
import { PaymentVoucherFormHeader } from './components/PaymentVoucherFormHeader';
import { PaymentVoucherFormMainSection } from './components/PaymentVoucherFormMainSection';
import type { PaymentVoucherViewProps } from './usePaymentVoucherState';

export function PaymentVoucherForm(props: PaymentVoucherViewProps) {
    const { paymentMode, formErrors } = props;

    const renderFormError = (key: string) =>
        formErrors[key] ? <small className="text-red-500">{formErrors[key]}</small> : null;

    const formLevelError = formErrors.form ?? formErrors.voucherTypeId ?? null;

    return (
        <div
            className={`cash-exp-split__form p-3 cash-exp-form cash-exp-form--receipt ${
                paymentMode === 'bank' ? 'cash-exp-form--bank' : 'cash-exp-form--cash'
            }`}
        >
            <PaymentVoucherFormHeader viewProps={props} />

            <div className="flex flex-column gap-2">
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
