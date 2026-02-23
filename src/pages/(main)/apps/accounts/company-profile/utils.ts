import type {
    CompanyProfileCompanyRow,
    CompanyProfileCountryOption,
    CompanyProfileCustomPair,
    CompanyProfileFieldDefinition,
    CompanyProfileFieldDefinitionGroup,
    CompanyProfileFormState
} from './types';

export const DEFAULT_COMPANY_PROFILE_FORM: CompanyProfileFormState = {
    name: '',
    alias: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    cityId: null,
    districtId: null,
    stateId: null,
    countryId: null,
    postalCode: '',
    email: '',
    website: '',
    officePhone: '',
    residencePhone: '',
    mobileNumber: '',
    faxNumber: '',
    serviceTaxNumber: '',
    panNumber: '',
    cstNumber: '',
    vatNumber: '',
    tinNumber: '',
    financialYearStart: '',
    financialYearEnd: '',
    bankName: '',
    branchName: '',
    accountNumber: '',
    ifscCode: '',
    signImagePath: '',
    rtgsNumber: '',
    pfNumber: '',
    esiNumber: '',
    extraFields: {},
    customPairs: []
};

const toText = (value: string | null | undefined) => value ?? '';

export const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export const parseJsonValue = (value?: string | null): unknown | null => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

export const normalizeExtraFields = (value?: unknown | null): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
};

export const parseExtraDateValue = (value: unknown): Date | null => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

export const isEmptyExtraValue = (value: unknown) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
};

export const createCustomPairId = () => `kv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const serializeCustomPairValue = (value: unknown) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return '';
    }
};

export const parseCustomPairValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
        return JSON.parse(trimmed);
    } catch {
        return trimmed;
    }
};

export const parseFieldOptions = (raw?: string | null) => {
    if (!raw) return [] as { label: string; value: unknown }[];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((option) => {
            if (typeof option === 'string') {
                return { label: option, value: option };
            }
            if (option && typeof option === 'object') {
                const item = option as Record<string, unknown>;
                const label = item.label ?? item.value ?? '';
                const value = item.value ?? item.label ?? '';
                return { label: String(label), value };
            }
            return { label: String(option), value: option };
        });
    } catch {
        return [];
    }
};

const buildDefinitionKeySet = (definitions: CompanyProfileFieldDefinition[]) =>
    new Set(definitions.map((definition) => definition.key.trim()).filter(Boolean));

const buildDefinitionKeyLookup = (definitions: CompanyProfileFieldDefinition[]) =>
    new Set(definitions.map((definition) => definition.key.trim().toLowerCase()).filter(Boolean));

const dedupeCustomPairs = (pairs: CompanyProfileCustomPair[]) => {
    const seen = new Set<string>();
    const deduped: CompanyProfileCustomPair[] = [];
    pairs.forEach((pair) => {
        const normalized = pair.key.trim().toLowerCase();
        if (!normalized) {
            deduped.push(pair);
            return;
        }
        if (seen.has(normalized)) return;
        seen.add(normalized);
        deduped.push(pair);
    });
    return deduped;
};

export const mapCompanyRowToForm = (
    row: CompanyProfileCompanyRow,
    definitions: CompanyProfileFieldDefinition[]
): CompanyProfileFormState => {
    const parsedExtra = normalizeExtraFields(parseJsonValue(row.extraFields));
    const definitionKeySet = buildDefinitionKeySet(definitions);

    const extraFields: Record<string, unknown> = {};
    const customPairs: CompanyProfileCustomPair[] = [];

    Object.entries(parsedExtra).forEach(([key, value]) => {
        if (definitionKeySet.has(key)) {
            extraFields[key] = value;
            return;
        }
        customPairs.push({ id: createCustomPairId(), key, value: serializeCustomPairValue(value) });
    });

    definitions.forEach((definition) => {
        if (extraFields[definition.key] !== undefined) return;
        if (!definition.defaultValue) return;
        const parsedDefault = parseJsonValue(definition.defaultValue);
        if (parsedDefault === null) return;
        extraFields[definition.key] = parsedDefault;
    });

    return {
        name: toText(row.name),
        alias: toText(row.alias),
        addressLine1: toText(row.addressLine1),
        addressLine2: toText(row.addressLine2),
        addressLine3: toText(row.addressLine3),
        cityId: row.cityId ?? null,
        districtId: row.districtId ?? null,
        stateId: row.stateId ?? null,
        countryId: row.countryId ?? null,
        postalCode: toText(row.postalCode),
        email: toText(row.email),
        website: toText(row.website),
        officePhone: toText(row.officePhone),
        residencePhone: toText(row.residencePhone),
        mobileNumber: toText(row.mobileNumber),
        faxNumber: toText(row.faxNumber),
        serviceTaxNumber: toText(row.serviceTaxNumber),
        panNumber: toText(row.panNumber),
        cstNumber: toText(row.cstNumber),
        vatNumber: toText(row.vatNumber),
        tinNumber: toText(row.tinNumber),
        financialYearStart: toText(row.financialYearStart),
        financialYearEnd: toText(row.financialYearEnd),
        bankName: toText(row.bankName),
        branchName: toText(row.branchName),
        accountNumber: toText(row.accountNumber),
        ifscCode: toText(row.ifscCode),
        signImagePath: toText(row.signImagePath),
        rtgsNumber: toText(row.rtgsNumber),
        pfNumber: toText(row.pfNumber),
        esiNumber: toText(row.esiNumber),
        extraFields,
        customPairs: dedupeCustomPairs(customPairs)
    };
};

export const reconcileFormWithFieldDefinitions = (
    form: CompanyProfileFormState,
    definitions: CompanyProfileFieldDefinition[]
): CompanyProfileFormState => {
    const definitionKeySet = buildDefinitionKeySet(definitions);
    const definitionKeyLookup = buildDefinitionKeyLookup(definitions);

    const nextExtraFields: Record<string, unknown> = {};
    Object.entries(normalizeExtraFields(form.extraFields)).forEach(([key, value]) => {
        if (!definitionKeySet.has(key)) return;
        nextExtraFields[key] = value;
    });

    const nextCustomPairs: CompanyProfileCustomPair[] = [];

    form.customPairs.forEach((pair) => {
        const trimmedKey = pair.key.trim();
        if (!trimmedKey) {
            nextCustomPairs.push(pair);
            return;
        }
        const normalized = trimmedKey.toLowerCase();
        if (definitionKeyLookup.has(normalized)) {
            const canonicalKey = definitions.find((definition) => definition.key.trim().toLowerCase() === normalized)?.key;
            if (canonicalKey && nextExtraFields[canonicalKey] === undefined && pair.value.trim()) {
                nextExtraFields[canonicalKey] = parseCustomPairValue(pair.value);
            }
            return;
        }
        nextCustomPairs.push({ ...pair, key: trimmedKey });
    });

    definitions.forEach((definition) => {
        if (nextExtraFields[definition.key] !== undefined) return;
        if (!definition.defaultValue) return;
        const parsedDefault = parseJsonValue(definition.defaultValue);
        if (parsedDefault === null) return;
        nextExtraFields[definition.key] = parsedDefault;
    });

    const dedupedPairs = dedupeCustomPairs(nextCustomPairs);

    const extraFieldsChanged =
        JSON.stringify(form.extraFields) !== JSON.stringify(nextExtraFields);
    const pairsChanged = JSON.stringify(form.customPairs) !== JSON.stringify(dedupedPairs);

    if (!extraFieldsChanged && !pairsChanged) return form;

    return {
        ...form,
        extraFields: nextExtraFields,
        customPairs: dedupedPairs
    };
};

export const buildExtraFieldsPayload = (form: CompanyProfileFormState) => {
    const payload: Record<string, unknown> = {
        ...normalizeExtraFields(form.extraFields)
    };

    form.customPairs.forEach((pair) => {
        const key = pair.key.trim();
        if (!key) return;
        payload[key] = parseCustomPairValue(pair.value);
    });

    return JSON.stringify(payload);
};

export const pickActiveCompany = (
    rows: CompanyProfileCompanyRow[],
    companyContext: { companyName?: string | null; companyAlias?: string | null } | null
): CompanyProfileCompanyRow | null => {
    if (!rows.length) return null;

    const contextName = companyContext?.companyName?.trim().toLowerCase();
    const contextAlias = companyContext?.companyAlias?.trim().toLowerCase();

    if (contextName || contextAlias) {
        const matched = rows.find((row) => {
            const rowName = row.name?.trim().toLowerCase();
            const rowAlias = row.alias?.trim().toLowerCase();
            return (
                (contextName && rowName === contextName) ||
                (contextAlias && rowAlias === contextAlias)
            );
        });
        if (matched) return matched;
    }

    return rows[0] ?? null;
};

export const groupFieldDefinitions = (
    definitions: CompanyProfileFieldDefinition[]
): CompanyProfileFieldDefinitionGroup[] => {
    const groups = new Map<string, CompanyProfileFieldDefinition[]>();
    definitions.forEach((definition) => {
        const groupName = definition.groupName?.trim() || 'Additional';
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName)?.push(definition);
    });

    return Array.from(groups.entries()).map(([groupName, groupDefinitions]) => ({
        groupName,
        definitions: groupDefinitions.sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
    }));
};

export const resolveSelectedCountryCode = (
    countryId: number | null,
    countries: CompanyProfileCountryOption[]
) => {
    if (!countryId) return null;
    const country = countries.find((item) => item.countryId === countryId);
    return country?.iso2 ?? null;
};
