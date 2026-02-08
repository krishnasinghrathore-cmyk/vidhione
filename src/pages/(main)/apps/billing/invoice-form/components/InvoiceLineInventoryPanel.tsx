import React from 'react';
import { Chips } from 'primereact/chips';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import type { InvoiceLineDraft, LineInventoryDraft, WarehouseOption } from '../types';

type InvoiceLineInventoryPanelProps = {
    line: InvoiceLineDraft;
    warehouseOptions: WarehouseOption[];
    onInventoryChange: (lineKey: string, patch: Partial<LineInventoryDraft>) => void;
};

const sanitizeSerials = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    value.forEach((entry) => {
        const serial = String(entry ?? '').trim();
        if (!serial || seen.has(serial)) return;
        seen.add(serial);
        result.push(serial);
    });
    return result;
};

export function InvoiceLineInventoryPanel({
    line,
    warehouseOptions,
    onInventoryChange
}: InvoiceLineInventoryPanelProps) {
    return (
        <div className="p-3 grid">
            <div className="col-12 lg:col-6">
                <label htmlFor={`line-warehouse-${line.key}`} className="block mb-2 font-medium">
                    Warehouse
                </label>
                <AppDropdown
                    inputId={`line-warehouse-${line.key}`}
                    value={line.inventory.warehouseId}
                    options={warehouseOptions}
                    onChange={(event) =>
                        onInventoryChange(line.key, {
                            warehouseId: (event.value as number) ?? null
                        })
                    }
                    placeholder="Select warehouse"
                    showClear
                    className="w-full"
                />
            </div>

            <div className="col-12 lg:col-6">
                <div className="flex flex-wrap gap-3">
                    <div className="flex align-items-center gap-2">
                        <InputSwitch
                            checked={line.inventory.requiresBatch}
                            onChange={(event) => onInventoryChange(line.key, { requiresBatch: !!event.value })}
                        />
                        <span>Track Batch</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <InputSwitch
                            checked={line.inventory.requiresExpiry}
                            onChange={(event) => onInventoryChange(line.key, { requiresExpiry: !!event.value })}
                        />
                        <span>Track Expiry</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <InputSwitch
                            checked={line.inventory.requiresSerial}
                            onChange={(event) => onInventoryChange(line.key, { requiresSerial: !!event.value })}
                        />
                        <span>Track Serials</span>
                    </div>
                </div>
            </div>

            <div className="col-12 lg:col-4">
                <span className="p-float-label w-full">
                    <InputText
                        id={`line-batch-${line.key}`}
                        value={line.inventory.batchNo}
                        onChange={(event) => onInventoryChange(line.key, { batchNo: event.target.value })}
                        disabled={!line.inventory.requiresBatch}
                        className="w-full"
                    />
                    <label htmlFor={`line-batch-${line.key}`}>Batch No</label>
                </span>
            </div>

            <div className="col-12 lg:col-4">
                <div className="flex flex-column gap-2">
                    <small className="text-500">Expiry</small>
                    <AppDateInput
                        value={line.inventory.expiryDate}
                        onChange={(nextValue) => onInventoryChange(line.key, { expiryDate: nextValue })}
                        disabled={!line.inventory.requiresExpiry}
                    />
                </div>
            </div>

            <div className="col-12 lg:col-4">
                <label htmlFor={`line-serials-${line.key}`} className="block mb-2 font-medium">
                    Serials
                </label>
                <Chips
                    id={`line-serials-${line.key}`}
                    value={line.inventory.serials}
                    onChange={(event) => {
                        const next = sanitizeSerials(event.value);
                        onInventoryChange(line.key, { serials: next });
                    }}
                    disabled={!line.inventory.requiresSerial}
                    separator=","
                    className="w-full"
                    placeholder="Type serial and press Enter"
                />
            </div>
        </div>
    );
}
