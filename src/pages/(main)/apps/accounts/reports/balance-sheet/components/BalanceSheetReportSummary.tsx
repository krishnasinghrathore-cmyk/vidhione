import type React from 'react';
import { ReportHeader } from '@/components/ReportHeader';

type BalanceSheetReportSummaryProps = {
    errorMessage: string | null;
    rightSlot?: React.ReactNode;
};

export function BalanceSheetReportSummary({ errorMessage, rightSlot }: BalanceSheetReportSummaryProps) {
    return (
        <div className="flex flex-column gap-2 mb-3 report-screen-header">
            <ReportHeader
                title="Balance Sheet"
                subtitle="Balance sheet grouped by ledger group with optional ledger detail."
                rightSlot={rightSlot}
            />
            {errorMessage && <p className="text-red-500 m-0">Error loading balance sheet: {errorMessage}</p>}
        </div>
    );
}
