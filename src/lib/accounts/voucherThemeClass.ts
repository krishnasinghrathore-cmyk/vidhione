export type VoucherThemePaymentMode = 'cash' | 'bank' | 'deposit' | 'withdrawal' | 'transfer';

export const resolveVoucherThemeClass = (voucherProfileKey: string, paymentMode: VoucherThemePaymentMode): string => {
    switch (voucherProfileKey) {
        case 'payment':
        case 'receipt':
            return paymentMode === 'bank' ? 'voucher-form--bank' : 'voucher-form--cash';
        case 'contra':
            return 'voucher-form--contra';
        case 'journal':
            return 'voucher-form--journal';
        case 'debit-note':
        case 'sales':
            return 'voucher-form--debit-note';
        case 'credit-note':
        case 'purchase':
            return 'voucher-form--credit-note';
        case 'tax-invoice':
            return 'voucher-form--bank';
        default:
            return paymentMode === 'bank' ? 'voucher-form--bank' : 'voucher-form--cash';
    }
};
