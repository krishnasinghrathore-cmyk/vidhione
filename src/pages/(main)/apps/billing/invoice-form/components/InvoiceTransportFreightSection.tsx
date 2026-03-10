import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import AppDropdown from '@/components/AppDropdown';
import { formatAmount } from '../../helpers';

type InvoiceTransportDraft = {
    isApplied: boolean;
    transporterId: number | null;
    freightLedgerId: number | null;
    freightAmount: number;
    freightTaxLedgerId: number | null;
};

type TransporterOption = {
    label: string;
    value: number;
};

type LedgerOption = {
    label: string;
    value: number;
    address: string | null;
};

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
    taxRate: number;
};

type InvoiceTransportFreightSectionProps = {
    transportDraft: InvoiceTransportDraft;
    transporterOptions: TransporterOption[];
    ledgerOptions: LedgerOption[];
    taxLedgerOptions: TaxLedgerOption[];
    showTransporterField: boolean;
    requireTransporterWhenApplied: boolean;
    freightTaxRate: number;
    freightTaxAmount: number;
    freightTotalAmount: number;
    disabled?: boolean;
    onDraftChange: (patch: Partial<InvoiceTransportDraft>) => void;
    onApply: () => void;
    onClear: () => void;
};

const openTransporterMaster = () => {
    if (typeof window === 'undefined') return;
    window.open('/apps/inventory/transporters', '_blank', 'noopener,noreferrer');
};

export function InvoiceTransportFreightSection({
    transportDraft,
    transporterOptions,
    ledgerOptions,
    taxLedgerOptions,
    showTransporterField,
    requireTransporterWhenApplied,
    freightTaxRate,
    freightTaxAmount,
    freightTotalAmount,
    disabled = false,
    onDraftChange,
    onApply,
    onClear
}: InvoiceTransportFreightSectionProps) {
    const hasTransporterSelection = !showTransporterField || transportDraft.transporterId != null;
    const canApply =
        transportDraft.isApplied &&
        transportDraft.freightLedgerId != null &&
        Number(transportDraft.freightAmount ?? 0) > 0 &&
        (!requireTransporterWhenApplied || hasTransporterSelection) &&
        !disabled;

    return (
        <div className="app-entry-section app-entry-section--details invoice-transport-freight-section">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="flex align-items-center gap-3 flex-wrap">
                    <h4 className="m-0">Transport Freight</h4>
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="invoice-transport-applied"
                            checked={transportDraft.isApplied}
                            onChange={(event) => onDraftChange({ isApplied: Boolean(event.checked) })}
                            disabled={disabled}
                        />
                        <label htmlFor="invoice-transport-applied">Apply transport in this invoice</label>
                    </div>
                    <span className="invoice-form-status-chip">Freight+Tax: {formatAmount(freightTotalAmount)}</span>
                </div>
                <div className="flex align-items-center gap-2 flex-wrap">
                    <Button
                        type="button"
                        icon="pi pi-plus"
                        label="Apply Charges"
                        className="app-action-compact"
                        onClick={onApply}
                        disabled={!canApply}
                    />
                    <Button
                        type="button"
                        icon="pi pi-times"
                        label="Clear"
                        className="app-action-compact p-button-outlined"
                        onClick={onClear}
                        disabled={disabled}
                    />
                    <Button
                        type="button"
                        icon="pi pi-external-link"
                        label="Transporters"
                        className="app-action-compact p-button-outlined"
                        onClick={openTransporterMaster}
                        disabled={disabled}
                    />
                </div>
            </div>

            <div className="invoice-transport-freight-grid mt-3">
                {showTransporterField ? (
                    <div className="invoice-transport-freight-grid__field">
                        <label className="invoice-transport-freight-grid__label" htmlFor="invoice-transport-transporter">
                            Transporter {requireTransporterWhenApplied ? '*' : ''}
                        </label>
                        <AppDropdown
                            inputId="invoice-transport-transporter"
                            value={transportDraft.transporterId}
                            options={transporterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) =>
                                onDraftChange({
                                    transporterId: event.value != null ? Number(event.value) : null
                                })
                            }
                            placeholder="Select transporter"
                            filter
                            showClear
                            disabled={!transportDraft.isApplied || disabled}
                        />
                    </div>
                ) : null}

                <div className="invoice-transport-freight-grid__field">
                    <label className="invoice-transport-freight-grid__label" htmlFor="invoice-transport-freight-ledger">
                        Freight Ledger
                    </label>
                    <AppDropdown
                        inputId="invoice-transport-freight-ledger"
                        value={transportDraft.freightLedgerId}
                        options={ledgerOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(event) => onDraftChange({ freightLedgerId: event.value != null ? Number(event.value) : null })}
                        placeholder="Select freight ledger"
                        filter
                        showClear
                        disabled={!transportDraft.isApplied || disabled}
                    />
                </div>

                <div className="invoice-transport-freight-grid__field">
                    <label className="invoice-transport-freight-grid__label" htmlFor="invoice-transport-freight-amount">
                        Freight Amount
                    </label>
                    <InputNumber
                        inputId="invoice-transport-freight-amount"
                        value={transportDraft.freightAmount}
                        onValueChange={(event) => onDraftChange({ freightAmount: Number(event.value ?? 0) })}
                        min={0}
                        minFractionDigits={2}
                        maxFractionDigits={2}
                        disabled={!transportDraft.isApplied || disabled}
                        inputClassName="w-full"
                    />
                </div>

                <div className="invoice-transport-freight-grid__field">
                    <label className="invoice-transport-freight-grid__label" htmlFor="invoice-transport-freight-tax-ledger">
                        Freight Tax Ledger
                    </label>
                    <AppDropdown
                        inputId="invoice-transport-freight-tax-ledger"
                        value={transportDraft.freightTaxLedgerId}
                        options={taxLedgerOptions}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(event) => onDraftChange({ freightTaxLedgerId: event.value != null ? Number(event.value) : null })}
                        placeholder="Select freight tax ledger"
                        filter
                        showClear
                        disabled={!transportDraft.isApplied || disabled}
                    />
                </div>

                <div className="invoice-transport-freight-grid__field">
                    <label className="invoice-transport-freight-grid__label">Tax %</label>
                    <div className="invoice-transport-freight-grid__readonly">{freightTaxRate.toFixed(2)}%</div>
                </div>

                <div className="invoice-transport-freight-grid__field">
                    <label className="invoice-transport-freight-grid__label">Tax Amount</label>
                    <div className="invoice-transport-freight-grid__readonly">{formatAmount(freightTaxAmount)}</div>
                </div>

                <div className="invoice-transport-freight-grid__field">
                    <label className="invoice-transport-freight-grid__label">Freight + Tax</label>
                    <div className="invoice-transport-freight-grid__readonly invoice-transport-freight-grid__readonly--strong">
                        {formatAmount(freightTotalAmount)}
                    </div>
                </div>
            </div>
        </div>
    );
}
