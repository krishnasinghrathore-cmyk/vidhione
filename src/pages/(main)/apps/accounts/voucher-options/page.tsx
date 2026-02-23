'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppInput from '@/components/AppInput';
import AppReportActions from '@/components/AppReportActions';
import { ACCOUNT_MASTER_QUERY_OPTIONS, invalidateAccountMasterLookups } from '@/lib/accounts/masterLookupCache';
import { VoucherTypeModal } from './components/VoucherTypeModal';
import type { VoucherTypeFormState, VoucherTypeMasterRow } from './types';
import { DEFAULT_FORM } from './types';
import { getVoucherTypeFormErrors, voucherTypeFormSchema } from './validation';
import { areVoucherTypeFormsEqual, formatDate, parseDateText, resolveFlag, toDateText, toOptionalText } from './utils';

const VOUCHER_TYPE_MASTERS = gql`
    query VoucherTypeMasters {
        voucherTypeMasters {
            voucherTypeId
            voucherTypeName
            displayName
            prefix
            suffix
            voucherStartNumber
            isVoucherNoAutoFlag
            lockFromDateText
            lockToDateText
            isLockedFlag
            disclaimer1
            disclaimer2
            disclaimer3
            disclaimer4
            disclaimer5
            editPassword
        }
    }
`;

const UPDATE_VOUCHER_TYPE_MASTER = gql`
    mutation UpdateVoucherTypeMaster(
        $voucherTypeId: Int!
        $voucherTypeName: String
        $displayName: String
        $prefix: String
        $suffix: String
        $voucherStartNumber: Int
        $isVoucherNoAutoFlag: Boolean
        $lockFromDateText: String
        $lockToDateText: String
        $isLockedFlag: Boolean
        $disclaimer1: String
        $disclaimer2: String
        $disclaimer3: String
        $disclaimer4: String
        $disclaimer5: String
        $editPassword: String
    ) {
        updateVoucherTypeMaster(
            voucherTypeId: $voucherTypeId
            voucherTypeName: $voucherTypeName
            displayName: $displayName
            prefix: $prefix
            suffix: $suffix
            voucherStartNumber: $voucherStartNumber
            isVoucherNoAutoFlag: $isVoucherNoAutoFlag
            lockFromDateText: $lockFromDateText
            lockToDateText: $lockToDateText
            isLockedFlag: $isLockedFlag
            disclaimer1: $disclaimer1
            disclaimer2: $disclaimer2
            disclaimer3: $disclaimer3
            disclaimer4: $disclaimer4
            disclaimer5: $disclaimer5
            editPassword: $editPassword
        ) {
            voucherTypeId
        }
    }
`;

export default function AccountsVoucherOptionsPage() {
    const toastRef = useRef<Toast>(null);
    const apolloClient = useApolloClient();
    const { data, loading, error, refetch } = useQuery(VOUCHER_TYPE_MASTERS, {
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });
    const [updateVoucherType] = useMutation(UPDATE_VOUCHER_TYPE_MASTER);

    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<VoucherTypeMasterRow | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState(DEFAULT_FORM);

    const formErrors = useMemo(() => getVoucherTypeFormErrors(form), [form]);
    const isFormDirty = useMemo(() => Boolean(editing) && !areVoucherTypeFormsEqual(form, initialForm), [editing, form, initialForm]);
    const canSave = useMemo(
        () => Boolean(editing) && isFormDirty && Object.keys(formErrors).length === 0,
        [editing, formErrors, isFormDirty]
    );

    const rows: VoucherTypeMasterRow[] = useMemo(() => data?.voucherTypeMasters ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;

        return rows.filter((row) =>
            [
                row.voucherTypeName,
                row.displayName,
                resolveFlag(row.isVoucherNoAutoFlag) ? 'manual' : 'auto',
                row.voucherStartNumber,
                row.prefix,
                row.suffix,
                resolveFlag(row.isLockedFlag) ? 'locked' : 'unlocked',
                row.lockFromDateText,
                row.lockToDateText,
                row.disclaimer1,
                row.disclaimer2,
                row.disclaimer3,
                row.disclaimer4,
                row.disclaimer5,
                row.editPassword
            ]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);

    const openEdit = useCallback((row: VoucherTypeMasterRow) => {
        const nextForm: VoucherTypeFormState = {
            voucherTypeName: row.voucherTypeName ?? '',
            displayName: row.displayName ?? '',
            prefix: row.prefix ?? '',
            suffix: row.suffix ?? '',
            voucherStartNumber: row.voucherStartNumber ?? 1,
            isManualVoucherNo: resolveFlag(row.isVoucherNoAutoFlag),
            isLocked: resolveFlag(row.isLockedFlag),
            lockFromDate: parseDateText(row.lockFromDateText),
            lockToDate: parseDateText(row.lockToDateText),
            disclaimer1: row.disclaimer1 ?? '',
            disclaimer2: row.disclaimer2 ?? '',
            disclaimer3: row.disclaimer3 ?? '',
            disclaimer4: row.disclaimer4 ?? '',
            disclaimer5: row.disclaimer5 ?? '',
            editPassword: row.editPassword ?? ''
        };
        setEditing(row);
        setInitialForm(nextForm);
        setForm(nextForm);
        setDialogVisible(true);
    }, []);

    const patchForm = useCallback((patch: Partial<VoucherTypeFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    }, []);

    const closeDialog = useCallback(() => {
        if (saving) return;
        if (!isFormDirty) {
            setDialogVisible(false);
            return;
        }
        confirmDialog({
            header: 'Discard Changes?',
            message: 'Unsaved changes will be lost.',
            icon: 'pi pi-exclamation-triangle',
            rejectLabel: 'Keep Editing',
            acceptLabel: 'Discard',
            acceptClassName: 'p-button-danger',
            accept: () => setDialogVisible(false),
            reject: () => undefined
        });
    }, [isFormDirty, saving]);

    const save = useCallback(async () => {
        if (!editing) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select a voucher type to edit' });
            return;
        }
        if (!isFormDirty) {
            toastRef.current?.show({ severity: 'info', summary: 'No changes to save' });
            return;
        }

        const parsed = voucherTypeFormSchema.safeParse(form);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message ?? 'Please fix validation errors before saving.';
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail: firstError
            });
            return;
        }

        try {
            setSaving(true);
            const validated = parsed.data;
            const variables = {
                voucherTypeId: editing.voucherTypeId,
                voucherTypeName: validated.voucherTypeName.trim(),
                displayName: toOptionalText(validated.displayName),
                prefix: toOptionalText(validated.prefix),
                suffix: toOptionalText(validated.suffix),
                voucherStartNumber: validated.voucherStartNumber == null ? null : Number(validated.voucherStartNumber),
                isVoucherNoAutoFlag: validated.isManualVoucherNo,
                lockFromDateText: validated.isLocked ? toDateText(validated.lockFromDate) : null,
                lockToDateText: validated.isLocked ? toDateText(validated.lockToDate) : null,
                isLockedFlag: validated.isLocked,
                disclaimer1: toOptionalText(validated.disclaimer1),
                disclaimer2: toOptionalText(validated.disclaimer2),
                disclaimer3: toOptionalText(validated.disclaimer3),
                disclaimer4: toOptionalText(validated.disclaimer4),
                disclaimer5: toOptionalText(validated.disclaimer5),
                editPassword: toOptionalText(validated.editPassword)
            };

            await updateVoucherType({ variables });

            invalidateAccountMasterLookups(apolloClient);
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Voucher type updated.'
            });
            await refetch();
        } catch (e: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to save.' });
        } finally {
            setSaving(false);
        }
    }, [apolloClient, editing, form, isFormDirty, refetch, updateVoucherType]);

    return (
        <div className="card">
            <ConfirmDialog />
            <Toast ref={toastRef} />

            <VoucherTypeModal
                visible={dialogVisible}
                saving={saving}
                canSave={canSave}
                form={form}
                errors={formErrors}
                onHide={closeDialog}
                onSave={save}
                onFormPatch={patchForm}
            />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Voucher Options</h2>
                        <p className="mt-2 mb-0 text-600">Legacy-aligned voucher option setup with manual/auto numbering and lock-date controls.</p>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading voucher options: {error.message}</p>}
            </div>

            <AppDataTable
                value={filteredRows}
                paginator
                rows={15}
                rowsPerPageOptions={[15, 30, 50, 100]}
                dataKey="voucherTypeId"
                stripedRows
                size="small"
                loading={loading}
                scrollable
                tableStyle={{ minWidth: '104rem' }}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '300px' }}>
                        <i className="pi pi-search" />
                        <AppInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search voucher options" style={{ width: '100%' }} />
                    </span>
                }
                headerRight={<AppReportActions onRefresh={() => refetch()} showRefresh refreshDisabled={loading} loadingState={loading} />}
                recordSummary={`${filteredRows.length} voucher option${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="voucherTypeName" header="Name" sortable style={{ minWidth: '14rem' }} />
                <Column field="displayName" header="Display" sortable style={{ minWidth: '14rem' }} />
                <Column
                    field="isVoucherNoAutoFlag"
                    header="Mode"
                    sortable
                    body={(row: VoucherTypeMasterRow) => {
                        const isManual = resolveFlag(row.isVoucherNoAutoFlag);
                        return <Tag value={isManual ? 'Manual' : 'Auto'} severity={isManual ? 'warning' : 'success'} />;
                    }}
                    style={{ width: '7rem', textAlign: 'center' }}
                />
                <Column field="voucherStartNumber" header="Start From" sortable style={{ width: '8rem', textAlign: 'right' }} />
                <Column field="prefix" header="Prefix" sortable style={{ width: '8rem' }} />
                <Column field="suffix" header="Suffix" sortable style={{ width: '8rem' }} />
                <Column
                    field="isLockedFlag"
                    header="Lock"
                    sortable
                    body={(row: VoucherTypeMasterRow) => {
                        const isLocked = resolveFlag(row.isLockedFlag);
                        return <Tag value={isLocked ? 'Locked' : 'Unlocked'} severity={isLocked ? 'danger' : 'secondary'} />;
                    }}
                    style={{ width: '7rem', textAlign: 'center' }}
                />
                <Column
                    field="lockFromDateText"
                    header="Lock From"
                    sortable
                    body={(row: VoucherTypeMasterRow) => formatDate(row.lockFromDateText)}
                    style={{ width: '9rem' }}
                />
                <Column
                    field="lockToDateText"
                    header="Lock To"
                    sortable
                    body={(row: VoucherTypeMasterRow) => formatDate(row.lockToDateText)}
                    style={{ width: '9rem' }}
                />
                <Column field="disclaimer1" header="Disclaimer 1" sortable style={{ minWidth: '12rem' }} />
                <Column field="disclaimer2" header="Disclaimer 2" sortable style={{ minWidth: '12rem' }} />
                <Column field="disclaimer3" header="Disclaimer 3" sortable style={{ minWidth: '12rem' }} />
                <Column field="disclaimer4" header="Disclaimer 4" sortable style={{ minWidth: '12rem' }} />
                <Column field="disclaimer5" header="Voucher Narration" sortable style={{ minWidth: '14rem' }} />
                <Column
                    field="editPassword"
                    header="Password"
                    body={(row: VoucherTypeMasterRow) => (row.editPassword?.trim() ? 'Set' : '')}
                    style={{ width: '7rem', textAlign: 'center' }}
                />
                <Column
                    header="Actions"
                    body={(row: VoucherTypeMasterRow) => <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />}
                    style={{ width: '6rem' }}
                    frozen
                    alignFrozen="right"
                />
            </AppDataTable>
        </div>
    );
}
