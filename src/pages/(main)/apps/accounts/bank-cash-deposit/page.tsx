'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import type { AutoComplete } from 'primereact/autocomplete';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import { useLedgerOptionsByPurpose } from '@/lib/accounts/ledgerOptions';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';
import { VoucherTypeIds } from '@/lib/accounts/voucherTypeIds';
import { deriveVoucherUiState, getVoucherActionsConfig } from '@/lib/accounts/voucherActionsState';

interface VoucherRow {
    voucherId: number;
    voucherTypeId: number | null;
    voucherNumber: string | null;
    voucherDate: string | null;
    postingDate: string | null;
    debitLedgerName: string | null;
    debitLedgerGroupName: string | null;
    debitLedgerNames?: string | null;
    debitLedgerAmounts?: string | null;
    creditLedgerName?: string | null;
    creditLedgerNames?: string | null;
    creditLedgerAmounts?: string | null;
    totalNetAmount: number;
    narration: string | null;
    isCancelledFlag: number | null;
    managerId: number | null;
    managerName: string | null;
    managerDetails: string | null;
    managerDetailsAmount?: string | null;
    monthName?: string | null;
    yearMonth?: string | null;
}

interface ManagerRow {
    managerId: number;
    name: string | null;
}

interface AllocationDraft {
    key: string;
    managerId: number | null;
    allocationAmount: number | null;
    remarks: string;
}

const VOUCHER_TYPES = gql`
    query VoucherTypes {
        voucherTypes {
            voucherTypeId
            voucherTypeCode
            displayName
            voucherTypeName
            isVoucherNoAutoFlag
        }
    }
`;

const MANAGERS = gql`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
        }
    }
`;

const NEXT_VOUCHER_NUMBER = gql`
    query NextVoucherNumber(
        $voucherTypeId: Int!
        $companyFiscalYearId: Int
        $fiscalYearStart: String
        $fiscalYearEnd: String
    ) {
        nextVoucherNumber(
            voucherTypeId: $voucherTypeId
            companyFiscalYearId: $companyFiscalYearId
            fiscalYearStart: $fiscalYearStart
            fiscalYearEnd: $fiscalYearEnd
        )
    }
`;

const BANK_CASH_DEPOSIT_REGISTER = gql`
    query BankCashDepositRegister(
        $bankLedgerId: Int
        $cashLedgerId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        bankCashDepositRegister(
            bankLedgerId: $bankLedgerId
            cashLedgerId: $cashLedgerId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            limit: $limit
            offset: $offset
        ) {
            items {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDate
                postingDate
                debitLedgerName
                debitLedgerGroupName
                debitLedgerNames
                debitLedgerAmounts
                creditLedgerName
                creditLedgerNames
                creditLedgerAmounts
                totalNetAmount
                narration
                isCancelledFlag
                managerId
                managerName
                managerDetails
                managerDetailsAmount
                monthName
                yearMonth
            }
            totalCount
        }
    }
`;

const VOUCHER_ENTRY_BY_ID = gql`
    query VoucherEntryById($voucherId: Int!) {
        voucherEntryById(voucherId: $voucherId) {
            header {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDate
                postingDate
                narration
                totalNetAmount
                isCancelledFlag
                managerId
            }
            lines {
                ledgerId
                drCrFlag
                amount
            }
            managerAllocations {
                voucherManagerAllocationId
                managerId
                allocationAmount
                remarks
            }
        }
    }
`;

const CREATE_VOUCHER = gql`
    mutation CreateVoucher(
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $managerId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $managerAllocations: [VoucherManagerAllocationInput!]
        $lines: [VoucherLineInput!]!
    ) {
        createVoucher(
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            managerId: $managerId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
            managerAllocations: $managerAllocations
            lines: $lines
        ) {
            voucherId
        }
    }
`;

const UPDATE_VOUCHER = gql`
    mutation UpdateVoucherEntry(
        $voucherId: Int!
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $managerId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $managerAllocations: [VoucherManagerAllocationInput!]
        $lines: [VoucherLineInput!]!
    ) {
        updateVoucherEntry(
            voucherId: $voucherId
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            managerId: $managerId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
            managerAllocations: $managerAllocations
            lines: $lines
        )
    }
`;

const SET_CANCELLED = gql`
    mutation SetVoucherCancelled($voucherId: Int!, $isCancelledFlag: Int!) {
        setVoucherCancelled(voucherId: $voucherId, isCancelledFlag: $isCancelledFlag)
    }
`;

const toDateText = (date: Date | null) => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDate = (value: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const round2 = (value: number) => Math.round(value * 100) / 100;

const resolveBooleanFlag = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (!normalized) return false;
        if (normalized === 'true' || normalized === 'yes' || normalized === 'y') return true;
        const numeric = Number(normalized);
        return Number.isFinite(numeric) ? numeric !== 0 : false;
    }
    return false;
};

const makeKey = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

export default function AccountsBankCashDepositPage() {
    const toastRef = useRef<Toast>(null);
    const { companyContext } = useAuth();

    const [bankLedgerId, setBankLedgerId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(0);
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const bankLedgerInputRef = useRef<AutoComplete>(null);
    const refreshButtonId = 'bank-cash-deposit-refresh';
    const missingConfigRef = useRef(false);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [voucherNo, setVoucherNo] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [postingDate, setPostingDate] = useState<Date | null>(new Date());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [postingDateError, setPostingDateError] = useState<string | null>(null);
    const [cashLedgerId, setCashLedgerId] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [narration, setNarration] = useState('');
    const [managerId, setManagerId] = useState<number | null>(null);
    const [allocations, setAllocations] = useState<AllocationDraft[]>([]);
    const [saving, setSaving] = useState(false);

    const { data: voucherTypesData } = useQuery(VOUCHER_TYPES);
    const { options: bankPurposeLedgers } = useLedgerOptionsByPurpose({
        purpose: 'CONTRA-BANK',
        limit: 2000
    });
    const { options: cashPurposeLedgers } = useLedgerOptionsByPurpose({
        purpose: 'CONTRA-CASH',
        limit: 2000
    });
    const { data: managersData } = useQuery(MANAGERS, { variables: { search: null, limit: 5000 } });

    const voucherType = useMemo(() => {
        const rows = voucherTypesData?.voucherTypes ?? [];
        return rows.find((v: any) => Number(v.voucherTypeId) === VoucherTypeIds.Contra) ?? null;
    }, [voucherTypesData]);
    const voucherTypeId = useMemo(
        () => (voucherType ? Number(voucherType.voucherTypeId) : null),
        [voucherType]
    );
    const isVoucherNoAuto = useMemo(
        () => resolveBooleanFlag(voucherType?.isVoucherNoAutoFlag),
        [voucherType]
    );

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
        if (!dialogVisible || editingId) {
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
    }, [dialogVisible, editingId, nextNoError]);

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const hasTouchedDatesRef = useRef(false);
    const canRefresh = Boolean(fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };
    const focusDropdown = (ref: React.RefObject<AutoComplete>) => {
        ref.current?.focus?.();
    };

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const registerVariables = useMemo(
        () => ({
            bankLedgerId,
            cashLedgerId,
            fromDate,
            toDate,
            cancelled,
            limit: rowsPerPage,
            offset: first
        }),
        [bankLedgerId, cashLedgerId, cancelled, first, fromDate, rowsPerPage, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(BANK_CASH_DEPOSIT_REGISTER, {
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables
    });

    const { data: editData, refetch: refetchEdit } = useQuery(VOUCHER_ENTRY_BY_ID, {
        skip: !editingId,
        variables: { voucherId: editingId ?? 0 }
    });

    const [createVoucher] = useMutation(CREATE_VOUCHER);
    const [updateVoucher] = useMutation(UPDATE_VOUCHER);
    const [setCancelledMutation] = useMutation(SET_CANCELLED);

    const bankLedgerOptions = useMemo(() => {
        const options = bankPurposeLedgers
            .map((ledger) => ({
                label: ledger.label,
                value: Number(ledger.value)
            }))
            .filter((option) => Number.isFinite(option.value) && option.value > 0);
        return [{ label: 'All bank ledgers', value: null }].concat(options);
    }, [bankPurposeLedgers]);

    const cashLedgerOptions = useMemo(() => {
        const options = cashPurposeLedgers
            .map((ledger) => ({
                label: ledger.label,
                value: Number(ledger.value)
            }))
            .filter((option) => Number.isFinite(option.value) && option.value > 0);
        return [{ label: 'All cash ledgers', value: null }].concat(options);
    }, [cashPurposeLedgers]);

    const managerOptions = useMemo(() => {
        const rows = (managersData?.managers ?? []) as ManagerRow[];
        return [{ label: 'Select manager', value: null }].concat(
            rows.map((m) => ({ label: m.name ?? `Manager ${m.managerId}`, value: Number(m.managerId) }))
        );
    }, [managersData]);

    const rows: VoucherRow[] = useMemo(
        () => (hasApplied ? data?.bankCashDepositRegister?.items ?? [] : []),
        [data, hasApplied]
    );
    const totalCount = hasApplied ? data?.bankCashDepositRegister?.totalCount ?? rows.length ?? 0 : 0;
    const { uiState: voucherUiState, baseUiState: voucherBaseUiState } = useMemo(
        () => deriveVoucherUiState(dialogVisible, editingId != null, saving),
        [dialogVisible, editingId, saving]
    );
    const voucherActions = useMemo(
        () =>
            getVoucherActionsConfig({
                uiState: voucherUiState,
                baseUiState: voucherBaseUiState,
                hasVoucherId: editingId != null,
                canRefresh,
                hasRegisterRows: totalCount > 0
            }),
        [canRefresh, editingId, totalCount, voucherBaseUiState, voucherUiState]
    );

    const allocationTotal = useMemo(
        () => round2(allocations.reduce((sum, a) => sum + Number(a.allocationAmount || 0), 0)),
        [allocations]
    );

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (!hasApplied) {
            setAppliedVariables(registerVariables);
            return;
        }
        setAppliedVariables(registerVariables);
        void refetch(registerVariables);
    };

    useEffect(() => {
        if (!dialogVisible) return;
        if (editingId) return;
        if (!canFetchNextNo) return;
        refetchNextNo(nextVoucherVariables).catch(() => undefined);
    }, [canFetchNextNo, dialogVisible, editingId, nextVoucherVariables, refetchNextNo]);

    useEffect(() => {
        if (!dialogVisible || !editingId) return;
        refetchEdit({ voucherId: editingId }).catch(() => undefined);
    }, [dialogVisible, editingId, refetchEdit]);

    useEffect(() => {
        if (!dialogVisible || !editingId) return;
        const header = editData?.voucherEntryById?.header;
        if (!header) return;
        setVoucherNo(header.voucherNumber ?? '');
        setVoucherDate(header.voucherDate ? new Date(`${header.voucherDate}T00:00:00`) : new Date());
        setPostingDate(header.postingDate ? new Date(`${header.postingDate}T00:00:00`) : new Date());
        setNarration(header.narration ?? '');
        setManagerId(header.managerId != null ? Number(header.managerId) : null);

        const lines = editData?.voucherEntryById?.lines ?? [];
        const usesTwoFlag = lines.some((l: any) => Number(l.drCrFlag) === 2);
        const isDebitFlag = (drCrFlag: number) => (usesTwoFlag ? drCrFlag === 1 : drCrFlag === 0);
        const isCreditFlag = (drCrFlag: number) => (usesTwoFlag ? drCrFlag === 2 : drCrFlag === 1);
        const debitLine = lines.find((l: any) => isDebitFlag(Number(l.drCrFlag)));
        const creditLine = lines.find((l: any) => isCreditFlag(Number(l.drCrFlag)));
        setBankLedgerId(debitLine?.ledgerId != null ? Number(debitLine.ledgerId) : bankLedgerId);
        setCashLedgerId(creditLine?.ledgerId != null ? Number(creditLine.ledgerId) : cashLedgerId);
        setAmount(debitLine?.amount != null ? Number(debitLine.amount) : null);

        const alloc = editData?.voucherEntryById?.managerAllocations ?? [];
        setAllocations(
            alloc.map((a: any) => ({
                key: makeKey(),
                managerId: a.managerId != null ? Number(a.managerId) : null,
                allocationAmount: a.allocationAmount != null ? Number(a.allocationAmount) : null,
                remarks: a.remarks ?? ''
            }))
        );
    }, [bankLedgerId, cashLedgerId, dialogVisible, editData, editingId]);

    const openAdd = () => {
        setEditingId(null);
        setVoucherNo(canFetchNextNo ? nextNoData?.nextVoucherNumber ?? '' : '');
        setVoucherDate(new Date());
        setPostingDate(new Date());
        setAmount(null);
        setNarration('');
        setManagerId(null);
        setAllocations([]);
        setSaving(false);
        setDialogVisible(true);
    };

    const canEditRow = (row: VoucherRow) => {
        if (!row.voucherDate) return false;
        const parsed = new Date(`${row.voucherDate}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return false;
        return validateSingleDate({ date: parsed }, fiscalRange).ok;
    };

    const openEdit = (row: VoucherRow) => {
        if (!canEditRow(row)) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: 'Editing is allowed only within the current fiscal year.'
            });
            return;
        }
        setEditingId(row.voucherId);
        setSaving(false);
        setDialogVisible(true);
    };

    const addAllocation = () => {
        setAllocations((prev) => [
            ...prev,
            { key: makeKey(), managerId: managerId ?? null, allocationAmount: null, remarks: '' }
        ]);
    };

    const updateAllocation = (key: string, patch: Partial<AllocationDraft>) => {
        setAllocations((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
    };

    const removeAllocation = (key: string) => setAllocations((prev) => prev.filter((a) => a.key !== key));

    const save = async () => {
        const voucherDateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!voucherDateValidation.ok) {
            const message = voucherDateValidation.errors.date ?? 'Voucher date is required';
            setVoucherDateError(message);
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: message });
            return;
        }
        const postingDateValidation = validateSingleDate({ date: postingDate }, fiscalRange);
        if (!postingDateValidation.ok) {
            const message = postingDateValidation.errors.date ?? 'Posting date is required';
            setPostingDateError(message);
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: message });
            return;
        }
        setVoucherDateError(null);
        setPostingDateError(null);

        if (!voucherTypeId) {
            toastRef.current?.show({ severity: 'error', summary: 'Missing', detail: 'Contra voucher type not found.' });
            return;
        }
        if (!bankLedgerId || !cashLedgerId || !amount || amount <= 0) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select bank/cash ledgers and enter amount.' });
            return;
        }
        if (!voucherDate) return;

        const normalizedAllocations = allocations
            .map((a) => ({
                managerId: a.managerId,
                allocationAmount: a.allocationAmount,
                remarks: a.remarks
            }))
            .filter((a) => a.managerId && a.allocationAmount && Number(a.allocationAmount) > 0)
            .map((a) => ({
                managerId: Number(a.managerId),
                allocationAmount: Number(a.allocationAmount),
                remarks: a.remarks?.trim() ? a.remarks.trim() : null
            }));

        const ensuredAllocations =
            normalizedAllocations.length > 0
                ? normalizedAllocations
                : managerId
                  ? [{ managerId: Number(managerId), allocationAmount: Number(amount), remarks: null }]
                  : [];

        if (ensuredAllocations.length === 0) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Add at least one manager allocation.' });
            return;
        }

        const allocSum = round2(ensuredAllocations.reduce((sum, a) => sum + Number(a.allocationAmount || 0), 0));
        if (Math.abs(allocSum - round2(Number(amount))) > 0.01) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail: `Manager allocation total (${formatAmount(allocSum)}) must match voucher amount (${formatAmount(Number(amount))}).`
            });
            return;
        }

        setSaving(true);
        try {
            const lines = [
                { ledgerId: bankLedgerId, drCrFlag: 0, amount: Number(amount), narrationText: narration?.trim() ? narration.trim() : null },
                { ledgerId: cashLedgerId, drCrFlag: 1, amount: Number(amount), narrationText: narration?.trim() ? narration.trim() : null }
            ];

            const vars = {
                voucherTypeId,
                voucherDateText: toDateText(voucherDate) as string,
                postingDateText: toDateText(postingDate),
                voucherNumber: voucherNo?.trim() ? voucherNo.trim() : null,
                narrationText: narration?.trim() ? narration.trim() : null,
                managerId: managerId != null ? Number(managerId) : null,
                primaryLedgerId: Number(bankLedgerId),
                isDepositFlag: 0,
                managerAllocations: ensuredAllocations,
                lines
            };

            if (editingId) {
                await updateVoucher({ variables: { voucherId: editingId, ...vars } });
                toastRef.current?.show({ severity: 'success', summary: 'Updated', detail: 'Bank cash deposit updated.' });
            } else {
                await createVoucher({ variables: vars });
                toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: 'Bank cash deposit saved.' });
            }
            setDialogVisible(false);
            setSaving(false);
            await refetch(registerVariables);
        } catch (e: any) {
            setSaving(false);
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to save.' });
        }
    };

    const toggleCancelled = async (row: VoucherRow) => {
        if (!canEditRow(row)) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Restricted',
                detail: 'Editing is allowed only within the current fiscal year.'
            });
            return;
        }
        if (voucherActions.rowDelete.disabled) return;
        setSaving(true);
        try {
            const next = row.isCancelledFlag ? 0 : 1;
            await setCancelledMutation({ variables: { voucherId: row.voucherId, isCancelledFlag: next } });
            await refetch(registerVariables);
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to update status.' });
        } finally {
            setSaving(false);
        }
    };

    const actionsBody = (row: VoucherRow) => {
        const editable = canEditRow(row);
        const restrictedTitle = 'Editing is allowed only within the current fiscal year.';
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    className="p-button-text"
                    onClick={() => openEdit(row)}
                    disabled={!editable || voucherActions.rowEdit.disabled}
                    title={editable ? undefined : restrictedTitle}
                />
                <Button
                    icon={row.isCancelledFlag ? 'pi pi-undo' : 'pi pi-times'}
                    className="p-button-text"
                    onClick={() => toggleCancelled(row)}
                    severity={row.isCancelledFlag ? 'secondary' : 'danger'}
                    disabled={!editable || voucherActions.rowDelete.disabled}
                    title={editable ? undefined : restrictedTitle}
                />
            </div>
        );
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />

            <Dialog
                header={editingId ? 'Edit Bank Cash Deposit' : 'Add Bank Cash Deposit'}
                visible={dialogVisible}
                style={{ width: 'min(980px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-between align-items-center w-full">
                        <div className="text-600">
                            Allocations: <strong>{formatAmount(allocationTotal)}</strong>
                        </div>
                        <div className="flex gap-2">
                            {voucherActions.cancelForm.visible ? (
                                <Button
                                    label="Cancel"
                                    className="p-button-text"
                                    onClick={() => setDialogVisible(false)}
                                    disabled={voucherActions.cancelForm.disabled}
                                />
                            ) : null}
                            {voucherActions.saveForm.visible ? (
                                <Button
                                    label={saving ? 'Saving...' : 'Save'}
                                    icon="pi pi-check"
                                    onClick={save}
                                    disabled={voucherActions.saveForm.disabled}
                                    loading={saving}
                                />
                            ) : null}
                        </div>
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Voucher No</label>
                        <AppInput
                            value={voucherNo}
                            onChange={(e) => setVoucherNo(e.target.value)}
                            className={!isVoucherNoAuto ? 'app-field-noneditable' : undefined}
                            readOnly={!isVoucherNoAuto}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Voucher Date</label>
                        <AppDateInput
                            value={voucherDate}
                            onChange={(value) => {
                                setVoucherDate(value);
                                setVoucherDateError(null);
                            }}
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            style={{ width: '100%' }}
                        />
                        {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Posting Date</label>
                        <AppDateInput
                            value={postingDate}
                            onChange={(value) => {
                                setPostingDate(value);
                                setPostingDateError(null);
                            }}
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                            style={{ width: '100%' }}
                        />
                        {postingDateError && <small className="text-red-500">{postingDateError}</small>}
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-600 mb-1">Amount</label>
                        <InputNumber value={amount} onValueChange={(e) => setAmount(e.value as number)} min={0} mode="decimal" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Bank Ledger (Dr)</label>
                        <AppDropdown
                            value={bankLedgerId}
                            options={bankLedgerOptions.filter((o: any) => o.value)}
                            onChange={(e) => setBankLedgerId(e.value)}
                            placeholder="Select bank ledger"
                            filter
                            showClear
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Cash Ledger (Cr)</label>
                        <AppDropdown
                            value={cashLedgerId}
                            options={cashLedgerOptions.filter((o: any) => o.value)}
                            onChange={(e) => setCashLedgerId(e.value)}
                            placeholder="Select cash ledger"
                            filter
                            showClear
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Paid By</label>
                        <AppDropdown
                            value={managerId}
                            options={managerOptions.filter((o: any) => o.value)}
                            onChange={(e) => setManagerId(e.value)}
                            placeholder="Select manager"
                            filter
                            showClear
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Narration</label>
                        <InputText value={narration} onChange={(e) => setNarration(e.target.value)} style={{ width: '100%' }} />
                    </div>

                    <div className="col-12">
                        <div className="flex align-items-center justify-content-between">
                            <div className="text-700 font-medium">Manager Allocations</div>
                            <Button
                                label="Add Allocation"
                                icon="pi pi-plus"
                                className="p-button-text"
                                onClick={addAllocation}
                                disabled={voucherActions.uiState === 'SAVING'}
                            />
                        </div>
                        <div className="mt-2 flex flex-column gap-2">
                            {allocations.length === 0 && (
                                <div className="text-600 text-sm">No allocations added yet. Add rows to match the voucher amount.</div>
                            )}
                            {allocations.map((a) => (
                                <div key={a.key} className="grid align-items-center">
                                    <div className="col-12 md:col-5">
                                        <AppDropdown
                                            value={a.managerId}
                                            options={managerOptions.filter((o: any) => o.value)}
                                            onChange={(e) => updateAllocation(a.key, { managerId: e.value })}
                                            placeholder="Manager"
                                            filter
                                            showClear
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12 md:col-3">
                                        <InputNumber
                                            value={a.allocationAmount}
                                            onValueChange={(e) => updateAllocation(a.key, { allocationAmount: e.value as number })}
                                            min={0}
                                            mode="decimal"
                                            placeholder="Amount"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12 md:col-3">
                                        <InputText
                                            value={a.remarks}
                                            onChange={(e) => updateAllocation(a.key, { remarks: e.target.value })}
                                            placeholder="Remark"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12 md:col-1 flex justify-content-end">
                                        <Button
                                            icon="pi pi-trash"
                                            className="p-button-text p-button-danger"
                                            onClick={() => removeAllocation(a.key)}
                                            disabled={voucherActions.uiState === 'SAVING'}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Bank Cash Deposit</h2>
                        <p className="mt-2 mb-0 text-600">Contra vouchers where a Bank ledger is debited and Cash is credited.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {voucherActions.addVoucher.visible ? (
                            <Button
                                label="Add"
                                icon="pi pi-plus"
                                onClick={openAdd}
                                disabled={voucherActions.addVoucher.disabled}
                            />
                        ) : null}
                        <Link to="/apps/accounts/voucher-entry?voucherTypeCode=1">
                            <Button label="Voucher Entry" icon="pi pi-pencil" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading deposits: {error.message}</p>}
            </div>

            <AppDataTable
                value={rows}
                paginator
                rows={rowsPerPage}
                rowsPerPageOptions={[20, 50, 100]}
                totalRecords={totalCount}
                lazy
                first={first}
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    if (!hasApplied) return;
                    const nextVariables = { ...registerVariables, limit: e.rows, offset: e.first };
                    setAppliedVariables(nextVariables);
                    refetch(nextVariables);
                }}
                dataKey="voucherId"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    setFirst(0);
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [value, prev[1]]);
                                    setDateErrors({});
                                }}
                                placeholder="From date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                autoFocus
                                selectOnFocus
                                style={{ width: '130px' }}
                            />
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
                                    setFirst(0);
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [prev[0], value]);
                                    setDateErrors({});
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={toDateInputRef}
                                onEnterNext={() => focusDropdown(bankLedgerInputRef)}
                                style={{ width: '130px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <LedgerAutoComplete
                            variant="purpose"
                            purpose="CONTRA-BANK"
                            value={bankLedgerId}
                            onChange={(value) => {
                                setFirst(0);
                                setBankLedgerId(value);
                            }}
                            placeholder="Bank ledger"
                            loadingPlaceholder="Loading bank ledgers..."
                            ref={bankLedgerInputRef}
                            style={{ minWidth: '240px' }}
                        />
                        <LedgerAutoComplete
                            variant="purpose"
                            purpose="CONTRA-CASH"
                            value={cashLedgerId}
                            onChange={(value) => {
                                setFirst(0);
                                setCashLedgerId(value);
                            }}
                            placeholder="Cash ledger"
                            loadingPlaceholder="Loading cash ledgers..."
                            style={{ minWidth: '220px' }}
                        />
                        <AppDropdown
                            value={cancelled}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Not cancelled', value: 0 },
                                { label: 'Cancelled', value: 1 }
                            ]}
                            onChange={(e) => {
                                setFirst(0);
                                setCancelled(e.value);
                            }}
                            placeholder="Status"
                            style={{ minWidth: '160px' }}
                        />
                    </>
                }
                headerRight={
                    <>
                        {voucherActions.refresh.visible ? (
                            <Button
                                label="Refresh"
                                icon="pi pi-refresh"
                                className="p-button-text"
                                id={refreshButtonId}
                                onClick={handleRefresh}
                                disabled={voucherActions.refresh.disabled}
                            />
                        ) : null}
                        {voucherActions.printRegister.visible ? (
                            <Button
                                label="Print Register"
                                icon="pi pi-print"
                                className="p-button-text"
                                onClick={() => window.print()}
                                disabled={voucherActions.printRegister.disabled}
                            />
                        ) : null}
                    </>
                }
                recordSummary={`${totalCount} voucher${totalCount === 1 ? '' : 's'}`}
            >
                <Column
                    header="SN"
                    body={(_, options) => Number(first) + Number(options.rowIndex ?? 0) + 1}
                    style={{ width: '4rem' }}
                />
                <Column field="voucherNumber" header="Voucher No" style={{ width: '8rem' }} />
                <Column
                    field="voucherDate"
                    header="Voucher Date"
                    body={(r: any) => formatDate(r.voucherDate ?? null)}
                    style={{ width: '9rem' }}
                />
                <Column
                    field="postingDate"
                    header="Posting"
                    body={(r: any) => formatDate(r.postingDate ?? null)}
                    style={{ width: '9rem' }}
                />
                <Column
                    field="totalNetAmount"
                    header="Net Amt"
                    body={(r: any) => formatAmount(Number(r.totalNetAmount || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                />
                <Column field="narration" header="Narration" body={(r: any) => r.narration ?? ''} />
                <Column
                    field="isCancelledFlag"
                    header="Cancelled"
                    body={(r: VoucherRow) => (r.isCancelledFlag ? 'Cancelled' : '')}
                    style={{ width: '8rem' }}
                />
                <Column
                    field="managerDetails"
                    header="Manager Details"
                    body={(r: any) => <span style={{ whiteSpace: 'pre-line' }}>{(r.managerDetails ?? '').trim()}</span>}
                    style={{ width: '14rem' }}
                />
                <Column
                    field="managerDetailsAmount"
                    header="Amt"
                    body={(r: any) => <span style={{ whiteSpace: 'pre-line' }}>{(r.managerDetailsAmount ?? '').trim()}</span>}
                    style={{ width: '9rem', textAlign: 'right' }}
                />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>
        </div>
    );
}
