'use client';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { GST_MENU_MAP } from '@/config/gstMenu';
import { Gstr1Report } from '../reports/Gstr1Report';
import { Gstr2Report } from '../reports/Gstr2Report';
import { Gstr3bReport } from '../reports/Gstr3bReport';

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
    gstr1: Gstr1Report,
    gstr2: Gstr2Report,
    gstr3b: Gstr3bReport
};

export default function GstSectionPage() {
    const { section } = useParams();
    const entry = section ? GST_MENU_MAP[section] : undefined;
    const SectionComponent = section ? SECTION_COMPONENTS[section] : undefined;

    if (SectionComponent) return <SectionComponent />;

    const title = entry?.label ?? 'GST';
    const description = entry
        ? `${entry.groupLabel} - ${entry.label} standardization is pending. This section will be migrated next.`
        : 'GST, e-Invoice, and e-Way bill workflows will be implemented here.';

    return (
        <div className="card">
            <h2 className="mb-2">{title}</h2>
            <p className="text-600">{description}</p>
            {entry && (
                <div className="mt-3">
                    <Link to="/apps/gst">Back to GST</Link>
                </div>
            )}
        </div>
    );
}
