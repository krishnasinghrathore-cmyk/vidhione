import React, { forwardRef } from 'react';
import type { MultiSelect } from 'primereact/multiselect';
import AppMultiSelect from '@/components/AppMultiSelect';
import LedgerCurrentBalanceInline, { type LedgerBalanceSeverity } from '@/components/LedgerCurrentBalanceInline';

type LedgerMultiSelectProps = React.ComponentProps<typeof AppMultiSelect> & {
    showCurrentBalanceInline?: boolean;
    currentBalanceLabel?: string | null;
    currentBalanceSeverity?: LedgerBalanceSeverity;
    currentBalanceTooltip?: string | null;
};

const LedgerMultiSelect = forwardRef<MultiSelect, LedgerMultiSelectProps>(
    ({ showCurrentBalanceInline, currentBalanceLabel, currentBalanceSeverity, currentBalanceTooltip, ...props }, ref) => (
        <LedgerCurrentBalanceInline
            show={Boolean(showCurrentBalanceInline)}
            label={currentBalanceLabel ?? null}
            severity={currentBalanceSeverity}
            tooltip={currentBalanceTooltip ?? null}
        >
            <AppMultiSelect {...props} ref={ref} />
        </LedgerCurrentBalanceInline>
    )
);

LedgerMultiSelect.displayName = 'LedgerMultiSelect';

export default LedgerMultiSelect;
