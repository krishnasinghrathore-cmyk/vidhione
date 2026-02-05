'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Button } from 'primereact/button';
import AppDataTable from '@/components/AppDataTable';
import { Column } from 'primereact/column';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { extractWealthSegment, stripWealthMetaTags } from '@/lib/wealthNotes';
import { addDays, toYmd, toYmdOrNull } from '@/lib/date';

type Account = { id: string; name: string; code?: string | null };

type TxRow = {
    id: string;
    tdate: string;
    ttype: string;
    segment?: string | null;
    invoiceDate?: string | null;
    qty: string;
    price: string;
    fees: string;
    notes?: string | null;
    sourceDoc?: string | null;
    isin?: string | null;
    symbol?: string | null;
    name?: string | null;
    accountId?: string | null;
};

type LedgerRow = {
    id: string;
    tdate: string;
    particulars: string;
    folio: string;
    debit: number;
    credit: number;
    running: number;
};

const ACCOUNTS_QUERY = gql`
    query Accounts {
        accounts {
            id
            name
            code
        }
    }
`;

const CASH_LEDGER_QUERY = gql`
    query CashLedger($fromDate: String, $toDate: String, $accountId: String, $segment: String, $limit: Int) {
        transactionsPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, segment: $segment, limit: $limit, offset: 0) {
            items {
                id
                tdate
                ttype
                segment
                invoiceDate
                qty
                price
                fees
                notes
                sourceDoc
                isin
                symbol
                name
                accountId
            }
            meta {
                total
                limit
                offset
                hasMore
                nextOffset
            }
        }
    }
`;

const TX_SEGMENTS = [
    { label: 'All', value: '' },
    { label: 'Cash', value: 'CASH' },
    { label: 'SLBM', value: 'SLBM' },
    { label: 'F&O', value: 'FAO' }
];

const parseAmount = (value: string | null | undefined) => {
    if (!value) return 0;
    const num = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(num) ? num : 0;
};

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const csvEscape = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
};

const computeCashMovement = (tx: TxRow) => {
    const ttype = String(tx.ttype || '').toUpperCase();
    const qty = parseAmount(tx.qty);
    const price = parseAmount(tx.price);
    const fees = parseAmount(tx.fees);

    const units = qty > 0 ? qty : 1;
    const gross = ttype === 'DIVIDEND' || ttype === 'EXPENSE' ? price * units : qty * price;

    let debit = 0; // receipts (cash in)
    let credit = 0; // payments (cash out)

    if (ttype === 'SELL') debit = gross - fees;
    else if (ttype === 'DIVIDEND') debit = gross - fees; // fees = TDS
    else if (ttype === 'BUY' || ttype === 'RIGHTS') credit = gross + fees;
    else if (ttype === 'EXPENSE') credit = gross + fees;

    return { debit: Math.max(0, debit), credit: Math.max(0, credit), gross, fees, qty, price };
};

export default function WealthCashLedgerPage() {
    const [rowsLimit] = useState(5000);
    const [accountId, setAccountId] = useState<string>('');
    const [segment, setSegment] = useState<string>('');
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [cashOnly, setCashOnly] = useState(true);
    const [printMode, setPrintMode] = useState(false);

    const { data: accountsData } = useQuery(ACCOUNTS_QUERY, { client: wealthApolloClient });
    const accounts = accountsData?.accounts ?? [];

    const accountOptions = useMemo(
        () => accounts.map((a: Account) => ({ label: a.code ? `${a.name} (${a.code})` : a.name, value: a.id })),
        [accounts]
    );
    const accountById = useMemo(() => {
        const map: Record<string, Account> = {};
        accounts.forEach((a: Account) => {
            map[a.id] = a;
        });
        return map;
    }, [accounts]);

    const getAccountLabel = (id: string) => {
        const account = accountById[id];
        if (!account) return id;
        return account.code ? `${account.name} (${account.code})` : account.name;
    };

    useEffect(() => {
        if (!accountId && accountOptions.length) setAccountId(accountOptions[0].value);
    }, [accountId, accountOptions]);

    useEffect(() => {
        const onAfterPrint = () => setPrintMode(false);
        window.addEventListener('afterprint', onAfterPrint);
        return () => window.removeEventListener('afterprint', onAfterPrint);
    }, []);

    const fromYmd = toYmdOrNull(fromDate);
    const toYmdValue = toYmdOrNull(toDate);
    const openingToYmd = fromDate ? toYmd(addDays(fromDate, -1)) : null;

    const { data, loading, error, refetch } = useQuery(CASH_LEDGER_QUERY, {
        client: wealthApolloClient,
        variables: {
            fromDate: fromYmd,
            toDate: toYmdValue,
            accountId: accountId || null,
            segment: segment || null,
            limit: rowsLimit
        }
    });

    const { data: openingData } = useQuery(CASH_LEDGER_QUERY, {
        client: wealthApolloClient,
        skip: !openingToYmd || !accountId,
        variables: {
            fromDate: null,
            toDate: openingToYmd,
            accountId: accountId || null,
            segment: segment || null,
            limit: rowsLimit
        }
    });

    const page = data?.transactionsPage;
    const rawRows: TxRow[] = page?.items ?? [];

    const openingRows: TxRow[] = openingData?.transactionsPage?.items ?? [];
    const openingBalance = useMemo(() => {
        let running = 0;
        for (const tx of openingRows) {
            const { debit, credit } = computeCashMovement(tx);
            running += debit - credit;
        }
        return running;
    }, [openingRows]);

    const rowsWithBalance: LedgerRow[] = useMemo(() => {
        const sorted = [...rawRows].sort((a, b) => {
            const d = String(a.tdate || '').localeCompare(String(b.tdate || ''));
            if (d !== 0) return d;
            return Number(a.id) - Number(b.id);
        });

        const out: LedgerRow[] = [];

        let running = fromYmd ? openingBalance : 0;
        if (fromYmd) {
            out.push({
                id: 'opening',
                tdate: '',
                particulars: 'Opening Balance',
                folio: '',
                debit: 0,
                credit: 0,
                running
            });
        }

        for (const tx of sorted) {
            const { debit, credit, gross, fees, qty, price } = computeCashMovement(tx);
            const seg = tx.segment || extractWealthSegment(tx.notes) || 'CASH';
            const baseNotes = stripWealthMetaTags(tx.notes ?? '');
            const security = tx.symbol || tx.name || tx.isin || '';

            const particularsParts = [
                `${seg !== 'CASH' ? `[${seg}] ` : ''}${tx.ttype}${security ? ` - ${security}` : ''}`.trim(),
                qty ? `Qty ${formatAmount(qty)}` : '',
                price ? `Rate ${formatAmount(price)}` : '',
                fees ? `Fees ${formatAmount(fees)}` : '',
                gross ? `Gross ${formatAmount(gross)}` : '',
                baseNotes ? baseNotes : ''
            ].filter(Boolean);

            const rowParticulars = particularsParts.join(' • ');

            if (cashOnly && debit === 0 && credit === 0) continue;

            running += debit - credit;
            out.push({
                id: tx.id,
                tdate: tx.tdate,
                particulars: rowParticulars,
                folio: tx.sourceDoc || tx.id,
                debit,
                credit,
                running
            });
        }

        return out;
    }, [cashOnly, fromYmd, openingBalance, rawRows]);

    const totals = useMemo(() => {
        const debitTotal = rowsWithBalance.reduce((acc, r) => acc + (r.debit || 0), 0);
        const creditTotal = rowsWithBalance.reduce((acc, r) => acc + (r.credit || 0), 0);
        const closing = rowsWithBalance.length ? rowsWithBalance[rowsWithBalance.length - 1].running : openingBalance;
        return { debitTotal, creditTotal, closing };
    }, [openingBalance, rowsWithBalance]);

    const balanceSide = (running: number) => (running >= 0 ? 'Dr' : 'Cr');

    const downloadCsv = () => {
        const lines = [
            ['Date', 'Particulars', 'Folio', 'Debit', 'Credit', 'DrCr', 'Balance'].join(','),
            ...rowsWithBalance.map((r) => {
                const side = balanceSide(r.running);
                return [
                    csvEscape(r.tdate),
                    csvEscape(r.particulars),
                    csvEscape(r.folio),
                    csvEscape(r.debit ? formatAmount(r.debit) : ''),
                    csvEscape(r.credit ? formatAmount(r.credit) : ''),
                    csvEscape(side),
                    csvEscape(formatAmount(Math.abs(r.running)))
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wealth-cash-ledger-${accountId || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="card">
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .app-data-table { box-shadow: none !important; }
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                }

                .ledger-print-table {
                    border-collapse: collapse;
                    width: 100%;
                    font-size: 12px;
                }
                .ledger-print-table th,
                .ledger-print-table td {
                    border: 1px solid var(--surface-border, #cbd5e1);
                    padding: 4px 6px;
                    vertical-align: top;
                }
                .ledger-print-table th {
                    background: var(--surface-100, #f8f9fa);
                }
            `}</style>

            <div className="mb-3">
                <h2 className="m-0">Ledger (Khata)</h2>
                <p className="mt-2 mb-0 text-600">
                    Ledger-style cash movements computed from wealth transactions (BUY/SELL/DIVIDEND/EXPENSE) with Cash/SLBM/F&amp;O segments.
                </p>
            </div>

                            {printMode ? (
                <div className="mb-3">
                    <div className="flex align-items-start justify-content-between gap-3 flex-wrap mb-2">
                        <div>
                            <div className="text-900 font-medium">Account of: {accountId ? getAccountLabel(accountId) : 'All'}</div>
                            <div className="text-600 text-sm">
                                Period: {fromYmd ?? '…'} to {toYmdValue ?? '…'} {segment ? `• Segment: ${segment}` : ''} {cashOnly ? '• Cash only' : ''}
                            </div>
                        </div>
                        <div className="text-600 text-sm">
                            Opening: {formatAmount(Math.abs(openingBalance))} {balanceSide(openingBalance)} • Closing: {formatAmount(Math.abs(totals.closing))}{' '}
                            {balanceSide(totals.closing)}
                        </div>
                    </div>

                    <table className="ledger-print-table">
                        <thead>
                            <tr>
                                <th style={{ width: '7rem' }}>Date</th>
                                <th>Particulars</th>
                                <th style={{ width: '9rem' }}>Folio</th>
                                <th style={{ width: '7rem', textAlign: 'right' }}>Debit</th>
                                <th style={{ width: '7rem', textAlign: 'right' }}>Credit</th>
                                <th style={{ width: '4.5rem' }}>Dr/Cr</th>
                                <th style={{ width: '8rem', textAlign: 'right' }}>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowsWithBalance.map((r) => {
                                const side = balanceSide(r.running);
                                return (
                                    <tr key={r.id}>
                                        <td>{r.tdate}</td>
                                        <td>{r.particulars}</td>
                                        <td>{r.folio}</td>
                                        <td style={{ textAlign: 'right' }}>{r.debit ? formatAmount(r.debit) : ''}</td>
                                        <td style={{ textAlign: 'right' }}>{r.credit ? formatAmount(r.credit) : ''}</td>
                                        <td>{side}</td>
                                        <td style={{ textAlign: 'right' }}>{formatAmount(Math.abs(r.running))}</td>
                                    </tr>
                                );
                            })}
                            {!rowsWithBalance.length && (
                                <tr>
                                    <td colSpan={7} className="text-center text-600">
                                        {loading ? 'Loading…' : 'No ledger rows found'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {!printMode ? <div className="grid no-print mb-3">
                <div className="col-12 md:col-4 flex flex-column gap-1">
                    <label className="font-medium">Account</label>
                    <AppDropdown
                        value={accountId}
                        options={accountOptions}
                        onChange={(e) => setAccountId(e.value)}
                        placeholder="Select account"
                        filter
                        showClear
                    />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">From</label>
                    <AppDateInput value={fromDate} onChange={(value) => setFromDate(value)} />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">To</label>
                    <AppDateInput value={toDate} onChange={(value) => setToDate(value)} />
                </div>
                <div className="col-12 md:col-2 flex flex-column gap-1">
                    <label className="font-medium">Segment</label>
                    <AppDropdown value={segment} options={TX_SEGMENTS} onChange={(e) => setSegment(e.value)} />
                </div>

                <div className="col-12 flex align-items-center justify-content-between flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            label="Apply"
                            icon="pi pi-filter"
                            onClick={() =>
                                refetch({
                                    fromDate: toYmdOrNull(fromDate),
                                    toDate: toYmdOrNull(toDate),
                                    accountId: accountId || null,
                                    segment: segment || null,
                                    limit: rowsLimit
                                })
                            }
                        />
                        <Button
                            label="Clear"
                            icon="pi pi-times"
                            className="p-button-text"
                            onClick={() => {
                                setFromDate(null);
                                setToDate(null);
                                setSegment('');
                                setCashOnly(true);
                                refetch({
                                    fromDate: null,
                                    toDate: null,
                                    accountId: accountId || null,
                                    segment: null,
                                    limit: rowsLimit
                                });
                            }}
                        />
                        <Button label="Refresh" icon="pi pi-refresh" className="p-button-secondary" onClick={() => refetch()} />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <Button
                            label={cashOnly ? 'Cash Only' : 'All Types'}
                            icon={cashOnly ? 'pi pi-check-square' : 'pi pi-square'}
                            className="p-button-outlined"
                            onClick={() => setCashOnly((v) => !v)}
                        />
                        <Button label="Export CSV" icon="pi pi-download" className="p-button-outlined" onClick={downloadCsv} disabled={!rowsWithBalance.length} />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="p-button-warning"
                            onClick={() => {
                                setPrintMode(true);
                                setTimeout(() => window.print(), 50);
                            }}
                        />
                    </div>
                </div>
            </div> : null}

            {!printMode && error && <p className="text-red-500 mb-2">Error loading ledger: {error.message}</p>}

            {!printMode ? <div className="mb-2">
                <div className="flex align-items-center justify-content-between flex-wrap gap-2">
                    <div className="text-600 text-sm">
                        Account: <span className="font-medium">{accountId ? getAccountLabel(accountId) : 'All'}</span>
                    </div>
                    <div className="flex gap-3 text-600 text-sm">
                        <span>
                            Opening: {formatAmount(Math.abs(openingBalance))} {balanceSide(openingBalance)}
                        </span>
                        <span>Debit: {formatAmount(totals.debitTotal)}</span>
                        <span>Credit: {formatAmount(totals.creditTotal)}</span>
                        <span className="font-medium">
                            Closing: {formatAmount(Math.abs(totals.closing))} {balanceSide(totals.closing)}
                        </span>
                    </div>
                </div>
                {page?.meta?.hasMore && (
                    <div className="mt-2 p-2 border-round surface-50 border-1 border-yellow-200 text-700">
                        Showing first {page.meta.limit} rows out of {page.meta.total}. Narrow your date range to print/export all rows.
                    </div>
                )}
                {openingData?.transactionsPage?.meta?.hasMore && (
                    <div className="mt-2 p-2 border-round surface-50 border-1 border-yellow-200 text-700">
                        Opening balance is computed from the first {openingData.transactionsPage.meta.limit} rows before {fromYmd}. Narrow your
                        date range (or run export in chunks) if opening looks incomplete.
                    </div>
                )}
            </div> : null}

            {!printMode ? (
                <AppDataTable
                    value={rowsWithBalance}
                    paginator
                    rows={50}
                    rowsPerPageOptions={[50, 100, 250, 500]}
                    dataKey="id"
                    loading={loading}
                    emptyMessage={loading ? 'Loading…' : 'No ledger rows found'}
                    stripedRows
                    size="small"
                >
                    <Column field="tdate" header="Date" style={{ width: '8rem' }} />
                    <Column field="particulars" header="Particulars" />
                    <Column field="folio" header="Folio" style={{ width: '10rem' }} />
                    <Column header="Debit" body={(r: any) => (r.debit ? formatAmount(r.debit) : '')} style={{ textAlign: 'right', width: '8rem' }} />
                    <Column header="Credit" body={(r: any) => (r.credit ? formatAmount(r.credit) : '')} style={{ textAlign: 'right', width: '8rem' }} />
                    <Column header="Dr/Cr" body={(r: any) => balanceSide(Number(r.running || 0))} style={{ width: '5rem' }} />
                    <Column
                        header="Balance"
                        body={(r: any) => formatAmount(Math.abs(Number(r.running || 0)))}
                        style={{ textAlign: 'right', width: '10rem' }}
                    />
                </AppDataTable>
            ) : null}
        </div>
    );
}
