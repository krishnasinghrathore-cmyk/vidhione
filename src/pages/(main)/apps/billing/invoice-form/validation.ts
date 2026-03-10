import { z } from 'zod';
import { round2 } from './calculations';
import type {
    ComputedInvoiceLine,
    InvoiceAdditionalTaxationDraft,
    InvoiceHeaderDraft,
    InvoiceTotals,
    InvoiceTypeDetailDraft,
    PlaceOfSupplyMode,
    TaxSummaryRow,
    ValidationResult
} from './types';

const headerSchema = z
    .object({
        voucherDate: z.date().nullable(),
        partyLedgerId: z.number().int().positive().nullable(),
        partyName: z.string()
    })
    .superRefine((value, ctx) => {
        if (!value.voucherDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['voucherDate'],
                message: 'Voucher date is required.'
            });
        }
        if (!value.partyLedgerId && !value.partyName.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['partyName'],
                message: 'Party ledger or party name is required.'
            });
        }
    });

const lineSchema = z
    .object({
        itemId: z.number().int().positive().nullable(),
        quantity: z.number(),
        rate: z.number(),
        freeQuantity: z.number(),
        mrp: z.number().nullable(),
        displayAmount: z.number(),
        productDiscountMode: z.enum(['RATE', 'AMOUNT']),
        productDiscountRate: z.number(),
        productDiscountAmount: z.number(),
        cashDiscountMode: z.enum(['RATE', 'AMOUNT']),
        cashDiscountRate: z.number(),
        cashDiscountAmount: z.number(),
        qpsDiscountMode: z.enum(['RATE', 'AMOUNT']),
        qpsRate: z.number(),
        qpsAmount: z.number(),
        lineAmount: z.number(),
        finalAmount: z.number(),
        taxLedgerId: z.number().int().positive().nullable(),
        taxLedger2Id: z.number().int().positive().nullable(),
        taxLedger3Id: z.number().int().positive().nullable(),
        inventory: z.object({
            requiresSerial: z.boolean(),
            serials: z.array(z.string()),
            requiresBatch: z.boolean(),
            batchNo: z.string(),
            requiresExpiry: z.boolean(),
            expiryDate: z.date().nullable()
        })
    })
    .superRefine((line, ctx) => {
        if (!line.itemId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['itemId'], message: 'Item is required.' });
        }
        if (line.quantity <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantity'], message: 'Qty must be greater than 0.' });
        }
        if (line.rate < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rate'], message: 'Rate cannot be negative.' });
        }
        if (line.freeQuantity < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['freeQuantity'], message: 'Free Qty cannot be negative.' });
        }
        if (line.freeQuantity > line.quantity) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['freeQuantity'],
                message: 'Free Qty cannot be greater than Qty.'
            });
        }
        if ((line.mrp ?? 0) < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mrp'], message: 'MRP cannot be negative.' });
        }
        if (line.displayAmount < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['displayAmount'],
                message: 'Display amount cannot be negative.'
            });
        }
        if (line.productDiscountMode === 'AMOUNT' && line.productDiscountAmount < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['productDiscountAmount'],
                message: 'Product discount amount cannot be negative.'
            });
        }
        if (line.cashDiscountMode === 'AMOUNT' && line.cashDiscountAmount < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cashDiscountAmount'],
                message: 'Cash discount amount cannot be negative.'
            });
        }
        if (line.qpsDiscountMode === 'AMOUNT' && line.qpsAmount < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['qpsAmount'],
                message: 'QPS amount cannot be negative.'
            });
        }
        if (line.productDiscountMode === 'RATE' && (line.productDiscountRate < 0 || line.productDiscountRate > 100)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['productDiscountRate'],
                message: 'Product discount % must be between 0 and 100.'
            });
        }
        if (line.cashDiscountMode === 'RATE' && (line.cashDiscountRate < 0 || line.cashDiscountRate > 100)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cashDiscountRate'],
                message: 'Cash discount % must be between 0 and 100.'
            });
        }
        if (line.qpsDiscountMode === 'RATE' && (line.qpsRate < 0 || line.qpsRate > 100)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['qpsRate'],
                message: 'QPS % must be between 0 and 100.'
            });
        }

        if (line.lineAmount < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['lineAmount'],
                message: 'Amount cannot be negative after discounts.'
            });
        }
        if (line.finalAmount < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['finalAmount'],
                message: 'Final amount cannot be negative.'
            });
        }
    });

const extractIssueMessages = (issues: z.ZodIssue[]) => Array.from(new Set(issues.map((issue) => issue.message)));
const VALIDATION_EPSILON = 0.05;

const buildLineErrors = (line: ComputedInvoiceLine, placeOfSupply: PlaceOfSupplyMode) => {
    const parseResult = lineSchema.safeParse(line);
    const errors = parseResult.success ? [] : extractIssueMessages(parseResult.error.issues);

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

const buildPostingConsistencyErrors = (args: {
    lines: ComputedInvoiceLine[];
    totals?: InvoiceTotals;
    taxSummaryRows?: TaxSummaryRow[];
    additionalTaxations?: InvoiceAdditionalTaxationDraft[];
    typeDetails?: InvoiceTypeDetailDraft[];
    strictPostingParity?: boolean;
}) => {
    const errors: string[] = [];
    const { lines, totals, taxSummaryRows = [], additionalTaxations = [], typeDetails = [], strictPostingParity = true } = args;

    if (!totals || !strictPostingParity) return errors;

    const requiredFiniteTotals: Array<[string, number]> = [
        ['Total Gross Amount', Number(totals.totalGrossAmount ?? 0)],
        ['Total Tax Amount', Number(totals.totalTaxAmount ?? 0)],
        ['Total Additional Tax Amount', Number(totals.totalAdditionalTaxAmount ?? 0)],
        ['Round Off Amount', Number(totals.roundOffAmount ?? 0)],
        ['Total Net Amount', Number(totals.totalNetAmount ?? 0)]
    ];
    requiredFiniteTotals.forEach(([label, value]) => {
        if (!Number.isFinite(value)) {
            errors.push(`${label} is invalid.`);
        }
    });

    if (Number(totals.totalGrossAmount ?? 0) < 0) errors.push('Total gross amount cannot be negative.');
    if (Number(totals.totalTaxAmount ?? 0) < 0) errors.push('Total tax amount cannot be negative.');
    if (Number(totals.totalAdditionalTaxAmount ?? 0) < 0) errors.push('Total additional tax amount cannot be negative.');
    if (Number(totals.totalNetAmount ?? 0) < 0) errors.push('Total net amount cannot be negative.');

    const recomputedTaxFromRows = round2(
        taxSummaryRows.reduce((sum, row) => sum + Number(row.addAmount ?? 0) - Number(row.lessAmount ?? 0), 0)
    );
    if (Math.abs(recomputedTaxFromRows - Number(totals.totalTaxAmount ?? 0)) > VALIDATION_EPSILON) {
        errors.push('Tax summary total does not match computed total tax amount.');
    }

    const recomputedAdditionalTax = round2(
        additionalTaxations.reduce((sum, row) => sum + Number(row.addAmount ?? 0), 0)
    );
    if (Math.abs(recomputedAdditionalTax - Number(totals.totalAdditionalTaxAmount ?? 0)) > VALIDATION_EPSILON) {
        errors.push('Additional tax total does not match totals section.');
    }

    const recomputedNet = round2(
        Number(totals.totalGrossAmount ?? 0)
            + Number(totals.totalTaxAmount ?? 0)
            + Number(totals.totalAdditionalTaxAmount ?? 0)
            + Number(totals.roundOffAmount ?? 0)
    );
    if (Math.abs(recomputedNet - Number(totals.totalNetAmount ?? 0)) > VALIDATION_EPSILON) {
        errors.push('Net amount does not match gross + tax + additional tax + round off.');
    }

    const seenTaxLedgers = new Set<number>();
    taxSummaryRows.forEach((row, index) => {
        const ledgerId = Number(row.ledgerId ?? 0);
        if (!Number.isFinite(ledgerId) || ledgerId <= 0) {
            errors.push(`Tax summary row ${index + 1}: ledger is required.`);
            return;
        }
        if (seenTaxLedgers.has(ledgerId)) {
            errors.push(`Tax summary has duplicate ledger row (${ledgerId}).`);
            return;
        }
        seenTaxLedgers.add(ledgerId);
        if (Number(row.addAmount ?? 0) < 0) {
            errors.push(`Tax summary row ${index + 1}: add amount cannot be negative.`);
        }
        if (Number(row.lessAmount ?? 0) < 0) {
            errors.push(`Tax summary row ${index + 1}: less amount cannot be negative.`);
        }
    });

    additionalTaxations.forEach((row, index) => {
        const addAmount = Number(row.addAmount ?? 0);
        if (addAmount > 0) {
            const ledgerId = Number(row.ledgerId ?? 0);
            if (!Number.isFinite(ledgerId) || ledgerId <= 0) {
                errors.push(`Additional tax row ${index + 1}: ledger is required for non-zero amount.`);
            }
        }
        if (addAmount < 0) errors.push(`Additional tax row ${index + 1}: amount cannot be negative.`);
        if (Number(row.taxableAmount ?? 0) < 0) errors.push(`Additional tax row ${index + 1}: taxable amount cannot be negative.`);
    });

    const lineQtyByTypeKey = new Map<string, { quantity: number; itemName: string }>();
    lines.forEach((line) => {
        const itemId = Number(line.itemId ?? 0);
        if (!Number.isFinite(itemId) || itemId <= 0) return;
        const tmpTypeId = Number(line.tmpTypeId ?? 0);
        const key = `${Math.trunc(itemId)}:${Number.isFinite(tmpTypeId) && tmpTypeId > 0 ? Math.trunc(tmpTypeId) : 0}`;
        const existing = lineQtyByTypeKey.get(key);
        const quantity = Number(line.quantity ?? 0);
        lineQtyByTypeKey.set(key, {
            quantity: (existing?.quantity ?? 0) + (Number.isFinite(quantity) ? quantity : 0),
            itemName: line.itemName?.trim() || existing?.itemName || `Item ${Math.trunc(itemId)}`
        });
    });

    const typeQtyByTypeKey = new Map<string, number>();
    typeDetails.forEach((row, index) => {
        const quantity = Number(row.quantity ?? 0);
        if (!Number.isFinite(quantity)) {
            errors.push(`Type detail row ${index + 1}: qty is invalid.`);
            return;
        }
        if (quantity < 0) {
            errors.push(`Type detail row ${index + 1}: qty cannot be negative.`);
            return;
        }
        if (quantity <= 0) return;
        const itemId = Number(row.itemId ?? 0);
        if (!Number.isFinite(itemId) || itemId <= 0) {
            errors.push(`Type detail row ${index + 1}: item is required for non-zero qty.`);
            return;
        }
        const tmpTypeId = Number(row.tmpTypeId ?? 0);
        const key = `${Math.trunc(itemId)}:${Number.isFinite(tmpTypeId) && tmpTypeId > 0 ? Math.trunc(tmpTypeId) : 0}`;
        typeQtyByTypeKey.set(key, (typeQtyByTypeKey.get(key) ?? 0) + quantity);
    });

    typeQtyByTypeKey.forEach((typeQty, key) => {
        const lineQty = lineQtyByTypeKey.get(key);
        if (!lineQty) {
            errors.push('Type details contain qty for an item that is not present in line entries.');
            return;
        }
        if (typeQty > lineQty.quantity + VALIDATION_EPSILON) {
            errors.push(
                `Type details qty (${round2(typeQty)}) exceeds line qty (${round2(lineQty.quantity)}) for ${lineQty.itemName}.`
            );
        }
    });

    return Array.from(new Set(errors));
};

export const validateInvoice = (args: {
    header: InvoiceHeaderDraft;
    lines: ComputedInvoiceLine[];
    totals?: InvoiceTotals;
    taxSummaryRows?: TaxSummaryRow[];
    additionalTaxations?: InvoiceAdditionalTaxationDraft[];
    typeDetails?: InvoiceTypeDetailDraft[];
    transport?: {
        isApplied: boolean;
        transporterId: number | null;
    };
    policy?: {
        strictPostingParity?: boolean;
        requireTransporterWhenApplied?: boolean;
    };
}): ValidationResult => {
    const { header, lines, totals, taxSummaryRows, additionalTaxations, typeDetails, transport, policy } = args;

    const headerResult = headerSchema.safeParse(header);
    const headerErrors = headerResult.success ? [] : extractIssueMessages(headerResult.error.issues);

    const lineErrors = lines
        .map((line) => ({
            lineKey: line.key,
            messages: buildLineErrors(line, header.placeOfSupply)
        }))
        .filter((line) => line.messages.length > 0);

    const postingErrors = buildPostingConsistencyErrors({
        lines,
        totals,
        taxSummaryRows,
        additionalTaxations,
        typeDetails,
        strictPostingParity: policy?.strictPostingParity ?? true
    });
    const allHeaderErrors = Array.from(new Set([...headerErrors, ...postingErrors]));
    if (policy?.requireTransporterWhenApplied && transport?.isApplied && !transport.transporterId) {
        allHeaderErrors.push('Transporter is required when transport is applied.');
    }
    const normalizedHeaderErrors = Array.from(new Set(allHeaderErrors));

    const isValid = normalizedHeaderErrors.length === 0 && lineErrors.length === 0;

    return {
        isValid,
        headerErrors: normalizedHeaderErrors,
        lineErrors,
        firstInvalidLineKey: lineErrors[0]?.lineKey ?? null
    };
};
