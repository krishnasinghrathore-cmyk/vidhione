import type React from 'react';
import { Checkbox } from 'primereact/checkbox';
import AppDateInput from '@/components/AppDateInput';
import type { DateRangeErrors } from '@/lib/reportDateValidation';

type BalanceSheetReportFiltersProps = {
    fromDate: Date | null;
    toDate: Date | null;
    onFromDateChange: (value: Date | null) => void;
    onToDateChange: (value: Date | null) => void;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    fromDateInputRef: React.RefObject<HTMLInputElement>;
    toDateInputRef: React.RefObject<HTMLInputElement>;
    openingInputRef: React.RefObject<HTMLInputElement>;
    onFromDateEnterNext: () => void;
    onToDateEnterNext: () => void;
    openingOnly: boolean;
    onOpeningOnlyChange: (checked: boolean) => void;
    dateErrors: DateRangeErrors;
};

export function BalanceSheetReportFilters({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    fiscalYearStart,
    fiscalYearEnd,
    fromDateInputRef,
    toDateInputRef,
    openingInputRef,
    onFromDateEnterNext,
    onToDateEnterNext,
    openingOnly,
    onOpeningOnlyChange,
    dateErrors
}: BalanceSheetReportFiltersProps) {
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
                    readOnlyInput={openingOnly}
                    style={{ width: '150px' }}
                />
                <div className="flex align-items-center gap-2">
                    <Checkbox
                        inputId="balance-sheet-opening"
                        inputRef={openingInputRef}
                        checked={openingOnly}
                        onChange={(event) => onOpeningOnlyChange(Boolean(event.checked))}
                    />
                    <label htmlFor="balance-sheet-opening">Opening balance</label>
                </div>
            </div>
            {(dateErrors.fromDate || dateErrors.toDate) && (
                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
            )}
        </div>
    );
}
