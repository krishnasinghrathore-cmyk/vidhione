'use client';
import React from 'react';
import { useAuth } from '@/lib/auth/context';
import { defaultTextilePresetKey, isTextileIndustry, resolveTextileCapabilities } from '@/lib/textile/config';
import { TextileWorkspaceView } from './TextileWorkspaceView';

export default function TextileAppPage() {
    const { tenantIndustryKey, tenantSettings } = useAuth();
    const textileTenant = isTextileIndustry(tenantIndustryKey);
    const presetKey = textileTenant
        ? tenantSettings?.textilePresetKey ?? defaultTextilePresetKey(tenantIndustryKey)
        : null;
    const capabilities = resolveTextileCapabilities(presetKey, tenantSettings?.textileCapabilities ?? null);

    return (
        <TextileWorkspaceView
            isTextileTenant={textileTenant}
            salesProfileKey={tenantSettings?.salesInvoiceProfileKey ?? null}
            presetKey={presetKey}
            capabilities={capabilities}
        />
    );
}
