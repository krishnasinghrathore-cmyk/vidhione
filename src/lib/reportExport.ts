export type ReportExportValue = string | number | boolean | null | undefined;

export type ReportExportColumn<T> = {
    header: string;
    value: (row: T) => ReportExportValue;
};

export type ReportExportOptions<T> = {
    fileName: string;
    columns: ReportExportColumn<T>[];
    rows: T[];
    title?: string;
    subtitle?: string;
    companyName?: string | null;
    companyAddress?: string | null;
    sheetName?: string;
    footerLeft?: string;
    footerRight?: string;
};

const normalizeValue = (value: ReportExportValue) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
};

const escapeCsv = (value: string) => {
    if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
};

const withExtension = (fileName: string, extension: string) => {
    const normalized = fileName.trim();
    const lower = normalized.toLowerCase();
    const ext = `.${extension}`;
    return lower.endsWith(ext) ? normalized : `${normalized}${ext}`;
};

const buildMetaLines = <T>(options: ReportExportOptions<T>) => {
    const lines: string[] = [];
    const pushLine = (value?: string | null) => {
        const trimmed = value?.trim();
        if (!trimmed) return;
        lines.push(trimmed);
    };

    pushLine(options.companyName ?? null);
    pushLine(options.companyAddress ?? null);
    pushLine(options.title ?? null);
    if (options.subtitle) {
        options.subtitle.split('\n').forEach((line) => {
            pushLine(line);
        });
    }
    return lines;
};

const buildMetaRows = <T>(options: ReportExportOptions<T>) => {
    const lines = buildMetaLines(options);
    if (!lines.length) return [];
    return [...lines.map((line) => [line]), []];
};

type ExcelMetaLine = {
    text: string;
    font?: {
        bold?: boolean;
        size?: number;
    };
};

const buildExcelMetaLines = <T>(options: ReportExportOptions<T>) => {
    const lines: ExcelMetaLine[] = [];
    const pushLine = (value?: string | null, font?: ExcelMetaLine['font']) => {
        const trimmed = value?.trim();
        if (!trimmed) return;
        lines.push({ text: trimmed, font });
    };

    pushLine(options.companyName ?? null, { bold: true, size: 14 });
    pushLine(options.companyAddress ?? null, { size: 11 });
    pushLine(options.title ?? null, { bold: true, size: 12 });
    if (options.subtitle) {
        options.subtitle.split('\n').forEach((line) => {
            pushLine(line, { size: 10 });
        });
    }
    return lines;
};

const buildExportMatrix = <T>(options: ReportExportOptions<T>) => {
    const header = options.columns.map((column) => column.header);
    const rows = options.rows.map((row) =>
        options.columns.map((column) => normalizeValue(column.value(row)))
    );
    const metaRows = buildMetaRows(options);
    return { header, rows, metaRows };
};

export const exportReportCsv = <T>(options: ReportExportOptions<T>) => {
    if (!options.rows.length) return;
    const { header, rows, metaRows } = buildExportMatrix(options);
    const csvLines = [
        ...metaRows.map((row) => row.map((value) => escapeCsv(value)).join(',')),
        header.map((value) => escapeCsv(value)).join(','),
        ...rows.map((row) => row.map((value) => escapeCsv(value)).join(','))
    ];
    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = withExtension(options.fileName, 'csv');
    anchor.click();
    URL.revokeObjectURL(url);
};

export const exportReportExcel = async <T>(options: ReportExportOptions<T>) => {
    if (!options.rows.length) return;
    const { header, rows } = buildExportMatrix(options);
    const ExcelJSImport = (await import('exceljs')) as typeof import('exceljs');
    const ExcelJS = (ExcelJSImport as typeof ExcelJSImport & { default?: typeof ExcelJSImport }).default ?? ExcelJSImport;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(options.sheetName ?? 'Report');
    const metaLines = buildExcelMetaLines(options);
    const columnCount = Math.max(1, header.length);

    if (metaLines.length) {
        metaLines.forEach((meta) => {
            const row = sheet.addRow([meta.text]);
            if (columnCount > 1) {
                sheet.mergeCells(row.number, 1, row.number, columnCount);
            }
            const cell = row.getCell(1);
            cell.alignment = { horizontal: 'center' };
            if (meta.font) {
                row.font = meta.font;
            }
        });
        sheet.addRow([]);
    }

    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' }
        };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
    });
    sheet.addRows(rows);

    const headerRowIndex = headerRow.number;
    sheet.pageSetup = {
        ...sheet.pageSetup,
        margins: {
            left: 0.7,
            right: 0.7,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3
        }
    };
    sheet.pageSetup.printTitlesRow = `1:${headerRowIndex}`;
    if (options.footerLeft || options.footerRight) {
        const left = (options.footerLeft ?? '').replace(/\s+/g, ' ').trim();
        const rightLabel = (options.footerRight ?? 'Page').replace(/\s+/g, ' ').trim();
        sheet.headerFooter = {
            oddFooter: `${left ? `&L${left}` : ''}&R${rightLabel} &P`,
            evenFooter: `${left ? `&L${left}` : ''}&R${rightLabel} &P`
        };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = withExtension(options.fileName, 'xlsx');
    anchor.click();
    URL.revokeObjectURL(url);
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

export const exportReportPdf = <T>(options: ReportExportOptions<T>) => {
    if (!options.rows.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const { header, rows } = buildExportMatrix(options);
    const toHtmlValue = (value: string) => escapeHtml(value).replace(/\n/g, '<br />');
    const headerHtml = header.map((value) => `<th>${toHtmlValue(value)}</th>`).join('');
    const bodyHtml = rows
        .map(
            (row) =>
                `<tr>${row.map((value) => `<td>${toHtmlValue(value)}</td>`).join('')}</tr>`
        )
        .join('');
    const titleHtml = options.title
        ? `<div class="report-title">${toHtmlValue(options.title)}</div>`
        : '';
    const subtitleHtml = options.subtitle
        ? `<div class="report-subtitle">${toHtmlValue(options.subtitle)}</div>`
        : '';
    const companyNameHtml = options.companyName
        ? `<div class="report-company">${toHtmlValue(options.companyName)}</div>`
        : '';
    const companyAddressHtml = options.companyAddress
        ? `<div class="report-address">${toHtmlValue(options.companyAddress)}</div>`
        : '';
    const footerLeftHtml = options.footerLeft
        ? `<div class="report-footer-left">${toHtmlValue(options.footerLeft)}</div>`
        : '<div class="report-footer-left"></div>';
    const footerRightLabel = options.footerRight?.trim() || 'Page';
    const footerRightHtml = `<div class="report-footer-right">${toHtmlValue(footerRightLabel)} <span class="report-footer-page-number"></span></div>`;
    const footerHtml = `<div class="report-footer">${footerLeftHtml}${footerRightHtml}</div>`;

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(withExtension(options.fileName, 'pdf'))}</title>
  <style>
    :root {
      color-scheme: light;
      --report-ink: #111827;
      --report-muted: #4b5563;
      --report-line: #e5e7eb;
      --report-header: #f1f5f9;
      --report-footer: #e8eef5;
      --report-zebra: #f8fafc;
    }
    * { box-sizing: border-box; }
    @page { margin: 12mm 12mm 18mm; }
    body {
      font-family: "Roboto", "Segoe UI", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: var(--report-ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      counter-reset: page;
    }
    .report-header {
      text-align: center;
      margin-bottom: 10px;
    }
    .report-company { font-size: 16px; font-weight: 700; }
    .report-address { font-size: 12px; color: var(--report-muted); margin-top: 4px; }
    .report-title { font-size: 13px; font-weight: 600; margin-top: 6px; }
    .report-subtitle { font-size: 11px; color: var(--report-muted); margin-top: 4px; white-space: pre-line; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
    th, td { border: 1px solid var(--report-line); padding: 6px 8px; text-align: left; vertical-align: top; }
    thead th {
      background: var(--report-header);
      font-weight: 600;
      font-size: 11px;
    }
    tbody tr:nth-child(even) td { background: var(--report-zebra); }
    tfoot td { background: var(--report-footer); font-weight: 600; }
    tr { page-break-inside: avoid; }
    .report-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 12mm 6mm;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--report-muted);
    }
    .report-footer-left,
    .report-footer-right {
      white-space: nowrap;
    }
    .report-footer-page-number::after { content: counter(page); }
  </style>
</head>
<body>
  <div class="report-header">
    ${companyNameHtml}
    ${companyAddressHtml}
    ${titleHtml}
    ${subtitleHtml}
  </div>
  ${footerHtml}
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    const triggerPrint = () => {
        printWindow.print();
    };
    if (printWindow.document.readyState === 'complete') {
        setTimeout(triggerPrint, 0);
    } else {
        printWindow.onload = triggerPrint;
    }
    printWindow.onafterprint = () => {
        printWindow.close();
    };
};
