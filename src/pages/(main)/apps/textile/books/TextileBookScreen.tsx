'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { toYmdOrNull } from '@/lib/date';
import { listTextileDocuments, type TextileDocumentListItem } from '@/lib/textile/api';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { useTextileLookups } from '../documents/lookups';
import { formatTextileDate, formatTextileNumber, humanizeTextileDocumentType, useTextileSharedAccess } from '../statements/shared';
import type { TextileBookScreenConfig } from './config';

type TextileBookFilters = {
    search: string;
    partyLedgerId: string;
    jobberLedgerId: string;
    productId: string;
    fromDate: Date | null;
    toDate: Date | null;
    includeCancelled: boolean;
};

type TextileBookRow = TextileDocumentListItem & Record<string, unknown> & { rowKey: string };

const DEFAULT_FILTERS: TextileBookFilters = {
    search: '',
    partyLedgerId: '',
    jobberLedgerId: '',
    productId: '',
    fromDate: null,
    toDate: null,
    includeCancelled: false
};

const buildReferenceLabel = (row: TextileDocumentListItem) => {
    const parts = [row.referenceNumber, row.jobberChallanNo, row.remarks]
        .map((value) => value?.trim() || null)
        .filter((value): value is string => Boolean(value));
    return parts.length > 0 ? parts.join(' | ') : '-';
};

export function TextileBookScreen({ screen }: { screen: TextileBookScreenConfig }) {
    const navigate = useNavigate();
    const { setPageTitle } = useContext(LayoutContext);
    const lookups = useTextileLookups();
    const { isTextileTenant, capabilities } = useTextileSharedAccess();
    const [filters, setFilters] = useState<TextileBookFilters>(DEFAULT_FILTERS);
    const [rows, setRows] = useState<TextileBookRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setPageTitle(screen.title);
        return () => setPageTitle(null);
    }, [screen.title, setPageTitle]);

    const loadBook = async (activeFilters: TextileBookFilters) => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const result = await listTextileDocuments({
                documentType: screen.documentType,
                partyLedgerId: activeFilters.partyLedgerId || null,
                jobberLedgerId: activeFilters.jobberLedgerId || null,
                productId: activeFilters.productId || null,
                fromDate: toYmdOrNull(activeFilters.fromDate),
                toDate: toYmdOrNull(activeFilters.toDate),
                search: activeFilters.search.trim() || null,
                includeCancelled: activeFilters.includeCancelled,
                limit: 300,
                offset: 0
            });
            setRows(result.map((row) => ({ ...row, rowKey: row.textileDocumentId })));
        } catch (error: any) {
            setErrorMessage(error.message || `Unable to load ${screen.title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadBook(DEFAULT_FILTERS);
    }, [screen.documentType]);

    const recordSummary = useMemo(() => {
        const totalQuantity = rows.reduce((sum, row) => sum + Number(row.totalQuantity ?? 0), 0);
        const totalAmount = rows.reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
        return `Documents: ${rows.length} | Qty: ${formatTextileNumber(totalQuantity)} | Amount: ${formatTextileNumber(totalAmount)}`;
    }, [rows]);

    const headerLeft = useMemo(
        () => (
            <>
                <AppInput
                    value={filters.search}
                    placeholder="Search number, reference, challan, or remarks"
                    style={{ minWidth: '220px' }}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
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
                        inputId={`${screen.documentType}-book-cancelled`}
                        checked={filters.includeCancelled}
                        onChange={(event) => setFilters((prev) => ({ ...prev, includeCancelled: Boolean(event.checked) }))}
                    />
                    <label htmlFor={`${screen.documentType}-book-cancelled`}>Include cancelled</label>
                </div>
            </>
        ),
        [filters, lookups.ledgerOptions, lookups.productOptions, screen.documentType]
    );

    const canAccessScreen = isTextileTenant && capabilities[screen.capability];

    if (!isTextileTenant) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">{screen.title}</h2>
                <p className="text-600 mb-3">This book is only available when the tenant industry is Textile.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    if (!canAccessScreen) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">{screen.title}</h2>
                <p className="text-600 mb-3">
                    This book requires the <strong>{screen.capability}</strong> textile capability for the active tenant.
                </p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex align-items-center justify-content-between gap-3 mb-3">
                    <div>
                        <h2 className="m-0">{screen.title}</h2>
                        <p className="mt-2 mb-0 text-600">{screen.description}</p>
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
                    <Message severity="info" text="Loading textile lookup masters for book labels and filters." className="w-full" />
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
                        emptyMessage={screen.emptyMessage}
                        recordSummary={recordSummary}
                        exportFileName={screen.exportFileName}
                        headerLeft={headerLeft}
                        headerRight={
                            <>
                                <Button
                                    type="button"
                                    label="Refresh"
                                    icon="pi pi-refresh"
                                    className="p-button-text app-action-compact"
                                    onClick={() => void loadBook(filters)}
                                />
                                <Button
                                    type="button"
                                    label={screen.newLabel}
                                    icon="pi pi-plus"
                                    className="app-action-compact"
                                    onClick={() => navigate(screen.formRoute)}
                                />
                            </>
                        }
                    >
                        <Column
                            header="Document"
                            body={(row: TextileBookRow) => (
                                <div className="flex flex-column gap-1">
                                    <span className="font-medium text-900">{row.documentNumber}</span>
                                    <small className="text-600">{formatTextileDate(row.documentDate)} | {humanizeTextileDocumentType(row.documentType)}</small>
                                </div>
                            )}
                            style={{ minWidth: '15rem' }}
                        />
                        <Column
                            header="Party"
                            body={(row: TextileBookRow) =>
                                row.partyLedgerId ? lookups.ledgerNameById.get(row.partyLedgerId) ?? `Ledger ${row.partyLedgerId}` : '-'
                            }
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Jobber"
                            body={(row: TextileBookRow) =>
                                row.jobberLedgerId ? lookups.ledgerNameById.get(row.jobberLedgerId) ?? `Ledger ${row.jobberLedgerId}` : '-'
                            }
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Reference"
                            body={(row: TextileBookRow) => buildReferenceLabel(row)}
                            style={{ minWidth: '14rem' }}
                        />
                        <Column
                            header="Totals"
                            body={(row: TextileBookRow) => (
                                <div className="flex flex-column gap-1">
                                    <small>Lines: {formatTextileNumber(row.lineCount)}</small>
                                    <small>Qty: {formatTextileNumber(row.totalQuantity)}</small>
                                    <small>Amt: {formatTextileNumber(row.totalAmount)}</small>
                                </div>
                            )}
                            style={{ width: '10rem' }}
                        />
                        <Column
                            header="Status"
                            body={(row: TextileBookRow) => (
                                <Tag value={row.isCancelled ? 'Cancelled' : 'Open'} severity={row.isCancelled ? 'danger' : 'success'} />
                            )}
                            style={{ width: '8rem' }}
                        />
                        <Column
                            header="Actions"
                            exportable={false}
                            body={(row: TextileBookRow) => (
                                <Button
                                    type="button"
                                    label="Open"
                                    className="p-button-text app-action-compact"
                                    onClick={() => navigate(screen.formRoute, { state: { textileDocumentId: row.textileDocumentId } })}
                                />
                            )}
                            style={{ width: '7rem' }}
                        />
                    </AppDataTable>
                </div>
            </div>
        </div>
    );
}