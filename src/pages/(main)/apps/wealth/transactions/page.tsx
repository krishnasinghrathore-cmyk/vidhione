'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import AppDataTable from '@/components/AppDataTable';
import AppInput from '@/components/AppInput';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { extractWealthSegment, stripWealthMetaTags } from '@/lib/wealthNotes';
import {
    WEALTH_ACCOUNTS_QUERY,
    WEALTH_INVESTOR_PROFILES_QUERY,
    type WealthDematAccount,
    type WealthInvestorProfile,
    formatAccountLabel,
    formatInvestorProfileLabel
} from '../shared';
import { toYmdOrNull } from '@/lib/date';
import { parseWealthReportSearchParams } from '../reportSearchParams';

type Security = { id: string; isin?: string | null; symbol?: string | null; name: string };

type TransactionRow = {
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
    accountId?: string | null;
    accountName?: string | null;
    accountCode?: string | null;
    investorProfileId?: string | null;
    investorProfileName?: string | null;
    securityId?: string | null;
    isin?: string | null;
    symbol?: string | null;
    name?: string | null;
};

type TransactionTableRow = TransactionRow & {
    securityLabel: string;
    investorLabel: string;
    accountLabel: string;
    notesText: string;
};

type SourceDocSummary = {
    sourceDoc: string;
    rowCount: number;
    firstDate: string;
    lastDate: string;
    typeLabels: string;
    accountLabels: string;
    investorLabels: string;
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

const TRANSACTIONS_PAGE = gql`
    query TransactionsPage($fromDate: String, $toDate: String, $ttype: String, $sourceDoc: String, $segment: String, $securityId: String, $accountId: String, $investorProfileId: String, $limit: Int, $offset: Int) {
        transactionsPage(fromDate: $fromDate, toDate: $toDate, ttype: $ttype, sourceDoc: $sourceDoc, segment: $segment, securityId: $securityId, accountId: $accountId, investorProfileId: $investorProfileId, limit: $limit, offset: $offset) {
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
                accountName
                accountCode
                investorProfileId
                investorProfileName
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
    const [searchParams] = useSearchParams();
    const initialSearch = useMemo(() => parseWealthReportSearchParams(searchParams), [searchParams]);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);

    const [fromDate, setFromDate] = useState<Date | null>(initialSearch.fromDate);
    const [toDate, setToDate] = useState<Date | null>(initialSearch.toDate);
    const [accountId, setAccountId] = useState<string>(initialSearch.accountId);
    const [investorProfileId, setInvestorProfileId] = useState<string>(initialSearch.investorProfileId);
    const [securityId, setSecurityId] = useState<string>(initialSearch.securityId);
    const [ttype, setTtype] = useState<string>(initialSearch.ttype);
    const [sourceDoc, setSourceDoc] = useState(initialSearch.sourceDoc);
    const [segment, setSegment] = useState<string>(initialSearch.segment);

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
        () => securities.map((security: Security) => ({ label: security.symbol || security.name, value: security.id })),
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

    const buildQueryVariables = (limitValue = rowsPerPage, offsetValue = first) => ({
        fromDate: isoDate(fromDate),
        toDate: isoDate(toDate),
        ttype: ttype || null,
        sourceDoc: sourceDoc.trim() || null,
        segment: segment || null,
        accountId: accountId || null,
        investorProfileId: investorProfileId || null,
        securityId: securityId || null,
        limit: limitValue,
        offset: offsetValue
    });

    const { data, loading, error, refetch } = useQuery(TRANSACTIONS_PAGE, {
        client: wealthApolloClient,
        variables: buildQueryVariables(rowsPerPage, first)
    });

    const rows: TransactionRow[] = data?.transactionsPage?.items ?? [];
    const tableRows: TransactionTableRow[] = useMemo(
        () =>
            rows.map((row) => ({
                ...row,
                securityLabel: row.symbol || row.name || row.isin || row.securityId || '-',
                investorLabel: row.investorProfileName || (row.accountId ? accountById[row.accountId]?.investorProfileName || '-' : '-'),
                accountLabel: row.accountName
                    ? row.accountCode
                        ? `${row.accountName} (${row.accountCode})`
                        : row.accountName
                    : row.accountId
                      ? formatAccountLabel(accountById[row.accountId] ?? { id: row.accountId, name: row.accountId })
                      : '-',
                notesText: stripWealthMetaTags(row.notes ?? '')
            })),
        [accountById, rows]
    );
    const meta = data?.transactionsPage?.meta;
    const totalRecords = meta?.total ?? tableRows.length;
    const sourceDocSummaries = useMemo<SourceDocSummary[]>(() => {
        const summaryBySourceDoc = new Map<
            string,
            {
                sourceDoc: string;
                rowCount: number;
                firstDate: string;
                lastDate: string;
                typeSet: Set<string>;
                accountSet: Set<string>;
                investorSet: Set<string>;
            }
        >();

        tableRows.forEach((row) => {
            const sourceDocLabel = row.sourceDoc?.trim() || 'Manual / Unspecified';
            const existing = summaryBySourceDoc.get(sourceDocLabel);
            if (existing) {
                existing.rowCount += 1;
                if (row.tdate < existing.firstDate) existing.firstDate = row.tdate;
                if (row.tdate > existing.lastDate) existing.lastDate = row.tdate;
                existing.typeSet.add(row.ttype);
                if (row.accountLabel && row.accountLabel !== '-') existing.accountSet.add(row.accountLabel);
                if (row.investorLabel && row.investorLabel !== '-') existing.investorSet.add(row.investorLabel);
                return;
            }

            summaryBySourceDoc.set(sourceDocLabel, {
                sourceDoc: sourceDocLabel,
                rowCount: 1,
                firstDate: row.tdate,
                lastDate: row.tdate,
                typeSet: new Set(row.ttype ? [row.ttype] : []),
                accountSet: new Set(row.accountLabel && row.accountLabel !== '-' ? [row.accountLabel] : []),
                investorSet: new Set(row.investorLabel && row.investorLabel !== '-' ? [row.investorLabel] : [])
            });
        });

        return Array.from(summaryBySourceDoc.values())
            .map((item) => ({
                sourceDoc: item.sourceDoc,
                rowCount: item.rowCount,
                firstDate: item.firstDate,
                lastDate: item.lastDate,
                typeLabels: Array.from(item.typeSet).join(', ') || '-',
                accountLabels: Array.from(item.accountSet).join(', ') || '-',
                investorLabels: Array.from(item.investorSet).join(', ') || '-'
            }))
            .sort((left, right) => right.rowCount - left.rowCount || left.sourceDoc.localeCompare(right.sourceDoc));
    }, [tableRows]);
    const batchSummaryNote = useMemo(() => {
        const trimmedSourceDoc = sourceDoc.trim();
        if (trimmedSourceDoc) {
            return `Batch summary for source-doc matches containing "${trimmedSourceDoc}" on the current result set.`;
        }
        if (meta && meta.total > tableRows.length && sourceDocSummaries.length > 0) {
            return 'Batch summary is based on the transactions visible on the current page.';
        }
        if (sourceDocSummaries.length > 0) {
            return 'Batch summary groups the currently visible transactions by source document.';
        }
        return '';
    }, [meta, sourceDoc, sourceDocSummaries.length, tableRows.length]);
    const applyFilters = (limitValue = rowsPerPage, offsetValue = 0) => {
        setRowsPerPage(limitValue);
        setFirst(offsetValue);
        refetch(buildQueryVariables(limitValue, offsetValue));
    };
    const exportFileName = useMemo(() => {
        const sourceDocSuffix = sourceDoc.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
        return sourceDocSuffix ? `wealth-transactions-${sourceDocSuffix}` : 'wealth-transactions';
    }, [sourceDoc]);
    const recordSummary = useMemo(() => {
        if (!meta) return undefined;
        const baseSummary = `Showing ${tableRows.length} of ${meta.total}`;
        if (!sourceDoc.trim()) return baseSummary;
        return `${baseSummary} for source doc "${sourceDoc.trim()}"`;
    }, [meta, sourceDoc, tableRows.length]);

    const segmentBody = (row: TransactionTableRow) => {
        const resolvedSegment = row.segment || extractWealthSegment(row.notes) || 'CASH';
        const severity = resolvedSegment === 'CASH' ? 'info' : 'warning';
        return <Tag value={resolvedSegment} severity={severity} />;
    };

    const notesBody = (row: TransactionTableRow) => {
        if (!row.notesText) return '';
        if (row.notesText.length <= 60) return row.notesText;
        return `${row.notesText.slice(0, 60)}...`;
    };

    const clearFilters = () => {
        setFromDate(null);
        setToDate(null);
        setAccountId('');
        setInvestorProfileId('');
        setSecurityId('');
        setTtype('');
        setSourceDoc('');
        setSegment('');
        setFirst(0);
        refetch({
            fromDate: null,
            toDate: null,
            ttype: null,
            sourceDoc: null,
            segment: null,
            accountId: null,
            investorProfileId: null,
            securityId: null,
            limit: rowsPerPage,
            offset: 0
        });
    };

    return (
        <div className="card">
            <div className="mb-3">
                <h2 className="m-0">Transactions</h2>
                <p className="mt-2 mb-0 text-600">Raw BUY/SELL/DIVIDEND ledger entries with investor and demat-account context for household reporting.</p>
            </div>

            {sourceDocSummaries.length > 0 && (
                <div className="mb-3 p-3 border-1 surface-border border-round surface-50">
                    <div className="flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
                        <div>
                            <div className="text-900 font-semibold">Visible Source-Doc Summary</div>
                            {batchSummaryNote && <div className="text-600 text-sm mt-1">{batchSummaryNote}</div>}
                        </div>
                        <div className="text-600 text-sm">{sourceDocSummaries.length} batch{sourceDocSummaries.length === 1 ? '' : 'es'}</div>
                    </div>
                    <div className="flex flex-column gap-2">
                        {sourceDocSummaries.map((summary) => (
                            <div key={summary.sourceDoc} className="border-1 surface-border border-round p-2 bg-white">
                                <div className="flex justify-content-between align-items-center gap-3 flex-wrap">
                                    <div className="font-medium text-900">{summary.sourceDoc}</div>
                                    <Tag value={`${summary.rowCount} txn`} severity="info" />
                                </div>
                                <div className="text-600 text-sm mt-2">Date Range: {summary.firstDate} to {summary.lastDate}</div>
                                <div className="text-600 text-sm mt-1">Types: {summary.typeLabels}</div>
                                <div className="text-600 text-sm mt-1">Investors: {summary.investorLabels}</div>
                                <div className="text-600 text-sm mt-1">Accounts: {summary.accountLabels}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && <p className="text-red-500 mb-3">Error loading transactions: {error.message}</p>}

            <AppDataTable
                value={tableRows}
                paginator
                rows={rowsPerPage}
                first={first}
                totalRecords={totalRecords}
                lazy
                loading={loading}
                dataKey="id"
                exportFileName={exportFileName}
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    refetch(buildQueryVariables(e.rows, e.first));
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
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Type</label>
                            <AppDropdown value={ttype} options={TX_TYPES} onChange={(e) => setTtype(e.value ?? '')} placeholder="All" showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Source Doc</label>
                            <AppInput
                                value={sourceDoc}
                                onChange={(e) => setSourceDoc(e.target.value)}
                                placeholder="Search batch / note"
                                style={{ width: '220px' }}
                            />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Segment</label>
                            <AppDropdown value={segment} options={TX_SEGMENTS} onChange={(e) => setSegment(e.value ?? '')} placeholder="All" showClear />
                        </span>
                    </>
                }
                headerRight={
                    <>
                        <Button label="Apply" icon="pi pi-filter" onClick={() => applyFilters(rowsPerPage, 0)} />
                        <Button label="Clear" icon="pi pi-times" className="p-button-text" onClick={clearFilters} />
                        <Button label="Export" icon="pi pi-download" />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-secondary"
                            onClick={() => refetch(buildQueryVariables(rowsPerPage, first))}
                        />
                    </>
                }
                recordSummary={recordSummary}
                emptyMessage="No transactions found"
                stripedRows
                size="small"
            >
                <Column field="tdate" header="Date" style={{ width: '8rem' }} />
                <Column field="invoiceDate" header="Inv Date" style={{ width: '8rem' }} />
                <Column field="ttype" header="Type" style={{ width: '7rem' }} />
                <Column field="segment" header="Seg" body={segmentBody} style={{ width: '6rem' }} />
                <Column field="securityLabel" header="Security" />
                <Column field="investorLabel" header="Investor" />
                <Column field="accountLabel" header="Account" />
                <Column field="qty" header="Qty" body={(row: TransactionTableRow) => formatNumber(row.qty, 2)} style={{ textAlign: 'right' }} />
                <Column field="price" header="Price" body={(row: TransactionTableRow) => formatNumber(row.price, 2)} style={{ textAlign: 'right' }} />
                <Column field="fees" header="Fees" body={(row: TransactionTableRow) => formatNumber(row.fees, 2)} style={{ textAlign: 'right' }} />
                <Column field="sourceDoc" header="Source Doc" body={(row: TransactionTableRow) => row.sourceDoc || ''} />
                <Column field="notesText" header="Notes" body={notesBody} />
            </AppDataTable>
        </div>
    );
}


