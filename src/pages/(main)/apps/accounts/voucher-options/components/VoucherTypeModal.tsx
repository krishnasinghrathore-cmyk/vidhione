import React, { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { VoucherTypeFormErrors, VoucherTypeFormState } from '../types';
import { VoucherTypeForm } from './VoucherTypeForm';

type VoucherTypeModalProps = {
    visible: boolean;
    saving: boolean;
    canSave: boolean;
    form: VoucherTypeFormState;
    errors: VoucherTypeFormErrors;
    onHide: () => void;
    onSave: () => void;
    onFormPatch: (patch: Partial<VoucherTypeFormState>) => void;
};

export function VoucherTypeModal({
    visible,
    saving,
    canSave,
    form,
    errors,
    onHide,
    onSave,
    onFormPatch
}: VoucherTypeModalProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [advancedPrintSettingsExpanded, setAdvancedPrintSettingsExpanded] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setShowPassword(false);
        setAdvancedPrintSettingsExpanded(false);
    }, [visible]);

    return (
        <Dialog
            header="Edit Voucher Options"
            visible={visible}
            className="voucher-options-modal"
            style={{ width: 'min(820px, 96vw)' }}
            contentStyle={{ padding: '0.75rem 0.875rem' }}
            onHide={onHide}
            footer={
                <div className="voucher-options-modal__footer flex align-items-center justify-content-between gap-2 w-full">
                    <Button label="Cancel" className="p-button-text" onClick={onHide} disabled={saving} />
                    <Button
                        label={saving ? 'Saving...' : 'Save Changes'}
                        icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                        onClick={onSave}
                        disabled={saving || !canSave}
                    />
                </div>
            }
        >
            <VoucherTypeForm
                form={form}
                errors={errors}
                showPassword={showPassword}
                advancedPrintSettingsExpanded={advancedPrintSettingsExpanded}
                onTogglePassword={() => setShowPassword((prev) => !prev)}
                onToggleAdvancedPrintSettings={() => setAdvancedPrintSettingsExpanded((prev) => !prev)}
                onFormPatch={onFormPatch}
            />
        </Dialog>
    );
}
