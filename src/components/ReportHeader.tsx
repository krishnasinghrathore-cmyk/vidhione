import React from 'react';
import { classNames } from 'primereact/utils';

type ReportHeaderProps = {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    rightSlot?: React.ReactNode;
    className?: string;
};

export function ReportHeader({ title, subtitle, rightSlot, className }: ReportHeaderProps) {
    return (
        <div className={classNames('app-report-header', className)}>
            <div className="app-report-header__left">
                <div className="app-report-header__title">{title}</div>
                {subtitle ? <div className="app-report-header__subtitle text-600">{subtitle}</div> : null}
            </div>
            {rightSlot ? <div className="app-report-header__right">{rightSlot}</div> : null}
        </div>
    );
}

