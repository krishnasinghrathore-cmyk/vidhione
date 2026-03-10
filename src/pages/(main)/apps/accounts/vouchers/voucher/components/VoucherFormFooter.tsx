'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import type { AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppInput from '@/components/AppInput';
import { AppNotchedField } from '@/components/AppNotchedField';
import { LabelWithIcon } from './LabelWithIcon';
import type { SelectOption } from '../types';
import type { VoucherViewProps } from '../useVoucherState';

type VoucherFormFooterProps = {
    viewProps: VoucherViewProps;
    renderFormError: (key: string) => React.ReactNode;
};

export function VoucherFormFooter({ viewProps, renderFormError }: VoucherFormFooterProps) {
    const {
        requiresManager,
        voucherProfileKey,
        isCashMode,
        managerLabel,
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
        paidByInputId,
        paidByInputRef,
        focusSaveButton,
        clearFormError,
        setFormManagerId,
        chequeInFavour,
        setChequeInFavour,
        chequeInFavourInputRef,
        voucherActions,
        save,
        cancelForm,
        handleDelete,
        runDryDeleteCheck,
        handleCancelVoucherToggle,
        handleTemplateVoucherPrint,
        cancelledChecked,
        editingId,
        saveButtonId,
        drySaveCheckButtonId,
        dryDeleteCheckButtonId,
        addAnotherAfterSave,
        setAddAnotherAfterSave,
        addAnotherAfterSaveInputId,
        runDrySaveCheck
    } = viewProps;

    const moveFocusToSaveButton = React.useCallback(() => {
        window.setTimeout(() => {
            const overlay = paidByInputRef.current?.getOverlay?.();
            const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
            if (overlayVisible) {
                paidByInputRef.current?.hide?.();
            }
            focusSaveButton();
        }, 0);
    }, [focusSaveButton, paidByInputRef]);
    const isSaving = saving;
    const showManagerInFooter = requiresManager && !(voucherProfileKey === 'receipt' && isCashMode);

    return (
        <div className="app-entry-footer-stack">
            <div className="grid app-entry-footer-party-row">
                {showManagerInFooter && (
                    <div className="col-12 md:col-4">
                        <AppNotchedField
                            label={<LabelWithIcon icon="pi-user">{managerLabel}</LabelWithIcon>}
                            className="app-notched-input--paid-by"
                            style={{ width: '220px' }}
                            htmlFor={paidByInputId}
                        >
                            <AppAutoComplete
                                inputId={paidByInputId}
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
                                placeholder=""
                                showEmptyMessage
                                loading={managersLoading}
                                showLoadingIcon
                                disabled={!isFormActive}
                                style={{ width: '100%' }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.stopPropagation();
                                    moveFocusToSaveButton();
                                }}
                                ref={paidByInputRef}
                            />
                        </AppNotchedField>
                        {renderFormError('managerId')}
                    </div>
                )}
                {isBankMode && isChequePayment && (
                    <div className="col-12 md:col-4">
                        <AppNotchedField
                            label={<LabelWithIcon icon="pi-user-edit">Cheque In Favour</LabelWithIcon>}
                            className="app-notched-input--paid-by"
                            style={{ width: '100%' }}
                        >
                            <AppInput
                                value={chequeInFavour}
                                onChange={(e) => setChequeInFavour(e.target.value)}
                                style={{ width: '100%' }}
                                disabled={!isFormActive}
                                ref={(element) => {
                                    chequeInFavourInputRef.current = element as HTMLInputElement | null;
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    moveFocusToSaveButton();
                                }}
                            />
                        </AppNotchedField>
                    </div>
                )}
            </div>

            <div className="flex align-items-center justify-content-center flex-wrap gap-2 app-entry-actionsbar">
                <div className="flex flex-wrap app-entry-form-actions">
                    {voucherActions.saveForm.visible && !editingId ? (
                        <div className="app-entry-form-toggle-with-hint">
                            <label htmlFor={addAnotherAfterSaveInputId} className="app-entry-form-toggle">
                                <Checkbox
                                    inputId={addAnotherAfterSaveInputId}
                                    checked={addAnotherAfterSave}
                                    onChange={(event) => {
                                        setAddAnotherAfterSave(Boolean(event.checked));
                                    }}
                                    disabled={voucherActions.saveForm.disabled || isSaving || !isFormActive}
                                />
                                <span>Add another after save</span>
                            </label>
                            <small className="app-entry-form-action-hint">Ctrl+Enter</small>
                        </div>
                    ) : null}
                    {voucherActions.saveForm.visible ? (
                        <div className="app-entry-form-action-with-hint">
                            <Button
                                label={isSaving ? 'Saving...' : 'Save'}
                                icon="pi pi-check"
                                className="app-action-compact"
                                onClick={() => {
                                    void save();
                                }}
                                disabled={voucherActions.saveForm.disabled || isSaving}
                                loading={isSaving}
                                id={saveButtonId}
                                aria-label="Save voucher"
                            />
                            <small className="app-entry-form-action-hint">Ctrl+S</small>
                        </div>
                    ) : null}
                    {voucherActions.saveForm.visible ? (
                        <div className="app-entry-form-action-with-hint">
                            <Button
                                label="Dry Check"
                                icon="pi pi-search"
                                className="app-action-compact p-button-outlined"
                                onClick={runDrySaveCheck}
                                disabled={voucherActions.saveForm.disabled || isSaving || !isFormActive}
                                id={drySaveCheckButtonId}
                                aria-label="Dry save check"
                            />
                            <small className="app-entry-form-action-hint">Ctrl+Shift+S</small>
                        </div>
                    ) : null}
                    {voucherActions.cancelForm.visible ? (
                        <div className="app-entry-form-action-with-hint">
                            <Button
                                label="Cancel"
                                className="app-action-compact p-button-secondary p-button-outlined"
                                onClick={cancelForm}
                                disabled={voucherActions.cancelForm.disabled || isSaving}
                                aria-label="Cancel voucher form"
                            />
                            <small className="app-entry-form-action-hint">Ctrl+Esc</small>
                        </div>
                    ) : null}
                    {voucherActions.printVoucher.visible ? (
                        <Button
                            label="Print Voucher"
                            icon="pi pi-print"
                            className="app-action-compact p-button-text"
                            onClick={handleTemplateVoucherPrint}
                            disabled={voucherActions.printVoucher.disabled}
                        />
                    ) : null}
                </div>
            </div>
            {voucherActions.cancelVoucher.visible || voucherActions.deleteVoucher.visible ? (
                <div className="flex align-items-center justify-content-between">
                    {voucherActions.cancelVoucher.visible ? (
                        <Button
                            label={cancelledChecked ? 'Cancelled' : 'Cancel Voucher'}
                            icon={cancelledChecked ? 'pi pi-ban' : 'pi pi-times-circle'}
                            className={`app-action-compact ${cancelledChecked ? 'p-button-danger' : 'p-button-outlined'}`}
                            onClick={handleCancelVoucherToggle}
                            disabled={voucherActions.cancelVoucher.disabled}
                        />
                    ) : (
                        <span />
                    )}
                    {voucherActions.deleteVoucher.visible ? (
                        <div className="flex align-items-center gap-2">
                            <Button
                                label="Dry Delete Check"
                                icon="pi pi-search"
                                className="app-action-compact p-button-outlined p-button-sm"
                                onClick={runDryDeleteCheck}
                                disabled={voucherActions.deleteVoucher.disabled || isSaving}
                                id={dryDeleteCheckButtonId}
                                aria-label="Dry delete check"
                            />
                            <Button
                                label="Delete Voucher"
                                icon="pi pi-trash"
                                className="app-action-compact p-button-danger p-button-text"
                                onClick={handleDelete}
                                disabled={voucherActions.deleteVoucher.disabled}
                            />
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
