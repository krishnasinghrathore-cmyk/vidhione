"use client";
import React from "react";
import type { Dropdown } from "primereact/dropdown";
import type {
  AutoComplete,
  AutoCompleteChangeEvent,
  AutoCompleteCompleteEvent,
} from "primereact/autocomplete";
import { Button } from "primereact/button";
import AppDrCrToggle, { type AppDrCrValue } from "@/components/AppDrCrToggle";
import { AppNotchedField } from "@/components/AppNotchedField";
import AppDateInput from "@/components/AppDateInput";
import AppAutoComplete from "@/components/AppAutoComplete";
import AppDropdown from "@/components/AppDropdown";
import AppInput from "@/components/AppInput";
import LedgerAutoComplete from "@/components/LedgerAutoComplete";
import LedgerGroupAutoComplete from "@/components/LedgerGroupAutoComplete";
import { LabelWithIcon } from "./LabelWithIcon";
import type { SelectOption } from "../types";
import type { VoucherViewProps } from "../useVoucherState";
import { AMOUNT_CURRENCY_ICON, formatAmount, parseDateText } from "../utils";

type VoucherFormMainSectionProps = {
  viewProps: VoucherViewProps;
  formLevelError: string | null;
  renderFormError: (key: string) => React.ReactNode;
};

export function VoucherFormMainSection({
  viewProps,
  formLevelError,
  renderFormError,
}: VoucherFormMainSectionProps) {
  const postingDateInputRef = React.useRef<HTMLInputElement | null>(null);
  const chequeBookDropdownRef = React.useRef<Dropdown | null>(null);
  const headerDrCrToggleRef = React.useRef<HTMLButtonElement | null>(null);
  const legacyVoucherNoInputRef = React.useRef<HTMLInputElement | null>(null);
  const legacySalesmanInputRef = React.useRef<AutoComplete | null>(null);
  const legacyBillWiseLedgerGroupInputRef = React.useRef<AutoComplete | null>(
    null
  );
  const legacyBillWiseLedgerInputRef = React.useRef<AutoComplete | null>(null);
  const legacyReceiptRefDateInputRef = React.useRef<HTMLInputElement | null>(
    null
  );

  const resolveDateInputError = (value: Date | null, raw: string) => {
    if (!/\d/.test(raw)) return null;
    if (value) return null;
    return "Enter a valid date in DD/MM/YYYY within the financial year.";
  };

  const {
    clearFormError,
    voucherProfileKey,
    isCashMode,
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
    showPaymentVia,
    requiresManager,
    managerLabel,
    managerValue,
    formManagerSuggestions,
    setFormManagerQuery,
    setFormManagerSuggestions,
    filterOptions,
    managerOptions,
    managersLoading,
    paidByInputId,
    paidByInputRef,
    focusPaidByInput,
    setFormManagerId,
    salesmanValue,
    formSalesmanSuggestions,
    setFormSalesmanQuery,
    setFormSalesmanSuggestions,
    salesmanOptions,
    salesmenLoading,
    setFormSalesmanId,
    salesmanIssueInfoMessage,
    paymentViaInputId,
    chequeBookInputId,
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
    referenceNo2Label,
    referenceNo2,
    setReferenceNo2,
    referenceDate2Label,
    referenceDate2,
    setReferenceDate2,
    setReferenceDate2Error,
    referenceDate2Error,
    reasonForIssueLabel,
    reasonForIssue,
    setReasonForIssue,
    chequeIssueBookId,
    setChequeIssueBookId,
    chequeBookOptions,
    receiptIssueBookOptions,
    receiptIssueBooksLoading,
    hasReceiptSalesmanSelection,
    isChequePayment,
    cashLedgerId,
    updatePrimaryLedger,
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
    paymentLedgerGroupLabel,
    allowHeaderDrCrSelection,
    updateHeaderDrCr,
    headerDrCrLabel,
    paymentLedgerOptions,
    paymentLedgerOptionsLoading,
    paymentLedgerPlaceholderResolved,
    paymentLedgerLoadingPlaceholder,
    cashLedgerInputRef,
    cashLedgerBalanceLabel,
    cashLedgerBalanceClass,
    cashLedgerAddressLabel,
    cashLedgerAmount,
    effectivePrimaryLedgerAmount,
    supplementaryHeaderPostingAmount,
    syncCashLedgerAmountInput,
    syncCashLedgerAmountDraftInput,
    cashLedgerAmountInputRef,
    focusCashLedgerAmountInput,
    billWisePartyLedgerGroupId,
    updateBillWisePartyLedgerGroupId,
    billWisePartyLedgerId,
    billWisePartyLedgerBalanceLabel,
    billWisePartyLedgerBalanceClass,
    billWisePartyLedgerOption,
    updateBillWisePartyLedger,
    billWiseDiscountAmount,
    updateBillWiseDiscountAmount,
    billWiseChequeReturnCharges,
    updateBillWiseChequeReturnCharges,
    lineEntryPurpose,
    lineEntryLedgerLabel,
    allowLineDrCrSelection,
    searchInvoiceBills,
    isBillWiseMode,
    narration,
    setNarration,
    startAddLine,
    fiscalRange,
    voucherDateInputRef,
  } = viewProps;
  const headerDrCrToggleValue: AppDrCrValue =
    headerDrCrLabel === "Cr" ? "Cr" : "Dr";
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
  const focusLegacySalesmanInput = () => {
    const input = legacySalesmanInputRef.current?.getInput?.();
    if (!input || input.disabled) return false;
    input.focus();
    return document.activeElement === input;
  };
  const focusLegacyVoucherNoInput = () => {
    const input = legacyVoucherNoInputRef.current;
    if (!input || input.disabled) return false;
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      const length = input.value?.length ?? 0;
      input.setSelectionRange(0, length);
    }
    return document.activeElement === input;
  };
  const focusLegacyBillWiseLedgerGroupInput = () => {
    const input = legacyBillWiseLedgerGroupInputRef.current?.getInput?.();
    if (!input || input.disabled) return false;
    input.focus();
    return document.activeElement === input;
  };
  const focusLegacyBillWiseLedgerInput = () => {
    const input = legacyBillWiseLedgerInputRef.current?.getInput?.();
    if (!input || input.disabled) return false;
    input.focus();
    return document.activeElement === input;
  };
  const focusLegacyReceiptRefDateInput = () => {
    const focusInput = () => {
      const fallbackElement = document.getElementById(
        `${refNoInputId}-date`
      );
      const input =
        legacyReceiptRefDateInputRef.current ??
        (fallbackElement instanceof HTMLInputElement ? fallbackElement : null);
      if (!input || input.disabled) return false;
      input.focus();
      return document.activeElement === input;
    };
    if (focusInput()) return true;
    if (typeof window !== "undefined") {
      [60, 140, 260].forEach((delay) => {
        window.setTimeout(() => {
          focusInput();
        }, delay);
      });
      // Keep Enter flow on receipt-date target instead of falling through.
      return true;
    }
    return false;
  };
  const handleLegacyReceiptRefNoEnter = () => {
    if (focusLegacyReceiptRefDateInput()) return true;
    if (isBillWiseMode) {
      if (focusLegacyBillWiseLedgerGroupInput()) return true;
      if (focusLegacyBillWiseLedgerInput()) return true;
    }
    focusCashLedgerAmountInput();
    return true;
  };
  const handleLegacyManagerEnter = () => {
    if (focusLegacySalesmanInput()) return true;
    return focusLegacyVoucherNoInput();
  };
  const handleLegacySalesmanEnter = () => {
    if (voucherProfileKey === "receipt" && isCashMode && focusChequeBookDropdown()) {
      return true;
    }
    return focusLegacyVoucherNoInput();
  };
  const handleNarrationEnter = () => {
    startAddLine();
    return true;
  };
  const resolveSalesmanOptionByLabel = React.useCallback(
    (rawLabel: string): SelectOption | null => {
      const normalized = rawLabel.trim().toLowerCase();
      if (!normalized) return null;
      return (
        formSalesmanSuggestions.find(
          (option) => option.label.toLowerCase() === normalized
        ) ??
        salesmanOptions.find(
          (option) => option.label.toLowerCase() === normalized
        ) ??
        null
      );
    },
    [formSalesmanSuggestions, salesmanOptions]
  );
  const syncSalesmanFromText = React.useCallback(
    (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed) {
        setFormSalesmanQuery("");
        setFormSalesmanId(null);
        return;
      }
      const match = resolveSalesmanOptionByLabel(trimmed);
      if (match) {
        setFormSalesmanQuery("");
        setFormSalesmanId(match.value);
        return;
      }
      setFormSalesmanQuery(rawText);
      setFormSalesmanId(null);
    },
    [resolveSalesmanOptionByLabel, setFormSalesmanId, setFormSalesmanQuery]
  );
  const handleSalesmanChange = React.useCallback(
    (event: AutoCompleteChangeEvent) => {
      const value = event.value as SelectOption | string | null;
      if (value == null) {
        const liveInput =
          legacySalesmanInputRef.current?.getInput?.()?.value ?? "";
        const fallbackText =
          typeof salesmanValue === "string"
            ? salesmanValue
            : salesmanValue && typeof salesmanValue === "object"
            ? String((salesmanValue as SelectOption).label ?? "")
            : "";
        const textToKeep = liveInput.trim() ? liveInput : fallbackText;
        syncSalesmanFromText(textToKeep);
        return;
      }
      if (typeof value === "string") {
        syncSalesmanFromText(value);
        return;
      }
      setFormSalesmanQuery("");
      setFormSalesmanId(Number(value.value));
    },
    [salesmanValue, setFormSalesmanId, setFormSalesmanQuery, syncSalesmanFromText]
  );
  const handleSalesmanSelect = React.useCallback(
    (event: { value?: SelectOption | string | null }) => {
      const value = event.value as SelectOption | string | null | undefined;
      clearFormError("salesmanId");
      if (value == null) {
        setFormSalesmanQuery("");
        setFormSalesmanId(null);
        return;
      }
      if (typeof value === "string") {
        syncSalesmanFromText(value);
        return;
      }
      setFormSalesmanQuery("");
      setFormSalesmanId(Number(value.value));
    },
    [clearFormError, setFormSalesmanId, setFormSalesmanQuery, syncSalesmanFromText]
  );
  const focusVoucherDateInput = React.useCallback(() => {
    const focusInput = () => {
      const input = voucherDateInputRef.current;
      if (!input || input.disabled) return false;
      input.focus();
      if (typeof input.setSelectionRange === "function") {
        const length = input.value?.length ?? 0;
        input.setSelectionRange(0, length);
      }
      return document.activeElement === input;
    };
    if (focusInput()) return;
    [60, 140, 260].forEach((delay) => {
      window.setTimeout(focusInput, delay);
    });
  }, [voucherDateInputRef]);
  const focusHeaderDrCrToggle = React.useCallback(() => {
    if (!allowHeaderDrCrSelection || !isFormActive || saving) return false;
    const toggle = headerDrCrToggleRef.current;
    if (!toggle || toggle.disabled) return false;
    toggle.focus();
    return document.activeElement === toggle;
  }, [allowHeaderDrCrSelection, isFormActive, saving]);
  const focusPrimaryLedgerNext = React.useCallback(
    (fallback: () => void) => {
      if (!allowHeaderDrCrSelection) {
        fallback();
        return;
      }
      window.setTimeout(() => {
        if (focusHeaderDrCrToggle()) return;
        fallback();
      }, 0);
    },
    [allowHeaderDrCrSelection, focusHeaderDrCrToggle]
  );
  const isReceiptFlow = voucherProfileKey === "receipt";
  const isJournalFlow = voucherProfileKey === "journal";
  const isReceiptCashSequence = isReceiptFlow && isCashMode;
  const isReceiptBankSequence = isReceiptFlow && !isCashMode;
  const isJournalCashSequence = isJournalFlow && isCashMode;
  const showLegacyReceiptCashLayout =
    isReceiptCashSequence || isJournalCashSequence;
  const showLegacyReceiptBankLayout = isReceiptBankSequence;
  const voucherNoLabel = "Voucher No. *";
  const voucherDateLabel = "Voucher Date *";
  const isReceiptReferenceLocked = false;
  const legacyBankRefNoLabel = refNoLabel;
  const legacyBankRefDateLabel = refDateLabel;
  const legacyReceiptRefDateInputId = `${refNoInputId}-date`;
  const showManagerInMainSection = requiresManager && isReceiptCashSequence;
  const showSalesmanInMainSection = isReceiptCashSequence;
  const showReceiptBookInMainSection = isReceiptCashSequence;
  const showNoteReferenceFields =
    voucherProfileKey === "credit-note" || voucherProfileKey === "debit-note";
  const showInvoiceControls = isReceiptCashSequence;
  const preferManagerStartOnReceiptCash =
    isReceiptCashSequence &&
    editingId == null &&
    paymentLedgerOptions.length === 1;
  const shouldSkipVoucherDateAutoFocus =
    voucherProfileKey === "receipt" && editingId == null;
  const lineEntryDrCrSuffix = allowLineDrCrSelection
    ? "Dr/Cr"
    : /(?:\(|\s)(Dr|Cr)\)?$/i.exec(lineEntryLedgerLabel)?.[1] ?? "Cr";
  const legacyAddressLabel = isBillWiseMode
    ? billWisePartyLedgerOption?.address?.trim() || "Address not available"
    : cashLedgerAddressLabel?.trim() || "Address not available";
  if (showLegacyReceiptCashLayout) {
    return (
      <div className="app-entry-section app-entry-section--header app-entry-section--legacy-cash">
        {formLevelError && (
          <small className="text-red-500">{formLevelError}</small>
        )}
        <div className="grid">
          <div className="col-12">
            <div className="app-entry-row app-entry-row--legacy-cash-top">
              {!paymentLedgerGroupDisabled ? (
                <div className="app-entry-field app-entry-field--legacy-ledger-group">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-sitemap">
                        {paymentLedgerGroupLabel}
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
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
                        clearFormError("cashLedgerId");
                      }}
                      placeholder="Ledger group"
                      loadingPlaceholder="Loading groups..."
                      onSelectNext={focusPaymentLedgerInput}
                      style={{ width: "100%" }}
                      panelStyle={{ width: "20rem" }}
                      disabled={paymentLedgerGroupDisabled}
                      appendTo={autoCompleteAppendTarget}
                    />
                  </AppNotchedField>
                </div>
              ) : null}

              <div className="app-entry-field app-entry-field--legacy-cash-ledger">
                <div className="app-entry-ledger-balance-row">
                  {cashLedgerBalanceLabel && (
                    <span
                      className={`app-entry-ledger-balance ${cashLedgerBalanceClass}`}
                    >
                      {cashLedgerBalanceLabel}
                    </span>
                  )}
                </div>
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-wallet">
                      {paymentLedgerLabel} *
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <LedgerAutoComplete
                    variant="purpose"
                    purpose={paymentLedgerPurpose}
                    openOnFocus={!preferManagerStartOnReceiptCash}
                    value={cashLedgerId}
                    selectedOption={cashLedgerOption}
                    onChange={(value, option) => {
                      updatePrimaryLedger(value, option);
                      clearFormError("cashLedgerId");
                    }}
                    options={paymentLedgerOptions}
                    loading={showPaymentLedgerSpinner}
                    loadingWhenPanelOpenOnly
                    placeholder={
                      showPaymentLedgerSpinner
                        ? paymentLedgerLoadingPlaceholder
                        : paymentLedgerPlaceholderResolved
                    }
                    loadingPlaceholder={paymentLedgerLoadingPlaceholder}
                    ref={cashLedgerInputRef}
                    className="app-entry-control"
                    disabled={!isFormActive}
                    ledgerGroupId={paymentLedgerGroupId}
                    onSelectNext={() => {
                      focusPrimaryLedgerNext(() => {
                        if (!showManagerInMainSection) {
                          legacyVoucherNoInputRef.current?.focus();
                          return;
                        }
                        const managerInput =
                          paidByInputRef.current?.getInput?.();
                        if (managerInput && !managerInput.disabled) {
                          managerInput.focus();
                          return;
                        }
                        focusPaidByInput();
                      });
                    }}
                  />
                </AppNotchedField>
                {renderFormError("cashLedgerId")}
              </div>

              {showManagerInMainSection ? (
                <div className="app-entry-field app-entry-field--manager">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-user">
                        {managerLabel}
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main app-notched-input--paid-by"
                    style={{ width: "100%" }}
                    htmlFor={paidByInputId}
                  >
                    <AppAutoComplete
                      inputId={paidByInputId}
                      value={managerValue}
                      suggestions={formManagerSuggestions}
                      completeMethod={(event: AutoCompleteCompleteEvent) => {
                        const query = event.query ?? "";
                        setFormManagerQuery(query);
                        setFormManagerSuggestions(
                          filterOptions(managerOptions, query)
                        );
                      }}
                      onFocus={() => {
                        setFormManagerSuggestions([...managerOptions]);
                      }}
                      onDropdownClick={() =>
                        setFormManagerSuggestions([...managerOptions])
                      }
                      preserveInputOnDropdownClick
                      onChange={(event: AutoCompleteChangeEvent) => {
                        const value = event.value as
                          | SelectOption
                          | string
                          | null;
                        clearFormError("managerId");
                        if (value == null) {
                          setFormManagerQuery("");
                          setFormManagerId(null);
                          return;
                        }
                        if (typeof value === "string") {
                          const trimmed = value.trim();
                          if (!trimmed) {
                            setFormManagerQuery("");
                            setFormManagerId(null);
                            return;
                          }
                          const match =
                            formManagerSuggestions.find(
                              (option) =>
                                option.label.toLowerCase() ===
                                trimmed.toLowerCase()
                            ) ??
                            managerOptions.find(
                              (option) =>
                                option.label.toLowerCase() ===
                                trimmed.toLowerCase()
                            ) ??
                            null;
                          if (match) {
                            setFormManagerQuery("");
                            setFormManagerId(match.value);
                            return;
                          }
                          setFormManagerQuery(value);
                          setFormManagerId(null);
                          return;
                        }
                        setFormManagerQuery("");
                        setFormManagerId(Number(value.value));
                      }}
                      onEnterNext={handleLegacyManagerEnter}
                      field="label"
                      placeholder=""
                      showEmptyMessage
                      loading={managersLoading}
                      showLoadingIcon
                      appendTo={autoCompleteAppendTarget}
                      disabled={!isFormActive}
                      className="app-entry-control"
                      style={{ width: "100%" }}
                      ref={paidByInputRef}
                    />
                  </AppNotchedField>
                  {renderFormError("managerId")}
                </div>
              ) : null}

              {showSalesmanInMainSection ? (
                <div className="app-entry-field app-entry-field--salesman">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-users">Salesman</LabelWithIcon>
                    }
                    className="app-notched-input--entry-main app-notched-input--paid-by"
                    style={{ width: "100%" }}
                  >
                    <AppAutoComplete
                      value={salesmanValue}
                      suggestions={formSalesmanSuggestions}
                      completeMethod={(event: AutoCompleteCompleteEvent) => {
                        const query = event.query ?? "";
                        setFormSalesmanQuery(query);
                        setFormSalesmanSuggestions(
                          filterOptions(salesmanOptions, query)
                        );
                      }}
                      onFocus={() => {
                        setFormSalesmanSuggestions([...salesmanOptions]);
                      }}
                      onDropdownClick={() =>
                        setFormSalesmanSuggestions([...salesmanOptions])
                      }
                      preserveInputOnDropdownClick
                      onChange={handleSalesmanChange}
                      onSelect={handleSalesmanSelect}
                      onEnterNext={handleLegacySalesmanEnter}
                      field="label"
                      placeholder=""
                      showEmptyMessage
                      loading={salesmenLoading}
                      showLoadingIcon
                      appendTo={autoCompleteAppendTarget}
                      disabled={!isFormActive}
                      className="app-entry-control"
                      style={{ width: "100%" }}
                      ref={legacySalesmanInputRef}
                    />
                  </AppNotchedField>
                  {renderFormError("salesmanId")}
                  {salesmanIssueInfoMessage ? (
                    <small className="text-orange-600">
                      {salesmanIssueInfoMessage}
                    </small>
                  ) : null}
                </div>
              ) : null}

              {showReceiptBookInMainSection ? (
                <div className="app-entry-field app-entry-field--receipt-book">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-book">Receipt Book</LabelWithIcon>
                    }
                    className="app-notched-input--entry-main app-notched-input--paid-by"
                    style={{ width: "100%" }}
                  >
                    <AppDropdown
                      inputId={chequeBookInputId}
                      value={chequeIssueBookId}
                      options={receiptIssueBookOptions}
                      ref={chequeBookDropdownRef}
                      onChange={(e) => {
                        setChequeIssueBookId(e.value as number | null);
                        clearFormError("chequeIssueBookId");
                      }}
                      placeholder={
                        !hasReceiptSalesmanSelection
                          ? "Select salesman first"
                          : "Select receipt book"
                      }
                      loading={receiptIssueBooksLoading}
                      showLoadingIcon
                      disabled={!isFormActive || !hasReceiptSalesmanSelection}
                      className="app-entry-control"
                      onEnterNext={focusLegacyVoucherNoInput}
                    />
                  </AppNotchedField>
                  {renderFormError("chequeIssueBookId")}
                </div>
              ) : null}

              {isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-search">
                  <Button
                    type="button"
                    label="Search Party (F7)"
                    icon="pi pi-search"
                    className="p-button-text p-button-sm"
                    onClick={searchInvoiceBills}
                    disabled={!isFormActive}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="col-12">
            <div className="app-entry-row app-entry-row--legacy-cash-middle">
              <div className="app-entry-field app-entry-field--voucher-no">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-hashtag">
                      {voucherNoLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    value={voucherNo}
                    onChange={(e) => {
                      setVoucherNo(e.target.value);
                      clearFormError("voucherNo");
                    }}
                    onEnterNext={focusVoucherDateInput}
                    className={`app-entry-control${
                      !isVoucherNoAuto ? " app-field-noneditable" : ""
                    }`}
                    disabled={!isFormActive || saving}
                    readOnly={!isVoucherNoAuto}
                    ref={legacyVoucherNoInputRef}
                  />
                </AppNotchedField>
                {renderFormError("voucherNo")}
              </div>

              <div className="app-entry-field app-entry-field--voucher-date">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-calendar">
                      {voucherDateLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppDateInput
                    value={voucherDate}
                    onChange={(value) => {
                      setVoucherDate(value);
                      setPostingDate(value);
                      setPostingDateError(null);
                      setVoucherDateError(null);
                    }}
                    onCommit={(value, raw) => {
                      setVoucherDateError(resolveDateInputError(value, raw));
                    }}
                    fiscalYearStart={fiscalRange?.start ?? null}
                    fiscalYearEnd={fiscalRange?.end ?? null}
                    enforceFiscalRange
                    disabled={!isFormActive}
                    autoFocus={
                      isFormActive && !shouldSkipVoucherDateAutoFocus
                    }
                    inputRef={voucherDateInputRef}
                    focusSignal={
                      shouldSkipVoucherDateAutoFocus ? undefined : focusNonce
                    }
                    className="app-entry-control"
                    onEnterNext={() => {
                      if (focusRefNoInput()) return;
                      if (isBillWiseMode) {
                        if (focusLegacyBillWiseLedgerGroupInput()) return;
                        if (focusLegacyBillWiseLedgerInput()) return;
                      }
                      focusCashLedgerAmountInput();
                    }}
                  />
                </AppNotchedField>
                {voucherDateError && (
                  <small className="text-red-500">{voucherDateError}</small>
                )}
              </div>

              <div className="app-entry-field app-entry-field--legacy-bank-ref-no">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-file-edit">
                      {legacyBankRefNoLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    id={refNoInputId}
                    value={refNo}
                    onChange={(e) => {
                      setRefNo(e.target.value);
                      clearFormError("refNo");
                    }}
                    onEnterNext={handleLegacyReceiptRefNoEnter}
                    className="app-entry-control"
                    disabled={!isFormActive || isReceiptReferenceLocked}
                    ref={(element) => {
                      if (element instanceof HTMLInputElement) {
                        refNoInputRef.current = element;
                        return;
                      }
                      const input = (
                        element as { getInput?: () => unknown } | null
                      )?.getInput?.();
                      refNoInputRef.current =
                        input instanceof HTMLInputElement ? input : null;
                    }}
                  />
                </AppNotchedField>
                {renderFormError("refNo")}
              </div>

              <div className="app-entry-field app-entry-field--legacy-bank-ref-date">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-calendar">
                      {legacyBankRefDateLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppDateInput
                    inputId={legacyReceiptRefDateInputId}
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
                    disabled={!isFormActive || isReceiptReferenceLocked}
                    className="app-entry-control"
                    inputRef={legacyReceiptRefDateInputRef}
                    onEnterNext={() => {
                      if (isBillWiseMode) {
                        if (focusLegacyBillWiseLedgerGroupInput()) return;
                        if (focusLegacyBillWiseLedgerInput()) return;
                      }
                      focusCashLedgerAmountInput();
                    }}
                  />
                </AppNotchedField>
                {refDateError && (
                  <small className="text-red-500">{refDateError}</small>
                )}
              </div>
            </div>
          </div>

          {isBillWiseMode ? (
            <div className="col-12">
              <div className="app-entry-row app-entry-row--legacy-cash-party">
                <div className="app-entry-field app-entry-field--legacy-party-ledger-group">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-sitemap">{`Ledger Group (${lineEntryDrCrSuffix})`}</LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <LedgerGroupAutoComplete
                      value={billWisePartyLedgerGroupId}
                      options={ledgerGroupOptions}
                      loading={ledgerGroupOptionsLoading}
                      loadingWhenPanelOpenOnly
                      onChange={(nextValue) =>
                        updateBillWisePartyLedgerGroupId(nextValue)
                      }
                      placeholder="Select group"
                      loadingPlaceholder="Loading groups..."
                      onSelectNext={focusLegacyBillWiseLedgerInput}
                      style={{ width: "100%" }}
                      panelStyle={{ width: "20rem" }}
                      disabled={!isFormActive}
                      appendTo={autoCompleteAppendTarget}
                      ref={legacyBillWiseLedgerGroupInputRef}
                    />
                  </AppNotchedField>
                </div>
                <div className="app-entry-field app-entry-field--legacy-party-ledger">
                  <div className="app-entry-ledger-balance-row">
                    {billWisePartyLedgerBalanceLabel && (
                      <span
                        className={`app-entry-ledger-balance ${billWisePartyLedgerBalanceClass}`}
                      >
                        {billWisePartyLedgerBalanceLabel}
                      </span>
                    )}
                  </div>
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-wallet">{`${lineEntryLedgerLabel} *`}</LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <LedgerAutoComplete
                      variant="purpose"
                      purpose={lineEntryPurpose}
                      value={billWisePartyLedgerId}
                      selectedOption={billWisePartyLedgerOption}
                      onChange={(value, option) =>
                        updateBillWisePartyLedger(value, option)
                      }
                      loadingWhenPanelOpenOnly
                      placeholder="Select ledger"
                      loadingPlaceholder="Loading ledgers..."
                      style={{ width: "100%" }}
                      className="app-entry-control"
                      disabled={!isFormActive}
                      appendTo={autoCompleteAppendTarget}
                      ledgerGroupId={billWisePartyLedgerGroupId}
                      onSelectNext={focusCashLedgerAmountInput}
                      ref={legacyBillWiseLedgerInputRef}
                    />
                  </AppNotchedField>
                  {renderFormError("billWisePartyLedgerId")}
                </div>

                <div className="app-entry-field app-entry-field--legacy-net-amount-inline">
                  <div className="app-entry-ledger-amount-row">
                    <AppDrCrToggle
                      value={headerDrCrToggleValue}
                      onChange={updateHeaderDrCr}
                      disabled={
                        !isFormActive || saving || !allowHeaderDrCrSelection
                      }
                      className="app-entry-control app-entry-drcr"
                      ref={headerDrCrToggleRef}
                    />
                    <AppNotchedField
                      label={
                        <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                          Net Amount *
                        </LabelWithIcon>
                      }
                      className="app-notched-input--entry-main app-entry-ledger-amount-input"
                      style={{ width: "100%" }}
                    >
                      <AppInput
                        inputType="number"
                        value={cashLedgerAmount}
                        onValueChange={(event) => {
                          syncCashLedgerAmountInput(
                            undefined,
                            (event.value as number | null) ?? null
                          );
                        }}
                        onKeyUp={(event) => {
                          const target =
                            event.currentTarget as HTMLInputElement | null;
                          if (!target) return;
                          window.setTimeout(() => {
                            syncCashLedgerAmountDraftInput(target.value);
                          }, 0);
                        }}
                        mode="decimal"
                        minFractionDigits={2}
                        maxFractionDigits={2}
                        inputRef={(element) => {
                          cashLedgerAmountInputRef.current = element;
                        }}
                        inputStyle={{ width: "100%", textAlign: "right" }}
                        className="app-entry-control"
                        disabled={!isFormActive}
                      />
                    </AppNotchedField>
                  </div>
                  {renderFormError("cashLedgerAmount")}
                  {supplementaryHeaderPostingAmount > 0 && !isBillWiseMode ? (
                    <small className="app-entry-ledger-amount-hint text-600">
                      {`${paymentLedgerLabel} posting: ${formatAmount(
                        effectivePrimaryLedgerAmount
                      )} ${headerDrCrLabel} + preserved adjustments ${formatAmount(
                        supplementaryHeaderPostingAmount
                      )} ${headerDrCrLabel}`}
                    </small>
                  ) : null}
                </div>

                <div className="app-entry-field app-entry-field--legacy-address">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-map-marker">
                        Address
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <div className="app-notched-input__surface ledger-meta-address">
                      <span className="text-700 text-sm">
                        {legacyAddressLabel}
                      </span>
                    </div>
                  </AppNotchedField>
                </div>
              </div>
            </div>
          ) : null}

          <div className="col-12">
            <div className="app-entry-row app-entry-row--legacy-cash-bottom">
              {!isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-net-amount">
                  <div className="app-entry-ledger-amount-row">
                    <AppDrCrToggle
                      value={headerDrCrToggleValue}
                      onChange={updateHeaderDrCr}
                      disabled={
                        !isFormActive || saving || !allowHeaderDrCrSelection
                      }
                      className="app-entry-control app-entry-drcr"
                      ref={headerDrCrToggleRef}
                    />
                    <AppNotchedField
                      label={
                        <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                          Net Amount *
                        </LabelWithIcon>
                      }
                      className="app-notched-input--entry-main app-entry-ledger-amount-input"
                      style={{ width: "100%" }}
                    >
                      <AppInput
                        inputType="number"
                        value={cashLedgerAmount}
                        onValueChange={(event) => {
                          syncCashLedgerAmountInput(
                            undefined,
                            (event.value as number | null) ?? null
                          );
                        }}
                        onKeyUp={(event) => {
                          const target =
                            event.currentTarget as HTMLInputElement | null;
                          if (!target) return;
                          window.setTimeout(() => {
                            syncCashLedgerAmountDraftInput(target.value);
                          }, 0);
                        }}
                        mode="decimal"
                        minFractionDigits={2}
                        maxFractionDigits={2}
                        inputRef={(element) => {
                          cashLedgerAmountInputRef.current = element;
                        }}
                        inputStyle={{ width: "100%", textAlign: "right" }}
                        className="app-entry-control"
                        disabled={!isFormActive}
                      />
                    </AppNotchedField>
                  </div>
                  {renderFormError("cashLedgerAmount")}
                  {supplementaryHeaderPostingAmount > 0 && !isBillWiseMode ? (
                    <small className="app-entry-ledger-amount-hint text-600">
                      {`${paymentLedgerLabel} posting: ${formatAmount(
                        effectivePrimaryLedgerAmount
                      )} ${headerDrCrLabel} + preserved adjustments ${formatAmount(
                        supplementaryHeaderPostingAmount
                      )} ${headerDrCrLabel}`}
                    </small>
                  ) : null}
                </div>
              ) : null}
              {isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-discount">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                        Discount
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <AppInput
                      inputType="number"
                      value={billWiseDiscountAmount}
                      onValueChange={(event) => {
                        updateBillWiseDiscountAmount(
                          (event.value as number | null) ?? null
                        );
                      }}
                      mode="decimal"
                      min={0}
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      inputStyle={{ width: "100%", textAlign: "right" }}
                      className="app-entry-control"
                      disabled={!isFormActive}
                    />
                  </AppNotchedField>
                  {renderFormError("billWiseDiscountLedgerId")}
                </div>
              ) : null}
              {isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-cheque-return">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                        Cheque Return
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <AppInput
                      inputType="number"
                      value={billWiseChequeReturnCharges}
                      onValueChange={(event) => {
                        updateBillWiseChequeReturnCharges(
                          (event.value as number | null) ?? null
                        );
                      }}
                      mode="decimal"
                      min={0}
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      inputStyle={{ width: "100%", textAlign: "right" }}
                      className="app-entry-control"
                      disabled={!isFormActive}
                    />
                  </AppNotchedField>
                  {renderFormError("billWiseChequeReturnLedgerId")}
                </div>
              ) : null}

              <div className="app-entry-field app-entry-field--legacy-remark">
                <AppNotchedField
                  label={<LabelWithIcon icon="pi-pencil">Remark</LabelWithIcon>}
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    value={narration}
                    onChange={(event) => setNarration(event.target.value)}
                    className="app-entry-control"
                    disabled={!isFormActive}
                    onEnterNext={handleNarrationEnter}
                  />
                </AppNotchedField>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showLegacyReceiptBankLayout) {
    return (
      <div className="app-entry-section app-entry-section--header app-entry-section--legacy-bank">
        {formLevelError && (
          <small className="text-red-500">{formLevelError}</small>
        )}
        <div className="grid">
          <div className="col-12">
            <div className="app-entry-row app-entry-row--legacy-bank-top">
              {!paymentLedgerGroupDisabled ? (
                <div className="app-entry-field app-entry-field--legacy-bank-ledger-group">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-sitemap">
                        {paymentLedgerGroupLabel}
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
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
                        clearFormError("cashLedgerId");
                      }}
                      placeholder="Ledger group"
                      loadingPlaceholder="Loading groups..."
                      onSelectNext={focusPaymentLedgerInput}
                      style={{ width: "100%" }}
                      panelStyle={{ width: "20rem" }}
                      disabled={paymentLedgerGroupDisabled}
                      appendTo={autoCompleteAppendTarget}
                    />
                  </AppNotchedField>
                </div>
              ) : null}

              <div className="app-entry-field app-entry-field--legacy-bank-ledger">
                <div className="app-entry-ledger-balance-row">
                  {cashLedgerBalanceLabel && (
                    <span
                      className={`app-entry-ledger-balance ${cashLedgerBalanceClass}`}
                    >
                      {cashLedgerBalanceLabel}
                    </span>
                  )}
                </div>
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-wallet">
                      {paymentLedgerLabel} *
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <LedgerAutoComplete
                    variant="purpose"
                    purpose={paymentLedgerPurpose}
                    openOnFocus={!preferManagerStartOnReceiptCash}
                    value={cashLedgerId}
                    selectedOption={cashLedgerOption}
                    onChange={(value, option) => {
                      updatePrimaryLedger(value, option);
                      clearFormError("cashLedgerId");
                    }}
                    options={paymentLedgerOptions}
                    loading={showPaymentLedgerSpinner}
                    loadingWhenPanelOpenOnly
                    placeholder={
                      showPaymentLedgerSpinner
                        ? paymentLedgerLoadingPlaceholder
                        : paymentLedgerPlaceholderResolved
                    }
                    loadingPlaceholder={paymentLedgerLoadingPlaceholder}
                    ref={cashLedgerInputRef}
                    className="app-entry-control"
                    disabled={!isFormActive}
                    ledgerGroupId={paymentLedgerGroupId}
                    onSelectNext={() => {
                      focusPrimaryLedgerNext(() => {
                        legacyVoucherNoInputRef.current?.focus();
                      });
                    }}
                  />
                </AppNotchedField>
                {renderFormError("cashLedgerId")}
              </div>

              <div className="app-entry-field app-entry-field--voucher-no">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-hashtag">
                      {voucherNoLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    value={voucherNo}
                    onChange={(e) => {
                      setVoucherNo(e.target.value);
                      clearFormError("voucherNo");
                    }}
                    onEnterNext={focusVoucherDateInput}
                    className={`app-entry-control${
                      !isVoucherNoAuto ? " app-field-noneditable" : ""
                    }`}
                    disabled={!isFormActive || saving}
                    readOnly={!isVoucherNoAuto}
                    ref={legacyVoucherNoInputRef}
                  />
                </AppNotchedField>
                {renderFormError("voucherNo")}
              </div>

              <div className="app-entry-field app-entry-field--voucher-date">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-calendar">
                      {voucherDateLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppDateInput
                    value={voucherDate}
                    onChange={(value) => {
                      setVoucherDate(value);
                      setPostingDate(value);
                      setPostingDateError(null);
                      setVoucherDateError(null);
                    }}
                    onCommit={(value, raw) => {
                      setVoucherDateError(resolveDateInputError(value, raw));
                    }}
                    fiscalYearStart={fiscalRange?.start ?? null}
                    fiscalYearEnd={fiscalRange?.end ?? null}
                    enforceFiscalRange
                    disabled={!isFormActive}
                    autoFocus={
                      isFormActive && !shouldSkipVoucherDateAutoFocus
                    }
                    inputRef={voucherDateInputRef}
                    focusSignal={
                      shouldSkipVoucherDateAutoFocus ? undefined : focusNonce
                    }
                    className="app-entry-control"
                    onEnterNext={() => {
                      if (isBillWiseMode) {
                        if (focusLegacyBillWiseLedgerGroupInput()) return;
                        if (focusLegacyBillWiseLedgerInput()) return;
                      }
                      focusCashLedgerAmountInput();
                    }}
                  />
                </AppNotchedField>
                {voucherDateError && (
                  <small className="text-red-500">{voucherDateError}</small>
                )}
              </div>

              <div className="app-entry-field app-entry-field--legacy-bank-ref-no">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-file-edit">
                      {legacyBankRefNoLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    id={refNoInputId}
                    value={refNo}
                    onChange={(e) => {
                      setRefNo(e.target.value);
                      clearFormError("refNo");
                    }}
                    onEnterNext={handleLegacyReceiptRefNoEnter}
                    className="app-entry-control"
                    disabled={!isFormActive || isReceiptReferenceLocked}
                    ref={(element) => {
                      if (element instanceof HTMLInputElement) {
                        refNoInputRef.current = element;
                        return;
                      }
                      const input = (
                        element as { getInput?: () => unknown } | null
                      )?.getInput?.();
                      refNoInputRef.current =
                        input instanceof HTMLInputElement ? input : null;
                    }}
                  />
                </AppNotchedField>
                {renderFormError("refNo")}
              </div>

              <div className="app-entry-field app-entry-field--legacy-bank-ref-date">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-calendar">
                      {legacyBankRefDateLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppDateInput
                    inputId={legacyReceiptRefDateInputId}
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
                    disabled={!isFormActive || isReceiptReferenceLocked}
                    className="app-entry-control"
                    inputRef={legacyReceiptRefDateInputRef}
                  />
                </AppNotchedField>
                {refDateError && (
                  <small className="text-red-500">{refDateError}</small>
                )}
              </div>

              {isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-search">
                  <Button
                    type="button"
                    label="Search Party (F7)"
                    icon="pi pi-search"
                    className="p-button-text p-button-sm"
                    onClick={searchInvoiceBills}
                    disabled={!isFormActive}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {isBillWiseMode ? (
            <div className="col-12">
              <div className="app-entry-row app-entry-row--legacy-bank-middle">
                <div className="app-entry-field app-entry-field--legacy-party-ledger-group">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-sitemap">{`Ledger Group (${lineEntryDrCrSuffix})`}</LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <LedgerGroupAutoComplete
                      value={billWisePartyLedgerGroupId}
                      options={ledgerGroupOptions}
                      loading={ledgerGroupOptionsLoading}
                      loadingWhenPanelOpenOnly
                      onChange={(nextValue) =>
                        updateBillWisePartyLedgerGroupId(nextValue)
                      }
                      placeholder="Select group"
                      loadingPlaceholder="Loading groups..."
                      onSelectNext={focusLegacyBillWiseLedgerInput}
                      style={{ width: "100%" }}
                      panelStyle={{ width: "20rem" }}
                      disabled={!isFormActive}
                      appendTo={autoCompleteAppendTarget}
                      ref={legacyBillWiseLedgerGroupInputRef}
                    />
                  </AppNotchedField>
                </div>
                <div className="app-entry-field app-entry-field--legacy-party-ledger">
                  <div className="app-entry-ledger-balance-row">
                    {billWisePartyLedgerBalanceLabel && (
                      <span
                        className={`app-entry-ledger-balance ${billWisePartyLedgerBalanceClass}`}
                      >
                        {billWisePartyLedgerBalanceLabel}
                      </span>
                    )}
                  </div>
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-wallet">{`${lineEntryLedgerLabel} *`}</LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <LedgerAutoComplete
                      variant="purpose"
                      purpose={lineEntryPurpose}
                      value={billWisePartyLedgerId}
                      selectedOption={billWisePartyLedgerOption}
                      onChange={(value, option) =>
                        updateBillWisePartyLedger(value, option)
                      }
                      loadingWhenPanelOpenOnly
                      placeholder="Select ledger"
                      loadingPlaceholder="Loading ledgers..."
                      style={{ width: "100%" }}
                      className="app-entry-control"
                      disabled={!isFormActive}
                      appendTo={autoCompleteAppendTarget}
                      ledgerGroupId={billWisePartyLedgerGroupId}
                      onSelectNext={focusCashLedgerAmountInput}
                      ref={legacyBillWiseLedgerInputRef}
                    />
                  </AppNotchedField>
                  {renderFormError("billWisePartyLedgerId")}
                </div>

                <div className="app-entry-field app-entry-field--legacy-net-amount-inline">
                  <div className="app-entry-ledger-amount-row">
                    <AppDrCrToggle
                      value={headerDrCrToggleValue}
                      onChange={updateHeaderDrCr}
                      disabled={
                        !isFormActive || saving || !allowHeaderDrCrSelection
                      }
                      className="app-entry-control app-entry-drcr"
                      ref={headerDrCrToggleRef}
                    />
                    <AppNotchedField
                      label={
                        <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                          Net Amount *
                        </LabelWithIcon>
                      }
                      className="app-notched-input--entry-main app-entry-ledger-amount-input"
                      style={{ width: "100%" }}
                    >
                      <AppInput
                        inputType="number"
                        value={cashLedgerAmount}
                        onValueChange={(event) => {
                          syncCashLedgerAmountInput(
                            undefined,
                            (event.value as number | null) ?? null
                          );
                        }}
                        onKeyUp={(event) => {
                          const target =
                            event.currentTarget as HTMLInputElement | null;
                          if (!target) return;
                          window.setTimeout(() => {
                            syncCashLedgerAmountDraftInput(target.value);
                          }, 0);
                        }}
                        mode="decimal"
                        minFractionDigits={2}
                        maxFractionDigits={2}
                        inputRef={(element) => {
                          cashLedgerAmountInputRef.current = element;
                        }}
                        inputStyle={{ width: "100%", textAlign: "right" }}
                        className="app-entry-control"
                        disabled={!isFormActive}
                      />
                    </AppNotchedField>
                  </div>
                  {renderFormError("cashLedgerAmount")}
                  {supplementaryHeaderPostingAmount > 0 && !isBillWiseMode ? (
                    <small className="app-entry-ledger-amount-hint text-600">
                      {`${paymentLedgerLabel} posting: ${formatAmount(
                        effectivePrimaryLedgerAmount
                      )} ${headerDrCrLabel} + preserved adjustments ${formatAmount(
                        supplementaryHeaderPostingAmount
                      )} ${headerDrCrLabel}`}
                    </small>
                  ) : null}
                </div>

                <div className="app-entry-field app-entry-field--legacy-address">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-map-marker">
                        Address
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <div className="app-notched-input__surface ledger-meta-address">
                      <span className="text-700 text-sm">
                        {legacyAddressLabel}
                      </span>
                    </div>
                  </AppNotchedField>
                </div>
              </div>
            </div>
          ) : null}

          <div className="col-12">
            <div className="app-entry-row app-entry-row--legacy-cash-bottom">
              {!isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-net-amount">
                  <div className="app-entry-ledger-amount-row">
                    <AppDrCrToggle
                      value={headerDrCrToggleValue}
                      onChange={updateHeaderDrCr}
                      disabled={
                        !isFormActive || saving || !allowHeaderDrCrSelection
                      }
                      className="app-entry-control app-entry-drcr"
                      ref={headerDrCrToggleRef}
                    />
                    <AppNotchedField
                      label={
                        <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                          Net Amount *
                        </LabelWithIcon>
                      }
                      className="app-notched-input--entry-main app-entry-ledger-amount-input"
                      style={{ width: "100%" }}
                    >
                      <AppInput
                        inputType="number"
                        value={cashLedgerAmount}
                        onValueChange={(event) => {
                          syncCashLedgerAmountInput(
                            undefined,
                            (event.value as number | null) ?? null
                          );
                        }}
                        onKeyUp={(event) => {
                          const target =
                            event.currentTarget as HTMLInputElement | null;
                          if (!target) return;
                          window.setTimeout(() => {
                            syncCashLedgerAmountDraftInput(target.value);
                          }, 0);
                        }}
                        mode="decimal"
                        minFractionDigits={2}
                        maxFractionDigits={2}
                        inputRef={(element) => {
                          cashLedgerAmountInputRef.current = element;
                        }}
                        inputStyle={{ width: "100%", textAlign: "right" }}
                        className="app-entry-control"
                        disabled={!isFormActive}
                      />
                    </AppNotchedField>
                  </div>
                  {renderFormError("cashLedgerAmount")}
                  {supplementaryHeaderPostingAmount > 0 && !isBillWiseMode ? (
                    <small className="app-entry-ledger-amount-hint text-600">
                      {`${paymentLedgerLabel} posting: ${formatAmount(
                        effectivePrimaryLedgerAmount
                      )} ${headerDrCrLabel} + preserved adjustments ${formatAmount(
                        supplementaryHeaderPostingAmount
                      )} ${headerDrCrLabel}`}
                    </small>
                  ) : null}
                </div>
              ) : null}
              {isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-discount">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                        Discount
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <AppInput
                      inputType="number"
                      value={billWiseDiscountAmount}
                      onValueChange={(event) => {
                        updateBillWiseDiscountAmount(
                          (event.value as number | null) ?? null
                        );
                      }}
                      mode="decimal"
                      min={0}
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      inputStyle={{ width: "100%", textAlign: "right" }}
                      className="app-entry-control"
                      disabled={!isFormActive}
                    />
                  </AppNotchedField>
                  {renderFormError("billWiseDiscountLedgerId")}
                </div>
              ) : null}
              {isBillWiseMode ? (
                <div className="app-entry-field app-entry-field--legacy-cheque-return">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                        Cheque Return
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <AppInput
                      inputType="number"
                      value={billWiseChequeReturnCharges}
                      onValueChange={(event) => {
                        updateBillWiseChequeReturnCharges(
                          (event.value as number | null) ?? null
                        );
                      }}
                      mode="decimal"
                      min={0}
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      inputStyle={{ width: "100%", textAlign: "right" }}
                      className="app-entry-control"
                      disabled={!isFormActive}
                    />
                  </AppNotchedField>
                  {renderFormError("billWiseChequeReturnLedgerId")}
                </div>
              ) : null}

              <div className="app-entry-field app-entry-field--legacy-remark">
                <AppNotchedField
                  label={<LabelWithIcon icon="pi-pencil">Remark</LabelWithIcon>}
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    value={narration}
                    onChange={(event) => setNarration(event.target.value)}
                    className="app-entry-control"
                    disabled={!isFormActive}
                    onEnterNext={handleNarrationEnter}
                  />
                </AppNotchedField>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-entry-section app-entry-section--header">
      {formLevelError && (
        <small className="text-red-500">{formLevelError}</small>
      )}
      <div className="grid">
        <div
          className={`col-12 ${
            showLegacyReceiptCashLayout
              ? "app-entry-section-order-secondary"
              : ""
          }`}
        >
          <div
            className={`app-entry-row ${
              showLegacyReceiptCashLayout
                ? "app-entry-row--legacy-sequence"
                : ""
            }`}
          >
            <div className="app-entry-field app-entry-field--voucher-no">
              <AppNotchedField
                label={
                  <LabelWithIcon icon="pi-hashtag">
                    {voucherNoLabel}
                  </LabelWithIcon>
                }
                className="app-notched-input--entry-main"
                style={{ width: "100%" }}
              >
                <AppInput
                  value={voucherNo}
                  onChange={(e) => {
                    setVoucherNo(e.target.value);
                    clearFormError("voucherNo");
                  }}
                  onEnterNext={focusVoucherDateInput}
                  className={`app-entry-control${
                    !isVoucherNoAuto ? " app-field-noneditable" : ""
                  }`}
                  disabled={!isFormActive || saving}
                  readOnly={!isVoucherNoAuto}
                />
              </AppNotchedField>
              {renderFormError("voucherNo")}
            </div>
            <div className="app-entry-field app-entry-field--voucher-date">
              <AppNotchedField
                label={
                  <LabelWithIcon icon="pi-calendar">
                    {voucherDateLabel}
                  </LabelWithIcon>
                }
                className="app-notched-input--entry-main"
                style={{ width: "100%" }}
              >
                <AppDateInput
                  value={voucherDate}
                  onChange={(value) => {
                    setVoucherDate(value);
                    if (showLegacyReceiptCashLayout) {
                      setPostingDate(value);
                      setPostingDateError(null);
                    }
                    setVoucherDateError(null);
                  }}
                  onCommit={(value, raw) => {
                    setVoucherDateError(resolveDateInputError(value, raw));
                  }}
                  fiscalYearStart={fiscalRange?.start ?? null}
                  fiscalYearEnd={fiscalRange?.end ?? null}
                  enforceFiscalRange
                  disabled={!isFormActive}
                  autoFocus={isFormActive && !shouldSkipVoucherDateAutoFocus}
                  inputRef={voucherDateInputRef}
                  focusSignal={
                    shouldSkipVoucherDateAutoFocus ? undefined : focusNonce
                  }
                  className="app-entry-control"
                  onEnterNext={() => {
                    if (showLegacyReceiptCashLayout) {
                      focusCashLedgerAmountInput();
                      return;
                    }
                    if (editingId == null) {
                      const nextDate =
                        parseDateText(
                          voucherDateInputRef.current?.value ?? ""
                        ) ?? voucherDate;
                      if (nextDate) {
                        setPostingDate(nextDate);
                        setPostingDateError(null);
                      }
                    }
                    postingDateInputRef.current?.focus();
                  }}
                />
              </AppNotchedField>
              {voucherDateError && (
                <small className="text-red-500">{voucherDateError}</small>
              )}
            </div>
            {showManagerInMainSection ? (
              <div className="app-entry-field app-entry-field--manager">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-user">{managerLabel}</LabelWithIcon>
                  }
                  className="app-notched-input--entry-main app-notched-input--paid-by"
                  style={{ width: "100%" }}
                  htmlFor={paidByInputId}
                >
                  <AppAutoComplete
                    inputId={paidByInputId}
                    value={managerValue}
                    suggestions={formManagerSuggestions}
                    completeMethod={(event: AutoCompleteCompleteEvent) => {
                      const query = event.query ?? "";
                      setFormManagerQuery(query);
                      setFormManagerSuggestions(
                        filterOptions(managerOptions, query)
                      );
                    }}
                    onFocus={() => {
                      setFormManagerSuggestions([...managerOptions]);
                    }}
                    onDropdownClick={() =>
                      setFormManagerSuggestions([...managerOptions])
                    }
                    preserveInputOnDropdownClick
                    onChange={(event: AutoCompleteChangeEvent) => {
                      const value = event.value as SelectOption | string | null;
                      clearFormError("managerId");
                      if (value == null) {
                        setFormManagerQuery("");
                        setFormManagerId(null);
                        return;
                      }
                      if (typeof value === "string") {
                        const trimmed = value.trim();
                        if (!trimmed) {
                          setFormManagerQuery("");
                          setFormManagerId(null);
                          return;
                        }
                        const match =
                          formManagerSuggestions.find(
                            (option) =>
                              option.label.toLowerCase() ===
                              trimmed.toLowerCase()
                          ) ??
                          managerOptions.find(
                            (option) =>
                              option.label.toLowerCase() ===
                              trimmed.toLowerCase()
                          ) ??
                          null;
                        if (match) {
                          setFormManagerQuery("");
                          setFormManagerId(match.value);
                          return;
                        }
                        setFormManagerQuery(value);
                        setFormManagerId(null);
                        return;
                      }
                      setFormManagerQuery("");
                      setFormManagerId(Number(value.value));
                    }}
                    field="label"
                    placeholder=""
                    showEmptyMessage
                    loading={managersLoading}
                    showLoadingIcon
                    appendTo={autoCompleteAppendTarget}
                    disabled={!isFormActive}
                    className="app-entry-control"
                    style={{ width: "100%" }}
                    ref={paidByInputRef}
                  />
                </AppNotchedField>
                {renderFormError("managerId")}
              </div>
            ) : null}
            {showSalesmanInMainSection ? (
              <div className="app-entry-field app-entry-field--salesman">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-users">Salesman</LabelWithIcon>
                  }
                  className="app-notched-input--entry-main app-notched-input--paid-by"
                  style={{ width: "100%" }}
                >
                  <AppAutoComplete
                    value={salesmanValue}
                    suggestions={formSalesmanSuggestions}
                    completeMethod={(event: AutoCompleteCompleteEvent) => {
                      const query = event.query ?? "";
                      setFormSalesmanQuery(query);
                      setFormSalesmanSuggestions(
                        filterOptions(salesmanOptions, query)
                      );
                    }}
                    onFocus={() => {
                      setFormSalesmanSuggestions([...salesmanOptions]);
                    }}
                    onDropdownClick={() =>
                      setFormSalesmanSuggestions([...salesmanOptions])
                    }
                    preserveInputOnDropdownClick
                    onChange={handleSalesmanChange}
                    onSelect={handleSalesmanSelect}
                    field="label"
                    placeholder=""
                    showEmptyMessage
                    loading={salesmenLoading}
                    showLoadingIcon
                    appendTo={autoCompleteAppendTarget}
                    disabled={!isFormActive}
                    className="app-entry-control"
                    style={{ width: "100%" }}
                    ref={legacySalesmanInputRef}
                  />
                </AppNotchedField>
                {renderFormError("salesmanId")}
                {salesmanIssueInfoMessage ? (
                  <small className="text-orange-600">
                    {salesmanIssueInfoMessage}
                  </small>
                ) : null}
              </div>
            ) : null}
            {showInvoiceControls && isBillWiseMode ? (
              <div className="app-entry-field app-entry-field--wide app-entry-field--invoice-controls">
                <div className="flex align-items-center flex-wrap gap-3 pt-2">
                  <Button
                    type="button"
                    label="Search Party (F7)"
                    icon="pi pi-search"
                    className="p-button-text p-button-sm"
                    onClick={searchInvoiceBills}
                    disabled={!isFormActive}
                  />
                </div>
              </div>
            ) : null}
            {!showLegacyReceiptCashLayout ? (
              <div className="app-entry-field">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-calendar-plus">
                      Posting Date *
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
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
                {postingDateError && (
                  <small className="text-red-500">{postingDateError}</small>
                )}
              </div>
            ) : null}
            {!showLegacyReceiptCashLayout && showPaymentVia && (
              <div className="app-entry-field">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-credit-card">
                      Payment Via
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main app-notched-input--paid-by"
                  style={{ width: "100%" }}
                >
                  <AppDropdown
                    inputId={paymentViaInputId}
                    value={paymentViaId}
                    options={paymentViaOptions}
                    onChange={(e) => {
                      setPaymentViaId(e.value as number | null);
                      clearFormError("chequeIssueBookId");
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
            {!showLegacyReceiptCashLayout && isChequePayment && (
              <div className="app-entry-field app-entry-field--wide">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-book">Cheque Book</LabelWithIcon>
                  }
                  className="app-notched-input--entry-main app-notched-input--paid-by"
                  style={{ width: "100%" }}
                >
                  <AppDropdown
                    inputId={chequeBookInputId}
                    value={chequeIssueBookId}
                    options={chequeBookOptions}
                    ref={chequeBookDropdownRef}
                    onChange={(e) => {
                      setChequeIssueBookId(e.value as number | null);
                      clearFormError("chequeIssueBookId");
                    }}
                    placeholder={
                      !cashLedgerId ? "Select bank first" : "Select cheque book"
                    }
                    disabled={!isFormActive || !cashLedgerId}
                    className="app-entry-control"
                    onEnterNext={focusRefNoInput}
                  />
                </AppNotchedField>
                {renderFormError("chequeIssueBookId")}
              </div>
            )}
            {!showLegacyReceiptCashLayout ? (
              <>
                <div className="app-entry-field">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-file-edit">
                        {refNoLabel}
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
                  >
                    <AppInput
                      id={refNoInputId}
                      value={refNo}
                      onChange={(e) => {
                        setRefNo(e.target.value);
                        clearFormError("refNo");
                      }}
                      className="app-entry-control"
                      disabled={!isFormActive || isReceiptReferenceLocked}
                      ref={(element) => {
                        if (element instanceof HTMLInputElement) {
                          refNoInputRef.current = element;
                          return;
                        }
                        const input = (
                          element as { getInput?: () => unknown } | null
                        )?.getInput?.();
                        refNoInputRef.current =
                          input instanceof HTMLInputElement ? input : null;
                      }}
                    />
                  </AppNotchedField>
                  {renderFormError("refNo")}
                </div>
                <div className="app-entry-field">
                  <AppNotchedField
                    label={
                      <LabelWithIcon icon="pi-calendar">
                        {refDateLabel}
                      </LabelWithIcon>
                    }
                    className="app-notched-input--entry-main"
                    style={{ width: "100%" }}
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
                      disabled={!isFormActive || isReceiptReferenceLocked}
                      className="app-entry-control"
                    />
                  </AppNotchedField>
                  {refDateError && (
                    <small className="text-red-500">{refDateError}</small>
                  )}
                </div>
                {showNoteReferenceFields ? (
                  <div className="app-entry-field">
                    <AppNotchedField
                      label={
                        <LabelWithIcon icon="pi-file-edit">
                          {referenceNo2Label}
                        </LabelWithIcon>
                      }
                      className="app-notched-input--entry-main"
                      style={{ width: "100%" }}
                    >
                      <AppInput
                        value={referenceNo2}
                        onChange={(event) => {
                          setReferenceNo2(event.target.value);
                        }}
                        className="app-entry-control"
                        disabled={!isFormActive}
                      />
                    </AppNotchedField>
                  </div>
                ) : null}
                {showNoteReferenceFields ? (
                  <div className="app-entry-field">
                    <AppNotchedField
                      label={
                        <LabelWithIcon icon="pi-calendar">
                          {referenceDate2Label}
                        </LabelWithIcon>
                      }
                      className="app-notched-input--entry-main"
                      style={{ width: "100%" }}
                    >
                      <AppDateInput
                        value={referenceDate2}
                        onChange={(value) => {
                          setReferenceDate2(value);
                          setReferenceDate2Error(null);
                        }}
                        onCommit={(value, raw) => {
                          setReferenceDate2Error(
                            resolveDateInputError(value, raw)
                          );
                        }}
                        fiscalYearStart={fiscalRange?.start ?? null}
                        fiscalYearEnd={fiscalRange?.end ?? null}
                        enforceFiscalRange
                        disabled={!isFormActive}
                        className="app-entry-control"
                      />
                    </AppNotchedField>
                    {referenceDate2Error ? (
                      <small className="text-red-500">
                        {referenceDate2Error}
                      </small>
                    ) : null}
                  </div>
                ) : null}
                {showNoteReferenceFields ? (
                  <div className="app-entry-field app-entry-field--wide">
                    <AppNotchedField
                      label={
                        <LabelWithIcon icon="pi-comment">
                          {reasonForIssueLabel}
                        </LabelWithIcon>
                      }
                      className="app-notched-input--entry-main"
                      style={{ width: "100%" }}
                    >
                      <AppInput
                        value={reasonForIssue}
                        onChange={(event) => {
                          setReasonForIssue(event.target.value);
                        }}
                        className="app-entry-control"
                        disabled={!isFormActive}
                      />
                    </AppNotchedField>
                  </div>
                ) : null}
              </>
            ) : null}
            {showLegacyReceiptCashLayout ? (
              <div className="app-entry-field app-entry-field--remark">
                <AppNotchedField
                  label={<LabelWithIcon icon="pi-pencil">Remark</LabelWithIcon>}
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="app-entry-control"
                    disabled={!isFormActive}
                    onEnterNext={handleNarrationEnter}
                  />
                </AppNotchedField>
              </div>
            ) : null}
          </div>
        </div>
        <div
          className={`col-12 app-entry-ledger-row-wrap ${
            showLegacyReceiptCashLayout ? "app-entry-section-order-primary" : ""
          }`}
        >
          <div className="app-entry-ledger-row">
            <div className="app-entry-ledger-group">
              <div className="app-entry-field app-entry-field--wide app-entry-ledger-field">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-sitemap">
                      {paymentLedgerGroupLabel}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
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
                      clearFormError("cashLedgerId");
                    }}
                    placeholder="Ledger group"
                    loadingPlaceholder="Loading groups..."
                    onSelectNext={focusPaymentLedgerInput}
                    style={{ width: "100%" }}
                    panelStyle={{ width: "20rem" }}
                    disabled={paymentLedgerGroupDisabled}
                    appendTo={autoCompleteAppendTarget}
                  />
                </AppNotchedField>
              </div>
              <div className="app-entry-field app-entry-field--xwide app-entry-ledger-field app-entry-ledger-field--cash">
                <div className="app-entry-ledger-balance-row">
                  {cashLedgerBalanceLabel && (
                    <span
                      className={`app-entry-ledger-balance ${cashLedgerBalanceClass}`}
                    >
                      {cashLedgerBalanceLabel}
                    </span>
                  )}
                </div>
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-wallet">
                      {paymentLedgerLabel} *
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main"
                  style={{ width: "100%" }}
                >
                  <LedgerAutoComplete
                    variant="purpose"
                    purpose={paymentLedgerPurpose}
                    openOnFocus={!preferManagerStartOnReceiptCash}
                    value={cashLedgerId}
                    selectedOption={cashLedgerOption}
                    onChange={(value, option) => {
                      updatePrimaryLedger(value, option);
                      clearFormError("cashLedgerId");
                    }}
                    options={paymentLedgerOptions}
                    loading={showPaymentLedgerSpinner}
                    loadingWhenPanelOpenOnly
                    placeholder={
                      showPaymentLedgerSpinner
                        ? paymentLedgerLoadingPlaceholder
                        : paymentLedgerPlaceholderResolved
                    }
                    loadingPlaceholder={paymentLedgerLoadingPlaceholder}
                    ref={cashLedgerInputRef}
                    className="app-entry-control"
                    disabled={!isFormActive}
                    ledgerGroupId={paymentLedgerGroupId}
                    onSelectNext={() => {
                      focusPrimaryLedgerNext(focusCashLedgerAmountInput);
                    }}
                  />
                </AppNotchedField>
                {renderFormError("cashLedgerId")}
              </div>
              <div className="app-entry-ledger-meta">
                <AppNotchedField
                  label={
                    <LabelWithIcon icon="pi-map-marker">Address</LabelWithIcon>
                  }
                  className="app-notched-input--line-editor"
                  style={{ width: "100%" }}
                >
                  <div className="app-notched-input__surface ledger-meta-address">
                    <span className="text-700 text-sm">
                      {cashLedgerAddressLabel?.trim() ||
                        "Address not available"}
                    </span>
                  </div>
                </AppNotchedField>
              </div>
            </div>
            <div className="app-entry-field app-entry-ledger-amount app-entry-ledger-amount--wide">
              <div className="app-entry-ledger-amount-row">
                <AppDrCrToggle
                  value={headerDrCrToggleValue}
                  onChange={updateHeaderDrCr}
                  disabled={
                    !isFormActive || saving || !allowHeaderDrCrSelection
                  }
                  className="app-entry-control app-entry-drcr"
                  ref={headerDrCrToggleRef}
                />
                <AppNotchedField
                  label={
                    <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>
                      {showLegacyReceiptCashLayout
                        ? "Net Amount *"
                        : "Amount *"}
                    </LabelWithIcon>
                  }
                  className="app-notched-input--entry-main app-entry-ledger-amount-input"
                  style={{ width: "100%" }}
                >
                  <AppInput
                    inputType="number"
                    value={cashLedgerAmount}
                    onValueChange={(e) => {
                      syncCashLedgerAmountInput(
                        undefined,
                        (e.value as number | null) ?? null
                      );
                    }}
                    onKeyUp={(event) => {
                      const target =
                        event.currentTarget as HTMLInputElement | null;
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
                    inputStyle={{ width: "100%", textAlign: "right" }}
                    className="app-entry-control"
                    disabled={!isFormActive}
                  />
                </AppNotchedField>
              </div>
              {renderFormError("cashLedgerAmount")}
              {supplementaryHeaderPostingAmount > 0 && !isBillWiseMode ? (
                <small className="app-entry-ledger-amount-hint text-600">
                  {`${paymentLedgerLabel} posting: ${formatAmount(
                    effectivePrimaryLedgerAmount
                  )} ${headerDrCrLabel} + preserved adjustments ${formatAmount(
                    supplementaryHeaderPostingAmount
                  )} ${headerDrCrLabel}`}
                </small>
              ) : null}
            </div>
          </div>
        </div>
        {!showLegacyReceiptCashLayout ? (
          <div className="col-12">
            <div className="app-entry-narration">
              <AppNotchedField
                label={
                  <LabelWithIcon icon="pi-pencil">Narration</LabelWithIcon>
                }
                className="app-notched-input--entry-main"
                style={{ width: "100%" }}
              >
                <AppInput
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="app-entry-control"
                  disabled={!isFormActive}
                  onEnterNext={handleNarrationEnter}
                />
              </AppNotchedField>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
