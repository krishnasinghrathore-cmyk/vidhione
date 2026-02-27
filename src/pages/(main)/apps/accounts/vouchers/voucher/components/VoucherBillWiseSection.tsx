"use client";
import React from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import type { InputNumberValueChangeEvent } from "primereact/inputnumber";
import { Skeleton } from "primereact/skeleton";
import AppDropdown from "@/components/AppDropdown";
import AppInput from "@/components/AppInput";
import type { VoucherViewProps } from "../useVoucherState";
import { formatAmount, formatDate } from "../utils";

type VoucherBillWiseSectionProps = {
  viewProps: VoucherViewProps;
  renderFormError: (key: string) => React.ReactNode;
};

export function VoucherBillWiseSection({
  viewProps,
  renderFormError,
}: VoucherBillWiseSectionProps) {
  const {
    showBillWiseOption,
    isBillWiseMode,
    isFormActive,
    billWisePartyLedgerId,
    billWisePartyLedgerOption,
    billWiseInvoiceRows,
    billWiseSelectedRows,
    billWiseInvoicesLoading,
    refreshBillWiseInvoices,
    billWiseShowAdvanceBill,
    updateBillWiseShowAdvanceBill,
    billWiseFiscalYearId,
    billWiseFiscalYearOptions,
    updateBillWiseFiscalYear,
    billWiseInvoiceSearchDialogVisible,
    billWiseInvoiceSearchTerm,
    updateBillWiseInvoiceSearchTerm,
    billWiseInvoiceSearchRows,
    billWiseInvoiceSearchLoading,
    runBillWiseInvoiceSearch,
    selectBillWiseInvoiceSearchRow,
    closeBillWiseInvoiceSearchDialog,
    billWiseSelectionDialogVisible,
    closeBillWiseSelectionDialog,
    openBillWiseSelectionDialog,
    setBillWiseInvoiceSelected,
    setBillWiseInvoiceAppliedAmount,
    billWiseAppliedTotal,
    billWiseNetReceiptAmount,
    cashLedgerAmount,
  } = viewProps;

  if (!showBillWiseOption) return null;

  const focusBillWiseSearchInput = React.useCallback(() => {
    window.setTimeout(() => {
      const input = document.getElementById("voucher-billwise-bill-no-search");
      if (!(input instanceof HTMLInputElement)) return;
      input.focus();
      input.select();
    }, 0);
  }, []);

  React.useEffect(() => {
    if (!billWiseInvoiceSearchDialogVisible) return;
    focusBillWiseSearchInput();
  }, [billWiseInvoiceSearchDialogVisible, focusBillWiseSearchInput]);

  const billWiseSearchGridRef = React.useRef<HTMLDivElement | null>(null);
  const resolveBillWiseSearchGridRows = React.useCallback(() => {
    const host = billWiseSearchGridRef.current;
    if (!host) return [] as HTMLTableRowElement[];
    return Array.from(
      host.querySelectorAll<HTMLTableRowElement>(".p-datatable-tbody > tr")
    ).filter((row) => !row.classList.contains("p-datatable-emptymessage"));
  }, []);

  const focusBillWiseSearchResultRow = React.useCallback(
    (rowIndex = 0) => {
      window.setTimeout(() => {
        const rows = resolveBillWiseSearchGridRows();
        if (rows.length <= 0) return;
        const boundedIndex = Math.min(
          Math.max(rowIndex, 0),
          Math.max(rows.length - 1, 0)
        );
        const row = rows[boundedIndex] ?? null;
        if (!row) return;
        row.setAttribute("tabindex", "-1");
        row.focus();
      }, 0);
    },
    [resolveBillWiseSearchGridRows]
  );

  React.useEffect(() => {
    if (!billWiseInvoiceSearchDialogVisible) return;
    if (billWiseInvoiceSearchLoading) return;
    if (billWiseInvoiceSearchRows.length <= 0) return;
    focusBillWiseSearchResultRow(0);
  }, [
    billWiseInvoiceSearchDialogVisible,
    billWiseInvoiceSearchLoading,
    billWiseInvoiceSearchRows,
    focusBillWiseSearchResultRow,
  ]);

  const handleBillWiseSearchGridKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const rows = resolveBillWiseSearchGridRows();
      if (rows.length <= 0) return;
      const focusedRow = target?.closest("tr");
      const focusedIndex = focusedRow
        ? rows.indexOf(focusedRow as HTMLTableRowElement)
        : -1;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex = focusedIndex >= 0 ? focusedIndex + 1 : 0;
        focusBillWiseSearchResultRow(nextIndex);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex = focusedIndex >= 0 ? focusedIndex - 1 : rows.length - 1;
        focusBillWiseSearchResultRow(nextIndex);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        event.stopPropagation();
        focusBillWiseSearchResultRow(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        event.stopPropagation();
        focusBillWiseSearchResultRow(rows.length - 1);
        return;
      }
      if (event.key !== "Enter") return;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "button"
      ) {
        return;
      }
      if (target?.getAttribute("role") === "button") return;
      const selectedRow =
        focusedIndex >= 0
          ? billWiseInvoiceSearchRows[focusedIndex] ?? null
          : billWiseInvoiceSearchRows[0] ?? null;
      if (!selectedRow) return;
      event.preventDefault();
      event.stopPropagation();
      selectBillWiseInvoiceSearchRow(Number(selectedRow.saleInvoiceId), {
        openSelectionDialog: false,
        focusNetAmount: true,
      });
    },
    [
      billWiseInvoiceSearchRows,
      focusBillWiseSearchResultRow,
      resolveBillWiseSearchGridRows,
      selectBillWiseInvoiceSearchRow,
    ]
  );

  const resolveBillWiseSearchInputValue = React.useCallback(() => {
    const input = document.getElementById("voucher-billwise-bill-no-search");
    if (input instanceof HTMLInputElement) {
      return input.value ?? "";
    }
    return billWiseInvoiceSearchTerm;
  }, [billWiseInvoiceSearchTerm]);

  const billWiseTargetAmountRaw = Number(cashLedgerAmount ?? 0);
  const billWiseTargetAmount =
    Number.isFinite(billWiseTargetAmountRaw) && billWiseTargetAmountRaw > 0
      ? billWiseTargetAmountRaw
      : 0;
  const billWiseRemainingAmount =
    billWiseTargetAmount > 0
      ? Math.max(billWiseTargetAmount - Number(billWiseAppliedTotal ?? 0), 0)
      : 0;
  const selectedPartyName = billWisePartyLedgerOption?.label?.trim() || "";
  const selectedPartyAddress =
    billWisePartyLedgerOption?.address?.trim() || "Address not available";

  type BillWiseRow = (typeof billWiseInvoiceRows)[number];
  type BillWiseSearchRow = (typeof billWiseInvoiceSearchRows)[number];

  const pendingAmountBody = (row: BillWiseRow) => {
    const pendingAmount = Math.abs(Number(row.dueAmount ?? 0));
    return <span>{formatAmount(pendingAmount)}</span>;
  };
  const searchPendingAmountBody = (row: BillWiseSearchRow) => (
    <span>{formatAmount(Math.abs(Number(row.dueAmount ?? 0)))}</span>
  );
  const billWiseSearchSkeletonRows = React.useMemo(
    () => Array.from({ length: 5 }, (_, index) => ({ skeletonId: index })),
    []
  );
  const billWiseInvoiceSelectionSkeletonRows = React.useMemo(
    () => Array.from({ length: 8 }, (_, index) => ({ skeletonId: index })),
    []
  );
  const invoiceSelectionFooter = (
    <div className="flex justify-content-end w-full">
      <Button
        type="button"
        label="Close"
        className="p-button-text p-button-sm"
        onClick={closeBillWiseSelectionDialog}
      />
    </div>
  );

  const appliedAmountEditorBody = (row: BillWiseRow) => (
    <AppInput
      inputType="number"
      value={row.appliedAmount}
      onValueChange={(event: InputNumberValueChangeEvent) => {
        setBillWiseInvoiceAppliedAmount(
          Number(row.saleInvoiceId),
          (event.value as number | null) ?? null
        );
      }}
      mode="decimal"
      min={0}
      minFractionDigits={2}
      maxFractionDigits={2}
      inputStyle={{ width: "100%", textAlign: "right" }}
      className="app-entry-control app-entry-billwise-adjust-input"
      disabled={!isFormActive || !row.selected}
    />
  );

  return (
    <div className="app-entry-section app-entry-section--details">
      {isBillWiseMode ? (
        <>
          <div className="flex justify-content-end flex-wrap gap-2 mb-3">
            <Button
              id="voucher-billwise-select-invoices"
              type="button"
              icon="pi pi-list"
              label="Select Invoices (Ctrl+F7)"
              className="p-button-sm"
              onClick={openBillWiseSelectionDialog}
              disabled={!isFormActive || !billWisePartyLedgerId}
            />
          </div>

          <DataTable
            value={billWiseSelectedRows}
            dataKey="saleInvoiceId"
            size="small"
            stripedRows
            className="app-entry-billwise-invoice-table"
            loading={billWiseInvoicesLoading}
            emptyMessage={
              billWisePartyLedgerId
                ? "No invoices selected yet. Use Select Invoices to allocate settlement amounts."
                : "Select party ledger to load bills."
            }
          >
            <Column
              header="Type"
              body={(row: BillWiseRow) => (
                <span>{row.isDebitNote ? "Debit Note" : "Invoice"}</span>
              )}
              style={{ width: "7rem" }}
            />
            <Column
              header="Doc No."
              body={(row: BillWiseRow) => (
                <span>{row.invoiceNumber || row.saleInvoiceId}</span>
              )}
              style={{ width: "6.5rem" }}
            />
            <Column
              header="Date"
              body={(row: BillWiseRow) => (
                <span>{formatDate(row.invoiceDate ?? null)}</span>
              )}
              style={{ width: "7.5rem" }}
            />
            <Column
              header="Pending Amt"
              body={pendingAmountBody}
              headerClassName="app-entry-billwise-col-right"
              bodyClassName="app-entry-billwise-col-right"
              style={{ width: "8rem" }}
            />
            <Column
              header="Adjusted Amt"
              body={(row: BillWiseRow) => (
                <span>{formatAmount(Number(row.appliedAmount ?? 0))}</span>
              )}
              headerClassName="app-entry-billwise-col-right"
              bodyClassName="app-entry-billwise-col-right"
              style={{ width: "8rem" }}
            />
          </DataTable>
          {renderFormError("billWiseInvoiceRows")}

          <div className="flex justify-content-end flex-wrap gap-4 mt-3 text-sm">
            <span>
              <strong>Total Amt:</strong> {formatAmount(billWiseAppliedTotal)}
            </span>
            <span>
              <strong>Net Receipt:</strong>{" "}
              {formatAmount(billWiseNetReceiptAmount)}
            </span>
          </div>

          <Dialog
            visible={billWiseInvoiceSearchDialogVisible}
            onHide={closeBillWiseInvoiceSearchDialog}
            onShow={focusBillWiseSearchInput}
            header="Search Party By Bill No."
            style={{ width: "min(820px, 94vw)" }}
            modal
          >
            <div className="grid">
              <div className="col-12">
                <div className="flex align-items-center flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <AppInput
                      id="voucher-billwise-bill-no-search"
                      value={billWiseInvoiceSearchTerm}
                      onChange={(event) =>
                        updateBillWiseInvoiceSearchTerm(
                          event.target.value ?? ""
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void runBillWiseInvoiceSearch(
                          event.currentTarget.value
                        );
                      }}
                      placeholder="Enter bill no..."
                      className="app-entry-control"
                      style={{ width: "100%" }}
                      disabled={!isFormActive}
                    />
                  </div>
                  <AppDropdown
                    inputId="voucher-billwise-search-year"
                    value={billWiseFiscalYearId}
                    options={billWiseFiscalYearOptions}
                    onChange={(event) => {
                      const nextFiscalYearId =
                        (event.value as number | null) ?? null;
                      updateBillWiseFiscalYear(nextFiscalYearId);
                      void runBillWiseInvoiceSearch(
                        resolveBillWiseSearchInputValue(),
                        {
                          fiscalYearIdOverride: nextFiscalYearId,
                        }
                      );
                    }}
                    placeholder="Year"
                    className="app-entry-control"
                    style={{ width: "11rem" }}
                    disabled={
                      !isFormActive || billWiseFiscalYearOptions.length === 0
                    }
                  />
                  <Button
                    type="button"
                    icon="pi pi-search"
                    label="Search Bill"
                    className="p-button-sm"
                    onClick={() => {
                      void runBillWiseInvoiceSearch(
                        resolveBillWiseSearchInputValue()
                      );
                    }}
                    disabled={!isFormActive || billWiseInvoiceSearchLoading}
                  />
                </div>
                <small className="text-600">
                  Search bills up to voucher date in selected year. Shortcuts:
                  F7 (party search), Ctrl+F7 (invoice selection).
                </small>
              </div>
              <div
                ref={billWiseSearchGridRef}
                tabIndex={0}
                className="col-12"
                onKeyDown={handleBillWiseSearchGridKeyDown}
                onKeyDownCapture={handleBillWiseSearchGridKeyDown}
              >
                {billWiseInvoiceSearchLoading ? (
                  <DataTable
                    value={billWiseSearchSkeletonRows}
                    dataKey="skeletonId"
                    size="small"
                    stripedRows
                    emptyMessage=""
                    scrollable
                    scrollHeight="30vh"
                  >
                    <Column
                      header="Type"
                      body={() => <Skeleton width="5rem" height="1rem" />}
                      style={{ width: "7rem" }}
                    />
                    <Column
                      header="Doc No."
                      body={() => <Skeleton width="4.5rem" height="1rem" />}
                      style={{ width: "7.5rem" }}
                    />
                    <Column
                      header="Date"
                      body={() => <Skeleton width="5.5rem" height="1rem" />}
                      style={{ width: "7.5rem" }}
                    />
                    <Column
                      header="Party"
                      body={() => <Skeleton width="12rem" height="1rem" />}
                    />
                    <Column
                      header="Bill Amt"
                      body={() => <Skeleton width="5rem" height="1rem" />}
                      headerClassName="app-entry-billwise-col-right"
                      bodyClassName="app-entry-billwise-col-right"
                      style={{ width: "8rem" }}
                    />
                    <Column
                      header=""
                      body={() => <Skeleton width="4.5rem" height="1rem" />}
                      style={{ width: "7rem" }}
                    />
                  </DataTable>
                ) : (
                  <DataTable
                    value={billWiseInvoiceSearchRows}
                    dataKey="saleInvoiceId"
                    size="small"
                    stripedRows
                    emptyMessage={
                      billWiseInvoiceSearchTerm.trim().length < 2
                        ? "Enter at least 2 characters to search bill no."
                        : "No bills found."
                    }
                    scrollable
                    scrollHeight="30vh"
                  >
                    <Column
                      header="Type"
                      body={(row: BillWiseSearchRow) => (
                        <span>{row.isDebitNote ? "Debit Note" : "Invoice"}</span>
                      )}
                      style={{ width: "7rem" }}
                    />
                    <Column
                      header="Doc No."
                      body={(row: BillWiseSearchRow) => (
                        <span>{row.invoiceNumber || row.saleInvoiceId}</span>
                      )}
                      style={{ width: "7.5rem" }}
                    />
                    <Column
                      header="Date"
                      body={(row: BillWiseSearchRow) => (
                        <span>{formatDate(row.invoiceDate ?? null)}</span>
                      )}
                      style={{ width: "7.5rem" }}
                    />
                    <Column
                      header="Party"
                      body={(row: BillWiseSearchRow) => (
                        <div className="flex flex-column gap-1">
                          <span>
                            {row.ledgerName ||
                              (row.ledgerId != null
                                ? `Ledger ${row.ledgerId}`
                                : "Unknown")}
                          </span>
                          {row.ledgerAddress ? (
                            <small className="text-600">{row.ledgerAddress}</small>
                          ) : null}
                        </div>
                      )}
                    />
                    <Column
                      header="Bill Amt"
                      body={searchPendingAmountBody}
                      headerClassName="app-entry-billwise-col-right"
                      bodyClassName="app-entry-billwise-col-right"
                      style={{ width: "8rem" }}
                    />
                    <Column
                      header=""
                      body={(row: BillWiseSearchRow) => (
                        <Button
                          type="button"
                          label="Use Party"
                          className="p-button-text p-button-sm"
                          onClick={() => {
                            selectBillWiseInvoiceSearchRow(
                              Number(row.saleInvoiceId),
                              {
                                openSelectionDialog: false,
                                focusNetAmount: true,
                              }
                            );
                          }}
                          disabled={!isFormActive}
                        />
                      )}
                      style={{ width: "7rem" }}
                    />
                  </DataTable>
                )}
              </div>
            </div>
          </Dialog>

          <Dialog
            visible={billWiseSelectionDialogVisible}
            onHide={closeBillWiseSelectionDialog}
            header="Invoice Selection"
            style={{ width: "min(760px, 92vw)" }}
            footer={invoiceSelectionFooter}
            modal
          >
            <div className="grid">
              <div className="col-12">
                <div className="flex justify-content-start flex-wrap align-items-center gap-3">
                  <label className="flex align-items-center gap-2 cursor-pointer">
                    <Checkbox
                      inputId="voucher-billwise-line-show-advance"
                      checked={billWiseShowAdvanceBill}
                      onChange={(event) => {
                        const nextEnabled = Boolean(event.checked);
                        updateBillWiseShowAdvanceBill(nextEnabled);
                      }}
                      disabled={!isFormActive}
                    />
                    <span className="text-sm">Show Advance Bill</span>
                  </label>
                  <small className="text-600">
                    Pending bills up to voucher date.
                  </small>
                </div>
              </div>
              <div className="col-12">
                <div className="app-entry-billwise-dialog-summary">
                  <span>
                    <strong>Net Amount:</strong>{" "}
                    {formatAmount(billWiseTargetAmount)}
                  </span>
                  <span>
                    <strong>Selected:</strong>{" "}
                    {formatAmount(billWiseAppliedTotal)}
                  </span>
                  <span>
                    <strong>Pending:</strong>{" "}
                    {formatAmount(billWiseRemainingAmount)}
                  </span>
                </div>
              </div>
              {selectedPartyName ? (
                <div className="col-12">
                  <div className="flex flex-column gap-1 text-sm">
                    <span>
                      <strong>Party:</strong> {selectedPartyName}
                    </span>
                    <span className="text-600">
                      <strong>Address:</strong> {selectedPartyAddress}
                    </span>
                  </div>
                </div>
              ) : null}
              <div className="col-12">
                {billWiseInvoicesLoading ? (
                  <DataTable
                    value={billWiseInvoiceSelectionSkeletonRows}
                    dataKey="skeletonId"
                    size="small"
                    stripedRows
                    className="app-entry-billwise-invoice-table app-entry-billwise-invoice-table--popup"
                    emptyMessage=""
                    scrollable
                    scrollHeight="32vh"
                  >
                    <Column
                      header=""
                      body={() => <Skeleton width="1.4rem" height="1.4rem" />}
                      style={{ width: "2.6rem", textAlign: "center" }}
                    />
                    <Column
                      header="Type"
                      body={() => <Skeleton width="4.5rem" height="1rem" />}
                      style={{ width: "6.5rem" }}
                    />
                    <Column
                      header="Doc No."
                      body={() => <Skeleton width="4.5rem" height="1rem" />}
                      style={{ width: "6rem" }}
                    />
                    <Column
                      header="Date"
                      body={() => <Skeleton width="5rem" height="1rem" />}
                      style={{ width: "7rem" }}
                    />
                    <Column
                      header="Pending Amt"
                      body={() => <Skeleton width="6rem" height="1rem" />}
                      headerClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                      bodyClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                    />
                    <Column
                      header="Adjust Amt"
                      body={() => <Skeleton width="6rem" height="1rem" />}
                      headerClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                      bodyClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                    />
                  </DataTable>
                ) : (
                  <DataTable
                    value={billWiseInvoiceRows}
                    dataKey="saleInvoiceId"
                    size="small"
                    stripedRows
                    className="app-entry-billwise-invoice-table app-entry-billwise-invoice-table--popup"
                    emptyMessage={
                      billWisePartyLedgerId
                        ? "No invoices found for this ledger/date."
                        : "Select party ledger first."
                    }
                    scrollable
                    scrollHeight="32vh"
                  >
                    <Column
                      header=""
                      body={(row: BillWiseRow) => (
                        <Checkbox
                          inputId={`billwise-row-${row.saleInvoiceId}`}
                          checked={Boolean(row.selected)}
                          onChange={(event) => {
                            setBillWiseInvoiceSelected(
                              Number(row.saleInvoiceId),
                              Boolean(event.checked)
                            );
                          }}
                          disabled={!isFormActive}
                        />
                      )}
                      style={{ width: "2.6rem", textAlign: "center" }}
                    />
                    <Column
                      header="Type"
                      body={(row: BillWiseRow) => (
                        <span>{row.isDebitNote ? "Debit Note" : "Invoice"}</span>
                      )}
                      style={{ width: "6.5rem" }}
                    />
                    <Column
                      header="Doc No."
                      body={(row: BillWiseRow) => (
                        <span>{row.invoiceNumber || row.saleInvoiceId}</span>
                      )}
                      style={{ width: "6rem" }}
                    />
                    <Column
                      header="Date"
                      body={(row: BillWiseRow) => (
                        <span>{formatDate(row.invoiceDate ?? null)}</span>
                      )}
                      style={{ width: "7rem" }}
                    />
                    <Column
                      header="Pending Amt"
                      body={pendingAmountBody}
                      headerClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                      bodyClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                    />
                    <Column
                      header="Adjust Amt"
                      body={appliedAmountEditorBody}
                      headerClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                      bodyClassName="app-entry-billwise-col-right app-entry-billwise-col-fixed"
                    />
                  </DataTable>
                )}
                {renderFormError("billWiseInvoiceRows")}
              </div>
            </div>
          </Dialog>
        </>
      ) : (
        <small className="text-600">
          Enable bill-wise details to select party bills.
        </small>
      )}
    </div>
  );
}
