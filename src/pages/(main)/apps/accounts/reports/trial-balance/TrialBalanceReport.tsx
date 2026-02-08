'use client';
import React from 'react';
import { TrialBalanceReportContainer } from './TrialBalanceReportContainer';
import type { TrialBalanceReportProps } from './types';

export function TrialBalanceReportView(props: TrialBalanceReportProps) {
    return <TrialBalanceReportContainer {...props} />;
}

export default function TrialBalanceReport(props: TrialBalanceReportProps) {
    return <TrialBalanceReportView {...props} />;
}
