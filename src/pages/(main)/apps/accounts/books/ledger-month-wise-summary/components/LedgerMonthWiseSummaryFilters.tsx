import React from 'react';
import type { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import AppDateInput from '@/components/AppDateInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import type { LedgerGroupOption } from '@/lib/accounts/ledgerGroups';
import type { DateRangeErrors } from '@/lib/reportDateValidation';
import type { LedgerLookupOption } from '../types';

type LedgerMonthWiseSummaryFiltersProps = {
    fromDate: Date | null;
    toDate: Date | null;
    onFromDateChange: (value: Date | null) => void;
    onToDateChange: (value: Date | null) => void;
    dateErrors: DateRangeErrors;
    fiscalYearStartDate: Date | null;
    fiscalYearEndDate: Date | null;
    fromDateInputRef: React.RefObject<HTMLInputElement>;
    toDateInputRef: React.RefObject<HTMLInputElement>;
    onFromDateEnterNext: () => void;
    onToDateEnterNext: () => void;
    ledgerGroupId: number | null;
    ledgerGroupOptions: LedgerGroupOption[];
    groupsLoading: boolean;
    onLedgerGroupChange: (value: number | null) => void;
    onLedgerGroupSelectNext: () => void;
    ledgerGroupInputRef: React.RefObject<AutoComplete>;
    ledgerQuery: string;
    selectedLedger: LedgerLookupOption | null;
    ledgerSuggestions: LedgerLookupOption[];
    showLedgerSpinner: boolean;
    onLedgerComplete: (event: AutoCompleteCompleteEvent) => void;
    onLedgerDropdownClick: () => void;
    onLedgerChange: (event: AutoCompleteChangeEvent) => void;
    onLedgerShow: () => void;
    onLedgerHide: () => void;
    onLedgerKeyDown: (event: React.KeyboardEvent) => void;
    onLedgerPreview: (ledger: LedgerLookupOption | null) => void;
    ledgerInputRef: React.RefObject<HTMLInputElement>;
    displayLedger: LedgerLookupOption | null;
    currentBalanceLabel: string | null;
    currentBalanceSeverity: 'success' | 'warning' | 'danger';
    showBalanceBadges: boolean;
};

export const LedgerMonthWiseSummaryFilters = ({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    dateErrors,
    fiscalYearStartDate,
    fiscalYearEndDate,
    fromDateInputRef,
    toDateInputRef,
    onFromDateEnterNext,
    onToDateEnterNext,
    ledgerGroupId,
    ledgerGroupOptions,
    groupsLoading,
    onLedgerGroupChange,
    onLedgerGroupSelectNext,
    ledgerGroupInputRef,
    ledgerQuery,
    selectedLedger,
    ledgerSuggestions,
    showLedgerSpinner,
    onLedgerComplete,
    onLedgerDropdownClick,
    onLedgerChange,
    onLedgerShow,
    onLedgerHide,
    onLedgerKeyDown,
    onLedgerPreview,
    ledgerInputRef,
    displayLedger,
    currentBalanceLabel,
    currentBalanceSeverity,
    showBalanceBadges
}: LedgerMonthWiseSummaryFiltersProps) => (
    <div className="flex flex-column gap-2 w-full">
        <div className="flex align-items-center gap-2 flex-wrap">
            <AppDateInput
                value={fromDate}
                onChange={onFromDateChange}
                placeholder="From date"
                fiscalYearStart={fiscalYearStartDate}
                fiscalYearEnd={fiscalYearEndDate}
                autoFocus
                selectOnFocus
                inputRef={fromDateInputRef}
                onEnterNext={onFromDateEnterNext}
                style={{ width: '150px' }}
            />
            <AppDateInput
                value={toDate}
                onChange={onToDateChange}
                placeholder="To date"
                fiscalYearStart={fiscalYearStartDate}
                fiscalYearEnd={fiscalYearEndDate}
                inputRef={toDateInputRef}
                onEnterNext={onToDateEnterNext}
                style={{ width: '150px' }}
            />
            {(dateErrors.fromDate || dateErrors.toDate) && (
                <span className="p-error text-sm">{dateErrors.fromDate || dateErrors.toDate}</span>
            )}
            <LedgerGroupAutoComplete
                value={ledgerGroupId}
                options={ledgerGroupOptions}
                loading={groupsLoading}
                onChange={(nextValue) => onLedgerGroupChange(nextValue)}
                placeholder="Select group"
                loadingPlaceholder="Loading groups..."
                onSelectNext={onLedgerGroupSelectNext}
                inputId="ledger-group-autocomplete"
                ref={ledgerGroupInputRef}
                style={{ minWidth: '200px' }}
            />
            <LedgerAutoComplete
                value={selectedLedger ?? ledgerQuery}
                suggestions={ledgerSuggestions}
                completeMethod={onLedgerComplete}
                onDropdownClick={onLedgerDropdownClick}
                onChange={onLedgerChange}
                itemTemplate={(option: LedgerLookupOption) => (
                    <span data-ledger-id={option.ledgerId} onMouseEnter={() => onLedgerPreview(option)}>
                        {option.label}
                    </span>
                )}
                field="label"
                loading={showLedgerSpinner}
                showEmptyMessage
                placeholder={showLedgerSpinner ? 'Loading ledgers...' : 'Select ledger'}
                inputId="ledger-autocomplete"
                onShow={onLedgerShow}
                onHide={onLedgerHide}
                onKeyDown={onLedgerKeyDown}
                virtualScrollerOptions={{ itemSize: 36 }}
                inputRef={ledgerInputRef}
                style={{ minWidth: '260px' }}
            />
            {displayLedger && (
                <LedgerMetaPanel
                    address={displayLedger.address}
                    balanceLabel={currentBalanceLabel ?? null}
                    balanceSeverity={currentBalanceSeverity}
                    showBalance={showBalanceBadges}
                />
            )}
        </div>
    </div>
);
