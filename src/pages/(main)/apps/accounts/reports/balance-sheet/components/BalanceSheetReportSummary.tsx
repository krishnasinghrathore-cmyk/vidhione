type BalanceSheetReportSummaryProps = {
    errorMessage: string | null;
};

export function BalanceSheetReportSummary({ errorMessage }: BalanceSheetReportSummaryProps) {
    return (
        <div className="flex flex-column gap-2 mb-3 report-screen-header">
            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                <div>
                    <h2 className="m-0">Balance Sheet</h2>
                    <p className="mt-2 mb-0 text-600">
                        Balance sheet grouped by ledger group with optional ledger detail.
                    </p>
                </div>
            </div>
            {errorMessage && <p className="text-red-500 m-0">Error loading balance sheet: {errorMessage}</p>}
        </div>
    );
}
