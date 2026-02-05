import { apiUrl } from '@/lib/apiBaseUrl';
import { refreshAccessToken } from '@/lib/auth/api';
import { getAccessToken } from '@/lib/auth/storage';

type GraphqlError = {
    message: string;
    extensions?: { code?: string };
};

type GraphqlResponse<T> = {
    data?: T;
    errors?: GraphqlError[];
};

const invoicingGraphqlUrl = apiUrl('/invoicing/graphql');

const requestInvoicingGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    retryOnAuth = true
): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(invoicingGraphqlUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query, variables })
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as GraphqlResponse<T>) : null;
    const errors = json?.errors ?? [];

    if (errors.length) {
        const code = errors[0]?.extensions?.code;
        if (retryOnAuth && code === 'UNAUTHENTICATED') {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return await requestInvoicingGraphql<T>(query, variables, false);
            }
        }
        throw new Error(errors[0]?.message || 'Request failed');
    }

    if (!res.ok || !json?.data) {
        throw new Error(`Request failed (${res.status})`);
    }

    return json.data;
};

export type SaleInvoiceListItem = {
    saleInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    totalNetAmount: number;
};

export type SaleInvoiceLine = {
    saleInvoiceLineId: number;
    lineNumber: number | null;
    itemId: number | null;
    itemFreeId: number | null;
    unitId: number | null;
    unitFreeId: number | null;
    mrp: number | null;
    quantity: number | null;
    freeQuantity: number | null;
    unitPrice: number | null;
    sellingRate: number | null;
    quantityRateAmount: number | null;
    displayAmount: number | null;
    productDiscountRate: number | null;
    productDiscountAmount: number | null;
    cashDiscountRate: number | null;
    cashDiscountAmount: number | null;
    qpsRate: number | null;
    qpsAmount: number | null;
    lineAmount: number | null;
    replacementAmount: number | null;
    taxableAmount: number | null;
    taxRate: number | null;
    taxAmount: number | null;
    taxLedgerId: number | null;
    taxableAmount2: number | null;
    taxRate2: number | null;
    taxAmount2: number | null;
    taxLedger2Id: number | null;
    taxableAmount3: number | null;
    taxRate3: number | null;
    taxAmount3: number | null;
    taxLedger3Id: number | null;
    finalAmount: number | null;
    remarks: string | null;
    minQuantity: number | null;
    minFreeQuantity: number | null;
    isManualProductDiscount: boolean | null;
    isManualCashDiscount: boolean | null;
    isManualQpsDiscount: boolean | null;
    tmpTypeId: number | null;
    estimateLineId: number | null;
};

export type SaleInvoiceTaxLine = {
    saleInvoiceTaxLineId: number;
    ledgerId: number | null;
    addAmount: number | null;
    lessAmount: number | null;
    taxableAmount: number | null;
};

export type SaleInvoiceAdditionalTaxation = {
    saleInvoiceAdditionalTaxationId: number;
    ledgerId: number | null;
    addAmount: number | null;
    taxableAmount: number | null;
};

export type SaleInvoiceReplacementLine = {
    saleInvoiceReplacementLineId: number;
    itemId: number | null;
    itemName: string | null;
    mrp: number | null;
    quantity: number | null;
    rate: number | null;
    amount: number | null;
};

export type SaleInvoiceTypeDetail = {
    saleInvoiceTypeDetailId: number;
    itemId: number | null;
    typeDetailId: number | null;
    quantity: number | null;
    tmpTypeId: number | null;
};

export type SaleInvoiceCreditNote = {
    saleInvoiceCreditNoteId: number;
    voucherId: number | null;
    saleReturnId: number | null;
};

export type SaleInvoiceDebitNote = {
    saleInvoiceDebitNoteId: number;
    voucherId: number | null;
};

export type SaleInvoice = {
    saleInvoiceId: number;
    voucherNumber: string | null;
    voucherNumberPrefix: string | null;
    voucherDateText: string | null;
    estimateId: number | null;
    ledgerId: number | null;
    ledgerName: string | null;
    ledgerGroupId: number | null;
    ledgerGroupName: string | null;
    otherLedgerId: number | null;
    itemBrandId: number | null;
    remarks: string | null;
    billNumber: string | null;
    isVatIncluded: boolean;
    isOtherState: boolean;
    hasScheme: boolean;
    isChecked: boolean;
    isDisputed: boolean;
    totalProductDiscountAmount: number;
    totalDisplayAmount: number;
    totalCashDiscountAmount: number;
    totalReplacementAmount: number;
    totalGrossAmount: number;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    totalLessSpecialAmount: number;
    totalQpsDiscountAmount: number;
    totalQuantity: number;
    totalFreeQuantity: number;
    totalQuantityRateAmount: number;
    totalFinalAmount: number;
    roundOffAmount: number;
    totalAdditionalTaxAmount: number;
    bizomInvoiceNumber: string | null;
    g1BillNumber: string | null;
    g1IsSchemeMatched: boolean;
    g1IsAmountMatched: boolean;
    g1Remark: string | null;
    isCancelled: boolean;
    lines: SaleInvoiceLine[];
    taxLines: SaleInvoiceTaxLine[];
    additionalTaxations: SaleInvoiceAdditionalTaxation[];
    replacementLines: SaleInvoiceReplacementLine[];
    typeDetails: SaleInvoiceTypeDetail[];
    creditNotes: SaleInvoiceCreditNote[];
    debitNotes: SaleInvoiceDebitNote[];
};

export type SaleInvoiceLineInput = {
    lineNumber?: number | null;
    itemId?: number | null;
    itemFreeId?: number | null;
    unitId?: number | null;
    unitFreeId?: number | null;
    mrp?: number | null;
    quantity?: number | null;
    freeQuantity?: number | null;
    unitPrice?: number | null;
    sellingRate?: number | null;
    quantityRateAmount?: number | null;
    displayAmount?: number | null;
    productDiscountRate?: number | null;
    productDiscountAmount?: number | null;
    cashDiscountRate?: number | null;
    cashDiscountAmount?: number | null;
    qpsRate?: number | null;
    qpsAmount?: number | null;
    lineAmount?: number | null;
    replacementAmount?: number | null;
    finalAmount?: number | null;
    taxLedgerId?: number | null;
    taxRate?: number | null;
    taxAmount?: number | null;
    taxableAmount?: number | null;
    taxLedger2Id?: number | null;
    taxRate2?: number | null;
    taxAmount2?: number | null;
    taxableAmount2?: number | null;
    taxLedger3Id?: number | null;
    taxRate3?: number | null;
    taxAmount3?: number | null;
    taxableAmount3?: number | null;
    minQuantity?: number | null;
    minFreeQuantity?: number | null;
    isManualProductDiscount?: boolean | null;
    isManualCashDiscount?: boolean | null;
    isManualQpsDiscount?: boolean | null;
    tmpTypeId?: number | null;
    estimateLineId?: number | null;
    remarks?: string | null;
};

export type SaleInvoiceTaxLineInput = {
    ledgerId?: number | null;
    addAmount?: number | null;
    lessAmount?: number | null;
    taxableAmount?: number | null;
};

export type SaleInvoiceAdditionalTaxationInput = {
    ledgerId?: number | null;
    addAmount?: number | null;
    taxableAmount?: number | null;
};

export type SaleInvoiceReplacementLineInput = {
    itemId?: number | null;
    itemName?: string | null;
    mrp?: number | null;
    quantity?: number | null;
    rate?: number | null;
    amount?: number | null;
};

export type SaleInvoiceTypeDetailInput = {
    itemId?: number | null;
    typeDetailId?: number | null;
    quantity?: number | null;
    tmpTypeId?: number | null;
};

export type SaleInvoiceCreditNoteInput = {
    voucherId?: number | null;
    saleReturnId?: number | null;
};

export type SaleInvoiceDebitNoteInput = {
    voucherId?: number | null;
};

export type CreateSaleInvoiceInput = {
    voucherDateText: string;
    voucherNumber?: string | null;
    voucherNumberPrefix?: string | null;
    voucherTypeId?: number | null;
    ledgerId?: number | null;
    ledgerName?: string | null;
    ledgerGroupId?: number | null;
    otherLedgerId?: number | null;
    itemBrandId?: number | null;
    estimateId?: number | null;
    billNumber?: string | null;
    remarks?: string | null;
    isVatIncluded?: boolean | null;
    isOtherState?: boolean | null;
    hasScheme?: boolean | null;
    isChecked?: boolean | null;
    isDisputed?: boolean | null;
    totalProductDiscountAmount?: number | null;
    totalDisplayAmount?: number | null;
    totalCashDiscountAmount?: number | null;
    totalReplacementAmount?: number | null;
    totalGrossAmount?: number | null;
    totalTaxAmount?: number | null;
    totalNetAmount?: number | null;
    totalLessSpecialAmount?: number | null;
    totalQpsDiscountAmount?: number | null;
    totalQuantity?: number | null;
    totalFreeQuantity?: number | null;
    totalQuantityRateAmount?: number | null;
    totalAmount?: number | null;
    totalFinalAmount?: number | null;
    roundOffAmount?: number | null;
    totalAdditionalTaxAmount?: number | null;
    bizomInvoiceNumber?: string | null;
    g1BillNumber?: string | null;
    g1IsSchemeMatched?: boolean | null;
    g1IsAmountMatched?: boolean | null;
    g1Remark?: string | null;
    createdByUserId?: number | null;
    lines: SaleInvoiceLineInput[];
    taxLines?: SaleInvoiceTaxLineInput[] | null;
    additionalTaxations?: SaleInvoiceAdditionalTaxationInput[] | null;
    replacementLines?: SaleInvoiceReplacementLineInput[] | null;
    typeDetails?: SaleInvoiceTypeDetailInput[] | null;
    creditNotes?: SaleInvoiceCreditNoteInput[] | null;
    debitNotes?: SaleInvoiceDebitNoteInput[] | null;
};

export type CreateSaleInvoicesBatchInput = {
    invoices: CreateSaleInvoiceInput[];
};

export type SalesBookRow = {
    saleInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    estimateId: number | null;
    ledgerId: number | null;
    ledgerName: string | null;
    ledgerGroupId: number | null;
    otherLedgerId: number | null;
    remarks: string | null;
    billNumber: string | null;
    isVatIncluded: boolean;
    hasScheme: boolean;
    isChecked: boolean;
    deliveryStatus: string | null;
    totalProductDiscountAmount: number;
    totalDisplayAmount: number;
    totalCashDiscountAmount: number;
    totalReplacementAmount: number;
    totalLessSpecialAmount: number;
    totalGrossAmount: number;
    totalQpsDiscountAmount: number;
    totalFinalAmount: number;
    totalQuantity: number;
    totalFreeQuantity: number;
    totalQuantityRateAmount: number;
    totalAdditionalTaxAmount: number;
    totalAmount: number;
    totalTaxAmount: number;
    roundOffAmount: number;
    totalNetAmount: number;
    gridTaxAmount: number;
    diffTaxAmount: number;
    gridFinalAmount: number;
    diffFinalAmount: number;
    cashReceiptAmount: number;
    bankReceiptAmount: number;
    paidAmount: number;
    returnAmount: number;
    dueAmount: number;
    cashReceiptIds: string | null;
    bankReceiptIds: string | null;
    cashReceiptNumbers: string | null;
    bankReceiptNumbers: string | null;
    creditNoteAmount: number;
    voucherBillAmount: number;
    isCancelled: boolean;
};

export type SalesBookPage = {
    items: SalesBookRow[];
    totalCount: number;
    totalProductDiscountAmount: number;
    totalDisplayAmount: number;
    totalCashDiscountAmount: number;
    totalReplacementAmount: number;
    totalLessSpecialAmount: number;
    totalGrossAmount: number;
    totalQpsDiscountAmount: number;
    totalFinalAmount: number;
    totalQuantity: number;
    totalFreeQuantity: number;
    totalQuantityRateAmount: number;
    totalAdditionalTaxAmount: number;
    totalAmount: number;
    totalTaxAmount: number;
    roundOffTotal: number;
    totalNetAmount: number;
};

export type PurchaseBookRow = {
    purchaseInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    remarks: string | null;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    gridTaxAmount: number;
    diffTaxAmount: number;
    gridLineAmount: number;
    diffLineAmount: number;
    isCancelled: boolean;
};

export type PurchaseBookPage = {
    items: PurchaseBookRow[];
    totalCount: number;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
};

export type SalesReturnBookRow = {
    saleReturnId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    remarks: string | null;
    totalAmount: number;
    totalTaxAmount: number;
    roundOffAmount: number;
    totalNetAmount: number;
    referenceAmount: number;
    referenceInvoiceIds: string | null;
    isCancelled: boolean;
};

export type SalesReturnBookPage = {
    items: SalesReturnBookRow[];
    totalCount: number;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    roundOffTotal: number;
};

export type PurchaseReturnBookRow = {
    purchaseReturnId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    remarks: string | null;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    isCancelled: boolean;
};

export type PurchaseReturnBookPage = {
    items: PurchaseReturnBookRow[];
    totalCount: number;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
};

export type PurchaseInvoiceListItem = {
    purchaseInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    totalNetAmount: number;
};

export type PurchaseInvoiceLine = {
    purchaseInvoiceLineId: number;
    lineNumber: number | null;
    quantity: number | null;
    unitPrice: number | null;
    lineAmount: number | null;
    taxableAmount: number | null;
    taxRate: number | null;
    taxAmount: number | null;
    remarks: string | null;
};

export type PurchaseInvoice = {
    purchaseInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    remarks: string | null;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    isCancelled: boolean;
    lines: PurchaseInvoiceLine[];
};

export type AgencyDashboardSummaryRow = {
    periodKey: string;
    totalCount: number;
    totalAmount: number;
};

export type AgencyDashboardDeliveryRow = {
    periodKey: string;
    totalInProcess: number;
    totalPending: number;
};

export type AgencyDashboardSummary = {
    asOfDate: string | null;
    dueInvoices: AgencyDashboardSummaryRow[];
    dueEstimates: AgencyDashboardSummaryRow[];
    deliveryMonthWise: AgencyDashboardDeliveryRow[];
    deliveryDayWise: AgencyDashboardDeliveryRow[];
};

export type CompanyContext = {
    companyName: string | null;
    companyAlias: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    postalCode: string | null;
    companyFiscalYearId: number | null;
    fiscalYearStart: string | null;
    fiscalYearEnd: string | null;
};

export type CompanyFiscalYear = {
    companyFiscalYearId: number;
    financialYearStart: string | null;
    financialYearEnd: string | null;
    isCurrentFlag: number | null;
};

export const fetchCompanyContext = async () => {
    const data = await requestInvoicingGraphql<{ companyContext: CompanyContext }>(
        `query CompanyContext {
            companyContext {
                companyName
                companyAlias
                addressLine1
                addressLine2
                addressLine3
                postalCode
                companyFiscalYearId
                fiscalYearStart
                fiscalYearEnd
            }
        }`
    );
    return data.companyContext;
};

export const fetchCompanyFiscalYears = async () => {
    const data = await requestInvoicingGraphql<{ companyFiscalYears: CompanyFiscalYear[] }>(
        `query CompanyFiscalYears {
            companyFiscalYears {
                companyFiscalYearId
                financialYearStart
                financialYearEnd
                isCurrentFlag
            }
        }`
    );
    return data.companyFiscalYears;
};

export const updateCompanyProfile = async (input: {
    companyFiscalYearId?: number | null;
    companyName?: string | null;
    companyAlias?: string | null;
    fiscalYearStart?: string | null;
    fiscalYearEnd?: string | null;
}) => {
    const data = await requestInvoicingGraphql<{ updateCompanyProfile: CompanyContext }>(
        `mutation UpdateCompanyProfile($input: CompanyProfileInput!) {
            updateCompanyProfile(input: $input) {
                companyName
                companyAlias
                addressLine1
                addressLine2
                addressLine3
                postalCode
                companyFiscalYearId
                fiscalYearStart
                fiscalYearEnd
            }
        }`,
        { input }
    );
    return data.updateCompanyProfile;
};

export type AgencyOptions = {
    dbBackupPath: string | null;
    discountLedgerId: number | null;
    chequeCancelLedgerId: number | null;
    roundOffLedgerId: number | null;
    isFormWiseRights: boolean;
    isVoucherDateLowerAllow: boolean;
    isManualInvoiceNumber: boolean;
    defaultExpenditureLedgerId: number | null;
    defaultStockLedgerId: number | null;
    agencyCustomerId: string | null;
    defaultTransportImportColumnSno: string | null;
    defaultSaleInvoiceImportColumnSno: string | null;
    transportUnitId: number | null;
    reportFolderPath: string | null;
    isReportSetting: boolean;
    einvoiceAckColumns1: string | null;
    einvoiceAckColumns2: string | null;
    einvoiceCancelAckColumns: string | null;
    isInvoiceLock: boolean;
    isShowRemark: boolean;
};

export const fetchAgencyOptions = async () => {
    const data = await requestInvoicingGraphql<{ agencyOptions: AgencyOptions }>(
        `query AgencyOptions {
            agencyOptions {
                dbBackupPath
                discountLedgerId
                chequeCancelLedgerId
                roundOffLedgerId
                isFormWiseRights
                isVoucherDateLowerAllow
                isManualInvoiceNumber
                defaultExpenditureLedgerId
                defaultStockLedgerId
                agencyCustomerId
                defaultTransportImportColumnSno
                defaultSaleInvoiceImportColumnSno
                transportUnitId
                reportFolderPath
                isReportSetting
                einvoiceAckColumns1
                einvoiceAckColumns2
                einvoiceCancelAckColumns
                isInvoiceLock
                isShowRemark
            }
        }`
    );
    return data.agencyOptions;
};

export const updateAgencyOptions = async (input: {
    dbBackupPath?: string | null;
    discountLedgerId?: number | null;
    chequeCancelLedgerId?: number | null;
    roundOffLedgerId?: number | null;
    isFormWiseRights?: boolean;
    isVoucherDateLowerAllow?: boolean;
    isManualInvoiceNumber?: boolean;
    defaultExpenditureLedgerId?: number | null;
    defaultStockLedgerId?: number | null;
    agencyCustomerId?: string | null;
    defaultTransportImportColumnSno?: string | null;
    defaultSaleInvoiceImportColumnSno?: string | null;
    transportUnitId?: number | null;
    reportFolderPath?: string | null;
    isReportSetting?: boolean;
    einvoiceAckColumns1?: string | null;
    einvoiceAckColumns2?: string | null;
    einvoiceCancelAckColumns?: string | null;
    isInvoiceLock?: boolean;
    isShowRemark?: boolean;
}) => {
    const data = await requestInvoicingGraphql<{ updateAgencyOptions: AgencyOptions }>(
        `mutation UpdateAgencyOptions($input: AgencyOptionsInput!) {
            updateAgencyOptions(input: $input) {
                dbBackupPath
                discountLedgerId
                chequeCancelLedgerId
                roundOffLedgerId
                isFormWiseRights
                isVoucherDateLowerAllow
                isManualInvoiceNumber
                defaultExpenditureLedgerId
                defaultStockLedgerId
                agencyCustomerId
                defaultTransportImportColumnSno
                defaultSaleInvoiceImportColumnSno
                transportUnitId
                reportFolderPath
                isReportSetting
                einvoiceAckColumns1
                einvoiceAckColumns2
                einvoiceCancelAckColumns
                isInvoiceLock
                isShowRemark
            }
        }`,
        { input }
    );
    return data.updateAgencyOptions;
};

export const fetchAgencyDashboardSummary = async (input?: {
    fromDate?: string | null;
    toDate?: string | null;
    companyFiscalYearId?: number | null;
}) => {
    const data = await requestInvoicingGraphql<{ agencyDashboardSummary: AgencyDashboardSummary }>(
        `query AgencyDashboardSummary($fromDate: String, $toDate: String, $companyFiscalYearId: Int) {
            agencyDashboardSummary(fromDate: $fromDate, toDate: $toDate, companyFiscalYearId: $companyFiscalYearId) {
                asOfDate
                dueInvoices { periodKey totalCount totalAmount }
                dueEstimates { periodKey totalCount totalAmount }
                deliveryMonthWise { periodKey totalInProcess totalPending }
                deliveryDayWise { periodKey totalInProcess totalPending }
            }
        }`,
        input ?? undefined
    );
    return data.agencyDashboardSummary;
};

export const listSaleInvoices = async () => {
    const data = await requestInvoicingGraphql<{ saleInvoices: { items: SaleInvoiceListItem[] } }>(
        `query SaleInvoices {
            saleInvoices {
                items {
                    saleInvoiceId
                    voucherNumber
                    voucherDateText
                    ledgerId
                    ledgerName
                    totalNetAmount
                }
            }
        }`
    );
    return data.saleInvoices;
};

export const fetchSalesBook = async (input: {
    fromDate?: string | null;
    toDate?: string | null;
    ledgerId?: number | null;
    cancelled?: number | null;
    limit?: number | null;
    offset?: number | null;
}) => {
    const data = await requestInvoicingGraphql<{ salesBook: SalesBookPage }>(
        `query SalesBook($fromDate: String, $toDate: String, $ledgerId: Int, $cancelled: Int, $limit: Int, $offset: Int) {
            salesBook(fromDate: $fromDate, toDate: $toDate, ledgerId: $ledgerId, cancelled: $cancelled, limit: $limit, offset: $offset) {
                items {
                    saleInvoiceId
                    voucherNumber
                    voucherDateText
                    estimateId
                    ledgerId
                    ledgerName
                    ledgerGroupId
                    ledgerGroupName
                    otherLedgerId
                    remarks
                    billNumber
                    isVatIncluded
                    hasScheme
                    isChecked
                    deliveryStatus
                    totalProductDiscountAmount
                    totalDisplayAmount
                    totalCashDiscountAmount
                    totalReplacementAmount
                    totalLessSpecialAmount
                    totalGrossAmount
                    totalQpsDiscountAmount
                    totalFinalAmount
                    totalQuantity
                    totalFreeQuantity
                    totalQuantityRateAmount
                    totalAdditionalTaxAmount
                    totalAmount
                    totalTaxAmount
                    roundOffAmount
                    totalNetAmount
                    gridTaxAmount
                    diffTaxAmount
                    gridFinalAmount
                    diffFinalAmount
                    cashReceiptAmount
                    bankReceiptAmount
                    paidAmount
                    returnAmount
                    dueAmount
                    cashReceiptIds
                    bankReceiptIds
                    cashReceiptNumbers
                    bankReceiptNumbers
                    creditNoteAmount
                    voucherBillAmount
                    isCancelled
                }
                totalCount
                totalProductDiscountAmount
                totalDisplayAmount
                totalCashDiscountAmount
                totalReplacementAmount
                totalLessSpecialAmount
                totalGrossAmount
                totalQpsDiscountAmount
                totalFinalAmount
                totalQuantity
                totalFreeQuantity
                totalQuantityRateAmount
                totalAdditionalTaxAmount
                totalAmount
                totalTaxAmount
                roundOffTotal
                totalNetAmount
            }
        }`,
        input ?? undefined
    );
    return data.salesBook;
};

export const fetchPurchaseBook = async (input: {
    fromDate?: string | null;
    toDate?: string | null;
    ledgerId?: number | null;
    cancelled?: number | null;
    limit?: number | null;
    offset?: number | null;
}) => {
    const data = await requestInvoicingGraphql<{ purchaseBook: PurchaseBookPage }>(
        `query PurchaseBook($fromDate: String, $toDate: String, $ledgerId: Int, $cancelled: Int, $limit: Int, $offset: Int) {
            purchaseBook(fromDate: $fromDate, toDate: $toDate, ledgerId: $ledgerId, cancelled: $cancelled, limit: $limit, offset: $offset) {
                items {
                    purchaseInvoiceId
                    voucherNumber
                    voucherDateText
                    ledgerId
                    ledgerName
                    remarks
                    totalAmount
                    totalTaxAmount
                    totalNetAmount
                    gridTaxAmount
                    diffTaxAmount
                    gridLineAmount
                    diffLineAmount
                    isCancelled
                }
                totalCount
                totalAmount
                totalTaxAmount
                totalNetAmount
            }
        }`,
        input ?? undefined
    );
    return data.purchaseBook;
};

export const fetchSalesReturnBook = async (input: {
    fromDate?: string | null;
    toDate?: string | null;
    ledgerId?: number | null;
    cancelled?: number | null;
    limit?: number | null;
    offset?: number | null;
}) => {
    const data = await requestInvoicingGraphql<{ salesReturnBook: SalesReturnBookPage }>(
        `query SalesReturnBook($fromDate: String, $toDate: String, $ledgerId: Int, $cancelled: Int, $limit: Int, $offset: Int) {
            salesReturnBook(fromDate: $fromDate, toDate: $toDate, ledgerId: $ledgerId, cancelled: $cancelled, limit: $limit, offset: $offset) {
                items {
                    saleReturnId
                    voucherNumber
                    voucherDateText
                    ledgerId
                    ledgerName
                    remarks
                    totalAmount
                    totalTaxAmount
                    roundOffAmount
                    totalNetAmount
                    referenceAmount
                    referenceInvoiceIds
                    isCancelled
                }
                totalCount
                totalAmount
                totalTaxAmount
                totalNetAmount
                roundOffTotal
            }
        }`,
        input ?? undefined
    );
    return data.salesReturnBook;
};

export const fetchPurchaseReturnBook = async (input: {
    fromDate?: string | null;
    toDate?: string | null;
    ledgerId?: number | null;
    cancelled?: number | null;
    limit?: number | null;
    offset?: number | null;
}) => {
    const data = await requestInvoicingGraphql<{ purchaseReturnBook: PurchaseReturnBookPage }>(
        `query PurchaseReturnBook($fromDate: String, $toDate: String, $ledgerId: Int, $cancelled: Int, $limit: Int, $offset: Int) {
            purchaseReturnBook(fromDate: $fromDate, toDate: $toDate, ledgerId: $ledgerId, cancelled: $cancelled, limit: $limit, offset: $offset) {
                items {
                    purchaseReturnId
                    voucherNumber
                    voucherDateText
                    ledgerId
                    ledgerName
                    remarks
                    totalAmount
                    totalTaxAmount
                    totalNetAmount
                    isCancelled
                }
                totalCount
                totalAmount
                totalTaxAmount
                totalNetAmount
            }
        }`,
        input ?? undefined
    );
    return data.purchaseReturnBook;
};

export const getSaleInvoice = async (saleInvoiceId: number) => {
    const data = await requestInvoicingGraphql<{ saleInvoice: { invoice: SaleInvoice } }>(
        `query SaleInvoice($saleInvoiceId: Int!) {
            saleInvoice(saleInvoiceId: $saleInvoiceId) {
                invoice {
                    saleInvoiceId
                    voucherNumber
                    voucherNumberPrefix
                    voucherDateText
                    estimateId
                    ledgerId
                    ledgerName
                    ledgerGroupId
                    otherLedgerId
                    itemBrandId
                    remarks
                    billNumber
                    isVatIncluded
                    isOtherState
                    hasScheme
                    isChecked
                    isDisputed
                    totalProductDiscountAmount
                    totalDisplayAmount
                    totalCashDiscountAmount
                    totalReplacementAmount
                    totalGrossAmount
                    totalAmount
                    totalTaxAmount
                    totalNetAmount
                    totalLessSpecialAmount
                    totalQpsDiscountAmount
                    totalQuantity
                    totalFreeQuantity
                    totalQuantityRateAmount
                    totalFinalAmount
                    roundOffAmount
                    totalAdditionalTaxAmount
                    bizomInvoiceNumber
                    g1BillNumber
                    g1IsSchemeMatched
                    g1IsAmountMatched
                    g1Remark
                    isCancelled
                    lines {
                        saleInvoiceLineId
                        lineNumber
                        itemId
                        itemFreeId
                        unitId
                        unitFreeId
                        mrp
                        quantity
                        freeQuantity
                        unitPrice
                        sellingRate
                        quantityRateAmount
                        displayAmount
                        productDiscountRate
                        productDiscountAmount
                        cashDiscountRate
                        cashDiscountAmount
                        qpsRate
                        qpsAmount
                        lineAmount
                        replacementAmount
                        taxableAmount
                        taxRate
                        taxAmount
                        taxLedgerId
                        taxableAmount2
                        taxRate2
                        taxAmount2
                        taxLedger2Id
                        taxableAmount3
                        taxRate3
                        taxAmount3
                        taxLedger3Id
                        finalAmount
                        remarks
                        minQuantity
                        minFreeQuantity
                        isManualProductDiscount
                        isManualCashDiscount
                        isManualQpsDiscount
                        tmpTypeId
                        estimateLineId
                    }
                    taxLines {
                        saleInvoiceTaxLineId
                        ledgerId
                        addAmount
                        lessAmount
                        taxableAmount
                    }
                    additionalTaxations {
                        saleInvoiceAdditionalTaxationId
                        ledgerId
                        addAmount
                        taxableAmount
                    }
                    replacementLines {
                        saleInvoiceReplacementLineId
                        itemId
                        itemName
                        mrp
                        quantity
                        rate
                        amount
                    }
                    typeDetails {
                        saleInvoiceTypeDetailId
                        itemId
                        typeDetailId
                        quantity
                        tmpTypeId
                    }
                    creditNotes {
                        saleInvoiceCreditNoteId
                        voucherId
                        saleReturnId
                    }
                    debitNotes {
                        saleInvoiceDebitNoteId
                        voucherId
                    }
                }
            }
        }`,
        { saleInvoiceId }
    );
    return data.saleInvoice;
};

export const createSaleInvoice = async (input: CreateSaleInvoiceInput) => {
    const data = await requestInvoicingGraphql<{ createSaleInvoice: { saleInvoiceId: number } }>(
        `mutation CreateSaleInvoice($input: CreateSaleInvoiceInput!) {
            createSaleInvoice(input: $input) { saleInvoiceId }
        }`,
        { input }
    );
    return data.createSaleInvoice;
};

export const createSaleInvoicesBatch = async (input: CreateSaleInvoicesBatchInput) => {
    const data = await requestInvoicingGraphql<{ createSaleInvoicesBatch: { saleInvoiceIds: number[] } }>(
        `mutation CreateSaleInvoicesBatch($input: CreateSaleInvoicesBatchInput!) {
            createSaleInvoicesBatch(input: $input) { saleInvoiceIds }
        }`,
        { input }
    );
    return data.createSaleInvoicesBatch;
};

export const listPurchaseInvoices = async () => {
    const data = await requestInvoicingGraphql<{ purchaseInvoices: { items: PurchaseInvoiceListItem[] } }>(
        `query PurchaseInvoices {
            purchaseInvoices {
                items {
                    purchaseInvoiceId
                    voucherNumber
                    voucherDateText
                    ledgerId
                    totalNetAmount
                }
            }
        }`
    );
    return data.purchaseInvoices;
};

export const getPurchaseInvoice = async (purchaseInvoiceId: number) => {
    const data = await requestInvoicingGraphql<{ purchaseInvoice: { invoice: PurchaseInvoice } }>(
        `query PurchaseInvoice($purchaseInvoiceId: Int!) {
            purchaseInvoice(purchaseInvoiceId: $purchaseInvoiceId) {
                invoice {
                    purchaseInvoiceId
                    voucherNumber
                    voucherDateText
                    ledgerId
                    remarks
                    totalAmount
                    totalTaxAmount
                    totalNetAmount
                    isCancelled
                    lines {
                        purchaseInvoiceLineId
                        lineNumber
                        quantity
                        unitPrice
                        lineAmount
                        taxableAmount
                        taxRate
                        taxAmount
                        remarks
                    }
                }
            }
        }`,
        { purchaseInvoiceId }
    );
    return data.purchaseInvoice;
};

export const createPurchaseInvoice = async (input: {
    voucherDateText: string;
    voucherNumber?: string | null;
    ledgerId: number;
    remarks?: string | null;
    lines: { quantity: number; unitPrice: number; taxRate?: number | null; remarks?: string | null }[];
}) => {
    const data = await requestInvoicingGraphql<{ createPurchaseInvoice: { purchaseInvoiceId: number } }>(
        `mutation CreatePurchaseInvoice($input: CreatePurchaseInvoiceInput!) {
            createPurchaseInvoice(input: $input) { purchaseInvoiceId }
        }`,
        { input }
    );
    return data.createPurchaseInvoice;
};
