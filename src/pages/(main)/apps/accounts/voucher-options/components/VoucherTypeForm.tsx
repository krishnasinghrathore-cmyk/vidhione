import React from 'react';
import type { VoucherTypeFormErrors, VoucherTypeFormState } from '../types';
import { AdvancedPrintSettingsSection } from './AdvancedPrintSettingsSection';
import { BasicInfoSection } from './BasicInfoSection';
import { LockPeriodSection } from './LockPeriodSection';
import { VoucherBehaviorSection } from './VoucherBehaviorSection';
import { VoucherNumberingSection } from './VoucherNumberingSection';

type VoucherTypeFormProps = {
    form: VoucherTypeFormState;
    errors: VoucherTypeFormErrors;
    showPassword: boolean;
    advancedPrintSettingsExpanded: boolean;
    onTogglePassword: () => void;
    onToggleAdvancedPrintSettings: () => void;
    onFormPatch: (patch: Partial<VoucherTypeFormState>) => void;
};

export function VoucherTypeForm({
    form,
    errors,
    showPassword,
    advancedPrintSettingsExpanded,
    onTogglePassword,
    onToggleAdvancedPrintSettings,
    onFormPatch
}: VoucherTypeFormProps) {
    return (
        <div className="voucher-options-modal__form flex flex-column">
            <BasicInfoSection form={form} errors={errors} onFormPatch={onFormPatch} />
            <VoucherNumberingSection form={form} errors={errors} onFormPatch={onFormPatch} />
            <VoucherBehaviorSection form={form} errors={errors} showPassword={showPassword} onTogglePassword={onTogglePassword} onFormPatch={onFormPatch} />
            <LockPeriodSection form={form} errors={errors} onFormPatch={onFormPatch} />
            <AdvancedPrintSettingsSection
                form={form}
                expanded={advancedPrintSettingsExpanded}
                onToggleExpanded={onToggleAdvancedPrintSettings}
                onFormPatch={onFormPatch}
            />
        </div>
    );
}
