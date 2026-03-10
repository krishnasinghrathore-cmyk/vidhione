'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';

export type ReportTemplateLayoutElementType = 'text' | 'field' | 'line' | 'box';

export type ReportTemplateLayoutElement = {
    id: string;
    type: ReportTemplateLayoutElementType;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    text?: string;
    fieldKey?: string;
    fontSizePt?: number;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    borderWidth?: number;
};

export type ReportTemplateLayout = {
    version: number;
    elements: ReportTemplateLayoutElement[];
};

type DesignerFieldOption = {
    key: string;
    label: string;
    dataType?: string;
};

type ReportTemplateCanvasDesignerProps = {
    value: ReportTemplateLayout;
    onChange: (next: ReportTemplateLayout) => void;
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

const nextElementId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createElement = (
    type: ReportTemplateLayoutElementType,
    fields: DesignerFieldOption[],
    offsetCount: number
): ReportTemplateLayoutElement => {
    const baseX = 10 + (offsetCount % 6) * 4;
    const baseY = 10 + (offsetCount % 6) * 4;
    if (type === 'text') {
        return {
            id: nextElementId(),
            type,
            xMm: baseX,
            yMm: baseY,
            widthMm: 60,
            heightMm: 8,
            text: 'Text',
            fontSizePt: 10,
            fontWeight: 'normal',
            textAlign: 'left',
            borderWidth: 0
        };
    }
    if (type === 'field') {
        return {
            id: nextElementId(),
            type,
            xMm: baseX,
            yMm: baseY,
            widthMm: 70,
            heightMm: 8,
            fieldKey: fields[0]?.key ?? '',
            fontSizePt: 10,
            fontWeight: 'normal',
            textAlign: 'left',
            borderWidth: 0
        };
    }
    if (type === 'line') {
        return {
            id: nextElementId(),
            type,
            xMm: baseX,
            yMm: baseY,
            widthMm: 80,
            heightMm: 1,
            borderWidth: 1
        };
    }
    return {
        id: nextElementId(),
        type,
        xMm: baseX,
        yMm: baseY,
        widthMm: 60,
        heightMm: 18,
        borderWidth: 1
    };
};

export function ReportTemplateCanvasDesigner({
    value,
    onChange,
    pageSize,
    orientation,
    marginTopMm,
    marginRightMm,
    marginBottomMm,
    marginLeftMm,
    fields
}: ReportTemplateCanvasDesignerProps) {
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const dragStateRef = useRef<{
        elementId: string;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
    } | null>(null);

    const pageDimensionsMm = useMemo(() => {
        const base = PAGE_DIMENSIONS_MM[pageSize];
        return orientation === 'landscape'
            ? { width: base.height, height: base.width }
            : { width: base.width, height: base.height };
    }, [orientation, pageSize]);

    const scale = useMemo(() => {
        const maxPreviewWidth = 760;
        return clamp(maxPreviewWidth / pageDimensionsMm.width, 1.8, 3.2);
    }, [pageDimensionsMm.width]);

    const pageWidthPx = pageDimensionsMm.width * scale;
    const pageHeightPx = pageDimensionsMm.height * scale;
    const marginGuide = useMemo(
        () => ({
            left: clamp(marginLeftMm, 0, 50) * scale,
            right: clamp(marginRightMm, 0, 50) * scale,
            top: clamp(marginTopMm, 0, 50) * scale,
            bottom: clamp(marginBottomMm, 0, 50) * scale
        }),
        [marginBottomMm, marginLeftMm, marginRightMm, marginTopMm, scale]
    );

    const selectedElement = useMemo(
        () => value.elements.find((element) => element.id === selectedElementId) ?? null,
        [selectedElementId, value.elements]
    );

    useEffect(() => {
        if (!selectedElementId) return;
        if (value.elements.some((element) => element.id === selectedElementId)) return;
        setSelectedElementId(null);
    }, [selectedElementId, value.elements]);

    const patchLayout = useCallback(
        (nextElements: ReportTemplateLayoutElement[]) => {
            onChange({
                version: value.version || 1,
                elements: nextElements
            });
        },
        [onChange, value.version]
    );

    const patchElement = useCallback(
        (elementId: string, patch: Partial<ReportTemplateLayoutElement>) => {
            const nextElements = value.elements.map((element) => (element.id === elementId ? { ...element, ...patch } : element));
            patchLayout(nextElements);
        },
        [patchLayout, value.elements]
    );

    const addElement = useCallback(
        (type: ReportTemplateLayoutElementType) => {
            const created = createElement(type, fields, value.elements.length);
            patchLayout([...value.elements, created]);
            setSelectedElementId(created.id);
        },
        [fields, patchLayout, value.elements]
    );

    const duplicateSelected = useCallback(() => {
        if (!selectedElement) return;
        const duplicated: ReportTemplateLayoutElement = {
            ...selectedElement,
            id: nextElementId(),
            xMm: roundMm(selectedElement.xMm + 3),
            yMm: roundMm(selectedElement.yMm + 3)
        };
        patchLayout([...value.elements, duplicated]);
        setSelectedElementId(duplicated.id);
    }, [patchLayout, selectedElement, value.elements]);

    const deleteSelected = useCallback(() => {
        if (!selectedElement) return;
        patchLayout(value.elements.filter((element) => element.id !== selectedElement.id));
        setSelectedElementId(null);
    }, [patchLayout, selectedElement, value.elements]);

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            const drag = dragStateRef.current;
            if (!drag) return;
            const deltaXmm = (event.clientX - drag.startClientX) / scale;
            const deltaYmm = (event.clientY - drag.startClientY) / scale;
            const target = value.elements.find((element) => element.id === drag.elementId);
            if (!target) return;
            const maxX = Math.max(0, pageDimensionsMm.width - target.widthMm);
            const maxY = Math.max(0, pageDimensionsMm.height - target.heightMm);
            patchElement(drag.elementId, {
                xMm: roundMm(clamp(drag.startX + deltaXmm, 0, maxX)),
                yMm: roundMm(clamp(drag.startY + deltaYmm, 0, maxY))
            });
        };
        const onMouseUp = () => {
            dragStateRef.current = null;
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [pageDimensionsMm.height, pageDimensionsMm.width, patchElement, scale, value.elements]);

    const beginDrag = useCallback(
        (event: React.MouseEvent, element: ReportTemplateLayoutElement) => {
            if (event.button !== 0) return;
            event.preventDefault();
            setSelectedElementId(element.id);
            dragStateRef.current = {
                elementId: element.id,
                startClientX: event.clientX,
                startClientY: event.clientY,
                startX: element.xMm,
                startY: element.yMm
            };
        },
        []
    );

    const fieldOptions = useMemo(
        () => fields.map((field) => ({ label: `${field.label} (${field.key})`, value: field.key })),
        [fields]
    );

    return (
        <div className="grid mt-2">
            <div className="col-12 xl:col-8">
                <div className="flex flex-wrap gap-2 mb-2">
                    <Button label="Text" icon="pi pi-font" className="app-action-compact p-button-outlined" onClick={() => addElement('text')} />
                    <Button label="Field" icon="pi pi-tag" className="app-action-compact p-button-outlined" onClick={() => addElement('field')} />
                    <Button label="Line" icon="pi pi-minus" className="app-action-compact p-button-outlined" onClick={() => addElement('line')} />
                    <Button label="Box" icon="pi pi-stop" className="app-action-compact p-button-outlined" onClick={() => addElement('box')} />
                    <Button
                        label="Duplicate"
                        icon="pi pi-copy"
                        className="app-action-compact p-button-text"
                        onClick={duplicateSelected}
                        disabled={!selectedElement}
                    />
                    <Button
                        label="Delete"
                        icon="pi pi-trash"
                        className="app-action-compact p-button-text p-button-danger"
                        onClick={deleteSelected}
                        disabled={!selectedElement}
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
                            width: `${pageWidthPx}px`,
                            height: `${pageHeightPx}px`,
                            margin: '0 auto',
                            background: '#ffffff',
                            position: 'relative',
                            boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                            border: '1px solid #dbe4ef'
                        }}
                        onMouseDown={() => setSelectedElementId(null)}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: `${marginGuide.left}px`,
                                top: `${marginGuide.top}px`,
                                width: `${Math.max(2, pageWidthPx - marginGuide.left - marginGuide.right)}px`,
                                height: `${Math.max(2, pageHeightPx - marginGuide.top - marginGuide.bottom)}px`,
                                border: '1px dashed #9fb3c8',
                                pointerEvents: 'none'
                            }}
                        />

                        {value.elements.map((element) => {
                            const isSelected = element.id === selectedElementId;
                            const left = element.xMm * scale;
                            const top = element.yMm * scale;
                            const width = Math.max(4, element.widthMm * scale);
                            const height = Math.max(2, element.heightMm * scale);
                            const baseStyle: React.CSSProperties = {
                                position: 'absolute',
                                left,
                                top,
                                width,
                                height,
                                border: isSelected ? '1px solid #2563eb' : '1px solid transparent',
                                background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
                                cursor: 'move',
                                userSelect: 'none',
                                fontSize: `${element.fontSizePt ?? 10}pt`,
                                fontWeight: element.fontWeight ?? 'normal',
                                textAlign: (element.textAlign as React.CSSProperties['textAlign']) ?? 'left',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent:
                                    element.textAlign === 'center'
                                        ? 'center'
                                        : element.textAlign === 'right'
                                          ? 'flex-end'
                                          : 'flex-start',
                                padding: element.type === 'line' ? 0 : '1px 3px'
                            };

                            const borderWidth = clamp(Number(element.borderWidth ?? 0), 0, 3);
                            if (element.type === 'box') {
                                baseStyle.border = `${borderWidth || 1}px solid ${isSelected ? '#2563eb' : '#334155'}`;
                                baseStyle.background = isSelected ? 'rgba(37,99,235,0.06)' : 'transparent';
                            }
                            if (element.type === 'line') {
                                baseStyle.border = 'none';
                                baseStyle.background = '#334155';
                                baseStyle.height = `${Math.max(1, height)}px`;
                            }

                            const fieldLabel = fields.find((field) => field.key === element.fieldKey)?.label ?? element.fieldKey ?? '';
                            const content =
                                element.type === 'text'
                                    ? element.text || 'Text'
                                    : element.type === 'field'
                                      ? `[${fieldLabel || 'field'}]`
                                      : element.type === 'line'
                                        ? ''
                                        : '';

                            return (
                                <div
                                    key={element.id}
                                    style={baseStyle}
                                    onMouseDown={(event) => beginDrag(event, element)}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedElementId(element.id);
                                    }}
                                >
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="col-12 xl:col-4">
                <div className="border-1 surface-border border-round p-3">
                    <h4 className="m-0 mb-2">Element Properties</h4>
                    {!selectedElement ? (
                        <p className="m-0 text-600 text-sm">Select an element from the white page to edit properties.</p>
                    ) : (
                        <div className="grid">
                            <div className="col-12">
                                <label className="block text-600 mb-1">Type</label>
                                <AppInput value={selectedElement.type} readOnly style={{ width: '100%' }} />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">X (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedElement.xMm}
                                    onValueChange={(event) =>
                                        patchElement(selectedElement.id, {
                                            xMm: roundMm(clamp(Number(event.value ?? 0), 0, Math.max(0, pageDimensionsMm.width - selectedElement.widthMm)))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Y (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedElement.yMm}
                                    onValueChange={(event) =>
                                        patchElement(selectedElement.id, {
                                            yMm: roundMm(clamp(Number(event.value ?? 0), 0, Math.max(0, pageDimensionsMm.height - selectedElement.heightMm)))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Width (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedElement.widthMm}
                                    onValueChange={(event) =>
                                        patchElement(selectedElement.id, {
                                            widthMm: roundMm(clamp(Number(event.value ?? 1), 1, pageDimensionsMm.width))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-6">
                                <label className="block text-600 mb-1">Height (mm)</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedElement.heightMm}
                                    onValueChange={(event) =>
                                        patchElement(selectedElement.id, {
                                            heightMm: roundMm(clamp(Number(event.value ?? 1), 1, pageDimensionsMm.height))
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {selectedElement.type === 'text' ? (
                                <div className="col-12">
                                    <label className="block text-600 mb-1">Text</label>
                                    <AppInput
                                        value={selectedElement.text ?? ''}
                                        onChange={(event) => patchElement(selectedElement.id, { text: event.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            ) : null}

                            {selectedElement.type === 'field' ? (
                                <div className="col-12">
                                    <label className="block text-600 mb-1">Field</label>
                                    <AppDropdown
                                        value={selectedElement.fieldKey ?? ''}
                                        options={fieldOptions}
                                        onChange={(event) => patchElement(selectedElement.id, { fieldKey: String(event.value ?? '') })}
                                        placeholder="Select field"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            ) : null}

                            {selectedElement.type !== 'line' ? (
                                <>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Font Size (pt)</label>
                                        <AppInput
                                            inputType="number"
                                            value={selectedElement.fontSizePt ?? 10}
                                            onValueChange={(event) =>
                                                patchElement(selectedElement.id, {
                                                    fontSizePt: clamp(Number(event.value ?? 10), 6, 28)
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="block text-600 mb-1">Font Weight</label>
                                        <AppDropdown
                                            value={selectedElement.fontWeight ?? 'normal'}
                                            options={[
                                                { label: 'Normal', value: 'normal' },
                                                { label: 'Bold', value: 'bold' }
                                            ]}
                                            onChange={(event) =>
                                                patchElement(selectedElement.id, {
                                                    fontWeight: event.value === 'bold' ? 'bold' : 'normal'
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="block text-600 mb-1">Text Align</label>
                                        <AppDropdown
                                            value={selectedElement.textAlign ?? 'left'}
                                            options={[
                                                { label: 'Left', value: 'left' },
                                                { label: 'Center', value: 'center' },
                                                { label: 'Right', value: 'right' }
                                            ]}
                                            onChange={(event) =>
                                                patchElement(selectedElement.id, {
                                                    textAlign: event.value === 'center' ? 'center' : event.value === 'right' ? 'right' : 'left'
                                                })
                                            }
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </>
                            ) : null}

                            <div className="col-12">
                                <label className="block text-600 mb-1">Border Width</label>
                                <AppInput
                                    inputType="number"
                                    value={selectedElement.borderWidth ?? 0}
                                    onValueChange={(event) =>
                                        patchElement(selectedElement.id, {
                                            borderWidth: clamp(Number(event.value ?? 0), 0, 3)
                                        })
                                    }
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

