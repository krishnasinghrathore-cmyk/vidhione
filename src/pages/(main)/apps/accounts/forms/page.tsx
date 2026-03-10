'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import AppInput from '@/components/AppInput';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import { MASTER_DETAIL_DIALOG_WIDTHS, MASTER_EDIT_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';

interface FormRow {
    formId: number;
    name: string | null;
    formType: string | null;
    orderNo: number | null;
    menuName: string | null;
}

const FORMS = gql`
    query Forms($search: String, $limit: Int) {
        forms(search: $search, limit: $limit) {
            formId
            name
            formType
            orderNo
            menuName
        }
    }
`;

const CREATE_FORM = gql`
    mutation CreateForm($name: String!, $formType: String, $orderNo: Int, $menuName: String) {
        createForm(name: $name, formType: $formType, orderNo: $orderNo, menuName: $menuName) {
            formId
        }
    }
`;

const UPDATE_FORM = gql`
    mutation UpdateForm($formId: Int!, $name: String, $formType: String, $orderNo: Int, $menuName: String) {
        updateForm(formId: $formId, name: $name, formType: $formType, orderNo: $orderNo, menuName: $menuName) {
            formId
        }
    }
`;

const DELETE_FORM = gql`
    mutation DeleteForm($formId: Int!) {
        deleteForm(formId: $formId)
    }
`;

type FormState = {
    name: string;
    formType: string;
    orderNo: number | null;
    menuName: string;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    formType: z.string(),
    orderNo: z.number().int().nonnegative().nullable(),
    menuName: z.string()
});

const DEFAULT_FORM: FormState = {
    name: '',
    formType: '',
    orderNo: null,
    menuName: ''
};

const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export default function AccountsFormsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<FormRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<FormRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);

    const { data, loading, error, refetch } = useQuery(FORMS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createForm] = useMutation(CREATE_FORM, { client: apolloClient });
    const [updateForm] = useMutation(UPDATE_FORM, { client: apolloClient });
    const [deleteForm] = useMutation(DELETE_FORM, { client: apolloClient });

    const rows: FormRow[] = useMemo(() => data?.forms ?? [], [data]);
    const isFormDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.formId, row.name, row.formType, row.menuName, row.orderNo]
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

    const openEdit = (row: FormRow) => {
        setEditing(row);
        setForm({
            name: row.name ?? '',
            formType: row.formType ?? '',
            orderNo: row.orderNo ?? null,
            menuName: row.menuName ?? ''
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: FormRow) => {
        setDetailRow(row);
        setDetailVisible(true);
    };

    const navigateEditRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(rows, editingIndex, direction);
        if (!nextRow) return;
        openEdit(nextRow);
    };

    const navigateDetailRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(rows, detailIndex, direction);
        if (!nextRow) return;
        openView(nextRow);
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
                name: form.name.trim(),
                formType: toOptionalText(form.formType),
                orderNo: form.orderNo,
                menuName: toOptionalText(form.menuName)
            };

            if (editing) {
                await updateForm({
                    variables: {
                        formId: editing.formId,
                        ...variables
                    }
                });
            } else {
                await createForm({ variables });
            }

            await refetch();
            setInitialForm(form);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Form saved.'
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

    const handleDelete = async (formId: number) => {
        try {
            await deleteForm({ variables: { formId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Form deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: FormRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this form?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.formId)
        });
    };

    const actionsBody = (row: FormRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} />
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
                        <h2 className="m-0">Forms</h2>
                        <p className="mt-2 mb-0 text-600">Maintain form master entries and menu ordering.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button className="app-action-compact" label="New Form" icon="pi pi-plus" onClick={openNew} />
                        <AppHelpDialogButton {...getMasterPageHelp('forms')} buttonAriaLabel="Open Forms help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading forms: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="formId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as FormRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search forms"
                            style={{ width: '100%' }}
                        />
                    </span>
                }
                headerRight={
                    <>
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            onClick={() => refetch()}
                        />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="p-button-text"
                            onClick={() => window.print()}
                        />
                        <Button
                            label="Export"
                            icon="pi pi-download"
                            className="p-button-info"
                            onClick={() => dtRef.current?.exportCSV()}
                            disabled={filteredRows.length === 0}
                        />
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} form{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} form${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="formType" header="Type" sortable />
                <Column field="menuName" header="Menu" />
                <Column field="orderNo" header="Order" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Form' : 'New Form'}
                visible={dialogVisible}
                style={{ width: MASTER_EDIT_DIALOG_WIDTHS.medium }}
                onShow={() => setInitialForm(form)}
                onHide={() => setDialogVisible(false)}
                footer={
                    <MasterEditDialogFooter
                        index={editingIndex}
                        total={rows.length}
                        onNavigate={navigateEditRecord}
                        navigateDisabled={saving}
                        bulkMode={{ checked: isBulkMode, onChange: setIsBulkMode, disabled: saving }}
                        onCancel={() => setDialogVisible(false)}
                        cancelDisabled={saving}
                        onSave={save}
                        saveLabel={saving ? 'Saving...' : 'Save'}
                        saveDisabled={saving || !isFormDirty}
                    />
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Form Type</label>
                        <AppInput
                            value={form.formType}
                            onChange={(e) => setForm((s) => ({ ...s, formType: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Menu Name</label>
                        <AppInput
                            value={form.menuName}
                            onChange={(e) => setForm((s) => ({ ...s, menuName: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Order No</label>
                        <AppInput inputType="number"
                            value={form.orderNo}
                            onValueChange={(e) =>
                                setForm((s) => ({
                                    ...s,
                                    orderNo: typeof e.value === 'number' ? e.value : null
                                }))
                            }
                            useGrouping={false}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Form Details"
                visible={detailVisible}
                style={{ width: MASTER_DETAIL_DIALOG_WIDTHS.medium }}
                onHide={() => setDetailVisible(false)}
                footer={
                    <MasterDetailDialogFooter
                        index={detailIndex}
                        total={rows.length}
                        onNavigate={navigateDetailRecord}
                        onClose={() => setDetailVisible(false)}
                    />
                }
            >
                {detailRow && (
                    <MasterDetailGrid columns={2}>
                        <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                        <MasterDetailCard label="Type" value={detailRow.formType ?? '-'} />
                        <MasterDetailCard label="Menu" value={detailRow.menuName ?? '-'} />
                        <MasterDetailCard label="Order" value={detailRow.orderNo ?? '-'} />
                    </MasterDetailGrid>
                )}
            </Dialog>
        </div>
    );
}
