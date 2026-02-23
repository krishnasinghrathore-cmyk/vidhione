import type { ComputedInvoiceLine, InvoiceHeaderDraft, PlaceOfSupplyMode, ValidationResult } from './types';

const round3 = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

const buildLineErrors = (line: ComputedInvoiceLine, placeOfSupply: PlaceOfSupplyMode) => {
    const errors: string[] = [];

    if (!line.itemId) {
        errors.push('Item is required.');
    }
    if (line.quantity <= 0) {
        errors.push('Qty must be greater than 0.');
    }
    if (line.rate < 0) {
        errors.push('Rate cannot be negative.');
    }
    if (line.freeQuantity < 0) {
        errors.push('Free Qty cannot be negative.');
    }
    if (line.freeQuantity > line.quantity) {
        errors.push('Free Qty cannot be greater than Qty.');
    }
    if ((line.mrp ?? 0) < 0) {
        errors.push('MRP cannot be negative.');
    }
    if (line.displayAmount < 0) {
        errors.push('Display amount cannot be negative.');
    }
    if (line.productDiscountMode === 'AMOUNT' && line.productDiscountAmount < 0) {
        errors.push('Product discount amount cannot be negative.');
    }
    if (line.cashDiscountMode === 'AMOUNT' && line.cashDiscountAmount < 0) {
        errors.push('Cash discount amount cannot be negative.');
    }
    if (line.qpsDiscountMode === 'AMOUNT' && line.qpsAmount < 0) {
        errors.push('QPS amount cannot be negative.');
    }

    if (line.productDiscountMode === 'RATE' && (line.productDiscountRate < 0 || line.productDiscountRate > 100)) {
        errors.push('Product discount % must be between 0 and 100.');
    }
    if (line.cashDiscountMode === 'RATE' && (line.cashDiscountRate < 0 || line.cashDiscountRate > 100)) {
        errors.push('Cash discount % must be between 0 and 100.');
    }
    if (line.qpsDiscountMode === 'RATE' && (line.qpsRate < 0 || line.qpsRate > 100)) {
        errors.push('QPS % must be between 0 and 100.');
    }

    const serialCount = line.inventory.serials.filter((serial) => serial.trim().length > 0).length;
    if (line.inventory.requiresSerial && !Number.isInteger(line.quantity)) {
        errors.push('Qty must be a whole number when serial tracking is enabled.');
    }
    if (line.inventory.requiresSerial && serialCount !== round3(line.quantity)) {
        errors.push(`Serial count (${serialCount}) must match Qty (${line.quantity}).`);
    }

    if (line.inventory.requiresBatch && !line.inventory.batchNo.trim()) {
        errors.push('Batch no is required for this line.');
    }
    if (line.inventory.requiresExpiry && !line.inventory.expiryDate) {
        errors.push('Expiry date is required for this line.');
    }

    if (line.lineAmount < 0) {
        errors.push('Amount cannot be negative after discounts.');
    }
    if (line.finalAmount < 0) {
        errors.push('Final amount cannot be negative.');
    }

    if (placeOfSupply === 'other_state') {
        if (line.taxLedgerId || line.taxLedger2Id) {
            errors.push('SGST/CGST should be empty for other-state lines.');
        }
        if (!line.taxLedger3Id && line.finalAmount > 0) {
            errors.push('IGST ledger is required for other-state taxable lines.');
        }
    } else {
        if (line.taxLedger3Id) {
            errors.push('IGST should be empty for in-state lines.');
        }
        if (Boolean(line.taxLedgerId) !== Boolean(line.taxLedger2Id)) {
            errors.push('Both SGST and CGST ledgers must be set together for in-state lines.');
        }
    }

    return errors;
};

export const validateInvoice = (args: {
    header: InvoiceHeaderDraft;
    lines: ComputedInvoiceLine[];
}): ValidationResult => {
    const { header, lines } = args;

    const headerErrors: string[] = [];
    if (!header.voucherDate) {
        headerErrors.push('Voucher date is required.');
    }
    if (!header.partyLedgerId && !header.partyName.trim()) {
        headerErrors.push('Party ledger or party name is required.');
    }

    const lineErrors = lines
        .map((line) => ({
            lineKey: line.key,
            messages: buildLineErrors(line, header.placeOfSupply)
        }))
        .filter((line) => line.messages.length > 0);

    const isValid = headerErrors.length === 0 && lineErrors.length === 0;

    return {
        isValid,
        headerErrors,
        lineErrors,
        firstInvalidLineKey: lineErrors[0]?.lineKey ?? null
    };
};
