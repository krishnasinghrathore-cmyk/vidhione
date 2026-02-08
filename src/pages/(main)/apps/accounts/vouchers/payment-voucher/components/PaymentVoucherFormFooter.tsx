'use client';
import React from 'react';
import { Button } from 'primereact/button';
import type { AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppInput from '@/components/AppInput';
import { LabelWithIcon } from './LabelWithIcon';
import type { SelectOption } from '../types';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';

type PaymentVoucherFormFooterProps = {
    viewProps: PaymentVoucherViewProps;
    renderFormError: (key: string) => React.ReactNode;
};

export function PaymentVoucherFormFooter({ viewProps, renderFormError }: PaymentVoucherFormFooterProps) {
    const {
        isCashMode,
        isBankMode,
        isChequePayment,
        isFormActive,
        saving,
        managerValue,
        formManagerSuggestions,
        setFormManagerQuery,
        setFormManagerSuggestions,
        filterOptions,
        managerOptions,
        managersLoading,
        paidByInputRef,
        focusSaveButton,
        clearFormError,
        setFormManagerId,
        chequeInFavour,
        setChequeInFavour,
        openAdd,
        openEdit,
        save,
        cancelForm,
        handleDelete,
        cancelledChecked,
        setCancelledChecked,
        editingId,
        saveButtonId,
        selectedRow
    } = viewProps;

    return (
        <>
            <div className="grid">
                {isCashMode && (
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">
                            <LabelWithIcon icon="pi-user">Paid By</LabelWithIcon>
                        </label>
                        <AppAutoComplete
                            value={managerValue}
                            suggestions={formManagerSuggestions}
                            completeMethod={(event: AutoCompleteCompleteEvent) => {
                                const query = event.query ?? '';
                                setFormManagerQuery(query);
                                setFormManagerSuggestions(filterOptions(managerOptions, query));
                            }}
                            onFocus={() => {
                                setFormManagerSuggestions([...managerOptions]);
                            }}
                            onDropdownClick={() => setFormManagerSuggestions([...managerOptions])}
                            onChange={(event: AutoCompleteChangeEvent) => {
                                const value = event.value as SelectOption | string | null;
                                clearFormError('managerId');
                                if (value == null) {
                                    setFormManagerQuery('');
                                    setFormManagerId(null);
                                    return;
                                }
                                if (typeof value === 'string') {
                                    const trimmed = value.trim();
                                    if (!trimmed) {
                                        setFormManagerQuery('');
                                        setFormManagerId(null);
                                        return;
                                    }
                                    const match =
                                        formManagerSuggestions.find(
                                            (option) => option.label.toLowerCase() === trimmed.toLowerCase()
                                        ) ??
                                        managerOptions.find(
                                            (option) => option.label.toLowerCase() === trimmed.toLowerCase()
                                        ) ??
                                        null;
                                    if (match) {
                                        setFormManagerQuery('');
                                        setFormManagerId(match.value);
                                        return;
                                    }
                                    setFormManagerQuery(value);
                                    setFormManagerId(null);
                                    return;
                                }
                                setFormManagerQuery('');
                                setFormManagerId(Number(value.value));
                            }}
                            field="label"
                            placeholder="Select manager"
                            showEmptyMessage
                            loading={managersLoading}
                            showLoadingIcon
                            disabled={!isFormActive}
                            style={{ width: '220px' }}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                const overlay = paidByInputRef.current?.getOverlay?.();
                                const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
                                if (overlayVisible) return;
                                event.preventDefault();
                                event.stopPropagation();
                                window.setTimeout(focusSaveButton, 0);
                            }}
                            ref={paidByInputRef}
                        />
                        {renderFormError('managerId')}
                    </div>
                )}
                {isBankMode && isChequePayment && (
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">
                            <LabelWithIcon icon="pi-user-edit">Cheque In Favour</LabelWithIcon>
                        </label>
                        <AppInput
                            value={chequeInFavour}
                            onChange={(e) => setChequeInFavour(e.target.value)}
                            style={{ width: '100%' }}
                            disabled={!isFormActive}
                        />
                    </div>
                )}
            </div>

            <div className="flex align-items-center justify-content-center flex-wrap mt-3 gap-2 app-entry-actionsbar">
                <div className="flex flex-wrap app-entry-form-actions">
                    <Button
                        label="Add"
                        icon="pi pi-plus"
                        className="app-action-compact p-button-outlined"
                        onClick={openAdd}
                        disabled={saving}
                    />
                    <Button
                        label="Edit"
                        icon="pi pi-pencil"
                        className="app-action-compact p-button-outlined"
                        onClick={openEdit}
                        disabled={!selectedRow || saving}
                    />
                    <Button
                        label={saving ? 'Saving...' : 'Save'}
                        icon="pi pi-check"
                        className={`app-action-compact ${isFormActive ? '' : 'p-button-outlined'}`}
                        onClick={save}
                        disabled={!isFormActive || saving}
                        id={saveButtonId}
                    />
                    <Button
                        label="Cancel"
                        className="app-action-compact p-button-secondary p-button-outlined"
                        onClick={cancelForm}
                        disabled={!isFormActive || saving}
                    />
                    <Button
                        label="Delete"
                        icon="pi pi-trash"
                        className="app-action-compact p-button-danger p-button-outlined"
                        onClick={handleDelete}
                        disabled={!isFormActive || !editingId || saving}
                    />
                    <Button
                        label={cancelledChecked ? 'Cancelled' : 'Cancel Voucher'}
                        icon={cancelledChecked ? 'pi pi-ban' : 'pi pi-times-circle'}
                        className={`app-action-compact ${cancelledChecked ? 'p-button-danger' : 'p-button-outlined'}`}
                        onClick={() => setCancelledChecked((prev) => !prev)}
                        disabled={!isFormActive}
                    />
                    <Button
                        label="Print"
                        icon="pi pi-print"
                        className="app-action-compact p-button-text"
                        onClick={() => window.print()}
                        disabled={!isFormActive}
                    />
                </div>
            </div>
        </>
    );
}
