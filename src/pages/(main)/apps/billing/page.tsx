'use client';
import React, { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/context';
import { PurchaseInvoicesTab } from './PurchaseInvoicesTab';
import { SalesInvoicesTab } from './SalesInvoicesTab';
import { getSalesProfileFlags, getSalesProfileLabel } from './salesProfile';
import { useLedgerLookup } from './useLedgerLookup';

export default function BillingAppPage() {
    const navigate = useNavigate();
    const { tenantSettings } = useAuth();

    const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');

    const ledgerLookup = useLedgerLookup();

    const salesProfileKey = tenantSettings?.salesInvoiceProfileKey ?? null;
    const salesProfileLabel = useMemo(() => getSalesProfileLabel(salesProfileKey), [salesProfileKey]);
    const { taxLocked } = useMemo(() => getSalesProfileFlags(salesProfileKey), [salesProfileKey]);

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                        <div>
                            <h2 className="mb-2">Billing (Client Invoices)</h2>
                            <p className="text-600 m-0">
                                Sales invoice profile is fixed per tenant: <span className="font-medium">{salesProfileLabel}</span>
                            </p>
                            <div className="mt-2">
                                <Tag value={taxLocked ? 'NO TAX' : 'TAXABLE'} severity={taxLocked ? 'info' : 'success'} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-content-end">
                            <Button label="Sales" outlined={activeTab !== 'sales'} onClick={() => setActiveTab('sales')} />
                            <Button
                                label="Purchases"
                                outlined={activeTab !== 'purchases'}
                                onClick={() => setActiveTab('purchases')}
                            />
                            <Button
                                icon="pi pi-shopping-cart"
                                label="App Marketplace"
                                outlined
                                onClick={() => navigate('/apps/marketplace')}
                            />
                        </div>
                    </div>

                    {activeTab === 'sales' ? (
                        <SalesInvoicesTab salesProfileKey={salesProfileKey} ledgerLookup={ledgerLookup} />
                    ) : (
                        <PurchaseInvoicesTab ledgerLookup={ledgerLookup} />
                    )}
                </div>
            </div>
        </div>
    );
}

