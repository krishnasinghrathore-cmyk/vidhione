'use client';
import React from 'react';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import { LabelWithIcon } from './LabelWithIcon';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';
import { AMOUNT_CURRENCY_ICON, AMOUNT_CURRENCY_SYMBOL, CR_ONLY_VALUE, DR_CR_OPTIONS, parseDateText } from '../utils';

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

    return (
        <div className="app-entry-section app-entry-section--header">
            {formLevelError && <small className="text-red-500">{formLevelError}</small>}
            <div className="grid">
                <div className="col-12">
                    <div className="app-entry-row">
                        <div className="app-entry-field">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-hashtag">Voucher No. *</LabelWithIcon>
                            </label>
                            <AppInput
                                value={voucherNo}
                                onChange={(e) => {
                                    setVoucherNo(e.target.value);
                                    clearFormError('voucherNo');
                                }}
                                className="app-entry-control"
                                disabled={!isFormActive || saving}
                            />
                            {renderFormError('voucherNo')}
                        </div>
                        <div className="app-entry-field">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-calendar">Voucher Date *</LabelWithIcon>
                            </label>
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
                                inputRef={voucherDateInputRef}
                                focusSignal={focusNonce}
                                selectOnFocus
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
                            {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                        </div>
                        <div className="app-entry-field">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-calendar-plus">Posting Date *</LabelWithIcon>
                            </label>
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
                            {postingDateError && <small className="text-red-500">{postingDateError}</small>}
                        </div>
                        {isBankMode && (
                            <div className="app-entry-field">
                                <label className="block text-600 mb-1">
                                    <LabelWithIcon icon="pi-credit-card">Payment Via</LabelWithIcon>
                                </label>
                                <AppDropdown
                                    value={paymentViaId}
                                    options={paymentViaOptions}
                                    onChange={(e) => setPaymentViaId(e.value as number | null)}
                                    placeholder="Select"
                                    loading={paymentViaLoading}
                                    showLoadingIcon
                                    disabled={!isFormActive}
                                    className="app-entry-control"
                                />
                            </div>
                        )}
                        <div className="app-entry-field">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-file-edit">{refNoLabel}</LabelWithIcon>
                            </label>
                            <AppInput
                                value={refNo}
                                onChange={(e) => setRefNo(e.target.value)}
                                className="app-entry-control"
                                disabled={!isFormActive}
                            />
                        </div>
                        <div className="app-entry-field">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-calendar">{refDateLabel}</LabelWithIcon>
                            </label>
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
                            {refDateError && <small className="text-red-500">{refDateError}</small>}
                        </div>
                        {isChequePayment && (
                            <div className="app-entry-field app-entry-field--wide">
                                <label className="block text-600 mb-1">
                                    <LabelWithIcon icon="pi-book">Cheque Book</LabelWithIcon>
                                </label>
                                <AppDropdown
                                    value={chequeIssueBookId}
                                    options={chequeBookOptions}
                                    onChange={(e) => setChequeIssueBookId(e.value as number | null)}
                                    placeholder={!cashLedgerId ? 'Select bank first' : 'Select cheque book'}
                                    disabled={!isFormActive || !cashLedgerId}
                                    className="app-entry-control"
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className="col-12">
                    <div className="app-entry-ledger-row">
                        <div className="app-entry-ledger-group">
                            <div className="app-entry-field app-entry-ledger-field">
                                <label className="block text-600">
                                    <LabelWithIcon icon="pi-sitemap">Ledger Group</LabelWithIcon>
                                </label>
                                <LedgerGroupAutoComplete
                                    value={paymentLedgerGroupId}
                                    onChange={(nextValue) => {
                                        setPaymentLedgerGroupId(nextValue);
                                        setCashLedgerId(null);
                                        setCashLedgerOption(null);
                                        clearFormError('cashLedgerId');
                                    }}
                                    placeholder="Ledger group"
                                    loadingPlaceholder="Loading groups..."
                                    onSelectNext={focusPaymentLedgerInput}
                                    style={{ width: '100%', maxWidth: '14rem' }}
                                    panelStyle={{ width: '16rem' }}
                                    disabled={paymentLedgerGroupDisabled}
                                    appendTo={autoCompleteAppendTarget}
                                />
                            </div>
                            <div className="app-entry-field app-entry-field--xwide app-entry-ledger-field">
                                <div className="app-entry-ledger-label-row">
                                    <label className="block text-600">
                                        <LabelWithIcon icon="pi-wallet">{paymentLedgerLabel} *</LabelWithIcon>
                                    </label>
                                    {cashLedgerBalanceLabel && (
                                        <span className={`app-entry-ledger-balance ${cashLedgerBalanceClass}`}>
                                            {cashLedgerBalanceLabel}
                                        </span>
                                    )}
                                </div>
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
                                    loading={paymentLedgerOptionsLoading}
                                    placeholder={paymentLedgerPlaceholderResolved}
                                    loadingPlaceholder={paymentLedgerLoadingPlaceholder}
                                    ref={cashLedgerInputRef}
                                    className="app-entry-control"
                                    disabled={!isFormActive}
                                    ledgerGroupId={paymentLedgerGroupId}
                                    onSelectNext={focusCashLedgerAmountInput}
                                />
                                {renderFormError('cashLedgerId')}
                            </div>
                            <div className="app-entry-ledger-meta">
                                <LedgerMetaPanel address={cashLedgerAddressLabel} />
                            </div>
                        </div>
                        <div className="app-entry-field app-entry-ledger-amount app-entry-ledger-amount--wide">
                            <label className="block text-600 mb-1 app-entry-ledger-amount-label">
                                <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount *</LabelWithIcon>
                            </label>
                            <div className="app-entry-ledger-amount-row">
                                <AppDropdown
                                    value={CR_ONLY_VALUE}
                                    options={DR_CR_OPTIONS}
                                    disabled
                                    className="app-entry-control app-entry-drcr"
                                />
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
                                    className="app-entry-control app-entry-ledger-amount-input"
                                    disabled={!isFormActive}
                                />
                            </div>
                            {renderFormError('cashLedgerAmount')}
                        </div>
                    </div>
                </div>
                <div className="col-12">
                    <div className="app-entry-narration">
                        <label className="block text-600 mb-1">
                            <LabelWithIcon icon="pi-pencil">Narration</LabelWithIcon>
                        </label>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
