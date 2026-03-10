'use client';

import React, { useId } from 'react';
import { Tooltip } from 'primereact/tooltip';
import { classNames } from 'primereact/utils';

type AppInfoHintProps = {
    content: string;
    ariaLabel?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
};

export function AppInfoHint({
    content,
    ariaLabel = 'More information',
    position = 'top',
    className
}: AppInfoHintProps) {
    const rawId = useId();
    const targetId = `app-info-hint-${rawId.replace(/:/g, '')}`;

    return (
        <>
            <Tooltip target={`#${targetId}`} content={content} position={position} showDelay={120} hideDelay={40} />
            <button
                id={targetId}
                type="button"
                className={classNames('app-info-hint', className)}
                aria-label={ariaLabel}
                onClick={(event) => event.preventDefault()}
            >
                <i className="pi pi-info-circle" aria-hidden="true" />
            </button>
        </>
    );
}

