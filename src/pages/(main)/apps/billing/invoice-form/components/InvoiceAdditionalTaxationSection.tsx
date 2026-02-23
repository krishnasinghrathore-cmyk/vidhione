import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import { formatAmount } from '../../helpers';
import type { InvoiceAdditionalTaxationDraft } from '../types';

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
};

type InvoiceAdditionalTaxationSectionProps = {
    lines: InvoiceAdditionalTaxationDraft[];
    taxLedgerOptions: TaxLedgerOption[];
    totalAmount: number;
    disabled?: boolean;
    onAddLine: () => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceAdditionalTaxationDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
};

export function InvoiceAdditionalTaxationSection({
    lines,
    taxLedgerOptions,
    totalAmount,
    disabled = false,
    onAddLine,
    onLineChange,
    onDeleteLine
}: InvoiceAdditionalTaxationSectionProps) {
    return (
        <div className="app-entry-section app-entry-section--details">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="flex align-items-center gap-2 flex-wrap">
                    <h4 className="m-0">Additional Taxation</h4>
                    <span className="invoice-form-status-chip">Total: {formatAmount(totalAmount)}</span>
                </div>
                <Button
                    icon="pi pi-plus"
                    label="Add Tax"
                    outlined
                    className="app-action-compact"
                    onClick={onAddLine}
                    disabled={disabled}
                />
            </div>
            <DataTable value={lines} dataKey="key" className="mt-2" responsiveLayout="scroll" emptyMessage="No additional tax lines.">
                <Column
                    header="Ledger"
                    body={(row: InvoiceAdditionalTaxationDraft) => (
                        <LedgerAutoComplete
                            variant="party"
                            value={row.ledgerId}
                            options={taxLedgerOptions}
                            onChange={(ledgerId) => onLineChange(row.key, { ledgerId })}
                            placeholder="Select ledger"
                            showClear
                            className="w-full"
                            disabled={disabled}
                        />
                    )}
                    style={{ minWidth: '18rem' }}
                />
                <Column
                    header="Add Amount"
                    body={(row: InvoiceAdditionalTaxationDraft) => (
                        <InputNumber
                            value={row.addAmount}
                            onValueChange={(event) => onLineChange(row.key, { addAmount: event.value ?? 0 })}
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    )}
                    style={{ width: '12rem' }}
                />
                <Column
                    header="Taxable Amount"
                    body={(row: InvoiceAdditionalTaxationDraft) => (
                        <InputNumber
                            value={row.taxableAmount}
                            onValueChange={(event) => onLineChange(row.key, { taxableAmount: event.value ?? 0 })}
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    )}
                    style={{ width: '12rem' }}
                />
                <Column
                    header=""
                    body={(row: InvoiceAdditionalTaxationDraft) => (
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
