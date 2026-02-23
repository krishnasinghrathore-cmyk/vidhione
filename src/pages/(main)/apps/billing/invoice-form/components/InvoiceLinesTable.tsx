import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import AppDropdown from '@/components/AppDropdown';
import ItemAutoComplete, { type ItemOption as AppItemOption } from '@/components/ItemAutoComplete';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import { formatAmount } from '../../helpers';
import { InvoiceLineInventoryPanel } from './InvoiceLineInventoryPanel';
import type {
    ComputedInvoiceLine,
    InvoiceLineDraft,
    LineInventoryDraft,
    PlaceOfSupplyMode,
    WarehouseOption
} from '../types';

type UnitOption = {
    label: string;
    value: number;
};

type MRPOption = {
    label: string;
    value: number;
};

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
    ledgerGroupId?: number | null;
    taxRate: number;
};

type InvoiceLinesTableProps = {
    lines: ComputedInvoiceLine[];
    placeOfSupply: PlaceOfSupplyMode;
    productOptions: AppItemOption[];
    mrpOptionsByProductId: Record<number, MRPOption[]>;
    unitOptions: UnitOption[];
    taxLedgerOptions: TaxLedgerOption[];
    warehouseOptions: WarehouseOption[];
    lineErrorsByKey: Record<string, string[]>;
    inventoryStatusByLineKey: Record<string, 'saved' | 'pending'>;
    onSelectProduct: (lineKey: string, productId: number | null) => void;
    onSelectMrp: (lineKey: string, mrp: number | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceLineDraft>) => void;
    onInventoryChange: (lineKey: string, patch: Partial<LineInventoryDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    onDuplicateLine: (lineKey: string) => void;
    onAddLine: () => void;
};

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

const isEditableInputTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tagName = element.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
    return Boolean(
        element.closest(
            '.p-inputtext, .p-inputnumber, .p-autocomplete, .p-dropdown, .p-checkbox, .p-calendar, .p-inputtextarea'
        )
    );
};

const resolveTaxRole = (label: string | null | undefined) => {
    const text = (label ?? '').toLowerCase();
    if (text.includes('sgst')) return 'sgst';
    if (text.includes('cgst')) return 'cgst';
    if (text.includes('igst')) return 'igst';
    return 'unknown';
};

const formatQty = (value: number | null) => {
    if (value == null) return '-';
    if (!Number.isFinite(value)) return '-';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(3).replace(/\.?0+$/, '');
};

const formatMaybeAmount = (value: number | null) => (value == null ? '-' : formatAmount(value));

const cloneLineInventory = (inventory: LineInventoryDraft): LineInventoryDraft => ({
    ...inventory,
    serials: [...inventory.serials]
});

const createLineSnapshot = (line: ComputedInvoiceLine): InvoiceLineDraft => ({
    ...(line as InvoiceLineDraft),
    inventory: cloneLineInventory(line.inventory)
});

const createRestorePatch = (snapshot: InvoiceLineDraft): Partial<InvoiceLineDraft> => ({
    ...snapshot,
    inventory: cloneLineInventory(snapshot.inventory)
});

export function InvoiceLinesTable({
    lines,
    placeOfSupply,
    productOptions,
    mrpOptionsByProductId,
    unitOptions,
    taxLedgerOptions,
    warehouseOptions,
    lineErrorsByKey,
    inventoryStatusByLineKey,
    onSelectProduct,
    onSelectMrp,
    onLineChange,
    onInventoryChange,
    onDeleteLine,
    onDuplicateLine,
    onAddLine
}: InvoiceLinesTableProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const previousLineCountRef = useRef(lines.length);
    const previousSelectedLineKeyRef = useRef<string | null>(null);
    const lineSnapshotsRef = useRef<Record<string, InvoiceLineDraft>>({});

    const productLabelById = useMemo(() => {
        const map = new Map<number, string>();
        productOptions.forEach((option) => map.set(option.value, option.label));
        return map;
    }, [productOptions]);

    const unitLabelById = useMemo(() => {
        const map = new Map<number, string>();
        unitOptions.forEach((option) => map.set(option.value, option.label));
        return map;
    }, [unitOptions]);

    const taxLabelById = useMemo(() => {
        const map = new Map<number, string>();
        taxLedgerOptions.forEach((option) => map.set(option.value, option.label));
        return map;
    }, [taxLedgerOptions]);

    const taxLedgerPartyOptions = useMemo(
        () =>
            taxLedgerOptions.map((option) => ({
                label: option.label,
                value: option.value,
                address: option.address ?? null,
                taxRate: Number(option.taxRate ?? 0)
            })),
        [taxLedgerOptions]
    );

    const selectedLine = useMemo(
        () => (selectedLineKey ? lines.find((line) => line.key === selectedLineKey) ?? null : null),
        [lines, selectedLineKey]
    );
    const isNewLineEntryMode = Boolean(selectedLine?.isNewLineEntry);

    const selectedLineMrpOptions = useMemo(() => {
        if (!selectedLine?.itemId) return [];
        return mrpOptionsByProductId[selectedLine.itemId] ?? [];
    }, [mrpOptionsByProductId, selectedLine?.itemId]);

    const taxLedgerById = useMemo(() => {
        const map = new Map<number, { value: number; label: string; taxRate: number; role: ReturnType<typeof resolveTaxRole> }>();
        taxLedgerPartyOptions.forEach((option) => {
            map.set(option.value, {
                value: option.value,
                label: option.label,
                taxRate: Number(option.taxRate ?? 0),
                role: resolveTaxRole(option.label)
            });
        });
        return map;
    }, [taxLedgerPartyOptions]);

    const findPairedTaxLedgerId = (sourceLedgerId: number, role: 'sgst' | 'cgst') => {
        const source = taxLedgerById.get(sourceLedgerId);
        if (!source) return null;
        const sourceRate = Number(source.taxRate ?? 0);
        const candidates = taxLedgerPartyOptions.filter((option) => {
            if (option.value === sourceLedgerId) return false;
            const optionRate = Number(option.taxRate ?? 0);
            if (Number.isFinite(sourceRate) && sourceRate > 0 && Number.isFinite(optionRate)) {
                if (Math.abs(optionRate - sourceRate) > 0.0001) return false;
            }
            return true;
        });
        const roleMatch = candidates.find((option) => resolveTaxRole(option.label) === role);
        if (roleMatch) return roleMatch.value;
        return candidates[0]?.value ?? null;
    };

    useEffect(() => {
        const currentKeys = new Set(lines.map((line) => line.key));
        Object.keys(lineSnapshotsRef.current).forEach((lineKey) => {
            if (!currentKeys.has(lineKey)) {
                delete lineSnapshotsRef.current[lineKey];
            }
        });
    }, [lines]);

    useEffect(() => {
        const previousSelectedLineKey = previousSelectedLineKeyRef.current;
        if (previousSelectedLineKey && previousSelectedLineKey !== selectedLineKey) {
            delete lineSnapshotsRef.current[previousSelectedLineKey];
        }
        previousSelectedLineKeyRef.current = selectedLineKey;
    }, [selectedLineKey]);

    useEffect(() => {
        if (!selectedLine) return;
        if (lineSnapshotsRef.current[selectedLine.key]) return;
        lineSnapshotsRef.current[selectedLine.key] = createLineSnapshot(selectedLine);
    }, [selectedLine]);

    useEffect(() => {
        if (lines.length === 0) {
            if (selectedLineKey != null) setSelectedLineKey(null);
            previousLineCountRef.current = 0;
            return;
        }

        const hasSelection = selectedLineKey != null && lines.some((line) => line.key === selectedLineKey);
        const addedNewLine = lines.length > previousLineCountRef.current;
        if (!hasSelection || addedNewLine) {
            const targetLine = lines[lines.length - 1];
            setSelectedLineKey(targetLine?.key ?? null);
        }

        previousLineCountRef.current = lines.length;
    }, [lines, selectedLineKey]);

    const handleEnterNext = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        focusNextFrom(containerRef.current, event.currentTarget as HTMLElement);
    };

    const patchSelectedLine = (patch: Partial<InvoiceLineDraft>) => {
        if (!selectedLine) return;
        onLineChange(selectedLine.key, patch);
    };

    const handleEditorAdd = () => {
        if (selectedLine) {
            onLineChange(selectedLine.key, { isNewLineEntry: false });
            delete lineSnapshotsRef.current[selectedLine.key];
        }
        onAddLine();
    };

    const handleEditorUpdate = () => {
        if (!selectedLine) return;
        onLineChange(selectedLine.key, { isNewLineEntry: false });
        delete lineSnapshotsRef.current[selectedLine.key];
        setSelectedLineKey(null);
    };

    const handleEditorCancel = () => {
        if (!selectedLine) return;
        const snapshot = lineSnapshotsRef.current[selectedLine.key];
        if (snapshot) {
            onLineChange(selectedLine.key, createRestorePatch(snapshot));
        }
        delete lineSnapshotsRef.current[selectedLine.key];
        setSelectedLineKey(null);
    };

    const resolveRowClassName = (line: ComputedInvoiceLine) =>
        classNames({
            'app-entry-line-row--selected': line.key === selectedLineKey,
            'p-invalid': (lineErrorsByKey[line.key] ?? []).length > 0
        });

    return (
        <div
            ref={containerRef}
            className="app-entry-section app-entry-section--lines mt-4"
            onKeyDownCapture={(event) => {
                if (!selectedLineKey) return;
                if (event.ctrlKey && event.key.toLowerCase() === 'd') {
                    event.preventDefault();
                    onDuplicateLine(selectedLineKey);
                    return;
                }
                if (event.key === 'Delete') {
                    if (isEditableInputTarget(event.target)) return;
                    event.preventDefault();
                    onDeleteLine(selectedLineKey);
                }
            }}
        >
            <div className="app-entry-lines">
                <div className="app-entry-lines-header">
                    <div className="app-entry-lines-title">Line Items</div>
                    <Button
                        label="New Line"
                        icon="pi pi-plus"
                        className="app-action-compact p-button-outlined"
                        onClick={onAddLine}
                    />
                </div>

                <div className="app-entry-lines-grid">
                    <DataTable
                        value={lines}
                        dataKey="key"
                        responsiveLayout="scroll"
                        size="small"
                        className="app-entry-lines-table invoice-form-lines-table"
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
                        rowClassName={(line) => resolveRowClassName(line as ComputedInvoiceLine)}
                    >
                        <Column expander style={{ width: '3rem' }} />
                        <Column
                            header="SN"
                            headerClassName="app-entry-header-center"
                            body={(_row: ComputedInvoiceLine, options: { rowIndex: number }) => (
                                <span className="text-500">{options.rowIndex + 1}</span>
                            )}
                            style={{ width: '4rem' }}
                        />
                        <Column
                            header="Item"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => (
                                <span>{line.itemName || (line.itemId ? productLabelById.get(line.itemId) ?? '-' : '-')}</span>
                            )}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Type"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => <span>{line.tmpTypeId ?? '-'}</span>}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Remark"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => <span>{line.remarks || '-'}</span>}
                            style={{ minWidth: '10rem' }}
                        />
                        <Column
                            header="MRP"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatMaybeAmount(line.mrp)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="UnitQ"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => <span>{line.unitName || '-'}</span>}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Qty"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatQty(line.quantity)}</span>}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="S Rate"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatMaybeAmount(line.sellingRate)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Rate"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.rate)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Free"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatQty(line.freeQuantity)}</span>}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="ItemF"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => (
                                <span>
                                    {line.itemFreeName || (line.itemFreeId ? productLabelById.get(line.itemFreeId) ?? '-' : '-')}
                                </span>
                            )}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="UnitF"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => <span>{line.unitFreeName || '-'}</span>}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="QPS Rate"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.qpsRate)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="QPS Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => (
                                <span>{formatAmount(line.qpsDiscountMode === 'AMOUNT' ? line.qpsAmount : line.qpsAmountComputed)}</span>
                            )}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Display"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.displayAmount)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Pro Dis %"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.productDiscountRate)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Pro Dis Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => (
                                <span>
                                    {formatAmount(
                                        line.productDiscountMode === 'AMOUNT'
                                            ? line.productDiscountAmount
                                            : line.productDiscountAmountComputed
                                    )}
                                </span>
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="Cash Dis %"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.cashDiscountRate)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Cash Dis Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => (
                                <span>
                                    {formatAmount(
                                        line.cashDiscountMode === 'AMOUNT' ? line.cashDiscountAmount : line.cashDiscountAmountComputed
                                    )}
                                </span>
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="SGST"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => (
                                <div className="flex flex-column gap-1">
                                    {placeOfSupply === 'other_state' ? (
                                        <span className="text-500">N/A</span>
                                    ) : (
                                        <>
                                            <span>
                                                {line.taxLedgerId
                                                    ? taxLabelById.get(line.taxLedgerId) ?? `Ledger ${line.taxLedgerId}`
                                                    : '-'}
                                            </span>
                                            <small className="text-600">
                                                {line.taxRate.toFixed(2)}% / {formatAmount(line.taxAmount)}
                                            </small>
                                        </>
                                    )}
                                </div>
                            )}
                            style={{ minWidth: '11rem' }}
                        />
                        <Column
                            header="CGST"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => (
                                <div className="flex flex-column gap-1">
                                    {placeOfSupply === 'other_state' ? (
                                        <span className="text-500">N/A</span>
                                    ) : (
                                        <>
                                            <span>
                                                {line.taxLedger2Id
                                                    ? taxLabelById.get(line.taxLedger2Id) ?? `Ledger ${line.taxLedger2Id}`
                                                    : '-'}
                                            </span>
                                            <small className="text-600">
                                                {line.taxRate2.toFixed(2)}% / {formatAmount(line.taxAmount2)}
                                            </small>
                                        </>
                                    )}
                                </div>
                            )}
                            style={{ minWidth: '11rem' }}
                        />
                        <Column
                            header="IGST"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => (
                                <div className="flex flex-column gap-1">
                                    {placeOfSupply === 'in_state' ? (
                                        <span className="text-500">N/A</span>
                                    ) : (
                                        <>
                                            <span>
                                                {line.taxLedger3Id
                                                    ? taxLabelById.get(line.taxLedger3Id) ?? `Ledger ${line.taxLedger3Id}`
                                                    : '-'}
                                            </span>
                                            <small className="text-600">
                                                {line.taxRate3.toFixed(2)}% / {formatAmount(line.taxAmount3)}
                                            </small>
                                        </>
                                    )}
                                </div>
                            )}
                            style={{ minWidth: '11rem' }}
                        />
                        <Column
                            header="QtyxRate"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.quantityRateAmount)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Amount"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.lineAmount)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Final"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.finalAmount)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Inv"
                            headerClassName="app-entry-header-center"
                            body={(line: ComputedInvoiceLine) => {
                                const status = inventoryStatusByLineKey[line.key] ?? 'pending';
                                if (status === 'saved') {
                                    return <span className="text-green-600 font-medium">Saved</span>;
                                }
                                return <span className="text-orange-600 font-medium">Pending</span>;
                            }}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Errors"
                            headerClassName="app-entry-header-left"
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
                            style={{ minWidth: '16rem' }}
                        />
                        <Column
                            header=""
                            headerClassName="app-entry-header-center"
                            body={(line: ComputedInvoiceLine) => (
                                <div className="flex align-items-center justify-content-center gap-1 app-entry-line-actions">
                                    <Button
                                        icon="pi pi-pencil"
                                        className="p-button-text p-button-sm"
                                        onClick={() => setSelectedLineKey(line.key)}
                                        tooltip="Edit line"
                                        tooltipOptions={{ position: 'top' }}
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        severity="danger"
                                        text
                                        onClick={() => onDeleteLine(line.key)}
                                        disabled={lines.length <= 1}
                                        tooltip="Delete line"
                                        tooltipOptions={{ position: 'top' }}
                                    />
                                </div>
                            )}
                            style={{ width: '6rem' }}
                        />
                    </DataTable>

                    <small className="text-500 block mt-2">
                        Keyboard: press <b>Enter</b> to move next, <b>Ctrl + D</b> to duplicate selected row, and <b>Delete</b> to
                        remove selected row when focus is outside an input.
                    </small>
                </div>
            </div>

            {selectedLine ? (
                <div className="app-entry-line-editor invoice-line-editor">
                    <div className="app-entry-line-editor__meta">
                        <span
                            className={`app-entry-line-editor__mode ${
                                isNewLineEntryMode ? 'app-entry-line-editor__mode--add' : 'app-entry-line-editor__mode--edit'
                            }`}
                        >
                            {isNewLineEntryMode
                                ? `Adding new line (SN ${selectedLine.lineNumber})`
                                : `Editing selected line (SN ${selectedLine.lineNumber})`}
                        </span>
                    </div>

                    <div className="invoice-line-editor__grid">
                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--item">
                            <label className="invoice-line-editor__label">Item</label>
                            <ItemAutoComplete
                                value={selectedLine.itemId}
                                options={productOptions}
                                onChange={(productId) => onSelectProduct(selectedLine.key, productId)}
                                placeholder="Select item"
                                showClear
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--remark">
                            <label className="invoice-line-editor__label">Remark</label>
                            <InputText
                                value={selectedLine.remarks}
                                className="app-input w-full invoice-line-editor__control"
                                onChange={(event) => patchSelectedLine({ remarks: event.target.value })}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--scheme">
                            <label className="invoice-line-editor__label">Scheme</label>
                            <div className="invoice-line-editor__check">
                                <Checkbox
                                    inputId={`invoice-line-scheme-${selectedLine.key}`}
                                    checked={selectedLine.hasScheme}
                                    onChange={(event) => {
                                        if (!event.checked) {
                                            patchSelectedLine({
                                                hasScheme: false,
                                                productDiscountMode: 'RATE',
                                                productDiscountRate: 0,
                                                productDiscountAmount: 0
                                            });
                                            return;
                                        }
                                        patchSelectedLine({ hasScheme: true });
                                    }}
                                />
                                <label htmlFor={`invoice-line-scheme-${selectedLine.key}`} className="text-700 text-sm">
                                    Apply
                                </label>
                            </div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">MRP</label>
                            {selectedLineMrpOptions.length > 0 ? (
                                <AppDropdown
                                    value={selectedLine.mrp}
                                    options={selectedLineMrpOptions}
                                    onChange={(event) => {
                                        const nextMrp = event.value != null ? Number(event.value) : null;
                                        onSelectMrp(selectedLine.key, nextMrp);
                                    }}
                                    placeholder="MRP"
                                    showClear
                                    filter
                                    className="w-full invoice-line-editor__control"
                                    onKeyDown={handleEnterNext}
                                />
                            ) : (
                                <InputNumber
                                    value={selectedLine.mrp}
                                    onValueChange={(event) =>
                                        patchSelectedLine({ mrp: event.value != null ? Number(event.value) : null })
                                    }
                                    className="app-input w-full invoice-line-editor__control"
                                    min={0}
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                    onKeyDown={handleEnterNext}
                                />
                            )}
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field">
                            <label className="invoice-line-editor__label">Unit Q</label>
                            <AppDropdown
                                value={selectedLine.unitId}
                                options={unitOptions}
                                onChange={(event) => {
                                    const unitId = (event.value as number) ?? null;
                                    patchSelectedLine({
                                        unitId,
                                        unitName: unitId ? unitLabelById.get(unitId) ?? null : null
                                    });
                                }}
                                placeholder="Unit"
                                showClear
                                filter
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Qty</label>
                            <InputNumber
                                value={selectedLine.quantity}
                                onValueChange={(event) => patchSelectedLine({ quantity: event.value != null ? Number(event.value) : 0 })}
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                maxFractionDigits={3}
                                useGrouping={false}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">S. Rate</label>
                            <InputNumber
                                value={selectedLine.sellingRate}
                                onValueChange={(event) =>
                                    patchSelectedLine({ sellingRate: event.value != null ? Number(event.value) : null })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Rate</label>
                            <InputNumber
                                value={selectedLine.rate}
                                onValueChange={(event) => patchSelectedLine({ rate: event.value != null ? Number(event.value) : 0 })}
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Free</label>
                            <InputNumber
                                value={selectedLine.freeQuantity}
                                onValueChange={(event) =>
                                    patchSelectedLine({ freeQuantity: event.value != null ? Number(event.value) : 0 })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                maxFractionDigits={3}
                                useGrouping={false}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--free-item">
                            <label className="invoice-line-editor__label">Free Item</label>
                            <ItemAutoComplete
                                value={selectedLine.itemFreeId}
                                options={productOptions}
                                onChange={(itemFreeId) => patchSelectedLine({ itemFreeId })}
                                placeholder="Select free item"
                                showClear
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field">
                            <label className="invoice-line-editor__label">Unit F</label>
                            <AppDropdown
                                value={selectedLine.unitFreeId}
                                options={unitOptions}
                                onChange={(event) => {
                                    const unitFreeId = (event.value as number) ?? null;
                                    patchSelectedLine({
                                        unitFreeId,
                                        unitFreeName: unitFreeId ? unitLabelById.get(unitFreeId) ?? null : null
                                    });
                                }}
                                placeholder="Unit"
                                showClear
                                filter
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">QPS Rate</label>
                            <InputNumber
                                value={selectedLine.qpsRate}
                                onValueChange={(event) =>
                                    patchSelectedLine({
                                        qpsRate: event.value != null ? Number(event.value) : 0,
                                        qpsDiscountMode: 'RATE'
                                    })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                max={100}
                                maxFractionDigits={2}
                                useGrouping={false}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">QPS Amt</label>
                            <InputNumber
                                value={selectedLine.qpsDiscountMode === 'AMOUNT' ? selectedLine.qpsAmount : selectedLine.qpsAmountComputed}
                                onValueChange={(event) =>
                                    patchSelectedLine({
                                        qpsAmount: event.value != null ? Number(event.value) : 0,
                                        qpsDiscountMode: 'AMOUNT'
                                    })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Display</label>
                            <InputNumber
                                value={selectedLine.displayAmount}
                                onValueChange={(event) =>
                                    patchSelectedLine({ displayAmount: event.value != null ? Number(event.value) : 0 })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Scheme %</label>
                            <InputNumber
                                value={selectedLine.productDiscountRate}
                                onValueChange={(event) =>
                                    patchSelectedLine({
                                        hasScheme: true,
                                        productDiscountRate: event.value != null ? Number(event.value) : 0,
                                        productDiscountMode: 'RATE'
                                    })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                max={100}
                                maxFractionDigits={2}
                                useGrouping={false}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Scheme Amt</label>
                            <InputNumber
                                value={
                                    selectedLine.productDiscountMode === 'AMOUNT'
                                        ? selectedLine.productDiscountAmount
                                        : selectedLine.productDiscountAmountComputed
                                }
                                onValueChange={(event) =>
                                    patchSelectedLine({
                                        hasScheme: true,
                                        productDiscountAmount: event.value != null ? Number(event.value) : 0,
                                        productDiscountMode: 'AMOUNT'
                                    })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Disc %</label>
                            <InputNumber
                                value={selectedLine.cashDiscountRate}
                                onValueChange={(event) =>
                                    patchSelectedLine({
                                        cashDiscountRate: event.value != null ? Number(event.value) : 0,
                                        cashDiscountMode: 'RATE'
                                    })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                max={100}
                                maxFractionDigits={2}
                                useGrouping={false}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half">
                            <label className="invoice-line-editor__label">Disc Amt</label>
                            <InputNumber
                                value={
                                    selectedLine.cashDiscountMode === 'AMOUNT'
                                        ? selectedLine.cashDiscountAmount
                                        : selectedLine.cashDiscountAmountComputed
                                }
                                onValueChange={(event) =>
                                    patchSelectedLine({
                                        cashDiscountAmount: event.value != null ? Number(event.value) : 0,
                                        cashDiscountMode: 'AMOUNT'
                                    })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--tax">
                            <div className="invoice-line-editor__label-row">
                                <span className="invoice-line-editor__label">
                                    {placeOfSupply === 'other_state' ? 'IGST Ledger' : 'SGST Ledger'}
                                </span>
                                <small className="invoice-line-editor__label-hint">
                                    {placeOfSupply === 'other_state'
                                        ? `${selectedLine.taxRate3.toFixed(2)}% / ${formatAmount(selectedLine.taxAmount3)}`
                                        : `${selectedLine.taxRate.toFixed(2)}% / ${formatAmount(selectedLine.taxAmount)}`}
                                </small>
                            </div>
                            <LedgerAutoComplete
                                variant="party"
                                value={placeOfSupply === 'other_state' ? selectedLine.taxLedger3Id : selectedLine.taxLedgerId}
                                options={taxLedgerPartyOptions}
                                onChange={(ledgerId) => {
                                    if (placeOfSupply === 'other_state') {
                                        patchSelectedLine({ taxLedger3Id: ledgerId });
                                        return;
                                    }
                                    if (ledgerId == null) {
                                        patchSelectedLine({
                                            taxLedgerId: null,
                                            taxLedger2Id: null
                                        });
                                        return;
                                    }
                                    const pairedCgstId = findPairedTaxLedgerId(ledgerId, 'cgst');
                                    patchSelectedLine({
                                        taxLedgerId: ledgerId,
                                        taxLedger2Id: pairedCgstId ?? selectedLine.taxLedger2Id ?? null
                                    });
                                }}
                                placeholder={placeOfSupply === 'other_state' ? 'Select IGST' : 'Select SGST'}
                                showClear
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        {placeOfSupply === 'in_state' ? (
                            <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--tax">
                                <div className="invoice-line-editor__label-row">
                                    <span className="invoice-line-editor__label">CGST Ledger</span>
                                    <small className="invoice-line-editor__label-hint">
                                        {selectedLine.taxRate2.toFixed(2)}% / {formatAmount(selectedLine.taxAmount2)}
                                    </small>
                                </div>
                                <LedgerAutoComplete
                                    variant="party"
                                    value={selectedLine.taxLedger2Id}
                                    options={taxLedgerPartyOptions}
                                    onChange={(taxLedger2Id) => {
                                        if (taxLedger2Id == null) {
                                            patchSelectedLine({
                                                taxLedger2Id: null,
                                                taxLedgerId: null
                                            });
                                            return;
                                        }
                                        const pairedSgstId = findPairedTaxLedgerId(taxLedger2Id, 'sgst');
                                        patchSelectedLine({
                                            taxLedger2Id,
                                            taxLedgerId: pairedSgstId ?? selectedLine.taxLedgerId ?? null
                                        });
                                    }}
                                    placeholder="Select CGST"
                                    showClear
                                    className="w-full invoice-line-editor__control"
                                    onKeyDown={handleEnterNext}
                                />
                            </div>
                        ) : null}

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--readonly">
                            <label className="invoice-line-editor__label">Qty x Rate</label>
                            <div className="invoice-line-editor__readonly">{formatAmount(selectedLine.quantityRateAmount)}</div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--readonly">
                            <label className="invoice-line-editor__label">Amount</label>
                            <div className="invoice-line-editor__readonly">{formatAmount(selectedLine.lineAmount)}</div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--readonly">
                            <label className="invoice-line-editor__label">Final Amt</label>
                            <div className="invoice-line-editor__readonly">{formatAmount(selectedLine.finalAmount)}</div>
                        </div>
                    </div>
                    <div className="flex justify-content-end gap-2 mt-3">
                        {isNewLineEntryMode ? (
                            <Button
                                label="Add"
                                icon="pi pi-plus"
                                className="app-action-compact"
                                onClick={handleEditorAdd}
                            />
                        ) : (
                            <Button
                                label="Update"
                                icon="pi pi-check"
                                className="app-action-compact"
                                onClick={handleEditorUpdate}
                            />
                        )}
                        <Button
                            label="Cancel"
                            icon="pi pi-times"
                            className="app-action-compact p-button-outlined"
                            onClick={handleEditorCancel}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
