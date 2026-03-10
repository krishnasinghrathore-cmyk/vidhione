import { gql } from '@apollo/client';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import * as invoicingApi from '@/lib/invoicing/api';

const PRODUCT_BY_ID = gql`
    query InvoiceLedgerProductById($productId: Int!) {
        productById(productId: $productId) {
            productId
            name
            hsnCodeId
        }
    }
`;

const UNITS = gql`
    query InvoiceLedgerUnits($limit: Int) {
        units(limit: $limit) {
            unitId
            name
        }
    }
`;

const HSN_CODES = gql`
    query InvoiceLedgerHsnCodes($limit: Int) {
        hsnCodes(limit: $limit) {
            hsnCodeId
            code
            name
        }
    }
`;

type ProductMeta = {
    productId: number;
    name: string;
    hsnCodeId: number | null;
};

export type InvoiceLedgerHeaderRow = {
    saleInvoiceId: number | null;
    voucherNumber?: string | null;
    voucherDateText?: string | null;
    ledgerName?: string | null;
    ledgerAddress?: string | null;
    ledgerGstin?: string | null;
};

const toPositiveId = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const rounded = Math.trunc(parsed);
    return rounded > 0 ? rounded : null;
};

const toFiniteNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const runWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<R>
): Promise<R[]> => {
    const normalizedLimit = Math.max(1, Math.trunc(limit));
    const results: R[] = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(normalizedLimit, items.length) }, async () => {
        while (true) {
            const index = cursor++;
            if (index >= items.length) return;
            results[index] = await worker(items[index]);
        }
    });
    await Promise.all(runners);
    return results;
};

const formatTypeQuantity = (value: number) => {
    if (Math.abs(value % 1) < 0.000001) return String(Math.trunc(value));
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const buildLineTaxLabel = (line: invoicingApi.SaleInvoiceLine) => {
    const rates = [line.taxRate, line.taxRate2, line.taxRate3]
        .map((value) => round2(toFiniteNumber(value)))
        .filter((value) => Math.abs(value) > 0.000001);
    if (!rates.length) return '';
    return rates.map((value) => `${formatTypeQuantity(value)}%`).join(' + ');
};

const buildTypeDetailsByItemTmp = (invoice: invoicingApi.SaleInvoice) => {
    const typeDetailsByItemTmp = new Map<string, string>();
    (invoice.typeDetails ?? []).forEach((typeDetail) => {
        const itemId = toPositiveId(typeDetail.itemId);
        if (itemId == null) return;
        const quantity = toFiniteNumber(typeDetail.quantity);
        if (quantity <= 0) return;
        const tmpTypeId = toPositiveId(typeDetail.tmpTypeId) ?? 0;
        const label = typeDetail.typeDetailName?.trim() || `Detail ${typeDetail.typeDetailId ?? ''}`.trim();
        if (!label) return;
        const detailText = `${label}-${formatTypeQuantity(quantity)}`;
        const key = `${itemId}|${tmpTypeId}`;
        const previous = typeDetailsByItemTmp.get(key);
        typeDetailsByItemTmp.set(key, previous ? `${previous}, ${detailText}` : detailText);
    });
    return typeDetailsByItemTmp;
};

const ONES = [
    'Zero',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen'
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertUnder1000 = (value: number): string => {
    const n = Math.trunc(Math.max(0, value));
    if (n < 20) return ONES[n];
    if (n < 100) {
        const ten = Math.trunc(n / 10);
        const one = n % 10;
        return one === 0 ? TENS[ten] : `${TENS[ten]} ${ONES[one]}`;
    }
    const hundred = Math.trunc(n / 100);
    const remainder = n % 100;
    return remainder === 0 ? `${ONES[hundred]} Hundred` : `${ONES[hundred]} Hundred ${convertUnder1000(remainder)}`;
};

const convertIndianInteger = (value: number): string => {
    const n = Math.trunc(Math.max(0, value));
    if (n === 0) return 'Zero';
    const crore = Math.trunc(n / 10000000);
    const lakh = Math.trunc((n % 10000000) / 100000);
    const thousand = Math.trunc((n % 100000) / 1000);
    const hundred = n % 1000;
    const parts: string[] = [];
    if (crore > 0) parts.push(`${convertUnder1000(crore)} Crore`);
    if (lakh > 0) parts.push(`${convertUnder1000(lakh)} Lakh`);
    if (thousand > 0) parts.push(`${convertUnder1000(thousand)} Thousand`);
    if (hundred > 0) parts.push(convertUnder1000(hundred));
    return parts.join(' ');
};

const toAmountInWords = (amount: number) => {
    const safeAmount = Math.max(0, round2(toFiniteNumber(amount)));
    const rupees = Math.trunc(safeAmount);
    const paise = Math.round((safeAmount - rupees) * 100);
    const rupeesText = `${convertIndianInteger(rupees)} Rupees`;
    if (paise <= 0) return `${rupeesText} Only`;
    return `${rupeesText} and ${convertUnder1000(paise)} Paise Only`;
};

const buildTaxBreakupText = (invoice: invoicingApi.SaleInvoice) => {
    const rows = (invoice.taxLines ?? []).filter((entry) => {
        const addAmount = toFiniteNumber(entry.addAmount);
        const lessAmount = toFiniteNumber(entry.lessAmount);
        const taxableAmount = toFiniteNumber(entry.taxableAmount);
        return Math.abs(addAmount) > 0.000001 || Math.abs(lessAmount) > 0.000001 || Math.abs(taxableAmount) > 0.000001;
    });
    if (!rows.length) {
        return {
            taxs: '',
            addAmts: '',
            taxableAmts: ''
        };
    }
    return {
        taxs: rows
            .map((entry, index) => {
                const ledgerId = toPositiveId(entry.ledgerId);
                if (ledgerId != null) return `Tax #${ledgerId}`;
                return `Tax ${index + 1}`;
            })
            .join('\n'),
        addAmts: rows.map((entry) => round2(toFiniteNumber(entry.addAmount) - toFiniteNumber(entry.lessAmount))).join('\n'),
        taxableAmts: rows.map((entry) => round2(toFiniteNumber(entry.taxableAmount))).join('\n')
    };
};

export const buildInvoiceLedgerRowsFromSaleInvoices = async (
    saleInvoices: InvoiceLedgerHeaderRow[]
): Promise<Array<Record<string, unknown>>> => {
    const invoiceHeaders = Array.from(
        new Map(
            saleInvoices
                .map((row) => [toPositiveId(row.saleInvoiceId), row] as const)
                .filter((entry): entry is [number, invoicingApi.SaleInvoiceListItem] => entry[0] != null)
        ).values()
    );
    if (!invoiceHeaders.length) return [];

    const detailedInvoices = await runWithConcurrency(invoiceHeaders, 5, async (row) => {
        const saleInvoiceId = Number(row.saleInvoiceId);
        try {
            const result = await invoicingApi.getSaleInvoice(saleInvoiceId);
            return { row, invoice: result.invoice };
        } catch {
            return null;
        }
    });

    const usableInvoices = detailedInvoices.filter(
        (
            entry
        ): entry is {
            row: invoicingApi.SaleInvoiceListItem;
            invoice: invoicingApi.SaleInvoice;
        } => Boolean(entry && entry.invoice && Array.isArray(entry.invoice.lines))
    );
    if (!usableInvoices.length) return [];

    const productIds = Array.from(
        new Set(
            usableInvoices
                .flatMap((entry) => entry.invoice.lines ?? [])
                .flatMap((line) => [toPositiveId(line.itemId), toPositiveId(line.itemFreeId)])
                .filter((value): value is number => value != null)
        )
    );

    const productById = new Map<number, ProductMeta>();
    await runWithConcurrency(productIds, 12, async (productId) => {
        try {
            const result = await inventoryApolloClient.query<{
                productById?: { productId?: number | null; name?: string | null; hsnCodeId?: number | null } | null;
            }>({
                query: PRODUCT_BY_ID,
                fetchPolicy: 'cache-first',
                variables: { productId }
            });
            const detail = result.data?.productById;
            const id = toPositiveId(detail?.productId);
            const name = detail?.name?.trim() || '';
            if (id != null && name) {
                productById.set(id, {
                    productId: id,
                    name,
                    hsnCodeId: toPositiveId(detail?.hsnCodeId)
                });
            }
        } catch {
            // Ignore lookup failures and keep fallback labels.
        }
    });

    const unitById = new Map<number, string>();
    try {
        const unitsResult = await inventoryApolloClient.query<{
            units?: Array<{ unitId?: number | null; name?: string | null }> | null;
        }>({
            query: UNITS,
            fetchPolicy: 'cache-first',
            variables: { limit: 4000 }
        });
        (unitsResult.data?.units ?? []).forEach((unit) => {
            const id = toPositiveId(unit.unitId);
            const name = unit.name?.trim() || '';
            if (id != null && name) {
                unitById.set(id, name);
            }
        });
    } catch {
        // Unit names are optional for print.
    }

    const hsnCodeById = new Map<number, string>();
    try {
        const hsnCodesResult = await inventoryApolloClient.query<{
            hsnCodes?: Array<{ hsnCodeId?: number | null; code?: string | null; name?: string | null }> | null;
        }>({
            query: HSN_CODES,
            fetchPolicy: 'cache-first',
            variables: { limit: 4000 }
        });
        (hsnCodesResult.data?.hsnCodes ?? []).forEach((hsnCode) => {
            const id = toPositiveId(hsnCode.hsnCodeId);
            const code = hsnCode.code?.trim() || hsnCode.name?.trim() || '';
            if (id != null && code) {
                hsnCodeById.set(id, code);
            }
        });
    } catch {
        // HSN is optional for report print.
    }

    return usableInvoices.map(({ row, invoice }) => {
        const typeDetailsByItemTmp = buildTypeDetailsByItemTmp(invoice);
        const lines = (invoice.lines ?? []).map((line, index) => {
            const itemId = toPositiveId(line.itemId);
            const freeItemId = toPositiveId(line.itemFreeId);
            const tmpTypeId = toPositiveId(line.tmpTypeId) ?? 0;
            const quantity = round2(toFiniteNumber(line.quantity));
            const freeQuantity = round2(toFiniteNumber(line.freeQuantity));
            const unitPrice = round2(toFiniteNumber(line.unitPrice ?? line.sellingRate));
            const quantityRateAmount = round2(toFiniteNumber(line.quantityRateAmount) || quantity * unitPrice);
            const lineAmount = round2(toFiniteNumber(line.lineAmount) || quantityRateAmount);
            const taxRate = round2(
                toFiniteNumber(line.taxRate) + toFiniteNumber(line.taxRate2) + toFiniteNumber(line.taxRate3)
            );
            const taxAmount = round2(
                toFiniteNumber(line.taxAmount) + toFiniteNumber(line.taxAmount2) + toFiniteNumber(line.taxAmount3)
            );
            const finalAmount = round2(toFiniteNumber(line.finalAmount) || lineAmount);
            const lineNumber = toPositiveId(line.lineNumber) ?? index + 1;

            return {
                sNo: lineNumber,
                item: productById.get(itemId ?? -1)?.name ?? (itemId != null ? `Item #${itemId}` : 'Item'),
                itemF: productById.get(freeItemId ?? -1)?.name ?? (freeItemId != null ? `Item #${freeItemId}` : ''),
                remark: line.remarks?.trim() || '',
                typeDetails: itemId != null ? typeDetailsByItemTmp.get(`${itemId}|${tmpTypeId}`) ?? '' : '',
                hsnCode:
                    itemId != null
                        ? hsnCodeById.get(productById.get(itemId)?.hsnCodeId ?? -1) ?? ''
                        : '',
                taxRate,
                mrp: round2(toFiniteNumber(line.mrp)),
                qty: quantity,
                unitQ: toPositiveId(line.unitId) != null ? unitById.get(Number(line.unitId)) ?? '' : '',
                free: freeQuantity,
                unitF: toPositiveId(line.unitFreeId) != null ? unitById.get(Number(line.unitFreeId)) ?? '' : '',
                productDiscAmt: round2(toFiniteNumber(line.productDiscountAmount)),
                rate: unitPrice,
                qtyxRate: quantityRateAmount,
                lineAmount,
                taxName: buildLineTaxLabel(line),
                taxAmt: taxAmount,
                finalAmt: finalAmount
            };
        });

        const taxBreakup = buildTaxBreakupText(invoice);
        const totalAdditionalTaxAmt = round2(toFiniteNumber(invoice.totalAdditionalTaxAmount));
        const creditNoteCount = (invoice.creditNotes ?? []).length;
        const debitNoteCount = (invoice.debitNotes ?? []).length;

        return {
            saleInvoiceId: Number(invoice.saleInvoiceId),
            voucherNumber: row.voucherNumber?.trim() || invoice.voucherNumber?.trim() || '',
            voucherDateText: row.voucherDateText?.trim() || invoice.voucherDateText?.trim() || '',
            ledger: row.ledgerName?.trim() || invoice.ledgerName?.trim() || '',
            address1: row.ledgerAddress?.trim() || '',
            city: '',
            tinNo: row.ledgerGstin?.trim() || '',
            isVatIncluded: invoice.isVatIncluded === true,
            lines,
            totalQtyxRate: round2(toFiniteNumber(invoice.totalQuantityRateAmount)),
            totalProDisAmt: round2(toFiniteNumber(invoice.totalProductDiscountAmount)),
            totalDisplayAmt: round2(toFiniteNumber(invoice.totalDisplayAmount)),
            totalReplacementAmt: round2(toFiniteNumber(invoice.totalReplacementAmount)),
            totalCashDisAmt: round2(toFiniteNumber(invoice.totalCashDiscountAmount)),
            totalLessSpecialAmt: round2(toFiniteNumber(invoice.totalLessSpecialAmount)),
            totalGrossAmt: round2(toFiniteNumber(invoice.totalGrossAmount)),
            totalTaxationAmt: round2(toFiniteNumber(invoice.totalTaxAmount)),
            totalAdditionalTaxAmt,
            ledgerAdditionalTax: totalAdditionalTaxAmt > 0 ? 'Additional Tax' : '',
            totalNetAmt: round2(toFiniteNumber(invoice.totalNetAmount)),
            amountInWords: toAmountInWords(toFiniteNumber(invoice.totalNetAmount)),
            taxs: taxBreakup.taxs,
            addAmts: taxBreakup.addAmts,
            taxableAmts: taxBreakup.taxableAmts,
            creditNoteText: creditNoteCount > 0 ? `Less Credit Note: ${creditNoteCount} note(s)` : '',
            debitNoteText: debitNoteCount > 0 ? `Add Debit Note: ${debitNoteCount} note(s)` : '',
            irn: ''
        } satisfies Record<string, unknown>;
    });
};
