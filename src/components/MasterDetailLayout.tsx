import React from 'react';
import { classNames } from 'primereact/utils';

type MasterDetailGridProps = {
    children: React.ReactNode;
    columns?: 1 | 2 | 3;
    className?: string;
};

type MasterDetailSectionProps = {
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export function MasterDetailGrid({
    children,
    columns = 2,
    className
}: MasterDetailGridProps) {
    return (
        <div
            className={classNames(
                'app-master-detail-grid',
                `app-master-detail-grid--cols-${columns}`,
                className
            )}
        >
            {children}
        </div>
    );
}

export function MasterDetailSection({
    title,
    description,
    children,
    className
}: MasterDetailSectionProps) {
    return (
        <section className={classNames('app-master-detail-section', className)}>
            {title ? <div className="app-master-detail-section__title">{title}</div> : null}
            {description ? (
                <div className="app-master-detail-section__description">{description}</div>
            ) : null}
            {children}
        </section>
    );
}
