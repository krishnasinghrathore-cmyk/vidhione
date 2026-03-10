import type { TextileDocumentType } from '@/lib/textile/api';
import type { TextileCapabilityKey } from '@/lib/textile/config';

export type TextileBookScreenConfig = {
    documentType: TextileDocumentType;
    title: string;
    description: string;
    capability: TextileCapabilityKey;
    route: string;
    formRoute: string;
    emptyMessage: string;
    exportFileName: string;
    newLabel: string;
};

export const TEXTILE_PURCHASE_ORDER_BOOK_SCREEN: TextileBookScreenConfig = {
    documentType: 'purchase_order',
    title: 'Purchase Order Book',
    description: 'Review processor purchase orders with party, product, quantity, and amount filters in one textile book.',
    capability: 'processor',
    route: '/apps/textile/purchase-order-book',
    formRoute: '/apps/textile/purchase-orders',
    emptyMessage: 'No textile purchase orders found for the selected filters.',
    exportFileName: 'textile-purchase-order-book',
    newLabel: 'New Purchase Order'
};

export const TEXTILE_FABRIC_INWARD_BOOK_SCREEN: TextileBookScreenConfig = {
    documentType: 'fabric_inward',
    title: 'Fabric Inward Book',
    description: 'Track receipt-side fabric inward history with lot, party, and quantity visibility.',
    capability: 'processor',
    route: '/apps/textile/fabric-inward-book',
    formRoute: '/apps/textile/fabric-inward',
    emptyMessage: 'No fabric inward entries found for the selected filters.',
    exportFileName: 'textile-fabric-inward-book',
    newLabel: 'New Fabric Inward'
};

export const TEXTILE_PACKING_SLIP_BOOK_SCREEN: TextileBookScreenConfig = {
    documentType: 'packing_slip',
    title: 'Packing Slip Book',
    description: 'See packing-slip dispatch staging before invoice or delivery completion.',
    capability: 'processor',
    route: '/apps/textile/packing-slip-book',
    formRoute: '/apps/textile/packing-slips',
    emptyMessage: 'No packing slips found for the selected filters.',
    exportFileName: 'textile-packing-slip-book',
    newLabel: 'New Packing Slip'
};

export const TEXTILE_DELIVERY_CHALLAN_BOOK_SCREEN: TextileBookScreenConfig = {
    documentType: 'delivery_challan',
    title: 'Delivery Challan Book',
    description: 'Review challan-side outward movement before the final GST invoice step.',
    capability: 'processor',
    route: '/apps/textile/delivery-challan-book',
    formRoute: '/apps/textile/delivery-challans',
    emptyMessage: 'No delivery challans found for the selected filters.',
    exportFileName: 'textile-delivery-challan-book',
    newLabel: 'New Delivery Challan'
};

export const TEXTILE_JOB_WORK_ISSUE_BOOK_SCREEN: TextileBookScreenConfig = {
    documentType: 'job_work_issue',
    title: 'Job Work Issue Book',
    description: 'Track fabric issues sent to third-party processors under the shared textile tenant.',
    capability: 'jobwork',
    route: '/apps/textile/job-work-issue-book',
    formRoute: '/apps/textile/job-work-issue',
    emptyMessage: 'No job work issue entries found for the selected filters.',
    exportFileName: 'textile-job-work-issue-book',
    newLabel: 'New Job Work Issue'
};

export const TEXTILE_DAILY_OUTWARD_BOOK_SCREEN: TextileBookScreenConfig = {
    documentType: 'daily_outward',
    title: 'Daily Outward Book',
    description: 'Review daily outward movement and pending return exposure for jobwork lots.',
    capability: 'jobwork',
    route: '/apps/textile/daily-outward-book',
    formRoute: '/apps/textile/daily-outward',
    emptyMessage: 'No daily outward entries found for the selected filters.',
    exportFileName: 'textile-daily-outward-book',
    newLabel: 'New Daily Outward'
};