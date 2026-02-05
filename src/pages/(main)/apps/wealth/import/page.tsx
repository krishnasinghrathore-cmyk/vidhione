'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { z } from 'zod';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient, wealthGraphqlUrl } from '@/lib/wealthApolloClient';
import { toYmdOrNull } from '@/lib/date';
import { importWealthFileToCsv } from '@/lib/wealthImportFiles';

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
        $accountName: String!
        $accountCode: String
        $sourceDoc: String
        $segment: String
        $dryRun: Boolean
        $preview: Boolean
    ) {
        importOpeningHoldings(
            csv: $csv
            asOfDate: $asOfDate
            accountName: $accountName
            accountCode: $accountCode
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
    accountName: z.string().trim().min(1, 'Account name is required')
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

export default function WealthImportPage() {
    const toastRef = useRef<Toast>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [mode, setMode] = useState<(typeof MODE_OPTIONS)[number]['value']>('transactions');
    const [csv, setCsv] = useState('');
    const [dryRun, setDryRun] = useState(true);
    const [preview, setPreview] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [fileInfo, setFileInfo] = useState<{ name: string; sheetName?: string } | null>(null);

    const [asOfDate, setAsOfDate] = useState<Date | null>(new Date());
    const [accountName, setAccountName] = useState('');
    const [accountCode, setAccountCode] = useState('');
    const [sourceDoc, setSourceDoc] = useState('');
    const [segment, setSegment] = useState('CASH');

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

    useEffect(() => {
        if (mode !== 'opening') return;
        const ymd = toYmdOrNull(asOfDate);
        if (!ymd) return;
        if (!sourceDoc.trim()) setSourceDoc(`OPENING-${ymd}`);
    }, [mode, asOfDate, sourceDoc]);

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setParsing(true);
        try {
            const result = await importWealthFileToCsv(file);
            setCsv(result.csv);
            setFormError(null);
            setFileInfo({ name: file.name, sheetName: result.meta?.sheetName });
            if (result.warnings.length) {
                result.warnings.forEach((warning) =>
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
            runTransactionsImport({ variables: { csv: parsed.data.csv, dryRun, preview } });
            return;
        }

        const openingParsed = openingSchema.safeParse({ csv, accountName });
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
        runOpeningImport({
            variables: {
                csv: openingParsed.data.csv,
                asOfDate: ymd,
                accountName: openingParsed.data.accountName,
                accountCode: accountCode.trim() || null,
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
                    Paste CSV and import it into <code>wealth_db</code>. Endpoint: <code>{wealthGraphqlUrl}</code>
                </p>
            </div>

            <form className="flex flex-column gap-3" onSubmit={handleSubmit}>
                <div className="flex flex-column gap-1">
                    <label className="font-medium">Import Mode</label>
                    <AppDropdown
                        value={mode}
                        options={[...MODE_OPTIONS]}
                        onChange={(e) => setMode(e.value)}
                        disabled={loading}
                    />
                </div>

                {mode === 'opening' ? (
                    <div className="grid">
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">As-of Date</label>
                            <AppDateInput value={asOfDate} onChange={(value) => setAsOfDate(value)} disabled={loading} />
                        </div>
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">Account Name</label>
                            <InputText value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Zerodha Main" disabled={loading} />
                        </div>
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">Account Code (Trading Code)</label>
                            <InputText value={accountCode} onChange={(e) => setAccountCode(e.target.value)} placeholder="e.g. ABC123" disabled={loading} />
                        </div>
                        <div className="col-12 md:col-4 flex flex-column gap-1">
                            <label className="font-medium">Default Segment</label>
                            <AppDropdown value={segment} options={SEGMENT_OPTIONS} onChange={(e) => setSegment(e.value)} disabled={loading} />
                        </div>
                        <div className="col-12 md:col-8 flex flex-column gap-1">
                            <label className="font-medium">Batch SourceDoc</label>
                            <InputText value={sourceDoc} onChange={(e) => setSourceDoc(e.target.value)} placeholder="e.g. OPENING-2024-04-01" disabled={loading} />
                            <small className="text-600">
                                Used to prevent importing the same opening holdings twice (best practice: keep it unique per import).
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
                        label={parsing ? 'Parsing…' : loading ? 'Importing…' : dryRun ? 'Validate Data' : 'Import Data'}
                        icon="pi pi-upload"
                        disabled={loading || parsing || !csv.trim()}
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

            {error && <p className="text-red-500 mt-3 mb-0">Error: {error.message}</p>}

            {result?.errors?.length ? (
                <div className="mt-3">
                    <h4 className="m-0 mb-2">Errors</h4>
                    <ul className="m-0 pl-4 text-600">
                        {result.errors.map((e: any, idx: number) => (
                            <li key={idx}>
                                Row {e.row}: {e.message}
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
                                {result.preview.map((r: any) => {
                                    const segment = r.segment ?? 'CASH';
                                    return (
                                        <tr key={r.rowNumber}>
                                            <td>{r.rowNumber}</td>
                                            <td>{r.tdate}</td>
                                            <td>{r.invoiceDate ?? ''}</td>
                                            <td>{r.ttype}</td>
                                            <td>{segment}</td>
                                            <td>{r.symbol ?? ''}</td>
                                            <td>{r.isin ?? ''}</td>
                                            <td className="text-right">{r.qty}</td>
                                            <td className="text-right">{r.price}</td>
                                            <td className="text-right">{r.fees}</td>
                                            <td>
                                                {r.accountName ?? ''}
                                                {r.accountCode ? ` (${r.accountCode})` : ''}
                                            </td>
                                            <td>{r.valid ? 'Yes' : 'No'}</td>
                                            <td className="text-red-500">{r.error ?? ''}</td>
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
