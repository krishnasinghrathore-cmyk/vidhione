import React, { useMemo } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import AppDropdown from '@/components/AppDropdown';
import ItemAutoComplete, { type ItemOption } from '@/components/ItemAutoComplete';
import type { InvoiceProduct, InvoiceProductAttributeOption, InvoiceTypeDetailDraft } from '../types';

type InvoiceTypeDetailsSectionProps = {
    lines: InvoiceTypeDetailDraft[];
    products: InvoiceProduct[];
    productOptions: ItemOption[];
    attributeOptionsByType: Record<number, InvoiceProductAttributeOption[]>;
    attributeOptionsLoading?: boolean;
    disabled?: boolean;
    onAddLine: () => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceTypeDetailDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
};

export function InvoiceTypeDetailsSection({
    lines,
    products,
    productOptions,
    attributeOptionsByType,
    attributeOptionsLoading = false,
    disabled = false,
    onAddLine,
    onLineChange,
    onDeleteLine
}: InvoiceTypeDetailsSectionProps) {
    const productById = useMemo(() => {
        const map = new Map<number, InvoiceProduct>();
        products.forEach((product) => {
            map.set(product.productId, product);
        });
        return map;
    }, [products]);

    return (
        <div className="app-entry-section app-entry-section--details">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <h4 className="m-0">Type Details</h4>
                <Button
                    icon="pi pi-plus"
                    label="Add Type Detail"
                    outlined
                    className="app-action-compact"
                    onClick={onAddLine}
                    disabled={disabled}
                />
            </div>
            <DataTable value={lines} dataKey="key" className="mt-2" responsiveLayout="scroll" emptyMessage="No type details.">
                <Column
                    header="Item"
                    body={(row: InvoiceTypeDetailDraft) => (
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
                    header="Type Detail"
                    body={(row: InvoiceTypeDetailDraft) => {
                        const product = row.itemId ? productById.get(row.itemId) ?? null : null;
                        const attributeTypeId = product?.productAttributeTypeId ?? null;
                        const options = attributeTypeId ? attributeOptionsByType[attributeTypeId] ?? [] : [];
                        const dropdownOptions = options.map((option) => ({
                            label: option.detail ?? `Detail ${option.productAttributeId}`,
                            value: option.productAttributeId
                        }));
                        const placeholder = attributeTypeId
                            ? attributeOptionsLoading
                                ? 'Loading...'
                                : 'Select detail'
                            : 'Select item first';

                        return (
                            <AppDropdown
                                value={row.typeDetailId}
                                options={dropdownOptions}
                                onChange={(event) => onLineChange(row.key, { typeDetailId: (event.value as number) ?? null })}
                                placeholder={placeholder}
                                showClear
                                className="w-full"
                                disabled={disabled || !attributeTypeId}
                            />
                        );
                    }}
                    style={{ minWidth: '16rem' }}
                />
                <Column
                    header="Qty"
                    body={(row: InvoiceTypeDetailDraft) => (
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
                    header="Tmp Type ID"
                    body={(row: InvoiceTypeDetailDraft) => (
                        <InputNumber
                            value={row.tmpTypeId}
                            onValueChange={(event) => onLineChange(row.key, { tmpTypeId: event.value ?? null })}
                            min={0}
                            useGrouping={false}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    )}
                    style={{ width: '10rem' }}
                />
                <Column
                    header=""
                    body={(row: InvoiceTypeDetailDraft) => (
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
