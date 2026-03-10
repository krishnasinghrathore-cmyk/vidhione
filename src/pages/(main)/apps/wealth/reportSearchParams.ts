import { toYmdOrNull } from '@/lib/date';
import { fromYmdOrNull } from './shared';

export type WealthHoldingScope = 'HOUSEHOLD' | 'INVESTOR' | 'ACCOUNT';

export type WealthReportSearchState = {
    asOfDate: Date | null;
    fromDate: Date | null;
    toDate: Date | null;
    accountId: string;
    investorProfileId: string;
    securityId: string;
    sourceDoc: string;
    scope: WealthHoldingScope;
    segment: string;
    ttype: string;
};

const VALID_SCOPES = new Set<WealthHoldingScope>(['HOUSEHOLD', 'INVESTOR', 'ACCOUNT']);
const VALID_SEGMENTS = new Set(['CASH', 'SLBM', 'FAO']);
const VALID_TYPES = new Set(['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'BONUS', 'RIGHTS', 'EXPENSE']);

const readText = (value: string | null) => value?.trim() || '';

const readDate = (value: string | null) => fromYmdOrNull(value);

export const resolveWealthHoldingScope = (filters: {
    accountId?: string | null;
    investorProfileId?: string | null;
    scope?: WealthHoldingScope | null;
}): WealthHoldingScope => {
    if (filters.accountId) return 'ACCOUNT';
    if (filters.investorProfileId) return 'INVESTOR';
    return filters.scope && VALID_SCOPES.has(filters.scope) ? filters.scope : 'HOUSEHOLD';
};

export const parseWealthReportSearchParams = (searchParams: URLSearchParams): WealthReportSearchState => {
    const accountId = readText(searchParams.get('accountId'));
    const investorProfileId = readText(searchParams.get('investorProfileId'));
    const rawScope = readText(searchParams.get('scope')).toUpperCase() as WealthHoldingScope;
    const rawSegment = readText(searchParams.get('segment')).toUpperCase();
    const rawType = readText(searchParams.get('ttype')).toUpperCase();

    return {
        asOfDate: readDate(searchParams.get('asOfDate')),
        fromDate: readDate(searchParams.get('fromDate')),
        toDate: readDate(searchParams.get('toDate')),
        accountId,
        investorProfileId,
        securityId: readText(searchParams.get('securityId')),
        sourceDoc: readText(searchParams.get('sourceDoc')),
        scope: resolveWealthHoldingScope({
            accountId,
            investorProfileId,
            scope: VALID_SCOPES.has(rawScope) ? rawScope : 'HOUSEHOLD'
        }),
        segment: VALID_SEGMENTS.has(rawSegment) ? rawSegment : '',
        ttype: VALID_TYPES.has(rawType) ? rawType : ''
    };
};

export const buildWealthReportSearchParams = (
    filters: Partial<WealthReportSearchState>
) => {
    const params = new URLSearchParams();
    const scope = resolveWealthHoldingScope({
        accountId: filters.accountId,
        investorProfileId: filters.investorProfileId,
        scope: filters.scope
    });

    if (filters.asOfDate) params.set('asOfDate', toYmdOrNull(filters.asOfDate) || '');
    if (filters.fromDate) params.set('fromDate', toYmdOrNull(filters.fromDate) || '');
    if (filters.toDate) params.set('toDate', toYmdOrNull(filters.toDate) || '');
    if (filters.investorProfileId) params.set('investorProfileId', filters.investorProfileId);
    if (filters.accountId) params.set('accountId', filters.accountId);
    if (filters.securityId) params.set('securityId', filters.securityId);
    if (filters.sourceDoc) params.set('sourceDoc', filters.sourceDoc);
    if (scope !== 'HOUSEHOLD') params.set('scope', scope);
    if (filters.segment && VALID_SEGMENTS.has(filters.segment)) params.set('segment', filters.segment);
    if (filters.ttype && VALID_TYPES.has(filters.ttype)) params.set('ttype', filters.ttype);

    const emptyKeys: string[] = [];
    params.forEach((value, key) => {
        if (!value) {
            emptyKeys.push(key);
        }
    });
    emptyKeys.forEach((key) => params.delete(key));

    return params;
};
