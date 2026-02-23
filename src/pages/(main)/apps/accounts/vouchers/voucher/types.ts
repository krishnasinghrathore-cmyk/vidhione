import type { LedgerOption } from '@/lib/accounts/ledgerOptions';

export interface VoucherRow {
    voucherId: number;
    voucherTypeId: number | null;
    voucherTypeCode?: number | null;
    voucherTypeName?: string | null;
    voucherNumber: string | null;
    voucherDate: string | null;
    postingDate: string | null;
    refNo: string | null;
    refDate: string | null;
    referenceNumber2?: string | null;
    referenceDate2?: string | null;
    reasonForIssueText?: string | null;
    debitLedgerName: string | null;
    debitLedgerGroupName: string | null;
    debitLedgerNames?: string | null;
    debitLedgerAmounts?: string | null;
    creditLedgerName?: string | null;
    creditLedgerNames?: string | null;
    creditLedgerAmounts?: string | null;
    totalNetAmount: number;
    narration: string | null;
    isCancelledFlag: number | null;
    isReconciledFlag?: number | null;
    managerId: number | null;
    managerName: string | null;
    salesmanName?: string | null;
    sourceKind?: string | null;
    isFullPaidFlag?: number | null;
    totalAmount?: number | null;
    discountAmount?: number | null;
    adjustedAmount?: number | null;
    diffAmount?: number | null;
    chequeCancelCharges?: number | null;
    chequeReturnStatus?: string | null;
    bankName?: string | null;
    branchName?: string | null;
    chequeNo?: string | null;
    chequeDate?: string | null;
    billInvoiceNos?: string | null;
    billInvoiceDates?: string | null;
    billInvoiceAmounts?: string | null;
    primaryLedgerId?: number | null;
    primaryLedgerName?: string | null;
    primaryLedgerGroupName?: string | null;
    managerDetails?: string | null;
    managerDetailsAmount?: string | null;
    monthName?: string | null;
    yearMonth?: string | null;
}

export type VoucherLedgerLineDisplay = {
    name: string;
    amount: string;
};

export type PaymentVoucherDisplayRow = VoucherRow & {
    voucherTypeDisplay: string;
    voucherNoDisplay: string;
    voucherTypeNoDisplay: string;
    voucherDateDisplay: string;
    postingDateDisplay: string;
    voucherPostingDateDisplay: string;
    refDateDisplay: string;
    refDisplay: string;
    voucherDateKey: string | null;
    postingDateKey: string | null;
    refDateKey: string | null;
    ledgerCrDisplay: string;
    ledgerDrDisplay: string;
    ledgerDrTitle: string;
    ledgerDrLinesDisplay: VoucherLedgerLineDisplay[];
    primaryLedgerGroupDisplay: string;
    debitLedgerGroupLinesDisplay: string[];
    showLedgerDrAmounts: boolean;
    netAmtDisplay: string;
    refNoDisplayValue: string;
    refDateDisplayValue: string;
    referenceNo2DisplayValue: string;
    referenceDate2DisplayValue: string;
    reasonForIssueDisplay: string;
    managerDisplay: string;
    salesmanDisplay: string;
    fullPaidDisplay: string;
    bankDisplay: string;
    branchDisplay: string;
    totalAmtDisplay: string;
    discountAmtDisplay: string;
    adjustedAmtDisplay: string;
    diffAmtDisplay: string;
    chequeReturnStatusDisplay: string;
    chequeCancelChargesDisplay: string;
    invoiceDetailsLinesDisplay: string[];
    searchableText: string;
    searchableTextLower: string;
};

export type ReceiptRegisterTotals = {
    totalAmount: number;
    discountAmount: number;
    netAmount: number;
    adjustedAmount: number;
    diffAmount: number;
    chequeReturnCount: number;
    chequeReturnCharges: number;
};

export type SelectOption = {
    label: string;
    value: number;
};

export type ChequeBookOption = SelectOption & {
    chequeStartNumber: number | null;
    chequeEndNumber: number | null;
};

export type PaymentMode = 'cash' | 'bank' | 'deposit' | 'withdrawal' | 'transfer';
export type PaymentVoucherRouteView = 'register' | 'new' | 'edit';

export type RecentlySavedVoucher = {
    voucherId: number;
    voucherNo: string;
    savedAt: string;
    mode: PaymentMode;
};

export type PaymentViaOption = {
    label: string;
    value: number;
    code?: string | null;
    isActive?: boolean | null;
};

export type DrCrValue = 'Dr' | 'Cr';

export type DrCrOption = {
    label: string;
    value: DrCrValue;
};

export interface ManagerRow {
    managerId: number;
    name: string | null;
}

export interface SalesmanRow {
    salesmanId: number;
    name: string | null;
}

export interface ChequeIssueBookRow {
    chequeIssueBookId: number;
    voucherNumber: string | null;
    chequeStartNumber: number | null;
    chequeEndNumber: number | null;
    remarks?: string | null;
    isCancelledFlag?: number | null;
}

export type DebitLineDraft = {
    key: string;
    ledgerGroupId: number | null;
    ledgerId: number | null;
    ledgerOption?: LedgerOption | null;
    drCrFlag: 0 | 1;
    amount: number | null;
    label?: string | null;
};

export type DebitLineEditorMode = 'add' | 'edit';

export type DebitLineEditorDraft = {
    mode: DebitLineEditorMode;
    targetKey: string | null;
    ledgerGroupId: number | null;
    ledgerId: number | null;
    ledgerOption?: LedgerOption | null;
    drCrFlag: 0 | 1;
    amount: number | null;
    label?: string | null;
};

export type ColumnFilterConstraint = {
    value?: unknown;
    matchMode?: string;
};

export type ColumnFilterMeta = {
    operator?: string;
    constraints?: ColumnFilterConstraint[];
    value?: unknown;
    matchMode?: string;
};

export type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};
