import React from 'react';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';

export type AppRegisterSearchProps = {
    value: string;
    onValueChange: (nextValue: string) => void;
    matchCase: boolean;
    onMatchCaseChange: (nextValue: boolean) => void;
    wholeWord: boolean;
    onWholeWordChange: (nextValue: boolean) => void;
    label?: React.ReactNode;
    placeholder?: string;
    helperText?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    matchCaseButtonLabel?: string;
    wholeWordButtonLabel?: string;
    matchCaseTitle?: string;
    wholeWordTitle?: string;
};

export function AppRegisterSearch({
    value,
    onValueChange,
    matchCase,
    onMatchCaseChange,
    wholeWord,
    onWholeWordChange,
    label,
    placeholder = 'Search...',
    helperText,
    className,
    disabled = false,
    matchCaseButtonLabel = 'Aa',
    wholeWordButtonLabel = 'W',
    matchCaseTitle = 'Match Case',
    wholeWordTitle = 'Match Whole Word'
}: AppRegisterSearchProps) {
    return (
        <div className={classNames('app-register-search', className)}>
            {label ? <label className="text-600 text-sm">{label}</label> : null}
            <div className="app-register-search__input-wrap">
                <i className="pi pi-search app-register-search__icon" />
                <InputText
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    placeholder={placeholder}
                    className="app-register-search__input"
                    disabled={disabled}
                />
                <div className="app-register-search__options">
                    <button
                        type="button"
                        className={classNames('app-register-search__option', { 'is-active': matchCase })}
                        onClick={() => onMatchCaseChange(!matchCase)}
                        aria-label={matchCaseTitle}
                        aria-pressed={matchCase}
                        title={matchCaseTitle}
                        disabled={disabled}
                    >
                        {matchCaseButtonLabel}
                    </button>
                    <button
                        type="button"
                        className={classNames('app-register-search__option', { 'is-active': wholeWord })}
                        onClick={() => onWholeWordChange(!wholeWord)}
                        aria-label={wholeWordTitle}
                        aria-pressed={wholeWord}
                        title={wholeWordTitle}
                        disabled={disabled}
                    >
                        {wholeWordButtonLabel}
                    </button>
                </div>
            </div>
            {helperText ? <small className="app-register-search__helper text-600">{helperText}</small> : null}
        </div>
    );
}
