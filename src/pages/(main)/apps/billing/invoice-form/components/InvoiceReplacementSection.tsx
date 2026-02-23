import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import AppInput from '@/components/AppInput';
import ItemAutoComplete, { type ItemOption } from '@/components/ItemAutoComplete';
import { formatAmount } from '../../helpers';
import type { InvoiceReplacementLineDraft } from '../types';

type InvoiceReplacementSectionProps = {
    lines: InvoiceReplacementLineDraft[];
    productOptions: ItemOption[];
    totalAmount: number;
    disabled?: boolean;
    onAddLine: () => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceReplacementLineDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
};

export function InvoiceReplacementSection({
    lines,
    productOptions,
    totalAmount,
    disabled = false,
    onAddLine,
    onLineChange,
    onDeleteLine
}: InvoiceReplacementSectionProps) {
    return (
        <div className="app-entry-section app-entry-section--details">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="flex align-items-center gap-2 flex-wrap">
                    <h4 className="m-0">Replacement</h4>
                    <span className="invoice-form-status-chip">Total: {formatAmount(totalAmount)}</span>
                </div>
                <Button
                    icon="pi pi-plus"
                    label="Add Replacement"
                    outlined
                    className="app-action-compact"
                    onClick={onAddLine}
                    disabled={disabled}
                />
            </div>
            <DataTable value={lines} dataKey="key" className="mt-2" responsiveLayout="scroll" emptyMessage="No replacement lines.">
                <Column
                    header="Item"
                    body={(row: InvoiceReplacementLineDraft) => (
                        <ItemAutoComplete
                            value={row.itemId}
                            options={productOptions}
                            onChange={(itemId) => onLineChange(row.key, { itemId })}
                            placeholder="Select item"
                            showClear
                            className="w-full"
                            disabled={disabled}
                        />
                    )}
                    style={{ minWidth: '16rem' }}
                />
                <Column
                    header="Item Name"
                    body={(row: InvoiceReplacementLineDraft) => (
                        <AppInput
                            value={row.itemName}
                            onChange={(event) => onLineChange(row.key, { itemName: event.target.value })}
                            className="w-full"
                            disabled={disabled}
                        />
                    )}
                    style={{ minWidth: '16rem' }}
                />
                <Column
                    header="MRP"
                    body={(row: InvoiceReplacementLineDraft) => (
                        <InputNumber
                            value={row.mrp}
                            onValueChange={(event) => onLineChange(row.key, { mrp: event.value ?? 0 })}
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    )}
                    style={{ width: '10rem' }}
                />
                <Column
                    header="Qty"
                    body={(row: InvoiceReplacementLineDraft) => (
                        <InputNumber
                            value={row.quantity}
                            onValueChange={(event) => onLineChange(row.key, { quantity: event.value ?? 0 })}
                            min={0}
                            maxFractionDigits={3}
                            useGrouping={false}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    )}
                    style={{ width: '8rem' }}
                />
                <Column
                    header="Rate"
                    body={(row: InvoiceReplacementLineDraft) => (
                        <InputNumber
                            value={row.rate}
                            onValueChange={(event) => onLineChange(row.key, { rate: event.value ?? 0 })}
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    )}
                    style={{ width: '10rem' }}
                />
                <Column
                    header="Amount"
                    body={(row: InvoiceReplacementLineDraft) => <span>{formatAmount(row.amount)}</span>}
                    style={{ width: '10rem' }}
                />
                <Column
                    header=""
                    body={(row: InvoiceReplacementLineDraft) => (
                        <Button
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            className="app-action-compact"
                            onClick={() => onDeleteLine(row.key)}
                            disabled={disabled}
                        />
                    )}
                    style={{ width: '4rem' }}
                />
            </DataTable>
        </div>
    );
}
