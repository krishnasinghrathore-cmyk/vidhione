'use client';

import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/context';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    downloadWealthCsvTemplate,
    downloadWealthUatLogTemplate
} from '../importAssets';
import {
    type WealthDematAccount,
    type WealthInvestorProfile,
    formatAccountLabel,
    fromYmdOrNull
} from '../shared';
import { buildWealthReportSearchParams } from '../reportSearchParams';
import { summarizeWealthSourceDocBatches } from '../sourceDocBatches';

type MetricCardProps = {
    title: string;
    value: string;
    detail: string;
    icon: string;
};

type ActionCardProps = {
    title: string;
    description: string;
    buttonLabel: string;
    icon: string;
    onClick: () => void;
};

type ChecklistItem = {
    title: string;
    description: string;
    note: string;
    done: boolean;
    actionLabel: string;
    onClick: () => void;
};

type RolloutTransactionRow = {
    id: string;
    tdate?: string | null;
    ttype: string;
    accountId?: string | null;
    sourceDoc?: string | null;
};

const ROLLOUT_QUERY = gql`
    query WealthRolloutSummary {
        investorProfiles {
            id
            isActive
        }
        accounts {
            id
            name
            code
            investorProfileId
            isActive
        }
        holdingsPage(limit: 1, offset: 0) {
            meta {
                total
            }
        }
        transactionsPage(limit: 24, offset: 0) {
            items {
                id
                tdate
                ttype
                accountId
                sourceDoc
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
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium'
});

const formatCount = (value: number) => countFormatter.format(value);
const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const dt = new Date(`${value}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? value : dateFormatter.format(dt);
};

const getReadinessState = (progress: number) => {
    if (progress >= 100) return { label: 'Rollout ready', severity: 'success' as const };
    if (progress <= 0) return { label: 'Not started', severity: 'warning' as const };
    return { label: `${progress}% ready`, severity: 'info' as const };
};

function MetricCard({ title, value, detail, icon }: MetricCardProps) {
    return (
        <div className="card h-full">
            <div className="flex align-items-start justify-content-between gap-3">
                <div>
                    <div className="text-sm text-600 mb-2">{title}</div>
                    <div className="text-3xl font-semibold">{value}</div>
                    <div className="text-sm text-600 mt-2 line-height-3">{detail}</div>
                </div>
                <span
                    className="inline-flex align-items-center justify-content-center border-circle surface-ground"
                    style={{ width: '3rem', height: '3rem' }}
                >
                    <i className={`${icon} text-primary text-xl`} />
                </span>
            </div>
        </div>
    );
}

function ActionCard({ title, description, buttonLabel, icon, onClick }: ActionCardProps) {
    return (
        <div className="surface-ground border-round-lg p-3 h-full">
            <div className="flex align-items-start gap-3">
                <span
                    className="inline-flex align-items-center justify-content-center border-circle bg-white"
                    style={{ width: '2.5rem', height: '2.5rem' }}
                >
                    <i className={`${icon} text-primary`} />
                </span>
                <div className="flex-1">
                    <div className="font-medium">{title}</div>
                    <div className="text-sm text-600 mt-1 line-height-3">{description}</div>
                    <Button
                        label={buttonLabel}
                        className="p-button-text app-action-compact mt-2"
                        onClick={onClick}
                    />
                </div>
            </div>
        </div>
    );
}

export function WealthRolloutView() {
    const navigate = useNavigate();
    const { companyContext, user } = useAuth();
    const { data, loading, error, refetch } = useQuery(ROLLOUT_QUERY, {
        client: wealthApolloClient,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const profiles: WealthInvestorProfile[] = data?.investorProfiles ?? [];
    const accounts: WealthDematAccount[] = data?.accounts ?? [];
    const transactions: RolloutTransactionRow[] = data?.transactionsPage?.items ?? [];
    const holdingsTotal = data?.holdingsPage?.meta?.total ?? 0;
    const transactionsTotal = data?.transactionsPage?.meta?.total ?? 0;
    const activeProfiles = profiles.filter((profile) => profile.isActive).length;
    const activeAccounts = accounts.filter((account) => account.isActive).length;
    const linkedAccounts = accounts.filter((account) => Boolean(account.investorProfileId)).length;
    const unassignedAccounts = accounts.length - linkedAccounts;
    const accountById = Object.fromEntries(accounts.map((account) => [account.id, formatAccountLabel(account)])) as Record<string, string>;
    const recentBatchSummaries = summarizeWealthSourceDocBatches(transactions, (row) =>
        row.accountId ? accountById[row.accountId] ?? row.accountId : ''
    ).slice(0, 6);
    const openTransactionsReview = (sourceDoc = '', fromDate?: string, toDate?: string) => {
        const params = buildWealthReportSearchParams({
            fromDate: fromYmdOrNull(fromDate ?? null),
            toDate: fromYmdOrNull(toDate ?? null),
            sourceDoc
        });
        const search = params.toString();
        navigate({ pathname: '/apps/wealth/transactions', search: search ? `?${search}` : '' });
    };
    const nextRecommendedStep =
        profiles.length === 0
            ? 'Start with investor profiles'
            : accounts.length === 0
              ? 'Add and map demat accounts'
              : holdingsTotal === 0
                ? 'Load opening holdings'
                : transactionsTotal === 0
                  ? 'Import transaction history'
                  : 'Run statements and print validation';

    const checklist: ChecklistItem[] = [
        {
            title: 'Access and navigation',
            description: 'Confirm the current operator can open Wealth routes from the same tenant login.',
            note: `This rollout kit is already open in ${companyContext?.companyName || 'the current tenant'} for ${user?.email || 'the current operator'}.`,
            done: true,
            actionLabel: 'Open dashboard',
            onClick: () => navigate('/apps/wealth')
        },
        {
            title: 'Investor profiles',
            description: 'Create the household members or entities that will own demat accounts.',
            note:
                profiles.length > 0
                    ? `${formatCount(profiles.length)} investor profiles exist, with ${formatCount(activeProfiles)} active.`
                    : 'Create at least one investor profile before demat accounts or imports.',
            done: profiles.length > 0,
            actionLabel: profiles.length > 0 ? 'Manage profiles' : 'Add profiles',
            onClick: () => navigate('/apps/wealth/investor-profiles')
        },
        {
            title: 'Demat accounts',
            description: 'Add each broker or demat account and link it to the correct investor profile.',
            note:
                accounts.length > 0
                    ? `${formatCount(accounts.length)} demat accounts exist, ${formatCount(linkedAccounts)} linked and ${formatCount(unassignedAccounts)} unassigned.`
                    : 'Create the household demat accounts before importing holdings or activity.',
            done: accounts.length > 0,
            actionLabel: accounts.length > 0 ? 'Manage accounts' : 'Add accounts',
            onClick: () => navigate('/apps/wealth/demat-accounts')
        },
        {
            title: 'Opening holdings import',
            description: 'Seed the starting balances into the selected demat account using dry run first.',
            note:
                holdingsTotal > 0
                    ? `${formatCount(holdingsTotal)} holdings rows are already visible in the portfolio snapshot.`
                    : 'No holdings rows exist yet. Import opening balances or post transactions to light up holdings.',
            done: holdingsTotal > 0,
            actionLabel: 'Open opening import',
            onClick: () => navigate('/apps/wealth/import?mode=opening')
        },
        {
            title: 'Transactions import',
            description: 'Load buy, sell, dividend, and other activity using existing demat-account mappings only.',
            note:
                transactionsTotal > 0
                    ? `${formatCount(transactionsTotal)} wealth transactions are already loaded for this tenant.`
                    : 'No transaction history exists yet. Use the transaction template and validate in dry run first.',
            done: transactionsTotal > 0,
            actionLabel: 'Open transactions import',
            onClick: () => navigate('/apps/wealth/import?mode=transactions')
        },
        {
            title: 'Reports and statement pack',
            description: 'Validate holdings, realized P&L, dividends, ledger, and the printable statement pack before sign-off.',
            note:
                holdingsTotal > 0 || transactionsTotal > 0
                    ? 'Core report data is available. Capture export and print evidence from the statements hub and statement pack.'
                    : 'Reports remain mostly empty until the household has holdings or transaction data.',
            done: holdingsTotal > 0 || transactionsTotal > 0,
            actionLabel: 'Open statements',
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
                                <h2 className="m-0">Wealth Rollout Kit</h2>
                                <p className="mt-2 mb-0 text-600">Unable to load the current tenant readiness snapshot.</p>
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
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.10) 0%, rgba(15, 23, 42, 0.04) 100%)'
                    }}
                >
                    <div className="flex flex-column xl:flex-row xl:align-items-center xl:justify-content-between gap-4">
                        <div className="xl:w-8">
                            <div className="text-sm font-medium text-primary mb-2">Wealth Rollout Kit</div>
                            <h2 className="m-0">Use one in-app checklist for onboarding, UAT, and go-live evidence</h2>
                            <p className="mt-3 mb-0 text-700 line-height-3">
                                This page brings together live tenant readiness, CSV templates, the UAT evidence sheet, and the exact
                                wealth routes needed to complete a household rollout without developer help.
                            </p>
                            <div className="surface-ground border-round p-3 mt-3">
                                <div className="text-sm text-600">Current tenant</div>
                                <div className="text-xl font-semibold mt-1">{companyContext?.companyName || 'Current tenant'}</div>
                                <div className="text-sm text-600 mt-2 line-height-3">
                                    Operator: {user?.email || 'Current user'} | Next recommended step: {nextRecommendedStep}
                                </div>
                            </div>
                        </div>
                        <div className="xl:w-4 flex flex-column gap-2 xl:align-items-end">
                            <Tag value={loading && !data ? 'Loading rollout...' : readiness.label} severity={loading && !data ? 'info' : readiness.severity} />
                            <small className="text-700">
                                {formatCount(completedSteps)} of {formatCount(checklist.length)} rollout checkpoints are currently evidenced in the tenant
                            </small>
                            <div className="flex flex-wrap gap-2 xl:justify-content-end">
                                <Button
                                    label="Download UAT Log"
                                    icon="pi pi-download"
                                    onClick={downloadWealthUatLogTemplate}
                                />
                                <Button
                                    label="Statement Pack"
                                    icon="pi pi-print"
                                    outlined
                                    onClick={() => navigate('/apps/wealth/statements/pack')}
                                />
                                <Button
                                    icon="pi pi-refresh"
                                    className="p-button-text"
                                    onClick={() => refetch()}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6 xl:col-3">
                <MetricCard
                    title="Investor Profiles"
                    value={loading && !data ? '...' : formatCount(profiles.length)}
                    detail={`${formatCount(activeProfiles)} active household members or entities.`}
                    icon="pi pi-users"
                />
            </div>
            <div className="col-12 md:col-6 xl:col-3">
                <MetricCard
                    title="Demat Accounts"
                    value={loading && !data ? '...' : formatCount(accounts.length)}
                    detail={`${formatCount(activeAccounts)} active accounts, ${formatCount(linkedAccounts)} linked to investors.`}
                    icon="pi pi-briefcase"
                />
            </div>
            <div className="col-12 md:col-6 xl:col-3">
                <MetricCard
                    title="Holdings Rows"
                    value={loading && !data ? '...' : formatCount(holdingsTotal)}
                    detail="These rows confirm opening balances or activity have reached the holdings engine."
                    icon="pi pi-chart-line"
                />
            </div>
            <div className="col-12 md:col-6 xl:col-3">
                <MetricCard
                    title="Transactions Loaded"
                    value={loading && !data ? '...' : formatCount(transactionsTotal)}
                    detail="Use this to confirm imports or manual posting are populating the household ledger."
                    icon="pi pi-list"
                />
            </div>

            {unassignedAccounts > 0 ? (
                <div className="col-12">
                    <div className="card surface-ground">
                        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                            <div>
                                <div className="font-medium mb-1">Demat-account mapping still needs attention</div>
                                <p className="m-0 text-600 line-height-3">
                                    {formatCount(unassignedAccounts)} demat account(s) are still unassigned. Link every account to an investor profile before final UAT sign-off.
                                </p>
                            </div>
                            <Button label="Fix mappings" className="app-action-compact" onClick={() => navigate('/apps/wealth/demat-accounts')} />
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="col-12 xl:col-7">
                <div className="card h-full">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div>
                            <h3 className="m-0">Execution Order</h3>
                            <p className="mt-2 mb-0 text-600">
                                Follow this order during first rollout so household setup, imports, and report validation stay aligned.
                            </p>
                        </div>
                        <Button
                            label="Open import center"
                            icon="pi pi-upload"
                            className="p-button-text app-action-compact"
                            onClick={() => navigate('/apps/wealth/import?mode=opening')}
                        />
                    </div>

                    <div className="flex flex-column gap-3">
                        {checklist.map((step) => (
                            <div key={step.title} className="surface-ground border-round-lg p-3">
                                <div className="flex flex-column lg:flex-row lg:align-items-start gap-3">
                                    <span
                                        className="inline-flex align-items-center justify-content-center border-circle bg-white"
                                        style={{ width: '2.5rem', height: '2.5rem' }}
                                    >
                                        <i className={`pi ${step.done ? 'pi-check-circle text-green-500' : 'pi-clock text-500'}`} />
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex flex-column md:flex-row md:align-items-center gap-2">
                                            <div className="font-medium">{step.title}</div>
                                            <Tag value={step.done ? 'Ready' : 'Pending'} severity={step.done ? 'success' : 'warning'} />
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
                        <h3 className="m-0">Rollout Assets</h3>
                        <p className="mt-2 mb-0 text-600">Download templates, open sample data, and capture the same evidence your operators should use during UAT.</p>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-6 xl:col-12">
                            <ActionCard
                                title="Opening Holdings Template"
                                description="Use this CSV for the first household holdings load into one selected demat account."
                                buttonLabel="Download opening template"
                                icon="pi pi-upload"
                                onClick={() => downloadWealthCsvTemplate('opening')}
                            />
                        </div>
                        <div className="col-12 md:col-6 xl:col-12">
                            <ActionCard
                                title="Transactions Template"
                                description="Use this CSV when buy, sell, dividend, or other activity needs to be validated in dry run first."
                                buttonLabel="Download transactions template"
                                icon="pi pi-list"
                                onClick={() => downloadWealthCsvTemplate('transactions')}
                            />
                        </div>
                        <div className="col-12 md:col-6 xl:col-12">
                            <ActionCard
                                title="UAT Evidence Log"
                                description="Capture scenario-by-scenario results, owner, evidence links, and final sign-off notes."
                                buttonLabel="Download UAT log"
                                icon="pi pi-file-edit"
                                onClick={downloadWealthUatLogTemplate}
                            />
                        </div>
                        <div className="col-12 md:col-6 xl:col-12">
                            <ActionCard
                                title="Sample Opening Data"
                                description="Open the importer with a ready-made opening holdings CSV so the first UAT load does not start from a blank textarea."
                                buttonLabel="Open sample opening"
                                icon="pi pi-upload"
                                onClick={() => navigate('/apps/wealth/import?mode=opening&preset=sample-opening')}
                            />
                        </div>
                        <div className="col-12 md:col-6 xl:col-12">
                            <ActionCard
                                title="Sample Transaction Data"
                                description={accounts.length ? 'Open the importer with sample buy, sell, dividend, and shared-security rows using the current demat-account labels where available.' : 'Open the importer with sample buy, sell, dividend, and shared-security rows. Placeholder account labels will be used until demat accounts are created.'}
                                buttonLabel="Open sample transactions"
                                icon="pi pi-list"
                                onClick={() => navigate('/apps/wealth/import?mode=transactions&preset=sample-transactions')}
                            />
                        </div>
                        <div className="col-12 md:col-6 xl:col-12">
                            <ActionCard
                                title="Statement Pack"
                                description="Use the printable summary to capture final PDF and print-preview evidence for the household tenant."
                                buttonLabel="Open statement pack"
                                icon="pi pi-print"
                                onClick={() => navigate('/apps/wealth/statements/pack')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <div className="card h-full">
                    <h3 className="m-0">Recommended Sample Household</h3>
                    <p className="mt-2 mb-3 text-600">Use a controlled two-investor sample before onboarding the first live client dataset.</p>
                    <ul className="m-0 pl-3 text-700 line-height-3">
                        <li>Investor 1: Self</li>
                        <li>Investor 2: Spouse</li>
                        <li>Demat Account 1: Self main account</li>
                        <li>Demat Account 2: Spouse account</li>
                        <li>At least 2 opening rows and 3 to 5 transaction rows</li>
                        <li>One common security across two demat accounts to verify account-safe reporting</li>
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Button label="Investor profiles" className="app-action-compact" onClick={() => navigate('/apps/wealth/investor-profiles')} />
                        <Button label="Demat accounts" className="app-action-compact" outlined onClick={() => navigate('/apps/wealth/demat-accounts')} />
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <div className="card h-full">
                    <h3 className="m-0">Mandatory Negative Checks</h3>
                    <p className="mt-2 mb-3 text-600">Run these before sign-off so data integrity and access controls are proven, not assumed.</p>
                    <ul className="m-0 pl-3 text-700 line-height-3">
                        <li>Opening import without selecting a demat account must be blocked.</li>
                        <li>Unknown or ambiguous account matches in transaction import must fail clearly.</li>
                        <li>Duplicate opening import with the same source doc should be blocked.</li>
                        <li>The same security across two demat accounts must stay isolated at account scope.</li>
                        <li>A user without Wealth app access must not open Wealth routes.</li>
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Button label="Transaction import" className="app-action-compact" onClick={() => navigate('/apps/wealth/import?mode=transactions')} />
                        <Button label="Holdings report" className="app-action-compact" outlined onClick={() => navigate('/apps/wealth/holdings')} />
                    </div>
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                        <div>
                            <h3 className="m-0">Recent Import Batches</h3>
                            <p className="mt-2 mb-0 text-600 line-height-3">
                                Use these shortcuts to prove batch-level review during UAT instead of rebuilding transaction filters manually.
                            </p>
                        </div>
                        <Button label="Open transactions report" icon="pi pi-list" className="p-button-text app-action-compact" onClick={() => openTransactionsReview()} />
                    </div>

                    {!recentBatchSummaries.length ? (
                        <div className="surface-ground border-round p-4 text-center text-600">
                            No source-document batches are visible yet. Complete an opening or transaction import first, then return here to review the batch evidence.
                        </div>
                    ) : (
                        <div className="grid">
                            {recentBatchSummaries.map((batch) => (
                                <div key={`${batch.sourceDoc}-${batch.lastDate}`} className="col-12 md:col-6 xl:col-4">
                                    <div className="surface-ground border-round p-3 h-full">
                                        <div className="flex align-items-start justify-content-between gap-3">
                                            <div className="font-medium">{batch.sourceDoc}</div>
                                            <Tag value={`${batch.rowCount} rows`} severity="info" />
                                        </div>
                                        <div className="text-sm text-600 mt-2 line-height-3">
                                            Date range: {formatDate(batch.firstDate)} to {formatDate(batch.lastDate)}
                                        </div>
                                        <div className="text-sm text-600 mt-1 line-height-3">
                                            Types: {batch.typeLabels.join(', ') || '-'}
                                        </div>
                                        <div className="text-sm text-600 mt-1 line-height-3">
                                            Accounts: {batch.accountLabels.join(', ') || '-'}
                                        </div>
                                        <Button
                                            label="Review batch"
                                            className="p-button-text app-action-compact mt-2"
                                            onClick={() => openTransactionsReview(batch.sourceDocFilter, batch.firstDate, batch.lastDate)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                        <div>
                            <h3 className="m-0">Go-live sign-off</h3>
                            <p className="mt-2 mb-0 text-600 line-height-3">
                                Mark the tenant ready only after the UAT log is filled, statement pack output is reviewed, and the operator can complete the full wealth flow without developer intervention.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button label="Statements hub" icon="pi pi-file" onClick={() => navigate('/apps/wealth/statements')} />
                            <Button label="Statement pack" icon="pi pi-print" outlined onClick={() => navigate('/apps/wealth/statements/pack')} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


