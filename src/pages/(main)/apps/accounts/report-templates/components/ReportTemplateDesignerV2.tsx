'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import {
    REPORT_SECTION_KEYS,
    cloneReportItem,
    createReportFieldItem,
    createReportImageItem,
    createReportLineItem,
    createReportListItem,
    createReportRectangleItem,
    createReportTableItem,
    createReportTextItem,
    type ReportDefinition,
    type ReportGroupDefinition,
    type ReportImageFit,
    type ReportItem,
    type ReportListDetailItem,
    type ReportSectionKey,
    type ReportSortDefinition,
    type ReportTableColumn,
    type ReportTextAlign
} from '@/lib/reportDefinition';

type DesignerFieldOption = {
    key: string;
    label: string;
    dataType?: string;
};

type ExpressionTargetScope = 'item' | 'listChild';
type ExpressionTargetProperty =
    | 'expression'
    | 'hiddenExpression'
    | 'borderColorExpression'
    | 'fillColorExpression'
    | 'textColorExpression'
    | 'fontWeightExpression';

type ExpressionTarget = {
    scope: ExpressionTargetScope;
    property: ExpressionTargetProperty;
};

type ReportTemplateDesignerV2Props = {
    value: ReportDefinition;
    onChange: (next: ReportDefinition) => void;
    pageSize: 'A4' | 'A5' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    marginTopMm: number;
    marginRightMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    fields: DesignerFieldOption[];
};

const PAGE_DIMENSIONS_MM: Record<'A4' | 'A5' | 'Letter' | 'Legal', { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    Letter: { width: 216, height: 279 },
    Legal: { width: 216, height: 356 }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundMm = (value: number) => Math.round(value * 100) / 100;

const BOOLEAN_OPTIONS = [
    { label: 'Yes', value: true },
    { label: 'No', value: false }
];

const ALIGN_OPTIONS: Array<{ label: string; value: ReportTextAlign }> = [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' }
];

const IMAGE_FIT_OPTIONS: Array<{ label: string; value: ReportImageFit }> = [
    { label: 'Contain', value: 'contain' },
    { label: 'Cover', value: 'cover' },
    { label: 'Fill', value: 'fill' }
];

const SORT_OPTIONS = [
    { label: 'Ascending', value: 'asc' },
    { label: 'Descending', value: 'desc' }
] as const;

const buildFieldOptions = (fields: DesignerFieldOption[]) =>
    fields.map((field) => ({ label: `${field.label} (${field.key})`, value: field.key }));

const createPlaceholderGroup = (): ReportGroupDefinition => ({
    id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fieldKey: '',
    label: '',
    sortDirection: 'asc',
    showHeader: true,
    showSubtotal: true,
    subtotalLabel: 'Subtotal',
    pageBreakBefore: false,
    pageBreakAfter: false,
    keepTogether: false,
    keepWithNext: false
});

const createPlaceholderSort = (): ReportSortDefinition => ({
    id: `sort_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fieldKey: '',
    direction: 'asc'
});

const createPlaceholderColumn = (): ReportTableColumn => ({
    id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fieldKey: '',
    label: 'Column',
    widthMm: 28,
    align: 'left',
    includeTotal: false,
    repeatValue: true
});

const createListDetailItem = (type: 'text' | 'field' | 'image' | 'line' | 'rectangle', fieldKey = ''): ReportListDetailItem => {
    if (type === 'text') {
        return {
            ...createReportTextItem(),
            id: `detail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            xMm: 4,
            yMm: 3,
            widthMm: 42,
            heightMm: 7,
            text: 'Text'
        };
    }
    if (type === 'field') {
        return {
            ...createReportFieldItem(fieldKey),
            id: `detail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            xMm: 4,
            yMm: 3,
            widthMm: 42,
            heightMm: 7
        };
    }
    if (type === 'image') {
        return {
            ...createReportImageItem(),
            id: `detail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            xMm: 4,
            yMm: 3,
            widthMm: 16,
            heightMm: 12
        };
    }
    if (type === 'line') {
        return {
            ...createReportLineItem(),
            id: `detail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            xMm: 4,
            yMm: 10,
            widthMm: 50
        };
    }
    return {
        ...createReportRectangleItem(),
        id: `detail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        xMm: 4,
        yMm: 3,
        widthMm: 30,
        heightMm: 12
    };
};

const renderItemLabel = (item: ReportItem, fields: DesignerFieldOption[]) => {
    if (item.type === 'text') return item.expression ? `fx: ${item.expression}` : item.text || 'Text';
    if (item.type === 'field') {
        if (item.expression) return `fx: ${item.expression}`;
        const label = fields.find((field) => field.key === item.fieldKey)?.label ?? item.fieldKey;
        return `[${label || 'Field'}]`;
    }
    if (item.type === 'image') {
        if (item.sourceKind === 'field') {
            if (item.expression) return `[Image fx: ${item.expression}]`;
            const label = fields.find((field) => field.key === item.fieldKey)?.label ?? item.fieldKey;
            return `[Image: ${label || 'Field'}]`;
        }
        return item.sourceKind === 'company_logo' ? '[Company Logo]' : item.url || '[Image]';
    }
    if (item.type === 'line') return '';
    if (item.type === 'rectangle') return 'Rectangle';
    if (item.type === 'list') {
        const scopeText = item.sourcePath.trim() ? ` from ${item.sourcePath.trim()}` : '';
        return `List (${item.items.length} item${item.items.length === 1 ? '' : 's'})${scopeText}`;
    }
    return `Table (${item.columns.length} col${item.columns.length === 1 ? '' : 's'})`;
};

const EXPRESSION_PROPERTY_LABELS: Record<ExpressionTargetProperty, string> = {
    expression: 'Expression',
    hiddenExpression: 'Hidden Expression',
    borderColorExpression: 'Border Color Expression',
    fillColorExpression: 'Fill Color Expression',
    textColorExpression: 'Text Color Expression',
    fontWeightExpression: 'Font Weight Expression'
};

const readExpressionPropertyValue = (
    source: ReportItem | ReportListDetailItem | null,
    property: ExpressionTargetProperty
): string => {
    if (!source) return '';
    if (property === 'expression') {
        return 'expression' in source ? source.expression ?? '' : '';
    }
    return source[property] ?? '';
};

const renderSelectionGuides = (args: {
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    scale: number;
    color?: string;
}) => {
    const color = args.color ?? 'rgba(37,99,235,0.45)';
    const dashBorder = `1px dashed ${color}`;
    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: `${args.xMm * args.scale}px`,
                    top: 0,
                    bottom: 0,
                    borderLeft: dashBorder,
                    pointerEvents: 'none'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: `${(args.xMm + args.widthMm) * args.scale}px`,
                    top: 0,
                    bottom: 0,
                    borderLeft: dashBorder,
                    pointerEvents: 'none'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: `${args.yMm * args.scale}px`,
                    left: 0,
                    right: 0,
                    borderTop: dashBorder,
                    pointerEvents: 'none'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: `${(args.yMm + args.heightMm) * args.scale}px`,
                    left: 0,
                    right: 0,
                    borderTop: dashBorder,
                    pointerEvents: 'none'
                }}
            />
        </>
    );
};

export function ReportTemplateDesignerV2({
    value,
    onChange,
    pageSize,
    orientation,
    marginRightMm,
    marginLeftMm,
    fields
}: ReportTemplateDesignerV2Props) {
    const [activeSection, setActiveSection] = useState<ReportSectionKey>('body');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [selectedListChildId, setSelectedListChildId] = useState<string | null>(null);
    const [activeExpressionTarget, setActiveExpressionTarget] = useState<ExpressionTarget | null>(null);
    const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
    const [snapGridMm, setSnapGridMm] = useState(2);
    const dragStateRef = useRef<{
        itemId: string;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
    } | null>(null);
    const resizeStateRef = useRef<{
        itemId: string;
        startClientX: number;
        startClientY: number;
        startWidth: number;
        startHeight: number;
    } | null>(null);
    const detailDragStateRef = useRef<{
        itemId: string;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
    } | null>(null);
    const detailResizeStateRef = useRef<{
        itemId: string;
        startClientX: number;
        startClientY: number;
        startWidth: number;
        startHeight: number;
    } | null>(null);

    const fieldOptions = useMemo(() => buildFieldOptions(fields), [fields]);
    const pageDimensionsMm = useMemo(() => {
        const base = PAGE_DIMENSIONS_MM[pageSize];
        return orientation === 'landscape' ? { width: base.height, height: base.width } : { width: base.width, height: base.height };
    }, [orientation, pageSize]);

    const contentWidthMm = Math.max(40, pageDimensionsMm.width - clamp(marginLeftMm, 0, 50) - clamp(marginRightMm, 0, 50));
    const scale = useMemo(() => clamp(760 / contentWidthMm, 1.6, 3.2), [contentWidthMm]);
    const canvasWidthPx = contentWidthMm * scale;
    const activeSectionValue = value.sections[activeSection];
    const canvasHeightPx = Math.max(140, activeSectionValue.heightMm * scale);
    const selectedItem = useMemo(
        () => activeSectionValue.items.find((item) => item.id === selectedItemId) ?? null,
        [activeSectionValue.items, selectedItemId]
    );
    const selectedListChild = useMemo(() => {
        if (!selectedItem || selectedItem.type !== 'list') return null;
        return selectedItem.items.find((item) => item.id === selectedListChildId) ?? null;
    }, [selectedItem, selectedListChildId]);
    const datasetOptions = useMemo(
        () => value.datasets.map((dataset) => ({ label: dataset.label || dataset.key, value: dataset.key })),
        [value.datasets]
    );
    const detailCanvasScale = useMemo(() => {
        if (!selectedItem || selectedItem.type !== 'list') return 3;
        return clamp(320 / Math.max(60, selectedItem.widthMm), 2, 4);
    }, [selectedItem]);
    const snapMm = useCallback(
        (value: number, bypassSnap = false) => {
            const rounded = roundMm(value);
            if (!snapToGridEnabled || bypassSnap) return rounded;
            const gridSizeMm = clamp(snapGridMm || 0, 0.5, 20);
            return roundMm(Math.round(rounded / gridSizeMm) * gridSizeMm);
        },
        [snapGridMm, snapToGridEnabled]
    );

    useEffect(() => {
        if (!selectedItemId) return;
        if (activeSectionValue.items.some((item) => item.id === selectedItemId)) return;
        setSelectedItemId(null);
    }, [activeSectionValue.items, selectedItemId]);

    useEffect(() => {
        if (!selectedItem || selectedItem.type !== 'list') {
            setSelectedListChildId(null);
            return;
        }
        if (!selectedItem.items.length) {
            setSelectedListChildId(null);
            return;
        }
        if (selectedListChildId && selectedItem.items.some((item) => item.id === selectedListChildId)) {
            return;
        }
        setSelectedListChildId(selectedItem.items[0]?.id ?? null);
    }, [selectedItem, selectedListChildId]);

    useEffect(() => {
        if (!activeExpressionTarget) return;
        if (activeExpressionTarget.scope === 'item' && !selectedItem) {
            setActiveExpressionTarget(null);
            return;
        }
        if (activeExpressionTarget.scope === 'listChild' && !selectedListChild) {
            setActiveExpressionTarget(null);
        }
    }, [activeExpressionTarget, selectedItem, selectedListChild]);

    const patchDefinition = useCallback(
        (patcher: (current: ReportDefinition) => ReportDefinition) => {
            onChange(patcher(value));
        },
        [onChange, value]
    );

    const patchSectionItems = useCallback(
        (sectionKey: ReportSectionKey, nextItems: ReportItem[]) => {
            patchDefinition((current) => ({
                ...current,
                sections: {
                    ...current.sections,
                    [sectionKey]: {
                        ...current.sections[sectionKey],
                        items: nextItems
                    }
                }
            }));
        },
        [patchDefinition]
    );

    const patchItem = useCallback(
        (sectionKey: ReportSectionKey, itemId: string, patch: Partial<ReportItem>) => {
            patchSectionItems(
                sectionKey,
                value.sections[sectionKey].items.map((item) => (item.id === itemId ? ({ ...item, ...patch } as ReportItem) : item))
            );
        },
        [patchSectionItems, value.sections]
    );

    const patchListItems = useCallback(
        (itemId: string, nextItems: ReportListDetailItem[]) => {
            patchItem(activeSection, itemId, { items: nextItems } as Partial<ReportItem>);
        },
        [activeSection, patchItem]
    );

    const patchSelectedListChild = useCallback(
        (childId: string, patch: Partial<ReportListDetailItem>) => {
            if (!selectedItem || selectedItem.type !== 'list') return;
            patchListItems(
                selectedItem.id,
                selectedItem.items.map((detailItem) => (detailItem.id === childId ? ({ ...detailItem, ...patch } as ReportListDetailItem) : detailItem))
            );
        },
        [patchListItems, selectedItem]
    );

    const activeExpressionSource = useMemo(
        () => (activeExpressionTarget?.scope === 'listChild' ? selectedListChild : selectedItem),
        [activeExpressionTarget?.scope, selectedItem, selectedListChild]
    );

    const expressionSeedFieldKey = useMemo(() => {
        if (activeExpressionSource && 'fieldKey' in activeExpressionSource && activeExpressionSource.fieldKey.trim()) {
            return activeExpressionSource.fieldKey.trim();
        }
        return fields[0]?.key ?? 'fieldKey';
    }, [activeExpressionSource, fields]);

    const activeExpressionValue = useMemo(
        () => (activeExpressionTarget ? readExpressionPropertyValue(activeExpressionSource, activeExpressionTarget.property) : ''),
        [activeExpressionSource, activeExpressionTarget]
    );

    const activeExpressionLabel = useMemo(() => {
        if (!activeExpressionTarget) return '';
        const ownerLabel = activeExpressionTarget.scope === 'listChild' ? 'Detail Item' : 'Item';
        return `${ownerLabel} ${EXPRESSION_PROPERTY_LABELS[activeExpressionTarget.property]}`;
    }, [activeExpressionTarget]);

    const activeExpressionTemplates = useMemo(() => {
        if (!activeExpressionTarget) return [] as Array<{ label: string; value: string }>;
        const fieldKey = expressionSeedFieldKey;
        switch (activeExpressionTarget.property) {
            case 'hiddenExpression':
                return [
                    { label: 'Hide When Empty', value: `=eq(field("${fieldKey}"), "")` },
                    { label: 'Hide When Zero', value: `=eq(field("${fieldKey}"), 0)` },
                    { label: 'Hide When False', value: `=not(field("${fieldKey}"))` },
                    { label: 'Hide Cancelled', value: '=eq(field("isCancelledFlag"), 1)' }
                ];
            case 'borderColorExpression':
                return [
                    { label: 'Alert Border', value: `=if(gt(field("${fieldKey}"), 0), "#b91c1c", "#334155")` },
                    { label: 'Muted Border', value: `=if(eq(field("${fieldKey}"), 0), "#cbd5e1", "#334155")` }
                ];
            case 'fillColorExpression':
                return [
                    { label: 'Warning Fill', value: `=if(gt(field("${fieldKey}"), 0), "#fef3c7", "transparent")` },
                    { label: 'Cancelled Fill', value: '=if(eq(field("isCancelledFlag"), 1), "#fee2e2", "transparent")' }
                ];
            case 'textColorExpression':
                return [
                    { label: 'Alert Text', value: `=if(gt(field("${fieldKey}"), 0), "#b91c1c", "#111827")` },
                    { label: 'Muted Text', value: `=if(eq(field("${fieldKey}"), 0), "#94a3b8", "#111827")` }
                ];
            case 'fontWeightExpression':
                return [
                    { label: 'Bold When Positive', value: `=if(gt(field("${fieldKey}"), 0), "bold", "normal")` },
                    { label: 'Bold Cancelled', value: '=if(eq(field("isCancelledFlag"), 1), "bold", "normal")' }
                ];
            case 'expression':
            default:
                return [
                    { label: 'Field Value', value: `=field("${fieldKey}")` },
                    { label: 'Concat Label', value: `=concat("${fieldKey}: ", field("${fieldKey}"))` },
                    { label: 'Format Number', value: `=formatNumber(field("${fieldKey}"), 2)` },
                    { label: 'Format Date', value: `=formatDate(field("${fieldKey}"))` },
                    { label: 'Sum', value: `=sum("${fieldKey}")` },
                    { label: 'Row Number', value: '=rowNumber()' },
                    { label: 'Page Number', value: '=pageNumber()' },
                    { label: 'Total Pages', value: '=totalPages()' }
                ];
        }
    }, [activeExpressionTarget, expressionSeedFieldKey]);

    const patchActiveExpressionValue = useCallback(
        (nextValue: string) => {
            if (!activeExpressionTarget) return;
            if (activeExpressionTarget.scope === 'item') {
                if (!selectedItem) return;
                patchItem(activeSection, selectedItem.id, {
                    [activeExpressionTarget.property]: nextValue
                } as Partial<ReportItem>);
                return;
            }
            if (!selectedListChild) return;
            patchSelectedListChild(selectedListChild.id, {
                [activeExpressionTarget.property]: nextValue
            } as Partial<ReportListDetailItem>);
        },
        [activeExpressionTarget, activeSection, patchItem, patchSelectedListChild, selectedItem, selectedListChild]
    );

    const replaceActiveExpression = useCallback(
        (nextValue: string) => {
            patchActiveExpressionValue(nextValue);
        },
        [patchActiveExpressionValue]
    );

    const insertIntoActiveExpression = useCallback(
        (snippet: string) => {
            if (!activeExpressionTarget) return;
            const current = activeExpressionValue;
            const separator = current && !/[,(=\s]$/.test(current) ? ' ' : '';
            patchActiveExpressionValue(`${current}${separator}${snippet}`);
        },
        [activeExpressionTarget, activeExpressionValue, patchActiveExpressionValue]
    );

    const patchSectionHeight = useCallback(
        (sectionKey: ReportSectionKey, nextHeightMm: number) => {
            patchDefinition((current) => ({
                ...current,
                sections: {
                    ...current.sections,
                    [sectionKey]: {
                        ...current.sections[sectionKey],
                        heightMm: roundMm(clamp(nextHeightMm, 10, 400))
                    }
                }
            }));
        },
        [patchDefinition]
    );

    const addItem = useCallback(
        (type: ReportItem['type']) => {
            let created: ReportItem;
            if (type === 'text') {
                created = createReportTextItem();
            } else if (type === 'field') {
                created = createReportFieldItem(fields[0]?.key ?? '');
            } else if (type === 'image') {
                created = createReportImageItem();
            } else if (type === 'line') {
                created = createReportLineItem();
            } else if (type === 'list') {
                created = createReportListItem(fields.slice(0, 4).map((field) => field.key));
            } else if (type === 'rectangle') {
                created = createReportRectangleItem();
            } else {
                created = createReportTableItem(fields.slice(0, 6).map((field) => field.key));
            }
            const offset = value.sections[activeSection].items.length % 6;
            created = {
                ...created,
                xMm: snapMm(8 + offset * 3),
                yMm: snapMm(8 + offset * 3)
            } as ReportItem;
            patchSectionItems(activeSection, [...value.sections[activeSection].items, created]);
            setSelectedItemId(created.id);
        },
        [activeSection, fields, patchSectionItems, snapMm, value.sections]
    );

    const duplicateSelected = useCallback(() => {
        if (!selectedItem) return;
        const duplicated = cloneReportItem(selectedItem);
        patchSectionItems(activeSection, [...value.sections[activeSection].items, duplicated]);
        setSelectedItemId(duplicated.id);
    }, [activeSection, patchSectionItems, selectedItem, value.sections]);

    const deleteSelected = useCallback(() => {
        if (!selectedItem) return;
        patchSectionItems(
            activeSection,
            value.sections[activeSection].items.filter((item) => item.id !== selectedItem.id)
        );
        setSelectedItemId(null);
        setSelectedListChildId(null);
    }, [activeSection, patchSectionItems, selectedItem, value.sections]);

    const addListDetail = useCallback(
        (type: 'text' | 'field' | 'image' | 'line' | 'rectangle') => {
            if (!selectedItem || selectedItem.type !== 'list') return;
            const baseItem = createListDetailItem(type, fields[0]?.key ?? '');
            const created = {
                ...baseItem,
                xMm: snapMm(baseItem.xMm),
                yMm: snapMm(baseItem.yMm)
            } satisfies ReportListDetailItem;
            patchListItems(selectedItem.id, [...selectedItem.items, created]);
            setSelectedListChildId(created.id);
        },
        [fields, patchListItems, selectedItem, snapMm]
    );

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            const detailResize = detailResizeStateRef.current;
            if (detailResize && selectedItem && selectedItem.type === 'list') {
                const target = selectedItem.items.find((item) => item.id === detailResize.itemId);
                if (!target) return;
                const deltaXmm = (event.clientX - detailResize.startClientX) / detailCanvasScale;
                const deltaYmm = (event.clientY - detailResize.startClientY) / detailCanvasScale;
                const minWidth = target.type === 'line' ? 10 : 1;
                const minHeight = target.type === 'line' ? 1 : 1;
                const maxWidth = Math.max(minWidth, selectedItem.widthMm - target.xMm);
                const maxHeight = Math.max(minHeight, selectedItem.rowHeightMm - target.yMm);
                patchSelectedListChild(detailResize.itemId, {
                    widthMm: snapMm(clamp(detailResize.startWidth + deltaXmm, minWidth, maxWidth), event.altKey),
                    heightMm: snapMm(clamp(detailResize.startHeight + deltaYmm, minHeight, maxHeight), event.altKey)
                });
                return;
            }
            const detailDrag = detailDragStateRef.current;
            if (detailDrag && selectedItem && selectedItem.type === 'list') {
                const target = selectedItem.items.find((item) => item.id === detailDrag.itemId);
                if (!target) return;
                const deltaXmm = (event.clientX - detailDrag.startClientX) / detailCanvasScale;
                const deltaYmm = (event.clientY - detailDrag.startClientY) / detailCanvasScale;
                const maxX = Math.max(0, selectedItem.widthMm - target.widthMm);
                const maxY = Math.max(0, selectedItem.rowHeightMm - target.heightMm);
                patchSelectedListChild(detailDrag.itemId, {
                    xMm: snapMm(clamp(detailDrag.startX + deltaXmm, 0, maxX), event.altKey),
                    yMm: snapMm(clamp(detailDrag.startY + deltaYmm, 0, maxY), event.altKey)
                });
                return;
            }
            const resize = resizeStateRef.current;
            if (resize) {
                const target = value.sections[activeSection].items.find((item) => item.id === resize.itemId);
                if (!target) return;
                const deltaXmm = (event.clientX - resize.startClientX) / scale;
                const deltaYmm = (event.clientY - resize.startClientY) / scale;
                const minWidth = target.type === 'line' ? 10 : 1;
                const minHeight = target.type === 'line' ? 1 : 1;
                const maxWidth = Math.max(minWidth, contentWidthMm - target.xMm);
                const maxHeight = Math.max(minHeight, value.sections[activeSection].heightMm - target.yMm);
                patchItem(activeSection, resize.itemId, {
                    widthMm: snapMm(clamp(resize.startWidth + deltaXmm, minWidth, maxWidth), event.altKey),
                    heightMm: snapMm(clamp(resize.startHeight + deltaYmm, minHeight, maxHeight), event.altKey)
                });
                return;
            }
            const drag = dragStateRef.current;
            if (!drag) return;
            const target = value.sections[activeSection].items.find((item) => item.id === drag.itemId);
            if (!target) return;
            const deltaXmm = (event.clientX - drag.startClientX) / scale;
            const deltaYmm = (event.clientY - drag.startClientY) / scale;
            const maxX = Math.max(0, contentWidthMm - target.widthMm);
            const maxY = Math.max(0, value.sections[activeSection].heightMm - target.heightMm);
            patchItem(activeSection, drag.itemId, {
                xMm: snapMm(clamp(drag.startX + deltaXmm, 0, maxX), event.altKey),
                yMm: snapMm(clamp(drag.startY + deltaYmm, 0, maxY), event.altKey)
            });
        };
        const onMouseUp = () => {
            dragStateRef.current = null;
            resizeStateRef.current = null;
            detailDragStateRef.current = null;
            detailResizeStateRef.current = null;
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [activeSection, contentWidthMm, detailCanvasScale, patchItem, patchSelectedListChild, scale, selectedItem, snapMm, value.sections]);

    const beginDrag = useCallback((event: React.MouseEvent, item: ReportItem) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setSelectedItemId(item.id);
        dragStateRef.current = {
            itemId: item.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: item.xMm,
            startY: item.yMm
        };
    }, []);

    const beginResize = useCallback((event: React.MouseEvent, item: ReportItem) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        setSelectedItemId(item.id);
        resizeStateRef.current = {
            itemId: item.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startWidth: item.widthMm,
            startHeight: item.heightMm
        };
    }, []);

    const beginDetailDrag = useCallback((event: React.MouseEvent, item: ReportListDetailItem) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        setSelectedListChildId(item.id);
        detailDragStateRef.current = {
            itemId: item.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: item.xMm,
            startY: item.yMm
        };
    }, []);

    const beginDetailResize = useCallback((event: React.MouseEvent, item: ReportListDetailItem) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        setSelectedListChildId(item.id);
        detailResizeStateRef.current = {
            itemId: item.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startWidth: item.widthMm,
            startHeight: item.heightMm
        };
    }, []);

    const sectionTabs = useMemo(
        () =>
            REPORT_SECTION_KEYS.map((key) => ({
                key,
                label: value.sections[key].label
            })),
        [value.sections]
    );

    return (
        <div className="grid mt-2">
            <div className="col-12 xl:col-8">
                <div className="flex gap-2 flex-wrap mb-2">
                    {sectionTabs.map((section) => (
                        <Button
                            key={section.key}
                            label={section.label}
                            className={section.key === activeSection ? 'app-action-compact' : 'app-action-compact p-button-outlined'}
                            onClick={() => {
                                setActiveSection(section.key);
                                setSelectedItemId(null);
                                setSelectedListChildId(null);
                            }}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                    <Button label="Text" icon="pi pi-font" className="app-action-compact p-button-outlined" onClick={() => addItem('text')} />
                    <Button label="Field" icon="pi pi-tag" className="app-action-compact p-button-outlined" onClick={() => addItem('field')} />
                    <Button label="Image" icon="pi pi-image" className="app-action-compact p-button-outlined" onClick={() => addItem('image')} />
                    <Button label="Line" icon="pi pi-minus" className="app-action-compact p-button-outlined" onClick={() => addItem('line')} />
                    <Button label="Rectangle" icon="pi pi-stop" className="app-action-compact p-button-outlined" onClick={() => addItem('rectangle')} />
                    <Button label="Table" icon="pi pi-table" className="app-action-compact p-button-outlined" onClick={() => addItem('table')} />
                    <Button label="List" icon="pi pi-bars" className="app-action-compact p-button-outlined" onClick={() => addItem('list')} />
                    <Button label="Duplicate" icon="pi pi-copy" className="app-action-compact p-button-text" onClick={duplicateSelected} disabled={!selectedItem} />
                    <Button
                        label="Delete"
                        icon="pi pi-trash"
                        className="app-action-compact p-button-text p-button-danger"
                        onClick={deleteSelected}
                        disabled={!selectedItem}
                    />
                </div>

                <div
                    style={{
                        border: '1px solid #d9e2ef',
                        background: 'linear-gradient(160deg, #f7fafc 0%, #eef4fa 100%)',
                        borderRadius: '8px',
                        padding: '12px',
                        overflow: 'auto'
                    }}
                >
                    <div
                        style={{
                            width: `${canvasWidthPx}px`,
                            minHeight: `${canvasHeightPx}px`,
                            margin: '0 auto',
                            background: '#ffffff',
                            position: 'relative',
                            boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                            border: '1px solid #dbe4ef'
                        }}
                        onMouseDown={() => setSelectedItemId(null)}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
                                backgroundSize: `${Math.max(2, snapGridMm) * scale}px ${Math.max(2, snapGridMm) * scale}px`,
                                pointerEvents: 'none'
                            }}
                        />
                        {activeSectionValue.items.map((item) => {
                            const isSelected = item.id === selectedItemId;
                            const left = item.xMm * scale;
                            const top = item.yMm * scale;
                            const width = Math.max(8, item.widthMm * scale);
                            const height = Math.max(2, item.heightMm * scale);
                            const resizeHandleSizePx = 10;
                            const commonStyle: React.CSSProperties = {
                                position: 'absolute',
                                left,
                                top,
                                width,
                                minHeight: item.type === 'table' || item.type === 'list' ? undefined : height,
                                border: isSelected ? '1px solid #2563eb' : `${Math.max(0, item.borderWidth)}px solid ${item.borderColor}`,
                                background: item.type === 'line' ? item.borderColor : isSelected ? 'rgba(37,99,235,0.08)' : item.fillColor,
                                color: item.textColor,
                                cursor: 'move',
                                userSelect: 'none',
                                fontSize: `${item.fontSizePt}pt`,
                                fontWeight: item.fontWeight,
                                fontFamily: value.defaultFontFamily || 'Segoe UI, Arial, sans-serif',
                                textAlign: item.textAlign,
                                overflow: isSelected ? 'visible' : 'hidden',
                                whiteSpace: item.type === 'table' || item.type === 'list' ? 'normal' : 'nowrap',
                                textOverflow: 'ellipsis',
                                display: 'flex',
                                alignItems: item.type === 'table' || item.type === 'list' ? 'stretch' : 'center',
                                justifyContent:
                                    item.textAlign === 'center' ? 'center' : item.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                padding: item.type === 'line' ? 0 : '2px 4px'
                            };
                            if (item.type === 'line') {
                                commonStyle.border = 'none';
                                commonStyle.height = `${Math.max(1, height)}px`;
                            }
                            if (item.type === 'image') {
                                commonStyle.alignItems = 'center';
                                commonStyle.justifyContent = 'center';
                                commonStyle.background = isSelected ? 'rgba(37,99,235,0.08)' : '#f8fafc';
                            }
                            let content: React.ReactNode = renderItemLabel(item, fields);
                            if (item.type === 'table') {
                                content = (
                                    <div style={{ width: '100%' }}>
                                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{renderItemLabel(item, fields)}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Math.min(item.columns.length || 3, 4))}, minmax(0,1fr))`, gap: '4px' }}>
                                            {(item.columns.length > 0 ? item.columns : [createPlaceholderColumn(), createPlaceholderColumn(), createPlaceholderColumn()]).slice(0, 4).map((column) => (
                                                <div key={column.id} style={{ border: '1px solid #cbd5e1', padding: '2px 4px', background: '#f8fafc', fontSize: '8pt' }}>
                                                    {column.label || column.fieldKey || 'Column'}
                                                </div>
                                            ))}
                                        </div>
                                        {item.rowGroups.length > 0 ? (
                                            <div style={{ marginTop: '4px', fontSize: '8pt', color: '#475569' }}>
                                                Groups: {item.rowGroups.map((group) => group.label || group.fieldKey).join(', ')}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            }
                            if (item.type === 'list') {
                                const previewRows = [0, 1];
                                content = (
                                    <div style={{ width: '100%' }}>
                                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{renderItemLabel(item, fields)}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {previewRows.map((rowIndex) => (
                                                <div
                                                    key={rowIndex}
                                                    style={{
                                                        borderBottom: item.showRowDivider && rowIndex < previewRows.length - 1 ? '1px solid #cbd5e1' : 'none',
                                                        background: item.zebraStriping && rowIndex % 2 === 1 ? '#f8fafc' : 'transparent',
                                                        minHeight: `${Math.max(28, item.rowHeightMm * 1.6)}px`,
                                                        padding: '4px',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    {item.items.slice(0, 3).map((detailItem) => (
                                                        <div
                                                            key={detailItem.id}
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${detailItem.xMm * 1.2}px`,
                                                                top: `${detailItem.yMm * 1.2}px`,
                                                                fontSize: '8pt',
                                                                fontFamily: value.defaultFontFamily || 'Segoe UI, Arial, sans-serif',
                                                                color: '#334155'
                                                            }}
                                                        >
                                                            {detailItem.type === 'field'
                                                                ? `[${fields.find((field) => field.key === detailItem.fieldKey)?.label ?? detailItem.fieldKey ?? 'Field'}]`
                                                                : detailItem.type === 'text'
                                                                  ? detailItem.text
                                                                  : detailItem.type === 'image'
                                                                    ? detailItem.sourceKind === 'company_logo'
                                                                        ? '[Company Logo]'
                                                                        : detailItem.sourceKind === 'field'
                                                                          ? detailItem.expression
                                                                              ? `[Image fx: ${detailItem.expression}]`
                                                                              : `[Image: ${fields.find((field) => field.key === detailItem.fieldKey)?.label ?? detailItem.fieldKey ?? 'Field'}]`
                                                                          : '[Image]'
                                                                    : detailItem.type === 'line'
                                                                      ? '────'
                                                                      : '[Rect]'}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div
                                    key={item.id}
                                    style={commonStyle}
                                    onMouseDown={(event) => beginDrag(event, item)}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedItemId(item.id);
                                    }}
                                >
                                    {content}
                                    {isSelected ? (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                right: '-6px',
                                                bottom: '-6px',
                                                width: `${resizeHandleSizePx}px`,
                                                height: `${resizeHandleSizePx}px`,
                                                borderRadius: '2px',
                                                border: '1px solid #1d4ed8',
                                                background: '#ffffff',
                                                boxShadow: '0 1px 3px rgba(15,23,42,0.18)',
                                                cursor: 'nwse-resize',
                                                zIndex: 2
                                            }}
                                            onMouseDown={(event) => beginResize(event, item)}
                                        />
                                    ) : null}
                                </div>
                            );
                        })}
                        {selectedItem
                            ? renderSelectionGuides({
                                  xMm: selectedItem.xMm,
                                  yMm: selectedItem.yMm,
                                  widthMm: selectedItem.widthMm,
                                  heightMm: selectedItem.heightMm,
                                  scale
                              })
                            : null}
                    </div>
                </div>
            </div>

            <div className="col-12 xl:col-4">
                <div className="border-1 surface-border border-round p-3 mb-3">
                    <h4 className="m-0 mb-2">Section</h4>
                    <div className="grid">
                        <div className="col-12">
                            <label className="block text-600 mb-1">Report Font Family</label>
                            <AppInput
                                value={value.defaultFontFamily}
                                onChange={(event) =>
                                    patchDefinition((current) => ({
                                        ...current,
                                        defaultFontFamily: event.target.value
                                    }))
                                }
                                placeholder='Segoe UI, Arial, sans-serif'
                                style={{ width: '100%' }}
                            />
                            <small className="text-600">Use a CSS font-family value. Example: `"Courier New", Courier, monospace`.</small>
                        </div>
                        <div className="col-12">
                            <label className="block text-600 mb-1">Repeat Per Row</label>
                            <AppDropdown
                                value={value.repeatPerRow}
                                options={BOOLEAN_OPTIONS}
                                onChange={(event) =>
                                    patchDefinition((current) => ({
                                        ...current,
                                        repeatPerRow: event.value === true
                                    }))
                                }
                                style={{ width: '100%' }}
                            />
                            <small className="text-600">Use `Yes` for invoice/voucher-style one-document-per-row layouts.</small>
                        </div>
                        <div className="col-12">
                            <label className="block text-600 mb-1">Active Section</label>
                            <AppDropdown
                                value={activeSection}
                                options={sectionTabs.map((section) => ({ label: section.label, value: section.key }))}
                                onChange={(event) => {
                                    setActiveSection(event.value as ReportSectionKey);
                                    setSelectedItemId(null);
                                    setSelectedListChildId(null);
                                }}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="col-12">
                            <label className="block text-600 mb-1">Section Height (mm)</label>
                            <AppInput
                                inputType="number"
                                value={activeSectionValue.heightMm}
                                onValueChange={(event) => patchSectionHeight(activeSection, Number(event.value ?? activeSectionValue.heightMm))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-600 mb-1">Snap To Grid</label>
                            <AppDropdown
                                value={snapToGridEnabled}
                                options={BOOLEAN_OPTIONS}
                                onChange={(event) => setSnapToGridEnabled(event.value === true)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-600 mb-1">Grid Size (mm)</label>
                            <AppInput
                                inputType="number"
                                value={snapGridMm}
                                onValueChange={(event) => setSnapGridMm(roundMm(clamp(Number(event.value ?? snapGridMm), 0.5, 20)))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="col-12">
                            <small className="text-600">Hold `Alt` while dragging or resizing to bypass snap temporarily.</small>
                        </div>
                    </div>
                </div>

                <div className="border-1 surface-border border-round p-3">
                    <h4 className="m-0 mb-2">Item Properties</h4>
                    {!selectedItem ? (
                        <p className="m-0 text-600 text-sm">Select an item from the active section to edit it.</p>
                    ) : (
                        <div className="grid">
                            <div className="col-12">
                                <label className="block text-600 mb-1">Type</label>
                                <AppInput value={selectedItem.type} readOnly style={{ width: '100%' }} />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">X (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedItem.xMm}
                                    onValueChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, {
                                            xMm: roundMm(clamp(Number(event.value ?? 0), 0, Math.max(0, contentWidthMm - selectedItem.widthMm)))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Y (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedItem.yMm}
                                    onValueChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, {
                                            yMm: roundMm(clamp(Number(event.value ?? 0), 0, Math.max(0, activeSectionValue.heightMm - selectedItem.heightMm)))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Width (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedItem.widthMm}
                                    onValueChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, {
                                            widthMm: roundMm(clamp(Number(event.value ?? 1), 1, contentWidthMm))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Height (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedItem.heightMm}
                                    onValueChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, {
                                            heightMm: roundMm(clamp(Number(event.value ?? 1), 1, 400))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-12">
                                <label className="block text-600 mb-1">Hidden Expression (Optional)</label>
                                <AppInput
                                    value={selectedItem.hiddenExpression}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { hiddenExpression: event.target.value })
                                    }
                                    onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'hiddenExpression' })}
                                    placeholder='=eq(field("isCancelledFlag"), 1)'
                                    style={{ width: '100%' }}
                                />
                                <small className="text-600">Hide this item when the expression evaluates to true.</small>
                            </div>
                            <div className="col-4">
                                <label className="block text-600 mb-1">Page Break Before</label>
                                <AppDropdown
                                    value={selectedItem.pageBreakBefore}
                                    options={BOOLEAN_OPTIONS}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { pageBreakBefore: event.value === true })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-4">
                                <label className="block text-600 mb-1">Page Break After</label>
                                <AppDropdown
                                    value={selectedItem.pageBreakAfter}
                                    options={BOOLEAN_OPTIONS}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { pageBreakAfter: event.value === true })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-4">
                                <label className="block text-600 mb-1">Keep Together</label>
                                <AppDropdown
                                    value={selectedItem.keepTogether}
                                    options={BOOLEAN_OPTIONS}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { keepTogether: event.value === true })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {selectedItem.type === 'text' ? (
                                <>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Text</label>
                                        <AppInput
                                            value={selectedItem.text}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { text: event.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Expression (Optional)</label>
                                        <AppInput
                                            value={selectedItem.expression}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { expression: event.target.value })}
                                            onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'expression' })}
                                            placeholder='=concat("Invoice ", field("voucherNumber"))'
                                            style={{ width: '100%' }}
                                        />
                                        <small className="text-600">Expression overrides literal text when provided.</small>
                                    </div>
                                </>
                            ) : null}

                            {selectedItem.type === 'field' ? (
                                <>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Field</label>
                                        <AppDropdown
                                            value={selectedItem.fieldKey}
                                            options={fieldOptions}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { fieldKey: String(event.value ?? '') })}
                                            placeholder="Select field"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Fallback Text</label>
                                        <AppInput
                                            value={selectedItem.fallbackText}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { fallbackText: event.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Expression (Optional)</label>
                                        <AppInput
                                            value={selectedItem.expression}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { expression: event.target.value })}
                                            onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'expression' })}
                                            placeholder='=if(eq(field("isCancelledFlag"), 1), "Cancelled", "")'
                                            style={{ width: '100%' }}
                                        />
                                        <small className="text-600">Expression overrides field binding when provided.</small>
                                    </div>
                                </>
                            ) : null}

                            {selectedItem.type === 'text' || selectedItem.type === 'field' ? (
                                <>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Can Grow</label>
                                        <AppDropdown
                                            value={selectedItem.canGrow}
                                            options={BOOLEAN_OPTIONS}
                                            onChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, { canGrow: event.value === true })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Can Shrink</label>
                                        <AppDropdown
                                            value={selectedItem.canShrink}
                                            options={BOOLEAN_OPTIONS}
                                            onChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, { canShrink: event.value === true })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </>
                            ) : null}

                            {selectedItem.type === 'image' ? (
                                <>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Source</label>
                                        <AppDropdown
                                            value={selectedItem.sourceKind}
                                            options={[
                                                                        { label: 'URL', value: 'url' },
                                                { label: 'Company Logo', value: 'company_logo' },
                                                { label: 'Field / Expression', value: 'field' }
                                            ]}
                                            onChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, {
                                                    sourceKind:
                                                        event.value === 'company_logo'
                                                            ? 'company_logo'
                                                            : event.value === 'field'
                                                              ? 'field'
                                                              : 'url'
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Image URL</label>
                                        <AppInput
                                            value={selectedItem.url}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { url: event.target.value })}
                                            style={{ width: '100%' }}
                                            disabled={selectedItem.sourceKind !== 'url'}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Field</label>
                                        <AppDropdown
                                            value={selectedItem.fieldKey}
                                            options={fieldOptions}
                                            onChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, { fieldKey: String(event.value ?? '') })
                                            }
                                            disabled={selectedItem.sourceKind !== 'field'}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Expression (Optional)</label>
                                        <AppInput
                                            value={selectedItem.expression}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { expression: event.target.value })}
                                            onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'expression' })}
                                            disabled={selectedItem.sourceKind !== 'field'}
                                            placeholder='=field("signedQrCode")'
                                            style={{ width: '100%' }}
                                        />
                                        <small className="text-600">For `Field / Expression`, expression overrides the selected field.</small>
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Fit</label>
                                        <AppDropdown
                                            value={selectedItem.fit}
                                            options={IMAGE_FIT_OPTIONS}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { fit: event.value as ReportImageFit })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </>
                            ) : null}

                            {selectedItem.type === 'list' ? (
                                <>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Dataset</label>
                                        <AppDropdown
                                            value={selectedItem.datasetKey}
                                            options={datasetOptions}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { datasetKey: String(event.value ?? 'main') })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Source Path (Optional)</label>
                                        <AppInput
                                            value={selectedItem.sourcePath}
                                            onChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, { sourcePath: event.target.value })
                                            }
                                            placeholder="lines"
                                            style={{ width: '100%' }}
                                        />
                                        <small className="text-600">Leave blank to repeat dataset rows. Set `lines` to repeat child line items inside one invoice row.</small>
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Row Height (mm)</label>
                                        <AppInput
                                            inputType="number"
                                            value={selectedItem.rowHeightMm}
                                            onValueChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, {
                                                    rowHeightMm: roundMm(clamp(Number(event.value ?? 20), 8, 120))
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Gap (mm)</label>
                                        <AppInput
                                            inputType="number"
                                            value={selectedItem.gapMm}
                                            onValueChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, {
                                                    gapMm: roundMm(clamp(Number(event.value ?? 1), 0, 20))
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Row Divider</label>
                                        <AppDropdown
                                            value={selectedItem.showRowDivider}
                                            options={BOOLEAN_OPTIONS}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { showRowDivider: event.value === true })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Zebra</label>
                                        <AppDropdown
                                            value={selectedItem.zebraStriping}
                                            options={BOOLEAN_OPTIONS}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { zebraStriping: event.value === true })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </>
                            ) : null}

                            {selectedItem.type !== 'line' && selectedItem.type !== 'image' ? (
                                <>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Font Size (pt)</label>
                                        <AppInput
                                            inputType="number"
                                            value={selectedItem.fontSizePt}
                                            onValueChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, {
                                                    fontSizePt: clamp(Number(event.value ?? 10), 6, 28)
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Font Weight</label>
                                        <AppDropdown
                                            value={selectedItem.fontWeight}
                                            options={[
                                                { label: 'Normal', value: 'normal' },
                                                { label: 'Bold', value: 'bold' }
                                            ]}
                                            onChange={(event) =>
                                                patchItem(activeSection, selectedItem.id, {
                                                    fontWeight: event.value === 'bold' ? 'bold' : 'normal'
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Text Align</label>
                                        <AppDropdown
                                            value={selectedItem.textAlign}
                                            options={ALIGN_OPTIONS}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { textAlign: event.value as ReportTextAlign })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </>
                            ) : null}

                            <div className="col-6">
                                <label className="block text-600 mb-1">Border Width</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedItem.borderWidth}
                                    onValueChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, {
                                            borderWidth: clamp(Number(event.value ?? 0), 0, 4)
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Border Color</label>
                                <AppInput
                                    value={selectedItem.borderColor}
                                    onChange={(event) => patchItem(activeSection, selectedItem.id, { borderColor: event.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Fill Color</label>
                                <AppInput
                                    value={selectedItem.fillColor}
                                    onChange={(event) => patchItem(activeSection, selectedItem.id, { fillColor: event.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Text Color</label>
                                <AppInput
                                    value={selectedItem.textColor}
                                    onChange={(event) => patchItem(activeSection, selectedItem.id, { textColor: event.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-12">
                                <label className="block text-600 mb-1">Border Color Expression (Optional)</label>
                                <AppInput
                                    value={selectedItem.borderColorExpression}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { borderColorExpression: event.target.value })
                                    }
                                    onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'borderColorExpression' })}
                                    placeholder='=if(gt(field("dueAmount"), 0), "#b91c1c", "#334155")'
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-12">
                                <label className="block text-600 mb-1">Fill Color Expression (Optional)</label>
                                <AppInput
                                    value={selectedItem.fillColorExpression}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { fillColorExpression: event.target.value })
                                    }
                                    onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'fillColorExpression' })}
                                    placeholder='=if(eq(field("isCancelledFlag"), 1), "#fee2e2", "transparent")'
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-12">
                                <label className="block text-600 mb-1">Text Color Expression (Optional)</label>
                                <AppInput
                                    value={selectedItem.textColorExpression}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { textColorExpression: event.target.value })
                                    }
                                    onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'textColorExpression' })}
                                    placeholder='=if(gt(field("dueAmount"), 0), "#b91c1c", "#111827")'
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-12">
                                <label className="block text-600 mb-1">Font Weight Expression (Optional)</label>
                                <AppInput
                                    value={selectedItem.fontWeightExpression}
                                    onChange={(event) =>
                                        patchItem(activeSection, selectedItem.id, { fontWeightExpression: event.target.value })
                                    }
                                    onFocus={() => setActiveExpressionTarget({ scope: 'item', property: 'fontWeightExpression' })}
                                    placeholder='=if(gt(field("dueAmount"), 0), "bold", "normal")'
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {selectedItem.type === 'list' ? (
                                <>
                                    <div className="col-12">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-2">
                                            <label className="block text-600">Detail Row Layout</label>
                                            <div className="flex gap-1 flex-wrap">
                                                <Button
                                                    label="Text"
                                                    icon="pi pi-font"
                                                    className="app-action-compact p-button-outlined"
                                                    onClick={() => addListDetail('text')}
                                                />
                                                <Button
                                                    label="Field"
                                                    icon="pi pi-tag"
                                                    className="app-action-compact p-button-outlined"
                                                    onClick={() => addListDetail('field')}
                                                />
                                                <Button
                                                    label="Image"
                                                    icon="pi pi-image"
                                                    className="app-action-compact p-button-outlined"
                                                    onClick={() => addListDetail('image')}
                                                />
                                                <Button
                                                    label="Line"
                                                    icon="pi pi-minus"
                                                    className="app-action-compact p-button-outlined"
                                                    onClick={() => addListDetail('line')}
                                                />
                                                <Button
                                                    label="Rect"
                                                    icon="pi pi-stop"
                                                    className="app-action-compact p-button-outlined"
                                                    onClick={() => addListDetail('rectangle')}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                border: '1px solid #dbe4ef',
                                                borderRadius: '8px',
                                                background: '#f8fafc',
                                                padding: '10px',
                                                overflow: 'auto'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${selectedItem.widthMm * detailCanvasScale}px`,
                                                    minHeight: `${selectedItem.rowHeightMm * detailCanvasScale}px`,
                                                    background: '#ffffff',
                                                    position: 'relative',
                                                    border: '1px solid #cbd5e1',
                                                    margin: '0 auto',
                                                    backgroundImage:
                                                        'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
                                                    backgroundSize: `${Math.max(2, snapGridMm) * detailCanvasScale}px ${Math.max(2, snapGridMm) * detailCanvasScale}px`
                                                }}
                                                onMouseDown={() => setSelectedListChildId(null)}
                                            >
                                                {selectedItem.items.map((detailItem) => {
                                                    const isSelected = detailItem.id === selectedListChildId;
                                                    const resizeHandleSizePx = 10;
                                                    const previewStyle: React.CSSProperties = {
                                                        position: 'absolute',
                                                        left: detailItem.xMm * detailCanvasScale,
                                                        top: detailItem.yMm * detailCanvasScale,
                                                        width: Math.max(6, detailItem.widthMm * detailCanvasScale),
                                                        minHeight: detailItem.type === 'line' ? undefined : Math.max(2, detailItem.heightMm * detailCanvasScale),
                                                        border: isSelected
                                                            ? '1px solid #2563eb'
                                                            : `${Math.max(0, detailItem.borderWidth)}px solid ${detailItem.borderColor}`,
                                                        background:
                                                            detailItem.type === 'line'
                                                                ? detailItem.borderColor
                                                                : isSelected
                                                                  ? 'rgba(37,99,235,0.08)'
                                                                  : detailItem.fillColor,
                                                        color: detailItem.textColor,
                                                        fontSize: `${Math.max(8, detailItem.fontSizePt * 1.1)}px`,
                                                        fontWeight: detailItem.fontWeight,
                                                        fontFamily: value.defaultFontFamily || 'Segoe UI, Arial, sans-serif',
                                                        textAlign: detailItem.textAlign,
                                                        padding: detailItem.type === 'line' ? 0 : '2px 4px',
                                                        cursor: 'move',
                                                        overflow: isSelected ? 'visible' : 'hidden'
                                                    };
                                                    if (detailItem.type === 'line') {
                                                        previewStyle.border = 'none';
                                                        previewStyle.height = '1px';
                                                    }
                                                    return (
                                                        <div
                                                            key={detailItem.id}
                                                            style={previewStyle}
                                                            onMouseDown={(event) => beginDetailDrag(event, detailItem)}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setSelectedListChildId(detailItem.id);
                                                            }}
                                                        >
                                                            {detailItem.type === 'field'
                                                                ? `[${fields.find((field) => field.key === detailItem.fieldKey)?.label ?? detailItem.fieldKey ?? 'Field'}]`
                                                                : detailItem.type === 'text'
                                                                  ? detailItem.text
                                                                  : detailItem.type === 'image'
                                                                    ? detailItem.sourceKind === 'company_logo'
                                                                        ? '[Company Logo]'
                                                                        : detailItem.sourceKind === 'field'
                                                                          ? detailItem.expression
                                                                              ? `[Image fx: ${detailItem.expression}]`
                                                                              : `[Image: ${fields.find((field) => field.key === detailItem.fieldKey)?.label ?? detailItem.fieldKey ?? 'Field'}]`
                                                                          : '[Image]'
                                                                    : detailItem.type === 'line'
                                                                      ? ''
                                                                      : 'Rectangle'}
                                                            {isSelected ? (
                                                                <div
                                                                    style={{
                                                                        position: 'absolute',
                                                                        right: '-6px',
                                                                        bottom: '-6px',
                                                                        width: `${resizeHandleSizePx}px`,
                                                                        height: `${resizeHandleSizePx}px`,
                                                                        borderRadius: '2px',
                                                                        border: '1px solid #1d4ed8',
                                                                        background: '#ffffff',
                                                                        boxShadow: '0 1px 3px rgba(15,23,42,0.18)',
                                                                        cursor: 'nwse-resize',
                                                                        zIndex: 2
                                                                    }}
                                                                    onMouseDown={(event) => beginDetailResize(event, detailItem)}
                                                                />
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                                {selectedListChild
                                                    ? renderSelectionGuides({
                                                          xMm: selectedListChild.xMm,
                                                          yMm: selectedListChild.yMm,
                                                          widthMm: selectedListChild.widthMm,
                                                          heightMm: selectedListChild.heightMm,
                                                          scale: detailCanvasScale,
                                                          color: 'rgba(14,116,144,0.45)'
                                                      })
                                                    : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        {!selectedListChild ? (
                                            <p className="m-0 text-600 text-sm">Add a detail item, then select it to edit the repeated row layout.</p>
                                        ) : (
                                            <div className="border-1 surface-border border-round p-2">
                                                <div className="flex align-items-center justify-content-between gap-2 mb-2">
                                                    <strong>{selectedListChild.type}</strong>
                                                    <Button
                                                        icon="pi pi-trash"
                                                        className="app-action-compact p-button-text p-button-danger"
                                                        onClick={() => {
                                                            patchListItems(
                                                                selectedItem.id,
                                                                selectedItem.items.filter((detailItem) => detailItem.id !== selectedListChild.id)
                                                            );
                                                            setSelectedListChildId(null);
                                                        }}
                                                    />
                                                </div>
                                                <div className="grid">
                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">X (mm)</label>
                                                        <AppInput
                                                            inputType="number"
                                                            value={selectedListChild.xMm}
                                                            onValueChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    xMm: roundMm(
                                                                        clamp(
                                                                            Number(event.value ?? 0),
                                                                            0,
                                                                            Math.max(0, selectedItem.widthMm - selectedListChild.widthMm)
                                                                        )
                                                                    )
                                                                })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">Y (mm)</label>
                                                        <AppInput
                                                            inputType="number"
                                                            value={selectedListChild.yMm}
                                                            onValueChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    yMm: roundMm(
                                                                        clamp(
                                                                            Number(event.value ?? 0),
                                                                            0,
                                                                            Math.max(0, selectedItem.rowHeightMm - selectedListChild.heightMm)
                                                                        )
                                                                    )
                                                                })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">Width (mm)</label>
                                                        <AppInput
                                                            inputType="number"
                                                            value={selectedListChild.widthMm}
                                                            onValueChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    widthMm: roundMm(clamp(Number(event.value ?? 1), 1, selectedItem.widthMm))
                                                                })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">Height (mm)</label>
                                                        <AppInput
                                                            inputType="number"
                                                            value={selectedListChild.heightMm}
                                                            onValueChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    heightMm: roundMm(clamp(Number(event.value ?? 1), 1, selectedItem.rowHeightMm))
                                                                })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="block text-600 mb-1">Hidden Expression (Optional)</label>
                                                        <AppInput
                                                            value={selectedListChild.hiddenExpression}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    hiddenExpression: event.target.value
                                                                })
                                                            }
                                                            onFocus={() =>
                                                                setActiveExpressionTarget({ scope: 'listChild', property: 'hiddenExpression' })
                                                            }
                                                            placeholder='=eq(field("schemeQty"), 0)'
                                                            style={{ width: '100%' }}
                                                        />
                                                        <small className="text-600">Hide this detail item when the expression evaluates to true.</small>
                                                    </div>

                                                    {selectedListChild.type === 'text' ? (
                                                        <>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Text</label>
                                                                <AppInput
                                                                    value={selectedListChild.text}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, { text: event.target.value })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Expression (Optional)</label>
                                                                <AppInput
                                                                    value={selectedListChild.expression}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, { expression: event.target.value })
                                                                    }
                                                                    onFocus={() =>
                                                                        setActiveExpressionTarget({ scope: 'listChild', property: 'expression' })
                                                                    }
                                                                    placeholder='=concat(field("productName"), " / ", field("qty"))'
                                                                    style={{ width: '100%' }}
                                                                />
                                                                <small className="text-600">Expression overrides literal text when provided.</small>
                                                            </div>
                                                        </>
                                                    ) : null}

                                                    {selectedListChild.type === 'field' ? (
                                                        <>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Field</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.fieldKey}
                                                                    options={fieldOptions}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            fieldKey: String(event.value ?? '')
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Fallback Text</label>
                                                                <AppInput
                                                                    value={selectedListChild.fallbackText}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            fallbackText: event.target.value
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Expression (Optional)</label>
                                                                <AppInput
                                                                    value={selectedListChild.expression}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            expression: event.target.value
                                                                        })
                                                                    }
                                                                    onFocus={() =>
                                                                        setActiveExpressionTarget({ scope: 'listChild', property: 'expression' })
                                                                    }
                                                                    placeholder='=rowNumber()'
                                                                    style={{ width: '100%' }}
                                                                />
                                                                <small className="text-600">Expression overrides field binding when provided.</small>
                                                            </div>
                                                        </>
                                                    ) : null}

                                                    {selectedListChild.type === 'text' || selectedListChild.type === 'field' ? (
                                                        <>
                                                            <div className="col-6">
                                                                <label className="block text-600 mb-1">Can Grow</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.canGrow}
                                                                    options={BOOLEAN_OPTIONS}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            canGrow: event.value === true
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-6">
                                                                <label className="block text-600 mb-1">Can Shrink</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.canShrink}
                                                                    options={BOOLEAN_OPTIONS}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            canShrink: event.value === true
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : null}

                                                    {selectedListChild.type === 'image' ? (
                                                        <>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Source</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.sourceKind}
                                                                    options={[
                                                                        { label: 'URL', value: 'url' },
                                                                        { label: 'Company Logo', value: 'company_logo' },
                                                                        { label: 'Field / Expression', value: 'field' }
                                                                    ]}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            sourceKind:
                                                                                event.value === 'company_logo'
                                                                                    ? 'company_logo'
                                                                                    : event.value === 'field'
                                                                                      ? 'field'
                                                                                      : 'url'
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Image URL</label>
                                                                <AppInput
                                                                    value={selectedListChild.url}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, { url: event.target.value })
                                                                    }
                                                                    disabled={selectedListChild.sourceKind !== 'url'}
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Field</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.fieldKey}
                                                                    options={fieldOptions}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            fieldKey: String(event.value ?? '')
                                                                        })
                                                                    }
                                                                    disabled={selectedListChild.sourceKind !== 'field'}
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Expression (Optional)</label>
                                                                <AppInput
                                                                    value={selectedListChild.expression}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            expression: event.target.value
                                                                        })
                                                                    }
                                                                    onFocus={() =>
                                                                        setActiveExpressionTarget({ scope: 'listChild', property: 'expression' })
                                                                    }
                                                                    disabled={selectedListChild.sourceKind !== 'field'}
                                                                    placeholder='=field("signedQrCode")'
                                                                    style={{ width: '100%' }}
                                                                />
                                                                <small className="text-600">For `Field / Expression`, expression overrides the selected field.</small>
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Fit</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.fit}
                                                                    options={IMAGE_FIT_OPTIONS}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, { fit: event.value as ReportImageFit })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : null}

                                                    {selectedListChild.type !== 'line' && selectedListChild.type !== 'image' ? (
                                                        <>
                                                            <div className="col-6">
                                                                <label className="block text-600 mb-1">Font Size</label>
                                                                <AppInput
                                                                    inputType="number"
                                                                    value={selectedListChild.fontSizePt}
                                                                    onValueChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            fontSizePt: clamp(Number(event.value ?? 10), 6, 28)
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-6">
                                                                <label className="block text-600 mb-1">Weight</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.fontWeight}
                                                                    options={[
                                                                        { label: 'Normal', value: 'normal' },
                                                                        { label: 'Bold', value: 'bold' }
                                                                    ]}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            fontWeight: event.value === 'bold' ? 'bold' : 'normal'
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                            <div className="col-12">
                                                                <label className="block text-600 mb-1">Text Align</label>
                                                                <AppDropdown
                                                                    value={selectedListChild.textAlign}
                                                                    options={ALIGN_OPTIONS}
                                                                    onChange={(event) =>
                                                                        patchSelectedListChild(selectedListChild.id, {
                                                                            textAlign: event.value as ReportTextAlign
                                                                        })
                                                                    }
                                                                    style={{ width: '100%' }}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : null}

                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">Border Width</label>
                                                        <AppInput
                                                            inputType="number"
                                                            value={selectedListChild.borderWidth}
                                                            onValueChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    borderWidth: clamp(Number(event.value ?? 0), 0, 4)
                                                                })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">Border Color</label>
                                                        <AppInput
                                                            value={selectedListChild.borderColor}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, { borderColor: event.target.value })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">Fill Color</label>
                                                        <AppInput
                                                            value={selectedListChild.fillColor}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, { fillColor: event.target.value })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="block text-600 mb-1">Text Color</label>
                                                        <AppInput
                                                            value={selectedListChild.textColor}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, { textColor: event.target.value })
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="block text-600 mb-1">Border Color Expression (Optional)</label>
                                                        <AppInput
                                                            value={selectedListChild.borderColorExpression}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    borderColorExpression: event.target.value
                                                                })
                                                            }
                                                            onFocus={() =>
                                                                setActiveExpressionTarget({ scope: 'listChild', property: 'borderColorExpression' })
                                                            }
                                                            placeholder='=if(eq(field("schemeQty"), 0), "#cbd5e1", "#334155")'
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="block text-600 mb-1">Fill Color Expression (Optional)</label>
                                                        <AppInput
                                                            value={selectedListChild.fillColorExpression}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    fillColorExpression: event.target.value
                                                                })
                                                            }
                                                            onFocus={() =>
                                                                setActiveExpressionTarget({ scope: 'listChild', property: 'fillColorExpression' })
                                                            }
                                                            placeholder='=if(gt(field("free"), 0), "#fef3c7", "transparent")'
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="block text-600 mb-1">Text Color Expression (Optional)</label>
                                                        <AppInput
                                                            value={selectedListChild.textColorExpression}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    textColorExpression: event.target.value
                                                                })
                                                            }
                                                            onFocus={() =>
                                                                setActiveExpressionTarget({ scope: 'listChild', property: 'textColorExpression' })
                                                            }
                                                            placeholder='=if(gt(field("free"), 0), "#b45309", "#111827")'
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="block text-600 mb-1">Font Weight Expression (Optional)</label>
                                                        <AppInput
                                                            value={selectedListChild.fontWeightExpression}
                                                            onChange={(event) =>
                                                                patchSelectedListChild(selectedListChild.id, {
                                                                    fontWeightExpression: event.target.value
                                                                })
                                                            }
                                                            onFocus={() =>
                                                                setActiveExpressionTarget({ scope: 'listChild', property: 'fontWeightExpression' })
                                                            }
                                                            placeholder='=if(gt(field("free"), 0), "bold", "normal")'
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : null}

                            {selectedItem.type === 'table' ? (
                                <>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Header Row</label>
                                        <AppDropdown
                                            value={selectedItem.showHeader}
                                            options={BOOLEAN_OPTIONS}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { showHeader: event.value === true })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Grand Total</label>
                                        <AppDropdown
                                            value={selectedItem.showGrandTotal}
                                            options={BOOLEAN_OPTIONS}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { showGrandTotal: event.value === true })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Zebra Striping</label>
                                        <AppDropdown
                                            value={selectedItem.zebraStriping}
                                            options={BOOLEAN_OPTIONS}
                                            onChange={(event) => patchItem(activeSection, selectedItem.id, { zebraStriping: event.value === true })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-2">
                                            <label className="block text-600">Columns</label>
                                            <Button
                                                icon="pi pi-plus"
                                                label="Add"
                                                className="app-action-compact p-button-outlined"
                                                onClick={() =>
                                                    patchItem(activeSection, selectedItem.id, {
                                                        columns: [...selectedItem.columns, createPlaceholderColumn()]
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="flex flex-column gap-2">
                                            {selectedItem.columns.map((column) => (
                                                <div key={column.id} className="border-1 surface-border border-round p-2">
                                                    <div className="grid">
                                                        <div className="col-12">
                                                            <label className="block text-600 mb-1">Field</label>
                                                            <AppDropdown
                                                                value={column.fieldKey}
                                                                options={fieldOptions}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        columns: selectedItem.columns.map((entry) =>
                                                                            entry.id === column.id
                                                                                ? {
                                                                                      ...entry,
                                                                                      fieldKey: String(event.value ?? ''),
                                                                                      label:
                                                                                          entry.label === '' || entry.label === column.fieldKey
                                                                                              ? String(event.value ?? '')
                                                                                              : entry.label
                                                                                  }
                                                                                : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-12">
                                                            <label className="block text-600 mb-1">Label</label>
                                                            <AppInput
                                                                value={column.label}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        columns: selectedItem.columns.map((entry) =>
                                                                            entry.id === column.id ? { ...entry, label: event.target.value } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-3">
                                                            <label className="block text-600 mb-1">Width</label>
                                                            <AppInput
                                                                inputType="number"
                                                                value={column.widthMm}
                                                                onValueChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        columns: selectedItem.columns.map((entry) =>
                                                                            entry.id === column.id
                                                                                ? { ...entry, widthMm: clamp(Number(event.value ?? 28), 10, 120) }
                                                                                : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-3">
                                                            <label className="block text-600 mb-1">Align</label>
                                                            <AppDropdown
                                                                value={column.align}
                                                                options={ALIGN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        columns: selectedItem.columns.map((entry) =>
                                                                            entry.id === column.id ? { ...entry, align: event.value as ReportTextAlign } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-3">
                                                            <label className="block text-600 mb-1">Total</label>
                                                            <AppDropdown
                                                                value={column.includeTotal}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        columns: selectedItem.columns.map((entry) =>
                                                                            entry.id === column.id ? { ...entry, includeTotal: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-3">
                                                            <label className="block text-600 mb-1">Repeat Value / Merge</label>
                                                            <AppDropdown
                                                                value={column.repeatValue !== false}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        columns: selectedItem.columns.map((entry) =>
                                                                            entry.id === column.id ? { ...entry, repeatValue: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-12 flex justify-content-end">
                                                            <Button
                                                                icon="pi pi-trash"
                                                                className="app-action-compact p-button-text p-button-danger"
                                                                onClick={() =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        columns: selectedItem.columns.filter((entry) => entry.id !== column.id)
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-2">
                                            <label className="block text-600">Row Groups</label>
                                            <Button
                                                icon="pi pi-plus"
                                                label="Add"
                                                className="app-action-compact p-button-outlined"
                                                onClick={() =>
                                                    patchItem(activeSection, selectedItem.id, {
                                                        rowGroups: [...selectedItem.rowGroups, createPlaceholderGroup()]
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="flex flex-column gap-2">
                                            {selectedItem.rowGroups.map((group) => (
                                                <div key={group.id} className="border-1 surface-border border-round p-2">
                                                    <div className="grid">
                                                        <div className="col-12">
                                                            <label className="block text-600 mb-1">Group Field</label>
                                                            <AppDropdown
                                                                value={group.fieldKey}
                                                                options={fieldOptions}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, fieldKey: String(event.value ?? '') } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-12">
                                                            <label className="block text-600 mb-1">Label</label>
                                                            <AppInput
                                                                value={group.label}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, label: event.target.value } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="block text-600 mb-1">Sort</label>
                                                            <AppDropdown
                                                                value={group.sortDirection}
                                                                options={SORT_OPTIONS.map((option) => ({ ...option }))}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id
                                                                                ? { ...entry, sortDirection: event.value === 'desc' ? 'desc' : 'asc' }
                                                                                : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="block text-600 mb-1">Header</label>
                                                            <AppDropdown
                                                                value={group.showHeader}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, showHeader: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="block text-600 mb-1">Subtotal</label>
                                                            <AppDropdown
                                                                value={group.showSubtotal}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, showSubtotal: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="block text-600 mb-1">Break Before</label>
                                                            <AppDropdown
                                                                value={group.pageBreakBefore}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, pageBreakBefore: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="block text-600 mb-1">Break After</label>
                                                            <AppDropdown
                                                                value={group.pageBreakAfter}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, pageBreakAfter: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="block text-600 mb-1">Keep Group Together</label>
                                                            <AppDropdown
                                                                value={group.keepTogether}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, keepTogether: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="block text-600 mb-1">Keep Header With Next</label>
                                                            <AppDropdown
                                                                value={group.keepWithNext}
                                                                options={BOOLEAN_OPTIONS}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, keepWithNext: event.value === true } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-12">
                                                            <label className="block text-600 mb-1">Subtotal Label</label>
                                                            <AppInput
                                                                value={group.subtotalLabel}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.map((entry) =>
                                                                            entry.id === group.id ? { ...entry, subtotalLabel: event.target.value } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-12 flex justify-content-end">
                                                            <Button
                                                                icon="pi pi-trash"
                                                                className="app-action-compact p-button-text p-button-danger"
                                                                onClick={() =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        rowGroups: selectedItem.rowGroups.filter((entry) => entry.id !== group.id)
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-2">
                                            <label className="block text-600">Sorts</label>
                                            <Button
                                                icon="pi pi-plus"
                                                label="Add"
                                                className="app-action-compact p-button-outlined"
                                                onClick={() =>
                                                    patchItem(activeSection, selectedItem.id, {
                                                        sorts: [...selectedItem.sorts, createPlaceholderSort()]
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="flex flex-column gap-2">
                                            {selectedItem.sorts.map((sort) => (
                                                <div key={sort.id} className="border-1 surface-border border-round p-2">
                                                    <div className="grid">
                                                        <div className="col-8">
                                                            <label className="block text-600 mb-1">Field</label>
                                                            <AppDropdown
                                                                value={sort.fieldKey}
                                                                options={fieldOptions}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        sorts: selectedItem.sorts.map((entry) =>
                                                                            entry.id === sort.id ? { ...entry, fieldKey: String(event.value ?? '') } : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-4">
                                                            <label className="block text-600 mb-1">Direction</label>
                                                            <AppDropdown
                                                                value={sort.direction}
                                                                options={SORT_OPTIONS.map((option) => ({ ...option }))}
                                                                onChange={(event) =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        sorts: selectedItem.sorts.map((entry) =>
                                                                            entry.id === sort.id
                                                                                ? { ...entry, direction: event.value === 'desc' ? 'desc' : 'asc' }
                                                                                : entry
                                                                        )
                                                                    })
                                                                }
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div className="col-12 flex justify-content-end">
                                                            <Button
                                                                icon="pi pi-trash"
                                                                className="app-action-compact p-button-text p-button-danger"
                                                                onClick={() =>
                                                                    patchItem(activeSection, selectedItem.id, {
                                                                        sorts: selectedItem.sorts.filter((entry) => entry.id !== sort.id)
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            <div className="col-12">
                                <div className="border-1 surface-border border-round p-3 surface-50">
                                    <div className="flex align-items-center justify-content-between gap-2 mb-2">
                                        <div>
                                            <div className="text-900 font-medium">Expression Helper</div>
                                            <small className="text-600">
                                                {activeExpressionTarget
                                                    ? `Active target: ${activeExpressionLabel}`
                                                    : 'Click any expression input to insert fields or template formulas.'}
                                            </small>
                                        </div>
                                        {activeExpressionTarget ? (
                                            <Button
                                                label="Clear"
                                                icon="pi pi-times"
                                                className="app-action-compact p-button-text"
                                                onClick={() => setActiveExpressionTarget(null)}
                                            />
                                        ) : null}
                                    </div>
                                    {activeExpressionTarget ? (
                                        <div className="grid">
                                            <div className="col-12">
                                                <label className="block text-600 mb-1">Current Value</label>
                                                <AppInput value={activeExpressionValue} readOnly style={{ width: '100%' }} />
                                            </div>
                                            <div className="col-12">
                                                <label className="block text-600 mb-1">Templates</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {activeExpressionTemplates.map((template) => (
                                                        <Button
                                                            key={template.label}
                                                            type="button"
                                                            label={template.label}
                                                            className="app-action-compact p-button-outlined"
                                                            onClick={() => replaceActiveExpression(template.value)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <label className="block text-600 mb-1">Insert Field</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {fields.map((field) => (
                                                        <Button
                                                            key={field.key}
                                                            type="button"
                                                            label={field.label}
                                                            className="app-action-compact p-button-text"
                                                            onClick={() => insertIntoActiveExpression(`field("${field.key}")`)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <label className="block text-600 mb-1">Insert System Value</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {[
                                                        { label: 'Company Name', value: 'companyName()' },
                                                        { label: 'Company Address', value: 'companyAddress()' },
                                                        { label: 'Document Title', value: 'documentTitle()' },
                                                        { label: 'Subtitle', value: 'subtitle()' },
                                                        { label: 'Row Number', value: 'rowNumber()' },
                                                        { label: 'Page Number', value: 'pageNumber()' },
                                                        { label: 'Total Pages', value: 'totalPages()' }
                                                    ].map((entry) => (
                                                        <Button
                                                            key={entry.label}
                                                            type="button"
                                                            label={entry.label}
                                                            className="app-action-compact p-button-text"
                                                            onClick={() => insertIntoActiveExpression(entry.value)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
