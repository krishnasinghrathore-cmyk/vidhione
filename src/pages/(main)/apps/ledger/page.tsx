'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';

const QUICK_LINKS = [
    { label: 'Voucher Entry', icon: 'pi pi-pencil', to: '/apps/accounts/voucher-entry', outlined: false },
    { label: 'Ledgers', icon: 'pi pi-book', to: '/apps/accounts/ledgers', outlined: true },
    { label: 'Ledger Groups', icon: 'pi pi-sitemap', to: '/apps/accounts/ledger-groups', outlined: true },
    { label: 'Day Book', icon: 'pi pi-calendar', to: '/apps/accounts/day-book', outlined: true },
    { label: 'Ledger Statement', icon: 'pi pi-file', to: '/apps/accounts/ledger', outlined: true },
    { label: 'Trial Balance', icon: 'pi pi-chart-line', to: '/apps/accounts/trial-balance', outlined: true },
    { label: 'Balance Sheet', icon: 'pi pi-chart-bar', to: '/apps/accounts/balance-sheet', outlined: true },
    { label: 'Profit & Loss', icon: 'pi pi-percentage', to: '/apps/accounts/profit-loss', outlined: true },
    { label: 'Book Printing', icon: 'pi pi-print', to: '/apps/accounts/book-printing', outlined: true },
    { label: 'Report Templates', icon: 'pi pi-file-edit', to: '/apps/accounts/report-templates', outlined: true },
    { label: 'Ledger Reconciliation', icon: 'pi pi-check-square', to: '/apps/accounts/ledger-reconciliation', outlined: true }
] as const;

export default function LedgerAppPage() {
    return (
        <div className="card">
            <div className="mb-3">
                <h2 className="m-0">Accounts</h2>
                <p className="mt-2 mb-0 text-600">
                    Shared accounting engine covering ledgers, vouchers, and financial reports across all industry apps.
                </p>
            </div>

            <div className="flex flex-column gap-2">
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-bolt text-600" />
                    <h3 className="m-0 text-lg">Quick Links</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {QUICK_LINKS.map((link) => (
                        <Link key={link.to} to={link.to}>
                            <Button label={link.label} icon={link.icon} className={link.outlined ? 'p-button-outlined' : undefined} />
                        </Link>
                    ))}
                    <Link to="/apps/accounts/accounts-reports">
                        <Button label="All Reports" icon="pi pi-chart-pie" className="p-button-outlined" />
                    </Link>
                </div>
                <p className="m-0 text-600 text-sm">Use the left sidebar &gt; Accounts menu for the full list of forms.</p>
            </div>
        </div>
    );
}
