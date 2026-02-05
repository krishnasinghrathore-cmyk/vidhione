import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Dropdown, type DropdownProps } from 'primereact/dropdown';
import { classNames } from 'primereact/utils';

type AppDropdownProps = DropdownProps & {
    loading?: boolean;
    showLoadingIcon?: boolean;
    onEnterNext?: () => void;
    openOnFocus?: boolean;
};

const DEFAULT_SCROLL_HEIGHT = '280px';
const VIRTUAL_SCROLL_THRESHOLD = 50;
const SCROLL_HEIGHT_THRESHOLD = 8;
const defaultPanelStyle: React.CSSProperties = { width: '100%' };

const AppDropdown = forwardRef<Dropdown, AppDropdownProps>(({
    className,
    panelStyle,
    panelClassName,
    appendTo,
    loading,
    showLoadingIcon,
    dropdownIcon,
    onEnterNext,
    openOnFocus,
    showOnFocus,
    onKeyDown,
    onShow,
    onHide,
    pt,
    ...rest
}, ref) => {
    const dropdownRef = useRef<Dropdown | null>(null);
    const pendingEnterNextRef = useRef(false);
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
    const resolvedShowOnFocus = showOnFocus ?? openOnFocus ?? true;

    const buildFilterInputProps = (base: React.HTMLAttributes<HTMLInputElement> = {}) => ({
        ...base,
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            base.onKeyDown?.(event);
            if (event.defaultPrevented || event.key !== 'Enter' || !onEnterNext) return;
            window.setTimeout(() => {
                dropdownRef.current?.hide?.();
                onEnterNext();
            }, 0);
        }
    });

    const resolvedFilterInput =
        typeof pt?.filterInput === 'function'
            ? (options: any) => buildFilterInputProps(pt.filterInput(options) as React.HTMLAttributes<HTMLInputElement>)
            : buildFilterInputProps((pt?.filterInput as React.HTMLAttributes<HTMLInputElement>) ?? {});

    const resolvedPt = {
        ...(pt ?? {}),
        filterInput: resolvedFilterInput
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onEnterNext) return;
        const dropdownRoot = event.currentTarget as HTMLElement | null;
        if (dropdownRoot?.classList?.contains('p-dropdown-open')) {
            pendingEnterNextRef.current = true;
            return;
        }
        event.preventDefault();
        window.setTimeout(onEnterNext, 0);
    };

    const detachOverlayListener = () => {
        if (!overlayRef.current || !overlayKeyDownRef.current) return;
        overlayRef.current.removeEventListener('keydown', overlayKeyDownRef.current, true);
        overlayRef.current = null;
        overlayKeyDownRef.current = null;
    };

    const attachOverlayListener = () => {
        if (!onEnterNext) return;
        const overlay = dropdownRef.current?.getOverlay?.() as HTMLElement | null;
        if (!overlay) return;
        if (overlayRef.current === overlay && overlayKeyDownRef.current) return;
        detachOverlayListener();
        overlayRef.current = overlay;
        overlayKeyDownRef.current = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            pendingEnterNextRef.current = true;
        };
        overlay.addEventListener('keydown', overlayKeyDownRef.current, true);
    };

    const handleShow = () => {
        onShow?.();
        attachOverlayListener();
    };

    const handleHide = () => {
        onHide?.();
        detachOverlayListener();
        if (!pendingEnterNextRef.current || !onEnterNext) return;
        pendingEnterNextRef.current = false;
        window.setTimeout(onEnterNext, 0);
    };

    useEffect(() => {
        return () => {
            detachOverlayListener();
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
            className={classNames('app-dropdown', className)}
            onKeyDown={handleKeyDown}
            showOnFocus={resolvedShowOnFocus}
            onShow={handleShow}
            onHide={handleHide}
            pt={resolvedPt}
        />
    );
});

AppDropdown.displayName = 'AppDropdown';

export default AppDropdown;
