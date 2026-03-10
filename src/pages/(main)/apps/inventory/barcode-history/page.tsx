'use client';

import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Link } from 'react-router-dom';
import AppInput from '@/components/AppInput';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import {
    listIdentifierCodes,
    listPrintJobs,
    reprintPrintJob,
    type IdentifierCode,
    type PrintJob
} from '@/lib/crm/api';

type ProductOption = {
    productId: number;
    name: string | null;
    code: string | null;
};

type ProductsQueryData = {
    products: ProductOption[];
};

type BarcodeAssignmentRow = {
    id: string;
    productId: number;
    productName: string;
    productCode: string;
    codeValue: string;
    codeType: string;
    status: string;
    isPrimary: boolean;
    updatedAt: string | null;
};

type BarcodePrintRow = {
    id: string;
    productId: number;
    productName: string;
    productCode: string;
    title: string;
    outputFormat: string;
    status: string;
    copies: number;
    createdAt: string | null;
    reprintOfJobId: string | null;
};

const PRODUCTS = gql`
    query BarcodeHistoryProducts($limit: Int) {
        products(limit: $limit) {
            productId
            name
            code
        }
    }
`;

const normalizeText = (value: string | number | null | undefined) => String(value ?? '').trim().toLowerCase();
const formatDateTime = (value: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const matchesSearch = (values: Array<string | number | null | undefined>, search: string) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return true;
    return values.some((value) => normalizeText(value).includes(normalizedSearch));
};

export default function InventoryBarcodeHistoryPage() {
    const { data, loading: productsLoading, error: productsError } = useQuery<ProductsQueryData>(PRODUCTS, {
        client: inventoryApolloClient,
        variables: { limit: 3000 },
        fetchPolicy: 'cache-first'
    });

    const products = React.useMemo(() => data?.products ?? [], [data?.products]);
    const productMap = React.useMemo(() => {
        const map = new Map<number, ProductOption>();
        products.forEach((product) => {
            map.set(product.productId, product);
        });
        return map;
    }, [products]);

    const [searchValue, setSearchValue] = React.useState('');
    const [identifierRows, setIdentifierRows] = React.useState<IdentifierCode[]>([]);
    const [printJobs, setPrintJobs] = React.useState<PrintJob[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);
    const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const loadHistory = React.useCallback(async () => {
        setLoadingHistory(true);
        setErrorMessage(null);
        try {
            const [nextIdentifiers, nextJobs] = await Promise.all([
                listIdentifierCodes('PRODUCT'),
                listPrintJobs('PRODUCT')
            ]);
            setIdentifierRows(nextIdentifiers);
            setPrintJobs(nextJobs);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load barcode history.');
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    React.useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    const barcodeAssignments = React.useMemo<BarcodeAssignmentRow[]>(
        () =>
            identifierRows
                .map((row) => {
                    const productId = Number(row.entityId ?? 0);
                    const product = productMap.get(productId);
                    return {
                        id: row.id,
                        productId,
                        productName: product?.name?.trim() || `Product ${productId || '-'}`,
                        productCode: product?.code?.trim() || '-',
                        codeValue: row.codeValue,
                        codeType: row.codeType,
                        status: row.status,
                        isPrimary: row.isPrimary,
                        updatedAt: row.updatedAt
                    };
                })
                .filter((row) => row.productId > 0),
        [identifierRows, productMap]
    );

    const barcodePrintRows = React.useMemo<BarcodePrintRow[]>(
        () =>
            printJobs
                .map((job) => {
                    const productId = Number(job.entityId ?? 0);
                    const product = productMap.get(productId);
                    return {
                        id: job.id,
                        productId,
                        productName: product?.name?.trim() || `Product ${productId || '-'}`,
                        productCode: product?.code?.trim() || '-',
                        title: job.title?.trim() || `Print Job ${job.id}`,
                        outputFormat: job.outputFormat,
                        status: job.status,
                        copies: job.copies,
                        createdAt: job.createdAt,
                        reprintOfJobId: job.reprintOfJobId
                    };
                })
                .filter((row) => row.productId > 0),
        [printJobs, productMap]
    );

    const filteredBarcodeAssignments = React.useMemo(
        () =>
            barcodeAssignments.filter((row) =>
                matchesSearch(
                    [row.productName, row.productCode, row.codeValue, row.codeType, row.status, row.productId],
                    searchValue
                )
            ),
        [barcodeAssignments, searchValue]
    );

    const filteredBarcodePrintRows = React.useMemo(
        () =>
            barcodePrintRows.filter((row) =>
                matchesSearch(
                    [row.productName, row.productCode, row.title, row.outputFormat, row.status, row.productId],
                    searchValue
                )
            ),
        [barcodePrintRows, searchValue]
    );

    const handleReprint = React.useCallback(
        async (printJobId: string) => {
            setActionLoadingId(printJobId);
            setNotice(null);
            setErrorMessage(null);
            try {
                await reprintPrintJob(printJobId);
                await loadHistory();
                setNotice('Barcode print job requeued.');
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Unable to reprint barcode job.');
            } finally {
                setActionLoadingId(null);
            }
        },
        [loadHistory]
    );

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column lg:flex-row lg:align-items-center lg:justify-content-between gap-3">
                        <div>
                            <h2 className="mb-2">Barcode History</h2>
                            <p className="text-600 mb-0">
                                Shared barcode assignment and print history for product flows used by Inventory, Retail,
                                and future barcode-enabled modules.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Tag value={`${barcodeAssignments.length} assigned`} severity="info" />
                            <Tag value={`${barcodePrintRows.length} print jobs`} severity="success" />
                            <Button
                                type="button"
                                icon="pi pi-refresh"
                                label="Refresh"
                                className="app-action-compact"
                                onClick={() => void loadHistory()}
                                loading={loadingHistory}
                            />
                        </div>
                    </div>

                    {productsError ? <Message severity="error" text={productsError.message} /> : null}
                    {errorMessage ? <Message severity="error" text={errorMessage} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}

                    <div className="grid">
                        <div className="col-12 lg:col-6">
                            <label className="block text-700 mb-2">Search product, barcode, status, or job title</label>
                            <AppInput
                                value={searchValue}
                                onChange={(event) => setSearchValue(event.target.value)}
                                placeholder="Search barcode activity"
                            />
                        </div>
                        <div className="col-12 lg:col-6 flex align-items-end">
                            <div className="text-600 text-sm">
                                {productsLoading
                                    ? 'Loading product names for barcode activity...'
                                    : 'Use Barcode Center to assign new codes or print individual labels.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <div className="card">
                    <div className="flex align-items-center justify-content-between gap-2 mb-3">
                        <h3 className="m-0">Assigned Product Codes</h3>
                        <span className="text-600 text-sm">{filteredBarcodeAssignments.length} match(es)</span>
                    </div>
                    <DataTable value={filteredBarcodeAssignments} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} emptyMessage="No barcode assignments found.">
                        <Column
                            header="Product"
                            body={(row: BarcodeAssignmentRow) => (
                                <div className="flex flex-column gap-1">
                                    <span className="font-medium">{row.productName}</span>
                                    <small className="text-600">#{row.productId} | {row.productCode}</small>
                                </div>
                            )}
                        />
                        <Column
                            header="Code"
                            body={(row: BarcodeAssignmentRow) => (
                                <div className="flex align-items-center gap-2">
                                    <span>{row.codeValue}</span>
                                    {row.isPrimary ? <Tag value="Primary" severity="success" /> : null}
                                </div>
                            )}
                        />
                        <Column field="codeType" header="Type" />
                        <Column
                            header="Status"
                            body={(row: BarcodeAssignmentRow) => (
                                <Tag value={row.status} severity={row.status === 'active' ? 'success' : 'warning'} />
                            )}
                        />
                        <Column header="Updated" body={(row: BarcodeAssignmentRow) => formatDateTime(row.updatedAt)} />
                        <Column
                            header="Open"
                            body={(row: BarcodeAssignmentRow) => (
                                <Link to={`/apps/inventory/barcode?productId=${row.productId}`}>Barcode Center</Link>
                            )}
                        />
                    </DataTable>
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <div className="card">
                    <div className="flex align-items-center justify-content-between gap-2 mb-3">
                        <h3 className="m-0">Print History</h3>
                        <span className="text-600 text-sm">{filteredBarcodePrintRows.length} match(es)</span>
                    </div>
                    <DataTable value={filteredBarcodePrintRows} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} emptyMessage="No barcode print history found.">
                        <Column
                            header="Product"
                            body={(row: BarcodePrintRow) => (
                                <div className="flex flex-column gap-1">
                                    <span className="font-medium">{row.productName}</span>
                                    <small className="text-600">#{row.productId} | {row.productCode}</small>
                                </div>
                            )}
                        />
                        <Column
                            header="Job"
                            body={(row: BarcodePrintRow) => (
                                <div className="flex flex-column gap-1">
                                    <span>{row.title}</span>
                                    <small className="text-600">
                                        {row.outputFormat} | copies {row.copies}
                                        {row.reprintOfJobId ? ' | reprint' : ''}
                                    </small>
                                </div>
                            )}
                        />
                        <Column
                            header="Status"
                            body={(row: BarcodePrintRow) => (
                                <Tag value={row.status} severity={row.status === 'ready' ? 'success' : 'info'} />
                            )}
                        />
                        <Column header="Created" body={(row: BarcodePrintRow) => formatDateTime(row.createdAt)} />
                        <Column
                            header="Action"
                            body={(row: BarcodePrintRow) => (
                                <Button
                                    type="button"
                                    label="Reprint"
                                    text
                                    onClick={() => void handleReprint(row.id)}
                                    loading={actionLoadingId === row.id}
                                />
                            )}
                        />
                    </DataTable>
                </div>
            </div>
        </div>
    );
}