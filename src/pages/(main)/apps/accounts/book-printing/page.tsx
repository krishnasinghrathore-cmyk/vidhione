'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import type { AutoComplete } from 'primereact/autocomplete';
import type { Dropdown } from 'primereact/dropdown';
import type { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { Link } from 'react-router-dom';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppMultiSelect from '@/components/AppMultiSelect';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import VoucherTypeAutoComplete from '@/components/VoucherTypeAutoComplete';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { useVoucherTypeOptions } from '@/lib/accounts/voucherTypes';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';

interface LedgerSummaryRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    ledgerGroupId: number | null;
}

interface BookPrintingRow {
    id: number;
    ledgerId: number;
    ledgerName: string | null;
    ledgerGroupName: string | null;
    voucherDate: string | null;
    voucherNo: string | null;
    voucherType: string | null;
    counterLedger: string | null;
    counterLedgerDetail?: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    balance: number;
}

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

const BOOK_PRINTING = gql`
    query BookPrinting(
        $ledgerGroupId: Int
        $ledgerIds: [Int!]
        $voucherTypeId: Int
        $fromDate: String
        $toDate: String
        $view: String
        $detailed: Boolean
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        bookPrinting(
            ledgerGroupId: $ledgerGroupId
            ledgerIds: $ledgerIds
            voucherTypeId: $voucherTypeId
            fromDate: $fromDate
            toDate: $toDate
            view: $view
            detailed: $detailed
            cancelled: $cancelled
            limit: $limit
            offset: $offset
        ) {
            items {
                id
                ledgerId
                ledgerName
                ledgerGroupName
                voucherDate
                voucherNo
                voucherType
                counterLedger
                counterLedgerDetail
                narration
                debit
                credit
                balance
            }
            totalCount
            debitTotal
            creditTotal
        }
    }
`;

const toDateText = (date: Date | null): string | null => {
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

const formatBalance = (signed: number) => `${formatAmount(Math.abs(signed))} ${signed >= 0 ? 'Dr' : 'Cr'}`;

const escapeCsv = (value: string) => {
    const needsQuote = /[",\n]/.test(value);
    const escaped = value.replaceAll('"', '""');
    return needsQuote ? `"${escaped}"` : escaped;
};

const parseDateText = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const toLocalDate = (year: number, month: number, day: number) => {
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
        return new Date(year, month - 1, day);
    };

    if (/^\d{8}$/.test(trimmed)) {
        const year = Number(trimmed.slice(0, 4));
        const month = Number(trimmed.slice(4, 6));
        const day = Number(trimmed.slice(6, 8));
        return toLocalDate(year, month, day);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-').map(Number);
        return toLocalDate(year, month, day);
    }
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const day = Number(slash[1]);
        const month = Number(slash[2]);
        const year = Number(slash[3]);
        return toLocalDate(year, month, day);
    }
    return null;
};

const parseFiscalYearRange = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/(\d{4})\D+(\d{2,4})/);
    if (!match) return null;
    const startYear = Number(match[1]);
    const endText = match[2];
    const endYear = endText.length === 2 ? Number(`${String(startYear).slice(0, 2)}${endText}`) : Number(endText);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
    return { startYear, endYear };
};

const buildDefaultFiscalRange = (baseDate = new Date()) => {
    const startYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
    return {
        start: new Date(startYear, 3, 1),
        end: new Date(startYear + 1, 2, 31)
    };
};

const resolveFiscalRange = (startText: string | null, endText: string | null) => {
    let start = parseDateText(startText);
    let end = parseDateText(endText);

    if (start || end) {
        if (start && !end) {
            end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1);
        } else if (!start && end) {
            start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);
        }
        return { start: start ?? null, end: end ?? null };
    }

    const range = parseFiscalYearRange(startText ?? endText);
    if (range) {
        return {
            start: new Date(range.startYear, 3, 1),
            end: new Date(range.endYear, 2, 31)
        };
    }

    return buildDefaultFiscalRange();
};

export default function AccountsBookPrintingPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const [ledgerGroupId, setLedgerGroupId] = useState<number | null>(null);
    const [ledgerIds, setLedgerIds] = useState<number[]>([]);
    const [voucherTypeId, setVoucherTypeId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(-1);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const ledgerGroupInputRef = useRef<AutoComplete>(null);
    const ledgerInputRef = useRef<MultiSelect>(null);
    const voucherTypeInputRef = useRef<AutoComplete>(null);
    const statusInputRef = useRef<Dropdown>(null);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'book-printing-refresh';
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [first, setFirst] = useState(0);
    const [showNarration, setShowNarration] = useState(true);
    const [viewMode, setViewMode] = useState<'ledger' | 'date'>('ledger');
    const [showDetail, setShowDetail] = useState(false);

    useEffect(() => {
        setPageTitle('Book Printing');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const { options: ledgerGroupOptions, loading: ledgerGroupLoading } = useLedgerGroupOptions();
    const { data: ledgerData, loading: ledgerLoading } = useQuery(LEDGER_LOOKUP, {
        variables: { search: null, limit: 5000 }
    });
    const { options: voucherTypeOptions, loading: voucherTypesLoading } = useVoucherTypeOptions();

    const allLedgerOptions = useMemo(() => {
        const rows = (ledgerData?.ledgerSummaries?.items ?? []) as LedgerSummaryRow[];
        return rows.map((l) => ({
            label: `${l.name ?? ''}${l.groupName ? ` (${l.groupName})` : ''}`.trim() || `Ledger ${l.ledgerId}`,
            value: Number(l.ledgerId),
            ledgerGroupId: l.ledgerGroupId != null ? Number(l.ledgerGroupId) : null
        }));
    }, [ledgerData]);

    const ledgerOptions = useMemo(() => {
        if (!ledgerGroupId) return allLedgerOptions;
        return allLedgerOptions.filter((l) => Number(l.ledgerGroupId || 0) === Number(ledgerGroupId));
    }, [allLedgerOptions, ledgerGroupId]);

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const canRefresh = Boolean(fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };
    const focusDropdown = (ref: React.RefObject<Dropdown>) => {
        ref.current?.focus();
    };
    const focusMultiSelect = (ref: React.RefObject<MultiSelect>) => {
        const instance = ref.current;
        if (!instance) return;
        if (typeof instance.focus === 'function') {
            instance.focus();
            return;
        }
        const element = instance.getElement?.();
        if (element instanceof HTMLElement) element.focus();
    };

    const queryVariables = useMemo(
        () => ({
            ledgerGroupId,
            ledgerIds: ledgerIds.length > 0 ? ledgerIds : null,
            voucherTypeId,
            fromDate,
            toDate,
            view: viewMode,
            detailed: showDetail,
            cancelled,
            limit: rowsPerPage,
            offset: first
        }),
        [
            cancelled,
            first,
            fromDate,
            ledgerGroupId,
            ledgerIds,
            rowsPerPage,
            showDetail,
            toDate,
            voucherTypeId,
            viewMode
        ]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof queryVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(BOOK_PRINTING, {
        variables: appliedVariables ?? queryVariables,
        skip: !appliedVariables
    });

    const rows: BookPrintingRow[] = useMemo(
        () => (hasApplied ? data?.bookPrinting?.items ?? [] : []),
        [data, hasApplied]
    );
    const totalCount = hasApplied ? data?.bookPrinting?.totalCount ?? rows.length ?? 0 : 0;
    const debitTotal = hasApplied ? Number(data?.bookPrinting?.debitTotal ?? 0) : 0;
    const creditTotal = hasApplied ? Number(data?.bookPrinting?.creditTotal ?? 0) : 0;

    const ledgerTotals = useMemo(() => {
        const totals = new Map<string, { debit: number; credit: number; closing: number }>();
        for (const row of rows) {
            const key = row.ledgerName ?? `Ledger ${row.ledgerId}`;
            const prev = totals.get(key) ?? { debit: 0, credit: 0, closing: 0 };
            const next = {
                debit: prev.debit + Number(row.debit || 0),
                credit: prev.credit + Number(row.credit || 0),
                closing: Number(row.balance || 0)
            };
            totals.set(key, next);
        }
        return totals;
    }, [rows]);

    const rowGroupHeaderTemplate = (rowData: BookPrintingRow) => {
        const key = rowData.ledgerName ?? `Ledger ${rowData.ledgerId}`;
        const total = ledgerTotals.get(key);
        const parts = [
            key,
            rowData.ledgerGroupName ? `(${rowData.ledgerGroupName})` : null,
            total ? `Dr ${formatAmount(total.debit)} • Cr ${formatAmount(total.credit)} • Closing ${formatBalance(total.closing)}` : null
        ].filter(Boolean);
        return <span className="font-medium text-700">{parts.join(' ')}</span>;
    };

    const exportCsv = () => {
        const header = [
            'Ledger',
            'Ledger Group',
            'Voucher Date',
            'Voucher No',
            'Voucher Type',
            showDetail ? 'Ag. Ledger Detail' : 'Ag. Ledger',
            'Narration',
            'Dr Amt',
            'Cr Amt',
            'Balance'
        ];
        const body = rows.map((r) =>
            [
                r.ledgerName ?? '',
                r.ledgerGroupName ?? '',
                formatDate(r.voucherDate ?? null),
                r.voucherNo ?? '',
                r.voucherType ?? '',
                showDetail ? r.counterLedgerDetail ?? r.counterLedger ?? '' : r.counterLedger ?? '',
                r.narration ?? '',
                r.debit ? String(r.debit) : '',
                r.credit ? String(r.credit) : '',
                String(r.balance ?? 0)
            ]
                .map((v) => escapeCsv(String(v ?? '')))
                .join(',')
        );
        const csv = [header.join(','), ...body].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `book-printing_${fromDate ?? 'all'}_${toDate ?? 'all'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (!hasApplied) {
            setAppliedVariables(queryVariables);
            return;
        }
        setAppliedVariables(queryVariables);
        void refetch(queryVariables);
    };

    return (
        <div className="card">
            <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                <div>
                    <h2 className="m-0">Book Printing</h2>
                    <p className="mt-2 mb-0 text-600">Ledger book print view across one or more ledgers.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link to="/apps/accounts">
                        <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                    </Link>
                </div>
            </div>

            {error && <p className="text-red-500 mt-3 mb-0">Error loading book printing: {error.message}</p>}

            <div className="mt-4">
                <AppDataTable
                    value={rows}
                    paginator
                    rows={rowsPerPage}
                    rowsPerPageOptions={[20, 50, 100, 250]}
                    totalRecords={totalCount}
                    lazy
                    first={first}
                    onPage={(e) => {
                        setRowsPerPage(e.rows);
                        setFirst(e.first);
                        if (!hasApplied) return;
                        const nextVariables = { ...queryVariables, limit: e.rows, offset: e.first };
                        setAppliedVariables(nextVariables);
                        refetch(nextVariables);
                    }}
                    dataKey="id"
                    stripedRows
                    size="small"
                    loading={loading}
                    rowGroupMode="subheader"
                    groupRowsBy="ledgerName"
                    sortField="ledgerName"
                    sortOrder={1}
                    rowGroupHeaderTemplate={rowGroupHeaderTemplate as any}
                    headerLeft={
                        <>
                            <LedgerGroupAutoComplete
                                value={ledgerGroupId}
                                options={ledgerGroupOptions}
                                loading={ledgerGroupLoading}
                                onChange={(nextValue) => {
                                    setFirst(0);
                                    setLedgerGroupId(nextValue);
                                    setLedgerIds([]);
                                }}
                                placeholder="Ledger group"
                                loadingPlaceholder="Loading groups..."
                                onSelectNext={() => focusMultiSelect(ledgerInputRef)}
                                ref={ledgerGroupInputRef}
                                style={{ minWidth: '220px' }}
                            />
                            <AppMultiSelect
                                value={ledgerIds}
                                options={ledgerOptions}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(e) => {
                                    setFirst(0);
                                    setLedgerIds(e.value ?? []);
                                }}
                                placeholder={ledgerLoading ? 'Loading ledgers...' : 'Multiple ledgers'}
                                filter
                                display="chip"
                                maxSelectedLabels={2}
                                loading={ledgerLoading}
                                ref={ledgerInputRef}
                                style={{ minWidth: '320px' }}
                            />
                            <VoucherTypeAutoComplete
                                value={voucherTypeId}
                                options={voucherTypeOptions}
                                loading={voucherTypesLoading}
                                onChange={(nextValue) => {
                                    setFirst(0);
                                    setVoucherTypeId(nextValue);
                                }}
                                placeholder="Voucher type"
                                loadingPlaceholder="Loading voucher types..."
                                onSelectNext={() => focusDropdown(statusInputRef)}
                                ref={voucherTypeInputRef}
                                style={{ minWidth: '200px' }}
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
                                onEnterNext={() => fromDateInputRef.current?.focus()}
                                ref={statusInputRef}
                                style={{ minWidth: '160px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <AppDateInput
                                    value={dateRange[0]}
                                    onChange={(value) => {
                                        setFirst(0);
                                        setDateRange((prev) => [value, prev[1]]);
                                        setDateErrors({});
                                    }}
                                    placeholder="From date"
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    inputRef={fromDateInputRef}
                                    onEnterNext={() => toDateInputRef.current?.focus()}
                                    style={{ width: '130px' }}
                                />
                                <AppDateInput
                                    value={dateRange[1]}
                                    onChange={(value) => {
                                        setFirst(0);
                                        setDateRange((prev) => [prev[0], value]);
                                        setDateErrors({});
                                    }}
                                    placeholder="To date"
                                    fiscalYearStart={fiscalRange?.start ?? null}
                                    fiscalYearEnd={fiscalRange?.end ?? null}
                                    inputRef={toDateInputRef}
                                    onEnterNext={focusRefreshButton}
                                    style={{ width: '130px' }}
                                />
                            </div>
                            {(dateErrors.fromDate || dateErrors.toDate) && (
                                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                            )}
                            <AppDropdown
                                value={viewMode}
                                options={[
                                    { label: 'View: Ledger', value: 'ledger' },
                                    { label: 'View: Date', value: 'date' }
                                ]}
                                onChange={(e) => setViewMode(e.value)}
                                style={{ minWidth: '170px' }}
                            />
                            <AppDropdown
                                value={showDetail ? 1 : 0}
                                options={[
                                    { label: 'Detail off', value: 0 },
                                    { label: 'Detail on', value: 1 }
                                ]}
                                onChange={(e) => setShowDetail(e.value === 1)}
                                style={{ minWidth: '140px' }}
                            />
                            <AppDropdown
                                value={showNarration ? 1 : 0}
                                options={[
                                    { label: 'Show narration', value: 1 },
                                    { label: 'Hide narration', value: 0 }
                                ]}
                                onChange={(e) => setShowNarration(e.value === 1)}
                                style={{ minWidth: '170px' }}
                            />
                        </>
                    }
                    headerRight={
                        <>
                            <Tag value={`Dr ${formatAmount(debitTotal)}`} severity="info" />
                            <Tag value={`Cr ${formatAmount(creditTotal)}`} severity="success" />
                            <Tag value={`Diff ${formatAmount(Math.abs(debitTotal - creditTotal))}`} severity="warning" />
                            <Button
                                label="Refresh"
                                icon="pi pi-refresh"
                                className="p-button-text"
                                id={refreshButtonId}
                                onClick={handleRefresh}
                                disabled={!canRefresh}
                            />
                            <Button label="Export CSV" icon="pi pi-download" className="p-button-text" onClick={exportCsv} disabled={rows.length === 0} />
                            <Button label="Print" icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
                        </>
                    }
                    recordSummary={`${totalCount} row${totalCount === 1 ? '' : 's'}`}
                >
                    <Column
                        field="voucherDate"
                        header="V. Date"
                        body={(r: any) => formatDate(r.voucherDate ?? null)}
                        style={{ width: '9rem' }}
                    />
                    <Column field="voucherNo" header="V. No" style={{ width: '8rem' }} />
                    <Column field="voucherType" header="V. Type" style={{ width: '11rem' }} />
                    <Column
                        field="counterLedger"
                        header={showDetail ? 'Ag. Ledger Detail' : 'Ag. Ledger'}
                        body={(r: BookPrintingRow) =>
                            showDetail ? r.counterLedgerDetail ?? r.counterLedger ?? '' : r.counterLedger ?? ''
                        }
                        style={showDetail ? { whiteSpace: 'pre-line' } : undefined}
                    />
                    {showNarration && (
                        <Column field="narration" header="Narration" body={(r: any) => r.narration ?? ''} />
                    )}
                    <Column
                        field="debit"
                        header="Dr Amt"
                        body={(r: any) => (r.debit ? formatAmount(Number(r.debit)) : '')}
                        style={{ width: '9rem', textAlign: 'right' }}
                    />
                    <Column
                        field="credit"
                        header="Cr Amt"
                        body={(r: any) => (r.credit ? formatAmount(Number(r.credit)) : '')}
                        style={{ width: '9rem', textAlign: 'right' }}
                    />
                    <Column
                        field="balance"
                        header="Balance"
                        body={(r: any) => formatBalance(Number(r.balance ?? 0))}
                        style={{ width: '10rem', textAlign: 'right' }}
                    />
                </AppDataTable>
            </div>
        </div>
    );
}
