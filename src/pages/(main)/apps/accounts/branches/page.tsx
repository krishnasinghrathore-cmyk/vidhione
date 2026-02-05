'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';

interface BranchRow {
    branchId: number;
    name: string | null;
}

const BRANCHES = gql`
    query Branches($search: String, $limit: Int) {
        branches(search: $search, limit: $limit) {
            branchId
            name
        }
    }
`;

const CREATE_BRANCH = gql`
    mutation CreateBranch($name: String!) {
        createBranch(name: $name) {
            branchId
        }
    }
`;

const UPDATE_BRANCH = gql`
    mutation UpdateBranch($branchId: Int!, $name: String) {
        updateBranch(branchId: $branchId, name: $name) {
            branchId
        }
    }
`;

const DELETE_BRANCH = gql`
    mutation DeleteBranch($branchId: Int!) {
        deleteBranch(branchId: $branchId)
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

const limitOptions = [50, 100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

export default function AccountsBranchesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<BranchRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(BRANCHES, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createBranch] = useMutation(CREATE_BRANCH, { client: apolloClient });
    const [updateBranch] = useMutation(UPDATE_BRANCH, { client: apolloClient });
    const [deleteBranch] = useMutation(DELETE_BRANCH, { client: apolloClient });

    const rows: BranchRow[] = useMemo(() => data?.branches ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.branchId, row.name]
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

    const openEdit = (row: BranchRow) => {
        setEditing(row);
        setForm({ name: row.name ?? '' });
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

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim()
            };

            if (editing) {
                await updateBranch({
                    variables: {
                        branchId: editing.branchId,
                        ...variables
                    }
                });
            } else {
                await createBranch({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Branch saved.'
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

    const handleDelete = async (branchId: number) => {
        try {
            await deleteBranch({ variables: { branchId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Branch deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: BranchRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this branch?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.branchId)
        });
    };

    const actionsBody = (row: BranchRow) => (
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
                        <h2 className="m-0">Branches</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain branch records for the agency accounts masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Branch" icon="pi pi-plus" onClick={openNew} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading branches: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="branchId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as BranchRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search branch"
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
                            Showing {filteredRows.length} branch{filteredRows.length === 1 ? '' : 'es'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} branch${filteredRows.length === 1 ? '' : 'es'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Branch' : 'New Branch'}
                visible={dialogVisible}
                style={{ width: 'min(620px, 96vw)' }}
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
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
