import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import GeoImportDialog from '@/components/GeoImportDialog';
import { ReportHeader } from '@/components/ReportHeader';
import type {
    CompanyProfileFieldDefinition,
    CompanyProfileFieldDefinitionGroup,
    CompanyProfileFormErrors,
    CompanyProfileFormState,
    CompanyProfileFiscalRange,
    CompanyProfileCountryOption,
    CompanyProfileStateOption,
    CompanyProfileDistrictOption,
    CompanyProfileCityOption
} from './types';
import {
    createCustomPairId,
    normalizeExtraFields,
    parseExtraDateValue,
    parseFieldOptions
} from './utils';

type Props = {
    form: CompanyProfileFormState;
    formErrors: CompanyProfileFormErrors;
    loading: boolean;
    saving: boolean;
    error: string | null;
    hasCompany: boolean;
    countries: CompanyProfileCountryOption[];
    states: CompanyProfileStateOption[];
    districts: CompanyProfileDistrictOption[];
    cities: CompanyProfileCityOption[];
    groupedFieldDefinitions: CompanyProfileFieldDefinitionGroup[];
    fiscalRange: CompanyProfileFiscalRange;
    geoImportVisible: boolean;
    onSetGeoImportVisible: (visible: boolean) => void;
    onReset: () => void;
    onSave: () => void;
    onFormChange: React.Dispatch<React.SetStateAction<CompanyProfileFormState>>;
};

const sectionTitle = (title: string, action?: React.ReactNode) => (
    <div className="flex align-items-center justify-content-between gap-2">
        <div className="voucher-options-modal__section-title">{title}</div>
        {action}
    </div>
);

export const CompanyProfileForm = ({
    form,
    formErrors,
    loading,
    saving,
    error,
    hasCompany,
    countries,
    states,
    districts,
    cities,
    groupedFieldDefinitions,
    fiscalRange,
    geoImportVisible,
    onSetGeoImportVisible,
    onReset,
    onSave,
    onFormChange
}: Props) => {
    const disableActions = loading || saving;
    const dynamicValues = normalizeExtraFields(form.extraFields);

    const updateExtraField = (key: string, value: unknown) => {
        onFormChange((previous) => ({
            ...previous,
            extraFields: {
                ...normalizeExtraFields(previous.extraFields),
                [key]: value
            }
        }));
    };

    const updateCustomPair = (id: string, patch: Partial<{ key: string; value: string }>) => {
        onFormChange((previous) => ({
            ...previous,
            customPairs: previous.customPairs.map((pair) =>
                pair.id === id ? { ...pair, ...patch } : pair
            )
        }));
    };

    const removeCustomPair = (id: string) => {
        onFormChange((previous) => ({
            ...previous,
            customPairs: previous.customPairs.filter((pair) => pair.id !== id)
        }));
    };

    const addCustomPair = () => {
        onFormChange((previous) => ({
            ...previous,
            customPairs: [...previous.customPairs, { id: createCustomPairId(), key: '', value: '' }]
        }));
    };

    const renderExtraField = (definition: CompanyProfileFieldDefinition) => {
        const value = dynamicValues[definition.key];
        const errorKey = `extraFields.${definition.key}`;
        const errorText = formErrors[errorKey];

        switch (definition.fieldType) {
            case 'number': {
                const raw = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : null;
                const parsedNumber = raw != null && Number.isFinite(raw) ? raw : null;
                return (
                    <div className="flex flex-column gap-1">
                        <label className="block text-600 mb-1">
                            {definition.label}
                            {definition.required ? (
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            ) : null}
                        </label>
                        <InputNumber
                            value={parsedNumber}
                            onValueChange={(event) => updateExtraField(definition.key, event.value ?? null)}
                            className={errorText ? 'w-full p-invalid' : 'w-full'}
                            useGrouping={false}
                        />
                        {errorText ? <small className="p-error">{errorText}</small> : null}
                    </div>
                );
            }
            case 'boolean':
                return (
                    <div className="flex flex-column gap-2">
                        <label className="block text-600 mb-1">
                            {definition.label}
                            {definition.required ? (
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            ) : null}
                        </label>
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId={`extra-${definition.key}`}
                                checked={Boolean(value)}
                                onChange={(event) => updateExtraField(definition.key, event.checked)}
                            />
                            <label htmlFor={`extra-${definition.key}`} className="text-600">
                                {definition.label}
                            </label>
                        </div>
                        {errorText ? <small className="p-error">{errorText}</small> : null}
                    </div>
                );
            case 'date': {
                const parsedDate = parseExtraDateValue(value);
                return (
                    <div className="flex flex-column gap-1">
                        <label className="block text-600 mb-1">
                            {definition.label}
                            {definition.required ? (
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            ) : null}
                        </label>
                        <AppDateInput
                            value={parsedDate}
                            onChange={(next) =>
                                updateExtraField(
                                    definition.key,
                                    next ? next.toISOString().slice(0, 10) : null
                                )
                            }
                            placeholder="DD/MM/YYYY"
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            className={errorText ? 'p-invalid' : undefined}
                        />
                        {errorText ? <small className="p-error">{errorText}</small> : null}
                    </div>
                );
            }
            case 'select': {
                const options = parseFieldOptions(definition.options);
                return (
                    <div className="flex flex-column gap-1">
                        <label className="block text-600 mb-1">
                            {definition.label}
                            {definition.required ? (
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            ) : null}
                        </label>
                        <AppDropdown
                            value={value ?? null}
                            options={options}
                            onChange={(event) => updateExtraField(definition.key, event.value)}
                            placeholder={`Select ${definition.label}`}
                            showClear
                            filter
                            className={errorText ? 'w-full p-invalid' : 'w-full'}
                        />
                        {errorText ? <small className="p-error">{errorText}</small> : null}
                    </div>
                );
            }
            case 'multi-select': {
                const options = parseFieldOptions(definition.options);
                return (
                    <div className="flex flex-column gap-1">
                        <label className="block text-600 mb-1">
                            {definition.label}
                            {definition.required ? (
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            ) : null}
                        </label>
                        <AppMultiSelect
                            value={Array.isArray(value) ? value : []}
                            options={options}
                            onChange={(event) => updateExtraField(definition.key, event.value ?? [])}
                            placeholder={`Select ${definition.label}`}
                            display="chip"
                            className={errorText ? 'w-full p-invalid' : 'w-full'}
                        />
                        {errorText ? <small className="p-error">{errorText}</small> : null}
                    </div>
                );
            }
            default:
                return (
                    <div className="flex flex-column gap-1">
                        <label className="block text-600 mb-1">
                            {definition.label}
                            {definition.required ? (
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            ) : null}
                        </label>
                        <AppInput
                            value={String(value ?? '')}
                            onChange={(event) => updateExtraField(definition.key, event.target.value)}
                            placeholder={definition.label}
                            className={errorText ? 'w-full p-invalid' : 'w-full'}
                        />
                        {errorText ? <small className="p-error">{errorText}</small> : null}
                    </div>
                );
        }
    };

    return (
        <>
            <ReportHeader
                title="Company Profile"
                subtitle="Legacy-aligned company master profile with dynamic fields and key-value metadata."
            />

            {error ? <p className="text-red-500 mt-2 mb-0">{error}</p> : null}
            {!hasCompany && !loading ? (
                <p className="mt-2 mb-0 text-600">
                    No company record is configured yet. Fill this form and save to create the primary company profile.
                </p>
            ) : null}

            <div className="company-profile-form voucher-options-modal__form flex flex-column mt-3">
                <div className="voucher-options-modal__section">
                    {sectionTitle('Basic Information')}
                    <div className="voucher-options-modal__divider" />
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">
                                Company Name
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            </label>
                            <AppInput
                                value={form.name}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, name: event.target.value }))
                                }
                                className={formErrors.name ? 'w-full p-invalid' : 'w-full'}
                            />
                            {formErrors.name ? <small className="p-error">{formErrors.name}</small> : null}
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">
                                Company Alias
                                <span className="text-red-500 ml-1" aria-hidden="true">
                                    *
                                </span>
                            </label>
                            <AppInput
                                value={form.alias}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, alias: event.target.value }))
                                }
                                className={formErrors.alias ? 'w-full p-invalid' : 'w-full'}
                            />
                            {formErrors.alias ? <small className="p-error">{formErrors.alias}</small> : null}
                        </div>
                    </div>
                </div>

                <div className="voucher-options-modal__section">
                    {sectionTitle(
                        'Address & Location',
                        <Button
                            label="Import from master"
                            icon="pi pi-download"
                            className="p-button-text p-button-sm"
                            onClick={() => onSetGeoImportVisible(true)}
                            disabled={disableActions}
                        />
                    )}
                    <div className="voucher-options-modal__divider" />
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12">
                            <label className="block text-600 mb-1">Address Line 1</label>
                            <AppInput
                                value={form.addressLine1}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        addressLine1: event.target.value
                                    }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12">
                            <label className="block text-600 mb-1">Address Line 2</label>
                            <AppInput
                                value={form.addressLine2}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        addressLine2: event.target.value
                                    }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12">
                            <label className="block text-600 mb-1">Address Line 3</label>
                            <AppInput
                                value={form.addressLine3}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        addressLine3: event.target.value
                                    }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Country</label>
                            <AppDropdown
                                value={form.countryId}
                                options={countries.map((country) => ({
                                    label: `${country.name ?? ''}${country.iso2 ? ` (${country.iso2})` : ''}`,
                                    value: country.countryId
                                }))}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        countryId: event.value ?? null,
                                        stateId: null,
                                        districtId: null,
                                        cityId: null
                                    }))
                                }
                                placeholder="Select country"
                                showClear
                                filter
                                className={formErrors.countryId ? 'w-full p-invalid' : 'w-full'}
                            />
                            {formErrors.countryId ? <small className="p-error">{formErrors.countryId}</small> : null}
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">State</label>
                            <AppDropdown
                                value={form.stateId}
                                options={states.map((state) => ({
                                    label: `${state.name ?? ''}${state.stateCode ? ` (${state.stateCode})` : ''}`,
                                    value: state.stateId
                                }))}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        stateId: event.value ?? null,
                                        districtId: null,
                                        cityId: null
                                    }))
                                }
                                placeholder={form.countryId ? 'Select state' : 'Select country first'}
                                showClear
                                filter
                                disabled={!form.countryId}
                                className={formErrors.stateId ? 'w-full p-invalid' : 'w-full'}
                            />
                            {formErrors.stateId ? <small className="p-error">{formErrors.stateId}</small> : null}
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">District</label>
                            <AppDropdown
                                value={form.districtId}
                                options={districts.map((district) => ({
                                    label: district.name ?? String(district.districtId),
                                    value: district.districtId
                                }))}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        districtId: event.value ?? null,
                                        cityId: null
                                    }))
                                }
                                placeholder={form.stateId ? 'Select district' : 'Select state first'}
                                showClear
                                filter
                                disabled={!form.stateId}
                                className={formErrors.districtId ? 'w-full p-invalid' : 'w-full'}
                            />
                            {formErrors.districtId ? <small className="p-error">{formErrors.districtId}</small> : null}
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">City</label>
                            <AppDropdown
                                value={form.cityId}
                                options={cities.map((city) => ({
                                    label: city.name ?? String(city.cityId),
                                    value: city.cityId
                                }))}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, cityId: event.value ?? null }))
                                }
                                placeholder={form.districtId ? 'Select city' : 'Select district first'}
                                showClear
                                filter
                                disabled={!form.districtId}
                                className={formErrors.cityId ? 'w-full p-invalid' : 'w-full'}
                            />
                            {formErrors.cityId ? <small className="p-error">{formErrors.cityId}</small> : null}
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Postal Code</label>
                            <AppInput
                                value={form.postalCode}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, postalCode: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="voucher-options-modal__section">
                    {sectionTitle('Contact')}
                    <div className="voucher-options-modal__divider" />
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Email</label>
                            <AppInput
                                value={form.email}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, email: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Website</label>
                            <AppInput
                                value={form.website}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, website: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">Office Phone</label>
                            <AppInput
                                value={form.officePhone}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, officePhone: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">Residence Phone</label>
                            <AppInput
                                value={form.residencePhone}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, residencePhone: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">Mobile Number</label>
                            <AppInput
                                value={form.mobileNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, mobileNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">Fax Number</label>
                            <AppInput
                                value={form.faxNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, faxNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="voucher-options-modal__section">
                    {sectionTitle('Tax & IDs')}
                    <div className="voucher-options-modal__divider" />
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">Service Tax Number</label>
                            <AppInput
                                value={form.serviceTaxNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        serviceTaxNumber: event.target.value
                                    }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">PAN Number</label>
                            <AppInput
                                value={form.panNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, panNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">CST Number</label>
                            <AppInput
                                value={form.cstNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, cstNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">VAT Number</label>
                            <AppInput
                                value={form.vatNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, vatNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">TIN Number</label>
                            <AppInput
                                value={form.tinNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, tinNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="voucher-options-modal__section">
                    {sectionTitle('Fiscal Year')}
                    <div className="voucher-options-modal__divider" />
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Financial Year Start</label>
                            <AppInput
                                value={form.financialYearStart}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        financialYearStart: event.target.value
                                    }))
                                }
                                className="w-full"
                                placeholder="YYYYMMDD or DD/MM/YYYY"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Financial Year End</label>
                            <AppInput
                                value={form.financialYearEnd}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        financialYearEnd: event.target.value
                                    }))
                                }
                                className="w-full"
                                placeholder="YYYYMMDD or DD/MM/YYYY"
                            />
                        </div>
                    </div>
                </div>

                <div className="voucher-options-modal__section">
                    {sectionTitle('Banking')}
                    <div className="voucher-options-modal__divider" />
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Bank Name</label>
                            <AppInput
                                value={form.bankName}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, bankName: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Branch Name</label>
                            <AppInput
                                value={form.branchName}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, branchName: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">Account Number</label>
                            <AppInput
                                value={form.accountNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, accountNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">IFSC Code</label>
                            <AppInput
                                value={form.ifscCode}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, ifscCode: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">RTGS Number</label>
                            <AppInput
                                value={form.rtgsNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, rtgsNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="voucher-options-modal__section">
                    {sectionTitle('Other')}
                    <div className="voucher-options-modal__divider" />
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12">
                            <label className="block text-600 mb-1">Sign Image Path</label>
                            <AppInput
                                value={form.signImagePath}
                                onChange={(event) =>
                                    onFormChange((previous) => ({
                                        ...previous,
                                        signImagePath: event.target.value
                                    }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">PF Number</label>
                            <AppInput
                                value={form.pfNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, pfNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">ESI Number</label>
                            <AppInput
                                value={form.esiNumber}
                                onChange={(event) =>
                                    onFormChange((previous) => ({ ...previous, esiNumber: event.target.value }))
                                }
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {groupedFieldDefinitions.length > 0 ? (
                    <div className="voucher-options-modal__section">
                        {sectionTitle('Dynamic Fields')}
                        <div className="voucher-options-modal__divider" />
                        <div className="grid voucher-options-modal__grid">
                            {groupedFieldDefinitions.map((group) => (
                                <React.Fragment key={group.groupName}>
                                    <div className="col-12">
                                        <span className="text-600 text-sm">{group.groupName}</span>
                                    </div>
                                    {group.definitions.map((definition) => (
                                        <div key={definition.id} className="col-12 md:col-6">
                                            {renderExtraField(definition)}
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="voucher-options-modal__section">
                    {sectionTitle(
                        'Additional Key-Value Fields',
                        <Button
                            label="Add Field"
                            icon="pi pi-plus"
                            className="p-button-text p-button-sm"
                            onClick={addCustomPair}
                            disabled={disableActions}
                        />
                    )}
                    <div className="voucher-options-modal__divider" />
                    {form.customPairs.length === 0 ? (
                        <p className="m-0 text-600 text-sm">
                            Add custom metadata fields as key/value pairs. These are stored in the extraFields JSON.
                        </p>
                    ) : (
                        <div className="grid voucher-options-modal__grid">
                            {form.customPairs.map((pair) => {
                                const keyError = formErrors[`customPairs.${pair.id}.key`];
                                const valueError = formErrors[`customPairs.${pair.id}.value`];
                                return (
                                    <React.Fragment key={pair.id}>
                                        <div className="col-12 md:col-4">
                                            <label className="block text-600 mb-1">Key</label>
                                            <AppInput
                                                value={pair.key}
                                                onChange={(event) =>
                                                    updateCustomPair(pair.id, { key: event.target.value })
                                                }
                                                placeholder="e.g. gstPortalCode"
                                                className={keyError ? 'w-full p-invalid' : 'w-full'}
                                            />
                                            {keyError ? <small className="p-error">{keyError}</small> : null}
                                        </div>
                                        <div className="col-12 md:col-7">
                                            <label className="block text-600 mb-1">Value</label>
                                            <AppInput
                                                value={pair.value}
                                                onChange={(event) =>
                                                    updateCustomPair(pair.id, { value: event.target.value })
                                                }
                                                placeholder="Value"
                                                className={valueError ? 'w-full p-invalid' : 'w-full'}
                                            />
                                            {valueError ? <small className="p-error">{valueError}</small> : null}
                                        </div>
                                        <div className="col-12 md:col-1 flex align-items-end">
                                            <Button
                                                icon="pi pi-trash"
                                                className="p-button-text p-button-danger"
                                                onClick={() => removeCustomPair(pair.id)}
                                                disabled={disableActions}
                                                aria-label="Remove key value field"
                                            />
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            {formErrors.customPairs ? (
                                <div className="col-12">
                                    <small className="p-error">{formErrors.customPairs}</small>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="flex justify-content-end gap-2 mt-2">
                    <Button label="Reset" outlined onClick={onReset} disabled={saving} />
                    <Button
                        label={saving ? 'Saving...' : 'Save Changes'}
                        icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                        onClick={onSave}
                        disabled={saving}
                    />
                </div>
            </div>

            <GeoImportDialog
                visible={geoImportVisible}
                onHide={() => onSetGeoImportVisible(false)}
                onApply={(selection) => {
                    onFormChange((previous) => ({
                        ...previous,
                        countryId: selection.countryId ?? previous.countryId,
                        stateId: selection.stateId ?? null,
                        districtId: selection.districtId ?? null,
                        cityId: selection.cityId ?? null
                    }));
                    onSetGeoImportVisible(false);
                }}
                title="Import location from master"
            />
        </>
    );
};
