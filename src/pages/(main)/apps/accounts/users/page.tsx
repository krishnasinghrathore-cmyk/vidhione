'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';

interface UserRow {
    userId: number;
    name: string | null;
    loginId: string | null;
    isAddFlag: number | null;
    isEditFlag: number | null;
    isDeleteFlag: number | null;
    isPrintFlag: number | null;
    isCancelFlag: number | null;
}

const USERS = gql`
    query Users($search: String, $limit: Int) {
        users(search: $search, limit: $limit) {
            userId
            name
            loginId
            isAddFlag
            isEditFlag
            isDeleteFlag
            isPrintFlag
            isCancelFlag
        }
    }
`;

const CREATE_USER = gql`
    mutation CreateUser(
        $name: String!
        $loginId: String!
        $password: String!
        $isAddFlag: Int
        $isEditFlag: Int
        $isDeleteFlag: Int
        $isPrintFlag: Int
        $isCancelFlag: Int
    ) {
        createUser(
            name: $name
            loginId: $loginId
            password: $password
            isAddFlag: $isAddFlag
            isEditFlag: $isEditFlag
            isDeleteFlag: $isDeleteFlag
            isPrintFlag: $isPrintFlag
            isCancelFlag: $isCancelFlag
        ) {
            userId
        }
    }
`;

const UPDATE_USER = gql`
    mutation UpdateUser(
        $userId: Int!
        $name: String
        $loginId: String
        $password: String
        $isAddFlag: Int
        $isEditFlag: Int
        $isDeleteFlag: Int
        $isPrintFlag: Int
        $isCancelFlag: Int
    ) {
        updateUser(
            userId: $userId
            name: $name
            loginId: $loginId
            password: $password
            isAddFlag: $isAddFlag
            isEditFlag: $isEditFlag
            isDeleteFlag: $isDeleteFlag
            isPrintFlag: $isPrintFlag
            isCancelFlag: $isCancelFlag
        ) {
            userId
        }
    }
`;

const DELETE_USER = gql`
    mutation DeleteUser($userId: Int!) {
        deleteUser(userId: $userId)
    }
`;

type FormState = {
    name: string;
    loginId: string;
    password: string;
    isAddFlag: boolean;
    isEditFlag: boolean;
    isDeleteFlag: boolean;
    isPrintFlag: boolean;
    isCancelFlag: boolean;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    loginId: z.string().trim().min(1, 'Login ID is required')
});

const DEFAULT_FORM: FormState = {
    name: '',
    loginId: '',
    password: '',
    isAddFlag: false,
    isEditFlag: false,
    isDeleteFlag: false,
    isPrintFlag: false,
    isCancelFlag: false
};

const limitOptions = [50, 100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

const flagToBool = (value: number | null | undefined) => Number(value || 0) === 1;
const boolToFlag = (value: boolean) => (value ? 1 : 0);

export default function AccountsUsersPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<UserRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(USERS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createUser] = useMutation(CREATE_USER, { client: apolloClient });
    const [updateUser] = useMutation(UPDATE_USER, { client: apolloClient });
    const [deleteUser] = useMutation(DELETE_USER, { client: apolloClient });

    const rows: UserRow[] = useMemo(() => data?.users ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.userId, row.name, row.loginId]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);
    const openNew = () => {
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: UserRow) => {
        setEditing(row);
        setForm({
            name: row.name ?? '',
            loginId: row.loginId ?? '',
            password: '',
            isAddFlag: flagToBool(row.isAddFlag),
            isEditFlag: flagToBool(row.isEditFlag),
            isDeleteFlag: flagToBool(row.isDeleteFlag),
            isPrintFlag: flagToBool(row.isPrintFlag),
            isCancelFlag: flagToBool(row.isCancelFlag)
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const save = async () => {
        const parsed = formSchema.safeParse(form);
        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                if (issue.path[0]) nextErrors[String(issue.path[0])] = issue.message;
            });
            setFormErrors(nextErrors);
            toastRef.current?.show({ severity: 'warn', summary: 'Please fix validation errors' });
            return;
        }

        if (!editing && !form.password.trim()) {
            setFormErrors((prev) => ({ ...prev, password: 'Password is required' }));
            toastRef.current?.show({ severity: 'warn', summary: 'Please set a password' });
            return;
        }

        setSaving(true);
        try {
            const variables: Record<string, unknown> = {
                name: form.name.trim(),
                loginId: form.loginId.trim(),
                isAddFlag: boolToFlag(form.isAddFlag),
                isEditFlag: boolToFlag(form.isEditFlag),
                isDeleteFlag: boolToFlag(form.isDeleteFlag),
                isPrintFlag: boolToFlag(form.isPrintFlag),
                isCancelFlag: boolToFlag(form.isCancelFlag)
            };

            const password = form.password.trim();
            if (password) variables.password = password;

            if (editing) {
                await updateUser({
                    variables: {
                        userId: editing.userId,
                        ...variables
                    }
                });
            } else {
                await createUser({
                    variables: {
                        ...variables,
                        password
                    }
                });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'User saved.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Save failed.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId: number) => {
        try {
            await deleteUser({ variables: { userId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'User deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: UserRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this user?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.userId)
        });
    };

    const rightsBody = (row: UserRow) => {
        const flags: React.ReactNode[] = [];
        if (flagToBool(row.isAddFlag)) flags.push(<Tag key="add" value="Add" severity="success" />);
        if (flagToBool(row.isEditFlag)) flags.push(<Tag key="edit" value="Edit" severity="info" />);
        if (flagToBool(row.isDeleteFlag)) flags.push(<Tag key="delete" value="Delete" severity="danger" />);
        if (flagToBool(row.isPrintFlag)) flags.push(<Tag key="print" value="Print" severity="secondary" />);
        if (flagToBool(row.isCancelFlag)) flags.push(<Tag key="cancel" value="Cancel" severity="warning" />);
        if (flags.length === 0) return <Tag value="-" severity="secondary" />;
        return <div className="flex gap-1 flex-wrap">{flags}</div>;
    };

    const actionsBody = (row: UserRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => confirmDelete(e, row)} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Users</h2>
                        <p className="mt-2 mb-0 text-600">Maintain user access for the agency accounts masters.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New User" icon="pi pi-plus" onClick={openNew} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading users: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="userId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as UserRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search user"
                            style={{ width: '100%' }}
                        />
                    </span>
                }
                headerRight={
                    <>
                        <Button
                            label="Export"
                            icon="pi pi-download"
                            className="p-button-info"
                            onClick={() => dtRef.current?.exportCSV()}
                            disabled={filteredRows.length === 0}
                        />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="p-button-text"
                            onClick={() => window.print()}
                        />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            onClick={() => refetch()}
                        />
                        <span className="flex align-items-center gap-2">
                            <span className="text-600 text-sm">Limit</span>
                            <AppDropdown
                                value={limit}
                                options={limitOptions}
                                onChange={(e) => setLimit(e.value ?? 2000)}
                                className="w-6rem"
                            />
                        </span>
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} user{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} user${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="loginId" header="Login ID" sortable />
                <Column header="Rights" body={rightsBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit User' : 'New User'}
                visible={dialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button
                            label="Cancel"
                            className="p-button-text"
                            onClick={() => setDialogVisible(false)}
                            disabled={saving}
                        />
                        <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Login ID</label>
                        <InputText
                            value={form.loginId}
                            onChange={(e) => setForm((s) => ({ ...s, loginId: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.loginId ? 'p-invalid' : undefined}
                        />
                        {formErrors.loginId && <small className="p-error">{formErrors.loginId}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">
                            Password {editing ? '(leave blank to keep unchanged)' : ''}
                        </label>
                        <InputText
                            value={form.password}
                            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                            type="password"
                            autoComplete="new-password"
                            style={{ width: '100%' }}
                            className={formErrors.password ? 'p-invalid' : undefined}
                        />
                        {formErrors.password && <small className="p-error">{formErrors.password}</small>}
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-2">Rights</label>
                        <div className="flex flex-wrap gap-4">
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="userAdd"
                                    checked={form.isAddFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isAddFlag: !!e.checked }))}
                                />
                                <label htmlFor="userAdd" className="text-sm text-600">
                                    Add
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="userEdit"
                                    checked={form.isEditFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isEditFlag: !!e.checked }))}
                                />
                                <label htmlFor="userEdit" className="text-sm text-600">
                                    Edit
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="userDelete"
                                    checked={form.isDeleteFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isDeleteFlag: !!e.checked }))}
                                />
                                <label htmlFor="userDelete" className="text-sm text-600">
                                    Delete
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="userPrint"
                                    checked={form.isPrintFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isPrintFlag: !!e.checked }))}
                                />
                                <label htmlFor="userPrint" className="text-sm text-600">
                                    Print
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="userCancel"
                                    checked={form.isCancelFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isCancelFlag: !!e.checked }))}
                                />
                                <label htmlFor="userCancel" className="text-sm text-600">
                                    Cancel
                                </label>
                            </span>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
