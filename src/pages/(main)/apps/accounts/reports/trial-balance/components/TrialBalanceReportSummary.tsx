import { classNames } from 'primereact/utils';

type TrialBalanceReportSummaryProps = {
    hasAnyDiff: boolean;
    hasOpeningDiff: boolean;
    hasPeriodDiff: boolean;
    hasClosingDiff: boolean;
    openingDiffLabel: string;
    periodDiffLabel: string;
    closingDiffLabel: string;
    errorMessage: string | null;
};

export function TrialBalanceReportSummary({
    hasAnyDiff,
    hasOpeningDiff,
    hasPeriodDiff,
    hasClosingDiff,
    openingDiffLabel,
    periodDiffLabel,
    closingDiffLabel,
    errorMessage
}: TrialBalanceReportSummaryProps) {
    return (
        <div className="flex flex-column gap-2 mb-3 report-screen-header">
            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 trial-balance-header-row">
                <div>
                    <h2 className="m-0">Trial Balance</h2>
                    <p className="mt-2 mb-0 text-600">
                        Legacy-aligned trial balance with summarized and detailed views. Use filters, then refresh to
                        match legacy output.
                    </p>
                </div>
                <div
                    className={classNames(
                        'surface-50 border-1 surface-border border-round p-2 text-sm trial-balance-diff',
                        hasAnyDiff && 'balance-diff-alert'
                    )}
                >
                    <div className="font-semibold mb-1">Balance Difference</div>
                    <div className="flex flex-column gap-1">
                        <div className="flex align-items-center justify-content-between gap-3">
                            <span>Opening</span>
                            <span className={classNames('font-semibold', hasOpeningDiff && 'balance-diff-value')}>
                                {openingDiffLabel}
                            </span>
                        </div>
                        <div className="flex align-items-center justify-content-between gap-3">
                            <span>Dr/Cr</span>
                            <span className={classNames('font-semibold', hasPeriodDiff && 'balance-diff-value')}>
                                {periodDiffLabel}
                            </span>
                        </div>
                        <div className="flex align-items-center justify-content-between gap-3">
                            <span>Closing</span>
                            <span className={classNames('font-semibold', hasClosingDiff && 'balance-diff-value')}>
                                {closingDiffLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {errorMessage && <p className="text-red-500 m-0">Error loading trial balance: {errorMessage}</p>}
        </div>
    );
}
