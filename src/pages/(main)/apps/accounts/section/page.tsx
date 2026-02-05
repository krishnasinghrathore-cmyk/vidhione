'use client';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ACCOUNTS_MENU_MAP } from '@/config/accountsMenu';
import AccountsUsersPage from '../users/page';
import AccountsManagersPage from '../managers/page';
import AccountsSalesmenPage from '../salesmen/page';
import AccountsBanksPage from '../banks/page';
import AccountsBranchesPage from '../branches/page';
import AccountsAreasPage from '../areas/page';
import AccountsCitiesPage from '../cities/page';
import AccountsDistrictsPage from '../districts/page';
import AccountsStatesPage from '../states/page';
import AccountsCompaniesPage from '../companies/page';
import AccountsFormsPage from '../forms/page';
import AccountsPaymentViaPage from '../payment-via/page';

const SECTION_COMPONENTS: Record<string, React.ReactNode> = {
    users: <AccountsUsersPage />,
    managers: <AccountsManagersPage />,
    salesmen: <AccountsSalesmenPage />,
    banks: <AccountsBanksPage />,
    branches: <AccountsBranchesPage />,
    areas: <AccountsAreasPage />,
    cities: <AccountsCitiesPage />,
    districts: <AccountsDistrictsPage />,
    states: <AccountsStatesPage />,
    companies: <AccountsCompaniesPage />,
    forms: <AccountsFormsPage />,
    'payment-via': <AccountsPaymentViaPage />
};

export default function AccountsSectionPage() {
    const { section } = useParams();
    const entry = section ? ACCOUNTS_MENU_MAP[section] : undefined;
    const sectionView = section ? SECTION_COMPONENTS[section] : undefined;

    if (sectionView) return sectionView;
    const title = entry?.label ?? 'Accounts';
    const description = entry
        ? `${entry.groupLabel} - ${entry.label} from the legacy agency app will be implemented here.`
        : 'Additional account masters and utilities will be implemented here.';

    return (
        <div className="card">
            <h2 className="mb-2">{title}</h2>
            <p className="text-600">{description}</p>
            {entry && (
                <div className="mt-3">
                    <Link to="/apps/accounts">Back to Accounts</Link>
                </div>
            )}
        </div>
    );
}
