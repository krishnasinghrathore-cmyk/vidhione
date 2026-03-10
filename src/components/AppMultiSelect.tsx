import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { MultiSelect, type MultiSelectProps } from 'primereact/multiselect';
import { classNames, DomHandler } from 'primereact/utils';
import { queueAutoOpenFocusedOverlayControl } from '@/lib/enterNavigation';

type AppMultiSelectProps = MultiSelectProps & {
    loading?: boolean;
    openOnFocus?: boolean;
    enterFocusNext?: boolean;
    enterSelectOnEnter?: boolean;
    onEnterNext?: () => boolean | void;
};

const DEFAULT_SCROLL_HEIGHT = '280px';
const VIRTUAL_SCROLL_THRESHOLD = 50;
const SCROLL_HEIGHT_THRESHOLD = 8;

const AppMultiSelect = forwardRef<MultiSelect, AppMultiSelectProps>(({
    className,
    panelStyle,
    panelClassName,
    appendTo,
    display,
    filter,
    maxSelectedLabels,
    loading,
    dropdownIcon,
    onShow,
    onHide,
    pt,
    onFocus,
    onKeyDown,
    onMouseDown,
    onPointerDown,
    openOnFocus,
    enterFocusNext,
    enterSelectOnEnter,
    onEnterNext,
    ...rest
}, ref) => {
    const multiSelectRef = useRef<MultiSelect | null>(null);
    const focusFromPointerRef = useRef(false);
    const pendingFocusNextRef = useRef<HTMLElement | null>(null);
    const pendingFocusSelfRef = useRef(false);
    const suppressOpenOnFocusRef = useRef(false);
    const resolvedEnterFocusNext = enterFocusNext ?? true;
    const resolvedEnterSelectOnEnter = enterSelectOnEnter ?? true;
    const resolvedDropdownIcon = loading ? <i className="pi pi-spin pi-spinner" aria-hidden="true" /> : dropdownIcon;
    const resolvedAppendTo = appendTo ?? 'self';
    const alignAppendTo = resolvedAppendTo === 'self' ? 'self' : undefined;
    const optionCount = Array.isArray(rest.options) ? rest.options.length : 0;
    const useVirtualScroll = !rest.virtualScrollerOptions && optionCount > VIRTUAL_SCROLL_THRESHOLD;
    const resolvedVirtualScrollerOptions = useVirtualScroll ? { itemSize: 44 } : rest.virtualScrollerOptions;
    const resolvedScrollHeight =
        rest.scrollHeight ?? (optionCount > SCROLL_HEIGHT_THRESHOLD ? DEFAULT_SCROLL_HEIGHT : undefined);
    const controlStyle = rest.style as React.CSSProperties | undefined;
    const controlWidth = controlStyle?.width ?? controlStyle?.minWidth;
    const resolvedPanelStyle =
        controlWidth != null
            ? {
                  ...(panelStyle ?? {}),
                  width: panelStyle?.width ?? controlWidth,
                  minWidth: panelStyle?.minWidth ?? controlWidth,
                  maxWidth: panelStyle?.maxWidth ?? controlWidth
              }
            : panelStyle ?? undefined;
    const hasPanelWidth =
        resolvedPanelStyle?.width != null ||
        resolvedPanelStyle?.minWidth != null ||
        resolvedPanelStyle?.maxWidth != null;

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        focusFromPointerRef.current = true;
        onPointerDown?.(event);
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        focusFromPointerRef.current = true;
        onMouseDown?.(event);
    };

    const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
        onFocus?.(event);
        if (suppressOpenOnFocusRef.current) {
            suppressOpenOnFocusRef.current = false;
            return;
        }
        const shouldOpen =
            openOnFocus !== false &&
            !focusFromPointerRef.current &&
            !rest.disabled &&
            !rest.readOnly;
        focusFromPointerRef.current = false;
        if (!shouldOpen) return;
        multiSelectRef.current?.show?.();
    };

    const focusNextControl = (current: HTMLElement | null) => {
        if (typeof document === 'undefined' || !current) return;
        const scope =
            current.closest('.app-data-table-header') ??
            current.closest('.app-data-table') ??
            document.body ??
            document;
        const focusables = Array.from(
            scope.querySelectorAll<HTMLElement>(
                'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => {
            if (element.hasAttribute('disabled')) return false;
            if (element.getAttribute('aria-disabled') === 'true') return false;
            if (element.tabIndex < 0) return false;
            const style = window.getComputedStyle(element);
            if (style.visibility === 'hidden' || style.display === 'none') return false;
            if (!element.getClientRects().length) return false;
            return true;
        });

        if (!focusables.length) return;
        const root = multiSelectRef.current?.getElement?.() ?? null;
        const rootIndices = root
            ? focusables
                  .map((el, idx) => (root.contains(el) ? idx : -1))
                  .filter((idx) => idx >= 0)
            : [];
        const lastRootIndex = rootIndices.length ? Math.max(...rootIndices) : focusables.indexOf(current);
        if (lastRootIndex < 0) return;
        const next = focusables[lastRootIndex + 1];
        if (next) next.focus();
    };

    const focusSelf = () => {
        const instance = multiSelectRef.current;
        if (!instance) return;
        if (typeof instance.focus === 'function') {
            instance.focus();
            return;
        }
        const element = instance.getElement?.();
        if (element) element.focus();
    };

    const runEnterNext = (current: HTMLElement | null) => {
        if (!resolvedEnterFocusNext || !current) return;
        const moveToNext = () => {
            focusNextControl(current);
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
                        if (!activeAfter || activeAfter === activeBefore || activeAfter === current) return;
                        queueAutoOpenFocusedOverlayControl(activeAfter);
                    });
                }
                return;
            }
            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        const activeAfter = typeof document !== 'undefined' ? document.activeElement : null;
                        if (activeAfter && activeAfter !== activeBefore && activeAfter !== current) return;
                        moveToNext();
                    });
                });
                return;
            }
            moveToNext();
        }, 0);
    };

    const handleFilterKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        const isEscape = event.key === 'Escape' || event.key === 'Esc' || event.which === 27;
        if (isEscape) {
            pendingFocusSelfRef.current = true;
            multiSelectRef.current?.hide?.();
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter' || event.which === 13;
        if (isEnter) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const isDown = event.key === 'ArrowDown' || event.key === 'Down' || event.which === 40;
        const isUp = event.key === 'ArrowUp' || event.key === 'Up' || event.which === 38;
        if (!isDown && !isUp) return;
        const overlay = multiSelectRef.current?.getOverlay?.();
        if (!overlay) return;
        const items = Array.from(
            overlay.querySelectorAll<HTMLElement>('li.p-multiselect-item:not([data-p-disabled="true"])')
        );
        if (!items.length) return;
        const nextItem = isUp ? items[items.length - 1] : items[0];
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(() => nextItem?.focus());
        } else {
            nextItem?.focus();
        }
        event.preventDefault();
    };

    const handleItemKeyDownCapture = (event: React.KeyboardEvent<HTMLElement>) => {
        const isEscape = event.key === 'Escape' || event.key === 'Esc' || event.which === 27;
        if (isEscape) {
            pendingFocusSelfRef.current = true;
            multiSelectRef.current?.hide?.();
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter' || event.which === 13;
        if (!isEnter) return;
        if (!resolvedEnterFocusNext || rest.disabled || rest.readOnly) return;
        const root = multiSelectRef.current?.getElement?.() ?? event.currentTarget;
        if (resolvedEnterSelectOnEnter) {
            const item = event.currentTarget as HTMLElement;
            const isSelected =
                item.getAttribute('aria-selected') === 'true' ||
                item.getAttribute('data-p-highlight') === 'true' ||
                item.classList.contains('p-highlight');
            event.preventDefault();
            event.stopPropagation();
            if (!isSelected) {
                item.click();
            }
            pendingFocusNextRef.current = root;
            multiSelectRef.current?.hide?.();
            return;
        }
        pendingFocusNextRef.current = root;
        multiSelectRef.current?.hide?.();
        event.preventDefault();
        event.stopPropagation();
    };

    const syncPanelLayout = () => {
        const overlay = multiSelectRef.current?.getOverlay?.();
        const element = multiSelectRef.current?.getElement?.();
        if (!overlay || !element) return;
        const elementRect = element.getBoundingClientRect();
        let updatedWidth = false;
        if (!hasPanelWidth) {
            const width = elementRect.width;
            if (width) {
                const widthPx = `${Math.ceil(width)}px`;
                overlay.style.width = widthPx;
                overlay.style.minWidth = widthPx;
                overlay.style.maxWidth = widthPx;
                updatedWidth = true;
            }
        }
        if (updatedWidth) {
            DomHandler.alignOverlay(overlay, element, alignAppendTo);
        }
    };

    const resolvedFilterInput = (options?: unknown) => {
        const baseInput = typeof pt?.filterInput === 'function' ? pt.filterInput(options) : pt?.filterInput;
        const inputProps = (baseInput ?? {}) as React.HTMLAttributes<HTMLInputElement>;
        const userKeyDown = inputProps.onKeyDown;
        return {
            ...inputProps,
            onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                userKeyDown?.(event);
                if (event.defaultPrevented) return;
                handleFilterKeyDown(event);
            }
        };
    };

    const resolvedFilterContainer = (options?: unknown) => {
        const baseContainer =
            typeof pt?.filterContainer === 'function' ? pt.filterContainer(options) : pt?.filterContainer;
        const containerProps = (baseContainer ?? {}) as React.HTMLAttributes<HTMLDivElement>;
        const userKeyDown = containerProps.onKeyDown;
        return {
            ...containerProps,
            onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                userKeyDown?.(event);
                if (event.defaultPrevented) return;
                handleFilterKeyDown(event);
            }
        };
    };

    const resolvedItem = (options?: unknown) => {
        const baseItem = typeof pt?.item === 'function' ? pt.item(options) : pt?.item;
        const itemProps = (baseItem ?? {}) as React.HTMLAttributes<HTMLLIElement>;
        const userKeyDownCapture = itemProps.onKeyDownCapture;
        return {
            ...itemProps,
            onKeyDownCapture: (event: React.KeyboardEvent<HTMLLIElement>) => {
                userKeyDownCapture?.(event);
                if (event.defaultPrevented) return;
                handleItemKeyDownCapture(event);
            }
        };
    };

    const handleShow = () => {
        onShow?.();
        if (typeof window === 'undefined') return;
        window.requestAnimationFrame(() => {
            syncPanelLayout();
            const overlay = multiSelectRef.current?.getOverlay?.();
            const element = multiSelectRef.current?.getElement?.();
            if (overlay && element) {
                DomHandler.alignOverlay(overlay, element, alignAppendTo);
            }
        });
    };

    const handleHide = () => {
        onHide?.();
        const nextTarget = pendingFocusNextRef.current;
        if (!nextTarget) {
            if (pendingFocusSelfRef.current) {
                pendingFocusSelfRef.current = false;
                suppressOpenOnFocusRef.current = true;
                if (typeof window !== 'undefined') {
                    window.setTimeout(() => focusSelf(), 0);
                } else {
                    focusSelf();
                }
            }
            return;
        }
        pendingFocusNextRef.current = null;
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(() => runEnterNext(nextTarget));
        } else {
            runEnterNext(nextTarget);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter' || event.which === 13;
        if (!isEnter) return;
        if (!resolvedEnterFocusNext || rest.disabled || rest.readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        const root = multiSelectRef.current?.getElement?.() ?? (event.currentTarget as HTMLElement | null);
        const overlay = multiSelectRef.current?.getOverlay?.() as HTMLElement | null;
        const overlayVisible =
            overlay != null &&
            overlay.getClientRects().length > 0 &&
            overlay.getAttribute('aria-hidden') !== 'true';
        if (overlayVisible) {
            pendingFocusNextRef.current = root;
            multiSelectRef.current?.hide?.();
            return;
        }
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(() => runEnterNext(root));
        } else {
            runEnterNext(root);
        }
    };

    useImperativeHandle(ref, () => multiSelectRef.current as MultiSelect);

    return (
        <MultiSelect
            {...rest}
            ref={multiSelectRef}
            appendTo={resolvedAppendTo}
            display={display ?? 'chip'}
            filter={filter ?? true}
            maxSelectedLabels={maxSelectedLabels ?? 2}
            dropdownIcon={resolvedDropdownIcon}
            scrollHeight={resolvedScrollHeight}
            virtualScrollerOptions={resolvedVirtualScrollerOptions}
            panelClassName={classNames('app-multiselect-panel', panelClassName)}
            panelStyle={resolvedPanelStyle}
            onShow={handleShow}
            onHide={handleHide}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onMouseDown={handleMouseDown}
            pt={{
                ...(pt ?? {}),
                filterInput: resolvedFilterInput,
                filterContainer: resolvedFilterContainer,
                item: resolvedItem
            }}
            className={classNames('app-multiselect', className)}
        />
    );
});

AppMultiSelect.displayName = 'AppMultiSelect';

export default AppMultiSelect;
