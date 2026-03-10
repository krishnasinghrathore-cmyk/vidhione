'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { toYmdOrNull } from '@/lib/date';
import { parseWealthReportSearchParams } from '../reportSearchParams';
import {
    WEALTH_ACCOUNTS_QUERY,
    WEALTH_INVESTOR_PROFILES_QUERY,
    type WealthDematAccount,
    type WealthInvestorProfile,
    formatAccountLabel,
    formatInvestorProfileLabel
} from '../shared';

type Security = { id: string; isin?: string | null; symbol?: string | null; name: string };

type RealizedRow = {
    securityId: string;
    isin?: string | null;
    symbol?: string | null;
    name?: string | null;
    accountId?: string | null;
    accountName?: string | null;
    investorProfileId?: string | null;
    investorProfileName?: string | null;
    tdate: string;
    qty: string;
    sellPrice: string;
    sellValue: string;
    costBasis: string;
    fees: string;
    realized: string;
};

type RealizedTableRow = RealizedRow & {
    securityLabel: string;
    investorLabel: string;
    accountLabel: string;
};

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
    query RealizedPnlPage($fromDate: String, $toDate: String, $accountId: String, $investorProfileId: String, $securityId: String, $isin: String, $limit: Int, $offset: Int) {
        realizedPnlPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, investorProfileId: $investorProfileId, securityId: $securityId, isin: $isin, limit: $limit, offset: $offset) {
            items {
                securityId
                isin
                symbol
                name
                accountId
                accountName
                investorProfileId
                investorProfileName
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
    const [searchParams] = useSearchParams();
    const initialSearch = useMemo(() => parseWealthReportSearchParams(searchParams), [searchParams]);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);

    const [fromDate, setFromDate] = useState<Date | null>(initialSearch.fromDate);
    const [toDate, setToDate] = useState<Date | null>(initialSearch.toDate);
    const [accountId, setAccountId] = useState<string>(initialSearch.accountId);
    const [investorProfileId, setInvestorProfileId] = useState<string>(initialSearch.investorProfileId);
    const [securityId, setSecurityId] = useState<string>(initialSearch.securityId);

    const { data: accountsData } = useQuery(WEALTH_ACCOUNTS_QUERY, { client: wealthApolloClient });
    const { data: investorProfilesData } = useQuery(WEALTH_INVESTOR_PROFILES_QUERY, { client: wealthApolloClient });
    const { data: securitiesData } = useQuery(SECURITIES_QUERY, { client: wealthApolloClient });

    const accounts: WealthDematAccount[] = accountsData?.accounts ?? [];
    const securities = securitiesData?.securities ?? [];

    const filteredAccounts = useMemo(() => {
        if (!investorProfileId) return accounts;
        return accounts.filter((account) => account.investorProfileId === investorProfileId);
    }, [accounts, investorProfileId]);

    const accountOptions = useMemo(
        () => filteredAccounts.map((account) => ({ label: formatAccountLabel(account), value: account.id })),
        [filteredAccounts]
    );
    const investorProfileOptions = useMemo(
        () => (investorProfilesData?.investorProfiles ?? []).map((profile: WealthInvestorProfile) => ({
            label: formatInvestorProfileLabel(profile),
            value: profile.id
        })),
        [investorProfilesData]
    );
    const securityOptions = useMemo(
        () => (securities ?? []).map((security: Security) => ({ label: security.symbol || security.name, value: security.id })),
        [securities]
    );
    const accountById = useMemo(() => {
        const map: Record<string, WealthDematAccount> = {};
        accounts.forEach((account) => {
            map[account.id] = account;
        });
        return map;
    }, [accounts]);

    useEffect(() => {
        if (!accountId || !investorProfileId) return;
        const selectedAccount = accountById[accountId];
        if (selectedAccount?.investorProfileId !== investorProfileId) {
            setAccountId('');
        }
    }, [accountById, accountId, investorProfileId]);

    const { data, loading, error, refetch } = useQuery(REALIZED_PAGE, {
        client: wealthApolloClient,
        variables: {
            fromDate: isoDate(fromDate),
            toDate: isoDate(toDate),
            accountId: accountId || null,
            investorProfileId: investorProfileId || null,
            securityId: securityId || null,
            isin: null,
            limit: rowsPerPage,
            offset: first
        }
    });

    const rows: RealizedRow[] = data?.realizedPnlPage?.items ?? [];
    const tableRows: RealizedTableRow[] = useMemo(
        () =>
            rows.map((row) => ({
                ...row,
                securityLabel: row.symbol || row.name || row.securityId,
                investorLabel: row.investorProfileName || (row.accountId ? accountById[row.accountId]?.investorProfileName || '-' : '-'),
                accountLabel: row.accountName
                    ? row.accountId && accountById[row.accountId]?.code
                        ? `${row.accountName} (${accountById[row.accountId]?.code})`
                        : row.accountName
                    : row.accountId
                      ? formatAccountLabel(accountById[row.accountId] ?? { id: row.accountId, name: row.accountId })
                      : '-'
            })),
        [accountById, rows]
    );
    const meta = data?.realizedPnlPage?.meta;
    const totalRecords = meta?.total ?? tableRows.length;

    const realizedBody = (row: RealizedTableRow) => {
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
        setInvestorProfileId('');
        setSecurityId('');
        setFirst(0);
        refetch({ fromDate: null, toDate: null, accountId: null, investorProfileId: null, securityId: null, isin: null, limit: rowsPerPage, offset: 0 });
    };

    return (
        <div className="card">
            <div className="mb-3">
                <h2 className="m-0">Realized P&amp;L</h2>
                <p className="mt-2 mb-0 text-600">FIFO-based realized profit and loss from SELL transactions, now visible per investor and demat account.</p>
            </div>

            {error && <p className="text-red-500 mb-3">Error loading realized P&amp;L: {error.message}</p>}

            <AppDataTable
                value={tableRows}
                paginator
                rows={rowsPerPage}
                first={first}
                totalRecords={totalRecords}
                lazy
                loading={loading}
                dataKey="tdate"
                exportFileName="wealth-realized-pnl"
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    refetch({
                        fromDate: isoDate(fromDate),
                        toDate: isoDate(toDate),
                        accountId: accountId || null,
                        investorProfileId: investorProfileId || null,
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
                            <label className="text-600 text-sm">Investor</label>
                            <AppDropdown value={investorProfileId} options={investorProfileOptions} onChange={(e) => setInvestorProfileId(e.value ?? '')} placeholder="All" showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Account</label>
                            <AppDropdown value={accountId} options={accountOptions} onChange={(e) => setAccountId(e.value ?? '')} placeholder="All" showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Security</label>
                            <AppDropdown value={securityId} options={securityOptions} onChange={(e) => setSecurityId(e.value ?? '')} placeholder="All" filter showClear />
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
                                    investorProfileId: investorProfileId || null,
                                    securityId: securityId || null,
                                    isin: null,
                                    limit: rowsPerPage,
                                    offset: 0
                                });
                            }}
                        />
                        <Button label="Clear" icon="pi pi-times" className="p-button-text" onClick={clearFilters} />
                        <Button label="Export" icon="pi pi-download" />
                        <Button label="Refresh" icon="pi pi-refresh" className="p-button-secondary" onClick={() => refetch()} />
                    </>
                }
                recordSummary={meta ? `Showing ${tableRows.length} of ${meta.total}` : undefined}
                emptyMessage="No realized P&L rows found"
                stripedRows
                size="small"
            >
                <Column field="tdate" header="Date" style={{ width: '8rem' }} />
                <Column field="securityLabel" header="Security" />
                <Column field="investorLabel" header="Investor" />
                <Column field="accountLabel" header="Account" />
                <Column field="qty" header="Qty" body={(row: RealizedTableRow) => formatNumber(row.qty, 2)} style={{ textAlign: 'right' }} />
                <Column field="sellPrice" header="Sell Price" body={(row: RealizedTableRow) => formatNumber(row.sellPrice, 2)} style={{ textAlign: 'right' }} />
                <Column field="sellValue" header="Sell Value" body={(row: RealizedTableRow) => formatNumber(row.sellValue, 2)} style={{ textAlign: 'right' }} />
                <Column field="costBasis" header="Cost Basis" body={(row: RealizedTableRow) => formatNumber(row.costBasis, 2)} style={{ textAlign: 'right' }} />
                <Column field="fees" header="Fees" body={(row: RealizedTableRow) => formatNumber(row.fees, 2)} style={{ textAlign: 'right' }} />
                <Column field="realized" header="Realized" body={realizedBody} style={{ textAlign: 'right' }} />
            </AppDataTable>
        </div>
    );
}
