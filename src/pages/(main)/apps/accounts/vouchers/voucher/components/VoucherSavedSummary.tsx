'use client';
import React from 'react';
import { Button } from 'primereact/button';
import type { RecentlySavedVoucher } from '../types';
import type { VoucherViewProps } from '../useVoucherState';

type VoucherSavedSummaryProps = {
    viewProps: VoucherViewProps;
};

const formatRecentSavedTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const now = new Date();
    const isSameDay =
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth() &&
        parsed.getDate() === now.getDate();
    const timeLabel = parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (isSameDay) return timeLabel;
    const dateLabel = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `${dateLabel} ${timeLabel}`;
};

export function VoucherSavedSummary({ viewProps }: VoucherSavedSummaryProps) {
    const {
        routeView,
        showSavedStatusBar,
        lastSavedVoucher,
        openLastSavedVoucherForEdit,
        openRecentlySavedVoucher,
        recentlySavedVouchers
    } = viewProps;

    const renderRecentItem = (item: RecentlySavedVoucher) => {
        const itemKey = `${item.mode}:${item.voucherId}:${item.savedAt}`;
        const voucherNoLabel = item.voucherNo?.trim() || String(item.voucherId);
        return (
            <button
                key={itemKey}
                type="button"
                className="app-voucher-recent-saved__item"
                onClick={() => openRecentlySavedVoucher(item)}
                aria-label={`Open voucher #${voucherNoLabel}`}
            >
                <span className="app-voucher-recent-saved__voucher">#{voucherNoLabel}</span>
                <span className="app-voucher-recent-saved__time">{formatRecentSavedTime(item.savedAt)}</span>
            </button>
        );
    };

    if (routeView === 'edit') return null;
    if (!showSavedStatusBar && recentlySavedVouchers.length === 0) return null;

    return (
        <div className="app-voucher-saved-summary">
            {showSavedStatusBar && lastSavedVoucher ? (
                <div className="app-voucher-saved-summary__status" role="status" aria-live="polite">
                    <span className="app-voucher-saved-summary__label">
                        Saved: Voucher #{lastSavedVoucher.voucherNo?.trim() || lastSavedVoucher.voucherId}
                    </span>
                    <div className="app-voucher-saved-summary__actions">
                        <Button
                            label="Edit"
                            className="p-button-text p-button-sm"
                            onClick={openLastSavedVoucherForEdit}
                            aria-label="Edit last saved voucher"
                        />
                    </div>
                </div>
            ) : null}
            {recentlySavedVouchers.length > 0 ? (
                <div className="app-voucher-recent-saved" aria-label="Recently saved vouchers">
                    <span className="app-voucher-recent-saved__title">Recently saved</span>
                    <div className="app-voucher-recent-saved__list">{recentlySavedVouchers.map(renderRecentItem)}</div>
                </div>
            ) : null}
        </div>
    );
}
