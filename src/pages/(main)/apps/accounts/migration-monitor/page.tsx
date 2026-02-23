'use client';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { LayoutContext } from '@/layout/context/layoutcontext';

const RECEIPT_MIGRATION_MONITOR = gql`
    query ReceiptMigrationMonitor($companyId: Int, $fromDate: String, $toDate: String) {
        receiptMigrationMonitor(companyId: $companyId, fromDate: $fromDate, toDate: $toDate) {
            hardFailureCount
            importRun {
                runId
                sourceDatabase
                status
                startedAt
                completedAt
                rowsLoaded
                errorMessage
            }
            importTableParity {
                tableName
                stagedCount
                targetCount
                isMatched
            }
            receiptRun {
                runId
                status
                startedAt
                finishedAt
                errorCount
                warningCount
            }
            receiptParity {
                legacyCashHeadersCount
                migratedCashHeadersCount
                legacyBankHeadersCount
                migratedBankHeadersCount
                legacyCashLinesCount
                migratedCashLinesCount
                legacyBankLinesCount
                migratedBankLinesCount
                cashHeaderDelta
                bankHeaderDelta
                cashLineDelta
                bankLineDelta
            }
            receiptErrorCounts {
                reasonCode
                count
            }
        }
    }
`;

type QueryVars = {
    companyId: number | null;
    fromDate: string | null;
    toDate: string | null;
};

const DATE_TEXT_PATTERN = /^\d{8}$/;

const parseDateText = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return DATE_TEXT_PATTERN.test(trimmed) ? trimmed : '__INVALID__';
};

const parseCompanyId = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.trunc(parsed);
};

const formatCount = (value: number | null | undefined): string => {
    if (value == null || Number.isNaN(Number(value))) return '-';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value));
};

const resolveStatusSeverity = (status: string | null | undefined): 'success' | 'warning' | 'danger' | 'info' => {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'applied' || normalized === 'success' || normalized === 'completed') return 'success';
    if (normalized === 'running') return 'warning';
    if (normalized === 'failed') return 'danger';
    return 'info';
};

export default function AccountsMigrationMonitorPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const [companyInput, setCompanyInput] = useState('1');
    const [fromInput, setFromInput] = useState('');
    const [toInput, setToInput] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [applied, setApplied] = useState<QueryVars>({ companyId: 1, fromDate: null, toDate: null });

    useEffect(() => {
        setPageTitle('Migration Monitor');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const variables = useMemo<QueryVars>(() => applied, [applied]);

    const { data, loading, error, refetch } = useQuery(RECEIPT_MIGRATION_MONITOR, {
        variables,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const monitor = data?.receiptMigrationMonitor;
    const tableParityRows = monitor?.importTableParity ?? [];
    const reasonRows = monitor?.receiptErrorCounts ?? [];
    const mismatchCount = tableParityRows.filter((row: { isMatched: boolean | null }) => row.isMatched === false).length;

    const applyFilters = () => {
        const companyId = parseCompanyId(companyInput);
        const fromDate = parseDateText(fromInput);
        const toDate = parseDateText(toInput);
        if (fromDate === '__INVALID__' || toDate === '__INVALID__') {
            setValidationError('Date filters must be empty or in YYYYMMDD format.');
            return;
        }
        setValidationError(null);
        setApplied({ companyId, fromDate, toDate });
    };

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-start gap-3 mb-3">
                        <div>
                            <h2 className="m-0">Receipt Migration Monitor</h2>
                            <p className="mt-2 mb-0 text-600">
                                Track MSSQL refresh counts, receipt migration parity, and reason-code errors.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                icon="pi pi-filter"
                                label="Apply"
                                onClick={applyFilters}
                                disabled={loading}
                            />
                            <Button
                                icon="pi pi-refresh"
                                label="Refresh"
                                outlined
                                onClick={() => {
                                    void refetch();
                                }}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="grid mb-2">
                        <div className="col-12 md:col-3">
                            <small className="text-600 block mb-2">Company Id (optional)</small>
                            <InputText value={companyInput} onChange={(e) => setCompanyInput(e.target.value)} className="w-full" />
                        </div>
                        <div className="col-12 md:col-3">
                            <small className="text-600 block mb-2">From (YYYYMMDD)</small>
                            <InputText value={fromInput} onChange={(e) => setFromInput(e.target.value)} className="w-full" />
                        </div>
                        <div className="col-12 md:col-3">
                            <small className="text-600 block mb-2">To (YYYYMMDD)</small>
                            <InputText value={toInput} onChange={(e) => setToInput(e.target.value)} className="w-full" />
                        </div>
                        <div className="col-12 md:col-3">
                            <small className="text-600 block mb-2">Hard Failures</small>
                            <Tag value={formatCount(monitor?.hardFailureCount ?? 0)} severity={(monitor?.hardFailureCount ?? 0) > 0 ? 'danger' : 'success'} />
                        </div>
                    </div>

                    {!!validationError && <Message severity="warn" text={validationError} className="w-full mb-3" />}
                    {error && <Message severity="error" text={error.message} className="w-full mb-3" />}

                    <div className="grid mb-3">
                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 surface-border border-round">
                                <div className="text-700 font-semibold mb-2">Latest MSSQL Refresh Run</div>
                                {!monitor?.importRun ? (
                                    <div className="text-500">No refresh run found.</div>
                                ) : (
                                    <div className="flex flex-column gap-2">
                                        <div className="flex align-items-center gap-2">
                                            <span className="text-600">Run:</span>
                                            <strong>{monitor.importRun.runId}</strong>
                                            <Tag value={(monitor.importRun.status ?? 'unknown').toUpperCase()} severity={resolveStatusSeverity(monitor.importRun.status)} />
                                        </div>
                                        <div className="text-600">Rows loaded: {formatCount(monitor.importRun.rowsLoaded)}</div>
                                        <div className="text-600">Source DB: {monitor.importRun.sourceDatabase ?? '-'}</div>
                                        <div className="text-600">Started: {monitor.importRun.startedAt ?? '-'}</div>
                                        <div className="text-600">Completed: {monitor.importRun.completedAt ?? '-'}</div>
                                        {monitor.importRun.errorMessage && (
                                            <Message severity="error" text={monitor.importRun.errorMessage} className="w-full" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 surface-border border-round">
                                <div className="text-700 font-semibold mb-2">Latest Receipt Migration Run</div>
                                {!monitor?.receiptRun ? (
                                    <div className="text-500">No receipt migration run found.</div>
                                ) : (
                                    <div className="flex flex-column gap-2">
                                        <div className="flex align-items-center gap-2">
                                            <span className="text-600">Run:</span>
                                            <strong>{monitor.receiptRun.runId}</strong>
                                            <Tag value={(monitor.receiptRun.status ?? 'unknown').toUpperCase()} severity={resolveStatusSeverity(monitor.receiptRun.status)} />
                                        </div>
                                        <div className="text-600">Errors: {formatCount(monitor.receiptRun.errorCount)}</div>
                                        <div className="text-600">Warnings: {formatCount(monitor.receiptRun.warningCount)}</div>
                                        <div className="text-600">Started: {monitor.receiptRun.startedAt ?? '-'}</div>
                                        <div className="text-600">Finished: {monitor.receiptRun.finishedAt ?? '-'}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <h3 className="mt-0 mb-2">Import Table Parity (staging vs accounts)</h3>
                    <p className="mt-0 mb-2 text-600">Mismatched tables: {mismatchCount}</p>
                    <DataTable value={tableParityRows} loading={loading} dataKey="tableName" responsiveLayout="scroll" className="mb-4">
                        <Column field="tableName" header="Table" />
                        <Column field="stagedCount" header="Staged Rows" body={(row) => formatCount(row.stagedCount)} />
                        <Column field="targetCount" header="Target Rows" body={(row) => formatCount(row.targetCount)} />
                        <Column
                            header="Match"
                            body={(row) => {
                                if (row.isMatched == null) return <Tag value="N/A" severity="info" />;
                                return <Tag value={row.isMatched ? 'OK' : 'MISMATCH'} severity={row.isMatched ? 'success' : 'danger'} />;
                            }}
                        />
                    </DataTable>

                    <h3 className="mt-0 mb-2">Receipt Parity Summary</h3>
                    <div className="grid mb-4">
                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 surface-border border-round">
                                <div className="text-700 font-semibold mb-2">Headers</div>
                                <div className="text-600">Cash: {formatCount(monitor?.receiptParity?.legacyCashHeadersCount)} vs {formatCount(monitor?.receiptParity?.migratedCashHeadersCount)} (delta {formatCount(monitor?.receiptParity?.cashHeaderDelta)})</div>
                                <div className="text-600">Bank: {formatCount(monitor?.receiptParity?.legacyBankHeadersCount)} vs {formatCount(monitor?.receiptParity?.migratedBankHeadersCount)} (delta {formatCount(monitor?.receiptParity?.bankHeaderDelta)})</div>
                            </div>
                        </div>
                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 surface-border border-round">
                                <div className="text-700 font-semibold mb-2">Bill Detail Lines</div>
                                <div className="text-600">Cash: {formatCount(monitor?.receiptParity?.legacyCashLinesCount)} vs {formatCount(monitor?.receiptParity?.migratedCashLinesCount)} (delta {formatCount(monitor?.receiptParity?.cashLineDelta)})</div>
                                <div className="text-600">Bank: {formatCount(monitor?.receiptParity?.legacyBankLinesCount)} vs {formatCount(monitor?.receiptParity?.migratedBankLinesCount)} (delta {formatCount(monitor?.receiptParity?.bankLineDelta)})</div>
                            </div>
                        </div>
                    </div>

                    <h3 className="mt-0 mb-2">Receipt Migration Errors (Latest Run)</h3>
                    <DataTable value={reasonRows} loading={loading} dataKey="reasonCode" responsiveLayout="scroll">
                        <Column field="reasonCode" header="Reason Code" />
                        <Column field="count" header="Count" body={(row) => formatCount(row.count)} />
                    </DataTable>
                </div>
            </div>
        </div>
    );
}
