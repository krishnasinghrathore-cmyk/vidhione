import React from 'react';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import {
    calculateLineAmount,
    formatDraftNumber,
    type TextileDocumentLineDraft,
    type TextileDraftErrors,
    type TextileDraftLineField
} from './validation';

type LookupOption = {
    label: string;
    value: string;
};

type TextileDocumentLinesEditorProps = {
    lines: TextileDocumentLineDraft[];
    lineErrors: TextileDraftErrors['lines'];
    productOptions: LookupOption[];
    unitOptions: LookupOption[];
    ledgerOptions: LookupOption[];
    disabled: boolean;
    showJobworkFields: boolean;
    onAddLine: () => void;
    onRemoveLine: (clientId: string) => void;
    onLineChange: (clientId: string, field: TextileDraftLineField, value: string) => void;
};

const fieldError = (
    lineErrors: TextileDraftErrors['lines'],
    clientId: string,
    field: TextileDraftLineField
) => lineErrors[clientId]?.[field] ?? null;

export function TextileDocumentLinesEditor({
    lines,
    lineErrors,
    productOptions,
    unitOptions,
    ledgerOptions,
    disabled,
    showJobworkFields,
    onAddLine,
    onRemoveLine,
    onLineChange
}: TextileDocumentLinesEditorProps) {
    return (
        <div className="flex flex-column gap-3">
            <div className="flex align-items-center justify-content-between gap-2">
                <div>
                    <h4 className="m-0 text-lg">Line Details</h4>
                    <small className="text-600">Capture fabric identity, quantity, and optional jobwork references.</small>
                </div>
                <Button
                    type="button"
                    label="Add Line"
                    icon="pi pi-plus"
                    className="app-action-compact"
                    onClick={onAddLine}
                    disabled={disabled}
                />
            </div>

            {lines.map((line, index) => {
                const amount = calculateLineAmount(line);
                return (
                    <div key={line.clientId} className="border-1 border-200 border-round p-3">
                        <div className="flex align-items-center justify-content-between gap-2 mb-3">
                            <div>
                                <div className="font-medium text-900">Line {index + 1}</div>
                                <small className="text-600">Amount auto-calculates from quantity and rate.</small>
                            </div>
                            <Button
                                type="button"
                                label="Remove"
                                icon="pi pi-trash"
                                className="p-button-text p-button-danger app-action-compact"
                                onClick={() => onRemoveLine(line.clientId)}
                                disabled={disabled}
                            />
                        </div>

                        <div className="grid formgrid">
                            <div className="col-12 lg:col-4 flex flex-column gap-1">
                                <label className="font-medium">Product</label>
                                <AppDropdown
                                    value={line.productId || null}
                                    options={productOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select product"
                                    filter
                                    showClear
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'productId') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'productId', String(event.value ?? ''))}
                                />
                                {fieldError(lineErrors, line.clientId, 'productId') && (
                                    <small className="text-red-500">{fieldError(lineErrors, line.clientId, 'productId')}</small>
                                )}
                            </div>

                            <div className="col-12 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Unit</label>
                                <AppDropdown
                                    value={line.unitId || null}
                                    options={unitOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Unit"
                                    filter
                                    showClear
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'unitId') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'unitId', String(event.value ?? ''))}
                                />
                                {fieldError(lineErrors, line.clientId, 'unitId') && (
                                    <small className="text-red-500">{fieldError(lineErrors, line.clientId, 'unitId')}</small>
                                )}
                            </div>

                            <div className="col-12 lg:col-3 flex flex-column gap-1">
                                <label className="font-medium">Design</label>
                                <AppInput
                                    value={line.designName}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'designName') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'designName', event.target.value)}
                                />
                            </div>

                            <div className="col-12 lg:col-3 flex flex-column gap-1">
                                <label className="font-medium">Reference</label>
                                <AppInput
                                    value={line.lineReferenceNumber}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'lineReferenceNumber') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'lineReferenceNumber', event.target.value)}
                                />
                            </div>

                            <div className="col-12 md:col-6 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Receipt No</label>
                                <AppInput value={line.receiptNo} disabled={disabled} onChange={(event) => onLineChange(line.clientId, 'receiptNo', event.target.value)} />
                            </div>

                            <div className="col-12 md:col-6 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Bale No</label>
                                <AppInput value={line.baleNo} disabled={disabled} onChange={(event) => onLineChange(line.clientId, 'baleNo', event.target.value)} />
                            </div>

                            <div className="col-12 md:col-6 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Lot No</label>
                                <AppInput value={line.lotNo} disabled={disabled} onChange={(event) => onLineChange(line.clientId, 'lotNo', event.target.value)} />
                            </div>

                            <div className="col-12 md:col-6 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Combo No</label>
                                <AppInput value={line.comboNo} disabled={disabled} onChange={(event) => onLineChange(line.clientId, 'comboNo', event.target.value)} />
                            </div>

                            <div className="col-12 md:col-6 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Roll No</label>
                                <AppInput value={line.rollNo} disabled={disabled} onChange={(event) => onLineChange(line.clientId, 'rollNo', event.target.value)} />
                            </div>

                            {showJobworkFields && (
                                <div className="col-12 md:col-6 lg:col-2 flex flex-column gap-1">
                                    <label className="font-medium">Line Jobber</label>
                                    <AppDropdown
                                        value={line.lineJobberLedgerId || null}
                                        options={ledgerOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Optional jobber"
                                        filter
                                        showClear
                                        disabled={disabled}
                                        onChange={(event) =>
                                            onLineChange(line.clientId, 'lineJobberLedgerId', String(event.value ?? ''))
                                        }
                                    />
                                </div>
                            )}

                            <div className="col-6 md:col-4 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Pieces</label>
                                <AppInput
                                    value={line.pieces}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'pieces') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'pieces', event.target.value)}
                                />
                                {fieldError(lineErrors, line.clientId, 'pieces') && (
                                    <small className="text-red-500">{fieldError(lineErrors, line.clientId, 'pieces')}</small>
                                )}
                            </div>

                            <div className="col-6 md:col-4 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Quantity</label>
                                <AppInput
                                    value={line.quantity}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'quantity') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'quantity', event.target.value)}
                                />
                                {fieldError(lineErrors, line.clientId, 'quantity') && (
                                    <small className="text-red-500">{fieldError(lineErrors, line.clientId, 'quantity')}</small>
                                )}
                            </div>

                            <div className="col-6 md:col-4 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Rate</label>
                                <AppInput
                                    value={line.rate}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'rate') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'rate', event.target.value)}
                                />
                                {fieldError(lineErrors, line.clientId, 'rate') && (
                                    <small className="text-red-500">{fieldError(lineErrors, line.clientId, 'rate')}</small>
                                )}
                            </div>

                            <div className="col-6 md:col-4 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Fabric Rate</label>
                                <AppInput
                                    value={line.fabricRate}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'fabricRate') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'fabricRate', event.target.value)}
                                />
                                {fieldError(lineErrors, line.clientId, 'fabricRate') && (
                                    <small className="text-red-500">{fieldError(lineErrors, line.clientId, 'fabricRate')}</small>
                                )}
                            </div>

                            <div className="col-6 md:col-4 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Shrinkage %</label>
                                <AppInput
                                    value={line.shrinkagePercent}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'shrinkagePercent') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'shrinkagePercent', event.target.value)}
                                />
                                {fieldError(lineErrors, line.clientId, 'shrinkagePercent') && (
                                    <small className="text-red-500">{fieldError(lineErrors, line.clientId, 'shrinkagePercent')}</small>
                                )}
                            </div>

                            <div className="col-6 md:col-4 lg:col-2 flex flex-column gap-1">
                                <label className="font-medium">Amount</label>
                                <AppInput value={formatDraftNumber(Number(amount.toFixed(2)))} disabled />
                            </div>

                            <div className="col-12 flex flex-column gap-1">
                                <label className="font-medium">Line Remarks</label>
                                <InputTextarea
                                    autoResize
                                    rows={2}
                                    value={line.remarks}
                                    disabled={disabled}
                                    className={classNames(fieldError(lineErrors, line.clientId, 'remarks') && 'p-invalid')}
                                    onChange={(event) => onLineChange(line.clientId, 'remarks', event.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
