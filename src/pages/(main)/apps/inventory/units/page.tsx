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
import { z } from 'zod';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';

interface UnitRow {
    unitId: number;
    name: string | null;
}

const UNITS = gql`
    query Units {
        units {
            unitId
            name
        }
    }
`;

const CREATE_UNIT = gql`
    mutation CreateUnit($name: String!) {
        createUnit(name: $name) {
            unitId
        }
    }
`;

const UPDATE_UNIT = gql`
    mutation UpdateUnit($unitId: Int!, $name: String) {
        updateUnit(unitId: $unitId, name: $name) {
            unitId
        }
    }
`;

const DELETE_UNIT = gql`
    mutation DeleteUnit($unitId: Int!) {
        deleteUnit(unitId: $unitId)
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

export default function InventoryUnitsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<UnitRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(UNITS, { client: inventoryApolloClient });
    const [createUnit] = useMutation(CREATE_UNIT, { client: inventoryApolloClient });
    const [updateUnit] = useMutation(UPDATE_UNIT, { client: inventoryApolloClient });
    const [deleteUnit] = useMutation(DELETE_UNIT, { client: inventoryApolloClient });

    const rows: UnitRow[] = useMemo(() => data?.units ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.unitId, row.name]
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

    const openEdit = (row: UnitRow) => {
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
                await updateUnit({
                    variables: {
                        unitId: editing.unitId,
                        ...variables
                    }
                });
            } else {
                await createUnit({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Unit saved.'
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

    const handleDelete = async (unitId: number) => {
        try {
            await deleteUnit({ variables: { unitId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Unit deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: UnitRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this unit?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.unitId)
        });
    };

    const actionsBody = (row: UnitRow) => (
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
                        <h2 className="m-0">Units</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain unit definitions for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Unit" icon="pi pi-plus" onClick={openNew} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading units: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="unitId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as UnitRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search unit"
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
                            Showing {filteredRows.length} unit{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} unit${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Unit' : 'New Unit'}
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
