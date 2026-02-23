'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { z } from 'zod';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchInventoryMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
import {
    getMasterActionDeniedDetail,
    isMasterActionAllowed,
    type MasterAction,
    useMasterActionPermissions
} from '@/lib/masterActionPermissions';
import { ensureDryEditCheck } from '@/lib/masterDryRun';

interface BillCollectionStatusRow {
    billCollectionStatusId: number;
    name: string | null;
    isCompletedFlag: number | null;
    isRemarkCompulsoryFlag: number | null;
    orderNo: number | null;
    color: string | null;
}

const BILL_COLLECTION_STATUSES = gql`
    query BillCollectionStatuses($search: String, $limit: Int) {
        billCollectionStatuses(search: $search, limit: $limit) {
            billCollectionStatusId
            name
            isCompletedFlag
            isRemarkCompulsoryFlag
            orderNo
            color
        }
    }
`;

const CREATE_BILL_COLLECTION_STATUS = gql`
    mutation CreateBillCollectionStatus(
        $name: String!
        $isCompletedFlag: Int
        $isRemarkCompulsoryFlag: Int
        $orderNo: Int
        $color: String
    ) {
        createBillCollectionStatus(
            name: $name
            isCompletedFlag: $isCompletedFlag
            isRemarkCompulsoryFlag: $isRemarkCompulsoryFlag
            orderNo: $orderNo
            color: $color
        ) {
            billCollectionStatusId
        }
    }
`;

const UPDATE_BILL_COLLECTION_STATUS = gql`
    mutation UpdateBillCollectionStatus(
        $billCollectionStatusId: Int!
        $name: String
        $isCompletedFlag: Int
        $isRemarkCompulsoryFlag: Int
        $orderNo: Int
        $color: String
    ) {
        updateBillCollectionStatus(
            billCollectionStatusId: $billCollectionStatusId
            name: $name
            isCompletedFlag: $isCompletedFlag
            isRemarkCompulsoryFlag: $isRemarkCompulsoryFlag
            orderNo: $orderNo
            color: $color
        ) {
            billCollectionStatusId
        }
    }
`;

const DELETE_BILL_COLLECTION_STATUS = gql`
    mutation DeleteBillCollectionStatus($billCollectionStatusId: Int!) {
        deleteBillCollectionStatus(billCollectionStatusId: $billCollectionStatusId)
    }
`;

type FormState = {
    name: string;
    isCompletedFlag: boolean;
    isRemarkCompulsoryFlag: boolean;
    orderNo: number | null;
    color: string;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    isCompletedFlag: z.boolean(),
    isRemarkCompulsoryFlag: z.boolean(),
    orderNo: z.number().int().nonnegative().nullable(),
    color: z.string()
});

const DEFAULT_FORM: FormState = {
    name: '',
    isCompletedFlag: false,
    isRemarkCompulsoryFlag: false,
    orderNo: null,
    color: ''
};
const limitOptions = [100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

const flagToBool = (value: number | null | undefined) => Number(value || 0) === 1;
const boolToFlag = (value: boolean) => (value ? 1 : 0);

export default function InventoryBillCollectionStatusPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<BillCollectionStatusRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<BillCollectionStatusRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(BILL_COLLECTION_STATUSES, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createBillCollectionStatus] = useMutation(CREATE_BILL_COLLECTION_STATUS, {
        client: inventoryApolloClient
    });
    const [updateBillCollectionStatus] = useMutation(UPDATE_BILL_COLLECTION_STATUS, {
        client: inventoryApolloClient
    });
    const [deleteBillCollectionStatus] = useMutation(DELETE_BILL_COLLECTION_STATUS, {
        client: inventoryApolloClient
    });

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: BillCollectionStatusRow[] = useMemo(() => data?.billCollectionStatuses ?? [], [data]);

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
    };

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: BillCollectionStatusRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setForm({
            name: row.name ?? '',
            isCompletedFlag: flagToBool(row.isCompletedFlag),
            isRemarkCompulsoryFlag: flagToBool(row.isRemarkCompulsoryFlag),
            orderNo: row.orderNo ?? null,
            color: row.color ?? ''
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: BillCollectionStatusRow) => {
        if (!assertActionAllowed('view')) return;
        setDetailRow(row);
        setDetailVisible(true);
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

        if (!ensureDryEditCheck({
            isEditing: Boolean(editing),
            lastDigest: dryEditDigest,
            currentDigest: JSON.stringify(form),
            setLastDigest: setDryEditDigest,
            toastRef,
            entityLabel: 'record'
        })) return;

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim(),
                isCompletedFlag: boolToFlag(form.isCompletedFlag),
                isRemarkCompulsoryFlag: boolToFlag(form.isRemarkCompulsoryFlag),
                orderNo: form.orderNo,
                color: form.color.trim() || null
            };

            if (editing) {
                await updateBillCollectionStatus({
                    variables: {
                        billCollectionStatusId: editing.billCollectionStatusId,
                        ...variables
                    }
                });
            } else {
                await createBillCollectionStatus({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Bill collection status saved.'
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

    const handleDelete = async (billCollectionStatusId: number) => {
        try {
            await deleteBillCollectionStatus({ variables: { billCollectionStatusId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Bill collection status deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'bill collection status')
            });
        }
    };

    const confirmDelete = async () => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('BILL_COLLECTION_STATUS', row.billCollectionStatusId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('bill collection status', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('bill collection status')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.billCollectionStatusId)
        });
    };

    const flagsBody = (row: BillCollectionStatusRow) => {
        const flags: React.ReactNode[] = [];
        if (flagToBool(row.isCompletedFlag)) {
            flags.push(<Tag key="completed" value="Completed" severity="success" />);
        }
        if (flagToBool(row.isRemarkCompulsoryFlag)) {
            flags.push(<Tag key="remark" value="Remark Required" severity="warning" />);
        }
        if (flags.length === 0) return <Tag value="-" severity="secondary" />;
        return <div className="flex gap-1 flex-wrap">{flags}</div>;
    };

    const colorBody = (row: BillCollectionStatusRow) => {
        const color = row.color?.trim();
        if (!color) return <span className="text-500">-</span>;
        return (
            <div className="flex align-items-center gap-2">
                <span
                    style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '4px',
                        background: color,
                        border: '1px solid rgba(0,0,0,0.15)'
                    }}
                />
                <span>{color}</span>
            </div>
        );
    };

    const actionsBody = (row: BillCollectionStatusRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} disabled={!masterPermissions.canView} />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} disabled={!masterPermissions.canEdit} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => { void confirmDelete(e, row); }} disabled={!masterPermissions.canDelete} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Bill Collection Status</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain bill collection status definitions for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Status" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                    </div>
                </div>
                {error && (
                    <p className="text-red-500 m-0">Error loading bill collection statuses: {error.message}</p>
                )}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="billCollectionStatusId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as BillCollectionStatusRow) : openView(e.data as BillCollectionStatusRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search bill collection status"
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
                            disabled={rows.length === 0}
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
                            Showing {rows.length} status{rows.length === 1 ? '' : 'es'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} status${rows.length === 1 ? '' : 'es'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Flags" body={flagsBody} />
                <Column field="orderNo" header="Order" sortable />
                <Column header="Color" body={colorBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Bill Collection Status' : 'New Bill Collection Status'}
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
                    <div className="col-12">
                        <div className="flex flex-wrap gap-4">
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="bcCompleted"
                                    checked={form.isCompletedFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isCompletedFlag: !!e.checked }))}
                                />
                                <label htmlFor="bcCompleted" className="text-sm text-600">
                                    Completed
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="bcRemark"
                                    checked={form.isRemarkCompulsoryFlag}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, isRemarkCompulsoryFlag: !!e.checked }))
                                    }
                                />
                                <label htmlFor="bcRemark" className="text-sm text-600">
                                    Remark Required
                                </label>
                            </span>
                        </div>
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Order No</label>
                        <InputNumber
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
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Color</label>
                        <InputText
                            value={form.color}
                            onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))}
                            style={{ width: '100%' }}
                            placeholder="#10B981"
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Bill Collection Status Details"
                visible={detailVisible}
                style={{ width: 'min(640px, 96vw)' }}
                onHide={() => setDetailVisible(false)}
                footer={
                    <div className="flex justify-content-end w-full">
                        <Button label="Close" className="p-button-text" onClick={() => setDetailVisible(false)} />
                    </div>
                }
            >
                {detailRow && (
                    <div className="flex flex-column gap-2">
                        <div><strong>Name:</strong> {detailRow.name ?? '-'}</div>
                        <div><strong>Completed:</strong> {flagToBool(detailRow.isCompletedFlag) ? 'Yes' : 'No'}</div>
                        <div><strong>Remark Required:</strong> {flagToBool(detailRow.isRemarkCompulsoryFlag) ? 'Yes' : 'No'}</div>
                        <div><strong>Order No:</strong> {detailRow.orderNo ?? '-'}</div>
                        <div><strong>Color:</strong> {detailRow.color || '-'}</div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
