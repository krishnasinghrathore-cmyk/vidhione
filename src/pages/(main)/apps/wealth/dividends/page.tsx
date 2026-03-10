'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, gql } from '@apollo/client';
import { z } from 'zod';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { toYmdOrEmpty, toYmdOrNull } from '@/lib/date';
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

type DividendRow = {
    id: string;
    tdate: string;
    qty: string;
    price: string;
    fees: string;
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

type DividendTableRow = DividendRow & {
    investorLabel: string;
    accountLabel: string;
    companyLabel: string;
    shares: number;
    rate: number;
    grossAmount: number;
    tdsAmount: number;
    netAmount: number;
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

const DIVIDENDS_PAGE = gql`
    query DividendsPage($fromDate: String, $toDate: String, $accountId: String, $investorProfileId: String, $securityId: String, $limit: Int, $offset: Int) {
        transactionsPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, investorProfileId: $investorProfileId, securityId: $securityId, limit: $limit, offset: $offset, ttype: "DIVIDEND") {
            items {
                id
                tdate
                qty
                price
                fees
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

const UPSERT_TRANSACTION = gql`
    mutation UpsertTransaction(
        $accountId: String!
        $securityId: String!
        $tdate: String!
        $ttype: String!
        $qty: String!
        $price: String!
        $fees: String
        $notes: String
        $sourceDoc: String
    ) {
        upsertTransaction(
            accountId: $accountId
            securityId: $securityId
            tdate: $tdate
            ttype: $ttype
            qty: $qty
            price: $price
            fees: $fees
            notes: $notes
            sourceDoc: $sourceDoc
        ) {
            id
        }
    }
`;

const dividendSchema = z.object({
    accountId: z.string().min(1, 'Account is required'),
    securityId: z.string().min(1, 'Security is required'),
    tdate: z.date(),
    qty: z.number().positive('Shares must be > 0'),
    price: z.number().nonnegative('Rate must be >= 0'),
    fees: z.number().nonnegative('TDS must be >= 0').optional(),
    sourceDoc: z.string().optional(),
    notes: z.string().optional()
});

const isoDate = (value: Date | null) => toYmdOrEmpty(value);
const isoDateOrNull = (value: Date | null) => toYmdOrNull(value);

const parseNumber = (value: string | number | null | undefined) => {
    const numeric = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatAmount = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return '-';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

export default function WealthDividendsPage() {
    const [searchParams] = useSearchParams();
    const initialSearch = useMemo(() => parseWealthReportSearchParams(searchParams), [searchParams]);
    const toastRef = useRef<Toast>(null);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);

    const [fromDate, setFromDate] = useState<Date | null>(initialSearch.fromDate);
    const [toDate, setToDate] = useState<Date | null>(initialSearch.toDate);
    const [accountId, setAccountId] = useState<string>(initialSearch.accountId);
    const [investorProfileId, setInvestorProfileId] = useState<string>(initialSearch.investorProfileId);
    const [securityId, setSecurityId] = useState<string>(initialSearch.securityId);

    const [form, setForm] = useState<{
        accountId: string;
        securityId: string;
        tdate: Date | null;
        qty: number | null;
        price: number | null;
        fees: number | null;
        sourceDoc: string;
        notes: string;
    }>({
        accountId: '',
        securityId: '',
        tdate: new Date(),
        qty: null,
        price: null,
        fees: 0,
        sourceDoc: '',
        notes: ''
    });
    const [formError, setFormError] = useState<string | null>(null);

    const { data: accountsData } = useQuery(WEALTH_ACCOUNTS_QUERY, { client: wealthApolloClient });
    const { data: investorProfilesData } = useQuery(WEALTH_INVESTOR_PROFILES_QUERY, { client: wealthApolloClient });
    const { data: securitiesData } = useQuery(SECURITIES_QUERY, { client: wealthApolloClient });

    const accounts: WealthDematAccount[] = accountsData?.accounts ?? [];
    const securities: Security[] = securitiesData?.securities ?? [];

    const filteredAccounts = useMemo(() => {
        if (!investorProfileId) return accounts;
        return accounts.filter((account) => account.investorProfileId === investorProfileId);
    }, [accounts, investorProfileId]);

    const filterAccountOptions = useMemo(
        () => filteredAccounts.map((account) => ({ label: formatAccountLabel(account), value: account.id })),
        [filteredAccounts]
    );
    const formAccountOptions = useMemo(
        () => accounts.map((account) => ({ label: formatAccountLabel(account), value: account.id })),
        [accounts]
    );
    const investorProfileOptions = useMemo(
        () => (investorProfilesData?.investorProfiles ?? []).map((profile: WealthInvestorProfile) => ({
            label: formatInvestorProfileLabel(profile),
            value: profile.id
        })),
        [investorProfilesData]
    );
    const securityOptions = useMemo(
        () => securities.map((security) => ({ label: security.symbol || security.name, value: security.id })),
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

    const { data, loading, error, refetch } = useQuery(DIVIDENDS_PAGE, {
        client: wealthApolloClient,
        variables: {
            fromDate: isoDateOrNull(fromDate),
            toDate: isoDateOrNull(toDate),
            accountId: accountId || null,
            investorProfileId: investorProfileId || null,
            securityId: securityId || null,
            limit: rowsPerPage,
            offset: first
        }
    });

    const page = data?.transactionsPage;
    const rows: DividendRow[] = page?.items ?? [];
    const tableRows: DividendTableRow[] = useMemo(
        () =>
            rows.map((row) => {
                const shares = parseNumber(row.qty);
                const rate = parseNumber(row.price);
                const tdsAmount = parseNumber(row.fees);
                const grossAmount = shares * rate;
                return {
                    ...row,
                    investorLabel: row.investorProfileName || (row.accountId ? accountById[row.accountId]?.investorProfileName || '-' : '-'),
                    accountLabel: row.accountName
                        ? row.accountCode
                            ? `${row.accountName} (${row.accountCode})`
                            : row.accountName
                        : row.accountId
                          ? formatAccountLabel(accountById[row.accountId] ?? { id: row.accountId, name: row.accountId })
                          : '-',
                    companyLabel: row.symbol || row.name || row.securityId || '-',
                    shares,
                    rate,
                    grossAmount,
                    tdsAmount,
                    netAmount: grossAmount - tdsAmount
                };
            }),
        [accountById, rows]
    );
    const totalRecords = page?.meta?.total ?? tableRows.length;

    const [saveDividend, { loading: saving }] = useMutation(UPSERT_TRANSACTION, { client: wealthApolloClient });

    const grossAmount = form.qty != null && form.price != null ? form.qty * form.price : null;
    const tdsAmount = form.fees ?? 0;
    const netAmount = grossAmount == null ? null : grossAmount - tdsAmount;

    const pageTotals = useMemo(() => {
        return tableRows.reduce(
            (totals, row) => {
                totals.gross += row.grossAmount;
                totals.tds += row.tdsAmount;
                totals.net += row.netAmount;
                return totals;
            },
            { gross: 0, tds: 0, net: 0 }
        );
    }, [tableRows]);

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = dividendSchema.safeParse({
            accountId: form.accountId,
            securityId: form.securityId,
            tdate: form.tdate,
            qty: form.qty ?? Number.NaN,
            price: form.price ?? Number.NaN,
            fees: form.fees ?? 0,
            sourceDoc: form.sourceDoc,
            notes: form.notes
        });

        if (!parsed.success) {
            setFormError(parsed.error.issues[0]?.message ?? 'Fix validation errors');
            toastRef.current?.show({ severity: 'warn', summary: 'Fix validation errors' });
            return;
        }

        setFormError(null);

        try {
            await saveDividend({
                variables: {
                    accountId: parsed.data.accountId,
                    securityId: parsed.data.securityId,
                    tdate: isoDate(parsed.data.tdate),
                    ttype: 'DIVIDEND',
                    qty: parsed.data.qty.toString(),
                    price: parsed.data.price.toString(),
                    fees: (parsed.data.fees ?? 0).toString(),
                    notes: parsed.data.notes?.trim() || null,
                    sourceDoc: parsed.data.sourceDoc?.trim() || null
                }
            });

            setForm((previous) => ({ ...previous, qty: null, price: null, fees: 0, sourceDoc: '', notes: '' }));
            setFirst(0);
            await refetch({
                fromDate: isoDateOrNull(fromDate),
                toDate: isoDateOrNull(toDate),
                accountId: accountId || null,
                investorProfileId: investorProfileId || null,
                securityId: securityId || null,
                limit: rowsPerPage,
                offset: 0
            });
            toastRef.current?.show({ severity: 'success', summary: 'Dividend saved' });
        } catch (mutationError: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: mutationError.message });
        }
    };

    const clearFilters = () => {
        setFromDate(null);
        setToDate(null);
        setAccountId('');
        setInvestorProfileId('');
        setSecurityId('');
        setFirst(0);
        refetch({
            fromDate: null,
            toDate: null,
            accountId: null,
            investorProfileId: null,
            securityId: null,
            limit: rowsPerPage,
            offset: 0
        });
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />

            <div className="mb-3">
                <h2 className="m-0">Dividend Register</h2>
                <p className="mt-2 mb-0 text-600">Track dividend receipts, TDS, and net amounts with investor and demat-account context for each family member.</p>
            </div>

            <form className="grid mb-4" onSubmit={handleSave}>
                <div className="col-12 md:col-4 flex flex-column gap-1">
                    <label className="font-medium">Account</label>
                    <AppDropdown
                        value={form.accountId}
                        options={formAccountOptions}
                        onChange={(e) => setForm((previous) => ({ ...previous, accountId: e.value ?? '' }))}
                        placeholder="Select account"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-4 flex flex-column gap-1">
                    <label className="font-medium">Security</label>
                    <AppDropdown
                        value={form.securityId}
                        options={securityOptions}
                        onChange={(e) => setForm((previous) => ({ ...previous, securityId: e.value ?? '' }))}
                        placeholder="Select security"
                        filter
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-4 flex flex-column gap-1">
                    <label className="font-medium">Date</label>
                    <AppDateInput value={form.tdate} onChange={(value) => setForm((previous) => ({ ...previous, tdate: value }))} disabled={saving} />
                </div>

                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">No. of Shares</label>
                    <InputNumber
                        value={form.qty ?? undefined}
                        onValueChange={(e) => setForm((previous) => ({ ...previous, qty: e.value ?? null }))}
                        mode="decimal"
                        minFractionDigits={0}
                        maxFractionDigits={6}
                        inputClassName="w-full"
                        className="w-full"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">Rate / Share</label>
                    <InputNumber
                        value={form.price ?? undefined}
                        onValueChange={(e) => setForm((previous) => ({ ...previous, price: e.value ?? null }))}
                        mode="decimal"
                        minFractionDigits={2}
                        inputClassName="w-full"
                        className="w-full"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">TDS</label>
                    <InputNumber
                        value={form.fees ?? undefined}
                        onValueChange={(e) => setForm((previous) => ({ ...previous, fees: e.value ?? null }))}
                        mode="decimal"
                        minFractionDigits={2}
                        inputClassName="w-full"
                        className="w-full"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">Net Amount</label>
                    <InputText value={formatAmount(netAmount)} disabled />
                </div>

                <div className="col-12 md:col-6 flex flex-column gap-1">
                    <label className="font-medium">Source Doc (optional)</label>
                    <InputText
                        value={form.sourceDoc}
                        onChange={(e) => setForm((previous) => ({ ...previous, sourceDoc: e.target.value }))}
                        placeholder="Bank or depository reference"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-6 flex flex-column gap-1">
                    <label className="font-medium">Notes (optional)</label>
                    <InputText
                        value={form.notes}
                        onChange={(e) => setForm((previous) => ({ ...previous, notes: e.target.value }))}
                        placeholder="Optional remarks"
                        disabled={saving}
                    />
                </div>

                <div className="col-12 flex align-items-center gap-2 flex-wrap">
                    <Button type="submit" label={saving ? 'Saving...' : 'Save Dividend'} icon="pi pi-check" disabled={saving} />
                    <span className="text-600 text-sm">
                        Gross: {formatAmount(grossAmount)} | TDS: {formatAmount(tdsAmount)} | Net: {formatAmount(netAmount)}
                    </span>
                </div>
                {formError && (
                    <div className="col-12">
                        <small className="p-error">{formError}</small>
                    </div>
                )}
            </form>

            {error && <p className="text-red-500 mb-3">Error loading dividends: {error.message}</p>}

            <AppDataTable
                value={tableRows}
                paginator
                rows={rowsPerPage}
                first={first}
                totalRecords={totalRecords}
                lazy
                loading={loading}
                dataKey="id"
                exportFileName="wealth-dividend-register"
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    refetch({
                        fromDate: isoDateOrNull(fromDate),
                        toDate: isoDateOrNull(toDate),
                        accountId: accountId || null,
                        investorProfileId: investorProfileId || null,
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
                            <label className="text-600 text-sm">Investor</label>
                            <AppDropdown value={investorProfileId} options={investorProfileOptions} onChange={(e) => setInvestorProfileId(e.value ?? '')} placeholder="All" showClear />
                        </span>
                        <span className="flex align-items-center gap-2">
                            <label className="text-600 text-sm">Account</label>
                            <AppDropdown value={accountId} options={filterAccountOptions} onChange={(e) => setAccountId(e.value ?? '')} placeholder="All" showClear />
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
                                    fromDate: isoDateOrNull(fromDate),
                                    toDate: isoDateOrNull(toDate),
                                    accountId: accountId || null,
                                    investorProfileId: investorProfileId || null,
                                    securityId: securityId || null,
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
                recordSummary={page?.meta ? `Showing ${tableRows.length} of ${page.meta.total} | Page gross ${formatAmount(pageTotals.gross)} | Page net ${formatAmount(pageTotals.net)}` : undefined}
                emptyMessage="No dividend entries found"
                stripedRows
                size="small"
            >
                <Column field="tdate" header="Date" style={{ width: '8rem' }} />
                <Column field="investorLabel" header="Investor" />
                <Column field="accountLabel" header="Account" />
                <Column field="companyLabel" header="Company" />
                <Column field="isin" header="ISIN" body={(row: DividendTableRow) => row.isin || '-'} />
                <Column field="shares" header="Shares" body={(row: DividendTableRow) => formatAmount(row.shares)} style={{ textAlign: 'right' }} />
                <Column field="rate" header="Rate" body={(row: DividendTableRow) => formatAmount(row.rate)} style={{ textAlign: 'right' }} />
                <Column field="grossAmount" header="Gross" body={(row: DividendTableRow) => formatAmount(row.grossAmount)} style={{ textAlign: 'right' }} />
                <Column field="tdsAmount" header="TDS" body={(row: DividendTableRow) => formatAmount(row.tdsAmount)} style={{ textAlign: 'right' }} />
                <Column field="netAmount" header="Net" body={(row: DividendTableRow) => formatAmount(row.netAmount)} style={{ textAlign: 'right' }} />
                <Column field="sourceDoc" header="Source" body={(row: DividendTableRow) => row.sourceDoc || '-'} />
            </AppDataTable>
        </div>
    );
}
