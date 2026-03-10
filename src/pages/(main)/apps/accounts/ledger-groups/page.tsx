'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { Link } from 'react-router-dom';
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppPassword from '@/components/AppPassword';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import { ACCOUNT_MASTER_QUERY_OPTIONS, invalidateAccountMasterLookups } from '@/lib/accounts/masterLookupCache';
import { getLedgerGroupTypeLabel, getLedgerGroupTypeOptions } from '@/lib/accounts/ledgerGroupTypeLabels';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchAccountsMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
import {
    getMasterActionDeniedDetail,
    isMasterActionAllowed,
    type MasterAction,
    useMasterActionPermissions
} from '@/lib/masterActionPermissions';
import { ensureDryEditCheck } from '@/lib/masterDryRun';
import { z } from 'zod';

interface LedgerGroupRow {
    ledgerGroupId: number;
    name: string | null;
    groupTypeCode: number | null;
    defaultBalanceType: number | null; // 1 Dr, -1 Cr
    isTradingFlag: number | null;
    isProfitLossFlag: number | null;
    isBalanceSheetFlag: number | null;
    annexureName: string | null;
    editPassword: string | null;
}

const LEDGER_GROUPS = gql`
    query LedgerGroups($search: String, $limit: Int) {
        ledgerGroups(search: $search, limit: $limit) {
            ledgerGroupId
            name
            groupTypeCode
            defaultBalanceType
            isTradingFlag
            isProfitLossFlag
            isBalanceSheetFlag
            annexureName
            editPassword
        }
    }
`;

const CREATE_LEDGER_GROUP = gql`
    mutation CreateLedgerGroup(
        $name: String!
        $groupTypeCode: Int
        $defaultBalanceType: Int
        $isTradingFlag: Int
        $isProfitLossFlag: Int
        $isBalanceSheetFlag: Int
        $annexureName: String
        $editPassword: String
    ) {
        createLedgerGroup(
            name: $name
            groupTypeCode: $groupTypeCode
            defaultBalanceType: $defaultBalanceType
            isTradingFlag: $isTradingFlag
            isProfitLossFlag: $isProfitLossFlag
            isBalanceSheetFlag: $isBalanceSheetFlag
            annexureName: $annexureName
            editPassword: $editPassword
        ) {
            ledgerGroupId
        }
    }
`;

const UPDATE_LEDGER_GROUP = gql`
    mutation UpdateLedgerGroup(
        $ledgerGroupId: Int!
        $name: String
        $groupTypeCode: Int
        $defaultBalanceType: Int
        $isTradingFlag: Int
        $isProfitLossFlag: Int
        $isBalanceSheetFlag: Int
        $annexureName: String
        $editPassword: String
    ) {
        updateLedgerGroup(
            ledgerGroupId: $ledgerGroupId
            name: $name
            groupTypeCode: $groupTypeCode
            defaultBalanceType: $defaultBalanceType
            isTradingFlag: $isTradingFlag
            isProfitLossFlag: $isProfitLossFlag
            isBalanceSheetFlag: $isBalanceSheetFlag
            annexureName: $annexureName
            editPassword: $editPassword
        ) {
            ledgerGroupId
        }
    }
`;

const DELETE_LEDGER_GROUP = gql`
    mutation DeleteLedgerGroup($ledgerGroupId: Int!) {
        deleteLedgerGroup(ledgerGroupId: $ledgerGroupId)
    }
`;

type FormState = {
    name: string;
    groupTypeCode: number | null;
    defaultBalanceType: -1 | 1;
    isTradingFlag: boolean;
    isProfitLossFlag: boolean;
    isBalanceSheetFlag: boolean;
    annexureName: string;
    editPassword: string;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    groupTypeCode: z.number().int().nullable(),
    defaultBalanceType: z.union([z.literal(1), z.literal(-1)]),
    isTradingFlag: z.boolean(),
    isProfitLossFlag: z.boolean(),
    isBalanceSheetFlag: z.boolean(),
    annexureName: z.string(),
    editPassword: z.string().max(50, 'Edit password must be at most 50 characters')
});

const DEFAULT_FORM: FormState = {
    name: '',
    groupTypeCode: null,
    defaultBalanceType: 1,
    isTradingFlag: false,
    isProfitLossFlag: false,
    isBalanceSheetFlag: true,
    annexureName: '',
    editPassword: ''
};

const BALANCE_OPTIONS = [
    { label: 'Debit (Dr)', value: 1 },
    { label: 'Credit (Cr)', value: -1 }
] as const;
const PROTECTED_LOCKED_FIELDS = ['Group Header', 'Default Balance', 'Trading', 'Profit & Loss', 'Balance Sheet'];
const LEGACY_GROUP_HEADER_OPTIONS = getLedgerGroupTypeOptions();
const PROTECTED_ACCOUNTING_GROUP_TYPE_CODES = new Set([
    ...Array.from({ length: 40 }, (_, index) => index + 1),
    -1,
    -2,
    -3,
    -4,
    -5,
    -6,
    -7,
    -8
]);

const flagToBool = (value: number | null | undefined) => Number(value || 0) === 1;
const boolToFlag = (value: boolean) => (value ? 1 : 0);
const isProtectedAccountingGroupTypeCode = (value: number | null | undefined) => {
    if (value == null) return false;
    return PROTECTED_ACCOUNTING_GROUP_TYPE_CODES.has(Number(value));
};

export default function AccountsLedgerGroupsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const apolloClient = useApolloClient();

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<LedgerGroupRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<LedgerGroupRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);

    const [dryEditDigest, setDryEditDigest] = useState('');
    const [initialFormDigest, setInitialFormDigest] = useState(JSON.stringify(DEFAULT_FORM));

    const { data, loading, error, refetch } = useQuery(LEDGER_GROUPS, {
        variables: { search: search.trim() || null, limit },
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });
    const [createLedgerGroup] = useMutation(CREATE_LEDGER_GROUP);
    const [updateLedgerGroup] = useMutation(UPDATE_LEDGER_GROUP);
    const [deleteLedgerGroup] = useMutation(DELETE_LEDGER_GROUP);

    const { permissions: masterPermissions } = useMasterActionPermissions(apolloClient);

    const rows: LedgerGroupRow[] = useMemo(() => data?.ledgerGroups ?? [], [data]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);
    const groupHeaderOptions = useMemo(() => {
        const base = LEGACY_GROUP_HEADER_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value
        }));
        if (form.groupTypeCode == null) return base;
        const currentCode = Number(form.groupTypeCode);
        if (base.some((option) => Number(option.value) === currentCode)) return base;
        return [{ label: getLedgerGroupTypeLabel(currentCode), value: currentCode }, ...base];
    }, [form.groupTypeCode]);
    const currentFormDigest = useMemo(() => JSON.stringify(form), [form]);
    const isFormDirty = useMemo(() => currentFormDigest !== initialFormDigest, [currentFormDigest, initialFormDigest]);
    const isDryEditReady = useMemo(
        () => Boolean(editing && dryEditDigest && dryEditDigest === currentFormDigest),
        [currentFormDigest, dryEditDigest, editing]
    );
    const isEditingProtectedGroup = useMemo(
        () => isProtectedAccountingGroupTypeCode(editing?.groupTypeCode ?? null),
        [editing]
    );
    const saveButtonLabel = useMemo(() => {
        if (saving) {
            if (!editing) return 'Saving...';
            return isDryEditReady ? 'Applying...' : 'Checking...';
        }
        if (!editing) return 'Save';
        return isDryEditReady ? 'Apply Changes' : 'Run Dry Check';
    }, [editing, isDryEditReady, saving]);

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
    };

    const closeDialog = () => {
        setShowPassword(false);
        setDialogVisible(false);
    };

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setShowPassword(false);
        setDialogVisible(true);
    };

    const openEdit = (row: LedgerGroupRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setForm({
            name: row.name ?? '',
            groupTypeCode: row.groupTypeCode ?? null,
            defaultBalanceType: (row.defaultBalanceType === -1 ? -1 : 1) as -1 | 1,
            isTradingFlag: flagToBool(row.isTradingFlag),
            isProfitLossFlag: flagToBool(row.isProfitLossFlag),
            isBalanceSheetFlag: flagToBool(row.isBalanceSheetFlag),
            annexureName: row.annexureName ?? '',
            editPassword: row.editPassword ?? ''
        });
        setFormErrors({});
        setShowPassword(false);
        setDialogVisible(true);
    };

    const openView = (row: LedgerGroupRow) => {
        if (!assertActionAllowed('view')) return;
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

        setFormErrors({});
        if (!ensureDryEditCheck({
            isEditing: Boolean(editing),
            lastDigest: dryEditDigest,
            currentDigest: currentFormDigest,
            setLastDigest: setDryEditDigest,
            toastRef,
            entityLabel: 'record'
        })) return;

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim(),
                groupTypeCode: form.groupTypeCode == null ? null : Number(form.groupTypeCode),
                defaultBalanceType: Number(form.defaultBalanceType),
                isTradingFlag: boolToFlag(form.isTradingFlag),
                isProfitLossFlag: boolToFlag(form.isProfitLossFlag),
                isBalanceSheetFlag: boolToFlag(form.isBalanceSheetFlag),
                annexureName: form.annexureName.trim() ? form.annexureName.trim() : null,
                editPassword: form.editPassword.trim() ? form.editPassword.trim() : null
            };

            if (editing) {
                await updateLedgerGroup({ variables: { ledgerGroupId: editing.ledgerGroupId, ...variables } });
            } else {
                await createLedgerGroup({ variables });
            }

            invalidateAccountMasterLookups(apolloClient);
            await refetch();
            setInitialFormDigest(currentFormDigest);
            if (!isBulkMode) {
                closeDialog();
            }
            toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: 'Ledger group saved.' });
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (ledgerGroupId: number) => {
        try {
            await deleteLedgerGroup({ variables: { ledgerGroupId } });
            invalidateAccountMasterLookups(apolloClient);
            await refetch();
            toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Ledger group deleted.' });
        } catch (e: any) {
            const rawMessage = typeof e?.message === 'string' ? e.message : '';
            const detail =
                /protected accounting ledger group|referenced in \d+ record/i.test(rawMessage)
                    ? rawMessage
                    : getDeleteFailureMessage(e, 'ledger group');
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail });
        }
    };

    const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>, row: LedgerGroupRow) => {
        if (!assertActionAllowed('delete')) return;
        if (isProtectedAccountingGroupTypeCode(row.groupTypeCode)) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: 'Protected accounting ledger groups cannot be deleted.',
                life: 7000
            });
            return;
        }
        const impact = await fetchAccountsMasterDeleteImpact('LEDGER_GROUP', row.ledgerGroupId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('ledger group', impact),
                life: 7000
            });
            return;
        }

        toastRef.current?.show({
            severity: 'info',
            summary: 'Dry Delete Check Passed',
            detail: 'No references found. Confirm delete to execute the actual delete.',
            life: 4500
        });
        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('ledger group')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.ledgerGroupId)
        });
    };

    const defaultBalanceBody = (row: LedgerGroupRow) => {
        const v = Number(row.defaultBalanceType || 0);
        if (v === -1) return <Tag value="Cr" severity="warning" />;
        if (v === 1) return <Tag value="Dr" severity="info" />;
        return <Tag value="-" severity="secondary" />;
    };

    const groupTypeBody = (row: LedgerGroupRow) => {
        const typeValue = getLedgerGroupTypeLabel(row.groupTypeCode);
        const isProtected = isProtectedAccountingGroupTypeCode(row.groupTypeCode);
        return (
            <div className="flex align-items-center justify-content-between gap-2">
                <span>{typeValue}</span>
                {isProtected && <Tag value="Protected" severity="warning" />}
            </div>
        );
    };

    const flagsBody = (row: LedgerGroupRow) => (
        <div className="flex gap-1 flex-wrap">
            {flagToBool(row.isTradingFlag) && <Tag value="Trading" severity="info" />}
            {flagToBool(row.isProfitLossFlag) && <Tag value="P&L" severity="danger" />}
            {flagToBool(row.isBalanceSheetFlag) && <Tag value="B/S" severity="success" />}
        </div>
    );

    const renderDetailContent = () => {
        if (!detailRow) return null;
        const isProtected = isProtectedAccountingGroupTypeCode(detailRow.groupTypeCode);
        return (
            <div className="ledger-group-detail">
                <div className="ledger-group-detail__header">
                    <div className="ledger-group-detail__identity">
                        <div className="ledger-group-detail__name">{detailRow.name ?? '-'}</div>
                        <div className="ledger-group-detail__meta">Group Header: {getLedgerGroupTypeLabel(detailRow.groupTypeCode)}</div>
                    </div>
                    <Tag value={isProtected ? 'Protected' : 'Custom'} severity={isProtected ? 'warning' : 'success'} />
                </div>

                <div className="ledger-group-detail__grid">
                    <div className="ledger-group-detail__item">
                        <span className="ledger-group-detail__label">Default Balance</span>
                        <span className="ledger-group-detail__value">{defaultBalanceBody(detailRow)}</span>
                    </div>
                    <div className="ledger-group-detail__item">
                        <span className="ledger-group-detail__label">Annexure</span>
                        <span className="ledger-group-detail__value">{detailRow.annexureName || '-'}</span>
                    </div>
                    <div className="ledger-group-detail__item">
                        <span className="ledger-group-detail__label">Edit Password</span>
                        <span className="ledger-group-detail__value">{detailRow.editPassword?.trim() ? 'Set' : 'Not Set'}</span>
                    </div>
                </div>

                <div className="ledger-group-detail__section">
                    <span className="ledger-group-detail__section-title">Classification</span>
                    <div className="ledger-group-detail__chips">
                        {flagToBool(detailRow.isTradingFlag) && <Tag value="Trading" severity="info" />}
                        {flagToBool(detailRow.isProfitLossFlag) && <Tag value="P&L" severity="danger" />}
                        {flagToBool(detailRow.isBalanceSheetFlag) && <Tag value="B/S" severity="success" />}
                        {!flagToBool(detailRow.isTradingFlag) &&
                            !flagToBool(detailRow.isProfitLossFlag) &&
                            !flagToBool(detailRow.isBalanceSheetFlag) && <span className="text-600">None</span>}
                    </div>
                </div>

                {isProtected && (
                    <div className="ledger-group-detail__section">
                        <span className="ledger-group-detail__section-title">Locked Fields</span>
                        <div className="ledger-group-detail__chips">
                            {PROTECTED_LOCKED_FIELDS.map((fieldLabel) => (
                                <span key={fieldLabel} className="ledger-group-detail__chip">
                                    {fieldLabel}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const actionsBody = (row: LedgerGroupRow) => (
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
                        <h2 className="m-0">Ledger Groups</h2>
                        <p className="mt-2 mb-0 text-600">Create and maintain ledger groups for Accounts.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button label="New Group" icon="pi pi-plus" className="app-action-compact" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <Link to="/apps/accounts/ledgers">
                            <Button label="Ledgers" icon="pi pi-book" className="app-action-compact p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="app-action-compact p-button-outlined" />
                        </Link>
                        <AppHelpDialogButton {...getMasterPageHelp('ledgerGroups')} buttonAriaLabel="Open Ledger Groups help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading ledger groups: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="ledgerGroupId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) =>
                    masterPermissions.canEdit ? openEdit(e.data as LedgerGroupRow) : openView(e.data as LedgerGroupRow)
                }
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search ledger group"
                            style={{ width: '100%' }}
                        />
                    </span>
                }
                headerRight={
                    <>
                        <Button label="Refresh" icon="pi pi-refresh" className="p-button-text" onClick={() => refetch()} />
                        <Button label="Print" icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
                        <Button label="Export" icon="pi pi-download" className="p-button-text" onClick={() => dtRef.current?.exportCSV()} disabled={rows.length === 0} />
                        <span className="text-600 text-sm">Showing {rows.length} group{rows.length === 1 ? '' : 's'}</span>
                    </>
                }
                recordSummary={`${rows.length} group${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="groupTypeCode" header="Group Header" body={groupTypeBody} sortable style={{ width: '16rem' }} />
                <Column header="Default" body={defaultBalanceBody} style={{ width: '7rem' }} />
                <Column header="Flags" body={flagsBody} />
                <Column field="annexureName" header="Annexure" body={(r: LedgerGroupRow) => <span className="text-600">{r.annexureName ?? ''}</span>} />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Ledger Group' : 'New Ledger Group'}
                visible={dialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onShow={() => setInitialFormDigest(currentFormDigest)}
                onHide={closeDialog}
                footer={
                    <MasterEditDialogFooter
                        index={editingIndex}
                        total={rows.length}
                        onNavigate={navigateEditRecord}
                        navigateDisabled={saving}
                        bulkMode={{ checked: isBulkMode, onChange: setIsBulkMode, disabled: saving }}
                        onCancel={closeDialog}
                        cancelDisabled={saving}
                        onSave={save}
                        saveLabel={saveButtonLabel}
                        saveDisabled={saving || !isFormDirty}
                    />
                }
            >
                {editing && (
                    <div
                        className={`mb-3 p-2 border-round text-sm ${
                            isDryEditReady ? 'surface-100 text-green-700' : 'surface-100 text-700'
                        }`}
                    >
                        {isDryEditReady
                            ? 'Dry check passed. Click Apply Changes to save.'
                            : 'Dry save flow: first click runs dry check, second click saves changes.'}
                    </div>
                )}
                {editing && isEditingProtectedGroup && (
                    <Message
                        severity="info"
                        text="Accounting rule: Group Header, Default Balance, and classification flags are locked for protected groups."
                        className="w-full mb-3"
                    />
                )}
                <div className="grid">
                    <div className="col-12 md:col-8">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Group Header</label>
                        <AppDropdown
                            value={form.groupTypeCode}
                            options={groupHeaderOptions}
                            onChange={(e) => setForm((s) => ({ ...s, groupTypeCode: e.value ?? null }))}
                            filter
                            showClear
                            placeholder="Select group header"
                            disabled={Boolean(editing) && isEditingProtectedGroup}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Default Balance</label>
                        <AppDropdown
                            value={form.defaultBalanceType}
                            options={BALANCE_OPTIONS}
                            onChange={(e) => setForm((s) => ({ ...s, defaultBalanceType: e.value }))}
                            disabled={Boolean(editing) && isEditingProtectedGroup}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Annexure</label>
                        <AppInput
                            value={form.annexureName}
                            onChange={(e) => setForm((s) => ({ ...s, annexureName: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Edit Password</label>
                        <AppPassword
                            value={form.editPassword}
                            onChange={(e) => setForm((s) => ({ ...s, editPassword: e.target.value }))}
                            visible={showPassword}
                            onToggleVisibility={() => setShowPassword((prev) => !prev)}
                            compact
                            style={{ width: '100%' }}
                            className="w-full"
                            inputClassName={formErrors.editPassword ? 'w-full p-invalid' : 'w-full'}
                        />
                        {formErrors.editPassword && <small className="p-error">{formErrors.editPassword}</small>}
                    </div>

                    <div className="col-12">
                        <div className="flex flex-wrap gap-4">
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="lgTrading"
                                    checked={form.isTradingFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isTradingFlag: !!e.checked }))}
                                    disabled={Boolean(editing) && isEditingProtectedGroup}
                                />
                                <label htmlFor="lgTrading" className="text-sm text-600">
                                    Trading
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="lgProfitLoss"
                                    checked={form.isProfitLossFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isProfitLossFlag: !!e.checked }))}
                                    disabled={Boolean(editing) && isEditingProtectedGroup}
                                />
                                <label htmlFor="lgProfitLoss" className="text-sm text-600">
                                    Profit &amp; Loss
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="lgBalanceSheet"
                                    checked={form.isBalanceSheetFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isBalanceSheetFlag: !!e.checked }))}
                                    disabled={Boolean(editing) && isEditingProtectedGroup}
                                />
                                <label htmlFor="lgBalanceSheet" className="text-sm text-600">
                                    Balance Sheet
                                </label>
                            </span>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Ledger Group Details"
                visible={detailVisible}
                style={{ width: 'min(640px, 96vw)' }}
                className="ledger-group-details-dialog"
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
                {renderDetailContent()}
            </Dialog>
        </div>
    );
}
