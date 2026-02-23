export type PaymentVoucherSaveIntent = 'primary' | 'addAnotherShortcut';

export type PaymentVoucherPostSaveAction = 'open-register' | 'prepare-next' | 'stay-on-edit';

type ResolvePaymentVoucherPostSaveActionInput = {
    isEditing: boolean;
    addAnotherAfterSave: boolean;
    intent: PaymentVoucherSaveIntent;
};

export const resolvePaymentVoucherPostSaveAction = ({
    isEditing,
    addAnotherAfterSave,
    intent
}: ResolvePaymentVoucherPostSaveActionInput): PaymentVoucherPostSaveAction => {
    if (isEditing) {
        return 'stay-on-edit';
    }
    if (intent === 'addAnotherShortcut') {
        return 'prepare-next';
    }
    return addAnotherAfterSave ? 'prepare-next' : 'open-register';
};

export const buildPaymentVoucherSaveSuccessMessage = (
    voucherNo: string,
    action: PaymentVoucherPostSaveAction
) => {
    const resolvedVoucherNo = voucherNo.trim() || 'N/A';
    if (action === 'prepare-next') {
        return `Voucher saved #${resolvedVoucherNo}. Ready for next.`;
    }
    return `Voucher saved #${resolvedVoucherNo}`;
};
