'use client';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { INVENTORY_MENU_MAP } from '@/config/inventoryMenu';
import InventoryProductGroupsPage from '../product-groups/page';
import InventoryProductBrandsPage from '../product-brands/page';
import InventoryProductAttributeTypesPage from '../product-attribute-types/page';
import InventoryUnitsPage from '../units/page';
import InventoryHsnCodesPage from '../hsn-codes/page';
import InventorySchemeBatchesPage from '../scheme-batches/page';
import InventoryDeliveryByPage from '../delivery-by/page';
import InventoryDeliveryStatusPage from '../delivery-status/page';
import InventoryCheckedByPage from '../checked-by/page';
import InventoryBillCollectionStatusPage from '../bill-collection-status/page';
import InventoryTransportersPage from '../transporters/page';
import InventoryGodownsPage from '../godowns/page';
import InventoryProductsPage from '../products/page';
import InventoryBarcodePage from '../barcode/page';
import InventoryBarcodeHistoryPage from '../barcode-history/page';
import InventoryStockTakingPage from '../stock-taking/page';
import InventoryStockTakingBookPage from '../stock-taking-book/page';
import InventoryTransportSheetImportPage from '../transport-sheet-import/page';
import InventoryTransportStockInPage from '../transport-stock-in/page';
import InventoryTransportStockInBookPage from '../transport-stock-in-book/page';
import InventoryTransportStockAnalysisPage from '../transport-stock-analysis/page';
import InventoryImportBizomInvoicesPage from '../import-bizom-invoices/page';

const SECTION_COMPONENTS: Record<string, React.ReactNode> = {
    'product-groups': <InventoryProductGroupsPage />,
    'product-brands': <InventoryProductBrandsPage />,
    'product-attribute-types': <InventoryProductAttributeTypesPage />,
    units: <InventoryUnitsPage />,
    'hsn-codes': <InventoryHsnCodesPage />,
    barcode: <InventoryBarcodePage />,
    'barcode-history': <InventoryBarcodeHistoryPage />,
    'stock-taking': <InventoryStockTakingPage />,
    'stock-taking-book': <InventoryStockTakingBookPage />,
    'scheme-batches': <InventorySchemeBatchesPage />,
    'delivery-by': <InventoryDeliveryByPage />,
    'delivery-status': <InventoryDeliveryStatusPage />,
    'checked-by': <InventoryCheckedByPage />,
    'bill-collection-status': <InventoryBillCollectionStatusPage />,
    transporters: <InventoryTransportersPage />,
    godowns: <InventoryGodownsPage />,
    products: <InventoryProductsPage />,
    'transport-sheet-import': <InventoryTransportSheetImportPage />,
    'transport-stock-in': <InventoryTransportStockInPage />,
    'transport-stock-in-book': <InventoryTransportStockInBookPage />,
    'transport-stock-analysis': <InventoryTransportStockAnalysisPage />,
    'import-bizom-invoices': <InventoryImportBizomInvoicesPage />
};

export default function InventorySectionPage() {
    const { section } = useParams();
    const entry = section ? INVENTORY_MENU_MAP[section] : undefined;
    const sectionView = section ? SECTION_COMPONENTS[section] : undefined;

    if (sectionView) return sectionView;
    const title = entry?.label ?? 'Inventory';
    const description = entry
        ? `${entry.groupLabel} - ${entry.label} from the legacy agency app will be implemented here.`
        : 'Products, stock, locations, and movements shared across industries will be implemented here.';

    return (
        <div className="card">
            <h2 className="mb-2">{title}</h2>
            <p className="text-600">{description}</p>
            {entry && (
                <div className="mt-3">
                    <Link to="/apps/inventory">Back to Inventory</Link>
                </div>
            )}
        </div>
    );
}


