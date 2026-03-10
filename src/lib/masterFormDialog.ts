import { confirmDialog } from 'primereact/confirmdialog';

export const focusElementById = (id: string) => {
    if (typeof document === 'undefined') return false;
    const element = document.getElementById(id) as HTMLElement | null;
    if (!element) return false;
    element.focus();
    return true;
};

export const focusElementByIdNextFrame = (id: string) => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            focusElementById(id);
        });
    });
};

export const getMasterSaveButtonLabel = (
    isEditing: boolean,
    saving: boolean,
    isDryEditReady: boolean
) => {
    if (saving) {
        if (!isEditing) return 'Saving...';
        return isDryEditReady ? 'Applying...' : 'Checking...';
    }
    if (!isEditing) return 'Save';
    return isDryEditReady ? 'Apply Changes' : 'Run Dry Check';
};

type ConfirmMasterDialogCloseArgs = {
    saving: boolean;
    isDirty: boolean;
    onDiscard: () => void;
};

export const confirmMasterDialogClose = ({
    saving,
    isDirty,
    onDiscard
}: ConfirmMasterDialogCloseArgs) => {
    if (saving) return;
    if (!isDirty) {
        onDiscard();
        return;
    }
    confirmDialog({
        header: 'Discard changes?',
        message: 'You have unsaved changes. Discard and close this form?',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Keep Editing',
        acceptLabel: 'Discard',
        acceptClassName: 'p-button-danger',
        defaultFocus: 'reject',
        accept: onDiscard,
        reject: () => undefined
    });
};
