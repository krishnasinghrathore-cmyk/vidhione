import { gql } from '@apollo/client';

const COMPANY_PROFILE_FIELDS = `
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
`;

export const COMPANY_PROFILE_COMPANIES = gql`
    query CompanyProfileCompanies($search: String, $limit: Int) {
        companies(search: $search, limit: $limit) {
            ${COMPANY_PROFILE_FIELDS}
        }
    }
`;

export const COMPANY_PROFILE_GEO_COUNTRIES = gql`
    query CompanyProfileGeoCountries($search: String, $limit: Int) {
        geoCountries(search: $search, limit: $limit) {
            countryId
            name
            iso2
        }
    }
`;

export const COMPANY_PROFILE_GEO_STATES = gql`
    query CompanyProfileGeoStates($countryId: Int, $search: String, $limit: Int) {
        geoStates(countryId: $countryId, search: $search, limit: $limit) {
            stateId
            countryId
            name
            stateCode
        }
    }
`;

export const COMPANY_PROFILE_GEO_DISTRICTS = gql`
    query CompanyProfileGeoDistricts($stateId: Int, $search: String, $limit: Int) {
        geoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            districtId
            stateId
            countryId
            name
        }
    }
`;

export const COMPANY_PROFILE_GEO_CITIES = gql`
    query CompanyProfileGeoCities($districtId: Int, $stateId: Int, $search: String, $limit: Int) {
        geoCities(districtId: $districtId, stateId: $stateId, search: $search, limit: $limit) {
            cityId
            districtId
            stateId
            countryId
            name
        }
    }
`;

export const COMPANY_PROFILE_FIELD_DEFINITIONS = gql`
    query CompanyProfileFieldDefinitions($entity: String!, $countryCode: String, $limit: Int) {
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

export const COMPANY_PROFILE_CREATE_COMPANY = gql`
    mutation CompanyProfileCreateCompany(
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
            ${COMPANY_PROFILE_FIELDS}
        }
    }
`;

export const COMPANY_PROFILE_UPDATE_COMPANY = gql`
    mutation CompanyProfileUpdateCompany(
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
            ${COMPANY_PROFILE_FIELDS}
        }
    }
`;
