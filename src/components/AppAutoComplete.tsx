import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { AutoComplete, type AutoCompleteProps } from 'primereact/autocomplete';
import { classNames, ObjectUtils } from 'primereact/utils';

const DEFAULT_SCROLL_HEIGHT = '280px';
const VIRTUAL_SCROLL_THRESHOLD = 50;
const SCROLL_HEIGHT_THRESHOLD = 8;
const defaultPanelStyle: React.CSSProperties = { width: '100%' };

type AppAutoCompleteProps = AutoCompleteProps & {
    loading?: boolean;
    showLoadingIcon?: boolean;
    openOnFocus?: boolean;
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
    onFocus,
    onShow,
    onKeyDown,
    onKeyDownCapture,
    onDropdownClick,
    completeMethod,
    disabled,
    readOnly,
    suggestions,
    value,
    field,
    ...rest
}, ref) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    const resolvedDropdownIcon =
        showLoadingIcon && loading ? <i className="pi pi-spin pi-spinner" aria-hidden="true" /> : dropdownIcon;
    const resolvedOpenOnFocus = openOnFocus ?? true;
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

    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (disabled || readOnly) return;
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
        onDropdownClick?.(event);
        if (disabled || readOnly) return;

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

    const handleFocus = (event: React.FocusEvent<HTMLSpanElement>) => {
        onFocus?.(event);
        if (event.defaultPrevented) return;
        if (disabled || readOnly || !resolvedOpenOnFocus) return;

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

    const resolveComparableValue = (item: unknown) => {
        if (item == null) return item;
        if (field) {
            return ObjectUtils.resolveFieldData(item as object, field);
        }
        if (typeof item === 'object' && item && 'value' in item) {
            return (item as { value?: unknown }).value;
        }
        return item;
    };

    const findSelectedIndex = () => {
        if (!Array.isArray(suggestions) || suggestions.length === 0) return -1;
        if (value == null || Array.isArray(value)) return -1;
        const selectedComparable = resolveComparableValue(value);
        return suggestions.findIndex((option) => {
            if (option === value) return true;
            const optionComparable = resolveComparableValue(option);
            return optionComparable === selectedComparable && optionComparable != null;
        });
    };

    const syncSelectedHighlight = () => {
        if (disabled || readOnly) return;
        if (typeof window === 'undefined') return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        if (!overlay) return;
        const selectedIndex = findSelectedIndex();
        if (selectedIndex < 0) return;
        const virtualScroller = autoCompleteRef.current?.getVirtualScroller?.();
        if (virtualScroller && typeof virtualScroller.scrollToIndex === 'function') {
            virtualScroller.scrollToIndex(selectedIndex);
        }
        window.requestAnimationFrame(() => {
            const item = overlay.querySelector(
                `li.p-autocomplete-item[index="${selectedIndex}"]`
            ) as HTMLElement | null;
            if (!item) return;
            const highlighted = overlay.querySelector('li[data-p-highlight="true"]') as HTMLElement | null;
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
    }, [suggestions, value, field]);

    return (
        <AutoComplete
            {...rest}
            ref={autoCompleteRef}
            dropdown={dropdown ?? true}
            dropdownMode={dropdownMode ?? 'blank'}
            delay={delay ?? 250}
            minLength={minLength ?? 0}
            appendTo={appendTo ?? 'self'}
            scrollHeight={resolvedScrollHeight}
            virtualScrollerOptions={resolvedVirtualScrollerOptions}
            onKeyDown={handleKeyDown}
            onKeyDownCapture={onKeyDownCapture}
            onFocus={handleFocus}
            onDropdownClick={handleDropdownClick}
            onShow={handleShow}
            completeMethod={completeMethod}
            disabled={disabled}
            readOnly={readOnly}
            suggestions={suggestions}
            value={value}
            field={field}
            dropdownIcon={resolvedDropdownIcon}
            panelStyle={{ ...defaultPanelStyle, ...(panelStyle ?? {}) }}
            className={classNames('app-autocomplete', className)}
        />
    );
});

AppAutoComplete.displayName = 'AppAutoComplete';

export default AppAutoComplete;
