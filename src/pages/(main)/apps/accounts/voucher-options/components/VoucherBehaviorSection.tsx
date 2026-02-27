import React from 'react';
import AppInput from '@/components/AppInput';
import AppPassword from '@/components/AppPassword';
import type { VoucherTypeFormErrors, VoucherTypeFormState } from '../types';

type VoucherBehaviorSectionProps = {
    form: VoucherTypeFormState;
    errors: VoucherTypeFormErrors;
    showPassword: boolean;
    onTogglePassword: () => void;
    onFormPatch: (patch: Partial<VoucherTypeFormState>) => void;
};

export function VoucherBehaviorSection({
    form,
    errors,
    showPassword,
    onTogglePassword,
    onFormPatch
}: VoucherBehaviorSectionProps) {
    const inputWidthStyle = { width: '100%' } as const;

    return (
        <div className="voucher-options-modal__section">
            <div className="voucher-options-modal__section-title">Voucher Behavior</div>
            <div className="voucher-options-modal__divider" />
            <div className="grid voucher-options-modal__grid">
                <div className="col-12 md:col-6">
                    <label className="block text-600 mb-1">Default Narration</label>
                    <AppInput
                        value={form.disclaimer5}
                        onChange={(event) => onFormPatch({ disclaimer5: event.target.value })}
                        className="w-full"
                        compact
                        style={inputWidthStyle}
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label className="block text-600 mb-1">Approval Password</label>
                    <AppPassword
                        value={form.editPassword}
                        onChange={(event) => onFormPatch({ editPassword: event.target.value })}
                        visible={showPassword}
                        onToggleVisibility={onTogglePassword}
                        className="w-full"
                        compact
                        style={inputWidthStyle}
                        inputClassName={errors.editPassword ? 'w-full p-invalid' : 'w-full'}
                    />
                    {errors.editPassword && <small className="p-error">{errors.editPassword}</small>}
                </div>
                <div className="col-12 md:col-3">
                    <label className="block text-600 mb-1">Default Report Days</label>
                    <AppInput
                        value={form.defaultReportLookbackDays == null ? '' : String(form.defaultReportLookbackDays)}
                        onChange={(event) => {
                            const digitsOnly = event.target.value.replace(/\D/g, '');
                            onFormPatch({
                                defaultReportLookbackDays: digitsOnly ? Number.parseInt(digitsOnly, 10) : null
                            });
                        }}
                        className={errors.defaultReportLookbackDays ? 'w-full p-invalid' : 'w-full'}
                        compact
                        style={inputWidthStyle}
                        placeholder="e.g. 30"
                    />
                    {errors.defaultReportLookbackDays && <small className="p-error">{errors.defaultReportLookbackDays}</small>}
                </div>
            </div>
        </div>
    );
}
