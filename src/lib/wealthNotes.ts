export type WealthSegment = 'CASH' | 'SLBM' | 'FAO';

export const extractWealthSegment = (notes?: string | null): WealthSegment | null => {
    const match = notes?.match(/\[SEG:([^\]]+)\]/i);
    if (!match) return null;
    const segment = match[1]?.trim().toUpperCase();
    if (segment === 'CASH' || segment === 'SLBM' || segment === 'FAO') return segment;
    return null;
};

export const stripWealthSegmentTags = (notes: string) =>
    notes
        .replace(/\[SEG:[^\]]+\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

export const extractWealthInvoiceDate = (notes?: string | null): string | null => {
    const match = notes?.match(/\[INV_DATE:(\d{4}-\d{2}-\d{2})\]/i);
    if (!match) return null;
    return match[1];
};

export const stripWealthInvoiceDateTags = (notes: string) =>
    notes
        .replace(/\[INV_DATE:\d{4}-\d{2}-\d{2}\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

export const stripWealthMetaTags = (notes: string) =>
    notes
        .replace(/\[SEG:[^\]]+\]/gi, '')
        .replace(/\[INV_DATE:\d{4}-\d{2}-\d{2}\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

export const buildWealthNotesWithSegment = (notes: string, segment?: string | null) => {
    const base = stripWealthSegmentTags(notes || '');
    const seg = segment?.trim().toUpperCase();
    if (!seg || seg === 'CASH') return base || null;
    if (seg !== 'SLBM' && seg !== 'FAO') return base || null;
    const tag = `[SEG:${seg}]`;
    return base ? `${tag} ${base}` : tag;
};
