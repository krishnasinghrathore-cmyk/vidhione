import React from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

type PhaseOneWarningDialogProps = {
    visible: boolean;
    onCancel: () => void;
    onContinue: () => void;
    loading?: boolean;
};

export function PhaseOneWarningDialog({ visible, onCancel, onContinue, loading }: PhaseOneWarningDialogProps) {
    return (
        <Dialog
            header="Phase 1 Inventory Notice"
            visible={visible}
            style={{ width: '34rem' }}
            modal
            onHide={onCancel}
            footer={
                <div className="flex justify-content-end gap-2">
                    <Button label="Cancel" outlined onClick={onCancel} />
                    <Button label="Continue & Save" icon="pi pi-check" onClick={onContinue} loading={loading} />
                </div>
            }
        >
            <div className="flex flex-column gap-2">
                <p className="m-0">
                    Warehouse, batch, expiry, and serial values are currently <b>draft-only</b> and are not persisted in
                    this phase.
                </p>
                <p className="m-0 text-600">
                    Invoice header, line amounts, discounts, tax ledgers, and totals will still be saved normally.
                </p>
            </div>
        </Dialog>
    );
}
