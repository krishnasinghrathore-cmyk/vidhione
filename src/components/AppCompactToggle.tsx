'use client';
import React from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { classNames } from 'primereact/utils';

type AppCompactToggleProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    onLabel?: React.ReactNode;
    offLabel?: React.ReactNode;
    inputId?: string;
    disabled?: boolean;
    className?: string;
    switchClassName?: string;
    labelClassName?: string;
};

const AppCompactToggle = React.forwardRef<HTMLInputElement, AppCompactToggleProps>(({
    checked,
    onChange,
    onLabel = 'Enabled',
    offLabel = 'Disabled',
    inputId,
    disabled = false,
    className,
    switchClassName,
    labelClassName
}, ref) => {
    return (
        <div className={classNames('app-compact-toggle', className)}>
            <InputSwitch
                ref={ref}
                inputId={inputId}
                checked={checked}
                onChange={(event) => onChange(!!event.value)}
                disabled={disabled}
                className={classNames('app-inputswitch app-compact-toggle__switch', switchClassName)}
            />
            <span className={classNames('app-compact-toggle__label', labelClassName)}>
                {checked ? onLabel : offLabel}
            </span>
        </div>
    );
});

AppCompactToggle.displayName = 'AppCompactToggle';

export default AppCompactToggle;
