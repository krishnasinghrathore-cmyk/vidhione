import React, { useMemo } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import AppMultiSelect from '@/components/AppMultiSelect';
import { isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import { formatAmount } from '../utils';
import type { FilterOption, MonthDisplayRow } from '../types';

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

export const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    label: {
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
    closingAbs: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    drCr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

const buildMultiSelectFilterElement =
    <T extends string | number>(items: FilterOption<T>[], placeholder = 'All') =>
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

type LedgerMonthWiseSummaryColumnsArgs = {
    rows: MonthDisplayRow[];
    summaryLoadingApplied: boolean;
    totals: { debit: number; credit: number };
};

export const useLedgerMonthWiseSummaryColumns = ({
    rows,
    summaryLoadingApplied,
    totals
}: LedgerMonthWiseSummaryColumnsArgs) => {
    const monthFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.label)), [rows]);
    const debitFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.debit)), [rows]);
    const creditFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.credit)), [rows]);
    const closingFilterOptions = useMemo(() => buildNumberFilterOptions(rows.map((row) => row.closingAbs)), [rows]);
    const drCrFilterOptions = useMemo(() => buildTextFilterOptions(rows.map((row) => row.drCr)), [rows]);

    const monthFilterElement = useMemo(
        () => buildMultiSelectFilterElement(monthFilterOptions, 'All'),
        [monthFilterOptions]
    );
    const debitFilterElement = useMemo(
        () => buildMultiSelectFilterElement(debitFilterOptions, 'All'),
        [debitFilterOptions]
    );
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions, 'All'),
        [creditFilterOptions]
    );
    const closingFilterElement = useMemo(
        () => buildMultiSelectFilterElement(closingFilterOptions, 'All'),
        [closingFilterOptions]
    );
    const drCrFilterElement = useMemo(
        () => buildMultiSelectFilterElement(drCrFilterOptions, 'All'),
        [drCrFilterOptions]
    );

    const monthBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.label;
    const debitBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.debit ?? 0));
    const creditBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Number(row.credit ?? 0));
    const closingBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(Math.abs(row.closing));
    const drCrBody = (row: MonthDisplayRow & { isSkeleton?: boolean }) =>
        isSkeletonRow(row) ? skeletonCell('2.5rem') : row.drCr;

    const debitFooter = summaryLoadingApplied ? skeletonCell('3rem') : formatAmount(totals.debit);
    const creditFooter = summaryLoadingApplied ? skeletonCell('3rem') : formatAmount(totals.credit);

    return [
        <Column
            key="month"
            field="label"
            header="Month"
            body={monthBody}
            sortField="monthKey"
            style={{ width: '12rem' }}
            footer="Total"
            footerStyle={{ fontWeight: 600 }}
            headerClassName="summary-left summary-filter-inline"
            bodyClassName="summary-left"
            filterElement={monthFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="debit"
            field="debit"
            header="Debit"
            body={debitBody}
            style={{ width: '9rem' }}
            headerClassName="summary-number summary-filter-inline"
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
            header="Credit"
            body={creditBody}
            style={{ width: '9rem' }}
            headerClassName="summary-number summary-filter-inline"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={creditFooter}
            footerStyle={{ fontWeight: 600 }}
            filterElement={creditFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="closing"
            field="closingAbs"
            header="Closing"
            body={closingBody}
            style={{ width: '9rem' }}
            headerClassName="summary-number summary-filter-inline"
            bodyClassName="summary-number"
            filterElement={closingFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="drcr"
            field="drCr"
            header="Dr/Cr"
            body={drCrBody}
            style={{ width: '6rem' }}
            headerClassName="summary-left summary-filter-inline"
            bodyClassName="summary-left"
            filterElement={drCrFilterElement}
            {...MULTISELECT_COLUMN_PROPS}
        />
    ];
};
