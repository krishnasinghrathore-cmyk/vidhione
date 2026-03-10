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
import * as invoicingApi from '@/lib/invoicing/api';
import { useLedgerLookup } from '@/pages/(main)/apps/billing/useLedgerLookup';
import { LayoutContext } from '@/layout/context/layoutcontext';

type BizomSourceOption = {
    label: string;
    value: 'bizom-standard' | 'bizom-custom';
};

type MappingFieldKey =
    | 'invoiceNumber'
    | 'invoiceDate'
    | 'partyName'
    | 'itemName'
    | 'quantity'
    | 'rate'
    | 'taxableAmount'
    | 'taxAmount'
    | 'cgstAmount'
    | 'sgstAmount'
    | 'igstAmount'
    | 'netAmount';

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
    invoiceNumber: string;
    invoiceDate: string;
    partyName: string;
    itemName: string;
    quantity: number | null;
    rate: number | null;
    taxableAmount: number | null;
    taxAmount: number | null;
    cgstAmount: number | null;
    sgstAmount: number | null;
    igstAmount: number | null;
    netAmount: number | null;
    issues: string[];
};

type ValidationSummary = {
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    errorRows: number;
    validNetAmount: number;
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

type TaxMode = 'auto' | 'intra' | 'inter';

type ImportAuditRecord = {
    auditId: string;
    batchKey: string;
    fileName: string;
    sourceType: BizomSourceOption['value'];
    importedAt: string;
    created: number;
    skipped: number;
    failed: number;
    status: 'success' | 'partial' | 'failed';
    note: string | null;
};

type MismatchRow = {
    rowNo: number;
    invoiceNumber: string;
    invoiceDate: string;
    partyName: string;
    itemName: string;
    quantity: number | null;
    rate: number | null;
    taxableAmount: number | null;
    taxAmount: number | null;
    cgstAmount: number | null;
    sgstAmount: number | null;
    igstAmount: number | null;
    netAmount: number | null;
    reason: string;
};

type ProductsQueryData = {
    products: Array<{
        productId: number;
        name: string | null;
    }>;
};

const PRODUCTS = gql`
    query Products($limit: Int) {
        products(limit: $limit) {
            productId
            name
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

const BIZOM_IMPORT_HISTORY_KEY = 'inventory_bizom_import_audit_v1';
const BIZOM_IMPORT_HISTORY_LIMIT = 40;

const sourceOptions: BizomSourceOption[] = [
    { label: 'Bizom Standard Export', value: 'bizom-standard' },
    { label: 'Bizom Custom Export', value: 'bizom-custom' }
];

const taxModeOptions: Array<{ label: string; value: TaxMode }> = [
    { label: 'Auto', value: 'auto' },
    { label: 'Intra-State', value: 'intra' },
    { label: 'Inter-State', value: 'inter' }
];

const mappingFields: MappingFieldDefinition[] = [
    {
        key: 'invoiceNumber',
        label: 'Invoice No',
        required: true,
        aliases: ['invoice no', 'invoice number', 'bill no', 'bill number', 'inv no', 'voucher no']
    },
    {
        key: 'invoiceDate',
        label: 'Invoice Date',
        required: true,
        aliases: ['invoice date', 'bill date', 'date', 'invoice dt']
    },
    {
        key: 'partyName',
        label: 'Party',
        required: true,
        aliases: ['party', 'party name', 'customer', 'distributor', 'retailer']
    },
    {
        key: 'itemName',
        label: 'Item',
        required: true,
        aliases: ['item', 'item name', 'product', 'sku', 'product name']
    },
    {
        key: 'quantity',
        label: 'Quantity',
        required: true,
        aliases: ['qty', 'quantity', 'nos', 'pieces']
    },
    {
        key: 'rate',
        label: 'Rate',
        required: true,
        aliases: ['rate', 'price', 'unit rate', 'selling rate', 'mrp']
    },
    {
        key: 'taxableAmount',
        label: 'Taxable Amount',
        required: false,
        aliases: ['taxable', 'taxable amount', 'base amount']
    },
    {
        key: 'taxAmount',
        label: 'Tax Amount',
        required: false,
        aliases: ['tax amount', 'gst amount', 'vat amount']
    },
    {
        key: 'cgstAmount',
        label: 'CGST Amount',
        required: false,
        aliases: ['cgst', 'cgst amount']
    },
    {
        key: 'sgstAmount',
        label: 'SGST Amount',
        required: false,
        aliases: ['sgst', 'sgst amount']
    },
    {
        key: 'igstAmount',
        label: 'IGST Amount',
        required: false,
        aliases: ['igst', 'igst amount']
    },
    {
        key: 'netAmount',
        label: 'Net Amount',
        required: false,
        aliases: ['net amount', 'invoice amount', 'final amount', 'amount']
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
const round2 = (value: number) => Number(value.toFixed(2));

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
        const raw = window.localStorage.getItem(BIZOM_IMPORT_HISTORY_KEY);
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
        BIZOM_IMPORT_HISTORY_KEY,
        JSON.stringify(rows.slice(0, BIZOM_IMPORT_HISTORY_LIMIT))
    );
};

const csvEscape = (value: string) => {
    if (value.includes('"')) value = value.replace(/"/g, '""');
    if (/[",\n]/.test(value)) return `"${value}"`;
    return value;
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
            if (row.length < headers.length) return [...row, ...Array(headers.length - row.length).fill('')];
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

const parseNonNegativeNumber = (value: string): number | null => {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
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
    const duplicateMappingHeaders = mappedValues.filter((header, idx) => mappedValues.indexOf(header) !== idx);
    if (duplicateMappingHeaders.length > 0) {
        const distinct = Array.from(new Set(duplicateMappingHeaders));
        mappingErrors.push(`Same file column is mapped multiple times: ${distinct.join(', ')}`);
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
                validNetAmount: 0
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
    const rows: PreviewRow[] = parsedData.rows.map((row, idx) => {
        const invoiceNumber = getMappedCell(row, 'invoiceNumber');
        const invoiceDate = getMappedCell(row, 'invoiceDate');
        const partyName = getMappedCell(row, 'partyName');
        const itemName = getMappedCell(row, 'itemName');
        const quantityText = getMappedCell(row, 'quantity');
        const rateText = getMappedCell(row, 'rate');
        const taxableText = getMappedCell(row, 'taxableAmount');
        const taxText = getMappedCell(row, 'taxAmount');
        const cgstText = getMappedCell(row, 'cgstAmount');
        const sgstText = getMappedCell(row, 'sgstAmount');
        const igstText = getMappedCell(row, 'igstAmount');
        const netText = getMappedCell(row, 'netAmount');

        const issues: string[] = [];
        const parsedDate = parseDateValue(invoiceDate);
        const quantity = parsePositiveNumber(quantityText);
        const rate = parsePositiveNumber(rateText);
        const taxableAmountRaw = parseNonNegativeNumber(taxableText);
        const taxAmountRaw = parseNonNegativeNumber(taxText);
        const cgstAmount = parseNonNegativeNumber(cgstText);
        const sgstAmount = parseNonNegativeNumber(sgstText);
        const igstAmount = parseNonNegativeNumber(igstText);
        const netAmountRaw = parseNonNegativeNumber(netText);

        if (!invoiceNumber) issues.push('Invoice number is required');
        if (!parsedDate) issues.push('Invalid invoice date');
        if (!partyName) issues.push('Party is required');
        if (!itemName) issues.push('Item is required');
        if (quantity == null) issues.push('Quantity must be greater than zero');
        if (rate == null) issues.push('Rate must be greater than zero');
        if (taxableText && taxableAmountRaw == null) issues.push('Taxable amount must be >= 0');
        if (taxText && taxAmountRaw == null) issues.push('Tax amount must be >= 0');
        if (cgstText && cgstAmount == null) issues.push('CGST amount must be >= 0');
        if (sgstText && sgstAmount == null) issues.push('SGST amount must be >= 0');
        if (igstText && igstAmount == null) issues.push('IGST amount must be >= 0');
        if (netText && netAmountRaw == null) issues.push('Net amount must be >= 0');

        const taxableAmount =
            taxableAmountRaw != null ? taxableAmountRaw : quantity != null && rate != null ? quantity * rate : null;
        const splitTaxAmount =
            (cgstAmount ?? 0) + (sgstAmount ?? 0) + (igstAmount ?? 0) > 0
                ? (cgstAmount ?? 0) + (sgstAmount ?? 0) + (igstAmount ?? 0)
                : null;
        const taxAmount = taxAmountRaw != null ? taxAmountRaw : splitTaxAmount;
        if (taxAmountRaw != null && splitTaxAmount != null && Math.abs(taxAmountRaw - splitTaxAmount) > 0.5) {
            issues.push('Tax mismatch between total tax and split CGST/SGST/IGST');
        }
        const netAmount =
            netAmountRaw != null ? netAmountRaw : taxableAmount != null ? taxableAmount + (taxAmount ?? 0) : null;

        let status: PreviewStatus = issues.length > 0 ? 'error' : 'valid';
        const dateKey = parsedDate ? parsedDate.toISOString().slice(0, 10) : invoiceDate;
        const signature = `${invoiceNumber.trim().toLowerCase()}|${dateKey}|${partyName
            .trim()
            .toLowerCase()}|${itemName.trim().toLowerCase()}|${quantity ?? ''}|${rate ?? ''}`;

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
            invoiceNumber,
            invoiceDate,
            partyName,
            itemName,
            quantity,
            rate,
            taxableAmount,
            taxAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            netAmount,
            issues
        };
    });

    const summary = rows.reduce<ValidationSummary>(
        (acc, row) => {
            acc.totalRows += 1;
            if (row.status === 'valid') {
                acc.validRows += 1;
                acc.validNetAmount += row.netAmount ?? 0;
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
            validNetAmount: 0
        }
    );

    return {
        mappingErrors: [],
        rows,
        summary
    };
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
};

const buildTemplateCsv = () => {
    const headers = [
        'Invoice No',
        'Invoice Date',
        'Party',
        'Item',
        'Quantity',
        'Rate',
        'Taxable Amount',
        'CGST Amount',
        'SGST Amount',
        'Tax Amount',
        'Net Amount'
    ];
    const sample = [
        'BIZ-1001',
        '2026-03-01',
        'ABC Retail',
        'Sample Product',
        '10',
        '120.00',
        '1200.00',
        '108.00',
        '108.00',
        '216.00',
        '1416.00'
    ];
    return `${headers.join(',')}\n${sample.join(',')}`;
};

export default function InventoryImportBizomInvoicesPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const toastRef = useRef<Toast>(null);

    const [sourceType, setSourceType] = useState<BizomSourceOption['value']>('bizom-standard');
    const [sheetName, setSheetName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
    const [mapping, setMapping] = useState<MappingState>({ ...initialMapping });
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);
    const [importIssues, setImportIssues] = useState<string[]>([]);
    const [mismatchRows, setMismatchRows] = useState<MismatchRow[]>([]);
    const [selectedMismatchRows, setSelectedMismatchRows] = useState<MismatchRow[]>([]);
    const [allowRerunBatch, setAllowRerunBatch] = useState(false);
    const [taxMode, setTaxMode] = useState<TaxMode>('auto');
    const [auditHistory, setAuditHistory] = useState<ImportAuditRecord[]>([]);

    useEffect(() => {
        setPageTitle('Import Bizom Invoices');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    useEffect(() => {
        setAuditHistory(loadImportAuditHistory());
    }, []);

    const { ledgers, loading: ledgersLoading, error: ledgersError } = useLedgerLookup();

    const {
        data: productData,
        loading: productsLoading,
        error: productsError
    } = useQuery<ProductsQueryData>(PRODUCTS, {
        client: inventoryApolloClient,
        variables: { limit: 4000 },
        fetchPolicy: 'cache-first'
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
                    row.invoiceNumber.trim().toLowerCase(),
                    row.invoiceDate.trim(),
                    row.partyName.trim().toLowerCase(),
                    row.itemName.trim().toLowerCase(),
                    row.quantity ?? '',
                    row.rate ?? '',
                    row.taxableAmount ?? '',
                    row.taxAmount ?? '',
                    row.cgstAmount ?? '',
                    row.sgstAmount ?? '',
                    row.igstAmount ?? '',
                    row.netAmount ?? ''
                ].join('|')
            );
        if (validRows.length === 0) return null;
        const payload = [
            sourceType,
            parsedData.fileName,
            parsedData.sheetName ?? '',
            parsedData.headers.join('|'),
            taxMode,
            ...validRows
        ].join('\n');
        return `biz-${hashText(payload)}`;
    }, [parsedData, sourceType, taxMode, validation]);

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
        !claimingBatch;

    const resetAll = () => {
        setSelectedFile(null);
        setParsedData(null);
        setMapping({ ...initialMapping });
        setValidation(null);
        setImportResult(null);
        setImportIssues([]);
        setMismatchRows([]);
        setSelectedMismatchRows([]);
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
            const combined = [next, ...prev].slice(0, BIZOM_IMPORT_HISTORY_LIMIT);
            persistImportAuditHistory(combined);
            return combined;
        });
    };

    const downloadMismatchCsv = () => {
        if (mismatchRows.length === 0) return;
        const headers = ['Row No', 'Invoice No', 'Invoice Date', 'Party', 'Item', 'Reason'];
        const lines = mismatchRows.map((row) =>
            [
                String(row.rowNo || ''),
                row.invoiceNumber,
                row.invoiceDate,
                row.partyName,
                row.itemName,
                row.reason
            ]
                .map((cell) => csvEscape(cell ?? ''))
                .join(',')
        );
        const csv = [headers.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'bizom_import_mismatch_rows.csv';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    const handleValidate = async () => {
        if (!selectedFile) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Choose a file',
                detail: 'Select a Bizom export file before validation.'
            });
            return;
        }

        setImportResult(null);
        setImportIssues([]);
        setMismatchRows([]);
        setSelectedMismatchRows([]);
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
                        : `${nextValidation.summary.validRows} valid invoice rows ready for import.`
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
        setMismatchRows([]);
        setSelectedMismatchRows([]);
        if (parsedData) {
            setValidation(validateSheetData(parsedData, nextMapping));
        }
    };

    const handleImport = async (rowsOverride?: PreviewRow[], fromRetry = false) => {
        if (!validation || validation.mappingErrors.length > 0) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validate file first',
                detail: 'Fix mapping issues and run validation before import.'
            });
            return;
        }
        const rowsToImport = (rowsOverride ?? validation.rows).filter((row) => row.status === 'valid');
        const skippedRows = rowsOverride ? 0 : validation.summary.duplicateRows;
        const baseErrorRows = rowsOverride ? 0 : validation.summary.errorRows;
        if (rowsToImport.length === 0) {
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
        if (previousSuccessfulRun && !allowRerunBatch && !fromRetry) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Batch already imported',
                detail: `This batch was already imported on ${new Date(
                    previousSuccessfulRun.importedAt
                ).toLocaleString('en-GB')}. Enable "Allow re-run same batch" to run again.`
            });
            return;
        }
        if (productsLoading || ledgersLoading || claimingBatch) {
            toastRef.current?.show({
                severity: 'info',
                summary: 'Please wait',
                detail: 'Master data is still loading. Try import again shortly.'
            });
            return;
        }
        if (productsError) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Product load failed',
                detail: productsError.message
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

        const ledgerIdByName = new Map<string, number>();
        const ledgerCandidates: Array<{
            ledgerId: number;
            name: string;
            normalizedName: string;
            taxRate: number | null;
        }> = [];
        ledgers.forEach((ledger) => {
            const ledgerId = Number(ledger.ledgerId ?? 0);
            const ledgerName = ledger.name?.trim();
            if (!ledgerId || !ledgerName) return;
            const normalizedName = normalizeLookupKey(ledgerName);
            const key = normalizedName;
            if (key && !ledgerIdByName.has(key)) {
                ledgerIdByName.set(key, ledgerId);
            }
            ledgerCandidates.push({
                ledgerId,
                name: ledgerName,
                normalizedName,
                taxRate:
                    ledger.taxRate != null && Number.isFinite(Number(ledger.taxRate))
                        ? Number(ledger.taxRate)
                        : null
            });
        });

        const productIdByName = new Map<string, number>();
        const productCandidates: Array<{ productId: number; normalizedName: string }> = [];
        products.forEach((product) => {
            const productId = Number(product.productId ?? 0);
            const productName = product.name?.trim();
            if (!productId || !productName) return;
            const key = normalizeLookupKey(productName);
            if (key && !productIdByName.has(key)) {
                productIdByName.set(key, productId);
            }
            productCandidates.push({ productId, normalizedName: key });
        });

        type GroupedInvoice = {
            invoiceNumber: string;
            invoiceDateText: string;
            partyName: string;
            ledgerId: number | null;
            rowCount: number;
            totalQuantity: number;
            totalTaxableAmount: number;
            totalTaxAmount: number;
            totalNetAmount: number;
            lines: invoicingApi.SaleInvoiceLineInput[];
            rowRefs: Array<{
                rowNo: number;
                invoiceNumber: string;
                invoiceDate: string;
                partyName: string;
                itemName: string;
                quantity: number | null;
                rate: number | null;
                taxableAmount: number | null;
                taxAmount: number | null;
                cgstAmount: number | null;
                sgstAmount: number | null;
                igstAmount: number | null;
                netAmount: number | null;
            }>;
        };

        const groupedInvoices = new Map<string, GroupedInvoice>();
        const issues: string[] = [];
        const mismatch: MismatchRow[] = [];
        let unresolvedRows = 0;

        const resolveBestByName = (
            key: string,
            exactLookup: Map<string, number>,
            candidates: Array<{ normalizedName: string; id: number }>
        ): number | null => {
            const exact = exactLookup.get(key) ?? null;
            if (exact != null) return exact;
            const tokens = key.split(' ').filter((token) => token.length >= 3);
            if (tokens.length === 0) return null;
            let bestId: number | null = null;
            let bestScore = 0;
            candidates.forEach((candidate) => {
                let score = 0;
                tokens.forEach((token) => {
                    if (candidate.normalizedName.includes(token)) score += 1;
                });
                if (candidate.normalizedName.includes(key) || key.includes(candidate.normalizedName)) {
                    score += 2;
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestId = candidate.id;
                }
            });
            return bestScore > 0 ? bestId : null;
        };

        const ledgerResolveCandidates = ledgerCandidates.map((row) => ({
            id: row.ledgerId,
            normalizedName: row.normalizedName
        }));
        const productResolveCandidates = productCandidates.map((row) => ({
            id: row.productId,
            normalizedName: row.normalizedName
        }));

        const selectTaxLedgerId = (kind: 'cgst' | 'sgst' | 'igst', expectedRate: number): number | null => {
            const kindName = kind.toUpperCase();
            const filtered = ledgerCandidates.filter((candidate) =>
                candidate.normalizedName.includes(kind.toLowerCase())
            );
            const candidates = filtered.length > 0 ? filtered : ledgerCandidates.filter((candidate) => {
                const name = candidate.name.toUpperCase();
                return name.includes('GST');
            });
            if (candidates.length === 0) return null;
            const sorted = [...candidates].sort((a, b) => {
                const rateA = a.taxRate != null ? Math.abs(a.taxRate - expectedRate) : 9999;
                const rateB = b.taxRate != null ? Math.abs(b.taxRate - expectedRate) : 9999;
                if (rateA !== rateB) return rateA - rateB;
                const aHasKind = a.name.toUpperCase().includes(kindName) ? 0 : 1;
                const bHasKind = b.name.toUpperCase().includes(kindName) ? 0 : 1;
                return aHasKind - bHasKind;
            });
            return sorted[0]?.ledgerId ?? null;
        };

        rowsToImport.forEach((row) => {
                const parsedInvoiceDate = parseDateValue(row.invoiceDate);
                if (!parsedInvoiceDate) {
                    unresolvedRows += 1;
                    issues.push(`Row ${row.rowNo}: invalid invoice date.`);
                    mismatch.push({
                        rowNo: row.rowNo,
                        invoiceNumber: row.invoiceNumber,
                        invoiceDate: row.invoiceDate,
                        partyName: row.partyName,
                        itemName: row.itemName,
                        quantity: row.quantity,
                        rate: row.rate,
                        taxableAmount: row.taxableAmount,
                        taxAmount: row.taxAmount,
                        cgstAmount: row.cgstAmount,
                        sgstAmount: row.sgstAmount,
                        igstAmount: row.igstAmount,
                        netAmount: row.netAmount,
                        reason: 'Invalid invoice date'
                    });
                    return;
                }

                const quantity = row.quantity ?? 0;
                const rate = row.rate ?? 0;
                if (quantity <= 0 || rate <= 0) {
                    unresolvedRows += 1;
                    issues.push(`Row ${row.rowNo}: quantity and rate must be greater than zero.`);
                    mismatch.push({
                        rowNo: row.rowNo,
                        invoiceNumber: row.invoiceNumber,
                        invoiceDate: row.invoiceDate,
                        partyName: row.partyName,
                        itemName: row.itemName,
                        quantity: row.quantity,
                        rate: row.rate,
                        taxableAmount: row.taxableAmount,
                        taxAmount: row.taxAmount,
                        cgstAmount: row.cgstAmount,
                        sgstAmount: row.sgstAmount,
                        igstAmount: row.igstAmount,
                        netAmount: row.netAmount,
                        reason: 'Quantity/Rate must be greater than zero'
                    });
                    return;
                }

                const itemKey = normalizeLookupKey(row.itemName);
                const itemId = itemKey
                    ? (resolveBestByName(itemKey, productIdByName, productResolveCandidates) ?? null)
                    : null;
                if (!itemId) {
                    unresolvedRows += 1;
                    issues.push(`Row ${row.rowNo}: item "${row.itemName}" not found in product master.`);
                    mismatch.push({
                        rowNo: row.rowNo,
                        invoiceNumber: row.invoiceNumber,
                        invoiceDate: row.invoiceDate,
                        partyName: row.partyName,
                        itemName: row.itemName,
                        quantity: row.quantity,
                        rate: row.rate,
                        taxableAmount: row.taxableAmount,
                        taxAmount: row.taxAmount,
                        cgstAmount: row.cgstAmount,
                        sgstAmount: row.sgstAmount,
                        igstAmount: row.igstAmount,
                        netAmount: row.netAmount,
                        reason: 'Item not found in product master'
                    });
                    return;
                }

                const invoiceNumber = row.invoiceNumber.trim();
                const partyName = row.partyName.trim();
                if (!invoiceNumber || !partyName) {
                    unresolvedRows += 1;
                    issues.push(`Row ${row.rowNo}: invoice number and party are required.`);
                    mismatch.push({
                        rowNo: row.rowNo,
                        invoiceNumber: row.invoiceNumber,
                        invoiceDate: row.invoiceDate,
                        partyName: row.partyName,
                        itemName: row.itemName,
                        quantity: row.quantity,
                        rate: row.rate,
                        taxableAmount: row.taxableAmount,
                        taxAmount: row.taxAmount,
                        cgstAmount: row.cgstAmount,
                        sgstAmount: row.sgstAmount,
                        igstAmount: row.igstAmount,
                        netAmount: row.netAmount,
                        reason: 'Invoice number and party are required'
                    });
                    return;
                }

                const invoiceDateText = toDateText(parsedInvoiceDate);
                const taxableAmount = row.taxableAmount ?? round2(quantity * rate);
                const explicitSplitTax = (row.cgstAmount ?? 0) + (row.sgstAmount ?? 0) + (row.igstAmount ?? 0);
                const taxAmount =
                    row.taxAmount ??
                    (explicitSplitTax > 0
                        ? explicitSplitTax
                        : Math.max(0, (row.netAmount ?? taxableAmount) - taxableAmount));
                const netAmount = row.netAmount ?? round2(taxableAmount + taxAmount);

                const autoMode: Exclude<TaxMode, 'auto'> =
                    (row.igstAmount ?? 0) > 0 ? 'inter' : 'intra';
                const resolvedTaxMode = taxMode === 'auto' ? autoMode : taxMode;
                const totalTaxAmount = Math.max(0, taxAmount);
                const cgstAmount =
                    resolvedTaxMode === 'intra'
                        ? row.cgstAmount ??
                          (row.sgstAmount != null
                              ? row.sgstAmount
                              : row.taxAmount != null
                                ? round2(row.taxAmount / 2)
                                : round2(totalTaxAmount / 2))
                        : 0;
                const sgstAmount =
                    resolvedTaxMode === 'intra'
                        ? row.sgstAmount ??
                          (row.cgstAmount != null
                              ? row.cgstAmount
                              : row.taxAmount != null
                                ? round2(row.taxAmount / 2)
                                : round2(totalTaxAmount / 2))
                        : 0;
                const igstAmount =
                    resolvedTaxMode === 'inter'
                        ? row.igstAmount ?? (row.taxAmount != null ? row.taxAmount : totalTaxAmount)
                        : 0;

                if (
                    resolvedTaxMode === 'intra' &&
                    row.igstAmount != null &&
                    row.igstAmount > 0 &&
                    (cgstAmount > 0 || sgstAmount > 0)
                ) {
                    issues.push(`Row ${row.rowNo}: IGST and CGST/SGST both supplied; treated as intra-state.`);
                }

                const cgstRate = taxableAmount > 0 ? Number(((cgstAmount * 100) / taxableAmount).toFixed(4)) : 0;
                const sgstRate = taxableAmount > 0 ? Number(((sgstAmount * 100) / taxableAmount).toFixed(4)) : 0;
                const igstRate = taxableAmount > 0 ? Number(((igstAmount * 100) / taxableAmount).toFixed(4)) : 0;

                const cgstLedgerId = cgstAmount > 0 ? selectTaxLedgerId('cgst', cgstRate) : null;
                const sgstLedgerId = sgstAmount > 0 ? selectTaxLedgerId('sgst', sgstRate) : null;
                const igstLedgerId = igstAmount > 0 ? selectTaxLedgerId('igst', igstRate) : null;

                const key = `${invoiceNumber.toLowerCase()}|${invoiceDateText}|${partyName.toLowerCase()}`;
                const group =
                    groupedInvoices.get(key) ??
                    ({
                        invoiceNumber,
                        invoiceDateText,
                        partyName,
                        ledgerId:
                            resolveBestByName(
                                normalizeLookupKey(partyName),
                                ledgerIdByName,
                                ledgerResolveCandidates
                            ) ?? null,
                        rowCount: 0,
                        totalQuantity: 0,
                        totalTaxableAmount: 0,
                        totalTaxAmount: 0,
                        totalNetAmount: 0,
                        lines: [],
                        rowRefs: []
                    } satisfies GroupedInvoice);

                group.lines.push({
                    lineNumber: group.lines.length + 1,
                    itemId,
                    quantity,
                    mrp: rate,
                    unitPrice: rate,
                    sellingRate: rate,
                    quantityRateAmount: round2(quantity * rate),
                    lineAmount: taxableAmount,
                    finalAmount: taxableAmount,
                    taxRate: resolvedTaxMode === 'intra' ? cgstRate : 0,
                    taxAmount: resolvedTaxMode === 'intra' ? cgstAmount : 0,
                    taxableAmount: resolvedTaxMode === 'intra' ? taxableAmount : 0,
                    taxLedgerId: resolvedTaxMode === 'intra' ? cgstLedgerId : null,
                    taxRate2: resolvedTaxMode === 'intra' ? sgstRate : 0,
                    taxAmount2: resolvedTaxMode === 'intra' ? sgstAmount : 0,
                    taxableAmount2: resolvedTaxMode === 'intra' ? taxableAmount : 0,
                    taxLedger2Id: resolvedTaxMode === 'intra' ? sgstLedgerId : null,
                    taxRate3: resolvedTaxMode === 'inter' ? igstRate : 0,
                    taxAmount3: resolvedTaxMode === 'inter' ? igstAmount : 0,
                    taxableAmount3: resolvedTaxMode === 'inter' ? taxableAmount : 0,
                    taxLedger3Id: resolvedTaxMode === 'inter' ? igstLedgerId : null
                });

                group.rowCount += 1;
                group.totalQuantity += quantity;
                group.totalTaxableAmount += taxableAmount;
                group.totalTaxAmount += resolvedTaxMode === 'inter' ? igstAmount : cgstAmount + sgstAmount;
                group.totalNetAmount += netAmount;
                group.rowRefs.push({
                    rowNo: row.rowNo,
                    invoiceNumber: row.invoiceNumber,
                    invoiceDate: row.invoiceDate,
                    partyName: row.partyName,
                    itemName: row.itemName,
                    quantity: row.quantity,
                    rate: row.rate,
                    taxableAmount: row.taxableAmount,
                    taxAmount: row.taxAmount,
                    cgstAmount: row.cgstAmount,
                    sgstAmount: row.sgstAmount,
                    igstAmount: row.igstAmount,
                    netAmount: row.netAmount
                });
                groupedInvoices.set(key, group);
            });

        if (groupedInvoices.size === 0) {
            const failed = baseErrorRows + unresolvedRows + skippedRows;
            const result: ImportResultSummary = {
                created: 0,
                skipped: skippedRows,
                failed,
                importedAt: new Date()
            };
            setImportResult(result);
            setImportIssues(issues.slice(0, 50));
            setMismatchRows(mismatch.slice(0, 500));
            setSelectedMismatchRows([]);
            appendAuditRecord(result, currentBatchKey, 'No rows converted to invoice payload');
            toastRef.current?.show({
                severity: 'warn',
                summary: 'No rows imported',
                detail: 'No valid rows could be converted to invoice payload.'
            });
            return;
        }

        const rowsHash = hashText(
            rowsToImport
                .map((row) =>
                    [
                        row.rowNo,
                        row.invoiceNumber,
                        row.invoiceDate,
                        row.partyName,
                        row.itemName,
                        row.quantity ?? '',
                        row.rate ?? '',
                        row.taxableAmount ?? '',
                        row.taxAmount ?? '',
                        row.cgstAmount ?? '',
                        row.sgstAmount ?? '',
                        row.igstAmount ?? '',
                        row.netAmount ?? ''
                    ].join('|')
                )
                .join('\n')
        );
        const batchKey =
            currentBatchKey ??
            `biz-${hashText(
                `${sourceType}|${selectedFile?.name ?? parsedData.fileName}|${taxMode}|${fromRetry ? 'retry' : 'full'}|${rowsHash}`
            )}`;
        try {
            const claimResponse = await claimImportBatch({
                variables: {
                    sourceKey: 'bizom-invoice-import',
                    batchKey,
                    allowRerun: fromRetry ? true : allowRerunBatch
                }
            });
            const claimResult = claimResponse.data?.claimImportBatch;
            if (claimResult?.isDuplicate && !(allowRerunBatch || fromRetry)) {
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
        setMismatchRows([]);
        setSelectedMismatchRows([]);

        let createdRows = 0;
        let mutationFailedRows = 0;
        try {
            for (const group of groupedInvoices.values()) {
                const payload: invoicingApi.CreateSaleInvoiceInput = {
                    voucherDateText: group.invoiceDateText,
                    voucherNumber: group.invoiceNumber,
                    billNumber: group.invoiceNumber,
                    bizomInvoiceNumber: group.invoiceNumber,
                    ledgerId: group.ledgerId,
                    ledgerName: group.partyName,
                    isVatIncluded: false,
                    isOtherState: false,
                    lines: group.lines,
                    totalQuantity: round2(group.totalQuantity),
                    totalQuantityRateAmount: round2(group.totalTaxableAmount),
                    totalAmount: round2(group.totalTaxableAmount),
                    totalFinalAmount: round2(group.totalTaxableAmount),
                    totalGrossAmount: round2(group.totalTaxableAmount),
                    totalTaxAmount: round2(group.totalTaxAmount),
                    totalNetAmount: round2(group.totalNetAmount)
                };
                try {
                    await invoicingApi.createSaleInvoice(payload);
                    createdRows += group.rowCount;
                } catch (error: unknown) {
                    mutationFailedRows += group.rowCount;
                    const reason = `Invoice ${group.invoiceNumber}: ${getErrorMessage(
                        error,
                        'failed to create invoice'
                    )}`;
                    issues.push(reason);
                    group.rowRefs.forEach((rowRef) => {
                        mismatch.push({ ...rowRef, reason });
                    });
                }
            }
        } finally {
            setImporting(false);
        }

        const result: ImportResultSummary = {
            created: createdRows,
            skipped: skippedRows,
            failed: baseErrorRows + unresolvedRows + mutationFailedRows,
            importedAt: new Date()
        };
        setImportResult(result);
        setImportIssues(issues.slice(0, 50));
        setMismatchRows(mismatch.slice(0, 500));
        setSelectedMismatchRows([]);
        appendAuditRecord(result, currentBatchKey, issues.length > 0 ? issues[0] : null);
        toastRef.current?.show({
            severity: result.failed > 0 ? 'warn' : 'success',
            summary: result.failed > 0 ? 'Import completed with issues' : 'Import completed',
            detail: `Created ${result.created}, Skipped ${result.skipped}, Failed ${result.failed}.`
        });
    };

    const retryMismatchRows = async (rows: MismatchRow[]) => {
        if (rows.length === 0) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'No mismatch rows selected'
            });
            return;
        }

        const previewRows: PreviewRow[] = rows.map((row) => ({
            rowNo: row.rowNo,
            status: 'valid',
            invoiceNumber: row.invoiceNumber,
            invoiceDate: row.invoiceDate,
            partyName: row.partyName,
            itemName: row.itemName,
            quantity: row.quantity,
            rate: row.rate,
            taxableAmount: row.taxableAmount,
            taxAmount: row.taxAmount,
            cgstAmount: row.cgstAmount,
            sgstAmount: row.sgstAmount,
            igstAmount: row.igstAmount,
            netAmount: row.netAmount,
            issues: []
        }));

        await handleImport(previewRows, true);
    };

    const downloadTemplate = () => {
        const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'bizom_invoice_import_template.csv';
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
                    <h2 className="m-0">Import Bizom Invoices</h2>
                    <p className="mt-2 mb-0 text-600">
                        Import Bizom invoice files with column mapping, duplicate checks, and validation preview before import.
                    </p>
                </div>
                <Tag severity="success" value="Backend Import Enabled" />
            </div>

            {productsError && (
                <p className="text-red-500 m-0 mb-2">Error loading products: {productsError.message}</p>
            )}
            {ledgersError && (
                <p className="text-orange-500 m-0 mb-2">
                    Ledger lookup warning: {ledgersError.message}. Import will continue with party names only.
                </p>
            )}

            <div className="grid">
                <div className="col-12 md:col-3">
                    <label htmlFor="bizom-source-type" className="block text-600 mb-1">
                        Source Type
                    </label>
                    <AppDropdown
                        inputId="bizom-source-type"
                        value={sourceType}
                        options={sourceOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(event) => setSourceType(event.value as BizomSourceOption['value'])}
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label htmlFor="bizom-sheet-name" className="block text-600 mb-1">
                        Sheet Tab Name (Optional)
                    </label>
                    <AppInput
                        id="bizom-sheet-name"
                        value={sheetName}
                        onChange={(event) => setSheetName(event.target.value)}
                        placeholder="Sheet1"
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label htmlFor="bizom-tax-mode" className="block text-600 mb-1">
                        Tax Mode
                    </label>
                    <AppDropdown
                        inputId="bizom-tax-mode"
                        value={taxMode}
                        options={taxModeOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(event) => setTaxMode((event.value as TaxMode) ?? 'auto')}
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label htmlFor="bizom-file" className="block text-600 mb-1">
                        Bizom File
                    </label>
                    <input
                        id="bizom-file"
                        type="file"
                        className="w-full"
                        accept=".csv,.xls,.xlsx"
                        onChange={(event) => {
                            setSelectedFile(event.target.files?.[0] ?? null);
                            setParsedData(null);
                            setValidation(null);
                            setImportResult(null);
                            setImportIssues([]);
                            setMismatchRows([]);
                            setSelectedMismatchRows([]);
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
                    label={parsing ? 'Validating...' : 'Validate File'}
                    onClick={() => void handleValidate()}
                    disabled={!selectedFile || parsing || importing || claimingBatch}
                />
                <Button
                    type="button"
                    className="app-action-compact"
                    icon="pi pi-upload"
                    label={importing || claimingBatch ? 'Importing...' : 'Import Invoices'}
                    onClick={() => void handleImport()}
                    disabled={!canImport}
                />
                <Button
                    type="button"
                    className="p-button-text"
                    icon="pi pi-download"
                    label="Download Sample Mapping"
                    onClick={downloadTemplate}
                    disabled={parsing || importing || claimingBatch}
                />
                <Button
                    type="button"
                    className="p-button-text"
                    icon="pi pi-refresh"
                    label="Reset"
                    onClick={resetAll}
                    disabled={parsing || importing || claimingBatch}
                />
                <Button
                    type="button"
                    className="p-button-text"
                    icon="pi pi-file-export"
                    label="Download Mismatch CSV"
                    onClick={downloadMismatchCsv}
                    disabled={mismatchRows.length === 0 || parsing || importing || claimingBatch}
                />
                <Button
                    type="button"
                    className="p-button-text"
                    icon="pi pi-replay"
                    label={`Retry Selected (${selectedMismatchRows.length})`}
                    onClick={() => void retryMismatchRows(selectedMismatchRows)}
                    disabled={
                        selectedMismatchRows.length === 0 || parsing || importing || claimingBatch
                    }
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
                            inputId="bizom-allow-rerun-batch"
                            checked={allowRerunBatch}
                            onChange={(event) => setAllowRerunBatch(Boolean(event.checked))}
                        />
                        <label htmlFor="bizom-allow-rerun-batch" className="text-700 text-sm">
                            Allow re-run same batch
                        </label>
                    </div>
                </div>
            ) : null}

            {(productsLoading || ledgersLoading || claimingBatch) && (
                <p className="text-600 m-0 mb-2">Loading product and ledger masters...</p>
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
                                <label htmlFor={`bizom-map-${field.key}`} className="block text-600 mb-1">
                                    {field.label}
                                    {field.required ? <span className="text-red-500 ml-1">*</span> : null}
                                </label>
                                <AppDropdown
                                    inputId={`bizom-map-${field.key}`}
                                    value={mapping[field.key]}
                                    options={headerOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    filter
                                    onChange={(event) =>
                                        handleMappingChange(field.key, (event.value as string | null) ?? null)
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
                        <Tag severity="info" value={`Valid Net Amount: ${formatAmount(validation.summary.validNetAmount)}`} />
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
                    <Column field="invoiceNumber" header="Invoice No" style={{ minWidth: '10rem' }} />
                    <Column field="invoiceDate" header="Invoice Date" style={{ minWidth: '9rem' }} />
                    <Column field="partyName" header="Party" style={{ minWidth: '12rem' }} />
                    <Column field="itemName" header="Item" style={{ minWidth: '14rem' }} />
                    <Column
                        field="quantity"
                        header="Qty"
                        body={(row: PreviewRow) => (row.quantity == null ? '-' : formatAmount(row.quantity))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="rate"
                        header="Rate"
                        body={(row: PreviewRow) => (row.rate == null ? '-' : formatAmount(row.rate))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="taxableAmount"
                        header="Taxable"
                        body={(row: PreviewRow) => (row.taxableAmount == null ? '-' : formatAmount(row.taxableAmount))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '8rem' }}
                    />
                    <Column
                        field="taxAmount"
                        header="Tax"
                        body={(row: PreviewRow) => (row.taxAmount == null ? '-' : formatAmount(row.taxAmount))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="cgstAmount"
                        header="CGST"
                        body={(row: PreviewRow) => (row.cgstAmount == null ? '-' : formatAmount(row.cgstAmount))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="sgstAmount"
                        header="SGST"
                        body={(row: PreviewRow) => (row.sgstAmount == null ? '-' : formatAmount(row.sgstAmount))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="igstAmount"
                        header="IGST"
                        body={(row: PreviewRow) => (row.igstAmount == null ? '-' : formatAmount(row.igstAmount))}
                        headerClassName="summary-number"
                        bodyClassName="summary-number"
                        style={{ width: '7rem' }}
                    />
                    <Column
                        field="netAmount"
                        header="Net"
                        body={(row: PreviewRow) => (row.netAmount == null ? '-' : formatAmount(row.netAmount))}
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
                    {mismatchRows.length > 0 ? (
                        <div className="mt-2 text-sm text-700">
                            Mismatch rows available: <strong>{mismatchRows.length}</strong>. Use
                            {' '}<span className="font-semibold">Download Mismatch CSV</span> or retry
                            {' '}from mismatch preview.
                        </div>
                    ) : null}
                </div>
            )}

            {mismatchRows.length > 0 && (
                <div className="surface-50 border-1 surface-border border-round p-3 mt-3">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-2">
                        <h3 className="m-0 text-900">Mismatch Preview</h3>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                className="app-action-compact"
                                icon="pi pi-replay"
                                label={`Retry Selected (${selectedMismatchRows.length})`}
                                onClick={() => void retryMismatchRows(selectedMismatchRows)}
                                disabled={
                                    selectedMismatchRows.length === 0 ||
                                    parsing ||
                                    importing ||
                                    claimingBatch
                                }
                            />
                            <Button
                                type="button"
                                className="p-button-text"
                                icon="pi pi-refresh"
                                label="Retry All Mismatch"
                                onClick={() => void retryMismatchRows(mismatchRows)}
                                disabled={mismatchRows.length === 0 || parsing || importing || claimingBatch}
                            />
                        </div>
                    </div>
                    <AppDataTable
                        value={mismatchRows}
                        dataKey="rowNo"
                        selection={selectedMismatchRows}
                        onSelectionChange={(event) =>
                            setSelectedMismatchRows((event.value as MismatchRow[]) ?? [])
                        }
                        size="small"
                        stripedRows
                        paginator
                        rows={8}
                        rowsPerPageOptions={[8, 16, 24]}
                        emptyMessage="No mismatch rows"
                    >
                        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                        <Column field="rowNo" header="Row" style={{ width: '5rem' }} />
                        <Column field="invoiceNumber" header="Invoice No" style={{ minWidth: '9rem' }} />
                        <Column field="invoiceDate" header="Invoice Date" style={{ minWidth: '8rem' }} />
                        <Column field="partyName" header="Party" style={{ minWidth: '12rem' }} />
                        <Column field="itemName" header="Item" style={{ minWidth: '12rem' }} />
                        <Column
                            field="quantity"
                            header="Qty"
                            body={(row: MismatchRow) =>
                                row.quantity == null ? '-' : formatAmount(row.quantity)
                            }
                            headerClassName="summary-number"
                            bodyClassName="summary-number"
                            style={{ width: '6rem' }}
                        />
                        <Column
                            field="rate"
                            header="Rate"
                            body={(row: MismatchRow) => (row.rate == null ? '-' : formatAmount(row.rate))}
                            headerClassName="summary-number"
                            bodyClassName="summary-number"
                            style={{ width: '6rem' }}
                        />
                        <Column field="reason" header="Reason" style={{ minWidth: '16rem' }} />
                        <Column
                            header="Actions"
                            body={(row: MismatchRow) => (
                                <Button
                                    type="button"
                                    className="p-button-text p-button-sm"
                                    icon="pi pi-replay"
                                    label="Retry"
                                    onClick={() => void retryMismatchRows([row])}
                                    disabled={parsing || importing || claimingBatch}
                                />
                            )}
                            style={{ minWidth: '8rem' }}
                        />
                    </AppDataTable>
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
