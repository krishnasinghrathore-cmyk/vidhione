'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';

interface VoucherTypeMasterRow {
    voucherTypeId: number;
    voucherTypeName: string | null;
    displayName: string | null;
    prefix: string | null;
    suffix: string | null;
    voucherTypeCode: number | null;
}

const VOUCHER_TYPE_MASTERS = gql`
    query VoucherTypeMasters {
        voucherTypeMasters {
            voucherTypeId
            voucherTypeName
            displayName
            prefix
            suffix
            voucherTypeCode
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
        $voucherTypeCode: Int
    ) {
        updateVoucherTypeMaster(
            voucherTypeId: $voucherTypeId
            voucherTypeName: $voucherTypeName
            displayName: $displayName
            prefix: $prefix
            suffix: $suffix
            voucherTypeCode: $voucherTypeCode
        ) {
            voucherTypeId
        }
    }
`;

const escapeCsv = (value: string) => {
    const needsQuote = /[",\n]/.test(value);
    const escaped = value.replaceAll('"', '""');
    return needsQuote ? `"${escaped}"` : escaped;
};

export default function AccountsVoucherTypesPage() {
    const toastRef = useRef<Toast>(null);
    const { data, loading, error, refetch } = useQuery(VOUCHER_TYPE_MASTERS);
    const [updateVoucherType] = useMutation(UPDATE_VOUCHER_TYPE_MASTER);

    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    const [voucherTypeId, setVoucherTypeId] = useState<number | null>(null);
    const [voucherTypeName, setVoucherTypeName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [prefix, setPrefix] = useState('');
    const [suffix, setSuffix] = useState('');
    const [voucherTypeCode, setVoucherTypeCode] = useState<number | null>(null);

    const rows: VoucherTypeMasterRow[] = useMemo(() => data?.voucherTypeMasters ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((r) =>
            [r.voucherTypeId, r.voucherTypeName, r.displayName, r.prefix, r.suffix, r.voucherTypeCode]
                .map((v) => String(v ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);

    const openEdit = (row: VoucherTypeMasterRow) => {
        setVoucherTypeId(row.voucherTypeId);
        setVoucherTypeName(row.voucherTypeName ?? '');
        setDisplayName(row.displayName ?? '');
        setPrefix(row.prefix ?? '');
        setSuffix(row.suffix ?? '');
        setVoucherTypeCode(row.voucherTypeCode ?? null);
        setDialogVisible(true);
    };

    const save = async () => {
        if (!voucherTypeId) return;
        try {
            setSaving(true);
            await updateVoucherType({
                variables: {
                    voucherTypeId,
                    voucherTypeName: voucherTypeName.trim() ? voucherTypeName.trim() : null,
                    displayName: displayName.trim() ? displayName.trim() : null,
                    prefix: prefix.trim() ? prefix.trim() : null,
                    suffix: suffix.trim() ? suffix.trim() : null,
                    voucherTypeCode: voucherTypeCode == null ? null : Number(voucherTypeCode)
                }
            });
            setDialogVisible(false);
            setSaving(false);
            toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: 'Voucher type updated.' });
            await refetch();
        } catch (e: any) {
            setSaving(false);
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Failed to update.' });
        }
    };

    const exportCsv = () => {
        const header = ['VoucherTypeId', 'VoucherTypeName', 'DisplayName', 'Prefix', 'Suffix', 'VoucherTypeCode'];
        const body = filteredRows.map((r) =>
            [
                String(r.voucherTypeId),
                r.voucherTypeName ?? '',
                r.displayName ?? '',
                r.prefix ?? '',
                r.suffix ?? '',
                r.voucherTypeCode != null ? String(r.voucherTypeCode) : ''
            ]
                .map((v) => escapeCsv(String(v ?? '')))
                .join(',')
        );
        const csv = [header.map((v) => escapeCsv(v)).join(','), ...body].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voucher-types_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />

            <Dialog
                header={voucherTypeId ? `Edit Voucher Type #${voucherTypeId}` : 'Edit Voucher Type'}
                visible={dialogVisible}
                style={{ width: 'min(760px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button label="Cancel" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
                        <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving || !voucherTypeId} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText value={voucherTypeName} onChange={(e) => setVoucherTypeName(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Display Name</label>
                        <InputText value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Prefix</label>
                        <InputText value={prefix} onChange={(e) => setPrefix(e.target.value)} />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Suffix</label>
                        <InputText value={suffix} onChange={(e) => setSuffix(e.target.value)} />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Type Code</label>
                        <InputNumber value={voucherTypeCode} onValueChange={(e) => setVoucherTypeCode(e.value as number)} min={0} mode="decimal" useGrouping={false} />
                    </div>
                </div>
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Voucher Types</h2>
                        <p className="mt-2 mb-0 text-600">Master list of voucher types used in Accounts vouchers and reports.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Export CSV" icon="pi pi-download" className="p-button-outlined" onClick={exportCsv} disabled={filteredRows.length === 0} />
                        <Link to="/apps/accounts">
                            <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" />
                        </Link>
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading voucher types: {error.message}</p>}
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
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '280px' }}>
                        <i className="pi pi-search" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search voucher types" style={{ width: '100%' }} />
                    </span>
                }
                headerRight={<Button label="Refresh" icon="pi pi-refresh" className="p-button-text" onClick={() => refetch()} />}
                recordSummary={`${filteredRows.length} voucher type${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="voucherTypeId" header="ID" sortable style={{ width: '6rem' }} />
                <Column field="voucherTypeName" header="Name" sortable />
                <Column field="displayName" header="Display" sortable />
                <Column field="prefix" header="Prefix" sortable style={{ width: '8rem' }} />
                <Column field="suffix" header="Suffix" sortable style={{ width: '8rem' }} />
                <Column field="voucherTypeCode" header="Code" sortable style={{ width: '7rem', textAlign: 'right' }} />
                <Column
                    header="Actions"
                    body={(row: VoucherTypeMasterRow) => (
                        <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
                    )}
                    style={{ width: '6rem' }}
                />
            </AppDataTable>
        </div>
    );
}

