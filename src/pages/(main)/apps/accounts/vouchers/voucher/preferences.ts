type LocalStorageLike = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
};

export const PAYMENT_VOUCHER_ADD_ANOTHER_AFTER_SAVE_STORAGE_KEY = 'accounts.paymentVoucher.addAnotherAfterSave';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

const resolveLocalStorage = (): LocalStorageLike | null => {
    const localStorageRef = (globalThis as { localStorage?: LocalStorageLike }).localStorage;
    if (!localStorageRef || typeof localStorageRef.getItem !== 'function' || typeof localStorageRef.setItem !== 'function') {
        return null;
    }
    return localStorageRef;
};

const resolveAddAnotherStorageKey = (storagePrefix?: string) =>
    storagePrefix?.trim()
        ? `${storagePrefix.trim()}.addAnotherAfterSave`
        : PAYMENT_VOUCHER_ADD_ANOTHER_AFTER_SAVE_STORAGE_KEY;

export const normalizeAddAnotherAfterSavePreference = (value: string | null | undefined): boolean | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return null;
};

export const getStoredAddAnotherAfterSavePreference = (storagePrefix?: string): boolean => {
    const storage = resolveLocalStorage();
    if (!storage) return false;
    const normalized = normalizeAddAnotherAfterSavePreference(
        storage.getItem(resolveAddAnotherStorageKey(storagePrefix))
    );
    return normalized ?? false;
};

export const persistAddAnotherAfterSavePreference = (enabled: boolean, storagePrefix?: string) => {
    const storage = resolveLocalStorage();
    if (!storage) return;
    storage.setItem(resolveAddAnotherStorageKey(storagePrefix), enabled ? '1' : '0');
};
