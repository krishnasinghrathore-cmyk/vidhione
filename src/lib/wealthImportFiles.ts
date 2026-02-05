type FileImportResult = {
    csv: string;
    warnings: string[];
    meta?: { sheetName?: string; detectedHeaderRow?: number };
};

const HEADER_ALIASES: Record<string, string[]> = {
    Date: ['date', 'trade date', 'transaction date', 'bill date', 'voucher date'],
    Type: ['type', 'txn type', 'transaction type', 'buy/sell', 'buy sell', 'b/s', 'trans type'],
    Segment: ['segment', 'trade segment', 'txn segment'],
    InvoiceDate: ['invoice date', 'invoice dt', 'inv date', 'contract note date'],
    Qty: ['qty', 'quantity', 'shares', 'no of shares', 'net qty'],
    Price: ['price', 'rate', 'gross rate', 'trade price', 'unit price'],
    Fees: ['fees', 'fee', 'brokerage', 'charges', 'tds', 'gst', 'stt'],
    ISIN: ['isin', 'share code', 'security code'],
    Symbol: ['symbol', 'scrip', 'script', 'security symbol', 'trading symbol', 'trading code'],
    Name: ['name', 'security', 'security name', 'share name', 'company'],
    Notes: ['notes', 'remark', 'remarks', 'narration'],
    Account: ['account', 'account name', 'client name'],
    AccountCode: ['account code', 'account no', 'account number', 'trading code', 'trading id', 'client code'],
    SourceDoc: ['source doc', 'sourcedoc', 'contract note', 'cn', 'bill no', 'invoice no', 'reference'],
    AvgCost: ['avg cost', 'average cost', 'avg price', 'average price'],
    Cost: ['cost', 'amount', 'buy value', 'cost of purchase']
};

const normalizeHeader = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[_-]/g, ' ')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const aliasEntries = Object.entries(HEADER_ALIASES)
    .flatMap(([canonical, aliases]) =>
        aliases.map((alias) => ({
            canonical,
            alias: normalizeHeader(alias)
        }))
    )
    .sort((a, b) => b.alias.length - a.alias.length);

const matchHeaderAlias = (value: string) => {
    const normalized = normalizeHeader(value);
    if (!normalized) return null;
    for (const entry of aliasEntries) {
        if (normalized === entry.alias || normalized.includes(entry.alias)) return entry.canonical;
    }
    return null;
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

const isLikelyHeaderRow = (row: string[]) => {
    if (!row.length) return false;
    const alphaCells = row.filter((cell) => /[a-z]/i.test(cell)).length;
    const aliasMatches = row.filter((cell) => matchHeaderAlias(cell)).length;
    if (aliasMatches >= 2) return true;
    if (aliasMatches >= 1 && alphaCells >= 2) return true;
    return false;
};

const findHeaderRowIndex = (rows: string[][]) => {
    const maxScan = Math.min(rows.length, 12);
    for (let i = 0; i < maxScan; i += 1) {
        if (isLikelyHeaderRow(rows[i])) return i;
    }
    return null;
};

const normalizeHeaderRow = (row: string[]) => {
    const used = new Set<string>();
    return row.map((cell, idx) => {
        const trimmed = cell.trim();
        const fallback = trimmed || `Column${idx + 1}`;
        const canonical = matchHeaderAlias(trimmed);
        if (!canonical) return fallback;
        if (used.has(canonical)) return fallback;
        used.add(canonical);
        return canonical;
    });
};

const stripRepeatedHeaderRows = (rows: string[][], headerRow: string[]) => {
    if (rows.length <= 1) return rows;
    const normalizedHeader = headerRow.map(normalizeHeader).join('|');
    return rows.filter((row, idx) => {
        if (idx === 0) return true;
        const normalizedRow = row.map(normalizeHeader).join('|');
        return normalizedRow !== normalizedHeader;
    });
};

const normalizeTableRows = (rows: string[][]) => {
    const warnings: string[] = [];
    const cleaned = rows
        .map((row) => row.map(normalizeCell))
        .filter((row) => row.some((cell) => cell.trim() !== ''));

    if (!cleaned.length) {
        warnings.push('No rows detected in the file.');
        return { rows: [] as string[][], warnings, meta: { detectedHeaderRow: 0 } };
    }

    const headerIndex = findHeaderRowIndex(cleaned);
    if (headerIndex !== null && headerIndex > 0) {
        warnings.push(`Detected header row at line ${headerIndex + 1}.`);
    }

    if (headerIndex === null) {
        warnings.push('No header row detected; generated placeholder headers.');
        const maxCols = cleaned.reduce((max, row) => Math.max(max, row.length), 0);
        const headerRow = Array.from({ length: maxCols }, (_, idx) => `Column${idx + 1}`);
        return {
            rows: [headerRow, ...cleaned],
            warnings,
            meta: { detectedHeaderRow: 0 }
        };
    }

    const trimmed = cleaned.slice(headerIndex);
    if (!trimmed.length) {
        warnings.push('Header row was detected, but no data rows were found.');
        return { rows: [] as string[][], warnings, meta: { detectedHeaderRow: headerIndex } };
    }

    const headerRow = normalizeHeaderRow(trimmed[0]);
    const normalized = [headerRow, ...trimmed.slice(1)];
    const withoutRepeats = stripRepeatedHeaderRows(normalized, headerRow);

    return { rows: withoutRepeats, warnings, meta: { detectedHeaderRow: headerIndex } };
};

const csvEscape = (value: string) => {
    if (value.includes('"')) value = value.replace(/"/g, '""');
    if (/[",\n]/.test(value)) return `"${value}"`;
    return value;
};

const rowsToCsv = (rows: string[][]) =>
    rows.map((row) => row.map((cell) => csvEscape(cell ?? '')).join(',')).join('\n');

const parseExcelFile = async (file: File): Promise<FileImportResult> => {
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return { csv: '', warnings: ['No sheets detected in workbook.'] };
    }
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    const rows = rawRows.map((row) => row.map(normalizeCell));
    const normalized = normalizeTableRows(rows);
    const csv = rowsToCsv(normalized.rows);
    const warnings = [...normalized.warnings];
    if (!csv.trim()) warnings.push('Excel parse resulted in empty CSV.');
    return { csv, warnings, meta: { sheetName, detectedHeaderRow: normalized.meta?.detectedHeaderRow } };
};

type PdfTextItem = {
    str: string;
    transform: number[];
    width?: number;
    height?: number;
};

const parsePdfFile = async (file: File): Promise<FileImportResult> => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
    const workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.js', import.meta.url).toString();
    if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }

    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const rows: string[][] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const items = textContent.items as PdfTextItem[];
        const lineBuckets: { y: number; items: { x: number; text: string; width: number; height: number }[] }[] = [];

        for (const item of items) {
            const text = (item.str ?? '').trim();
            if (!text || !item.transform) continue;
            const [, , , , x, y] = item.transform;
            const width = typeof item.width === 'number' ? item.width : text.length * 5;
            const height = typeof item.height === 'number' ? item.height : 8;
            const existing = lineBuckets.find((line) => Math.abs(line.y - y) <= 2);
            if (existing) {
                existing.items.push({ x, text, width, height });
            } else {
                lineBuckets.push({ y, items: [{ x, text, width, height }] });
            }
        }

        const lines = lineBuckets
            .sort((a, b) => b.y - a.y)
            .map((line) => {
                const sorted = [...line.items].sort((a, b) => a.x - b.x);
                const avgHeight =
                    sorted.reduce((sum, item) => sum + item.height, 0) / Math.max(sorted.length, 1);
                const gapThreshold = Math.max(8, avgHeight * 1.6);
                const columns: string[] = [];
                let current = '';
                let lastEnd: number | null = null;

                for (const item of sorted) {
                    const start = item.x;
                    const end = item.x + item.width;
                    if (lastEnd !== null && start - lastEnd > gapThreshold) {
                        columns.push(current);
                        current = item.text;
                    } else {
                        current = current ? `${current} ${item.text}` : item.text;
                    }
                    lastEnd = end;
                }
                if (current) columns.push(current);
                return columns;
            })
            .filter((row) => row.some((cell) => cell.trim() !== ''));

        rows.push(...lines);
    }

    const normalized = normalizeTableRows(rows);
    const csv = rowsToCsv(normalized.rows);
    const warnings = [
        'PDF parsing is best-effort. Verify headers and values before import.',
        ...normalized.warnings
    ];
    if (!csv.trim()) warnings.push('PDF parse resulted in empty CSV.');
    return { csv, warnings, meta: { detectedHeaderRow: normalized.meta?.detectedHeaderRow } };
};

export const importWealthFileToCsv = async (file: File): Promise<FileImportResult> => {
    const name = file.name.toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() ?? '' : '';
    const type = file.type.toLowerCase();
    if (ext === 'csv' || type.includes('csv') || type === 'text/plain') {
        return { csv: await file.text(), warnings: [] };
    }
    if (
        ['xlsx', 'xls', 'xlsm'].includes(ext) ||
        type.includes('spreadsheet') ||
        type.includes('excel')
    ) {
        return await parseExcelFile(file);
    }
    if (ext === 'pdf' || type === 'application/pdf') {
        return await parsePdfFile(file);
    }
    throw new Error('Unsupported file type. Please select CSV, Excel, or PDF.');
};

export type { FileImportResult };
