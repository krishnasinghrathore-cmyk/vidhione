import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import * as invoicingApi from '@/lib/invoicing/api';
import type { CompanyContext } from '@/lib/invoicing/api';

export type CompanyProfileFormState = {
    companyFiscalYearId: number | null;
    companyName: string;
    companyAlias: string;
    fiscalYearStart: string;
    fiscalYearEnd: string;
};

const toText = (value: string | null | undefined) => value ?? '';

const toNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const mapContextToForm = (ctx: CompanyContext | null): CompanyProfileFormState => ({
    companyFiscalYearId: ctx?.companyFiscalYearId ?? null,
    companyName: toText(ctx?.companyName),
    companyAlias: toText(ctx?.companyAlias),
    fiscalYearStart: toText(ctx?.fiscalYearStart),
    fiscalYearEnd: toText(ctx?.fiscalYearEnd)
});

export const useCompanyProfileForm = () => {
    const { companyContext, refresh } = useAuth();

    const [form, setForm] = useState<CompanyProfileFormState>(() => mapContextToForm(companyContext));
    const [snapshot, setSnapshot] = useState<CompanyProfileFormState>(() => mapContextToForm(companyContext));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyContext = useCallback((ctx: CompanyContext | null) => {
        const next = mapContextToForm(ctx);
        setForm(next);
        setSnapshot(next);
    }, []);

    const loadCompany = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const ctx = await invoicingApi.fetchCompanyContext();
            applyContext(ctx);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load company profile');
        } finally {
            setLoading(false);
        }
    }, [applyContext]);

    useEffect(() => {
        if (companyContext) {
            applyContext(companyContext);
            return;
        }
        loadCompany().catch(() => {});
    }, [companyContext, applyContext, loadCompany]);

    const resetForm = useCallback(() => {
        setForm(snapshot);
        setError(null);
    }, [snapshot]);

    const saveCompany = useCallback(async () => {
        if (!form.companyName.trim()) throw new Error('Company name is required');
        if (!form.companyAlias.trim()) throw new Error('Company alias is required');

        setSaving(true);
        setError(null);
        try {
            const updated = await invoicingApi.updateCompanyProfile({
                companyFiscalYearId: form.companyFiscalYearId,
                companyName: toNullable(form.companyName),
                companyAlias: toNullable(form.companyAlias),
                fiscalYearStart: toNullable(form.fiscalYearStart),
                fiscalYearEnd: toNullable(form.fiscalYearEnd)
            });
            applyContext(updated);
            await refresh();
            return updated;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save company profile';
            setError(message);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [form, applyContext, refresh]);

    return {
        form,
        setForm,
        loading,
        saving,
        error,
        loadCompany,
        saveCompany,
        resetForm
    };
};
