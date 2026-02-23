export type VoucherUiState = 'REGISTER' | 'NEW' | 'EDIT' | 'SAVING';
export type VoucherBaseUiState = Exclude<VoucherUiState, 'SAVING'>;

export type VoucherActionState = {
    visible: boolean;
    disabled: boolean;
};

export type VoucherActionPermissions = {
    canCreateVoucher?: boolean;
    canSaveVoucher?: boolean;
    canCancelForm?: boolean;
    canPrintVoucher?: boolean;
    canPrintRegister?: boolean;
    canRefreshRegister?: boolean;
    canCancelVoucher?: boolean;
    canDeleteVoucher?: boolean;
    canEditRow?: boolean;
    canDeleteRow?: boolean;
};

export type VoucherActionsInput = {
    uiState: VoucherUiState;
    baseUiState?: VoucherBaseUiState;
    isDirty?: boolean;
    hasVoucherId?: boolean;
    isCancelled?: boolean;
    isLocked?: boolean;
    isPosted?: boolean;
    isPeriodClosed?: boolean;
    canRefresh?: boolean;
    hasRegisterRows?: boolean;
    permissions?: VoucherActionPermissions;
};

export type VoucherActionsConfig = {
    uiState: VoucherUiState;
    baseUiState: VoucherBaseUiState;
    addVoucher: VoucherActionState;
    saveForm: VoucherActionState;
    cancelForm: VoucherActionState;
    printVoucher: VoucherActionState;
    printRegister: VoucherActionState;
    cancelVoucher: VoucherActionState;
    deleteVoucher: VoucherActionState;
    refresh: VoucherActionState;
    rowEdit: VoucherActionState;
    rowDelete: VoucherActionState;
};

const DEFAULT_PERMISSIONS: Required<VoucherActionPermissions> = {
    canCreateVoucher: true,
    canSaveVoucher: true,
    canCancelForm: true,
    canPrintVoucher: true,
    canPrintRegister: true,
    canRefreshRegister: true,
    canCancelVoucher: true,
    canDeleteVoucher: true,
    canEditRow: true,
    canDeleteRow: true
};

const toBaseState = (
    uiState: VoucherUiState,
    baseUiState: VoucherBaseUiState | undefined,
    hasVoucherId: boolean
): VoucherBaseUiState => {
    if (uiState !== 'SAVING') return uiState;
    if (baseUiState) return baseUiState;
    return hasVoucherId ? 'EDIT' : 'NEW';
};

const disableWhenSaving = <T extends VoucherActionState>(uiState: VoucherUiState, action: T): T => {
    if (uiState !== 'SAVING') return action;
    return { ...action, disabled: action.visible ? true : action.disabled };
};

export const deriveVoucherUiState = (
    isFormOpen: boolean,
    hasVoucherId: boolean,
    isSaving: boolean
): { uiState: VoucherUiState; baseUiState: VoucherBaseUiState } => {
    // Form closed -> register state, form open with id -> edit, form open without id -> new.
    const baseUiState: VoucherBaseUiState = isFormOpen ? (hasVoucherId ? 'EDIT' : 'NEW') : 'REGISTER';
    return {
        baseUiState,
        uiState: isSaving ? 'SAVING' : baseUiState
    };
};

export const getVoucherActionsConfig = ({
    uiState,
    baseUiState,
    isDirty,
    hasVoucherId = false,
    isCancelled = false,
    isLocked = false,
    isPosted = false,
    isPeriodClosed = false,
    canRefresh = true,
    hasRegisterRows = false,
    permissions
}: VoucherActionsInput): VoucherActionsConfig => {
    // Base rules:
    // REGISTER -> register actions (add/refresh/print register + row actions)
    // NEW/EDIT  -> form actions (save/cancel, and edit-only print/cancel/delete voucher)
    // SAVING    -> keep visibility from base state and disable every visible action.
    const perms: Required<VoucherActionPermissions> = { ...DEFAULT_PERMISSIONS, ...(permissions ?? {}) };
    const resolvedBaseState = toBaseState(uiState, baseUiState, hasVoucherId);
    const isReadOnlyVoucher = Boolean(isLocked || isPosted || isPeriodClosed);
    const canSaveByDirtyFlag = isDirty !== false;

    const config: VoucherActionsConfig = {
        uiState,
        baseUiState: resolvedBaseState,
        addVoucher: {
            visible: resolvedBaseState === 'REGISTER',
            disabled: resolvedBaseState !== 'REGISTER' || !perms.canCreateVoucher
        },
        saveForm: {
            visible: resolvedBaseState === 'NEW' || resolvedBaseState === 'EDIT',
            disabled:
                resolvedBaseState === 'REGISTER' ||
                !perms.canSaveVoucher ||
                isReadOnlyVoucher ||
                !canSaveByDirtyFlag
        },
        cancelForm: {
            visible: resolvedBaseState === 'NEW' || resolvedBaseState === 'EDIT',
            disabled: !perms.canCancelForm
        },
        printVoucher: {
            visible: resolvedBaseState === 'EDIT',
            disabled:
                resolvedBaseState !== 'EDIT' ||
                !hasVoucherId ||
                !perms.canPrintVoucher
        },
        printRegister: {
            visible: resolvedBaseState === 'REGISTER',
            disabled:
                resolvedBaseState !== 'REGISTER' ||
                !hasRegisterRows ||
                !perms.canPrintRegister
        },
        cancelVoucher: {
            visible: resolvedBaseState === 'EDIT',
            disabled:
                resolvedBaseState !== 'EDIT' ||
                !hasVoucherId ||
                isCancelled ||
                isReadOnlyVoucher ||
                !perms.canCancelVoucher
        },
        deleteVoucher: {
            visible: resolvedBaseState === 'EDIT',
            disabled:
                resolvedBaseState !== 'EDIT' ||
                !hasVoucherId ||
                isReadOnlyVoucher ||
                !perms.canDeleteVoucher
        },
        refresh: {
            visible: resolvedBaseState === 'REGISTER',
            disabled:
                resolvedBaseState !== 'REGISTER' ||
                !canRefresh ||
                !perms.canRefreshRegister
        },
        rowEdit: {
            visible: resolvedBaseState === 'REGISTER',
            disabled: resolvedBaseState !== 'REGISTER' || !perms.canEditRow
        },
        rowDelete: {
            visible: resolvedBaseState === 'REGISTER',
            disabled:
                resolvedBaseState !== 'REGISTER' ||
                isReadOnlyVoucher ||
                !perms.canDeleteRow
        }
    };

    return {
        ...config,
        addVoucher: disableWhenSaving(uiState, config.addVoucher),
        saveForm: disableWhenSaving(uiState, config.saveForm),
        cancelForm: disableWhenSaving(uiState, config.cancelForm),
        printVoucher: disableWhenSaving(uiState, config.printVoucher),
        printRegister: disableWhenSaving(uiState, config.printRegister),
        cancelVoucher: disableWhenSaving(uiState, config.cancelVoucher),
        deleteVoucher: disableWhenSaving(uiState, config.deleteVoucher),
        refresh: disableWhenSaving(uiState, config.refresh),
        rowEdit: disableWhenSaving(uiState, config.rowEdit),
        rowDelete: disableWhenSaving(uiState, config.rowDelete)
    };
};
