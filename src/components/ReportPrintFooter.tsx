import React from 'react';
import { classNames } from 'primereact/utils';

type ReportPrintFooterProps = {
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
};

export const ReportPrintFooter = ({ left, center, right, className }: ReportPrintFooterProps) => {
    if (!left && !center && !right) return null;

    return (
        <div className={classNames('report-print-footer', className)}>
            <div className="report-print-footer-left">{left}</div>
            <div className="report-print-footer-center">{center}</div>
            <div className="report-print-footer-right">
                {right ?? (
                    <>
                        Page <span className="report-print-page-number" />
                    </>
                )}
            </div>
        </div>
    );
};
