'use client';
import React from 'react';
import AppCompactToggle from '@/components/AppCompactToggle';
import AppDateInput from '@/components/AppDateInput';
import { LabelWithIcon } from './LabelWithIcon';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';

type PaymentVoucherTableFiltersProps = {
    viewProps: PaymentVoucherViewProps;
};

export function PaymentVoucherTableFilters({ viewProps }: PaymentVoucherTableFiltersProps) {
    const {
        isFormActive,
        setFirst,
        hasTouchedDatesRef,
        dateRange,
        setDateRange,
        setDateErrors,
        dateErrors,
        fiscalRange,
        fromDateInputRef,
        toDateInputRef,
        cancelled,
        setCancelled
    } = viewProps;

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
                    <LabelWithIcon icon="pi-filter">Status</LabelWithIcon>
                </label>
                <div className="flex align-items-center gap-2">
                    <AppCompactToggle
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
