import React from 'react';

export type LedgerBalanceSeverity = 'success' | 'warning' | 'info' | 'danger' | 'secondary';

type LedgerCurrentBalanceInlineProps = {
    show?: boolean;
    label?: string | null;
    severity?: LedgerBalanceSeverity;
    tooltip?: string | null;
    children: React.ReactNode;
};

const resolveSeverityClassName = (severity: LedgerBalanceSeverity | undefined): string => {
    switch (severity) {
        case 'danger':
            return 'text-red-600';
        case 'warning':
            return 'text-yellow-600';
        case 'secondary':
            return 'text-600';
        default:
            return 'text-green-600';
    }
};

const LedgerCurrentBalanceInline = ({ show = false, label, severity, tooltip, children }: LedgerCurrentBalanceInlineProps) => {
    if (!show || !label) return <>{children}</>;
    return (
        <div className="flex flex-column gap-1 min-w-0">
            <div
                className={`text-sm font-semibold text-right ${resolveSeverityClassName(severity)}`}
                title={tooltip ?? undefined}
            >
                {label}
            </div>
            {children}
        </div>
    );
};

export default LedgerCurrentBalanceInline;
