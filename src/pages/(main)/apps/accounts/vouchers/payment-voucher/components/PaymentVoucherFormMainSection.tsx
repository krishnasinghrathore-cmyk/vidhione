'use client';
import React from 'react';
import type { Dropdown } from 'primereact/dropdown';
import AppDrCrToggle from '@/components/AppDrCrToggle';
import { AppNotchedField } from '@/components/AppNotchedField';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import { LabelWithIcon } from './LabelWithIcon';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';
import { AMOUNT_CURRENCY_ICON, CR_ONLY_VALUE, parseDateText } from '../utils';

type PaymentVoucherFormMainSectionProps = {
    viewProps: PaymentVoucherViewProps;
    formLevelError: string | null;
    renderFormError: (key: string) => React.ReactNode;
};

export function PaymentVoucherFormMainSection({
    viewProps,
    formLevelError,
    renderFormError
}: PaymentVoucherFormMainSectionProps) {
    const postingDateInputRef = React.useRef<HTMLInputElement | null>(null);
    const chequeBookDropdownRef = React.useRef<Dropdown | null>(null);

    const resolveDateInputError = (value: Date | null, raw: string) => {
        if (!/\d/.test(raw)) return null;
        if (value) return null;
        return 'Enter a valid date in DD/MM/YYYY within the financial year.';
    };

    const {
        clearFormError,
        editingId,
        isFormActive,
        saving,
        focusNonce,
        voucherNo,
        isVoucherNoAuto,
        setVoucherNo,
        voucherDate,
        setVoucherDate,
        setVoucherDateError,
        voucherDateError,
        postingDate,
        setPostingDate,
        setPostingDateError,
        postingDateError,
        paymentViaId,
        setPaymentViaId,
        paymentViaOptions,
        paymentViaLoading,
        isBankMode,
        refNoLabel,
        refNo,
        setRefNo,
        refNoInputId,
        refNoInputRef,
        focusRefNoInput,
        refDateLabel,
        refDate,
        setRefDate,
        setRefDateError,
        refDateError,
        chequeIssueBookId,
        setChequeIssueBookId,
        chequeBookOptions,
        isChequePayment,
        cashLedgerId,
        cashLedgerOption,
        paymentLedgerGroupId,
        ledgerGroupOptions,
        ledgerGroupOptionsLoading,
        setPaymentLedgerGroupId,
        setCashLedgerId,
        setCashLedgerOption,
        paymentLedgerGroupDisabled,
        focusPaymentLedgerInput,
        autoCompleteAppendTarget,
        paymentLedgerLabel,
        paymentLedgerPurpose,
        paymentLedgerOptions,
        paymentLedgerOptionsLoading,
        paymentLedgerPlaceholderResolved,
        paymentLedgerLoadingPlaceholder,
        cashLedgerInputRef,
        cashLedgerBalanceLabel,
        cashLedgerBalanceClass,
        cashLedgerAddressLabel,
        cashLedgerAmount,
        syncCashLedgerAmountInput,
        syncCashLedgerAmountDraftInput,
        cashLedgerAmountInputRef,
        focusCashLedgerAmountInput,
        narration,
        setNarration,
        startAddLine,
        fiscalRange,
        voucherDateInputRef,
        setFirst
    } = viewProps;
    const paymentLedgerGroupLabel = 'Ledger Group (Cr)';
    const paymentViaInputId = 'payment-voucher-payment-via';
    const chequeBookInputId = 'payment-voucher-cheque-book';
    const showPaymentLedgerSpinner =
        paymentLedgerOptionsLoading && paymentLedgerOptions.length === 0;
    const focusChequeBookDropdown = () => {
        const input = document.getElementById(chequeBookInputId);
        if (input instanceof HTMLInputElement && !input.disabled) {
            input.focus();
            if (document.activeElement === input) return true;
        }
        if (!isFormActive || !cashLedgerId) return false;
        const chequeInput = chequeBookDropdownRef.current?.getInput?.();
        if (chequeInput && !chequeInput.disabled) {
            chequeInput.focus();
            if (document.activeElement === chequeInput) return true;
        }
        chequeBookDropdownRef.current?.focus?.();
        const focusedInput = chequeBookDropdownRef.current?.getInput?.();
        return Boolean(focusedInput && document.activeElement === focusedInput);
    };
    const focusPaymentViaNext = () => {
        if (focusChequeBookDropdown()) return;
        window.setTimeout(() => {
            if (focusChequeBookDropdown()) return;
            focusRefNoInput();
        }, 120);
    };

    return (
        <div className="app-entry-section app-entry-section--header">
            {formLevelError && <small className="text-red-500">{formLevelError}</small>}
            <div className="grid">
                <div className="col-12">
                    <div className="app-entry-row">
                        <div className="app-entry-field">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-hashtag">Voucher No. *</LabelWithIcon>}
                                className="app-notched-input--entry-main"
                                style={{ width: '100%' }}
                            >
                                <AppInput
                                    value={voucherNo}
                                    onChange={(e) => {
                                        setVoucherNo(e.target.value);
                                        clearFormError('voucherNo');
                                    }}
                                    className={`app-entry-control${!isVoucherNoAuto ? ' app-field-noneditable' : ''}`}
                                    disabled={!isFormActive || saving}
                                    readOnly={!isVoucherNoAuto}
                                />
                            </AppNotchedField>
                            {renderFormError('voucherNo')}
                        </div>
                        <div className="app-entry-field">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-calendar">Voucher Date *</LabelWithIcon>}
                                className="app-notched-input--entry-main"
                                style={{ width: '100%' }}
                            >
                                <AppDateInput
                                    value={voucherDate}
                                    onChange={(value) => {
                                        setVoucherDate(value);
                                        setVoucherDateError(null);
                                    }}
                                    onCommit={(value, raw) => {
                                        setVoucherDateError(resolveDateInputError(value, raw));
                                    }}
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    enforceFiscalRange
                                    disabled={!isFormActive}
                                    autoFocus={isFormActive}
                                    inputRef={voucherDateInputRef}
                                    focusSignal={focusNonce}
                                    className="app-entry-control"
                                    onEnterNext={() => {
                                        if (editingId == null) {
                                            const nextDate = parseDateText(voucherDateInputRef.current?.value ?? '') ?? voucherDate;
                                            if (nextDate) {
                                                setPostingDate(nextDate);
                                                setPostingDateError(null);
                                            }
                                        }
                                        postingDateInputRef.current?.focus();
                                    }}
                                />
                            </AppNotchedField>
                            {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                        </div>
                        <div className="app-entry-field">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-calendar-plus">Posting Date *</LabelWithIcon>}
                                className="app-notched-input--entry-main"
                                style={{ width: '100%' }}
                            >
                                <AppDateInput
                                    value={postingDate}
                                    onChange={(value) => {
                                        setPostingDate(value);
                                        setPostingDateError(null);
                                    }}
                                    onCommit={(value, raw) => {
                                        setPostingDateError(resolveDateInputError(value, raw));
                                    }}
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    enforceFiscalRange
                                    disabled={!isFormActive}
                                    inputRef={postingDateInputRef}
                                    className="app-entry-control"
                                />
                            </AppNotchedField>
                            {postingDateError && <small className="text-red-500">{postingDateError}</small>}
                        </div>
                        {isBankMode && (
                            <div className="app-entry-field">
                                <AppNotchedField
                                    label={<LabelWithIcon icon="pi-credit-card">Payment Via</LabelWithIcon>}
                                    className="app-notched-input--entry-main app-notched-input--paid-by"
                                    style={{ width: '100%' }}
                                >
                                    <AppDropdown
                                        inputId={paymentViaInputId}
                                        value={paymentViaId}
                                        options={paymentViaOptions}
                                        onChange={(e) => {
                                            setPaymentViaId(e.value as number | null);
                                            clearFormError('chequeIssueBookId');
                                        }}
                                        placeholder="Select"
                                        loading={paymentViaLoading}
                                        showLoadingIcon
                                        disabled={!isFormActive}
                                        className="app-entry-control"
                                        onEnterNext={focusPaymentViaNext}
                                    />
                                </AppNotchedField>
                            </div>
                        )}
                        {isChequePayment && (
                            <div className="app-entry-field app-entry-field--wide">
                                <AppNotchedField
                                    label={<LabelWithIcon icon="pi-book">Cheque Book</LabelWithIcon>}
                                    className="app-notched-input--entry-main app-notched-input--paid-by"
                                    style={{ width: '100%' }}
                                >
                                    <AppDropdown
                                        inputId={chequeBookInputId}
                                        value={chequeIssueBookId}
                                        options={chequeBookOptions}
                                        ref={chequeBookDropdownRef}
                                        onChange={(e) => {
                                            setChequeIssueBookId(e.value as number | null);
                                            clearFormError('chequeIssueBookId');
                                        }}
                                        placeholder={!cashLedgerId ? 'Select bank first' : 'Select cheque book'}
                                        disabled={!isFormActive || !cashLedgerId}
                                        className="app-entry-control"
                                        onEnterNext={focusRefNoInput}
                                    />
                                </AppNotchedField>
                                {renderFormError('chequeIssueBookId')}
                            </div>
                        )}
                        <div className="app-entry-field">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-file-edit">{refNoLabel}</LabelWithIcon>}
                                className="app-notched-input--entry-main"
                                style={{ width: '100%' }}
                            >
                                <AppInput
                                    id={refNoInputId}
                                    value={refNo}
                                    onChange={(e) => {
                                        setRefNo(e.target.value);
                                        clearFormError('refNo');
                                    }}
                                    className="app-entry-control"
                                    disabled={!isFormActive}
                                    ref={(element) => {
                                        if (element instanceof HTMLInputElement) {
                                            refNoInputRef.current = element;
                                            return;
                                        }
                                        const input = (element as { getInput?: () => unknown } | null)?.getInput?.();
                                        refNoInputRef.current = input instanceof HTMLInputElement ? input : null;
                                    }}
                                />
                            </AppNotchedField>
                            {renderFormError('refNo')}
                        </div>
                        <div className="app-entry-field">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-calendar">{refDateLabel}</LabelWithIcon>}
                                className="app-notched-input--entry-main"
                                style={{ width: '100%' }}
                            >
                                <AppDateInput
                                    value={refDate}
                                    onChange={(value) => {
                                        setRefDate(value);
                                        setRefDateError(null);
                                    }}
                                    onCommit={(value, raw) => {
                                        setRefDateError(resolveDateInputError(value, raw));
                                    }}
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    enforceFiscalRange
                                    disabled={!isFormActive}
                                    className="app-entry-control"
                                />
                            </AppNotchedField>
                            {refDateError && <small className="text-red-500">{refDateError}</small>}
                        </div>
                    </div>
                </div>
                <div className="col-12 app-entry-ledger-row-wrap">
                    <div className="app-entry-ledger-row">
                        <div className="app-entry-ledger-group">
                            <div className="app-entry-field app-entry-field--wide app-entry-ledger-field">
                                <AppNotchedField
                                    label={<LabelWithIcon icon="pi-sitemap">{paymentLedgerGroupLabel}</LabelWithIcon>}
                                    className="app-notched-input--entry-main"
                                    style={{ width: '100%' }}
                                >
                                    <LedgerGroupAutoComplete
                                        value={paymentLedgerGroupId}
                                        options={ledgerGroupOptions}
                                        loading={ledgerGroupOptionsLoading}
                                        loadingWhenPanelOpenOnly
                                        onChange={(nextValue) => {
                                            setPaymentLedgerGroupId(nextValue);
                                            setCashLedgerId(null);
                                            setCashLedgerOption(null);
                                            clearFormError('cashLedgerId');
                                        }}
                                        placeholder="Ledger group"
                                        loadingPlaceholder="Loading groups..."
                                        onSelectNext={focusPaymentLedgerInput}
                                        style={{ width: '100%' }}
                                        panelStyle={{ width: '20rem' }}
                                        disabled={paymentLedgerGroupDisabled}
                                        appendTo={autoCompleteAppendTarget}
                                    />
                                </AppNotchedField>
                            </div>
                            <div className="app-entry-field app-entry-field--xwide app-entry-ledger-field app-entry-ledger-field--cash">
                                <div className="app-entry-ledger-balance-row">
                                    {cashLedgerBalanceLabel && (
                                        <span className={`app-entry-ledger-balance ${cashLedgerBalanceClass}`}>
                                            {cashLedgerBalanceLabel}
                                        </span>
                                    )}
                                </div>
                                <AppNotchedField
                                    label={<LabelWithIcon icon="pi-wallet">{paymentLedgerLabel} *</LabelWithIcon>}
                                    className="app-notched-input--entry-main"
                                    style={{ width: '100%' }}
                                >
                                    <LedgerAutoComplete
                                        variant="purpose"
                                        purpose={paymentLedgerPurpose}
                                        value={cashLedgerId}
                                        selectedOption={cashLedgerOption}
                                        onChange={(value, option) => {
                                            setFirst(0);
                                            setCashLedgerId(value);
                                            setCashLedgerOption(option ?? null);
                                            clearFormError('cashLedgerId');
                                        }}
                                        options={paymentLedgerOptions}
                                        loading={showPaymentLedgerSpinner}
                                        loadingWhenPanelOpenOnly
                                        placeholder={showPaymentLedgerSpinner ? paymentLedgerLoadingPlaceholder : paymentLedgerPlaceholderResolved}
                                        loadingPlaceholder={paymentLedgerLoadingPlaceholder}
                                        ref={cashLedgerInputRef}
                                        className="app-entry-control"
                                        disabled={!isFormActive}
                                        ledgerGroupId={paymentLedgerGroupId}
                                        onSelectNext={focusCashLedgerAmountInput}
                                    />
                                </AppNotchedField>
                                {renderFormError('cashLedgerId')}
                            </div>
                            <div className="app-entry-ledger-meta">
                                <AppNotchedField
                                    label={<LabelWithIcon icon="pi-map-marker">Address</LabelWithIcon>}
                                    className="app-notched-input--line-editor"
                                    style={{ width: '100%' }}
                                >
                                    <div className="app-notched-input__surface ledger-meta-address">
                                        <span className="text-700 text-sm">
                                            {cashLedgerAddressLabel?.trim() || 'Address not available'}
                                        </span>
                                    </div>
                                </AppNotchedField>
                            </div>
                        </div>
                        <div className="app-entry-field app-entry-ledger-amount app-entry-ledger-amount--wide">
                            <div className="app-entry-ledger-amount-row">
                                <AppDrCrToggle
                                    value={CR_ONLY_VALUE}
                                    disabled
                                    className="app-entry-control app-entry-drcr"
                                />
                                <AppNotchedField
                                    label={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount *</LabelWithIcon>}
                                    className="app-notched-input--entry-main app-entry-ledger-amount-input"
                                    style={{ width: '100%' }}
                                >
                                    <AppInput
                                        inputType="number"
                                        value={cashLedgerAmount}
                                        onValueChange={(e) => {
                                            syncCashLedgerAmountInput(undefined, (e.value as number | null) ?? null);
                                        }}
                                        onKeyUp={(event) => {
                                            const target = event.currentTarget as HTMLInputElement | null;
                                            if (!target) return;
                                            window.setTimeout(() => {
                                                syncCashLedgerAmountDraftInput(target.value);
                                            }, 0);
                                        }}
                                        mode="decimal"
                                        minFractionDigits={2}
                                        maxFractionDigits={2}
                                        inputRef={(el) => {
                                            cashLedgerAmountInputRef.current = el;
                                        }}
                                        inputStyle={{ width: '100%', textAlign: 'right' }}
                                        className="app-entry-control"
                                        disabled={!isFormActive}
                                    />
                                </AppNotchedField>
                            </div>
                            {renderFormError('cashLedgerAmount')}
                        </div>
                    </div>
                </div>
                <div className="col-12">
                    <div className="app-entry-narration">
                        <AppNotchedField
                            label={<LabelWithIcon icon="pi-pencil">Narration</LabelWithIcon>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <AppInput
                                value={narration}
                                onChange={(e) => setNarration(e.target.value)}
                                className="app-entry-control"
                                disabled={!isFormActive}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    startAddLine();
                                }}
                            />
                        </AppNotchedField>
                    </div>
                </div>
            </div>
        </div>
    );
}
