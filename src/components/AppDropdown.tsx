import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Dropdown, type DropdownProps } from 'primereact/dropdown';
import { classNames } from 'primereact/utils';
import {
    consumeEnterNavAutoOpenIntent,
    focusNextElement,
    markEnterNavAutoOpenIntent,
    queueAutoOpenFocusedOverlayControl,
    resolveEnterScope
} from '@/lib/enterNavigation';

type AppDropdownProps = DropdownProps & {
    loading?: boolean;
    showLoadingIcon?: boolean;
    onEnterNext?: () => boolean | void;
    enterFocusNext?: boolean;
    openOnFocus?: boolean;
    compact?: boolean;
};

const DEFAULT_SCROLL_HEIGHT = '280px';
const VIRTUAL_SCROLL_THRESHOLD = 50;
const SCROLL_HEIGHT_THRESHOLD = 8;
const defaultPanelStyle: React.CSSProperties = { width: '100%' };
const isEnterKey = (event: { key?: string; code?: string; keyCode?: number; which?: number }) =>
    event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter' || event.keyCode === 13 || event.which === 13;
type DropdownEnterNativeEvent = KeyboardEvent & { __appDropdownEnterHandled?: boolean };
const markEnterHandled = (event: { nativeEvent?: Event }) => {
    const native = event.nativeEvent as DropdownEnterNativeEvent | undefined;
    if (!native) return;
    native.__appDropdownEnterHandled = true;
};
const isEnterHandled = (event: { nativeEvent?: Event }) => {
    const native = event.nativeEvent as DropdownEnterNativeEvent | undefined;
    return Boolean(native?.__appDropdownEnterHandled);
};

const AppDropdown = forwardRef<Dropdown, AppDropdownProps>(({
    className,
    panelStyle,
    panelClassName,
    appendTo,
    loading,
    showLoadingIcon,
    dropdownIcon,
    onEnterNext,
    enterFocusNext,
    openOnFocus,
    showOnFocus,
    compact = true,
    onKeyDown,
    onFocus,
    onShow,
    onHide,
    pt,
    ...rest
}, ref) => {
    const dropdownRef = useRef<Dropdown | null>(null);
    const pendingEnterNextRef = useRef(false);
    const pendingEnterAnchorRef = useRef<HTMLElement | null>(null);
    const overlayVisibleRef = useRef(false);
    const overlayRef = useRef<HTMLElement | null>(null);
    const overlayKeyDownRef = useRef<((event: KeyboardEvent) => void) | null>(null);
    useImperativeHandle(ref, () => dropdownRef.current as Dropdown);

    const resolvedDropdownIcon =
        showLoadingIcon && loading ? <i className="pi pi-spin pi-spinner" aria-hidden="true" /> : dropdownIcon;
    const optionCount = Array.isArray(rest.options) ? rest.options.length : 0;
    const useVirtualScroll = !rest.virtualScrollerOptions && optionCount > VIRTUAL_SCROLL_THRESHOLD;
    const resolvedVirtualScrollerOptions = useVirtualScroll ? { itemSize: 36 } : rest.virtualScrollerOptions;
    const resolvedScrollHeight =
        rest.scrollHeight ?? (optionCount > SCROLL_HEIGHT_THRESHOLD ? DEFAULT_SCROLL_HEIGHT : undefined);
    const resolvedAppendTo = appendTo ?? 'self';
    const resolvedPanelClassName = classNames('app-dropdown-panel', panelClassName);
    const resolvedShowOnFocus = showOnFocus ?? openOnFocus ?? false;
    const resolvedEnterFocusNext = enterFocusNext ?? true;

    const runEnterNext = (anchorOverride?: HTMLElement | null) => {
        if (!resolvedEnterFocusNext) return;
        const focusAnchor = anchorOverride ?? dropdownRef.current?.getInput?.() ?? null;
        if (!focusAnchor) return;
        const focusFallback = () => {
            focusNextElement(focusAnchor, resolveEnterScope(focusAnchor));
        };
        if (!onEnterNext) {
            focusFallback();
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
                        if (activeAfter && activeAfter !== activeBefore && activeAfter !== focusAnchor) {
                            return;
                        }
                        focusFallback();
                    });
                });
                return;
            }
            focusFallback();
        }, 0);
    };

    const buildFilterInputProps = (base: React.HTMLAttributes<HTMLInputElement> = {}) => ({
        ...base,
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            base.onKeyDown?.(event);
            if (!isEnterKey(event) || !resolvedEnterFocusNext) return;
            markEnterNavAutoOpenIntent();
            markEnterHandled(event);
            pendingEnterAnchorRef.current = event.currentTarget;
            window.setTimeout(() => {
                dropdownRef.current?.hide?.();
                runEnterNext(event.currentTarget);
            }, 0);
        }
    });

    const buildInputProps = (base: React.HTMLAttributes<HTMLInputElement> = {}) => ({
        ...base,
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            base.onKeyDown?.(event);
            if (!isEnterKey(event) || !resolvedEnterFocusNext) return;
            markEnterNavAutoOpenIntent();
            markEnterHandled(event);
            if (overlayVisibleRef.current) {
                pendingEnterNextRef.current = true;
                pendingEnterAnchorRef.current = event.currentTarget;
                window.setTimeout(() => {
                    if (!pendingEnterNextRef.current) return;
                    pendingEnterNextRef.current = false;
                    runEnterNext(pendingEnterAnchorRef.current);
                    pendingEnterAnchorRef.current = null;
                }, 220);
                return;
            }
            window.setTimeout(() => {
                dropdownRef.current?.hide?.();
                runEnterNext(event.currentTarget);
            }, 0);
        }
    });

    const resolvedFilterInput =
        typeof pt?.filterInput === 'function'
            ? (options: any) =>
                  buildFilterInputProps(
                      (pt.filterInput as (options: any) => React.HTMLAttributes<HTMLInputElement>)(options)
                  )
            : buildFilterInputProps((pt?.filterInput as React.HTMLAttributes<HTMLInputElement>) ?? {});
    const resolvedInput =
        typeof pt?.input === 'function'
            ? (options: any) =>
                  buildInputProps((pt.input as (options: any) => React.HTMLAttributes<HTMLInputElement>)(options))
            : buildInputProps((pt?.input as React.HTMLAttributes<HTMLInputElement>) ?? {});

    const resolvedPt = {
        ...(pt ?? {}),
        input: resolvedInput,
        filterInput: resolvedFilterInput
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (isEnterKey(event) && resolvedEnterFocusNext) {
            markEnterNavAutoOpenIntent();
        }
        onKeyDown?.(event);
        if (isEnterHandled(event)) return;
        if (!isEnterKey(event) || !resolvedEnterFocusNext) return;
        const focusAnchor = dropdownRef.current?.getInput?.() ?? (event.currentTarget as HTMLElement);
        if (overlayVisibleRef.current) {
            pendingEnterNextRef.current = true;
            pendingEnterAnchorRef.current = focusAnchor;
            // Fallback in case overlay hide callback does not fire in some navigation flows.
            window.setTimeout(() => {
                if (!pendingEnterNextRef.current) return;
                pendingEnterNextRef.current = false;
                runEnterNext(pendingEnterAnchorRef.current);
                pendingEnterAnchorRef.current = null;
            }, 220);
            return;
        }
        window.setTimeout(() => {
            dropdownRef.current?.hide?.();
            runEnterNext(focusAnchor);
        }, 0);
    };

    const detachOverlayListener = () => {
        if (!overlayRef.current || !overlayKeyDownRef.current) return;
        overlayRef.current.removeEventListener('keydown', overlayKeyDownRef.current, true);
        overlayRef.current = null;
        overlayKeyDownRef.current = null;
    };

    const attachOverlayListener = () => {
        if (!resolvedEnterFocusNext) return;
        const overlay = dropdownRef.current?.getOverlay?.() as HTMLElement | null;
        if (!overlay) return;
        if (overlayRef.current === overlay && overlayKeyDownRef.current) return;
        detachOverlayListener();
        overlayRef.current = overlay;
        overlayKeyDownRef.current = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            markEnterNavAutoOpenIntent();
            pendingEnterNextRef.current = true;
            pendingEnterAnchorRef.current = dropdownRef.current?.getInput?.() ?? null;
        };
        overlay.addEventListener('keydown', overlayKeyDownRef.current, true);
    };

    const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
        onFocus?.(event as unknown as React.FocusEvent<HTMLInputElement>);
        if (event.defaultPrevented) return;
        if (!consumeEnterNavAutoOpenIntent()) return;
        const focusAnchor = dropdownRef.current?.getInput?.() ?? (event.target as HTMLElement | null);
        queueAutoOpenFocusedOverlayControl(focusAnchor);
    };

    const handleShow = () => {
        overlayVisibleRef.current = true;
        onShow?.();
        attachOverlayListener();
    };

    const handleHide = () => {
        overlayVisibleRef.current = false;
        onHide?.();
        detachOverlayListener();
        if (!pendingEnterNextRef.current || !resolvedEnterFocusNext) return;
        pendingEnterNextRef.current = false;
        runEnterNext(pendingEnterAnchorRef.current);
        pendingEnterAnchorRef.current = null;
    };

    useEffect(() => {
        return () => {
            detachOverlayListener();
            pendingEnterAnchorRef.current = null;
        };
    }, []);

    return (
        <Dropdown
            {...rest}
            ref={dropdownRef}
            appendTo={resolvedAppendTo}
            panelClassName={resolvedPanelClassName}
            dropdownIcon={resolvedDropdownIcon}
            panelStyle={{ ...defaultPanelStyle, ...(panelStyle ?? {}) }}
            scrollHeight={resolvedScrollHeight}
            virtualScrollerOptions={resolvedVirtualScrollerOptions}
            className={classNames('app-dropdown', compact && 'app-dropdown--compact p-inputtext-sm', className)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            showOnFocus={resolvedShowOnFocus}
            onShow={handleShow}
            onHide={handleHide}
            pt={resolvedPt}
        />
    );
});

AppDropdown.displayName = 'AppDropdown';

export default AppDropdown;
