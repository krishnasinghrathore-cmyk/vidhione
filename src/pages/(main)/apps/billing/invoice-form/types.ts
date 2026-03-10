import type {
    SaleInvoiceCreditNoteInput,
    SaleInvoiceDebitNoteInput,
    SaleInvoiceTaxLineInput
} from '@/lib/invoicing/api';

export type InvoiceFormRouteView = 'register' | 'new' | 'edit';

export type PriceListType = 'retail' | 'wholesale';

export type InvoiceDocumentType = 'invoice' | 'credit_note' | 'debit_note';

export type PlaceOfSupplyMode = 'in_state' | 'other_state';

export type DiscountMode = 'RATE' | 'AMOUNT';

export type WarehouseOption = {
    label: string;
    value: number;
};

export type TaxProfile = {
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    mrp: number | null;
    sellingRate: number | null;
    beforeVatRate: number | null;
    isActiveFlag: number | null;
    effectiveDateText: string | null;
};

export type InvoiceProductAttributeSelection = {
    productAttributeId: number;
    productAttributeTypeId: number | null;
    detail: string | null;
    isSelectedFlag: number | null;
    orderNo: number | null;
};

export type InvoiceProduct = {
    productId: number;
    name: string;
    code: string | null;
    productGroupId: number | null;
    productGroupName: string | null;
    productBrandId: number | null;
    productBrandName: string | null;
    hsnCodeId: number | null;
    hsnCode: string;
    productAttributeTypeId: number | null;
    productAttributes: InvoiceProductAttributeSelection[];
    unitId: number | null;
    unitName: string | null;
    searchText: string;
    taxProfile: TaxProfile | null;
};

export type InvoiceHeaderDraft = {
    voucherDate: Date | null;
    voucherNumberPrefix: string;
    voucherNumber: string;
    documentType: InvoiceDocumentType;
    billNumber: string;
    estimateId: number | null;
    partyLedgerId: number | null;
    ledgerGroupId: number | null;
    salesmanId: number | null;
    salesman2Id: number | null;
    textileJobberLedgerId: number | null;
    textileJobberChallanNo: string;
    textileJobberChallanDate: Date | null;
    textileRemarkForStatement: string;
    partyName: string;
    partyGstin: string;
    partyAddress: string;
    placeOfSupply: PlaceOfSupplyMode;
    priceList: PriceListType;
    warehouseId: number | null;
    isVatIncluded: boolean;
    hasScheme: boolean;
    isDisputed: boolean;
    isCancelled: boolean;
    remarks: string;
    bizomInvoiceNumber: string;
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
    isNewLineEntry: boolean;
    lineNumber: number;
    itemId: number | null;
    itemName: string;
    itemCode: string | null;
    itemFreeId: number | null;
    itemFreeName: string;
    hsnCode: string;
    unitId: number | null;
    unitName: string | null;
    unitFreeId: number | null;
    unitFreeName: string | null;
    mrp: number | null;
    quantity: number;
    freeQuantity: number;
    sellingRate: number | null;
    rate: number;
    displayAmount: number;
    productDiscountMode: DiscountMode;
    productDiscountRate: number;
    productDiscountAmount: number;
    cashDiscountMode: DiscountMode;
    cashDiscountRate: number;
    cashDiscountAmount: number;
    qpsDiscountMode: DiscountMode;
    qpsRate: number;
    qpsAmount: number;
    hasScheme: boolean;
    replacementAmount: number;
    taxLedgerId: number | null;
    taxLedger2Id: number | null;
    taxLedger3Id: number | null;
    remarks: string;
    minQuantity: number;
    minFreeQuantity: number;
    tmpTypeId: number | null;
    estimateLineId: number | null;
    textileJobberLedgerId: number | null;
    inventory: LineInventoryDraft;
};

export type ComputedInvoiceLine = InvoiceLineDraft & {
    quantityRateAmount: number;
    productDiscountAmountComputed: number;
    cashDiscountAmountComputed: number;
    qpsAmountComputed: number;
    lineAmount: number;
    taxableAmount: number;
    taxRate: number;
    taxAmount: number;
    taxableAmount2: number;
    taxRate2: number;
    taxAmount2: number;
    taxableAmount3: number;
    taxRate3: number;
    taxAmount3: number;
    totalTaxAmount: number;
    gstPercent: number;
    finalAmount: number;
};

export type TaxSummaryRow = {
    ledgerId: number;
    taxableAmount: number;
    addAmount: number;
    lessAmount: number;
};

export type InvoiceTotals = {
    totalQuantity: number;
    totalFreeQuantity: number;
    totalQuantityRateAmount: number;
    totalAmount: number;
    totalFinalAmount: number;
    totalProductDiscountAmount: number;
    totalDisplayAmount: number;
    totalCashDiscountAmount: number;
    totalReplacementAmount: number;
    totalGrossAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    totalLessSpecialAmount: number;
    totalQpsDiscountAmount: number;
    totalAdditionalTaxAmount: number;
    roundOffAmount: number;
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

export type InvoiceAdditionalTaxationDraft = {
    key: string;
    ledgerId: number | null;
    addAmount: number;
    taxableAmount: number;
};

export type InvoiceReplacementLineDraft = {
    key: string;
    itemId: number | null;
    itemName: string;
    mrp: number;
    quantity: number;
    rate: number;
    amount: number;
};

export type InvoiceProductAttributeOption = {
    productAttributeId: number;
    detail: string | null;
};

export type InvoiceTypeDetailDraft = {
    key: string;
    itemId: number | null;
    typeDetailId: number | null;
    quantity: number;
    tmpTypeId: number | null;
};

export type InvoiceGiftCertificateApplicationDraft = {
    key: string;
    giftCertificateId: string;
    certificateCode: string;
    redeemedAmount: number;
    balanceAmount: number | null;
    status: string | null;
    notes: string;
};

export type InvoiceLoyaltyApplicationDraft = {
    pointsRedeemed: number;
    amountApplied: number;
    notes: string;
};

export type InvoicePreservedDetails = {
    taxLines: SaleInvoiceTaxLineInput[];
    creditNotes: SaleInvoiceCreditNoteInput[];
    debitNotes: SaleInvoiceDebitNoteInput[];
    loyaltyApplication: InvoiceLoyaltyApplicationDraft | null;
    giftCertificateApplications: InvoiceGiftCertificateApplicationDraft[];
    otherLedgerId: number | null;
    itemBrandId: number | null;
    isChecked: boolean;
    g1BillNumber: string | null;
    g1IsSchemeMatched: boolean;
    g1IsAmountMatched: boolean;
    g1Remark: string | null;
};

export type RegisterInvoiceLineSummary = {
    saleInvoiceLineId: number;
    lineNumber: number;
    itemId: number | null;
    itemName: string;
    itemCode: string | null;
    itemFreeName: string | null;
    hsnCodeId: number | null;
    hsnCode: string | null;
    unitName: string | null;
    unitFreeName: string | null;
    tmpTypeId: number | null;
    typeDetailsText: string | null;
    quantity: number;
    freeQuantity: number;
    mrp: number | null;
    sellingRate: number | null;
    rate: number;
    displayAmount: number;
    qpsRate: number;
    qpsAmount: number;
    productDiscountRate: number;
    productDiscountAmount: number;
    cashDiscountRate: number;
    cashDiscountAmount: number;
    grossAmount: number;
    taxableAmount: number;
    taxableAmount2: number;
    taxableAmount3: number;
    taxableTotalAmount: number;
    taxLedgerId: number | null;
    taxRate: number;
    taxAmount: number;
    taxLedger2Id: number | null;
    taxRate2: number;
    taxAmount2: number;
    taxLedger3Id: number | null;
    taxRate3: number;
    taxAmount3: number;
    taxTotalAmount: number;
    finalAmount: number;
    remarks: string | null;
};


