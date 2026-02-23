'use client';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmPopup, ConfirmPopup } from 'primereact/confirmpopup';
import { TabPanel, TabView } from 'primereact/tabview';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppDateInput from '@/components/AppDateInput';
import AppInput from '@/components/AppInput';
import GeoImportDialog from '@/components/GeoImportDialog';
import { useApolloClient, useQuery, useMutation, gql } from '@apollo/client';
import { z } from 'zod';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { useAreaOptions } from '@/lib/accounts/areas';
import { useGeoCityOptions } from '@/lib/accounts/cities';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate } from '@/lib/reportDateValidation';
import { invalidateAccountMasterLookups } from '@/lib/accounts/masterLookupCache';
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchAccountsMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
import {
  getMasterActionDeniedDetail,
  isMasterActionAllowed,
  type MasterAction,
  useMasterActionPermissions
} from '@/lib/masterActionPermissions';
import { ensureDryEditCheck } from '@/lib/masterDryRun';

interface LedgerRow {
  ledgerId: number;
  name: string;
  ledgerGroupId?: number | null;
  areaId?: number | null;
  shipAddressLine1?: string | null;
  shipAddressLine2?: string | null;
  shipAddressLine3?: string | null;
  shipCityId?: number | null;
  shipPostalCode?: string | null;
  shipOfficePhone?: string | null;
  shipResidencePhone?: string | null;
  shipMobileNumber?: string | null;
  creditLimitNoOfDays?: number | null;
  creditLimitNoOfBills?: number | null;
  taxCalculation?: number | null;
  taxNature?: number | null;
  taxCapitalGoods?: number | null;
  taxRoundOffSales?: number | null;
  taxRoundOffPurchase?: number | null;
  taxFPurchaseLedgerId?: number | null;
  taxFSalesLedgerId?: number | null;
  taxFSalesLedger2Id?: number | null;
  taxAccountsUpdate?: number | null;
  isGenerateBill?: number | null;
  typeOfParty?: string | null;
  isPrintBill?: number | null;
  isTaxApplicable?: number | null;
  isStopGst?: number | null;
  gstStopDate?: string | null;
  intRate?: number | null;
  isTcsApplicable?: number | null;
  alias?: string | null;
  groupName: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  address?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  stateId?: number | null;
  stateName?: string | null;
  countryId?: number | null;
  countryName?: string | null;
  postalCode?: string | null;
  mobileNumber?: string | null;
  officePhone?: string | null;
  residencePhone?: string | null;
  email?: string | null;
  website?: string | null;
  panNumber?: string | null;
  tinNumber?: string | null;
  tinNumber2?: string | null;
  tinNumber3?: string | null;
  tinNumberFrom2?: string | null;
  tinNumberFrom3?: string | null;
  contactPersonsJson?: string | null;
  ledgerSalesTaxesJson?: string | null;
  gstNumber?: string | null;
  taxRate?: string | null;
  taxTypeCode?: number | null;
  isReverseChargeApplicableFlag?: number | null;
  isExportFlag?: number | null;
  openingBalanceAmount?: string | null;
  balanceType?: number | null;
  isActiveFlag?: number | null;
  extraFields?: string | null;
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

interface ContactPersonRow {
  rowId: string;
  name: string;
  designation: string;
  mobileNumber: string;
  email: string;
}

interface LedgerSalesTaxRow {
  rowId: string;
  taxName: string;
  gstNumber: string;
  taxRate: string;
  effectiveDate: string;
  isActiveFlag: number;
}

interface ShippingAddressRow {
  rowId: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  cityId: string;
  postalCode: string;
  officePhone: string;
  residencePhone: string;
  mobileNumber: string;
}

type SerializedShippingAddress = Omit<ShippingAddressRow, 'rowId'> & {
  cityId: number | null;
};

const MAX_SHIPPING_ADDRESSES = 3;
const SHIPPING_MOBILE_PATTERN = /^[0-9]{10,13}$/;

const LEDGER_SUMMARIES = gql`
  query LedgerSummaries($search: String, $limit: Int, $offset: Int, $sortField: String, $sortOrder: Int) {
    ledgerSummaries(search: $search, limit: $limit, offset: $offset, sortField: $sortField, sortOrder: $sortOrder) {
      total
      items {
        ledgerId
        name
        ledgerGroupId
        areaId
        shipAddressLine1
        shipAddressLine2
        shipAddressLine3
        shipCityId
        shipPostalCode
        shipOfficePhone
        shipResidencePhone
        shipMobileNumber
        creditLimitNoOfDays
        creditLimitNoOfBills
        taxCalculation
        taxNature
        taxCapitalGoods
        taxRoundOffSales
        taxRoundOffPurchase
        taxFPurchaseLedgerId
        taxFSalesLedgerId
        taxFSalesLedger2Id
        taxAccountsUpdate
        isGenerateBill
        typeOfParty
        isPrintBill
        isTaxApplicable
        isStopGst
        gstStopDate
        intRate
        isTcsApplicable
        alias
        groupName
        addressLine1
        addressLine2
        addressLine3
        address
        cityId
        cityName
        districtId
        districtName
        stateId
        stateName
        countryId
        countryName
        postalCode
        mobileNumber
        officePhone
        residencePhone
        email
        website
        panNumber
        tinNumber
        tinNumber2
        tinNumber3
        tinNumberFrom2
        tinNumberFrom3
        contactPersonsJson
        ledgerSalesTaxesJson
        gstNumber
        taxRate
        taxTypeCode
        isReverseChargeApplicableFlag
        isExportFlag
        openingBalanceAmount
        balanceType
        isActiveFlag
        extraFields
      }
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

const CREATE_LEDGER = gql`
  mutation CreateLedger(
    $name: String!
    $ledgerGroupId: Int!
    $areaId: Int
    $shipAddressLine1: String
    $shipAddressLine2: String
    $shipAddressLine3: String
    $shipCityId: Int
    $shipPostalCode: String
    $shipOfficePhone: String
    $shipResidencePhone: String
    $shipMobileNumber: String
    $creditLimitNoOfDays: Int
    $creditLimitNoOfBills: Int
    $taxCalculation: Int
    $taxNature: Int
    $taxCapitalGoods: Int
    $taxRoundOffSales: Int
    $taxRoundOffPurchase: Int
    $taxFPurchaseLedgerId: Int
    $taxFSalesLedgerId: Int
    $taxFSalesLedger2Id: Int
    $taxAccountsUpdate: Int
    $isGenerateBill: Int
    $typeOfParty: String
    $isPrintBill: Int
    $isTaxApplicable: Int
    $isStopGst: Int
    $gstStopDate: String
    $intRate: Float
    $isTcsApplicable: Int
    $alias: String
    $addressLine1: String
    $addressLine2: String
    $addressLine3: String
    $cityId: Int
    $districtId: Int
    $stateId: Int
    $countryId: Int
    $postalCode: String
    $mobileNumber: String
    $officePhone: String
    $residencePhone: String
    $email: String
    $website: String
    $panNumber: String
    $tinNumber: String
    $tinNumber2: String
    $tinNumber3: String
    $tinNumberFrom2: String
    $tinNumberFrom3: String
    $contactPersonsJson: String
    $ledgerSalesTaxesJson: String
    $taxRate: Float
    $taxTypeCode: Int
    $gstNumber: String
    $isReverseChargeApplicableFlag: Int
    $isExportFlag: Int
    $openingBalanceAmount: Float
    $balanceType: Int
    $isActiveFlag: Int
    $extraFields: String
  ) {
    createLedger(
      name: $name
      ledgerGroupId: $ledgerGroupId
      areaId: $areaId
      shipAddressLine1: $shipAddressLine1
      shipAddressLine2: $shipAddressLine2
      shipAddressLine3: $shipAddressLine3
      shipCityId: $shipCityId
      shipPostalCode: $shipPostalCode
      shipOfficePhone: $shipOfficePhone
      shipResidencePhone: $shipResidencePhone
      shipMobileNumber: $shipMobileNumber
      creditLimitNoOfDays: $creditLimitNoOfDays
      creditLimitNoOfBills: $creditLimitNoOfBills
      taxCalculation: $taxCalculation
      taxNature: $taxNature
      taxCapitalGoods: $taxCapitalGoods
      taxRoundOffSales: $taxRoundOffSales
      taxRoundOffPurchase: $taxRoundOffPurchase
      taxFPurchaseLedgerId: $taxFPurchaseLedgerId
      taxFSalesLedgerId: $taxFSalesLedgerId
      taxFSalesLedger2Id: $taxFSalesLedger2Id
      taxAccountsUpdate: $taxAccountsUpdate
      isGenerateBill: $isGenerateBill
      typeOfParty: $typeOfParty
      isPrintBill: $isPrintBill
      isTaxApplicable: $isTaxApplicable
      isStopGst: $isStopGst
      gstStopDate: $gstStopDate
      intRate: $intRate
      isTcsApplicable: $isTcsApplicable
      alias: $alias
      addressLine1: $addressLine1
      addressLine2: $addressLine2
      addressLine3: $addressLine3
      cityId: $cityId
      districtId: $districtId
      stateId: $stateId
      countryId: $countryId
      postalCode: $postalCode
      mobileNumber: $mobileNumber
      officePhone: $officePhone
      residencePhone: $residencePhone
      email: $email
      website: $website
      panNumber: $panNumber
      tinNumber: $tinNumber
      tinNumber2: $tinNumber2
      tinNumber3: $tinNumber3
      tinNumberFrom2: $tinNumberFrom2
      tinNumberFrom3: $tinNumberFrom3
      contactPersonsJson: $contactPersonsJson
      ledgerSalesTaxesJson: $ledgerSalesTaxesJson
      taxRate: $taxRate
      taxTypeCode: $taxTypeCode
      gstNumber: $gstNumber
      isReverseChargeApplicableFlag: $isReverseChargeApplicableFlag
      isExportFlag: $isExportFlag
      openingBalanceAmount: $openingBalanceAmount
      balanceType: $balanceType
      isActiveFlag: $isActiveFlag
      extraFields: $extraFields
    ) {
      ledgerId
      name
      areaId
      shipAddressLine1
      shipAddressLine2
      shipAddressLine3
      shipCityId
      shipPostalCode
      shipOfficePhone
      shipResidencePhone
      shipMobileNumber
      creditLimitNoOfDays
      creditLimitNoOfBills
      taxCalculation
      taxNature
      taxCapitalGoods
      taxRoundOffSales
      taxRoundOffPurchase
      taxFPurchaseLedgerId
      taxFSalesLedgerId
      taxFSalesLedger2Id
      taxAccountsUpdate
      isGenerateBill
      typeOfParty
      isPrintBill
      isTaxApplicable
      isStopGst
      gstStopDate
      intRate
      isTcsApplicable
      groupName
      address
      cityName
      districtName
      stateName
      countryName
      postalCode
      mobileNumber
      officePhone
      residencePhone
      email
      website
      panNumber
      tinNumber
      tinNumber2
      tinNumber3
      tinNumberFrom2
      tinNumberFrom3
      contactPersonsJson
      ledgerSalesTaxesJson
      gstNumber
      taxRate
      taxTypeCode
      isReverseChargeApplicableFlag
      isExportFlag
      openingBalanceAmount
      balanceType
      isActiveFlag
      extraFields
    }
  }
`;

const UPDATE_LEDGER = gql`
  mutation UpdateLedger(
    $ledgerId: Int!
    $name: String
    $ledgerGroupId: Int
    $areaId: Int
    $shipAddressLine1: String
    $shipAddressLine2: String
    $shipAddressLine3: String
    $shipCityId: Int
    $shipPostalCode: String
    $shipOfficePhone: String
    $shipResidencePhone: String
    $shipMobileNumber: String
    $creditLimitNoOfDays: Int
    $creditLimitNoOfBills: Int
    $taxCalculation: Int
    $taxNature: Int
    $taxCapitalGoods: Int
    $taxRoundOffSales: Int
    $taxRoundOffPurchase: Int
    $taxFPurchaseLedgerId: Int
    $taxFSalesLedgerId: Int
    $taxFSalesLedger2Id: Int
    $taxAccountsUpdate: Int
    $isGenerateBill: Int
    $typeOfParty: String
    $isPrintBill: Int
    $isTaxApplicable: Int
    $isStopGst: Int
    $gstStopDate: String
    $intRate: Float
    $isTcsApplicable: Int
    $alias: String
    $addressLine1: String
    $addressLine2: String
    $addressLine3: String
    $cityId: Int
    $districtId: Int
    $stateId: Int
    $countryId: Int
    $postalCode: String
    $mobileNumber: String
    $officePhone: String
    $residencePhone: String
    $email: String
    $website: String
    $panNumber: String
    $tinNumber: String
    $tinNumber2: String
    $tinNumber3: String
    $tinNumberFrom2: String
    $tinNumberFrom3: String
    $contactPersonsJson: String
    $ledgerSalesTaxesJson: String
    $taxRate: Float
    $taxTypeCode: Int
    $gstNumber: String
    $isReverseChargeApplicableFlag: Int
    $isExportFlag: Int
    $openingBalanceAmount: Float
    $balanceType: Int
    $isActiveFlag: Int
    $extraFields: String
  ) {
    updateLedger(
      ledgerId: $ledgerId
      name: $name
      ledgerGroupId: $ledgerGroupId
      areaId: $areaId
      shipAddressLine1: $shipAddressLine1
      shipAddressLine2: $shipAddressLine2
      shipAddressLine3: $shipAddressLine3
      shipCityId: $shipCityId
      shipPostalCode: $shipPostalCode
      shipOfficePhone: $shipOfficePhone
      shipResidencePhone: $shipResidencePhone
      shipMobileNumber: $shipMobileNumber
      creditLimitNoOfDays: $creditLimitNoOfDays
      creditLimitNoOfBills: $creditLimitNoOfBills
      taxCalculation: $taxCalculation
      taxNature: $taxNature
      taxCapitalGoods: $taxCapitalGoods
      taxRoundOffSales: $taxRoundOffSales
      taxRoundOffPurchase: $taxRoundOffPurchase
      taxFPurchaseLedgerId: $taxFPurchaseLedgerId
      taxFSalesLedgerId: $taxFSalesLedgerId
      taxFSalesLedger2Id: $taxFSalesLedger2Id
      taxAccountsUpdate: $taxAccountsUpdate
      isGenerateBill: $isGenerateBill
      typeOfParty: $typeOfParty
      isPrintBill: $isPrintBill
      isTaxApplicable: $isTaxApplicable
      isStopGst: $isStopGst
      gstStopDate: $gstStopDate
      intRate: $intRate
      isTcsApplicable: $isTcsApplicable
      alias: $alias
      addressLine1: $addressLine1
      addressLine2: $addressLine2
      addressLine3: $addressLine3
      cityId: $cityId
      districtId: $districtId
      stateId: $stateId
      countryId: $countryId
      postalCode: $postalCode
      mobileNumber: $mobileNumber
      officePhone: $officePhone
      residencePhone: $residencePhone
      email: $email
      website: $website
      panNumber: $panNumber
      tinNumber: $tinNumber
      tinNumber2: $tinNumber2
      tinNumber3: $tinNumber3
      tinNumberFrom2: $tinNumberFrom2
      tinNumberFrom3: $tinNumberFrom3
      contactPersonsJson: $contactPersonsJson
      ledgerSalesTaxesJson: $ledgerSalesTaxesJson
      taxRate: $taxRate
      taxTypeCode: $taxTypeCode
      gstNumber: $gstNumber
      isReverseChargeApplicableFlag: $isReverseChargeApplicableFlag
      isExportFlag: $isExportFlag
      openingBalanceAmount: $openingBalanceAmount
      balanceType: $balanceType
      isActiveFlag: $isActiveFlag
      extraFields: $extraFields
    ) {
      ledgerId
      name
      ledgerGroupId
      areaId
      shipAddressLine1
      shipAddressLine2
      shipAddressLine3
      shipCityId
      shipPostalCode
      shipOfficePhone
      shipResidencePhone
      shipMobileNumber
      creditLimitNoOfDays
      creditLimitNoOfBills
      taxCalculation
      taxNature
      taxCapitalGoods
      taxRoundOffSales
      taxRoundOffPurchase
      taxFPurchaseLedgerId
      taxFSalesLedgerId
      taxFSalesLedger2Id
      taxAccountsUpdate
      isGenerateBill
      typeOfParty
      isPrintBill
      isTaxApplicable
      isStopGst
      gstStopDate
      intRate
      isTcsApplicable
      addressLine1
      addressLine2
      addressLine3
      groupName
      address
      cityId
      cityName
      districtId
      districtName
      stateId
      stateName
      countryId
      countryName
      postalCode
      mobileNumber
      officePhone
      residencePhone
      email
      website
      panNumber
      tinNumber
      tinNumber2
      tinNumber3
      tinNumberFrom2
      tinNumberFrom3
      contactPersonsJson
      ledgerSalesTaxesJson
      gstNumber
      taxRate
      taxTypeCode
      isReverseChargeApplicableFlag
      isExportFlag
      openingBalanceAmount
      balanceType
      isActiveFlag
      extraFields
    }
  }
`;

const DELETE_LEDGER = gql`
  mutation DeleteLedger($ledgerId: Int!) {
    deleteLedger(ledgerId: $ledgerId)
  }
`;

const ENSURE_LEDGER_YEAR_BALANCE = gql`
  mutation EnsureLedgerYearBalance($ledgerId: Int!) {
    ensureLedgerYearBalance(ledgerId: $ledgerId)
  }
`;

const PROTECTED_ACCOUNT_LEDGER_IDS = new Set([-1, -2]);

const isProtectedAccountingLedgerRow = (row?: LedgerRow | null) => {
  if (!row) return false;
  const ledgerId = Number(row.ledgerId ?? 0);
  return ledgerId <= 0 || PROTECTED_ACCOUNT_LEDGER_IDS.has(ledgerId);
};

const balanceTypeBody = (row?: LedgerRow | null) => {
  if (row.balanceType == null) return '';
  return row.balanceType > 0 ? 'Dr' : 'Cr';
};

const activeBody = (row?: LedgerRow | null) => (row?.isActiveFlag === 1 ? 'Yes' : 'No');

const balanceBody = (row?: LedgerRow | null) => {
  if (!row.openingBalanceAmount) return '';
  const num = Number(row.openingBalanceAmount);
  if (Number.isNaN(num)) return row.openingBalanceAmount;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(num));
  const side = row.balanceType && row.balanceType > 0 ? 'Dr' : 'Cr';
  return `${formatted} ${side}`;
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

const parseStoredDateValue = (value?: string | null): Date | null => {
  const parsed = parseExtraDateValue(value);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatDateForStorage = (value: Date | null): string => {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeRowId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const createShippingAddressRow = (
  seed?: Partial<Omit<ShippingAddressRow, 'rowId'>> & { rowId?: string | number | null }
): ShippingAddressRow => ({
  rowId: seed?.rowId != null ? String(seed.rowId) : makeRowId(),
  addressLine1: String(seed?.addressLine1 ?? ''),
  addressLine2: String(seed?.addressLine2 ?? ''),
  addressLine3: String(seed?.addressLine3 ?? ''),
  cityId: seed?.cityId != null ? String(seed.cityId) : '',
  postalCode: String(seed?.postalCode ?? ''),
  officePhone: String(seed?.officePhone ?? ''),
  residencePhone: String(seed?.residencePhone ?? ''),
  mobileNumber: String(seed?.mobileNumber ?? '')
});

const hasShippingAddressData = (row: ShippingAddressRow) =>
  [
    row.addressLine1,
    row.addressLine2,
    row.addressLine3,
    row.cityId,
    row.postalCode,
    row.officePhone,
    row.residencePhone,
    row.mobileNumber
  ].some((value) => value.trim().length > 0);

const parseSerializedShippingAddresses = (value: unknown): ShippingAddressRow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const data = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      return createShippingAddressRow({
        rowId: data.rowId != null ? String(data.rowId) : undefined,
        addressLine1: String(data.addressLine1 ?? ''),
        addressLine2: String(data.addressLine2 ?? ''),
        addressLine3: String(data.addressLine3 ?? ''),
        cityId:
          data.cityId != null && !Number.isNaN(Number(data.cityId))
            ? String(Number(data.cityId))
            : '',
        postalCode: String(data.postalCode ?? ''),
        officePhone: String(data.officePhone ?? ''),
        residencePhone: String(data.residencePhone ?? ''),
        mobileNumber: String(data.mobileNumber ?? '')
      });
    })
    .filter(hasShippingAddressData)
    .slice(0, MAX_SHIPPING_ADDRESSES);
};

const buildShippingRowsFromLedger = (
  row: Pick<
    LedgerRow,
    | 'shipAddressLine1'
    | 'shipAddressLine2'
    | 'shipAddressLine3'
    | 'shipCityId'
    | 'shipPostalCode'
    | 'shipOfficePhone'
    | 'shipResidencePhone'
    | 'shipMobileNumber'
  >
): ShippingAddressRow[] => {
  const primary = createShippingAddressRow({
    addressLine1: row.shipAddressLine1 ?? '',
    addressLine2: row.shipAddressLine2 ?? '',
    addressLine3: row.shipAddressLine3 ?? '',
    cityId: row.shipCityId != null ? String(row.shipCityId) : '',
    postalCode: row.shipPostalCode ?? '',
    officePhone: row.shipOfficePhone ?? '',
    residencePhone: row.shipResidencePhone ?? '',
    mobileNumber: row.shipMobileNumber ?? ''
  });
  return hasShippingAddressData(primary) ? [primary] : [createShippingAddressRow()];
};

const resolveShippingRows = (row: LedgerRow | null, extraFields: Record<string, any>) => {
  const fromExtra = parseSerializedShippingAddresses(extraFields.shipAddresses);
  if (fromExtra.length > 0) return fromExtra;
  if (!row) return [createShippingAddressRow()];
  return buildShippingRowsFromLedger(row);
};

const sanitizeShippingRows = (rows: ShippingAddressRow[]): SerializedShippingAddress[] =>
  rows
    .map((row) => ({
      addressLine1: row.addressLine1.trim(),
      addressLine2: row.addressLine2.trim(),
      addressLine3: row.addressLine3.trim(),
      cityId:
        row.cityId.trim().length > 0 && !Number.isNaN(Number(row.cityId))
          ? Number(row.cityId)
          : null,
      postalCode: row.postalCode.trim(),
      officePhone: row.officePhone.trim(),
      residencePhone: row.residencePhone.trim(),
      mobileNumber: row.mobileNumber.trim()
    }))
    .filter((row) =>
      [
        row.addressLine1,
        row.addressLine2,
        row.addressLine3,
        row.cityId != null ? String(row.cityId) : '',
        row.postalCode,
        row.officePhone,
        row.residencePhone,
        row.mobileNumber
      ].some((value) => value.trim().length > 0)
    )
    .slice(0, MAX_SHIPPING_ADDRESSES);

const buildShippingFieldErrors = (rows: ShippingAddressRow[]) => {
  const nextErrors: Record<string, string> = {};
  rows.forEach((row) => {
    const cityId = row.cityId.trim();
    const mobile = row.mobileNumber.trim();
    if (cityId && Number.isNaN(Number(cityId))) {
      nextErrors[`shippingAddresses.${row.rowId}.cityId`] = 'Shipping city must be numeric';
    }
    if (mobile && !SHIPPING_MOBILE_PATTERN.test(mobile)) {
      nextErrors[`shippingAddresses.${row.rowId}.mobileNumber`] =
        'Enter a valid shipping mobile (10-13 digits)';
    }
  });
  return nextErrors;
};

const createContactPersonRow = (): ContactPersonRow => ({
  rowId: makeRowId(),
  name: '',
  designation: '',
  mobileNumber: '',
  email: ''
});

const createLedgerSalesTaxRow = (): LedgerSalesTaxRow => ({
  rowId: makeRowId(),
  taxName: '',
  gstNumber: '',
  taxRate: '',
  effectiveDate: '',
  isActiveFlag: 1
});

const parseContactPersonsJson = (value?: string | null): ContactPersonRow[] => {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => {
    const data = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      rowId: String(data.rowId ?? makeRowId()),
      name: String(data.name ?? ''),
      designation: String(data.designation ?? ''),
      mobileNumber: String(data.mobileNumber ?? ''),
      email: String(data.email ?? '')
    };
  });
};

const parseLedgerSalesTaxesJson = (value?: string | null): LedgerSalesTaxRow[] => {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => {
    const data = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      rowId: String(data.rowId ?? makeRowId()),
      taxName: String(data.taxName ?? ''),
      gstNumber: String(data.gstNumber ?? ''),
      taxRate: String(data.taxRate ?? ''),
      effectiveDate: String(data.effectiveDate ?? ''),
      isActiveFlag: Number(data.isActiveFlag ?? 1) === 1 ? 1 : 0
    };
  });
};

const sanitizeContactPersons = (rows: ContactPersonRow[]) =>
  rows
    .map((row) => ({
      name: row.name.trim(),
      designation: row.designation.trim(),
      mobileNumber: row.mobileNumber.trim(),
      email: row.email.trim()
    }))
    .filter((row) => row.name || row.designation || row.mobileNumber || row.email);

const sanitizeLedgerSalesTaxes = (rows: LedgerSalesTaxRow[]) =>
  rows
    .map((row) => ({
      taxName: row.taxName.trim(),
      gstNumber: row.gstNumber.trim(),
      taxRate: row.taxRate.trim(),
      effectiveDate: row.effectiveDate.trim(),
      isActiveFlag: row.isActiveFlag === 1 ? 1 : 0
    }))
    .filter((row) => row.taxName || row.gstNumber || row.taxRate || row.effectiveDate);

const isEmptyExtraValue = (value: any) => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const LABELS = {
  pageTitle: 'Ledgers',
  pageSubtitle:
    'Summary of ledger accounts from the shared Accounts engine, loaded from the /graphql ledgerSummaries query.',
  searchPlaceholder: 'Search by name and press Enter',
  newButton: 'New',
  editDialog: 'Edit Ledger',
  newDialog: 'New Ledger',
  form: {
    name: 'Name',
    group: 'Group',
    mobile: 'Mobile',
    gst: 'GST No',
    openingBalance: 'Opening Balance',
    drcr: 'Dr/Cr'
  },
  actions: {
    saved: 'Ledger saved successfully',
    deleted: 'Ledger deleted',
    error: 'Error'
  }
};

const ledgerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  ledgerGroupId: z.string().trim().min(1, 'Group is required'),
  areaId: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Area must be numeric'),
  shipAddressLine1: z.string().optional(),
  shipAddressLine2: z.string().optional(),
  shipAddressLine3: z.string().optional(),
  shipCityId: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Shipping city must be numeric'),
  shipPostalCode: z.string().optional(),
  shipOfficePhone: z.string().optional(),
  shipResidencePhone: z.string().optional(),
  shipMobileNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9]{10,13}$/.test(v), 'Enter a valid shipping mobile (10-13 digits)'),
  creditLimitNoOfDays: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Credit limit days must be numeric'),
  creditLimitNoOfBills: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Credit limit bills must be numeric'),
  taxCalculation: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax calculation must be numeric'),
  taxNature: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax nature must be numeric'),
  taxCapitalGoods: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax capital goods must be numeric'),
  taxRoundOffSales: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax round-off sales must be numeric'),
  taxRoundOffPurchase: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax round-off purchase must be numeric'),
  taxFPurchaseLedgerId: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax purchase ledger must be numeric'),
  taxFSalesLedgerId: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax sales ledger must be numeric'),
  taxFSalesLedger2Id: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax sales ledger 2 must be numeric'),
  taxAccountsUpdate: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax accounts update must be numeric'),
  isGenerateBill: z.number(),
  typeOfParty: z.string().optional(),
  isPrintBill: z.number(),
  isTaxApplicable: z.number(),
  isStopGst: z.number(),
  gstStopDate: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'GST stop date must be YYYY-MM-DD'),
  intRate: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Interest rate must be numeric'),
  isTcsApplicable: z.number(),
  alias: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  addressLine3: z.string().optional(),
  countryId: z.string().optional(),
  stateId: z.string().optional(),
  districtId: z.string().optional(),
  cityId: z.string().optional(),
  postalCode: z.string().optional(),
  mobileNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9]{10,13}$/.test(v), 'Enter a valid mobile (10-13 digits)'),
  officePhone: z.string().optional(),
  residencePhone: z.string().optional(),
  email: z.string().optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email'),
  website: z.string().optional(),
  panNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  tinNumber2: z.string().optional(),
  tinNumber3: z.string().optional(),
  tinNumberFrom2: z.string().optional(),
  tinNumberFrom3: z.string().optional(),
  gstNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9A-Z]{15}$/.test(v), 'Enter a valid GSTIN (15 chars, A-Z/0-9)'),
  taxRate: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax rate must be numeric'),
  taxTypeCode: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Tax type must be numeric'),
  openingBalanceAmount: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Opening balance must be numeric'),
  balanceType: z.number(),
  isActiveFlag: z.number(),
  isReverseChargeApplicableFlag: z.number(),
  isExportFlag: z.number()
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
).refine(
  (data) => !(data.isStopGst === 1 && !data.gstStopDate),
  { message: 'GST stop date is required when Stop GST is enabled', path: ['gstStopDate'] }
);

export default function AccountsLedgerListPage() {
  const apollo = useApolloClient();
  const { companyContext } = useAuth();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [first, setFirst] = useState(0);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<LedgerRow | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRow, setDetailRow] = useState<LedgerRow | null>(null);
  const [selectedRows, setSelectedRows] = useState<LedgerRow[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dryEditDigest, setDryEditDigest] = useState('');
  const [saving, setSaving] = useState(false);
  const [geoImportVisible, setGeoImportVisible] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ledgerGroupId: '',
    areaId: '',
    shipAddressLine1: '',
    shipAddressLine2: '',
    shipAddressLine3: '',
    shipCityId: '',
    shipPostalCode: '',
    shipOfficePhone: '',
    shipResidencePhone: '',
    shipMobileNumber: '',
    creditLimitNoOfDays: '',
    creditLimitNoOfBills: '',
    taxCalculation: '',
    taxNature: '',
    taxCapitalGoods: '',
    taxRoundOffSales: '',
    taxRoundOffPurchase: '',
    taxFPurchaseLedgerId: '',
    taxFSalesLedgerId: '',
    taxFSalesLedger2Id: '',
    taxAccountsUpdate: '',
    isGenerateBill: 0,
    typeOfParty: '',
    isPrintBill: 0,
    isTaxApplicable: 0,
    isStopGst: 0,
    gstStopDate: '',
    intRate: '',
    isTcsApplicable: 0,
    alias: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    countryId: '',
    stateId: '',
    districtId: '',
    cityId: '',
    postalCode: '',
    mobileNumber: '',
    officePhone: '',
    residencePhone: '',
    email: '',
    website: '',
    panNumber: '',
    tinNumber: '',
    tinNumber2: '',
    tinNumber3: '',
    tinNumberFrom2: '',
    tinNumberFrom3: '',
    gstNumber: '',
    taxRate: '',
    taxTypeCode: '',
    openingBalanceAmount: '',
    balanceType: 1,
    isActiveFlag: 1,
    isReverseChargeApplicableFlag: 0,
    isExportFlag: 0,
    shippingAddresses: [createShippingAddressRow()] as ShippingAddressRow[],
    contactPersons: [] as ContactPersonRow[],
    ledgerSalesTaxes: [] as LedgerSalesTaxRow[],
    extraFields: {} as Record<string, any>
  });

  const { data, loading, error, refetch } = useQuery(LEDGER_SUMMARIES, {
    variables: { search: '', limit: rowsPerPage, offset: first, sortField: 'name', sortOrder: 1 }
  });

  const { options: ledgerGroups } = useLedgerGroupOptions();
  const { options: areaOptions } = useAreaOptions();
  const { options: shippingCityOptions } = useGeoCityOptions();
  const { data: geoCountriesData } = useQuery(GEO_COUNTRIES, {
    variables: { search: null, limit: 2000 }
  });
  const { data: geoStatesData } = useQuery(GEO_STATES, {
    variables: { countryId: form.countryId ? Number(form.countryId) : null, search: null, limit: 2000 },
    skip: !form.countryId
  });
  const { data: geoDistrictsData } = useQuery(GEO_DISTRICTS, {
    variables: { stateId: form.stateId ? Number(form.stateId) : null, search: null, limit: 2000 },
    skip: !form.stateId
  });
  const { data: geoCitiesData } = useQuery(GEO_CITIES, {
    variables: {
      districtId: form.districtId ? Number(form.districtId) : null,
      stateId: form.stateId ? Number(form.stateId) : null,
      search: null,
      limit: 2000
    },
    skip: !form.districtId && !form.stateId
  });
  const [createLedger] = useMutation(CREATE_LEDGER);
  const [updateLedger] = useMutation(UPDATE_LEDGER);
  const [deleteLedger] = useMutation(DELETE_LEDGER);
  const [ensureLedgerYearBalance] = useMutation(ENSURE_LEDGER_YEAR_BALANCE);
  const toastRef = useRef<Toast>(null);
  const ensuredLedgerIdsRef = useRef<Set<number>>(new Set());
  const fiscalRange = useMemo(
    () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
    [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
  );

  const dtRef = useRef<DataTable<LedgerRow[]>>(null);
  const { permissions: masterPermissions } = useMasterActionPermissions(apollo);

  const assertActionAllowed = (action: MasterAction) => {
    if (isMasterActionAllowed(masterPermissions, action)) return true;
    toastRef.current?.show({
      severity: 'warn',
      summary: 'Permission Denied',
      detail: getMasterActionDeniedDetail(action)
    });
    return false;
  };

  const rows: LedgerRow[] = useMemo(() => data?.ledgerSummaries?.items ?? [], [data]);
  const totalRecords = data?.ledgerSummaries?.total ?? rows.length ?? 0;
  const currentFormDigest = useMemo(() => JSON.stringify(form), [form]);
  const isDryEditReady = useMemo(
    () => Boolean(editing && dryEditDigest && dryEditDigest === currentFormDigest),
    [currentFormDigest, dryEditDigest, editing]
  );
  const isEditingProtectedLedger = useMemo(
    () => isProtectedAccountingLedgerRow(editing),
    [editing]
  );
  const saveButtonLabel = useMemo(() => {
    if (saving) {
      if (!editing) return 'Saving...';
      return isDryEditReady ? 'Applying...' : 'Checking...';
    }
    if (!editing) return 'Save';
    return isDryEditReady ? 'Apply Changes' : 'Run Dry Check';
  }, [editing, isDryEditReady, saving]);

  const detailContactRows = useMemo(
    () => parseContactPersonsJson(detailRow?.contactPersonsJson),
    [detailRow?.contactPersonsJson]
  );
  const detailSalesTaxRows = useMemo(
    () => parseLedgerSalesTaxesJson(detailRow?.ledgerSalesTaxesJson),
    [detailRow?.ledgerSalesTaxesJson]
  );
  const detailShippingRows = useMemo(() => {
    if (!detailRow) return [];
    const parsedExtra = normalizeExtraFields(parseJsonValue(detailRow.extraFields ?? null) ?? {});
    return resolveShippingRows(detailRow, parsedExtra).filter(hasShippingAddressData);
  }, [detailRow]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setFirst(0);
      refetch({ search: search || null, limit: rowsPerPage, offset: 0, sortField, sortOrder });
    }, 400);
    return () => clearTimeout(handle);
  }, [search, rowsPerPage, sortField, sortOrder, refetch]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setFirst(0);
      refetch({ search: search || null, limit: rowsPerPage, offset: 0 });
    }
  };

  const geoCountries = geoCountriesData?.geoCountries ?? [];
  const geoStates = geoStatesData?.geoStates ?? [];
  const geoDistricts = geoDistrictsData?.geoDistricts ?? [];
  const geoCities = geoCitiesData?.geoCities ?? [];
  const areaOptionMap = useMemo(() => {
    const map = new Map<number, string>();
    areaOptions.forEach((option) => {
      map.set(option.areaId, option.label);
    });
    return map;
  }, [areaOptions]);
  const shippingCityOptionMap = useMemo(() => {
    const map = new Map<number, string>();
    shippingCityOptions.forEach((option) => {
      map.set(option.cityId, option.label);
    });
    return map;
  }, [shippingCityOptions]);
  const shippingCityDropdownOptions = useMemo(
    () =>
      shippingCityOptions.map((option) => ({
        label: option.label,
        value: String(option.cityId)
      })),
    [shippingCityOptions]
  );
  const areaOptionsForCity = useMemo(() => {
    const cityId = form.cityId ? Number(form.cityId) : null;
    if (!cityId) return areaOptions;
    return areaOptions.filter((option) => option.cityId == null || Number(option.cityId) === cityId);
  }, [areaOptions, form.cityId]);
  const selectedCountry = geoCountries.find((c: any) => c.countryId?.toString() === form.countryId);
  const selectedCountryCode = selectedCountry?.iso2 ?? null;
  const { data: fieldDefsData } = useQuery(FIELD_DEFINITIONS, {
    variables: { entity: 'ledger', countryCode: selectedCountryCode, limit: 500 }
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
  const renderError = (field: keyof typeof formErrors) =>
    formErrors[field] ? <small className="p-error">{formErrors[field]}</small> : null;

  const openNew = () => {
        setDryEditDigest('');
    if (!assertActionAllowed('add')) return;
    setEditing(null);
    setForm({
      name: '',
      ledgerGroupId: '',
      areaId: '',
      shipAddressLine1: '',
      shipAddressLine2: '',
      shipAddressLine3: '',
      shipCityId: '',
      shipPostalCode: '',
      shipOfficePhone: '',
      shipResidencePhone: '',
      shipMobileNumber: '',
      creditLimitNoOfDays: '',
      creditLimitNoOfBills: '',
      taxCalculation: '',
      taxNature: '',
      taxCapitalGoods: '',
      taxRoundOffSales: '',
      taxRoundOffPurchase: '',
      taxFPurchaseLedgerId: '',
      taxFSalesLedgerId: '',
      taxFSalesLedger2Id: '',
      taxAccountsUpdate: '',
      isGenerateBill: 0,
      typeOfParty: '',
      isPrintBill: 0,
      isTaxApplicable: 0,
      isStopGst: 0,
      gstStopDate: '',
      intRate: '',
      isTcsApplicable: 0,
      alias: '',
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      countryId: '',
      stateId: '',
      districtId: '',
      cityId: '',
      postalCode: '',
      mobileNumber: '',
      officePhone: '',
      residencePhone: '',
      email: '',
      website: '',
      panNumber: '',
      tinNumber: '',
      tinNumber2: '',
      tinNumber3: '',
      tinNumberFrom2: '',
      tinNumberFrom3: '',
      gstNumber: '',
      taxRate: '',
      taxTypeCode: '',
      openingBalanceAmount: '',
      balanceType: 1,
      isActiveFlag: 1,
      isReverseChargeApplicableFlag: 0,
      isExportFlag: 0,
      shippingAddresses: [createShippingAddressRow()],
      contactPersons: [],
      ledgerSalesTaxes: [],
      extraFields: {}
    });
    setFormErrors({});
    setDialogVisible(true);
  };

  const ensureLedgerYearBalanceFor = (ledgerId: number | null | undefined) => {
    if (!ledgerId) return;
    const targetId = Number(ledgerId);
    if (!Number.isFinite(targetId) || targetId <= 0) return;
    if (ensuredLedgerIdsRef.current.has(targetId)) return;
    ensuredLedgerIdsRef.current.add(targetId);
    ensureLedgerYearBalance({ variables: { ledgerId: targetId } }).catch(() => {
      ensuredLedgerIdsRef.current.delete(targetId);
    });
  };

  const openEdit = (row: LedgerRow | null) => {
        setDryEditDigest('');
    if (!row) return;
    if (!assertActionAllowed('edit')) return;
    ensureLedgerYearBalanceFor(row.ledgerId);
    setEditing(row);
    const normalizedExtraFields = normalizeExtraFields(parseJsonValue(row.extraFields ?? null) ?? {});
    const shippingAddresses = resolveShippingRows(row, normalizedExtraFields);
    setForm({
      name: row.name ?? '',
      ledgerGroupId: (row.ledgerGroupId ??
        ledgerGroups.find((g) => (g.name ?? g.label) === row.groupName)?.value ??
        '').toString(),
      areaId: row.areaId != null ? String(row.areaId) : '',
      shipAddressLine1: row.shipAddressLine1 ?? '',
      shipAddressLine2: row.shipAddressLine2 ?? '',
      shipAddressLine3: row.shipAddressLine3 ?? '',
      shipCityId: row.shipCityId != null ? String(row.shipCityId) : '',
      shipPostalCode: row.shipPostalCode ?? '',
      shipOfficePhone: row.shipOfficePhone ?? '',
      shipResidencePhone: row.shipResidencePhone ?? '',
      shipMobileNumber: row.shipMobileNumber ?? '',
      creditLimitNoOfDays:
        row.creditLimitNoOfDays != null ? String(row.creditLimitNoOfDays) : '',
      creditLimitNoOfBills:
        row.creditLimitNoOfBills != null ? String(row.creditLimitNoOfBills) : '',
      taxCalculation: row.taxCalculation != null ? String(row.taxCalculation) : '',
      taxNature: row.taxNature != null ? String(row.taxNature) : '',
      taxCapitalGoods: row.taxCapitalGoods != null ? String(row.taxCapitalGoods) : '',
      taxRoundOffSales: row.taxRoundOffSales != null ? String(row.taxRoundOffSales) : '',
      taxRoundOffPurchase: row.taxRoundOffPurchase != null ? String(row.taxRoundOffPurchase) : '',
      taxFPurchaseLedgerId:
        row.taxFPurchaseLedgerId != null ? String(row.taxFPurchaseLedgerId) : '',
      taxFSalesLedgerId:
        row.taxFSalesLedgerId != null ? String(row.taxFSalesLedgerId) : '',
      taxFSalesLedger2Id:
        row.taxFSalesLedger2Id != null ? String(row.taxFSalesLedger2Id) : '',
      taxAccountsUpdate: row.taxAccountsUpdate != null ? String(row.taxAccountsUpdate) : '',
      isGenerateBill: row.isGenerateBill ?? 0,
      typeOfParty: row.typeOfParty ?? '',
      isPrintBill: row.isPrintBill ?? 0,
      isTaxApplicable: row.isTaxApplicable ?? 0,
      isStopGst: row.isStopGst ?? 0,
      gstStopDate: row.gstStopDate ?? '',
      intRate: row.intRate != null ? String(row.intRate) : '',
      isTcsApplicable: row.isTcsApplicable ?? 0,
      alias: row.alias ?? '',
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      addressLine3: row.addressLine3 ?? '',
      countryId: (row.countryId ?? '').toString(),
      stateId: (row.stateId ?? '').toString(),
      districtId: (row.districtId ?? '').toString(),
      cityId: (row.cityId ?? '').toString(),
      postalCode: row.postalCode ?? '',
      mobileNumber: row.mobileNumber ?? '',
      officePhone: row.officePhone ?? '',
      residencePhone: row.residencePhone ?? '',
      email: row.email ?? '',
      website: row.website ?? '',
      panNumber: row.panNumber ?? '',
      tinNumber: row.tinNumber ?? '',
      tinNumber2: row.tinNumber2 ?? '',
      tinNumber3: row.tinNumber3 ?? '',
      tinNumberFrom2: row.tinNumberFrom2 ?? '',
      tinNumberFrom3: row.tinNumberFrom3 ?? '',
      gstNumber: row.gstNumber ?? '',
      taxRate: row.taxRate ?? '',
      taxTypeCode: row.taxTypeCode != null ? String(row.taxTypeCode) : '',
      openingBalanceAmount: row.openingBalanceAmount ?? '',
      balanceType: row.balanceType ?? 1,
      isActiveFlag: row.isActiveFlag ?? 1,
      isReverseChargeApplicableFlag: row.isReverseChargeApplicableFlag ?? 0,
      isExportFlag: row.isExportFlag ?? 0,
      shippingAddresses,
      contactPersons: parseContactPersonsJson(row.contactPersonsJson),
      ledgerSalesTaxes: parseLedgerSalesTaxesJson(row.ledgerSalesTaxesJson),
      extraFields: normalizedExtraFields
    });
    setFormErrors({});
    setDialogVisible(true);
    if (isProtectedAccountingLedgerRow(row)) {
      toastRef.current?.show({
        severity: 'info',
        summary: 'Accounting Rule Applied',
        detail:
          'This is a protected accounting ledger. Group, opening balance, Dr/Cr, and active state are read-only.',
        life: 6000
      });
    }
  };

  const openView = (row: LedgerRow | null) => {
    if (!row) return;
    if (!assertActionAllowed('view')) return;
    ensureLedgerYearBalanceFor(row.ledgerId);
    setDetailRow(row);
    setDetailVisible(true);
  };

  const handleSave = async () => {
    if (!assertActionAllowed(editing ? 'edit' : 'add')) return;
    const shippingErrors = buildShippingFieldErrors(form.shippingAddresses);
    const sanitizedShippingRows = sanitizeShippingRows(form.shippingAddresses);
    const primaryShippingAddress = sanitizedShippingRows[0] ?? null;
    const formForValidation = {
      ...form,
      shipAddressLine1: primaryShippingAddress?.addressLine1 ?? '',
      shipAddressLine2: primaryShippingAddress?.addressLine2 ?? '',
      shipAddressLine3: primaryShippingAddress?.addressLine3 ?? '',
      shipCityId:
        primaryShippingAddress?.cityId != null ? String(primaryShippingAddress.cityId) : '',
      shipPostalCode: primaryShippingAddress?.postalCode ?? '',
      shipOfficePhone: primaryShippingAddress?.officePhone ?? '',
      shipResidencePhone: primaryShippingAddress?.residencePhone ?? '',
      shipMobileNumber: primaryShippingAddress?.mobileNumber ?? ''
    };

    const parsed = ledgerSchema.safeParse(formForValidation);
    if (!parsed.success || Object.keys(shippingErrors).length > 0) {
      const nextErrors: Record<string, string> = {};
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            const errorKey = issue.path[0] as string;
            if (errorKey === 'shipCityId' || errorKey === 'shipMobileNumber') return;
            nextErrors[errorKey] = issue.message;
          }
        });
      }
      Object.assign(nextErrors, shippingErrors);
      setFormErrors(nextErrors);
      toastRef.current?.show({ severity: 'warn', summary: 'Please fix validation errors' });
      return;
    }

    const dynamicErrors: Record<string, string> = {};
    const extraFields = { ...normalizeExtraFields(form.extraFields) };
    if (sanitizedShippingRows.length > 0) {
      extraFields.shipAddresses = sanitizedShippingRows;
    } else {
      delete extraFields.shipAddresses;
    }
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

    if (!ensureDryEditCheck({
            isEditing: Boolean(editing),
            lastDigest: dryEditDigest,
            currentDigest: currentFormDigest,
            setLastDigest: setDryEditDigest,
            toastRef,
            entityLabel: 'record'
        })) return;

        setSaving(true);
    try {
      const vars = {
        name: form.name,
        ledgerGroupId: Number(form.ledgerGroupId),
        areaId: form.areaId ? Number(form.areaId) : null,
        shipAddressLine1: primaryShippingAddress?.addressLine1 || null,
        shipAddressLine2: primaryShippingAddress?.addressLine2 || null,
        shipAddressLine3: primaryShippingAddress?.addressLine3 || null,
        shipCityId: primaryShippingAddress?.cityId ?? null,
        shipPostalCode: primaryShippingAddress?.postalCode || null,
        shipOfficePhone: primaryShippingAddress?.officePhone || null,
        shipResidencePhone: primaryShippingAddress?.residencePhone || null,
        shipMobileNumber: primaryShippingAddress?.mobileNumber || null,
        creditLimitNoOfDays: form.creditLimitNoOfDays ? Number(form.creditLimitNoOfDays) : null,
        creditLimitNoOfBills: form.creditLimitNoOfBills ? Number(form.creditLimitNoOfBills) : null,
        taxCalculation: form.taxCalculation ? Number(form.taxCalculation) : null,
        taxNature: form.taxNature ? Number(form.taxNature) : null,
        taxCapitalGoods: form.taxCapitalGoods ? Number(form.taxCapitalGoods) : null,
        taxRoundOffSales: form.taxRoundOffSales ? Number(form.taxRoundOffSales) : null,
        taxRoundOffPurchase: form.taxRoundOffPurchase ? Number(form.taxRoundOffPurchase) : null,
        taxFPurchaseLedgerId: form.taxFPurchaseLedgerId ? Number(form.taxFPurchaseLedgerId) : null,
        taxFSalesLedgerId: form.taxFSalesLedgerId ? Number(form.taxFSalesLedgerId) : null,
        taxFSalesLedger2Id: form.taxFSalesLedger2Id ? Number(form.taxFSalesLedger2Id) : null,
        taxAccountsUpdate: form.taxAccountsUpdate ? Number(form.taxAccountsUpdate) : null,
        isGenerateBill: form.isGenerateBill ?? 0,
        typeOfParty: form.typeOfParty || null,
        isPrintBill: form.isPrintBill ?? 0,
        isTaxApplicable: form.isTaxApplicable ?? 0,
        isStopGst: form.isStopGst ?? 0,
        gstStopDate: form.gstStopDate || null,
        intRate: form.intRate ? Number(form.intRate) : null,
        isTcsApplicable: form.isTcsApplicable ?? 0,
        alias: form.alias || null,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        addressLine3: form.addressLine3 || null,
        countryId: form.countryId ? Number(form.countryId) : null,
        stateId: form.stateId ? Number(form.stateId) : null,
        districtId: form.districtId ? Number(form.districtId) : null,
        cityId: form.cityId ? Number(form.cityId) : null,
        postalCode: form.postalCode || null,
        mobileNumber: form.mobileNumber || null,
        officePhone: form.officePhone || null,
        residencePhone: form.residencePhone || null,
        email: form.email || null,
        website: form.website || null,
        panNumber: form.panNumber || null,
        tinNumber: form.tinNumber || null,
        tinNumber2: form.tinNumber2 || null,
        tinNumber3: form.tinNumber3 || null,
        tinNumberFrom2: form.tinNumberFrom2 || null,
        tinNumberFrom3: form.tinNumberFrom3 || null,
        contactPersonsJson: JSON.stringify(sanitizeContactPersons(form.contactPersons)),
        ledgerSalesTaxesJson: JSON.stringify(sanitizeLedgerSalesTaxes(form.ledgerSalesTaxes)),
        gstNumber: form.gstNumber || null,
        taxRate: form.taxRate ? Number(form.taxRate) : null,
        taxTypeCode: form.taxTypeCode ? Number(form.taxTypeCode) : null,
        isReverseChargeApplicableFlag: form.isReverseChargeApplicableFlag ?? 0,
        isExportFlag: form.isExportFlag ?? 0,
        openingBalanceAmount: form.openingBalanceAmount ? Number(form.openingBalanceAmount) : null,
        balanceType: form.balanceType ?? 1,
        isActiveFlag: form.isActiveFlag ?? 1,
        extraFields: JSON.stringify(extraFields)
      };

      if (editing) {
        await updateLedger({ variables: { ledgerId: editing.ledgerId, ...vars } });
      } else {
        await createLedger({ variables: vars });
      }

      invalidateAccountMasterLookups(apollo);
      await refetch();
      setDialogVisible(false);
      toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: 'Ledger saved successfully' });
    } catch (err: any) {
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: LedgerRow | null) => {
    if (!row) return;
    try {
      await deleteLedger({ variables: { ledgerId: row.ledgerId } });
      invalidateAccountMasterLookups(apollo);
      await refetch();
      toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Ledger deleted' });
    } catch (err: any) {
      const rawMessage = typeof err?.message === 'string' ? err.message : '';
      const detail =
        /protected accounting ledger|referenced in \d+ record/i.test(rawMessage)
          ? rawMessage
          : getDeleteFailureMessage(err, 'ledger');
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail });
    }
  };

  const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>, row: LedgerRow) => {
    if (!assertActionAllowed('delete')) return;
    if (isProtectedAccountingLedgerRow(row)) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: 'Protected accounting ledgers cannot be deleted.',
        life: 7000
      });
      return;
    }
    const impact = await fetchAccountsMasterDeleteImpact('LEDGER', row.ledgerId);
    if (!impact.canDelete) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: getDeleteBlockedMessage('ledger', impact),
        life: 7000
      });
      return;
    }

    toastRef.current?.show({
      severity: 'info',
      summary: 'Dry Delete Check Passed',
      detail: 'No references found. Confirm delete to execute the actual delete.',
      life: 4500
    });

    confirmPopup({
      target: event.currentTarget,
      message: `Dry Delete Check passed. ${getDeleteConfirmMessage('ledger')}`,
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      defaultFocus: 'none',
      dismissable: true,
      onShow: () => {
        setTimeout(() => {
          const rejectBtn = document.querySelector('.p-confirm-popup .p-confirm-popup-reject') as HTMLButtonElement | null;
          rejectBtn?.focus();
        }, 0);
      },
      accept: () => handleDelete(row)
    });
  };

  const addShippingAddress = () => {
    setForm((prev) => {
      if (prev.shippingAddresses.length >= MAX_SHIPPING_ADDRESSES) return prev;
      return {
        ...prev,
        shippingAddresses: [...prev.shippingAddresses, createShippingAddressRow()]
      };
    });
  };

  const updateShippingAddress = (
    rowId: string,
    patch: Partial<Omit<ShippingAddressRow, 'rowId'>>
  ) => {
    setForm((prev) => ({
      ...prev,
      shippingAddresses: prev.shippingAddresses.map((row) =>
        row.rowId === rowId ? { ...row, ...patch } : row
      )
    }));
  };

  const removeShippingAddress = (rowId: string) => {
    setForm((prev) => {
      if (prev.shippingAddresses.length <= 1) return prev;
      return {
        ...prev,
        shippingAddresses: prev.shippingAddresses.filter((row) => row.rowId !== rowId)
      };
    });
  };

  const addContactPerson = () => {
    setForm((prev) => ({
      ...prev,
      contactPersons: [...prev.contactPersons, createContactPersonRow()]
    }));
  };

  const updateContactPerson = (
    rowId: string,
    patch: Partial<Omit<ContactPersonRow, 'rowId'>>
  ) => {
    setForm((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.map((row) =>
        row.rowId === rowId ? { ...row, ...patch } : row
      )
    }));
  };

  const removeContactPerson = (rowId: string) => {
    setForm((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.filter((row) => row.rowId !== rowId)
    }));
  };

  const addLedgerSalesTax = () => {
    setForm((prev) => ({
      ...prev,
      ledgerSalesTaxes: [...prev.ledgerSalesTaxes, createLedgerSalesTaxRow()]
    }));
  };

  const updateLedgerSalesTax = (
    rowId: string,
    patch: Partial<Omit<LedgerSalesTaxRow, 'rowId'>>
  ) => {
    setForm((prev) => ({
      ...prev,
      ledgerSalesTaxes: prev.ledgerSalesTaxes.map((row) =>
        row.rowId === rowId ? { ...row, ...patch } : row
      )
    }));
  };

  const removeLedgerSalesTax = (rowId: string) => {
    setForm((prev) => ({
      ...prev,
      ledgerSalesTaxes: prev.ledgerSalesTaxes.filter((row) => row.rowId !== rowId)
    }));
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
            {renderError(errorKey as any)}
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
            {renderError(errorKey as any)}
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
            {renderError(errorKey as any)}
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
            {renderError(errorKey as any)}
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
            {renderError(errorKey as any)}
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-column gap-1">
            <label className="font-medium">
              {def.label} {requiredMark}
            </label>
            <AppInput
              value={value ?? ''}
              onChange={(e) => updateExtraField(def.key, e.target.value)}
              placeholder={def.label}
            />
            {renderError(errorKey as any)}
          </div>
        );
    }
  };

  return (
    <div className="card">
      <Toast ref={toastRef} />
      <ConfirmPopup />
      <div className="mb-3">
        <h2 className="m-0">{LABELS.pageTitle}</h2>
        <p className="mt-2 mb-0 text-600">{LABELS.pageSubtitle}</p>
      </div>

      {error && <p className="text-red-500 mb-3">Error loading ledgers: {error.message}</p>}

      <AppDataTable
        value={rows}
        ref={dtRef as any}
        className="ledger-table"
        paginator
        rows={rowsPerPage}
        stripedRows
        size="small"
        loading={loading}
        totalRecords={totalRecords}
        lazy
        first={first}
        dataKey="ledgerId"
        onPage={(e) => {
          setRowsPerPage(e.rows);
          setFirst(e.first);
          refetch({ search: search || null, limit: e.rows, offset: e.first, sortField, sortOrder });
        }}
        rowsPerPageOptions={[10, 20, 50]}
        selection={selectedRows}
        onSelectionChange={(e) => {
          const nextRows = (e.value as LedgerRow[]) ?? [];
          setSelectedRows(nextRows);
          nextRows.forEach((row) => ensureLedgerYearBalanceFor(row.ledgerId));
        }}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(e) => {
          const field = (e.sortField as string) || 'name';
          const order = e.sortOrder ?? 1;
          setSortField(field);
          setSortOrder(order);
          setFirst(0);
          refetch({ search: search || null, limit: rowsPerPage, offset: 0, sortField: field, sortOrder: order });
        }}
        onRowDoubleClick={(e) =>
          masterPermissions.canEdit ? openEdit(e.data as LedgerRow) : openView(e.data as LedgerRow)
        }
        headerLeft={
          <span className="p-input-icon-left" style={{ position: 'relative', minWidth: '320px' }}>
            <i className="pi pi-search" />
            <AppInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={LABELS.searchPlaceholder}
              style={{ paddingRight: '2.5rem', width: '100%' }}
            />
            {search && (
              <button
                type="button"
                className="p-link"
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => {
                  setSearch('');
                  setFirst(0);
                  refetch({ search: '', limit: rowsPerPage, offset: 0, sortField, sortOrder });
                }}
              >
                <i className="pi pi-times" />
              </button>
            )}
          </span>
        }
        headerRight={
          <>
            <Button
              label={LABELS.newButton}
              icon="pi pi-plus"
              className="p-button-primary"
              onClick={openNew}
              disabled={!masterPermissions.canAdd}
            />
            <Button label="Export" icon="pi pi-download" className="p-button-info" onClick={() => dtRef.current?.exportCSV()} />
            <Button label="Print" icon="pi pi-print" className="p-button-warning" onClick={() => window.print()} />
            <div className="text-600 text-sm">Showing {rows.length} of {totalRecords} records</div>
          </>
        }
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column field="name" header="Name" sortable />
        <Column
          header="Rules"
          body={(row: LedgerRow) =>
            isProtectedAccountingLedgerRow(row) ? <span className="text-orange-600 text-sm">Protected</span> : ''
          }
          style={{ width: '7rem' }}
        />
        <Column field="groupName" header="Group" sortable />
        <Column field="address" header="Address" sortable />
        <Column field="cityName" header="City" sortable />
        <Column field="stateName" header="State" sortable />
        <Column field="mobileNumber" header="Mobile" sortable />
        <Column field="gstNumber" header="GST No" sortable />
        <Column header="Opening Balance" body={balanceBody} style={{ textAlign: 'right' }} sortable />
        <Column header="Active" body={activeBody} style={{ width: '6rem' }} sortable />
        <Column
          header="Actions"
          body={(row: LedgerRow) => (
            <div className="flex gap-2">
              <Button
                icon="pi pi-eye"
                rounded
                text
                className="p-button-text"
                onClick={() => openView(row)}
                disabled={!masterPermissions.canView}
              />
              <Button
                icon="pi pi-pencil"
                rounded
                text
                className="p-button-primary p-button-text"
                onClick={() => openEdit(row)}
                disabled={!masterPermissions.canEdit}
              />
              <Button
                icon="pi pi-trash"
                rounded
                text
                className="p-button-danger p-button-text"
                onClick={(e) => { void confirmDelete(e, row); }}
                disabled={!masterPermissions.canDelete || isProtectedAccountingLedgerRow(row)}
                tooltip={isProtectedAccountingLedgerRow(row) ? 'Protected accounting ledger' : undefined}
                tooltipOptions={{ position: 'top' }}
              />
            </div>
          )}
          style={{ width: '8rem' }}
        />
      </AppDataTable>

      <Dialog
        header={editing ? LABELS.editDialog : LABELS.newDialog}
        visible={dialogVisible}
        style={{ width: '72rem', maxWidth: '96vw' }}
        modal
        onHide={() => setDialogVisible(false)}
      >
        <div className="flex flex-column gap-3">
          {editing && (
            <div
              className={`p-2 border-round text-sm ${
                isDryEditReady ? 'surface-100 text-green-700' : 'surface-100 text-700'
              }`}
            >
              {isDryEditReady
                ? 'Dry check passed. Click Apply Changes to save.'
                : 'Dry save flow: first click runs dry check, second click saves changes.'}
            </div>
          )}
          {editing && isEditingProtectedLedger && (
            <small className="text-600">
              Accounting rule: Group, Opening Balance, Dr/Cr, and Active fields are locked for protected ledgers.
            </small>
          )}
          <TabView className="ledger-master-form-tabs">
            <TabPanel header="General">
          <div className="flex flex-column gap-1">
            <label className="font-medium">
              {LABELS.form.name} <span className="p-error">*</span>
            </label>
            <AppInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ledger name"
            />
            {renderError('name')}
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">
              {LABELS.form.group} <span className="p-error">*</span>
            </label>
            <AppDropdown
              value={form.ledgerGroupId}
              options={ledgerGroups.map((g) => ({
                label: g.label,
                value: g.value?.toString()
              }))}
              onChange={(e) => setForm((f) => ({ ...f, ledgerGroupId: e.value }))}
              placeholder="Select group"
              filter
              showClear
              disabled={Boolean(editing) && isEditingProtectedLedger}
            />
            {renderError('ledgerGroupId')}
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Alias</label>
              <AppInput
                value={form.alias}
                onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
                placeholder="Short alias"
              />
              {renderError('alias')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Postal Code</label>
              <AppInput
                value={form.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                placeholder="Postal code"
              />
              {renderError('postalCode')}
            </span>
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Address Line 1</label>
            <AppInput
              value={form.addressLine1}
              onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
              placeholder="Street / Building"
            />
            {renderError('addressLine1')}
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Address Line 2</label>
            <AppInput
              value={form.addressLine2}
              onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
              placeholder="Area / Landmark"
            />
            {renderError('addressLine2')}
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Address Line 3</label>
            <AppInput
              value={form.addressLine3}
              onChange={(e) => setForm((f) => ({ ...f, addressLine3: e.target.value }))}
              placeholder="Additional details"
            />
            {renderError('addressLine3')}
          </div>
          <div className="flex align-items-center justify-content-between">
            <span className="font-medium text-700">Location</span>
            <Button
              label="Import from master"
              icon="pi pi-download"
              text
              size="small"
              onClick={() => setGeoImportVisible(true)}
            />
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Country</label>
              <AppDropdown
                value={form.countryId}
                options={geoCountries.map((c: any) => ({
                  label: `${c.name ?? ''}${c.iso2 ? ` (${c.iso2})` : ''}`,
                  value: c.countryId?.toString()
                }))}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    countryId: e.value ?? '',
                    stateId: '',
                    districtId: '',
                    cityId: '',
                    areaId: ''
                  }))
                }
                placeholder="Select country"
                filter
                showClear
              />
              {renderError('countryId')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">State</label>
              <AppDropdown
                value={form.stateId}
                options={geoStates.map((s: any) => ({
                  label: `${s.name ?? ''}${s.stateCode ? ` (${s.stateCode})` : ''}`,
                  value: s.stateId?.toString()
                }))}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stateId: e.value ?? '',
                    districtId: '',
                    cityId: '',
                    areaId: ''
                  }))
                }
                placeholder={form.countryId ? 'Select state' : 'Select country first'}
                filter
                showClear
                disabled={!form.countryId}
              />
              {renderError('stateId')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">District</label>
              <AppDropdown
                value={form.districtId}
                options={geoDistricts.map((d: any) => ({
                  label: d.name ?? String(d.districtId),
                  value: d.districtId?.toString()
                }))}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    districtId: e.value ?? '',
                    cityId: '',
                    areaId: ''
                  }))
                }
                placeholder={form.stateId ? 'Select district' : 'Select state first'}
                filter
                showClear
                disabled={!form.stateId}
              />
              {renderError('districtId')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">City</label>
              <AppDropdown
                value={form.cityId}
                options={geoCities.map((c: any) => ({
                  label: c.name ?? String(c.cityId),
                  value: c.cityId?.toString()
                }))}
                onChange={(e) => setForm((f) => ({ ...f, cityId: e.value ?? '', areaId: '' }))}
                placeholder={form.districtId ? 'Select city' : 'Select district first'}
                filter
                showClear
                disabled={!form.districtId}
              />
              {renderError('cityId')}
            </span>
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Area</label>
            <AppDropdown
              value={form.areaId}
              options={areaOptionsForCity.map((option) => ({
                label: option.label,
                value: String(option.areaId)
              }))}
              onChange={(e) => setForm((f) => ({ ...f, areaId: e.value ?? '' }))}
              placeholder={form.cityId ? 'Select area' : 'Select city first'}
              filter
              showClear
              disabled={!form.cityId}
            />
            {renderError('areaId')}
          </div>
            </TabPanel>
            <TabPanel header="Shipping & IDs">
          <div className="flex align-items-center justify-content-between">
            <span className="font-medium text-700">Shipping Details</span>
            <Button
              label="Add Address"
              icon="pi pi-plus"
              text
              size="small"
              onClick={addShippingAddress}
              disabled={form.shippingAddresses.length >= MAX_SHIPPING_ADDRESSES}
            />
          </div>
          {form.shippingAddresses.map((row, index) => (
            <div key={row.rowId} className="border-1 surface-border border-round p-2 flex flex-column gap-2">
              <div className="flex align-items-center justify-content-between">
                <span className="text-700 text-sm">Shipping Address #{index + 1}</span>
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  className="p-button-danger p-button-text"
                  onClick={() => removeShippingAddress(row.rowId)}
                  disabled={form.shippingAddresses.length <= 1}
                />
              </div>
              <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Ship Address Line 1</label>
                  <AppInput
                    value={row.addressLine1}
                    onChange={(e) =>
                      updateShippingAddress(row.rowId, { addressLine1: e.target.value })
                    }
                    placeholder="Shipping address line 1"
                  />
                </span>
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Ship Address Line 2</label>
                  <AppInput
                    value={row.addressLine2}
                    onChange={(e) =>
                      updateShippingAddress(row.rowId, { addressLine2: e.target.value })
                    }
                    placeholder="Shipping address line 2"
                  />
                </span>
              </div>
              <div className="flex flex-column gap-1">
                <label className="font-medium">Ship Address Line 3</label>
                <AppInput
                  value={row.addressLine3}
                  onChange={(e) =>
                    updateShippingAddress(row.rowId, { addressLine3: e.target.value })
                  }
                  placeholder="Shipping address line 3"
                />
              </div>
              <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Ship City</label>
                  <AppDropdown
                    value={row.cityId}
                    options={shippingCityDropdownOptions}
                    onChange={(e) =>
                      updateShippingAddress(row.rowId, { cityId: e.value ?? '' })
                    }
                    placeholder="Select shipping city"
                    filter
                    showClear
                  />
                  {renderError(`shippingAddresses.${row.rowId}.cityId` as keyof typeof formErrors)}
                </span>
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Ship Postal Code</label>
                  <AppInput
                    value={row.postalCode}
                    onChange={(e) =>
                      updateShippingAddress(row.rowId, { postalCode: e.target.value })
                    }
                    placeholder="Shipping postal code"
                  />
                </span>
              </div>
              <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Ship Office Phone</label>
                  <AppInput
                    value={row.officePhone}
                    onChange={(e) =>
                      updateShippingAddress(row.rowId, { officePhone: e.target.value })
                    }
                    placeholder="Shipping office phone"
                  />
                </span>
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Ship Residence Phone</label>
                  <AppInput
                    value={row.residencePhone}
                    onChange={(e) =>
                      updateShippingAddress(row.rowId, { residencePhone: e.target.value })
                    }
                    placeholder="Shipping residence phone"
                  />
                </span>
              </div>
              <div className="flex flex-column gap-1">
                <label className="font-medium">Ship Mobile</label>
                <small className="text-600">10-13 digits, numbers only.</small>
                <AppInput
                  value={row.mobileNumber}
                  onChange={(e) =>
                    updateShippingAddress(row.rowId, { mobileNumber: e.target.value })
                  }
                  placeholder="Shipping mobile"
                />
                {renderError(`shippingAddresses.${row.rowId}.mobileNumber` as keyof typeof formErrors)}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Credit Limit (Days)</label>
              <AppInput
                value={form.creditLimitNoOfDays}
                onChange={(e) => setForm((f) => ({ ...f, creditLimitNoOfDays: e.target.value }))}
                placeholder="No of days"
              />
              {renderError('creditLimitNoOfDays')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Credit Limit (Bills)</label>
              <AppInput
                value={form.creditLimitNoOfBills}
                onChange={(e) => setForm((f) => ({ ...f, creditLimitNoOfBills: e.target.value }))}
                placeholder="No of bills"
              />
              {renderError('creditLimitNoOfBills')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Office Phone</label>
              <AppInput
                value={form.officePhone}
                onChange={(e) => setForm((f) => ({ ...f, officePhone: e.target.value }))}
                placeholder="Office phone"
              />
              {renderError('officePhone')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Residence Phone</label>
              <AppInput
                value={form.residencePhone}
                onChange={(e) => setForm((f) => ({ ...f, residencePhone: e.target.value }))}
                placeholder="Residence phone"
              />
              {renderError('residencePhone')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">{LABELS.form.mobile}</label>
              <small className="text-600">10-13 digits, numbers only.</small>
              <AppInput
                value={form.mobileNumber}
                onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                placeholder="Mobile"
              />
              {renderError('mobileNumber')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">{LABELS.form.gst}</label>
              <small className="text-600">15 chars, A-Z/0-9 (GSTIN).</small>
              <AppInput
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
                placeholder="GST"
              />
              {renderError('gstNumber')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Email</label>
              <AppInput
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
              />
              {renderError('email')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Website</label>
              <AppInput
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="Website"
              />
              {renderError('website')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">PAN No</label>
              <AppInput
                value={form.panNumber}
                onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value }))}
                placeholder="PAN"
              />
              {renderError('panNumber')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">TIN No</label>
              <AppInput
                value={form.tinNumber}
                onChange={(e) => setForm((f) => ({ ...f, tinNumber: e.target.value }))}
                placeholder="TIN"
              />
              {renderError('tinNumber')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">TIN No 2</label>
              <AppInput
                value={form.tinNumber2}
                onChange={(e) => setForm((f) => ({ ...f, tinNumber2: e.target.value }))}
                placeholder="TIN No 2"
              />
              {renderError('tinNumber2')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">TIN No 3</label>
              <AppInput
                value={form.tinNumber3}
                onChange={(e) => setForm((f) => ({ ...f, tinNumber3: e.target.value }))}
                placeholder="TIN No 3"
              />
              {renderError('tinNumber3')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">TIN No From 2</label>
              <AppInput
                value={form.tinNumberFrom2}
                onChange={(e) => setForm((f) => ({ ...f, tinNumberFrom2: e.target.value }))}
                placeholder="TIN No From 2"
              />
              {renderError('tinNumberFrom2')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">TIN No From 3</label>
              <AppInput
                value={form.tinNumberFrom3}
                onChange={(e) => setForm((f) => ({ ...f, tinNumberFrom3: e.target.value }))}
                placeholder="TIN No From 3"
              />
              {renderError('tinNumberFrom3')}
            </span>
          </div>
            </TabPanel>
            <TabPanel header="Tax & Controls">
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Rate</label>
              <AppInput
                value={form.taxRate}
                onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                placeholder="Tax rate"
              />
              {renderError('taxRate')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Type Code</label>
              <AppInput
                value={form.taxTypeCode}
                onChange={(e) => setForm((f) => ({ ...f, taxTypeCode: e.target.value }))}
                placeholder="Tax type code"
              />
              {renderError('taxTypeCode')}
            </span>
          </div>
          <div className="flex align-items-center justify-content-between">
            <span className="font-medium text-700">Tax Configuration</span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Calculation</label>
              <AppInput
                value={form.taxCalculation}
                onChange={(e) => setForm((f) => ({ ...f, taxCalculation: e.target.value }))}
                placeholder="Tax calculation code"
              />
              {renderError('taxCalculation')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Nature</label>
              <AppInput
                value={form.taxNature}
                onChange={(e) => setForm((f) => ({ ...f, taxNature: e.target.value }))}
                placeholder="Tax nature code"
              />
              {renderError('taxNature')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Capital Goods</label>
              <AppInput
                value={form.taxCapitalGoods}
                onChange={(e) => setForm((f) => ({ ...f, taxCapitalGoods: e.target.value }))}
                placeholder="Tax capital goods flag/code"
              />
              {renderError('taxCapitalGoods')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Accounts Update</label>
              <AppInput
                value={form.taxAccountsUpdate}
                onChange={(e) => setForm((f) => ({ ...f, taxAccountsUpdate: e.target.value }))}
                placeholder="Tax accounts update flag/code"
              />
              {renderError('taxAccountsUpdate')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Round Off (Sales)</label>
              <AppInput
                value={form.taxRoundOffSales}
                onChange={(e) => setForm((f) => ({ ...f, taxRoundOffSales: e.target.value }))}
                placeholder="Sales round-off code"
              />
              {renderError('taxRoundOffSales')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Round Off (Purchase)</label>
              <AppInput
                value={form.taxRoundOffPurchase}
                onChange={(e) => setForm((f) => ({ ...f, taxRoundOffPurchase: e.target.value }))}
                placeholder="Purchase round-off code"
              />
              {renderError('taxRoundOffPurchase')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Purchase Ledger Id</label>
              <AppInput
                value={form.taxFPurchaseLedgerId}
                onChange={(e) => setForm((f) => ({ ...f, taxFPurchaseLedgerId: e.target.value }))}
                placeholder="Ledger id"
              />
              {renderError('taxFPurchaseLedgerId')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Tax Sales Ledger Id</label>
              <AppInput
                value={form.taxFSalesLedgerId}
                onChange={(e) => setForm((f) => ({ ...f, taxFSalesLedgerId: e.target.value }))}
                placeholder="Ledger id"
              />
              {renderError('taxFSalesLedgerId')}
            </span>
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Tax Sales Ledger 2 Id</label>
            <AppInput
              value={form.taxFSalesLedger2Id}
              onChange={(e) => setForm((f) => ({ ...f, taxFSalesLedger2Id: e.target.value }))}
              placeholder="Ledger id"
            />
            {renderError('taxFSalesLedger2Id')}
          </div>
          <div className="flex align-items-center justify-content-between">
            <span className="font-medium text-700">Operational Controls</span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Type Of Party</label>
              <AppInput
                value={form.typeOfParty}
                onChange={(e) => setForm((f) => ({ ...f, typeOfParty: e.target.value }))}
                placeholder="Type of party"
              />
              {renderError('typeOfParty')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">Interest Rate</label>
              <AppInput
                value={form.intRate}
                onChange={(e) => setForm((f) => ({ ...f, intRate: e.target.value }))}
                placeholder="Interest rate"
              />
              {renderError('intRate')}
            </span>
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">GST Stop Date</label>
            <AppDateInput
              value={parseStoredDateValue(form.gstStopDate)}
              onChange={(next) =>
                setForm((f) => ({ ...f, gstStopDate: formatDateForStorage(next) }))
              }
              placeholder="DD/MM/YYYY"
              disabled={form.isStopGst !== 1}
            />
            {renderError('gstStopDate')}
          </div>
          <div className="flex flex-wrap gap-4">
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-generate-bill-flag"
                checked={form.isGenerateBill === 1}
                onChange={(e) => setForm((f) => ({ ...f, isGenerateBill: e.checked ? 1 : 0 }))}
              />
              <label htmlFor="ledger-generate-bill-flag" className="font-medium">
                Generate Bill
              </label>
            </span>
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-print-bill-flag"
                checked={form.isPrintBill === 1}
                onChange={(e) => setForm((f) => ({ ...f, isPrintBill: e.checked ? 1 : 0 }))}
              />
              <label htmlFor="ledger-print-bill-flag" className="font-medium">
                Print Bill
              </label>
            </span>
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-tax-applicable-flag"
                checked={form.isTaxApplicable === 1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isTaxApplicable: e.checked ? 1 : 0 }))
                }
              />
              <label htmlFor="ledger-tax-applicable-flag" className="font-medium">
                Tax Applicable
              </label>
            </span>
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-stop-gst-flag"
                checked={form.isStopGst === 1}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isStopGst: e.checked ? 1 : 0,
                    gstStopDate: e.checked ? f.gstStopDate : ''
                  }))
                }
              />
              <label htmlFor="ledger-stop-gst-flag" className="font-medium">
                Stop GST
              </label>
            </span>
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-tcs-applicable-flag"
                checked={form.isTcsApplicable === 1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isTcsApplicable: e.checked ? 1 : 0 }))
                }
              />
              <label htmlFor="ledger-tcs-applicable-flag" className="font-medium">
                TCS Applicable
              </label>
            </span>
          </div>
            </TabPanel>
            <TabPanel header="Contacts & Extras">
          <div className="flex align-items-center justify-content-between">
            <span className="font-medium text-700">Contact Persons</span>
            <Button
              label="Add Contact"
              icon="pi pi-plus"
              text
              size="small"
              onClick={addContactPerson}
            />
          </div>
          {form.contactPersons.length === 0 && (
            <small className="text-600">No contact rows added.</small>
          )}
          {form.contactPersons.map((row, idx) => (
            <div key={row.rowId} className="border-1 surface-border border-round p-2 flex flex-column gap-2">
              <div className="flex align-items-center justify-content-between">
                <span className="text-700 text-sm">Contact #{idx + 1}</span>
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  className="p-button-danger p-button-text"
                  onClick={() => removeContactPerson(row.rowId)}
                />
              </div>
              <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Name</label>
                  <AppInput
                    value={row.name}
                    onChange={(e) =>
                      updateContactPerson(row.rowId, { name: e.target.value })
                    }
                    placeholder="Contact name"
                  />
                </span>
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Designation</label>
                  <AppInput
                    value={row.designation}
                    onChange={(e) =>
                      updateContactPerson(row.rowId, { designation: e.target.value })
                    }
                    placeholder="Designation"
                  />
                </span>
              </div>
              <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Mobile</label>
                  <AppInput
                    value={row.mobileNumber}
                    onChange={(e) =>
                      updateContactPerson(row.rowId, { mobileNumber: e.target.value })
                    }
                    placeholder="Mobile"
                  />
                </span>
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Email</label>
                  <AppInput
                    value={row.email}
                    onChange={(e) =>
                      updateContactPerson(row.rowId, { email: e.target.value })
                    }
                    placeholder="Email"
                  />
                </span>
              </div>
            </div>
          ))}
          <div className="flex align-items-center justify-content-between">
            <span className="font-medium text-700">Ledger Sales Taxes</span>
            <Button
              label="Add Tax Row"
              icon="pi pi-plus"
              text
              size="small"
              onClick={addLedgerSalesTax}
            />
          </div>
          {form.ledgerSalesTaxes.length === 0 && (
            <small className="text-600">No sales-tax rows added.</small>
          )}
          {form.ledgerSalesTaxes.map((row, idx) => (
            <div key={row.rowId} className="border-1 surface-border border-round p-2 flex flex-column gap-2">
              <div className="flex align-items-center justify-content-between">
                <span className="text-700 text-sm">Tax Row #{idx + 1}</span>
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  className="p-button-danger p-button-text"
                  onClick={() => removeLedgerSalesTax(row.rowId)}
                />
              </div>
              <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Tax Name</label>
                  <AppInput
                    value={row.taxName}
                    onChange={(e) =>
                      updateLedgerSalesTax(row.rowId, { taxName: e.target.value })
                    }
                    placeholder="Tax row name"
                  />
                </span>
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">GST No</label>
                  <AppInput
                    value={row.gstNumber}
                    onChange={(e) =>
                      updateLedgerSalesTax(row.rowId, { gstNumber: e.target.value })
                    }
                    placeholder="GST number"
                  />
                </span>
              </div>
              <div className="flex gap-2">
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Tax Rate</label>
                  <AppInput
                    value={row.taxRate}
                    onChange={(e) =>
                      updateLedgerSalesTax(row.rowId, { taxRate: e.target.value })
                    }
                    placeholder="Tax rate"
                  />
                </span>
                <span className="flex-1 flex flex-column gap-1">
                  <label className="font-medium">Effective Date</label>
                  <AppDateInput
                    value={parseStoredDateValue(row.effectiveDate)}
                    onChange={(next) =>
                      updateLedgerSalesTax(row.rowId, {
                        effectiveDate: formatDateForStorage(next)
                      })
                    }
                    placeholder="DD/MM/YYYY"
                  />
                </span>
              </div>
              <span className="flex align-items-center gap-2">
                <Checkbox
                  inputId={`ledger-sales-tax-active-${row.rowId}`}
                  checked={row.isActiveFlag === 1}
                  onChange={(e) =>
                    updateLedgerSalesTax(row.rowId, {
                      isActiveFlag: e.checked ? 1 : 0
                    })
                  }
                />
                <label htmlFor={`ledger-sales-tax-active-${row.rowId}`} className="font-medium">
                  Active
                </label>
              </span>
            </div>
          ))}
          {groupedFieldDefinitions.length > 0 && (
            <div className="flex flex-column gap-2">
              <span className="font-medium text-700">Additional Fields</span>
              {groupedFieldDefinitions.map((group) => (
                <div key={group.groupName} className="flex flex-column gap-2">
                  <span className="text-600 text-sm">{group.groupName}</span>
                  <div className="grid">
                    {group.definitions.map((def) => (
                      <div key={def.id} className="col-12 md:col-6">
                        {renderExtraField(def)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">{LABELS.form.openingBalance}</label>
              <small className="text-600">Numeric amount; select Dr/Cr on the right.</small>
              <AppInput
                value={form.openingBalanceAmount}
                onChange={(e) => setForm((f) => ({ ...f, openingBalanceAmount: e.target.value }))}
                placeholder="0.00"
                disabled={Boolean(editing) && isEditingProtectedLedger}
              />
              {renderError('openingBalanceAmount')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">{LABELS.form.drcr}</label>
              <AppDropdown
                value={form.balanceType}
                options={[
                  { label: 'Dr', value: 1 },
                  { label: 'Cr', value: -1 }
                ]}
                onChange={(e) => setForm((f) => ({ ...f, balanceType: e.value }))}
                placeholder="Select"
                disabled={Boolean(editing) && isEditingProtectedLedger}
              />
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-active-flag"
                checked={form.isActiveFlag === 1}
                onChange={(e) => setForm((f) => ({ ...f, isActiveFlag: e.checked ? 1 : 0 }))}
                disabled={Boolean(editing) && isEditingProtectedLedger}
              />
              <label htmlFor="ledger-active-flag" className="font-medium">
                Active
              </label>
            </span>
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-reverse-charge-flag"
                checked={form.isReverseChargeApplicableFlag === 1}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isReverseChargeApplicableFlag: e.checked ? 1 : 0
                  }))
                }
              />
              <label htmlFor="ledger-reverse-charge-flag" className="font-medium">
                Reverse Charge Applicable
              </label>
            </span>
            <span className="flex align-items-center gap-2">
              <Checkbox
                inputId="ledger-export-flag"
                checked={form.isExportFlag === 1}
                onChange={(e) => setForm((f) => ({ ...f, isExportFlag: e.checked ? 1 : 0 }))}
              />
              <label htmlFor="ledger-export-flag" className="font-medium">
                Export Ledger
              </label>
            </span>
          </div>
            </TabPanel>
          </TabView>
          <div className="flex gap-2">
            <Button
              label={saveButtonLabel}
              icon="pi pi-check"
              className="p-button-primary"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
            />
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setDialogVisible(false)}
            />
          </div>
        </div>
      </Dialog>

      <GeoImportDialog
        visible={geoImportVisible}
        onHide={() => setGeoImportVisible(false)}
        onApply={(selection) => {
          invalidateAccountMasterLookups(apollo);
          setForm((prev) => ({
            ...prev,
            countryId: selection.countryId ? String(selection.countryId) : prev.countryId,
            stateId: selection.stateId ? String(selection.stateId) : '',
            districtId: selection.districtId ? String(selection.districtId) : '',
            cityId: selection.cityId ? String(selection.cityId) : '',
            areaId: ''
          }));
        }}
        title="Import location from master"
      />

      <Dialog
        header="Ledger Details"
        visible={detailVisible}
        style={{ width: '32rem' }}
        modal
        onHide={() => setDetailVisible(false)}
      >
        {detailRow && (
        <div className="flex flex-column gap-2 text-600">
          <div><strong>Name:</strong> {detailRow.name ?? '-'}</div>
          <div><strong>Protected Accounting Ledger:</strong> {isProtectedAccountingLedgerRow(detailRow) ? 'Yes' : 'No'}</div>
          <div><strong>Alias:</strong> {detailRow.alias || '-'}</div>
          <div><strong>Group:</strong> {detailRow.groupName ?? '-'}</div>
          <div><strong>Address:</strong> {[detailRow.addressLine1, detailRow.addressLine2, detailRow.addressLine3].filter(Boolean).join(', ') || detailRow.address || '-'}</div>
          <div><strong>City:</strong> {detailRow.cityName || '-'}</div>
          <div><strong>Area:</strong> {detailRow.areaId ? areaOptionMap.get(detailRow.areaId) ?? `#${detailRow.areaId}` : '-'}</div>
          <div><strong>District:</strong> {detailRow.districtName || '-'}</div>
          <div><strong>State:</strong> {detailRow.stateName || '-'}</div>
          <div><strong>Country:</strong> {detailRow.countryName || '-'}</div>
          <div><strong>Postal Code:</strong> {detailRow.postalCode || '-'}</div>
          <div><strong>Mobile:</strong> {detailRow.mobileNumber || '-'}</div>
          <div><strong>Office Phone:</strong> {detailRow.officePhone || '-'}</div>
          <div><strong>Residence Phone:</strong> {detailRow.residencePhone || '-'}</div>
          <div><strong>Email:</strong> {detailRow.email || '-'}</div>
          <div><strong>Website:</strong> {detailRow.website || '-'}</div>
          <div><strong>PAN No:</strong> {detailRow.panNumber || '-'}</div>
          <div><strong>TIN No:</strong> {detailRow.tinNumber || '-'}</div>
          <div><strong>TIN No 2:</strong> {detailRow.tinNumber2 || '-'}</div>
          <div><strong>TIN No 3:</strong> {detailRow.tinNumber3 || '-'}</div>
          <div><strong>TIN No From 2:</strong> {detailRow.tinNumberFrom2 || '-'}</div>
          <div><strong>TIN No From 3:</strong> {detailRow.tinNumberFrom3 || '-'}</div>
          <div><strong>GST No:</strong> {detailRow.gstNumber || '-'}</div>
          <div><strong>Shipping Addresses:</strong> {detailShippingRows.length || '-'}</div>
          {detailShippingRows.map((row, idx) => (
            <div key={row.rowId}>
              <strong>Ship #{idx + 1}:</strong>{' '}
              {[
                [row.addressLine1, row.addressLine2, row.addressLine3].filter(Boolean).join(', '),
                row.cityId
                  ? shippingCityOptionMap.get(Number(row.cityId)) ?? `#${row.cityId}`
                  : '',
                row.postalCode ? `PIN ${row.postalCode}` : '',
                row.officePhone ? `Office ${row.officePhone}` : '',
                row.residencePhone ? `Residence ${row.residencePhone}` : '',
                row.mobileNumber ? `Mobile ${row.mobileNumber}` : ''
              ]
                .filter(Boolean)
                .join(' | ') || '-'}
            </div>
          ))}
          <div><strong>Credit Limit (Days):</strong> {detailRow.creditLimitNoOfDays ?? '-'}</div>
          <div><strong>Credit Limit (Bills):</strong> {detailRow.creditLimitNoOfBills ?? '-'}</div>
          <div><strong>Tax Rate:</strong> {detailRow.taxRate || '-'}</div>
          <div><strong>Tax Type Code:</strong> {detailRow.taxTypeCode ?? '-'}</div>
          <div><strong>Tax Calculation:</strong> {detailRow.taxCalculation ?? '-'}</div>
          <div><strong>Tax Nature:</strong> {detailRow.taxNature ?? '-'}</div>
          <div><strong>Tax Capital Goods:</strong> {detailRow.taxCapitalGoods ?? '-'}</div>
          <div><strong>Tax Round Off (Sales):</strong> {detailRow.taxRoundOffSales ?? '-'}</div>
          <div><strong>Tax Round Off (Purchase):</strong> {detailRow.taxRoundOffPurchase ?? '-'}</div>
          <div><strong>Tax Purchase Ledger Id:</strong> {detailRow.taxFPurchaseLedgerId ?? '-'}</div>
          <div><strong>Tax Sales Ledger Id:</strong> {detailRow.taxFSalesLedgerId ?? '-'}</div>
          <div><strong>Tax Sales Ledger 2 Id:</strong> {detailRow.taxFSalesLedger2Id ?? '-'}</div>
          <div><strong>Tax Accounts Update:</strong> {detailRow.taxAccountsUpdate ?? '-'}</div>
          <div><strong>Generate Bill:</strong> {detailRow.isGenerateBill === 1 ? 'Yes' : 'No'}</div>
          <div><strong>Type Of Party:</strong> {detailRow.typeOfParty || '-'}</div>
          <div><strong>Print Bill:</strong> {detailRow.isPrintBill === 1 ? 'Yes' : 'No'}</div>
          <div><strong>Tax Applicable:</strong> {detailRow.isTaxApplicable === 1 ? 'Yes' : 'No'}</div>
          <div><strong>Stop GST:</strong> {detailRow.isStopGst === 1 ? 'Yes' : 'No'}</div>
          <div><strong>GST Stop Date:</strong> {detailRow.gstStopDate || '-'}</div>
          <div><strong>Interest Rate:</strong> {detailRow.intRate ?? '-'}</div>
          <div><strong>TCS Applicable:</strong> {detailRow.isTcsApplicable === 1 ? 'Yes' : 'No'}</div>
          <div><strong>Contact Persons:</strong> {detailContactRows.length}</div>
          {detailContactRows.map((row, idx) => (
            <div key={row.rowId}>
              <strong>Contact #{idx + 1}:</strong>{' '}
              {[row.name, row.designation, row.mobileNumber, row.email].filter(Boolean).join(' | ') || '-'}
            </div>
          ))}
          <div><strong>Ledger Sales Taxes:</strong> {detailSalesTaxRows.length}</div>
          {detailSalesTaxRows.map((row, idx) => (
            <div key={row.rowId}>
              <strong>Tax Row #{idx + 1}:</strong>{' '}
              {[
                row.taxName,
                row.gstNumber,
                row.taxRate ? `Rate ${row.taxRate}` : '',
                row.effectiveDate,
                row.isActiveFlag === 1 ? 'Active' : 'Inactive'
              ]
                .filter(Boolean)
                .join(' | ') || '-'}
            </div>
          ))}
          <div><strong>Reverse Charge Applicable:</strong> {detailRow.isReverseChargeApplicableFlag === 1 ? 'Yes' : 'No'}</div>
          <div><strong>Export Ledger:</strong> {detailRow.isExportFlag === 1 ? 'Yes' : 'No'}</div>
          <div><strong>Opening Balance:</strong> {balanceBody(detailRow)}</div>
          <div><strong>Active:</strong> {activeBody(detailRow)}</div>
        </div>
        )}
      </Dialog>
    </div>
  );
}
