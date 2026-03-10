'use client';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { confirmPopup, ConfirmPopup } from 'primereact/confirmpopup';
import { TabPanel, TabView } from 'primereact/tabview';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import AppDataTable from '@/components/AppDataTable';
import AppInput from '@/components/AppInput';
import GeoImportDialog from '@/components/GeoImportDialog';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid, MasterDetailSection } from '@/components/MasterDetailLayout';
import { useApolloClient, useQuery, useMutation, gql } from '@apollo/client';
import { z } from 'zod';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { useAreaOptions } from '@/lib/accounts/areas';
import { useGeoCityOptions } from '@/lib/accounts/cities';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { validateSingleDate } from '@/lib/reportDateValidation';
import {
  ACCOUNT_MASTER_QUERY_OPTIONS,
  invalidateAccountMasterLookups
} from '@/lib/accounts/masterLookupCache';
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchAccountsMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
import {
  getMasterActionDeniedDetail,
  isMasterActionAllowed,
  type MasterAction,
  useMasterActionPermissions
} from '@/lib/masterActionPermissions';
import { ensureDryEditCheck } from '@/lib/masterDryRun';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import {
  confirmMasterDialogClose,
  focusElementByIdNextFrame,
  getMasterSaveButtonLabel
} from '@/lib/masterFormDialog';
import { MASTER_DETAIL_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';
import { LedgerContactsExtrasTab } from './components/LedgerContactsExtrasTab';
import { LedgerGeneralTab } from './components/LedgerGeneralTab';
import { LedgerShippingIdsTab } from './components/LedgerShippingIdsTab';
import { LedgerTaxControlsTab } from './components/LedgerTaxControlsTab';
import { parseExtraDateValue } from './ledgerFormDate';
import type {
  ContactPersonRow,
  FieldDefinition,
  FieldDefinitionGroup,
  LedgerDropdownOption,
  LedgerFormState,
  LedgerRow,
  LedgerSalesTaxRow,
  SerializedShippingAddress,
  ShippingAddressRow
} from './ledgerFormTypes';

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

const LEDGER_OPTIONS = gql`
  query LedgerOptions($search: String, $limit: Int) {
    ledgerOptions(search: $search, limit: $limit) {
      ledgerId
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
  pageSubtitle: 'Maintain ledger accounts used across billing and accounts.',
  searchPlaceholder: 'Search by name and press Enter',
  newButton: 'New Ledger',
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

const createInitialLedgerFormState = (): LedgerFormState => ({
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
  const ledgerNameInputId = 'ledger-name-input';
  const ledgerGroupInputId = 'ledger-group-input';
  const ledgerAliasInputId = 'ledger-alias-input';
  const ledgerPostalCodeInputId = 'ledger-postal-code-input';
  const ledgerAddress1InputId = 'ledger-address-line-1-input';
  const ledgerAddress2InputId = 'ledger-address-line-2-input';
  const ledgerAddress3InputId = 'ledger-address-line-3-input';
  const ledgerCountryInputId = 'ledger-country-input';
  const ledgerStateInputId = 'ledger-state-input';
  const ledgerDistrictInputId = 'ledger-district-input';
  const ledgerCityInputId = 'ledger-city-input';
  const ledgerAreaInputId = 'ledger-area-input';
  const ledgerCreditLimitDaysInputId = 'ledger-credit-limit-days-input';
  const ledgerCreditLimitBillsInputId = 'ledger-credit-limit-bills-input';
  const ledgerOfficePhoneInputId = 'ledger-office-phone-input';
  const ledgerResidencePhoneInputId = 'ledger-residence-phone-input';
  const ledgerMobileInputId = 'ledger-mobile-input';
  const ledgerGstInputId = 'ledger-gst-input';
  const ledgerEmailInputId = 'ledger-email-input';
  const ledgerWebsiteInputId = 'ledger-website-input';
  const ledgerPanInputId = 'ledger-pan-input';
  const ledgerTinInputId = 'ledger-tin-input';
  const ledgerTin2InputId = 'ledger-tin-2-input';
  const ledgerTin3InputId = 'ledger-tin-3-input';
  const ledgerTinFrom2InputId = 'ledger-tin-from-2-input';
  const ledgerTinFrom3InputId = 'ledger-tin-from-3-input';
  const ledgerTaxRateInputId = 'ledger-tax-rate-input';
  const ledgerTaxTypeCodeInputId = 'ledger-tax-type-code-input';
  const ledgerTaxCalculationInputId = 'ledger-tax-calculation-input';
  const ledgerTaxNatureInputId = 'ledger-tax-nature-input';
  const ledgerTaxCapitalGoodsInputId = 'ledger-tax-capital-goods-input';
  const ledgerTaxAccountsUpdateInputId = 'ledger-tax-accounts-update-input';
  const ledgerTaxRoundOffSalesInputId = 'ledger-tax-round-off-sales-input';
  const ledgerTaxRoundOffPurchaseInputId = 'ledger-tax-round-off-purchase-input';
  const ledgerTaxPurchaseLedgerInputId = 'ledger-tax-purchase-ledger-input';
  const ledgerTaxSalesLedgerInputId = 'ledger-tax-sales-ledger-input';
  const ledgerTaxSalesLedger2InputId = 'ledger-tax-sales-ledger-2-input';
  const ledgerPartyTypeInputId = 'ledger-party-type-input';
  const ledgerInterestRateInputId = 'ledger-interest-rate-input';
  const ledgerGstStopDateInputId = 'ledger-gst-stop-date-input';
  const ledgerOpeningBalanceInputId = 'ledger-opening-balance-input';
  const ledgerBalanceTypeInputId = 'ledger-balance-type-input';
  const ledgerSaveButtonId = 'ledger-save-button';

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
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [initialFormDigest, setInitialFormDigest] = useState('');
  const [form, setForm] = useState<LedgerFormState>(() => createInitialLedgerFormState());

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
  const { data: ledgerOptionsData, error: ledgerOptionsError } = useQuery(LEDGER_OPTIONS, {
    variables: { limit: 2000 },
    ...ACCOUNT_MASTER_QUERY_OPTIONS
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
  const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
  const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);
  const totalRecords = data?.ledgerSummaries?.total ?? rows.length ?? 0;
  const currentFormDigest = useMemo(() => JSON.stringify(form), [form]);
  const isFormDirty = useMemo(() => currentFormDigest !== initialFormDigest, [currentFormDigest, initialFormDigest]);
  const isDryEditReady = useMemo(
    () => Boolean(editing && dryEditDigest && dryEditDigest === currentFormDigest),
    [currentFormDigest, dryEditDigest, editing]
  );
  const isEditingProtectedLedger = useMemo(
    () => isProtectedAccountingLedgerRow(editing),
    [editing]
  );
  const saveButtonLabel = useMemo(
    () => getMasterSaveButtonLabel(Boolean(editing), saving, isDryEditReady),
    [editing, isDryEditReady, saving]
  );

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

  const closeDialog = () => {
    confirmMasterDialogClose({
      saving,
      isDirty: isFormDirty,
      onDiscard: () => {
        setDialogVisible(false);
        setFormErrors({});
      }
    });
  };

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
    (): LedgerDropdownOption[] =>
      shippingCityOptions.map((option) => ({
        label: option.label,
        value: String(option.cityId)
      })),
    [shippingCityOptions]
  );
  const ledgerTaxLedgerOptions = useMemo(
    (): LedgerDropdownOption[] =>
      ((ledgerOptionsData?.ledgerOptions ?? []) as Array<{ ledgerId: number; name: string | null }>)
        .map((ledger) => ({
          label: ledger.name?.trim() || `Ledger #${ledger.ledgerId}`,
          value: String(ledger.ledgerId)
        })),
    [ledgerOptionsData]
  );
  const ledgerOptionLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    ledgerTaxLedgerOptions.forEach((option) => {
      const ledgerId = Number(option.value);
      if (!Number.isFinite(ledgerId)) return;
      map.set(ledgerId, option.label);
    });
    return map;
  }, [ledgerTaxLedgerOptions]);
  const ledgerGroupDropdownOptions = useMemo(
    (): LedgerDropdownOption[] =>
      ledgerGroups
        .map((group) => ({
          label: group.label,
          value: group.value?.toString() ?? ''
        }))
        .filter((option) => option.value.length > 0),
    [ledgerGroups]
  );
  const countryDropdownOptions = useMemo(
    (): LedgerDropdownOption[] =>
      geoCountries.map((country: any) => ({
        label: `${country.name ?? ''}${country.iso2 ? ` (${country.iso2})` : ''}`,
        value: country.countryId?.toString() ?? ''
      })),
    [geoCountries]
  );
  const stateDropdownOptions = useMemo(
    (): LedgerDropdownOption[] =>
      geoStates.map((state: any) => ({
        label: `${state.name ?? ''}${state.stateCode ? ` (${state.stateCode})` : ''}`,
        value: state.stateId?.toString() ?? ''
      })),
    [geoStates]
  );
  const districtDropdownOptions = useMemo(
    (): LedgerDropdownOption[] =>
      geoDistricts.map((district: any) => ({
        label: district.name ?? String(district.districtId),
        value: district.districtId?.toString() ?? ''
      })),
    [geoDistricts]
  );
  const cityDropdownOptions = useMemo(
    (): LedgerDropdownOption[] =>
      geoCities.map((city: any) => ({
        label: city.name ?? String(city.cityId),
        value: city.cityId?.toString() ?? ''
      })),
    [geoCities]
  );
  const areaOptionsForCity = useMemo(() => {
    const cityId = form.cityId ? Number(form.cityId) : null;
    if (!cityId) return areaOptions;
    return areaOptions.filter((option) => option.cityId == null || Number(option.cityId) === cityId);
  }, [areaOptions, form.cityId]);
  const areaDropdownOptions = useMemo(
    (): LedgerDropdownOption[] =>
      areaOptionsForCity.map((option) => ({
        label: option.label,
        value: String(option.areaId)
      })),
    [areaOptionsForCity]
  );
  const selectedCountry = geoCountries.find((c: any) => c.countryId?.toString() === form.countryId);
  const selectedCountryCode = selectedCountry?.iso2 ?? null;
  const { data: fieldDefsData } = useQuery(FIELD_DEFINITIONS, {
    variables: { entity: 'ledger', countryCode: selectedCountryCode, limit: 500 }
  });
  const fieldDefinitions: FieldDefinition[] = useMemo(
    () => (fieldDefsData?.fieldDefinitions ?? []) as FieldDefinition[],
    [fieldDefsData]
  );
  const groupedFieldDefinitions = useMemo<FieldDefinitionGroup[]>(() => {
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
  const updateForm = (patch: Partial<LedgerFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const openNew = () => {
    setDryEditDigest('');
    if (!assertActionAllowed('add')) return;
    setEditing(null);
    setForm(createInitialLedgerFormState());
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

  const navigateEditRecord = (direction: MasterDialogDirection) => {
    const nextRow = getMasterRowByDirection(rows, editingIndex, direction);
    if (!nextRow) return;
    openEdit(nextRow);
  };

  const navigateDetailRecord = (direction: MasterDialogDirection) => {
    const nextRow = getMasterRowByDirection(rows, detailIndex, direction);
    if (!nextRow) return;
    openView(nextRow);
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
      setInitialFormDigest(currentFormDigest);
      if (!isBulkMode) {
        setDialogVisible(false);
      }
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
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      defaultFocus: 'reject',
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

  return (
    <div className="card">
      <Toast ref={toastRef} />
      <ConfirmDialog />
      <ConfirmPopup />
      <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3">
        <div>
          <h2 className="m-0">{LABELS.pageTitle}</h2>
          <p className="mt-2 mb-0 text-600">{LABELS.pageSubtitle}</p>
        </div>
        <div className="flex justify-content-end">
          <AppHelpDialogButton {...getMasterPageHelp('ledgers')} buttonAriaLabel="Open Ledgers help" />
        </div>
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
              className="app-action-compact"
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
        onShow={() => {
          setInitialFormDigest(currentFormDigest);
          focusElementByIdNextFrame(ledgerNameInputId);
        }}
        onHide={closeDialog}
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
              <LedgerGeneralTab
                form={form}
                formErrors={formErrors}
                isEditingProtectedLedger={Boolean(editing) && isEditingProtectedLedger}
                ledgerGroupOptions={ledgerGroupDropdownOptions}
                countryOptions={countryDropdownOptions}
                stateOptions={stateDropdownOptions}
                districtOptions={districtDropdownOptions}
                cityOptions={cityDropdownOptions}
                areaOptions={areaDropdownOptions}
                fieldIds={{
                  ledgerName: ledgerNameInputId,
                  ledgerGroup: ledgerGroupInputId,
                  ledgerAlias: ledgerAliasInputId,
                  ledgerPostalCode: ledgerPostalCodeInputId,
                  ledgerAddress1: ledgerAddress1InputId,
                  ledgerAddress2: ledgerAddress2InputId,
                  ledgerAddress3: ledgerAddress3InputId,
                  ledgerCountry: ledgerCountryInputId,
                  ledgerState: ledgerStateInputId,
                  ledgerDistrict: ledgerDistrictInputId,
                  ledgerCity: ledgerCityInputId,
                  ledgerArea: ledgerAreaInputId,
                  ledgerSave: ledgerSaveButtonId
                }}
                labels={{
                  name: LABELS.form.name,
                  group: LABELS.form.group
                }}
                onFormChange={updateForm}
                onOpenGeoImport={() => setGeoImportVisible(true)}
              />
            </TabPanel>
            <TabPanel header="Shipping & IDs">
              <LedgerShippingIdsTab
                form={form}
                formErrors={formErrors}
                maxShippingAddresses={MAX_SHIPPING_ADDRESSES}
                shippingCityOptions={shippingCityDropdownOptions}
                labels={{
                  mobile: LABELS.form.mobile,
                  gst: LABELS.form.gst
                }}
                fieldIds={{
                  creditLimitDays: ledgerCreditLimitDaysInputId,
                  creditLimitBills: ledgerCreditLimitBillsInputId,
                  officePhone: ledgerOfficePhoneInputId,
                  residencePhone: ledgerResidencePhoneInputId,
                  mobile: ledgerMobileInputId,
                  gst: ledgerGstInputId,
                  email: ledgerEmailInputId,
                  website: ledgerWebsiteInputId,
                  pan: ledgerPanInputId,
                  tin: ledgerTinInputId,
                  tin2: ledgerTin2InputId,
                  tin3: ledgerTin3InputId,
                  tinFrom2: ledgerTinFrom2InputId,
                  tinFrom3: ledgerTinFrom3InputId,
                  save: ledgerSaveButtonId
                }}
                onFormChange={updateForm}
                onAddShippingAddress={addShippingAddress}
                onUpdateShippingAddress={updateShippingAddress}
                onRemoveShippingAddress={removeShippingAddress}
              />
            </TabPanel>
            <TabPanel header="Tax & Controls">
              <LedgerTaxControlsTab
                form={form}
                formErrors={formErrors}
                ledgerOptions={ledgerTaxLedgerOptions}
                ledgerOptionsErrorMessage={ledgerOptionsError?.message ?? null}
                fieldIds={{
                  taxRate: ledgerTaxRateInputId,
                  taxTypeCode: ledgerTaxTypeCodeInputId,
                  taxCalculation: ledgerTaxCalculationInputId,
                  taxNature: ledgerTaxNatureInputId,
                  taxCapitalGoods: ledgerTaxCapitalGoodsInputId,
                  taxAccountsUpdate: ledgerTaxAccountsUpdateInputId,
                  taxRoundOffSales: ledgerTaxRoundOffSalesInputId,
                  taxRoundOffPurchase: ledgerTaxRoundOffPurchaseInputId,
                  taxPurchaseLedger: ledgerTaxPurchaseLedgerInputId,
                  taxSalesLedger: ledgerTaxSalesLedgerInputId,
                  taxSalesLedger2: ledgerTaxSalesLedger2InputId,
                  partyType: ledgerPartyTypeInputId,
                  interestRate: ledgerInterestRateInputId,
                  gstStopDate: ledgerGstStopDateInputId,
                  save: ledgerSaveButtonId
                }}
                onFormChange={updateForm}
              />
            </TabPanel>
            <TabPanel header="Contacts & Extras">
              <LedgerContactsExtrasTab
                form={form}
                formErrors={formErrors}
                fiscalRange={fiscalRange}
                groupedFieldDefinitions={groupedFieldDefinitions}
                labels={{
                  openingBalance: LABELS.form.openingBalance,
                  drcr: LABELS.form.drcr
                }}
                fieldIds={{
                  openingBalance: ledgerOpeningBalanceInputId,
                  balanceType: ledgerBalanceTypeInputId,
                  save: ledgerSaveButtonId
                }}
                isEditingProtectedLedger={isEditingProtectedLedger}
                isEditing={Boolean(editing)}
                extraValues={extraValues}
                onFormChange={updateForm}
                onAddContactPerson={addContactPerson}
                onUpdateContactPerson={updateContactPerson}
                onRemoveContactPerson={removeContactPerson}
                onAddLedgerSalesTax={addLedgerSalesTax}
                onUpdateLedgerSalesTax={updateLedgerSalesTax}
                onRemoveLedgerSalesTax={removeLedgerSalesTax}
                onUpdateExtraField={updateExtraField}
              />
            </TabPanel>
          </TabView>
          <MasterEditDialogFooter
            index={editingIndex}
            total={rows.length}
            onNavigate={navigateEditRecord}
            navigateDisabled={saving}
            bulkMode={{
              checked: isBulkMode,
              onChange: setIsBulkMode,
              onLabel: 'Bulk',
              offLabel: 'Standard',
              disabled: saving
            }}
            onCancel={closeDialog}
            cancelDisabled={saving}
            onSave={handleSave}
            saveDisabled={saving || !isFormDirty}
            saveLabel={saveButtonLabel}
            saveButtonId={ledgerSaveButtonId}
          />
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
        style={{ width: MASTER_DETAIL_DIALOG_WIDTHS.wide }}
        modal
        onHide={() => setDetailVisible(false)}
        footer={
          <MasterDetailDialogFooter
            index={detailIndex}
            total={rows.length}
            onNavigate={navigateDetailRecord}
            onClose={() => setDetailVisible(false)}
          />
        }
      >
        {detailRow && (
        <div className="flex flex-column gap-3">
          <MasterDetailSection title="Basic Info">
            <MasterDetailGrid columns={2}>
              <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
              <MasterDetailCard label="Alias" value={detailRow.alias || '-'} />
              <MasterDetailCard label="Protected Accounting Ledger" value={isProtectedAccountingLedgerRow(detailRow) ? 'Yes' : 'No'} />
              <MasterDetailCard label="Group" value={detailRow.groupName ?? '-'} />
              <MasterDetailCard label="Type Of Party" value={detailRow.typeOfParty || '-'} />
              <MasterDetailCard label="Opening Balance" value={balanceBody(detailRow) || '-'} />
              <MasterDetailCard label="Active" value={activeBody(detailRow) || '-'} />
            </MasterDetailGrid>
          </MasterDetailSection>
          <MasterDetailSection title="Address & Contact">
            <MasterDetailGrid columns={2}>
              <MasterDetailCard
                label="Address"
                value={[detailRow.addressLine1, detailRow.addressLine2, detailRow.addressLine3].filter(Boolean).join(', ') || detailRow.address || '-'}
              />
              <MasterDetailCard label="Area" value={detailRow.areaId ? areaOptionMap.get(detailRow.areaId) ?? `#${detailRow.areaId}` : '-'} />
              <MasterDetailCard label="City" value={detailRow.cityName || '-'} />
              <MasterDetailCard label="District" value={detailRow.districtName || '-'} />
              <MasterDetailCard label="State" value={detailRow.stateName || '-'} />
              <MasterDetailCard label="Country" value={detailRow.countryName || '-'} />
              <MasterDetailCard label="Postal Code" value={detailRow.postalCode || '-'} />
              <MasterDetailCard label="Mobile" value={detailRow.mobileNumber || '-'} />
              <MasterDetailCard label="Office Phone" value={detailRow.officePhone || '-'} />
              <MasterDetailCard label="Residence Phone" value={detailRow.residencePhone || '-'} />
              <MasterDetailCard label="Email" value={detailRow.email || '-'} />
              <MasterDetailCard label="Website" value={detailRow.website || '-'} />
            </MasterDetailGrid>
          </MasterDetailSection>
          <MasterDetailSection title="Tax IDs">
            <MasterDetailGrid columns={2}>
              <MasterDetailCard label="PAN No" value={detailRow.panNumber || '-'} />
              <MasterDetailCard label="GST No" value={detailRow.gstNumber || '-'} />
              <MasterDetailCard label="TIN No" value={detailRow.tinNumber || '-'} />
              <MasterDetailCard label="TIN No 2" value={detailRow.tinNumber2 || '-'} />
              <MasterDetailCard label="TIN No 3" value={detailRow.tinNumber3 || '-'} />
              <MasterDetailCard label="TIN No From 2" value={detailRow.tinNumberFrom2 || '-'} />
              <MasterDetailCard label="TIN No From 3" value={detailRow.tinNumberFrom3 || '-'} />
            </MasterDetailGrid>
          </MasterDetailSection>
          <MasterDetailSection title="Tax & Controls">
            <MasterDetailGrid columns={2}>
              <MasterDetailCard label="Credit Limit (Days)" value={detailRow.creditLimitNoOfDays ?? '-'} />
              <MasterDetailCard label="Credit Limit (Bills)" value={detailRow.creditLimitNoOfBills ?? '-'} />
              <MasterDetailCard label="Tax Rate" value={detailRow.taxRate || '-'} />
              <MasterDetailCard label="Tax Type Code" value={detailRow.taxTypeCode ?? '-'} />
              <MasterDetailCard label="Tax Calculation" value={detailRow.taxCalculation ?? '-'} />
              <MasterDetailCard label="Tax Nature" value={detailRow.taxNature ?? '-'} />
              <MasterDetailCard label="Tax Capital Goods" value={detailRow.taxCapitalGoods ?? '-'} />
              <MasterDetailCard label="Tax Round Off (Sales)" value={detailRow.taxRoundOffSales ?? '-'} />
              <MasterDetailCard label="Tax Round Off (Purchase)" value={detailRow.taxRoundOffPurchase ?? '-'} />
              <MasterDetailCard label="Tax Purchase Ledger" value={detailRow.taxFPurchaseLedgerId != null ? ledgerOptionLabelMap.get(Number(detailRow.taxFPurchaseLedgerId)) ?? `#${detailRow.taxFPurchaseLedgerId}` : '-'} />
              <MasterDetailCard label="Tax Sales Ledger" value={detailRow.taxFSalesLedgerId != null ? ledgerOptionLabelMap.get(Number(detailRow.taxFSalesLedgerId)) ?? `#${detailRow.taxFSalesLedgerId}` : '-'} />
              <MasterDetailCard label="Tax Sales Ledger 2" value={detailRow.taxFSalesLedger2Id != null ? ledgerOptionLabelMap.get(Number(detailRow.taxFSalesLedger2Id)) ?? `#${detailRow.taxFSalesLedger2Id}` : '-'} />
              <MasterDetailCard label="Tax Accounts Update" value={detailRow.taxAccountsUpdate ?? '-'} />
              <MasterDetailCard label="Generate Bill" value={detailRow.isGenerateBill === 1 ? 'Yes' : 'No'} />
              <MasterDetailCard label="Print Bill" value={detailRow.isPrintBill === 1 ? 'Yes' : 'No'} />
              <MasterDetailCard label="Tax Applicable" value={detailRow.isTaxApplicable === 1 ? 'Yes' : 'No'} />
              <MasterDetailCard label="Stop GST" value={detailRow.isStopGst === 1 ? 'Yes' : 'No'} />
              <MasterDetailCard label="GST Stop Date" value={detailRow.gstStopDate || '-'} />
              <MasterDetailCard label="Interest Rate" value={detailRow.intRate ?? '-'} />
              <MasterDetailCard label="TCS Applicable" value={detailRow.isTcsApplicable === 1 ? 'Yes' : 'No'} />
              <MasterDetailCard label="Reverse Charge Applicable" value={detailRow.isReverseChargeApplicableFlag === 1 ? 'Yes' : 'No'} />
              <MasterDetailCard label="Export Ledger" value={detailRow.isExportFlag === 1 ? 'Yes' : 'No'} />
            </MasterDetailGrid>
          </MasterDetailSection>
          <MasterDetailSection
            title="Shipping Addresses"
            description={`${detailShippingRows.length} ${detailShippingRows.length === 1 ? 'address' : 'addresses'}`}
          >
            <div className="border-1 surface-border border-round overflow-hidden">
              <DataTable
                value={detailShippingRows}
                dataKey="rowId"
                responsiveLayout="scroll"
                size="small"
                className="p-datatable-sm"
                emptyMessage="No shipping addresses added."
                scrollable
                scrollHeight="12rem"
              >
                <Column
                  header="#"
                  body={(_row: ShippingAddressRow, options) => options.rowIndex + 1}
                  style={{ width: '4rem' }}
                />
                <Column
                  header="Address"
                  body={(row: ShippingAddressRow) =>
                    [row.addressLine1, row.addressLine2, row.addressLine3].filter(Boolean).join(', ') || '-'
                  }
                />
                <Column
                  header="City"
                  body={(row: ShippingAddressRow) =>
                    row.cityId ? shippingCityOptionMap.get(Number(row.cityId)) ?? `#${row.cityId}` : '-'
                  }
                />
                <Column header="Postal Code" body={(row: ShippingAddressRow) => row.postalCode || '-'} />
                <Column header="Office" body={(row: ShippingAddressRow) => row.officePhone || '-'} />
                <Column header="Residence" body={(row: ShippingAddressRow) => row.residencePhone || '-'} />
                <Column header="Mobile" body={(row: ShippingAddressRow) => row.mobileNumber || '-'} />
              </DataTable>
            </div>
          </MasterDetailSection>
          <MasterDetailSection
            title="Contact Persons"
            description={`${detailContactRows.length} ${detailContactRows.length === 1 ? 'contact' : 'contacts'}`}
          >
            <div className="border-1 surface-border border-round overflow-hidden">
              <DataTable
                value={detailContactRows}
                dataKey="rowId"
                responsiveLayout="scroll"
                size="small"
                className="p-datatable-sm"
                emptyMessage="No contact persons added."
                scrollable
                scrollHeight="12rem"
              >
                <Column
                  header="#"
                  body={(_row: ContactPersonRow, options) => options.rowIndex + 1}
                  style={{ width: '4rem' }}
                />
                <Column header="Name" body={(row: ContactPersonRow) => row.name || '-'} />
                <Column header="Designation" body={(row: ContactPersonRow) => row.designation || '-'} />
                <Column header="Mobile" body={(row: ContactPersonRow) => row.mobileNumber || '-'} />
                <Column header="Email" body={(row: ContactPersonRow) => row.email || '-'} />
              </DataTable>
            </div>
          </MasterDetailSection>
          <MasterDetailSection
            title="Ledger Sales Taxes"
            description={`${detailSalesTaxRows.length} ${detailSalesTaxRows.length === 1 ? 'tax row' : 'tax rows'}`}
          >
            <div className="border-1 surface-border border-round overflow-hidden">
              <DataTable
                value={detailSalesTaxRows}
                dataKey="rowId"
                responsiveLayout="scroll"
                size="small"
                className="p-datatable-sm"
                emptyMessage="No ledger sales taxes added."
                scrollable
                scrollHeight="12rem"
              >
                <Column
                  header="#"
                  body={(_row: LedgerSalesTaxRow, options) => options.rowIndex + 1}
                  style={{ width: '4rem' }}
                />
                <Column header="Tax Name" body={(row: LedgerSalesTaxRow) => row.taxName || '-'} />
                <Column header="GST No" body={(row: LedgerSalesTaxRow) => row.gstNumber || '-'} />
                <Column header="Tax Rate" body={(row: LedgerSalesTaxRow) => row.taxRate || '-'} />
                <Column header="Effective Date" body={(row: LedgerSalesTaxRow) => row.effectiveDate || '-'} />
                <Column
                  header="Status"
                  body={(row: LedgerSalesTaxRow) => (row.isActiveFlag === 1 ? 'Active' : 'Inactive')}
                />
              </DataTable>
            </div>
          </MasterDetailSection>
        </div>
        )}
      </Dialog>
    </div>
  );
}
