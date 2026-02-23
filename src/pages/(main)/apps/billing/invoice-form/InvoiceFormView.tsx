import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import type { SaleInvoiceListItem } from '@/lib/invoicing/api';
import { formatAmount, formatVoucherDate } from '../helpers';
import type { LedgerOption, LedgerSummary } from '../useLedgerLookup';
import { InvoiceAdditionalTaxationSection } from './components/InvoiceAdditionalTaxationSection';
import { InvoiceHeaderSection } from './components/InvoiceHeaderSection';
import { InvoiceLinesTable } from './components/InvoiceLinesTable';
import { InvoiceTypeDetailsSection } from './components/InvoiceTypeDetailsSection';
import { InvoiceTotalsPanel } from './components/InvoiceTotalsPanel';
import { PhaseOneWarningDialog } from './components/PhaseOneWarningDialog';
import type {
    InvoiceAdditionalTaxationDraft,
    InvoiceComputation,
    InvoiceFormRouteView,
    InvoiceHeaderDraft,
    InvoiceLineDraft,
    InvoiceProduct,
    InvoiceProductAttributeOption,
    InvoiceTypeDetailDraft,
    LineInventoryDraft,
    TaxSummaryRow,
    WarehouseOption
} from './types';

type Option = {
    label: string;
    value: number;
    searchText?: string | null;
};

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
    ledgerGroupId?: number | null;
    taxRate: number;
};

type InvoiceFormViewProps = {
    routeView: InvoiceFormRouteView;
    editingSaleInvoiceId: number | null;
    loading: boolean;
    loadingInvoice: boolean;
    saving: boolean;
    error: string | null;
    productsLoading: boolean;
    saleInvoices: SaleInvoiceListItem[];
    header: InvoiceHeaderDraft;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    ledgerOptions: LedgerOption[];
    ledgerById: Map<number, LedgerSummary>;
    ledgerLoading: boolean;
    products: InvoiceProduct[];
    productOptions: Option[];
    mrpOptionsByProductId: Record<number, Option[]>;
    unitOptions: Option[];
    taxLedgerOptions: TaxLedgerOption[];
    warehouseOptions: WarehouseOption[];
    computation: InvoiceComputation;
    taxSummaryRows: TaxSummaryRow[];
    additionalTaxations: InvoiceAdditionalTaxationDraft[];
    totalAdditionalTaxAmount: number;
    typeDetails: InvoiceTypeDetailDraft[];
    typeDetailOptionsByType: Record<number, InvoiceProductAttributeOption[]>;
    typeDetailOptionsLoading: boolean;
    headerErrors: string[];
    lineErrorsByKey: Record<string, string[]>;
    inventoryStatusByLineKey: Record<string, 'saved' | 'pending'>;
    pendingInventoryCount: number;
    canSave: boolean;
    hasPreservedDetails: boolean;
    phaseOneWarningVisible: boolean;
    onRefresh: () => void;
    onOpenNew: () => void;
    onOpenEdit: (saleInvoiceId: number) => void;
    onDeleteInvoice: (saleInvoiceId: number) => Promise<void> | void;
    onCancelEntry: () => void;
    onHeaderChange: (patch: Partial<InvoiceHeaderDraft>) => void;
    onSelectProduct: (lineKey: string, productId: number | null) => void;
    onSelectMrp: (lineKey: string, mrp: number | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceLineDraft>) => void;
    onInventoryChange: (lineKey: string, patch: Partial<LineInventoryDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    onDuplicateLine: (lineKey: string) => void;
    onAddLine: () => void;
    onAddTypeDetail: () => void;
    onChangeTypeDetail: (lineKey: string, patch: Partial<InvoiceTypeDetailDraft>) => void;
    onDeleteTypeDetail: (lineKey: string) => void;
    onAddAdditionalTaxation: () => void;
    onChangeAdditionalTaxation: (lineKey: string, patch: Partial<InvoiceAdditionalTaxationDraft>) => void;
    onDeleteAdditionalTaxation: (lineKey: string) => void;
    onTaxLessChange: (args: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => void;
    onRequestSave: () => void;
    onRequestSaveAndAddNew: () => void;
    onCancelPhaseOneWarning: () => void;
    onConfirmPhaseOneWarning: () => void;
};

export function InvoiceFormView({
    routeView,
    editingSaleInvoiceId,
    loading,
    loadingInvoice,
    saving,
    error,
    productsLoading,
    saleInvoices,
    header,
    fiscalYearStart,
    fiscalYearEnd,
    ledgerOptions,
    ledgerById,
    ledgerLoading,
    products,
    productOptions,
    mrpOptionsByProductId,
    unitOptions,
    taxLedgerOptions,
    warehouseOptions,
    computation,
    taxSummaryRows,
    additionalTaxations,
    totalAdditionalTaxAmount,
    typeDetails,
    typeDetailOptionsByType,
    typeDetailOptionsLoading,
    headerErrors,
    lineErrorsByKey,
    inventoryStatusByLineKey,
    pendingInventoryCount,
    canSave,
    hasPreservedDetails,
    phaseOneWarningVisible,
    onRefresh,
    onOpenNew,
    onOpenEdit,
    onDeleteInvoice,
    onCancelEntry,
    onHeaderChange,
    onSelectProduct,
    onSelectMrp,
    onLineChange,
    onInventoryChange,
    onDeleteLine,
    onDuplicateLine,
    onAddLine,
    onAddTypeDetail,
    onChangeTypeDetail,
    onDeleteTypeDetail,
    onAddAdditionalTaxation,
    onChangeAdditionalTaxation,
    onDeleteAdditionalTaxation,
    onTaxLessChange,
    onRequestSave,
    onRequestSaveAndAddNew,
    onCancelPhaseOneWarning,
    onConfirmPhaseOneWarning
}: InvoiceFormViewProps) {
    const isEntryView = routeView === 'new' || routeView === 'edit';
    const isEditView = routeView === 'edit';
    const [registerSearch, setRegisterSearch] = React.useState('');
    const [typeDetailsDialogVisible, setTypeDetailsDialogVisible] = React.useState(false);
    const [additionalTaxationDialogVisible, setAdditionalTaxationDialogVisible] = React.useState(false);

    const filteredSaleInvoices = React.useMemo(() => {
        const query = registerSearch.trim().toLowerCase();
        if (!query) return saleInvoices;
        return saleInvoices.filter((row) => {
            const idText = String(row.saleInvoiceId ?? '');
            const voucherText = (row.voucherNumber ?? '').toLowerCase();
            const partyText = (row.ledgerName ?? '').toLowerCase();
            const dateText = formatVoucherDate(row.voucherDateText).toLowerCase();
            const totalText = formatAmount(Number(row.totalNetAmount || 0)).toLowerCase();
            return (
                idText.includes(query) ||
                voucherText.includes(query) ||
                partyText.includes(query) ||
                dateText.includes(query) ||
                totalText.includes(query)
            );
        });
    }, [registerSearch, saleInvoices]);

    const handleEntryShortcutKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            if (!isEntryView || saving || loadingInvoice) return;
            const key = event.key.toLowerCase();
            const hasSaveModifier = event.ctrlKey || event.metaKey;

            if (!hasSaveModifier && !event.altKey && !event.shiftKey && (key === 'escape' || key === 'esc')) {
                event.preventDefault();
                event.stopPropagation();
                onCancelEntry();
                return;
            }

            if (!hasSaveModifier || event.altKey || event.shiftKey) return;
            if (key === 's') {
                event.preventDefault();
                event.stopPropagation();
                onRequestSave();
                return;
            }

            if (key === 'enter' && !isEditView) {
                event.preventDefault();
                event.stopPropagation();
                onRequestSaveAndAddNew();
            }
        },
        [isEditView, isEntryView, loadingInvoice, onCancelEntry, onRequestSave, onRequestSaveAndAddNew, saving]
    );

    const showLegacyPreservedNotice = isEditView && hasPreservedDetails;
    const confirmDeleteInvoice = React.useCallback((saleInvoiceId: number) => {
        if (typeof window === 'undefined') return true;
        return window.confirm(
            `Delete invoice #${saleInvoiceId}? This action marks the invoice as cancelled.`
        );
    }, []);

    return (
        <div className="cash-exp-split invoice-form-layout">
            <div className="flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
                <div className="flex flex-column gap-1">
                    <h2 className="m-0">{isEntryView ? 'GST Sales Invoice' : 'Invoice Form'}</h2>
                    <p className="text-600 m-0">
                        {isEntryView
                            ? isEditView
                                ? 'Edit GST sales invoice in dedicated entry page.'
                                : 'Create GST sales invoice in dedicated entry page.'
                            : 'Invoice register with voucher details.'}
                    </p>
                </div>
                <div className="app-workspace-toolbar flex align-items-center justify-content-end gap-2 flex-wrap ml-auto">
                    {isEntryView ? (
                        <Button
                            label="Back to Register"
                            icon="pi pi-arrow-left"
                            outlined
                            className="app-action-compact"
                            onClick={onCancelEntry}
                            disabled={saving}
                        />
                    ) : (
                        <>
                            <Button
                                icon="pi pi-refresh"
                                label="Refresh"
                                outlined
                                className="app-action-compact"
                                onClick={onRefresh}
                                disabled={loading || saving}
                            />
                            <Button
                                icon="pi pi-plus"
                                label="New Invoice"
                                className="app-action-compact"
                                onClick={onOpenNew}
                                disabled={loading || saving}
                            />
                        </>
                    )}
                </div>
            </div>

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}
            {productsLoading && <Message severity="info" text="Loading product catalog..." className="w-full mt-3" />}
            {loadingInvoice && isEntryView && <Message severity="info" text="Loading invoice for edit..." className="w-full mt-3" />}

            {isEntryView ? (
                <div
                    className="voucher-form cash-exp-split__form p-3 cash-exp-form cash-exp-form--receipt cash-exp-form--cash mt-3"
                    onKeyDownCapture={handleEntryShortcutKeyDown}
                >
                    <div className="invoice-form-status-row mb-3">
                        <span className="invoice-form-status-chip invoice-form-status-chip--mode">
                            {isEditView ? 'Edit Mode' : 'New Entry'}
                        </span>
                        <span className="invoice-form-status-chip">
                            {header.placeOfSupply === 'other_state' ? 'Other State (IGST)' : 'In State (SGST/CGST)'}
                        </span>
                        <span className="invoice-form-status-chip">Lines: {computation.lines.length}</span>
                        <span className="invoice-form-status-chip">
                            Inventory Pending: {pendingInventoryCount}
                        </span>
                        <span className="invoice-form-status-chip invoice-form-status-chip--amount">
                            Net: {formatAmount(computation.totals.totalNetAmount)}
                        </span>
                    </div>

                    {showLegacyPreservedNotice && (
                        <Message
                            severity="warn"
                            text="This invoice contains legacy linked details (tax/credit/debit). They are preserved during update."
                            className="w-full mb-3"
                        />
                    )}

                    <InvoiceHeaderSection
                        isEditView={isEditView}
                        header={header}
                        fiscalYearStart={fiscalYearStart}
                        fiscalYearEnd={fiscalYearEnd}
                        ledgerOptions={ledgerOptions}
                        ledgerById={ledgerById}
                        ledgerLoading={ledgerLoading}
                        onHeaderChange={onHeaderChange}
                        headerErrors={headerErrors}
                    />

                    <InvoiceLinesTable
                        lines={computation.lines}
                        placeOfSupply={header.placeOfSupply}
                        productOptions={productOptions}
                        mrpOptionsByProductId={mrpOptionsByProductId}
                        unitOptions={unitOptions}
                        taxLedgerOptions={taxLedgerOptions}
                        warehouseOptions={warehouseOptions}
                        lineErrorsByKey={lineErrorsByKey}
                        inventoryStatusByLineKey={inventoryStatusByLineKey}
                        onSelectProduct={onSelectProduct}
                        onSelectMrp={onSelectMrp}
                        onLineChange={onLineChange}
                        onInventoryChange={onInventoryChange}
                        onDeleteLine={onDeleteLine}
                        onDuplicateLine={onDuplicateLine}
                        onAddLine={onAddLine}
                    />

                    <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                            type="button"
                            icon="pi pi-list"
                            label={`Type Details (${typeDetails.length})`}
                            className="app-action-compact p-button-outlined"
                            onClick={() => setTypeDetailsDialogVisible(true)}
                            disabled={saving || loadingInvoice}
                        />
                        <Button
                            type="button"
                            icon="pi pi-calculator"
                            label={`Additional Tax (${additionalTaxations.length})`}
                            className="app-action-compact p-button-outlined"
                            onClick={() => setAdditionalTaxationDialogVisible(true)}
                            disabled={saving || loadingInvoice}
                        />
                        <span className="invoice-form-status-chip">Additional Tax Total: {formatAmount(totalAdditionalTaxAmount)}</span>
                    </div>

                    <InvoiceTotalsPanel
                        computation={computation}
                        taxSummaryRows={taxSummaryRows}
                        ledgerById={ledgerById}
                        onTaxLessChange={onTaxLessChange}
                        disabled={saving || loadingInvoice}
                    />

                    <Dialog
                        visible={typeDetailsDialogVisible}
                        onHide={() => setTypeDetailsDialogVisible(false)}
                        header="Type Details"
                        style={{ width: 'min(1100px, 95vw)' }}
                        modal
                        maximizable
                    >
                        <InvoiceTypeDetailsSection
                            lines={typeDetails}
                            products={products}
                            productOptions={productOptions}
                            attributeOptionsByType={typeDetailOptionsByType}
                            attributeOptionsLoading={typeDetailOptionsLoading}
                            disabled={saving || loadingInvoice}
                            onAddLine={onAddTypeDetail}
                            onLineChange={onChangeTypeDetail}
                            onDeleteLine={onDeleteTypeDetail}
                        />
                    </Dialog>

                    <Dialog
                        visible={additionalTaxationDialogVisible}
                        onHide={() => setAdditionalTaxationDialogVisible(false)}
                        header="Additional Taxation"
                        style={{ width: 'min(960px, 95vw)' }}
                        modal
                        maximizable
                    >
                        <InvoiceAdditionalTaxationSection
                            lines={additionalTaxations}
                            taxLedgerOptions={taxLedgerOptions}
                            totalAmount={totalAdditionalTaxAmount}
                            disabled={saving || loadingInvoice}
                            onAddLine={onAddAdditionalTaxation}
                            onLineChange={onChangeAdditionalTaxation}
                            onDeleteLine={onDeleteAdditionalTaxation}
                        />
                    </Dialog>

                    <div className="app-entry-actionsbar invoice-form-actionsbar mt-3">
                        <div className="flex justify-content-center flex-wrap app-entry-form-actions">
                            <div className="app-entry-form-action-with-hint">
                                <Button
                                    label={isEditView ? 'Update Invoice' : 'Save Invoice'}
                                    icon="pi pi-check"
                                    className="app-action-compact"
                                    disabled={!canSave || saving || loadingInvoice}
                                    loading={saving}
                                    onClick={onRequestSave}
                                />
                                <small className="app-entry-form-action-hint">Ctrl+S</small>
                            </div>
                            {!isEditView ? (
                                <div className="app-entry-form-action-with-hint">
                                    <Button
                                        label="Save & Add New"
                                        icon="pi pi-plus"
                                        className="app-action-compact p-button-outlined"
                                        disabled={!canSave || saving || loadingInvoice}
                                        loading={saving}
                                        onClick={onRequestSaveAndAddNew}
                                    />
                                    <small className="app-entry-form-action-hint">Ctrl+Enter</small>
                                </div>
                            ) : null}
                            {isEditView && editingSaleInvoiceId != null ? (
                                <div className="app-entry-form-action-with-hint">
                                    <Button
                                        label="Delete"
                                        icon="pi pi-trash"
                                        severity="danger"
                                        outlined
                                        className="app-action-compact"
                                        disabled={saving || loadingInvoice}
                                        onClick={() => {
                                            if (!confirmDeleteInvoice(editingSaleInvoiceId)) return;
                                            void onDeleteInvoice(editingSaleInvoiceId);
                                        }}
                                    />
                                    <small className="app-entry-form-action-hint">Cancel invoice</small>
                                </div>
                            ) : null}
                            <div className="app-entry-form-action-with-hint">
                                <Button
                                    label="Cancel"
                                    className="app-action-compact p-button-secondary p-button-outlined"
                                    onClick={onCancelEntry}
                                    disabled={saving}
                                />
                                <small className="app-entry-form-action-hint">Esc</small>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card mt-3">
                    <div className="invoice-register-toolbar mb-3">
                        <span className="p-input-icon-left invoice-register-search">
                            <i className="pi pi-search" />
                            <InputText
                                value={registerSearch}
                                onChange={(event) => setRegisterSearch(event.target.value)}
                                placeholder="Search by invoice no, party, date, id, amount"
                                className="w-full"
                            />
                        </span>
                        <div className="flex align-items-center gap-2">
                            {registerSearch.trim() ? (
                                <Button
                                    label="Clear"
                                    text
                                    className="app-action-compact"
                                    onClick={() => setRegisterSearch('')}
                                    disabled={loading}
                                />
                            ) : null}
                            <small className="text-600">
                                Showing {filteredSaleInvoices.length} of {saleInvoices.length}
                            </small>
                        </div>
                    </div>
                    <DataTable
                        value={filteredSaleInvoices}
                        loading={loading}
                        paginator
                        rows={10}
                        dataKey="saleInvoiceId"
                        responsiveLayout="scroll"
                        emptyMessage={registerSearch.trim() ? 'No invoices match your search.' : 'No invoices found.'}
                        onRowDoubleClick={(event) => {
                            const row = event.data as SaleInvoiceListItem;
                            onOpenEdit(Number(row.saleInvoiceId));
                        }}
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
                        <Column
                            header="Action"
                            body={(row: SaleInvoiceListItem) => (
                                <div className="flex align-items-center gap-1">
                                    <Button
                                        icon="pi pi-pencil"
                                        text
                                        onClick={() => onOpenEdit(Number(row.saleInvoiceId))}
                                        aria-label={`Edit invoice ${row.saleInvoiceId}`}
                                        disabled={saving}
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        text
                                        severity="danger"
                                        onClick={() => {
                                            const saleInvoiceId = Number(row.saleInvoiceId);
                                            if (!confirmDeleteInvoice(saleInvoiceId)) return;
                                            void onDeleteInvoice(saleInvoiceId);
                                        }}
                                        aria-label={`Delete invoice ${row.saleInvoiceId}`}
                                        disabled={saving}
                                    />
                                </div>
                            )}
                            style={{ width: '8rem' }}
                        />
                    </DataTable>
                </div>
            )}

            <PhaseOneWarningDialog
                visible={phaseOneWarningVisible}
                onCancel={onCancelPhaseOneWarning}
                onContinue={onConfirmPhaseOneWarning}
                loading={saving}
            />
        </div>
    );
}
