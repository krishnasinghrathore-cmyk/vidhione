import React from 'react';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import type { TextileCapabilityState } from '@/lib/textile/config';
import type { TextileDocumentScreenConfig } from './config';
import type { TextileLookups } from './lookups';
import { TextileDocumentLinesEditor } from './TextileDocumentLinesEditor';
import {
    calculateDraftTotals,
    formatDraftNumber,
    type TextileDocumentDraft,
    type TextileDraftErrors,
    type TextileDraftHeaderField,
    type TextileDraftLineField
} from './validation';

type TextileDocumentFormProps = {
    screen: TextileDocumentScreenConfig;
    draft: TextileDocumentDraft;
    errors: TextileDraftErrors;
    capabilities: TextileCapabilityState;
    lookups: TextileLookups;
    saving: boolean;
    loadingDocument: boolean;
    downstreamLockMessage: string | null;
    onHeaderChange: (field: TextileDraftHeaderField, value: string | Date | null) => void;
    onLineChange: (clientId: string, field: TextileDraftLineField, value: string) => void;
    onAddLine: () => void;
    onRemoveLine: (clientId: string) => void;
    onReset: () => void;
    onSave: () => void;
    onToggleCancelled: () => void;
};

const headerError = (errors: TextileDraftErrors, field: TextileDraftHeaderField) => errors.header[field] ?? null;

export function TextileDocumentForm({
    screen,
    draft,
    errors,
    capabilities,
    lookups,
    saving,
    loadingDocument,
    downstreamLockMessage,
    onHeaderChange,
    onLineChange,
    onAddLine,
    onRemoveLine,
    onReset,
    onSave,
    onToggleCancelled
}: TextileDocumentFormProps) {
    const totals = calculateDraftTotals(draft.lines);
    const hasExistingDocument = Boolean(draft.textileDocumentId);
    const hasDownstreamLock = Boolean(hasExistingDocument && downstreamLockMessage);
    const formDisabled = saving || loadingDocument || draft.isCancelled || hasDownstreamLock;

    return (
        <div className="card h-full">
            <div className="flex align-items-start justify-content-between gap-3 mb-3">
                <div>
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <h3 className="m-0 text-xl">{hasExistingDocument ? 'Edit Textile Document' : 'New Textile Document'}</h3>
                        <Tag value={screen.documentType.replace('_', ' ')} severity="info" />
                        {draft.isCancelled && <Tag value="Cancelled" severity="danger" />}
                    </div>
                    <p className="mt-2 mb-0 text-600">{screen.description}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-content-end">
                    <Button
                        type="button"
                        label="Reset"
                        className="p-button-text app-action-compact"
                        onClick={onReset}
                        disabled={saving}
                    />
                    {hasExistingDocument && (
                        <Button
                            type="button"
                            label={draft.isCancelled ? 'Reopen' : 'Cancel'}
                            className={classNames('app-action-compact', draft.isCancelled ? '' : 'p-button-danger')}
                            outlined={draft.isCancelled}
                            onClick={onToggleCancelled}
                            disabled={saving || hasDownstreamLock}
                        />
                    )}
                    <Button
                        type="button"
                        label={saving ? 'Saving...' : hasExistingDocument ? 'Update Document' : 'Create Document'}
                        icon="pi pi-save"
                        onClick={onSave}
                        disabled={saving || loadingDocument || hasDownstreamLock}
                    />
                </div>
            </div>

            {errors.form && <Message severity="error" text={errors.form} className="w-full mb-3" />}
            {lookups.errorMessages.length > 0 && (
                <Message severity="warn" text={lookups.errorMessages.join(' | ')} className="w-full mb-3" />
            )}
            {draft.isCancelled && (
                <Message
                    severity="warn"
                    text="Cancelled documents are read-only until you reopen them."
                    className="w-full mb-3"
                />
            )}
            {downstreamLockMessage && (
                <Message severity="warn" text={downstreamLockMessage} className="w-full mb-3" />
            )}

            <div className="grid formgrid mb-4">
                <div className="col-12 lg:col-3 flex flex-column gap-1">
                    <label className="font-medium">Document No</label>
                    <AppInput
                        value={draft.documentNumber}
                        disabled={formDisabled}
                        className={classNames(headerError(errors, 'documentNumber') && 'p-invalid')}
                        onChange={(event) => onHeaderChange('documentNumber', event.target.value)}
                    />
                    {headerError(errors, 'documentNumber') && (
                        <small className="text-red-500">{headerError(errors, 'documentNumber')}</small>
                    )}
                </div>

                <div className="col-12 lg:col-3 flex flex-column gap-1">
                    <label className="font-medium">Document Date</label>
                    <AppDateInput
                        value={draft.documentDate}
                        disabled={formDisabled}
                        onChange={(value) => onHeaderChange('documentDate', value)}
                    />
                    {headerError(errors, 'documentDate') && (
                        <small className="text-red-500">{headerError(errors, 'documentDate')}</small>
                    )}
                </div>

                <div className="col-12 lg:col-6 flex flex-column gap-1">
                    <label className="font-medium">Party Ledger</label>
                    <AppDropdown
                        value={draft.partyLedgerId || null}
                        options={lookups.ledgerOptions}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select party ledger"
                        filter
                        showClear
                        disabled={formDisabled}
                        className={classNames(headerError(errors, 'partyLedgerId') && 'p-invalid')}
                        onChange={(event) => onHeaderChange('partyLedgerId', String(event.value ?? ''))}
                    />
                    {headerError(errors, 'partyLedgerId') && (
                        <small className="text-red-500">{headerError(errors, 'partyLedgerId')}</small>
                    )}
                </div>

                <div className="col-12 lg:col-4 flex flex-column gap-1">
                    <label className="font-medium">Broker Ledger</label>
                    <AppDropdown
                        value={draft.brokerLedgerId || null}
                        options={lookups.ledgerOptions}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Optional broker"
                        filter
                        showClear
                        disabled={formDisabled}
                        onChange={(event) => onHeaderChange('brokerLedgerId', String(event.value ?? ''))}
                    />
                </div>

                <div className="col-12 lg:col-4 flex flex-column gap-1">
                    <label className="font-medium">Transporter</label>
                    <AppDropdown
                        value={draft.transporterId || null}
                        options={lookups.transporterOptions}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Optional transporter"
                        filter
                        showClear
                        disabled={formDisabled}
                        onChange={(event) => onHeaderChange('transporterId', String(event.value ?? ''))}
                    />
                </div>

                <div className="col-12 lg:col-4 flex flex-column gap-1">
                    <label className="font-medium">Godown</label>
                    <AppDropdown
                        value={draft.godownId || null}
                        options={lookups.godownOptions}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Optional godown"
                        filter
                        showClear
                        disabled={formDisabled}
                        onChange={(event) => onHeaderChange('godownId', String(event.value ?? ''))}
                    />
                </div>

                <div className="col-12 lg:col-4 flex flex-column gap-1">
                    <label className="font-medium">Reference No</label>
                    <AppInput
                        value={draft.referenceNumber}
                        disabled={formDisabled}
                        onChange={(event) => onHeaderChange('referenceNumber', event.target.value)}
                    />
                </div>

                {capabilities.jobwork && (
                    <>
                        <div className="col-12 lg:col-4 flex flex-column gap-1">
                            <label className="font-medium">Header Jobber</label>
                            <AppDropdown
                                value={draft.jobberLedgerId || null}
                                options={lookups.ledgerOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Optional jobber"
                                filter
                                showClear
                                disabled={formDisabled}
                                onChange={(event) => onHeaderChange('jobberLedgerId', String(event.value ?? ''))}
                            />
                        </div>

                        <div className="col-12 lg:col-4 flex flex-column gap-1">
                            <label className="font-medium">Jobber Challan No</label>
                            <AppInput
                                value={draft.jobberChallanNo}
                                disabled={formDisabled}
                                onChange={(event) => onHeaderChange('jobberChallanNo', event.target.value)}
                            />
                        </div>

                        <div className="col-12 lg:col-4 flex flex-column gap-1">
                            <label className="font-medium">Jobber Challan Date</label>
                            <AppDateInput
                                value={draft.jobberChallanDate}
                                disabled={formDisabled}
                                onChange={(value) => onHeaderChange('jobberChallanDate', value)}
                            />
                        </div>

                        <div className="col-12 flex flex-column gap-1">
                            <label className="font-medium">Remark For Statement</label>
                            <InputTextarea
                                autoResize
                                rows={2}
                                value={draft.remarkForStatement}
                                disabled={formDisabled}
                                onChange={(event) => onHeaderChange('remarkForStatement', event.target.value)}
                            />
                        </div>
                    </>
                )}

                <div className="col-12 flex flex-column gap-1">
                    <label className="font-medium">Remarks</label>
                    <InputTextarea
                        autoResize
                        rows={3}
                        value={draft.remarks}
                        disabled={formDisabled}
                        onChange={(event) => onHeaderChange('remarks', event.target.value)}
                    />
                </div>
            </div>

            <TextileDocumentLinesEditor
                lines={draft.lines}
                lineErrors={errors.lines}
                productOptions={lookups.productOptions}
                unitOptions={lookups.unitOptions}
                ledgerOptions={lookups.ledgerOptions}
                showJobworkFields={capabilities.jobwork}
                disabled={formDisabled}
                onAddLine={onAddLine}
                onRemoveLine={onRemoveLine}
                onLineChange={onLineChange}
            />

            <div className="grid mt-4">
                <div className="col-12 md:col-4">
                    <div className="border-1 border-200 border-round p-3">
                        <small className="text-600 block">Total Pieces</small>
                        <strong className="text-900">{formatDraftNumber(Number(totals.pieces.toFixed(2))) || '0'}</strong>
                    </div>
                </div>
                <div className="col-12 md:col-4">
                    <div className="border-1 border-200 border-round p-3">
                        <small className="text-600 block">Total Quantity</small>
                        <strong className="text-900">{formatDraftNumber(Number(totals.quantity.toFixed(2))) || '0'}</strong>
                    </div>
                </div>
                <div className="col-12 md:col-4">
                    <div className="border-1 border-200 border-round p-3">
                        <small className="text-600 block">Total Amount</small>
                        <strong className="text-900">{formatDraftNumber(Number(totals.amount.toFixed(2))) || '0'}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
