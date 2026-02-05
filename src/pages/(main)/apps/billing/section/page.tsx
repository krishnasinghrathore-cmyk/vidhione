'use client';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { BILLING_MENU_MAP } from '@/config/billingMenu';
import GstSalesInvoicesPage from '../gst-sales-invoices/page';

const SECTION_COMPONENTS: Record<string, React.ReactNode> = {
    'gst-sales-invoices': <GstSalesInvoicesPage />
};

export default function BillingSectionPage() {
    const { section } = useParams();
    const entry = section ? BILLING_MENU_MAP[section] : undefined;
    const sectionView = section ? SECTION_COMPONENTS[section] : undefined;

    if (sectionView) return sectionView;
    const title = entry?.label ?? 'Billing';
    const description = entry
        ? `${entry.groupLabel} - ${entry.label} from the legacy agency app will be implemented here.`
        : 'Sales, purchases, collections, and billing reports will be implemented here.';

    return (
        <div className="card">
            <h2 className="mb-2">{title}</h2>
            <p className="text-600">{description}</p>
            {entry && (
                <div className="mt-3">
                    <Link to="/apps/billing">Back to Billing</Link>
                </div>
            )}
        </div>
    );
}
