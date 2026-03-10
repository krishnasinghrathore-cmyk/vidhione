import React from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useApolloClient } from '@apollo/client';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { DataTable, type DataTableFilterEvent, type DataTableFilterMeta, type DataTablePageEvent } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import type { MenuItem } from 'primereact/menuitem';
import { Message } from 'primereact/message';
import AppDateInput from '@/components/AppDateInput';
import AppCompactToggle from '@/components/AppCompactToggle';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppReportActions from '@/components/AppReportActions';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import ProductAutoComplete from '@/components/ProductAutoComplete';
import ProductBrandAutoComplete from '@/components/ProductBrandAutoComplete';
import ProductGroupAutoComplete from '@/components/ProductGroupAutoComplete';
import { useAreaOptions } from '@/lib/accounts/areas';
import type { CrmLoyaltySummary } from '@/lib/crm/api';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { useLedgerOptionsByPurpose, type LedgerOption as PurposeLedgerOption } from '@/lib/accounts/ledgerOptions';
import { buildInvoiceLedgerRowsFromSaleInvoices } from '@/lib/invoiceLedgerRows';
import { buildLoadingSheetRowsFromSaleInvoiceIds } from '@/lib/loadingSheetRows';
import { ReportHeader } from '@/components/ReportHeader';
import { ReportRegisterSearch } from '@/components/ReportRegisterSearch';
import type { DebitNoteLookupItem, EstimateLookupItem, SaleInvoiceListItem, SalesReturnBookRow } from '@/lib/invoicing/api';
import { printRowsWithReportTemplate } from '@/lib/reportTemplatePrint';
import { formatAmount, formatVoucherDate } from '../helpers';
import type { LedgerOption, LedgerSummary } from '../useLedgerLookup';
import { InvoiceAdditionalTaxationSection } from './components/InvoiceAdditionalTaxationSection';
import { InvoiceHeaderSection } from './components/InvoiceHeaderSection';
import { InvoiceGiftCertificateSection } from './components/InvoiceGiftCertificateSection';
import { InvoiceLoyaltySection } from './components/InvoiceLoyaltySection';
import { InvoiceLinesTable } from './components/InvoiceLinesTable';
import { InvoiceTransportFreightSection } from './components/InvoiceTransportFreightSection';
import { InvoiceTypeDetailsSection } from './components/InvoiceTypeDetailsSection';
import { InvoiceTotalsPanel } from './components/InvoiceTotalsPanel';
import { INVOICE_PRODUCT_ATTRIBUTE_TYPE_BY_ID_QUERY } from './graphql';
import type {
    InvoiceAdditionalTaxationDraft,
    InvoiceComputation,
    InvoiceFormRouteView,
    InvoiceGiftCertificateApplicationDraft,
    InvoiceHeaderDraft,
    InvoiceLoyaltyApplicationDraft,
    InvoiceLineDraft,
    InvoicePreservedDetails,
    InvoiceProduct,
    InvoiceProductAttributeOption,
    RegisterInvoiceLineSummary,
    InvoiceTypeDetailDraft,
    TaxSummaryRow
} from './types';

type Option = {
    label: string;
    value: number;
    searchText?: string | null;
};

type RegisterFilterOption = {
    label: string;
    value: string;
};

type RegisterAttributeFilterOption = {
    label: string;
    value: number;
};

type RegisterColumnFilterOption<T extends string | number> = {
    label: string;
    value: T;
    secondaryLabel?: string;
};

type RegisterColumnFilterMeta = {
    value?: unknown;
    constraints?: Array<{ value?: unknown }>;
};

type RegisterInvoiceSupplementalFilters = {
    invoiceDates: string[];
    profileTags: string[];
};

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
    ledgerGroupId?: number | null;
    taxRate: number;
};

type InvoiceTransportDraft = {
    isApplied: boolean;
    transporterId: number | null;
    freightLedgerId: number | null;
    freightAmount: number;
    freightTaxLedgerId: number | null;
};

type GiftCertificateOption = {
    label: string;
    value: string;
    certificateCode: string;
    balanceAmount: number;
    status: string;
};

type InvoiceLegacyAction = 'estimate' | 'creditNote' | 'debitNote';

type InvoiceLegacyActionFlags = {
    estimate: boolean;
    creditNote: boolean;
    debitNote: boolean;
};

type CreditNoteDraftRow = {
    key: string;
    voucherId: number | null;
    saleReturnId: number | null;
};

type DebitNoteDraftRow = {
    key: string;
    voucherId: number | null;
};

type TypeDetailsDialogScope = {
    itemId: number;
    tmpTypeId: number | null;
};

type RegisterReceiptVoucherEntry = {
    key: string;
    kindCode: 'C' | 'B';
    voucherNumber: string;
    voucherDate: string;
    amount: number | null;
};

const parseVoucherDateText = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const text = value.trim();
    if (!text) return null;
    if (/^\d{8}$/.test(text)) {
        const yyyy = Number(text.slice(0, 4));
        const mm = Number(text.slice(4, 6));
        const dd = Number(text.slice(6, 8));
        const date = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [yyyy, mm, dd] = text.split('-').map(Number);
        const date = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
        const [dd, mm, yyyy] = text.split('/').map(Number);
        const date = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
};

const toDateDayKey = (value: Date | null) =>
    value ? new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime() : null;
const toStartOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const toDateRangeKey = (fromDate: Date | null, toDate: Date | null) => `${toDateDayKey(fromDate) ?? 'null'}:${toDateDayKey(toDate) ?? 'null'}`;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cloneDate = (value: Date | null) => (value ? new Date(value.getTime()) : null);
const normalizeFilterValue = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';
const normalizeDisplayText = (value: string | null | undefined) => {
    const normalized = value?.trim() ?? '';
    if (!normalized) return '';
    if (/^-+$/.test(normalized)) return '';
    if (/^\[none\]$/i.test(normalized)) return '';
    return normalized;
};
const normalizeItemMetaText = (value: string | null | undefined) => {
    const normalized = normalizeDisplayText(value);
    if (!normalized) return '';
    if (/^item\s*#\s*0+$/i.test(normalized)) return '';
    return normalized;
};
const isInteractiveShortcutTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return Boolean(
        target.closest(
            'input, textarea, select, button, a, [role="button"], [contenteditable="true"], .p-dropdown, .p-multiselect, .p-inputswitch, .p-checkbox, .p-autocomplete, .p-inputnumber, .p-calendar, .p-dialog'
        )
    );
};
const buildNamedFilterOptions = (values: Array<string | null | undefined>): RegisterFilterOption[] => {
    const labelByValue = new Map<string, string>();
    values.forEach((value) => {
        const label = value?.trim() ?? '';
        if (!label) return;
        const normalized = normalizeFilterValue(label);
        if (!normalized || labelByValue.has(normalized)) return;
        labelByValue.set(normalized, label);
    });
    const options = Array.from(labelByValue.entries())
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }))
        .map(([value, label]) => ({ label, value }));
    return [{ label: 'All', value: 'all' }, ...options];
};
const REGISTER_MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};
const buildRegisterColumnTextFilterOptions = (
    values: Array<string | null | undefined>
): RegisterColumnFilterOption<string>[] => {
    const unique = new Map<string, string>();
    values.forEach((value) => {
        const label = normalizeDisplayText(value);
        if (!label) return;
        const normalized = normalizeFilterValue(label);
        if (!normalized || unique.has(normalized)) return;
        unique.set(normalized, label);
    });
    return Array.from(unique.values())
        .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
        .map((value) => ({ label: value, value }));
};
const buildRegisterMultiSelectFilterElement =
    <T extends string | number>(items: RegisterColumnFilterOption<T>[], placeholder = 'Any') =>
    (options: ColumnFilterElementTemplateOptions) => (
        <AppMultiSelect
            value={(options.value ?? []) as T[]}
            options={items}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => options.filterCallback(event.value)}
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder={placeholder}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={items.length > 0 ? 'No values found' : 'No values'}
            emptyFilterMessage="No results found"
            disabled={items.length === 0}
            style={{ minWidth: '16rem' }}
        />
    );
const EMPTY_REGISTER_INVOICE_SUPPLEMENTAL_FILTERS: RegisterInvoiceSupplementalFilters = {
    invoiceDates: [],
    profileTags: []
};
const normalizeRegisterInvoiceSupplementalFilters = (value: unknown): RegisterInvoiceSupplementalFilters => {
    if (!value || typeof value !== 'object') return EMPTY_REGISTER_INVOICE_SUPPLEMENTAL_FILTERS;
    const candidate = value as Partial<RegisterInvoiceSupplementalFilters>;
    const invoiceDates = Array.isArray(candidate.invoiceDates)
        ? candidate.invoiceDates.map((entry) => normalizeDisplayText(String(entry))).filter(Boolean)
        : [];
    const profileTags = Array.isArray(candidate.profileTags)
        ? candidate.profileTags.map((entry) => normalizeDisplayText(String(entry))).filter(Boolean)
        : [];
    return { invoiceDates, profileTags };
};
const isRegisterInvoiceSupplementalFiltersEmpty = (value: RegisterInvoiceSupplementalFilters) =>
    value.invoiceDates.length === 0 && value.profileTags.length === 0;
const buildDefaultRegisterColumnFilters = (): DataTableFilterMeta => ({
    voucherNumber: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    ledgerFilterDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    totalNetAmountDisplay: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    registerStatusLabel: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});
const resolveRegisterColumnFilterValue = (meta: RegisterColumnFilterMeta | undefined): unknown => {
    if (!meta) return null;
    if (Array.isArray(meta.constraints)) return meta.constraints[0]?.value ?? null;
    return meta.value ?? null;
};
const resolveRegisterColumnFilterValues = <T extends string | number>(
    filters: DataTableFilterMeta,
    key: string
) => {
    const meta = filters[key] as RegisterColumnFilterMeta | undefined;
    const value = resolveRegisterColumnFilterValue(meta);
    if (!Array.isArray(value)) return [] as T[];
    return value as T[];
};
const hasActiveRegisterColumnFilters = (filters: DataTableFilterMeta) =>
    Object.values(filters).some((meta) => {
        const value = resolveRegisterColumnFilterValue(meta as RegisterColumnFilterMeta | undefined);
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === 'object') {
            const invoiceFilters = normalizeRegisterInvoiceSupplementalFilters(value);
            return !isRegisterInvoiceSupplementalFiltersEmpty(invoiceFilters);
        }
        if (typeof value === 'string') return value.trim().length > 0;
        return value != null;
    });
const resolveRegisterRowStatusFilterValues = (row: SaleInvoiceListItem) => {
    const values: string[] = [];
    const deliveryStatusLabel = normalizeDisplayText(row.deliveryStatus) || 'Pending';
    values.push(deliveryStatusLabel);
    const normalizedDeliveryStatus = normalizeFilterValue(deliveryStatusLabel);
    if (row.isCancelled && !normalizedDeliveryStatus.includes('cancel')) values.push('Cancelled');
    if (row.isDisputed) values.push('Disputed');
    if (row.isChecked) values.push('Checked');
    return Array.from(new Set(values.map((value) => normalizeDisplayText(value)).filter(Boolean)));
};
const resolveRegisterLedgerFilterText = (row: SaleInvoiceListItem, ledgerById: Map<number, LedgerSummary>) => {
    const ledgerName = normalizeDisplayText(row.ledgerName)
        || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.name : '');
    const ledgerAddress = normalizeDisplayText(row.ledgerAddress)
        || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.address : '');
    if (ledgerName && ledgerAddress) return `${ledgerName} | ${ledgerAddress}`;
    return ledgerName || ledgerAddress;
};

const FINANCIAL_EPSILON = 0.005;
const REGISTER_TOTALS_ROW_ID = -1;
const PARTY_LEDGER_GROUP_TYPE_CODES = new Set<number>([31, 32, 40]);
const mergeLedgerOptionSets = (...optionSets: PurposeLedgerOption[][]): PurposeLedgerOption[] => {
    const byId = new Map<number, PurposeLedgerOption>();
    optionSets.forEach((options) => {
        options.forEach((option) => {
            const ledgerId = Number(option.value);
            if (!Number.isFinite(ledgerId) || ledgerId <= 0) return;
            if (!byId.has(ledgerId)) {
                byId.set(ledgerId, option);
            }
        });
    });
    return Array.from(byId.values()).sort((left, right) =>
        left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
    );
};
const toAmountNumber = (value: number | null | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};
const formatQuantity = (value: number | null | undefined) => {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return '0';
    if (Math.abs(parsed % 1) < 0.000001) return String(Math.trunc(parsed));
    return parsed.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};
const toPositiveId = (value: number | null | undefined) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return null;
    if (numeric <= 0) return null;
    return Math.trunc(numeric);
};
const resolveRegisterPlaceOfSupplyKey = (isOtherState: boolean | null | undefined): 'intra_state' | 'inter_state' =>
    isOtherState ? 'inter_state' : 'intra_state';
const resolveRegisterPlaceOfSupplyLabel = (key: 'intra_state' | 'inter_state') =>
    key === 'inter_state' ? 'Inter-State (Other State)' : 'Intra-State (Own State)';
const resolveRegisterCustomerTypeKey = (hasLedgerGst: boolean | null | undefined): 'b2b' | 'b2c' =>
    hasLedgerGst ? 'b2b' : 'b2c';
const resolveRegisterCustomerTypeLabel = (key: 'b2b' | 'b2c') =>
    key === 'b2b' ? 'B2B (GST Registered)' : 'B2C (Unregistered)';
const isRegisterLedgerGstStopped = (row: Pick<SaleInvoiceListItem, 'voucherDateText' | 'gstStopDate'>) => {
    const gstStopDate = parseVoucherDateText(row.gstStopDate);
    if (!gstStopDate) return false;
    const voucherDate = parseVoucherDateText(row.voucherDateText);
    if (!voucherDate) return false;
    const stopDateKey = toDateDayKey(gstStopDate);
    const voucherDateKey = toDateDayKey(voucherDate);
    return stopDateKey != null && voucherDateKey != null && voucherDateKey >= stopDateKey;
};
const resolveRegisterCustomerTypeForRow = (row: SaleInvoiceListItem, resolvedPartyGstin: string): 'b2b' | 'b2c' => {
    const hasResolvedGstin = resolvedPartyGstin.length === 15;
    if (isRegisterLedgerGstStopped(row)) return 'b2c';
    return resolveRegisterCustomerTypeKey(row.hasLedgerGst || hasResolvedGstin);
};
const renderLabelWithIcon = (icon: string, label: React.ReactNode, className?: string) => (
    <span className={['app-entry-label-with-icon', className].filter(Boolean).join(' ')}>
        <i className={`pi ${icon}`} aria-hidden="true" />
        <span>{label}</span>
    </span>
);
const renderRegisterHeaderLineWithIcon = (
    icon: string,
    label: React.ReactNode,
    tone: 'primary' | 'secondary' = 'secondary'
) => (
    <span className={`invoice-register-header-subline invoice-register-header-subline--with-icon invoice-register-header-subline--${tone}`}>
        <i className={`pi ${icon}`} aria-hidden="true" />
        <span>{label}</span>
    </span>
);

export type RegisterDefaultDateRange = {
    fromDate: Date | null;
    toDate: Date | null;
};

type RegisterFilterState = {
    fromDate: Date | null;
    toDate: Date | null;
    includeCancelled: boolean;
    partyGroupFilter: number | null;
    areaFilterIds: number[];
    partyFilter: number | null;
    productGroupFilter: string;
    productBrandFilter: string;
    productFilter: string;
    productAttributeFilter: number | null;
    mrpFilter: number | null;
    deliveryStatusFilter: string | null;
    placeOfSupplyFilter: string | null;
    customerTypeFilter: string | null;
};

const cloneRegisterFilterState = (value: RegisterFilterState): RegisterFilterState => ({
    fromDate: cloneDate(value.fromDate),
    toDate: cloneDate(value.toDate),
    includeCancelled: value.includeCancelled,
    partyGroupFilter: value.partyGroupFilter,
    areaFilterIds: [...value.areaFilterIds],
    partyFilter: value.partyFilter,
    productGroupFilter: value.productGroupFilter,
    productBrandFilter: value.productBrandFilter,
    productFilter: value.productFilter,
    productAttributeFilter: value.productAttributeFilter,
    mrpFilter: value.mrpFilter,
    deliveryStatusFilter: value.deliveryStatusFilter,
    placeOfSupplyFilter: value.placeOfSupplyFilter,
    customerTypeFilter: value.customerTypeFilter
});

const areNumberSetsEqual = (left: number[], right: number[]) => {
    if (left.length !== right.length) return false;
    const leftSorted = [...left].sort((a, b) => a - b);
    const rightSorted = [...right].sort((a, b) => a - b);
    return leftSorted.every((value, index) => value === rightSorted[index]);
};

const areRegisterFilterStatesEqual = (left: RegisterFilterState, right: RegisterFilterState) =>
    toDateRangeKey(left.fromDate, left.toDate) === toDateRangeKey(right.fromDate, right.toDate)
    && left.includeCancelled === right.includeCancelled
    && left.partyGroupFilter === right.partyGroupFilter
    && areNumberSetsEqual(left.areaFilterIds, right.areaFilterIds)
    && left.partyFilter === right.partyFilter
    && left.productGroupFilter === right.productGroupFilter
    && left.productBrandFilter === right.productBrandFilter
    && left.productFilter === right.productFilter
    && left.productAttributeFilter === right.productAttributeFilter
    && left.mrpFilter === right.mrpFilter
    && left.deliveryStatusFilter === right.deliveryStatusFilter
    && left.placeOfSupplyFilter === right.placeOfSupplyFilter
    && left.customerTypeFilter === right.customerTypeFilter;

const countActiveRegisterFilters = (
    value: RegisterFilterState,
    args: { defaultDateRangeKey: string }
) => {
    let count = 0;
    const currentDateRangeKey = toDateRangeKey(value.fromDate, value.toDate);
    if (currentDateRangeKey !== args.defaultDateRangeKey) count += 1;
    if (value.includeCancelled) count += 1;
    if (value.partyGroupFilter != null) count += 1;
    if (value.areaFilterIds.length > 0) count += 1;
    if (value.partyFilter != null) count += 1;
    if (value.productGroupFilter !== 'all') count += 1;
    if (value.productBrandFilter !== 'all') count += 1;
    if (value.productFilter !== 'all') count += 1;
    if (value.productAttributeFilter != null) count += 1;
    if (value.mrpFilter != null) count += 1;
    if (value.deliveryStatusFilter != null) count += 1;
    if (value.placeOfSupplyFilter != null) count += 1;
    if (value.customerTypeFilter != null) count += 1;
    return count;
};

export const resolveRegisterDefaultDateRange = (args: {
    isEntryView: boolean;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    registerDefaultLookbackDays: number | null;
}): RegisterDefaultDateRange => {
    if (args.isEntryView) {
        return { fromDate: null, toDate: null };
    }
    const lookbackDays =
        typeof args.registerDefaultLookbackDays === 'number' && Number.isFinite(args.registerDefaultLookbackDays)
            ? Math.max(1, Math.trunc(args.registerDefaultLookbackDays))
            : null;
    if (lookbackDays != null) {
        const fiscalStart = args.fiscalYearStart ? toStartOfDay(args.fiscalYearStart) : null;
        const fiscalEnd = args.fiscalYearEnd ? toStartOfDay(args.fiscalYearEnd) : null;
        let toDate = toStartOfDay(new Date());
        if (fiscalEnd && toDate.getTime() > fiscalEnd.getTime()) {
            toDate = cloneDate(fiscalEnd) ?? toDate;
        }
        if (fiscalStart && toDate.getTime() < fiscalStart.getTime()) {
            toDate = cloneDate(fiscalStart) ?? toDate;
        }
        const fromDate = cloneDate(toDate) ?? toDate;
        fromDate.setDate(fromDate.getDate() - (lookbackDays - 1));
        if (fiscalStart && fromDate.getTime() < fiscalStart.getTime()) {
            return { fromDate: cloneDate(fiscalStart), toDate };
        }
        return { fromDate, toDate };
    }
    const fromDate = cloneDate(args.fiscalYearStart);
    const toDate = cloneDate(args.fiscalYearEnd);
    if (fromDate && toDate) {
        return { fromDate, toDate };
    }
    if (fromDate) {
        return { fromDate, toDate: cloneDate(fromDate) };
    }
    if (toDate) {
        return { fromDate: cloneDate(toDate), toDate };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { fromDate: today, toDate: cloneDate(today) };
};

type InvoiceFormViewProps = {
    routeView: InvoiceFormRouteView;
    editingSaleInvoiceId: number | null;
    hasUnsavedEntryChanges: boolean;
    loading: boolean;
    loadingInvoice: boolean;
    saving: boolean;
    error: string | null;
    productsLoading: boolean;
    saleInvoices: SaleInvoiceListItem[];
    header: InvoiceHeaderDraft;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    registerDefaultLookbackDays: number | null;
    registerDateFilterApplied: boolean;
    ledgerOptions: LedgerOption[];
    ledgerById: Map<number, LedgerSummary>;
    ledgerLoading: boolean;
    products: InvoiceProduct[];
    productOptions: Option[];
    mrpOptionsByProductId: Record<number, Option[]>;
    unitOptions: Option[];
    transporterOptions: Option[];
    taxLedgerOptions: TaxLedgerOption[];
    computation: InvoiceComputation;
    taxSummaryRows: TaxSummaryRow[];
    additionalTaxations: InvoiceAdditionalTaxationDraft[];
    totalAdditionalTaxAmount: number;
    showTaxColumns: boolean;
    showTypeDetailsFeature: boolean;
    showAdditionalTaxationFeature: boolean;
    showHeaderSchemeToggle: boolean;
    showHeaderBizomField: boolean;
    showHeaderInterStateToggle: boolean;
    showTextileJobworkFields: boolean;
    transportFeatureAvailable: boolean;
    showTransporterField: boolean;
    requireTransporterWhenApplied: boolean;
    dryCheckRequired: boolean;
    salesmanFeatureAvailable: boolean;
    secondarySalesmanFeatureAvailable: boolean;
    transportDraft: InvoiceTransportDraft;
    transportFreightTaxRate: number;
    transportFreightTaxAmount: number;
    transportFreightTotalAmount: number;
    typeDetails: InvoiceTypeDetailDraft[];
    typeDetailOptionsByType: Record<number, InvoiceProductAttributeOption[]>;
    typeDetailTypeNameById: Record<number, string>;
    typeDetailOptionsLoading: boolean;
    headerErrors: string[];
    lineErrorsByKey: Record<string, string[]>;
    canSave: boolean;
    hasPreservedDetails: boolean;
    preservedDetails: InvoicePreservedDetails;
    loyaltySummary: CrmLoyaltySummary | null;
    loyaltySummaryLoading: boolean;
    loyaltySummaryError: string | null;
    giftCertificateOptions: GiftCertificateOption[];
    giftCertificatesLoading: boolean;
    giftCertificatesError: string | null;
    loyaltyAppliedAmount: number;
    giftCertificateAppliedAmount: number;
    settlementAppliedAmount: number;
    settlementBalanceAmount: number;
    settlementExceedsInvoice: boolean;
    registerIncludesProductNames: boolean;
    registerItemSummaryByInvoiceId: Record<number, RegisterInvoiceLineSummary[]>;
    registerItemSummaryLoadingByInvoiceId: Record<number, boolean>;
    registerItemSummaryErrorByInvoiceId: Record<number, string | null>;
    registerActionNotice: string | null;
    sendingDueSmsInvoiceId: number | null;
    sendingWhatsAppInvoiceId: number | null;
    legacyActionNotice: string | null;
    legacyActionFlags: InvoiceLegacyActionFlags;
    linkedEstimateId: number | null;
    linkedCreditNoteCount: number;
    linkedDebitNoteCount: number;
    estimateLookupDialogVisible: boolean;
    estimateLookupLoading: boolean;
    estimateLookupError: string | null;
    estimateLookups: EstimateLookupItem[];
    creditNoteDialogVisible: boolean;
    debitNoteDialogVisible: boolean;
    creditNoteDraftRows: CreditNoteDraftRow[];
    debitNoteDraftRows: DebitNoteDraftRow[];
    creditNoteLookupLoading: boolean;
    creditNoteLookupError: string | null;
    creditNoteLookups: SalesReturnBookRow[];
    debitNoteLookupLoading: boolean;
    debitNoteLookupError: string | null;
    debitNoteLookups: DebitNoteLookupItem[];
    onRefresh: (input?: {
        fromDate: Date | null;
        toDate: Date | null;
        includeCancelled: boolean;
        includeProductNames?: boolean;
    }) => void;
    onOpenNew: () => void;
    onOpenEdit: (saleInvoiceId: number) => void;
    onDeleteInvoice: (saleInvoiceId: number) => Promise<void> | void;
    onSendDueSms: (saleInvoiceId: number) => Promise<void> | void;
    onSendInvoiceWhatsApp: (saleInvoiceId: number) => Promise<void> | void;
    onLoadRegisterItemSummary: (saleInvoiceId: number, force?: boolean) => Promise<void> | void;
    onCancelEntry: () => void;
    onHeaderChange: (patch: Partial<InvoiceHeaderDraft>) => void;
    onSelectProduct: (lineKey: string, productId: number | null) => void;
    onSelectMrp: (lineKey: string, mrp: number | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceLineDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    onDuplicateLine: (lineKey: string) => void;
    onAddLine: () => void;
    onOpenTypeDetailsForItem: (itemId: number | null, tmpTypeId: number | null) => void;
    onAddTypeDetail: (defaults?: { itemId?: number | null; tmpTypeId?: number | null }) => void;
    onChangeTypeDetail: (lineKey: string, patch: Partial<InvoiceTypeDetailDraft>) => void;
    onDeleteTypeDetail: (lineKey: string) => void;
    onAddAdditionalTaxation: () => void;
    onChangeAdditionalTaxation: (lineKey: string, patch: Partial<InvoiceAdditionalTaxationDraft>) => void;
    onDeleteAdditionalTaxation: (lineKey: string) => void;
    onTransportDraftChange: (patch: Partial<InvoiceTransportDraft>) => void;
    onApplyTransportCharges: () => void;
    onClearTransportCharges: () => void;
    onApplyLoyaltyApplication: () => void;
    onChangeLoyaltyApplication: (patch: Partial<InvoiceLoyaltyApplicationDraft>) => void;
    onClearLoyaltyApplication: () => void;
    onAddGiftCertificateApplication: () => void;
    onSelectGiftCertificate: (lineKey: string, giftCertificateId: string | null) => void;
    onChangeGiftCertificateApplication: (lineKey: string, patch: Partial<InvoiceGiftCertificateApplicationDraft>) => void;
    onDeleteGiftCertificateApplication: (lineKey: string) => void;
    onTaxLessChange: (args: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => void;
    onResetTaxLess: () => void;
    onRequestSave: () => void;
    onRequestSaveAndAddNew: () => void;
    onRequestLegacyAction: (action: InvoiceLegacyAction) => void;
    onSearchEstimateLookups: (search?: string) => Promise<void> | void;
    onApplyEstimateLookup: (estimate: EstimateLookupItem) => void;
    onClearEstimateLink: () => void;
    onCloseEstimateLookupDialog: () => void;
    onAddCreditNoteDraftRow: () => void;
    onUpdateCreditNoteDraftRow: (rowKey: string, patch: { voucherId?: number | null; saleReturnId?: number | null }) => void;
    onDeleteCreditNoteDraftRow: (rowKey: string) => void;
    onApplyCreditNotes: () => void;
    onCloseCreditNoteDialog: () => void;
    onAddDebitNoteDraftRow: () => void;
    onUpdateDebitNoteDraftRow: (rowKey: string, patch: { voucherId?: number | null }) => void;
    onDeleteDebitNoteDraftRow: (rowKey: string) => void;
    onApplyDebitNotes: () => void;
    onCloseDebitNoteDialog: () => void;
    onRefreshCreditNoteLookups: () => Promise<void> | void;
    onRefreshDebitNoteLookups: (search?: string) => Promise<void> | void;
    onAppendCreditNoteFromLookup: (saleReturnId: number) => void;
    onAppendDebitNoteFromLookup: (voucherId: number) => void;
};

export function InvoiceFormView({
    routeView,
    editingSaleInvoiceId,
    hasUnsavedEntryChanges,
    loading,
    loadingInvoice,
    saving,
    error,
    productsLoading,
    saleInvoices,
    header,
    fiscalYearStart,
    fiscalYearEnd,
    registerDefaultLookbackDays,
    ledgerOptions,
    ledgerById,
    ledgerLoading,
    products,
    productOptions,
    mrpOptionsByProductId,
    unitOptions,
    transporterOptions,
    taxLedgerOptions,
    computation,
    taxSummaryRows,
    additionalTaxations,
    totalAdditionalTaxAmount,
    showTaxColumns,
    showTypeDetailsFeature,
    showAdditionalTaxationFeature,
    showHeaderSchemeToggle,
    showHeaderBizomField,
    showHeaderInterStateToggle,
    showTextileJobworkFields,
    transportFeatureAvailable,
    showTransporterField,
    requireTransporterWhenApplied,
    dryCheckRequired,
    salesmanFeatureAvailable,
    secondarySalesmanFeatureAvailable,
    transportDraft,
    transportFreightTaxRate,
    transportFreightTaxAmount,
    transportFreightTotalAmount,
    typeDetails,
    typeDetailOptionsByType,
    typeDetailTypeNameById,
    typeDetailOptionsLoading,
    headerErrors,
    lineErrorsByKey,
    canSave,
    hasPreservedDetails,
    preservedDetails,
    loyaltySummary,
    loyaltySummaryLoading,
    loyaltySummaryError,
    giftCertificateOptions,
    giftCertificatesLoading,
    giftCertificatesError,
    loyaltyAppliedAmount,
    giftCertificateAppliedAmount,
    settlementAppliedAmount,
    settlementBalanceAmount,
    settlementExceedsInvoice,
    registerIncludesProductNames,
    registerItemSummaryByInvoiceId,
    registerItemSummaryLoadingByInvoiceId,
    registerItemSummaryErrorByInvoiceId,
    registerActionNotice,
    sendingDueSmsInvoiceId,
    sendingWhatsAppInvoiceId,
    legacyActionNotice,
    legacyActionFlags,
    linkedEstimateId,
    linkedCreditNoteCount,
    linkedDebitNoteCount,
    estimateLookupDialogVisible,
    estimateLookupLoading,
    estimateLookupError,
    estimateLookups,
    creditNoteDialogVisible,
    debitNoteDialogVisible,
    creditNoteDraftRows,
    debitNoteDraftRows,
    creditNoteLookupLoading,
    creditNoteLookupError,
    creditNoteLookups,
    debitNoteLookupLoading,
    debitNoteLookupError,
    debitNoteLookups,
    onRefresh,
    onOpenNew,
    onOpenEdit,
    onDeleteInvoice,
    onSendDueSms,
    onSendInvoiceWhatsApp,
    onLoadRegisterItemSummary,
    onCancelEntry,
    onHeaderChange,
    onSelectProduct,
    onSelectMrp,
    onLineChange,
    onDeleteLine,
    onDuplicateLine,
    onAddLine,
    onOpenTypeDetailsForItem,
    onAddTypeDetail,
    onChangeTypeDetail,
    onDeleteTypeDetail,
    onAddAdditionalTaxation,
    onChangeAdditionalTaxation,
    onDeleteAdditionalTaxation,
    onTransportDraftChange,
    onApplyTransportCharges,
    onClearTransportCharges,
    onApplyLoyaltyApplication,
    onChangeLoyaltyApplication,
    onClearLoyaltyApplication,
    onAddGiftCertificateApplication,
    onSelectGiftCertificate,
    onChangeGiftCertificateApplication,
    onDeleteGiftCertificateApplication,
    onTaxLessChange,
    onResetTaxLess,
    onRequestSave,
    onRequestSaveAndAddNew,
    onRequestLegacyAction,
    onSearchEstimateLookups,
    onApplyEstimateLookup,
    onClearEstimateLink,
    onCloseEstimateLookupDialog,
    onAddCreditNoteDraftRow,
    onUpdateCreditNoteDraftRow,
    onDeleteCreditNoteDraftRow,
    onApplyCreditNotes,
    onCloseCreditNoteDialog,
    onAddDebitNoteDraftRow,
    onUpdateDebitNoteDraftRow,
    onDeleteDebitNoteDraftRow,
    onApplyDebitNotes,
    onCloseDebitNoteDialog,
    onRefreshCreditNoteLookups,
    onRefreshDebitNoteLookups,
    onAppendCreditNoteFromLookup,
    onAppendDebitNoteFromLookup
}: InvoiceFormViewProps) {
    const apolloClient = useApolloClient();
    const isEntryView = routeView === 'new' || routeView === 'edit';
    const isEditView = routeView === 'edit';
    const defaultRegisterDateRange = React.useMemo(
        () =>
            resolveRegisterDefaultDateRange({
                isEntryView,
                fiscalYearStart,
                fiscalYearEnd,
                registerDefaultLookbackDays
            }),
        [fiscalYearEnd, fiscalYearStart, isEntryView, registerDefaultLookbackDays]
    );
    const defaultRegisterDateRangeKey = React.useMemo(
        () => toDateRangeKey(defaultRegisterDateRange.fromDate, defaultRegisterDateRange.toDate),
        [defaultRegisterDateRange.fromDate, defaultRegisterDateRange.toDate]
    );
    const defaultRegisterFilters = React.useMemo<RegisterFilterState>(
        () => ({
            fromDate: cloneDate(defaultRegisterDateRange.fromDate),
            toDate: cloneDate(defaultRegisterDateRange.toDate),
            includeCancelled: false,
            partyGroupFilter: null,
            areaFilterIds: [],
            partyFilter: null,
            productGroupFilter: 'all',
            productBrandFilter: 'all',
            productFilter: 'all',
            productAttributeFilter: null,
            mrpFilter: null,
            deliveryStatusFilter: null,
            placeOfSupplyFilter: null,
            customerTypeFilter: null
        }),
        [defaultRegisterDateRange.fromDate, defaultRegisterDateRange.toDate]
    );
    const [registerSearch, setRegisterSearch] = React.useState('');
    const [typeDetailsDialogVisible, setTypeDetailsDialogVisible] = React.useState(false);
    const [typeDetailsDialogScope, setTypeDetailsDialogScope] = React.useState<TypeDetailsDialogScope | null>(null);
    const [additionalTaxationDialogVisible, setAdditionalTaxationDialogVisible] = React.useState(false);
    const [transportFreightDialogVisible, setTransportFreightDialogVisible] = React.useState(false);
    const [estimateSearch, setEstimateSearch] = React.useState('');
    const [creditNoteLookupSearch, setCreditNoteLookupSearch] = React.useState('');
    const [debitNoteLookupSearch, setDebitNoteLookupSearch] = React.useState('');
    const lineAttributesByLineKey = React.useMemo(() => {
        const productMetaById = new Map<number, InvoiceProduct>();
        products.forEach((product) => {
            productMetaById.set(product.productId, product);
        });

        const resolveTypeDetailLabel = (itemId: number | null, typeDetailId: number | null) => {
            if (itemId == null || typeDetailId == null) return '';
            const product = productMetaById.get(itemId) ?? null;
            const productAttributeTypeId = product?.productAttributeTypeId ?? null;
            const typedOption =
                productAttributeTypeId != null
                    ? (typeDetailOptionsByType[productAttributeTypeId] ?? []).find(
                        (option) => Number(option.productAttributeId) === typeDetailId
                    ) ?? null
                    : null;
            const selectedOption =
                (product?.productAttributes ?? []).find(
                    (option) => Number(option.productAttributeId) === typeDetailId
                ) ?? null;
            return normalizeDisplayText(typedOption?.detail ?? selectedOption?.detail ?? '');
        };

        const formatTypeQty = (value: number) => {
            if (Math.abs(value % 1) < 0.000001) return String(Math.trunc(value));
            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
        };

        const resolveLineAttributes = (itemId: number | null, tmpTypeId: number | null) => {
            const normalizedItemId = toPositiveId(itemId);
            if (normalizedItemId == null) return '';
            const normalizedTmpTypeId = toPositiveId(tmpTypeId);
            const matchingRows = typeDetails.filter((typeDetail) => {
                const rowItemId = toPositiveId(typeDetail.itemId);
                if (rowItemId == null || rowItemId !== normalizedItemId) return false;
                if (normalizedTmpTypeId == null) return true;
                const rowTmpTypeId = toPositiveId(typeDetail.tmpTypeId);
                return rowTmpTypeId == null || rowTmpTypeId === normalizedTmpTypeId;
            });

            if (matchingRows.length === 0) {
                const fallbackLabel = resolveTypeDetailLabel(normalizedItemId, normalizedTmpTypeId);
                return fallbackLabel || '';
            }

            const quantityByLabel = new Map<string, number>();
            matchingRows.forEach((typeDetail) => {
                const quantity = Number(typeDetail.quantity ?? 0);
                if (!Number.isFinite(quantity) || Math.abs(quantity) <= FINANCIAL_EPSILON) return;
                const typeDetailId = toPositiveId(typeDetail.typeDetailId);
                const label =
                    resolveTypeDetailLabel(normalizedItemId, typeDetailId)
                    || (typeDetailId != null ? `Detail ${typeDetailId}` : '');
                if (!label) return;
                quantityByLabel.set(label, (quantityByLabel.get(label) ?? 0) + quantity);
            });

            if (quantityByLabel.size === 0) return '';
            return Array.from(quantityByLabel.entries())
                .map(([label, quantity]) => `${label}-${formatTypeQty(quantity)}`)
                .join(', ');
        };

        return computation.lines.reduce<Record<string, string>>((acc, line) => {
            acc[line.key] = resolveLineAttributes(line.itemId, line.tmpTypeId);
            return acc;
        }, {});
    }, [computation.lines, products, typeDetailOptionsByType, typeDetails]);
    const scopedTypeDetailsLines = React.useMemo(() => {
        if (!typeDetailsDialogScope) return typeDetails;
        return typeDetails.filter((line) => {
            const lineItemId = toPositiveId(line.itemId);
            if (lineItemId == null || lineItemId !== typeDetailsDialogScope.itemId) return false;
            if (typeDetailsDialogScope.tmpTypeId == null) return true;
            const lineTmpTypeId = toPositiveId(line.tmpTypeId);
            return lineTmpTypeId == null || lineTmpTypeId === typeDetailsDialogScope.tmpTypeId;
        });
    }, [typeDetails, typeDetailsDialogScope]);
    const scopedTypeDetailsLineQuantity = React.useMemo(() => {
        if (!typeDetailsDialogScope) return null;
        return computation.lines.reduce((total, line) => {
            const lineItemId = toPositiveId(line.itemId);
            if (lineItemId == null || lineItemId !== typeDetailsDialogScope.itemId) return total;
            if (typeDetailsDialogScope.tmpTypeId != null) {
                const lineTmpTypeId = toPositiveId(line.tmpTypeId);
                if (lineTmpTypeId == null || lineTmpTypeId !== typeDetailsDialogScope.tmpTypeId) {
                    return total;
                }
            }
            return total + Number(line.quantity ?? 0);
        }, 0);
    }, [computation.lines, typeDetailsDialogScope]);
    const scopedTypeDetailsItemName = React.useMemo(() => {
        if (!typeDetailsDialogScope) return '';
        const product = products.find((entry) => toPositiveId(entry.productId) === typeDetailsDialogScope.itemId) ?? null;
        return product?.name?.trim() || `Item ${typeDetailsDialogScope.itemId}`;
    }, [products, typeDetailsDialogScope]);
    const typeDetailsDialogTitle = React.useMemo(() => {
        if (!typeDetailsDialogScope) return 'Type Details';
        return `Attributes - ${scopedTypeDetailsItemName}`;
    }, [scopedTypeDetailsItemName, typeDetailsDialogScope]);

    const handleAddTypeDetailFromDialog = React.useCallback(() => {
        if (typeDetailsDialogScope) {
            onAddTypeDetail({
                itemId: typeDetailsDialogScope.itemId,
                tmpTypeId: typeDetailsDialogScope.tmpTypeId
            });
            return;
        }
        onAddTypeDetail();
    }, [onAddTypeDetail, typeDetailsDialogScope]);

    const handleOpenTypeDetailsForLine = React.useCallback(
        (itemId: number | null, tmpTypeId: number | null) => {
            const normalizedItemId = toPositiveId(itemId);
            if (normalizedItemId == null) return;
            setTypeDetailsDialogScope({
                itemId: normalizedItemId,
                tmpTypeId: toPositiveId(tmpTypeId)
            });
            onOpenTypeDetailsForItem(itemId, tmpTypeId);
            setTypeDetailsDialogVisible(true);
        },
        [onOpenTypeDetailsForItem]
    );
    const [entryJumpFromDate, setEntryJumpFromDate] = React.useState<Date | null>(() => cloneDate(defaultRegisterDateRange.fromDate));
    const [entryJumpToDate, setEntryJumpToDate] = React.useState<Date | null>(() => cloneDate(defaultRegisterDateRange.toDate));
    const [registerFromDate, setRegisterFromDate] = React.useState<Date | null>(defaultRegisterDateRange.fromDate);
    const [registerToDate, setRegisterToDate] = React.useState<Date | null>(defaultRegisterDateRange.toDate);
    const [registerIncludeCancelled, setRegisterIncludeCancelled] = React.useState(false);
    const [registerPartyGroupFilter, setRegisterPartyGroupFilter] = React.useState<number | null>(null);
    const [registerAreaFilterIds, setRegisterAreaFilterIds] = React.useState<number[]>([]);
    const [registerPartyFilter, setRegisterPartyFilter] = React.useState<number | null>(null);
    const [registerProductGroupFilter, setRegisterProductGroupFilter] = React.useState('all');
    const [registerProductBrandFilter, setRegisterProductBrandFilter] = React.useState('all');
    const [registerProductFilter, setRegisterProductFilter] = React.useState('all');
    const [registerProductAttributeFilter, setRegisterProductAttributeFilter] = React.useState<number | null>(null);
    const [registerMrpFilter, setRegisterMrpFilter] = React.useState<number | null>(null);
    const [registerDeliveryStatusFilter, setRegisterDeliveryStatusFilter] = React.useState<string | null>(null);
    const [registerPlaceOfSupplyFilter, setRegisterPlaceOfSupplyFilter] = React.useState<string | null>(null);
    const [registerCustomerTypeFilter, setRegisterCustomerTypeFilter] = React.useState<string | null>(null);
    const [appliedRegisterFilters, setAppliedRegisterFilters] = React.useState<RegisterFilterState>(
        () => cloneRegisterFilterState(defaultRegisterFilters)
    );
    const [registerApplyingFilters, setRegisterApplyingFilters] = React.useState(false);
    const [registerMarkingModeEnabled, setRegisterMarkingModeEnabled] = React.useState(false);
    const [registerShowItemSummaryPanel, setRegisterShowItemSummaryPanel] = React.useState(false);
    const [registerShowPaidDueColumn, setRegisterShowPaidDueColumn] = React.useState(false);
    const [registerTableFirst, setRegisterTableFirst] = React.useState(0);
    const [registerInvoiceSupplementalFilters, setRegisterInvoiceSupplementalFilters] = React.useState<RegisterInvoiceSupplementalFilters>(
        () => ({ ...EMPTY_REGISTER_INVOICE_SUPPLEMENTAL_FILTERS })
    );
    const [registerColumnFilters, setRegisterColumnFilters] = React.useState<DataTableFilterMeta>(
        () => buildDefaultRegisterColumnFilters()
    );
    const [registerSettlementExpandedByInvoiceId, setRegisterSettlementExpandedByInvoiceId] = React.useState<Record<number, boolean>>({});
    const [registerFilterAttributeOptionsByType, setRegisterFilterAttributeOptionsByType] = React.useState<
        Record<number, RegisterAttributeFilterOption[]>
    >({});
    const [registerFilterAttributeLoadingByType, setRegisterFilterAttributeLoadingByType] = React.useState<Record<number, boolean>>({});
    const [registerPartyFilterPreviewOption, setRegisterPartyFilterPreviewOption] = React.useState<PurposeLedgerOption | null>(null);
    const [registerSelectedRows, setRegisterSelectedRows] = React.useState<SaleInvoiceListItem[]>([]);
    const [registerKeyboardFocusInvoiceId, setRegisterKeyboardFocusInvoiceId] = React.useState<number | null>(null);
    const [registerDockInvoiceId, setRegisterDockInvoiceId] = React.useState<number | null>(null);
    const [registerViewInvoiceId, setRegisterViewInvoiceId] = React.useState<number | null>(null);
    const [registerPrintSelectionInvoiceIds, setRegisterPrintSelectionInvoiceIds] = React.useState<number[] | null>(null);
    const [registerSearchMatchCase, setRegisterSearchMatchCase] = React.useState(false);
    const [registerSearchWholeWord, setRegisterSearchWholeWord] = React.useState(false);
    const [footerUtilityNotice, setFooterUtilityNotice] = React.useState<string | null>(null);
    const [dryCheckDigest, setDryCheckDigest] = React.useState<string | null>(null);
    const registerCardRef = React.useRef<HTMLDivElement | null>(null);
    const [registerDockViewportStyle, setRegisterDockViewportStyle] = React.useState<{ left: number; width: number } | null>(null);
    const [registerDockHeightPx, setRegisterDockHeightPx] = React.useState(220);
    const [registerDockResizing, setRegisterDockResizing] = React.useState(false);
    const [registerDockCollapsed, setRegisterDockCollapsed] = React.useState(false);
    const registerDockResizeSessionRef = React.useRef<{ startY: number; startHeight: number } | null>(null);
    const previousDefaultRegisterDateRangeKeyRef = React.useRef(defaultRegisterDateRangeKey);
    const previousAppliedDefaultRegisterDateRangeKeyRef = React.useRef(defaultRegisterDateRangeKey);
    const productDetailLoadAttemptKeyRef = React.useRef<string | null>(null);
    const registerApplyFiltersTimerRef = React.useRef<number | null>(null);
    const registerFilterAttributesMountedRef = React.useRef(true);
    const draftRegisterFilters = React.useMemo<RegisterFilterState>(
        () => ({
            fromDate: cloneDate(registerFromDate),
            toDate: cloneDate(registerToDate),
            includeCancelled: registerIncludeCancelled,
            partyGroupFilter: registerPartyGroupFilter,
            areaFilterIds: [...registerAreaFilterIds],
            partyFilter: registerPartyFilter,
            productGroupFilter: registerProductGroupFilter,
            productBrandFilter: registerProductBrandFilter,
            productFilter: registerProductFilter,
            productAttributeFilter: registerProductAttributeFilter,
            mrpFilter: registerMrpFilter,
            deliveryStatusFilter: registerDeliveryStatusFilter,
            placeOfSupplyFilter: registerPlaceOfSupplyFilter,
            customerTypeFilter: registerCustomerTypeFilter
        }),
        [
            registerAreaFilterIds,
            registerCustomerTypeFilter,
            registerDeliveryStatusFilter,
            registerFromDate,
            registerIncludeCancelled,
            registerPartyFilter,
            registerPartyGroupFilter,
            registerPlaceOfSupplyFilter,
            registerProductBrandFilter,
            registerProductAttributeFilter,
            registerProductFilter,
            registerProductGroupFilter,
            registerMrpFilter,
            registerToDate
        ]
    );
    const appliedRegisterFromDate = appliedRegisterFilters.fromDate;
    const appliedRegisterToDate = appliedRegisterFilters.toDate;
    const appliedRegisterIncludeCancelled = appliedRegisterFilters.includeCancelled;
    const appliedRegisterPartyGroupFilter = appliedRegisterFilters.partyGroupFilter;
    const appliedRegisterAreaFilterIds = appliedRegisterFilters.areaFilterIds;
    const appliedRegisterPartyFilter = appliedRegisterFilters.partyFilter;
    const appliedRegisterProductGroupFilter = appliedRegisterFilters.productGroupFilter;
    const appliedRegisterProductBrandFilter = appliedRegisterFilters.productBrandFilter;
    const appliedRegisterProductFilter = appliedRegisterFilters.productFilter;
    const appliedRegisterProductAttributeFilter = appliedRegisterFilters.productAttributeFilter;
    const appliedRegisterMrpFilter = appliedRegisterFilters.mrpFilter;
    const appliedRegisterDeliveryStatusFilter = appliedRegisterFilters.deliveryStatusFilter;
    const appliedRegisterPlaceOfSupplyFilter = appliedRegisterFilters.placeOfSupplyFilter;
    const appliedRegisterCustomerTypeFilter = appliedRegisterFilters.customerTypeFilter;
    const hasPendingRegisterFilterChanges = React.useMemo(
        () => !areRegisterFilterStatesEqual(draftRegisterFilters, appliedRegisterFilters),
        [appliedRegisterFilters, draftRegisterFilters]
    );
    const isRegisterDateFilterActiveForState = React.useCallback(
        (value: RegisterFilterState) => toDateRangeKey(value.fromDate, value.toDate) !== defaultRegisterDateRangeKey,
        [defaultRegisterDateRangeKey]
    );
    const hasAppliedRegisterDateFilter = React.useMemo(
        () => isRegisterDateFilterActiveForState(appliedRegisterFilters),
        [appliedRegisterFilters, isRegisterDateFilterActiveForState]
    );
    const appliedRegisterFilterCount = React.useMemo(
        () =>
            countActiveRegisterFilters(appliedRegisterFilters, {
                defaultDateRangeKey: defaultRegisterDateRangeKey
            }),
        [appliedRegisterFilters, defaultRegisterDateRangeKey]
    );
    const isDraftRegisterFiltersAtDefault = React.useMemo(
        () => areRegisterFilterStatesEqual(draftRegisterFilters, defaultRegisterFilters),
        [defaultRegisterFilters, draftRegisterFilters]
    );
    const isAppliedRegisterFiltersAtDefault = React.useMemo(
        () => areRegisterFilterStatesEqual(appliedRegisterFilters, defaultRegisterFilters),
        [appliedRegisterFilters, defaultRegisterFilters]
    );

    React.useEffect(() => {
        if (!isEntryView) {
            setEntryJumpFromDate(null);
            setEntryJumpToDate(null);
            return;
        }
        setEntryJumpFromDate((previous) => previous ?? cloneDate(defaultRegisterDateRange.fromDate));
        setEntryJumpToDate((previous) => previous ?? cloneDate(defaultRegisterDateRange.toDate));
    }, [defaultRegisterDateRange.fromDate, defaultRegisterDateRange.toDate, isEntryView]);

    React.useEffect(() => {
        if (isEntryView) {
            setRegisterDockViewportStyle(null);
            return;
        }
        const updateDockViewportStyle = () => {
            const registerCard = registerCardRef.current;
            if (!registerCard || typeof window === 'undefined') {
                setRegisterDockViewportStyle(null);
                return;
            }
            const rect = registerCard.getBoundingClientRect();
            const nextLeft = Math.max(12, rect.left + 8);
            const nextWidth = Math.max(320, Math.min(window.innerWidth - nextLeft - 12, rect.width - 16));
            setRegisterDockViewportStyle((previous) => {
                if (
                    previous &&
                    Math.abs(previous.left - nextLeft) < 1 &&
                    Math.abs(previous.width - nextWidth) < 1
                ) {
                    return previous;
                }
                return { left: nextLeft, width: nextWidth };
            });
        };
        updateDockViewportStyle();
        window.addEventListener('resize', updateDockViewportStyle);
        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && registerCardRef.current) {
            resizeObserver = new ResizeObserver(() => updateDockViewportStyle());
            resizeObserver.observe(registerCardRef.current);
        }
        return () => {
            window.removeEventListener('resize', updateDockViewportStyle);
            resizeObserver?.disconnect();
        };
    }, [isEntryView]);

    React.useEffect(() => {
        if (isEntryView) return;
        const currentRangeKey = toDateRangeKey(registerFromDate, registerToDate);
        const previousDefaultRangeKey = previousDefaultRegisterDateRangeKeyRef.current;
        if (!registerFromDate && !registerToDate) {
            setRegisterFromDate(defaultRegisterDateRange.fromDate);
            setRegisterToDate(defaultRegisterDateRange.toDate);
            previousDefaultRegisterDateRangeKeyRef.current = defaultRegisterDateRangeKey;
            return;
        }
        if (currentRangeKey === previousDefaultRangeKey && currentRangeKey !== defaultRegisterDateRangeKey) {
            setRegisterFromDate(defaultRegisterDateRange.fromDate);
            setRegisterToDate(defaultRegisterDateRange.toDate);
        }
        previousDefaultRegisterDateRangeKeyRef.current = defaultRegisterDateRangeKey;
    }, [
        defaultRegisterDateRange.fromDate,
        defaultRegisterDateRange.toDate,
        defaultRegisterDateRangeKey,
        isEntryView,
        registerFromDate,
        registerToDate
    ]);
    React.useEffect(() => {
        if (isEntryView) return;
        const currentRangeKey = toDateRangeKey(appliedRegisterFromDate, appliedRegisterToDate);
        const previousDefaultRangeKey = previousAppliedDefaultRegisterDateRangeKeyRef.current;
        if (!appliedRegisterFromDate && !appliedRegisterToDate) {
            setAppliedRegisterFilters((previous) => ({
                ...previous,
                fromDate: cloneDate(defaultRegisterDateRange.fromDate),
                toDate: cloneDate(defaultRegisterDateRange.toDate)
            }));
            previousAppliedDefaultRegisterDateRangeKeyRef.current = defaultRegisterDateRangeKey;
            return;
        }
        if (currentRangeKey === previousDefaultRangeKey && currentRangeKey !== defaultRegisterDateRangeKey) {
            setAppliedRegisterFilters((previous) => ({
                ...previous,
                fromDate: cloneDate(defaultRegisterDateRange.fromDate),
                toDate: cloneDate(defaultRegisterDateRange.toDate)
            }));
        }
        previousAppliedDefaultRegisterDateRangeKeyRef.current = defaultRegisterDateRangeKey;
    }, [
        appliedRegisterFromDate,
        appliedRegisterToDate,
        defaultRegisterDateRange.fromDate,
        defaultRegisterDateRange.toDate,
        defaultRegisterDateRangeKey,
        isEntryView
    ]);
    React.useEffect(
        () => () => {
            if (registerApplyFiltersTimerRef.current != null) {
                window.clearTimeout(registerApplyFiltersTimerRef.current);
                registerApplyFiltersTimerRef.current = null;
            }
        },
        []
    );
    React.useEffect(
        () => () => {
            registerFilterAttributesMountedRef.current = false;
        },
        []
    );

    const registerProductGroupOptions = React.useMemo(
        () => buildNamedFilterOptions(products.map((product) => product.productGroupName)),
        [products]
    );
    const registerProductGroupLookupOptions = React.useMemo(
        () => registerProductGroupOptions.filter((option) => option.value !== 'all'),
        [registerProductGroupOptions]
    );
    const registerProductBrandOptions = React.useMemo(
        () =>
            buildNamedFilterOptions(
                products
                    .filter((product) => {
                        if (registerProductGroupFilter === 'all') return true;
                        return normalizeFilterValue(product.productGroupName) === registerProductGroupFilter;
                    })
                    .map((product) => product.productBrandName)
            ),
        [products, registerProductGroupFilter]
    );
    const registerProductBrandLookupOptions = React.useMemo(
        () => registerProductBrandOptions.filter((option) => option.value !== 'all'),
        [registerProductBrandOptions]
    );
    const registerProductOptions = React.useMemo(
        () =>
            buildNamedFilterOptions(
                products
                    .filter((product) => {
                        const matchesGroup = registerProductGroupFilter === 'all'
                            || normalizeFilterValue(product.productGroupName) === registerProductGroupFilter;
                        if (!matchesGroup) return false;
                        if (registerProductBrandFilter === 'all') return true;
                        return normalizeFilterValue(product.productBrandName) === registerProductBrandFilter;
                    })
                    .map((product) => product.name)
            ),
        [products, registerProductBrandFilter, registerProductGroupFilter]
    );
    const registerProductLookupOptions = React.useMemo(
        () => registerProductOptions.filter((option) => option.value !== 'all'),
        [registerProductOptions]
    );
    const registerSelectedProduct = React.useMemo(
        () => {
            if (registerProductFilter === 'all') return null;
            return (
                products.find((product) => {
                    const matchesProduct = normalizeFilterValue(product.name) === registerProductFilter;
                    if (!matchesProduct) return false;
                    const matchesGroup = registerProductGroupFilter === 'all'
                        || normalizeFilterValue(product.productGroupName) === registerProductGroupFilter;
                    if (!matchesGroup) return false;
                    const matchesBrand = registerProductBrandFilter === 'all'
                        || normalizeFilterValue(product.productBrandName) === registerProductBrandFilter;
                    return matchesBrand;
                }) ?? null
            );
        },
        [products, registerProductBrandFilter, registerProductFilter, registerProductGroupFilter]
    );
    const registerSelectedProductAttributeTypeId =
        registerSelectedProduct?.productAttributeTypeId != null && Number(registerSelectedProduct.productAttributeTypeId) > 0
            ? Number(registerSelectedProduct.productAttributeTypeId)
            : null;
    const registerSelectedProductAttributeOptionsFromProduct = React.useMemo<RegisterAttributeFilterOption[]>(
        () =>
            (registerSelectedProduct?.productAttributes ?? [])
                .map((option) => {
                    const productAttributeId = Number(option.productAttributeId);
                    if (!Number.isFinite(productAttributeId) || productAttributeId <= 0) return null;
                    const label = option.detail?.trim() || `Attribute ${productAttributeId}`;
                    const orderNo = option.orderNo != null && Number.isFinite(Number(option.orderNo))
                        ? Number(option.orderNo)
                        : Number.MAX_SAFE_INTEGER;
                    return { label, value: productAttributeId, orderNo };
                })
                .filter((option): option is RegisterAttributeFilterOption & { orderNo: number } => option != null)
                .sort((left, right) => {
                    if (left.orderNo !== right.orderNo) return left.orderNo - right.orderNo;
                    return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
                })
                .map((option) => ({ label: option.label, value: option.value })),
        [registerSelectedProduct]
    );
    const registerSelectedProductAttributeOptionsFromTypeProps = React.useMemo<RegisterAttributeFilterOption[]>(
        () => {
            if (registerSelectedProductAttributeTypeId == null) return [];
            const options = typeDetailOptionsByType[registerSelectedProductAttributeTypeId] ?? [];
            return options
                .map((option) => {
                    const productAttributeId = Number(option.productAttributeId);
                    if (!Number.isFinite(productAttributeId) || productAttributeId <= 0) return null;
                    const label = option.detail?.trim() || `Attribute ${productAttributeId}`;
                    return { label, value: productAttributeId };
                })
                .filter((option): option is RegisterAttributeFilterOption => option != null);
        },
        [registerSelectedProductAttributeTypeId, typeDetailOptionsByType]
    );
    const registerSelectedProductAttributeOptionsFromFetch = React.useMemo<RegisterAttributeFilterOption[]>(
        () => {
            if (registerSelectedProductAttributeTypeId == null) return [];
            return registerFilterAttributeOptionsByType[registerSelectedProductAttributeTypeId] ?? [];
        },
        [registerFilterAttributeOptionsByType, registerSelectedProductAttributeTypeId]
    );
    const registerSelectedProductAttributeOptions = React.useMemo<RegisterAttributeFilterOption[]>(
        () => {
            const mergedById = new Map<number, RegisterAttributeFilterOption>();
            [
                ...registerSelectedProductAttributeOptionsFromProduct,
                ...registerSelectedProductAttributeOptionsFromTypeProps,
                ...registerSelectedProductAttributeOptionsFromFetch
            ].forEach((option) => {
                if (!mergedById.has(option.value)) mergedById.set(option.value, option);
            });
            return Array.from(mergedById.values()).sort((left, right) =>
                left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
            );
        },
        [
            registerSelectedProductAttributeOptionsFromFetch,
            registerSelectedProductAttributeOptionsFromProduct,
            registerSelectedProductAttributeOptionsFromTypeProps
        ]
    );
    const registerSelectedProductHasLocalAttributeOptions = registerSelectedProductAttributeOptionsFromProduct.length > 0;
    const registerSelectedProductAttributeOptionsLoading =
        registerSelectedProductAttributeTypeId != null
            ? !registerSelectedProductHasLocalAttributeOptions
                && registerFilterAttributeLoadingByType[registerSelectedProductAttributeTypeId] === true
            : false;
    const registerCanFilterByProductAttribute =
        registerProductFilter !== 'all'
        && (registerSelectedProductAttributeTypeId != null || registerSelectedProductAttributeOptions.length > 0);
    React.useEffect(() => {
        if (registerSelectedProductAttributeTypeId == null) return;
        if (registerSelectedProductHasLocalAttributeOptions) return;
        if (registerSelectedProductAttributeOptionsFromTypeProps.length > 0) return;
        if ((registerFilterAttributeOptionsByType[registerSelectedProductAttributeTypeId] ?? []).length > 0) return;
        if (registerFilterAttributeLoadingByType[registerSelectedProductAttributeTypeId]) return;
        let isCancelled = false;
        setRegisterFilterAttributeLoadingByType((previous) => ({
            ...previous,
            [registerSelectedProductAttributeTypeId]: true
        }));
        void apolloClient
            .query<{
                productAttributeTypeById: {
                    productAttributes: Array<{ productAttributeId: number; detail: string | null }> | null;
                } | null;
            }>({
                query: INVOICE_PRODUCT_ATTRIBUTE_TYPE_BY_ID_QUERY,
                variables: { productAttributeTypeId: registerSelectedProductAttributeTypeId },
                fetchPolicy: 'cache-first'
            })
            .then((result) => {
                if (isCancelled) return;
                const options = (result.data?.productAttributeTypeById?.productAttributes ?? [])
                    .map((option) => {
                        const productAttributeId = Number(option.productAttributeId);
                        if (!Number.isFinite(productAttributeId) || productAttributeId <= 0) return null;
                        const label = option.detail?.trim() || `Attribute ${productAttributeId}`;
                        return { label, value: productAttributeId };
                    })
                    .filter((option): option is RegisterAttributeFilterOption => option != null);
                setRegisterFilterAttributeOptionsByType((previous) => ({
                    ...previous,
                    [registerSelectedProductAttributeTypeId]: options
                }));
            })
            .catch(() => {
                if (isCancelled) return;
                setRegisterFilterAttributeOptionsByType((previous) => ({
                    ...previous,
                    [registerSelectedProductAttributeTypeId]: []
                }));
            })
            .finally(() => {
                if (!registerFilterAttributesMountedRef.current) return;
                setRegisterFilterAttributeLoadingByType((previous) => ({
                    ...previous,
                    [registerSelectedProductAttributeTypeId]: false
                }));
            });
        return () => {
            isCancelled = true;
        };
    }, [
        apolloClient,
        registerFilterAttributeLoadingByType,
        registerFilterAttributeOptionsByType,
        registerSelectedProductAttributeOptionsFromTypeProps.length,
        registerSelectedProductHasLocalAttributeOptions,
        registerSelectedProductAttributeTypeId
    ]);
    const { options: registerAreaOptions, loading: registerAreaLoading } = useAreaOptions({
        skip: isEntryView
    });
    const { options: registerLedgerGroupOptions, loading: registerLedgerGroupLoading } = useLedgerGroupOptions({
        skip: isEntryView
    });
    const registerPartyLedgerGroupOptions = React.useMemo(
        () =>
            registerLedgerGroupOptions.filter((option) => {
                const groupTypeCode = option.groupTypeCode != null ? Number(option.groupTypeCode) : null;
                return groupTypeCode != null && PARTY_LEDGER_GROUP_TYPE_CODES.has(groupTypeCode);
            }),
        [registerLedgerGroupOptions]
    );
    const registerPartyLedgerGroupIds = React.useMemo(
        () =>
            Array.from(
                new Set(
                    registerPartyLedgerGroupOptions
                        .map((option) => Number(option.value))
                        .filter((value) => Number.isFinite(value) && value > 0)
                )
            ),
        [registerPartyLedgerGroupOptions]
    );
    const registerDraftLedgerLookupGroupIds = React.useMemo(
        () =>
            registerPartyGroupFilter != null
                ? [registerPartyGroupFilter]
                : registerPartyLedgerGroupIds,
        [registerPartyGroupFilter, registerPartyLedgerGroupIds]
    );
    const registerDraftLookupGroupId1 = registerDraftLedgerLookupGroupIds[0] ?? null;
    const registerDraftLookupGroupId2 = registerDraftLedgerLookupGroupIds[1] ?? null;
    const registerDraftLookupGroupId3 = registerDraftLedgerLookupGroupIds[2] ?? null;
    const {
        options: registerDraftPartyLedgerOptions1,
        loading: registerDraftPartyLedgerLoading1
    } = useLedgerOptionsByPurpose({
        purpose: 'SALES',
        ledgerGroupId: registerDraftLookupGroupId1,
        areaIds: registerAreaFilterIds.length > 0 ? registerAreaFilterIds : null,
        includeNone: false,
        limit: 5000,
        skip: isEntryView || registerDraftLookupGroupId1 == null
    });
    const {
        options: registerDraftPartyLedgerOptions2,
        loading: registerDraftPartyLedgerLoading2
    } = useLedgerOptionsByPurpose({
        purpose: 'SALES',
        ledgerGroupId: registerDraftLookupGroupId2,
        areaIds: registerAreaFilterIds.length > 0 ? registerAreaFilterIds : null,
        includeNone: false,
        limit: 5000,
        skip: isEntryView || registerDraftLookupGroupId2 == null
    });
    const {
        options: registerDraftPartyLedgerOptions3,
        loading: registerDraftPartyLedgerLoading3
    } = useLedgerOptionsByPurpose({
        purpose: 'SALES',
        ledgerGroupId: registerDraftLookupGroupId3,
        areaIds: registerAreaFilterIds.length > 0 ? registerAreaFilterIds : null,
        includeNone: false,
        limit: 5000,
        skip: isEntryView || registerDraftLookupGroupId3 == null
    });
    const registerDraftPartyLedgerLookupOptions = React.useMemo(
        () =>
            mergeLedgerOptionSets(
                registerDraftPartyLedgerOptions1,
                registerDraftPartyLedgerOptions2,
                registerDraftPartyLedgerOptions3
            ),
        [
            registerDraftPartyLedgerOptions1,
            registerDraftPartyLedgerOptions2,
            registerDraftPartyLedgerOptions3
        ]
    );
    const registerDraftPartyLedgerLookupLoading =
        registerDraftPartyLedgerLoading1
        || registerDraftPartyLedgerLoading2
        || registerDraftPartyLedgerLoading3
        || (registerPartyGroupFilter == null && registerLedgerGroupLoading);
    const registerDraftPartyLedgerIdSet = React.useMemo(() => {
        const ids = new Set<number>();
        registerDraftPartyLedgerLookupOptions.forEach((option) => {
            const ledgerId = Number(option.value);
            if (Number.isFinite(ledgerId) && ledgerId > 0) ids.add(ledgerId);
        });
        return ids;
    }, [registerDraftPartyLedgerLookupOptions]);
    const registerSelectedDraftPartyLedgerOption = React.useMemo(() => {
        if (registerPartyFilter == null) return null;
        return (
            registerDraftPartyLedgerLookupOptions.find(
                (option) => Number(option.value) === Number(registerPartyFilter)
            ) ?? null
        );
    }, [registerDraftPartyLedgerLookupOptions, registerPartyFilter]);
    const registerSelectedDraftPartyLedgerAddress = React.useMemo(() => {
        if (registerPartyFilterPreviewOption != null) {
            const previewAddress = normalizeDisplayText(registerPartyFilterPreviewOption.address);
            return previewAddress || 'Address not available';
        }
        const fromDraft = normalizeDisplayText(registerSelectedDraftPartyLedgerOption?.address);
        if (fromDraft) return fromDraft;
        if (registerPartyFilter != null) {
            const fromLedgerMap = normalizeDisplayText(ledgerById.get(Number(registerPartyFilter))?.address);
            if (fromLedgerMap) return fromLedgerMap;
        }
        return 'Address not available';
    }, [ledgerById, registerPartyFilter, registerPartyFilterPreviewOption, registerSelectedDraftPartyLedgerOption]);

    const registerAppliedLookupGroupId1 = registerPartyLedgerGroupIds[0] ?? null;
    const registerAppliedLookupGroupId2 = registerPartyLedgerGroupIds[1] ?? null;
    const registerAppliedLookupGroupId3 = registerPartyLedgerGroupIds[2] ?? null;
    const {
        options: registerAppliedAreaPartyLedgerOptions1,
        loading: registerAppliedAreaPartyLedgerLoading1
    } = useLedgerOptionsByPurpose({
        purpose: 'SALES',
        ledgerGroupId: registerAppliedLookupGroupId1,
        areaIds: appliedRegisterAreaFilterIds.length > 0 ? appliedRegisterAreaFilterIds : null,
        includeNone: false,
        limit: 5000,
        skip: isEntryView || appliedRegisterAreaFilterIds.length === 0 || registerAppliedLookupGroupId1 == null
    });
    const {
        options: registerAppliedAreaPartyLedgerOptions2,
        loading: registerAppliedAreaPartyLedgerLoading2
    } = useLedgerOptionsByPurpose({
        purpose: 'SALES',
        ledgerGroupId: registerAppliedLookupGroupId2,
        areaIds: appliedRegisterAreaFilterIds.length > 0 ? appliedRegisterAreaFilterIds : null,
        includeNone: false,
        limit: 5000,
        skip: isEntryView || appliedRegisterAreaFilterIds.length === 0 || registerAppliedLookupGroupId2 == null
    });
    const {
        options: registerAppliedAreaPartyLedgerOptions3,
        loading: registerAppliedAreaPartyLedgerLoading3
    } = useLedgerOptionsByPurpose({
        purpose: 'SALES',
        ledgerGroupId: registerAppliedLookupGroupId3,
        areaIds: appliedRegisterAreaFilterIds.length > 0 ? appliedRegisterAreaFilterIds : null,
        includeNone: false,
        limit: 5000,
        skip: isEntryView || appliedRegisterAreaFilterIds.length === 0 || registerAppliedLookupGroupId3 == null
    });
    const registerAppliedAreaPartyLedgerIdSet = React.useMemo(() => {
        const ids = new Set<number>();
        [
            ...registerAppliedAreaPartyLedgerOptions1,
            ...registerAppliedAreaPartyLedgerOptions2,
            ...registerAppliedAreaPartyLedgerOptions3
        ].forEach((option) => {
            const ledgerId = Number(option.value);
            if (Number.isFinite(ledgerId) && ledgerId > 0) ids.add(ledgerId);
        });
        return ids;
    }, [
        registerAppliedAreaPartyLedgerOptions1,
        registerAppliedAreaPartyLedgerOptions2,
        registerAppliedAreaPartyLedgerOptions3
    ]);
    const registerAppliedAreaPartyLedgerLoading =
        registerAppliedAreaPartyLedgerLoading1
        || registerAppliedAreaPartyLedgerLoading2
        || registerAppliedAreaPartyLedgerLoading3
        || registerLedgerGroupLoading;
    const registerAppliedAreaPartyLedgerFilterReady =
        appliedRegisterAreaFilterIds.length === 0
        || (
            !registerAppliedAreaPartyLedgerLoading
            && registerPartyLedgerGroupIds.length > 0
        );
    const taxLedgerNameById = React.useMemo(() => {
        const map = new Map<number, string>();
        taxLedgerOptions.forEach((option) => {
            const ledgerId = Number(option.value);
            if (!Number.isFinite(ledgerId)) return;
            const label = option.label?.split(' • ')[0]?.trim() || `Ledger ${ledgerId}`;
            map.set(ledgerId, label);
        });
        return map;
    }, [taxLedgerOptions]);
    const hasAppliedProductFilter =
        appliedRegisterProductGroupFilter !== 'all'
        || appliedRegisterProductBrandFilter !== 'all'
        || appliedRegisterProductFilter !== 'all'
        || appliedRegisterProductAttributeFilter != null
        || appliedRegisterMrpFilter != null;

    React.useEffect(() => {
        if (registerPartyGroupFilter == null) return;
        const exists = registerPartyLedgerGroupOptions.some((option) => Number(option.value) === registerPartyGroupFilter);
        if (!exists) {
            setRegisterPartyGroupFilter(null);
            setRegisterPartyFilter(null);
        }
    }, [registerPartyGroupFilter, registerPartyLedgerGroupOptions]);

    React.useEffect(() => {
        if (registerPartyFilter == null) return;
        if (registerDraftPartyLedgerLookupLoading) return;
        if (registerDraftPartyLedgerIdSet.size === 0 || !registerDraftPartyLedgerIdSet.has(registerPartyFilter)) {
            setRegisterPartyFilter(null);
        }
    }, [registerDraftPartyLedgerIdSet, registerDraftPartyLedgerLookupLoading, registerPartyFilter]);

    React.useEffect(() => {
        if (registerProductBrandFilter === 'all') return;
        const exists = registerProductBrandOptions.some((option) => option.value === registerProductBrandFilter);
        if (!exists) {
            setRegisterProductBrandFilter('all');
        }
    }, [registerProductBrandFilter, registerProductBrandOptions]);

    React.useEffect(() => {
        if (registerProductFilter === 'all') return;
        const exists = registerProductOptions.some((option) => option.value === registerProductFilter);
        if (!exists) {
            setRegisterProductFilter('all');
        }
    }, [registerProductFilter, registerProductOptions]);
    React.useEffect(() => {
        if (registerProductFilter !== 'all') return;
        if (registerProductAttributeFilter == null) return;
        setRegisterProductAttributeFilter(null);
    }, [registerProductAttributeFilter, registerProductFilter]);
    React.useEffect(() => {
        if (registerProductAttributeFilter == null) return;
        if (!registerCanFilterByProductAttribute) {
            setRegisterProductAttributeFilter(null);
            return;
        }
        const exists = registerSelectedProductAttributeOptions.some(
            (option) => Number(option.value) === Number(registerProductAttributeFilter)
        );
        if (!exists) {
            setRegisterProductAttributeFilter(null);
        }
    }, [
        registerCanFilterByProductAttribute,
        registerProductAttributeFilter,
        registerSelectedProductAttributeOptions
    ]);

    React.useEffect(() => {
        if (isEntryView) return;
        if (!hasAppliedProductFilter) {
            productDetailLoadAttemptKeyRef.current = null;
            return;
        }
        if (registerIncludesProductNames) {
            productDetailLoadAttemptKeyRef.current = null;
            return;
        }
        if (loading) return;
        const loadAttemptKey = [
            toDateRangeKey(appliedRegisterFromDate, appliedRegisterToDate),
            appliedRegisterIncludeCancelled ? '1' : '0',
            appliedRegisterProductGroupFilter,
            appliedRegisterProductBrandFilter,
            appliedRegisterProductFilter,
            appliedRegisterProductAttributeFilter ?? 'none',
            appliedRegisterMrpFilter ?? 'none'
        ].join('|');
        if (productDetailLoadAttemptKeyRef.current === loadAttemptKey) return;
        productDetailLoadAttemptKeyRef.current = loadAttemptKey;
        onRefresh({
            fromDate: hasAppliedRegisterDateFilter ? appliedRegisterFromDate : null,
            toDate: hasAppliedRegisterDateFilter ? appliedRegisterToDate : null,
            includeCancelled: appliedRegisterIncludeCancelled,
            includeProductNames: true
        });
    }, [
        appliedRegisterFromDate,
        appliedRegisterIncludeCancelled,
        appliedRegisterProductBrandFilter,
        appliedRegisterProductAttributeFilter,
        appliedRegisterProductFilter,
        appliedRegisterProductGroupFilter,
        appliedRegisterMrpFilter,
        appliedRegisterToDate,
        hasAppliedProductFilter,
        isEntryView,
        loading,
        onRefresh,
        registerIncludesProductNames,
        hasAppliedRegisterDateFilter
    ]);

    const registerRowsPreColumnFilters = React.useMemo(() => {
        const query = registerSearch.trim();
        const normalizedQuery = registerSearchMatchCase ? query : query.toLowerCase();
        const wholeWordPattern =
            query && registerSearchWholeWord
                ? new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(query)}(?=$|[^A-Za-z0-9])`, registerSearchMatchCase ? '' : 'i')
                : null;
        const fromDateKey = toDateDayKey(appliedRegisterFromDate);
        const toDateKey = toDateDayKey(appliedRegisterToDate);
        return saleInvoices.filter((row) => {
            const idText = String(row.saleInvoiceId ?? '');
            const estimateText =
                normalizeDisplayText(row.estimateRefText)
                || (row.estimateId != null && Number(row.estimateId) > 0 ? String(row.estimateId) : '');
            const voucherText = row.voucherNumber ?? '';
            const partyText = normalizeDisplayText(row.ledgerName)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.name : '');
            const groupText = row.ledgerGroupName ?? '';
            const ledgerAddressText = normalizeDisplayText(row.ledgerAddress)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.address : '');
            const remarkText = row.remarks ?? '';
            const dateText = formatVoucherDate(row.voucherDateText);
            const amountText = formatAmount(Number(row.totalAmount || 0));
            const taxText = formatAmount(Number(row.totalTaxAmount || 0));
            const grossText = formatAmount(Number(row.totalGrossAmount || 0));
            const finalText = formatAmount(Number(row.totalFinalAmount || 0));
            const cashReceiptText = formatAmount(Number(row.cashReceiptAmount || 0));
            const bankReceiptText = formatAmount(Number(row.bankReceiptAmount || 0));
            const cashReceiptNumbersText = normalizeDisplayText(row.cashReceiptNumbers);
            const bankReceiptNumbersText = normalizeDisplayText(row.bankReceiptNumbers);
            const cashReceiptDatesText = normalizeDisplayText(row.cashReceiptDates);
            const bankReceiptDatesText = normalizeDisplayText(row.bankReceiptDates);
            const paidText = formatAmount(Number(row.paidAmount || 0));
            const dueText = formatAmount(Number(row.dueAmount || 0));
            const totalText = formatAmount(Number(row.totalNetAmount || 0));
            const voucherDate = parseVoucherDateText(row.voucherDateText);
            const voucherDateKey = toDateDayKey(voucherDate);
            const rowPartyGroupId = row.ledgerGroupId != null ? Number(row.ledgerGroupId) : null;
            const rowPartyLedgerId = row.ledgerId != null ? Number(row.ledgerId) : null;
            const normalizedDeliveryStatus = normalizeFilterValue(row.deliveryStatus ?? 'Pending');
            const normalizedProductGroups = (row.productGroupNames ?? []).map((value) => normalizeFilterValue(value));
            const normalizedProductBrands = (row.productBrandNames ?? []).map((value) => normalizeFilterValue(value));
            const normalizedProducts = (row.productNames ?? []).map((value) => normalizeFilterValue(value));
            const rowProductAttributeIds = (row.productAttributeIds ?? [])
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0);
            const rowMrpValues = (row.mrpValues ?? [])
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value >= 0);
            const placeOfSupply = resolveRegisterPlaceOfSupplyKey(row.isOtherState);
            const partyGstin = normalizeDisplayText(
                row.ledgerGstin
            ) || normalizeDisplayText(
                row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.gstNumber : ''
            );
            const customerType = resolveRegisterCustomerTypeForRow(row, partyGstin);
            const placeOfSupplyText = resolveRegisterPlaceOfSupplyLabel(placeOfSupply);
            const customerTypeText = resolveRegisterCustomerTypeLabel(customerType);

            if (!appliedRegisterIncludeCancelled && row.isCancelled) return false;
            if (appliedRegisterPartyGroupFilter != null && rowPartyGroupId !== appliedRegisterPartyGroupFilter) return false;
            if (
                appliedRegisterAreaFilterIds.length > 0
                && registerAppliedAreaPartyLedgerFilterReady
                && (rowPartyLedgerId == null || !registerAppliedAreaPartyLedgerIdSet.has(rowPartyLedgerId))
            ) {
                return false;
            }
            if (appliedRegisterPartyFilter != null && rowPartyLedgerId !== appliedRegisterPartyFilter) return false;
            if (registerIncludesProductNames) {
                if (appliedRegisterProductGroupFilter !== 'all' && !normalizedProductGroups.includes(appliedRegisterProductGroupFilter)) return false;
                if (appliedRegisterProductBrandFilter !== 'all' && !normalizedProductBrands.includes(appliedRegisterProductBrandFilter)) return false;
                if (appliedRegisterProductFilter !== 'all' && !normalizedProducts.includes(appliedRegisterProductFilter)) return false;
                if (appliedRegisterProductAttributeFilter != null && !rowProductAttributeIds.includes(appliedRegisterProductAttributeFilter)) return false;
                if (
                    appliedRegisterMrpFilter != null
                    && !rowMrpValues.some((value) => Math.abs(value - appliedRegisterMrpFilter) <= FINANCIAL_EPSILON)
                ) {
                    return false;
                }
            }
            if (appliedRegisterDeliveryStatusFilter != null && normalizedDeliveryStatus !== appliedRegisterDeliveryStatusFilter) return false;
            if (appliedRegisterPlaceOfSupplyFilter != null && placeOfSupply !== appliedRegisterPlaceOfSupplyFilter) return false;
            if (appliedRegisterCustomerTypeFilter != null && customerType !== appliedRegisterCustomerTypeFilter) return false;
            if (hasAppliedRegisterDateFilter) {
                if (fromDateKey != null && (voucherDateKey == null || voucherDateKey < fromDateKey)) return false;
                if (toDateKey != null && (voucherDateKey == null || voucherDateKey > toDateKey)) return false;
            }
            if (!query) return true;

            const searchableText = [
                idText,
                estimateText,
                voucherText,
                partyText,
                groupText,
                ledgerAddressText,
                remarkText,
                dateText,
                amountText,
                taxText,
                grossText,
                finalText,
                row.deliveryStatus ?? 'Pending',
                placeOfSupplyText,
                customerTypeText,
                partyGstin,
                cashReceiptText,
                bankReceiptText,
                cashReceiptNumbersText,
                bankReceiptNumbersText,
                cashReceiptDatesText,
                bankReceiptDatesText,
                paidText,
                dueText,
                totalText,
                ...(row.productGroupNames ?? []),
                ...(row.productBrandNames ?? []),
                ...(row.productNames ?? []),
                ...rowMrpValues.map((value) => formatAmount(value)),
                ...rowProductAttributeIds.map((value) => String(value))
            ]
                .filter(Boolean)
                .join(' ');

            if (wholeWordPattern) return wholeWordPattern.test(searchableText);
            const normalizedSearchableText = registerSearchMatchCase ? searchableText : searchableText.toLowerCase();
            return normalizedSearchableText.includes(normalizedQuery);
        });
    }, [
        registerSearch,
        registerSearchMatchCase,
        registerSearchWholeWord,
        hasAppliedRegisterDateFilter,
        appliedRegisterFromDate,
        appliedRegisterToDate,
        appliedRegisterIncludeCancelled,
        appliedRegisterPartyGroupFilter,
        appliedRegisterAreaFilterIds,
        registerAppliedAreaPartyLedgerFilterReady,
        registerAppliedAreaPartyLedgerIdSet,
        appliedRegisterPartyFilter,
        appliedRegisterProductGroupFilter,
        appliedRegisterProductBrandFilter,
        appliedRegisterProductFilter,
        appliedRegisterProductAttributeFilter,
        appliedRegisterMrpFilter,
        registerIncludesProductNames,
        appliedRegisterDeliveryStatusFilter,
        appliedRegisterPlaceOfSupplyFilter,
        appliedRegisterCustomerTypeFilter,
        ledgerById,
        saleInvoices
    ]);
    const registerInvoiceNumberColumnFilterOptions = React.useMemo(
        () =>
            buildRegisterColumnTextFilterOptions(
                registerRowsPreColumnFilters.map((row) => normalizeDisplayText(row.voucherNumber) || String(row.saleInvoiceId || ''))
            ),
        [registerRowsPreColumnFilters]
    );
    const registerInvoiceDateColumnFilterOptions = React.useMemo(
        () =>
            buildRegisterColumnTextFilterOptions(
                registerRowsPreColumnFilters.map((row) => normalizeDisplayText(formatVoucherDate(row.voucherDateText)))
            ),
        [registerRowsPreColumnFilters]
    );
    const registerInvoiceProfileTagFilterOptions = React.useMemo(() => {
        const values = new Set<string>();
        registerRowsPreColumnFilters.forEach((row) => {
            const resolvedPartyGstin = normalizeDisplayText(row.ledgerGstin) || normalizeDisplayText(
                row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.gstNumber : ''
            );
            const customerTypeCode = resolveRegisterCustomerTypeForRow(row, resolvedPartyGstin) === 'b2b' ? 'B2B' : 'B2C';
            values.add(customerTypeCode);
            if (row.isOtherState) values.add('IGST');
        });
        return Array.from(values)
            .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
            .map((value) => ({ label: value, value }));
    }, [ledgerById, registerRowsPreColumnFilters]);
    const registerPartyLedgerColumnFilterOptions = React.useMemo(() => {
        const unique = new Map<string, RegisterColumnFilterOption<string>>();
        registerRowsPreColumnFilters.forEach((row) => {
            const ledgerName = normalizeDisplayText(row.ledgerName)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.name : '');
            const ledgerGroupName = normalizeDisplayText(row.ledgerGroupName);
            const ledgerAddress = normalizeDisplayText(row.ledgerAddress)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.address : '');
            const filterValue = resolveRegisterLedgerFilterText(row, ledgerById);
            const filterKey = normalizeFilterValue(filterValue);
            if (!filterKey || unique.has(filterKey)) return;
            const primaryLabel = ledgerName && ledgerGroupName
                ? `${ledgerName} (${ledgerGroupName})`
                : ledgerName || filterValue;
            unique.set(filterKey, {
                label: primaryLabel,
                value: filterValue,
                secondaryLabel: ledgerAddress || undefined
            });
        });
        return Array.from(unique.values()).sort((left, right) =>
            left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
        );
    }, [ledgerById, registerRowsPreColumnFilters]);
    const registerNetAmountColumnFilterOptions = React.useMemo(
        () =>
            buildRegisterColumnTextFilterOptions(
                registerRowsPreColumnFilters.map((row) => formatAmount(toAmountNumber(row.totalNetAmount)))
            ),
        [registerRowsPreColumnFilters]
    );
    const registerStatusColumnFilterOptions = React.useMemo(
        () => buildRegisterColumnTextFilterOptions(registerRowsPreColumnFilters.flatMap((row) => resolveRegisterRowStatusFilterValues(row))),
        [registerRowsPreColumnFilters]
    );
    const registerVoucherNumberColumnFilterElement = React.useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => {
                const selectedInvoiceNumbers = Array.isArray(options.value)
                    ? options.value.map((entry) => normalizeDisplayText(String(entry))).filter(Boolean)
                    : [];
                const handleSelectionChange = (
                    key: keyof RegisterInvoiceSupplementalFilters | 'invoiceNumbers',
                    values: string[] | null | undefined
                ) => {
                    const normalizedValues = Array.isArray(values)
                        ? values.map((entry) => normalizeDisplayText(String(entry))).filter(Boolean)
                        : [];
                    if (key === 'invoiceNumbers') {
                        options.filterCallback(normalizedValues.length > 0 ? normalizedValues : null);
                        return;
                    }
                    setRegisterInvoiceSupplementalFilters((previous) => ({
                        ...previous,
                        [key]: normalizedValues
                    }));
                    setRegisterTableFirst(0);
                };
                return (
                    <div className="flex flex-column gap-2" style={{ minWidth: '17rem' }}>
                        <AppMultiSelect
                            value={selectedInvoiceNumbers}
                            options={registerInvoiceNumberColumnFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => handleSelectionChange('invoiceNumbers', event.value)}
                            filter
                            filterInputAutoFocus
                            showSelectAll
                            placeholder="Invoice No."
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={registerInvoiceNumberColumnFilterOptions.length > 0 ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={registerInvoiceNumberColumnFilterOptions.length === 0}
                            style={{ width: '100%' }}
                        />
                        <AppMultiSelect
                            value={registerInvoiceSupplementalFilters.invoiceDates}
                            options={registerInvoiceDateColumnFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => handleSelectionChange('invoiceDates', event.value)}
                            filter
                            showSelectAll
                            placeholder="Invoice Date"
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={registerInvoiceDateColumnFilterOptions.length > 0 ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={registerInvoiceDateColumnFilterOptions.length === 0}
                            style={{ width: '100%' }}
                        />
                        <AppMultiSelect
                            value={registerInvoiceSupplementalFilters.profileTags}
                            options={registerInvoiceProfileTagFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(event) => handleSelectionChange('profileTags', event.value)}
                            filter
                            showSelectAll
                            placeholder="B2B / B2C / IGST"
                            className="p-column-filter"
                            display="comma"
                            maxSelectedLabels={1}
                            emptyMessage={registerInvoiceProfileTagFilterOptions.length > 0 ? 'No values found' : 'No values'}
                            emptyFilterMessage="No results found"
                            disabled={registerInvoiceProfileTagFilterOptions.length === 0}
                            style={{ width: '100%' }}
                        />
                    </div>
                );
            },
        [
            registerInvoiceDateColumnFilterOptions,
            registerInvoiceNumberColumnFilterOptions,
            registerInvoiceProfileTagFilterOptions,
            registerInvoiceSupplementalFilters.invoiceDates,
            registerInvoiceSupplementalFilters.profileTags
        ]
    );
    const registerPartyLedgerColumnFilterElement = React.useMemo(
        () =>
            (options: ColumnFilterElementTemplateOptions) => (
                <AppMultiSelect
                    value={(options.value ?? []) as string[]}
                    options={registerPartyLedgerColumnFilterOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(event) => options.filterCallback(event.value)}
                    filter
                    filterBy="label,secondaryLabel"
                    filterInputAutoFocus
                    showSelectAll
                    placeholder="Any party"
                    className="p-column-filter"
                    display="comma"
                    maxSelectedLabels={1}
                    emptyMessage={registerPartyLedgerColumnFilterOptions.length > 0 ? 'No values found' : 'No values'}
                    emptyFilterMessage="No results found"
                    disabled={registerPartyLedgerColumnFilterOptions.length === 0}
                    style={{ minWidth: '18rem' }}
                    itemTemplate={(option: RegisterColumnFilterOption<string>) => (
                        <div className="flex flex-column">
                            <span>{option.label}</span>
                            {option.secondaryLabel ? <small className="text-600">{option.secondaryLabel}</small> : null}
                        </div>
                    )}
                />
            ),
        [registerPartyLedgerColumnFilterOptions]
    );
    const registerNetAmountColumnFilterElement = React.useMemo(
        () => buildRegisterMultiSelectFilterElement(registerNetAmountColumnFilterOptions, 'Any net amount'),
        [registerNetAmountColumnFilterOptions]
    );
    const registerStatusColumnFilterElement = React.useMemo(
        () => buildRegisterMultiSelectFilterElement(registerStatusColumnFilterOptions, 'Any status'),
        [registerStatusColumnFilterOptions]
    );
    const filteredSaleInvoices = React.useMemo(() => {
        const voucherFilterValues = resolveRegisterColumnFilterValues<string>(registerColumnFilters, 'voucherNumber');
        const invoiceNumberFilterSet = new Set(
            voucherFilterValues.map((value) => normalizeFilterValue(value)).filter(Boolean)
        );
        const invoiceDateFilterSet = new Set(
            registerInvoiceSupplementalFilters.invoiceDates.map((value) => normalizeFilterValue(value)).filter(Boolean)
        );
        const invoiceProfileTagFilterSet = new Set(
            registerInvoiceSupplementalFilters.profileTags.map((value) => normalizeFilterValue(value)).filter(Boolean)
        );
        const ledgerFilterSet = new Set(
            resolveRegisterColumnFilterValues<string>(registerColumnFilters, 'ledgerFilterDisplay')
                .map((value) => normalizeFilterValue(value))
                .filter(Boolean)
        );
        const netAmountFilterSet = new Set(
            resolveRegisterColumnFilterValues<string>(registerColumnFilters, 'totalNetAmountDisplay')
                .map((value) => normalizeFilterValue(value))
                .filter(Boolean)
        );
        const statusFilterSet = new Set(
            resolveRegisterColumnFilterValues<string>(registerColumnFilters, 'registerStatusLabel')
                .map((value) => normalizeFilterValue(value))
                .filter(Boolean)
        );
        return registerRowsPreColumnFilters
            .filter((row) => {
                const voucherText = normalizeDisplayText(row.voucherNumber) || String(row.saleInvoiceId || '');
                const normalizedVoucherText = normalizeFilterValue(voucherText);
                if (invoiceNumberFilterSet.size > 0 && !invoiceNumberFilterSet.has(normalizedVoucherText)) return false;

                const voucherDateText = normalizeDisplayText(formatVoucherDate(row.voucherDateText));
                const normalizedVoucherDateText = normalizeFilterValue(voucherDateText);
                if (invoiceDateFilterSet.size > 0 && !invoiceDateFilterSet.has(normalizedVoucherDateText)) return false;

                if (invoiceProfileTagFilterSet.size > 0) {
                    const resolvedPartyGstin = normalizeDisplayText(row.ledgerGstin) || normalizeDisplayText(
                        row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.gstNumber : ''
                    );
                    const customerTypeCode = resolveRegisterCustomerTypeForRow(row, resolvedPartyGstin) === 'b2b' ? 'b2b' : 'b2c';
                    const rowProfileTags = [customerTypeCode];
                    if (row.isOtherState) rowProfileTags.push('igst');
                    if (!rowProfileTags.some((tag) => invoiceProfileTagFilterSet.has(tag))) return false;
                }

                const ledgerText = resolveRegisterLedgerFilterText(row, ledgerById);
                const normalizedLedgerText = normalizeFilterValue(ledgerText);
                if (ledgerFilterSet.size > 0 && !ledgerFilterSet.has(normalizedLedgerText)) return false;

                const netAmountText = normalizeFilterValue(formatAmount(toAmountNumber(row.totalNetAmount)));
                if (netAmountFilterSet.size > 0 && !netAmountFilterSet.has(netAmountText)) return false;

                const rowStatusValues = resolveRegisterRowStatusFilterValues(row)
                    .map((value) => normalizeFilterValue(value))
                    .filter(Boolean);
                if (statusFilterSet.size > 0 && !rowStatusValues.some((value) => statusFilterSet.has(value))) return false;

                return true;
            })
            .map((row) => {
                const registerStatusLabel = resolveRegisterRowStatusFilterValues(row)[0] ?? '';
                return {
                    ...row,
                    registerStatusLabel,
                    ledgerFilterDisplay: resolveRegisterLedgerFilterText(row, ledgerById),
                    totalNetAmountDisplay: formatAmount(toAmountNumber(row.totalNetAmount))
                };
            });
    }, [ledgerById, registerColumnFilters, registerRowsPreColumnFilters, registerInvoiceSupplementalFilters.invoiceDates, registerInvoiceSupplementalFilters.profileTags]);
    const handleRegisterColumnFilter = React.useCallback((event: DataTableFilterEvent) => {
        setRegisterTableFirst(0);
        setRegisterColumnFilters(event.filters);
    }, []);
    const handleRegisterPage = React.useCallback((event: DataTablePageEvent) => {
        setRegisterTableFirst(Math.max(Number(event.first ?? 0), 0));
    }, []);
    const hasActiveRegisterInvoiceSupplementalFilters = React.useMemo(
        () => !isRegisterInvoiceSupplementalFiltersEmpty(registerInvoiceSupplementalFilters),
        [registerInvoiceSupplementalFilters]
    );
    const registerHasActiveColumnFilters = React.useMemo(
        () => hasActiveRegisterColumnFilters(registerColumnFilters) || hasActiveRegisterInvoiceSupplementalFilters,
        [hasActiveRegisterInvoiceSupplementalFilters, registerColumnFilters]
    );
    React.useEffect(() => {
        if (filteredSaleInvoices.length === 0) {
            setRegisterTableFirst(0);
            return;
        }
        setRegisterTableFirst((previous) => (previous >= filteredSaleInvoices.length ? 0 : previous));
    }, [filteredSaleInvoices.length]);
    const registerResolvedTableFirst = React.useMemo(() => {
        if (filteredSaleInvoices.length === 0) return 0;
        if (registerTableFirst >= filteredSaleInvoices.length) return 0;
        return Math.max(registerTableFirst, 0);
    }, [filteredSaleInvoices.length, registerTableFirst]);
    const filteredSaleInvoiceIdSet = React.useMemo(() => {
        const ids = new Set<number>();
        filteredSaleInvoices.forEach((row) => {
            const saleInvoiceId = Number(row.saleInvoiceId);
            if (Number.isFinite(saleInvoiceId) && saleInvoiceId > 0) ids.add(saleInvoiceId);
        });
        return ids;
    }, [filteredSaleInvoices]);
    React.useEffect(() => {
        if (filteredSaleInvoices.length === 0) {
            setRegisterKeyboardFocusInvoiceId(null);
            return;
        }
        setRegisterKeyboardFocusInvoiceId((previous) => {
            if (
                previous != null &&
                filteredSaleInvoices.some((row) => Number(row.saleInvoiceId) === previous)
            ) {
                return previous;
            }
            const firstInvoiceId = Number(filteredSaleInvoices[0]?.saleInvoiceId);
            return Number.isFinite(firstInvoiceId) && firstInvoiceId > 0 ? firstInvoiceId : null;
        });
    }, [filteredSaleInvoices]);
    React.useEffect(() => {
        if (filteredSaleInvoices.length === 0) {
            setRegisterDockInvoiceId(null);
            return;
        }
        setRegisterDockInvoiceId((previous) => {
            if (
                previous != null &&
                filteredSaleInvoices.some((row) => Number(row.saleInvoiceId) === previous)
            ) {
                return previous;
            }
            const firstInvoiceId = Number(filteredSaleInvoices[0]?.saleInvoiceId);
            return Number.isFinite(firstInvoiceId) && firstInvoiceId > 0 ? firstInvoiceId : null;
        });
    }, [filteredSaleInvoices]);
    React.useEffect(() => {
        if (registerMarkingModeEnabled) return;
        setRegisterSelectedRows((previous) => (previous.length === 0 ? previous : []));
    }, [registerMarkingModeEnabled]);
    React.useEffect(() => {
        setRegisterSelectedRows((previous) => {
            if (previous.length === 0) return previous;
            const next = previous.filter((row) => {
                const saleInvoiceId = Number(row.saleInvoiceId);
                return Number.isFinite(saleInvoiceId) && filteredSaleInvoiceIdSet.has(saleInvoiceId);
            });
            return next.length === previous.length ? previous : next;
        });
    }, [filteredSaleInvoiceIdSet]);
    const selectedRegisterInvoiceIds = React.useMemo(() => {
        const ids = new Set<number>();
        registerSelectedRows.forEach((row) => {
            const saleInvoiceId = Number(row.saleInvoiceId);
            if (Number.isFinite(saleInvoiceId) && saleInvoiceId > 0 && filteredSaleInvoiceIdSet.has(saleInvoiceId)) {
                ids.add(saleInvoiceId);
            }
        });
        return Array.from(ids);
    }, [filteredSaleInvoiceIdSet, registerSelectedRows]);
    const selectedRegisterInvoiceIdSet = React.useMemo(
        () => new Set(selectedRegisterInvoiceIds),
        [selectedRegisterInvoiceIds]
    );
    const registerViewRow = React.useMemo(() => {
        if (registerViewInvoiceId == null) return null;
        return (
            filteredSaleInvoices.find((row) => Number(row.saleInvoiceId) === registerViewInvoiceId)
            ?? saleInvoices.find((row) => Number(row.saleInvoiceId) === registerViewInvoiceId)
            ?? null
        );
    }, [filteredSaleInvoices, registerViewInvoiceId, saleInvoices]);
    const registerDockRow = React.useMemo(() => {
        if (registerDockInvoiceId == null) return null;
        return (
            filteredSaleInvoices.find((row) => Number(row.saleInvoiceId) === registerDockInvoiceId)
            ?? saleInvoices.find((row) => Number(row.saleInvoiceId) === registerDockInvoiceId)
            ?? null
        );
    }, [filteredSaleInvoices, registerDockInvoiceId, saleInvoices]);
    const registerPrintSelectionIdSet = React.useMemo(
        () => new Set(registerPrintSelectionInvoiceIds ?? []),
        [registerPrintSelectionInvoiceIds]
    );
    const registerDockStyle = React.useMemo<React.CSSProperties | undefined>(
        () =>
            registerDockViewportStyle
                ? {
                    left: `${registerDockViewportStyle.left}px`,
                    width: `${registerDockViewportStyle.width}px`
                }
                : undefined,
        [registerDockViewportStyle]
    );
    const registerDockContentStyle = React.useMemo<React.CSSProperties | undefined>(
        () => (registerDockCollapsed ? undefined : { height: `${registerDockHeightPx}px` }),
        [registerDockCollapsed, registerDockHeightPx]
    );
    const registerTableDockSpacerStyle = React.useMemo<React.CSSProperties | undefined>(() => {
        if (!registerShowItemSummaryPanel || !registerDockRow || !registerDockViewportStyle) return undefined;
        if (registerDockCollapsed) {
            return { paddingBottom: '24px' };
        }
        // Keep last rows visible above the fixed dock without adding a full dock-height gap.
        const spacerPx = Math.max(24, Math.min(120, Math.round(registerDockHeightPx * 0.35)));
        return {
            paddingBottom: `${spacerPx}px`
        };
    }, [registerDockCollapsed, registerDockHeightPx, registerDockRow, registerDockViewportStyle, registerShowItemSummaryPanel]);
    const handleRegisterDockResizeStart = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        registerDockResizeSessionRef.current = {
            startY: event.clientY,
            startHeight: registerDockHeightPx
        };
        setRegisterDockResizing(true);
    }, [registerDockHeightPx]);
    React.useEffect(() => {
        if (!registerDockResizing) return;
        const handleMouseMove = (event: MouseEvent) => {
            const session = registerDockResizeSessionRef.current;
            if (!session) return;
            const deltaY = session.startY - event.clientY;
            const minHeight = 150;
            const maxHeight = Math.max(240, Math.floor(window.innerHeight * 0.72));
            const nextHeight = Math.max(minHeight, Math.min(maxHeight, session.startHeight + deltaY));
            setRegisterDockHeightPx(nextHeight);
        };
        const handleMouseUp = () => {
            registerDockResizeSessionRef.current = null;
            setRegisterDockResizing(false);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [registerDockResizing]);
    React.useEffect(() => {
        if (!registerShowItemSummaryPanel) return;
        if (registerDockInvoiceId == null) return;
        if (Object.prototype.hasOwnProperty.call(registerItemSummaryByInvoiceId, registerDockInvoiceId)) return;
        if (registerItemSummaryLoadingByInvoiceId[registerDockInvoiceId]) return;
        void onLoadRegisterItemSummary(registerDockInvoiceId);
    }, [
        registerDockInvoiceId,
        onLoadRegisterItemSummary,
        registerItemSummaryByInvoiceId,
        registerItemSummaryLoadingByInvoiceId,
        registerShowItemSummaryPanel
    ]);
    const registerTotals = React.useMemo(
        () =>
            filteredSaleInvoices.reduce(
                (totals, row) => {
                    totals.totalQpsDiscountAmount += toAmountNumber(row.totalQpsDiscountAmount);
                    totals.totalProductDiscountAmount += toAmountNumber(row.totalProductDiscountAmount);
                    totals.totalCashDiscountAmount += toAmountNumber(row.totalCashDiscountAmount);
                    totals.totalGrossAmount += toAmountNumber(row.totalGrossAmount);
                    totals.totalTaxAmount += toAmountNumber(row.totalTaxAmount);
                    totals.roundOffAmount += toAmountNumber(row.roundOffAmount);
                    totals.totalNetAmount += toAmountNumber(row.totalNetAmount);
                    totals.cashReceiptAmount += toAmountNumber(row.cashReceiptAmount);
                    totals.bankReceiptAmount += toAmountNumber(row.bankReceiptAmount);
                    totals.loyaltyAppliedAmount += toAmountNumber(row.loyaltyAppliedAmount);
                    totals.loyaltyPointsRedeemed += toAmountNumber(row.loyaltyPointsRedeemed);
                    totals.giftCertificateAppliedAmount += toAmountNumber(row.giftCertificateAppliedAmount);
                    totals.giftCertificateApplicationCount += Number(row.giftCertificateApplicationCount ?? 0);
                    totals.settlementAppliedAmount += toAmountNumber(row.settlementAppliedAmount);
                    totals.creditNoteAmount += toAmountNumber(row.creditNoteAmount);
                    totals.voucherBillAmount += toAmountNumber(row.voucherBillAmount);
                    totals.returnAmount += toAmountNumber(row.returnAmount);
                    totals.paidAmount += toAmountNumber(row.paidAmount);
                    totals.dueAmount += toAmountNumber(row.dueAmount);
                    return totals;
                },
                {
                    totalQpsDiscountAmount: 0,
                    totalProductDiscountAmount: 0,
                    totalCashDiscountAmount: 0,
                    totalGrossAmount: 0,
                    totalTaxAmount: 0,
                    roundOffAmount: 0,
                    totalNetAmount: 0,
                    cashReceiptAmount: 0,
                    bankReceiptAmount: 0,
                    loyaltyAppliedAmount: 0,
                    loyaltyPointsRedeemed: 0,
                    giftCertificateAppliedAmount: 0,
                    giftCertificateApplicationCount: 0,
                    settlementAppliedAmount: 0,
                    creditNoteAmount: 0,
                    voucherBillAmount: 0,
                    returnAmount: 0,
                    paidAmount: 0,
                    dueAmount: 0
                }
            ),
        [filteredSaleInvoices]
    );
    const registerTopSummaryRows = React.useMemo<SaleInvoiceListItem[]>(
        () => [
            {
                saleInvoiceId: REGISTER_TOTALS_ROW_ID,
                voucherNumber: 'TOTAL',
                voucherDateText: null,
                billNumber: null,
                estimateId: null,
                estimateRefText: null,
                ledgerId: null,
                ledgerName: 'All filtered invoices',
                ledgerGstin: null,
                gstStopDate: null,
                ledgerAddress: null,
                ledgerGroupId: null,
                ledgerGroupName: null,
                otherLedgerId: null,
                remarks: null,
                isVatIncluded: false,
                isOtherState: false,
                hasScheme: false,
                isChecked: false,
                deliveryStatus: null,
                hasLedgerGst: false,
                productGroupNames: [],
                productBrandNames: [],
                productNames: [],
                isDisputed: false,
                isCancelled: false,
                linkedCreditNoteCount: 0,
                linkedDebitNoteCount: 0,
                linkedCreditNoteRefText: null,
                linkedDebitNoteRefText: null,
                totalProductDiscountAmount: registerTotals.totalProductDiscountAmount,
                totalDisplayAmount: 0,
                totalCashDiscountAmount: registerTotals.totalCashDiscountAmount,
                totalReplacementAmount: 0,
                totalLessSpecialAmount: 0,
                totalGrossAmount: registerTotals.totalGrossAmount,
                totalQpsDiscountAmount: registerTotals.totalQpsDiscountAmount,
                totalFinalAmount: 0,
                totalQuantity: 0,
                totalFreeQuantity: 0,
                totalQuantityRateAmount: 0,
                totalAdditionalTaxAmount: 0,
                totalAmount: 0,
                totalTaxAmount: registerTotals.totalTaxAmount,
                roundOffAmount: registerTotals.roundOffAmount,
                totalNetAmount: registerTotals.totalNetAmount,
                cashReceiptAmount: registerTotals.cashReceiptAmount,
                bankReceiptAmount: registerTotals.bankReceiptAmount,
                loyaltyAppliedAmount: registerTotals.loyaltyAppliedAmount,
                loyaltyPointsRedeemed: registerTotals.loyaltyPointsRedeemed,
                giftCertificateAppliedAmount: registerTotals.giftCertificateAppliedAmount,
                giftCertificateApplicationCount: registerTotals.giftCertificateApplicationCount,
                settlementAppliedAmount: registerTotals.settlementAppliedAmount,
                cashReceiptNumbers: null,
                bankReceiptNumbers: null,
                cashReceiptDates: null,
                bankReceiptDates: null,
                creditNoteAmount: registerTotals.creditNoteAmount,
                voucherBillAmount: registerTotals.voucherBillAmount,
                returnAmount: registerTotals.returnAmount,
                paidAmount: registerTotals.paidAmount,
                dueAmount: registerTotals.dueAmount
            }
        ],
        [registerTotals]
    );

    React.useEffect(() => {
        if (estimateLookupDialogVisible) return;
        setEstimateSearch('');
    }, [estimateLookupDialogVisible]);

    const requestEstimateSearch = React.useCallback(() => {
        void onSearchEstimateLookups(estimateSearch);
    }, [estimateSearch, onSearchEstimateLookups]);

    const resetEstimateSearch = React.useCallback(() => {
        setEstimateSearch('');
        void onSearchEstimateLookups('');
    }, [onSearchEstimateLookups]);

    React.useEffect(() => {
        if (creditNoteDialogVisible) return;
        setCreditNoteLookupSearch('');
    }, [creditNoteDialogVisible]);

    React.useEffect(() => {
        if (debitNoteDialogVisible) return;
        setDebitNoteLookupSearch('');
    }, [debitNoteDialogVisible]);

    React.useEffect(() => {
        if (!footerUtilityNotice) return;
        const timer = window.setTimeout(() => {
            setFooterUtilityNotice(null);
        }, 2600);
        return () => {
            window.clearTimeout(timer);
        };
    }, [footerUtilityNotice]);
    React.useEffect(() => {
        setDryCheckDigest(null);
    }, [editingSaleInvoiceId, routeView]);

    const filteredCreditNoteLookups = React.useMemo(() => {
        const query = creditNoteLookupSearch.trim().toLowerCase();
        if (!query) return creditNoteLookups;
        return creditNoteLookups.filter((row) => {
            const returnId = String(row.saleReturnId ?? '');
            const voucherNo = (row.voucherNumber ?? '').toLowerCase();
            const party = (row.ledgerName ?? '').toLowerCase();
            const dateText = formatVoucherDate(row.voucherDateText).toLowerCase();
            const totalText = formatAmount(Number(row.totalNetAmount ?? 0)).toLowerCase();
            return (
                returnId.includes(query) ||
                voucherNo.includes(query) ||
                party.includes(query) ||
                dateText.includes(query) ||
                totalText.includes(query)
            );
        });
    }, [creditNoteLookupSearch, creditNoteLookups]);

    const queueApplyRegisterFilters = React.useCallback(
        (nextFilters: RegisterFilterState) => {
            const resolvedFilters = cloneRegisterFilterState(nextFilters);
            if (registerApplyFiltersTimerRef.current != null) {
                window.clearTimeout(registerApplyFiltersTimerRef.current);
                registerApplyFiltersTimerRef.current = null;
            }
            setRegisterApplyingFilters(true);
            registerApplyFiltersTimerRef.current = window.setTimeout(() => {
                setAppliedRegisterFilters(resolvedFilters);
                setRegisterApplyingFilters(false);
                registerApplyFiltersTimerRef.current = null;
                setRegisterTableFirst(0);
                const includeProductNames =
                    resolvedFilters.productGroupFilter !== 'all'
                    || resolvedFilters.productBrandFilter !== 'all'
                    || resolvedFilters.productFilter !== 'all'
                    || resolvedFilters.productAttributeFilter != null
                    || resolvedFilters.mrpFilter != null;
                const shouldApplyDateFilter = isRegisterDateFilterActiveForState(resolvedFilters);
                onRefresh({
                    fromDate: shouldApplyDateFilter ? resolvedFilters.fromDate : null,
                    toDate: shouldApplyDateFilter ? resolvedFilters.toDate : null,
                    includeCancelled: resolvedFilters.includeCancelled,
                    includeProductNames
                });
            }, 250);
        },
        [isRegisterDateFilterActiveForState, onRefresh]
    );
    const applyRegisterFilters = React.useCallback(() => {
        queueApplyRegisterFilters(draftRegisterFilters);
    }, [draftRegisterFilters, queueApplyRegisterFilters]);

    const resetRegisterFilters = React.useCallback(() => {
        const nextFilters = cloneRegisterFilterState(defaultRegisterFilters);
        setRegisterFromDate(nextFilters.fromDate);
        setRegisterToDate(nextFilters.toDate);
        setRegisterIncludeCancelled(nextFilters.includeCancelled);
        setRegisterPartyGroupFilter(nextFilters.partyGroupFilter);
        setRegisterAreaFilterIds(nextFilters.areaFilterIds);
        setRegisterPartyFilter(nextFilters.partyFilter);
        setRegisterProductGroupFilter(nextFilters.productGroupFilter);
        setRegisterProductBrandFilter(nextFilters.productBrandFilter);
        setRegisterProductFilter(nextFilters.productFilter);
        setRegisterProductAttributeFilter(nextFilters.productAttributeFilter);
        setRegisterMrpFilter(nextFilters.mrpFilter);
        setRegisterDeliveryStatusFilter(nextFilters.deliveryStatusFilter);
        setRegisterPlaceOfSupplyFilter(nextFilters.placeOfSupplyFilter);
        setRegisterCustomerTypeFilter(nextFilters.customerTypeFilter);
        setRegisterInvoiceSupplementalFilters({ ...EMPTY_REGISTER_INVOICE_SUPPLEMENTAL_FILTERS });
        setRegisterColumnFilters(buildDefaultRegisterColumnFilters());
        queueApplyRegisterFilters(nextFilters);
    }, [defaultRegisterFilters, queueApplyRegisterFilters]);

    const refreshRegister = React.useCallback(() => {
        if (hasPendingRegisterFilterChanges) {
            queueApplyRegisterFilters(draftRegisterFilters);
            return;
        }
        onRefresh({
            fromDate: hasAppliedRegisterDateFilter ? appliedRegisterFromDate : null,
            toDate: hasAppliedRegisterDateFilter ? appliedRegisterToDate : null,
            includeCancelled: appliedRegisterIncludeCancelled,
            includeProductNames: hasAppliedProductFilter
        });
    }, [
        hasPendingRegisterFilterChanges,
        queueApplyRegisterFilters,
        draftRegisterFilters,
        onRefresh,
        hasAppliedRegisterDateFilter,
        appliedRegisterFromDate,
        appliedRegisterToDate,
        appliedRegisterIncludeCancelled,
        hasAppliedProductFilter
    ]);
    const registerCanResetFilters = !isDraftRegisterFiltersAtDefault || !isAppliedRegisterFiltersAtDefault || registerHasActiveColumnFilters;
    const focusRegisterFilterControl = React.useCallback((elementId: string) => {
        if (typeof document === 'undefined') return false;
        const direct = document.getElementById(elementId) as HTMLElement | null;
        const nestedInput = document.querySelector<HTMLElement>(`#${elementId} input`);
        const candidates = [direct, nestedInput];
        for (const candidate of candidates) {
            if (!candidate) continue;
            candidate.focus?.();
            const active = document.activeElement as HTMLElement | null;
            if (active === candidate || (candidate.contains?.(active) ?? false)) return true;
        }
        return false;
    }, []);
    const registerFilterStatusText = React.useMemo(() => {
        if (registerApplyingFilters) return 'Applying filters...';
        if (hasPendingRegisterFilterChanges) {
            return `Draft changes pending • Applied filters: ${appliedRegisterFilterCount}${registerHasActiveColumnFilters ? ' • Column filters active' : ''} • Search updates live • F11 to focus search`;
        }
        return `Applied filters: ${appliedRegisterFilterCount}${registerHasActiveColumnFilters ? ' • Column filters active' : ''} • Search updates live • F11 to focus search`;
    }, [appliedRegisterFilterCount, hasPendingRegisterFilterChanges, registerApplyingFilters, registerHasActiveColumnFilters]);

    const moveRegisterKeyboardFocus = React.useCallback(
        (direction: -1 | 1) => {
            if (filteredSaleInvoices.length === 0) return;
            setRegisterKeyboardFocusInvoiceId((previous) => {
                const currentIndex =
                    previous == null
                        ? 0
                        : filteredSaleInvoices.findIndex((row) => Number(row.saleInvoiceId) === previous);
                const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
                const nextIndex = Math.min(
                    filteredSaleInvoices.length - 1,
                    Math.max(0, safeCurrentIndex + direction)
                );
                const nextInvoiceId = Number(filteredSaleInvoices[nextIndex]?.saleInvoiceId);
                if (Number.isFinite(nextInvoiceId) && nextInvoiceId > 0) {
                    setRegisterDockInvoiceId(nextInvoiceId);
                    return nextInvoiceId;
                }
                return previous;
            });
        },
        [filteredSaleInvoices]
    );
    const toggleRegisterKeyboardFocusedSelection = React.useCallback(() => {
        if (!registerMarkingModeEnabled) return;
        if (filteredSaleInvoices.length === 0) return;
        const focusedRow =
            (registerKeyboardFocusInvoiceId != null
                ? filteredSaleInvoices.find((row) => Number(row.saleInvoiceId) === registerKeyboardFocusInvoiceId)
                : null)
            ?? filteredSaleInvoices[0];
        if (!focusedRow) return;
        const focusedInvoiceId = Number(focusedRow.saleInvoiceId);
        if (!Number.isFinite(focusedInvoiceId) || focusedInvoiceId <= 0) return;
        setRegisterSelectedRows((previous) => {
            const alreadySelected = previous.some((row) => Number(row.saleInvoiceId) === focusedInvoiceId);
            if (alreadySelected) {
                return previous.filter((row) => Number(row.saleInvoiceId) !== focusedInvoiceId);
            }
            return [...previous, focusedRow];
        });
    }, [filteredSaleInvoices, registerKeyboardFocusInvoiceId, registerMarkingModeEnabled]);
    const openRegisterViewDialog = React.useCallback(
        (row: SaleInvoiceListItem) => {
            const saleInvoiceId = Number(row.saleInvoiceId);
            if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0) return;
            setRegisterViewInvoiceId(saleInvoiceId);
            if (Object.prototype.hasOwnProperty.call(registerItemSummaryByInvoiceId, saleInvoiceId)) return;
            if (registerItemSummaryLoadingByInvoiceId[saleInvoiceId]) return;
            void onLoadRegisterItemSummary(saleInvoiceId);
        },
        [onLoadRegisterItemSummary, registerItemSummaryByInvoiceId, registerItemSummaryLoadingByInvoiceId]
    );
    const closeRegisterViewDialog = React.useCallback(() => {
        setRegisterViewInvoiceId(null);
    }, []);
    const handleRegisterSelectionChange = React.useCallback((event: { value: unknown }) => {
        if (!registerMarkingModeEnabled) return;
        if (Array.isArray(event.value)) {
            const nextRows = event.value as SaleInvoiceListItem[];
            setRegisterSelectedRows(nextRows);
            const lastSelectedInvoiceId = Number(nextRows[nextRows.length - 1]?.saleInvoiceId);
            if (Number.isFinite(lastSelectedInvoiceId) && lastSelectedInvoiceId > 0) {
                setRegisterKeyboardFocusInvoiceId(lastSelectedInvoiceId);
                setRegisterDockInvoiceId(lastSelectedInvoiceId);
                void onLoadRegisterItemSummary(lastSelectedInvoiceId, true);
            }
            return;
        }
        if (event.value != null && typeof event.value === 'object') {
            const row = event.value as SaleInvoiceListItem;
            setRegisterSelectedRows([row]);
            const selectedInvoiceId = Number(row.saleInvoiceId);
            if (Number.isFinite(selectedInvoiceId) && selectedInvoiceId > 0) {
                setRegisterKeyboardFocusInvoiceId(selectedInvoiceId);
                setRegisterDockInvoiceId(selectedInvoiceId);
                void onLoadRegisterItemSummary(selectedInvoiceId, true);
            }
            return;
        }
        setRegisterSelectedRows([]);
    }, [onLoadRegisterItemSummary, registerMarkingModeEnabled]);

    const resolveRegisterPrintRows = React.useCallback(
        (selectedInvoiceIds: number[]) => {
            if (selectedInvoiceIds.length === 0) return filteredSaleInvoices;
            const selectedIdSet = new Set(selectedInvoiceIds);
            const selectedRows = filteredSaleInvoices.filter((row) => selectedIdSet.has(Number(row.saleInvoiceId)));
            return selectedRows.length > 0 ? selectedRows : filteredSaleInvoices;
        },
        [filteredSaleInvoices]
    );

    const tryTemplateRegisterPrint = React.useCallback(
        async (mode: 'summary' | 'book' | 'invoice' | 'loading_sheet', selectedInvoiceIds: number[]) => {
            const rows = resolveRegisterPrintRows(selectedInvoiceIds);
            if (rows.length === 0) return false;
            const usageKeysByMode: Record<typeof mode, string[]> = {
                summary: ['summary', 'print.summary', 'print'],
                book: ['book', 'print.book', 'print'],
                invoice: ['invoice', 'print.invoice', 'print'],
                loading_sheet: ['loading_sheet', 'loading-sheet', 'print.loading_sheet', 'print.loading-sheet', 'print']
            };
            const titleByMode: Record<typeof mode, string> = {
                summary: 'Invoice Register Summary',
                book: 'Invoice Register Book',
                invoice: 'Invoice Register',
                loading_sheet: 'Invoice Loading Sheet'
            };
            const templateRows =
                mode === 'loading_sheet'
                    ? await buildLoadingSheetRowsFromSaleInvoiceIds(rows.map((row) => Number(row.saleInvoiceId ?? 0)))
                    : mode === 'invoice'
                      ? await buildInvoiceLedgerRowsFromSaleInvoices(rows)
                    : (rows.map((row) => ({
                          ...row,
                          grossAmount: Number(row.totalGrossAmount ?? 0),
                          totalTaxAmount: Number(row.totalTaxAmount ?? 0),
                          roundOffAmount: Number(row.roundOffAmount ?? 0),
                          totalNetAmount: Number(row.totalNetAmount ?? 0),
                          isCancelledFlag: row.isCancelled ? 1 : 0
                      })) as Array<Record<string, unknown>>);
            if (!templateRows.length) return false;
            return await printRowsWithReportTemplate({
                apolloClient,
                moduleKey: 'invoice',
                usageKeys: usageKeysByMode[mode],
                rows: templateRows,
                title: titleByMode[mode],
                subtitle: `${templateRows.length} row${templateRows.length === 1 ? '' : 's'}`
            });
        },
        [apolloClient, resolveRegisterPrintRows]
    );

    const requestRegisterPrint = React.useCallback((selectedInvoiceIds: number[]) => {
        if (typeof window === 'undefined') return;
        if (selectedInvoiceIds.length === 0) {
            setRegisterPrintSelectionInvoiceIds(null);
            window.print();
            return;
        }
        setRegisterPrintSelectionInvoiceIds(selectedInvoiceIds);
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                window.print();
            });
        });
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleAfterPrint = () => {
            setRegisterPrintSelectionInvoiceIds(null);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    const handleRegisterPrint = React.useCallback(
        (mode: 'summary' | 'book' | 'invoice' | 'loading_sheet') => {
            const modeLabel =
                mode === 'summary'
                    ? 'summary'
                    : mode === 'book'
                      ? 'book'
                      : mode === 'invoice'
                        ? 'invoice'
                        : 'loading sheet';
            const selectedCount = selectedRegisterInvoiceIds.length;
            setFooterUtilityNotice(
                selectedCount > 0
                    ? `Print ${modeLabel} (${selectedCount} selected)`
                    : `Print ${modeLabel} (all visible)`
            );
            const selectedIds = [...selectedRegisterInvoiceIds];
            void (async () => {
                const handledByTemplate = await tryTemplateRegisterPrint(mode, selectedIds);
                if (handledByTemplate) return;
                requestRegisterPrint(selectedIds);
            })();
        },
        [requestRegisterPrint, selectedRegisterInvoiceIds, tryTemplateRegisterPrint]
    );

    const registerPrintMenuItems = React.useMemo<MenuItem[]>(
        () => [
            {
                label: 'Summary',
                icon: 'pi pi-file',
                command: () => handleRegisterPrint('summary')
            },
            {
                label: 'Book',
                icon: 'pi pi-book',
                command: () => handleRegisterPrint('book')
            },
            {
                label: 'Invoice',
                icon: 'pi pi-file-pdf',
                command: () => handleRegisterPrint('invoice')
            },
            {
                label: 'Loading Sheet',
                icon: 'pi pi-print',
                command: () => handleRegisterPrint('loading_sheet')
            }
        ],
        [handleRegisterPrint]
    );

    const handlePrintEntry = React.useCallback(() => {
        if (typeof window === 'undefined') return;
        const invoiceNo = header.voucherNumber?.trim() || 'draft';
        setFooterUtilityNotice(`Print invoice ${invoiceNo}`);
        window.print();
    }, [header.voucherNumber]);

    const handleRowInvoicePrint = React.useCallback((row: SaleInvoiceListItem) => {
        const saleInvoiceId = Number(row.saleInvoiceId);
        const invoiceNo = row.voucherNumber?.trim() || String(row.saleInvoiceId || '-');
        setFooterUtilityNotice(`Print invoice ${invoiceNo}`);
        const selectedIds = Number.isFinite(saleInvoiceId) && saleInvoiceId > 0 ? [saleInvoiceId] : [];
        void (async () => {
            const handledByTemplate = await tryTemplateRegisterPrint('invoice', selectedIds);
            if (handledByTemplate) return;
            requestRegisterPrint(selectedIds);
        })();
    }, [requestRegisterPrint, tryTemplateRegisterPrint]);

    const currentEntryDryCheckDigest = React.useMemo(() => {
        if (!isEntryView) return null;
        const normalizedHeader = {
            voucherDateKey: toDateDayKey(header.voucherDate),
            voucherNumberPrefix: header.voucherNumberPrefix?.trim() ?? '',
            voucherNumber: header.voucherNumber?.trim() ?? '',
            billNumber: header.billNumber?.trim() ?? '',
            estimateId: toPositiveId(header.estimateId),
            partyLedgerId: toPositiveId(header.partyLedgerId),
            ledgerGroupId: toPositiveId(header.ledgerGroupId),
            salesmanId: toPositiveId(header.salesmanId),
            salesman2Id: toPositiveId(header.salesman2Id),
            partyName: header.partyName?.trim() ?? '',
            partyGstin: header.partyGstin?.trim() ?? '',
            partyAddress: header.partyAddress?.trim() ?? '',
            placeOfSupply: header.placeOfSupply,
            hasScheme: Boolean(header.hasScheme),
            remarks: header.remarks?.trim() ?? '',
            bizomInvoiceNumber: header.bizomInvoiceNumber?.trim() ?? ''
        };
        const normalizedLines = computation.lines.map((line) => ({
            key: line.key,
            lineNumber: Number(line.lineNumber ?? 0),
            itemId: toPositiveId(line.itemId),
            itemName: line.itemName?.trim() ?? '',
            itemCode: line.itemCode?.trim() ?? '',
            itemFreeId: toPositiveId(line.itemFreeId),
            unitId: toPositiveId(line.unitId),
            unitFreeId: toPositiveId(line.unitFreeId),
            tmpTypeId: toPositiveId(line.tmpTypeId),
            estimateLineId: toPositiveId(line.estimateLineId),
            quantity: Number(line.quantity ?? 0),
            freeQuantity: Number(line.freeQuantity ?? 0),
            mrp: Number(line.mrp ?? 0),
            sellingRate: Number(line.sellingRate ?? 0),
            rate: Number(line.rate ?? 0),
            displayAmount: Number(line.displayAmount ?? 0),
            hasScheme: Boolean(line.hasScheme),
            qpsDiscountMode: line.qpsDiscountMode,
            qpsRate: Number(line.qpsRate ?? 0),
            qpsAmount: Number(line.qpsAmount ?? 0),
            productDiscountMode: line.productDiscountMode,
            productDiscountRate: Number(line.productDiscountRate ?? 0),
            productDiscountAmount: Number(line.productDiscountAmount ?? 0),
            cashDiscountMode: line.cashDiscountMode,
            cashDiscountRate: Number(line.cashDiscountRate ?? 0),
            cashDiscountAmount: Number(line.cashDiscountAmount ?? 0),
            taxLedgerId: toPositiveId(line.taxLedgerId),
            taxLedger2Id: toPositiveId(line.taxLedger2Id),
            taxLedger3Id: toPositiveId(line.taxLedger3Id),
            quantityRateAmount: Number(line.quantityRateAmount ?? 0),
            taxableAmount: Number(line.taxableAmount ?? 0),
            taxRate: Number(line.taxRate ?? 0),
            taxAmount: Number(line.taxAmount ?? 0),
            taxableAmount2: Number(line.taxableAmount2 ?? 0),
            taxRate2: Number(line.taxRate2 ?? 0),
            taxAmount2: Number(line.taxAmount2 ?? 0),
            totalTaxAmount: Number(line.totalTaxAmount ?? 0),
            finalAmount: Number(line.finalAmount ?? 0),
            remarks: line.remarks?.trim() ?? '',
            inventory: {
                warehouseId: toPositiveId(line.inventory?.warehouseId),
                batchNo: line.inventory?.batchNo?.trim() ?? '',
                expiryDateKey: toDateDayKey(line.inventory?.expiryDate ?? null),
                serials: (line.inventory?.serials ?? []).map((serial) => (serial ?? '').trim()).filter(Boolean)
            }
        }));
        const normalizedAdditionalTaxations = additionalTaxations.map((taxation) => ({
            key: taxation.key,
            ledgerId: toPositiveId(taxation.ledgerId),
            addAmount: Number(taxation.addAmount ?? 0),
            taxableAmount: Number(taxation.taxableAmount ?? 0)
        }));
        const normalizedTypeDetails = typeDetails.map((detail) => ({
            key: detail.key,
            itemId: toPositiveId(detail.itemId),
            typeDetailId: toPositiveId(detail.typeDetailId),
            quantity: Number(detail.quantity ?? 0),
            tmpTypeId: toPositiveId(detail.tmpTypeId)
        }));
        const normalizedTaxSummaryRows = taxSummaryRows.map((row) => ({
            ledgerId: toPositiveId(row.ledgerId),
            taxableAmount: Number(row.taxableAmount ?? 0),
            addAmount: Number(row.addAmount ?? 0),
            lessAmount: Number(row.lessAmount ?? 0)
        }));
        const normalizedTransport = {
            isApplied: Boolean(transportDraft.isApplied),
            transporterId: toPositiveId(transportDraft.transporterId),
            freightLedgerId: toPositiveId(transportDraft.freightLedgerId),
            freightAmount: Number(transportDraft.freightAmount ?? 0),
            freightTaxLedgerId: toPositiveId(transportDraft.freightTaxLedgerId),
            freightTaxRate: Number(transportFreightTaxRate ?? 0),
            freightTaxAmount: Number(transportFreightTaxAmount ?? 0),
            freightTotalAmount: Number(transportFreightTotalAmount ?? 0)
        };
        const normalizedPreservedDetails = {
            otherLedgerId: toPositiveId(preservedDetails.otherLedgerId),
            itemBrandId: toPositiveId(preservedDetails.itemBrandId),
            isChecked: Boolean(preservedDetails.isChecked),
            g1BillNumber: preservedDetails.g1BillNumber?.trim() ?? '',
            g1IsSchemeMatched: Boolean(preservedDetails.g1IsSchemeMatched),
            g1IsAmountMatched: Boolean(preservedDetails.g1IsAmountMatched),
            g1Remark: preservedDetails.g1Remark?.trim() ?? '',
            creditNotes: (preservedDetails.creditNotes ?? []).map((entry) => ({
                voucherId: toPositiveId(entry?.voucherId ?? null),
                saleReturnId: toPositiveId(entry?.saleReturnId ?? null),
            })),
            debitNotes: (preservedDetails.debitNotes ?? []).map((entry) => ({
                voucherId: toPositiveId(entry?.voucherId ?? null)
            }))
        };
        return JSON.stringify({
            header: normalizedHeader,
            lines: normalizedLines,
            totals: computation.totals,
            taxSummaryRows: normalizedTaxSummaryRows,
            additionalTaxations: normalizedAdditionalTaxations,
            typeDetails: normalizedTypeDetails,
            transport: normalizedTransport,
            preservedDetails: normalizedPreservedDetails
        });
    }, [
        additionalTaxations,
        computation.lines,
        computation.totals,
        header.billNumber,
        header.bizomInvoiceNumber,
        header.estimateId,
        header.hasScheme,
        header.ledgerGroupId,
        header.partyAddress,
        header.partyGstin,
        header.partyLedgerId,
        header.salesman2Id,
        header.salesmanId,
        header.partyName,
        header.placeOfSupply,
        header.remarks,
        preservedDetails.creditNotes,
        preservedDetails.debitNotes,
        preservedDetails.g1BillNumber,
        preservedDetails.g1IsAmountMatched,
        preservedDetails.g1IsSchemeMatched,
        preservedDetails.g1Remark,
        preservedDetails.isChecked,
        preservedDetails.itemBrandId,
        preservedDetails.otherLedgerId,
        header.voucherDate,
        header.voucherNumber,
        header.voucherNumberPrefix,
        isEntryView,
        taxSummaryRows,
        transportDraft.freightAmount,
        transportDraft.freightLedgerId,
        transportDraft.freightTaxLedgerId,
        transportDraft.isApplied,
        transportDraft.transporterId,
        transportFreightTaxAmount,
        transportFreightTaxRate,
        transportFreightTotalAmount,
        typeDetails
    ]);
    const isDryCheckReady = React.useMemo(() => {
        if (!isEntryView) return true;
        if (!dryCheckRequired) return true;
        if (!hasUnsavedEntryChanges) return true;
        if (!currentEntryDryCheckDigest) return false;
        return dryCheckDigest === currentEntryDryCheckDigest;
    }, [currentEntryDryCheckDigest, dryCheckDigest, dryCheckRequired, hasUnsavedEntryChanges, isEntryView]);

    const handleDryCheckEntry = React.useCallback(() => {
        if (!dryCheckRequired) {
            setDryCheckDigest(currentEntryDryCheckDigest);
            setFooterUtilityNotice('Dry check is optional for this invoice profile.');
            return;
        }
        const headerIssueCount = headerErrors.length;
        const lineKeysWithIssues = Object.keys(lineErrorsByKey).filter((key) => (lineErrorsByKey[key]?.length ?? 0) > 0);
        const lineIssueCount = lineKeysWithIssues.reduce((total, key) => total + (lineErrorsByKey[key]?.length ?? 0), 0);
        if (headerIssueCount === 0 && lineIssueCount === 0) {
            setDryCheckDigest(currentEntryDryCheckDigest);
            setFooterUtilityNotice(`Dry check passed • Lines: ${computation.lines.length} • Net: ${formatAmount(computation.totals.totalNetAmount)}`);
            return;
        }
        setDryCheckDigest(null);
        const issueParts: string[] = [];
        if (headerIssueCount > 0) issueParts.push(`Header issues: ${headerIssueCount}`);
        if (lineIssueCount > 0) issueParts.push(`Line issues: ${lineIssueCount} in ${lineKeysWithIssues.length} row(s)`);
        setFooterUtilityNotice(`Dry check failed • ${issueParts.join(' • ')}`);
    }, [
        computation.lines.length,
        computation.totals.totalNetAmount,
        currentEntryDryCheckDigest,
        dryCheckRequired,
        headerErrors.length,
        lineErrorsByKey
    ]);

    const requestSaveWithDryCheck = React.useCallback(() => {
        if (!dryCheckRequired) {
            onRequestSave();
            return;
        }
        if (!isDryCheckReady) {
            setFooterUtilityNotice('Run Dry Check first, then Save/Update.');
            return;
        }
        onRequestSave();
    }, [dryCheckRequired, isDryCheckReady, onRequestSave]);

    const requestSaveAndAddNewWithDryCheck = React.useCallback(() => {
        if (!dryCheckRequired) {
            onRequestSaveAndAddNew();
            return;
        }
        if (!isDryCheckReady) {
            setFooterUtilityNotice('Run Dry Check first, then Save/Update.');
            return;
        }
        onRequestSaveAndAddNew();
    }, [dryCheckRequired, isDryCheckReady, onRequestSaveAndAddNew]);

    const handleRegisterShortcutKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            const key = event.key.toLowerCase();
            if (key === 'f11') {
                event.preventDefault();
                event.stopPropagation();
                if (typeof document === 'undefined') return;
                const input =
                    (document.getElementById('invoice-register-search-input') as HTMLInputElement | null) ??
                    (document.querySelector('.invoice-register-report-search .app-register-search__input') as HTMLInputElement | null);
                input?.focus();
                input?.select();
                return;
            }

            const isSpaceKey = event.code === 'Space' || key === ' ';
            if (key !== 'arrowdown' && key !== 'arrowup' && !isSpaceKey) return;
            if (isInteractiveShortcutTarget(event.target)) return;
            if (filteredSaleInvoices.length === 0) return;

            event.preventDefault();
            event.stopPropagation();
            if (key === 'arrowdown') {
                moveRegisterKeyboardFocus(1);
                return;
            }
            if (key === 'arrowup') {
                moveRegisterKeyboardFocus(-1);
                return;
            }
            toggleRegisterKeyboardFocusedSelection();
        },
        [filteredSaleInvoices.length, moveRegisterKeyboardFocus, toggleRegisterKeyboardFocusedSelection]
    );

    const handleEntryShortcutKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            if (!isEntryView || saving || loadingInvoice) return;
            const key = event.key.toLowerCase();
            const hasSaveModifier = event.ctrlKey || event.metaKey;

            if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                if (key === 'f2') {
                    event.preventDefault();
                    event.stopPropagation();
                    requestSaveWithDryCheck();
                    return;
                }
                if (key === 'f4') {
                    event.preventDefault();
                    event.stopPropagation();
                    onAddLine();
                    return;
                }
                if (key === 'f6') {
                    event.preventDefault();
                    event.stopPropagation();
                    setTypeDetailsDialogVisible(true);
                    return;
                }
                if (key === 'f7') {
                    event.preventDefault();
                    event.stopPropagation();
                    setAdditionalTaxationDialogVisible(true);
                    return;
                }
            }

            if (!hasSaveModifier && !event.altKey && !event.shiftKey && (key === 'escape' || key === 'esc')) {
                event.preventDefault();
                event.stopPropagation();
                onCancelEntry();
                return;
            }

            if (hasSaveModifier && !event.altKey && event.shiftKey && key === 's') {
                event.preventDefault();
                event.stopPropagation();
                handleDryCheckEntry();
                return;
            }

            if (!hasSaveModifier || event.altKey || event.shiftKey) return;
            if (key === 's') {
                event.preventDefault();
                event.stopPropagation();
                requestSaveWithDryCheck();
                return;
            }

            if (key === 'enter' && !isEditView) {
                event.preventDefault();
                event.stopPropagation();
                requestSaveAndAddNewWithDryCheck();
            }
        },
        [
            isEditView,
            isEntryView,
            handleDryCheckEntry,
            loadingInvoice,
            onAddLine,
            onCancelEntry,
            requestSaveAndAddNewWithDryCheck,
            requestSaveWithDryCheck,
            saving
        ]
    );

    const showLegacyLinkedIndicator = isEditView && hasPreservedDetails;
    const entryJumpFromDateKey = toDateDayKey(entryJumpFromDate);
    const entryJumpToDateKey = toDateDayKey(entryJumpToDate);
    const defaultEntryJumpFromDateKey = toDateDayKey(defaultRegisterDateRange.fromDate);
    const defaultEntryJumpToDateKey = toDateDayKey(defaultRegisterDateRange.toDate);
    const entryJumpRangeAtDefault =
        entryJumpFromDateKey === defaultEntryJumpFromDateKey && entryJumpToDateKey === defaultEntryJumpToDateKey;
    const entryJumpRangeInvalid =
        entryJumpFromDateKey != null && entryJumpToDateKey != null && entryJumpFromDateKey > entryJumpToDateKey;
    const quickJumpSourceRows = React.useMemo(() => {
        if (entryJumpRangeInvalid) return [];
        return saleInvoices.filter((row) => {
            const voucherDate = parseVoucherDateText(row.voucherDateText);
            const voucherDateKey = toDateDayKey(voucherDate);
            if (entryJumpFromDateKey != null && (voucherDateKey == null || voucherDateKey < entryJumpFromDateKey)) return false;
            if (entryJumpToDateKey != null && (voucherDateKey == null || voucherDateKey > entryJumpToDateKey)) return false;
            return true;
        });
    }, [entryJumpFromDateKey, entryJumpRangeInvalid, entryJumpToDateKey, saleInvoices]);
    const quickJumpInvoiceOptions = React.useMemo<Option[]>(() => {
        const seen = new Set<number>();
        const options: Option[] = [];
        quickJumpSourceRows.forEach((row) => {
            const saleInvoiceId = Number(row.saleInvoiceId);
            if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0 || seen.has(saleInvoiceId)) return;
            seen.add(saleInvoiceId);
            const voucherNumber = row.voucherNumber?.trim() || '';
            const voucherDate = formatVoucherDate(row.voucherDateText);
            const ledgerName = normalizeDisplayText(row.ledgerName)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.name : '');
            const ledgerAddress = normalizeDisplayText(row.ledgerAddress)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.address : '');
            const labelParts = [`#${saleInvoiceId}`];
            if (voucherNumber) labelParts.push(voucherNumber);
            if (voucherDate && voucherDate !== '-') labelParts.push(voucherDate);
            if (ledgerName) labelParts.push(ledgerName);
            if (ledgerAddress) labelParts.push(ledgerAddress);
            options.push({
                label: labelParts.join(' • '),
                value: saleInvoiceId,
                searchText: `${saleInvoiceId} ${voucherNumber} ${voucherDate} ${ledgerName} ${ledgerAddress}`.toLowerCase()
            });
        });
        return options.sort((a, b) => a.value - b.value);
    }, [ledgerById, quickJumpSourceRows]);
    const quickJumpInvoiceId = isEditView ? editingSaleInvoiceId : null;
    const resolvedHeaderGstin = ((header.partyGstin ?? '').trim()
        || (header.partyLedgerId != null ? (ledgerById.get(header.partyLedgerId)?.gstNumber ?? '').trim() : ''));
    const entryCustomerTypeKey = resolveRegisterCustomerTypeKey(resolvedHeaderGstin.length > 0);
    const entryCustomerTypeLabel = resolveRegisterCustomerTypeLabel(entryCustomerTypeKey);
    const entryCustomerTypeCode = entryCustomerTypeKey === 'b2b' ? 'B2B' : 'B2C';
    const entrySupplyShortLabel = header.placeOfSupply === 'other_state' ? 'Inter-State' : 'Intra-State';
    const trimmedVoucherNo = header.voucherNumber.trim();
    const entryFormTitle = isEditView
        ? (trimmedVoucherNo
            ? `Edit Invoice #${trimmedVoucherNo}`
            : editingSaleInvoiceId != null
              ? `Edit Invoice #${editingSaleInvoiceId}`
              : 'Edit Invoice')
        : 'New Invoice';
    const legacyLinkedIndicatorTitle = [
        linkedCreditNoteCount > 0 ? `Credit Notes: ${linkedCreditNoteCount}` : null,
        linkedDebitNoteCount > 0 ? `Debit Notes: ${linkedDebitNoteCount}` : null,
        'Legacy linked fields are preserved during update'
    ]
        .filter(Boolean)
        .join(' • ');
    const clearEntryJumpRange = React.useCallback(() => {
        setEntryJumpFromDate(cloneDate(defaultRegisterDateRange.fromDate));
        setEntryJumpToDate(cloneDate(defaultRegisterDateRange.toDate));
    }, [defaultRegisterDateRange.fromDate, defaultRegisterDateRange.toDate]);
    const handleQuickJumpInvoice = React.useCallback(
        (nextValue: number | null | undefined) => {
            const nextInvoiceId = nextValue != null ? Number(nextValue) : null;
            if (nextInvoiceId == null || !Number.isFinite(nextInvoiceId) || nextInvoiceId <= 0) return;
            onOpenEdit(nextInvoiceId);
        },
        [onOpenEdit]
    );

    const requestCancelInvoice = React.useCallback(
        (saleInvoiceId: number) => {
            confirmDialog({
                header: 'Cancel Invoice?',
                message: `Cancel invoice #${saleInvoiceId}? This action keeps the record and marks it cancelled.`,
                icon: 'pi pi-exclamation-triangle',
                rejectLabel: 'No',
                acceptLabel: 'Cancel Invoice',
                acceptClassName: 'p-button-danger',
                accept: () => {
                    void onDeleteInvoice(saleInvoiceId);
                },
                reject: () => undefined
            });
        },
        [onDeleteInvoice]
    );

    const isRegisterTotalsRow = React.useCallback(
        (row: SaleInvoiceListItem) => Number(row.saleInvoiceId) === REGISTER_TOTALS_ROW_ID,
        []
    );

    const formatRegisterReferenceDates = React.useCallback((value: string | null | undefined) => {
        const raw = normalizeDisplayText(value);
        if (!raw) return '';
        const parts = raw
            .split(',')
            .map((entry) => formatVoucherDate(entry.trim()))
            .filter((entry) => entry && entry !== '-');
        return parts.join(', ');
    }, []);
    const splitRegisterReferenceValues = React.useCallback((value: string | null | undefined) => {
        const raw = normalizeDisplayText(value);
        if (!raw) return [] as string[];
        return raw
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    }, []);
    const resolveRegisterReceiptReferenceText = React.useCallback(
        (kind: 'Cash' | 'Bank', numbers: string | null | undefined, dates: string | null | undefined) => {
            const resolvedNumbers = normalizeDisplayText(numbers);
            const resolvedDates = formatRegisterReferenceDates(dates);
            if (!resolvedNumbers && !resolvedDates) return '';
            const parts = [kind];
            if (resolvedNumbers) parts.push(`# ${resolvedNumbers}`);
            if (resolvedDates) parts.push(`Dt ${resolvedDates}`);
            return parts.join(' ');
        },
        [formatRegisterReferenceDates]
    );
    const resolveRegisterReceiptVoucherEntries = React.useCallback(
        (
            kindCode: 'C' | 'B',
            detailText: string | null | undefined,
            numbers: string | null | undefined,
            dates: string | null | undefined,
            fallbackAmount: number
        ) => {
            const normalizedDetail = normalizeDisplayText(detailText);
            if (normalizedDetail) {
                const parsedDetailEntries: RegisterReceiptVoucherEntry[] = normalizedDetail
                    .split('|||')
                    .map((entry, index) => {
                        const [rawVoucherNumber = '', rawVoucherDate = '', rawAmount = ''] = entry.split('~~');
                        const voucherNumber = normalizeDisplayText(rawVoucherNumber);
                        const voucherDateRaw = normalizeDisplayText(rawVoucherDate);
                        const resolvedVoucherDate = voucherDateRaw ? formatVoucherDate(voucherDateRaw) : '';
                        const voucherDate =
                            resolvedVoucherDate && resolvedVoucherDate !== '-' ? resolvedVoucherDate : '';
                        const amountRaw = normalizeDisplayText(rawAmount);
                        const parsedAmount = Number(amountRaw);
                        const amount = Number.isFinite(parsedAmount) ? parsedAmount : null;
                        if (!voucherNumber && !voucherDate && amount == null) return null;
                        return {
                            key: `${kindCode}-detail-${index}-${voucherNumber || voucherDate || 'entry'}`,
                            kindCode,
                            voucherNumber,
                            voucherDate,
                            amount
                        };
                    })
                    .filter((entry): entry is RegisterReceiptVoucherEntry => entry != null);
                if (parsedDetailEntries.length > 0) return parsedDetailEntries;
            }

            const numberParts = splitRegisterReferenceValues(numbers).map((entry) => normalizeDisplayText(entry));
            const dateParts = splitRegisterReferenceValues(dates)
                .map((entry) => formatVoucherDate(entry))
                .map((entry) => (entry && entry !== '-' ? entry : ''));
            const maxLength = Math.max(numberParts.length, dateParts.length);
            if (maxLength === 0) return [] as RegisterReceiptVoucherEntry[];
            const fallbackEntries: RegisterReceiptVoucherEntry[] = [];
            for (let index = 0; index < maxLength; index += 1) {
                const voucherNumber = numberParts[index] ?? '';
                const voucherDate = dateParts[index] ?? '';
                if (!voucherNumber && !voucherDate) continue;
                const amount = maxLength === 1 && fallbackAmount > FINANCIAL_EPSILON ? fallbackAmount : null;
                fallbackEntries.push({
                    key: `${kindCode}-fallback-${index}-${voucherNumber || voucherDate || 'entry'}`,
                    kindCode,
                    voucherNumber,
                    voucherDate,
                    amount
                });
            }
            return fallbackEntries;
        },
        [splitRegisterReferenceValues]
    );

    const resolveRegisterRowClassName = React.useCallback((row: SaleInvoiceListItem) => {
        if (isRegisterTotalsRow(row)) return 'invoice-register-row--totals';
        const classNames: string[] = [];
        const dueAmount = Number(row.dueAmount || 0);
        const saleInvoiceId = Number(row.saleInvoiceId);
        if (row.isCancelled) classNames.push('invoice-register-row--cancelled');
        else if (dueAmount > 0) classNames.push('invoice-register-row--due');
        if (
            Number.isFinite(saleInvoiceId)
            && registerKeyboardFocusInvoiceId != null
            && saleInvoiceId === registerKeyboardFocusInvoiceId
        ) {
            classNames.push('invoice-register-row--keyboard-focus');
        }
        if (Number.isFinite(saleInvoiceId) && selectedRegisterInvoiceIdSet.has(saleInvoiceId)) {
            classNames.push('invoice-register-row--selected');
        }
        if (
            registerPrintSelectionIdSet.size > 0 &&
            (!Number.isFinite(saleInvoiceId) || !registerPrintSelectionIdSet.has(saleInvoiceId))
        ) {
            classNames.push('invoice-register-row--print-hidden');
        }
        return classNames.join(' ');
    }, [isRegisterTotalsRow, registerKeyboardFocusInvoiceId, registerPrintSelectionIdSet, selectedRegisterInvoiceIdSet]);

    const renderRegisterStackedValue = React.useCallback(
        (top: React.ReactNode, bottom?: React.ReactNode, topClassName?: string) => (
            <div className="invoice-register-stack-lines">
                <span className={`invoice-register-stack-lines__top${topClassName ? ` ${topClassName}` : ''}`}>{top}</span>
                {bottom ? <span className="invoice-register-stack-lines__bottom">{bottom}</span> : null}
            </div>
        ),
        []
    );
    const renderStackedHeader = React.useCallback(
        (top: string, bottom: string, topIcon: string, bottomIcon: string) => (
            <div className="flex flex-column">
                {renderLabelWithIcon(topIcon, top)}
                {renderLabelWithIcon(bottomIcon, bottom, 'text-600 text-sm')}
            </div>
        ),
        []
    );

    const registerCustomerTypeCounts = React.useMemo(() => {
        let b2b = 0;
        let b2c = 0;
        filteredSaleInvoices.forEach((row) => {
            const resolvedPartyGstin = normalizeDisplayText(row.ledgerGstin) || normalizeDisplayText(
                row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.gstNumber : ''
            );
            const customerTypeKey = resolveRegisterCustomerTypeForRow(row, resolvedPartyGstin);
            if (customerTypeKey === 'b2b') b2b += 1;
            else b2c += 1;
        });
        return { b2b, b2c };
    }, [filteredSaleInvoices, ledgerById]);

    const renderRegisterDocumentCell = React.useCallback(
        (row: SaleInvoiceListItem) => {
            if (isRegisterTotalsRow(row)) {
                return (
                    <div className="invoice-register-cell-stack">
                        <div className="invoice-register-cell-title invoice-register-cell-title--accent">
                            TOTAL (Filtered)
                        </div>
                        <small className="invoice-register-cell-muted">Rows: {filteredSaleInvoices.length}</small>
                        <small className="invoice-register-cell-muted">
                            B2B: {registerCustomerTypeCounts.b2b} | B2C: {registerCustomerTypeCounts.b2c}
                        </small>
                    </div>
                );
            }
            const estimateNo =
                normalizeDisplayText(row.estimateRefText)
                || (row.estimateId != null && Number(row.estimateId) > 0 ? String(row.estimateId) : '-');
            const linkedCreditNoteRef = normalizeDisplayText(row.linkedCreditNoteRefText)
                || String(Number(row.linkedCreditNoteCount || 0));
            const linkedDebitNoteRef = normalizeDisplayText(row.linkedDebitNoteRefText)
                || String(Number(row.linkedDebitNoteCount || 0));
            const resolvedPartyGstin = normalizeDisplayText(row.ledgerGstin) || normalizeDisplayText(
                row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.gstNumber : ''
            );
            const customerTypeKey = resolveRegisterCustomerTypeForRow(row, resolvedPartyGstin);
            const customerTypeText = resolveRegisterCustomerTypeLabel(customerTypeKey);
            const customerTypeCode = customerTypeKey === 'b2b' ? 'B2B' : 'B2C';
            const customerTypeClassName = customerTypeKey === 'b2b'
                ? 'invoice-register-type-chip invoice-register-type-chip--b2b invoice-register-type-chip--inline'
                : 'invoice-register-type-chip invoice-register-type-chip--b2c invoice-register-type-chip--inline';
            const placeOfSupplyText = row.isOtherState ? '(Inter-State)' : '';
            const meta = `E:${estimateNo} | CN:${linkedCreditNoteRef} | DN:${linkedDebitNoteRef}`;
            return (
                <div className="invoice-register-cell-stack">
                    <div className="invoice-register-cell-title invoice-register-cell-title--accent invoice-register-cell-title--with-chip">
                        <span>{row.voucherNumber || '-'}</span>
                        <span className="invoice-register-chip-row">
                            <span className={customerTypeClassName} title={customerTypeText}>
                                {customerTypeCode}
                            </span>
                            {placeOfSupplyText ? (
                                <small className="invoice-register-supply-chip" title={placeOfSupplyText}>
                                    {placeOfSupplyText}
                                </small>
                            ) : null}
                        </span>
                    </div>
                    <small className="invoice-register-cell-muted">{formatVoucherDate(row.voucherDateText)}</small>
                    <small className="invoice-register-cell-muted invoice-register-cell-muted--ellipsis" title={meta}>
                        {meta}
                    </small>
                </div>
            );
        },
        [filteredSaleInvoices.length, isRegisterTotalsRow, ledgerById, registerCustomerTypeCounts.b2b, registerCustomerTypeCounts.b2c]
    );

    const renderRegisterPartyCell = React.useCallback(
        (row: SaleInvoiceListItem) => {
            if (isRegisterTotalsRow(row)) {
                return (
                    <div className="invoice-register-cell-stack">
                        <div className="invoice-register-cell-title">All filtered invoices</div>
                        <small className="invoice-register-cell-muted">Summary row pinned at top</small>
                    </div>
                );
            }
            const ledgerName = normalizeDisplayText(row.ledgerName)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.name : '');
            const ledgerGroupName = normalizeDisplayText(row.ledgerGroupName);
            const ledgerAddress = normalizeDisplayText(row.ledgerAddress)
                || normalizeDisplayText(row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.address : '');
            const remarks = normalizeDisplayText(row.remarks);
            const resolvedPartyGstin = normalizeDisplayText(row.ledgerGstin) || normalizeDisplayText(
                row.ledgerId != null ? ledgerById.get(Number(row.ledgerId))?.gstNumber : ''
            );
            const groupAddressText = [ledgerGroupName, ledgerAddress].filter(Boolean).join(' | ') || '-';
            return (
                <div className="invoice-register-cell-stack">
                    <div
                        className="invoice-register-cell-title invoice-register-cell-title--accent"
                        title={ledgerName || undefined}
                    >
                        {ledgerName || '-'}
                    </div>
                    <small className="invoice-register-cell-muted invoice-register-cell-muted--ellipsis" title={groupAddressText}>
                        {groupAddressText}
                    </small>
                    {remarks ? (
                        <small className="invoice-register-cell-muted invoice-register-cell-muted--ellipsis" title={remarks}>
                            {remarks}
                        </small>
                    ) : null}
                    {resolvedPartyGstin ? (
                        <small
                            className="invoice-register-cell-muted invoice-register-cell-muted--gstin invoice-register-cell-muted--ellipsis"
                            title={resolvedPartyGstin}
                        >
                            {resolvedPartyGstin}
                        </small>
                    ) : null}
                </div>
            );
        },
        [isRegisterTotalsRow, ledgerById]
    );
    const renderRegisterDiscountCell = React.useCallback(
        (row: SaleInvoiceListItem) => {
            const lines = [
                formatAmount(toAmountNumber(row.totalQpsDiscountAmount)),
                formatAmount(toAmountNumber(row.totalProductDiscountAmount)),
                formatAmount(toAmountNumber(row.totalCashDiscountAmount))
            ];
            return (
                <div className="invoice-register-multi-lines invoice-register-multi-lines--numeric invoice-register-multi-lines--discount">
                    {lines.map((value, index) => (
                        <span key={index} className="invoice-register-multi-lines__line">
                            {value}
                        </span>
                    ))}
                </div>
            );
        },
        []
    );

    const renderRegisterGrossTaxRoundCell = React.useCallback(
        (row: SaleInvoiceListItem) => {
            const grossTop = formatAmount(toAmountNumber(row.totalGrossAmount));
            const taxationAmount = formatAmount(toAmountNumber(row.totalTaxAmount));
            const roundOffAmount = formatAmount(toAmountNumber(row.roundOffAmount));
            return (
                <div className="invoice-register-stack-lines">
                    <span className="invoice-register-cell-title invoice-register-cell-title--accent">
                        {grossTop}
                    </span>
                    <span className="invoice-register-stack-lines__bottom invoice-register-stack-lines__bottom--stacked">
                        <span>{taxationAmount}</span>
                        <span>{roundOffAmount}</span>
                    </span>
                </div>
            );
        },
        []
    );

    const renderRegisterNetCell = React.useCallback(
        (row: SaleInvoiceListItem) => {
            const netTop = formatAmount(toAmountNumber(row.totalNetAmount));
            return renderRegisterStackedValue(netTop, undefined, 'invoice-register-stack-lines__top--accent');
        },
        [renderRegisterStackedValue]
    );
    const renderRegisterSettlementCell = React.useCallback(
        (row: SaleInvoiceListItem) => {
            const cashReceiptAmount = toAmountNumber(row.cashReceiptAmount);
            const bankReceiptAmount = toAmountNumber(row.bankReceiptAmount);
            const creditNoteAmount = toAmountNumber(row.creditNoteAmount);
            const voucherBillAmount = toAmountNumber(row.voucherBillAmount);
            const returnAmount = toAmountNumber(row.returnAmount);
            const loyaltyAppliedAmount = toAmountNumber(row.loyaltyAppliedAmount);
            const loyaltyPointsRedeemed = toAmountNumber(row.loyaltyPointsRedeemed);
            const giftCertificateAppliedAmount = toAmountNumber(row.giftCertificateAppliedAmount);
            const giftCertificateApplicationCount = Number(row.giftCertificateApplicationCount ?? 0);
            const paidAmount = toAmountNumber(row.paidAmount);
            const dueAmount = toAmountNumber(row.dueAmount);
            const cashReceiptVoucherEntries = resolveRegisterReceiptVoucherEntries(
                'C',
                row.cashReceiptDetailText,
                row.cashReceiptNumbers,
                row.cashReceiptDates,
                cashReceiptAmount
            );
            const bankReceiptVoucherEntries = resolveRegisterReceiptVoucherEntries(
                'B',
                row.bankReceiptDetailText,
                row.bankReceiptNumbers,
                row.bankReceiptDates,
                bankReceiptAmount
            );
            const settlementModeEntries = [
                { key: 'cash', code: 'C', amount: cashReceiptAmount, tone: 'cash' as const, title: undefined },
                { key: 'bank', code: 'B', amount: bankReceiptAmount, tone: 'bank' as const, title: undefined },
                { key: 'credit_note', code: 'CN', amount: creditNoteAmount, tone: 'cn' as const, title: undefined },
                { key: 'adjustment', code: 'ADJ', amount: voucherBillAmount, tone: 'adj' as const, title: undefined },
                {
                    key: 'loyalty',
                    code: 'LOY',
                    amount: loyaltyAppliedAmount,
                    tone: 'adj' as const,
                    title:
                        loyaltyPointsRedeemed > FINANCIAL_EPSILON
                            ? `LOY ${formatAmount(loyaltyAppliedAmount)} | ${formatAmount(loyaltyPointsRedeemed)} pts`
                            : undefined
                },
                {
                    key: 'gift_certificate',
                    code: 'GC',
                    amount: giftCertificateAppliedAmount,
                    tone: 'ret' as const,
                    title:
                        giftCertificateApplicationCount > 0
                            ? `GC ${formatAmount(giftCertificateAppliedAmount)} | ${giftCertificateApplicationCount} cert`
                            : undefined
                },
                { key: 'return', code: 'RET', amount: returnAmount, tone: 'ret' as const, title: undefined }
            ].filter((entry) => entry.amount > FINANCIAL_EPSILON);
            const settlementVoucherEntries = [...cashReceiptVoucherEntries, ...bankReceiptVoucherEntries];
            const saleInvoiceId = Number(row.saleInvoiceId);
            const canExpandSettlementDetails = Number.isFinite(saleInvoiceId) && saleInvoiceId > 0;
            const isSettlementExpanded = canExpandSettlementDetails
                ? registerSettlementExpandedByInvoiceId[saleInvoiceId] === true
                : false;
            const visibleModeLimit = 3;
            const visibleVoucherLimit = 2;
            const hiddenModeCount = Math.max(0, settlementModeEntries.length - visibleModeLimit);
            const hiddenVoucherCount = Math.max(0, settlementVoucherEntries.length - visibleVoucherLimit);
            const hiddenSettlementCount = hiddenModeCount + hiddenVoucherCount;
            const shouldCollapseDetails = !isSettlementExpanded && hiddenSettlementCount > 0;
            const visibleSettlementModeEntries = shouldCollapseDetails
                ? settlementModeEntries.slice(0, visibleModeLimit)
                : settlementModeEntries;
            const visibleSettlementVoucherEntries = shouldCollapseDetails
                ? settlementVoucherEntries.slice(0, visibleVoucherLimit)
                : settlementVoucherEntries;
            const top = (
                <span className="invoice-register-settlement-paid-due">
                    <span className="invoice-register-settlement-paid-due__amount">
                        {formatAmount(paidAmount)}
                    </span>
                    <span className="invoice-register-settlement-paid-due__separator">|</span>
                    <span className="invoice-register-settlement-paid-due__amount">
                        {formatAmount(dueAmount)}
                    </span>
                </span>
            );
            const hasSettlementModeEntries = visibleSettlementModeEntries.length > 0;
            const hasSettlementVoucherEntries = visibleSettlementVoucherEntries.length > 0;
            const canToggleSettlementDetails = canExpandSettlementDetails && hiddenSettlementCount > 0;

            return (
                <div className="invoice-register-stack-lines">
                    <span
                        className={`invoice-register-stack-lines__top ${dueAmount > FINANCIAL_EPSILON ? 'invoice-register-stack-lines__top--danger' : 'invoice-register-stack-lines__top--positive'}`}
                    >
                        {top}
                    </span>
                    <span className="invoice-register-stack-lines__bottom invoice-register-stack-lines__bottom--stacked">
                        {hasSettlementModeEntries ? (
                            <span className="invoice-register-settlement-mode-list">
                                {visibleSettlementModeEntries.map((entry) => (
                                    <span
                                        key={entry.key}
                                        className={`invoice-register-settlement-mode-chip invoice-register-settlement-mode-chip--${entry.tone}`}
                                        title={entry.title ?? `${entry.code} ${formatAmount(entry.amount)}`}
                                    >
                                        <span className="invoice-register-settlement-mode-chip__code">{entry.code}</span>
                                        <span className="invoice-register-settlement-mode-chip__amount">
                                            {formatAmount(entry.amount)}
                                        </span>
                                    </span>
                                ))}
                            </span>
                        ) : (
                            <span>-</span>
                        )}
                        {hasSettlementVoucherEntries ? (
                            <span className="invoice-register-settlement-voucher-list">
                                {visibleSettlementVoucherEntries.map((entry) => (
                                    <span
                                        key={entry.key}
                                        className={`invoice-register-settlement-voucher-card invoice-register-settlement-voucher-card--${entry.kindCode === 'B' ? 'bank' : 'cash'}`}
                                        title={[
                                            `${entry.kindCode} Receipt`,
                                            entry.voucherNumber ? `No ${entry.voucherNumber}` : null,
                                            entry.voucherDate ? `Dt ${entry.voucherDate}` : null,
                                            entry.amount != null ? `Amt ${formatAmount(entry.amount)}` : null
                                        ]
                                            .filter(Boolean)
                                            .join(' • ')}
                                    >
                                        <span className="invoice-register-settlement-voucher-card__no">
                                            {entry.voucherNumber || `${entry.kindCode} Receipt`}
                                        </span>
                                        <span className="invoice-register-settlement-voucher-card__date">
                                            {entry.voucherDate || '-'}
                                        </span>
                                        <span className="invoice-register-settlement-voucher-card__amt">
                                            {entry.amount != null ? formatAmount(entry.amount) : '-'}
                                        </span>
                                    </span>
                                ))}
                            </span>
                        ) : null}
                        {canToggleSettlementDetails ? (
                            <button
                                type="button"
                                className="invoice-register-settlement-more"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setRegisterSettlementExpandedByInvoiceId((previous) => ({
                                        ...previous,
                                        [saleInvoiceId]: !isSettlementExpanded
                                    }));
                                }}
                                title={isSettlementExpanded ? 'Show less settlement details' : `Show ${hiddenSettlementCount} more settlement details`}
                            >
                                {isSettlementExpanded ? 'less' : `+${hiddenSettlementCount} more`}
                            </button>
                        ) : null}
                    </span>
                </div>
            );
        },
        [registerSettlementExpandedByInvoiceId, resolveRegisterReceiptVoucherEntries]
    );

    const renderRegisterItemSummaryExpansion = React.useCallback(
        (row: SaleInvoiceListItem, mode: 'inline' | 'dialog' | 'dock' = 'inline') => {
            const saleInvoiceId = Number(row.saleInvoiceId);
            const itemLines = Number.isFinite(saleInvoiceId) ? registerItemSummaryByInvoiceId[saleInvoiceId] : undefined;
            const itemLinesLoading = Number.isFinite(saleInvoiceId) ? registerItemSummaryLoadingByInvoiceId[saleInvoiceId] === true : false;
            const itemLinesError = Number.isFinite(saleInvoiceId)
                ? registerItemSummaryErrorByInvoiceId[saleInvoiceId] ?? null
                : null;
            const invoiceNo = row.voucherNumber || String(row.saleInvoiceId || '-');
            const isInlineMode = mode === 'inline';
            const isDockMode = mode === 'dock';
            const resolvedItemLines = Array.isArray(itemLines) ? itemLines : [];
            const hasResolvedItemLines = Array.isArray(itemLines);
            const shouldShowItemLoading = itemLinesLoading || (!hasResolvedItemLines && !isInlineMode);
            const shouldRenderItemTable = isDockMode || mode === 'dialog' || resolvedItemLines.length > 0;
            const noItemLinesMessage = isInlineMode ? 'No item lines.' : 'No item lines for this invoice.';
            const isOtherState = !!row.isOtherState;
            const dockColumnCount = 16;
            const lookupTaxLedgerName = (ledgerId: number | null | undefined) => {
                if (ledgerId == null || !Number.isFinite(Number(ledgerId)) || Number(ledgerId) <= 0) return null;
                const numericLedgerId = Number(ledgerId);
                return normalizeDisplayText(taxLedgerNameById.get(numericLedgerId))
                    || normalizeDisplayText(ledgerById.get(numericLedgerId)?.name)
                    || null;
            };
            const inferTaxLedgerName = (
                existingName: string | null,
                slot: 1 | 2 | 3,
                rate: number,
                peerName1: string | null,
                peerName2: string | null
            ) => {
                if (existingName) return existingName;
                const normalizedPeer1 = (peerName1 ?? '').toLowerCase();
                const normalizedPeer2 = (peerName2 ?? '').toLowerCase();
                const rateText = `${formatQuantity(rate)}%`;
                if (slot === 1) {
                    if (normalizedPeer1.includes('cgst')) return `SGST ${rateText}`;
                    if (normalizedPeer1.includes('sgst')) return `CGST ${rateText}`;
                }
                if (slot === 2) {
                    if (normalizedPeer1.includes('sgst')) return `CGST ${rateText}`;
                    if (normalizedPeer1.includes('cgst')) return `SGST ${rateText}`;
                }
                if (slot === 3) {
                    if (normalizedPeer1.includes('igst') || normalizedPeer2.includes('igst')) return `IGST ${rateText}`;
                }
                if (slot === 3) return `IGST ${rateText}`;
                return `Tax ${rateText}`;
            };
            const resolvePercentAmountPair = (rate: number, amount: number) => {
                const hasRate = Math.abs(rate) > FINANCIAL_EPSILON;
                const hasAmount = Math.abs(amount) > FINANCIAL_EPSILON;
                if (!hasRate && !hasAmount) return null;
                return {
                    rateText: hasRate ? `${formatQuantity(rate)}%` : '',
                    amountText: hasAmount ? formatAmount(amount) : ''
                };
            };
            const renderPercentAmountPair = (pair: { rateText: string; amountText: string } | null) => {
                if (!pair) return '';
                return (
                    <span className="invoice-register-percent-amount-pair">
                        <span className="invoice-register-percent-amount-pair__rate">{pair.rateText}</span>
                        <span className="invoice-register-percent-amount-pair__sep">|</span>
                        <span className="invoice-register-percent-amount-pair__amount">{pair.amountText}</span>
                    </span>
                );
            };
            const resolveTaxLedgerNameForLine = (line: RegisterInvoiceLineSummary, slot: 1 | 2 | 3) => {
                const rate = slot === 1 ? line.taxRate : slot === 2 ? line.taxRate2 : line.taxRate3;
                if (rate <= FINANCIAL_EPSILON) return '';
                const rawName1 = lookupTaxLedgerName(line.taxLedgerId);
                const rawName2 = lookupTaxLedgerName(line.taxLedger2Id);
                const rawName3 = lookupTaxLedgerName(line.taxLedger3Id);
                if (slot === 1) return inferTaxLedgerName(rawName1, 1, rate, rawName2, rawName3);
                if (slot === 2) return inferTaxLedgerName(rawName2, 2, rate, rawName1, rawName3);
                return inferTaxLedgerName(rawName3, 3, rate, rawName1, rawName2);
            };
            const dockTotals = resolvedItemLines.reduce(
                (totals, line) => {
                    const quantityXRate = toAmountNumber(line.quantity) * toAmountNumber(line.rate);
                    const combinedTaxAmount = toAmountNumber(line.taxAmount) + toAmountNumber(line.taxAmount2);
                    const taxAmount = isOtherState ? toAmountNumber(line.taxAmount3) : combinedTaxAmount;
                    totals.quantity += toAmountNumber(line.quantity);
                    totals.freeQuantity += toAmountNumber(line.freeQuantity);
                    totals.qtyXRate += quantityXRate;
                    totals.qpsAmount += toAmountNumber(line.qpsAmount);
                    totals.proAmount += toAmountNumber(line.productDiscountAmount);
                    totals.cashAmount += toAmountNumber(line.cashDiscountAmount);
                    totals.taxableAmount += toAmountNumber(line.taxableAmount);
                    totals.taxAmount += taxAmount;
                    totals.netAmount += toAmountNumber(line.taxableAmount) + taxAmount;
                    return totals;
                },
                {
                    quantity: 0,
                    freeQuantity: 0,
                    qtyXRate: 0,
                    qpsAmount: 0,
                    proAmount: 0,
                    cashAmount: 0,
                    taxableAmount: 0,
                    taxAmount: 0,
                    netAmount: 0
                }
            );

            return (
                <div className={`invoice-register-row-expansion ${isInlineMode ? 'invoice-register-row-expansion--inline' : isDockMode ? 'invoice-register-row-expansion--dock' : 'invoice-register-row-expansion--dialog'}`}>
                    {mode === 'dialog' ? (
                        <div className="invoice-register-row-expansion__head">
                            <span className="invoice-register-row-expansion__title">Items for Invoice {invoiceNo}</span>
                            {hasResolvedItemLines && resolvedItemLines.length > 0 ? (
                                <span className="invoice-register-row-expansion__count">
                                    {resolvedItemLines.length} item{resolvedItemLines.length === 1 ? '' : 's'}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                    {shouldShowItemLoading ? (
                        <div className="invoice-register-row-expansion__skeleton">
                            <div className="invoice-register-item-line invoice-register-item-line--skeleton" />
                            <div className="invoice-register-item-line invoice-register-item-line--skeleton" />
                            {!isInlineMode ? (
                                <small className="invoice-register-row-expansion__loading-note">Loading item summary...</small>
                            ) : null}
                        </div>
                    ) : itemLinesError ? (
                        <div className="invoice-register-row-expansion__error">
                            <small className="invoice-register-row-expansion__error-text">
                                Failed to load item details: {itemLinesError}
                            </small>
                            <Button
                                type="button"
                                text
                                size="small"
                                icon="pi pi-refresh"
                                label="Retry"
                                onClick={() => {
                                    if (Number.isFinite(saleInvoiceId) && saleInvoiceId > 0) {
                                        void onLoadRegisterItemSummary(saleInvoiceId, true);
                                    }
                                }}
                            />
                        </div>
                    ) : shouldRenderItemTable ? (
                        <div className="invoice-register-row-expansion__table-wrap">
                            {isDockMode ? (
                                <div className="invoice-register-item-dock-table-wrap">
                                    <table className="invoice-register-item-dock-table" role="table" aria-label={`Invoice ${invoiceNo} item summary`}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '2.3rem', minWidth: '2.3rem', maxWidth: '2.3rem' }}>#</th>
                                                <th style={{ minWidth: '14rem' }}>Product</th>
                                                <th style={{ minWidth: '11rem' }}>Attributes</th>
                                                <th style={{ width: '3.8rem', minWidth: '3.8rem', maxWidth: '3.8rem' }}>HSN</th>
                                                <th
                                                    className="invoice-register-item-dock-table__cell--numeric"
                                                    style={{ width: '4.6rem', minWidth: '4.6rem', maxWidth: '4.6rem' }}
                                                >
                                                    MRP
                                                </th>
                                                <th style={{ width: '1.8rem', minWidth: '1.8rem', maxWidth: '1.8rem' }}>UnitQ</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '4.2rem', minWidth: '4.2rem', maxWidth: '4.2rem' }}>Qty</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '4.6rem', minWidth: '4.6rem', maxWidth: '4.6rem' }}>SRate</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '4.6rem', minWidth: '4.6rem', maxWidth: '4.6rem' }}>Rate</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '5.2rem', minWidth: '5.2rem', maxWidth: '5.2rem' }}>QtyxRate</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '6rem', minWidth: '6rem', maxWidth: '6rem' }}>QPS % | Amt</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '6rem', minWidth: '6rem', maxWidth: '6rem' }}>Pro % | Amt</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '6rem', minWidth: '6rem', maxWidth: '6rem' }}>Cash % | Amt</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '6rem', minWidth: '6rem', maxWidth: '6rem' }}>Taxable Amt</th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '8rem', minWidth: '8rem', maxWidth: '8rem' }}>
                                                    {isOtherState ? 'IGST % | Amt' : 'SGST+CGST % | Amt'}
                                                </th>
                                                <th className="invoice-register-item-dock-table__cell--numeric" style={{ width: '5rem', minWidth: '5rem', maxWidth: '5rem' }}>Net Amt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resolvedItemLines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={dockColumnCount} className="invoice-register-item-dock-table__empty">
                                                        {noItemLinesMessage}
                                                    </td>
                                                </tr>
                                            ) : (
                                                resolvedItemLines.map((line, index) => {
                                                    const unitName = normalizeItemMetaText(line.unitName) || '';
                                                    const unitFreeName = normalizeItemMetaText(line.unitFreeName) || '';
                                                    const freeItemName = normalizeItemMetaText(line.itemFreeName) || '';
                                                    const hasFreeQuantity = line.freeQuantity > FINANCIAL_EPSILON;
                                                    const quantityXRate = toAmountNumber(line.quantity) * toAmountNumber(line.rate);
                                                    const combinedTaxRate = toAmountNumber(line.taxRate) + toAmountNumber(line.taxRate2);
                                                    const combinedTaxAmount = toAmountNumber(line.taxAmount) + toAmountNumber(line.taxAmount2);
                                                    const taxableAmount = toAmountNumber(line.taxableAmount);
                                                    const netAmount = isOtherState
                                                        ? taxableAmount + toAmountNumber(line.taxAmount3)
                                                        : taxableAmount + combinedTaxAmount;
                                                    const taxPercentAmountPair = isOtherState
                                                        ? resolvePercentAmountPair(line.taxRate3, line.taxAmount3)
                                                        : resolvePercentAmountPair(combinedTaxRate, combinedTaxAmount);
                                                    return (
                                                        <tr key={line.saleInvoiceLineId || `${saleInvoiceId}-${index}`}>
                                                            <td>
                                                                {line.lineNumber || index + 1}
                                                            </td>
                                                            <td>
                                                                <span className="invoice-register-item-table__item-name">{line.itemName || '-'}</span>
                                                                {hasFreeQuantity ? (
                                                                    <div className="invoice-register-item-table__item-meta">{freeItemName || '-'}</div>
                                                                ) : null}
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className="invoice-register-item-dock-table__type-details"
                                                                    title={normalizeItemMetaText(line.typeDetailsText) || undefined}
                                                                >
                                                                    {normalizeItemMetaText(line.typeDetailsText)}
                                                                </span>
                                                            </td>
                                                            <td>{normalizeItemMetaText(line.hsnCode) || ''}</td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">
                                                                {line.mrp != null ? formatAmount(line.mrp) : '-'}
                                                            </td>
                                                            <td>
                                                                <span>{unitName}</span>
                                                                {hasFreeQuantity ? (
                                                                    <div className="invoice-register-item-table__item-meta">{unitFreeName || '-'}</div>
                                                                ) : null}
                                                            </td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">
                                                                <span>{formatQuantity(line.quantity)}</span>
                                                                {hasFreeQuantity ? (
                                                                    <div className="invoice-register-item-table__item-meta">{formatQuantity(line.freeQuantity)}</div>
                                                                ) : null}
                                                            </td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">
                                                                {line.sellingRate != null ? formatAmount(line.sellingRate) : '-'}
                                                            </td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">{formatAmount(line.rate)}</td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">{formatAmount(quantityXRate)}</td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">
                                                                {renderPercentAmountPair(resolvePercentAmountPair(line.qpsRate, line.qpsAmount))}
                                                            </td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">
                                                                {renderPercentAmountPair(resolvePercentAmountPair(line.productDiscountRate, line.productDiscountAmount))}
                                                            </td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">
                                                                {renderPercentAmountPair(resolvePercentAmountPair(line.cashDiscountRate, line.cashDiscountAmount))}
                                                            </td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">{formatAmount(line.taxableAmount)}</td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">
                                                                {renderPercentAmountPair(taxPercentAmountPair)}
                                                            </td>
                                                            <td className="invoice-register-item-dock-table__cell--numeric">{formatAmount(netAmount)}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                            {resolvedItemLines.length > 0 ? (
                                                <tr className="invoice-register-item-dock-table__total-row">
                                                    <td />
                                                    <td>Total</td>
                                                    <td />
                                                    <td />
                                                    <td className="invoice-register-item-dock-table__cell--numeric" />
                                                    <td />
                                                    <td className="invoice-register-item-dock-table__cell--numeric">
                                                        <span>{formatQuantity(dockTotals.quantity)}</span>
                                                        {dockTotals.freeQuantity > FINANCIAL_EPSILON ? (
                                                            <div className="invoice-register-item-table__item-meta">{formatQuantity(dockTotals.freeQuantity)}</div>
                                                        ) : null}
                                                    </td>
                                                    <td className="invoice-register-item-dock-table__cell--numeric" />
                                                    <td className="invoice-register-item-dock-table__cell--numeric" />
                                                    <td className="invoice-register-item-dock-table__cell--numeric">{formatAmount(dockTotals.qtyXRate)}</td>
                                                    <td className="invoice-register-item-dock-table__cell--numeric">
                                                        {renderPercentAmountPair({ rateText: '', amountText: formatAmount(dockTotals.qpsAmount) })}
                                                    </td>
                                                    <td className="invoice-register-item-dock-table__cell--numeric">
                                                        {renderPercentAmountPair({ rateText: '', amountText: formatAmount(dockTotals.proAmount) })}
                                                    </td>
                                                    <td className="invoice-register-item-dock-table__cell--numeric">
                                                        {renderPercentAmountPair({ rateText: '', amountText: formatAmount(dockTotals.cashAmount) })}
                                                    </td>
                                                    <td className="invoice-register-item-dock-table__cell--numeric">{formatAmount(dockTotals.taxableAmount)}</td>
                                                    <td className="invoice-register-item-dock-table__cell--numeric">
                                                        {renderPercentAmountPair({ rateText: '', amountText: formatAmount(dockTotals.taxAmount) })}
                                                    </td>
                                                    <td className="invoice-register-item-dock-table__cell--numeric">{formatAmount(dockTotals.netAmount)}</td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <DataTable
                                    value={resolvedItemLines}
                                    dataKey="saleInvoiceLineId"
                                    responsiveLayout="scroll"
                                    size="small"
                                    showGridlines
                                    emptyMessage={noItemLinesMessage}
                                    className={`invoice-register-item-table ${isInlineMode ? 'invoice-register-item-table--inline' : 'invoice-register-item-table--dialog'}`}
                                >
                                    <Column
                                        header="#"
                                        body={(line: RegisterInvoiceLineSummary, options: { rowIndex: number }) =>
                                            line.lineNumber || options.rowIndex + 1
                                        }
                                        style={{ width: '4rem' }}
                                    />
                                    <Column
                                        header="Product / HSN"
                                        body={(line: RegisterInvoiceLineSummary) => {
                                            const top = line.itemName || '-';
                                            const bottomParts = [
                                                normalizeItemMetaText(line.hsnCode) ? `HSN ${line.hsnCode?.trim()}` : null,
                                                normalizeItemMetaText(line.itemCode) ? `Code ${line.itemCode?.trim()}` : null
                                            ].filter(Boolean);
                                            return renderRegisterStackedValue(top, bottomParts.length > 0 ? bottomParts.join(' | ') : '-');
                                        }}
                                        style={{ minWidth: '14rem' }}
                                    />
                                    <Column
                                        header="Attributes"
                                        body={(line: RegisterInvoiceLineSummary) => {
                                            const typeText =
                                                normalizeItemMetaText(line.typeDetailsText)
                                                || (line.tmpTypeId != null && line.tmpTypeId > 0 ? `T${line.tmpTypeId}` : '');
                                            return <span className="invoice-register-item-table__type-details">{typeText}</span>;
                                        }}
                                        style={{ minWidth: '12rem', maxWidth: '18rem' }}
                                    />
                                    <Column
                                        header="MRP | Qty | SRate | Rate / Free"
                                        body={(line: RegisterInvoiceLineSummary) => {
                                            const unitName = normalizeItemMetaText(line.unitName) || '';
                                            const unitFreeName = normalizeItemMetaText(line.unitFreeName) || '';
                                            const topParts = [
                                                line.mrp != null ? formatAmount(line.mrp) : '-',
                                                `${formatQuantity(line.quantity)}${unitName ? ` ${unitName}` : ''}`,
                                                line.sellingRate != null ? formatAmount(line.sellingRate) : '-',
                                                formatAmount(line.rate)
                                            ];
                                            const freeBottom =
                                                line.freeQuantity > FINANCIAL_EPSILON
                                                    ? [
                                                        `${formatQuantity(line.freeQuantity)}${unitFreeName ? ` ${unitFreeName}` : ''}`,
                                                        normalizeItemMetaText(line.itemFreeName)
                                                    ].filter(Boolean).join(' | ')
                                                    : '-';
                                            return renderRegisterStackedValue(topParts.join(' | '), freeBottom);
                                        }}
                                        style={{ minWidth: '18rem' }}
                                    />
                                    <Column
                                        header="QPS | Pro | Cash Disc"
                                        headerClassName="invoice-register-item-table__header--numeric"
                                        bodyClassName="invoice-register-item-table__cell--numeric"
                                        body={(line: RegisterInvoiceLineSummary) => (
                                            <span className="invoice-register-tax-ledger-line invoice-register-tax-ledger-line--values">
                                                <span className="invoice-register-tax-ledger-line__amount">{formatAmount(line.qpsAmount)}</span>
                                                <span className="invoice-register-tax-ledger-line__sep">|</span>
                                                <span className="invoice-register-tax-ledger-line__amount">{formatAmount(line.productDiscountAmount)}</span>
                                                <span className="invoice-register-tax-ledger-line__sep">|</span>
                                                <span className="invoice-register-tax-ledger-line__amount">{formatAmount(line.cashDiscountAmount)}</span>
                                            </span>
                                        )}
                                        style={{ minWidth: '10rem' }}
                                    />
                                    <Column
                                        header="Tax Ledger | Tax Amt | Taxable Amt"
                                        body={(line: RegisterInvoiceLineSummary) => {
                                            const rows = [
                                                { rate: line.taxRate, name: resolveTaxLedgerNameForLine(line, 1), amount: line.taxAmount, taxable: line.taxableAmount },
                                                { rate: line.taxRate2, name: resolveTaxLedgerNameForLine(line, 2), amount: line.taxAmount2, taxable: line.taxableAmount2 },
                                                { rate: line.taxRate3, name: resolveTaxLedgerNameForLine(line, 3), amount: line.taxAmount3, taxable: line.taxableAmount3 }
                                            ].filter((entry) => entry.rate > FINANCIAL_EPSILON);
                                            if (rows.length === 0) return <span className="invoice-register-item-table__item-meta">-</span>;
                                            return (
                                                <div className="invoice-register-tax-ledger-lines">
                                                    {rows.map((entry, index) => (
                                                        <span key={`${line.saleInvoiceLineId}-${index}`} className="invoice-register-tax-ledger-line">
                                                            <span className="invoice-register-tax-ledger-line__name">{entry.name || '-'}</span>
                                                            <span className="invoice-register-tax-ledger-line__sep">|</span>
                                                            <span className="invoice-register-tax-ledger-line__amount">{formatAmount(entry.amount)}</span>
                                                            <span className="invoice-register-tax-ledger-line__sep">|</span>
                                                            <span className="invoice-register-tax-ledger-line__amount">{formatAmount(entry.taxable)}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        }}
                                        style={{ minWidth: '13rem' }}
                                    />
                                    <Column
                                        header="Gross / Net"
                                        headerClassName="invoice-register-item-table__header--numeric"
                                        bodyClassName="invoice-register-item-table__cell--numeric"
                                        body={(line: RegisterInvoiceLineSummary) =>
                                            renderRegisterStackedValue(
                                                formatAmount(line.grossAmount),
                                                formatAmount(line.finalAmount),
                                                'invoice-register-stack-lines__top--accent'
                                            )
                                        }
                                        style={{ minWidth: '9rem' }}
                                    />
                                    <Column
                                        header="Remark"
                                        body={(line: RegisterInvoiceLineSummary) => (
                                            <span className="invoice-register-item-table__item-meta">{line.remarks?.trim() || '-'}</span>
                                        )}
                                        style={{ minWidth: '10rem' }}
                                    />
                                </DataTable>
                            )}
                            {!isDockMode && resolvedItemLines.length === 0 ? (
                                <small className="invoice-register-row-expansion__empty-note">
                                    {noItemLinesMessage}
                                </small>
                            ) : null}
                        </div>
                    ) : (
                        <small className="invoice-register-cell-muted">
                            {noItemLinesMessage}
                        </small>
                    )}
                </div>
            );
        },
        [
            ledgerById,
            onLoadRegisterItemSummary,
            registerItemSummaryByInvoiceId,
            registerItemSummaryErrorByInvoiceId,
            registerItemSummaryLoadingByInvoiceId,
            renderRegisterStackedValue,
            taxLedgerNameById
        ]
    );

    const renderRegisterStatusCell = React.useCallback((row: SaleInvoiceListItem) => {
        if (isRegisterTotalsRow(row)) {
            return (
                <div className="invoice-register-chip-row">
                    <span className="invoice-form-status-chip invoice-form-status-chip--info">Summary</span>
                </div>
            );
        }
        const deliveryStatusLabel = normalizeDisplayText(row.deliveryStatus) || 'Pending';
        const normalizedDeliveryStatus = normalizeFilterValue(deliveryStatusLabel);
        let deliveryStatusToneClass = 'invoice-form-status-chip--info';
        if (
            normalizedDeliveryStatus.includes('deliver')
            || normalizedDeliveryStatus.includes('complete')
            || normalizedDeliveryStatus.includes('close')
            || normalizedDeliveryStatus.includes('done')
        ) {
            deliveryStatusToneClass = 'invoice-form-status-chip--positive';
        } else if (
            normalizedDeliveryStatus.includes('pending')
            || normalizedDeliveryStatus.includes('process')
            || normalizedDeliveryStatus.includes('hold')
            || normalizedDeliveryStatus.includes('queue')
        ) {
            deliveryStatusToneClass = 'invoice-form-status-chip--warning';
        } else if (
            normalizedDeliveryStatus.includes('cancel')
            || normalizedDeliveryStatus.includes('return')
            || normalizedDeliveryStatus.includes('fail')
            || normalizedDeliveryStatus.includes('reject')
        ) {
            deliveryStatusToneClass = 'invoice-form-status-chip--danger';
        }
        const deliveryStatusAlreadyCancelled = normalizedDeliveryStatus.includes('cancel');
        return (
            <div className="invoice-register-chip-row">
                <span className={`invoice-form-status-chip ${deliveryStatusToneClass}`}>{deliveryStatusLabel}</span>
                {row.isCancelled && !deliveryStatusAlreadyCancelled ? (
                    <span className="invoice-form-status-chip invoice-form-status-chip--danger">Cancelled</span>
                ) : null}
                {row.isDisputed ? (
                    <span className="invoice-form-status-chip invoice-form-status-chip--warning">Disputed</span>
                ) : null}
                {row.isChecked ? (
                    <span className="invoice-form-status-chip invoice-form-status-chip--positive">Checked</span>
                ) : null}
            </div>
        );
    }, [isRegisterTotalsRow]);

    const entryActionBar = (
        <div className="app-entry-actionsbar invoice-form-actionsbar invoice-form-actionsbar--fixed-bottom">
            <div className="flex justify-content-center flex-wrap app-entry-form-actions">
                <div className="app-entry-form-action-with-hint">
                    <Button
                        label="New Invoice"
                        icon="pi pi-plus-circle"
                        className="app-action-compact p-button-outlined"
                        onClick={onOpenNew}
                        disabled={saving || loadingInvoice}
                    />
                    <small className="app-entry-form-action-hint">New entry</small>
                </div>
                <div className="app-entry-form-action-with-hint">
                    <Button
                        label={isEditView ? 'Update Invoice' : 'Save Invoice'}
                        icon="pi pi-check"
                        className="app-action-compact"
                        disabled={!canSave || saving || loadingInvoice}
                        loading={saving}
                        onClick={requestSaveWithDryCheck}
                    />
                    <small className="app-entry-form-action-hint">Ctrl+S / F2</small>
                </div>
                <div className="app-entry-form-action-with-hint">
                    <Button
                        label="Dry Check"
                        icon="pi pi-search"
                        className="app-action-compact p-button-outlined"
                        onClick={handleDryCheckEntry}
                        disabled={saving || loadingInvoice}
                    />
                    <small className="app-entry-form-action-hint">Ctrl+Shift+S</small>
                </div>
                <div className="app-entry-form-action-with-hint">
                    <Button
                        label="Cancel"
                        className="app-action-compact p-button-outlined"
                        onClick={onCancelEntry}
                        disabled={saving}
                    />
                    <small className="app-entry-form-action-hint">Esc</small>
                </div>
                <div className="app-entry-form-action-with-hint">
                    <Button
                        label="Print Voucher"
                        icon="pi pi-print"
                        className="app-action-compact p-button-outlined"
                        onClick={handlePrintEntry}
                        disabled={saving || loadingInvoice}
                    />
                    <small className="app-entry-form-action-hint">Ctrl+P</small>
                </div>
                {isEditView && editingSaleInvoiceId != null ? (
                    <div className="app-entry-form-action-with-hint">
                        <Button
                            label="Cancel Invoice"
                            icon="pi pi-times-circle"
                            severity="danger"
                            outlined
                            className="app-action-compact"
                            disabled={saving || loadingInvoice}
                            onClick={() => requestCancelInvoice(editingSaleInvoiceId)}
                        />
                        <small className="app-entry-form-action-hint">Cancel invoice</small>
                    </div>
                ) : null}
            </div>
            {footerUtilityNotice ? <Message severity="info" text={footerUtilityNotice} className="mt-2" /> : null}
        </div>
    );
    const hasLinkedActionButtons = legacyActionFlags.estimate || legacyActionFlags.creditNote || legacyActionFlags.debitNote;
    const headerLinkedActions = hasLinkedActionButtons ? (
        <div className="invoice-form-legacy-actions invoice-header-linked-actions">
            <div className="invoice-form-legacy-actions__controls">
                {legacyActionFlags.estimate ? (
                    <Button
                        type="button"
                        icon="pi pi-file-edit"
                        label="Estimate"
                        className="app-action-compact p-button-outlined"
                        onClick={() => onRequestLegacyAction('estimate')}
                        disabled={saving || loadingInvoice}
                    />
                ) : null}
                {legacyActionFlags.creditNote ? (
                    <Button
                        type="button"
                        icon="pi pi-minus-circle"
                        label="Credit Note"
                        className="app-action-compact p-button-outlined"
                        onClick={() => onRequestLegacyAction('creditNote')}
                        disabled={saving || loadingInvoice}
                    />
                ) : null}
                {legacyActionFlags.debitNote ? (
                    <Button
                        type="button"
                        icon="pi pi-plus-circle"
                        label="Debit Note"
                        className="app-action-compact p-button-outlined"
                        onClick={() => onRequestLegacyAction('debitNote')}
                        disabled={saving || loadingInvoice}
                    />
                ) : null}
            </div>
        </div>
    ) : null;

    return (
        <div className="cash-exp-split invoice-form-layout">
            <ConfirmDialog />
            {isEntryView ? (
                <div className="app-workspace-toolbar invoice-entry-jump-toolbar flex align-items-center justify-content-end gap-2 flex-wrap mb-2">
                        <div className="invoice-entry-page-title mr-auto">GST Sales Invoice</div>
                        <div className="invoice-entry-toolbar-date">
                            <span className="invoice-entry-toolbar-date__label">From</span>
                            <AppDateInput
                                inputId="invoice-entry-jump-from-date"
                                value={entryJumpFromDate}
                                onChange={(next) => setEntryJumpFromDate(next)}
                                fiscalYearStart={fiscalYearStart}
                                fiscalYearEnd={fiscalYearEnd}
                                className="invoice-entry-toolbar-date__control"
                            />
                        </div>
                        <div className="invoice-entry-toolbar-date">
                            <span className="invoice-entry-toolbar-date__label">To</span>
                            <AppDateInput
                                inputId="invoice-entry-jump-to-date"
                                value={entryJumpToDate}
                                onChange={(next) => setEntryJumpToDate(next)}
                                fiscalYearStart={fiscalYearStart}
                                fiscalYearEnd={fiscalYearEnd}
                                className="invoice-entry-toolbar-date__control"
                            />
                        </div>
                        <div className="invoice-entry-quick-jump">
                            <span className="invoice-entry-quick-jump__label">Invoice No ({quickJumpInvoiceOptions.length})</span>
                            <AppDropdown
                                inputId="invoice-entry-quick-jump"
                                value={quickJumpInvoiceId}
                                options={quickJumpInvoiceOptions}
                                onChange={(event) =>
                                    handleQuickJumpInvoice(
                                        event.value != null ? Number(event.value) : null
                                    )
                                }
                                placeholder={
                                    entryJumpRangeInvalid
                                        ? 'Fix date range'
                                        : quickJumpInvoiceOptions.length > 0
                                          ? 'Jump to invoice no'
                                          : 'No invoices in range'
                                }
                                filter
                                className="invoice-entry-quick-jump__control"
                                disabled={saving || loadingInvoice || entryJumpRangeInvalid || quickJumpInvoiceOptions.length === 0}
                            />
                        </div>
                        {entryJumpRangeInvalid ? (
                            <span className="invoice-form-status-chip invoice-form-status-chip--danger">Invalid Date Range</span>
                        ) : null}
                        <Button
                            type="button"
                            label="Reset"
                            text
                            className="app-action-compact"
                            onClick={clearEntryJumpRange}
                            disabled={entryJumpRangeAtDefault}
                        />
                </div>
            ) : null}

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}
            {productsLoading && <Message severity="info" text="Loading product catalog..." className="w-full mt-3" />}
            {loadingInvoice && isEntryView && <Message severity="info" text="Loading invoice for edit..." className="w-full mt-3" />}

            {isEntryView ? (
                <div
                    className="voucher-form cash-exp-split__form p-2 cash-exp-form cash-exp-form--receipt cash-exp-form--cash mt-2"
                    onKeyDownCapture={handleEntryShortcutKeyDown}
                >
                    <div className="invoice-entry-header-shell">
                        <div className="app-entry-form-header app-entry-form-header--three-col invoice-entry-form-header">
                            <div className="app-entry-form-header__left">
                                <Button
                                    label="← Back to Register"
                                    className="p-button-text p-button-sm app-entry-form-header__back"
                                    onClick={onCancelEntry}
                                    disabled={saving}
                                />
                            </div>
                            <div className="app-entry-form-header__center">
                                <div className="app-entry-form-header__center-stack invoice-entry-form-header__center-stack">
                                    <span className="app-entry-form-title" title={entryFormTitle}>
                                        {entryFormTitle}
                                    </span>
                                    {!isEditView ? (
                                        <span className="invoice-form-status-chip invoice-form-status-chip--mode">Add Mode</span>
                                    ) : null}
                                    <span
                                        className={`invoice-form-status-chip ${
                                            entryCustomerTypeKey === 'b2b'
                                                ? 'invoice-form-status-chip--b2b'
                                                : 'invoice-form-status-chip--b2c'
                                        }`}
                                        title={entryCustomerTypeLabel}
                                    >
                                        {entryCustomerTypeCode}
                                    </span>
                                    <span className="invoice-form-status-chip">Lines: {computation.lines.length}</span>
                                    <span className="invoice-form-status-chip invoice-form-status-chip--amount">
                                        Net: {formatAmount(computation.totals.totalNetAmount)}
                                    </span>
                                    <span
                                        className={`invoice-form-status-chip ${
                                            isDryCheckReady
                                                ? 'invoice-form-status-chip--positive'
                                                : 'invoice-form-status-chip--warning'
                                        }`}
                                        title={
                                            !dryCheckRequired
                                                ? 'Dry check is optional for this profile'
                                                : isDryCheckReady
                                                ? 'Dry check passed for current draft'
                                                : 'Run Dry Check before save'
                                        }
                                    >
                                        {!dryCheckRequired ? 'Dry: Optional' : isDryCheckReady ? 'Dry: OK' : 'Dry: Pending'}
                                    </span>
                                    {showLegacyLinkedIndicator ? (
                                        <span
                                            className="invoice-form-status-chip invoice-form-status-chip--legacy"
                                            title={legacyLinkedIndicatorTitle}
                                        >
                                            Linked Details
                                        </span>
                                    ) : null}
                                    {hasUnsavedEntryChanges ? (
                                        <span className="invoice-form-status-chip invoice-form-status-chip--warning">
                                            Unsaved
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="app-entry-form-header__right">
                                <span className="app-entry-form-header__mode">
                                    <i className="pi pi-map-marker mr-1" aria-hidden="true" />
                                    <span>{entrySupplyShortLabel}</span>
                                </span>
                            </div>
                        </div>
                        {legacyActionNotice ? (
                            <Message severity="info" text={legacyActionNotice} className="invoice-entry-header-shell__notice" />
                        ) : null}

                        <InvoiceHeaderSection
                            isEditView={isEditView}
                            header={header}
                            fiscalYearStart={fiscalYearStart}
                            fiscalYearEnd={fiscalYearEnd}
                            ledgerOptions={ledgerOptions}
                            ledgerById={ledgerById}
                            ledgerLoading={ledgerLoading}
                            onHeaderChange={onHeaderChange}
                            headerErrors={headerErrors}
                            salesmanFeatureAvailable={salesmanFeatureAvailable}
                            secondarySalesmanFeatureAvailable={secondarySalesmanFeatureAvailable}
                            showSchemeToggle={showHeaderSchemeToggle}
                            showBizomInvoiceField={showHeaderBizomField}
                            showInterStateToggle={showHeaderInterStateToggle}
                            showTextileJobworkFields={showTextileJobworkFields}
                            topActions={headerLinkedActions}
                        />
                    </div>
                    {entryActionBar}

                    <InvoiceLinesTable
                        lines={computation.lines}
                        placeOfSupply={header.placeOfSupply}
                        showTaxColumns={showTaxColumns}
                        showTypeDetails={showTypeDetailsFeature}
                        productOptions={productOptions}
                        lineAttributesByLineKey={lineAttributesByLineKey}
                        mrpOptionsByProductId={mrpOptionsByProductId}
                        unitOptions={unitOptions}
                        ledgerOptions={ledgerOptions}
                        ledgerById={ledgerById}
                        taxLedgerOptions={taxLedgerOptions}
                        showTextileJobworkFields={showTextileJobworkFields}
                        lineErrorsByKey={lineErrorsByKey}
                        onSelectProduct={onSelectProduct}
                        onSelectMrp={onSelectMrp}
                        onLineChange={onLineChange}
                        onDeleteLine={onDeleteLine}
                        onDuplicateLine={onDuplicateLine}
                        onAddLine={onAddLine}
                        onOpenTypeDetailsForLine={handleOpenTypeDetailsForLine}
                    />

                    <div className="flex flex-wrap gap-2 mt-2">
                        {showTypeDetailsFeature ? (
                            <Button
                                type="button"
                                icon="pi pi-list"
                                label={`Type Details (${typeDetails.length})`}
                                className="app-action-compact p-button-outlined"
                                onClick={() => {
                                    setTypeDetailsDialogScope(null);
                                    setTypeDetailsDialogVisible(true);
                                }}
                                disabled={saving || loadingInvoice}
                            />
                        ) : null}
                        {showAdditionalTaxationFeature ? (
                            <Button
                                type="button"
                                icon="pi pi-calculator"
                                label={`Additional Tax (${additionalTaxations.length})`}
                                className="app-action-compact p-button-outlined"
                                onClick={() => setAdditionalTaxationDialogVisible(true)}
                                disabled={saving || loadingInvoice}
                            />
                        ) : null}
                        {transportFeatureAvailable ? (
                            <Button
                                type="button"
                                icon="pi pi-truck"
                                label="Transport/Freight"
                                className="app-action-compact p-button-outlined"
                                onClick={() => setTransportFreightDialogVisible(true)}
                                disabled={saving || loadingInvoice}
                            />
                        ) : null}
                        {showAdditionalTaxationFeature ? (
                            <span className="invoice-form-status-chip">
                                Additional Tax Total: {formatAmount(totalAdditionalTaxAmount)}
                            </span>
                        ) : null}
                        {transportFeatureAvailable && transportDraft.isApplied && transportFreightTotalAmount > 0 ? (
                            <span className="invoice-form-status-chip invoice-form-status-chip--info">
                                Freight Total: {formatAmount(transportFreightTotalAmount)}
                            </span>
                        ) : null}
                    </div>

                    <InvoiceLoyaltySection
                        value={preservedDetails.loyaltyApplication}
                        summary={loyaltySummary}
                        loading={loyaltySummaryLoading}
                        error={loyaltySummaryError}
                        partyLedgerId={header.partyLedgerId}
                        disabled={saving || loadingInvoice}
                        onApply={onApplyLoyaltyApplication}
                        onChange={onChangeLoyaltyApplication}
                        onClear={onClearLoyaltyApplication}
                    />

                    <InvoiceGiftCertificateSection
                        lines={preservedDetails.giftCertificateApplications}
                        certificateOptions={giftCertificateOptions}
                        loading={giftCertificatesLoading}
                        error={giftCertificatesError}
                        partyLedgerId={header.partyLedgerId}
                        disabled={saving || loadingInvoice}
                        onAddLine={onAddGiftCertificateApplication}
                        onSelectCertificate={onSelectGiftCertificate}
                        onLineChange={onChangeGiftCertificateApplication}
                        onDeleteLine={onDeleteGiftCertificateApplication}
                    />

                    <InvoiceTotalsPanel
                        computation={computation}
                        taxSummaryRows={taxSummaryRows}
                        ledgerById={ledgerById}
                        taxLedgerOptions={taxLedgerOptions}
                        loyaltyAppliedAmount={loyaltyAppliedAmount}
                        giftCertificateAppliedAmount={giftCertificateAppliedAmount}
                        settlementAppliedAmount={settlementAppliedAmount}
                        settlementBalanceAmount={settlementBalanceAmount}
                        settlementExceedsInvoice={settlementExceedsInvoice}
                        allowTaxLessEdit={false}
                        onTaxLessChange={onTaxLessChange}
                        onResetTaxLess={onResetTaxLess}
                        disabled={saving || loadingInvoice}
                    />

                    {showTypeDetailsFeature ? (
                        <Dialog
                            visible={typeDetailsDialogVisible}
                            onHide={() => {
                                setTypeDetailsDialogVisible(false);
                                setTypeDetailsDialogScope(null);
                            }}
                            header={typeDetailsDialogTitle}
                            className="invoice-type-details-dialog"
                            style={{ width: 'min(820px, 95vw)' }}
                            modal
                            maximizable
                            closeOnEscape
                        >
                            <InvoiceTypeDetailsSection
                                lines={scopedTypeDetailsLines}
                                products={products}
                                productOptions={productOptions}
                                attributeOptionsByType={typeDetailOptionsByType}
                                attributeTypeNameById={typeDetailTypeNameById}
                                attributeOptionsLoading={typeDetailOptionsLoading}
                                disabled={saving || loadingInvoice}
                                scopedItemId={typeDetailsDialogScope?.itemId ?? null}
                                scopedTmpTypeId={typeDetailsDialogScope?.tmpTypeId ?? null}
                                scopedItemQuantity={scopedTypeDetailsLineQuantity}
                                dialogVisible={typeDetailsDialogVisible}
                                onAddLine={handleAddTypeDetailFromDialog}
                                onLineChange={onChangeTypeDetail}
                                onDeleteLine={onDeleteTypeDetail}
                            />
                        </Dialog>
                    ) : null}

                    {showAdditionalTaxationFeature ? (
                        <Dialog
                            visible={additionalTaxationDialogVisible}
                            onHide={() => setAdditionalTaxationDialogVisible(false)}
                            header="Additional Taxation"
                            style={{ width: 'min(960px, 95vw)' }}
                            modal
                            maximizable
                        >
                            <InvoiceAdditionalTaxationSection
                                lines={additionalTaxations}
                                taxLedgerOptions={taxLedgerOptions}
                                totalAmount={totalAdditionalTaxAmount}
                                disabled={saving || loadingInvoice}
                                onAddLine={onAddAdditionalTaxation}
                                onLineChange={onChangeAdditionalTaxation}
                                onDeleteLine={onDeleteAdditionalTaxation}
                            />
                        </Dialog>
                    ) : null}

                    <Dialog
                        visible={transportFreightDialogVisible}
                        onHide={() => setTransportFreightDialogVisible(false)}
                        header="Transport / Freight"
                        style={{ width: 'min(920px, 95vw)' }}
                        modal
                        maximizable
                    >
                        <InvoiceTransportFreightSection
                            transportDraft={transportDraft}
                            transporterOptions={transporterOptions}
                            ledgerOptions={ledgerOptions}
                            taxLedgerOptions={taxLedgerOptions}
                            showTransporterField={showTransporterField}
                            requireTransporterWhenApplied={requireTransporterWhenApplied}
                            freightTaxRate={transportFreightTaxRate}
                            freightTaxAmount={transportFreightTaxAmount}
                            freightTotalAmount={transportFreightTotalAmount}
                            disabled={saving || loadingInvoice}
                            onDraftChange={onTransportDraftChange}
                            onApply={onApplyTransportCharges}
                            onClear={onClearTransportCharges}
                        />
                    </Dialog>

                    <Dialog
                        visible={estimateLookupDialogVisible}
                        onHide={onCloseEstimateLookupDialog}
                        header="Link Estimate"
                        style={{ width: 'min(980px, 95vw)' }}
                        modal
                        maximizable
                    >
                        <div className="invoice-register-toolbar mb-3">
                            <span className="p-input-icon-left invoice-register-search">
                                <i className="pi pi-search" />
                                <InputText
                                    value={estimateSearch}
                                    onChange={(event) => setEstimateSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        event.preventDefault();
                                        requestEstimateSearch();
                                    }}
                                    placeholder="Search by estimate id, date, party"
                                    className="w-full"
                                />
                            </span>
                            <div className="flex align-items-center gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    icon="pi pi-search"
                                    label="Search"
                                    className="app-action-compact p-button-outlined"
                                    onClick={requestEstimateSearch}
                                    disabled={estimateLookupLoading}
                                />
                                <Button
                                    type="button"
                                    label="Reset"
                                    text
                                    className="app-action-compact"
                                    onClick={resetEstimateSearch}
                                    disabled={estimateLookupLoading}
                                />
                                <Button
                                    type="button"
                                    icon="pi pi-times"
                                    label="Clear Link"
                                    severity="secondary"
                                    outlined
                                    className="app-action-compact"
                                    onClick={onClearEstimateLink}
                                    disabled={linkedEstimateId == null}
                                />
                            </div>
                        </div>

                        {estimateLookupError ? <Message severity="error" text={estimateLookupError} className="w-full mb-3" /> : null}

                        <DataTable
                            value={estimateLookups}
                            loading={estimateLookupLoading}
                            dataKey="estimateId"
                            paginator
                            rows={10}
                            rowsPerPageOptions={[10, 20, 50]}
                            responsiveLayout="scroll"
                            emptyMessage="No estimates found."
                            onRowDoubleClick={(event) => {
                                if (estimateLookupLoading) return;
                                onApplyEstimateLookup(event.data as EstimateLookupItem);
                            }}
                        >
                            <Column field="estimateId" header="Estimate No" sortable style={{ width: '8rem' }} />
                            <Column
                                field="voucherDateText"
                                header="Date"
                                sortable
                                body={(row: EstimateLookupItem) => formatVoucherDate(row.voucherDateText)}
                            />
                            <Column
                                field="ledgerName"
                                header="Party"
                                sortable
                                body={(row: EstimateLookupItem) => row.ledgerName || '-'}
                            />
                            <Column
                                field="totalNetAmount"
                                header="Total"
                                sortable
                                body={(row: EstimateLookupItem) => formatAmount(Number(row.totalNetAmount || 0))}
                            />
                            <Column
                                header="Action"
                                body={(row: EstimateLookupItem) => (
                                    <Button
                                        type="button"
                                        icon="pi pi-check"
                                        label="Apply"
                                        className="app-action-compact p-button-outlined"
                                        onClick={() => onApplyEstimateLookup(row)}
                                        disabled={saving || loadingInvoice || estimateLookupLoading}
                                    />
                                )}
                                style={{ width: '9rem' }}
                            />
                        </DataTable>
                    </Dialog>

                    <Dialog
                        visible={creditNoteDialogVisible}
                        onHide={onCloseCreditNoteDialog}
                        header="Link Credit Notes"
                        style={{ width: 'min(860px, 95vw)' }}
                        modal
                        footer={
                            <div className="flex justify-content-end gap-2">
                                <Button
                                    type="button"
                                    label="Cancel"
                                    className="app-action-compact p-button-secondary p-button-outlined"
                                    onClick={onCloseCreditNoteDialog}
                                    disabled={saving || loadingInvoice}
                                />
                                <Button
                                    type="button"
                                    label="Apply"
                                    icon="pi pi-check"
                                    className="app-action-compact"
                                    onClick={onApplyCreditNotes}
                                    disabled={saving || loadingInvoice}
                                />
                            </div>
                        }
                    >
                        <div className="invoice-register-toolbar mb-3">
                            <span className="p-input-icon-left invoice-register-search">
                                <i className="pi pi-search" />
                                <InputText
                                    value={creditNoteLookupSearch}
                                    onChange={(event) => setCreditNoteLookupSearch(event.target.value)}
                                    placeholder="Search return id, voucher no, party, date, amount"
                                    className="w-full"
                                />
                            </span>
                            <div className="flex align-items-center gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    icon="pi pi-refresh"
                                    label="Refresh"
                                    className="app-action-compact p-button-outlined"
                                    onClick={() => void onRefreshCreditNoteLookups()}
                                    disabled={saving || loadingInvoice || creditNoteLookupLoading}
                                />
                                <small className="text-600">Rows: {filteredCreditNoteLookups.length}</small>
                            </div>
                        </div>
                        {creditNoteLookupError ? (
                            <Message severity="error" text={creditNoteLookupError} className="w-full mb-3" />
                        ) : null}
                        <DataTable
                            value={filteredCreditNoteLookups}
                            dataKey="saleReturnId"
                            loading={creditNoteLookupLoading}
                            responsiveLayout="scroll"
                            paginator
                            rows={8}
                            rowsPerPageOptions={[8, 20, 50]}
                            emptyMessage="No credit note lookups found."
                            className="mb-3"
                        >
                            <Column field="saleReturnId" header="Sale Return ID" sortable style={{ width: '9rem' }} />
                            <Column
                                field="voucherNumber"
                                header="Voucher No"
                                sortable
                                body={(row: SalesReturnBookRow) => row.voucherNumber || '-'}
                            />
                            <Column
                                field="voucherDateText"
                                header="Date"
                                sortable
                                body={(row: SalesReturnBookRow) => formatVoucherDate(row.voucherDateText)}
                            />
                            <Column
                                field="ledgerName"
                                header="Party"
                                sortable
                                body={(row: SalesReturnBookRow) => row.ledgerName || '-'}
                            />
                            <Column
                                field="totalNetAmount"
                                header="Net"
                                sortable
                                body={(row: SalesReturnBookRow) => formatAmount(Number(row.totalNetAmount || 0))}
                            />
                            <Column
                                header="Action"
                                body={(row: SalesReturnBookRow) => (
                                    <Button
                                        type="button"
                                        icon="pi pi-plus"
                                        label="Add"
                                        className="app-action-compact p-button-outlined"
                                        onClick={() => onAppendCreditNoteFromLookup(Number(row.saleReturnId))}
                                        disabled={saving || loadingInvoice}
                                    />
                                )}
                                style={{ width: '8rem' }}
                            />
                        </DataTable>

                        <div className="flex align-items-center justify-content-between gap-2 mb-2">
                            <small className="text-600">
                                Enter either `Voucher ID` or `Sale Return ID` per row.
                            </small>
                            <Button
                                type="button"
                                icon="pi pi-plus"
                                label="Add Row"
                                className="app-action-compact p-button-outlined"
                                onClick={onAddCreditNoteDraftRow}
                                disabled={saving || loadingInvoice}
                            />
                        </div>
                        <DataTable
                            value={creditNoteDraftRows}
                            dataKey="key"
                            responsiveLayout="scroll"
                            emptyMessage="No credit note rows."
                        >
                            <Column
                                header="Voucher ID"
                                body={(row: CreditNoteDraftRow) => (
                                    <InputNumber
                                        value={row.voucherId}
                                        onValueChange={(event) =>
                                            onUpdateCreditNoteDraftRow(row.key, { voucherId: event.value ?? null })
                                        }
                                        min={0}
                                        useGrouping={false}
                                        className="w-full"
                                        inputClassName="w-full"
                                    />
                                )}
                                style={{ width: '16rem' }}
                            />
                            <Column
                                header="Sale Return ID"
                                body={(row: CreditNoteDraftRow) => (
                                    <InputNumber
                                        value={row.saleReturnId}
                                        onValueChange={(event) =>
                                            onUpdateCreditNoteDraftRow(row.key, { saleReturnId: event.value ?? null })
                                        }
                                        min={0}
                                        useGrouping={false}
                                        className="w-full"
                                        inputClassName="w-full"
                                    />
                                )}
                                style={{ width: '16rem' }}
                            />
                            <Column
                                header=""
                                body={(row: CreditNoteDraftRow) => (
                                    <Button
                                        type="button"
                                        icon="pi pi-trash"
                                        text
                                        severity="danger"
                                        onClick={() => onDeleteCreditNoteDraftRow(row.key)}
                                        disabled={saving || loadingInvoice}
                                    />
                                )}
                                style={{ width: '4rem' }}
                            />
                        </DataTable>
                    </Dialog>

                    <Dialog
                        visible={debitNoteDialogVisible}
                        onHide={onCloseDebitNoteDialog}
                        header="Link Debit Notes"
                        style={{ width: 'min(760px, 95vw)' }}
                        modal
                        footer={
                            <div className="flex justify-content-end gap-2">
                                <Button
                                    type="button"
                                    label="Cancel"
                                    className="app-action-compact p-button-secondary p-button-outlined"
                                    onClick={onCloseDebitNoteDialog}
                                    disabled={saving || loadingInvoice}
                                />
                                <Button
                                    type="button"
                                    label="Apply"
                                    icon="pi pi-check"
                                    className="app-action-compact"
                                    onClick={onApplyDebitNotes}
                                    disabled={saving || loadingInvoice}
                                />
                            </div>
                        }
                    >
                        <div className="invoice-register-toolbar mb-3">
                            <span className="p-input-icon-left invoice-register-search">
                                <i className="pi pi-search" />
                                <InputText
                                    value={debitNoteLookupSearch}
                                    onChange={(event) => setDebitNoteLookupSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        event.preventDefault();
                                        void onRefreshDebitNoteLookups(debitNoteLookupSearch);
                                    }}
                                    placeholder="Search voucher id"
                                    className="w-full"
                                />
                            </span>
                            <div className="flex align-items-center gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    icon="pi pi-search"
                                    label="Search"
                                    className="app-action-compact p-button-outlined"
                                    onClick={() => void onRefreshDebitNoteLookups(debitNoteLookupSearch)}
                                    disabled={saving || loadingInvoice || debitNoteLookupLoading}
                                />
                                <Button
                                    type="button"
                                    label="Reset"
                                    text
                                    className="app-action-compact"
                                    onClick={() => {
                                        setDebitNoteLookupSearch('');
                                        void onRefreshDebitNoteLookups('');
                                    }}
                                    disabled={saving || loadingInvoice || debitNoteLookupLoading}
                                />
                            </div>
                        </div>
                        {debitNoteLookupError ? (
                            <Message severity="error" text={debitNoteLookupError} className="w-full mb-3" />
                        ) : null}
                        <DataTable
                            value={debitNoteLookups}
                            dataKey="voucherId"
                            loading={debitNoteLookupLoading}
                            responsiveLayout="scroll"
                            paginator
                            rows={8}
                            rowsPerPageOptions={[8, 20, 50]}
                            emptyMessage="No debit note lookups found."
                            className="mb-3"
                        >
                            <Column field="voucherId" header="Voucher ID" sortable style={{ width: '10rem' }} />
                            <Column
                                field="totalAppliedAmount"
                                header="Applied"
                                sortable
                                body={(row: DebitNoteLookupItem) => formatAmount(Number(row.totalAppliedAmount || 0))}
                            />
                            <Column
                                field="totalNetAmount"
                                header="Net"
                                sortable
                                body={(row: DebitNoteLookupItem) => formatAmount(Number(row.totalNetAmount || 0))}
                            />
                            <Column
                                field="isCancelled"
                                header="Status"
                                body={(row: DebitNoteLookupItem) => (row.isCancelled ? 'Cancelled' : 'Active')}
                                style={{ width: '8rem' }}
                            />
                            <Column
                                header="Action"
                                body={(row: DebitNoteLookupItem) => (
                                    <Button
                                        type="button"
                                        icon="pi pi-plus"
                                        label="Add"
                                        className="app-action-compact p-button-outlined"
                                        onClick={() => onAppendDebitNoteFromLookup(Number(row.voucherId))}
                                        disabled={saving || loadingInvoice}
                                    />
                                )}
                                style={{ width: '8rem' }}
                            />
                        </DataTable>

                        <div className="flex align-items-center justify-content-between gap-2 mb-2">
                            <small className="text-600">Enter voucher IDs for debit note linkage.</small>
                            <Button
                                type="button"
                                icon="pi pi-plus"
                                label="Add Row"
                                className="app-action-compact p-button-outlined"
                                onClick={onAddDebitNoteDraftRow}
                                disabled={saving || loadingInvoice}
                            />
                        </div>
                        <DataTable
                            value={debitNoteDraftRows}
                            dataKey="key"
                            responsiveLayout="scroll"
                            emptyMessage="No debit note rows."
                        >
                            <Column
                                header="Voucher ID"
                                body={(row: DebitNoteDraftRow) => (
                                    <InputNumber
                                        value={row.voucherId}
                                        onValueChange={(event) =>
                                            onUpdateDebitNoteDraftRow(row.key, { voucherId: event.value ?? null })
                                        }
                                        min={0}
                                        useGrouping={false}
                                        className="w-full"
                                        inputClassName="w-full"
                                    />
                                )}
                                style={{ width: '16rem' }}
                            />
                            <Column
                                header=""
                                body={(row: DebitNoteDraftRow) => (
                                    <Button
                                        type="button"
                                        icon="pi pi-trash"
                                        text
                                        severity="danger"
                                        onClick={() => onDeleteDebitNoteDraftRow(row.key)}
                                        disabled={saving || loadingInvoice}
                                    />
                                )}
                                style={{ width: '4rem' }}
                            />
                        </DataTable>
                    </Dialog>

                </div>
            ) : (
                <div
                    ref={registerCardRef}
                    className="card app-gradient-card mt-3 invoice-register-card"
                    tabIndex={0}
                    onKeyDownCapture={handleRegisterShortcutKeyDown}
                    onClickCapture={(event) => {
                        if (isInteractiveShortcutTarget(event.target)) return;
                        registerCardRef.current?.focus();
                    }}
                >
                    <ReportHeader
                        title="Sale Book"
                        subtitle="Invoice records for the selected date range and filters."
                        rightSlot={
                            <ReportRegisterSearch
                                value={registerSearch}
                                onValueChange={setRegisterSearch}
                                matchCase={registerSearchMatchCase}
                                onMatchCaseChange={setRegisterSearchMatchCase}
                                wholeWord={registerSearchWholeWord}
                                onWholeWordChange={setRegisterSearchWholeWord}
                                placeholder="Search register..."
                                helperText="Aa: Match Case · W: Whole Word"
                                className="invoice-register-report-search"
                            />
                        }
                        className="invoice-register-report-header"
                    />
                    <div style={registerTableDockSpacerStyle}>
                        <AppDataTable
                            className="invoice-register-table"
                            value={filteredSaleInvoices}
                            topSummaryRows={registerTopSummaryRows}
                            loading={loading && saleInvoices.length === 0}
                            showGridlines
                            filters={registerColumnFilters}
                            filterDisplay="menu"
                            filterDelay={350}
                            onFilter={handleRegisterColumnFilter}
                            size="small"
                            paginator
                            rows={50}
                            rowsPerPageOptions={[10, 20, 50, 100]}
                            first={registerResolvedTableFirst}
                            onPage={handleRegisterPage}
                            dataKey="saleInvoiceId"
                            selection={registerMarkingModeEnabled ? registerSelectedRows : []}
                            onSelectionChange={handleRegisterSelectionChange}
                            rowClassName={resolveRegisterRowClassName}
                            onRowClick={(event: { data: SaleInvoiceListItem }) => {
                                const row = event.data as SaleInvoiceListItem;
                                if (isRegisterTotalsRow(row)) return;
                                const saleInvoiceId = Number(row.saleInvoiceId);
                                if (Number.isFinite(saleInvoiceId) && saleInvoiceId > 0) {
                                    setRegisterKeyboardFocusInvoiceId(saleInvoiceId);
                                    setRegisterDockInvoiceId(saleInvoiceId);
                                    if (registerShowItemSummaryPanel) {
                                        void onLoadRegisterItemSummary(saleInvoiceId, true);
                                    }
                                }
                            }}
                            responsiveLayout="scroll"
                            headerLeft={
                                <>
                                    <div className="invoice-register-filterbar">
                                    <div className="invoice-register-filterbar__row">
                                        <div>
                                            <AppDateInput
                                                inputId="invoice-register-from-date"
                                                value={registerFromDate}
                                                onChange={(next) => setRegisterFromDate(next)}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-to-date')}
                                                fiscalYearStart={fiscalYearStart}
                                                fiscalYearEnd={fiscalYearEnd}
                                                placeholder="From date"
                                                className="app-entry-date"
                                            />
                                        </div>
                                        <div>
                                            <AppDateInput
                                                inputId="invoice-register-to-date"
                                                value={registerToDate}
                                                onChange={(next) => setRegisterToDate(next)}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-area-filter')}
                                                fiscalYearStart={fiscalYearStart}
                                                fiscalYearEnd={fiscalYearEnd}
                                                placeholder="To date"
                                                className="app-entry-date"
                                            />
                                        </div>
                                        <div>
                                            <AppCompactToggle
                                                inputId="invoice-register-cancelled-switch"
                                                checked={registerIncludeCancelled}
                                                onChange={setRegisterIncludeCancelled}
                                                onLabel="Cancelled"
                                                offLabel="Not cancelled"
                                            />
                                        </div>
                                        <div style={{ minWidth: '14rem' }}>
                                            <AppMultiSelect
                                                inputId="invoice-register-area-filter"
                                                value={registerAreaFilterIds}
                                                options={registerAreaOptions}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(event) => {
                                                    const nextIds = Array.isArray(event.value)
                                                        ? (event.value as number[]).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
                                                        : [];
                                                    setRegisterAreaFilterIds(nextIds);
                                                    setRegisterPartyFilter(null);
                                                }}
                                                filter
                                                loading={registerAreaLoading}
                                                className="w-14rem"
                                                placeholder={registerAreaLoading ? 'Loading areas...' : 'All areas'}
                                                maxSelectedLabels={1}
                                            />
                                        </div>
                                        <div style={{ minWidth: '12rem' }}>
                                            <LedgerGroupAutoComplete
                                                inputId="invoice-register-party-group-filter"
                                                value={registerPartyGroupFilter}
                                                options={registerPartyLedgerGroupOptions}
                                                onChange={(value) => {
                                                    setRegisterPartyGroupFilter(value);
                                                    setRegisterPartyFilter(null);
                                                }}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-party-filter')}
                                                className="w-12rem"
                                                placeholder="Party ledger group"
                                                dropdown
                                            />
                                        </div>
                                        <div style={{ minWidth: '12rem' }}>
                                            <LedgerAutoComplete
                                                variant="purpose"
                                                purpose="SALES"
                                                inputId="invoice-register-party-filter"
                                                value={registerPartyFilter}
                                                onChange={(value) => {
                                                    setRegisterPartyFilter(value);
                                                    setRegisterPartyFilterPreviewOption(null);
                                                }}
                                                onPreviewOptionChange={(option) => setRegisterPartyFilterPreviewOption(option)}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-product-brand-filter')}
                                                ledgerGroupId={registerPartyGroupFilter}
                                                areaIds={registerAreaFilterIds.length > 0 ? registerAreaFilterIds : null}
                                                options={registerDraftPartyLedgerLookupOptions}
                                                loading={registerDraftPartyLedgerLookupLoading}
                                                includeNone={false}
                                                className="w-12rem"
                                                placeholder="Select ledger"
                                                dropdown
                                            />
                                        </div>
                                        <div style={{ minWidth: '16rem' }}>
                                            <div className="app-notched-input__surface ledger-meta-address">
                                                <span className="text-700 text-sm">{registerSelectedDraftPartyLedgerAddress}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="invoice-register-filterbar__row invoice-register-filterbar__row--products">
                                        <div style={{ minWidth: '12rem' }}>
                                            <ProductBrandAutoComplete
                                                inputId="invoice-register-product-brand-filter"
                                                value={registerProductBrandFilter === 'all' ? '' : registerProductBrandFilter}
                                                options={registerProductBrandLookupOptions}
                                                onChange={(value) => {
                                                    setRegisterProductBrandFilter(value);
                                                    setRegisterProductFilter('all');
                                                    setRegisterProductAttributeFilter(null);
                                                }}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-product-group-filter')}
                                                className="w-12rem"
                                                placeholder="Product brand"
                                                dropdown
                                            />
                                        </div>
                                        <div style={{ minWidth: '12rem' }}>
                                            <ProductGroupAutoComplete
                                                inputId="invoice-register-product-group-filter"
                                                value={registerProductGroupFilter === 'all' ? '' : registerProductGroupFilter}
                                                options={registerProductGroupLookupOptions}
                                                onChange={(value) => {
                                                    setRegisterProductGroupFilter(value);
                                                    setRegisterProductBrandFilter('all');
                                                    setRegisterProductFilter('all');
                                                    setRegisterProductAttributeFilter(null);
                                                }}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-product-filter')}
                                                className="w-12rem"
                                                placeholder="Product group"
                                                dropdown
                                            />
                                        </div>
                                        <div style={{ minWidth: '12rem' }}>
                                            <ProductAutoComplete
                                                inputId="invoice-register-product-filter"
                                                value={registerProductFilter === 'all' ? '' : registerProductFilter}
                                                options={registerProductLookupOptions}
                                                onChange={(value) => {
                                                    setRegisterProductFilter(value);
                                                    setRegisterProductAttributeFilter(null);
                                                }}
                                                onEnterNext={() =>
                                                    focusRegisterFilterControl(
                                                        !registerCanFilterByProductAttribute
                                                            ? 'invoice-register-mrp-filter'
                                                            : 'invoice-register-product-attribute-filter'
                                                    )
                                                }
                                                className="w-12rem"
                                                placeholder="Select product"
                                                dropdown
                                            />
                                        </div>
                                        <div style={{ minWidth: '12rem' }}>
                                            <AppDropdown
                                                inputId="invoice-register-product-attribute-filter"
                                                value={registerProductAttributeFilter}
                                                options={registerSelectedProductAttributeOptions}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(event) => setRegisterProductAttributeFilter(event.value ?? null)}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-mrp-filter')}
                                                className="w-12rem"
                                                placeholder={
                                                    registerProductFilter === 'all'
                                                        ? 'Select product first'
                                                        : registerSelectedProductAttributeOptionsLoading
                                                            ? 'Loading attributes...'
                                                            : registerSelectedProductAttributeOptions.length > 0
                                                                ? 'All attributes'
                                                                : 'No attributes'
                                                }
                                                showClear
                                                disabled={!registerCanFilterByProductAttribute}
                                                loading={registerSelectedProductAttributeOptionsLoading}
                                            />
                                        </div>
                                        <div style={{ minWidth: '10rem' }}>
                                            <AppInput
                                                inputType="number"
                                                inputId="invoice-register-mrp-filter"
                                                value={registerMrpFilter}
                                                onValueChange={(event) => setRegisterMrpFilter(event.value ?? null)}
                                                onEnterNext={() => focusRegisterFilterControl('invoice-register-apply-filters')}
                                                min={0}
                                                minFractionDigits={0}
                                                maxFractionDigits={2}
                                                useGrouping={false}
                                                placeholder="MRP"
                                                className="w-10rem"
                                                inputClassName="w-10rem"
                                            />
                                        </div>
                                    </div>
                                    <div className="invoice-register-filterbar__row invoice-register-filterbar__row--actions">
                                        <div className="flex align-items-center gap-2">
                                            <Button
                                                id="invoice-register-apply-filters"
                                                label="Apply Filters"
                                                icon="pi pi-filter"
                                                className="app-action-compact"
                                                onClick={applyRegisterFilters}
                                                loading={registerApplyingFilters}
                                                disabled={registerApplyingFilters || !hasPendingRegisterFilterChanges}
                                            />
                                            <Button
                                                label="Reset Filters"
                                                text
                                                className="app-action-compact"
                                                onClick={resetRegisterFilters}
                                                disabled={registerApplyingFilters || !registerCanResetFilters}
                                            />
                                        </div>
                                        <small className="text-600">{registerFilterStatusText}</small>
                                    </div>
                                    {registerActionNotice ? (
                                        <Message severity="info" text={registerActionNotice} className="invoice-entry-header-shell__notice" />
                                    ) : null}
                                </div>
                                </>
                            }
                            headerRight={
                                <div className="invoice-register-actions-wrap">
                                <div className="invoice-register-actions">
                                    <div className="invoice-register-item-summary-toggles__item">
                                        <InputSwitch
                                            inputId="invoice-register-marking-mode-switch"
                                            checked={registerMarkingModeEnabled}
                                            onChange={(event) => setRegisterMarkingModeEnabled(!!event.value)}
                                            className="app-inputswitch invoice-register-item-toggle-switch"
                                        />
                                        <small>
                                            {registerMarkingModeEnabled ? 'Marking mode' : 'Free click mode'}
                                        </small>
                                    </div>
                                    <div className="invoice-register-item-summary-toggles__item">
                                        <InputSwitch
                                            inputId="invoice-register-paid-due-column-switch"
                                            checked={registerShowPaidDueColumn}
                                            onChange={(event) => setRegisterShowPaidDueColumn(!!event.value)}
                                            className="app-inputswitch invoice-register-item-toggle-switch"
                                        />
                                        <small>Paid / Due</small>
                                    </div>
                                    <div className="invoice-register-item-summary-toggles__item">
                                        <InputSwitch
                                            inputId="invoice-register-item-summary-panel-switch"
                                            checked={registerShowItemSummaryPanel}
                                            onChange={(event) => setRegisterShowItemSummaryPanel(!!event.value)}
                                            className="app-inputswitch invoice-register-item-toggle-switch"
                                        />
                                        <small>Item summary</small>
                                    </div>
                                    {registerSearch.trim() ? (
                                        <Button
                                            label="Clear Search"
                                            text
                                            className="app-action-compact"
                                            onClick={() => setRegisterSearch('')}
                                            disabled={loading}
                                        />
                                    ) : null}
                                    {registerMarkingModeEnabled && selectedRegisterInvoiceIds.length > 0 ? (
                                        <>
                                            <span className="invoice-register-selection-count text-600 text-sm">
                                                Selected: {selectedRegisterInvoiceIds.length}
                                            </span>
                                            <Button
                                                label="Clear Selection"
                                                text
                                                className="app-action-compact"
                                                onClick={() => setRegisterSelectedRows([])}
                                                disabled={loading || saving}
                                            />
                                        </>
                                    ) : null}
                                    <AppReportActions
                                        onRefresh={() => refreshRegister()}
                                        showRefresh
                                        onPrint={() => handleRegisterPrint('summary')}
                                        printMenuItems={registerPrintMenuItems}
                                        showPrint
                                        refreshDisabled={loading || saving}
                                        printDisabled={loading || saving || filteredSaleInvoices.length === 0}
                                        loadingState={loading}
                                    />
                                    <Button
                                        icon="pi pi-plus"
                                        label="New Invoice"
                                        className="app-action-compact"
                                        onClick={onOpenNew}
                                        disabled={loading || saving}
                                    />
                                </div>
                                </div>
                            }
                            recordSummary={`Showing ${filteredSaleInvoices.length} of ${saleInvoices.length}`}
                            emptyMessage={
                                registerSearch.trim() ||
                                (hasAppliedRegisterDateFilter && (appliedRegisterFromDate || appliedRegisterToDate)) ||
                                appliedRegisterIncludeCancelled ||
                                appliedRegisterPartyGroupFilter != null ||
                                appliedRegisterAreaFilterIds.length > 0 ||
                                appliedRegisterPartyFilter != null ||
                                appliedRegisterProductGroupFilter !== 'all' ||
                                appliedRegisterProductBrandFilter !== 'all' ||
                                appliedRegisterProductFilter !== 'all' ||
                                appliedRegisterProductAttributeFilter != null ||
                                appliedRegisterMrpFilter != null ||
                                appliedRegisterDeliveryStatusFilter != null ||
                                appliedRegisterPlaceOfSupplyFilter != null ||
                                appliedRegisterCustomerTypeFilter != null
                                    ? 'No invoices match your filters.'
                                    : 'No invoices found.'
                            }
                        >
                            {registerMarkingModeEnabled ? (
                                <Column selectionMode="multiple" style={{ width: '3rem' }} />
                            ) : null}
                            <Column
                                field="voucherNumber"
                                header={
                                    <div className="flex flex-column">
                                        {renderRegisterHeaderLineWithIcon('pi-hashtag', 'Invoice No.', 'primary')}
                                        {renderRegisterHeaderLineWithIcon('pi-calendar', 'Date', 'secondary')}
                                        {renderRegisterHeaderLineWithIcon('pi-link', 'Links', 'secondary')}
                                    </div>
                                }
                                sortable
                                body={renderRegisterDocumentCell}
                                filterElement={registerVoucherNumberColumnFilterElement}
                                headerClassName="invoice-register-text-header"
                                {...REGISTER_MULTISELECT_COLUMN_PROPS}
                                style={{ minWidth: '12rem' }}
                            />
                            <Column
                                field="ledgerName"
                                filterField="ledgerFilterDisplay"
                                header={
                                    <div className="flex flex-column">
                                        {renderRegisterHeaderLineWithIcon('pi-wallet', 'Party Ledger', 'primary')}
                                        {renderRegisterHeaderLineWithIcon('pi-sitemap', 'Group | Address', 'secondary')}
                                        {renderRegisterHeaderLineWithIcon('pi-comment', 'Remark | GSTIN', 'secondary')}
                                    </div>
                                }
                                sortable
                                body={renderRegisterPartyCell}
                                filterElement={registerPartyLedgerColumnFilterElement}
                                headerClassName="invoice-register-text-header"
                                {...REGISTER_MULTISELECT_COLUMN_PROPS}
                                style={{ minWidth: '12rem' }}
                            />
                            <Column
                                field="totalQpsDiscountAmount"
                                header={
                                    <div className="flex flex-column">
                                        {renderRegisterHeaderLineWithIcon('pi-percentage', 'QPS', 'primary')}
                                        {renderRegisterHeaderLineWithIcon('pi-tag', 'Pro Disc', 'secondary')}
                                        {renderRegisterHeaderLineWithIcon('pi-wallet', 'Cash Disc', 'secondary')}
                                    </div>
                                }
                                body={renderRegisterDiscountCell}
                                headerClassName="invoice-register-text-header invoice-register-number-header"
                                bodyClassName="invoice-register-cell--numeric"
                                style={{ minWidth: '6rem' }}
                            />
                            <Column
                            field="totalGrossAmount"
                                header={
                                    <div className="flex flex-column">
                                        {renderRegisterHeaderLineWithIcon('pi-wallet', 'Gross Amt', 'primary')}
                                        {renderRegisterHeaderLineWithIcon('pi-calculator', 'Taxation', 'secondary')}
                                        {renderRegisterHeaderLineWithIcon('pi-minus-circle', 'R-Off', 'secondary')}
                                    </div>
                                }
                                sortable
                                body={renderRegisterGrossTaxRoundCell}
                                headerClassName="invoice-register-text-header invoice-register-number-header"
                                bodyClassName="invoice-register-cell--numeric"
                                style={{ minWidth: '10rem' }}
                            />
                            <Column
                                field="totalNetAmount"
                                filterField="totalNetAmountDisplay"
                                header={renderLabelWithIcon('pi-chart-line', 'Net Amt')}
                                sortable
                                body={renderRegisterNetCell}
                                filterElement={registerNetAmountColumnFilterElement}
                                headerClassName="invoice-register-text-header invoice-register-number-header"
                                bodyClassName="invoice-register-cell--numeric"
                                {...REGISTER_MULTISELECT_COLUMN_PROPS}
                                style={{ minWidth: '9rem' }}
                            />
                            {registerShowPaidDueColumn ? (
                                <Column
                                    field="paidAmount"
                                    header={renderStackedHeader('Paid / Due', 'Cash / Bank / CN / Adj / Ret', 'pi-check-square', 'pi-credit-card')}
                                    body={renderRegisterSettlementCell}
                                    headerClassName="invoice-register-text-header"
                                    style={{ minWidth: '10.5rem' }}
                                />
                            ) : null}
                            <Column
                                field="registerStatusLabel"
                                header={renderLabelWithIcon('pi-lock', 'Status')}
                                body={renderRegisterStatusCell}
                                filterElement={registerStatusColumnFilterElement}
                                headerClassName="invoice-register-text-header"
                                {...REGISTER_MULTISELECT_COLUMN_PROPS}
                                style={{ minWidth: '8.5rem' }}
                            />
                            <Column
                                header={renderLabelWithIcon('pi-cog', 'Actions')}
                                body={(row: SaleInvoiceListItem) => {
                                    if (isRegisterTotalsRow(row)) return null;
                                    const saleInvoiceId = Number(row.saleInvoiceId);
                                    const dueAmount = Number(row.dueAmount || 0);
                                    const isSendingDueSms = sendingDueSmsInvoiceId === saleInvoiceId;
                                    const isSendingWhatsApp = sendingWhatsAppInvoiceId === saleInvoiceId;
                                    const canSendDueSms = Number.isFinite(saleInvoiceId)
                                        && saleInvoiceId > 0
                                        && !saving
                                        && !row.isCancelled
                                        && dueAmount > FINANCIAL_EPSILON;
                                    const canSendInvoiceWhatsApp = Number.isFinite(saleInvoiceId)
                                        && saleInvoiceId > 0
                                        && !saving
                                        && !row.isCancelled;

                                    return (
                                        <div className="flex align-items-center gap-1">
                                            <Button
                                                icon="pi pi-eye"
                                                text
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openRegisterViewDialog(row);
                                                }}
                                                aria-label={`View invoice ${row.voucherNumber || row.saleInvoiceId}`}
                                                disabled={saving}
                                            />
                                            <Button
                                                icon="pi pi-print"
                                                text
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleRowInvoicePrint(row);
                                                }}
                                                aria-label={`Print invoice ${row.voucherNumber || row.saleInvoiceId}`}
                                                disabled={saving}
                                            />
                                            <Button
                                                icon="pi pi-comments"
                                                text
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void onSendInvoiceWhatsApp(saleInvoiceId);
                                                }}
                                                aria-label={`Send WhatsApp message for invoice ${row.voucherNumber || row.saleInvoiceId}`}
                                                disabled={!canSendInvoiceWhatsApp || isSendingWhatsApp}
                                                loading={isSendingWhatsApp}
                                            />
                                            <Button
                                                icon="pi pi-send"
                                                text
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void onSendDueSms(saleInvoiceId);
                                                }}
                                                aria-label={`Send due reminder SMS for invoice ${row.voucherNumber || row.saleInvoiceId}`}
                                                disabled={!canSendDueSms || isSendingDueSms}
                                                loading={isSendingDueSms}
                                            />
                                            <Button
                                                icon="pi pi-pencil"
                                                text
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onOpenEdit(saleInvoiceId);
                                                }}
                                                aria-label={`Edit invoice ${row.saleInvoiceId}`}
                                                disabled={saving}
                                            />
                                        </div>
                                    );
                                }}
                                headerClassName="invoice-register-text-header"
                                style={{ width: '11rem' }}
                            />
                        </AppDataTable>
                    </div>
                    {registerShowItemSummaryPanel && registerDockRow && registerDockViewportStyle ? (
                        <div className={`invoice-register-detail-dock invoice-register-detail-dock--fixed${registerDockResizing ? ' invoice-register-detail-dock--resizing' : ''}${registerDockCollapsed ? ' invoice-register-detail-dock--collapsed' : ''}`} style={registerDockStyle} aria-live="polite">
                            <div className="invoice-register-detail-dock__content" style={registerDockContentStyle}>
                                {!registerDockCollapsed ? (
                                    <div
                                        className="invoice-register-detail-dock__resize-handle"
                                        onMouseDown={handleRegisterDockResizeStart}
                                        role="separator"
                                        aria-orientation="horizontal"
                                        aria-label="Resize item summary panel"
                                        title="Drag up or down to resize"
                                    >
                                        <span className="invoice-register-detail-dock__resize-grip" />
                                    </div>
                                ) : null}
                                <div className="invoice-register-detail-dock__summary">
                                    <span className="invoice-register-detail-dock__summary-item">
                                        <strong>{registerDockRow.voucherNumber || '-'}</strong>
                                        <small>{formatVoucherDate(registerDockRow.voucherDateText)}</small>
                                    </span>
                                    <span className="invoice-register-detail-dock__summary-item">
                                        {normalizeDisplayText(registerDockRow.ledgerName)
                                            || normalizeDisplayText(
                                                registerDockRow.ledgerId != null
                                                    ? ledgerById.get(Number(registerDockRow.ledgerId))?.name
                                                    : null
                                            )
                                            || '-'}
                                    </span>
                                    <span className="invoice-register-detail-dock__summary-item">
                                        Net: {formatAmount(toAmountNumber(registerDockRow.totalNetAmount))}
                                    </span>
                                    <span className="invoice-register-detail-dock__summary-item">
                                        Due: {formatAmount(toAmountNumber(registerDockRow.dueAmount))}
                                    </span>
                                    <div className="invoice-register-detail-dock__summary-controls">
                                        <Button
                                            icon={registerDockCollapsed ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
                                            text
                                            rounded
                                            className="app-action-compact p-button-sm"
                                            onClick={() => setRegisterDockCollapsed((previous) => !previous)}
                                            aria-label={registerDockCollapsed ? 'Expand item summary' : 'Collapse item summary'}
                                            title={registerDockCollapsed ? 'Expand item summary' : 'Collapse item summary'}
                                        />
                                    </div>
                                </div>
                                {!registerDockCollapsed ? renderRegisterItemSummaryExpansion(registerDockRow, 'dock') : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            <Dialog
                visible={registerViewInvoiceId != null}
                onHide={closeRegisterViewDialog}
                header={registerViewRow ? `Invoice ${registerViewRow.voucherNumber || registerViewRow.saleInvoiceId}` : 'Invoice View'}
                style={{ width: 'min(1120px, 96vw)' }}
                className="invoice-register-view-dialog"
                modal
                maximizable
            >
                {registerViewRow ? (
                    <div className="invoice-register-view-content flex flex-column gap-3">
                        <div className="invoice-register-view-content__meta grid">
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Invoice No.</small>
                                <div className="invoice-register-view-content__value">
                                    {registerViewRow.voucherNumber || '-'}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Date</small>
                                <div className="invoice-register-view-content__value">
                                    {formatVoucherDate(registerViewRow.voucherDateText)}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Party Ledger</small>
                                <div className="invoice-register-view-content__value">
                                    {normalizeDisplayText(registerViewRow.ledgerName)
                                        || normalizeDisplayText(
                                            registerViewRow.ledgerId != null
                                                ? ledgerById.get(Number(registerViewRow.ledgerId))?.name
                                                : null
                                        )
                                        || '-'}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Address</small>
                                <div className="invoice-register-view-content__value">
                                    {normalizeDisplayText(registerViewRow.ledgerAddress)
                                        || normalizeDisplayText(
                                            registerViewRow.ledgerId != null
                                                ? ledgerById.get(Number(registerViewRow.ledgerId))?.address
                                                : null
                                        )
                                        || '-'}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Delivery Status</small>
                                <div className="invoice-register-view-content__value">
                                    {normalizeDisplayText(registerViewRow.deliveryStatus) || 'Pending'}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Net Amount</small>
                                <div className="invoice-register-view-content__value">
                                    {formatAmount(toAmountNumber(registerViewRow.totalNetAmount))}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Paid Amount</small>
                                <div className="invoice-register-view-content__value">
                                    {formatAmount(toAmountNumber(registerViewRow.paidAmount))}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-3">
                                <small className="invoice-register-view-content__label">Due Amount</small>
                                <div className="invoice-register-view-content__value">
                                    {formatAmount(toAmountNumber(registerViewRow.dueAmount))}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-6">
                                <small className="invoice-register-view-content__label">Cash Receipt Ref</small>
                                <div className="invoice-register-view-content__value">
                                    {resolveRegisterReceiptReferenceText(
                                        'Cash',
                                        registerViewRow.cashReceiptNumbers,
                                        registerViewRow.cashReceiptDates
                                    ) || '-'}
                                </div>
                            </div>
                            <div className="col-12 sm:col-6 lg:col-6">
                                <small className="invoice-register-view-content__label">Bank Receipt Ref</small>
                                <div className="invoice-register-view-content__value">
                                    {resolveRegisterReceiptReferenceText(
                                        'Bank',
                                        registerViewRow.bankReceiptNumbers,
                                        registerViewRow.bankReceiptDates
                                    ) || '-'}
                                </div>
                            </div>
                        </div>
                        {renderRegisterItemSummaryExpansion(registerViewRow, 'dialog')}
                    </div>
                ) : (
                    <Message severity="info" text="Invoice not found." />
                )}
            </Dialog>

        </div>
    );
}










