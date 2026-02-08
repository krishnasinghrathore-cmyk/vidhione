'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import { AppRegisterSearch } from '@/components/AppRegisterSearch';
import { ReportHeader } from '@/components/ReportHeader';
import { LabelWithIcon } from './components/LabelWithIcon';
import { PaymentVoucherTableActions } from './components/PaymentVoucherTableActions';
import { PaymentVoucherTableFilters } from './components/PaymentVoucherTableFilters';
import type { ColumnFilterMeta, PaymentVoucherDisplayRow, VoucherRow } from './types';
import {
    AMOUNT_CURRENCY_ICON,
    MULTISELECT_COLUMN_PROPS,
    formatAmountWithCurrency,
    isEmptyFilterValue,
    resolveFilterValue
} from './utils';
import type { PaymentVoucherViewProps } from './usePaymentVoucherState';

const PaymentVoucherTableComponent = (props: PaymentVoucherViewProps) => {
    const {
        toastRef,
        filteredRows,
        rowsPerPage,
        setRowsPerPage,
        first,
        setFirst,
        hasApplied,
        hasClientSideFiltering,
        hasGlobalSearch,
        registerVariables,
        setAppliedVariables,
        totalRecordsForTable,
        loading,
        globalSearchText,
        setGlobalSearchText,
        globalSearchMatchCase,
        setGlobalSearchMatchCase,
        globalSearchWholeWord,
        setGlobalSearchWholeWord,
        selectedRow,
        setSelectedRow,
        columnFilters,
        setColumnFilters,
        totals,
        voucherTypeNoFilterElement,
        voucherPostingDateFilterElement,
        refFilterElement,
        ledgerCrDrFilterElement,
        netAmtFilterElement,
        narrationFilterElement,
        paidByFilterElement,
        ledgerGroupFilterElement,
        cashLedgerLabel,
        openEditForRow,
        openAdd,
        saving
    } = props;
    const summaryCount = totalRecordsForTable;
    const textHeaderClassName = 'payment-voucher-text-header';
    const hasTableRows = totalRecordsForTable > 0;
    const registerSubtitle = `${summaryCount} voucher${summaryCount === 1 ? '' : 's'} • Total ${formatAmountWithCurrency(totals)}`;

    const renderStackedHeader = (top: string, bottom: string, topIcon: string, bottomIcon: string) => (
        <div className="flex flex-column">
            <LabelWithIcon icon={topIcon}>{top}</LabelWithIcon>
            <LabelWithIcon icon={bottomIcon} className="text-600 text-sm">
                {bottom}
            </LabelWithIcon>
        </div>
    );

    const renderStackedValue = (top: React.ReactNode, bottom: React.ReactNode) => (
        <div className="flex flex-column">
            <span>{top ?? ''}</span>
            <span className="text-600 text-sm">{bottom ?? ''}</span>
        </div>
    );

    const renderLedgerHeader = () => (
        <div className="flex flex-column gap-1">
            <LabelWithIcon icon="pi-wallet" className="text-primary font-semibold">
                Ledger (Cr)
            </LabelWithIcon>
            <LabelWithIcon icon="pi-wallet">
                Ledger (Dr)
            </LabelWithIcon>
        </div>
    );

    return (
        <div className="cash-exp-split__list">
            <div className="card app-gradient-card">
                <Toast ref={toastRef} />
                <ReportHeader
                    title="Voucher Register"
                    subtitle={registerSubtitle}
                    rightSlot={
                        <AppRegisterSearch
                            value={globalSearchText}
                            onValueChange={(nextValue) => {
                                setFirst(0);
                                setGlobalSearchText(nextValue);
                            }}
                            matchCase={globalSearchMatchCase}
                            onMatchCaseChange={(nextValue) => {
                                setFirst(0);
                                setGlobalSearchMatchCase(nextValue);
                            }}
                            wholeWord={globalSearchWholeWord}
                            onWholeWordChange={(nextValue) => {
                                setFirst(0);
                                setGlobalSearchWholeWord(nextValue);
                            }}
                            placeholder="Search register..."
                            helperText="Aa: Match Case · W: Whole Word"
                            className="payment-voucher-register-search app-register-search--compact"
                        />
                    }
                    className="payment-voucher-report-header"
                />

                <AppDataTable
                    value={filteredRows}
                    paginator={hasTableRows}
                    rows={rowsPerPage}
                    rowsPerPageOptions={hasTableRows ? [10, 20, 50, 100] : undefined}
                    totalRecords={totalRecordsForTable}
                    lazy
                    first={first}
                    onPage={(e) => {
                        setRowsPerPage(e.rows);
                        setFirst(e.first);
                        if (!hasApplied) return;
                        if (hasClientSideFiltering) return;
                        const nextVariables = { ...registerVariables, limit: e.rows, offset: e.first };
                        setAppliedVariables(nextVariables);
                    }}
                    dataKey="voucherId"
                    stripedRows
                    size="small"
                    loading={loading}
                    selectionMode="single"
                    selection={selectedRow}
                    onSelectionChange={(e) => setSelectedRow(e.value as VoucherRow | null)}
                    filters={columnFilters}
                    filterDisplay="menu"
                    filterDelay={400}
                    onFilter={(event) => {
                        const hasAnyColumnFilter = Object.values(event.filters ?? {}).some((meta) => {
                            const value = resolveFilterValue(meta as ColumnFilterMeta);
                            return !isEmptyFilterValue(value);
                        });
                        setFirst(0);
                        setColumnFilters(event.filters);
                        if (!hasApplied) return;
                        if (hasAnyColumnFilter || hasGlobalSearch) return;
                        const nextVariables = { ...registerVariables, limit: rowsPerPage, offset: 0 };
                        setAppliedVariables(nextVariables);
                    }}
                    headerLeft={<PaymentVoucherTableFilters viewProps={props} />}
                    headerRight={<PaymentVoucherTableActions viewProps={props} />}
                    emptyMessage={
                        loading ? (
                            ''
                        ) : (
                            <div className="app-report-empty-state payment-voucher-empty-state">
                                <i className="pi pi-inbox app-report-empty-state__icon" aria-hidden="true" />
                                <div className="app-report-empty-state__title">No vouchers found</div>
                                <div className="app-report-empty-state__hint">
                                    Try changing date range or create a new voucher.
                                </div>
                                <Button
                                    label="New Voucher"
                                    icon="pi pi-plus"
                                    className="app-action-compact p-button-outlined"
                                    onClick={openAdd}
                                    disabled={saving}
                                />
                            </div>
                        )
                    }
                >
                    <Column
                        header={renderStackedHeader('Voucher Type', 'Voucher No.', 'pi-file', 'pi-hashtag')}
                        body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.voucherTypeDisplay, r.voucherNoDisplay)}
                        filterField="voucherTypeNoDisplay"
                        filterElement={voucherTypeNoFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '10rem' }}
                    />
                    <Column
                        header={renderStackedHeader('Voucher Date', 'Posting Date', 'pi-calendar', 'pi-calendar-plus')}
                        body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.voucherDateDisplay, r.postingDateDisplay)}
                        filterField="voucherPostingDateDisplay"
                        filterElement={voucherPostingDateFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '9rem' }}
                    />
                    <Column
                        header={renderStackedHeader('Ref. No.', 'Ref. Date', 'pi-file-edit', 'pi-calendar')}
                        body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.refNo ?? '', r.refDateDisplay)}
                        filterField="refDisplay"
                        filterElement={refFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '9rem' }}
                    />
                    <Column
                        header={renderLedgerHeader()}
                        body={(r: PaymentVoucherDisplayRow) => {
                            const ledgerCr = r.ledgerCrDisplay || cashLedgerLabel;
                            if (r.ledgerDrLinesDisplay.length === 0) {
                                return (
                                    <div className="flex flex-column">
                                        <span className="font-semibold text-primary">{ledgerCr}</span>
                                        <span className="text-600 text-sm" />
                                    </div>
                                );
                            }
                            return (
                                <div className="flex flex-column gap-1">
                                    <span className="font-semibold text-primary">{ledgerCr}</span>
                                    <div style={{ display: 'grid', gap: '0.1rem' }} title={r.ledgerDrTitle || undefined}>
                                        {r.ledgerDrLinesDisplay.map((line, index) => (
                                            <div
                                                key={`${line.name}-${index}`}
                                                style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
                                            >
                                                <span>{line.name}</span>
                                                {r.showLedgerDrAmounts && <span style={{ whiteSpace: 'nowrap' }}>{line.amount}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }}
                        filterField="ledgerCrDrDisplay"
                        filterElement={ledgerCrDrFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '18rem' }}
                    />
                    <Column
                        field="totalNetAmount"
                        header={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Net Amt</LabelWithIcon>}
                        body={(r: PaymentVoucherDisplayRow) => r.netAmtDisplay}
                        filterField="netAmtDisplay"
                        filterElement={netAmtFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                        headerClassName="payment-voucher-net-amt-header"
                        headerStyle={{ width: '8rem', textAlign: 'right' }}
                        style={{ width: '8rem', textAlign: 'right' }}
                    />
                    <Column
                        field="narration"
                        header={<LabelWithIcon icon="pi-pencil">Narration</LabelWithIcon>}
                        body={(r: VoucherRow) => r.narration ?? ''}
                        filterElement={narrationFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '14rem' }}
                    />
                    <Column
                        field="managerName"
                        header={<LabelWithIcon icon="pi-user">Paid By</LabelWithIcon>}
                        filterElement={paidByFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '12rem' }}
                    />
                    <Column
                        field="debitLedgerGroupName"
                        header={<LabelWithIcon icon="pi-sitemap">Ledger Group (Dr)</LabelWithIcon>}
                        filterElement={ledgerGroupFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '12rem' }}
                    />
                    <Column
                        header={<LabelWithIcon icon="pi-cog">Actions</LabelWithIcon>}
                        body={(r: VoucherRow) => (
                            <Button
                                icon="pi pi-pencil"
                                className="p-button-text p-button-sm"
                                onClick={() => openEditForRow(r)}
                                disabled={saving}
                                tooltip="Edit"
                                tooltipOptions={{ position: 'top' }}
                            />
                        )}
                        style={{ width: '6rem' }}
                    />
                </AppDataTable>
            </div>
        </div>
    );
};

const arePaymentVoucherTablePropsEqual = (prev: PaymentVoucherViewProps, next: PaymentVoucherViewProps) =>
    prev.toastRef === next.toastRef &&
    prev.filteredRows === next.filteredRows &&
    prev.rowsPerPage === next.rowsPerPage &&
    prev.setRowsPerPage === next.setRowsPerPage &&
    prev.first === next.first &&
    prev.setFirst === next.setFirst &&
    prev.hasApplied === next.hasApplied &&
    prev.hasClientSideFiltering === next.hasClientSideFiltering &&
    prev.hasGlobalSearch === next.hasGlobalSearch &&
    prev.globalSearchText === next.globalSearchText &&
    prev.globalSearchMatchCase === next.globalSearchMatchCase &&
    prev.globalSearchWholeWord === next.globalSearchWholeWord &&
    prev.setGlobalSearchText === next.setGlobalSearchText &&
    prev.setGlobalSearchMatchCase === next.setGlobalSearchMatchCase &&
    prev.setGlobalSearchWholeWord === next.setGlobalSearchWholeWord &&
    prev.registerVariables === next.registerVariables &&
    prev.setAppliedVariables === next.setAppliedVariables &&
    prev.totalRecordsForTable === next.totalRecordsForTable &&
    prev.loading === next.loading &&
    prev.selectedRow === next.selectedRow &&
    prev.setSelectedRow === next.setSelectedRow &&
    prev.columnFilters === next.columnFilters &&
    prev.setColumnFilters === next.setColumnFilters &&
    prev.totals === next.totals &&
    prev.voucherTypeNoFilterElement === next.voucherTypeNoFilterElement &&
    prev.voucherPostingDateFilterElement === next.voucherPostingDateFilterElement &&
    prev.refFilterElement === next.refFilterElement &&
    prev.ledgerCrDrFilterElement === next.ledgerCrDrFilterElement &&
    prev.netAmtFilterElement === next.netAmtFilterElement &&
    prev.narrationFilterElement === next.narrationFilterElement &&
    prev.paidByFilterElement === next.paidByFilterElement &&
    prev.ledgerGroupFilterElement === next.ledgerGroupFilterElement &&
    prev.cashLedgerLabel === next.cashLedgerLabel &&
    prev.openEditForRow === next.openEditForRow &&
    prev.saving === next.saving &&
    prev.hasTouchedDatesRef === next.hasTouchedDatesRef &&
    prev.dateRange === next.dateRange &&
    prev.setDateRange === next.setDateRange &&
    prev.setDateErrors === next.setDateErrors &&
    prev.dateErrors === next.dateErrors &&
    prev.fiscalRange === next.fiscalRange &&
    prev.fromDateInputRef === next.fromDateInputRef &&
    prev.toDateInputRef === next.toDateInputRef &&
    prev.cancelled === next.cancelled &&
    prev.setCancelled === next.setCancelled &&
    prev.printMenuItems === next.printMenuItems &&
    prev.printMenuRef === next.printMenuRef &&
    prev.refreshButtonId === next.refreshButtonId &&
    prev.handleRefresh === next.handleRefresh &&
    prev.canRefresh === next.canRefresh;

export const PaymentVoucherTable = React.memo(PaymentVoucherTableComponent, arePaymentVoucherTablePropsEqual);
PaymentVoucherTable.displayName = 'PaymentVoucherTable';
