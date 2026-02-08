'use client';
import React from 'react';
import { BalanceSheetReportContainer } from './BalanceSheetReportContainer';
import type { BalanceSheetReportProps } from './types';

export function BalanceSheetReportView(props: BalanceSheetReportProps) {
    return <BalanceSheetReportContainer {...props} />;
}

export default function BalanceSheetReport(props: BalanceSheetReportProps) {
    return <BalanceSheetReportView {...props} />;
}
