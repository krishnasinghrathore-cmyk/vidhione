'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import * as authApi from '@/lib/auth/api';
import { APPS } from '@/config/appsConfig';
import AppDropdown from '@/components/AppDropdown';

type TenantOption = { id: string; name: string; industry: string | null };

type UserRow = {
    id: string;
    email: string;
    role: 'superadmin' | 'tenant_admin' | 'user' | 'viewer';
    isActive: boolean;
    tenants: { id: string; name: string }[];
};

type AppAccessItem = { appKey: string; isEnabled: boolean };
type AppAccessRow = AppAccessItem & { name: string; category: (typeof APPS)[number]['category']; icon: string };

const roleOptions = [
    { label: 'Tenant Admin', value: 'tenant_admin' },
    { label: 'User', value: 'user' },
    { label: 'Viewer', value: 'viewer' }
];

const resolveSingleTenant = (row: UserRow) => {
    if (!row.tenants?.length || row.tenants.length !== 1) return null;
    return row.tenants[0];
};

export default function AdminUsersPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [tenants, setTenants] = useState<TenantOption[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [createEmail, setCreateEmail] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [createRole, setCreateRole] = useState<UserRow['role']>('user');
    const [createTenantId, setCreateTenantId] = useState<string>('');

    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const [tenantOpen, setTenantOpen] = useState(false);
    const [tenantUser, setTenantUser] = useState<UserRow | null>(null);
    const [tenantId, setTenantId] = useState('');

    const [appAccessOpen, setAppAccessOpen] = useState(false);
    const [appAccessLoading, setAppAccessLoading] = useState(false);
    const [appAccessUser, setAppAccessUser] = useState<UserRow | null>(null);
    const [appAccessTenantId, setAppAccessTenantId] = useState<string>('');
    const [useTenantDefaultAccess, setUseTenantDefaultAccess] = useState(true);
    const [appAccessItems, setAppAccessItems] = useState<AppAccessItem[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersResult, tenantsResult] = await Promise.all([authApi.listUsers(), authApi.listTenants()]);
            setUsers(usersResult.items);
            setTenants(tenantsResult.items.map((t) => ({ id: t.id, name: t.name, industry: t.industry })));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const tenantOptions = useMemo(
        () =>
            tenants.map((tenant) => ({
                label: tenant.industry ? `${tenant.name} (${tenant.industry})` : tenant.name,
                value: tenant.id
            })),
        [tenants]
    );

    const appCatalogById = useMemo(() => new Map(APPS.map((app) => [app.id, app])), []);
    const appAccessRows = useMemo(
        () =>
            appAccessItems.reduce<AppAccessRow[]>((rows, item) => {
                const app = appCatalogById.get(item.appKey);
                if (!app) return rows;
                rows.push({
                    ...item,
                    name: app.name,
                    category: app.category,
                    icon: app.icon
                });
                return rows;
            }, []),
        [appAccessItems, appCatalogById]
    );
    const selectedAppCount = useMemo(() => appAccessItems.filter((item) => item.isEnabled).length, [appAccessItems]);
    const canSaveAppAccess = useMemo(() => {
        if (!appAccessUser || !appAccessTenantId || appAccessLoading) return false;
        if (useTenantDefaultAccess) return true;
        if (!appAccessItems.length) return true;
        return selectedAppCount > 0;
    }, [appAccessItems.length, appAccessLoading, appAccessTenantId, appAccessUser, selectedAppCount, useTenantDefaultAccess]);

    const openAppAccess = useCallback(async (row: UserRow) => {
        const tenant = resolveSingleTenant(row);
        if (!tenant) return;

        setAppAccessUser(row);
        setAppAccessTenantId(tenant.id);
        setUseTenantDefaultAccess(true);
        setAppAccessItems([]);
        setAppAccessOpen(true);
        setAppAccessLoading(true);
        setError(null);

        try {
            const state = await authApi.getUserAppAccess({ userId: row.id, tenantId: tenant.id });
            setUseTenantDefaultAccess(!state.hasExplicitAssignments);
            setAppAccessItems(state.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load app access');
        } finally {
            setAppAccessLoading(false);
        }
    }, []);

    const closeAppAccess = useCallback(() => {
        setAppAccessOpen(false);
        setAppAccessUser(null);
        setAppAccessTenantId('');
        setUseTenantDefaultAccess(true);
        setAppAccessItems([]);
        setAppAccessLoading(false);
    }, []);

    const toggleAppAccess = useCallback((appKey: string, nextValue: boolean) => {
        setAppAccessItems((prev) => prev.map((item) => (item.appKey === appKey ? { ...item, isEnabled: nextValue } : item)));
    }, []);

    const header = useMemo(
        () => (
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                <div>
                    <h2 className="m-0">Superadmin / Users</h2>
                    <p className="mt-2 mb-0 text-500">Invite users, assign a tenant, and control which apps each operator can open.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-content-end">
                    <Button icon="pi pi-refresh" label="Refresh" outlined onClick={loadData} />
                    <Button icon="pi pi-user-plus" label="Invite User" onClick={() => setCreateOpen(true)} />
                </div>
            </div>
        ),
        [loadData]
    );

    const roleBody = (row: UserRow) => {
        const severity = row.role === 'superadmin' ? 'danger' : row.role === 'tenant_admin' ? 'warning' : 'info';
        return <Tag value={row.role.toUpperCase()} severity={severity as any} />;
    };

    const tenantBody = (row: UserRow) => {
        if (row.role === 'superadmin') return <span className="text-500">-</span>;
        if (!row.tenants?.length) return <Tag value="UNASSIGNED" severity="warning" />;
        if (row.tenants.length === 1) return <Tag value={row.tenants[0].name} severity="info" />;
        return <Tag value={`${row.tenants.length} tenants`} severity="info" />;
    };

    const activeBody = (row: UserRow) => {
        return (
            <InputSwitch
                checked={row.isActive}
                onChange={async (e) => {
                    setLoading(true);
                    setError(null);
                    try {
                        await authApi.setUserActive({ userId: row.id, isActive: Boolean(e.value) });
                        setUsers((prev) => prev.map((userItem) => (userItem.id === row.id ? { ...userItem, isActive: Boolean(e.value) } : userItem)));
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Update failed');
                    } finally {
                        setLoading(false);
                    }
                }}
            />
        );
    };

    const actionsBody = (row: UserRow) => {
        const singleTenant = resolveSingleTenant(row);
        const canManageAppAccess = row.role !== 'superadmin' && row.role !== 'tenant_admin' && Boolean(singleTenant);

        return (
            <div className="flex flex-wrap gap-2">
                <Button
                    icon="pi pi-key"
                    label="Reset Password"
                    outlined
                    onClick={() => {
                        setPasswordUser(row);
                        setNewPassword('');
                        setPasswordOpen(true);
                    }}
                />
                {row.role !== 'superadmin' && (
                    <Button
                        icon="pi pi-building"
                        label="Set Tenant"
                        outlined
                        onClick={() => {
                            setTenantUser(row);
                            setTenantId(row.tenants?.[0]?.id || '');
                            setTenantOpen(true);
                        }}
                    />
                )}
                {canManageAppAccess && (
                    <Button icon="pi pi-th-large" label="App Access" outlined onClick={() => openAppAccess(row)} />
                )}
            </div>
        );
    };

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    {header}
                    {!!error && <Message severity="error" text={error} className="w-full mt-3" />}

                    <DataTable value={users} loading={loading} paginator rows={10} className="mt-4" dataKey="id" responsiveLayout="scroll">
                        <Column field="email" header="Email" sortable></Column>
                        <Column header="Role" body={roleBody}></Column>
                        <Column header="Tenant" body={tenantBody}></Column>
                        <Column header="Active" body={activeBody}></Column>
                        <Column header="Actions" body={actionsBody}></Column>
                    </DataTable>
                </div>
            </div>

            <Dialog
                header="Invite User"
                visible={createOpen}
                style={{ width: '36rem' }}
                modal
                onHide={() => setCreateOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={() => setCreateOpen(false)} />
                        <Button
                            label="Send Invite"
                            icon="pi pi-check"
                            disabled={!createEmail.trim() || !createTenantId || loading}
                            onClick={async () => {
                                setLoading(true);
                                setError(null);
                                try {
                                    await authApi.inviteUser({
                                        email: createEmail.trim(),
                                        role: createRole,
                                        tenantId: createTenantId,
                                        phoneNumber: invitePhone.trim() || null
                                    });
                                    setCreateOpen(false);
                                    setCreateEmail('');
                                    setCreateRole('user');
                                    setCreateTenantId('');
                                    setInvitePhone('');
                                    await loadData();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Invite failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <span className="p-float-label">
                        <InputText id="user-email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} autoFocus />
                        <label htmlFor="user-email">Email</label>
                    </span>

                    <div className="flex flex-column gap-2">
                        <small className="text-500">Role</small>
                        <AppDropdown
                            value={createRole}
                            options={roleOptions}
                            onChange={(e) => setCreateRole(e.value)}
                            placeholder="Select role"
                        />
                    </div>

                    <div className="flex flex-column gap-2">
                        <small className="text-500">Tenant</small>
                        <AppDropdown
                            value={createTenantId}
                            options={tenantOptions}
                            onChange={(e) => setCreateTenantId(e.value)}
                            placeholder="Select tenant"
                        />
                    </div>

                    <span className="p-float-label">
                        <InputText
                            id="invite-phone"
                            value={invitePhone}
                            onChange={(e) => setInvitePhone(e.target.value)}
                            placeholder="+91..."
                        />
                        <label htmlFor="invite-phone">Phone (optional)</label>
                    </span>
                </div>
            </Dialog>

            <Dialog
                header={passwordUser ? `Reset Password - ${passwordUser.email}` : 'Reset Password'}
                visible={passwordOpen}
                style={{ width: '30rem' }}
                modal
                onHide={() => setPasswordOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={() => setPasswordOpen(false)} />
                        <Button
                            label="Update"
                            icon="pi pi-check"
                            disabled={!passwordUser || !newPassword || loading}
                            onClick={async () => {
                                if (!passwordUser) return;
                                setLoading(true);
                                setError(null);
                                try {
                                    await authApi.setUserPassword({ userId: passwordUser.id, password: newPassword });
                                    setPasswordOpen(false);
                                    setPasswordUser(null);
                                    setNewPassword('');
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
                    <small className="text-500">New password</small>
                    <InputText type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
            </Dialog>

            <Dialog
                header={tenantUser ? `Set Tenant - ${tenantUser.email}` : 'Set Tenant'}
                visible={tenantOpen}
                style={{ width: '30rem' }}
                modal
                onHide={() => setTenantOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={() => setTenantOpen(false)} />
                        <Button
                            label="Save"
                            icon="pi pi-check"
                            disabled={!tenantUser || !tenantId || loading}
                            onClick={async () => {
                                if (!tenantUser) return;
                                setLoading(true);
                                setError(null);
                                try {
                                    await authApi.setUserTenant({ userId: tenantUser.id, tenantId });
                                    setTenantOpen(false);
                                    setTenantUser(null);
                                    setTenantId('');
                                    await loadData();
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
                    <small className="text-500">Tenant</small>
                    <AppDropdown value={tenantId} options={tenantOptions} onChange={(e) => setTenantId(e.value)} placeholder="Select tenant" />
                </div>
            </Dialog>

            <Dialog
                header={appAccessUser ? `App Access - ${appAccessUser.email}` : 'App Access'}
                visible={appAccessOpen}
                style={{ width: '42rem' }}
                modal
                onHide={closeAppAccess}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" outlined onClick={closeAppAccess} />
                        <Button
                            label="Save"
                            icon="pi pi-check"
                            disabled={!canSaveAppAccess}
                            loading={appAccessLoading}
                            onClick={async () => {
                                if (!appAccessUser || !appAccessTenantId) return;
                                setAppAccessLoading(true);
                                setError(null);
                                try {
                                    await authApi.setUserAppAccess({
                                        userId: appAccessUser.id,
                                        tenantId: appAccessTenantId,
                                        useTenantDefaultAccess,
                                        items: appAccessItems
                                    });
                                    closeAppAccess();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Failed to save app access');
                                    setAppAccessLoading(false);
                                }
                            }}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-4">
                    <div className="flex align-items-center justify-content-between gap-3 p-3 border-1 surface-border border-round">
                        <div>
                            <div className="font-medium">Use tenant default access</div>
                            <small className="text-500">When enabled, this user inherits all apps enabled for the tenant.</small>
                        </div>
                        <InputSwitch checked={useTenantDefaultAccess} onChange={(e) => setUseTenantDefaultAccess(Boolean(e.value))} />
                    </div>

                    {!appAccessLoading && !appAccessRows.length && (
                        <Message severity="info" text="No tenant apps are enabled yet. Enable apps on the tenant first." />
                    )}

                    {!useTenantDefaultAccess && appAccessRows.length > 0 && (
                        <div className="flex align-items-center justify-content-between">
                            <small className="text-500">Select the apps this operator can access.</small>
                            <Tag value={`${selectedAppCount} selected`} severity="info" />
                        </div>
                    )}

                    <div className="flex flex-column gap-3">
                        {appAccessRows.map((item) => (
                            <div key={item.appKey} className="flex align-items-center justify-content-between gap-3 p-3 border-1 surface-border border-round">
                                <div className="flex align-items-center gap-3">
                                    <i className={`${item.icon} text-primary text-xl`}></i>
                                    <div>
                                        <div className="font-medium">{item.name}</div>
                                        <small className="text-500 text-capitalize">{item.category} app</small>
                                    </div>
                                </div>
                                <Checkbox
                                    inputId={`app-access-${item.appKey}`}
                                    checked={item.isEnabled}
                                    disabled={useTenantDefaultAccess || appAccessLoading}
                                    onChange={(e) => toggleAppAccess(item.appKey, Boolean(e.checked))}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
