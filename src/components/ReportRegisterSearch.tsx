import React from 'react';
import { AppRegisterSearch } from './AppRegisterSearch';

type ReportRegisterSearchProps = {
    value: string;
    onValueChange: (nextValue: string) => void;
    matchCase: boolean;
    onMatchCaseChange: (nextValue: boolean) => void;
    wholeWord: boolean;
    onWholeWordChange: (nextValue: boolean) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    helperText?: React.ReactNode;
};

export function ReportRegisterSearch({
    value,
    onValueChange,
    matchCase,
    onMatchCaseChange,
    wholeWord,
    onWholeWordChange,
    disabled = false,
    className,
    placeholder = 'Search register...',
    helperText = 'Aa: Match Case · W: Whole Word'
}: ReportRegisterSearchProps) {
    return (
        <AppRegisterSearch
            value={value}
            onValueChange={onValueChange}
            matchCase={matchCase}
            onMatchCaseChange={onMatchCaseChange}
            wholeWord={wholeWord}
            onWholeWordChange={onWholeWordChange}
            placeholder={placeholder}
            helperText={helperText}
            className={`app-report-header-search app-register-search--compact${className ? ` ${className}` : ''}`}
            disabled={disabled}
        />
    );
}
