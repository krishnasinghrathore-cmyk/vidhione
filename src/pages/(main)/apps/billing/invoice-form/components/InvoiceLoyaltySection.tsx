import React from 'react';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import AppInput from '@/components/AppInput';
import type { CrmLoyaltySummary } from '@/lib/crm/api';
import { formatAmount } from '../../helpers';
import type { InvoiceLoyaltyApplicationDraft } from '../types';

type InvoiceLoyaltySectionProps = {
    value: InvoiceLoyaltyApplicationDraft | null;
    summary: CrmLoyaltySummary | null;
    loading?: boolean;
    error?: string | null;
    partyLedgerId: number | null;
    disabled?: boolean;
    onApply: () => void;
    onChange: (patch: Partial<InvoiceLoyaltyApplicationDraft>) => void;
    onClear: () => void;
};

const toSummaryNumber = (value: string | null | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatPoints = (value: number | null) => {
    if (value == null) return '-';
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export function InvoiceLoyaltySection({
    value,
    summary,
    loading = false,
    error = null,
    partyLedgerId,
    disabled = false,
    onApply,
    onChange,
    onClear
}: InvoiceLoyaltySectionProps) {
    const availablePoints = summary ? Math.max(0, toSummaryNumber(summary.availablePoints)) : null;
    const availableAmount = summary?.availableAmount != null ? Math.max(0, toSummaryNumber(summary.availableAmount)) : null;
    const minimumRedeemPoints = summary ? Math.max(0, toSummaryNumber(summary.minimumRedeemPoints)) : null;
    const valuePerPoint = summary?.redemptionValuePerPoint != null ? Math.max(0, toSummaryNumber(summary.redemptionValuePerPoint)) : null;
    const canApply = !disabled && partyLedgerId != null && !loading && summary != null;

    return (
        <div className="app-entry-section app-entry-section--details">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="flex align-items-center gap-2 flex-wrap">
                    <h4 className="m-0">Loyalty</h4>
                    {summary?.programName ? <span className="invoice-form-status-chip">{summary.programName}</span> : null}
                    {availablePoints != null ? (
                        <span className="invoice-form-status-chip">Available: {formatPoints(availablePoints)} pts</span>
                    ) : null}
                    {availableAmount != null ? (
                        <span className="invoice-form-status-chip">Value: {formatAmount(availableAmount)}</span>
                    ) : null}
                    {loading ? <span className="invoice-form-status-chip">Loading</span> : null}
                </div>
                {value ? (
                    <Button
                        type="button"
                        icon="pi pi-times"
                        label="Clear Loyalty"
                        outlined
                        severity="secondary"
                        className="app-action-compact"
                        onClick={onClear}
                        disabled={disabled}
                    />
                ) : (
                    <Button
                        type="button"
                        icon="pi pi-star"
                        label="Apply Loyalty"
                        outlined
                        className="app-action-compact"
                        onClick={onApply}
                        disabled={!canApply}
                    />
                )}
            </div>

            {partyLedgerId == null ? (
                <Message severity="info" text="Select a party ledger to load loyalty balance." className="mt-2" />
            ) : null}
            {error ? <Message severity="warn" text={error} className="mt-2" /> : null}
            {partyLedgerId != null && !loading && !error && !summary ? (
                <Message severity="info" text="No active loyalty program was found for this party." className="mt-2" />
            ) : null}
            {summary && !summary.canRedeem && !error ? (
                <Message severity="info" text="This party does not currently meet the minimum loyalty redemption rules." className="mt-2" />
            ) : null}

            {value ? (
                <div className="grid formgrid mt-2">
                    <div className="col-12 md:col-3">
                        <label className="app-form-label">Redeem Points</label>
                        <InputNumber
                            value={value.pointsRedeemed}
                            onValueChange={(event) => onChange({ pointsRedeemed: Number(event.value ?? 0) })}
                            min={0}
                            minFractionDigits={0}
                            maxFractionDigits={2}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="app-form-label">Apply Amount</label>
                        <InputNumber
                            value={value.amountApplied}
                            onValueChange={(event) => onChange({ amountApplied: Number(event.value ?? 0) })}
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            disabled={disabled}
                            inputClassName="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="app-form-label">Notes</label>
                        <AppInput
                            value={value.notes}
                            onChange={(event) => onChange({ notes: event.target.value })}
                            className="w-full"
                            disabled={disabled}
                        />
                    </div>
                    {minimumRedeemPoints != null && minimumRedeemPoints > 0 ? (
                        <div className="col-12 md:col-3 text-600">Minimum redeem: {formatPoints(minimumRedeemPoints)} pts</div>
                    ) : null}
                    {valuePerPoint != null && valuePerPoint > 0 ? (
                        <div className="col-12 md:col-3 text-600">Value per point: {formatAmount(valuePerPoint)}</div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
