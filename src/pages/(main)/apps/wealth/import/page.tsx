'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, gql } from '@apollo/client';
import { z } from 'zod';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { toYmdOrNull } from '@/lib/date';
import { importWealthFileToCsv } from '@/lib/wealthImportFiles';
import {
    WEALTH_ACCOUNTS_QUERY,
    type WealthDematAccount,
    formatAccountLabel,
    fromYmdOrNull
} from '../shared';
import { buildWealthSampleOpeningCsv, buildWealthSampleTransactionsCsv, downloadWealthCsvTemplate } from '../importAssets';
import { buildWealthReportSearchParams } from '../reportSearchParams';

const IMPORT_TRANSACTIONS = gql`
    mutation ImportTransactions($csv: String!, $dryRun: Boolean, $preview: Boolean) {
        importTransactions(csv: $csv, dryRun: $dryRun, preview: $preview) {
            inserted
            parsed
            skipped
            errors {
                row
                message
            }
            preview {
                rowNumber
                valid
                error
                tdate
                ttype
                segment
                invoiceDate
                qty
                price
                fees
                isin
                symbol
                name
                notes
                accountName
                accountCode
                sourceDoc
            }
        }
    }
`;

const IMPORT_OPENING_HOLDINGS = gql`
    mutation ImportOpeningHoldings(
        $csv: String!
        $asOfDate: String!
        $accountId: String!
        $sourceDoc: String
        $segment: String
        $dryRun: Boolean
        $preview: Boolean
    ) {
        importOpeningHoldings(
            csv: $csv
            asOfDate: $asOfDate
            accountId: $accountId
            sourceDoc: $sourceDoc
            segment: $segment
            dryRun: $dryRun
            preview: $preview
        ) {
            inserted
            parsed
            skipped
            errors {
                row
                message
            }
            preview {
                rowNumber
                valid
                error
                tdate
                ttype
                segment
                invoiceDate
                qty
                price
                fees
                isin
                symbol
                name
                notes
                accountName
                accountCode
                sourceDoc
            }
        }
    }
`;

const formSchema = z.object({
    csv: z.string().trim().min(1, 'CSV content is required')
});

const openingSchema = z.object({
    csv: z.string().trim().min(1, 'CSV content is required'),
    accountId: z.string().trim().min(1, 'Demat account is required')
});

const MODE_OPTIONS = [
    { label: 'Transactions CSV', value: 'transactions' },
    { label: 'Opening Holdings CSV', value: 'opening' }
] as const;

const SEGMENT_OPTIONS = [
    { label: 'Cash', value: 'CASH' },
    { label: 'SLBM', value: 'SLBM' },
    { label: 'F&O', value: 'FAO' }
];

type ImportPreviewRow = {
    rowNumber: number;
    valid: boolean;
    error?: string | null;
    tdate?: string | null;
    ttype?: string | null;
    segment?: string | null;
    invoiceDate?: string | null;
    qty?: string | null;
    price?: string | null;
    fees?: string | null;
    isin?: string | null;
    symbol?: string | null;
    name?: string | null;
    notes?: string | null;
    accountName?: string | null;
    accountCode?: string | null;
    sourceDoc?: string | null;
};

type ImportRunSnapshot = {
    mode: (typeof MODE_OPTIONS)[number]['value'];
    dryRun: boolean;
    accountId: string;
    investorProfileId: string;
    asOfDate: Date | null;
    sourceDoc: string;
};

export default function WealthImportPage() {
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const appliedPresetKeyRef = useRef<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const queryMode = searchParams.get('mode') === 'opening' ? 'opening' : 'transactions';
    const queryPreset = searchParams.get('preset');
    const [mode, setMode] = useState<(typeof MODE_OPTIONS)[number]['value']>(queryMode);
    const [csv, setCsv] = useState('');
    const [dryRun, setDryRun] = useState(true);
    const [preview, setPreview] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [fileInfo, setFileInfo] = useState<{ name: string; sheetName?: string } | null>(null);
    const [presetNotice, setPresetNotice] = useState<string | null>(null);
    const [lastSubmittedImport, setLastSubmittedImport] = useState<ImportRunSnapshot | null>(null);

    const [asOfDate, setAsOfDate] = useState<Date | null>(new Date());
    const [accountId, setAccountId] = useState('');
    const [sourceDoc, setSourceDoc] = useState('');
    const [segment, setSegment] = useState('CASH');

    const { data: accountsData, loading: accountsLoading } = useQuery(WEALTH_ACCOUNTS_QUERY, {
        client: wealthApolloClient
    });

    const accounts: WealthDematAccount[] = accountsData?.accounts ?? [];
    const accountOptions = useMemo(
        () => accounts.map((account) => ({ label: formatAccountLabel(account), value: account.id })),
        [accounts]
    );
    const selectedAccount = useMemo(
        () => accounts.find((account) => account.id === accountId) ?? null,
        [accountId, accounts]
    );

    const [runTransactionsImport, txState] = useMutation(IMPORT_TRANSACTIONS, {
        client: wealthApolloClient
    });
    const [runOpeningImport, openingState] = useMutation(IMPORT_OPENING_HOLDINGS, {
        client: wealthApolloClient
    });

    const result =
        mode === 'transactions'
            ? txState.data?.importTransactions
            : openingState.data?.importOpeningHoldings;
    const loading = mode === 'transactions' ? txState.loading : openingState.loading;
    const error = mode === 'transactions' ? txState.error : openingState.error;
    const previewRows: ImportPreviewRow[] = result?.preview ?? [];
    const importResultSourceDocs = useMemo(() => {
        const docs = new Set<string>();
        if (lastSubmittedImport?.mode === 'opening' && lastSubmittedImport.sourceDoc.trim()) {
            docs.add(lastSubmittedImport.sourceDoc.trim());
        }
        previewRows.forEach((row) => {
            const normalized = row.sourceDoc?.trim();
            if (normalized) docs.add(normalized);
        });
        return Array.from(docs);
    }, [lastSubmittedImport, previewRows]);
    const previewDateRange = useMemo(() => {
        const rawDates = previewRows
            .map((row) => row.tdate?.trim() || '')
            .filter((value) => Boolean(value))
            .sort();
        if (rawDates.length) {
            return {
                fromDate: fromYmdOrNull(rawDates[0]),
                toDate: fromYmdOrNull(rawDates[rawDates.length - 1])
            };
        }
        const fallbackDate = lastSubmittedImport?.mode === 'opening' ? lastSubmittedImport.asOfDate : null;
        return {
            fromDate: fallbackDate,
            toDate: fallbackDate
        };
    }, [lastSubmittedImport, previewRows]);
    const canReviewImportedData = Boolean(result && lastSubmittedImport && !lastSubmittedImport.dryRun && result.inserted > 0);
    const openReport = (pathname: string, filters: Parameters<typeof buildWealthReportSearchParams>[0]) => {
        const params = buildWealthReportSearchParams(filters);
        const search = params.toString();
        navigate({ pathname, search: search ? `?${search}` : '' });
    };
    const openTransactionsReview = (nextSourceDoc?: string) => {
        openReport('/apps/wealth/transactions', {
            fromDate: previewDateRange.fromDate,
            toDate: previewDateRange.toDate,
            sourceDoc: nextSourceDoc || '',
            accountId: lastSubmittedImport?.mode === 'opening' ? lastSubmittedImport.accountId : '',
            investorProfileId: lastSubmittedImport?.mode === 'opening' ? lastSubmittedImport.investorProfileId : ''
        });
    };
    const openHoldingsReview = () => {
        if (!lastSubmittedImport) return;
        openReport('/apps/wealth/holdings', {
            asOfDate: lastSubmittedImport.asOfDate,
            accountId: lastSubmittedImport.accountId,
            investorProfileId: lastSubmittedImport.investorProfileId,
            scope: 'ACCOUNT'
        });
    };
    const openStatementPackReview = () => {
        if (!lastSubmittedImport) return;
        openReport('/apps/wealth/statements/pack', {
            asOfDate: lastSubmittedImport.asOfDate,
            accountId: lastSubmittedImport.accountId,
            investorProfileId: lastSubmittedImport.investorProfileId,
            scope: 'ACCOUNT'
        });
    };

    useEffect(() => {
        setMode((current) => (current === queryMode ? current : queryMode));
    }, [queryMode]);

    const handleModeChange = (nextMode: (typeof MODE_OPTIONS)[number]['value']) => {
        setMode(nextMode);
        setPresetNotice(null);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', nextMode);
        nextParams.delete('preset');
        setSearchParams(nextParams, { replace: true });
    };

    
    useEffect(() => {
        if (!queryPreset) {
            appliedPresetKeyRef.current = null;
            return;
        }
        if (queryPreset === 'sample-transactions' && accountsLoading) return;
        if (appliedPresetKeyRef.current === queryPreset) return;

        appliedPresetKeyRef.current = queryPreset;

        if (queryPreset === 'sample-opening') {
            setMode('opening');
            if (accounts.length === 1) {
                setAccountId((current) => current || accounts[0].id);
            }
            setCsv(buildWealthSampleOpeningCsv());
            setDryRun(true);
            setPreview(true);
            setFormError(null);
            setPresetNotice('Sample opening CSV loaded. Select the target demat account and keep Dry run enabled before importing.');
            setFileInfo({ name: 'wealth-household-sample-opening.csv' });
            toastRef.current?.show({ severity: 'info', summary: 'Loaded sample opening CSV' });
        } else if (queryPreset === 'sample-transactions') {
            const sampleCsv = buildWealthSampleTransactionsCsv(accounts);
            setMode('transactions');
            setCsv(sampleCsv);
            setDryRun(true);
            setPreview(true);
            setFormError(null);
            setPresetNotice(
                accounts.length
                    ? 'Sample transaction CSV loaded using the current demat-account labels where available.'
                    : 'Sample transaction CSV loaded with placeholder account labels. Create matching demat accounts or edit the Account columns before importing.'
            );
            setFileInfo({ name: 'wealth-household-sample-transactions.csv' });
            toastRef.current?.show({ severity: 'info', summary: 'Loaded sample transactions CSV' });
        } else {
            appliedPresetKeyRef.current = null;
            return;
        }

        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', queryPreset === 'sample-opening' ? 'opening' : 'transactions');
        nextParams.delete('preset');
        setSearchParams(nextParams, { replace: true });
    }, [accounts, accountsLoading, queryPreset, searchParams, setSearchParams]);

    useEffect(() => {
        if (mode !== 'opening') return;
        const ymd = toYmdOrNull(asOfDate);
        if (!ymd) return;
        if (!sourceDoc.trim()) setSourceDoc(`OPENING-${ymd}`);
    }, [mode, asOfDate, sourceDoc]);

    useEffect(() => {
        if (!accountId) return;
        if (selectedAccount) return;
        setAccountId('');
    }, [accountId, selectedAccount]);

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setParsing(true);
        try {
            const parsed = await importWealthFileToCsv(file);
            setCsv(parsed.csv);
            setFormError(null);
            setPresetNotice(null);
            setFileInfo({ name: file.name, sheetName: parsed.meta?.sheetName });
            if (parsed.warnings.length) {
                parsed.warnings.forEach((warning) =>
                    toastRef.current?.show({ severity: 'warn', summary: warning })
                );
            } else {
                toastRef.current?.show({ severity: 'info', summary: `Loaded ${file.name}` });
            }
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Unable to read file', detail: err.message });
        } finally {
            setParsing(false);
            e.target.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'transactions') {
            const parsed = formSchema.safeParse({ csv });
            if (!parsed.success) {
                setFormError(parsed.error.issues[0]?.message ?? 'Invalid input');
                toastRef.current?.show({ severity: 'warn', summary: 'Fix validation errors' });
                return;
            }
            setFormError(null);
            setLastSubmittedImport({
                mode: 'transactions',
                dryRun,
                accountId: '',
                investorProfileId: '',
                asOfDate: null,
                sourceDoc: ''
            });
            runTransactionsImport({ variables: { csv: parsed.data.csv, dryRun, preview } });
            return;
        }

        const openingParsed = openingSchema.safeParse({ csv, accountId });
        if (!openingParsed.success) {
            setFormError(openingParsed.error.issues[0]?.message ?? 'Invalid input');
            toastRef.current?.show({ severity: 'warn', summary: 'Fix validation errors' });
            return;
        }

        const ymd = toYmdOrNull(asOfDate);
        if (!ymd) {
            setFormError('As-of date is required');
            toastRef.current?.show({ severity: 'warn', summary: 'Fix validation errors' });
            return;
        }

        setFormError(null);
        setLastSubmittedImport({
            mode: 'opening',
            dryRun,
            accountId: openingParsed.data.accountId,
            investorProfileId: selectedAccount?.investorProfileId ?? '',
            asOfDate,
            sourceDoc: sourceDoc.trim()
        });
        runOpeningImport({
            variables: {
                csv: openingParsed.data.csv,
                asOfDate: ymd,
                accountId: openingParsed.data.accountId,
                sourceDoc: sourceDoc.trim() || null,
                segment: segment || null,
                dryRun,
                preview
            }
        });
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />

            <div className="mb-3">
                <h2 className="m-0">Wealth Import</h2>
                <p className="mt-2 mb-0 text-600">
                    Load opening holdings or transaction history into the selected household wealth workspace.
                </p>
            </div>

            <form className="flex flex-column gap-3" onSubmit={handleSubmit}>
                <div className="flex flex-column gap-1">
                    <label className="font-medium">Import Mode</label>
                    <AppDropdown
                        value={mode}
                        options={[...MODE_OPTIONS]}
                        onChange={(e) => handleModeChange(e.value === 'opening' ? 'opening' : 'transactions')}
                        disabled={loading}
                    />
                </div>

                <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 p-3 border-1 border-round surface-50">
                    <small className="text-700 line-height-3">
                        Start UAT with the template for this mode, keep Dry run enabled first, and only switch to Import Data after the preview is correct.
                    </small>
                    <Button
                        type="button"
                        label={mode === 'opening' ? 'Download opening template' : 'Download transactions template'}
                        icon="pi pi-download"
                        className="p-button-text app-action-compact"
                        onClick={() => downloadWealthCsvTemplate(mode)}
                        disabled={loading || parsing}
                    />
                </div>

                {presetNotice ? (
                    <div className="p-3 border-1 border-round surface-ground text-700 text-sm line-height-3">
                        {presetNotice}
                    </div>
                ) : null}

                {mode === 'transactions' ? (
                    <div className="p-3 border-1 border-round surface-50 text-700 text-sm">
                        Transaction rows must match existing demat account names or account codes. If the household has only one demat account, the Account columns can be left blank.
                    </div>
                ) : null}

                {mode === 'opening' ? (
                    <div className="grid">
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">As-of Date</label>
                            <AppDateInput value={asOfDate} onChange={(value) => setAsOfDate(value)} disabled={loading} />
                        </div>
                        <div className="col-12 md:col-8 flex flex-column gap-1">
                            <label className="font-medium">Demat Account</label>
                            <AppDropdown
                                value={accountId}
                                options={accountOptions}
                                onChange={(e) => setAccountId(e.value ?? '')}
                                placeholder={accounts.length ? 'Select demat account' : 'Create a demat account first'}
                                filter
                                showClear
                                disabled={loading || !accounts.length}
                            />
                            {selectedAccount ? (
                                <small className="text-600">
                                    Using {formatAccountLabel(selectedAccount)}
                                    {selectedAccount.brokerName ? ` | Broker: ${selectedAccount.brokerName}` : ''}
                                    {selectedAccount.investorProfileName ? ` | Investor: ${selectedAccount.investorProfileName}` : ''}
                                </small>
                            ) : (
                                <small className="text-600">
                                    Opening holdings will be posted into the selected demat account.
                                </small>
                            )}
                        </div>
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">Default Segment</label>
                            <AppDropdown value={segment} options={SEGMENT_OPTIONS} onChange={(e) => setSegment(e.value)} disabled={loading} />
                        </div>
                        <div className="col-12 md:col-8 flex flex-column gap-1">
                            <label className="font-medium">Batch Source Doc</label>
                            <InputText value={sourceDoc} onChange={(e) => setSourceDoc(e.target.value)} placeholder="e.g. OPENING-2024-04-01" disabled={loading} />
                            <small className="text-600">
                                Keep this unique per import batch so the same opening holdings are not loaded twice for one demat account.
                            </small>
                        </div>
                    </div>
                ) : null}

                <div className="flex flex-column gap-1">
                    <label className="font-medium">CSV / Extracted Data</label>
                    <InputTextarea
                        value={csv}
                        onChange={(e) => setCsv(e.target.value)}
                        rows={10}
                        className="w-full"
                        placeholder={[
                            mode === 'opening'
                                ? 'ISIN,Symbol,Name,Qty,AvgCost,Notes'
                                : 'Date,ISIN,Symbol,Name,Type,Segment,InvoiceDate,Qty,Price,Fees,Notes,Account,AccountCode,SourceDoc',
                            mode === 'opening'
                                ? 'INE002A01018,RELIANCE,RELIANCE INDUSTRIES,10,2500,DP opening balance'
                                : '2024-06-01,INE002A01018,RELIANCE,RELIANCE INDUSTRIES,BUY,CASH,2024-06-02,10,2500,15.5,Broker note,Zerodha Main,ABC123,INV-123'
                        ].join('\n')}
                        disabled={loading || parsing}
                    />
                    {formError && <small className="p-error">{formError}</small>}
                </div>

                <div className="flex flex-wrap gap-4 align-items-center">
                    <div className="flex align-items-center gap-2">
                        <Checkbox inputId="dryRun" checked={dryRun} onChange={(e) => setDryRun(!!e.checked)} />
                        <label htmlFor="dryRun" className="font-medium">
                            Dry run (no writes)
                        </label>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Checkbox inputId="preview" checked={preview} onChange={(e) => setPreview(!!e.checked)} />
                        <label htmlFor="preview" className="font-medium">
                            Preview rows
                        </label>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap align-items-center">
                    <Button
                        type="submit"
                        label={parsing ? 'Parsing...' : loading ? 'Importing...' : dryRun ? 'Validate Data' : 'Import Data'}
                        icon="pi pi-upload"
                        disabled={loading || parsing || !csv.trim() || (mode === 'opening' && !accountId)}
                    />
                    <Button
                        type="button"
                        label="Choose File (CSV/XLSX/PDF)"
                        icon="pi pi-file"
                        className="p-button-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || parsing}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.xlsm,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        style={{ display: 'none' }}
                        onChange={handleFileSelected}
                    />
                    {fileInfo && (
                        <div className="text-600 text-sm">
                            File: {fileInfo.name}
                            {fileInfo.sheetName ? ` (sheet: ${fileInfo.sheetName})` : ''}
                        </div>
                    )}
                    {result && (
                        <div className="text-600 text-sm">
                            Parsed: {result.parsed} | Inserted: {result.inserted} | Skipped: {result.skipped}
                        </div>
                    )}
                </div>
            </form>

            {result ? (
                <div className="mt-3 p-3 border-1 border-round surface-50">
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-start gap-3">
                        <div>
                            <div className="font-medium text-900">Import Result</div>
                            <div className="text-600 text-sm mt-1">
                                {lastSubmittedImport?.dryRun
                                    ? 'Dry run only. No household wealth data was written yet.'
                                    : result.inserted > 0
                                      ? 'Import completed. Use the review shortcuts below to verify the posted data.'
                                      : 'Import finished without inserting rows. Check preview/errors before retrying.'}
                            </div>
                        </div>
                        {importResultSourceDocs.length ? (
                            <div className="text-600 text-sm line-height-3 md:text-right">
                                Source doc{importResultSourceDocs.length === 1 ? '' : 's'}: {importResultSourceDocs.slice(0, 3).join(', ')}
                                {importResultSourceDocs.length > 3 ? ` +${importResultSourceDocs.length - 3} more` : ''}
                            </div>
                        ) : null}
                    </div>

                    <div className="grid mt-1">
                        <div className="col-6 md:col-3">
                            <div className="surface-ground border-round p-3 h-full">
                                <div className="text-600 text-sm">Parsed</div>
                                <div className="text-xl font-semibold mt-2">{result.parsed}</div>
                            </div>
                        </div>
                        <div className="col-6 md:col-3">
                            <div className="surface-ground border-round p-3 h-full">
                                <div className="text-600 text-sm">Inserted</div>
                                <div className="text-xl font-semibold mt-2">{result.inserted}</div>
                            </div>
                        </div>
                        <div className="col-6 md:col-3">
                            <div className="surface-ground border-round p-3 h-full">
                                <div className="text-600 text-sm">Skipped</div>
                                <div className="text-xl font-semibold mt-2">{result.skipped}</div>
                            </div>
                        </div>
                        <div className="col-6 md:col-3">
                            <div className="surface-ground border-round p-3 h-full">
                                <div className="text-600 text-sm">Preview Rows</div>
                                <div className="text-xl font-semibold mt-2">{previewRows.length}</div>
                            </div>
                        </div>
                    </div>

                    {canReviewImportedData ? (
                        <div className="flex flex-wrap gap-2 align-items-center mt-3">
                            {lastSubmittedImport?.mode === 'opening' ? (
                                <>
                                    <Button
                                        type="button"
                                        label="Review holdings"
                                        icon="pi pi-chart-line"
                                        className="app-action-compact"
                                        onClick={openHoldingsReview}
                                    />
                                    <Button
                                        type="button"
                                        label="Review opening transactions"
                                        icon="pi pi-list"
                                        className="p-button-secondary app-action-compact"
                                        onClick={() => openTransactionsReview(importResultSourceDocs[0])}
                                    />
                                    <Button
                                        type="button"
                                        label="Open statement pack"
                                        icon="pi pi-file-pdf"
                                        className="p-button-text app-action-compact"
                                        onClick={openStatementPackReview}
                                    />
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        label={importResultSourceDocs.length > 1 ? 'Review first imported batch' : 'Review imported transactions'}
                                        icon="pi pi-list"
                                        className="app-action-compact"
                                        onClick={() => openTransactionsReview(importResultSourceDocs[0])}
                                    />
                                    {importResultSourceDocs.slice(1, 4).map((doc) => (
                                        <Button
                                            key={doc}
                                            type="button"
                                            label={doc}
                                            className="p-button-text app-action-compact"
                                            onClick={() => openTransactionsReview(doc)}
                                        />
                                    ))}
                                    {importResultSourceDocs.length > 4 ? (
                                        <div className="text-600 text-sm">Open the transactions report to review the remaining batches.</div>
                                    ) : null}
                                </>
                            )}
                        </div>
                    ) : lastSubmittedImport?.dryRun ? (
                        <div className="text-600 text-sm mt-3">
                            Dry run passed? Turn off Dry run and import again to post data, then use the report shortcuts for verification.
                        </div>
                    ) : null}
                </div>
            ) : null}

            {error && <p className="text-red-500 mt-3 mb-0">Error: {error.message}</p>}

            {result?.errors?.length ? (
                <div className="mt-3">
                    <h4 className="m-0 mb-2">Errors</h4>
                    <ul className="m-0 pl-4 text-600">
                        {result.errors.map((entry: any, idx: number) => (
                            <li key={idx}>
                                Row {entry.row}: {entry.message}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {result?.preview?.length ? (
                <div className="mt-3">
                    <h4 className="m-0 mb-2">Preview</h4>
                    <div className="overflow-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">#</th>
                                    <th className="text-left">Date</th>
                                    <th className="text-left">Inv Date</th>
                                    <th className="text-left">Type</th>
                                    <th className="text-left">Segment</th>
                                    <th className="text-left">Symbol</th>
                                    <th className="text-left">ISIN</th>
                                    <th className="text-right">Qty</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Fees</th>
                                    <th className="text-left">Account</th>
                                    <th className="text-left">Valid</th>
                                    <th className="text-left">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.preview.map((row: any) => {
                                    const resolvedSegment = row.segment ?? 'CASH';
                                    return (
                                        <tr key={row.rowNumber}>
                                            <td>{row.rowNumber}</td>
                                            <td>{row.tdate}</td>
                                            <td>{row.invoiceDate ?? ''}</td>
                                            <td>{row.ttype}</td>
                                            <td>{resolvedSegment}</td>
                                            <td>{row.symbol ?? ''}</td>
                                            <td>{row.isin ?? ''}</td>
                                            <td className="text-right">{row.qty}</td>
                                            <td className="text-right">{row.price}</td>
                                            <td className="text-right">{row.fees}</td>
                                            <td>
                                                {row.accountName ?? ''}
                                                {row.accountCode ? ` (${row.accountCode})` : ''}
                                            </td>
                                            <td>{row.valid ? 'Yes' : 'No'}</td>
                                            <td className="text-red-500">{row.error ?? ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    );
}




