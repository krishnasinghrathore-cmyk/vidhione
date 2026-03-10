'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { z } from 'zod';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppReportActions from '@/components/AppReportActions';
import { buildInvoiceLedgerRowsFromSaleInvoices } from '@/lib/invoiceLedgerRows';
import { listSaleInvoices, type SaleInvoiceListItem } from '@/lib/invoicing/api';
import { buildLoadingSheetRowsFromSaleInvoiceIds } from '@/lib/loadingSheetRows';
import { buildSalesBookDetailedRowsFromInvoiceHeaders } from '@/lib/salesBookDetailedRows';
import {
    collectReferencedFieldKeys,
    createEmptyReportDefinition,
    hasReportDefinitionContent,
    normalizeReportDefinition,
    type ReportDefinition
} from '@/lib/reportDefinition';
import { REPORT_DEFINITION_PRESETS } from '@/lib/reportDefinitionPresets';
import { printRowsWithTemplateDefinition } from '@/lib/reportTemplatePrint';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { type ReportTemplateLayout, type ReportTemplateLayoutElement } from './components/ReportTemplateCanvasDesigner';
import { ReportTemplateDesignerV2 } from './components/ReportTemplateDesignerV2';

const REPORT_DATA_SOURCES = gql`
    query ReportDataSources {
        reportDataSources {
            moduleKey
            dataSourceKey
            label
            description
            queryName
            fields {
                key
                label
                dataType
                path
            }
        }
    }
`;

const REPORT_TEMPLATES = gql`
    query ReportTemplates($moduleKey: String, $includeInactive: Boolean) {
        reportTemplates(moduleKey: $moduleKey, includeInactive: $includeInactive) {
            reportTemplateId
            companyId
            moduleKey
            usageKey
            templateKey
            templateName
            description
            dataSourceKey
            pageSettingsJson
            printSettingsJson
            selectedFieldsJson
            isDefaultFlag
            isActiveFlag
            createdAt
            updatedAt
        }
    }
`;

const UPSERT_REPORT_TEMPLATE = gql`
    mutation UpsertReportTemplate(
        $reportTemplateId: Int
        $moduleKey: String!
        $usageKey: String
        $templateKey: String
        $templateName: String!
        $description: String
        $dataSourceKey: String!
        $pageSettingsJson: String
        $printSettingsJson: String
        $selectedFieldsJson: String
        $isDefaultFlag: Boolean
        $isActiveFlag: Boolean
    ) {
        upsertReportTemplate(
            reportTemplateId: $reportTemplateId
            moduleKey: $moduleKey
            usageKey: $usageKey
            templateKey: $templateKey
            templateName: $templateName
            description: $description
            dataSourceKey: $dataSourceKey
            pageSettingsJson: $pageSettingsJson
            printSettingsJson: $printSettingsJson
            selectedFieldsJson: $selectedFieldsJson
            isDefaultFlag: $isDefaultFlag
            isActiveFlag: $isActiveFlag
        ) {
            reportTemplateId
            companyId
            moduleKey
            usageKey
            templateKey
            templateName
            description
            dataSourceKey
            pageSettingsJson
            printSettingsJson
            selectedFieldsJson
            isDefaultFlag
            isActiveFlag
            createdAt
            updatedAt
        }
    }
`;

const DELETE_REPORT_TEMPLATE = gql`
    mutation DeleteReportTemplate($reportTemplateId: Int!) {
        deleteReportTemplate(reportTemplateId: $reportTemplateId)
    }
`;

const VOUCHER_REGISTER_PREVIEW = gql`
    query VoucherRegisterPreview($limit: Int, $offset: Int, $includeSummary: Boolean, $excludeOpening: Boolean) {
        voucherRegisterByLedgerDetailed(limit: $limit, offset: $offset, includeSummary: $includeSummary, excludeOpening: $excludeOpening) {
            items {
                voucherId
                voucherTypeName
                voucherNumber
                voucherDate
                primaryLedgerName
                debitLedgerName
                creditLedgerName
                narration
                totalNetAmount
                managerName
                isCancelledFlag
            }
        }
    }
`;

const VOUCHER_ENTRY_LIST_PREVIEW = gql`
    query VoucherEntryListPreview($limit: Int, $offset: Int, $cancelled: Int) {
        voucherEntryList(limit: $limit, offset: $offset, cancelled: $cancelled) {
            items {
                voucherId
                voucherTypeName
                voucherNumber
                voucherDate
                ledgerName
                totalNetAmount
                isCancelledFlag
            }
        }
    }
`;

type DataSourceField = {
    key: string;
    label: string;
    dataType: string;
    path?: string | null;
};

type ReportDataSourceRow = {
    moduleKey: string;
    dataSourceKey: string;
    label: string;
    description?: string | null;
    queryName: string;
    fields: DataSourceField[];
};

type ReportTemplateRow = {
    reportTemplateId: number;
    companyId?: number | null;
    moduleKey?: string | null;
    usageKey?: string | null;
    templateKey?: string | null;
    templateName?: string | null;
    description?: string | null;
    dataSourceKey?: string | null;
    pageSettingsJson?: string | null;
    printSettingsJson?: string | null;
    selectedFieldsJson?: string | null;
    isDefaultFlag?: boolean | null;
    isActiveFlag?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
};

type VoucherRegisterPreviewItem = {
    voucherId?: number | null;
    voucherTypeName?: string | null;
    voucherNumber?: string | null;
    voucherDate?: string | null;
    primaryLedgerName?: string | null;
    debitLedgerName?: string | null;
    creditLedgerName?: string | null;
    narration?: string | null;
    totalNetAmount?: number | null;
    managerName?: string | null;
    isCancelledFlag?: number | null;
};

type VoucherRegisterPreviewResult = {
    voucherRegisterByLedgerDetailed?: {
        items?: VoucherRegisterPreviewItem[] | null;
    } | null;
};

type VoucherEntryListPreviewItem = {
    voucherId?: number | null;
    voucherTypeName?: string | null;
    voucherNumber?: string | null;
    voucherDate?: string | null;
    ledgerName?: string | null;
    totalNetAmount?: number | null;
    isCancelledFlag?: number | null;
};

type VoucherEntryListPreviewResult = {
    voucherEntryList?: {
        items?: VoucherEntryListPreviewItem[] | null;
    } | null;
};

type ReportTemplateFormState = {
    reportTemplateId: number | null;
    moduleKey: 'invoice' | 'voucher';
    usageKey: string;
    templateKey: string;
    templateName: string;
    description: string;
    dataSourceKey: string;
    renderMode: 'standard' | 'legacy_invoice_ledger' | 'legacy_loading_sheet';
    pageSize: 'A4' | 'A5' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    marginTopMm: number;
    marginRightMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    headerText: string;
    footerText: string;
    showCompanyHeader: boolean;
    companyNameOverride: string;
    companyAddressOverride: string;
    companyLogoUrl: string;
    companyLogoWidthMm: number;
    companyHeaderAlign: 'left' | 'center' | 'right';
    companyNameFontSizePt: number;
    companyAddressFontSizePt: number;
    showHeaderDivider: boolean;
    showRowNumbers: boolean;
    selectedFieldKeys: string[];
    layout: ReportTemplateLayout;
    definition: ReportDefinition;
    isDefaultFlag: boolean;
    isActiveFlag: boolean;
};

const EMPTY_LAYOUT: ReportTemplateLayout = {
    version: 1,
    elements: []
};

const DEFAULT_FORM: ReportTemplateFormState = {
    reportTemplateId: null,
    moduleKey: 'invoice',
    usageKey: 'print',
    templateKey: '',
    templateName: '',
    description: '',
    dataSourceKey: '',
    renderMode: 'standard',
    pageSize: 'A4',
    orientation: 'portrait',
    marginTopMm: 12,
    marginRightMm: 12,
    marginBottomMm: 18,
    marginLeftMm: 12,
    headerText: '',
    footerText: 'Page',
    showCompanyHeader: true,
    companyNameOverride: '',
    companyAddressOverride: '',
    companyLogoUrl: '',
    companyLogoWidthMm: 18,
    companyHeaderAlign: 'center',
    companyNameFontSizePt: 15,
    companyAddressFontSizePt: 11,
    showHeaderDivider: false,
    showRowNumbers: false,
    selectedFieldKeys: [],
    layout: EMPTY_LAYOUT,
    definition: createEmptyReportDefinition(''),
    isDefaultFlag: false,
    isActiveFlag: true
};

const createDefaultForm = (): ReportTemplateFormState => ({
    ...DEFAULT_FORM,
    layout: {
        version: 1,
        elements: []
    },
    definition: createEmptyReportDefinition('')
});

const formSchema = z.object({
    moduleKey: z.enum(['invoice', 'voucher']),
    usageKey: z.string().trim().min(1, 'Usage is required'),
    templateName: z.string().trim().min(1, 'Template name is required'),
    templateKey: z
        .string()
        .trim()
        .regex(/^[a-z0-9-_.]*$/, 'Template key accepts lowercase letters, numbers, dash, underscore, dot'),
    dataSourceKey: z.string().trim().min(1, 'Data source is required'),
    pageSize: z.enum(['A4', 'A5', 'Letter', 'Legal']),
    orientation: z.enum(['portrait', 'landscape']),
    marginTopMm: z.number().min(0).max(50),
    marginRightMm: z.number().min(0).max(50),
    marginBottomMm: z.number().min(0).max(50),
    marginLeftMm: z.number().min(0).max(50),
    selectedFieldKeys: z.array(z.string())
});

const safeParseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
    const trimmed = raw?.trim();
    if (!trimmed) return fallback;
    try {
        const parsed = JSON.parse(trimmed) as T;
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

const normalizeLayoutElement = (raw: unknown): ReportTemplateLayoutElement | null => {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Partial<ReportTemplateLayoutElement>;
    const type = item.type;
    if (type !== 'text' && type !== 'field' && type !== 'line' && type !== 'box') return null;
    const id = String(item.id ?? '').trim();
    if (!id) return null;
    const xMm = Number(item.xMm ?? 0);
    const yMm = Number(item.yMm ?? 0);
    const widthMm = Number(item.widthMm ?? 1);
    const heightMm = Number(item.heightMm ?? 1);
    if (!Number.isFinite(xMm) || !Number.isFinite(yMm) || !Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return null;
    return {
        id,
        type,
        xMm,
        yMm,
        widthMm: Math.max(1, widthMm),
        heightMm: Math.max(1, heightMm),
        text: typeof item.text === 'string' ? item.text : undefined,
        fieldKey: typeof item.fieldKey === 'string' ? item.fieldKey : undefined,
        fontSizePt: Number.isFinite(Number(item.fontSizePt)) ? Number(item.fontSizePt) : undefined,
        fontWeight: item.fontWeight === 'bold' ? 'bold' : item.fontWeight === 'normal' ? 'normal' : undefined,
        textAlign: item.textAlign === 'center' || item.textAlign === 'right' || item.textAlign === 'left' ? item.textAlign : undefined,
        borderWidth: Number.isFinite(Number(item.borderWidth)) ? Number(item.borderWidth) : undefined
    };
};

const normalizeLayout = (raw: unknown): ReportTemplateLayout => {
    if (!raw || typeof raw !== 'object') return EMPTY_LAYOUT;
    const payload = raw as { version?: unknown; elements?: unknown };
    const elements = Array.isArray(payload.elements) ? payload.elements.map(normalizeLayoutElement).filter((element): element is ReportTemplateLayoutElement => Boolean(element)) : [];
    const version = Number(payload.version ?? 1);
    return {
        version: Number.isFinite(version) && version > 0 ? version : 1,
        elements
    };
};

const toFormState = (row: ReportTemplateRow): ReportTemplateFormState => {
    const pageSettings = safeParseJson<{
        pageSize?: string;
        orientation?: string;
        margins?: Record<string, number>;
        layout?: unknown;
        reportDefinition?: unknown;
    }>(
        row.pageSettingsJson,
        {}
    );
    const printSettings = safeParseJson<{
        headerText?: string;
        footerText?: string;
        showCompanyHeader?: boolean;
        renderMode?: string;
        companyNameOverride?: string;
        companyAddressOverride?: string;
        companyLogoUrl?: string;
        companyLogoWidthMm?: number;
        companyHeaderAlign?: string;
        companyNameFontSizePt?: number;
        companyAddressFontSizePt?: number;
        showHeaderDivider?: boolean;
        showRowNumbers?: boolean;
    }>(row.printSettingsJson, {});
    const selectedFieldsRaw = safeParseJson<unknown[]>(row.selectedFieldsJson, []);
    const selectedFieldKeys = selectedFieldsRaw
        .map((value) => {
            if (typeof value === 'string') return value;
            if (value && typeof value === 'object' && 'key' in value) return String((value as { key: unknown }).key ?? '');
            return '';
        })
        .filter(Boolean);

    return {
        reportTemplateId: Number(row.reportTemplateId),
        moduleKey: row.moduleKey === 'voucher' ? 'voucher' : 'invoice',
        usageKey: row.usageKey?.trim() || 'print',
        templateKey: row.templateKey?.trim() || '',
        templateName: row.templateName?.trim() || '',
        description: row.description?.trim() || '',
        dataSourceKey: row.dataSourceKey?.trim() || '',
        renderMode:
            printSettings.renderMode === 'legacy_invoice_ledger' || printSettings.renderMode === 'legacy_loading_sheet'
                ? printSettings.renderMode
                : 'standard',
        pageSize: (pageSettings.pageSize as ReportTemplateFormState['pageSize']) || 'A4',
        orientation: (pageSettings.orientation as ReportTemplateFormState['orientation']) || 'portrait',
        marginTopMm: Number(pageSettings.margins?.top ?? 12),
        marginRightMm: Number(pageSettings.margins?.right ?? 12),
        marginBottomMm: Number(pageSettings.margins?.bottom ?? 18),
        marginLeftMm: Number(pageSettings.margins?.left ?? 12),
        headerText: printSettings.headerText?.trim() || '',
        footerText: printSettings.footerText?.trim() || 'Page',
        showCompanyHeader: printSettings.showCompanyHeader !== false,
        companyNameOverride: printSettings.companyNameOverride?.trim() || '',
        companyAddressOverride: printSettings.companyAddressOverride?.trim() || '',
        companyLogoUrl: printSettings.companyLogoUrl?.trim() || '',
        companyLogoWidthMm: Number(printSettings.companyLogoWidthMm ?? 18),
        companyHeaderAlign:
            printSettings.companyHeaderAlign === 'left' || printSettings.companyHeaderAlign === 'right'
                ? printSettings.companyHeaderAlign
                : 'center',
        companyNameFontSizePt: Number(printSettings.companyNameFontSizePt ?? 15),
        companyAddressFontSizePt: Number(printSettings.companyAddressFontSizePt ?? 11),
        showHeaderDivider: Boolean(printSettings.showHeaderDivider),
        showRowNumbers: Boolean(printSettings.showRowNumbers),
        selectedFieldKeys,
        layout: normalizeLayout(pageSettings.layout),
        definition: normalizeReportDefinition(pageSettings.reportDefinition, row.dataSourceKey?.trim() || ''),
        isDefaultFlag: Boolean(row.isDefaultFlag),
        isActiveFlag: row.isActiveFlag !== false
    };
};

const buildTemplateKey = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_.]+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
        .slice(0, 100);

const normalizeKeyText = (value?: string | null) => String(value ?? '').trim().toLowerCase();

const toSampleFieldValue = (dataType: string, key: string, rowIndex: number) => {
    const normalizedType = dataType.trim().toLowerCase();
    if (normalizedType === 'number') {
        return Number((rowIndex + 1) * 111.11);
    }
    if (normalizedType === 'boolean') {
        return rowIndex % 2 === 0;
    }
    if (normalizedType === 'date') {
        const now = new Date();
        const shifted = new Date(now.getFullYear(), now.getMonth(), now.getDate() - rowIndex);
        const yyyy = shifted.getFullYear();
        const mm = String(shifted.getMonth() + 1).padStart(2, '0');
        const dd = String(shifted.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return `${key} ${rowIndex + 1}`;
};

const normalizePath = (value: string | null | undefined) => value?.trim() ?? '';

const setObjectPathValue = (target: Record<string, unknown>, path: string, value: unknown) => {
    const segments = normalizePath(path).split('.').filter(Boolean);
    if (!segments.length) return;
    let cursor: Record<string, unknown> = target;
    segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
            cursor[segment] = value;
            return;
        }
        const next = cursor[segment];
        if (!next || typeof next !== 'object' || Array.isArray(next)) {
            cursor[segment] = {};
        }
        cursor = cursor[segment] as Record<string, unknown>;
    });
};

const buildSamplePreviewRows = (
    columns: Array<{ key: string; dataType: string; path?: string | null }>,
    rowCount: number
) =>
    Array.from({ length: rowCount }, (_, rowIndex) => {
        const row: Record<string, unknown> = {};
        columns.forEach((column) => {
            const columnPath = normalizePath(column.path) || column.key;
            if (!columnPath) return;
            if (columnPath.startsWith('lines.')) {
                const childPath = columnPath.slice('lines.'.length);
                const existingLines = Array.isArray(row.lines) ? [...row.lines] : [];
                const lineCount = 4;
                for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
                    const currentLine =
                        existingLines[lineIndex] && typeof existingLines[lineIndex] === 'object'
                            ? ({ ...(existingLines[lineIndex] as Record<string, unknown>) })
                            : {};
                    setObjectPathValue(
                        currentLine,
                        childPath,
                        toSampleFieldValue(column.dataType, column.key, rowIndex * lineCount + lineIndex)
                    );
                    existingLines[lineIndex] = currentLine;
                }
                row.lines = existingLines;
                return;
            }
            setObjectPathValue(row, columnPath, toSampleFieldValue(column.dataType, column.key, rowIndex));
        });
        return row;
    });

const toInvoicePreviewRow = (row: SaleInvoiceListItem): Record<string, unknown> => ({
    saleInvoiceId: row.saleInvoiceId,
    voucherNumber: row.voucherNumber,
    voucherDateText: row.voucherDateText,
    ledgerName: row.ledgerName,
    ledgerAddress: row.ledgerAddress,
    grossAmount: Number(row.totalGrossAmount ?? 0),
    totalTaxAmount: Number(row.totalTaxAmount ?? 0),
    roundOffAmount: Number(row.roundOffAmount ?? 0),
    totalNetAmount: Number(row.totalNetAmount ?? 0),
    isCancelledFlag: row.isCancelled ? 1 : 0
});

const toVoucherPreviewRow = (row: VoucherRegisterPreviewItem): Record<string, unknown> => ({
    voucherId: row.voucherId ?? null,
    voucherTypeName: row.voucherTypeName ?? null,
    voucherNumber: row.voucherNumber ?? null,
    voucherDateText: row.voucherDate ?? null,
    partyLedgerName: row.primaryLedgerName ?? row.debitLedgerName ?? row.creditLedgerName ?? null,
    narrationText: row.narration ?? null,
    totalAmountDetails: Number(row.totalNetAmount ?? 0),
    managerName: row.managerName ?? null,
    isCancelledFlag: row.isCancelledFlag ?? 0
});

const toVoucherListPreviewRow = (row: VoucherEntryListPreviewItem): Record<string, unknown> => ({
    voucherId: row.voucherId ?? null,
    voucherTypeName: row.voucherTypeName ?? null,
    voucherNumber: row.voucherNumber ?? null,
    voucherDateText: row.voucherDate ?? null,
    partyLedgerName: row.ledgerName ?? null,
    narrationText: null,
    totalAmountDetails: Number(row.totalNetAmount ?? 0),
    managerName: null,
    isCancelledFlag: row.isCancelledFlag ?? 0
});

export default function AccountsReportTemplatesPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const apolloClient = useApolloClient();
    const toastRef = useRef<Toast>(null);
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState<'all' | 'invoice' | 'voucher'>('all');
    const [form, setForm] = useState<ReportTemplateFormState>(createDefaultForm);
    const [saving, setSaving] = useState(false);
    const [previewingLive, setPreviewingLive] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setPageTitle('Report Templates');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const { data: sourceData } = useQuery<{ reportDataSources: ReportDataSourceRow[] }>(REPORT_DATA_SOURCES, {
        fetchPolicy: 'cache-first'
    });
    const {
        data: templatesData,
        loading: templatesLoading,
        error: templatesError,
        refetch
    } = useQuery<{ reportTemplates: ReportTemplateRow[] }>(REPORT_TEMPLATES, {
        variables: { moduleKey: moduleFilter === 'all' ? null : moduleFilter, includeInactive: true },
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const [upsertTemplate] = useMutation<{ upsertReportTemplate: ReportTemplateRow }>(UPSERT_REPORT_TEMPLATE);
    const [deleteTemplate] = useMutation(DELETE_REPORT_TEMPLATE);

    const dataSources = useMemo(() => sourceData?.reportDataSources ?? [], [sourceData]);
    const templates = useMemo(() => templatesData?.reportTemplates ?? [], [templatesData]);

    const filteredTemplates = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return templates;
        return templates.filter((row) =>
            [row.templateName, row.templateKey, row.moduleKey, row.usageKey, row.dataSourceKey, row.description]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [search, templates]);

    const dataSourceOptions = useMemo(
        () =>
            dataSources
                .filter((source) => source.moduleKey === form.moduleKey)
                .map((source) => ({
                    label: `${source.label} (${source.queryName})`,
                    value: source.dataSourceKey
                })),
        [dataSources, form.moduleKey]
    );

    const selectedDataSource = useMemo(
        () => dataSources.find((source) => source.dataSourceKey === form.dataSourceKey) ?? null,
        [dataSources, form.dataSourceKey]
    );

    const selectedFieldOptions = useMemo(
        () =>
            (selectedDataSource?.fields ?? []).map((field) => ({
                label: `${field.label} [${field.dataType}]`,
                value: field.key
            })),
        [selectedDataSource]
    );

    const availablePresets = useMemo(
        () =>
            REPORT_DEFINITION_PRESETS.filter(
                (preset) =>
                    preset.moduleKey === form.moduleKey
                    && (
                        !form.dataSourceKey
                        || preset.dataSourceKey === form.dataSourceKey
                        || form.moduleKey === 'invoice'
                    )
            ),
        [form.dataSourceKey, form.moduleKey]
    );

    useEffect(() => {
        if (form.reportTemplateId != null) return;
        if (form.dataSourceKey) return;
        const firstSource = dataSourceOptions[0]?.value;
        if (!firstSource) return;
        const sourceFields =
            dataSources.find((source) => source.dataSourceKey === String(firstSource))?.fields ?? [];
        setForm((prev) => ({
            ...prev,
            dataSourceKey: String(firstSource),
            selectedFieldKeys: sourceFields.slice(0, 8).map((field) => field.key),
            definition: createEmptyReportDefinition(String(firstSource))
        }));
    }, [dataSourceOptions, dataSources, form.dataSourceKey, form.reportTemplateId]);

    useEffect(() => {
        const allowed = new Set((selectedDataSource?.fields ?? []).map((field) => field.key));
        if (!allowed.size) return;
        setForm((prev) => {
            const filtered = prev.selectedFieldKeys.filter((key) => allowed.has(key));
            if (filtered.length === prev.selectedFieldKeys.length) return prev;
            return { ...prev, selectedFieldKeys: filtered };
        });
    }, [selectedDataSource?.fields]);

    useEffect(() => {
        setForm((prev) => {
            const currentDataSourceKey = prev.definition.datasets[0]?.dataSourceKey ?? '';
            if (currentDataSourceKey === prev.dataSourceKey) return prev;
            const nextDefinition = normalizeReportDefinition(prev.definition, prev.dataSourceKey);
            nextDefinition.datasets = nextDefinition.datasets.map((dataset, index) =>
                index === 0 ? { ...dataset, dataSourceKey: prev.dataSourceKey } : dataset
            );
            return {
                ...prev,
                definition: nextDefinition
            };
        });
    }, [form.dataSourceKey]);

    const patchForm = useCallback((patch: Partial<ReportTemplateFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
        setIsDirty(true);
    }, []);

    const resetForm = useCallback(() => {
        setForm(createDefaultForm());
        setIsDirty(false);
    }, []);

    const buildUpsertVariables = useCallback((nextForm: ReportTemplateFormState) => {
        const hasLayoutElements = (nextForm.layout.elements ?? []).length > 0;
        const hasDefinition = hasReportDefinitionContent(nextForm.definition);
        const parsed = formSchema.safeParse({
            moduleKey: nextForm.moduleKey,
            usageKey: nextForm.usageKey,
            templateName: nextForm.templateName,
            templateKey: nextForm.templateKey,
            dataSourceKey: nextForm.dataSourceKey,
            pageSize: nextForm.pageSize,
            orientation: nextForm.orientation,
            marginTopMm: Number(nextForm.marginTopMm),
            marginRightMm: Number(nextForm.marginRightMm),
            marginBottomMm: Number(nextForm.marginBottomMm),
            marginLeftMm: Number(nextForm.marginLeftMm),
            selectedFieldKeys: nextForm.selectedFieldKeys
        });

        if (!parsed.success) {
            return {
                ok: false as const,
                detail: parsed.error.issues[0]?.message ?? 'Please check form values.'
            };
        }

        if (!nextForm.selectedFieldKeys.length && !hasLayoutElements && !hasDefinition) {
            return {
                ok: false as const,
                detail: 'Add report items or select at least one field before saving the template.'
            };
        }

        const pageSettingsJson = JSON.stringify({
            pageSize: nextForm.pageSize,
            orientation: nextForm.orientation,
            margins: {
                top: Number(nextForm.marginTopMm),
                right: Number(nextForm.marginRightMm),
                bottom: Number(nextForm.marginBottomMm),
                left: Number(nextForm.marginLeftMm)
            },
            layout: nextForm.layout,
            reportDefinition: nextForm.definition
        });
        const printSettingsJson = JSON.stringify({
            headerText: nextForm.headerText.trim(),
            footerText: nextForm.footerText.trim(),
            showCompanyHeader: nextForm.showCompanyHeader,
            renderMode: nextForm.renderMode,
            companyNameOverride: nextForm.companyNameOverride.trim(),
            companyAddressOverride: nextForm.companyAddressOverride.trim(),
            companyLogoUrl: nextForm.companyLogoUrl.trim(),
            companyLogoWidthMm: Number(nextForm.companyLogoWidthMm),
            companyHeaderAlign: nextForm.companyHeaderAlign,
            companyNameFontSizePt: Number(nextForm.companyNameFontSizePt),
            companyAddressFontSizePt: Number(nextForm.companyAddressFontSizePt),
            showHeaderDivider: nextForm.showHeaderDivider,
            showRowNumbers: nextForm.showRowNumbers
        });
        const selectedFieldsJson = JSON.stringify(
            Array.from(new Set([...nextForm.selectedFieldKeys, ...collectReferencedFieldKeys(nextForm.definition)]))
        );

        return {
            ok: true as const,
            variables: {
                reportTemplateId: nextForm.reportTemplateId ?? null,
                moduleKey: nextForm.moduleKey,
                usageKey: nextForm.usageKey.trim(),
                templateKey: nextForm.templateKey.trim() || buildTemplateKey(nextForm.templateName),
                templateName: nextForm.templateName.trim(),
                description: nextForm.description.trim() || null,
                dataSourceKey: nextForm.dataSourceKey,
                pageSettingsJson,
                printSettingsJson,
                selectedFieldsJson,
                isDefaultFlag: nextForm.isDefaultFlag,
                isActiveFlag: nextForm.isActiveFlag
            }
        };
    }, []);

    const applyPreset = useCallback((presetKey: string) => {
        const preset = REPORT_DEFINITION_PRESETS.find((entry) => entry.key === presetKey);
        if (!preset) return;
        patchForm({
            moduleKey: preset.moduleKey,
            usageKey: preset.usageKey,
            dataSourceKey: preset.dataSourceKey,
            templateName: form.templateName.trim() ? form.templateName : preset.templateName,
            templateKey: form.templateKey.trim() ? form.templateKey : preset.templateKey,
            description: form.description.trim() ? form.description : preset.description,
            renderMode: 'standard',
            pageSize: preset.pageSettings?.pageSize ?? form.pageSize,
            orientation: preset.pageSettings?.orientation ?? form.orientation,
            marginTopMm: preset.pageSettings?.marginTopMm ?? form.marginTopMm,
            marginRightMm: preset.pageSettings?.marginRightMm ?? form.marginRightMm,
            marginBottomMm: preset.pageSettings?.marginBottomMm ?? form.marginBottomMm,
            marginLeftMm: preset.pageSettings?.marginLeftMm ?? form.marginLeftMm,
            selectedFieldKeys: preset.selectedFieldKeys,
            definition: normalizeReportDefinition(JSON.parse(JSON.stringify(preset.definition)), preset.dataSourceKey)
        });
        toastRef.current?.show({
            severity: 'info',
            summary: 'Preset Loaded',
            detail: `${preset.label} applied to the editor.`
        });
    }, [form.description, form.templateKey, form.templateName, patchForm]);

    const savePresetTemplate = useCallback(
        async (presetKey: string) => {
            const preset = REPORT_DEFINITION_PRESETS.find((entry) => entry.key === presetKey);
            if (!preset) return;

            const existingTemplate =
                templates.find(
                    (row) =>
                        normalizeKeyText(row.moduleKey) === preset.moduleKey
                        && normalizeKeyText(row.usageKey) === normalizeKeyText(preset.usageKey)
                        && normalizeKeyText(row.templateKey) === normalizeKeyText(preset.templateKey)
                ) ?? null;

            const hasDefaultForUsage = templates.some(
                (row) =>
                    normalizeKeyText(row.moduleKey) === preset.moduleKey
                    && normalizeKeyText(row.usageKey) === normalizeKeyText(preset.usageKey)
                    && row.isDefaultFlag === true
                    && row.reportTemplateId !== existingTemplate?.reportTemplateId
            );

            const nextForm: ReportTemplateFormState = {
                ...createDefaultForm(),
                reportTemplateId: existingTemplate?.reportTemplateId ?? null,
                moduleKey: preset.moduleKey,
                usageKey: preset.usageKey,
                templateKey: preset.templateKey,
                templateName: preset.templateName,
                description: preset.description,
                dataSourceKey: preset.dataSourceKey,
                renderMode: 'standard',
                pageSize: preset.pageSettings?.pageSize ?? 'A4',
                orientation: preset.pageSettings?.orientation ?? 'portrait',
                marginTopMm: preset.pageSettings?.marginTopMm ?? 12,
                marginRightMm: preset.pageSettings?.marginRightMm ?? 12,
                marginBottomMm: preset.pageSettings?.marginBottomMm ?? 18,
                marginLeftMm: preset.pageSettings?.marginLeftMm ?? 12,
                selectedFieldKeys: preset.selectedFieldKeys,
                definition: normalizeReportDefinition(JSON.parse(JSON.stringify(preset.definition)), preset.dataSourceKey),
                isDefaultFlag: existingTemplate?.isDefaultFlag ?? !hasDefaultForUsage,
                isActiveFlag: existingTemplate?.isActiveFlag ?? true
            };

            const prepared = buildUpsertVariables(nextForm);
            if (!prepared.ok) {
                toastRef.current?.show({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: prepared.detail
                });
                return;
            }

            try {
                setSaving(true);
                const response = await upsertTemplate({
                    variables: prepared.variables
                });
                const savedTemplate = response.data?.upsertReportTemplate ?? null;
                if (savedTemplate) {
                    setForm(toFormState(savedTemplate));
                    setIsDirty(false);
                }
                toastRef.current?.show({
                    severity: 'success',
                    summary: existingTemplate ? 'Starter Updated' : 'Starter Created',
                    detail: existingTemplate
                        ? `${preset.label} refreshed as a saved template.`
                        : `${preset.label} saved as a reusable template.`
                });
                await refetch();
            } catch (error: any) {
                toastRef.current?.show({
                    severity: 'error',
                    summary: 'Starter save failed',
                    detail: error?.message ?? 'Unable to save starter template.'
                });
            } finally {
                setSaving(false);
            }
        },
        [buildUpsertVariables, refetch, templates, upsertTemplate]
    );

    const handleEdit = useCallback((row: ReportTemplateRow) => {
        setForm(toFormState(row));
        setIsDirty(false);
    }, []);

    const handleDelete = useCallback(
        (row: ReportTemplateRow) => {
            const id = Number(row.reportTemplateId);
            if (!Number.isFinite(id) || id <= 0) return;
            confirmDialog({
                header: 'Delete Template',
                icon: 'pi pi-exclamation-triangle',
                message: `Delete template "${row.templateName ?? row.templateKey ?? id}"?`,
                acceptClassName: 'p-button-danger',
                acceptLabel: 'Yes',
                rejectLabel: 'No',
                accept: async () => {
                    try {
                        await deleteTemplate({ variables: { reportTemplateId: id } });
                        toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Template removed.' });
                        if (form.reportTemplateId === id) {
                            resetForm();
                        }
                        await refetch();
                    } catch (error: any) {
                        toastRef.current?.show({
                            severity: 'error',
                            summary: 'Delete failed',
                            detail: error?.message ?? 'Unable to delete template.'
                        });
                    }
                }
            });
        },
        [deleteTemplate, form.reportTemplateId, refetch, resetForm]
    );

    const handleSave = useCallback(async () => {
        const prepared = buildUpsertVariables(form);

        if (!prepared.ok) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail: prepared.detail
            });
            return;
        }

        try {
            setSaving(true);
            await upsertTemplate({
                variables: prepared.variables
            });
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: form.reportTemplateId ? 'Template updated.' : 'Template created.'
            });
            await refetch();
            resetForm();
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Save failed',
                detail: error?.message ?? 'Unable to save template.'
            });
        } finally {
            setSaving(false);
        }
    }, [buildUpsertVariables, form, refetch, resetForm, upsertTemplate]);

    const previewColumns = useMemo(() => {
        const source = selectedDataSource;
        if (!source) return [];
        const referencedFieldKeys = Array.from(new Set([...form.selectedFieldKeys, ...collectReferencedFieldKeys(form.definition)]));
        if (!referencedFieldKeys.length) return [];
        const fieldsByKey = new Map(source.fields.map((field) => [field.key, field]));
        return referencedFieldKeys
            .map((key) => fieldsByKey.get(key))
            .filter((field): field is DataSourceField => Boolean(field))
            .map((field) => ({
                key: field.key,
                label: field.label,
                dataType: field.dataType,
                path: field.path ?? field.key
            }));
    }, [form.definition, form.selectedFieldKeys, selectedDataSource]);

    const handlePreview = useCallback(() => {
        const hasLayoutElements = (form.layout.elements ?? []).length > 0;
        const hasDefinition = hasReportDefinitionContent(form.definition);
        if (!selectedDataSource) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Preview',
                detail: 'Select a data source before preview.'
            });
            return;
        }
        if (!form.selectedFieldKeys.length && !hasLayoutElements && !hasDefinition) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Preview',
                detail: 'Select at least one field or add report items before preview.'
            });
            return;
        }
        if (!previewColumns.length && !hasLayoutElements && !hasDefinition) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Preview',
                detail: 'No valid preview content found. Add fields or layout elements.'
            });
            return;
        }
        const sampleRowCount = form.definition.repeatPerRow ? 2 : hasLayoutElements || hasDefinition ? 3 : 8;
        const sampleRows = buildSamplePreviewRows(previewColumns, sampleRowCount);
        const printed = printRowsWithTemplateDefinition({
            documentTitle: form.templateName.trim() || 'Template Preview',
            subtitle: `Preview (${form.moduleKey} | ${form.usageKey.trim() || 'print'})`,
            rows: sampleRows,
            columns: previewColumns,
            layout: form.layout,
            reportDefinition: form.definition,
            pageSettings: {
                pageSize: form.pageSize,
                orientation: form.orientation,
                margins: {
                    top: Number(form.marginTopMm),
                    right: Number(form.marginRightMm),
                    bottom: Number(form.marginBottomMm),
                    left: Number(form.marginLeftMm)
                }
            },
            printSettings: {
                headerText: form.headerText.trim(),
                footerText: form.footerText.trim(),
                showCompanyHeader: form.showCompanyHeader,
                renderMode: form.renderMode,
                companyNameOverride: form.companyNameOverride.trim(),
                companyAddressOverride: form.companyAddressOverride.trim(),
                companyLogoUrl: form.companyLogoUrl.trim(),
                companyLogoWidthMm: Number(form.companyLogoWidthMm),
                companyHeaderAlign: form.companyHeaderAlign,
                companyNameFontSizePt: Number(form.companyNameFontSizePt),
                companyAddressFontSizePt: Number(form.companyAddressFontSizePt),
                showHeaderDivider: form.showHeaderDivider,
                showRowNumbers: form.showRowNumbers
            }
        });
        if (printed) return;
        toastRef.current?.show({
            severity: 'error',
            summary: 'Preview',
            detail: 'Unable to open preview. Please allow pop-ups and try again.'
        });
    }, [form, previewColumns, selectedDataSource]);

    const handleLivePreview = useCallback(async () => {
        const hasLayoutElements = (form.layout.elements ?? []).length > 0;
        const hasDefinition = hasReportDefinitionContent(form.definition);
        if (!selectedDataSource) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Live Preview',
                detail: 'Select a data source before live preview.'
            });
            return;
        }
        if (!form.selectedFieldKeys.length && !hasLayoutElements && !hasDefinition) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Live Preview',
                detail: 'Select at least one field or add report items before live preview.'
            });
            return;
        }
        if (!previewColumns.length && !hasLayoutElements && !hasDefinition) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Live Preview',
                detail: 'No valid preview content found. Add fields or layout elements.'
            });
            return;
        }

        try {
            setPreviewingLive(true);
            let liveRows: Array<Record<string, unknown>> = [];

            if (form.moduleKey === 'invoice') {
                const invoiceResult = await listSaleInvoices({
                    includeCancelled: true,
                    includeProductNames: false,
                    limit: 20,
                    offset: 0
                });
                liveRows =
                    selectedDataSource.dataSourceKey === 'billing.loadingSheet'
                        ? await buildLoadingSheetRowsFromSaleInvoiceIds(
                              (invoiceResult.items ?? []).map((row) => Number(row.saleInvoiceId ?? 0))
                          )
                        : selectedDataSource.dataSourceKey === 'billing.salesBookDetailed'
                        ? await buildSalesBookDetailedRowsFromInvoiceHeaders(invoiceResult.items ?? [])
                        : selectedDataSource.dataSourceKey === 'billing.invoiceLedger'
                        ? await buildInvoiceLedgerRowsFromSaleInvoices(invoiceResult.items ?? [])
                        : (invoiceResult.items ?? []).map(toInvoicePreviewRow);
            } else {
                try {
                    const voucherResult = await apolloClient.query<VoucherRegisterPreviewResult>({
                        query: VOUCHER_REGISTER_PREVIEW,
                        fetchPolicy: 'network-only',
                        variables: {
                            limit: 20,
                            offset: 0,
                            includeSummary: false,
                            excludeOpening: false
                        }
                    });
                    liveRows = (voucherResult.data?.voucherRegisterByLedgerDetailed?.items ?? []).map(toVoucherPreviewRow);
                } catch {
                    liveRows = [];
                }
                if (!liveRows.length) {
                    const fallbackResult = await apolloClient.query<VoucherEntryListPreviewResult>({
                        query: VOUCHER_ENTRY_LIST_PREVIEW,
                        fetchPolicy: 'network-only',
                        variables: {
                            limit: 20,
                            offset: 0,
                            cancelled: 2
                        }
                    });
                    liveRows = (fallbackResult.data?.voucherEntryList?.items ?? []).map(toVoucherListPreviewRow);
                }
            }

            if (!liveRows.length) {
                toastRef.current?.show({
                    severity: 'info',
                    summary: 'Live Preview',
                    detail: 'No live rows found for preview.'
                });
                return;
            }

            const printed = printRowsWithTemplateDefinition({
                documentTitle: form.templateName.trim() || 'Template Live Preview',
                subtitle: `Live Preview (${form.moduleKey} | ${form.usageKey.trim() || 'print'})`,
                rows: liveRows,
                columns: previewColumns,
                layout: form.layout,
                reportDefinition: form.definition,
                pageSettings: {
                    pageSize: form.pageSize,
                    orientation: form.orientation,
                    margins: {
                        top: Number(form.marginTopMm),
                        right: Number(form.marginRightMm),
                        bottom: Number(form.marginBottomMm),
                        left: Number(form.marginLeftMm)
                    }
                },
                printSettings: {
                    headerText: form.headerText.trim(),
                    footerText: form.footerText.trim(),
                    showCompanyHeader: form.showCompanyHeader,
                    renderMode: form.renderMode,
                    companyNameOverride: form.companyNameOverride.trim(),
                    companyAddressOverride: form.companyAddressOverride.trim(),
                    companyLogoUrl: form.companyLogoUrl.trim(),
                    companyLogoWidthMm: Number(form.companyLogoWidthMm),
                    companyHeaderAlign: form.companyHeaderAlign,
                    companyNameFontSizePt: Number(form.companyNameFontSizePt),
                    companyAddressFontSizePt: Number(form.companyAddressFontSizePt),
                    showHeaderDivider: form.showHeaderDivider,
                    showRowNumbers: form.showRowNumbers
                }
            });
            if (printed) return;
            toastRef.current?.show({
                severity: 'error',
                summary: 'Live Preview',
                detail: 'Unable to open preview. Please allow pop-ups and try again.'
            });
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Live Preview Failed',
                detail: error?.message ?? 'Unable to fetch live rows for preview.'
            });
        } finally {
            setPreviewingLive(false);
        }
    }, [apolloClient, form, previewColumns, selectedDataSource]);

    return (
        <div className="card">
            <ConfirmDialog />
            <Toast ref={toastRef} />

            <div className="flex align-items-center justify-content-between gap-3 flex-wrap mb-3">
                <div>
                    <h2 className="m-0">Report Templates</h2>
                    <p className="mt-2 mb-0 text-600">
                        Configure reusable print templates for Invoice and Voucher modules with data source field mapping.
                    </p>
                </div>
                <Button
                    label="New Template"
                    icon="pi pi-plus"
                    className="app-action-compact"
                    onClick={resetForm}
                    disabled={saving || (!isDirty && form.reportTemplateId == null)}
                />
            </div>

            {templatesError && (
                <p className="text-red-500 m-0 mb-3">Error loading templates: {templatesError.message}</p>
            )}

            <AppDataTable
                value={filteredTemplates}
                dataKey="reportTemplateId"
                loading={templatesLoading}
                paginator
                rows={10}
                rowsPerPageOptions={[10, 20, 50]}
                stripedRows
                size="small"
                tableStyle={{ minWidth: '78rem' }}
                headerLeft={
                    <div className="flex gap-2 flex-wrap">
                        <span className="p-input-icon-left" style={{ minWidth: '260px' }}>
                            <i className="pi pi-search" />
                            <AppInput
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search templates"
                                style={{ width: '100%' }}
                            />
                        </span>
                        <AppDropdown
                            value={moduleFilter}
                            options={[
                                { label: 'All Modules', value: 'all' },
                                { label: 'Invoice', value: 'invoice' },
                                { label: 'Voucher', value: 'voucher' }
                            ]}
                            onChange={(event) => setModuleFilter(event.value)}
                            style={{ width: '170px' }}
                        />
                    </div>
                }
                headerRight={
                    <AppReportActions
                        onRefresh={() => {
                            void refetch();
                        }}
                        showRefresh
                        refreshDisabled={templatesLoading}
                        loadingState={templatesLoading}
                    />
                }
                recordSummary={`${filteredTemplates.length} template${filteredTemplates.length === 1 ? '' : 's'}`}
            >
                <Column field="templateName" header="Template Name" sortable style={{ minWidth: '14rem' }} />
                <Column field="templateKey" header="Template Key" sortable style={{ minWidth: '10rem' }} />
                <Column field="moduleKey" header="Module" sortable style={{ width: '8rem' }} />
                <Column field="usageKey" header="Usage" sortable style={{ width: '8rem' }} />
                <Column field="dataSourceKey" header="Data Source" sortable style={{ minWidth: '14rem' }} />
                <Column
                    header="Default"
                    body={(row: ReportTemplateRow) =>
                        row.isDefaultFlag ? <Tag value="Default" severity="success" /> : <Tag value="No" />
                    }
                    style={{ width: '7.5rem', textAlign: 'center' }}
                />
                <Column
                    header="Active"
                    body={(row: ReportTemplateRow) =>
                        row.isActiveFlag !== false ? <Tag value="Active" severity="info" /> : <Tag value="Inactive" severity="warning" />
                    }
                    style={{ width: '7.5rem', textAlign: 'center' }}
                />
                <Column
                    header="Actions"
                    body={(row: ReportTemplateRow) => (
                        <div className="flex gap-1">
                            <Button icon="pi pi-pencil" className="p-button-text p-button-sm" onClick={() => handleEdit(row)} />
                            <Button icon="pi pi-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => handleDelete(row)} />
                        </div>
                    )}
                    style={{ width: '7rem' }}
                />
            </AppDataTable>

            <div className="mt-4 p-3 border-1 surface-border border-round">
                <div className="grid">
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Module</label>
                        <AppDropdown
                            value={form.moduleKey}
                            options={[
                                { label: 'Invoice', value: 'invoice' },
                                { label: 'Voucher', value: 'voucher' }
                            ]}
                            onChange={(event) => {
                                const nextModule = event.value as ReportTemplateFormState['moduleKey'];
                                const nextSource =
                                    dataSources.find((source) => source.moduleKey === nextModule)?.dataSourceKey ?? '';
                                patchForm({
                                    moduleKey: nextModule,
                                    dataSourceKey: nextSource,
                                    selectedFieldKeys: [],
                                    definition: createEmptyReportDefinition(nextSource)
                                });
                            }}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Usage Key</label>
                        <AppInput value={form.usageKey} onChange={(event) => patchForm({ usageKey: event.target.value })} style={{ width: '100%' }} />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Template Name</label>
                        <AppInput
                            value={form.templateName}
                            onChange={(event) => patchForm({ templateName: event.target.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Template Key</label>
                        <AppInput value={form.templateKey} onChange={(event) => patchForm({ templateKey: event.target.value })} style={{ width: '100%' }} />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Data Source</label>
                        <AppDropdown
                            value={form.dataSourceKey}
                            options={dataSourceOptions}
                            onChange={(event) => {
                                const nextDataSourceKey = String(event.value ?? '');
                                const nextSource = dataSources.find((source) => source.dataSourceKey === nextDataSourceKey) ?? null;
                                patchForm({
                                    dataSourceKey: nextDataSourceKey,
                                    selectedFieldKeys: (nextSource?.fields ?? []).slice(0, 8).map((field) => field.key),
                                    definition: createEmptyReportDefinition(nextDataSourceKey)
                                });
                            }}
                            placeholder="Select data source"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Description</label>
                        <AppInput
                            value={form.description}
                            onChange={(event) => patchForm({ description: event.target.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Page Size</label>
                        <AppDropdown
                            value={form.pageSize}
                            options={['A4', 'A5', 'Letter', 'Legal'].map((value) => ({ label: value, value }))}
                            onChange={(event) => patchForm({ pageSize: event.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Orientation</label>
                        <AppDropdown
                            value={form.orientation}
                            options={[
                                { label: 'Portrait', value: 'portrait' },
                                { label: 'Landscape', value: 'landscape' }
                            ]}
                            onChange={(event) => patchForm({ orientation: event.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Render Mode</label>
                        <AppDropdown
                            value={form.renderMode}
                            options={[
                                { label: 'Standard Table / Canvas', value: 'standard' },
                                { label: 'Legacy Invoice Ledger (RDLC)', value: 'legacy_invoice_ledger' },
                                { label: 'Legacy Loading Sheet (RDLC)', value: 'legacy_loading_sheet' }
                            ]}
                            onChange={(event) =>
                                patchForm({
                                    renderMode:
                                        event.value === 'legacy_invoice_ledger' || event.value === 'legacy_loading_sheet'
                                            ? event.value
                                            : 'standard'
                                })
                            }
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Quick Fields (Optional)</label>
                        <AppMultiSelect
                            value={form.selectedFieldKeys}
                            options={selectedFieldOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => patchForm({ selectedFieldKeys: event.value ?? [] })}
                            display="chip"
                            maxSelectedLabels={2}
                            filter
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-6 md:col-3">
                        <label className="block text-600 mb-1">Margin Top (mm)</label>
                        <AppInput
                            inputType="number"
                            value={form.marginTopMm}
                            onValueChange={(event) => patchForm({ marginTopMm: Number(event.value ?? 0) })}
                            style={{ width: '100%' }}
                            min={0}
                            max={50}
                        />
                    </div>
                    <div className="col-6 md:col-3">
                        <label className="block text-600 mb-1">Margin Right (mm)</label>
                        <AppInput
                            inputType="number"
                            value={form.marginRightMm}
                            onValueChange={(event) => patchForm({ marginRightMm: Number(event.value ?? 0) })}
                            style={{ width: '100%' }}
                            min={0}
                            max={50}
                        />
                    </div>
                    <div className="col-6 md:col-3">
                        <label className="block text-600 mb-1">Margin Bottom (mm)</label>
                        <AppInput
                            inputType="number"
                            value={form.marginBottomMm}
                            onValueChange={(event) => patchForm({ marginBottomMm: Number(event.value ?? 0) })}
                            style={{ width: '100%' }}
                            min={0}
                            max={50}
                        />
                    </div>
                    <div className="col-6 md:col-3">
                        <label className="block text-600 mb-1">Margin Left (mm)</label>
                        <AppInput
                            inputType="number"
                            value={form.marginLeftMm}
                            onValueChange={(event) => patchForm({ marginLeftMm: Number(event.value ?? 0) })}
                            style={{ width: '100%' }}
                            min={0}
                            max={50}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Header Text</label>
                        <AppInput
                            value={form.headerText}
                            onChange={(event) => patchForm({ headerText: event.target.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Footer Text</label>
                        <AppInput
                            value={form.footerText}
                            onChange={(event) => patchForm({ footerText: event.target.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Company Header</label>
                        <AppDropdown
                            value={form.showCompanyHeader ? 1 : 0}
                            options={[
                                { label: 'Show', value: 1 },
                                { label: 'Hide', value: 0 }
                            ]}
                            onChange={(event) => patchForm({ showCompanyHeader: event.value === 1 })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Company Name (Override)</label>
                        <AppInput
                            value={form.companyNameOverride}
                            onChange={(event) => patchForm({ companyNameOverride: event.target.value })}
                            placeholder="Leave blank to use runtime company name"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Company Address (Override)</label>
                        <AppInput
                            value={form.companyAddressOverride}
                            onChange={(event) => patchForm({ companyAddressOverride: event.target.value })}
                            placeholder="Leave blank to use runtime company address"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Company Logo URL</label>
                        <AppInput
                            value={form.companyLogoUrl}
                            onChange={(event) => patchForm({ companyLogoUrl: event.target.value })}
                            placeholder="https://... or /assets/logo.png or data:image/..."
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Header Align</label>
                        <AppDropdown
                            value={form.companyHeaderAlign}
                            options={[
                                { label: 'Left', value: 'left' },
                                { label: 'Center', value: 'center' },
                                { label: 'Right', value: 'right' }
                            ]}
                            onChange={(event) =>
                                patchForm({
                                    companyHeaderAlign:
                                        event.value === 'left' || event.value === 'right' ? event.value : 'center'
                                })
                            }
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Logo Width (mm)</label>
                        <AppInput
                            inputType="number"
                            value={form.companyLogoWidthMm}
                            onValueChange={(event) => patchForm({ companyLogoWidthMm: Number(event.value ?? 18) })}
                            min={8}
                            max={80}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Name Font (pt)</label>
                        <AppInput
                            inputType="number"
                            value={form.companyNameFontSizePt}
                            onValueChange={(event) => patchForm({ companyNameFontSizePt: Number(event.value ?? 15) })}
                            min={8}
                            max={28}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Address Font (pt)</label>
                        <AppInput
                            inputType="number"
                            value={form.companyAddressFontSizePt}
                            onValueChange={(event) => patchForm({ companyAddressFontSizePt: Number(event.value ?? 11) })}
                            min={7}
                            max={20}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Header Divider</label>
                        <AppDropdown
                            value={form.showHeaderDivider ? 1 : 0}
                            options={[
                                { label: 'Show', value: 1 },
                                { label: 'Hide', value: 0 }
                            ]}
                            onChange={(event) => patchForm({ showHeaderDivider: event.value === 1 })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Row Numbers</label>
                        <AppDropdown
                            value={form.showRowNumbers ? 1 : 0}
                            options={[
                                { label: 'Show', value: 1 },
                                { label: 'Hide', value: 0 }
                            ]}
                            onChange={(event) => patchForm({ showRowNumbers: event.value === 1 })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Default Template</label>
                        <AppDropdown
                            value={form.isDefaultFlag ? 1 : 0}
                            options={[
                                { label: 'Yes', value: 1 },
                                { label: 'No', value: 0 }
                            ]}
                            onChange={(event) => patchForm({ isDefaultFlag: event.value === 1 })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Status</label>
                        <AppDropdown
                            value={form.isActiveFlag ? 1 : 0}
                            options={[
                                { label: 'Active', value: 1 },
                                { label: 'Inactive', value: 0 }
                            ]}
                            onChange={(event) => patchForm({ isActiveFlag: event.value === 1 })}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
                <div className="mt-3 border-1 surface-border border-round p-2">
                    <div className="flex align-items-start justify-content-between gap-3 flex-wrap mb-2">
                        <div>
                            <h4 className="m-0">Report Designer V2</h4>
                            <small className="text-600">
                                Design page/report sections with positioned items and grouped table regions. Legacy render modes remain available while the new designer replaces the old canvas model.
                            </small>
                        </div>
                        {availablePresets.length > 0 ? (
                            <div className="flex gap-2 flex-wrap">
                                {availablePresets.map((preset) => (
                                    <div key={preset.key} className="flex gap-1 align-items-center">
                                        <Button
                                            label={preset.label}
                                            icon="pi pi-star"
                                            className="app-action-compact p-button-outlined"
                                            onClick={() => applyPreset(preset.key)}
                                            disabled={saving}
                                        />
                                        <Button
                                            icon="pi pi-save"
                                            className="app-action-compact p-button-outlined"
                                            onClick={() => {
                                                void savePresetTemplate(preset.key);
                                            }}
                                            disabled={saving}
                                            aria-label={`Save ${preset.label}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    <ReportTemplateDesignerV2
                        value={form.definition}
                        onChange={(definition) => patchForm({ definition })}
                        pageSize={form.pageSize}
                        orientation={form.orientation}
                        marginTopMm={form.marginTopMm}
                        marginRightMm={form.marginRightMm}
                        marginBottomMm={form.marginBottomMm}
                        marginLeftMm={form.marginLeftMm}
                        fields={(selectedDataSource?.fields ?? []).map((field) => ({
                            key: field.key,
                            label: field.label,
                            dataType: field.dataType
                        }))}
                    />
                </div>
                <div className="flex gap-2 justify-content-end mt-2">
                    <Button
                        label="Reset"
                        icon="pi pi-refresh"
                        className="app-action-compact p-button-outlined"
                        onClick={resetForm}
                        disabled={saving}
                    />
                    <Button
                        label="Preview"
                        icon="pi pi-eye"
                        className="app-action-compact p-button-outlined"
                        onClick={handlePreview}
                        disabled={saving || previewingLive}
                    />
                    <Button
                        label={previewingLive ? 'Previewing...' : 'Preview Live'}
                        icon="pi pi-database"
                        className="app-action-compact p-button-outlined"
                        onClick={() => {
                            void handleLivePreview();
                        }}
                        loading={previewingLive}
                        disabled={saving || previewingLive}
                    />
                    <Button
                        label={saving ? 'Saving...' : form.reportTemplateId ? 'Update Template' : 'Create Template'}
                        icon="pi pi-check"
                        className="app-action-compact"
                        onClick={() => {
                            void handleSave();
                        }}
                        disabled={saving}
                    />
                </div>
            </div>
        </div>
    );
}
