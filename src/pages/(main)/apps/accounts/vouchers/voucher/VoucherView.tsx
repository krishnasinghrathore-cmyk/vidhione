'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import { VoucherForm } from './VoucherForm';
import { VoucherTable } from './VoucherTable';
import type { PaymentMode } from './types';
import type { VoucherViewProps } from './useVoucherState';

const DIALOG_MASK_SELECTOR = '.p-dialog-mask';
const DIALOG_SELECTOR = '.p-dialog';

const cleanupOrphanDialogMasks = () => {
    if (typeof document === 'undefined') return;
    if (document.querySelector(DIALOG_SELECTOR) != null) return;
    const masks = Array.from(document.querySelectorAll<HTMLElement>(DIALOG_MASK_SELECTOR));
    if (masks.length === 0) {
        document.body.classList.remove('p-overflow-hidden');
        document.documentElement.classList.remove('p-overflow-hidden');
        document.body.style.removeProperty('overflow');
        return;
    }
    let removedAny = false;
    masks.forEach((mask) => {
        if (mask.querySelector(DIALOG_SELECTOR) != null) return;
        mask.remove();
        removedAny = true;
    });
    if (!removedAny || document.querySelector(DIALOG_MASK_SELECTOR) != null) return;
    document.body.classList.remove('p-overflow-hidden');
    document.documentElement.classList.remove('p-overflow-hidden');
    document.body.style.removeProperty('overflow');
};

export function VoucherView(props: VoucherViewProps) {
    const {
        routeView,
        error,
        pageHeading,
        openAdd,
        voucherActions,
        addButtonId,
        toastRef,
        voucherProfileKey,
        voucherProfileSwitchLabel,
        voucherProfileOptions,
        changeVoucherProfile,
        paymentMode,
        modeSwitchLabel,
        paymentModeOptions,
        changePaymentMode
    } = props;
    const showForm = routeView !== 'register';
    const showRegister = routeView === 'register';
    const showVoucherProfileSwitch = voucherProfileOptions.length > 1 && Boolean(voucherProfileSwitchLabel);
    const showModeSwitch = paymentModeOptions.length > 1;
    const previousShowRegisterRef = React.useRef(showRegister);

    React.useEffect(() => {
        const wasRegister = previousShowRegisterRef.current;
        previousShowRegisterRef.current = showRegister;
        const isReturningFromForm = showRegister && !wasRegister;
        if (!isReturningFromForm || typeof window === 'undefined' || typeof document === 'undefined') return;
        const timeoutIds = [0, 80, 180, 320, 520, 780].map((delay) =>
            window.setTimeout(() => cleanupOrphanDialogMasks(), delay)
        );
        return () => {
            timeoutIds.forEach((id) => window.clearTimeout(id));
        };
    }, [showRegister]);

    return (
        <div className="cash-exp-split">
            <ConfirmDialog />
            <Toast ref={toastRef} />
            <div className="flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
                <div className="flex flex-column gap-1">
                    <h2 className="m-0">{pageHeading}</h2>
                </div>
                <div className="app-workspace-toolbar flex align-items-center justify-content-end gap-3 flex-wrap ml-auto">
                    {showVoucherProfileSwitch ? (
                        <div className="app-workspace-switch" role="group" aria-label={`${voucherProfileSwitchLabel} switch`}>
                            <span className="app-workspace-switch__label">{voucherProfileSwitchLabel}</span>
                            <SelectButton
                                value={voucherProfileKey}
                                options={voucherProfileOptions}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => {
                                    if (!event.value) return;
                                    changeVoucherProfile(event.value as VoucherViewProps['voucherProfileKey']);
                                }}
                                className="app-payment-mode app-workspace-switch__control"
                            />
                        </div>
                    ) : null}
                    {showModeSwitch ? (
                        <div className="app-workspace-switch" role="group" aria-label={`${modeSwitchLabel} switch`}>
                            <span className="app-workspace-switch__label">{modeSwitchLabel}</span>
                            <SelectButton
                                value={paymentMode}
                                options={paymentModeOptions}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => {
                                    if (!event.value) return;
                                    changePaymentMode(event.value as PaymentMode);
                                }}
                                className="app-payment-mode app-workspace-switch__control"
                            />
                        </div>
                    ) : null}
                    {voucherActions.addVoucher.visible ? (
                        <Button
                            label="New Voucher"
                            icon="pi pi-plus"
                            className="app-action-compact app-workspace-switch__action"
                            onClick={openAdd}
                            disabled={voucherActions.addVoucher.disabled}
                            id={addButtonId}
                        />
                    ) : null}
                </div>
            </div>
            {error && <p className="text-red-500 m-0 mb-2">Error loading vouchers: {error.message}</p>}
            {showForm ? (
                <div className="mb-3">
                    <VoucherForm {...props} />
                </div>
            ) : null}
            {showRegister ? <VoucherTable {...props} /> : null}
        </div>
    );
}
