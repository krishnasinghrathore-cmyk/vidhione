export type InvoiceMode = 'B2C' | 'B2B';

export type PriceListType = 'retail' | 'wholesale';

export type PlaceOfSupplyMode = 'in_state' | 'other_state';

export type DiscountMode = 'PERCENT' | 'AMOUNT';

export type WarehouseOption = {
    label: string;
    value: number;
};

export type TaxProfile = {
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    sellingRate: number | null;
    beforeVatRate: number | null;
    isActiveFlag: number | null;
    effectiveDateText: string | null;
};

export type InvoiceProduct = {
    productId: number;
    name: string;
    code: string | null;
    hsnCodeId: number | null;
    hsnCode: string;
    unitName: string | null;
    searchText: string;
    taxProfile: TaxProfile | null;
};

export type InvoiceHeaderDraft = {
    voucherDate: Date | null;
    voucherNumber: string;
    partyLedgerId: number | null;
    partyName: string;
    partyGstin: string;
    invoiceMode: InvoiceMode;
    placeOfSupply: PlaceOfSupplyMode;
    priceList: PriceListType;
    warehouseId: number | null;
    remarks: string;
};

export type LineInventoryDraft = {
    warehouseId: number | null;
    batchNo: string;
    expiryDate: Date | null;
    serials: string[];
    requiresBatch: boolean;
    requiresExpiry: boolean;
    requiresSerial: boolean;
};

export type InvoiceLineDraft = {
    key: string;
    itemId: number | null;
    itemName: string;
    itemCode: string | null;
    hsnCode: string;
    unitName: string | null;
    quantity: number;
    rate: number;
    discountMode: DiscountMode;
    discountValue: number;
    taxLedgerId: number | null;
    taxLedger2Id: number | null;
    taxLedger3Id: number | null;
    inventory: LineInventoryDraft;
};

export type ComputedInvoiceLine = InvoiceLineDraft & {
    discountAmount: number;
    taxableAmount: number;
    taxRate: number;
    taxRate2: number;
    taxRate3: number;
    taxAmount: number;
    taxAmount2: number;
    taxAmount3: number;
    totalTaxAmount: number;
    gstPercent: number;
    lineAmount: number;
    totalAmount: number;
};

export type TaxSummaryRow = {
    ledgerId: number;
    taxableAmount: number;
    taxAmount: number;
};

export type InvoiceTotals = {
    totalQuantity: number;
    totalBeforeDiscount: number;
    totalDiscount: number;
    totalTaxable: number;
    totalTax: number;
    totalNetAmount: number;
};

export type InvoiceComputation = {
    lines: ComputedInvoiceLine[];
    totals: InvoiceTotals;
    taxSummary: TaxSummaryRow[];
};

export type LineValidationError = {
    lineKey: string;
    messages: string[];
};

export type ValidationResult = {
    isValid: boolean;
    headerErrors: string[];
    lineErrors: LineValidationError[];
    firstInvalidLineKey: string | null;
};
