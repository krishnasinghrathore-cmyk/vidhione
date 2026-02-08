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

const clampDiscountAmount = (mode: DiscountMode, grossAmount: number, value: number) => {
    if (mode === 'PERCENT') {
        const percent = Math.min(100, Math.max(0, value));
        return round2((grossAmount * percent) / 100);
    }
    return round2(Math.max(0, Math.min(value, grossAmount)));
};

const pushTaxSummary = (
    summaryMap: Map<number, TaxSummaryRow>,
    ledgerId: number | null,
    taxableAmount: number,
    taxAmount: number
) => {
    if (!ledgerId || taxAmount <= 0) return;
    const current = summaryMap.get(ledgerId) ?? { ledgerId, taxableAmount: 0, taxAmount: 0 };
    current.taxableAmount += taxableAmount;
    current.taxAmount += taxAmount;
    summaryMap.set(ledgerId, current);
};

export const computeInvoice = (args: {
    lines: InvoiceLineDraft[];
    placeOfSupply: PlaceOfSupplyMode;
    getTaxRateByLedgerId: (ledgerId: number | null) => number;
}): InvoiceComputation => {
    const { lines, placeOfSupply, getTaxRateByLedgerId } = args;
    const isOtherState = placeOfSupply === 'other_state';

    const taxSummaryMap = new Map<number, TaxSummaryRow>();

    const computedLines = lines.map((line) => {
        const quantity = Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0;
        const rate = Number.isFinite(line.rate) ? Math.max(0, line.rate) : 0;
        const grossAmount = round2(quantity * rate);

        const discountValue = Number.isFinite(line.discountValue) ? Math.max(0, line.discountValue) : 0;
        const discountAmount = clampDiscountAmount(line.discountMode, grossAmount, discountValue);
        const lineAmount = round2(grossAmount - discountAmount);

        const taxRate = isOtherState ? 0 : getTaxRateByLedgerId(line.taxLedgerId);
        const taxRate2 = isOtherState ? 0 : getTaxRateByLedgerId(line.taxLedger2Id);
        const taxRate3 = isOtherState ? getTaxRateByLedgerId(line.taxLedger3Id) : 0;

        const taxAmount = round2((lineAmount * taxRate) / 100);
        const taxAmount2 = round2((lineAmount * taxRate2) / 100);
        const taxAmount3 = round2((lineAmount * taxRate3) / 100);

        const totalTaxAmount = round2(taxAmount + taxAmount2 + taxAmount3);
        const totalAmount = round2(lineAmount + totalTaxAmount);
        const gstPercent = round2(taxRate + taxRate2 + taxRate3);

        pushTaxSummary(taxSummaryMap, line.taxLedgerId, lineAmount, taxAmount);
        pushTaxSummary(taxSummaryMap, line.taxLedger2Id, lineAmount, taxAmount2);
        pushTaxSummary(taxSummaryMap, line.taxLedger3Id, lineAmount, taxAmount3);

        return {
            ...line,
            quantity,
            rate,
            discountValue,
            discountAmount,
            taxableAmount: lineAmount,
            taxRate,
            taxRate2,
            taxRate3,
            taxAmount,
            taxAmount2,
            taxAmount3,
            totalTaxAmount,
            gstPercent,
            lineAmount,
            totalAmount
        };
    });

    const totals = computedLines.reduce(
        (acc, line) => {
            acc.totalQuantity += line.quantity;
            acc.totalBeforeDiscount += round2(line.quantity * line.rate);
            acc.totalDiscount += line.discountAmount;
            acc.totalTaxable += line.lineAmount;
            acc.totalTax += line.totalTaxAmount;
            acc.totalNetAmount += line.totalAmount;
            return acc;
        },
        {
            totalQuantity: 0,
            totalBeforeDiscount: 0,
            totalDiscount: 0,
            totalTaxable: 0,
            totalTax: 0,
            totalNetAmount: 0
        }
    );

    const taxSummary = Array.from(taxSummaryMap.values()).map((row) => ({
        ...row,
        taxableAmount: round2(row.taxableAmount),
        taxAmount: round2(row.taxAmount)
    }));

    return {
        lines: computedLines,
        totals: {
            totalQuantity: round2(totals.totalQuantity),
            totalBeforeDiscount: round2(totals.totalBeforeDiscount),
            totalDiscount: round2(totals.totalDiscount),
            totalTaxable: round2(totals.totalTaxable),
            totalTax: round2(totals.totalTax),
            totalNetAmount: round2(totals.totalNetAmount)
        },
        taxSummary
    };
};
