import React from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import type { TextilePresetKey } from '@/lib/auth/api';
import {
    TEXTILE_CAPABILITY_DEFINITIONS,
    getTextilePresetLabel,
    type TextileCapabilityState
} from '@/lib/textile/config';
import { getSalesProfileLabel } from '../billing/salesProfile';

type TextileWorkspaceViewProps = {
    isTextileTenant: boolean;
    salesProfileKey: string | null;
    presetKey: TextilePresetKey | null;
    capabilities: TextileCapabilityState;
};

type TextileItem = {
    title: string;
    description: string;
    phase: 'Phase 1' | 'Phase 2' | 'Phase 3';
};

const PROCESSOR_QUICK_LINKS = [
    { label: 'Purchase Orders', path: '/apps/textile/purchase-orders', icon: 'pi pi-file-edit' },
    { label: 'Fabric Inward', path: '/apps/textile/fabric-inward', icon: 'pi pi-download' },
    { label: 'Packing Slips', path: '/apps/textile/packing-slips', icon: 'pi pi-box' },
    { label: 'Delivery Challans', path: '/apps/textile/delivery-challans', icon: 'pi pi-truck' }
] as const;

const JOBWORK_QUICK_LINKS = [
    { label: 'Job Work Issue', path: '/apps/textile/job-work-issue', icon: 'pi pi-send' },
    { label: 'Daily Outward', path: '/apps/textile/daily-outward', icon: 'pi pi-upload' }
] as const;

const PROCESSOR_BOOK_QUICK_LINKS = [
    { label: 'PO Book', path: '/apps/textile/purchase-order-book', icon: 'pi pi-book' },
    { label: 'Inward Book', path: '/apps/textile/fabric-inward-book', icon: 'pi pi-book' },
    { label: 'Packing Book', path: '/apps/textile/packing-slip-book', icon: 'pi pi-book' },
    { label: 'Delivery Book', path: '/apps/textile/delivery-challan-book', icon: 'pi pi-book' },
    { label: 'Dispatch Book', path: '/apps/textile/dispatch-book', icon: 'pi pi-directions-alt' }
] as const;

const JOBWORK_BOOK_QUICK_LINKS = [
    { label: 'Issue Book', path: '/apps/textile/job-work-issue-book', icon: 'pi pi-book' },
    { label: 'Outward Book', path: '/apps/textile/daily-outward-book', icon: 'pi pi-book' }
] as const;

const REPORT_QUICK_LINKS = [
    { label: 'Fabric Statement', path: '/apps/textile/fabric-statement', icon: 'pi pi-chart-bar' },
    { label: 'Stock Statement', path: '/apps/textile/fabric-stock-statement', icon: 'pi pi-chart-line' }
] as const;

const BILLING_QUICK_LINKS = [
    { label: 'Bill Book', path: '/apps/textile/bill-book', icon: 'pi pi-book' },
    { label: 'GST Invoice', path: '/apps/textile/gst-invoices/new', icon: 'pi pi-file-edit' }
] as const;

const COMMON_QUICK_LINKS = [
    { label: 'Products', path: '/apps/inventory/products', icon: 'pi pi-box' },
    { label: 'Ledgers', path: '/apps/accounts/ledgers', icon: 'pi pi-book' },
    { label: 'Transport', path: '/apps/inventory/transporters', icon: 'pi pi-truck' },
    { label: 'Godowns', path: '/apps/inventory/godowns', icon: 'pi pi-building' }
] as const;

const PROCESSOR_ITEMS: TextileItem[] = [
    { title: 'Textile Purchase Order', description: 'Commercial commitment and process intake for client fabric.', phase: 'Phase 1' },
    { title: 'Fabric Inward', description: 'Receipt entry for client fabric, lot references, and quantity capture.', phase: 'Phase 1' },
    { title: 'Packing Slip / Challan', description: 'Dispatch preparation before billing and delivery movement.', phase: 'Phase 1' },
    { title: 'Delivery Challan', description: 'Customer dispatch control aligned to the challan-first textile flow.', phase: 'Phase 1' },
    { title: 'Textile GST Invoice', description: 'Common GST invoice baseline modeled on frmInvoice_GST2.', phase: 'Phase 1' }
];

const JOBWORK_ITEMS: TextileItem[] = [
    { title: 'Job Work Issue', description: 'Issue fabric to third-party processors without changing tenant type.', phase: 'Phase 1' },
    { title: 'Daily Outward', description: 'Track outward movement and pending return exposure for jobwork lots.', phase: 'Phase 1' },
    { title: 'GST Invoice with Jobber Fields', description: 'Use the same textile GST invoice contract with optional jobber references.', phase: 'Phase 1' }
];

const SHARED_ITEMS: TextileItem[] = [
    { title: 'Purchase Order Book', description: 'Processor and mixed-tenant order visibility.', phase: 'Phase 1' },
    { title: 'Fabric Inward Book', description: 'Receipt history by party, lot, and fabric.', phase: 'Phase 1' },
    { title: 'Dispatch Book', description: 'Combined packing slip, delivery challan, and GST invoice visibility in one shared outward register.', phase: 'Phase 1' },
    { title: 'Bill Book', description: 'Invoice visibility through the shared billing engine.', phase: 'Phase 1' },
    { title: 'Fabric Statement', description: 'Movement balance across inward, jobwork, dispatch, and invoice.', phase: 'Phase 1' },
    { title: 'Fabric Stock Statement', description: 'Current fabric position without separate processor and jobwork models.', phase: 'Phase 1' }
];

const LATER_ITEMS: TextileItem[] = [
    { title: 'In-house Production', description: 'Greige purchase, process transfer, daily process, and production controls.', phase: 'Phase 2' },
    { title: 'Design Collection', description: 'Design recipe, samples, challans, and multi-image design records.', phase: 'Phase 3' },
    { title: 'Color Costing', description: 'Client-specific color costing workflows reserved for the final rollout.', phase: 'Phase 3' }
];

function TextileSection({ title, summary, items }: { title: string; summary: string; items: TextileItem[] }) {
    return (
        <div className="card h-full">
            <div className="flex flex-column gap-2">
                <div>
                    <h3 className="m-0">{title}</h3>
                    <p className="text-600 mb-0 mt-2">{summary}</p>
                </div>
                <div className="grid m-0">
                    {items.map((item) => (
                        <div key={item.title} className="col-12 md:col-6 p-0 md:pr-2 mt-2">
                            <div className="border-1 border-200 border-round p-3 h-full flex flex-column gap-2">
                                <div className="flex align-items-start justify-content-between gap-2">
                                    <span className="font-medium text-900">{item.title}</span>
                                    <Tag value={item.phase} severity={item.phase === 'Phase 1' ? 'success' : 'warning'} />
                                </div>
                                <small className="text-600">{item.description}</small>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TextileWorkspaceView({ isTextileTenant, salesProfileKey, presetKey, capabilities }: TextileWorkspaceViewProps) {
    const navigate = useNavigate();
    const activeCapabilities = TEXTILE_CAPABILITY_DEFINITIONS.filter((definition) => capabilities[definition.key]);
    const quickLinks = [
        ...(capabilities.processor ? PROCESSOR_QUICK_LINKS : []),
        ...(capabilities.jobwork ? JOBWORK_QUICK_LINKS : []),
        ...(capabilities.processor ? PROCESSOR_BOOK_QUICK_LINKS : []),
        ...(capabilities.jobwork ? JOBWORK_BOOK_QUICK_LINKS : []),
        ...(capabilities.processor || capabilities.jobwork || capabilities.inhouse ? BILLING_QUICK_LINKS : []),
        ...(capabilities.processor || capabilities.jobwork || capabilities.inhouse ? REPORT_QUICK_LINKS : []),
        ...COMMON_QUICK_LINKS
    ];
    const invoiceProfileLabel = getSalesProfileLabel(salesProfileKey);
    const usesTextileGstProfile =
        salesProfileKey === 'textile_sales_gst_v1' || salesProfileKey === 'textile_sales_gst2_v1';

    if (!isTextileTenant) {
        return (
            <div className="card">
                <h2 className="mb-2">Textile</h2>
                <p className="text-600 mb-0">
                    This workspace is only active for tenants whose industry is set to Textile.
                </p>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                        <div>
                            <h2 className="m-0">Textile Workspace</h2>
                            <p className="text-600 mt-2 mb-0">
                                Additive textile mode: the same tenant can run processor and jobwork together, then grow into in-house production later.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Tag value={getTextilePresetLabel(presetKey)} severity="info" />
                            <Tag value={invoiceProfileLabel} severity={usesTextileGstProfile ? 'success' : 'warning'} />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {quickLinks.map((link) => (
                            <Button
                                key={link.path}
                                label={link.label}
                                icon={link.icon}
                                outlined
                                className="app-action-compact"
                                onClick={() => navigate(link.path)}
                            />
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {activeCapabilities.map((definition) => (
                            <Tag key={definition.key} value={definition.label} severity={definition.phase === 'Phase 1' ? 'success' : 'warning'} />
                        ))}
                    </div>

                    {!usesTextileGstProfile && (
                        <small className="text-700 block mt-3">
                            Textile tenants should normally keep the Textile GST invoice profile selected because the phase-1 invoice baseline is the common textile GST flow.
                        </small>
                    )}
                </div>
            </div>

            {capabilities.processor && (
                <div className="col-12 lg:col-6">
                    <TextileSection
                        title="Processor Flow"
                        summary="Use this for client fabric inward through challan, dispatch, and invoice completion."
                        items={PROCESSOR_ITEMS}
                    />
                </div>
            )}

            {capabilities.jobwork && (
                <div className="col-12 lg:col-6">
                    <TextileSection
                        title="Jobwork Overlay"
                        summary="Keep processor and jobwork on the same tenant. The GST invoice remains common and jobber fields become optional."
                        items={JOBWORK_ITEMS}
                    />
                </div>
            )}

            <div className="col-12 lg:col-6">
                <TextileSection
                    title="Shared Books and Statements"
                    summary="Books and statements should stay shared across processor and jobwork movements instead of branching into separate tenant types."
                    items={SHARED_ITEMS}
                />
            </div>

            {(capabilities.inhouse || capabilities.design || capabilities.colorCosting) && (
                <div className="col-12 lg:col-6">
                    <TextileSection
                        title="Reserved Later Phases"
                        summary="These capabilities are noted now so full-textile tenants can be upgraded without changing the tenant model or document ownership later."
                        items={LATER_ITEMS.filter((item) => {
                            if (item.phase === 'Phase 2') return capabilities.inhouse;
                            if (item.title === 'Design Collection') return capabilities.design || capabilities.inhouse;
                            return capabilities.colorCosting;
                        })}
                    />
                </div>
            )}
        </div>
    );
}




