import React, {
    forwardRef,
    useCallback,
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
import LedgerCurrentBalanceInline, { type LedgerBalanceSeverity } from '@/components/LedgerCurrentBalanceInline';
import { usePartyLedgerOptions, type PartyLedgerOption } from '@/lib/accounts/partyLedger';
import { useLedgerOptionsByPurpose, type LedgerOption } from '@/lib/accounts/ledgerOptions';

type LedgerAutoCompleteBalanceProps = {
    showCurrentBalanceInline?: boolean;
    currentBalanceLabel?: string | null;
    currentBalanceSeverity?: LedgerBalanceSeverity;
    currentBalanceTooltip?: string | null;
};

type ManualLedgerAutoCompleteProps = React.ComponentProps<typeof AppAutoComplete> &
    LedgerAutoCompleteBalanceProps & {
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
> &
    LedgerAutoCompleteBalanceProps & {
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
> &
    LedgerAutoCompleteBalanceProps & {
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
    loadingWhenPanelOpenOnly?: boolean;
    onSelectNext?: () => void;
    onPreviewOptionChange?: (option: LedgerOption | null) => void;
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

const normalizeLabel = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';
const resolveSearchText = (option: OptionComparable) => {
    const label = normalizeLabel(option?.label ?? null);
    const address = normalizeLabel(option?.address ?? null);
    if (!label) return address;
    if (!address) return label;
    return `${label} ${address}`;
};

const findExactLabelMatch = <T extends OptionComparable>(
    primary: T[],
    secondary: T[],
    input: string
): T | null => {
    const needle = normalizeLabel(input);
    if (!needle) return null;
    const findIn = (items: T[]) =>
        items.find((option) => {
            const label = normalizeLabel(option?.label ?? null);
            const address = normalizeLabel(option?.address ?? null);
            const searchText = resolveSearchText(option);
            return label === needle || address === needle || searchText === needle;
        }) ?? null;
    return findIn(primary) ?? findIn(secondary);
};

const findPrefixLabelMatch = <T extends OptionComparable>(
    primary: T[],
    secondary: T[],
    input: string
): T | null => {
    const needle = input.toLowerCase();
    if (!needle) return null;
    const findIn = (items: T[]) =>
        items.find((option) => {
            const label = normalizeLabel(option?.label ?? null);
            const address = normalizeLabel(option?.address ?? null);
            const searchText = resolveSearchText(option);
            return label.startsWith(needle) || address.startsWith(needle) || searchText.startsWith(needle);
        }) ?? null;
    return findIn(primary) ?? findIn(secondary);
};

const filterAndRankOptions = <T extends OptionComparable>(options: T[], input: string): T[] => {
    const needle = normalizeLabel(input);
    if (!needle) return options;
    const prefixMatches: T[] = [];
    const containsMatches: T[] = [];
    options.forEach((option) => {
        const label = normalizeLabel(option?.label ?? null);
        const address = normalizeLabel(option?.address ?? null);
        const searchText = resolveSearchText(option);
        if (!searchText.includes(needle)) return;
        if (label.startsWith(needle) || address.startsWith(needle) || searchText.startsWith(needle)) {
            prefixMatches.push(option);
            return;
        }
        containsMatches.push(option);
    });
    return [...prefixMatches, ...containsMatches];
};

function findHighlightedSuggestion<T>(
    overlay: Element | null | undefined,
    suggestions: T[]
): T | null {
    if (!overlay || suggestions.length === 0) return null;
    const highlighted =
        (overlay.querySelector('li[data-p-highlight="true"]') as HTMLElement | null) ??
        (overlay.querySelector('li.p-highlight') as HTMLElement | null) ??
        (overlay.querySelector('li[aria-selected="true"]') as HTMLElement | null);
    if (!highlighted) return null;
    const indexAttr = highlighted.getAttribute('data-index') ?? highlighted.getAttribute('index');
    let index = indexAttr ? Number(indexAttr) : NaN;
    if (!Number.isFinite(index)) {
        const items = Array.from(overlay.querySelectorAll('li.p-autocomplete-item'));
        index = items.indexOf(highlighted);
    }
    return Number.isFinite(index) ? suggestions[index] ?? null : null;
}

const resolveFieldData = (source: Record<string, unknown>, fieldPath: string): unknown => {
    if (!fieldPath) return undefined;
    const segments = fieldPath.split('.');
    let current: unknown = source;
    for (const segment of segments) {
        if (!current || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
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
        showCurrentBalanceInline,
        currentBalanceLabel,
        currentBalanceSeverity,
        currentBalanceTooltip,
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
    const [displayQuery, setDisplayQuery] = useState('');
    const [suggestions, setSuggestions] = useState<PartyLedgerOption[]>([]);
    const pendingOpenRef = useRef(false);
    const pendingInlineSelectionRef = useRef<{ start: number; end: number } | null>(null);
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

    const applyPendingInlineSelection = useCallback(() => {
        if (typeof window === 'undefined') return;
        const pending = pendingInlineSelectionRef.current;
        if (!pending) return;
        const input = autoCompleteRef.current?.getInput?.();
        if (!input || document.activeElement !== input) {
            pendingInlineSelectionRef.current = null;
            return;
        }
        window.requestAnimationFrame(() => {
            const nextPending = pendingInlineSelectionRef.current;
            const nextInput = autoCompleteRef.current?.getInput?.();
            if (!nextPending || !nextInput || document.activeElement !== nextInput) {
                pendingInlineSelectionRef.current = null;
                return;
            }
            const safeStart = Math.max(0, Math.min(nextPending.start, nextInput.value.length));
            const safeEnd = Math.max(safeStart, Math.min(nextPending.end, nextInput.value.length));
            nextInput.setSelectionRange(safeStart, safeEnd);
            pendingInlineSelectionRef.current = null;
        });
    }, []);

    useEffect(() => {
        applyPendingInlineSelection();
    }, [applyPendingInlineSelection, displayQuery]);

    useEffect(() => {
        if (loading) return;
        if (!pendingOpenRef.current) return;
        pendingOpenRef.current = false;
        window.setTimeout(() => {
            autoCompleteRef.current?.show?.();
        }, 0);
    }, [loading, resolvedOptions]);

    const filterOptions = (input: string) => filterAndRankOptions(resolvedOptions, input);

    const commitSelection = useCallback(
        (option: PartyLedgerOption, advanceToNext = true) => {
            setQuery('');
            setDisplayQuery('');
            pendingInlineSelectionRef.current = null;
            onChange(option.value ?? null, option);
            if (advanceToNext && onSelectNext) {
                window.setTimeout(onSelectNext, 0);
            }
        },
        [onChange, onSelectNext]
    );

    const resolveEnterSelection = useCallback(
        (overlay: Element | null | undefined) => {
            const highlightedOption = findHighlightedSuggestion(overlay, suggestions);
            if (highlightedOption) return highlightedOption;
            const inlineMatch = findExactLabelMatch(suggestions, resolvedOptions, displayQuery);
            if (inlineMatch) return inlineMatch;
            const typedMatch = findExactLabelMatch(suggestions, resolvedOptions, query);
            return typedMatch ?? (suggestions.length > 0 ? suggestions[0] : null);
        },
        [displayQuery, query, resolvedOptions, suggestions]
    );

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        const nextQuery = event.query ?? '';
        const filtered = filterOptions(nextQuery);
        setQuery(nextQuery);
        setSuggestions(filtered);
        if (!nextQuery) {
            pendingInlineSelectionRef.current = null;
            setDisplayQuery('');
            return;
        }
        const prefixMatch = findPrefixLabelMatch(filtered, resolvedOptions, nextQuery);
        const matchedLabel = typeof prefixMatch?.label === 'string' ? prefixMatch.label : null;
        if (matchedLabel && matchedLabel.length > nextQuery.length) {
            setDisplayQuery(matchedLabel);
            pendingInlineSelectionRef.current = {
                start: nextQuery.length,
                end: matchedLabel.length
            };
            return;
        }
        pendingInlineSelectionRef.current = null;
        setDisplayQuery(nextQuery);
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as PartyLedgerOption | string | null;
        if (nextValue == null) {
            setQuery('');
            setDisplayQuery('');
            pendingInlineSelectionRef.current = null;
            onChange(null, null);
            return;
        }
        if (typeof nextValue === 'string') {
            const trimmed = nextValue.trim();
            if (!trimmed) {
                setQuery('');
                setDisplayQuery('');
                pendingInlineSelectionRef.current = null;
                onChange(null, null);
                return;
            }
            const match = findExactLabelMatch(suggestions, options, trimmed);
            if (match) {
                commitSelection(match);
                return;
            }
            setQuery(nextValue);
            setDisplayQuery(nextValue);
            pendingInlineSelectionRef.current = null;
            return;
        }
        commitSelection(nextValue);
    };

    const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
        onBlur?.(event);
        pendingOpenRef.current = false;
        setQuery('');
        setDisplayQuery('');
        pendingInlineSelectionRef.current = null;
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
            const optionToSelect = resolveEnterSelection(overlay);
            if (optionToSelect) {
                event.preventDefault();
                event.stopPropagation();
                commitSelection(optionToSelect);
                autoCompleteRef.current?.hide?.();
                return;
            }
        }
        if (!query.trim() && selectedOption) {
            event.preventDefault();
            event.stopPropagation();
            commitSelection(selectedOption, false);
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
            const optionToSelect = resolveEnterSelection(overlay);
            if (optionToSelect) {
                event.preventDefault();
                event.stopPropagation();
                commitSelection(optionToSelect);
                autoCompleteRef.current?.hide?.();
                return;
            }
        } else if (query.trim() && suggestions.length > 0) {
            const optionToSelect = resolveEnterSelection(null);
            if (!optionToSelect) return;
            event.preventDefault();
            event.stopPropagation();
            commitSelection(optionToSelect);
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
            const optionToSelect = resolveEnterSelection(overlay);
            if (process.env.NODE_ENV !== 'production') {
                console.debug('[LedgerAutoComplete] highlighted', {
                    label: optionToSelect?.label,
                    value: optionToSelect?.value
                });
            }
            if (!optionToSelect) return;
            event.preventDefault();
            event.stopPropagation();
            commitSelection(optionToSelect);
            autoCompleteRef.current?.hide?.();
        };
        input.addEventListener('keydown', handleInputKeyDown, true);
        return () => {
            input.removeEventListener('keydown', handleInputKeyDown, true);
        };
    }, [commitSelection, query, resolveEnterSelection, suggestions]);

    const handleDropdownClick = (event: any) => {
        onDropdownClick?.(event);
        pendingOpenRef.current = true;
        setQuery('');
        setDisplayQuery('');
        pendingInlineSelectionRef.current = null;
        setSuggestions(resolvedOptions);
        if (!loading && resolvedOptions.length === 0) {
            refetch?.();
        }
    };

    const displayValue = displayQuery.length ? displayQuery : selectedOption;
    const resolvedPlaceholder = showLoading
        ? loadingPlaceholder ?? 'Loading parties...'
        : placeholder ?? 'Select party';

    return (
        <LedgerCurrentBalanceInline
            show={Boolean(showCurrentBalanceInline)}
            label={currentBalanceLabel}
            severity={currentBalanceSeverity}
            tooltip={currentBalanceTooltip}
        >
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
                inlineTypeahead={false}
                autoHighlight
            />
        </LedgerCurrentBalanceInline>
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
        loadingWhenPanelOpenOnly,
        onSelectNext,
        placeholder,
        onBlur,
        onFocus,
        onKeyDown,
        onDropdownClick,
        onShow,
        onHide,
        selectedOption: selectedOptionProp,
        onPreviewOptionChange,
        disabled,
        readOnly,
        showCurrentBalanceInline,
        currentBalanceLabel,
        currentBalanceSeverity,
        currentBalanceTooltip,
        skip,
        variant: _variant,
        ...rest
    },
    ref
) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const [query, setQuery] = useState('');
    const [displayQuery, setDisplayQuery] = useState('');
    const [suggestions, setSuggestions] = useState<LedgerOption[]>([]);
    const [selectedFallback, setSelectedFallback] = useState<LedgerOption | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const suppressStringChangeRef = useRef(false);
    const advanceOnSelectionRef = useRef(false);
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
    const hasVisibleSuggestions = suggestions.length > 0;
    const resolvedLoading =
        (loadingWhenPanelOpenOnly ? loading && isPanelOpen : loading) && !hasVisibleSuggestions;

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
        const filtered = filterAndRankOptions(options, query);
        setSuggestions((prev) => (areOptionArraysEqual(prev, filtered) ? prev : filtered));
    }, [options, query]);

    useEffect(() => {
        if (!selectedOptionProp || value == null) return;
        if (Number(selectedOptionProp.value) !== Number(value)) return;
        setSelectedFallback(selectedOptionProp);
    }, [selectedOptionProp, value]);

    const resolveEnterSelection = useCallback(
        (overlay: Element | null | undefined) => {
            const highlightedOption = findHighlightedSuggestion(overlay, suggestions);
            if (highlightedOption) return highlightedOption;
            return (
                findExactLabelMatch(suggestions, options, displayQuery) ??
                findExactLabelMatch(suggestions, options, query) ??
                (suggestions.length > 0 ? suggestions[0] : null)
            );
        },
        [displayQuery, options, query, suggestions]
    );

    const syncPreviewFromHighlight = useCallback(() => {
        if (!onPreviewOptionChange) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (!overlayVisible) {
            onPreviewOptionChange(null);
            return;
        }
        const highlightedOption = findHighlightedSuggestion(overlay, suggestions);
        onPreviewOptionChange(highlightedOption ?? selectedOption ?? null);
    }, [onPreviewOptionChange, selectedOption, suggestions]);

    useEffect(() => {
        if (!onPreviewOptionChange) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (!overlayVisible) return;
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(syncPreviewFromHighlight);
        }
    }, [onPreviewOptionChange, suggestions, selectedOption, syncPreviewFromHighlight]);

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        const nextQuery = event.query ?? '';
        setQuery(nextQuery);
        setDisplayQuery(nextQuery);
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as LedgerOption | string | null;
        const shouldAdvanceOnSelection = advanceOnSelectionRef.current;
        advanceOnSelectionRef.current = false;
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[LedgerAutoComplete] onChange', {
                type: typeof nextValue,
                value: typeof nextValue === 'string' ? nextValue : nextValue?.value,
                label: typeof nextValue === 'string' ? nextValue : nextValue?.label
            });
        }
        if (nextValue == null) {
            setQuery('');
            setDisplayQuery('');
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
                setDisplayQuery('');
                return;
            }
            const trimmed = nextValue.trim();
            setQuery(nextValue);
            setDisplayQuery(nextValue);
            if (!trimmed) {
                onChange(null, null);
                setSelectedFallback(null);
                return;
            }
            const match = findExactLabelMatch(suggestions, options, trimmed);
            if (match) {
                setQuery('');
                setDisplayQuery('');
                setSelectedFallback(match);
                onChange(match.value ?? null, match);
                if (shouldAdvanceOnSelection && onSelectNext) {
                    window.setTimeout(onSelectNext, 0);
                }
            }
            return;
        }
        setQuery('');
        setDisplayQuery('');
        setSelectedFallback(nextValue);
        onChange(nextValue.value ?? null, nextValue);
        if (shouldAdvanceOnSelection && onSelectNext) {
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
        setIsPanelOpen(false);
        setQuery('');
        setDisplayQuery('');
        advanceOnSelectionRef.current = false;
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
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && onPreviewOptionChange && typeof window !== 'undefined') {
            window.requestAnimationFrame(syncPreviewFromHighlight);
        }
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
        if (!selectedOption) {
            const optionToSelect = query.trim().length > 0 ? resolveEnterSelection(null) : null;
            if (!optionToSelect) return;
            event.preventDefault();
            event.stopPropagation();
            suppressStringChangeRef.current = true;
            advanceOnSelectionRef.current = true;
            handleChange({ value: optionToSelect } as AutoCompleteChangeEvent);
            autoCompleteRef.current?.hide?.();
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
            const hasTypedQuery = query.trim().length > 0;
            const highlightedOption = findHighlightedSuggestion(overlay, suggestions);
            if (!hasTypedQuery && selectedOption) {
                event.preventDefault();
                event.stopPropagation();
                autoCompleteRef.current?.hide?.();
                if (onSelectNext) {
                    window.setTimeout(onSelectNext, 0);
                }
                return;
            }

            const optionToSelect = resolveEnterSelection(overlay);
            if (process.env.NODE_ENV !== 'production') {
                console.debug('[LedgerAutoComplete] enter selection', {
                    overlayVisible,
                    highlightedFound: Boolean(highlightedOption),
                    label: optionToSelect?.label,
                    value: optionToSelect?.value
                });
            }
            if (optionToSelect) {
                event.preventDefault();
                event.stopPropagation();
                suppressStringChangeRef.current = true;
                advanceOnSelectionRef.current = true;
                handleChange({ value: optionToSelect } as AutoCompleteChangeEvent);
                autoCompleteRef.current?.hide?.();
                return;
            }
        } else if (query.trim() && suggestions.length > 0) {
            const optionToSelect = resolveEnterSelection(null);
            if (!optionToSelect) return;
            event.preventDefault();
            event.stopPropagation();
            suppressStringChangeRef.current = true;
            advanceOnSelectionRef.current = true;
            handleChange({ value: optionToSelect } as AutoCompleteChangeEvent);
            autoCompleteRef.current?.hide?.();
        }
    };

    const handleDropdownClick = (event: any) => {
        onDropdownClick?.(event);
        setQuery('');
        setDisplayQuery('');
        setSuggestions(options);
    };

    const handleShow = () => {
        setIsPanelOpen(true);
        onShow?.();
        if (!onPreviewOptionChange) return;
        onPreviewOptionChange(selectedOption ?? null);
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(syncPreviewFromHighlight);
        }
    };

    const handleHide = () => {
        setIsPanelOpen(false);
        onHide?.();
        onPreviewOptionChange?.(null);
    };

    const displayValue = displayQuery.length ? displayQuery : selectedOption;
    const resolvedPlaceholder = resolvedLoading
        ? loadingPlaceholder ?? 'Loading ledgers...'
        : placeholder ?? 'Select ledger';

    return (
        <LedgerCurrentBalanceInline
            show={Boolean(showCurrentBalanceInline)}
            label={currentBalanceLabel}
            severity={currentBalanceSeverity}
            tooltip={currentBalanceTooltip}
        >
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
                onShow={handleShow}
                onHide={handleHide}
                field="label"
                loading={resolvedLoading}
                showLoadingIcon
                showEmptyMessage
                placeholder={resolvedPlaceholder}
                disabled={disabled}
                readOnly={readOnly}
                inlineTypeahead={false}
                autoHighlight
                highlightSelectedOnShow={false}
            />
        </LedgerCurrentBalanceInline>
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
        completeMethod,
        onKeyDown,
        onBlur,
        onDropdownClick,
        onShow,
        ledgerGroupId,
        ledgerGroupIds,
        variant,
        debug,
        debugLabel,
        showCurrentBalanceInline,
        currentBalanceLabel,
        currentBalanceSeverity,
        currentBalanceTooltip,
        field,
        suggestions,
        value,
        ...rest
    } = props as ManualLedgerAutoCompleteProps;
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);
    const resolvedDebugLabel = debugLabel ?? 'LedgerAutoComplete';
    const [manualQuery, setManualQuery] = useState('');
    const [manualDisplayValue, setManualDisplayValue] = useState('');
    const pendingInlineSelectionRef = useRef<{ start: number; end: number } | null>(null);
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

    const applyPendingInlineSelection = useCallback(() => {
        if (typeof window === 'undefined') return;
        const pending = pendingInlineSelectionRef.current;
        if (!pending) return;
        const input = autoCompleteRef.current?.getInput?.();
        if (!input || document.activeElement !== input) {
            pendingInlineSelectionRef.current = null;
            return;
        }
        window.requestAnimationFrame(() => {
            const nextPending = pendingInlineSelectionRef.current;
            const nextInput = autoCompleteRef.current?.getInput?.();
            if (!nextPending || !nextInput || document.activeElement !== nextInput) {
                pendingInlineSelectionRef.current = null;
                return;
            }
            const safeStart = Math.max(0, Math.min(nextPending.start, nextInput.value.length));
            const safeEnd = Math.max(safeStart, Math.min(nextPending.end, nextInput.value.length));
            nextInput.setSelectionRange(safeStart, safeEnd);
            pendingInlineSelectionRef.current = null;
        });
    }, []);

    useEffect(() => {
        applyPendingInlineSelection();
    }, [applyPendingInlineSelection, manualDisplayValue]);

    const syncManualInlineCompletion = useCallback(
        (rawInput: string) => {
            const nextQuery = rawInput ?? '';
            setManualDisplayValue(nextQuery);
            pendingInlineSelectionRef.current = null;
        },
        []
    );

    useEffect(() => {
        if (typeof value !== 'string') return;
        if (!manualQuery) return;
        syncManualInlineCompletion(manualQuery);
    }, [manualQuery, syncManualInlineCompletion, value]);

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
        const nextValue = event.value as unknown;
        if (typeof nextValue === 'string') {
            setManualQuery(nextValue);
            syncManualInlineCompletion(nextValue);
        } else {
            setManualQuery('');
            setManualDisplayValue('');
            pendingInlineSelectionRef.current = null;
        }
        onChange?.(event);
        if (!onSelectNext) return;
        if (nextValue && typeof nextValue !== 'string') {
            window.setTimeout(onSelectNext, 0);
        }
    };

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        completeMethod?.(event);
        const nextQuery = event.query ?? '';
        setManualQuery(nextQuery);
        syncManualInlineCompletion(nextQuery);
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
        setManualQuery('');
        setManualDisplayValue('');
        pendingInlineSelectionRef.current = null;
        onDropdownClick?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
        onBlur?.(event);
        setManualQuery('');
        setManualDisplayValue('');
        pendingInlineSelectionRef.current = null;
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
        <LedgerCurrentBalanceInline
            show={Boolean(showCurrentBalanceInline)}
            label={currentBalanceLabel}
            severity={currentBalanceSeverity}
            tooltip={currentBalanceTooltip}
        >
            <AppAutoComplete
                {...rest}
                ref={autoCompleteRef}
                suggestions={displaySuggestions}
                value={manualDisplayValue.length ? manualDisplayValue : value}
                field={resolvedField}
                completeMethod={completeMethod ? handleComplete : undefined}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onDropdownClick={handleDropdownClick}
                onShow={handleShow}
                inlineTypeahead={false}
                autoHighlight
            />
        </LedgerCurrentBalanceInline>
    );
});

LedgerAutoComplete.displayName = 'LedgerAutoComplete';

export default LedgerAutoComplete;
