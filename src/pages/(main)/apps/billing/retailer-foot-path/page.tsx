'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { AppNotchedField } from '@/components/AppNotchedField';
import { useLedgerLookup } from '../useLedgerLookup';
import { useProgramLocalRows } from '../programs/useProgramLocalRows';

type VisitDay =
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';

type RetailerFootPathRow = {
    footPathId: number;
    retailerLedgerId: number;
    areaName: string;
    routeName: string;
    visitDay: VisitDay;
    sequenceNo: number;
    frequencyDays: number;
    isActive: boolean;
    remarks: string;
};

type RetailerFootPathFormState = {
    retailerLedgerId: number | null;
    areaName: string;
    routeName: string;
    visitDay: VisitDay;
    sequenceNo: number;
    frequencyDays: number;
    isActive: boolean;
    remarks: string;
};

const VISIT_DAY_OPTIONS: { label: string; value: VisitDay }[] = [
    { label: 'Monday', value: 'MONDAY' },
    { label: 'Tuesday', value: 'TUESDAY' },
    { label: 'Wednesday', value: 'WEDNESDAY' },
    { label: 'Thursday', value: 'THURSDAY' },
    { label: 'Friday', value: 'FRIDAY' },
    { label: 'Saturday', value: 'SATURDAY' },
    { label: 'Sunday', value: 'SUNDAY' }
];

const visitDayLabelByValue = VISIT_DAY_OPTIONS.reduce(
    (acc, option) => {
        acc[option.value] = option.label;
        return acc;
    },
    {} as Record<VisitDay, string>
);

const formSchema = z.object({
    retailerLedgerId: z.number().int().positive('Retailer ledger is required'),
    areaName: z.string().trim().min(1, 'Area name is required'),
    routeName: z.string().trim().min(1, 'Route name is required'),
    visitDay: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
    sequenceNo: z.number().int().positive('Sequence number must be greater than zero'),
    frequencyDays: z.number().int().positive('Visit frequency must be greater than zero'),
    isActive: z.boolean(),
    remarks: z.string().trim().max(250, 'Remarks must be 250 characters or less')
});

const DEFAULT_FORM: RetailerFootPathFormState = {
    retailerLedgerId: null,
    areaName: '',
    routeName: '',
    visitDay: 'MONDAY',
    sequenceNo: 1,
    frequencyDays: 7,
    isActive: true,
    remarks: ''
};

const toFormState = (row: RetailerFootPathRow): RetailerFootPathFormState => ({
    retailerLedgerId: row.retailerLedgerId,
    areaName: row.areaName,
    routeName: row.routeName,
    visitDay: row.visitDay,
    sequenceNo: row.sequenceNo,
    frequencyDays: row.frequencyDays,
    isActive: row.isActive,
    remarks: row.remarks
});

export default function BillingRetailerFootPathPage() {
    const toastRef = useRef<Toast>(null);
    const tableRef = useRef<any>(null);
    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<RetailerFootPathFormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const { ledgerOptions, ledgerById, loading: loadingLedgers } = useLedgerLookup();

    const { rows, setRows, reloadRows, nextId } = useProgramLocalRows<RetailerFootPathRow>({
        scope: 'retailer-foot-path',
        idField: 'footPathId'
    });

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => {
            const retailer = ledgerById.get(row.retailerLedgerId)?.name ?? '';
            const haystack = [
                row.areaName,
                row.routeName,
                row.remarks,
                retailer,
                visitDayLabelByValue[row.visitDay],
                String(row.sequenceNo),
                String(row.frequencyDays)
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [ledgerById, rows, search]);

    const resetForm = () => {
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setEditingId(null);
    };

    const openNew = () => {
        resetForm();
        setDialogVisible(true);
    };

    const openEdit = (row: RetailerFootPathRow) => {
        setEditingId(row.footPathId);
        setForm(toFormState(row));
        setFormErrors({});
        setDialogVisible(true);
    };

    const closeDialog = () => {
        setDialogVisible(false);
        resetForm();
    };

    const save = () => {
        const parsed = formSchema.safeParse({
            ...form,
            retailerLedgerId: Number(form.retailerLedgerId || 0),
            areaName: form.areaName.trim(),
            routeName: form.routeName.trim(),
            remarks: form.remarks.trim()
        });

        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                const field = issue.path[0];
                if (field && !nextErrors[String(field)]) {
                    nextErrors[String(field)] = issue.message;
                }
            });
            setFormErrors(nextErrors);
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Validation Failed',
                detail: 'Please fix the highlighted fields.'
            });
            return;
        }

        const payload: RetailerFootPathRow = {
            footPathId: editingId ?? nextId,
            retailerLedgerId: parsed.data.retailerLedgerId,
            areaName: parsed.data.areaName,
            routeName: parsed.data.routeName,
            visitDay: parsed.data.visitDay,
            sequenceNo: parsed.data.sequenceNo,
            frequencyDays: parsed.data.frequencyDays,
            isActive: parsed.data.isActive,
            remarks: parsed.data.remarks
        };

        setRows((prevRows) => {
            if (editingId == null) return [payload, ...prevRows];
            return prevRows.map((row) => (row.footPathId === editingId ? payload : row));
        });

        toastRef.current?.show({
            severity: 'success',
            summary: 'Saved',
            detail: editingId == null ? 'Retailer foot path created.' : 'Retailer foot path updated.'
        });
        closeDialog();
    };

    const confirmDelete = (event: React.MouseEvent<HTMLElement>, row: RetailerFootPathRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: `Delete route \"${row.routeName}\"?`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'reject',
            accept: () => {
                setRows((prevRows) => prevRows.filter((entry) => entry.footPathId !== row.footPathId));
                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: 'Retailer foot path removed.'
                });
            }
        });
    };

    const actionsBody = (row: RetailerFootPathRow) => (
        <div className="flex align-items-center gap-1 justify-content-end">
            <Button
                icon="pi pi-pencil"
                className="p-button-text"
                onClick={() => openEdit(row)}
                aria-label="Edit retailer foot path"
            />
            <Button
                icon="pi pi-trash"
                className="p-button-text p-button-danger"
                onClick={(event) => confirmDelete(event, row)}
                aria-label="Delete retailer foot path"
            />
        </div>
    );

    const retailerBody = (row: RetailerFootPathRow) => ledgerById.get(row.retailerLedgerId)?.name ?? `Ledger ${row.retailerLedgerId}`;

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Retailer Foot Path</h2>
                        <p className="text-600 mt-2 mb-0">
                            Maintain beat/route definitions for retailer visit planning and field follow-up.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            label="New Foot Path"
                            icon="pi pi-plus"
                            className="app-action-compact"
                            onClick={openNew}
                        />
                    </div>
                </div>
            </div>

            <AppDataTable
                ref={tableRef}
                value={filteredRows}
                dataKey="footPathId"
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                stripedRows
                size="small"
                onRowDoubleClick={(event) => openEdit(event.data as RetailerFootPathRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search foot path"
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
                            onClick={reloadRows}
                        />
                        <Button
                            label="Export"
                            icon="pi pi-download"
                            className="p-button-info"
                            onClick={() => tableRef.current?.exportCSV()}
                            disabled={filteredRows.length === 0}
                        />
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} route{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} route${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column header="Retailer" body={retailerBody} style={{ width: '16rem' }} />
                <Column field="areaName" header="Area" sortable style={{ width: '12rem' }} />
                <Column field="routeName" header="Route" sortable style={{ width: '14rem' }} />
                <Column
                    field="visitDay"
                    header="Visit Day"
                    body={(row: RetailerFootPathRow) => visitDayLabelByValue[row.visitDay]}
                    sortable
                    style={{ width: '9rem' }}
                />
                <Column field="sequenceNo" header="Seq" sortable bodyClassName="text-right" style={{ width: '5rem' }} />
                <Column
                    field="frequencyDays"
                    header="Frequency"
                    sortable
                    bodyClassName="text-right"
                    style={{ width: '7rem' }}
                />
                <Column
                    field="isActive"
                    header="Status"
                    body={(row: RetailerFootPathRow) => (
                        <Tag severity={row.isActive ? 'success' : 'warning'} value={row.isActive ? 'Active' : 'Inactive'} />
                    )}
                    style={{ width: '8rem' }}
                />
                <Column field="remarks" header="Remarks" />
                <Column header="Actions" body={actionsBody} style={{ width: '7rem' }} />
            </AppDataTable>

            <Dialog
                header={editingId == null ? 'New Retailer Foot Path' : 'Edit Retailer Foot Path'}
                visible={dialogVisible}
                style={{ width: 'min(920px, 96vw)' }}
                onHide={closeDialog}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" className="p-button-text" onClick={closeDialog} />
                        <Button label="Save" icon="pi pi-check" className="app-action-compact" onClick={save} />
                    </div>
                }
            >
                <div className="grid formgrid">
                    <div className="col-12 md:col-6">
                        <AppNotchedField label="Retailer Ledger *" className="w-full" htmlFor="foot-path-ledger-id">
                            <AppDropdown
                                inputId="foot-path-ledger-id"
                                value={form.retailerLedgerId}
                                options={ledgerOptions}
                                optionLabel="label"
                                optionValue="value"
                                filter
                                loading={loadingLedgers}
                                onChange={(event) =>
                                    setForm((prev) => ({ ...prev, retailerLedgerId: Number(event.value || 0) || null }))
                                }
                                className={classNames('w-full', { 'p-invalid': Boolean(formErrors.retailerLedgerId) })}
                                placeholder={loadingLedgers ? 'Loading ledgers...' : 'Select retailer ledger'}
                            />
                        </AppNotchedField>
                        {formErrors.retailerLedgerId ? <small className="p-error">{formErrors.retailerLedgerId}</small> : null}
                    </div>

                    <div className="col-12 md:col-3">
                        <AppNotchedField label="Area Name *" className="w-full" htmlFor="foot-path-area-name">
                            <AppInput
                                id="foot-path-area-name"
                                value={form.areaName}
                                onChange={(event) => setForm((prev) => ({ ...prev, areaName: event.target.value }))}
                                className={classNames('w-full', { 'p-invalid': Boolean(formErrors.areaName) })}
                            />
                        </AppNotchedField>
                        {formErrors.areaName ? <small className="p-error">{formErrors.areaName}</small> : null}
                    </div>

                    <div className="col-12 md:col-3">
                        <AppNotchedField label="Route Name *" className="w-full" htmlFor="foot-path-route-name">
                            <AppInput
                                id="foot-path-route-name"
                                value={form.routeName}
                                onChange={(event) => setForm((prev) => ({ ...prev, routeName: event.target.value }))}
                                className={classNames('w-full', { 'p-invalid': Boolean(formErrors.routeName) })}
                            />
                        </AppNotchedField>
                        {formErrors.routeName ? <small className="p-error">{formErrors.routeName}</small> : null}
                    </div>

                    <div className="col-12 md:col-4">
                        <AppNotchedField label="Visit Day" className="w-full" htmlFor="foot-path-visit-day">
                            <AppDropdown
                                inputId="foot-path-visit-day"
                                value={form.visitDay}
                                options={VISIT_DAY_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => setForm((prev) => ({ ...prev, visitDay: event.value as VisitDay }))}
                                className="w-full"
                            />
                        </AppNotchedField>
                    </div>

                    <div className="col-12 md:col-4">
                        <AppNotchedField label="Sequence No *" className="w-full">
                            <AppInput
                                inputType="number"
                                value={form.sequenceNo}
                                min={1}
                                minFractionDigits={0}
                                maxFractionDigits={0}
                                onValueChange={(event) =>
                                    setForm((prev) => ({ ...prev, sequenceNo: Number(event.value ?? 0) }))
                                }
                                className={classNames('w-full', { 'p-invalid': Boolean(formErrors.sequenceNo) })}
                            />
                        </AppNotchedField>
                        {formErrors.sequenceNo ? <small className="p-error">{formErrors.sequenceNo}</small> : null}
                    </div>

                    <div className="col-12 md:col-4">
                        <AppNotchedField label="Visit Frequency (Days) *" className="w-full">
                            <AppInput
                                inputType="number"
                                value={form.frequencyDays}
                                min={1}
                                minFractionDigits={0}
                                maxFractionDigits={0}
                                onValueChange={(event) =>
                                    setForm((prev) => ({ ...prev, frequencyDays: Number(event.value ?? 0) }))
                                }
                                className={classNames('w-full', { 'p-invalid': Boolean(formErrors.frequencyDays) })}
                            />
                        </AppNotchedField>
                        {formErrors.frequencyDays ? <small className="p-error">{formErrors.frequencyDays}</small> : null}
                    </div>

                    <div className="col-12 md:col-8">
                        <AppNotchedField label="Remarks" className="w-full" htmlFor="foot-path-remarks">
                            <AppInput
                                id="foot-path-remarks"
                                value={form.remarks}
                                onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
                                className={classNames('w-full', { 'p-invalid': Boolean(formErrors.remarks) })}
                            />
                        </AppNotchedField>
                        {formErrors.remarks ? <small className="p-error">{formErrors.remarks}</small> : null}
                    </div>

                    <div className="col-12 md:col-4">
                        <div className="flex align-items-center gap-2 h-full">
                            <InputSwitch
                                checked={form.isActive}
                                onChange={(event) => setForm((prev) => ({ ...prev, isActive: Boolean(event.value) }))}
                                inputId="foot-path-active"
                            />
                            <label htmlFor="foot-path-active" className="cursor-pointer">
                                Active Route
                            </label>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
