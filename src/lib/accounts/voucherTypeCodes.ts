export const VoucherTypeCodes = {
    Contra: 1,
    Payment: 2,
    Receipt: 3,
    Journal: 4,
    MPayment: 30
} as const;

export type VoucherTypeCode = (typeof VoucherTypeCodes)[keyof typeof VoucherTypeCodes];
