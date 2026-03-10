import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import type { FiscalRange } from '@/lib/fiscalRange';
import { focusElementById } from '@/lib/masterFormDialog';
import { formatDateForStorage, parseStoredDateValue } from '../ledgerFormDate';
import type {
    ContactPersonRow,
    FieldDefinitionGroup,
    LedgerFormState,
    LedgerSalesTaxRow
} from '../ledgerFormTypes';
import { LedgerExtraFieldInput } from './LedgerExtraFieldInput';

type LedgerContactsExtrasTabProps = {
    form: LedgerFormState;
    formErrors: Record<string, string>;
    fiscalRange: FiscalRange;
    groupedFieldDefinitions: FieldDefinitionGroup[];
    labels: {
        openingBalance: string;
        drcr: string;
    };
    fieldIds: {
        openingBalance: string;
        balanceType: string;
        save: string;
    };
    isEditingProtectedLedger: boolean;
    isEditing: boolean;
    extraValues: Record<string, any>;
    onFormChange: (patch: Partial<LedgerFormState>) => void;
    onAddContactPerson: () => void;
    onUpdateContactPerson: (
        rowId: string,
        patch: Partial<Omit<ContactPersonRow, 'rowId'>>
    ) => void;
    onRemoveContactPerson: (rowId: string) => void;
    onAddLedgerSalesTax: () => void;
    onUpdateLedgerSalesTax: (
        rowId: string,
        patch: Partial<Omit<LedgerSalesTaxRow, 'rowId'>>
    ) => void;
    onRemoveLedgerSalesTax: (rowId: string) => void;
    onUpdateExtraField: (key: string, value: any) => void;
};

const renderError = (formErrors: Record<string, string>, field: string) =>
    formErrors[field] ? <small className="p-error">{formErrors[field]}</small> : null;

export const LedgerContactsExtrasTab = ({
    form,
    formErrors,
    fiscalRange,
    groupedFieldDefinitions,
    labels,
    fieldIds,
    isEditingProtectedLedger,
    isEditing,
    extraValues,
    onFormChange,
    onAddContactPerson,
    onUpdateContactPerson,
    onRemoveContactPerson,
    onAddLedgerSalesTax,
    onUpdateLedgerSalesTax,
    onRemoveLedgerSalesTax,
    onUpdateExtraField
}: LedgerContactsExtrasTabProps) => {
    const getContactFieldId = (rowId: string, field: string) => `ledger-contact-${rowId}-${field}`;
    const getSalesTaxFieldId = (rowId: string, field: string) => `ledger-sales-tax-${rowId}-${field}`;
    const getExtraFieldId = (key: string) => `ledger-extra-field-${key}`;
    const orderedExtraFields = groupedFieldDefinitions.flatMap((group) => group.definitions);
    const focusAfterContactRow = (index: number) => {
        const nextContact = form.contactPersons[index + 1];
        if (nextContact) {
            focusElementById(getContactFieldId(nextContact.rowId, 'name'));
            return true;
        }
        const firstSalesTax = form.ledgerSalesTaxes[0];
        if (firstSalesTax) {
            focusElementById(getSalesTaxFieldId(firstSalesTax.rowId, 'tax-name'));
            return true;
        }
        const firstExtraField = orderedExtraFields[0];
        if (firstExtraField) {
            focusElementById(getExtraFieldId(firstExtraField.key));
            return true;
        }
        focusElementById(fieldIds.openingBalance);
        return true;
    };
    const focusAfterSalesTaxRow = (index: number) => {
        const nextSalesTax = form.ledgerSalesTaxes[index + 1];
        if (nextSalesTax) {
            focusElementById(getSalesTaxFieldId(nextSalesTax.rowId, 'tax-name'));
            return true;
        }
        const firstExtraField = orderedExtraFields[0];
        if (firstExtraField) {
            focusElementById(getExtraFieldId(firstExtraField.key));
            return true;
        }
        focusElementById(fieldIds.openingBalance);
        return true;
    };
    const focusAfterExtraField = (index: number) => {
        const nextField = orderedExtraFields[index + 1];
        if (nextField) {
            focusElementById(getExtraFieldId(nextField.key));
            return true;
        }
        focusElementById(fieldIds.openingBalance);
        return true;
    };

    return (
        <>
            <div className="flex align-items-center justify-content-between">
                <span className="font-medium text-700">Contact Persons</span>
                <Button label="Add Contact" icon="pi pi-plus" text size="small" onClick={onAddContactPerson} />
            </div>
            {form.contactPersons.length === 0 && <small className="text-600">No contact rows added.</small>}
            {form.contactPersons.map((row, idx) => (
                <div key={row.rowId} className="border-1 surface-border border-round p-2 flex flex-column gap-2">
                    <div className="flex align-items-center justify-content-between">
                        <span className="text-700 text-sm">Contact #{idx + 1}</span>
                        <Button
                            icon="pi pi-trash"
                            text
                            rounded
                            className="p-button-danger p-button-text"
                            onClick={() => onRemoveContactPerson(row.rowId)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Name</label>
                            <AppInput
                                id={getContactFieldId(row.rowId, 'name')}
                                value={row.name}
                                onChange={(e) => onUpdateContactPerson(row.rowId, { name: e.target.value })}
                                onEnterNext={() => focusElementById(getContactFieldId(row.rowId, 'designation'))}
                                placeholder="Contact name"
                            />
                        </span>
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Designation</label>
                            <AppInput
                                id={getContactFieldId(row.rowId, 'designation')}
                                value={row.designation}
                                onChange={(e) =>
                                    onUpdateContactPerson(row.rowId, { designation: e.target.value })
                                }
                                onEnterNext={() => focusElementById(getContactFieldId(row.rowId, 'mobile'))}
                                placeholder="Designation"
                            />
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Mobile</label>
                            <AppInput
                                id={getContactFieldId(row.rowId, 'mobile')}
                                value={row.mobileNumber}
                                onChange={(e) =>
                                    onUpdateContactPerson(row.rowId, { mobileNumber: e.target.value })
                                }
                                onEnterNext={() => focusElementById(getContactFieldId(row.rowId, 'email'))}
                                placeholder="Mobile"
                            />
                        </span>
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Email</label>
                            <AppInput
                                id={getContactFieldId(row.rowId, 'email')}
                                value={row.email}
                                onChange={(e) => onUpdateContactPerson(row.rowId, { email: e.target.value })}
                                onEnterNext={() => focusAfterContactRow(idx)}
                                placeholder="Email"
                            />
                        </span>
                    </div>
                </div>
            ))}

            <div className="flex align-items-center justify-content-between">
                <span className="font-medium text-700">Ledger Sales Taxes</span>
                <Button label="Add Tax Row" icon="pi pi-plus" text size="small" onClick={onAddLedgerSalesTax} />
            </div>
            {form.ledgerSalesTaxes.length === 0 && <small className="text-600">No sales-tax rows added.</small>}
            {form.ledgerSalesTaxes.map((row, idx) => (
                <div key={row.rowId} className="border-1 surface-border border-round p-2 flex flex-column gap-2">
                    <div className="flex align-items-center justify-content-between">
                        <span className="text-700 text-sm">Tax Row #{idx + 1}</span>
                        <Button
                            icon="pi pi-trash"
                            text
                            rounded
                            className="p-button-danger p-button-text"
                            onClick={() => onRemoveLedgerSalesTax(row.rowId)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Tax Name</label>
                            <AppInput
                                id={getSalesTaxFieldId(row.rowId, 'tax-name')}
                                value={row.taxName}
                                onChange={(e) => onUpdateLedgerSalesTax(row.rowId, { taxName: e.target.value })}
                                onEnterNext={() => focusElementById(getSalesTaxFieldId(row.rowId, 'gst-number'))}
                                placeholder="Tax row name"
                            />
                        </span>
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">GST No</label>
                            <AppInput
                                id={getSalesTaxFieldId(row.rowId, 'gst-number')}
                                value={row.gstNumber}
                                onChange={(e) => onUpdateLedgerSalesTax(row.rowId, { gstNumber: e.target.value })}
                                onEnterNext={() => focusElementById(getSalesTaxFieldId(row.rowId, 'tax-rate'))}
                                placeholder="GST number"
                            />
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Tax Rate</label>
                            <AppInput
                                id={getSalesTaxFieldId(row.rowId, 'tax-rate')}
                                value={row.taxRate}
                                onChange={(e) => onUpdateLedgerSalesTax(row.rowId, { taxRate: e.target.value })}
                                onEnterNext={() => focusElementById(getSalesTaxFieldId(row.rowId, 'effective-date'))}
                                placeholder="Tax rate"
                            />
                        </span>
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Effective Date</label>
                            <AppDateInput
                                inputId={getSalesTaxFieldId(row.rowId, 'effective-date')}
                                value={parseStoredDateValue(row.effectiveDate)}
                                onChange={(next) =>
                                    onUpdateLedgerSalesTax(row.rowId, {
                                        effectiveDate: formatDateForStorage(next)
                                    })
                                }
                                onEnterNext={() => focusAfterSalesTaxRow(idx)}
                                placeholder="DD/MM/YYYY"
                            />
                        </span>
                    </div>
                    <span className="flex align-items-center gap-2">
                        <Checkbox
                            inputId={`ledger-sales-tax-active-${row.rowId}`}
                            checked={row.isActiveFlag === 1}
                            onChange={(e) =>
                                onUpdateLedgerSalesTax(row.rowId, { isActiveFlag: e.checked ? 1 : 0 })
                            }
                        />
                        <label htmlFor={`ledger-sales-tax-active-${row.rowId}`} className="font-medium">
                            Active
                        </label>
                    </span>
                </div>
            ))}

            {groupedFieldDefinitions.length > 0 && (
                <div className="flex flex-column gap-2">
                    <span className="font-medium text-700">Additional Fields</span>
                    {groupedFieldDefinitions.map((group) => (
                        <div key={group.groupName} className="flex flex-column gap-2">
                            <span className="text-600 text-sm">{group.groupName}</span>
                            <div className="grid">
                                {group.definitions.map((definition) => (
                                    <div key={definition.id} className="col-12 md:col-6">
                                        <LedgerExtraFieldInput
                                            definition={definition}
                                            value={extraValues[definition.key]}
                                            errorMessage={formErrors[`extraFields.${definition.key}`]}
                                            fiscalRange={fiscalRange}
                                            inputId={getExtraFieldId(definition.key)}
                                            onEnterNext={() =>
                                                focusAfterExtraField(
                                                    orderedExtraFields.findIndex((field) => field.key === definition.key)
                                                )
                                            }
                                            onChange={(value) => onUpdateExtraField(definition.key, value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">{labels.openingBalance}</label>
                    <small className="text-600">Numeric amount; select Dr/Cr on the right.</small>
                    <AppInput
                        id={fieldIds.openingBalance}
                        value={form.openingBalanceAmount}
                        onChange={(e) => onFormChange({ openingBalanceAmount: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.balanceType)}
                        placeholder="0.00"
                        disabled={isEditing && isEditingProtectedLedger}
                    />
                    {renderError(formErrors, 'openingBalanceAmount')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">{labels.drcr}</label>
                    <AppDropdown
                        inputId={fieldIds.balanceType}
                        value={form.balanceType}
                        options={[
                            { label: 'Dr', value: 1 },
                            { label: 'Cr', value: -1 }
                        ]}
                        onChange={(e) => onFormChange({ balanceType: e.value })}
                        onEnterNext={() => focusElementById(fieldIds.save)}
                        placeholder="Select"
                        disabled={isEditing && isEditingProtectedLedger}
                    />
                </span>
            </div>

            <div className="flex flex-wrap gap-4">
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-active-flag"
                        checked={form.isActiveFlag === 1}
                        onChange={(e) => onFormChange({ isActiveFlag: e.checked ? 1 : 0 })}
                        disabled={isEditing && isEditingProtectedLedger}
                    />
                    <label htmlFor="ledger-active-flag" className="font-medium">
                        Active
                    </label>
                </span>
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-reverse-charge-flag"
                        checked={form.isReverseChargeApplicableFlag === 1}
                        onChange={(e) =>
                            onFormChange({ isReverseChargeApplicableFlag: e.checked ? 1 : 0 })
                        }
                    />
                    <label htmlFor="ledger-reverse-charge-flag" className="font-medium">
                        Reverse Charge Applicable
                    </label>
                </span>
                <span className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="ledger-export-flag"
                        checked={form.isExportFlag === 1}
                        onChange={(e) => onFormChange({ isExportFlag: e.checked ? 1 : 0 })}
                    />
                    <label htmlFor="ledger-export-flag" className="font-medium">
                        Export Ledger
                    </label>
                </span>
            </div>
        </>
    );
};
