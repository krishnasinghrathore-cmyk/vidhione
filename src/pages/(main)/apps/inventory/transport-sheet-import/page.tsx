'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { formatAmount, toDateText } from '@/pages/(main)/apps/billing/helpers';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { LayoutContext } from '@/layout/context/layoutcontext';

type ImportSourceOption = {
    label: string;
    value: 'transport-sheet' | 'dispatch-register' | 'custom';
};

type MappingFieldKey =
    | 'voucherNumber'
    | 'voucherDate'
    | 'itemBrand'
    | 'itemName'
    | 'unitName'
    | 'quantity'
    | 'mrp'
    | 'cost';

type MappingFieldDefinition = {
    key: MappingFieldKey;
    label: string;
    required: boolean;
    aliases: string[];
};

type MappingState = Record<MappingFieldKey, string | null>;

type ParsedSheetData = {
    fileName: string;
    sheetName: string | null;
    headers: string[];
    rows: string[][];
};

type PreviewStatus = 'valid' | 'duplicate' | 'error';

type PreviewRow = {
    rowNo: number;
    status: PreviewStatus;
    voucherNumber: string;
    voucherDate: string;
    itemBrand: string;
    itemName: string;
    unitName: string;
    quantity: number | null;
    mrp: number | null;
    cost: number | null;
    amount: number | null;
    issues: string[];
};

type ValidationSummary = {
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    errorRows: number;
    validAmount: number;
};

type ValidationResult = {
    mappingErrors: string[];
    rows: PreviewRow[];
    summary: ValidationSummary;
};

type ImportResultSummary = {
    created: number;
    skipped: number;
    failed: number;
    importedAt: Date;
};

type ImportAuditRecord = {
    auditId: string;
    batchKey: string;
    fileName: string;
    sourceType: ImportSourceOption['value'];
    importedAt: string;
    created: number;
    skipped: number;
    failed: number;
    status: 'success' | 'partial' | 'failed';
    note: string | null;
};

type ProductBrandsQueryData = {
    productBrands: Array<{
        productBrandId: number;
        name: string | null;
    }>;
};

type ProductsQueryData = {
    products: Array<{
        productId: number;
        name: string | null;
        productBrandId: number | null;
    }>;
};

type UnitsQueryData = {
    units: Array<{
        unitId: number;
        name: string | null;
        einvoiceUnitName: string | null;
        einvoiceUnitAlias: string | null;
    }>;
};

type CreateStockInMutationData = {
    createStockIn: {
        stockInId: number;
    };
};

type CreateStockInMutationVariables = {
  voucherNumber?: string | null;
  voucherDateText: string;
  itemBrandId?: number | null;
    isCancelledFlag?: number | null;
    lines: Array<{
        itemId: number;
        unitId?: number | null;
        quantity: number;
        mrp?: number | null;
        cost?: number | null;
        sellingRate?: number | null;
        landingCost?: number | null;
    }>;
};

type ClaimImportBatchMutationData = {
    claimImportBatch: {
        sourceKey: string;
        batchKey: string;
        isDuplicate: boolean;
        claimCount: number;
        firstSeenAt: string | null;
        lastSeenAt: string | null;
    };
};

type ClaimImportBatchMutationVariables = {
    sourceKey: string;
    batchKey: string;
    allowRerun?: boolean | null;
};

const PRODUCT_BRANDS = gql`
    query ProductBrands {
        productBrands {
            productBrandId
            name
        }
    }
`;

const PRODUCTS = gql`
    query Products($limit: Int) {
        products(limit: $limit) {
            productId
            name
            productBrandId
        }
    }
`;

const UNITS = gql`
    query Units($limit: Int) {
        units(limit: $limit) {
            unitId
            name
            einvoiceUnitName
            einvoiceUnitAlias
        }
    }
`;

const CREATE_STOCK_IN = gql`
    mutation CreateStockIn(
        $voucherNumber: String
        $voucherDateText: String!
        $itemBrandId: Int
        $isCancelledFlag: Int
        $lines: [StockInLineInput!]!
    ) {
        createStockIn(
            voucherNumber: $voucherNumber
            voucherDateText: $voucherDateText
            itemBrandId: $itemBrandId
            isCancelledFlag: $isCancelledFlag
            lines: $lines
        ) {
            stockInId
        }
    }
`;

const CLAIM_IMPORT_BATCH = gql`
    mutation ClaimImportBatch($sourceKey: String!, $batchKey: String!, $allowRerun: Boolean) {
        claimImportBatch(sourceKey: $sourceKey, batchKey: $batchKey, allowRerun: $allowRerun) {
            sourceKey
            batchKey
            isDuplicate
            claimCount
            firstSeenAt
            lastSeenAt
        }
    }
`;

const TRANSPORT_IMPORT_HISTORY_KEY = 'inventory_transport_sheet_import_audit_v1';
const TRANSPORT_IMPORT_HISTORY_LIMIT = 40;

const sourceOptions: ImportSourceOption[] = [
    { label: 'Transport Sheet', value: 'transport-sheet' },
    { label: 'Dispatch Register', value: 'dispatch-register' },
    { label: 'Custom Sheet', value: 'custom' }
];

const mappingFields: MappingFieldDefinition[] = [
    {
        key: 'voucherNumber',
        label: 'Voucher No',
        required: false,
        aliases: ['voucher', 'voucher no', 'voucher number', 'entry', 'entry no', 'invoice no', 'bill no']
    },
    {
        key: 'voucherDate',
        label: 'Voucher Date',
        required: true,
        aliases: ['voucher date', 'date', 'bill date', 'invoice date', 'entry date']
    },
    {
        key: 'itemBrand',
        label: 'Item Brand',
        required: false,
        aliases: ['brand', 'item brand', 'company', 'manufacturer']
    },
    {
        key: 'itemName',
        label: 'Item',
        required: true,
        aliases: ['item', 'item name', 'product', 'product name', 'sku', 'material']
    },
    {
        key: 'unitName',
        label: 'Unit',
        required: false,
        aliases: ['unit', 'uom', 'pack', 'packing']
    },
    {
        key: 'quantity',
        label: 'Quantity',
        required: true,
        aliases: ['qty', 'quantity', 'nos', 'no', 'pieces']
    },
    {
        key: 'mrp',
        label: 'MRP',
        required: true,
        aliases: ['mrp', 'm.r.p', 'retail', 'selling rate']
    },
    {
        key: 'cost',
        label: 'Cost',
        required: true,
        aliases: ['cost', 'rate', 'purchase rate', 'landing cost']
    }
];

const initialMapping = mappingFields.reduce((acc, field) => {
    acc[field.key] = null;
    return acc;
}, {} as MappingState);

const normalizeHeader = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[_-]/g, ' ')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeLookupKey = (value: string) => normalizeHeader(value);

const hashText = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
};

const loadImportAuditHistory = (): ImportAuditRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(TRANSPORT_IMPORT_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ImportAuditRecord[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((row) => row && typeof row.auditId === 'string');
    } catch {
        return [];
    }
};

const persistImportAuditHistory = (rows: ImportAuditRecord[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
        TRANSPORT_IMPORT_HISTORY_KEY,
        JSON.stringify(rows.slice(0, TRANSPORT_IMPORT_HISTORY_LIMIT))
    );
};

const normalizeCell = (value: unknown) => {
    if (value == null) return '';
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return String(value).trim();
};

const parseCsvText = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
            continue;
        }
        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') i += 1;
            row.push(current);
            rows.push(row);
            row = [];
            current = '';
            continue;
        }
        current += char;
    }

    row.push(current);
    rows.push(row);
    return rows;
};

const findHeaderRowIndex = (rows: string[][]): number => {
    const maxScan = Math.min(rows.length, 12);
    for (let i = 0; i < maxScan; i += 1) {
        const row = rows[i] ?? [];
        const nonEmpty = row.filter((value) => value.trim().length > 0).length;
        const alpha = row.filter((value) => /[A-Za-z]/.test(value)).length;
        if (nonEmpty >= 2 && alpha >= 1) return i;
    }
    return 0;
};

const buildHeaders = (headerRow: string[]): string[] => {
    const used = new Map<string, number>();
    return headerRow.map((value, idx) => {
        const base = value.trim() || `Column${idx + 1}`;
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        if (count === 0) return base;
        return `${base}_${count + 1}`;
    });
};

const toSheetData = (
    rows: string[][],
    meta: {
        fileName: string;
        sheetName: string | null;
    }
): ParsedSheetData => {
    const cleaned = rows
        .map((row) => row.map((cell) => normalizeCell(cell)))
        .filter((row) => row.some((cell) => cell !== ''));

    if (!cleaned.length) {
        throw new Error('No data rows found in selected file.');
    }

    const headerIndex = findHeaderRowIndex(cleaned);
    const headerRow = cleaned[headerIndex] ?? [];
    const headers = buildHeaders(headerRow);

    const dataRows = cleaned
        .slice(headerIndex + 1)
        .map((row) => {
            if (row.length < headers.length) {
                return [...row, ...Array(headers.length - row.length).fill('')];
            }
            return row.slice(0, headers.length);
        })
        .filter((row) => row.some((cell) => cell.trim() !== ''));

    if (!headers.length) {
        throw new Error('Header row is empty. Please upload a file with headers.');
    }
    if (!dataRows.length) {
        throw new Error('No detail rows found below the header row.');
    }

    return {
        fileName: meta.fileName,
        sheetName: meta.sheetName,
        headers,
        rows: dataRows
    };
};

const parseFileToSheetData = async (file: File, requestedSheetName: string): Promise<ParsedSheetData> => {
    const lowerName = file.name.toLowerCase();
    const ext = lowerName.includes('.') ? lowerName.split('.').pop() ?? '' : '';

    if (ext === 'csv' || file.type.toLowerCase().includes('csv') || file.type === 'text/plain') {
        const text = await file.text();
        return toSheetData(parseCsvText(text), { fileName: file.name, sheetName: null });
    }

    if (['xlsx', 'xls', 'xlsm'].includes(ext) || file.type.toLowerCase().includes('excel')) {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const requested = requestedSheetName.trim();
        const sheetName =
            (requested && workbook.SheetNames.find((name) => name.toLowerCase() === requested.toLowerCase())) ||
            workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error('Workbook does not contain any sheet.');
        }
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
        return toSheetData(rawRows as string[][], { fileName: file.name, sheetName });
    }

    throw new Error('Unsupported file type. Upload CSV, XLS, or XLSX.');
};

const scoreHeaderMatch = (header: string, aliases: string[]): number => {
    const normalized = normalizeHeader(header);
    if (!normalized) return 0;
    let best = 0;
    aliases.forEach((alias) => {
        const normalizedAlias = normalizeHeader(alias);
        if (!normalizedAlias) return;
        if (normalized === normalizedAlias) {
            best = Math.max(best, 100 + normalizedAlias.length);
            return;
        }
        if (normalized.includes(normalizedAlias)) {
            best = Math.max(best, 50 + normalizedAlias.length);
        }
    });
    return best;
};

const buildAutoMapping = (headers: string[]): MappingState => {
    const mapped: MappingState = { ...initialMapping };
    const used = new Set<string>();

    mappingFields.forEach((field) => {
        let bestHeader: string | null = null;
        let bestScore = 0;
        headers.forEach((header) => {
            if (used.has(header)) return;
            const score = scoreHeaderMatch(header, field.aliases);
            if (score > bestScore) {
                bestScore = score;
                bestHeader = header;
            }
        });
        if (bestHeader && bestScore > 0) {
            mapped[field.key] = bestHeader;
            used.add(bestHeader);
        }
    });

    return mapped;
};

const mergeMappingForHeaders = (headers: string[], previous: MappingState): MappingState => {
    const validHeaders = new Set(headers);
    const base = buildAutoMapping(headers);
    mappingFields.forEach((field) => {
        const previousValue = previous[field.key];
        if (previousValue && validHeaders.has(previousValue)) {
            base[field.key] = previousValue;
        }
    });
    return base;
};

const parsePositiveNumber = (value: string): number | null => {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
};

const parseDateValue = (value: string): Date | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{8}$/.test(trimmed)) {
        const yyyy = Number(trimmed.slice(0, 4));
        const mm = Number(trimmed.slice(4, 6));
        const dd = Number(trimmed.slice(6, 8));
        const date = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [yyyy, mm, dd] = trimmed.split('-').map(Number);
        const date = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (slashMatch) {
        const dd = Number(slashMatch[1]);
        const mm = Number(slashMatch[2]);
        const yyyy = Number(slashMatch[3]);
        const date = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getIssueSummary = (issues: string[]) => issues.join(' | ');

const validateSheetData = (parsedData: ParsedSheetData, mapping: MappingState): ValidationResult => {
    const mappedValues = Object.values(mapping).filter((value): value is string => Boolean(value));
    const mappingErrors: string[] = [];
    const duplicateMappingHeaders = mappedValues.filter(
        (header, idx) => mappedValues.indexOf(header) !== idx
    );
    if (duplicateMappingHeaders.length > 0) {
        const distinct = Array.from(new Set(duplicateMappingHeaders));
        mappingErrors.push(
            `Same file column is mapped multiple times: ${distinct.join(', ')}`
        );
    }
    mappingFields
        .filter((field) => field.required)
        .forEach((field) => {
            if (!mapping[field.key]) {
                mappingErrors.push(`Map required field "${field.label}" before validation.`);
            }
        });

    if (mappingErrors.length > 0) {
        return {
            mappingErrors,
            rows: [],
            summary: {
                totalRows: parsedData.rows.length,
                validRows: 0,
                duplicateRows: 0,
                errorRows: 0,
                validAmount: 0
            }
        };
    }

    const headerIndexByName = new Map<string, number>();
    parsedData.headers.forEach((header, index) => headerIndexByName.set(header, index));

    const getMappedCell = (row: string[], key: MappingFieldKey): string => {
        const header = mapping[key];
        if (!header) return '';
        const index = headerIndexByName.get(header);
        if (index == null) return '';
        return (row[index] ?? '').trim();
    };

    const seenSignatures = new Set<string>();
    const previewRows: PreviewRow[] = parsedData.rows.map((row, idx) => {
        const voucherNumber = getMappedCell(row, 'voucherNumber');
        const voucherDate = getMappedCell(row, 'voucherDate');
        const itemBrand = getMappedCell(row, 'itemBrand');
        const itemName = getMappedCell(row, 'itemName');
        const unitName = getMappedCell(row, 'unitName');
        const quantityText = getMappedCell(row, 'quantity');
        const mrpText = getMappedCell(row, 'mrp');
        const costText = getMappedCell(row, 'cost');

        const issues: string[] = [];
        const parsedDate = parseDateValue(voucherDate);
        const quantity = parsePositiveNumber(quantityText);
        const mrp = parsePositiveNumber(mrpText);
        const cost = parsePositiveNumber(costText);

        if (!parsedDate) issues.push('Invalid voucher date');
        if (!itemName) issues.push('Item is required');
        if (quantity == null) issues.push('Quantity must be greater than zero');
        if (mrp == null) issues.push('MRP must be greater than zero');
        if (cost == null) issues.push('Cost must be greater than zero');

        let status: PreviewStatus = issues.length > 0 ? 'error' : 'valid';
        const amount = quantity != null && cost != null ? quantity * cost : null;
        const dateKey = parsedDate ? parsedDate.toISOString().slice(0, 10) : voucherDate;
        const signature = `${voucherNumber.trim().toLowerCase()}|${dateKey}|${itemName
            .trim()
            .toLowerCase()}|${quantity ?? ''}|${cost ?? ''}`;

        if (status === 'valid') {
            if (seenSignatures.has(signature)) {
                status = 'duplicate';
                issues.push('Duplicate row detected in this file');
            } else {
                seenSignatures.add(signature);
            }
        }

        return {
            rowNo: idx + 1,
            status,
            voucherNumber,
            voucherDate,
            itemBrand,
            itemName,
            unitName,
            quantity,
            mrp,
            cost,
            amount,
            issues
        };
    });

    const summary = previewRows.reduce<ValidationSummary>(
        (acc, row) => {
            acc.totalRows += 1;
            if (row.status === 'valid') {
                acc.validRows += 1;
                acc.validAmount += row.amount ?? 0;
            } else if (row.status === 'duplicate') {
                acc.duplicateRows += 1;
            } else {
                acc.errorRows += 1;
            }
            return acc;
        },
        {
            totalRows: 0,
            validRows: 0,
            duplicateRows: 0,
            errorRows: 0,
            validAmount: 0
        }
    );

    return {
        mappingErrors: [],
        rows: previewRows,
        summary
    };
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
};

const buildTemplateCsv = () => {
    const headers = [
        'Voucher No',
        'Voucher Date',
        'Item Brand',
        'Item',
        'Unit',
        'Quantity',
        'MRP',
        'Cost'
    ];
    const sample = ['SI-1001', '2026-03-01', 'General', 'Sample Product', 'Nos', '10', '125.00', '101.00'];
    return `${headers.join(',')}\n${sample.join(',')}`;
};

export default function InventoryTransportSheetImportPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const toastRef = useRef<Toast>(null);

    const [sourceType, setSourceType] = useState<ImportSourceOption['value']>('transport-sheet');
    const [sheetName, setSheetName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
    const [mapping, setMapping] = useState<MappingState>({ ...initialMapping });
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);
    const [importIssues, setImportIssues] = useState<string[]>([]);
    const [allowRerunBatch, setAllowRerunBatch] = useState(false);
    const [auditHistory, setAuditHistory] = useState<ImportAuditRecord[]>([]);

    useEffect(() => {
        setPageTitle('Transport Sheet Import');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    useEffect(() => {
        setAuditHistory(loadImportAuditHistory());
    }, []);

    const {
        data: brandData,
        loading: brandsLoading,
        error: brandsError
    } = useQuery<ProductBrandsQueryData>(PRODUCT_BRANDS, {
        client: inventoryApolloClient,
        fetchPolicy: 'cache-first'
    });

    const {
        data: productData,
        loading: productsLoading,
        error: productsError
    } = useQuery<ProductsQueryData>(PRODUCTS, {
        client: inventoryApolloClient,
        variables: { limit: 4000 },
        fetchPolicy: 'cache-first'
    });

    const {
        data: unitsData,
        loading: unitsLoading,
        error: unitsError
    } = useQuery<UnitsQueryData>(UNITS, {
        client: inventoryApolloClient,
        variables: { limit: 2000 },
        fetchPolicy: 'cache-first'
    });

    const [createStockIn, { loading: creatingStockIn }] = useMutation<
        CreateStockInMutationData,
        CreateStockInMutationVariables
    >(CREATE_STOCK_IN, {
        client: inventoryApolloClient
    });

    const [claimImportBatch, { loading: claimingBatch }] = useMutation<
        ClaimImportBatchMutationData,
        ClaimImportBatchMutationVariables
    >(CLAIM_IMPORT_BATCH, {
        client: inventoryApolloClient
    });

    const fileSummary = useMemo(() => {
        if (!selectedFile) return 'No file selected';
        const sizeKb = Math.max(1, Math.round(selectedFile.size / 1024));
        return `${selectedFile.name} (${sizeKb} KB)`;
    }, [selectedFile]);

    const headerOptions = useMemo(
        () => [
            { label: 'Not mapped', value: null as string | null },
            ...(parsedData?.headers ?? []).map((header) => ({ label: header, value: header }))
        ],
        [parsedData?.headers]
    );

    const currentBatchKey = useMemo(() => {
        if (!parsedData || !validation) return null;
        const validRows = validation.rows
            .filter((row) => row.status === 'valid')
            .map((row) =>
                [
                    row.voucherNumber.trim().toLowerCase(),
                    row.voucherDate.trim(),
                    row.itemBrand.trim().toLowerCase(),
                    row.itemName.trim().toLowerCase(),
                    row.unitName.trim().toLowerCase(),
                    row.quantity ?? '',
                    row.mrp ?? '',
                    row.cost ?? ''
                ].join('|')
            );
        if (validRows.length === 0) return null;
        const payload = [
            sourceType,
            parsedData.fileName,
            parsedData.sheetName ?? '',
            parsedData.headers.join('|'),
            ...validRows
        ].join('\n');
        return `tsi-${hashText(payload)}`;
    }, [parsedData, sourceType, validation]);

    const previousSuccessfulRun = useMemo(() => {
        if (!currentBatchKey) return null;
        return (
            auditHistory.find(
                (record) => record.batchKey === currentBatchKey && record.created > 0 && record.failed === 0
            ) ?? null
        );
    }, [auditHistory, currentBatchKey]);

    const canImport =
        Boolean(validation) &&
        (validation?.mappingErrors.length ?? 0) === 0 &&
        (validation?.summary.validRows ?? 0) > 0 &&
        !parsing &&
        !importing &&
        !creatingStockIn &&
        !claimingBatch;

    const resetAll = () => {
        setSelectedFile(null);
        setParsedData(null);
        setMapping({ ...initialMapping });
        setValidation(null);
        setImportResult(null);
        setImportIssues([]);
        setAllowRerunBatch(false);
    };

    const appendAuditRecord = (
        result: ImportResultSummary,
        batchKey: string | null,
        note: string | null
    ) => {
        const now = new Date();
        const status: ImportAuditRecord['status'] =
            result.created > 0 && result.failed === 0
                ? 'success'
                : result.created > 0
                  ? 'partial'
                  : 'failed';
        const next: ImportAuditRecord = {
            auditId: `${now.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
            batchKey: batchKey ?? `adhoc-${now.getTime()}`,
            fileName: selectedFile?.name ?? parsedData?.fileName ?? 'n/a',
            sourceType,
            importedAt: now.toISOString(),
            created: result.created,
            skipped: result.skipped,
            failed: result.failed,
            status,
            note
        };
        setAuditHistory((prev) => {
            const combined = [next, ...prev].slice(0, TRANSPORT_IMPORT_HISTORY_LIMIT);
            persistImportAuditHistory(combined);
            return combined;
        });
    };

    const handleValidateSheet = async () => {
        if (!selectedFile) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Choose a file',
                detail: 'Select a CSV/XLS/XLSX file before validation.'
            });
            return;
        }

        setImportResult(null);
        setImportIssues([]);
        setParsing(true);
        try {
            const nextParsedData = await parseFileToSheetData(selectedFile, sheetName);
            const nextMapping = mergeMappingForHeaders(nextParsedData.headers, mapping);
            const nextValidation = validateSheetData(nextParsedData, nextMapping);
            setParsedData(nextParsedData);
            setMapping(nextMapping);
            setValidation(nextValidation);
            toastRef.current?.show({
                severity: nextValidation.mappingErrors.length > 0 ? 'warn' : 'success',
                summary: 'Validation complete',
                detail:
                    nextValidation.mappingErrors.length > 0
                        ? 'Fix mapping and validate again.'
                        : `${nextValidation.summary.validRows} valid rows ready for import.`
            });
        } catch (error: unknown) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Validation failed',
                detail: getErrorMessage(error, 'Unable to parse selected file.')
            });
            setParsedData(null);
            setValidation(null);
        } finally {
            setParsing(false);
        }
    };

    const handleMappingChange = (fieldKey: MappingFieldKey, header: string | null) => {
        const nextMapping: MappingState = {
            ...mapping,
            [fieldKey]: header
        };
        setMapping(nextMapping);
        setImportResult(null);
        setImportIssues([]);
        if (parsedData) {
            setValidation(validateSheetData(parsedData, nextMapping));
        }
    };

    const handleImport = async () => {
        if (!validation || validation.mappingErrors.length > 0) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validate sheet first',
                detail: 'Fix mapping issues and run validation before import.'
            });
            return;
        }
        if (validation.summary.validRows === 0) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'No valid rows to import'
            });
            return;
        }
        if (!parsedData) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'No parsed data',
                detail: 'Validate the file once before import.'
            });
            return;
        }
        if (previousSuccessfulRun && !allowRerunBatch) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Batch already imported',
                detail: `This batch was already imported on ${new Date(
                    previousSuccessfulRun.importedAt
                ).toLocaleString('en-GB')}. Enable "Allow re-run same batch" to run again.`
            });
            return;
        }
        if (brandsError || productsError || unitsError) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Master load failed',
                detail: 'Product/brand/unit master data is required before import.'
            });
            return;
        }
        if (brandsLoading || productsLoading || unitsLoading || creatingStockIn || claimingBatch) {
            toastRef.current?.show({
                severity: 'info',
                summary: 'Please wait',
                detail: 'Master data is still loading. Try import again in a moment.'
            });
            return;
        }

        const products = productData?.products ?? [];
        if (products.length === 0) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Products unavailable',
                detail: 'No products found for item resolution.'
            });
            return;
        }

        const productIdByName = new Map<string, number>();
        const productBrandIdByProductId = new Map<number, number | null>();
        products.forEach((product) => {
            const productId = Number(product.productId ?? 0);
            if (!productId) return;
            const name = product.name?.trim();
            if (name) {
                const key = normalizeLookupKey(name);
                if (key && !productIdByName.has(key)) {
                    productIdByName.set(key, productId);
                }
            }
            productBrandIdByProductId.set(
                productId,
                product.productBrandId != null ? Number(product.productBrandId) : null
            );
        });

        const unitIdByName = new Map<string, number>();
        (unitsData?.units ?? []).forEach((unit) => {
            const unitId = Number(unit.unitId ?? 0);
            if (!unitId) return;
            [unit.name, unit.einvoiceUnitName, unit.einvoiceUnitAlias].forEach((text) => {
                const value = text?.trim();
                if (!value) return;
                const key = normalizeLookupKey(value);
                if (key && !unitIdByName.has(key)) {
                    unitIdByName.set(key, unitId);
                }
            });
        });

        const brandIdByName = new Map<string, number>();
        (brandData?.productBrands ?? []).forEach((brand) => {
            const brandId = Number(brand.productBrandId ?? 0);
            const name = brand.name?.trim();
            if (!brandId || !name) return;
            const key = normalizeLookupKey(name);
            if (key && !brandIdByName.has(key)) {
                brandIdByName.set(key, brandId);
            }
        });

        type GroupedPayload = {
            voucherNumber: string | null;
            voucherDateText: string;
            itemBrandId: number | null;
            rowCount: number;
            lines: CreateStockInMutationVariables['lines'];
        };

        const groupedPayloadByKey = new Map<string, GroupedPayload>();
        const issues: string[] = [];
        let unresolvedRows = 0;

        validation.rows
            .filter((row) => row.status === 'valid')
            .forEach((row) => {
                const parsedVoucherDate = parseDateValue(row.voucherDate);
                if (!parsedVoucherDate) {
                    unresolvedRows += 1;
                    issues.push(`Row ${row.rowNo}: unable to parse voucher date.`);
                    return;
                }
                const voucherDateText = toDateText(parsedVoucherDate);
                const itemNameKey = normalizeLookupKey(row.itemName);
                const resolvedItemId = itemNameKey ? productIdByName.get(itemNameKey) ?? null : null;
                if (!resolvedItemId) {
                    unresolvedRows += 1;
                    issues.push(`Row ${row.rowNo}: item "${row.itemName}" not found in product master.`);
                    return;
                }
                const quantity = row.quantity ?? 0;
                const mrp = row.mrp ?? 0;
                const cost = row.cost ?? 0;
                if (quantity <= 0 || mrp <= 0 || cost <= 0) {
                    unresolvedRows += 1;
                    issues.push(`Row ${row.rowNo}: quantity, MRP, and cost must be greater than zero.`);
                    return;
                }

                const brandKey = normalizeLookupKey(row.itemBrand);
                const mappedBrandId =
                    (brandKey ? brandIdByName.get(brandKey) ?? null : null) ??
                    productBrandIdByProductId.get(resolvedItemId) ??
                    null;

                const unitKey = normalizeLookupKey(row.unitName);
                const resolvedUnitId = unitKey ? unitIdByName.get(unitKey) ?? null : null;

                const voucherNumber = row.voucherNumber.trim() ? row.voucherNumber.trim() : null;
                const keyBase = voucherNumber ? voucherNumber : `AUTO-${row.rowNo}`;
                const groupKey = `${keyBase}|${voucherDateText}|${mappedBrandId ?? ''}`;
                const group =
                    groupedPayloadByKey.get(groupKey) ??
                    ({
                        voucherNumber,
                        voucherDateText,
                        itemBrandId: mappedBrandId,
                        rowCount: 0,
                        lines: []
                    } satisfies GroupedPayload);

                group.lines.push({
                    itemId: resolvedItemId,
                    unitId: resolvedUnitId,
                    quantity,
                    mrp,
                    cost,
                    sellingRate: mrp,
                    landingCost: cost
                });
                group.rowCount += 1;
                if (group.itemBrandId == null && mappedBrandId != null) {
                    group.itemBrandId = mappedBrandId;
                }
                groupedPayloadByKey.set(groupKey, group);
            });

        if (groupedPayloadByKey.size === 0) {
            const failed = validation.summary.errorRows + validation.summary.duplicateRows + unresolvedRows;
            const result: ImportResultSummary = {
                created: 0,
                skipped: validation.summary.duplicateRows,
                failed,
                importedAt: new Date()
            };
            setImportResult(result);
            setImportIssues(issues.slice(0, 50));
            appendAuditRecord(result, currentBatchKey, 'No rows converted to stock-in payload');
            toastRef.current?.show({
                severity: 'warn',
                summary: 'No rows imported',
                detail: 'No valid rows could be converted to stock-in payload.'
            });
            return;
        }

        const batchKey =
            currentBatchKey ??
            `tsi-${hashText(
                `${sourceType}|${selectedFile?.name ?? parsedData.fileName}|${Date.now()}`
            )}`;
        try {
            const claimResponse = await claimImportBatch({
                variables: {
                    sourceKey: 'transport-sheet-import',
                    batchKey,
                    allowRerun: allowRerunBatch
                }
            });
            const claimResult = claimResponse.data?.claimImportBatch;
            if (claimResult?.isDuplicate && !allowRerunBatch) {
                toastRef.current?.show({
                    severity: 'warn',
                    summary: 'Batch already claimed',
                    detail: `Batch key ${batchKey} already exists on server. Enable rerun to proceed.`
                });
                return;
            }
        } catch (error: unknown) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Batch claim failed',
                detail: getErrorMessage(error, 'Unable to claim import batch on server.')
            });
            return;
        }

        setImporting(true);
        setImportResult(null);
        setImportIssues([]);

        let createdRows = 0;
        let mutationFailedRows = 0;
        try {
            for (const group of groupedPayloadByKey.values()) {
                try {
                    await createStockIn({
                        variables: {
                            voucherNumber: group.voucherNumber,
                            voucherDateText: group.voucherDateText,
                            itemBrandId: group.itemBrandId,
                            isCancelledFlag: 0,
                            lines: group.lines
                        }
                    });
                    createdRows += group.rowCount;
                } catch (error: unknown) {
                    mutationFailedRows += group.rowCount;
                    issues.push(
                        `Voucher ${group.voucherNumber || '(auto)'}: ${getErrorMessage(
                            error,
                            'failed to create stock-in entry'
                        )}`
                    );
                }
            }
        } finally {
            setImporting(false);
        }

        const result: ImportResultSummary = {
            created: createdRows,
            skipped: validation.summary.duplicateRows,
            failed: validation.summary.errorRows + unresolvedRows + mutationFailedRows,
            importedAt: new Date()
        };
        setImportResult(result);
        setImportIssues(issues.slice(0, 50));
        appendAuditRecord(result, currentBatchKey, issues.length > 0 ? issues[0] : null);

        toastRef.current?.show({
            severity: result.failed > 0 ? 'warn' : 'success',
            summary: result.failed > 0 ? 'Import completed with issues' : 'Import completed',
            detail: `Created ${result.created}, Skipped ${result.skipped}, Failed ${result.failed}.`
        });
    };

    const downloadTemplate = () => {
        const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'transport_sheet_import_template.csv';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    const statusBody = (row: PreviewRow) => {
        if (row.status === 'valid') return <Tag severity="success" value="Valid" />;
        if (row.status === 'duplicate') return <Tag severity="warning" value="Duplicate" />;
        return <Tag severity="danger" value="Error" />;
    };

    const auditStatusBody = (row: ImportAuditRecord) => {
        if (row.status === 'success') return <Tag severity="success" value="Success" />;
        if (row.status === 'partial') return <Tag severity="warning" value="Partial" />;
        return <Tag severity="danger" value="Failed" />;
    };

    return (
        <div className="card app-gradient-card">
            <Toast ref={toastRef} />

            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3">
                <div>
                    <h2 className="m-0">Transport Sheet Import</h2>
                    <p className="mt-2 mb-0 text-600">
                        Upload transport sheets, map source columns, preview validation issues, and import stock-in rows.
                    </p>
                </div>
                <Tag severity="success" value="Backend Import Enabled" />
            </div>

            {(brandsError || productsError || unitsError) && (
                <p className="text-red-500 m-0 mb-2">
                    Error loading masters: {brandsError?.message || productsError?.message || unitsError?.message}
                </p>
            )}

            <div className="grid">
                <div className="col-12 md:col-4">
                    <label htmlFor="transport-sheet-source" className="block text-600 mb-1">
                        Source Type
                    </label>
                    <AppDropdown
                        inputId="transport-sheet-source"
                        value={sourceType}
                        options={sourceOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(event) => setSourceType(event.value as ImportSourceOption['value'])}
                    />
                </div>
                <div className="col-12 md:col-4">
                    <label htmlFor="transport-sheet-tab" className="block text-600 mb-1">
                        Sheet Tab Name (Optional)
                    </label>
                    <AppInput
                        id="transport-sheet-tab"
                        value={sheetName}
                        onChange={(event) => setSheetName(event.target.value)}
                        placeholder="Sheet1"
                    />
                </div>
                <div className="col-12 md:col-4">
                    <label htmlFor="transport-sheet-file" className="block text-600 mb-1">
                        File
                    </label>
                    <input
                        id="transport-sheet-file"
                        type="file"
                        className="w-full"
                        accept=".csv,.xls,.xlsx"
                        onChange={(event) => {
                            setSelectedFile(event.target.files?.[0] ?? null);
                            setParsedData(null);
                            setValidation(null);
                            setImportResult(null);
                            setImportIssues([]);
                            setAllowRerunBatch(false);
                        }}
                    />
                    <small className="text-600">{fileSummary}</small>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 mb-3">
                <Button
                    type="button"
                    className="app-action-compact"
                    icon="pi pi-check-circle"
                    label={parsing ? 'Validating...' : 'Validate Sheet'}
                    onClick={() => void handleValidateSheet()}
                    disabled={!selectedFile || parsing || importing || creatingStockIn || claimingBatch}
                />
                <Button
                    type="button"
                    className="app-action-compact"
                    icon="pi pi-upload"
                    label={importing || creatingStockIn || claimingBatch ? 'Importing...' : 'Import'}
                    onClick={() => void handleImport()}
                    disabled={!canImport}
                />
                <Button
                    type="button"
                    className="p-button-text"
                    icon="pi pi-download"
                    label="Download Template"
                    onClick={downloadTemplate}
                    disabled={parsing || importing || creatingStockIn || claimingBatch}
                />
                <Button
                    type="button"
                    className="p-button-text"
                    icon="pi pi-refresh"
                    label="Reset"
                    onClick={resetAll}
                    disabled={parsing || importing || creatingStockIn || claimingBatch}
                />
            </div>

            {currentBatchKey ? (
                <div className="flex flex-wrap gap-2 align-items-center mb-2">
                    <Tag severity="info" value={`Batch ${currentBatchKey}`} />
                    {previousSuccessfulRun ? (
                        <Tag
                            severity="warning"
                            value={`Previously imported ${new Date(
                                previousSuccessfulRun.importedAt
                            ).toLocaleString('en-GB')}`}
                        />
                    ) : null}
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="transport-allow-rerun-batch"
                            checked={allowRerunBatch}
                            onChange={(event) => setAllowRerunBatch(Boolean(event.checked))}
                        />
                        <label htmlFor="transport-allow-rerun-batch" className="text-700 text-sm">
                            Allow re-run same batch
                        </label>
                    </div>
                </div>
            ) : null}

            {(brandsLoading || productsLoading || unitsLoading) && (
                <p className="text-600 m-0 mb-2">Loading product/brand/unit masters...</p>
            )}

            {parsedData && (
                <div className="surface-50 border-1 surface-border border-round p-3 mb-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <Tag severity="info" value={`Columns: ${parsedData.headers.length}`} />
                        <Tag severity="info" value={`Rows: ${parsedData.rows.length}`} />
                        <Tag severity="info" value={`Source: ${sourceType}`} />
                        {parsedData.sheetName ? <Tag severity="warning" value={`Sheet: ${parsedData.sheetName}`} /> : null}
                    </div>
                    <h3 className="m-0 mb-2 text-900">Column Mapping</h3>
                    <div className="grid">
                        {mappingFields.map((field) => (
                            <div key={field.key} className="col-12 md:col-6">
                                <label htmlFor={`transport-sheet-map-${field.key}`} className="block text-600 mb-1">
                                    {field.label}
                                    {field.required ? <span className="text-red-500 ml-1">*</span> : null}
                                </label>
                                <AppDropdown
                                    inputId={`transport-sheet-map-${field.key}`}
                                    value={mapping[field.key]}
                                    options={headerOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    filter
                                    onChange={(event) =>
                                        handleMappingChange(
                                            field.key,
                                            (event.value as string | null) ?? null
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {validation && (
                <div className="surface-50 border-1 surface-border border-round p-3 mb-3">
                    <h3 className="m-0 mb-2 text-900">Validation Summary</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                        <Tag severity="info" value={`Total: ${validation.summary.totalRows}`} />
                        <Tag severity="success" value={`Valid: ${validation.summary.validRows}`} />
                        <Tag severity="warning" value={`Duplicate: ${validation.summary.duplicateRows}`} />
                        <Tag severity="danger" value={`Error: ${validation.summary.errorRows}`} />
                        <Tag severity="info" value={`Valid Amount: ${formatAmount(validation.summary.validAmount)}`} />
                    </div>
                    {validation.mappingErrors.length > 0 && (
                        <div className="text-red-500 text-sm line-height-3">
                            {validation.mappingErrors.map((errorMessage) => (
                                <div key={errorMessage}>{errorMessage}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {validation && validation.rows.length > 0 && (
                <AppDataTable
                    value={validation.rows}
                    dataKey="rowNo"
                    size="small"
                    stripedRows
                    paginator
                    rows={10}
                    rowsPerPageOptions={[10, 20, 50]}
                    emptyMessage="No preview rows available"
                >
                    <Column field="rowNo" header="Row" style={{ width: '5rem' }} />
                    <Column header="Status" body={statusBody} style={{ width: '8rem' }} />
                    <Column field="voucherNumber" header="Voucher No" style={{ minWidth: '9rem' }} />
                    <Column field="voucherDate" header="Voucher Date" style={{ minWidth: '8rem' }} />
                    <Column field="itemBrand" header="Brand" style={{ minWidth: '10rem' }} />
                    <Column field="itemName" header="Item" style={{ minWidth: '14rem' }} />
                    <Column field="unitName" header="Unit" style={{ minWidth: '7rem' }} />
                    <Column
                        field="quantity"
                        header="Qty"
                        body={(row: PreviewRow) =>
                            row.quantity == null ? '-' : formatAmount(row.quantity)
                        }
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="mrp"
                        header="MRP"
                        body={(row: PreviewRow) => (row.mrp == null ? '-' : formatAmount(row.mrp))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="cost"
                        header="Cost"
                        body={(row: PreviewRow) => (row.cost == null ? '-' : formatAmount(row.cost))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="amount"
                        header="Amount"
                        body={(row: PreviewRow) =>
                            row.amount == null ? '-' : formatAmount(row.amount)
                        }
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '8rem' }}
                    />
                    <Column
                        field="issues"
                        header="Issues"
                        body={(row: PreviewRow) => getIssueSummary(row.issues)}
                        style={{ minWidth: '18rem' }}
                    />
                </AppDataTable>
            )}

            {importResult && (
                <div className="surface-50 border-1 surface-border border-round p-3 mt-3">
                    <h3 className="m-0 mb-2 text-900">Import Result</h3>
                    <div className="flex flex-wrap gap-2">
                        <Tag severity="success" value={`Created: ${importResult.created}`} />
                        <Tag severity="warning" value={`Skipped: ${importResult.skipped}`} />
                        <Tag severity="danger" value={`Failed: ${importResult.failed}`} />
                        <Tag severity="info" value={`Imported: ${importResult.importedAt.toLocaleString('en-GB')}`} />
                    </div>
                    {importIssues.length > 0 && (
                        <div className="mt-2 text-sm text-700 line-height-3">
                            {importIssues.slice(0, 10).map((issue, index) => (
                                <div key={`${issue}-${index}`}>- {issue}</div>
                            ))}
                            {importIssues.length > 10 ? (
                                <div>...and {importIssues.length - 10} more issues</div>
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            {auditHistory.length > 0 && (
                <div className="surface-50 border-1 surface-border border-round p-3 mt-3">
                    <h3 className="m-0 mb-2 text-900">Import Audit History</h3>
                    <AppDataTable
                        value={auditHistory}
                        dataKey="auditId"
                        size="small"
                        stripedRows
                        paginator
                        rows={8}
                        rowsPerPageOptions={[8, 16, 25]}
                        emptyMessage="No import audit records yet"
                    >
                        <Column
                            field="importedAt"
                            header="Imported At"
                            body={(row: ImportAuditRecord) =>
                                new Date(row.importedAt).toLocaleString('en-GB')
                            }
                            style={{ minWidth: '11rem' }}
                        />
                        <Column field="fileName" header="File" style={{ minWidth: '12rem' }} />
                        <Column field="sourceType" header="Source" style={{ minWidth: '8rem' }} />
                        <Column header="Status" body={auditStatusBody} style={{ width: '7rem' }} />
                        <Column field="created" header="Created" style={{ width: '6rem' }} />
                        <Column field="skipped" header="Skipped" style={{ width: '6rem' }} />
                        <Column field="failed" header="Failed" style={{ width: '6rem' }} />
                        <Column
                            field="note"
                            header="Note"
                            body={(row: ImportAuditRecord) => row.note ?? '-'}
                            style={{ minWidth: '16rem' }}
                        />
                    </AppDataTable>
                </div>
            )}
        </div>
    );
}
