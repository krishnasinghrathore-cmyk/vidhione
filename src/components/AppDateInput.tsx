import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, type CalendarProps } from 'primereact/calendar';
import { InputMask } from 'primereact/inputmask';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';
import { validateSingleDate } from '@/lib/reportDateValidation';
import {
    focusNextElement,
    markEnterNavAutoOpenIntent,
    queueAutoOpenFocusedOverlayControl,
    resolveEnterScope
} from '@/lib/enterNavigation';

type AppDateInputProps = Omit<CalendarProps, 'value' | 'onChange' | 'inline'> & {
    value: Date | null;
    onChange: (value: Date | null) => void;
    fiscalYearStart?: Date | null;
    fiscalYearEnd?: Date | null;
    enforceFiscalRange?: boolean;
    onEnterNext?: () => boolean | void;
    onCommit?: (value: Date | null, raw: string) => void;
    focusSignal?: number;
    autoFocus?: boolean;
    selectOnFocus?: boolean;
    compact?: boolean;
};

const buildDateFromInput = (
    raw: string,
    fiscalYearStart: Date | null,
    fiscalYearEnd: Date | null
): Date | null => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 4) return null;

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    if (day < 1 || month < 1 || month > 12) return null;

    let year: number | null = null;
    const yearDigits = digits.slice(4);
    if (yearDigits.length >= 2) {
        year = yearDigits.length === 2 ? 2000 + Number(yearDigits) : Number(yearDigits.slice(0, 4));
    } else if (fiscalYearStart || fiscalYearEnd) {
        const startYear = fiscalYearStart?.getFullYear() ?? new Date().getFullYear();
        const endYear = fiscalYearEnd?.getFullYear() ?? startYear;
        const startCandidate = new Date(startYear, month - 1, day);
        const endCandidate = new Date(endYear, month - 1, day);
        if (
            fiscalYearStart &&
            fiscalYearEnd &&
            startCandidate >= fiscalYearStart &&
            startCandidate <= fiscalYearEnd
        ) {
            year = startYear;
        } else if (
            fiscalYearStart &&
            fiscalYearEnd &&
            endCandidate >= fiscalYearStart &&
            endCandidate <= fiscalYearEnd
        ) {
            year = endYear;
        } else {
            year = startYear;
        }
    } else {
        year = new Date().getFullYear();
    }

    if (year == null) return null;
    const candidate = new Date(year, month - 1, day);
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
        return null;
    }
    return candidate;
};

const formatDateDisplay = (value: Date) => {
    const dd = String(value.getDate()).padStart(2, '0');
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const yyyy = value.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const isValidDate = (value: Date | null | undefined): value is Date =>
    value instanceof Date && !Number.isNaN(value.getTime());

const AppDateInput = ({
    value,
    onChange,
    fiscalYearStart = null,
    fiscalYearEnd = null,
    enforceFiscalRange = false,
    onEnterNext,
    onCommit,
    placeholder,
    inputId,
    inputStyle,
    inputClassName,
    readOnlyInput,
    disabled,
    className,
    style,
    mask,
    maskSlotChar,
    dateFormat,
    inputRef,
    focusSignal,
    autoFocus,
    selectOnFocus,
    compact = true,
    ...calendarProps
}: AppDateInputProps) => {
    const overlayRef = useRef<OverlayPanel | null>(null);
    const inputMaskRef = useRef<any>(null);
    const inputElementRef = useRef<HTMLInputElement | null>(null);
    const [inputValue, setInputValue] = useState(() => (isValidDate(value) ? formatDateDisplay(value) : ''));
    const [inputError, setInputError] = useState<string | null>(null);

    const resolvedDisabled = Boolean(disabled || readOnlyInput);

    useEffect(() => {
        const element = inputMaskRef.current?.getElement?.() ?? null;
        inputElementRef.current = element;
        if (typeof inputRef === 'function') {
            inputRef(element);
        } else if (inputRef) {
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
        }
    }, [inputRef]);

    useEffect(() => {
        if (isValidDate(value)) {
            setInputValue(formatDateDisplay(value));
            setInputError(null);
            return;
        }
        if (value == null) {
            setInputValue((prev) => (/\d/.test(prev) ? prev : ''));
            return;
        }
        setInputError('Enter date in DD/MM/YYYY format');
    }, [value]);

    useEffect(() => {
        if (focusSignal == null) return;
        const element = inputMaskRef.current?.getElement?.() ?? inputElementRef.current;
        if (!element) return;
        element.focus();
        if (selectOnFocus && typeof element.setSelectionRange === 'function') {
            const length = element.value?.length ?? 0;
            element.setSelectionRange(0, length);
        }
    }, [focusSignal, selectOnFocus]);

    const derivedDate = useMemo(() => {
        if (isValidDate(value)) return value;
        return buildDateFromInput(inputValue, fiscalYearStart, fiscalYearEnd);
    }, [value, inputValue, fiscalYearStart, fiscalYearEnd]);

    const resolveFiscalRangeError = (nextValue: Date | null) => {
        if (!nextValue || !enforceFiscalRange) return null;
        const validation = validateSingleDate(
            { date: nextValue },
            { start: fiscalYearStart ?? null, end: fiscalYearEnd ?? null }
        );
        return validation.ok ? null : (validation.errors.date ?? 'Date is outside the fiscal year');
    };

    const commitDate = (nextValue: Date | null, rawInput?: string) => {
        if (nextValue) {
            const formatted = formatDateDisplay(nextValue);
            setInputValue(formatted);
            setInputError(null);
            onChange(nextValue);
            onCommit?.(nextValue, rawInput ?? formatted);
            return;
        }
        setInputValue('');
        setInputError(null);
        onChange(null);
        onCommit?.(null, rawInput ?? '');
    };

    const rejectDate = (raw: string, message: string) => {
        setInputValue(raw);
        setInputError(message);
        onChange(null);
        onCommit?.(null, raw);
        return false;
    };

    const commitIfAllowed = (nextValue: Date | null, rawInput?: string) => {
        if (!nextValue) {
            commitDate(null, rawInput);
            return true;
        }
        const fiscalError = resolveFiscalRangeError(nextValue);
        if (fiscalError) {
            return rejectDate(rawInput ?? formatDateDisplay(nextValue), fiscalError);
        }
        commitDate(nextValue, rawInput);
        return true;
    };

    const commitFromInput = (raw: string) => {
        if (!/\d/.test(raw)) {
            commitDate(null, raw);
            return true;
        }
        const nextValue = buildDateFromInput(raw, fiscalYearStart, fiscalYearEnd);
        if (nextValue) {
            return commitIfAllowed(nextValue, raw);
        }
        return rejectDate(raw, 'Enter date in DD/MM/YYYY format');
    };

    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Tab') {
            const isCommitted = commitFromInput(event.currentTarget.value);
            if (!isCommitted) {
                event.preventDefault();
                event.stopPropagation();
            }
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            markEnterNavAutoOpenIntent();
            const isCommitted = commitFromInput(event.currentTarget.value);
            if (!isCommitted) return;
            const currentInput = event.currentTarget;
            window.setTimeout(() => {
                if (!onEnterNext) {
                    focusNextElement(currentInput, resolveEnterScope(currentInput));
                    return;
                }
                const activeBefore = typeof document !== 'undefined' ? document.activeElement : null;
                const runFallbackIfNeeded = () => {
                    const activeAfter = typeof document !== 'undefined' ? document.activeElement : null;
                    if (activeAfter && activeAfter !== activeBefore && activeAfter !== currentInput) {
                        return;
                    }
                    focusNextElement(currentInput, resolveEnterScope(currentInput));
                };
                const handled = onEnterNext();
                if (handled === true) {
                    if (typeof window !== 'undefined') {
                        window.requestAnimationFrame(() => {
                            const activeAfter = document.activeElement as HTMLElement | null;
                            if (!activeAfter || activeAfter === activeBefore || activeAfter === currentInput) return;
                            queueAutoOpenFocusedOverlayControl(activeAfter);
                        });
                    }
                    return;
                }
                if (typeof window !== 'undefined') {
                    window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(runFallbackIfNeeded);
                    });
                    return;
                }
                runFallbackIfNeeded();
            }, 0);
            return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const delta = event.key === 'ArrowUp' ? 1 : -1;
            const base = derivedDate ?? buildDateFromInput(event.currentTarget.value, fiscalYearStart, fiscalYearEnd);
            if (!base) return;
            const next = new Date(base.getFullYear() + delta, base.getMonth(), base.getDate());
            commitIfAllowed(next);
        }
    };

    const handleOverlayToggle = (event: React.MouseEvent<HTMLElement>) => {
        if (resolvedDisabled) return;
        overlayRef.current?.toggle(event);
    };

    const handleCalendarChange = (nextValue: Date | null) => {
        const committed = commitIfAllowed(nextValue);
        if (!committed) return;
        overlayRef.current?.hide();
    };

    return (
        <span className={classNames('app-date-input p-inputgroup', compact && 'app-date-input--compact', className)} style={style}>
            <InputMask
                ref={inputMaskRef}
                id={inputId}
                value={inputValue}
                autoFocus={autoFocus && !resolvedDisabled}
                mask={mask ?? '99/99/9999'}
                slotChar={maskSlotChar ?? '_'}
                autoClear={false}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnlyInput}
                style={{ width: '100%', ...(inputStyle ?? {}) }}
                onChange={(event) => {
                    const nextValue = (event as { value?: string }).value ?? '';
                    setInputValue(nextValue);
                    if (inputError) setInputError(null);
                }}
                onComplete={(event) => {
                    const nextValue = (event as { value?: string }).value ?? '';
                    commitFromInput(nextValue);
                }}
                aria-invalid={inputError ? true : undefined}
                title={inputError ?? undefined}
                onKeyDown={handleInputKeyDown}
                onFocus={(event) => {
                    if (!selectOnFocus || resolvedDisabled) return;
                    const target = event.currentTarget;
                    if (typeof window !== 'undefined') {
                        window.setTimeout(() => {
                            if (document.activeElement !== target) return;
                            target.select();
                        }, 150);
                        return;
                    }
                    target.select();
                }}
                onBlur={(event) => {
                    const isCommitted = commitFromInput(event.currentTarget.value);
                    if (!isCommitted && enforceFiscalRange) {
                        const target = event.currentTarget;
                        if (typeof window !== 'undefined') {
                            window.setTimeout(() => {
                                target.focus();
                                if (selectOnFocus) target.select();
                            }, 0);
                        } else {
                            target.focus();
                            if (selectOnFocus) target.select();
                        }
                    }
                }}
                className={classNames('app-date-input-field', compact && 'app-date-input-field--compact p-inputtext-sm', inputClassName, inputError && 'p-invalid')}
            />
            <Button
                type="button"
                icon="pi pi-calendar"
                className={classNames('app-date-input-button p-button-icon-only', compact && 'app-date-input-button--compact')}
                onClick={handleOverlayToggle}
                disabled={resolvedDisabled}
                tabIndex={-1}
            />
            <OverlayPanel ref={overlayRef} appendTo={typeof window !== 'undefined' ? document.body : null}>
                <Calendar
                    {...calendarProps}
                    inline
                    value={isValidDate(derivedDate) ? derivedDate : null}
                    onChange={(event) => handleCalendarChange((event.value as Date | null) ?? null)}
                    dateFormat={dateFormat ?? 'dd/mm/yy'}
                    disabled={resolvedDisabled}
                />
            </OverlayPanel>
        </span>
    );
};

export default AppDateInput;
