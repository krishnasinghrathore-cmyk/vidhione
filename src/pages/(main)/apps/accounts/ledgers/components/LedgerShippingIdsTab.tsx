import React from 'react';
import { Button } from 'primereact/button';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { focusElementById } from '@/lib/masterFormDialog';
import type {
    LedgerDropdownOption,
    LedgerFormState,
    ShippingAddressRow
} from '../ledgerFormTypes';

type LedgerShippingIdsTabProps = {
    form: LedgerFormState;
    formErrors: Record<string, string>;
    maxShippingAddresses: number;
    shippingCityOptions: LedgerDropdownOption[];
    labels: {
        mobile: string;
        gst: string;
    };
    fieldIds: {
        creditLimitDays: string;
        creditLimitBills: string;
        officePhone: string;
        residencePhone: string;
        mobile: string;
        gst: string;
        email: string;
        website: string;
        pan: string;
        tin: string;
        tin2: string;
        tin3: string;
        tinFrom2: string;
        tinFrom3: string;
        save: string;
    };
    onFormChange: (patch: Partial<LedgerFormState>) => void;
    onAddShippingAddress: () => void;
    onUpdateShippingAddress: (
        rowId: string,
        patch: Partial<Omit<ShippingAddressRow, 'rowId'>>
    ) => void;
    onRemoveShippingAddress: (rowId: string) => void;
};

const renderError = (formErrors: Record<string, string>, field: string) =>
    formErrors[field] ? <small className="p-error">{formErrors[field]}</small> : null;

export const LedgerShippingIdsTab = ({
    form,
    formErrors,
    maxShippingAddresses,
    shippingCityOptions,
    labels,
    fieldIds,
    onFormChange,
    onAddShippingAddress,
    onUpdateShippingAddress,
    onRemoveShippingAddress
}: LedgerShippingIdsTabProps) => {
    const getRowFieldId = (rowId: string, field: string) => `ledger-shipping-${rowId}-${field}`;

    return (
        <>
            <div className="flex align-items-center justify-content-between">
                <span className="font-medium text-700">Shipping Details</span>
                <Button
                    label="Add Address"
                    icon="pi pi-plus"
                    text
                    size="small"
                    onClick={onAddShippingAddress}
                    disabled={form.shippingAddresses.length >= maxShippingAddresses}
                />
            </div>

            {form.shippingAddresses.map((row, index) => (
                <div key={row.rowId} className="border-1 surface-border border-round p-2 flex flex-column gap-2">
                    <div className="flex align-items-center justify-content-between">
                        <span className="text-700 text-sm">Shipping Address #{index + 1}</span>
                        <Button
                            icon="pi pi-trash"
                            text
                            rounded
                            className="p-button-danger p-button-text"
                            onClick={() => onRemoveShippingAddress(row.rowId)}
                            disabled={form.shippingAddresses.length <= 1}
                        />
                    </div>

                    <div className="flex gap-2">
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Ship Address Line 1</label>
                            <AppInput
                                id={getRowFieldId(row.rowId, 'address-line-1')}
                                value={row.addressLine1}
                                onChange={(e) =>
                                    onUpdateShippingAddress(row.rowId, { addressLine1: e.target.value })
                                }
                                onEnterNext={() => focusElementById(getRowFieldId(row.rowId, 'address-line-2'))}
                                placeholder="Shipping address line 1"
                            />
                        </span>
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Ship Address Line 2</label>
                            <AppInput
                                id={getRowFieldId(row.rowId, 'address-line-2')}
                                value={row.addressLine2}
                                onChange={(e) =>
                                    onUpdateShippingAddress(row.rowId, { addressLine2: e.target.value })
                                }
                                onEnterNext={() => focusElementById(getRowFieldId(row.rowId, 'address-line-3'))}
                                placeholder="Shipping address line 2"
                            />
                        </span>
                    </div>

                    <div className="flex flex-column gap-1">
                        <label className="font-medium">Ship Address Line 3</label>
                        <AppInput
                            id={getRowFieldId(row.rowId, 'address-line-3')}
                            value={row.addressLine3}
                            onChange={(e) =>
                                onUpdateShippingAddress(row.rowId, { addressLine3: e.target.value })
                            }
                            onEnterNext={() => focusElementById(getRowFieldId(row.rowId, 'city'))}
                            placeholder="Shipping address line 3"
                        />
                    </div>

                    <div className="flex gap-2">
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Ship City</label>
                            <AppDropdown
                                inputId={getRowFieldId(row.rowId, 'city')}
                                value={row.cityId}
                                options={shippingCityOptions}
                                onChange={(e) => onUpdateShippingAddress(row.rowId, { cityId: e.value ?? '' })}
                                onEnterNext={() => focusElementById(getRowFieldId(row.rowId, 'postal-code'))}
                                placeholder="Select shipping city"
                                filter
                                showClear
                                className={formErrors[`shippingAddresses.${row.rowId}.cityId`] ? 'p-invalid' : undefined}
                            />
                            {renderError(formErrors, `shippingAddresses.${row.rowId}.cityId`)}
                        </span>
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Ship Postal Code</label>
                            <AppInput
                                id={getRowFieldId(row.rowId, 'postal-code')}
                                value={row.postalCode}
                                onChange={(e) =>
                                    onUpdateShippingAddress(row.rowId, { postalCode: e.target.value })
                                }
                                onEnterNext={() => focusElementById(getRowFieldId(row.rowId, 'office-phone'))}
                                placeholder="Shipping postal code"
                            />
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Ship Office Phone</label>
                            <AppInput
                                id={getRowFieldId(row.rowId, 'office-phone')}
                                value={row.officePhone}
                                onChange={(e) =>
                                    onUpdateShippingAddress(row.rowId, { officePhone: e.target.value })
                                }
                                onEnterNext={() => focusElementById(getRowFieldId(row.rowId, 'residence-phone'))}
                                placeholder="Shipping office phone"
                            />
                        </span>
                        <span className="flex-1 flex flex-column gap-1">
                            <label className="font-medium">Ship Residence Phone</label>
                            <AppInput
                                id={getRowFieldId(row.rowId, 'residence-phone')}
                                value={row.residencePhone}
                                onChange={(e) =>
                                    onUpdateShippingAddress(row.rowId, { residencePhone: e.target.value })
                                }
                                onEnterNext={() => focusElementById(getRowFieldId(row.rowId, 'mobile'))}
                                placeholder="Shipping residence phone"
                            />
                        </span>
                    </div>

                    <div className="flex flex-column gap-1">
                        <label className="font-medium">Ship Mobile</label>
                        <small className="text-600">10-13 digits, numbers only.</small>
                        <AppInput
                            id={getRowFieldId(row.rowId, 'mobile')}
                            value={row.mobileNumber}
                            onChange={(e) =>
                                onUpdateShippingAddress(row.rowId, { mobileNumber: e.target.value })
                            }
                            onEnterNext={() => {
                                const nextRow = form.shippingAddresses[index + 1];
                                if (nextRow) {
                                    focusElementById(getRowFieldId(nextRow.rowId, 'address-line-1'));
                                    return true;
                                }
                                focusElementById(fieldIds.creditLimitDays);
                                return true;
                            }}
                            placeholder="Shipping mobile"
                        />
                        {renderError(formErrors, `shippingAddresses.${row.rowId}.mobileNumber`)}
                    </div>
                </div>
            ))}

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Credit Limit (Days)</label>
                    <AppInput
                        id={fieldIds.creditLimitDays}
                        value={form.creditLimitNoOfDays}
                        onChange={(e) => onFormChange({ creditLimitNoOfDays: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.creditLimitBills)}
                        placeholder="No of days"
                    />
                    {renderError(formErrors, 'creditLimitNoOfDays')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Credit Limit (Bills)</label>
                    <AppInput
                        id={fieldIds.creditLimitBills}
                        value={form.creditLimitNoOfBills}
                        onChange={(e) => onFormChange({ creditLimitNoOfBills: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.officePhone)}
                        placeholder="No of bills"
                    />
                    {renderError(formErrors, 'creditLimitNoOfBills')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Office Phone</label>
                    <AppInput
                        id={fieldIds.officePhone}
                        value={form.officePhone}
                        onChange={(e) => onFormChange({ officePhone: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.residencePhone)}
                        placeholder="Office phone"
                    />
                    {renderError(formErrors, 'officePhone')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Residence Phone</label>
                    <AppInput
                        id={fieldIds.residencePhone}
                        value={form.residencePhone}
                        onChange={(e) => onFormChange({ residencePhone: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.mobile)}
                        placeholder="Residence phone"
                    />
                    {renderError(formErrors, 'residencePhone')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">{labels.mobile}</label>
                    <small className="text-600">10-13 digits, numbers only.</small>
                    <AppInput
                        id={fieldIds.mobile}
                        value={form.mobileNumber}
                        onChange={(e) => onFormChange({ mobileNumber: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.gst)}
                        placeholder="Mobile"
                    />
                    {renderError(formErrors, 'mobileNumber')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">{labels.gst}</label>
                    <small className="text-600">15 chars, A-Z/0-9 (GSTIN).</small>
                    <AppInput
                        id={fieldIds.gst}
                        value={form.gstNumber}
                        onChange={(e) => onFormChange({ gstNumber: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.email)}
                        placeholder="GST"
                    />
                    {renderError(formErrors, 'gstNumber')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Email</label>
                    <AppInput
                        id={fieldIds.email}
                        value={form.email}
                        onChange={(e) => onFormChange({ email: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.website)}
                        placeholder="Email"
                    />
                    {renderError(formErrors, 'email')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Website</label>
                    <AppInput
                        id={fieldIds.website}
                        value={form.website}
                        onChange={(e) => onFormChange({ website: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.pan)}
                        placeholder="Website"
                    />
                    {renderError(formErrors, 'website')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">PAN No</label>
                    <AppInput
                        id={fieldIds.pan}
                        value={form.panNumber}
                        onChange={(e) => onFormChange({ panNumber: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.tin)}
                        placeholder="PAN"
                    />
                    {renderError(formErrors, 'panNumber')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">TIN No</label>
                    <AppInput
                        id={fieldIds.tin}
                        value={form.tinNumber}
                        onChange={(e) => onFormChange({ tinNumber: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.tin2)}
                        placeholder="TIN"
                    />
                    {renderError(formErrors, 'tinNumber')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">TIN No 2</label>
                    <AppInput
                        id={fieldIds.tin2}
                        value={form.tinNumber2}
                        onChange={(e) => onFormChange({ tinNumber2: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.tin3)}
                        placeholder="TIN No 2"
                    />
                    {renderError(formErrors, 'tinNumber2')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">TIN No 3</label>
                    <AppInput
                        id={fieldIds.tin3}
                        value={form.tinNumber3}
                        onChange={(e) => onFormChange({ tinNumber3: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.tinFrom2)}
                        placeholder="TIN No 3"
                    />
                    {renderError(formErrors, 'tinNumber3')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">TIN No From 2</label>
                    <AppInput
                        id={fieldIds.tinFrom2}
                        value={form.tinNumberFrom2}
                        onChange={(e) => onFormChange({ tinNumberFrom2: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.tinFrom3)}
                        placeholder="TIN No From 2"
                    />
                    {renderError(formErrors, 'tinNumberFrom2')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">TIN No From 3</label>
                    <AppInput
                        id={fieldIds.tinFrom3}
                        value={form.tinNumberFrom3}
                        onChange={(e) => onFormChange({ tinNumberFrom3: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.save)}
                        placeholder="TIN No From 3"
                    />
                    {renderError(formErrors, 'tinNumberFrom3')}
                </span>
            </div>
        </>
    );
};
