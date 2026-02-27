import React, { useMemo } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import AppMultiSelect from '@/components/AppMultiSelect';
import { isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import { resolveVoucherThemeClass } from '@/lib/accounts/voucherThemeClass';
import { formatAmount, formatDate } from '../utils';
import type { FilterOption, InvoiceRolloverRow } from '../types';

const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

const buildTextFilterOptions = (values: Array<string | null | undefined>): FilterOption<string>[] => {
    const unique = new Map<string, true>();
    values.forEach((value) => {
        if (!value) return;
        const trimmed = value.trim();
        if (!trimmed) return;
        unique.set(trimmed, true);
    });
    return Array.from(unique.keys())
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map((value) => ({ label: value, value }));
};

const buildDateFilterOptions = (values: Array<string | null | undefined>): FilterOption<string>[] => {
    const unique = new Map<string, string>();
    values.forEach((value) => {
        if (!value) return;
        const label = formatDate(value);
        if (!label) return;
        unique.set(value, label);
    });
    return Array.from(unique.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, label]) => ({ label, value }));
};

const buildNumberFilterOptions = (values: Array<number | null | undefined>): FilterOption<number>[] => {
    const unique = new Set<number>();
    values.forEach((value) => {
        if (value == null || !Number.isFinite(value)) return;
        unique.add(value);
    });
    return Array.from(unique.values())
        .sort((a, b) => a - b)
        .map((value) => ({ label: formatAmount(value), value }));
};

const buildMultiSelectFilterElement =
    <T extends string | number>(items: FilterOption<T>[], placeholder = 'Any') =>
    (options: ColumnFilterElementTemplateOptions) => (
        <AppMultiSelect
            value={(options.value ?? []) as T[]}
            options={items}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => options.filterCallback(event.value)}
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder={placeholder}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={items.length ? 'No values found' : 'No values'}
            emptyFilterMessage="No results found"
            disabled={items.length === 0}
            style={{ minWidth: '20rem' }}
        />
    );

const normalizeReceiptTypeCode = (value: string | null | undefined): string => {
    if (!value) return '';
    return value.replace(/[()]/g, '').trim().toUpperCase();
};

const resolveReceiptTypeThemeClass = (code: string): string | null => {
    switch (code) {
        case 'B':
            return resolveVoucherThemeClass('receipt', 'bank');
        case 'C':
            return resolveVoucherThemeClass('receipt', 'cash');
        case 'CN':
            return resolveVoucherThemeClass('credit-note', 'cash');
        case 'SR':
            return resolveVoucherThemeClass('debit-note', 'cash');
        case 'DN':
            return resolveVoucherThemeClass('debit-note', 'cash');
        case 'J':
            return resolveVoucherThemeClass('journal', 'cash');
        default:
            return null;
    }
};

const resolveReceiptTypeDetail = (code: string): string => {
    switch (code) {
        case 'B':
            return 'Bank Receipt';
        case 'C':
            return 'Cash Receipt';
        case 'CN':
            return 'Credit Note';
        case 'SR':
            return 'Sales Return';
        case 'DN':
            return 'Debit Note';
        case 'J':
            return 'Journal';
        default:
            return code;
    }
};

export const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    ledgerName: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    invoiceDate: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    invoiceNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    agLedger: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    debit: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    credit: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    difference: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptDate: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptVoucherNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    receiptAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    totalPaid: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

type InvoiceRolloverColumnsArgs = {
    rows: InvoiceRolloverRow[];
    reportLoading: boolean;
    totals: { invoice: number; applied: number; diff: number };
};

export const useInvoiceRolloverColumns = ({ rows, reportLoading, totals }: InvoiceRolloverColumnsArgs) => {
    const ledgerFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.ledgerName)), [rows]);
    const invoiceDateFilterOptions = useMemo(() => buildDateFilterOptions(rows.map((row) => row.invoiceDate)), [rows]);
    const invoiceNumberFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.invoiceNumber)),
        [rows]
    );
    const voucherTypeFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.voucherType)), [rows]);
    const agLedgerFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.agLedger)), [rows]);
    const debitFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.debit)), [rows]);
    const creditFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.credit)), [rows]);
    const differenceFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.difference)), [rows]);
    const receiptDateFilterOptions = useMemo(() => buildDateFilterOptions(rows.map((row) => row.receiptDate)), [rows]);
    const receiptTypeFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.receiptType)), [rows]);
    const receiptVoucherFilterOptions = useMemo(
        () => buildTextFilterOptions(rows.map((row) => row.receiptVoucherNo)),
        [rows]
    );
    const receiptAmountFilterOptions = useMemo(
        () => buildNumberFilterOptions(rows.map((row) => row.receiptAmount)),
        [rows]
    );
    const totalPaidFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.totalPaid)), [rows]);

    const ledgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(ledgerFilterOptions, 'All'),
        [ledgerFilterOptions]
    );
    const invoiceDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(invoiceDateFilterOptions, 'All'),
        [invoiceDateFilterOptions]
    );
    const invoiceNumberFilterElement = useMemo(
        () => buildMultiSelectFilterElement(invoiceNumberFilterOptions, 'All'),
        [invoiceNumberFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions, 'All'),
        [voucherTypeFilterOptions]
    );
    const agLedgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(agLedgerFilterOptions, 'All'),
        [agLedgerFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions, 'All'),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions, 'All'),
        [creditFilterOptions]
    );
    const differenceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(differenceFilterOptions, 'All'),
        [differenceFilterOptions]
    );
    const receiptDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptDateFilterOptions, 'All'),
        [receiptDateFilterOptions]
    );
    const receiptTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptTypeFilterOptions, 'All'),
        [receiptTypeFilterOptions]
    );
    const receiptVoucherFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptVoucherFilterOptions, 'All'),
        [receiptVoucherFilterOptions]
    );
    const receiptAmountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(receiptAmountFilterOptions, 'All'),
        [receiptAmountFilterOptions]
    );
    const totalPaidFilterElement = useMemo(
        () => buildMultiSelectFilterElement(totalPaidFilterOptions, 'All'),
        [totalPaidFilterOptions]
    );

    const ledgerBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('10rem');
        if (row.isReceiptRow) return '';
        return row.ledgerName ?? '';
    };

    const invoiceDateBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4.5rem');
        if (row.isReceiptRow) return '';
        return formatDate(row.invoiceDate ?? null);
    };

    const invoiceNumberBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.invoiceNumber ?? '';
    };

    const voucherTypeBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('5rem');
        if (row.isReceiptRow) return '';
        return row.voucherType ?? '';
    };

    const agLedgerBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('7rem');
        if (row.isReceiptRow) return '';
        return row.agLedger ?? '';
    };

    const debitBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.debit ? formatAmount(row.debit) : '';
    };

    const creditBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.credit ? formatAmount(row.credit) : '';
    };

    const differenceBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        if (row.difference == null) return '';
        const diff = Number(row.difference);
        const className = diff > 0 ? 'text-red-600 font-semibold' : diff < 0 ? 'text-green-600 font-semibold' : '';
        return <span className={className}>{formatAmount(diff)}</span>;
    };

    const receiptDateBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4.5rem');
        return formatDate(row.receiptDate ?? null);
    };

    const receiptTypeBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('2.5rem');
        const code = normalizeReceiptTypeCode(row.receiptType);
        if (!code) return '';
        const themeClass = resolveReceiptTypeThemeClass(code);
        const detail = resolveReceiptTypeDetail(code);
        return (
            <span title={`${code}: ${detail}`}>
                <Tag
                    value={code}
                    className={`invoice-rollover-receipt-type-chip${themeClass ? ` ${themeClass}` : ''}`}
                />
            </span>
        );
    };

    const receiptVoucherBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        return row.receiptVoucherNo ?? '';
    };

    const receiptAmountBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        return row.receiptAmount != null ? formatAmount(row.receiptAmount) : '';
    };

    const totalPaidBody = (row: InvoiceRolloverRow) => {
        if (isSkeletonRow(row)) return skeletonCell('4rem');
        if (row.isReceiptRow) return '';
        return row.totalPaid != null ? formatAmount(row.totalPaid) : '';
    };

    const debitFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.invoice);
    const differenceFooter = reportLoading ? (
        skeletonCell('3rem')
    ) : (
        <span
            className={
                totals.diff > 0 ? 'text-red-600 font-semibold' : totals.diff < 0 ? 'text-green-600 font-semibold' : ''
            }
        >
            {formatAmount(totals.diff)}
        </span>
    );
    const totalPaidFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.applied);

    return [
        <Column
            key="ledgerName"
            field="ledgerName"
            header="Ledger"
            body={ledgerBody}
            style={{ width: '14rem' }}
            filterElement={ledgerFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="invoiceDate"
            field="invoiceDate"
            header="Inv. Date"
            body={invoiceDateBody}
            style={{ width: '7rem' }}
            filterElement={invoiceDateFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="invoiceNumber"
            field="invoiceNumber"
            header="Inv. No"
            body={invoiceNumberBody}
            style={{ width: '7rem' }}
            filterElement={invoiceNumberFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherType"
            field="voucherType"
            header="Voucher Type"
            body={voucherTypeBody}
            style={{ width: '8rem' }}
            filterElement={voucherTypeFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="agLedger"
            field="agLedger"
            header="Ag. Ledger"
            body={agLedgerBody}
            style={{ width: '9rem' }}
            filterElement={agLedgerFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="debit"
            field="debit"
            header="Dr Amt"
            body={debitBody}
            style={{ width: '8rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={debitFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={debitFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="credit"
            field="credit"
            header="Cr Amt"
            body={creditBody}
            style={{ width: '8rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            filterElement={creditFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="difference"
            field="difference"
            header="Due"
            body={differenceBody}
            style={{ width: '8rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={differenceFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={differenceFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="receiptDate"
            field="receiptDate"
            header="R. Date"
            body={receiptDateBody}
            style={{ width: '7rem' }}
            filterElement={receiptDateFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="receiptType"
            field="receiptType"
            header="R. Type"
            body={receiptTypeBody}
            style={{ width: '4.5rem' }}
            filterElement={receiptTypeFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="receiptVoucherNo"
            field="receiptVoucherNo"
            header="R. V. No"
            body={receiptVoucherBody}
            style={{ width: '7rem' }}
            filterElement={receiptVoucherFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="receiptAmount"
            field="receiptAmount"
            header="R. Amount"
            body={receiptAmountBody}
            style={{ width: '8rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            filterElement={receiptAmountFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="totalPaid"
            field="totalPaid"
            header="Total Paid"
            body={totalPaidBody}
            style={{ width: '8rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={totalPaidFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={totalPaidFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />
    ];
};
