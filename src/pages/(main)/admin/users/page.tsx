'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import * as authApi from '@/lib/auth/api';
import AppDropdown from '@/components/AppDropdown';

type TenantOption = { id: string; name: string; industry: string | null };

type UserRow = {
    id: string;
    email: string;
    role: 'superadmin' | 'tenant_admin' | 'user' | 'viewer';
    isActive: boolean;
    tenants: { id: string; name: string }[];
};

const roleOptions = [
    { label: 'Tenant Admin', value: 'tenant_admin' },
    { label: 'User', value: 'user' },
    { label: 'Viewer', value: 'viewer' }
];

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

    const header = useMemo(
        () => (
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                <div>
                    <h2 className="m-0">Superadmin • Users</h2>
                    <p className="mt-2 mb-0 text-500">Invite users, assign a tenant, and manage access.</p>
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
        if (row.role === 'superadmin') return <span className="text-500">—</span>;
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
                        setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, isActive: Boolean(e.value) } : u)));
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
            </div>
        );
    };

    const tenantOptions = tenants.map((t) => ({
        label: t.industry ? `${t.name} (${t.industry})` : t.name,
        value: t.id
    }));

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
                header={passwordUser ? `Reset Password • ${passwordUser.email}` : 'Reset Password'}
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
                header={tenantUser ? `Set Tenant • ${tenantUser.email}` : 'Set Tenant'}
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
        </div>
    );
}
