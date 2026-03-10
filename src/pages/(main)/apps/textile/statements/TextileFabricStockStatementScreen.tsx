'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { useNavigate } from 'react-router-dom';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { getTextileFabricStockStatement, type TextileStockRow } from '@/lib/textile/api';
import { useTextileLookups } from '../documents/lookups';
import { buildTextileLotLabel, formatTextileDate, formatTextileNumber, useTextileSharedAccess } from './shared';

type TextileStockFilters = {
    partyLedgerId: string;
    jobberLedgerId: string;
    productId: string;
    includeCancelled: boolean;
};

type TextileStockDisplayRow = TextileStockRow & Record<string, unknown> & { rowKey: string };

const DEFAULT_FILTERS: TextileStockFilters = {
    partyLedgerId: '',
    jobberLedgerId: '',
    productId: '',
    includeCancelled: false
};

export function TextileFabricStockStatementScreen() {
    const navigate = useNavigate();
    const { setPageTitle } = useContext(LayoutContext);
    const lookups = useTextileLookups();
    const { isTextileTenant, canAccessSharedReports } = useTextileSharedAccess();
    const [filters, setFilters] = useState<TextileStockFilters>(DEFAULT_FILTERS);
    const [rows, setRows] = useState<TextileStockDisplayRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setPageTitle('Fabric Stock Statement');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const loadStatement = async (activeFilters: TextileStockFilters) => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const result = await getTextileFabricStockStatement({
                partyLedgerId: activeFilters.partyLedgerId || null,
                jobberLedgerId: activeFilters.jobberLedgerId || null,
                productId: activeFilters.productId || null,
                includeCancelled: activeFilters.includeCancelled
            });
            setRows(
                result.map((row, index) => ({
                    ...row,
                    rowKey: [row.partyLedgerId, row.jobberLedgerId, row.productId, row.receiptNo, row.baleNo, row.lotNo, row.comboNo, row.rollNo, index]
                        .map((value) => value ?? '')
                        .join('|')
                }))
            );
        } catch (error: any) {
            setErrorMessage(error.message || 'Unable to load fabric stock statement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadStatement(DEFAULT_FILTERS);
    }, []);

    const headerLeft = useMemo(
        () => (
            <>
                <AppDropdown
                    value={filters.partyLedgerId || null}
                    options={lookups.ledgerOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Party ledger"
                    filter
                    showClear
                    onChange={(event) => setFilters((prev) => ({ ...prev, partyLedgerId: String(event.value ?? '') }))}
                    style={{ minWidth: '220px' }}
                />
                <AppDropdown
                    value={filters.jobberLedgerId || null}
                    options={lookups.ledgerOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Jobber ledger"
                    filter
                    showClear
                    onChange={(event) => setFilters((prev) => ({ ...prev, jobberLedgerId: String(event.value ?? '') }))}
                    style={{ minWidth: '220px' }}
                />
                <AppDropdown
                    value={filters.productId || null}
                    options={lookups.productOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Product"
                    filter
                    showClear
                    onChange={(event) => setFilters((prev) => ({ ...prev, productId: String(event.value ?? '') }))}
                    style={{ minWidth: '220px' }}
                />
                <div className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="textile-fabric-stock-cancelled"
                        checked={filters.includeCancelled}
                        onChange={(event) => setFilters((prev) => ({ ...prev, includeCancelled: Boolean(event.checked) }))}
                    />
                    <label htmlFor="textile-fabric-stock-cancelled">Include cancelled</label>
                </div>
            </>
        ),
        [filters, lookups.ledgerOptions, lookups.productOptions]
    );

    if (!isTextileTenant) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Fabric Stock Statement</h2>
                <p className="text-600 mb-3">This report is only available when the tenant industry is Textile.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    if (!canAccessSharedReports) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Fabric Stock Statement</h2>
                <p className="text-600 mb-3">This report is available only for textile tenants with operational textile capabilities enabled.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex align-items-center justify-content-between gap-3 mb-3">
                    <div>
                        <h2 className="m-0">Fabric Stock Statement</h2>
                        <p className="mt-2 mb-0 text-600">See current textile balance by party, jobber, fabric identity, and lot-level references.</p>
                    </div>
                    <Button
                        type="button"
                        label="Textile Workspace"
                        className="p-button-text app-action-compact"
                        onClick={() => navigate('/apps/textile')}
                    />
                </div>
            </div>

            {lookups.loading && (
                <div className="col-12">
                    <Message severity="info" text="Loading textile lookup masters for report labels and filters." className="w-full" />
                </div>
            )}

            {lookups.errorMessages.length > 0 && (
                <div className="col-12">
                    <Message severity="warn" text={lookups.errorMessages.join(' | ')} className="w-full" />
                </div>
            )}

            <div className="col-12">
                <div className="card">
                    {errorMessage && <p className="text-red-500 mt-0 mb-3">{errorMessage}</p>}
                    <AppDataTable
                        value={rows}
                        loading={loading}
                        dataKey="rowKey"
                        paginator
                        rows={20}
                        rowsPerPageOptions={[20, 50, 100]}
                        stripedRows
                        size="small"
                        emptyMessage="No fabric stock rows found for the selected filters."
                        recordSummary={`Rows: ${rows.length}`}
                        headerLeft={headerLeft}
                        headerRight={
                            <Button
                                type="button"
                                label="Refresh"
                                icon="pi pi-refresh"
                                className="p-button-text app-action-compact"
                                onClick={() => void loadStatement(filters)}
                            />
                        }
                    >
                        <Column
                            header="Party"
                            body={(row: TextileStockDisplayRow) =>
                                row.partyLedgerId ? lookups.ledgerNameById.get(row.partyLedgerId) ?? `Ledger ${row.partyLedgerId}` : '-'
                            }
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Jobber"
                            body={(row: TextileStockDisplayRow) => {
                                const jobberId = row.lineJobberLedgerId || row.jobberLedgerId;
                                return jobberId ? lookups.ledgerNameById.get(jobberId) ?? `Ledger ${jobberId}` : '-';
                            }}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Fabric"
                            body={(row: TextileStockDisplayRow) => (
                                <div className="flex flex-column gap-1">
                                    <span>{row.productId ? lookups.productNameById.get(row.productId) ?? `Product ${row.productId}` : '-'}</span>
                                    <small className="text-600">{row.designName || '-'}</small>
                                </div>
                            )}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Lot Identity"
                            body={(row: TextileStockDisplayRow) => buildTextileLotLabel(row)}
                            style={{ minWidth: '16rem' }}
                        />
                        <Column
                            header="Balance Pcs"
                            body={(row: TextileStockDisplayRow) => formatTextileNumber(row.balancePieces)}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Balance Qty"
                            body={(row: TextileStockDisplayRow) => formatTextileNumber(row.balanceQuantity)}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Balance Amt"
                            body={(row: TextileStockDisplayRow) => formatTextileNumber(row.balanceAmount)}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Last Date"
                            body={(row: TextileStockDisplayRow) => formatTextileDate(row.lastDocumentDate)}
                            style={{ width: '8rem' }}
                        />
                    </AppDataTable>
                </div>
            </div>
        </div>
    );
}
