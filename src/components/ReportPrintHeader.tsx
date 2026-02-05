import React from 'react';
import { classNames } from 'primereact/utils';

type ReportPrintHeaderProps = {
    companyName?: string | null;
    companyAddress?: string | null;
    title?: string | null;
    subtitle?: string | null;
    className?: string;
};

export const ReportPrintHeader = ({
    companyName,
    companyAddress,
    title,
    subtitle,
    className
}: ReportPrintHeaderProps) => {
    if (!companyName && !companyAddress && !title && !subtitle) return null;

    return (
        <div className={classNames('report-print-header', className)}>
            {companyName && <div className="report-print-company">{companyName}</div>}
            {companyAddress && <div className="report-print-address">{companyAddress}</div>}
            {title && <div className="report-print-title">{title}</div>}
            {subtitle && <div className="report-print-subtitle">{subtitle}</div>}
        </div>
    );
};
