import { buildInvoiceLedgerRowsFromSaleInvoices, type InvoiceLedgerHeaderRow } from '@/lib/invoiceLedgerRows';

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const toFiniteNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const formatVatIncluded = (value: unknown) => {
    if (value === true || value === 1 || value === '1') return 'Yes';
    return 'No';
};

export const buildSalesBookDetailedRowsFromInvoiceHeaders = async (
    invoiceHeaders: InvoiceLedgerHeaderRow[]
): Promise<Array<Record<string, unknown>>> => {
    const invoiceRows = await buildInvoiceLedgerRowsFromSaleInvoices(invoiceHeaders);
    if (!invoiceRows.length) return [];

    let serialNumber = 1;

    return invoiceRows.flatMap((invoiceRow, invoiceIndex) => {
        const voucherNumber = normalizeText(invoiceRow.voucherNumber);
        const voucherDateText = normalizeText(invoiceRow.voucherDateText);
        const ledgerName = normalizeText(invoiceRow.ledger);
        const vatIncludedText = formatVatIncluded(invoiceRow.isVatIncluded);
        const voucherGroupKey = `${String(invoiceIndex + 1).padStart(6, '0')}|${voucherNumber || 'invoice'}`;
        const lines = Array.isArray(invoiceRow.lines) ? invoiceRow.lines : [];

        return lines.map((line) => {
            const row = line as Record<string, unknown>;
            const detailRow = {
                sNo: serialNumber,
                voucherGroupKey,
                voucherNumber,
                voucherDateText,
                ledgerName,
                vatIncludedText,
                item: normalizeText(row.item),
                qty: round2(toFiniteNumber(row.qty)),
                unitQ: normalizeText(row.unitQ),
                free: round2(toFiniteNumber(row.free)),
                itemF: normalizeText(row.itemF),
                unitF: normalizeText(row.unitF),
                rate: round2(toFiniteNumber(row.rate)),
                amount: round2(toFiniteNumber(row.lineAmount) || toFiniteNumber(row.qtyxRate)),
                taxName: normalizeText(row.taxName),
                taxAmt: round2(toFiniteNumber(row.taxAmt)),
                finalAmt: round2(toFiniteNumber(row.finalAmt))
            } satisfies Record<string, unknown>;
            serialNumber += 1;
            return detailRow;
        });
    });
};
