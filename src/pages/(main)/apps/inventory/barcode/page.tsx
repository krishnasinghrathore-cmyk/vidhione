'use client';

import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import {
    assignIdentifierCode,
    createPrintJob,
    listIdentifierCodes,
    listPrintJobs,
    reprintPrintJob,
    resolveIdentifierCode,
    type IdentifierCode,
    type PrintJob
} from '@/lib/crm/api';
import { useLocation, Link } from 'react-router-dom';

type ProductOption = {
    productId: number;
    name: string | null;
    code: string | null;
    productBrandId: number | null;
};

type ProductsQueryData = {
    products: ProductOption[];
};

const PRODUCTS = gql`
    query BarcodeCenterProducts($limit: Int) {
        products(limit: $limit) {
            productId
            name
            code
            productBrandId
        }
    }
`;

const emptyForm = {
    codeValue: '',
    codeType: 'BARCODE',
    templateKey: 'product-label',
    isPrimary: true,
    status: 'active'
};

export default function InventoryBarcodePage() {
    const location = useLocation();
    const productIdFromQuery = React.useMemo(() => {
        const search = new URLSearchParams(location.search);
        const parsed = Number(search.get('productId') || 0);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [location.search]);

    const { data, loading, error } = useQuery<ProductsQueryData>(PRODUCTS, {
        client: inventoryApolloClient,
        variables: { limit: 3000 },
        fetchPolicy: 'cache-first'
    });

    const products = React.useMemo(() => data?.products ?? [], [data?.products]);
    const productOptions = React.useMemo(
        () =>
            products
                .map((product) => ({
                    label: product.name?.trim() || `Product ${product.productId}`,
                    value: product.productId
                }))
                .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })),
        [products]
    );
    const productMap = React.useMemo(() => {
        const map = new Map<number, ProductOption>();
        products.forEach((product) => {
            map.set(product.productId, product);
        });
        return map;
    }, [products]);

    const [selectedProductId, setSelectedProductId] = React.useState<number | null>(productIdFromQuery);
    const [barcodeForm, setBarcodeForm] = React.useState(emptyForm);
    const [searchValue, setSearchValue] = React.useState('');
    const [identifierRows, setIdentifierRows] = React.useState<IdentifierCode[]>([]);
    const [printJobs, setPrintJobs] = React.useState<PrintJob[]>([]);
    const [searchResults, setSearchResults] = React.useState<IdentifierCode[]>([]);
    const [searchNotice, setSearchNotice] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);

    const selectedProduct = selectedProductId ? productMap.get(selectedProductId) ?? null : null;

    const loadProductBarcodeContext = React.useCallback(async (productId: number | null) => {
        if (!productId) {
            setIdentifierRows([]);
            setPrintJobs([]);
            return;
        }
        const [nextIdentifiers, nextJobs] = await Promise.all([
            listIdentifierCodes('PRODUCT', String(productId)),
            listPrintJobs('PRODUCT', String(productId))
        ]);
        setIdentifierRows(nextIdentifiers);
        setPrintJobs(nextJobs);
        const primary = nextIdentifiers.find((item) => item.isPrimary) ?? nextIdentifiers[0] ?? null;
        setBarcodeForm((current) => ({
            ...current,
            codeValue: primary?.codeValue ?? '',
            codeType: primary?.codeType ?? 'BARCODE',
            templateKey: primary?.templateKey ?? 'product-label',
            status: primary?.status ?? 'active'
        }));
    }, []);

    React.useEffect(() => {
        if (productIdFromQuery) {
            setSelectedProductId(productIdFromQuery);
        }
    }, [productIdFromQuery]);

    React.useEffect(() => {
        void loadProductBarcodeContext(selectedProductId);
    }, [loadProductBarcodeContext, selectedProductId]);

    const runSearch = React.useCallback(async () => {
        const term = searchValue.trim();
        setSearchNotice(null);
        setErrorMessage(null);
        if (!term) {
            setSearchResults([]);
            return;
        }
        try {
            const direct = await resolveIdentifierCode(term);
            const results = direct ? [direct] : await listIdentifierCodes('PRODUCT', null, term);
            setSearchResults(results);
            if (!direct) {
                setSearchNotice(results.length === 0 ? 'No barcode match found.' : `${results.length} barcode match(es) found.`);
                return;
            }
            if (direct.entityType !== 'PRODUCT') {
                setSearchNotice(`Barcode ${term} belongs to ${direct.entityType}, not a product.`);
                return;
            }
            const resolvedProductId = Number(direct.entityId || 0);
            if (resolvedProductId > 0) {
                setSelectedProductId(resolvedProductId);
                setSearchNotice(`Resolved barcode to product #${resolvedProductId}.`);
            }
        } catch (nextError) {
            setErrorMessage(nextError instanceof Error ? nextError.message : 'Barcode search failed.');
        }
    }, [searchValue]);

    const saveBarcode = React.useCallback(async () => {
        if (!selectedProductId) {
            setErrorMessage('Select a product first.');
            return;
        }
        if (!barcodeForm.codeValue.trim()) {
            setErrorMessage('Barcode value is required.');
            return;
        }
        setSaving(true);
        setErrorMessage(null);
        setNotice(null);
        try {
            await assignIdentifierCode({
                entityType: 'PRODUCT',
                entityId: String(selectedProductId),
                codeValue: barcodeForm.codeValue.trim(),
                codeType: barcodeForm.codeType,
                templateKey: barcodeForm.templateKey.trim() || null,
                isPrimary: true,
                status: barcodeForm.status
            });
            await loadProductBarcodeContext(selectedProductId);
            setNotice(`Barcode saved for product #${selectedProductId}.`);
        } catch (nextError) {
            setErrorMessage(nextError instanceof Error ? nextError.message : 'Unable to save barcode.');
        } finally {
            setSaving(false);
        }
    }, [barcodeForm, loadProductBarcodeContext, selectedProductId]);

    const createLabelJob = React.useCallback(async () => {
        if (!selectedProductId) {
            setErrorMessage('Select a product first.');
            return;
        }
        setSaving(true);
        setErrorMessage(null);
        setNotice(null);
        try {
            await createPrintJob({
                entityType: 'PRODUCT',
                entityId: String(selectedProductId),
                outputFormat: 'html',
                title: `${selectedProduct?.name?.trim() || `Product ${selectedProductId}`} label`,
                renderedContent: `<div><h2>${selectedProduct?.name?.trim() || `Product ${selectedProductId}`}</h2><p>${barcodeForm.codeValue.trim() || 'No barcode assigned'}</p></div>`
            });
            await loadProductBarcodeContext(selectedProductId);
            setNotice(`Barcode print job created for product #${selectedProductId}.`);
        } catch (nextError) {
            setErrorMessage(nextError instanceof Error ? nextError.message : 'Unable to create print job.');
        } finally {
            setSaving(false);
        }
    }, [barcodeForm.codeValue, loadProductBarcodeContext, selectedProduct, selectedProductId]);

    const handleReprint = React.useCallback(async (printJobId: string) => {
        setSaving(true);
        setErrorMessage(null);
        setNotice(null);
        try {
            await reprintPrintJob(printJobId);
            await loadProductBarcodeContext(selectedProductId);
            setNotice('Barcode print job requeued.');
        } catch (nextError) {
            setErrorMessage(nextError instanceof Error ? nextError.message : 'Unable to reprint label.');
        } finally {
            setSaving(false);
        }
    }, [loadProductBarcodeContext, selectedProductId]);

    return (
        <div className="grid">
            <div className="col-12 xl:col-4">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h2 className="mb-2">Barcode Center</h2>
                        <p className="text-600 mb-0">
                            Shared product barcode search, assignment, and print history for Inventory and Retail flows.
                        </p>
                    </div>
                    {error ? <Message severity="error" text={error.message} /> : null}
                    {errorMessage ? <Message severity="error" text={errorMessage} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}
                    {searchNotice ? <Message severity="info" text={searchNotice} /> : null}
                    <div>
                        <label className="block text-700 mb-2">Search barcode</label>
                        <div className="flex gap-2">
                            <AppInput value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Scan or type barcode" />
                            <Button label="Resolve" onClick={() => void runSearch()} loading={saving} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-700 mb-2">Product</label>
                        <AppDropdown
                            value={selectedProductId}
                            options={productOptions}
                            onChange={(event) => setSelectedProductId((event.value as number | null) ?? null)}
                            placeholder={loading ? 'Loading products...' : 'Select product'}
                            filter
                            className="w-full"
                        />
                    </div>
                    {selectedProduct ? (
                        <div className="surface-border border-1 border-round p-3">
                            <div className="font-medium">{selectedProduct.name?.trim() || `Product ${selectedProduct.productId}`}</div>
                            <div className="text-600 text-sm">Code: {selectedProduct.code?.trim() || '-'}</div>
                            <div className="mt-2">
                                <Link to={`/apps/inventory/products`}>Open Products master</Link>
                            </div>
                        </div>
                    ) : null}
                    <div>
                        <div className="text-700 font-medium mb-2">Search Results</div>
                        <div className="flex flex-column gap-2">
                            {searchResults.length === 0 ? <Message severity="info" text="No barcode search results loaded." /> : searchResults.map((row) => (
                                <button key={row.id} type="button" className="p-0 border-none bg-transparent text-left cursor-pointer" onClick={() => setSelectedProductId(Number(row.entityId || 0) || null)}>
                                    <div className="surface-border border-1 border-round p-3">
                                        <div className="flex align-items-center justify-content-between gap-2">
                                            <span className="font-medium">{row.codeValue}</span>
                                            <Tag value={row.entityType} severity="info" />
                                        </div>
                                        <div className="text-600 text-sm">Entity #{row.entityId}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12 xl:col-8 flex flex-column gap-3">
                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Assign Product Barcode</h3>
                    <div className="grid">
                        <div className="col-12 md:col-5">
                            <label className="block text-700 mb-2">Barcode value</label>
                            <AppInput value={barcodeForm.codeValue} onChange={(event) => setBarcodeForm((current) => ({ ...current, codeValue: event.target.value }))} placeholder="Type or scan barcode" />
                        </div>
                        <div className="col-12 md:col-3">
                            <label className="block text-700 mb-2">Code type</label>
                            <AppDropdown value={barcodeForm.codeType} options={[{ label: 'Barcode', value: 'BARCODE' }, { label: 'QR', value: 'QR' }]} onChange={(event) => setBarcodeForm((current) => ({ ...current, codeType: (event.value as string) || 'BARCODE' }))} className="w-full" />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Template key</label>
                            <AppInput value={barcodeForm.templateKey} onChange={(event) => setBarcodeForm((current) => ({ ...current, templateKey: event.target.value }))} placeholder="product-label" />
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Save Barcode" onClick={() => void saveBarcode()} loading={saving} disabled={!selectedProductId} />
                        <Button label="Create Print Job" text onClick={() => void createLabelJob()} loading={saving} disabled={!selectedProductId} />
                    </div>
                </div>

                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Assigned Codes</h3>
                    <div className="flex flex-column gap-2">
                        {identifierRows.length === 0 ? <Message severity="info" text="No product barcodes assigned yet." /> : identifierRows.map((row) => (
                            <div key={row.id} className="surface-border border-1 border-round p-3">
                                <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                    <span className="font-medium">{row.codeValue}</span>
                                    <div className="flex gap-2 align-items-center">
                                        {row.isPrimary ? <Tag value="Primary" severity="success" /> : null}
                                        <Tag value={row.codeType} severity="info" />
                                    </div>
                                </div>
                                <div className="text-600 text-sm">Template {row.templateKey || '-'} | Status {row.status}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Print History</h3>
                    <div className="flex flex-column gap-2">
                        {printJobs.length === 0 ? <Message severity="info" text="No barcode print jobs created yet." /> : printJobs.map((job) => (
                            <div key={job.id} className="surface-border border-1 border-round p-3 flex flex-column gap-2 md:flex-row md:align-items-center md:justify-content-between">
                                <div>
                                    <div className="font-medium">{job.title || job.id}</div>
                                    <div className="text-600 text-sm">{job.outputFormat} | copies {job.copies} | status {job.status}</div>
                                </div>
                                <Button label="Reprint" text onClick={() => void handleReprint(job.id)} loading={saving} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
