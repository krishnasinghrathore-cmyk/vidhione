'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate } from '@/lib/reportDateValidation';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import type {
    CreateSaleInvoiceInput,
    SaleInvoiceListItem,
    SaleInvoiceLineInput,
    SaleInvoiceAdditionalTaxationInput,
    SaleInvoiceTaxLineInput,
    SaleInvoiceTypeDetailInput,
    SaleInvoiceCreditNoteInput,
    SaleInvoiceDebitNoteInput
} from '@/lib/invoicing/api';
import * as invoicingApi from '@/lib/invoicing/api';
import { formatAmount, formatVoucherDate, makeKey, toDateText } from '../helpers';
import { useLedgerLookup } from '../useLedgerLookup';

type ProductSalesTax = {
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    mrp: number | null;
    sellingRate: number | null;
    beforeVatRate: number | null;
    beforeVatRate2: number | null;
    effectiveDateText: string | null;
    isActiveFlag: number | null;
};

type Product = {
    productId: number;
    name: string | null;
    code: string | null;
    productAttributeTypeId: number | null;
    salesTaxes: ProductSalesTax[] | null;
};

type LineDraft = {
    key: string;
    itemId: number | null;
    itemName: string;
    quantity: number | null;
    freeQuantity: number | null;
    unitPrice: number | null;
    sellingRate: number | null;
    displayAmount: number | null;
    productDiscountRate: number | null;
    cashDiscountRate: number | null;
    qpsRate: number | null;
    replacementAmount: number | null;
    taxLedgerId: number | null;
    taxLedger2Id: number | null;
    taxLedger3Id: number | null;
    mrp: number | null;
};

type ProductAttributeOption = {
    productAttributeId: number;
    detail: string | null;
};

type TypeDetailDraft = {
    key: string;
    itemId: number | null;
    typeDetailId: number | null;
    quantity: number | null;
    tmpTypeId: number | null;
};

type CreditNoteDraft = {
    key: string;
    voucherId: number | null;
    saleReturnId: number | null;
};

type DebitNoteDraft = {
    key: string;
    voucherId: number | null;
};

type AdditionalTaxDraft = {
    key: string;
    ledgerId: number | null;
    addAmount: number | null;
    taxableAmount: number | null;
};

const PRODUCTS_QUERY = gql`
    query GstProducts($search: String, $limit: Int) {
        products(search: $search, limit: $limit, isActiveFlag: 1) {
            productId
            name
            code
            productAttributeTypeId
            salesTaxes {
                ledgerTaxId
                ledgerTax2Id
                ledgerTax3Id
                mrp
                sellingRate
                beforeVatRate
                beforeVatRate2
                effectiveDateText
                isActiveFlag
            }
        }
    }
`;

const PRODUCT_ATTRIBUTE_TYPE_BY_ID = gql`
    query ProductAttributeTypeById($productAttributeTypeId: Int!) {
        productAttributeTypeById(productAttributeTypeId: $productAttributeTypeId) {
            productAttributeTypeId
            productAttributes {
                productAttributeId
                detail
            }
        }
    }
`;

const toNumber = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const parseDateKey = (value?: string | null) => {
    if (!value) return 0;
    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) return Number(trimmed);
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return Number(trimmed.replace(/-/g, ''));
    const slash = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slash) {
        const [, dd, mm, yyyy] = slash;
        return Number(`${yyyy}${mm}${dd}`);
    }
    return 0;
};

const pickSalesTax = (product: Product | null) => {
    if (!product || !product.salesTaxes || product.salesTaxes.length === 0) return null;
    const active = product.salesTaxes.filter((tax) => (tax.isActiveFlag ?? 1) === 1);
    const candidates = active.length ? active : product.salesTaxes;
    return [...candidates].sort((a, b) => parseDateKey(a.effectiveDateText) - parseDateKey(b.effectiveDateText)).pop() ?? null;
};

export default function GstSalesInvoicesPage() {
    const { companyContext } = useAuth();
    const ledgerLookup = useLedgerLookup();
    const { ledgerById, ledgerOptions, loading: ledgerLoading, error: ledgerError } = ledgerLookup;

    const { data: productsData, loading: productsLoading, error: productsError } = useQuery(PRODUCTS_QUERY, {
        client: inventoryApolloClient,
        variables: { search: null, limit: 500 }
    });
    const [loadProductAttributeOptions, { loading: attributeOptionsLoading, error: attributeOptionsError }] = useLazyQuery(
        PRODUCT_ATTRIBUTE_TYPE_BY_ID,
        {
            client: inventoryApolloClient
        }
    );

    const products = useMemo(() => {
        const items = (productsData as { products?: Product[] } | undefined)?.products ?? [];
        return Array.isArray(items) ? items : [];
    }, [productsData]);

    const productById = useMemo(() => {
        const map = new Map<number, Product>();
        products.forEach((product) => {
            if (product && typeof product.productId === 'number') {
                map.set(product.productId, product);
            }
        });
        return map;
    }, [products]);

    const productOptions = useMemo(() => {
        return products.map((product) => ({
            label: `${product.name || `Item ${product.productId}`}${product.code ? ` • ${product.code}` : ''}`,
            value: product.productId
        }));
    }, [products]);

    const taxLedgerOptions = useMemo(() => {
        return ledgerOptions.filter((option) => {
            const ledger = ledgerById.get(option.value);
            const rate = ledger?.taxRate ? Number(ledger.taxRate) : 0;
            return Number.isFinite(rate) && rate > 0;
        });
    }, [ledgerOptions, ledgerById]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saleInvoices, setSaleInvoices] = useState<SaleInvoiceListItem[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [voucherNumberPrefix, setVoucherNumberPrefix] = useState('');
    const [voucherNumber, setVoucherNumber] = useState('');
    const [partyLedgerId, setPartyLedgerId] = useState<number | null>(null);
    const [partyName, setPartyName] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [bizomInvoiceNumber, setBizomInvoiceNumber] = useState('');
    const [isVatIncluded, setIsVatIncluded] = useState(false);
    const [isOtherState, setIsOtherState] = useState(false);
    const [hasScheme, setHasScheme] = useState(false);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const [lines, setLines] = useState<LineDraft[]>([]);
    const [additionalTaxes, setAdditionalTaxes] = useState<AdditionalTaxDraft[]>([]);
    const [typeDetails, setTypeDetails] = useState<TypeDetailDraft[]>([]);
    const [creditNotes, setCreditNotes] = useState<CreditNoteDraft[]>([]);
    const [debitNotes, setDebitNotes] = useState<DebitNoteDraft[]>([]);
    const [attributeOptionsByType, setAttributeOptionsByType] = useState<Record<number, ProductAttributeOption[]>>({});

    const selectedLedger = partyLedgerId ? ledgerById.get(partyLedgerId) ?? null : null;

    const loadSaleInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await invoicingApi.listSaleInvoices();
            setSaleInvoices(res.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, []);

    const openCreate = () => {
        setVoucherDate(new Date());
        setVoucherNumberPrefix('');
        setVoucherNumber('');
        setPartyLedgerId(null);
        setPartyName('');
        setBillNumber('');
        setRemarks('');
        setBizomInvoiceNumber('');
        setIsVatIncluded(false);
        setIsOtherState(false);
        setHasScheme(false);
        const initialLine: LineDraft = {
            key: makeKey(),
            itemId: null,
            itemName: '',
            quantity: 1,
            freeQuantity: 0,
            unitPrice: null,
            sellingRate: null,
            displayAmount: 0,
            productDiscountRate: 0,
            cashDiscountRate: 0,
            qpsRate: 0,
            replacementAmount: 0,
            taxLedgerId: null,
            taxLedger2Id: null,
            taxLedger3Id: null,
            mrp: null
        };
        setLines([initialLine]);
        setAdditionalTaxes([]);
        setTypeDetails([]);
        setCreditNotes([]);
        setDebitNotes([]);
        setCreateOpen(true);
    };

    const addLine = () => {
        setLines((prev) => [
            ...prev,
            {
                key: makeKey(),
                itemId: null,
                itemName: '',
                quantity: 1,
                freeQuantity: 0,
                unitPrice: null,
                sellingRate: null,
                displayAmount: 0,
                productDiscountRate: 0,
                cashDiscountRate: 0,
                qpsRate: 0,
                replacementAmount: 0,
                taxLedgerId: null,
                taxLedger2Id: null,
                taxLedger3Id: null,
                mrp: null
            }
        ]);
    };

    const removeLine = (key: string) => {
        setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)));
    };

    const updateLine = (key: string, patch: Partial<LineDraft>) => {
        setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    };

    const addAdditionalTax = () => {
        setAdditionalTaxes((prev) => [
            ...prev,
            { key: makeKey(), ledgerId: null, addAmount: 0, taxableAmount: 0 }
        ]);
    };

    const updateAdditionalTax = (key: string, patch: Partial<AdditionalTaxDraft>) => {
        setAdditionalTaxes((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    };

    const removeAdditionalTax = (key: string) => {
        setAdditionalTaxes((prev) => prev.filter((line) => line.key !== key));
    };

    const addTypeDetail = () => {
        setTypeDetails((prev) => [
            ...prev,
            { key: makeKey(), itemId: null, typeDetailId: null, quantity: 1, tmpTypeId: null }
        ]);
    };

    const updateTypeDetail = (key: string, patch: Partial<TypeDetailDraft>) => {
        setTypeDetails((prev) => prev.map((detail) => (detail.key === key ? { ...detail, ...patch } : detail)));
    };

    const removeTypeDetail = (key: string) => {
        setTypeDetails((prev) => prev.filter((detail) => detail.key !== key));
    };

    const addCreditNote = () => {
        setCreditNotes((prev) => [...prev, { key: makeKey(), voucherId: null, saleReturnId: null }]);
    };

    const updateCreditNote = (key: string, patch: Partial<CreditNoteDraft>) => {
        setCreditNotes((prev) => prev.map((note) => (note.key === key ? { ...note, ...patch } : note)));
    };

    const removeCreditNote = (key: string) => {
        setCreditNotes((prev) => prev.filter((note) => note.key !== key));
    };

    const addDebitNote = () => {
        setDebitNotes((prev) => [...prev, { key: makeKey(), voucherId: null }]);
    };

    const updateDebitNote = (key: string, patch: Partial<DebitNoteDraft>) => {
        setDebitNotes((prev) => prev.map((note) => (note.key === key ? { ...note, ...patch } : note)));
    };

    const removeDebitNote = (key: string) => {
        setDebitNotes((prev) => prev.filter((note) => note.key !== key));
    };

    const ensureAttributeOptions = useCallback(
        async (productAttributeTypeId: number | null) => {
            if (!productAttributeTypeId) return;
            if (attributeOptionsByType[productAttributeTypeId]) return;
            try {
                const response = await loadProductAttributeOptions({ variables: { productAttributeTypeId } });
                const options = response.data?.productAttributeTypeById?.productAttributes ?? [];
                setAttributeOptionsByType((prev) => ({ ...prev, [productAttributeTypeId]: options }));
            } catch (err) {
                console.warn('Failed to load product attribute options', err);
            }
        },
        [attributeOptionsByType, loadProductAttributeOptions]
    );

    const getTaxRate = useCallback(
        (ledgerId: number | null) => {
            if (!ledgerId) return 0;
            const ledger = ledgerById.get(ledgerId);
            const rate = ledger?.taxRate ? Number(ledger.taxRate) : 0;
            return Number.isFinite(rate) ? rate : 0;
        },
        [ledgerById]
    );

    const computed = useMemo(() => {
        const computedLines = lines.map((line) => {
            const qty = toNumber(line.quantity);
            const rate = toNumber(line.unitPrice);
            const qtyRate = qty * rate;
            const productDiscRate = toNumber(line.productDiscountRate);
            const productDiscAmount = round2(qtyRate * (productDiscRate / 100));
            const qpsRate = toNumber(line.qpsRate);
            const qpsAmount = round2(qtyRate * (qpsRate / 100));
            const displayAmount = toNumber(line.displayAmount);
            const replacementAmount = toNumber(line.replacementAmount);
            const cashDiscRate = toNumber(line.cashDiscountRate);
            const cashBase = qtyRate - productDiscAmount - displayAmount - replacementAmount - qpsAmount;
            const cashDiscAmount = round2(cashBase * (cashDiscRate / 100));
            const lineAmount = round2(qtyRate - productDiscAmount - displayAmount - qpsAmount);
            const finalAmount = round2(lineAmount - replacementAmount - cashDiscAmount);

            const taxRate = getTaxRate(line.taxLedgerId);
            const taxRate2 = getTaxRate(line.taxLedger2Id);
            const taxRate3 = getTaxRate(line.taxLedger3Id);

            let taxAmount = 0;
            let taxableAmount = 0;
            let taxAmount2 = 0;
            let taxableAmount2 = 0;
            let taxAmount3 = 0;
            let taxableAmount3 = 0;

            if (!isVatIncluded) {
                if (!isOtherState) {
                    taxableAmount = finalAmount;
                    taxAmount = round2(taxableAmount * (taxRate / 100));
                    taxableAmount2 = finalAmount;
                    taxAmount2 = round2(taxableAmount2 * (taxRate2 / 100));
                } else {
                    taxableAmount3 = finalAmount;
                    taxAmount3 = round2(taxableAmount3 * (taxRate3 / 100));
                }
            } else if (!isOtherState) {
                const totalRate = taxRate + taxRate2;
                taxableAmount = totalRate > 0 ? round2((finalAmount * 100) / (100 + totalRate)) : finalAmount;
                taxAmount = round2(taxableAmount * (taxRate / 100));
                taxableAmount2 = taxableAmount;
                taxAmount2 = round2(taxableAmount2 * (taxRate2 / 100));
            } else {
                taxableAmount3 = taxRate3 > 0 ? round2((finalAmount * 100) / (100 + taxRate3)) : finalAmount;
                taxAmount3 = round2(taxableAmount3 * (taxRate3 / 100));
            }

            return {
                ...line,
                qty,
                rate,
                qtyRate,
                productDiscAmount,
                qpsAmount,
                cashDiscAmount,
                lineAmount,
                finalAmount,
                taxRate,
                taxRate2,
                taxRate3,
                taxAmount,
                taxAmount2,
                taxAmount3,
                taxableAmount,
                taxableAmount2,
                taxableAmount3
            };
        });

        const totals = computedLines.reduce(
            (acc, line) => {
                acc.totalQuantity += line.qty;
                acc.totalFreeQuantity += toNumber(line.freeQuantity);
                acc.totalQuantityRateAmount += line.qtyRate;
                acc.totalAmount += line.lineAmount;
                acc.totalFinalAmount += line.finalAmount;
                acc.totalProductDiscountAmount += line.productDiscAmount;
                acc.totalDisplayAmount += toNumber(line.displayAmount);
                acc.totalCashDiscountAmount += line.cashDiscAmount;
                acc.totalReplacementAmount += toNumber(line.replacementAmount);
                acc.totalQpsDiscountAmount += line.qpsAmount;
                acc.totalTaxAmount += line.taxAmount + line.taxAmount2 + line.taxAmount3;
                acc.totalTaxableAmount += line.taxableAmount;
                acc.totalTaxableAmount3 += line.taxableAmount3;
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
                totalTaxAmount: 0,
                totalTaxableAmount: 0,
                totalTaxableAmount3: 0
            }
        );

        const taxSummary = new Map<number, { ledgerId: number; taxableAmount: number; addAmount: number }>();
        computedLines.forEach((line) => {
            if (line.taxLedgerId && line.taxAmount > 0) {
                const existing = taxSummary.get(line.taxLedgerId) ?? { ledgerId: line.taxLedgerId, taxableAmount: 0, addAmount: 0 };
                existing.taxableAmount += line.taxableAmount;
                existing.addAmount += line.taxAmount;
                taxSummary.set(line.taxLedgerId, existing);
            }
            if (line.taxLedger2Id && line.taxAmount2 > 0) {
                const existing = taxSummary.get(line.taxLedger2Id) ?? { ledgerId: line.taxLedger2Id, taxableAmount: 0, addAmount: 0 };
                existing.taxableAmount += line.taxableAmount2;
                existing.addAmount += line.taxAmount2;
                taxSummary.set(line.taxLedger2Id, existing);
            }
            if (line.taxLedger3Id && line.taxAmount3 > 0) {
                const existing = taxSummary.get(line.taxLedger3Id) ?? { ledgerId: line.taxLedger3Id, taxableAmount: 0, addAmount: 0 };
                existing.taxableAmount += line.taxableAmount3;
                existing.addAmount += line.taxAmount3;
                taxSummary.set(line.taxLedger3Id, existing);
            }
        });

        const totalAdditionalTaxAmount = additionalTaxes.reduce((sum, line) => sum + toNumber(line.addAmount), 0);
        const totalGrossAmount = isOtherState ? totals.totalTaxableAmount3 : totals.totalTaxableAmount;
        const totalLessSpecialAmount = isVatIncluded ? totals.totalTaxAmount : 0;
        const totalNetBase = totalGrossAmount + totals.totalTaxAmount + totalAdditionalTaxAmount;
        const roundOffAmount = round2(Math.round(totalNetBase) - totalNetBase);
        const totalNetAmount = round2(totalNetBase + roundOffAmount);

        return {
            lines: computedLines,
            totals: {
                ...totals,
                totalGrossAmount,
                totalLessSpecialAmount,
                totalAdditionalTaxAmount,
                roundOffAmount,
                totalNetAmount
            },
            taxLines: Array.from(taxSummary.values())
        };
    }, [lines, additionalTaxes, isVatIncluded, isOtherState, getTaxRate]);

    const canCreate =
        !!voucherDate &&
        (!!partyName.trim() || partyLedgerId != null) &&
        computed.lines.length > 0 &&
        computed.lines.every((line) => line.qty > 0 && line.rate > 0 && (!!line.itemId || !!line.itemName.trim()));

    const createInvoice = async () => {
        const dateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!dateValidation.ok) {
            const message = dateValidation.errors.date ?? 'Voucher date is required';
            setVoucherDateError(message);
            return;
        }
        setVoucherDateError(null);
        if (!voucherDate || !canCreate) return;
        setLoading(true);
        setError(null);
        try {
            const voucherDateText = toDateText(voucherDate);
            const inputLines: SaleInvoiceLineInput[] = computed.lines.map((line, idx) => ({
                lineNumber: idx + 1,
                itemId: line.itemId,
                mrp: line.mrp,
                quantity: line.qty,
                freeQuantity: line.freeQuantity,
                unitPrice: line.rate,
                sellingRate: line.sellingRate,
                quantityRateAmount: line.qtyRate,
                displayAmount: line.displayAmount,
                productDiscountRate: line.productDiscountRate,
                productDiscountAmount: line.productDiscAmount,
                cashDiscountRate: line.cashDiscountRate,
                cashDiscountAmount: line.cashDiscAmount,
                qpsRate: line.qpsRate,
                qpsAmount: line.qpsAmount,
                lineAmount: line.lineAmount,
                replacementAmount: line.replacementAmount,
                finalAmount: line.finalAmount,
                taxLedgerId: line.taxLedgerId,
                taxRate: line.taxRate,
                taxAmount: line.taxAmount,
                taxableAmount: line.taxableAmount,
                taxLedger2Id: line.taxLedger2Id,
                taxRate2: line.taxRate2,
                taxAmount2: line.taxAmount2,
                taxableAmount2: line.taxableAmount2,
                taxLedger3Id: line.taxLedger3Id,
                taxRate3: line.taxRate3,
                taxAmount3: line.taxAmount3,
                taxableAmount3: line.taxableAmount3,
                remarks: line.itemName || null
            }));

            const taxLines: SaleInvoiceTaxLineInput[] = computed.taxLines.map((line) => ({
                ledgerId: line.ledgerId,
                addAmount: round2(line.addAmount),
                lessAmount: 0,
                taxableAmount: round2(line.taxableAmount)
            }));

            const additionalTaxations: SaleInvoiceAdditionalTaxationInput[] = additionalTaxes
                .filter((line) => line.ledgerId != null)
                .map((line) => ({
                    ledgerId: line.ledgerId,
                    addAmount: toNumber(line.addAmount),
                    taxableAmount: toNumber(line.taxableAmount)
                }));

            const typeDetailsPayload: SaleInvoiceTypeDetailInput[] = typeDetails
                .filter((detail) => detail.itemId != null && detail.typeDetailId != null)
                .map((detail) => ({
                    itemId: detail.itemId,
                    typeDetailId: detail.typeDetailId,
                    quantity: toNumber(detail.quantity),
                    tmpTypeId: detail.tmpTypeId ?? null
                }));

            const creditNotesPayload: SaleInvoiceCreditNoteInput[] = creditNotes
                .filter((note) => note.voucherId != null || note.saleReturnId != null)
                .map((note) => ({
                    voucherId: note.voucherId ?? null,
                    saleReturnId: note.saleReturnId ?? null
                }));

            const debitNotesPayload: SaleInvoiceDebitNoteInput[] = debitNotes
                .filter((note) => note.voucherId != null)
                .map((note) => ({
                    voucherId: note.voucherId ?? null
                }));

            const payload: CreateSaleInvoiceInput = {
                voucherDateText,
                voucherNumber: voucherNumber.trim() ? voucherNumber.trim() : null,
                voucherNumberPrefix: voucherNumberPrefix.trim() ? voucherNumberPrefix.trim() : null,
                ledgerId: partyLedgerId,
                ledgerName: partyName.trim() ? partyName.trim() : null,
                ledgerGroupId: selectedLedger?.ledgerGroupId ?? null,
                billNumber: billNumber.trim() ? billNumber.trim() : null,
                remarks: remarks.trim() ? remarks.trim() : null,
                isVatIncluded,
                isOtherState,
                hasScheme,
                totalProductDiscountAmount: round2(computed.totals.totalProductDiscountAmount),
                totalDisplayAmount: round2(computed.totals.totalDisplayAmount),
                totalCashDiscountAmount: round2(computed.totals.totalCashDiscountAmount),
                totalReplacementAmount: round2(computed.totals.totalReplacementAmount),
                totalGrossAmount: round2(computed.totals.totalGrossAmount),
                totalTaxAmount: round2(computed.totals.totalTaxAmount),
                totalNetAmount: round2(computed.totals.totalNetAmount),
                totalLessSpecialAmount: round2(computed.totals.totalLessSpecialAmount),
                totalQpsDiscountAmount: round2(computed.totals.totalQpsDiscountAmount),
                totalQuantity: round2(computed.totals.totalQuantity),
                totalFreeQuantity: round2(computed.totals.totalFreeQuantity),
                totalQuantityRateAmount: round2(computed.totals.totalQuantityRateAmount),
                totalAmount: round2(computed.totals.totalAmount),
                totalFinalAmount: round2(computed.totals.totalFinalAmount),
                roundOffAmount: round2(computed.totals.roundOffAmount),
                totalAdditionalTaxAmount: round2(computed.totals.totalAdditionalTaxAmount),
                bizomInvoiceNumber: bizomInvoiceNumber.trim() ? bizomInvoiceNumber.trim() : null,
                lines: inputLines,
                taxLines,
                additionalTaxations,
                typeDetails: typeDetailsPayload,
                creditNotes: creditNotesPayload,
                debitNotes: debitNotesPayload
            };

            await invoicingApi.createSaleInvoice(payload);
            setCreateOpen(false);
            await loadSaleInvoices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2">
                <div>
                    <h2 className="mb-2">GST Sales Invoices</h2>
                    <p className="text-600 m-0">GST sales invoice entry with legacy parity fields.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-content-end">
                    <Button icon="pi pi-refresh" label="Refresh" outlined onClick={loadSaleInvoices} disabled={loading} />
                    <Button icon="pi pi-plus" label="New GST Invoice" onClick={openCreate} disabled={loading} />
                </div>
            </div>

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}
            {productsError && <Message severity="warn" text="Product lookup failed." className="w-full mt-3" />}
            {ledgerError && <Message severity="warn" text="Ledger lookup failed." className="w-full mt-3" />}
            {attributeOptionsError && <Message severity="warn" text="Type detail lookup failed." className="w-full mt-3" />}

            <DataTable value={saleInvoices} loading={loading} paginator rows={10} className="mt-3" dataKey="saleInvoiceId" responsiveLayout="scroll">
                <Column field="saleInvoiceId" header="ID" sortable style={{ width: '6rem' }} />
                <Column field="voucherNumber" header="Voucher No" sortable body={(row: SaleInvoiceListItem) => row.voucherNumber || '-'} />
                <Column field="voucherDateText" header="Date" sortable body={(row: SaleInvoiceListItem) => formatVoucherDate(row.voucherDateText)} />
                <Column field="ledgerName" header="Party" sortable body={(row: SaleInvoiceListItem) => row.ledgerName || '-'} />
                <Column field="totalNetAmount" header="Total" sortable body={(row: SaleInvoiceListItem) => formatAmount(Number(row.totalNetAmount || 0))} />
            </DataTable>

            <Dialog
                header="New GST Sales Invoice"
                visible={createOpen}
                style={{ width: '70rem' }}
                modal
                onHide={() => setCreateOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={() => setCreateOpen(false)} />
                        <Button label="Create" icon="pi pi-check" disabled={!canCreate || loading} onClick={createInvoice} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-3">
                        <div className="flex flex-column gap-2">
                            <small className="text-500">Voucher Date</small>
                            <AppDateInput
                                value={voucherDate}
                                onChange={(value) => {
                                    setVoucherDate(value);
                                    setVoucherDateError(null);
                                }}
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                            />
                            {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                        </div>
                    </div>
                    <div className="col-12 md:col-3">
                        <span className="p-float-label">
                            <InputText id="voucher-prefix" value={voucherNumberPrefix} onChange={(e) => setVoucherNumberPrefix(e.target.value)} />
                            <label htmlFor="voucher-prefix">Prefix</label>
                        </span>
                    </div>
                    <div className="col-12 md:col-3">
                        <span className="p-float-label">
                            <InputText id="voucher-number" value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} />
                            <label htmlFor="voucher-number">Voucher Number</label>
                        </span>
                    </div>
                    <div className="col-12 md:col-3">
                        <span className="p-float-label">
                            <InputText id="bill-number" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
                            <label htmlFor="bill-number">Bill Number</label>
                        </span>
                    </div>

                    <div className="col-12 md:col-4">
                        <div className="flex flex-column gap-2">
                            <small className="text-500">Party Ledger</small>
                            <AppDropdown
                                value={partyLedgerId}
                                options={ledgerOptions}
                                onChange={(e) => {
                                    const nextId = (e.value as number) ?? null;
                                    setPartyLedgerId(nextId);
                                    const ledger = nextId ? ledgerById.get(nextId) ?? null : null;
                                    if (ledger?.name) setPartyName(ledger.name || '');
                                    if (!nextId) setPartyName('');
                                }}
                                placeholder={ledgerLoading ? 'Loading ledgers…' : 'Select party ledger'}
                                filter
                                showClear
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="col-12 md:col-4">
                        <span className="p-float-label">
                            <InputText id="party-name" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
                            <label htmlFor="party-name">Party Name</label>
                        </span>
                    </div>
                    <div className="col-12 md:col-4">
                        <span className="p-float-label">
                            <InputText id="gstin" value={selectedLedger?.gstNumber || ''} disabled />
                            <label htmlFor="gstin">GSTIN</label>
                        </span>
                    </div>

                    <div className="col-12 md:col-3">
                        <div className="flex align-items-center gap-2">
                            <InputSwitch checked={isVatIncluded} onChange={(e) => setIsVatIncluded(!!e.value)} />
                            <span className="text-500">VAT Included</span>
                        </div>
                    </div>
                    <div className="col-12 md:col-3">
                        <div className="flex align-items-center gap-2">
                            <InputSwitch checked={isOtherState} onChange={(e) => setIsOtherState(!!e.value)} />
                            <span className="text-500">Other State</span>
                        </div>
                    </div>
                    <div className="col-12 md:col-3">
                        <div className="flex align-items-center gap-2">
                            <InputSwitch checked={hasScheme} onChange={(e) => setHasScheme(!!e.value)} />
                            <span className="text-500">Scheme</span>
                        </div>
                    </div>
                    <div className="col-12 md:col-3">
                        <span className="p-float-label">
                            <InputText id="bizom-invoice" value={bizomInvoiceNumber} onChange={(e) => setBizomInvoiceNumber(e.target.value)} />
                            <label htmlFor="bizom-invoice">Bizom Invoice No</label>
                        </span>
                    </div>
                    <div className="col-12">
                        <span className="p-float-label">
                            <InputText id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                            <label htmlFor="remarks">Remarks</label>
                        </span>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="flex align-items-center justify-content-between">
                        <h4 className="m-0">Line Items</h4>
                        <Button icon="pi pi-plus" label="Add Line" outlined onClick={addLine} />
                    </div>
                    <DataTable value={computed.lines} dataKey="key" className="mt-3" responsiveLayout="scroll" loading={productsLoading}>
                        <Column header="#" body={(_row: any, opts: any) => <span className="text-500">{(opts.rowIndex ?? 0) + 1}</span>} style={{ width: '3rem' }} />
                        <Column
                            header="Item"
                            body={(row: LineDraft) => (
                                <AppDropdown
                                    value={row.itemId}
                                    options={productOptions}
                                    onChange={(e) => {
                                        const nextId = (e.value as number) ?? null;
                                        const product = nextId ? productById.get(nextId) ?? null : null;
                                        const tax = pickSalesTax(product);
                                        updateLine(row.key, {
                                            itemId: nextId,
                                            itemName: product?.name || '',
                                            mrp: tax?.mrp ?? null,
                                            unitPrice: tax?.beforeVatRate ?? tax?.sellingRate ?? null,
                                            sellingRate: tax?.sellingRate ?? null,
                                            taxLedgerId: tax?.ledgerTaxId ?? null,
                                            taxLedger2Id: tax?.ledgerTax2Id ?? null,
                                            taxLedger3Id: tax?.ledgerTax3Id ?? null
                                        });
                                    }}
                                    placeholder={productsLoading ? 'Loading…' : 'Select item'}
                                    filter
                                    showClear
                                    className="w-full"
                                />
                            )}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Qty"
                            body={(row: LineDraft) => (
                                <InputNumber
                                    value={row.quantity}
                                    onValueChange={(e) => updateLine(row.key, { quantity: e.value ?? null })}
                                    min={0}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Rate"
                            body={(row: LineDraft) => (
                                <InputNumber
                                    value={row.unitPrice}
                                    onValueChange={(e) => updateLine(row.key, { unitPrice: e.value ?? null })}
                                    min={0}
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                />
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="Free"
                            body={(row: LineDraft) => (
                                <InputNumber
                                    value={row.freeQuantity}
                                    onValueChange={(e) => updateLine(row.key, { freeQuantity: e.value ?? null })}
                                    min={0}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Display"
                            body={(row: LineDraft) => (
                                <InputNumber
                                    value={row.displayAmount}
                                    onValueChange={(e) => updateLine(row.key, { displayAmount: e.value ?? null })}
                                    min={0}
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                />
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="Pro Disc %"
                            body={(row: LineDraft) => (
                                <InputNumber
                                    value={row.productDiscountRate}
                                    onValueChange={(e) => updateLine(row.key, { productDiscountRate: e.value ?? null })}
                                    min={0}
                                    max={100}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="Cash Disc %"
                            body={(row: LineDraft) => (
                                <InputNumber
                                    value={row.cashDiscountRate}
                                    onValueChange={(e) => updateLine(row.key, { cashDiscountRate: e.value ?? null })}
                                    min={0}
                                    max={100}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header="QPS %"
                            body={(row: LineDraft) => (
                                <InputNumber
                                    value={row.qpsRate}
                                    onValueChange={(e) => updateLine(row.key, { qpsRate: e.value ?? null })}
                                    min={0}
                                    max={100}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Tax Ledgers"
                            body={(row: LineDraft) => (
                                <div className="flex flex-column gap-2">
                                    <AppDropdown
                                        value={row.taxLedgerId}
                                        options={taxLedgerOptions}
                                        onChange={(e) => updateLine(row.key, { taxLedgerId: (e.value as number) ?? null })}
                                        placeholder="SGST"
                                        className="w-full"
                                        showClear
                                    />
                                    <AppDropdown
                                        value={row.taxLedger2Id}
                                        options={taxLedgerOptions}
                                        onChange={(e) => updateLine(row.key, { taxLedger2Id: (e.value as number) ?? null })}
                                        placeholder="CGST"
                                        className="w-full"
                                        showClear
                                    />
                                    <AppDropdown
                                        value={row.taxLedger3Id}
                                        options={taxLedgerOptions}
                                        onChange={(e) => updateLine(row.key, { taxLedger3Id: (e.value as number) ?? null })}
                                        placeholder="IGST"
                                        className="w-full"
                                        showClear
                                    />
                                </div>
                            )}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Amount"
                            body={(row: any) => <span>{formatAmount(row.lineAmount)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Tax"
                            body={(row: any) => <span>{formatAmount(row.taxAmount + row.taxAmount2 + row.taxAmount3)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Total"
                            body={(row: any) => <span className="font-medium">{formatAmount(row.finalAmount)}</span>}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header=""
                            body={(row: LineDraft) => (
                                <Button icon="pi pi-trash" severity="danger" text onClick={() => removeLine(row.key)} disabled={computed.lines.length <= 1} />
                            )}
                            style={{ width: '4rem' }}
                        />
                    </DataTable>
                </div>

                <div className="mt-4">
                    <div className="flex align-items-center justify-content-between">
                        <h4 className="m-0">Tax Summary</h4>
                    </div>
                    <DataTable value={computed.taxLines} dataKey="ledgerId" className="mt-2" responsiveLayout="scroll">
                        <Column
                            header="Ledger"
                            body={(row: any) => {
                                const ledger = row.ledgerId ? ledgerById.get(row.ledgerId) : null;
                                return ledger?.name || `Ledger ${row.ledgerId}`;
                            }}
                        />
                        <Column header="Taxable" body={(row: any) => formatAmount(round2(row.taxableAmount))} />
                        <Column header="Tax" body={(row: any) => formatAmount(round2(row.addAmount))} />
                    </DataTable>
                </div>

                <div className="mt-4">
                    <div className="flex align-items-center justify-content-between">
                        <h4 className="m-0">Additional Taxation</h4>
                        <Button icon="pi pi-plus" label="Add Tax" outlined onClick={addAdditionalTax} />
                    </div>
                    <DataTable value={additionalTaxes} dataKey="key" className="mt-2" responsiveLayout="scroll">
                        <Column
                            header="Ledger"
                            body={(row: AdditionalTaxDraft) => (
                                <AppDropdown
                                    value={row.ledgerId}
                                    options={taxLedgerOptions}
                                    onChange={(e) => updateAdditionalTax(row.key, { ledgerId: (e.value as number) ?? null })}
                                    placeholder="Select ledger"
                                    showClear
                                    className="w-full"
                                />
                            )}
                        />
                        <Column
                            header="Add Amount"
                            body={(row: AdditionalTaxDraft) => (
                                <InputNumber
                                    value={row.addAmount}
                                    onValueChange={(e) => updateAdditionalTax(row.key, { addAmount: e.value ?? null })}
                                    min={0}
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                />
                            )}
                            style={{ width: '10rem' }}
                        />
                        <Column
                            header="Taxable"
                            body={(row: AdditionalTaxDraft) => (
                                <InputNumber
                                    value={row.taxableAmount}
                                    onValueChange={(e) => updateAdditionalTax(row.key, { taxableAmount: e.value ?? null })}
                                    min={0}
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                />
                            )}
                            style={{ width: '10rem' }}
                        />
                        <Column
                            header=""
                            body={(row: AdditionalTaxDraft) => (
                                <Button icon="pi pi-trash" severity="danger" text onClick={() => removeAdditionalTax(row.key)} />
                            )}
                            style={{ width: '4rem' }}
                        />
                    </DataTable>
                </div>

                <div className="mt-4">
                    <div className="flex align-items-center justify-content-between">
                        <h4 className="m-0">Type Details</h4>
                        <Button icon="pi pi-plus" label="Add Type Detail" outlined onClick={addTypeDetail} />
                    </div>
                    <DataTable value={typeDetails} dataKey="key" className="mt-2" responsiveLayout="scroll">
                        <Column
                            header="Item"
                            body={(row: TypeDetailDraft) => (
                                <AppDropdown
                                    value={row.itemId}
                                    options={productOptions}
                                    onChange={(e) => {
                                        const nextId = (e.value as number) ?? null;
                                        const product = nextId ? productById.get(nextId) ?? null : null;
                                        const attributeTypeId = product?.productAttributeTypeId ?? null;
                                        if (attributeTypeId) {
                                            ensureAttributeOptions(attributeTypeId);
                                        }
                                        updateTypeDetail(row.key, { itemId: nextId, typeDetailId: null });
                                    }}
                                    placeholder={productsLoading ? 'Loading…' : 'Select item'}
                                    filter
                                    showClear
                                    className="w-full"
                                />
                            )}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Type Detail"
                            body={(row: TypeDetailDraft) => {
                                const product = row.itemId ? productById.get(row.itemId) ?? null : null;
                                const attributeTypeId = product?.productAttributeTypeId ?? null;
                                const options = attributeTypeId ? attributeOptionsByType[attributeTypeId] ?? [] : [];
                                const dropdownOptions = options.map((option) => ({
                                    label: option.detail ?? `Detail ${option.productAttributeId}`,
                                    value: option.productAttributeId
                                }));
                                const placeholder = attributeTypeId
                                    ? attributeOptionsLoading
                                        ? 'Loading…'
                                        : 'Select detail'
                                    : 'Select item first';
                                return (
                                    <AppDropdown
                                        value={row.typeDetailId}
                                        options={dropdownOptions}
                                        onChange={(e) => updateTypeDetail(row.key, { typeDetailId: (e.value as number) ?? null })}
                                        placeholder={placeholder}
                                        showClear
                                        className="w-full"
                                        disabled={!attributeTypeId}
                                    />
                                );
                            }}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Qty"
                            body={(row: TypeDetailDraft) => (
                                <InputNumber
                                    value={row.quantity}
                                    onValueChange={(e) => updateTypeDetail(row.key, { quantity: e.value ?? null })}
                                    min={0}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Tmp Type ID"
                            body={(row: TypeDetailDraft) => (
                                <InputNumber
                                    value={row.tmpTypeId}
                                    onValueChange={(e) => updateTypeDetail(row.key, { tmpTypeId: e.value ?? null })}
                                    min={0}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '9rem' }}
                        />
                        <Column
                            header=""
                            body={(row: TypeDetailDraft) => (
                                <Button icon="pi pi-trash" severity="danger" text onClick={() => removeTypeDetail(row.key)} />
                            )}
                            style={{ width: '4rem' }}
                        />
                    </DataTable>
                </div>

                <div className="mt-4">
                    <div className="flex align-items-center justify-content-between">
                        <h4 className="m-0">Credit Notes</h4>
                        <Button icon="pi pi-plus" label="Add Credit Note" outlined onClick={addCreditNote} />
                    </div>
                    <DataTable value={creditNotes} dataKey="key" className="mt-2" responsiveLayout="scroll">
                        <Column
                            header="Voucher ID"
                            body={(row: CreditNoteDraft) => (
                                <InputNumber
                                    value={row.voucherId}
                                    onValueChange={(e) => updateCreditNote(row.key, { voucherId: e.value ?? null })}
                                    min={0}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '10rem' }}
                        />
                        <Column
                            header="Sale Return ID"
                            body={(row: CreditNoteDraft) => (
                                <InputNumber
                                    value={row.saleReturnId}
                                    onValueChange={(e) => updateCreditNote(row.key, { saleReturnId: e.value ?? null })}
                                    min={0}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '12rem' }}
                        />
                        <Column
                            header=""
                            body={(row: CreditNoteDraft) => (
                                <Button icon="pi pi-trash" severity="danger" text onClick={() => removeCreditNote(row.key)} />
                            )}
                            style={{ width: '4rem' }}
                        />
                    </DataTable>
                </div>

                <div className="mt-4">
                    <div className="flex align-items-center justify-content-between">
                        <h4 className="m-0">Debit Notes</h4>
                        <Button icon="pi pi-plus" label="Add Debit Note" outlined onClick={addDebitNote} />
                    </div>
                    <DataTable value={debitNotes} dataKey="key" className="mt-2" responsiveLayout="scroll">
                        <Column
                            header="Voucher ID"
                            body={(row: DebitNoteDraft) => (
                                <InputNumber
                                    value={row.voucherId}
                                    onValueChange={(e) => updateDebitNote(row.key, { voucherId: e.value ?? null })}
                                    min={0}
                                    useGrouping={false}
                                />
                            )}
                            style={{ width: '10rem' }}
                        />
                        <Column
                            header=""
                            body={(row: DebitNoteDraft) => (
                                <Button icon="pi pi-trash" severity="danger" text onClick={() => removeDebitNote(row.key)} />
                            )}
                            style={{ width: '4rem' }}
                        />
                    </DataTable>
                </div>

                <div className="mt-4 grid">
                    <div className="col-12 md:col-4">
                        <div className="p-3 surface-card border-round border-1 surface-border">
                            <div className="flex justify-content-between text-500">
                                <span>Total Qty</span>
                                <span>{formatAmount(computed.totals.totalQuantity)}</span>
                            </div>
                            <div className="flex justify-content-between text-500 mt-2">
                                <span>Total Amount</span>
                                <span>{formatAmount(computed.totals.totalAmount)}</span>
                            </div>
                            <div className="flex justify-content-between text-500 mt-2">
                                <span>Total Tax</span>
                                <span>{formatAmount(computed.totals.totalTaxAmount)}</span>
                            </div>
                            <div className="flex justify-content-between text-500 mt-2">
                                <span>Additional Tax</span>
                                <span>{formatAmount(computed.totals.totalAdditionalTaxAmount)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 md:col-4">
                        <div className="p-3 surface-card border-round border-1 surface-border">
                            <div className="flex justify-content-between text-500">
                                <span>Gross</span>
                                <span>{formatAmount(computed.totals.totalGrossAmount)}</span>
                            </div>
                            <div className="flex justify-content-between text-500 mt-2">
                                <span>Round Off</span>
                                <span>{formatAmount(computed.totals.roundOffAmount)}</span>
                            </div>
                            <div className="flex justify-content-between font-medium mt-3">
                                <span>Net Amount</span>
                                <span>{formatAmount(computed.totals.totalNetAmount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
