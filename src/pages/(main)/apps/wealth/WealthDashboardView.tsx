'use client';

import React, { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    type WealthDematAccount,
    type WealthInvestorProfile,
    formatAccountLabel,
    fromYmdOrNull
} from './shared';
import { buildWealthReportSearchParams } from './reportSearchParams';
import { summarizeWealthSourceDocBatches } from './sourceDocBatches';

type WealthHoldingSnapshot = {
    securityId: string;
    symbol?: string | null;
    name: string;
    qty?: string | null;
    currentValue?: string | null;
    totalPnl?: string | null;
};

type WealthTransactionSnapshot = {
    id: string;
    tdate?: string | null;
    ttype: string;
    segment?: string | null;
    qty?: string | null;
    price?: string | null;
    accountId?: string | null;
    sourceDoc?: string | null;
    symbol?: string | null;
    name: string;
};

type DashboardStep = {
    title: string;
    description: string;
    note: string;
    actionLabel: string;
    done: boolean;
    onClick: () => void;
};

type SummaryCardProps = {
    title: string;
    value: string;
    detail: string;
    icon: string;
};

type QuickLinkCardProps = {
    title: string;
    description: string;
    icon: string;
    buttonLabel: string;
    onClick: () => void;
};

const WEALTH_DASHBOARD_QUERY = gql`
    query WealthDashboardSnapshot($holdingsLimit: Int!, $transactionsLimit: Int!) {
        investorProfiles {
            id
            name
            relationship
            isActive
        }
        accounts {
            id
            name
            code
            investorProfileId
            investorProfileName
            isPrimary
            isActive
        }
        holdingsPage(limit: $holdingsLimit, offset: 0) {
            items {
                securityId
                symbol
                name
                qty
                currentValue
                totalPnl
            }
            meta {
                total
            }
        }
        transactionsPage(limit: $transactionsLimit, offset: 0) {
            items {
                id
                tdate
                ttype
                segment
                qty
                price
                accountId
                sourceDoc
                symbol
                name
            }
            meta {
                total
            }
        }
    }
`;

const countFormatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
});

const amountFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const quantityFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium'
});

const toNumber = (value?: string | null) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const formatCount = (value: number) => countFormatter.format(value);

const formatAmount = (value?: string | null) => {
    const num = Number(value);
    return Number.isFinite(num) ? amountFormatter.format(num) : '-';
};

const formatQuantity = (value?: string | null) => {
    const num = Number(value);
    return Number.isFinite(num) ? quantityFormatter.format(num) : '-';
};

const formatSignedAmount = (value?: string | null) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    const sign = num > 0 ? '+' : '';
    return `${sign}${amountFormatter.format(num)}`;
};

const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const dt = new Date(`${value}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? value : dateFormatter.format(dt);
};

const getTxnSeverity = (ttype: string): 'success' | 'warning' | 'info' | 'danger' | undefined => {
    if (ttype === 'BUY') return 'success';
    if (ttype === 'SELL') return 'warning';
    if (ttype === 'DIVIDEND') return 'info';
    return undefined;
};

const getReadinessState = (progress: number) => {
    if (progress >= 100) return { label: 'Setup ready', severity: 'success' as const };
    if (progress <= 0) return { label: 'Setup not started', severity: 'warning' as const };
    return { label: `${progress}% ready`, severity: 'info' as const };
};

function SummaryCard({ title, value, detail, icon }: SummaryCardProps) {
    return (
        <div className="card h-full">
            <div className="flex align-items-start justify-content-between gap-3">
                <div>
                    <div className="text-sm text-600 mb-2">{title}</div>
                    <div className="text-3xl font-semibold">{value}</div>
                    <div className="text-sm text-600 mt-2 line-height-3">{detail}</div>
                </div>
                <span className="inline-flex align-items-center justify-content-center border-circle surface-ground" style={{ width: '3rem', height: '3rem' }}>
                    <i className={`${icon} text-primary text-xl`} />
                </span>
            </div>
        </div>
    );
}

function QuickLinkCard({ title, description, icon, buttonLabel, onClick }: QuickLinkCardProps) {
    return (
        <div className="surface-ground border-round-lg p-3">
            <div className="flex align-items-start gap-3">
                <span className="inline-flex align-items-center justify-content-center border-circle bg-white" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <i className={`${icon} text-primary`} />
                </span>
                <div className="flex-1">
                    <div className="font-medium">{title}</div>
                    <div className="text-sm text-600 mt-1 line-height-3">{description}</div>
                    <Button label={buttonLabel} className="p-button-text app-action-compact mt-2" onClick={onClick} />
                </div>
            </div>
        </div>
    );
}

export function WealthDashboardView() {
    const navigate = useNavigate();
    const { data, loading, error, refetch } = useQuery(WEALTH_DASHBOARD_QUERY, {
        client: wealthApolloClient,
        variables: { holdingsLimit: 6, transactionsLimit: 24 },
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const profiles: WealthInvestorProfile[] = data?.investorProfiles ?? [];
    const accounts: WealthDematAccount[] = data?.accounts ?? [];
    const holdings: WealthHoldingSnapshot[] = data?.holdingsPage?.items ?? [];
    const transactions: WealthTransactionSnapshot[] = data?.transactionsPage?.items ?? [];
    const holdingsTotal = data?.holdingsPage?.meta?.total ?? holdings.length;
    const transactionsTotal = data?.transactionsPage?.meta?.total ?? transactions.length;

    const activeProfiles = profiles.filter((profile) => profile.isActive).length;
    const activeAccounts = accounts.filter((account) => account.isActive).length;
    const linkedAccounts = accounts.filter((account) => Boolean(account.investorProfileId)).length;
    const unassignedAccounts = accounts.length - linkedAccounts;
    const profilesWithAccounts = new Set(accounts.map((account) => account.investorProfileId).filter(Boolean));
    const profilesWithoutAccounts = profiles.filter((profile) => !profilesWithAccounts.has(profile.id)).length;

    const accountById = useMemo(() => {
        const entries = accounts.map((account) => [account.id, formatAccountLabel(account)]);
        return Object.fromEntries(entries) as Record<string, string>;
    }, [accounts]);
    const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);
    const recentBatchSummaries = useMemo(
        () =>
            summarizeWealthSourceDocBatches(transactions, (row) =>
                row.accountId ? accountById[row.accountId] ?? row.accountId : ''
            ).slice(0, 5),
        [accountById, transactions]
    );
    const openTransactionsReport = (sourceDoc = '', fromDate?: string, toDate?: string) => {
        const params = buildWealthReportSearchParams({
            fromDate: fromYmdOrNull(fromDate ?? null),
            toDate: fromYmdOrNull(toDate ?? null),
            sourceDoc
        });
        const search = params.toString();
        navigate({ pathname: '/apps/wealth/transactions', search: search ? `?${search}` : '' });
    };

    const positionSnapshot = useMemo(
        () => [...holdings].sort((left, right) => toNumber(right.currentValue) - toNumber(left.currentValue)).slice(0, 5),
        [holdings]
    );

    const checklist: DashboardStep[] = [
        {
            title: 'Create investor profiles',
            description: 'Add family members, joint holders, or household entities first.',
            note:
                profiles.length > 0
                    ? `${formatCount(profiles.length)} profiles added, ${formatCount(activeProfiles)} active.`
                    : 'No investor profiles added yet.',
            actionLabel: profiles.length > 0 ? 'Manage profiles' : 'Add profile',
            done: profiles.length > 0,
            onClick: () => navigate('/apps/wealth/investor-profiles')
        },
        {
            title: 'Map demat accounts',
            description: 'Capture every broker or demat account and link it to the right investor.',
            note:
                accounts.length > 0
                    ? `${formatCount(linkedAccounts)} linked, ${formatCount(unassignedAccounts)} still unassigned.`
                    : 'No demat accounts created yet.',
            actionLabel: accounts.length > 0 ? 'Manage accounts' : 'Add account',
            done: accounts.length > 0,
            onClick: () => navigate('/apps/wealth/demat-accounts')
        },
        {
            title: 'Load opening holdings or transactions',
            description: 'Use imports to seed existing portfolio balances before daily activity starts.',
            note:
                transactionsTotal > 0
                    ? `${formatCount(transactionsTotal)} transactions already loaded.`
                    : 'No portfolio data has been imported or posted yet.',
            actionLabel: transactionsTotal > 0 ? 'Open import' : 'Import data',
            done: transactionsTotal > 0,
            onClick: () => navigate('/apps/wealth/import?mode=opening')
        },
        {
            title: 'Review reports',
            description: 'Validate holdings, realized P&L, dividend register, and the ledger before go-live.',
            note:
                holdingsTotal > 0
                    ? `${formatCount(holdingsTotal)} live positions are now available in reports.`
                    : 'Reports will light up once holdings or transactions are loaded.',
            actionLabel: holdingsTotal > 0 ? 'Open statements' : 'View reports',
            done: holdingsTotal > 0,
            onClick: () => navigate('/apps/wealth/statements')
        }
    ];

    const completedSteps = checklist.filter((step) => step.done).length;
    const readiness = getReadinessState(Math.round((completedSteps / checklist.length) * 100));

    if (error) {
        return (
            <div className="grid">
                <div className="col-12">
                    <div className="card">
                        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                            <div>
                                <h2 className="m-0">Wealth Dashboard</h2>
                                <p className="mt-2 mb-0 text-600">Unable to load the household setup overview right now.</p>
                            </div>
                            <Button icon="pi pi-refresh" label="Retry" onClick={() => refetch()} />
                        </div>
                        <p className="text-red-500 mt-4 mb-0">{error.message}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div
                    className="card overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(15, 23, 42, 0.03) 100%)'
                    }}
                >
                    <div className="flex flex-column xl:flex-row xl:align-items-center xl:justify-content-between gap-4">
                        <div className="xl:w-8">
                            <div className="text-sm font-medium text-primary mb-2">Household Wealth Workspace</div>
                            <h2 className="m-0">Onboard investor profiles, demat accounts, and portfolio data in one place</h2>
                            <p className="mt-3 mb-0 text-700 line-height-3">
                                Use this landing page as the client-facing start point for a household tenant. Investor profiles keep family members separate,
                                demat accounts stay account-safe, and reports roll up only after the setup is complete.
                            </p>
                        </div>

                        <div className="xl:w-4 flex flex-column gap-2 xl:align-items-end">
                            <Tag value={loading && !data ? 'Loading setup...' : readiness.label} severity={loading && !data ? 'info' : readiness.severity} />
                            <small className="text-700">{formatCount(completedSteps)} of {formatCount(checklist.length)} onboarding milestones complete</small>
                            <div className="flex flex-wrap gap-2 xl:justify-content-end">
                                <Button label="Add Investor" icon="pi pi-user-plus" onClick={() => navigate('/apps/wealth/investor-profiles')} />
                                <Button label="Add Demat" icon="pi pi-briefcase" outlined onClick={() => navigate('/apps/wealth/demat-accounts')} />
                                <Button label="Import Data" icon="pi pi-upload" outlined onClick={() => navigate('/apps/wealth/import?mode=opening')} />
                                <Button icon="pi pi-refresh" className="p-button-text" onClick={() => refetch()} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6 xl:col-3">
                <SummaryCard
                    title="Investor Profiles"
                    value={loading && !data ? '...' : formatCount(profiles.length)}
                    detail={`${formatCount(activeProfiles)} active household members or entities.`}
                    icon="pi pi-users"
                />
            </div>
            <div className="col-12 md:col-6 xl:col-3">
                <SummaryCard
                    title="Demat Accounts"
                    value={loading && !data ? '...' : formatCount(accounts.length)}
                    detail={`${formatCount(activeAccounts)} active accounts, ${formatCount(linkedAccounts)} mapped to investors.`}
                    icon="pi pi-briefcase"
                />
            </div>
            <div className="col-12 md:col-6 xl:col-3">
                <SummaryCard
                    title="Open Positions"
                    value={loading && !data ? '...' : formatCount(holdingsTotal)}
                    detail="Positions appear once holdings or transaction history is loaded."
                    icon="pi pi-chart-line"
                />
            </div>
            <div className="col-12 md:col-6 xl:col-3">
                <SummaryCard
                    title="Transactions Loaded"
                    value={loading && !data ? '...' : formatCount(transactionsTotal)}
                    detail="Imported opening balances and ongoing trades both count here."
                    icon="pi pi-list"
                />
            </div>

            {(unassignedAccounts > 0 || profilesWithoutAccounts > 0) && (
                <div className="col-12">
                    <div className="card surface-ground">
                        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                            <div>
                                <div className="font-medium mb-1">Household mapping still needs attention</div>
                                <p className="m-0 text-600 line-height-3">
                                    {unassignedAccounts > 0
                                        ? `${formatCount(unassignedAccounts)} demat account(s) are not linked to an investor profile.`
                                        : 'Every demat account is linked to an investor profile.'}{' '}
                                    {profilesWithoutAccounts > 0
                                        ? `${formatCount(profilesWithoutAccounts)} investor profile(s) do not have any demat account yet.`
                                        : ''}
                                </p>
                            </div>
                            <Button label="Fix mappings" className="app-action-compact" onClick={() => navigate('/apps/wealth/demat-accounts')} />
                        </div>
                    </div>
                </div>
            )}

            <div className="col-12 xl:col-7">
                <div className="card h-full">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div>
                            <h3 className="m-0">Onboarding Checklist</h3>
                            <p className="mt-2 mb-0 text-600">Move through setup in the same order your client household would experience it.</p>
                        </div>
                        <Button label="Open Import" icon="pi pi-upload" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/import?mode=opening')} />
                    </div>

                    <div className="flex flex-column gap-3">
                        {checklist.map((step) => (
                            <div key={step.title} className="surface-ground border-round-lg p-3">
                                <div className="flex flex-column lg:flex-row lg:align-items-start gap-3">
                                    <span className="inline-flex align-items-center justify-content-center border-circle bg-white" style={{ width: '2.5rem', height: '2.5rem' }}>
                                        <i className={`pi ${step.done ? 'pi-check-circle text-green-500' : 'pi-clock text-500'}`} />
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex flex-column md:flex-row md:align-items-center gap-2">
                                            <div className="font-medium">{step.title}</div>
                                            <Tag value={step.done ? 'Done' : 'Pending'} severity={step.done ? 'success' : 'warning'} />
                                        </div>
                                        <p className="mt-2 mb-1 text-700 line-height-3">{step.description}</p>
                                        <small className="text-600">{step.note}</small>
                                    </div>
                                    <Button label={step.actionLabel} className="app-action-compact" onClick={step.onClick} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="col-12 xl:col-5">
                <div className="card h-full">
                    <div className="mb-3">
                        <h3 className="m-0">Quick Actions</h3>
                        <p className="mt-2 mb-0 text-600">Jump directly into the screens your operators will use most.</p>
                    </div>

                    <div className="flex flex-column gap-3">
                        <QuickLinkCard
                            title="Statement Hub"
                            description="Open holdings, transactions, realized P&L, dividends, and ledger with one shared household scope."
                            icon="pi pi-file"
                            buttonLabel="Open statements"
                            onClick={() => navigate('/apps/wealth/statements')}
                        />
                        <QuickLinkCard
                            title="Statement Pack"
                            description="Prepare one printable household summary with the core wealth reports bundled together."
                            icon="pi pi-print"
                            buttonLabel="Open statement pack"
                            onClick={() => navigate('/apps/wealth/statements/pack')}
                        />
                        <QuickLinkCard
                            title="Rollout Kit"
                            description="Use the guided checklist, templates, and evidence log to complete first-tenant onboarding and UAT."
                            icon="pi pi-check-square"
                            buttonLabel="Open rollout kit"
                            onClick={() => navigate('/apps/wealth/rollout')}
                        />
                        <QuickLinkCard
                            title="Investor Profiles"
                            description="Create or update household members, joint holders, or entities."
                            icon="pi pi-users"
                            buttonLabel="Open investor profiles"
                            onClick={() => navigate('/apps/wealth/investor-profiles')}
                        />
                        <QuickLinkCard
                            title="Demat Accounts"
                            description="Map brokers and demat accounts to the correct investor profile."
                            icon="pi pi-briefcase"
                            buttonLabel="Open demat accounts"
                            onClick={() => navigate('/apps/wealth/demat-accounts')}
                        />
                        <QuickLinkCard
                            title="Opening Holdings Import"
                            description="Seed current holdings when a new household starts using the app."
                            icon="pi pi-upload"
                            buttonLabel="Import opening holdings"
                            onClick={() => navigate('/apps/wealth/import?mode=opening')}
                        />
                        <QuickLinkCard
                            title="Transaction Import"
                            description="Load ongoing buy, sell, dividend, or corporate-action entries from files."
                            icon="pi pi-list"
                            buttonLabel="Import transactions"
                            onClick={() => navigate('/apps/wealth/import?mode=transactions')}
                        />
                        <QuickLinkCard
                            title="Securities Master"
                            description="Create the ISIN and symbol records used by prices, imports, and manual entry."
                            icon="pi pi-building-columns"
                            buttonLabel="Open securities"
                            onClick={() => navigate('/apps/wealth/securities')}
                        />
                    </div>
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <div className="card h-full">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div>
                            <h3 className="m-0">Recent Import Batches</h3>
                            <p className="mt-2 mb-0 text-600">Review the latest source-document batches without rebuilding filters manually.</p>
                        </div>
                        <Button label="Transactions report" className="p-button-text app-action-compact" onClick={() => openTransactionsReport()} />
                    </div>

                    {!recentBatchSummaries.length ? (
                        <div className="surface-ground border-round-lg p-4 text-center text-600">
                            No batch-style transaction data is visible yet. Import opening holdings or transactions to create reviewable source-doc batches.
                        </div>
                    ) : (
                        <div className="flex flex-column gap-3">
                            {recentBatchSummaries.map((batch, index) => (
                                <div
                                    key={`${batch.sourceDoc}-${batch.lastDate}-${index}`}
                                    className={`surface-ground border-round-lg p-3 ${
                                        index < recentBatchSummaries.length - 1 ? 'border-bottom-1 surface-border' : ''
                                    }`}
                                >
                                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                                        <div className="flex-1">
                                            <div className="font-medium">{batch.sourceDoc}</div>
                                            <div className="text-sm text-600 mt-2 line-height-3">
                                                {batch.rowCount} transaction row(s) from {formatDate(batch.firstDate)} to {formatDate(batch.lastDate)}
                                            </div>
                                            <div className="text-sm text-600 mt-1 line-height-3">
                                                Types: {batch.typeLabels.join(', ') || '-'}
                                            </div>
                                            <div className="text-sm text-600 mt-1 line-height-3">
                                                Accounts: {batch.accountLabels.join(', ') || '-'}
                                            </div>
                                        </div>
                                        <Button
                                            label="Review"
                                            className="app-action-compact"
                                            onClick={() => openTransactionsReport(batch.sourceDocFilter, batch.firstDate, batch.lastDate)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <div className="card h-full">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div>
                            <h3 className="m-0">Recent Activity</h3>
                            <p className="mt-2 mb-0 text-600">The latest portfolio movements loaded into this household tenant.</p>
                        </div>
                        <Button label="All transactions" className="p-button-text app-action-compact" onClick={() => openTransactionsReport()} />
                    </div>

                    {!recentTransactions.length ? (
                        <div className="surface-ground border-round-lg p-4 text-center text-600">
                            No activity yet. Import opening holdings or load transactions to start the client ledger.
                        </div>
                    ) : (
                        <div className="flex flex-column gap-3">
                            {recentTransactions.map((transaction, index) => (
                                <div
                                    key={transaction.id}
                                    className={`flex flex-column md:flex-row md:align-items-center gap-3 ${
                                        index < recentTransactions.length - 1 ? 'pb-3 border-bottom-1 surface-border' : ''
                                    }`}
                                >
                                    <div className="flex align-items-center gap-2 min-w-max">
                                        <Tag value={transaction.ttype} severity={getTxnSeverity(transaction.ttype)} />
                                        <span className="text-sm text-600">{formatDate(transaction.tdate)}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{transaction.symbol || transaction.name}</div>
                                        <small className="text-600">
                                            {transaction.accountId ? accountById[transaction.accountId] ?? 'Unknown account' : 'No account mapped'}
                                            {transaction.segment ? ` | ${transaction.segment}` : ''}
                                            {transaction.sourceDoc ? ` | ${transaction.sourceDoc}` : ''}
                                        </small>
                                    </div>
                                    <div className="md:text-right">
                                        <div className="font-medium">Qty {formatQuantity(transaction.qty)}</div>
                                        <small className="text-600">Price {formatAmount(transaction.price)}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <div className="card h-full">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div>
                            <h3 className="m-0">Position Snapshot</h3>
                            <p className="mt-2 mb-0 text-600">A quick view of currently loaded holdings before you open the full report.</p>
                        </div>
                        <Button label="Open holdings" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/holdings')} />
                    </div>

                    {!positionSnapshot.length ? (
                        <div className="surface-ground border-round-lg p-4 text-center text-600">
                            Holdings will appear here once opening balances or transactions are loaded.
                        </div>
                    ) : (
                        <div className="flex flex-column gap-3">
                            {positionSnapshot.map((holding, index) => {
                                const pnl = toNumber(holding.totalPnl);
                                return (
                                    <div
                                        key={holding.securityId}
                                        className={`flex flex-column md:flex-row md:align-items-center gap-3 ${
                                            index < positionSnapshot.length - 1 ? 'pb-3 border-bottom-1 surface-border' : ''
                                        }`}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium">{holding.symbol || holding.name}</div>
                                            <small className="text-600">Qty {formatQuantity(holding.qty)}</small>
                                        </div>
                                        <div className="md:text-right">
                                            <div className="font-medium">Value {formatAmount(holding.currentValue)}</div>
                                            <small className={pnl >= 0 ? 'text-green-600' : 'text-red-500'}>P&L {formatSignedAmount(holding.totalPnl)}</small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                        <div>
                            <h3 className="m-0">Dedicated maintenance pages are ready</h3>
                            <p className="mt-2 mb-0 text-600 line-height-3">
                                Prices, FMV checks, corporate actions, and direct transaction posting now have separate operator screens, so normal wealth work stays on the dedicated pages below.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button label="Manual Entry" icon="pi pi-pencil" onClick={() => navigate('/apps/wealth/manual-transactions')} />
                            <Button label="Statements" icon="pi pi-file" outlined onClick={() => navigate('/apps/wealth/statements')} />
                            <Button label="Statement Pack" icon="pi pi-print" outlined onClick={() => navigate('/apps/wealth/statements/pack')} />
                            <Button label="Prices & FMV" icon="pi pi-chart-bar" outlined onClick={() => navigate('/apps/wealth/prices')} />
                            <Button label="Corporate Actions" icon="pi pi-refresh" outlined onClick={() => navigate('/apps/wealth/corporate-actions')} />
                            <Button label="Securities" icon="pi pi-bookmark" outlined onClick={() => navigate('/apps/wealth/securities')} />
                            <Button label="Dividend Register" icon="pi pi-wallet" outlined onClick={() => navigate('/apps/wealth/dividends')} />
                            <Button label="Realized P&L" icon="pi pi-chart-line" outlined onClick={() => navigate('/apps/wealth/realized')} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


