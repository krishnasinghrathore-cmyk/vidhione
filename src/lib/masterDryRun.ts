type ToastShowRef = {
    current: {
        show: (message: {
            severity?: 'success' | 'info' | 'warn' | 'error';
            summary?: string;
            detail?: string;
            life?: number;
        }) => void;
    } | null;
};

type EnsureDryEditCheckInput = {
    isEditing: boolean;
    lastDigest: string;
    currentDigest: string;
    setLastDigest: (digest: string) => void;
    toastRef: ToastShowRef;
    entityLabel: string;
};

export const ensureDryEditCheck = ({
    isEditing,
    lastDigest,
    currentDigest,
    setLastDigest,
    toastRef,
    entityLabel
}: EnsureDryEditCheckInput) => {
    if (!isEditing) return true;
    if (lastDigest && lastDigest === currentDigest) return true;

    setLastDigest(currentDigest);
    toastRef.current?.show({
        severity: 'info',
        summary: 'Dry Edit Check Passed',
        detail: `Validation passed for ${entityLabel}. Click Save again to apply changes.`,
        life: 5000
    });
    return false;
};
