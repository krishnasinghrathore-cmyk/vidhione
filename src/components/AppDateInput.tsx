import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, type CalendarProps } from 'primereact/calendar';
import { InputMask } from 'primereact/inputmask';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';

type AppDateInputProps = Omit<CalendarProps, 'value' | 'onChange' | 'inline'> & {
    value: Date | null;
    onChange: (value: Date | null) => void;
    fiscalYearStart?: Date | null;
    fiscalYearEnd?: Date | null;
    onEnterNext?: () => void;
    onCommit?: (value: Date | null, raw: string) => void;
    focusSignal?: number;
    autoFocus?: boolean;
    selectOnFocus?: boolean;
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

const AppDateInput = ({
    value,
    onChange,
    fiscalYearStart = null,
    fiscalYearEnd = null,
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
    ...calendarProps
}: AppDateInputProps) => {
    const overlayRef = useRef<OverlayPanel | null>(null);
    const inputMaskRef = useRef<any>(null);
    const inputElementRef = useRef<HTMLInputElement | null>(null);
    const [inputValue, setInputValue] = useState(() => (value ? formatDateDisplay(value) : ''));

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
        if (value) {
            setInputValue(formatDateDisplay(value));
            return;
        }
        setInputValue((prev) => (/\d/.test(prev) ? prev : ''));
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

    const derivedDate = useMemo(
        () => value ?? buildDateFromInput(inputValue, fiscalYearStart, fiscalYearEnd),
        [value, inputValue, fiscalYearStart, fiscalYearEnd]
    );

    const commitDate = (nextValue: Date | null, rawInput?: string) => {
        if (nextValue) {
            const formatted = formatDateDisplay(nextValue);
            setInputValue(formatted);
            onChange(nextValue);
            onCommit?.(nextValue, rawInput ?? formatted);
            return;
        }
        setInputValue('');
        onChange(null);
        onCommit?.(null, rawInput ?? '');
    };

    const commitFromInput = (raw: string) => {
        if (!/\d/.test(raw)) {
            commitDate(null, raw);
            return false;
        }
        const nextValue = buildDateFromInput(raw, fiscalYearStart, fiscalYearEnd);
        if (nextValue) {
            commitDate(nextValue, raw);
            return true;
        }
        onCommit?.(null, raw);
        return false;
    };

    const focusNextControl = (current: HTMLElement | null) => {
        if (!current || typeof document === 'undefined') return;
        const focusables = Array.from(
            document.querySelectorAll<HTMLElement>(
                'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => {
            if (element.hasAttribute('disabled')) return false;
            if (element.getAttribute('aria-disabled') === 'true') return false;
            const style = window.getComputedStyle(element);
            if (style.visibility === 'hidden' || style.display === 'none') return false;
            if (!element.getClientRects().length) return false;
            return true;
        });
        const startIndex = focusables.indexOf(current);
        if (startIndex < 0) return;
        for (let i = startIndex + 1; i < focusables.length; i += 1) {
            const candidate = focusables[i];
            if (candidate) {
                candidate.focus();
                break;
            }
        }
    };

    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitFromInput(event.currentTarget.value);
            if (onEnterNext) {
                window.setTimeout(onEnterNext, 0);
            } else {
                window.setTimeout(() => focusNextControl(event.currentTarget), 0);
            }
            return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const delta = event.key === 'ArrowUp' ? 1 : -1;
            const base = derivedDate ?? buildDateFromInput(event.currentTarget.value, fiscalYearStart, fiscalYearEnd);
            if (!base) return;
            const next = new Date(base.getFullYear() + delta, base.getMonth(), base.getDate());
            commitDate(next);
        }
    };

    const handleOverlayToggle = (event: React.MouseEvent<HTMLElement>) => {
        if (resolvedDisabled) return;
        overlayRef.current?.toggle(event);
    };

    const handleCalendarChange = (nextValue: Date | null) => {
        commitDate(nextValue);
        overlayRef.current?.hide();
    };

    return (
        <span className={classNames('app-date-input p-inputgroup', className)} style={style}>
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
                className={classNames('app-date-input-field', inputClassName)}
                style={{ width: '100%', ...(inputStyle ?? {}) }}
                onChange={(event) => {
                    const nextValue = (event as { value?: string }).value ?? '';
                    setInputValue(nextValue);
                }}
                onComplete={(event) => {
                    const nextValue = (event as { value?: string }).value ?? '';
                    commitFromInput(nextValue);
                }}
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
                    commitFromInput(event.currentTarget.value);
                }}
            />
            <Button
                type="button"
                icon="pi pi-calendar"
                className="app-date-input-button p-button-icon-only"
                onClick={handleOverlayToggle}
                disabled={resolvedDisabled}
                tabIndex={-1}
            />
            <OverlayPanel ref={overlayRef} appendTo={typeof window !== 'undefined' ? document.body : null}>
                <Calendar
                    {...calendarProps}
                    inline
                    value={derivedDate ?? null}
                    onChange={(event) => handleCalendarChange((event.value as Date | null) ?? null)}
                    dateFormat={dateFormat ?? 'dd/mm/yy'}
                    disabled={resolvedDisabled}
                />
            </OverlayPanel>
        </span>
    );
};

export default AppDateInput;
