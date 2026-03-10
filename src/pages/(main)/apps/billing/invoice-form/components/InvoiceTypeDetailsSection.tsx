import React, { useMemo } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import AppInput from '@/components/AppInput';
import type { ItemOption } from '@/components/ItemAutoComplete';
import type { InvoiceProduct, InvoiceProductAttributeOption, InvoiceTypeDetailDraft } from '../types';

type InvoiceTypeDetailsSectionProps = {
    lines: InvoiceTypeDetailDraft[];
    products: InvoiceProduct[];
    productOptions: ItemOption[];
    attributeOptionsByType: Record<number, InvoiceProductAttributeOption[]>;
    attributeTypeNameById?: Record<number, string>;
    attributeOptionsLoading?: boolean;
    disabled?: boolean;
    onAddLine: () => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceTypeDetailDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    scopedItemId?: number | null;
    scopedTmpTypeId?: number | null;
    scopedItemQuantity?: number | null;
    dialogVisible?: boolean;
};

const QTY_EPSILON = 0.0001;
const toPositiveId = (value: number | null | undefined) => {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.trunc(parsed);
};
const normalizeQty = (value: number | null | undefined) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.round(numeric * 1000) / 1000;
};
const formatQty = (value: number) => {
    if (Math.abs(value % 1) < QTY_EPSILON) return value.toFixed(0);
    return value.toFixed(3).replace(/\.?0+$/, '');
};

type TypeGridRow = {
    typeDetailId: number;
    detail: string;
    quantity: number;
    orderNo: number;
    lineKeys: string[];
};

export function InvoiceTypeDetailsSection(props: InvoiceTypeDetailsSectionProps) {
    const {
        lines,
        products,
        attributeOptionsByType,
        attributeTypeNameById = {},
        attributeOptionsLoading = false,
        disabled = false,
        onLineChange,
        scopedItemId = null,
        scopedTmpTypeId = null,
        scopedItemQuantity = null,
        dialogVisible = false
    } = props;

    const productById = useMemo(() => {
        const map = new Map<number, InvoiceProduct>();
        products.forEach((product) => {
            map.set(product.productId, product);
        });
        return map;
    }, [products]);

    const normalizedScopedItemId = toPositiveId(scopedItemId);
    const normalizedScopedTmpTypeId = toPositiveId(scopedTmpTypeId);

    const scopedLines = useMemo(() => {
        if (normalizedScopedItemId == null) return [];
        return lines.filter((line) => {
            const lineItemId = toPositiveId(line.itemId);
            if (lineItemId == null || lineItemId !== normalizedScopedItemId) return false;
            const lineTmpTypeId = toPositiveId(line.tmpTypeId);
            if (normalizedScopedTmpTypeId == null) return true;
            return lineTmpTypeId == null || lineTmpTypeId === normalizedScopedTmpTypeId;
        });
    }, [lines, normalizedScopedItemId, normalizedScopedTmpTypeId]);

    const selectedProduct = normalizedScopedItemId != null ? productById.get(normalizedScopedItemId) ?? null : null;
    const selectedAttributeTypeId = selectedProduct?.productAttributeTypeId ?? null;
    const selectedAttributeTypeName = selectedAttributeTypeId != null ? (attributeTypeNameById[selectedAttributeTypeId] ?? '').trim() : '';
    const attributeTypeDisplayText = selectedAttributeTypeName || '-';
    const itemDisplayText = selectedProduct?.name?.trim() || 'Select item from line editor';
    const attributeOptionMetaById = useMemo(() => {
        const options = selectedAttributeTypeId != null ? attributeOptionsByType[selectedAttributeTypeId] ?? [] : [];
        const map = new Map<number, { detail: string; orderNo: number }>();
        options.forEach((option, index) => {
            const optionId = toPositiveId(option.productAttributeId);
            if (optionId == null) return;
            const detail = (option.detail ?? '').trim() || `Detail ${optionId}`;
            map.set(optionId, {
                detail,
                orderNo: index
            });
        });
        return map;
    }, [attributeOptionsByType, selectedAttributeTypeId]);

    const gridRows = useMemo<TypeGridRow[]>(() => {
        if (selectedProduct == null) return [];
        const lineKeysByType = new Map<number, string[]>();
        const quantityByType = new Map<number, number>();

        scopedLines.forEach((line) => {
            const typeDetailId = toPositiveId(line.typeDetailId);
            if (typeDetailId == null) return;
            const lineKeys = lineKeysByType.get(typeDetailId) ?? [];
            lineKeys.push(line.key);
            lineKeysByType.set(typeDetailId, lineKeys);
            quantityByType.set(typeDetailId, (quantityByType.get(typeDetailId) ?? 0) + normalizeQty(line.quantity));
        });

        const optionById = new Map<number, { detail: string; orderNo: number }>();
        selectedProduct.productAttributes.forEach((option) => {
            const optionId = toPositiveId(option.productAttributeId);
            if (optionId == null) return;
            const fallbackMeta = attributeOptionMetaById.get(optionId);
            optionById.set(optionId, {
                detail: option.detail?.trim() || fallbackMeta?.detail || `Detail ${optionId}`,
                orderNo:
                    option.orderNo != null && Number.isFinite(Number(option.orderNo))
                        ? Number(option.orderNo)
                        : fallbackMeta?.orderNo ?? Number.MAX_SAFE_INTEGER
            });
        });
        attributeOptionMetaById.forEach((meta, optionId) => {
            if (optionById.has(optionId)) return;
            optionById.set(optionId, {
                detail: meta.detail,
                orderNo: meta.orderNo
            });
        });
        quantityByType.forEach((_, optionId) => {
            if (optionById.has(optionId)) return;
            optionById.set(optionId, {
                detail: `Detail ${optionId}`,
                orderNo: Number.MAX_SAFE_INTEGER
            });
        });

        return Array.from(optionById.entries())
            .map(([typeDetailId, meta]) => ({
                typeDetailId,
                detail: meta.detail,
                quantity: normalizeQty(quantityByType.get(typeDetailId) ?? 0),
                orderNo: meta.orderNo,
                lineKeys: lineKeysByType.get(typeDetailId) ?? []
            }))
            .sort((left, right) => {
                if (left.orderNo !== right.orderNo) return left.orderNo - right.orderNo;
                return left.detail.localeCompare(right.detail, undefined, { sensitivity: 'base' });
            });
    }, [attributeOptionMetaById, scopedLines, selectedProduct]);

    const totalEnteredQty = useMemo(
        () => gridRows.reduce((sum, row) => sum + normalizeQty(row.quantity), 0),
        [gridRows]
    );
    const lineQtyLimit = useMemo(() => {
        const parsed = Number(scopedItemQuantity ?? NaN);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return normalizeQty(parsed);
    }, [scopedItemQuantity]);
    const firstEditableRow = useMemo(
        () => gridRows.find((row) => row.lineKeys.length > 0) ?? gridRows[0] ?? null,
        [gridRows]
    );
    const firstEditableQtyInputId = firstEditableRow ? `invoice-type-detail-qty-${firstEditableRow.typeDetailId}` : null;
    const qtyCompleted =
        lineQtyLimit != null && Math.abs(normalizeQty(totalEnteredQty) - normalizeQty(lineQtyLimit)) <= QTY_EPSILON;
    const qtyEditedRef = React.useRef(false);
    const openedRef = React.useRef(false);

    const focusDialogCloseButton = React.useCallback(() => {
        if (typeof document === 'undefined') return;
        const dialogRoot = document.querySelector<HTMLElement>('.invoice-type-details-dialog');
        if (!dialogRoot) return;
        const closeButton = dialogRoot.querySelector<HTMLButtonElement>(
            '.p-dialog-header .p-dialog-header-close, .p-dialog-header .p-dialog-header-icon'
        );
        closeButton?.focus();
    }, []);

    React.useEffect(() => {
        if (!dialogVisible) {
            openedRef.current = false;
            qtyEditedRef.current = false;
            return;
        }
        if (openedRef.current) return;
        openedRef.current = true;
        if (!firstEditableQtyInputId) return;
        const timer = window.setTimeout(() => {
            const input = document.getElementById(firstEditableQtyInputId) as HTMLInputElement | null;
            input?.focus();
            input?.select?.();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [dialogVisible, firstEditableQtyInputId]);

    React.useEffect(() => {
        if (!dialogVisible || !qtyCompleted || !qtyEditedRef.current) return;
        const timer = window.setTimeout(() => {
            focusDialogCloseButton();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [dialogVisible, focusDialogCloseButton, qtyCompleted]);

    const handleQtyChange = (row: TypeGridRow, nextRawQty: number | null) => {
        qtyEditedRef.current = true;
        const nextInputQty = normalizeQty(nextRawQty ?? 0);
        const remainingQty = lineQtyLimit != null
            ? Math.max(0, normalizeQty(lineQtyLimit - (totalEnteredQty - row.quantity)))
            : null;
        const nextQty = remainingQty != null ? Math.min(nextInputQty, remainingQty) : nextInputQty;
        if (row.lineKeys.length === 0) return;

        const [firstLineKey, ...duplicateLineKeys] = row.lineKeys;
        onLineChange(firstLineKey, {
            itemId: normalizedScopedItemId,
            tmpTypeId: normalizedScopedTmpTypeId,
            typeDetailId: row.typeDetailId,
            quantity: nextQty
        });
        duplicateLineKeys.forEach((lineKey) => {
            onLineChange(lineKey, { quantity: 0 });
        });
    };

    return (
        <div className="app-entry-section app-entry-section--details invoice-type-details-editor">
            <div className="invoice-type-details-editor__meta">
                <div className="invoice-type-details-editor__meta-card invoice-type-details-editor__meta-card--item">
                    <small className="invoice-type-details-editor__meta-label">Item</small>
                    <span className="invoice-type-details-editor__meta-value" title={itemDisplayText}>
                        {itemDisplayText}
                    </span>
                </div>
                <div className="invoice-type-details-editor__meta-card invoice-type-details-editor__meta-card--qty">
                    <small className="invoice-type-details-editor__meta-label">Qty</small>
                    <span className="invoice-type-details-editor__meta-value invoice-type-details-editor__meta-value--qty">
                        {lineQtyLimit != null ? formatQty(lineQtyLimit) : '-'}
                    </span>
                </div>
                <div className="invoice-type-details-editor__meta-card invoice-type-details-editor__meta-card--type">
                    <small className="invoice-type-details-editor__meta-label">Attribute Type</small>
                    <span className="invoice-type-details-editor__meta-value" title={attributeTypeDisplayText}>
                        {attributeTypeDisplayText}
                    </span>
                </div>
            </div>

            <div className="invoice-type-details-editor__status-row">
                {lineQtyLimit != null ? (
                    <small className="invoice-type-details-editor__hint">
                        Total Qty cannot exceed line Qty ({formatQty(lineQtyLimit)}).
                    </small>
                ) : (
                    <span />
                )}
                <small className="invoice-type-details-editor__count">Types: {gridRows.length}</small>
            </div>

            {selectedProduct == null ? (
                <Message severity="info" text="Open Type Details from a selected line item to edit attributes." />
            ) : (
                <DataTable
                    value={gridRows}
                    dataKey="typeDetailId"
                    className="invoice-form-lines-table invoice-type-details-grid"
                    responsiveLayout="scroll"
                    size="small"
                    showGridlines
                    scrollable
                    scrollHeight="24rem"
                    loading={attributeOptionsLoading && gridRows.length === 0}
                    emptyMessage="No attributes found for this item."
                >
                    <Column
                        header="Type"
                        body={(row: TypeGridRow) => <span className="invoice-type-details-grid__type">{row.detail}</span>}
                        footer={<span className="invoice-type-details-grid__footer-label">Total Qty</span>}
                    />
                    <Column
                        header="Qty"
                        body={(row: TypeGridRow) => (
                            <AppInput
                                inputType="number"
                                inputId={`invoice-type-detail-qty-${row.typeDetailId}`}
                                value={row.quantity}
                                onValueChange={(event) => handleQtyChange(row, event.value)}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Escape') return;
                                    event.preventDefault();
                                    focusDialogCloseButton();
                                }}
                                min={0}
                                maxFractionDigits={3}
                                useGrouping={false}
                                disabled={disabled || row.lineKeys.length === 0}
                                className="invoice-type-details-grid__qty-control"
                                inputClassName="invoice-type-details-grid__qty-input"
                            />
                        )}
                        footer={(
                            <AppInput
                                inputType="number"
                                value={normalizeQty(totalEnteredQty)}
                                className="invoice-type-details-grid__qty-control invoice-type-details-grid__qty-control--summary"
                                inputClassName="invoice-type-details-grid__qty-input"
                                minFractionDigits={0}
                                maxFractionDigits={3}
                                useGrouping={false}
                                disabled
                            />
                        )}
                        bodyClassName="invoice-type-details-grid__qty-cell"
                        headerClassName="invoice-type-details-grid__qty-cell"
                        footerClassName="invoice-type-details-grid__qty-cell"
                    />
                </DataTable>
            )}

            {lineQtyLimit != null && totalEnteredQty > lineQtyLimit + QTY_EPSILON ? (
                <Message
                    severity="error"
                    text={`Total Qty (${formatQty(totalEnteredQty)}) exceeds line Qty (${formatQty(lineQtyLimit)}).`}
                />
            ) : null}
        </div>
    );
}
