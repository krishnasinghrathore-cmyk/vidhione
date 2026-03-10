import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { formatAmount } from '../../helpers';
import type { InvoiceGiftCertificateApplicationDraft } from '../types';

type GiftCertificateOption = {
    label: string;
    value: string;
    certificateCode: string;
    balanceAmount: number;
    status: string;
};

type InvoiceGiftCertificateSectionProps = {
    lines: InvoiceGiftCertificateApplicationDraft[];
    certificateOptions: GiftCertificateOption[];
    loading?: boolean;
    error?: string | null;
    partyLedgerId: number | null;
    disabled?: boolean;
    onAddLine: () => void;
    onSelectCertificate: (lineKey: string, giftCertificateId: string | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceGiftCertificateApplicationDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
};

const formatStatus = (value: string | null | undefined) => {
    const text = (value ?? '').trim();
    if (!text) return '-';
    return text
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};

export function InvoiceGiftCertificateSection({
    lines,
    certificateOptions,
    loading = false,
    error = null,
    partyLedgerId,
    disabled = false,
    onAddLine,
    onSelectCertificate,
    onLineChange,
    onDeleteLine
}: InvoiceGiftCertificateSectionProps) {
    const totalApplied = lines.reduce((sum, line) => sum + Number(line.redeemedAmount ?? 0), 0);
    const canAddLine = !disabled && partyLedgerId != null;

    return (
        <div className="app-entry-section app-entry-section--details">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="flex align-items-center gap-2 flex-wrap">
                    <h4 className="m-0">Gift Certificates</h4>
                    <span className="invoice-form-status-chip">Applied: {formatAmount(totalApplied)}</span>
                    {loading ? <span className="invoice-form-status-chip">Loading</span> : null}
                </div>
                <Button
                    type="button"
                    icon="pi pi-plus"
                    label="Add Certificate"
                    outlined
                    className="app-action-compact"
                    onClick={onAddLine}
                    disabled={!canAddLine}
                />
            </div>

            {partyLedgerId == null ? (
                <Message severity="info" text="Select a party ledger to load gift certificates." className="mt-2" />
            ) : null}
            {error ? <Message severity="warn" text={error} className="mt-2" /> : null}
            {partyLedgerId != null && !loading && certificateOptions.length === 0 ? (
                <Message severity="info" text="No active or partially used gift certificates were found for this party." className="mt-2" />
            ) : null}

            <DataTable
                value={lines}
                dataKey="key"
                className="mt-2"
                responsiveLayout="scroll"
                emptyMessage={partyLedgerId == null ? 'Select a party to manage gift certificates.' : 'No gift certificates added.'}
            >
                <Column
                    header="Certificate"
                    body={(row: InvoiceGiftCertificateApplicationDraft) => (
                        <AppDropdown
                            value={row.giftCertificateId || null}
                            options={certificateOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => onSelectCertificate(row.key, event.value ? String(event.value) : null)}
                            placeholder={loading ? 'Loading certificates' : 'Select certificate'}
                            filter
                            showClear
                            className="w-full"
                            disabled={disabled || partyLedgerId == null}
                        />
                    )}
                    style={{ minWidth: '18rem' }}
                />
                <Column
                    header="Balance"
                    body={(row: InvoiceGiftCertificateApplicationDraft) => (
                        <span>{row.balanceAmount != null ? formatAmount(row.balanceAmount) : '-'}</span>
                    )}
                    style={{ width: '10rem' }}
                />
                <Column
                    header="Apply Amount"
                    body={(row: InvoiceGiftCertificateApplicationDraft) => (
                        <InputNumber
                            value={row.redeemedAmount}
                            onValueChange={(event) =>
                                onLineChange(row.key, {
                                    redeemedAmount: Math.max(0, Number(event.value ?? 0))
                                })
                            }
                            min={0}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            disabled={disabled || !row.giftCertificateId}
                            inputClassName="w-full"
                        />
                    )}
                    style={{ width: '11rem' }}
                />
                <Column
                    header="Status"
                    body={(row: InvoiceGiftCertificateApplicationDraft) => <span>{formatStatus(row.status)}</span>}
                    style={{ width: '9rem' }}
                />
                <Column
                    header="Notes"
                    body={(row: InvoiceGiftCertificateApplicationDraft) => (
                        <AppInput
                            value={row.notes}
                            onChange={(event) => onLineChange(row.key, { notes: event.target.value })}
                            className="w-full"
                            disabled={disabled || partyLedgerId == null}
                        />
                    )}
                    style={{ minWidth: '16rem' }}
                />
                <Column
                    header=""
                    body={(row: InvoiceGiftCertificateApplicationDraft) => (
                        <Button
                            type="button"
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            className="app-action-compact"
                            onClick={() => onDeleteLine(row.key)}
                            disabled={disabled}
                        />
                    )}
                    style={{ width: '4rem' }}
                />
            </DataTable>
        </div>
    );
}
