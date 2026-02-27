import React from 'react';

type LedgerReportSummaryProps = {
    errorMessage: string | null;
};

export function LedgerReportSummary({ errorMessage }: LedgerReportSummaryProps) {
    if (!errorMessage) {
        return null;
    }

    return <p className="text-red-500 m-0 mb-3">Error loading ledger report: {errorMessage}</p>;
}
