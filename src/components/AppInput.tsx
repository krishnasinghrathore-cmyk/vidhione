import React, { forwardRef } from 'react';
import { InputText, type InputTextProps } from 'primereact/inputtext';
import { InputNumber, type InputNumberProps } from 'primereact/inputnumber';
import { classNames } from 'primereact/utils';
import {
    focusNextElement,
    isEnterWithoutModifiers,
    markEnterNavAutoOpenIntent,
    queueAutoOpenFocusedOverlayControl,
    resolveEnterScope,
    shouldSkipEnterAsTabTarget
} from '@/lib/enterNavigation';

type AppInputBaseProps = {
    compact?: boolean;
    onEnterNext?: () => boolean | void;
    enterFocusNext?: boolean;
};

type AppInputProps =
    | (InputTextProps & { inputType?: 'text' } & AppInputBaseProps)
    | (InputNumberProps & { inputType: 'number' } & AppInputBaseProps);

const AppInput = forwardRef<unknown, AppInputProps>((props, ref) => {
    if (props.inputType === 'number') {
        const {
            inputType: _inputType,
            compact = true,
            className,
            inputClassName,
            onKeyDown,
            onEnterNext,
            enterFocusNext = true,
            ...rest
        } = props as InputNumberProps & {
            inputType: 'number';
            compact?: boolean;
            onEnterNext?: () => boolean | void;
            enterFocusNext?: boolean;
        };
        const handleKeyDown: InputNumberProps['onKeyDown'] = (event) => {
            onKeyDown?.(event);
            if (!enterFocusNext) return;
            if (!isEnterWithoutModifiers(event as any)) return;
            const target = event.target as HTMLElement | null;
            if (!target || shouldSkipEnterAsTabTarget(target)) return;
            event.preventDefault();
            markEnterNavAutoOpenIntent();
            const moveToNext = () => {
                focusNextElement(target, resolveEnterScope(target));
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
                            if (!activeAfter || activeAfter === activeBefore || activeAfter === target) return;
                            queueAutoOpenFocusedOverlayControl(activeAfter);
                        });
                    }
                    return;
                }
                if (typeof window !== 'undefined') {
                    window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => {
                            const activeAfter = typeof document !== 'undefined' ? document.activeElement : null;
                            if (activeAfter && activeAfter !== activeBefore && activeAfter !== target) return;
                            moveToNext();
                        });
                    });
                    return;
                }
                moveToNext();
            }, 0);
        };
        return (
            <InputNumber
                {...rest}
                ref={ref as any}
                onKeyDown={handleKeyDown}
                className={classNames('app-input', compact && 'app-input--compact', className)}
                inputClassName={classNames(inputClassName, compact && 'p-inputtext-sm')}
            />
        );
    }

    const {
        inputType: _inputType,
        compact = true,
        className,
        onKeyDown,
        onEnterNext,
        enterFocusNext = true,
        ...rest
    } = props as InputTextProps & {
        inputType?: 'text';
        compact?: boolean;
        onEnterNext?: () => boolean | void;
        enterFocusNext?: boolean;
    };
    const handleKeyDown: InputTextProps['onKeyDown'] = (event) => {
        onKeyDown?.(event);
        if (!enterFocusNext) return;
        if (!isEnterWithoutModifiers(event as any)) return;
        const target = event.target as HTMLElement | null;
        if (!target || shouldSkipEnterAsTabTarget(target)) return;
        event.preventDefault();
        markEnterNavAutoOpenIntent();
        const moveToNext = () => {
            focusNextElement(target, resolveEnterScope(target));
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
                        if (!activeAfter || activeAfter === activeBefore || activeAfter === target) return;
                        queueAutoOpenFocusedOverlayControl(activeAfter);
                    });
                }
                return;
            }
            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        const activeAfter = typeof document !== 'undefined' ? document.activeElement : null;
                        if (activeAfter && activeAfter !== activeBefore && activeAfter !== target) return;
                        moveToNext();
                    });
                });
                return;
            }
            moveToNext();
        }, 0);
    };
    return (
        <InputText
            {...rest}
            ref={ref as any}
            onKeyDown={handleKeyDown}
            className={classNames('app-input', compact && 'app-input--compact p-inputtext-sm', className)}
        />
    );
});

AppInput.displayName = 'AppInput';

export default AppInput;
