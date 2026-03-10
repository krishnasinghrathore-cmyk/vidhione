import React from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import type { TextilePresetKey } from '@/lib/auth/api';
import {
    TEXTILE_CAPABILITY_DEFINITIONS,
    TEXTILE_PRESET_OPTIONS,
    isTextileIndustry,
    type TextileCapabilityKey,
    type TextileCapabilityState
} from '@/lib/textile/config';

type TextileTenantSettingsPanelProps = {
    industry: string | null;
    presetKey: TextilePresetKey | null;
    capabilities: TextileCapabilityState;
    onPresetChange: (presetKey: TextilePresetKey | null) => void;
    onCapabilityChange: (key: TextileCapabilityKey, value: boolean) => void;
};

export function TextileTenantSettingsPanel({
    industry,
    presetKey,
    capabilities,
    onPresetChange,
    onCapabilityChange
}: TextileTenantSettingsPanelProps) {
    if (!isTextileIndustry(industry)) return null;

    return (
        <div className="border-1 border-200 border-round p-3 flex flex-column gap-3">
            <div className="flex flex-column gap-1">
                <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                    <label className="text-700 font-medium">Textile Capability Preset</label>
                    <Tag value="Additive" severity="info" />
                </div>
                <small className="text-500">
                    One textile tenant can run processor and jobwork together. In-house, design, and color costing stay gated for later phases.
                </small>
            </div>

            <AppDropdown
                value={presetKey}
                options={TEXTILE_PRESET_OPTIONS}
                optionLabel="label"
                optionValue="value"
                onChange={(event) => onPresetChange((event.value as TextilePresetKey | null) ?? null)}
                placeholder="Select textile preset"
                className="w-full"
            />

            <div className="grid m-0">
                {TEXTILE_CAPABILITY_DEFINITIONS.map((definition) => (
                    <div key={definition.key} className="col-12 md:col-6 p-0 md:pr-2 mt-2">
                        <div className="border-1 border-200 border-round p-3 h-full flex flex-column gap-2">
                            <div className="flex align-items-start justify-content-between gap-2">
                                <div>
                                    <div className="text-700 font-medium">{definition.label}</div>
                                    <small className="text-500">{definition.description}</small>
                                </div>
                                <Tag value={definition.phase} severity={definition.phase === 'Phase 1' ? 'success' : 'warning'} />
                            </div>
                            <div className="flex justify-content-end">
                                <InputSwitch
                                    checked={capabilities[definition.key]}
                                    onChange={(event) => onCapabilityChange(definition.key, Boolean(event.value))}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
