export type SalesInvoiceProfileKey = string | null;
const TEXTILE_SALES_PROFILE_KEY = 'textile_sales_gst_v1';
const TEXTILE_SALES_PROFILE_KEY_COMPAT = 'textile_sales_gst2_v1';

const isTextileSalesProfileKey = (salesProfileKey: SalesInvoiceProfileKey) =>
    salesProfileKey === TEXTILE_SALES_PROFILE_KEY || salesProfileKey === TEXTILE_SALES_PROFILE_KEY_COMPAT;

export type InvoiceSalesmanMode = 'none' | 'single' | 'dual';

export type SalesInvoiceLinkedActionFlags = {
    estimate: boolean;
    creditNote: boolean;
    debitNote: boolean;
};

export type SalesInvoiceProfilePolicy = {
    profile: {
        isGstProfile: boolean;
        isTextileProfile: boolean;
        isRestaurantProfile: boolean;
        isSplitProfile: boolean;
    };
    pricing: {
        taxLocked: boolean;
        showTaxColumns: boolean;
        showSellingRate: boolean;
    };
    header: {
        salesmanMode: InvoiceSalesmanMode;
        showSchemeToggle: boolean;
        showBizomInvoiceField: boolean;
        showInterStateToggle: boolean;
    };
    lineEntry: {
        showTypeDetails: boolean;
        showAdditionalTaxation: boolean;
    };
    transport: {
        enabled: boolean;
        defaultApplied: boolean;
        showTransporterField: boolean;
        requireTransporterWhenApplied: boolean;
    };
    validation: {
        dryCheckRequired: boolean;
        strictPostingParity: boolean;
    };
    linkedActions: SalesInvoiceLinkedActionFlags;
};

export type SalesInvoiceProfileRuntimeOptions = {
    showTaxColumns?: boolean;
    showTypeDetails?: boolean;
    showAdditionalTaxation?: boolean;
    showSchemeToggle?: boolean;
    showBizomInvoiceField?: boolean;
    showInterStateToggle?: boolean;
    transportEnabled?: boolean;
    transportDefaultApplied?: boolean;
    showTransporterField?: boolean;
    requireTransporterWhenApplied?: boolean;
    dryCheckRequired?: boolean;
    strictPostingParity?: boolean;
    linkedEstimateEnabled?: boolean;
    linkedCreditNoteEnabled?: boolean;
    linkedDebitNoteEnabled?: boolean;
    salesmanMode?: InvoiceSalesmanMode | null;
} | null;

type SalesInvoiceProfilePolicyOverrides = {
    pricing?: Partial<SalesInvoiceProfilePolicy['pricing']>;
    header?: Partial<SalesInvoiceProfilePolicy['header']>;
    lineEntry?: Partial<SalesInvoiceProfilePolicy['lineEntry']>;
    transport?: Partial<SalesInvoiceProfilePolicy['transport']>;
    validation?: Partial<SalesInvoiceProfilePolicy['validation']>;
    linkedActions?: Partial<SalesInvoiceProfilePolicy['linkedActions']>;
};

type SalesProfileIdentityFlags = {
    isGstProfile: boolean;
    isTextileProfile: boolean;
    isRestaurantProfile: boolean;
    isSplitProfile: boolean;
};

const resolveSalesProfileIdentityFlags = (salesProfileKey: SalesInvoiceProfileKey): SalesProfileIdentityFlags => {
    const isGstProfile =
        salesProfileKey === 'agency_sales_gst_v1' ||
        isTextileSalesProfileKey(salesProfileKey) ||
        salesProfileKey === 'retail_sales_gst_v1';
    const isTextileProfile = isTextileSalesProfileKey(salesProfileKey);
    const isRestaurantProfile = salesProfileKey === 'restaurant_sales_single_v1' || salesProfileKey === 'restaurant_sales_split_v1';
    const isSplitProfile = salesProfileKey === 'restaurant_sales_split_v1';
    return { isGstProfile, isTextileProfile, isRestaurantProfile, isSplitProfile };
};

const resolveSalesmanMode = (salesProfileKey: SalesInvoiceProfileKey, isGstProfile: boolean): InvoiceSalesmanMode => {
    if (!isGstProfile) return 'none';
    if (salesProfileKey === 'retail_sales_gst_v1') return 'dual';
    return 'single';
};

const applyPolicyOverride = (basePolicy: SalesInvoiceProfilePolicy, override: SalesInvoiceProfilePolicyOverrides | null | undefined) => {
    if (!override) return basePolicy;
    return {
        ...basePolicy,
        pricing: {
            ...basePolicy.pricing,
            ...override.pricing
        },
        header: {
            ...basePolicy.header,
            ...override.header
        },
        lineEntry: {
            ...basePolicy.lineEntry,
            ...override.lineEntry
        },
        transport: {
            ...basePolicy.transport,
            ...override.transport
        },
        validation: {
            ...basePolicy.validation,
            ...override.validation
        },
        linkedActions: {
            ...basePolicy.linkedActions,
            ...override.linkedActions
        }
    };
};

const toRuntimePolicyOverride = (
    options: SalesInvoiceProfileRuntimeOptions
): SalesInvoiceProfilePolicyOverrides | null => {
    if (!options) return null;

    const headerOverride: SalesInvoiceProfilePolicyOverrides['header'] = {};
    const lineEntryOverride: SalesInvoiceProfilePolicyOverrides['lineEntry'] = {};
    const pricingOverride: SalesInvoiceProfilePolicyOverrides['pricing'] = {};
    const transportOverride: SalesInvoiceProfilePolicyOverrides['transport'] = {};
    const validationOverride: SalesInvoiceProfilePolicyOverrides['validation'] = {};
    const linkedActionsOverride: SalesInvoiceProfilePolicyOverrides['linkedActions'] = {};
    let changed = false;

    if (typeof options.showTaxColumns === 'boolean') {
        pricingOverride.showTaxColumns = options.showTaxColumns;
        changed = true;
    }
    if (typeof options.showTypeDetails === 'boolean') {
        lineEntryOverride.showTypeDetails = options.showTypeDetails;
        changed = true;
    }
    if (typeof options.showAdditionalTaxation === 'boolean') {
        lineEntryOverride.showAdditionalTaxation = options.showAdditionalTaxation;
        changed = true;
    }
    if (typeof options.showSchemeToggle === 'boolean') {
        headerOverride.showSchemeToggle = options.showSchemeToggle;
        changed = true;
    }
    if (typeof options.showBizomInvoiceField === 'boolean') {
        headerOverride.showBizomInvoiceField = options.showBizomInvoiceField;
        changed = true;
    }
    if (typeof options.showInterStateToggle === 'boolean') {
        headerOverride.showInterStateToggle = options.showInterStateToggle;
        changed = true;
    }
    if (typeof options.transportEnabled === 'boolean') {
        transportOverride.enabled = options.transportEnabled;
        changed = true;
    }
    if (typeof options.transportDefaultApplied === 'boolean') {
        transportOverride.defaultApplied = options.transportDefaultApplied;
        changed = true;
    }
    if (typeof options.showTransporterField === 'boolean') {
        transportOverride.showTransporterField = options.showTransporterField;
        changed = true;
    }
    if (typeof options.requireTransporterWhenApplied === 'boolean') {
        transportOverride.requireTransporterWhenApplied = options.requireTransporterWhenApplied;
        changed = true;
    }
    if (typeof options.dryCheckRequired === 'boolean') {
        validationOverride.dryCheckRequired = options.dryCheckRequired;
        changed = true;
    }
    if (typeof options.strictPostingParity === 'boolean') {
        validationOverride.strictPostingParity = options.strictPostingParity;
        changed = true;
    }
    if (typeof options.linkedEstimateEnabled === 'boolean') {
        linkedActionsOverride.estimate = options.linkedEstimateEnabled;
        changed = true;
    }
    if (typeof options.linkedCreditNoteEnabled === 'boolean') {
        linkedActionsOverride.creditNote = options.linkedCreditNoteEnabled;
        changed = true;
    }
    if (typeof options.linkedDebitNoteEnabled === 'boolean') {
        linkedActionsOverride.debitNote = options.linkedDebitNoteEnabled;
        changed = true;
    }
    if (options.salesmanMode === 'none' || options.salesmanMode === 'single' || options.salesmanMode === 'dual') {
        headerOverride.salesmanMode = options.salesmanMode;
        changed = true;
    }

    if (!changed) return null;
    return {
        pricing: Object.keys(pricingOverride).length > 0 ? pricingOverride : undefined,
        lineEntry: Object.keys(lineEntryOverride).length > 0 ? lineEntryOverride : undefined,
        header: Object.keys(headerOverride).length > 0 ? headerOverride : undefined,
        transport: Object.keys(transportOverride).length > 0 ? transportOverride : undefined,
        validation: Object.keys(validationOverride).length > 0 ? validationOverride : undefined,
        linkedActions: Object.keys(linkedActionsOverride).length > 0 ? linkedActionsOverride : undefined
    };
};

const SALES_INVOICE_PROFILE_POLICY_OVERRIDES: Record<string, SalesInvoiceProfilePolicyOverrides> = {
    agency_sales_gst_v1: {
        transport: {
            enabled: true,
            defaultApplied: false,
            showTransporterField: true,
            requireTransporterWhenApplied: true
        },
        header: {
            salesmanMode: 'single'
        }
    },
    [TEXTILE_SALES_PROFILE_KEY]: {
        transport: {
            enabled: true,
            defaultApplied: true,
            showTransporterField: true,
            requireTransporterWhenApplied: true
        },
        header: {
            salesmanMode: 'single'
        }
    },
    [TEXTILE_SALES_PROFILE_KEY_COMPAT]: {
        transport: {
            enabled: true,
            defaultApplied: true,
            showTransporterField: true,
            requireTransporterWhenApplied: true
        },
        header: {
            salesmanMode: 'single'
        }
    },
    retail_sales_gst_v1: {
        transport: {
            enabled: true,
            defaultApplied: false,
            showTransporterField: true,
            requireTransporterWhenApplied: true
        },
        header: {
            salesmanMode: 'dual'
        }
    },
    media_sales_no_tax_v1: {
        pricing: {
            taxLocked: true,
            showTaxColumns: false
        },
        transport: {
            enabled: false,
            defaultApplied: false,
            showTransporterField: false,
            requireTransporterWhenApplied: false
        },
        header: {
            salesmanMode: 'none',
            showInterStateToggle: false
        }
    },
    restaurant_sales_single_v1: {
        pricing: {
            showTaxColumns: false
        },
        lineEntry: {
            showTypeDetails: false,
            showAdditionalTaxation: false
        },
        transport: {
            enabled: false,
            defaultApplied: false,
            showTransporterField: false,
            requireTransporterWhenApplied: false
        },
        header: {
            salesmanMode: 'none',
            showSchemeToggle: false,
            showBizomInvoiceField: false,
            showInterStateToggle: false
        },
        linkedActions: {
            estimate: false,
            creditNote: false,
            debitNote: false
        }
    },
    restaurant_sales_split_v1: {
        pricing: {
            showTaxColumns: false
        },
        lineEntry: {
            showTypeDetails: false,
            showAdditionalTaxation: false
        },
        transport: {
            enabled: false,
            defaultApplied: false,
            showTransporterField: false,
            requireTransporterWhenApplied: false
        },
        header: {
            salesmanMode: 'none',
            showSchemeToggle: false,
            showBizomInvoiceField: false,
            showInterStateToggle: false
        },
        linkedActions: {
            estimate: false,
            creditNote: false,
            debitNote: false
        }
    }
};

export const getSalesInvoiceProfilePolicy = (
    salesProfileKey: SalesInvoiceProfileKey,
    runtimeOptions?: SalesInvoiceProfileRuntimeOptions
): SalesInvoiceProfilePolicy => {
    const profile = resolveSalesProfileIdentityFlags(salesProfileKey);
    const taxLocked = salesProfileKey === 'media_sales_no_tax_v1';

    const basePolicy: SalesInvoiceProfilePolicy = {
        profile,
        pricing: {
            taxLocked,
            showTaxColumns: !taxLocked,
            showSellingRate: profile.isTextileProfile
        },
        header: {
            salesmanMode: resolveSalesmanMode(salesProfileKey, profile.isGstProfile),
            showSchemeToggle: true,
            showBizomInvoiceField: true,
            showInterStateToggle: true
        },
        lineEntry: {
            showTypeDetails: true,
            showAdditionalTaxation: true
        },
        transport: {
            enabled: profile.isGstProfile,
            defaultApplied: profile.isTextileProfile,
            showTransporterField: profile.isGstProfile,
            requireTransporterWhenApplied: profile.isGstProfile
        },
        validation: {
            dryCheckRequired: true,
            strictPostingParity: true
        },
        linkedActions: {
            estimate: true,
            creditNote: true,
            debitNote: true
        }
    };

    const overrideKey = salesProfileKey ?? '';
    const staticOverride = SALES_INVOICE_PROFILE_POLICY_OVERRIDES[overrideKey];
    const policyWithStaticOverride = applyPolicyOverride(basePolicy, staticOverride);
    const runtimeOverride = toRuntimePolicyOverride(runtimeOptions ?? null);
    return applyPolicyOverride(policyWithStaticOverride, runtimeOverride);
};

export const getSalesProfileLabel = (salesProfileKey: SalesInvoiceProfileKey) => {
    if (!salesProfileKey) return 'Not set';
    if (salesProfileKey === 'agency_sales_gst_v1') return 'Agency • GST Invoice';
    if (isTextileSalesProfileKey(salesProfileKey)) return 'Textile • GST Invoice';
    if (salesProfileKey === 'retail_sales_gst_v1') return 'Retail • GST Invoice';
    if (salesProfileKey === 'media_sales_no_tax_v1') return 'Media • No Tax Invoice';
    if (salesProfileKey === 'restaurant_sales_single_v1') return 'Restaurant • Single Invoice';
    if (salesProfileKey === 'restaurant_sales_split_v1') return 'Restaurant • Split Invoice';
    return salesProfileKey;
};

export const getSalesProfileFlags = (salesProfileKey: SalesInvoiceProfileKey) => {
    const policy = getSalesInvoiceProfilePolicy(salesProfileKey);
    const {
        profile: { isGstProfile, isTextileProfile, isRestaurantProfile, isSplitProfile },
        pricing: { taxLocked, showTaxColumns, showSellingRate },
        header: { salesmanMode },
        transport: { enabled, defaultApplied, showTransporterField, requireTransporterWhenApplied },
        validation: { dryCheckRequired, strictPostingParity }
    } = policy;

    return {
        isGstProfile,
        isTextileProfile,
        isRestaurantProfile,
        isSplitProfile,
        taxLocked,
        showTax: showTaxColumns,
        showSellingRate,
        transportFeatureAvailable: enabled,
        transportFeatureDefaultOn: defaultApplied,
        showTransporterField,
        requireTransporterWhenApplied,
        dryCheckRequired,
        strictPostingParity,
        salesmanFeatureAvailable: salesmanMode !== 'none',
        secondarySalesmanFeatureAvailable: salesmanMode === 'dual'
    };
};
