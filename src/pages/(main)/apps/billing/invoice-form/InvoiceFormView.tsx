import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import type { SaleInvoiceListItem } from '@/lib/invoicing/api';
import { formatAmount, formatVoucherDate } from '../helpers';
import type { LedgerOption, LedgerSummary } from '../useLedgerLookup';
import { InvoiceHeaderSection } from './components/InvoiceHeaderSection';
import { InvoiceItemSearch } from './components/InvoiceItemSearch';
import { InvoiceLinesTable } from './components/InvoiceLinesTable';
import { InvoiceTotalsPanel } from './components/InvoiceTotalsPanel';
import { PhaseOneWarningDialog } from './components/PhaseOneWarningDialog';
import type {
    InvoiceComputation,
    InvoiceHeaderDraft,
    InvoiceLineDraft,
    InvoiceProduct,
    LineInventoryDraft,
    WarehouseOption
} from './types';

type ProductOption = {
    label: string;
    value: number;
};

type InvoiceFormViewProps = {
    loading: boolean;
    saving: boolean;
    error: string | null;
    productsLoading: boolean;
    saleInvoices: SaleInvoiceListItem[];
    createOpen: boolean;
    header: InvoiceHeaderDraft;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    ledgerOptions: LedgerOption[];
    ledgerById: Map<number, LedgerSummary>;
    ledgerLoading: boolean;
    products: InvoiceProduct[];
    productOptions: ProductOption[];
    warehouseOptions: WarehouseOption[];
    computation: InvoiceComputation;
    headerErrors: string[];
    lineErrorsByKey: Record<string, string[]>;
    canSave: boolean;
    phaseOneWarningVisible: boolean;
    onRefresh: () => void;
    onOpenCreate: () => void;
    onCloseCreate: () => void;
    onHeaderChange: (patch: Partial<InvoiceHeaderDraft>) => void;
    onAddItem: (productId: number) => void;
    onSelectProduct: (lineKey: string, productId: number | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceLineDraft>) => void;
    onInventoryChange: (lineKey: string, patch: Partial<LineInventoryDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    onDuplicateLine: (lineKey: string) => void;
    onAddLine: () => void;
    onRequestSave: () => void;
    onCancelPhaseOneWarning: () => void;
    onConfirmPhaseOneWarning: () => void;
};

export function InvoiceFormView({
    loading,
    saving,
    error,
    productsLoading,
    saleInvoices,
    createOpen,
    header,
    fiscalYearStart,
    fiscalYearEnd,
    ledgerOptions,
    ledgerById,
    ledgerLoading,
    products,
    productOptions,
    warehouseOptions,
    computation,
    headerErrors,
    lineErrorsByKey,
    canSave,
    phaseOneWarningVisible,
    onRefresh,
    onOpenCreate,
    onCloseCreate,
    onHeaderChange,
    onAddItem,
    onSelectProduct,
    onLineChange,
    onInventoryChange,
    onDeleteLine,
    onDuplicateLine,
    onAddLine,
    onRequestSave,
    onCancelPhaseOneWarning,
    onConfirmPhaseOneWarning
}: InvoiceFormViewProps) {
    return (
        <div className="card">
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2">
                <div>
                    <h2 className="mb-2">Invoice Form</h2>
                    <p className="text-600 m-0">Desktop invoice form based on prompt requirements (phase 1).</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-content-end">
                    <Button icon="pi pi-refresh" label="Refresh" outlined onClick={onRefresh} disabled={loading || saving} />
                    <Button icon="pi pi-plus" label="New Invoice" onClick={onOpenCreate} disabled={loading || saving} />
                </div>
            </div>

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}
            {productsLoading && <Message severity="info" text="Loading product catalog..." className="w-full mt-3" />}

            <DataTable
                value={saleInvoices}
                loading={loading}
                paginator
                rows={10}
                className="mt-3"
                dataKey="saleInvoiceId"
                responsiveLayout="scroll"
            >
                <Column field="saleInvoiceId" header="ID" sortable style={{ width: '6rem' }} />
                <Column
                    field="voucherNumber"
                    header="Voucher No"
                    sortable
                    body={(row: SaleInvoiceListItem) => row.voucherNumber || '-'}
                />
                <Column
                    field="voucherDateText"
                    header="Date"
                    sortable
                    body={(row: SaleInvoiceListItem) => formatVoucherDate(row.voucherDateText)}
                />
                <Column
                    field="ledgerName"
                    header="Party"
                    sortable
                    body={(row: SaleInvoiceListItem) => row.ledgerName || '-'}
                />
                <Column
                    field="totalNetAmount"
                    header="Total"
                    sortable
                    body={(row: SaleInvoiceListItem) => formatAmount(Number(row.totalNetAmount || 0))}
                />
            </DataTable>

            <Dialog
                header="New Invoice Form"
                visible={createOpen}
                style={{ width: '92rem', maxWidth: '95vw' }}
                modal
                onHide={onCloseCreate}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={onCloseCreate} disabled={saving} />
                        <Button
                            label="Save Invoice"
                            icon="pi pi-check"
                            disabled={!canSave || saving}
                            loading={saving}
                            onClick={onRequestSave}
                        />
                    </div>
                }
            >
                <InvoiceHeaderSection
                    header={header}
                    fiscalYearStart={fiscalYearStart}
                    fiscalYearEnd={fiscalYearEnd}
                    ledgerOptions={ledgerOptions}
                    ledgerById={ledgerById}
                    ledgerLoading={ledgerLoading}
                    warehouseOptions={warehouseOptions}
                    onHeaderChange={onHeaderChange}
                    headerErrors={headerErrors}
                />

                <InvoiceItemSearch products={products} onAddItem={onAddItem} disabled={saving} />

                <InvoiceLinesTable
                    lines={computation.lines}
                    productOptions={productOptions}
                    warehouseOptions={warehouseOptions}
                    lineErrorsByKey={lineErrorsByKey}
                    onSelectProduct={onSelectProduct}
                    onLineChange={onLineChange}
                    onInventoryChange={onInventoryChange}
                    onDeleteLine={onDeleteLine}
                    onDuplicateLine={onDuplicateLine}
                    onAddLine={onAddLine}
                />

                <InvoiceTotalsPanel computation={computation} ledgerById={ledgerById} />
            </Dialog>

            <PhaseOneWarningDialog
                visible={phaseOneWarningVisible}
                onCancel={onCancelPhaseOneWarning}
                onContinue={onConfirmPhaseOneWarning}
                loading={saving}
            />
        </div>
    );
}
