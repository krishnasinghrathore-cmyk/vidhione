import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import * as invoicingApi from '@/lib/invoicing/api';
import type { AgencyOptions } from '@/lib/invoicing/api';
import { useLedgerLookup } from '../../billing/useLedgerLookup';

export type AgencyOptionsFormState = {
    dbBackupPath: string;
    discountLedgerId: number | null;
    chequeCancelLedgerId: number | null;
    roundOffLedgerId: number | null;
    isFormWiseRights: boolean;
    isVoucherDateLowerAllow: boolean;
    isManualInvoiceNumber: boolean;
    defaultExpenditureLedgerId: number | null;
    defaultStockLedgerId: number | null;
    agencyCustomerId: string;
    defaultTransportImportColumnSno: string;
    defaultSaleInvoiceImportColumnSno: string;
    transportUnitId: number | null;
    reportFolderPath: string;
    isReportSetting: boolean;
    einvoiceAckColumns1: string;
    einvoiceAckColumns2: string;
    einvoiceCancelAckColumns: string;
    isInvoiceLock: boolean;
    isShowRemark: boolean;
};

const toText = (value: string | null | undefined) => value ?? '';

const toNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const mapOptionsToForm = (options: AgencyOptions | null): AgencyOptionsFormState => ({
    dbBackupPath: toText(options?.dbBackupPath),
    discountLedgerId: options?.discountLedgerId ?? null,
    chequeCancelLedgerId: options?.chequeCancelLedgerId ?? null,
    roundOffLedgerId: options?.roundOffLedgerId ?? null,
    isFormWiseRights: options?.isFormWiseRights ?? false,
    isVoucherDateLowerAllow: options?.isVoucherDateLowerAllow ?? false,
    isManualInvoiceNumber: options?.isManualInvoiceNumber ?? false,
    defaultExpenditureLedgerId: options?.defaultExpenditureLedgerId ?? null,
    defaultStockLedgerId: options?.defaultStockLedgerId ?? null,
    agencyCustomerId: toText(options?.agencyCustomerId),
    defaultTransportImportColumnSno: toText(options?.defaultTransportImportColumnSno),
    defaultSaleInvoiceImportColumnSno: toText(options?.defaultSaleInvoiceImportColumnSno),
    transportUnitId: options?.transportUnitId ?? null,
    reportFolderPath: toText(options?.reportFolderPath),
    isReportSetting: options?.isReportSetting ?? false,
    einvoiceAckColumns1: toText(options?.einvoiceAckColumns1),
    einvoiceAckColumns2: toText(options?.einvoiceAckColumns2),
    einvoiceCancelAckColumns: toText(options?.einvoiceCancelAckColumns),
    isInvoiceLock: options?.isInvoiceLock ?? false,
    isShowRemark: options?.isShowRemark ?? false
});

export const useAgencyOptionsForm = () => {
    const { agencyOptions, enabledApps, refresh, user } = useAuth();
    const { ledgerOptions, loading: ledgerLoading, error: ledgerError } = useLedgerLookup();

    const agencyEnabled = user?.role === 'superadmin' ? true : enabledApps ? enabledApps.includes('agency') : true;

    const [form, setForm] = useState<AgencyOptionsFormState>(() => mapOptionsToForm(agencyOptions));
    const [snapshot, setSnapshot] = useState<AgencyOptionsFormState>(() => mapOptionsToForm(agencyOptions));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyOptions = useCallback((options: AgencyOptions | null) => {
        const next = mapOptionsToForm(options);
        setForm(next);
        setSnapshot(next);
    }, []);

    const loadOptions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const options = await invoicingApi.fetchAgencyOptions();
            applyOptions(options);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load options');
        } finally {
            setLoading(false);
        }
    }, [applyOptions]);

    useEffect(() => {
        if (!agencyEnabled) {
            setError('Agency app is not enabled for this tenant.');
            return;
        }
        if (agencyOptions) {
            applyOptions(agencyOptions);
            return;
        }
        loadOptions().catch(() => {});
    }, [agencyEnabled, agencyOptions, applyOptions, loadOptions]);

    const resetForm = useCallback(() => {
        setForm(snapshot);
        setError(null);
    }, [snapshot]);

    const ledgerSelectOptions = useMemo(() => {
        return [{ label: 'Select ledger', value: null }].concat(ledgerOptions);
    }, [ledgerOptions]);

    const saveOptions = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const updated = await invoicingApi.updateAgencyOptions({
                dbBackupPath: toNullable(form.dbBackupPath),
                discountLedgerId: form.discountLedgerId,
                chequeCancelLedgerId: form.chequeCancelLedgerId,
                roundOffLedgerId: form.roundOffLedgerId,
                isFormWiseRights: form.isFormWiseRights,
                isVoucherDateLowerAllow: form.isVoucherDateLowerAllow,
                isManualInvoiceNumber: form.isManualInvoiceNumber,
                defaultExpenditureLedgerId: form.defaultExpenditureLedgerId,
                defaultStockLedgerId: form.defaultStockLedgerId,
                agencyCustomerId: toNullable(form.agencyCustomerId),
                defaultTransportImportColumnSno: toNullable(form.defaultTransportImportColumnSno),
                defaultSaleInvoiceImportColumnSno: toNullable(form.defaultSaleInvoiceImportColumnSno),
                transportUnitId: form.transportUnitId,
                reportFolderPath: toNullable(form.reportFolderPath),
                isReportSetting: form.isReportSetting,
                einvoiceAckColumns1: toNullable(form.einvoiceAckColumns1),
                einvoiceAckColumns2: toNullable(form.einvoiceAckColumns2),
                einvoiceCancelAckColumns: toNullable(form.einvoiceCancelAckColumns),
                isInvoiceLock: form.isInvoiceLock,
                isShowRemark: form.isShowRemark
            });
            applyOptions(updated);
            await refresh();
            return updated;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save options';
            setError(message);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [form, applyOptions, refresh]);

    return {
        form,
        setForm,
        loading,
        saving,
        error,
        loadOptions,
        saveOptions,
        resetForm,
        ledgerSelectOptions,
        ledgerLoading,
        ledgerError
    };
};
