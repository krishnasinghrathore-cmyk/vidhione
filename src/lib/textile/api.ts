import { apiUrl } from '@/lib/apiBaseUrl';
import { refreshAccessToken } from '@/lib/auth/api';
import { getAccessToken } from '@/lib/auth/storage';

export type TextileDocumentType =
    | 'purchase_order'
    | 'fabric_inward'
    | 'packing_slip'
    | 'delivery_challan'
    | 'textile_invoice'
    | 'job_work_issue'
    | 'daily_outward'
    | 'greige_purchase'
    | 'process_transfer'
    | 'daily_process'
    | 'daily_production'
    | 'bleach_register'
    | 'design_collection'
    | 'design_challan'
    | 'color_costing';

export type TextileStockEffect = 'none' | 'in' | 'out';

export type TextileDocumentLine = {
    textileDocumentLineId: string;
    textileDocumentId: string;
    lineNumber: number;
    productId: string | null;
    unitId: string | null;
    designId: string | null;
    designName: string | null;
    receiptNo: string | null;
    baleNo: string | null;
    lotNo: string | null;
    comboNo: string | null;
    rollNo: string | null;
    lineReferenceNumber: string | null;
    lineJobberLedgerId: string | null;
    sourceTextileDocumentId: string | null;
    sourceTextileDocumentLineId: string | null;
    linkedSaleInvoiceLineId: string | null;
    linkedInhouseProcessId: string | null;
    linkedInhouseProductionId: string | null;
    pieces: number;
    quantity: number;
    rate: number;
    fabricRate: number;
    shrinkagePercent: number;
    amount: number;
    remarks: string | null;
    metaJson: string | null;
    createdAt: string | null;
};

export type TextileDocument = {
    textileDocumentId: string;
    documentType: TextileDocumentType;
    documentNumber: string;
    documentDate: string;
    stockEffect: TextileStockEffect;
    partyLedgerId: string | null;
    brokerLedgerId: string | null;
    jobberLedgerId: string | null;
    transporterId: string | null;
    godownId: string | null;
    linkedPurchaseOrderId: string | null;
    linkedFabricInwardId: string | null;
    linkedPackingSlipId: string | null;
    linkedDeliveryChallanId: string | null;
    linkedSaleInvoiceId: string | null;
    linkedJobWorkIssueId: string | null;
    linkedDailyOutwardId: string | null;
    linkedInhouseProcessId: string | null;
    linkedInhouseProductionId: string | null;
    referenceNumber: string | null;
    jobberChallanNo: string | null;
    jobberChallanDate: string | null;
    remarkForStatement: string | null;
    remarks: string | null;
    capabilityTagsJson: string | null;
    metaJson: string | null;
    totalPieces: number;
    totalQuantity: number;
    totalAmount: number;
    isCancelled: boolean;
    createdAt: string | null;
    updatedAt: string | null;
    lines: TextileDocumentLine[];
};

export type TextileDocumentListItem = Omit<TextileDocument, 'lines'> & { lineCount: number };

export type TextileStatementRow = {
    textileDocumentId: string;
    textileDocumentLineId: string;
    documentType: TextileDocumentType;
    documentNumber: string;
    documentDate: string;
    stockEffect: TextileStockEffect;
    partyLedgerId: string | null;
    jobberLedgerId: string | null;
    lineJobberLedgerId: string | null;
    productId: string | null;
    unitId: string | null;
    designId: string | null;
    designName: string | null;
    receiptNo: string | null;
    baleNo: string | null;
    lotNo: string | null;
    comboNo: string | null;
    rollNo: string | null;
    lineReferenceNumber: string | null;
    piecesIn: number;
    piecesOut: number;
    quantityIn: number;
    quantityOut: number;
    signedPieces: number;
    signedQuantity: number;
    signedAmount: number;
    runningPiecesBalance: number;
    runningQuantityBalance: number;
    runningAmountBalance: number;
};

export type TextileStockRow = {
    partyLedgerId: string | null;
    jobberLedgerId: string | null;
    lineJobberLedgerId: string | null;
    productId: string | null;
    unitId: string | null;
    designId: string | null;
    designName: string | null;
    receiptNo: string | null;
    baleNo: string | null;
    lotNo: string | null;
    comboNo: string | null;
    rollNo: string | null;
    balancePieces: number;
    balanceQuantity: number;
    balanceAmount: number;
    lastDocumentDate: string | null;
};

export type TextileDocumentLineInput = {
    lineNumber?: number | null;
    productId?: string | null;
    unitId?: string | null;
    designId?: string | null;
    designName?: string | null;
    receiptNo?: string | null;
    baleNo?: string | null;
    lotNo?: string | null;
    comboNo?: string | null;
    rollNo?: string | null;
    lineReferenceNumber?: string | null;
    lineJobberLedgerId?: string | null;
    sourceTextileDocumentId?: string | null;
    sourceTextileDocumentLineId?: string | null;
    linkedSaleInvoiceLineId?: string | null;
    linkedInhouseProcessId?: string | null;
    linkedInhouseProductionId?: string | null;
    pieces?: number | null;
    quantity?: number | null;
    rate?: number | null;
    fabricRate?: number | null;
    shrinkagePercent?: number | null;
    amount?: number | null;
    remarks?: string | null;
    metaJson?: string | null;
};

export type TextileDocumentInput = {
    textileDocumentId?: string | null;
    documentType: TextileDocumentType;
    documentNumber: string;
    documentDate: string;
    stockEffect?: TextileStockEffect | null;
    partyLedgerId?: string | null;
    brokerLedgerId?: string | null;
    jobberLedgerId?: string | null;
    transporterId?: string | null;
    godownId?: string | null;
    linkedPurchaseOrderId?: string | null;
    linkedFabricInwardId?: string | null;
    linkedPackingSlipId?: string | null;
    linkedDeliveryChallanId?: string | null;
    linkedSaleInvoiceId?: string | null;
    linkedJobWorkIssueId?: string | null;
    linkedDailyOutwardId?: string | null;
    linkedInhouseProcessId?: string | null;
    linkedInhouseProductionId?: string | null;
    referenceNumber?: string | null;
    jobberChallanNo?: string | null;
    jobberChallanDate?: string | null;
    remarkForStatement?: string | null;
    remarks?: string | null;
    capabilityTagsJson?: string | null;
    metaJson?: string | null;
    lines?: TextileDocumentLineInput[] | null;
};

export const toTextileDocumentInput = (
    document: TextileDocument,
    overrides?: Partial<TextileDocumentInput>
): TextileDocumentInput => ({
    textileDocumentId: document.textileDocumentId,
    documentType: document.documentType,
    documentNumber: document.documentNumber,
    documentDate: document.documentDate,
    stockEffect: document.stockEffect,
    partyLedgerId: document.partyLedgerId,
    brokerLedgerId: document.brokerLedgerId,
    jobberLedgerId: document.jobberLedgerId,
    transporterId: document.transporterId,
    godownId: document.godownId,
    linkedPurchaseOrderId: document.linkedPurchaseOrderId,
    linkedFabricInwardId: document.linkedFabricInwardId,
    linkedPackingSlipId: document.linkedPackingSlipId,
    linkedDeliveryChallanId: document.linkedDeliveryChallanId,
    linkedSaleInvoiceId: document.linkedSaleInvoiceId,
    linkedJobWorkIssueId: document.linkedJobWorkIssueId,
    linkedDailyOutwardId: document.linkedDailyOutwardId,
    linkedInhouseProcessId: document.linkedInhouseProcessId,
    linkedInhouseProductionId: document.linkedInhouseProductionId,
    referenceNumber: document.referenceNumber,
    jobberChallanNo: document.jobberChallanNo,
    jobberChallanDate: document.jobberChallanDate,
    remarkForStatement: document.remarkForStatement,
    remarks: document.remarks,
    capabilityTagsJson: document.capabilityTagsJson,
    metaJson: document.metaJson,
    lines: (document.lines ?? []).map((line) => ({
        lineNumber: line.lineNumber,
        productId: line.productId,
        unitId: line.unitId,
        designId: line.designId,
        designName: line.designName,
        receiptNo: line.receiptNo,
        baleNo: line.baleNo,
        lotNo: line.lotNo,
        comboNo: line.comboNo,
        rollNo: line.rollNo,
        lineReferenceNumber: line.lineReferenceNumber,
        lineJobberLedgerId: line.lineJobberLedgerId,
        sourceTextileDocumentId: line.sourceTextileDocumentId,
        sourceTextileDocumentLineId: line.sourceTextileDocumentLineId,
        linkedSaleInvoiceLineId: line.linkedSaleInvoiceLineId,
        linkedInhouseProcessId: line.linkedInhouseProcessId,
        linkedInhouseProductionId: line.linkedInhouseProductionId,
        pieces: line.pieces,
        quantity: line.quantity,
        rate: line.rate,
        fabricRate: line.fabricRate,
        shrinkagePercent: line.shrinkagePercent,
        amount: line.amount,
        remarks: line.remarks,
        metaJson: line.metaJson
    })),
    ...overrides
});

type GraphqlError = {
    message: string;
    extensions?: { code?: string };
};

type GraphqlResponse<T> = {
    data?: T;
    errors?: GraphqlError[];
};

const textileGraphqlUrl = apiUrl('/textile/graphql');

const requestTextileGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    retryOnAuth = true
): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(textileGraphqlUrl, {
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
                return await requestTextileGraphql<T>(query, variables, false);
            }
        }
        throw new Error(errors[0]?.message || 'Request failed');
    }

    if (!res.ok || !json?.data) {
        throw new Error(`Request failed (${res.status})`);
    }

    return json.data;
};

const textileDocumentFields = `
    textileDocumentId
    documentType
    documentNumber
    documentDate
    stockEffect
    partyLedgerId
    brokerLedgerId
    jobberLedgerId
    transporterId
    godownId
    linkedPurchaseOrderId
    linkedFabricInwardId
    linkedPackingSlipId
    linkedDeliveryChallanId
    linkedSaleInvoiceId
    linkedJobWorkIssueId
    linkedDailyOutwardId
    linkedInhouseProcessId
    linkedInhouseProductionId
    referenceNumber
    jobberChallanNo
    jobberChallanDate
    remarkForStatement
    remarks
    capabilityTagsJson
    metaJson
    totalPieces
    totalQuantity
    totalAmount
    isCancelled
    createdAt
    updatedAt
`;

const textileDocumentLineFields = `
    textileDocumentLineId
    textileDocumentId
    lineNumber
    productId
    unitId
    designId
    designName
    receiptNo
    baleNo
    lotNo
    comboNo
    rollNo
    lineReferenceNumber
    lineJobberLedgerId
    sourceTextileDocumentId
    sourceTextileDocumentLineId
    linkedSaleInvoiceLineId
    linkedInhouseProcessId
    linkedInhouseProductionId
    pieces
    quantity
    rate
    fabricRate
    shrinkagePercent
    amount
    remarks
    metaJson
    createdAt
`;

export const listTextileDocuments = async (input: {
    documentType: TextileDocumentType;
    partyLedgerId?: string | null;
    jobberLedgerId?: string | null;
    productId?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
    search?: string | null;
    includeCancelled?: boolean | null;
    limit?: number | null;
    offset?: number | null;
}) => {
    const data = await requestTextileGraphql<{ textileDocuments: TextileDocumentListItem[] }>(
        `query TextileDocuments($documentType: String!, $partyLedgerId: String, $jobberLedgerId: String, $productId: String, $fromDate: String, $toDate: String, $search: String, $includeCancelled: Boolean, $limit: Float, $offset: Float) {
            textileDocuments(documentType: $documentType, partyLedgerId: $partyLedgerId, jobberLedgerId: $jobberLedgerId, productId: $productId, fromDate: $fromDate, toDate: $toDate, search: $search, includeCancelled: $includeCancelled, limit: $limit, offset: $offset) {
                ${textileDocumentFields}
                lineCount
            }
        }`,
        input
    );
    return data.textileDocuments;
};

export const getTextileDocument = async (textileDocumentId: string) => {
    const data = await requestTextileGraphql<{ textileDocument: TextileDocument | null }>(
        `query TextileDocument($textileDocumentId: String!) {
            textileDocument(textileDocumentId: $textileDocumentId) {
                ${textileDocumentFields}
                lines {
                    ${textileDocumentLineFields}
                }
            }
        }`,
        { textileDocumentId }
    );
    return data.textileDocument;
};

export const saveTextileDocument = async (input: TextileDocumentInput) => {
    const data = await requestTextileGraphql<{ saveTextileDocument: { ok: boolean; document: TextileDocument } }>(
        `mutation SaveTextileDocument($input: TextileDocumentInput!) {
            saveTextileDocument(input: $input) {
                ok
                document {
                    ${textileDocumentFields}
                    lines {
                        ${textileDocumentLineFields}
                    }
                }
            }
        }`,
        { input }
    );
    return data.saveTextileDocument.document;
};

export const setTextileDocumentCancelled = async (textileDocumentId: string, isCancelled: boolean) => {
    const data = await requestTextileGraphql<{ setTextileDocumentCancelled: { ok: boolean; document: TextileDocument } }>(
        `mutation SetTextileDocumentCancelled($textileDocumentId: String!, $isCancelled: Boolean!) {
            setTextileDocumentCancelled(textileDocumentId: $textileDocumentId, isCancelled: $isCancelled) {
                ok
                document {
                    ${textileDocumentFields}
                    lines {
                        ${textileDocumentLineFields}
                    }
                }
            }
        }`,
        { textileDocumentId, isCancelled }
    );
    return data.setTextileDocumentCancelled.document;
};

export const getTextileFabricStatement = async (input: {
    documentType?: TextileDocumentType | null;
    partyLedgerId?: string | null;
    jobberLedgerId?: string | null;
    productId?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
    includeCancelled?: boolean | null;
}) => {
    const data = await requestTextileGraphql<{ textileFabricStatement: TextileStatementRow[] }>(
        `query TextileFabricStatement($documentType: String, $partyLedgerId: String, $jobberLedgerId: String, $productId: String, $fromDate: String, $toDate: String, $includeCancelled: Boolean) {
            textileFabricStatement(documentType: $documentType, partyLedgerId: $partyLedgerId, jobberLedgerId: $jobberLedgerId, productId: $productId, fromDate: $fromDate, toDate: $toDate, includeCancelled: $includeCancelled) {
                textileDocumentId
                textileDocumentLineId
                documentType
                documentNumber
                documentDate
                stockEffect
                partyLedgerId
                jobberLedgerId
                lineJobberLedgerId
                productId
                unitId
                designId
                designName
                receiptNo
                baleNo
                lotNo
                comboNo
                rollNo
                lineReferenceNumber
                piecesIn
                piecesOut
                quantityIn
                quantityOut
                signedPieces
                signedQuantity
                signedAmount
                runningPiecesBalance
                runningQuantityBalance
                runningAmountBalance
            }
        }`,
        input
    );
    return data.textileFabricStatement;
};

export const getTextileFabricStockStatement = async (input: {
    partyLedgerId?: string | null;
    jobberLedgerId?: string | null;
    productId?: string | null;
    includeCancelled?: boolean | null;
}) => {
    const data = await requestTextileGraphql<{ textileFabricStockStatement: TextileStockRow[] }>(
        `query TextileFabricStockStatement($partyLedgerId: String, $jobberLedgerId: String, $productId: String, $includeCancelled: Boolean) {
            textileFabricStockStatement(partyLedgerId: $partyLedgerId, jobberLedgerId: $jobberLedgerId, productId: $productId, includeCancelled: $includeCancelled) {
                partyLedgerId
                jobberLedgerId
                lineJobberLedgerId
                productId
                unitId
                designId
                designName
                receiptNo
                baleNo
                lotNo
                comboNo
                rollNo
                balancePieces
                balanceQuantity
                balanceAmount
                lastDocumentDate
            }
        }`,
        input
    );
    return data.textileFabricStockStatement;
};


