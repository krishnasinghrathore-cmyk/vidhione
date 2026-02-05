'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { RadioButton } from 'primereact/radiobutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import { useAuth } from '@/lib/auth/context';
import { fetchCompanyFiscalYears, type CompanyFiscalYear } from '@/lib/invoicing/api';

const parseFiscalDate = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{8}$/.test(trimmed)) {
        const yyyy = trimmed.slice(0, 4);
        const mm = trimmed.slice(4, 6);
        const dd = trimmed.slice(6, 8);
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return new Date(`${trimmed}T00:00:00`);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return null;
};

const formatFiscalDate = (value: string | null) => {
    const parsed = parseFiscalDate(value);
    if (!parsed) return '';
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatFiscalRange = (start: string | null, end: string | null) => {
    const startLabel = formatFiscalDate(start);
    const endLabel = formatFiscalDate(end);
    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
    return startLabel || endLabel || '';
};

export default function AccountsChangeSessionPage() {
    const toastRef = useRef<Toast>(null);
    const { companyContext, setSessionFiscalYear } = useAuth();
    const [rows, setRows] = useState<CompanyFiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const loadFiscalYears = async () => {
        setLoading(true);
        try {
            const data = await fetchCompanyFiscalYears();
            setRows(data);
            setSelectedId((prev) => {
                const stillValid = prev != null && data.some((row) => row.companyFiscalYearId === prev);
                if (stillValid) return prev;
                const sessionId = companyContext?.companyFiscalYearId ?? null;
                if (sessionId != null && data.some((row) => row.companyFiscalYearId === sessionId)) {
                    return sessionId;
                }
                const current = data.find((row) => Number(row.isCurrentFlag) === 1);
                return current?.companyFiscalYearId ?? data[0]?.companyFiscalYearId ?? null;
            });
        } catch (err) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Unable to load sessions',
                detail: 'Please contact administrator.'
            });
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiscalYears().catch(() => undefined);
    }, []);

    const currentRow = useMemo(
        () => rows.find((row) => row.companyFiscalYearId === companyContext?.companyFiscalYearId) ?? null,
        [companyContext?.companyFiscalYearId, rows]
    );
    const currentId = companyContext?.companyFiscalYearId ?? null;
    const currentRange = formatFiscalRange(
        currentRow?.financialYearStart ?? companyContext?.fiscalYearStart ?? null,
        currentRow?.financialYearEnd ?? companyContext?.fiscalYearEnd ?? null
    );

    const canApply = Boolean(selectedId && selectedId !== currentId && !saving);

    const handleApply = async () => {
        if (!selectedId) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select a session', detail: 'Choose a fiscal year.' });
            return;
        }
        const target = rows.find((row) => row.companyFiscalYearId === selectedId);
        if (!target) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select a session', detail: 'Choose a fiscal year.' });
            return;
        }
        setSaving(true);
        try {
            setSessionFiscalYear({
                companyFiscalYearId: target.companyFiscalYearId,
                fiscalYearStart: target.financialYearStart ?? null,
                fiscalYearEnd: target.financialYearEnd ?? null
            });
            toastRef.current?.show({ severity: 'success', summary: 'Session updated' });
        } catch (err) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Unable to change session',
                detail: 'Please contact administrator.'
            });
        } finally {
            setSaving(false);
        }
    };

    const selectionTemplate = (row: CompanyFiscalYear) => (
        <RadioButton
            inputId={`fy-${row.companyFiscalYearId}`}
            name="fiscalYearSession"
            value={row.companyFiscalYearId}
            onChange={(event) => setSelectedId(event.value)}
            checked={selectedId === row.companyFiscalYearId}
            disabled={saving}
        />
    );

    const fiscalRangeTemplate = (row: CompanyFiscalYear) =>
        formatFiscalRange(row.financialYearStart, row.financialYearEnd) || '---';

    const statusTemplate = (row: CompanyFiscalYear) => {
        if (row.companyFiscalYearId === selectedId) return <Tag value="Session" severity="info" />;
        if (Number(row.isCurrentFlag) === 1) return <Tag value="Default" severity="success" />;
        return null;
    };

    const headerRight = (
        <>
            <Button
                type="button"
                label="Refresh"
                icon="pi pi-refresh"
                outlined
                onClick={() => loadFiscalYears()}
                disabled={loading || saving}
            />
            <Button
                type="button"
                label="Set Session"
                icon="pi pi-check"
                onClick={handleApply}
                disabled={!canApply}
            />
        </>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <div className="mb-3">
                <h2 className="mb-1">Change Session</h2>
                <p className="text-600">
                    Select the fiscal year session for new vouchers and reports.
                </p>
                <div className="text-700 mt-2">
                    <span className="font-medium">Current Session:</span>{' '}
                    {currentRange || 'Not configured'}
                </div>
            </div>

            <AppDataTable
                value={rows}
                dataKey="companyFiscalYearId"
                loading={loading}
                emptyMessage="No fiscal years configured."
                headerRight={headerRight}
                recordSummary={rows.length ? `${rows.length} fiscal year(s)` : undefined}
                stripedRows
            >
                <Column body={selectionTemplate} header="" style={{ width: '3.5rem' }} />
                <Column header="Fiscal Year" body={fiscalRangeTemplate} />
                <Column header="Status" body={statusTemplate} style={{ width: '8rem' }} />
            </AppDataTable>
        </div>
    );
}
