'use client';
import React, { useMemo, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
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

const REALIZED_PAGE = gql`
    query RealizedPnlPage($fromDate: String, $toDate: String, $accountId: String, $securityId: String, $isin: String, $limit: Int, $offset: Int) {
        realizedPnlPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, securityId: $securityId, isin: $isin, limit: $limit, offset: $offset) {
            items {
                securityId
                isin
                symbol
                name
                accountId
                accountName
                tdate
                qty
                sellPrice
                sellValue
                costBasis
                fees
                realized
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

export default function WealthRealizedPnlPage() {
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);

    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [accountId, setAccountId] = useState<string>('');
    const [securityId, setSecurityId] = useState<string>('');

    const { data: accountsData } = useQuery(ACCOUNTS_QUERY, { client: wealthApolloClient });
    const { data: securitiesData } = useQuery(SECURITIES_QUERY, { client: wealthApolloClient });

    const accountOptions = useMemo(
        () => (accountsData?.accounts ?? []).map((a: Account) => ({ label: a.code ? `${a.name} (${a.code})` : a.name, value: a.id })),
        [accountsData]
    );
    const securityOptions = useMemo(
        () => (securitiesData?.securities ?? []).map((s: Security) => ({ label: s.symbol || s.name, value: s.id })),
        [securitiesData]
    );

    const { data, loading, error, refetch } = useQuery(REALIZED_PAGE, {
        client: wealthApolloClient,
        variables: {
            fromDate: isoDate(fromDate),
            toDate: isoDate(toDate),
            accountId: accountId || null,
            securityId: securityId || null,
            isin: null,
            limit: rowsPerPage,
            offset: first
        }
    });

    const rows = data?.realizedPnlPage?.items ?? [];
    const meta = data?.realizedPnlPage?.meta;
    const totalRecords = meta?.total ?? rows.length;

    const realizedBody = (row: any) => {
        const value = row.realized;
        const num = Number(value);
        const formatted = formatNumber(value, 2);
        if (!Number.isFinite(num)) return formatted || '';
        const className = num >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium';
        return <span className={className}>{formatted}</span>;
    };

    const clearFilters = () => {
        setFromDate(null);
        setToDate(null);
        setAccountId('');
        setSecurityId('');
        setFirst(0);
        refetch({ fromDate: null, toDate: null, accountId: null, securityId: null, isin: null, limit: rowsPerPage, offset: 0 });
    };

    return (
        <div className="card">
            <div className="mb-3">
                <h2 className="m-0">Realized P&amp;L</h2>
                <p className="mt-2 mb-0 text-600">FIFO-ish realized profit/loss from SELL transactions (after fees), adjusted for corporate actions.</p>
            </div>

            {error && <p className="text-red-500 mb-3">Error loading realized P&amp;L: {error.message}</p>}

            <AppDataTable
                value={rows}
                paginator
                rows={rowsPerPage}
                first={first}
                totalRecords={totalRecords}
                lazy
                loading={loading}
                dataKey="tdate"
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    refetch({
                        fromDate: isoDate(fromDate),
                        toDate: isoDate(toDate),
                        accountId: accountId || null,
                        securityId: securityId || null,
                        isin: null,
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
                                    accountId: accountId || null,
                                    securityId: securityId || null,
                                    isin: null,
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
                emptyMessage="No realized P&L rows found"
                stripedRows
                size="small"
            >
                <Column field="tdate" header="Date" style={{ width: '8rem' }} />
                <Column field="symbol" header="Security" body={(r: any) => r.symbol || r.name || r.securityId} />
                <Column field="accountName" header="Account" body={(r: any) => r.accountName || r.accountId || '-'} />
                <Column field="qty" header="Qty" body={(r: any) => formatNumber(r.qty, 2)} style={{ textAlign: 'right' }} />
                <Column field="sellPrice" header="Sell Price" body={(r: any) => formatNumber(r.sellPrice, 2)} style={{ textAlign: 'right' }} />
                <Column field="sellValue" header="Sell Value" body={(r: any) => formatNumber(r.sellValue, 2)} style={{ textAlign: 'right' }} />
                <Column field="costBasis" header="Cost Basis" body={(r: any) => formatNumber(r.costBasis, 2)} style={{ textAlign: 'right' }} />
                <Column field="fees" header="Fees" body={(r: any) => formatNumber(r.fees, 2)} style={{ textAlign: 'right' }} />
                <Column header="Realized" body={realizedBody} style={{ textAlign: 'right' }} />
            </AppDataTable>
        </div>
    );
}
