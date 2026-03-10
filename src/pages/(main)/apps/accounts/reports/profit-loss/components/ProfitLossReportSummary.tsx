import type React from 'react';
import { ReportHeader } from '@/components/ReportHeader';

type ProfitLossReportSummaryProps = {
    errorMessage: string | null;
    rightSlot?: React.ReactNode;
};

export function ProfitLossReportSummary({ errorMessage, rightSlot }: ProfitLossReportSummaryProps) {
    return (
        <div className="flex flex-column gap-2 mb-3 report-screen-header">
            <ReportHeader
                title="Trading & Profit Loss"
                subtitle="Trading and P&L account based on ledger postings for the selected period."
                rightSlot={rightSlot}
            />
            {errorMessage && <p className="text-red-500 m-0">Error loading profit &amp; loss: {errorMessage}</p>}
        </div>
    );
}
