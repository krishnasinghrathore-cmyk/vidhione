import { gql, type ApolloClient, type NormalizedCacheObject } from '@apollo/client';
import {
    hasReportDefinitionContent,
    normalizeReportDefinition,
    type ReportDefinition,
    type ReportFieldItem,
    type ReportListDetailItem,
    type ReportListItem,
    type ReportItem,
    type ReportTableItem,
    type ReportTextItem,
    type ReportTextAlign
} from '@/lib/reportDefinition';

type ReportDataSourceField = {
    key: string;
    label: string;
    dataType: string;
    path?: string | null;
};

type ReportDataSourceRow = {
    moduleKey?: string | null;
    dataSourceKey: string;
    label?: string | null;
    fields: ReportDataSourceField[];
};

type ReportTemplateRow = {
    moduleKey?: string | null;
    usageKey?: string | null;
    dataSourceKey?: string | null;
    pageSettingsJson?: string | null;
    printSettingsJson?: string | null;
    selectedFieldsJson?: string | null;
    isDefaultFlag?: boolean | null;
};

type SelectedFieldConfig = {
    key: string;
    label?: string;
    path?: string | null;
    dataType?: string;
    align?: 'left' | 'center' | 'right';
    widthMm?: number;
    includeTotal?: boolean;
};

type ReportTemplatesQueryResult = {
    reportTemplates?: ReportTemplateRow[] | null;
};

type ReportDataSourcesQueryResult = {
    reportDataSources?: ReportDataSourceRow[] | null;
};

type TemplatePageSettings = {
    pageSize: 'A4' | 'A5' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    layout: ReportTemplateLayout | null;
    reportDefinition: ReportDefinition | null;
};

type TemplatePrintSettings = {
    headerText: string;
    footerText: string;
    showCompanyHeader: boolean;
    showRowNumbers: boolean;
    renderMode: 'standard' | 'legacy_invoice_ledger' | 'legacy_loading_sheet';
    companyNameOverride: string;
    companyAddressOverride: string;
    companyLogoUrl: string;
    companyLogoWidthMm: number;
    companyHeaderAlign: 'left' | 'center' | 'right';
    companyNameFontSizePt: number;
    companyAddressFontSizePt: number;
    showHeaderDivider: boolean;
    showTotalsRow: boolean;
};

type ResolvedTemplateColumn = {
    key: string;
    label: string;
    dataType: string;
    path: string | null;
    align: 'left' | 'center' | 'right';
    widthMm: number | null;
    includeTotal: boolean;
};

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

export type ReportTemplateDefinitionColumn = {
    key: string;
    label?: string;
    dataType?: string;
    path?: string | null;
};

export type ReportTemplateDefinitionPrintInput = {
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    rows: Array<Record<string, unknown>>;
    columns: ReportTemplateDefinitionColumn[];
    layout?: ReportTemplateLayout | null;
    reportDefinition?: ReportDefinition | null;
    pageSettings?: Partial<TemplatePageSettings>;
    printSettings?: Partial<TemplatePrintSettings>;
};

export type ReportTemplatePrintInput = {
    apolloClient: ApolloClient<NormalizedCacheObject>;
    moduleKey: string;
    usageKeys?: string[];
    rows: Array<Record<string, unknown>>;
    title?: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
};

const REPORT_TEMPLATES = gql`
    query ReportTemplatePrintTemplates($moduleKey: String, $includeInactive: Boolean, $limit: Int) {
        reportTemplates(moduleKey: $moduleKey, includeInactive: $includeInactive, limit: $limit) {
            moduleKey
            usageKey
            dataSourceKey
            pageSettingsJson
            printSettingsJson
            selectedFieldsJson
            isDefaultFlag
        }
    }
`;

const REPORT_DATA_SOURCES = gql`
    query ReportTemplatePrintDataSources($moduleKey: String) {
        reportDataSources(moduleKey: $moduleKey) {
            moduleKey
            dataSourceKey
            label
            fields {
                key
                label
                dataType
                path
            }
        }
    }
`;

const normalizeText = (value: string | null | undefined) => value?.trim() ?? '';
const normalizeKey = (value: string | null | undefined) => normalizeText(value).toLowerCase();

const toFiniteNumber = (value: unknown): number | null => {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const safeParseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
    const normalized = normalizeText(raw);
    if (!normalized) return fallback;
    try {
        const parsed = JSON.parse(normalized) as T;
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

const parseSelectedFields = (raw: string | null | undefined): SelectedFieldConfig[] => {
    const payload = safeParseJson<unknown[]>(raw, []);
    if (!Array.isArray(payload)) return [];
    const normalized: SelectedFieldConfig[] = [];
    payload.forEach((value) => {
        if (typeof value === 'string') {
            const key = normalizeText(value);
            if (key) {
                normalized.push({ key });
            }
            return;
        }
        if (!value || typeof value !== 'object' || !('key' in value)) {
            return;
        }
        const rawObj = value as {
            key?: unknown;
            label?: unknown;
            path?: unknown;
            dataType?: unknown;
            align?: unknown;
            widthMm?: unknown;
            includeTotal?: unknown;
            total?: unknown;
        };
        const key = normalizeText(String(rawObj.key ?? ''));
        if (!key) return;
        const alignRaw = normalizeKey(typeof rawObj.align === 'string' ? rawObj.align : '');
        const align: SelectedFieldConfig['align'] =
            alignRaw === 'right' ? 'right' : alignRaw === 'center' ? 'center' : alignRaw === 'left' ? 'left' : undefined;
        const widthMm = toFiniteNumber(rawObj.widthMm);
        const selectedField: SelectedFieldConfig = {
            key,
            includeTotal: rawObj.includeTotal === true || rawObj.total === true
        };
        if (typeof rawObj.label === 'string') {
            selectedField.label = normalizeText(rawObj.label);
        }
        if (typeof rawObj.path === 'string') {
            selectedField.path = normalizeText(rawObj.path);
        }
        if (typeof rawObj.dataType === 'string') {
            selectedField.dataType = normalizeText(rawObj.dataType);
        }
        if (align) {
            selectedField.align = align;
        }
        if (widthMm != null) {
            selectedField.widthMm = clamp(widthMm, 8, 120);
        }
        normalized.push(selectedField);
    });
    return normalized;
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const PAGE_NUMBER_TOKEN = '__REPORT_PAGE_NUMBER__';
const TOTAL_PAGES_TOKEN = '__REPORT_TOTAL_PAGES__';

const renderEscapedTextWithSystemTokens = (value: string) => {
    const source = typeof value === 'string' ? value : String(value ?? '');
    if (!source.includes(PAGE_NUMBER_TOKEN) && !source.includes(TOTAL_PAGES_TOKEN)) {
        return escapeHtml(source);
    }
    const tokenPattern = new RegExp(`${PAGE_NUMBER_TOKEN}|${TOTAL_PAGES_TOKEN}`, 'g');
    let html = '';
    let lastIndex = 0;
    let match = tokenPattern.exec(source);
    while (match) {
        html += escapeHtml(source.slice(lastIndex, match.index));
        html +=
            match[0] === PAGE_NUMBER_TOKEN
                ? '<span class="definition-system-token definition-page-number"></span>'
                : '<span class="definition-system-token definition-total-pages"></span>';
        lastIndex = match.index + match[0].length;
        match = tokenPattern.exec(source);
    }
    html += escapeHtml(source.slice(lastIndex));
    return html;
};

const normalizeMeasurementText = (value: string) =>
    value.split(PAGE_NUMBER_TOKEN).join('99').split(TOTAL_PAGES_TOKEN).join('99');

type DefinitionValueContext = {
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
};

const resolveDefinitionTextItemDisplay = (item: ReportTextItem, context: DefinitionValueContext) =>
    item.expression.trim()
        ? formatExpressionValue(
              evaluateReportExpression({
                  expression: item.expression,
                  row: context.row,
                  rows: context.rows,
                  rowIndex: context.rowIndex,
                  fieldTypes: context.fieldTypes,
                  documentTitle: context.documentTitle,
                  subtitle: context.subtitle,
                  companyName: context.companyName,
                  companyAddress: context.companyAddress,
                  printSettings: context.printSettings
              })
          )
        : item.text;

const resolveDefinitionFieldItemDisplay = (item: ReportFieldItem, context: DefinitionValueContext) =>
    item.expression.trim()
        ? formatExpressionValue(
              evaluateReportExpression({
                  expression: item.expression,
                  row: context.row,
                  rows: context.rows,
                  rowIndex: context.rowIndex,
                  fieldTypes: context.fieldTypes,
                  documentTitle: context.documentTitle,
                  subtitle: context.subtitle,
                  companyName: context.companyName,
                  companyAddress: context.companyAddress,
                  printSettings: context.printSettings
              })
          ) || item.fallbackText
        : (() => {
              const rawValue = resolveDefinitionFieldValue({
                  fieldKey: item.fieldKey,
                  row: context.row,
                  documentTitle: context.documentTitle,
                  subtitle: context.subtitle,
                  companyName: context.companyName,
                  companyAddress: context.companyAddress,
                  printSettings: context.printSettings
              });
              const dataType = context.fieldTypes.get(normalizeKey(item.fieldKey)) ?? 'string';
              return formatCellValue(rawValue, dataType) || item.fallbackText;
          })();

const estimateRenderedTextHeightMm = (display: string, widthMm: number, fontSizePt: number, minHeightMm: number) => {
    const measurementText = normalizeMeasurementText(display || '');
    if (!measurementText.trim()) {
        return minHeightMm;
    }
    const ptToMm = 0.352778;
    const horizontalPaddingMm = 1.2;
    const verticalPaddingMm = 0.8;
    const lineHeightMm = fontSizePt * ptToMm * 1.18;
    const charWidthMm = Math.max(fontSizePt * ptToMm * 0.5, 0.7);
    const usableWidthMm = Math.max(widthMm - horizontalPaddingMm, 4);
    const charsPerLine = Math.max(1, Math.floor(usableWidthMm / charWidthMm));
    const lineCount = measurementText.split(/\r?\n/).reduce((total, part) => {
        const line = part || ' ';
        return total + Math.max(1, Math.ceil(line.length / charsPerLine));
    }, 0);
    const estimatedHeight = verticalPaddingMm + lineCount * lineHeightMm;
    return Math.max(minHeightMm, Math.round(estimatedHeight * 100) / 100);
};

const resolveTextLikeRenderedHeightMm = (args: {
    display: string;
    widthMm: number;
    fontSizePt: number;
    heightMm: number;
    canGrow: boolean;
    canShrink: boolean;
}) => {
    const contentHeightMm = estimateRenderedTextHeightMm(args.display, args.widthMm, args.fontSizePt, 1);
    if (args.canGrow && args.canShrink) {
        return Math.max(1, contentHeightMm);
    }
    if (args.canGrow) {
        return Math.max(args.heightMm, contentHeightMm);
    }
    if (args.canShrink) {
        return Math.max(1, Math.min(args.heightMm, contentHeightMm));
    }
    return args.heightMm;
};

const isDefinitionItemHidden = (args: {
    hiddenExpression: string;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) => {
    const expression = normalizeText(args.hiddenExpression);
    if (!expression) return false;
    const result = evaluateReportExpression({
        expression,
        row: args.row,
        rows: args.rows,
        rowIndex: args.rowIndex,
        fieldTypes: args.fieldTypes,
        documentTitle: args.documentTitle,
        subtitle: args.subtitle,
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings
    });
    if (result === '#Error') return false;
    return toExpressionBoolean(result);
};

const resolveDefinitionItemStyleOverrides = (args: {
    item: Pick<
        ReportItem,
        | 'fontWeight'
        | 'borderColor'
        | 'fillColor'
        | 'textColor'
        | 'borderColorExpression'
        | 'fillColorExpression'
        | 'textColorExpression'
        | 'fontWeightExpression'
    >;
    context: DefinitionValueContext;
}) => {
    const evaluateStyleExpression = (expression: string) => {
        const normalizedExpression = normalizeText(expression);
        if (!normalizedExpression) return '';
        const result = evaluateReportExpression({
            expression: normalizedExpression,
            row: args.context.row,
            rows: args.context.rows,
            rowIndex: args.context.rowIndex,
            fieldTypes: args.context.fieldTypes,
            documentTitle: args.context.documentTitle,
            subtitle: args.context.subtitle,
            companyName: args.context.companyName,
            companyAddress: args.context.companyAddress,
            printSettings: args.context.printSettings
        });
        if (result === '#Error' || result == null) return '';
        return String(result).trim();
    };

    const borderColor = evaluateStyleExpression(args.item.borderColorExpression) || args.item.borderColor;
    const fillColor = evaluateStyleExpression(args.item.fillColorExpression) || args.item.fillColor;
    const textColor = evaluateStyleExpression(args.item.textColorExpression) || args.item.textColor;
    const fontWeightValue = evaluateStyleExpression(args.item.fontWeightExpression);
    const normalizedFontWeight = normalizeKey(fontWeightValue);
    const fontWeight =
        normalizedFontWeight === 'bold' ||
        normalizedFontWeight === '700' ||
        normalizedFontWeight === 'true' ||
        normalizedFontWeight === '1' ||
        normalizedFontWeight === 'yes'
            ? 'bold'
            : normalizedFontWeight === 'normal' ||
                normalizedFontWeight === '400' ||
                normalizedFontWeight === 'false' ||
                normalizedFontWeight === '0' ||
                normalizedFontWeight === 'no'
              ? 'normal'
              : args.item.fontWeight;

    return {
        borderColor,
        fillColor,
        textColor,
        fontWeight
    };
};

const estimateDefinitionListDetailItemHeightMm = (item: ReportListDetailItem, context: DefinitionValueContext) => {
    if (
        isDefinitionItemHidden({
            hiddenExpression: item.hiddenExpression,
            row: context.row,
            rows: context.rows,
            rowIndex: context.rowIndex,
            fieldTypes: context.fieldTypes,
            documentTitle: context.documentTitle,
            subtitle: context.subtitle,
            companyName: context.companyName,
            companyAddress: context.companyAddress,
            printSettings: context.printSettings
        })
    ) {
        return 0;
    }
    if (item.type === 'text') {
        return resolveTextLikeRenderedHeightMm({
            display: resolveDefinitionTextItemDisplay(item, context),
            widthMm: item.widthMm,
            fontSizePt: item.fontSizePt,
            heightMm: item.heightMm,
            canGrow: item.canGrow,
            canShrink: item.canShrink
        });
    }
    if (item.type === 'field') {
        return resolveTextLikeRenderedHeightMm({
            display: resolveDefinitionFieldItemDisplay(item, context),
            widthMm: item.widthMm,
            fontSizePt: item.fontSizePt,
            heightMm: item.heightMm,
            canGrow: item.canGrow,
            canShrink: item.canShrink
        });
    }
    return item.heightMm;
};

const computeDefinitionListRowHeightMm = (args: {
    item: ReportListItem;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) =>
    Math.max(
        args.item.rowHeightMm,
        args.item.items.reduce(
            (maxHeight, detailItem) => {
                const detailHeightMm = estimateDefinitionListDetailItemHeightMm(detailItem, {
                    row: args.row,
                    rows: args.rows,
                    rowIndex: args.rowIndex,
                    fieldTypes: args.fieldTypes,
                    documentTitle: args.documentTitle,
                    subtitle: args.subtitle,
                    companyName: args.companyName,
                    companyAddress: args.companyAddress,
                    printSettings: args.printSettings
                });
                if (detailHeightMm <= 0) return maxHeight;
                return Math.max(maxHeight, detailItem.yMm + detailHeightMm);
            },
            0
        )
    );

const resolveValueByPath = (row: Record<string, unknown>, path: string | null | undefined): unknown => {
    const normalizedPath = normalizeText(path);
    if (!normalizedPath) return undefined;
    const segments = normalizedPath.split('.').filter(Boolean);
    if (!segments.length) return undefined;
    let cursor: unknown = row;
    for (const segment of segments) {
        if (cursor == null || typeof cursor !== 'object') return undefined;
        cursor = (cursor as Record<string, unknown>)[segment];
    }
    return cursor;
};

const formatCellValue = (value: unknown, dataType: string): string => {
    if (value == null) return '';
    if (value instanceof Date) {
        return value.toLocaleDateString('en-GB');
    }
    const normalizedType = normalizeKey(dataType);
    if (normalizedType === 'boolean') {
        return Boolean(value) ? 'Yes' : 'No';
    }
    if (normalizedType === 'number') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            const isInteger = Math.abs(parsed % 1) < 0.000001;
            return parsed.toLocaleString(undefined, {
                minimumFractionDigits: isInteger ? 0 : 2,
                maximumFractionDigits: 2
            });
        }
    }
    return String(value);
};

type ReportExpressionToken =
    | { type: 'identifier'; value: string }
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
    | { type: 'null' }
    | { type: 'comma' }
    | { type: 'paren'; value: '(' | ')' };

type ReportExpressionNode =
    | { kind: 'identifier'; name: string }
    | { kind: 'string'; value: string }
    | { kind: 'number'; value: number }
    | { kind: 'boolean'; value: boolean }
    | { kind: 'null' }
    | { kind: 'call'; name: string; args: ReportExpressionNode[] };

const tokenizeReportExpression = (expression: string): ReportExpressionToken[] => {
    const tokens: ReportExpressionToken[] = [];
    let index = 0;
    while (index < expression.length) {
        const char = expression[index];
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }
        if (char === '(' || char === ')') {
            tokens.push({ type: 'paren', value: char });
            index += 1;
            continue;
        }
        if (char === ',') {
            tokens.push({ type: 'comma' });
            index += 1;
            continue;
        }
        if (char === '"' || char === '\'') {
            const quote = char;
            index += 1;
            let value = '';
            while (index < expression.length) {
                const current = expression[index];
                if (current === '\\') {
                    value += expression[index + 1] ?? '';
                    index += 2;
                    continue;
                }
                if (current === quote) {
                    index += 1;
                    break;
                }
                value += current;
                index += 1;
            }
            tokens.push({ type: 'string', value });
            continue;
        }
        if (/[0-9.-]/.test(char)) {
            let value = char;
            index += 1;
            while (index < expression.length && /[0-9.]/.test(expression[index])) {
                value += expression[index];
                index += 1;
            }
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                tokens.push({ type: 'number', value: parsed });
                continue;
            }
        }
        if (/[A-Za-z_$]/.test(char)) {
            let value = char;
            index += 1;
            while (index < expression.length && /[A-Za-z0-9_$.]/.test(expression[index])) {
                value += expression[index];
                index += 1;
            }
            const normalized = normalizeKey(value);
            if (normalized === 'true') {
                tokens.push({ type: 'boolean', value: true });
                continue;
            }
            if (normalized === 'false') {
                tokens.push({ type: 'boolean', value: false });
                continue;
            }
            if (normalized === 'null') {
                tokens.push({ type: 'null' });
                continue;
            }
            tokens.push({ type: 'identifier', value });
            continue;
        }
        throw new Error(`Unsupported character "${char}" in expression.`);
    }
    return tokens;
};

const parseReportExpression = (expression: string): ReportExpressionNode => {
    const source = normalizeText(expression).replace(/^=/, '').trim();
    if (!source) {
        throw new Error('Empty expression.');
    }
    const tokens = tokenizeReportExpression(source);
    let index = 0;
    const parsePrimary = (): ReportExpressionNode => {
        const token = tokens[index];
        if (!token) {
            throw new Error('Unexpected end of expression.');
        }
        if (token.type === 'string') {
            index += 1;
            return { kind: 'string', value: token.value };
        }
        if (token.type === 'number') {
            index += 1;
            return { kind: 'number', value: token.value };
        }
        if (token.type === 'boolean') {
            index += 1;
            return { kind: 'boolean', value: token.value };
        }
        if (token.type === 'null') {
            index += 1;
            return { kind: 'null' };
        }
        if (token.type === 'identifier') {
            index += 1;
            const next = tokens[index];
            if (next?.type === 'paren' && next.value === '(') {
                index += 1;
                const args: ReportExpressionNode[] = [];
                while (index < tokens.length) {
                    const current = tokens[index];
                    if (current?.type === 'paren' && current.value === ')') {
                        index += 1;
                        break;
                    }
                    args.push(parsePrimary());
                    const separator = tokens[index];
                    if (separator?.type === 'comma') {
                        index += 1;
                        continue;
                    }
                    if (separator?.type === 'paren' && separator.value === ')') {
                        index += 1;
                        break;
                    }
                    throw new Error('Expected "," or ")" in expression.');
                }
                return { kind: 'call', name: token.value, args };
            }
            return { kind: 'identifier', name: token.value };
        }
        throw new Error('Invalid expression token.');
    };

    const parsed = parsePrimary();
    if (index !== tokens.length) {
        throw new Error('Unexpected trailing expression tokens.');
    }
    return parsed;
};

const toExpressionText = (value: unknown) => {
    if (value == null) return '';
    return typeof value === 'string' ? value : String(value);
};

const toExpressionBoolean = (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = normalizeKey(value);
        if (!normalized || normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'null') return false;
        return true;
    }
    return Boolean(value);
};

const compareExpressionValues = (left: unknown, right: unknown) => {
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
        if (leftNum === rightNum) return 0;
        return leftNum > rightNum ? 1 : -1;
    }
    const leftText = normalizeText(left == null ? '' : String(left));
    const rightText = normalizeText(right == null ? '' : String(right));
    return leftText.localeCompare(rightText, 'en', { sensitivity: 'base' });
};

const formatExpressionValue = (value: unknown): string => {
    if (value == null) return '';
    if (value instanceof Date) return value.toLocaleDateString('en-GB');
    if (typeof value === 'number') return formatCellValue(value, 'number');
    if (typeof value === 'boolean') return formatCellValue(value, 'boolean');
    if (Array.isArray(value)) return value.map((entry) => formatExpressionValue(entry)).join(', ');
    return String(value);
};

const normalizeLayoutElement = (raw: unknown): ReportTemplateLayoutElement | null => {
    if (!raw || typeof raw !== 'object') return null;
    const input = raw as Partial<ReportTemplateLayoutElement>;
    const type = input.type;
    if (type !== 'text' && type !== 'field' && type !== 'line' && type !== 'box') return null;
    const id = normalizeText(String(input.id ?? ''));
    if (!id) return null;
    const xMm = Number(input.xMm ?? 0);
    const yMm = Number(input.yMm ?? 0);
    const widthMm = Number(input.widthMm ?? 1);
    const heightMm = Number(input.heightMm ?? 1);
    if (!Number.isFinite(xMm) || !Number.isFinite(yMm) || !Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return null;
    return {
        id,
        type,
        xMm,
        yMm,
        widthMm: Math.max(1, widthMm),
        heightMm: Math.max(1, heightMm),
        text: typeof input.text === 'string' ? input.text : undefined,
        fieldKey: typeof input.fieldKey === 'string' ? input.fieldKey : undefined,
        fontSizePt: Number.isFinite(Number(input.fontSizePt)) ? Number(input.fontSizePt) : undefined,
        fontWeight: input.fontWeight === 'bold' ? 'bold' : input.fontWeight === 'normal' ? 'normal' : undefined,
        textAlign: input.textAlign === 'center' || input.textAlign === 'right' || input.textAlign === 'left' ? input.textAlign : undefined,
        borderWidth: Number.isFinite(Number(input.borderWidth)) ? Number(input.borderWidth) : undefined
    };
};

const normalizeLayout = (raw: unknown): ReportTemplateLayout | null => {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw as { version?: unknown; elements?: unknown };
    const elements = Array.isArray(payload.elements)
        ? payload.elements.map(normalizeLayoutElement).filter((element): element is ReportTemplateLayoutElement => Boolean(element))
        : [];
    if (!elements.length) return null;
    const version = Number(payload.version ?? 1);
    return {
        version: Number.isFinite(version) && version > 0 ? version : 1,
        elements
    };
};

const resolvePageSettings = (raw: string | null | undefined): TemplatePageSettings => {
    const parsed = safeParseJson<{
        pageSize?: string;
        orientation?: string;
        margins?: { top?: unknown; right?: unknown; bottom?: unknown; left?: unknown };
        layout?: unknown;
        reportDefinition?: unknown;
    }>(raw, {});
    const pageSizeKey = normalizeKey(parsed.pageSize);
    const pageSize: TemplatePageSettings['pageSize'] =
        pageSizeKey === 'a5' ? 'A5' : pageSizeKey === 'letter' ? 'Letter' : pageSizeKey === 'legal' ? 'Legal' : 'A4';
    const orientation: TemplatePageSettings['orientation'] = normalizeKey(parsed.orientation) === 'landscape' ? 'landscape' : 'portrait';
    const marginTop = clamp(toFiniteNumber(parsed.margins?.top) ?? 12, 0, 50);
    const marginRight = clamp(toFiniteNumber(parsed.margins?.right) ?? 12, 0, 50);
    const marginBottom = clamp(toFiniteNumber(parsed.margins?.bottom) ?? 18, 0, 50);
    const marginLeft = clamp(toFiniteNumber(parsed.margins?.left) ?? 12, 0, 50);
    return {
        pageSize,
        orientation,
        margins: {
            top: marginTop,
            right: marginRight,
            bottom: marginBottom,
            left: marginLeft
        },
        layout: normalizeLayout(parsed.layout),
        reportDefinition: normalizeReportDefinition(parsed.reportDefinition)
    };
};

const resolvePrintSettings = (raw: string | null | undefined): TemplatePrintSettings => {
    const parsed = safeParseJson<{
        headerText?: unknown;
        footerText?: unknown;
        showCompanyHeader?: unknown;
        showRowNumbers?: unknown;
        showTotalsRow?: unknown;
        renderMode?: unknown;
        companyNameOverride?: unknown;
        companyAddressOverride?: unknown;
        companyLogoUrl?: unknown;
        companyLogoWidthMm?: unknown;
        companyHeaderAlign?: unknown;
        companyNameFontSizePt?: unknown;
        companyAddressFontSizePt?: unknown;
        showHeaderDivider?: unknown;
    }>(raw, {});
    const headerText = normalizeText(typeof parsed.headerText === 'string' ? parsed.headerText : '');
    const footerText = normalizeText(typeof parsed.footerText === 'string' ? parsed.footerText : '') || 'Page';
    const showCompanyHeader = parsed.showCompanyHeader !== false;
    const showRowNumbers = Boolean(parsed.showRowNumbers);
    const renderModeRaw = normalizeKey(typeof parsed.renderMode === 'string' ? parsed.renderMode : '');
    const renderMode: TemplatePrintSettings['renderMode'] =
        renderModeRaw === 'legacy_invoice_ledger'
            ? 'legacy_invoice_ledger'
            : renderModeRaw === 'legacy_loading_sheet'
              ? 'legacy_loading_sheet'
              : 'standard';
    const companyNameOverride = normalizeText(typeof parsed.companyNameOverride === 'string' ? parsed.companyNameOverride : '');
    const companyAddressOverride = normalizeText(typeof parsed.companyAddressOverride === 'string' ? parsed.companyAddressOverride : '');
    const companyLogoUrl = normalizeText(typeof parsed.companyLogoUrl === 'string' ? parsed.companyLogoUrl : '');
    const companyLogoWidthMm = clamp(toFiniteNumber(parsed.companyLogoWidthMm) ?? 18, 8, 80);
    const alignText = normalizeKey(typeof parsed.companyHeaderAlign === 'string' ? parsed.companyHeaderAlign : '');
    const companyHeaderAlign: TemplatePrintSettings['companyHeaderAlign'] =
        alignText === 'left' ? 'left' : alignText === 'right' ? 'right' : 'center';
    const companyNameFontSizePt = clamp(toFiniteNumber(parsed.companyNameFontSizePt) ?? 15, 8, 28);
    const companyAddressFontSizePt = clamp(toFiniteNumber(parsed.companyAddressFontSizePt) ?? 11, 7, 20);
    const showHeaderDivider = parsed.showHeaderDivider === true;
    const showTotalsRow = parsed.showTotalsRow === true;
    return {
        headerText,
        footerText,
        showCompanyHeader,
        showRowNumbers,
        renderMode,
        companyNameOverride,
        companyAddressOverride,
        companyLogoUrl,
        companyLogoWidthMm,
        companyHeaderAlign,
        companyNameFontSizePt,
        companyAddressFontSizePt,
        showHeaderDivider,
        showTotalsRow
    };
};

const pickTemplate = (templates: ReportTemplateRow[], usageKeys: string[]): ReportTemplateRow | null => {
    if (!templates.length) return null;
    const requestedUsages = usageKeys.map((value) => normalizeKey(value)).filter(Boolean);
    for (const usageKey of requestedUsages) {
        const matches = templates.filter((row) => normalizeKey(row.usageKey) === usageKey);
        if (!matches.length) continue;
        return matches.find((row) => Boolean(row.isDefaultFlag)) ?? matches[0];
    }
    return templates.find((row) => Boolean(row.isDefaultFlag)) ?? templates[0];
};

const pickDataSource = (
    dataSources: ReportDataSourceRow[],
    moduleKey: string,
    dataSourceKey: string | null | undefined
): ReportDataSourceRow | null => {
    if (!dataSources.length) return null;
    const moduleMatch = normalizeKey(moduleKey);
    const matchingModuleDataSources = dataSources.filter((row) => normalizeKey(row.moduleKey) === moduleMatch);
    const preferredSet = matchingModuleDataSources.length ? matchingModuleDataSources : dataSources;
    const preferredKey = normalizeKey(dataSourceKey);
    if (preferredKey) {
        const preferred = preferredSet.find((row) => normalizeKey(row.dataSourceKey) === preferredKey);
        if (preferred) return preferred;
    }
    return preferredSet[0] ?? null;
};

const resolveColumns = (dataSource: ReportDataSourceRow, selectedFields: SelectedFieldConfig[]): ResolvedTemplateColumn[] => {
    const allFields = Array.isArray(dataSource.fields) ? dataSource.fields : [];
    if (!allFields.length) return [];
    const fieldsByKey = new Map<string, ReportDataSourceField>();
    allFields.forEach((field) => {
        const normalized = normalizeKey(field.key);
        if (!normalized || fieldsByKey.has(normalized)) return;
        fieldsByKey.set(normalized, field);
    });

    const fallbackFields: SelectedFieldConfig[] = allFields.slice(0, 8).map((field) => ({ key: field.key }));
    const requested = selectedFields.length ? selectedFields : fallbackFields;
    const seen = new Set<string>();
    const columns: ResolvedTemplateColumn[] = [];
    requested.forEach((selectedField) => {
        const key = normalizeText(selectedField.key);
        const normalized = normalizeKey(key);
        if (!normalized || seen.has(normalized)) return;
        const field = fieldsByKey.get(normalized);
        if (!field) return;
        seen.add(normalized);
        const dataType = normalizeText(selectedField.dataType) || normalizeText(field.dataType) || 'string';
        const alignFromField = selectedField.align;
        const align: ResolvedTemplateColumn['align'] =
            alignFromField ?? (normalizeKey(dataType) === 'number' ? 'right' : 'left');
        columns.push({
            key: normalizeText(field.key),
            label: normalizeText(selectedField.label) || normalizeText(field.label) || normalizeText(field.key),
            dataType,
            path: normalizeText(selectedField.path) || normalizeText(field.path) || normalizeText(field.key),
            align,
            widthMm: selectedField.widthMm != null ? clamp(selectedField.widthMm, 8, 120) : null,
            includeTotal: selectedField.includeTotal === true
        });
    });
    return columns;
};

const PAGE_DIMENSIONS_MM: Record<TemplatePageSettings['pageSize'], { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    Letter: { width: 216, height: 279 },
    Legal: { width: 216, height: 356 }
};

const sanitizeImageUrl = (value: string): string => {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    if (normalized.startsWith('data:image/')) return normalized;
    if (normalized.startsWith('https://') || normalized.startsWith('http://') || normalized.startsWith('/')) return normalized;
    return '';
};

const sanitizeFontFamily = (value: string | null | undefined) => {
    const normalized = normalizeText(value);
    if (!normalized) return 'Segoe UI, Arial, sans-serif';
    return /^[A-Za-z0-9\s"',-]+$/.test(normalized) ? normalized : 'Segoe UI, Arial, sans-serif';
};

const buildCompanyHeaderBlock = (args: {
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) => {
    const companyName = normalizeText(args.printSettings.companyNameOverride) || normalizeText(args.companyName);
    const companyAddress = normalizeText(args.printSettings.companyAddressOverride) || normalizeText(args.companyAddress);
    const logoUrl = sanitizeImageUrl(args.printSettings.companyLogoUrl);
    if (!args.printSettings.showCompanyHeader) {
        return { html: '', hasContent: false };
    }
    if (!companyName && !companyAddress && !logoUrl) {
        return { html: '', hasContent: false };
    }
    const alignClass =
        args.printSettings.companyHeaderAlign === 'left'
            ? 'company-header--left'
            : args.printSettings.companyHeaderAlign === 'right'
              ? 'company-header--right'
              : 'company-header--center';
    const dividerHtml = args.printSettings.showHeaderDivider ? '<div class="company-header-divider"></div>' : '';
    const logoHtml = logoUrl
        ? `<img class="company-logo" src="${escapeHtml(logoUrl)}" alt="Company Logo" style="width:${args.printSettings.companyLogoWidthMm}mm;" />`
        : '';
    const html = `
      <div class="company-header ${alignClass}">
        <div class="company-header-row">
          ${logoHtml}
          <div class="company-header-text">
            ${companyName ? `<div class="company-name" style="font-size:${args.printSettings.companyNameFontSizePt}pt;">${escapeHtml(companyName)}</div>` : ''}
            ${companyAddress ? `<div class="company-address" style="font-size:${args.printSettings.companyAddressFontSizePt}pt;">${escapeHtml(companyAddress)}</div>` : ''}
          </div>
        </div>
        ${dividerHtml}
      </div>
    `;
    return { html, hasContent: true };
};

const buildTablePrintHtml = (args: {
    documentTitle: string;
    companyName?: string | null;
    companyAddress?: string | null;
    subtitle?: string;
    pageSettings: TemplatePageSettings;
    printSettings: TemplatePrintSettings;
    columns: ResolvedTemplateColumn[];
    rows: Array<Record<string, unknown>>;
}) => {
    const titleText = normalizeText(args.printSettings.headerText) || normalizeText(args.documentTitle) || 'Report';
    const subtitleText = normalizeText(args.subtitle);
    const companyHeader = buildCompanyHeaderBlock({
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings
    });
    const tableHeadCells = [
        args.printSettings.showRowNumbers ? '<th class="row-index-cell">#</th>' : '',
        ...args.columns.map((column) => {
            const widthStyle = column.widthMm != null ? ` style="width:${column.widthMm}mm"` : '';
            const alignClass =
                column.align === 'right'
                    ? ' col-align-right'
                    : column.align === 'center'
                      ? ' col-align-center'
                      : ' col-align-left';
            return `<th class="${alignClass.trim()}"${widthStyle}>${escapeHtml(column.label)}</th>`;
        })
    ].join('');

    const tableBodyRows = args.rows
        .map((row, rowIndex) => {
            const cells = args.columns
                .map((column) => {
                    const byPath = resolveValueByPath(row, column.path);
                    const byKey = byPath !== undefined ? byPath : resolveValueByPath(row, column.key);
                    const display = formatCellValue(byKey, column.dataType);
                    const alignClass =
                        column.align === 'right'
                            ? 'col-align-right'
                            : column.align === 'center'
                              ? 'col-align-center'
                              : 'col-align-left';
                    return `<td class="${alignClass}">${escapeHtml(display)}</td>`;
                })
                .join('');
            const indexCell = args.printSettings.showRowNumbers ? `<td class="row-index-cell">${rowIndex + 1}</td>` : '';
            return `<tr>${indexCell}${cells}</tr>`;
        })
        .join('');

    const shouldShowTotals = args.printSettings.showTotalsRow && args.rows.length > 0;
    const totalsRowHtml = (() => {
        if (!shouldShowTotals) return '';
        let labelPlaced = false;
        const cells = args.columns
            .map((column) => {
                const isNumeric = normalizeKey(column.dataType) === 'number';
                const includeTotal = column.includeTotal || isNumeric;
                const alignClass =
                    column.align === 'right'
                        ? 'col-align-right'
                        : column.align === 'center'
                          ? 'col-align-center'
                          : 'col-align-left';
                if (!includeTotal) {
                    if (!labelPlaced) {
                        labelPlaced = true;
                        return `<td class="${alignClass} totals-label-cell"><strong>Total</strong></td>`;
                    }
                    return `<td class="${alignClass}"></td>`;
                }
                const sum = args.rows.reduce((acc, row) => {
                    const value = resolveValueByPath(row, column.path) ?? resolveValueByPath(row, column.key);
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? acc + parsed : acc;
                }, 0);
                const display = formatCellValue(sum, 'number');
                return `<td class="${alignClass}"><strong>${escapeHtml(display)}</strong></td>`;
            })
            .join('');
        const indexCell = args.printSettings.showRowNumbers ? `<td class="row-index-cell"></td>` : '';
        return `<tr class="totals-row">${indexCell}${cells}</tr>`;
    })();

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(normalizeText(args.documentTitle) || 'Report')}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #475569;
        --line: #dbe2ea;
        --head-bg: #eef3f8;
        --zebra-bg: #f8fafc;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${args.pageSettings.pageSize} ${args.pageSettings.orientation};
        margin: ${args.pageSettings.margins.top}mm ${args.pageSettings.margins.right}mm ${args.pageSettings.margins.bottom}mm ${args.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 11px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header {
        margin-bottom: 4px;
      }
      .company-header-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .company-header--left .company-header-row {
        justify-content: flex-start;
      }
      .company-header--center .company-header-row {
        justify-content: center;
      }
      .company-header--right .company-header-row {
        justify-content: flex-end;
      }
      .company-header-text {
        display: flex;
        flex-direction: column;
      }
      .company-name {
        font-weight: 700;
      }
      .company-address {
        margin-top: 1px;
        color: var(--muted);
      }
      .company-logo {
        max-height: 24mm;
        object-fit: contain;
      }
      .company-header-divider {
        margin-top: 2px;
        border-top: 1px solid #d3dde8;
      }
      .report-title {
        text-align: center;
        font-weight: 700;
        font-size: 13px;
        margin: 0 0 3px;
      }
      .report-subtitle {
        text-align: center;
        color: var(--muted);
        margin: 0 0 8px;
        white-space: pre-line;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
        padding: 5px 6px;
      }
      thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      tbody tr:nth-child(even) td {
        background: var(--zebra-bg);
      }
      .row-index-cell {
        width: 34px;
        text-align: right;
      }
      .col-align-left { text-align: left; }
      .col-align-center { text-align: center; }
      .col-align-right { text-align: right; }
      .totals-row td {
        background: #e8eef6 !important;
        border-top: 2px solid #9fb3ca;
      }
      .totals-label-cell {
        font-weight: 700;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 10px;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${companyHeader.html}
    <h1 class="report-title">${escapeHtml(titleText)}</h1>
    ${subtitleText ? `<p class="report-subtitle">${escapeHtml(subtitleText)}</p>` : ''}
    <div class="report-footer">${escapeHtml(args.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
    <table>
      <thead>
        <tr>${tableHeadCells}</tr>
      </thead>
      <tbody>
        ${tableBodyRows}
        ${totalsRowHtml}
      </tbody>
    </table>
  </body>
</html>`;
};

const buildLayoutPrintHtml = (args: {
    documentTitle: string;
    companyName?: string | null;
    companyAddress?: string | null;
    subtitle?: string;
    pageSettings: TemplatePageSettings;
    printSettings: TemplatePrintSettings;
    columns: ResolvedTemplateColumn[];
    rows: Array<Record<string, unknown>>;
    layout: ReportTemplateLayout;
}) => {
    const titleText = normalizeText(args.printSettings.headerText) || normalizeText(args.documentTitle) || 'Report';
    const subtitleText = normalizeText(args.subtitle);
    const companyHeader = buildCompanyHeaderBlock({
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings
    });
    const pageBase = PAGE_DIMENSIONS_MM[args.pageSettings.pageSize];
    const pageWidthMm = args.pageSettings.orientation === 'landscape' ? pageBase.height : pageBase.width;
    const pageHeightMm = args.pageSettings.orientation === 'landscape' ? pageBase.width : pageBase.height;
    const contentWidthMm = Math.max(20, pageWidthMm - args.pageSettings.margins.left - args.pageSettings.margins.right);
    const baseHeightMm = Math.max(30, pageHeightMm - args.pageSettings.margins.top - args.pageSettings.margins.bottom);
    const maxElementBottom = args.layout.elements.reduce((max, element) => Math.max(max, Number(element.yMm || 0) + Number(element.heightMm || 0)), 0);
    const contentHeightMm = Math.max(baseHeightMm, maxElementBottom + 4);
    const dataTypeByKey = new Map(args.columns.map((column) => [normalizeKey(column.key), column.dataType]));

    const pagesHtml = args.rows
        .map((row, rowIndex) => {
            const elementsHtml = args.layout.elements
                .map((element) => {
                    const leftMm = Number(element.xMm ?? 0);
                    const topMm = Number(element.yMm ?? 0);
                    const widthMm = Math.max(1, Number(element.widthMm ?? 1));
                    const heightMm = Math.max(1, Number(element.heightMm ?? 1));
                    const fontSize = clamp(Number(element.fontSizePt ?? 10), 6, 28);
                    const fontWeight = element.fontWeight === 'bold' ? '700' : '400';
                    const textAlign = element.textAlign === 'center' || element.textAlign === 'right' ? element.textAlign : 'left';
                    const borderWidth = clamp(Number(element.borderWidth ?? 0), 0, 3);
                    const styleBits = [
                        `position:absolute`,
                        `left:${leftMm}mm`,
                        `top:${topMm}mm`,
                        `width:${widthMm}mm`,
                        `height:${heightMm}mm`,
                        `font-size:${fontSize}pt`,
                        `font-weight:${fontWeight}`,
                        `text-align:${textAlign}`,
                        `overflow:hidden`,
                        `white-space:nowrap`,
                        `text-overflow:ellipsis`
                    ];

                    if (element.type === 'line') {
                        styleBits.push(`border-top:${Math.max(0.5, borderWidth || 1)}pt solid #1f2937`);
                        styleBits.push(`height:0`);
                        return `<div class="layout-element layout-line" style="${styleBits.join(';')}"></div>`;
                    }

                    if (element.type === 'box') {
                        styleBits.push(`border:${Math.max(0.5, borderWidth || 1)}pt solid #1f2937`);
                    } else if (borderWidth > 0) {
                        styleBits.push(`border:${borderWidth}pt solid #334155`);
                    }
                    styleBits.push(`padding:0.3mm 0.6mm`);

                    let contentText = '';
                    if (element.type === 'text') {
                        contentText = normalizeText(element.text);
                    } else if (element.type === 'field') {
                        const fieldKey = normalizeText(element.fieldKey);
                        const resolved = resolveValueByPath(row, fieldKey);
                        const fieldType = dataTypeByKey.get(normalizeKey(fieldKey)) ?? 'string';
                        contentText = formatCellValue(resolved, fieldType);
                    }

                    return `<div class="layout-element layout-${escapeHtml(element.type)}" style="${styleBits.join(';')}">${escapeHtml(contentText)}</div>`;
                })
                .join('');

            const perPageSubtitle =
                args.rows.length > 1
                    ? `${subtitleText ? `${subtitleText} | ` : ''}Record ${rowIndex + 1} of ${args.rows.length}`
                    : subtitleText;

            return `
        <section class="layout-page">
          ${companyHeader.html}
          <h1 class="report-title">${escapeHtml(titleText)}</h1>
          ${perPageSubtitle ? `<p class="report-subtitle">${escapeHtml(perPageSubtitle)}</p>` : ''}
          <div class="layout-canvas">${elementsHtml}</div>
        </section>
      `;
        })
        .join('');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(normalizeText(args.documentTitle) || 'Report')}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #475569;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${args.pageSettings.pageSize} ${args.pageSettings.orientation};
        margin: ${args.pageSettings.margins.top}mm ${args.pageSettings.margins.right}mm ${args.pageSettings.margins.bottom}mm ${args.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 10pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header {
        margin-bottom: 1.5mm;
      }
      .company-header-row {
        display: flex;
        align-items: center;
        gap: 2mm;
      }
      .company-header--left .company-header-row {
        justify-content: flex-start;
      }
      .company-header--center .company-header-row {
        justify-content: center;
      }
      .company-header--right .company-header-row {
        justify-content: flex-end;
      }
      .company-header-text {
        display: flex;
        flex-direction: column;
      }
      .company-name {
        font-weight: 700;
      }
      .company-address {
        margin-top: 0.8mm;
        color: var(--muted);
      }
      .company-logo {
        max-height: 24mm;
        object-fit: contain;
      }
      .company-header-divider {
        margin-top: 1mm;
        border-top: 1px solid #d3dde8;
      }
      .report-title {
        margin: 0 0 1mm;
        text-align: center;
        font-size: 12pt;
      }
      .report-subtitle {
        margin: 0 0 2mm;
        text-align: center;
        color: var(--muted);
        font-size: 9pt;
      }
      .layout-page {
        page-break-after: always;
      }
      .layout-page:last-of-type {
        page-break-after: auto;
      }
      .layout-canvas {
        position: relative;
        width: ${contentWidthMm}mm;
        min-height: ${contentHeightMm}mm;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${pagesHtml}
    <div class="report-footer">${escapeHtml(args.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
  </body>
</html>`;
};

const asObjectRecord = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
};

const asStringValue = (value: unknown): string => normalizeText(typeof value === 'string' ? value : String(value ?? ''));

const asNumberValue = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatLegacyAmount = (value: unknown): string => {
    const parsed = asNumberValue(value);
    if (!Number.isFinite(parsed)) return '';
    return parsed.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatLegacyQuantity = (value: unknown): string => {
    const parsed = asNumberValue(value);
    if (!Number.isFinite(parsed)) return '';
    if (Math.abs(parsed % 1) < 0.000001) return String(Math.trunc(parsed));
    return parsed.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    });
};

const toMultilineHtml = (value: string): string => {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    return escapeHtml(normalized).replace(/\n+/g, '<br />');
};

type LegacyInvoiceLedgerLine = {
    sNo: number;
    item: string;
    itemF: string;
    remark: string;
    typeDetails: string;
    taxRate: number;
    mrp: number;
    qty: number;
    unitQ: string;
    free: number;
    unitF: string;
    productDiscAmt: number;
    rate: number;
    qtyxRate: number;
};

const resolveLegacyInvoiceLedgerLines = (row: Record<string, unknown>): LegacyInvoiceLedgerLine[] => {
    const linesRaw = row.lines;
    if (!Array.isArray(linesRaw)) return [];
    return linesRaw
        .map((entry, index) => {
            const line = asObjectRecord(entry);
            const sNo = Math.max(1, Math.trunc(asNumberValue(line.sNo || index + 1)));
            return {
                sNo,
                item: asStringValue(line.item),
                itemF: asStringValue(line.itemF),
                remark: asStringValue(line.remark),
                typeDetails: asStringValue(line.typeDetails),
                taxRate: asNumberValue(line.taxRate),
                mrp: asNumberValue(line.mrp),
                qty: asNumberValue(line.qty),
                unitQ: asStringValue(line.unitQ),
                free: asNumberValue(line.free),
                unitF: asStringValue(line.unitF),
                productDiscAmt: asNumberValue(line.productDiscAmt),
                rate: asNumberValue(line.rate),
                qtyxRate: asNumberValue(line.qtyxRate)
            };
        })
        .filter((line) => line.item || Math.abs(line.qty) > 0.000001 || Math.abs(line.qtyxRate) > 0.000001);
};

const buildLegacyItemCellHtml = (line: LegacyInvoiceLedgerLine): string => {
    const baseItem = line.item || 'Item';
    const firstLine = line.remark ? `${baseItem} (${line.remark})` : baseItem;
    const parts = [firstLine];
    if (line.typeDetails) {
        parts.push(line.typeDetails);
    }
    if (line.free > 0 && line.itemF && normalizeKey(line.itemF) !== normalizeKey(baseItem)) {
        parts.push(line.itemF);
    }
    return parts.map((part) => escapeHtml(part)).join('<br />');
};

const buildLegacyInvoiceLedgerHtml = (args: {
    documentTitle: string;
    companyName?: string | null;
    companyAddress?: string | null;
    subtitle?: string;
    pageSettings: TemplatePageSettings;
    printSettings: TemplatePrintSettings;
    rows: Array<Record<string, unknown>>;
}) => {
    const titleText = normalizeText(args.printSettings.headerText) || normalizeText(args.documentTitle) || 'Invoice';
    const subtitleText = normalizeText(args.subtitle);
    const companyHeader = buildCompanyHeaderBlock({
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings
    });

    const pagesHtml = args.rows
        .map((rawRow, rowIndex) => {
            const row = asObjectRecord(rawRow);
            const lines = resolveLegacyInvoiceLedgerLines(row);
            if (!lines.length) return '';

            const voucherNumber = asStringValue(row.voucherNumber);
            const voucherDate = asStringValue(row.voucherDateText);
            const ledger = asStringValue(row.ledger);
            const address1 = asStringValue(row.address1);
            const city = asStringValue(row.city);
            const tinNo = asStringValue(row.tinNo);
            const amountInWords = asStringValue(row.amountInWords);
            const taxs = asStringValue(row.taxs);
            const addAmts = asStringValue(row.addAmts);
            const taxableAmts = asStringValue(row.taxableAmts);
            const creditNoteText = asStringValue(row.creditNoteText);
            const debitNoteText = asStringValue(row.debitNoteText);
            const irn = asStringValue(row.irn);
            const totalTaxationAmt = asNumberValue(row.totalTaxationAmt);
            const totalAdditionalTaxAmt = asNumberValue(row.totalAdditionalTaxAmt);
            const ledgerAdditionalTax = asStringValue(row.ledgerAdditionalTax);
            const schemeColumnVisible = lines.some((line) => Math.abs(line.productDiscAmt) > 0.000001);

            const tableHeaderHtml = `
              <tr>
                <th class="col-sno">S.No.</th>
                <th class="col-item">Item</th>
                <th class="col-tax">Tax %</th>
                <th class="col-num">MRP</th>
                <th class="col-num">Qty</th>
                <th class="col-num">Free</th>
                ${schemeColumnVisible ? '<th class="col-num">Scheme</th>' : ''}
                <th class="col-num">Rate</th>
                <th class="col-num">Qty x Rate</th>
              </tr>
            `;

            const tableRowsHtml = lines
                .map((line) => {
                    const qtyText = [formatLegacyQuantity(line.qty), line.unitQ].filter(Boolean).join(' ').trim();
                    const freeText =
                        line.free > 0
                            ? [formatLegacyQuantity(line.free), line.unitF].filter(Boolean).join(' ').trim()
                            : '';
                    const schemeText = line.productDiscAmt > 0 ? formatLegacyAmount(line.productDiscAmt) : '';
                    return `
                  <tr>
                    <td class="col-sno">${escapeHtml(String(line.sNo))}</td>
                    <td class="col-item">${buildLegacyItemCellHtml(line)}</td>
                    <td class="col-tax col-num">${Math.abs(line.taxRate) > 0.000001 ? formatLegacyAmount(line.taxRate) : ''}</td>
                    <td class="col-num">${Math.abs(line.mrp) > 0.000001 ? formatLegacyAmount(line.mrp) : ''}</td>
                    <td class="col-num">${escapeHtml(qtyText)}</td>
                    <td class="col-num">${escapeHtml(freeText)}</td>
                    ${schemeColumnVisible ? `<td class="col-num">${escapeHtml(schemeText)}</td>` : ''}
                    <td class="col-num">${formatLegacyAmount(line.rate)}</td>
                    <td class="col-num">${formatLegacyAmount(line.qtyxRate)}</td>
                  </tr>
                `;
                })
                .join('');

            const summaryHead = [
                'Amount',
                'Scheme',
                'Ext. Sch.',
                'Replacement',
                'CD',
                'Sp. Less',
                'Gross Amt'
            ];
            const summaryValues = [
                formatLegacyAmount(row.totalQtyxRate),
                formatLegacyAmount(row.totalProDisAmt),
                formatLegacyAmount(row.totalDisplayAmt),
                formatLegacyAmount(row.totalReplacementAmt),
                formatLegacyAmount(row.totalCashDisAmt),
                formatLegacyAmount(row.totalLessSpecialAmt),
                formatLegacyAmount(row.totalGrossAmt)
            ];
            const gstLabel = totalAdditionalTaxAmt > 0 ? `GST / ${ledgerAdditionalTax || 'Additional Tax'}` : 'GST';
            const gstValue =
                totalAdditionalTaxAmt > 0
                    ? `${formatLegacyAmount(totalTaxationAmt)} / ${formatLegacyAmount(totalAdditionalTaxAmt)}`
                    : formatLegacyAmount(totalTaxationAmt);
            const irnText = irn ? `IRN: ${irn}` : rowIndex < args.rows.length - 1 ? 'Continued...' : '';

            return `
          <section class="legacy-invoice-page">
            ${companyHeader.html}
            <h1 class="legacy-title">${escapeHtml(titleText)}</h1>
            ${subtitleText ? `<p class="legacy-subtitle">${escapeHtml(subtitleText)}</p>` : ''}
            <div class="legacy-header-grid">
              <div class="legacy-header-cell">
                <div class="legacy-label">Party</div>
                <div class="legacy-value legacy-value-bold">${escapeHtml(ledger)}</div>
                <div class="legacy-value">${escapeHtml([address1, city].filter(Boolean).join(', '))}</div>
              </div>
              <div class="legacy-header-cell legacy-header-cell--right">
                <div class="legacy-label">Invoice No</div>
                <div class="legacy-value legacy-value-bold">${escapeHtml(voucherNumber)}</div>
                <div class="legacy-label">Date: <span class="legacy-value">${escapeHtml(voucherDate)}</span></div>
                ${tinNo ? `<div class="legacy-label">GSTIN: <span class="legacy-value">${escapeHtml(tinNo)}</span></div>` : ''}
              </div>
            </div>
            <table class="legacy-lines-table">
              <thead>${tableHeaderHtml}</thead>
              <tbody>${tableRowsHtml}</tbody>
            </table>
            <div class="legacy-summary-grid">
              ${summaryHead.map((label) => `<div class="legacy-summary-head-cell">${escapeHtml(label)}</div>`).join('')}
              ${summaryValues.map((value) => `<div class="legacy-summary-value-cell">${escapeHtml(value)}</div>`).join('')}
              <div class="legacy-summary-head-cell">${escapeHtml(gstLabel)}</div>
              <div class="legacy-summary-value-cell legacy-summary-value-cell--wide">${escapeHtml(gstValue)}</div>
              <div class="legacy-summary-head-cell">Net Amt</div>
              <div class="legacy-summary-value-cell legacy-summary-value-cell--net">${escapeHtml(formatLegacyAmount(row.totalNetAmt))}</div>
            </div>
            <div class="legacy-footer-grid">
              <div class="legacy-tax-breakup">
                <div class="legacy-tax-col">
                  <div class="legacy-tax-title">Tax</div>
                  <div class="legacy-tax-value">${toMultilineHtml(taxs)}</div>
                </div>
                <div class="legacy-tax-col">
                  <div class="legacy-tax-title">Add Amt</div>
                  <div class="legacy-tax-value legacy-tax-value--right">${toMultilineHtml(addAmts)}</div>
                </div>
                <div class="legacy-tax-col">
                  <div class="legacy-tax-title">Taxable Amt</div>
                  <div class="legacy-tax-value legacy-tax-value--right">${toMultilineHtml(taxableAmts)}</div>
                </div>
              </div>
              <div class="legacy-words">${escapeHtml(amountInWords)}</div>
            </div>
            ${
                [creditNoteText, debitNoteText]
                    .filter(Boolean)
                    .map((line) => `<div class="legacy-note-line">${escapeHtml(line)}</div>`)
                    .join('') || ''
            }
            ${irnText ? `<div class="legacy-irn">${escapeHtml(irnText)}</div>` : ''}
          </section>
        `;
        })
        .join('');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(normalizeText(args.documentTitle) || 'Invoice')}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #cfd8e3;
        --head-bg: #eef3f8;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${args.pageSettings.pageSize} ${args.pageSettings.orientation};
        margin: ${args.pageSettings.margins.top}mm ${args.pageSettings.margins.right}mm ${args.pageSettings.margins.bottom}mm ${args.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Courier New", Courier, monospace;
        font-size: 8.5pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header { margin-bottom: 2mm; }
      .company-header-row { display: flex; align-items: center; gap: 2mm; }
      .company-header--left .company-header-row { justify-content: flex-start; }
      .company-header--center .company-header-row { justify-content: center; }
      .company-header--right .company-header-row { justify-content: flex-end; }
      .company-header-text { display: flex; flex-direction: column; }
      .company-name { font-weight: 700; }
      .company-address { margin-top: 0.7mm; color: var(--muted); }
      .company-logo { max-height: 24mm; object-fit: contain; }
      .company-header-divider { margin-top: 1mm; border-top: 1px solid #d3dde8; }
      .legacy-invoice-page {
        page-break-after: always;
        padding-bottom: 2mm;
      }
      .legacy-invoice-page:last-of-type {
        page-break-after: auto;
      }
      .legacy-title {
        margin: 0 0 1mm;
        text-align: center;
        font-size: 11pt;
      }
      .legacy-subtitle {
        margin: 0 0 1.5mm;
        text-align: center;
        color: var(--muted);
        font-size: 8pt;
      }
      .legacy-header-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2mm;
        margin-bottom: 1.5mm;
      }
      .legacy-header-cell {
        border: 1px solid var(--line);
        padding: 1mm 1.2mm;
        min-height: 14mm;
      }
      .legacy-header-cell--right {
        text-align: right;
      }
      .legacy-label {
        color: var(--muted);
        font-size: 8pt;
      }
      .legacy-value {
        margin-top: 0.2mm;
      }
      .legacy-value-bold {
        font-weight: 700;
      }
      .legacy-lines-table {
        width: 100%;
        border-collapse: collapse;
      }
      .legacy-lines-table th,
      .legacy-lines-table td {
        border: 1px solid var(--line);
        padding: 0.8mm 1mm;
        vertical-align: top;
      }
      .legacy-lines-table thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      .legacy-lines-table .col-sno {
        width: 6%;
        text-align: right;
      }
      .legacy-lines-table .col-item {
        width: 35%;
      }
      .legacy-lines-table .col-tax {
        width: 8%;
      }
      .legacy-lines-table .col-num {
        text-align: right;
        white-space: nowrap;
      }
      .legacy-summary-grid {
        margin-top: 1.5mm;
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        border: 1px solid var(--line);
        border-right: none;
        border-bottom: none;
      }
      .legacy-summary-head-cell,
      .legacy-summary-value-cell {
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        padding: 0.8mm 1mm;
      }
      .legacy-summary-head-cell {
        background: var(--head-bg);
        font-weight: 700;
        text-align: center;
      }
      .legacy-summary-value-cell {
        text-align: right;
      }
      .legacy-summary-value-cell--wide {
        grid-column: span 3;
      }
      .legacy-summary-value-cell--net {
        font-weight: 700;
        font-size: 10pt;
      }
      .legacy-footer-grid {
        margin-top: 1.5mm;
        display: grid;
        grid-template-columns: 45% 55%;
        gap: 1.5mm;
      }
      .legacy-tax-breakup {
        display: grid;
        grid-template-columns: 32% 34% 34%;
        border: 1px solid var(--line);
        min-height: 14mm;
      }
      .legacy-tax-col {
        border-right: 1px solid var(--line);
      }
      .legacy-tax-col:last-child {
        border-right: none;
      }
      .legacy-tax-title {
        background: var(--head-bg);
        border-bottom: 1px solid var(--line);
        padding: 0.7mm 0.9mm;
        font-weight: 700;
      }
      .legacy-tax-value {
        padding: 0.9mm;
        white-space: pre-line;
      }
      .legacy-tax-value--right {
        text-align: right;
      }
      .legacy-words {
        border: 1px solid var(--line);
        padding: 1mm 1.2mm;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        text-align: right;
        font-weight: 700;
      }
      .legacy-note-line {
        margin-top: 1mm;
      }
      .legacy-irn {
        margin-top: 1mm;
        text-align: center;
        color: var(--muted);
        font-size: 7.5pt;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${pagesHtml}
    <div class="report-footer">${escapeHtml(args.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
  </body>
</html>`;
};

const buildLegacyLoadingSheetHtml = (args: {
    documentTitle: string;
    companyName?: string | null;
    companyAddress?: string | null;
    subtitle?: string;
    pageSettings: TemplatePageSettings;
    printSettings: TemplatePrintSettings;
    rows: Array<Record<string, unknown>>;
}) => {
    const titleText = normalizeText(args.printSettings.headerText) || normalizeText(args.documentTitle) || 'Loading Sheet';
    const subtitleText = normalizeText(args.subtitle);
    const companyHeader = buildCompanyHeaderBlock({
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings
    });

    const normalizedRows = args.rows.map((rawRow, index) => {
        const row = asObjectRecord(rawRow);
        return {
            sNo: index + 1,
            item: asStringValue(row.item),
            typeDetails: asStringValue(row.typeDetails),
            mrp: asNumberValue(row.mrp),
            qty: asNumberValue(row.qty),
            free: asNumberValue(row.free),
            totalQty: asNumberValue(row.totalQty),
            netAmt: asNumberValue(row.netAmt),
            invoices: asStringValue(row.invoices)
        };
    });

    const totals = normalizedRows.reduce(
        (acc, row) => ({
            qty: acc.qty + row.qty,
            free: acc.free + row.free,
            totalQty: acc.totalQty + row.totalQty,
            netAmt: acc.netAmt + row.netAmt
        }),
        { qty: 0, free: 0, totalQty: 0, netAmt: 0 }
    );

    const invoicesText = Array.from(
        new Set(
            normalizedRows
                .flatMap((row) =>
                    row.invoices
                        .split(',')
                        .map((value) => normalizeText(value))
                        .filter(Boolean)
                )
        )
    ).join(', ');

    const rowsHtml = normalizedRows
        .map(
            (row) => `
          <tr>
            <td class="col-sno">${row.sNo}</td>
            <td class="col-item">${escapeHtml(row.item)}${row.typeDetails ? `<br /><span class="type-details">${escapeHtml(row.typeDetails)}</span>` : ''}</td>
            <td class="col-num">${Math.abs(row.mrp) > 0.000001 ? formatLegacyAmount(row.mrp) : ''}</td>
            <td class="col-num">${formatLegacyQuantity(row.qty)}</td>
            <td class="col-num">${formatLegacyQuantity(row.free)}</td>
            <td class="col-num">${formatLegacyQuantity(row.totalQty)}</td>
            <td class="col-num">${formatLegacyAmount(row.netAmt)}</td>
          </tr>
        `
        )
        .join('');

    const pageHtml = `
      <section class="legacy-loading-page">
        ${companyHeader.html}
        <h1 class="legacy-loading-title">${escapeHtml(titleText)}</h1>
        ${subtitleText ? `<p class="legacy-loading-subtitle">${escapeHtml(subtitleText)}</p>` : ''}
        <table class="legacy-loading-table">
          <thead>
            <tr>
              <th class="col-sno">S. No.</th>
              <th class="col-item">Item</th>
              <th class="col-num">MRP</th>
              <th class="col-num">Qty</th>
              <th class="col-num">Free</th>
              <th class="col-num">Total Qty</th>
              <th class="col-num">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td></td>
              <td class="col-item"><strong>Total</strong></td>
              <td></td>
              <td class="col-num"><strong>${escapeHtml(formatLegacyQuantity(totals.qty))}</strong></td>
              <td class="col-num"><strong>${escapeHtml(formatLegacyQuantity(totals.free))}</strong></td>
              <td class="col-num"><strong>${escapeHtml(formatLegacyQuantity(totals.totalQty))}</strong></td>
              <td class="col-num"><strong>${escapeHtml(formatLegacyAmount(totals.netAmt))}</strong></td>
            </tr>
            <tr class="invoice-row">
              <td></td>
              <td class="col-item"><strong>Invoices</strong><br /><span class="type-details">${escapeHtml(invoicesText || '-')}</span></td>
              <td colspan="5"></td>
            </tr>
          </tbody>
        </table>
      </section>
    `;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(normalizeText(args.documentTitle) || 'Loading Sheet')}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #cfd8e3;
        --head-bg: #eef3f8;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${args.pageSettings.pageSize} ${args.pageSettings.orientation};
        margin: ${args.pageSettings.margins.top}mm ${args.pageSettings.margins.right}mm ${args.pageSettings.margins.bottom}mm ${args.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 10px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header { margin-bottom: 4px; }
      .company-header-row { display: flex; align-items: center; gap: 8px; }
      .company-header--left .company-header-row { justify-content: flex-start; }
      .company-header--center .company-header-row { justify-content: center; }
      .company-header--right .company-header-row { justify-content: flex-end; }
      .company-header-text { display: flex; flex-direction: column; }
      .company-name { font-weight: 700; }
      .company-address { margin-top: 1px; color: var(--muted); }
      .company-logo { max-height: 24mm; object-fit: contain; }
      .company-header-divider { margin-top: 2px; border-top: 1px solid #d3dde8; }
      .legacy-loading-page {
        page-break-after: always;
      }
      .legacy-loading-page:last-of-type {
        page-break-after: auto;
      }
      .legacy-loading-title {
        margin: 0;
        text-align: center;
        font-size: 14px;
      }
      .legacy-loading-subtitle {
        margin: 2px 0 8px;
        text-align: center;
        color: var(--muted);
      }
      .legacy-loading-table {
        width: 100%;
        border-collapse: collapse;
      }
      .legacy-loading-table th,
      .legacy-loading-table td {
        border: 1px solid var(--line);
        padding: 5px 6px;
      }
      .legacy-loading-table thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      .legacy-loading-table .col-sno {
        width: 48px;
        text-align: right;
      }
      .legacy-loading-table .col-item {
        width: 36%;
      }
      .legacy-loading-table .col-num {
        text-align: right;
        white-space: nowrap;
      }
      .legacy-loading-table .type-details {
        color: var(--muted);
      }
      .legacy-loading-table .total-row td {
        background: #eef4fb;
      }
      .legacy-loading-table .invoice-row td {
        background: #f8fbff;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${pageHtml}
    <div class="report-footer">${escapeHtml(args.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
  </body>
</html>`;
};

const resolveDefinitionFieldValue = (args: {
    fieldKey: string;
    row: Record<string, unknown>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) => {
    const key = normalizeKey(args.fieldKey);
    if (!key) return undefined;
    if (key === '$companyname' || key === 'companyname') {
        return normalizeText(args.printSettings.companyNameOverride) || normalizeText(args.companyName);
    }
    if (key === '$companyaddress' || key === 'companyaddress') {
        return normalizeText(args.printSettings.companyAddressOverride) || normalizeText(args.companyAddress);
    }
    if (key === '$documenttitle' || key === 'documenttitle') {
        return normalizeText(args.documentTitle);
    }
    if (key === '$subtitle' || key === 'subtitle') {
        return normalizeText(args.subtitle);
    }
    if (key === '$pagenumber' || key === 'pagenumber') {
        return PAGE_NUMBER_TOKEN;
    }
    if (key === '$totalpages' || key === 'totalpages') {
        return TOTAL_PAGES_TOKEN;
    }
    return resolveValueByPath(args.row, args.fieldKey);
};

const resolveDefinitionImageUrl = (args: {
    sourceKind: 'url' | 'company_logo' | 'field';
    url: string;
    fieldKey: string;
    expression: string;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) => {
    if (args.sourceKind === 'company_logo') {
        return sanitizeImageUrl(args.printSettings.companyLogoUrl);
    }
    if (args.sourceKind === 'field') {
        const rawValue = args.expression.trim()
            ? evaluateReportExpression({
                  expression: args.expression,
                  row: args.row,
                  rows: args.rows,
                  rowIndex: args.rowIndex,
                  fieldTypes: args.fieldTypes,
                  documentTitle: args.documentTitle,
                  subtitle: args.subtitle,
                  companyName: args.companyName,
                  companyAddress: args.companyAddress,
                  printSettings: args.printSettings
              })
            : resolveDefinitionFieldValue({
                  fieldKey: args.fieldKey,
                  row: args.row,
                  documentTitle: args.documentTitle,
                  subtitle: args.subtitle,
                  companyName: args.companyName,
                  companyAddress: args.companyAddress,
                  printSettings: args.printSettings
              });
        return sanitizeImageUrl(toExpressionText(rawValue));
    }
    return sanitizeImageUrl(args.url);
};

const evaluateReportExpression = (args: {
    expression: string;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}): unknown => {
    const expressionText = normalizeText(args.expression);
    if (!expressionText) return undefined;
    const parsed = parseReportExpression(expressionText);
    const evalNode = (node: ReportExpressionNode): unknown => {
        if (node.kind === 'string' || node.kind === 'number' || node.kind === 'boolean') return node.value;
        if (node.kind === 'null') return null;
        if (node.kind === 'identifier') {
            return resolveDefinitionFieldValue({
                fieldKey: node.name,
                row: args.row,
                documentTitle: args.documentTitle,
                subtitle: args.subtitle,
                companyName: args.companyName,
                companyAddress: args.companyAddress,
                printSettings: args.printSettings
            });
        }
        const fn = normalizeKey(node.name);
        const values = node.args.map((entry) => evalNode(entry));
        const pathArg = node.args[0]
            ? node.args[0].kind === 'identifier'
                ? normalizeText(node.args[0].name)
                : node.args[0].kind === 'string'
                  ? normalizeText(node.args[0].value)
                  : normalizeText(toExpressionText(values[0]))
            : '';
        const getFieldType = (fieldKey: string) => args.fieldTypes.get(normalizeKey(fieldKey)) ?? 'string';
        const valuesForField = (fieldKey: string) => (fieldKey ? args.rows.map((row) => resolveValueByPath(row, fieldKey)) : []);

        if (fn === 'field' || fn === 'fields') {
            return pathArg
                ? resolveDefinitionFieldValue({
                      fieldKey: pathArg,
                      row: args.row,
                      documentTitle: args.documentTitle,
                      subtitle: args.subtitle,
                      companyName: args.companyName,
                      companyAddress: args.companyAddress,
                      printSettings: args.printSettings
                  })
                : undefined;
        }
        if (fn === 'sum') {
            return valuesForField(pathArg).reduce<number>((acc, value) => {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? acc + parsed : acc;
            }, 0);
        }
        if (fn === 'avg') {
            const numbers = valuesForField(pathArg)
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value));
            if (!numbers.length) return 0;
            return numbers.reduce((acc, value) => acc + value, 0) / numbers.length;
        }
        if (fn === 'min' || fn === 'max') {
            const valuesList = valuesForField(pathArg).filter((value) => value != null);
            if (!valuesList.length) return undefined;
            return valuesList.reduce((best, current) => {
                if (best == null) return current;
                const comparison = compareForSort(best, current, getFieldType(pathArg), 'asc');
                return fn === 'min' ? (comparison <= 0 ? best : current) : comparison >= 0 ? best : current;
            }, valuesList[0]);
        }
        if (fn === 'first') {
            return pathArg && args.rows.length > 0 ? resolveValueByPath(args.rows[0], pathArg) : undefined;
        }
        if (fn === 'last') {
            return pathArg && args.rows.length > 0 ? resolveValueByPath(args.rows[args.rows.length - 1], pathArg) : undefined;
        }
        if (fn === 'count') {
            if (!pathArg) return args.rows.length;
            return valuesForField(pathArg).filter((value) => normalizeText(toExpressionText(value)).length > 0).length;
        }
        if (fn === 'distinctcount') {
            if (!pathArg) return 0;
            return new Set(valuesForField(pathArg).map((value) => normalizeText(toExpressionText(value)))).size;
        }
        if (fn === 'concat') {
            return values.map((value) => formatExpressionValue(value)).join('');
        }
        if (fn === 'coalesce') {
            return values.find((value) => {
                if (value == null) return false;
                if (typeof value === 'string') return normalizeText(value).length > 0;
                return true;
            });
        }
        if (fn === 'if') {
            return toExpressionBoolean(values[0]) ? values[1] : values[2];
        }
        if (fn === 'eq') return compareExpressionValues(values[0], values[1]) === 0;
        if (fn === 'ne') return compareExpressionValues(values[0], values[1]) !== 0;
        if (fn === 'gt') return compareExpressionValues(values[0], values[1]) > 0;
        if (fn === 'gte') return compareExpressionValues(values[0], values[1]) >= 0;
        if (fn === 'lt') return compareExpressionValues(values[0], values[1]) < 0;
        if (fn === 'lte') return compareExpressionValues(values[0], values[1]) <= 0;
        if (fn === 'and') return values.every((value) => toExpressionBoolean(value));
        if (fn === 'or') return values.some((value) => toExpressionBoolean(value));
        if (fn === 'not') return !toExpressionBoolean(values[0]);
        if (fn === 'number') {
            const parsed = Number(values[0]);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        if (fn === 'round') {
            const parsed = Number(values[0]);
            const digits = Math.max(0, Math.min(6, Number(values[1] ?? 0)));
            if (!Number.isFinite(parsed)) return 0;
            const factor = 10 ** digits;
            return Math.round(parsed * factor) / factor;
        }
        if (fn === 'abs') {
            const parsed = Number(values[0]);
            return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
        }
        if (fn === 'upper') return toExpressionText(values[0]).toUpperCase();
        if (fn === 'lower') return toExpressionText(values[0]).toLowerCase();
        if (fn === 'trim') return toExpressionText(values[0]).trim();
        if (fn === 'formatnumber') {
            const parsed = Number(values[0]);
            if (!Number.isFinite(parsed)) return '';
            const digits = Math.max(0, Math.min(6, Number(values[1] ?? 2)));
            return parsed.toLocaleString(undefined, {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            });
        }
        if (fn === 'formatdate') {
            const value = values[0];
            if (value instanceof Date) return value.toLocaleDateString('en-GB');
            const parsed = value == null ? null : new Date(String(value));
            return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString('en-GB') : '';
        }
        if (fn === 'rownumber') return args.rowIndex;
        if (fn === 'rowscount') return args.rows.length;
        if (fn === 'companyname') return normalizeText(args.printSettings.companyNameOverride) || normalizeText(args.companyName);
        if (fn === 'companyaddress') return normalizeText(args.printSettings.companyAddressOverride) || normalizeText(args.companyAddress);
        if (fn === 'documenttitle') return normalizeText(args.documentTitle);
        if (fn === 'subtitle') return normalizeText(args.subtitle);
        if (fn === 'pagenumber') return PAGE_NUMBER_TOKEN;
        if (fn === 'totalpages') return TOTAL_PAGES_TOKEN;
        throw new Error(`Unsupported expression function "${node.name}".`);
    };

    try {
        return evalNode(parsed);
    } catch {
        return '#Error';
    }
};

const compareForSort = (left: unknown, right: unknown, dataType: string, direction: 'asc' | 'desc') => {
    const order = direction === 'desc' ? -1 : 1;
    const normalizedType = normalizeKey(dataType);
    if (normalizedType === 'number') {
        const leftNum = Number(left);
        const rightNum = Number(right);
        const safeLeft = Number.isFinite(leftNum) ? leftNum : 0;
        const safeRight = Number.isFinite(rightNum) ? rightNum : 0;
        if (safeLeft === safeRight) return 0;
        return safeLeft > safeRight ? order : -order;
    }
    const leftText = normalizeText(left == null ? '' : String(left));
    const rightText = normalizeText(right == null ? '' : String(right));
    return leftText.localeCompare(rightText, 'en', { sensitivity: 'base' }) * order;
};

const sortRowsByDefinitions = (
    rows: Array<Record<string, unknown>>,
    sorts: Array<{ fieldKey: string; direction: 'asc' | 'desc' }>,
    fieldTypes: Map<string, string>
) => {
    if (!sorts.length) return [...rows];
    return [...rows].sort((left, right) => {
        for (const sort of sorts) {
            const fieldKey = normalizeText(sort.fieldKey);
            if (!fieldKey) continue;
            const dataType = fieldTypes.get(normalizeKey(fieldKey)) ?? 'string';
            const result = compareForSort(
                resolveValueByPath(left, fieldKey),
                resolveValueByPath(right, fieldKey),
                dataType,
                sort.direction
            );
            if (result !== 0) return result;
        }
        return 0;
    });
};

const alignClassFromValue = (align: ReportTextAlign | 'left' | 'center' | 'right') =>
    align === 'right' ? 'col-align-right' : align === 'center' ? 'col-align-center' : 'col-align-left';

const renderDefinitionTableItem = (args: {
    item: ReportTableItem;
    rows: Array<Record<string, unknown>>;
    fieldTypes: Map<string, string>;
    printSettings: TemplatePrintSettings;
}) => {
    const valuesMatch = (left: unknown, right: unknown, dataType: string) => {
        if (left == null && right == null) return true;
        if (left == null || right == null) return false;
        if (dataType === 'number') {
            const leftNumber = Number(left);
            const rightNumber = Number(right);
            if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
                return Math.abs(leftNumber - rightNumber) < 0.000001;
            }
        }
        return normalizeText(String(left)) === normalizeText(String(right));
    };

    const tableRows = sortRowsByDefinitions(
        args.rows,
        args.item.sorts.map((sort) => ({ fieldKey: sort.fieldKey, direction: sort.direction })),
        args.fieldTypes
    );
    const computeColumnRowSpans = (rows: Array<Record<string, unknown>>) =>
        args.item.columns.map((column) => {
            const spans = new Array<number>(rows.length).fill(1);
            if (column.repeatValue !== false) {
                return spans;
            }
            let startIndex = 0;
            while (startIndex < rows.length) {
                const dataType = args.fieldTypes.get(normalizeKey(column.fieldKey)) ?? 'string';
                const startValue = resolveValueByPath(rows[startIndex], column.fieldKey);
                let endIndex = startIndex + 1;
                while (endIndex < rows.length) {
                    const nextValue = resolveValueByPath(rows[endIndex], column.fieldKey);
                    if (!valuesMatch(startValue, nextValue, dataType)) {
                        break;
                    }
                    endIndex += 1;
                }
                spans[startIndex] = endIndex - startIndex;
                for (let hiddenIndex = startIndex + 1; hiddenIndex < endIndex; hiddenIndex += 1) {
                    spans[hiddenIndex] = 0;
                }
                startIndex = endIndex;
            }
            return spans;
        });
    const renderDetailRows = (rows: Array<Record<string, unknown>>) => {
        const columnSpans = computeColumnRowSpans(rows);
        return rows
            .map((row, rowIndex) => {
                const cells = args.item.columns
                    .map((column, columnIndex) => {
                        const value = resolveValueByPath(row, column.fieldKey);
                        const dataType = args.fieldTypes.get(normalizeKey(column.fieldKey)) ?? 'string';
                        const rowSpan = columnSpans[columnIndex]?.[rowIndex] ?? 1;
                        if (rowSpan === 0) {
                            return '';
                        }
                        const displayValue = formatCellValue(value, dataType);
                        const rowSpanAttribute = rowSpan > 1 ? ` rowspan="${rowSpan}"` : '';
                        return `<td class="${alignClassFromValue(column.align)}"${rowSpanAttribute}>${escapeHtml(displayValue)}</td>`;
                    })
                    .join('');
                const rowIndexCell = args.printSettings.showRowNumbers ? `<td class="row-index-cell">${rowIndex + 1}</td>` : '';
                return `<tr>${rowIndexCell}${cells}</tr>`;
            })
            .join('');
    };

    const renderTotalsRowCells = (rows: Array<Record<string, unknown>>, label: string) => {
        const cells = args.item.columns
            .map((column, columnIndex) => {
                const dataType = args.fieldTypes.get(normalizeKey(column.fieldKey)) ?? 'string';
                const alignClass = alignClassFromValue(column.align);
                if (!column.includeTotal) {
                    return columnIndex === 0
                        ? `<td class="${alignClass}"><strong>${escapeHtml(label)}</strong></td>`
                        : `<td class="${alignClass}"></td>`;
                }
                const sum = rows.reduce((acc, row) => {
                    const parsed = Number(resolveValueByPath(row, column.fieldKey));
                    return Number.isFinite(parsed) ? acc + parsed : acc;
                }, 0);
                return `<td class="${alignClass}"><strong>${escapeHtml(formatCellValue(sum, dataType))}</strong></td>`;
            })
            .join('');
        const rowIndexCell = args.printSettings.showRowNumbers ? '<td class="row-index-cell"></td>' : '';
        return `${rowIndexCell}${cells}`;
    };

    const renderTotalsRow = (rows: Array<Record<string, unknown>>, label: string, className: string) => {
        return `<tr class="${className}">${renderTotalsRowCells(rows, label)}</tr>`;
    };

    const buildGroupBodyClassName = (group: typeof args.item.rowGroups[number], depth: number) =>
        [
            'definition-table-group',
            `definition-table-group--depth-${depth}`,
            group.pageBreakBefore ? 'definition-table-group--page-break-before' : '',
            group.pageBreakAfter ? 'definition-table-group--page-break-after' : '',
            group.keepTogether ? 'definition-table-group--keep-together' : ''
        ]
            .filter(Boolean)
            .join(' ');

    const buildGroupHeaderRowClassName = (group: typeof args.item.rowGroups[number], depth: number) =>
        [
            'group-header-row',
            `group-header-row--depth-${depth}`,
            group.keepWithNext ? 'group-header-row--keep-with-next' : '',
            group.pageBreakBefore ? 'group-header-row--page-break-before' : ''
        ]
            .filter(Boolean)
            .join(' ');

    const buildGroupSubtotalRowClassName = (group: typeof args.item.rowGroups[number], depth: number) =>
        [
            'group-subtotal-row',
            `group-subtotal-row--depth-${depth}`,
            group.pageBreakAfter ? 'group-subtotal-row--page-break-after' : ''
        ]
            .filter(Boolean)
            .join(' ');

    const renderGroupedRows = (rows: Array<Record<string, unknown>>, depth: number): string => {
        const group = args.item.rowGroups[depth];
        if (!group) return renderDetailRows(rows);
        const buckets = new Map<string, { value: unknown; rows: Array<Record<string, unknown>> }>();
        rows.forEach((row) => {
            const rawValue = resolveValueByPath(row, group.fieldKey);
            const bucketKey = rawValue == null ? '__null__' : String(rawValue);
            const existing = buckets.get(bucketKey) ?? { value: rawValue, rows: [] };
            existing.rows.push(row);
            buckets.set(bucketKey, existing);
        });
        const orderedBuckets = Array.from(buckets.values()).sort((left, right) =>
            compareForSort(left.value, right.value, args.fieldTypes.get(normalizeKey(group.fieldKey)) ?? 'string', group.sortDirection)
        );
        return orderedBuckets
            .map((entry) => {
                const nestedRows =
                    depth + 1 < args.item.rowGroups.length ? renderGroupedRows(entry.rows, depth + 1) : renderDetailRows(entry.rows);
                const headerRow = group.showHeader
                    ? `<tr class="${buildGroupHeaderRowClassName(group, depth)}"><td colspan="${args.item.columns.length + (args.printSettings.showRowNumbers ? 1 : 0)}"><strong>${escapeHtml(group.label || group.fieldKey)}</strong>: ${escapeHtml(
                          formatCellValue(entry.value, args.fieldTypes.get(normalizeKey(group.fieldKey)) ?? 'string')
                      )}</td></tr>`
                    : '';
                const subtotalRow = group.showSubtotal
                    ? renderTotalsRow(entry.rows, group.subtotalLabel || 'Subtotal', buildGroupSubtotalRowClassName(group, depth))
                    : '';
                const groupRowsHtml = `${headerRow}${nestedRows}${subtotalRow}`;
                return depth === 0 ? `<tbody class="${buildGroupBodyClassName(group, depth)}">${groupRowsHtml}</tbody>` : groupRowsHtml;
            })
            .join('');
    };

    const theadHtml = args.item.showHeader
        ? `<thead><tr>${args.printSettings.showRowNumbers ? '<th class="row-index-cell">#</th>' : ''}${args.item.columns
              .map((column) => `<th class="${alignClassFromValue(column.align)}" style="width:${column.widthMm}mm">${escapeHtml(column.label)}</th>`)
              .join('')}</tr></thead>`
        : '';
    const bodyRowsHtml =
        args.item.rowGroups.length > 0 ? renderGroupedRows(tableRows, 0) : `<tbody>${renderDetailRows(tableRows)}</tbody>`;
    const grandTotalHtml = args.item.showGrandTotal
        ? `<tbody><tr class="grand-total-row">${renderTotalsRowCells(tableRows, 'Total')}</tr></tbody>`
        : '';
    return `
      <div class="definition-table-wrap">
        <table class="definition-table${args.item.zebraStriping ? ' definition-table--zebra' : ''}">
          ${theadHtml}
          ${bodyRowsHtml}
          ${grandTotalHtml}
        </table>
      </div>
    `;
};

const renderDefinitionListDetailItem = (args: {
    item: ReportListDetailItem;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) => {
    const context: DefinitionValueContext = {
        row: args.row,
        rows: args.rows,
        rowIndex: args.rowIndex,
        fieldTypes: args.fieldTypes,
        documentTitle: args.documentTitle,
        subtitle: args.subtitle,
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings
    };
    if (
        isDefinitionItemHidden({
            hiddenExpression: args.item.hiddenExpression,
            row: args.row,
            rows: args.rows,
            rowIndex: args.rowIndex,
            fieldTypes: args.fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings
        })
    ) {
        return '';
    }
    const resolvedStyles = resolveDefinitionItemStyleOverrides({
        item: args.item,
        context
    });
    const styleBits = [
        'position:absolute',
        `left:${args.item.xMm}mm`,
        `top:${args.item.yMm}mm`,
        `width:${args.item.widthMm}mm`,
        `font-size:${args.item.fontSizePt}pt`,
        `font-weight:${resolvedStyles.fontWeight === 'bold' ? 700 : 400}`,
        `text-align:${args.item.textAlign}`,
        `color:${resolvedStyles.textColor}`
    ];
    if (args.item.keepTogether) {
        styleBits.push('break-inside:avoid');
        styleBits.push('page-break-inside:avoid');
    }
    if (args.item.pageBreakBefore) {
        styleBits.push('break-before:page');
        styleBits.push('page-break-before:always');
    }
    if (args.item.pageBreakAfter) {
        styleBits.push('break-after:page');
        styleBits.push('page-break-after:always');
    }
    if (args.item.type !== 'line' && args.item.type !== 'text' && args.item.type !== 'field') {
        styleBits.push(`min-height:${args.item.heightMm}mm`);
    }
    if (args.item.type === 'rectangle') {
        styleBits.push(`border:${Math.max(0.5, args.item.borderWidth || 1)}pt solid ${resolvedStyles.borderColor}`);
    } else if (args.item.borderWidth > 0) {
        styleBits.push(`border:${args.item.borderWidth}pt solid ${resolvedStyles.borderColor}`);
    }
    if (resolvedStyles.fillColor && resolvedStyles.fillColor !== 'transparent' && args.item.type !== 'line') {
        styleBits.push(`background:${resolvedStyles.fillColor}`);
    }
    if (args.item.type === 'line') {
        styleBits.push('height:0');
        styleBits.push(`border-top:${Math.max(0.5, args.item.borderWidth || 1)}pt solid ${resolvedStyles.borderColor}`);
        return `<div class="definition-item definition-item--line" style="${styleBits.join(';')}"></div>`;
    }
    if (args.item.type === 'text') {
        styleBits.push('padding:0.4mm 0.6mm');
        styleBits.push('white-space:pre-wrap');
        const display = resolveDefinitionTextItemDisplay(args.item, context);
        const renderedHeightMm = resolveTextLikeRenderedHeightMm({
            display,
            widthMm: args.item.widthMm,
            fontSizePt: args.item.fontSizePt,
            heightMm: args.item.heightMm,
            canGrow: args.item.canGrow,
            canShrink: args.item.canShrink
        });
        styleBits.push(args.item.canGrow ? `min-height:${renderedHeightMm}mm` : `height:${renderedHeightMm}mm`);
        if (!args.item.canGrow) {
            styleBits.push('overflow:hidden');
        }
        return `<div class="definition-item definition-item--text" style="${styleBits.join(';')}">${renderEscapedTextWithSystemTokens(display)}</div>`;
    }
    if (args.item.type === 'field') {
        const display = resolveDefinitionFieldItemDisplay(args.item, context);
        styleBits.push('padding:0.4mm 0.6mm');
        styleBits.push('white-space:pre-wrap');
        const renderedHeightMm = resolveTextLikeRenderedHeightMm({
            display,
            widthMm: args.item.widthMm,
            fontSizePt: args.item.fontSizePt,
            heightMm: args.item.heightMm,
            canGrow: args.item.canGrow,
            canShrink: args.item.canShrink
        });
        styleBits.push(args.item.canGrow ? `min-height:${renderedHeightMm}mm` : `height:${renderedHeightMm}mm`);
        if (!args.item.canGrow) {
            styleBits.push('overflow:hidden');
        }
        return `<div class="definition-item definition-item--field" style="${styleBits.join(';')}">${renderEscapedTextWithSystemTokens(display)}</div>`;
    }
    if (args.item.type === 'image') {
        const imageUrl = resolveDefinitionImageUrl({
            sourceKind: args.item.sourceKind,
            url: args.item.url,
            fieldKey: args.item.fieldKey,
            expression: args.item.expression,
            row: args.row,
            rows: args.rows,
            rowIndex: args.rowIndex,
            fieldTypes: args.fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings
        });
        styleBits.push('display:flex');
        styleBits.push('align-items:center');
        styleBits.push('justify-content:center');
        if (!imageUrl) {
            styleBits.push('padding:0.4mm 0.6mm');
            return `<div class="definition-item definition-item--image" style="${styleBits.join(';')}">Image</div>`;
        }
        return `<div class="definition-item definition-item--image" style="${styleBits.join(';')}"><img src="${escapeHtml(
            imageUrl
        )}" alt="" style="width:100%; height:${args.item.heightMm}mm; object-fit:${args.item.fit};" /></div>`;
    }
    styleBits.push('padding:0.4mm 0.6mm');
    return `<div class="definition-item definition-item--rectangle" style="${styleBits.join(';')}"></div>`;
};

const renderDefinitionListItem = (args: {
    item: ReportListItem;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) => {
    const detailRows = resolveDefinitionListRows(args.item, args.row, args.rows);
    const rowsHtml = detailRows
        .map((row, rowIndex) => {
            const renderedRowHeightMm = computeDefinitionListRowHeightMm({
                item: args.item,
                row,
                rows: detailRows,
                rowIndex: rowIndex + 1,
                fieldTypes: args.fieldTypes,
                documentTitle: args.documentTitle,
                subtitle: args.subtitle,
                companyName: args.companyName,
                companyAddress: args.companyAddress,
                printSettings: args.printSettings
            });
            const detailItemsHtml = args.item.items
                .map((detailItem) =>
                    renderDefinitionListDetailItem({
                        item: detailItem,
                        row,
                        rows: detailRows,
                        rowIndex: rowIndex + 1,
                        fieldTypes: args.fieldTypes,
                        documentTitle: args.documentTitle,
                        subtitle: args.subtitle,
                        companyName: args.companyName,
                        companyAddress: args.companyAddress,
                        printSettings: args.printSettings
                    })
                )
                .join('');
            const rowStyle = [
                'position:relative',
                `min-height:${renderedRowHeightMm}mm`,
                'break-inside:avoid',
                'page-break-inside:avoid',
                args.item.gapMm > 0 && rowIndex < detailRows.length - 1 ? `margin-bottom:${args.item.gapMm}mm` : '',
                args.item.showRowDivider && rowIndex < detailRows.length - 1 ? `border-bottom:${Math.max(0.5, args.item.borderWidth || 0.5)}pt solid ${args.item.borderColor}` : '',
                args.item.zebraStriping && rowIndex % 2 === 1 ? 'background:rgba(148,163,184,0.08)' : ''
            ]
                .filter(Boolean)
                .join(';');
            return `<div class="definition-list-row" style="${rowStyle}">${detailItemsHtml}</div>`;
        })
        .join('');
    return `<div class="definition-list-wrap">${rowsHtml}</div>`;
};

const resolveDefinitionListRows = (
    item: ReportListItem,
    row: Record<string, unknown>,
    rows: Array<Record<string, unknown>>
) => {
    const sourcePath = normalizeText(item.sourcePath);
    if (!sourcePath) {
        return rows.length > 0 ? rows : [{}];
    }
    const nestedRows = resolveValueByPath(row, sourcePath);
    return Array.isArray(nestedRows)
        ? nestedRows.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        : [{}];
};

const estimateDefinitionItemHeight = (
    item: ReportItem,
    row: Record<string, unknown>,
    rows: Array<Record<string, unknown>>,
    rowIndex: number,
    fieldTypes: Map<string, string>,
    documentTitle: string,
    subtitle: string | undefined,
    companyName: string | null | undefined,
    companyAddress: string | null | undefined,
    printSettings: TemplatePrintSettings
) => {
    const context: DefinitionValueContext = {
        row,
        rows,
        rowIndex: 1,
        fieldTypes,
        documentTitle,
        subtitle,
        companyName,
        companyAddress,
        printSettings
    };
    if (
        isDefinitionItemHidden({
            hiddenExpression: item.hiddenExpression,
            row,
            rows,
            rowIndex,
            fieldTypes,
            documentTitle,
            subtitle,
            companyName,
            companyAddress,
            printSettings
        })
    ) {
        return 0;
    }
    if (item.type === 'table') {
        return item.heightMm + 20;
    }
    if (item.type === 'list') {
        const detailRows = resolveDefinitionListRows(item, row, rows);
        const contentHeightMm = detailRows.reduce((totalHeight, detailRow, detailRowIndex) => {
            const rowHeightMm = computeDefinitionListRowHeightMm({
                item,
                row: detailRow,
                rows: detailRows,
                rowIndex: detailRowIndex + 1,
                fieldTypes,
                documentTitle,
                subtitle,
                companyName,
                companyAddress,
                printSettings
            });
            return totalHeight + rowHeightMm + (detailRowIndex < detailRows.length - 1 ? item.gapMm : 0);
        }, 0);
        return Math.max(item.heightMm, contentHeightMm);
    }
    if (item.type === 'text') {
        return resolveTextLikeRenderedHeightMm({
            display: resolveDefinitionTextItemDisplay(item, context),
            widthMm: item.widthMm,
            fontSizePt: item.fontSizePt,
            heightMm: item.heightMm,
            canGrow: item.canGrow,
            canShrink: item.canShrink
        });
    }
    if (item.type === 'field') {
        return resolveTextLikeRenderedHeightMm({
            display: resolveDefinitionFieldItemDisplay(item, context),
            widthMm: item.widthMm,
            fontSizePt: item.fontSizePt,
            heightMm: item.heightMm,
            canGrow: item.canGrow,
            canShrink: item.canShrink
        });
    }
    return item.heightMm;
};

const renderDefinitionItem = (args: {
    item: ReportItem;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    yOffsetMm: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
}) => {
    const context: DefinitionValueContext = {
        row: args.row,
        rows: args.rows,
        rowIndex: args.rowIndex,
        fieldTypes: args.fieldTypes,
        documentTitle: args.documentTitle,
        subtitle: args.subtitle,
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings
    };
    if (
        isDefinitionItemHidden({
            hiddenExpression: args.item.hiddenExpression,
            row: args.row,
            rows: args.rows,
            rowIndex: args.rowIndex,
            fieldTypes: args.fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings
        })
    ) {
        return '';
    }
    const resolvedStyles = resolveDefinitionItemStyleOverrides({
        item: args.item,
        context
    });
    const listItem = args.item.type === 'list' ? args.item : null;
    const renderedListHeightMm =
        listItem != null
            ? Math.max(
                  listItem.heightMm,
                  resolveDefinitionListRows(listItem, args.row, args.rows).reduce((totalHeight, detailRow, detailRowIndex, detailRows) => {
                      const rowHeightMm = computeDefinitionListRowHeightMm({
                          item: listItem,
                          row: detailRow,
                          rows: detailRows,
                          rowIndex: detailRowIndex + 1,
                          fieldTypes: args.fieldTypes,
                          documentTitle: args.documentTitle,
                          subtitle: args.subtitle,
                          companyName: args.companyName,
                          companyAddress: args.companyAddress,
                          printSettings: args.printSettings
                      });
                      return totalHeight + rowHeightMm + (detailRowIndex < detailRows.length - 1 ? listItem.gapMm : 0);
                  }, 0)
              )
            : args.item.heightMm;
    const styleBits = [
        `position:absolute`,
        `left:${args.item.xMm}mm`,
        `top:${Math.max(0, args.item.yMm - args.yOffsetMm)}mm`,
        `width:${args.item.widthMm}mm`,
        `font-size:${args.item.fontSizePt}pt`,
        `font-weight:${resolvedStyles.fontWeight === 'bold' ? 700 : 400}`,
        `text-align:${args.item.textAlign}`,
        `color:${resolvedStyles.textColor}`
    ];
    if (args.item.keepTogether) {
        styleBits.push('break-inside:avoid');
        styleBits.push('page-break-inside:avoid');
    }
    if (args.item.pageBreakBefore) {
        styleBits.push('break-before:page');
        styleBits.push('page-break-before:always');
    }
    if (args.item.pageBreakAfter) {
        styleBits.push('break-after:page');
        styleBits.push('page-break-after:always');
    }
    if (args.item.type !== 'line' && args.item.type !== 'text' && args.item.type !== 'field') {
        styleBits.push(`min-height:${listItem != null ? renderedListHeightMm : args.item.heightMm}mm`);
    }
    if (args.item.type === 'rectangle' || args.item.type === 'table' || args.item.type === 'list') {
        styleBits.push(`border:${Math.max(0.5, args.item.borderWidth || 1)}pt solid ${resolvedStyles.borderColor}`);
    } else if (args.item.borderWidth > 0) {
        styleBits.push(`border:${args.item.borderWidth}pt solid ${resolvedStyles.borderColor}`);
    }
    if (resolvedStyles.fillColor && resolvedStyles.fillColor !== 'transparent' && args.item.type !== 'line') {
        styleBits.push(`background:${resolvedStyles.fillColor}`);
    }
    if (args.item.type === 'line') {
        styleBits.push(`height:0`);
        styleBits.push(`border-top:${Math.max(0.5, args.item.borderWidth || 1)}pt solid ${resolvedStyles.borderColor}`);
        return `<div class="definition-item definition-item--line" style="${styleBits.join(';')}"></div>`;
    }
    if (args.item.type === 'text') {
        styleBits.push('padding:0.4mm 0.6mm');
        styleBits.push('white-space:pre-wrap');
        const display = resolveDefinitionTextItemDisplay(args.item, context);
        const renderedHeightMm = resolveTextLikeRenderedHeightMm({
            display,
            widthMm: args.item.widthMm,
            fontSizePt: args.item.fontSizePt,
            heightMm: args.item.heightMm,
            canGrow: args.item.canGrow,
            canShrink: args.item.canShrink
        });
        styleBits.push(args.item.canGrow ? `min-height:${renderedHeightMm}mm` : `height:${renderedHeightMm}mm`);
        if (!args.item.canGrow) {
            styleBits.push('overflow:hidden');
        }
        return `<div class="definition-item definition-item--text" style="${styleBits.join(';')}">${renderEscapedTextWithSystemTokens(display)}</div>`;
    }
    if (args.item.type === 'field') {
        const display = resolveDefinitionFieldItemDisplay(args.item, context);
        styleBits.push('padding:0.4mm 0.6mm');
        styleBits.push('white-space:pre-wrap');
        const renderedHeightMm = resolveTextLikeRenderedHeightMm({
            display,
            widthMm: args.item.widthMm,
            fontSizePt: args.item.fontSizePt,
            heightMm: args.item.heightMm,
            canGrow: args.item.canGrow,
            canShrink: args.item.canShrink
        });
        styleBits.push(args.item.canGrow ? `min-height:${renderedHeightMm}mm` : `height:${renderedHeightMm}mm`);
        if (!args.item.canGrow) {
            styleBits.push('overflow:hidden');
        }
        return `<div class="definition-item definition-item--field" style="${styleBits.join(';')}">${renderEscapedTextWithSystemTokens(display)}</div>`;
    }
    if (args.item.type === 'image') {
        const imageUrl = resolveDefinitionImageUrl({
            sourceKind: args.item.sourceKind,
            url: args.item.url,
            fieldKey: args.item.fieldKey,
            expression: args.item.expression,
            row: args.row,
            rows: args.rows,
            rowIndex: args.rowIndex,
            fieldTypes: args.fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings
        });
        styleBits.push('display:flex');
        styleBits.push('align-items:center');
        styleBits.push('justify-content:center');
        if (!imageUrl) {
            styleBits.push('padding:0.4mm 0.6mm');
            return `<div class="definition-item definition-item--image" style="${styleBits.join(';')}">Image</div>`;
        }
        return `<div class="definition-item definition-item--image" style="${styleBits.join(';')}"><img src="${escapeHtml(
            imageUrl
        )}" alt="" style="width:100%; height:${args.item.heightMm}mm; object-fit:${args.item.fit};" /></div>`;
    }
    if (args.item.type === 'table') {
        styleBits.push('padding:0.8mm');
        return `<div class="definition-item definition-item--table" style="${styleBits.join(';')}">${renderDefinitionTableItem({
            item: args.item,
            rows: args.rows,
            fieldTypes: args.fieldTypes,
            printSettings: args.printSettings
        })}</div>`;
    }
    if (args.item.type === 'list') {
        styleBits.push('padding:0.8mm');
        return `<div class="definition-item definition-item--list" style="${styleBits.join(';')}">${renderDefinitionListItem({
            item: args.item,
            row: args.row,
            rows: args.rows,
            fieldTypes: args.fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings
        })}</div>`;
    }
    styleBits.push('padding:0.4mm 0.6mm');
    return `<div class="definition-item definition-item--rectangle" style="${styleBits.join(';')}"></div>`;
};

const renderDefinitionSection = (args: {
    items: ReportItem[];
    heightMm: number;
    row: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    rowIndex: number;
    fieldTypes: Map<string, string>;
    documentTitle: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    printSettings: TemplatePrintSettings;
    className: string;
    allowManualPageBreaks?: boolean;
}) => {
    if (!args.items.length) return '';
    const visibleItems = args.items.filter(
        (item) =>
            !isDefinitionItemHidden({
                hiddenExpression: item.hiddenExpression,
                row: args.row,
                rows: args.rows,
                rowIndex: args.rowIndex,
                fieldTypes: args.fieldTypes,
                documentTitle: args.documentTitle,
                subtitle: args.subtitle,
                companyName: args.companyName,
                companyAddress: args.companyAddress,
                printSettings: args.printSettings
            })
    );
    if (!visibleItems.length) return '';
    const canSplitSection = args.allowManualPageBreaks !== false;
    const hasManualPageBreaks = visibleItems.some((item) => item.pageBreakBefore || item.pageBreakAfter);
    if (!canSplitSection || !hasManualPageBreaks) {
        const itemsHtml = visibleItems
            .map((item) =>
                renderDefinitionItem({
                    item,
                    row: args.row,
                    rows: args.rows,
                    rowIndex: args.rowIndex,
                    yOffsetMm: 0,
                    fieldTypes: args.fieldTypes,
                    documentTitle: args.documentTitle,
                    subtitle: args.subtitle,
                    companyName: args.companyName,
                    companyAddress: args.companyAddress,
                    printSettings: args.printSettings
                })
            )
            .join('');
        return `<section class="${args.className}" style="position:relative; min-height:${args.heightMm}mm;">${itemsHtml}</section>`;
    }
    const visibleItemsWithIndex = visibleItems.map((item, index) => ({ item, index }));
    const itemsForBreakFlow = [...visibleItemsWithIndex].sort(
        (left, right) => left.item.yMm - right.item.yMm || left.item.xMm - right.item.xMm || left.index - right.index
    );
    const fragments: Array<Array<{ item: ReportItem; index: number }>> = [];
    let currentFragment: Array<{ item: ReportItem; index: number }> = [];
    itemsForBreakFlow.forEach((entry) => {
        if (currentFragment.length > 0 && entry.item.pageBreakBefore) {
            fragments.push(currentFragment);
            currentFragment = [];
        }
        currentFragment.push(entry);
        if (entry.item.pageBreakAfter) {
            fragments.push(currentFragment);
            currentFragment = [];
        }
    });
    if (currentFragment.length > 0) {
        fragments.push(currentFragment);
    }
    return fragments
        .map((fragment, fragmentIndex) => {
            const fragmentItems = [...fragment].sort((left, right) => left.index - right.index).map((entry) => entry.item);
            const minYMm = Math.min(...fragmentItems.map((item) => item.yMm));
            const fragmentHeightMm = Math.max(
                1,
                fragmentItems.reduce((max, item) => {
                    const itemHeightMm = estimateDefinitionItemHeight(
                        item,
                        args.row,
                        args.rows,
                        args.rowIndex,
                        args.fieldTypes,
                        args.documentTitle,
                        args.subtitle,
                        args.companyName,
                        args.companyAddress,
                        args.printSettings
                    );
                    if (itemHeightMm <= 0) return max;
                    return Math.max(max, item.yMm + itemHeightMm - minYMm);
                }, 0)
            );
            const itemsHtml = fragmentItems
                .map((item) =>
                    renderDefinitionItem({
                        item,
                        row: args.row,
                        rows: args.rows,
                        rowIndex: args.rowIndex,
                        yOffsetMm: minYMm,
                        fieldTypes: args.fieldTypes,
                        documentTitle: args.documentTitle,
                        subtitle: args.subtitle,
                        companyName: args.companyName,
                        companyAddress: args.companyAddress,
                        printSettings: args.printSettings
                    })
                )
                .join('');
            const sectionStyle = [
                'position:relative',
                `min-height:${fragmentHeightMm}mm`,
                fragmentIndex > 0 ? 'break-before:page' : '',
                fragmentIndex > 0 ? 'page-break-before:always' : '',
                fragmentItems.some((item) => item.keepTogether) ? 'break-inside:avoid' : '',
                fragmentItems.some((item) => item.keepTogether) ? 'page-break-inside:avoid' : ''
            ]
                .filter(Boolean)
                .join(';');
            return `<section class="${args.className}" style="${sectionStyle}">${itemsHtml}</section>`;
        })
        .join('');
};

const buildReportDefinitionPrintHtml = (args: {
    documentTitle: string;
    companyName?: string | null;
    companyAddress?: string | null;
    subtitle?: string;
    pageSettings: TemplatePageSettings;
    printSettings: TemplatePrintSettings;
    columns: ResolvedTemplateColumn[];
    rows: Array<Record<string, unknown>>;
    reportDefinition: ReportDefinition;
}) => {
    const firstRow = args.rows[0] ?? {};
    const fieldTypes = new Map(args.columns.map((column) => [normalizeKey(column.key), column.dataType]));
    const scopeRows = args.reportDefinition.repeatPerRow ? [firstRow] : args.rows;
    const pageHeaderHtml = renderDefinitionSection({
        items: args.reportDefinition.sections.pageHeader.items,
        heightMm: args.reportDefinition.sections.pageHeader.heightMm,
        row: firstRow,
        rows: scopeRows,
        rowIndex: 1,
        fieldTypes,
        documentTitle: args.documentTitle,
        subtitle: args.subtitle,
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings,
        className: 'definition-page-header',
        allowManualPageBreaks: false
    });
    const renderDocumentSections = (row: Record<string, unknown>, rowIndex: number, rows: Array<Record<string, unknown>>) => {
        const reportHeaderHtml = renderDefinitionSection({
            items: args.reportDefinition.sections.reportHeader.items,
            heightMm: args.reportDefinition.sections.reportHeader.heightMm,
            row,
            rows,
            rowIndex,
            fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings,
            className: 'definition-report-header',
            allowManualPageBreaks: true
        });
        const bodyHtml = renderDefinitionSection({
            items: args.reportDefinition.sections.body.items,
            heightMm: Math.max(
                args.reportDefinition.sections.body.heightMm,
                args.reportDefinition.sections.body.items.reduce(
                    (max, item) => {
                        const itemHeightMm = estimateDefinitionItemHeight(
                            item,
                            row,
                            rows,
                            rowIndex,
                            fieldTypes,
                            args.documentTitle,
                            args.subtitle,
                            args.companyName,
                            args.companyAddress,
                            args.printSettings
                        );
                        if (itemHeightMm <= 0) return max;
                        return Math.max(max, item.yMm + itemHeightMm);
                    },
                    0
                )
            ),
            row,
            rows,
            rowIndex,
            fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings,
            className: 'definition-body',
            allowManualPageBreaks: true
        });
        const reportFooterHtml = renderDefinitionSection({
            items: args.reportDefinition.sections.reportFooter.items,
            heightMm: args.reportDefinition.sections.reportFooter.heightMm,
            row,
            rows,
            rowIndex,
            fieldTypes,
            documentTitle: args.documentTitle,
            subtitle: args.subtitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            printSettings: args.printSettings,
            className: 'definition-report-footer',
            allowManualPageBreaks: true
        });
        return `${reportHeaderHtml}${bodyHtml}${reportFooterHtml}`;
    };
    const reportContentHtml = args.reportDefinition.repeatPerRow
        ? args.rows
              .map((row, rowIndex) => {
                  const className =
                      rowIndex < args.rows.length - 1
                          ? 'definition-document definition-document--page-break'
                          : 'definition-document';
                  return `<section class="${className}">${renderDocumentSections(row, rowIndex + 1, [row])}</section>`;
              })
              .join('')
        : renderDocumentSections(firstRow, 1, args.rows);
    const pageFooterHtml = renderDefinitionSection({
        items: args.reportDefinition.sections.pageFooter.items,
        heightMm: args.reportDefinition.sections.pageFooter.heightMm,
        row: firstRow,
        rows: scopeRows,
        rowIndex: 1,
        fieldTypes,
        documentTitle: args.documentTitle,
        subtitle: args.subtitle,
        companyName: args.companyName,
        companyAddress: args.companyAddress,
        printSettings: args.printSettings,
        className: 'definition-page-footer',
        allowManualPageBreaks: false
    });
    const hasPageHeader = pageHeaderHtml.length > 0;
    const hasPageFooter = pageFooterHtml.length > 0;
    const showSystemFooter = normalizeText(args.printSettings.footerText).length > 0;
    const pageHeaderHeightMm = hasPageHeader ? args.reportDefinition.sections.pageHeader.heightMm : 0;
    const pageFooterHeightMm = hasPageFooter ? args.reportDefinition.sections.pageFooter.heightMm : 0;
    const systemFooterHeightMm = showSystemFooter ? 6 : 0;
    const fixedFooterHeightMm = pageFooterHeightMm + systemFooterHeightMm;
    const pageMarginTopMm = args.pageSettings.margins.top + pageHeaderHeightMm;
    const pageMarginBottomMm = args.pageSettings.margins.bottom + fixedFooterHeightMm;
    const fixedHeaderHtml = hasPageHeader
        ? `<div class="definition-fixed-header">${pageHeaderHtml}</div>`
        : '';
    const fixedFooterHtml =
        hasPageFooter || showSystemFooter
            ? `<div class="definition-fixed-footer">${hasPageFooter ? pageFooterHtml : ''}${
                  showSystemFooter
                      ? `<div class="definition-system-footer">${escapeHtml(args.printSettings.footerText)} <span class="definition-system-footer-page"></span></div>`
                      : ''
              }</div>`
            : '';

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(normalizeText(args.documentTitle) || 'Report')}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #475569;
        --line: #dbe2ea;
        --head-bg: #eef3f8;
        --zebra-bg: #f8fafc;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${args.pageSettings.pageSize} ${args.pageSettings.orientation};
        margin: ${pageMarginTopMm}mm ${args.pageSettings.margins.right}mm ${pageMarginBottomMm}mm ${args.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: ${sanitizeFontFamily(args.reportDefinition.defaultFontFamily)};
        font-size: 10pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .definition-content {
        width: 100%;
      }
      .definition-fixed-header {
        position: fixed;
        top: -${pageHeaderHeightMm}mm;
        left: 0;
        right: 0;
        height: ${pageHeaderHeightMm}mm;
        background: #fff;
        overflow: hidden;
      }
      .definition-fixed-footer {
        position: fixed;
        bottom: -${fixedFooterHeightMm}mm;
        left: 0;
        right: 0;
        min-height: ${fixedFooterHeightMm}mm;
        background: #fff;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .definition-page-header,
      .definition-report-header,
      .definition-body,
      .definition-report-footer,
      .definition-page-footer {
        width: 100%;
      }
      .definition-report-header,
      .definition-report-footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .definition-document--page-break {
        break-after: page;
        page-break-after: always;
      }
      .definition-document:last-of-type {
        break-after: auto;
        page-break-after: auto;
      }
      .definition-table {
        width: 100%;
        border-collapse: collapse;
      }
      .definition-table thead {
        display: table-header-group;
      }
      .definition-table th,
      .definition-table td {
        border: 1px solid var(--line);
        padding: 5px 6px;
        vertical-align: top;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .definition-table thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      .definition-table--zebra tbody tr:nth-child(even) td {
        background: var(--zebra-bg);
      }
      .row-index-cell {
        width: 34px;
        text-align: right;
      }
      .col-align-left { text-align: left; }
      .col-align-center { text-align: center; }
      .col-align-right { text-align: right; }
      .group-header-row td {
        background: #f1f5f9;
        font-weight: 700;
      }
      .definition-table-group--page-break-before,
      .group-header-row--page-break-before {
        break-before: page;
        page-break-before: always;
      }
      .definition-table-group--page-break-after,
      .group-subtotal-row--page-break-after {
        break-after: page;
        page-break-after: always;
      }
      .definition-table-group--keep-together {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .group-header-row--keep-with-next {
        break-after: avoid;
        page-break-after: avoid;
      }
      .group-header-row--keep-with-next + tr {
        break-before: avoid;
        page-break-before: avoid;
      }
      .group-subtotal-row td {
        background: #eef4fb;
      }
      .grand-total-row td {
        background: #e8eef6;
        border-top: 2px solid #9fb3ca;
      }
      .definition-list-row,
      .group-header-row,
      .group-subtotal-row,
      .grand-total-row {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .definition-system-footer {
        min-height: ${systemFooterHeightMm}mm;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        border-top: 1px solid var(--line);
        padding-top: 1mm;
      }
      .definition-system-token {
        display: inline-block;
        min-width: 1ch;
      }
      .definition-page-number::after,
      .definition-system-footer-page::after {
        content: counter(page);
      }
      .definition-total-pages::after {
        content: counter(pages);
      }
    </style>
  </head>
    <body>
      ${fixedHeaderHtml}
      ${fixedFooterHtml}
      <main class="definition-content">
      ${reportContentHtml}
      </main>
    </body>
</html>`;
};

const buildPrintHtml = (args: {
    documentTitle: string;
    companyName?: string | null;
    companyAddress?: string | null;
    subtitle?: string;
    pageSettings: TemplatePageSettings;
    printSettings: TemplatePrintSettings;
    columns: ResolvedTemplateColumn[];
    rows: Array<Record<string, unknown>>;
}) => {
    if (
        args.printSettings.renderMode === 'legacy_invoice_ledger'
        && args.rows.some((row) => Array.isArray(asObjectRecord(row).lines))
    ) {
        return buildLegacyInvoiceLedgerHtml({
            documentTitle: args.documentTitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            subtitle: args.subtitle,
            pageSettings: args.pageSettings,
            printSettings: args.printSettings,
            rows: args.rows
        });
    }
    if (args.printSettings.renderMode === 'legacy_loading_sheet') {
        return buildLegacyLoadingSheetHtml({
            documentTitle: args.documentTitle,
            companyName: args.companyName,
            companyAddress: args.companyAddress,
            subtitle: args.subtitle,
            pageSettings: args.pageSettings,
            printSettings: args.printSettings,
            rows: args.rows
        });
    }
    if (hasReportDefinitionContent(args.pageSettings.reportDefinition)) {
        return buildReportDefinitionPrintHtml({
            ...args,
            reportDefinition: args.pageSettings.reportDefinition as ReportDefinition
        });
    }
    if (args.pageSettings.layout && args.pageSettings.layout.elements.length > 0) {
        return buildLayoutPrintHtml({
            ...args,
            layout: args.pageSettings.layout
        });
    }
    return buildTablePrintHtml(args);
};

const openPrintWindowWithHtml = (html: string): boolean => {
    if (typeof window === 'undefined') return false;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return false;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    const triggerPrint = () => {
        printWindow.print();
    };
    if (printWindow.document.readyState === 'complete') {
        window.setTimeout(triggerPrint, 30);
    } else {
        printWindow.onload = triggerPrint;
    }
    printWindow.onafterprint = () => {
        printWindow.close();
    };
    return true;
};

export const printRowsWithTemplateDefinition = (input: ReportTemplateDefinitionPrintInput): boolean => {
    if (typeof window === 'undefined') return false;
    const rows = Array.isArray(input.rows) ? input.rows : [];
    if (!rows.length) return false;
    const hasLayout = Boolean(input.layout && Array.isArray(input.layout.elements) && input.layout.elements.length > 0);
    const hasDefinition = hasReportDefinitionContent(input.reportDefinition ?? null);
    const columns = (Array.isArray(input.columns) ? input.columns : [])
        .map((column) => {
            const key = normalizeText(column.key);
            if (!key) return null;
            return {
                key,
                label: normalizeText(column.label) || key,
                dataType: normalizeText(column.dataType) || 'string',
                path: normalizeText(column.path) || key
            } as ResolvedTemplateColumn;
        })
        .filter((column): column is ResolvedTemplateColumn => Boolean(column));
    if (!columns.length && !hasLayout && !hasDefinition) return false;

    const pageSettings = resolvePageSettings(
        JSON.stringify({
            ...(input.pageSettings ?? {}),
            layout: input.layout ?? null,
            reportDefinition: input.reportDefinition ?? null
        })
    );
    const printSettings = resolvePrintSettings(JSON.stringify(input.printSettings ?? {}));
    const html = buildPrintHtml({
        documentTitle: normalizeText(input.documentTitle) || 'Report Preview',
        companyName: input.companyName ?? null,
        companyAddress: input.companyAddress ?? null,
        subtitle: input.subtitle,
        pageSettings,
        printSettings,
        columns,
        rows
    });
    return openPrintWindowWithHtml(html);
};

export const printRowsWithReportTemplate = async (input: ReportTemplatePrintInput): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    const rows = Array.isArray(input.rows) ? input.rows : [];
    if (!rows.length) return false;

    const moduleKey = normalizeText(input.moduleKey);
    if (!moduleKey) return false;
    const usageKeys = Array.from(
        new Set(
            [...(input.usageKeys ?? []), 'print']
                .map((value) => normalizeText(value))
                .filter((value) => value.length > 0)
        )
    );

    let templates: ReportTemplateRow[] = [];
    try {
        const templatesResult = await input.apolloClient.query<ReportTemplatesQueryResult>({
            query: REPORT_TEMPLATES,
            fetchPolicy: 'network-only',
            variables: {
                moduleKey,
                includeInactive: false,
                limit: 200
            }
        });
        templates = templatesResult.data?.reportTemplates ?? [];
    } catch {
        return false;
    }

    const template = pickTemplate(templates, usageKeys);
    if (!template) return false;

    let dataSources: ReportDataSourceRow[] = [];
    try {
        const dataSourceResult = await input.apolloClient.query<ReportDataSourcesQueryResult>({
            query: REPORT_DATA_SOURCES,
            fetchPolicy: 'cache-first',
            variables: { moduleKey }
        });
        dataSources = dataSourceResult.data?.reportDataSources ?? [];
    } catch {
        return false;
    }

    const dataSource = pickDataSource(dataSources, moduleKey, template.dataSourceKey);
    if (!dataSource) return false;

    const selectedFields = parseSelectedFields(template.selectedFieldsJson);
    const columns = resolveColumns(dataSource, selectedFields);
    if (!columns.length) return false;

    const pageSettings = resolvePageSettings(template.pageSettingsJson);
    const printSettings = resolvePrintSettings(template.printSettingsJson);

    const html = buildPrintHtml({
        documentTitle: input.title ?? dataSource.label ?? `${moduleKey} report`,
        companyName: input.companyName ?? null,
        companyAddress: input.companyAddress ?? null,
        subtitle: input.subtitle,
        pageSettings,
        printSettings,
        columns,
        rows
    });
    return openPrintWindowWithHtml(html);
};
