import React from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import type { AgencyOptionsFormState } from './useAgencyOptionsForm';

type Props = {
    form: AgencyOptionsFormState;
    onChange: (patch: Partial<AgencyOptionsFormState>) => void;
};

export const ImportDefaultsSection = ({ form, onChange }: Props) => {
    return (
        <>
            <h3>Import Defaults</h3>
            <div className="formgrid grid">
                <div className="field col-12 md:col-6">
                    <label htmlFor="defaultTransportImportColumnSno">Transport Import Column S.No</label>
                    <InputText
                        id="defaultTransportImportColumnSno"
                        value={form.defaultTransportImportColumnSno}
                        onChange={(e) => onChange({ defaultTransportImportColumnSno: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="defaultSaleInvoiceImportColumnSno">Sale Invoice Import Column S.No</label>
                    <InputText
                        id="defaultSaleInvoiceImportColumnSno"
                        value={form.defaultSaleInvoiceImportColumnSno}
                        onChange={(e) => onChange({ defaultSaleInvoiceImportColumnSno: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="transportUnitId">Transport Unit ID</label>
                    <InputNumber
                        id="transportUnitId"
                        value={form.transportUnitId}
                        onValueChange={(e) => onChange({ transportUnitId: e.value ?? null })}
                        useGrouping={false}
                    />
                </div>
            </div>
        </>
    );
};
