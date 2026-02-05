'use client';
import React, { useMemo, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
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

const HOLDINGS_PAGE = gql`
    query HoldingsPage($asOfDate: String, $accountId: String, $securityId: String, $isin: String, $limit: Int, $offset: Int) {
        holdingsPage(asOfDate: $asOfDate, accountId: $accountId, securityId: $securityId, isin: $isin, limit: $limit, offset: $offset) {
            items {
                securityId
                isin
                symbol
                name
                qty
                avgCost
                buyValue
                cmp
                currentValue
                totalPnl
                changePct
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

export default function WealthHoldingsPage() {
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);

    const [asOfDate, setAsOfDate] = useState<Date | null>(null);
    const [accountId, setAccountId] = useState<string>('');
    const [securityId, setSecurityId] = useState<string>('');
    const [isin, setIsin] = useState<string>('');

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

    const { data, loading, error, refetch } = useQuery(HOLDINGS_PAGE, {
        client: wealthApolloClient,
        variables: {
            asOfDate: isoDate(asOfDate),
            accountId: accountId || null,
            securityId: securityId || null,
            isin: isin.trim() || null,
            limit: rowsPerPage,
            offset: first
        }
    });

    const rows = data?.holdingsPage?.items ?? [];
    const meta = data?.holdingsPage?.meta;
    const totalRecords = meta?.total ?? rows.length;

    const pnlBody = (row: any) => {
        const value = row.totalPnl;
        const num = Number(value);
        const formatted = formatNumber(value, 2);
        if (!Number.isFinite(num)) return formatted || '';
        const className = num >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium';
        return <span className={className}>{formatted}</span>;
    };

    const changePctBody = (row: any) => {
        const value = row.changePct;
        const num = Number(value);
        const formatted = value == null ? '' : `${formatNumber(value, 2)}%`;
        if (!Number.isFinite(num)) return formatted;
        const className = num >= 0 ? 'text-green-600' : 'text-red-500';
        return <span className={className}>{formatted}</span>;
    };

    const clearFilters = () => {
        setAsOfDate(null);
        setAccountId('');
        setSecurityId('');
        setIsin('');
        setFirst(0);
        refetch({ asOfDate: null, accountId: null, securityId: null, isin: null, limit: rowsPerPage, offset: 0 });
    };

    return (
        <div className="card">
            <div className="mb-3">
                <h2 className="m-0">Holdings</h2>
                <p className="mt-2 mb-0 text-600">Portfolio snapshot computed from transactions, corporate actions, and latest prices.</p>
            </div>

            {error && <p className="text-red-500 mb-3">Error loading holdings: {error.message}</p>}

            <AppDataTable
                value={rows}
                paginator
                rows={rowsPerPage}
                first={first}
                totalRecords={totalRecords}
                lazy
                loading={loading}
                dataKey="securityId"
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    refetch({
                        asOfDate: isoDate(asOfDate),
                        accountId: accountId || null,
                        securityId: securityId || null,
                        isin: isin.trim() || null,
                        limit: e.rows,
                        offset: e.first
                    });
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                headerLeft={
                    <>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">As of</label>
                            <AppDateInput value={asOfDate} onChange={(value) => setAsOfDate(value)} style={{ width: '140px' }} />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Account</label>
                            <AppDropdown value={accountId} options={accountOptions} onChange={(e) => setAccountId(e.value)} placeholder="All" showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Security</label>
                            <AppDropdown value={securityId} options={securityOptions} onChange={(e) => setSecurityId(e.value)} placeholder="All" filter showClear />
                        </span>
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText value={isin} onChange={(e) => setIsin(e.target.value)} placeholder="ISIN contains…" />
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
                                    asOfDate: isoDate(asOfDate),
                                    accountId: accountId || null,
                                    securityId: securityId || null,
                                    isin: isin.trim() || null,
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
                emptyMessage="No holdings found"
                stripedRows
                size="small"
            >
                <Column field="symbol" header="Symbol" body={(r: any) => r.symbol || r.name || r.isin || r.securityId} />
                <Column field="isin" header="ISIN" />
                <Column field="qty" header="Qty" body={(r: any) => formatNumber(r.qty, 2)} style={{ textAlign: 'right' }} />
                <Column field="avgCost" header="Avg Cost" body={(r: any) => formatNumber(r.avgCost, 2)} style={{ textAlign: 'right' }} />
                <Column field="buyValue" header="Buy Value" body={(r: any) => formatNumber(r.buyValue, 2)} style={{ textAlign: 'right' }} />
                <Column field="cmp" header="CMP" body={(r: any) => (r.cmp ? formatNumber(r.cmp, 2) : '-')} style={{ textAlign: 'right' }} />
                <Column field="currentValue" header="Current Value" body={(r: any) => (r.currentValue ? formatNumber(r.currentValue, 2) : '-')} style={{ textAlign: 'right' }} />
                <Column header="Total P&L" body={pnlBody} style={{ textAlign: 'right' }} />
                <Column header="Change %" body={changePctBody} style={{ textAlign: 'right' }} />
            </AppDataTable>
        </div>
    );
}
