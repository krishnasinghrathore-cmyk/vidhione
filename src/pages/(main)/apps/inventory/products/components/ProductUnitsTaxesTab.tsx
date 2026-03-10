import React from 'react';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { Button } from 'primereact/button';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { focusElementById } from '@/lib/masterFormDialog';
import { formatDateTextValue, parseDateTextValue } from '../productFormDate';
import { getProductTaxFieldId, getProductUnitFieldId } from '../productFormNavigation';
import type { DropdownLabelOption, FormState, SalesTaxDraft, UnitDraft } from '../productFormTypes';

type ProductUnitsTaxesTabProps = {
    form: FormState;
    formErrors: Record<string, string>;
    saving: boolean;
    unitDropdownOptions: DropdownLabelOption[];
    ledgerDropdownOptions: DropdownLabelOption[];
    gridDropdownAppendTo: HTMLElement | 'self';
    ledgerOptionsErrorMessage: string | null;
    fieldIds: {
        save: string;
    };
    onClearFormError: (key: string) => void;
    onAddUnit: () => void;
    onUpdateUnit: (key: number, updates: Partial<UnitDraft>) => void;
    onRemoveUnit: (key: number) => void;
    onAddTax: () => void;
    onUpdateTax: (key: number, updates: Partial<SalesTaxDraft>) => void;
    onRemoveTax: (key: number) => void;
};

export const ProductUnitsTaxesTab = ({
    form,
    formErrors,
    saving,
    unitDropdownOptions,
    ledgerDropdownOptions,
    gridDropdownAppendTo,
    ledgerOptionsErrorMessage,
    fieldIds,
    onClearFormError,
    onAddUnit,
    onUpdateUnit,
    onRemoveUnit,
    onAddTax,
    onUpdateTax,
    onRemoveTax
}: ProductUnitsTaxesTabProps) => {
    const focusAfterUnitRow = (index: number) => {
        const safeIndex = index < 0 ? form.units.length - 1 : index;
        const nextUnit = form.units[safeIndex + 1];
        if (nextUnit) {
            focusElementById(getProductUnitFieldId(nextUnit.key, 'unit'));
            return true;
        }
        const firstTax = form.salesTaxes[0];
        if (firstTax) {
            focusElementById(getProductTaxFieldId(firstTax.key, 'ledger-tax'));
            return true;
        }
        focusElementById(fieldIds.save);
        return true;
    };

    const focusAfterTaxRow = (index: number) => {
        const safeIndex = index < 0 ? form.salesTaxes.length - 1 : index;
        const nextTax = form.salesTaxes[safeIndex + 1];
        if (nextTax) {
            focusElementById(getProductTaxFieldId(nextTax.key, 'ledger-tax'));
            return true;
        }
        focusElementById(fieldIds.save);
        return true;
    };

    const handleCheckboxEnter =
        (onEnterNext: () => boolean) => (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            onEnterNext();
        };

    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex align-items-center justify-content-between mb-2">
                    <h4 className="m-0 text-600">Units</h4>
                    <Button
                        label="Add Unit"
                        icon="pi pi-plus"
                        className="p-button-text p-button-sm"
                        onClick={onAddUnit}
                        disabled={saving}
                    />
                </div>
                <DataTable
                    value={form.units}
                    dataKey="key"
                    scrollable
                    scrollHeight="240px"
                    size="small"
                    className="p-datatable-sm"
                    responsiveLayout="scroll"
                    emptyMessage="No unit rows added."
                >
                    <Column
                        header="#"
                        body={(_row: UnitDraft, options) => (options.rowIndex != null ? options.rowIndex + 1 : 1)}
                        style={{ width: '3rem' }}
                    />
                    <Column
                        header="Unit"
                        body={(row: UnitDraft) => (
                            <AppDropdown
                                inputId={getProductUnitFieldId(row.key, 'unit')}
                                value={row.unitId}
                                options={unitDropdownOptions}
                                optionLabel="label"
                                optionValue="value"
                                appendTo={gridDropdownAppendTo}
                                onChange={(e) => onUpdateUnit(row.key, { unitId: e.value ?? null })}
                                onEnterNext={() => focusElementById(getProductUnitFieldId(row.key, 'equal-unit'))}
                                placeholder="Select unit"
                                showClear
                                filter
                                filterBy="label"
                                className="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        header="Equal Unit"
                        body={(row: UnitDraft) => (
                            <AppDropdown
                                inputId={getProductUnitFieldId(row.key, 'equal-unit')}
                                value={row.equalUnitId}
                                options={unitDropdownOptions}
                                optionLabel="label"
                                optionValue="value"
                                appendTo={gridDropdownAppendTo}
                                onChange={(e) => onUpdateUnit(row.key, { equalUnitId: e.value ?? null })}
                                onEnterNext={() => focusElementById(getProductUnitFieldId(row.key, 'quantity'))}
                                placeholder="Select equal unit"
                                showClear
                                filter
                                filterBy="label"
                                className="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        header="Qty"
                        body={(row: UnitDraft) => (
                            <AppInput
                                inputType="number"
                                inputId={getProductUnitFieldId(row.key, 'quantity')}
                                value={row.quantity}
                                onValueChange={(e) =>
                                    onUpdateUnit(row.key, {
                                        quantity: typeof e.value === 'number' ? e.value : null
                                    })
                                }
                                onEnterNext={() =>
                                    focusElementById(getProductUnitFieldId(row.key, 'effective-date'))
                                }
                                useGrouping={false}
                                inputClassName="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ width: '6rem' }}
                    />
                    <Column
                        header="Effective Date"
                        body={(row: UnitDraft) => {
                            const errorKey = `units.${row.key}.effectiveDateText`;
                            const error = formErrors[errorKey];
                            return (
                                <div className="flex flex-column gap-1">
                                    <AppDateInput
                                        inputId={getProductUnitFieldId(row.key, 'effective-date')}
                                        value={parseDateTextValue(row.effectiveDateText)}
                                        onChange={(value) => {
                                            onUpdateUnit(row.key, {
                                                effectiveDateText: formatDateTextValue(value)
                                            });
                                            onClearFormError(errorKey);
                                        }}
                                        onCommit={(value, raw) => {
                                            if (value) return;
                                            onUpdateUnit(row.key, {
                                                effectiveDateText: raw.trim()
                                            });
                                            onClearFormError(errorKey);
                                        }}
                                        onEnterNext={() =>
                                            focusAfterUnitRow(
                                                form.units.findIndex((unit) => unit.key === row.key)
                                            )
                                        }
                                        inputClassName={error ? 'p-invalid' : undefined}
                                        placeholder="DD/MM/YYYY"
                                        style={{ width: '100%' }}
                                    />
                                    {error && <small className="text-red-500">{error}</small>}
                                </div>
                            );
                        }}
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        header="Delete"
                        body={(row: UnitDraft) => (
                            <Button
                                icon="pi pi-times"
                                className="p-button-text p-button-danger p-button-sm"
                                onClick={() => onRemoveUnit(row.key)}
                            />
                        )}
                        bodyStyle={{ textAlign: 'center' }}
                        style={{ width: '5rem' }}
                    />
                </DataTable>
            </div>

            <div className="col-12">
                <div className="flex align-items-center justify-content-between mb-2">
                    <h4 className="m-0 text-600">Sales Taxes</h4>
                    <Button
                        label="Add Tax"
                        icon="pi pi-plus"
                        className="p-button-text p-button-sm"
                        onClick={onAddTax}
                        disabled={saving}
                    />
                </div>
                {ledgerOptionsErrorMessage && (
                    <small className="text-red-500 block mb-2">
                        Ledger options error: {ledgerOptionsErrorMessage}
                    </small>
                )}
                <DataTable
                    value={form.salesTaxes}
                    dataKey="key"
                    scrollable
                    scrollHeight="260px"
                    size="small"
                    className="p-datatable-sm"
                    responsiveLayout="scroll"
                    emptyMessage="No tax rows added."
                >
                    <Column
                        header="#"
                        body={(_row: SalesTaxDraft, options) => (options.rowIndex != null ? options.rowIndex + 1 : 1)}
                        style={{ width: '3rem' }}
                    />
                    <Column
                        header="Tax Ledger"
                        body={(row: SalesTaxDraft) => (
                            <AppDropdown
                                inputId={getProductTaxFieldId(row.key, 'ledger-tax')}
                                value={row.ledgerTaxId}
                                options={ledgerDropdownOptions}
                                optionLabel="label"
                                optionValue="value"
                                appendTo={gridDropdownAppendTo}
                                onChange={(e) => onUpdateTax(row.key, { ledgerTaxId: e.value ?? null })}
                                onEnterNext={() => focusElementById(getProductTaxFieldId(row.key, 'ledger-tax-2'))}
                                placeholder="Select ledger"
                                showClear
                                filter
                                filterBy="label"
                                className="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        header="Tax Ledger 2"
                        body={(row: SalesTaxDraft) => (
                            <AppDropdown
                                inputId={getProductTaxFieldId(row.key, 'ledger-tax-2')}
                                value={row.ledgerTax2Id}
                                options={ledgerDropdownOptions}
                                optionLabel="label"
                                optionValue="value"
                                appendTo={gridDropdownAppendTo}
                                onChange={(e) => onUpdateTax(row.key, { ledgerTax2Id: e.value ?? null })}
                                onEnterNext={() => focusElementById(getProductTaxFieldId(row.key, 'ledger-tax-3'))}
                                placeholder="Select ledger"
                                showClear
                                filter
                                filterBy="label"
                                className="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        header="Tax Ledger 3"
                        body={(row: SalesTaxDraft) => (
                            <AppDropdown
                                inputId={getProductTaxFieldId(row.key, 'ledger-tax-3')}
                                value={row.ledgerTax3Id}
                                options={ledgerDropdownOptions}
                                optionLabel="label"
                                optionValue="value"
                                appendTo={gridDropdownAppendTo}
                                onChange={(e) => onUpdateTax(row.key, { ledgerTax3Id: e.value ?? null })}
                                onEnterNext={() => focusElementById(getProductTaxFieldId(row.key, 'mrp'))}
                                placeholder="Select ledger"
                                showClear
                                filter
                                filterBy="label"
                                className="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        header="MRP"
                        body={(row: SalesTaxDraft) => (
                            <AppInput
                                inputType="number"
                                inputId={getProductTaxFieldId(row.key, 'mrp')}
                                value={row.mrp}
                                onValueChange={(e) =>
                                    onUpdateTax(row.key, { mrp: typeof e.value === 'number' ? e.value : null })
                                }
                                onEnterNext={() => focusElementById(getProductTaxFieldId(row.key, 'margin'))}
                                useGrouping={false}
                                inputClassName="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ width: '7rem' }}
                    />
                    <Column
                        header="Margin"
                        body={(row: SalesTaxDraft) => (
                            <AppInput
                                inputType="number"
                                inputId={getProductTaxFieldId(row.key, 'margin')}
                                value={row.margin}
                                onValueChange={(e) =>
                                    onUpdateTax(row.key, { margin: typeof e.value === 'number' ? e.value : null })
                                }
                                onEnterNext={() => focusElementById(getProductTaxFieldId(row.key, 'selling-rate'))}
                                useGrouping={false}
                                inputClassName="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ width: '7rem' }}
                    />
                    <Column
                        header="Selling Rate"
                        body={(row: SalesTaxDraft) => (
                            <AppInput
                                inputType="number"
                                inputId={getProductTaxFieldId(row.key, 'selling-rate')}
                                value={row.sellingRate}
                                onValueChange={(e) =>
                                    onUpdateTax(row.key, {
                                        sellingRate: typeof e.value === 'number' ? e.value : null
                                    })
                                }
                                onEnterNext={() =>
                                    focusElementById(getProductTaxFieldId(row.key, 'before-vat-rate'))
                                }
                                useGrouping={false}
                                inputClassName="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ width: '8rem' }}
                    />
                    <Column
                        header="Before VAT Rate"
                        body={(row: SalesTaxDraft) => (
                            <AppInput
                                inputType="number"
                                inputId={getProductTaxFieldId(row.key, 'before-vat-rate')}
                                value={row.beforeVatRate}
                                onValueChange={(e) =>
                                    onUpdateTax(row.key, {
                                        beforeVatRate: typeof e.value === 'number' ? e.value : null
                                    })
                                }
                                onEnterNext={() =>
                                    focusElementById(getProductTaxFieldId(row.key, 'before-vat-rate-2'))
                                }
                                useGrouping={false}
                                inputClassName="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ width: '9rem' }}
                    />
                    <Column
                        header="Before VAT Rate 2"
                        body={(row: SalesTaxDraft) => (
                            <AppInput
                                inputType="number"
                                inputId={getProductTaxFieldId(row.key, 'before-vat-rate-2')}
                                value={row.beforeVatRate2}
                                onValueChange={(e) =>
                                    onUpdateTax(row.key, {
                                        beforeVatRate2: typeof e.value === 'number' ? e.value : null
                                    })
                                }
                                onEnterNext={() =>
                                    focusElementById(getProductTaxFieldId(row.key, 'effective-date'))
                                }
                                useGrouping={false}
                                inputClassName="p-inputtext-sm"
                                style={{ width: '100%' }}
                            />
                        )}
                        style={{ width: '9rem' }}
                    />
                    <Column
                        header="Effective Date"
                        body={(row: SalesTaxDraft) => {
                            const errorKey = `salesTaxes.${row.key}.effectiveDateText`;
                            const error = formErrors[errorKey];
                            return (
                                <div className="flex flex-column gap-1">
                                    <AppDateInput
                                        inputId={getProductTaxFieldId(row.key, 'effective-date')}
                                        value={parseDateTextValue(row.effectiveDateText)}
                                        onChange={(value) => {
                                            onUpdateTax(row.key, {
                                                effectiveDateText: formatDateTextValue(value)
                                            });
                                            onClearFormError(errorKey);
                                        }}
                                        onCommit={(value, raw) => {
                                            if (value) return;
                                            onUpdateTax(row.key, {
                                                effectiveDateText: raw.trim()
                                            });
                                            onClearFormError(errorKey);
                                        }}
                                        onEnterNext={() => focusElementById(getProductTaxFieldId(row.key, 'active'))}
                                        inputClassName={error ? 'p-invalid' : undefined}
                                        placeholder="DD/MM/YYYY"
                                        style={{ width: '100%' }}
                                    />
                                    {error && <small className="text-red-500">{error}</small>}
                                </div>
                            );
                        }}
                        style={{ minWidth: '10rem' }}
                    />
                    <Column
                        header="Active"
                        body={(row: SalesTaxDraft) => (
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId={getProductTaxFieldId(row.key, 'active')}
                                    checked={row.isActiveFlag}
                                    onChange={(e) => onUpdateTax(row.key, { isActiveFlag: Boolean(e.checked) })}
                                    onKeyDown={handleCheckboxEnter(() =>
                                        focusAfterTaxRow(
                                            form.salesTaxes.findIndex((tax) => tax.key === row.key)
                                        )
                                    )}
                                />
                                <label htmlFor={getProductTaxFieldId(row.key, 'active')} className="text-sm text-600">
                                    Active
                                </label>
                            </div>
                        )}
                        style={{ width: '9rem' }}
                    />
                    <Column
                        header="Delete"
                        body={(row: SalesTaxDraft) => (
                            <Button
                                icon="pi pi-times"
                                className="p-button-text p-button-danger p-button-sm"
                                onClick={() => onRemoveTax(row.key)}
                            />
                        )}
                        bodyStyle={{ textAlign: 'center' }}
                        style={{ width: '5rem' }}
                    />
                </DataTable>
            </div>
        </div>
    );
};
