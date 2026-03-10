'use client';
import React from 'react';
import AppCompactToggle from '@/components/AppCompactToggle';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { LabelWithIcon } from './LabelWithIcon';
import type { VoucherViewProps } from '../useVoucherState';

type VoucherTableFiltersProps = {
    viewProps: VoucherViewProps;
};

const RECONCILIATION_STATUS_OPTIONS: { label: string; value: -1 | 0 | 1 }[] = [
    { label: 'All', value: -1 },
    { label: 'Reconciled', value: 1 },
    { label: 'Unreconciled', value: 0 }
];

export function VoucherTableFilters({ viewProps }: VoucherTableFiltersProps) {
    const {
        isFormActive,
        setFirst,
        hasTouchedDatesRef,
        dateRange,
        setDateRange,
        setDateErrors,
        dateErrors,
        registerFilterFocusNonce,
        fiscalRange,
        fromDateInputRef,
        toDateInputRef,
        cancelled,
        setCancelled,
        reconciled,
        setReconciled,
        refreshButtonId
    } = viewProps;
    const cancellationSwitchInputId = `${refreshButtonId}-cancelled-switch`;

    return (
        <>
            <div className="flex flex-column gap-1">
                <label className="text-600 text-sm">
                    <LabelWithIcon icon="pi-calendar-minus">From Date</LabelWithIcon>
                </label>
                <AppDateInput
                    value={dateRange[0]}
                    onChange={(value) => {
                        setFirst(0);
                        hasTouchedDatesRef.current = true;
                        setDateRange((prev) => [value, prev[1]]);
                        setDateErrors({});
                    }}
                    placeholder="From date"
                    fiscalYearStart={fiscalRange?.start ?? null}
                    fiscalYearEnd={fiscalRange?.end ?? null}
                    inputRef={fromDateInputRef}
                    focusSignal={isFormActive ? undefined : registerFilterFocusNonce}
                    onEnterNext={() => toDateInputRef.current?.focus()}
                    autoFocus={!isFormActive}
                    selectOnFocus
                    className="app-entry-date"
                />
            </div>
            <div className="flex flex-column gap-1">
                <label className="text-600 text-sm">
                    <LabelWithIcon icon="pi-calendar-plus">To Date</LabelWithIcon>
                </label>
                <AppDateInput
                    value={dateRange[1]}
                    onChange={(value) => {
                        setFirst(0);
                        hasTouchedDatesRef.current = true;
                        setDateRange((prev) => [prev[0], value]);
                        setDateErrors({});
                    }}
                    placeholder="To date"
                    fiscalYearStart={fiscalRange?.start ?? null}
                    fiscalYearEnd={fiscalRange?.end ?? null}
                    inputRef={toDateInputRef}
                    className="app-entry-date"
                />
                {(dateErrors.fromDate || dateErrors.toDate) && (
                    <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                )}
            </div>
            <div className="flex flex-column gap-1">
                <label className="text-600 text-sm">
                    <LabelWithIcon icon="pi-check-square">Reconciliation</LabelWithIcon>
                </label>
                <AppDropdown
                    value={reconciled}
                    options={RECONCILIATION_STATUS_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(event) => {
                        setFirst(0);
                        const rawValue = Number(event.value);
                        setReconciled(rawValue === 1 ? 1 : rawValue === 0 ? 0 : -1);
                    }}
                    onEnterNext={() => {
                        if (typeof document === 'undefined') return;
                        document.getElementById(cancellationSwitchInputId)?.focus();
                    }}
                    className="w-12rem"
                />
            </div>
            <div className="flex flex-column gap-1">
                <label className="text-600 text-sm">
                    <LabelWithIcon icon="pi-filter">Cancellation</LabelWithIcon>
                </label>
                <div className="flex align-items-center gap-2">
                    <AppCompactToggle
                        inputId={cancellationSwitchInputId}
                        checked={cancelled === 1}
                        onChange={(checked) => {
                            setFirst(0);
                            setCancelled(checked ? 1 : 0);
                        }}
                        onLabel="Cancelled"
                        offLabel="Not cancelled"
                    />
                </div>
            </div>
        </>
    );
}
