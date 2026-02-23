'use client';
import React from 'react';
import { useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable, type DataTableFilterEvent, type DataTablePageEvent } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Skeleton } from 'primereact/skeleton';
import AppDataTable from '@/components/AppDataTable';
import { AppRegisterSearch } from '@/components/AppRegisterSearch';
import { ReportHeader } from '@/components/ReportHeader';
import { LabelWithIcon } from './components/LabelWithIcon';
import { VoucherTableActions } from './components/VoucherTableActions';
import { VoucherTableFilters } from './components/VoucherTableFilters';
import { VOUCHER_ENTRY_BY_ID } from './graphql';
import type { ColumnFilterMeta, PaymentVoucherDisplayRow, VoucherRow } from './types';
import {
    AMOUNT_CURRENCY_ICON,
    MULTISELECT_COLUMN_PROPS,
    formatAmount,
    formatDate,
    isEmptyFilterValue,
    resolveFilterValue
} from './utils';
import { resolveVoucherThemeClass } from './voucherThemeClass';
import type { VoucherViewProps } from './useVoucherState';

type InvoiceDetailLine = {
    invoiceNo: string;
    invoiceDate: string;
    invoiceAmount: string;
    raw: string;
};

type VoucherDetailPostingLine = {
    key: string;
    ledgerGroupName: string;
    ledgerName: string;
    drCrLabel: 'Dr' | 'Cr';
    amount: number;
};

const MAX_VISIBLE_INVOICE_LINES = 2;

const parseInvoiceDetailLine = (line: string): InvoiceDetailLine => {
    const parts = line.split('|').map((value) => value.trim());
    const [invoiceNo = '', invoiceDate = '', ...invoiceAmountParts] = parts;
    return {
        invoiceNo,
        invoiceDate,
        invoiceAmount: invoiceAmountParts.join(' | '),
        raw: line.trim()
    };
};

const toFiniteNumberOrNull = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const firstLine = (value: string): string => value.split('\n').map((part) => part.trim()).find(Boolean) ?? '';

const VoucherTableComponent = (props: VoucherViewProps) => {
    const {
        voucherProfileKey,
        paymentMode,
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
        registerQueryLoading,
        startPageIndexLoadMeasurement,
        voucherTypeNoFilterElement,
        voucherPostingDateFilterElement,
        refFilterElement,
        ledgerCrDrFilterElement,
        managerSalesmanFilterElement,
        bankBranchFilterElement,
        fullPaidFilterElement,
        totalDiscountFilterElement,
        netAdjustedFilterElement,
        netAmtFilterElement,
        diffAmtFilterElement,
        chequeReturnStatusFilterElement,
        narrationFilterElement,
        paidByFilterElement,
        ledgerGroupFilterElement,
        registerPrimaryLedgerLabel,
        registerEntryLedgerLabel,
        requiresManager,
        allowLineDrCrSelection,
        lineEntryDrCrLabel,
        cashLedgerLabel,
        openEditForRow,
        voucherActions
    } = props;
    const [expandedInvoiceVoucherIds, setExpandedInvoiceVoucherIds] = React.useState<Set<number>>(new Set());
    const [viewRow, setViewRow] = React.useState<PaymentVoucherDisplayRow | null>(null);
    const viewVoucherId = viewRow?.voucherId != null ? Number(viewRow.voucherId) : null;
    const { data: viewVoucherData, loading: viewVoucherLoading, error: viewVoucherError } = useQuery(
        VOUCHER_ENTRY_BY_ID,
        {
            variables: { voucherId: viewVoucherId ?? 0 },
            skip: viewVoucherId == null,
            fetchPolicy: 'network-only',
            nextFetchPolicy: 'cache-first',
            notifyOnNetworkStatusChange: true
        }
    );
    const closeViewDialog = React.useCallback(() => {
        setViewRow(null);
    }, []);
    const openViewDialog = React.useCallback((row: PaymentVoucherDisplayRow) => {
        setViewRow(row);
    }, []);

    const toggleInvoiceExpansion = React.useCallback((voucherId: number) => {
        setExpandedInvoiceVoucherIds((previous) => {
            const next = new Set(previous);
            if (next.has(voucherId)) {
                next.delete(voucherId);
            } else {
                next.add(voucherId);
            }
            return next;
        });
    }, []);
    const summaryCount = totalRecordsForTable;
    const textHeaderClassName = 'payment-voucher-text-header';
    const hasTableRows = totalRecordsForTable > 0;
    const registerRecordSummary = hasApplied
        ? loading
            ? 'Loading vouchers...'
            : `${summaryCount} voucher${summaryCount === 1 ? '' : 's'}`
        : 'Press Refresh to load vouchers';
    const isReceiptRegister = voucherProfileKey === 'receipt';
    const isReceiptCashRegister = isReceiptRegister && paymentMode === 'cash';
    const isReceiptBankRegister = isReceiptRegister && paymentMode === 'bank';
    const isJournalRegister = voucherProfileKey === 'journal';
    const isCreditNoteRegister = voucherProfileKey === 'credit-note';
    const isDebitNoteRegister = voucherProfileKey === 'debit-note';
    const isNoteRegister = isCreditNoteRegister || isDebitNoteRegister;
    const showLegacyReceiptColumns = isReceiptCashRegister || isReceiptBankRegister;
    const showInvoiceDetailsColumn = showLegacyReceiptColumns || isJournalRegister;
    const refNoHeaderLabel = isCreditNoteRegister
        ? 'Bill No.'
        : isDebitNoteRegister
          ? 'Pur. Voucher No.'
          : isReceiptCashRegister
            ? 'Receipt No.'
          : paymentMode === 'bank'
            ? 'Cheque No.'
            : 'Ref. No.';
    const refDateHeaderLabel = isCreditNoteRegister
        ? 'Bill Date'
        : isDebitNoteRegister
          ? 'Pur. Voucher Date'
          : isReceiptCashRegister
            ? 'Receipt Date'
          : paymentMode === 'bank'
            ? 'Cheque Date'
            : 'Ref. Date';
    const renderStackedHeader = (top: string, bottom: string, topIcon: string, bottomIcon: string) => (
        <div className="flex flex-column">
            <LabelWithIcon icon={topIcon}>{top}</LabelWithIcon>
            <LabelWithIcon icon={bottomIcon} className="text-600 text-sm">
                {bottom}
            </LabelWithIcon>
        </div>
    );

    const voucherTypeHeader = isReceiptCashRegister ? (
        <div className="flex flex-column">
            <LabelWithIcon icon="pi-file">Voucher Type</LabelWithIcon>
            <LabelWithIcon icon="pi-hashtag" className="text-600 text-sm">
                Voucher No.
            </LabelWithIcon>
            <LabelWithIcon icon="pi-calendar" className="text-600 text-sm">
                Date
            </LabelWithIcon>
        </div>
    ) : (
        renderStackedHeader('Voucher Type', 'Voucher No.', 'pi-file', 'pi-hashtag')
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
                {registerPrimaryLedgerLabel}
            </LabelWithIcon>
            <LabelWithIcon icon="pi-wallet">
                {registerEntryLedgerLabel}
            </LabelWithIcon>
        </div>
    );
    const resolveRowClassName = React.useCallback(
        (row: PaymentVoucherDisplayRow) =>
            (Number(row.isReconciledFlag ?? 0) === 1 ? 'voucher-register-row--reconciled' : ''),
        []
    );
    const detailHeader = (viewVoucherData?.voucherEntryById?.header ?? null) as Record<string, unknown> | null;
    const detailBillRows = (viewVoucherData?.voucherEntryById?.billDetails ?? []) as Array<Record<string, unknown>>;
    const detailPostingRaw = (viewVoucherData?.voucherEntryById?.lines ?? []) as Array<Record<string, unknown>>;
    const hasLegacyDrCrFlag = detailPostingRaw.some((line) => Number(line?.drCrFlag ?? 0) === 2);
    const detailPostingRows = React.useMemo<VoucherDetailPostingLine[]>(
        () =>
            detailPostingRaw
                .map((line, index) => {
                    const drCrFlag = Number(line?.drCrFlag ?? 0);
                    const drCrLabel =
                        hasLegacyDrCrFlag
                        ? (drCrFlag === 2 ? 'Cr' : 'Dr')
                        : (drCrFlag === 1 ? 'Cr' : 'Dr');
                const amount = Number(line?.amount ?? 0);
                    return {
                        key: `${index}-${line?.ledgerId ?? 'line'}`,
                        ledgerGroupName: String(line?.ledgerGroupName ?? '').trim(),
                        ledgerName: String(line?.ledgerName ?? '').trim(),
                        drCrLabel,
                        amount: Number.isFinite(amount) ? amount : 0
                    };
                })
                .sort((left, right) => {
                    if (left.drCrLabel !== right.drCrLabel) {
                        return left.drCrLabel === 'Dr' ? -1 : 1;
                    }
                    return left.key.localeCompare(right.key);
                }),
        [detailPostingRaw, hasLegacyDrCrFlag]
    );
    const detailVoucherNo = String(detailHeader?.voucherNumber ?? viewRow?.voucherNumber ?? viewVoucherId ?? '').trim();
    const detailVoucherDate = formatDate(String(detailHeader?.voucherDate ?? viewRow?.voucherDate ?? ''));
    const detailPostingDate = formatDate(String(detailHeader?.postingDate ?? viewRow?.postingDate ?? ''));
    const detailRefNo = String(detailHeader?.refNo ?? viewRow?.refNoDisplayValue ?? '').trim();
    const detailRefDate = formatDate(String(detailHeader?.refDate ?? viewRow?.refDate ?? ''));
    const detailNarration = String(detailHeader?.narration ?? viewRow?.narration ?? '').trim();
    const detailAmount =
        toFiniteNumberOrNull(detailHeader?.totalNetAmount) ??
        toFiniteNumberOrNull(viewRow?.totalNetAmount) ??
        0;
    const detailDiscountAmount =
        toFiniteNumberOrNull(detailHeader?.discountAmount) ??
        toFiniteNumberOrNull(viewRow?.discountAmount) ??
        0;
    const detailChequeReturnCharges =
        toFiniteNumberOrNull(detailHeader?.chequeCancelCharges) ??
        toFiniteNumberOrNull(viewRow?.chequeCancelCharges) ??
        0;
    const detailManager = String(detailHeader?.managerName ?? viewRow?.managerDisplay ?? '').trim();
    const detailSalesman = String((detailHeader as any)?.salesmanName ?? viewRow?.salesmanDisplay ?? '').trim();
    const detailIsReconciled = Number(detailHeader?.isReconciledFlag ?? viewRow?.isReconciledFlag ?? 0) === 1;
    const detailReconciliationDate = formatDate(String(detailHeader?.reconciliationDate ?? ''));
    const detailVoucherType = String(
        detailHeader?.voucherTypeName ?? viewRow?.voucherTypeDisplay ?? voucherProfileKey ?? 'Voucher'
    ).trim();
    const detailVoucherTitleBase = detailVoucherType || 'Voucher';
    const detailVoucherTitle = /voucher/i.test(detailVoucherTitleBase)
        ? detailVoucherTitleBase
        : `${detailVoucherTitleBase} Voucher`;
    const detailDialogTitle = detailVoucherNo ? `${detailVoucherTitle} #${detailVoucherNo}` : detailVoucherTitle;
    const detailManagerLabel = String(props.managerLabel ?? 'Manager').trim() || 'Manager';
    const detailReceiptNoLabel = isReceiptCashRegister ? 'Receipt No.' : refNoHeaderLabel;
    const detailReceiptDateLabel = isReceiptCashRegister ? 'Receipt Date' : refDateHeaderLabel;
    const registerRowsForView = filteredRows as PaymentVoucherDisplayRow[];
    const currentViewRowIndex = React.useMemo(() => {
        if (!viewRow) return -1;
        const currentVoucherId = Number(viewRow.voucherId ?? 0);
        if (!Number.isFinite(currentVoucherId) || currentVoucherId <= 0) return -1;
        return registerRowsForView.findIndex((row) => Number(row.voucherId ?? 0) === currentVoucherId);
    }, [registerRowsForView, viewRow]);
    const canViewPrevVoucher = currentViewRowIndex > 0;
    const canViewNextVoucher = currentViewRowIndex >= 0 && currentViewRowIndex < registerRowsForView.length - 1;
    const openAdjacentVoucher = React.useCallback(
        (direction: -1 | 1) => {
            if (currentViewRowIndex < 0) return;
            const nextRow = registerRowsForView[currentViewRowIndex + direction];
            if (!nextRow) return;
            setViewRow(nextRow);
        },
        [currentViewRowIndex, registerRowsForView]
    );
    const detailDialogHeader = (
        <div className="voucher-view-dialog__header">
            <span className="voucher-view-dialog__header-title">{detailDialogTitle}</span>
            <div className="voucher-view-dialog__header-nav">
                <Button
                    type="button"
                    icon="pi pi-angle-left"
                    className="p-button-text p-button-sm"
                    onClick={() => openAdjacentVoucher(-1)}
                    disabled={!canViewPrevVoucher || viewVoucherLoading}
                    tooltip="Previous voucher"
                    tooltipOptions={{ position: 'top' }}
                />
                <Button
                    type="button"
                    icon="pi pi-angle-right"
                    className="p-button-text p-button-sm"
                    onClick={() => openAdjacentVoucher(1)}
                    disabled={!canViewNextVoucher || viewVoucherLoading}
                    tooltip="Next voucher"
                    tooltipOptions={{ position: 'top' }}
                />
            </div>
        </div>
    );
    const detailDebitPostingLine = detailPostingRows.find((line) => line.drCrLabel === 'Dr');
    const detailCreditPostingLine = detailPostingRows.find((line) => line.drCrLabel === 'Cr');
    const detailEntryLedger = firstLine(String(detailHeader?.debitLedgerName ?? viewRow?.ledgerDrDisplay ?? '').trim());
    const detailPrimaryLedger = String((detailHeader as any)?.primaryLedgerName ?? viewRow?.ledgerCrDisplay ?? '').trim();
    const detailPrimaryLedgerGroup = String(
        (detailHeader as any)?.primaryLedgerGroupName ?? viewRow?.primaryLedgerGroupDisplay ?? ''
    ).trim();
    const detailPrimaryLedgerAddress = String((detailHeader as any)?.primaryLedgerAddress ?? '').trim();
    const detailLedgerDrDisplay = detailEntryLedger || detailDebitPostingLine?.ledgerName || '';
    const detailLedgerCrDisplay =
        firstLine(String((detailHeader as any)?.creditLedgerName ?? detailPrimaryLedger ?? viewRow?.ledgerCrDisplay ?? '')) ||
        detailCreditPostingLine?.ledgerName ||
        '';
    const detailLedgerCrGroupDisplay =
        detailPrimaryLedgerGroup || detailCreditPostingLine?.ledgerGroupName || '';
    const detailAddressDisplay = detailPrimaryLedgerAddress;
    const showDetailManager = voucherProfileKey !== 'journal' && detailManager.length > 0;
    const showDetailSalesman = voucherProfileKey !== 'journal' && detailSalesman.length > 0;
    const detailMetaSecondaryPrimaryColClass =
        showDetailManager && showDetailSalesman
            ? 'md:col-4'
            : showDetailManager || showDetailSalesman
              ? 'md:col-8'
              : 'md:col-12';
    const detailPostingTotals = React.useMemo(() => {
        return detailPostingRows.reduce(
            (totals, line) => {
                if (line.drCrLabel === 'Dr') {
                    totals.dr += Number(line.amount || 0);
                } else {
                    totals.cr += Number(line.amount || 0);
                }
                return totals;
            },
            { dr: 0, cr: 0 }
        );
    }, [detailPostingRows]);
    const detailPostingDifference = detailPostingTotals.dr - detailPostingTotals.cr;
    const detailPostingDifferenceLabel = `${formatAmount(Math.abs(detailPostingDifference))} ${
        detailPostingDifference >= 0 ? 'Dr' : 'Cr'
    }`;
    const viewDialogThemeClass = React.useMemo(
        () => resolveVoucherThemeClass(voucherProfileKey, paymentMode),
        [paymentMode, voucherProfileKey]
    );
    const detailLoadingSkeleton = (
        <div className="voucher-view-dialog__loading-skeleton" aria-busy="true" aria-live="polite">
            <div className="voucher-view-dialog__main-title">Main Details</div>
            <div className="voucher-view-dialog__meta">
                <div className="grid voucher-view-dialog__skeleton-grid">
                    {Array.from({ length: 5 }, (_, index) => (
                        <div className="col-12 sm:col-6 md:col-2 voucher-view-dialog__skeleton-cell" key={`meta-${index}`}>
                            <Skeleton width="5rem" height="0.7rem" className="mb-2" />
                            <Skeleton width={index === 4 ? '7rem' : '6rem'} height="1.05rem" />
                        </div>
                    ))}
                </div>
                <div className="grid voucher-view-dialog__skeleton-grid">
                    <div className="col-12 md:col-8 voucher-view-dialog__skeleton-cell">
                        <Skeleton width="7rem" height="0.7rem" className="mb-2" />
                        <Skeleton width="15rem" height="1.05rem" />
                    </div>
                    <div className="col-12 md:col-4 voucher-view-dialog__skeleton-cell">
                        <Skeleton width="5rem" height="0.7rem" className="mb-2" />
                        <Skeleton width="8rem" height="1.05rem" />
                    </div>
                </div>
                <div className="grid voucher-view-dialog__skeleton-grid">
                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__skeleton-cell">
                        <Skeleton width="6rem" height="0.7rem" className="mb-2" />
                        <Skeleton width="5rem" height="1.05rem" />
                    </div>
                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__skeleton-cell">
                        <Skeleton width="7.5rem" height="0.7rem" className="mb-2" />
                        <Skeleton width="7rem" height="1.05rem" />
                    </div>
                </div>
                <div className="voucher-view-dialog__skeleton-narration">
                    <Skeleton width="5rem" height="0.7rem" className="mb-2" />
                    <Skeleton width="100%" height="1.05rem" />
                </div>
            </div>

            <div className="voucher-view-dialog__section">
                <div className="voucher-view-dialog__section-title">Bill Details</div>
                <div className="voucher-view-dialog__skeleton-table">
                    <Skeleton width="100%" height="2.1rem" />
                    <Skeleton width="100%" height="2rem" className="mt-1" />
                    <Skeleton width="100%" height="2rem" className="mt-1" />
                </div>
            </div>

            <div className="voucher-view-dialog__section">
                <div className="voucher-view-dialog__section-title">Ledger Posting</div>
                <div className="voucher-view-dialog__skeleton-table">
                    <Skeleton width="100%" height="2.1rem" />
                    <Skeleton width="100%" height="2rem" className="mt-1" />
                    <Skeleton width="100%" height="2rem" className="mt-1" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="cash-exp-split__list">
            <div className="card app-gradient-card">
                <ReportHeader
                    title="Voucher Register"
                    subtitle="Voucher records for the selected date range and filters."
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
                    onPage={(event: DataTablePageEvent) => {
                        const nextRows = event.rows ?? rowsPerPage;
                        const nextFirst = event.first ?? first;
                        if (nextRows === rowsPerPage && nextFirst === first) return;
                        setRowsPerPage(nextRows);
                        setFirst(nextFirst);
                        if (!hasApplied) return;
                        if (hasClientSideFiltering) return;
                        startPageIndexLoadMeasurement(nextFirst, nextRows);
                        const clearPageCursors = {
                            pageAfterVoucherDate: null,
                            pageAfterVoucherNumber: null,
                            pageAfterVoucherId: null,
                            pageBeforeVoucherDate: null,
                            pageBeforeVoucherNumber: null,
                            pageBeforeVoucherId: null
                        };
                        const nextVariables = {
                            ...registerVariables,
                            limit: nextRows,
                            offset: nextFirst,
                            ...clearPageCursors,
                            includeSummary: false,
                            totalCountHint: totalRecordsForTable
                        };
                        setAppliedVariables(nextVariables);
                    }}
                    dataKey="voucherId"
                    stripedRows
                    size="small"
                    loading={loading}
                    selectionMode="single"
                    selection={selectedRow}
                    onSelectionChange={(event: { value: unknown }) =>
                        setSelectedRow((event.value as VoucherRow | null) ?? null)
                    }
                    rowClassName={resolveRowClassName}
                    filters={columnFilters}
                    filterDisplay="menu"
                    filterDelay={400}
                    onFilter={(event: DataTableFilterEvent) => {
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
                    headerLeft={<VoucherTableFilters viewProps={props} />}
                    headerRight={<VoucherTableActions viewProps={props} />}
                    emptyMessage={
                        loading ? (
                            ''
                        ) : (
                            <div className="app-report-empty-state payment-voucher-empty-state">
                                <i className="pi pi-inbox app-report-empty-state__icon" aria-hidden="true" />
                                <div className="app-report-empty-state__title">No vouchers found</div>
                                <div className="app-report-empty-state__hint">
                                    Try changing date range or use the New Voucher button at top-right.
                                </div>
                            </div>
                        )
                    }
                    recordSummary={registerRecordSummary}
                >
                    <Column
                        header={voucherTypeHeader}
                        body={(r: PaymentVoucherDisplayRow) =>
                            isReceiptCashRegister ? (
                                <div className="flex flex-column">
                                    <span>{r.voucherTypeDisplay}</span>
                                    <span>{r.voucherNoDisplay}</span>
                                    <span className="text-600 text-sm">{r.voucherDateDisplay}</span>
                                </div>
                            ) : (
                                renderStackedValue(r.voucherTypeDisplay, r.voucherNoDisplay)
                            )
                        }
                        filterField="voucherTypeNoDisplay"
                        filterElement={voucherTypeNoFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '10rem' }}
                    />
                    {isReceiptCashRegister ? (
                        <Column
                            header={renderStackedHeader(refNoHeaderLabel, refDateHeaderLabel, 'pi-file-edit', 'pi-calendar')}
                            body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.refNoDisplayValue, r.refDateDisplayValue)}
                            filterField="refDisplay"
                            filterElement={refFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '9rem' }}
                        />
                    ) : (
                        <Column
                            header={renderStackedHeader('Voucher Date', 'Posting Date', 'pi-calendar', 'pi-calendar-plus')}
                            body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.voucherDateDisplay, r.postingDateDisplay)}
                            filterField="voucherPostingDateDisplay"
                            filterElement={voucherPostingDateFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '9rem' }}
                        />
                    )}
                    {!isReceiptCashRegister && (
                        <Column
                            header={renderStackedHeader(refNoHeaderLabel, refDateHeaderLabel, 'pi-file-edit', 'pi-calendar')}
                            body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.refNoDisplayValue, r.refDateDisplayValue)}
                            filterField="refDisplay"
                            filterElement={refFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '9rem' }}
                        />
                    )}
                    {isNoteRegister ? (
                        <Column
                            header={renderStackedHeader('Party Dr/Cr Note No.', 'Party Dr/Cr Note Date', 'pi-file-edit', 'pi-calendar')}
                            body={(r: PaymentVoucherDisplayRow) =>
                                renderStackedValue(r.referenceNo2DisplayValue, r.referenceDate2DisplayValue)
                            }
                            headerClassName={textHeaderClassName}
                            style={{ width: '11rem' }}
                        />
                    ) : null}
                    {isNoteRegister ? (
                        <Column
                            header={<LabelWithIcon icon="pi-comment">Reason For Issue</LabelWithIcon>}
                            body={(r: PaymentVoucherDisplayRow) => r.reasonForIssueDisplay}
                            headerClassName={textHeaderClassName}
                            style={{ width: '12rem' }}
                        />
                    ) : null}
                    <Column
                        header={renderLedgerHeader()}
                        body={(r: PaymentVoucherDisplayRow) => {
                            const ledgerCr = r.ledgerCrDisplay || cashLedgerLabel;
                            if (r.ledgerDrLinesDisplay.length === 0) {
                                return (
                                    <div className="flex flex-column">
                                        <span className="font-semibold text-primary">{ledgerCr}</span>
                                    </div>
                                );
                            }
                            return (
                                <div className="flex flex-column gap-1">
                                    <div className="flex flex-column">
                                        <span className="font-semibold text-primary">{ledgerCr}</span>
                                    </div>
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
                    {isReceiptCashRegister && (
                        <Column
                            header={renderStackedHeader('Manager', 'Salesman', 'pi-user', 'pi-users')}
                            body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.managerDisplay, r.salesmanDisplay)}
                            filterField="managerSalesmanDisplay"
                            filterElement={managerSalesmanFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '13rem' }}
                        />
                    )}
                    {isReceiptBankRegister && (
                        <Column
                            header={<LabelWithIcon icon="pi-check-square">Full Paid</LabelWithIcon>}
                            body={(r: PaymentVoucherDisplayRow) => r.fullPaidDisplay}
                            filterField="fullPaidDisplay"
                            filterElement={fullPaidFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '6.5rem' }}
                        />
                    )}
                    {isReceiptBankRegister && (
                        <Column
                            header={renderStackedHeader('Bank', 'Branch', 'pi-building', 'pi-sitemap')}
                            body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.bankDisplay, r.branchDisplay)}
                            filterField="bankBranchDisplay"
                            filterElement={bankBranchFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '12rem' }}
                        />
                    )}
                    {showLegacyReceiptColumns && (
                        <Column
                            header={renderStackedHeader('Total Amt', 'Discount', AMOUNT_CURRENCY_ICON, 'pi-percentage')}
                            body={(r: PaymentVoucherDisplayRow) => renderStackedValue(r.totalAmtDisplay, r.discountAmtDisplay)}
                            filterField="totalDiscountDisplay"
                            filterElement={totalDiscountFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '10rem', textAlign: 'right' }}
                        />
                    )}
                    <Column
                        field="totalNetAmount"
                        filterField={showLegacyReceiptColumns ? 'netAdjustedDisplay' : 'netAmtDisplay'}
                        filterElement={showLegacyReceiptColumns ? netAdjustedFilterElement : netAmtFilterElement}
                        header={
                            showLegacyReceiptColumns
                                ? renderStackedHeader('Net Amt', 'Adjusted Amt', AMOUNT_CURRENCY_ICON, AMOUNT_CURRENCY_ICON)
                                : <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Net Amt</LabelWithIcon>
                        }
                        body={(r: PaymentVoucherDisplayRow) =>
                            showLegacyReceiptColumns
                                ? renderStackedValue(r.netAmtDisplay, r.adjustedAmtDisplay)
                                : r.netAmtDisplay
                        }
                        {...MULTISELECT_COLUMN_PROPS}
                        headerClassName="payment-voucher-net-amt-header"
                        headerStyle={{ width: '8rem', textAlign: 'right' }}
                        style={{ width: '8rem', textAlign: 'right' }}
                    />
                    {showLegacyReceiptColumns && (
                        <Column
                            header={renderStackedHeader('Diff Amt', 'Cheque Return Charges', AMOUNT_CURRENCY_ICON, AMOUNT_CURRENCY_ICON)}
                            body={(r: PaymentVoucherDisplayRow) =>
                                renderStackedValue(r.diffAmtDisplay, r.chequeCancelChargesDisplay)
                            }
                            filterField="diffAmtDisplay"
                            filterElement={diffAmtFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '9rem', textAlign: 'right' }}
                        />
                    )}
                    {isReceiptBankRegister && (
                        <Column
                            header={<LabelWithIcon icon="pi-sync">Cheque Return Status</LabelWithIcon>}
                            body={(r: PaymentVoucherDisplayRow) => r.chequeReturnStatusDisplay}
                            filterField="chequeReturnStatusDisplay"
                            filterElement={chequeReturnStatusFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '9rem' }}
                        />
                    )}
                    <Column
                        field="narration"
                        header={<LabelWithIcon icon="pi-pencil">Narration</LabelWithIcon>}
                        body={(r: VoucherRow) => r.narration ?? ''}
                        filterElement={narrationFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '14rem' }}
                    />
                    {!isReceiptRegister && requiresManager && (
                        <Column
                            field="managerName"
                            header={<LabelWithIcon icon="pi-user">{props.managerLabel}</LabelWithIcon>}
                            filterElement={paidByFilterElement}
                            headerClassName={textHeaderClassName}
                            {...MULTISELECT_COLUMN_PROPS}
                            style={{ width: '12rem' }}
                        />
                    )}
                    <Column
                        field="debitLedgerGroupName"
                        header={
                            <LabelWithIcon icon="pi-sitemap">
                                Ledger Group ({allowLineDrCrSelection ? 'Dr/Cr' : lineEntryDrCrLabel})
                            </LabelWithIcon>
                        }
                        body={(r: PaymentVoucherDisplayRow) => {
                            const primaryGroup = r.primaryLedgerGroupDisplay?.trim() ?? '';
                            const resolvedGroups: string[] = [];
                            const seenGroups = new Set<string>();
                            if (primaryGroup) {
                                resolvedGroups.push(primaryGroup);
                                seenGroups.add(primaryGroup.toLowerCase());
                            }
                            r.debitLedgerGroupLinesDisplay.forEach((groupName) => {
                                const normalizedGroupName = groupName.trim();
                                if (!normalizedGroupName) return;
                                const normalizedKey = normalizedGroupName.toLowerCase();
                                if (seenGroups.has(normalizedKey)) return;
                                seenGroups.add(normalizedKey);
                                resolvedGroups.push(normalizedGroupName);
                            });
                            if (resolvedGroups.length <= 1) {
                                return resolvedGroups[0] ?? '';
                            }
                            return (
                                <div style={{ display: 'grid', gap: '0.1rem' }}>
                                    {resolvedGroups.map((groupName, index) => (
                                        <span key={`${groupName}-${index}`}>{groupName}</span>
                                    ))}
                                </div>
                            );
                        }}
                        filterElement={ledgerGroupFilterElement}
                        headerClassName={textHeaderClassName}
                        {...MULTISELECT_COLUMN_PROPS}
                        style={{ width: '12rem' }}
                    />
                    {showInvoiceDetailsColumn && (
                        <Column
                            header={renderStackedHeader('Inv. Details', 'No · Date · Amt', 'pi-receipt', 'pi-list')}
                            body={(r: PaymentVoucherDisplayRow) => {
                                if (!r.invoiceDetailsLinesDisplay || r.invoiceDetailsLinesDisplay.length === 0) return '';
                                const rows = r.invoiceDetailsLinesDisplay
                                    .map((line) => parseInvoiceDetailLine(line))
                                    .filter((line) => {
                                        if (line.raw.length === 0) return false;
                                        const hasInvoiceIdentity =
                                            line.invoiceNo.trim().length > 0 || line.invoiceDate.trim().length > 0;
                                        const parsedAmount = Number(line.invoiceAmount.replace(/,/g, '').trim());
                                        const hasNonZeroAmount =
                                            Number.isFinite(parsedAmount) && Math.abs(parsedAmount) > 0.00001;
                                        return hasInvoiceIdentity || hasNonZeroAmount;
                                    });
                                if (rows.length === 0) return '';
                                const isExpanded = expandedInvoiceVoucherIds.has(r.voucherId);
                                const visibleRows = isExpanded ? rows : rows.slice(0, MAX_VISIBLE_INVOICE_LINES);
                                const hiddenCount = Math.max(rows.length - MAX_VISIBLE_INVOICE_LINES, 0);
                                return (
                                    <div className="voucher-invoice-lines">
                                        {visibleRows.map((line, index) => (
                                            <div key={`${line.raw}-${index}`} className="voucher-invoice-lines__item">
                                                {line.invoiceNo || line.invoiceDate || line.invoiceAmount ? (
                                                    <>
                                                        <span className="voucher-invoice-lines__no">{line.invoiceNo}</span>
                                                        <span className="voucher-invoice-lines__date">{line.invoiceDate}</span>
                                                        <span className="voucher-invoice-lines__amount">{line.invoiceAmount}</span>
                                                    </>
                                                ) : (
                                                    <span className="voucher-invoice-lines__raw">{line.raw}</span>
                                                )}
                                            </div>
                                        ))}
                                        {!isExpanded && hiddenCount > 0 ? (
                                            <button
                                                type="button"
                                                className="voucher-invoice-lines__more"
                                                title={rows.slice(MAX_VISIBLE_INVOICE_LINES).map((line) => line.raw).join('\n')}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleInvoiceExpansion(r.voucherId);
                                                }}
                                            >
                                                +{hiddenCount} more
                                            </button>
                                        ) : null}
                                        {isExpanded && rows.length > MAX_VISIBLE_INVOICE_LINES ? (
                                            <button
                                                type="button"
                                                className="voucher-invoice-lines__more voucher-invoice-lines__more--collapse"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleInvoiceExpansion(r.voucherId);
                                                }}
                                            >
                                                Show less
                                            </button>
                                        ) : null}
                                    </div>
                                );
                            }}
                            style={{ minWidth: '12.5rem', width: '12.5rem' }}
                        />
                    )}
                    <Column
                        header={<LabelWithIcon icon="pi-lock">Status</LabelWithIcon>}
                        body={(r: VoucherRow) =>
                            Number(r.isReconciledFlag ?? 0) === 1 ? (
                                <span className="voucher-register-status-chip">Reconciled</span>
                            ) : (
                                ''
                            )
                        }
                        style={{ width: '8rem' }}
                    />
                    <Column
                        header={<LabelWithIcon icon="pi-cog">Actions</LabelWithIcon>}
                        body={(r: VoucherRow) => {
                            const isReconciledRow = Number(r.isReconciledFlag ?? 0) === 1;
                            const isEditDisabled = voucherActions.rowEdit.disabled || isReconciledRow;
                            const editTooltip = isReconciledRow ? 'Reconciled voucher cannot be edited.' : 'Edit';
                            const rowData = r as PaymentVoucherDisplayRow;
                            return (
                                <div className="flex align-items-center gap-1">
                                    <span className="voucher-row-action" title="View">
                                        <Button
                                            icon="pi pi-eye"
                                            className="p-button-text p-button-sm"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openViewDialog(rowData);
                                            }}
                                        />
                                    </span>
                                    {voucherActions.rowEdit.visible ? (
                                        <span className="voucher-row-action" title={editTooltip}>
                                            <Button
                                                icon="pi pi-pencil"
                                                className="p-button-text p-button-sm"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditForRow(r);
                                                }}
                                                disabled={isEditDisabled}
                                            />
                                        </span>
                                    ) : null}
                                </div>
                            );
                        }}
                        style={{ width: '6rem' }}
                    />
                </AppDataTable>
            </div>
            <Dialog
                visible={viewRow != null}
                onHide={closeViewDialog}
                modal
                style={{ width: 'min(1020px, 96vw)' }}
                className={`voucher-view-dialog ${viewDialogThemeClass}`}
                header={detailDialogHeader}
            >
                {viewVoucherLoading ? (
                    detailLoadingSkeleton
                ) : viewVoucherError ? (
                    <div className="text-red-500">Unable to load voucher details.</div>
                ) : (
                    <div className="voucher-view-dialog__content flex flex-column">
                        <div className="voucher-view-dialog__main-title">Main Details</div>
                        {isReceiptRegister ? (
                            <div className="voucher-view-dialog__meta">
                                <div className="voucher-view-dialog__facts voucher-view-dialog__facts--primary grid">
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">{registerPrimaryLedgerLabel}</small>
                                        <div className="voucher-view-dialog__value">{detailLedgerDrDisplay || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">{detailManagerLabel}</small>
                                        <div className="voucher-view-dialog__value">{detailManager || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Salesman</small>
                                        <div className="voucher-view-dialog__value">{detailSalesman || '-'}</div>
                                    </div>
                                </div>
                                <div className="voucher-view-dialog__facts voucher-view-dialog__facts--primary grid">
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Voucher No.</small>
                                        <div className="voucher-view-dialog__value">{detailVoucherNo || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Voucher Date</small>
                                        <div className="voucher-view-dialog__value">{detailVoucherDate || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">{detailReceiptNoLabel}</small>
                                        <div className="voucher-view-dialog__value">{detailRefNo || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">{detailReceiptDateLabel}</small>
                                        <div className="voucher-view-dialog__value">{detailRefDate || '-'}</div>
                                    </div>
                                </div>
                                <div className="voucher-view-dialog__facts voucher-view-dialog__facts--primary grid">
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Ledger Group (Cr)</small>
                                        <div className="voucher-view-dialog__value">{detailLedgerCrGroupDisplay || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Ledger (Cr)</small>
                                        <div className="voucher-view-dialog__value">{detailLedgerCrDisplay || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Address</small>
                                        <div className="voucher-view-dialog__value">{detailAddressDisplay || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact voucher-view-dialog__fact--amount text-right">
                                        <small className="voucher-view-dialog__label">Amount</small>
                                        <div className="voucher-view-dialog__value voucher-view-dialog__value--amount">
                                            {formatAmount(detailAmount)}
                                        </div>
                                    </div>
                                </div>
                                <div className="voucher-view-dialog__facts voucher-view-dialog__facts--primary grid">
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Discount</small>
                                        <div className="voucher-view-dialog__value">{formatAmount(detailDiscountAmount)}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Cheque Return Charges</small>
                                        <div className="voucher-view-dialog__value">{formatAmount(detailChequeReturnCharges)}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Remarks</small>
                                        <div className="voucher-view-dialog__value">{detailNarration || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="voucher-view-dialog__meta">
                                <div className="voucher-view-dialog__facts voucher-view-dialog__facts--primary grid">
                                    <div className="col-12 sm:col-6 md:col-2 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Voucher Date</small>
                                        <div className="voucher-view-dialog__value">{detailVoucherDate || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-2 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Posting Date</small>
                                        <div className="voucher-view-dialog__value">{detailPostingDate || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-2 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">{refNoHeaderLabel}</small>
                                        <div className="voucher-view-dialog__value">{detailRefNo || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-2 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">{refDateHeaderLabel}</small>
                                        <div className="voucher-view-dialog__value">{detailRefDate || '-'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-4 voucher-view-dialog__fact voucher-view-dialog__fact--amount text-right">
                                        <small className="voucher-view-dialog__label">Amount</small>
                                        <div className="voucher-view-dialog__value voucher-view-dialog__value--amount">
                                            {formatAmount(detailAmount)}
                                        </div>
                                    </div>
                                </div>
                                <div className="voucher-view-dialog__meta-secondary grid">
                                    <div
                                        className={`col-12 ${detailMetaSecondaryPrimaryColClass} voucher-view-dialog__fact`}
                                    >
                                        <small className="voucher-view-dialog__label">{registerPrimaryLedgerLabel}</small>
                                        <div className="voucher-view-dialog__value">{detailPrimaryLedger || '-'}</div>
                                    </div>
                                    {showDetailManager ? (
                                        <div className="col-12 md:col-4 voucher-view-dialog__fact">
                                            <small className="voucher-view-dialog__label">Manager</small>
                                            <div className="voucher-view-dialog__value">{detailManager}</div>
                                        </div>
                                    ) : null}
                                    {showDetailSalesman ? (
                                        <div className="col-12 md:col-4 voucher-view-dialog__fact">
                                            <small className="voucher-view-dialog__label">Salesman</small>
                                            <div className="voucher-view-dialog__value">{detailSalesman}</div>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="voucher-view-dialog__meta-reconciliation grid">
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Reconciled</small>
                                        <div className="voucher-view-dialog__value">{detailIsReconciled ? 'Yes' : 'No'}</div>
                                    </div>
                                    <div className="col-12 sm:col-6 md:col-3 voucher-view-dialog__fact">
                                        <small className="voucher-view-dialog__label">Reconciled Date</small>
                                        <div className="voucher-view-dialog__value">
                                            {detailIsReconciled ? detailReconciliationDate || '-' : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="voucher-view-dialog__narration">
                                    <small className="voucher-view-dialog__label">Narration</small>
                                    <div className="voucher-view-dialog__value">{detailNarration || '-'}</div>
                                </div>
                            </div>
                        )}

                        {detailBillRows.length > 0 ? (
                            <div className="voucher-view-dialog__section">
                                <div className="voucher-view-dialog__section-title">Bill Details</div>
                                <DataTable value={detailBillRows} size="small" stripedRows dataKey="voucherBillDetailId">
                                    <Column
                                        header={<LabelWithIcon icon="pi-list">Type</LabelWithIcon>}
                                        body={(row: Record<string, unknown>) =>
                                            Number(row?.isDebitNoteFlag ?? 0) === 1 ? 'Debit Note' : 'Invoice'
                                        }
                                        style={{ width: '8rem' }}
                                    />
                                    <Column
                                        header={<LabelWithIcon icon="pi-file-edit">Doc No.</LabelWithIcon>}
                                        body={(row: Record<string, unknown>) => String(row?.invoiceNumber ?? '-')}
                                    />
                                    <Column
                                        header={<LabelWithIcon icon="pi-calendar">Date</LabelWithIcon>}
                                        body={(row: Record<string, unknown>) => formatDate(String(row?.invoiceDate ?? '')) || '-'}
                                        headerClassName="voucher-col-center"
                                        className="voucher-cell-center"
                                        style={{ width: '9rem' }}
                                    />
                                    <Column
                                        header={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Adjusted Amt</LabelWithIcon>}
                                        body={(row: Record<string, unknown>) =>
                                            formatAmount(Number(row?.appliedAmount ?? 0))
                                        }
                                        headerClassName="voucher-col-right"
                                        className="voucher-cell-right"
                                        style={{ width: '11rem' }}
                                    />
                                </DataTable>
                            </div>
                        ) : null}

                        {detailPostingRows.length > 0 ? (
                            <div className="voucher-view-dialog__section">
                                <div className="voucher-view-dialog__section-title flex align-items-center justify-content-between gap-2 flex-wrap">
                                    <span>Auto Posting</span>
                                    <div className="voucher-view-dialog__totals flex gap-3 text-sm">
                                        <span className="voucher-view-dialog__total voucher-view-dialog__total--dr">
                                            <strong>Dr:</strong> {formatAmount(detailPostingTotals.dr)}
                                        </span>
                                        <span className="voucher-view-dialog__total voucher-view-dialog__total--cr">
                                            <strong>Cr:</strong> {formatAmount(detailPostingTotals.cr)}
                                        </span>
                                        <span className="voucher-view-dialog__total voucher-view-dialog__total--diff">
                                            <strong>Diff:</strong> {detailPostingDifferenceLabel}
                                        </span>
                                    </div>
                                </div>
                                <DataTable value={detailPostingRows} size="small" stripedRows dataKey="key">
                                    <Column
                                        header={<LabelWithIcon icon="pi-sitemap">Ledger Group</LabelWithIcon>}
                                        body={(line: VoucherDetailPostingLine) => line.ledgerGroupName || '-'}
                                        style={{ width: '12rem' }}
                                    />
                                    <Column
                                        header={<LabelWithIcon icon="pi-wallet">Ledger</LabelWithIcon>}
                                        body={(line: VoucherDetailPostingLine) => line.ledgerName || '-'}
                                    />
                                    <Column
                                        header={<LabelWithIcon icon="pi-sort-alt">Dr/Cr</LabelWithIcon>}
                                        body={(line: VoucherDetailPostingLine) => line.drCrLabel}
                                        headerClassName="voucher-col-center"
                                        className="voucher-cell-center"
                                        style={{ width: '7rem' }}
                                    />
                                    <Column
                                        header={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount</LabelWithIcon>}
                                        body={(line: VoucherDetailPostingLine) => formatAmount(line.amount)}
                                        headerClassName="voucher-col-right"
                                        className="voucher-cell-right"
                                        style={{ width: '11rem' }}
                                    />
                                </DataTable>
                            </div>
                        ) : null}
                    </div>
                )}
            </Dialog>
        </div>
    );
};

const areVoucherTablePropsEqual = (prev: VoucherViewProps, next: VoucherViewProps) =>
    prev.voucherProfileKey === next.voucherProfileKey &&
    prev.paymentMode === next.paymentMode &&
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
    prev.receiptRegisterTotals === next.receiptRegisterTotals &&
    prev.voucherTypeNoFilterElement === next.voucherTypeNoFilterElement &&
    prev.voucherPostingDateFilterElement === next.voucherPostingDateFilterElement &&
    prev.refFilterElement === next.refFilterElement &&
    prev.ledgerCrDrFilterElement === next.ledgerCrDrFilterElement &&
    prev.managerSalesmanFilterElement === next.managerSalesmanFilterElement &&
    prev.bankBranchFilterElement === next.bankBranchFilterElement &&
    prev.fullPaidFilterElement === next.fullPaidFilterElement &&
    prev.totalDiscountFilterElement === next.totalDiscountFilterElement &&
    prev.netAdjustedFilterElement === next.netAdjustedFilterElement &&
    prev.netAmtFilterElement === next.netAmtFilterElement &&
    prev.diffAmtFilterElement === next.diffAmtFilterElement &&
    prev.chequeReturnStatusFilterElement === next.chequeReturnStatusFilterElement &&
    prev.chequeCancelChargesFilterElement === next.chequeCancelChargesFilterElement &&
    prev.narrationFilterElement === next.narrationFilterElement &&
    prev.paidByFilterElement === next.paidByFilterElement &&
    prev.ledgerGroupFilterElement === next.ledgerGroupFilterElement &&
    prev.registerPrimaryLedgerLabel === next.registerPrimaryLedgerLabel &&
    prev.registerEntryLedgerLabel === next.registerEntryLedgerLabel &&
    prev.requiresManager === next.requiresManager &&
    prev.allowLineDrCrSelection === next.allowLineDrCrSelection &&
    prev.lineEntryDrCrLabel === next.lineEntryDrCrLabel &&
    prev.managerLabel === next.managerLabel &&
    prev.cashLedgerLabel === next.cashLedgerLabel &&
    prev.openEditForRow === next.openEditForRow &&
    prev.voucherActions === next.voucherActions &&
    prev.hasTouchedDatesRef === next.hasTouchedDatesRef &&
    prev.dateRange === next.dateRange &&
    prev.setDateRange === next.setDateRange &&
    prev.setDateErrors === next.setDateErrors &&
    prev.dateErrors === next.dateErrors &&
    prev.registerFilterFocusNonce === next.registerFilterFocusNonce &&
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

export const VoucherTable = React.memo(VoucherTableComponent, areVoucherTablePropsEqual);
VoucherTable.displayName = 'VoucherTable';
