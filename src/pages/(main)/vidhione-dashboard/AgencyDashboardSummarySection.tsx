'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { useAuth } from '@/lib/auth/context';
import {
    fetchAgencyDashboardSummary,
    type AgencyDashboardDeliveryRow,
    type AgencyDashboardSummary,
    type AgencyDashboardSummaryRow
} from '@/lib/invoicing/api';

type SummaryRow = AgencyDashboardSummaryRow;
type DeliveryRow = AgencyDashboardDeliveryRow;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const formatCount = (value: number) => new Intl.NumberFormat('en-IN').format(value);

const formatMonth = (key: string) => {
    const safe = key?.trim();
    if (!safe) return key;
    const date = new Date(`${safe}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const formatDay = (key: string) => {
    const safe = key?.trim();
    if (!safe) return key;
    const date = new Date(`${safe}T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const formatDayWithYear = (value: string) => {
    const safe = value?.trim();
    if (!safe) return value;
    const date = new Date(`${safe}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (value: Date) =>
    value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const formatLoadDuration = (valueMs: number) => {
    if (valueMs < 1000) return `${Math.round(valueMs)} ms`;
    if (valueMs < 10000) return `${(valueMs / 1000).toFixed(2)} s`;
    return `${(valueMs / 1000).toFixed(1)} s`;
};

type Props = {
    enabled: boolean;
};

export default function AgencyDashboardSummarySection({ enabled }: Props) {
    const { companyContext, loading: authLoading } = useAuth();
    const summaryRequestInFlightRef = useRef(false);
    const [collapsed, setCollapsed] = useState(false);
    const [summary, setSummary] = useState<AgencyDashboardSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [lastLoadDurationMs, setLastLoadDurationMs] = useState<number | null>(null);
    const companyFiscalYearId = companyContext?.companyFiscalYearId ?? null;
    const showSkeleton = (loading || authLoading) && !summary;

    const skeletonSummaryRows = useMemo<SummaryRow[]>(
        () =>
            Array.from({ length: 3 }, (_, idx) => ({
                periodKey: String(idx),
                totalCount: 0,
                totalAmount: 0
            })),
        []
    );

    const skeletonDeliveryRows = useMemo<DeliveryRow[]>(
        () =>
            Array.from({ length: 3 }, (_, idx) => ({
                periodKey: String(idx),
                totalInProcess: 0,
                totalPending: 0
            })),
        []
    );

    const loadSummary = useCallback(async () => {
        if (!enabled || authLoading) return;
        if (summaryRequestInFlightRef.current) return;
        summaryRequestInFlightRef.current = true;
        setLoading(true);
        setError(null);
        const startTime = performance.now();
        try {
            const nextSummary = await fetchAgencyDashboardSummary({
                companyFiscalYearId: companyFiscalYearId ?? undefined
            });
            setSummary(nextSummary);
            setLastRefreshedAt(new Date());
            setLastLoadDurationMs(performance.now() - startTime);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load summaries');
        } finally {
            summaryRequestInFlightRef.current = false;
            setLoading(false);
        }
    }, [enabled, authLoading, companyFiscalYearId]);

    useEffect(() => {
        if (!enabled || authLoading) return;
        loadSummary();
    }, [enabled, authLoading, loadSummary]);
    const dueInvoices = summary?.dueInvoices ?? [];
    const dueEstimates = summary?.dueEstimates ?? [];
    const deliveryMonthWise = summary?.deliveryMonthWise ?? [];
    const deliveryDayWise = summary?.deliveryDayWise ?? [];
    const dueInvoicesRows = showSkeleton ? skeletonSummaryRows : dueInvoices;
    const dueEstimatesRows = showSkeleton ? skeletonSummaryRows : dueEstimates;
    const deliveryMonthRows = showSkeleton ? skeletonDeliveryRows : deliveryMonthWise;
    const deliveryDayRows = showSkeleton ? skeletonDeliveryRows : deliveryDayWise;
    const summaryMeta = [
        summary?.asOfDate ? `As of ${formatDayWithYear(summary.asOfDate)}` : null,
        lastRefreshedAt ? `Last refreshed ${formatTime(lastRefreshedAt)}` : null,
        lastLoadDurationMs !== null ? `Load time ${formatLoadDuration(lastLoadDurationMs)}` : null
    ]
        .filter((value): value is string => Boolean(value))
        .join(' · ');

    const renderMonthCell = (value: string) =>
        showSkeleton ? <Skeleton width="6rem" height="0.85rem" /> : formatMonth(value);

    const renderDayCell = (value: string) =>
        showSkeleton ? <Skeleton width="6rem" height="0.85rem" /> : formatDay(value);

    const renderCountCell = (value: number) =>
        showSkeleton ? <Skeleton width="3rem" height="0.85rem" /> : formatCount(value);

    const renderAmountCell = (value: number) =>
        showSkeleton ? <Skeleton width="4rem" height="0.85rem" /> : formatAmount(value);

    const dueInvoiceTotals = useMemo(
        () =>
            dueInvoices.reduce(
                (acc, row) => {
                    acc.totalCount += row.totalCount ?? 0;
                    acc.totalAmount += row.totalAmount ?? 0;
                    return acc;
                },
                { totalCount: 0, totalAmount: 0 }
            ),
        [dueInvoices]
    );

    const dueEstimateTotals = useMemo(
        () =>
            dueEstimates.reduce(
                (acc, row) => {
                    acc.totalCount += row.totalCount ?? 0;
                    acc.totalAmount += row.totalAmount ?? 0;
                    return acc;
                },
                { totalCount: 0, totalAmount: 0 }
            ),
        [dueEstimates]
    );

    const deliveryMonthTotals = useMemo(
        () =>
            deliveryMonthWise.reduce(
                (acc, row) => {
                    acc.totalInProcess += row.totalInProcess ?? 0;
                    acc.totalPending += row.totalPending ?? 0;
                    return acc;
                },
                { totalInProcess: 0, totalPending: 0 }
            ),
        [deliveryMonthWise]
    );

    const deliveryDayTotals = useMemo(
        () =>
            deliveryDayWise.reduce(
                (acc, row) => {
                    acc.totalInProcess += row.totalInProcess ?? 0;
                    acc.totalPending += row.totalPending ?? 0;
                    return acc;
                },
                { totalInProcess: 0, totalPending: 0 }
            ),
        [deliveryDayWise]
    );

    if (!enabled) return null;

    return (
        <div className="col-12">
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                <div>
                    <h3 className="m-0">Summaries</h3>
                    <p className="text-600 m-0">Quick overview of invoices, estimates, and delivery status.</p>
                </div>
                <div className="flex flex-column align-items-start md:align-items-end gap-1">
                    <div className="flex gap-2">
                        <Button
                            label={collapsed ? 'Show Summaries' : 'Hide Summaries'}
                            icon={collapsed ? 'pi pi-eye' : 'pi pi-eye-slash'}
                            className="p-button-text"
                            onClick={() => setCollapsed((prev) => !prev)}
                        />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-outlined"
                            onClick={() => loadSummary()}
                            disabled={loading}
                        />
                    </div>
                    {summaryMeta && (
                        <p className="text-700 text-sm font-medium m-0 md:text-right">
                            {summaryMeta}
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <Message
                    severity="error"
                    text={`Failed to load summaries: ${error}`}
                    className="mb-3"
                />
            )}

            {!collapsed && (
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <Card title="Due Invoices (Month Wise)" className="h-full agency-summary-card agency-summary-card--invoices">
                            <DataTable
                                value={dueInvoicesRows}
                                loading={false}
                                size="small"
                                stripedRows
                                responsiveLayout="scroll"
                                emptyMessage={showSkeleton ? '' : 'No due invoice summary yet.'}
                                className="summary-table"
                            >
                                <Column
                                    header="Month"
                                    body={(row: SummaryRow) => renderMonthCell(row.periodKey)}
                                    footer={showSkeleton ? <Skeleton width="3rem" height="0.85rem" /> : 'Total'}
                                />
                                <Column
                                    header="Total Invoices"
                                    body={(row: SummaryRow) => renderCountCell(row.totalCount)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="3rem" height="0.85rem" />
                                        ) : (
                                            formatCount(dueInvoiceTotals.totalCount)
                                        )
                                    }
                                    style={{ width: '9rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                                <Column
                                    header="Net Amt"
                                    body={(row: SummaryRow) => renderAmountCell(row.totalAmount)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="4rem" height="0.85rem" />
                                        ) : (
                                            formatAmount(dueInvoiceTotals.totalAmount)
                                        )
                                    }
                                    style={{ width: '10rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                            </DataTable>
                        </Card>
                    </div>
                    <div className="col-12 md:col-6">
                        <Card title="Due Estimates (Month Wise)" className="h-full agency-summary-card agency-summary-card--estimates">
                            <DataTable
                                value={dueEstimatesRows}
                                loading={false}
                                size="small"
                                stripedRows
                                responsiveLayout="scroll"
                                emptyMessage={showSkeleton ? '' : 'No due estimate summary yet.'}
                                className="summary-table"
                            >
                                <Column
                                    header="Month"
                                    body={(row: SummaryRow) => renderMonthCell(row.periodKey)}
                                    footer={showSkeleton ? <Skeleton width="3rem" height="0.85rem" /> : 'Total'}
                                />
                                <Column
                                    header="Total Estimates"
                                    body={(row: SummaryRow) => renderCountCell(row.totalCount)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="3rem" height="0.85rem" />
                                        ) : (
                                            formatCount(dueEstimateTotals.totalCount)
                                        )
                                    }
                                    style={{ width: '9rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                                <Column
                                    header="Net Amt"
                                    body={(row: SummaryRow) => renderAmountCell(row.totalAmount)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="4rem" height="0.85rem" />
                                        ) : (
                                            formatAmount(dueEstimateTotals.totalAmount)
                                        )
                                    }
                                    style={{ width: '10rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                            </DataTable>
                        </Card>
                    </div>
                    <div className="col-12 md:col-6">
                        <Card title="Delivery Process (Month Wise)" className="h-full agency-summary-card agency-summary-card--delivery-month">
                            <DataTable
                                value={deliveryMonthRows}
                                loading={false}
                                size="small"
                                stripedRows
                                responsiveLayout="scroll"
                                emptyMessage={showSkeleton ? '' : 'No delivery process summary yet.'}
                                className="summary-table"
                            >
                                <Column
                                    header="Month"
                                    body={(row: DeliveryRow) => renderMonthCell(row.periodKey)}
                                    footer={showSkeleton ? <Skeleton width="3rem" height="0.85rem" /> : 'Total'}
                                />
                                <Column
                                    header="In Process"
                                    body={(row: DeliveryRow) => renderCountCell(row.totalInProcess)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="3rem" height="0.85rem" />
                                        ) : (
                                            formatCount(deliveryMonthTotals.totalInProcess)
                                        )
                                    }
                                    style={{ width: '8rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                                <Column
                                    header="Pending"
                                    body={(row: DeliveryRow) => renderCountCell(row.totalPending)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="3rem" height="0.85rem" />
                                        ) : (
                                            formatCount(deliveryMonthTotals.totalPending)
                                        )
                                    }
                                    style={{ width: '8rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                            </DataTable>
                        </Card>
                    </div>
                    <div className="col-12 md:col-6">
                        <Card title="Delivery Process (Day Wise)" className="h-full agency-summary-card agency-summary-card--delivery-day">
                            <DataTable
                                value={deliveryDayRows}
                                loading={false}
                                size="small"
                                stripedRows
                                responsiveLayout="scroll"
                                emptyMessage={showSkeleton ? '' : 'No delivery process summary yet.'}
                                className="summary-table"
                            >
                                <Column
                                    header="Day"
                                    body={(row: DeliveryRow) => renderDayCell(row.periodKey)}
                                    footer={showSkeleton ? <Skeleton width="3rem" height="0.85rem" /> : 'Total'}
                                />
                                <Column
                                    header="In Process"
                                    body={(row: DeliveryRow) => renderCountCell(row.totalInProcess)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="3rem" height="0.85rem" />
                                        ) : (
                                            formatCount(deliveryDayTotals.totalInProcess)
                                        )
                                    }
                                    style={{ width: '8rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                                <Column
                                    header="Pending"
                                    body={(row: DeliveryRow) => renderCountCell(row.totalPending)}
                                    footer={
                                        showSkeleton ? (
                                            <Skeleton width="3rem" height="0.85rem" />
                                        ) : (
                                            formatCount(deliveryDayTotals.totalPending)
                                        )
                                    }
                                    style={{ width: '8rem' }}
                                    headerClassName="summary-number"
                                    bodyClassName="summary-number"
                                    footerClassName="summary-number"
                                    footerStyle={{ fontWeight: 600 }}
                                />
                            </DataTable>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
