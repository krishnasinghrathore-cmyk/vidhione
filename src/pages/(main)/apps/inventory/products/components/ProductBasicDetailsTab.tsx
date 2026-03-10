import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { focusElementById, focusElementByIdNextFrame } from '@/lib/masterFormDialog';
import type {
    FormState,
    HsnCodeOption,
    ProductAttributeOption,
    ProductAttributeSelectionDraft,
    ProductAttributeTypeOption,
    ProductBrandOption,
    ProductGroupOption
} from '../productFormTypes';

type ProductBasicDetailsTabProps = {
    form: FormState;
    formErrors: Record<string, string>;
    productGroups: ProductGroupOption[];
    productBrands: ProductBrandOption[];
    hsnCodes: HsnCodeOption[];
    productAttributeTypes: ProductAttributeTypeOption[];
    productAttributeRows: ProductAttributeSelectionDraft[];
    productAttributeOptionMap: Map<number, string | null>;
    availableAttributeOptions: ProductAttributeOption[];
    attributeToAdd: number | null;
    attributeOptionsLoading: boolean;
    attributeOptionsErrorMessage: string | null;
    fieldIds: {
        productGroup: string;
        productBrand: string;
        productCode: string;
        productName: string;
        productHsn: string;
        productOpeningQty: string;
        productLandingCost: string;
        productRemarks: string;
        productTransportOnly: string;
        productActive: string;
        productAttributeType: string;
        productAttributeDetail: string;
        productAttributeAdd: string;
        productSave: string;
    };
    onProductGroupChange: (value: number | null) => void;
    onProductBrandChange: (value: number | null) => void;
    onCodeChange: (value: string) => void;
    onNameChange: (value: string) => void;
    onHsnCodeChange: (value: number | null) => void;
    onOpeningQtyChange: (value: number | null) => void;
    onLandingCostChange: (value: number | null) => void;
    onRemarksChange: (value: string) => void;
    onShowOnlyInTransportChange: (value: boolean) => void;
    onActiveChange: (value: boolean) => void;
    onProductAttributeTypeChange: (value: number | null) => void;
    onAttributeToAddChange: (value: number | null) => void;
    onAddProductAttributeDetail: () => void;
    onRemoveProductAttributeDetail: (productAttributeId: number) => void;
    onAttributeReorder: (event: { value: ProductAttributeSelectionDraft[] }) => void;
};

export const ProductBasicDetailsTab = ({
    form,
    formErrors,
    productGroups,
    productBrands,
    hsnCodes,
    productAttributeTypes,
    productAttributeRows,
    productAttributeOptionMap,
    availableAttributeOptions,
    attributeToAdd,
    attributeOptionsLoading,
    attributeOptionsErrorMessage,
    fieldIds,
    onProductGroupChange,
    onProductBrandChange,
    onCodeChange,
    onNameChange,
    onHsnCodeChange,
    onOpeningQtyChange,
    onLandingCostChange,
    onRemarksChange,
    onShowOnlyInTransportChange,
    onActiveChange,
    onProductAttributeTypeChange,
    onAttributeToAddChange,
    onAddProductAttributeDetail,
    onRemoveProductAttributeDetail,
    onAttributeReorder
}: ProductBasicDetailsTabProps) => {
    const focusAttributeDetailOrSave = () => {
        if (focusElementById(fieldIds.productAttributeDetail)) return true;
        return focusElementById(fieldIds.productSave);
    };

    const focusAttributeAddOrSave = () => {
        if (attributeToAdd && focusElementById(fieldIds.productAttributeAdd)) return true;
        return focusElementById(fieldIds.productSave);
    };

    const handleCheckboxEnter =
        (nextFieldId: string) => (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            focusElementById(nextFieldId);
        };

    const handleAddAttributeDetail = () => {
        if (!attributeToAdd) return;
        const remainingCount = availableAttributeOptions.filter(
            (option) => option.productAttributeId !== attributeToAdd
        ).length;
        onAddProductAttributeDetail();
        focusElementByIdNextFrame(
            remainingCount > 0 ? fieldIds.productAttributeDetail : fieldIds.productSave
        );
    };

    const handleRemoveAttributeDetail = (productAttributeId: number) => {
        onRemoveProductAttributeDetail(productAttributeId);
        focusElementByIdNextFrame(fieldIds.productAttributeDetail);
    };

    return (
        <div className="grid">
            <div className="col-12 lg:col-7">
                <div className="grid">
                    <div className="col-12">
                        <label className="block text-600 mb-1">Product Group</label>
                        <AppDropdown
                            inputId={fieldIds.productGroup}
                            value={form.productGroupId}
                            options={productGroups}
                            optionLabel="name"
                            optionValue="productGroupId"
                            onChange={(e) => onProductGroupChange(e.value ?? null)}
                            onEnterNext={() => focusElementById(fieldIds.productBrand)}
                            placeholder="Select product group"
                            showClear
                            filter
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Product Brand</label>
                        <AppDropdown
                            inputId={fieldIds.productBrand}
                            value={form.productBrandId}
                            options={productBrands}
                            optionLabel="name"
                            optionValue="productBrandId"
                            onChange={(e) => onProductBrandChange(e.value ?? null)}
                            onEnterNext={() => focusElementById(fieldIds.productCode)}
                            placeholder="Select product brand"
                            showClear
                            filter
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Code</label>
                        <AppInput
                            id={fieldIds.productCode}
                            value={form.code}
                            onChange={(e) => onCodeChange(e.target.value)}
                            onEnterNext={() => focusElementById(fieldIds.productName)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            id={fieldIds.productName}
                            value={form.name}
                            onChange={(e) => onNameChange(e.target.value)}
                            onEnterNext={() => focusElementById(fieldIds.productHsn)}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">HSN Code</label>
                        <AppDropdown
                            inputId={fieldIds.productHsn}
                            value={form.hsnCodeId}
                            options={hsnCodes}
                            optionLabel="name"
                            optionValue="hsnCodeId"
                            itemTemplate={(option: HsnCodeOption) => (
                                <span>
                                    {option.name}
                                    {option.code ? ` (${option.code})` : ''}
                                </span>
                            )}
                            onChange={(e) => onHsnCodeChange(e.value ?? null)}
                            onEnterNext={() => focusElementById(fieldIds.productOpeningQty)}
                            placeholder="Select HSN code"
                            showClear
                            filter
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Opening Qty</label>
                        <AppInput
                            inputType="number"
                            inputId={fieldIds.productOpeningQty}
                            value={form.openingQty}
                            onValueChange={(e) =>
                                onOpeningQtyChange(typeof e.value === 'number' ? e.value : null)
                            }
                            onEnterNext={() => focusElementById(fieldIds.productLandingCost)}
                            useGrouping={false}
                            maxFractionDigits={2}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Landing Cost</label>
                        <AppInput
                            inputType="number"
                            inputId={fieldIds.productLandingCost}
                            value={form.landingCost}
                            onValueChange={(e) =>
                                onLandingCostChange(typeof e.value === 'number' ? e.value : null)
                            }
                            onEnterNext={() => focusElementById(fieldIds.productRemarks)}
                            useGrouping={false}
                            maxFractionDigits={2}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Remarks</label>
                        <AppInput
                            id={fieldIds.productRemarks}
                            value={form.remarks}
                            onChange={(e) => onRemarksChange(e.target.value)}
                            onEnterNext={() => focusElementById(fieldIds.productTransportOnly)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <div className="flex flex-column gap-2">
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId={fieldIds.productTransportOnly}
                                    checked={form.showOnlyInTransportFlag}
                                    onChange={(e) => onShowOnlyInTransportChange(Boolean(e.checked))}
                                    onKeyDown={handleCheckboxEnter(fieldIds.productActive)}
                                />
                                <label htmlFor={fieldIds.productTransportOnly} className="text-sm text-600">
                                    Show Only In Transport
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId={fieldIds.productActive}
                                    checked={form.isActiveFlag}
                                    onChange={(e) => onActiveChange(Boolean(e.checked))}
                                    onKeyDown={handleCheckboxEnter(fieldIds.productAttributeType)}
                                />
                                <label htmlFor={fieldIds.productActive} className="text-sm text-600">
                                    Active
                                </label>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 lg:col-5">
                <div className="grid">
                    <div className="col-12">
                        <label className="block text-600 mb-1">Product Attribute Type</label>
                        <AppDropdown
                            inputId={fieldIds.productAttributeType}
                            value={form.productAttributeTypeId}
                            options={productAttributeTypes}
                            optionLabel="name"
                            optionValue="productAttributeTypeId"
                            onChange={(e) => onProductAttributeTypeChange(e.value ?? null)}
                            onEnterNext={focusAttributeDetailOrSave}
                            placeholder="Select product attribute type"
                            showClear
                            filter
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <h4 className="m-0 text-600">Type Details</h4>
                        </div>
                        {!form.productAttributeTypeId ? (
                            <small className="text-500">Select a product attribute type to manage attributes.</small>
                        ) : attributeOptionsLoading ? (
                            <small className="text-500">Loading type details...</small>
                        ) : attributeOptionsErrorMessage ? (
                            <small className="text-red-500">Type details error: {attributeOptionsErrorMessage}</small>
                        ) : (
                            <>
                                <div className="flex flex-column sm:flex-row align-items-stretch gap-2 mb-2">
                                    <AppDropdown
                                        inputId={fieldIds.productAttributeDetail}
                                        value={attributeToAdd}
                                        options={availableAttributeOptions}
                                        optionLabel="detail"
                                        optionValue="productAttributeId"
                                        onChange={(e) => onAttributeToAddChange(e.value ?? null)}
                                        onEnterNext={focusAttributeAddOrSave}
                                        placeholder="Select detail"
                                        showClear
                                        filter
                                        disabled={availableAttributeOptions.length === 0}
                                        itemTemplate={(option: ProductAttributeOption) => (
                                            <span>{option.detail ?? `Detail ${option.productAttributeId}`}</span>
                                        )}
                                        valueTemplate={(option?: ProductAttributeOption) =>
                                            option ? (
                                                <span>{option.detail ?? `Detail ${option.productAttributeId}`}</span>
                                            ) : (
                                                <span className="text-500">Select detail</span>
                                            )
                                        }
                                        style={{ width: '100%' }}
                                    />
                                    <Button
                                        id={fieldIds.productAttributeAdd}
                                        label="Add Detail"
                                        icon="pi pi-plus"
                                        className="p-button-sm"
                                        onClick={handleAddAttributeDetail}
                                        disabled={!attributeToAdd}
                                    />
                                </div>
                                <DataTable
                                    value={productAttributeRows}
                                    dataKey="productAttributeId"
                                    scrollable
                                    scrollHeight="460px"
                                    size="small"
                                    className="p-datatable-sm"
                                    responsiveLayout="scroll"
                                    emptyMessage="No details added."
                                    reorderableRows
                                    onRowReorder={onAttributeReorder}
                                >
                                    <Column rowReorder style={{ width: '3rem' }} />
                                    <Column
                                        header="Detail"
                                        body={(row: ProductAttributeSelectionDraft) => (
                                            <span className="text-600">
                                                {productAttributeOptionMap.get(row.productAttributeId) ??
                                                    row.detail ??
                                                    `Detail ${row.productAttributeId}`}
                                            </span>
                                        )}
                                        style={{ minWidth: '12rem' }}
                                    />
                                    <Column
                                        header="Remove"
                                        body={(row: ProductAttributeSelectionDraft) => (
                                            <Button
                                                icon="pi pi-times"
                                                className="p-button-text p-button-danger p-button-sm"
                                                onClick={() => handleRemoveAttributeDetail(row.productAttributeId)}
                                            />
                                        )}
                                        bodyStyle={{ textAlign: 'center' }}
                                        style={{ width: '6rem' }}
                                    />
                                </DataTable>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
