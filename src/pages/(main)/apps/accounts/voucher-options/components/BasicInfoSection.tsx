import React from 'react';
import AppInput from '@/components/AppInput';
import type { VoucherTypeFormErrors, VoucherTypeFormState } from '../types';

type BasicInfoSectionProps = {
    form: VoucherTypeFormState;
    errors: VoucherTypeFormErrors;
    onFormPatch: (patch: Partial<VoucherTypeFormState>) => void;
};

export function BasicInfoSection({ form, errors, onFormPatch }: BasicInfoSectionProps) {
    const inputWidthStyle = { width: '100%' } as const;

    return (
        <div className="voucher-options-modal__section">
            <div className="voucher-options-modal__section-title">Basic Information</div>
            <div className="voucher-options-modal__divider" />
            <div className="grid voucher-options-modal__grid">
                <div className="col-12 md:col-4">
                    <label className="block text-600 mb-1">
                        Internal Name
                        <span className="text-red-500 ml-1" aria-hidden="true">
                            *
                        </span>
                    </label>
                    <AppInput
                        value={form.voucherTypeName}
                        onChange={(event) => onFormPatch({ voucherTypeName: event.target.value })}
                        className={errors.voucherTypeName ? 'w-full p-invalid app-field-noneditable' : 'w-full app-field-noneditable'}
                        compact
                        style={inputWidthStyle}
                        readOnly
                    />
                    {errors.voucherTypeName && <small className="p-error">{errors.voucherTypeName}</small>}
                </div>
                <div className="col-12 md:col-4">
                    <label className="block text-600 mb-1">
                        Voucher Title
                        <span className="text-red-500 ml-1" aria-hidden="true">
                            *
                        </span>
                    </label>
                    <AppInput
                        value={form.displayName}
                        onChange={(event) => onFormPatch({ displayName: event.target.value })}
                        className={errors.displayName ? 'w-full p-invalid' : 'w-full'}
                        compact
                        style={inputWidthStyle}
                        placeholder="Voucher title"
                    />
                    {errors.displayName && <small className="p-error">{errors.displayName}</small>}
                </div>
                <div className="col-12 md:col-4" />
            </div>
        </div>
    );
}
