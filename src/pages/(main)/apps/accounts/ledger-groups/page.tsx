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
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
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
}

const LEDGER_GROUPS = gql`
    query LedgerGroups {
        ledgerGroups {
            ledgerGroupId
            name
            groupTypeCode
            defaultBalanceType
            isTradingFlag
            isProfitLossFlag
            isBalanceSheetFlag
            annexureName
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
    ) {
        createLedgerGroup(
            name: $name
            groupTypeCode: $groupTypeCode
            defaultBalanceType: $defaultBalanceType
            isTradingFlag: $isTradingFlag
            isProfitLossFlag: $isProfitLossFlag
            isBalanceSheetFlag: $isBalanceSheetFlag
            annexureName: $annexureName
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
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    groupTypeCode: z.number().int().nonnegative().nullable(),
    defaultBalanceType: z.union([z.literal(1), z.literal(-1)]),
    isTradingFlag: z.boolean(),
    isProfitLossFlag: z.boolean(),
    isBalanceSheetFlag: z.boolean(),
    annexureName: z.string()
});

const DEFAULT_FORM: FormState = {
    name: '',
    groupTypeCode: null,
    defaultBalanceType: 1,
    isTradingFlag: false,
    isProfitLossFlag: false,
    isBalanceSheetFlag: true,
    annexureName: ''
};

const BALANCE_OPTIONS = [
    { label: 'Debit (Dr)', value: 1 },
    { label: 'Credit (Cr)', value: -1 }
] as const;

const flagToBool = (value: number | null | undefined) => Number(value || 0) === 1;
const boolToFlag = (value: boolean) => (value ? 1 : 0);

export default function AccountsLedgerGroupsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<LedgerGroupRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(LEDGER_GROUPS);
    const [createLedgerGroup] = useMutation(CREATE_LEDGER_GROUP);
    const [updateLedgerGroup] = useMutation(UPDATE_LEDGER_GROUP);
    const [deleteLedgerGroup] = useMutation(DELETE_LEDGER_GROUP);

    const rows: LedgerGroupRow[] = useMemo(() => data?.ledgerGroups ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((r) =>
            [r.ledgerGroupId, r.name, r.annexureName, r.groupTypeCode]
                .map((v) => String(v ?? '').toLowerCase())
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

    const openEdit = (row: LedgerGroupRow) => {
        setEditing(row);
        setForm({
            name: row.name ?? '',
            groupTypeCode: row.groupTypeCode ?? null,
            defaultBalanceType: (row.defaultBalanceType === -1 ? -1 : 1) as -1 | 1,
            isTradingFlag: flagToBool(row.isTradingFlag),
            isProfitLossFlag: flagToBool(row.isProfitLossFlag),
            isBalanceSheetFlag: flagToBool(row.isBalanceSheetFlag),
            annexureName: row.annexureName ?? ''
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

        setFormErrors({});
        setSaving(true);
        try {
            const variables = {
                name: form.name.trim(),
                groupTypeCode: form.groupTypeCode == null ? null : Number(form.groupTypeCode),
                defaultBalanceType: Number(form.defaultBalanceType),
                isTradingFlag: boolToFlag(form.isTradingFlag),
                isProfitLossFlag: boolToFlag(form.isProfitLossFlag),
                isBalanceSheetFlag: boolToFlag(form.isBalanceSheetFlag),
                annexureName: form.annexureName.trim() ? form.annexureName.trim() : null
            };

            if (editing) {
                await updateLedgerGroup({ variables: { ledgerGroupId: editing.ledgerGroupId, ...variables } });
            } else {
                await createLedgerGroup({ variables });
            }

            await refetch();
            setDialogVisible(false);
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
            await refetch();
            toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Ledger group deleted.' });
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Delete failed.' });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: LedgerGroupRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this ledger group?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
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

    const flagsBody = (row: LedgerGroupRow) => (
        <div className="flex gap-1 flex-wrap">
            {flagToBool(row.isTradingFlag) && <Tag value="Trading" severity="info" />}
            {flagToBool(row.isProfitLossFlag) && <Tag value="P&L" severity="danger" />}
            {flagToBool(row.isBalanceSheetFlag) && <Tag value="B/S" severity="success" />}
        </div>
    );

    const actionsBody = (row: LedgerGroupRow) => (
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
                        <h2 className="m-0">Ledger Groups</h2>
                        <p className="mt-2 mb-0 text-600">Create and maintain ledger groups for Accounts.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Group" icon="pi pi-plus" onClick={openNew} />
                        <Link to="/apps/accounts/ledgers">
                            <Button label="Ledgers" icon="pi pi-book" className="p-button-outlined" />
                        </Link>
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading ledger groups: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="ledgerGroupId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as LedgerGroupRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search ledger group"
                            style={{ width: '100%' }}
                        />
                    </span>
                }
                headerRight={
                    <>
                        <Button label="Export" icon="pi pi-download" className="p-button-info" onClick={() => dtRef.current?.exportCSV()} disabled={filteredRows.length === 0} />
                        <Button label="Print" icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
                        <Button label="Refresh" icon="pi pi-refresh" className="p-button-text" onClick={() => refetch()} />
                        <span className="text-600 text-sm">Showing {filteredRows.length} group{filteredRows.length === 1 ? '' : 's'}</span>
                    </>
                }
                recordSummary={`${filteredRows.length} group${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="groupTypeCode" header="Type" sortable style={{ width: '7rem', textAlign: 'right' }} />
                <Column header="Default" body={defaultBalanceBody} style={{ width: '7rem' }} />
                <Column header="Flags" body={flagsBody} />
                <Column field="annexureName" header="Annexure" body={(r: LedgerGroupRow) => <span className="text-600">{r.annexureName ?? ''}</span>} />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Ledger Group' : 'New Ledger Group'}
                visible={dialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button label="Cancel" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
                        <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-8">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Type Code</label>
                        <InputNumber
                            value={form.groupTypeCode}
                            onValueChange={(e) => setForm((s) => ({ ...s, groupTypeCode: (e.value as number) ?? null }))}
                            min={0}
                            useGrouping={false}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Default Balance</label>
                        <AppDropdown
                            value={form.defaultBalanceType}
                            options={BALANCE_OPTIONS}
                            onChange={(e) => setForm((s) => ({ ...s, defaultBalanceType: e.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-8">
                        <label className="block text-600 mb-1">Annexure</label>
                        <InputText
                            value={form.annexureName}
                            onChange={(e) => setForm((s) => ({ ...s, annexureName: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12">
                        <div className="flex flex-wrap gap-4">
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="lgTrading"
                                    checked={form.isTradingFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isTradingFlag: !!e.checked }))}
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
                                />
                                <label htmlFor="lgBalanceSheet" className="text-sm text-600">
                                    Balance Sheet
                                </label>
                            </span>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
