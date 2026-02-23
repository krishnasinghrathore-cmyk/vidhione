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
import { useLedgerGroupOptions, type LedgerGroupOption } from '@/lib/accounts/ledgerGroups';

type LedgerGroupAutoCompleteProps = Omit<
    React.ComponentProps<typeof AppAutoComplete>,
    'value' | 'suggestions' | 'completeMethod' | 'onChange' | 'field'
> & {
    value: number | null;
    onChange: (value: number | null, option?: LedgerGroupOption | null) => void;
    options?: LedgerGroupOption[];
    loading?: boolean;
    loadingPlaceholder?: string;
    loadingWhenPanelOpenOnly?: boolean;
    onSelectNext?: () => void;
    skip?: boolean;
};

const LedgerGroupAutoComplete = forwardRef<AutoComplete, LedgerGroupAutoCompleteProps>((
    {
        value,
        onChange,
        options: optionsProp,
        loading: loadingProp,
        loadingPlaceholder,
        loadingWhenPanelOpenOnly,
        onSelectNext,
        placeholder,
        onBlur,
        onFocus,
        onKeyDown,
        onDropdownClick,
        onShow,
        onHide,
        openOnFocus,
        disabled,
        readOnly,
        skip,
        ...rest
    },
    ref
) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const { options: queryOptions, loading: queryLoading, refetch } = useLedgerGroupOptions({
        skip: skip || Boolean(optionsProp)
    });

    const options = optionsProp ?? queryOptions;
    const loading = loadingProp ?? queryLoading;
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<LedgerGroupOption[]>([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const showLoading =
        (loadingWhenPanelOpenOnly ? loading && isPanelOpen : loading) && suggestions.length === 0;
    const pendingOpenRef = useRef(false);
    const resolvedOpenOnFocus = openOnFocus ?? true;

    const selectedOption = useMemo(
        () => (value == null ? null : options.find((option) => Number(option.value) === Number(value)) ?? null),
        [options, value]
    );

    useEffect(() => {
        if (query) {
            const needle = query.trim().toLowerCase();
            setSuggestions(
                needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options
            );
            return;
        }
        setSuggestions(options);
    }, [options, query]);

    useEffect(() => {
        if (loading) return;
        if (!pendingOpenRef.current) return;
        pendingOpenRef.current = false;
        window.setTimeout(() => {
            autoCompleteRef.current?.show?.();
        }, 0);
    }, [loading, options]);

    const filterOptions = (input: string) => {
        const needle = input.trim().toLowerCase();
        if (!needle) return options;
        return options.filter((option) => option.label.toLowerCase().includes(needle));
    };

    const findExactLabelMatch = (input: string) => {
        const needle = input.trim().toLowerCase();
        if (!needle) return null;
        return (
            suggestions.find((option) => option.label.toLowerCase() === needle) ??
            options.find((option) => option.label.toLowerCase() === needle) ??
            null
        );
    };

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        const nextQuery = event.query ?? '';
        setQuery(nextQuery);
        setSuggestions(filterOptions(nextQuery));
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as LedgerGroupOption | string | null;
        if (nextValue == null) {
            setQuery('');
            onChange(null, null);
            return;
        }
        if (typeof nextValue === 'string') {
            const trimmed = nextValue.trim();
            if (!trimmed) {
                setQuery('');
                onChange(null, null);
                return;
            }
            const match = findExactLabelMatch(nextValue);
            if (match) {
                setQuery('');
                onChange(match.value ?? null, match);
                if (onSelectNext) {
                    window.setTimeout(onSelectNext, 0);
                }
                return;
            }
            setQuery(nextValue);
            return;
        }
        setQuery('');
        onChange(nextValue.value ?? null, nextValue);
        if (onSelectNext) {
            window.setTimeout(onSelectNext, 0);
        }
    };

    const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
        onBlur?.(event);
        setIsPanelOpen(false);
        pendingOpenRef.current = false;
        setQuery('');
    };

    const handleFocus = (event: React.FocusEvent<HTMLSpanElement>) => {
        onFocus?.(event);
        if (!resolvedOpenOnFocus) return;
        pendingOpenRef.current = true;
        if (!loading && options.length === 0) {
            refetch?.();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onSelectNext) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) {
            if (query) return;
            const highlighted = overlay?.querySelector('li[data-p-highlight="true"]') as HTMLElement | null;
            if (highlighted) {
                const indexAttr = highlighted.getAttribute('data-index') ?? highlighted.getAttribute('index');
                const index = indexAttr ? Number(indexAttr) : NaN;
                const highlightedOption = Number.isFinite(index) ? suggestions[index] : null;
                if (highlightedOption) {
                    if (!selectedOption) return;
                    const highlightedValue = highlightedOption.value;
                    const selectedValue = selectedOption.value;
                    if (highlightedValue != null && selectedValue != null && Number(highlightedValue) !== Number(selectedValue)) {
                        return;
                    }
                }
            } else if (!selectedOption) {
                event.preventDefault();
                event.stopPropagation();
                autoCompleteRef.current?.hide?.();
                window.setTimeout(onSelectNext, 0);
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            autoCompleteRef.current?.hide?.();
            window.setTimeout(onSelectNext, 0);
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(onSelectNext, 0);
    };

    const handleDropdownClick = (event: any) => {
        onDropdownClick?.(event);
        pendingOpenRef.current = true;
        setQuery('');
        setSuggestions([...options]);
        if (!loading && options.length === 0) {
            refetch?.();
        }
    };

    const handleShow = () => {
        setIsPanelOpen(true);
        onShow?.();
    };

    const handleHide = () => {
        setIsPanelOpen(false);
        onHide?.();
    };

    const displayValue = query.length ? query : selectedOption;
    const resolvedPlaceholder = showLoading
        ? loadingPlaceholder ?? 'Loading groups...'
        : placeholder ?? 'Select group';

    return (
        <AppAutoComplete
            {...rest}
            ref={autoCompleteRef}
            value={displayValue}
            suggestions={suggestions}
            completeMethod={handleComplete}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onDropdownClick={handleDropdownClick}
            onShow={handleShow}
            onHide={handleHide}
            field="label"
            loading={showLoading}
            showLoadingIcon
            showEmptyMessage
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            readOnly={readOnly}
        />
    );
});

LedgerGroupAutoComplete.displayName = 'LedgerGroupAutoComplete';

export default LedgerGroupAutoComplete;
