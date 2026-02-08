import React, { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Chips } from 'primereact/chips';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import { SelectButton } from 'primereact/selectbutton';
import AppDropdown from '@/components/AppDropdown';
import { formatAmount } from '../../helpers';
import { InvoiceLineInventoryPanel } from './InvoiceLineInventoryPanel';
import type {
    ComputedInvoiceLine,
    DiscountMode,
    InvoiceLineDraft,
    LineInventoryDraft,
    WarehouseOption
} from '../types';

type ProductOption = {
    label: string;
    value: number;
};

type InvoiceLinesTableProps = {
    lines: ComputedInvoiceLine[];
    productOptions: ProductOption[];
    warehouseOptions: WarehouseOption[];
    lineErrorsByKey: Record<string, string[]>;
    onSelectProduct: (lineKey: string, productId: number | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceLineDraft>) => void;
    onInventoryChange: (lineKey: string, patch: Partial<LineInventoryDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    onDuplicateLine: (lineKey: string) => void;
    onAddLine: () => void;
};

const DISCOUNT_MODE_OPTIONS: { label: string; value: DiscountMode }[] = [
    { label: '%', value: 'PERCENT' },
    { label: '₹', value: 'AMOUNT' }
];

const focusNextFrom = (container: HTMLElement | null, source: HTMLElement | null) => {
    if (!container || !source) return;
    const focusables = Array.from(
        container.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => {
        if (element.hasAttribute('disabled')) return false;
        if (element.getAttribute('aria-disabled') === 'true') return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return element.offsetParent !== null;
    });

    const currentIndex = focusables.indexOf(source);
    if (currentIndex < 0) return;
    for (let i = currentIndex + 1; i < focusables.length; i += 1) {
        const candidate = focusables[i];
        candidate.focus();
        return;
    }
};

export function InvoiceLinesTable({
    lines,
    productOptions,
    warehouseOptions,
    lineErrorsByKey,
    onSelectProduct,
    onLineChange,
    onInventoryChange,
    onDeleteLine,
    onDuplicateLine,
    onAddLine
}: InvoiceLinesTableProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const selectedLine = useMemo(
        () => (selectedLineKey ? lines.find((line) => line.key === selectedLineKey) ?? null : null),
        [lines, selectedLineKey]
    );

    const handleEnterNext = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        focusNextFrom(containerRef.current, event.currentTarget as HTMLElement);
    };

    return (
        <div
            ref={containerRef}
            className="mt-4"
            onKeyDownCapture={(event) => {
                if (!selectedLineKey) return;
                if (event.ctrlKey && event.key.toLowerCase() === 'd') {
                    event.preventDefault();
                    onDuplicateLine(selectedLineKey);
                    return;
                }
                if (event.key === 'Delete') {
                    event.preventDefault();
                    onDeleteLine(selectedLineKey);
                }
            }}
        >
            <div className="flex align-items-center justify-content-between mb-2">
                <h4 className="m-0">Line Items</h4>
                <Button icon="pi pi-plus" label="Add Line" outlined onClick={onAddLine} />
            </div>

            <DataTable
                value={lines}
                dataKey="key"
                responsiveLayout="scroll"
                size="small"
                selectionMode="single"
                selection={selectedLine}
                onSelectionChange={(event) => {
                    const nextLine = event.value as ComputedInvoiceLine | null;
                    setSelectedLineKey(nextLine?.key ?? null);
                }}
                expandedRows={expandedRows}
                onRowToggle={(event) => {
                    setExpandedRows(event.data as Record<string, boolean>);
                }}
                rowExpansionTemplate={(line) => (
                    <InvoiceLineInventoryPanel
                        line={line as InvoiceLineDraft}
                        warehouseOptions={warehouseOptions}
                        onInventoryChange={onInventoryChange}
                    />
                )}
                rowClassName={(line) => (lineErrorsByKey[(line as ComputedInvoiceLine).key]?.length ? 'p-invalid' : '')}
            >
                <Column expander style={{ width: '3rem' }} />
                <Column
                    header="#"
                    body={(_row: ComputedInvoiceLine, options: { rowIndex: number }) => (
                        <span className="text-500">{options.rowIndex + 1}</span>
                    )}
                    style={{ width: '3.5rem' }}
                />

                <Column
                    header="Item"
                    body={(line: ComputedInvoiceLine) => (
                        <AppDropdown
                            value={line.itemId}
                            options={productOptions}
                            onChange={(event) => onSelectProduct(line.key, (event.value as number) ?? null)}
                            placeholder="Select item"
                            filter
                            showClear
                            className="w-full"
                            onEnterNext={() => {
                                const target = containerRef.current?.querySelector<HTMLInputElement>('input.p-inputtext');
                                target?.focus();
                            }}
                        />
                    )}
                    style={{ minWidth: '14rem' }}
                />

                <Column header="HSN/SAC" body={(line: ComputedInvoiceLine) => <span>{line.hsnCode || '-'}</span>} style={{ width: '9rem' }} />

                <Column
                    header="Qty"
                    body={(line: ComputedInvoiceLine) => (
                        <InputNumber
                            value={line.quantity}
                            onValueChange={(event) =>
                                onLineChange(line.key, {
                                    quantity: event.value != null ? Number(event.value) : 0
                                })
                            }
                            min={0}
                            useGrouping={false}
                            onKeyDown={handleEnterNext}
                        />
                    )}
                    style={{ width: '7rem' }}
                />

                <Column header="Unit" body={(line: ComputedInvoiceLine) => <span>{line.unitName || '-'}</span>} style={{ width: '6rem' }} />

                <Column
                    header="Rate"
                    body={(line: ComputedInvoiceLine) => (
                        <InputNumber
                            value={line.rate}
                            onValueChange={(event) =>
                                onLineChange(line.key, {
                                    rate: event.value != null ? Number(event.value) : 0
                                })
                            }
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            onKeyDown={handleEnterNext}
                        />
                    )}
                    style={{ width: '9rem' }}
                />

                <Column
                    header="Disc Mode"
                    body={(line: ComputedInvoiceLine) => (
                        <SelectButton
                            value={line.discountMode}
                            options={DISCOUNT_MODE_OPTIONS}
                            onChange={(event) =>
                                onLineChange(line.key, {
                                    discountMode: (event.value as DiscountMode) ?? 'PERCENT'
                                })
                            }
                            optionLabel="label"
                            optionValue="value"
                            onKeyDown={handleEnterNext}
                        />
                    )}
                    style={{ width: '9rem' }}
                />

                <Column
                    header="Disc Value"
                    body={(line: ComputedInvoiceLine) => (
                        <InputNumber
                            value={line.discountValue}
                            onValueChange={(event) =>
                                onLineChange(line.key, {
                                    discountValue: event.value != null ? Number(event.value) : 0
                                })
                            }
                            min={0}
                            max={line.discountMode === 'PERCENT' ? 100 : undefined}
                            minFractionDigits={line.discountMode === 'PERCENT' ? 0 : 2}
                            maxFractionDigits={2}
                            onKeyDown={handleEnterNext}
                        />
                    )}
                    style={{ width: '9rem' }}
                />

                <Column
                    header="GST %"
                    body={(line: ComputedInvoiceLine) => <span>{line.gstPercent.toFixed(2)}</span>}
                    style={{ width: '7rem' }}
                />

                <Column
                    header="Amount"
                    body={(line: ComputedInvoiceLine) => <span className="font-medium">{formatAmount(line.totalAmount)}</span>}
                    style={{ width: '10rem' }}
                />

                <Column
                    header=""
                    body={(line: ComputedInvoiceLine) => (
                        <Button
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            onClick={() => onDeleteLine(line.key)}
                            disabled={lines.length <= 1}
                        />
                    )}
                    style={{ width: '4rem' }}
                />

                <Column
                    header="Errors"
                    body={(line: ComputedInvoiceLine) => {
                        const errors = lineErrorsByKey[line.key] ?? [];
                        if (errors.length === 0) return <span className="text-500">-</span>;
                        return (
                            <div className="flex flex-column gap-1">
                                {errors.map((message, index) => (
                                    <small key={`${line.key}-err-${index}`} className="text-red-500">
                                        {message}
                                    </small>
                                ))}
                            </div>
                        );
                    }}
                    style={{ minWidth: '15rem' }}
                />
            </DataTable>

            <small className="text-500 block mt-2">
                Keyboard: press <b>Enter</b> to move next, <b>Ctrl + D</b> to duplicate selected row, and <b>Delete</b> to remove selected row.
            </small>
        </div>
    );
}
