export type WealthImportTemplateMode = 'opening' | 'transactions';

export type WealthSampleAccountSeed = {
    name: string;
    code?: string | null;
};

export const OPENING_TEMPLATE_CSV = [
    'ISIN,Symbol,Name,Qty,AvgCost,Notes',
    'INE002A01018,RELIANCE,RELIANCE INDUSTRIES,10,2500,DP opening balance',
    'INE467B01029,TCS,TATA CONSULTANCY SERVICES,5,4100,Family opening balance'
].join('\n');

export const TRANSACTIONS_TEMPLATE_CSV = [
    'Date,ISIN,Symbol,Name,Type,Segment,InvoiceDate,Qty,Price,Fees,Notes,Account,AccountCode,SourceDoc',
    '2024-06-01,INE002A01018,RELIANCE,RELIANCE INDUSTRIES,BUY,CASH,2024-06-02,10,2500,15.5,Broker contract note,Zerodha Main,ABC123,INV-123',
    '2024-07-15,INE467B01029,TCS,TATA CONSULTANCY SERVICES,DIVIDEND,CASH,,5,28,0,TDS already netted,Zerodha Main,ABC123,DIV-2024-07'
].join('\n');

export const WEALTH_UAT_LOG_TEMPLATE_CSV = [
    'Scenario,Area,Scope,Expected Result,Actual Result,Status,Owner,Evidence Link,Notes',
    'NAV-01,Navigation,Household,All core wealth routes open successfully,,,,,',
    'INV-01,Investor Profiles,Household,Create investor profile works,,,,,',
    'INV-02,Investor Profiles,Household,Edit investor profile works,,,,,',
    'ACC-01,Demat Accounts,Household,Create demat account works,,,,,',
    'ACC-02,Demat Accounts,Household,Account links to investor correctly,,,,,',
    'IMP-OPEN-01,Opening Import,Demat Account,Dry run preview is valid,,,,,',
    'IMP-OPEN-02,Opening Import,Demat Account,Actual import posts to selected account only,,,,,',
    'IMP-OPEN-03,Opening Import,Demat Account,Duplicate source doc is blocked,,,,,',
    'IMP-TX-01,Transaction Import,Household,Known account rows import successfully,,,,,',
    'IMP-TX-02,Transaction Import,Household,Unknown account code is rejected clearly,,,,,',
    'HOLD-01,Holdings,Household,Household scope totals are correct,,,,,',
    'HOLD-02,Holdings,Investor,Investor scope isolates the selected investor,,,,,',
    'HOLD-03,Holdings,Demat Account,Account scope isolates the selected demat account,,,,,',
    'REAL-01,Realized P&L,Demat Account,Realized rows stay tied to correct account,,,,,',
    'DIV-01,Dividend Register,Investor,Dividend rows show correct investor and net amount,,,,,',
    'LED-01,Cash Ledger,Investor,Investor ledger filters and balances are correct,,,,,',
    'PACK-01,Statement Pack,Household,Pack renders company header and summary sections,,,,,',
    'PACK-02,Statement Pack,Household,Print preview and PDF output are usable,,,,,',
    'AUTH-01,Permissions,User Access,User without Wealth app cannot access Wealth routes,,,,,'
].join('\n');

const DEFAULT_SAMPLE_ACCOUNTS: WealthSampleAccountSeed[] = [
    { name: 'Self Main', code: 'SELF001' },
    { name: 'Spouse Main', code: 'SPOUSE001' }
];

const csvCell = (value?: string | null) => {
    const normalized = (value ?? '').replace(/\r?\n/g, ' ').trim();
    if (normalized.includes(',') || normalized.includes('"')) {
        return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
};

const downloadTextFile = (fileName: string, content: string, mimeType = 'text/csv;charset=utf-8;') => {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

const resolveSampleAccounts = (accounts: WealthSampleAccountSeed[] = []) => {
    const cleaned = accounts
        .map((account) => ({
            name: account.name?.trim() || '',
            code: account.code?.trim() || ''
        }))
        .filter((account) => account.name);

    if (cleaned.length >= 2) return cleaned;
    if (cleaned.length === 1) return [cleaned[0], DEFAULT_SAMPLE_ACCOUNTS[1]];
    return DEFAULT_SAMPLE_ACCOUNTS;
};

export const buildWealthSampleOpeningCsv = () => [
    'ISIN,Symbol,Name,Qty,AvgCost,Notes',
    'INE002A01018,RELIANCE,RELIANCE INDUSTRIES,12,2475.50,UAT opening balance for main household account',
    'INE467B01029,TCS,TATA CONSULTANCY SERVICES,4,3890,UAT opening balance for family review'
].join('\n');

export const buildWealthSampleTransactionsCsv = (accounts: WealthSampleAccountSeed[] = []) => {
    const [primaryAccount, secondaryAccount] = resolveSampleAccounts(accounts);
    const rows = [
        ['Date', 'ISIN', 'Symbol', 'Name', 'Type', 'Segment', 'InvoiceDate', 'Qty', 'Price', 'Fees', 'Notes', 'Account', 'AccountCode', 'SourceDoc'],
        ['2024-06-01', 'INE002A01018', 'RELIANCE', 'RELIANCE INDUSTRIES', 'BUY', 'CASH', '2024-06-02', '10', '2500', '15.50', 'UAT buy for first demat account', primaryAccount.name, primaryAccount.code ?? '', 'UAT-BUY-001'],
        ['2024-06-10', 'INE467B01029', 'TCS', 'TATA CONSULTANCY SERVICES', 'BUY', 'CASH', '2024-06-11', '5', '4025', '18.00', 'UAT buy for second demat account', secondaryAccount.name, secondaryAccount.code ?? '', 'UAT-BUY-002'],
        ['2024-07-05', 'INE002A01018', 'RELIANCE', 'RELIANCE INDUSTRIES', 'BUY', 'CASH', '2024-07-06', '3', '2660', '9.50', 'Same security across two accounts for account-safe testing', secondaryAccount.name, secondaryAccount.code ?? '', 'UAT-BUY-003'],
        ['2024-08-01', 'INE002A01018', 'RELIANCE', 'RELIANCE INDUSTRIES', 'SELL', 'CASH', '2024-08-02', '4', '2895', '12.00', 'UAT sell to validate realized P&L on first account', primaryAccount.name, primaryAccount.code ?? '', 'UAT-SELL-001'],
        ['2024-08-15', 'INE467B01029', 'TCS', 'TATA CONSULTANCY SERVICES', 'DIVIDEND', 'CASH', '', '5', '32', '3.20', 'UAT dividend entry for statement and ledger validation', secondaryAccount.name, secondaryAccount.code ?? '', 'UAT-DIV-001']
    ];

    return rows
        .map((row) => row.map((cell) => csvCell(cell)).join(','))
        .join('\n');
};

export const downloadWealthCsvTemplate = (mode: WealthImportTemplateMode) => {
    const fileName = mode === 'opening' ? 'wealth-opening-holdings-template.csv' : 'wealth-transactions-template.csv';
    const csv = mode === 'opening' ? OPENING_TEMPLATE_CSV : TRANSACTIONS_TEMPLATE_CSV;
    downloadTextFile(fileName, csv);
};

export const downloadWealthUatLogTemplate = () => {
    downloadTextFile('wealth-household-uat-log-template.csv', WEALTH_UAT_LOG_TEMPLATE_CSV);
};
