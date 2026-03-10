'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
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
import { MASTER_DETAIL_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';

interface HsnCodeRow {
    hsnCodeId: number;
    name: string | null;
    code: string | null;
    description: string | null;
}

const HSN_CODES = gql`
    query HsnCodes($search: String, $limit: Int) {
        hsnCodes(search: $search, limit: $limit) {
            hsnCodeId
            name
            code
            description
        }
    }
`;

const CREATE_HSN_CODE = gql`
    mutation CreateHsnCode($name: String!, $code: String, $description: String) {
        createHsnCode(name: $name, code: $code, description: $description) {
            hsnCodeId
        }
    }
`;

const UPDATE_HSN_CODE = gql`
    mutation UpdateHsnCode($hsnCodeId: Int!, $name: String, $code: String, $description: String) {
        updateHsnCode(hsnCodeId: $hsnCodeId, name: $name, code: $code, description: $description) {
            hsnCodeId
        }
    }
`;

const DELETE_HSN_CODE = gql`
    mutation DeleteHsnCode($hsnCodeId: Int!) {
        deleteHsnCode(hsnCodeId: $hsnCodeId)
    }
`;

const FETCH_HSN_DESCRIPTION_FROM_GST = gql`
    mutation FetchHsnDescriptionFromGst($hsnCode: String!) {
        fetchHsnDescriptionFromGst(hsnCode: $hsnCode) {
            hsnCode
            description
            found
            errors
        }
    }
`;

type FormState = {
    hsnCode: string;
    description: string;
};

const GST_HSN_CODE_REGEX = /^(?:\d{4}|\d{6}|\d{8})$/;

const formSchema = z.object({
    hsnCode: z
        .string()
        .trim()
        .min(1, 'HSN code is required')
        .regex(GST_HSN_CODE_REGEX, 'HSN code must be numeric with 4, 6, or 8 digits'),
    description: z.string().trim().optional()
});

const DEFAULT_FORM: FormState = {
    hsnCode: '',
    description: ''
};

const normalizeFormState = (value: FormState): FormState => ({
    hsnCode: value.hsnCode.trim(),
    description: value.description.trim()
});

export default function InventoryHsnCodesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<HsnCodeRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<HsnCodeRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(HSN_CODES, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });
    const [createHsnCode] = useMutation(CREATE_HSN_CODE, { client: inventoryApolloClient });
    const [updateHsnCode] = useMutation(UPDATE_HSN_CODE, { client: inventoryApolloClient });
    const [deleteHsnCode] = useMutation(DELETE_HSN_CODE, { client: inventoryApolloClient });
    const [fetchHsnDescriptionMutation] = useMutation(FETCH_HSN_DESCRIPTION_FROM_GST, { client: inventoryApolloClient });
    const [fetchingDescription, setFetchingDescription] = useState(false);

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: HsnCodeRow[] = useMemo(() => data?.hsnCodes ?? [], [data]);
    const editingIndex = useMemo(() => {
        if (!editing) return -1;
        return rows.findIndex((row) => row.hsnCodeId === editing.hsnCodeId);
    }, [editing, rows]);
    const detailIndex = useMemo(() => {
        if (!detailRow) return -1;
        return rows.findIndex((row) => row.hsnCodeId === detailRow.hsnCodeId);
    }, [detailRow, rows]);
    const isFormDirty = useMemo(() => {
        if (!dialogVisible) return false;
        const current = normalizeFormState(form);
        const initial = normalizeFormState(initialForm);
        return current.hsnCode !== initial.hsnCode || current.description !== initial.description;
    }, [dialogVisible, form, initialForm]);

    const applyEditRow = (row: HsnCodeRow) => {
        const nextForm: FormState = {
            hsnCode: row.code ?? row.name ?? '',
            description: row.description ?? ''
        };
        setDryEditDigest('');
        setEditing(row);
        setInitialForm(nextForm);
        setForm(nextForm);
        setFormErrors({});
    };

    const getApolloErrorMessage = (error: any): string => {
        const graphQLError = error?.graphQLErrors?.[0]?.message;
        if (graphQLError) return graphQLError;
        const networkGraphQLError = error?.networkError?.result?.errors?.[0]?.message;
        if (networkGraphQLError) return networkGraphQLError;
        const networkError = error?.networkError?.message;
        if (networkError) return networkError;
        return error?.message ?? 'Unknown error';
    };

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
        setInitialForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: HsnCodeRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        applyEditRow(row);
        setDialogVisible(true);
    };

    const closeDialog = () => {
        if (saving) return;
        if (!isFormDirty) {
            setDialogVisible(false);
            return;
        }
        confirmDialog({
            header: 'Discard changes?',
            message: 'You have unsaved changes. Discard and close this form?',
            icon: 'pi pi-exclamation-triangle',
            rejectLabel: 'Keep Editing',
            acceptLabel: 'Discard',
            acceptClassName: 'p-button-danger',
            defaultFocus: 'reject',
            accept: () => {
                setDialogVisible(false);
                setFormErrors({});
            },
            reject: () => undefined
        });
    };

    const navigateEditRecord = (direction: 'first' | 'previous' | 'next' | 'last') => {
        if (!editing) return;
        let nextIndex = editingIndex;
        if (direction === 'first') nextIndex = 0;
        if (direction === 'previous') nextIndex = editingIndex - 1;
        if (direction === 'next') nextIndex = editingIndex + 1;
        if (direction === 'last') nextIndex = rows.length - 1;
        const nextRow = rows[nextIndex];
        if (!nextRow) return;

        if (!isFormDirty) {
            applyEditRow(nextRow);
            return;
        }

        confirmDialog({
            header: 'Discard changes?',
            message: 'You have unsaved changes in this record. Discard and move to another record?',
            icon: 'pi pi-exclamation-triangle',
            rejectLabel: 'Keep Editing',
            acceptLabel: 'Discard',
            acceptClassName: 'p-button-danger',
            defaultFocus: 'reject',
            accept: () => applyEditRow(nextRow),
            reject: () => undefined
        });
    };

    const openView = (row: HsnCodeRow) => {
        if (!assertActionAllowed('view')) return;
        setDetailRow(row);
        setDetailVisible(true);
    };

    const navigateDetailRecord = (direction: 'first' | 'previous' | 'next' | 'last') => {
        if (!detailRow) return;
        let nextIndex = detailIndex;
        if (direction === 'first') nextIndex = 0;
        if (direction === 'previous') nextIndex = detailIndex - 1;
        if (direction === 'next') nextIndex = detailIndex + 1;
        if (direction === 'last') nextIndex = rows.length - 1;
        const nextRow = rows[nextIndex];
        if (!nextRow) return;
        setDetailRow(nextRow);
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
            const canonicalHsnCode = form.hsnCode.trim();
            const variables = {
                name: canonicalHsnCode,
                code: canonicalHsnCode,
                description: form.description.trim() || null
            };

            if (editing) {
                await updateHsnCode({
                    variables: {
                        hsnCodeId: editing.hsnCodeId,
                        ...variables
                    }
                });
            } else {
                await createHsnCode({ variables });
            }

            await refetch();
            if (isBulkMode) {
                if (editing) {
                    const persistedForm: FormState = {
                        hsnCode: canonicalHsnCode,
                        description: form.description.trim()
                    };
                    setEditing((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  name: canonicalHsnCode,
                                  code: canonicalHsnCode,
                                  description: persistedForm.description || null
                              }
                            : prev
                    );
                    setForm(persistedForm);
                    setInitialForm(persistedForm);
                    setFormErrors({});
                    toastRef.current?.show({
                        severity: 'success',
                        summary: 'Saved',
                        detail: 'HSN code saved. Bulk mode kept this form open.'
                    });
                } else {
                    setForm(DEFAULT_FORM);
                    setInitialForm(DEFAULT_FORM);
                    setFormErrors({});
                    toastRef.current?.show({
                        severity: 'success',
                        summary: 'Saved',
                        detail: 'HSN code saved. Ready for next entry.'
                    });
                }
            } else {
                setDialogVisible(false);
                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Saved',
                    detail: 'HSN code saved.'
                });
            }
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

    const handleDelete = async (hsnCodeId: number) => {
        try {
            await deleteHsnCode({ variables: { hsnCodeId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'HSN code deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'HSN code')
            });
        }
    };

    const fetchDescriptionForFormHsn = async () => {
        const requiredAction: MasterAction = editing ? 'edit' : 'add';
        if (!assertActionAllowed(requiredAction)) return;

        const candidateHsnCode = form.hsnCode.trim();
        if (!GST_HSN_CODE_REGEX.test(candidateHsnCode)) {
            setFormErrors((prev) => ({
                ...prev,
                hsnCode: 'HSN code must be numeric with 4, 6, or 8 digits'
            }));
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Invalid HSN code',
                detail: 'Enter a valid 4, 6, or 8 digit HSN before fetching description.'
            });
            return;
        }

        setFetchingDescription(true);
        try {
            const { data: fetchData } = await fetchHsnDescriptionMutation({
                variables: { hsnCode: candidateHsnCode }
            });
            const result = fetchData?.fetchHsnDescriptionFromGst;
            if (!result) {
                toastRef.current?.show({
                    severity: 'warn',
                    summary: 'No response',
                    detail: 'Unable to fetch description from GST source.'
                });
                return;
            }

            if (result.found && result.description) {
                setForm((state) => ({ ...state, description: result.description }));
                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Description fetched',
                    detail: `Description loaded for HSN ${result.hsnCode}.`
                });
                return;
            }

            const firstError = result.errors?.[0];
            toastRef.current?.show({
                severity: firstError ? 'error' : 'warn',
                summary: 'Description not found',
                detail:
                    firstError ??
                    `No GST description was found for HSN ${candidateHsnCode}.`
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Fetch failed',
                detail: getApolloErrorMessage(e)
            });
        } finally {
            setFetchingDescription(false);
        }
    };

    const confirmDelete = async (event: React.MouseEvent<HTMLElement>, row: HsnCodeRow) => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('HSN_CODE', row.hsnCodeId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('HSN code', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('HSN code')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.hsnCodeId)
        });
    };

    const actionsBody = (row: HsnCodeRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} disabled={!masterPermissions.canView} />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} disabled={!masterPermissions.canEdit} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => { void confirmDelete(e, row); }} disabled={!masterPermissions.canDelete} />
        </div>
    );
    const hsnCodeBody = (row: HsnCodeRow) => row.code?.trim() || row.name?.trim() || '-';
    const descriptionBody = (row: HsnCodeRow) => row.description?.trim() || '-';

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />
            <ConfirmDialog />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">HSN Codes</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain HSN codes for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button label="New HSN" icon="pi pi-plus" className="app-action-compact" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <AppHelpDialogButton {...getMasterPageHelp('hsnCodes')} buttonAriaLabel="Open HSN Codes help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading HSN codes: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="hsnCodeId"
                stripedRows
                size="small"
                loading={loading}
                emptyMessage={search.trim() ? 'No HSN codes match your search.' : 'No HSN codes found.'}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as HsnCodeRow) : openView(e.data as HsnCodeRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search HSN code"
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
                            disabled={rows.length === 0}
                        />
                        <span className="text-600 text-sm">
                            Showing {rows.length} code{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} code${rows.length === 1 ? '' : 's'}`}
            >
                <Column header="HSN Code" body={hsnCodeBody} sortable sortField="code" />
                <Column header="Description" body={descriptionBody} sortable sortField="description" />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit HSN Code' : 'New HSN Code'}
                visible={dialogVisible}
                style={{ width: 'min(640px, 96vw)' }}
                onHide={closeDialog}
                footer={
                    <MasterEditDialogFooter
                        index={editingIndex}
                        total={rows.length}
                        onNavigate={navigateEditRecord}
                        navigateDisabled={saving || fetchingDescription}
                        bulkMode={{
                            checked: isBulkMode,
                            onChange: setIsBulkMode,
                            onLabel: 'Bulk',
                            offLabel: 'Standard',
                            disabled: saving
                        }}
                        onCancel={closeDialog}
                        cancelDisabled={saving}
                        onSave={save}
                        saveDisabled={saving || !isFormDirty}
                        saveLabel={saving ? 'Saving...' : 'Save'}
                    />
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label className="block text-600 mb-1">HSN Code</label>
                        <AppInput
                            value={form.hsnCode}
                            onChange={(e) => setForm((s) => ({ ...s, hsnCode: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.hsnCode ? 'p-invalid' : undefined}
                            inputMode="numeric"
                            maxLength={8}
                        />
                        <div className="mt-2 flex align-items-center gap-2">
                            <Button
                                label={fetchingDescription ? 'Fetching...' : 'Fetch Description'}
                                icon="pi pi-cloud-download"
                                className="p-button-text p-button-sm"
                                onClick={() => { void fetchDescriptionForFormHsn(); }}
                                disabled={fetchingDescription}
                            />
                            <small className="text-500">Fetch description for this HSN from GST source.</small>
                        </div>
                        {formErrors.hsnCode && <small className="p-error">{formErrors.hsnCode}</small>}
                        <small className="block text-500 mt-2">
                            Use numeric HSN only (4, 6, or 8 digits as per GST HSN hierarchy).
                        </small>
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">HSN Description (Optional)</label>
                        <AppInput
                            value={form.description}
                            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.description ? 'p-invalid' : undefined}
                        />
                        {formErrors.description && <small className="p-error">{formErrors.description}</small>}
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="HSN Code Details"
                visible={detailVisible}
                style={{ width: MASTER_DETAIL_DIALOG_WIDTHS.standard }}
                contentClassName="pt-2 pb-2"
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
                        <MasterDetailCard label="HSN Code" value={detailRow.code ?? detailRow.name ?? '-'} />
                        <MasterDetailCard label="Description" value={detailRow.description?.trim() || '-'} />
                    </MasterDetailGrid>
                )}
            </Dialog>
        </div>
    );
}
