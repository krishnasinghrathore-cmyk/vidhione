import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppInput from '@/components/AppInput';
import type { TextileDocumentListItem } from '@/lib/textile/api';
import type { TextileDocumentFilters, TextileDocumentScreenConfig } from './config';

type TextileDocumentListProps = {
    screen: TextileDocumentScreenConfig;
    items: TextileDocumentListItem[];
    filters: TextileDocumentFilters;
    loading: boolean;
    errorMessage: string | null;
    ledgerNameById: Map<string, string>;
    onFiltersChange: (next: TextileDocumentFilters) => void;
    onRefresh: () => void;
    onCreateNew: () => void;
    onSelect: (textileDocumentId: string) => void;
};

const formatDate = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB');
};

const formatNumber = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return '0';
    return value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: value % 1 ? 2 : 0 });
};

export function TextileDocumentList({
    screen,
    items,
    filters,
    loading,
    errorMessage,
    ledgerNameById,
    onFiltersChange,
    onRefresh,
    onCreateNew,
    onSelect
}: TextileDocumentListProps) {
    const updateFilters = (patch: Partial<TextileDocumentFilters>) => {
        onFiltersChange({ ...filters, ...patch });
    };

    return (
        <div className="card h-full">
            <div className="mb-3">
                <h3 className="m-0 text-xl">{screen.title}</h3>
                <p className="mt-2 mb-0 text-600">Use filters, review saved entries, and reopen existing textile documents.</p>
            </div>

            {errorMessage && <p className="text-red-500 mt-0 mb-3">{errorMessage}</p>}

            <AppDataTable
                value={items}
                loading={loading}
                dataKey="textileDocumentId"
                paginator
                rows={10}
                rowsPerPageOptions={[10, 20, 50]}
                stripedRows
                size="small"
                emptyMessage={screen.emptyMessage}
                recordSummary={`Documents: ${items.length}`}
                headerLeft={
                    <>
                        <AppInput
                            value={filters.search}
                            placeholder="Search no, reference, or remarks"
                            style={{ minWidth: '220px' }}
                            onChange={(event) => updateFilters({ search: event.target.value })}
                        />
                        <AppDateInput value={filters.fromDate} onChange={(value) => updateFilters({ fromDate: value })} />
                        <AppDateInput value={filters.toDate} onChange={(value) => updateFilters({ toDate: value })} />
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId={`${screen.documentType}-include-cancelled`}
                                checked={filters.includeCancelled}
                                onChange={(event) => updateFilters({ includeCancelled: Boolean(event.checked) })}
                            />
                            <label htmlFor={`${screen.documentType}-include-cancelled`}>Include cancelled</label>
                        </div>
                    </>
                }
                headerRight={
                    <>
                        <Button
                            type="button"
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text app-action-compact"
                            onClick={onRefresh}
                        />
                        <Button
                            type="button"
                            label="New"
                            icon="pi pi-plus"
                            className="app-action-compact"
                            onClick={onCreateNew}
                        />
                    </>
                }
            >
                <Column
                    header="Document"
                    body={(row: TextileDocumentListItem) => (
                        <div className="flex flex-column gap-1">
                            <span className="font-medium text-900">{row.documentNumber}</span>
                            <small className="text-600">{formatDate(row.documentDate)}</small>
                        </div>
                    )}
                    style={{ minWidth: '10rem' }}
                />
                <Column
                    header="Party"
                    body={(row: TextileDocumentListItem) =>
                        row.partyLedgerId ? ledgerNameById.get(row.partyLedgerId) ?? `Ledger ${row.partyLedgerId}` : '-'
                    }
                    style={{ minWidth: '14rem' }}
                />
                <Column
                    header="Reference"
                    body={(row: TextileDocumentListItem) => row.referenceNumber || row.remarks || '-'}
                    style={{ minWidth: '12rem' }}
                />
                <Column
                    header="Totals"
                    body={(row: TextileDocumentListItem) => (
                        <div className="flex flex-column gap-1">
                            <small>Qty: {formatNumber(row.totalQuantity)}</small>
                            <small>Amt: {formatNumber(row.totalAmount)}</small>
                        </div>
                    )}
                    style={{ width: '9rem' }}
                />
                <Column
                    header="Status"
                    body={(row: TextileDocumentListItem) => (
                        <Tag value={row.isCancelled ? 'Cancelled' : 'Open'} severity={row.isCancelled ? 'danger' : 'success'} />
                    )}
                    style={{ width: '8rem' }}
                />
                <Column
                    header="Actions"
                    body={(row: TextileDocumentListItem) => (
                        <Button
                            type="button"
                            label="Edit"
                            className="p-button-text app-action-compact"
                            onClick={() => onSelect(row.textileDocumentId)}
                        />
                    )}
                    style={{ width: '7rem' }}
                />
            </AppDataTable>
        </div>
    );
}
