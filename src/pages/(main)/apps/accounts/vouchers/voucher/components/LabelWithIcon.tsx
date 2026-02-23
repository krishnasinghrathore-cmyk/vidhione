'use client';
import React from 'react';

type LabelWithIconProps = {
    icon: string;
    className?: string;
    children: React.ReactNode;
};

export function LabelWithIcon({ icon, className, children }: LabelWithIconProps) {
    const classes = ['app-entry-label-with-icon', className].filter(Boolean).join(' ');
    const isPrimeIcon = icon.startsWith('pi-');

    return (
        <span className={classes}>
            {isPrimeIcon ? (
                <i className={`pi ${icon}`} aria-hidden="true" />
            ) : (
                <span className="app-entry-label-icon-text" aria-hidden="true">
                    {icon}
                </span>
            )}
            <span>{children}</span>
        </span>
    );
}
