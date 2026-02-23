export type LedgerGroupTypeOption = {
    value: number;
    label: string;
};

const LEDGER_GROUP_TYPE_OPTIONS: LedgerGroupTypeOption[] = [
    { value: 1, label: 'Bank A/c' },
    { value: 2, label: 'Bank OCC A/c' },
    { value: 3, label: 'Bank OD A/c' },
    { value: 4, label: 'Branch/Division' },
    { value: 5, label: 'Capital A/c' },
    { value: 6, label: 'Cash A/c' },
    { value: 7, label: 'Current Assets' },
    { value: 8, label: 'Current Liabilities' },
    { value: 9, label: 'Deposits (Asset)' },
    { value: 10, label: 'Direct Expenses' },
    { value: 11, label: 'Direct Incomes' },
    { value: 12, label: 'Duties & Taxes' },
    { value: 13, label: 'Expenses (Direct)' },
    { value: 14, label: 'Expenses (Indirect)' },
    { value: 15, label: 'Fixed Assets' },
    { value: 16, label: 'Income (Direct)' },
    { value: 17, label: 'Income (Indirect)' },
    { value: 18, label: 'Indirect Expenses' },
    { value: 19, label: 'Indirect Incomes' },
    { value: 20, label: 'Investments' },
    { value: 21, label: 'Loans & Advances (Asset)' },
    { value: 22, label: 'Loans (Liability)' },
    { value: 23, label: 'Misc Expenses (Asset)' },
    { value: 24, label: 'Provisions' },
    { value: 25, label: 'Purchase A/c' },
    { value: 26, label: 'Reserves & Surplus' },
    { value: 27, label: 'Retained Earnings' },
    { value: 28, label: 'Sales A/c' },
    { value: 29, label: 'Secured Loans' },
    { value: 30, label: 'Stock in Hand' },
    { value: 31, label: 'Sundry Creditors' },
    { value: 32, label: 'Sundry Debtors' },
    { value: 33, label: 'Suspense A/c' },
    { value: 34, label: 'Unsecured Loans' },
    { value: 35, label: 'Expenditure A/c' },
    { value: 36, label: 'Income Revenue' },
    { value: 40, label: 'Party A/c' },
    { value: -1, label: 'Trading A/c' },
    { value: -2, label: 'Profit & Loss A/c' },
    { value: -3, label: 'Gross Profit A/c' },
    { value: -4, label: 'Remuneration To Partners' },
    { value: -5, label: 'Interest To Partners' },
    { value: -6, label: 'Net Profit A/c' },
    { value: -7, label: 'Gross Loss A/c' },
    { value: -8, label: 'Net Loss A/c' }
];

const LEDGER_GROUP_TYPE_LABEL_BY_CODE = new Map<number, string>(
    LEDGER_GROUP_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

export const getLedgerGroupTypeOptions = () => LEDGER_GROUP_TYPE_OPTIONS;

export const getLedgerGroupTypeLabel = (groupTypeCode: number | null | undefined) => {
    if (groupTypeCode == null) return '-';
    return LEDGER_GROUP_TYPE_LABEL_BY_CODE.get(Number(groupTypeCode)) ?? 'Custom Group';
};
