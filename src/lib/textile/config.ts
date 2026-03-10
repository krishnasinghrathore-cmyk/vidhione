import type { TextileCapabilities, TextilePresetKey } from '@/lib/auth/api';

export type TextileCapabilityKey = 'processor' | 'jobwork' | 'inhouse' | 'design' | 'colorCosting';

export type TextileCapabilityState = {
    processor: boolean;
    jobwork: boolean;
    inhouse: boolean;
    design: boolean;
    colorCosting: boolean;
};

export type TextilePresetOption = {
    label: string;
    value: TextilePresetKey;
    description: string;
};

export type TextileCapabilityDefinition = {
    key: TextileCapabilityKey;
    label: string;
    description: string;
    phase: 'Phase 1' | 'Phase 2' | 'Phase 3';
};

const EMPTY_TEXTILE_CAPABILITIES: TextileCapabilityState = {
    processor: false,
    jobwork: false,
    inhouse: false,
    design: false,
    colorCosting: false
};

const TEXTILE_PRESET_CAPABILITIES: Record<TextilePresetKey, TextileCapabilityState> = {
    textile_processing: {
        processor: true,
        jobwork: false,
        inhouse: false,
        design: false,
        colorCosting: false
    },
    textile_processing_jobwork: {
        processor: true,
        jobwork: true,
        inhouse: false,
        design: false,
        colorCosting: false
    },
    textile_full: {
        processor: true,
        jobwork: true,
        inhouse: true,
        design: false,
        colorCosting: false
    }
};

export const TEXTILE_DEFAULT_PRESET_KEY: TextilePresetKey = 'textile_processing';

export const TEXTILE_PRESET_OPTIONS: TextilePresetOption[] = [
    {
        label: 'Processor',
        value: 'textile_processing',
        description: 'Client fabric inward, challan, dispatch, and invoice flow.'
    },
    {
        label: 'Processor + Jobwork',
        value: 'textile_processing_jobwork',
        description: 'Adds third-party jobwork issue and outward handling on the same tenant.'
    },
    {
        label: 'Full Textile',
        value: 'textile_full',
        description: 'Keeps processor and jobwork active now and reserves in-house expansion for phase 2.'
    }
];

export const TEXTILE_CAPABILITY_DEFINITIONS: TextileCapabilityDefinition[] = [
    {
        key: 'processor',
        label: 'Processor',
        description: 'Client fabric inward through challan and GST invoice.',
        phase: 'Phase 1'
    },
    {
        key: 'jobwork',
        label: 'Jobwork',
        description: 'Issue fabric out for third-party work and invoice with jobber references.',
        phase: 'Phase 1'
    },
    {
        key: 'inhouse',
        label: 'In-house Production',
        description: 'Greige, process transfer, daily process, and production controls.',
        phase: 'Phase 2'
    },
    {
        key: 'design',
        label: 'Design Library',
        description: 'Design recipe, sample, challan, and multi-image design handling.',
        phase: 'Phase 3'
    },
    {
        key: 'colorCosting',
        label: 'Color Costing',
        description: 'Client-specific color costing workflows reserved for the final phase.',
        phase: 'Phase 3'
    }
];

const cloneTextileCapabilityState = (value: TextileCapabilityState): TextileCapabilityState => ({
    processor: value.processor,
    jobwork: value.jobwork,
    inhouse: value.inhouse,
    design: value.design,
    colorCosting: value.colorCosting
});

const mergeTextileCapabilities = (
    base: TextileCapabilityState,
    overrides: TextileCapabilities | null | undefined
): TextileCapabilityState => {
    const next = cloneTextileCapabilityState(base);
    if (!overrides) return next;
    if (typeof overrides.processor === 'boolean') next.processor = overrides.processor;
    if (typeof overrides.jobwork === 'boolean') next.jobwork = overrides.jobwork;
    if (typeof overrides.inhouse === 'boolean') next.inhouse = overrides.inhouse;
    if (typeof overrides.design === 'boolean') next.design = overrides.design;
    if (typeof overrides.colorCosting === 'boolean') next.colorCosting = overrides.colorCosting;
    return next;
};

export const isTextileIndustry = (industry: string | null | undefined) =>
    industry?.trim().toLowerCase() === 'textile';

export const defaultTextilePresetKey = (industry: string | null | undefined): TextilePresetKey | null =>
    isTextileIndustry(industry) ? TEXTILE_DEFAULT_PRESET_KEY : null;

export const getTextilePresetCapabilities = (presetKey: TextilePresetKey | null | undefined): TextileCapabilityState => {
    if (!presetKey) return cloneTextileCapabilityState(EMPTY_TEXTILE_CAPABILITIES);
    return cloneTextileCapabilityState(TEXTILE_PRESET_CAPABILITIES[presetKey]);
};

export const normalizeTextileCapabilities = (capabilities: TextileCapabilities): TextileCapabilityState =>
    mergeTextileCapabilities(EMPTY_TEXTILE_CAPABILITIES, capabilities);

export const resolveTextileCapabilities = (
    presetKey: TextilePresetKey | null | undefined,
    capabilities: TextileCapabilities
): TextileCapabilityState => mergeTextileCapabilities(getTextilePresetCapabilities(presetKey), capabilities);

export const getTextilePresetLabel = (presetKey: TextilePresetKey | null | undefined) =>
    TEXTILE_PRESET_OPTIONS.find((option) => option.value === presetKey)?.label ?? 'Custom Textile Mix';
