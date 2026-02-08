import type { ComputedInvoiceLine, InvoiceHeaderDraft, ValidationResult } from './types';

const buildLineErrors = (line: ComputedInvoiceLine) => {
    const errors: string[] = [];

    if (!line.itemId) {
        errors.push('Item is required.');
    }
    if (!line.hsnCode.trim()) {
        errors.push('HSN/SAC is required.');
    }
    if (line.quantity <= 0) {
        errors.push('Qty must be greater than 0.');
    }
    if (line.rate < 0) {
        errors.push('Rate cannot be negative.');
    }
    if (line.discountMode === 'PERCENT' && (line.discountValue < 0 || line.discountValue > 100)) {
        errors.push('Discount % must be between 0 and 100.');
    }

    const serialCount = line.inventory.serials.filter((serial) => serial.trim().length > 0).length;
    if (line.inventory.requiresSerial && serialCount > 0 && serialCount !== line.quantity) {
        errors.push(`Serial count (${serialCount}) must match Qty (${line.quantity}).`);
    }

    if (line.inventory.requiresBatch && !line.inventory.batchNo.trim()) {
        errors.push('Batch no is required for this line.');
    }
    if (line.inventory.requiresExpiry && !line.inventory.expiryDate) {
        errors.push('Expiry date is required for this line.');
    }

    return errors;
};

export const validateInvoice = (args: {
    header: InvoiceHeaderDraft;
    lines: ComputedInvoiceLine[];
}): ValidationResult => {
    const { header, lines } = args;

    const headerErrors: string[] = [];
    if (header.invoiceMode === 'B2B' && !header.partyGstin.trim()) {
        headerErrors.push('GSTIN is required for B2B invoices.');
    }

    const lineErrors = lines
        .map((line) => ({
            lineKey: line.key,
            messages: buildLineErrors(line)
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
