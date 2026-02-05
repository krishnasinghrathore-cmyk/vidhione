import React from 'react';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import type { AgencyOptionsFormState } from './useAgencyOptionsForm';

type Props = {
    form: AgencyOptionsFormState;
    onChange: (patch: Partial<AgencyOptionsFormState>) => void;
};

export const AgencyControlsSection = ({ form, onChange }: Props) => {
    return (
        <>
            <h3>Agency Controls</h3>
            <div className="formgrid grid">
                <div className="field col-12 md:col-6">
                    <label htmlFor="agencyCustomerId">Agency Customer ID</label>
                    <InputText
                        id="agencyCustomerId"
                        value={form.agencyCustomerId}
                        onChange={(e) => onChange({ agencyCustomerId: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <div className="field-checkbox mt-3">
                        <Checkbox
                            inputId="isFormWiseRights"
                            checked={form.isFormWiseRights}
                            onChange={(e) => onChange({ isFormWiseRights: e.checked ?? false })}
                        />
                        <label htmlFor="isFormWiseRights">Form-wise User Rights</label>
                    </div>
                    <div className="field-checkbox mt-2">
                        <Checkbox
                            inputId="isVoucherDateLowerAllow"
                            checked={form.isVoucherDateLowerAllow}
                            onChange={(e) => onChange({ isVoucherDateLowerAllow: e.checked ?? false })}
                        />
                        <label htmlFor="isVoucherDateLowerAllow">Allow Lower Voucher Date</label>
                    </div>
                    <div className="field-checkbox mt-2">
                        <Checkbox
                            inputId="isManualInvoiceNumber"
                            checked={form.isManualInvoiceNumber}
                            onChange={(e) => onChange({ isManualInvoiceNumber: e.checked ?? false })}
                        />
                        <label htmlFor="isManualInvoiceNumber">Manual Invoice Number</label>
                    </div>
                    <div className="field-checkbox mt-2">
                        <Checkbox
                            inputId="isInvoiceLock"
                            checked={form.isInvoiceLock}
                            onChange={(e) => onChange({ isInvoiceLock: e.checked ?? false })}
                        />
                        <label htmlFor="isInvoiceLock">Lock Invoices</label>
                    </div>
                    <div className="field-checkbox mt-2">
                        <Checkbox
                            inputId="isShowRemark"
                            checked={form.isShowRemark}
                            onChange={(e) => onChange({ isShowRemark: e.checked ?? false })}
                        />
                        <label htmlFor="isShowRemark">Show Remarks</label>
                    </div>
                </div>
            </div>
        </>
    );
};
