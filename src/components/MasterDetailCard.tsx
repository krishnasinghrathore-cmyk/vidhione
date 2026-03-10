import React from 'react';
import { classNames } from 'primereact/utils';

type MasterDetailCardProps = {
    label: React.ReactNode;
    value: React.ReactNode;
    className?: string;
    valueClassName?: string;
};

export function MasterDetailCard({
    label,
    value,
    className,
    valueClassName
}: MasterDetailCardProps) {
    return (
        <div className={classNames('surface-50 border-1 surface-border border-round p-3 h-full app-master-detail-card', className)}>
            <div className="text-500 text-xs mb-2">{label}</div>
            <div className={classNames('text-900 font-semibold app-master-detail-card__value', valueClassName)}>
                {value}
            </div>
        </div>
    );
}
