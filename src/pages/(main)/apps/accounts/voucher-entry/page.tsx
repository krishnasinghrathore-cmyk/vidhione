'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Link, useSearchParams } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppReportActions from '@/components/AppReportActions';
import { useLedgerOptionsByPurpose } from '@/lib/accounts/ledgerOptions';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { formatReportLoadDuration } from '@/lib/reportLoadTime';
import { validateDateRange, validateSingleDate } from '@/lib/reportDateValidation';

type DrCrFlag = 0 | 1;

interface LineRow {
    key: string;
    ledgerId: number | null;
    drCrFlag: DrCrFlag;
    amount: number | null;
    narrationText: string;
}

interface VoucherListRow {
    voucherId: number;
    voucherNumber: string | null;
    voucherDate: string | null;
    voucherTypeName: string | null;
    ledgerName: string | null;
    totalNetAmount: number;
    isCancelledFlag: number | null;
}

interface PageIndexLoadRequest {
    first: number;
    rows: number;
    startedAtMs: number;
}

const VOUCHER_TYPES = gql`
    query VoucherTypes {
        voucherTypes {
            voucherTypeId
            displayName
            voucherTypeName
            voucherTypeCode
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
            }
        }
    }
`;

const VOUCHER_ENTRY_LIST = gql`
    query VoucherEntryList(
        $voucherTypeId: Int
        $search: String
        $cancelled: Int
        $fromDate: String
        $toDate: String
        $limit: Int
        $offset: Int
    ) {
        voucherEntryList(
            voucherTypeId: $voucherTypeId
            search: $search
            cancelled: $cancelled
            fromDate: $fromDate
            toDate: $toDate
            limit: $limit
            offset: $offset
        ) {
            items {
                voucherId
                voucherNumber
                voucherDate
                voucherTypeName
                ledgerName
                totalNetAmount
                isCancelledFlag
            }
            totalCount
        }
    }
`;

const CREATE_VOUCHER = gql`
    mutation CreateVoucher(
        $voucherTypeId: Int!
        $voucherDateText: String!
        $voucherNumber: String
        $narrationText: String
        $lines: [VoucherLineInput!]!
    ) {
        createVoucher(
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            lines: $lines
        ) {
            voucherId
        }
    }
`;

const makeKey = () => Math.random().toString(36).slice(2);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

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

const formatDate = (value: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()))
        return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return trimmed;
};

export default function AccountsVoucherEntryPage() {
    const { companyContext } = useAuth();
    const [searchParams] = useSearchParams();
    const toastRef = useRef<Toast>(null);
    const listFromDateInputRef = useRef<HTMLInputElement>(null);
    const listToDateInputRef = useRef<HTMLInputElement>(null);
    const listRefreshButtonId = 'voucher-entry-list-refresh';
    const [voucherTypeId, setVoucherTypeId] = useState<number | null>(null);
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [voucherDateError, setVoucherDateError] = useState<string | null>(null);
    const [voucherNumber, setVoucherNumber] = useState('');
    const [narrationText, setNarrationText] = useState('');
    const [saving, setSaving] = useState(false);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const today = useMemo(() => new Date(), []);

    const [listVoucherTypeId, setListVoucherTypeId] = useState<number | null>(null);
    const [listTypeTouched, setListTypeTouched] = useState(false);
    const [listSearch, setListSearch] = useState('');
    const [listCancelled, setListCancelled] = useState<-1 | 0 | 1>(0);
    const [listDateRange, setListDateRange] = useState<[Date | null, Date | null]>([
        fiscalRange?.start ?? null,
        fiscalRange?.end ?? today
    ]);
    const [listDateErrors, setListDateErrors] = useState<{ fromDate?: string; toDate?: string }>({});
    const [listRowsPerPage, setListRowsPerPage] = useState(15);
    const [listFirst, setListFirst] = useState(0);
    const [listPageLoadRequest, setListPageLoadRequest] = useState<PageIndexLoadRequest | null>(null);
    const [activeListPageLoadMs, setActiveListPageLoadMs] = useState<number | null>(null);
    const [lastListPageLoadMs, setLastListPageLoadMs] = useState<number | null>(null);
    const listDateTouchedRef = useRef(false);

    const [lines, setLines] = useState<LineRow[]>([
        { key: makeKey(), ledgerId: null, drCrFlag: 0, amount: null, narrationText: '' },
        { key: makeKey(), ledgerId: null, drCrFlag: 1, amount: null, narrationText: '' }
    ]);

    const { data: voucherTypesData, loading: voucherTypesLoading, error: voucherTypesError } = useQuery(VOUCHER_TYPES);
    const { data: ledgerData, loading: ledgerLoading, error: ledgerError } = useQuery(LEDGER_LOOKUP, {
        variables: { search: null, limit: 2000 },
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const [createVoucher] = useMutation(CREATE_VOUCHER);

    const voucherTypeOptions = useMemo(() => {
        const rows = voucherTypesData?.voucherTypes ?? [];
        return rows.map((t: any) => ({
            label: t.displayName || t.voucherTypeName || `Voucher ${t.voucherTypeId}`,
            value: Number(t.voucherTypeId),
            code: t.voucherTypeCode != null ? Number(t.voucherTypeCode) : null
        }));
    }, [voucherTypesData]);

    const selectedVoucherType = useMemo(
        () => voucherTypeOptions.find((option) => option.value === voucherTypeId) ?? null,
        [voucherTypeId, voucherTypeOptions]
    );
    const isVoucherNoAuto = useMemo(() => {
        if (!voucherTypeId) return false;
        const rows = voucherTypesData?.voucherTypes ?? [];
        const selectedType = rows.find((row: any) => Number(row.voucherTypeId) === Number(voucherTypeId));
        return resolveBooleanFlag(selectedType?.isVoucherNoAutoFlag);
    }, [voucherTypeId, voucherTypesData]);

    const { primaryPurpose, secondaryPurpose } = useMemo(() => {
        const code = selectedVoucherType?.code ?? null;
        if (!code) return { primaryPurpose: null, secondaryPurpose: null };
        switch (code) {
            case 1:
                return { primaryPurpose: 'CONTRA-BANK', secondaryPurpose: 'CONTRA-CASH' };
            case 2:
                return { primaryPurpose: 'PAYMENT', secondaryPurpose: 'PAYMENT-AGAINST' };
            case 3:
                return { primaryPurpose: 'RECEIPT', secondaryPurpose: 'RECEIPT-AGAINST' };
            case 4:
                return { primaryPurpose: 'JOURNAL', secondaryPurpose: null };
            case 5:
                return { primaryPurpose: 'SALES', secondaryPurpose: null };
            case 7:
                return { primaryPurpose: 'PURCHASE', secondaryPurpose: null };
            case 9:
                return { primaryPurpose: 'SALES VOUCHER', secondaryPurpose: null };
            case 11:
                return { primaryPurpose: 'PURCHASE VOUCHER', secondaryPurpose: null };
            default:
                return { primaryPurpose: null, secondaryPurpose: null };
        }
    }, [selectedVoucherType]);

    const { options: primaryPurposeOptions, loading: primaryLedgerLoading } = useLedgerOptionsByPurpose({
        purpose: primaryPurpose ?? null,
        limit: 2000,
        skip: !primaryPurpose
    });

    const { options: secondaryPurposeOptions, loading: secondaryLedgerLoading } = useLedgerOptionsByPurpose({
        purpose: secondaryPurpose ?? null,
        limit: 2000,
        skip: !secondaryPurpose
    });

    const listFromDate = listDateRange[0] ? toDateText(listDateRange[0]) : null;
    const listToDate = listDateRange[1] ? toDateText(listDateRange[1]) : null;
    const listVariables = useMemo(
        () => ({
            voucherTypeId: listVoucherTypeId ?? null,
            search: listSearch.trim() ? listSearch.trim() : null,
            cancelled: listCancelled,
            fromDate: listFromDate,
            toDate: listToDate,
            limit: listRowsPerPage,
            offset: listFirst
        }),
        [listCancelled, listFirst, listFromDate, listRowsPerPage, listSearch, listToDate, listVoucherTypeId]
    );

    const { data: listData, loading: listLoading, refetch: refetchList } = useQuery(VOUCHER_ENTRY_LIST, {
        variables: listVariables,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    useEffect(() => {
        const presetIdRaw = searchParams.get('voucherTypeId');
        const presetCodeRaw = searchParams.get('voucherTypeCode');
        if ((!presetIdRaw && !presetCodeRaw) || voucherTypeId) return;

        const presetId = presetIdRaw ? Number(presetIdRaw) : null;
        const presetCode = presetCodeRaw ? Number(presetCodeRaw) : null;

        if (presetId && !Number.isNaN(presetId)) {
            setVoucherTypeId(presetId);
            return;
        }

        if (presetCode && !Number.isNaN(presetCode)) {
            const match = voucherTypeOptions.find((o) => o.code === presetCode);
            if (match) setVoucherTypeId(match.value);
        }
    }, [searchParams, voucherTypeId, voucherTypeOptions]);

    useEffect(() => {
        if (listTypeTouched) return;
        if (voucherTypeId && listVoucherTypeId == null) {
            setListVoucherTypeId(voucherTypeId);
        }
    }, [listTypeTouched, listVoucherTypeId, voucherTypeId]);

    useEffect(() => {
        if (listDateTouchedRef.current) return;
        setListDateRange([fiscalRange?.start ?? null, fiscalRange?.end ?? today]);
    }, [fiscalRange?.end, fiscalRange?.start, today]);

    const clearListPageLoadMeasurement = useCallback(() => {
        setListPageLoadRequest(null);
        setActiveListPageLoadMs(null);
    }, []);

    const startListPageLoadMeasurement = useCallback((nextFirst: number, nextRows: number) => {
        const first = Number.isFinite(nextFirst) ? Math.max(0, Math.trunc(nextFirst)) : 0;
        const rows = Number.isFinite(nextRows) ? Math.max(1, Math.trunc(nextRows)) : 15;
        setListPageLoadRequest({ first, rows, startedAtMs: nowMs() });
        setActiveListPageLoadMs(0);
    }, []);

    useEffect(() => {
        if (!listPageLoadRequest) return;
        const update = () => {
            setActiveListPageLoadMs(nowMs() - listPageLoadRequest.startedAtMs);
        };
        update();
        const intervalId = globalThis.setInterval(update, 200);
        return () => {
            globalThis.clearInterval(intervalId);
        };
    }, [listPageLoadRequest]);

    useEffect(() => {
        if (!listPageLoadRequest) return;
        if (listLoading) return;
        setLastListPageLoadMs(nowMs() - listPageLoadRequest.startedAtMs);
        clearListPageLoadMeasurement();
    }, [clearListPageLoadMeasurement, listLoading, listPageLoadRequest]);

    const baseLedgerOptions = useMemo(() => {
        const rows = ledgerData?.ledgerSummaries?.items ?? [];
        return rows.map((l: any) => ({
            label: `${l.name ?? ''}${l.groupName ? ` (${l.groupName})` : ''}`.trim() || `Ledger ${l.ledgerId}`,
            value: Number(l.ledgerId)
        }));
    }, [ledgerData]);

    const purposeLedgerOptions = useMemo(() => {
        const seen = new Set<number>();
        const options: Array<{ label: string; value: number }> = [];
        [...primaryPurposeOptions, ...secondaryPurposeOptions].forEach((row) => {
            const ledgerId = Number(row.value);
            if (!Number.isFinite(ledgerId) || ledgerId <= 0 || seen.has(ledgerId)) return;
            seen.add(ledgerId);
            options.push({ label: row.label ?? `Ledger ${ledgerId}`, value: ledgerId });
        });
        return options;
    }, [primaryPurposeOptions, secondaryPurposeOptions]);

    const ledgerOptions = purposeLedgerOptions.length > 0 ? purposeLedgerOptions : baseLedgerOptions;
    const lineLedgerLoading = ledgerLoading || primaryLedgerLoading || secondaryLedgerLoading;

    const debitTotal = useMemo(
        () => lines.reduce((sum, l) => sum + (l.drCrFlag === 0 ? Number(l.amount || 0) : 0), 0),
        [lines]
    );
    const creditTotal = useMemo(
        () => lines.reduce((sum, l) => sum + (l.drCrFlag === 1 ? Number(l.amount || 0) : 0), 0),
        [lines]
    );
    const diff = useMemo(() => Math.round((debitTotal - creditTotal) * 100) / 100, [creditTotal, debitTotal]);

    const listRows: VoucherListRow[] = useMemo(() => listData?.voucherEntryList?.items ?? [], [listData]);
    const listTotalCount = listData?.voucherEntryList?.totalCount ?? listRows.length ?? 0;
    const listTotalAmount = useMemo(
        () => listRows.reduce((sum, row) => sum + Number(row.totalNetAmount || 0), 0),
        [listRows]
    );
    const listCanRefresh = Boolean(listDateRange[0] && listDateRange[1]);
    const listPageIndexLoading = listPageLoadRequest != null;
    const pageLoadSummaryText =
        listPageIndexLoading && listLoading && activeListPageLoadMs != null
            ? `Page: ${formatReportLoadDuration(activeListPageLoadMs)} (loading...)`
            : lastListPageLoadMs != null
              ? `Page: ${formatReportLoadDuration(lastListPageLoadMs)}`
              : null;
    const listVoucherTypeOptions = useMemo(
        () => [{ label: 'All types', value: null }].concat(voucherTypeOptions),
        [voucherTypeOptions]
    );

    const balanceTag =
        Math.abs(diff) < 0.01
            ? { value: `Balanced • ${formatAmount(debitTotal)}`, severity: 'success' as const }
            : { value: `Diff ${formatAmount(Math.abs(diff))}`, severity: 'warning' as const };

    const updateLine = (key: string, patch: Partial<LineRow>) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const addLine = (drCrFlag: DrCrFlag) => {
        setLines((prev) => [...prev, { key: makeKey(), ledgerId: null, drCrFlag, amount: null, narrationText: '' }]);
    };

    const removeLine = (key: string) => {
        setLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.key !== key)));
    };

    const canSave =
        !!voucherTypeId &&
        !!voucherDate &&
        lines.length >= 2 &&
        Math.abs(diff) < 0.01 &&
        lines.every((l) => !!l.ledgerId && !!l.amount && Number(l.amount) > 0);

    const reset = () => {
        setVoucherNumber('');
        setNarrationText('');
        setLines([
            { key: makeKey(), ledgerId: null, drCrFlag: 0, amount: null, narrationText: '' },
            { key: makeKey(), ledgerId: null, drCrFlag: 1, amount: null, narrationText: '' }
        ]);
    };

    const handleSave = async () => {
        const dateValidation = validateSingleDate({ date: voucherDate }, fiscalRange);
        if (!dateValidation.ok) {
            const message = dateValidation.errors.date ?? 'Voucher date is required';
            setVoucherDateError(message);
            toastRef.current?.show({ severity: 'warn', summary: 'Validation', detail: message });
            return;
        }
        setVoucherDateError(null);
        if (!voucherTypeId || !voucherDate) return;

        const payloadLines = lines.map((l) => ({
            ledgerId: Number(l.ledgerId),
            amount: Number(l.amount),
            drCrFlag: l.drCrFlag,
            narrationText: l.narrationText?.trim() ? l.narrationText.trim() : null
        }));

        setSaving(true);
        try {
            const res = await createVoucher({
                variables: {
                    voucherTypeId,
                    voucherDateText: toDateText(voucherDate),
                    voucherNumber: voucherNumber.trim() ? voucherNumber.trim() : null,
                    narrationText: narrationText.trim() ? narrationText.trim() : null,
                    lines: payloadLines
                }
            });
            const createdId = res?.data?.createVoucher?.voucherId;
            toastRef.current?.show({
                severity: 'success',
                summary: 'Voucher Saved',
                detail: createdId ? `Created voucher #${createdId}` : 'Created voucher'
            });
            reset();
        } catch (err: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: err?.message || 'Failed to create voucher'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleListRefresh = async () => {
        const validation = validateDateRange(
            {
                fromDate: listDateRange[0],
                toDate: listDateRange[1]
            },
            fiscalRange,
            { enforceFiscalRange: true }
        );
        if (!validation.ok) {
            setListDateErrors(validation.errors);
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail: validation.errors.fromDate || validation.errors.toDate || 'Please select a valid date range'
            });
            return;
        }

        setListDateErrors({});
        clearListPageLoadMeasurement();
        setListFirst(0);
        await refetchList({
            ...listVariables,
            offset: 0,
            fromDate: listFromDate,
            toDate: listToDate
        });
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Voucher Entry</h2>
                        <p className="mt-2 mb-0 text-600">
                            Create vouchers and postings (contra/payment/receipt/journal). Sales/Purchase invoices are
                            handled in the respective industry apps.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/apps/accounts/day-book">
                            <Button label="Day Book" icon="pi pi-calendar" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {(voucherTypesError || ledgerError) && (
                    <p className="text-red-500 m-0">
                        Error loading master data: {voucherTypesError?.message || ledgerError?.message}
                    </p>
                )}
            </div>

            <div className="grid">
                <div className="col-12 md:col-4">
                    <label className="block text-600 mb-1">Voucher Type</label>
                    <AppDropdown
                        value={voucherTypeId}
                        options={voucherTypeOptions}
                        onChange={(e) => setVoucherTypeId(e.value)}
                        placeholder={voucherTypesLoading ? 'Loading...' : 'Select voucher type'}
                        filter
                        showClear
                        loading={voucherTypesLoading}
                        showLoadingIcon
                        style={{ width: '100%' }}
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label className="block text-600 mb-1">Date</label>
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
                <div className="col-12 md:col-2">
                    <label className="block text-600 mb-1">Voucher No</label>
                    <AppInput
                        value={voucherNumber}
                        onChange={(e) => setVoucherNumber(e.target.value)}
                        className={!isVoucherNoAuto ? 'app-field-noneditable' : undefined}
                        readOnly={!isVoucherNoAuto}
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label className="block text-600 mb-1">Totals</label>
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <Tag value={`Dr ${formatAmount(debitTotal)}`} severity="info" />
                        <Tag value={`Cr ${formatAmount(creditTotal)}`} severity="secondary" />
                        <Tag value={balanceTag.value} severity={balanceTag.severity} />
                    </div>
                </div>

                <div className="col-12">
                    <label className="block text-600 mb-1">Narration</label>
                    <InputText
                        value={narrationText}
                        onChange={(e) => setNarrationText(e.target.value)}
                        placeholder="Optional header narration"
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            <AppDataTable
                value={lines}
                dataKey="key"
                stripedRows
                size="small"
                headerRight={
                    <>
                        <Button
                            label="Add Dr"
                            icon="pi pi-plus"
                            className="p-button-text"
                            onClick={() => addLine(1)}
                        />
                        <Button
                            label="Add Cr"
                            icon="pi pi-plus"
                            className="p-button-text"
                            onClick={() => addLine(2)}
                        />
                        <Button
                            label="Reset"
                            icon="pi pi-refresh"
                            className="p-button-outlined"
                            onClick={reset}
                            disabled={saving}
                        />
                        <Button
                            label={saving ? 'Saving...' : 'Save Voucher'}
                            icon="pi pi-check"
                            className="p-button-success"
                            onClick={handleSave}
                            disabled={!canSave || saving || voucherTypesLoading || lineLedgerLoading}
                        />
                    </>
                }
                recordSummary={
                    lineLedgerLoading
                        ? 'Loading ledgers…'
                        : `${lines.length} line${lines.length === 1 ? '' : 's'} • ${balanceTag.value}`
                }
            >
                <Column
                    header="#"
                    body={(_row: LineRow, options) => <span className="text-600">{options.rowIndex + 1}</span>}
                    style={{ width: '3rem' }}
                />
                <Column
                    header="Ledger"
                    body={(row: LineRow) => (
                        <AppDropdown
                            value={row.ledgerId}
                            options={ledgerOptions}
                            onChange={(e) => updateLine(row.key, { ledgerId: e.value })}
                            placeholder={lineLedgerLoading ? 'Loading...' : 'Select ledger'}
                            filter
                            showClear
                            loading={lineLedgerLoading}
                            showLoadingIcon
                            style={{ width: '100%', minWidth: '260px' }}
                        />
                    )}
                />
                <Column
                    header="Dr/Cr"
                    body={(row: LineRow) => (
                        <AppDropdown
                            value={row.drCrFlag}
                            options={[
                                { label: 'Dr', value: 0 },
                                { label: 'Cr', value: 1 }
                            ]}
                            onChange={(e) => updateLine(row.key, { drCrFlag: e.value })}
                            style={{ width: '6.5rem' }}
                        />
                    )}
                    style={{ width: '7.5rem' }}
                />
                <Column
                    header="Amount"
                    body={(row: LineRow) => (
                        <InputNumber
                            value={row.amount ?? null}
                            onValueChange={(e) => updateLine(row.key, { amount: e.value as number | null })}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            inputStyle={{ width: '100%', textAlign: 'right' }}
                        />
                    )}
                    style={{ width: '10rem', textAlign: 'right' }}
                />
                <Column
                    header="Line Narration"
                    body={(row: LineRow) => (
                        <InputText
                            value={row.narrationText}
                            onChange={(e) => updateLine(row.key, { narrationText: e.target.value })}
                            placeholder="Optional"
                            style={{ width: '100%' }}
                        />
                    )}
                />
                <Column
                    header=""
                    body={(row: LineRow) => (
                        <Button
                            icon="pi pi-trash"
                            className="p-button-text p-button-danger"
                            onClick={() => removeLine(row.key)}
                            disabled={lines.length <= 2}
                            tooltip={lines.length <= 2 ? 'At least 2 lines required' : 'Remove line'}
                        />
                    )}
                    style={{ width: '3.5rem', textAlign: 'center' }}
                />
            </AppDataTable>

            <div className="mt-3 text-600 text-sm">
                Tip: Debit total must equal credit total. Use the Dr/Cr dropdown per line to balance the voucher.
            </div>

            <div className="mt-5">
                <div className="flex align-items-center justify-content-between gap-3 flex-wrap mb-2">
                    <div>
                        <h3 className="m-0">Voucher List</h3>
                        <p className="mt-1 mb-0 text-600 text-sm">Recent vouchers for quick lookup.</p>
                    </div>
                </div>

                <AppDataTable
                    value={listRows}
                    paginator
                    rows={listRowsPerPage}
                    rowsPerPageOptions={[15, 30, 50]}
                    totalRecords={listTotalCount}
                    lazy
                    first={listFirst}
                    onPage={(e) => {
                        startListPageLoadMeasurement(e.first, e.rows);
                        setListRowsPerPage(e.rows);
                        setListFirst(e.first);
                    }}
                    dataKey="voucherId"
                    stripedRows
                    size="small"
                    loading={listLoading}
                    headerLeft={
                        <>
                            <AppDropdown
                                value={listVoucherTypeId}
                                options={listVoucherTypeOptions}
                                onChange={(e) => {
                                    setListFirst(0);
                                    setListVoucherTypeId(e.value);
                                    setListTypeTouched(true);
                                }}
                                placeholder="Voucher type"
                                filter
                                showClear
                                style={{ minWidth: '220px' }}
                            />
                            <AppDropdown
                                value={listCancelled}
                                options={[
                                    { label: 'All', value: -1 },
                                    { label: 'Not cancelled', value: 0 },
                                    { label: 'Cancelled', value: 1 }
                                ]}
                                onChange={(e) => {
                                    setListFirst(0);
                                    setListCancelled(e.value);
                                }}
                                placeholder="Status"
                                style={{ minWidth: '160px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <AppDateInput
                                    value={listDateRange[0]}
                                    onChange={(value) => {
                                        listDateTouchedRef.current = true;
                                        setListFirst(0);
                                        setListDateRange((prev) => [value, prev[1]]);
                                        setListDateErrors((prev) => ({ ...prev, fromDate: undefined }));
                                    }}
                                    placeholder="Entry from"
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    inputRef={listFromDateInputRef}
                                    onEnterNext={() => listToDateInputRef.current?.focus()}
                                    style={{ width: '130px' }}
                                />
                                <AppDateInput
                                    value={listDateRange[1]}
                                    onChange={(value) => {
                                        listDateTouchedRef.current = true;
                                        setListFirst(0);
                                        setListDateRange((prev) => [prev[0], value]);
                                        setListDateErrors((prev) => ({ ...prev, toDate: undefined }));
                                    }}
                                    placeholder="Entry to"
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    inputRef={listToDateInputRef}
                                    onEnterNext={() => document.getElementById(listRefreshButtonId)?.focus()}
                                    style={{ width: '130px' }}
                                />
                            </div>
                            <span className="p-input-icon-left" style={{ minWidth: '240px' }}>
                                <i className="pi pi-search" />
                                <AppInput
                                    value={listSearch}
                                    onChange={(e) => {
                                        setListFirst(0);
                                        setListSearch(e.target.value);
                                    }}
                                    placeholder="Search voucher / ledger"
                                    style={{ width: '100%' }}
                                />
                            </span>
                            {(listDateErrors.fromDate || listDateErrors.toDate) && (
                                <small className="text-red-500">{listDateErrors.fromDate || listDateErrors.toDate}</small>
                            )}
                        </>
                    }
                    headerRight={
                        <>
                            <Tag value={`Total ${formatAmount(listTotalAmount)}`} severity="info" />
                            <AppReportActions
                                onRefresh={() => {
                                    void handleListRefresh();
                                }}
                                loadingState={listLoading}
                                refreshDisabled={!listCanRefresh}
                                showStatement={false}
                                showPrint={false}
                                showExport={false}
                                refreshButtonId={listRefreshButtonId}
                            />
                            {pageLoadSummaryText ? (
                                <span className="text-600 text-sm" aria-live="polite">
                                    {pageLoadSummaryText}
                                </span>
                            ) : null}
                        </>
                    }
                    recordSummary={
                        listLoading
                            ? 'Loading vouchers...'
                            : `${listTotalCount} voucher${listTotalCount === 1 ? '' : 's'}`
                    }
                >
                    <Column
                        field="voucherDate"
                        header="Date"
                        body={(row: VoucherListRow) => formatDate(row.voucherDate)}
                        style={{ width: '9rem' }}
                    />
                    <Column field="voucherNumber" header="Voucher No" style={{ width: '9rem' }} />
                    <Column field="voucherTypeName" header="Type" style={{ width: '12rem' }} />
                    <Column field="ledgerName" header="Ledger" />
                    <Column
                        field="totalNetAmount"
                        header="Amount"
                        body={(row: VoucherListRow) => formatAmount(Number(row.totalNetAmount || 0))}
                        style={{ width: '9rem', textAlign: 'right' }}
                    />
                    <Column
                        field="isCancelledFlag"
                        header="Status"
                        body={(row: VoucherListRow) =>
                            row.isCancelledFlag === 1 ? <Tag value="Cancelled" severity="danger" /> : <Tag value="OK" severity="success" />
                        }
                        style={{ width: '8rem' }}
                    />
                </AppDataTable>
            </div>
        </div>
    );
}
