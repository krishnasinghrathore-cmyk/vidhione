import { z } from 'zod';
import { toYmd } from '@/lib/date';
import type { TextileDocument, TextileDocumentInput } from '@/lib/textile/api';
import type { TextileCapabilityState } from '@/lib/textile/config';
import type { TextileDocumentScreenConfig } from './config';

export type TextileDraftHeaderField =
    | 'documentNumber'
    | 'documentDate'
    | 'partyLedgerId'
    | 'brokerLedgerId'
    | 'jobberLedgerId'
    | 'transporterId'
    | 'godownId'
    | 'referenceNumber'
    | 'jobberChallanNo'
    | 'jobberChallanDate'
    | 'remarkForStatement'
    | 'remarks';

export type TextileDraftLineField =
    | 'productId'
    | 'unitId'
    | 'designName'
    | 'receiptNo'
    | 'baleNo'
    | 'lotNo'
    | 'comboNo'
    | 'rollNo'
    | 'lineReferenceNumber'
    | 'lineJobberLedgerId'
    | 'pieces'
    | 'quantity'
    | 'rate'
    | 'fabricRate'
    | 'shrinkagePercent'
    | 'remarks';

export type TextileDocumentLineDraft = {
    clientId: string;
    productId: string;
    unitId: string;
    designName: string;
    receiptNo: string;
    baleNo: string;
    lotNo: string;
    comboNo: string;
    rollNo: string;
    lineReferenceNumber: string;
    lineJobberLedgerId: string;
    pieces: string;
    quantity: string;
    rate: string;
    fabricRate: string;
    shrinkagePercent: string;
    remarks: string;
};

export type TextileDocumentDraft = {
    textileDocumentId: string | null;
    documentNumber: string;
    documentDate: Date | null;
    partyLedgerId: string;
    brokerLedgerId: string;
    jobberLedgerId: string;
    transporterId: string;
    godownId: string;
    referenceNumber: string;
    jobberChallanNo: string;
    jobberChallanDate: Date | null;
    remarkForStatement: string;
    remarks: string;
    isCancelled: boolean;
    lines: TextileDocumentLineDraft[];
};

export type TextileDraftErrors = {
    form: string | null;
    header: Partial<Record<TextileDraftHeaderField, string>>;
    lines: Record<string, Partial<Record<TextileDraftLineField, string>>>;
};

type NormalizedLine = {
    clientId: string;
    productId: string;
    unitId: string | null;
    designName: string | null;
    receiptNo: string | null;
    baleNo: string | null;
    lotNo: string | null;
    comboNo: string | null;
    rollNo: string | null;
    lineReferenceNumber: string | null;
    lineJobberLedgerId: string | null;
    pieces: number;
    quantity: number;
    rate: number;
    fabricRate: number;
    shrinkagePercent: number;
    remarks: string | null;
};

type NormalizedDraft = {
    textileDocumentId: string | null;
    documentNumber: string;
    documentDate: Date;
    partyLedgerId: string;
    brokerLedgerId: string | null;
    jobberLedgerId: string | null;
    transporterId: string | null;
    godownId: string | null;
    referenceNumber: string | null;
    jobberChallanNo: string | null;
    jobberChallanDate: Date | null;
    remarkForStatement: string | null;
    remarks: string | null;
    lines: NormalizedLine[];
};

const normalizedLineSchema = z.object({
    clientId: z.string().min(1),
    productId: z.string().min(1, 'Product is required'),
    unitId: z.string().nullable(),
    designName: z.string().nullable(),
    receiptNo: z.string().nullable(),
    baleNo: z.string().nullable(),
    lotNo: z.string().nullable(),
    comboNo: z.string().nullable(),
    rollNo: z.string().nullable(),
    lineReferenceNumber: z.string().nullable(),
    lineJobberLedgerId: z.string().nullable(),
    pieces: z.number().finite('Pieces must be a number').min(0, 'Pieces cannot be negative'),
    quantity: z.number().finite('Quantity is required').gt(0, 'Quantity must be greater than zero'),
    rate: z.number().finite('Rate must be a number').min(0, 'Rate cannot be negative'),
    fabricRate: z.number().finite('Fabric rate must be a number').min(0, 'Fabric rate cannot be negative'),
    shrinkagePercent: z
        .number()
        .finite('Shrinkage % must be a number')
        .min(0, 'Shrinkage % cannot be negative')
        .max(100, 'Shrinkage % cannot be greater than 100'),
    remarks: z.string().nullable()
});

const normalizedDraftSchema = z.object({
    textileDocumentId: z.string().nullable(),
    documentNumber: z.string().min(1, 'Document number is required'),
    documentDate: z.date({ required_error: 'Document date is required', invalid_type_error: 'Document date is required' }),
    partyLedgerId: z.string().min(1, 'Party ledger is required'),
    brokerLedgerId: z.string().nullable(),
    jobberLedgerId: z.string().nullable(),
    transporterId: z.string().nullable(),
    godownId: z.string().nullable(),
    referenceNumber: z.string().nullable(),
    jobberChallanNo: z.string().nullable(),
    jobberChallanDate: z.date().nullable(),
    remarkForStatement: z.string().nullable(),
    remarks: z.string().nullable(),
    lines: z.array(normalizedLineSchema).min(1, 'Add at least one textile line')
});

const createClientId = () => `line_${Math.random().toString(36).slice(2, 10)}`;

const trimToNull = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const parseDecimalInput = (value: string, defaultValue = 0) => {
    const trimmed = value.trim();
    if (!trimmed) return defaultValue;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const formatDraftNumber = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return '';
    return `${value}`;
};

export const calculateLineAmount = (line: Pick<TextileDocumentLineDraft, 'quantity' | 'rate'>) => {
    const quantity = parseDecimalInput(line.quantity, 0);
    const rate = parseDecimalInput(line.rate, 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return 0;
    return quantity * rate;
};

export const calculateDraftTotals = (lines: TextileDocumentLineDraft[]) =>
    lines.reduce(
        (totals, line) => {
            const pieces = parseDecimalInput(line.pieces, 0);
            const quantity = parseDecimalInput(line.quantity, 0);
            const amount = calculateLineAmount(line);
            return {
                pieces: totals.pieces + (Number.isFinite(pieces) ? pieces : 0),
                quantity: totals.quantity + (Number.isFinite(quantity) ? quantity : 0),
                amount: totals.amount + (Number.isFinite(amount) ? amount : 0)
            };
        },
        { pieces: 0, quantity: 0, amount: 0 }
    );

export const createEmptyLineDraft = (): TextileDocumentLineDraft => ({
    clientId: createClientId(),
    productId: '',
    unitId: '',
    designName: '',
    receiptNo: '',
    baleNo: '',
    lotNo: '',
    comboNo: '',
    rollNo: '',
    lineReferenceNumber: '',
    lineJobberLedgerId: '',
    pieces: '',
    quantity: '',
    rate: '',
    fabricRate: '',
    shrinkagePercent: '',
    remarks: ''
});

export const createEmptyTextileDocumentDraft = (): TextileDocumentDraft => ({
    textileDocumentId: null,
    documentNumber: '',
    documentDate: new Date(),
    partyLedgerId: '',
    brokerLedgerId: '',
    jobberLedgerId: '',
    transporterId: '',
    godownId: '',
    referenceNumber: '',
    jobberChallanNo: '',
    jobberChallanDate: null,
    remarkForStatement: '',
    remarks: '',
    isCancelled: false,
    lines: [createEmptyLineDraft()]
});

export const createEmptyTextileDraftErrors = (): TextileDraftErrors => ({
    form: null,
    header: {},
    lines: {}
});

export const textileDocumentToDraft = (document: TextileDocument): TextileDocumentDraft => ({
    textileDocumentId: document.textileDocumentId,
    documentNumber: document.documentNumber ?? '',
    documentDate: document.documentDate ? new Date(document.documentDate) : null,
    partyLedgerId: document.partyLedgerId ?? '',
    brokerLedgerId: document.brokerLedgerId ?? '',
    jobberLedgerId: document.jobberLedgerId ?? '',
    transporterId: document.transporterId ?? '',
    godownId: document.godownId ?? '',
    referenceNumber: document.referenceNumber ?? '',
    jobberChallanNo: document.jobberChallanNo ?? '',
    jobberChallanDate: document.jobberChallanDate ? new Date(document.jobberChallanDate) : null,
    remarkForStatement: document.remarkForStatement ?? '',
    remarks: document.remarks ?? '',
    isCancelled: Boolean(document.isCancelled),
    lines:
        document.lines.length > 0
            ? document.lines.map((line) => ({
                  clientId: createClientId(),
                  productId: line.productId ?? '',
                  unitId: line.unitId ?? '',
                  designName: line.designName ?? '',
                  receiptNo: line.receiptNo ?? '',
                  baleNo: line.baleNo ?? '',
                  lotNo: line.lotNo ?? '',
                  comboNo: line.comboNo ?? '',
                  rollNo: line.rollNo ?? '',
                  lineReferenceNumber: line.lineReferenceNumber ?? '',
                  lineJobberLedgerId: line.lineJobberLedgerId ?? '',
                  pieces: formatDraftNumber(line.pieces),
                  quantity: formatDraftNumber(line.quantity),
                  rate: formatDraftNumber(line.rate),
                  fabricRate: formatDraftNumber(line.fabricRate),
                  shrinkagePercent: formatDraftNumber(line.shrinkagePercent),
                  remarks: line.remarks ?? ''
              }))
            : [createEmptyLineDraft()]
});

const normalizeDraft = (draft: TextileDocumentDraft): NormalizedDraft => ({
    textileDocumentId: draft.textileDocumentId ?? null,
    documentNumber: draft.documentNumber.trim(),
    documentDate: draft.documentDate as Date,
    partyLedgerId: draft.partyLedgerId.trim(),
    brokerLedgerId: trimToNull(draft.brokerLedgerId),
    jobberLedgerId: trimToNull(draft.jobberLedgerId),
    transporterId: trimToNull(draft.transporterId),
    godownId: trimToNull(draft.godownId),
    referenceNumber: trimToNull(draft.referenceNumber),
    jobberChallanNo: trimToNull(draft.jobberChallanNo),
    jobberChallanDate: draft.jobberChallanDate ?? null,
    remarkForStatement: trimToNull(draft.remarkForStatement),
    remarks: trimToNull(draft.remarks),
    lines: draft.lines.map((line) => ({
        clientId: line.clientId,
        productId: line.productId.trim(),
        unitId: trimToNull(line.unitId),
        designName: trimToNull(line.designName),
        receiptNo: trimToNull(line.receiptNo),
        baleNo: trimToNull(line.baleNo),
        lotNo: trimToNull(line.lotNo),
        comboNo: trimToNull(line.comboNo),
        rollNo: trimToNull(line.rollNo),
        lineReferenceNumber: trimToNull(line.lineReferenceNumber),
        lineJobberLedgerId: trimToNull(line.lineJobberLedgerId),
        pieces: parseDecimalInput(line.pieces, 0),
        quantity: parseDecimalInput(line.quantity, Number.NaN),
        rate: parseDecimalInput(line.rate, 0),
        fabricRate: parseDecimalInput(line.fabricRate, 0),
        shrinkagePercent: parseDecimalInput(line.shrinkagePercent, 0),
        remarks: trimToNull(line.remarks)
    }))
});

const issuesToErrors = (draft: TextileDocumentDraft, issues: z.ZodIssue[]): TextileDraftErrors => {
    const errors = createEmptyTextileDraftErrors();
    for (const issue of issues) {
        const [first, second, third] = issue.path;
        if (first === 'lines' && typeof second === 'number' && typeof third === 'string') {
            const line = draft.lines[second];
            if (!line) continue;
            const nextLineErrors = errors.lines[line.clientId] ?? {};
            nextLineErrors[third as TextileDraftLineField] = issue.message;
            errors.lines[line.clientId] = nextLineErrors;
            continue;
        }
        if (typeof first === 'string' && first !== 'lines') {
            errors.header[first as TextileDraftHeaderField] = issue.message;
            continue;
        }
        errors.form = issue.message;
    }
    if (!errors.form && Object.keys(errors.header).length === 0 && Object.keys(errors.lines).length === 0) {
        errors.form = 'Review the textile document fields and line details.';
    }
    return errors;
};

export const buildTextileDocumentInput = (
    draft: TextileDocumentDraft,
    screen: TextileDocumentScreenConfig,
    capabilities: TextileCapabilityState
):
    | { ok: true; input: TextileDocumentInput; errors: TextileDraftErrors }
    | { ok: false; errors: TextileDraftErrors } => {
    const normalized = normalizeDraft(draft);
    const parsed = normalizedDraftSchema.safeParse(normalized);
    if (!parsed.success) {
        return { ok: false, errors: issuesToErrors(draft, parsed.error.issues) };
    }

    const capabilityTags = Object.entries(capabilities)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

    const input: TextileDocumentInput = {
        textileDocumentId: parsed.data.textileDocumentId,
        documentType: screen.documentType,
        documentNumber: parsed.data.documentNumber,
        documentDate: toYmd(parsed.data.documentDate),
        stockEffect: screen.defaultStockEffect,
        partyLedgerId: parsed.data.partyLedgerId,
        brokerLedgerId: parsed.data.brokerLedgerId,
        jobberLedgerId: parsed.data.jobberLedgerId,
        transporterId: parsed.data.transporterId,
        godownId: parsed.data.godownId,
        referenceNumber: parsed.data.referenceNumber,
        jobberChallanNo: parsed.data.jobberChallanNo,
        jobberChallanDate: parsed.data.jobberChallanDate ? toYmd(parsed.data.jobberChallanDate) : null,
        remarkForStatement: parsed.data.remarkForStatement,
        remarks: parsed.data.remarks,
        capabilityTagsJson: capabilityTags.length > 0 ? JSON.stringify(capabilityTags) : null,
        lines: parsed.data.lines.map((line, index) => ({
            lineNumber: index + 1,
            productId: line.productId,
            unitId: line.unitId,
            designName: line.designName,
            receiptNo: line.receiptNo,
            baleNo: line.baleNo,
            lotNo: line.lotNo,
            comboNo: line.comboNo,
            rollNo: line.rollNo,
            lineReferenceNumber: line.lineReferenceNumber,
            lineJobberLedgerId: line.lineJobberLedgerId,
            pieces: line.pieces,
            quantity: line.quantity,
            rate: line.rate,
            fabricRate: line.fabricRate,
            shrinkagePercent: line.shrinkagePercent,
            amount: line.quantity * line.rate,
            remarks: line.remarks
        }))
    };

    return { ok: true, input, errors: createEmptyTextileDraftErrors() };
};
