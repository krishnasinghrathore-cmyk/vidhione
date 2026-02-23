export interface VoucherTypeMasterRow {
    voucherTypeId: number;
    voucherTypeName: string | null;
    displayName: string | null;
    prefix: string | null;
    suffix: string | null;
    voucherStartNumber: number | null;
    isVoucherNoAutoFlag: boolean | null;
    lockFromDateText: string | null;
    lockToDateText: string | null;
    isLockedFlag: boolean | null;
    disclaimer1: string | null;
    disclaimer2: string | null;
    disclaimer3: string | null;
    disclaimer4: string | null;
    disclaimer5: string | null;
    editPassword: string | null;
}

export type VoucherTypeFormState = {
    voucherTypeName: string;
    displayName: string;
    prefix: string;
    suffix: string;
    voucherStartNumber: number | null;
    isManualVoucherNo: boolean;
    isLocked: boolean;
    lockFromDate: Date | null;
    lockToDate: Date | null;
    disclaimer1: string;
    disclaimer2: string;
    disclaimer3: string;
    disclaimer4: string;
    disclaimer5: string;
    editPassword: string;
};

export type VoucherTypeFormErrors = Partial<Record<keyof VoucherTypeFormState, string>>;

export const DEFAULT_FORM: VoucherTypeFormState = {
    voucherTypeName: '',
    displayName: '',
    prefix: '',
    suffix: '',
    voucherStartNumber: 1,
    isManualVoucherNo: false,
    isLocked: false,
    lockFromDate: null,
    lockToDate: null,
    disclaimer1: '',
    disclaimer2: '',
    disclaimer3: '',
    disclaimer4: '',
    disclaimer5: '',
    editPassword: ''
};
