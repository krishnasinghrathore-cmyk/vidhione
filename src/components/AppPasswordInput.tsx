import React from 'react';
import { type InputTextProps } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import AppInput from './AppInput';

type AppPasswordInputProps = Omit<InputTextProps, 'type' | 'className' | 'style'> & {
    visible: boolean;
    onToggleVisibility: () => void;
    compact?: boolean;
    className?: string;
    style?: React.CSSProperties;
    inputClassName?: string;
    inputStyle?: React.CSSProperties;
    onEnterNext?: () => boolean | void;
    enterFocusNext?: boolean;
};

const AppPasswordInput = ({
    visible,
    onToggleVisibility,
    compact = true,
    className,
    style,
    inputClassName,
    inputStyle,
    disabled,
    readOnly,
    autoComplete = 'new-password',
    onEnterNext,
    enterFocusNext = true,
    ...inputProps
}: AppPasswordInputProps) => {
    const toggleDisabled = Boolean(disabled || readOnly);

    return (
        <span className={classNames('app-password-input p-inputgroup', compact && 'app-password-input--compact', className)} style={style}>
            <AppInput
                {...inputProps}
                type={visible ? 'text' : 'password'}
                compact={compact}
                className={inputClassName}
                style={{ width: '100%', ...(inputStyle ?? {}) }}
                disabled={disabled}
                readOnly={readOnly}
                autoComplete={autoComplete}
                onEnterNext={onEnterNext}
                enterFocusNext={enterFocusNext}
            />
            <button
                type="button"
                className="app-password-input__toggle"
                onClick={onToggleVisibility}
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                disabled={toggleDisabled}
                tabIndex={-1}
            >
                <i className={classNames('pi', visible ? 'pi-eye-slash' : 'pi-eye')} />
            </button>
        </span>
    );
};

export default AppPasswordInput;
