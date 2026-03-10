import {
    createEmptyReportDefinition,
    createReportFieldItem,
    createReportImageItem,
    createReportLineItem,
    createReportListItem,
    createReportRectangleItem,
    createReportTableItem,
    createReportTextItem,
    type ReportDefinition,
    type ReportListDetailItem
} from '@/lib/reportDefinition';

export type ReportDefinitionPreset = {
    key: string;
    label: string;
    description: string;
    moduleKey: 'invoice' | 'voucher';
    usageKey: string;
    dataSourceKey: string;
    templateName: string;
    templateKey: string;
    selectedFieldKeys: string[];
    pageSettings?: {
        pageSize: 'A4' | 'A5' | 'Letter' | 'Legal';
        orientation: 'portrait' | 'landscape';
        marginTopMm: number;
        marginRightMm: number;
        marginBottomMm: number;
        marginLeftMm: number;
    };
    definition: ReportDefinition;
};

const nextPresetId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const withListChild = <T extends ReportListDetailItem>(item: T, patch: Partial<T>): T =>
    ({
        ...item,
        id: nextPresetId('detail'),
        ...patch
    }) as T;

const withText = (patch: Partial<ReturnType<typeof createReportTextItem>>) => ({
    ...createReportTextItem(),
    id: nextPresetId('text'),
    ...patch
});

const withField = (fieldKey: string, patch: Partial<ReturnType<typeof createReportFieldItem>>) => ({
    ...createReportFieldItem(fieldKey),
    id: nextPresetId('field'),
    ...patch
});

const withLine = (patch: Partial<ReturnType<typeof createReportLineItem>>) => ({
    ...createReportLineItem(),
    id: nextPresetId('line'),
    ...patch
});

const withImage = (patch: Partial<ReturnType<typeof createReportImageItem>>) => ({
    ...createReportImageItem(),
    id: nextPresetId('image'),
    ...patch
});

const withRectangle = (patch: Partial<ReturnType<typeof createReportRectangleItem>>) => ({
    ...createReportRectangleItem(),
    id: nextPresetId('rect'),
    ...patch
});

export const createInvoiceSummaryStarterPreset = (): ReportDefinitionPreset => {
    const dataSourceKey = 'billing.saleInvoices';
    const definition = createEmptyReportDefinition(dataSourceKey);

    definition.sections.pageHeader.heightMm = 24;
    definition.sections.pageHeader.items = [
        withImage({
            sourceKind: 'company_logo',
            xMm: 0,
            yMm: 1,
            widthMm: 16,
            heightMm: 16,
            borderWidth: 0,
            fillColor: 'transparent'
        }),
        withText({
            xMm: 20,
            yMm: 1,
            widthMm: 92,
            heightMm: 7,
            fontSizePt: 16,
            fontWeight: 'bold',
            expression: '=companyName()',
            text: ''
        }),
        withText({
            xMm: 20,
            yMm: 9,
            widthMm: 108,
            heightMm: 5,
            fontSizePt: 9,
            expression: '=companyAddress()',
            text: ''
        }),
        withText({
            xMm: 128,
            yMm: 2,
            widthMm: 54,
            heightMm: 7,
            fontSizePt: 14,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Sales Invoice Summary'
        }),
        withText({
            xMm: 128,
            yMm: 11,
            widthMm: 54,
            heightMm: 5,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=concat("Invoices: ", rowsCount())',
            text: ''
        }),
        withLine({
            xMm: 0,
            yMm: 20,
            widthMm: 182,
            borderWidth: 1
        })
    ];

    definition.sections.reportHeader.heightMm = 10;
    definition.sections.reportHeader.items = [
        withText({
            xMm: 0,
            yMm: 1,
            widthMm: 120,
            heightMm: 5,
            fontSizePt: 9,
            text: 'Starter preset using list rows and expressions for invoice-style summary printing.'
        })
    ];

    const listItem = createReportListItem([]);
    listItem.id = nextPresetId('list');
    listItem.xMm = 0;
    listItem.yMm = 0;
    listItem.widthMm = 182;
    listItem.heightMm = 150;
    listItem.rowHeightMm = 31;
    listItem.gapMm = 2;
    listItem.showRowDivider = true;
    listItem.zebraStriping = false;
    listItem.items = [
        withListChild(createReportTextItem(), {
            xMm: 3,
            yMm: 2,
            widthMm: 18,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#475569',
            text: 'Invoice'
        }),
        withListChild(createReportFieldItem('voucherNumber'), {
            xMm: 22,
            yMm: 1,
            widthMm: 34,
            heightMm: 6,
            fontSizePt: 11,
            fontWeight: 'bold',
            expression: '=field("voucherNumber")'
        }),
        withListChild(createReportFieldItem('voucherDateText'), {
            xMm: 58,
            yMm: 2,
            widthMm: 28,
            heightMm: 5,
            fontSizePt: 8,
            textColor: '#475569',
            expression: '=concat("Date: ", formatDate(field("voucherDateText")))'
        }),
        withListChild(createReportFieldItem('isCancelledFlag'), {
            xMm: 142,
            yMm: 2,
            widthMm: 20,
            heightMm: 5,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            textColor: '#b91c1c',
            expression: '=if(eq(field("isCancelledFlag"), 1), "Cancelled", "")'
        }),
        withListChild(createReportTextItem(), {
            xMm: 3,
            yMm: 10,
            widthMm: 14,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#475569',
            text: 'Party'
        }),
        withListChild(createReportFieldItem('ledgerName'), {
            xMm: 18,
            yMm: 9,
            widthMm: 86,
            heightMm: 5,
            fontSizePt: 10,
            fontWeight: 'bold',
            expression: '=field("ledgerName")'
        }),
        withListChild(createReportFieldItem('ledgerAddress'), {
            xMm: 18,
            yMm: 15,
            widthMm: 90,
            heightMm: 8,
            fontSizePt: 8,
            textColor: '#334155',
            expression: '=coalesce(field("ledgerAddress"), "")'
        }),
        withListChild(createReportLineItem(), {
            xMm: 108,
            yMm: 9,
            widthMm: 0.5,
            heightMm: 14,
            borderWidth: 1
        }),
        withListChild(createReportTextItem(), {
            xMm: 114,
            yMm: 9,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#475569',
            text: 'Gross'
        }),
        withListChild(createReportFieldItem('grossAmount'), {
            xMm: 132,
            yMm: 8.5,
            widthMm: 28,
            heightMm: 5,
            fontSizePt: 9,
            textAlign: 'right',
            expression: '=formatNumber(field("grossAmount"), 2)'
        }),
        withListChild(createReportTextItem(), {
            xMm: 114,
            yMm: 15,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#475569',
            text: 'Tax'
        }),
        withListChild(createReportFieldItem('totalTaxAmount'), {
            xMm: 132,
            yMm: 14.5,
            widthMm: 28,
            heightMm: 5,
            fontSizePt: 9,
            textAlign: 'right',
            expression: '=formatNumber(field("totalTaxAmount"), 2)'
        }),
        withListChild(createReportTextItem(), {
            xMm: 114,
            yMm: 21,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#0f172a',
            text: 'Net'
        }),
        withListChild(createReportFieldItem('totalNetAmount'), {
            xMm: 132,
            yMm: 20.5,
            widthMm: 28,
            heightMm: 5,
            fontSizePt: 10,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=formatNumber(field("totalNetAmount"), 2)'
        })
    ];

    definition.sections.body.heightMm = 160;
    definition.sections.body.items = [listItem];

    definition.sections.reportFooter.heightMm = 14;
    definition.sections.reportFooter.items = [
        withLine({
            xMm: 0,
            yMm: 0,
            widthMm: 182,
            borderWidth: 1
        }),
        withText({
            xMm: 0,
            yMm: 3,
            widthMm: 40,
            heightMm: 4,
            fontSizePt: 8,
            expression: '=concat("Invoices: ", rowsCount())',
            text: ''
        }),
        withText({
            xMm: 106,
            yMm: 3,
            widthMm: 30,
            heightMm: 5,
            fontSizePt: 8,
            fontWeight: 'bold',
            text: 'Total Net Amount'
        }),
        withField('', {
            xMm: 138,
            yMm: 2.5,
            widthMm: 24,
            heightMm: 5,
            fontSizePt: 10,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=formatNumber(sum("totalNetAmount"), 2)'
        })
    ];

    definition.sections.pageFooter.heightMm = 6;
    definition.sections.pageFooter.items = [
        withText({
            xMm: 132,
            yMm: 0.5,
            widthMm: 50,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            textColor: '#475569',
            expression: '=concat("Page : ", pageNumber(), " / ", totalPages())',
            text: ''
        })
    ];

    return {
        key: 'invoice-summary-starter',
        label: 'Invoice Summary Starter',
        description: 'Starter V2 invoice preset using company header, list rows, and aggregate expressions.',
        moduleKey: 'invoice',
        usageKey: 'print',
        dataSourceKey,
        templateName: 'Invoice Summary Starter',
        templateKey: 'invoice-summary-starter',
        selectedFieldKeys: [
            'voucherNumber',
            'voucherDateText',
            'ledgerName',
            'ledgerAddress',
            'grossAmount',
            'totalTaxAmount',
            'totalNetAmount',
            'isCancelledFlag'
        ],
        definition
    };
};

export const createInvoiceDetailStarterPreset = (): ReportDefinitionPreset => {
    const dataSourceKey = 'billing.invoiceLedger';
    const definition = createEmptyReportDefinition(dataSourceKey);
    definition.repeatPerRow = true;

    definition.sections.pageHeader.heightMm = 24;
    definition.sections.pageHeader.items = [
        withImage({
            sourceKind: 'company_logo',
            xMm: 0,
            yMm: 1,
            widthMm: 16,
            heightMm: 16,
            borderWidth: 0,
            fillColor: 'transparent'
        }),
        withText({
            xMm: 20,
            yMm: 1,
            widthMm: 110,
            heightMm: 7,
            fontSizePt: 16,
            fontWeight: 'bold',
            expression: '=companyName()',
            text: ''
        }),
        withText({
            xMm: 20,
            yMm: 9,
            widthMm: 110,
            heightMm: 5,
            fontSizePt: 9,
            expression: '=companyAddress()',
            text: ''
        }),
        withText({
            xMm: 132,
            yMm: 2,
            widthMm: 50,
            heightMm: 7,
            fontSizePt: 14,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Sales Invoice'
        }),
        withLine({
            xMm: 0,
            yMm: 20,
            widthMm: 182,
            borderWidth: 1
        })
    ];

    definition.sections.reportHeader.heightMm = 34;
    definition.sections.reportHeader.items = [
        withText({
            xMm: 0,
            yMm: 0,
            widthMm: 20,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#475569',
            text: 'Invoice No'
        }),
        withField('voucherNumber', {
            xMm: 22,
            yMm: 0,
            widthMm: 34,
            heightMm: 5,
            fontSizePt: 11,
            fontWeight: 'bold',
            expression: '=field("voucherNumber")'
        }),
        withText({
            xMm: 124,
            yMm: 0,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#475569',
            text: 'Date'
        }),
        withField('voucherDateText', {
            xMm: 142,
            yMm: 0,
            widthMm: 40,
            heightMm: 5,
            fontSizePt: 9,
            textAlign: 'right',
            expression: '=field("voucherDateText")'
        }),
        withText({
            xMm: 0,
            yMm: 8,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#475569',
            text: 'Party'
        }),
        withField('ledger', {
            xMm: 18,
            yMm: 7.5,
            widthMm: 108,
            heightMm: 5,
            fontSizePt: 10,
            fontWeight: 'bold',
            expression: '=field("ledger")'
        }),
        withText({
            xMm: 128,
            yMm: 8,
            widthMm: 14,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#475569',
            text: 'GSTIN'
        }),
        withField('tinNo', {
            xMm: 144,
            yMm: 7.5,
            widthMm: 38,
            heightMm: 5,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=field("tinNo")'
        }),
        withText({
            xMm: 0,
            yMm: 14,
            widthMm: 18,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textColor: '#475569',
            text: 'Address'
        }),
        withField('address1', {
            xMm: 18,
            yMm: 13.5,
            widthMm: 164,
            heightMm: 9,
            fontSizePt: 8,
            expression: '=field("address1")'
        }),
        withLine({
            xMm: 0,
            yMm: 26,
            widthMm: 182,
            borderWidth: 1
        }),
        withText({
            xMm: 0,
            yMm: 28,
            widthMm: 182,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#64748b',
            text: 'Starter preset for row-scoped invoice layouts with nested line-item bands.'
        })
    ];

    const lineList = createReportListItem(['sNo', 'item']);
    lineList.id = nextPresetId('list');
    lineList.xMm = 0;
    lineList.yMm = 8;
    lineList.widthMm = 182;
    lineList.heightMm = 118;
    lineList.sourcePath = 'lines';
    lineList.rowHeightMm = 8;
    lineList.gapMm = 0;
    lineList.showRowDivider = true;
    lineList.zebraStriping = false;
    lineList.items = [
        withListChild(createReportFieldItem('sNo'), {
            xMm: 0,
            yMm: 1.2,
            widthMm: 10,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=field("sNo")'
        }),
        withListChild(createReportFieldItem('item'), {
            xMm: 12,
            yMm: 1,
            widthMm: 64,
            heightMm: 6,
            fontSizePt: 8,
            expression:
                '=concat(field("item"), if(eq(trim(field("remark")), ""), "", concat(" / ", field("remark"))))'
        }),
        withListChild(createReportFieldItem('typeDetails'), {
            xMm: 78,
            yMm: 1,
            widthMm: 24,
            heightMm: 6,
            fontSizePt: 7,
            expression: '=field("typeDetails")'
        }),
        withListChild(createReportFieldItem('taxRate'), {
            xMm: 104,
            yMm: 1,
            widthMm: 10,
            heightMm: 6,
            fontSizePt: 7,
            textAlign: 'right',
            expression: '=formatNumber(field("taxRate"), 2)'
        }),
        withListChild(createReportFieldItem('mrp'), {
            xMm: 116,
            yMm: 1,
            widthMm: 12,
            heightMm: 6,
            fontSizePt: 7,
            textAlign: 'right',
            expression: '=formatNumber(field("mrp"), 2)'
        }),
        withListChild(createReportFieldItem('qty'), {
            xMm: 130,
            yMm: 1,
            widthMm: 20,
            heightMm: 6,
            fontSizePt: 7,
            textAlign: 'right',
            expression:
                '=concat(formatNumber(field("qty"), 0), " ", field("unitQ"), if(gt(number(field("free")), 0), concat(" + ", formatNumber(field("free"), 0), " ", field("unitF")), ""))'
        }),
        withListChild(createReportFieldItem('rate'), {
            xMm: 152,
            yMm: 1,
            widthMm: 14,
            heightMm: 6,
            fontSizePt: 7,
            textAlign: 'right',
            expression: '=formatNumber(field("rate"), 2)'
        }),
        withListChild(createReportFieldItem('qtyxRate'), {
            xMm: 168,
            yMm: 1,
            widthMm: 14,
            heightMm: 6,
            fontSizePt: 7,
            textAlign: 'right',
            expression: '=formatNumber(field("qtyxRate"), 2)'
        })
    ];

    definition.sections.body.heightMm = 128;
    definition.sections.body.items = [
        withText({
            xMm: 0,
            yMm: 0,
            widthMm: 10,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'S.No'
        }),
        withText({
            xMm: 12,
            yMm: 0,
            widthMm: 64,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            text: 'Item / Remark'
        }),
        withText({
            xMm: 78,
            yMm: 0,
            widthMm: 24,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            text: 'Type'
        }),
        withText({
            xMm: 104,
            yMm: 0,
            widthMm: 10,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Tax'
        }),
        withText({
            xMm: 116,
            yMm: 0,
            widthMm: 12,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'MRP'
        }),
        withText({
            xMm: 130,
            yMm: 0,
            widthMm: 20,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Qty'
        }),
        withText({
            xMm: 152,
            yMm: 0,
            widthMm: 14,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Rate'
        }),
        withText({
            xMm: 168,
            yMm: 0,
            widthMm: 14,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Amount'
        }),
        withLine({
            xMm: 0,
            yMm: 5,
            widthMm: 182,
            borderWidth: 1
        }),
        lineList
    ];

    definition.sections.reportFooter.heightMm = 28;
    definition.sections.reportFooter.items = [
        withLine({
            xMm: 0,
            yMm: 0,
            widthMm: 182,
            borderWidth: 1
        }),
        withText({
            xMm: 0,
            yMm: 2,
            widthMm: 88,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            text: 'Amount In Words'
        }),
        withField('amountInWords', {
            xMm: 0,
            yMm: 7,
            widthMm: 96,
            heightMm: 8,
            fontSizePt: 8,
            expression: '=field("amountInWords")'
        }),
        withField('creditNoteText', {
            xMm: 0,
            yMm: 16,
            widthMm: 96,
            heightMm: 4,
            fontSizePt: 7,
            expression: '=field("creditNoteText")'
        }),
        withField('debitNoteText', {
            xMm: 0,
            yMm: 21,
            widthMm: 96,
            heightMm: 4,
            fontSizePt: 7,
            expression: '=field("debitNoteText")'
        }),
        withText({
            xMm: 112,
            yMm: 2,
            widthMm: 28,
            heightMm: 4,
            fontSizePt: 8,
            text: 'Qty x Rate'
        }),
        withField('totalQtyxRate', {
            xMm: 142,
            yMm: 1.5,
            widthMm: 40,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=formatNumber(field("totalQtyxRate"), 2)'
        }),
        withText({
            xMm: 112,
            yMm: 8,
            widthMm: 28,
            heightMm: 4,
            fontSizePt: 8,
            text: 'Gross Amount'
        }),
        withField('totalGrossAmt', {
            xMm: 142,
            yMm: 7.5,
            widthMm: 40,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=formatNumber(field("totalGrossAmt"), 2)'
        }),
        withText({
            xMm: 112,
            yMm: 14,
            widthMm: 28,
            heightMm: 4,
            fontSizePt: 8,
            text: 'Tax Amount'
        }),
        withField('totalTaxationAmt', {
            xMm: 142,
            yMm: 13.5,
            widthMm: 40,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=formatNumber(field("totalTaxationAmt"), 2)'
        }),
        withText({
            xMm: 112,
            yMm: 20,
            widthMm: 28,
            heightMm: 4,
            fontSizePt: 8,
            fontWeight: 'bold',
            text: 'Net Amount'
        }),
        withField('totalNetAmt', {
            xMm: 142,
            yMm: 19.5,
            widthMm: 40,
            heightMm: 4,
            fontSizePt: 9,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=formatNumber(field("totalNetAmt"), 2)'
        })
    ];

    definition.sections.pageFooter.heightMm = 6;
    definition.sections.pageFooter.items = [
        withText({
            xMm: 208,
            yMm: 0.5,
            widthMm: 64,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            textColor: '#475569',
            expression: '=concat("Page No. : ", pageNumber(), " of ", totalPages())',
            text: ''
        })
    ];

    return {
        key: 'invoice-detail-starter',
        label: 'Invoice Detail Starter',
        description: 'Row-scoped detailed invoice preset with nested line-item band and footer totals.',
        moduleKey: 'invoice',
        usageKey: 'invoice',
        dataSourceKey,
        templateName: 'Invoice Detail Starter',
        templateKey: 'invoice-detail-starter',
        selectedFieldKeys: [
            'voucherNumber',
            'voucherDateText',
            'ledger',
            'address1',
            'tinNo',
            'amountInWords',
            'creditNoteText',
            'debitNoteText',
            'totalQtyxRate',
            'totalGrossAmt',
            'totalTaxationAmt',
            'totalNetAmt',
            'sNo',
            'item',
            'remark',
            'typeDetails',
            'taxRate',
            'mrp',
            'qty',
            'unitQ',
            'free',
            'unitF',
            'rate',
            'qtyxRate'
        ],
        definition
    };
};

export const createInvoiceLedgerLegacyStarterPreset = (): ReportDefinitionPreset => {
    const dataSourceKey = 'billing.invoiceLedger';
    const definition = createEmptyReportDefinition(dataSourceKey);
    definition.defaultFontFamily = '"Courier New", Courier, monospace';
    definition.repeatPerRow = true;

    definition.sections.pageHeader.heightMm = 22;
    definition.sections.pageHeader.items = [
        withImage({
            sourceKind: 'company_logo',
            xMm: 0,
            yMm: 1,
            widthMm: 16,
            heightMm: 16,
            borderWidth: 0,
            fillColor: 'transparent'
        }),
        withText({
            xMm: 20,
            yMm: 1,
            widthMm: 112,
            heightMm: 7,
            fontSizePt: 16,
            fontWeight: 'bold',
            expression: '=companyName()',
            text: ''
        }),
        withText({
            xMm: 20,
            yMm: 9,
            widthMm: 112,
            heightMm: 5,
            fontSizePt: 9,
            expression: '=companyAddress()',
            text: ''
        }),
        withText({
            xMm: 134,
            yMm: 2,
            widthMm: 48,
            heightMm: 7,
            fontSizePt: 13,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Invoice Ledger'
        }),
        withLine({
            xMm: 0,
            yMm: 19,
            widthMm: 182,
            borderWidth: 1
        })
    ];

    definition.sections.reportHeader.heightMm = 21;
    definition.sections.reportHeader.items = [
        withRectangle({
            xMm: 0,
            yMm: 0,
            widthMm: 109,
            heightMm: 17,
            borderWidth: 1,
            fillColor: '#ffffff'
        }),
        withRectangle({
            xMm: 111,
            yMm: 0,
            widthMm: 71,
            heightMm: 17,
            borderWidth: 1,
            fillColor: '#ffffff'
        }),
        withText({
            xMm: 3,
            yMm: 2,
            widthMm: 14,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#475569',
            text: 'Party'
        }),
        withField('ledger', {
            xMm: 3,
            yMm: 6,
            widthMm: 100,
            heightMm: 4,
            fontSizePt: 10,
            fontWeight: 'bold',
            expression: '=field("ledger")'
        }),
        withField('address1', {
            xMm: 3,
            yMm: 10.5,
            widthMm: 100,
            heightMm: 5,
            fontSizePt: 8,
            expression: '=concat(field("address1"), if(eq(trim(field("city")), ""), "", concat(", ", field("city"))))'
        }),
        withText({
            xMm: 114,
            yMm: 2,
            widthMm: 24,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#475569',
            text: 'Invoice No'
        }),
        withField('voucherNumber', {
            xMm: 141,
            yMm: 2,
            widthMm: 38,
            heightMm: 4,
            fontSizePt: 10,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=field("voucherNumber")'
        }),
        withText({
            xMm: 114,
            yMm: 7,
            widthMm: 24,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#475569',
            text: 'Date'
        }),
        withField('voucherDateText', {
            xMm: 141,
            yMm: 7,
            widthMm: 38,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=field("voucherDateText")'
        }),
        withText({
            xMm: 114,
            yMm: 12,
            widthMm: 24,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#475569',
            text: 'GSTIN'
        }),
        withField('tinNo', {
            xMm: 141,
            yMm: 12,
            widthMm: 38,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=field("tinNo")'
        })
    ];

    const legacyLineList = createReportListItem(['sNo', 'item']);
    legacyLineList.id = nextPresetId('list');
    legacyLineList.xMm = 0;
    legacyLineList.yMm = 6;
    legacyLineList.widthMm = 182;
    legacyLineList.heightMm = 98;
    legacyLineList.sourcePath = 'lines';
    legacyLineList.rowHeightMm = 10;
    legacyLineList.gapMm = 0;
    legacyLineList.showRowDivider = true;
    legacyLineList.zebraStriping = false;
    legacyLineList.items = [
        withListChild(createReportFieldItem('sNo'), {
            xMm: 0,
            yMm: 0.9,
            widthMm: 9,
            heightMm: 4,
            fontSizePt: 7.5,
            textAlign: 'right',
            expression: '=field("sNo")'
        }),
        withListChild(createReportFieldItem('item'), {
            xMm: 11,
            yMm: 0.7,
            widthMm: 58,
            heightMm: 3.5,
            fontSizePt: 7.5,
            expression:
                '=concat(field("item"), if(eq(trim(field("remark")), ""), "", concat(" (", field("remark"), ")")))'
        }),
        withListChild(createReportFieldItem('typeDetails'), {
            xMm: 11,
            yMm: 4.2,
            widthMm: 58,
            heightMm: 2.8,
            fontSizePt: 6.2,
            textColor: '#475569',
            expression:
                '=concat(if(eq(trim(field("hsnCode")), ""), "", concat("HSN ", field("hsnCode"), " ")), field("typeDetails"))'
        }),
        withListChild(createReportFieldItem('itemF'), {
            xMm: 11,
            yMm: 7,
            widthMm: 58,
            heightMm: 2.5,
            fontSizePt: 6.2,
            textColor: '#475569',
            expression:
                '=if(gt(number(field("free")), 0), concat("Free: ", field("itemF")), "")'
        }),
        withListChild(createReportFieldItem('taxRate'), {
            xMm: 71,
            yMm: 0.9,
            widthMm: 10,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("taxRate"), 2)'
        }),
        withListChild(createReportFieldItem('mrp'), {
            xMm: 83,
            yMm: 0.9,
            widthMm: 13,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("mrp"), 2)'
        }),
        withListChild(createReportFieldItem('qty'), {
            xMm: 98,
            yMm: 0.9,
            widthMm: 15,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=concat(formatNumber(field("qty"), 0), if(eq(trim(field("unitQ")), ""), "", concat(" ", field("unitQ"))))'
        }),
        withListChild(createReportFieldItem('free'), {
            xMm: 115,
            yMm: 0.9,
            widthMm: 15,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression:
                '=if(gt(number(field("free")), 0), concat(formatNumber(field("free"), 0), if(eq(trim(field("unitF")), ""), "", concat(" ", field("unitF")))), "")'
        }),
        withListChild(createReportFieldItem('productDiscAmt'), {
            xMm: 132,
            yMm: 0.9,
            widthMm: 14,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=if(gt(number(field("productDiscAmt")), 0), formatNumber(field("productDiscAmt"), 2), "")'
        }),
        withListChild(createReportFieldItem('rate'), {
            xMm: 148,
            yMm: 0.9,
            widthMm: 15,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("rate"), 2)'
        }),
        withListChild(createReportFieldItem('qtyxRate'), {
            xMm: 165,
            yMm: 0.9,
            widthMm: 17,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("qtyxRate"), 2)'
        })
    ];

    definition.sections.body.heightMm = 106;
    definition.sections.body.items = [
        withText({
            xMm: 0,
            yMm: 0,
            widthMm: 9,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'S.No.'
        }),
        withText({
            xMm: 11,
            yMm: 0,
            widthMm: 58,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            text: 'Item'
        }),
        withText({
            xMm: 71,
            yMm: 0,
            widthMm: 10,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Tax %'
        }),
        withText({
            xMm: 83,
            yMm: 0,
            widthMm: 13,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'MRP'
        }),
        withText({
            xMm: 98,
            yMm: 0,
            widthMm: 15,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Qty'
        }),
        withText({
            xMm: 115,
            yMm: 0,
            widthMm: 15,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Free'
        }),
        withText({
            xMm: 132,
            yMm: 0,
            widthMm: 14,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Scheme'
        }),
        withText({
            xMm: 148,
            yMm: 0,
            widthMm: 15,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Rate'
        }),
        withText({
            xMm: 165,
            yMm: 0,
            widthMm: 17,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Qty x Rate'
        }),
        withLine({
            xMm: 0,
            yMm: 4.8,
            widthMm: 182,
            borderWidth: 1
        }),
        legacyLineList
    ];

    const summaryHeads = [
        'Amount',
        'Scheme',
        'Ext. Sch.',
        'Replacement',
        'CD',
        'Sp. Less',
        'Gross Amt'
    ] as const;
    const summaryFields = [
        'totalQtyxRate',
        'totalProDisAmt',
        'totalDisplayAmt',
        'totalReplacementAmt',
        'totalCashDisAmt',
        'totalLessSpecialAmt',
        'totalGrossAmt'
    ] as const;

    const summaryItems = summaryHeads.flatMap((label, index) => {
        const xMm = index * 26;
        const fieldKey = summaryFields[index];
        return [
            withText({
                xMm,
                yMm: 0,
                widthMm: 26,
                heightMm: 6,
                fontSizePt: 7.2,
                fontWeight: 'bold',
                textAlign: 'center',
                borderWidth: 1,
                fillColor: '#eef3f8',
                text: label,
                textColor: '#0f172a'
            }),
            withField(fieldKey, {
                xMm,
                yMm: 6,
                widthMm: 26,
                heightMm: 6,
                fontSizePt: 7.2,
                textAlign: 'right',
                borderWidth: 1,
                expression: `=formatNumber(field("${fieldKey}"), 2)`
            })
        ];
    });

    definition.sections.reportFooter.heightMm = 56;
    definition.sections.reportFooter.items = [
        ...summaryItems,
        withText({
            xMm: 0,
            yMm: 12,
            widthMm: 26,
            heightMm: 6,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'center',
            borderWidth: 1,
            fillColor: '#eef3f8',
            textColor: '#0f172a',
            expression:
                '=if(gt(number(field("totalAdditionalTaxAmt")), 0), concat("GST / ", coalesce(field("ledgerAdditionalTax"), "Additional Tax")), "GST")',
            text: ''
        }),
        withText({
            xMm: 26,
            yMm: 12,
            widthMm: 104,
            heightMm: 6,
            fontSizePt: 7.2,
            textAlign: 'right',
            borderWidth: 1,
            expression:
                '=if(gt(number(field("totalAdditionalTaxAmt")), 0), concat(formatNumber(field("totalTaxationAmt"), 2), " / ", formatNumber(field("totalAdditionalTaxAmt"), 2)), formatNumber(field("totalTaxationAmt"), 2))',
            text: ''
        }),
        withText({
            xMm: 130,
            yMm: 12,
            widthMm: 26,
            heightMm: 6,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'center',
            borderWidth: 1,
            fillColor: '#eef3f8',
            text: 'Net Amt'
        }),
        withField('totalNetAmt', {
            xMm: 156,
            yMm: 12,
            widthMm: 26,
            heightMm: 6,
            fontSizePt: 8,
            fontWeight: 'bold',
            textAlign: 'right',
            borderWidth: 1,
            expression: '=formatNumber(field("totalNetAmt"), 2)'
        }),
        withText({
            xMm: 0,
            yMm: 20,
            widthMm: 26,
            heightMm: 5,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'center',
            borderWidth: 1,
            fillColor: '#eef3f8',
            text: 'Tax'
        }),
        withText({
            xMm: 26,
            yMm: 20,
            widthMm: 28,
            heightMm: 5,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'center',
            borderWidth: 1,
            fillColor: '#eef3f8',
            text: 'Add Amt'
        }),
        withText({
            xMm: 54,
            yMm: 20,
            widthMm: 28,
            heightMm: 5,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'center',
            borderWidth: 1,
            fillColor: '#eef3f8',
            text: 'Taxable Amt'
        }),
        withField('taxs', {
            xMm: 0,
            yMm: 25,
            widthMm: 26,
            heightMm: 15,
            fontSizePt: 7,
            borderWidth: 1,
            expression: '=field("taxs")'
        }),
        withField('addAmts', {
            xMm: 26,
            yMm: 25,
            widthMm: 28,
            heightMm: 15,
            fontSizePt: 7,
            textAlign: 'right',
            borderWidth: 1,
            expression: '=field("addAmts")'
        }),
        withField('taxableAmts', {
            xMm: 54,
            yMm: 25,
            widthMm: 28,
            heightMm: 15,
            fontSizePt: 7,
            textAlign: 'right',
            borderWidth: 1,
            expression: '=field("taxableAmts")'
        }),
        withText({
            xMm: 84,
            yMm: 20,
            widthMm: 98,
            heightMm: 5,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'center',
            borderWidth: 1,
            fillColor: '#eef3f8',
            text: 'Amount In Words'
        }),
        withField('amountInWords', {
            xMm: 84,
            yMm: 25,
            widthMm: 98,
            heightMm: 15,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            borderWidth: 1,
            expression: '=field("amountInWords")'
        }),
        withField('creditNoteText', {
            xMm: 0,
            yMm: 42,
            widthMm: 142,
            heightMm: 4,
            fontSizePt: 7,
            expression: '=field("creditNoteText")'
        }),
        withField('debitNoteText', {
            xMm: 0,
            yMm: 47,
            widthMm: 142,
            heightMm: 4,
            fontSizePt: 7,
            expression: '=field("debitNoteText")'
        }),
        withText({
            xMm: 144,
            yMm: 45,
            widthMm: 38,
            heightMm: 4,
            fontSizePt: 6.8,
            textAlign: 'right',
            textColor: '#475569',
            expression: '=if(eq(trim(field("irn")), ""), "", concat("IRN: ", field("irn")))',
            text: ''
        })
    ];

    definition.sections.pageFooter.heightMm = 6;
    definition.sections.pageFooter.items = [
        withText({
            xMm: 132,
            yMm: 0.5,
            widthMm: 50,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            textColor: '#475569',
            expression: '=concat("Page No. : ", pageNumber(), " of ", totalPages())',
            text: ''
        })
    ];

    return {
        key: 'invoice-ledger-legacy-starter',
        label: 'Invoice Ledger Legacy Starter',
        description: 'Closer legacy GST invoice-ledger layout using row-scoped pages, detailed lines, summary strip, and tax breakup blocks.',
        moduleKey: 'invoice',
        usageKey: 'invoice',
        dataSourceKey,
        templateName: 'Invoice Ledger Legacy Starter',
        templateKey: 'invoice-ledger-legacy-starter',
        selectedFieldKeys: [
            'voucherNumber',
            'voucherDateText',
            'ledger',
            'address1',
            'city',
            'tinNo',
            'amountInWords',
            'taxs',
            'addAmts',
            'taxableAmts',
            'creditNoteText',
            'debitNoteText',
            'irn',
            'totalQtyxRate',
            'totalProDisAmt',
            'totalDisplayAmt',
            'totalReplacementAmt',
            'totalCashDisAmt',
            'totalLessSpecialAmt',
            'totalGrossAmt',
            'totalTaxationAmt',
            'totalAdditionalTaxAmt',
            'ledgerAdditionalTax',
            'totalNetAmt',
            'sNo',
            'item',
            'remark',
            'typeDetails',
            'hsnCode',
            'itemF',
            'taxRate',
            'mrp',
            'qty',
            'unitQ',
            'free',
            'unitF',
            'productDiscAmt',
            'rate',
            'qtyxRate'
        ],
        pageSettings: {
            pageSize: 'A5',
            orientation: 'landscape',
            marginTopMm: 10.16,
            marginRightMm: 8.89,
            marginBottomMm: 7.62,
            marginLeftMm: 8.89
        },
        definition
    };
};

export const createLoadingSheetLegacyStarterPreset = (): ReportDefinitionPreset => {
    const dataSourceKey = 'billing.loadingSheet';
    const definition = createEmptyReportDefinition(dataSourceKey);

    definition.sections.pageHeader.heightMm = 24;
    definition.sections.pageHeader.items = [
        withImage({
            sourceKind: 'company_logo',
            xMm: 0,
            yMm: 1,
            widthMm: 16,
            heightMm: 16,
            borderWidth: 0,
            fillColor: 'transparent'
        }),
        withText({
            xMm: 20,
            yMm: 1,
            widthMm: 110,
            heightMm: 7,
            fontSizePt: 16,
            fontWeight: 'bold',
            expression: '=companyName()',
            text: ''
        }),
        withText({
            xMm: 20,
            yMm: 9,
            widthMm: 110,
            heightMm: 5,
            fontSizePt: 9,
            expression: '=companyAddress()',
            text: ''
        }),
        withText({
            xMm: 132,
            yMm: 2,
            widthMm: 50,
            heightMm: 7,
            fontSizePt: 14,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Loading Sheet'
        }),
        withText({
            xMm: 132,
            yMm: 10,
            widthMm: 50,
            heightMm: 5,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=concat("Rows: ", rowsCount())',
            text: ''
        }),
        withLine({
            xMm: 0,
            yMm: 20,
            widthMm: 182,
            borderWidth: 1
        })
    ];

    definition.sections.reportHeader.heightMm = 9;
    definition.sections.reportHeader.items = [
        withText({
            xMm: 0,
            yMm: 1,
            widthMm: 182,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#64748b',
            text: 'Legacy-style loading sheet layout using grouped invoice item rows.'
        })
    ];

    const loadingList = createReportListItem(['sNo', 'item']);
    loadingList.id = nextPresetId('list');
    loadingList.xMm = 0;
    loadingList.yMm = 6;
    loadingList.widthMm = 182;
    loadingList.heightMm = 134;
    loadingList.rowHeightMm = 6.2;
    loadingList.gapMm = 0;
    loadingList.showRowDivider = true;
    loadingList.zebraStriping = false;
    loadingList.items = [
        withListChild(createReportFieldItem('sNo'), {
            xMm: 0,
            yMm: 1,
            widthMm: 10,
            heightMm: 4,
            fontSizePt: 7.5,
            textAlign: 'right',
            expression: '=field("sNo")'
        }),
        withListChild(createReportFieldItem('item'), {
            xMm: 12,
            yMm: 0.8,
            widthMm: 66,
            heightMm: 4,
            fontSizePt: 7.5,
            expression: '=field("item")'
        }),
        withListChild(createReportFieldItem('typeDetails'), {
            xMm: 12,
            yMm: 4.7,
            widthMm: 66,
            heightMm: 3,
            fontSizePt: 6.3,
            textColor: '#475569',
            expression: '=field("typeDetails")'
        }),
        withListChild(createReportFieldItem('mrp'), {
            xMm: 80,
            yMm: 1,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("mrp"), 2)'
        }),
        withListChild(createReportFieldItem('qty'), {
            xMm: 98,
            yMm: 1,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("qty"), 2)'
        }),
        withListChild(createReportFieldItem('free'), {
            xMm: 116,
            yMm: 1,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("free"), 2)'
        }),
        withListChild(createReportFieldItem('totalQty'), {
            xMm: 134,
            yMm: 1,
            widthMm: 20,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("totalQty"), 2)'
        }),
        withListChild(createReportFieldItem('netAmt'), {
            xMm: 156,
            yMm: 1,
            widthMm: 26,
            heightMm: 4,
            fontSizePt: 7.2,
            textAlign: 'right',
            expression: '=formatNumber(field("netAmt"), 2)'
        })
    ];

    definition.sections.body.heightMm = 142;
    definition.sections.body.items = [
        withText({
            xMm: 0,
            yMm: 0,
            widthMm: 10,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'S. No.'
        }),
        withText({
            xMm: 12,
            yMm: 0,
            widthMm: 66,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            text: 'Item'
        }),
        withText({
            xMm: 80,
            yMm: 0,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'MRP'
        }),
        withText({
            xMm: 98,
            yMm: 0,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Qty'
        }),
        withText({
            xMm: 116,
            yMm: 0,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Free'
        }),
        withText({
            xMm: 134,
            yMm: 0,
            widthMm: 20,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Total Qty'
        }),
        withText({
            xMm: 156,
            yMm: 0,
            widthMm: 26,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Net Amount'
        }),
        withLine({
            xMm: 0,
            yMm: 4.8,
            widthMm: 182,
            borderWidth: 1
        }),
        loadingList
    ];

    definition.sections.reportFooter.heightMm = 24;
    definition.sections.reportFooter.items = [
        withLine({
            xMm: 0,
            yMm: 0,
            widthMm: 182,
            borderWidth: 1
        }),
        withText({
            xMm: 12,
            yMm: 2,
            widthMm: 66,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            text: 'Total'
        }),
        withField('', {
            xMm: 98,
            yMm: 2,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=formatNumber(sum("qty"), 2)'
        }),
        withField('', {
            xMm: 116,
            yMm: 2,
            widthMm: 16,
            heightMm: 4,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=formatNumber(sum("free"), 2)'
        }),
        withField('', {
            xMm: 134,
            yMm: 2,
            widthMm: 20,
            heightMm: 4,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=formatNumber(sum("totalQty"), 2)'
        }),
        withField('', {
            xMm: 156,
            yMm: 2,
            widthMm: 26,
            heightMm: 4,
            fontSizePt: 7.2,
            fontWeight: 'bold',
            textAlign: 'right',
            expression: '=formatNumber(sum("netAmt"), 2)'
        }),
        withText({
            xMm: 0,
            yMm: 10,
            widthMm: 20,
            heightMm: 4,
            fontSizePt: 7.5,
            fontWeight: 'bold',
            text: 'Invoices'
        }),
        withField('allInvoices', {
            xMm: 22,
            yMm: 9.5,
            widthMm: 160,
            heightMm: 10,
            fontSizePt: 7,
            expression: '=first("allInvoices")'
        })
    ];

    definition.sections.pageFooter.heightMm = 6;
    definition.sections.pageFooter.items = [
        withText({
            xMm: 132,
            yMm: 0.5,
            widthMm: 50,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            textColor: '#475569',
            expression: '=concat("Page : ", pageNumber(), " / ", totalPages())',
            text: ''
        })
    ];

    return {
        key: 'loading-sheet-legacy-starter',
        label: 'Loading Sheet Legacy Starter',
        description: 'Legacy-style loading sheet layout using grouped rows, manual totals, and invoice summary footer.',
        moduleKey: 'invoice',
        usageKey: 'loading_sheet',
        dataSourceKey,
        templateName: 'Loading Sheet Legacy Starter',
        templateKey: 'loading-sheet-legacy-starter',
        selectedFieldKeys: [
            'sNo',
            'item',
            'typeDetails',
            'mrp',
            'qty',
            'free',
            'totalQty',
            'netAmt',
            'allInvoices'
        ],
        pageSettings: {
            pageSize: 'A4',
            orientation: 'portrait',
            marginTopMm: 12.7,
            marginRightMm: 12.7,
            marginBottomMm: 12.7,
            marginLeftMm: 12.7
        },
        definition
    };
};

export const createSaleBookLegacyStarterPreset = (): ReportDefinitionPreset => {
    const dataSourceKey = 'billing.salesBookDetailed';
    const definition = createEmptyReportDefinition(dataSourceKey);
    definition.defaultFontFamily = '"Courier New", Courier, monospace';

    definition.sections.pageHeader.heightMm = 33;
    definition.sections.pageHeader.items = [
        withText({
            xMm: 0,
            yMm: 0,
            widthMm: 272,
            heightMm: 8,
            fontSizePt: 18,
            fontWeight: 'bold',
            textAlign: 'center',
            expression: '=companyName()',
            text: ''
        }),
        withText({
            xMm: 0,
            yMm: 8,
            widthMm: 272,
            heightMm: 5,
            fontSizePt: 8,
            textAlign: 'center',
            expression: '=companyAddress()',
            text: ''
        }),
        withText({
            xMm: 0,
            yMm: 18,
            widthMm: 272,
            heightMm: 5,
            fontSizePt: 10,
            fontWeight: 'bold',
            textAlign: 'center',
            text: 'SALE BOOK DETAILS'
        }),
        withText({
            xMm: 0,
            yMm: 24,
            widthMm: 272,
            heightMm: 5,
            fontSizePt: 8,
            textAlign: 'left',
            expression: '=coalesce(subtitle(), "")',
            text: ''
        }),
        withLine({
            xMm: 0,
            yMm: 30,
            widthMm: 272,
            borderWidth: 1
        })
    ];

    definition.sections.reportHeader.heightMm = 0;
    definition.sections.reportHeader.items = [];

    const saleBookTable = createReportTableItem([
        'voucherGroupKey',
        'voucherDateText',
        'voucherNumber',
        'ledgerName',
        'vatIncludedText',
        'sNo',
        'item',
        'qty',
        'unitQ',
        'free',
        'itemF',
        'unitF',
        'rate',
        'amount',
        'taxName',
        'taxAmt',
        'finalAmt'
    ]);
    saleBookTable.id = nextPresetId('table');
    saleBookTable.xMm = 0;
    saleBookTable.yMm = 0;
    saleBookTable.widthMm = 272;
    saleBookTable.heightMm = 150;
    saleBookTable.fontSizePt = 7.5;
    saleBookTable.borderColor = '#94a3b8';
    saleBookTable.zebraStriping = false;
    saleBookTable.showHeader = true;
    saleBookTable.showGrandTotal = true;
    saleBookTable.columns = [
        { id: nextPresetId('col'), fieldKey: 'voucherNumber', label: 'VNo', widthMm: 13.2, align: 'center', includeTotal: false, repeatValue: false },
        { id: nextPresetId('col'), fieldKey: 'voucherDateText', label: 'Date', widthMm: 16.93, align: 'center', includeTotal: false, repeatValue: false },
        { id: nextPresetId('col'), fieldKey: 'ledgerName', label: 'Ledger', widthMm: 38.01, align: 'left', includeTotal: false, repeatValue: false },
        { id: nextPresetId('col'), fieldKey: 'vatIncludedText', label: 'VAT', widthMm: 9.05, align: 'center', includeTotal: false, repeatValue: false },
        { id: nextPresetId('col'), fieldKey: 'sNo', label: 'S. No.', widthMm: 10.32, align: 'center', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'item', label: 'Item', widthMm: 42.25, align: 'left', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'qty', label: 'Qty', widthMm: 12.17, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'unitQ', label: 'Unit Q', widthMm: 10.05, align: 'center', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'free', label: 'Free', widthMm: 9.26, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'itemF', label: 'Item F', widthMm: 20.94, align: 'left', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'unitF', label: 'Unit F', widthMm: 10.05, align: 'center', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'rate', label: 'Rate', widthMm: 13.76, align: 'right', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'amount', label: 'Amount', widthMm: 15.35, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'taxName', label: 'Tax', widthMm: 13.76, align: 'center', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'taxAmt', label: 'Tax Amt', widthMm: 14.82, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'finalAmt', label: 'Final Amt', widthMm: 21.12, align: 'right', includeTotal: true }
    ];
    saleBookTable.sorts = [{ id: nextPresetId('sort'), fieldKey: 'voucherGroupKey', direction: 'asc' }];
    saleBookTable.rowGroups = [
        {
            id: nextPresetId('grp'),
            fieldKey: 'voucherGroupKey',
            label: 'Invoice',
            sortDirection: 'asc',
            showHeader: false,
            showSubtotal: true,
            subtotalLabel: 'Sub Total'
        }
    ];

    definition.sections.body.heightMm = 150;
    definition.sections.body.items = [saleBookTable];

    definition.sections.reportFooter.heightMm = 0;
    definition.sections.reportFooter.items = [];
    definition.sections.pageFooter.heightMm = 6;
    definition.sections.pageFooter.items = [
        withText({
            xMm: 208,
            yMm: 0.5,
            widthMm: 64,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            textColor: '#475569',
            expression: '=concat("Page No. : ", pageNumber(), " of ", totalPages())',
            text: ''
        })
    ];

    return {
        key: 'sale-book-legacy-starter',
        label: 'Sale Book Legacy Starter',
        description: 'Legacy-style sale book layout using invoice-line rows, voucher subtotals, and grand total.',
        moduleKey: 'invoice',
        usageKey: 'sale_book',
        dataSourceKey,
        templateName: 'Sale Book Legacy Starter',
        templateKey: 'sale-book-legacy-starter',
        selectedFieldKeys: [
            'voucherGroupKey',
            'voucherNumber',
            'voucherDateText',
            'ledgerName',
            'vatIncludedText',
            'sNo',
            'item',
            'qty',
            'unitQ',
            'free',
            'itemF',
            'unitF',
            'rate',
            'amount',
            'taxName',
            'taxAmt',
            'finalAmt'
        ],
        pageSettings: {
            pageSize: 'A4',
            orientation: 'landscape',
            marginTopMm: 6.35,
            marginRightMm: 6.35,
            marginBottomMm: 6.35,
            marginLeftMm: 6.35
        },
        definition
    };
};

export const createSaleSummaryLegacyStarterPreset = (): ReportDefinitionPreset => {
    const dataSourceKey = 'billing.salesBook';
    const definition = createEmptyReportDefinition(dataSourceKey);
    definition.defaultFontFamily = '"Courier New", Courier, monospace';

    definition.sections.pageHeader.heightMm = 24;
    definition.sections.pageHeader.items = [
        withImage({
            sourceKind: 'company_logo',
            xMm: 0,
            yMm: 1,
            widthMm: 16,
            heightMm: 16,
            borderWidth: 0,
            fillColor: 'transparent'
        }),
        withText({
            xMm: 20,
            yMm: 1,
            widthMm: 110,
            heightMm: 7,
            fontSizePt: 16,
            fontWeight: 'bold',
            expression: '=companyName()',
            text: ''
        }),
        withText({
            xMm: 20,
            yMm: 9,
            widthMm: 110,
            heightMm: 5,
            fontSizePt: 9,
            expression: '=companyAddress()',
            text: ''
        }),
        withText({
            xMm: 132,
            yMm: 2,
            widthMm: 50,
            heightMm: 7,
            fontSizePt: 14,
            fontWeight: 'bold',
            textAlign: 'right',
            text: 'Sale Summary'
        }),
        withText({
            xMm: 132,
            yMm: 10,
            widthMm: 50,
            heightMm: 5,
            fontSizePt: 8,
            textAlign: 'right',
            expression: '=concat("Rows: ", rowsCount())',
            text: ''
        }),
        withLine({
            xMm: 0,
            yMm: 20,
            widthMm: 182,
            borderWidth: 1
        })
    ];

    definition.sections.reportHeader.heightMm = 10;
    definition.sections.reportHeader.items = [
        withText({
            xMm: 0,
            yMm: 0.5,
            widthMm: 140,
            heightMm: 4,
            fontSizePt: 8,
            textColor: '#475569',
            expression: '=coalesce(subtitle(), "Condensed sales summary with date-wise grouping and core totals.")',
            text: ''
        }),
        withText({
            xMm: 142,
            yMm: 0.5,
            widthMm: 40,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            textColor: '#475569',
            text: 'Condensed'
        })
    ];

    const saleSummaryTable = createReportTableItem([
        'voucherNumber',
        'ledgerName',
        'totalQuantity',
        'totalFreeQuantity',
        'totalGrossAmount',
        'totalTaxAmount',
        'totalNetAmount',
        'paidAmount',
        'dueAmount',
        'statusText'
    ]);
    saleSummaryTable.id = nextPresetId('table');
    saleSummaryTable.xMm = 0;
    saleSummaryTable.yMm = 0;
    saleSummaryTable.widthMm = 182;
    saleSummaryTable.heightMm = 165;
    saleSummaryTable.fontSizePt = 7.5;
    saleSummaryTable.borderColor = '#94a3b8';
    saleSummaryTable.zebraStriping = false;
    saleSummaryTable.showHeader = true;
    saleSummaryTable.showGrandTotal = true;
    saleSummaryTable.columns = [
        { id: nextPresetId('col'), fieldKey: 'voucherNumber', label: 'Inv No', widthMm: 16, align: 'left', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'ledgerName', label: 'Party', widthMm: 58, align: 'left', includeTotal: false },
        { id: nextPresetId('col'), fieldKey: 'totalQuantity', label: 'Qty', widthMm: 12, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'totalFreeQuantity', label: 'Free', widthMm: 12, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'totalGrossAmount', label: 'Gross', widthMm: 18, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'totalTaxAmount', label: 'Tax', widthMm: 14, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'totalNetAmount', label: 'Net', widthMm: 18, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'paidAmount', label: 'Paid', widthMm: 16, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'dueAmount', label: 'Due', widthMm: 16, align: 'right', includeTotal: true },
        { id: nextPresetId('col'), fieldKey: 'statusText', label: 'Status', widthMm: 18, align: 'left', includeTotal: false }
    ];
    saleSummaryTable.sorts = [
        { id: nextPresetId('sort'), fieldKey: 'voucherDateText', direction: 'asc' },
        { id: nextPresetId('sort'), fieldKey: 'voucherNumber', direction: 'asc' }
    ];
    saleSummaryTable.rowGroups = [
        {
            id: nextPresetId('grp'),
            fieldKey: 'voucherDateText',
            label: 'Date',
            sortDirection: 'asc',
            showHeader: true,
            showSubtotal: true,
            subtotalLabel: 'Date Total'
        }
    ];

    definition.sections.body.heightMm = 165;
    definition.sections.body.items = [saleSummaryTable];
    definition.sections.reportFooter.heightMm = 0;
    definition.sections.reportFooter.items = [];
    definition.sections.pageFooter.heightMm = 6;
    definition.sections.pageFooter.items = [
        withText({
            xMm: 132,
            yMm: 0.5,
            widthMm: 50,
            heightMm: 4,
            fontSizePt: 8,
            textAlign: 'right',
            textColor: '#475569',
            expression: '=concat("Page No. : ", pageNumber(), " of ", totalPages())',
            text: ''
        })
    ];

    return {
        key: 'sale-summary-legacy-starter',
        label: 'Sale Summary Legacy Starter',
        description: 'Condensed sales summary layout using grouped rows, core amount columns, and grand total.',
        moduleKey: 'invoice',
        usageKey: 'sale_summary',
        dataSourceKey,
        templateName: 'Sale Summary Legacy Starter',
        templateKey: 'sale-summary-legacy-starter',
        selectedFieldKeys: [
            'voucherDateText',
            'voucherNumber',
            'ledgerName',
            'totalQuantity',
            'totalFreeQuantity',
            'totalGrossAmount',
            'totalTaxAmount',
            'totalNetAmount',
            'paidAmount',
            'dueAmount',
            'statusText'
        ],
        pageSettings: {
            pageSize: 'A4',
            orientation: 'landscape',
            marginTopMm: 6.35,
            marginRightMm: 6.35,
            marginBottomMm: 6.35,
            marginLeftMm: 6.35
        },
        definition
    };
};

export const REPORT_DEFINITION_PRESETS: ReportDefinitionPreset[] = [
    createInvoiceSummaryStarterPreset(),
    createInvoiceDetailStarterPreset(),
    createInvoiceLedgerLegacyStarterPreset(),
    createLoadingSheetLegacyStarterPreset(),
    createSaleBookLegacyStarterPreset(),
    createSaleSummaryLegacyStarterPreset()
];
