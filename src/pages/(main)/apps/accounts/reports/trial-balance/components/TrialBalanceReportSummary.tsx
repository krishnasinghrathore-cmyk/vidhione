import type React from 'react';
import { ReportHeader } from '@/components/ReportHeader';

type TrialBalanceReportSummaryProps = {
    errorMessage: string | null;
    rightSlot?: React.ReactNode;
};

export function TrialBalanceReportSummary({
    errorMessage,
    rightSlot
}: TrialBalanceReportSummaryProps) {
    return (
        <div className="flex flex-column gap-2 mb-3 report-screen-header">
            <ReportHeader
                title="Trial Balance"
                subtitle="Legacy-aligned trial balance with summarized and detailed views. Use filters, then refresh to match legacy output."
                rightSlot={rightSlot}
            />
            {errorMessage && <p className="text-red-500 m-0">Error loading trial balance: {errorMessage}</p>}
        </div>
    );
}
