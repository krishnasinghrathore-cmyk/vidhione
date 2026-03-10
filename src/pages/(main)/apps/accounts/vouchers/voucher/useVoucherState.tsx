"use client";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useApolloClient,
  useLazyQuery,
  useMutation,
  useQuery,
} from "@apollo/client";
import { Button } from "primereact/button";
import { confirmDialog } from "primereact/confirmdialog";
import type { AutoComplete } from "primereact/autocomplete";
import type { ColumnFilterElementTemplateOptions } from "primereact/column";
import type { DataTableFilterMeta } from "primereact/datatable";
import type { Menu } from "primereact/menu";
import type { Toast } from "primereact/toast";
import { useNavigate } from "react-router-dom";
import AppDateInput from "@/components/AppDateInput";
import AppMultiSelect from "@/components/AppMultiSelect";
import {
  useLedgerOptionsByPurpose,
  type LedgerOption,
} from "@/lib/accounts/ledgerOptions";
import { useLedgerGroupOptions } from "@/lib/accounts/ledgerGroups";
import { isBankAccountsLabel } from "@/lib/accounts/ledgerGroupFilter";
import { useAuth } from "@/lib/auth/context";
import {
  deriveVoucherUiState,
  getVoucherActionsConfig,
} from "@/lib/accounts/voucherActionsState";
import { billingApolloClient } from "@/lib/billingApolloClient";
import { LayoutContext } from "@/layout/context/layoutcontext";
import { resolveFiscalRange } from "@/lib/fiscalRange";
import { validateDateRange } from "@/lib/reportDateValidation";
import { printRowsWithReportTemplate } from "@/lib/reportTemplatePrint";

import type {
  ChequeBookOption,
  ChequeIssueBookRow,
  ColumnFilterMeta,
  DebitLineDraft,
  DebitLineEditorDraft,
  ManagerRow,
  PaymentVoucherDisplayRow,
  PaymentMode,
  PaymentVoucherRouteView,
  PaymentViaOption,
  ReceiptRegisterTotals,
  RecentlySavedVoucher,
  SalesmanRow,
  SelectOption,
  VoucherRow,
} from "./types";
import {
  CHEQUE_ISSUE_BOOKS,
  CAN_DELETE_VOUCHER,
  CREATE_VOUCHER,
  DELETE_VOUCHER,
  LEDGER_CURRENT_BALANCE,
  LEDGER_SUMMARY_GROUP_LOOKUP,
  INVOICE_ROLLOVER_FOR_RECEIPT_ENTRY,
  MANAGERS,
  MONEY_RECEIPT_BANK_BOOK_FALLBACK,
  MONEY_RECEIPT_CASH_BOOK_FALLBACK,
  COMPANY_FISCAL_YEARS_FOR_BILL_SEARCH,
  MONEY_RECEIPT_ISSUE_BOOKS_FOR_SALESMAN,
  NEXT_CHEQUE_NUMBER_FOR_BOOK,
  NEXT_VOUCHER_NUMBER,
  PAYMENT_VIA_MASTERS,
  SALE_INVOICE_BILL_SEARCH,
  SALESMEN,
  UPDATE_VOUCHER,
  VOUCHER_ENTRY_BY_ID,
  VOUCHER_REGISTER_BY_LEDGER_COMPAT,
  VOUCHER_REGISTER_BY_LEDGER,
  VOUCHER_TYPES,
} from "./graphql";
import {
  AMOUNT_CURRENCY_SYMBOL,
  BANK_ACCOUNT_GROUP_TYPE,
  BANK_LEDGER_GROUP_TYPES,
  CASH_IN_HAND_GROUP_TYPE,
  CASH_LEDGER_GROUP_TYPES,
  buildDefaultColumnFilters,
  buildMultiSelectFilterElement,
  buildNumberFilterOptions,
  buildTextFilterOptions,
  buildVoucherFormSchema,
  createDebitLine,
  formatAmount,
  formatDate,
  getStoredPaymentMode,
  isCashInHandLabel,
  isEmptyFilterValue,
  normalizeTextValue,
  parseDateText,
  parseInputNumber,
  persistPaymentMode,
  getStoredRecentSavedVouchers,
  persistRecentSavedVouchers,
  PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_LIMIT,
  PAYMENT_VOUCHER_RECENT_SAVED_LIMIT,
  resolveAddress,
  resolveFilterValue,
  resolveReportRange,
  toDateKey,
  toDateText,
} from "./utils";
import {
  getStoredAddAnotherAfterSavePreference,
  persistAddAnotherAfterSavePreference,
} from "./preferences";
import {
  buildPaymentVoucherSaveSuccessMessage,
  resolvePaymentVoucherPostSaveAction,
  type PaymentVoucherSaveIntent,
} from "./saveBehavior";
import {
  collectDeepDiffEntries,
  formatDryDiffValue,
  type DrySaveDiffEntry,
} from "./drySaveDiff";
import {
  getVoucherAllowedModes,
  getVoucherModeConfig,
  getVoucherProfile,
  isVoucherModeSupported,
  resolveVoucherMode,
  type VoucherKey,
  type VoucherProfile,
} from "./voucherProfiles";

const createLineEditorDraft = (
  overrides: Partial<DebitLineEditorDraft> = {}
): DebitLineEditorDraft => ({
  mode: "add",
  targetKey: null,
  ledgerGroupId: null,
  ledgerId: null,
  ledgerOption: null,
  drCrFlag: 0,
  amount: null,
  label: null,
  ...overrides,
});
const BILLWISE_AUTO_LINE_KEY = "billwise-auto-party-line";
const TRADE_VOUCHER_PROFILE_KEYS: VoucherKey[] = [
  "sales",
  "purchase",
  "tax-invoice",
];
const NOTE_VOUCHER_PROFILE_KEYS: VoucherKey[] = ["credit-note", "debit-note"];
const VOUCHER_PROFILE_SWITCH_LABELS: Record<VoucherKey, string> = {
  payment: "Payment",
  receipt: "Receipt",
  contra: "Contra",
  journal: "Journal",
  sales: "Sales",
  purchase: "Purchase",
  "credit-note": "Credit",
  "debit-note": "Debit",
  "tax-invoice": "Tax Invoice",
};

const decodeRouteToken = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const toPositiveId = (value: unknown): number | null => {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const toNumericId = (value: unknown): number | null => {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();
const REGISTER_SERVER_SEARCH_DEBOUNCE_MS = 250;

type PageIndexLoadRequest = {
  offset: number;
  limit: number;
  startedAtMs: number;
};

type RegisterSummarySnapshot = {
  totalNetAmount: number;
  totalAmountSum: number;
  discountAmountSum: number;
  adjustedAmountSum: number;
  diffAmountSum: number;
  chequeReturnChargesSum: number;
  chequeReturnCount: number;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "string" && value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveBooleanFlag = (value: unknown): boolean => {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === "true" || normalized === "yes" || normalized === "y")
      return true;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric !== 0 : false;
  }
  return false;
};

const hasLegacyVoucherEntryFieldValidationError = (message: string) => {
  const isVoucherEntryError = message.includes('on type "VoucherEntry"');
  const isVoucherEntryPageError = message.includes(
    'on type "VoucherEntryPage"'
  );
  const isVoucherRegisterArgumentError =
    message.includes('Unknown argument "reconciled"') &&
    message.includes('"voucherRegisterByLedgerDetailed"');
  if (isVoucherRegisterArgumentError) return true;
  if (!isVoucherEntryError && !isVoucherEntryPageError) return false;
  return (
    message.includes('Cannot query field "salesmanName"') ||
    message.includes('Cannot query field "sourceKind"') ||
    message.includes('Cannot query field "isFullPaidFlag"') ||
    message.includes('Cannot query field "totalAmount"') ||
    message.includes('Cannot query field "discountAmount"') ||
    message.includes('Cannot query field "adjustedAmount"') ||
    message.includes('Cannot query field "diffAmount"') ||
    message.includes('Cannot query field "chequeCancelCharges"') ||
    message.includes('Cannot query field "chequeReturnStatus"') ||
    message.includes('Cannot query field "bankName"') ||
    message.includes('Cannot query field "branchName"') ||
    message.includes('Cannot query field "primaryLedgerName"') ||
    message.includes('Cannot query field "primaryLedgerGroupName"') ||
    message.includes('Cannot query field "billInvoiceNos"') ||
    message.includes('Cannot query field "billInvoiceDates"') ||
    message.includes('Cannot query field "billInvoiceAmounts"') ||
    message.includes('Cannot query field "totalAmountSum"') ||
    message.includes('Cannot query field "discountAmountSum"') ||
    message.includes('Cannot query field "adjustedAmountSum"') ||
    message.includes('Cannot query field "diffAmountSum"') ||
    message.includes('Cannot query field "chequeReturnChargesSum"') ||
    message.includes('Cannot query field "chequeReturnCount"') ||
    message.includes('Cannot query field "chequeNo"') ||
    message.includes('Cannot query field "chequeDate"') ||
    message.includes('Cannot query field "isReconciledFlag"') ||
    message.includes('Cannot query field "referenceNumber2"') ||
    message.includes('Cannot query field "referenceDate2"') ||
    message.includes('Cannot query field "reasonForIssueText"')
  );
};

const isSaleInvoiceBillSearchUnavailableError = (message: string) =>
  message.includes('Cannot query field "saleInvoiceBillSearch"') &&
  message.includes('on type "Query"');

const hasSameNumericId = (left: unknown, right: unknown): boolean => {
  const leftId = toNumericId(left);
  const rightId = toNumericId(right);
  return leftId != null && rightId != null && leftId === rightId;
};

const normalizeLookupKey = (value: string | null | undefined): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "").toLowerCase();
  if (/^\d+$/.test(compact)) {
    const numeric = Number(compact);
    return Number.isFinite(numeric) ? String(numeric) : compact;
  }
  return compact;
};

const buildVoucherNumberDateLookupKey = (
  voucherNumber: string | null | undefined,
  voucherDateText: string | null | undefined
): string => {
  const voucherNoKey = normalizeLookupKey(voucherNumber);
  if (!voucherNoKey) return "";
  const dateKey = toDateKey(voucherDateText ?? null);
  if (!dateKey) return "";
  return `${voucherNoKey}|${dateKey}`;
};

type NormalizedMoneyReceiptIssueBook = {
  moneyReceiptIssueBookId: number;
  bookNumber: string | null;
  receiptStartNumber: number;
  receiptEndNumber: number;
  voucherDateText: string | null;
  isCancelled: boolean;
};

type ReceiptIssueBookOption = SelectOption & {
  receiptStartNumber: number | null;
  receiptEndNumber: number | null;
  voucherDateText: string | null;
  usedReceiptCount: number | null;
  totalReceiptCount: number | null;
  isFullyConsumed: boolean | null;
};

type ReceiptIssueBookUsageStats = {
  usedReceiptCount: number;
  totalReceiptCount: number;
  isFullyConsumed: boolean;
};

const normalizeIssueBookRows = (
  books: MoneyReceiptIssueBookRow[]
): NormalizedMoneyReceiptIssueBook[] =>
  books
    .map((book) => ({
      moneyReceiptIssueBookId: Number(book.moneyReceiptIssueBookId),
      bookNumber:
        typeof book.bookNumber === "string" && book.bookNumber.trim().length > 0
          ? book.bookNumber.trim()
          : null,
      receiptStartNumber:
        book.receiptStartNumber != null &&
        Number.isFinite(Number(book.receiptStartNumber))
          ? Number(book.receiptStartNumber)
          : null,
      receiptEndNumber:
        book.receiptEndNumber != null &&
        Number.isFinite(Number(book.receiptEndNumber))
          ? Number(book.receiptEndNumber)
          : null,
      voucherDateText: book.voucherDateText ?? null,
      isCancelled: Boolean(book.isCancelled),
    }))
    .filter(
      (book): book is NormalizedMoneyReceiptIssueBook =>
        !book.isCancelled &&
        Number.isFinite(book.moneyReceiptIssueBookId) &&
        book.moneyReceiptIssueBookId > 0 &&
        book.receiptStartNumber != null &&
        book.receiptEndNumber != null &&
        book.receiptStartNumber > 0 &&
        book.receiptEndNumber >= book.receiptStartNumber
    )
    .sort((left, right) => {
      const leftDateKey = toDateKey(left.voucherDateText ?? null) ?? "";
      const rightDateKey = toDateKey(right.voucherDateText ?? null) ?? "";
      if (leftDateKey !== rightDateKey) {
        return rightDateKey.localeCompare(leftDateKey);
      }
      if (left.receiptStartNumber !== right.receiptStartNumber) {
        return left.receiptStartNumber - right.receiptStartNumber;
      }
      return right.moneyReceiptIssueBookId - left.moneyReceiptIssueBookId;
    });

const parseReceiptNoValue = (
  value: string | null | undefined
): number | null => {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const isIssueBookApplicableForVoucherDate = (
  bookVoucherDateText: string | null,
  voucherDateText: string | null
): boolean => {
  const bookDateKey = toDateKey(bookVoucherDateText ?? null);
  if (!bookDateKey) return true;
  const voucherDateKey = toDateKey(voucherDateText ?? null);
  if (!voucherDateKey) return true;
  return bookDateKey <= voucherDateKey;
};

const resolveIssueBookUsageStartDateKey = (
  issueBookVoucherDateText: string | null,
  fiscalYearStartDateKey: string | null
): string | null => {
  const issueDateKey = toDateKey(issueBookVoucherDateText ?? null);
  if (issueDateKey && fiscalYearStartDateKey) {
    return issueDateKey >= fiscalYearStartDateKey
      ? issueDateKey
      : fiscalYearStartDateKey;
  }
  return issueDateKey ?? fiscalYearStartDateKey ?? null;
};

const extractYearFromDateKey = (dateKey: string | null): number | null => {
  if (!dateKey || dateKey.length < 4) return null;
  const year = Number(dateKey.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
};

const buildFiscalYearLabel = (
  financialYearStart: string | null,
  financialYearEnd: string | null
) => {
  const startYear = extractYearFromDateKey(toDateKey(financialYearStart));
  const endYear = extractYearFromDateKey(toDateKey(financialYearEnd));
  if (startYear != null && endYear != null) return `${startYear}-${endYear}`;
  if (startYear != null) return String(startYear);
  if (endYear != null) return String(endYear);
  return "Year";
};

const findIssueBookForReceiptNo = (
  books: NormalizedMoneyReceiptIssueBook[],
  receiptNo: number
): NormalizedMoneyReceiptIssueBook | null => {
  if (!Number.isFinite(receiptNo) || receiptNo <= 0) return null;
  return (
    books.find(
      (book) =>
        receiptNo >= book.receiptStartNumber &&
        receiptNo <= book.receiptEndNumber
    ) ?? null
  );
};

const isReceiptNumberInRange = (
  receiptNo: number,
  issueBook: NormalizedMoneyReceiptIssueBook | null
): boolean => {
  if (!Number.isFinite(receiptNo) || receiptNo <= 0) return false;
  if (!issueBook) return false;
  return (
    receiptNo >= issueBook.receiptStartNumber &&
    receiptNo <= issueBook.receiptEndNumber
  );
};

const hasDuplicateReceiptNoInBookEntries = (
  entries: MoneyReceiptIssueEntryRow[],
  moneyReceiptIssueBookId: number,
  receiptNo: number,
  usageStartDateKey?: string | null
): boolean =>
  entries.some((entry) => {
    const entryBookId = Number(entry.moneyReceiptIssueBookId);
    const entryReceiptNo =
      entry.receiptNumber != null && Number.isFinite(Number(entry.receiptNumber))
        ? Number(entry.receiptNumber)
        : null;
    const entryDateKey = toDateKey(entry.voucherDateText ?? null);
    const isWithinUsageWindow =
      usageStartDateKey != null && usageStartDateKey.length > 0
        ? entryDateKey != null && entryDateKey >= usageStartDateKey
        : true;
    return (
      Number.isFinite(entryBookId) &&
      entryBookId === moneyReceiptIssueBookId &&
      entryReceiptNo != null &&
      entryReceiptNo === receiptNo &&
      isWithinUsageWindow
    );
  });

const resolveNextReceiptNoFromIssuedBooks = (
  books: MoneyReceiptIssueBookRow[],
  entries: MoneyReceiptIssueEntryRow[],
  usageStartDateKey?: string | null
): string | null => {
  const normalizedBooks = normalizeIssueBookRows(books);
  if (!normalizedBooks.length) return null;

  const bookIds = new Set(
    normalizedBooks.map((book) => book.moneyReceiptIssueBookId)
  );
  const usedNumbersByBook = new Map<number, Set<number>>();
  entries.forEach((entry) => {
    const bookId = Number(entry.moneyReceiptIssueBookId);
    if (!Number.isFinite(bookId) || !bookIds.has(bookId)) return;
    const entryDateKey = toDateKey(entry.voucherDateText ?? null);
    const isWithinUsageWindow =
      usageStartDateKey != null && usageStartDateKey.length > 0
        ? entryDateKey != null && entryDateKey >= usageStartDateKey
        : true;
    if (!isWithinUsageWindow) return;
    const receiptNo =
      entry.receiptNumber != null &&
      Number.isFinite(Number(entry.receiptNumber))
        ? Number(entry.receiptNumber)
        : null;
    if (receiptNo == null || receiptNo <= 0) return;
    const set = usedNumbersByBook.get(bookId) ?? new Set<number>();
    set.add(receiptNo);
    usedNumbersByBook.set(bookId, set);
  });

  const candidateNumbers: number[] = [];
  normalizedBooks.forEach((book) => {
    const start = Number(book.receiptStartNumber);
    const end = Number(book.receiptEndNumber);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start)
      return;
    const usedSet = usedNumbersByBook.get(book.moneyReceiptIssueBookId) ?? null;
    if (!usedSet || usedSet.size === 0) {
      candidateNumbers.push(start);
      return;
    }
    const usedInRange = Array.from(usedSet).filter(
      (value) => value >= start && value <= end
    );
    if (usedInRange.length === 0) {
      candidateNumbers.push(start);
      return;
    }
    const maxUsedInRange = Math.max(...usedInRange);
    const nextReceiptNo = Math.max(maxUsedInRange + 1, start);
    if (nextReceiptNo <= end) {
      candidateNumbers.push(nextReceiptNo);
    }
  });

  if (candidateNumbers.length === 0) return null;
  return String(Math.max(...candidateNumbers));
};

type LegacyCashReceiptFallbackRow = {
  voucherNumber: string | null;
  voucherDateText: string | null;
  managerName: string | null;
  salesmanName: string | null;
  isFullPaid: boolean | null;
  totalAmount: number | null;
  discountAmount: number | null;
  adjustedAmount: number | null;
  diffAmount: number | null;
  chequeCancelCharges: number | null;
  invoiceNumber: string | null;
  invoiceDateText: string | null;
  invoiceAmount: number | null;
};

type LegacyBankReceiptFallbackRow = {
  voucherNumber: string | null;
  voucherDateText: string | null;
  ledgerName: string | null;
  otherLedgerName: string | null;
  bankName: string | null;
  branchName: string | null;
  chequeNo: string | null;
  chequeDateText: string | null;
  isFullPaid: boolean | null;
  chequeReturnStatus: string | null;
  totalAmount: number | null;
  discountAmount: number | null;
  adjustedAmount: number | null;
  diffAmount: number | null;
  chequeCancelCharges: number | null;
  invoiceNumber: string | null;
  invoiceDateText: string | null;
  invoiceAmount: number | null;
};

type VoucherFormSnapshot = {
  editingId: number | null;
  headerDrCrFlag: number;
  voucherNo: string;
  voucherDateText: string | null;
  postingDateText: string | null;
  paymentViaId: number | null;
  refNo: string;
  refDateText: string | null;
  referenceNo2: string;
  referenceDate2Text: string | null;
  reasonForIssue: string;
  chequeIssueBookId: number | null;
  cashLedgerId: number | null;
  paymentLedgerGroupId: number | null;
  cashLedgerAmount: number | null;
  chequeInFavour: string;
  narration: string;
  formManagerId: number | null;
  formSalesmanId: number | null;
  formSalesmanQuery: string;
  cancelledChecked: boolean;
  billWiseEnabled: boolean;
  billWiseFullPaid: boolean;
  billWiseShowAdvanceBill: boolean;
  billWiseDebitNote: boolean;
  billWisePartyLedgerGroupId: number | null;
  billWisePartyLedgerId: number | null;
  billWiseDiscountLedgerId: number | null;
  billWiseDiscountAmount: number | null;
  billWiseChequeReturnLedgerId: number | null;
  billWiseChequeReturnCharges: number | null;
  billWiseInvoiceRows: Array<{
    saleInvoiceId: number;
    selected: boolean;
    appliedAmount: number | null;
    isDebitNote: boolean;
  }>;
  lines: Array<{
    ledgerGroupId: number | null;
    ledgerId: number | null;
    drCrFlag: number;
    amount: number | null;
    label: string | null;
  }>;
  lineEditorCarryGroupId: number | null;
  lineEditorDraft: {
    mode: "add" | "edit";
    targetKey: string | null;
    ledgerGroupId: number | null;
    ledgerId: number | null;
    drCrFlag: number;
    amount: number | null;
    label: string | null;
  };
};

type DrySaveCheckItem = {
  label: string;
  passed: boolean;
  detail: string;
};

type VoucherSavePreview = {
  mode: PaymentMode;
  voucherTypeId: number | null;
  voucherDateText: string | null;
  postingDateText: string | null;
  voucherNumber: string | null;
  narrationText: string | null;
  purchaseVoucherNumber: string | null;
  purchaseVoucherDateText: string | null;
  referenceNumber2: string | null;
  referenceDate2: string | null;
  reasonForIssueText: string | null;
  isTaxationFlag: number | null;
  managerId: number | null;
  chequeInFavourText: string | null;
  chequeIssueBookId: number | null;
  paymentViaId: number | null;
  primaryLedgerId: number | null;
  isCancelledFlag: 0 | 1;
  billDetails: Array<{
    saleInvoiceId: number;
    appliedAmount: number;
    isDebitNoteFlag: 0 | 1;
  }>;
  lines: Array<{
    source: "entry" | "primary" | "preserved";
    ledgerId: number | null;
    amount: number;
    drCrFlag: number;
    narrationText: string | null;
  }>;
  totals: {
    headerAmount: number;
    lineNetAgainstHeader: number;
    preservedHeaderAmount: number;
    primaryHeaderAmount: number;
  };
};

const DRY_SAVE_DIFF_PREVIEW_LIMIT = 12;

type SupplementaryHeaderPostingLine = {
  ledgerId: number;
  amount: number;
  drCrFlag: number;
  narrationText: string | null;
  ledgerName: string | null;
  ledgerGroupName: string | null;
  sourceKind?: "discount" | "chequeReturn" | "other";
};

type BillWiseInvoiceRow = {
  saleInvoiceId: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  dueAmount: number;
  selected: boolean;
  appliedAmount: number | null;
  isDebitNote: boolean;
  isManualAmount: boolean;
};

type BillWiseInvoiceSearchRow = {
  saleInvoiceId: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  dueAmount: number;
  ledgerId: number | null;
  ledgerName: string;
  ledgerAddress: string | null;
  ledgerGroupId: number | null;
  ledgerGroupName: string | null;
  isDebitNote: boolean;
};

type CompanyFiscalYearRow = {
  companyFiscalYearId: number;
  financialYearStart: string | null;
  financialYearEnd: string | null;
  isCurrentFlag: number | null;
};

type BillWiseFiscalYearOption = {
  label: string;
  value: number;
  fromDateText: string | null;
  toDateText: string | null;
  fromDateKey: string | null;
  toDateKey: string | null;
  isCurrent: boolean;
};

type BillWiseLineEditorState = {
  visible: boolean;
  mode: "add" | "edit";
  targetSaleInvoiceId: number | null;
  selectedSaleInvoiceId: number | null;
  appliedAmount: number | null;
  isDebitNote: boolean;
};

type MoneyReceiptIssueBookRow = {
  moneyReceiptIssueBookId: number;
  bookNumber: string | null;
  receiptStartNumber: number | null;
  receiptEndNumber: number | null;
  salesmanId: number | null;
  voucherDateText: string | null;
  isCancelled: boolean | null;
};

type MoneyReceiptIssueEntryRow = {
  moneyReceiptIssueBookId: number;
  receiptNumber: number | null;
  status: string | null;
  voucherDateText: string | null;
};

const createBillWiseLineEditorState = (
  overrides: Partial<BillWiseLineEditorState> = {}
): BillWiseLineEditorState => ({
  visible: false,
  mode: "add",
  targetSaleInvoiceId: null,
  selectedSaleInvoiceId: null,
  appliedAmount: null,
  isDebitNote: false,
  ...overrides,
});

export const useVoucherState = (
  profile: VoucherProfile,
  routeMode: PaymentMode,
  routeView: PaymentVoucherRouteView,
  routeVoucherNo: string | null
) => {
  const { setPageTitle } = useContext(LayoutContext);
  const apolloClient = useApolloClient();
  const navigate = useNavigate();
  const toastRef = useRef<Toast>(null);
  const { companyContext, agencyOptions } = useAuth();
  const autoCompleteAppendTarget =
    typeof window !== "undefined" ? document.body : undefined;

  const [cashLedgerId, setCashLedgerId] = useState<number | null>(null);
  const [paymentLedgerGroupId, setPaymentLedgerGroupId] = useState<
    number | null
  >(null);
  const paymentMode = routeMode;
  const allowedModes = useMemo(
    () => getVoucherAllowedModes(profile),
    [profile]
  );
  const modeConfig = useMemo(
    () => getVoucherModeConfig(profile, paymentMode),
    [paymentMode, profile]
  );
  const defaultHeaderDrCrFlag = modeConfig.headerDrCrFlag;
  const defaultLineDrCrFlag = modeConfig.entryDrCrFlag;
  const allowHeaderDrCrSelection = Boolean(modeConfig.allowHeaderDrCrSelection);
  const allowLineDrCrSelection = Boolean(modeConfig.allowEntryDrCrSelection);
  const routeBasePath = useMemo(
    () => `/apps/accounts/vouchers/voucher/${profile.key}`,
    [profile.key]
  );
  const domIdPrefix = useMemo(() => `voucher-${profile.key}`, [profile.key]);
  const registerRoutePath = useCallback(
    (mode: PaymentMode = paymentMode) => `${routeBasePath}/${mode}`,
    [paymentMode, routeBasePath]
  );
  const newRoutePath = useCallback(
    (mode: PaymentMode = paymentMode) => `${routeBasePath}/${mode}/new`,
    [paymentMode, routeBasePath]
  );
  const editRoutePath = useCallback(
    (voucherNo: string | number, mode: PaymentMode = paymentMode) =>
      `${routeBasePath}/${mode}/edit/${encodeURIComponent(String(voucherNo))}`,
    [paymentMode, routeBasePath]
  );
  const fiscalYearStartText =
    typeof companyContext?.fiscalYearStart === "string"
      ? companyContext.fiscalYearStart
      : null;
  const fiscalYearEndText =
    typeof companyContext?.fiscalYearEnd === "string"
      ? companyContext.fiscalYearEnd
      : null;
  const initialFiscalRange = resolveFiscalRange(
    fiscalYearStartText,
    fiscalYearEndText
  );

  const [paymentViaId, setPaymentViaId] = useState<number | null>(null);
  const [cancelled, setCancelled] = useState<0 | 1>(0);
  const [reconciled, setReconciled] = useState<-1 | 0 | 1>(-1);
  const initialRangeRef = useRef(
    resolveReportRange(
      initialFiscalRange.start ?? null,
      initialFiscalRange.end ?? null
    )
  );
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    initialRangeRef.current.start ?? null,
    initialRangeRef.current.end ?? null,
  ]);
  const [dateErrors, setDateErrors] = useState<{
    fromDate?: string;
    toDate?: string;
  }>({});
  const [registerFilterFocusNonce, setRegisterFilterFocusNonce] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [first, setFirst] = useState(0);
  const [printFormat, setPrintFormat] = useState<"format-1" | "format-2">(
    "format-1"
  );
  const fromDateInputRef = useRef<HTMLInputElement | null>(null);
  const toDateInputRef = useRef<HTMLInputElement | null>(null);
  const refNoInputRef = useRef<HTMLInputElement | null>(null);
  const cashLedgerInputRef = useRef<AutoComplete | null>(null);
  const cashLedgerAmountInputRef = useRef<HTMLInputElement | null>(null);
  const chequeInFavourInputRef = useRef<HTMLInputElement | null>(null);
  const paidByInputRef = useRef<AutoComplete | null>(null);
  const voucherDateInputRef = useRef<HTMLInputElement | null>(null);
  const lineEditorLedgerGroupRef = useRef<AutoComplete | null>(null);
  const lineEditorLedgerRef = useRef<AutoComplete | null>(null);
  const lineEditorAmountRef = useRef<HTMLInputElement | null>(null);
  const voucherDateFocusTimeoutsRef = useRef<number[]>([]);
  const hydratedEditVoucherDataKeyRef = useRef<string | null>(null);
  const prefetchedRegisterPageKeysRef = useRef<Set<string>>(new Set());
  const registerSummaryByBaseKeyRef = useRef<Map<string, RegisterSummarySnapshot>>(
    new Map()
  );
  const refreshButtonId = `${domIdPrefix}-refresh`;
  const addButtonId = `${domIdPrefix}-add`;
  const saveButtonId = `${domIdPrefix}-save`;
  const drySaveCheckButtonId = `${domIdPrefix}-dry-save-check`;
  const dryDeleteCheckButtonId = `${domIdPrefix}-dry-delete-check`;
  const refNoInputId = `${domIdPrefix}-ref-no`;
  const paymentViaInputId = `${domIdPrefix}-payment-via`;
  const chequeBookInputId = `${domIdPrefix}-cheque-book`;
  const paidByInputId = `${domIdPrefix}-manager`;
  const addAnotherAfterSaveInputId = `${domIdPrefix}-add-another-after-save`;
  const printMenuRef = useRef<Menu>(null);
  const missingConfigRef = useRef(false);

  const [isFormActive, setIsFormActive] = useState(false);
  const [focusNonce, setFocusNonce] = useState(0);
  const [selectedRow, setSelectedRow] = useState<VoucherRow | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [voucherNo, setVoucherNo] = useState("");
  const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
  const [postingDate, setPostingDate] = useState<Date | null>(new Date());
  const [refNo, setRefNo] = useState("");
  const [refDate, setRefDate] = useState<Date | null>(null);
  const [referenceNo2, setReferenceNo2] = useState("");
  const [referenceDate2, setReferenceDate2] = useState<Date | null>(null);
  const [reasonForIssue, setReasonForIssue] = useState("");
  const [cashLedgerAmount, setCashLedgerAmount] = useState<number | null>(null);
  const [cashLedgerAmountDraft, setCashLedgerAmountDraft] = useState<
    number | null | undefined
  >(undefined);
  const [cashLedgerOption, setCashLedgerOption] = useState<LedgerOption | null>(
    null
  );
  const [chequeInFavour, setChequeInFavour] = useState("");
  const [chequeIssueBookId, setChequeIssueBookId] = useState<number | null>(
    null
  );
  const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
  const [postingDateError, setPostingDateError] = useState<string | null>(null);
  const [refDateError, setRefDateError] = useState<string | null>(null);
  const [referenceDate2Error, setReferenceDate2Error] = useState<string | null>(
    null
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<DebitLineDraft[]>([]);
  const [supplementaryHeaderPostingLines, setSupplementaryHeaderPostingLines] =
    useState<SupplementaryHeaderPostingLine[]>([]);
  const supportsBillWiseEntry =
    profile.key === "receipt" || profile.key === "journal";
  const defaultBillWiseEnabled = profile.key === "receipt";
  const [billWiseEnabled, setBillWiseEnabled] = useState(
    defaultBillWiseEnabled
  );
  const [billWisePartyLedgerGroupId, setBillWisePartyLedgerGroupId] = useState<
    number | null
  >(null);
  const [billWisePartyLedgerId, setBillWisePartyLedgerId] = useState<
    number | null
  >(null);
  const [billWisePartyLedgerOption, setBillWisePartyLedgerOption] =
    useState<LedgerOption | null>(null);
  const [billWiseDiscountLedgerId, setBillWiseDiscountLedgerId] = useState<
    number | null
  >(null);
  const [billWiseDiscountLedgerOption, setBillWiseDiscountLedgerOption] =
    useState<LedgerOption | null>(null);
  const [billWiseDiscountAmount, setBillWiseDiscountAmount] = useState<
    number | null
  >(null);
  const [billWiseChequeReturnLedgerId, setBillWiseChequeReturnLedgerId] =
    useState<number | null>(null);
  const [
    billWiseChequeReturnLedgerOption,
    setBillWiseChequeReturnLedgerOption,
  ] = useState<LedgerOption | null>(null);
  const [billWiseChequeReturnCharges, setBillWiseChequeReturnCharges] =
    useState<number | null>(null);
  const [billWiseInvoiceRows, setBillWiseInvoiceRows] = useState<
    BillWiseInvoiceRow[]
  >([]);
  const [billWiseInvoicesLoading, setBillWiseInvoicesLoading] = useState(false);
  const [billWiseLineEditor, setBillWiseLineEditor] =
    useState<BillWiseLineEditorState>(() => createBillWiseLineEditorState());
  const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
  const [lineEditorCarryGroupId, setLineEditorCarryGroupId] = useState<
    number | null
  >(null);
  const [headerDrCrFlag, setHeaderDrCrFlag] = useState<0 | 1>(
    defaultHeaderDrCrFlag
  );
  const [lineEditorDraft, setLineEditorDraft] = useState<DebitLineEditorDraft>(
    () => createLineEditorDraft({ drCrFlag: defaultLineDrCrFlag })
  );
  const [formManagerId, setFormManagerId] = useState<number | null>(null);
  const [formManagerQuery, setFormManagerQuery] = useState("");
  const [formManagerSuggestions, setFormManagerSuggestions] = useState<
    SelectOption[]
  >([]);
  const [formSalesmanId, setFormSalesmanId] = useState<number | null>(null);
  const [formSalesmanQuery, setFormSalesmanQuery] = useState("");
  const [formSalesmanSuggestions, setFormSalesmanSuggestions] = useState<
    SelectOption[]
  >([]);
  const [billWiseFullPaid, setBillWiseFullPaid] = useState(false);
  const [billWiseShowAdvanceBill, setBillWiseShowAdvanceBill] = useState(false);
  const [billWiseDebitNote, setBillWiseDebitNote] = useState(false);
  const [billWiseFiscalYearId, setBillWiseFiscalYearId] = useState<
    number | null
  >(null);
  const [
    billWiseInvoiceSearchDialogVisible,
    setBillWiseInvoiceSearchDialogVisible,
  ] = useState(false);
  const [billWiseInvoiceSearchTerm, setBillWiseInvoiceSearchTerm] =
    useState("");
  const billWiseInvoiceSearchTermRef = useRef("");
  const billWiseInvoiceSearchRequestSeqRef = useRef(0);
  const [billWiseInvoiceSearchRows, setBillWiseInvoiceSearchRows] = useState<
    BillWiseInvoiceSearchRow[]
  >([]);
  const [billWiseInvoiceSearchLoading, setBillWiseInvoiceSearchLoading] =
    useState(false);
  const [billWiseSelectionDialogVisible, setBillWiseSelectionDialogVisible] =
    useState(false);
  const hasBillWiseDialogOpen =
    billWiseInvoiceSearchDialogVisible ||
    billWiseSelectionDialogVisible ||
    billWiseLineEditor.visible;
  const [cancelledChecked, setCancelledChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedVoucher, setLastSavedVoucher] =
    useState<RecentlySavedVoucher | null>(null);
  const [recentlySavedVouchers, setRecentlySavedVouchers] = useState<
    RecentlySavedVoucher[]
  >(() =>
    getStoredRecentSavedVouchers(profile.storagePrefix).slice(
      0,
      PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_LIMIT
    )
  );
  const [addAnotherAfterSave, setAddAnotherAfterSave] = useState<boolean>(() =>
    getStoredAddAnotherAfterSavePreference(profile.storagePrefix)
  );
  const saveInFlightRef = useRef(false);
  const lastAutoChequeNoRef = useRef<string>("");
  const lastAutoReceiptNoRef = useRef<string>("");
  const lastAutoReceiptBookIdRef = useRef<number | null>(null);
  const previousReceiptSalesmanIdRef = useRef<number | null>(null);
  const postSaveRebaselineRef = useRef(false);
  const paymentModeInitRef = useRef(false);
  const previousPaymentModeRef = useRef<PaymentMode>(paymentMode);
  const previousProfileKeyRef = useRef<VoucherKey>(profile.key);
  const routeSyncKeyRef = useRef<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() =>
    buildDefaultColumnFilters()
  );
  const [filterSourceRows, setFilterSourceRows] = useState<VoucherRow[] | null>(
    null
  );
  const [filterSourceLoading, setFilterSourceLoading] = useState(false);
  const [globalSearchText, setGlobalSearchText] = useState("");
  const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
  const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
  const [debouncedServerSearchText, setDebouncedServerSearchText] =
    useState("");
  const [initialFormSnapshotJson, setInitialFormSnapshotJson] = useState<
    string | null
  >(null);
  const [initialSavePreviewJson, setInitialSavePreviewJson] = useState<
    string | null
  >(null);
  useEffect(() => {
    billWiseInvoiceSearchTermRef.current = billWiseInvoiceSearchTerm;
  }, [billWiseInvoiceSearchTerm]);
  const [formSnapshotCaptureToken, setFormSnapshotCaptureToken] = useState(0);
  const capturedSnapshotTokenRef = useRef(0);
  const voucherLabel = profile.label.trim() || "Vouchers";
  const voucherLabelSingular =
    voucherLabel.replace(/\s*vouchers?$/i, "").trim() || voucherLabel;
  const profileVoucherTypeIds = useMemo(
    () =>
      profile.voucherTypeIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    [profile.voucherTypeIds]
  );
  const lineEntryDrCrFlag = defaultLineDrCrFlag;
  const headerDrCrLabel = headerDrCrFlag === 0 ? "Dr" : "Cr";
  const lineEntryDrCrLabel = lineEntryDrCrFlag === 0 ? "Dr" : "Cr";
  const pageHeading =
    allowedModes.length > 1
      ? `${voucherLabel} – ${modeConfig.title}`
      : voucherLabel;
  const modeSwitchLabel = profile.modeSwitchLabel;
  const paymentModeLabel = modeConfig.title;
  const shouldLoadFormLookups = isFormActive || routeView !== "register";

  const { data: voucherTypesData } = useQuery(VOUCHER_TYPES, {
    skip: !shouldLoadFormLookups,
  });

  const voucherTypeId = useMemo(() => {
    const rows = voucherTypesData?.voucherTypes ?? [];
    const modeVoucherTypeId = profile.voucherTypeIdByMode?.[paymentMode];
    if (modeVoucherTypeId != null) {
      const normalizedModeVoucherTypeId = Number(modeVoucherTypeId);
      if (
        Number.isFinite(normalizedModeVoucherTypeId) &&
        normalizedModeVoucherTypeId > 0 &&
        rows.some(
          (entry: any) =>
            Number(entry.voucherTypeId) === normalizedModeVoucherTypeId
        )
      ) {
        return normalizedModeVoucherTypeId;
      }
    }
    for (const configuredVoucherTypeId of profileVoucherTypeIds) {
      const match = rows.find(
        (entry: any) => Number(entry.voucherTypeId) === configuredVoucherTypeId
      );
      if (match) {
        return configuredVoucherTypeId;
      }
    }
    return null;
  }, [
    paymentMode,
    profile.voucherTypeIdByMode,
    profileVoucherTypeIds,
    voucherTypesData,
  ]);
  const isVoucherNoAuto = useMemo(() => {
    if (voucherTypeId == null) return false;
    const rows = voucherTypesData?.voucherTypes ?? [];
    const selectedType = rows.find(
      (entry: any) => Number(entry.voucherTypeId) === Number(voucherTypeId)
    );
    return resolveBooleanFlag(selectedType?.isVoucherNoAutoFlag);
  }, [voucherTypeId, voucherTypesData]);

  useEffect(() => {
    setPageTitle(pageHeading);
    return () => setPageTitle(null);
  }, [pageHeading, setPageTitle]);

  useEffect(() => {
    persistPaymentMode(paymentMode, profile.storagePrefix);
  }, [paymentMode, profile.storagePrefix]);

  useEffect(() => {
    persistRecentSavedVouchers(recentlySavedVouchers, profile.storagePrefix);
  }, [profile.storagePrefix, recentlySavedVouchers]);

  useEffect(() => {
    persistAddAnotherAfterSavePreference(
      addAnotherAfterSave,
      profile.storagePrefix
    );
  }, [addAnotherAfterSave, profile.storagePrefix]);

  useEffect(() => {
    setHeaderDrCrFlag(defaultHeaderDrCrFlag);
  }, [defaultHeaderDrCrFlag]);

  const recordRecentlySavedVoucher = useCallback(
    (entry: RecentlySavedVoucher) => {
      setRecentlySavedVouchers((prev) => {
        const deduped = prev.filter(
          (item) =>
            !(
              item.mode === entry.mode &&
              Number(item.voucherId) === Number(entry.voucherId)
            )
        );
        return [entry, ...deduped].slice(
          0,
          PAYMENT_VOUCHER_RECENT_SAVED_STORAGE_LIMIT
        );
      });
    },
    []
  );

  const clearFormError = useCallback((key: string) => {
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const normalizeLineDrCrFlag = useCallback((value: unknown): 0 | 1 => {
    if (Number(value) === 1) return 1;
    return 0;
  }, []);

  const summarizeLineAmounts = useCallback(
    (
      lineItems: Array<Pick<DebitLineDraft, "amount" | "drCrFlag">>,
      headerFlag: 0 | 1
    ) => {
      let sameSideTotal = 0;
      let oppositeSideTotal = 0;
      lineItems.forEach((line) => {
        const amount = Number(line.amount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const lineFlag = normalizeLineDrCrFlag(line.drCrFlag);
        if (lineFlag === headerFlag) {
          sameSideTotal += amount;
        } else {
          oppositeSideTotal += amount;
        }
      });
      return {
        sameSideTotal,
        oppositeSideTotal,
        netAgainstHeader: oppositeSideTotal - sameSideTotal,
      };
    },
    [normalizeLineDrCrFlag]
  );

  const normalizeSnapshotAmount = useCallback(
    (value: number | null | undefined) => {
      if (value == null) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    },
    []
  );

  const toSnapshotDateText = useCallback(
    (value: Date | null) => toDateText(value),
    []
  );

  const buildCurrentFormSnapshot = useCallback((): VoucherFormSnapshot => {
    const effectiveHeaderAmount =
      cashLedgerAmountDraft !== undefined
        ? cashLedgerAmountDraft
        : cashLedgerAmount;
    const billDetailsForPreview = billWiseInvoiceRows
      .filter((row) => {
        if (!row.selected) return false;
        const appliedAmount = Number(row.appliedAmount ?? 0);
        return Number.isFinite(appliedAmount) && appliedAmount > 0;
      })
      .map((row) => ({
        saleInvoiceId: Number(row.saleInvoiceId),
        appliedAmount: Number(row.appliedAmount ?? 0),
        isDebitNoteFlag: row.isDebitNote ? 1 : 0,
      }));
    return {
      editingId,
      headerDrCrFlag,
      voucherNo,
      voucherDateText: toSnapshotDateText(voucherDate),
      postingDateText: toSnapshotDateText(postingDate),
      paymentViaId: toPositiveId(paymentViaId),
      refNo,
      refDateText: toSnapshotDateText(refDate),
      referenceNo2,
      referenceDate2Text: toSnapshotDateText(referenceDate2),
      reasonForIssue,
      chequeIssueBookId: toPositiveId(chequeIssueBookId),
      cashLedgerId: cashLedgerId != null ? Number(cashLedgerId) : null,
      paymentLedgerGroupId:
        paymentLedgerGroupId != null ? Number(paymentLedgerGroupId) : null,
      cashLedgerAmount: normalizeSnapshotAmount(effectiveHeaderAmount),
      chequeInFavour,
      narration,
      formManagerId: formManagerId != null ? Number(formManagerId) : null,
      formSalesmanId: formSalesmanId != null ? Number(formSalesmanId) : null,
      formSalesmanQuery,
      cancelledChecked,
      billWiseEnabled,
      billWiseFullPaid,
      billWiseShowAdvanceBill,
      billWiseDebitNote,
      billWisePartyLedgerGroupId:
        billWisePartyLedgerGroupId != null
          ? Number(billWisePartyLedgerGroupId)
          : null,
      billWisePartyLedgerId:
        billWisePartyLedgerId != null ? Number(billWisePartyLedgerId) : null,
      billWiseDiscountLedgerId:
        billWiseDiscountLedgerId != null
          ? Number(billWiseDiscountLedgerId)
          : null,
      billWiseDiscountAmount: normalizeSnapshotAmount(billWiseDiscountAmount),
      billWiseChequeReturnLedgerId:
        billWiseChequeReturnLedgerId != null
          ? Number(billWiseChequeReturnLedgerId)
          : null,
      billWiseChequeReturnCharges: normalizeSnapshotAmount(
        billWiseChequeReturnCharges
      ),
      billWiseInvoiceRows: billWiseInvoiceRows.map((row) => ({
        saleInvoiceId: Number(row.saleInvoiceId),
        selected: Boolean(row.selected),
        appliedAmount: normalizeSnapshotAmount(row.appliedAmount),
        isDebitNote: Boolean(row.isDebitNote),
      })),
      lines: lines.map((line) => ({
        ledgerGroupId:
          line.ledgerGroupId != null ? Number(line.ledgerGroupId) : null,
        ledgerId: line.ledgerId != null ? Number(line.ledgerId) : null,
        drCrFlag: normalizeLineDrCrFlag(line.drCrFlag),
        amount: normalizeSnapshotAmount(line.amount),
        label: line.label ?? line.ledgerOption?.label ?? null,
      })),
      lineEditorCarryGroupId:
        lineEditorCarryGroupId != null ? Number(lineEditorCarryGroupId) : null,
      lineEditorDraft: {
        mode: lineEditorDraft.mode,
        targetKey: lineEditorDraft.targetKey ?? null,
        ledgerGroupId:
          lineEditorDraft.ledgerGroupId != null
            ? Number(lineEditorDraft.ledgerGroupId)
            : null,
        ledgerId:
          lineEditorDraft.ledgerId != null
            ? Number(lineEditorDraft.ledgerId)
            : null,
        drCrFlag: normalizeLineDrCrFlag(lineEditorDraft.drCrFlag),
        amount: normalizeSnapshotAmount(lineEditorDraft.amount),
        label:
          lineEditorDraft.label ?? lineEditorDraft.ledgerOption?.label ?? null,
      },
    };
  }, [
    cancelledChecked,
    cashLedgerAmount,
    cashLedgerAmountDraft,
    cashLedgerId,
    chequeInFavour,
    chequeIssueBookId,
    editingId,
    headerDrCrFlag,
    billWiseDiscountAmount,
    billWiseChequeReturnCharges,
    billWiseChequeReturnLedgerId,
    billWiseDiscountLedgerId,
    billWiseDebitNote,
    billWiseEnabled,
    billWiseFullPaid,
    billWiseInvoiceRows,
    billWisePartyLedgerGroupId,
    billWisePartyLedgerId,
    billWiseShowAdvanceBill,
    formManagerId,
    formSalesmanId,
    formSalesmanQuery,
    lineEditorCarryGroupId,
    lineEditorDraft.amount,
    lineEditorDraft.label,
    lineEditorDraft.ledgerGroupId,
    lineEditorDraft.ledgerId,
    lineEditorDraft.ledgerOption?.label,
    lineEditorDraft.mode,
    lineEditorDraft.targetKey,
    lines,
    narration,
    normalizeSnapshotAmount,
    paymentLedgerGroupId,
    paymentViaId,
    postingDate,
    referenceDate2,
    referenceNo2,
    refDate,
    refNo,
    reasonForIssue,
    toSnapshotDateText,
    voucherDate,
    voucherNo,
    normalizeLineDrCrFlag,
  ]);

  const buildCurrentSavePreview = useCallback((): VoucherSavePreview => {
    const isEditing = editingId != null;
    const showPaymentViaForPreview = Boolean(modeConfig.showPaymentVia);
    const requiresManagerForPreview = Boolean(modeConfig.requiresManager);
    const isBillWiseModeForPreview = supportsBillWiseEntry && billWiseEnabled;
    const debitLines = lines
      .map((line) => ({
        ledgerId: line.ledgerId != null ? Number(line.ledgerId) : null,
        amount: line.amount,
        drCrFlag: allowLineDrCrSelection
          ? normalizeLineDrCrFlag(line.drCrFlag)
          : lineEntryDrCrFlag,
      }))
      .filter((line) => line.ledgerId && line.amount && Number(line.amount) > 0)
      .map((line) => ({
        ledgerId: Number(line.ledgerId),
        amount: Number(line.amount),
        drCrFlag: normalizeLineDrCrFlag(line.drCrFlag),
      }));
    const effectiveCashLedgerAmount =
      cashLedgerAmountDraft !== undefined
        ? cashLedgerAmountDraft
        : cashLedgerAmount;
    const headerAmount =
      effectiveCashLedgerAmount != null ? Number(effectiveCashLedgerAmount) : 0;
    const lineTotalsForPreview = summarizeLineAmounts(
      debitLines,
      headerDrCrFlag
    );
    const billDetailsForPreview = billWiseInvoiceRows
      .filter((row) => {
        if (!row.selected) return false;
        const appliedAmount = Number(row.appliedAmount ?? 0);
        return Number.isFinite(appliedAmount) && appliedAmount > 0;
      })
      .map((row) => ({
        saleInvoiceId: Number(row.saleInvoiceId),
        appliedAmount: Number(row.appliedAmount ?? 0),
        isDebitNoteFlag: row.isDebitNote ? 1 : 0,
      }));
    const headerNarration = narration.trim() ? narration.trim() : null;
    const preservedHeaderLines =
      isEditing || isBillWiseModeForPreview
        ? supplementaryHeaderPostingLines
            .map((line) => ({
              ledgerId: line.ledgerId != null ? Number(line.ledgerId) : null,
              amount: line.amount != null ? Number(line.amount) : null,
              drCrFlag: line.drCrFlag != null ? Number(line.drCrFlag) : null,
              narrationText:
                typeof line.narrationText === "string" &&
                line.narrationText.trim().length > 0
                  ? line.narrationText.trim()
                  : null,
            }))
            .filter(
              (
                line
              ): line is {
                ledgerId: number;
                amount: number;
                drCrFlag: number;
                narrationText: string | null;
              } =>
                line.ledgerId != null &&
                line.amount != null &&
                Number.isFinite(line.amount) &&
                line.amount > 0 &&
                line.drCrFlag != null &&
                Number.isFinite(line.drCrFlag)
            )
        : [];
    const preservedHeaderAmount = preservedHeaderLines.reduce(
      (sum, line) => sum + Number(line.amount || 0),
      0
    );
    const primaryHeaderAmount = Math.max(
      headerAmount - preservedHeaderAmount,
      0
    );
    const voucherLines: VoucherSavePreview["lines"] = [
      ...debitLines.map((line) => ({
        source: "entry" as const,
        ledgerId: line.ledgerId,
        amount: Number(line.amount || 0),
        drCrFlag: line.drCrFlag,
        narrationText: headerNarration,
      })),
      {
        source: "primary",
        ledgerId: cashLedgerId != null ? Number(cashLedgerId) : null,
        amount: Number(primaryHeaderAmount || 0),
        drCrFlag: headerDrCrFlag,
        narrationText: headerNarration,
      },
      ...preservedHeaderLines.map((line) => ({
        source: "preserved" as const,
        ledgerId: line.ledgerId,
        amount: Number(line.amount || 0),
        drCrFlag: Number(line.drCrFlag),
        narrationText: line.narrationText ?? headerNarration,
      })),
    ];
    return {
      mode: paymentMode,
      voucherTypeId: voucherTypeId != null ? Number(voucherTypeId) : null,
      voucherDateText: voucherDate ? toDateText(voucherDate) : null,
      postingDateText: postingDate ? toDateText(postingDate) : null,
      voucherNumber: voucherNo.trim() ? voucherNo.trim() : null,
      narrationText: headerNarration,
      purchaseVoucherNumber: refNo.trim() ? refNo.trim() : null,
      purchaseVoucherDateText: refDate ? toDateText(refDate) : null,
      referenceNumber2: referenceNo2.trim() ? referenceNo2.trim() : null,
      referenceDate2: referenceDate2 ? toDateText(referenceDate2) : null,
      reasonForIssueText: reasonForIssue.trim() ? reasonForIssue.trim() : null,
      isTaxationFlag: profile.key === "tax-invoice" ? 1 : null,
      managerId:
        requiresManagerForPreview && formManagerId != null
          ? Number(formManagerId)
          : null,
      chequeInFavourText:
        showPaymentViaForPreview && chequeInFavour.trim()
          ? chequeInFavour.trim()
          : null,
      chequeIssueBookId: showPaymentViaForPreview
        ? toPositiveId(chequeIssueBookId)
        : null,
      paymentViaId: showPaymentViaForPreview
        ? toPositiveId(paymentViaId)
        : null,
      primaryLedgerId: cashLedgerId != null ? Number(cashLedgerId) : null,
      isCancelledFlag: cancelledChecked ? 1 : 0,
      billDetails: isBillWiseModeForPreview ? billDetailsForPreview : [],
      lines: voucherLines,
      totals: {
        headerAmount,
        lineNetAgainstHeader: lineTotalsForPreview.netAgainstHeader,
        preservedHeaderAmount,
        primaryHeaderAmount,
      },
    };
  }, [
    allowLineDrCrSelection,
    billWiseEnabled,
    billWiseInvoiceRows,
    cashLedgerAmount,
    cashLedgerAmountDraft,
    cashLedgerId,
    cancelledChecked,
    chequeInFavour,
    chequeIssueBookId,
    editingId,
    formManagerId,
    headerDrCrFlag,
    lineEntryDrCrFlag,
    lines,
    modeConfig.requiresManager,
    modeConfig.showPaymentVia,
    narration,
    normalizeLineDrCrFlag,
    paymentMode,
    paymentViaId,
    postingDate,
    refDate,
    refNo,
    referenceDate2,
    referenceNo2,
    reasonForIssue,
    profile.key,
    supportsBillWiseEntry,
    summarizeLineAmounts,
    supplementaryHeaderPostingLines,
    voucherDate,
    voucherNo,
    voucherTypeId,
  ]);

  const markCurrentFormSnapshotAsClean = useCallback(() => {
    setInitialFormSnapshotJson(JSON.stringify(buildCurrentFormSnapshot()));
    setInitialSavePreviewJson(JSON.stringify(buildCurrentSavePreview()));
  }, [buildCurrentFormSnapshot, buildCurrentSavePreview]);

  const scheduleFormSnapshotCapture = useCallback(() => {
    setFormSnapshotCaptureToken((value) => value + 1);
  }, []);

  const isFormDirty = useMemo(() => {
    if (!isFormActive) return false;
    if (!initialFormSnapshotJson) return false;
    return (
      JSON.stringify(buildCurrentFormSnapshot()) !== initialFormSnapshotJson
    );
  }, [buildCurrentFormSnapshot, initialFormSnapshotJson, isFormActive]);
  const isEditing = editingId != null;
  const canRebaselineAutoDefaults =
    isFormActive && editingId == null && !isFormDirty;

  const showPaymentVia = modeConfig.showPaymentVia;
  const showBillWiseOption = supportsBillWiseEntry;
  const isBillWiseMode = showBillWiseOption && billWiseEnabled;
  const isAutoBillWisePostingMode = isBillWiseMode && profile.key === "receipt";
  const isLineEditorLocked = isAutoBillWisePostingMode;
  const isNoteVoucherProfile = NOTE_VOUCHER_PROFILE_KEYS.includes(profile.key);
  const requiresManager = modeConfig.requiresManager;
  const managerLabel = modeConfig.managerLabel;
  const paymentLedgerLabel = modeConfig.headerLedgerLabel;
  const lineEntryLedgerLabel = modeConfig.entryLedgerLabel;
  const lineEntryPurpose = modeConfig.entryLedgerPurpose;
  const paymentLedgerPurpose = modeConfig.headerLedgerPurpose;
  const paymentLedgerGroupLabel = modeConfig.headerLedgerGroupLabel;
  const lineSectionTitle = `To (${lineEntryLedgerLabel})`;
  const registerPrimaryLedgerLabel = paymentLedgerLabel;
  const registerEntryLedgerLabel = lineEntryLedgerLabel;
  const differenceSummaryLabel = allowLineDrCrSelection
    ? `Difference (${headerDrCrLabel} - Net Lines)`
    : `Difference (${headerDrCrLabel} - ${lineEntryDrCrLabel})`;
  const lineEntryTotalLabel = allowLineDrCrSelection
    ? `Net Lines (${AMOUNT_CURRENCY_SYMBOL})`
    : `Total (${lineEntryDrCrLabel} • ${AMOUNT_CURRENCY_SYMBOL})`;
  const resolveDefaultLineDraftDrCrFlag = useCallback((): 0 | 1 => {
    if (!allowLineDrCrSelection) return lineEntryDrCrFlag;
    if (!allowHeaderDrCrSelection) return lineEntryDrCrFlag;
    return headerDrCrFlag === 0 ? 1 : 0;
  }, [
    allowHeaderDrCrSelection,
    allowLineDrCrSelection,
    headerDrCrFlag,
    lineEntryDrCrFlag,
  ]);
  const modeResetLineDraftDrCrFlag = useMemo<0 | 1>(() => {
    if (!allowLineDrCrSelection) return lineEntryDrCrFlag;
    if (!allowHeaderDrCrSelection) return lineEntryDrCrFlag;
    return defaultHeaderDrCrFlag === 0 ? 1 : 0;
  }, [
    allowHeaderDrCrSelection,
    allowLineDrCrSelection,
    defaultHeaderDrCrFlag,
    lineEntryDrCrFlag,
  ]);

  const { data: managersData, loading: managersLoading } = useQuery(MANAGERS, {
    variables: { search: null, limit: 2000 },
    skip: !shouldLoadFormLookups,
  });
  const { data: salesmenData, loading: salesmenLoading } = useQuery(SALESMEN, {
    variables: { search: null, limit: 2000 },
    skip: !shouldLoadFormLookups,
  });
  const { data: paymentViaData, loading: paymentViaLoading } = useQuery(
    PAYMENT_VIA_MASTERS,
    {
      variables: { search: null, limit: 2000, includeInactive: true },
      skip: !showPaymentVia || !shouldLoadFormLookups,
    }
  );
  const { data: chequeBooksData } = useQuery(CHEQUE_ISSUE_BOOKS, {
    variables: { bankLedgerId: cashLedgerId ?? null, limit: 2000 },
    skip: !showPaymentVia || !cashLedgerId || !shouldLoadFormLookups,
  });
  const { options: ledgerGroupOptions, loading: ledgerGroupOptionsLoading } =
    useLedgerGroupOptions({
      skip: !shouldLoadFormLookups,
    });

  const paymentModeOptions = useMemo(
    () =>
      allowedModes.map((mode) => {
        const config = getVoucherModeConfig(profile, mode);
        return {
          label: config.switchLabel,
          value: mode,
        };
      }),
    [allowedModes, profile]
  );
  const voucherProfileSwitch = useMemo(() => {
    if (TRADE_VOUCHER_PROFILE_KEYS.includes(profile.key)) {
      return {
        label: "Trade Type",
        options: TRADE_VOUCHER_PROFILE_KEYS.map((key) => ({
          label: VOUCHER_PROFILE_SWITCH_LABELS[key],
          value: key,
        })),
      };
    }
    if (NOTE_VOUCHER_PROFILE_KEYS.includes(profile.key)) {
      return {
        label: "Note Type",
        options: NOTE_VOUCHER_PROFILE_KEYS.map((key) => ({
          label: VOUCHER_PROFILE_SWITCH_LABELS[key],
          value: key,
        })),
      };
    }
    return null;
  }, [profile.key]);

  useEffect(() => {
    if (!selectedLineKey) return;
    const exists = lines.some((line) => line.key === selectedLineKey);
    if (!exists) {
      setSelectedLineKey(null);
    }
  }, [lines, selectedLineKey]);

  useEffect(() => {
    if (lineEditorDraft.mode !== "edit" || !lineEditorDraft.targetKey) return;
    const exists = lines.some((line) => line.key === lineEditorDraft.targetKey);
    if (!exists) {
      setLineEditorDraft(
        createLineEditorDraft({ drCrFlag: resolveDefaultLineDraftDrCrFlag() })
      );
    }
  }, [
    lineEditorDraft.mode,
    lineEditorDraft.targetKey,
    lines,
    resolveDefaultLineDraftDrCrFlag,
  ]);

  useEffect(() => {
    if (!isFormActive) return;
    if (formSnapshotCaptureToken <= 0) return;
    if (
      editingId != null &&
      hydratedEditVoucherDataKeyRef.current == null
    ) {
      return;
    }
    if (capturedSnapshotTokenRef.current === formSnapshotCaptureToken) return;
    // Capture exactly once per scheduled token so user edits stay dirty afterwards.
    capturedSnapshotTokenRef.current = formSnapshotCaptureToken;
    setInitialFormSnapshotJson(JSON.stringify(buildCurrentFormSnapshot()));
    setInitialSavePreviewJson(JSON.stringify(buildCurrentSavePreview()));
  }, [
    buildCurrentFormSnapshot,
    buildCurrentSavePreview,
    editingId,
    formSnapshotCaptureToken,
    isFormActive,
  ]);

  const paymentViaOptions = useMemo<PaymentViaOption[]>(() => {
    const rows = (paymentViaData?.paymentViaMasters ?? []) as Array<{
      paymentViaId: number;
      code?: string | null;
      name?: string | null;
      isActive?: boolean | null;
    }>;
    return rows
      .filter((row) => row && row.paymentViaId != null)
      .filter((row) => row.isActive !== false)
      .map((row) => ({
        label: row.name ?? row.code ?? `Payment ${row.paymentViaId}`,
        value: Number(row.paymentViaId),
        code: row.code ?? null,
        isActive: row.isActive ?? null,
      }));
  }, [paymentViaData]);
  const chequePaymentViaId = useMemo(
    () =>
      paymentViaOptions.find(
        (option) => (option.code ?? "").toUpperCase() === "CHEQUE"
      )?.value ?? null,
    [paymentViaOptions]
  );
  const selectedPaymentVia = useMemo(
    () =>
      paymentViaOptions.find((option) => option.value === paymentViaId) ?? null,
    [paymentViaId, paymentViaOptions]
  );
  const isCashMode = paymentLedgerPurpose === "CONTRA-CASH";
  const isBankMode = paymentLedgerPurpose === "CONTRA-BANK";
  const isChequePayment =
    showPaymentVia &&
    (selectedPaymentVia?.code ?? "").toUpperCase() === "CHEQUE";
  const isTaxInvoiceProfile = profile.key === "tax-invoice";
  const paymentLedgerPlaceholder = isCashMode ? "Cash ledger" : "Bank ledger";
  const paymentLedgerLoadingPlaceholder = isCashMode
    ? "Loading cash ledgers..."
    : "Loading bank ledgers...";
  const paymentLedgerPlaceholderResolved = paymentLedgerGroupId
    ? paymentLedgerPlaceholder
    : "Select ledger group first";
  const resolveGroupOption = useCallback(
    (
      groupTypeCode: number,
      labelMatcher?: (value?: string | null) => boolean
    ) => {
      if (!ledgerGroupOptions.length) return null;
      const byExactId = ledgerGroupOptions.find(
        (option) => Number(option.value) === Number(groupTypeCode)
      );
      if (byExactId) return byExactId;
      const byType = ledgerGroupOptions.find(
        (option) => Number(option.groupTypeCode) === Number(groupTypeCode)
      );
      if (byType) return byType;
      if (labelMatcher) {
        return (
          ledgerGroupOptions.find((option) =>
            labelMatcher(option.label ?? option.name)
          ) ?? null
        );
      }
      return null;
    },
    [ledgerGroupOptions]
  );
  const cashLedgerGroupOption = useMemo(
    () => resolveGroupOption(CASH_IN_HAND_GROUP_TYPE, isCashInHandLabel),
    [resolveGroupOption]
  );
  const bankLedgerGroupOption = useMemo(
    () => resolveGroupOption(BANK_ACCOUNT_GROUP_TYPE, isBankAccountsLabel),
    [resolveGroupOption]
  );
  const resolvedPaymentLedgerGroupId = useMemo(() => {
    if (paymentLedgerPurpose === "CONTRA-CASH")
      return cashLedgerGroupOption?.value ?? null;
    if (paymentLedgerPurpose === "CONTRA-BANK")
      return bankLedgerGroupOption?.value ?? null;
    return null;
  }, [bankLedgerGroupOption, cashLedgerGroupOption, paymentLedgerPurpose]);
  const paymentLedgerGroupDisabled =
    !isFormActive ||
    ledgerGroupOptionsLoading ||
    Boolean(resolvedPaymentLedgerGroupId);
  const referenceLabels = useMemo(() => {
    if (profile.key === "receipt") {
      return {
        refNoLabel: "Receipt No.",
        refDateLabel: "Receipt Date",
      };
    }
    if (profile.key === "credit-note") {
      return {
        refNoLabel: "Bill No.",
        refDateLabel: "Bill Date",
      };
    }
    if (profile.key === "debit-note") {
      return {
        refNoLabel: "Pur. Voucher No.",
        refDateLabel: "Pur. Voucher Date",
      };
    }
    if (profile.key === "sales") {
      return {
        refNoLabel: "Bill No.",
        refDateLabel: "Bill Date",
      };
    }
    if (profile.key === "purchase") {
      return {
        refNoLabel: "Purchase Bill No.",
        refDateLabel: "Purchase Bill Date",
      };
    }
    if (profile.key === "tax-invoice") {
      return paymentMode === "cash"
        ? {
            refNoLabel: "Tax Invoice No. (Sales)",
            refDateLabel: "Tax Invoice Date (Sales)",
          }
        : {
            refNoLabel: "Tax Invoice No. (Purchase)",
            refDateLabel: "Tax Invoice Date (Purchase)",
          };
    }
    if (isChequePayment) {
      return {
        refNoLabel: "Cheque No.",
        refDateLabel: "Cheque Date",
      };
    }
    return {
      refNoLabel: "Reference No.",
      refDateLabel: "Reference Date",
    };
  }, [isChequePayment, paymentMode, profile.key]);
  const { refNoLabel, refDateLabel } = referenceLabels;
  const referenceNo2Label = isNoteVoucherProfile
    ? "Party Dr/Cr Note No."
    : "Ref. No. 2";
  const referenceDate2Label = isNoteVoucherProfile
    ? "Party Dr/Cr Note Date"
    : "Ref. Date 2";
  const reasonForIssueLabel = "Reason For Issue";
  const defaultLedgerGroupTypeCodes = useMemo(
    () => modeConfig.registerLedgerGroupTypeCodes,
    [modeConfig.registerLedgerGroupTypeCodes]
  );

  const {
    options: paymentLedgerOptions,
    loading: paymentLedgerOptionsLoading,
  } = useLedgerOptionsByPurpose({
    purpose: paymentLedgerPurpose,
    ledgerGroupId: paymentLedgerGroupId ?? null,
    limit: 2000,
    skip: !paymentLedgerPurpose || !shouldLoadFormLookups,
  });
  const selectedPaymentLedger = useMemo(
    () =>
      paymentLedgerOptions.find(
        (option) => Number(option.value) === Number(cashLedgerId)
      ) ?? null,
    [cashLedgerId, paymentLedgerOptions]
  );
  useEffect(() => {
    if (cashLedgerId == null) {
      setCashLedgerOption(null);
      return;
    }
    if (selectedPaymentLedger) {
      const sameValue =
        cashLedgerOption != null &&
        Number(cashLedgerOption.value) === Number(cashLedgerId);
      const sameLabel =
        sameValue &&
        normalizeTextValue(cashLedgerOption?.label ?? "") ===
          normalizeTextValue(selectedPaymentLedger.label ?? "");
      const sameAddress =
        sameValue &&
        normalizeTextValue(cashLedgerOption?.address ?? "") ===
          normalizeTextValue(selectedPaymentLedger.address ?? "");
      if (sameLabel && sameAddress) return;
      setCashLedgerOption(selectedPaymentLedger);
      return;
    }
    if (
      cashLedgerOption &&
      Number(cashLedgerOption.value) === Number(cashLedgerId)
    ) {
      return;
    }
  }, [cashLedgerId, cashLedgerOption, selectedPaymentLedger]);
  const cashLedgerAddress = useMemo(
    () =>
      resolveAddress(cashLedgerOption?.address, selectedPaymentLedger?.address),
    [cashLedgerOption, selectedPaymentLedger]
  );
  const cashLedgerAddressLabel =
    cashLedgerId != null ? cashLedgerAddress ?? "Address not available" : null;
  const cashLedgerLabel = useMemo(
    () => cashLedgerOption?.label ?? selectedPaymentLedger?.label ?? "",
    [cashLedgerOption, selectedPaymentLedger]
  );
  const { options: paymentAgainstOptions } = useLedgerOptionsByPurpose({
    purpose: lineEntryPurpose,
    limit: 5000,
    skip: !lineEntryPurpose || !shouldLoadFormLookups,
  });
  const paymentAgainstOptionMap = useMemo(() => {
    const map = new Map<number, LedgerOption>();
    paymentAgainstOptions.forEach((option) => {
      map.set(Number(option.value), option);
    });
    return map;
  }, [paymentAgainstOptions]);
  const paymentAgainstAddressMap = useMemo(() => {
    const map = new Map<number, string>();
    paymentAgainstOptions.forEach((option) => {
      if (!option.address) return;
      map.set(Number(option.value), option.address);
    });
    return map;
  }, [paymentAgainstOptions]);

  const companyFiscalYearId = companyContext?.companyFiscalYearId ?? null;
  const fiscalYearStart = companyContext?.fiscalYearStart ?? null;
  const fiscalYearEnd = companyContext?.fiscalYearEnd ?? null;
  const canFetchNextNo = Boolean(voucherTypeId);
  const nextVoucherVariables = useMemo(
    () => ({
      voucherTypeId: voucherTypeId ?? 0,
      companyFiscalYearId: companyFiscalYearId ?? null,
      fiscalYearStart,
      fiscalYearEnd,
    }),
    [companyFiscalYearId, fiscalYearEnd, fiscalYearStart, voucherTypeId]
  );
  const shouldLoadBillWiseFiscalYears = showBillWiseOption && isFormActive;
  const { data: billWiseFiscalYearsData } = useQuery(
    COMPANY_FISCAL_YEARS_FOR_BILL_SEARCH,
    {
      client: billingApolloClient,
      skip: !shouldLoadBillWiseFiscalYears,
      fetchPolicy: "cache-first",
      nextFetchPolicy: "cache-first",
    }
  );
  const billWiseFiscalYearOptions = useMemo<BillWiseFiscalYearOption[]>(() => {
    const rows = (billWiseFiscalYearsData?.companyFiscalYears ??
      []) as CompanyFiscalYearRow[];
    return rows
      .map((row) => {
        const value = Number(row.companyFiscalYearId);
        if (!Number.isFinite(value) || value <= 0) return null;
        const fromDateKey = toDateKey(row.financialYearStart ?? null);
        const toDateKeyValue = toDateKey(row.financialYearEnd ?? null);
        return {
          label: buildFiscalYearLabel(
            row.financialYearStart ?? null,
            row.financialYearEnd ?? null
          ),
          value,
          fromDateText: fromDateKey ?? null,
          toDateText: toDateKeyValue ?? null,
          fromDateKey: fromDateKey ?? null,
          toDateKey: toDateKeyValue ?? null,
          isCurrent: Number(row.isCurrentFlag ?? 0) === 1,
        } satisfies BillWiseFiscalYearOption;
      })
      .filter(
        (option): option is BillWiseFiscalYearOption => option != null
      )
      .sort((left, right) => {
        const leftStart = left.fromDateKey ?? "";
        const rightStart = right.fromDateKey ?? "";
        if (leftStart !== rightStart) {
          return rightStart.localeCompare(leftStart);
        }
        return Number(right.value) - Number(left.value);
      });
  }, [billWiseFiscalYearsData?.companyFiscalYears]);
  const billWiseFiscalYearOptionMap = useMemo(() => {
    const map = new Map<number, BillWiseFiscalYearOption>();
    billWiseFiscalYearOptions.forEach((option) => {
      map.set(Number(option.value), option);
    });
    return map;
  }, [billWiseFiscalYearOptions]);
  const billWiseFiscalYearSelectOptions = useMemo<SelectOption[]>(
    () =>
      billWiseFiscalYearOptions.map((option) => ({
        label: option.label,
        value: Number(option.value),
      })),
    [billWiseFiscalYearOptions]
  );
  useEffect(() => {
    if (!showBillWiseOption || billWiseFiscalYearOptions.length === 0) return;
    const contextFiscalYearId = toPositiveId(companyFiscalYearId);
    const baseDate = refDate ?? voucherDate ?? postingDate ?? null;
    const baseDateKey = toDateKey(baseDate ? toDateText(baseDate) : null);
    setBillWiseFiscalYearId((prev) => {
      if (prev != null && billWiseFiscalYearOptionMap.has(Number(prev))) {
        return Number(prev);
      }
      if (contextFiscalYearId != null) {
        const contextOption = billWiseFiscalYearOptionMap.get(contextFiscalYearId);
        if (contextOption) return Number(contextOption.value);
      }
      if (baseDateKey) {
        const matchedByDate =
          billWiseFiscalYearOptions.find((option) => {
            if (!option.fromDateKey || !option.toDateKey) return false;
            return (
              baseDateKey >= option.fromDateKey &&
              baseDateKey <= option.toDateKey
            );
          }) ?? null;
        if (matchedByDate) return Number(matchedByDate.value);
      }
      const currentOption =
        billWiseFiscalYearOptions.find((option) => option.isCurrent) ??
        billWiseFiscalYearOptions[0] ??
        null;
      return currentOption ? Number(currentOption.value) : null;
    });
  }, [
    billWiseFiscalYearOptionMap,
    billWiseFiscalYearOptions,
    companyFiscalYearId,
    postingDate,
    refDate,
    showBillWiseOption,
    voucherDate,
  ]);
  const resolveBillWiseDateRange = useCallback(
    (
      baseDateOverride?: Date | null,
      fiscalYearIdOverride?: number | null
    ) => {
      const resolvedFiscalYearId =
        fiscalYearIdOverride != null
          ? Number(fiscalYearIdOverride)
          : billWiseFiscalYearId != null
          ? Number(billWiseFiscalYearId)
          : null;
      const selectedFiscalYear =
        resolvedFiscalYearId != null
          ? billWiseFiscalYearOptionMap.get(resolvedFiscalYearId) ?? null
          : null;
      const baseDate = baseDateOverride ?? refDate ?? voucherDate ?? postingDate ?? new Date();
      const baseToDateText = toDateText(baseDate);
      const baseToDateKey = toDateKey(baseToDateText);
      let toDateKeyValue = baseToDateKey;
      if (selectedFiscalYear?.toDateKey) {
        if (!toDateKeyValue || toDateKeyValue > selectedFiscalYear.toDateKey) {
          toDateKeyValue = selectedFiscalYear.toDateKey;
        }
      }
      if (selectedFiscalYear?.fromDateKey && toDateKeyValue) {
        if (selectedFiscalYear.fromDateKey > toDateKeyValue) {
          toDateKeyValue = selectedFiscalYear.fromDateKey;
        }
      }
      return {
        fromDate: selectedFiscalYear?.fromDateText ?? null,
        toDate: toDateKeyValue ?? baseToDateText,
      };
    },
    [
      billWiseFiscalYearId,
      billWiseFiscalYearOptionMap,
      postingDate,
      refDate,
      voucherDate,
    ]
  );

  const {
    data: nextNoData,
    refetch: refetchNextNo,
    error: nextNoError,
  } = useQuery(NEXT_VOUCHER_NUMBER, {
    skip: !canFetchNextNo || !shouldLoadFormLookups,
    variables: nextVoucherVariables,
  });

  useEffect(() => {
    if (!isFormActive || editingId) {
      missingConfigRef.current = false;
      return;
    }
    if (!nextNoError) {
      missingConfigRef.current = false;
      return;
    }
    if (missingConfigRef.current) return;
    toastRef.current?.show({
      severity: "warn",
      summary: "Configuration",
      detail:
        "Unable to generate voucher number. Please contact administrator.",
    });
    missingConfigRef.current = true;
  }, [editingId, isFormActive, nextNoError]);

  const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
  const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
  const fiscalRange = useMemo(
    () => resolveFiscalRange(fiscalYearStartText, fiscalYearEndText),
    [fiscalYearEndText, fiscalYearStartText]
  );
  const voucherFormSchema = useMemo(
    () => buildVoucherFormSchema(fiscalRange, refDateLabel),
    [fiscalRange, refDateLabel]
  );
  const shouldFetchNextChequeNo =
    isFormActive &&
    editingId == null &&
    isChequePayment &&
    chequeIssueBookId != null &&
    Number(chequeIssueBookId) > 0;
  const isReceiptCashFlow = profile.key === "receipt" && paymentMode === "cash";
  const shouldLoadSalesmanIssueBooks =
    isReceiptCashFlow &&
    isFormActive &&
    formSalesmanId != null &&
    Number(formSalesmanId) > 0;
  const isSalesmanReceiptAutoNumberingEnabled =
    shouldLoadSalesmanIssueBooks && editingId == null;
  const { data: nextChequeNoData } = useQuery(NEXT_CHEQUE_NUMBER_FOR_BOOK, {
    variables: { chequeIssueBookId: chequeIssueBookId ?? 0 },
    skip: !shouldFetchNextChequeNo,
    fetchPolicy: "network-only",
  });
  const { data: issueBooksData, loading: issueBooksLoading } = useQuery(
    MONEY_RECEIPT_ISSUE_BOOKS_FOR_SALESMAN,
    {
      client: billingApolloClient,
      variables: {
        input: {
          salesmanId: formSalesmanId ?? null,
          fromDate: fiscalYearStartText ?? null,
          toDate: fiscalYearEndText ?? null,
          cancelled: 0,
        },
      },
      skip: !shouldLoadSalesmanIssueBooks,
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
      notifyOnNetworkStatusChange: true,
      returnPartialData: true,
    }
  );
  const salesmanIssueBooks = useMemo(
    () =>
      normalizeIssueBookRows(
        (issueBooksData?.moneyReceiptManualBookIssueDetail?.books ??
          []) as MoneyReceiptIssueBookRow[]
      ),
    [issueBooksData?.moneyReceiptManualBookIssueDetail?.books]
  );
  const salesmanIssueBookMap = useMemo(() => {
    const map = new Map<number, NormalizedMoneyReceiptIssueBook>();
    salesmanIssueBooks.forEach((book) => {
      map.set(book.moneyReceiptIssueBookId, book);
    });
    return map;
  }, [salesmanIssueBooks]);
  const salesmanIssueEntries = useMemo(
    () =>
      ((issueBooksData?.moneyReceiptManualBookIssueDetail?.entries ??
        []) as MoneyReceiptIssueEntryRow[]),
    [issueBooksData?.moneyReceiptManualBookIssueDetail?.entries]
  );
  const voucherDateTextForIssueBook = useMemo(
    () => (voucherDate ? toDateText(voucherDate) : null),
    [voucherDate]
  );
  const hasReceiptSalesmanSelection = useMemo(
    () => toPositiveId(formSalesmanId) != null,
    [formSalesmanId]
  );
  const receiptNoValue = useMemo(() => parseReceiptNoValue(refNo), [refNo]);
  const selectedReceiptIssueBookByRefNo = useMemo(() => {
    if (!shouldLoadSalesmanIssueBooks || receiptNoValue == null) return null;
    return findIssueBookForReceiptNo(salesmanIssueBooks, receiptNoValue);
  }, [
    receiptNoValue,
    salesmanIssueBooks,
    shouldLoadSalesmanIssueBooks,
  ]);
  const selectedReceiptIssueBookId = useMemo(
    () => (isReceiptCashFlow ? toPositiveId(chequeIssueBookId) : null),
    [chequeIssueBookId, isReceiptCashFlow]
  );
  const receiptFiscalYearStartDateKey = useMemo(
    () => toDateKey(fiscalYearStartText ?? null),
    [fiscalYearStartText]
  );
  const receiptIssueBookUsageStatsMap = useMemo(() => {
    const usageStatsMap = new Map<number, ReceiptIssueBookUsageStats>();
    if (!shouldLoadSalesmanIssueBooks || salesmanIssueBooks.length === 0) {
      return usageStatsMap;
    }

    const usedNumberSetByBook = new Map<number, Set<number>>();
    salesmanIssueEntries.forEach((entry) => {
      const bookId = toPositiveId(entry.moneyReceiptIssueBookId);
      if (bookId == null) return;
      const issueBook = salesmanIssueBookMap.get(bookId) ?? null;
      if (!issueBook) return;

      const receiptNo =
        entry.receiptNumber != null &&
        Number.isFinite(Number(entry.receiptNumber))
          ? Number(entry.receiptNumber)
          : null;
      if (receiptNo == null || receiptNo <= 0) return;
      if (
        receiptNo < issueBook.receiptStartNumber ||
        receiptNo > issueBook.receiptEndNumber
      ) {
        return;
      }

      const usageStartDateKey = resolveIssueBookUsageStartDateKey(
        issueBook.voucherDateText ?? null,
        receiptFiscalYearStartDateKey
      );
      if (usageStartDateKey) {
        const entryDateKey = toDateKey(entry.voucherDateText ?? null);
        if (!entryDateKey || entryDateKey < usageStartDateKey) return;
      }

      const usedSet = usedNumberSetByBook.get(bookId) ?? new Set<number>();
      usedSet.add(receiptNo);
      usedNumberSetByBook.set(bookId, usedSet);
    });

    salesmanIssueBooks.forEach((book) => {
      const usedNumbers = usedNumberSetByBook.get(book.moneyReceiptIssueBookId);
      const usedReceiptCount = usedNumbers?.size ?? 0;
      const totalReceiptCount = book.receiptEndNumber - book.receiptStartNumber + 1;
      const maxUsedReceiptNo =
        usedNumbers != null && usedNumbers.size > 0
          ? Math.max(...Array.from(usedNumbers))
          : null;
      const nextReceiptNo =
        maxUsedReceiptNo != null
          ? Math.max(maxUsedReceiptNo + 1, book.receiptStartNumber)
          : book.receiptStartNumber;
      const isFullyConsumed = nextReceiptNo > book.receiptEndNumber;
      usageStatsMap.set(book.moneyReceiptIssueBookId, {
        usedReceiptCount,
        totalReceiptCount,
        isFullyConsumed,
      });
    });

    return usageStatsMap;
  }, [
    receiptFiscalYearStartDateKey,
    salesmanIssueBookMap,
    salesmanIssueBooks,
    salesmanIssueEntries,
    shouldLoadSalesmanIssueBooks,
  ]);
  const receiptIssueBookOptions = useMemo<ReceiptIssueBookOption[]>(() => {
    if (!shouldLoadSalesmanIssueBooks) return [];
    const options = salesmanIssueBooks
      .map((book) => {
        const isSelectedBookOnEdit =
          editingId != null &&
          selectedReceiptIssueBookId != null &&
          Number(selectedReceiptIssueBookId) ===
            Number(book.moneyReceiptIssueBookId);
        const usageStats =
          receiptIssueBookUsageStatsMap.get(book.moneyReceiptIssueBookId) ?? null;
        const totalReceiptCount =
          usageStats?.totalReceiptCount ??
          book.receiptEndNumber - book.receiptStartNumber + 1;
        const usedReceiptCount = usageStats?.usedReceiptCount ?? 0;
        const isFullyConsumed = usageStats?.isFullyConsumed ?? false;
        if (isFullyConsumed && !isSelectedBookOnEdit) return null;

        const displayName =
          book.bookNumber?.trim() || `Book ${book.moneyReceiptIssueBookId}`;
        return {
          label: `${displayName} (${book.receiptStartNumber} to ${book.receiptEndNumber}) [${usedReceiptCount}/${totalReceiptCount}]`,
          value: book.moneyReceiptIssueBookId,
          receiptStartNumber: book.receiptStartNumber,
          receiptEndNumber: book.receiptEndNumber,
          voucherDateText: book.voucherDateText,
          usedReceiptCount,
          totalReceiptCount,
          isFullyConsumed,
        };
      })
      .filter((option): option is ReceiptIssueBookOption => option != null);
    if (
      editingId != null &&
      selectedReceiptIssueBookId != null &&
      !options.some(
        (option) => Number(option.value) === selectedReceiptIssueBookId
      )
    ) {
      const selectedBook =
        salesmanIssueBookMap.get(selectedReceiptIssueBookId) ?? null;
      const usageStats =
        selectedBook != null
          ? (receiptIssueBookUsageStatsMap.get(
              selectedBook.moneyReceiptIssueBookId
            ) ?? null)
          : null;
      const totalReceiptCount = usageStats?.totalReceiptCount ?? null;
      const usedReceiptCount = usageStats?.usedReceiptCount ?? null;
      const isFullyConsumed = usageStats?.isFullyConsumed ?? null;
      const usedTotalLabel =
        usedReceiptCount != null && totalReceiptCount != null
          ? ` [${usedReceiptCount}/${totalReceiptCount}]`
          : "";
      options.unshift({
        label: selectedBook
          ? `${
              selectedBook.bookNumber?.trim() ||
              `Book ${selectedBook.moneyReceiptIssueBookId}`
            } (${selectedBook.receiptStartNumber} to ${
              selectedBook.receiptEndNumber
            })${usedTotalLabel}`
          : `Book ${selectedReceiptIssueBookId}`,
        value: selectedReceiptIssueBookId,
        receiptStartNumber: selectedBook?.receiptStartNumber ?? null,
        receiptEndNumber: selectedBook?.receiptEndNumber ?? null,
        voucherDateText: selectedBook?.voucherDateText ?? null,
        usedReceiptCount,
        totalReceiptCount,
        isFullyConsumed,
      });
    }
    return options;
  }, [
    editingId,
    receiptIssueBookUsageStatsMap,
    salesmanIssueBookMap,
    salesmanIssueBooks,
    selectedReceiptIssueBookId,
    shouldLoadSalesmanIssueBooks,
  ]);
  const receiptIssueBookOptionMap = useMemo(() => {
    const map = new Map<number, ReceiptIssueBookOption>();
    receiptIssueBookOptions.forEach((option) => {
      map.set(Number(option.value), option);
    });
    return map;
  }, [receiptIssueBookOptions]);
  const selectedReceiptIssueBook = useMemo(() => {
    if (!shouldLoadSalesmanIssueBooks || selectedReceiptIssueBookId == null) {
      return null;
    }
    return salesmanIssueBookMap.get(selectedReceiptIssueBookId) ?? null;
  }, [
    salesmanIssueBookMap,
    selectedReceiptIssueBookId,
    shouldLoadSalesmanIssueBooks,
  ]);
  const selectedReceiptIssueUsageStartDateKey = useMemo(() => {
    return resolveIssueBookUsageStartDateKey(
      selectedReceiptIssueBook?.voucherDateText ?? null,
      receiptFiscalYearStartDateKey
    );
  }, [receiptFiscalYearStartDateKey, selectedReceiptIssueBook?.voucherDateText]);
  const salesmanIssueInfoMessage = useMemo(() => {
    if (!shouldLoadSalesmanIssueBooks) return null;
    if (issueBooksLoading) return null;
    if (salesmanIssueBooks.length === 0) {
      return "Receipt book is not issued for selected salesman in current financial year.";
    }
    if (!selectedReceiptIssueBook) {
      return "Select receipt book.";
    }
    const trimmedRefNo = refNo.trim();
    if (!trimmedRefNo) return null;
    if (receiptNoValue == null) return "Receipt no should be numeric.";
    if (!isReceiptNumberInRange(receiptNoValue, selectedReceiptIssueBook)) {
      return "Receipt no is outside selected receipt book range.";
    }
    return null;
  }, [
    receiptNoValue,
    refNo,
    salesmanIssueBooks.length,
    issueBooksLoading,
    selectedReceiptIssueBook,
    shouldLoadSalesmanIssueBooks,
  ]);
  const hasTouchedDatesRef = useRef(false);
  const canRefresh = Boolean(fromDate && toDate);
  const resetRegisterFiltersForContextSwitch = useCallback(() => {
    const range = resolveReportRange(
      fiscalRange.start ?? null,
      fiscalRange.end ?? null
    );
    const startDate = range.start ?? null;
    const endDate = range.end ?? null;
    const fromDateText = startDate ? toDateText(startDate) : null;
    const toDateTextValue = endDate ? toDateText(endDate) : null;
    hasTouchedDatesRef.current = false;
    initialRangeRef.current = range;
    setDateRange([startDate, endDate]);
    setDateErrors({});
    setCancelled(0);
    setReconciled(-1);
    setGlobalSearchText("");
    setGlobalSearchMatchCase(false);
    setGlobalSearchWholeWord(false);
    setDebouncedServerSearchText("");
    setColumnFilters(buildDefaultColumnFilters());
    setFirst(0);
    setFilterSourceRows(null);
    setFilterSourceLoading(false);
    prefetchedRegisterPageKeysRef.current.clear();
    registerSummaryByBaseKeyRef.current.clear();
    setRegisterFilterFocusNonce((value) => value + 1);
    return { fromDateText, toDateText: toDateTextValue };
  }, [fiscalRange.end, fiscalRange.start]);

  const normalizedGlobalSearchText = globalSearchText.trim();
  const supportsServerGlobalSearch =
    !globalSearchMatchCase && !globalSearchWholeWord;
  useEffect(() => {
    if (!supportsServerGlobalSearch) {
      setDebouncedServerSearchText(normalizedGlobalSearchText);
      return;
    }
    if (!normalizedGlobalSearchText) {
      setDebouncedServerSearchText("");
      return;
    }
    const timerId = globalThis.setTimeout(() => {
      setDebouncedServerSearchText(normalizedGlobalSearchText);
    }, REGISTER_SERVER_SEARCH_DEBOUNCE_MS);
    return () => {
      globalThis.clearTimeout(timerId);
    };
  }, [normalizedGlobalSearchText, supportsServerGlobalSearch]);
  const hasGlobalSearch = normalizedGlobalSearchText.length > 0;
  const serverSideSearchTerm =
    supportsServerGlobalSearch && debouncedServerSearchText.length > 0
      ? debouncedServerSearchText
      : null;

  useEffect(() => {
    if (hasTouchedDatesRef.current) return;
    const range = resolveReportRange(
      fiscalRange.start ?? null,
      fiscalRange.end ?? null
    );
    initialRangeRef.current = range;
    setDateRange([range.start ?? null, range.end ?? null]);
  }, [fiscalRange.end, fiscalRange.start]);

  const registerVariables = useMemo(
    () => ({
      mode: paymentMode,
      ledgerId: null,
      ledgerGroupTypeCodes: defaultLedgerGroupTypeCodes,
      ledgerDrCrFlag: modeConfig.registerLedgerDrCrFlag,
      againstLedgerId: null,
      againstLedgerGroupTypeCodes:
        modeConfig.registerAgainstLedgerGroupTypeCodes,
      againstDrCrFlag:
        profile.key === "receipt"
          ? modeConfig.registerLedgerDrCrFlag == null
            ? null
            : modeConfig.registerLedgerDrCrFlag === 0
            ? 1
            : 0
          : profile.key === "journal"
          ? 1
          : allowLineDrCrSelection
          ? null
          : lineEntryDrCrFlag,
      voucherTypeIds: profileVoucherTypeIds,
      search: serverSideSearchTerm,
      managerId: null,
      fromDate,
      toDate,
      cancelled,
      reconciled: reconciled === -1 ? null : reconciled,
      limit: rowsPerPage,
      offset: first,
      pageAfterVoucherDate: null as string | null,
      pageAfterVoucherNumber: null as string | null,
      pageAfterVoucherId: null as number | null,
      pageBeforeVoucherDate: null as string | null,
      pageBeforeVoucherNumber: null as string | null,
      pageBeforeVoucherId: null as number | null,
      excludeOpening: true,
      includeSummary: true,
      totalCountHint: null,
    }),
    [
      cancelled,
      defaultLedgerGroupTypeCodes,
      first,
      fromDate,
      allowLineDrCrSelection,
      lineEntryDrCrFlag,
      modeConfig.registerAgainstLedgerGroupTypeCodes,
      modeConfig.registerLedgerDrCrFlag,
      paymentMode,
      profile.key,
      profileVoucherTypeIds,
      reconciled,
      rowsPerPage,
      serverSideSearchTerm,
      toDate,
    ]
  );

  const [appliedVariables, setAppliedVariables] = useState<
    null | typeof registerVariables
  >(null);
  const [useCompatRegisterQuery, setUseCompatRegisterQuery] = useState(false);
  const hasApplied = appliedVariables !== null;
  const isSameRegisterVariables = useCallback(
    (
      left: typeof registerVariables | null,
      right: typeof registerVariables
    ) => {
      if (!left) return false;
      const leftAgainstLedgerGroupTypeCodes =
        left.againstLedgerGroupTypeCodes ?? [];
      const rightAgainstLedgerGroupTypeCodes =
        right.againstLedgerGroupTypeCodes ?? [];
      return (
        left.mode === right.mode &&
        left.ledgerId === right.ledgerId &&
        left.ledgerDrCrFlag === right.ledgerDrCrFlag &&
        left.againstLedgerId === right.againstLedgerId &&
        leftAgainstLedgerGroupTypeCodes.length ===
          rightAgainstLedgerGroupTypeCodes.length &&
        leftAgainstLedgerGroupTypeCodes.every(
          (value, index) => value === rightAgainstLedgerGroupTypeCodes[index]
        ) &&
        left.againstDrCrFlag === right.againstDrCrFlag &&
        left.managerId === right.managerId &&
        left.fromDate === right.fromDate &&
        left.toDate === right.toDate &&
        left.cancelled === right.cancelled &&
        left.reconciled === right.reconciled &&
        left.limit === right.limit &&
        left.offset === right.offset &&
        left.pageAfterVoucherDate === right.pageAfterVoucherDate &&
        left.pageAfterVoucherNumber === right.pageAfterVoucherNumber &&
        left.pageAfterVoucherId === right.pageAfterVoucherId &&
        left.pageBeforeVoucherDate === right.pageBeforeVoucherDate &&
        left.pageBeforeVoucherNumber === right.pageBeforeVoucherNumber &&
        left.pageBeforeVoucherId === right.pageBeforeVoucherId &&
        left.excludeOpening === right.excludeOpening &&
        left.ledgerGroupTypeCodes.length ===
          right.ledgerGroupTypeCodes.length &&
        left.ledgerGroupTypeCodes.every(
          (value, index) => value === right.ledgerGroupTypeCodes[index]
        ) &&
        left.voucherTypeIds.length === right.voucherTypeIds.length &&
        left.voucherTypeIds.every(
          (value, index) => value === right.voucherTypeIds[index]
        ) &&
        left.search === right.search
      );
    },
    []
  );

  const registerQueryDocument = useMemo(
    () =>
      useCompatRegisterQuery
        ? VOUCHER_REGISTER_BY_LEDGER_COMPAT
        : VOUCHER_REGISTER_BY_LEDGER,
    [useCompatRegisterQuery]
  );
  const registerFetchPolicy =
    appliedVariables?.includeSummary === false
      ? "cache-first"
      : "cache-and-network";
  const { data, loading, error, refetch } = useQuery(registerQueryDocument, {
    variables: appliedVariables ?? registerVariables,
    skip: !appliedVariables,
    fetchPolicy: registerFetchPolicy,
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
    returnPartialData: true,
  });
  const registerErrorMessage = error?.message ?? "";
  const isLegacyFieldValidationError =
    hasLegacyVoucherEntryFieldValidationError(registerErrorMessage);
  useEffect(() => {
    if (!error || useCompatRegisterQuery) return;
    if (!isLegacyFieldValidationError) return;
    setUseCompatRegisterQuery(true);
  }, [error, isLegacyFieldValidationError, useCompatRegisterQuery]);
  const registerError =
    !useCompatRegisterQuery && isLegacyFieldValidationError ? undefined : error;
  const rawRowsForFallback = (
    hasApplied ? data?.voucherRegisterByLedgerDetailed?.items ?? [] : []
  ) as VoucherRow[];
  const shouldLoadLegacyCashFallback =
    profile.key === "receipt" &&
    paymentMode === "cash" &&
    useCompatRegisterQuery &&
    Boolean(
      (appliedVariables ?? registerVariables).fromDate &&
        (appliedVariables ?? registerVariables).toDate
    );
  const { data: legacyCashFallbackData } = useQuery(
    MONEY_RECEIPT_CASH_BOOK_FALLBACK,
    {
      client: billingApolloClient,
      skip: !shouldLoadLegacyCashFallback,
      variables: {
        input: {
          fromDate: (appliedVariables ?? registerVariables).fromDate ?? null,
          toDate: (appliedVariables ?? registerVariables).toDate ?? null,
          ledgerId: (appliedVariables ?? registerVariables).ledgerId ?? null,
          cancelled: cancelled ?? 0,
          detailed: true,
        },
      },
    }
  );
  const needsLegacyBankFallback = rawRowsForFallback.some((row) => {
    const sourceKind = (row.sourceKind ?? paymentMode).trim().toLowerCase();
    if (sourceKind !== "bank") return false;
    return (row.bankName ?? "").trim().length === 0;
  });
  const shouldLoadLegacyBankFallback =
    profile.key === "receipt" &&
    paymentMode === "bank" &&
    (useCompatRegisterQuery || needsLegacyBankFallback) &&
    Boolean(
      (appliedVariables ?? registerVariables).fromDate &&
        (appliedVariables ?? registerVariables).toDate
    );
  const { data: legacyBankFallbackData } = useQuery(
    MONEY_RECEIPT_BANK_BOOK_FALLBACK,
    {
      client: billingApolloClient,
      skip: !shouldLoadLegacyBankFallback,
      variables: {
        input: {
          fromDate: (appliedVariables ?? registerVariables).fromDate ?? null,
          toDate: (appliedVariables ?? registerVariables).toDate ?? null,
          ledgerId: (appliedVariables ?? registerVariables).ledgerId ?? null,
          cancelled: cancelled ?? 0,
          detailed: true,
        },
      },
    }
  );
  const legacyCashFallbackByVoucherNo = useMemo(() => {
    const map = new Map<string, LegacyCashReceiptFallbackRow>();
    const rows = (legacyCashFallbackData?.moneyReceiptCashBook?.items ??
      []) as LegacyCashReceiptFallbackRow[];
    rows.forEach((row) => {
      const key = normalizeLookupKey(row.voucherNumber);
      if (!key) return;
      map.set(key, row);
    });
    return map;
  }, [legacyCashFallbackData]);
  const legacyCashFallbackByVoucherNoAndDate = useMemo(() => {
    const map = new Map<string, LegacyCashReceiptFallbackRow>();
    const rows = (legacyCashFallbackData?.moneyReceiptCashBook?.items ??
      []) as LegacyCashReceiptFallbackRow[];
    rows.forEach((row) => {
      const key = buildVoucherNumberDateLookupKey(
        row.voucherNumber,
        row.voucherDateText
      );
      if (!key) return;
      map.set(key, row);
    });
    return map;
  }, [legacyCashFallbackData]);
  const legacyBankFallbackByVoucherNo = useMemo(() => {
    const map = new Map<string, LegacyBankReceiptFallbackRow>();
    const rows = (legacyBankFallbackData?.moneyReceiptBankBook?.items ??
      []) as LegacyBankReceiptFallbackRow[];
    rows.forEach((row) => {
      const key = normalizeLookupKey(row.voucherNumber);
      if (!key) return;
      map.set(key, row);
    });
    return map;
  }, [legacyBankFallbackData]);
  const legacyBankFallbackByVoucherNoAndDate = useMemo(() => {
    const map = new Map<string, LegacyBankReceiptFallbackRow>();
    const rows = (legacyBankFallbackData?.moneyReceiptBankBook?.items ??
      []) as LegacyBankReceiptFallbackRow[];
    rows.forEach((row) => {
      const key = buildVoucherNumberDateLookupKey(
        row.voucherNumber,
        row.voucherDateText
      );
      if (!key) return;
      map.set(key, row);
    });
    return map;
  }, [legacyBankFallbackData]);
  const legacyBankFallbackByChequeNo = useMemo(() => {
    const map = new Map<string, LegacyBankReceiptFallbackRow>();
    const rows = (legacyBankFallbackData?.moneyReceiptBankBook?.items ??
      []) as LegacyBankReceiptFallbackRow[];
    rows.forEach((row) => {
      const key = normalizeLookupKey(row.chequeNo);
      if (!key) return;
      map.set(key, row);
    });
    return map;
  }, [legacyBankFallbackData]);
  const legacyCashInvoiceLinesByVoucherNo = useMemo(() => {
    const map = new Map<string, string[]>();
    const rows = (legacyCashFallbackData?.moneyReceiptCashBook?.items ??
      []) as LegacyCashReceiptFallbackRow[];
    rows.forEach((row) => {
      const invoiceNo = (row.invoiceNumber ?? "").trim();
      const invoiceDate = formatDate(row.invoiceDateText ?? null);
      const amountValue =
        row.invoiceAmount != null ? Number(row.invoiceAmount) : null;
      const invoiceAmount =
        amountValue != null && Number.isFinite(amountValue)
          ? formatAmount(amountValue)
          : "";
      const line = `${invoiceNo} | ${invoiceDate} | ${invoiceAmount}`.trim();
      if (line.replace(/\|/g, "").trim().length === 0) return;
      const voucherNoKey = normalizeLookupKey(row.voucherNumber);
      if (!voucherNoKey) return;
      const list = map.get(voucherNoKey) ?? [];
      if (!list.includes(line)) list.push(line);
      map.set(voucherNoKey, list);
    });
    return map;
  }, [legacyCashFallbackData]);
  const legacyCashInvoiceLinesByVoucherNoAndDate = useMemo(() => {
    const map = new Map<string, string[]>();
    const rows = (legacyCashFallbackData?.moneyReceiptCashBook?.items ??
      []) as LegacyCashReceiptFallbackRow[];
    rows.forEach((row) => {
      const invoiceNo = (row.invoiceNumber ?? "").trim();
      const invoiceDate = formatDate(row.invoiceDateText ?? null);
      const amountValue =
        row.invoiceAmount != null ? Number(row.invoiceAmount) : null;
      const invoiceAmount =
        amountValue != null && Number.isFinite(amountValue)
          ? formatAmount(amountValue)
          : "";
      const line = `${invoiceNo} | ${invoiceDate} | ${invoiceAmount}`.trim();
      if (line.replace(/\|/g, "").trim().length === 0) return;
      const key = buildVoucherNumberDateLookupKey(
        row.voucherNumber,
        row.voucherDateText
      );
      if (!key) return;
      const list = map.get(key) ?? [];
      if (!list.includes(line)) list.push(line);
      map.set(key, list);
    });
    return map;
  }, [legacyCashFallbackData]);
  const legacyBankInvoiceLinesByVoucherNo = useMemo(() => {
    const map = new Map<string, string[]>();
    const rows = (legacyBankFallbackData?.moneyReceiptBankBook?.items ??
      []) as LegacyBankReceiptFallbackRow[];
    rows.forEach((row) => {
      const invoiceNo = (row.invoiceNumber ?? "").trim();
      const invoiceDate = formatDate(row.invoiceDateText ?? null);
      const amountValue =
        row.invoiceAmount != null ? Number(row.invoiceAmount) : null;
      const invoiceAmount =
        amountValue != null && Number.isFinite(amountValue)
          ? formatAmount(amountValue)
          : "";
      const line = `${invoiceNo} | ${invoiceDate} | ${invoiceAmount}`.trim();
      if (line.replace(/\|/g, "").trim().length === 0) return;
      const voucherNoKey = normalizeLookupKey(row.voucherNumber);
      if (!voucherNoKey) return;
      const list = map.get(voucherNoKey) ?? [];
      if (!list.includes(line)) list.push(line);
      map.set(voucherNoKey, list);
    });
    return map;
  }, [legacyBankFallbackData]);
  const legacyBankInvoiceLinesByVoucherNoAndDate = useMemo(() => {
    const map = new Map<string, string[]>();
    const rows = (legacyBankFallbackData?.moneyReceiptBankBook?.items ??
      []) as LegacyBankReceiptFallbackRow[];
    rows.forEach((row) => {
      const invoiceNo = (row.invoiceNumber ?? "").trim();
      const invoiceDate = formatDate(row.invoiceDateText ?? null);
      const amountValue =
        row.invoiceAmount != null ? Number(row.invoiceAmount) : null;
      const invoiceAmount =
        amountValue != null && Number.isFinite(amountValue)
          ? formatAmount(amountValue)
          : "";
      const line = `${invoiceNo} | ${invoiceDate} | ${invoiceAmount}`.trim();
      if (line.replace(/\|/g, "").trim().length === 0) return;
      const key = buildVoucherNumberDateLookupKey(
        row.voucherNumber,
        row.voucherDateText
      );
      if (!key) return;
      const list = map.get(key) ?? [];
      if (!list.includes(line)) list.push(line);
      map.set(key, list);
    });
    return map;
  }, [legacyBankFallbackData]);
  const legacyBankInvoiceLinesByChequeNo = useMemo(() => {
    const map = new Map<string, string[]>();
    const rows = (legacyBankFallbackData?.moneyReceiptBankBook?.items ??
      []) as LegacyBankReceiptFallbackRow[];
    rows.forEach((row) => {
      const invoiceNo = (row.invoiceNumber ?? "").trim();
      const invoiceDate = formatDate(row.invoiceDateText ?? null);
      const amountValue =
        row.invoiceAmount != null ? Number(row.invoiceAmount) : null;
      const invoiceAmount =
        amountValue != null && Number.isFinite(amountValue)
          ? formatAmount(amountValue)
          : "";
      const line = `${invoiceNo} | ${invoiceDate} | ${invoiceAmount}`.trim();
      if (line.replace(/\|/g, "").trim().length === 0) return;
      const chequeKey = normalizeLookupKey(row.chequeNo);
      if (!chequeKey) return;
      const list = map.get(chequeKey) ?? [];
      if (!list.includes(line)) list.push(line);
      map.set(chequeKey, list);
    });
    return map;
  }, [legacyBankFallbackData]);

  useEffect(() => {
    if (hasApplied) return;
    if (!fromDate || !toDate) return;
    setAppliedVariables(registerVariables);
  }, [fromDate, hasApplied, registerVariables, toDate]);

  const appliedSearchTerm = appliedVariables?.search ?? null;
  useEffect(() => {
    if (!hasApplied) return;
    if (appliedSearchTerm === serverSideSearchTerm) return;
    setAppliedVariables({
      ...registerVariables,
      offset: 0,
      includeSummary: serverSideSearchTerm ? false : true,
      totalCountHint: null,
    });
  }, [appliedSearchTerm, hasApplied, registerVariables, serverSideSearchTerm]);

  const appliedBaseVariables = useMemo(() => {
    if (!appliedVariables) return null;
    const {
      limit: _limit,
      offset: _offset,
      pageAfterVoucherDate: _pageAfterVoucherDate,
      pageAfterVoucherNumber: _pageAfterVoucherNumber,
      pageAfterVoucherId: _pageAfterVoucherId,
      pageBeforeVoucherDate: _pageBeforeVoucherDate,
      pageBeforeVoucherNumber: _pageBeforeVoucherNumber,
      pageBeforeVoucherId: _pageBeforeVoucherId,
      includeSummary: _includeSummary,
      totalCountHint: _totalCountHint,
      ...rest
    } = appliedVariables;
    return rest;
  }, [appliedVariables]);
  const appliedBaseKey = useMemo(
    () => (appliedBaseVariables ? JSON.stringify(appliedBaseVariables) : ""),
    [appliedBaseVariables]
  );
  const registerSummarySnapshot = useMemo<RegisterSummarySnapshot | null>(() => {
    if (appliedVariables?.includeSummary === false) return null;
    const totalNetAmount = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.totalNetAmount
    );
    const totalAmountSum = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.totalAmountSum
    );
    const discountAmountSum = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.discountAmountSum
    );
    const adjustedAmountSum = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.adjustedAmountSum
    );
    const diffAmountSum = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.diffAmountSum
    );
    const chequeReturnChargesSum = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.chequeReturnChargesSum
    );
    const chequeReturnCount = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.chequeReturnCount
    );
    if (
      totalNetAmount == null ||
      totalAmountSum == null ||
      discountAmountSum == null ||
      adjustedAmountSum == null ||
      diffAmountSum == null ||
      chequeReturnChargesSum == null ||
      chequeReturnCount == null
    ) {
      return null;
    }
    return {
      totalNetAmount,
      totalAmountSum,
      discountAmountSum,
      adjustedAmountSum,
      diffAmountSum,
      chequeReturnChargesSum,
      chequeReturnCount,
    };
  }, [
    appliedVariables?.includeSummary,
    data?.voucherRegisterByLedgerDetailed?.adjustedAmountSum,
    data?.voucherRegisterByLedgerDetailed?.chequeReturnChargesSum,
    data?.voucherRegisterByLedgerDetailed?.chequeReturnCount,
    data?.voucherRegisterByLedgerDetailed?.diffAmountSum,
    data?.voucherRegisterByLedgerDetailed?.discountAmountSum,
    data?.voucherRegisterByLedgerDetailed?.totalAmountSum,
    data?.voucherRegisterByLedgerDetailed?.totalNetAmount,
  ]);
  const cachedRegisterSummary =
    appliedBaseKey.length > 0
      ? registerSummaryByBaseKeyRef.current.get(appliedBaseKey) ?? null
      : null;

  useEffect(() => {
    if (!appliedBaseKey || !registerSummarySnapshot) return;
    registerSummaryByBaseKeyRef.current.set(
      appliedBaseKey,
      registerSummarySnapshot
    );
  }, [appliedBaseKey, registerSummarySnapshot]);

  useEffect(() => {
    if (!hasApplied) {
      setFilterSourceRows(null);
      setFilterSourceLoading(false);
      prefetchedRegisterPageKeysRef.current.clear();
      registerSummaryByBaseKeyRef.current.clear();
      return;
    }
    setFilterSourceRows(null);
    setFilterSourceLoading(false);
    prefetchedRegisterPageKeysRef.current.clear();
  }, [appliedBaseKey, hasApplied]);

  useEffect(() => {
    if (routeView !== "register") return;
    if (isFormActive) return;
    setRegisterFilterFocusNonce((value) => value + 1);
  }, [isFormActive, paymentMode, profile.key, routeView]);

  const { data: editData, refetch: refetchEdit } = useQuery(
    VOUCHER_ENTRY_BY_ID,
    {
      skip: !editingId,
      variables: { voucherId: editingId ?? 0 },
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
      notifyOnNetworkStatusChange: true,
    }
  );
  const cashLedgerBalanceDate =
    postingDate ?? voucherDate ?? dateRange[1] ?? null;
  const cashLedgerBalanceToDateText = useMemo(
    () => toDateText(cashLedgerBalanceDate),
    [cashLedgerBalanceDate]
  );
  const { data: cashLedgerBalanceData, loading: cashLedgerBalanceLoading } =
    useQuery(LEDGER_CURRENT_BALANCE, {
      skip:
        !shouldLoadFormLookups ||
        cashLedgerId == null ||
        !cashLedgerBalanceToDateText,
      variables: {
        ledgerId: cashLedgerId ?? 0,
        toDate: cashLedgerBalanceToDateText,
        cancelled,
      },
    });
  const lineEditorLedgerId =
    lineEditorDraft.ledgerId != null ? Number(lineEditorDraft.ledgerId) : null;
  const lineEditorAddress = useMemo(
    () =>
      resolveAddress(
        lineEditorDraft.ledgerOption?.address,
        lineEditorLedgerId != null
          ? paymentAgainstAddressMap.get(lineEditorLedgerId) ?? null
          : null
      ),
    [
      lineEditorDraft.ledgerOption?.address,
      lineEditorLedgerId,
      paymentAgainstAddressMap,
    ]
  );
  const debitLineBalanceDate =
    postingDate ?? voucherDate ?? dateRange[1] ?? null;
  const debitLineBalanceToDateText = useMemo(
    () => toDateText(debitLineBalanceDate),
    [debitLineBalanceDate]
  );
  const { data: lineEditorBalanceData, loading: lineEditorBalanceLoading } =
    useQuery(LEDGER_CURRENT_BALANCE, {
      skip:
        !shouldLoadFormLookups ||
        lineEditorLedgerId == null ||
        !debitLineBalanceToDateText,
      variables: {
        ledgerId: lineEditorLedgerId ?? 0,
        toDate: debitLineBalanceToDateText,
        cancelled,
      },
    });
  const { data: ledgerSummaryGroupLookupData } = useQuery(
    LEDGER_SUMMARY_GROUP_LOOKUP,
    {
      skip: !shouldLoadFormLookups || !isFormActive,
      variables: {
        search: null,
        limit: 20000,
      },
    }
  );
  const billWisePartyLedgerBalanceLedgerId =
    billWisePartyLedgerId != null ? Number(billWisePartyLedgerId) : null;
  const {
    data: billWisePartyLedgerBalanceData,
    loading: billWisePartyLedgerBalanceLoading,
  } = useQuery(LEDGER_CURRENT_BALANCE, {
    skip:
      !shouldLoadFormLookups ||
      !isBillWiseMode ||
      billWisePartyLedgerBalanceLedgerId == null ||
      !debitLineBalanceToDateText,
    variables: {
      ledgerId: billWisePartyLedgerBalanceLedgerId ?? 0,
      toDate: debitLineBalanceToDateText,
      cancelled,
    },
  });

  const [createVoucher] = useMutation(CREATE_VOUCHER);
  const [updateVoucher] = useMutation(UPDATE_VOUCHER);
  const [deleteVoucherEntry] = useMutation(DELETE_VOUCHER);
  const [loadBillWiseInvoices] = useLazyQuery(
    INVOICE_ROLLOVER_FOR_RECEIPT_ENTRY,
    {
      fetchPolicy: "network-only",
    }
  );

  const upsertBillWiseInvoiceRows = useCallback(
    (incomingRows: BillWiseInvoiceRow[]) => {
      setBillWiseInvoiceRows((prevRows) => {
        const previousById = new Map<number, BillWiseInvoiceRow>();
        prevRows.forEach((row) =>
          previousById.set(Number(row.saleInvoiceId), row)
        );

        const mergedRows: BillWiseInvoiceRow[] = incomingRows.map((row) => {
          const previous = previousById.get(Number(row.saleInvoiceId));
          const dueAmount = Math.abs(Number(row.dueAmount ?? 0));
          const selected = billWiseFullPaid
            ? dueAmount > 0.00001
            : previous?.selected ?? row.selected;
          const previousAppliedAmount = Number(previous?.appliedAmount ?? 0);
          const hasPreviousAppliedAmount =
            Number.isFinite(previousAppliedAmount) && previousAppliedAmount > 0;
          const fallbackAppliedAmount = Number(row.appliedAmount ?? 0);
          const hasFallbackAppliedAmount =
            Number.isFinite(fallbackAppliedAmount) && fallbackAppliedAmount > 0;
          const appliedAmount = selected
            ? hasPreviousAppliedAmount
              ? roundMoney(previousAppliedAmount)
              : billWiseFullPaid
              ? roundMoney(dueAmount)
              : hasFallbackAppliedAmount
              ? roundMoney(
                  Math.min(
                    fallbackAppliedAmount,
                    dueAmount || fallbackAppliedAmount
                  )
                )
              : null
            : hasPreviousAppliedAmount
            ? roundMoney(previousAppliedAmount)
            : null;
          return {
            ...row,
            selected,
            appliedAmount,
            isDebitNote: previous?.isDebitNote ?? Boolean(row.isDebitNote),
            isManualAmount: previous?.isManualAmount ?? false,
          };
        });

        previousById.forEach((previousRow, saleInvoiceId) => {
          if (
            mergedRows.some(
              (row) => Number(row.saleInvoiceId) === saleInvoiceId
            )
          )
            return;
          mergedRows.push(previousRow);
        });

        return mergedRows.sort((left, right) => {
          const leftDateKey = toDateKey(left.invoiceDate) ?? "";
          const rightDateKey = toDateKey(right.invoiceDate) ?? "";
          if (leftDateKey !== rightDateKey)
            return leftDateKey.localeCompare(rightDateKey);
          return String(left.invoiceNumber).localeCompare(
            String(right.invoiceNumber),
            "en",
            {
              sensitivity: "base",
            }
          );
        });
      });
    },
    [billWiseFullPaid]
  );

  const refreshBillWiseInvoices = useCallback(
    async () => {
      if (!isFormActive || !showBillWiseOption) return;
      const partyLedgerId =
        billWisePartyLedgerId != null ? Number(billWisePartyLedgerId) : null;
      if (partyLedgerId == null || partyLedgerId <= 0) return;
      const mapInvoiceRows = (items: Array<any>): BillWiseInvoiceRow[] =>
        items
          .filter((item) => !item?.isReceiptRow)
          .map((item) => {
            const saleInvoiceId = Number(item?.invoiceId);
            const dueAmountRaw = Number(item?.difference ?? 0);
            const dueAmount = Number.isFinite(dueAmountRaw)
              ? Number(dueAmountRaw)
              : 0;
            return {
              saleInvoiceId,
              invoiceNumber: String(item?.invoiceNumber ?? saleInvoiceId),
              invoiceDate: item?.invoiceDate ?? null,
              dueAmount,
              selected: false,
              appliedAmount: null,
              isDebitNote: dueAmount < 0,
              isManualAmount: false,
            };
          })
          .filter(
            (item) =>
              Number.isFinite(item.saleInvoiceId) && item.saleInvoiceId > 0
          )
          .filter((item) => Math.abs(item.dueAmount) > 0.00001);
      setBillWiseInvoicesLoading(true);
      try {
        const baseDate = refDate ?? voucherDate ?? postingDate ?? new Date();
        const baseDateText = toDateText(baseDate);
        const baseDateKey = toDateKey(baseDateText);
        const matchedFiscalYearOption =
          baseDateKey != null
            ? billWiseFiscalYearOptions.find((option) => {
                if (!option.fromDateKey || !option.toDateKey) return false;
                return (
                  baseDateKey >= option.fromDateKey &&
                  baseDateKey <= option.toDateKey
                );
              }) ?? null
            : null;
        const effectiveFiscalYearId =
          matchedFiscalYearOption != null
            ? Number(matchedFiscalYearOption.value)
            : billWiseFiscalYearId != null
            ? Number(billWiseFiscalYearId)
            : null;
        const invoiceRange = resolveBillWiseDateRange(
          baseDate,
          effectiveFiscalYearId
        );
        let fromDate = invoiceRange.fromDate ?? null;
        let toDate = invoiceRange.toDate ?? baseDateText;
        if (
          fromDate &&
          toDate &&
          toDateKey(fromDate) != null &&
          toDateKey(toDate) != null &&
          Number(toDateKey(fromDate)) > Number(toDateKey(toDate))
        ) {
          fromDate = null;
          toDate = baseDateText;
        }
        const result = await loadBillWiseInvoices({
          variables: {
            ledgerIds: [partyLedgerId],
            fromDate,
            toDate,
            removeZeroLines: billWiseShowAdvanceBill ? 0 : 1,
            search: null,
          },
        });
        const items = (result.data?.invoiceRollover?.items ?? []) as Array<any>;
        let mappedRows = mapInvoiceRows(items);

        if (mappedRows.length === 0 && !billWiseShowAdvanceBill) {
          const relaxedResult = await loadBillWiseInvoices({
            variables: {
              ledgerIds: [partyLedgerId],
              fromDate,
              toDate,
              removeZeroLines: 0,
              search: null,
            },
          });
          const relaxedItems = (relaxedResult.data?.invoiceRollover?.items ??
            []) as Array<any>;
          mappedRows = mapInvoiceRows(relaxedItems);
        }

        upsertBillWiseInvoiceRows(mappedRows);
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message.trim()
            : String(error ?? "").trim();
        toastRef.current?.show({
          severity: "error",
          summary: "Invoice Load Failed",
          detail:
            reason.length > 0
              ? `Unable to load pending invoices. ${reason}`
              : "Unable to load pending invoices. Please try again.",
        });
      } finally {
        setBillWiseInvoicesLoading(false);
      }
    },
    [
      billWiseFiscalYearId,
      billWiseFiscalYearOptions,
      billWisePartyLedgerId,
      billWiseShowAdvanceBill,
      showBillWiseOption,
      isFormActive,
      loadBillWiseInvoices,
      postingDate,
      refDate,
      resolveBillWiseDateRange,
      toastRef,
      upsertBillWiseInvoiceRows,
      voucherDate,
    ]
  );

  const filterOptions = <T extends { label: string }>(
    options: T[],
    query: string
  ) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle)
    );
  };

  const managerOptions = useMemo((): SelectOption[] => {
    const rows = (managersData?.managers ?? []) as ManagerRow[];
    return rows.map((m) => ({
      label: m.name ?? `Manager ${m.managerId}`,
      value: Number(m.managerId),
    }));
  }, [managersData]);
  const resolveHydratedManagerSelection = useCallback(
    (
      managerIdValue: unknown,
      managerNameValue: unknown
    ): { managerId: number | null; managerQuery: string } => {
      const parsedManagerId = toPositiveId(managerIdValue);
      const rawManagerName =
        typeof managerNameValue === "string" ? managerNameValue.trim() : "";
      const normalizedManagerName = normalizeTextValue(rawManagerName);

      if (parsedManagerId != null) {
        const matchById =
          managerOptions.find(
            (option) => Number(option.value) === parsedManagerId
          ) ?? null;
        if (matchById) {
          return { managerId: Number(matchById.value), managerQuery: "" };
        }
        return {
          managerId: parsedManagerId,
          managerQuery: rawManagerName || `Manager ${parsedManagerId}`,
        };
      }

      if (!normalizedManagerName) {
        return { managerId: null, managerQuery: "" };
      }

      const matchByName =
        managerOptions.find(
          (option) => normalizeTextValue(option.label) === normalizedManagerName
        ) ?? null;
      if (matchByName) {
        return { managerId: Number(matchByName.value), managerQuery: "" };
      }

      return { managerId: null, managerQuery: rawManagerName };
    },
    [managerOptions]
  );
  const salesmanOptions = useMemo((): SelectOption[] => {
    const rows = (salesmenData?.salesmen ?? []) as SalesmanRow[];
    return rows.map((s) => ({
      label: s.name ?? `Salesman ${s.salesmanId}`,
      value: Number(s.salesmanId),
    }));
  }, [salesmenData]);

  const selectedChequeBookId = useMemo(
    () => toPositiveId(chequeIssueBookId),
    [chequeIssueBookId]
  );
  const chequeBookOptions = useMemo<ChequeBookOption[]>(() => {
    const rows = ((chequeBooksData?.chequeIssueBooks ?? []) as ChequeIssueBookRow[])
      .slice()
      .sort((left, right) => {
        const leftDateKey = toDateKey(left.voucherDate ?? null) ?? "";
        const rightDateKey = toDateKey(right.voucherDate ?? null) ?? "";
        if (leftDateKey !== rightDateKey) {
          return rightDateKey.localeCompare(leftDateKey);
        }
        return Number(right.chequeIssueBookId ?? 0) - Number(left.chequeIssueBookId ?? 0);
      });

    const options = rows
      .map((row) => {
        const rowBookId = toPositiveId(row?.chequeIssueBookId);
        if (rowBookId == null) return null;
        const isSelectedBook = selectedChequeBookId != null && rowBookId === selectedChequeBookId;
        const includeSelectedHiddenBookOnEdit = editingId != null && isSelectedBook;
        const isCancelled = Number(row.isCancelledFlag ?? 0) === 1;
        const rowIsFullyConsumed = row.isFullyConsumed === true;
        if ((isCancelled || rowIsFullyConsumed) && !includeSelectedHiddenBookOnEdit) {
          return null;
        }

        const derivedTotalChequeCount =
          row.chequeStartNumber != null && row.chequeEndNumber != null
            ? Number(row.chequeEndNumber) - Number(row.chequeStartNumber) + 1
            : null;
        const totalChequeCount =
          row.totalChequeCount != null && Number.isFinite(Number(row.totalChequeCount))
            ? Number(row.totalChequeCount)
            : derivedTotalChequeCount;
        const rawUsedCount =
          row.usedChequeCount != null && Number.isFinite(Number(row.usedChequeCount))
            ? Number(row.usedChequeCount)
            : 0;
        const usedChequeCount =
          totalChequeCount != null
            ? Math.max(0, Math.min(totalChequeCount, rawUsedCount))
            : rawUsedCount;
        const isFullyConsumed =
          row.isFullyConsumed != null
            ? Boolean(row.isFullyConsumed)
            : totalChequeCount != null && usedChequeCount >= totalChequeCount;

        const rangeLabel =
          row.chequeStartNumber != null && row.chequeEndNumber != null
            ? `(${row.chequeStartNumber} to ${row.chequeEndNumber})`
            : null;
        const usageLabel =
          totalChequeCount != null ? `[${usedChequeCount}/${totalChequeCount}]` : null;
        const labelParts = [
          row.voucherNumber ? row.voucherNumber : `Book ${row.chequeIssueBookId}`,
          rangeLabel,
          usageLabel,
        ].filter(Boolean);
        if (isCancelled) {
          labelParts.push("(Cancelled)");
        }
        return {
          label: labelParts.join(" "),
          value: Number(row.chequeIssueBookId),
          chequeStartNumber:
            row.chequeStartNumber != null ? Number(row.chequeStartNumber) : null,
          chequeEndNumber:
            row.chequeEndNumber != null ? Number(row.chequeEndNumber) : null,
          usedChequeCount: totalChequeCount != null ? usedChequeCount : null,
          totalChequeCount,
          isFullyConsumed,
        };
      })
      .filter((option): option is ChequeBookOption => option != null);

    if (
      editingId != null &&
      selectedChequeBookId != null &&
      !options.some((option) => Number(option.value) === selectedChequeBookId)
    ) {
      const selectedRow =
        rows.find(
          (row) => Number(row.chequeIssueBookId) === Number(selectedChequeBookId)
        ) ?? null;
      const derivedTotalChequeCount =
        selectedRow?.chequeStartNumber != null && selectedRow?.chequeEndNumber != null
          ? Number(selectedRow.chequeEndNumber) - Number(selectedRow.chequeStartNumber) + 1
          : null;
      const totalChequeCount =
        selectedRow?.totalChequeCount != null &&
        Number.isFinite(Number(selectedRow.totalChequeCount))
          ? Number(selectedRow.totalChequeCount)
          : derivedTotalChequeCount;
      const rawUsedCount =
        selectedRow?.usedChequeCount != null &&
        Number.isFinite(Number(selectedRow.usedChequeCount))
          ? Number(selectedRow.usedChequeCount)
          : null;
      const usedChequeCount =
        rawUsedCount != null && totalChequeCount != null
          ? Math.max(0, Math.min(totalChequeCount, rawUsedCount))
          : rawUsedCount;
      const usageLabel =
        usedChequeCount != null && totalChequeCount != null
          ? ` [${usedChequeCount}/${totalChequeCount}]`
          : "";
      const rangeLabel =
        selectedRow?.chequeStartNumber != null && selectedRow?.chequeEndNumber != null
          ? ` (${selectedRow.chequeStartNumber} to ${selectedRow.chequeEndNumber})`
          : "";
      options.unshift({
        label: `${selectedRow?.voucherNumber ?? `Book ${selectedChequeBookId}`}${rangeLabel}${usageLabel}`,
        value: selectedChequeBookId,
        chequeStartNumber:
          selectedRow?.chequeStartNumber != null
            ? Number(selectedRow.chequeStartNumber)
            : null,
        chequeEndNumber:
          selectedRow?.chequeEndNumber != null
            ? Number(selectedRow.chequeEndNumber)
            : null,
        usedChequeCount: usedChequeCount ?? null,
        totalChequeCount: totalChequeCount ?? null,
        isFullyConsumed: selectedRow?.isFullyConsumed ?? null,
      });
    }
    return options;
  }, [chequeBooksData, editingId, selectedChequeBookId]);
  const chequeBookOptionMap = useMemo(() => {
    const map = new Map<number, ChequeBookOption>();
    chequeBookOptions.forEach((option) => {
      map.set(Number(option.value), option);
    });
    return map;
  }, [chequeBookOptions]);
  const normalizeChequeNumber = useCallback((value: string): number | null => {
    const parsed = parseInputNumber(value);
    if (typeof parsed !== "number" || !Number.isFinite(parsed)) return null;
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }, []);
  const isChequeNumberInRange = useCallback(
    (chequeNo: number, option: ChequeBookOption | null) => {
      if (!Number.isFinite(chequeNo) || chequeNo <= 0) return false;
      if (!option) return true;
      if (
        option.chequeStartNumber != null &&
        chequeNo < option.chequeStartNumber
      )
        return false;
      if (option.chequeEndNumber != null && chequeNo > option.chequeEndNumber)
        return false;
      return true;
    },
    []
  );

  const selectedManager = useMemo(
    () =>
      formManagerId != null
        ? managerOptions.find((m) => m.value === formManagerId) ?? null
        : null,
    [formManagerId, managerOptions]
  );
  const managerValue = formManagerQuery.length
    ? formManagerQuery
    : selectedManager;
  const selectedSalesman = useMemo(
    () =>
      formSalesmanId != null
        ? salesmanOptions.find((s) => s.value === formSalesmanId) ?? null
        : null,
    [formSalesmanId, salesmanOptions]
  );
  const salesmanValue = formSalesmanQuery.length
    ? formSalesmanQuery
    : selectedSalesman;
  const globalDiscountLedgerId = useMemo(
    () =>
      toPositiveId(
        agencyOptions?.discountLedgerId ??
          agencyOptions?.defaultExpenditureLedgerId
      ),
    [agencyOptions?.defaultExpenditureLedgerId, agencyOptions?.discountLedgerId]
  );
  const globalChequeReturnLedgerId = useMemo(
    () => toPositiveId(agencyOptions?.chequeCancelLedgerId),
    [agencyOptions?.chequeCancelLedgerId]
  );

  const selectedBillWisePartyLedger = useMemo(
    () =>
      billWisePartyLedgerId != null
        ? paymentAgainstOptionMap.get(Number(billWisePartyLedgerId)) ?? null
        : null,
    [billWisePartyLedgerId, paymentAgainstOptionMap]
  );
  useEffect(() => {
    if (billWisePartyLedgerId == null) {
      setBillWisePartyLedgerOption(null);
      return;
    }
    if (
      billWisePartyLedgerOption &&
      Number(billWisePartyLedgerOption.value) === Number(billWisePartyLedgerId)
    ) {
      return;
    }
    if (selectedBillWisePartyLedger) {
      setBillWisePartyLedgerOption(selectedBillWisePartyLedger);
    }
  }, [
    billWisePartyLedgerId,
    billWisePartyLedgerOption,
    selectedBillWisePartyLedger,
  ]);

  const selectedBillWiseDiscountLedger = useMemo(
    () =>
      billWiseDiscountLedgerId != null
        ? paymentAgainstOptionMap.get(Number(billWiseDiscountLedgerId)) ?? null
        : null,
    [billWiseDiscountLedgerId, paymentAgainstOptionMap]
  );
  useEffect(() => {
    if (billWiseDiscountLedgerId == null) {
      setBillWiseDiscountLedgerOption(null);
      return;
    }
    if (
      billWiseDiscountLedgerOption &&
      Number(billWiseDiscountLedgerOption.value) ===
        Number(billWiseDiscountLedgerId)
    ) {
      return;
    }
    if (selectedBillWiseDiscountLedger) {
      setBillWiseDiscountLedgerOption(selectedBillWiseDiscountLedger);
    }
  }, [
    billWiseDiscountLedgerId,
    billWiseDiscountLedgerOption,
    selectedBillWiseDiscountLedger,
  ]);
  useEffect(() => {
    if (!isBillWiseMode) return;
    const activeDiscountLedgerId = toPositiveId(billWiseDiscountLedgerId);
    if (activeDiscountLedgerId != null) return;
    if (globalDiscountLedgerId == null) return;
    setBillWiseDiscountLedgerId(globalDiscountLedgerId);
  }, [billWiseDiscountLedgerId, globalDiscountLedgerId, isBillWiseMode]);
  const selectedBillWiseChequeReturnLedger = useMemo(
    () =>
      billWiseChequeReturnLedgerId != null
        ? paymentAgainstOptionMap.get(Number(billWiseChequeReturnLedgerId)) ??
          null
        : null,
    [billWiseChequeReturnLedgerId, paymentAgainstOptionMap]
  );
  useEffect(() => {
    if (billWiseChequeReturnLedgerId == null) {
      setBillWiseChequeReturnLedgerOption(null);
      return;
    }
    if (
      billWiseChequeReturnLedgerOption &&
      Number(billWiseChequeReturnLedgerOption.value) ===
        Number(billWiseChequeReturnLedgerId)
    ) {
      return;
    }
    if (selectedBillWiseChequeReturnLedger) {
      setBillWiseChequeReturnLedgerOption(selectedBillWiseChequeReturnLedger);
    }
  }, [
    billWiseChequeReturnLedgerId,
    billWiseChequeReturnLedgerOption,
    selectedBillWiseChequeReturnLedger,
  ]);
  useEffect(() => {
    if (!isBillWiseMode) return;
    const activeChequeReturnLedgerId = toPositiveId(
      billWiseChequeReturnLedgerId
    );
    if (activeChequeReturnLedgerId != null) return;
    if (globalChequeReturnLedgerId == null) return;
    setBillWiseChequeReturnLedgerId(globalChequeReturnLedgerId);
  }, [
    billWiseChequeReturnLedgerId,
    globalChequeReturnLedgerId,
    isBillWiseMode,
  ]);

  const billWiseRowsForSave = useMemo(
    () =>
      billWiseInvoiceRows.filter((row) => {
        if (!row.selected) return false;
        const appliedAmount = Number(row.appliedAmount ?? 0);
        return Number.isFinite(appliedAmount) && appliedAmount > 0;
      }),
    [billWiseInvoiceRows]
  );
  const billWiseAppliedTotal = useMemo(
    () =>
      billWiseRowsForSave.reduce(
        (sum, row) => sum + Number(row.appliedAmount ?? 0),
        0
      ),
    [billWiseRowsForSave]
  );
  const billWiseDiscountAmountValue = useMemo(() => {
    const value = Number(billWiseDiscountAmount ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [billWiseDiscountAmount]);
  const billWiseChequeReturnChargesValue = useMemo(() => {
    const value = Number(billWiseChequeReturnCharges ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [billWiseChequeReturnCharges]);
  const billWiseNetReceiptAmount = useMemo(
    () =>
      Math.max(
        billWiseAppliedTotal -
          billWiseDiscountAmountValue -
          billWiseChequeReturnChargesValue,
        0
      ),
    [
      billWiseAppliedTotal,
      billWiseChequeReturnChargesValue,
      billWiseDiscountAmountValue,
    ]
  );
  const billWiseSelectedRows = useMemo(
    () =>
      billWiseInvoiceRows.filter((row) => {
        if (!row.selected) return false;
        const appliedAmount = Number(row.appliedAmount ?? 0);
        return Number.isFinite(appliedAmount) && appliedAmount > 0;
      }),
    [billWiseInvoiceRows]
  );
  const billWiseTargetAmount = useMemo(() => {
    const value = Number(cashLedgerAmountDraft ?? cashLedgerAmount ?? 0);
    return Number.isFinite(value) && value > 0 ? roundMoney(value) : 0;
  }, [cashLedgerAmount, cashLedgerAmountDraft]);
  const resolveBillWisePendingAmount = useCallback(
    (row: BillWiseInvoiceRow) => {
      const dueAmount = Number(row.dueAmount ?? 0);
      if (!Number.isFinite(dueAmount)) return 0;
      return roundMoney(Math.abs(dueAmount));
    },
    []
  );
  const normalizeBillWiseAppliedAmount = useCallback(
    (row: BillWiseInvoiceRow, rawAmount: number | null) => {
      if (rawAmount == null || !Number.isFinite(rawAmount) || rawAmount <= 0) {
        return null;
      }
      const pendingAmount = resolveBillWisePendingAmount(row);
      if (pendingAmount <= 0) return null;
      return roundMoney(Math.min(rawAmount, pendingAmount));
    },
    [resolveBillWisePendingAmount]
  );
  const rebalanceBillWiseAutoAmounts = useCallback(
    (rows: BillWiseInvoiceRow[]) => {
      const normalizeInvoiceFlag = (row: BillWiseInvoiceRow) =>
        Boolean(row.isDebitNote) || Number(row.dueAmount ?? 0) < 0;
      let manualReservedAmount = 0;
      rows.forEach((row) => {
        if (!row.selected || !row.isManualAmount) return;
        const normalizedAmount = normalizeBillWiseAppliedAmount(
          row,
          Number(row.appliedAmount ?? 0)
        );
        if (normalizedAmount == null || normalizedAmount <= 0) return;
        manualReservedAmount += normalizedAmount;
      });
      let remainingAutoAmount =
        billWiseTargetAmount > 0
          ? roundMoney(Math.max(billWiseTargetAmount - manualReservedAmount, 0))
          : null;
      return rows.map((row) => {
        const normalizedIsDebitNote = normalizeInvoiceFlag(row);
        if (!row.selected) {
          if (row.isManualAmount) {
            return {
              ...row,
              isDebitNote: normalizedIsDebitNote,
            };
          }
          return {
            ...row,
            appliedAmount: null,
            isManualAmount: false,
            isDebitNote: normalizedIsDebitNote,
          };
        }
        if (row.isManualAmount) {
          const normalizedManualAmount = normalizeBillWiseAppliedAmount(
            row,
            Number(row.appliedAmount ?? 0)
          );
          return {
            ...row,
            selected: normalizedManualAmount != null,
            appliedAmount: normalizedManualAmount,
            isManualAmount: normalizedManualAmount != null,
            isDebitNote: normalizedIsDebitNote,
          };
        }
        const pendingAmount = resolveBillWisePendingAmount(row);
        if (pendingAmount <= 0) {
          return {
            ...row,
            selected: false,
            appliedAmount: null,
            isManualAmount: false,
            isDebitNote: normalizedIsDebitNote,
          };
        }
        const autoAmountRaw =
          remainingAutoAmount == null
            ? pendingAmount
            : roundMoney(Math.min(pendingAmount, remainingAutoAmount));
        const autoAmount = autoAmountRaw > 0 ? autoAmountRaw : null;
        if (remainingAutoAmount != null) {
          remainingAutoAmount = roundMoney(
            Math.max(remainingAutoAmount - (autoAmount ?? 0), 0)
          );
        }
        return {
          ...row,
          selected: autoAmount != null,
          appliedAmount: autoAmount,
          isManualAmount: false,
          isDebitNote: normalizedIsDebitNote,
        };
      });
    },
    [
      billWiseTargetAmount,
      normalizeBillWiseAppliedAmount,
      resolveBillWisePendingAmount,
    ]
  );

  const setBillWiseInvoiceSelected = useCallback(
    (saleInvoiceId: number, selected: boolean) => {
      setBillWiseInvoiceRows((prevRows) => {
        const targetId = Number(saleInvoiceId);
        const rowToToggle =
          prevRows.find((row) => Number(row.saleInvoiceId) === targetId) ??
          null;
        if (!rowToToggle) return prevRows;

        const toggledRows = prevRows.map((row) => {
          if (Number(row.saleInvoiceId) !== targetId) return row;
          if (!selected) {
            if (row.isManualAmount) {
              return {
                ...row,
                selected: false,
                isDebitNote:
                  Boolean(row.isDebitNote) || Number(row.dueAmount ?? 0) < 0,
              };
            }
            return {
              ...row,
              selected: false,
              appliedAmount: null,
              isManualAmount: false,
              isDebitNote:
                Boolean(row.isDebitNote) || Number(row.dueAmount ?? 0) < 0,
            };
          }
          return {
            ...row,
            selected: true,
            isDebitNote:
              Boolean(row.isDebitNote) || Number(row.dueAmount ?? 0) < 0,
          };
        });
        return rebalanceBillWiseAutoAmounts(toggledRows);
      });
      clearFormError("billWiseInvoiceRows");
    },
    [clearFormError, rebalanceBillWiseAutoAmounts]
  );

  const resolveBillWiseRowsByType = useCallback(
    (isDebitNote: boolean) => {
      const debitRows = billWiseInvoiceRows.filter(
        (row) => Boolean(row.isDebitNote) || Number(row.dueAmount ?? 0) < 0
      );
      const invoiceRows = billWiseInvoiceRows.filter(
        (row) => !Boolean(row.isDebitNote) && Number(row.dueAmount ?? 0) >= 0
      );
      return isDebitNote ? debitRows : invoiceRows;
    },
    [billWiseInvoiceRows]
  );
  const billWiseLineEditorRows = useMemo(
    () => resolveBillWiseRowsByType(billWiseLineEditor.isDebitNote),
    [billWiseLineEditor.isDebitNote, resolveBillWiseRowsByType]
  );
  const billWiseLineEditorOptions = useMemo(
    () =>
      billWiseLineEditorRows.map((row) => ({
        label: `${row.invoiceNumber} | ${formatDate(
          row.invoiceDate ?? null
        )} | ${formatAmount(Math.abs(Number(row.dueAmount ?? 0)))}`,
        value: Number(row.saleInvoiceId),
      })),
    [billWiseLineEditorRows]
  );

  const setBillWiseInvoiceAppliedAmount = useCallback(
    (saleInvoiceId: number, rawAmount: string | number | null) => {
      const parsed =
        typeof rawAmount === "string"
          ? parseInputNumber(rawAmount)
          : rawAmount == null
          ? null
          : Number(rawAmount);
      if (parsed === undefined) return;
      const parsedAmount = parsed != null ? Number(parsed) : null;
      const nextAmount =
        parsedAmount != null &&
        Number.isFinite(parsedAmount) &&
        parsedAmount > 0
          ? roundMoney(parsedAmount)
          : null;
      setBillWiseInvoiceRows((prevRows) =>
        prevRows.map((row) => {
          if (Number(row.saleInvoiceId) !== Number(saleInvoiceId)) return row;
          const normalizedAmount = normalizeBillWiseAppliedAmount(
            row,
            nextAmount
          );
          return {
            ...row,
            selected: normalizedAmount != null,
            appliedAmount: normalizedAmount,
            isManualAmount: normalizedAmount != null,
            isDebitNote:
              Boolean(row.isDebitNote) || Number(row.dueAmount ?? 0) < 0,
          };
        })
      );
      clearFormError("billWiseInvoiceRows");
    },
    [clearFormError, normalizeBillWiseAppliedAmount]
  );

  useEffect(() => {
    if (!isBillWiseMode) return;
    setBillWiseInvoiceRows((prevRows) => {
      const hasSelectedAutoRows = prevRows.some(
        (row) => row.selected && !row.isManualAmount
      );
      if (!hasSelectedAutoRows) return prevRows;
      return rebalanceBillWiseAutoAmounts(prevRows);
    });
  }, [isBillWiseMode, rebalanceBillWiseAutoAmounts]);

  const closeBillWiseLineEditor = useCallback(() => {
    setBillWiseLineEditor(createBillWiseLineEditorState());
  }, []);

  const openBillWiseLineEditorForAdd = useCallback(() => {
    if (!isFormActive || !isBillWiseMode) return;
    const rows = resolveBillWiseRowsByType(billWiseDebitNote);
    const firstRow = rows.find((row) => !row.selected) ?? rows[0] ?? null;
    setBillWiseLineEditor(
      createBillWiseLineEditorState({
        visible: true,
        mode: "add",
        selectedSaleInvoiceId: firstRow ? Number(firstRow.saleInvoiceId) : null,
        appliedAmount:
          firstRow && Number.isFinite(Number(firstRow.dueAmount))
            ? Math.abs(Number(firstRow.dueAmount))
            : null,
        isDebitNote: billWiseDebitNote,
      })
    );
    clearFormError("billWiseInvoiceRows");
  }, [
    billWiseDebitNote,
    clearFormError,
    isBillWiseMode,
    isFormActive,
    resolveBillWiseRowsByType,
  ]);

  const openBillWiseLineEditorForEdit = useCallback(
    (saleInvoiceId: number) => {
      if (!isFormActive || !isBillWiseMode) return;
      const row =
        billWiseInvoiceRows.find(
          (item) => Number(item.saleInvoiceId) === Number(saleInvoiceId)
        ) ?? null;
      if (!row) return;
      setBillWiseLineEditor(
        createBillWiseLineEditorState({
          visible: true,
          mode: "edit",
          targetSaleInvoiceId: Number(row.saleInvoiceId),
          selectedSaleInvoiceId: Number(row.saleInvoiceId),
          appliedAmount:
            row.appliedAmount != null &&
            Number.isFinite(Number(row.appliedAmount))
              ? Number(row.appliedAmount)
              : Math.abs(Number(row.dueAmount ?? 0)),
          isDebitNote: Boolean(row.isDebitNote),
        })
      );
      clearFormError("billWiseInvoiceRows");
    },
    [billWiseInvoiceRows, clearFormError, isBillWiseMode, isFormActive]
  );

  const updateBillWiseLineEditorState = useCallback(
    (patch: Partial<BillWiseLineEditorState>) => {
      setBillWiseLineEditor((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const applyBillWiseLineEditor = useCallback(() => {
    if (!billWiseLineEditor.visible) return;

    const selectedSaleInvoiceId = toPositiveId(
      billWiseLineEditor.selectedSaleInvoiceId
    );
    if (selectedSaleInvoiceId == null) {
      setFormErrors((prev) => ({
        ...prev,
        billWiseInvoiceRows: `Select ${
          billWiseLineEditor.isDebitNote ? "debit note" : "invoice"
        } number.`,
      }));
      return;
    }

    const parsedAmount = Number(billWiseLineEditor.appliedAmount ?? 0);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormErrors((prev) => ({
        ...prev,
        billWiseInvoiceRows: "Enter adjusted amount.",
      }));
      return;
    }

    setBillWiseInvoiceRows((prevRows) =>
      prevRows.map((row) => {
        const rowId = Number(row.saleInvoiceId);
        const isSelectedRow = rowId === selectedSaleInvoiceId;
        const shouldClearPreviousSelection =
          billWiseLineEditor.mode === "edit" &&
          billWiseLineEditor.targetSaleInvoiceId != null &&
          rowId === Number(billWiseLineEditor.targetSaleInvoiceId) &&
          rowId !== selectedSaleInvoiceId;
        if (shouldClearPreviousSelection) {
          return {
            ...row,
            selected: false,
            appliedAmount: null,
            isDebitNote: false,
          };
        }
        if (!isSelectedRow) return row;
        return {
          ...row,
          selected: true,
          appliedAmount: parsedAmount,
          isDebitNote: Boolean(billWiseLineEditor.isDebitNote),
        };
      })
    );
    clearFormError("billWiseInvoiceRows");
    closeBillWiseLineEditor();
  }, [billWiseLineEditor, clearFormError, closeBillWiseLineEditor]);

  const confirmRemoveBillWiseInvoice = useCallback(
    (saleInvoiceId: number) => {
      const target =
        billWiseInvoiceRows.find(
          (row) => Number(row.saleInvoiceId) === Number(saleInvoiceId)
        ) ?? null;
      if (!target) return;
      confirmDialog({
        header: "Remove Bill Line?",
        message: `Remove ${target.isDebitNote ? "debit note" : "invoice"} ${
          target.invoiceNumber
        }?`,
        icon: "pi pi-exclamation-triangle",
        rejectLabel: "No",
        acceptLabel: "Remove",
        acceptClassName: "p-button-danger",
        accept: () => {
          setBillWiseInvoiceSelected(Number(saleInvoiceId), false);
          clearFormError("billWiseInvoiceRows");
        },
        reject: () => undefined,
      });
    },
    [billWiseInvoiceRows, clearFormError, setBillWiseInvoiceSelected]
  );

  useEffect(() => {
    if (!billWiseLineEditor.visible) return;
    const hasActiveSelection = billWiseLineEditorRows.some(
      (row) =>
        Number(row.saleInvoiceId) ===
        Number(billWiseLineEditor.selectedSaleInvoiceId)
    );
    if (hasActiveSelection) return;
    const firstRow = billWiseLineEditorRows[0] ?? null;
    setBillWiseLineEditor((prev) => ({
      ...prev,
      selectedSaleInvoiceId: firstRow ? Number(firstRow.saleInvoiceId) : null,
      appliedAmount:
        firstRow && Number.isFinite(Number(firstRow.dueAmount))
          ? Math.abs(Number(firstRow.dueAmount))
          : prev.appliedAmount,
    }));
  }, [
    billWiseLineEditor.selectedSaleInvoiceId,
    billWiseLineEditor.visible,
    billWiseLineEditorRows,
  ]);

  useEffect(() => {
    if (!isFormActive || !isBillWiseMode) return;
    if (
      isEditing &&
      !billWiseSelectionDialogVisible &&
      !billWiseInvoiceSearchDialogVisible
    ) {
      return;
    }
    void refreshBillWiseInvoices();
  }, [
    billWisePartyLedgerId,
    billWiseInvoiceSearchDialogVisible,
    billWiseSelectionDialogVisible,
    billWiseShowAdvanceBill,
    isEditing,
    isBillWiseMode,
    isFormActive,
    refreshBillWiseInvoices,
    voucherDate,
    postingDate,
    refDate,
  ]);

  useEffect(() => {
    if (!isAutoBillWisePostingMode) return;
    const partyLedgerId =
      billWisePartyLedgerId != null ? Number(billWisePartyLedgerId) : null;
    if (
      partyLedgerId == null ||
      partyLedgerId <= 0 ||
      billWiseAppliedTotal <= 0
    ) {
      setLines((prev) => (prev.length === 0 ? prev : []));
      setSupplementaryHeaderPostingLines((prev) =>
        prev.length === 0 ? prev : []
      );
      return;
    }

    const partyOption =
      paymentAgainstOptionMap.get(partyLedgerId) ??
      billWisePartyLedgerOption ??
      null;
    const partyLabel = partyOption?.label ?? `Ledger ${partyLedgerId}`;
    const partyLedgerGroupId =
      billWisePartyLedgerGroupId != null
        ? Number(billWisePartyLedgerGroupId)
        : lineEditorCarryGroupId;
    const normalizedPartyLedgerGroupId =
      partyLedgerGroupId != null ? Number(partyLedgerGroupId) : null;
    const billWisePrimaryLineDrCrFlag =
      allowLineDrCrSelection && allowHeaderDrCrSelection
        ? headerDrCrFlag === 0
          ? 1
          : 0
        : lineEntryDrCrFlag;

    setLines((prev) => {
      const current = prev.length === 1 ? prev[0] : null;
      const hasSameLine =
        current != null &&
        Number(current.ledgerGroupId ?? 0) ===
          Number(normalizedPartyLedgerGroupId ?? 0) &&
        Number(current.ledgerId ?? 0) === Number(partyLedgerId) &&
        Number(current.amount ?? 0) === Number(billWiseAppliedTotal) &&
        normalizeTextValue(current.label ?? "") ===
          normalizeTextValue(partyLabel) &&
        normalizeTextValue(current.ledgerOption?.label ?? "") ===
          normalizeTextValue(partyOption?.label ?? "");
      if (hasSameLine) return prev;

      return [
        {
          ...(current ??
            createDebitLine({
              key: BILLWISE_AUTO_LINE_KEY,
              drCrFlag: billWisePrimaryLineDrCrFlag,
            })),
          key: BILLWISE_AUTO_LINE_KEY,
          ledgerGroupId: normalizedPartyLedgerGroupId,
          ledgerId: partyLedgerId,
          ledgerOption: partyOption,
          drCrFlag: billWisePrimaryLineDrCrFlag,
          amount: billWiseAppliedTotal,
          label: partyLabel,
        },
      ];
    });
    setSelectedLineKey((prev) =>
      prev === BILLWISE_AUTO_LINE_KEY ? prev : BILLWISE_AUTO_LINE_KEY
    );
    setLineEditorCarryGroupId((prev) =>
      prev === normalizedPartyLedgerGroupId
        ? prev
        : normalizedPartyLedgerGroupId
    );
    setLineEditorDraft((prev) => {
      if (
        prev.mode === "add" &&
        prev.targetKey == null &&
        prev.ledgerGroupId === normalizedPartyLedgerGroupId &&
        prev.ledgerId == null &&
        prev.drCrFlag === billWisePrimaryLineDrCrFlag &&
        prev.amount == null &&
        prev.label == null
      ) {
        return prev;
      }
      return createLineEditorDraft({
        ledgerGroupId: normalizedPartyLedgerGroupId,
        drCrFlag: resolveDefaultLineDraftDrCrFlag(),
      });
    });

    const nextSupplementaryLines: SupplementaryHeaderPostingLine[] = [];
    if (billWiseDiscountAmountValue > 0 && billWiseDiscountLedgerId != null) {
      nextSupplementaryLines.push({
        ledgerId: Number(billWiseDiscountLedgerId),
        amount: billWiseDiscountAmountValue,
        drCrFlag: headerDrCrFlag,
        narrationText: narration?.trim() ? narration.trim() : null,
        ledgerName: billWiseDiscountLedgerOption?.label ?? null,
        ledgerGroupName: null,
        sourceKind: "discount",
      });
    }
    if (
      billWiseChequeReturnChargesValue > 0 &&
      billWiseChequeReturnLedgerId != null
    ) {
      nextSupplementaryLines.push({
        ledgerId: Number(billWiseChequeReturnLedgerId),
        amount: billWiseChequeReturnChargesValue,
        drCrFlag: headerDrCrFlag,
        narrationText: narration?.trim() ? narration.trim() : null,
        ledgerName: billWiseChequeReturnLedgerOption?.label ?? null,
        ledgerGroupName: null,
        sourceKind: "chequeReturn",
      });
    }
    setSupplementaryHeaderPostingLines((prev) => {
      const hasSameLines =
        prev.length === nextSupplementaryLines.length &&
        prev.every((line, index) => {
          const nextLine = nextSupplementaryLines[index];
          if (!nextLine) return false;
          return (
            Number(line.ledgerId) === Number(nextLine.ledgerId) &&
            Number(line.amount ?? 0) === Number(nextLine.amount ?? 0) &&
            Number(line.drCrFlag ?? -1) === Number(nextLine.drCrFlag ?? -1) &&
            normalizeTextValue(line.narrationText ?? "") ===
              normalizeTextValue(nextLine.narrationText ?? "") &&
            normalizeTextValue(line.ledgerName ?? "") ===
              normalizeTextValue(nextLine.ledgerName ?? "") &&
            normalizeTextValue(line.ledgerGroupName ?? "") ===
              normalizeTextValue(nextLine.ledgerGroupName ?? "") &&
            normalizeTextValue(line.sourceKind ?? "") ===
              normalizeTextValue(nextLine.sourceKind ?? "")
          );
        });
      return hasSameLines ? prev : nextSupplementaryLines;
    });
  }, [
    allowHeaderDrCrSelection,
    allowLineDrCrSelection,
    billWiseAppliedTotal,
    billWiseChequeReturnChargesValue,
    billWiseChequeReturnLedgerId,
    billWiseChequeReturnLedgerOption?.label,
    billWiseDiscountAmountValue,
    billWiseDiscountLedgerId,
    billWiseDiscountLedgerOption?.label,
    billWisePartyLedgerGroupId,
    billWisePartyLedgerId,
    billWisePartyLedgerOption,
    headerDrCrFlag,
    isAutoBillWisePostingMode,
    lineEntryDrCrFlag,
    lineEditorCarryGroupId,
    narration,
    paymentAgainstOptionMap,
  ]);

  useEffect(() => {
    setFormManagerSuggestions(filterOptions(managerOptions, formManagerQuery));
  }, [formManagerQuery, managerOptions]);
  useEffect(() => {
    if (!isFormActive) return;
    if (formManagerId != null) return;
    const normalizedQuery = normalizeTextValue(formManagerQuery);
    if (!normalizedQuery) return;
    const match =
      managerOptions.find(
        (option) => normalizeTextValue(option.label) === normalizedQuery
      ) ?? null;
    if (!match) return;
    setFormManagerId(Number(match.value));
    setFormManagerQuery("");
  }, [formManagerId, formManagerQuery, isFormActive, managerOptions]);
  useEffect(() => {
    setFormSalesmanSuggestions(
      filterOptions(salesmanOptions, formSalesmanQuery)
    );
  }, [formSalesmanQuery, salesmanOptions]);
  useEffect(() => {
    if (!isFormActive) return;
    if (formSalesmanId != null) return;
    const normalizedQuery = normalizeTextValue(formSalesmanQuery);
    if (!normalizedQuery) return;
    const match =
      salesmanOptions.find(
        (option) => normalizeTextValue(option.label) === normalizedQuery
      ) ?? null;
    if (!match) return;
    setFormSalesmanId(Number(match.value));
    setFormSalesmanQuery("");
  }, [formSalesmanId, formSalesmanQuery, isFormActive, salesmanOptions]);

  const rows: VoucherRow[] = useMemo(
    () =>
      hasApplied ? data?.voucherRegisterByLedgerDetailed?.items ?? [] : [],
    [data, hasApplied]
  );
  const totalCount = hasApplied
    ? data?.voucherRegisterByLedgerDetailed?.totalCount ?? rows.length ?? 0
    : 0;
  const registerLoading = loading && rows.length === 0;
  const isLightweightRegisterLoad = appliedVariables?.includeSummary === false;
  const registerQueryLoading = Boolean(
    hasApplied && loading && !isLightweightRegisterLoad
  );
  const [pageIndexLoadRequest, setPageIndexLoadRequest] =
    useState<PageIndexLoadRequest | null>(null);
  const [activePageIndexLoadMs, setActivePageIndexLoadMs] = useState<
    number | null
  >(null);
  const [lastPageIndexLoadMs, setLastPageIndexLoadMs] = useState<number | null>(
    null
  );
  const pageIndexLoadMatchedRef = useRef(false);
  const pageIndexLoading = pageIndexLoadRequest !== null;

  const clearPageIndexLoadMeasurement = useCallback(() => {
    pageIndexLoadMatchedRef.current = false;
    setPageIndexLoadRequest(null);
    setActivePageIndexLoadMs(null);
  }, []);

  const startPageIndexLoadMeasurement = useCallback(
    (nextOffset: number, nextLimit: number) => {
      const offset = Number.isFinite(nextOffset)
        ? Math.max(0, Math.trunc(nextOffset))
        : 0;
      const limit = Number.isFinite(nextLimit)
        ? Math.max(1, Math.trunc(nextLimit))
        : Math.max(1, rowsPerPage);
      pageIndexLoadMatchedRef.current = false;
      setPageIndexLoadRequest({
        offset,
        limit,
        startedAtMs: nowMs(),
      });
      setActivePageIndexLoadMs(0);
    },
    [rowsPerPage]
  );

  useEffect(() => {
    if (!pageIndexLoadRequest) return;
    const update = () => {
      setActivePageIndexLoadMs(nowMs() - pageIndexLoadRequest.startedAtMs);
    };
    update();
    const intervalId = globalThis.setInterval(update, 200);
    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [pageIndexLoadRequest]);

  useEffect(() => {
    if (!pageIndexLoadRequest) return;
    const appliedOffset = appliedVariables?.offset ?? 0;
    const appliedLimit = appliedVariables?.limit ?? rowsPerPage;
    const matchesPendingRequest =
      appliedVariables?.includeSummary === false &&
      appliedOffset === pageIndexLoadRequest.offset &&
      appliedLimit === pageIndexLoadRequest.limit;

    if (matchesPendingRequest) {
      pageIndexLoadMatchedRef.current = true;
    }
    if (loading) return;
    if (matchesPendingRequest || pageIndexLoadMatchedRef.current) {
      setLastPageIndexLoadMs(nowMs() - pageIndexLoadRequest.startedAtMs);
    }
    clearPageIndexLoadMeasurement();
  }, [
    appliedVariables,
    clearPageIndexLoadMeasurement,
    loading,
    pageIndexLoadRequest,
    rowsPerPage,
  ]);

  const fetchFilterSourceRows = useCallback(async () => {
    if (!hasApplied || !appliedBaseVariables) return;
    if (filterSourceLoading) return;
    if (filterSourceRows !== null) return;
    if (totalCount <= 0) {
      setFilterSourceRows([]);
      return;
    }
    if (totalCount <= rows.length) {
      setFilterSourceRows(rows);
      return;
    }
    setFilterSourceLoading(true);
    try {
      const result = await apolloClient.query({
        query: registerQueryDocument,
        fetchPolicy: "network-only",
        variables: {
          ...appliedBaseVariables,
          limit: totalCount,
          offset: 0,
          includeSummary: false,
          totalCountHint: totalCount,
        },
      });
      const items = result.data?.voucherRegisterByLedgerDetailed?.items ?? [];
      setFilterSourceRows(Array.isArray(items) ? (items as VoucherRow[]) : []);
    } catch {
      setFilterSourceRows([]);
    } finally {
      setFilterSourceLoading(false);
    }
  }, [
    apolloClient,
    appliedBaseVariables,
    filterSourceLoading,
    filterSourceRows,
    hasApplied,
    registerQueryDocument,
    rows,
    totalCount,
  ]);

  const cashLedgerBalanceLabel = useMemo(() => {
    if (!cashLedgerId) return null;
    if (cashLedgerBalanceLoading) return "Loading...";
    const balance = cashLedgerBalanceData?.ledgerCurrentBalance;
    if (!balance) return `${formatAmount(0)} Dr`;
    return `${formatAmount(Number(balance.amount ?? 0))} ${
      balance.drCr ?? "Dr"
    }`;
  }, [cashLedgerBalanceData, cashLedgerBalanceLoading, cashLedgerId]);
  const lineEditorBalanceLabel = useMemo(() => {
    if (!lineEditorLedgerId) return null;
    if (lineEditorBalanceLoading) return "Loading...";
    const balance = lineEditorBalanceData?.ledgerCurrentBalance;
    if (!balance) return `${formatAmount(0)} Dr`;
    return `${formatAmount(Number(balance.amount ?? 0))} ${
      balance.drCr ?? "Dr"
    }`;
  }, [lineEditorBalanceData, lineEditorBalanceLoading, lineEditorLedgerId]);
  const billWisePartyLedgerBalanceLabel = useMemo(() => {
    if (!billWisePartyLedgerBalanceLedgerId) return null;
    if (billWisePartyLedgerBalanceLoading) return "Loading...";
    const balance = billWisePartyLedgerBalanceData?.ledgerCurrentBalance;
    if (!balance) return `${formatAmount(0)} Dr`;
    return `${formatAmount(Number(balance.amount ?? 0))} ${
      balance.drCr ?? "Dr"
    }`;
  }, [
    billWisePartyLedgerBalanceData,
    billWisePartyLedgerBalanceLedgerId,
    billWisePartyLedgerBalanceLoading,
  ]);

  const cashLedgerBalanceClass = useMemo(() => {
    if (cashLedgerBalanceLoading) return "text-600";
    const drCr = cashLedgerBalanceData?.ledgerCurrentBalance?.drCr ?? "Dr";
    return drCr === "Cr" ? "text-red-600" : "text-green-600";
  }, [cashLedgerBalanceData, cashLedgerBalanceLoading]);
  const lineEditorBalanceClass = useMemo(() => {
    if (lineEditorBalanceLoading) return "text-600";
    const drCr = lineEditorBalanceData?.ledgerCurrentBalance?.drCr ?? "Dr";
    return drCr === "Cr" ? "text-red-600" : "text-green-600";
  }, [lineEditorBalanceData, lineEditorBalanceLoading]);
  const ledgerGroupLabelById = useMemo(() => {
    const map = new Map<number, string>();
    ledgerGroupOptions.forEach((option) => {
      const ledgerGroupId = Number(option.value);
      if (!Number.isFinite(ledgerGroupId) || ledgerGroupId <= 0) return;
      map.set(
        ledgerGroupId,
        option.label ?? option.name ?? `Group ${ledgerGroupId}`
      );
    });
    return map;
  }, [ledgerGroupOptions]);
  const ledgerGroupIdByLedgerId = useMemo(() => {
    const map = new Map<number, number>();
    const rows = ledgerSummaryGroupLookupData?.ledgerSummaries?.items ?? [];
    (
      rows as Array<{ ledgerId?: number | null; ledgerGroupId?: number | null }>
    ).forEach((row) => {
      const ledgerId = row.ledgerId != null ? Number(row.ledgerId) : null;
      if (ledgerId == null || !Number.isFinite(ledgerId) || ledgerId <= 0)
        return;
      const ledgerGroupId =
        row.ledgerGroupId != null ? Number(row.ledgerGroupId) : null;
      if (
        ledgerGroupId == null ||
        !Number.isFinite(ledgerGroupId) ||
        ledgerGroupId <= 0
      )
        return;
      map.set(ledgerId, ledgerGroupId);
    });
    return map;
  }, [ledgerSummaryGroupLookupData]);
  const ledgerGroupLabelByLedgerId = useMemo(() => {
    const map = new Map<number, string>();
    ledgerGroupIdByLedgerId.forEach((ledgerGroupId, ledgerId) => {
      map.set(
        ledgerId,
        ledgerGroupLabelById.get(ledgerGroupId) ?? `Group ${ledgerGroupId}`
      );
    });
    return map;
  }, [ledgerGroupIdByLedgerId, ledgerGroupLabelById]);
  const cashLedgerGroupLabel = useMemo(() => {
    if (cashLedgerId == null) return null;
    const fromLedgerSummary =
      ledgerGroupLabelByLedgerId.get(Number(cashLedgerId)) ?? null;
    if (fromLedgerSummary) return fromLedgerSummary;
    if (paymentLedgerGroupId != null) {
      return ledgerGroupLabelById.get(Number(paymentLedgerGroupId)) ?? null;
    }
    return null;
  }, [
    cashLedgerId,
    ledgerGroupLabelById,
    ledgerGroupLabelByLedgerId,
    paymentLedgerGroupId,
  ]);
  const updatePrimaryLedger = useCallback(
    (value: number | null, option?: LedgerOption | null) => {
      setFirst(0);
      const ledgerId = value != null ? Number(value) : null;
      setCashLedgerId(ledgerId);
      setCashLedgerOption(option ?? null);
      if (ledgerId == null || resolvedPaymentLedgerGroupId != null) return;
      const nextLedgerGroupId = ledgerGroupIdByLedgerId.get(ledgerId);
      if (nextLedgerGroupId == null) return;
      setPaymentLedgerGroupId((prev) => {
        if (prev != null && Number(prev) === Number(nextLedgerGroupId))
          return prev;
        return Number(nextLedgerGroupId);
      });
    },
    [ledgerGroupIdByLedgerId, resolvedPaymentLedgerGroupId]
  );
  const billWisePartyLedgerBalanceClass = useMemo(() => {
    if (billWisePartyLedgerBalanceLoading) return "text-600";
    const drCr =
      billWisePartyLedgerBalanceData?.ledgerCurrentBalance?.drCr ?? "Dr";
    return drCr === "Cr" ? "text-red-600" : "text-green-600";
  }, [billWisePartyLedgerBalanceData, billWisePartyLedgerBalanceLoading]);

  const handleRefresh = useCallback(() => {
    const validation = validateDateRange({
      fromDate: dateRange[0],
      toDate: dateRange[1],
    });
    if (!validation.ok) {
      setDateErrors(validation.errors);
      return;
    }
    clearPageIndexLoadMeasurement();
    setDateErrors({});
    const shouldForceRefetch =
      hasApplied &&
      isSameRegisterVariables(appliedVariables, registerVariables);
    setAppliedVariables(registerVariables);
    if (shouldForceRefetch) {
      void refetch(registerVariables);
    }
  }, [
    appliedVariables,
    dateRange,
    hasApplied,
    isSameRegisterVariables,
    registerVariables,
    refetch,
    clearPageIndexLoadMeasurement,
  ]);

  const focusLineEditorAmountInput = () => {
    lineEditorLedgerGroupRef.current?.hide?.();
    lineEditorLedgerRef.current?.hide?.();
    const input = lineEditorAmountRef.current ?? null;
    if (!input) return;
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      const length = input.value?.length ?? 0;
      input.setSelectionRange(0, length);
    }
  };

  const focusLineEditorLedgerGroupInput = () => {
    const groupRef = lineEditorLedgerGroupRef.current ?? null;
    if (!groupRef) return;
    lineEditorLedgerRef.current?.hide?.();
    groupRef.hide?.();
    groupRef.focus?.();
    window.setTimeout(() => {
      groupRef.show?.();
    }, 0);
  };

  const focusLineEditorLedgerInput = () => {
    const ledgerRef = lineEditorLedgerRef.current ?? null;
    if (!ledgerRef) return;
    lineEditorLedgerGroupRef.current?.hide?.();
    ledgerRef.hide?.();
    ledgerRef.focus?.();
    window.setTimeout(() => {
      ledgerRef.show?.();
    }, 0);
  };

  const closePaymentLedgerAutocompleteOverlay = useCallback(() => {
    cashLedgerInputRef.current?.hide?.();
  }, []);

  const closeHeaderAutocompleteOverlays = useCallback(() => {
    closePaymentLedgerAutocompleteOverlay();
    paidByInputRef.current?.hide?.();
  }, [closePaymentLedgerAutocompleteOverlay]);

  const focusPaymentLedgerInput = () => {
    const ref = cashLedgerInputRef.current ?? null;
    if (!ref) return false;
    const input = ref.getInput?.();
    if (input instanceof HTMLInputElement && input.disabled) return false;
    ref.focus?.();
    const shouldOpenPanel = cashLedgerId == null && paymentLedgerOptions.length > 1;
    if (shouldOpenPanel) {
      ref.show?.();
    } else {
      ref.hide?.();
    }
    const focusedInput = ref.getInput?.();
    if (focusedInput instanceof HTMLInputElement) {
      if (typeof focusedInput.setSelectionRange === "function") {
        const length = focusedInput.value?.length ?? 0;
        focusedInput.setSelectionRange(0, length);
      }
      return document.activeElement === focusedInput;
    }
    return false;
  };

  const focusCashLedgerAmountInput = () => {
    const input = cashLedgerAmountInputRef.current ?? null;
    if (!input) return;
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      const length = input.value?.length ?? 0;
      input.setSelectionRange(0, length);
    }
  };

  const focusRefNoInput = (): boolean => {
    const resolveRefNoInput = () => {
      const directRef = refNoInputRef.current;
      if (directRef instanceof HTMLInputElement) {
        return directRef;
      }
      const element = document.getElementById(refNoInputId);
      return element instanceof HTMLInputElement ? element : null;
    };

    const focusInput = () => {
      const input = resolveRefNoInput();
      if (!input || input.disabled) return false;
      input.focus();
      if (typeof input.setSelectionRange === "function") {
        const length = input.value?.length ?? 0;
        input.setSelectionRange(0, length);
      }
      return document.activeElement === input;
    };

    if (focusInput()) return true;
    [60, 140, 260].forEach((delay) => {
      window.setTimeout(focusInput, delay);
    });
    return false;
  };

  const focusChequeInFavourInput = () => {
    const input = chequeInFavourInputRef.current ?? null;
    if (!input) return;
    input.focus();
    if (typeof input.setSelectionRange === "function") {
      const length = input.value?.length ?? 0;
      input.setSelectionRange(0, length);
    }
  };

  const focusPaidByInput = () => {
    closePaymentLedgerAutocompleteOverlay();
    if (hasBillWiseDialogOpen) return false;
    const ref = paidByInputRef.current ?? null;
    const input = ref?.getInput?.() ?? null;
    if (input instanceof HTMLInputElement && !input.disabled) {
      input.focus();
      if (typeof input.setSelectionRange === "function") {
        const length = input.value?.length ?? 0;
        input.setSelectionRange(0, length);
      }
      return document.activeElement === input;
    }
    const fallbackInput = document.getElementById(paidByInputId);
    if (!(fallbackInput instanceof HTMLInputElement) || fallbackInput.disabled)
      return false;
    fallbackInput.focus();
    if (typeof fallbackInput.setSelectionRange === "function") {
      const length = fallbackInput.value?.length ?? 0;
      fallbackInput.setSelectionRange(0, length);
    }
    return document.activeElement === fallbackInput;
  };

  const focusSaveButton = () => {
    const button = document.getElementById(
      saveButtonId
    ) as HTMLButtonElement | null;
    button?.focus();
  };

  const resetVoucherFormState = useCallback(() => {
    lastAutoChequeNoRef.current = "";
    lastAutoReceiptNoRef.current = "";
    lastAutoReceiptBookIdRef.current = null;
    previousReceiptSalesmanIdRef.current = null;
    postSaveRebaselineRef.current = false;
    setIsFormActive(false);
    setEditingId(null);
    setSelectedRow(null);
    setHeaderDrCrFlag(defaultHeaderDrCrFlag);
    setCancelledChecked(false);
    setCashLedgerAmount(null);
    setCashLedgerAmountDraft(undefined);
    setCashLedgerOption(null);
    setVoucherDateError(null);
    setPostingDateError(null);
    setRefDateError(null);
    setReferenceDate2Error(null);
    setFormErrors({});
    setReferenceNo2("");
    setReferenceDate2(null);
    setReasonForIssue("");
    setChequeInFavour("");
    setChequeIssueBookId(null);
    setNarration("");
    setLines([]);
    setSupplementaryHeaderPostingLines([]);
    setFormManagerId(null);
    setFormManagerQuery("");
    setFormSalesmanId(null);
    setFormSalesmanQuery("");
    setBillWiseEnabled(false);
    setBillWiseFullPaid(false);
    setBillWiseShowAdvanceBill(false);
    setBillWiseDebitNote(false);
    setBillWisePartyLedgerGroupId(null);
    setBillWisePartyLedgerId(null);
    setBillWisePartyLedgerOption(null);
    setBillWiseDiscountLedgerId(null);
    setBillWiseDiscountLedgerOption(null);
    setBillWiseDiscountAmount(null);
    setBillWiseChequeReturnLedgerId(null);
    setBillWiseChequeReturnLedgerOption(null);
    setBillWiseChequeReturnCharges(null);
    setBillWiseInvoiceRows([]);
    setBillWiseLineEditor(createBillWiseLineEditorState());
    setBillWiseInvoiceSearchDialogVisible(false);
    setBillWiseInvoiceSearchTerm("");
    setBillWiseInvoiceSearchRows([]);
    setBillWiseInvoiceSearchLoading(false);
    setBillWiseSelectionDialogVisible(false);
    setBillWiseInvoicesLoading(false);
    setSelectedLineKey(null);
    setLineEditorCarryGroupId(null);
    setLineEditorDraft(
      createLineEditorDraft({ drCrFlag: resolveDefaultLineDraftDrCrFlag() })
    );
    setInitialFormSnapshotJson(null);
    setInitialSavePreviewJson(null);
  }, [defaultHeaderDrCrFlag, resolveDefaultLineDraftDrCrFlag]);

  const executeModeSwitch = useCallback(
    (nextMode: PaymentMode) => {
      if (isFormActive) {
        resetVoucherFormState();
      }
      persistPaymentMode(nextMode, profile.storagePrefix);
      navigate(registerRoutePath(nextMode));
    },
    [
      isFormActive,
      navigate,
      profile.storagePrefix,
      registerRoutePath,
      resetVoucherFormState,
    ]
  );

  const changePaymentMode = useCallback(
    (nextMode: PaymentMode) => {
      if (nextMode === paymentMode) return;
      if (!isFormActive || !isFormDirty) {
        executeModeSwitch(nextMode);
        return;
      }

      const nextModeLabel = getVoucherModeConfig(profile, nextMode).title;
      confirmDialog({
        header: `Switch ${modeSwitchLabel}?`,
        message: `You have unsaved changes in this voucher. Switching to ${nextModeLabel} will discard them.`,
        icon: "pi pi-exclamation-triangle",
        rejectLabel: "Stay",
        acceptLabel: "Switch Mode",
        acceptClassName: "p-button-danger",
        accept: () => executeModeSwitch(nextMode),
        reject: () => undefined,
      });
    },
    [
      executeModeSwitch,
      isFormActive,
      isFormDirty,
      modeSwitchLabel,
      paymentMode,
      profile,
    ]
  );
  const executeVoucherProfileSwitch = useCallback(
    (nextProfileKey: VoucherKey) => {
      if (nextProfileKey === profile.key) return;
      const nextProfile = getVoucherProfile(nextProfileKey);
      const storedMode = getStoredPaymentMode(nextProfile.storagePrefix);
      const preferredMode = isVoucherModeSupported(nextProfile, paymentMode)
        ? paymentMode
        : storedMode;
      const nextMode = resolveVoucherMode(nextProfile, preferredMode);
      if (isFormActive) {
        resetVoucherFormState();
      }
      persistPaymentMode(nextMode, nextProfile.storagePrefix);
      navigate(
        `/apps/accounts/vouchers/voucher/${nextProfile.key}/${nextMode}`
      );
    },
    [
      isFormActive,
      navigate,
      paymentMode,
      profile.key,
      resetVoucherFormState,
    ]
  );

  const changeVoucherProfile = useCallback(
    (nextProfileKey: VoucherKey) => {
      if (nextProfileKey === profile.key) return;
      if (!isFormActive || !isFormDirty) {
        executeVoucherProfileSwitch(nextProfileKey);
        return;
      }

      const nextProfile = getVoucherProfile(nextProfileKey);
      confirmDialog({
        header: "Switch Voucher Type?",
        message: `You have unsaved changes in this voucher. Switching to ${nextProfile.label} will discard them.`,
        icon: "pi pi-exclamation-triangle",
        rejectLabel: "Stay",
        acceptLabel: "Switch Type",
        acceptClassName: "p-button-danger",
        accept: () => executeVoucherProfileSwitch(nextProfileKey),
        reject: () => undefined,
      });
    },
    [executeVoucherProfileSwitch, isFormActive, isFormDirty, profile.key]
  );

  useEffect(() => {
    if (!paymentModeInitRef.current) {
      paymentModeInitRef.current = true;
      return;
    }
    setIsFormActive(false);
    setEditingId(null);
    setSelectedRow(null);
    setHeaderDrCrFlag(defaultHeaderDrCrFlag);
    setCashLedgerId(null);
    setCashLedgerAmount(null);
    setCashLedgerOption(null);
    setPaymentLedgerGroupId(null);
    setSupplementaryHeaderPostingLines([]);
    setSelectedLineKey(null);
    setLineEditorCarryGroupId(null);
    setLineEditorDraft(
      createLineEditorDraft({ drCrFlag: modeResetLineDraftDrCrFlag })
    );
    setFormErrors({});
    setVoucherDateError(null);
    setPostingDateError(null);
    setRefDateError(null);
    setReferenceDate2Error(null);
    setReferenceNo2("");
    setReferenceDate2(null);
    setReasonForIssue("");
    setInitialFormSnapshotJson(null);
    setInitialSavePreviewJson(null);
  }, [defaultHeaderDrCrFlag, modeResetLineDraftDrCrFlag, paymentMode]);

  useEffect(() => {
    if (previousPaymentModeRef.current === paymentMode) return;
    previousPaymentModeRef.current = paymentMode;
    const { fromDateText, toDateText } = resetRegisterFiltersForContextSwitch();
    setAppliedVariables({
      ...registerVariables,
      mode: paymentMode,
      ledgerGroupTypeCodes: defaultLedgerGroupTypeCodes,
      voucherTypeIds: profileVoucherTypeIds,
      search: null,
      fromDate: fromDateText,
      toDate: toDateText,
      cancelled: 0,
      reconciled: null,
      offset: 0,
      pageAfterVoucherDate: null,
      pageAfterVoucherNumber: null,
      pageAfterVoucherId: null,
      pageBeforeVoucherDate: null,
      pageBeforeVoucherNumber: null,
      pageBeforeVoucherId: null,
      includeSummary: true,
      totalCountHint: null,
    });
  }, [
    defaultLedgerGroupTypeCodes,
    paymentMode,
    profileVoucherTypeIds,
    registerVariables,
    resetRegisterFiltersForContextSwitch,
  ]);

  useEffect(() => {
    if (previousProfileKeyRef.current === profile.key) return;
    previousProfileKeyRef.current = profile.key;
    setSelectedRow(null);
    const { fromDateText, toDateText } = resetRegisterFiltersForContextSwitch();
    setAppliedVariables({
      ...registerVariables,
      mode: paymentMode,
      ledgerGroupTypeCodes: defaultLedgerGroupTypeCodes,
      voucherTypeIds: profileVoucherTypeIds,
      search: null,
      fromDate: fromDateText,
      toDate: toDateText,
      cancelled: 0,
      reconciled: null,
      offset: 0,
      pageAfterVoucherDate: null,
      pageAfterVoucherNumber: null,
      pageAfterVoucherId: null,
      pageBeforeVoucherDate: null,
      pageBeforeVoucherNumber: null,
      pageBeforeVoucherId: null,
      includeSummary: true,
      totalCountHint: null,
    });
  }, [
    defaultLedgerGroupTypeCodes,
    paymentMode,
    profile.key,
    profileVoucherTypeIds,
    registerVariables,
    resetRegisterFiltersForContextSwitch,
  ]);

  useEffect(() => {
    if (!resolvedPaymentLedgerGroupId) return;
    const nextGroupId = Number(resolvedPaymentLedgerGroupId);
    if (Number(paymentLedgerGroupId) === nextGroupId) return;
    setPaymentLedgerGroupId(nextGroupId);
    if (isFormActive && editingId != null) {
      scheduleFormSnapshotCapture();
      return;
    }
    if (canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    editingId,
    isFormActive,
    paymentLedgerGroupId,
    resolvedPaymentLedgerGroupId,
    scheduleFormSnapshotCapture,
  ]);
  useEffect(() => {
    if (resolvedPaymentLedgerGroupId != null) return;
    const ledgerId = cashLedgerId != null ? Number(cashLedgerId) : null;
    if (ledgerId == null || !Number.isFinite(ledgerId) || ledgerId <= 0) return;
    const nextLedgerGroupId = ledgerGroupIdByLedgerId.get(ledgerId);
    if (nextLedgerGroupId == null) return;
    if (
      paymentLedgerGroupId != null &&
      Number(paymentLedgerGroupId) === Number(nextLedgerGroupId)
    )
      return;
    setPaymentLedgerGroupId(Number(nextLedgerGroupId));
    if (isFormActive && editingId != null && !isFormDirty) {
      scheduleFormSnapshotCapture();
      return;
    }
    if (canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    cashLedgerId,
    editingId,
    isFormActive,
    isFormDirty,
    ledgerGroupIdByLedgerId,
    paymentLedgerGroupId,
    resolvedPaymentLedgerGroupId,
    scheduleFormSnapshotCapture,
  ]);

  useEffect(() => {
    if (showPaymentVia) {
      const selectedChequeBookId = toPositiveId(chequeIssueBookId);
      const shouldForceChequePaymentVia =
        selectedChequeBookId != null &&
        chequePaymentViaId != null &&
        paymentViaId !== chequePaymentViaId;
      if (shouldForceChequePaymentVia) {
        setPaymentViaId(chequePaymentViaId);
        if (canRebaselineAutoDefaults) {
          scheduleFormSnapshotCapture();
        }
        return;
      }
      if (
        editingId == null &&
        paymentViaId == null &&
        chequePaymentViaId != null
      ) {
        setPaymentViaId(chequePaymentViaId);
        if (canRebaselineAutoDefaults) {
          scheduleFormSnapshotCapture();
        }
      }
      return;
    }
    if (paymentViaId != null) {
      setPaymentViaId(null);
      if (canRebaselineAutoDefaults) {
        scheduleFormSnapshotCapture();
      }
    }
  }, [
    canRebaselineAutoDefaults,
    chequeIssueBookId,
    chequePaymentViaId,
    editingId,
    paymentViaId,
    scheduleFormSnapshotCapture,
    showPaymentVia,
  ]);

  useEffect(() => {
    if (editingId != null) return;
    if (isChequePayment || isReceiptCashFlow) return;
    lastAutoChequeNoRef.current = "";
    lastAutoReceiptNoRef.current = "";
    lastAutoReceiptBookIdRef.current = null;
    previousReceiptSalesmanIdRef.current = null;
    if (chequeIssueBookId == null) return;
    setChequeIssueBookId(null);
    if (canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    chequeIssueBookId,
    editingId,
    isChequePayment,
    isReceiptCashFlow,
    scheduleFormSnapshotCapture,
  ]);

  useEffect(() => {
    if (isSalesmanReceiptAutoNumberingEnabled) return;
    lastAutoReceiptNoRef.current = "";
    lastAutoReceiptBookIdRef.current = null;
  }, [isSalesmanReceiptAutoNumberingEnabled]);

  useEffect(() => {
    if (!isReceiptCashFlow || !isFormActive || editingId != null) {
      previousReceiptSalesmanIdRef.current = toPositiveId(formSalesmanId);
      return;
    }
    const currentSalesmanId = toPositiveId(formSalesmanId);
    const previousSalesmanId = previousReceiptSalesmanIdRef.current;
    previousReceiptSalesmanIdRef.current = currentSalesmanId;
    if (previousSalesmanId === currentSalesmanId) return;

    const currentReceiptNo = refNo.trim();
    const wasAutoFilled =
      currentReceiptNo.length > 0 &&
      currentReceiptNo === lastAutoReceiptNoRef.current;

    lastAutoReceiptNoRef.current = "";
    lastAutoReceiptBookIdRef.current = null;

    if (chequeIssueBookId != null) {
      setChequeIssueBookId(null);
    }
    if (currentReceiptNo.length > 0 && (wasAutoFilled || previousSalesmanId != null)) {
      setRefNo("");
    }
  }, [
    chequeIssueBookId,
    editingId,
    formSalesmanId,
    isFormActive,
    isReceiptCashFlow,
    refNo,
  ]);

  useEffect(() => {
    if (!isReceiptCashFlow) return;
    if (!shouldLoadSalesmanIssueBooks) {
      if (chequeIssueBookId != null) {
        setChequeIssueBookId(null);
        if (canRebaselineAutoDefaults) {
          scheduleFormSnapshotCapture();
        }
      }
      return;
    }
    const selectedBookId = toPositiveId(chequeIssueBookId);
    const hasValidSelection =
      selectedBookId != null && receiptIssueBookOptionMap.has(selectedBookId);
    if (hasValidSelection) return;

    if (selectedReceiptIssueBookByRefNo) {
      const refMatchedBookId = Number(
        selectedReceiptIssueBookByRefNo.moneyReceiptIssueBookId
      );
      const isRefMatchedBookVisible =
        Number.isFinite(refMatchedBookId) &&
        receiptIssueBookOptionMap.has(refMatchedBookId);
      if (editingId != null || isRefMatchedBookVisible) {
        setChequeIssueBookId(refMatchedBookId);
        if (canRebaselineAutoDefaults) {
          scheduleFormSnapshotCapture();
        }
        return;
      }
    }

    if (editingId != null) return;
    const firstBook = receiptIssueBookOptions[0] ?? null;
    if (!firstBook) {
      if (chequeIssueBookId != null) {
        setChequeIssueBookId(null);
        if (canRebaselineAutoDefaults) {
          scheduleFormSnapshotCapture();
        }
      }
      return;
    }
    setChequeIssueBookId(Number(firstBook.value));
    if (canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    chequeIssueBookId,
    editingId,
    isReceiptCashFlow,
    receiptIssueBookOptionMap,
    receiptIssueBookOptions,
    scheduleFormSnapshotCapture,
    selectedReceiptIssueBookByRefNo,
    shouldLoadSalesmanIssueBooks,
  ]);

  useEffect(() => {
    if (!isChequePayment) return;
    if (!cashLedgerId) {
      if (editingId == null && chequeIssueBookId != null) {
        setChequeIssueBookId(null);
      }
      return;
    }
    if (editingId != null) return;
    const selectedBookId =
      chequeIssueBookId != null ? Number(chequeIssueBookId) : null;
    const hasValidSelection =
      selectedBookId != null &&
      Number.isFinite(selectedBookId) &&
      chequeBookOptionMap.has(selectedBookId);
    if (hasValidSelection) return;
    const firstBook = chequeBookOptions[0] ?? null;
    if (!firstBook) {
      if (chequeIssueBookId != null) {
        setChequeIssueBookId(null);
      }
      return;
    }
    setChequeIssueBookId(Number(firstBook.value));
    if (canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    cashLedgerId,
    chequeBookOptionMap,
    chequeBookOptions,
    chequeIssueBookId,
    editingId,
    isChequePayment,
    scheduleFormSnapshotCapture,
  ]);

  useEffect(() => {
    if (!shouldFetchNextChequeNo) {
      return;
    }
    const selectedBookId =
      chequeIssueBookId != null ? Number(chequeIssueBookId) : null;
    if (selectedBookId == null || !Number.isFinite(selectedBookId)) return;
    const selectedBook = chequeBookOptionMap.get(selectedBookId) ?? null;
    if (!selectedBook) return;

    const suggestedChequeNo = String(
      nextChequeNoData?.nextChequeNumberForBook ?? ""
    ).trim();
    if (!suggestedChequeNo) return;

    const currentChequeNoText = refNo.trim();
    const currentChequeNo = normalizeChequeNumber(currentChequeNoText);
    const currentIsInRange =
      currentChequeNo != null &&
      isChequeNumberInRange(currentChequeNo, selectedBook);
    const currentWasAutoFilled =
      currentChequeNoText.length > 0 &&
      currentChequeNoText === lastAutoChequeNoRef.current;
    const shouldApplySuggestion =
      currentChequeNoText.length === 0 ||
      currentWasAutoFilled ||
      !currentIsInRange;

    if (!shouldApplySuggestion || currentChequeNoText === suggestedChequeNo)
      return;

    setRefNo(suggestedChequeNo);
    lastAutoChequeNoRef.current = suggestedChequeNo;
    if (canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    chequeBookOptionMap,
    chequeIssueBookId,
    isChequeNumberInRange,
    nextChequeNoData?.nextChequeNumberForBook,
    normalizeChequeNumber,
    refNo,
    scheduleFormSnapshotCapture,
    shouldFetchNextChequeNo,
  ]);

  useEffect(() => {
    if (!isSalesmanReceiptAutoNumberingEnabled) return;
    const selectedBookId = toPositiveId(chequeIssueBookId);
    if (selectedBookId == null) {
      lastAutoReceiptBookIdRef.current = null;
      return;
    }
    const selectedIssueBook = salesmanIssueBookMap.get(selectedBookId) ?? null;
    if (!selectedIssueBook) return;
    const suggestedReceiptNo =
      resolveNextReceiptNoFromIssuedBooks(
        [selectedIssueBook],
        salesmanIssueEntries,
        selectedReceiptIssueUsageStartDateKey
      )?.trim() ?? "";
    if (!suggestedReceiptNo) return;

    const currentReceiptNo = refNo.trim();
    const currentReceiptNoValue = parseReceiptNoValue(currentReceiptNo);
    const currentIsInRange =
      currentReceiptNoValue != null &&
      isReceiptNumberInRange(currentReceiptNoValue, selectedIssueBook);
    const wasAutoFilled =
      currentReceiptNo.length > 0 &&
      currentReceiptNo === lastAutoReceiptNoRef.current;
    const selectedBookChanged = lastAutoReceiptBookIdRef.current !== selectedBookId;
    const shouldApplySuggestion =
      currentReceiptNo.length === 0 ||
      wasAutoFilled ||
      selectedBookChanged ||
      !currentIsInRange;
    if (!shouldApplySuggestion) return;

    if (currentReceiptNo !== suggestedReceiptNo) {
      setRefNo(suggestedReceiptNo);
    }
    lastAutoReceiptNoRef.current = suggestedReceiptNo;
    lastAutoReceiptBookIdRef.current = selectedBookId;
    if (currentReceiptNo !== suggestedReceiptNo && canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    chequeIssueBookId,
    isSalesmanReceiptAutoNumberingEnabled,
    refNo,
    scheduleFormSnapshotCapture,
    salesmanIssueBookMap,
    salesmanIssueEntries,
    selectedReceiptIssueUsageStartDateKey,
    setRefNo,
  ]);

  useEffect(() => {
    if (!modeConfig.defaultPrimaryLedgerFromAgency) return;
    if (cashLedgerId != null) return;
    const defaultLedgerId = agencyOptions?.defaultExpenditureLedgerId ?? null;
    if (defaultLedgerId != null) {
      setCashLedgerId(defaultLedgerId);
      if (canRebaselineAutoDefaults) {
        scheduleFormSnapshotCapture();
      }
    }
  }, [
    agencyOptions,
    canRebaselineAutoDefaults,
    cashLedgerId,
    modeConfig.defaultPrimaryLedgerFromAgency,
    scheduleFormSnapshotCapture,
  ]);

  useEffect(() => {
    if (!isFormActive || editingId != null) return;
    if (profile.key !== "receipt" || paymentMode !== "cash") return;
    if (cashLedgerId != null) return;
    if (paymentLedgerOptionsLoading) return;
    if (paymentLedgerOptions.length === 0) return;

    const normalizeLedgerLabel = (value?: string | null) =>
      String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const preferredCashOption =
      paymentLedgerOptions.find((option) => {
        const normalized = normalizeLedgerLabel(option.label);
        return normalized === "cashac" || normalized === "cashaccount";
      }) ??
      paymentLedgerOptions.find((option) => {
        const normalized = normalizeLedgerLabel(option.label);
        return (
          normalized.startsWith("cash") ||
          normalized.includes("cashac") ||
          normalized.includes("cashaccount")
        );
      }) ??
      paymentLedgerOptions[0] ??
      null;

    if (!preferredCashOption) return;
    updatePrimaryLedger(Number(preferredCashOption.value), preferredCashOption);
    clearFormError("cashLedgerId");
    if (canRebaselineAutoDefaults) {
      scheduleFormSnapshotCapture();
    }
  }, [
    canRebaselineAutoDefaults,
    cashLedgerId,
    clearFormError,
    editingId,
    isFormActive,
    paymentLedgerOptions,
    paymentLedgerOptionsLoading,
    paymentMode,
    profile.key,
    scheduleFormSnapshotCapture,
    updatePrimaryLedger,
  ]);

  useEffect(() => {
    if (!isFormActive || editingId) return;
    if (!canFetchNextNo) return;
    refetchNextNo(nextVoucherVariables)
      .then((next) => {
        setVoucherNo(next.data?.nextVoucherNumber ?? "");
        if (canRebaselineAutoDefaults) {
          scheduleFormSnapshotCapture();
        }
      })
      .catch(() => undefined);
  }, [
    canFetchNextNo,
    canRebaselineAutoDefaults,
    editingId,
    isFormActive,
    nextVoucherVariables,
    refetchNextNo,
    scheduleFormSnapshotCapture,
  ]);

  useEffect(() => {
    if (!isFormActive || !editingId) return;
    refetchEdit({ voucherId: editingId }).catch(() => undefined);
  }, [editingId, isFormActive, refetchEdit]);

  useEffect(() => {
    if (!isFormActive || editingId == null) {
      hydratedEditVoucherDataKeyRef.current = null;
    }
  }, [editingId, isFormActive]);

  useEffect(() => {
    if (!isFormActive || !editingId) return;
    const header = editData?.voucherEntryById?.header;
    if (!header) return;
    const headerVoucherId = toPositiveId(header.voucherId);
    if (
      headerVoucherId != null &&
      !hasSameNumericId(headerVoucherId, editingId)
    )
      return;
    const voucherLines = editData?.voucherEntryById?.lines ?? [];
    const fallbackRow = hasSameNumericId(selectedRow?.voucherId, editingId)
      ? selectedRow
      : rows.find((row) => hasSameNumericId(row.voucherId, editingId)) ?? null;
    const fallbackRefNo = fallbackRow?.refNo?.trim() ?? "";
    const fallbackRefDate = fallbackRow?.refDate ?? null;
    const headerRefNo = header.refNo?.trim() ?? "";
    const headerRefDate = header.refDate?.trim() ?? "";
    const parsedHeaderRefDate = parseDateText(headerRefDate);
    const parsedFallbackRefDate = parseDateText(fallbackRefDate);
    const resolvedRefNo = headerRefNo || fallbackRefNo || "";
    const resolvedRefDate = parsedHeaderRefDate ?? parsedFallbackRefDate;
    const fallbackReferenceNo2 = fallbackRow?.referenceNumber2?.trim() ?? "";
    const fallbackReferenceDate2 = fallbackRow?.referenceDate2 ?? null;
    const headerReferenceNo2 = header.referenceNumber2?.trim() ?? "";
    const headerReferenceDate2 = header.referenceDate2?.trim() ?? "";
    const parsedHeaderReferenceDate2 = parseDateText(headerReferenceDate2);
    const parsedFallbackReferenceDate2 = parseDateText(fallbackReferenceDate2);
    const resolvedReferenceNo2 =
      headerReferenceNo2 || fallbackReferenceNo2 || "";
    const resolvedReferenceDate2 =
      parsedHeaderReferenceDate2 ?? parsedFallbackReferenceDate2;
    const resolvedReasonForIssue =
      header.reasonForIssueText?.trim() ||
      fallbackRow?.reasonForIssueText?.trim() ||
      "";
    const voucherBillDetails = editData?.voucherEntryById?.billDetails ?? [];
    const hydrationDataKey = JSON.stringify({
      voucherId: headerVoucherId ?? editingId,
      voucherDate: header.voucherDate ?? null,
      postingDate: header.postingDate ?? null,
      refNo: header.refNo ?? null,
      refDate: header.refDate ?? null,
      resolvedRefNo,
      resolvedRefDateText: toDateText(resolvedRefDate),
      referenceNumber2: header.referenceNumber2 ?? null,
      referenceDate2: header.referenceDate2 ?? null,
      resolvedReferenceNo2,
      resolvedReferenceDate2Text: toDateText(resolvedReferenceDate2),
      reasonForIssueText: header.reasonForIssueText ?? null,
      resolvedReasonForIssue,
      fallbackVoucherId: fallbackRow?.voucherId ?? null,
      paymentViaId: toPositiveId(header.paymentViaId),
      chequeIssueBookId: toPositiveId(header.chequeIssueBookId),
      primaryLedgerId: toPositiveId(header.primaryLedgerId),
      billDetails: voucherBillDetails.map((detail: any) => ({
        saleInvoiceId: toPositiveId(detail?.saleInvoiceId),
        appliedAmount:
          detail?.appliedAmount != null ? Number(detail.appliedAmount) : null,
        isDebitNoteFlag:
          detail?.isDebitNoteFlag != null
            ? Number(detail.isDebitNoteFlag)
            : null,
      })),
      lines: voucherLines.map((line: any) => ({
        ledgerId: toPositiveId(line?.ledgerId),
        amount: line?.amount != null ? Number(line.amount) : null,
        drCrFlag: line?.drCrFlag != null ? Number(line.drCrFlag) : null,
      })),
    });
    if (hydratedEditVoucherDataKeyRef.current === hydrationDataKey) return;
    setVoucherNo(header.voucherNumber ?? "");
    setVoucherDate(
      header.voucherDate
        ? new Date(`${header.voucherDate}T00:00:00`)
        : new Date()
    );
    setPostingDate(
      header.postingDate
        ? new Date(`${header.postingDate}T00:00:00`)
        : new Date()
    );
    const debitGroupCandidates = [
      header.debitLedgerGroupName,
      fallbackRow?.debitLedgerGroupName,
    ]
      .flatMap((value) => String(value ?? "").split(/\r?\n|,/))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const fallbackDebitGroupId = (() => {
      const normalizedCandidates = debitGroupCandidates
        .map((name) => normalizeTextValue(name))
        .filter(Boolean);
      if (!normalizedCandidates.length) return null;
      const exactMatch = ledgerGroupOptions.find((option) => {
        const label = normalizeTextValue(option.label ?? option.name ?? "");
        return normalizedCandidates.includes(label);
      });
      if (exactMatch) return Number(exactMatch.value);
      const relaxedMatch = ledgerGroupOptions.find((option) => {
        const label = normalizeTextValue(option.label ?? option.name ?? "");
        return normalizedCandidates.some(
          (candidate) => label.includes(candidate) || candidate.includes(label)
        );
      });
      return relaxedMatch ? Number(relaxedMatch.value) : null;
    })();
    const fallbackCreditLedgerName = (() => {
      const primaryFromRow = (fallbackRow?.primaryLedgerName ?? "").trim();
      if (primaryFromRow) return primaryFromRow;
      const creditFromRow = (fallbackRow?.creditLedgerName ?? "").trim();
      if (creditFromRow) return creditFromRow;
      const primaryFromHeader = (header.primaryLedgerName ?? "").trim();
      if (primaryFromHeader) return primaryFromHeader;
      const firstFromList = (fallbackRow?.creditLedgerNames ?? "")
        .split(/\r?\n/)
        .map((name) => name.trim())
        .find(Boolean);
      return firstFromList ?? "";
    })();
    const resolvedManagerSelection = resolveHydratedManagerSelection(
      header.managerId,
      header.managerName ?? fallbackRow?.managerName
    );
    setRefNo(resolvedRefNo);
    setRefDate(resolvedRefDate);
    setReferenceNo2(resolvedReferenceNo2);
    setReferenceDate2(resolvedReferenceDate2);
    setReferenceDate2Error(null);
    setReasonForIssue(resolvedReasonForIssue);
    setChequeInFavour(header.chequeInFavourText ?? "");
    setChequeIssueBookId(toPositiveId(header.chequeIssueBookId));
    setPaymentViaId(toPositiveId(header.paymentViaId));
    setNarration(header.narration ?? "");
    setFormManagerId(resolvedManagerSelection.managerId);
    setFormManagerQuery(resolvedManagerSelection.managerQuery);
    setCancelledChecked(Number(header.isCancelledFlag) === 1);
    setCashLedgerAmount(null);
    setCashLedgerAmountDraft(undefined);
    setCashLedgerOption(null);
    setPaymentLedgerGroupId(
      resolvedPaymentLedgerGroupId != null
        ? Number(resolvedPaymentLedgerGroupId)
        : null
    );

    const primaryLedgerId =
      header.primaryLedgerId != null ? Number(header.primaryLedgerId) : null;
    const usesTwoFlag = voucherLines.some(
      (line: any) => Number(line.drCrFlag) === 2
    );
    const normalizeDrCrFlag = (drCrFlag: number) => {
      if (!usesTwoFlag) return drCrFlag;
      if (drCrFlag === 1) return 0;
      if (drCrFlag === 2) return 1;
      return drCrFlag;
    };
    const splitLinesByFlags = (entryFlag: number, headerFlag: number) => {
      let headerLineCandidate: any = null;
      let headerLineIndex = -1;
      for (let index = 0; index < voucherLines.length; index += 1) {
        const line = voucherLines[index];
        if (normalizeDrCrFlag(Number(line?.drCrFlag ?? -1)) !== headerFlag)
          continue;
        headerLineCandidate = line;
        headerLineIndex = index;
        break;
      }
      const headerLedgerId =
        headerLineCandidate?.ledgerId != null
          ? Number(headerLineCandidate.ledgerId)
          : null;
      const entryLines = voucherLines.filter((line: any) => {
        const normalizedFlag = normalizeDrCrFlag(Number(line?.drCrFlag ?? -1));
        if (normalizedFlag !== entryFlag) return false;
        const ledgerId = line?.ledgerId != null ? Number(line.ledgerId) : null;
        if (
          headerLedgerId != null &&
          ledgerId != null &&
          ledgerId === headerLedgerId
        )
          return false;
        return true;
      });
      return {
        headerLine: headerLineCandidate ?? null,
        headerLineIndex,
        entryLines,
      };
    };

    let resolvedEntryFlag = lineEntryDrCrFlag;
    let resolvedHeaderFlag = defaultHeaderDrCrFlag;
    let lineSplit = splitLinesByFlags(resolvedEntryFlag, resolvedHeaderFlag);
    if (lineSplit.entryLines.length === 0 && voucherLines.length > 1) {
      const alternateSplit = splitLinesByFlags(
        resolvedHeaderFlag,
        resolvedEntryFlag
      );
      if (alternateSplit.entryLines.length > 0) {
        resolvedEntryFlag = resolvedHeaderFlag;
        resolvedHeaderFlag = lineEntryDrCrFlag;
        lineSplit = alternateSplit;
      }
    }
    if (
      allowLineDrCrSelection &&
      lineSplit.headerLineIndex < 0 &&
      primaryLedgerId != null
    ) {
      const primaryHeaderIndex = voucherLines.findIndex(
        (line: any) => Number(line?.ledgerId ?? 0) === Number(primaryLedgerId)
      );
      if (primaryHeaderIndex >= 0) {
        const primaryHeaderLine = voucherLines[primaryHeaderIndex];
        lineSplit = {
          ...lineSplit,
          headerLine: primaryHeaderLine,
          headerLineIndex: primaryHeaderIndex,
        };
        resolvedHeaderFlag = normalizeLineDrCrFlag(
          normalizeDrCrFlag(
            Number(primaryHeaderLine?.drCrFlag ?? resolvedHeaderFlag)
          )
        );
      }
    }
    if (allowLineDrCrSelection) {
      const headerLedgerId =
        lineSplit.headerLine?.ledgerId != null
          ? Number(lineSplit.headerLine.ledgerId)
          : primaryLedgerId != null
          ? Number(primaryLedgerId)
          : null;
      const mixedEntryLines = voucherLines.filter(
        (line: any, index: number) => {
          if (index === lineSplit.headerLineIndex) return false;
          const ledgerId =
            line?.ledgerId != null ? Number(line.ledgerId) : null;
          if (
            headerLedgerId != null &&
            ledgerId != null &&
            ledgerId === headerLedgerId
          )
            return false;
          return true;
        }
      );
      lineSplit = {
        ...lineSplit,
        entryLines: mixedEntryLines,
      };
    }
    setHeaderDrCrFlag(
      allowHeaderDrCrSelection
        ? normalizeLineDrCrFlag(resolvedHeaderFlag)
        : defaultHeaderDrCrFlag
    );

    const debitLines = lineSplit.entryLines;
    const creditLine = lineSplit.headerLine;
    const hydratedSupplementaryHeaderPostingLines: SupplementaryHeaderPostingLine[] =
      allowLineDrCrSelection
        ? []
        : voucherLines
            .map((line: any, index: number) => ({
              line,
              index,
              normalizedFlag: normalizeDrCrFlag(Number(line?.drCrFlag ?? -1)),
            }))
            .filter(
              (entry: {
                line: any;
                index: number;
                normalizedFlag: number | null;
              }) =>
                entry.normalizedFlag === resolvedHeaderFlag &&
                entry.index !== lineSplit.headerLineIndex
            )
            .map(
              (entry: {
                line: any;
                index: number;
                normalizedFlag: number | null;
              }) => {
                const ledgerId =
                  entry.line?.ledgerId != null
                    ? Number(entry.line.ledgerId)
                    : null;
                const amount =
                  entry.line?.amount != null ? Number(entry.line.amount) : NaN;
                return {
                  ledgerId,
                  amount,
                  drCrFlag: entry.normalizedFlag,
                  narrationText:
                    typeof entry.line?.narrationText === "string"
                      ? entry.line.narrationText
                      : null,
                  ledgerName:
                    typeof entry.line?.ledgerName === "string"
                      ? entry.line.ledgerName.trim()
                      : null,
                  ledgerGroupName:
                    typeof entry.line?.ledgerGroupName === "string"
                      ? entry.line.ledgerGroupName.trim()
                      : null,
                };
              }
            )
            .filter(
              (entry: {
                ledgerId: number | null;
                amount: number;
                drCrFlag: number | null;
                narrationText: string | null;
                ledgerName: string | null;
                ledgerGroupName: string | null;
              }): entry is SupplementaryHeaderPostingLine =>
                entry.ledgerId != null &&
                Number.isFinite(entry.amount) &&
                entry.amount > 0
            );
    setSupplementaryHeaderPostingLines(hydratedSupplementaryHeaderPostingLines);
    const fallbackNamesSource =
      selectedRow?.debitLedgerNames ??
      rows.find((row) => hasSameNumericId(row.voucherId, editingId))
        ?.debitLedgerNames ??
      "";
    const fallbackNames = fallbackNamesSource
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    const fallbackAmountsSource =
      selectedRow?.debitLedgerAmounts ??
      rows.find((row) => hasSameNumericId(row.voucherId, editingId))
        ?.debitLedgerAmounts ??
      "";
    const fallbackAmounts = fallbackAmountsSource
      .split(/\r?\n/)
      .map((value) =>
        parseInputNumber(
          String(value ?? "")
            .replace(/,/g, "")
            .trim()
        )
      )
      .map((value) => (typeof value === "number" ? value : null));

    const fallbackDisplayLines = Array.isArray(
      (fallbackRow as any)?.ledgerDrLinesDisplay
    )
      ? ((fallbackRow as any).ledgerDrLinesDisplay as Array<{
          name?: string | null;
          amount?: string | null;
        }>)
      : [];
    const expectedDebitEntriesFromDisplay = fallbackDisplayLines
      .map((line) => {
        const parsedAmount = parseInputNumber(
          String(line?.amount ?? "")
            .replace(/,/g, "")
            .trim()
        );
        return {
          name: normalizeTextValue(line?.name ?? ""),
          amount:
            typeof parsedAmount === "number" ? Number(parsedAmount) : null,
        };
      })
      .filter((entry) => entry.name || entry.amount != null);
    const expectedDebitEntriesFromRaw = fallbackNames.map((name, index) => ({
      name: normalizeTextValue(name),
      amount:
        fallbackAmounts[index] != null ? Number(fallbackAmounts[index]) : null,
    }));
    const expectedDebitEntries =
      expectedDebitEntriesFromDisplay.length > 0
        ? expectedDebitEntriesFromDisplay
        : expectedDebitEntriesFromRaw;

    let resolvedDebitLines = debitLines;
    if (
      !allowLineDrCrSelection &&
      expectedDebitEntries.length > 0 &&
      debitLines.length > expectedDebitEntries.length
    ) {
      const usedIndexes = new Set<number>();
      const matched: any[] = [];

      expectedDebitEntries.forEach((entry) => {
        let matchedIndex = -1;

        if (entry.name) {
          matchedIndex = debitLines.findIndex((line: any, index: number) => {
            if (usedIndexes.has(index)) return false;
            const lineName = normalizeTextValue((line.ledgerName ?? "").trim());
            return lineName === entry.name;
          });
        }

        if (matchedIndex < 0 && entry.amount != null) {
          matchedIndex = debitLines.findIndex((line: any, index: number) => {
            if (usedIndexes.has(index)) return false;
            const lineAmount = line.amount != null ? Number(line.amount) : NaN;
            if (!Number.isFinite(lineAmount)) return false;
            return Math.abs(lineAmount - Number(entry.amount)) < 0.01;
          });
        }

        if (matchedIndex >= 0) {
          usedIndexes.add(matchedIndex);
          matched.push(debitLines[matchedIndex]);
        }
      });

      if (matched.length > 0) {
        resolvedDebitLines = matched;
      }
    }

    const mappedLines = resolvedDebitLines.map((line: any, index: number) => {
      const ledgerId = line.ledgerId != null ? Number(line.ledgerId) : null;
      const option =
        ledgerId != null ? paymentAgainstOptionMap.get(ledgerId) ?? null : null;
      const parsedLineLedgerGroupId =
        line.ledgerGroupId != null ? Number(line.ledgerGroupId) : null;
      const parsedLineDrCrFlag = normalizeLineDrCrFlag(line.drCrFlag);
      const lineLedgerGroupId =
        parsedLineLedgerGroupId != null &&
        Number.isFinite(parsedLineLedgerGroupId)
          ? parsedLineLedgerGroupId
          : null;
      const lineLedgerName =
        typeof line.ledgerName === "string" ? line.ledgerName.trim() : "";
      return createDebitLine({
        ledgerGroupId: lineLedgerGroupId ?? fallbackDebitGroupId,
        ledgerId,
        ledgerOption: option,
        drCrFlag: allowLineDrCrSelection
          ? parsedLineDrCrFlag
          : lineEntryDrCrFlag,
        amount: line.amount != null ? Number(line.amount) : null,
        label: lineLedgerName || fallbackNames[index] || option?.label || null,
      });
    });
    setLines(mappedLines);
    setSelectedLineKey(null);
    setLineEditorCarryGroupId(null);
    setLineEditorDraft(
      createLineEditorDraft({ drCrFlag: resolveDefaultLineDraftDrCrFlag() })
    );
    const creditLedgerId =
      (creditLine?.ledgerId != null ? Number(creditLine.ledgerId) : null) ??
      primaryLedgerId;
    if (creditLedgerId != null) {
      setCashLedgerId(creditLedgerId);
      setCashLedgerOption({
        value: creditLedgerId,
        label: fallbackCreditLedgerName || `Ledger ${creditLedgerId}`,
        address: null,
      });
    } else {
      setCashLedgerId(null);
      setCashLedgerOption(null);
    }
    if (
      header.totalNetAmount != null &&
      Number.isFinite(Number(header.totalNetAmount))
    ) {
      setCashLedgerAmount(Number(header.totalNetAmount));
    } else if (creditLine?.amount != null) {
      setCashLedgerAmount(Number(creditLine.amount));
    } else {
      setCashLedgerAmount(
        fallbackRow?.totalNetAmount != null
          ? Number(fallbackRow.totalNetAmount)
          : null
      );
    }

    const hydratedBillWiseRows: BillWiseInvoiceRow[] = (
      voucherBillDetails as Array<any>
    )
      .map((detail) => {
        const saleInvoiceId = toPositiveId(detail?.saleInvoiceId);
        if (saleInvoiceId == null) return null;
        const appliedAmount = Number(detail?.appliedAmount ?? 0);
        return {
          saleInvoiceId,
          invoiceNumber: String(detail?.invoiceNumber ?? saleInvoiceId),
          invoiceDate: detail?.invoiceDate ?? null,
          dueAmount: Number.isFinite(appliedAmount) ? appliedAmount : 0,
          selected: Number.isFinite(appliedAmount) && appliedAmount > 0,
          appliedAmount:
            Number.isFinite(appliedAmount) && appliedAmount > 0
              ? appliedAmount
              : null,
          isDebitNote: Number(detail?.isDebitNoteFlag ?? 0) === 1,
          isManualAmount: Number.isFinite(appliedAmount) && appliedAmount > 0,
        } satisfies BillWiseInvoiceRow;
      })
      .filter((detail): detail is BillWiseInvoiceRow => detail != null);
    if (supportsBillWiseEntry && hydratedBillWiseRows.length > 0) {
      const hydratedPartyLedgerId =
        mappedLines[0]?.ledgerId != null
          ? Number(mappedLines[0].ledgerId)
          : null;
      const hydratedPartyLedgerGroupId =
        mappedLines[0]?.ledgerGroupId != null
          ? Number(mappedLines[0].ledgerGroupId)
          : null;
      const discountLedgerFromGlobal = toPositiveId(
        agencyOptions?.discountLedgerId ??
          agencyOptions?.defaultExpenditureLedgerId
      );
      const chequeReturnLedgerFromGlobal = toPositiveId(
        agencyOptions?.chequeCancelLedgerId
      );
      let hydratedDiscountLedgerId: number | null = null;
      let hydratedDiscountAmount = 0;
      let hydratedChequeReturnLedgerId: number | null = null;
      let hydratedChequeReturnCharges = 0;

      hydratedSupplementaryHeaderPostingLines.forEach((line, index) => {
        const ledgerId = toPositiveId(line.ledgerId);
        const amount = Number(line.amount ?? 0);
        if (ledgerId == null || !Number.isFinite(amount) || amount <= 0) return;

        if (
          discountLedgerFromGlobal != null &&
          ledgerId === discountLedgerFromGlobal
        ) {
          hydratedDiscountLedgerId = ledgerId;
          hydratedDiscountAmount += amount;
          return;
        }

        if (
          chequeReturnLedgerFromGlobal != null &&
          ledgerId === chequeReturnLedgerFromGlobal
        ) {
          hydratedChequeReturnLedgerId = ledgerId;
          hydratedChequeReturnCharges += amount;
          return;
        }

        // Backward-compatible fallback when global defaults are not available.
        if (index === 0 && hydratedDiscountLedgerId == null) {
          hydratedDiscountLedgerId = ledgerId;
          hydratedDiscountAmount += amount;
          return;
        }
        if (hydratedChequeReturnLedgerId == null) {
          hydratedChequeReturnLedgerId = ledgerId;
          hydratedChequeReturnCharges += amount;
          return;
        }
        hydratedDiscountAmount += amount;
      });
      const hydratedDebitNote = hydratedBillWiseRows.some(
        (row) => row.isDebitNote
      );
      setBillWiseEnabled(true);
      setBillWiseFullPaid(false);
      setBillWiseShowAdvanceBill(false);
      setBillWiseDebitNote(hydratedDebitNote);
      setBillWisePartyLedgerGroupId(hydratedPartyLedgerGroupId);
      setBillWisePartyLedgerId(hydratedPartyLedgerId);
      setBillWisePartyLedgerOption(
        hydratedPartyLedgerId != null
          ? paymentAgainstOptionMap.get(hydratedPartyLedgerId) ?? null
          : null
      );
      setBillWiseDiscountLedgerId(
        hydratedDiscountLedgerId != null
          ? Number(hydratedDiscountLedgerId)
          : null
      );
      setBillWiseDiscountLedgerOption(
        hydratedDiscountLedgerId != null
          ? paymentAgainstOptionMap.get(Number(hydratedDiscountLedgerId)) ??
              null
          : null
      );
      setBillWiseDiscountAmount(
        hydratedDiscountAmount > 0 ? hydratedDiscountAmount : null
      );
      setBillWiseChequeReturnLedgerId(
        hydratedChequeReturnLedgerId != null
          ? Number(hydratedChequeReturnLedgerId)
          : null
      );
      setBillWiseChequeReturnLedgerOption(
        hydratedChequeReturnLedgerId != null
          ? paymentAgainstOptionMap.get(Number(hydratedChequeReturnLedgerId)) ??
              null
          : null
      );
      setBillWiseChequeReturnCharges(
        hydratedChequeReturnCharges > 0 ? hydratedChequeReturnCharges : null
      );
      setBillWiseInvoiceRows(hydratedBillWiseRows);
      setBillWiseLineEditor(createBillWiseLineEditorState());
      setBillWiseInvoiceSearchDialogVisible(false);
      setBillWiseInvoiceSearchTerm("");
      setBillWiseInvoiceSearchRows([]);
      setBillWiseInvoiceSearchLoading(false);
      setBillWiseSelectionDialogVisible(false);
    } else {
      setBillWiseEnabled(false);
      setBillWiseFullPaid(false);
      setBillWiseShowAdvanceBill(false);
      setBillWiseDebitNote(false);
      setBillWisePartyLedgerGroupId(null);
      setBillWisePartyLedgerId(null);
      setBillWisePartyLedgerOption(null);
      setBillWiseDiscountLedgerId(null);
      setBillWiseDiscountLedgerOption(null);
      setBillWiseDiscountAmount(null);
      setBillWiseChequeReturnLedgerId(null);
      setBillWiseChequeReturnLedgerOption(null);
      setBillWiseChequeReturnCharges(null);
      setBillWiseInvoiceRows([]);
      setBillWiseLineEditor(createBillWiseLineEditorState());
      setBillWiseInvoiceSearchDialogVisible(false);
      setBillWiseInvoiceSearchTerm("");
      setBillWiseInvoiceSearchRows([]);
      setBillWiseInvoiceSearchLoading(false);
      setBillWiseSelectionDialogVisible(false);
    }
    hydratedEditVoucherDataKeyRef.current = hydrationDataKey;
    scheduleFormSnapshotCapture();
    if (postSaveRebaselineRef.current) {
      postSaveRebaselineRef.current = false;
      window.setTimeout(markCurrentFormSnapshotAsClean, 0);
    }
  }, [
    allowHeaderDrCrSelection,
    allowLineDrCrSelection,
    agencyOptions?.chequeCancelLedgerId,
    agencyOptions?.defaultExpenditureLedgerId,
    agencyOptions?.discountLedgerId,
    defaultHeaderDrCrFlag,
    lineEntryDrCrFlag,
    markCurrentFormSnapshotAsClean,
    editData,
    editingId,
    isFormActive,
    ledgerGroupOptions,
    normalizeLineDrCrFlag,
    paymentAgainstOptionMap,
    resolveDefaultLineDraftDrCrFlag,
    resolveHydratedManagerSelection,
    resolvedPaymentLedgerGroupId,
    rows,
    scheduleFormSnapshotCapture,
    selectedRow,
    supportsBillWiseEntry,
  ]);

  useEffect(() => {
    if (!selectedRow) return;
    const stillExists = rows.some((row) =>
      hasSameNumericId(row.voucherId, selectedRow.voucherId)
    );
    if (!stillExists) setSelectedRow(null);
  }, [rows, selectedRow]);

  const clearQueuedVoucherDateFocus = useCallback(() => {
    voucherDateFocusTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    voucherDateFocusTimeoutsRef.current = [];
  }, []);

  useEffect(() => clearQueuedVoucherDateFocus, [clearQueuedVoucherDateFocus]);

  useEffect(() => {
    if (!hasBillWiseDialogOpen) return;
    clearQueuedVoucherDateFocus();
    closeHeaderAutocompleteOverlays();
  }, [
    clearQueuedVoucherDateFocus,
    closeHeaderAutocompleteOverlays,
    hasBillWiseDialogOpen,
  ]);

  const focusVoucherDateInput = useCallback(() => {
    const element = voucherDateInputRef.current;
    if (!element) return false;
    element.focus();
    if (typeof element.setSelectionRange === "function") {
      const length = element.value?.length ?? 0;
      element.setSelectionRange(length, length);
    }
    return document.activeElement === element;
  }, []);

  const queueVoucherDateFocus = useCallback(() => {
    clearQueuedVoucherDateFocus();
    [0, 60, 140, 260, 420].forEach((delay) => {
      const timeoutId = window.setTimeout(() => {
        const focused = focusVoucherDateInput();
        if (focused) {
          clearQueuedVoucherDateFocus();
        }
      }, delay);
      voucherDateFocusTimeoutsRef.current.push(timeoutId);
    });
  }, [clearQueuedVoucherDateFocus, focusVoucherDateInput]);

  const queuePrimaryLedgerFocus = useCallback(() => {
    const hasUserFocusedInteractiveElement = () => {
      if (typeof document === "undefined") return false;
      const activeElement = document.activeElement as HTMLElement | null;
      if (!activeElement) return false;
      if (activeElement === voucherDateInputRef.current) return false;
      const paymentLedgerInput = cashLedgerInputRef.current?.getInput?.();
      if (
        paymentLedgerInput instanceof HTMLInputElement &&
        activeElement === paymentLedgerInput
      ) {
        // Respect active user interaction on primary ledger input.
        // Prevent queued auto-focus from pulling focus to manager.
        return true;
      }
      if (
        activeElement === document.body ||
        activeElement === document.documentElement
      ) {
        return false;
      }
      const tagName = activeElement.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "button"
      ) {
        return true;
      }
      if (activeElement.isContentEditable) return true;
      return (
        activeElement.closest(".p-autocomplete") != null ||
        activeElement.closest(".p-dropdown") != null
      );
    };

    clearQueuedVoucherDateFocus();
    [0, 60, 140, 260, 420].forEach((delay) => {
      const timeoutId = window.setTimeout(() => {
        if (hasBillWiseDialogOpen) {
          closeHeaderAutocompleteOverlays();
          clearQueuedVoucherDateFocus();
          return;
        }
        if (hasUserFocusedInteractiveElement()) {
          clearQueuedVoucherDateFocus();
          return;
        }
        const shouldPreferManagerFocus =
          profile.key === "receipt" &&
          paymentMode === "cash" &&
          editingId == null &&
          modeConfig.requiresManager &&
          paymentLedgerOptions.length === 1;
        if (shouldPreferManagerFocus) {
          const singleLedgerOption = paymentLedgerOptions[0] ?? null;
          if (cashLedgerId == null && singleLedgerOption) {
            updatePrimaryLedger(
              Number(singleLedgerOption.value),
              singleLedgerOption
            );
            clearFormError("cashLedgerId");
          }
          const focusedManager = focusPaidByInput();
          if (focusedManager) {
            clearQueuedVoucherDateFocus();
            return;
          }
        }
        const focused = focusPaymentLedgerInput();
        if (focused) {
          clearQueuedVoucherDateFocus();
        }
      }, delay);
      voucherDateFocusTimeoutsRef.current.push(timeoutId);
    });
  }, [
    cashLedgerId,
    clearFormError,
    clearQueuedVoucherDateFocus,
    closeHeaderAutocompleteOverlays,
    editingId,
    focusPaidByInput,
    focusPaymentLedgerInput,
    hasBillWiseDialogOpen,
    modeConfig.requiresManager,
    paymentLedgerOptions,
    paymentMode,
    profile.key,
    updatePrimaryLedger,
  ]);

  const shouldFocusPrimaryLedgerOnOpen =
    profile.key === "receipt" &&
    editingId == null &&
    !hasBillWiseDialogOpen &&
    (paymentMode === "cash" || paymentMode === "bank");

  useEffect(() => {
    if (!isFormActive) return;
    if (shouldFocusPrimaryLedgerOnOpen) {
      queuePrimaryLedgerFocus();
      return;
    }
    queueVoucherDateFocus();
  }, [
    focusNonce,
    isFormActive,
    queuePrimaryLedgerFocus,
    queueVoucherDateFocus,
    shouldFocusPrimaryLedgerOnOpen,
  ]);

  useEffect(() => {
    if (!isFormActive || !shouldFocusPrimaryLedgerOnOpen) return;
    if (paymentLedgerOptionsLoading) return;
    if (paymentLedgerOptions.length === 0) return;
    queuePrimaryLedgerFocus();
  }, [
    isFormActive,
    paymentLedgerOptions,
    paymentLedgerOptionsLoading,
    queuePrimaryLedgerFocus,
    shouldFocusPrimaryLedgerOnOpen,
  ]);

  const openAdd = () => {
    if (routeView !== "new") {
      navigate(newRoutePath());
      return;
    }
    lastAutoChequeNoRef.current = "";
    lastAutoReceiptNoRef.current = "";
    lastAutoReceiptBookIdRef.current = null;
    previousReceiptSalesmanIdRef.current = null;
    hydratedEditVoucherDataKeyRef.current = null;
    setEditingId(null);
    setSelectedRow(null);
    setHeaderDrCrFlag(defaultHeaderDrCrFlag);
    setIsFormActive(true);
    setFocusNonce((value) => value + 1);
    setCancelledChecked(false);
    setCashLedgerAmount(null);
    setCashLedgerAmountDraft(undefined);
    setCashLedgerOption(null);
    setPaymentLedgerGroupId(
      resolvedPaymentLedgerGroupId != null
        ? Number(resolvedPaymentLedgerGroupId)
        : null
    );
    setFormErrors({});
    setVoucherNo(canFetchNextNo ? nextNoData?.nextVoucherNumber ?? "" : "");
    setVoucherDate(new Date());
    setPostingDate(new Date());
    setRefNo("");
    setRefDate(null);
    setReferenceNo2("");
    setReferenceDate2(null);
    setVoucherDateError(null);
    setPostingDateError(null);
    setRefDateError(null);
    setReferenceDate2Error(null);
    setChequeInFavour("");
    setChequeIssueBookId(null);
    setReasonForIssue("");
    setNarration("");
    setLines([]);
    setSupplementaryHeaderPostingLines([]);
    setBillWiseEnabled(defaultBillWiseEnabled);
    setBillWiseFullPaid(false);
    setBillWiseShowAdvanceBill(false);
    setBillWiseDebitNote(false);
    setBillWisePartyLedgerGroupId(null);
    setBillWisePartyLedgerId(null);
    setBillWisePartyLedgerOption(null);
    setBillWiseDiscountLedgerId(null);
    setBillWiseDiscountLedgerOption(null);
    setBillWiseDiscountAmount(null);
    setBillWiseChequeReturnLedgerId(null);
    setBillWiseChequeReturnLedgerOption(null);
    setBillWiseChequeReturnCharges(null);
    setBillWiseInvoiceRows([]);
    setBillWiseLineEditor(createBillWiseLineEditorState());
    setBillWiseInvoiceSearchDialogVisible(false);
    setBillWiseInvoiceSearchTerm("");
    setBillWiseInvoiceSearchRows([]);
    setBillWiseInvoiceSearchLoading(false);
    setBillWiseSelectionDialogVisible(false);
    setBillWiseInvoicesLoading(false);
    setSelectedLineKey(null);
    setLineEditorCarryGroupId(null);
    setLineEditorDraft(
      createLineEditorDraft({ drCrFlag: resolveDefaultLineDraftDrCrFlag() })
    );
    setFormManagerQuery("");
    setFormManagerId(null);
    setFormSalesmanQuery("");
    setFormSalesmanId(null);
    setSaving(false);
    setInitialFormSnapshotJson(null);
    setInitialSavePreviewJson(null);
    scheduleFormSnapshotCapture();
  };

  const openEdit = () => {
    if (!selectedRow) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Select",
        detail: "Select a voucher to edit.",
      });
      return;
    }
    openEditForRow(selectedRow);
  };

  const openEditForRow = useCallback(
    (row: VoucherRow) => {
      const rowVoucherId = toPositiveId(row.voucherId);
      if (rowVoucherId == null) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Select",
          detail: "Invalid voucher selected.",
        });
        return;
      }
      if (Number(row.isReconciledFlag ?? 0) === 1) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Blocked",
          detail: "Reconciled voucher cannot be edited.",
        });
        if (routeView === "edit") {
          navigate(registerRoutePath(), { replace: true });
        }
        return;
      }
      const parsedVoucherDate = parseDateText(row.voucherDate);
      const parsedPostingDate =
        parseDateText(row.postingDate) ?? parsedVoucherDate;
      const parsedRefDate = parseDateText(row.refDate);
      const normalizedVoucherNo =
        row.voucherNumber?.trim() || String(rowVoucherId);
      const targetPath = editRoutePath(normalizedVoucherNo);
      const normalizedRouteVoucherNo = routeVoucherNo
        ? decodeRouteToken(routeVoucherNo)
        : null;
      if (
        routeView !== "edit" ||
        normalizedRouteVoucherNo !== normalizedVoucherNo
      ) {
        navigate(targetPath);
        if (routeView !== "edit") {
          return;
        }
      }
      const resolvedManagerSelection = resolveHydratedManagerSelection(
        row.managerId,
        row.managerName
      );
      lastAutoChequeNoRef.current = "";
      lastAutoReceiptNoRef.current = "";
      lastAutoReceiptBookIdRef.current = null;
      previousReceiptSalesmanIdRef.current = null;
      hydratedEditVoucherDataKeyRef.current = null;
      setSelectedRow(row);
      setEditingId(rowVoucherId);
      setHeaderDrCrFlag(defaultHeaderDrCrFlag);
      setIsFormActive(true);
      setFocusNonce((value) => value + 1);
      queueVoucherDateFocus();
      setFormErrors({});
      setVoucherDateError(null);
      setPostingDateError(null);
      setRefDateError(null);
      setVoucherNo(normalizedVoucherNo);
      setVoucherDate(parsedVoucherDate ?? new Date());
      setPostingDate(parsedPostingDate ?? parsedVoucherDate ?? new Date());
      setRefNo(row.refNo?.trim() ?? "");
      setRefDate(parsedRefDate);
      setReferenceNo2(row.referenceNumber2?.trim() ?? "");
      setReferenceDate2(parseDateText(row.referenceDate2 ?? null));
      setReferenceDate2Error(null);
      setReasonForIssue(row.reasonForIssueText?.trim() ?? "");
      setNarration(row.narration ?? "");
      setCashLedgerAmount(
        row.totalNetAmount != null ? Number(row.totalNetAmount) : null
      );
      setLines([]);
      setSupplementaryHeaderPostingLines([]);
      setBillWiseEnabled(false);
      setBillWiseFullPaid(false);
      setBillWiseShowAdvanceBill(false);
      setBillWiseDebitNote(false);
      setBillWisePartyLedgerGroupId(null);
      setBillWisePartyLedgerId(null);
      setBillWisePartyLedgerOption(null);
      setBillWiseDiscountLedgerId(null);
      setBillWiseDiscountLedgerOption(null);
      setBillWiseDiscountAmount(null);
      setBillWiseChequeReturnLedgerId(null);
      setBillWiseChequeReturnLedgerOption(null);
      setBillWiseChequeReturnCharges(null);
      setBillWiseInvoiceRows([]);
      setBillWiseLineEditor(createBillWiseLineEditorState());
      setBillWiseInvoiceSearchDialogVisible(false);
      setBillWiseInvoiceSearchTerm("");
      setBillWiseInvoiceSearchRows([]);
      setBillWiseInvoiceSearchLoading(false);
      setBillWiseSelectionDialogVisible(false);
      setBillWiseInvoicesLoading(false);
      setSelectedLineKey(null);
      setLineEditorCarryGroupId(null);
      setLineEditorDraft(
        createLineEditorDraft({ drCrFlag: resolveDefaultLineDraftDrCrFlag() })
      );
      setFormManagerId(resolvedManagerSelection.managerId);
      setFormManagerQuery(resolvedManagerSelection.managerQuery);
      setFormSalesmanId(null);
      setFormSalesmanQuery(row.salesmanName?.trim() ?? "");
      setSaving(false);
      setInitialFormSnapshotJson(null);
      setInitialSavePreviewJson(null);
    },
    [
      defaultHeaderDrCrFlag,
      editRoutePath,
      navigate,
      queueVoucherDateFocus,
      registerRoutePath,
      resolveDefaultLineDraftDrCrFlag,
      resolveHydratedManagerSelection,
      routeVoucherNo,
      routeView,
    ]
  );

  const openRecentlySavedVoucher = useCallback(
    (recent: RecentlySavedVoucher) => {
      const voucherToken = recent.voucherNo?.trim() || String(recent.voucherId);
      if (!voucherToken) return;
      const targetPath = `${routeBasePath}/${
        recent.mode
      }/edit/${encodeURIComponent(voucherToken)}`;
      const navigateToRecent = () => navigate(targetPath);
      if (!isFormActive || !isFormDirty) {
        navigateToRecent();
        return;
      }
      confirmDialog({
        header: "Discard Changes?",
        message: "Unsaved changes will be lost.",
        icon: "pi pi-exclamation-triangle",
        rejectLabel: "Keep Editing",
        acceptLabel: "Discard",
        acceptClassName: "p-button-danger",
        accept: navigateToRecent,
        reject: () => undefined,
      });
    },
    [isFormActive, isFormDirty, navigate, routeBasePath]
  );

  const openLastSavedVoucherForEdit = useCallback(() => {
    if (!lastSavedVoucher) return;
    openRecentlySavedVoucher(lastSavedVoucher);
  }, [lastSavedVoucher, openRecentlySavedVoucher]);

  useEffect(() => {
    const routeKey = `${profile.key}:${paymentMode}:${routeView}:${
      routeVoucherNo ?? ""
    }`;
    if (routeSyncKeyRef.current === routeKey) {
      // In dev StrictMode, init effects can temporarily reset form-active state.
      // Ensure `/new` routes still hydrate an editable form when route key is unchanged.
      if (routeView === "new" && (!isFormActive || editingId != null)) {
        openAdd();
      }
      return;
    }

    if (routeView === "register") {
      routeSyncKeyRef.current = routeKey;
      return;
    }
    if (routeView === "new") {
      if (isFormActive && editingId == null) {
        routeSyncKeyRef.current = routeKey;
        return;
      }
      routeSyncKeyRef.current = routeKey;
      openAdd();
      return;
    }
    if (!routeVoucherNo) {
      routeSyncKeyRef.current = routeKey;
      navigate(registerRoutePath(), { replace: true });
      return;
    }

    const decodedVoucherNo = decodeRouteToken(routeVoucherNo);
    const matchedRow =
      rows.find(
        (row) => (row.voucherNumber?.trim() ?? "") === decodedVoucherNo
      ) ??
      rows.find((row) => String(row.voucherId) === decodedVoucherNo) ??
      null;

    if (!matchedRow) {
      const routeVoucherId = toPositiveId(decodedVoucherNo);
      const currentVoucherNo = voucherNo.trim();
      const matchesCurrentEditingVoucher =
        isFormActive &&
        editingId != null &&
        (decodedVoucherNo === String(editingId) ||
          (currentVoucherNo.length > 0 &&
            decodedVoucherNo === currentVoucherNo));
      if (matchesCurrentEditingVoucher) {
        routeSyncKeyRef.current = routeKey;
        return;
      }
      if (routeVoucherId != null) {
        // Numeric edit routes can be opened directly without waiting for register
        // hydration; detailed header/lines are loaded by voucher-entry-by-id query.
        routeSyncKeyRef.current = routeKey;
        openEditForRow({
          voucherId: routeVoucherId,
          voucherTypeId: profileVoucherTypeIds[0] ?? null,
          voucherNumber: decodedVoucherNo,
          voucherDate: null,
          postingDate: null,
          refNo: null,
          refDate: null,
          debitLedgerName: null,
          debitLedgerGroupName: null,
          totalNetAmount: 0,
          narration: null,
          isCancelledFlag: 0,
          managerId: null,
          managerName: null,
        });
        return;
      }
      // Non-numeric route tokens rely on register rows for voucher-number matching.
      if (!hasApplied || appliedVariables == null) return;
      if (!data && !registerError) return;
      if (loading) return;
      routeSyncKeyRef.current = routeKey;
      toastRef.current?.show({
        severity: "warn",
        summary: "Select",
        detail: `Voucher #${decodedVoucherNo} is not in the current register list.`,
      });
      navigate(registerRoutePath(), { replace: true });
      return;
    }

    if (isFormActive && hasSameNumericId(editingId, matchedRow.voucherId)) {
      routeSyncKeyRef.current = routeKey;
      return;
    }
    routeSyncKeyRef.current = routeKey;
    openEditForRow(matchedRow);
  }, [
    editingId,
    isFormActive,
    hasApplied,
    loading,
    navigate,
    openAdd,
    openEditForRow,
    appliedVariables,
    data,
    paymentMode,
    profile.key,
    profileVoucherTypeIds,
    registerError,
    registerRoutePath,
    routeView,
    routeVoucherNo,
    rows,
    voucherNo,
  ]);

  useEffect(() => {
    if (routeView !== "register") return;
    if (!isFormActive && editingId == null) return;
    resetVoucherFormState();
  }, [editingId, isFormActive, resetVoucherFormState, routeView]);

  const updateLineEditorDraft = (patch: Partial<DebitLineEditorDraft>) => {
    setLineEditorDraft((prev) => ({ ...prev, ...patch }));
    clearFormError("debitLines");
    clearFormError("cashLedgerAmount");
  };

  const updateHeaderDrCr = useCallback(
    (nextLabel: "Dr" | "Cr") => {
      if (!allowHeaderDrCrSelection) return;
      const nextFlag: 0 | 1 = nextLabel === "Cr" ? 1 : 0;
      if (nextFlag === headerDrCrFlag) return;
      setHeaderDrCrFlag(nextFlag);
      clearFormError("debitLines");
      clearFormError("cashLedgerAmount");
      const nextDefaultLineFlag: 0 | 1 =
        !allowLineDrCrSelection || !allowHeaderDrCrSelection
          ? lineEntryDrCrFlag
          : nextFlag === 0
          ? 1
          : 0;
      setLineEditorDraft((prev) =>
        prev.mode === "add"
          ? {
              ...prev,
              drCrFlag: nextDefaultLineFlag,
            }
          : prev
      );
    },
    [
      allowHeaderDrCrSelection,
      allowLineDrCrSelection,
      clearFormError,
      headerDrCrFlag,
      lineEntryDrCrFlag,
    ]
  );

  const toggleBillWiseMode = useCallback(
    (nextEnabled: boolean) => {
      if (!showBillWiseOption) return;
      setBillWiseEnabled(nextEnabled);
      setBillWiseLineEditor(createBillWiseLineEditorState());
      setBillWiseInvoiceSearchDialogVisible(false);
      setBillWiseInvoiceSearchTerm("");
      setBillWiseInvoiceSearchRows([]);
      setBillWiseInvoiceSearchLoading(false);
      if (!nextEnabled) {
        setBillWiseSelectionDialogVisible(false);
      }
      clearFormError("billWisePartyLedgerId");
      clearFormError("billWiseChequeReturnLedgerId");
      clearFormError("billWiseInvoiceRows");
      clearFormError("billWiseDiscountLedgerId");
      if (nextEnabled && billWiseDiscountLedgerId == null) {
        if (globalDiscountLedgerId != null) {
          setBillWiseDiscountLedgerId(Number(globalDiscountLedgerId));
        }
      }
      if (
        nextEnabled &&
        billWiseChequeReturnLedgerId == null &&
        globalChequeReturnLedgerId != null
      ) {
        setBillWiseChequeReturnLedgerId(Number(globalChequeReturnLedgerId));
      }
      if (!nextEnabled) {
        setBillWiseInvoicesLoading(false);
        setBillWiseShowAdvanceBill(false);
        setBillWiseDebitNote(false);
        setBillWiseChequeReturnCharges(null);
      }
    },
    [
      billWiseChequeReturnLedgerId,
      billWiseDiscountLedgerId,
      clearFormError,
      globalChequeReturnLedgerId,
      globalDiscountLedgerId,
      showBillWiseOption,
    ]
  );

  const updateBillWisePartyLedgerGroupId = useCallback(
    (value: number | null) => {
      setBillWisePartyLedgerGroupId(value != null ? Number(value) : null);
      setBillWisePartyLedgerId(null);
      setBillWisePartyLedgerOption(null);
      setBillWiseInvoiceRows([]);
      setBillWiseLineEditor(createBillWiseLineEditorState());
      setBillWiseInvoiceSearchDialogVisible(false);
      setBillWiseSelectionDialogVisible(false);
      clearFormError("billWisePartyLedgerId");
      clearFormError("billWiseInvoiceRows");
    },
    [clearFormError]
  );

  const updateBillWisePartyLedger = useCallback(
    (value: number | null, option?: LedgerOption | null) => {
      setBillWisePartyLedgerId(value != null ? Number(value) : null);
      setBillWisePartyLedgerOption(option ?? null);
      setBillWiseInvoiceRows([]);
      setBillWiseLineEditor(createBillWiseLineEditorState());
      setBillWiseInvoiceSearchDialogVisible(false);
      setBillWiseSelectionDialogVisible(false);
      clearFormError("billWisePartyLedgerId");
      clearFormError("billWiseInvoiceRows");
    },
    [clearFormError]
  );

  const updateBillWiseDiscountLedger = useCallback(
    (value: number | null, option?: LedgerOption | null) => {
      setBillWiseDiscountLedgerId(value != null ? Number(value) : null);
      setBillWiseDiscountLedgerOption(option ?? null);
      clearFormError("billWiseDiscountLedgerId");
    },
    [clearFormError]
  );

  const updateBillWiseDiscountAmount = useCallback(
    (nextValue: number | null) => {
      setBillWiseDiscountAmount(nextValue);
      if (nextValue == null || Number(nextValue) <= 0) {
        clearFormError("billWiseDiscountLedgerId");
      }
    },
    [clearFormError]
  );
  const updateBillWiseChequeReturnCharges = useCallback(
    (nextValue: number | null) => {
      setBillWiseChequeReturnCharges(nextValue);
      if (nextValue == null || Number(nextValue) <= 0) {
        clearFormError("billWiseChequeReturnLedgerId");
      }
    },
    [clearFormError]
  );
  const updateBillWiseFullPaid = useCallback((nextEnabled: boolean) => {
    setBillWiseFullPaid(nextEnabled);
    if (!nextEnabled) return;
    setBillWiseInvoiceRows((prevRows) =>
      prevRows.map((row) => ({
        ...row,
        selected: Math.abs(Number(row.dueAmount ?? 0)) > 0.00001,
        appliedAmount:
          Math.abs(Number(row.dueAmount ?? 0)) > 0.00001
            ? roundMoney(Math.abs(Number(row.dueAmount ?? 0)))
            : null,
        isManualAmount: false,
      }))
    );
  }, []);
  const updateBillWiseShowAdvanceBill = useCallback((nextEnabled: boolean) => {
    setBillWiseShowAdvanceBill(nextEnabled);
  }, []);
  const updateBillWiseDebitNote = useCallback((nextEnabled: boolean) => {
    setBillWiseDebitNote(nextEnabled);
  }, []);
  const updateBillWiseFiscalYear = useCallback((nextValue: number | null) => {
    const normalizedValue =
      nextValue != null && Number.isFinite(Number(nextValue))
        ? Number(nextValue)
        : null;
    setBillWiseFiscalYearId(normalizedValue);
  }, []);
  const updateBillWiseInvoiceSearchTerm = useCallback((nextValue: string) => {
    billWiseInvoiceSearchTermRef.current = nextValue;
    setBillWiseInvoiceSearchTerm(nextValue);
  }, []);
  const openBillWiseInvoiceSearchDialog = useCallback(() => {
    if (!showBillWiseOption || !isFormActive || !isBillWiseMode) return;
    closeHeaderAutocompleteOverlays();
    clearQueuedVoucherDateFocus();
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();
    setBillWiseSelectionDialogVisible(false);
    setBillWiseInvoiceSearchDialogVisible(true);
  }, [
    clearQueuedVoucherDateFocus,
    closeHeaderAutocompleteOverlays,
    isBillWiseMode,
    isFormActive,
    showBillWiseOption,
  ]);
  const closeBillWiseInvoiceSearchDialog = useCallback(() => {
    billWiseInvoiceSearchRequestSeqRef.current += 1;
    setBillWiseInvoiceSearchDialogVisible(false);
    setBillWiseInvoiceSearchLoading(false);
  }, []);
  const runBillWiseInvoiceSearch = useCallback(
    async (
      rawSearch?: string | null,
      options?: { fiscalYearIdOverride?: number | null }
    ) => {
      if (!showBillWiseOption || !isFormActive || !isBillWiseMode) return;
      const resolvedRawSearch =
        rawSearch != null
          ? String(rawSearch)
          : billWiseInvoiceSearchTermRef.current;
      const searchValue = resolvedRawSearch.trim();
      if (rawSearch != null) {
        billWiseInvoiceSearchTermRef.current = resolvedRawSearch;
        setBillWiseInvoiceSearchTerm(resolvedRawSearch);
      }
      if (searchValue.length < 2) {
        billWiseInvoiceSearchRequestSeqRef.current += 1;
        setBillWiseInvoiceSearchRows([]);
        setBillWiseInvoiceSearchLoading(false);
        return;
      }
      const requestId = billWiseInvoiceSearchRequestSeqRef.current + 1;
      billWiseInvoiceSearchRequestSeqRef.current = requestId;
      const isCurrentRequest = () =>
        billWiseInvoiceSearchRequestSeqRef.current === requestId;
      setBillWiseInvoiceSearchLoading(true);
      setBillWiseInvoiceSearchRows([]);
      try {
        const normalizeDocSearchValue = (value: string | number | null) =>
          String(value ?? "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        const normalizedSearch = normalizeDocSearchValue(searchValue);
        const searchLower = searchValue.toLowerCase();
        const hasNormalizedSearch = normalizedSearch.length > 0;
        const matchesSearchValue = (value: string | number | null) => {
          const rawValue = String(value ?? "").trim();
          if (!rawValue) return false;
          if (hasNormalizedSearch) {
            return normalizeDocSearchValue(rawValue) === normalizedSearch;
          }
          return rawValue.toLowerCase() === searchLower;
        };
        const resolveSearchRowInvoiceId = (
          rawSaleInvoiceId: unknown,
          rawInvoiceNumber: unknown,
          fallbackIndex: number
        ) => {
          const parsedSaleInvoiceId = Number(rawSaleInvoiceId);
          if (Number.isFinite(parsedSaleInvoiceId) && parsedSaleInvoiceId > 0) {
            return Math.trunc(parsedSaleInvoiceId);
          }
          const digitsOnlyInvoiceNumber = String(
            rawInvoiceNumber ?? ""
          ).replace(/\D/g, "");
          const parsedFromInvoiceNumber = Number(digitsOnlyInvoiceNumber);
          if (
            Number.isFinite(parsedFromInvoiceNumber) &&
            parsedFromInvoiceNumber > 0
          ) {
            return Math.trunc(parsedFromInvoiceNumber);
          }
          return -(fallbackIndex + 1);
        };
        const sortSearchRows = (rows: BillWiseInvoiceSearchRow[]) =>
          rows.sort((left, right) => {
            const leftDateKey = toDateKey(left.invoiceDate) ?? "";
            const rightDateKey = toDateKey(right.invoiceDate) ?? "";
            if (leftDateKey !== rightDateKey) {
              return leftDateKey.localeCompare(rightDateKey);
            }
            return String(left.invoiceNumber).localeCompare(
              String(right.invoiceNumber),
              "en",
              { sensitivity: "base" }
            );
          });
        const finalizeSearchRows = (rows: BillWiseInvoiceSearchRow[]) => {
          const filteredRows = rows.filter((row) => {
            return (
              matchesSearchValue(row.invoiceNumber) ||
              matchesSearchValue(row.saleInvoiceId)
            );
          });
          const dedupedByDocNo = new Map<string, BillWiseInvoiceSearchRow>();
          const rowsWithoutDocNo: BillWiseInvoiceSearchRow[] = [];
          filteredRows.forEach((row) => {
            const docNoKey = normalizeDocSearchValue(row.invoiceNumber);
            if (!docNoKey) {
              rowsWithoutDocNo.push(row);
              return;
            }
            const existingRow = dedupedByDocNo.get(docNoKey) ?? null;
            if (!existingRow) {
              dedupedByDocNo.set(docNoKey, row);
              return;
            }
            const existingDateKey = toDateKey(existingRow.invoiceDate) ?? "";
            const nextDateKey = toDateKey(row.invoiceDate) ?? "";
            if (nextDateKey > existingDateKey) {
              dedupedByDocNo.set(docNoKey, row);
              return;
            }
            if (
              nextDateKey === existingDateKey &&
              Number(row.saleInvoiceId) > Number(existingRow.saleInvoiceId)
            ) {
              dedupedByDocNo.set(docNoKey, row);
            }
          });
          return sortSearchRows([
            ...dedupedByDocNo.values(),
            ...rowsWithoutDocNo,
          ]);
        };
        const mapSaleInvoiceSearchRows = (sourceItems: Array<any>) =>
          finalizeSearchRows(
            sourceItems.map((item, index) => {
              const saleInvoiceId = resolveSearchRowInvoiceId(
                item?.invoiceId,
                item?.invoiceNumber,
                index
              );
              const rawLedgerId = Number(item?.ledgerId);
              const ledgerId =
                Number.isFinite(rawLedgerId) && rawLedgerId > 0
                  ? rawLedgerId
                  : null;
              const billAmountRaw = Number(item?.billAmount ?? 0);
              const billAmount = Number.isFinite(billAmountRaw)
                ? billAmountRaw
                : 0;
              return {
                saleInvoiceId,
                invoiceNumber: String(item?.invoiceNumber ?? saleInvoiceId),
                invoiceDate: item?.invoiceDate ?? null,
                dueAmount: billAmount,
                ledgerId,
                ledgerName: String(item?.ledgerName ?? "").trim(),
                ledgerAddress:
                  item?.ledgerAddress != null
                    ? String(item.ledgerAddress).trim() || null
                    : null,
                ledgerGroupId:
                  item?.ledgerGroupId != null
                    ? Number(item.ledgerGroupId)
                    : null,
                ledgerGroupName:
                  item?.ledgerGroupName != null
                    ? String(item.ledgerGroupName)
                    : null,
                isDebitNote: billAmount < 0,
              } satisfies BillWiseInvoiceSearchRow;
            })
          );
        const resolvedFiscalYearId =
          options?.fiscalYearIdOverride != null
            ? Number(options.fiscalYearIdOverride)
            : billWiseFiscalYearId != null
            ? Number(billWiseFiscalYearId)
            : null;
        const selectedFiscalYear =
          resolvedFiscalYearId != null
            ? billWiseFiscalYearOptionMap.get(resolvedFiscalYearId) ?? null
            : null;
        const searchRange = {
          fromDate: selectedFiscalYear?.fromDateText ?? null,
          toDate: selectedFiscalYear?.toDateText ?? null,
        };
        const saleInvoiceSearchResult = await apolloClient.query({
          query: SALE_INVOICE_BILL_SEARCH,
          fetchPolicy: "network-only",
          variables: {
            fromDate: searchRange.fromDate,
            toDate: searchRange.toDate,
            search: searchValue,
            limit: 200,
          },
        });
        const searchItems = (saleInvoiceSearchResult.data?.saleInvoiceBillSearch ??
          []) as Array<any>;
        const mappedRows = mapSaleInvoiceSearchRows(searchItems);
        if (!isCurrentRequest()) return;
        setBillWiseInvoiceSearchRows(mappedRows);
      } catch (error) {
        if (!isCurrentRequest()) return;
        setBillWiseInvoiceSearchRows([]);
        const reason =
          error instanceof Error
            ? error.message.trim()
            : String(error ?? "").trim();
        const isUnavailableError = isSaleInvoiceBillSearchUnavailableError(reason);
        toastRef.current?.show({
          severity: "error",
          summary: "Search Failed",
          detail:
            isUnavailableError
              ? "Unable to load bill details. Backend query `saleInvoiceBillSearch` is not available on the running server. Please restart/redeploy accounts backend."
              : reason.length > 0
              ? `Unable to load bill details. ${reason}`
              : "Unable to load bill details. Please try again.",
        });
      } finally {
        if (isCurrentRequest()) {
          setBillWiseInvoiceSearchLoading(false);
        }
      }
    },
    [
      billWiseFiscalYearId,
      billWiseFiscalYearOptionMap,
      apolloClient,
      isBillWiseMode,
      isFormActive,
      showBillWiseOption,
    ]
  );
  const selectBillWiseInvoiceSearchRow = useCallback(
    (
      saleInvoiceId: number,
      options?: {
        openSelectionDialog?: boolean;
        focusNetAmount?: boolean;
      }
    ) => {
      if (!showBillWiseOption || !isFormActive || !isBillWiseMode) return;
      const targetRow =
        billWiseInvoiceSearchRows.find(
          (row) => Number(row.saleInvoiceId) === Number(saleInvoiceId)
        ) ?? null;
      if (!targetRow) return;
      const openSelectionDialog = Boolean(options?.openSelectionDialog);
      const focusNetAmount =
        options?.focusNetAmount != null
          ? Boolean(options.focusNetAmount)
          : !openSelectionDialog;
      const targetLedgerIdRaw =
        targetRow.ledgerId != null ? Number(targetRow.ledgerId) : null;
      const targetLedgerName = String(targetRow.ledgerName ?? "").trim();
      const matchedLedgerOptionByName =
        targetLedgerName.length > 0
          ? paymentAgainstOptions.find(
              (option) =>
                normalizeTextValue(option.label) ===
                normalizeTextValue(targetLedgerName)
            ) ?? null
          : null;
      const targetLedgerId =
        targetLedgerIdRaw != null &&
        Number.isFinite(targetLedgerIdRaw) &&
        targetLedgerIdRaw > 0
          ? targetLedgerIdRaw
          : matchedLedgerOptionByName != null
          ? Number(matchedLedgerOptionByName.value)
          : null;
      if (targetLedgerId == null || !Number.isFinite(targetLedgerId)) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Party Not Found",
          detail:
            "Cannot resolve party for this bill. Try selecting party manually.",
        });
        return;
      }
      const targetLedgerGroupId =
        targetRow.ledgerGroupId != null
          ? Number(targetRow.ledgerGroupId)
          : null;
      const selectedLedgerOption = paymentAgainstOptionMap.get(
        targetLedgerId
      ) ??
        matchedLedgerOptionByName ?? {
          value: targetLedgerId,
          label:
            targetLedgerName.length > 0
              ? targetLedgerName
              : `Ledger ${targetLedgerId}`,
          address: null,
        };
      const previousPartyLedgerId =
        billWisePartyLedgerId != null ? Number(billWisePartyLedgerId) : null;
      setBillWisePartyLedgerGroupId(targetLedgerGroupId);
      setBillWisePartyLedgerId(targetLedgerId);
      setBillWisePartyLedgerOption(selectedLedgerOption);
      setBillWiseInvoiceRows([]);
      setBillWiseLineEditor(createBillWiseLineEditorState());
      setBillWiseInvoiceSearchDialogVisible(false);
      setBillWiseSelectionDialogVisible(openSelectionDialog);
      clearFormError("billWisePartyLedgerId");
      clearFormError("billWiseInvoiceRows");
      if (focusNetAmount) {
        window.setTimeout(() => {
          focusCashLedgerAmountInput();
        }, 0);
      }
      if (
        previousPartyLedgerId != null &&
        previousPartyLedgerId === targetLedgerId
      ) {
        void refreshBillWiseInvoices();
      }
    },
    [
      billWiseInvoiceSearchRows,
      billWisePartyLedgerId,
      clearFormError,
      isBillWiseMode,
      isFormActive,
      paymentAgainstOptions,
      paymentAgainstOptionMap,
      focusCashLedgerAmountInput,
      refreshBillWiseInvoices,
      showBillWiseOption,
      toastRef,
    ]
  );
  const openBillWiseSelectionDialog = useCallback(() => {
    if (!showBillWiseOption || !isFormActive || !isBillWiseMode) return;
    closeHeaderAutocompleteOverlays();
    clearQueuedVoucherDateFocus();
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();
    setBillWiseInvoiceSearchDialogVisible(false);
    setBillWiseSelectionDialogVisible(true);
    void refreshBillWiseInvoices();
  }, [
    clearQueuedVoucherDateFocus,
    closeHeaderAutocompleteOverlays,
    isBillWiseMode,
    isFormActive,
    refreshBillWiseInvoices,
    showBillWiseOption,
  ]);
  const closeBillWiseSelectionDialog = useCallback(() => {
    setBillWiseSelectionDialogVisible(false);
  }, []);
  const searchInvoiceBills = useCallback(() => {
    openBillWiseInvoiceSearchDialog();
  }, [openBillWiseInvoiceSearchDialog]);
  useEffect(() => {
    if (!showBillWiseOption || !isFormActive || !isBillWiseMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F7") return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        openBillWiseSelectionDialog();
        return;
      }
      if (billWiseInvoiceSearchDialogVisible) {
        window.setTimeout(() => {
          const input = document.getElementById(
            "voucher-billwise-bill-no-search"
          );
          if (!(input instanceof HTMLInputElement)) return;
          input.focus();
          input.select();
        }, 0);
        return;
      }
      searchInvoiceBills();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    billWiseInvoiceSearchDialogVisible,
    isBillWiseMode,
    isFormActive,
    openBillWiseSelectionDialog,
    searchInvoiceBills,
    showBillWiseOption,
  ]);

  const resolveAmountFromInput = (
    rawValue?: string | null,
    fallbackValue?: number | null
  ) => {
    if (rawValue != null) {
      const parsed = parseInputNumber(rawValue);
      if (parsed !== undefined) return parsed;
      return undefined;
    }
    if (fallbackValue == null) return null;
    const numeric = Number(fallbackValue);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const syncLineEditorAmountInput = (
    rawValue?: string | null,
    fallbackValue?: number | null
  ) => {
    const parsed = resolveAmountFromInput(rawValue, fallbackValue);
    if (parsed === undefined) return;
    updateLineEditorDraft({ amount: parsed });
  };

  const syncCashLedgerAmountInput = (
    rawValue?: string | null,
    fallbackValue?: number | null
  ) => {
    const parsed = resolveAmountFromInput(rawValue, fallbackValue);
    if (parsed === undefined) return;
    setCashLedgerAmount((prev) => (prev === parsed ? prev : parsed));
    setCashLedgerAmountDraft((prev) => (prev === parsed ? prev : parsed));
    clearFormError("cashLedgerAmount");
  };

  const syncCashLedgerAmountDraftInput = (rawValue?: string | null) => {
    const parsed = resolveAmountFromInput(rawValue, undefined);
    if (parsed === undefined) return;
    setCashLedgerAmountDraft((prev) => (prev === parsed ? prev : parsed));
    clearFormError("cashLedgerAmount");
  };

  const buildLineFromEditor = (
    draft: DebitLineEditorDraft,
    key?: string
  ): DebitLineDraft => {
    const overrides: Partial<DebitLineDraft> = {
      ledgerGroupId: draft.ledgerGroupId,
      ledgerId: draft.ledgerId,
      ledgerOption: draft.ledgerOption ?? null,
      drCrFlag: allowLineDrCrSelection
        ? normalizeLineDrCrFlag(draft.drCrFlag)
        : lineEntryDrCrFlag,
      amount: draft.amount,
      label: draft.label ?? null,
    };
    if (key) {
      overrides.key = key;
    }
    return createDebitLine(overrides);
  };

  const hydrateEditorFromLine = (line: DebitLineDraft): DebitLineEditorDraft =>
    createLineEditorDraft({
      mode: "edit",
      targetKey: line.key,
      ledgerGroupId: line.ledgerGroupId ?? null,
      ledgerId: line.ledgerId ?? null,
      ledgerOption: line.ledgerOption ?? null,
      drCrFlag: normalizeLineDrCrFlag(line.drCrFlag),
      amount: line.amount ?? null,
      label: line.label ?? null,
    });

  const resolveCarryGroupId = () =>
    lineEditorDraft.ledgerGroupId ?? lineEditorCarryGroupId ?? null;

  const startAddLine = () => {
    if (isLineEditorLocked) {
      toastRef.current?.show({
        severity: "info",
        summary: "Bill-wise mode",
        detail: "Posting lines are auto-generated from selected bills.",
      });
      return;
    }
    if (modeConfig.enforceSingleEntryLine && lines.length >= 1) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Validation",
        detail: `Only one ${lineEntryLedgerLabel.toLowerCase()} line is allowed in this mode.`,
      });
      return;
    }
    const nextGroupId = resolveCarryGroupId();
    setLineEditorDraft(
      createLineEditorDraft({
        ledgerGroupId: nextGroupId,
        drCrFlag: resolveDefaultLineDraftDrCrFlag(),
      })
    );
    clearFormError("debitLines");
    clearFormError("cashLedgerAmount");
    window.setTimeout(focusLineEditorLedgerGroupInput, 0);
  };

  const startEditLine = (key?: string) => {
    if (isLineEditorLocked) {
      toastRef.current?.show({
        severity: "info",
        summary: "Bill-wise mode",
        detail: "Posting lines are auto-generated from selected bills.",
      });
      return;
    }
    const targetKey = key ?? selectedLineKey;
    if (!targetKey) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Select",
        detail: "Select a line to edit.",
      });
      return;
    }
    const targetLine = lines.find((line) => line.key === targetKey) ?? null;
    if (!targetLine) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Select",
        detail: "Selected line is not available.",
      });
      return;
    }
    setSelectedLineKey(targetLine.key);
    setLineEditorDraft(hydrateEditorFromLine(targetLine));
    clearFormError("debitLines");
    clearFormError("cashLedgerAmount");
    window.setTimeout(focusLineEditorLedgerGroupInput, 0);
  };

  const applyLineDraft = () => {
    if (isLineEditorLocked) {
      toastRef.current?.show({
        severity: "info",
        summary: "Bill-wise mode",
        detail: "Posting lines are auto-generated from selected bills.",
      });
      return;
    }
    const ledgerId =
      lineEditorDraft.ledgerId != null
        ? Number(lineEditorDraft.ledgerId)
        : null;
    const amount =
      lineEditorDraft.amount != null ? Number(lineEditorDraft.amount) : null;
    if (!ledgerId) {
      setFormErrors((prev) => ({ ...prev, debitLines: "Select ledger." }));
      window.setTimeout(focusLineEditorLedgerGroupInput, 0);
      return;
    }
    if (amount == null || Number(amount) <= 0) {
      setFormErrors((prev) => ({ ...prev, debitLines: "Enter amount." }));
      window.setTimeout(focusLineEditorAmountInput, 0);
      return;
    }

    const amountValue = Number(amount);
    const isAddLineMode =
      lineEditorDraft.mode !== "edit" || !lineEditorDraft.targetKey;
    if (
      isAddLineMode &&
      modeConfig.enforceSingleEntryLine &&
      lines.length >= 1
    ) {
      setFormErrors((prev) => ({
        ...prev,
        debitLines: `Only one ${lineEntryLedgerLabel.toLowerCase()} line is allowed in this mode.`,
      }));
      return;
    }
    const nextLineDrCrFlag = allowLineDrCrSelection
      ? normalizeLineDrCrFlag(lineEditorDraft.drCrFlag)
      : lineEntryDrCrFlag;
    const draftedLines =
      lineEditorDraft.mode === "edit" && lineEditorDraft.targetKey
        ? lines.map((line) =>
            line.key === lineEditorDraft.targetKey
              ? {
                  ...line,
                  amount: amountValue,
                  drCrFlag: nextLineDrCrFlag,
                }
              : line
          )
        : [
            ...lines,
            {
              amount: amountValue,
              drCrFlag: nextLineDrCrFlag,
            } as DebitLineDraft,
          ];
    const nextLineTotals = summarizeLineAmounts(draftedLines, headerDrCrFlag);
    const nextTotalDebit = nextLineTotals.netAgainstHeader;
    const headerAmountValue = Number(
      (cashLedgerAmountDraft !== undefined
        ? cashLedgerAmountDraft
        : cashLedgerAmount) || 0
    );
    if (isAddLineMode && headerAmountValue <= 0) {
      setFormErrors((prev) => ({
        ...prev,
        debitLines: `Enter ${headerDrCrLabel} amount before adding lines.`,
        cashLedgerAmount: `Enter ${headerDrCrLabel} amount first.`,
      }));
      window.setTimeout(focusCashLedgerAmountInput, 0);
      return;
    }
    if (isAddLineMode && nextTotalDebit > headerAmountValue + 0.00001) {
      setFormErrors((prev) => ({
        ...prev,
        debitLines: allowLineDrCrSelection
          ? `Net lines cannot exceed ${headerDrCrLabel} amount (${formatAmount(
              headerAmountValue
            )}).`
          : `Total ${lineEntryDrCrLabel} cannot exceed ${headerDrCrLabel} amount (${formatAmount(
              headerAmountValue
            )}).`,
      }));
      window.setTimeout(focusLineEditorAmountInput, 0);
      return;
    }
    const nextDifferenceAmount = headerAmountValue - nextTotalDebit;
    const hasBalancedHeaderAndLines =
      Math.abs(nextDifferenceAmount) < 0.00001 &&
      headerAmountValue > 0 &&
      nextTotalDebit > 0;
    const resolvedGroupId = resolveCarryGroupId();
    const draftToPersist: DebitLineEditorDraft = {
      ...lineEditorDraft,
      ledgerGroupId: resolvedGroupId,
      drCrFlag: nextLineDrCrFlag,
      amount: amountValue,
    };
    if (lineEditorDraft.mode === "edit" && lineEditorDraft.targetKey) {
      const targetKey = lineEditorDraft.targetKey;
      setLines((prev) =>
        prev.map((line) =>
          line.key === targetKey
            ? buildLineFromEditor(draftToPersist, targetKey)
            : line
        )
      );
      setSelectedLineKey(targetKey);
    } else {
      const nextLine = buildLineFromEditor(draftToPersist);
      setLines((prev) => [...prev, nextLine]);
      setSelectedLineKey(nextLine.key);
    }

    setLineEditorCarryGroupId(resolvedGroupId);
    setLineEditorDraft(
      createLineEditorDraft({
        ledgerGroupId: resolvedGroupId,
        drCrFlag: resolveDefaultLineDraftDrCrFlag(),
      })
    );
    clearFormError("debitLines");
    clearFormError("cashLedgerAmount");
    if (Math.abs(nextDifferenceAmount) > 0.00001) {
      window.setTimeout(focusLineEditorLedgerGroupInput, 0);
      return;
    }
    if (hasBalancedHeaderAndLines) {
      if (requiresManager) {
        window.setTimeout(focusPaidByInput, 0);
        return;
      }
      if (isChequePayment) {
        window.setTimeout(focusChequeInFavourInput, 0);
        return;
      }
      window.setTimeout(focusSaveButton, 0);
      return;
    }
    window.setTimeout(focusLineEditorLedgerGroupInput, 0);
  };

  const cancelLineDraft = () => {
    if (isLineEditorLocked) return;
    const nextGroupId = resolveCarryGroupId();
    setLineEditorDraft(
      createLineEditorDraft({
        ledgerGroupId: nextGroupId,
        drCrFlag: resolveDefaultLineDraftDrCrFlag(),
      })
    );
    clearFormError("debitLines");
    clearFormError("cashLedgerAmount");
    window.setTimeout(focusLineEditorLedgerGroupInput, 0);
  };

  const removeLineByKey = (key: string) => {
    if (isLineEditorLocked) return;
    setLines((prev) => prev.filter((line) => line.key !== key));
    setSelectedLineKey((prev) => (prev === key ? null : prev));
    setLineEditorDraft((prev) => {
      if (prev.mode === "edit" && prev.targetKey === key) {
        return createLineEditorDraft({
          ledgerGroupId: lineEditorCarryGroupId,
          drCrFlag: resolveDefaultLineDraftDrCrFlag(),
        });
      }
      return prev;
    });
    clearFormError("debitLines");
    clearFormError("cashLedgerAmount");
  };

  const confirmRemoveLine = (key: string) => {
    if (isLineEditorLocked) return;
    confirmDialog({
      message: "Delete this line?",
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      footer: (options) => (
        <>
          <Button
            label="No"
            icon="pi pi-times"
            className="p-button-text"
            onClick={options.reject}
            autoFocus
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            className="p-button-danger"
            onClick={options.accept}
          />
        </>
      ),
      accept: () => removeLineByKey(key),
      reject: () => undefined,
    });
  };

  const deleteRow = async (row: VoucherRow) => {
    if (!row?.voucherId || saving) return;
    setSaving(true);
    try {
      await deleteVoucherEntry({ variables: { voucherId: row.voucherId } });
      toastRef.current?.show({
        severity: "success",
        summary: "Deleted",
        detail: `Voucher #${row.voucherNumber ?? row.voucherId}`,
      });
      if (hasSameNumericId(selectedRow?.voucherId, row.voucherId)) {
        setSelectedRow(null);
      }
      if (hasSameNumericId(editingId, row.voucherId)) {
        setEditingId(null);
        setIsFormActive(false);
        setSelectedLineKey(null);
        setLineEditorDraft(
          createLineEditorDraft({ drCrFlag: resolveDefaultLineDraftDrCrFlag() })
        );
        setInitialFormSnapshotJson(null);
        setInitialSavePreviewJson(null);
        if (routeView !== "register") {
          navigate(registerRoutePath(), { replace: true });
        }
      }
      await refetch();
    } catch (err: any) {
      toastRef.current?.show({
        severity: "error",
        summary: "Error",
        detail: err?.message || "Failed to delete voucher",
      });
    } finally {
      setSaving(false);
    }
  };

  const resolveDeleteTargetRow = useCallback((): VoucherRow | null => {
    if (!editingId) return null;
    return (
      selectedRow ??
      rows.find((item) => hasSameNumericId(item.voucherId, editingId)) ??
      ({ voucherId: editingId, voucherNumber: voucherNo } as VoucherRow)
    );
  }, [editingId, rows, selectedRow, voucherNo]);

  const runDryDeleteCheck = useCallback(() => {
    void (async () => {
      if (!editingId) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Delete",
          detail: "Select a voucher to test delete.",
        });
        return;
      }
      const row = resolveDeleteTargetRow();
      if (!row) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Delete",
          detail: "Voucher context is not available.",
        });
        return;
      }

      const voucherId = toPositiveId(row.voucherId);
      if (voucherId == null) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Delete",
          detail: "Voucher ID is invalid.",
        });
        return;
      }

      const voucherLabel = row.voucherNumber?.trim() || String(voucherId);
      const isReconciled = Number(row.isReconciledFlag ?? 0) === 1;
      const isCancelled = Number(row.isCancelledFlag ?? 0) === 1;

      let backendCanDelete: boolean | null = null;
      let backendReason: string | null = null;
      let backendReceiptMetaCount = 0;
      let backendIsReconciledFlag = isReconciled ? 1 : 0;
      let backendIsCancelledFlag = isCancelled ? 1 : 0;
      let backendIsPostedFlag = 0;
      let backendPostingLineCount = 0;
      let backendFkConstraintCount = 0;
      let backendFkReferenceCount = 0;
      let backendFkBlockingReferenceCount = 0;
      let backendFkReferenceDetails: Array<{
        constraintName: string;
        childSchema: string;
        childTable: string;
        childColumn: string;
        rowCount: number;
        isCleanupHandled: boolean;
        isConstraintValidated: boolean;
      }> = [];

      try {
        const response = await apolloClient.query({
          query: CAN_DELETE_VOUCHER,
          variables: { voucherId },
          fetchPolicy: "network-only",
        });
        const result = response.data?.canDeleteVoucherEntry;
        if (result) {
          backendCanDelete = Boolean(result.canDelete);
          backendReason =
            typeof result.reason === "string" ? result.reason : null;
          backendReceiptMetaCount = Number(result.receiptMetaCount ?? 0);
          backendIsReconciledFlag = Number(
            result.isReconciledFlag ?? backendIsReconciledFlag
          );
          backendIsCancelledFlag = Number(
            result.isCancelledFlag ?? backendIsCancelledFlag
          );
          backendIsPostedFlag = Number(result.isPostedFlag ?? 0);
          backendPostingLineCount = Number(result.postingLineCount ?? 0);
          backendFkConstraintCount = Number(result.fkConstraintCount ?? 0);
          backendFkReferenceCount = Number(result.fkReferenceCount ?? 0);
          backendFkBlockingReferenceCount = Number(
            result.fkBlockingReferenceCount ?? 0
          );
          backendFkReferenceDetails = Array.isArray(result.fkReferenceDetails)
            ? result.fkReferenceDetails.map((entry: any) => ({
                constraintName:
                  typeof entry?.constraintName === "string"
                    ? entry.constraintName
                    : "",
                childSchema:
                  typeof entry?.childSchema === "string"
                    ? entry.childSchema
                    : "",
                childTable:
                  typeof entry?.childTable === "string" ? entry.childTable : "",
                childColumn:
                  typeof entry?.childColumn === "string"
                    ? entry.childColumn
                    : "",
                rowCount: Number(entry?.rowCount ?? 0),
                isCleanupHandled: Boolean(entry?.isCleanupHandled),
                isConstraintValidated: Boolean(entry?.isConstraintValidated),
              }))
            : [];
        } else {
          backendCanDelete = false;
          backendReason = "Delete eligibility response was empty.";
        }
      } catch (error: any) {
        backendCanDelete = false;
        backendReason =
          error?.message || "Failed to fetch delete eligibility from server.";
      }

      const checks: DrySaveCheckItem[] = [
        {
          label: "Voucher selected",
          passed: Boolean(row),
          detail: `Voucher #${voucherLabel}`,
        },
        {
          label: "Voucher ID valid",
          passed: voucherId != null,
          detail: String(voucherId),
        },
        {
          label: "UI reconciliation lock check",
          passed: !isReconciled,
          detail: isReconciled
            ? "Reconciled voucher; delete should be blocked."
            : "Voucher is unreconciled.",
        },
        {
          label: "Server delete eligibility",
          passed: backendCanDelete === true,
          detail:
            backendCanDelete === true
              ? "Server allows delete."
              : backendReason || "Server blocked delete.",
        },
        {
          label: "Server reconciliation status",
          passed: backendIsReconciledFlag !== 1,
          detail:
            backendIsReconciledFlag === 1
              ? "Server marks voucher as reconciled."
              : "Server marks voucher as unreconciled.",
        },
        {
          label: "Server posted status (delete policy)",
          passed: backendIsPostedFlag !== 1,
          detail:
            backendIsPostedFlag === 1
              ? `Posted with ${backendPostingLineCount} posting line(s); use Cancel + Reversal entry.`
              : `Unposted draft with ${backendPostingLineCount} posting line(s).`,
        },
        {
          label: "Server cancellation status",
          passed: true,
          detail:
            backendIsCancelledFlag === 1
              ? "Cancelled."
              : "Active (not cancelled).",
        },
        {
          label: "Database FK constraint coverage",
          passed: backendFkConstraintCount > 0,
          detail:
            backendFkConstraintCount > 0
              ? `${backendFkConstraintCount} FK constraint(s) reference vouchers.`
              : "No FK constraint found for accounts.vouchers in this database.",
        },
        {
          label: "Database FK blocking references",
          passed: backendFkBlockingReferenceCount === 0,
          detail:
            backendFkBlockingReferenceCount > 0
              ? `${backendFkBlockingReferenceCount} blocking FK-linked row(s) found.`
              : backendFkReferenceCount > 0
              ? `${backendFkReferenceCount} FK-linked row(s) found in auto-cleanup tables only.`
              : "No FK-linked rows found.",
        },
        {
          label: "Receipt-meta linkage count",
          passed: true,
          detail: `${backendReceiptMetaCount} linked receipt meta row(s)`,
        },
      ];
      const failedChecksCount = checks.filter((check) => !check.passed).length;
      const deleteWouldProceed = failedChecksCount === 0;

      confirmDialog({
        header: deleteWouldProceed
          ? "Dry Delete Check: Delete would proceed"
          : "Dry Delete Check: Delete blocked",
        message: (
          <div className="flex flex-column gap-3" style={{ maxWidth: "46rem" }}>
            <div className="text-700">{`Voucher: #${voucherLabel}`}</div>
            <div className="flex flex-column gap-1">
              {checks.map((check) => (
                <div key={check.label}>
                  <strong>{check.passed ? "PASS" : "FAIL"}:</strong>{" "}
                  {check.label} ({check.detail})
                </div>
              ))}
            </div>
            {backendFkReferenceDetails.length > 0 ? (
              <div className="flex flex-column gap-1">
                <div className="font-semibold">FK reference details</div>
                {backendFkReferenceDetails.map((detail) => {
                  const tableLabel = `${detail.childSchema}.${detail.childTable}`;
                  const validationLabel = detail.isConstraintValidated
                    ? "validated"
                    : "not validated";
                  const modeLabel = detail.isCleanupHandled
                    ? "auto-cleanup"
                    : "blocking";
                  return (
                    <div
                      key={`${detail.constraintName}-${tableLabel}-${detail.childColumn}`}
                    >
                      {tableLabel}.{detail.childColumn}: {detail.rowCount}{" "}
                      row(s), {modeLabel}, {validationLabel} (
                      {detail.constraintName})
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="text-700">
              {deleteWouldProceed
                ? "Result: delete mutation can be attempted."
                : "Result: delete mutation should be blocked based on current checks."}
            </div>
            <div className="text-600">
              No records were deleted. This is a dry-run check only.
            </div>
          </div>
        ),
        footer: (options) => (
          <Button
            label="Close"
            icon="pi pi-check"
            className="p-button-sm"
            onClick={options.reject}
            autoFocus
          />
        ),
        reject: () => undefined,
      });
    })();
  }, [apolloClient, editingId, resolveDeleteTargetRow, toastRef]);

  const handleDelete = () => {
    void (async () => {
      if (!editingId) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Delete",
          detail: "Select a voucher to delete.",
        });
        return;
      }
      const row = resolveDeleteTargetRow();
      if (!row) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Delete",
          detail: "Voucher context is not available.",
        });
        return;
      }
      const voucherId = toPositiveId(row.voucherId);
      if (voucherId == null) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Delete",
          detail: "Voucher ID is invalid.",
        });
        return;
      }
      let canDelete = false;
      let reason: string | null = null;
      try {
        const response = await apolloClient.query({
          query: CAN_DELETE_VOUCHER,
          variables: { voucherId },
          fetchPolicy: "network-only",
        });
        const result = response.data?.canDeleteVoucherEntry;
        canDelete = Boolean(result?.canDelete);
        reason = typeof result?.reason === "string" ? result.reason : null;
      } catch (error: any) {
        toastRef.current?.show({
          severity: "error",
          summary: "Delete",
          detail: error?.message || "Failed to verify delete eligibility.",
        });
        return;
      }
      if (!canDelete) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Delete blocked",
          detail:
            reason ||
            "Voucher cannot be deleted under current accounting policy.",
        });
        return;
      }
      confirmDialog({
        header: "Delete Voucher?",
        message: `Delete voucher #${row.voucherNumber ?? row.voucherId}?`,
        icon: "pi pi-exclamation-triangle",
        rejectLabel: "No",
        acceptLabel: "Delete",
        acceptClassName: "p-button-danger",
        accept: () => {
          void deleteRow(row);
        },
        reject: () => undefined,
      });
    })();
  };

  const leaveForm = useCallback(() => {
    resetVoucherFormState();
    if (routeView !== "register") {
      navigate(registerRoutePath(), { replace: true });
    }
  }, [navigate, registerRoutePath, resetVoucherFormState, routeView]);

  const cancelForm = useCallback(() => {
    if (!isFormActive) {
      leaveForm();
      return;
    }
    if (!isFormDirty) {
      leaveForm();
      return;
    }
    confirmDialog({
      header: "Discard Changes?",
      message: "Unsaved changes will be lost.",
      icon: "pi pi-exclamation-triangle",
      rejectLabel: "Keep Editing",
      acceptLabel: "Discard",
      acceptClassName: "p-button-danger",
      accept: leaveForm,
      reject: () => undefined,
    });
  }, [isFormActive, isFormDirty, leaveForm]);

  const handleCancelVoucherToggle = useCallback(() => {
    if (!isFormActive || saving) return;
    const nextCancelledValue = !cancelledChecked;
    const isCancelling = nextCancelledValue;
    confirmDialog({
      header: isCancelling ? "Cancel Voucher?" : "Remove Cancelled Mark?",
      message: isCancelling
        ? "This voucher will be marked as cancelled when saved."
        : "This voucher will be marked as active when saved.",
      icon: "pi pi-exclamation-triangle",
      rejectLabel: "No",
      acceptLabel: isCancelling ? "Cancel Voucher" : "Mark Active",
      acceptClassName: isCancelling ? "p-button-danger" : undefined,
      accept: () => setCancelledChecked(nextCancelledValue),
      reject: () => undefined,
    });
  }, [cancelledChecked, isFormActive, saving]);

  const save = async ({
    intent = "primary",
  }: { intent?: PaymentVoucherSaveIntent } = {}) => {
    if (!isFormActive || saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    try {
      const isEditing = editingId != null;
      const debitLines = lines
        .map((line) => ({
          ledgerId: line.ledgerId != null ? Number(line.ledgerId) : null,
          amount: line.amount,
          drCrFlag: allowLineDrCrSelection
            ? normalizeLineDrCrFlag(line.drCrFlag)
            : lineEntryDrCrFlag,
        }))
        .filter(
          (line) => line.ledgerId && line.amount && Number(line.amount) > 0
        )
        .map((line) => ({
          ledgerId: Number(line.ledgerId),
          amount: Number(line.amount),
          drCrFlag: normalizeLineDrCrFlag(line.drCrFlag),
        }));
      const total = debitLines.reduce(
        (sum, line) => sum + Number(line.amount || 0),
        0
      );
      const effectiveCashLedgerAmount =
        cashLedgerAmountDraft !== undefined
          ? cashLedgerAmountDraft
          : cashLedgerAmount;
      const headerAmount =
        effectiveCashLedgerAmount != null
          ? Number(effectiveCashLedgerAmount)
          : 0;
      const lineTotalsForSave = summarizeLineAmounts(
        debitLines,
        headerDrCrFlag
      );
      const lineTotalForSchema = allowLineDrCrSelection
        ? lineTotalsForSave.netAgainstHeader
        : total;

      const parsed = voucherFormSchema.safeParse({
        voucherNo: voucherNo.trim(),
        voucherDate,
        postingDate,
        refDate,
        voucherTypeId: voucherTypeId ?? 0,
        cashLedgerId: cashLedgerId ?? 0,
        cashLedgerAmount: headerAmount,
        debitLines,
        isCashMode,
        lineEntryLabel: lineEntryLedgerLabel,
        lineEntryDrCrLabel,
        requiresManager,
        managerLabel,
        managerId: formManagerId ?? null,
        lineTotal: lineTotalForSchema,
      });

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        let nextVoucherDateError: string | null = null;
        let nextPostingDateError: string | null = null;
        let nextRefDateError: string | null = null;

        parsed.error.issues.forEach((issue) => {
          const pathKey = issue.path[0] ? String(issue.path[0]) : "form";
          if (pathKey === "voucherDate") {
            nextVoucherDateError = issue.message;
            return;
          }
          if (pathKey === "postingDate") {
            nextPostingDateError = issue.message;
            return;
          }
          if (pathKey === "refDate") {
            nextRefDateError = issue.message;
            return;
          }
          const resolvedKey = pathKey === "voucherTypeId" ? "form" : pathKey;
          if (!nextErrors[resolvedKey]) {
            nextErrors[resolvedKey] = issue.message;
          }
        });
        if (!nextErrors.form) {
          nextErrors.form = "Please review highlighted fields before saving.";
        }

        setVoucherDateError(nextVoucherDateError);
        setPostingDateError(nextPostingDateError);
        setRefDateError(nextRefDateError);
        setFormErrors(nextErrors);
        return;
      }

      setVoucherDateError(null);
      setPostingDateError(null);
      setRefDateError(null);
      setFormErrors({});

      if (referenceDate2Error) {
        setFormErrors({
          form: "Please review highlighted fields before saving.",
        });
        return;
      }

      if (Math.abs(headerAmount - lineTotalsForSave.netAgainstHeader) > 0.01) {
        const detail = allowLineDrCrSelection
          ? `Primary ${headerDrCrLabel} amount should match net line postings (${formatAmount(
              lineTotalsForSave.netAgainstHeader
            )}).`
          : `${paymentLedgerLabel} amount should match total ${lineEntryLedgerLabel.toLowerCase()} lines.`;
        setFormErrors({
          cashLedgerAmount: detail,
          debitLines: "Dr/Cr posting is not balanced.",
          form: "Please review highlighted fields before saving.",
        });
        return;
      }

      if (isBillWiseMode) {
        const nextErrors: Record<string, string> = {};
        if (
          billWisePartyLedgerId == null ||
          Number(billWisePartyLedgerId) <= 0
        ) {
          nextErrors.billWisePartyLedgerId =
            "Select party ledger for bill-wise entry.";
        }
        if (billWiseRowsForSave.length === 0 || billWiseAppliedTotal <= 0) {
          nextErrors.billWiseInvoiceRows =
            "Select at least one bill with adjusted amount.";
        }
        if (
          billWiseDiscountAmountValue > 0 &&
          (billWiseDiscountLedgerId == null ||
            Number(billWiseDiscountLedgerId) <= 0)
        ) {
          nextErrors.billWiseDiscountLedgerId =
            "Set default discount ledger in Global Options before entering discount amount.";
        }
        if (
          billWiseChequeReturnChargesValue > 0 &&
          (billWiseChequeReturnLedgerId == null ||
            Number(billWiseChequeReturnLedgerId) <= 0)
        ) {
          nextErrors.billWiseChequeReturnLedgerId =
            "Set default cheque return charges ledger in Global Options before entering charges.";
        }
        if (Object.keys(nextErrors).length > 0) {
          setFormErrors({
            ...nextErrors,
            form: "Please review highlighted fields before saving.",
          });
          return;
        }
      }

      if (isReceiptCashFlow) {
        const receiptValidationErrors: Record<string, string> = {};
        const selectedSalesmanId = toPositiveId(formSalesmanId);
        if (selectedSalesmanId == null) {
          receiptValidationErrors.salesmanId = "Select salesman.";
        }

        const currentReceiptNo = refNo.trim();
        if (!currentReceiptNo) {
          receiptValidationErrors.refNo = "Enter receipt no.";
        }
        const parsedReceiptNo = parseReceiptNoValue(currentReceiptNo);
        if (currentReceiptNo && parsedReceiptNo == null) {
          receiptValidationErrors.refNo = "Receipt no should be numeric.";
        }

        if (selectedSalesmanId != null && salesmanIssueBooks.length === 0) {
          receiptValidationErrors.salesmanId =
            "Receipt book is not issued for selected salesman.";
        }

        const selectedIssueBook =
          selectedReceiptIssueBookId != null
            ? salesmanIssueBookMap.get(selectedReceiptIssueBookId) ?? null
            : null;
        if (
          selectedSalesmanId != null &&
          salesmanIssueBooks.length > 0 &&
          !selectedIssueBook
        ) {
          receiptValidationErrors.chequeIssueBookId = "Select receipt book.";
        }
        if (
          selectedSalesmanId != null &&
          parsedReceiptNo != null &&
          selectedIssueBook != null &&
          !isReceiptNumberInRange(parsedReceiptNo, selectedIssueBook)
        ) {
          receiptValidationErrors.refNo =
            "Receipt no is outside selected receipt book range.";
        }

        if (
          !isEditing &&
          selectedIssueBook != null &&
          parsedReceiptNo != null &&
          hasDuplicateReceiptNoInBookEntries(
            salesmanIssueEntries,
            selectedIssueBook.moneyReceiptIssueBookId,
            parsedReceiptNo,
            selectedReceiptIssueUsageStartDateKey
          )
        ) {
          receiptValidationErrors.refNo = "Duplicate receipt no.";
        }

        if (Object.keys(receiptValidationErrors).length > 0) {
          setFormErrors({
            ...receiptValidationErrors,
            form: "Please review highlighted fields before saving.",
          });
          return;
        }
      }

      if (isChequePayment) {
        const chequeValidationErrors: Record<string, string> = {};
        const selectedChequeBookId = toPositiveId(chequeIssueBookId);
        const selectedChequeBook =
          selectedChequeBookId != null
            ? chequeBookOptionMap.get(selectedChequeBookId) ?? null
            : null;
        if (!selectedChequeBook) {
          chequeValidationErrors.chequeIssueBookId = "Select cheque book.";
        }

        const chequeNoText = refNo.trim();
        if (!chequeNoText) {
          chequeValidationErrors.refNo = "Enter cheque no.";
        } else {
          const chequeNoValue = normalizeChequeNumber(chequeNoText);
          if (chequeNoValue == null) {
            chequeValidationErrors.refNo = "Cheque no should be numeric.";
          } else if (
            !isChequeNumberInRange(chequeNoValue, selectedChequeBook)
          ) {
            const rangeLabel =
              selectedChequeBook?.chequeStartNumber != null &&
              selectedChequeBook?.chequeEndNumber != null
                ? `${selectedChequeBook.chequeStartNumber} to ${selectedChequeBook.chequeEndNumber}`
                : null;
            chequeValidationErrors.refNo = rangeLabel
              ? `Cheque no should be in range ${rangeLabel}.`
              : "Cheque no is outside selected cheque book range.";
          }
        }

        if (Object.keys(chequeValidationErrors).length > 0) {
          setFormErrors({
            ...chequeValidationErrors,
            form: "Please review highlighted fields before saving.",
          });
          return;
        }
      }

      if (!voucherDate || !postingDate) return;

      if (modeConfig.enforceSingleEntryLine && debitLines.length !== 1) {
        setFormErrors({
          debitLines: `Add exactly one ${lineEntryLedgerLabel.toLowerCase()} line.`,
          form: "Please review highlighted fields before saving.",
        });
        return;
      }
      if (
        modeConfig.disallowEntryLedgerEqualsPrimary &&
        cashLedgerId != null &&
        debitLines.some(
          (line) => Number(line.ledgerId) === Number(cashLedgerId)
        )
      ) {
        setFormErrors({
          debitLines: `${lineEntryLedgerLabel} cannot be the same as primary ledger.`,
          form: "Please review highlighted fields before saving.",
        });
        return;
      }

      setSaving(true);
      try {
        const headerNarration = narration.trim() ? narration.trim() : null;
        const paymentViaValue = showPaymentVia
          ? toPositiveId(paymentViaId)
          : null;
        const chequeInFavourText =
          isChequePayment && chequeInFavour.trim()
            ? chequeInFavour.trim()
            : null;
        const chequeIssueBookValue = isChequePayment || isReceiptCashFlow
          ? toPositiveId(chequeIssueBookId)
          : null;
        const preservedHeaderLines =
          isEditing || isBillWiseMode
            ? supplementaryHeaderPostingLines
                .map((line) => ({
                  ledgerId:
                    line.ledgerId != null ? Number(line.ledgerId) : null,
                  amount: line.amount != null ? Number(line.amount) : null,
                  drCrFlag:
                    line.drCrFlag != null ? Number(line.drCrFlag) : null,
                  narrationText:
                    typeof line.narrationText === "string" &&
                    line.narrationText.trim().length > 0
                      ? line.narrationText.trim()
                      : null,
                }))
                .filter(
                  (
                    line
                  ): line is {
                    ledgerId: number;
                    amount: number;
                    drCrFlag: number;
                    narrationText: string | null;
                  } =>
                    line.ledgerId != null &&
                    line.amount != null &&
                    Number.isFinite(line.amount) &&
                    line.amount > 0 &&
                    line.drCrFlag != null &&
                    Number.isFinite(line.drCrFlag)
                )
            : [];
        const preservedHeaderAmount = preservedHeaderLines.reduce(
          (sum, line) => sum + Number(line.amount || 0),
          0
        );
        const primaryHeaderAmount = Math.max(
          headerAmount - preservedHeaderAmount,
          0
        );
        if (
          cashLedgerId != null &&
          preservedHeaderLines.length > 0 &&
          primaryHeaderAmount <= 0
        ) {
          setFormErrors({
            cashLedgerAmount: `${
              modeConfig.headerLedgerLabel
            } amount should be greater than preserved adjustments (${formatAmount(
              preservedHeaderAmount
            )}).`,
            form: "Please review highlighted fields before saving.",
          });
          return;
        }
        const voucherLines = [
          ...debitLines.map((line) => ({
            ledgerId: line.ledgerId,
            amount: line.amount,
            drCrFlag: line.drCrFlag,
            narrationText: headerNarration,
          })),
          {
            ledgerId: cashLedgerId,
            amount: primaryHeaderAmount,
            drCrFlag: headerDrCrFlag,
            narrationText: headerNarration,
          },
          ...preservedHeaderLines.map((line) => ({
            ledgerId: line.ledgerId,
            amount: line.amount,
            drCrFlag: line.drCrFlag,
            narrationText: line.narrationText ?? headerNarration,
          })),
        ];
        const normalizedVoucherNumber = voucherNo.trim()
          ? voucherNo.trim()
          : null;
        const normalizedReferenceNumber = refNo.trim() ? refNo.trim() : null;
        const normalizedReferenceDateText = refDate
          ? toDateText(refDate)
          : null;
        const normalizedReferenceNumber2 = referenceNo2.trim()
          ? referenceNo2.trim()
          : null;
        const normalizedReferenceDate2Text = referenceDate2
          ? toDateText(referenceDate2)
          : null;
        const normalizedReasonForIssueText = reasonForIssue.trim()
          ? reasonForIssue.trim()
          : null;
        const variables = {
          voucherTypeId,
          voucherDateText: toDateText(voucherDate),
          postingDateText: postingDate ? toDateText(postingDate) : null,
          voucherNumber: normalizedVoucherNumber,
          narrationText: headerNarration,
          purchaseVoucherNumber: normalizedReferenceNumber,
          purchaseVoucherDateText: normalizedReferenceDateText,
          referenceNumber2: normalizedReferenceNumber2,
          referenceDate2: normalizedReferenceDate2Text,
          reasonForIssueText: normalizedReasonForIssueText,
          isTaxationFlag: isTaxInvoiceProfile ? 1 : null,
          managerId: requiresManager ? formManagerId : null,
          chequeInFavourText,
          chequeIssueBookId: chequeIssueBookValue,
          paymentViaId: paymentViaValue,
          primaryLedgerId: cashLedgerId,
          isCancelledFlag: cancelledChecked ? 1 : 0,
          ...(isBillWiseMode
            ? {
                billDetails: billWiseRowsForSave.map((row) => ({
                  saleInvoiceId: Number(row.saleInvoiceId),
                  appliedAmount: Number(row.appliedAmount ?? 0),
                  isDebitNoteFlag: row.isDebitNote ? 1 : 0,
                })),
              }
            : {}),
          lines: voucherLines,
        };
        let savedVoucherId =
          isEditing && editingId != null ? Number(editingId) : null;

        if (isEditing) {
          await updateVoucher({
            variables: { voucherId: editingId, ...variables },
          });
        } else {
          const createResult = await createVoucher({ variables });
          const createdVoucherId = Number(
            createResult.data?.createVoucher?.voucherId ?? 0
          );
          savedVoucherId =
            Number.isFinite(createdVoucherId) && createdVoucherId > 0
              ? createdVoucherId
              : null;
        }

        const savedVoucherNo =
          voucherNo.trim() ||
          (savedVoucherId != null ? String(savedVoucherId) : "");
        const postSaveAction = resolvePaymentVoucherPostSaveAction({
          isEditing,
          addAnotherAfterSave,
          intent,
        });
        toastRef.current?.show({
          severity: "success",
          summary: "Saved",
          detail: buildPaymentVoucherSaveSuccessMessage(
            savedVoucherNo,
            postSaveAction
          ),
        });

        if (savedVoucherId != null) {
          const recentSavedEntry: RecentlySavedVoucher = {
            voucherId: savedVoucherId,
            voucherNo: savedVoucherNo || String(savedVoucherId),
            savedAt: new Date().toISOString(),
            mode: paymentMode,
          };
          setLastSavedVoucher(recentSavedEntry);
          recordRecentlySavedVoucher(recentSavedEntry);
        }
        if (isEditing && savedVoucherId != null) {
          // After edit-save, treat the current server-backed form as clean.
          markCurrentFormSnapshotAsClean();
          postSaveRebaselineRef.current = true;
        }

        const refreshedRegisterVariables = { ...registerVariables, offset: 0 };
        setFirst(0);
        setAppliedVariables(refreshedRegisterVariables);
        setFilterSourceRows(null);
        setFilterSourceLoading(false);
        let refreshedRows: VoucherRow[] = [];
        if (hasApplied) {
          const refreshed = await refetch(refreshedRegisterVariables);
          const refreshedItems =
            refreshed.data?.voucherRegisterByLedgerDetailed?.items;
          refreshedRows = Array.isArray(refreshedItems)
            ? (refreshedItems as VoucherRow[])
            : [];
        }

        if (!isEditing) {
          if (postSaveAction === "prepare-next") {
            openAdd();
            return;
          }
          resetVoucherFormState();
          if (routeView !== "register") {
            navigate(registerRoutePath(), { replace: true });
          }
          return;
        }

        const shouldRefreshEditBeforeHydration =
          isEditing && savedVoucherId != null;
        if (shouldRefreshEditBeforeHydration) {
          await refetchEdit({ voucherId: savedVoucherId }).catch(
            () => undefined
          );
        }

        // Keep user on the saved voucher after Save (no auto-return to register).
        if (savedVoucherId != null) {
          const savedVoucherToken = savedVoucherNo || String(savedVoucherId);
          const savedRow =
            refreshedRows.find(
              (row) => Number(row.voucherId) === savedVoucherId
            ) ??
            rows.find((row) => Number(row.voucherId) === savedVoucherId) ??
            null;
          if (savedRow) {
            openEditForRow(savedRow);
            return;
          }

          hydratedEditVoucherDataKeyRef.current = null;
          setSelectedRow(null);
          setEditingId(savedVoucherId);
          setIsFormActive(true);
          setFocusNonce((value) => value + 1);
          queueVoucherDateFocus();
          setFormErrors({});
          setVoucherDateError(null);
          setPostingDateError(null);
          setRefDateError(null);
          setInitialFormSnapshotJson(null);
          setInitialSavePreviewJson(null);
          if (!shouldRefreshEditBeforeHydration) {
            refetchEdit({ voucherId: savedVoucherId }).catch(() => undefined);
          }
          const normalizedRouteVoucherNo = routeVoucherNo
            ? decodeRouteToken(routeVoucherNo)
            : null;
          if (
            routeView !== "edit" ||
            normalizedRouteVoucherNo !== savedVoucherToken
          ) {
            navigate(editRoutePath(savedVoucherToken), { replace: true });
          }
          return;
        }

        resetVoucherFormState();
        if (routeView !== "register") {
          navigate(registerRoutePath(), { replace: true });
        }
      } catch (err: any) {
        toastRef.current?.show({
          severity: "error",
          summary: "Error",
          detail: err?.message || "Failed to save voucher",
        });
      } finally {
        setSaving(false);
      }
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const runDrySaveCheck = useCallback(() => {
    if (!isFormActive) return;
    if (!initialSavePreviewJson) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Dry Save Check",
        detail:
          "Baseline snapshot is not ready yet. Re-open the voucher and try again.",
      });
      return;
    }

    let baselinePreview: VoucherSavePreview;
    try {
      baselinePreview = JSON.parse(
        initialSavePreviewJson
      ) as VoucherSavePreview;
    } catch {
      toastRef.current?.show({
        severity: "error",
        summary: "Dry Save Check",
        detail:
          "Baseline snapshot could not be parsed. Re-open the voucher and try again.",
      });
      return;
    }

    const currentPreview = buildCurrentSavePreview();
    const diffEntries = collectDeepDiffEntries(
      baselinePreview,
      currentPreview
    ).filter((entry) => !entry.path.startsWith("totals"));
    const visibleDiffEntries = diffEntries.slice(
      0,
      DRY_SAVE_DIFF_PREVIEW_LIMIT
    );
    const hiddenDiffCount = Math.max(
      diffEntries.length - visibleDiffEntries.length,
      0
    );
    const hasPrimaryLedger =
      currentPreview.primaryLedgerId != null &&
      Number(currentPreview.primaryLedgerId) > 0;
    const entryLines = currentPreview.lines.filter(
      (line) =>
        line.source === "entry" &&
        line.ledgerId != null &&
        Number(line.amount) > 0
    );
    const hasBalancedAmount =
      Math.abs(
        Number(currentPreview.totals.headerAmount || 0) -
          Number(currentPreview.totals.lineNetAgainstHeader || 0)
      ) <= 0.01;
    const hasSingleEntryLine = entryLines.length === 1;
    const hasNoPrimaryLedgerReuse = !entryLines.some(
      (line) =>
        line.ledgerId != null &&
        Number(line.ledgerId) === Number(currentPreview.primaryLedgerId)
    );
    const hasBillDetailsWhenEnabled =
      !isBillWiseMode || currentPreview.billDetails.length > 0;
    const hasChequeReference =
      !isChequePayment || Boolean(currentPreview.purchaseVoucherNumber);
    const checks: DrySaveCheckItem[] = [
      {
        label: "Voucher date available",
        passed: Boolean(currentPreview.voucherDateText),
        detail: currentPreview.voucherDateText || "Missing voucher date",
      },
      {
        label: "Posting date available",
        passed: Boolean(currentPreview.postingDateText),
        detail: currentPreview.postingDateText || "Missing posting date",
      },
      {
        label: "Primary ledger selected",
        passed: hasPrimaryLedger,
        detail: hasPrimaryLedger
          ? `Ledger ID ${currentPreview.primaryLedgerId}`
          : "Primary ledger not selected",
      },
      {
        label: "At least one line ledger row",
        passed: entryLines.length > 0,
        detail: `${entryLines.length} line(s)`,
      },
      {
        label: "Header and net line amounts are balanced",
        passed: hasBalancedAmount,
        detail: `Header ${formatAmount(
          currentPreview.totals.headerAmount
        )} vs Net ${formatAmount(currentPreview.totals.lineNetAgainstHeader)}`,
      },
    ];

    if (modeConfig.enforceSingleEntryLine) {
      checks.push({
        label: "Single entry line rule",
        passed: hasSingleEntryLine,
        detail: `${entryLines.length} line(s)`,
      });
    }
    if (modeConfig.disallowEntryLedgerEqualsPrimary) {
      checks.push({
        label: "Primary/entry ledger should differ",
        passed: hasNoPrimaryLedgerReuse,
        detail: hasNoPrimaryLedgerReuse
          ? "No duplicate ledger found"
          : "Entry line uses primary ledger",
      });
    }
    if (isBillWiseMode) {
      checks.push({
        label: "Bill-wise details present",
        passed: hasBillDetailsWhenEnabled,
        detail: `${currentPreview.billDetails.length} bill row(s)`,
      });
    }
    if (isChequePayment) {
      checks.push({
        label: "Cheque reference number present",
        passed: hasChequeReference,
        detail: hasChequeReference
          ? "Reference no. available"
          : "Reference no. missing",
      });
    }

    const failedChecksCount = checks.filter((check) => !check.passed).length;
    confirmDialog({
      header:
        diffEntries.length > 0
          ? `Dry Save Check: ${diffEntries.length} payload change(s)`
          : "Dry Save Check: No payload changes",
      message: (
        <div className="flex flex-column gap-3" style={{ maxWidth: "56rem" }}>
          <div className="text-700">
            {editingId != null
              ? `Comparing current form against loaded voucher #${
                  voucherNo.trim() || editingId
                }.`
              : "Comparing current form against initial form baseline."}
          </div>

          <div className="flex flex-column gap-2">
            <div className="font-semibold">Checks executed</div>
            <div className="flex flex-column gap-1">
              {checks.map((check) => (
                <div key={check.label}>
                  <strong>{check.passed ? "PASS" : "FAIL"}:</strong>{" "}
                  {check.label} ({check.detail})
                </div>
              ))}
            </div>
            <div className="text-600">
              {failedChecksCount === 0
                ? "All dry-save checks passed."
                : `${failedChecksCount} check(s) failed.`}
            </div>
          </div>

          <div className="flex flex-column gap-2">
            <div className="font-semibold">Payload differences</div>
            {visibleDiffEntries.length === 0 ? (
              <div className="text-700">
                No payload difference found against baseline.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: "16rem",
                  overflowY: "auto",
                  border: "1px solid var(--surface-border)",
                  borderRadius: 6,
                  padding: "0.75rem",
                }}
              >
                {visibleDiffEntries.map((entry: DrySaveDiffEntry, index) => (
                  <div key={`${entry.path}-${index}`} className="mb-2">
                    <div className="font-semibold">{entry.path}</div>
                    <div className="text-600">
                      Before: {formatDryDiffValue(entry.before)}
                    </div>
                    <div>After: {formatDryDiffValue(entry.after)}</div>
                  </div>
                ))}
                {hiddenDiffCount > 0 ? (
                  <div className="text-600">
                    +{hiddenDiffCount} more changes not shown.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ),
      footer: (options) => (
        <Button
          label="Close"
          icon="pi pi-check"
          className="p-button-sm"
          onClick={options.reject}
          autoFocus
        />
      ),
      reject: () => undefined,
    });
  }, [
    buildCurrentSavePreview,
    editingId,
    initialSavePreviewJson,
    isBillWiseMode,
    isChequePayment,
    isFormActive,
    modeConfig.disallowEntryLedgerEqualsPrimary,
    modeConfig.enforceSingleEntryLine,
    toastRef,
    voucherNo,
  ]);

  const lineAmountSummary = useMemo(
    () => summarizeLineAmounts(lines, headerDrCrFlag),
    [headerDrCrFlag, lines, summarizeLineAmounts]
  );
  const totalDebit = useMemo(
    () => lineAmountSummary.netAgainstHeader,
    [lineAmountSummary]
  );
  const supplementaryHeaderPostingLinesDisplay = useMemo(
    () =>
      supplementaryHeaderPostingLines.map((line) => {
        const fallbackOption = paymentAgainstOptionMap.get(
          Number(line.ledgerId)
        );
        const ledgerLabel =
          (line.ledgerName ?? "").trim() ||
          fallbackOption?.label?.trim() ||
          `Ledger ${line.ledgerId}`;
        const fallbackLedgerGroupLabel =
          line.ledgerId != null
            ? ledgerGroupLabelByLedgerId.get(Number(line.ledgerId)) ?? null
            : null;
        const ledgerGroupLabel =
          (line.ledgerGroupName ?? "").trim() ||
          fallbackLedgerGroupLabel ||
          null;
        const drCrLabel = Number(line.drCrFlag) === 0 ? "Dr" : "Cr";
        return {
          ...line,
          ledgerLabel,
          ledgerGroupLabel,
          drCrLabel,
        };
      }),
    [
      ledgerGroupLabelByLedgerId,
      paymentAgainstOptionMap,
      supplementaryHeaderPostingLines,
    ]
  );
  const supplementaryHeaderPostingAmount = useMemo(
    () =>
      supplementaryHeaderPostingLinesDisplay.reduce(
        (sum, line) => sum + Number(line.amount || 0),
        0
      ),
    [supplementaryHeaderPostingLinesDisplay]
  );
  const selectedLine = useMemo(
    () =>
      selectedLineKey
        ? lines.find((line) => line.key === selectedLineKey) ?? null
        : null,
    [lines, selectedLineKey]
  );
  const isLineDraftValid = useMemo(() => {
    const ledgerId = Number(lineEditorDraft.ledgerId || 0);
    const draftAmount = Number(lineEditorDraft.amount || 0);
    if (!(ledgerId > 0 && draftAmount > 0)) return false;
    const headerAmountValue = Number(
      (cashLedgerAmountDraft !== undefined
        ? cashLedgerAmountDraft
        : cashLedgerAmount) || 0
    );
    const draftLineDrCrFlag = allowLineDrCrSelection
      ? normalizeLineDrCrFlag(lineEditorDraft.drCrFlag)
      : lineEntryDrCrFlag;
    if (lineEditorDraft.mode === "edit" && lineEditorDraft.targetKey) {
      const draftedLines = lines.map((line) =>
        line.key === lineEditorDraft.targetKey
          ? {
              ...line,
              amount: draftAmount,
              drCrFlag: draftLineDrCrFlag,
            }
          : line
      );
      const nextTotals = summarizeLineAmounts(draftedLines, headerDrCrFlag);
      return nextTotals.netAgainstHeader <= headerAmountValue + 0.00001;
    }
    if (headerAmountValue <= 0) return false;
    const nextTotals = summarizeLineAmounts(
      [
        ...lines,
        { amount: draftAmount, drCrFlag: draftLineDrCrFlag } as DebitLineDraft,
      ],
      headerDrCrFlag
    );
    return nextTotals.netAgainstHeader <= headerAmountValue + 0.00001;
  }, [
    allowLineDrCrSelection,
    cashLedgerAmount,
    cashLedgerAmountDraft,
    headerDrCrFlag,
    lineEditorDraft.amount,
    lineEditorDraft.drCrFlag,
    lineEditorDraft.ledgerId,
    lineEditorDraft.mode,
    lineEditorDraft.targetKey,
    lineEntryDrCrFlag,
    lines,
    normalizeLineDrCrFlag,
    summarizeLineAmounts,
  ]);
  const effectiveCashLedgerAmount =
    cashLedgerAmountDraft !== undefined
      ? cashLedgerAmountDraft
      : cashLedgerAmount;
  const effectivePrimaryLedgerAmount = useMemo(() => {
    const totalHeaderAmount = Number(effectiveCashLedgerAmount || 0) || 0;
    const adjustedAmount = totalHeaderAmount - supplementaryHeaderPostingAmount;
    return adjustedAmount > 0 ? adjustedAmount : 0;
  }, [effectiveCashLedgerAmount, supplementaryHeaderPostingAmount]);
  const differenceAmount = useMemo(
    () => (Number(effectiveCashLedgerAmount || 0) || 0) - totalDebit,
    [effectiveCashLedgerAmount, totalDebit]
  );
  const differenceLabel = useMemo(() => {
    const absValue = Math.abs(differenceAmount);
    const oppositeHeaderLabel = headerDrCrLabel === "Dr" ? "Cr" : "Dr";
    const suffix =
      differenceAmount >= 0
        ? headerDrCrLabel
        : allowLineDrCrSelection
        ? oppositeHeaderLabel
        : lineEntryDrCrLabel;
    return `${formatAmount(absValue)} ${suffix}`;
  }, [
    allowLineDrCrSelection,
    differenceAmount,
    headerDrCrLabel,
    lineEntryDrCrLabel,
  ]);

  const mapDisplayRow = useCallback(
    (row: VoucherRow): PaymentVoucherDisplayRow => {
      const typeId =
        row.voucherTypeId != null ? Number(row.voucherTypeId) : null;
      const isProfileVoucherType =
        typeId != null && profileVoucherTypeIds.includes(typeId);
      const voucherTypeName = row.voucherTypeName?.trim() ?? "";
      const voucherType =
        voucherTypeName || (isProfileVoucherType ? voucherLabelSingular : "");
      const voucherNo = row.voucherNumber ?? "";
      const voucherDateDisplay = formatDate(row.voucherDate);
      const postingDateDisplay = formatDate(row.postingDate);
      const sourceKindFallback = profile.key === "receipt" ? paymentMode : "";
      const sourceKind = (row.sourceKind ?? sourceKindFallback)
        .trim()
        .toLowerCase();
      const isReceiptCashRow = sourceKind === "cash";
      const isReceiptBankRow = sourceKind === "bank";
      const isLegacyReceiptRow = isReceiptCashRow || isReceiptBankRow;
      const rowRefLookupKey = normalizeLookupKey(row.refNo);
      const rowVoucherLookupKey = normalizeLookupKey(row.voucherNumber);
      const rowVoucherNoAndDateLookupKey = buildVoucherNumberDateLookupKey(
        row.voucherNumber,
        row.voucherDate
      );
      const rowChequeLookupKey = normalizeLookupKey(row.chequeNo);
      const legacyCashFallbackRow = isReceiptCashRow
        ? legacyCashFallbackByVoucherNoAndDate.get(
            rowVoucherNoAndDateLookupKey
          ) ??
          legacyCashFallbackByVoucherNo.get(rowRefLookupKey) ??
          legacyCashFallbackByVoucherNo.get(rowVoucherLookupKey) ??
          null
        : null;
      const legacyBankFallbackByVoucher = isReceiptBankRow
        ? legacyBankFallbackByVoucherNoAndDate.get(
            rowVoucherNoAndDateLookupKey
          ) ??
          legacyBankFallbackByVoucherNo.get(rowRefLookupKey) ??
          legacyBankFallbackByVoucherNo.get(rowVoucherLookupKey) ??
          null
        : null;
      const legacyBankFallbackByCheque = isReceiptBankRow
        ? legacyBankFallbackByChequeNo.get(rowChequeLookupKey) ??
          legacyBankFallbackByChequeNo.get(rowRefLookupKey) ??
          null
        : null;
      const legacyBankFallbackRow = isReceiptBankRow
        ? legacyBankFallbackByVoucher ?? legacyBankFallbackByCheque ?? null
        : null;
      const fallbackChequeNo = legacyBankFallbackRow?.chequeNo?.trim() ?? "";
      const effectiveChequeNo = isReceiptBankRow
        ? row.chequeNo?.trim() || fallbackChequeNo
        : "";
      const fallbackChequeDateParsed = parseDateText(
        legacyBankFallbackRow?.chequeDateText ?? null
      );
      const fallbackChequeDateIso = fallbackChequeDateParsed
        ? fallbackChequeDateParsed.toISOString().slice(0, 10)
        : legacyBankFallbackRow?.chequeDateText ?? null;
      const refNoDisplayValue =
        isReceiptBankRow && effectiveChequeNo.length > 0
          ? effectiveChequeNo
          : row.refNo ?? "";
      const effectiveRefDate = isReceiptBankRow
        ? row.chequeDate ?? fallbackChequeDateIso ?? row.refDate
        : row.refDate;
      const refDateDisplayValue = formatDate(effectiveRefDate);
      const referenceNo2DisplayValue = row.referenceNumber2?.trim() ?? "";
      const referenceDate2DisplayValue = formatDate(row.referenceDate2 ?? null);
      const reasonForIssueDisplay = row.reasonForIssueText?.trim() ?? "";
      const referenceNo2DateDisplay =
        `${referenceNo2DisplayValue} ${referenceDate2DisplayValue}`.trim();
      const voucherDateKey = toDateKey(row.voucherDate);
      const postingDateKey = toDateKey(row.postingDate);
      const refDateKey = toDateKey(effectiveRefDate);
      const entryLedgerNamesText = row.debitLedgerNames ?? "";
      const entryLedgerPrimaryText = row.debitLedgerName ?? "";
      const entryLedgerAmountsText = row.debitLedgerAmounts ?? "";
      const headerLedgerPrimaryText = row.creditLedgerName ?? "";
      const headerLedgerNamesText = row.creditLedgerNames ?? "";
      const primaryLedgerName = (row.primaryLedgerName ?? "").trim();
      const primaryLedgerGroupName = (row.primaryLedgerGroupName ?? "").trim();
      const legacyEntryLedgerFallback = isReceiptBankRow
        ? legacyBankFallbackRow?.otherLedgerName?.trim() || ""
        : "";
      const legacyHeaderLedgerFallback = isReceiptBankRow
        ? legacyBankFallbackRow?.ledgerName?.trim() || ""
        : "";

      const ledgerDrNames = entryLedgerNamesText.trim();
      const ledgerDrPrimary = entryLedgerPrimaryText.trim();
      const ledgerDrDisplay =
        ledgerDrNames || ledgerDrPrimary || legacyEntryLedgerFallback;
      const ledgerDrTitle = ledgerDrDisplay;
      const debitLedgerGroupLinesDisplay = (row.debitLedgerGroupName ?? "")
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const debitLedgerAmountDetail = entryLedgerAmountsText.trim();
      const debitLedgerNames = (
        ledgerDrNames
          ? ledgerDrNames.split("\n")
          : ledgerDrPrimary
          ? [ledgerDrPrimary]
          : legacyEntryLedgerFallback
          ? [legacyEntryLedgerFallback]
          : []
      )
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const debitLedgerAmounts = debitLedgerAmountDetail
        ? debitLedgerAmountDetail.split("\n").map((value) => value.trim())
        : [];
      const creditLedgerPrimary = headerLedgerPrimaryText.trim();
      const creditLedgerNames = headerLedgerNamesText.trim();
      const creditLedgerFallback =
        creditLedgerNames.length > 0
          ? creditLedgerNames
              .split("\n")
              .map((name) => name.trim())
              .find(Boolean) ?? ""
          : "";
      const managerDisplay = isReceiptCashRow
        ? row.managerName?.trim() ||
          legacyCashFallbackRow?.managerName?.trim() ||
          ""
        : "";
      const salesmanDisplay = isReceiptCashRow
        ? row.salesmanName?.trim() ||
          legacyCashFallbackRow?.salesmanName?.trim() ||
          ""
        : "";
      const fullPaidFlag =
        row.isFullPaidFlag != null
          ? Number(row.isFullPaidFlag)
          : legacyCashFallbackRow?.isFullPaid
          ? 1
          : legacyBankFallbackRow?.isFullPaid
          ? 1
          : 0;
      const fullPaidDisplay = isLegacyReceiptRow
        ? fullPaidFlag === 1
          ? "Yes"
          : ""
        : "";
      const bankDisplay = isReceiptBankRow
        ? row.bankName?.trim() || legacyBankFallbackRow?.bankName?.trim() || ""
        : "";
      const branchDisplay = isReceiptBankRow
        ? row.branchName?.trim() ||
          legacyBankFallbackRow?.branchName?.trim() ||
          ""
        : "";
      const ledgerCrDisplay = isLegacyReceiptRow
        ? creditLedgerPrimary ||
          creditLedgerFallback ||
          legacyHeaderLedgerFallback ||
          primaryLedgerName ||
          (isReceiptBankRow ? bankDisplay : "") ||
          cashLedgerLabel
        : primaryLedgerName ||
          creditLedgerPrimary ||
          creditLedgerFallback ||
          legacyHeaderLedgerFallback ||
          (isReceiptBankRow ? bankDisplay : "") ||
          cashLedgerLabel;
      const parseLegacyAmountValue = (value: number | null | undefined) =>
        value != null && Number.isFinite(Number(value)) ? Number(value) : null;
      const formatLegacyAmount = (value: number | null | undefined) => {
        if (!isLegacyReceiptRow) return "";
        const parsed =
          value != null && Number.isFinite(Number(value)) ? Number(value) : 0;
        return formatAmount(parsed);
      };
      const legacyAmountFallback = isReceiptCashRow
        ? legacyCashFallbackRow
        : legacyBankFallbackRow;
      const totalAmountValue = parseLegacyAmountValue(
        row.totalAmount ??
          legacyAmountFallback?.totalAmount ??
          (isLegacyReceiptRow ? row.totalNetAmount : null)
      );
      const discountAmountValue =
        parseLegacyAmountValue(
          row.discountAmount ?? legacyAmountFallback?.discountAmount
        ) ?? 0;
      const legacyNetAmountValue =
        totalAmountValue != null
          ? Math.max(totalAmountValue - discountAmountValue, 0)
          : null;
      const primaryLineFallbackAmount =
        legacyNetAmountValue != null
          ? legacyNetAmountValue
          : row.totalNetAmount != null
          ? Number(row.totalNetAmount)
          : null;
      const ledgerDrLinesDisplay = debitLedgerNames.map((name, index) => {
        const rawAmount = debitLedgerAmounts[index];
        const parsed =
          rawAmount != null && rawAmount !== "" ? Number(rawAmount) : null;
        const fallback =
          parsed == null && index === 0 ? primaryLineFallbackAmount : null;
        const amount =
          parsed != null && Number.isFinite(parsed)
            ? formatAmount(parsed)
            : fallback != null && Number.isFinite(fallback)
            ? formatAmount(fallback)
            : rawAmount ?? "";
        return { name, amount };
      });
      const showLedgerDrAmounts = ledgerDrLinesDisplay.length > 1;
      const totalAmtDisplay = formatLegacyAmount(
        totalAmountValue ?? (isLegacyReceiptRow ? row.totalNetAmount : null)
      );
      const discountAmtDisplay = formatLegacyAmount(discountAmountValue);
      const adjustedAmtDisplay = formatLegacyAmount(
        row.adjustedAmount ??
          legacyAmountFallback?.adjustedAmount ??
          (isLegacyReceiptRow ? row.totalNetAmount : null)
      );
      const diffAmtDisplay = formatLegacyAmount(
        row.diffAmount ?? legacyAmountFallback?.diffAmount
      );
      const chequeReturnStatusDisplay = isLegacyReceiptRow
        ? row.chequeReturnStatus?.trim() ||
          (isReceiptBankRow
            ? legacyBankFallbackRow?.chequeReturnStatus?.trim() || ""
            : "") ||
          ((Number(
            row.chequeCancelCharges ??
              legacyAmountFallback?.chequeCancelCharges ??
              0
          ) || 0) > 0
            ? "Return"
            : "")
        : "";
      const chequeCancelChargesDisplay = formatLegacyAmount(
        row.chequeCancelCharges ?? legacyAmountFallback?.chequeCancelCharges
      );
      const netAmtDisplay = isLegacyReceiptRow
        ? formatLegacyAmount(legacyNetAmountValue ?? row.totalNetAmount)
        : row.totalNetAmount
        ? formatAmount(row.totalNetAmount)
        : "";
      const invoiceNos = String(row.billInvoiceNos ?? "")
        .split("\n")
        .map((value) => value.trim());
      const invoiceDates = String(row.billInvoiceDates ?? "")
        .split("\n")
        .map((value) => formatDate(value.trim()));
      const invoiceAmounts = String(row.billInvoiceAmounts ?? "")
        .split("\n")
        .map((value) => {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? formatAmount(parsed) : "";
        });
      const invoiceLineCount = Math.max(
        invoiceNos.length,
        invoiceDates.length,
        invoiceAmounts.length
      );
      const invoiceDetailsLinesDisplay = Array.from(
        { length: invoiceLineCount },
        (_, index) => {
          const invNo = invoiceNos[index] ?? "";
          const invDate = invoiceDates[index] ?? "";
          const invAmount = invoiceAmounts[index] ?? "";
          const line = `${invNo} | ${invDate} | ${invAmount}`.trim();
          return line === "||" ? "" : line;
        }
      ).filter((line) => line.replace(/\|/g, "").trim().length > 0);
      const fallbackInvoiceDetailsLinesDisplay = isReceiptCashRow
        ? legacyCashInvoiceLinesByVoucherNoAndDate.get(
            rowVoucherNoAndDateLookupKey
          ) ??
          legacyCashInvoiceLinesByVoucherNo.get(rowRefLookupKey) ??
          legacyCashInvoiceLinesByVoucherNo.get(rowVoucherLookupKey) ??
          []
        : isReceiptBankRow
        ? legacyBankInvoiceLinesByVoucherNoAndDate.get(
            rowVoucherNoAndDateLookupKey
          ) ??
          legacyBankInvoiceLinesByVoucherNo.get(rowRefLookupKey) ??
          legacyBankInvoiceLinesByVoucherNo.get(rowVoucherLookupKey) ??
          legacyBankInvoiceLinesByChequeNo.get(rowChequeLookupKey) ??
          legacyBankInvoiceLinesByChequeNo.get(rowRefLookupKey) ??
          []
        : [];
      const resolvedInvoiceDetailsLinesDisplay =
        invoiceDetailsLinesDisplay.length > 0
          ? invoiceDetailsLinesDisplay
          : fallbackInvoiceDetailsLinesDisplay;
      const resolvedDebitLedgerGroupLinesDisplay =
        debitLedgerGroupLinesDisplay.length > 0
          ? debitLedgerGroupLinesDisplay
          : isLegacyReceiptRow && primaryLedgerGroupName
          ? [primaryLedgerGroupName]
          : [];
      const primaryLedgerGroupDisplay = primaryLedgerGroupName;
      const voucherTypeNoDisplay = `${voucherType} ${
        row.voucherNumber ?? ""
      }`.trim();
      const voucherPostingDateDisplay =
        `${voucherDateDisplay} ${postingDateDisplay}`.trim();
      const refDisplay = `${refNoDisplayValue} ${refDateDisplayValue}`.trim();
      const searchableText = [
        voucherType,
        voucherNo,
        voucherTypeNoDisplay,
        voucherDateDisplay,
        postingDateDisplay,
        voucherPostingDateDisplay,
        refNoDisplayValue,
        refDateDisplayValue,
        refDisplay,
        referenceNo2DisplayValue,
        referenceDate2DisplayValue,
        referenceNo2DateDisplay,
        reasonForIssueDisplay,
        ledgerCrDisplay,
        ledgerDrDisplay,
        ledgerDrTitle,
        ledgerDrLinesDisplay
          .map((line) => `${line.name} ${line.amount}`)
          .join(" "),
        netAmtDisplay,
        row.totalNetAmount,
        row.narration,
        row.managerName,
        row.salesmanName,
        managerDisplay,
        salesmanDisplay,
        fullPaidDisplay,
        bankDisplay,
        branchDisplay,
        totalAmtDisplay,
        discountAmtDisplay,
        adjustedAmtDisplay,
        diffAmtDisplay,
        chequeReturnStatusDisplay,
        chequeCancelChargesDisplay,
        resolvedInvoiceDetailsLinesDisplay.join(" "),
        effectiveChequeNo,
        effectiveRefDate,
        primaryLedgerGroupDisplay,
        resolvedDebitLedgerGroupLinesDisplay.join(" "),
      ]
        .filter((value) => value != null && String(value).trim().length > 0)
        .join(" ");
      return {
        ...row,
        voucherTypeDisplay: voucherType,
        voucherNoDisplay: voucherNo,
        voucherTypeNoDisplay,
        voucherDateDisplay,
        postingDateDisplay,
        voucherPostingDateDisplay,
        refNoDisplayValue,
        refDateDisplayValue,
        referenceNo2DisplayValue,
        referenceDate2DisplayValue,
        reasonForIssueDisplay,
        refDateDisplay: refDateDisplayValue,
        refDisplay,
        voucherDateKey,
        postingDateKey,
        refDateKey,
        ledgerCrDisplay,
        ledgerDrDisplay,
        ledgerDrTitle,
        ledgerDrLinesDisplay,
        primaryLedgerGroupDisplay,
        debitLedgerGroupLinesDisplay: resolvedDebitLedgerGroupLinesDisplay,
        showLedgerDrAmounts,
        netAmtDisplay,
        managerDisplay,
        salesmanDisplay,
        fullPaidDisplay,
        bankDisplay,
        branchDisplay,
        totalAmtDisplay,
        discountAmtDisplay,
        adjustedAmtDisplay,
        diffAmtDisplay,
        chequeReturnStatusDisplay,
        chequeCancelChargesDisplay,
        invoiceDetailsLinesDisplay: resolvedInvoiceDetailsLinesDisplay,
        searchableText,
        searchableTextLower: searchableText.toLowerCase(),
      };
    },
    [
      cashLedgerLabel,
      legacyBankInvoiceLinesByChequeNo,
      legacyBankInvoiceLinesByVoucherNo,
      legacyBankInvoiceLinesByVoucherNoAndDate,
      legacyBankFallbackByChequeNo,
      legacyBankFallbackByVoucherNoAndDate,
      legacyBankFallbackByVoucherNo,
      legacyCashInvoiceLinesByVoucherNo,
      legacyCashInvoiceLinesByVoucherNoAndDate,
      legacyCashFallbackByVoucherNoAndDate,
      legacyCashFallbackByVoucherNo,
      paymentMode,
      profile.key,
      profileVoucherTypeIds,
      voucherLabelSingular,
    ]
  );

  const displayRows = useMemo<PaymentVoucherDisplayRow[]>(
    () => rows.map(mapDisplayRow),
    [rows, mapDisplayRow]
  );
  const filterDisplayRows = useMemo<PaymentVoucherDisplayRow[]>(() => {
    if (!filterSourceRows || filterSourceRows.length === 0) {
      return displayRows;
    }
    return filterSourceRows.map(mapDisplayRow);
  }, [displayRows, filterSourceRows, mapDisplayRow]);

  const filterOptionSets = useMemo(() => {
    const source = {
      voucherTypes: [] as Array<string | null | undefined>,
      voucherNos: [] as Array<string | null | undefined>,
      refNos: [] as Array<string | null | undefined>,
      ledgerCrs: [] as Array<string | null | undefined>,
      ledgerDrs: [] as Array<string | null | undefined>,
      narrations: [] as Array<string | null | undefined>,
      paidBy: [] as Array<string | null | undefined>,
      ledgerGroups: [] as Array<string | null | undefined>,
      netAmts: [] as Array<number | null | undefined>,
      managers: [] as Array<string | null | undefined>,
      salesmen: [] as Array<string | null | undefined>,
      banks: [] as Array<string | null | undefined>,
      branches: [] as Array<string | null | undefined>,
      fullPaid: [] as Array<string | null | undefined>,
      totals: [] as Array<string | null | undefined>,
      discounts: [] as Array<string | null | undefined>,
      adjusted: [] as Array<string | null | undefined>,
      diff: [] as Array<string | null | undefined>,
      chequeReturnStatus: [] as Array<string | null | undefined>,
      chequeCancelCharges: [] as Array<string | null | undefined>,
    };

    filterDisplayRows.forEach((row) => {
      source.voucherTypes.push(row.voucherTypeDisplay);
      source.voucherNos.push(row.voucherNoDisplay);
      source.refNos.push(row.refNoDisplayValue);
      source.ledgerCrs.push(row.ledgerCrDisplay);
      source.ledgerDrs.push(row.ledgerDrDisplay);
      source.narrations.push(row.narration);
      source.paidBy.push(row.managerName);
      source.ledgerGroups.push(row.primaryLedgerGroupDisplay);
      row.debitLedgerGroupLinesDisplay.forEach((group) =>
        source.ledgerGroups.push(group)
      );
      source.netAmts.push(row.totalNetAmount);
      source.managers.push(row.managerDisplay);
      source.salesmen.push(row.salesmanDisplay);
      source.banks.push(row.bankDisplay);
      source.branches.push(row.branchDisplay);
      source.fullPaid.push(row.fullPaidDisplay);
      source.totals.push(row.totalAmtDisplay);
      source.discounts.push(row.discountAmtDisplay);
      source.adjusted.push(row.adjustedAmtDisplay);
      source.diff.push(row.diffAmtDisplay);
      source.chequeReturnStatus.push(row.chequeReturnStatusDisplay);
      source.chequeCancelCharges.push(row.chequeCancelChargesDisplay);
    });

    return {
      voucherTypeFilterOptions: buildTextFilterOptions(source.voucherTypes),
      voucherNoFilterOptions: buildTextFilterOptions(source.voucherNos),
      refNoFilterOptions: buildTextFilterOptions(source.refNos),
      ledgerCrFilterOptions: buildTextFilterOptions(source.ledgerCrs),
      ledgerDrFilterOptions: buildTextFilterOptions(source.ledgerDrs),
      narrationFilterOptions: buildTextFilterOptions(source.narrations),
      paidByFilterOptions: buildTextFilterOptions(source.paidBy),
      ledgerGroupFilterOptions: buildTextFilterOptions(source.ledgerGroups),
      netAmtFilterOptions: buildNumberFilterOptions(source.netAmts),
      managerFilterOptions: buildTextFilterOptions(source.managers),
      salesmanFilterOptions: buildTextFilterOptions(source.salesmen),
      bankFilterOptions: buildTextFilterOptions(source.banks),
      branchFilterOptions: buildTextFilterOptions(source.branches),
      fullPaidFilterOptions: buildTextFilterOptions(source.fullPaid),
      totalAmtFilterOptions: buildTextFilterOptions(source.totals),
      discountAmtFilterOptions: buildTextFilterOptions(source.discounts),
      adjustedAmtFilterOptions: buildTextFilterOptions(source.adjusted),
      diffAmtFilterOptions: buildTextFilterOptions(source.diff),
      chequeReturnStatusFilterOptions: buildTextFilterOptions(
        source.chequeReturnStatus
      ),
      chequeCancelChargesFilterOptions: buildTextFilterOptions(
        source.chequeCancelCharges
      ),
    };
  }, [filterDisplayRows]);
  const {
    voucherTypeFilterOptions,
    voucherNoFilterOptions,
    refNoFilterOptions,
    ledgerCrFilterOptions,
    ledgerDrFilterOptions,
    narrationFilterOptions,
    paidByFilterOptions,
    ledgerGroupFilterOptions,
    netAmtFilterOptions,
    managerFilterOptions,
    salesmanFilterOptions,
    bankFilterOptions,
    branchFilterOptions,
    fullPaidFilterOptions,
    totalAmtFilterOptions,
    discountAmtFilterOptions,
    adjustedAmtFilterOptions,
    diffAmtFilterOptions,
    chequeReturnStatusFilterOptions,
    chequeCancelChargesFilterOptions,
  } = filterOptionSets;

  const voucherTypeNoFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        voucherTypes?: string[];
        voucherNos?: string[];
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "18rem" }}>
          <AppMultiSelect
            value={(current.voucherTypes ?? []) as string[]}
            options={voucherTypeFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, voucherTypes: event.value })
            }
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder="Voucher Type"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              voucherTypeFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={voucherTypeFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
          <AppMultiSelect
            value={(current.voucherNos ?? []) as string[]}
            options={voucherNoFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, voucherNos: event.value })
            }
            filter
            showSelectAll
            placeholder="Voucher No."
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              voucherNoFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={voucherNoFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
        </div>
      );
    },
    [
      fetchFilterSourceRows,
      filterSourceLoading,
      voucherNoFilterOptions,
      voucherTypeFilterOptions,
    ]
  );

  const voucherPostingDateFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        voucherDate?: string | null;
        postingDate?: string | null;
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "14rem" }}>
          <AppDateInput
            value={
              current.voucherDate ? parseDateText(current.voucherDate) : null
            }
            onChange={(value) =>
              options.filterCallback({
                ...current,
                voucherDate: toDateText(value),
              })
            }
            placeholder="Voucher Date"
            fiscalYearStart={fiscalRange?.start ?? null}
            fiscalYearEnd={fiscalRange?.end ?? null}
            className="app-entry-date"
          />
          <AppDateInput
            value={
              current.postingDate ? parseDateText(current.postingDate) : null
            }
            onChange={(value) =>
              options.filterCallback({
                ...current,
                postingDate: toDateText(value),
              })
            }
            placeholder="Posting Date"
            fiscalYearStart={fiscalRange?.start ?? null}
            fiscalYearEnd={fiscalRange?.end ?? null}
            className="app-entry-date"
          />
        </div>
      );
    },
    [fiscalRange]
  );
  const voucherDateFullPaidFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        voucherDate?: string | null;
        fullPaid?: string[];
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "14rem" }}>
          <AppDateInput
            value={
              current.voucherDate ? parseDateText(current.voucherDate) : null
            }
            onChange={(value) =>
              options.filterCallback({
                ...current,
                voucherDate: toDateText(value),
              })
            }
            placeholder="Voucher Date"
            fiscalYearStart={fiscalRange?.start ?? null}
            fiscalYearEnd={fiscalRange?.end ?? null}
            className="app-entry-date"
          />
          <AppMultiSelect
            value={(current.fullPaid ?? []) as string[]}
            options={fullPaidFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, fullPaid: event.value })
            }
            filter
            showSelectAll
            placeholder="Full Paid"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              fullPaidFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={fullPaidFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
        </div>
      );
    },
    [
      fetchFilterSourceRows,
      filterSourceLoading,
      fiscalRange,
      fullPaidFilterOptions,
    ]
  );

  const refFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        refNos?: string[];
        refDate?: string | null;
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "18rem" }}>
          <AppMultiSelect
            value={(current.refNos ?? []) as string[]}
            options={refNoFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, refNos: event.value })
            }
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder={refNoLabel}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              refNoFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={refNoFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
          <AppDateInput
            value={current.refDate ? parseDateText(current.refDate) : null}
            onChange={(value) =>
              options.filterCallback({ ...current, refDate: toDateText(value) })
            }
            placeholder={refDateLabel}
            fiscalYearStart={fiscalRange?.start ?? null}
            fiscalYearEnd={fiscalRange?.end ?? null}
            className="app-entry-date"
          />
        </div>
      );
    },
    [
      fetchFilterSourceRows,
      filterSourceLoading,
      fiscalRange,
      refDateLabel,
      refNoLabel,
      refNoFilterOptions,
    ]
  );

  const ledgerCrDrFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        ledgerCrs?: string[];
        ledgerDrs?: string[];
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "18rem" }}>
          <AppMultiSelect
            value={(current.ledgerCrs ?? []) as string[]}
            options={ledgerCrFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, ledgerCrs: event.value })
            }
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder={registerPrimaryLedgerLabel}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              ledgerCrFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={ledgerCrFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
          <AppMultiSelect
            value={(current.ledgerDrs ?? []) as string[]}
            options={ledgerDrFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, ledgerDrs: event.value })
            }
            filter
            showSelectAll
            placeholder={registerEntryLedgerLabel}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              ledgerDrFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={ledgerDrFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
        </div>
      );
    },
    [
      fetchFilterSourceRows,
      filterSourceLoading,
      ledgerCrFilterOptions,
      ledgerDrFilterOptions,
      registerEntryLedgerLabel,
      registerPrimaryLedgerLabel,
    ]
  );
  const managerSalesmanFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        managers?: string[];
        salesmen?: string[];
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "18rem" }}>
          <AppMultiSelect
            value={(current.managers ?? []) as string[]}
            options={managerFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, managers: event.value })
            }
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder="Manager"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              managerFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={managerFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
          <AppMultiSelect
            value={(current.salesmen ?? []) as string[]}
            options={salesmanFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, salesmen: event.value })
            }
            filter
            showSelectAll
            placeholder="Salesman"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              salesmanFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={salesmanFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
        </div>
      );
    },
    [
      fetchFilterSourceRows,
      filterSourceLoading,
      managerFilterOptions,
      salesmanFilterOptions,
    ]
  );
  const bankBranchFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        banks?: string[];
        branches?: string[];
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "18rem" }}>
          <AppMultiSelect
            value={(current.banks ?? []) as string[]}
            options={bankFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, banks: event.value })
            }
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder="Bank"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              bankFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={bankFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
          <AppMultiSelect
            value={(current.branches ?? []) as string[]}
            options={branchFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, branches: event.value })
            }
            filter
            showSelectAll
            placeholder="Branch"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              branchFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={branchFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
        </div>
      );
    },
    [
      bankFilterOptions,
      branchFilterOptions,
      fetchFilterSourceRows,
      filterSourceLoading,
    ]
  );
  const totalDiscountFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        totals?: string[];
        discounts?: string[];
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "18rem" }}>
          <AppMultiSelect
            value={(current.totals ?? []) as string[]}
            options={totalAmtFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, totals: event.value })
            }
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder="Total Amt"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              totalAmtFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={totalAmtFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
          <AppMultiSelect
            value={(current.discounts ?? []) as string[]}
            options={discountAmtFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, discounts: event.value })
            }
            filter
            showSelectAll
            placeholder="Discount"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              discountAmtFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={discountAmtFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
        </div>
      );
    },
    [
      discountAmtFilterOptions,
      fetchFilterSourceRows,
      filterSourceLoading,
      totalAmtFilterOptions,
    ]
  );
  const netAdjustedFilterElement = useMemo(
    () => (options: ColumnFilterElementTemplateOptions) => {
      const current = (options.value ?? {}) as {
        netAmts?: number[];
        adjustedAmts?: string[];
      };
      return (
        <div className="flex flex-column gap-2" style={{ minWidth: "18rem" }}>
          <AppMultiSelect
            value={(current.netAmts ?? []) as number[]}
            options={netAmtFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, netAmts: event.value })
            }
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder="Net Amt"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              netAmtFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={netAmtFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
          <AppMultiSelect
            value={(current.adjustedAmts ?? []) as string[]}
            options={adjustedAmtFilterOptions}
            optionLabel="label"
            optionValue="value"
            onChange={(event) =>
              options.filterCallback({ ...current, adjustedAmts: event.value })
            }
            filter
            showSelectAll
            placeholder="Adjusted Amt"
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={
              adjustedAmtFilterOptions.length ? "No values found" : "No values"
            }
            emptyFilterMessage="No results found"
            disabled={adjustedAmtFilterOptions.length === 0}
            onShow={fetchFilterSourceRows}
            loading={filterSourceLoading}
          />
        </div>
      );
    },
    [
      adjustedAmtFilterOptions,
      fetchFilterSourceRows,
      filterSourceLoading,
      netAmtFilterOptions,
    ]
  );
  const fullPaidFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        fullPaidFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [fetchFilterSourceRows, filterSourceLoading, fullPaidFilterOptions]
  );
  const narrationFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        narrationFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [fetchFilterSourceRows, filterSourceLoading, narrationFilterOptions]
  );
  const paidByFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        paidByFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [fetchFilterSourceRows, filterSourceLoading, paidByFilterOptions]
  );
  const ledgerGroupFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        ledgerGroupFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [fetchFilterSourceRows, filterSourceLoading, ledgerGroupFilterOptions]
  );
  const netAmtFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        netAmtFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [fetchFilterSourceRows, filterSourceLoading, netAmtFilterOptions]
  );
  const diffAmtFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        diffAmtFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [diffAmtFilterOptions, fetchFilterSourceRows, filterSourceLoading]
  );
  const chequeReturnStatusFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        chequeReturnStatusFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [
      chequeReturnStatusFilterOptions,
      fetchFilterSourceRows,
      filterSourceLoading,
    ]
  );
  const chequeCancelChargesFilterElement = useMemo(
    () =>
      buildMultiSelectFilterElement(
        chequeCancelChargesFilterOptions,
        "Any",
        fetchFilterSourceRows,
        filterSourceLoading
      ),
    [
      chequeCancelChargesFilterOptions,
      fetchFilterSourceRows,
      filterSourceLoading,
    ]
  );

  const activeColumnFilters = useMemo(
    () =>
      Object.entries(columnFilters ?? {}).filter(([, meta]) => {
        const value = resolveFilterValue(meta as ColumnFilterMeta);
        return !isEmptyFilterValue(value);
      }),
    [columnFilters]
  );
  const hasActiveColumnFilters = activeColumnFilters.length > 0;
  const hasClientSideGlobalSearch =
    hasGlobalSearch && !supportsServerGlobalSearch;
  const hasClientSideFiltering =
    hasActiveColumnFilters || hasClientSideGlobalSearch;

  useEffect(() => {
    if (!hasApplied || !appliedVariables) return;
    if (hasClientSideFiltering) return;
    if (loading) return;
    if (rowsPerPage <= 0 || totalCount <= 0) return;
    const nextOffset = first + rowsPerPage;
    if (nextOffset >= totalCount) return;
    const prefetchVariables = {
      ...appliedVariables,
      limit: rowsPerPage,
      offset: nextOffset,
      pageAfterVoucherDate: null,
      pageAfterVoucherNumber: null,
      pageAfterVoucherId: null,
      pageBeforeVoucherDate: null,
      pageBeforeVoucherNumber: null,
      pageBeforeVoucherId: null,
      includeSummary: false,
      totalCountHint: totalCount,
    };
    const prefetchKey = JSON.stringify(prefetchVariables);
    if (prefetchedRegisterPageKeysRef.current.has(prefetchKey)) return;
    prefetchedRegisterPageKeysRef.current.add(prefetchKey);
    void apolloClient
      .query({
        query: registerQueryDocument,
        variables: prefetchVariables,
        fetchPolicy: "cache-first",
      })
      .catch(() => {
        prefetchedRegisterPageKeysRef.current.delete(prefetchKey);
      });
  }, [
    apolloClient,
    appliedVariables,
    first,
    hasApplied,
    hasClientSideFiltering,
    loading,
    registerQueryDocument,
    rowsPerPage,
    totalCount,
  ]);

  useEffect(() => {
    if (!hasApplied) return;
    if (!hasClientSideFiltering) return;
    if (filterSourceLoading) return;
    if (filterSourceRows !== null) return;
    void fetchFilterSourceRows();
  }, [
    hasClientSideFiltering,
    fetchFilterSourceRows,
    filterSourceLoading,
    filterSourceRows,
    hasApplied,
  ]);

  const applyColumnFilters = useCallback(
    (rowsToFilter: PaymentVoucherDisplayRow[]) => {
      if (activeColumnFilters.length === 0) return rowsToFilter;

      return rowsToFilter.filter((row) =>
        activeColumnFilters.every(([field, meta]) => {
          const value = resolveFilterValue(meta as ColumnFilterMeta);
          if (isEmptyFilterValue(value)) return true;

          switch (field) {
            case "voucherTypeNoDisplay": {
              const data = value as {
                voucherTypes?: string[];
                voucherNos?: string[];
              } | null;
              const voucherTypes = data?.voucherTypes ?? [];
              const voucherNos = data?.voucherNos ?? [];
              if (voucherTypes.length > 0) {
                const matchesType = voucherTypes.some(
                  (type) =>
                    normalizeTextValue(type) ===
                    normalizeTextValue(row.voucherTypeDisplay)
                );
                if (!matchesType) return false;
              }
              if (voucherNos.length > 0) {
                const matchesNo = voucherNos.some(
                  (no) =>
                    normalizeTextValue(no) ===
                    normalizeTextValue(row.voucherNoDisplay)
                );
                if (!matchesNo) return false;
              }
              return true;
            }
            case "voucherPostingDateDisplay": {
              const data = value as {
                voucherDate?: string | null;
                postingDate?: string | null;
                fullPaid?: string[];
              } | null;
              const voucherDate = data?.voucherDate ?? null;
              const postingDate = data?.postingDate ?? null;
              const fullPaid = data?.fullPaid ?? [];
              if (voucherDate && voucherDate !== row.voucherDateKey)
                return false;
              if (postingDate && postingDate !== row.postingDateKey)
                return false;
              if (fullPaid.length > 0) {
                const matchesFullPaid = fullPaid.some(
                  (item) =>
                    normalizeTextValue(item) ===
                    normalizeTextValue(row.fullPaidDisplay)
                );
                if (!matchesFullPaid) return false;
              }
              return true;
            }
            case "refDisplay": {
              const data = value as {
                refNos?: string[];
                refDate?: string | null;
              } | null;
              const refNos = data?.refNos ?? [];
              const refDate = data?.refDate ?? null;
              if (refNos.length > 0) {
                const matchesRef = refNos.some(
                  (ref) =>
                    normalizeTextValue(ref) ===
                    normalizeTextValue(row.refNoDisplayValue)
                );
                if (!matchesRef) return false;
              }
              if (refDate && refDate !== row.refDateKey) return false;
              return true;
            }
            case "ledgerCrDrDisplay": {
              const data = value as {
                ledgerCrs?: string[];
                ledgerDrs?: string[];
              } | null;
              const ledgerCrs = data?.ledgerCrs ?? [];
              const ledgerDrs = data?.ledgerDrs ?? [];
              if (ledgerCrs.length > 0) {
                const matchesCr = ledgerCrs.some(
                  (ledger) =>
                    normalizeTextValue(ledger) ===
                    normalizeTextValue(row.ledgerCrDisplay)
                );
                if (!matchesCr) return false;
              }
              if (ledgerDrs.length > 0) {
                const matchesDr = ledgerDrs.some(
                  (ledger) =>
                    normalizeTextValue(ledger) ===
                    normalizeTextValue(row.ledgerDrDisplay)
                );
                if (!matchesDr) return false;
              }
              return true;
            }
            case "managerSalesmanDisplay": {
              const data = value as {
                managers?: string[];
                salesmen?: string[];
              } | null;
              const managers = data?.managers ?? [];
              const salesmen = data?.salesmen ?? [];
              if (managers.length > 0) {
                const matchesManager = managers.some(
                  (manager) =>
                    normalizeTextValue(manager) ===
                    normalizeTextValue(row.managerDisplay)
                );
                if (!matchesManager) return false;
              }
              if (salesmen.length > 0) {
                const matchesSalesman = salesmen.some(
                  (salesman) =>
                    normalizeTextValue(salesman) ===
                    normalizeTextValue(row.salesmanDisplay)
                );
                if (!matchesSalesman) return false;
              }
              return true;
            }
            case "bankBranchDisplay": {
              const data = value as {
                banks?: string[];
                branches?: string[];
              } | null;
              const banks = data?.banks ?? [];
              const branches = data?.branches ?? [];
              if (banks.length > 0) {
                const matchesBank = banks.some(
                  (bank) =>
                    normalizeTextValue(bank) ===
                    normalizeTextValue(row.bankDisplay)
                );
                if (!matchesBank) return false;
              }
              if (branches.length > 0) {
                const matchesBranch = branches.some(
                  (branch) =>
                    normalizeTextValue(branch) ===
                    normalizeTextValue(row.branchDisplay)
                );
                if (!matchesBranch) return false;
              }
              return true;
            }
            case "fullPaidDisplay": {
              const list = Array.isArray(value) ? value : [];
              if (list.length === 0) return true;
              return list.some(
                (item) =>
                  normalizeTextValue(item) ===
                  normalizeTextValue(row.fullPaidDisplay)
              );
            }
            case "totalDiscountDisplay": {
              const data = value as {
                totals?: string[];
                discounts?: string[];
              } | null;
              const totals = data?.totals ?? [];
              const discounts = data?.discounts ?? [];
              if (totals.length > 0) {
                const matchesTotal = totals.some(
                  (amount) =>
                    normalizeTextValue(amount) ===
                    normalizeTextValue(row.totalAmtDisplay)
                );
                if (!matchesTotal) return false;
              }
              if (discounts.length > 0) {
                const matchesDiscount = discounts.some(
                  (amount) =>
                    normalizeTextValue(amount) ===
                    normalizeTextValue(row.discountAmtDisplay)
                );
                if (!matchesDiscount) return false;
              }
              return true;
            }
            case "netAmtDisplay": {
              const list = Array.isArray(value) ? value : [];
              if (list.length === 0) return true;
              const amount = Number(row.totalNetAmount ?? 0);
              return list.some((item) => Number(item) === amount);
            }
            case "netAdjustedDisplay": {
              const data = value as {
                netAmts?: number[];
                adjustedAmts?: string[];
              } | null;
              const netAmts = data?.netAmts ?? [];
              const adjustedAmts = data?.adjustedAmts ?? [];
              if (netAmts.length > 0) {
                const amount = Number(row.totalNetAmount ?? 0);
                const matchesNet = netAmts.some(
                  (item) => Number(item) === amount
                );
                if (!matchesNet) return false;
              }
              if (adjustedAmts.length > 0) {
                const matchesAdjusted = adjustedAmts.some(
                  (amount) =>
                    normalizeTextValue(amount) ===
                    normalizeTextValue(row.adjustedAmtDisplay)
                );
                if (!matchesAdjusted) return false;
              }
              return true;
            }
            case "diffAmtDisplay": {
              const list = Array.isArray(value) ? value : [];
              if (list.length === 0) return true;
              return list.some(
                (item) =>
                  normalizeTextValue(item) ===
                  normalizeTextValue(row.diffAmtDisplay)
              );
            }
            case "chequeReturnStatusDisplay": {
              const list = Array.isArray(value) ? value : [];
              if (list.length === 0) return true;
              return list.some(
                (item) =>
                  normalizeTextValue(item) ===
                  normalizeTextValue(row.chequeReturnStatusDisplay)
              );
            }
            case "chequeCancelChargesDisplay": {
              const list = Array.isArray(value) ? value : [];
              if (list.length === 0) return true;
              return list.some(
                (item) =>
                  normalizeTextValue(item) ===
                  normalizeTextValue(row.chequeCancelChargesDisplay)
              );
            }
            case "debitLedgerGroupName": {
              const primaryGroup = row.primaryLedgerGroupDisplay?.trim() ?? "";
              const entryGroupNames =
                row.debitLedgerGroupLinesDisplay.length > 0
                  ? row.debitLedgerGroupLinesDisplay
                  : row.debitLedgerGroupName
                  ? [row.debitLedgerGroupName]
                  : [];
              const rowGroupNames = primaryGroup
                ? [
                    primaryGroup,
                    ...entryGroupNames.filter(
                      (groupName) =>
                        normalizeTextValue(groupName) !==
                        normalizeTextValue(primaryGroup)
                    ),
                  ]
                : entryGroupNames;
              if (Array.isArray(value)) {
                if (value.length === 0) return true;
                return value.some((item) => {
                  const selected = normalizeTextValue(item);
                  return rowGroupNames.some(
                    (groupName) => normalizeTextValue(groupName) === selected
                  );
                });
              }
              const needle = normalizeTextValue(value);
              if (!needle) return true;
              return rowGroupNames.some((groupName) =>
                normalizeTextValue(groupName).includes(needle)
              );
            }
            default: {
              const rowFieldValue = (row as unknown as Record<string, unknown>)[
                field
              ];
              if (Array.isArray(value)) {
                if (value.length === 0) return true;
                const cell = normalizeTextValue(rowFieldValue);
                return value.some((item) => normalizeTextValue(item) === cell);
              }
              const needle = normalizeTextValue(value);
              const haystack = normalizeTextValue(rowFieldValue);
              return haystack.includes(needle);
            }
          }
        })
      );
    },
    [activeColumnFilters]
  );

  const applyGlobalSearch = useCallback(
    (rowsToFilter: PaymentVoucherDisplayRow[]) => {
      if (!hasClientSideGlobalSearch) return rowsToFilter;
      const needle = normalizedGlobalSearchText;
      if (!needle) return rowsToFilter;

      if (globalSearchWholeWord) {
        const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const flags = globalSearchMatchCase ? "" : "i";
        const wholeWordPattern = new RegExp(
          `(^|[^A-Za-z0-9])${escapedNeedle}(?=$|[^A-Za-z0-9])`,
          flags
        );
        return rowsToFilter.filter((row) =>
          wholeWordPattern.test(row.searchableText)
        );
      }

      if (globalSearchMatchCase) {
        return rowsToFilter.filter((row) =>
          row.searchableText.includes(needle)
        );
      }

      const loweredNeedle = needle.toLowerCase();
      return rowsToFilter.filter((row) =>
        row.searchableTextLower.includes(loweredNeedle)
      );
    },
    [
      globalSearchMatchCase,
      globalSearchWholeWord,
      hasClientSideGlobalSearch,
      normalizedGlobalSearchText,
    ]
  );

  const filteredRows = useMemo(
    () => applyColumnFilters(displayRows),
    [applyColumnFilters, displayRows]
  );
  const filteredAllRows = useMemo(
    () => applyColumnFilters(filterDisplayRows),
    [applyColumnFilters, filterDisplayRows]
  );
  const searchedRows = useMemo(
    () => applyGlobalSearch(filteredRows),
    [applyGlobalSearch, filteredRows]
  );
  const searchedAllRows = useMemo(
    () => applyGlobalSearch(filteredAllRows),
    [applyGlobalSearch, filteredAllRows]
  );
  const filteredSourceRows = useMemo(() => {
    if (!hasClientSideFiltering) return searchedRows;
    if (filterSourceRows !== null) return searchedAllRows;
    return searchedRows;
  }, [filterSourceRows, hasClientSideFiltering, searchedAllRows, searchedRows]);
  const filteredRowsForTable = useMemo(() => {
    if (!hasClientSideFiltering) return searchedRows;
    return filteredSourceRows.slice(first, first + rowsPerPage);
  }, [
    first,
    filteredSourceRows,
    hasClientSideFiltering,
    rowsPerPage,
    searchedRows,
  ]);
  const totalRecordsForTable = hasClientSideFiltering
    ? filteredSourceRows.length
    : totalCount;
  const { uiState: voucherUiState, baseUiState: voucherBaseUiState } = useMemo(
    () => deriveVoucherUiState(isFormActive, editingId != null, saving),
    [editingId, isFormActive, saving]
  );
  const voucherActions = useMemo(
    () =>
      getVoucherActionsConfig({
        uiState: voucherUiState,
        baseUiState: voucherBaseUiState,
        isDirty: isFormDirty,
        hasVoucherId: editingId != null,
        isCancelled: cancelledChecked,
        canRefresh,
        hasRegisterRows: totalRecordsForTable > 0,
      }),
    [
      canRefresh,
      cancelledChecked,
      editingId,
      isFormDirty,
      totalRecordsForTable,
      voucherBaseUiState,
      voucherUiState,
    ]
  );
  const showSavedStatusBar = useMemo(
    () =>
      isFormActive &&
      !isFormDirty &&
      editingId != null &&
      lastSavedVoucher != null &&
      lastSavedVoucher.mode === paymentMode &&
      Number(lastSavedVoucher.voucherId) === Number(editingId),
    [editingId, isFormActive, isFormDirty, lastSavedVoucher, paymentMode]
  );
  const recentlySavedVouchersForMode = useMemo(
    () =>
      recentlySavedVouchers
        .filter((item) => item.mode === paymentMode)
        .slice(0, PAYMENT_VOUCHER_RECENT_SAVED_LIMIT),
    [paymentMode, recentlySavedVouchers]
  );

  useEffect(() => {
    if (!hasClientSideFiltering) return;
    if (first === 0) return;
    if (first >= filteredSourceRows.length) {
      setFirst(0);
    }
  }, [filteredSourceRows.length, first, hasClientSideFiltering]);

  const totals = useMemo(() => {
    if (hasClientSideFiltering) {
      return filteredSourceRows.reduce(
        (sum, row) => sum + Number(row.totalNetAmount || 0),
        0
      );
    }
    const totalFromApi = toFiniteNumber(
      data?.voucherRegisterByLedgerDetailed?.totalNetAmount
    );
    if (totalFromApi != null) {
      return totalFromApi;
    }
    if (cachedRegisterSummary?.totalNetAmount != null) {
      return cachedRegisterSummary.totalNetAmount;
    }
    return rows.reduce((sum, r) => sum + Number(r.totalNetAmount || 0), 0);
  }, [
    cachedRegisterSummary?.totalNetAmount,
    data?.voucherRegisterByLedgerDetailed?.totalNetAmount,
    filteredSourceRows,
    hasClientSideFiltering,
    rows,
  ]);
  const receiptRegisterTotals = useMemo<ReceiptRegisterTotals | null>(() => {
    const isReceiptRegister =
      profile.key === "receipt" &&
      (paymentMode === "cash" || paymentMode === "bank");
    if (!isReceiptRegister) return null;

    const parseAmountDisplay = (value: string | null | undefined): number => {
      const normalized = String(value ?? "")
        .replace(/,/g, "")
        .trim();
      if (!normalized) return 0;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const buildFromDisplayRows = (
      sourceRows: PaymentVoucherDisplayRow[]
    ): ReceiptRegisterTotals => {
      return sourceRows.reduce<ReceiptRegisterTotals>(
        (acc, row) => {
          const status = normalizeTextValue(row.chequeReturnStatusDisplay);
          acc.totalAmount += parseAmountDisplay(row.totalAmtDisplay);
          acc.discountAmount += parseAmountDisplay(row.discountAmtDisplay);
          acc.netAmount += parseAmountDisplay(row.netAmtDisplay);
          acc.adjustedAmount += parseAmountDisplay(row.adjustedAmtDisplay);
          acc.diffAmount += parseAmountDisplay(row.diffAmtDisplay);
          acc.chequeReturnCharges += parseAmountDisplay(
            row.chequeCancelChargesDisplay
          );
          if (status.length > 0) {
            acc.chequeReturnCount += 1;
          }
          return acc;
        },
        {
          totalAmount: 0,
          discountAmount: 0,
          netAmount: 0,
          adjustedAmount: 0,
          diffAmount: 0,
          chequeReturnCount: 0,
          chequeReturnCharges: 0,
        }
      );
    };

    if (hasClientSideFiltering) {
      return buildFromDisplayRows(filteredSourceRows);
    }

    const totalAmountSum =
      toFiniteNumber(data?.voucherRegisterByLedgerDetailed?.totalAmountSum) ??
      cachedRegisterSummary?.totalAmountSum ??
      null;
    const discountAmountSum =
      toFiniteNumber(data?.voucherRegisterByLedgerDetailed?.discountAmountSum) ??
      cachedRegisterSummary?.discountAmountSum ??
      null;
    const adjustedAmountSum =
      toFiniteNumber(data?.voucherRegisterByLedgerDetailed?.adjustedAmountSum) ??
      cachedRegisterSummary?.adjustedAmountSum ??
      null;
    const diffAmountSum =
      toFiniteNumber(data?.voucherRegisterByLedgerDetailed?.diffAmountSum) ??
      cachedRegisterSummary?.diffAmountSum ??
      null;
    const chequeReturnChargesSum =
      toFiniteNumber(
        data?.voucherRegisterByLedgerDetailed?.chequeReturnChargesSum
      ) ??
      cachedRegisterSummary?.chequeReturnChargesSum ??
      null;
    const chequeReturnCount =
      toFiniteNumber(data?.voucherRegisterByLedgerDetailed?.chequeReturnCount) ??
      cachedRegisterSummary?.chequeReturnCount ??
      null;
    if (
      Number.isFinite(totalAmountSum) &&
      Number.isFinite(discountAmountSum) &&
      Number.isFinite(adjustedAmountSum) &&
      Number.isFinite(diffAmountSum) &&
      Number.isFinite(chequeReturnChargesSum) &&
      Number.isFinite(chequeReturnCount)
    ) {
      return {
        totalAmount: totalAmountSum,
        discountAmount: discountAmountSum,
        netAmount: totals,
        adjustedAmount: adjustedAmountSum,
        diffAmount: diffAmountSum,
        chequeReturnCount,
        chequeReturnCharges: chequeReturnChargesSum,
      };
    }

    return buildFromDisplayRows(searchedRows);
  }, [
    cachedRegisterSummary?.adjustedAmountSum,
    cachedRegisterSummary?.chequeReturnChargesSum,
    cachedRegisterSummary?.chequeReturnCount,
    cachedRegisterSummary?.diffAmountSum,
    cachedRegisterSummary?.discountAmountSum,
    cachedRegisterSummary?.totalAmountSum,
    data?.voucherRegisterByLedgerDetailed?.adjustedAmountSum,
    data?.voucherRegisterByLedgerDetailed?.chequeReturnChargesSum,
    data?.voucherRegisterByLedgerDetailed?.chequeReturnCount,
    data?.voucherRegisterByLedgerDetailed?.diffAmountSum,
    data?.voucherRegisterByLedgerDetailed?.discountAmountSum,
    data?.voucherRegisterByLedgerDetailed?.totalAmountSum,
    filteredSourceRows,
    hasClientSideFiltering,
    paymentMode,
    profile.key,
    searchedRows,
    totals,
  ]);
  const mapVoucherTemplateRow = useCallback(
    (row: Partial<VoucherRow> | null | undefined) => ({
      voucherId: row?.voucherId ?? null,
      voucherTypeName: row?.voucherTypeName ?? null,
      voucherNumber: row?.voucherNumber ?? null,
      voucherDateText: row?.voucherDate ?? null,
      partyLedgerName:
        row?.primaryLedgerName ??
        row?.debitLedgerName ??
        row?.creditLedgerName ??
        null,
      narrationText: row?.narration ?? null,
      totalAmountDetails: toFiniteNumber(row?.totalNetAmount) ?? 0,
      managerName: row?.managerName ?? null,
      isCancelledFlag: row?.isCancelledFlag ?? 0,
    }),
    []
  );
  const tryTemplatePrintVoucherRows = useCallback(
    async (
      rowsToPrint: Array<Partial<VoucherRow> | null | undefined>,
      usageKeys: string[],
      title: string
    ) => {
      const normalizedRows = rowsToPrint
        .filter((row): row is Partial<VoucherRow> => Boolean(row))
        .map((row) => mapVoucherTemplateRow(row))
        .filter((row) => {
          const voucherId = toPositiveId(row.voucherId);
          const voucherNo = String(row.voucherNumber ?? "").trim();
          return voucherId != null || voucherNo.length > 0;
        })
        .map((row) => row as Record<string, unknown>);
      if (!normalizedRows.length) return false;
      return await printRowsWithReportTemplate({
        apolloClient,
        moduleKey: "voucher",
        usageKeys,
        rows: normalizedRows,
        title,
        subtitle: `${normalizedRows.length} row${
          normalizedRows.length === 1 ? "" : "s"
        }`,
      });
    },
    [apolloClient, mapVoucherTemplateRow]
  );
  const handleTemplateVoucherPrint = useCallback(() => {
    void (async () => {
      const activeRow = resolveDeleteTargetRow();
      if (!activeRow) {
        if (typeof window !== "undefined") {
          window.print();
        }
        return;
      }
      const managerNameFromForm =
        typeof managerValue === "string"
          ? managerValue.trim()
          : String(managerValue?.label ?? "").trim();
      const formSnapshotRow: Partial<VoucherRow> = {
        ...activeRow,
        voucherNumber: voucherNo.trim() || activeRow.voucherNumber || null,
        voucherDate:
          isFormActive && voucherDate
            ? toDateText(voucherDate)
            : activeRow.voucherDate ?? null,
        narration:
          isFormActive && narration.trim()
            ? narration.trim()
            : activeRow.narration ?? null,
        managerName:
          isFormActive && managerNameFromForm
            ? managerNameFromForm
            : activeRow.managerName ?? null,
        totalNetAmount:
          isFormActive && Number.isFinite(Number(totalDebit))
            ? Number(totalDebit)
            : Number(activeRow.totalNetAmount ?? 0),
      };
      const printed = await tryTemplatePrintVoucherRows(
        [formSnapshotRow],
        ["voucher", "print.voucher", "print"],
        `${voucherLabelSingular} Print`
      );
      if (printed) return;
      if (typeof window !== "undefined") {
        window.print();
      }
    })();
  }, [
    isFormActive,
    managerValue,
    narration,
    resolveDeleteTargetRow,
    totalDebit,
    tryTemplatePrintVoucherRows,
    voucherDate,
    voucherLabelSingular,
    voucherNo,
  ]);
  const handleRegisterTemplatePrint = useCallback(
    (nextFormat: "format-1" | "format-2") => {
      setPrintFormat(nextFormat);
      const usageKeys =
        nextFormat === "format-2"
          ? ["format-2", "print.format-2", "print"]
          : ["format-1", "print.format-1", "print"];
      const title =
        nextFormat === "format-2"
          ? `${voucherLabelSingular} Register (Format 2)`
          : `${voucherLabelSingular} Register (Format 1)`;
      void (async () => {
        const printed = await tryTemplatePrintVoucherRows(
          filteredRowsForTable,
          usageKeys,
          title
        );
        if (printed) return;
        if (typeof window !== "undefined") {
          window.print();
        }
      })();
    },
    [filteredRowsForTable, tryTemplatePrintVoucherRows, voucherLabelSingular]
  );
  const printMenuItems = useMemo(
    () => [
      {
        label: "Format 1",
        icon: printFormat === "format-1" ? "pi pi-check" : undefined,
        command: () => {
          handleRegisterTemplatePrint("format-1");
        },
      },
      {
        label: "Format 2",
        icon: printFormat === "format-2" ? "pi pi-check" : undefined,
        command: () => {
          handleRegisterTemplatePrint("format-2");
        },
      },
    ],
    [handleRegisterTemplatePrint, printFormat]
  );

  return {
    routeView,
    error: registerError,
    pageHeading,
    voucherUiState,
    voucherActions,
    voucherProfileKey: profile.key,
    voucherProfileSwitchLabel: voucherProfileSwitch?.label ?? null,
    voucherProfileOptions: voucherProfileSwitch?.options ?? [],
    changeVoucherProfile,
    paymentMode,
    paymentModeLabel,
    modeSwitchLabel,
    paymentModeOptions,
    changePaymentMode,
    clearFormError,
    formErrors,
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
    showBillWiseOption,
    isBillWiseMode,
    toggleBillWiseMode,
    billWisePartyLedgerGroupId,
    updateBillWisePartyLedgerGroupId,
    billWisePartyLedgerId,
    billWisePartyLedgerBalanceLabel,
    billWisePartyLedgerBalanceClass,
    billWisePartyLedgerOption,
    updateBillWisePartyLedger,
    billWiseDiscountLedgerId,
    billWiseDiscountLedgerOption,
    updateBillWiseDiscountLedger,
    billWiseDiscountAmount,
    updateBillWiseDiscountAmount,
    billWiseChequeReturnLedgerId,
    billWiseChequeReturnLedgerOption,
    billWiseChequeReturnCharges,
    billWiseChequeReturnChargesValue,
    updateBillWiseChequeReturnCharges,
    billWiseFullPaid,
    updateBillWiseFullPaid,
    billWiseShowAdvanceBill,
    updateBillWiseShowAdvanceBill,
    billWiseFiscalYearId,
    billWiseFiscalYearOptions: billWiseFiscalYearSelectOptions,
    updateBillWiseFiscalYear,
    billWiseDebitNote,
    updateBillWiseDebitNote,
    billWiseInvoiceRows,
    billWiseSelectedRows,
    billWiseInvoicesLoading,
    billWiseInvoiceSearchDialogVisible,
    billWiseInvoiceSearchTerm,
    updateBillWiseInvoiceSearchTerm,
    billWiseInvoiceSearchRows,
    billWiseInvoiceSearchLoading,
    runBillWiseInvoiceSearch,
    selectBillWiseInvoiceSearchRow,
    closeBillWiseInvoiceSearchDialog,
    billWiseSelectionDialogVisible,
    refreshBillWiseInvoices,
    searchInvoiceBills,
    openBillWiseInvoiceSearchDialog,
    openBillWiseSelectionDialog,
    closeBillWiseSelectionDialog,
    setBillWiseInvoiceSelected,
    setBillWiseInvoiceAppliedAmount,
    billWiseLineEditor,
    billWiseLineEditorOptions,
    openBillWiseLineEditorForAdd,
    openBillWiseLineEditorForEdit,
    updateBillWiseLineEditorState,
    applyBillWiseLineEditor,
    closeBillWiseLineEditor,
    confirmRemoveBillWiseInvoice,
    billWiseAppliedTotal,
    billWiseDiscountAmountValue,
    billWiseNetReceiptAmount,
    paymentAgainstOptions,
    paymentViaInputId,
    chequeBookInputId,
    isBankMode,
    isCashMode,
    isChequePayment,
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
    receiptIssueBooksLoading: issueBooksLoading,
    hasReceiptSalesmanSelection,
    cashLedgerId,
    setCashLedgerId,
    updatePrimaryLedger,
    cashLedgerOption,
    cashLedgerGroupLabel,
    setCashLedgerOption,
    paymentLedgerGroupId,
    setPaymentLedgerGroupId,
    paymentLedgerGroupDisabled,
    focusPaymentLedgerInput,
    autoCompleteAppendTarget,
    paymentLedgerLabel,
    paymentLedgerPurpose,
    paymentLedgerGroupLabel,
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
    setCashLedgerAmount,
    syncCashLedgerAmountInput,
    syncCashLedgerAmountDraftInput,
    cashLedgerAmountInputRef,
    focusCashLedgerAmountInput,
    narration,
    setNarration,
    lines,
    supplementaryHeaderPostingLinesDisplay,
    isLineEditorLocked,
    selectedLine,
    selectedLineKey,
    setSelectedLineKey,
    lineEditorDraft,
    lineEditorCarryGroupId,
    updateLineEditorDraft,
    lineEditorLedgerGroupRef,
    lineEditorLedgerRef,
    lineEditorAmountRef,
    focusLineEditorLedgerGroupInput,
    focusLineEditorLedgerInput,
    focusLineEditorAmountInput,
    syncLineEditorAmountInput,
    lineEntryPurpose,
    lineEntryLedgerLabel,
    allowHeaderDrCrSelection,
    updateHeaderDrCr,
    headerDrCrLabel,
    allowLineDrCrSelection,
    lineEntryDrCrLabel,
    lineSectionTitle,
    lineEntryTotalLabel,
    differenceSummaryLabel,
    paymentAgainstAddressMap,
    ledgerGroupOptions,
    ledgerGroupOptionsLoading,
    lineEditorAddress,
    lineEditorBalanceLabel,
    lineEditorBalanceClass,
    startAddLine,
    startEditLine,
    applyLineDraft,
    cancelLineDraft,
    removeLineByKey,
    isLineDraftValid,
    confirmRemoveLine,
    differenceLabel,
    totalDebit,
    requiresManager,
    managerLabel,
    managerValue,
    formManagerSuggestions,
    setFormManagerQuery,
    setFormManagerSuggestions,
    filterOptions,
    managerOptions,
    managersLoading,
    salesmanValue,
    formSalesmanSuggestions,
    setFormSalesmanQuery,
    setFormSalesmanSuggestions,
    salesmanOptions,
    salesmenLoading,
    setFormSalesmanId,
    salesmanIssueInfoMessage,
    paidByInputId,
    paidByInputRef,
    focusPaidByInput,
    focusSaveButton,
    setFormManagerId,
    chequeInFavour,
    setChequeInFavour,
    chequeInFavourInputRef,
    openAdd,
    openEdit,
    openEditForRow,
    addAnotherAfterSave,
    setAddAnotherAfterSave,
    addAnotherAfterSaveInputId,
    runDrySaveCheck,
    runDryDeleteCheck,
    save,
    cancelForm,
    handleDelete,
    handleCancelVoucherToggle,
    cancelledChecked,
    setCancelledChecked,
    editingId,
    lastSavedVoucher,
    showSavedStatusBar,
    recentlySavedVouchers: recentlySavedVouchersForMode,
    openRecentlySavedVoucher,
    openLastSavedVoucherForEdit,
    addButtonId,
    saveButtonId,
    drySaveCheckButtonId,
    dryDeleteCheckButtonId,
    voucherDateInputRef,
    toastRef,
    filteredRows: filteredRowsForTable,
    rowsPerPage,
    setRowsPerPage,
    first,
    setFirst,
    hasApplied,
    registerVariables,
    setAppliedVariables,
    refetch,
    totalRecordsForTable,
    loading: registerLoading,
    registerQueryLoading,
    pageIndexLoading,
    activePageIndexLoadMs,
    lastPageIndexLoadMs,
    startPageIndexLoadMeasurement,
    selectedRow,
    setSelectedRow,
    columnFilters,
    setColumnFilters,
    dateRange,
    setDateRange,
    dateErrors,
    setDateErrors,
    hasTouchedDatesRef,
    registerFilterFocusNonce,
    fiscalRange,
    fromDateInputRef,
    toDateInputRef,
    cancelled,
    setCancelled,
    reconciled,
    setReconciled,
    totals,
    receiptRegisterTotals,
    handleTemplateVoucherPrint,
    printMenuItems,
    printMenuRef,
    refreshButtonId,
    handleRefresh,
    canRefresh,
    hasActiveColumnFilters,
    hasGlobalSearch,
    hasClientSideFiltering,
    globalSearchText,
    setGlobalSearchText,
    globalSearchMatchCase,
    setGlobalSearchMatchCase,
    globalSearchWholeWord,
    setGlobalSearchWholeWord,
    voucherTypeNoFilterElement,
    voucherPostingDateFilterElement,
    voucherDateFullPaidFilterElement,
    refFilterElement,
    ledgerCrDrFilterElement,
    managerSalesmanFilterElement,
    bankBranchFilterElement,
    fullPaidFilterElement,
    totalDiscountFilterElement,
    netAdjustedFilterElement,
    netAmtFilterElement,
    diffAmtFilterElement,
    chequeReturnStatusFilterElement,
    chequeCancelChargesFilterElement,
    narrationFilterElement,
    paidByFilterElement,
    ledgerGroupFilterElement,
    cashLedgerLabel,
    registerPrimaryLedgerLabel,
    registerEntryLedgerLabel,
  };
};

export type VoucherViewProps = ReturnType<typeof useVoucherState>;
