'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { InputSwitch } from 'primereact/inputswitch';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import type { AutoComplete } from 'primereact/autocomplete';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';
import { VoucherTypeIds } from '@/lib/accounts/voucherTypeIds';

interface VoucherRow {
    voucherId: number;
    voucherTypeId: number | null;
    voucherNumber: string | null;
    voucherDate: string | null;
    postingDate: string | null;
    refNo: string | null;
    refDate: string | null;
    debitLedgerName: string | null;
    debitLedgerGroupName: string | null;
    debitLedgerNames?: string | null;
    debitLedgerAmounts?: string | null;
    creditLedgerName?: string | null;
    creditLedgerNames?: string | null;
    creditLedgerAmounts?: string | null;
    totalNetAmount: number;
    narration: string | null;
    chequeInFavourText: string | null;
    chequeIssueBookId: number | null;
    isCancelledFlag: number | null;
}

interface LedgerSummaryRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    ledgerGroupId: number | null;
}

type LedgerOption = {
    label: string;
    value: number;
    groupName: string;
    ledgerGroupId: number | null;
};

interface ChequeIssueBookRow {
    chequeIssueBookId: number;
    voucherNumber: string | null;
    voucherDate: string | null;
    chequeStartNumber: number | null;
    chequeEndNumber: number | null;
    remarks: string | null;
    isCancelledFlag: number | null;
}

interface LineDraft {
    key: string;
    ledgerId: number | null;
    amount: number | null;
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

const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                groupName
                ledgerGroupId
            }
        }
    }
`;

const CHEQUE_ISSUE_BOOKS = gql`
    query ChequeIssueBooks($bankLedgerId: Int, $limit: Int) {
        chequeIssueBooks(bankLedgerId: $bankLedgerId, limit: $limit) {
            chequeIssueBookId
            voucherNumber
            voucherDate
            chequeStartNumber
            chequeEndNumber
            remarks
            isCancelledFlag
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

const CHEQUE_ISSUE_REGISTER = gql`
    query ChequeIssueRegister(
        $bankLedgerId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        chequeIssueRegister(
            bankLedgerId: $bankLedgerId
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
                refNo
                refDate
                debitLedgerName
                debitLedgerGroupName
                debitLedgerNames
                debitLedgerAmounts
                creditLedgerName
                creditLedgerNames
                creditLedgerAmounts
                totalNetAmount
                narration
                chequeInFavourText
                chequeIssueBookId
                isCancelledFlag
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
                refNo
                refDate
                narration
                chequeInFavourText
                chequeIssueBookId
                isCancelledFlag
            }
            lines {
                ledgerId
                drCrFlag
                amount
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
        $purchaseVoucherNumber: String
        $purchaseVoucherDateText: String
        $chequeInFavourText: String
        $chequeIssueBookId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        createVoucher(
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            purchaseVoucherNumber: $purchaseVoucherNumber
            purchaseVoucherDateText: $purchaseVoucherDateText
            chequeInFavourText: $chequeInFavourText
            chequeIssueBookId: $chequeIssueBookId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
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
        $purchaseVoucherNumber: String
        $purchaseVoucherDateText: String
        $chequeInFavourText: String
        $chequeIssueBookId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        updateVoucherEntry(
            voucherId: $voucherId
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            purchaseVoucherNumber: $purchaseVoucherNumber
            purchaseVoucherDateText: $purchaseVoucherDateText
            chequeInFavourText: $chequeInFavourText
            chequeIssueBookId: $chequeIssueBookId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
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

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const resolveReportRange = (fiscalStart: Date | null, fiscalEnd: Date | null) => {
    const range = resolveFiscalRange(fiscalStart, fiscalEnd);
    const today = startOfDay(new Date());
    let maxDate = today;
    if (range.end && range.end < maxDate) {
        maxDate = range.end;
    }
    if (range.start && maxDate < range.start) {
        maxDate = range.start;
    }
    return { start: range.start, end: maxDate };
};

export default function AccountsBankChequeIssuePage() {
    const toastRef = useRef<Toast>(null);
    const { companyContext } = useAuth();

    const [bankLedgerId, setBankLedgerId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<0 | 1>(0);
    const initialRangeRef = useRef(resolveReportRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [printFormat, setPrintFormat] = useState<'format-1' | 'format-2'>('format-1');
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const bankLedgerInputRef = useRef<AutoComplete>(null);
    const lineLedgerGroupInputRef = useRef<AutoComplete>(null);
    const lineLedgerInputRef = useRef<AutoComplete>(null);
    const refreshButtonId = 'bank-cheque-issue-refresh';
    const printMenuRef = useRef<Menu>(null);
    const missingConfigRef = useRef(false);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [voucherNo, setVoucherNo] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [postingDate, setPostingDate] = useState<Date | null>(new Date());
    const [chequeNo, setChequeNo] = useState('');
    const [chequeDate, setChequeDate] = useState<Date | null>(new Date());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [postingDateError, setPostingDateError] = useState<string | null>(null);
    const [chequeDateError, setChequeDateError] = useState<string | null>(null);
    const [chequeInFavour, setChequeInFavour] = useState('');
    const [chequeIssueBookId, setChequeIssueBookId] = useState<number | null>(null);
    const [narration, setNarration] = useState('');
    const [lineLedgerGroupId, setLineLedgerGroupId] = useState<number | null>(null);
    const [lineLedgerId, setLineLedgerId] = useState<number | null>(null);
    const [lineAmount, setLineAmount] = useState<number | null>(null);
    const [lines, setLines] = useState<LineDraft[]>([]);
    const [fastAdd, setFastAdd] = useState(false);
    const [isFormPinned, setIsFormPinned] = useState(true);
    const [saving, setSaving] = useState(false);

    const { data: voucherTypesData } = useQuery(VOUCHER_TYPES);
    const { options: ledgerGroupOptions, loading: ledgerGroupLoading } = useLedgerGroupOptions();
    const { data: ledgerData, loading: ledgerLoading } = useQuery(LEDGER_LOOKUP, {
        variables: { search: null, limit: 5000 },
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });
    const voucherType = useMemo(() => {
        const rows = voucherTypesData?.voucherTypes ?? [];
        return rows.find((v: any) => Number(v.voucherTypeId) === VoucherTypeIds.Payment) ?? null;
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
    const focusDropdown = (ref: React.RefObject<{ focus?: () => void }>) => {
        ref.current?.focus?.();
    };

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveReportRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const registerVariables = useMemo(
        () => ({
            bankLedgerId,
            fromDate,
            toDate,
            cancelled,
            limit: rowsPerPage,
            offset: first
        }),
        [bankLedgerId, cancelled, first, fromDate, rowsPerPage, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(CHEQUE_ISSUE_REGISTER, {
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables
    });

    const { data: editData, refetch: refetchEdit } = useQuery(VOUCHER_ENTRY_BY_ID, {
        skip: !editingId,
        variables: { voucherId: editingId ?? 0 }
    });

    const { data: chequeBooksData } = useQuery(CHEQUE_ISSUE_BOOKS, {
        skip: !bankLedgerId,
        variables: { bankLedgerId: bankLedgerId ?? 0, limit: 5000 }
    });

    const [createVoucher] = useMutation(CREATE_VOUCHER);
    const [updateVoucher] = useMutation(UPDATE_VOUCHER);
    const [setCancelledMutation] = useMutation(SET_CANCELLED);

    const ledgerOptions = useMemo((): LedgerOption[] => {
        const rows = (ledgerData?.ledgerSummaries?.items ?? []) as LedgerSummaryRow[];
        return rows.map((l) => ({
            label: `${l.name ?? ''}${l.groupName ? ` (${l.groupName})` : ''}`.trim() || `Ledger ${l.ledgerId}`,
            value: Number(l.ledgerId),
            groupName: String(l.groupName ?? ''),
            ledgerGroupId: l.ledgerGroupId != null ? Number(l.ledgerGroupId) : null
        }));
    }, [ledgerData]);

    const ledgerLabelById = useMemo(() => {
        const map = new Map<number, string>();
        ledgerOptions.forEach((o: any) => map.set(Number(o.value), String(o.label)));
        return map;
    }, [ledgerOptions]);

    const lineLedgerChoices = useMemo(() => {
        const candidates = lineLedgerGroupId
            ? ledgerOptions.filter((l: any) => Number(l.ledgerGroupId || 0) === Number(lineLedgerGroupId))
            : ledgerOptions;
        return candidates;
    }, [ledgerOptions, lineLedgerGroupId]);

    const [lineLedgerQuery, setLineLedgerQuery] = useState('');
    const [lineLedgerSuggestions, setLineLedgerSuggestions] = useState<LedgerOption[]>([]);

    const selectedLineLedger = useMemo(
        () => (lineLedgerId != null ? lineLedgerChoices.find((l) => Number(l.value) === Number(lineLedgerId)) ?? null : null),
        [lineLedgerChoices, lineLedgerId]
    );

    const lineLedgerValue = lineLedgerQuery.length ? lineLedgerQuery : selectedLineLedger;

    useEffect(() => {
        const needle = lineLedgerQuery.trim().toLowerCase();
        if (!needle) {
            setLineLedgerSuggestions(lineLedgerChoices);
            return;
        }
        setLineLedgerSuggestions(lineLedgerChoices.filter((option) => option.label.toLowerCase().includes(needle)));
    }, [lineLedgerChoices, lineLedgerQuery]);

    const chequeBookOptions = useMemo(() => {
        const rows = (chequeBooksData?.chequeIssueBooks ?? []) as ChequeIssueBookRow[];
        const activeRows = rows.filter((r) => !r.isCancelledFlag);
        return [{ label: 'Select cheque book', value: null }].concat(
            activeRows.map((r) => {
                const labelParts = [
                    r.voucherNumber ? r.voucherNumber : `Book ${r.chequeIssueBookId}`,
                    r.chequeStartNumber != null && r.chequeEndNumber != null ? `(${r.chequeStartNumber} to ${r.chequeEndNumber})` : null
                ].filter(Boolean);
                return { label: labelParts.join(' '), value: Number(r.chequeIssueBookId) };
            })
        );
    }, [chequeBooksData]);

    const rows: VoucherRow[] = useMemo(
        () => (hasApplied ? data?.chequeIssueRegister?.items ?? [] : []),
        [data, hasApplied]
    );
    const totalCount = hasApplied ? data?.chequeIssueRegister?.totalCount ?? rows.length ?? 0 : 0;
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

    const totalDebit = useMemo(() => round2(lines.reduce((sum, l) => sum + Number(l.amount || 0), 0)), [lines]);

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
        setChequeNo(header.refNo ?? '');
        setChequeDate(header.refDate ? new Date(`${header.refDate}T00:00:00`) : new Date());
        setChequeInFavour(header.chequeInFavourText ?? '');
        setChequeIssueBookId(header.chequeIssueBookId != null ? Number(header.chequeIssueBookId) : null);
        setNarration(header.narration ?? '');

        const allLines = editData?.voucherEntryById?.lines ?? [];
        const usesTwoFlag = allLines.some((l: any) => Number(l.drCrFlag) === 2);
        const isDebitFlag = (drCrFlag: number) => (usesTwoFlag ? drCrFlag === 1 : drCrFlag === 0);
        const isCreditFlag = (drCrFlag: number) => (usesTwoFlag ? drCrFlag === 2 : drCrFlag === 1);
        const creditLine = allLines.find((l: any) => isCreditFlag(Number(l.drCrFlag)));
        const debitLines = allLines.filter((l: any) => isDebitFlag(Number(l.drCrFlag)));
        setBankLedgerId(creditLine?.ledgerId != null ? Number(creditLine.ledgerId) : bankLedgerId);
        setLines(
            debitLines.map((l: any) => ({
                key: makeKey(),
                ledgerId: l.ledgerId != null ? Number(l.ledgerId) : null,
                amount: l.amount != null ? Number(l.amount) : null
            }))
        );
    }, [bankLedgerId, dialogVisible, editData, editingId]);

    const openAdd = () => {
        setEditingId(null);
        setVoucherNo(canFetchNextNo ? nextNoData?.nextVoucherNumber ?? '' : '');
        setVoucherDate(new Date());
        setPostingDate(new Date());
        setChequeNo('');
        setChequeDate(new Date());
        setChequeInFavour('');
        setChequeIssueBookId(null);
        setNarration('');
        setLineLedgerGroupId(null);
        setLineLedgerId(null);
        setLineLedgerQuery('');
        setLineAmount(null);
        setLines([]);
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

    const addLine = () => {
        if (!lineLedgerId || !lineAmount || lineAmount <= 0) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select a ledger and enter amount.' });
            return;
        }
        setLines((prev) => [...prev, { key: makeKey(), ledgerId: Number(lineLedgerId), amount: Number(lineAmount) }]);
        setLineAmount(null);
    };

    const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

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
        const chequeDateValidation = validateSingleDate({ date: chequeDate }, fiscalRange);
        if (!chequeDateValidation.ok) {
            const message = chequeDateValidation.errors.date ?? 'Cheque date is required';
            setChequeDateError(message);
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: message });
            return;
        }
        setVoucherDateError(null);
        setPostingDateError(null);
        setChequeDateError(null);

        if (!voucherTypeId) {
            toastRef.current?.show({ severity: 'error', summary: 'Missing', detail: 'Payment voucher type not found.' });
            return;
        }
        if (!bankLedgerId) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select bank ledger.' });
            return;
        }
        if (!voucherDate) return;
        if (!chequeIssueBookId) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Select cheque book.' });
            return;
        }
        if (!chequeNo.trim()) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Enter cheque number.' });
            return;
        }
        if (!chequeDate) return;

        const debitLines = lines
            .filter((l) => l.ledgerId && l.amount && Number(l.amount) > 0)
            .map((l) => ({ ledgerId: Number(l.ledgerId), amount: Number(l.amount) }));

        if (debitLines.length === 0) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Add at least one debit line.' });
            return;
        }

        const total = round2(debitLines.reduce((sum, l) => sum + Number(l.amount || 0), 0));
        if (total <= 0) {
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: 'Total amount must be greater than zero.' });
            return;
        }

        setSaving(true);
        try {
            const headerNarration = narration?.trim() ? narration.trim() : null;

            const voucherLines = [
                {
                    ledgerId: bankLedgerId,
                    drCrFlag: 1,
                    amount: total,
                    narrationText: headerNarration
                },
                ...debitLines.map((l) => ({
                    ledgerId: l.ledgerId,
                    drCrFlag: 0,
                    amount: l.amount,
                    narrationText: headerNarration
                }))
            ];

            const vars = {
                voucherTypeId,
                voucherDateText: toDateText(voucherDate) as string,
                postingDateText: toDateText(postingDate),
                voucherNumber: voucherNo?.trim() ? voucherNo.trim() : null,
                narrationText: headerNarration,
                purchaseVoucherNumber: chequeNo.trim(),
                purchaseVoucherDateText: toDateText(chequeDate),
                chequeInFavourText: chequeInFavour?.trim() ? chequeInFavour.trim() : null,
                chequeIssueBookId: Number(chequeIssueBookId),
                primaryLedgerId: Number(bankLedgerId),
                isDepositFlag: 0,
                lines: voucherLines
            };

            if (editingId) {
                await updateVoucher({ variables: { voucherId: editingId, ...vars } });
                toastRef.current?.show({ severity: 'success', summary: 'Updated', detail: 'Cheque issue updated.' });
            } else {
                await createVoucher({ variables: vars });
                toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: 'Cheque issue saved.' });
            }

            await refetch(registerVariables);
            if (fastAdd) {
                setEditingId(null);
                setVoucherNo(canFetchNextNo ? nextNoData?.nextVoucherNumber ?? '' : '');
                setVoucherDate(new Date());
                setPostingDate(new Date());
                setChequeNo('');
                setChequeDate(new Date());
                setChequeInFavour('');
                setNarration('');
                setLineLedgerGroupId(null);
                setLineLedgerId(null);
                setLineLedgerQuery('');
                setLineAmount(null);
                setLines([]);
                if (canFetchNextNo) {
                    const next = await refetchNextNo(nextVoucherVariables);
                    setVoucherNo(next.data?.nextVoucherNumber ?? '');
                }
            }
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to save.' });
        } finally {
            setSaving(false);
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
        try {
            const next = row.isCancelledFlag ? 0 : 1;
            await setCancelledMutation({ variables: { voucherId: row.voucherId, isCancelledFlag: next } });
            await refetch(registerVariables);
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to update status.' });
        }
    };

    const statusBody = (row: VoucherRow) =>
        row.isCancelledFlag ? <Tag value="Cancelled" severity="danger" /> : <Tag value="Active" severity="success" />;

    const actionsBody = (row: VoucherRow) => {
        const editable = canEditRow(row);
        const restrictedTitle = 'Editing is allowed only within the current fiscal year.';
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    className="p-button-text"
                    onClick={() => openEdit(row)}
                    disabled={!editable}
                    title={editable ? undefined : restrictedTitle}
                />
                <Button
                    icon={row.isCancelledFlag ? 'pi pi-undo' : 'pi pi-times'}
                    className="p-button-text"
                    onClick={() => toggleCancelled(row)}
                    severity={row.isCancelledFlag ? 'secondary' : 'danger'}
                    disabled={!editable}
                    title={editable ? undefined : restrictedTitle}
                />
            </div>
        );
    };

    return (
        <div className="card app-gradient-card">
            <Toast ref={toastRef} />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Bank Cheque Issue</h2>
                        <p className="mt-2 mb-0 text-600">Payment vouchers where a Bank ledger is credited and one or more ledgers are debited.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/apps/accounts/voucher-entry?voucherTypeCode=2">
                            <Button label="Voucher Entry" icon="pi pi-pencil" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading cheque issues: {error.message}</p>}
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
                        <div className="flex align-items-center gap-2">
                            <InputSwitch
                                checked={cancelled === 1}
                                onChange={(e) => {
                                    setFirst(0);
                                    setCancelled(e.value ? 1 : 0);
                                }}
                                className="app-inputswitch"
                            />
                            <span className="text-600 text-sm">{cancelled === 1 ? 'Cancelled' : 'Not cancelled'}</span>
                        </div>
                    </>
                }
                headerRight={
                    <>
                        <Button label="Add" icon="pi pi-plus" onClick={openAdd} />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            id={refreshButtonId}
                            onClick={handleRefresh}
                            disabled={!canRefresh}
                        />
                        <Menu model={printMenuItems} popup ref={printMenuRef} />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="p-button-text"
                            onClick={(event) => printMenuRef.current?.toggle(event)}
                        />
                    </>
                }
                recordSummary={`${totalCount} voucher${totalCount === 1 ? '' : 's'}`}
            >
                <Column
                    field="voucherDate"
                    header="Voucher Date"
                    body={(r: any) => formatDate(r.voucherDate ?? null)}
                    style={{ width: '9rem' }}
                />
                <Column field="voucherNumber" header="Voucher No" style={{ width: '8rem' }} />
                <Column
                    field="postingDate"
                    header="Posting Date"
                    body={(r: any) => formatDate(r.postingDate ?? null)}
                    style={{ width: '9rem' }}
                />
                <Column
                    field="creditLedgerName"
                    header="Ledger (Cr)"
                    body={(r: any) => r.creditLedgerName ?? r.creditLedgerNames ?? ''}
                    style={{ minWidth: '14rem' }}
                />
                <Column field="refNo" header="Cheque No" style={{ width: '9rem' }} />
                <Column
                    field="refDate"
                    header="Cheque Date"
                    body={(r: any) => formatDate(r.refDate ?? null)}
                    style={{ width: '9rem' }}
                />
                <Column
                    field="totalNetAmount"
                    header="Net Amt"
                    body={(r: any) => formatAmount(Number(r.totalNetAmount || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                />
                <Column
                    header="Ag. Ledger (Dr)"
                    body={(r: any) => (
                        <span style={{ whiteSpace: 'pre-line' }}>
                            {(r.debitLedgerNames ?? r.debitLedgerName ?? '').trim()}
                        </span>
                    )}
                    style={{ minWidth: '16rem' }}
                />
                <Column
                    header="Ag. Amt"
                    body={(r: any) => <span style={{ whiteSpace: 'pre-line' }}>{(r.debitLedgerAmounts ?? '').trim()}</span>}
                    style={{ width: '9rem', textAlign: 'right' }}
                />
                <Column field="chequeInFavourText" header="Chq. In Favour" body={(r: any) => r.chequeInFavourText ?? ''} />
                <Column field="narration" header="Narration" body={(r: any) => r.narration ?? ''} />
                <Column field="debitLedgerGroupName" header="Ledger Group" style={{ width: '12rem' }} />
                <Column field="isCancelledFlag" header="Status" body={statusBody} style={{ width: '8rem' }} />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            {dialogVisible && (
                <div
                    className={`mt-3 p-3 surface-50 border-round entry-form ${isFormPinned ? 'entry-form--pinned' : ''}`}
                >
                    <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                        <div className="font-semibold">
                            {editingId ? 'Edit Cheque Issue' : 'Add Cheque Issue'}
                        </div>
                        <div className="flex align-items-center gap-3">
                            <div className="flex align-items-center gap-2">
                                <InputSwitch
                                    checked={fastAdd}
                                    onChange={(e) => setFastAdd(Boolean(e.value))}
                                    className="app-inputswitch"
                                />
                                <span className="text-600 text-sm">Fast Add</span>
                            </div>
                            <Button
                                icon="pi pi-thumbtack"
                                className={`p-button-text p-button-rounded entry-form__pin ${isFormPinned ? 'entry-form__pin--pinned' : 'entry-form__pin--unpinned'}`}
                                onClick={() => setIsFormPinned((prev) => !prev)}
                                tooltip={isFormPinned ? 'Unpin form' : 'Pin form'}
                                tooltipOptions={{ position: 'left' }}
                            />
                        </div>
                    </div>
                    <div className="entry-form__body">
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
                                <label className="block text-600 mb-1">Bank Ledger (Cr)</label>
                                <LedgerAutoComplete
                                    variant="purpose"
                                    purpose="CONTRA-BANK"
                                    value={bankLedgerId}
                                    onChange={(value) => {
                                        setBankLedgerId(value);
                                        setChequeIssueBookId(null);
                                    }}
                                    placeholder="Select bank ledger"
                                    loadingPlaceholder="Loading bank ledgers..."
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="col-12 md:col-3">
                                <label className="block text-600 mb-1">Cheque No</label>
                                <InputText value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                            </div>
                            <div className="col-12 md:col-3">
                                <label className="block text-600 mb-1">Cheque Date</label>
                                <AppDateInput
                                    value={chequeDate}
                                    onChange={(value) => {
                                        setChequeDate(value);
                                        setChequeDateError(null);
                                    }}
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    enforceFiscalRange
                                    style={{ width: '100%' }}
                                />
                                {chequeDateError && <small className="text-red-500">{chequeDateError}</small>}
                            </div>
                            <div className="col-12 md:col-6">
                                <label className="block text-600 mb-1">Cheque Book</label>
                                <AppDropdown
                                    value={chequeIssueBookId}
                                    options={chequeBookOptions.filter((o: any) => o.value)}
                                    onChange={(e) => setChequeIssueBookId(e.value)}
                                    placeholder={!bankLedgerId ? 'Select bank first' : 'Select cheque book'}
                                    filter
                                    showClear
                                    style={{ width: '100%' }}
                                    disabled={!bankLedgerId}
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label className="block text-600 mb-1">Cheque In Favour</label>
                                <InputText
                                    value={chequeInFavour}
                                    onChange={(e) => setChequeInFavour(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label className="block text-600 mb-1">Narration</label>
                                <InputText value={narration} onChange={(e) => setNarration(e.target.value)} style={{ width: '100%' }} />
                            </div>

                            <div className="col-12">
                                <div className="text-700 font-medium mb-2">Debit Lines (Ag. Ledger)</div>

                                <div className="grid align-items-end">
                                    <div className="col-12 md:col-4">
                                        <label className="block text-600 mb-1">Ledger Group</label>
                                        <LedgerGroupAutoComplete
                                            value={lineLedgerGroupId}
                                            options={ledgerGroupOptions}
                                            loading={ledgerGroupLoading}
                                            onChange={(nextValue) => {
                                                setLineLedgerGroupId(nextValue);
                                                setLineLedgerId(null);
                                                setLineLedgerQuery('');
                                            }}
                                            placeholder="Ledger group"
                                            loadingPlaceholder="Loading groups..."
                                            onSelectNext={() => focusDropdown(lineLedgerInputRef)}
                                            ref={lineLedgerGroupInputRef}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12 md:col-5">
                                        <label className="block text-600 mb-1">Ledger (Dr)</label>
                                        <LedgerAutoComplete
                                            value={lineLedgerValue}
                                            suggestions={lineLedgerSuggestions}
                                            ledgerGroupId={lineLedgerGroupId}
                                            completeMethod={(event) => {
                                                const query = event.query ?? '';
                                                setLineLedgerQuery(query);
                                            }}
                                            onDropdownClick={() => {
                                                setLineLedgerQuery('');
                                                setLineLedgerSuggestions(lineLedgerChoices);
                                            }}
                                            onChange={(event) => {
                                                const value = event.value as LedgerOption | string | null;
                                                if (value == null) {
                                                    setLineLedgerQuery('');
                                                    setLineLedgerId(null);
                                                    return;
                                                }
                                                if (typeof value === 'string') {
                                                    const trimmed = value.trim();
                                                    if (!trimmed) {
                                                        setLineLedgerQuery('');
                                                        setLineLedgerId(null);
                                                        return;
                                                    }
                                                    const match =
                                                        lineLedgerSuggestions.find(
                                                            (option) => option.label.toLowerCase() === trimmed.toLowerCase()
                                                        ) ??
                                                        lineLedgerChoices.find(
                                                            (option) => option.label.toLowerCase() === trimmed.toLowerCase()
                                                        ) ??
                                                        null;
                                                    if (match) {
                                                        setLineLedgerQuery('');
                                                        setLineLedgerId(Number(match.value));
                                                        return;
                                                    }
                                                    setLineLedgerQuery(value);
                                                    setLineLedgerId(null);
                                                    return;
                                                }
                                                setLineLedgerQuery('');
                                                setLineLedgerId(Number(value.value));
                                            }}
                                            field="label"
                                            loading={ledgerLoading}
                                            showLoadingIcon
                                            placeholder={ledgerLoading ? 'Loading ledgers...' : 'Select ledger'}
                                            ref={lineLedgerInputRef}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12 md:col-2">
                                        <label className="block text-600 mb-1">Amount</label>
                                        <InputNumber
                                            value={lineAmount}
                                            onValueChange={(e) => setLineAmount(e.value as number)}
                                            min={0}
                                            mode="decimal"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="col-12 md:col-1 flex justify-content-end">
                                        <Button icon="pi pi-plus" className="p-button-text" onClick={addLine} />
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <AppDataTable value={lines} dataKey="key" size="small" stripedRows>
                                        <Column
                                            header="Ledger"
                                            body={(r: any) => (r.ledgerId ? ledgerLabelById.get(Number(r.ledgerId)) ?? `Ledger ${r.ledgerId}` : '')}
                                        />
                                        <Column
                                            header="Amount"
                                            body={(r: any) => formatAmount(Number(r.amount || 0))}
                                            style={{ width: '10rem', textAlign: 'right' }}
                                        />
                                        <Column
                                            header=""
                                            body={(r: any) => (
                                                <Button
                                                    icon="pi pi-trash"
                                                    className="p-button-text p-button-danger"
                                                    onClick={() => removeLine(r.key)}
                                                />
                                            )}
                                            style={{ width: '4rem' }}
                                        />
                                    </AppDataTable>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-content-between align-items-center w-full pt-3 mt-3 border-top-1 surface-border">
                        <div className="text-600">
                            Total: <strong>{formatAmount(totalDebit)}</strong>
                        </div>
                        <div className="flex gap-2">
                            <Button label="Close" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
                            <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
