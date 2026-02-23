'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { gql, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';

interface LedgerSummaryRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
}

interface StockInHandRow {
    voucherId: number;
    voucherNumber: string | null;
    openingDate: string | null;
    openingAmount: number;
    closingDate: string | null;
    closingAmount: number;
    isCancelled: boolean;
}

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

const STOCK_IN_HAND = gql`
    query StockInHand($ledgerId: Int!, $fromDate: String, $toDate: String, $cancelled: Int) {
        stockInHand(ledgerId: $ledgerId, fromDate: $fromDate, toDate: $toDate, cancelled: $cancelled) {
            items {
                voucherId
                voucherNumber
                openingDate
                openingAmount
                closingDate
                closingAmount
                isCancelled
            }
            totalCount
        }
    }
`;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const toDateText = (date: Date | null) => {
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

export default function AccountsStockInHandPage() {
    const { companyContext } = useAuth();
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(-1);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'stock-in-hand-refresh';

    const fromDate = toDateText(dateRange[0]);
    const toDate = toDateText(dateRange[1]);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const { data: ledgerData, loading: ledgerLoading } = useQuery(LEDGER_LOOKUP, {
        variables: { search: null, limit: 2000 },
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const queryVariables = useMemo(
        () => ({
            ledgerId: ledgerId ?? 0,
            fromDate,
            toDate,
            cancelled,
        }),
        [cancelled, fromDate, ledgerId, toDate]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof queryVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(STOCK_IN_HAND, {
        variables: appliedVariables ?? queryVariables,
        skip: !appliedVariables
    });

    const ledgerOptions = useMemo(() => {
        const rows = (ledgerData?.ledgerSummaries?.items ?? []) as LedgerSummaryRow[];
        const filtered = rows.filter((row) => (row.groupName ?? '').toLowerCase().includes('stock'));
        const source = filtered.length > 0 ? filtered : rows;
        return source.map((l) => ({
            label: `${l.name ?? ''}${l.groupName ? ` (${l.groupName})` : ''}`.trim() || `Ledger ${l.ledgerId}`,
            value: Number(l.ledgerId)
        }));
    }, [ledgerData]);

    const rows: StockInHandRow[] = useMemo(
        () => (hasApplied ? data?.stockInHand?.items ?? [] : []),
        [data, hasApplied]
    );
    const openingAmount = hasApplied && rows.length ? Number(rows[0].openingAmount || 0) : 0;
    const closingAmount = hasApplied && rows.length ? Number(rows[rows.length - 1].closingAmount || 0) : 0;
    const canRefresh = Boolean(ledgerId && fromDate && toDate);
    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
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
            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Stock In Hand</h2>
                        <p className="mt-2 mb-0 text-600">
                            Uses the selected stock ledger to compute opening and closing balances for the period.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading stock in hand: {error.message}</p>}
            </div>

            <AppDataTable
                value={rows}
                paginator
                rows={15}
                rowsPerPageOptions={[15, 30, 50]}
                dataKey="voucherId"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <>
                        <AppDropdown
                            value={ledgerId}
                            options={ledgerOptions}
                            onChange={(e) => setLedgerId(e.value)}
                            placeholder={ledgerLoading ? 'Loading ledgers...' : 'Select stock ledger'}
                            filter
                            showClear
                            style={{ minWidth: '260px' }}
                        />
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
                        <AppDropdown
                            value={cancelled}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Not cancelled', value: 0 },
                                { label: 'Cancelled', value: 1 }
                            ]}
                            onChange={(e) => setCancelled(e.value)}
                            placeholder="Status"
                            style={{ minWidth: '160px' }}
                        />
                    </>
                }
                headerRight={
                    <>
                        <Tag value={`Opening ${formatAmount(openingAmount)}`} severity="info" />
                        <Tag value={`Closing ${formatAmount(closingAmount)}`} severity="success" />
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
                recordSummary={`${rows.length} row${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="closingDate" header="Voucher Date" body={(r: StockInHandRow) => formatDate(r.closingDate ?? r.openingDate)} style={{ width: '10rem' }} />
                <Column field="voucherNumber" header="Voucher No" style={{ width: '9rem' }} />
                <Column
                    field="openingAmount"
                    header="Opening"
                    body={(r: StockInHandRow) => formatAmount(Number(r.openingAmount || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                />
                <Column
                    field="closingAmount"
                    header="Closing"
                    body={(r: StockInHandRow) => formatAmount(Number(r.closingAmount || 0))}
                    style={{ width: '9rem', textAlign: 'right' }}
                />
                <Column
                    field="isCancelled"
                    header="Status"
                    body={(r: StockInHandRow) => (r.isCancelled ? <Tag value="Cancelled" severity="danger" /> : <Tag value="OK" severity="success" />)}
                    style={{ width: '8rem' }}
                />
            </AppDataTable>
        </div>
    );
}
