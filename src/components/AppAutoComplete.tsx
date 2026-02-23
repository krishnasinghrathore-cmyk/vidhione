import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from 'react';
import {
    AutoComplete,
    type AutoCompleteChangeEvent,
    type AutoCompleteCompleteEvent,
    type AutoCompleteProps
} from 'primereact/autocomplete';
import { classNames, ObjectUtils } from 'primereact/utils';
import {
    consumeEnterNavAutoOpenIntent,
    focusNextElement,
    isEnterWithoutModifiers,
    markEnterNavAutoOpenIntent,
    queueAutoOpenFocusedOverlayControl,
    resolveEnterScope,
    shouldSkipEnterAsTabTarget
} from '@/lib/enterNavigation';

const DEFAULT_SCROLL_HEIGHT = '280px';
const VIRTUAL_SCROLL_THRESHOLD = 50;
const SCROLL_HEIGHT_THRESHOLD = 8;
const defaultPanelStyle: React.CSSProperties = { width: '100%' };

type AppAutoCompleteProps = AutoCompleteProps & {
    loading?: boolean;
    showLoadingIcon?: boolean;
    openOnFocus?: boolean;
    inlineTypeahead?: boolean;
    highlightSelectedOnShow?: boolean;
    preserveInputOnDropdownClick?: boolean;
    onEnterNext?: () => boolean | void;
    enterFocusNext?: boolean;
};

const AppAutoComplete = forwardRef<AutoComplete, AppAutoCompleteProps>(({
    className,
    panelStyle,
    dropdown,
    dropdownMode,
    delay,
    minLength,
    scrollHeight,
    virtualScrollerOptions,
    appendTo,
    loading,
    showLoadingIcon,
    dropdownIcon,
    openOnFocus,
    inlineTypeahead,
    highlightSelectedOnShow,
    preserveInputOnDropdownClick,
    onEnterNext,
    enterFocusNext,
    onFocus,
    onBlur,
    onShow,
    onKeyDown,
    onKeyDownCapture,
    onMouseDownCapture,
    onPointerDownCapture,
    onChange,
    onDropdownClick,
    completeMethod,
    disabled,
    readOnly,
    suggestions,
    value,
    field,
    autoHighlight,
    ...rest
}, ref) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    const pendingInlineSelectionRef = useRef<{ start: number; end: number } | null>(null);
    const suppressNextFocusOpenRef = useRef(false);
    const [inlineQuery, setInlineQuery] = useState('');
    const [inlineDisplayValue, setInlineDisplayValue] = useState('');
    const resolvedDropdownIcon =
        showLoadingIcon && loading ? <i className="pi pi-spin pi-spinner" aria-hidden="true" /> : dropdownIcon;
    const resolvedOpenOnFocus = openOnFocus ?? false;
    const resolvedInlineTypeahead = inlineTypeahead ?? false;
    const resolvedAutoHighlight = autoHighlight ?? true;
    const resolvedHighlightSelectedOnShow = highlightSelectedOnShow ?? true;
    const resolvedPreserveInputOnDropdownClick = preserveInputOnDropdownClick ?? false;
    const resolvedDropdownMode =
        dropdownMode ??
        (resolvedPreserveInputOnDropdownClick ? 'current' : 'blank');
    const resolvedEnterFocusNext = enterFocusNext ?? true;
    const optionCount = Array.isArray(suggestions) ? suggestions.length : 0;
    const resolvedVirtualScrollerOptions =
        !virtualScrollerOptions && optionCount > VIRTUAL_SCROLL_THRESHOLD ? { itemSize: 36 } : virtualScrollerOptions;
    const resolvedScrollHeight =
        scrollHeight ??
        (resolvedVirtualScrollerOptions
            ? DEFAULT_SCROLL_HEIGHT
            : optionCount > SCROLL_HEIGHT_THRESHOLD
              ? DEFAULT_SCROLL_HEIGHT
              : undefined);
    const usesSelfOverlay = appendTo == null || appendTo === 'self';
    const resolvedPanelStyle = usesSelfOverlay
        ? { ...defaultPanelStyle, ...(panelStyle ?? {}) }
        : { ...(panelStyle ?? {}) };
    const clearInlineTypeahead = useCallback(() => {
        setInlineQuery('');
        setInlineDisplayValue('');
        pendingInlineSelectionRef.current = null;
    }, []);

    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const resolveOptionLabel = useCallback(
        (item: unknown): string | null => {
            if (item == null) return null;
            if (typeof item === 'string' || typeof item === 'number') return String(item);
            if (typeof item !== 'object') return null;
            if (field) {
                const resolved = ObjectUtils.resolveFieldData(item as object, field);
                if (typeof resolved === 'string' || typeof resolved === 'number') {
                    return String(resolved);
                }
            }
            if ('label' in item && typeof (item as { label?: unknown }).label === 'string') {
                return (item as { label: string }).label;
            }
            if ('name' in item && typeof (item as { name?: unknown }).name === 'string') {
                return (item as { name: string }).name;
            }
            if ('value' in item) {
                const raw = (item as { value?: unknown }).value;
                if (typeof raw === 'string' || typeof raw === 'number') {
                    return String(raw);
                }
            }
            return null;
        },
        [field]
    );

    const syncInlineTypeahead = useCallback(
        (nextQuery: string) => {
            if (!resolvedInlineTypeahead || disabled || readOnly || !Array.isArray(suggestions)) {
                setInlineDisplayValue('');
                pendingInlineSelectionRef.current = null;
                return;
            }
            if (!nextQuery) {
                setInlineDisplayValue('');
                pendingInlineSelectionRef.current = null;
                return;
            }
            const needle = nextQuery.toLowerCase();
            const match = suggestions.find((option) => {
                const label = resolveOptionLabel(option);
                return typeof label === 'string' && label.toLowerCase().startsWith(needle);
            });
            const matchedLabel = match ? resolveOptionLabel(match) : null;
            if (matchedLabel && matchedLabel.length > nextQuery.length) {
                setInlineDisplayValue(matchedLabel);
                pendingInlineSelectionRef.current = {
                    start: nextQuery.length,
                    end: matchedLabel.length
                };
                return;
            }
            setInlineDisplayValue(nextQuery);
            pendingInlineSelectionRef.current = null;
        },
        [disabled, readOnly, resolveOptionLabel, resolvedInlineTypeahead, suggestions]
    );

    useEffect(() => {
        if (!resolvedInlineTypeahead || typeof window === 'undefined') return;
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
    }, [inlineDisplayValue, resolvedInlineTypeahead]);

    useEffect(() => {
        if (!resolvedInlineTypeahead) return;
        if (typeof value !== 'string') {
            clearInlineTypeahead();
            return;
        }
        if (!inlineQuery) return;
        syncInlineTypeahead(inlineQuery);
    }, [clearInlineTypeahead, inlineQuery, resolvedInlineTypeahead, syncInlineTypeahead, value]);

    const resolvedValue = useMemo(() => {
        if (!resolvedInlineTypeahead) return value;
        if (typeof value !== 'string') return value;
        if (!inlineDisplayValue.length) return value;
        return inlineDisplayValue;
    }, [inlineDisplayValue, resolvedInlineTypeahead, value]);

    const runEnterNext = (anchorOverride?: HTMLElement | null) => {
        if (!resolvedEnterFocusNext) return;
        const focusAnchor =
            anchorOverride ??
            autoCompleteRef.current?.getInput?.() ??
            null;
        if (!focusAnchor) return;
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

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (disabled || readOnly) {
            onKeyDown?.(event);
            return;
        }
        const isEnterForNavigation = resolvedEnterFocusNext && isEnterWithoutModifiers(event as any);
        if (isEnterForNavigation) {
            markEnterNavAutoOpenIntent();
        }
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (isEnterForNavigation) {
            const overlay = autoCompleteRef.current?.getOverlay?.();
            const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
            if (overlayVisible) return;
            const focusAnchor =
                autoCompleteRef.current?.getInput?.() ??
                ((event.target as HTMLElement | null) ?? null);
            if (!focusAnchor || shouldSkipEnterAsTabTarget(focusAnchor)) return;
            event.preventDefault();
            runEnterNext(focusAnchor);
            return;
        }
        if (event.key !== 'ArrowDown') return;

        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) return;

        const inputValue = autoCompleteRef.current?.getInput?.()?.value ?? '';
        if (completeMethod) {
            autoCompleteRef.current?.search?.(event, '', 'dropdown');
            autoCompleteRef.current?.show?.();
            return;
        }
        autoCompleteRef.current?.show?.();
        onDropdownClick?.({ originalEvent: event, query: inputValue });
    };

    const handleDropdownClick = (event: any) => {
        suppressNextFocusOpenRef.current = false;
        onDropdownClick?.(event);
        if (disabled || readOnly) return;

        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) return;

        const inputValue = autoCompleteRef.current?.getInput?.()?.value ?? '';
        if (completeMethod && !resolvedPreserveInputOnDropdownClick) {
            autoCompleteRef.current?.search?.(event, '', 'dropdown');
            autoCompleteRef.current?.show?.();
            return;
        }
        if (completeMethod && resolvedPreserveInputOnDropdownClick && !onDropdownClick) {
            autoCompleteRef.current?.search?.(event, inputValue, 'dropdown');
            autoCompleteRef.current?.show?.();
            return;
        }

        autoCompleteRef.current?.show?.();
    };

    const handleCompleteMethod = (event: AutoCompleteCompleteEvent) => {
        completeMethod?.(event);
        if (!resolvedInlineTypeahead) return;
        const nextQuery = event.query ?? '';
        setInlineQuery(nextQuery);
        syncInlineTypeahead(nextQuery);
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        onChange?.(event);
        if (!resolvedInlineTypeahead) return;
        const nextValue = event.value as unknown;
        if (typeof nextValue === 'string') {
            setInlineQuery(nextValue);
            syncInlineTypeahead(nextValue);
            return;
        }
        clearInlineTypeahead();
    };

    const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
        suppressNextFocusOpenRef.current = false;
        onBlur?.(event as unknown as React.FocusEvent<HTMLInputElement>);
        if (!resolvedInlineTypeahead) return;
        clearInlineTypeahead();
    };

    const handleFocus = (event: React.FocusEvent<HTMLSpanElement>) => {
        const openFromEnterNavigation = consumeEnterNavAutoOpenIntent();
        const suppressOpenOnFocus = suppressNextFocusOpenRef.current;
        suppressNextFocusOpenRef.current = false;
        onFocus?.(event as unknown as React.FocusEvent<HTMLInputElement>);
        if (event.defaultPrevented) return;
        if (disabled || readOnly || suppressOpenOnFocus) return;
        if (!resolvedOpenOnFocus && !openFromEnterNavigation) return;

        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) return;

        const inputValue = autoCompleteRef.current?.getInput?.()?.value ?? '';
        if (completeMethod) {
            autoCompleteRef.current?.search?.(event, '', 'dropdown');
            autoCompleteRef.current?.show?.();
            return;
        }
        autoCompleteRef.current?.show?.();
        onDropdownClick?.({ originalEvent: event, query: inputValue });
    };

    const handlePointerDownCapture = (event: React.PointerEvent<HTMLSpanElement>) => {
        onPointerDownCapture?.(event);
        if (event.defaultPrevented) return;
        const target = event.target as HTMLElement | null;
        if (!target) return;
        suppressNextFocusOpenRef.current = Boolean(target.closest('.p-autocomplete-dropdown'));
    };

    const handleMouseDownCapture = (event: React.MouseEvent<HTMLSpanElement>) => {
        onMouseDownCapture?.(event);
        if (event.defaultPrevented) return;
        const target = event.target as HTMLElement | null;
        if (!target) return;
        suppressNextFocusOpenRef.current = Boolean(target.closest('.p-autocomplete-dropdown'));
    };

    const resolveComparableValue = (item: unknown) => {
        if (item == null) return item;
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            return item;
        }
        if (field && typeof item === 'object') {
            const fieldValue = ObjectUtils.resolveFieldData(item as object, field);
            if (fieldValue != null) return fieldValue;
        }
        if (typeof item === 'object' && item && 'value' in item) {
            return (item as { value?: unknown }).value;
        }
        if (typeof item === 'object' && item && 'label' in item) {
            return (item as { label?: unknown }).label;
        }
        return item;
    };

    const areComparableValuesEqual = (left: unknown, right: unknown) => {
        if (typeof left === 'string' && typeof right === 'string') {
            return left.trim().toLowerCase() === right.trim().toLowerCase();
        }
        return left === right;
    };

    const findSelectedIndex = () => {
        if (!Array.isArray(suggestions) || suggestions.length === 0) return -1;
        if (value == null || Array.isArray(value)) return -1;
        const selectedComparable = resolveComparableValue(value);
        if (selectedComparable == null) return -1;
        return suggestions.findIndex((option) => {
            if (option === value) return true;
            const optionComparable = resolveComparableValue(option);
            if (optionComparable == null) return false;
            return areComparableValuesEqual(optionComparable, selectedComparable);
        });
    };

    const syncSelectedHighlight = () => {
        if (disabled || readOnly) return;
        if (typeof window === 'undefined') return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        if (!overlay) return;
        const selectedIndex = findSelectedIndex();
        const typedInput = autoCompleteRef.current?.getInput?.()?.value ?? '';
        const shouldHighlightSelectedSuggestion = resolvedHighlightSelectedOnShow && selectedIndex >= 0;
        const shouldHighlightFirstSuggestion =
            selectedIndex < 0 &&
            resolvedAutoHighlight &&
            typedInput.trim().length > 0 &&
            Array.isArray(suggestions) &&
            suggestions.length > 0;
        const highlightIndex = shouldHighlightSelectedSuggestion ? selectedIndex : shouldHighlightFirstSuggestion ? 0 : -1;
        if (highlightIndex < 0) {
            const highlighted = overlay.querySelector(
                'li[data-p-highlight="true"], li.p-highlight, li[aria-selected="true"]'
            ) as HTMLElement | null;
            if (!highlighted) return;
            highlighted.setAttribute('data-p-highlight', 'false');
            highlighted.classList.remove('p-highlight');
            return;
        }
        const virtualScroller = autoCompleteRef.current?.getVirtualScroller?.();
        if (virtualScroller && typeof virtualScroller.scrollToIndex === 'function') {
            virtualScroller.scrollToIndex(highlightIndex);
        }
        window.requestAnimationFrame(() => {
            const item = overlay.querySelector(
                `li.p-autocomplete-item[index="${highlightIndex}"]`
            ) as HTMLElement | null;
            if (!item) return;
            const highlighted = overlay.querySelector(
                'li[data-p-highlight="true"], li.p-highlight, li[aria-selected="true"]'
            ) as HTMLElement | null;
            if (highlighted && highlighted !== item) {
                highlighted.setAttribute('data-p-highlight', 'false');
                highlighted.classList.remove('p-highlight');
            }
            item.setAttribute('data-p-highlight', 'true');
            item.classList.add('p-highlight');
            item.scrollIntoView({ block: 'nearest' });
        });
    };

    const handleShow = () => {
        onShow?.();
        syncSelectedHighlight();
    };

    useEffect(() => {
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (!overlayVisible) return;
        syncSelectedHighlight();
    }, [suggestions, value, field, resolvedAutoHighlight, resolvedHighlightSelectedOnShow]);

    return (
        <AutoComplete
            {...rest}
            ref={autoCompleteRef}
            dropdown={dropdown ?? true}
            dropdownMode={resolvedDropdownMode}
            delay={delay ?? 250}
            minLength={minLength ?? 0}
            appendTo={appendTo ?? 'self'}
            scrollHeight={resolvedScrollHeight}
            virtualScrollerOptions={resolvedVirtualScrollerOptions}
            onKeyDown={handleKeyDown}
            onKeyDownCapture={onKeyDownCapture}
            onPointerDownCapture={handlePointerDownCapture}
            onMouseDownCapture={handleMouseDownCapture}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onDropdownClick={handleDropdownClick}
            onShow={handleShow}
            completeMethod={completeMethod ? handleCompleteMethod : undefined}
            disabled={disabled}
            readOnly={readOnly}
            suggestions={suggestions}
            value={resolvedValue}
            field={field}
            autoHighlight={resolvedAutoHighlight}
            dropdownIcon={resolvedDropdownIcon}
            panelStyle={resolvedPanelStyle}
            className={classNames('app-autocomplete', className)}
        />
    );
});

AppAutoComplete.displayName = 'AppAutoComplete';

export default AppAutoComplete;
