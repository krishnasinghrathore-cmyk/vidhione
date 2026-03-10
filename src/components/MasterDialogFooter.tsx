import React from 'react';
import { Button } from 'primereact/button';
import AppCompactToggle from '@/components/AppCompactToggle';
import { AppInfoHint } from '@/components/AppInfoHint';
import MasterRecordNavigator from '@/components/MasterRecordNavigator';
import type { MasterDialogDirection } from '@/lib/masterDialogNavigation';

type BulkModeConfig = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    onLabel?: React.ReactNode;
    offLabel?: React.ReactNode;
    helpText?: string;
    helpAriaLabel?: string;
};

const DEFAULT_BULK_MODE_HELP =
    'Standard closes the popup after save. Bulk keeps the popup open after save so you can continue working without reopening the form.';

type MasterEditDialogFooterProps = {
    index: number;
    total: number;
    onNavigate: (direction: MasterDialogDirection) => void;
    navigateDisabled?: boolean;
    bulkMode?: BulkModeConfig;
    onCancel: () => void;
    cancelDisabled?: boolean;
    cancelLabel?: string;
    onSave: () => void;
    saveDisabled?: boolean;
    saveLabel?: string;
    saveIcon?: string;
    saveButtonId?: string;
};

type MasterDetailDialogFooterProps = {
    index: number;
    total: number;
    onNavigate: (direction: MasterDialogDirection) => void;
    navigateDisabled?: boolean;
    onClose: () => void;
    closeDisabled?: boolean;
    closeLabel?: string;
};

export function MasterEditDialogFooter({
    index,
    total,
    onNavigate,
    navigateDisabled = false,
    bulkMode,
    onCancel,
    cancelDisabled = false,
    cancelLabel = 'Cancel',
    onSave,
    saveDisabled = false,
    saveLabel = 'Save',
    saveIcon = 'pi pi-check',
    saveButtonId
}: MasterEditDialogFooterProps) {
    return (
        <div className="app-master-dialog-footer">
            <div className="app-master-dialog-footer__nav">
                <MasterRecordNavigator
                    index={index}
                    total={total}
                    onNavigate={onNavigate}
                    disabled={navigateDisabled}
                />
            </div>
            <div className="app-master-dialog-footer__actions">
                {bulkMode ? (
                    <div className="app-master-dialog-footer__toggle-group">
                        <AppCompactToggle
                            checked={bulkMode.checked}
                            onChange={bulkMode.onChange}
                            onLabel={bulkMode.onLabel ?? 'Bulk'}
                            offLabel={bulkMode.offLabel ?? 'Standard'}
                            disabled={bulkMode.disabled}
                            className="app-master-dialog-footer__toggle"
                        />
                        <AppInfoHint
                            content={bulkMode.helpText ?? DEFAULT_BULK_MODE_HELP}
                            ariaLabel={bulkMode.helpAriaLabel ?? 'Standard or bulk mode information'}
                            className="app-master-dialog-footer__info"
                        />
                    </div>
                ) : null}
                <div className="app-master-dialog-footer__buttons">
                    <Button
                        label={cancelLabel}
                        className="p-button-text app-action-compact app-master-dialog-footer__button"
                        onClick={onCancel}
                        disabled={cancelDisabled}
                    />
                    <Button
                        id={saveButtonId}
                        label={saveLabel}
                        icon={saveIcon}
                        className="app-action-compact app-master-dialog-footer__button"
                        onClick={onSave}
                        disabled={saveDisabled}
                    />
                </div>
            </div>
        </div>
    );
}

export function MasterDetailDialogFooter({
    index,
    total,
    onNavigate,
    navigateDisabled = false,
    onClose,
    closeDisabled = false,
    closeLabel = 'Close'
}: MasterDetailDialogFooterProps) {
    return (
        <div className="app-master-dialog-footer">
            <div className="app-master-dialog-footer__nav">
                <MasterRecordNavigator
                    index={index}
                    total={total}
                    onNavigate={onNavigate}
                    disabled={navigateDisabled}
                />
            </div>
            <div className="app-master-dialog-footer__actions">
                <Button
                    label={closeLabel}
                    className="p-button-text app-action-compact app-master-dialog-footer__button"
                    onClick={onClose}
                    disabled={closeDisabled}
                />
            </div>
        </div>
    );
}
