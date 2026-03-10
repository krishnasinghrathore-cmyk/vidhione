import React from 'react';
import { Button } from 'primereact/button';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { focusElementById } from '@/lib/masterFormDialog';
import type { LedgerDropdownOption, LedgerFormState } from '../ledgerFormTypes';

type LedgerGeneralTabProps = {
    form: LedgerFormState;
    formErrors: Record<string, string>;
    isEditingProtectedLedger: boolean;
    ledgerGroupOptions: LedgerDropdownOption[];
    countryOptions: LedgerDropdownOption[];
    stateOptions: LedgerDropdownOption[];
    districtOptions: LedgerDropdownOption[];
    cityOptions: LedgerDropdownOption[];
    areaOptions: LedgerDropdownOption[];
    fieldIds: {
        ledgerName: string;
        ledgerGroup: string;
        ledgerAlias: string;
        ledgerPostalCode: string;
        ledgerAddress1: string;
        ledgerAddress2: string;
        ledgerAddress3: string;
        ledgerCountry: string;
        ledgerState: string;
        ledgerDistrict: string;
        ledgerCity: string;
        ledgerArea: string;
        ledgerSave: string;
    };
    labels: {
        name: string;
        group: string;
    };
    onFormChange: (patch: Partial<LedgerFormState>) => void;
    onOpenGeoImport: () => void;
};

const renderError = (formErrors: Record<string, string>, field: string) =>
    formErrors[field] ? <small className="p-error">{formErrors[field]}</small> : null;

export const LedgerGeneralTab = ({
    form,
    formErrors,
    isEditingProtectedLedger,
    ledgerGroupOptions,
    countryOptions,
    stateOptions,
    districtOptions,
    cityOptions,
    areaOptions,
    fieldIds,
    labels,
    onFormChange,
    onOpenGeoImport
}: LedgerGeneralTabProps) => {
    return (
        <>
            <div className="flex flex-column gap-1">
                <label className="font-medium">
                    {labels.name} <span className="p-error">*</span>
                </label>
                <AppInput
                    id={fieldIds.ledgerName}
                    autoFocus
                    value={form.name}
                    onChange={(e) => onFormChange({ name: e.target.value })}
                    onEnterNext={() => focusElementById(fieldIds.ledgerGroup)}
                    placeholder="Ledger name"
                    className={formErrors.name ? 'p-invalid' : undefined}
                />
                {renderError(formErrors, 'name')}
            </div>

            <div className="flex flex-column gap-1">
                <label className="font-medium">
                    {labels.group} <span className="p-error">*</span>
                </label>
                <AppDropdown
                    inputId={fieldIds.ledgerGroup}
                    value={form.ledgerGroupId}
                    options={ledgerGroupOptions}
                    onChange={(e) => onFormChange({ ledgerGroupId: e.value ?? '' })}
                    onEnterNext={() => focusElementById(fieldIds.ledgerAlias)}
                    placeholder="Select group"
                    filter
                    showClear
                    disabled={isEditingProtectedLedger}
                    className={formErrors.ledgerGroupId ? 'p-invalid' : undefined}
                />
                {renderError(formErrors, 'ledgerGroupId')}
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Alias</label>
                    <AppInput
                        id={fieldIds.ledgerAlias}
                        value={form.alias}
                        onChange={(e) => onFormChange({ alias: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.ledgerPostalCode)}
                        placeholder="Short alias"
                    />
                    {renderError(formErrors, 'alias')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Postal Code</label>
                    <AppInput
                        id={fieldIds.ledgerPostalCode}
                        value={form.postalCode}
                        onChange={(e) => onFormChange({ postalCode: e.target.value })}
                        onEnterNext={() => focusElementById(fieldIds.ledgerAddress1)}
                        placeholder="Postal code"
                    />
                    {renderError(formErrors, 'postalCode')}
                </span>
            </div>

            <div className="flex flex-column gap-1">
                <label className="font-medium">Address Line 1</label>
                <AppInput
                    id={fieldIds.ledgerAddress1}
                    value={form.addressLine1}
                    onChange={(e) => onFormChange({ addressLine1: e.target.value })}
                    onEnterNext={() => focusElementById(fieldIds.ledgerAddress2)}
                    placeholder="Street / Building"
                />
                {renderError(formErrors, 'addressLine1')}
            </div>

            <div className="flex flex-column gap-1">
                <label className="font-medium">Address Line 2</label>
                <AppInput
                    id={fieldIds.ledgerAddress2}
                    value={form.addressLine2}
                    onChange={(e) => onFormChange({ addressLine2: e.target.value })}
                    onEnterNext={() => focusElementById(fieldIds.ledgerAddress3)}
                    placeholder="Area / Landmark"
                />
                {renderError(formErrors, 'addressLine2')}
            </div>

            <div className="flex flex-column gap-1">
                <label className="font-medium">Address Line 3</label>
                <AppInput
                    id={fieldIds.ledgerAddress3}
                    value={form.addressLine3}
                    onChange={(e) => onFormChange({ addressLine3: e.target.value })}
                    onEnterNext={() => focusElementById(fieldIds.ledgerCountry)}
                    placeholder="Additional details"
                />
                {renderError(formErrors, 'addressLine3')}
            </div>

            <div className="flex align-items-center justify-content-between">
                <span className="font-medium text-700">Location</span>
                <Button
                    label="Import from master"
                    icon="pi pi-download"
                    text
                    size="small"
                    onClick={onOpenGeoImport}
                />
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">Country</label>
                    <AppDropdown
                        inputId={fieldIds.ledgerCountry}
                        value={form.countryId}
                        options={countryOptions}
                        onChange={(e) =>
                            onFormChange({
                                countryId: e.value ?? '',
                                stateId: '',
                                districtId: '',
                                cityId: '',
                                areaId: ''
                            })
                        }
                        onEnterNext={() => focusElementById(fieldIds.ledgerState)}
                        placeholder="Select country"
                        filter
                        showClear
                        className={formErrors.countryId ? 'p-invalid' : undefined}
                    />
                    {renderError(formErrors, 'countryId')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">State</label>
                    <AppDropdown
                        inputId={fieldIds.ledgerState}
                        value={form.stateId}
                        options={stateOptions}
                        onChange={(e) =>
                            onFormChange({
                                stateId: e.value ?? '',
                                districtId: '',
                                cityId: '',
                                areaId: ''
                            })
                        }
                        onEnterNext={() => focusElementById(fieldIds.ledgerDistrict)}
                        placeholder={form.countryId ? 'Select state' : 'Select country first'}
                        filter
                        showClear
                        disabled={!form.countryId}
                        className={formErrors.stateId ? 'p-invalid' : undefined}
                    />
                    {renderError(formErrors, 'stateId')}
                </span>
            </div>

            <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">District</label>
                    <AppDropdown
                        inputId={fieldIds.ledgerDistrict}
                        value={form.districtId}
                        options={districtOptions}
                        onChange={(e) =>
                            onFormChange({
                                districtId: e.value ?? '',
                                cityId: '',
                                areaId: ''
                            })
                        }
                        onEnterNext={() => focusElementById(fieldIds.ledgerCity)}
                        placeholder={form.stateId ? 'Select district' : 'Select state first'}
                        filter
                        showClear
                        disabled={!form.stateId}
                        className={formErrors.districtId ? 'p-invalid' : undefined}
                    />
                    {renderError(formErrors, 'districtId')}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                    <label className="font-medium">City</label>
                    <AppDropdown
                        inputId={fieldIds.ledgerCity}
                        value={form.cityId}
                        options={cityOptions}
                        onChange={(e) => onFormChange({ cityId: e.value ?? '', areaId: '' })}
                        onEnterNext={() => focusElementById(fieldIds.ledgerArea)}
                        placeholder={form.districtId ? 'Select city' : 'Select district first'}
                        filter
                        showClear
                        disabled={!form.districtId}
                        className={formErrors.cityId ? 'p-invalid' : undefined}
                    />
                    {renderError(formErrors, 'cityId')}
                </span>
            </div>

            <div className="flex flex-column gap-1">
                <label className="font-medium">Area</label>
                <AppDropdown
                    inputId={fieldIds.ledgerArea}
                    value={form.areaId}
                    options={areaOptions}
                    onChange={(e) => onFormChange({ areaId: e.value ?? '' })}
                    onEnterNext={() => focusElementById(fieldIds.ledgerSave)}
                    placeholder={form.cityId ? 'Select area' : 'Select city first'}
                    filter
                    showClear
                    disabled={!form.cityId}
                    className={formErrors.areaId ? 'p-invalid' : undefined}
                />
                {renderError(formErrors, 'areaId')}
            </div>
        </>
    );
};
