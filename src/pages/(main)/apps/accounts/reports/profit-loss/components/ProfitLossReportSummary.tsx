type ProfitLossReportSummaryProps = {
    errorMessage: string | null;
};

export function ProfitLossReportSummary({ errorMessage }: ProfitLossReportSummaryProps) {
    return (
        <div className="flex flex-column gap-2 mb-3 report-screen-header">
            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                <div>
                    <h2 className="m-0">Trading &amp; Profit Loss</h2>
                    <p className="mt-2 mb-0 text-600">
                        Trading and P&amp;L account based on ledger postings for the selected period.
                    </p>
                </div>
            </div>
            {errorMessage && <p className="text-red-500 m-0">Error loading profit &amp; loss: {errorMessage}</p>}
        </div>
    );
}
