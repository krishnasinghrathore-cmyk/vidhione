import type React from 'react';
import type { AutoComplete } from 'primereact/autocomplete';
import type { Dropdown } from 'primereact/dropdown';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import VoucherTypeAutoComplete from '@/components/VoucherTypeAutoComplete';
import type { VoucherTypeOption } from '@/lib/accounts/voucherTypes';
import type { DateRangeErrors } from '@/lib/reportDateValidation';

import type { EntryType } from '../types';
import {
    BALANCE_STATUS_DROPDOWN_OPTIONS,
    ENTRY_TYPE_DROPDOWN_OPTIONS,
    RCM_DROPDOWN_OPTIONS,
    TAX_TYPE_DROPDOWN_OPTIONS
} from '../utils';

type TrialBalanceReportFiltersProps = {
    fromDate: Date | null;
    toDate: Date | null;
    onFromDateChange: (value: Date | null) => void;
    onToDateChange: (value: Date | null) => void;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    fromDateInputRef: React.RefObject<HTMLInputElement>;
    toDateInputRef: React.RefObject<HTMLInputElement>;
    voucherTypeInputRef: React.RefObject<AutoComplete>;
    onFromDateEnterNext: () => void;
    onToDateEnterNext: () => void;
    dateErrors: DateRangeErrors;
    voucherTypeId: number | null;
    voucherTypeOptions: VoucherTypeOption[];
    voucherTypesLoading: boolean;
    onVoucherTypeChange: (value: number | null) => void;
    onVoucherTypeSelectNext: () => void;
    balanceStatus: number;
    onBalanceStatusChange: (value: number) => void;
    onBalanceStatusKeyDown: React.KeyboardEventHandler<HTMLElement>;
    balanceStatusRef: React.RefObject<Dropdown>;
    entryType: EntryType;
    onEntryTypeChange: (value: EntryType) => void;
    onEntryTypeKeyDown: React.KeyboardEventHandler<HTMLElement>;
    entryTypeRef: React.RefObject<Dropdown>;
    taxType: number;
    onTaxTypeChange: (value: number) => void;
    onTaxTypeKeyDown: React.KeyboardEventHandler<HTMLElement>;
    taxTypeRef: React.RefObject<Dropdown>;
    rcmStatus: number;
    onRcmStatusChange: (value: number) => void;
    onRcmKeyDown: React.KeyboardEventHandler<HTMLElement>;
    rcmRef: React.RefObject<Dropdown>;
};

export function TrialBalanceReportFilters({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    fiscalYearStart,
    fiscalYearEnd,
    fromDateInputRef,
    toDateInputRef,
    voucherTypeInputRef,
    onFromDateEnterNext,
    onToDateEnterNext,
    dateErrors,
    voucherTypeId,
    voucherTypeOptions,
    voucherTypesLoading,
    onVoucherTypeChange,
    onVoucherTypeSelectNext,
    balanceStatus,
    onBalanceStatusChange,
    onBalanceStatusKeyDown,
    balanceStatusRef,
    entryType,
    onEntryTypeChange,
    onEntryTypeKeyDown,
    entryTypeRef,
    taxType,
    onTaxTypeChange,
    onTaxTypeKeyDown,
    taxTypeRef,
    rcmStatus,
    onRcmStatusChange,
    onRcmKeyDown,
    rcmRef
}: TrialBalanceReportFiltersProps) {
    return (
        <div className="flex flex-column gap-2">
            <div className="flex flex-wrap align-items-center gap-2">
                <AppDateInput
                    value={fromDate}
                    onChange={onFromDateChange}
                    placeholder="From date"
                    fiscalYearStart={fiscalYearStart}
                    fiscalYearEnd={fiscalYearEnd}
                    autoFocus
                    selectOnFocus
                    inputId="trial-balance-from-date"
                    inputRef={fromDateInputRef}
                    onEnterNext={onFromDateEnterNext}
                    style={{ width: '150px' }}
                />
                <AppDateInput
                    value={toDate}
                    onChange={onToDateChange}
                    placeholder="To date"
                    fiscalYearStart={fiscalYearStart}
                    fiscalYearEnd={fiscalYearEnd}
                    inputId="trial-balance-to-date"
                    inputRef={toDateInputRef}
                    onEnterNext={onToDateEnterNext}
                    style={{ width: '150px' }}
                />
            </div>
            {(dateErrors.fromDate || dateErrors.toDate) && (
                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
            )}
            <div className="flex flex-wrap align-items-center gap-2">
                <VoucherTypeAutoComplete
                    value={voucherTypeId}
                    options={voucherTypeOptions}
                    loading={voucherTypesLoading}
                    onChange={(nextValue) => onVoucherTypeChange(nextValue)}
                    placeholder="Voucher type"
                    loadingPlaceholder="Loading voucher types..."
                    onSelectNext={onVoucherTypeSelectNext}
                    inputId="trial-balance-voucher-type"
                    ref={voucherTypeInputRef}
                    style={{ minWidth: '200px' }}
                />
            </div>
            <div className="flex flex-wrap align-items-start gap-3">
                <fieldset className="ledger-report-group">
                    <legend>Balance Status</legend>
                    <div className="flex flex-wrap align-items-center gap-2">
                        <AppDropdown
                            value={balanceStatus === 0 ? null : balanceStatus}
                            options={BALANCE_STATUS_DROPDOWN_OPTIONS}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="All"
                            showClear
                            ref={balanceStatusRef}
                            onChange={(event) => onBalanceStatusChange((event.value ?? 0) as number)}
                            onKeyDown={onBalanceStatusKeyDown}
                            style={{ minWidth: '220px' }}
                        />
                    </div>
                </fieldset>
                <fieldset className="ledger-report-group">
                    <legend>Tax Entry Type</legend>
                    <div className="flex flex-wrap align-items-center gap-2">
                        <AppDropdown
                            value={entryType === 'all' ? null : entryType}
                            options={ENTRY_TYPE_DROPDOWN_OPTIONS}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="All"
                            showClear
                            ref={entryTypeRef}
                            onChange={(event) => onEntryTypeChange((event.value ?? 'all') as EntryType)}
                            onKeyDown={onEntryTypeKeyDown}
                            style={{ minWidth: '200px' }}
                        />
                    </div>
                </fieldset>
                <fieldset className="ledger-report-group">
                    <legend>Tax Type</legend>
                    <div className="flex flex-wrap align-items-center gap-2">
                        <AppDropdown
                            value={taxType === -1 ? null : taxType}
                            options={TAX_TYPE_DROPDOWN_OPTIONS}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="ALL"
                            showClear
                            ref={taxTypeRef}
                            onChange={(event) => onTaxTypeChange((event.value ?? -1) as number)}
                            onKeyDown={onTaxTypeKeyDown}
                            style={{ minWidth: '180px' }}
                        />
                    </div>
                </fieldset>
                <fieldset className="ledger-report-group">
                    <legend>RCM</legend>
                    <div className="flex flex-wrap align-items-center gap-2">
                        <AppDropdown
                            value={rcmStatus === -1 ? null : rcmStatus}
                            options={RCM_DROPDOWN_OPTIONS}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="All"
                            showClear
                            ref={rcmRef}
                            onChange={(event) => onRcmStatusChange((event.value ?? -1) as number)}
                            onKeyDown={onRcmKeyDown}
                            style={{ minWidth: '160px' }}
                        />
                    </div>
                </fieldset>
            </div>
        </div>
    );
}
