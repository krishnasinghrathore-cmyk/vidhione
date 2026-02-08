import React, { useMemo } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import AppMultiSelect from '@/components/AppMultiSelect';
import { isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import {
    buildDateFilterOptions,
    buildNumberFilterOptions,
    buildTextFilterOptions,
    formatAmount,
    formatDate
} from '../utils';
import type { DayBookDisplayRow, DayBookFilterOptions, LedgerFilterOption } from '../types';

const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

const buildMultiSelectFilterElement =
    <T extends string | number>(items: Array<{ label: string; value: T }>, placeholder = 'Any') =>
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
    voucherNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    date: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    ledger: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    narration: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    voucherType: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    refNo: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    refDate: {
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
    },
    drCr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

type DayBookColumnsArgs = {
    rows: DayBookDisplayRow[];
    filterOptions: DayBookFilterOptions | null;
    ledgerAddressMap: Map<string, string>;
    reportLoading: boolean;
    totals: { debitTotal: number; creditTotal: number };
};

export const useDayBookColumns = ({
    rows,
    filterOptions,
    ledgerAddressMap,
    reportLoading,
    totals
}: DayBookColumnsArgs) => {
    const voucherNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.voucherNo ?? rows.map((row) => row.voucherNo)),
        [filterOptions, rows]
    );
    const dateFilterOptions = useMemo(
        () => buildDateFilterOptions(filterOptions?.date ?? rows.map((row) => row.date)),
        [filterOptions, rows]
    );
    const ledgerFilterOptions = useMemo<LedgerFilterOption[]>(() => {
        const base = buildTextFilterOptions(filterOptions?.ledger ?? rows.map((row) => row.ledger));
        return base.map((option) => ({
            ...option,
            address: ledgerAddressMap.get(option.value.trim().toLowerCase()) ?? null
        }));
    }, [filterOptions, rows, ledgerAddressMap]);
    const narrationFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.narration ?? rows.map((row) => row.narration)),
        [filterOptions, rows]
    );
    const voucherTypeFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.voucherType ?? rows.map((row) => row.voucherType)),
        [filterOptions, rows]
    );
    const refNoFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.refNo ?? rows.map((row) => row.refNo)),
        [filterOptions, rows]
    );
    const refDateFilterOptions = useMemo(
        () => buildDateFilterOptions(filterOptions?.refDate ?? rows.map((row) => row.refDate)),
        [filterOptions, rows]
    );
    const debitFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterOptions?.debit ?? rows.map((row) => row.debit)),
        [filterOptions, rows]
    );
    const creditFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterOptions?.credit ?? rows.map((row) => row.credit)),
        [filterOptions, rows]
    );
    const balanceFilterOptions = useMemo(
        () => buildNumberFilterOptions(filterOptions?.balance ?? rows.map((row) => row.balance)),
        [filterOptions, rows]
    );
    const drCrFilterOptions = useMemo(
        () => buildTextFilterOptions(filterOptions?.drCr ?? rows.map((row) => row.drCr)),
        [filterOptions, rows]
    );

    const voucherNoFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherNoFilterOptions),
        [voucherNoFilterOptions]
    );
    const dateFilterElement = useMemo(() => buildMultiSelectFilterElement(dateFilterOptions), [dateFilterOptions]);
    const ledgerFilterElement = useMemo(
        () => (options: ColumnFilterElementTemplateOptions) => (
            <AppMultiSelect
                value={(options.value ?? []) as string[]}
                options={ledgerFilterOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(event) => options.filterCallback(event.value)}
                filter
                filterInputAutoFocus
                showSelectAll
                placeholder="Any"
                className="p-column-filter"
                display="comma"
                maxSelectedLabels={1}
                emptyMessage={ledgerFilterOptions.length ? 'No values found' : 'No values'}
                emptyFilterMessage="No results found"
                disabled={ledgerFilterOptions.length === 0}
                style={{ minWidth: '20rem' }}
                itemTemplate={(option: LedgerFilterOption) => {
                    const address = option.address?.trim();
                    return (
                        <div className="flex flex-column">
                            <span className="font-medium">{option.label}</span>
                            {address && <small className="text-600">{address}</small>}
                        </div>
                    );
                }}
            />
        ),
        [ledgerFilterOptions]
    );
    const narrationFilterElement = useMemo(
        () => buildMultiSelectFilterElement(narrationFilterOptions),
        [narrationFilterOptions]
    );
    const voucherTypeFilterElement = useMemo(
        () => buildMultiSelectFilterElement(voucherTypeFilterOptions),
        [voucherTypeFilterOptions]
    );
    const refNoFilterElement = useMemo(() => buildMultiSelectFilterElement(refNoFilterOptions), [refNoFilterOptions]);
    const refDateFilterElement = useMemo(
        () => buildMultiSelectFilterElement(refDateFilterOptions),
        [refDateFilterOptions]
    );
    const debitFilterElement = useMemo(() => buildMultiSelectFilterElement(debitFilterOptions), [debitFilterOptions]);
    const creditFilterElement = useMemo(
        () => buildMultiSelectFilterElement(creditFilterOptions),
        [creditFilterOptions]
    );
    const balanceFilterElement = useMemo(
        () => buildMultiSelectFilterElement(balanceFilterOptions),
        [balanceFilterOptions]
    );
    const drCrFilterElement = useMemo(() => buildMultiSelectFilterElement(drCrFilterOptions), [drCrFilterOptions]);

    const voucherNoBody = (row: DayBookDisplayRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : row.voucherNo ?? '');
    const dateBody = (row: DayBookDisplayRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatDate(row.date));
    const ledgerBody = (row: DayBookDisplayRow) => {
        if (isSkeletonRow(row)) return skeletonCell('7rem');
        const ledgerName = row.ledger ?? '';
        const address = ledgerName ? ledgerAddressMap.get(ledgerName.trim().toLowerCase()) ?? null : null;
        if (!ledgerName) return '';
        if (!address) return ledgerName;
        return (
            <div className="flex flex-column">
                <span>{ledgerName}</span>
                <small className="text-600">{address}</small>
            </div>
        );
    };
    const narrationBody = (row: DayBookDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('10rem') : row.narration ?? '';
    const voucherTypeBody = (row: DayBookDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.voucherType ?? '';
    const refNoBody = (row: DayBookDisplayRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : row.refNo ?? '');
    const refDateBody = (row: DayBookDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatDate(row.refDate);
    const debitBody = (row: DayBookDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.debit ? formatAmount(row.debit) : '';
    const creditBody = (row: DayBookDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.credit ? formatAmount(row.credit) : '';
    const balanceBody = (row: DayBookDisplayRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.balance ? formatAmount(row.balance) : '';
    const drCrBody = (row: DayBookDisplayRow) => (isSkeletonRow(row) ? skeletonCell('2.5rem') : row.drCr ?? '');

    const debitFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.debitTotal);
    const creditFooter = reportLoading ? skeletonCell('3rem') : formatAmount(totals.creditTotal);

    return [
        <Column
            key="voucherNo"
            field="voucherNo"
            header="V. No."
            body={voucherNoBody}
            style={{ width: '7rem' }}
            filterElement={voucherNoFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="date"
            field="date"
            header="Date"
            body={dateBody}
            style={{ width: '7rem' }}
            dataType="date"
            filterElement={dateFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="ledger"
            field="ledger"
            header="Ledger"
            body={ledgerBody}
            style={{ width: '14rem' }}
            filterElement={ledgerFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="narration"
            field="narration"
            header="Narration"
            body={narrationBody}
            filterElement={narrationFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="voucherType"
            field="voucherType"
            header="Voucher Type"
            body={voucherTypeBody}
            style={{ width: '9rem' }}
            filterElement={voucherTypeFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="refNo"
            field="refNo"
            header="Ref. No."
            body={refNoBody}
            style={{ width: '8rem' }}
            filterElement={refNoFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="refDate"
            field="refDate"
            header="Ref. Date"
            body={refDateBody}
            style={{ width: '8rem' }}
            dataType="date"
            filterElement={refDateFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />,
        <Column
            key="debit"
            field="debit"
            header="Debit Amt"
            body={debitBody}
            style={{ width: '8rem' }}
            dataType="numeric"
            filterElement={debitFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={debitFooter}
            footerStyle={{ fontWeight: 600 }}
        />,
        <Column
            key="credit"
            field="credit"
            header="Credit Amt"
            body={creditBody}
            style={{ width: '8rem' }}
            dataType="numeric"
            filterElement={creditFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
            headerClassName="summary-number"
            bodyClassName="summary-number"
            footerClassName="summary-number"
            footer={creditFooter}
            footerStyle={{ fontWeight: 600 }}
        />,
        <Column
            key="balance"
            field="balance"
            header="Balance"
            body={balanceBody}
            style={{ width: '8rem' }}
            dataType="numeric"
            filterElement={balanceFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
            headerClassName="summary-number"
            bodyClassName="summary-number"
        />,
        <Column
            key="drCr"
            field="drCr"
            header="Dr/Cr"
            body={drCrBody}
            style={{ width: '5rem' }}
            filterElement={drCrFilterElement}
            sortable
            {...MULTISELECT_COLUMN_PROPS}
        />
    ];
};
