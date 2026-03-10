import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { ColumnGroup } from 'primereact/columngroup';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Row } from 'primereact/row';
import { classNames } from 'primereact/utils';
import AppAutoCompleteDropdown from '@/components/AppAutoCompleteDropdown';
import ItemAutoComplete, { type ItemOption as AppItemOption } from '@/components/ItemAutoComplete';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import { resolveIdentifierCode } from '@/lib/crm/api';
import { formatAmount } from '../../helpers';
import type { LedgerOption, LedgerSummary } from '../../useLedgerLookup';
import { DiscountSplitInput } from './DiscountSplitInput';
import type {
    ComputedInvoiceLine,
    InvoiceLineDraft,
    LineInventoryDraft,
    PlaceOfSupplyMode,
} from '../types';

type UnitOption = {
    label: string;
    value: number;
};

type MRPOption = {
    label: string;
    value: number;
};

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
    ledgerGroupId?: number | null;
    taxRate: number;
};

type PartyLedgerOption = {
    label: string;
    value: number | null;
    address: string | null;
};

type InvoiceLinesTableProps = {
    lines: ComputedInvoiceLine[];
    placeOfSupply: PlaceOfSupplyMode;
    showTaxColumns?: boolean;
    showTypeDetails?: boolean;
    productOptions: AppItemOption[];
    lineAttributesByLineKey?: Record<string, string>;
    mrpOptionsByProductId: Record<number, MRPOption[]>;
    unitOptions: UnitOption[];
    ledgerOptions: LedgerOption[];
    ledgerById: Map<number, LedgerSummary>;
    taxLedgerOptions: TaxLedgerOption[];
    showTextileJobworkFields?: boolean;
    lineErrorsByKey: Record<string, string[]>;
    onSelectProduct: (lineKey: string, productId: number | null) => void;
    onSelectMrp: (lineKey: string, mrp: number | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceLineDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    onDuplicateLine: (lineKey: string) => void;
    onAddLine: () => void;
    onOpenTypeDetailsForLine: (itemId: number | null, tmpTypeId: number | null) => void;
};

type DiscountHintField = 'qps' | 'pro' | 'cash';
type BarcodeLookupNotice = {
    tone: 'success' | 'warn' | 'error';
    text: string;
};

const focusNextFrom = (container: HTMLElement | null, source: HTMLElement | null) => {
    if (!container || !source) return;
    const focusables = Array.from(
        container.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => {
        if (element.hasAttribute('disabled')) return false;
        if (element.getAttribute('aria-disabled') === 'true') return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return element.offsetParent !== null;
    });

    const currentIndex = focusables.indexOf(source);
    if (currentIndex < 0) return;
    for (let i = currentIndex + 1; i < focusables.length; i += 1) {
        const candidate = focusables[i];
        candidate.focus();
        return;
    }
};

const isEditableInputTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tagName = element.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
    return Boolean(
        element.closest(
            '.p-inputtext, .p-inputnumber, .p-autocomplete, .p-dropdown, .p-checkbox, .p-calendar, .p-inputtextarea'
        )
    );
};

const resolveTaxRole = (label: string | null | undefined) => {
    const text = (label ?? '').toLowerCase();
    const compact = text.replace(/[^a-z]/g, '');
    if (compact.includes('sgst')) return 'sgst';
    if (compact.includes('cgst')) return 'cgst';
    if (compact.includes('igst')) return 'igst';
    return 'unknown';
};

const formatQty = (value: number | null) => {
    if (value == null) return '-';
    if (!Number.isFinite(value)) return '-';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(3).replace(/\.?0+$/, '');
};

const formatMaybeAmount = (value: number | null) => (value == null ? '-' : formatAmount(value));
const formatPercentOrBlank = (value: number) => (Math.abs(value) > FREE_QTY_EPSILON ? `${value.toFixed(2)}%` : '');
const formatAmountOrBlank = (value: number) => (Math.abs(value) > FREE_QTY_EPSILON ? formatAmount(value) : '');

const cloneLineInventory = (inventory: LineInventoryDraft): LineInventoryDraft => ({
    ...inventory,
    serials: [...inventory.serials]
});

const createLineSnapshot = (line: ComputedInvoiceLine): InvoiceLineDraft => ({
    ...(line as InvoiceLineDraft),
    inventory: cloneLineInventory(line.inventory)
});

const createRestorePatch = (snapshot: InvoiceLineDraft): Partial<InvoiceLineDraft> => ({
    ...snapshot,
    inventory: cloneLineInventory(snapshot.inventory)
});

const serializeLineForCompare = (line: InvoiceLineDraft) =>
    JSON.stringify({
        ...line,
        inventory: {
            ...line.inventory,
            serials: [...line.inventory.serials]
        }
    });

const FREE_QTY_EPSILON = 0.0001;
const MAX_DISCOUNT_RATE = 99.99;
const resolveRateFromAmount = (amount: number, baseAmount: number) => {
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) return 0;
    return (amount * 100) / baseAmount;
};
const resolveDiscountInputValue = (mode: 'RATE' | 'AMOUNT', rateValue: number, amountValue: number) => {
    const value = mode === 'RATE' ? rateValue : amountValue;
    return Math.abs(value) > FREE_QTY_EPSILON ? value : null;
};
const clampDiscountRate = (value: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric <= 0) return 0;
    if (numeric >= MAX_DISCOUNT_RATE) return MAX_DISCOUNT_RATE;
    return numeric;
};

export function InvoiceLinesTable({
    lines,
    placeOfSupply,
    showTaxColumns = true,
    showTypeDetails = true,
    productOptions,
    lineAttributesByLineKey = {},
    mrpOptionsByProductId,
    unitOptions,
    ledgerOptions,
    ledgerById,
    taxLedgerOptions,
    showTextileJobworkFields = false,
    lineErrorsByKey,
    onSelectProduct,
    onSelectMrp,
    onLineChange,
    onDeleteLine,
    onDuplicateLine,
    onAddLine,
    onOpenTypeDetailsForLine
}: InvoiceLinesTableProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
    const [activeDiscountHintField, setActiveDiscountHintField] = useState<DiscountHintField | null>(null);
    const [barcodeValue, setBarcodeValue] = useState('');
    const [barcodeLookupPending, setBarcodeLookupPending] = useState(false);
    const [barcodeLookupNotice, setBarcodeLookupNotice] = useState<BarcodeLookupNotice | null>(null);
    const previousLineCountRef = useRef(lines.length);
    const previousSelectedLineKeyRef = useRef<string | null>(null);
    const lineSnapshotsRef = useRef<Record<string, InvoiceLineDraft>>({});

    const productLabelById = useMemo(() => {
        const map = new Map<number, string>();
        productOptions.forEach((option) => map.set(option.value, option.label));
        return map;
    }, [productOptions]);

    const unitLabelById = useMemo(() => {
        const map = new Map<number, string>();
        unitOptions.forEach((option) => map.set(option.value, option.label));
        return map;
    }, [unitOptions]);

    const taxLedgerPartyOptions = useMemo(
        () =>
            taxLedgerOptions.map((option) => ({
                label: option.label,
                value: option.value,
                address: option.address ?? null,
                taxRate: Number(option.taxRate ?? 0)
            })),
        [taxLedgerOptions]
    );

    const selectedLine = useMemo(
        () => (selectedLineKey ? lines.find((line) => line.key === selectedLineKey) ?? null : null),
        [lines, selectedLineKey]
    );

    const jobberLedgerOptions = useMemo<PartyLedgerOption[]>(() => {
        const options = ledgerOptions.map((option) => {
            const ledger = ledgerById.get(option.value) ?? null;
            const address = [ledger?.address, ledger?.cityName, ledger?.stateName]
                .map((value) => (value ?? '').trim())
                .filter(Boolean)
                .join(', ');
            return {
                label: option.label,
                value: option.value,
                address: address || null
            };
        });

        if (selectedLine?.textileJobberLedgerId != null && !options.some((option) => option.value === selectedLine.textileJobberLedgerId)) {
            const ledger = ledgerById.get(selectedLine.textileJobberLedgerId) ?? null;
            const address = [ledger?.address, ledger?.cityName, ledger?.stateName]
                .map((value) => (value ?? '').trim())
                .filter(Boolean)
                .join(', ');
            options.unshift({
                label: ledger?.name?.trim() || `Ledger ${selectedLine.textileJobberLedgerId}`,
                value: selectedLine.textileJobberLedgerId,
                address: address || null
            });
        }

        return options;
    }, [ledgerById, ledgerOptions, selectedLine?.textileJobberLedgerId]);

    const resolveLedgerName = (ledgerId: number | null) => {
        if (ledgerId == null) return '';
        const normalizedId = Number(ledgerId);
        if (!Number.isFinite(normalizedId) || normalizedId <= 0) return '';
        const ledger = ledgerById.get(normalizedId) ?? null;
        return ledger?.name?.trim() || `Ledger ${normalizedId}`;
    };

    const isNewLineEntryMode = Boolean(selectedLine?.isNewLineEntry);

    const selectedLineMrpOptions = useMemo(() => {
        const baseOptions = selectedLine?.itemId ? mrpOptionsByProductId[selectedLine.itemId] ?? [] : [];
        const selectedMrp = selectedLine?.mrp;
        if (selectedMrp == null || !Number.isFinite(selectedMrp)) return baseOptions;
        const normalizedSelectedMrp = Number(selectedMrp.toFixed(2));
        const hasSelectedMrpOption = baseOptions.some((option) => Math.abs(option.value - normalizedSelectedMrp) < 0.0001);
        if (hasSelectedMrpOption) return baseOptions;
        return [{ label: normalizedSelectedMrp.toFixed(2), value: normalizedSelectedMrp }, ...baseOptions];
    }, [mrpOptionsByProductId, selectedLine?.itemId, selectedLine?.mrp]);

    const selectedLineUnitFreeValue = useMemo(() => {
        if (!selectedLine) return null;
        if (selectedLine.unitFreeId != null && selectedLine.unitFreeId > 0) return selectedLine.unitFreeId;
        if (selectedLine.unitId != null && selectedLine.unitId > 0) return selectedLine.unitId;
        return null;
    }, [selectedLine]);

    useEffect(() => {
        setBarcodeValue('');
        setBarcodeLookupPending(false);
        setBarcodeLookupNotice(null);
    }, [selectedLine?.key]);

    const taxLedgerById = useMemo(() => {
        const map = new Map<number, { value: number; label: string; taxRate: number; role: ReturnType<typeof resolveTaxRole> }>();
        taxLedgerPartyOptions.forEach((option) => {
            const normalizedId = Number(option.value);
            if (!Number.isFinite(normalizedId)) return;
            map.set(normalizedId, {
                value: normalizedId,
                label: option.label,
                taxRate: Number(option.taxRate ?? 0),
                role: resolveTaxRole(option.label)
            });
        });
        return map;
    }, [taxLedgerPartyOptions]);

    const findPairedTaxLedgerId = (sourceLedgerId: number, role: 'sgst' | 'cgst') => {
        const normalizedSourceId = Number(sourceLedgerId);
        if (!Number.isFinite(normalizedSourceId)) return null;
        const source = taxLedgerById.get(normalizedSourceId);
        if (!source) {
            const roleOnlyMatch = taxLedgerPartyOptions.find(
                (option) =>
                    Number(option.value) !== normalizedSourceId && resolveTaxRole(option.label) === role
            );
            if (!roleOnlyMatch) return null;
            const normalizedMatchId = Number(roleOnlyMatch.value);
            return Number.isFinite(normalizedMatchId) ? normalizedMatchId : null;
        }
        const sourceRate = Number(source.taxRate ?? 0);
        const candidates = taxLedgerPartyOptions.filter((option) => {
            const normalizedOptionId = Number(option.value);
            if (!Number.isFinite(normalizedOptionId)) return false;
            if (normalizedOptionId === normalizedSourceId) return false;
            const optionRate = Number(option.taxRate ?? 0);
            if (Number.isFinite(sourceRate) && sourceRate > 0 && Number.isFinite(optionRate)) {
                if (Math.abs(optionRate - sourceRate) > 0.0001) return false;
            }
            return true;
        });
        const roleMatch = candidates.find((option) => resolveTaxRole(option.label) === role);
        if (roleMatch) {
            const normalizedRoleMatchId = Number(roleMatch.value);
            return Number.isFinite(normalizedRoleMatchId) ? normalizedRoleMatchId : null;
        }
        const sameStateFallback = candidates.find((option) => {
            const optionRole = resolveTaxRole(option.label);
            return optionRole !== 'igst' && optionRole !== source.role;
        });
        if (sameStateFallback) {
            const normalizedFallbackId = Number(sameStateFallback.value);
            return Number.isFinite(normalizedFallbackId) ? normalizedFallbackId : null;
        }
        const firstCandidateId = Number(candidates[0]?.value);
        return Number.isFinite(firstCandidateId) ? firstCandidateId : null;
    };

    useEffect(() => {
        const currentKeys = new Set(lines.map((line) => line.key));
        Object.keys(lineSnapshotsRef.current).forEach((lineKey) => {
            if (!currentKeys.has(lineKey)) {
                delete lineSnapshotsRef.current[lineKey];
            }
        });
    }, [lines]);

    useEffect(() => {
        const previousSelectedLineKey = previousSelectedLineKeyRef.current;
        if (previousSelectedLineKey && previousSelectedLineKey !== selectedLineKey) {
            delete lineSnapshotsRef.current[previousSelectedLineKey];
        }
        previousSelectedLineKeyRef.current = selectedLineKey;
    }, [selectedLineKey]);

    useEffect(() => {
        if (!selectedLine) return;
        if (lineSnapshotsRef.current[selectedLine.key]) return;
        lineSnapshotsRef.current[selectedLine.key] = createLineSnapshot(selectedLine);
    }, [selectedLine]);

    useEffect(() => {
        if (lines.length === 0) {
            if (selectedLineKey != null) setSelectedLineKey(null);
            previousLineCountRef.current = 0;
            return;
        }

        const hasSelection = selectedLineKey != null && lines.some((line) => line.key === selectedLineKey);
        const addedNewLine = lines.length > previousLineCountRef.current;
        if (!hasSelection || addedNewLine) {
            const targetLine = lines[lines.length - 1];
            setSelectedLineKey(targetLine?.key ?? null);
        }

        previousLineCountRef.current = lines.length;
    }, [lines, selectedLineKey]);

    const handleEnterNext = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        focusNextFrom(containerRef.current, event.currentTarget as HTMLElement);
    };

    const handleItemSelectNext = () => {
        const activeElement = document.activeElement as HTMLElement | null;
        const activeInsideContainer = activeElement && containerRef.current?.contains(activeElement) ? activeElement : null;
        const fallbackItemInput = containerRef.current?.querySelector<HTMLElement>(
            '.invoice-line-editor__field--item input, .invoice-line-editor__field--item .p-inputtext'
        ) ?? null;
        focusNextFrom(containerRef.current, activeInsideContainer ?? fallbackItemInput);
    };

    const resolveSelectedLineBarcode = async () => {
        if (!selectedLine) return;
        const code = barcodeValue.trim();
        if (!code) {
            setBarcodeLookupNotice({ tone: 'warn', text: 'Enter or scan a barcode first.' });
            return;
        }

        setBarcodeLookupPending(true);
        setBarcodeLookupNotice(null);
        try {
            const match = await resolveIdentifierCode(code);
            if (!match) {
                setBarcodeLookupNotice({ tone: 'warn', text: `No product barcode matched ${code}.` });
                return;
            }
            if (match.entityType !== 'PRODUCT') {
                setBarcodeLookupNotice({
                    tone: 'warn',
                    text: `Barcode ${code} belongs to ${match.entityType}, not a product.`
                });
                return;
            }

            const productId = Number(match.entityId ?? 0);
            if (!Number.isFinite(productId) || productId <= 0) {
                setBarcodeLookupNotice({ tone: 'warn', text: `Barcode ${code} is missing a valid product link.` });
                return;
            }
            if (!productLabelById.has(productId)) {
                setBarcodeLookupNotice({
                    tone: 'warn',
                    text: `Barcode ${code} matched product #${productId}, but that product is not available in this invoice list yet.`
                });
                return;
            }

            onSelectProduct(selectedLine.key, productId);
            setBarcodeValue('');
            setBarcodeLookupNotice({
                tone: 'success',
                text: `Resolved ${code} to ${productLabelById.get(productId) ?? `Product ${productId}`}.`
            });
            window.setTimeout(() => {
                handleItemSelectNext();
            }, 0);
        } catch (error) {
            setBarcodeLookupNotice({
                tone: 'error',
                text: error instanceof Error ? error.message : 'Unable to resolve barcode.'
            });
        } finally {
            setBarcodeLookupPending(false);
        }
    };

    const patchSelectedLine = (patch: Partial<InvoiceLineDraft>) => {
        if (!selectedLine) return;
        onLineChange(selectedLine.key, patch);
    };

    const discardLineEdits = (lineKey: string, snapshot?: InvoiceLineDraft) => {
        if (snapshot) {
            onLineChange(lineKey, createRestorePatch(snapshot));
        }
        delete lineSnapshotsRef.current[lineKey];
        setSelectedLineKey((current) => (current === lineKey ? null : current));
    };

    const handleDoneEditing = () => {
        if (!selectedLine) return;
        onLineChange(selectedLine.key, { isNewLineEntry: false });
        delete lineSnapshotsRef.current[selectedLine.key];
        setSelectedLineKey(null);
        // Legacy-like flow: continue directly in add-line mode after saving current line.
        onAddLine();
    };

    const handleEditorCancel = () => {
        if (!selectedLine) return;
        const lineKey = selectedLine.key;
        const snapshot = lineSnapshotsRef.current[lineKey];
        const hasChanges = snapshot
            ? serializeLineForCompare(selectedLine) !== serializeLineForCompare(snapshot)
            : true;
        if (!hasChanges) {
            discardLineEdits(lineKey, snapshot);
            return;
        }
        confirmDialog({
            header: 'Discard changes?',
            message: 'You have unsaved changes in this line. Discard and continue?',
            icon: 'pi pi-exclamation-triangle',
            rejectLabel: 'Keep Editing',
            acceptLabel: 'Discard',
            acceptClassName: 'p-button-danger',
            defaultFocus: 'reject',
            accept: () => discardLineEdits(lineKey, snapshot),
            reject: () => undefined
        });
    };

    const resolveRowClassName = (line: ComputedInvoiceLine) =>
        classNames({
            'app-entry-line-row--selected': line.key === selectedLineKey,
            'p-invalid': (lineErrorsByKey[line.key] ?? []).length > 0
        });

    const lineTotals = useMemo(
        () =>
            lines.reduce(
                (totals, line) => {
                    const qpsAmount = line.qpsDiscountMode === 'AMOUNT' ? line.qpsAmount : line.qpsAmountComputed;
                    const productDiscountAmount =
                        line.productDiscountMode === 'AMOUNT' ? line.productDiscountAmount : line.productDiscountAmountComputed;
                    const cashDiscountAmount =
                        line.cashDiscountMode === 'AMOUNT' ? line.cashDiscountAmount : line.cashDiscountAmountComputed;
                    const taxAmount = placeOfSupply === 'other_state' ? line.taxAmount3 : line.taxAmount + line.taxAmount2;
                    totals.quantity += line.quantity;
                    totals.freeQuantity += line.freeQuantity;
                    totals.quantityRateAmount += line.quantityRateAmount;
                    totals.qpsAmount += qpsAmount;
                    totals.productDiscountAmount += productDiscountAmount;
                    totals.cashDiscountAmount += cashDiscountAmount;
                    totals.taxableAmount += line.taxableAmount;
                    totals.taxAmount += taxAmount;
                    totals.netAmount += line.taxableAmount + taxAmount;
                    return totals;
                },
                {
                    quantity: 0,
                    freeQuantity: 0,
                    quantityRateAmount: 0,
                    qpsAmount: 0,
                    productDiscountAmount: 0,
                    cashDiscountAmount: 0,
                    taxableAmount: 0,
                    taxAmount: 0,
                    netAmount: 0
                }
            ),
        [lines, placeOfSupply]
    );

    const linesHeaderGroup = useMemo(
        () => (
            <ColumnGroup>
                <Row>
                    <Column header="SN" rowSpan={2} headerClassName="app-entry-header-center" />
                    <Column header="Product" rowSpan={2} headerClassName="app-entry-header-left" />
                    {showTypeDetails ? <Column header="Attributes" rowSpan={2} headerClassName="app-entry-header-left" /> : null}
                    <Column header="HSN" rowSpan={2} headerClassName="app-entry-header-left" />
                    <Column header="MRP" rowSpan={2} headerClassName="app-entry-header-right" />
                    <Column header="UnitQ" rowSpan={2} headerClassName="app-entry-header-left" />
                    <Column header="Qty" rowSpan={2} headerClassName="app-entry-header-right" />
                    <Column header="S Rate" rowSpan={2} headerClassName="app-entry-header-right" />
                    <Column header="Rate" rowSpan={2} headerClassName="app-entry-header-right" />
                    <Column header="QtyxRate" rowSpan={2} headerClassName="app-entry-header-right" />
                    <Column header="QPS" colSpan={2} headerClassName="app-entry-header-center" />
                    <Column header="Pro" colSpan={2} headerClassName="app-entry-header-center" />
                    <Column header="Cash" colSpan={2} headerClassName="app-entry-header-center" />
                    <Column header="Taxable Amt" rowSpan={2} headerClassName="app-entry-header-right" />
                    {showTaxColumns ? (
                        <Column
                            header={placeOfSupply === 'other_state' ? 'IGST' : 'SGST+CGST'}
                            colSpan={2}
                            headerClassName="app-entry-header-center"
                        />
                    ) : null}
                    <Column header="Net Amt" rowSpan={2} headerClassName="app-entry-header-right" />
                    <Column header="" rowSpan={2} headerClassName="app-entry-header-center" />
                </Row>
                <Row>
                    <Column header="%" headerClassName="app-entry-header-right" />
                    <Column header="Amt" headerClassName="app-entry-header-right" />
                    <Column header="%" headerClassName="app-entry-header-right" />
                    <Column header="Amt" headerClassName="app-entry-header-right" />
                    <Column header="%" headerClassName="app-entry-header-right" />
                    <Column header="Amt" headerClassName="app-entry-header-right" />
                    {showTaxColumns ? <Column header="%" headerClassName="app-entry-header-right" /> : null}
                    {showTaxColumns ? <Column header="Amt" headerClassName="app-entry-header-right" /> : null}
                </Row>
            </ColumnGroup>
        ),
        [placeOfSupply, showTaxColumns, showTypeDetails]
    );

    const linesFooterGroup = useMemo(
        () => (
            <ColumnGroup>
                <Row>
                    <Column footer="" />
                    <Column footer={<span className="invoice-form-lines-table__footer-title">Total</span>} />
                    {showTypeDetails ? <Column footer="" /> : null}
                    <Column footer="" />
                    <Column footer="" />
                    <Column footer="" />
                    <Column
                        footer={
                            <div className="invoice-entry-lines-cell-stack invoice-entry-lines-cell-stack--numeric">
                                <span className="invoice-entry-lines-cell-main">{formatQty(lineTotals.quantity)}</span>
                                {lineTotals.freeQuantity > FREE_QTY_EPSILON ? (
                                    <small className="invoice-entry-lines-cell-meta">Free: {formatQty(lineTotals.freeQuantity)}</small>
                                ) : null}
                            </div>
                        }
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column footer="" />
                    <Column footer="" />
                    <Column
                        footer={formatAmount(lineTotals.quantityRateAmount)}
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column
                        footer=""
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column
                        footer={formatAmountOrBlank(lineTotals.qpsAmount)}
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column
                        footer=""
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column
                        footer={formatAmountOrBlank(lineTotals.productDiscountAmount)}
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column
                        footer=""
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column
                        footer={formatAmountOrBlank(lineTotals.cashDiscountAmount)}
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column
                        footer={formatAmount(lineTotals.taxableAmount)}
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    {showTaxColumns ? <Column footer="" footerClassName="invoice-form-lines-table__footer-cell--numeric" /> : null}
                    {showTaxColumns ? (
                        <Column
                            footer={formatAmountOrBlank(lineTotals.taxAmount)}
                            footerClassName="invoice-form-lines-table__footer-cell--numeric"
                        />
                    ) : null}
                    <Column
                        footer={formatAmount(lineTotals.netAmount)}
                        footerClassName="invoice-form-lines-table__footer-cell--numeric"
                    />
                    <Column footer="" />
                </Row>
            </ColumnGroup>
        ),
        [lineTotals, showTaxColumns, showTypeDetails]
    );

    return (
        <div
            ref={containerRef}
            className="app-entry-section app-entry-section--lines mt-2"
            onKeyDownCapture={(event) => {
                if (!selectedLineKey) return;
                if (event.ctrlKey && event.key.toLowerCase() === 'd') {
                    event.preventDefault();
                    onDuplicateLine(selectedLineKey);
                    return;
                }
                if (event.key === 'Delete') {
                    if (isEditableInputTarget(event.target)) return;
                    event.preventDefault();
                    onDeleteLine(selectedLineKey);
                }
            }}
        >
            <div className="app-entry-lines">
                <div className="app-entry-lines-header">
                    <div className="app-entry-lines-title">Line Items</div>
                    <small className="app-entry-lines-keyboard-hint">
                        Keyboard: press <b>Enter</b> to move next, <b>Ctrl + D</b> to duplicate selected row, and <b>Delete</b> to
                        remove selected row when focus is outside an input.
                    </small>
                </div>

                <div className="app-entry-lines-grid">
                    <DataTable
                        value={lines}
                        dataKey="key"
                        responsiveLayout="scroll"
                        size="small"
                        className="app-entry-lines-table invoice-form-lines-table"
                        headerColumnGroup={linesHeaderGroup}
                        footerColumnGroup={linesFooterGroup}
                        selectionMode="single"
                        selection={selectedLine}
                        onSelectionChange={(event) => {
                            const nextLine = event.value as ComputedInvoiceLine | null;
                            setSelectedLineKey(nextLine?.key ?? null);
                        }}
                        rowClassName={(line) => resolveRowClassName(line as ComputedInvoiceLine)}
                    >
                        <Column
                            header="SN"
                            headerClassName="app-entry-header-center"
                            body={(_row: ComputedInvoiceLine, options: { rowIndex: number }) => (
                                <span className="text-500">{options.rowIndex + 1}</span>
                            )}
                            style={{ width: '4rem' }}
                        />
                        <Column
                            header="Product"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => {
                                const hasFreeItem = Number(line.freeQuantity ?? 0) > FREE_QTY_EPSILON;
                                const mainItem = line.itemName || (line.itemId ? productLabelById.get(line.itemId) ?? '-' : '-');
                                const freeItem = line.itemFreeName || (line.itemFreeId ? productLabelById.get(line.itemFreeId) ?? '-' : '-');
                                const remark = line.remarks?.trim() || '';
                                const jobberLabel =
                                    showTextileJobworkFields && line.textileJobberLedgerId != null
                                        ? resolveLedgerName(line.textileJobberLedgerId)
                                        : '';
                                return (
                                    <div className="invoice-entry-lines-cell-stack">
                                        <span className="invoice-entry-lines-cell-main">{mainItem}</span>
                                        {remark ? <small className="invoice-entry-lines-cell-meta">Rmk: {remark}</small> : null}
                                        {jobberLabel ? <small className="invoice-entry-lines-cell-meta">Jobber: {jobberLabel}</small> : null}
                                        {hasFreeItem ? <small className="invoice-entry-lines-cell-meta">Free: {freeItem}</small> : null}
                                    </div>
                                );
                            }}
                            style={{ minWidth: '14rem' }}
                        />
                        {showTypeDetails ? (
                            <Column
                                header="Attributes"
                                headerClassName="app-entry-header-left"
                                body={(line: ComputedInvoiceLine) => (
                                    <span>{lineAttributesByLineKey[line.key]?.trim() || ''}</span>
                                )}
                                style={{ minWidth: '9rem' }}
                            />
                        ) : null}
                        <Column
                            header="HSN"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => <span>{line.hsnCode || '-'}</span>}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="MRP"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatMaybeAmount(line.mrp)}</span>}
                            bodyClassName="invoice-form-lines-table__cell--numeric"
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="UnitQ"
                            headerClassName="app-entry-header-left"
                            body={(line: ComputedInvoiceLine) => {
                                const hasFreeItem = Number(line.freeQuantity ?? 0) > FREE_QTY_EPSILON;
                                return (
                                    <div className="invoice-entry-lines-cell-stack">
                                        <span className="invoice-entry-lines-cell-main">{line.unitName || '-'}</span>
                                        {hasFreeItem ? <small className="invoice-entry-lines-cell-meta">Free: {line.unitFreeName || '-'}</small> : null}
                                    </div>
                                );
                            }}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Qty"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const hasFreeItem = Number(line.freeQuantity ?? 0) > FREE_QTY_EPSILON;
                                return (
                                    <div className="invoice-entry-lines-cell-stack invoice-entry-lines-cell-stack--numeric">
                                        <span className="invoice-entry-lines-cell-main">{formatQty(line.quantity)}</span>
                                        {hasFreeItem ? <small className="invoice-entry-lines-cell-meta">Free: {formatQty(line.freeQuantity)}</small> : null}
                                    </div>
                                );
                            }}
                            bodyClassName="invoice-form-lines-table__cell--numeric"
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="S Rate"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatMaybeAmount(line.sellingRate)}</span>}
                            bodyClassName="invoice-form-lines-table__cell--numeric"
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Rate"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.rate)}</span>}
                            bodyClassName="invoice-form-lines-table__cell--numeric"
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="QtyxRate"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.quantityRateAmount)}</span>}
                            bodyClassName="invoice-form-lines-table__cell--numeric"
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="QPS %"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const qpsRate =
                                    line.qpsDiscountMode === 'RATE'
                                        ? line.qpsRate
                                        : resolveRateFromAmount(line.qpsAmount, line.quantityRateAmount);
                                return <span>{formatPercentOrBlank(qpsRate)}</span>;
                            }}
                            bodyClassName={(line: ComputedInvoiceLine) =>
                                classNames('invoice-form-lines-table__cell--numeric', {
                                    'invoice-form-lines-table__cell--discount-rate-muted': line.qpsDiscountMode === 'AMOUNT'
                                })
                            }
                            style={{ width: '4.5rem' }}
                        />
                        <Column
                            header="QPS Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const qpsAmount = line.qpsDiscountMode === 'AMOUNT' ? line.qpsAmount : line.qpsAmountComputed;
                                return <span>{formatAmountOrBlank(qpsAmount)}</span>;
                            }}
                            bodyClassName={(line: ComputedInvoiceLine) =>
                                classNames('invoice-form-lines-table__cell--numeric', {
                                    'invoice-form-lines-table__cell--discount-amount-active': line.qpsDiscountMode === 'AMOUNT'
                                })
                            }
                            style={{ width: '5rem' }}
                        />
                        <Column
                            header="Pro %"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const proAmount =
                                    line.productDiscountMode === 'AMOUNT'
                                        ? line.productDiscountAmount
                                        : line.productDiscountAmountComputed;
                                const proRate =
                                    line.productDiscountMode === 'RATE'
                                        ? line.productDiscountRate
                                        : resolveRateFromAmount(proAmount, line.quantityRateAmount);
                                return <span>{formatPercentOrBlank(proRate)}</span>;
                            }}
                            bodyClassName={(line: ComputedInvoiceLine) =>
                                classNames('invoice-form-lines-table__cell--numeric', {
                                    'invoice-form-lines-table__cell--discount-rate-muted': line.productDiscountMode === 'AMOUNT'
                                })
                            }
                            style={{ width: '4.5rem' }}
                        />
                        <Column
                            header="Pro Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const proAmount =
                                    line.productDiscountMode === 'AMOUNT'
                                        ? line.productDiscountAmount
                                        : line.productDiscountAmountComputed;
                                return <span>{formatAmountOrBlank(proAmount)}</span>;
                            }}
                            bodyClassName={(line: ComputedInvoiceLine) =>
                                classNames('invoice-form-lines-table__cell--numeric', {
                                    'invoice-form-lines-table__cell--discount-amount-active': line.productDiscountMode === 'AMOUNT'
                                })
                            }
                            style={{ width: '5rem' }}
                        />
                        <Column
                            header="Cash %"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const cashAmount = line.cashDiscountMode === 'AMOUNT' ? line.cashDiscountAmount : line.cashDiscountAmountComputed;
                                const cashRate =
                                    line.cashDiscountMode === 'RATE'
                                        ? line.cashDiscountRate
                                        : resolveRateFromAmount(cashAmount, line.lineAmount);
                                return <span>{formatPercentOrBlank(cashRate)}</span>;
                            }}
                            bodyClassName={(line: ComputedInvoiceLine) =>
                                classNames('invoice-form-lines-table__cell--numeric', {
                                    'invoice-form-lines-table__cell--discount-rate-muted': line.cashDiscountMode === 'AMOUNT'
                                })
                            }
                            style={{ width: '4.5rem' }}
                        />
                        <Column
                            header="Cash Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const cashAmount = line.cashDiscountMode === 'AMOUNT' ? line.cashDiscountAmount : line.cashDiscountAmountComputed;
                                return <span>{formatAmountOrBlank(cashAmount)}</span>;
                            }}
                            bodyClassName={(line: ComputedInvoiceLine) =>
                                classNames('invoice-form-lines-table__cell--numeric', {
                                    'invoice-form-lines-table__cell--discount-amount-active': line.cashDiscountMode === 'AMOUNT'
                                })
                            }
                            style={{ width: '5rem' }}
                        />
                        <Column
                            header="Taxable Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => <span>{formatAmount(line.taxableAmount)}</span>}
                            bodyClassName="invoice-form-lines-table__cell--numeric"
                            style={{ width: '8rem' }}
                        />
                        {showTaxColumns ? (
                            <Column
                                header={placeOfSupply === 'other_state' ? 'IGST %' : 'SGST+CGST %'}
                                headerClassName="app-entry-header-right"
                                body={(line: ComputedInvoiceLine) => {
                                    const combinedRate = placeOfSupply === 'other_state' ? line.taxRate3 : line.taxRate + line.taxRate2;
                                    return <span>{formatPercentOrBlank(combinedRate)}</span>;
                                }}
                                bodyClassName="invoice-form-lines-table__cell--numeric"
                                style={{ width: '4.5rem' }}
                            />
                        ) : null}
                        {showTaxColumns ? (
                            <Column
                                header={placeOfSupply === 'other_state' ? 'IGST Amt' : 'SGST+CGST Amt'}
                                headerClassName="app-entry-header-right"
                                body={(line: ComputedInvoiceLine) => {
                                    const combinedAmount = placeOfSupply === 'other_state' ? line.taxAmount3 : line.taxAmount + line.taxAmount2;
                                    return <span>{formatAmountOrBlank(combinedAmount)}</span>;
                                }}
                                bodyClassName="invoice-form-lines-table__cell--numeric"
                                style={{ width: '5rem' }}
                            />
                        ) : null}
                        <Column
                            header="Net Amt"
                            headerClassName="app-entry-header-right"
                            body={(line: ComputedInvoiceLine) => {
                                const taxAmount = placeOfSupply === 'other_state' ? line.taxAmount3 : line.taxAmount + line.taxAmount2;
                                return <span>{formatAmount(line.taxableAmount + taxAmount)}</span>;
                            }}
                            bodyClassName="invoice-form-lines-table__cell--numeric"
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header=""
                            headerClassName="app-entry-header-center"
                            body={(line: ComputedInvoiceLine) => (
                                <div className="flex align-items-center justify-content-center gap-1 app-entry-line-actions">
                                    <Button
                                        icon="pi pi-pencil"
                                        className="p-button-text p-button-sm"
                                        onClick={() => setSelectedLineKey(line.key)}
                                        tooltip="Edit line"
                                        tooltipOptions={{ position: 'top' }}
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        severity="danger"
                                        text
                                        onClick={() => onDeleteLine(line.key)}
                                        disabled={lines.length <= 1}
                                        tooltip="Delete line"
                                        tooltipOptions={{ position: 'top' }}
                                    />
                                </div>
                            )}
                            style={{ width: '6rem' }}
                        />
                    </DataTable>

                </div>
            </div>

            {selectedLine ? (
                <div className="app-entry-line-editor invoice-line-editor">
                    <div className="app-entry-line-editor__meta">
                        <span
                            className={`app-entry-line-editor__mode ${
                                isNewLineEntryMode ? 'app-entry-line-editor__mode--add' : 'app-entry-line-editor__mode--edit'
                            }`}
                        >
                            {`Editing selected line (SN ${selectedLine.lineNumber})`}
                        </span>
                        {isNewLineEntryMode ? <span className="invoice-form-status-chip">New Line</span> : null}
                        {activeDiscountHintField ? (
                            <small className="invoice-line-editor__discount-focus-hint">
                                F3: toggle % / Amt for QPS / Pro / Cash
                            </small>
                        ) : null}
                    </div>

                    <div className="invoice-line-editor__grid">
                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--item">
                            <label className="invoice-line-editor__label">Item</label>
                            <ItemAutoComplete
                                value={selectedLine.itemId}
                                options={productOptions}
                                onChange={(productId) => onSelectProduct(selectedLine.key, productId)}
                                onSelectNext={handleItemSelectNext}
                                placeholder="Select item"
                                showClear
                                className="w-full invoice-line-editor__control"
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--barcode">
                            <label className="invoice-line-editor__label">Barcode</label>
                            <div className="flex gap-2 align-items-center">
                                <InputText
                                    value={barcodeValue}
                                    className="app-input w-full invoice-line-editor__control"
                                    onChange={(event) => setBarcodeValue(event.target.value)}
                                    placeholder="Scan product barcode"
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        event.preventDefault();
                                        void resolveSelectedLineBarcode();
                                    }}
                                />
                                <Button
                                    type="button"
                                    icon="pi pi-barcode"
                                    label="Resolve"
                                    className="app-action-compact app-action-compact--line p-button-outlined"
                                    onClick={() => void resolveSelectedLineBarcode()}
                                    loading={barcodeLookupPending}
                                    disabled={barcodeLookupPending}
                                />
                            </div>
                            {barcodeLookupNotice ? (
                                <small
                                    className={classNames('block mt-2', {
                                        'text-green-600': barcodeLookupNotice.tone === 'success',
                                        'text-600': barcodeLookupNotice.tone === 'warn',
                                        'text-red-500': barcodeLookupNotice.tone === 'error'
                                    })}
                                >
                                    {barcodeLookupNotice.text}
                                </small>
                            ) : null}
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--remark">
                            <label className="invoice-line-editor__label">Remark</label>
                            <InputText
                                value={selectedLine.remarks}
                                className="app-input w-full invoice-line-editor__control"
                                onChange={(event) => patchSelectedLine({ remarks: event.target.value })}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--scheme">
                            <label className="invoice-line-editor__label">Scheme</label>
                            <div className="invoice-line-editor__check">
                                <Checkbox
                                    inputId={`invoice-line-scheme-${selectedLine.key}`}
                                    checked={selectedLine.hasScheme}
                                    onChange={(event) => {
                                        if (!event.checked) {
                                            patchSelectedLine({
                                                hasScheme: false,
                                                productDiscountMode: 'RATE',
                                                productDiscountRate: 0,
                                                productDiscountAmount: 0
                                            });
                                            return;
                                        }
                                        patchSelectedLine({ hasScheme: true });
                                    }}
                                />
                                <label htmlFor={`invoice-line-scheme-${selectedLine.key}`} className="text-700 text-sm">
                                    Apply
                                </label>
                            </div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--linebox-dropdown invoice-line-editor__field--mrp-dropdown">
                            <label className="invoice-line-editor__label">MRP</label>
                            <AppAutoCompleteDropdown
                                value={selectedLine.mrp}
                                options={selectedLineMrpOptions}
                                onChange={(event) => {
                                    const nextMrp = event.value != null ? Number(event.value) : null;
                                    onSelectMrp(selectedLine.key, nextMrp);
                                }}
                                placeholder="MRP"
                                showClear
                                filter
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--linebox invoice-line-editor__field--linebox-dropdown invoice-line-editor__field--unit-q">
                            <label className="invoice-line-editor__label">Unit Q</label>
                            <AppAutoCompleteDropdown
                                value={selectedLine.unitId}
                                options={unitOptions}
                                onChange={(event) => {
                                    const unitId = (event.value as number) ?? null;
                                    patchSelectedLine({
                                        unitId,
                                        unitName: unitId ? unitLabelById.get(unitId) ?? null : null
                                    });
                                }}
                                placeholder="Unit"
                                showClear
                                filter
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--qty">
                            <label className="invoice-line-editor__label">Qty</label>
                            <InputNumber
                                value={selectedLine.quantity}
                                onValueChange={(event) => patchSelectedLine({ quantity: event.value != null ? Number(event.value) : 0 })}
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                maxFractionDigits={3}
                                useGrouping={false}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        {showTypeDetails ? (
                            <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--attributes">
                                <label className="invoice-line-editor__label">Attributes</label>
                                <div className="invoice-line-editor__attributes-readonly">
                                    <InputText
                                        value={lineAttributesByLineKey[selectedLine.key]?.trim() || ''}
                                        className="app-input w-full invoice-line-editor__control"
                                        placeholder="No attributes"
                                        readOnly
                                    />
                                    <Button
                                        type="button"
                                        icon="pi pi-list"
                                        className="app-action-compact app-action-compact--line p-button-outlined invoice-line-editor__attributes-trigger"
                                        onClick={() => onOpenTypeDetailsForLine(selectedLine.itemId, selectedLine.tmpTypeId)}
                                        disabled={selectedLine.itemId == null}
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--s-rate">
                            <label className="invoice-line-editor__label">S. Rate</label>
                            <InputNumber
                                value={selectedLine.sellingRate}
                                onValueChange={(event) =>
                                    patchSelectedLine({ sellingRate: event.value != null ? Number(event.value) : null })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--rate">
                            <label className="invoice-line-editor__label">Rate</label>
                            <InputNumber
                                value={selectedLine.rate}
                                onValueChange={(event) => patchSelectedLine({ rate: event.value != null ? Number(event.value) : 0 })}
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--free invoice-line-editor__field--free-qty">
                            <label className="invoice-line-editor__label">Free</label>
                            <InputNumber
                                value={selectedLine.freeQuantity}
                                onValueChange={(event) =>
                                    patchSelectedLine({ freeQuantity: event.value != null ? Number(event.value) : 0 })
                                }
                                className="app-input w-full invoice-line-editor__control"
                                min={0}
                                maxFractionDigits={3}
                                useGrouping={false}
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--free-item">
                            <label className="invoice-line-editor__label">Free Item</label>
                            <ItemAutoComplete
                                value={selectedLine.itemFreeId}
                                options={productOptions}
                                onChange={(itemFreeId) => patchSelectedLine({ itemFreeId })}
                                placeholder="Select free item"
                                showClear
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--linebox invoice-line-editor__field--linebox-dropdown invoice-line-editor__field--unit-f">
                            <label className="invoice-line-editor__label">Unit F</label>
                            <AppAutoCompleteDropdown
                                value={selectedLineUnitFreeValue}
                                options={unitOptions}
                                onChange={(event) => {
                                    const unitFreeIdRaw = (event.value as number) ?? null;
                                    const unitFreeId = unitFreeIdRaw != null && Number(unitFreeIdRaw) > 0 ? Number(unitFreeIdRaw) : null;
                                    patchSelectedLine({
                                        unitFreeId,
                                        unitFreeName: unitFreeId ? unitLabelById.get(unitFreeId) ?? null : null
                                    });
                                }}
                                placeholder="Unit"
                                showClear
                                filter
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--discount-qps">
                            <DiscountSplitInput
                                rateLabel="QPS %"
                                mode={selectedLine.qpsDiscountMode}
                                rateValue={
                                    selectedLine.qpsDiscountMode === 'RATE'
                                        ? resolveDiscountInputValue('RATE', selectedLine.qpsRate, 0)
                                        : resolveRateFromAmount(selectedLine.qpsAmount, selectedLine.quantityRateAmount)
                                }
                                amountValue={
                                    selectedLine.qpsDiscountMode === 'AMOUNT'
                                        ? resolveDiscountInputValue('AMOUNT', 0, selectedLine.qpsAmount)
                                        : selectedLine.qpsAmountComputed
                                }
                                onRateChange={(value) =>
                                    patchSelectedLine({
                                        qpsRate: value,
                                        qpsDiscountMode: 'RATE'
                                    })
                                }
                                onAmountChange={(value) =>
                                    patchSelectedLine({
                                        qpsAmount: value,
                                        qpsDiscountMode: 'AMOUNT'
                                    })
                                }
                                onToggleToRate={() =>
                                    patchSelectedLine({
                                        qpsRate: clampDiscountRate(
                                            resolveRateFromAmount(selectedLine.qpsAmount, selectedLine.quantityRateAmount)
                                        ),
                                        qpsDiscountMode: 'RATE'
                                    })
                                }
                                onToggleToAmount={() =>
                                    patchSelectedLine({
                                        qpsAmount: Math.max(0, Number(selectedLine.qpsAmountComputed ?? 0)),
                                        qpsDiscountMode: 'AMOUNT'
                                    })
                                }
                                onFocus={() => setActiveDiscountHintField('qps')}
                                onBlur={() => setActiveDiscountHintField((current) => (current === 'qps' ? null : current))}
                                onKeyDownFallback={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--discount-pro">
                            <DiscountSplitInput
                                rateLabel="Pro %"
                                mode={selectedLine.productDiscountMode}
                                rateValue={
                                    selectedLine.productDiscountMode === 'RATE'
                                        ? resolveDiscountInputValue('RATE', selectedLine.productDiscountRate, 0)
                                        : resolveRateFromAmount(selectedLine.productDiscountAmount, selectedLine.quantityRateAmount)
                                }
                                amountValue={
                                    selectedLine.productDiscountMode === 'AMOUNT'
                                        ? resolveDiscountInputValue('AMOUNT', 0, selectedLine.productDiscountAmount)
                                        : selectedLine.productDiscountAmountComputed
                                }
                                onRateChange={(value) =>
                                    patchSelectedLine({
                                        hasScheme: true,
                                        productDiscountRate: value,
                                        productDiscountMode: 'RATE'
                                    })
                                }
                                onAmountChange={(value) =>
                                    patchSelectedLine({
                                        hasScheme: true,
                                        productDiscountAmount: value,
                                        productDiscountMode: 'AMOUNT'
                                    })
                                }
                                onToggleToRate={() =>
                                    patchSelectedLine({
                                        hasScheme: true,
                                        productDiscountRate: clampDiscountRate(
                                            resolveRateFromAmount(selectedLine.productDiscountAmount, selectedLine.quantityRateAmount)
                                        ),
                                        productDiscountMode: 'RATE'
                                    })
                                }
                                onToggleToAmount={() =>
                                    patchSelectedLine({
                                        hasScheme: true,
                                        productDiscountAmount: Math.max(0, Number(selectedLine.productDiscountAmountComputed ?? 0)),
                                        productDiscountMode: 'AMOUNT'
                                    })
                                }
                                onFocus={() => setActiveDiscountHintField('pro')}
                                onBlur={() => setActiveDiscountHintField((current) => (current === 'pro' ? null : current))}
                                onKeyDownFallback={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--half invoice-line-editor__field--linebox invoice-line-editor__field--discount-cash">
                            <DiscountSplitInput
                                rateLabel="Cash %"
                                mode={selectedLine.cashDiscountMode}
                                rateValue={
                                    selectedLine.cashDiscountMode === 'RATE'
                                        ? resolveDiscountInputValue('RATE', selectedLine.cashDiscountRate, 0)
                                        : resolveRateFromAmount(selectedLine.cashDiscountAmount, selectedLine.lineAmount)
                                }
                                amountValue={
                                    selectedLine.cashDiscountMode === 'AMOUNT'
                                        ? resolveDiscountInputValue('AMOUNT', 0, selectedLine.cashDiscountAmount)
                                        : selectedLine.cashDiscountAmountComputed
                                }
                                onRateChange={(value) =>
                                    patchSelectedLine({
                                        cashDiscountRate: value,
                                        cashDiscountMode: 'RATE'
                                    })
                                }
                                onAmountChange={(value) =>
                                    patchSelectedLine({
                                        cashDiscountAmount: value,
                                        cashDiscountMode: 'AMOUNT'
                                    })
                                }
                                onToggleToRate={() =>
                                    patchSelectedLine({
                                        cashDiscountRate: clampDiscountRate(
                                            resolveRateFromAmount(selectedLine.cashDiscountAmount, selectedLine.lineAmount)
                                        ),
                                        cashDiscountMode: 'RATE'
                                    })
                                }
                                onToggleToAmount={() =>
                                    patchSelectedLine({
                                        cashDiscountAmount: Math.max(0, Number(selectedLine.cashDiscountAmountComputed ?? 0)),
                                        cashDiscountMode: 'AMOUNT'
                                    })
                                }
                                onFocus={() => setActiveDiscountHintField('cash')}
                                onBlur={() => setActiveDiscountHintField((current) => (current === 'cash' ? null : current))}
                                onKeyDownFallback={handleEnterNext}
                            />
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--readonly invoice-line-editor__field--readonly-taxable">
                            <label className="invoice-line-editor__label">Taxable Amt</label>
                            <div className="invoice-line-editor__readonly">
                                {formatAmount(placeOfSupply === 'other_state' ? selectedLine.taxableAmount3 : selectedLine.taxableAmount)}
                            </div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--tax invoice-line-editor__field--tax-primary">
                            <label className="invoice-line-editor__label">
                                {placeOfSupply === 'other_state' ? 'IGST Ledger' : 'SGST Ledger'}
                            </label>
                            <LedgerAutoComplete
                                variant="party"
                                value={placeOfSupply === 'other_state' ? selectedLine.taxLedger3Id : selectedLine.taxLedgerId}
                                options={taxLedgerPartyOptions}
                                onChange={(ledgerId) => {
                                    if (placeOfSupply === 'other_state') {
                                        patchSelectedLine({ taxLedger3Id: ledgerId });
                                        return;
                                    }
                                    if (ledgerId == null) {
                                        patchSelectedLine({
                                            taxLedgerId: null,
                                            taxLedger2Id: null
                                        });
                                        return;
                                    }
                                    const pairedCgstId = findPairedTaxLedgerId(ledgerId, 'cgst');
                                    patchSelectedLine({
                                        taxLedgerId: ledgerId,
                                        taxLedger2Id: pairedCgstId ?? selectedLine.taxLedger2Id ?? null
                                    });
                                }}
                                placeholder={placeOfSupply === 'other_state' ? 'Select IGST' : 'Select SGST'}
                                showClear
                                className="w-full invoice-line-editor__control"
                                onKeyDown={handleEnterNext}
                            />
                        </div>

                        {placeOfSupply === 'in_state' ? (
                            <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--tax invoice-line-editor__field--tax-secondary">
                                <label className="invoice-line-editor__label">CGST Ledger</label>
                                <LedgerAutoComplete
                                    variant="party"
                                    value={selectedLine.taxLedger2Id}
                                    options={taxLedgerPartyOptions}
                                    onChange={(taxLedger2Id) => {
                                        if (taxLedger2Id == null) {
                                            patchSelectedLine({
                                                taxLedger2Id: null,
                                                taxLedgerId: null
                                            });
                                            return;
                                        }
                                        const pairedSgstId = findPairedTaxLedgerId(taxLedger2Id, 'sgst');
                                        patchSelectedLine({
                                            taxLedger2Id,
                                            taxLedgerId: pairedSgstId ?? selectedLine.taxLedgerId ?? null
                                        });
                                    }}
                                    placeholder="Select CGST"
                                    showClear
                                    className="w-full invoice-line-editor__control"
                                    onKeyDown={handleEnterNext}
                                />
                            </div>
                        ) : null}

                        {showTextileJobworkFields ? (
                            <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--jobber">
                                <label className="invoice-line-editor__label">Line Jobber</label>
                                <LedgerAutoComplete
                                    variant="party"
                                    value={selectedLine.textileJobberLedgerId}
                                    options={jobberLedgerOptions}
                                    onChange={(textileJobberLedgerId) => patchSelectedLine({ textileJobberLedgerId })}
                                    placeholder="Select jobber"
                                    showClear
                                    className="w-full invoice-line-editor__control"
                                    onKeyDown={handleEnterNext}
                                />
                            </div>
                        ) : null}

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--readonly invoice-line-editor__field--readonly-tax-compact">
                            <label className="invoice-line-editor__label">Tax</label>
                            <div className="invoice-line-editor__split-caption" aria-hidden="true">
                                <span className="invoice-line-editor__split-caption-item">%</span>
                                <span className="invoice-line-editor__split-caption-item">Amt</span>
                            </div>
                            <div className="invoice-line-editor__split-entry invoice-line-editor__split-entry--readonly">
                                <div className="invoice-line-editor__split-readonly">
                                    {placeOfSupply === 'other_state'
                                        ? selectedLine.taxRate3.toFixed(2)
                                        : (selectedLine.taxRate + selectedLine.taxRate2).toFixed(2)}
                                </div>
                                <div className="invoice-line-editor__split-readonly invoice-line-editor__split-readonly--amount">
                                    {formatAmount(
                                        placeOfSupply === 'other_state'
                                            ? selectedLine.taxAmount3
                                            : selectedLine.taxAmount + selectedLine.taxAmount2
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--readonly invoice-line-editor__field--readonly-net">
                            <label className="invoice-line-editor__label">Net Amt</label>
                            <div className="invoice-line-editor__readonly">
                                {formatAmount(
                                    (placeOfSupply === 'other_state' ? selectedLine.taxableAmount3 : selectedLine.taxableAmount)
                                    + (
                                        placeOfSupply === 'other_state'
                                            ? selectedLine.taxAmount3
                                            : selectedLine.taxAmount + selectedLine.taxAmount2
                                    )
                                )}
                            </div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--readonly invoice-line-editor__field--readonly-qtyxrate">
                            <label className="invoice-line-editor__label">Qty x Rate</label>
                            <div className="invoice-line-editor__readonly">{formatAmount(selectedLine.quantityRateAmount)}</div>
                        </div>

                        <div className="app-entry-line-editor__field invoice-line-editor__field invoice-line-editor__field--actions-inline">
                            <div className="app-entry-line-editor__actions app-entry-line-editor__actions--compact app-entry-line-editor__actions--inline">
                                <Button
                                    label={isNewLineEntryMode ? 'Add Line' : 'Update Line'}
                                    icon="pi pi-check"
                                    className="app-action-compact app-action-compact--line"
                                    onClick={handleDoneEditing}
                                />
                                <Button
                                    label="Cancel"
                                    icon="pi pi-times"
                                    className="app-action-compact app-action-compact--line p-button-outlined"
                                    onClick={handleEditorCancel}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}


