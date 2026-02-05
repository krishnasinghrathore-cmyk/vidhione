import React from 'react';
import { InputText } from 'primereact/inputtext';
import type { AgencyOptionsFormState } from './useAgencyOptionsForm';

type Props = {
    form: AgencyOptionsFormState;
    onChange: (patch: Partial<AgencyOptionsFormState>) => void;
};

export const EInvoiceSection = ({ form, onChange }: Props) => {
    return (
        <>
            <h3>E-Invoice Settings</h3>
            <div className="formgrid grid">
                <div className="field col-12 md:col-4">
                    <label htmlFor="einvoiceAckColumns1">Ack Columns 1</label>
                    <InputText
                        id="einvoiceAckColumns1"
                        value={form.einvoiceAckColumns1}
                        onChange={(e) => onChange({ einvoiceAckColumns1: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="einvoiceAckColumns2">Ack Columns 2</label>
                    <InputText
                        id="einvoiceAckColumns2"
                        value={form.einvoiceAckColumns2}
                        onChange={(e) => onChange({ einvoiceAckColumns2: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="einvoiceCancelAckColumns">Cancel Ack Columns</label>
                    <InputText
                        id="einvoiceCancelAckColumns"
                        value={form.einvoiceCancelAckColumns}
                        onChange={(e) => onChange({ einvoiceCancelAckColumns: e.target.value })}
                    />
                </div>
            </div>
        </>
    );
};
