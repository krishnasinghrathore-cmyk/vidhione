'use client';
import React from 'react';
import { classNames } from 'primereact/utils';

type AppNotchedFieldProps = {
    label: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    labelClassName?: string;
    style?: React.CSSProperties;
    htmlFor?: string;
};

export function AppNotchedField({
    label,
    children,
    className,
    labelClassName,
    style,
    htmlFor
}: AppNotchedFieldProps) {
    const resolvedLabelClassName = classNames('app-notched-input__label', labelClassName);

    return (
        <div className={classNames('app-notched-input', className)} style={style}>
            {htmlFor ? (
                <label htmlFor={htmlFor} className={resolvedLabelClassName}>
                    {label}
                </label>
            ) : (
                <span className={resolvedLabelClassName}>{label}</span>
            )}
            {children}
        </div>
    );
}
