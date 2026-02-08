'use client';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { confirmPopup, ConfirmPopup } from 'primereact/confirmpopup';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppDateInput from '@/components/AppDateInput';
import GeoImportDialog from '@/components/GeoImportDialog';
import { useQuery, useMutation, gql } from '@apollo/client';
import { z } from 'zod';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateSingleDate } from '@/lib/reportDateValidation';

interface LedgerRow {
  ledgerId: number;
  name: string;
  ledgerGroupId?: number | null;
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
  mobileNumber?: string | null;
  gstNumber?: string | null;
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

const LEDGER_SUMMARIES = gql`
  query LedgerSummaries($search: String, $limit: Int, $offset: Int, $sortField: String, $sortOrder: Int) {
    ledgerSummaries(search: $search, limit: $limit, offset: $offset, sortField: $sortField, sortOrder: $sortOrder) {
      total
      items {
        ledgerId
        name
        ledgerGroupId
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
        mobileNumber
        gstNumber
        openingBalanceAmount
        balanceType
        isActiveFlag
        extraFields
      }
    }
  }
`;

const LEDGER_GROUPS = gql`
  query LedgerGroups {
    ledgerGroups {
      ledgerGroupId
      name
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
    $addressLine1: String
    $addressLine2: String
    $addressLine3: String
    $cityId: Int
    $districtId: Int
    $stateId: Int
    $countryId: Int
    $mobileNumber: String
    $gstNumber: String
    $openingBalanceAmount: Float
    $balanceType: Int
    $isActiveFlag: Int
    $extraFields: String
  ) {
    createLedger(
      name: $name
      ledgerGroupId: $ledgerGroupId
      addressLine1: $addressLine1
      addressLine2: $addressLine2
      addressLine3: $addressLine3
      cityId: $cityId
      districtId: $districtId
      stateId: $stateId
      countryId: $countryId
      mobileNumber: $mobileNumber
      gstNumber: $gstNumber
      openingBalanceAmount: $openingBalanceAmount
      balanceType: $balanceType
      isActiveFlag: $isActiveFlag
      extraFields: $extraFields
    ) {
      ledgerId
      name
      groupName
      address
      cityName
      districtName
      stateName
      countryName
      mobileNumber
      gstNumber
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
    $addressLine1: String
    $addressLine2: String
    $addressLine3: String
    $cityId: Int
    $districtId: Int
    $stateId: Int
    $countryId: Int
    $mobileNumber: String
    $gstNumber: String
    $openingBalanceAmount: Float
    $balanceType: Int
    $isActiveFlag: Int
    $extraFields: String
  ) {
    updateLedger(
      ledgerId: $ledgerId
      name: $name
      ledgerGroupId: $ledgerGroupId
      addressLine1: $addressLine1
      addressLine2: $addressLine2
      addressLine3: $addressLine3
      cityId: $cityId
      districtId: $districtId
      stateId: $stateId
      countryId: $countryId
      mobileNumber: $mobileNumber
      gstNumber: $gstNumber
      openingBalanceAmount: $openingBalanceAmount
      balanceType: $balanceType
      isActiveFlag: $isActiveFlag
      extraFields: $extraFields
    ) {
      ledgerId
      name
      ledgerGroupId
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
      mobileNumber
      gstNumber
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
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  addressLine3: z.string().optional(),
  countryId: z.string().optional(),
  stateId: z.string().optional(),
  districtId: z.string().optional(),
  cityId: z.string().optional(),
  mobileNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9]{10,13}$/.test(v), 'Enter a valid mobile (10-13 digits)'),
  gstNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9A-Z]{15}$/.test(v), 'Enter a valid GSTIN (15 chars, A-Z/0-9)'),
  openingBalanceAmount: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Opening balance must be numeric'),
  balanceType: z.number(),
  isActiveFlag: z.number()
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

export default function AccountsLedgerListPage() {
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
  const [saving, setSaving] = useState(false);
  const [geoImportVisible, setGeoImportVisible] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ledgerGroupId: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    countryId: '',
    stateId: '',
    districtId: '',
    cityId: '',
    mobileNumber: '',
    gstNumber: '',
    openingBalanceAmount: '',
    balanceType: 1,
    isActiveFlag: 1,
    extraFields: {} as Record<string, any>
  });

  const { data, loading, error, refetch } = useQuery(LEDGER_SUMMARIES, {
    variables: { search: '', limit: rowsPerPage, offset: first, sortField: 'name', sortOrder: 1 }
  });

  const { data: groupsData } = useQuery(LEDGER_GROUPS);
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

  const rows: LedgerRow[] = useMemo(() => data?.ledgerSummaries?.items ?? [], [data]);
  const totalRecords = data?.ledgerSummaries?.total ?? rows.length ?? 0;

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

  const ledgerGroups = groupsData?.ledgerGroups ?? [];
  const geoCountries = geoCountriesData?.geoCountries ?? [];
  const geoStates = geoStatesData?.geoStates ?? [];
  const geoDistricts = geoDistrictsData?.geoDistricts ?? [];
  const geoCities = geoCitiesData?.geoCities ?? [];
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
    setEditing(null);
    setForm({
      name: '',
      ledgerGroupId: '',
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      countryId: '',
      stateId: '',
      districtId: '',
      cityId: '',
      mobileNumber: '',
      gstNumber: '',
      openingBalanceAmount: '',
      balanceType: 1,
      isActiveFlag: 1,
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
    if (!row) return;
    ensureLedgerYearBalanceFor(row.ledgerId);
    setEditing(row);
    setForm({
      name: row.name ?? '',
      ledgerGroupId: (row.ledgerGroupId ??
        ledgerGroups.find((g: any) => g.name === row.groupName)?.ledgerGroupId ??
        '').toString(),
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      addressLine3: row.addressLine3 ?? '',
      countryId: (row.countryId ?? '').toString(),
      stateId: (row.stateId ?? '').toString(),
      districtId: (row.districtId ?? '').toString(),
      cityId: (row.cityId ?? '').toString(),
      mobileNumber: row.mobileNumber ?? '',
      gstNumber: row.gstNumber ?? '',
      openingBalanceAmount: row.openingBalanceAmount ?? '',
      balanceType: row.balanceType ?? 1,
      isActiveFlag: row.isActiveFlag ?? 1,
      extraFields: normalizeExtraFields(parseJsonValue(row.extraFields ?? null) ?? {})
    });
    setFormErrors({});
    setDialogVisible(true);
  };

  const openView = (row: LedgerRow | null) => {
    if (!row) return;
    ensureLedgerYearBalanceFor(row.ledgerId);
    setDetailRow(row);
    setDetailVisible(true);
  };

  const handleSave = async () => {
    const parsed = ledgerSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          nextErrors[issue.path[0] as string] = issue.message;
        }
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
      const vars = {
        name: form.name,
        ledgerGroupId: Number(form.ledgerGroupId),
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        addressLine3: form.addressLine3 || null,
        countryId: form.countryId ? Number(form.countryId) : null,
        stateId: form.stateId ? Number(form.stateId) : null,
        districtId: form.districtId ? Number(form.districtId) : null,
        cityId: form.cityId ? Number(form.cityId) : null,
        mobileNumber: form.mobileNumber || null,
        gstNumber: form.gstNumber || null,
        openingBalanceAmount: form.openingBalanceAmount ? Number(form.openingBalanceAmount) : null,
        balanceType: form.balanceType ?? 1,
        isActiveFlag: form.isActiveFlag ?? 1,
        extraFields: JSON.stringify(normalizeExtraFields(form.extraFields))
      };

      if (editing) {
        await updateLedger({ variables: { ledgerId: editing.ledgerId, ...vars } });
      } else {
        await createLedger({ variables: vars });
      }

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
      await refetch();
      toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Ledger deleted' });
    } catch (err: any) {
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err.message });
    }
  };

  const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: LedgerRow) => {
    confirmPopup({
      target: event.currentTarget,
      message: 'Delete this ledger?',
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
            <InputText
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
        onRowDoubleClick={(e) => openEdit(e.data as LedgerRow)}
        headerLeft={
          <span className="p-input-icon-left" style={{ position: 'relative', minWidth: '320px' }}>
            <i className="pi pi-search" />
            <InputText
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
            <Button label={LABELS.newButton} icon="pi pi-plus" className="p-button-primary" onClick={openNew} />
            <Button label="Export" icon="pi pi-download" className="p-button-info" onClick={() => dtRef.current?.exportCSV()} />
            <Button label="Print" icon="pi pi-print" className="p-button-warning" onClick={() => window.print()} />
            <div className="text-600 text-sm">Showing {rows.length} of {totalRecords} records</div>
          </>
        }
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column field="name" header="Name" sortable />
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
              />
              <Button
                icon="pi pi-pencil"
                rounded
                text
                className="p-button-primary p-button-text"
                onClick={() => openEdit(row)}
              />
              <Button
                icon="pi pi-trash"
                rounded
                text
                className="p-button-danger p-button-text"
                onClick={(e) => confirmDelete(e, row)}
              />
            </div>
          )}
          style={{ width: '8rem' }}
        />
      </AppDataTable>

      <Dialog
        header={editing ? LABELS.editDialog : LABELS.newDialog}
        visible={dialogVisible}
        style={{ width: '32rem' }}
        modal
        onHide={() => setDialogVisible(false)}
      >
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label className="font-medium">
              {LABELS.form.name} <span className="p-error">*</span>
            </label>
            <InputText
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
              options={ledgerGroups.map((g: any) => ({
                label: g.name ?? String(g.ledgerGroupId),
                value: g.ledgerGroupId?.toString()
              }))}
              onChange={(e) => setForm((f) => ({ ...f, ledgerGroupId: e.value }))}
              placeholder="Select group"
              filter
              showClear
            />
            {renderError('ledgerGroupId')}
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Address Line 1</label>
            <InputText
              value={form.addressLine1}
              onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
              placeholder="Street / Building"
            />
            {renderError('addressLine1')}
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Address Line 2</label>
            <InputText
              value={form.addressLine2}
              onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
              placeholder="Area / Landmark"
            />
            {renderError('addressLine2')}
          </div>
          <div className="flex flex-column gap-1">
            <label className="font-medium">Address Line 3</label>
            <InputText
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
                    cityId: ''
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
                    cityId: ''
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
                    cityId: ''
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
                onChange={(e) => setForm((f) => ({ ...f, cityId: e.value ?? '' }))}
                placeholder={form.districtId ? 'Select city' : 'Select district first'}
                filter
                showClear
                disabled={!form.districtId}
              />
              {renderError('cityId')}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">{LABELS.form.mobile}</label>
              <small className="text-600">10-13 digits, numbers only.</small>
              <InputText
                value={form.mobileNumber}
                onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                placeholder="Mobile"
              />
              {renderError('mobileNumber')}
            </span>
            <span className="flex-1 flex flex-column gap-1">
              <label className="font-medium">{LABELS.form.gst}</label>
              <small className="text-600">15 chars, A-Z/0-9 (GSTIN).</small>
              <InputText
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
                placeholder="GST"
              />
              {renderError('gstNumber')}
            </span>
          </div>
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
              <InputText
                value={form.openingBalanceAmount}
                onChange={(e) => setForm((f) => ({ ...f, openingBalanceAmount: e.target.value }))}
                placeholder="0.00"
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
              />
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              label="Save"
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
          setForm((prev) => ({
            ...prev,
            countryId: selection.countryId ? String(selection.countryId) : prev.countryId,
            stateId: selection.stateId ? String(selection.stateId) : '',
            districtId: selection.districtId ? String(selection.districtId) : '',
            cityId: selection.cityId ? String(selection.cityId) : ''
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
          <div><strong>Group:</strong> {detailRow.groupName ?? '-'}</div>
          <div><strong>Address:</strong> {[detailRow.addressLine1, detailRow.addressLine2, detailRow.addressLine3].filter(Boolean).join(', ') || detailRow.address || '-'}</div>
          <div><strong>City:</strong> {detailRow.cityName || '-'}</div>
          <div><strong>District:</strong> {detailRow.districtName || '-'}</div>
          <div><strong>State:</strong> {detailRow.stateName || '-'}</div>
          <div><strong>Country:</strong> {detailRow.countryName || '-'}</div>
          <div><strong>Mobile:</strong> {detailRow.mobileNumber || '-'}</div>
          <div><strong>GST No:</strong> {detailRow.gstNumber || '-'}</div>
          <div><strong>Opening Balance:</strong> {balanceBody(detailRow)}</div>
          <div><strong>Active:</strong> {activeBody(detailRow)}</div>
        </div>
        )}
      </Dialog>
    </div>
  );
}
