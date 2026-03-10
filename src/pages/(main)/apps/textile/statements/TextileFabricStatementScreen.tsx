'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { useNavigate } from 'react-router-dom';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { toYmdOrNull } from '@/lib/date';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { getTextileFabricStatement, type TextileDocumentType, type TextileStatementRow } from '@/lib/textile/api';
import { useTextileLookups } from '../documents/lookups';
import {
    buildTextileLotLabel,
    formatTextileDate,
    formatTextileNumber,
    humanizeTextileDocumentType,
    TEXTILE_STATEMENT_DOCUMENT_OPTIONS,
    useTextileSharedAccess
} from './shared';

type TextileStatementFilters = {
    documentType: TextileDocumentType | '';
    partyLedgerId: string;
    jobberLedgerId: string;
    productId: string;
    fromDate: Date | null;
    toDate: Date | null;
    includeCancelled: boolean;
};

type TextileStatementDisplayRow = TextileStatementRow & Record<string, unknown> & { rowKey: string };

const DEFAULT_FILTERS: TextileStatementFilters = {
    documentType: '',
    partyLedgerId: '',
    jobberLedgerId: '',
    productId: '',
    fromDate: null,
    toDate: null,
    includeCancelled: false
};

export function TextileFabricStatementScreen() {
    const navigate = useNavigate();
    const { setPageTitle } = useContext(LayoutContext);
    const lookups = useTextileLookups();
    const { isTextileTenant, canAccessSharedReports } = useTextileSharedAccess();
    const [filters, setFilters] = useState<TextileStatementFilters>(DEFAULT_FILTERS);
    const [rows, setRows] = useState<TextileStatementDisplayRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setPageTitle('Fabric Statement');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const loadStatement = async (activeFilters: TextileStatementFilters) => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const result = await getTextileFabricStatement({
                documentType: activeFilters.documentType || null,
                partyLedgerId: activeFilters.partyLedgerId || null,
                jobberLedgerId: activeFilters.jobberLedgerId || null,
                productId: activeFilters.productId || null,
                fromDate: toYmdOrNull(activeFilters.fromDate),
                toDate: toYmdOrNull(activeFilters.toDate),
                includeCancelled: activeFilters.includeCancelled
            });
            setRows(result.map((row) => ({ ...row, rowKey: row.textileDocumentLineId })));
        } catch (error: any) {
            setErrorMessage(error.message || 'Unable to load fabric statement');
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
                    value={filters.documentType || null}
                    options={TEXTILE_STATEMENT_DOCUMENT_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Document type"
                    onChange={(event) => setFilters((prev) => ({ ...prev, documentType: (event.value as TextileDocumentType | '') ?? '' }))}
                    style={{ minWidth: '170px' }}
                />
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
                <AppDateInput value={filters.fromDate} onChange={(value) => setFilters((prev) => ({ ...prev, fromDate: value }))} />
                <AppDateInput value={filters.toDate} onChange={(value) => setFilters((prev) => ({ ...prev, toDate: value }))} />
                <div className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="textile-fabric-statement-cancelled"
                        checked={filters.includeCancelled}
                        onChange={(event) => setFilters((prev) => ({ ...prev, includeCancelled: Boolean(event.checked) }))}
                    />
                    <label htmlFor="textile-fabric-statement-cancelled">Include cancelled</label>
                </div>
            </>
        ),
        [filters, lookups.ledgerOptions, lookups.productOptions]
    );

    if (!isTextileTenant) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Fabric Statement</h2>
                <p className="text-600 mb-3">This report is only available when the tenant industry is Textile.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    if (!canAccessSharedReports) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">Fabric Statement</h2>
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
                        <h2 className="m-0">Fabric Statement</h2>
                        <p className="mt-2 mb-0 text-600">Track textile movement balances across inward, dispatch, jobwork, and future invoice linkage.</p>
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
                        emptyMessage="No fabric statement rows found for the selected filters."
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
                            header="Document"
                            body={(row: TextileStatementDisplayRow) => (
                                <div className="flex flex-column gap-1">
                                    <span className="font-medium text-900">{row.documentNumber}</span>
                                    <small className="text-600">{formatTextileDate(row.documentDate)} | {humanizeTextileDocumentType(row.documentType)}</small>
                                </div>
                            )}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Party"
                            body={(row: TextileStatementDisplayRow) =>
                                row.partyLedgerId ? lookups.ledgerNameById.get(row.partyLedgerId) ?? `Ledger ${row.partyLedgerId}` : '-'
                            }
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Jobber"
                            body={(row: TextileStatementDisplayRow) => {
                                const jobberId = row.lineJobberLedgerId || row.jobberLedgerId;
                                return jobberId ? lookups.ledgerNameById.get(jobberId) ?? `Ledger ${jobberId}` : '-';
                            }}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Fabric"
                            body={(row: TextileStatementDisplayRow) => (
                                <div className="flex flex-column gap-1">
                                    <span>{row.productId ? lookups.productNameById.get(row.productId) ?? `Product ${row.productId}` : '-'}</span>
                                    <small className="text-600">{row.designName || '-'}</small>
                                </div>
                            )}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Lot Identity"
                            body={(row: TextileStatementDisplayRow) => buildTextileLotLabel(row)}
                            style={{ minWidth: '16rem' }}
                        />
                        <Column
                            header="Qty In"
                            body={(row: TextileStatementDisplayRow) => formatTextileNumber(row.quantityIn)}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Qty Out"
                            body={(row: TextileStatementDisplayRow) => formatTextileNumber(row.quantityOut)}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Running Qty"
                            body={(row: TextileStatementDisplayRow) => formatTextileNumber(row.runningQuantityBalance)}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Running Pcs"
                            body={(row: TextileStatementDisplayRow) => formatTextileNumber(row.runningPiecesBalance)}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Running Amt"
                            body={(row: TextileStatementDisplayRow) => formatTextileNumber(row.runningAmountBalance)}
                            style={{ width: '8rem' }}
                        />
                    </AppDataTable>
                </div>
            </div>
        </div>
    );
}



