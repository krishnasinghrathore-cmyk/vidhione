'use client';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { GST_MENU_MAP } from '@/config/gstMenu';

export default function GstSectionPage() {
    const { section } = useParams();
    const entry = section ? GST_MENU_MAP[section] : undefined;
    const title = entry?.label ?? 'GST';
    const description = entry
        ? `${entry.groupLabel} - ${entry.label} from the legacy agency app will be implemented here.`
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
