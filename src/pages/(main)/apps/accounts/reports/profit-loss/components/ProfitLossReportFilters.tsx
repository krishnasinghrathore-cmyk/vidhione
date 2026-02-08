import type React from 'react';
import AppDateInput from '@/components/AppDateInput';
import type { DateRangeErrors } from '@/lib/reportDateValidation';

type ProfitLossReportFiltersProps = {
    fromDate: Date | null;
    toDate: Date | null;
    onFromDateChange: (value: Date | null) => void;
    onToDateChange: (value: Date | null) => void;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    fromDateInputRef: React.RefObject<HTMLInputElement>;
    toDateInputRef: React.RefObject<HTMLInputElement>;
    onFromDateEnterNext: () => void;
    onToDateEnterNext: () => void;
    dateErrors: DateRangeErrors;
};

export function ProfitLossReportFilters({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    fiscalYearStart,
    fiscalYearEnd,
    fromDateInputRef,
    toDateInputRef,
    onFromDateEnterNext,
    onToDateEnterNext,
    dateErrors
}: ProfitLossReportFiltersProps) {
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
                    onEnterNext={onFromDateEnterNext}
                    style={{ width: '150px' }}
                />
                <AppDateInput
                    value={toDate}
                    onChange={onToDateChange}
                    placeholder="To date"
                    fiscalYearStart={fiscalYearStart}
                    fiscalYearEnd={fiscalYearEnd}
                    inputRef={toDateInputRef}
                    onEnterNext={onToDateEnterNext}
                    style={{ width: '150px' }}
                />
            </div>
            {(dateErrors.fromDate || dateErrors.toDate) && (
                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
            )}
        </div>
    );
}
