import { gql } from '@apollo/client';

export type WealthSecurity = {
    id: string;
    isin?: string | null;
    symbol?: string | null;
    name: string;
};

export type WealthPriceRow = {
    securityId: string;
    pdate: string;
    closePrice: string;
};

export type WealthCorporateActionRow = {
    id: string;
    securityId: string;
    actionDate: string;
    actionType: string;
    ratio?: string | null;
    price?: string | null;
    notes?: string | null;
};

export type WealthMaintenanceTransaction = {
    id: string;
    tdate: string;
    ttype: string;
    segment?: string | null;
    invoiceDate?: string | null;
    qty: string;
    price: string;
    fees?: string | null;
    notes?: string | null;
    sourceDoc?: string | null;
    accountId?: string | null;
    securityId?: string | null;
    isin?: string | null;
    symbol?: string | null;
    name?: string | null;
};

export const WEALTH_SECURITIES_QUERY = gql`
    query WealthSecurities {
        securities {
            id
            isin
            symbol
            name
        }
    }
`;


export const WEALTH_UPSERT_SECURITY_MUTATION = gql`
    mutation WealthUpsertSecurity($isin: String, $symbol: String, $name: String!) {
        upsertSecurity(isin: $isin, symbol: $symbol, name: $name) {
            id
            isin
            symbol
            name
        }
    }
`;
export const WEALTH_PRICES_QUERY = gql`
    query WealthPricesList($limit: Int) {
        pricesList(limit: $limit) {
            securityId
            pdate
            closePrice
        }
    }
`;

export const WEALTH_PRICE_AT_QUERY = gql`
    query WealthPriceAt($securityId: String!, $asOfDate: String!) {
        pricesList(securityId: $securityId, asOfDate: $asOfDate, limit: 1) {
            securityId
            pdate
            closePrice
        }
    }
`;

export const WEALTH_UPSERT_PRICE_MUTATION = gql`
    mutation WealthUpsertPrice($securityId: String!, $pdate: String!, $closePrice: String!) {
        upsertPrice(securityId: $securityId, pdate: $pdate, closePrice: $closePrice) {
            securityId
            pdate
            closePrice
        }
    }
`;

export const WEALTH_CORPORATE_ACTIONS_QUERY = gql`
    query WealthCorporateActionsList($limit: Int) {
        corporateActionsList(limit: $limit) {
            id
            securityId
            actionDate
            actionType
            ratio
            price
            notes
        }
    }
`;

export const WEALTH_UPSERT_CORPORATE_ACTION_MUTATION = gql`
    mutation WealthUpsertCorporateAction(
        $securityId: String!
        $actionDate: String!
        $actionType: String!
        $ratio: String
        $price: String
        $notes: String
    ) {
        upsertCorporateAction(
            securityId: $securityId
            actionDate: $actionDate
            actionType: $actionType
            ratio: $ratio
            price: $price
            notes: $notes
        ) {
            id
            securityId
            actionDate
            actionType
        }
    }
`;

export const WEALTH_TRANSACTIONS_PAGE_QUERY = gql`
    query WealthTransactionsPage($limit: Int, $offset: Int) {
        transactionsPage(limit: $limit, offset: $offset) {
            items {
                id
                tdate
                ttype
                segment
                invoiceDate
                qty
                price
                fees
                notes
                sourceDoc
                accountId
                securityId
                isin
                symbol
                name
            }
            meta {
                total
                limit
                offset
                hasMore
                nextOffset
            }
        }
    }
`;

export const WEALTH_UPSERT_TRANSACTION_MUTATION = gql`
    mutation WealthUpsertTransaction(
        $accountId: String!
        $securityId: String!
        $tdate: String!
        $ttype: String!
        $segment: String
        $invoiceDate: String
        $qty: String!
        $price: String!
        $fees: String
        $notes: String
        $sourceDoc: String
    ) {
        upsertTransaction(
            accountId: $accountId
            securityId: $securityId
            tdate: $tdate
            ttype: $ttype
            segment: $segment
            invoiceDate: $invoiceDate
            qty: $qty
            price: $price
            fees: $fees
            notes: $notes
            sourceDoc: $sourceDoc
        ) {
            id
            tdate
            ttype
            segment
            invoiceDate
            qty
            price
            fees
        }
    }
`;

export const WEALTH_ACTION_OPTIONS = [
    { label: 'Split', value: 'SPLIT' },
    { label: 'Bonus', value: 'BONUS' },
    { label: 'Rights', value: 'RIGHTS' },
    { label: 'Dividend', value: 'DIVIDEND' },
    { label: 'Capital Reduction', value: 'CAPITAL_REDUCTION' },
    { label: 'Expense', value: 'EXPENSE' }
] as const;

export const WEALTH_TX_TYPES = [
    { label: 'BUY', value: 'BUY' },
    { label: 'SELL', value: 'SELL' },
    { label: 'DIVIDEND', value: 'DIVIDEND' },
    { label: 'SPLIT', value: 'SPLIT' },
    { label: 'BONUS', value: 'BONUS' },
    { label: 'RIGHTS', value: 'RIGHTS' },
    { label: 'EXPENSE', value: 'EXPENSE' }
] as const;

export const WEALTH_TX_SEGMENTS = [
    { label: 'Cash', value: 'CASH' },
    { label: 'SLBM', value: 'SLBM' },
    { label: 'F&O', value: 'FAO' }
] as const;

const amountFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

export const formatWealthAmount = (value: number | string | null | undefined) => {
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? amountFormatter.format(amount) : '-';
};

export const getWealthActionRatioLabel = (actionType?: string) => {
    if (actionType === 'SPLIT') return 'Factor (share multiplier). FV split 10->2 enter 5; merge 2->10 enter 0.2';
    if (actionType === 'BONUS') return 'Bonus ratio (bonus shares per share). 1:1 enter 1; 1:2 enter 0.5';
    if (actionType === 'RIGHTS') return 'Rights ratio (rights shares per share). 1:5 enter 0.2';
    if (actionType === 'CAPITAL_REDUCTION') return 'Factor (remaining share multiplier). Example 1:2 reduction enter 0.5';
    return 'Ratio';
};

export const getWealthActionPriceLabel = (actionType?: string) => {
    if (actionType === 'RIGHTS') return 'Rights issue price';
    if (actionType === 'DIVIDEND') return 'Dividend per share';
    return 'Cash / price';
};

export const getWealthTxFeesLabel = (ttype?: string) => {
    if (ttype === 'DIVIDEND') return 'TDS';
    if (ttype === 'BUY' || ttype === 'SELL') return 'Brokerage / Fees';
    return 'Fees';
};

export const getWealthTxNetLabel = (ttype?: string) => {
    if (ttype === 'SELL') return 'Net Proceeds';
    if (ttype === 'BUY') return 'Cost of Purchase';
    return 'Net Amount';
};