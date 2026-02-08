'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import type { Dropdown } from 'primereact/dropdown';
import { Link } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import VoucherTypeAutoComplete from '@/components/VoucherTypeAutoComplete';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { useVoucherTypeOptions } from '@/lib/accounts/voucherTypes';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';

interface PostingRow {
    id: number;
    voucherId: number | null;
    date: string | null;
    voucherNo: string | null;
    voucherType: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    groupName: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    isCancelledFlag: number | null;
    reconciliationDateText: string | null;
    reconciliationRemark: string | null;
}

const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                groupName
            }
        }
    }
`;

const POSTING_DETAILS = gql`
    query PostingDetails(
        $search: String
        $ledgerId: Int
        $voucherTypeId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $reconciled: Int
        $limit: Int
        $offset: Int
    ) {
        postingDetails(
            search: $search
            ledgerId: $ledgerId
            voucherTypeId: $voucherTypeId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            reconciled: $reconciled
            limit: $limit
            offset: $offset
        ) {
            items {
                id
                voucherId
                date
                voucherNo
                voucherType
                ledgerId
                ledgerName
                groupName
                narration
                debit
                credit
                isCancelledFlag
                reconciliationDateText
                reconciliationRemark
            }
            totalCount
            debitTotal
            creditTotal
        }
    }
`;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDate = (value: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()))
        return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return trimmed;
};

export default function AccountsAuditPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const [search, setSearch] = useState('');
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [voucherTypeId, setVoucherTypeId] = useState<number | null>(null);
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        initialRangeRef.current.start ?? null,
        initialRangeRef.current.end ?? null
    ]);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(-1);
    const [reconciled, setReconciled] = useState<-1 | 0 | 1>(-1);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const cancelledInputRef = useRef<Dropdown>(null);
    const reconciledInputRef = useRef<Dropdown>(null);

    useEffect(() => {
        setPageTitle('Audit (Posting Details)');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const { data: ledgerData } = useQuery(LEDGER_LOOKUP, { variables: { search: null, limit: 500 } });
    const { options: voucherTypeOptions, loading: voucherTypesLoading } = useVoucherTypeOptions();

    const fromDate = dateRange[0] ? toDateText(dateRange[0]) : null;
    const toDate = dateRange[1] ? toDateText(dateRange[1]) : null;
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const hasTouchedDatesRef = useRef(false);

    const registerVariables = useMemo(
        () => ({
            search: search.trim() ? search.trim() : null,
            ledgerId,
            voucherTypeId,
            fromDate,
            toDate,
            cancelled,
            reconciled,
            limit: rowsPerPage,
            offset: first
        }),
        [cancelled, first, fromDate, ledgerId, reconciled, rowsPerPage, search, toDate, voucherTypeId]
    );

    const [appliedVariables, setAppliedVariables] = useState<null | typeof registerVariables>(null);
    const hasApplied = appliedVariables !== null;

    const { data, loading, error, refetch } = useQuery(POSTING_DETAILS, {
        variables: appliedVariables ?? registerVariables,
        skip: !appliedVariables
    });

    const ledgerOptions = useMemo(() => {
        const rows = ledgerData?.ledgerSummaries?.items ?? [];
        return [{ label: 'All ledgers', value: null }].concat(
            rows.map((l: any) => ({
                label: `${l.name ?? ''}${l.groupName ? ` (${l.groupName})` : ''}`.trim() || `Ledger ${l.ledgerId}`,
                value: Number(l.ledgerId)
            }))
        );
    }, [ledgerData]);

    const focusDropdown = (ref: React.RefObject<Dropdown>) => {
        ref.current?.focus?.();
    };

    useEffect(() => {
        const handle = setTimeout(() => {
            const shouldValidate = Boolean(dateRange[0] || dateRange[1]);
            if (shouldValidate) {
                const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
                if (!validation.ok) {
                    setDateErrors(validation.errors);
                    return;
                }
            }
            setDateErrors({});
            setFirst(0);
        }, 300);
        return () => clearTimeout(handle);
    }, [dateRange, fiscalRange]);

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        initialRangeRef.current = range;
        setDateRange([range.start ?? null, range.end ?? null]);
    }, [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    const rows: PostingRow[] = useMemo(
        () => (hasApplied ? data?.postingDetails?.items ?? [] : []),
        [data, hasApplied]
    );
    const totalCount = hasApplied ? data?.postingDetails?.totalCount ?? rows.length ?? 0 : 0;
    const debitTotal = hasApplied ? data?.postingDetails?.debitTotal ?? rows.reduce((sum: number, r: PostingRow) => sum + r.debit, 0) : 0;
    const creditTotal = hasApplied ? data?.postingDetails?.creditTotal ?? rows.reduce((sum: number, r: PostingRow) => sum + r.credit, 0) : 0;

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate: dateRange[0], toDate: dateRange[1] });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (!hasApplied) {
            setAppliedVariables({ ...registerVariables, offset: 0 });
            return;
        }
        const nextVariables = { ...registerVariables, offset: 0 };
        setAppliedVariables(nextVariables);
        void refetch(nextVariables);
    };

    return (
        <div className="card">
            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Audit (Posting Details)</h2>
                        <p className="mt-2 mb-0 text-600">Posting details report for audit and troubleshooting.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/apps/accounts/ledger-reconciliation">
                            <Button label="Ledger Reconciliation" icon="pi pi-check-square" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts/voucher-entry">
                            <Button label="Voucher Entry" icon="pi pi-pencil" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading posting details: {error.message}</p>}
            </div>

            <AppDataTable
                value={rows}
                paginator
                rows={rowsPerPage}
                rowsPerPageOptions={[20, 50, 100]}
                totalRecords={totalCount}
                lazy
                first={first}
                onPage={(e) => {
                    setRowsPerPage(e.rows);
                    setFirst(e.first);
                    if (!hasApplied) return;
                    const nextVariables = { ...registerVariables, limit: e.rows, offset: e.first };
                    setAppliedVariables(nextVariables);
                    refetch(nextVariables);
                }}
                dataKey="id"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <>
                        <div className="flex align-items-center gap-2">
                            <AppDateInput
                                value={dateRange[0]}
                                onChange={(value) => {
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [value, prev[1]]);
                                    setDateErrors({});
                                }}
                                placeholder="From date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                autoFocus
                                selectOnFocus
                                style={{ width: '130px' }}
                            />
                            <AppDateInput
                                value={dateRange[1]}
                                onChange={(value) => {
                                    hasTouchedDatesRef.current = true;
                                    setDateRange((prev) => [prev[0], value]);
                                    setDateErrors({});
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputRef={toDateInputRef}
                                onEnterNext={() => searchInputRef.current?.focus()}
                                style={{ width: '130px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <span className="p-input-icon-left" style={{ minWidth: '260px' }}>
                            <i className="pi pi-search" />
                            <InputText
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search ledger / voucher / narration"
                                inputRef={searchInputRef}
                                style={{ width: '100%' }}
                            />
                        </span>
                        <AppDropdown
                            value={ledgerId}
                            options={ledgerOptions}
                            onChange={(e) => setLedgerId(e.value)}
                            placeholder="Ledger"
                            filter
                            showClear
                            style={{ minWidth: '260px' }}
                        />
                        <VoucherTypeAutoComplete
                            value={voucherTypeId}
                            options={voucherTypeOptions}
                            loading={voucherTypesLoading}
                            onChange={(nextValue) => setVoucherTypeId(nextValue)}
                            placeholder="Voucher type"
                            loadingPlaceholder="Loading voucher types..."
                            onSelectNext={() => focusDropdown(cancelledInputRef)}
                            style={{ minWidth: '200px' }}
                        />
                        <AppDropdown
                            value={cancelled}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Not cancelled', value: 0 },
                                { label: 'Cancelled', value: 1 }
                            ]}
                            onChange={(e) => setCancelled(e.value)}
                            placeholder="Status"
                            onEnterNext={() => focusDropdown(reconciledInputRef)}
                            ref={cancelledInputRef}
                            style={{ minWidth: '160px' }}
                        />
                        <AppDropdown
                            value={reconciled}
                            options={[
                                { label: 'All', value: -1 },
                                { label: 'Unreconciled', value: 0 },
                                { label: 'Reconciled', value: 1 }
                            ]}
                            onChange={(e) => setReconciled(e.value)}
                            placeholder="Reconciled"
                            ref={reconciledInputRef}
                            style={{ minWidth: '170px' }}
                        />
                    </>
                }
                headerRight={
                    <>
                        <Tag value={`Dr ${formatAmount(debitTotal)}`} severity="info" />
                        <Tag value={`Cr ${formatAmount(creditTotal)}`} severity="secondary" />
                        <Button label="Refresh" icon="pi pi-refresh" onClick={handleRefresh} />
                        <Button label="Print" icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
                    </>
                }
                recordSummary={`${rows.length} row${rows.length === 1 ? '' : 's'} • Total ${totalCount}`}
            >
                <Column
                    field="date"
                    header="Date"
                    body={(r: PostingRow) => formatDate(r.date)}
                    sortable
                    style={{ width: '8rem' }}
                />
                <Column field="voucherNo" header="Voucher No" sortable style={{ width: '7rem' }} />
                <Column field="voucherType" header="Type" sortable style={{ width: '9rem' }} />
                <Column
                    header="Ledger"
                    body={(r: PostingRow) => (
                        <span>
                            {r.ledgerName}
                            {r.groupName ? <span className="text-600"> ({r.groupName})</span> : null}
                        </span>
                    )}
                    style={{ width: '18rem' }}
                />
                <Column field="narration" header="Narration" body={(r: PostingRow) => r.narration ?? ''} />
                <Column
                    field="debit"
                    header="Dr"
                    body={(r: PostingRow) => (r.debit ? formatAmount(r.debit) : '')}
                    style={{ width: '8.5rem', textAlign: 'right' }}
                />
                <Column
                    field="credit"
                    header="Cr"
                    body={(r: PostingRow) => (r.credit ? formatAmount(r.credit) : '')}
                    style={{ width: '8.5rem', textAlign: 'right' }}
                />
                <Column
                    header="Recon Date"
                    body={(r: PostingRow) => formatDate(r.reconciliationDateText)}
                    style={{ width: '9rem' }}
                />
                <Column header="Recon Remark" body={(r: PostingRow) => r.reconciliationRemark ?? ''} />
                <Column
                    header="Status"
                    body={(r: PostingRow) =>
                        r.isCancelledFlag === 1 ? <Tag value="Cancelled" severity="danger" /> : <Tag value="OK" severity="success" />
                    }
                    style={{ width: '7rem' }}
                />
            </AppDataTable>
        </div>
    );
}
