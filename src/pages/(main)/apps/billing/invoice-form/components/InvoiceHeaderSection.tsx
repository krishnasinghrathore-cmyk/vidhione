import React from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import type { LedgerOption, LedgerSummary } from '../../useLedgerLookup';
import type {
    InvoiceHeaderDraft,
    InvoiceMode,
    PlaceOfSupplyMode,
    PriceListType,
    WarehouseOption
} from '../types';

type InvoiceHeaderSectionProps = {
    header: InvoiceHeaderDraft;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    ledgerOptions: LedgerOption[];
    ledgerById: Map<number, LedgerSummary>;
    ledgerLoading: boolean;
    warehouseOptions: WarehouseOption[];
    onHeaderChange: (patch: Partial<InvoiceHeaderDraft>) => void;
    headerErrors: string[];
};

const focusById = (id: string) => {
    if (typeof document === 'undefined') return;
    const element = document.getElementById(id) as HTMLElement | null;
    element?.focus();
};

export function InvoiceHeaderSection({
    header,
    fiscalYearStart,
    fiscalYearEnd,
    ledgerOptions,
    ledgerById,
    ledgerLoading,
    warehouseOptions,
    onHeaderChange,
    headerErrors
}: InvoiceHeaderSectionProps) {
    const selectedLedger = header.partyLedgerId ? ledgerById.get(header.partyLedgerId) ?? null : null;

    return (
        <div className="grid">
            <div className="col-12 md:col-3">
                <div className="flex flex-column gap-2">
                    <small className="text-500">Voucher Date</small>
                    <AppDateInput
                        value={header.voucherDate}
                        onChange={(nextValue) => onHeaderChange({ voucherDate: nextValue })}
                        fiscalYearStart={fiscalYearStart}
                        fiscalYearEnd={fiscalYearEnd}
                        onEnterNext={() => focusById('invoice-voucher-number')}
                    />
                </div>
            </div>

            <div className="col-12 md:col-3">
                <span className="p-float-label">
                    <InputText
                        id="invoice-voucher-number"
                        value={header.voucherNumber}
                        onChange={(event) => onHeaderChange({ voucherNumber: event.target.value })}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            focusById('invoice-party-ledger');
                        }}
                    />
                    <label htmlFor="invoice-voucher-number">Voucher Number</label>
                </span>
            </div>

            <div className="col-12 md:col-3">
                <small className="text-500 block mb-2">Invoice Type</small>
                <div className="flex gap-2">
                    {(['B2C', 'B2B'] as InvoiceMode[]).map((mode) => (
                        <Button
                            key={mode}
                            type="button"
                            label={mode}
                            outlined={header.invoiceMode !== mode}
                            size="small"
                            onClick={() => onHeaderChange({ invoiceMode: mode })}
                        />
                    ))}
                </div>
            </div>

            <div className="col-12 md:col-3">
                <small className="text-500 block mb-2">Place of Supply</small>
                <AppDropdown
                    value={header.placeOfSupply}
                    options={[
                        { label: 'In-State', value: 'in_state' satisfies PlaceOfSupplyMode },
                        { label: 'Other-State', value: 'other_state' satisfies PlaceOfSupplyMode }
                    ]}
                    onChange={(event) => onHeaderChange({ placeOfSupply: (event.value as PlaceOfSupplyMode) ?? 'in_state' })}
                    className="w-full"
                />
            </div>

            <div className="col-12 md:col-4">
                <small className="text-500 block mb-2">Party Ledger</small>
                <AppDropdown
                    inputId="invoice-party-ledger"
                    value={header.partyLedgerId}
                    options={ledgerOptions}
                    onChange={(event) => {
                        const nextId = (event.value as number) ?? null;
                        const ledger = nextId ? ledgerById.get(nextId) ?? null : null;
                        const gstin = ledger?.gstNumber?.trim() ?? '';
                        onHeaderChange({
                            partyLedgerId: nextId,
                            partyName: ledger?.name ?? '',
                            partyGstin: gstin,
                            invoiceMode: gstin ? 'B2B' : 'B2C'
                        });
                    }}
                    placeholder={ledgerLoading ? 'Loading ledgers…' : 'Select party ledger'}
                    filter
                    showClear
                    className="w-full"
                    onEnterNext={() => focusById('invoice-party-name')}
                />
            </div>

            <div className="col-12 md:col-4">
                <span className="p-float-label">
                    <InputText
                        id="invoice-party-name"
                        value={header.partyName}
                        onChange={(event) => onHeaderChange({ partyName: event.target.value })}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            focusById('invoice-price-list');
                        }}
                    />
                    <label htmlFor="invoice-party-name">Party Name</label>
                </span>
            </div>

            <div className="col-12 md:col-4">
                <span className="p-float-label">
                    <InputText id="invoice-party-gstin" value={header.partyGstin} disabled />
                    <label htmlFor="invoice-party-gstin">GSTIN</label>
                </span>
            </div>

            <div className="col-12 md:col-4">
                <small className="text-500 block mb-2">Price List</small>
                <AppDropdown
                    inputId="invoice-price-list"
                    value={header.priceList}
                    options={[
                        { label: 'Retail', value: 'retail' satisfies PriceListType },
                        { label: 'Wholesale', value: 'wholesale' satisfies PriceListType }
                    ]}
                    onChange={(event) => onHeaderChange({ priceList: (event.value as PriceListType) ?? 'retail' })}
                    className="w-full"
                    onEnterNext={() => focusById('invoice-default-warehouse')}
                />
            </div>

            <div className="col-12 md:col-4">
                <small className="text-500 block mb-2">Default Warehouse</small>
                <AppDropdown
                    inputId="invoice-default-warehouse"
                    value={header.warehouseId}
                    options={warehouseOptions}
                    onChange={(event) => onHeaderChange({ warehouseId: (event.value as number) ?? null })}
                    placeholder="Select warehouse"
                    showClear
                    className="w-full"
                    onEnterNext={() => focusById('invoice-remarks')}
                />
            </div>

            <div className="col-12 md:col-4">
                <div className="text-500 text-sm mt-3">
                    {(selectedLedger?.address || '').trim()}
                    {selectedLedger?.cityName ? ` ${selectedLedger.cityName}` : ''}
                    {selectedLedger?.stateName ? `, ${selectedLedger.stateName}` : ''}
                </div>
            </div>

            <div className="col-12">
                <span className="p-float-label">
                    <InputText
                        id="invoice-remarks"
                        value={header.remarks}
                        onChange={(event) => onHeaderChange({ remarks: event.target.value })}
                    />
                    <label htmlFor="invoice-remarks">Remarks</label>
                </span>
            </div>

            {headerErrors.length > 0 && (
                <div className="col-12">
                    <div className="p-2 border-1 border-red-300 border-round bg-red-50 text-red-700">
                        {headerErrors.join(' ')}
                    </div>
                </div>
            )}
        </div>
    );
}
