'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { gql, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';

interface DepreciationRow {
    ledgerId: number;
    ledgerName: string | null;
    depreciationRate: number;
    opening: number;
    additionMoreThan180: number;
    additionLessThan180: number;
    salesDuringYear: number;
    totalBefore: number;
    depreciationAmount: number;
    closing: number;
    diff: number;
    postingVoucherId: number | null;
    postingVoucherNumber: string | null;
    postingVoucherDate: string | null;
    postingAmount: number;
}

const DEPRECIATION_REPORT = gql`
    query DepreciationReport($fromDate: String, $toDate: String, $defaultDepreciationPostingLedgerId: Int) {
        depreciationReport(
            fromDate: $fromDate
            toDate: $toDate
            defaultDepreciationPostingLedgerId: $defaultDepreciationPostingLedgerId
        ) {
            items {
                ledgerId
                ledgerName
                depreciationRate
                opening
                additionMoreThan180
                additionLessThan180
                salesDuringYear
                totalBefore
                depreciationAmount
                closing
                diff
                postingVoucherId
                postingVoucherNumber
                postingVoucherDate
                postingAmount
            }
        }
    }
`;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const toDateText = (date: Date | null): string | null => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
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

const escapeCsv = (value: string) => {
    const needsQuote = /[",\n]/.test(value);
    const escaped = value.replaceAll('"', '""');
    return needsQuote ? `"${escaped}"` : escaped;
};

export default function AccountsDepreciationPage() {
    const { companyContext } = useAuth();
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'depreciation-refresh';

    const fromDate = toDateText(dateRange[0]);
    const toDate = toDateText(dateRange[1]);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const queryVariables = useMemo(
        () => ({
            fromDate,
            toDate,
            defaultDepreciationPostingLedgerId: null
        }),
        [fromDate, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof queryVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(DEPRECIATION_REPORT, {
        variables: appliedVariables ?? queryVariables,
        skip: !appliedVariables
    });

    const rows: DepreciationRow[] = useMemo(
        () => (hasApplied ? data?.depreciationReport?.items ?? [] : []),
        [data, hasApplied]
    );

    const filteredRows = useMemo(() => {
        const term = searchText.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => (row.ledgerName ?? '').toLowerCase().includes(term));
    }, [rows, searchText]);

    const totals = useMemo(
        () =>
            filteredRows.reduce(
                (acc, row) => {
                    acc.opening += Number(row.opening || 0);
                    acc.addMore += Number(row.additionMoreThan180 || 0);
                    acc.addLess += Number(row.additionLessThan180 || 0);
                    acc.sales += Number(row.salesDuringYear || 0);
                    acc.totalBefore += Number(row.totalBefore || 0);
                    acc.depreciation += Number(row.depreciationAmount || 0);
                    acc.closing += Number(row.closing || 0);
                    acc.posting += Number(row.postingAmount || 0);
                    acc.diff += Number(row.diff || 0);
                    return acc;
                },
                {
                    opening: 0,
                    addMore: 0,
                    addLess: 0,
                    sales: 0,
                    totalBefore: 0,
                    depreciation: 0,
                    closing: 0,
                    posting: 0,
                    diff: 0
                }
            ),
        [filteredRows]
    );
    const canRefresh = Boolean(fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
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

    const exportCsv = () => {
        const header = [
            'Ledger',
            'Dep Rate',
            'Opening',
            'Add >180',
            'Add <=180',
            'Sales',
            'Total Before',
            'Dep Amount',
            'Closing',
            'Posted Voucher',
            'Posted Date',
            'Posted Amount',
            'Diff'
        ];
        const body = filteredRows.map((r) =>
            [
                r.ledgerName ?? '',
                Number(r.depreciationRate ?? 0).toFixed(2),
                Number(r.opening ?? 0).toFixed(2),
                Number(r.additionMoreThan180 ?? 0).toFixed(2),
                Number(r.additionLessThan180 ?? 0).toFixed(2),
                Number(r.salesDuringYear ?? 0).toFixed(2),
                Number(r.totalBefore ?? 0).toFixed(2),
                Number(r.depreciationAmount ?? 0).toFixed(2),
                Number(r.closing ?? 0).toFixed(2),
                r.postingVoucherNumber ?? '',
                formatDate(r.postingVoucherDate ?? null),
                Number(r.postingAmount ?? 0).toFixed(2),
                Number(r.diff ?? 0).toFixed(2)
            ]
                .map((v) => escapeCsv(String(v ?? '')))
                .join(',')
        );
        const totalsRow = [
            'TOTAL',
            '',
            totals.opening.toFixed(2),
            totals.addMore.toFixed(2),
            totals.addLess.toFixed(2),
            totals.sales.toFixed(2),
            totals.totalBefore.toFixed(2),
            totals.depreciation.toFixed(2),
            totals.closing.toFixed(2),
            '',
            '',
            totals.posting.toFixed(2),
            totals.diff.toFixed(2)
        ]
            .map((v) => escapeCsv(String(v)))
            .join(',');
        const csv = [header.map((v) => escapeCsv(v)).join(','), ...body, totalsRow].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `depreciation_${fromDate ?? 'all'}_${toDate ?? 'all'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="card">
            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Depreciation</h2>
                        <p className="mt-2 mb-0 text-600">
                            Depreciation summary for fixed assets within the selected period. Choose the financial year
                            date range before refreshing.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/apps/accounts/voucher-entry?voucherTypeCode=4">
                            <Button label="Journal Voucher" icon="pi pi-pencil" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading depreciation report: {error.message}</p>}
            </div>

            <AppDataTable
                value={filteredRows}
                paginator
                rows={20}
                rowsPerPageOptions={[20, 40, 60]}
                dataKey="ledgerId"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <>
                        <span className="p-input-icon-left" style={{ minWidth: '240px' }}>
                            <i className="pi pi-search" />
                            <InputText
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search ledger"
                                style={{ width: '100%' }}
                            />
                        </span>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
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
                    </>
                }
                headerRight={
                    <>
                        <Tag value={`Dep ${formatAmount(totals.depreciation)}`} severity="info" />
                        <Tag value={`Diff ${formatAmount(totals.diff)}`} severity={totals.diff === 0 ? 'success' : 'warning'} />
                        <Button
                            label="Export"
                            icon="pi pi-download"
                            className="p-button-text"
                            onClick={exportCsv}
                            disabled={filteredRows.length === 0}
                        />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            id={refreshButtonId}
                            onClick={handleRefresh}
                            disabled={!canRefresh}
                        />
                        <Button label="Print" icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
                    </>
                }
                recordSummary={`${filteredRows.length} ledger${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="ledgerName" header="Ledger" sortable />
                <Column
                    field="depreciationRate"
                    header="Rate %"
                    body={(r: DepreciationRow) => (r.depreciationRate ? r.depreciationRate.toFixed(2) : '')}
                    style={{ width: '7rem', textAlign: 'right' }}
                />
                <Column
                    field="opening"
                    header="Opening"
                    body={(r: DepreciationRow) => formatAmount(Number(r.opening || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.opening)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    field="additionMoreThan180"
                    header="> 180"
                    body={(r: DepreciationRow) => formatAmount(Number(r.additionMoreThan180 || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.addMore)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    field="additionLessThan180"
                    header="<= 180"
                    body={(r: DepreciationRow) => formatAmount(Number(r.additionLessThan180 || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.addLess)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    field="salesDuringYear"
                    header="Sales"
                    body={(r: DepreciationRow) => formatAmount(Number(r.salesDuringYear || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.sales)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    field="totalBefore"
                    header="Total"
                    body={(r: DepreciationRow) => formatAmount(Number(r.totalBefore || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.totalBefore)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    field="depreciationAmount"
                    header="Dep Amount"
                    body={(r: DepreciationRow) => formatAmount(Number(r.depreciationAmount || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.depreciation)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    field="closing"
                    header="Closing"
                    body={(r: DepreciationRow) => formatAmount(Number(r.closing || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.closing)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    header="Posted"
                    body={(r: DepreciationRow) => {
                        if (!r.postingVoucherNumber) return '';
                        const dateText = formatDate(r.postingVoucherDate ?? null);
                        return dateText ? `${r.postingVoucherNumber} (${dateText})` : r.postingVoucherNumber;
                    }}
                    style={{ width: '12rem' }}
                />
                <Column
                    field="postingAmount"
                    header="Posted Amt"
                    body={(r: DepreciationRow) => formatAmount(Number(r.postingAmount || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.posting)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
                <Column
                    field="diff"
                    header="Diff"
                    body={(r: DepreciationRow) => formatAmount(Number(r.diff || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                    footer={formatAmount(totals.diff)}
                    footerStyle={{ textAlign: 'right', fontWeight: 600 }}
                />
            </AppDataTable>
        </div>
    );
}
