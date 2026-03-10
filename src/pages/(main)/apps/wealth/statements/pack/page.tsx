'use client';

import React, { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { useAuth } from '@/lib/auth/context';
import { toYmdOrNull } from '@/lib/date';
import {
    buildWealthReportSearchParams,
    parseWealthReportSearchParams,
    resolveWealthHoldingScope,
    type WealthHoldingScope
} from '../../reportSearchParams';

const PACK_QUERY = gql`
    query WealthStatementPack(
        $asOfDate: String
        $fromDate: String
        $toDate: String
        $accountId: String
        $investorProfileId: String
        $scope: String
    ) {
        accounts {
            id
            name
            code
            investorProfileId
            investorProfileName
            brokerName
            depository
        }
        investorProfiles {
            id
            name
            relationship
            pan
            email
            phone
        }
        holdingsPage(asOfDate: $asOfDate, accountId: $accountId, investorProfileId: $investorProfileId, scope: $scope, limit: 12, offset: 0) {
            items {
                rowKey
                symbol
                name
                qty
                cmp
                cmpDate
                currentValue
                totalPnl
                accountName
                accountCode
                investorProfileName
            }
            meta { total }
        }
        realizedPnlPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, investorProfileId: $investorProfileId, limit: 10, offset: 0) {
            items {
                tdate
                symbol
                name
                qty
                realized
                accountName
                investorProfileName
            }
            meta { total }
        }
        dividendRows: transactionsPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, investorProfileId: $investorProfileId, ttype: "DIVIDEND", limit: 10, offset: 0) {
            items {
                id
                tdate
                qty
                price
                fees
                symbol
                name
                accountName
                accountCode
                investorProfileName
            }
            meta { total }
        }
        activityRows: transactionsPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, investorProfileId: $investorProfileId, limit: 12, offset: 0) {
            items {
                id
                tdate
                ttype
                segment
                qty
                price
                sourceDoc
                symbol
                name
                accountName
                accountCode
                investorProfileName
            }
            meta { total }
        }
    }
`;

const scopeLabels: Record<WealthHoldingScope, string> = {
    HOUSEHOLD: 'Household',
    INVESTOR: 'Investor',
    ACCOUNT: 'Demat Account'
};

const amountFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

const toNumber = (value?: string | number | null) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatAmount = (value?: string | number | null) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? amountFormatter.format(numeric) : '-';
};

const formatSignedAmount = (value?: string | number | null) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return '-';
    const formatted = amountFormatter.format(numeric);
    return numeric > 0 ? `+${formatted}` : formatted;
};

const formatQuantity = (value?: string | number | null) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? quantityFormatter.format(numeric) : '-';
};

const formatYmd = (value?: string | null) => {
    if (!value) return '-';
    const dt = new Date(`${value}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? value : dateFormatter.format(dt);
};

const formatDate = (value: Date | null, empty = 'Not set') => (value ? dateFormatter.format(value) : empty);
const formatAccount = (name?: string | null, code?: string | null) => (code ? `${name || '-'} (${code})` : name || '-');
const byDateDesc = <T extends { tdate?: string | null }>(left: T, right: T) => String(right.tdate ?? '').localeCompare(String(left.tdate ?? ''));

export default function WealthStatementPackPage() {
    const navigate = useNavigate();
    const { companyContext, user } = useAuth();
    const [searchParams] = useSearchParams();
    const filters = useMemo(() => parseWealthReportSearchParams(searchParams), [searchParams]);
    const scope = resolveWealthHoldingScope(filters);
    const asOfDate = filters.asOfDate ?? new Date();

    const { data, loading, error } = useQuery(PACK_QUERY, {
        client: wealthApolloClient,
        variables: {
            asOfDate: toYmdOrNull(asOfDate),
            fromDate: toYmdOrNull(filters.fromDate),
            toDate: toYmdOrNull(filters.toDate),
            accountId: filters.accountId || null,
            investorProfileId: filters.investorProfileId || null,
            scope
        }
    });

    const accounts = data?.accounts ?? [];
    const investorProfiles = data?.investorProfiles ?? [];
    const holdings = data?.holdingsPage?.items ?? [];
    const realizedRows = useMemo(() => [...(data?.realizedPnlPage?.items ?? [])].sort(byDateDesc), [data?.realizedPnlPage?.items]);
    const dividendRows = useMemo(() => [...(data?.dividendRows?.items ?? [])].sort(byDateDesc), [data?.dividendRows?.items]);
    const activityRows = useMemo(() => [...(data?.activityRows?.items ?? [])].sort(byDateDesc), [data?.activityRows?.items]);

    const accountById = useMemo(() => Object.fromEntries(accounts.map((account: any) => [account.id, account])), [accounts]);
    const investorById = useMemo(() => Object.fromEntries(investorProfiles.map((profile: any) => [profile.id, profile])), [investorProfiles]);
    const selectedAccount = filters.accountId ? accountById[filters.accountId] ?? null : null;
    const selectedInvestor = filters.investorProfileId ? investorById[filters.investorProfileId] ?? null : null;

    const scopedAccounts = selectedAccount
        ? [selectedAccount]
        : filters.investorProfileId
          ? accounts.filter((account: any) => account.investorProfileId === filters.investorProfileId)
          : accounts;
    const scopedInvestors = selectedAccount?.investorProfileId
        ? investorById[selectedAccount.investorProfileId]
            ? [investorById[selectedAccount.investorProfileId]]
            : []
        : selectedInvestor
          ? [selectedInvestor]
          : investorProfiles;

    const holdingsTotal = data?.holdingsPage?.meta?.total ?? holdings.length;
    const realizedTotalRows = data?.realizedPnlPage?.meta?.total ?? realizedRows.length;
    const dividendTotalRows = data?.dividendRows?.meta?.total ?? dividendRows.length;
    const activityTotalRows = data?.activityRows?.meta?.total ?? activityRows.length;
    const marketValue = holdings.reduce((sum: number, row: any) => sum + toNumber(row.currentValue), 0);
    const unrealizedPnl = holdings.reduce((sum: number, row: any) => sum + toNumber(row.totalPnl), 0);
    const realizedTotal = realizedRows.reduce((sum: number, row: any) => sum + toNumber(row.realized), 0);
    const dividendNet = dividendRows.reduce((sum: number, row: any) => sum + toNumber(row.qty) * toNumber(row.price) - toNumber(row.fees), 0);
    const scopeValue = selectedAccount
        ? formatAccount(selectedAccount.name, selectedAccount.code)
        : selectedInvestor
          ? `${selectedInvestor.name}${selectedInvestor.relationship ? ` (${selectedInvestor.relationship})` : ''}`
          : 'All investors and demat accounts';
    const search = buildWealthReportSearchParams({
        asOfDate,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        investorProfileId: filters.investorProfileId,
        accountId: filters.accountId,
        scope
    }).toString();
    const openReport = (pathname: string) => navigate({ pathname, search: search ? `?${search}` : '' });
    const reportOwnerName = companyContext?.companyName || 'Current tenant';
    const generatedLabel = dateFormatter.format(new Date());
    const preparedBy = user?.email || 'Current operator';

    return (
        <div className="grid">
            <style>{`
                @media print {
                    .wealth-pack-print-hidden { display: none !important; }
                    .wealth-pack-break-avoid { break-inside: avoid; }
                    .layout-topbar, .layout-sidebar, .layout-config-button, .layout-rightmenu-button, .layout-footer { display: none !important; }
                }
            `}</style>

            <div className="col-12">
                <div className="card wealth-pack-break-avoid" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.10) 0%, rgba(15, 23, 42, 0.03) 100%)' }}>
                    <div className="flex flex-column xl:flex-row xl:align-items-center xl:justify-content-between gap-4">
                        <div className="xl:w-8">
                            <div className="text-sm font-medium text-primary mb-2">Wealth Statement Pack</div>
                            <h2 className="m-0">Printable household wealth summary</h2>
                            <p className="mt-3 mb-0 text-700 line-height-3">
                                This pack consolidates holdings, realized P&amp;L, dividends, and recent activity for the selected household scope so operators can print or save one client-ready summary.
                            </p>
                            <div className="surface-ground border-round p-3 mt-3">
                                <div className="text-sm text-600">Prepared for</div>
                                <div className="text-xl font-semibold mt-1">{reportOwnerName}</div>
                                <div className="text-sm text-600 mt-2 line-height-3">
                                    Scope: {scopeValue} | Generated on {generatedLabel} | Prepared by {preparedBy}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <Tag value={`${scopeLabels[scope]} scope`} severity="info" />
                                <Tag value={`Holdings as of ${formatDate(asOfDate, 'Latest')}`} severity="success" />
                                <Tag value={filters.fromDate || filters.toDate ? `Activity window ${formatDate(filters.fromDate)} to ${formatDate(filters.toDate)}` : 'Activity window: full available range'} severity="warning" />
                            </div>
                        </div>
                        <div className="xl:w-4 flex flex-column gap-2 xl:align-items-end wealth-pack-print-hidden">
                            <small className="text-700">Scope: {scopeValue}</small>
                            <div className="flex flex-wrap gap-2 xl:justify-content-end">
                                <Button label="Print / Save PDF" icon="pi pi-print" onClick={() => window.print()} />
                                <Button label="Back to statements" icon="pi pi-arrow-left" outlined onClick={() => openReport('/apps/wealth/statements')} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="col-12"><div className="card"><h3 className="m-0">Unable to prepare the statement pack</h3><p className="mt-3 mb-0 text-red-500">{error.message}</p></div></div>
            ) : null}

            <div className="col-12 md:col-6 xl:col-3"><div className="card wealth-pack-break-avoid h-full"><div className="text-sm text-600">Portfolio Value</div><div className="text-2xl font-semibold mt-2">{loading ? '...' : formatAmount(marketValue)}</div><div className="text-sm text-600 mt-2 line-height-3">{holdingsTotal} holdings rows are included in the selected scope.</div></div></div>
            <div className="col-12 md:col-6 xl:col-3"><div className="card wealth-pack-break-avoid h-full"><div className="text-sm text-600">Unrealized P&amp;L</div><div className="text-2xl font-semibold mt-2">{loading ? '...' : formatSignedAmount(unrealizedPnl)}</div><div className="text-sm text-600 mt-2 line-height-3">Based on the holdings snapshot and latest eligible close price.</div></div></div>
            <div className="col-12 md:col-6 xl:col-3"><div className="card wealth-pack-break-avoid h-full"><div className="text-sm text-600">Realized P&amp;L</div><div className="text-2xl font-semibold mt-2">{loading ? '...' : formatSignedAmount(realizedTotal)}</div><div className="text-sm text-600 mt-2 line-height-3">{realizedTotalRows} realized rows fall inside this statement window.</div></div></div>
            <div className="col-12 md:col-6 xl:col-3"><div className="card wealth-pack-break-avoid h-full"><div className="text-sm text-600">Dividend Net</div><div className="text-2xl font-semibold mt-2">{loading ? '...' : formatAmount(dividendNet)}</div><div className="text-sm text-600 mt-2 line-height-3">{dividendTotalRows} dividend rows net of TDS or fees are included.</div></div></div>

            <div className="col-12 xl:col-5">
                <div className="card wealth-pack-break-avoid">
                    <h3 className="m-0">Included Investors</h3>
                    <p className="mt-2 mb-3 text-600">{scopedInvestors.length} investor profiles are covered in this pack.</p>
                    {scopedInvestors.length ? (
                        <div className="flex flex-column gap-2">
                            {scopedInvestors.map((profile: any) => (
                                <div key={profile.id} className="surface-ground border-round p-3">
                                    <div className="font-medium">{profile.name}{profile.relationship ? ` (${profile.relationship})` : ''}</div>
                                    <div className="text-sm text-600 mt-2 line-height-3">
                                        {profile.pan ? `PAN: ${profile.pan}` : 'PAN not captured'}{profile.email ? ` | ${profile.email}` : ''}{profile.phone ? ` | ${profile.phone}` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="m-0 text-600">No investor profile is linked to the selected scope yet.</p>}
                </div>
            </div>

            <div className="col-12 xl:col-7">
                <div className="card wealth-pack-break-avoid">
                    <h3 className="m-0">Included Demat Accounts</h3>
                    <p className="mt-2 mb-3 text-600">{scopedAccounts.length} demat accounts are covered in this pack.</p>
                    {scopedAccounts.length ? (
                        <div className="grid">
                            {scopedAccounts.map((account: any) => (
                                <div key={account.id} className="col-12 md:col-6"><div className="surface-ground border-round p-3 h-full"><div className="font-medium">{formatAccount(account.name, account.code)}</div><div className="text-sm text-600 mt-2 line-height-3">{account.investorProfileName ? `Investor: ${account.investorProfileName}` : 'Investor not assigned'}{account.brokerName ? ` | Broker: ${account.brokerName}` : ''}{account.depository ? ` | Depository: ${account.depository}` : ''}</div></div></div>
                            ))}
                        </div>
                    ) : <p className="m-0 text-600">No demat account matches the selected scope.</p>}
                </div>
            </div>

            <div className="col-12">
                <div className="card wealth-pack-break-avoid">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div><h3 className="m-0">Holdings Snapshot</h3><p className="mt-2 mb-0 text-600">{holdingsTotal > holdings.length ? `Showing the first ${holdings.length} rows from ${holdingsTotal} available holdings.` : 'Full holdings set for the selected scope.'}</p></div>
                        <Button label="Open detailed holdings" className="p-button-text app-action-compact wealth-pack-print-hidden" onClick={() => openReport('/apps/wealth/holdings')} />
                    </div>
                    {holdings.length ? (
                        <div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Security</th><th className="text-left p-2">Investor</th><th className="text-left p-2">Demat Account</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-right p-2">Value</th><th className="text-right p-2">P&amp;L</th><th className="text-left p-2">Price Date</th></tr></thead><tbody>{holdings.map((row: any) => <tr key={row.rowKey}><td className="p-2">{row.symbol || row.name || '-'}</td><td className="p-2">{row.investorProfileName || 'Household total'}</td><td className="p-2">{formatAccount(row.accountName, row.accountCode)}</td><td className="p-2 text-right">{formatQuantity(row.qty)}</td><td className="p-2 text-right">{formatAmount(row.cmp)}</td><td className="p-2 text-right">{formatAmount(row.currentValue)}</td><td className={`p-2 text-right ${toNumber(row.totalPnl) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatSignedAmount(row.totalPnl)}</td><td className="p-2">{formatYmd(row.cmpDate)}</td></tr>)}</tbody></table></div>
                    ) : <p className="m-0 text-600">No holdings are available for the selected statement scope yet.</p>}
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <div className="card wealth-pack-break-avoid">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div><h3 className="m-0">Realized P&amp;L Summary</h3><p className="mt-2 mb-0 text-600">{realizedTotalRows > realizedRows.length ? `Showing the first ${realizedRows.length} rows from ${realizedTotalRows} realized entries.` : 'Realized sell activity for the selected period.'}</p></div>
                        <Button label="Open detailed realized P&L" className="p-button-text app-action-compact wealth-pack-print-hidden" onClick={() => openReport('/apps/wealth/realized')} />
                    </div>
                    {realizedRows.length ? (
                        <div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Security</th><th className="text-left p-2">Investor</th><th className="text-left p-2">Demat Account</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Realized</th></tr></thead><tbody>{realizedRows.map((row: any, index: number) => <tr key={`${row.tdate}-${row.symbol || row.name || index}`}><td className="p-2">{formatYmd(row.tdate)}</td><td className="p-2">{row.symbol || row.name || '-'}</td><td className="p-2">{row.investorProfileName || '-'}</td><td className="p-2">{row.accountName || '-'}</td><td className="p-2 text-right">{formatQuantity(row.qty)}</td><td className={`p-2 text-right ${toNumber(row.realized) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatSignedAmount(row.realized)}</td></tr>)}</tbody></table></div>
                    ) : <p className="m-0 text-600">No realized sell activity is available for the selected period.</p>}
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <div className="card wealth-pack-break-avoid">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div><h3 className="m-0">Dividend Summary</h3><p className="mt-2 mb-0 text-600">{dividendTotalRows > dividendRows.length ? `Showing the first ${dividendRows.length} rows from ${dividendTotalRows} dividend entries.` : 'Dividend receipts and TDS for the selected period.'}</p></div>
                        <Button label="Open dividend register" className="p-button-text app-action-compact wealth-pack-print-hidden" onClick={() => openReport('/apps/wealth/dividends')} />
                    </div>
                    {dividendRows.length ? (
                        <div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Company</th><th className="text-left p-2">Investor</th><th className="text-left p-2">Demat Account</th><th className="text-right p-2">Gross</th><th className="text-right p-2">TDS</th><th className="text-right p-2">Net</th></tr></thead><tbody>{dividendRows.map((row: any) => { const gross = toNumber(row.qty) * toNumber(row.price); const tds = toNumber(row.fees); return <tr key={row.id}><td className="p-2">{formatYmd(row.tdate)}</td><td className="p-2">{row.symbol || row.name || '-'}</td><td className="p-2">{row.investorProfileName || '-'}</td><td className="p-2">{formatAccount(row.accountName, row.accountCode)}</td><td className="p-2 text-right">{formatAmount(gross)}</td><td className="p-2 text-right">{formatAmount(tds)}</td><td className="p-2 text-right">{formatAmount(gross - tds)}</td></tr>; })}</tbody></table></div>
                    ) : <p className="m-0 text-600">No dividend entries are available for the selected period.</p>}
                </div>
            </div>

            <div className="col-12">
                <div className="card wealth-pack-break-avoid">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div><h3 className="m-0">Recent Activity</h3><p className="mt-2 mb-0 text-600">{activityTotalRows > activityRows.length ? `Showing the most recent ${activityRows.length} rows from ${activityTotalRows} available records.` : 'Recent transaction activity for the selected scope.'}</p></div>
                        <Button label="Open transaction register" className="p-button-text app-action-compact wealth-pack-print-hidden" onClick={() => openReport('/apps/wealth/transactions')} />
                    </div>
                    {activityRows.length ? (
                        <div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Type</th><th className="text-left p-2">Security</th><th className="text-left p-2">Investor</th><th className="text-left p-2">Demat Account</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-left p-2">Source Doc</th></tr></thead><tbody>{activityRows.map((row: any) => <tr key={row.id}><td className="p-2">{formatYmd(row.tdate)}</td><td className="p-2">{row.segment ? `${row.ttype} (${row.segment})` : row.ttype}</td><td className="p-2">{row.symbol || row.name || '-'}</td><td className="p-2">{row.investorProfileName || '-'}</td><td className="p-2">{formatAccount(row.accountName, row.accountCode)}</td><td className="p-2 text-right">{formatQuantity(row.qty)}</td><td className="p-2 text-right">{formatAmount(row.price)}</td><td className="p-2">{row.sourceDoc || '-'}</td></tr>)}</tbody></table></div>
                    ) : <p className="m-0 text-600">No activity is available for the selected statement window.</p>}
                </div>
            </div>
        </div>
    );
}
