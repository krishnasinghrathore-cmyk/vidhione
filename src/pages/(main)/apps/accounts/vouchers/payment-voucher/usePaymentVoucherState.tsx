'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import type { AutoComplete } from 'primereact/autocomplete';
import type { ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import type { Menu } from 'primereact/menu';
import type { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import AppDateInput from '@/components/AppDateInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import { useLedgerOptionsByPurpose, type LedgerOption } from '@/lib/accounts/ledgerOptions';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { isBankAccountsLabel } from '@/lib/accounts/ledgerGroupFilter';
import { VoucherTypeIds } from '@/lib/accounts/voucherTypeIds';
import { useAuth } from '@/lib/auth/context';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange } from '@/lib/reportDateValidation';

import type {
    ChequeIssueBookRow,
    ColumnFilterMeta,
    DebitLineDraft,
    DebitLineEditorDraft,
    ManagerRow,
    PaymentVoucherDisplayRow,
    PaymentMode,
    PaymentVoucherRouteView,
    PaymentViaOption,
    SelectOption,
    VoucherRow
} from './types';
import {
    CHEQUE_ISSUE_BOOKS,
    CREATE_VOUCHER,
    DELETE_VOUCHER,
    LEDGER_CURRENT_BALANCE,
    MANAGERS,
    NEXT_VOUCHER_NUMBER,
    PAYMENT_VIA_MASTERS,
    UPDATE_VOUCHER,
    VOUCHER_ENTRY_BY_ID,
    VOUCHER_REGISTER_BY_LEDGER,
    VOUCHER_TYPES
} from './graphql';
import {
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
    isCashInHandLabel,
    isEmptyFilterValue,
    normalizeTextValue,
    parseDateText,
    parseInputNumber,
    persistPaymentMode,
    resolveAddress,
    resolveFilterValue,
    resolveReportRange,
    toDateKey,
    toDateText
} from './utils';

const createLineEditorDraft = (overrides: Partial<DebitLineEditorDraft> = {}): DebitLineEditorDraft => ({
    mode: 'add',
    targetKey: null,
    ledgerGroupId: null,
    ledgerId: null,
    ledgerOption: null,
    amount: null,
    label: null,
    ...overrides
});

const decodeRouteToken = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

type PaymentVoucherFormSnapshot = {
    editingId: number | null;
    voucherNo: string;
    voucherDateText: string | null;
    postingDateText: string | null;
    paymentViaId: number | null;
    refNo: string;
    refDateText: string | null;
    chequeIssueBookId: number | null;
    cashLedgerId: number | null;
    paymentLedgerGroupId: number | null;
    cashLedgerAmount: number | null;
    chequeInFavour: string;
    narration: string;
    formManagerId: number | null;
    cancelledChecked: boolean;
    lines: Array<{
        ledgerGroupId: number | null;
        ledgerId: number | null;
        amount: number | null;
        label: string | null;
    }>;
    lineEditorCarryGroupId: number | null;
    lineEditorDraft: {
        mode: 'add' | 'edit';
        targetKey: string | null;
        ledgerGroupId: number | null;
        ledgerId: number | null;
        amount: number | null;
        label: string | null;
    };
};

export const usePaymentVoucherState = (
    routeMode: PaymentMode,
    routeView: PaymentVoucherRouteView,
    routeVoucherNo: string | null
) => {
    const { setPageTitle } = useContext(LayoutContext);
    const apolloClient = useApolloClient();
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const { companyContext, agencyOptions } = useAuth();
    const autoCompleteAppendTarget = typeof window !== 'undefined' ? document.body : undefined;

    const [cashLedgerId, setCashLedgerId] = useState<number | null>(null);
    const [paymentLedgerGroupId, setPaymentLedgerGroupId] = useState<number | null>(null);
    const paymentMode = routeMode;
    const registerRoutePath = useCallback((mode: PaymentMode = paymentMode) => `/apps/accounts/payment-vouchers/${mode}`, [paymentMode]);
    const newRoutePath = useCallback((mode: PaymentMode = paymentMode) => `/apps/accounts/payment-vouchers/${mode}/new`, [paymentMode]);
    const editRoutePath = useCallback(
        (voucherNo: string | number, mode: PaymentMode = paymentMode) =>
            `/apps/accounts/payment-vouchers/${mode}/edit/${encodeURIComponent(String(voucherNo))}`,
        [paymentMode]
    );
    const [paymentViaId, setPaymentViaId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<0 | 1>(0);
    const initialRangeRef = useRef(resolveReportRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const [printFormat, setPrintFormat] = useState<'format-1' | 'format-2'>('format-1');
    const fromDateInputRef = useRef<HTMLInputElement | null>(null);
    const toDateInputRef = useRef<HTMLInputElement | null>(null);
    const cashLedgerInputRef = useRef<AutoComplete | null>(null);
    const cashLedgerAmountInputRef = useRef<HTMLInputElement | null>(null);
    const paidByInputRef = useRef<AutoComplete | null>(null);
    const voucherDateInputRef = useRef<HTMLInputElement | null>(null);
    const lineEditorLedgerGroupRef = useRef<AutoComplete | null>(null);
    const lineEditorLedgerRef = useRef<AutoComplete | null>(null);
    const lineEditorAmountRef = useRef<HTMLInputElement | null>(null);
    const refreshButtonId = 'cash-expenditure-refresh';
    const saveButtonId = 'payment-voucher-save';
    const printMenuRef = useRef<Menu>(null);
    const missingConfigRef = useRef(false);

    const [isFormActive, setIsFormActive] = useState(false);
    const [focusNonce, setFocusNonce] = useState(0);
    const [selectedRow, setSelectedRow] = useState<VoucherRow | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [voucherNo, setVoucherNo] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [postingDate, setPostingDate] = useState<Date | null>(new Date());
    const [refNo, setRefNo] = useState('');
    const [refDate, setRefDate] = useState<Date | null>(null);
    const [cashLedgerAmount, setCashLedgerAmount] = useState<number | null>(null);
    const [cashLedgerAmountDraft, setCashLedgerAmountDraft] = useState<number | null | undefined>(undefined);
    const [cashLedgerOption, setCashLedgerOption] = useState<LedgerOption | null>(null);
    const [chequeInFavour, setChequeInFavour] = useState('');
    const [chequeIssueBookId, setChequeIssueBookId] = useState<number | null>(null);
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [postingDateError, setPostingDateError] = useState<string | null>(null);
    const [refDateError, setRefDateError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [narration, setNarration] = useState('');
    const [lines, setLines] = useState<DebitLineDraft[]>([]);
    const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);
    const [lineEditorCarryGroupId, setLineEditorCarryGroupId] = useState<number | null>(null);
    const [lineEditorDraft, setLineEditorDraft] = useState<DebitLineEditorDraft>(() => createLineEditorDraft());
    const [formManagerId, setFormManagerId] = useState<number | null>(null);
    const [formManagerQuery, setFormManagerQuery] = useState('');
    const [formManagerSuggestions, setFormManagerSuggestions] = useState<SelectOption[]>([]);
    const [cancelledChecked, setCancelledChecked] = useState(false);
    const [saving, setSaving] = useState(false);
    const paymentModeInitRef = useRef(false);
    const previousPaymentModeRef = useRef<PaymentMode>(paymentMode);
    const routeSyncKeyRef = useRef<string | null>(null);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [filterSourceRows, setFilterSourceRows] = useState<VoucherRow[] | null>(null);
    const [filterSourceLoading, setFilterSourceLoading] = useState(false);
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
    const [initialFormSnapshotJson, setInitialFormSnapshotJson] = useState<string | null>(null);
    const [formSnapshotCaptureToken, setFormSnapshotCaptureToken] = useState(0);
    const pageHeading = paymentMode === 'bank' ? 'Payment Vouchers – Bank' : 'Payment Vouchers – Cash';

    useEffect(() => {
        setPageTitle(pageHeading);
        return () => setPageTitle(null);
    }, [pageHeading, setPageTitle]);

    useEffect(() => {
        persistPaymentMode(paymentMode);
    }, [paymentMode]);

    const clearFormError = useCallback((key: string) => {
        setFormErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const normalizeSnapshotAmount = useCallback((value: number | null | undefined) => {
        if (value == null) return null;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }, []);

    const toSnapshotDateText = useCallback((value: Date | null) => toDateText(value), []);

    const buildCurrentFormSnapshot = useCallback((): PaymentVoucherFormSnapshot => {
        const effectiveHeaderAmount = cashLedgerAmountDraft !== undefined ? cashLedgerAmountDraft : cashLedgerAmount;
        return {
            editingId,
            voucherNo,
            voucherDateText: toSnapshotDateText(voucherDate),
            postingDateText: toSnapshotDateText(postingDate),
            paymentViaId: paymentViaId != null ? Number(paymentViaId) : null,
            refNo,
            refDateText: toSnapshotDateText(refDate),
            chequeIssueBookId: chequeIssueBookId != null ? Number(chequeIssueBookId) : null,
            cashLedgerId: cashLedgerId != null ? Number(cashLedgerId) : null,
            paymentLedgerGroupId: paymentLedgerGroupId != null ? Number(paymentLedgerGroupId) : null,
            cashLedgerAmount: normalizeSnapshotAmount(effectiveHeaderAmount),
            chequeInFavour,
            narration,
            formManagerId: formManagerId != null ? Number(formManagerId) : null,
            cancelledChecked,
            lines: lines.map((line) => ({
                ledgerGroupId: line.ledgerGroupId != null ? Number(line.ledgerGroupId) : null,
                ledgerId: line.ledgerId != null ? Number(line.ledgerId) : null,
                amount: normalizeSnapshotAmount(line.amount),
                label: line.label ?? line.ledgerOption?.label ?? null
            })),
            lineEditorCarryGroupId: lineEditorCarryGroupId != null ? Number(lineEditorCarryGroupId) : null,
            lineEditorDraft: {
                mode: lineEditorDraft.mode,
                targetKey: lineEditorDraft.targetKey ?? null,
                ledgerGroupId: lineEditorDraft.ledgerGroupId != null ? Number(lineEditorDraft.ledgerGroupId) : null,
                ledgerId: lineEditorDraft.ledgerId != null ? Number(lineEditorDraft.ledgerId) : null,
                amount: normalizeSnapshotAmount(lineEditorDraft.amount),
                label: lineEditorDraft.label ?? lineEditorDraft.ledgerOption?.label ?? null
            }
        };
    }, [
        cancelledChecked,
        cashLedgerAmount,
        cashLedgerAmountDraft,
        cashLedgerId,
        chequeInFavour,
        chequeIssueBookId,
        editingId,
        formManagerId,
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
        refDate,
        refNo,
        toSnapshotDateText,
        voucherDate,
        voucherNo
    ]);

    const scheduleFormSnapshotCapture = useCallback(() => {
        setFormSnapshotCaptureToken((value) => value + 1);
    }, []);

    const isFormDirty = useMemo(() => {
        if (!isFormActive) return false;
        if (!initialFormSnapshotJson) return false;
        return JSON.stringify(buildCurrentFormSnapshot()) !== initialFormSnapshotJson;
    }, [buildCurrentFormSnapshot, initialFormSnapshotJson, isFormActive]);

    const { data: voucherTypesData } = useQuery(VOUCHER_TYPES);
    const { data: managersData, loading: managersLoading } = useQuery(MANAGERS, { variables: { search: null, limit: 2000 } });
    const { data: paymentViaData, loading: paymentViaLoading } = useQuery(PAYMENT_VIA_MASTERS, {
        variables: { search: null, limit: 2000, includeInactive: true }
    });
    const { data: chequeBooksData } = useQuery(CHEQUE_ISSUE_BOOKS, {
        variables: { bankLedgerId: cashLedgerId ?? null, limit: 2000 },
        skip: paymentMode !== 'bank' || !cashLedgerId
    });
    const { options: ledgerGroupOptions, loading: ledgerGroupOptionsLoading } = useLedgerGroupOptions();

    const paymentModeOptions = useMemo(
        () => [
            { label: 'CASH', value: 'cash' as PaymentMode },
            { label: 'BANK', value: 'bank' as PaymentMode }
        ],
        []
    );

    useEffect(() => {
        if (!selectedLineKey) return;
        const exists = lines.some((line) => line.key === selectedLineKey);
        if (!exists) {
            setSelectedLineKey(null);
        }
    }, [lines, selectedLineKey]);

    useEffect(() => {
        if (lineEditorDraft.mode !== 'edit' || !lineEditorDraft.targetKey) return;
        const exists = lines.some((line) => line.key === lineEditorDraft.targetKey);
        if (!exists) {
            setLineEditorDraft(createLineEditorDraft());
        }
    }, [lineEditorDraft.mode, lineEditorDraft.targetKey, lines]);

    useEffect(() => {
        if (!isFormActive) return;
        if (formSnapshotCaptureToken <= 0) return;
        setInitialFormSnapshotJson(JSON.stringify(buildCurrentFormSnapshot()));
    }, [buildCurrentFormSnapshot, formSnapshotCaptureToken, isFormActive]);

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
                isActive: row.isActive ?? null
            }));
    }, [paymentViaData]);
    const chequePaymentViaId = useMemo(
        () => paymentViaOptions.find((option) => (option.code ?? '').toUpperCase() === 'CHEQUE')?.value ?? null,
        [paymentViaOptions]
    );
    const selectedPaymentVia = useMemo(
        () => paymentViaOptions.find((option) => option.value === paymentViaId) ?? null,
        [paymentViaId, paymentViaOptions]
    );
    const isCashMode = paymentMode === 'cash';
    const isBankMode = paymentMode === 'bank';
    const isChequePayment = isBankMode && (selectedPaymentVia?.code ?? '').toUpperCase() === 'CHEQUE';
    const paymentLedgerLabel = isCashMode ? 'Cash Ledger (Cr)' : 'Bank Ledger (Cr)';
    const paymentLedgerPurpose = isCashMode ? 'CONTRA-CASH' : 'CONTRA-BANK';
    const paymentLedgerPlaceholder = isCashMode ? 'Cash ledger' : 'Bank ledger';
    const paymentLedgerLoadingPlaceholder = isCashMode ? 'Loading cash ledgers...' : 'Loading bank ledgers...';
    const paymentLedgerPlaceholderResolved = paymentLedgerGroupId ? paymentLedgerPlaceholder : 'Select ledger group first';
    const resolveGroupOption = useCallback(
        (groupTypeCode: number, labelMatcher?: (value?: string | null) => boolean) => {
            if (!ledgerGroupOptions.length) return null;
            const byExactId = ledgerGroupOptions.find((option) => Number(option.value) === Number(groupTypeCode));
            if (byExactId) return byExactId;
            const byType = ledgerGroupOptions.find((option) => Number(option.groupTypeCode) === Number(groupTypeCode));
            if (byType) return byType;
            if (labelMatcher) {
                return ledgerGroupOptions.find((option) => labelMatcher(option.label ?? option.name)) ?? null;
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
        if (isCashMode) return cashLedgerGroupOption?.value ?? null;
        if (isBankMode) return bankLedgerGroupOption?.value ?? null;
        return null;
    }, [bankLedgerGroupOption, cashLedgerGroupOption, isBankMode, isCashMode]);
    const paymentLedgerGroupDisabled =
        !isFormActive || ledgerGroupOptionsLoading || Boolean(resolvedPaymentLedgerGroupId);
    const refNoLabel = isChequePayment ? 'Cheque No.' : 'Reference No.';
    const refDateLabel = isChequePayment ? 'Cheque Date' : 'Reference Date';
    const defaultLedgerGroupTypeCodes = useMemo(
        () => (isBankMode ? BANK_LEDGER_GROUP_TYPES : CASH_LEDGER_GROUP_TYPES),
        [isBankMode]
    );

    const { options: paymentLedgerOptions, loading: paymentLedgerOptionsLoading } = useLedgerOptionsByPurpose({
        purpose: paymentLedgerPurpose,
        ledgerGroupId: paymentLedgerGroupId ?? null,
        limit: 2000,
        skip: !paymentLedgerPurpose
    });
    const selectedPaymentLedger = useMemo(
        () => paymentLedgerOptions.find((option) => Number(option.value) === Number(cashLedgerId)) ?? null,
        [cashLedgerId, paymentLedgerOptions]
    );
    useEffect(() => {
        if (cashLedgerId == null) {
            setCashLedgerOption(null);
            return;
        }
        if (cashLedgerOption && Number(cashLedgerOption.value) === Number(cashLedgerId)) {
            return;
        }
        if (selectedPaymentLedger) {
            setCashLedgerOption(selectedPaymentLedger);
        }
    }, [cashLedgerId, cashLedgerOption, selectedPaymentLedger]);
    const cashLedgerAddress = useMemo(
        () => resolveAddress(cashLedgerOption?.address, selectedPaymentLedger?.address),
        [cashLedgerOption, selectedPaymentLedger]
    );
    const cashLedgerAddressLabel = cashLedgerId != null ? cashLedgerAddress ?? 'Address not available' : null;
    const cashLedgerLabel = useMemo(
        () => cashLedgerOption?.label ?? selectedPaymentLedger?.label ?? '',
        [cashLedgerOption, selectedPaymentLedger]
    );
    const { options: paymentAgainstOptions } = useLedgerOptionsByPurpose({
        purpose: 'PAYMENT-AGAINST',
        limit: 2000
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

    const voucherTypeId = useMemo(() => {
        const rows = voucherTypesData?.voucherTypes ?? [];
        const match = rows.find((v: any) => Number(v.voucherTypeId) === VoucherTypeIds.Payment);
        return match ? Number(match.voucherTypeId) : null;
    }, [voucherTypesData]);

    const companyFiscalYearId = companyContext?.companyFiscalYearId ?? null;
    const fiscalYearStart = companyContext?.fiscalYearStart ?? null;
    const fiscalYearEnd = companyContext?.fiscalYearEnd ?? null;
    const canFetchNextNo = Boolean(voucherTypeId);
    const nextVoucherVariables = useMemo(
        () => ({
            voucherTypeId: voucherTypeId ?? 0,
            companyFiscalYearId: companyFiscalYearId ?? null,
            fiscalYearStart,
            fiscalYearEnd
        }),
        [companyFiscalYearId, fiscalYearEnd, fiscalYearStart, voucherTypeId]
    );

    const { data: nextNoData, refetch: refetchNextNo, error: nextNoError } = useQuery(NEXT_VOUCHER_NUMBER, {
        skip: !canFetchNextNo,
        variables: nextVoucherVariables
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
            severity: 'warn',
            summary: 'Configuration',
            detail: 'Unable to generate voucher number. Please contact administrator.'
        });
        missingConfigRef.current = true;
    }, [editingId, isFormActive, nextNoError]);

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const voucherFormSchema = useMemo(() => buildVoucherFormSchema(fiscalRange, refDateLabel), [fiscalRange, refDateLabel]);
    const hasTouchedDatesRef = useRef(false);
    const canRefresh = Boolean(fromDate && toDate);

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveReportRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const registerVariables = useMemo(
        () => ({
            mode: paymentMode,
            ledgerId: null,
            ledgerGroupTypeCodes: defaultLedgerGroupTypeCodes,
            ledgerDrCrFlag: 2,
            againstLedgerId: null,
            againstDrCrFlag: null,
            voucherTypeIds: [VoucherTypeIds.Payment, VoucherTypeIds.MPayment],
            managerId: null,
            fromDate,
            toDate,
            cancelled,
            limit: rowsPerPage,
            offset: first,
            excludeOpening: true
        }),
        [cancelled, defaultLedgerGroupTypeCodes, first, fromDate, paymentMode, rowsPerPage, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;
    const isSameRegisterVariables = useCallback(
        (left: typeof registerVariables | null, right: typeof registerVariables) => {
            if (!left) return false;
            return (
                left.mode === right.mode &&
                left.ledgerId === right.ledgerId &&
                left.ledgerDrCrFlag === right.ledgerDrCrFlag &&
                left.againstLedgerId === right.againstLedgerId &&
                left.againstDrCrFlag === right.againstDrCrFlag &&
                left.managerId === right.managerId &&
                left.fromDate === right.fromDate &&
                left.toDate === right.toDate &&
                left.cancelled === right.cancelled &&
                left.limit === right.limit &&
                left.offset === right.offset &&
                left.excludeOpening === right.excludeOpening &&
                left.ledgerGroupTypeCodes.length === right.ledgerGroupTypeCodes.length &&
                left.ledgerGroupTypeCodes.every((value, index) => value === right.ledgerGroupTypeCodes[index]) &&
                left.voucherTypeIds.length === right.voucherTypeIds.length &&
                left.voucherTypeIds.every((value, index) => value === right.voucherTypeIds[index])
            );
        },
        []
    );

    const { data, loading, error, refetch } = useQuery(VOUCHER_REGISTER_BY_LEDGER, {
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables
    });

    const appliedBaseVariables = useMemo(() => {
        if (!appliedVariables) return null;
        const { limit: _limit, offset: _offset, ...rest } = appliedVariables;
        return rest;
    }, [appliedVariables]);
    const appliedBaseKey = useMemo(
        () => (appliedBaseVariables ? JSON.stringify(appliedBaseVariables) : ''),
        [appliedBaseVariables]
    );

    useEffect(() => {
        if (!hasApplied) {
            setFilterSourceRows(null);
            setFilterSourceLoading(false);
            return;
        }
        setFilterSourceRows(null);
        setFilterSourceLoading(false);
    }, [appliedBaseKey, hasApplied]);

    const { data: editData, refetch: refetchEdit } = useQuery(VOUCHER_ENTRY_BY_ID, {
        skip: !editingId,
        variables: { voucherId: editingId ?? 0 }
    });
    const cashLedgerBalanceDate = postingDate ?? voucherDate ?? dateRange[1] ?? null;
    const cashLedgerBalanceToDateText = useMemo(() => toDateText(cashLedgerBalanceDate), [cashLedgerBalanceDate]);
    const { data: cashLedgerBalanceData, loading: cashLedgerBalanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: cashLedgerId == null || !cashLedgerBalanceToDateText,
        variables: {
            ledgerId: cashLedgerId ?? 0,
            toDate: cashLedgerBalanceToDateText,
            cancelled
        }
    });
    const lineEditorLedgerId = lineEditorDraft.ledgerId != null ? Number(lineEditorDraft.ledgerId) : null;
    const lineEditorAddress = useMemo(
        () =>
            resolveAddress(
                lineEditorDraft.ledgerOption?.address,
                lineEditorLedgerId != null ? paymentAgainstAddressMap.get(lineEditorLedgerId) ?? null : null
            ),
        [lineEditorDraft.ledgerOption?.address, lineEditorLedgerId, paymentAgainstAddressMap]
    );
    const debitLineBalanceDate = postingDate ?? voucherDate ?? dateRange[1] ?? null;
    const debitLineBalanceToDateText = useMemo(() => toDateText(debitLineBalanceDate), [debitLineBalanceDate]);
    const { data: lineEditorBalanceData, loading: lineEditorBalanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: lineEditorLedgerId == null || !debitLineBalanceToDateText,
        variables: {
            ledgerId: lineEditorLedgerId ?? 0,
            toDate: debitLineBalanceToDateText,
            cancelled
        }
    });

    const [createVoucher] = useMutation(CREATE_VOUCHER);
    const [updateVoucher] = useMutation(UPDATE_VOUCHER);
    const [deleteVoucherEntry] = useMutation(DELETE_VOUCHER);

    const filterOptions = <T extends { label: string }>(options: T[], query: string) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return options;
        return options.filter((option) => option.label.toLowerCase().includes(needle));
    };

    const managerOptions = useMemo((): SelectOption[] => {
        const rows = (managersData?.managers ?? []) as ManagerRow[];
        return rows.map((m) => ({ label: m.name ?? `Manager ${m.managerId}`, value: Number(m.managerId) }));
    }, [managersData]);

    const chequeBookOptions = useMemo(() => {
        const rows = (chequeBooksData?.chequeIssueBooks ?? []) as ChequeIssueBookRow[];
        return rows
            .filter((row) => !row.isCancelledFlag)
            .map((row) => {
                const labelParts = [
                    row.voucherNumber ? row.voucherNumber : `Book ${row.chequeIssueBookId}`,
                    row.chequeStartNumber != null && row.chequeEndNumber != null
                        ? `(${row.chequeStartNumber} to ${row.chequeEndNumber})`
                        : null
                ].filter(Boolean);
                return { label: labelParts.join(' '), value: Number(row.chequeIssueBookId) };
            });
    }, [chequeBooksData]);

    const selectedManager = useMemo(
        () => (formManagerId != null ? managerOptions.find((m) => m.value === formManagerId) ?? null : null),
        [formManagerId, managerOptions]
    );
    const managerValue = formManagerQuery.length ? formManagerQuery : selectedManager;

    useEffect(() => {
        setFormManagerSuggestions(filterOptions(managerOptions, formManagerQuery));
    }, [formManagerQuery, managerOptions]);

    const rows: VoucherRow[] = useMemo(
        () => (hasApplied ? data?.voucherRegisterByLedgerDetailed?.items ?? [] : []),
        [data, hasApplied]
    );
    const totalCount = hasApplied ? data?.voucherRegisterByLedgerDetailed?.totalCount ?? rows.length ?? 0 : 0;

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
                query: VOUCHER_REGISTER_BY_LEDGER,
                fetchPolicy: 'network-only',
                variables: {
                    ...appliedBaseVariables,
                    limit: totalCount,
                    offset: 0
                }
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
        rows,
        totalCount
    ]);


    const cashLedgerBalanceLabel = useMemo(() => {
        if (!cashLedgerId) return null;
        if (cashLedgerBalanceLoading) return 'Loading...';
        const balance = cashLedgerBalanceData?.ledgerCurrentBalance;
        if (!balance) return `${formatAmount(0)} Dr`;
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [cashLedgerBalanceData, cashLedgerBalanceLoading, cashLedgerId]);
    const lineEditorBalanceLabel = useMemo(() => {
        if (!lineEditorLedgerId) return null;
        if (lineEditorBalanceLoading) return 'Loading...';
        const balance = lineEditorBalanceData?.ledgerCurrentBalance;
        if (!balance) return `${formatAmount(0)} Dr`;
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [lineEditorBalanceData, lineEditorBalanceLoading, lineEditorLedgerId]);

    const cashLedgerBalanceClass = useMemo(() => {
        if (cashLedgerBalanceLoading) return 'text-600';
        const drCr = cashLedgerBalanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'text-red-600' : 'text-green-600';
    }, [cashLedgerBalanceData, cashLedgerBalanceLoading]);
    const lineEditorBalanceClass = useMemo(() => {
        if (lineEditorBalanceLoading) return 'text-600';
        const drCr = lineEditorBalanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'text-red-600' : 'text-green-600';
    }, [lineEditorBalanceData, lineEditorBalanceLoading]);

    const handleRefresh = useCallback(() => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const shouldForceRefetch =
            hasApplied && isSameRegisterVariables(appliedVariables, registerVariables);
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
        refetch
    ]);

    const focusLineEditorAmountInput = () => {
        const input = lineEditorAmountRef.current ?? null;
        if (!input) return;
        input.focus();
        if (typeof input.setSelectionRange === 'function') {
            const length = input.value?.length ?? 0;
            input.setSelectionRange(0, length);
        }
    };

    const focusLineEditorLedgerGroupInput = () => {
        const ref = lineEditorLedgerGroupRef.current ?? null;
        ref?.focus?.();
        ref?.show?.();
    };

    const focusLineEditorLedgerInput = () => {
        const ref = lineEditorLedgerRef.current ?? null;
        ref?.focus?.();
        ref?.show?.();
    };

    const focusPaymentLedgerInput = () => {
        const ref = cashLedgerInputRef.current ?? null;
        ref?.focus?.();
        ref?.show?.();
    };

    const focusCashLedgerAmountInput = () => {
        const input = cashLedgerAmountInputRef.current ?? null;
        if (!input) return;
        input.focus();
        if (typeof input.setSelectionRange === 'function') {
            const length = input.value?.length ?? 0;
            input.setSelectionRange(0, length);
        }
    };

    const focusPaidByInput = () => {
        const ref = paidByInputRef.current ?? null;
        const input = ref?.getInput?.() ?? null;
        if (!(input instanceof HTMLInputElement)) return;
        input.focus();
        if (typeof input.setSelectionRange === 'function') {
            const length = input.value?.length ?? 0;
            input.setSelectionRange(0, length);
        }
    };

    const focusSaveButton = () => {
        const button = document.getElementById(saveButtonId) as HTMLButtonElement | null;
        button?.focus();
    };

    const resetVoucherFormState = useCallback(() => {
        setIsFormActive(false);
        setEditingId(null);
        setSelectedRow(null);
        setCancelledChecked(false);
        setCashLedgerAmount(null);
        setCashLedgerAmountDraft(undefined);
        setCashLedgerOption(null);
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setFormErrors({});
        setChequeInFavour('');
        setChequeIssueBookId(null);
        setNarration('');
        setLines([]);
        setFormManagerId(null);
        setFormManagerQuery('');
        setSelectedLineKey(null);
        setLineEditorCarryGroupId(null);
        setLineEditorDraft(createLineEditorDraft());
        setInitialFormSnapshotJson(null);
    }, []);

    const executeModeSwitch = useCallback(
        (nextMode: PaymentMode) => {
            if (isFormActive) {
                resetVoucherFormState();
            }
            persistPaymentMode(nextMode);
            navigate(registerRoutePath(nextMode));
        },
        [isFormActive, navigate, registerRoutePath, resetVoucherFormState]
    );

    const changePaymentMode = useCallback(
        (nextMode: PaymentMode) => {
            if (nextMode === paymentMode) return;
            if (!isFormActive || !isFormDirty) {
                executeModeSwitch(nextMode);
                return;
            }

            const nextModeLabel = nextMode === 'cash' ? 'Cash' : 'Bank';
            confirmDialog({
                header: 'Switch Payment Mode?',
                message: `You have unsaved changes in this voucher. Switching to ${nextModeLabel} will discard them.`,
                icon: 'pi pi-exclamation-triangle',
                rejectLabel: 'Stay',
                acceptLabel: 'Switch Mode',
                acceptClassName: 'p-button-danger',
                accept: () => executeModeSwitch(nextMode),
                reject: () => undefined
            });
        },
        [executeModeSwitch, isFormActive, isFormDirty, paymentMode]
    );

    useEffect(() => {
        if (!paymentModeInitRef.current) {
            paymentModeInitRef.current = true;
            return;
        }
        setIsFormActive(false);
        setEditingId(null);
        setSelectedRow(null);
        setCashLedgerId(null);
        setCashLedgerAmount(null);
        setCashLedgerOption(null);
        setPaymentLedgerGroupId(null);
        setSelectedLineKey(null);
        setLineEditorCarryGroupId(null);
        setLineEditorDraft(createLineEditorDraft());
        setFormErrors({});
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setInitialFormSnapshotJson(null);
    }, [paymentMode]);

    useEffect(() => {
        if (previousPaymentModeRef.current === paymentMode) return;
        previousPaymentModeRef.current = paymentMode;
        setFirst(0);
        setAppliedVariables({
            ...registerVariables,
            mode: paymentMode,
            ledgerGroupTypeCodes: defaultLedgerGroupTypeCodes,
            offset: 0
        });
    }, [defaultLedgerGroupTypeCodes, paymentMode, registerVariables]);

    useEffect(() => {
        if (!resolvedPaymentLedgerGroupId) return;
        setPaymentLedgerGroupId((prev) =>
            Number(prev) === Number(resolvedPaymentLedgerGroupId) ? prev : Number(resolvedPaymentLedgerGroupId)
        );
    }, [resolvedPaymentLedgerGroupId]);

    useEffect(() => {
        if (paymentMode === 'bank') {
            if (paymentViaId == null && chequePaymentViaId != null) {
                setPaymentViaId(chequePaymentViaId);
            }
            return;
        }
        if (paymentViaId != null) {
            setPaymentViaId(null);
        }
    }, [paymentMode, paymentViaId, chequePaymentViaId]);

    useEffect(() => {
        if (!isCashMode) return;
        if (cashLedgerId != null) return;
        const defaultLedgerId = agencyOptions?.defaultExpenditureLedgerId ?? null;
        if (defaultLedgerId != null) {
            setCashLedgerId(defaultLedgerId);
        }
    }, [agencyOptions, cashLedgerId, isCashMode]);

    useEffect(() => {
        if (!isFormActive || editingId) return;
        if (!canFetchNextNo) return;
        refetchNextNo(nextVoucherVariables)
            .then((next) => {
                setVoucherNo(next.data?.nextVoucherNumber ?? '');
            })
            .catch(() => undefined);
    }, [canFetchNextNo, editingId, isFormActive, nextVoucherVariables, refetchNextNo]);

    useEffect(() => {
        if (!isFormActive || !editingId) return;
        refetchEdit({ voucherId: editingId }).catch(() => undefined);
    }, [editingId, isFormActive, refetchEdit]);

    useEffect(() => {
        if (!isFormActive || !editingId) return;
        const header = editData?.voucherEntryById?.header;
        if (!header) return;
        setVoucherNo(header.voucherNumber ?? '');
        setVoucherDate(header.voucherDate ? new Date(`${header.voucherDate}T00:00:00`) : new Date());
        setPostingDate(header.postingDate ? new Date(`${header.postingDate}T00:00:00`) : new Date());
        const fallbackRow =
            selectedRow?.voucherId === editingId ? selectedRow : rows.find((row) => row.voucherId === editingId) ?? null;
        const fallbackRefNo = fallbackRow?.refNo ?? '';
        const fallbackRefDate = fallbackRow?.refDate ?? null;
        const fallbackDebitGroupName = fallbackRow?.debitLedgerGroupName ?? '';
        const fallbackDebitGroupId = (() => {
            const normalized = normalizeTextValue(fallbackDebitGroupName);
            if (!normalized) return null;
            const match = ledgerGroupOptions.find((option) => {
                const label = option.label ?? option.name ?? '';
                return normalizeTextValue(label) === normalized;
            });
            return match ? Number(match.value) : null;
        })();
        const fallbackCreditLedgerName = (() => {
            const primaryFromHeader = (header.primaryLedgerName ?? '').trim();
            if (primaryFromHeader) return primaryFromHeader;
            const primaryFromRow = (fallbackRow?.creditLedgerName ?? '').trim();
            if (primaryFromRow) return primaryFromRow;
            const firstFromList = (fallbackRow?.creditLedgerNames ?? '')
                .split(/\r?\n/)
                .map((name) => name.trim())
                .find(Boolean);
            return firstFromList ?? '';
        })();
        const headerRefNo = header.refNo?.trim() ?? '';
        const headerRefDate = header.refDate?.trim() ?? '';
        setRefNo(headerRefNo || fallbackRefNo || '');
        setRefDate(parseDateText(headerRefDate) ?? parseDateText(fallbackRefDate));
        setChequeInFavour(header.chequeInFavourText ?? '');
        setChequeIssueBookId(header.chequeIssueBookId != null ? Number(header.chequeIssueBookId) : null);
        setPaymentViaId(header.paymentViaId != null ? Number(header.paymentViaId) : null);
        setNarration(header.narration ?? '');
        setFormManagerId(header.managerId != null ? Number(header.managerId) : null);
        setCancelledChecked(Number(header.isCancelledFlag) === 1);
        setCashLedgerAmount(null);
        setCashLedgerAmountDraft(undefined);
        setCashLedgerOption(null);
        setPaymentLedgerGroupId(null);

        const voucherLines = editData?.voucherEntryById?.lines ?? [];
        const primaryLedgerId = header.primaryLedgerId != null ? Number(header.primaryLedgerId) : null;
        const usesTwoFlag = voucherLines.some((line: any) => Number(line.drCrFlag) === 2);
        const isDebitFlag = (drCrFlag: number) => (usesTwoFlag ? drCrFlag === 1 : drCrFlag === 0);
        const isCreditFlag = (drCrFlag: number) => (usesTwoFlag ? drCrFlag === 2 : drCrFlag === 1);
        const debitLines = voucherLines.filter((line: any) => {
            if (!isDebitFlag(Number(line.drCrFlag ?? -1))) return false;
            const ledgerId = line.ledgerId != null ? Number(line.ledgerId) : null;
            if (primaryLedgerId != null && ledgerId != null && ledgerId === primaryLedgerId) return false;
            return true;
        });
        const creditLine = voucherLines.find((line: any) => isCreditFlag(Number(line.drCrFlag ?? -1)));
        const fallbackNames = (
            selectedRow?.debitLedgerNames ??
            rows.find((row) => row.voucherId === editingId)?.debitLedgerNames ??
            ''
        )
            .split(/\r?\n/)
            .map((name) => name.trim())
            .filter(Boolean);
        const fallbackAmounts = (
            selectedRow?.debitLedgerAmounts ??
            rows.find((row) => row.voucherId === editingId)?.debitLedgerAmounts ??
            ''
        )
            .split(/\r?\n/)
            .map((value) => parseInputNumber(String(value ?? '').replace(/,/g, '').trim()))
            .map((value) => (typeof value === 'number' ? value : null));

        const fallbackDisplayLines = Array.isArray((fallbackRow as any)?.ledgerDrLinesDisplay)
            ? ((fallbackRow as any).ledgerDrLinesDisplay as Array<{ name?: string | null; amount?: string | null }>)
            : [];
        const expectedDebitEntriesFromDisplay = fallbackDisplayLines
            .map((line) => {
                const parsedAmount = parseInputNumber(String(line?.amount ?? '').replace(/,/g, '').trim());
                return {
                    name: normalizeTextValue(line?.name ?? ''),
                    amount: typeof parsedAmount === 'number' ? Number(parsedAmount) : null
                };
            })
            .filter((entry) => entry.name || entry.amount != null);
        const expectedDebitEntriesFromRaw = fallbackNames.map((name, index) => ({
            name: normalizeTextValue(name),
            amount: fallbackAmounts[index] != null ? Number(fallbackAmounts[index]) : null
        }));
        const expectedDebitEntries =
            expectedDebitEntriesFromDisplay.length > 0 ? expectedDebitEntriesFromDisplay : expectedDebitEntriesFromRaw;

        let resolvedDebitLines = debitLines;
        if (expectedDebitEntries.length > 0 && debitLines.length > expectedDebitEntries.length) {
            const usedIndexes = new Set<number>();
            const matched: any[] = [];

            expectedDebitEntries.forEach((entry) => {
                let matchedIndex = -1;

                if (entry.name) {
                    matchedIndex = debitLines.findIndex((line: any, index: number) => {
                        if (usedIndexes.has(index)) return false;
                        const lineName = normalizeTextValue((line.ledgerName ?? '').trim());
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
            const option = ledgerId != null ? paymentAgainstOptionMap.get(ledgerId) ?? null : null;
            const lineLedgerName = typeof line.ledgerName === 'string' ? line.ledgerName.trim() : '';
            return createDebitLine({
                ledgerGroupId: fallbackDebitGroupId,
                ledgerId,
                ledgerOption: option,
                amount: line.amount != null ? Number(line.amount) : null,
                label: lineLedgerName || fallbackNames[index] || option?.label || null
            });
        });
        setLines(mappedLines);
        setSelectedLineKey(null);
        setLineEditorCarryGroupId(null);
        setLineEditorDraft(createLineEditorDraft());
        setFormManagerQuery('');
        const creditLedgerId = primaryLedgerId ?? (creditLine?.ledgerId != null ? Number(creditLine.ledgerId) : null);
        if (creditLedgerId != null) {
            setCashLedgerId(creditLedgerId);
            setCashLedgerOption({
                value: creditLedgerId,
                label: fallbackCreditLedgerName || `Ledger ${creditLedgerId}`,
                address: null
            });
        } else {
            setCashLedgerId(null);
            setCashLedgerOption(null);
        }
        if (header.totalNetAmount != null && Number.isFinite(Number(header.totalNetAmount))) {
            setCashLedgerAmount(Number(header.totalNetAmount));
        } else if (creditLine?.amount != null) {
            setCashLedgerAmount(Number(creditLine.amount));
        } else {
            setCashLedgerAmount(fallbackRow?.totalNetAmount != null ? Number(fallbackRow.totalNetAmount) : null);
        }
        scheduleFormSnapshotCapture();
    }, [editData, editingId, isFormActive, ledgerGroupOptions, paymentAgainstOptionMap, rows, scheduleFormSnapshotCapture, selectedRow]);

    useEffect(() => {
        if (!selectedRow) return;
        const stillExists = rows.some((row) => row.voucherId === selectedRow.voucherId);
        if (!stillExists) setSelectedRow(null);
    }, [rows, selectedRow]);

    useEffect(() => {
        if (!isFormActive) return;
        const rafId = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                voucherDateInputRef.current?.focus();
            });
        });
        return () => window.cancelAnimationFrame(rafId);
    }, [isFormActive, focusNonce]);

    const focusVoucherDateInput = () => {
        const element = voucherDateInputRef.current;
        if (!element) return;
        element.focus();
        if (typeof element.setSelectionRange === 'function') {
            const length = element.value?.length ?? 0;
            element.setSelectionRange(0, length);
        }
    };

    const openAdd = () => {
        setEditingId(null);
        setSelectedRow(null);
        setIsFormActive(true);
        setFocusNonce((value) => value + 1);
        window.setTimeout(focusVoucherDateInput, 0);
        window.setTimeout(focusVoucherDateInput, 100);
        setCancelledChecked(false);
        setCashLedgerAmount(null);
        setCashLedgerAmountDraft(undefined);
        setCashLedgerOption(null);
        setPaymentLedgerGroupId(null);
        setFormErrors({});
        setVoucherNo(canFetchNextNo ? nextNoData?.nextVoucherNumber ?? '' : '');
        setVoucherDate(new Date());
        setPostingDate(new Date());
        setRefNo('');
        setRefDate(null);
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setChequeInFavour('');
        setChequeIssueBookId(null);
        setNarration('');
        setLines([]);
        setSelectedLineKey(null);
        setLineEditorCarryGroupId(null);
        setLineEditorDraft(createLineEditorDraft());
        setFormManagerQuery('');
        setFormManagerId(null);
        setSaving(false);
        setInitialFormSnapshotJson(null);
        scheduleFormSnapshotCapture();
        if (routeView !== 'new') {
            navigate(newRoutePath());
        }
    };

    const openEdit = () => {
        if (!selectedRow) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select', detail: 'Select a voucher to edit.' });
            return;
        }
        openEditForRow(selectedRow);
    };

    const openEditForRow = useCallback((row: VoucherRow) => {
        setSelectedRow(row);
        setEditingId(row.voucherId);
        setIsFormActive(true);
        setFormErrors({});
        setVoucherDateError(null);
        setPostingDateError(null);
        setRefDateError(null);
        setSaving(false);
        setInitialFormSnapshotJson(null);
        const voucherNoForRoute = row.voucherNumber?.trim() || String(row.voucherId);
        const targetPath = editRoutePath(voucherNoForRoute);
        const normalizedRouteVoucherNo = routeVoucherNo ? decodeRouteToken(routeVoucherNo) : null;
        if (routeView !== 'edit' || normalizedRouteVoucherNo !== voucherNoForRoute) {
            navigate(targetPath);
        }
    }, [editRoutePath, navigate, routeVoucherNo, routeView]);

    useEffect(() => {
        const routeKey = `${paymentMode}:${routeView}:${routeVoucherNo ?? ''}`;
        if (routeSyncKeyRef.current === routeKey) return;

        if (routeView === 'register') {
            routeSyncKeyRef.current = routeKey;
            return;
        }
        if (routeView === 'new') {
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
            rows.find((row) => (row.voucherNumber?.trim() ?? '') === decodedVoucherNo) ??
            rows.find((row) => String(row.voucherId) === decodedVoucherNo) ??
            null;

        if (!matchedRow) {
            if (loading) return;
            routeSyncKeyRef.current = routeKey;
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Select',
                detail: `Voucher #${decodedVoucherNo} is not in the current register list.`
            });
            navigate(registerRoutePath(), { replace: true });
            return;
        }

        if (isFormActive && editingId === matchedRow.voucherId) {
            routeSyncKeyRef.current = routeKey;
            return;
        }
        routeSyncKeyRef.current = routeKey;
        openEditForRow(matchedRow);
    }, [editingId, isFormActive, loading, navigate, openAdd, openEditForRow, paymentMode, registerRoutePath, routeView, routeVoucherNo, rows]);

    const updateLineEditorDraft = (patch: Partial<DebitLineEditorDraft>) => {
        setLineEditorDraft((prev) => ({ ...prev, ...patch }));
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
    };

    const resolveAmountFromInput = (rawValue?: string | null, fallbackValue?: number | null) => {
        if (rawValue != null) {
            const parsed = parseInputNumber(rawValue);
            if (parsed !== undefined) return parsed;
            return undefined;
        }
        if (fallbackValue == null) return null;
        const numeric = Number(fallbackValue);
        return Number.isFinite(numeric) ? numeric : undefined;
    };

    const syncLineEditorAmountInput = (rawValue?: string | null, fallbackValue?: number | null) => {
        const parsed = resolveAmountFromInput(rawValue, fallbackValue);
        if (parsed === undefined) return;
        updateLineEditorDraft({ amount: parsed });
    };

    const syncCashLedgerAmountInput = (rawValue?: string | null, fallbackValue?: number | null) => {
        const parsed = resolveAmountFromInput(rawValue, fallbackValue);
        if (parsed === undefined) return;
        setCashLedgerAmount((prev) => (prev === parsed ? prev : parsed));
        setCashLedgerAmountDraft((prev) => (prev === parsed ? prev : parsed));
        clearFormError('cashLedgerAmount');
    };

    const syncCashLedgerAmountDraftInput = (rawValue?: string | null) => {
        const parsed = resolveAmountFromInput(rawValue, undefined);
        if (parsed === undefined) return;
        setCashLedgerAmountDraft((prev) => (prev === parsed ? prev : parsed));
        clearFormError('cashLedgerAmount');
    };

    const buildLineFromEditor = (draft: DebitLineEditorDraft, key?: string): DebitLineDraft => {
        const overrides: Partial<DebitLineDraft> = {
            ledgerGroupId: draft.ledgerGroupId,
            ledgerId: draft.ledgerId,
            ledgerOption: draft.ledgerOption ?? null,
            amount: draft.amount,
            label: draft.label ?? null
        };
        if (key) {
            overrides.key = key;
        }
        return createDebitLine(overrides);
    };

    const hydrateEditorFromLine = (line: DebitLineDraft): DebitLineEditorDraft =>
        createLineEditorDraft({
            mode: 'edit',
            targetKey: line.key,
            ledgerGroupId: line.ledgerGroupId ?? null,
            ledgerId: line.ledgerId ?? null,
            ledgerOption: line.ledgerOption ?? null,
            amount: line.amount ?? null,
            label: line.label ?? null
        });

    const resolveCarryGroupId = () => lineEditorDraft.ledgerGroupId ?? lineEditorCarryGroupId ?? null;

    const startAddLine = () => {
        const nextGroupId = resolveCarryGroupId();
        setLineEditorDraft(createLineEditorDraft({ ledgerGroupId: nextGroupId }));
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
        window.setTimeout(focusLineEditorLedgerGroupInput, 0);
    };

    const startEditLine = (key?: string) => {
        const targetKey = key ?? selectedLineKey;
        if (!targetKey) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select', detail: 'Select a line to edit.' });
            return;
        }
        const targetLine = lines.find((line) => line.key === targetKey) ?? null;
        if (!targetLine) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select', detail: 'Selected line is not available.' });
            return;
        }
        setSelectedLineKey(targetLine.key);
        setLineEditorDraft(hydrateEditorFromLine(targetLine));
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
        window.setTimeout(focusLineEditorLedgerGroupInput, 0);
    };

    const applyLineDraft = () => {
        const ledgerId = lineEditorDraft.ledgerId != null ? Number(lineEditorDraft.ledgerId) : null;
        const amount = lineEditorDraft.amount != null ? Number(lineEditorDraft.amount) : null;
        if (!ledgerId) {
            setFormErrors((prev) => ({ ...prev, debitLines: 'Select ledger.' }));
            window.setTimeout(focusLineEditorLedgerGroupInput, 0);
            return;
        }
        if (amount == null || Number(amount) <= 0) {
            setFormErrors((prev) => ({ ...prev, debitLines: 'Enter amount.' }));
            window.setTimeout(focusLineEditorAmountInput, 0);
            return;
        }

        const amountValue = Number(amount);
        const resolvedGroupId = resolveCarryGroupId();
        const draftToPersist: DebitLineEditorDraft = {
            ...lineEditorDraft,
            ledgerGroupId: resolvedGroupId,
            amount: amountValue
        };
        if (lineEditorDraft.mode === 'edit' && lineEditorDraft.targetKey) {
            const targetKey = lineEditorDraft.targetKey;
            setLines((prev) => prev.map((line) => (line.key === targetKey ? buildLineFromEditor(draftToPersist, targetKey) : line)));
            setSelectedLineKey(targetKey);
        } else {
            const nextLine = buildLineFromEditor(draftToPersist);
            setLines((prev) => [...prev, nextLine]);
            setSelectedLineKey(nextLine.key);
        }

        setLineEditorCarryGroupId(resolvedGroupId);
        setLineEditorDraft(createLineEditorDraft({ ledgerGroupId: resolvedGroupId }));
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
        window.setTimeout(focusLineEditorLedgerInput, 0);
    };

    const cancelLineDraft = () => {
        const nextGroupId = resolveCarryGroupId();
        setLineEditorDraft(createLineEditorDraft({ ledgerGroupId: nextGroupId }));
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
        window.setTimeout(focusLineEditorLedgerGroupInput, 0);
    };

    const removeLineByKey = (key: string) => {
        setLines((prev) => prev.filter((line) => line.key !== key));
        setSelectedLineKey((prev) => (prev === key ? null : prev));
        setLineEditorDraft((prev) => {
            if (prev.mode === 'edit' && prev.targetKey === key) {
                return createLineEditorDraft({ ledgerGroupId: lineEditorCarryGroupId });
            }
            return prev;
        });
        clearFormError('debitLines');
        clearFormError('cashLedgerAmount');
    };

    const confirmRemoveLine = (key: string) => {
        confirmDialog({
            message: 'Delete this line?',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
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
            reject: () => undefined
        });
    };

    const deleteRow = async (row: VoucherRow) => {
        if (!row?.voucherId || saving) return;
        const confirmDelete = typeof window === 'undefined' ? true : window.confirm(`Delete voucher #${row.voucherNumber ?? row.voucherId}?`);
        if (!confirmDelete) return;
        setSaving(true);
        try {
            await deleteVoucherEntry({ variables: { voucherId: row.voucherId } });
            toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: `Voucher #${row.voucherNumber ?? row.voucherId}` });
            if (selectedRow?.voucherId === row.voucherId) {
                setSelectedRow(null);
            }
            if (editingId === row.voucherId) {
                setEditingId(null);
                setIsFormActive(false);
                setSelectedLineKey(null);
                setLineEditorDraft(createLineEditorDraft());
                setInitialFormSnapshotJson(null);
                if (routeView !== 'register') {
                    navigate(registerRoutePath(), { replace: true });
                }
            }
            await refetch();
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to delete voucher' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingId) {
            toastRef.current?.show({ severity: 'warn', summary: 'Delete', detail: 'Select a voucher to delete.' });
            return;
        }
        const row =
            selectedRow ??
            rows.find((item) => item.voucherId === editingId) ??
            ({ voucherId: editingId, voucherNumber: voucherNo } as VoucherRow);
        await deleteRow(row);
    };

    const cancelForm = () => {
        resetVoucherFormState();
        if (routeView !== 'register') {
            navigate(registerRoutePath(), { replace: true });
        }
    };

    const save = async () => {
        if (!isFormActive) return;
        const debitLines = lines
            .map((line) => ({
                ledgerId: line.ledgerId != null ? Number(line.ledgerId) : null,
                amount: line.amount
            }))
            .filter((line) => line.ledgerId && line.amount && Number(line.amount) > 0)
            .map((line) => ({
                ledgerId: Number(line.ledgerId),
                amount: Number(line.amount)
            }));
        const total = debitLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const effectiveCashLedgerAmount =
            cashLedgerAmountDraft !== undefined ? cashLedgerAmountDraft : cashLedgerAmount;
        const headerAmount = effectiveCashLedgerAmount != null ? Number(effectiveCashLedgerAmount) : 0;

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
            managerId: formManagerId ?? null,
            lineTotal: total
        });

        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            let nextVoucherDateError: string | null = null;
            let nextPostingDateError: string | null = null;
            let nextRefDateError: string | null = null;

            parsed.error.issues.forEach((issue) => {
                const pathKey = issue.path[0] ? String(issue.path[0]) : 'form';
                if (pathKey === 'voucherDate') {
                    nextVoucherDateError = issue.message;
                    return;
                }
                if (pathKey === 'postingDate') {
                    nextPostingDateError = issue.message;
                    return;
                }
                if (pathKey === 'refDate') {
                    nextRefDateError = issue.message;
                    return;
                }
                const resolvedKey = pathKey === 'voucherTypeId' ? 'form' : pathKey;
                if (!nextErrors[resolvedKey]) {
                    nextErrors[resolvedKey] = issue.message;
                }
            });

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

        if (!voucherDate || !postingDate) return;

        setSaving(true);
        try {
            const headerNarration = narration.trim() ? narration.trim() : null;
            const paymentViaValue = isBankMode ? paymentViaId : null;
            const chequeInFavourText =
                isChequePayment && chequeInFavour.trim() ? chequeInFavour.trim() : null;
            const chequeIssueBookValue =
                isChequePayment && chequeIssueBookId != null ? Number(chequeIssueBookId) : null;
            const voucherLines = [
                ...debitLines.map((line) => ({
                    ledgerId: line.ledgerId,
                    amount: line.amount,
                    drCrFlag: 1,
                    narrationText: headerNarration
                })),
                {
                    ledgerId: cashLedgerId,
                    amount: headerAmount,
                    drCrFlag: 2,
                    narrationText: headerNarration
                }
            ];
            const variables = {
                voucherTypeId,
                voucherDateText: toDateText(voucherDate),
                postingDateText: postingDate ? toDateText(postingDate) : null,
                voucherNumber: voucherNo.trim() ? voucherNo.trim() : null,
                narrationText: headerNarration,
                purchaseVoucherNumber: refNo.trim() ? refNo.trim() : null,
                purchaseVoucherDateText: refDate ? toDateText(refDate) : null,
                managerId: isCashMode ? formManagerId : null,
                chequeInFavourText,
                chequeIssueBookId: chequeIssueBookValue,
                paymentViaId: paymentViaValue,
                primaryLedgerId: cashLedgerId,
                isCancelledFlag: cancelledChecked ? 1 : 0,
                lines: voucherLines
            };

            if (editingId) {
                await updateVoucher({ variables: { voucherId: editingId, ...variables } });
                toastRef.current?.show({ severity: 'success', summary: 'Updated', detail: `Voucher #${voucherNo}` });
            } else {
                await createVoucher({ variables });
                toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: `Voucher #${voucherNo}` });
            }

            await refetch();

            resetVoucherFormState();
            if (routeView !== 'register') {
                navigate(registerRoutePath(), { replace: true });
            }
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to save voucher' });
        } finally {
            setSaving(false);
        }
    };

    const totalDebit = useMemo(
        () => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
        [lines]
    );
    const selectedLine = useMemo(
        () => (selectedLineKey ? lines.find((line) => line.key === selectedLineKey) ?? null : null),
        [lines, selectedLineKey]
    );
    const isLineDraftValid = useMemo(
        () => Number(lineEditorDraft.ledgerId || 0) > 0 && Number(lineEditorDraft.amount || 0) > 0,
        [lineEditorDraft.amount, lineEditorDraft.ledgerId]
    );
    const effectiveCashLedgerAmount = cashLedgerAmountDraft !== undefined ? cashLedgerAmountDraft : cashLedgerAmount;
    const differenceAmount = useMemo(
        () => (Number(effectiveCashLedgerAmount || 0) || 0) - totalDebit,
        [effectiveCashLedgerAmount, totalDebit]
    );
    const differenceLabel = useMemo(() => {
        const absValue = Math.abs(differenceAmount);
        const suffix = differenceAmount >= 0 ? 'Cr' : 'Dr';
        return `${formatAmount(absValue)} ${suffix}`;
    }, [differenceAmount]);

    const mapDisplayRow = useCallback(
        (row: VoucherRow): PaymentVoucherDisplayRow => {
            const typeId = row.voucherTypeId != null ? Number(row.voucherTypeId) : null;
            const voucherType =
                typeId === VoucherTypeIds.Payment || typeId === VoucherTypeIds.MPayment ? 'Payment' : row.voucherTypeName ?? '';
            const voucherNo = row.voucherNumber ?? '';
            const voucherDateDisplay = formatDate(row.voucherDate);
            const postingDateDisplay = formatDate(row.postingDate);
            const refDateDisplay = formatDate(row.refDate);
            const voucherDateKey = toDateKey(row.voucherDate);
            const postingDateKey = toDateKey(row.postingDate);
            const refDateKey = toDateKey(row.refDate);
            const ledgerDrNames = (row.debitLedgerNames ?? '').trim();
            const ledgerDrPrimary = (row.debitLedgerName ?? '').trim();
            const ledgerDrDisplay = ledgerDrNames || ledgerDrPrimary;
            const ledgerDrTitle = ledgerDrDisplay;
            const debitLedgerAmountDetail = (row.debitLedgerAmounts ?? '').trim();
            const debitLedgerNames = (ledgerDrNames ? ledgerDrNames.split('\n') : ledgerDrPrimary ? [ledgerDrPrimary] : [])
                .map((name) => name.trim())
                .filter((name) => name.length > 0);
            const debitLedgerAmounts = debitLedgerAmountDetail
                ? debitLedgerAmountDetail.split('\n').map((value) => value.trim())
                : [];
            const ledgerDrLinesDisplay = debitLedgerNames.map((name, index) => {
                const rawAmount = debitLedgerAmounts[index];
                const parsed = rawAmount != null && rawAmount !== '' ? Number(rawAmount) : null;
                const fallback =
                    parsed == null && index === 0 && (row.totalNetAmount ?? 0) > 0
                        ? Number(row.totalNetAmount)
                        : null;
                const amount =
                    parsed != null && Number.isFinite(parsed)
                        ? formatAmount(parsed)
                        : fallback != null && Number.isFinite(fallback)
                          ? formatAmount(fallback)
                          : rawAmount ?? '';
                return { name, amount };
            });
            const showLedgerDrAmounts = ledgerDrLinesDisplay.length > 1;
            const creditLedgerPrimary = (row.creditLedgerName ?? '').trim();
            const creditLedgerNames = (row.creditLedgerNames ?? '').trim();
            const creditLedgerFallback =
                creditLedgerNames.length > 0 ? creditLedgerNames.split('\n').map((name) => name.trim()).find(Boolean) ?? '' : '';
            const ledgerCrDisplay = creditLedgerPrimary || creditLedgerFallback || cashLedgerLabel;
            const netAmtDisplay = row.totalNetAmount ? formatAmount(row.totalNetAmount) : '';
            return {
                ...row,
                voucherTypeDisplay: voucherType,
                voucherNoDisplay: voucherNo,
                voucherTypeNoDisplay: `${voucherType} ${row.voucherNumber ?? ''}`.trim(),
                voucherDateDisplay,
                postingDateDisplay,
                voucherPostingDateDisplay: `${voucherDateDisplay} ${postingDateDisplay}`.trim(),
                refDateDisplay,
                refDisplay: `${row.refNo ?? ''} ${refDateDisplay}`.trim(),
                voucherDateKey,
                postingDateKey,
                refDateKey,
                ledgerCrDisplay,
                ledgerDrDisplay,
                ledgerDrTitle,
                ledgerDrLinesDisplay,
                showLedgerDrAmounts,
                netAmtDisplay
            };
        },
        [cashLedgerLabel]
    );

    const displayRows = useMemo<PaymentVoucherDisplayRow[]>(() => rows.map(mapDisplayRow), [rows, mapDisplayRow]);
    const filterDisplayRows = useMemo<PaymentVoucherDisplayRow[]>(() => {
        if (!filterSourceRows || filterSourceRows.length === 0) {
            return displayRows;
        }
        return filterSourceRows.map(mapDisplayRow);
    }, [displayRows, filterSourceRows, mapDisplayRow]);

    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.voucherTypeDisplay)),
        [filterDisplayRows]
    );
    const voucherNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.voucherNoDisplay)),
        [filterDisplayRows]
    );
    const refNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.refNo)),
        [filterDisplayRows]
    );
    const ledgerCrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.ledgerCrDisplay)),
        [filterDisplayRows]
    );
    const ledgerDrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.ledgerDrDisplay)),
        [filterDisplayRows]
    );
    const narrationFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.narration)),
        [filterDisplayRows]
    );
    const paidByFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.managerName)),
        [filterDisplayRows]
    );
    const ledgerGroupFilterOptions = useMemo(
        () => buildTextFilterOptions(filterDisplayRows.map((row) => row.debitLedgerGroupName)),
        [filterDisplayRows]
    );
    const netAmtFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterDisplayRows.map((row) => row.totalNetAmount)),
        [filterDisplayRows]
    );

    const voucherTypeNoFilterElement = useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const current = (options.value ?? {}) as { voucherTypes?: string[]; voucherNos?: string[] };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '18rem' }}>
                        <AppMultiSelect
                            value={(current.voucherTypes ?? []) as string[]}
                            options={voucherTypeFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => options.filterCallback({ ...current, voucherTypes: event.value })}
                            filter
                            filterInputAutoFocus
                            showSelectAll
                            placeholder="Voucher Type"
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={voucherTypeFilterOptions.length ? 'No values found' : 'No values'}
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
                            onChange={(event) => options.filterCallback({ ...current, voucherNos: event.value })}
                            filter
                            showSelectAll
                            placeholder="Voucher No."
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={voucherNoFilterOptions.length ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={voucherNoFilterOptions.length === 0}
                            onShow={fetchFilterSourceRows}
                            loading={filterSourceLoading}
                        />
                    </div>
                );
            },
        [fetchFilterSourceRows, filterSourceLoading, voucherNoFilterOptions, voucherTypeFilterOptions]
    );

    const voucherPostingDateFilterElement = useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const current = (options.value ?? {}) as { voucherDate?: string | null; postingDate?: string | null };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '14rem' }}>
                        <AppDateInput
                            value={current.voucherDate ? parseDateText(current.voucherDate) : null}
                            onChange={(value) => options.filterCallback({ ...current, voucherDate: toDateText(value) })}
                            placeholder="Voucher Date"
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            className="app-entry-date"
                        />
                        <AppDateInput
                            value={current.postingDate ? parseDateText(current.postingDate) : null}
                            onChange={(value) => options.filterCallback({ ...current, postingDate: toDateText(value) })}
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

    const refFilterElement = useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const current = (options.value ?? {}) as { refNos?: string[]; refDate?: string | null };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '18rem' }}>
                        <AppMultiSelect
                            value={(current.refNos ?? []) as string[]}
                            options={refNoFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => options.filterCallback({ ...current, refNos: event.value })}
                            filter
                            filterInputAutoFocus
                            showSelectAll
                            placeholder="Ref. No."
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={refNoFilterOptions.length ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={refNoFilterOptions.length === 0}
                            onShow={fetchFilterSourceRows}
                            loading={filterSourceLoading}
                        />
                        <AppDateInput
                            value={current.refDate ? parseDateText(current.refDate) : null}
                            onChange={(value) => options.filterCallback({ ...current, refDate: toDateText(value) })}
                            placeholder="Ref. Date"
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            className="app-entry-date"
                        />
                    </div>
                );
            },
        [fetchFilterSourceRows, filterSourceLoading, fiscalRange, refNoFilterOptions]
    );

    const ledgerCrDrFilterElement = useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const current = (options.value ?? {}) as { ledgerCrs?: string[]; ledgerDrs?: string[] };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '18rem' }}>
                        <AppMultiSelect
                            value={(current.ledgerCrs ?? []) as string[]}
                            options={ledgerCrFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => options.filterCallback({ ...current, ledgerCrs: event.value })}
                            filter
                            filterInputAutoFocus
                            showSelectAll
                            placeholder="Ledger (Cr)"
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={ledgerCrFilterOptions.length ? 'No values found' : 'No values'}
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
                            onChange={(event) => options.filterCallback({ ...current, ledgerDrs: event.value })}
                            filter
                            showSelectAll
                            placeholder="Ledger (Dr)"
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={ledgerDrFilterOptions.length ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={ledgerDrFilterOptions.length === 0}
                            onShow={fetchFilterSourceRows}
                            loading={filterSourceLoading}
                        />
                    </div>
                );
            },
        [fetchFilterSourceRows, filterSourceLoading, ledgerCrFilterOptions, ledgerDrFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, narrationFilterOptions]
    );
    const paidByFilterElement = useMemo(
        () => buildMultiSelectFilterElement(paidByFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, paidByFilterOptions]
    );
    const ledgerGroupFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerGroupFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, ledgerGroupFilterOptions]
    );
    const netAmtFilterElement = useMemo(
        () => buildMultiSelectFilterElement(netAmtFilterOptions, 'Any', fetchFilterSourceRows, filterSourceLoading),
        [fetchFilterSourceRows, filterSourceLoading, netAmtFilterOptions]
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
    const hasGlobalSearch = globalSearchText.trim().length > 0;
    const hasClientSideFiltering = hasActiveColumnFilters || hasGlobalSearch;

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
        hasApplied
    ]);

    const applyColumnFilters = useCallback(
        (rowsToFilter: PaymentVoucherDisplayRow[]) => {
            if (activeColumnFilters.length === 0) return rowsToFilter;

            return rowsToFilter.filter((row) =>
                activeColumnFilters.every(([field, meta]) => {
                    const value = resolveFilterValue(meta as ColumnFilterMeta);
                    if (isEmptyFilterValue(value)) return true;

                    switch (field) {
                        case 'voucherTypeNoDisplay': {
                            const data = value as { voucherTypes?: string[]; voucherNos?: string[] } | null;
                            const voucherTypes = data?.voucherTypes ?? [];
                            const voucherNos = data?.voucherNos ?? [];
                            if (voucherTypes.length > 0) {
                                const matchesType = voucherTypes.some(
                                    (type) => normalizeTextValue(type) === normalizeTextValue(row.voucherTypeDisplay)
                                );
                                if (!matchesType) return false;
                            }
                            if (voucherNos.length > 0) {
                                const matchesNo = voucherNos.some(
                                    (no) => normalizeTextValue(no) === normalizeTextValue(row.voucherNoDisplay)
                                );
                                if (!matchesNo) return false;
                            }
                            return true;
                        }
                        case 'voucherPostingDateDisplay': {
                            const data = value as { voucherDate?: string | null; postingDate?: string | null } | null;
                            const voucherDate = data?.voucherDate ?? null;
                            const postingDate = data?.postingDate ?? null;
                            if (voucherDate && voucherDate !== row.voucherDateKey) return false;
                            if (postingDate && postingDate !== row.postingDateKey) return false;
                            return true;
                        }
                        case 'refDisplay': {
                            const data = value as { refNos?: string[]; refDate?: string | null } | null;
                            const refNos = data?.refNos ?? [];
                            const refDate = data?.refDate ?? null;
                            if (refNos.length > 0) {
                                const matchesRef = refNos.some(
                                    (ref) => normalizeTextValue(ref) === normalizeTextValue(row.refNo)
                                );
                                if (!matchesRef) return false;
                            }
                            if (refDate && refDate !== row.refDateKey) return false;
                            return true;
                        }
                        case 'ledgerCrDrDisplay': {
                            const data = value as { ledgerCrs?: string[]; ledgerDrs?: string[] } | null;
                            const ledgerCrs = data?.ledgerCrs ?? [];
                            const ledgerDrs = data?.ledgerDrs ?? [];
                            if (ledgerCrs.length > 0) {
                                const matchesCr = ledgerCrs.some(
                                    (ledger) => normalizeTextValue(ledger) === normalizeTextValue(row.ledgerCrDisplay)
                                );
                                if (!matchesCr) return false;
                            }
                            if (ledgerDrs.length > 0) {
                                const matchesDr = ledgerDrs.some(
                                    (ledger) => normalizeTextValue(ledger) === normalizeTextValue(row.ledgerDrDisplay)
                                );
                                if (!matchesDr) return false;
                            }
                            return true;
                        }
                        case 'netAmtDisplay': {
                            const list = Array.isArray(value) ? value : [];
                            if (list.length === 0) return true;
                            const amount = Number(row.totalNetAmount ?? 0);
                            return list.some((item) => Number(item) === amount);
                        }
                        default: {
                            const rowFieldValue = (row as Record<string, unknown>)[field];
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
            const needle = globalSearchText.trim();
            if (!needle) return rowsToFilter;

            const buildSearchableText = (row: PaymentVoucherDisplayRow) =>
                [
                    row.voucherTypeDisplay,
                    row.voucherNoDisplay,
                    row.voucherDateDisplay,
                    row.postingDateDisplay,
                    row.refNo,
                    row.refDateDisplay,
                    row.refDisplay,
                    row.ledgerCrDisplay,
                    row.ledgerDrDisplay,
                    row.ledgerDrTitle,
                    row.ledgerDrLinesDisplay.map((line) => `${line.name} ${line.amount}`).join(' '),
                    row.netAmtDisplay,
                    row.totalNetAmount,
                    row.narration,
                    row.managerName,
                    row.debitLedgerGroupName,
                    row.voucherTypeNoDisplay,
                    row.voucherPostingDateDisplay
                ]
                    .filter((value) => value != null && String(value).trim().length > 0)
                    .join(' ');

            if (globalSearchWholeWord) {
                const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const flags = globalSearchMatchCase ? '' : 'i';
                const wholeWordPattern = new RegExp(`(^|[^A-Za-z0-9])${escapedNeedle}(?=$|[^A-Za-z0-9])`, flags);
                return rowsToFilter.filter((row) => wholeWordPattern.test(buildSearchableText(row)));
            }

            if (globalSearchMatchCase) {
                return rowsToFilter.filter((row) => buildSearchableText(row).includes(needle));
            }

            const loweredNeedle = needle.toLowerCase();
            return rowsToFilter.filter((row) => buildSearchableText(row).toLowerCase().includes(loweredNeedle));
        },
        [globalSearchMatchCase, globalSearchText, globalSearchWholeWord]
    );

    const filteredRows = useMemo(() => applyColumnFilters(displayRows), [applyColumnFilters, displayRows]);
    const filteredAllRows = useMemo(() => applyColumnFilters(filterDisplayRows), [applyColumnFilters, filterDisplayRows]);
    const searchedRows = useMemo(() => applyGlobalSearch(filteredRows), [applyGlobalSearch, filteredRows]);
    const searchedAllRows = useMemo(() => applyGlobalSearch(filteredAllRows), [applyGlobalSearch, filteredAllRows]);
    const filteredSourceRows = useMemo(() => {
        if (!hasClientSideFiltering) return searchedRows;
        if (filterSourceRows !== null) return searchedAllRows;
        return searchedRows;
    }, [filterSourceRows, hasClientSideFiltering, searchedAllRows, searchedRows]);
    const filteredRowsForTable = useMemo(() => {
        if (!hasClientSideFiltering) return searchedRows;
        return filteredSourceRows.slice(first, first + rowsPerPage);
    }, [first, filteredSourceRows, hasClientSideFiltering, rowsPerPage, searchedRows]);
    const totalRecordsForTable = hasClientSideFiltering ? filteredSourceRows.length : totalCount;

    useEffect(() => {
        if (!hasClientSideFiltering) return;
        if (first === 0) return;
        if (first >= filteredSourceRows.length) {
            setFirst(0);
        }
    }, [filteredSourceRows.length, first, hasClientSideFiltering]);

    const totals = useMemo(() => {
        if (hasClientSideFiltering) {
            return filteredSourceRows.reduce((sum, row) => sum + Number(row.totalNetAmount || 0), 0);
        }
        const totalFromApi = data?.voucherRegisterByLedgerDetailed?.totalNetAmount;
        if (totalFromApi != null && Number.isFinite(Number(totalFromApi))) {
            return Number(totalFromApi);
        }
        return rows.reduce((sum, r) => sum + Number(r.totalNetAmount || 0), 0);
    }, [
        data?.voucherRegisterByLedgerDetailed?.totalNetAmount,
        filteredSourceRows,
        hasClientSideFiltering,
        rows
    ]);
    const printMenuItems = useMemo(
        () => [
            {
                label: 'Format 1',
                icon: printFormat === 'format-1' ? 'pi pi-check' : undefined,
                command: () => {
                    setPrintFormat('format-1');
                    window.print();
                }
            },
            {
                label: 'Format 2',
                icon: printFormat === 'format-2' ? 'pi pi-check' : undefined,
                command: () => {
                    setPrintFormat('format-2');
                    window.print();
                }
            }
        ],
        [printFormat]
    );

    return {
        error,
        pageHeading,
        paymentMode,
        paymentModeOptions,
        changePaymentMode,
        clearFormError,
        formErrors,
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
        isCashMode,
        isChequePayment,
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
        cashLedgerId,
        setCashLedgerId,
        cashLedgerOption,
        setCashLedgerOption,
        paymentLedgerGroupId,
        setPaymentLedgerGroupId,
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
        setCashLedgerAmount,
        syncCashLedgerAmountInput,
        syncCashLedgerAmountDraftInput,
        cashLedgerAmountInputRef,
        focusCashLedgerAmountInput,
        narration,
        setNarration,
        lines,
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
        paymentAgainstAddressMap,
        ledgerGroupOptions,
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
        managerValue,
        formManagerSuggestions,
        setFormManagerQuery,
        setFormManagerSuggestions,
        filterOptions,
        managerOptions,
        managersLoading,
        paidByInputRef,
        focusPaidByInput,
        focusSaveButton,
        setFormManagerId,
        chequeInFavour,
        setChequeInFavour,
        openAdd,
        openEdit,
        openEditForRow,
        save,
        cancelForm,
        handleDelete,
        cancelledChecked,
        setCancelledChecked,
        editingId,
        saveButtonId,
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
        loading,
        selectedRow,
        setSelectedRow,
        columnFilters,
        setColumnFilters,
        dateRange,
        setDateRange,
        dateErrors,
        setDateErrors,
        hasTouchedDatesRef,
        fiscalRange,
        fromDateInputRef,
        toDateInputRef,
        cancelled,
        setCancelled,
        totals,
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
        refFilterElement,
        ledgerCrDrFilterElement,
        netAmtFilterElement,
        narrationFilterElement,
        paidByFilterElement,
        ledgerGroupFilterElement,
        cashLedgerLabel
    };
};

export type PaymentVoucherViewProps = ReturnType<typeof usePaymentVoucherState>;
