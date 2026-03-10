'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { toYmdOrNull } from '@/lib/date';
import {
    WEALTH_ACCOUNTS_QUERY,
    WEALTH_INVESTOR_PROFILES_QUERY,
    type WealthDematAccount,
    type WealthInvestorProfile,
    formatAccountLabel,
    formatInvestorProfileLabel
} from '../shared';
import { parseWealthReportSearchParams, type WealthHoldingScope } from '../reportSearchParams';

type Security = { id: string; isin?: string | null; symbol?: string | null; name: string };
type HoldingScope = WealthHoldingScope;

type HoldingsRow = {
    rowKey: string;
    scope: HoldingScope;
    securityId: string;
    isin?: string | null;
    symbol?: string | null;
    name?: string | null;
    accountId?: string | null;
    accountName?: string | null;
    accountCode?: string | null;
    investorProfileId?: string | null;
    investorProfileName?: string | null;
    qty: string;
    avgCost: string;
    buyValue: string;
    cmp?: string | null;
    cmpDate?: string | null;
    currentValue?: string | null;
    totalPnl?: string | null;
    changePct?: string | null;
};

type HoldingsTableRow = HoldingsRow & {
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

const HOLDINGS_PAGE = gql`
    query HoldingsPage($asOfDate: String, $accountId: String, $investorProfileId: String, $securityId: String, $isin: String, $scope: String, $limit: Int, $offset: Int) {
        holdingsPage(asOfDate: $asOfDate, accountId: $accountId, investorProfileId: $investorProfileId, securityId: $securityId, isin: $isin, scope: $scope, limit: $limit, offset: $offset) {
            items {
                rowKey
                scope
                securityId
                isin
                symbol
                name
                accountId
                accountName
                accountCode
                investorProfileId
                investorProfileName
                qty
                avgCost
                buyValue
                cmp
                cmpDate
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

const HOLDING_SCOPE_OPTIONS = [
    { label: 'Household', value: 'HOUSEHOLD' },
    { label: 'Investor', value: 'INVESTOR' },
    { label: 'Demat Account', value: 'ACCOUNT' }
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

export default function WealthHoldingsPage() {
    const [searchParams] = useSearchParams();
    const initialSearch = useMemo(() => parseWealthReportSearchParams(searchParams), [searchParams]);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);

    const [asOfDate, setAsOfDate] = useState<Date | null>(initialSearch.asOfDate);
    const [scope, setScope] = useState<HoldingScope>(initialSearch.scope);
    const [accountId, setAccountId] = useState<string>(initialSearch.accountId);
    const [investorProfileId, setInvestorProfileId] = useState<string>(initialSearch.investorProfileId);
    const [securityId, setSecurityId] = useState<string>(initialSearch.securityId);
    const [isin, setIsin] = useState<string>('');

    const { data: accountsData } = useQuery(WEALTH_ACCOUNTS_QUERY, { client: wealthApolloClient });
    const { data: investorProfilesData } = useQuery(WEALTH_INVESTOR_PROFILES_QUERY, { client: wealthApolloClient });
    const { data: securitiesData } = useQuery(SECURITIES_QUERY, { client: wealthApolloClient });

    const accounts: WealthDematAccount[] = accountsData?.accounts ?? [];
    const filteredAccounts = useMemo(() => {
        if (!investorProfileId) return accounts;
        return accounts.filter((account) => account.investorProfileId === investorProfileId);
    }, [accounts, investorProfileId]);
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
        () => (securitiesData?.securities ?? []).map((security: Security) => ({ label: security.symbol || security.name, value: security.id })),
        [securitiesData]
    );

    const buildVariables = (nextRows = rowsPerPage, nextOffset = first) => ({
        asOfDate: isoDate(asOfDate),
        scope,
        accountId: accountId || null,
        investorProfileId: investorProfileId || null,
        securityId: securityId || null,
        isin: isin.trim() || null,
        limit: nextRows,
        offset: nextOffset
    });

    const { data, loading, error, refetch } = useQuery(HOLDINGS_PAGE, {
        client: wealthApolloClient,
        variables: buildVariables()
    });

    const rows: HoldingsRow[] = data?.holdingsPage?.items ?? [];
    const tableRows: HoldingsTableRow[] = useMemo(
        () =>
            rows.map((row) => ({
                ...row,
                securityLabel: row.symbol || row.name || row.isin || row.securityId,
                investorLabel: row.investorProfileName || 'Unassigned',
                accountLabel: row.accountCode ? `${row.accountName} (${row.accountCode})` : row.accountName || row.accountId || '-'
            })),
        [rows]
    );
    const meta = data?.holdingsPage?.meta;
    const totalRecords = meta?.total ?? tableRows.length;
    const showInvestorColumn = scope !== 'HOUSEHOLD';
    const showAccountColumn = scope === 'ACCOUNT';

    const pnlBody = (row: HoldingsTableRow) => {
        const value = row.totalPnl;
        const num = Number(value);
        const formatted = formatNumber(value, 2);
        if (!Number.isFinite(num)) return formatted || '';
        const className = num >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium';
        return <span className={className}>{formatted}</span>;
    };

    const changePctBody = (row: HoldingsTableRow) => {
        const value = row.changePct;
        const num = Number(value);
        const formatted = value == null ? '' : `${formatNumber(value, 2)}%`;
        if (!Number.isFinite(num)) return formatted;
        const className = num >= 0 ? 'text-green-600' : 'text-red-500';
        return <span className={className}>{formatted}</span>;
    };

    const clearFilters = () => {
        setAsOfDate(null);
        setScope('HOUSEHOLD');
        setAccountId('');
        setInvestorProfileId('');
        setSecurityId('');
        setIsin('');
        setFirst(0);
        refetch({
            asOfDate: null,
            scope: 'HOUSEHOLD',
            accountId: null,
            investorProfileId: null,
            securityId: null,
            isin: null,
            limit: rowsPerPage,
            offset: 0
        });
    };

    return (
        <div className="card">
            <div className="mb-3">
                <h2 className="m-0">Holdings</h2>
                <p className="mt-2 mb-0 text-600">
                    Portfolio snapshot computed from transactions, corporate actions, and the latest available close price up to the selected as-of date.
                </p>
            </div>

            {error && <p className="text-red-500 mb-3">Error loading holdings: {error.message}</p>}

            <AppDataTable
                value={tableRows}
                paginator
                rows={rowsPerPage}
                first={first}
                totalRecords={totalRecords}
                lazy
                loading={loading}
                dataKey="rowKey"
                exportFileName={`wealth-holdings-${scope.toLowerCase()}`}
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    refetch(buildVariables(e.rows, e.first));
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                headerLeft={
                    <>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">As of</label>
                            <AppDateInput value={asOfDate} onChange={(value) => setAsOfDate(value)} style={{ width: '140px' }} />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Scope</label>
                            <AppDropdown value={scope} options={HOLDING_SCOPE_OPTIONS} onChange={(e) => setScope(e.value as HoldingScope)} style={{ minWidth: '11rem' }} />
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
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText value={isin} onChange={(e) => setIsin(e.target.value)} placeholder="ISIN contains..." />
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
                                refetch(buildVariables(rowsPerPage, 0));
                            }}
                        />
                        <Button label="Clear" icon="pi pi-times" className="p-button-text" onClick={clearFilters} />
                        <Button label="Export" icon="pi pi-download" />
                        <Button label="Refresh" icon="pi pi-refresh" className="p-button-secondary" onClick={() => refetch(buildVariables())} />
                    </>
                }
                recordSummary={meta ? `Showing ${tableRows.length} of ${meta.total}` : undefined}
                emptyMessage="No holdings found"
                stripedRows
                size="small"
            >
                {showInvestorColumn && <Column field="investorLabel" header="Investor" />}
                {showAccountColumn && <Column field="accountLabel" header="Demat Account" />}
                <Column field="securityLabel" header="Security" body={(row: HoldingsTableRow) => row.securityLabel} />
                <Column field="isin" header="ISIN" />
                <Column field="qty" header="Qty" body={(row: HoldingsTableRow) => formatNumber(row.qty, 2)} style={{ textAlign: 'right' }} />
                <Column field="avgCost" header="Avg Cost" body={(row: HoldingsTableRow) => formatNumber(row.avgCost, 2)} style={{ textAlign: 'right' }} />
                <Column field="buyValue" header="Buy Value" body={(row: HoldingsTableRow) => formatNumber(row.buyValue, 2)} style={{ textAlign: 'right' }} />
                <Column field="cmp" header="CMP" body={(row: HoldingsTableRow) => (row.cmp ? formatNumber(row.cmp, 2) : '-')} style={{ textAlign: 'right' }} />
                <Column field="cmpDate" header="Price Date" body={(row: HoldingsTableRow) => row.cmpDate || '-'} style={{ width: '8rem' }} />
                <Column field="currentValue" header="Current Value" body={(row: HoldingsTableRow) => (row.currentValue ? formatNumber(row.currentValue, 2) : '-')} style={{ textAlign: 'right' }} />
                <Column field="totalPnl" header="Total P&L" body={pnlBody} style={{ textAlign: 'right' }} />
                <Column field="changePct" header="Change %" body={changePctBody} style={{ textAlign: 'right' }} />
            </AppDataTable>
        </div>
    );
}
