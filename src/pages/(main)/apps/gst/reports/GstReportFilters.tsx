import type React from 'react';
import type { Dropdown } from 'primereact/dropdown';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import type { DateRangeErrors } from '@/lib/reportDateValidation';
import { GST_STATUS_OPTIONS, type GstCancelledFilter } from './utils';

type GstReportFiltersProps = {
    fromDate: Date | null;
    toDate: Date | null;
    onFromDateChange: (value: Date | null) => void;
    onToDateChange: (value: Date | null) => void;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    fromDateInputRef: React.RefObject<HTMLInputElement>;
    toDateInputRef: React.RefObject<HTMLInputElement>;
    statusRef: React.RefObject<Dropdown>;
    cancelled: GstCancelledFilter;
    onCancelledChange: (value: GstCancelledFilter) => void;
    onStatusEnterNext: () => void;
    dateErrors: DateRangeErrors;
};

export function GstReportFilters({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    fiscalYearStart,
    fiscalYearEnd,
    fromDateInputRef,
    toDateInputRef,
    statusRef,
    cancelled,
    onCancelledChange,
    onStatusEnterNext,
    dateErrors
}: GstReportFiltersProps) {
    return (
        <div className="flex flex-column gap-2 w-full">
            <div className="flex align-items-center gap-2 flex-wrap">
                <AppDateInput
                    value={fromDate}
                    onChange={onFromDateChange}
                    placeholder="From date"
                    fiscalYearStart={fiscalYearStart}
                    fiscalYearEnd={fiscalYearEnd}
                    autoFocus
                    selectOnFocus
                    inputRef={fromDateInputRef}
                    onEnterNext={() => toDateInputRef.current?.focus()}
                    style={{ width: '150px' }}
                />
                <AppDateInput
                    value={toDate}
                    onChange={onToDateChange}
                    placeholder="To date"
                    fiscalYearStart={fiscalYearStart}
                    fiscalYearEnd={fiscalYearEnd}
                    inputRef={toDateInputRef}
                    onEnterNext={() => statusRef.current?.focus?.()}
                    style={{ width: '150px' }}
                />
                <AppDropdown
                    value={cancelled === -1 ? null : cancelled}
                    options={GST_STATUS_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Status"
                    showClear
                    ref={statusRef}
                    onChange={(event) => onCancelledChange((event.value ?? -1) as GstCancelledFilter)}
                    onEnterNext={onStatusEnterNext}
                    style={{ minWidth: '170px' }}
                />
            </div>
            {(dateErrors.fromDate || dateErrors.toDate) && (
                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
            )}
        </div>
    );
}
