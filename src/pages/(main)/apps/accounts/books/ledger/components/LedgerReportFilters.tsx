import React from 'react';
import { type AutoComplete, type AutoCompleteChangeEvent, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { RadioButton } from 'primereact/radiobutton';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppDateInput from '@/components/AppDateInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import VoucherTypeAutoComplete from '@/components/VoucherTypeAutoComplete';
import type { LedgerGroupOption } from '@/lib/accounts/ledgerGroups';
import type { VoucherTypeOption } from '@/lib/accounts/voucherTypes';
import type { DateRangeErrors } from '@/lib/reportDateValidation';
import type { LedgerLookupOption, SelectOption } from '../types';

type LedgerFetchArgs = {
    search?: string | null;
    groupId?: number | null;
    mode?: 'all' | 'search';
};

type LedgerReportFiltersProps = {
    fromDate: Date | null;
    toDate: Date | null;
    onFromDateChange: (value: Date | null) => void;
    onToDateChange: (value: Date | null) => void;
    fiscalYearStartDate: Date | null;
    fiscalYearEndDate: Date | null;
    fromDateInputRef: React.RefObject<HTMLInputElement>;
    toDateInputRef: React.RefObject<HTMLInputElement>;
    dateErrors: DateRangeErrors;
    todayInputRef: React.RefObject<HTMLInputElement>;
    todayOnly: boolean;
    onTodayToggle: (value: boolean) => void;
    focusTodayInputNext: () => void;
    focusLedgerGroupInput: () => void;
    ledgerGroupId: number | null;
    ledgerGroupOptions: LedgerGroupOption[];
    groupsLoading: boolean;
    onLedgerGroupChange: (value: number | null) => void;
    focusCityInput: () => void;
    ledgerGroupInputRef: React.RefObject<AutoComplete>;
    cityAutoCompleteRef: React.RefObject<AutoComplete>;
    cityQuery: string;
    setCityQuery: React.Dispatch<React.SetStateAction<string>>;
    selectedCity: SelectOption | null;
    setSelectedCity: React.Dispatch<React.SetStateAction<SelectOption | null>>;
    citySuggestions: SelectOption[];
    setCitySuggestions: React.Dispatch<React.SetStateAction<SelectOption[]>>;
    cityOptions: SelectOption[];
    onCityChange: (value: number | null) => void;
    cityPanelOpen: boolean;
    setCityPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    cityEnterRef: React.MutableRefObject<boolean>;
    focusLedgerInput: () => void;
    cityId: number | null;
    citiesLoading: boolean;
    cityInputRef: React.RefObject<HTMLInputElement>;
    selectedLedger: LedgerLookupOption | null;
    setSelectedLedger: React.Dispatch<React.SetStateAction<LedgerLookupOption | null>>;
    ledgerQuery: string;
    setLedgerQuery: React.Dispatch<React.SetStateAction<string>>;
    ledgerSuggestions: LedgerLookupOption[];
    setLedgerSuggestions: React.Dispatch<React.SetStateAction<LedgerLookupOption[]>>;
    ledgerOptions: LedgerLookupOption[];
    fetchLedgers: (args?: LedgerFetchArgs) => Promise<void>;
    ledgerGroupFetchGroupId: number | null;
    ledgerEnterRef: React.MutableRefObject<boolean>;
    clearAppliedFilters: () => void;
    resetLedgerSelection: () => void;
    setPreviewLedger: React.Dispatch<React.SetStateAction<LedgerLookupOption | null>>;
    setLedgerId: React.Dispatch<React.SetStateAction<number | null>>;
    focusVoucherTypeInput: () => void;
    showLedgerSpinner: boolean;
    syncLedgerPreviewFromHighlight: () => void;
    ledgerInputRef: React.RefObject<HTMLInputElement>;
    setLedgerPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    ledgerPanelOpen: boolean;
    displayLedger: LedgerLookupOption | null;
    currentBalanceLabel: string | null;
    currentBalanceSeverity: 'success' | 'warning' | 'info' | 'danger' | 'secondary';
    currentBalanceTooltip: string | null;
    showBalanceBadges: boolean;
    voucherTypeId: number | null;
    voucherTypeOptions: VoucherTypeOption[];
    voucherTypesLoading: boolean;
    onVoucherTypeChange: (value: number | null) => void;
    focusDetailViewInput: () => void;
    voucherTypeInputRef: React.RefObject<AutoComplete>;
    reportFormat: 1 | 2;
    setReportFormat: React.Dispatch<React.SetStateAction<1 | 2>>;
    detailViewInputRef: React.RefObject<HTMLInputElement>;
    detailView: boolean;
    setDetailView: React.Dispatch<React.SetStateAction<boolean>>;
    showNarration: boolean;
    setShowNarration: React.Dispatch<React.SetStateAction<boolean>>;
    openingBalanceAbove: boolean;
    setOpeningBalanceAbove: React.Dispatch<React.SetStateAction<boolean>>;
};

export function LedgerReportFilters({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    fiscalYearStartDate,
    fiscalYearEndDate,
    fromDateInputRef,
    toDateInputRef,
    dateErrors,
    todayInputRef,
    todayOnly,
    onTodayToggle,
    focusTodayInputNext,
    focusLedgerGroupInput,
    ledgerGroupId,
    ledgerGroupOptions,
    groupsLoading,
    onLedgerGroupChange,
    focusCityInput,
    ledgerGroupInputRef,
    cityAutoCompleteRef,
    cityQuery,
    setCityQuery,
    selectedCity,
    setSelectedCity,
    citySuggestions,
    setCitySuggestions,
    cityOptions,
    onCityChange,
    cityPanelOpen,
    setCityPanelOpen,
    cityEnterRef,
    focusLedgerInput,
    cityId,
    citiesLoading,
    cityInputRef,
    selectedLedger,
    setSelectedLedger,
    ledgerQuery,
    setLedgerQuery,
    ledgerSuggestions,
    setLedgerSuggestions,
    ledgerOptions,
    fetchLedgers,
    ledgerGroupFetchGroupId,
    ledgerEnterRef,
    clearAppliedFilters,
    resetLedgerSelection,
    setPreviewLedger,
    setLedgerId,
    focusVoucherTypeInput,
    showLedgerSpinner,
    syncLedgerPreviewFromHighlight,
    ledgerInputRef,
    setLedgerPanelOpen,
    ledgerPanelOpen,
    displayLedger,
    currentBalanceLabel,
    currentBalanceSeverity,
    currentBalanceTooltip,
    showBalanceBadges,
    voucherTypeId,
    voucherTypeOptions,
    voucherTypesLoading,
    onVoucherTypeChange,
    focusDetailViewInput,
    voucherTypeInputRef,
    reportFormat,
    setReportFormat,
    detailViewInputRef,
    detailView,
    setDetailView,
    showNarration,
    setShowNarration,
    openingBalanceAbove,
    setOpeningBalanceAbove
}: LedgerReportFiltersProps) {
    return (
        <div className="flex flex-column gap-2">
            <div className="flex flex-column gap-1">
                <div className="flex flex-wrap align-items-center gap-2">
                    <AppDateInput
                        value={fromDate}
                        onChange={onFromDateChange}
                        placeholder="From date"
                        fiscalYearStart={fiscalYearStartDate}
                        fiscalYearEnd={fiscalYearEndDate}
                        autoFocus
                        selectOnFocus
                        inputRef={fromDateInputRef}
                        onEnterNext={() => toDateInputRef.current?.focus()}
                        style={{ width: '150px' }}
                    />
                    <AppDateInput
                        value={toDate}
                        onChange={onToDateChange}
                        placeholder="To date"
                        fiscalYearStart={fiscalYearStartDate}
                        fiscalYearEnd={fiscalYearEndDate}
                        inputRef={toDateInputRef}
                        onEnterNext={focusTodayInputNext}
                        style={{ width: '150px' }}
                    />
                    {(dateErrors.fromDate || dateErrors.toDate) && (
                        <span className="p-error text-sm">{dateErrors.fromDate || dateErrors.toDate}</span>
                    )}
                    <div className="flex align-items-center gap-2 align-self-center">
                        <Checkbox
                            inputId="ledger-today"
                            inputRef={todayInputRef}
                            checked={todayOnly}
                            onChange={(e) => onTodayToggle(Boolean(e.checked))}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                focusLedgerGroupInput();
                            }}
                        />
                        <label htmlFor="ledger-today" className="m-0">
                            Today
                        </label>
                    </div>
                </div>
                <div className="flex flex-wrap align-items-end gap-2">
                    <LedgerGroupAutoComplete
                        value={ledgerGroupId}
                        options={ledgerGroupOptions}
                        loading={groupsLoading}
                        onChange={(nextValue) => onLedgerGroupChange(nextValue)}
                        placeholder="Ledger group"
                        loadingPlaceholder="Loading groups..."
                        onSelectNext={focusCityInput}
                        inputId="ledger-group-autocomplete"
                        ref={ledgerGroupInputRef}
                        style={{ minWidth: '220px' }}
                    />
                    <AppAutoComplete
                        ref={cityAutoCompleteRef}
                        value={cityQuery.length ? cityQuery : selectedCity}
                        suggestions={citySuggestions}
                        completeMethod={(event: AutoCompleteCompleteEvent) => {
                            const query = event.query ?? '';
                            setCityQuery(query);
                            const needle = query.trim().toLowerCase();
                            const filtered = needle
                                ? cityOptions.filter((c) => c.label.toLowerCase().includes(needle))
                                : cityOptions;
                            setCitySuggestions(filtered);
                        }}
                        onDropdownClick={() => {
                            setCitySuggestions([...cityOptions]);
                        }}
                        onChange={(event: AutoCompleteChangeEvent) => {
                            const value = event.value as SelectOption | string | null;
                            const shouldFocusLedger = cityEnterRef.current;
                            cityEnterRef.current = false;
                            if (value == null) {
                                setSelectedCity(null);
                                onCityChange(null);
                                setCityQuery('');
                                if (shouldFocusLedger) {
                                    focusLedgerInput();
                                }
                                return;
                            }
                            if (typeof value === 'string') {
                                setCityQuery(value);
                                if (!value.trim()) {
                                    setSelectedCity(null);
                                    onCityChange(null);
                                    if (shouldFocusLedger) {
                                        focusLedgerInput();
                                    }
                                }
                                if (shouldFocusLedger) {
                                    focusLedgerInput();
                                }
                                return;
                            }
                            setCityQuery('');
                            setSelectedCity(value);
                            onCityChange(value.value ?? null);
                            if (shouldFocusLedger) {
                                focusLedgerInput();
                            }
                        }}
                        onKeyDownCapture={(event) => {
                            if (event.key !== 'Enter') return;
                            if (!cityPanelOpen) return;
                            if (cityQuery.trim().length > 0) return;
                            if (typeof document === 'undefined') return;
                            const panelId = cityInputRef.current?.getAttribute('aria-controls');
                            if (!panelId) return;
                            const panel = document.getElementById(panelId);
                            const highlighted = panel?.querySelector(
                                'li[data-p-highlight="true"], li.p-highlight, li[aria-selected="true"]'
                            );
                            if (highlighted) return;
                            event.preventDefault();
                            event.stopPropagation();
                            cityAutoCompleteRef.current?.hide?.();
                            cityEnterRef.current = false;
                            focusLedgerInput();
                        }}
                        onKeyDown={(event) => {
                            if (event.defaultPrevented) return;
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            event.stopPropagation();
                            cityEnterRef.current = true;
                            if (!cityPanelOpen) {
                                cityEnterRef.current = false;
                                focusLedgerInput();
                            }
                        }}
                        onBlur={() => {
                            setCityQuery('');
                            if (!cityId || cityId <= 0) {
                                setSelectedCity(null);
                                return;
                            }
                            const match = cityOptions.find((c) => Number(c.value) === Number(cityId)) ?? null;
                            setSelectedCity(match);
                        }}
                        onShow={() => setCityPanelOpen(true)}
                        onHide={() => {
                            setCityPanelOpen(false);
                            if (cityEnterRef.current) {
                                cityEnterRef.current = false;
                                focusLedgerInput();
                            }
                        }}
                        field="label"
                        placeholder={citiesLoading ? 'Loading cities...' : 'City'}
                        inputId="ledger-city-autocomplete"
                        inputRef={cityInputRef}
                        autoHighlight={cityQuery.trim().length > 0}
                        style={{ minWidth: '220px' }}
                    />
                    <div className="flex align-items-end gap-2 ledger-ledger-meta">
                        <LedgerAutoComplete
                            value={selectedLedger ?? ledgerQuery}
                            suggestions={ledgerSuggestions}
                            completeMethod={(event: AutoCompleteCompleteEvent) => {
                                const query = event.query ?? '';
                                void fetchLedgers({
                                    search: query,
                                    groupId: ledgerGroupFetchGroupId,
                                    mode: query.trim().length === 0 ? 'all' : 'search'
                                });
                            }}
                            onDropdownClick={() => {
                                setLedgerSuggestions([...ledgerOptions]);
                                void fetchLedgers({ groupId: ledgerGroupFetchGroupId, mode: 'all' });
                            }}
                            onChange={(event: AutoCompleteChangeEvent) => {
                                const value = event.value as LedgerLookupOption | string | null;
                                const shouldFocusVoucher = ledgerEnterRef.current;
                                ledgerEnterRef.current = false;
                                clearAppliedFilters();
                                if (value == null) {
                                    setLedgerQuery('');
                                    resetLedgerSelection();
                                    setPreviewLedger(null);
                                    if (shouldFocusVoucher) {
                                        focusVoucherTypeInput();
                                    }
                                    return;
                                }
                                if (typeof value === 'string') {
                                    setLedgerQuery(value);
                                    setSelectedLedger(null);
                                    setLedgerId(null);
                                    setPreviewLedger(null);
                                    if (shouldFocusVoucher) {
                                        focusVoucherTypeInput();
                                    }
                                    return;
                                }
                                setLedgerQuery('');
                                setSelectedLedger(value);
                                setLedgerId(Number(value.ledgerId));
                                setPreviewLedger(null);
                                if (shouldFocusVoucher) {
                                    focusVoucherTypeInput();
                                }
                            }}
                            itemTemplate={(option: LedgerLookupOption) => (
                                <span data-ledger-id={option.ledgerId} onMouseEnter={() => setPreviewLedger(option)}>
                                    {option.label}
                                </span>
                            )}
                            field="label"
                            loading={showLedgerSpinner}
                            showEmptyMessage
                            placeholder={showLedgerSpinner ? 'Loading ledgers...' : 'Select ledger'}
                            inputId="ledger-autocomplete"
                            onShow={() => {
                                setLedgerPanelOpen(true);
                                setPreviewLedger(selectedLedger ?? null);
                                if (typeof window !== 'undefined') {
                                    window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
                                }
                            }}
                            onHide={() => {
                                setLedgerPanelOpen(false);
                                setPreviewLedger(null);
                                if (ledgerEnterRef.current) {
                                    ledgerEnterRef.current = false;
                                    focusVoucherTypeInput();
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                                    if (typeof window !== 'undefined') {
                                        window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
                                    }
                                }
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                event.stopPropagation();
                                ledgerEnterRef.current = true;
                                if (!ledgerPanelOpen) {
                                    ledgerEnterRef.current = false;
                                    focusVoucherTypeInput();
                                }
                            }}
                            virtualScrollerOptions={{ itemSize: 36 }}
                            autoHighlight={ledgerQuery.trim().length > 0}
                            inputRef={ledgerInputRef}
                            showCurrentBalanceInline={showBalanceBadges}
                            currentBalanceLabel={currentBalanceLabel}
                            currentBalanceSeverity={currentBalanceSeverity}
                            currentBalanceTooltip={currentBalanceTooltip}
                            style={{ minWidth: '260px' }}
                        />
                        {displayLedger && (
                            <LedgerMetaPanel
                                address={displayLedger.address}
                                balanceLabel={currentBalanceLabel}
                                balanceSeverity={currentBalanceSeverity}
                                showBalance={false}
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap align-items-center gap-2">
                <VoucherTypeAutoComplete
                    value={voucherTypeId}
                    options={voucherTypeOptions}
                    loading={voucherTypesLoading}
                    onChange={(nextValue) => onVoucherTypeChange(nextValue)}
                    placeholder="Voucher type"
                    loadingPlaceholder="Loading voucher types..."
                    onSelectNext={focusDetailViewInput}
                    inputId="ledger-voucher-type-autocomplete"
                    ref={voucherTypeInputRef}
                    style={{ minWidth: '190px' }}
                />
            </div>
            <fieldset className="ledger-report-group">
                <legend>View Options</legend>
                <div className="flex flex-wrap align-items-center gap-3 ledger-inline-row">
                    <div className="flex align-items-center gap-2">
                        <RadioButton
                            inputId="ledger-format-1"
                            name="ledger-format"
                            value={1}
                            checked={reportFormat === 1}
                            onChange={() => setReportFormat(1)}
                        />
                        <label htmlFor="ledger-format-1">Normal</label>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <RadioButton
                            inputId="ledger-format-2"
                            name="ledger-format"
                            value={2}
                            checked={reportFormat === 2}
                            onChange={() => setReportFormat(2)}
                        />
                        <label htmlFor="ledger-format-2">Detailed</label>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="ledger-detail-view"
                            inputRef={detailViewInputRef}
                            checked={detailView}
                            onChange={(e) => setDetailView(Boolean(e.checked))}
                        />
                        <label htmlFor="ledger-detail-view">Ag. Ledger</label>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="ledger-narration"
                            checked={showNarration}
                            onChange={(e) => setShowNarration(Boolean(e.checked))}
                        />
                        <label htmlFor="ledger-narration">Narration</label>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="ledger-opening-above"
                            checked={openingBalanceAbove}
                            onChange={(e) => setOpeningBalanceAbove(Boolean(e.checked))}
                        />
                        <label htmlFor="ledger-opening-above">Opening balance above</label>
                    </div>
                </div>
            </fieldset>
        </div>
    );
}
