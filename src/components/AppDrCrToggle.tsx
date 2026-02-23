'use client';
import React from 'react';
import { classNames } from 'primereact/utils';

export type AppDrCrValue = 'Dr' | 'Cr';

type AppDrCrToggleProps = {
    value: AppDrCrValue;
    onChange?: (value: AppDrCrValue) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
    ariaLabel?: string;
};

const getNextDrCr = (value: AppDrCrValue): AppDrCrValue => (value === 'Cr' ? 'Dr' : 'Cr');
const FOCUSABLE_SELECTOR = [
    'button',
    '[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

const isFocusableElement = (element: HTMLElement) => {
    if (element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    if (element.tabIndex < 0) return false;
    if (element.getAttribute('hidden') != null) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (element.offsetParent === null && style.position !== 'fixed') return false;
    return true;
};

const focusNextElement = (current: HTMLElement) => {
    const documentRef = current.ownerDocument;
    const focusables = Array.from(documentRef.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        isFocusableElement
    );
    const index = focusables.indexOf(current);
    if (index < 0) return;
    focusables[index + 1]?.focus();
};

const AppDrCrToggle = React.forwardRef<HTMLButtonElement, AppDrCrToggleProps>(({
    value,
    onChange,
    disabled = false,
    className,
    id,
    ariaLabel
}, ref) => {
    const canToggle = Boolean(onChange) && !disabled;
    const handleClick = React.useCallback(() => {
        if (!onChange || disabled) return;
        onChange(getNextDrCr(value));
    }, [disabled, onChange, value]);
    const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        focusNextElement(event.currentTarget);
    }, []);

    return (
        <button
            ref={ref}
            id={id}
            type="button"
            className={classNames('app-drcr-toggle', canToggle && 'app-drcr-toggle--interactive', className)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label={ariaLabel ?? 'Dr Cr toggle'}
            aria-pressed={canToggle ? value === 'Cr' : undefined}
            title={canToggle ? 'Press Space to toggle Dr/Cr' : undefined}
        >
            {value}
        </button>
    );
});

AppDrCrToggle.displayName = 'AppDrCrToggle';

export default AppDrCrToggle;
