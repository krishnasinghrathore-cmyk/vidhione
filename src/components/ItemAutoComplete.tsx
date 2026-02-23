import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from 'react';
import type {
    AutoComplete,
    AutoCompleteChangeEvent,
    AutoCompleteCompleteEvent
} from 'primereact/autocomplete';
import AppAutoComplete from '@/components/AppAutoComplete';

export type ItemOption = {
    label: string;
    value: number;
    searchText?: string | null;
};

type ItemAutoCompleteProps = Omit<
    React.ComponentProps<typeof AppAutoComplete>,
    'value' | 'suggestions' | 'completeMethod' | 'onChange' | 'field'
> & {
    value: number | null;
    onChange: (value: number | null, option?: ItemOption | null) => void;
    options: ItemOption[];
    loading?: boolean;
    loadingPlaceholder?: string;
    onSelectNext?: () => void;
    maxSuggestions?: number;
};

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

const resolveSearchText = (option: ItemOption) => {
    const fallback = option.searchText?.trim() || option.label;
    return fallback.toLowerCase();
};

const findExactMatch = (options: ItemOption[], query: string) => {
    const needle = normalize(query);
    if (!needle) return null;
    return (
        options.find((option) => normalize(option.label) === needle) ??
        options.find((option) => resolveSearchText(option) === needle) ??
        null
    );
};

const filterAndRankOptions = (options: ItemOption[], query: string) => {
    const needle = normalize(query);
    if (!needle) return options;

    const prefixMatches: ItemOption[] = [];
    const containsMatches: ItemOption[] = [];
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

const ItemAutoComplete = forwardRef<AutoComplete, ItemAutoCompleteProps>((
    {
        value,
        onChange,
        options,
        loading = false,
        loadingPlaceholder,
        onSelectNext,
        placeholder,
        onBlur,
        onFocus,
        onKeyDown,
        onKeyDownCapture,
        onDropdownClick,
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
    const [suggestions, setSuggestions] = useState<ItemOption[]>([]);

    const selectedOption = useMemo(
        () => (value == null ? null : options.find((option) => Number(option.value) === Number(value)) ?? null),
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

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as ItemOption | string | null;
        if (nextValue == null) {
            setQuery('');
            onChange(null, null);
            return;
        }
        if (typeof nextValue === 'string') {
            setQuery(nextValue);
            const trimmed = nextValue.trim();
            if (!trimmed) {
                onChange(null, null);
                return;
            }
            const match = findExactMatch(options, trimmed);
            if (!match) return;
            setQuery('');
            onChange(match.value ?? null, match);
            if (onSelectNext) {
                window.setTimeout(onSelectNext, 0);
            }
            return;
        }
        setQuery('');
        onChange(nextValue.value ?? null, nextValue);
        if (onSelectNext) {
            window.setTimeout(onSelectNext, 0);
        }
    };

    const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
        onBlur?.(event);
        setQuery('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onSelectNext) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) return;
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(onSelectNext, 0);
    };

    const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDownCapture?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onSelectNext) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (!overlayVisible) return;
        if (query.trim().length > 0) return;
        const highlighted = overlay?.querySelector(
            'li[data-p-highlight="true"], li.p-highlight, li[aria-selected="true"]'
        );
        if (highlighted) return;
        event.preventDefault();
        event.stopPropagation();
        autoCompleteRef.current?.hide?.();
        window.setTimeout(onSelectNext, 0);
    };

    const handleDropdownClick = (event: any) => {
        onDropdownClick?.(event);
        setQuery('');
        setSuggestions(options.slice(0, Math.max(1, maxSuggestions)));
    };

    const displayValue = query.length ? query : selectedOption;
    const resolvedPlaceholder = loading
        ? loadingPlaceholder ?? 'Loading items...'
        : placeholder ?? 'Select item';

    return (
        <AppAutoComplete
            {...rest}
            ref={autoCompleteRef}
            value={displayValue}
            suggestions={suggestions}
            completeMethod={handleComplete}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={onFocus}
            onKeyDown={handleKeyDown}
            onKeyDownCapture={handleKeyDownCapture}
            onDropdownClick={handleDropdownClick}
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

ItemAutoComplete.displayName = 'ItemAutoComplete';

export default ItemAutoComplete;
