import React from 'react';
import { Checkbox } from 'primereact/checkbox';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { focusElementById } from '@/lib/masterFormDialog';
import { formatDateForStorage, parseStoredDateValue } from '../ledgerFormDate';
import type { LedgerDropdownOption, LedgerFormState } from '../ledgerFormTypes';

type LedgerTaxControlsTabProps = {
    form: LedgerFormState;
    formErrors: Record<string, string>;
    ledgerOptions: LedgerDropdownOption[];
    ledgerOptionsErrorMessage?: string | null;
    fieldIds: {
        taxRate: string;
        taxTypeCode: string;
        taxCalculation: string;
        taxNature: string;
        taxCapitalGoods: string;
        taxAccountsUpdate: string;
        taxRoundOffSales: string;
        taxRoundOffPurchase: string;
        taxPurchaseLedger: string;
        taxSalesLedger: string;
        taxSalesLedger2: string;
        partyType: string;
        interestRate: string;
        gstStopDate: string;
        save: string;
    };
    onFormChange: (patch: Partial<LedgerFormState>) => void;
};

const renderError = (formErrors: Record<string, string>, field: string) =>
    formErrors[field] ? <small className="p-error">{formErrors[field]}</small> : null;

export const LedgerTaxControlsTab = ({
    form,
    formErrors,
    ledgerOptions,
    ledgerOptionsErrorMessage,
    fieldIds,
    onFormChange
}: LedgerTaxControlsTabProps) => {
    return (
        <>
            {ledgerOptionsErrorMessage && (
                <small className="p-error block mb-2">
                    Ledger options error: {ledgerOptionsErrorMessage}
                </small>
            )}
            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Rate</label>
                    <AppInput
                        id={fieldIds.taxRate}
                        value={form.taxRate}
                        onChange={(e) => onFormChange({ taxRate: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxTypeCode)}
                        placeholder="Tax rate"
                    />
                    {renderError(formErrors, 'taxRate')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Type Code</label>
                    <AppInput
                        id={fieldIds.taxTypeCode}
                        value={form.taxTypeCode}
                        onChange={(e) => onFormChange({ taxTypeCode: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxCalculation)}
                        placeholder="Tax type code"
                    />
                    {renderError(formErrors, 'taxTypeCode')}
                </span>
            </div>

            <div className="flex align-items-center justify-content-between">
                <span className="font-medium text-700">Tax Configuration</span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Calculation</label>
                    <AppInput
                        id={fieldIds.taxCalculation}
                        value={form.taxCalculation}
                        onChange={(e) => onFormChange({ taxCalculation: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxNature)}
                        placeholder="Tax calculation code"
                    />
                    {renderError(formErrors, 'taxCalculation')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Nature</label>
                    <AppInput
                        id={fieldIds.taxNature}
                        value={form.taxNature}
                        onChange={(e) => onFormChange({ taxNature: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxCapitalGoods)}
                        placeholder="Tax nature code"
                    />
                    {renderError(formErrors, 'taxNature')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Capital Goods</label>
                    <AppInput
                        id={fieldIds.taxCapitalGoods}
                        value={form.taxCapitalGoods}
                        onChange={(e) => onFormChange({ taxCapitalGoods: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxAccountsUpdate)}
                        placeholder="Tax capital goods flag/code"
                    />
                    {renderError(formErrors, 'taxCapitalGoods')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Accounts Update</label>
                    <AppInput
                        id={fieldIds.taxAccountsUpdate}
                        value={form.taxAccountsUpdate}
                        onChange={(e) => onFormChange({ taxAccountsUpdate: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxRoundOffSales)}
                        placeholder="Tax accounts update flag/code"
                    />
                    {renderError(formErrors, 'taxAccountsUpdate')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Round Off (Sales)</label>
                    <AppInput
                        id={fieldIds.taxRoundOffSales}
                        value={form.taxRoundOffSales}
                        onChange={(e) => onFormChange({ taxRoundOffSales: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxRoundOffPurchase)}
                        placeholder="Sales round-off code"
                    />
                    {renderError(formErrors, 'taxRoundOffSales')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Round Off (Purchase)</label>
                    <AppInput
                        id={fieldIds.taxRoundOffPurchase}
                        value={form.taxRoundOffPurchase}
                        onChange={(e) => onFormChange({ taxRoundOffPurchase: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.taxPurchaseLedger)}
                        placeholder="Purchase round-off code"
                    />
                    {renderError(formErrors, 'taxRoundOffPurchase')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Purchase Ledger</label>
                    <AppDropdown
                        inputId={fieldIds.taxPurchaseLedger}
                        value={form.taxFPurchaseLedgerId}
                        options={ledgerOptions}
                        onChange={(e) => onFormChange({ taxFPurchaseLedgerId: e.value ?? '' })}
                        onEnterNext={() => focusElementById(fieldIds.taxSalesLedger)}
                        placeholder="Select ledger"
                        showClear
                        filter
                        className={formErrors.taxFPurchaseLedgerId ? 'p-invalid' : undefined}
                    />
                    {renderError(formErrors, 'taxFPurchaseLedgerId')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Tax Sales Ledger</label>
                    <AppDropdown
                        inputId={fieldIds.taxSalesLedger}
                        value={form.taxFSalesLedgerId}
                        options={ledgerOptions}
                        onChange={(e) => onFormChange({ taxFSalesLedgerId: e.value ?? '' })}
                        onEnterNext={() => focusElementById(fieldIds.taxSalesLedger2)}
                        placeholder="Select ledger"
                        showClear
                        filter
                        className={formErrors.taxFSalesLedgerId ? 'p-invalid' : undefined}
                    />
                    {renderError(formErrors, 'taxFSalesLedgerId')}
                </span>
            </div>

            <div className="flex flex-column gap-1">
                <label className="font-medium">Tax Sales Ledger 2</label>
                <AppDropdown
                    inputId={fieldIds.taxSalesLedger2}
                    value={form.taxFSalesLedger2Id}
                    options={ledgerOptions}
                    onChange={(e) => onFormChange({ taxFSalesLedger2Id: e.value ?? '' })}
                    onEnterNext={() => focusElementById(fieldIds.partyType)}
                    placeholder="Select ledger"
                    showClear
                    filter
                    className={formErrors.taxFSalesLedger2Id ? 'p-invalid' : undefined}
                />
                {renderError(formErrors, 'taxFSalesLedger2Id')}
            </div>

            <div className="flex align-items-center justify-content-between">
                <span className="font-medium text-700">Operational Controls</span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Party Type</label>
                    <AppInput
                        id={fieldIds.partyType}
                        value={form.typeOfParty}
                        onChange={(e) => onFormChange({ typeOfParty: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.interestRate)}
                        placeholder="Type of party"
                    />
                    {renderError(formErrors, 'typeOfParty')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Interest Rate</label>
                    <AppInput
                        id={fieldIds.interestRate}
                        value={form.intRate}
                        onChange={(e) => onFormChange({ intRate: e.target.value })}
                        onEnterNext={() => {
                            if (form.isStopGst === 1) {
                                focusElementById(fieldIds.gstStopDate);
                                return true;
                            }
                            focusElementById(fieldIds.save);
                            return true;
                        }}
                        placeholder="Interest rate"
                    />
                    {renderError(formErrors, 'intRate')}
                </span>
            </div>

            <div className="flex flex-column gap-1">
                <label className="font-medium">GST Stop Date</label>
                <AppDateInput
                    inputId={fieldIds.gstStopDate}
                    value={parseStoredDateValue(form.gstStopDate)}
                    onChange={(next) => onFormChange({ gstStopDate: formatDateForStorage(next) })}
                    onEnterNext={() => focusElementById(fieldIds.save)}
                    placeholder="DD/MM/YYYY"
                    disabled={form.isStopGst !== 1}
                />
                {renderError(formErrors, 'gstStopDate')}
            </div>

            <div className="flex flex-wrap gap-4">
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-generate-bill-flag"
                        checked={form.isGenerateBill === 1}
                        onChange={(e) => onFormChange({ isGenerateBill: e.checked ? 1 : 0 })}
                    />
                    <label htmlFor="ledger-generate-bill-flag" className="font-medium">
                        Generate Bill
                    </label>
                </span>
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-print-bill-flag"
                        checked={form.isPrintBill === 1}
                        onChange={(e) => onFormChange({ isPrintBill: e.checked ? 1 : 0 })}
                    />
                    <label htmlFor="ledger-print-bill-flag" className="font-medium">
                        Print Bill
                    </label>
                </span>
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-tax-applicable-flag"
                        checked={form.isTaxApplicable === 1}
                        onChange={(e) => onFormChange({ isTaxApplicable: e.checked ? 1 : 0 })}
                    />
                    <label htmlFor="ledger-tax-applicable-flag" className="font-medium">
                        Tax Applicable
                    </label>
                </span>
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-stop-gst-flag"
                        checked={form.isStopGst === 1}
                        onChange={(e) =>
                            onFormChange({
                                isStopGst: e.checked ? 1 : 0,
                                gstStopDate: e.checked ? form.gstStopDate : ''
                            })
                        }
                    />
                    <label htmlFor="ledger-stop-gst-flag" className="font-medium">
                        Stop GST
                    </label>
                </span>
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-tcs-applicable-flag"
                        checked={form.isTcsApplicable === 1}
                        onChange={(e) => onFormChange({ isTcsApplicable: e.checked ? 1 : 0 })}
                    />
                    <label htmlFor="ledger-tcs-applicable-flag" className="font-medium">
                        TCS Applicable
                    </label>
                </span>
            </div>
        </>
    );
};
