import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type {
    AutoComplete,
    AutoCompleteChangeEvent,
    AutoCompleteCompleteEvent,
    AutoCompleteSelectEvent
} from 'primereact/autocomplete';
import AppAutoComplete from '@/components/AppAutoComplete';
import {
    focusNextElement,
    markEnterNavAutoOpenIntent,
    queueAutoOpenFocusedOverlayControl,
    resolveEnterScope
} from '@/lib/enterNavigation';

export type RegisterStringOption = {
    label: string;
    value: string;
    searchText?: string | null;
};

type RegisterStringAutoCompleteProps = Omit<
    React.ComponentProps<typeof AppAutoComplete>,
    'value' | 'suggestions' | 'completeMethod' | 'onChange' | 'field'
> & {
    value: string;
    options: RegisterStringOption[];
    onChange: (value: string, option?: RegisterStringOption | null) => void;
    allValue?: string;
    maxSuggestions?: number;
    loadingPlaceholder?: string;
};

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

const resolveSearchText = (option: RegisterStringOption) => {
    const fallback = option.searchText?.trim() || option.label;
    return fallback.toLowerCase();
};

const findExactMatch = (options: RegisterStringOption[], query: string) => {
    const needle = normalize(query);
    if (!needle) return null;
    return (
        options.find((option) => normalize(option.label) === needle) ??
        options.find((option) => normalize(option.value) === needle) ??
        options.find((option) => resolveSearchText(option) === needle) ??
        null
    );
};

const filterAndRankOptions = (options: RegisterStringOption[], query: string) => {
    const needle = normalize(query);
    if (!needle) return options;
    const prefixMatches: RegisterStringOption[] = [];
    const containsMatches: RegisterStringOption[] = [];
    options.forEach((option) => {
        const searchText = resolveSearchText(option);
        if (!searchText.includes(needle)) return;
        if (searchText.startsWith(needle)) {
            prefixMatches.push(option);
            return;
        }
        containsMatches.push(option);
    });
    return [...prefixMatches, ...containsMatches];
};

const RegisterStringAutoComplete = forwardRef<AutoComplete, RegisterStringAutoCompleteProps>((
    {
        value,
        options,
        onChange,
        allValue = 'all',
        loading = false,
        loadingPlaceholder,
        placeholder,
        onBlur,
        onFocus,
        onKeyDown,
        onKeyDownCapture,
        onDropdownClick,
        onSelect,
        onEnterNext,
        autoHighlight,
        disabled,
        readOnly,
        maxSuggestions = 50,
        ...rest
    },
    ref
) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<RegisterStringOption[]>([]);
    const suppressObjectChangeRef = useRef(false);
    const advanceOnSelectionRef = useRef(false);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value]
    );

    useEffect(() => {
        if (!query) {
            setSuggestions(options.slice(0, Math.max(1, maxSuggestions)));
        }
    }, [maxSuggestions, options, query]);

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        const nextQuery = event.query ?? '';
        setQuery(nextQuery);
        const filtered = filterAndRankOptions(options, nextQuery);
        setSuggestions(filtered.slice(0, Math.max(1, maxSuggestions)));
    };

    const commitSelection = (nextOption: RegisterStringOption | null) => {
        setQuery('');
        if (!nextOption) {
            onChange(allValue, null);
            return;
        }
        onChange(nextOption.value, nextOption);
    };

    const runEnterNext = () => {
        const focusAnchor = autoCompleteRef.current?.getInput?.() ?? null;
        if (!focusAnchor) return;
        markEnterNavAutoOpenIntent();
        const moveToNext = () => {
            focusNextElement(focusAnchor, resolveEnterScope(focusAnchor));
        };
        if (!onEnterNext) {
            moveToNext();
            return;
        }
        const activeBefore = typeof document !== 'undefined' ? document.activeElement : null;
        window.setTimeout(() => {
            const handled = onEnterNext();
            if (handled === true) {
                if (typeof window !== 'undefined') {
                    window.requestAnimationFrame(() => {
                        const activeAfter = document.activeElement as HTMLElement | null;
                        if (!activeAfter || activeAfter === activeBefore || activeAfter === focusAnchor) return;
                        queueAutoOpenFocusedOverlayControl(activeAfter);
                    });
                }
                return;
            }
            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        const activeAfter = typeof document !== 'undefined' ? document.activeElement : null;
                        if (activeAfter && activeAfter !== activeBefore && activeAfter !== focusAnchor) return;
                        moveToNext();
                    });
                });
                return;
            }
            moveToNext();
        }, 0);
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as RegisterStringOption | string | null;
        if (nextValue == null) {
            commitSelection(null);
            return;
        }
        if (typeof nextValue === 'string') {
            setQuery(nextValue);
            const trimmed = nextValue.trim();
            if (!trimmed) {
                commitSelection(null);
                return;
            }
            const match = findExactMatch(options, trimmed);
            if (!match) return;
            commitSelection(match);
            return;
        }
        suppressObjectChangeRef.current = true;
        commitSelection(nextValue);
    };

    const handleSelect = (event: AutoCompleteSelectEvent) => {
        onSelect?.(event);
        const nextValue = event.value as RegisterStringOption | string | null;
        if (suppressObjectChangeRef.current) {
            suppressObjectChangeRef.current = false;
        } else {
            if (nextValue == null) {
                commitSelection(null);
                return;
            }
            if (typeof nextValue === 'string') {
                const match = findExactMatch(options, nextValue.trim());
                if (!match) return;
                commitSelection(match);
            } else {
                commitSelection(nextValue);
            }
        }
        if (!advanceOnSelectionRef.current) return;
        advanceOnSelectionRef.current = false;
        window.setTimeout(runEnterNext, 0);
    };

    const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDownCapture?.(event);
        if (event.defaultPrevented) return;
        if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (!overlayVisible) return;
        advanceOnSelectionRef.current = true;
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        onBlur?.(event);
        suppressObjectChangeRef.current = false;
        advanceOnSelectionRef.current = false;
        setQuery('');
    };

    const handleDropdown = (event: any) => {
        onDropdownClick?.(event);
        advanceOnSelectionRef.current = false;
        setQuery('');
        setSuggestions(options.slice(0, Math.max(1, maxSuggestions)));
    };

    const displayValue = query.length ? query : selectedOption;
    const resolvedPlaceholder = loading
        ? loadingPlaceholder ?? 'Loading...'
        : placeholder ?? 'Select';

    return (
        <AppAutoComplete
            {...rest}
            ref={autoCompleteRef}
            value={displayValue}
            suggestions={suggestions}
            completeMethod={handleComplete}
            onChange={handleChange}
            onSelect={handleSelect}
            onBlur={handleBlur}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            onKeyDownCapture={handleKeyDownCapture}
            onDropdownClick={handleDropdown}
            field="label"
            loading={loading}
            showLoadingIcon
            showEmptyMessage
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            readOnly={readOnly}
            autoHighlight={autoHighlight ?? query.trim().length > 0}
        />
    );
});

RegisterStringAutoComplete.displayName = 'RegisterStringAutoComplete';

export default RegisterStringAutoComplete;
