export interface CompanyProfileCompanyRow {
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

export interface CompanyProfileCountryOption {
    countryId: number;
    name: string | null;
    iso2: string | null;
}

export interface CompanyProfileStateOption {
    stateId: number;
    name: string | null;
    stateCode: string | null;
}

export interface CompanyProfileDistrictOption {
    districtId: number;
    name: string | null;
    stateId?: number | null;
    countryId?: number | null;
}

export interface CompanyProfileCityOption {
    cityId: number;
    name: string | null;
    districtId?: number | null;
    stateId?: number | null;
    countryId?: number | null;
}

export interface CompanyProfileFieldDefinition {
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

export interface CompanyProfileFieldDefinitionGroup {
    groupName: string;
    definitions: CompanyProfileFieldDefinition[];
}

export type CompanyProfileExtraFields = Record<string, unknown>;

export type CompanyProfileCustomPair = {
    id: string;
    key: string;
    value: string;
};

export type CompanyProfileFormState = {
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
    extraFields: CompanyProfileExtraFields;
    customPairs: CompanyProfileCustomPair[];
};

export type CompanyProfileFormErrors = Record<string, string>;

export type CompanyProfileFiscalRange = {
    start: Date | null;
    end: Date | null;
} | null;
