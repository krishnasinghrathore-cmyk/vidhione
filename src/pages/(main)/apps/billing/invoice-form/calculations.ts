import type {
    DiscountMode,
    InvoiceComputation,
    InvoiceLineDraft,
    PlaceOfSupplyMode,
    TaxProfile,
    TaxSummaryRow
} from './types';

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const parseDateKey = (value?: string | null) => {
    if (!value) return 0;
    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) return Number(trimmed);
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return Number(trimmed.replace(/-/g, ''));
    const slash = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!slash) return 0;
    const [, dd, mm, yyyy] = slash;
    return Number(`${yyyy}${mm}${dd}`);
};

export const pickLatestActiveTaxProfile = (taxRows: TaxProfile[] | null | undefined): TaxProfile | null => {
    if (!taxRows || taxRows.length === 0) return null;
    const activeRows = taxRows.filter((row) => (row.isActiveFlag ?? 1) === 1);
    const source = activeRows.length > 0 ? activeRows : taxRows;
    return [...source].sort((a, b) => parseDateKey(a.effectiveDateText) - parseDateKey(b.effectiveDateText)).pop() ?? null;
};

const toSafeNumber = (value: number | null | undefined, fallback = 0) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return value;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const clampAmount = (value: number, maxAmount: number) => Math.min(Math.max(0, value), Math.max(0, maxAmount));

const resolveDiscountAmount = (args: {
    mode: DiscountMode;
    rate: number;
    amount: number;
    baseAmount: number;
}) => {
    const { mode, rate, amount, baseAmount } = args;
    if (mode === 'AMOUNT') {
        return round2(clampAmount(amount, baseAmount));
    }
    return round2((baseAmount * clampPercent(rate)) / 100);
};

const pushTaxSummary = (
    summaryMap: Map<number, TaxSummaryRow>,
    ledgerId: number | null,
    taxableAmount: number,
    addAmount: number
) => {
    if (!ledgerId || addAmount <= 0) return;
    const current = summaryMap.get(ledgerId) ?? { ledgerId, taxableAmount: 0, addAmount: 0, lessAmount: 0 };
    current.taxableAmount += taxableAmount;
    current.addAmount += addAmount;
    summaryMap.set(ledgerId, current);
};

export const computeInvoice = (args: {
    lines: InvoiceLineDraft[];
    placeOfSupply: PlaceOfSupplyMode;
    isVatIncluded: boolean;
    additionalTaxAmount?: number;
    getTaxRateByLedgerId: (ledgerId: number | null) => number;
}): InvoiceComputation => {
    const { lines, placeOfSupply, isVatIncluded, additionalTaxAmount = 0, getTaxRateByLedgerId } = args;
    const isOtherState = placeOfSupply === 'other_state';

    const taxSummaryMap = new Map<number, TaxSummaryRow>();

    let totalTaxableAmount = 0;
    let totalTaxableAmount3 = 0;

    const computedLines = lines.map((line) => {
        const quantity = Math.max(0, toSafeNumber(line.quantity));
        const freeQuantity = Math.max(0, toSafeNumber(line.freeQuantity));
        const rate = Math.max(0, toSafeNumber(line.rate));
        const quantityRateAmount = round2(quantity * rate);

        const productDiscountRate = Math.max(0, toSafeNumber(line.productDiscountRate));
        const productDiscountAmount = resolveDiscountAmount({
            mode: line.productDiscountMode,
            rate: productDiscountRate,
            amount: toSafeNumber(line.productDiscountAmount),
            baseAmount: quantityRateAmount
        });

        const qpsRate = Math.max(0, toSafeNumber(line.qpsRate));
        const qpsAmount = resolveDiscountAmount({
            mode: line.qpsDiscountMode,
            rate: qpsRate,
            amount: toSafeNumber(line.qpsAmount),
            baseAmount: quantityRateAmount
        });

        const displayAmount = round2(Math.max(0, toSafeNumber(line.displayAmount)));
        const lineAmountRaw = round2(quantityRateAmount - productDiscountAmount - displayAmount - qpsAmount);
        const lineAmount = Math.max(0, lineAmountRaw);

        const cashDiscountRate = Math.max(0, toSafeNumber(line.cashDiscountRate));
        const cashBase = Math.max(0, lineAmount);
        const cashDiscountAmount = resolveDiscountAmount({
            mode: line.cashDiscountMode,
            rate: cashDiscountRate,
            amount: toSafeNumber(line.cashDiscountAmount),
            baseAmount: cashBase
        });

        const finalAmount = Math.max(0, round2(lineAmount - cashDiscountAmount));

        const taxRate = isOtherState ? 0 : getTaxRateByLedgerId(line.taxLedgerId);
        const taxRate2 = isOtherState ? 0 : getTaxRateByLedgerId(line.taxLedger2Id);
        const taxRate3 = isOtherState ? getTaxRateByLedgerId(line.taxLedger3Id) : 0;

        let taxableAmount = 0;
        let taxableAmount2 = 0;
        let taxableAmount3 = 0;
        let taxAmount = 0;
        let taxAmount2 = 0;
        let taxAmount3 = 0;

        if (!isVatIncluded) {
            if (!isOtherState) {
                taxableAmount = finalAmount;
                taxableAmount2 = finalAmount;
                taxAmount = round2((taxableAmount * taxRate) / 100);
                taxAmount2 = round2((taxableAmount2 * taxRate2) / 100);
            } else {
                taxableAmount3 = finalAmount;
                taxAmount3 = round2((taxableAmount3 * taxRate3) / 100);
            }
        } else if (!isOtherState) {
            const combinedRate = taxRate + taxRate2;
            taxableAmount = combinedRate > 0 ? round2((finalAmount * 100) / (100 + combinedRate)) : finalAmount;
            taxableAmount2 = taxableAmount;
            taxAmount = round2((taxableAmount * taxRate) / 100);
            taxAmount2 = round2((taxableAmount2 * taxRate2) / 100);
        } else {
            taxableAmount3 = taxRate3 > 0 ? round2((finalAmount * 100) / (100 + taxRate3)) : finalAmount;
            taxAmount3 = round2((taxableAmount3 * taxRate3) / 100);
        }

        const totalTaxAmount = round2(taxAmount + taxAmount2 + taxAmount3);
        const gstPercent = round2(taxRate + taxRate2 + taxRate3);

        totalTaxableAmount += taxableAmount;
        totalTaxableAmount3 += taxableAmount3;

        pushTaxSummary(taxSummaryMap, line.taxLedgerId, taxableAmount, taxAmount);
        pushTaxSummary(taxSummaryMap, line.taxLedger2Id, taxableAmount2, taxAmount2);
        pushTaxSummary(taxSummaryMap, line.taxLedger3Id, taxableAmount3, taxAmount3);

        return {
            ...line,
            quantity,
            freeQuantity,
            rate,
            productDiscountRate,
            cashDiscountRate,
            qpsRate,
            quantityRateAmount,
            productDiscountAmountComputed: productDiscountAmount,
            cashDiscountAmountComputed: cashDiscountAmount,
            qpsAmountComputed: qpsAmount,
            lineAmount,
            taxableAmount,
            taxRate,
            taxAmount,
            taxableAmount2,
            taxRate2,
            taxAmount2,
            taxableAmount3,
            taxRate3,
            taxAmount3,
            totalTaxAmount,
            gstPercent,
            finalAmount
        };
    });

    const baseTotals = computedLines.reduce(
        (acc, line) => {
            acc.totalQuantity += line.quantity;
            acc.totalFreeQuantity += line.freeQuantity;
            acc.totalQuantityRateAmount += line.quantityRateAmount;
            acc.totalAmount += line.lineAmount;
            acc.totalFinalAmount += line.finalAmount;
            acc.totalProductDiscountAmount += line.productDiscountAmountComputed;
            acc.totalDisplayAmount += line.displayAmount;
            acc.totalCashDiscountAmount += line.cashDiscountAmountComputed;
            acc.totalQpsDiscountAmount += line.qpsAmountComputed;
            acc.totalTaxAmount += line.totalTaxAmount;
            return acc;
        },
        {
            totalQuantity: 0,
            totalFreeQuantity: 0,
            totalQuantityRateAmount: 0,
            totalAmount: 0,
            totalFinalAmount: 0,
            totalProductDiscountAmount: 0,
            totalDisplayAmount: 0,
            totalCashDiscountAmount: 0,
            totalReplacementAmount: 0,
            totalQpsDiscountAmount: 0,
            totalTaxAmount: 0
        }
    );

    const roundedTaxable = round2(totalTaxableAmount);
    const roundedTaxable3 = round2(totalTaxableAmount3);
    const totalGrossAmount = isOtherState ? roundedTaxable3 : roundedTaxable;
    const roundedAdditionalTaxAmount = round2(Math.max(0, additionalTaxAmount));
    const totalLessSpecialAmount = 0;
    const totalNetBase = totalGrossAmount + baseTotals.totalTaxAmount + roundedAdditionalTaxAmount;
    const roundOffAmount = round2(Math.round(totalNetBase) - totalNetBase);
    const totalNetAmount = round2(totalNetBase + roundOffAmount);

    const taxSummary = Array.from(taxSummaryMap.values()).map((row) => ({
        ...row,
        taxableAmount: round2(row.taxableAmount),
        addAmount: round2(row.addAmount),
        lessAmount: round2(row.lessAmount)
    }));

    return {
        lines: computedLines,
        totals: {
            totalQuantity: round2(baseTotals.totalQuantity),
            totalFreeQuantity: round2(baseTotals.totalFreeQuantity),
            totalQuantityRateAmount: round2(baseTotals.totalQuantityRateAmount),
            totalAmount: round2(baseTotals.totalAmount),
            totalFinalAmount: round2(baseTotals.totalFinalAmount),
            totalProductDiscountAmount: round2(baseTotals.totalProductDiscountAmount),
            totalDisplayAmount: round2(baseTotals.totalDisplayAmount),
            totalCashDiscountAmount: round2(baseTotals.totalCashDiscountAmount),
            totalReplacementAmount: round2(baseTotals.totalReplacementAmount),
            totalGrossAmount: round2(totalGrossAmount),
            totalTaxAmount: round2(baseTotals.totalTaxAmount),
            totalNetAmount,
            totalLessSpecialAmount,
            totalQpsDiscountAmount: round2(baseTotals.totalQpsDiscountAmount),
            totalAdditionalTaxAmount: roundedAdditionalTaxAmount,
            roundOffAmount
        },
        taxSummary
    };
};
