import React from 'react';
import AppDropdown from '@/components/AppDropdown';
import type { AgencyOptionsFormState } from './useAgencyOptionsForm';

type LedgerOption = { label: string; value: number | null };

type Props = {
    form: AgencyOptionsFormState;
    ledgerSelectOptions: LedgerOption[];
    ledgerLoading: boolean;
    onChange: (patch: Partial<AgencyOptionsFormState>) => void;
};

export const LedgerDefaultsSection = ({ form, ledgerSelectOptions, ledgerLoading, onChange }: Props) => {
    const placeholder = ledgerLoading ? 'Loading ledgers...' : 'Select ledger';

    return (
        <>
            <h3 className="mt-0">Ledger Defaults</h3>
            <div className="formgrid grid">
                <div className="field col-12 md:col-6">
                    <label htmlFor="discountLedger">Discount Ledger</label>
                    <AppDropdown
                        id="discountLedger"
                        value={form.discountLedgerId}
                        options={ledgerSelectOptions}
                        onChange={(e) => onChange({ discountLedgerId: e.value ?? null })}
                        placeholder={placeholder}
                        showClear
                        filter
                        loading={ledgerLoading}
                        showLoadingIcon
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="chequeCancelLedger">Cheque Cancel Ledger</label>
                    <AppDropdown
                        id="chequeCancelLedger"
                        value={form.chequeCancelLedgerId}
                        options={ledgerSelectOptions}
                        onChange={(e) => onChange({ chequeCancelLedgerId: e.value ?? null })}
                        placeholder={placeholder}
                        showClear
                        filter
                        loading={ledgerLoading}
                        showLoadingIcon
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="roundOffLedger">Round Off Ledger</label>
                    <AppDropdown
                        id="roundOffLedger"
                        value={form.roundOffLedgerId}
                        options={ledgerSelectOptions}
                        onChange={(e) => onChange({ roundOffLedgerId: e.value ?? null })}
                        placeholder={placeholder}
                        showClear
                        filter
                        loading={ledgerLoading}
                        showLoadingIcon
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="defaultExpenditureLedger">Default Expenditure Ledger</label>
                    <AppDropdown
                        id="defaultExpenditureLedger"
                        value={form.defaultExpenditureLedgerId}
                        options={ledgerSelectOptions}
                        onChange={(e) => onChange({ defaultExpenditureLedgerId: e.value ?? null })}
                        placeholder={placeholder}
                        showClear
                        filter
                        loading={ledgerLoading}
                        showLoadingIcon
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="defaultStockLedger">Default Stock Ledger</label>
                    <AppDropdown
                        id="defaultStockLedger"
                        value={form.defaultStockLedgerId}
                        options={ledgerSelectOptions}
                        onChange={(e) => onChange({ defaultStockLedgerId: e.value ?? null })}
                        placeholder={placeholder}
                        showClear
                        filter
                        loading={ledgerLoading}
                        showLoadingIcon
                    />
                </div>
            </div>
        </>
    );
};
