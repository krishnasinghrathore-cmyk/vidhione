'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppInput from '@/components/AppInput';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';

interface ManagerRow {
    managerId: number;
    name: string | null;
}

const MANAGERS = gql`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
        }
    }
`;

const CREATE_MANAGER = gql`
    mutation CreateManager($name: String!) {
        createManager(name: $name) {
            managerId
        }
    }
`;

const UPDATE_MANAGER = gql`
    mutation UpdateManager($managerId: Int!, $name: String) {
        updateManager(managerId: $managerId, name: $name) {
            managerId
        }
    }
`;

const DELETE_MANAGER = gql`
    mutation DeleteManager($managerId: Int!) {
        deleteManager(managerId: $managerId)
    }
`;

type FormState = {
    name: string;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required')
});

const DEFAULT_FORM: FormState = {
    name: ''
};

export default function AccountsManagersPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const nameInputRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ManagerRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(MANAGERS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit: 2000 }
    });
    const [createManager] = useMutation(CREATE_MANAGER, { client: apolloClient });
    const [updateManager] = useMutation(UPDATE_MANAGER, { client: apolloClient });
    const [deleteManager] = useMutation(DELETE_MANAGER, { client: apolloClient });

    const rows: ManagerRow[] = useMemo(() => data?.managers ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.managerId, row.name]
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

    const openEdit = (row: ManagerRow) => {
        setEditing(row);
        setForm({ name: row.name ?? '' });
        setFormErrors({});
        setDialogVisible(true);
    };

    const focusNameInput = useCallback(() => {
        requestAnimationFrame(() => {
            nameInputRef.current?.focus?.();
        });
        window.setTimeout(() => {
            nameInputRef.current?.focus?.();
        }, 100);
    }, []);

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

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim()
            };

            if (editing) {
                await updateManager({
                    variables: {
                        managerId: editing.managerId,
                        ...variables
                    }
                });
            } else {
                await createManager({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Manager saved.'
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

    const handleDelete = async (managerId: number) => {
        try {
            await deleteManager({ variables: { managerId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Manager deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: ManagerRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this manager?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.managerId)
        });
    };

    const actionsBody = (row: ManagerRow) => (
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
                        <h2 className="m-0">Managers</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain manager records for the agency accounts masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Manager" icon="pi pi-plus" onClick={openNew} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading managers: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="managerId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as ManagerRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search manager"
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
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} manager{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} manager${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Manager' : 'New Manager'}
                visible={dialogVisible}
                style={{ width: 'min(380px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                onShow={focusNameInput}
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
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            ref={nameInputRef}
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%', maxWidth: '360px' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
