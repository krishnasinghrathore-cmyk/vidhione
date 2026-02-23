import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useAuth } from '@/lib/auth/context';
import { apolloClient } from '@/lib/apolloClient';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate } from '@/lib/reportDateValidation';
import {
    COMPANY_PROFILE_COMPANIES,
    COMPANY_PROFILE_CREATE_COMPANY,
    COMPANY_PROFILE_FIELD_DEFINITIONS,
    COMPANY_PROFILE_GEO_CITIES,
    COMPANY_PROFILE_GEO_COUNTRIES,
    COMPANY_PROFILE_GEO_DISTRICTS,
    COMPANY_PROFILE_GEO_STATES,
    COMPANY_PROFILE_UPDATE_COMPANY
} from './graphql';
import type {
    CompanyProfileCityOption,
    CompanyProfileCompanyRow,
    CompanyProfileCountryOption,
    CompanyProfileDistrictOption,
    CompanyProfileFieldDefinition,
    CompanyProfileFieldDefinitionGroup,
    CompanyProfileFormErrors,
    CompanyProfileFormState,
    CompanyProfileStateOption
} from './types';
import {
    DEFAULT_COMPANY_PROFILE_FORM,
    buildExtraFieldsPayload,
    groupFieldDefinitions,
    isEmptyExtraValue,
    mapCompanyRowToForm,
    normalizeExtraFields,
    parseExtraDateValue,
    pickActiveCompany,
    reconcileFormWithFieldDefinitions,
    resolveSelectedCountryCode,
    toOptionalText
} from './utils';
import {
    collectCustomPairErrors,
    companyProfileFormSchema
} from './validation';

type SaveCompanyVariables = {
    name: string;
    alias: string;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    cityId: number | null;
    districtId: number | null;
    stateId: number | null;
    countryId: number | null;
    postalCode: string | null;
    email: string | null;
    website: string | null;
    officePhone: string | null;
    residencePhone: string | null;
    mobileNumber: string | null;
    faxNumber: string | null;
    serviceTaxNumber: string | null;
    panNumber: string | null;
    cstNumber: string | null;
    vatNumber: string | null;
    tinNumber: string | null;
    financialYearStart: string | null;
    financialYearEnd: string | null;
    bankName: string | null;
    branchName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    signImagePath: string | null;
    rtgsNumber: string | null;
    pfNumber: string | null;
    esiNumber: string | null;
    extraFields: string;
};

const buildSaveVariables = (form: CompanyProfileFormState): SaveCompanyVariables => ({
    name: form.name.trim(),
    alias: form.alias.trim(),
    addressLine1: toOptionalText(form.addressLine1),
    addressLine2: toOptionalText(form.addressLine2),
    addressLine3: toOptionalText(form.addressLine3),
    cityId: form.cityId,
    districtId: form.districtId,
    stateId: form.stateId,
    countryId: form.countryId,
    postalCode: toOptionalText(form.postalCode),
    email: toOptionalText(form.email),
    website: toOptionalText(form.website),
    officePhone: toOptionalText(form.officePhone),
    residencePhone: toOptionalText(form.residencePhone),
    mobileNumber: toOptionalText(form.mobileNumber),
    faxNumber: toOptionalText(form.faxNumber),
    serviceTaxNumber: toOptionalText(form.serviceTaxNumber),
    panNumber: toOptionalText(form.panNumber),
    cstNumber: toOptionalText(form.cstNumber),
    vatNumber: toOptionalText(form.vatNumber),
    tinNumber: toOptionalText(form.tinNumber),
    financialYearStart: toOptionalText(form.financialYearStart),
    financialYearEnd: toOptionalText(form.financialYearEnd),
    bankName: toOptionalText(form.bankName),
    branchName: toOptionalText(form.branchName),
    accountNumber: toOptionalText(form.accountNumber),
    ifscCode: toOptionalText(form.ifscCode),
    signImagePath: toOptionalText(form.signImagePath),
    rtgsNumber: toOptionalText(form.rtgsNumber),
    pfNumber: toOptionalText(form.pfNumber),
    esiNumber: toOptionalText(form.esiNumber),
    extraFields: buildExtraFieldsPayload(form)
});

const collectBaseFormErrors = (form: CompanyProfileFormState): CompanyProfileFormErrors => {
    const errors: CompanyProfileFormErrors = {};
    const parsed = companyProfileFormSchema.safeParse(form);
    if (parsed.success) return errors;

    parsed.error.issues.forEach((issue) => {
        if (!issue.path[0]) return;
        errors[String(issue.path[0])] = issue.message;
    });

    return errors;
};

const collectDynamicFieldErrors = (
    form: CompanyProfileFormState,
    definitions: CompanyProfileFieldDefinition[],
    fiscalRange: ReturnType<typeof resolveFiscalRange>
): CompanyProfileFormErrors => {
    const errors: CompanyProfileFormErrors = {};
    const dynamicValues = normalizeExtraFields(form.extraFields);

    definitions.forEach((definition) => {
        const value = dynamicValues[definition.key];
        if (definition.required && isEmptyExtraValue(value)) {
            errors[`extraFields.${definition.key}`] = `${definition.label} is required`;
        }

        if (definition.fieldType !== 'date') return;
        if (isEmptyExtraValue(value)) return;

        const parsedDate = parseExtraDateValue(value);
        if (!parsedDate) {
            errors[`extraFields.${definition.key}`] = `${definition.label} must be a valid date`;
            return;
        }

        const validation = validateSingleDate({ date: parsedDate }, fiscalRange);
        if (validation.ok) return;
        errors[`extraFields.${definition.key}`] =
            validation.errors.date ?? `${definition.label} must be within the financial year`;
    });

    return errors;
};

export const useCompanyProfileForm = () => {
    const { companyContext, refresh } = useAuth();

    const [form, setForm] = useState<CompanyProfileFormState>(DEFAULT_COMPANY_PROFILE_FORM);
    const [snapshot, setSnapshot] = useState<CompanyProfileFormState>(DEFAULT_COMPANY_PROFILE_FORM);
    const [formErrors, setFormErrors] = useState<CompanyProfileFormErrors>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [geoImportVisible, setGeoImportVisible] = useState(false);
    const [hydratedCompanyId, setHydratedCompanyId] = useState<number | null>(null);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const {
        data: companiesData,
        loading: loadingCompanies,
        error: companiesError,
        refetch: refetchCompanies
    } = useQuery(COMPANY_PROFILE_COMPANIES, {
        client: apolloClient,
        variables: { search: null, limit: 2000 },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const companies: CompanyProfileCompanyRow[] = useMemo(() => {
        return (companiesData?.companies ?? []) as CompanyProfileCompanyRow[];
    }, [companiesData]);

    const activeCompany = useMemo(() => {
        return pickActiveCompany(companies, {
            companyName: companyContext?.companyName ?? null,
            companyAlias: companyContext?.companyAlias ?? null
        });
    }, [companies, companyContext?.companyAlias, companyContext?.companyName]);

    const { data: countriesData } = useQuery(COMPANY_PROFILE_GEO_COUNTRIES, {
        client: apolloClient,
        variables: { search: null, limit: 2000 }
    });
    const countries: CompanyProfileCountryOption[] = useMemo(() => {
        return (countriesData?.geoCountries ?? []) as CompanyProfileCountryOption[];
    }, [countriesData]);

    const selectedCountryId = form.countryId ?? activeCompany?.countryId ?? null;
    const selectedCountryCode = useMemo(() => {
        return resolveSelectedCountryCode(selectedCountryId, countries);
    }, [selectedCountryId, countries]);

    const { data: statesData } = useQuery(COMPANY_PROFILE_GEO_STATES, {
        client: apolloClient,
        variables: { countryId: form.countryId ?? null, search: null, limit: 2000 },
        skip: !form.countryId
    });
    const states: CompanyProfileStateOption[] = useMemo(() => {
        return (statesData?.geoStates ?? []) as CompanyProfileStateOption[];
    }, [statesData]);

    const { data: districtsData } = useQuery(COMPANY_PROFILE_GEO_DISTRICTS, {
        client: apolloClient,
        variables: { stateId: form.stateId ?? null, search: null, limit: 2000 },
        skip: !form.stateId
    });
    const districts: CompanyProfileDistrictOption[] = useMemo(() => {
        return (districtsData?.geoDistricts ?? []) as CompanyProfileDistrictOption[];
    }, [districtsData]);

    const { data: citiesData } = useQuery(COMPANY_PROFILE_GEO_CITIES, {
        client: apolloClient,
        variables: {
            districtId: null,
            stateId: null,
            search: null,
            limit: 2000
        }
    });
    const cities: CompanyProfileCityOption[] = useMemo(() => {
        return (citiesData?.geoCities ?? []) as CompanyProfileCityOption[];
    }, [citiesData]);

    const filteredCities = useMemo(() => {
        return cities.filter((city) => {
            if (form.districtId && city.districtId !== form.districtId) return false;
            if (form.stateId && city.stateId !== form.stateId) return false;
            return true;
        });
    }, [cities, form.districtId, form.stateId]);

    const { data: definitionData } = useQuery(COMPANY_PROFILE_FIELD_DEFINITIONS, {
        client: apolloClient,
        variables: { entity: 'company', countryCode: selectedCountryCode, limit: 500 }
    });

    const fieldDefinitions: CompanyProfileFieldDefinition[] = useMemo(() => {
        return (definitionData?.fieldDefinitions ?? []) as CompanyProfileFieldDefinition[];
    }, [definitionData]);

    const groupedFieldDefinitions: CompanyProfileFieldDefinitionGroup[] = useMemo(() => {
        return groupFieldDefinitions(fieldDefinitions);
    }, [fieldDefinitions]);

    const [createCompany] = useMutation(COMPANY_PROFILE_CREATE_COMPANY, { client: apolloClient });
    const [updateCompany] = useMutation(COMPANY_PROFILE_UPDATE_COMPANY, { client: apolloClient });

    useEffect(() => {
        if (!activeCompany) {
            if (companies.length > 0) return;
            setForm(DEFAULT_COMPANY_PROFILE_FORM);
            setSnapshot(DEFAULT_COMPANY_PROFILE_FORM);
            setSaveError(null);
            setFormErrors({});
            setHydratedCompanyId(null);
            return;
        }

        if (hydratedCompanyId === activeCompany.companyId) return;

        const mapped = mapCompanyRowToForm(activeCompany, fieldDefinitions);
        const normalized = reconcileFormWithFieldDefinitions(mapped, fieldDefinitions);
        setForm(normalized);
        setSnapshot(normalized);
        setFormErrors({});
        setSaveError(null);
        setHydratedCompanyId(activeCompany.companyId);
    }, [activeCompany, companies.length, fieldDefinitions, hydratedCompanyId]);

    useEffect(() => {
        if (!fieldDefinitions.length) return;
        setForm((current) => reconcileFormWithFieldDefinitions(current, fieldDefinitions));
        setSnapshot((current) => reconcileFormWithFieldDefinitions(current, fieldDefinitions));
    }, [fieldDefinitions]);

    const loadCompany = useCallback(async () => {
        setSaveError(null);

        const result = await refetchCompanies({ search: null, limit: 2000 });
        const rows = (result.data?.companies ?? []) as CompanyProfileCompanyRow[];
        const nextCompany = pickActiveCompany(rows, {
            companyName: companyContext?.companyName ?? null,
            companyAlias: companyContext?.companyAlias ?? null
        });

        if (!nextCompany) {
            setForm(DEFAULT_COMPANY_PROFILE_FORM);
            setSnapshot(DEFAULT_COMPANY_PROFILE_FORM);
            setFormErrors({});
            setHydratedCompanyId(null);
            return;
        }

        const mapped = mapCompanyRowToForm(nextCompany, fieldDefinitions);
        const normalized = reconcileFormWithFieldDefinitions(mapped, fieldDefinitions);
        setForm(normalized);
        setSnapshot(normalized);
        setFormErrors({});
        setHydratedCompanyId(nextCompany.companyId);
    }, [refetchCompanies, companyContext?.companyAlias, companyContext?.companyName, fieldDefinitions]);

    const resetForm = useCallback(() => {
        setForm(snapshot);
        setSaveError(null);
        setFormErrors({});
    }, [snapshot]);

    const saveCompany = useCallback(async () => {
        const baseErrors = collectBaseFormErrors(form);
        const definitionKeyLookup = new Set(
            fieldDefinitions.map((definition) => definition.key.trim().toLowerCase()).filter(Boolean)
        );
        const pairErrors = collectCustomPairErrors(form.customPairs, definitionKeyLookup);
        const dynamicErrors = collectDynamicFieldErrors(form, fieldDefinitions, fiscalRange);

        const nextErrors: CompanyProfileFormErrors = {
            ...baseErrors,
            ...pairErrors,
            ...dynamicErrors
        };

        if (Object.keys(nextErrors).length > 0) {
            setFormErrors(nextErrors);
            throw new Error('Please fix validation errors before saving');
        }

        setFormErrors({});
        setSaving(true);
        setSaveError(null);

        try {
            const variables = buildSaveVariables(form);
            if (activeCompany?.companyId) {
                const result = await updateCompany({
                    variables: {
                        companyId: activeCompany.companyId,
                        ...variables
                    }
                });
                const updated = (result.data?.updateCompany ?? null) as CompanyProfileCompanyRow | null;
                if (updated) {
                    const mapped = mapCompanyRowToForm(updated, fieldDefinitions);
                    const normalized = reconcileFormWithFieldDefinitions(mapped, fieldDefinitions);
                    setForm(normalized);
                    setSnapshot(normalized);
                    setHydratedCompanyId(updated.companyId);
                }
            } else {
                const result = await createCompany({ variables });
                const created = (result.data?.createCompany ?? null) as CompanyProfileCompanyRow | null;
                if (created) {
                    const mapped = mapCompanyRowToForm(created, fieldDefinitions);
                    const normalized = reconcileFormWithFieldDefinitions(mapped, fieldDefinitions);
                    setForm(normalized);
                    setSnapshot(normalized);
                    setHydratedCompanyId(created.companyId);
                }
            }

            await refresh();
            await loadCompany();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save company profile';
            setSaveError(message);
            throw error;
        } finally {
            setSaving(false);
        }
    }, [
        activeCompany?.companyId,
        createCompany,
        fieldDefinitions,
        fiscalRange,
        form,
        loadCompany,
        refresh,
        updateCompany
    ]);

    return {
        form,
        setForm,
        snapshot,
        formErrors,
        setFormErrors,
        activeCompany,
        hasCompany: Boolean(activeCompany),
        countries,
        states,
        districts,
        filteredCities,
        fieldDefinitions,
        groupedFieldDefinitions,
        fiscalRange,
        geoImportVisible,
        setGeoImportVisible,
        loading: loadingCompanies,
        saving,
        error: saveError ?? companiesError?.message ?? null,
        loadCompany,
        saveCompany,
        resetForm
    };
};
