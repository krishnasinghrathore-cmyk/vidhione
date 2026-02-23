'use client';
import React, { useRef } from 'react';
import { Toast } from 'primereact/toast';
import { CompanyProfileForm } from './CompanyProfileForm';
import { useCompanyProfileForm } from './useCompanyProfileForm';

export default function CompanyProfilePage() {
    const toastRef = useRef<Toast>(null);
    const {
        form,
        setForm,
        formErrors,
        hasCompany,
        loading,
        saving,
        error,
        countries,
        states,
        districts,
        filteredCities,
        groupedFieldDefinitions,
        fiscalRange,
        geoImportVisible,
        setGeoImportVisible,
        saveCompany,
        resetForm
    } = useCompanyProfileForm();

    const handleSave = async () => {
        try {
            await saveCompany();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: hasCompany ? 'Company profile updated.' : 'Company profile created.'
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save company profile';
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: message });
        }
    };

    return (
        <div className="card app-gradient-card p-fluid">
            <Toast ref={toastRef} />
            <CompanyProfileForm
                form={form}
                formErrors={formErrors}
                hasCompany={hasCompany}
                loading={loading}
                saving={saving}
                error={error}
                countries={countries}
                states={states}
                districts={districts}
                cities={filteredCities}
                groupedFieldDefinitions={groupedFieldDefinitions}
                fiscalRange={fiscalRange}
                geoImportVisible={geoImportVisible}
                onSetGeoImportVisible={setGeoImportVisible}
                onReset={resetForm}
                onSave={handleSave}
                onFormChange={setForm}
            />
        </div>
    );
}
