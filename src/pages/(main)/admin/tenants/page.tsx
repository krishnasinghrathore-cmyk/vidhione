'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppMultiSelect from '@/components/AppMultiSelect';
import { useAuth } from '@/lib/auth/context';
import * as authApi from '@/lib/auth/api';
import type {
    SalesInvoiceProfileOptions,
    TenantMigrationResult,
    TextileCapabilities,
    TextilePresetKey
} from '@/lib/auth/api';
import {
    defaultTextilePresetKey,
    isTextileIndustry,
    normalizeTextileCapabilities,
    resolveTextileCapabilities,
    type TextileCapabilityKey,
    type TextileCapabilityState
} from '@/lib/textile/config';
import { APPS } from '@/config/appsConfig';
import { getSalesInvoiceProfilePolicy } from '../../apps/billing/salesProfile';
import { TextileTenantSettingsPanel } from './TextileTenantSettingsPanel';

type TenantRow = {
    id: string;
    tenantCode: string | null;
    name: string;
    industry: string | null;
    isActive: boolean;
    databaseUrl: string | null;
    migrationDatabaseUrl: string | null;
    hasUsers?: boolean | null;
    hasDatabase?: boolean | null;
    hasBilling?: boolean | null;
    isLocked?: boolean | null;
    salesInvoiceProfileKey?: string | null;
    purchaseInvoiceProfileKey?: string | null;
    salesInvoiceProfileOptions?: SalesInvoiceProfileOptions;
    textilePresetKey?: TextilePresetKey | null;
    textileCapabilities?: TextileCapabilities;
};

type EditableSalesInvoiceProfileOptions = {
    showTaxColumns: boolean;
    showTypeDetails: boolean;
    showAdditionalTaxation: boolean;
    showSchemeToggle: boolean;
    showBizomInvoiceField: boolean;
    showInterStateToggle: boolean;
    transportEnabled: boolean;
    transportDefaultApplied: boolean;
    showTransporterField: boolean;
    requireTransporterWhenApplied: boolean;
    dryCheckRequired: boolean;
    strictPostingParity: boolean;
    linkedEstimateEnabled: boolean;
    linkedCreditNoteEnabled: boolean;
    linkedDebitNoteEnabled: boolean;
    salesmanMode: 'none' | 'single' | 'dual';
};

const SALES_INVOICE_PROFILE_KEY_OPTIONS = [
    { label: 'Agency • GST Invoice', value: 'agency_sales_gst_v1' },
    { label: 'Textile • GST Invoice', value: 'textile_sales_gst_v1' },
    { label: 'Retail • GST Invoice', value: 'retail_sales_gst_v1' },
    { label: 'Media • No Tax Invoice', value: 'media_sales_no_tax_v1' },
    { label: 'Restaurant • Single Invoice', value: 'restaurant_sales_single_v1' },
    { label: 'Restaurant • Split Invoice', value: 'restaurant_sales_split_v1' }
];

const TEXTILE_SALES_PROFILE_KEY = 'textile_sales_gst_v1';
const TEXTILE_SALES_PROFILE_KEY_COMPAT = 'textile_sales_gst2_v1';

const normalizeSalesInvoiceProfileKey = (salesProfileKey: string | null | undefined) => {
    if (salesProfileKey == null) return null;
    const normalized = salesProfileKey.trim();
    if (!normalized) return null;
    if (normalized === TEXTILE_SALES_PROFILE_KEY_COMPAT) return TEXTILE_SALES_PROFILE_KEY;
    return normalized;
};

const PURCHASE_INVOICE_PROFILE_KEY_OPTIONS = [
    { label: 'Purchase • Common', value: 'purchase_common_v1' }
];

const SALESMAN_MODE_OPTIONS = [
    { label: 'None', value: 'none' },
    { label: 'Single', value: 'single' },
    { label: 'Dual', value: 'dual' }
];

const resolveEditableSalesProfileOptions = (
    salesInvoiceProfileKey: string | null,
    runtimeOptions: SalesInvoiceProfileOptions
): EditableSalesInvoiceProfileOptions => {
    const policy = getSalesInvoiceProfilePolicy(salesInvoiceProfileKey, runtimeOptions ?? null);
    return {
        showTaxColumns: policy.pricing.showTaxColumns,
        showTypeDetails: policy.lineEntry.showTypeDetails,
        showAdditionalTaxation: policy.lineEntry.showAdditionalTaxation,
        showSchemeToggle: policy.header.showSchemeToggle,
        showBizomInvoiceField: policy.header.showBizomInvoiceField,
        showInterStateToggle: policy.header.showInterStateToggle,
        transportEnabled: policy.transport.enabled,
        transportDefaultApplied: policy.transport.defaultApplied,
        showTransporterField: policy.transport.showTransporterField,
        requireTransporterWhenApplied: policy.transport.requireTransporterWhenApplied,
        dryCheckRequired: policy.validation.dryCheckRequired,
        strictPostingParity: policy.validation.strictPostingParity,
        linkedEstimateEnabled: policy.linkedActions.estimate,
        linkedCreditNoteEnabled: policy.linkedActions.creditNote,
        linkedDebitNoteEnabled: policy.linkedActions.debitNote,
        salesmanMode: policy.header.salesmanMode
    };
};

export default function AdminTenantsPage() {
    const navigate = useNavigate();
    const { tenantId: currentTenantId, launchTenant, exitTenant } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [tenants, setTenants] = useState<TenantRow[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createIndustry, setCreateIndustry] = useState<string | null>(null);

    const [dbOpen, setDbOpen] = useState(false);
    const [dbTenant, setDbTenant] = useState<TenantRow | null>(null);
    const [dbUrl, setDbUrl] = useState('');
    const [migrationDbUrl, setMigrationDbUrl] = useState('');

    const [appsOpen, setAppsOpen] = useState(false);
    const [appsTenant, setAppsTenant] = useState<TenantRow | null>(null);
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

    const [editOpen, setEditOpen] = useState(false);
    const [editTenant, setEditTenant] = useState<TenantRow | null>(null);
    const [editName, setEditName] = useState('');
    const [editIndustry, setEditIndustry] = useState<string | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileTenant, setProfileTenant] = useState<TenantRow | null>(null);
    const [profileSalesInvoiceKey, setProfileSalesInvoiceKey] = useState<string | null>(null);
    const [profilePurchaseInvoiceKey, setProfilePurchaseInvoiceKey] = useState<string>('purchase_common_v1');
    const [profileSalesOptions, setProfileSalesOptions] = useState<EditableSalesInvoiceProfileOptions>(() =>
        resolveEditableSalesProfileOptions(null, null)
    );
    const [profileTextilePresetKey, setProfileTextilePresetKey] = useState<TextilePresetKey | null>(null);
    const [profileTextileCapabilities, setProfileTextileCapabilities] = useState<TextileCapabilityState>(() =>
        normalizeTextileCapabilities(null)
    );

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTenant, setDeleteTenant] = useState<TenantRow | null>(null);

    const [migrateOpen, setMigrateOpen] = useState(false);
    const [migrateTenant, setMigrateTenant] = useState<TenantRow | null>(null);
    const [migrateAllOpen, setMigrateAllOpen] = useState(false);
    const [migrationResults, setMigrationResults] = useState<TenantMigrationResult[]>([]);
    const [migrationSummaryOpen, setMigrationSummaryOpen] = useState(false);

    const industryApps = useMemo(() => APPS.filter((app) => app.category === 'industry'), []);
    const coreApps = useMemo(() => APPS.filter((app) => app.category === 'core'), []);
    const addOnApps = useMemo(() => APPS.filter((app) => app.category === 'addon'), []);

    const industryOptions = useMemo(
        () => industryApps.map((app) => ({ label: app.name, value: app.id })),
        [industryApps]
    );
    const addOnOptions = useMemo(
        () => addOnApps.map((app) => ({ label: app.name, value: app.id })),
        [addOnApps]
    );

    const resolveIndustryLabel = useCallback(
        (industry: string | null) => {
            if (!industry) return '-';
            const key = industry.trim().toLowerCase();
            return industryApps.find((app) => app.id === key)?.name ?? industry;
        },
        [industryApps]
    );

    const resolveIndustryPath = useCallback(
        (industry: string | null) => {
            if (!industry) return '/';
            const key = industry.trim().toLowerCase();
            return industryApps.find((app) => app.id === key)?.path ?? '/';
        },
        [industryApps]
    );

    const baseAppsForTenant = useMemo(() => {
        if (!appsTenant) return [];
        const industryKey = appsTenant.industry?.trim().toLowerCase() ?? null;
        const industryApp = industryKey ? industryApps.find((app) => app.id === industryKey) : null;
        return industryApp ? [industryApp, ...coreApps] : [...coreApps];
    }, [appsTenant, coreApps, industryApps]);

    const isTenantLocked = useCallback((row: TenantRow) => {
        if (row.isLocked != null) return Boolean(row.isLocked);
        return Boolean(row.hasUsers || row.hasDatabase || row.hasBilling);
    }, []);

    const tenantLockedReason = useCallback((row: TenantRow) => {
        const reasons: string[] = [];
        if (row.hasUsers) reasons.push('users assigned');
        if (row.hasDatabase) reasons.push('database configured');
        if (row.hasBilling) reasons.push('billing records');
        if (!reasons.length && row.isLocked) reasons.push('in use');
        if (!reasons.length) return null;
        return `Locked (${reasons.join(', ')})`;
    }, []);

    const loadTenants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await authApi.listTenants();
            setTenants(
                result.items.map((row) => ({
                    ...row,
                    salesInvoiceProfileKey: normalizeSalesInvoiceProfileKey(row.salesInvoiceProfileKey)
                }))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tenants');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTenants();
    }, [loadTenants]);

    const openDbDialog = (row: TenantRow) => {
        setDbTenant(row);
        setDbUrl('');
        setMigrationDbUrl('');
        setDbOpen(true);
    };

    const openAppsDialog = async (row: TenantRow) => {
        setAppsTenant(row);
        setAppsOpen(true);
        setLoading(true);
        setError(null);
        try {
            const result = await authApi.getTenantApps(row.id);
            const addOnKeys = new Set(addOnApps.map((app) => app.id));
            const enabledAddOns = result.items
                .filter((item) => addOnKeys.has(item.appKey) && item.isEnabled)
                .map((item) => item.appKey);
            setSelectedAddOns(enabledAddOns);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tenant apps');
            setSelectedAddOns([]);
        } finally {
            setLoading(false);
        }
    };

    const openEditDialog = (row: TenantRow) => {
        setEditTenant(row);
        setEditName(row.name);
        setEditIndustry(row.industry ?? null);
        setEditOpen(true);
    };

    const openProfileDialog = (row: TenantRow) => {
        const salesInvoiceKey = normalizeSalesInvoiceProfileKey(row.salesInvoiceProfileKey);
        const purchaseInvoiceKey = row.purchaseInvoiceProfileKey ?? 'purchase_common_v1';
        const textilePresetKey = row.textilePresetKey ?? defaultTextilePresetKey(row.industry);
        setProfileTenant(row);
        setProfileSalesInvoiceKey(salesInvoiceKey);
        setProfilePurchaseInvoiceKey(purchaseInvoiceKey);
        setProfileSalesOptions(resolveEditableSalesProfileOptions(salesInvoiceKey, row.salesInvoiceProfileOptions ?? null));
        setProfileTextilePresetKey(textilePresetKey);
        setProfileTextileCapabilities(resolveTextileCapabilities(textilePresetKey, row.textileCapabilities ?? null));
        setProfileOpen(true);
    };

    const resetProfileDialog = () => {
        setProfileOpen(false);
        setProfileTenant(null);
        setProfileSalesInvoiceKey(null);
        setProfilePurchaseInvoiceKey('purchase_common_v1');
        setProfileSalesOptions(resolveEditableSalesProfileOptions(null, null));
        setProfileTextilePresetKey(null);
        setProfileTextileCapabilities(normalizeTextileCapabilities(null));
    };

    const openDeleteDialog = (row: TenantRow) => {
        setDeleteTenant(row);
        setDeleteOpen(true);
    };

    const openMigrateDialog = (row: TenantRow) => {
        setMigrateTenant(row);
        setMigrateOpen(true);
    };

    const openMigrateAllDialog = () => {
        setMigrateAllOpen(true);
    };

    const launchDisabledReason = (row: TenantRow) => {
        if (!row.isActive) return 'Inactive tenant';
        if (!row.hasUsers) return 'No users assigned';
        if (!row.databaseUrl) return 'Database not configured';
        return null;
    };

    const header = useMemo(
        () => (
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                <div>
                    <h2 className="m-0">Superadmin • Tenants</h2>
                    <p className="mt-2 mb-0 text-500">Create tenants, set DB URLs, and launch their workspace.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-content-end">
                    {currentTenantId && (
                        <Button
                            icon="pi pi-sign-out"
                            label="Exit Tenant"
                            outlined
                            onClick={async () => {
                                await exitTenant();
                                await loadTenants();
                            }}
                        />
                    )}
                    <Button icon="pi pi-cog" label="Migrate All" outlined onClick={openMigrateAllDialog} />
                    <Button icon="pi pi-refresh" label="Refresh" outlined onClick={loadTenants} />
                    <Button icon="pi pi-plus" label="New Tenant" onClick={() => setCreateOpen(true)} />
                </div>
            </div>
        ),
        [currentTenantId, exitTenant, loadTenants, openMigrateAllDialog]
    );

    const statusBody = (row: TenantRow) => {
        return (
            <div className="flex align-items-center gap-2">
                <Tag value={row.isActive ? 'ACTIVE' : 'INACTIVE'} severity={row.isActive ? 'success' : 'danger'} />
                <InputSwitch
                    checked={row.isActive}
                    disabled={loading}
                    onChange={async (e) => {
                        setLoading(true);
                        setError(null);
                        try {
                            await authApi.setTenantActive({ tenantId: row.id, isActive: Boolean(e.value) });
                            setTenants((prev) => prev.map((t) => (t.id === row.id ? { ...t, isActive: Boolean(e.value) } : t)));
                        } catch (err) {
                            setError(err instanceof Error ? err.message : 'Update failed');
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            </div>
        );
    };

    const dbBody = (row: TenantRow) => {
        return (
            <div className="flex flex-column">
                <Tag value={row.databaseUrl ? 'CONFIGURED' : 'MISSING'} severity={row.databaseUrl ? 'info' : 'warning'} />
                {row.databaseUrl && <small className="text-500 mt-1">App: {row.databaseUrl}</small>}
                {row.migrationDatabaseUrl && <small className="text-500 mt-1">Migration: {row.migrationDatabaseUrl}</small>}
            </div>
        );
    };

    const actionsBody = (row: TenantRow) => {
        const disabledReason = launchDisabledReason(row);
        const lockedReason = tenantLockedReason(row);
        const isLocked = isTenantLocked(row);
        return (
            <div className="flex flex-wrap gap-2">
                <Button
                    icon="pi pi-play"
                    label="Launch"
                    disabled={!!disabledReason}
                    tooltip={disabledReason || 'Launch tenant workspace'}
                    tooltipOptions={{ position: 'top' }}
                    onClick={async () => {
                        setLoading(true);
                        setError(null);
                        try {
                            await launchTenant(row.id);
                            navigate(resolveIndustryPath(row.industry), { replace: true });
                        } catch (err) {
                            setError(err instanceof Error ? err.message : 'Launch failed');
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
                <Button icon="pi pi-database" label="DB" outlined onClick={() => openDbDialog(row)} />
                <Button icon="pi pi-cog" label="Migrate" outlined onClick={() => openMigrateDialog(row)} />
                <Button icon="pi pi-sliders-h" label="Settings" outlined onClick={() => openProfileDialog(row)} />
                <Button icon="pi pi-pencil" label="Edit" outlined disabled={isLocked} tooltip={lockedReason || 'Edit tenant'} tooltipOptions={{ position: 'top' }} onClick={() => openEditDialog(row)} />
                <Button icon="pi pi-trash" label="Delete" outlined severity="danger" disabled={isLocked} tooltip={lockedReason || 'Delete tenant'} tooltipOptions={{ position: 'top' }} onClick={() => openDeleteDialog(row)} />
                <Button icon="pi pi-th-large" label="Apps" outlined onClick={() => openAppsDialog(row)} />
            </div>
        );
    };

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    {header}
                    {!!error && <Message severity="error" text={error} className="w-full mt-3" />}
                    {!!notice && <Message severity="success" text={notice} className="w-full mt-3" />}

                    <DataTable value={tenants} loading={loading} paginator rows={10} className="mt-4" dataKey="id" responsiveLayout="scroll">
                        <Column field="tenantCode" header="Code" sortable body={(row: TenantRow) => row.tenantCode || '-'}></Column>
                        <Column field="name" header="Tenant" sortable></Column>
                        <Column field="industry" header="Industry" sortable body={(row: TenantRow) => resolveIndustryLabel(row.industry)}></Column>
                        <Column header="Status" body={statusBody}></Column>
                        <Column header="Database" body={dbBody}></Column>
                        <Column header="Actions" body={actionsBody}></Column>
                    </DataTable>
                </div>
            </div>

            <Dialog
                header="Create Tenant"
                visible={createOpen}
                style={{ width: '32rem' }}
                modal
                onHide={() => {
                    setCreateOpen(false);
                    setCreateName('');
                    setCreateIndustry(null);
                }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            outlined
                            onClick={() => {
                                setCreateOpen(false);
                                setCreateName('');
                                setCreateIndustry(null);
                            }}
                        />
                        <Button
                            label="Create"
                            icon="pi pi-check"
                            disabled={!createName.trim() || !createIndustry || loading}
                            onClick={async () => {
                                if (!createIndustry) return;
                                setLoading(true);
                                setError(null);
                                try {
                                    await authApi.createTenant({ name: createName.trim(), industry: createIndustry });
                                    setCreateOpen(false);
                                    setCreateName('');
                                    setCreateIndustry(null);
                                    await loadTenants();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Create failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 pt-2">
                    <span className="p-float-label">
                        <InputText id="tenant-name" value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus />
                        <label htmlFor="tenant-name">Tenant Name</label>
                    </span>

                    <span className="p-float-label">
                        <AppDropdown
                            id="tenant-industry"
                            value={createIndustry}
                            options={industryOptions}
                            onChange={(e) => setCreateIndustry((e.value as string) || null)}
                            placeholder="Select industry"
                            className="w-full"
                        />
                        <label htmlFor="tenant-industry">Industry</label>
                    </span>

                    <small className="text-500">Billing profile is derived from the selected industry.</small>
                </div>
            </Dialog>

            <Dialog
                header={dbTenant ? `Configure DB • ${dbTenant.name}` : 'Configure DB'}
                visible={dbOpen}
                style={{ width: '40rem' }}
                modal
                onHide={() => setDbOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={() => setDbOpen(false)} />
                        <Button
                            label="Save"
                            icon="pi pi-check"
                            disabled={!dbTenant || (!dbUrl.trim() && !migrationDbUrl.trim()) || loading}
                            onClick={async () => {
                                if (!dbTenant) return;
                                setLoading(true);
                                setError(null);
                                try {
                                    if (dbUrl.trim()) {
                                        await authApi.setTenantDb({ tenantId: dbTenant.id, databaseUrl: dbUrl.trim() });
                                    }
                                    if (migrationDbUrl.trim()) {
                                        await authApi.setTenantMigrationDb({
                                            tenantId: dbTenant.id,
                                            databaseUrl: migrationDbUrl.trim()
                                        });
                                    }
                                    setDbOpen(false);
                                    setDbTenant(null);
                                    setDbUrl('');
                                    setMigrationDbUrl('');
                                    await loadTenants();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Update failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-2">
                    <small className="text-500">Set the runtime DB URL and an optional migration-only URL (used for schema changes).</small>
                    {dbTenant?.databaseUrl && <small className="text-500">Current App DB: {dbTenant.databaseUrl}</small>}
                    {dbTenant?.migrationDatabaseUrl && (
                        <small className="text-500">Current Migration DB: {dbTenant.migrationDatabaseUrl}</small>
                    )}
                    <InputText
                        value={dbUrl}
                        onChange={(e) => setDbUrl(e.target.value)}
                        placeholder="App DB URL (postgres://user:pass@host:5432/dbname)"
                    />
                    <InputText
                        value={migrationDbUrl}
                        onChange={(e) => setMigrationDbUrl(e.target.value)}
                        placeholder="Migration DB URL (optional)"
                    />
                </div>
            </Dialog>

            <Dialog
                header={appsTenant ? `Apps • ${appsTenant.name}` : 'Apps'}
                visible={appsOpen}
                style={{ width: '44rem' }}
                modal
                onHide={() => {
                    setAppsOpen(false);
                    setAppsTenant(null);
                    setSelectedAddOns([]);
                }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            outlined
                            onClick={() => {
                                setAppsOpen(false);
                                setAppsTenant(null);
                                setSelectedAddOns([]);
                            }}
                        />
                        <Button
                            label="Save"
                            icon="pi pi-check"
                            disabled={!appsTenant || loading}
                            onClick={async () => {
                                if (!appsTenant) return;
                                setLoading(true);
                                setError(null);
                                try {
                                    const addOnUpdates = addOnApps.map((app) => ({
                                        appKey: app.id,
                                        isEnabled: selectedAddOns.includes(app.id)
                                    }));
                                    await authApi.setTenantApps({ tenantId: appsTenant.id, items: addOnUpdates });
                                    setAppsOpen(false);
                                    setAppsTenant(null);
                                    setSelectedAddOns([]);
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Update failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <small className="text-500">Base apps are fixed by industry. Add-ons can be enabled per tenant.</small>

                    <div className="flex flex-column gap-2">
                        <small className="text-500">Included apps</small>
                        <div className="flex flex-wrap gap-2">
                            {baseAppsForTenant.length > 0 ? (
                                baseAppsForTenant.map((app) => <Tag key={app.id} value={app.name} severity="info" />)
                            ) : (
                                <span className="text-500">No base apps selected.</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-column gap-2">
                        <small className="text-500">Add-on apps</small>
                        <AppMultiSelect
                            value={selectedAddOns}
                            options={addOnOptions}
                            onChange={(e) => setSelectedAddOns((e.value as string[]) || [])}
                            display="chip"
                            placeholder="Select add-ons"
                            className="w-full"
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                header={editTenant ? `Edit Tenant • ${editTenant.name}` : 'Edit Tenant'}
                visible={editOpen}
                style={{ width: '32rem' }}
                modal
                onHide={() => {
                    setEditOpen(false);
                    setEditTenant(null);
                    setEditName('');
                    setEditIndustry(null);
                }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            outlined
                            onClick={() => {
                                setEditOpen(false);
                                setEditTenant(null);
                                setEditName('');
                                setEditIndustry(null);
                            }}
                        />
                        <Button
                            label="Save"
                            icon="pi pi-check"
                            disabled={!editTenant || !editName.trim() || !editIndustry || loading}
                            onClick={async () => {
                                if (!editTenant || !editIndustry) return;
                                setLoading(true);
                                setError(null);
                                try {
                                    await authApi.updateTenant({
                                        tenantId: editTenant.id,
                                        name: editName.trim(),
                                        industry: editIndustry
                                    });
                                    setEditOpen(false);
                                    setEditTenant(null);
                                    setEditName('');
                                    setEditIndustry(null);
                                    await loadTenants();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Update failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 pt-2">
                    <span className="p-float-label">
                        <InputText id="edit-tenant-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        <label htmlFor="edit-tenant-name">Tenant Name</label>
                    </span>

                    <span className="p-float-label">
                        <AppDropdown
                            id="edit-tenant-industry"
                            value={editIndustry}
                            options={industryOptions}
                            onChange={(e) => setEditIndustry((e.value as string) || null)}
                            placeholder="Select industry"
                            className="w-full"
                        />
                        <label htmlFor="edit-tenant-industry">Industry</label>
                    </span>

                    <small className="text-500">Changing industry resets base apps and clears add-ons.</small>
                </div>
            </Dialog>

            <Dialog
                header={profileTenant ? `Tenant Settings - ${profileTenant.name}` : 'Tenant Settings'}
                visible={profileOpen}
                style={{ width: '48rem' }}
                modal
                onHide={resetProfileDialog}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            outlined
                            onClick={resetProfileDialog}
                        />
                        <Button
                            label="Save"
                            icon="pi pi-check"
                            disabled={!profileTenant || loading}
                            onClick={async () => {
                                if (!profileTenant) return;
                                const textileTenant = isTextileIndustry(profileTenant.industry);
                                const textilePresetKey = textileTenant ? profileTextilePresetKey : null;
                                const textileCapabilities = textileTenant ? profileTextileCapabilities : null;
                                setLoading(true);
                                setError(null);
                                try {
                                    await authApi.setTenantSettings({
                                        tenantId: profileTenant.id,
                                        salesInvoiceProfileKey: profileSalesInvoiceKey,
                                        salesInvoiceProfileOptions: profileSalesOptions,
                                        textilePresetKey,
                                        textileCapabilities,
                                        purchaseInvoiceProfileKey: profilePurchaseInvoiceKey || 'purchase_common_v1'
                                    });
                                    setTenants((prev) =>
                                        prev.map((row) =>
                                            row.id === profileTenant.id
                                                ? {
                                                      ...row,
                                                      salesInvoiceProfileKey: profileSalesInvoiceKey,
                                                      salesInvoiceProfileOptions: profileSalesOptions,
                                                      textilePresetKey,
                                                      textileCapabilities,
                                                      purchaseInvoiceProfileKey: profilePurchaseInvoiceKey || 'purchase_common_v1'
                                                  }
                                                : row
                                        )
                                    );
                                    setNotice(`Tenant settings updated for ${profileTenant.name}.`);
                                    resetProfileDialog();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Update failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <TextileTenantSettingsPanel
                        industry={profileTenant?.industry ?? null}
                        presetKey={profileTextilePresetKey}
                        capabilities={profileTextileCapabilities}
                        onPresetChange={(presetKey) => {
                            setProfileTextilePresetKey(presetKey);
                            setProfileTextileCapabilities(resolveTextileCapabilities(presetKey, null));
                        }}
                        onCapabilityChange={(key: TextileCapabilityKey, value: boolean) => {
                            setProfileTextileCapabilities((prev) => ({
                                ...prev,
                                [key]: value
                            }));
                        }}
                    />

                    {profileTenant && isTextileIndustry(profileTenant.industry) && profileSalesInvoiceKey !== TEXTILE_SALES_PROFILE_KEY && (
                        <Message
                            severity="warn"
                            text="Textile tenants should normally use the Textile GST invoice profile for the shared GST invoice baseline."
                        />
                    )}

                    <div className="grid m-0">
                        <div className="col-12 md:col-7 p-0 md:pr-2">
                            <label className="block text-700 mb-1">Sales Invoice Profile</label>
                            <AppDropdown
                                value={profileSalesInvoiceKey}
                                options={SALES_INVOICE_PROFILE_KEY_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => {
                                    const nextKey = (event.value as string | null) ?? null;
                                    setProfileSalesInvoiceKey(nextKey);
                                    setProfileSalesOptions(resolveEditableSalesProfileOptions(nextKey, null));
                                }}
                                placeholder="Select sales profile"
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-5 p-0 md:pl-2 mt-3 md:mt-0">
                            <label className="block text-700 mb-1">Purchase Profile</label>
                            <AppDropdown
                                value={profilePurchaseInvoiceKey}
                                options={PURCHASE_INVOICE_PROFILE_KEY_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) =>
                                    setProfilePurchaseInvoiceKey((event.value as string) || 'purchase_common_v1')
                                }
                                placeholder="Select purchase profile"
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="flex align-items-center justify-content-between">
                        <small className="text-500">
                            Configure client-level feature visibility for invoice entry/edit.
                        </small>
                        <Button
                            type="button"
                            label="Use Profile Defaults"
                            className="app-action-compact p-button-outlined"
                            onClick={() => setProfileSalesOptions(resolveEditableSalesProfileOptions(profileSalesInvoiceKey, null))}
                            disabled={loading}
                        />
                    </div>

                    <div className="border-1 border-200 border-round p-3">
                        <div className="grid m-0">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <label className="block text-700 mb-1">Salesman Mode</label>
                                <AppDropdown
                                    value={profileSalesOptions.salesmanMode}
                                    options={SALESMAN_MODE_OPTIONS}
                                    optionLabel="label"
                                    optionValue="value"
                                    onChange={(event) =>
                                        setProfileSalesOptions((prev) => ({
                                            ...prev,
                                            salesmanMode: (event.value as EditableSalesInvoiceProfileOptions['salesmanMode']) ?? 'none'
                                        }))
                                    }
                                    className="w-full"
                                />
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-3 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2 h-full">
                                    <span className="text-700">Show Tax Columns</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.showTaxColumns}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                showTaxColumns: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid m-0 mt-2">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Show Production Attribute Details</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.showTypeDetails}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                showTypeDetails: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-2 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Show Additional Taxation</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.showAdditionalTaxation}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                showAdditionalTaxation: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid m-0 mt-2">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Show Scheme Toggle</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.showSchemeToggle}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                showSchemeToggle: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-2 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Show Bizom Field</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.showBizomInvoiceField}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                showBizomInvoiceField: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid m-0 mt-2">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Show Inter-State Toggle</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.showInterStateToggle}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                showInterStateToggle: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-2 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Transport Enabled</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.transportEnabled}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => {
                                                const transportEnabled = Boolean(event.value);
                                                return {
                                                    ...prev,
                                                    transportEnabled,
                                                    transportDefaultApplied: transportEnabled ? prev.transportDefaultApplied : false,
                                                    showTransporterField: transportEnabled ? prev.showTransporterField : false,
                                                    requireTransporterWhenApplied:
                                                        transportEnabled && prev.showTransporterField
                                                            ? prev.requireTransporterWhenApplied
                                                            : false
                                                };
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid m-0 mt-2">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Transport Default Applied</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.transportDefaultApplied}
                                        disabled={!profileSalesOptions.transportEnabled}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                transportDefaultApplied: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-2 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Show Transporter Field</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.showTransporterField}
                                        disabled={!profileSalesOptions.transportEnabled}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => {
                                                const showTransporterField = Boolean(event.value);
                                                return {
                                                    ...prev,
                                                    showTransporterField,
                                                    requireTransporterWhenApplied: showTransporterField
                                                        ? prev.requireTransporterWhenApplied
                                                        : false
                                                };
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid m-0 mt-2">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Require Transporter When Applied</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.requireTransporterWhenApplied}
                                        disabled={!profileSalesOptions.transportEnabled || !profileSalesOptions.showTransporterField}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                requireTransporterWhenApplied: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-2 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Dry Check Required</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.dryCheckRequired}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                dryCheckRequired: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid m-0 mt-2">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Strict Posting Parity</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.strictPostingParity}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                strictPostingParity: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-2 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Estimate Action Enabled</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.linkedEstimateEnabled}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                linkedEstimateEnabled: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid m-0 mt-2">
                            <div className="col-12 md:col-6 p-0 md:pr-2">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Credit Note Action Enabled</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.linkedCreditNoteEnabled}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                linkedCreditNoteEnabled: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="col-12 md:col-6 p-0 md:pl-2 mt-2 md:mt-0">
                                <div className="flex align-items-center justify-content-between border-1 border-200 border-round px-3 py-2">
                                    <span className="text-700">Debit Note Action Enabled</span>
                                    <InputSwitch
                                        checked={profileSalesOptions.linkedDebitNoteEnabled}
                                        onChange={(event) =>
                                            setProfileSalesOptions((prev) => ({
                                                ...prev,
                                                linkedDebitNoteEnabled: Boolean(event.value)
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header={deleteTenant ? `Delete Tenant • ${deleteTenant.name}` : 'Delete Tenant'}
                visible={deleteOpen}
                style={{ width: '32rem' }}
                modal
                onHide={() => {
                    setDeleteOpen(false);
                    setDeleteTenant(null);
                }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            outlined
                            onClick={() => {
                                setDeleteOpen(false);
                                setDeleteTenant(null);
                            }}
                        />
                        <Button
                            label="Delete"
                            icon="pi pi-trash"
                            severity="danger"
                            disabled={!deleteTenant || isTenantLocked(deleteTenant) || loading}
                            onClick={async () => {
                                if (!deleteTenant) return;
                                setLoading(true);
                                setError(null);
                                try {
                                    await authApi.deleteTenant(deleteTenant.id);
                                    setDeleteOpen(false);
                                    setDeleteTenant(null);
                                    await loadTenants();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Delete failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-2">
                    <span>
                        This will permanently remove the tenant record and its control-plane data. Tenant databases are not deleted.
                    </span>
                    {deleteTenant && isTenantLocked(deleteTenant) && (
                        <Message severity="warn" text={tenantLockedReason(deleteTenant) || 'Tenant is in use.'} />
                    )}
                </div>
            </Dialog>

            <Dialog
                header={migrateTenant ? `Run Migrations • ${migrateTenant.name}` : 'Run Migrations'}
                visible={migrateOpen}
                style={{ width: '36rem' }}
                modal
                onHide={() => {
                    setMigrateOpen(false);
                    setMigrateTenant(null);
                }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            outlined
                            onClick={() => {
                                setMigrateOpen(false);
                                setMigrateTenant(null);
                            }}
                        />
                        <Button
                            label="Run"
                            icon="pi pi-play"
                            disabled={!migrateTenant || loading}
                            onClick={async () => {
                                if (!migrateTenant) return;
                                setLoading(true);
                                setError(null);
                                setNotice(null);
                                try {
                                    const result = await authApi.runTenantMigrations({
                                        tenantId: migrateTenant.id
                                    });
                                    if (result.ok) {
                                        setNotice(`Migrations completed for ${result.tenantName || result.tenantId}.`);
                                    } else {
                                        setError(result.message || 'Migration failed');
                                    }
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Migration failed');
                                } finally {
                                    setLoading(false);
                                    setMigrateOpen(false);
                                    setMigrateTenant(null);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <small className="text-500">
                        Runs app schema migrations (accounts, inventory). Wealth migrations run only for wealth tenants.
                    </small>
                </div>
            </Dialog>

            <Dialog
                header="Run Migrations • All Tenants"
                visible={migrateAllOpen}
                style={{ width: '36rem' }}
                modal
                onHide={() => setMigrateAllOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={() => setMigrateAllOpen(false)} />
                        <Button
                            label="Run All"
                            icon="pi pi-play"
                            disabled={loading}
                            onClick={async () => {
                                setLoading(true);
                                setError(null);
                                setNotice(null);
                                try {
                                    const result = await authApi.runAllTenantMigrations();
                                    setMigrationResults(result.results);
                                    setMigrationSummaryOpen(true);
                                    const okCount = result.results.filter((item) => item.ok).length;
                                    const failCount = result.results.length - okCount;
                                    setNotice(`Migrations finished: ${okCount} ok, ${failCount} failed.`);
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Migration failed');
                                } finally {
                                    setLoading(false);
                                    setMigrateAllOpen(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <small className="text-500">
                        Runs app schema migrations for every tenant with a configured database. Wealth runs only for wealth tenants.
                    </small>
                </div>
            </Dialog>

            <Dialog
                header="Migration Results"
                visible={migrationSummaryOpen}
                style={{ width: '50rem' }}
                modal
                onHide={() => setMigrationSummaryOpen(false)}
            >
                <DataTable value={migrationResults} paginator rows={10} dataKey="tenantId" responsiveLayout="scroll">
                    <Column
                        field="tenantName"
                        header="Tenant"
                        body={(row: TenantMigrationResult) => row.tenantName || row.tenantId}
                    />
                    <Column
                        header="Status"
                        body={(row: TenantMigrationResult) => (
                            <Tag value={row.ok ? 'OK' : 'FAILED'} severity={row.ok ? 'success' : 'danger'} />
                        )}
                    />
                    <Column field="message" header="Message" body={(row: TenantMigrationResult) => row.message || '-'} />
                </DataTable>
            </Dialog>

        </div>
    );
}


