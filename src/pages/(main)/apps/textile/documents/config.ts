import type { TextileDocumentType, TextileStockEffect } from '@/lib/textile/api';
import type { TextileCapabilityKey } from '@/lib/textile/config';

export type TextileDocumentFilters = {
    search: string;
    fromDate: Date | null;
    toDate: Date | null;
    includeCancelled: boolean;
};

export type TextileDocumentScreenConfig = {
    documentType: TextileDocumentType;
    title: string;
    description: string;
    capability: TextileCapabilityKey;
    defaultStockEffect: TextileStockEffect;
    route: string;
    emptyMessage: string;
};

export const TEXTILE_PURCHASE_ORDER_SCREEN: TextileDocumentScreenConfig = {
    documentType: 'purchase_order',
    title: 'Textile Purchase Orders',
    description: 'Capture processor and mixed-tenant purchase orders before inward, challan, and invoice flow.',
    capability: 'processor',
    defaultStockEffect: 'none',
    route: '/apps/textile/purchase-orders',
    emptyMessage: 'No textile purchase orders found for the selected filters.'
};

export const TEXTILE_FABRIC_INWARD_SCREEN: TextileDocumentScreenConfig = {
    documentType: 'fabric_inward',
    title: 'Fabric Inward',
    description: 'Track client fabric receipts, bale references, and quantity intake inside the shared textile model.',
    capability: 'processor',
    defaultStockEffect: 'in',
    route: '/apps/textile/fabric-inward',
    emptyMessage: 'No fabric inward entries found for the selected filters.'
};

export const TEXTILE_PACKING_SLIP_SCREEN: TextileDocumentScreenConfig = {
    documentType: 'packing_slip',
    title: 'Packing Slips',
    description: 'Prepare client fabric dispatch lots before challan and invoice completion in the processor flow.',
    capability: 'processor',
    defaultStockEffect: 'out',
    route: '/apps/textile/packing-slips',
    emptyMessage: 'No packing slips found for the selected filters.'
};

export const TEXTILE_DELIVERY_CHALLAN_SCREEN: TextileDocumentScreenConfig = {
    documentType: 'delivery_challan',
    title: 'Delivery Challans',
    description: 'Track outward challans for textile delivery movement without splitting processor tenants from mixed tenants.',
    capability: 'processor',
    defaultStockEffect: 'out',
    route: '/apps/textile/delivery-challans',
    emptyMessage: 'No delivery challans found for the selected filters.'
};
export const TEXTILE_JOB_WORK_ISSUE_SCREEN: TextileDocumentScreenConfig = {
    documentType: 'job_work_issue',
    title: 'Job Work Issue',
    description: 'Issue fabric to third-party processors while keeping the same textile tenant active for processor and jobwork flows.',
    capability: 'jobwork',
    defaultStockEffect: 'out',
    route: '/apps/textile/job-work-issue',
    emptyMessage: 'No job work issue entries found for the selected filters.'
};

export const TEXTILE_DAILY_OUTWARD_SCREEN: TextileDocumentScreenConfig = {
    documentType: 'daily_outward',
    title: 'Daily Outward',
    description: 'Track outward lot movement and pending return exposure for mixed textile tenants running third-party jobwork.',
    capability: 'jobwork',
    defaultStockEffect: 'out',
    route: '/apps/textile/daily-outward',
    emptyMessage: 'No daily outward entries found for the selected filters.'
};