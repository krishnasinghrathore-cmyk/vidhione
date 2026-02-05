'use client';
import React, { useContext, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import { LayoutContext } from '@/layout/context/layoutcontext';

const REPORT_LINKS = [
    { label: 'Day Book', path: '/apps/accounts/day-book' },
    { label: 'Ledger Statement', path: '/apps/accounts/ledger' },
    { label: 'Ledger Month-wise Summary', path: '/apps/accounts/ledger/month-wise-summary' },
    { label: 'Trial Balance', path: '/apps/accounts/trial-balance' },
    { label: 'Balance Sheet', path: '/apps/accounts/balance-sheet' },
    { label: 'Profit & Loss', path: '/apps/accounts/profit-loss' },
    { label: 'Audit (Posting Details)', path: '/apps/accounts/audit' },
    { label: 'Ledger Reconciliation', path: '/apps/accounts/ledger-reconciliation' }
];

export default function AccountsReportsHubPage() {
    const { setPageTitle } = useContext(LayoutContext);

    useEffect(() => {
        setPageTitle('Accounts Reports');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    return (
        <div className="card">
            <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                <div>
                    <h2 className="m-0">Accounts Reports</h2>
                    <p className="mt-2 mb-0 text-600">
                        Reports hub for quick navigation across Accounts reports.
                    </p>
                </div>
                <Link to="/apps/accounts">
                    <Button label="Back to Accounts" icon="pi pi-arrow-left" className="p-button-outlined" />
                </Link>
            </div>

            <div className="mt-4 flex flex-column gap-2">
                {REPORT_LINKS.map((r) => (
                    <div key={r.path} className="flex align-items-center justify-content-between">
                        <span className="text-700">{r.label}</span>
                        <Link to={r.path}>
                            <Button label="Open" icon="pi pi-arrow-right" className="p-button-text" />
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
