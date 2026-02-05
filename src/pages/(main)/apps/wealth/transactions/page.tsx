'use client';
import React, { useMemo, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { extractWealthSegment, stripWealthMetaTags } from '@/lib/wealthNotes';
import { toYmdOrNull } from '@/lib/date';

type Account = { id: string; name: string; code?: string | null };
type Security = { id: string; isin?: string | null; symbol?: string | null; name: string };

const ACCOUNTS_QUERY = gql`
    query Accounts {
        accounts {
            id
            name
            code
        }
    }
`;

const SECURITIES_QUERY = gql`
    query Securities {
        securities {
            id
            isin
            symbol
            name
        }
    }
`;

const TRANSACTIONS_PAGE = gql`
    query TransactionsPage($fromDate: String, $toDate: String, $ttype: String, $segment: String, $securityId: String, $accountId: String, $limit: Int, $offset: Int) {
        transactionsPage(fromDate: $fromDate, toDate: $toDate, ttype: $ttype, segment: $segment, securityId: $securityId, accountId: $accountId, limit: $limit, offset: $offset) {
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
                accountId
                securityId
                isin
                symbol
                name
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

const TX_TYPES = [
    { label: 'BUY', value: 'BUY' },
    { label: 'SELL', value: 'SELL' },
    { label: 'DIVIDEND', value: 'DIVIDEND' },
    { label: 'SPLIT', value: 'SPLIT' },
    { label: 'BONUS', value: 'BONUS' },
    { label: 'RIGHTS', value: 'RIGHTS' },
    { label: 'EXPENSE', value: 'EXPENSE' }
];

const TX_SEGMENTS = [
    { label: 'Cash', value: 'CASH' },
    { label: 'SLBM', value: 'SLBM' },
    { label: 'F&O', value: 'FAO' }
];

const isoDate = (value: Date | null) => toYmdOrNull(value);

const formatNumber = (value: string | null | undefined, digits = 2) => {
    if (value == null || value === '') return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(num);
};

export default function WealthTransactionsPage() {
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);

    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [accountId, setAccountId] = useState<string>('');
    const [securityId, setSecurityId] = useState<string>('');
    const [ttype, setTtype] = useState<string>('');
    const [segment, setSegment] = useState<string>('');

    const { data: accountsData } = useQuery(ACCOUNTS_QUERY, { client: wealthApolloClient });
    const { data: securitiesData } = useQuery(SECURITIES_QUERY, { client: wealthApolloClient });

    const accounts = accountsData?.accounts ?? [];
    const securities = securitiesData?.securities ?? [];

    const accountOptions = useMemo(
        () => accounts.map((a: Account) => ({ label: a.code ? `${a.name} (${a.code})` : a.name, value: a.id })),
        [accounts]
    );
    const securityOptions = useMemo(
        () => securities.map((s: Security) => ({ label: s.symbol || s.name, value: s.id })),
        [securities]
    );
    const accountById = useMemo(() => {
        const map: Record<string, Account> = {};
        accounts.forEach((a: Account) => {
            map[a.id] = a;
        });
        return map;
    }, [accounts]);

    const { data, loading, error, refetch } = useQuery(TRANSACTIONS_PAGE, {
        client: wealthApolloClient,
        variables: {
            fromDate: isoDate(fromDate),
            toDate: isoDate(toDate),
            ttype: ttype || null,
            segment: segment || null,
            accountId: accountId || null,
            securityId: securityId || null,
            limit: rowsPerPage,
            offset: first
        }
    });

    const rows = data?.transactionsPage?.items ?? [];
    const meta = data?.transactionsPage?.meta;
    const totalRecords = meta?.total ?? rows.length;

    const segmentBody = (row: any) => {
        const seg = row.segment || extractWealthSegment(row.notes) || 'CASH';
        const severity = seg === 'CASH' ? 'info' : 'warning';
        return <Tag value={seg} severity={severity} />;
    };

    const accountBody = (row: any) => {
        if (!row.accountId) return '-';
        const account = accountById[row.accountId];
        if (!account) return row.accountId;
        return account.code ? `${account.name} (${account.code})` : account.name;
    };

    const notesBody = (row: any) => {
        const text = stripWealthMetaTags(row.notes ?? '');
        if (!text) return '';
        if (text.length <= 60) return text;
        return `${text.slice(0, 60)}…`;
    };

    const clearFilters = () => {
        setFromDate(null);
        setToDate(null);
        setAccountId('');
        setSecurityId('');
        setTtype('');
        setSegment('');
        setFirst(0);
        refetch({
            fromDate: null,
            toDate: null,
            ttype: null,
            segment: null,
            accountId: null,
            securityId: null,
            limit: rowsPerPage,
            offset: 0
        });
    };

    return (
        <div className="card">
            <div className="mb-3">
                <h2 className="m-0">Transactions</h2>
                <p className="mt-2 mb-0 text-600">Raw ledger entries (BUY/SELL/DIVIDEND/etc.), including Cash/SLBM/F&amp;O segments.</p>
            </div>

            {error && <p className="text-red-500 mb-3">Error loading transactions: {error.message}</p>}

            <AppDataTable
                value={rows}
                paginator
                rows={rowsPerPage}
                first={first}
                totalRecords={totalRecords}
                lazy
                loading={loading}
                dataKey="id"
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    refetch({
                        fromDate: isoDate(fromDate),
                        toDate: isoDate(toDate),
                        ttype: ttype || null,
                        segment: segment || null,
                        accountId: accountId || null,
                        securityId: securityId || null,
                        limit: e.rows,
                        offset: e.first
                    });
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                headerLeft={
                    <>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">From</label>
                            <AppDateInput value={fromDate} onChange={(value) => setFromDate(value)} style={{ width: '140px' }} />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">To</label>
                            <AppDateInput value={toDate} onChange={(value) => setToDate(value)} style={{ width: '140px' }} />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Account</label>
                            <AppDropdown value={accountId} options={accountOptions} onChange={(e) => setAccountId(e.value)} placeholder="All" showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Security</label>
                            <AppDropdown value={securityId} options={securityOptions} onChange={(e) => setSecurityId(e.value)} placeholder="All" filter showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Type</label>
                            <AppDropdown value={ttype} options={TX_TYPES} onChange={(e) => setTtype(e.value)} placeholder="All" showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Segment</label>
                            <AppDropdown value={segment} options={TX_SEGMENTS} onChange={(e) => setSegment(e.value)} placeholder="All" showClear />
                        </span>
                    </>
                }
                headerRight={
                    <>
                        <Button
                            label="Apply"
                            icon="pi pi-filter"
                            onClick={() => {
                                setFirst(0);
                                refetch({
                                    fromDate: isoDate(fromDate),
                                    toDate: isoDate(toDate),
                                    ttype: ttype || null,
                                    segment: segment || null,
                                    accountId: accountId || null,
                                    securityId: securityId || null,
                                    limit: rowsPerPage,
                                    offset: 0
                                });
                            }}
                        />
                        <Button label="Clear" icon="pi pi-times" className="p-button-text" onClick={clearFilters} />
                        <Button label="Refresh" icon="pi pi-refresh" className="p-button-secondary" onClick={() => refetch()} />
                    </>
                }
                recordSummary={meta ? `Showing ${rows.length} of ${meta.total}` : undefined}
                emptyMessage="No transactions found"
                stripedRows
                size="small"
            >
                <Column field="tdate" header="Date" style={{ width: '8rem' }} />
                <Column field="invoiceDate" header="Inv Date" style={{ width: '8rem' }} />
                <Column field="ttype" header="Type" style={{ width: '7rem' }} />
                <Column header="Seg" body={segmentBody} style={{ width: '6rem' }} />
                <Column field="symbol" header="Security" body={(r: any) => r.symbol || r.name || r.isin || r.securityId || '-'} />
                <Column field="accountId" header="Account" body={accountBody} />
                <Column field="qty" header="Qty" body={(r: any) => formatNumber(r.qty, 2)} style={{ textAlign: 'right' }} />
                <Column field="price" header="Price" body={(r: any) => formatNumber(r.price, 2)} style={{ textAlign: 'right' }} />
                <Column field="fees" header="Fees" body={(r: any) => formatNumber(r.fees, 2)} style={{ textAlign: 'right' }} />
                <Column field="sourceDoc" header="Source Doc" body={(r: any) => r.sourceDoc || ''} />
                <Column field="notes" header="Notes" body={notesBody} />
            </AppDataTable>
        </div>
    );
}
