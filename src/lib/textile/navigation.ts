import type { TextileDocumentType } from './api';

export type TextileInvoiceSourceDocumentType = Extract<TextileDocumentType, 'packing_slip' | 'delivery_challan'>;

export type TextileInvoiceSourceRouteState = {
    textileSourceDocumentId: string;
    textileSourceDocumentType: TextileInvoiceSourceDocumentType;
    textileSourceDocumentNumber?: string | null;
};

export const buildTextileInvoiceSourceRouteState = (
    input: TextileInvoiceSourceRouteState
): TextileInvoiceSourceRouteState => ({
    textileSourceDocumentId: input.textileSourceDocumentId,
    textileSourceDocumentType: input.textileSourceDocumentType,
    textileSourceDocumentNumber: input.textileSourceDocumentNumber ?? null
});

export const parseTextileInvoiceSourceRouteState = (value: unknown): TextileInvoiceSourceRouteState | null => {
    if (!value || typeof value !== 'object') return null;

    const candidate = value as Partial<TextileInvoiceSourceRouteState>;
    const textileSourceDocumentId =
        typeof candidate.textileSourceDocumentId === 'string' ? candidate.textileSourceDocumentId.trim() : '';
    const textileSourceDocumentType = candidate.textileSourceDocumentType;

    if (!textileSourceDocumentId) return null;
    if (textileSourceDocumentType !== 'packing_slip' && textileSourceDocumentType !== 'delivery_challan') {
        return null;
    }

    const textileSourceDocumentNumber =
        typeof candidate.textileSourceDocumentNumber === 'string' && candidate.textileSourceDocumentNumber.trim()
            ? candidate.textileSourceDocumentNumber.trim()
            : null;

    return {
        textileSourceDocumentId,
        textileSourceDocumentType,
        textileSourceDocumentNumber
    };
};
