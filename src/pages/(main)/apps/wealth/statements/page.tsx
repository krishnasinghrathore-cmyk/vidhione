'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    WEALTH_ACCOUNTS_QUERY,
    WEALTH_INVESTOR_PROFILES_QUERY,
    type WealthDematAccount,
    type WealthInvestorProfile,
    formatAccountLabel,
    formatInvestorProfileLabel
} from '../shared';
import {
    buildWealthReportSearchParams,
    resolveWealthHoldingScope,
    type WealthHoldingScope
} from '../reportSearchParams';

type StatementCardProps = {
    title: string;
    description: string;
    icon: string;
    note: string;
    actionLabel: string;
    onOpen: () => void;
};

type SummaryTileProps = {
    label: string;
    value: string;
    detail: string;
};

function SummaryTile({ label, value, detail }: SummaryTileProps) {
    return (
        <div className="surface-ground border-round-lg p-3 h-full">
            <div className="text-sm text-600">{label}</div>
            <div className="text-xl font-semibold mt-2">{value}</div>
            <div className="text-sm text-600 mt-2 line-height-3">{detail}</div>
        </div>
    );
}

function StatementCard({ title, description, icon, note, actionLabel, onOpen }: StatementCardProps) {
    return (
        <div className="card h-full">
            <div className="flex align-items-start gap-3">
                <span
                    className="inline-flex align-items-center justify-content-center border-circle surface-ground"
                    style={{ width: '3rem', height: '3rem' }}
                >
                    <i className={`${icon} text-primary text-xl`} />
                </span>
                <div className="flex-1">
                    <div className="font-medium text-lg">{title}</div>
                    <p className="mt-2 mb-0 text-700 line-height-3">{description}</p>
                    <small className="text-600 d-block mt-2">{note}</small>
                    <Button
                        label={actionLabel}
                        icon="pi pi-arrow-right"
                        className="app-action-compact mt-3"
                        onClick={onOpen}
                    />
                </div>
            </div>
        </div>
    );
}

const scopeLabels: Record<WealthHoldingScope, string> = {
    HOUSEHOLD: 'Household',
    INVESTOR: 'Investor',
    ACCOUNT: 'Demat Account'
};

const formatDateLabel = (value: Date | null) => {
    if (!value) return 'Latest';
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(value);
};

export default function WealthStatementsPage() {
    const navigate = useNavigate();
    const [investorProfileId, setInvestorProfileId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [asOfDate, setAsOfDate] = useState<Date | null>(new Date());
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);

    const { data: accountsData } = useQuery(WEALTH_ACCOUNTS_QUERY, { client: wealthApolloClient });
    const { data: investorProfilesData } = useQuery(WEALTH_INVESTOR_PROFILES_QUERY, { client: wealthApolloClient });

    const accounts: WealthDematAccount[] = accountsData?.accounts ?? [];
    const investorProfiles: WealthInvestorProfile[] = investorProfilesData?.investorProfiles ?? [];

    const accountById = useMemo(() => {
        const map: Record<string, WealthDematAccount> = {};
        accounts.forEach((account) => {
            map[account.id] = account;
        });
        return map;
    }, [accounts]);

    const investorById = useMemo(() => {
        const map: Record<string, WealthInvestorProfile> = {};
        investorProfiles.forEach((profile) => {
            map[profile.id] = profile;
        });
        return map;
    }, [investorProfiles]);

    const filteredAccounts = useMemo(() => {
        if (!investorProfileId) return accounts;
        return accounts.filter((account) => account.investorProfileId === investorProfileId);
    }, [accounts, investorProfileId]);

    useEffect(() => {
        if (!accountId || !investorProfileId) return;
        const selectedAccount = accountById[accountId];
        if (selectedAccount?.investorProfileId !== investorProfileId) {
            setAccountId('');
        }
    }, [accountById, accountId, investorProfileId]);

    const investorOptions = useMemo(
        () =>
            investorProfiles.map((profile) => ({
                label: formatInvestorProfileLabel(profile),
                value: profile.id
            })),
        [investorProfiles]
    );
    const accountOptions = useMemo(
        () =>
            filteredAccounts.map((account) => ({
                label: formatAccountLabel(account),
                value: account.id
            })),
        [filteredAccounts]
    );

    const resolvedScope = resolveWealthHoldingScope({ accountId, investorProfileId });
    const selectedInvestor = investorProfileId ? investorById[investorProfileId] ?? null : null;
    const selectedAccount = accountId ? accountById[accountId] ?? null : null;
    const scopeValue =
        selectedAccount
            ? formatAccountLabel(selectedAccount)
            : selectedInvestor
              ? formatInvestorProfileLabel(selectedInvestor)
              : 'All investors and demat accounts';

    const openReport = (pathname: string, extra?: Record<string, string>) => {
        const params = buildWealthReportSearchParams({
            asOfDate,
            fromDate,
            toDate,
            investorProfileId,
            accountId,
            scope: resolvedScope
        });
        if (extra) {
            Object.entries(extra).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
        }
        const search = params.toString();
        navigate({ pathname, search: search ? `?${search}` : '' });
    };

    return (
        <div className="grid">
            <div className="col-12">
                <div
                    className="card overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.10) 0%, rgba(15, 23, 42, 0.04) 100%)'
                    }}
                >
                    <div className="flex flex-column xl:flex-row xl:align-items-center xl:justify-content-between gap-4">
                        <div className="xl:w-8">
                            <div className="text-sm font-medium text-primary mb-2">Wealth Statements</div>
                            <h2 className="m-0">Prepare household, investor, or demat-account reports from one place</h2>
                            <p className="mt-3 mb-0 text-700 line-height-3">
                                Use shared filters once, then open the exact holding, transaction, dividend, realized P&amp;L, or cash-ledger view that matches the family member or account you want to review.
                            </p>
                        </div>
                        <div className="xl:w-4 flex flex-column gap-2 xl:align-items-end">
                            <Tag value={`${scopeLabels[resolvedScope]} pack`} severity="info" />
                            <small className="text-700">Scope: {scopeValue}</small>
                            <div className="flex flex-wrap gap-2 xl:justify-content-end">
                                <Button
                                    label="Open holdings"
                                    icon="pi pi-briefcase"
                                    onClick={() => openReport('/apps/wealth/holdings')}
                                />
                                <Button
                                    label="Open statement pack"
                                    icon="pi pi-print"
                                    outlined
                                    onClick={() => openReport('/apps/wealth/statements/pack')}
                                />
                                <Button
                                    label="Clear filters"
                                    icon="pi pi-times"
                                    outlined
                                    onClick={() => {
                                        setInvestorProfileId('');
                                        setAccountId('');
                                        setAsOfDate(new Date());
                                        setFromDate(null);
                                        setToDate(null);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 xl:col-4">
                <div className="card h-full">
                    <div className="mb-3">
                        <h3 className="m-0">Statement Filters</h3>
                        <p className="mt-2 mb-0 text-600">Choose the household scope once and reuse it across every report page.</p>
                    </div>

                    <div className="grid">
                        <div className="col-12 flex flex-column gap-1">
                            <label className="font-medium">Investor Profile</label>
                            <AppDropdown
                                value={investorProfileId}
                                options={investorOptions}
                                onChange={(e) => setInvestorProfileId(e.value ?? '')}
                                placeholder="All investors"
                                filter
                                showClear
                            />
                        </div>
                        <div className="col-12 flex flex-column gap-1">
                            <label className="font-medium">Demat Account</label>
                            <AppDropdown
                                value={accountId}
                                options={accountOptions}
                                onChange={(e) => setAccountId(e.value ?? '')}
                                placeholder="All demat accounts"
                                filter
                                showClear
                            />
                        </div>
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">As of</label>
                            <AppDateInput value={asOfDate} onChange={setAsOfDate} />
                        </div>
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">From</label>
                            <AppDateInput value={fromDate} onChange={setFromDate} />
                        </div>
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">To</label>
                            <AppDateInput value={toDate} onChange={setToDate} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 xl:col-8">
                <div className="grid h-full">
                    <div className="col-12 md:col-4">
                        <SummaryTile
                            label="Reporting Scope"
                            value={scopeLabels[resolvedScope]}
                            detail={scopeValue}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <SummaryTile
                            label="Holdings Date"
                            value={formatDateLabel(asOfDate)}
                            detail="Used when opening the holdings snapshot."
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <SummaryTile
                            label="Statement Window"
                            value={`${formatDateLabel(fromDate)} to ${formatDateLabel(toDate)}`}
                            detail="Used for transactions, dividends, realized P&L, and cash ledger."
                        />
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6 xl:col-4">
                <StatementCard
                    title="Holdings Snapshot"
                    description="Open the portfolio summary with household, investor, or demat-account grouping already selected."
                    icon="pi pi-briefcase"
                    note={`Grouping will open as ${scopeLabels[resolvedScope].toLowerCase()} scope.`}
                    actionLabel="Open holdings"
                    onOpen={() => openReport('/apps/wealth/holdings')}
                />
            </div>
            <div className="col-12 md:col-6 xl:col-4">
                <StatementCard
                    title="Transaction Register"
                    description="Review raw BUY, SELL, DIVIDEND, and other wealth entries for the selected family scope."
                    icon="pi pi-list"
                    note="Date range, investor, and account filters will carry forward."
                    actionLabel="Open transactions"
                    onOpen={() => openReport('/apps/wealth/transactions')}
                />
            </div>
            <div className="col-12 md:col-6 xl:col-4">
                <StatementCard
                    title="Realized P&L"
                    description="Inspect FIFO-based realized profit and loss for the chosen household member or account."
                    icon="pi pi-chart-line"
                    note="Useful for account-safe tax and performance review."
                    actionLabel="Open realized P&L"
                    onOpen={() => openReport('/apps/wealth/realized')}
                />
            </div>
            <div className="col-12 md:col-6 xl:col-4">
                <StatementCard
                    title="Dividend Register"
                    description="Review dividend receipts, TDS, and net amounts with household or investor-level filtering."
                    icon="pi pi-wallet"
                    note="Good for annual income review across family accounts."
                    actionLabel="Open dividend register"
                    onOpen={() => openReport('/apps/wealth/dividends')}
                />
            </div>
            <div className="col-12 md:col-6 xl:col-4">
                <StatementCard
                    title="Cash Ledger"
                    description="See investor-aware debit, credit, and running-balance movements in ledger format."
                    icon="pi pi-book"
                    note="Opens with the same investor/account scope and date window."
                    actionLabel="Open ledger"
                    onOpen={() => openReport('/apps/wealth/ledger')}
                />
            </div>
            <div className="col-12 md:col-6 xl:col-4">
                <StatementCard
                    title="Statement Pack"
                    description="Prepare one printable household, investor, or demat-account summary with holdings, realized P&L, dividends, and recent activity together."
                    icon="pi pi-print"
                    note="Use this when the client wants one consolidated PDF-style review instead of separate reports."
                    actionLabel="Open statement pack"
                    onOpen={() => openReport('/apps/wealth/statements/pack')}
                />
            </div>
            <div className="col-12 md:col-6 xl:col-4">
                <StatementCard
                    title="Import More Data"
                    description="Jump back into onboarding when a household still needs opening balances or transaction uploads."
                    icon="pi pi-upload"
                    note="Use this when a report looks incomplete because source data is still missing."
                    actionLabel="Open import"
                    onOpen={() => navigate('/apps/wealth/import?mode=transactions')}
                />
            </div>
        </div>
    );
}