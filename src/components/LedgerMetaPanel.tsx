import React from 'react';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';

type LedgerMetaPanelProps = {
    address?: string | null;
    balanceLabel?: string | null;
    balanceSeverity?: 'success' | 'warning' | 'info' | 'danger' | 'secondary';
    showBalance?: boolean;
    className?: string;
};

const LedgerMetaPanel = ({
    address,
    balanceLabel,
    balanceSeverity,
    showBalance = false,
    className
}: LedgerMetaPanelProps) => {
    if (!address && !showBalance) return null;

    return (
        <div className={classNames('flex align-items-center gap-2 ledger-meta-panel', className)}>
            <div className="flex align-items-center border-1 surface-border border-round surface-card px-3 py-2 ledger-meta-address">
                <span className="text-700 text-sm">{address?.trim() || 'Address not available'}</span>
            </div>
            {showBalance && balanceLabel && (
                <div className="flex align-items-center gap-2 ledger-meta-balance">
                    <Tag value="Current Balance" severity="info" />
                    <Tag value={balanceLabel} severity={balanceSeverity ?? 'success'} />
                </div>
            )}
        </div>
    );
};

export default LedgerMetaPanel;
