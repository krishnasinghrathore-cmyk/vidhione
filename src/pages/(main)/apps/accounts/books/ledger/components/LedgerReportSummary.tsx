import React from 'react';

type LedgerReportSummaryProps = {
    errorMessage: string | null;
};

export function LedgerReportSummary({ errorMessage }: LedgerReportSummaryProps) {
    return (
        <div className="flex flex-column gap-2 mb-3 report-screen-header">
            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                <div>
                    <h2 className="m-0">Ledger Statement</h2>
                    <p className="mt-2 mb-0 text-600">
                        Ledger book using voucher postings. Select a ledger and apply date/voucher filters.
                    </p>
                </div>
            </div>
            {errorMessage && <p className="text-red-500 m-0">Error loading ledger report: {errorMessage}</p>}
        </div>
    );
}
