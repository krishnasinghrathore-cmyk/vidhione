import type { PaymentMode } from './types';
import { BANK_LEDGER_GROUP_TYPES, CASH_LEDGER_GROUP_TYPES } from './utils';

const PARTY_LEDGER_GROUP_TYPES = [31, 32, 40];
const CASH_BANK_LEDGER_GROUP_TYPES = Array.from(new Set([...CASH_LEDGER_GROUP_TYPES, ...BANK_LEDGER_GROUP_TYPES]));
const COMMERCIAL_REGISTER_LEDGER_GROUP_TYPES = Array.from(
    new Set([...CASH_BANK_LEDGER_GROUP_TYPES, ...PARTY_LEDGER_GROUP_TYPES])
);

export type VoucherKey =
    | 'payment'
    | 'receipt'
    | 'contra'
    | 'journal'
    | 'sales'
    | 'purchase'
    | 'credit-note'
    | 'debit-note'
    | 'tax-invoice';

export type VoucherModeConfig = {
    title: string;
    switchLabel: string;
    headerLedgerPurpose: string;
    entryLedgerPurpose: string;
    headerLedgerLabel: string;
    entryLedgerLabel: string;
    headerLedgerGroupLabel: string;
    registerLedgerGroupTypeCodes: number[];
    registerAgainstLedgerGroupTypeCodes: number[] | null;
    registerLedgerDrCrFlag: 0 | 1 | null;
    headerDrCrFlag: 0 | 1;
    entryDrCrFlag: 0 | 1;
    allowHeaderDrCrSelection?: boolean;
    allowEntryDrCrSelection?: boolean;
    showPaymentVia: boolean;
    requiresManager: boolean;
    managerLabel: string;
    defaultPrimaryLedgerFromAgency: boolean;
    enforceSingleEntryLine: boolean;
    disallowEntryLedgerEqualsPrimary: boolean;
};

export type VoucherProfile = {
    key: VoucherKey;
    label: string;
    storagePrefix: string;
    voucherTypeIds: number[];
    voucherTypeIdByMode?: Partial<Record<PaymentMode, number>>;
    modeSwitchLabel: string;
    defaultMode: PaymentMode;
    modes: Record<PaymentMode, VoucherModeConfig | undefined>;
};

const SALES_MODE: VoucherModeConfig = {
    title: 'Sales',
    switchLabel: 'ENTRY',
    headerLedgerPurpose: 'SALES VOUCHER',
    entryLedgerPurpose: 'JOURNAL',
    headerLedgerLabel: 'Party/Cash Ledger (Cr)',
    entryLedgerLabel: 'Ledger',
    headerLedgerGroupLabel: 'Ledger Group (Cr)',
    registerLedgerGroupTypeCodes: COMMERCIAL_REGISTER_LEDGER_GROUP_TYPES,
    registerAgainstLedgerGroupTypeCodes: null,
    registerLedgerDrCrFlag: 1,
    headerDrCrFlag: 1,
    entryDrCrFlag: 0,
    allowEntryDrCrSelection: true,
    showPaymentVia: false,
    requiresManager: false,
    managerLabel: 'Salesman',
    defaultPrimaryLedgerFromAgency: false,
    enforceSingleEntryLine: false,
    disallowEntryLedgerEqualsPrimary: false
};

const PURCHASE_MODE: VoucherModeConfig = {
    title: 'Purchase',
    switchLabel: 'ENTRY',
    headerLedgerPurpose: 'PURCHASE VOUCHER',
    entryLedgerPurpose: 'JOURNAL',
    headerLedgerLabel: 'Party/Cash Ledger (Dr)',
    entryLedgerLabel: 'Ledger',
    headerLedgerGroupLabel: 'Ledger Group (Dr)',
    registerLedgerGroupTypeCodes: COMMERCIAL_REGISTER_LEDGER_GROUP_TYPES,
    registerAgainstLedgerGroupTypeCodes: null,
    registerLedgerDrCrFlag: 0,
    headerDrCrFlag: 0,
    entryDrCrFlag: 1,
    allowEntryDrCrSelection: true,
    showPaymentVia: false,
    requiresManager: false,
    managerLabel: 'Salesman',
    defaultPrimaryLedgerFromAgency: false,
    enforceSingleEntryLine: false,
    disallowEntryLedgerEqualsPrimary: false
};

const CREDIT_NOTE_MODE: VoucherModeConfig = {
    ...PURCHASE_MODE,
    title: 'Credit Note',
    headerLedgerLabel: 'Party Ledger (Cr)',
    headerLedgerGroupLabel: 'Ledger Group (Cr)',
    registerLedgerDrCrFlag: 1,
    headerDrCrFlag: 1,
    entryDrCrFlag: 0
};

const DEBIT_NOTE_MODE: VoucherModeConfig = {
    ...SALES_MODE,
    title: 'Debit Note',
    headerLedgerLabel: 'Party Ledger (Dr)',
    headerLedgerGroupLabel: 'Ledger Group (Dr)',
    registerLedgerDrCrFlag: 0,
    headerDrCrFlag: 0,
    entryDrCrFlag: 1
};

const JOURNAL_MODE: VoucherModeConfig = {
    title: 'Journal',
    switchLabel: 'ENTRY',
    headerLedgerPurpose: 'JOURNAL',
    entryLedgerPurpose: 'JOURNAL',
    headerLedgerLabel: 'Primary Ledger',
    entryLedgerLabel: 'Ledger',
    headerLedgerGroupLabel: 'Ledger Group',
    registerLedgerGroupTypeCodes: COMMERCIAL_REGISTER_LEDGER_GROUP_TYPES,
    registerAgainstLedgerGroupTypeCodes: null,
    registerLedgerDrCrFlag: null,
    headerDrCrFlag: 0,
    entryDrCrFlag: 1,
    allowHeaderDrCrSelection: true,
    allowEntryDrCrSelection: true,
    showPaymentVia: false,
    requiresManager: false,
    managerLabel: 'Manager',
    defaultPrimaryLedgerFromAgency: false,
    enforceSingleEntryLine: false,
    disallowEntryLedgerEqualsPrimary: false
};

const VOUCHER_PROFILES: Record<VoucherKey, VoucherProfile> = {
    payment: {
        key: 'payment',
        label: 'Payment Vouchers',
        storagePrefix: 'accounts.voucherEngine.payment',
        voucherTypeIds: [2, 30],
        voucherTypeIdByMode: { cash: 2, bank: 30 },
        modeSwitchLabel: 'Payment Mode',
        defaultMode: 'bank',
        modes: {
            cash: {
                title: 'Cash',
                switchLabel: 'CASH',
                headerLedgerPurpose: 'CONTRA-CASH',
                entryLedgerPurpose: 'PAYMENT-AGAINST',
                headerLedgerLabel: 'Cash Ledger (Cr)',
                entryLedgerLabel: 'Ledger (Dr)',
                headerLedgerGroupLabel: 'Ledger Group (Cr)',
                registerLedgerGroupTypeCodes: CASH_LEDGER_GROUP_TYPES,
                registerAgainstLedgerGroupTypeCodes: null,
                registerLedgerDrCrFlag: 1,
                headerDrCrFlag: 1,
                entryDrCrFlag: 0,
                showPaymentVia: false,
                requiresManager: true,
                managerLabel: 'Paid By',
                defaultPrimaryLedgerFromAgency: true,
                enforceSingleEntryLine: false,
                disallowEntryLedgerEqualsPrimary: false
            },
            bank: {
                title: 'Bank',
                switchLabel: 'BANK',
                headerLedgerPurpose: 'CONTRA-BANK',
                entryLedgerPurpose: 'PAYMENT-AGAINST',
                headerLedgerLabel: 'Bank Ledger (Cr)',
                entryLedgerLabel: 'Ledger (Dr)',
                headerLedgerGroupLabel: 'Ledger Group (Cr)',
                registerLedgerGroupTypeCodes: BANK_LEDGER_GROUP_TYPES,
                registerAgainstLedgerGroupTypeCodes: null,
                registerLedgerDrCrFlag: 1,
                headerDrCrFlag: 1,
                entryDrCrFlag: 0,
                showPaymentVia: true,
                requiresManager: false,
                managerLabel: 'Paid By',
                defaultPrimaryLedgerFromAgency: false,
                enforceSingleEntryLine: false,
                disallowEntryLedgerEqualsPrimary: false
            },
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    },
    receipt: {
        key: 'receipt',
        label: 'Receipt Vouchers',
        storagePrefix: 'accounts.voucherEngine.receipt',
        voucherTypeIds: [3, 29],
        voucherTypeIdByMode: { cash: 3, bank: 29 },
        modeSwitchLabel: 'Receipt Mode',
        defaultMode: 'cash',
        modes: {
            cash: {
                title: 'Cash',
                switchLabel: 'CASH',
                headerLedgerPurpose: 'CONTRA-CASH',
                entryLedgerPurpose: 'RECEIPT-AGAINST',
                headerLedgerLabel: 'Cash Ledger (Dr)',
                entryLedgerLabel: 'Ledger (Cr)',
                headerLedgerGroupLabel: 'Ledger Group (Dr)',
                registerLedgerGroupTypeCodes: CASH_LEDGER_GROUP_TYPES,
                registerAgainstLedgerGroupTypeCodes: null,
                registerLedgerDrCrFlag: 0,
                headerDrCrFlag: 0,
                entryDrCrFlag: 1,
                showPaymentVia: false,
                requiresManager: true,
                managerLabel: 'Received By',
                defaultPrimaryLedgerFromAgency: false,
                enforceSingleEntryLine: false,
                disallowEntryLedgerEqualsPrimary: false
            },
            bank: {
                title: 'Bank',
                switchLabel: 'BANK',
                headerLedgerPurpose: 'CONTRA-BANK',
                entryLedgerPurpose: 'RECEIPT-AGAINST',
                headerLedgerLabel: 'Ledger (Dr)',
                entryLedgerLabel: 'Ledger (Cr)',
                headerLedgerGroupLabel: 'Ledger Group (Dr)',
                registerLedgerGroupTypeCodes: BANK_LEDGER_GROUP_TYPES,
                registerAgainstLedgerGroupTypeCodes: null,
                registerLedgerDrCrFlag: 0,
                headerDrCrFlag: 0,
                entryDrCrFlag: 1,
                showPaymentVia: false,
                requiresManager: false,
                managerLabel: 'Received By',
                defaultPrimaryLedgerFromAgency: false,
                enforceSingleEntryLine: false,
                disallowEntryLedgerEqualsPrimary: false
            },
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    },
    contra: {
        key: 'contra',
        label: 'Contra Vouchers',
        storagePrefix: 'accounts.voucherEngine.contra',
        voucherTypeIds: [1],
        voucherTypeIdByMode: { deposit: 1, withdrawal: 1, transfer: 1 },
        modeSwitchLabel: 'Contra Mode',
        defaultMode: 'deposit',
        modes: {
            cash: undefined,
            bank: undefined,
            deposit: {
                title: 'Deposit',
                switchLabel: 'DEPOSIT',
                headerLedgerPurpose: 'CONTRA-BANK',
                entryLedgerPurpose: 'CONTRA-CASH',
                headerLedgerLabel: 'Bank Ledger (Dr)',
                entryLedgerLabel: 'Cash Ledger (Cr)',
                headerLedgerGroupLabel: 'Ledger Group (Dr)',
                registerLedgerGroupTypeCodes: BANK_LEDGER_GROUP_TYPES,
                registerAgainstLedgerGroupTypeCodes: CASH_LEDGER_GROUP_TYPES,
                registerLedgerDrCrFlag: 0,
                headerDrCrFlag: 0,
                entryDrCrFlag: 1,
                showPaymentVia: false,
                requiresManager: false,
                managerLabel: 'Manager',
                defaultPrimaryLedgerFromAgency: false,
                enforceSingleEntryLine: true,
                disallowEntryLedgerEqualsPrimary: false
            },
            withdrawal: {
                title: 'Withdrawal',
                switchLabel: 'WITHDRAWAL',
                headerLedgerPurpose: 'CONTRA-CASH',
                entryLedgerPurpose: 'CONTRA-BANK',
                headerLedgerLabel: 'Cash Ledger (Dr)',
                entryLedgerLabel: 'Bank Ledger (Cr)',
                headerLedgerGroupLabel: 'Ledger Group (Dr)',
                registerLedgerGroupTypeCodes: CASH_LEDGER_GROUP_TYPES,
                registerAgainstLedgerGroupTypeCodes: BANK_LEDGER_GROUP_TYPES,
                registerLedgerDrCrFlag: 0,
                headerDrCrFlag: 0,
                entryDrCrFlag: 1,
                showPaymentVia: false,
                requiresManager: false,
                managerLabel: 'Manager',
                defaultPrimaryLedgerFromAgency: false,
                enforceSingleEntryLine: true,
                disallowEntryLedgerEqualsPrimary: false
            },
            transfer: {
                title: 'Transfer',
                switchLabel: 'TRANSFER',
                headerLedgerPurpose: 'CONTRA-BANK',
                entryLedgerPurpose: 'CONTRA-BANK',
                headerLedgerLabel: 'To Bank Ledger (Dr)',
                entryLedgerLabel: 'From Bank Ledger (Cr)',
                headerLedgerGroupLabel: 'Ledger Group (Dr)',
                registerLedgerGroupTypeCodes: BANK_LEDGER_GROUP_TYPES,
                registerAgainstLedgerGroupTypeCodes: BANK_LEDGER_GROUP_TYPES,
                registerLedgerDrCrFlag: 0,
                headerDrCrFlag: 0,
                entryDrCrFlag: 1,
                showPaymentVia: false,
                requiresManager: false,
                managerLabel: 'Manager',
                defaultPrimaryLedgerFromAgency: false,
                enforceSingleEntryLine: true,
                disallowEntryLedgerEqualsPrimary: true
            }
        }
    },
    journal: {
        key: 'journal',
        label: 'Journal Vouchers',
        storagePrefix: 'accounts.voucherEngine.journal',
        voucherTypeIds: [4],
        voucherTypeIdByMode: { cash: 4 },
        modeSwitchLabel: 'Voucher Mode',
        defaultMode: 'cash',
        modes: {
            cash: JOURNAL_MODE,
            bank: undefined,
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    },
    sales: {
        key: 'sales',
        label: 'Sales Vouchers',
        storagePrefix: 'accounts.voucherEngine.sales',
        voucherTypeIds: [5],
        voucherTypeIdByMode: { cash: 5 },
        modeSwitchLabel: 'Voucher Mode',
        defaultMode: 'cash',
        modes: {
            cash: SALES_MODE,
            bank: undefined,
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    },
    purchase: {
        key: 'purchase',
        label: 'Purchase Vouchers',
        storagePrefix: 'accounts.voucherEngine.purchase',
        voucherTypeIds: [7],
        voucherTypeIdByMode: { cash: 7 },
        modeSwitchLabel: 'Voucher Mode',
        defaultMode: 'cash',
        modes: {
            cash: PURCHASE_MODE,
            bank: undefined,
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    },
    'credit-note': {
        key: 'credit-note',
        label: 'Credit Notes',
        storagePrefix: 'accounts.voucherEngine.creditNote',
        voucherTypeIds: [6],
        voucherTypeIdByMode: { cash: 6 },
        modeSwitchLabel: 'Voucher Mode',
        defaultMode: 'cash',
        modes: {
            cash: CREDIT_NOTE_MODE,
            bank: undefined,
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    },
    'debit-note': {
        key: 'debit-note',
        label: 'Debit Notes',
        storagePrefix: 'accounts.voucherEngine.debitNote',
        voucherTypeIds: [8],
        voucherTypeIdByMode: { cash: 8 },
        modeSwitchLabel: 'Voucher Mode',
        defaultMode: 'cash',
        modes: {
            cash: DEBIT_NOTE_MODE,
            bank: undefined,
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    },
    'tax-invoice': {
        key: 'tax-invoice',
        label: 'Tax Invoices',
        storagePrefix: 'accounts.voucherEngine.taxInvoice',
        voucherTypeIds: [9, 11],
        voucherTypeIdByMode: { cash: 9, bank: 11 },
        modeSwitchLabel: 'Invoice Mode',
        defaultMode: 'cash',
        modes: {
            cash: {
                ...SALES_MODE,
                title: 'Sales',
                switchLabel: 'SALES',
                headerLedgerLabel: 'Party/Cash Ledger (Dr)',
                headerLedgerGroupLabel: 'Ledger Group (Dr)',
                registerLedgerDrCrFlag: 0,
                headerDrCrFlag: 0,
                entryDrCrFlag: 1,
                allowEntryDrCrSelection: false
            },
            bank: {
                ...PURCHASE_MODE,
                title: 'Purchase',
                switchLabel: 'PURCHASE',
                headerLedgerLabel: 'Party/Cash Ledger (Cr)',
                headerLedgerGroupLabel: 'Ledger Group (Cr)',
                registerLedgerDrCrFlag: 1,
                headerDrCrFlag: 1,
                entryDrCrFlag: 0,
                allowEntryDrCrSelection: false
            },
            deposit: undefined,
            withdrawal: undefined,
            transfer: undefined
        }
    }
};

export const getVoucherProfile = (voucherKey: string): VoucherProfile => {
    if (voucherKey in VOUCHER_PROFILES) {
        return VOUCHER_PROFILES[voucherKey as VoucherKey];
    }
    throw new Error(`Unsupported voucher profile: ${voucherKey}`);
};

export const getVoucherAllowedModes = (profile: VoucherProfile): PaymentMode[] => {
    return (Object.keys(profile.modes) as PaymentMode[]).filter((mode) => Boolean(profile.modes[mode]));
};

export const isVoucherModeSupported = (profile: VoucherProfile, mode: PaymentMode | null | undefined): mode is PaymentMode => {
    if (!mode) return false;
    return Boolean(profile.modes[mode]);
};

export const resolveVoucherMode = (profile: VoucherProfile, mode: PaymentMode | null | undefined): PaymentMode => {
    if (mode && profile.modes[mode]) return mode;
    return profile.defaultMode;
};

export const getVoucherModeConfig = (profile: VoucherProfile, mode: PaymentMode): VoucherModeConfig => {
    const config = profile.modes[mode];
    if (config) return config;
    const fallbackConfig = profile.modes[profile.defaultMode];
    if (fallbackConfig) return fallbackConfig;
    throw new Error(`No mode configuration found for profile: ${profile.key}`);
};
