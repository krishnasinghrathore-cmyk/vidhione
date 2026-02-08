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
import { usePartyLedgerOptions, type PartyLedgerOption } from '@/lib/accounts/partyLedger';
import { useLedgerOptionsByPurpose, type LedgerOption } from '@/lib/accounts/ledgerOptions';

type ManualLedgerAutoCompleteProps = React.ComponentProps<typeof AppAutoComplete> & {
    variant?: 'manual';
    onSelectNext?: () => void;
    ledgerGroupId?: number | null;
    ledgerGroupIds?: number[] | null;
    debug?: boolean;
    debugLabel?: string;
};

type PartyLedgerAutoCompleteProps = Omit<
    React.ComponentProps<typeof AppAutoComplete>,
    'value' | 'suggestions' | 'completeMethod' | 'onChange' | 'field'
> & {
    variant: 'party';
    value: number | null;
    onChange: (value: number | null, option?: PartyLedgerOption | null) => void;
    options?: PartyLedgerOption[];
    loading?: boolean;
    loadingPlaceholder?: string;
    onSelectNext?: () => void;
    openOnFocus?: boolean;
    skip?: boolean;
    ledgerGroupId?: number | null;
    cityId?: number | null;
    includeNone?: boolean;
    noneLabel?: string;
    limit?: number;
    search?: string | null;
};

type LedgerByPurposeAutoCompleteProps = Omit<
    React.ComponentProps<typeof AppAutoComplete>,
    'value' | 'suggestions' | 'completeMethod' | 'onChange' | 'field'
> & {
    variant: 'purpose';
    value: number | null;
    onChange: (value: number | null, option?: LedgerOption | null) => void;
    purpose: string;
    selectedOption?: LedgerOption | null;
    ledgerGroupId?: number | null;
    areaId?: number | null;
    areaIds?: number[] | null;
    excludeLedgerId?: number | null;
    includeNone?: boolean;
    limit?: number;
    search?: string | null;
    options?: LedgerOption[];
    loading?: boolean;
    loadingPlaceholder?: string;
    onSelectNext?: () => void;
    skip?: boolean;
};

type LedgerAutoCompleteProps =
    | ManualLedgerAutoCompleteProps
    | PartyLedgerAutoCompleteProps
    | LedgerByPurposeAutoCompleteProps;

type OptionComparable = {
    value?: unknown;
    label?: string | null;
    address?: string | null;
};

const areOptionArraysEqual = (left: OptionComparable[], right: OptionComparable[]) => {
    if (left === right) return true;
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
        const leftItem = left[index];
        const rightItem = right[index];
        if (leftItem?.value !== rightItem?.value) return false;
        if (leftItem?.label !== rightItem?.label) return false;
        if (leftItem?.address !== rightItem?.address) return false;
    }
    return true;
};

const PartyLedgerAutoCompleteImpl = forwardRef<AutoComplete, PartyLedgerAutoCompleteProps>((
    {
        value,
        onChange,
        options: optionsProp,
        loading: loadingProp,
        loadingPlaceholder,
        onSelectNext,
        placeholder,
        onBlur,
        onFocus,
        onKeyDown,
        onDropdownClick,
        openOnFocus,
        disabled,
        readOnly,
        skip,
        ledgerGroupId,
        cityId,
        includeNone,
        noneLabel,
        limit,
        search,
        variant: _variant,
        ...rest
    },
    ref
) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const { options: queryOptions, loading: queryLoading, refetch } = usePartyLedgerOptions({
        ledgerGroupId: ledgerGroupId ?? null,
        cityId: cityId ?? null,
        includeNone,
        limit,
        search: search ?? null,
        skip: skip || Boolean(optionsProp)
    });

    const options = optionsProp ?? queryOptions;
    const resolvedOptions = useMemo(() => {
        if (!noneLabel) return options;
        return options.map((option) =>
            option.value == null ? { ...option, label: noneLabel } : option
        );
    }, [noneLabel, options]);
    const loading = loadingProp ?? queryLoading;
    const showLoading = loadingProp !== undefined ? loadingProp : loading && resolvedOptions.length === 0;
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<PartyLedgerOption[]>([]);
    const pendingOpenRef = useRef(false);
    const resolvedOpenOnFocus = openOnFocus ?? true;

    const selectedOption = useMemo(
        () =>
            value == null
                ? null
                : resolvedOptions.find((option) => Number(option.value) === Number(value)) ?? null,
        [resolvedOptions, value]
    );

    useEffect(() => {
        if (!query) {
            setSuggestions((prev) =>
                areOptionArraysEqual(prev, resolvedOptions) ? prev : resolvedOptions
            );
        }
    }, [resolvedOptions, query]);

    useEffect(() => {
        if (loading) return;
        if (!pendingOpenRef.current) return;
        pendingOpenRef.current = false;
        window.setTimeout(() => {
            autoCompleteRef.current?.show?.();
        }, 0);
    }, [loading, resolvedOptions]);

    const filterOptions = (input: string) => {
        const needle = input.trim().toLowerCase();
        if (!needle) return resolvedOptions;
        return resolvedOptions.filter((option) => option.label.toLowerCase().includes(needle));
    };

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        const nextQuery = event.query ?? '';
        setQuery(nextQuery);
        setSuggestions(filterOptions(nextQuery));
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as PartyLedgerOption | string | null;
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
            const match =
                suggestions.find((option) => option.label.toLowerCase() === trimmed.toLowerCase()) ??
                options.find((option) => option.label.toLowerCase() === trimmed.toLowerCase()) ??
                null;
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
        pendingOpenRef.current = false;
        setQuery('');
    };

    const handleFocus = (event: React.FocusEvent<HTMLSpanElement>) => {
        onFocus?.(event);
        if (!resolvedOpenOnFocus) return;
        pendingOpenRef.current = true;
        if (!loading && resolvedOptions.length === 0) {
            refetch?.();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== 'Enter') return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) {
            const highlighted = overlay?.querySelector('li[data-p-highlight="true"]') as HTMLElement | null;
            const indexAttr = highlighted?.getAttribute('data-index') ?? highlighted?.getAttribute('index');
            const index = indexAttr ? Number(indexAttr) : NaN;
            const highlightedOption = Number.isFinite(index) ? suggestions[index] : null;
            const fallbackOption = !highlightedOption && suggestions.length > 0 ? suggestions[0] : null;
            const optionToSelect = highlightedOption ?? fallbackOption;
            if (optionToSelect) {
                event.preventDefault();
                event.stopPropagation();
                setQuery('');
                onChange(optionToSelect.value ?? null, optionToSelect);
                autoCompleteRef.current?.hide?.();
                if (onSelectNext) {
                    window.setTimeout(onSelectNext, 0);
                }
                return;
            }
        }
        if (!query.trim() && selectedOption) {
            event.preventDefault();
            event.stopPropagation();
            setQuery('');
            onChange(selectedOption.value ?? null, selectedOption);
            return;
        }
        if (onSelectNext) {
            event.preventDefault();
            event.stopPropagation();
            window.setTimeout(onSelectNext, 0);
        }
    };

    const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key !== 'Enter') return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) {
            const highlighted = overlay?.querySelector('li[data-p-highlight="true"]') as HTMLElement | null;
            const indexAttr = highlighted?.getAttribute('data-index') ?? highlighted?.getAttribute('index');
            const index = indexAttr ? Number(indexAttr) : NaN;
            const highlightedOption = Number.isFinite(index) ? suggestions[index] : null;
            const fallbackOption = !highlightedOption && suggestions.length > 0 ? suggestions[0] : null;
            const optionToSelect = highlightedOption ?? fallbackOption;
            if (optionToSelect) {
                event.preventDefault();
                event.stopPropagation();
                setQuery('');
                onChange(optionToSelect.value ?? null, optionToSelect);
                autoCompleteRef.current?.hide?.();
                if (onSelectNext) {
                    window.setTimeout(onSelectNext, 0);
                }
                return;
            }
        } else if (query.trim() && suggestions.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            const optionToSelect = suggestions[0];
            setQuery('');
            onChange(optionToSelect.value ?? null, optionToSelect);
            if (onSelectNext) {
                window.setTimeout(onSelectNext, 0);
            }
        }
    };

    useEffect(() => {
        const input = autoCompleteRef.current?.getInput?.();
        if (!input) return;
        const handleInputKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            const overlay = autoCompleteRef.current?.getOverlay?.();
            const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
            if (process.env.NODE_ENV !== 'production') {
                console.debug('[LedgerAutoComplete] enter key', {
                    overlayVisible,
                    suggestionsCount: suggestions.length,
                    query
                });
            }
            if (!overlayVisible) return;
            const highlighted = overlay?.querySelector('li[data-p-highlight="true"]') as HTMLElement | null;
            const indexAttr = highlighted?.getAttribute('data-index') ?? highlighted?.getAttribute('index');
            const index = indexAttr ? Number(indexAttr) : NaN;
            const highlightedOption = Number.isFinite(index) ? suggestions[index] : null;
            if (process.env.NODE_ENV !== 'production') {
                console.debug('[LedgerAutoComplete] highlighted', {
                    index,
                    hasHighlighted: Boolean(highlighted),
                    label: highlightedOption?.label,
                    value: highlightedOption?.value
                });
            }
            if (!highlightedOption) return;
            event.preventDefault();
            event.stopPropagation();
            setQuery('');
            onChange(highlightedOption.value ?? null, highlightedOption);
            autoCompleteRef.current?.hide?.();
            if (onSelectNext) {
                window.setTimeout(onSelectNext, 0);
            }
        };
        input.addEventListener('keydown', handleInputKeyDown, true);
        return () => {
            input.removeEventListener('keydown', handleInputKeyDown, true);
        };
    }, [onChange, onSelectNext, suggestions]);

    const handleDropdownClick = (event: any) => {
        onDropdownClick?.(event);
        pendingOpenRef.current = true;
        setQuery('');
        setSuggestions(resolvedOptions);
        if (!loading && resolvedOptions.length === 0) {
            refetch?.();
        }
    };

    const displayValue = query.length ? query : selectedOption;
    const resolvedPlaceholder = showLoading
        ? loadingPlaceholder ?? 'Loading parties...'
        : placeholder ?? 'Select party';

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

PartyLedgerAutoCompleteImpl.displayName = 'PartyLedgerAutoCompleteImpl';

const LedgerByPurposeAutoCompleteImpl = forwardRef<AutoComplete, LedgerByPurposeAutoCompleteProps>((
    {
        value,
        onChange,
        purpose,
        ledgerGroupId,
        areaId,
        areaIds,
        excludeLedgerId,
        includeNone,
        limit,
        search,
        options: optionsProp,
        loading: loadingProp,
        loadingPlaceholder,
        onSelectNext,
        placeholder,
        onBlur,
        onFocus,
        onKeyDown,
        onDropdownClick,
        selectedOption: selectedOptionProp,
        disabled,
        readOnly,
        skip,
        variant: _variant,
        ...rest
    },
    ref
) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<LedgerOption[]>([]);
    const [selectedFallback, setSelectedFallback] = useState<LedgerOption | null>(null);
    const suppressStringChangeRef = useRef(false);
    const { options: queryOptions, loading: queryLoading } = useLedgerOptionsByPurpose({
        purpose,
        ledgerGroupId,
        areaId,
        areaIds,
        excludeLedgerId,
        includeNone,
        limit,
        search: search ?? (query.trim() ? query.trim() : null),
        skip: skip || Boolean(optionsProp)
    });

    const options = optionsProp ?? queryOptions;
    const loading = loadingProp ?? queryLoading;

    const selectedOption = useMemo(() => {
        if (value == null) return null;
        const fromOptions = options.find((option) => Number(option.value) === Number(value)) ?? null;
        if (fromOptions) return fromOptions;
        if (selectedFallback && Number(selectedFallback.value) === Number(value)) return selectedFallback;
        return null;
    }, [options, selectedFallback, value]);

    useEffect(() => {
        if (!query) {
            setSuggestions((prev) => (areOptionArraysEqual(prev, options) ? prev : options));
            return;
        }
        const filtered = options.filter((option) =>
            option.label.toLowerCase().includes(query.trim().toLowerCase())
        );
        setSuggestions((prev) => (areOptionArraysEqual(prev, filtered) ? prev : filtered));
    }, [options, query]);

    useEffect(() => {
        if (!selectedOptionProp || value == null) return;
        if (Number(selectedOptionProp.value) !== Number(value)) return;
        setSelectedFallback(selectedOptionProp);
    }, [selectedOptionProp, value]);

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        const nextQuery = event.query ?? '';
        setQuery(nextQuery);
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as LedgerOption | string | null;
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[LedgerAutoComplete] onChange', {
                type: typeof nextValue,
                value: typeof nextValue === 'string' ? nextValue : nextValue?.value,
                label: typeof nextValue === 'string' ? nextValue : nextValue?.label
            });
        }
        if (nextValue == null) {
            setQuery('');
            setSelectedFallback(null);
            onChange(null, null);
            return;
        }
        if (typeof nextValue === 'string') {
            if (suppressStringChangeRef.current) {
                if (process.env.NODE_ENV !== 'production') {
                    console.debug('[LedgerAutoComplete] suppress string change');
                }
                suppressStringChangeRef.current = false;
                setQuery('');
                return;
            }
            setQuery(nextValue);
            if (!nextValue.trim()) {
                onChange(null, null);
            }
            return;
        }
        setQuery('');
        setSelectedFallback(nextValue);
        onChange(nextValue.value ?? null, nextValue);
        if (onSelectNext) {
            window.setTimeout(onSelectNext, 0);
        }
    };

    const handleSelect = (event: any) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[LedgerAutoComplete] onSelect', event?.value);
        }
        handleChange(event as AutoCompleteChangeEvent);
    };

    const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
        onBlur?.(event);
        setQuery('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[LedgerAutoComplete] onKeyDown', {
                key: event.key,
                query,
                suggestionsCount: suggestions.length
            });
        }
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onSelectNext) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) {
            const hasTypedQuery = query.trim().length > 0;
            if (!selectedOption || hasTypedQuery) return;
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

    const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[LedgerAutoComplete] onKeyDownCapture', {
                key: event.key,
                query,
                suggestionsCount: suggestions.length
            });
        }
        if (event.key !== 'Enter') return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) {
            const highlighted =
                (overlay?.querySelector('li[data-p-highlight="true"]') as HTMLElement | null) ??
                (overlay?.querySelector('li.p-highlight') as HTMLElement | null) ??
                (overlay?.querySelector('li[aria-selected="true"]') as HTMLElement | null);
            let index = NaN;
            const indexAttr = highlighted?.getAttribute('data-index') ?? highlighted?.getAttribute('index');
            if (indexAttr) {
                index = Number(indexAttr);
            } else if (highlighted) {
                const items = Array.from(overlay?.querySelectorAll('li.p-autocomplete-item') ?? []);
                index = items.indexOf(highlighted);
            }
            const highlightedOption = Number.isFinite(index) ? suggestions[index] : null;
            const optionToSelect = highlightedOption ?? (suggestions.length > 0 ? suggestions[0] : null);
            if (process.env.NODE_ENV !== 'production') {
                console.debug('[LedgerAutoComplete] enter selection', {
                    overlayVisible,
                    highlightedFound: Boolean(highlighted),
                    index,
                    label: highlightedOption?.label,
                    value: highlightedOption?.value
                });
            }
            if (optionToSelect) {
                event.preventDefault();
                event.stopPropagation();
                suppressStringChangeRef.current = true;
                handleChange({ value: optionToSelect } as AutoCompleteChangeEvent);
                autoCompleteRef.current?.hide?.();
                return;
            }
        } else if (query.trim() && suggestions.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            const optionToSelect = suggestions[0];
            suppressStringChangeRef.current = true;
            handleChange({ value: optionToSelect } as AutoCompleteChangeEvent);
            autoCompleteRef.current?.hide?.();
        }
    };

    const handleDropdownClick = (event: any) => {
        onDropdownClick?.(event);
        setQuery('');
        setSuggestions(options);
    };

    const displayValue = query.length ? query : selectedOption;
    const resolvedPlaceholder = loading
        ? loadingPlaceholder ?? 'Loading ledgers...'
        : placeholder ?? 'Select ledger';

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
        />
    );
});

LedgerByPurposeAutoCompleteImpl.displayName = 'LedgerByPurposeAutoCompleteImpl';

const LedgerAutoComplete = forwardRef<AutoComplete, LedgerAutoCompleteProps>((props, ref) => {
    if (props.variant === 'party') {
        return <PartyLedgerAutoCompleteImpl {...props} ref={ref} />;
    }

    if (props.variant === 'purpose') {
        return <LedgerByPurposeAutoCompleteImpl {...props} ref={ref} />;
    }

    const {
        onSelectNext,
        onChange,
        onKeyDown,
        onDropdownClick,
        onShow,
        ledgerGroupId,
        ledgerGroupIds,
        variant,
        debug,
        debugLabel,
        field,
        suggestions,
        value,
        ...rest
    } = props as ManualLedgerAutoCompleteProps;
    const resolvedDebugLabel = debugLabel ?? 'LedgerAutoComplete';
    const resolvedGroupIds = useMemo(() => {
        if (Array.isArray(ledgerGroupIds) && ledgerGroupIds.length > 0) {
            const unique = Array.from(
                new Set(
                    ledgerGroupIds
                        .map((id) => (id != null ? Number(id) : NaN))
                        .filter((id) => Number.isFinite(id) && id > 0)
                )
            );
            return unique;
        }
        if (ledgerGroupId != null && Number(ledgerGroupId) > 0) {
            return [Number(ledgerGroupId)];
        }
        return [];
    }, [ledgerGroupId, ledgerGroupIds]);

    const resolvedSuggestions = useMemo(() => {
        if (!Array.isArray(suggestions) || resolvedGroupIds.length === 0) {
            return suggestions;
        }
        const groupSet = new Set(resolvedGroupIds.map((id) => Number(id)));
        return suggestions.filter((item: any) => {
            if (!item || typeof item !== 'object') return true;
            const rawGroupId = item.ledgerGroupId ?? item.groupId ?? item.ledger_group_id;
            if (rawGroupId == null) return true;
            const groupId = Number(rawGroupId);
            return Number.isFinite(groupId) && groupSet.has(groupId);
        });
    }, [resolvedGroupIds, suggestions]);

    const displaySuggestions = useMemo(() => {
        if (!Array.isArray(resolvedSuggestions)) return resolvedSuggestions;
        let changed = false;
        const mapped = resolvedSuggestions.map((item: any) => {
            if (!item || typeof item !== 'object') return item;
            const label = typeof item.label === 'string' ? item.label.trim() : '';
            if (label) return item;
            const fallback = item.name ?? item.ledgerName ?? item.value ?? item.ledgerId ?? '';
            if (fallback === '' || fallback == null) return item;
            changed = true;
            return { ...item, label: String(fallback) };
        });
        return changed ? mapped : resolvedSuggestions;
    }, [resolvedSuggestions]);

    const resolvedField = useMemo(() => {
        if (field) return field;
        const items = Array.isArray(displaySuggestions) ? displaySuggestions : [];
        const first = items.find((item) => item != null);
        if (first && typeof first === 'object' && typeof (first as any).label === 'string') {
            return 'label';
        }
        if (first && typeof first === 'object' && typeof (first as any).name === 'string') {
            return 'name';
        }
        return field;
    }, [displaySuggestions, field]);

    useEffect(() => {
        if (!debug) return;
        if (typeof window === 'undefined') return;
        const items = Array.isArray(resolvedSuggestions) ? resolvedSuggestions : [];
        const ledgerGroupIds = Array.from(
            new Set(items.map((item: any) => item?.ledgerGroupId).filter((id: any) => id != null))
        ).slice(0, 12);
        const ledgerIds = Array.from(
            new Set(items.map((item: any) => item?.ledgerId ?? item?.value).filter((id: any) => id != null))
        ).slice(0, 12);
        console.debug(`[${resolvedDebugLabel}] suggestions`, {
            count: items.length,
            ledgerGroupIds,
            ledgerIds,
            value
        });
    }, [debug, resolvedDebugLabel, resolvedSuggestions, value]);

    const handleChange = (event: AutoCompleteChangeEvent) => {
        if (debug) {
            console.debug(`[${resolvedDebugLabel}] change`, {
                value: event.value,
                suggestionsCount: Array.isArray(resolvedSuggestions) ? resolvedSuggestions.length : 0
            });
        }
        onChange?.(event);
        const nextValue = event.value as unknown;
        if (!onSelectNext) return;
        if (nextValue && typeof nextValue !== 'string') {
            window.setTimeout(onSelectNext, 0);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onSelectNext) return;
        const target = event.target as HTMLElement | null;
        if (target?.tagName?.toLowerCase() === 'input') return;
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(onSelectNext, 0);
    };

    const handleDropdownClick = (event: any) => {
        if (debug) {
            console.debug(`[${resolvedDebugLabel}] dropdown`, {
                query: event?.query,
                suggestionsCount: Array.isArray(resolvedSuggestions) ? resolvedSuggestions.length : 0
            });
        }
        onDropdownClick?.(event);
    };

    const handleShow = () => {
        if (debug) {
            console.debug(`[${resolvedDebugLabel}] show`, {
                suggestionsCount: Array.isArray(displaySuggestions) ? displaySuggestions.length : 0
            });
        }
        onShow?.();
    };

    return (
        <AppAutoComplete
            {...rest}
            ref={ref}
            suggestions={displaySuggestions}
            value={value}
            field={resolvedField}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onDropdownClick={handleDropdownClick}
            onShow={handleShow}
        />
    );
});

LedgerAutoComplete.displayName = 'LedgerAutoComplete';

export default LedgerAutoComplete;
