export const REPORT_DEFINITION_VERSION = 2 as const;

export const REPORT_SECTION_KEYS = ['pageHeader', 'reportHeader', 'body', 'reportFooter', 'pageFooter'] as const;

export type ReportSectionKey = (typeof REPORT_SECTION_KEYS)[number];
export type ReportTextAlign = 'left' | 'center' | 'right';
export type ReportFontWeight = 'normal' | 'bold';
export type ReportSortDirection = 'asc' | 'desc';
export type ReportImageFit = 'contain' | 'cover' | 'fill';
export type ReportImageSourceKind = 'url' | 'company_logo' | 'field';
export type ReportParameterDataType = 'string' | 'number' | 'date' | 'boolean';
export type ReportItemType = 'text' | 'field' | 'image' | 'line' | 'rectangle' | 'table' | 'list';

export type ReportTableColumn = {
    id: string;
    fieldKey: string;
    label: string;
    widthMm: number;
    align: ReportTextAlign;
    includeTotal: boolean;
    repeatValue?: boolean;
};

export type ReportGroupDefinition = {
    id: string;
    fieldKey: string;
    label: string;
    sortDirection: ReportSortDirection;
    showHeader: boolean;
    showSubtotal: boolean;
    subtotalLabel: string;
    pageBreakBefore: boolean;
    pageBreakAfter: boolean;
    keepTogether: boolean;
    keepWithNext: boolean;
};

export type ReportSortDefinition = {
    id: string;
    fieldKey: string;
    direction: ReportSortDirection;
};

export type ReportParameterDefinition = {
    id: string;
    key: string;
    label: string;
    dataType: ReportParameterDataType;
    defaultValue: string;
    required: boolean;
};

export type ReportDatasetDefinition = {
    id: string;
    key: string;
    label: string;
    dataSourceKey: string;
    role: 'primary';
};

export type ReportItemBase = {
    id: string;
    type: ReportItemType;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    fontSizePt: number;
    fontWeight: ReportFontWeight;
    textAlign: ReportTextAlign;
    borderWidth: number;
    borderColor: string;
    fillColor: string;
    textColor: string;
    borderColorExpression: string;
    fillColorExpression: string;
    textColorExpression: string;
    fontWeightExpression: string;
    hiddenExpression: string;
    pageBreakBefore: boolean;
    pageBreakAfter: boolean;
    keepTogether: boolean;
};

export type ReportTextItem = ReportItemBase & {
    type: 'text';
    text: string;
    expression: string;
    canGrow: boolean;
    canShrink: boolean;
};

export type ReportFieldItem = ReportItemBase & {
    type: 'field';
    fieldKey: string;
    fallbackText: string;
    expression: string;
    canGrow: boolean;
    canShrink: boolean;
};

export type ReportImageItem = ReportItemBase & {
    type: 'image';
    sourceKind: ReportImageSourceKind;
    url: string;
    fieldKey: string;
    expression: string;
    fit: ReportImageFit;
};

export type ReportLineItem = ReportItemBase & {
    type: 'line';
};

export type ReportRectangleItem = ReportItemBase & {
    type: 'rectangle';
};

export type ReportTableItem = ReportItemBase & {
    type: 'table';
    datasetKey: string;
    columns: ReportTableColumn[];
    rowGroups: ReportGroupDefinition[];
    sorts: ReportSortDefinition[];
    showHeader: boolean;
    showGrandTotal: boolean;
    zebraStriping: boolean;
};

export type ReportListDetailItem = ReportTextItem | ReportFieldItem | ReportImageItem | ReportLineItem | ReportRectangleItem;

export type ReportListItem = ReportItemBase & {
    type: 'list';
    datasetKey: string;
    sourcePath: string;
    rowHeightMm: number;
    gapMm: number;
    showRowDivider: boolean;
    zebraStriping: boolean;
    items: ReportListDetailItem[];
};

export type ReportItem =
    | ReportTextItem
    | ReportFieldItem
    | ReportImageItem
    | ReportLineItem
    | ReportRectangleItem
    | ReportTableItem
    | ReportListItem;

export type ReportSectionDefinition = {
    key: ReportSectionKey;
    label: string;
    heightMm: number;
    items: ReportItem[];
};

export type ReportDefinition = {
    version: typeof REPORT_DEFINITION_VERSION;
    datasets: ReportDatasetDefinition[];
    parameters: ReportParameterDefinition[];
    defaultFontFamily: string;
    repeatPerRow: boolean;
    sections: Record<ReportSectionKey, ReportSectionDefinition>;
};

type ReportItemInput = Partial<ReportItemBase> & {
    type?: unknown;
    text?: unknown;
    fieldKey?: unknown;
    fallbackText?: unknown;
    expression?: unknown;
    canGrow?: unknown;
    canShrink?: unknown;
    hiddenExpression?: unknown;
    borderColorExpression?: unknown;
    fillColorExpression?: unknown;
    textColorExpression?: unknown;
    fontWeightExpression?: unknown;
    pageBreakBefore?: unknown;
    pageBreakAfter?: unknown;
    keepTogether?: unknown;
    sourceKind?: unknown;
    url?: unknown;
    defaultFontFamily?: unknown;
    fit?: unknown;
    datasetKey?: unknown;
    sourcePath?: unknown;
    columns?: unknown;
    rowGroups?: unknown;
    sorts?: unknown;
    showHeader?: unknown;
    showGrandTotal?: unknown;
    zebraStriping?: unknown;
    rowHeightMm?: unknown;
    gapMm?: unknown;
    showRowDivider?: unknown;
    items?: unknown;
};

type ReportTableColumnInput = Partial<ReportTableColumn>;
type ReportGroupInput = Partial<ReportGroupDefinition>;
type ReportSortInput = Partial<ReportSortDefinition>;
type ReportParameterInput = Partial<ReportParameterDefinition>;
type ReportDatasetInput = Partial<ReportDatasetDefinition>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundMm = (value: number) => Math.round(value * 100) / 100;
const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const asFinite = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const SECTION_LABELS: Record<ReportSectionKey, string> = {
    pageHeader: 'Page Header',
    reportHeader: 'Report Header',
    body: 'Body',
    reportFooter: 'Report Footer',
    pageFooter: 'Page Footer'
};

const DEFAULT_SECTION_HEIGHTS: Record<ReportSectionKey, number> = {
    pageHeader: 28,
    reportHeader: 36,
    body: 120,
    reportFooter: 24,
    pageFooter: 20
};

const normalizeColor = (value: unknown, fallback: string) => {
    const text = asText(value);
    if (!text) return fallback;
    return text;
};

const collectExpressionFieldKeys = (expression: string) => {
    const keys = new Set<string>();
    const pattern = /\b(?:field|fields|sum|avg|min|max|first|last|count|distinctCount)\s*\(\s*(['"])(.*?)\1/gi;
    let match = pattern.exec(expression);
    while (match) {
        const key = asText(match[2]);
        if (key) {
            keys.add(key);
        }
        match = pattern.exec(expression);
    }
    return Array.from(keys);
};

const normalizeItemBase = <T extends ReportItemType>(item: ReportItemInput, type: T): ReportItemBase & { type: T } => ({
    id: asText(item.id) || nextId(type),
    type,
    xMm: roundMm(clamp(asFinite(item.xMm, 10), 0, 400)),
    yMm: roundMm(clamp(asFinite(item.yMm, 10), 0, 600)),
    widthMm: roundMm(clamp(asFinite(item.widthMm, type === 'line' ? 80 : type === 'table' || type === 'list' ? 160 : 60), 1, 400)),
    heightMm: roundMm(clamp(asFinite(item.heightMm, type === 'line' ? 1 : type === 'table' ? 48 : type === 'list' ? 68 : 12), 1, 600)),
    fontSizePt: clamp(asFinite(item.fontSizePt, type === 'table' || type === 'list' ? 9 : 10), 6, 28),
    fontWeight: item.fontWeight === 'bold' ? 'bold' : 'normal',
    textAlign: item.textAlign === 'center' || item.textAlign === 'right' ? item.textAlign : 'left',
    borderWidth: clamp(asFinite(item.borderWidth, type === 'rectangle' || type === 'table' || type === 'list' ? 1 : 0), 0, 4),
    borderColor: normalizeColor(item.borderColor, '#334155'),
    fillColor: normalizeColor(item.fillColor, type === 'table' || type === 'list' ? '#ffffff' : 'transparent'),
    textColor: normalizeColor(item.textColor, '#111827'),
    borderColorExpression: asText(item.borderColorExpression),
    fillColorExpression: asText(item.fillColorExpression),
    textColorExpression: asText(item.textColorExpression),
    fontWeightExpression: asText(item.fontWeightExpression),
    hiddenExpression: asText(item.hiddenExpression),
    pageBreakBefore: item.pageBreakBefore === true,
    pageBreakAfter: item.pageBreakAfter === true,
    keepTogether: item.keepTogether === true
});

const normalizeTableColumn = (raw: ReportTableColumnInput, fallbackFieldKey = ''): ReportTableColumn => ({
    id: asText(raw.id) || nextId('col'),
    fieldKey: asText(raw.fieldKey) || fallbackFieldKey,
    label: asText(raw.label) || asText(raw.fieldKey) || fallbackFieldKey || 'Column',
    widthMm: roundMm(clamp(asFinite(raw.widthMm, 28), 10, 120)),
    align: raw.align === 'center' || raw.align === 'right' ? raw.align : 'left',
    includeTotal: raw.includeTotal === true,
    repeatValue: raw.repeatValue !== false
});

const normalizeGroup = (raw: ReportGroupInput): ReportGroupDefinition | null => {
    const fieldKey = asText(raw.fieldKey);
    if (!fieldKey) return null;
    return {
        id: asText(raw.id) || nextId('grp'),
        fieldKey,
        label: asText(raw.label) || fieldKey,
        sortDirection: raw.sortDirection === 'desc' ? 'desc' : 'asc',
        showHeader: raw.showHeader !== false,
        showSubtotal: raw.showSubtotal === true,
        subtotalLabel: asText(raw.subtotalLabel) || 'Subtotal',
        pageBreakBefore: raw.pageBreakBefore === true,
        pageBreakAfter: raw.pageBreakAfter === true,
        keepTogether: raw.keepTogether === true,
        keepWithNext: raw.keepWithNext === true
    };
};

const normalizeSort = (raw: ReportSortInput): ReportSortDefinition | null => {
    const fieldKey = asText(raw.fieldKey);
    if (!fieldKey) return null;
    return {
        id: asText(raw.id) || nextId('sort'),
        fieldKey,
        direction: raw.direction === 'desc' ? 'desc' : 'asc'
    };
};

const normalizeListDetailItem = (raw: unknown): ReportListDetailItem | null => {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as ReportItemInput;
    const type = item.type;
    if (type !== 'text' && type !== 'field' && type !== 'image' && type !== 'line' && type !== 'rectangle') {
        return null;
    }
    if (type === 'text') {
        return {
            ...normalizeItemBase(item, type),
            text: asText(item.text) || 'Text',
            expression: asText(item.expression),
            canGrow: item.canGrow !== false,
            canShrink: item.canShrink === true
        };
    }
    if (type === 'field') {
        return {
            ...normalizeItemBase(item, type),
            fieldKey: asText(item.fieldKey),
            fallbackText: asText(item.fallbackText),
            expression: asText(item.expression),
            canGrow: item.canGrow !== false,
            canShrink: item.canShrink === true
        };
    }
    if (type === 'image') {
        return {
            ...normalizeItemBase(item, type),
            sourceKind: item.sourceKind === 'company_logo' || item.sourceKind === 'field' ? item.sourceKind : 'url',
            url: asText(item.url),
            fieldKey: asText(item.fieldKey),
            expression: asText(item.expression),
            fit: item.fit === 'cover' || item.fit === 'fill' ? item.fit : 'contain'
        };
    }
    if (type === 'line') {
        return normalizeItemBase(item, type) as ReportLineItem;
    }
    return normalizeItemBase(item, type) as ReportRectangleItem;
};

export const createReportTextItem = (): ReportTextItem => ({
    ...normalizeItemBase({}, 'text'),
    text: 'Text',
    expression: '',
    canGrow: true,
    canShrink: false
});

export const createReportFieldItem = (fieldKey = ''): ReportFieldItem => ({
    ...normalizeItemBase({}, 'field'),
    fieldKey,
    fallbackText: '',
    expression: '',
    canGrow: true,
    canShrink: false
});

export const createReportImageItem = (): ReportImageItem => ({
    ...normalizeItemBase({ widthMm: 28, heightMm: 18 }, 'image'),
    sourceKind: 'url',
    url: '',
    fieldKey: '',
    expression: '',
    fit: 'contain'
});

export const createReportLineItem = (): ReportLineItem => ({
    ...normalizeItemBase({ heightMm: 1, widthMm: 80, borderWidth: 1 }, 'line')
});

export const createReportRectangleItem = (): ReportRectangleItem => ({
    ...normalizeItemBase({ heightMm: 18, widthMm: 60, borderWidth: 1 }, 'rectangle')
});

export const createReportTableItem = (fieldKeys: string[] = []): ReportTableItem => ({
    ...normalizeItemBase({ widthMm: 170, heightMm: 54, borderWidth: 1, fontSizePt: 9 }, 'table'),
    datasetKey: 'main',
    columns: fieldKeys.slice(0, 6).map((fieldKey) =>
        normalizeTableColumn({ fieldKey, label: fieldKey, widthMm: 28 }, fieldKey)
    ),
    rowGroups: [],
    sorts: [],
    showHeader: true,
    showGrandTotal: false,
    zebraStriping: true
});

export const createReportListItem = (fieldKeys: string[] = []): ReportListItem => {
    const detailItems: ReportListDetailItem[] = [];
    const firstField = fieldKeys[0] ?? '';
    const secondField = fieldKeys[1] ?? '';
    if (firstField) {
        detailItems.push({
            ...createReportFieldItem(firstField),
            id: nextId('detail'),
            xMm: 4,
            yMm: 3,
            widthMm: 72,
            heightMm: 8,
            fontWeight: 'bold'
        });
    }
    if (secondField) {
        detailItems.push({
            ...createReportFieldItem(secondField),
            id: nextId('detail'),
            xMm: 4,
            yMm: 12,
            widthMm: 72,
            heightMm: 6,
            fontSizePt: 8
        });
    }
    return {
        ...normalizeItemBase({ widthMm: 170, heightMm: 72, borderWidth: 1, fontSizePt: 9 }, 'list'),
        datasetKey: 'main',
        sourcePath: '',
        rowHeightMm: 20,
        gapMm: 1,
        showRowDivider: true,
        zebraStriping: false,
        items: detailItems
    };
};

export const cloneReportItem = (item: ReportItem): ReportItem => {
    const cloned = JSON.parse(JSON.stringify(item)) as ReportItem;
    cloned.id = nextId(item.type);
    cloned.xMm = roundMm(item.xMm + 3);
    cloned.yMm = roundMm(item.yMm + 3);
    if (cloned.type === 'table') {
        cloned.columns = cloned.columns.map((column) => ({ ...column, id: nextId('col') }));
        cloned.rowGroups = cloned.rowGroups.map((group) => ({ ...group, id: nextId('grp') }));
        cloned.sorts = cloned.sorts.map((sort) => ({ ...sort, id: nextId('sort') }));
    }
    if (cloned.type === 'list') {
        cloned.items = cloned.items.map((detailItem) => ({ ...detailItem, id: nextId('detail') }));
    }
    return cloned;
};

export const createEmptyReportDefinition = (dataSourceKey = ''): ReportDefinition => ({
    version: REPORT_DEFINITION_VERSION,
    datasets: [
        {
            id: nextId('ds'),
            key: 'main',
            label: 'Main Dataset',
            dataSourceKey,
            role: 'primary'
        }
    ],
    parameters: [],
    defaultFontFamily: 'Segoe UI, Arial, sans-serif',
    repeatPerRow: false,
    sections: REPORT_SECTION_KEYS.reduce<Record<ReportSectionKey, ReportSectionDefinition>>((acc, key) => {
        acc[key] = {
            key,
            label: SECTION_LABELS[key],
            heightMm: DEFAULT_SECTION_HEIGHTS[key],
            items: []
        };
        return acc;
    }, {} as Record<ReportSectionKey, ReportSectionDefinition>)
});

const normalizeItem = (raw: unknown): ReportItem | null => {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as ReportItemInput;
    const type = item.type;
    if (type !== 'text' && type !== 'field' && type !== 'image' && type !== 'line' && type !== 'rectangle' && type !== 'table' && type !== 'list') {
        return null;
    }
    if (type === 'text') {
        return {
            ...normalizeItemBase(item, type),
            text: asText(item.text) || 'Text',
            expression: asText(item.expression),
            canGrow: item.canGrow !== false,
            canShrink: item.canShrink === true
        };
    }
    if (type === 'field') {
        return {
            ...normalizeItemBase(item, type),
            fieldKey: asText(item.fieldKey),
            fallbackText: asText(item.fallbackText),
            expression: asText(item.expression),
            canGrow: item.canGrow !== false,
            canShrink: item.canShrink === true
        };
    }
    if (type === 'image') {
        return {
            ...normalizeItemBase(item, type),
            sourceKind: item.sourceKind === 'company_logo' || item.sourceKind === 'field' ? item.sourceKind : 'url',
            url: asText(item.url),
            fieldKey: asText(item.fieldKey),
            expression: asText(item.expression),
            fit: item.fit === 'cover' || item.fit === 'fill' ? item.fit : 'contain'
        };
    }
    if (type === 'line') {
        return normalizeItemBase(item, type) as ReportLineItem;
    }
    if (type === 'rectangle') {
        return normalizeItemBase(item, type) as ReportRectangleItem;
    }
    if (type === 'list') {
        const detailItems = Array.isArray(item.items)
            ? (item.items as unknown[])
                  .map((detailItem) => normalizeListDetailItem(detailItem))
                  .filter((detailItem): detailItem is ReportListDetailItem => Boolean(detailItem))
            : [];
        return {
            ...normalizeItemBase(item, type),
            datasetKey: asText(item.datasetKey) || 'main',
            sourcePath: asText(item.sourcePath),
            rowHeightMm: roundMm(clamp(asFinite(item.rowHeightMm, 20), 8, 120)),
            gapMm: roundMm(clamp(asFinite(item.gapMm, 1), 0, 20)),
            showRowDivider: item.showRowDivider !== false,
            zebraStriping: item.zebraStriping === true,
            items: detailItems
        };
    }
    const tableColumns = Array.isArray(item.columns)
        ? (item.columns as unknown[])
              .map((column) => normalizeTableColumn(column as ReportTableColumnInput))
              .filter((column) => asText(column.fieldKey).length > 0)
        : [];
    return {
        ...normalizeItemBase(item, type),
        datasetKey: asText(item.datasetKey) || 'main',
        columns: tableColumns,
        rowGroups: Array.isArray(item.rowGroups)
            ? (item.rowGroups as unknown[])
                  .map((group) => normalizeGroup(group as ReportGroupInput))
                  .filter((group): group is ReportGroupDefinition => Boolean(group))
            : [],
        sorts: Array.isArray(item.sorts)
            ? (item.sorts as unknown[])
                  .map((sort) => normalizeSort(sort as ReportSortInput))
                  .filter((sort): sort is ReportSortDefinition => Boolean(sort))
            : [],
        showHeader: item.showHeader !== false,
        showGrandTotal: item.showGrandTotal === true,
        zebraStriping: item.zebraStriping !== false
    };
};

const normalizeSection = (key: ReportSectionKey, raw: unknown): ReportSectionDefinition => {
    const source = raw && typeof raw === 'object' ? (raw as Partial<ReportSectionDefinition>) : {};
    const items = Array.isArray(source.items) ? source.items.map(normalizeItem).filter((item): item is ReportItem => Boolean(item)) : [];
    return {
        key,
        label: SECTION_LABELS[key],
        heightMm: roundMm(clamp(asFinite(source.heightMm, DEFAULT_SECTION_HEIGHTS[key]), 10, 400)),
        items
    };
};

export const normalizeReportDefinition = (raw: unknown, dataSourceKey = ''): ReportDefinition => {
    const fallback = createEmptyReportDefinition(dataSourceKey);
    if (!raw || typeof raw !== 'object') return fallback;
    const source = raw as Partial<ReportDefinition> & {
        datasets?: unknown;
        parameters?: unknown;
        defaultFontFamily?: unknown;
        repeatPerRow?: unknown;
        sections?: Partial<Record<ReportSectionKey, unknown>>;
    };
    const datasets = Array.isArray(source.datasets)
        ? source.datasets
              .map((dataset) => {
                  const input = dataset as ReportDatasetInput;
                  const key = asText(input.key) || 'main';
                  return {
                      id: asText(input.id) || nextId('ds'),
                      key,
                      label: asText(input.label) || (key === 'main' ? 'Main Dataset' : key),
                      dataSourceKey: asText(input.dataSourceKey) || dataSourceKey,
                      role: 'primary' as const
                  };
              })
              .filter((dataset) => dataset.key.length > 0)
        : fallback.datasets;
    const parameters = Array.isArray(source.parameters)
        ? source.parameters
              .map((parameter) => {
                  const input = parameter as ReportParameterInput;
                  const key = asText(input.key);
                  if (!key) return null;
                  const dataType =
                      input.dataType === 'number' || input.dataType === 'date' || input.dataType === 'boolean' ? input.dataType : 'string';
                  return {
                      id: asText(input.id) || nextId('param'),
                      key,
                      label: asText(input.label) || key,
                      dataType,
                      defaultValue: asText(input.defaultValue),
                      required: input.required === true
                  };
              })
              .filter((parameter): parameter is ReportParameterDefinition => Boolean(parameter))
        : [];
    const sections = REPORT_SECTION_KEYS.reduce<Record<ReportSectionKey, ReportSectionDefinition>>((acc, key) => {
        acc[key] = normalizeSection(key, source.sections?.[key]);
        return acc;
    }, {} as Record<ReportSectionKey, ReportSectionDefinition>);
    return {
        version: REPORT_DEFINITION_VERSION,
        datasets: datasets.length > 0 ? datasets : fallback.datasets,
        parameters,
        defaultFontFamily: asText(source.defaultFontFamily) || fallback.defaultFontFamily,
        repeatPerRow: source.repeatPerRow === true,
        sections
    };
};

export const hasReportDefinitionContent = (definition: ReportDefinition | null | undefined) => {
    if (!definition) return false;
    return REPORT_SECTION_KEYS.some((key) => (definition.sections[key]?.items ?? []).length > 0);
};

export const collectReferencedFieldKeys = (definition: ReportDefinition | null | undefined) => {
    if (!definition) return [] as string[];
    const keys = new Set<string>();
    const collectItemExpressionKeys = (expression: string) => {
        if (!expression.trim()) return;
        collectExpressionFieldKeys(expression).forEach((key) => keys.add(key));
    };
    REPORT_SECTION_KEYS.forEach((sectionKey) => {
        (definition.sections[sectionKey]?.items ?? []).forEach((item) => {
            collectItemExpressionKeys(item.hiddenExpression);
            collectItemExpressionKeys(item.borderColorExpression);
            collectItemExpressionKeys(item.fillColorExpression);
            collectItemExpressionKeys(item.textColorExpression);
            collectItemExpressionKeys(item.fontWeightExpression);
            if (item.type === 'field' && item.fieldKey.trim()) {
                keys.add(item.fieldKey.trim());
            }
            if (item.type === 'text' && item.expression.trim()) {
                collectExpressionFieldKeys(item.expression).forEach((key) => keys.add(key));
            }
            if (item.type === 'field' && item.expression.trim()) {
                collectExpressionFieldKeys(item.expression).forEach((key) => keys.add(key));
            }
            if (item.type === 'table') {
                item.columns.forEach((column) => {
                    if (column.fieldKey.trim()) keys.add(column.fieldKey.trim());
                });
                item.rowGroups.forEach((group) => {
                    if (group.fieldKey.trim()) keys.add(group.fieldKey.trim());
                });
                item.sorts.forEach((sort) => {
                    if (sort.fieldKey.trim()) keys.add(sort.fieldKey.trim());
                });
            }
            if (item.type === 'image') {
                if (item.fieldKey.trim()) {
                    keys.add(item.fieldKey.trim());
                }
                if (item.expression.trim()) {
                    collectExpressionFieldKeys(item.expression).forEach((key) => keys.add(key));
                }
            }
            if (item.type === 'list') {
                item.items.forEach((detailItem) => {
                    collectItemExpressionKeys(detailItem.hiddenExpression);
                    collectItemExpressionKeys(detailItem.borderColorExpression);
                    collectItemExpressionKeys(detailItem.fillColorExpression);
                    collectItemExpressionKeys(detailItem.textColorExpression);
                    collectItemExpressionKeys(detailItem.fontWeightExpression);
                    if (detailItem.type === 'field' && detailItem.fieldKey.trim()) {
                        keys.add(detailItem.fieldKey.trim());
                    }
                    if (detailItem.type === 'image') {
                        if (detailItem.fieldKey.trim()) {
                            keys.add(detailItem.fieldKey.trim());
                        }
                        if (detailItem.expression.trim()) {
                            collectExpressionFieldKeys(detailItem.expression).forEach((key) => keys.add(key));
                        }
                    }
                    if ((detailItem.type === 'text' || detailItem.type === 'field') && detailItem.expression.trim()) {
                        collectExpressionFieldKeys(detailItem.expression).forEach((key) => keys.add(key));
                    }
                });
            }
        });
    });
    return Array.from(keys);
};
