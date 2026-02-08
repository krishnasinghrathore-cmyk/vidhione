'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppDateInput from '@/components/AppDateInput';
import GeoImportDialog from '@/components/GeoImportDialog';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate } from '@/lib/reportDateValidation';

interface CompanyRow {
    companyId: number;
    name: string | null;
    alias: string | null;
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
    extraFields: string | null;
}

interface CityOption {
    cityId: number;
    name: string | null;
    districtName?: string | null;
    stateName?: string | null;
    countryName?: string | null;
}

interface CountryOption {
    countryId: number;
    name: string | null;
    iso2: string | null;
}

interface StateOption {
    stateId: number;
    name: string | null;
    stateCode: string | null;
}

interface DistrictOption {
    districtId: number;
    name: string | null;
}

interface FieldDefinition {
    id: number;
    key: string;
    label: string;
    fieldType: string;
    groupName?: string | null;
    orderNo?: number | null;
    required?: boolean | null;
    defaultValue?: string | null;
    options?: string | null;
}

const COMPANIES = gql`
    query Companies($search: String, $limit: Int) {
        companies(search: $search, limit: $limit) {
            companyId
            name
            alias
            addressLine1
            addressLine2
            addressLine3
            cityId
            districtId
            stateId
            countryId
            postalCode
            email
            website
            officePhone
            residencePhone
            mobileNumber
            faxNumber
            serviceTaxNumber
            panNumber
            cstNumber
            vatNumber
            tinNumber
            financialYearStart
            financialYearEnd
            bankName
            branchName
            accountNumber
            ifscCode
            signImagePath
            rtgsNumber
            pfNumber
            esiNumber
            extraFields
        }
    }
`;

const GEO_COUNTRIES = gql`
    query GeoCountries($search: String, $limit: Int) {
        geoCountries(search: $search, limit: $limit) {
            countryId
            name
            iso2
        }
    }
`;

const GEO_STATES = gql`
    query GeoStates($countryId: Int, $search: String, $limit: Int) {
        geoStates(countryId: $countryId, search: $search, limit: $limit) {
            stateId
            countryId
            name
            stateCode
        }
    }
`;

const GEO_DISTRICTS = gql`
    query GeoDistricts($stateId: Int, $search: String, $limit: Int) {
        geoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            districtId
            stateId
            countryId
            name
        }
    }
`;

const GEO_CITIES = gql`
    query GeoCities($districtId: Int, $stateId: Int, $search: String, $limit: Int) {
        geoCities(districtId: $districtId, stateId: $stateId, search: $search, limit: $limit) {
            cityId
            districtId
            stateId
            countryId
            name
        }
    }
`;

const FIELD_DEFINITIONS = gql`
    query FieldDefinitions($entity: String!, $countryCode: String, $limit: Int) {
        fieldDefinitions(entity: $entity, countryCode: $countryCode, limit: $limit) {
            id
            key
            label
            fieldType
            groupName
            orderNo
            required
            defaultValue
            options
        }
    }
`;

const CREATE_COMPANY = gql`
    mutation CreateCompany(
        $name: String!
        $alias: String!
        $addressLine1: String
        $addressLine2: String
        $addressLine3: String
        $cityId: Int
        $districtId: Int
        $stateId: Int
        $countryId: Int
        $postalCode: String
        $email: String
        $website: String
        $officePhone: String
        $residencePhone: String
        $mobileNumber: String
        $faxNumber: String
        $serviceTaxNumber: String
        $panNumber: String
        $cstNumber: String
        $vatNumber: String
        $tinNumber: String
        $financialYearStart: String
        $financialYearEnd: String
        $bankName: String
        $branchName: String
        $accountNumber: String
        $ifscCode: String
        $signImagePath: String
        $rtgsNumber: String
        $pfNumber: String
        $esiNumber: String
        $extraFields: String
    ) {
        createCompany(
            name: $name
            alias: $alias
            addressLine1: $addressLine1
            addressLine2: $addressLine2
            addressLine3: $addressLine3
            cityId: $cityId
            districtId: $districtId
            stateId: $stateId
            countryId: $countryId
            postalCode: $postalCode
            email: $email
            website: $website
            officePhone: $officePhone
            residencePhone: $residencePhone
            mobileNumber: $mobileNumber
            faxNumber: $faxNumber
            serviceTaxNumber: $serviceTaxNumber
            panNumber: $panNumber
            cstNumber: $cstNumber
            vatNumber: $vatNumber
            tinNumber: $tinNumber
            financialYearStart: $financialYearStart
            financialYearEnd: $financialYearEnd
            bankName: $bankName
            branchName: $branchName
            accountNumber: $accountNumber
            ifscCode: $ifscCode
            signImagePath: $signImagePath
            rtgsNumber: $rtgsNumber
            pfNumber: $pfNumber
            esiNumber: $esiNumber
            extraFields: $extraFields
        ) {
            companyId
        }
    }
`;

const UPDATE_COMPANY = gql`
    mutation UpdateCompany(
        $companyId: Int!
        $name: String
        $alias: String
        $addressLine1: String
        $addressLine2: String
        $addressLine3: String
        $cityId: Int
        $districtId: Int
        $stateId: Int
        $countryId: Int
        $postalCode: String
        $email: String
        $website: String
        $officePhone: String
        $residencePhone: String
        $mobileNumber: String
        $faxNumber: String
        $serviceTaxNumber: String
        $panNumber: String
        $cstNumber: String
        $vatNumber: String
        $tinNumber: String
        $financialYearStart: String
        $financialYearEnd: String
        $bankName: String
        $branchName: String
        $accountNumber: String
        $ifscCode: String
        $signImagePath: String
        $rtgsNumber: String
        $pfNumber: String
        $esiNumber: String
        $extraFields: String
    ) {
        updateCompany(
            companyId: $companyId
            name: $name
            alias: $alias
            addressLine1: $addressLine1
            addressLine2: $addressLine2
            addressLine3: $addressLine3
            cityId: $cityId
            districtId: $districtId
            stateId: $stateId
            countryId: $countryId
            postalCode: $postalCode
            email: $email
            website: $website
            officePhone: $officePhone
            residencePhone: $residencePhone
            mobileNumber: $mobileNumber
            faxNumber: $faxNumber
            serviceTaxNumber: $serviceTaxNumber
            panNumber: $panNumber
            cstNumber: $cstNumber
            vatNumber: $vatNumber
            tinNumber: $tinNumber
            financialYearStart: $financialYearStart
            financialYearEnd: $financialYearEnd
            bankName: $bankName
            branchName: $branchName
            accountNumber: $accountNumber
            ifscCode: $ifscCode
            signImagePath: $signImagePath
            rtgsNumber: $rtgsNumber
            pfNumber: $pfNumber
            esiNumber: $esiNumber
            extraFields: $extraFields
        ) {
            companyId
        }
    }
`;

const DELETE_COMPANY = gql`
    mutation DeleteCompany($companyId: Int!) {
        deleteCompany(companyId: $companyId)
    }
`;

type FormState = {
    name: string;
    alias: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    cityId: number | null;
    districtId: number | null;
    stateId: number | null;
    countryId: number | null;
    postalCode: string;
    email: string;
    website: string;
    officePhone: string;
    residencePhone: string;
    mobileNumber: string;
    faxNumber: string;
    serviceTaxNumber: string;
    panNumber: string;
    cstNumber: string;
    vatNumber: string;
    tinNumber: string;
    financialYearStart: string;
    financialYearEnd: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
    signImagePath: string;
    rtgsNumber: string;
    pfNumber: string;
    esiNumber: string;
    extraFields: Record<string, any>;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    alias: z.string().trim().min(1, 'Alias is required'),
    countryId: z.number().nullable().optional(),
    stateId: z.number().nullable().optional(),
    districtId: z.number().nullable().optional(),
    cityId: z.number().nullable().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    addressLine3: z.string().optional()
}).refine(
    (data) =>
        !(
            !data.cityId &&
            ((data.addressLine1 && data.addressLine1.trim()) ||
                (data.addressLine2 && data.addressLine2.trim()) ||
                (data.addressLine3 && data.addressLine3.trim()))
        ),
    { message: 'Select a city when address is provided', path: ['cityId'] }
).refine(
    (data) => !(data.cityId && !data.districtId),
    { message: 'Select a district for the city', path: ['districtId'] }
).refine(
    (data) => !(data.districtId && !data.stateId),
    { message: 'Select a state for the district', path: ['stateId'] }
).refine(
    (data) => !(data.stateId && !data.countryId),
    { message: 'Select a country for the state', path: ['countryId'] }
);

const DEFAULT_FORM: FormState = {
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
    extraFields: {}
};

const limitOptions = [50, 100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const parseJsonValue = (value?: string | null) => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const normalizeExtraFields = (value?: Record<string, any> | null) =>
    value && typeof value === 'object' ? value : {};

const parseExtraDateValue = (value: unknown): Date | null => {
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

const isEmptyExtraValue = (value: any) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
};

export default function AccountsCompaniesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const { companyContext } = useAuth();

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<CompanyRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [geoImportVisible, setGeoImportVisible] = useState(false);
    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const { data, loading, error, refetch } = useQuery(COMPANIES, {
        client: apolloClient,
        variables: {
            search: search.trim() || null,
            limit
        }
    });
    const { data: geoCountriesData } = useQuery(GEO_COUNTRIES, {
        client: apolloClient,
        variables: { search: null, limit: 2000 }
    });
    const { data: geoStatesData } = useQuery(GEO_STATES, {
        client: apolloClient,
        variables: { countryId: form.countryId ?? null, search: null, limit: 2000 },
        skip: !form.countryId
    });
    const { data: geoDistrictsData } = useQuery(GEO_DISTRICTS, {
        client: apolloClient,
        variables: { stateId: form.stateId ?? null, search: null, limit: 2000 },
        skip: !form.stateId
    });
    const { data: geoCitiesData } = useQuery(GEO_CITIES, {
        client: apolloClient,
        variables: {
            districtId: null,
            stateId: null,
            search: null,
            limit: 2000
        }
    });
    const [createCompany] = useMutation(CREATE_COMPANY, { client: apolloClient });
    const [updateCompany] = useMutation(UPDATE_COMPANY, { client: apolloClient });
    const [deleteCompany] = useMutation(DELETE_COMPANY, { client: apolloClient });

    const rows: CompanyRow[] = useMemo(() => data?.companies ?? [], [data]);
    const geoCountries: CountryOption[] = useMemo(() => geoCountriesData?.geoCountries ?? [], [geoCountriesData]);
    const geoStates: StateOption[] = useMemo(() => geoStatesData?.geoStates ?? [], [geoStatesData]);
    const geoDistricts: DistrictOption[] = useMemo(
        () => geoDistrictsData?.geoDistricts ?? [],
        [geoDistrictsData]
    );
    const geoCities: CityOption[] = useMemo(() => geoCitiesData?.geoCities ?? [], [geoCitiesData]);
    const filteredGeoCities = useMemo(() => {
        return geoCities.filter((city) => {
            if (form.districtId && city.districtId !== form.districtId) return false;
            if (form.stateId && city.stateId !== form.stateId) return false;
            return true;
        });
    }, [geoCities, form.districtId, form.stateId]);
    const selectedCountry = geoCountries.find((c) => c.countryId === form.countryId);
    const selectedCountryCode = selectedCountry?.iso2 ?? null;
    const { data: fieldDefsData } = useQuery(FIELD_DEFINITIONS, {
        client: apolloClient,
        variables: { entity: 'company', countryCode: selectedCountryCode, limit: 500 }
    });
    const fieldDefinitions: FieldDefinition[] = useMemo(
        () => (fieldDefsData?.fieldDefinitions ?? []) as FieldDefinition[],
        [fieldDefsData]
    );
    const groupedFieldDefinitions = useMemo(() => {
        const groups = new Map<string, FieldDefinition[]>();
        fieldDefinitions.forEach((def) => {
            const group = def.groupName?.trim() || 'Additional';
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group)?.push(def);
        });
        return Array.from(groups.entries()).map(([groupName, defs]) => ({
            groupName,
            definitions: defs.sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
        }));
    }, [fieldDefinitions]);

    useEffect(() => {
        if (!fieldDefinitions.length) return;
        setForm((prev) => {
            const nextExtra = { ...normalizeExtraFields(prev.extraFields) };
            let updated = false;
            fieldDefinitions.forEach((def) => {
                if (nextExtra[def.key] !== undefined) return;
                if (!def.defaultValue) return;
                const parsed = parseJsonValue(def.defaultValue);
                nextExtra[def.key] = parsed;
                updated = true;
            });
            if (!updated) return prev;
            return { ...prev, extraFields: nextExtra };
        });
    }, [fieldDefinitions]);

    const cityMap = useMemo(() => {
        const map = new Map<number, string>();
        geoCities.forEach((city) => {
            const label = city.name ?? `#${city.cityId}`;
            map.set(city.cityId, label);
        });
        return map;
    }, [geoCities]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [
                row.companyId,
                row.name,
                row.alias,
                row.cityId ? cityMap.get(row.cityId) : null,
                row.mobileNumber,
                row.email
            ]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search, cityMap]);
    const openNew = () => {
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: CompanyRow) => {
        setEditing(row);
        setForm({
            name: row.name ?? '',
            alias: row.alias ?? '',
            addressLine1: row.addressLine1 ?? '',
            addressLine2: row.addressLine2 ?? '',
            addressLine3: row.addressLine3 ?? '',
            cityId: row.cityId ?? null,
            districtId: row.districtId ?? null,
            stateId: row.stateId ?? null,
            countryId: row.countryId ?? null,
            postalCode: row.postalCode ?? '',
            email: row.email ?? '',
            website: row.website ?? '',
            officePhone: row.officePhone ?? '',
            residencePhone: row.residencePhone ?? '',
            mobileNumber: row.mobileNumber ?? '',
            faxNumber: row.faxNumber ?? '',
            serviceTaxNumber: row.serviceTaxNumber ?? '',
            panNumber: row.panNumber ?? '',
            cstNumber: row.cstNumber ?? '',
            vatNumber: row.vatNumber ?? '',
            tinNumber: row.tinNumber ?? '',
            financialYearStart: row.financialYearStart ?? '',
            financialYearEnd: row.financialYearEnd ?? '',
            bankName: row.bankName ?? '',
            branchName: row.branchName ?? '',
            accountNumber: row.accountNumber ?? '',
            ifscCode: row.ifscCode ?? '',
            signImagePath: row.signImagePath ?? '',
            rtgsNumber: row.rtgsNumber ?? '',
            pfNumber: row.pfNumber ?? '',
            esiNumber: row.esiNumber ?? '',
            extraFields: normalizeExtraFields(parseJsonValue(row.extraFields ?? null) ?? {})
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const save = async () => {
        const parsed = formSchema.safeParse(form);
        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                if (issue.path[0]) nextErrors[String(issue.path[0])] = issue.message;
            });
            setFormErrors(nextErrors);
            toastRef.current?.show({ severity: 'warn', summary: 'Please fix validation errors' });
            return;
        }

        const dynamicErrors: Record<string, string> = {};
        const extraFields = normalizeExtraFields(form.extraFields);
        fieldDefinitions.forEach((def) => {
            if (!def.required) return;
            if (isEmptyExtraValue(extraFields[def.key])) {
                dynamicErrors[`extraFields.${def.key}`] = `${def.label} is required`;
            }
        });
        fieldDefinitions.forEach((def) => {
            if (def.fieldType !== 'date') return;
            const rawValue = extraFields[def.key];
            if (isEmptyExtraValue(rawValue)) return;
            const parsedDate = parseExtraDateValue(rawValue);
            if (!parsedDate) {
                dynamicErrors[`extraFields.${def.key}`] = `${def.label} must be a valid date`;
                return;
            }
            const validation = validateSingleDate({ date: parsedDate }, fiscalRange);
            if (!validation.ok) {
                dynamicErrors[`extraFields.${def.key}`] =
                    validation.errors.date ?? `${def.label} must be within the financial year`;
            }
        });
        if (Object.keys(dynamicErrors).length > 0) {
            setFormErrors(dynamicErrors);
            toastRef.current?.show({ severity: 'warn', summary: 'Please fill required extra fields' });
            return;
        }

        setFormErrors({});

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim(),
                alias: form.alias.trim(),
                addressLine1: toOptionalText(form.addressLine1),
                addressLine2: toOptionalText(form.addressLine2),
                addressLine3: toOptionalText(form.addressLine3),
                countryId: form.countryId,
                stateId: form.stateId,
                districtId: form.districtId,
                cityId: form.cityId,
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
                extraFields: JSON.stringify(normalizeExtraFields(form.extraFields))
            };

            if (editing) {
                await updateCompany({
                    variables: {
                        companyId: editing.companyId,
                        ...variables
                    }
                });
            } else {
                await createCompany({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Company saved.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Save failed.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (companyId: number) => {
        try {
            await deleteCompany({ variables: { companyId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Company deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: CompanyRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this company?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.companyId)
        });
    };

    const extraValues = normalizeExtraFields(form.extraFields);
    const updateExtraField = (key: string, value: any) => {
        setForm((prev) => ({
            ...prev,
            extraFields: { ...normalizeExtraFields(prev.extraFields), [key]: value }
        }));
    };

    const parseOptions = (raw?: string | null) => {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map((option) =>
                    typeof option === 'string'
                        ? { label: option, value: option }
                        : { label: option.label ?? option.value ?? String(option), value: option.value ?? option.label ?? option }
                );
            }
        } catch {
            return [];
        }
        return [];
    };

    const renderExtraField = (def: FieldDefinition) => {
        const value = extraValues[def.key];
        const errorKey = `extraFields.${def.key}`;
        const requiredMark = def.required ? <span className="p-error">*</span> : null;

        switch (def.fieldType) {
            case 'number':
                return (
                    <div className="flex flex-column gap-1">
                        <label className="font-medium">
                            {def.label} {requiredMark}
                        </label>
                        <InputNumber
                            value={typeof value === 'number' ? value : value != null ? Number(value) : null}
                            onValueChange={(e) => updateExtraField(def.key, e.value ?? null)}
                            className="w-full"
                            placeholder={def.label}
                        />
                        {formErrors[errorKey] && <small className="p-error">{formErrors[errorKey]}</small>}
                    </div>
                );
            case 'boolean':
                return (
                    <div className="flex flex-column gap-2">
                        <label className="font-medium">
                            {def.label} {requiredMark}
                        </label>
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId={`extra-${def.key}`}
                                checked={Boolean(value)}
                                onChange={(e) => updateExtraField(def.key, e.checked)}
                            />
                            <label htmlFor={`extra-${def.key}`} className="text-600">
                                {def.label}
                            </label>
                        </div>
                        {formErrors[errorKey] && <small className="p-error">{formErrors[errorKey]}</small>}
                    </div>
                );
            case 'date': {
                const parsedDate = value ? new Date(value) : null;
                return (
                    <div className="flex flex-column gap-1">
                        <label className="font-medium">
                            {def.label} {requiredMark}
                        </label>
                        <AppDateInput
                            value={parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null}
                            onChange={(next) => updateExtraField(def.key, next ? next.toISOString().slice(0, 10) : null)}
                            placeholder="DD/MM/YYYY"
                            fiscalYearStart={fiscalRange?.start ?? null}
                            fiscalYearEnd={fiscalRange?.end ?? null}
                            enforceFiscalRange
                        />
                        {formErrors[errorKey] && <small className="p-error">{formErrors[errorKey]}</small>}
                    </div>
                );
            }
            case 'select': {
                const options = parseOptions(def.options);
                return (
                    <div className="flex flex-column gap-1">
                        <label className="font-medium">
                            {def.label} {requiredMark}
                        </label>
                        <AppDropdown
                            value={value ?? null}
                            options={options}
                            onChange={(e) => updateExtraField(def.key, e.value)}
                            placeholder={`Select ${def.label}`}
                            showClear
                            filter
                        />
                        {formErrors[errorKey] && <small className="p-error">{formErrors[errorKey]}</small>}
                    </div>
                );
            }
            case 'multi-select': {
                const options = parseOptions(def.options);
                return (
                    <div className="flex flex-column gap-1">
                        <label className="font-medium">
                            {def.label} {requiredMark}
                        </label>
                        <AppMultiSelect
                            value={Array.isArray(value) ? value : []}
                            options={options}
                            onChange={(e) => updateExtraField(def.key, e.value ?? [])}
                            placeholder={`Select ${def.label}`}
                            display="chip"
                        />
                        {formErrors[errorKey] && <small className="p-error">{formErrors[errorKey]}</small>}
                    </div>
                );
            }
            default:
                return (
                    <div className="flex flex-column gap-1">
                        <label className="font-medium">
                            {def.label} {requiredMark}
                        </label>
                        <InputText
                            value={value ?? ''}
                            onChange={(e) => updateExtraField(def.key, e.target.value)}
                            placeholder={def.label}
                        />
                        {formErrors[errorKey] && <small className="p-error">{formErrors[errorKey]}</small>}
                    </div>
                );
        }
    };

    const cityBody = (row: CompanyRow) => {
        if (!row.cityId) return <span className="text-500">-</span>;
        return cityMap.get(row.cityId) ?? row.cityId;
    };

    const actionsBody = (row: CompanyRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => confirmDelete(e, row)} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Companies</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain company profiles for the agency accounts masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Company" icon="pi pi-plus" onClick={openNew} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading companies: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="companyId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as CompanyRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search company"
                            style={{ width: '100%' }}
                        />
                    </span>
                }
                headerRight={
                    <>
                        <Button
                            label="Export"
                            icon="pi pi-download"
                            className="p-button-info"
                            onClick={() => dtRef.current?.exportCSV()}
                            disabled={filteredRows.length === 0}
                        />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="p-button-text"
                            onClick={() => window.print()}
                        />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            onClick={() => refetch()}
                        />
                        <span className="flex align-items-center gap-2">
                            <span className="text-600 text-sm">Limit</span>
                            <AppDropdown
                                value={limit}
                                options={limitOptions}
                                onChange={(e) => setLimit(e.value ?? 2000)}
                                className="w-6rem"
                            />
                        </span>
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} company{filteredRows.length === 1 ? '' : 'ies'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} company${filteredRows.length === 1 ? '' : 'ies'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="alias" header="Alias" sortable />
                <Column header="City" body={cityBody} />
                <Column field="mobileNumber" header="Mobile" />
                <Column field="email" header="Email" />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Company' : 'New Company'}
                visible={dialogVisible}
                style={{ width: 'min(980px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button
                            label="Cancel"
                            className="p-button-text"
                            onClick={() => setDialogVisible(false)}
                            disabled={saving}
                        />
                        <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <h4 className="m-0 text-600">Basic</h4>
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Alias</label>
                        <InputText
                            value={form.alias}
                            onChange={(e) => setForm((s) => ({ ...s, alias: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.alias ? 'p-invalid' : undefined}
                        />
                        {formErrors.alias && <small className="p-error">{formErrors.alias}</small>}
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 1</label>
                        <InputText
                            value={form.addressLine1}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 2</label>
                        <InputText
                            value={form.addressLine2}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 3</label>
                        <InputText
                            value={form.addressLine3}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine3: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label className="block text-600">Location</label>
                            <Button
                                label="Import from master"
                                icon="pi pi-download"
                                className="p-button-text p-button-sm"
                                onClick={() => setGeoImportVisible(true)}
                            />
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <label className="block text-600 mb-1">Country</label>
                                <AppDropdown
                                    value={form.countryId}
                                    options={geoCountries.map((c) => ({
                                        label: `${c.name ?? ''}${c.iso2 ? ` (${c.iso2})` : ''}`,
                                        value: c.countryId
                                    }))}
                                    onChange={(e) =>
                                        setForm((s) => ({
                                            ...s,
                                            countryId: e.value ?? null,
                                            stateId: null,
                                            districtId: null,
                                            cityId: null
                                        }))
                                    }
                                    placeholder="Select country"
                                    showClear
                                    filter
                                    className="w-full"
                                />
                                {formErrors.countryId && <small className="p-error">{formErrors.countryId}</small>}
                            </div>
                            <div className="col-12 md:col-6">
                                <label className="block text-600 mb-1">State</label>
                                <AppDropdown
                                    value={form.stateId}
                                    options={geoStates.map((s) => ({
                                        label: `${s.name ?? ''}${s.stateCode ? ` (${s.stateCode})` : ''}`,
                                        value: s.stateId
                                    }))}
                                    onChange={(e) =>
                                        setForm((s) => ({
                                            ...s,
                                            stateId: e.value ?? null,
                                            districtId: null,
                                            cityId: null
                                        }))
                                    }
                                    placeholder={form.countryId ? 'Select state' : 'Select country first'}
                                    showClear
                                    filter
                                    disabled={!form.countryId}
                                    className="w-full"
                                />
                                {formErrors.stateId && <small className="p-error">{formErrors.stateId}</small>}
                            </div>
                            <div className="col-12 md:col-6">
                                <label className="block text-600 mb-1">District</label>
                                <AppDropdown
                                    value={form.districtId}
                                    options={geoDistricts.map((d) => ({
                                        label: d.name ?? String(d.districtId),
                                        value: d.districtId
                                    }))}
                                    onChange={(e) =>
                                        setForm((s) => ({
                                            ...s,
                                            districtId: e.value ?? null,
                                            cityId: null
                                        }))
                                    }
                                    placeholder={form.stateId ? 'Select district' : 'Select state first'}
                                    showClear
                                    filter
                                    disabled={!form.stateId}
                                    className="w-full"
                                />
                                {formErrors.districtId && <small className="p-error">{formErrors.districtId}</small>}
                            </div>
                            <div className="col-12 md:col-6">
                                <label className="block text-600 mb-1">City</label>
                                <AppDropdown
                                    value={form.cityId}
                                    options={filteredGeoCities.map((c) => ({
                                        label: c.name ?? String(c.cityId),
                                        value: c.cityId
                                    }))}
                                    onChange={(e) => setForm((s) => ({ ...s, cityId: e.value ?? null }))}
                                    placeholder={form.districtId ? 'Select city' : 'Select district first'}
                                    showClear
                                    filter
                                    disabled={!form.districtId}
                                    className="w-full"
                                />
                                {formErrors.cityId && <small className="p-error">{formErrors.cityId}</small>}
                            </div>
                        </div>
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Postal Code</label>
                        <InputText
                            value={form.postalCode}
                            onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 mt-2">
                        <h4 className="m-0 text-600">Contact</h4>
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Email</label>
                        <InputText
                            value={form.email}
                            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Website</label>
                        <InputText
                            value={form.website}
                            onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Office Phone</label>
                        <InputText
                            value={form.officePhone}
                            onChange={(e) => setForm((s) => ({ ...s, officePhone: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Residence Phone</label>
                        <InputText
                            value={form.residencePhone}
                            onChange={(e) => setForm((s) => ({ ...s, residencePhone: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Mobile</label>
                        <InputText
                            value={form.mobileNumber}
                            onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Fax</label>
                        <InputText
                            value={form.faxNumber}
                            onChange={(e) => setForm((s) => ({ ...s, faxNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 mt-2">
                        <h4 className="m-0 text-600">Tax & IDs</h4>
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Service Tax No</label>
                        <InputText
                            value={form.serviceTaxNumber}
                            onChange={(e) => setForm((s) => ({ ...s, serviceTaxNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">PAN No</label>
                        <InputText
                            value={form.panNumber}
                            onChange={(e) => setForm((s) => ({ ...s, panNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">CST No</label>
                        <InputText
                            value={form.cstNumber}
                            onChange={(e) => setForm((s) => ({ ...s, cstNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">VAT No</label>
                        <InputText
                            value={form.vatNumber}
                            onChange={(e) => setForm((s) => ({ ...s, vatNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">TIN No</label>
                        <InputText
                            value={form.tinNumber}
                            onChange={(e) => setForm((s) => ({ ...s, tinNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    {groupedFieldDefinitions.length > 0 && (
                        <>
                            <div className="col-12 mt-2">
                                <h4 className="m-0 text-600">Additional Fields</h4>
                            </div>
                            {groupedFieldDefinitions.map((group) => (
                                <React.Fragment key={group.groupName}>
                                    <div className="col-12">
                                        <span className="text-600 text-sm">{group.groupName}</span>
                                    </div>
                                    {group.definitions.map((def) => (
                                        <div key={def.id} className="col-12 md:col-6">
                                            {renderExtraField(def)}
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </>
                    )}

                    <div className="col-12 mt-2">
                        <h4 className="m-0 text-600">Fiscal Year</h4>
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Financial Year Start</label>
                        <InputText
                            value={form.financialYearStart}
                            onChange={(e) => setForm((s) => ({ ...s, financialYearStart: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Financial Year End</label>
                        <InputText
                            value={form.financialYearEnd}
                            onChange={(e) => setForm((s) => ({ ...s, financialYearEnd: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 mt-2">
                        <h4 className="m-0 text-600">Banking</h4>
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Bank Name</label>
                        <InputText
                            value={form.bankName}
                            onChange={(e) => setForm((s) => ({ ...s, bankName: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Branch Name</label>
                        <InputText
                            value={form.branchName}
                            onChange={(e) => setForm((s) => ({ ...s, branchName: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Account Number</label>
                        <InputText
                            value={form.accountNumber}
                            onChange={(e) => setForm((s) => ({ ...s, accountNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">IFSC Code</label>
                        <InputText
                            value={form.ifscCode}
                            onChange={(e) => setForm((s) => ({ ...s, ifscCode: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">RTGS No</label>
                        <InputText
                            value={form.rtgsNumber}
                            onChange={(e) => setForm((s) => ({ ...s, rtgsNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="col-12 mt-2">
                        <h4 className="m-0 text-600">Other</h4>
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Sign Image Path</label>
                        <InputText
                            value={form.signImagePath}
                            onChange={(e) => setForm((s) => ({ ...s, signImagePath: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">PF No</label>
                        <InputText
                            value={form.pfNumber}
                            onChange={(e) => setForm((s) => ({ ...s, pfNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">ESI No</label>
                        <InputText
                            value={form.esiNumber}
                            onChange={(e) => setForm((s) => ({ ...s, esiNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </Dialog>

            <GeoImportDialog
                visible={geoImportVisible}
                onHide={() => setGeoImportVisible(false)}
                onApply={(selection) => {
                    setForm((prev) => ({
                        ...prev,
                        countryId: selection.countryId ?? prev.countryId,
                        stateId: selection.stateId ?? null,
                        districtId: selection.districtId ?? null,
                        cityId: selection.cityId ?? null
                    }));
                }}
                title="Import location from master"
            />
        </div>
    );
}
