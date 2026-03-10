import { gql } from '@apollo/client';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import * as invoicingApi from '@/lib/invoicing/api';

const LOADING_SHEET_PRODUCT_BY_ID = gql`
    query LoadingSheetProductById($productId: Int!) {
        productById(productId: $productId) {
            productId
            name
        }
    }
`;

const toPositiveId = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const rounded = Math.trunc(parsed);
    return rounded > 0 ? rounded : null;
};

const toFiniteAmount = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

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

type LoadingSheetGroup = {
    item: string;
    typeDetails: string;
    mrp: number;
    qty: number;
    free: number;
    totalQty: number;
    netAmt: number;
    invoices: Set<string>;
};

export const buildLoadingSheetRowsFromSaleInvoiceIds = async (saleInvoiceIds: number[]): Promise<Array<Record<string, unknown>>> => {
    const invoiceIds = Array.from(
        new Set(saleInvoiceIds.map((value) => toPositiveId(value)).filter((value): value is number => value != null))
    );
    if (!invoiceIds.length) return [];

    const fetchedInvoices = await runWithConcurrency(invoiceIds, 8, async (saleInvoiceId) => {
        try {
            const result = await invoicingApi.getSaleInvoice(saleInvoiceId);
            return result?.invoice ?? null;
        } catch {
            return null;
        }
    });

    const usableInvoices = fetchedInvoices.filter(
        (invoice): invoice is invoicingApi.SaleInvoice => Boolean(invoice && Array.isArray(invoice.lines))
    );
    if (!usableInvoices.length) return [];

    const itemIds = Array.from(
        new Set(
            usableInvoices
                .flatMap((invoice) => invoice.lines ?? [])
                .map((line) => toPositiveId(line.itemId))
                .filter((value): value is number => value != null)
        )
    );

    const itemNameById = new Map<number, string>();
    await runWithConcurrency(itemIds, 12, async (itemId) => {
        try {
            const result = await inventoryApolloClient.query<{
                productById?: { productId?: number | null; name?: string | null } | null;
            }>({
                query: LOADING_SHEET_PRODUCT_BY_ID,
                fetchPolicy: 'cache-first',
                variables: { productId: itemId }
            });
            const product = result.data?.productById;
            const productId = toPositiveId(product?.productId);
            const productName = product?.name?.trim() || '';
            if (productId != null && productName) {
                itemNameById.set(productId, productName);
            }
        } catch {
            // Keep fallback item labels when lookup fails.
        }
    });

    const grouped = new Map<string, LoadingSheetGroup>();

    usableInvoices.forEach((invoice) => {
        const invoiceNo = invoice.voucherNumber?.trim() || '';
        const typeDetailsByItemTmp = new Map<string, string>();
        (invoice.typeDetails ?? []).forEach((typeDetail) => {
            const itemId = toPositiveId(typeDetail.itemId);
            if (itemId == null) return;
            const quantity = toFiniteAmount(typeDetail.quantity);
            if (quantity <= 0) return;
            const tmpTypeId = toPositiveId(typeDetail.tmpTypeId) ?? 0;
            const label = typeDetail.typeDetailName?.trim() || `Detail ${typeDetail.typeDetailId ?? ''}`.trim();
            const detailText = `${label}-${quantity}`;
            const key = `${itemId}|${tmpTypeId}`;
            const previous = typeDetailsByItemTmp.get(key);
            typeDetailsByItemTmp.set(key, previous ? `${previous}, ${detailText}` : detailText);
        });

        (invoice.lines ?? []).forEach((line) => {
            const itemId = toPositiveId(line.itemId);
            const tmpTypeId = toPositiveId(line.tmpTypeId) ?? 0;
            const mrp = toFiniteAmount(line.mrp);
            const qty = toFiniteAmount(line.quantity);
            const free = toFiniteAmount(line.freeQuantity);
            const totalQty = qty + free;
            const netAmt = toFiniteAmount(line.finalAmount ?? line.lineAmount);
            const itemName =
                (itemId != null ? itemNameById.get(itemId) : null)
                ?? (itemId != null ? `Item #${itemId}` : line.remarks?.trim() || 'Item');
            const typeDetails = itemId != null ? typeDetailsByItemTmp.get(`${itemId}|${tmpTypeId}`) ?? '' : '';
            const key = `${itemId ?? 0}|${tmpTypeId}|${mrp.toFixed(6)}`;
            const existing = grouped.get(key);
            if (!existing) {
                grouped.set(key, {
                    item: itemName,
                    typeDetails,
                    mrp,
                    qty,
                    free,
                    totalQty,
                    netAmt,
                    invoices: invoiceNo ? new Set([invoiceNo]) : new Set<string>()
                });
                return;
            }
            existing.qty += qty;
            existing.free += free;
            existing.totalQty += totalQty;
            existing.netAmt += netAmt;
            if (!existing.typeDetails && typeDetails) {
                existing.typeDetails = typeDetails;
            }
            if (invoiceNo) {
                existing.invoices.add(invoiceNo);
            }
        });
    });

    const allInvoices = Array.from(
        new Set(
            Array.from(grouped.values()).flatMap((row) =>
                Array.from(row.invoices)
                    .map((value) => value.trim())
                    .filter(Boolean)
            )
        )
    ).join(', ');

    return Array.from(grouped.values())
        .sort((left, right) => left.item.localeCompare(right.item) || left.mrp - right.mrp)
        .map((row, index) => ({
            sNo: index + 1,
            item: row.item,
            typeDetails: row.typeDetails,
            mrp: Number(row.mrp.toFixed(2)),
            qty: Number(row.qty.toFixed(2)),
            free: Number(row.free.toFixed(2)),
            totalQty: Number(row.totalQty.toFixed(2)),
            netAmt: Number(row.netAmt.toFixed(2)),
            invoices: Array.from(row.invoices).join(', '),
            allInvoices
        }));
};
