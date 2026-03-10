export type ProductAttributeOption = {
    productAttributeId: number;
    detail: string | null;
};

export type UnitDraft = {
    key: number;
    unitId: number | null;
    equalUnitId: number | null;
    quantity: number | null;
    effectiveDateText: string;
};

export type SalesTaxDraft = {
    key: number;
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    mrp: number | null;
    margin: number | null;
    sellingRate: number | null;
    beforeVatRate: number | null;
    beforeVatRate2: number | null;
    effectiveDateText: string;
    isActiveFlag: boolean;
};

export type ProductAttributeSelectionDraft = {
    productAttributeId: number;
    detail: string | null;
    orderNo: number | null;
};

export type FormState = {
    name: string;
    code: string;
    productGroupId: number | null;
    productBrandId: number | null;
    productAttributeTypeId: number | null;
    hsnCodeId: number | null;
    openingQty: number | null;
    landingCost: number | null;
    remarks: string;
    isActiveFlag: boolean;
    showOnlyInTransportFlag: boolean;
    units: UnitDraft[];
    salesTaxes: SalesTaxDraft[];
};

export type ProductGroupOption = {
    productGroupId: number;
    name: string | null;
};

export type ProductBrandOption = {
    productBrandId: number;
    name: string | null;
};

export type ProductAttributeTypeOption = {
    productAttributeTypeId: number;
    name: string | null;
};

export type HsnCodeOption = {
    hsnCodeId: number;
    name: string | null;
    code: string | null;
};

export type DropdownLabelOption = {
    label: string;
    value: number;
};
