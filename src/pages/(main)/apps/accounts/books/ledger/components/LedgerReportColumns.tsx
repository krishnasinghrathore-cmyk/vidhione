import React, { useMemo } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import AppMultiSelect from '@/components/AppMultiSelect';
import { isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import { formatAmount, formatBalance, formatDate } from '../utils';
import type { FilterOption, LedgerReportRow } from '../types';

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

export const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    date: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    counterLedger: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    narration: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    particulars: {
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
    balance: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

export type LedgerReportDisplayRow = LedgerReportRow & {
    running: number;
    balance: number;
    particulars?: string | null;
    isSkeleton?: boolean;
};

type LedgerReportColumnsArgs = {
    rows: LedgerReportDisplayRow[];
    reportLoading: boolean;
    totals: { debitTotal: number; creditTotal: number; closing: number };
    detailView: boolean;
    showNarration: boolean;
    isFormatTwo: boolean;
};

export const useLedgerReportColumns = ({
    rows,
    reportLoading,
    totals,
    detailView,
    showNarration,
    isFormatTwo
}: LedgerReportColumnsArgs) => {
    const dateFilterOptions = useMemo(() => buildDateFilterOptions(rows.map((row) => row.date)), [rows]);
    const voucherNoFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.voucherNo)), [rows]);
    const voucherTypeFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.voucherType)), [rows]);
    const counterLedgerFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.counterLedger)), [rows]);
    const narrationFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.narration)), [rows]);
    const particularsFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.particulars)), [rows]);
    const debitFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.debit)), [rows]);
    const creditFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.credit)), [rows]);
    const balanceFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.balance)), [rows]);

    const dateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(dateFilterOptions, 'Any'),
        [dateFilterOptions]
    );
    const voucherNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherNoFilterOptions, 'Any'),
        [voucherNoFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions, 'Any'),
        [voucherTypeFilterOptions]
    );
    const counterLedgerFilterElement = useMemo(
        () => buildMultiSelectFilterElement(counterLedgerFilterOptions, 'Any'),
        [counterLedgerFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions, 'Any'),
        [narrationFilterOptions]
    );
    const particularsFilterElement = useMemo(
        () => buildMultiSelectFilterElement(particularsFilterOptions, 'Any'),
        [particularsFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions, 'Any'),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions, 'Any'),
        [creditFilterOptions]
    );
    const balanceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(balanceFilterOptions, 'Any'),
        [balanceFilterOptions]
    );

    const dateBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4.5rem') : formatDate(row.date ?? null);
    const voucherNoBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('5rem') : row.voucherNo ?? '';
    const voucherTypeBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('5rem') : row.voucherType ?? '';
    const counterLedgerBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('10rem') : row.counterLedger ?? '';
    const narrationBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('10rem') : row.narration ?? '';
    const particularsCell = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? (
            skeletonCell('12rem')
        ) : (
            <span style={{ whiteSpace: 'pre-line' }}>{row.particulars ?? ''}</span>
        );
    const debitBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.debit ? formatAmount(row.debit) : '';
    const creditBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.credit ? formatAmount(row.credit) : '';
    const balanceBody = (row: LedgerReportDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('5rem') : formatBalance(Number(row.running ?? 0));

    const debitFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.debitTotal);
    const creditFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.creditTotal);
    const closingFooter = reportLoading ? skeletonCell('4rem') : formatBalance(totals.closing);

    const formatTwoColumns = [
        <Column
            key="date"
            field="date"
            header="Date"
            body={dateBody}
            style={{ width: '8rem' }}
            footer="Total"
            footerStyle={{ fontWeight: 600 }}
            filterElement={dateFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherNo"
            field="voucherNo"
            header="Voucher No"
            body={voucherNoBody}
            style={{ width: '7rem' }}
            filterElement={voucherNoFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="particulars"
            field="particulars"
            header="Particulars"
            body={particularsCell}
            filterElement={particularsFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherType"
            field="voucherType"
            header="Type"
            body={voucherTypeBody}
            style={{ width: '9rem' }}
            filterElement={voucherTypeFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="debit"
            field="debit"
            header="Dr Amt"
            body={debitBody}
            style={{ width: '8.5rem' }}
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
            style={{ width: '8.5rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={creditFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={creditFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="balance"
            field="balance"
            header="Balance"
            body={balanceBody}
            style={{ width: '10rem', fontWeight: 600 }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={closingFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={balanceFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />
    ];

    const formatOneColumns = [
        <Column
            key="date"
            field="date"
            header="Date"
            body={dateBody}
            style={{ width: '8rem' }}
            footer="Total"
            footerStyle={{ fontWeight: 600 }}
            filterElement={dateFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherNo"
            field="voucherNo"
            header="Voucher No"
            body={voucherNoBody}
            style={{ width: '7rem' }}
            filterElement={voucherNoFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherType"
            field="voucherType"
            header="Type"
            body={voucherTypeBody}
            style={{ width: '9rem' }}
            filterElement={voucherTypeFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        ...(detailView
            ? [
                  <Column
                      key="counterLedger"
                      field="counterLedger"
                      header="Ag. Ledger"
                      body={counterLedgerBody}
                      filterElement={counterLedgerFilterElement}
                      {...MULTISELECT_COLUMN_PROPS}
                  />
              ]
            : []),
        ...(showNarration
            ? [
                  <Column
                      key="narration"
                      field="narration"
                      header="Narration"
                      body={narrationBody}
                      filterElement={narrationFilterElement}
                      {...MULTISELECT_COLUMN_PROPS}
                  />
              ]
            : []),
        <Column
            key="debit"
            field="debit"
            header="Dr Amt"
            body={debitBody}
            style={{ width: '8.5rem' }}
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
            style={{ width: '8.5rem' }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={creditFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={creditFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="balance"
            field="balance"
            header="Balance"
            body={balanceBody}
            style={{ width: '10rem', fontWeight: 600 }}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={closingFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={balanceFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />
    ];

    return isFormatTwo ? formatTwoColumns : formatOneColumns;
};
