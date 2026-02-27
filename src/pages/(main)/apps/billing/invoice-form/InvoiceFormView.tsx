import React from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import AppDateInput from '@/components/AppDateInput';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppReportActions from '@/components/AppReportActions';
import { ReportHeader } from '@/components/ReportHeader';
import { ReportRegisterSearch } from '@/components/ReportRegisterSearch';
import type { DebitNoteLookupItem, EstimateLookupItem, SaleInvoiceListItem, SalesReturnBookRow } from '@/lib/invoicing/api';
import { formatAmount, formatVoucherDate } from '../helpers';
import type { LedgerOption, LedgerSummary } from '../useLedgerLookup';
import { InvoiceAdditionalTaxationSection } from './components/InvoiceAdditionalTaxationSection';
import { InvoiceHeaderSection } from './components/InvoiceHeaderSection';
import { InvoiceLinesTable } from './components/InvoiceLinesTable';
import { InvoiceTypeDetailsSection } from './components/InvoiceTypeDetailsSection';
import { InvoiceTotalsPanel } from './components/InvoiceTotalsPanel';
import { PhaseOneWarningDialog } from './components/PhaseOneWarningDialog';
import type {
    InvoiceAdditionalTaxationDraft,
    InvoiceComputation,
    InvoiceFormRouteView,
    InvoiceHeaderDraft,
    InvoiceLineDraft,
    InvoiceProduct,
    InvoiceProductAttributeOption,
    InvoiceTypeDetailDraft,
    LineInventoryDraft,
    TaxSummaryRow,
    WarehouseOption
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

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
    ledgerGroupId?: number | null;
    taxRate: number;
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

type RegisterMetricTone = 'default' | 'info' | 'positive' | 'warning' | 'danger';

type RegisterMetric = {
    label: string;
    value: number | null | undefined;
    tone?: RegisterMetricTone;
};

type RegisterDefaultDateRange = {
    fromDate: Date | null;
    toDate: Date | null;
};

const resolveRegisterDefaultDateRange = (args: {
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
    ledgerOptions: LedgerOption[];
    ledgerById: Map<number, LedgerSummary>;
    ledgerLoading: boolean;
    products: InvoiceProduct[];
    productOptions: Option[];
    mrpOptionsByProductId: Record<number, Option[]>;
    unitOptions: Option[];
    taxLedgerOptions: TaxLedgerOption[];
    warehouseOptions: WarehouseOption[];
    computation: InvoiceComputation;
    taxSummaryRows: TaxSummaryRow[];
    additionalTaxations: InvoiceAdditionalTaxationDraft[];
    totalAdditionalTaxAmount: number;
    typeDetails: InvoiceTypeDetailDraft[];
    typeDetailOptionsByType: Record<number, InvoiceProductAttributeOption[]>;
    typeDetailOptionsLoading: boolean;
    headerErrors: string[];
    lineErrorsByKey: Record<string, string[]>;
    inventoryStatusByLineKey: Record<string, 'saved' | 'pending'>;
    pendingInventoryCount: number;
    canSave: boolean;
    hasPreservedDetails: boolean;
    phaseOneWarningVisible: boolean;
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
    onRefresh: () => void;
    onOpenNew: () => void;
    onOpenEdit: (saleInvoiceId: number) => void;
    onDeleteInvoice: (saleInvoiceId: number) => Promise<void> | void;
    onCancelEntry: () => void;
    onHeaderChange: (patch: Partial<InvoiceHeaderDraft>) => void;
    onSelectProduct: (lineKey: string, productId: number | null) => void;
    onSelectMrp: (lineKey: string, mrp: number | null) => void;
    onLineChange: (lineKey: string, patch: Partial<InvoiceLineDraft>) => void;
    onInventoryChange: (lineKey: string, patch: Partial<LineInventoryDraft>) => void;
    onDeleteLine: (lineKey: string) => void;
    onDuplicateLine: (lineKey: string) => void;
    onAddLine: () => void;
    onAddTypeDetail: () => void;
    onChangeTypeDetail: (lineKey: string, patch: Partial<InvoiceTypeDetailDraft>) => void;
    onDeleteTypeDetail: (lineKey: string) => void;
    onAddAdditionalTaxation: () => void;
    onChangeAdditionalTaxation: (lineKey: string, patch: Partial<InvoiceAdditionalTaxationDraft>) => void;
    onDeleteAdditionalTaxation: (lineKey: string) => void;
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
    onCancelPhaseOneWarning: () => void;
    onConfirmPhaseOneWarning: () => void;
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
    taxLedgerOptions,
    warehouseOptions,
    computation,
    taxSummaryRows,
    additionalTaxations,
    totalAdditionalTaxAmount,
    typeDetails,
    typeDetailOptionsByType,
    typeDetailOptionsLoading,
    headerErrors,
    lineErrorsByKey,
    inventoryStatusByLineKey,
    pendingInventoryCount,
    canSave,
    hasPreservedDetails,
    phaseOneWarningVisible,
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
    onCancelEntry,
    onHeaderChange,
    onSelectProduct,
    onSelectMrp,
    onLineChange,
    onInventoryChange,
    onDeleteLine,
    onDuplicateLine,
    onAddLine,
    onAddTypeDetail,
    onChangeTypeDetail,
    onDeleteTypeDetail,
    onAddAdditionalTaxation,
    onChangeAdditionalTaxation,
    onDeleteAdditionalTaxation,
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
    onAppendDebitNoteFromLookup,
    onCancelPhaseOneWarning,
    onConfirmPhaseOneWarning
}: InvoiceFormViewProps) {
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
    const [registerSearch, setRegisterSearch] = React.useState('');
    const [typeDetailsDialogVisible, setTypeDetailsDialogVisible] = React.useState(false);
    const [additionalTaxationDialogVisible, setAdditionalTaxationDialogVisible] = React.useState(false);
    const [estimateSearch, setEstimateSearch] = React.useState('');
    const [creditNoteLookupSearch, setCreditNoteLookupSearch] = React.useState('');
    const [debitNoteLookupSearch, setDebitNoteLookupSearch] = React.useState('');
    const [showTaxColumns, setShowTaxColumns] = React.useState(true);
    const [printSchemeEnabled, setPrintSchemeEnabled] = React.useState(true);
    const [printLedgerEnabled, setPrintLedgerEnabled] = React.useState(false);
    const [entryJumpFromDate, setEntryJumpFromDate] = React.useState<Date | null>(null);
    const [entryJumpToDate, setEntryJumpToDate] = React.useState<Date | null>(null);
    const [registerFromDate, setRegisterFromDate] = React.useState<Date | null>(defaultRegisterDateRange.fromDate);
    const [registerToDate, setRegisterToDate] = React.useState<Date | null>(defaultRegisterDateRange.toDate);
    const [registerIncludeCancelled, setRegisterIncludeCancelled] = React.useState(false);
    const [registerPartyGroupFilter, setRegisterPartyGroupFilter] = React.useState('all');
    const [registerPartyFilter, setRegisterPartyFilter] = React.useState('all');
    const [registerProductGroupFilter, setRegisterProductGroupFilter] = React.useState('all');
    const [registerProductBrandFilter, setRegisterProductBrandFilter] = React.useState('all');
    const [registerProductFilter, setRegisterProductFilter] = React.useState('all');
    const [registerDeliveryStatusFilter, setRegisterDeliveryStatusFilter] = React.useState('all');
    const [registerPlaceOfSupplyFilter, setRegisterPlaceOfSupplyFilter] = React.useState('all');
    const [registerCustomerTypeFilter, setRegisterCustomerTypeFilter] = React.useState('all');
    const [registerDisputedOnly, setRegisterDisputedOnly] = React.useState(false);
    const [registerLinkedOnly, setRegisterLinkedOnly] = React.useState(false);
    const [registerSearchMatchCase, setRegisterSearchMatchCase] = React.useState(false);
    const [registerSearchWholeWord, setRegisterSearchWholeWord] = React.useState(false);
    const [footerUtilityNotice, setFooterUtilityNotice] = React.useState<string | null>(null);
    const previousDefaultRegisterDateRangeKeyRef = React.useRef(defaultRegisterDateRangeKey);

    React.useEffect(() => {
        if (isEntryView) return;
        setEntryJumpFromDate(null);
        setEntryJumpToDate(null);
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

    const registerPartyGroupOptions = React.useMemo(
        () => buildNamedFilterOptions(saleInvoices.map((row) => row.ledgerGroupName)),
        [saleInvoices]
    );
    const registerPartyOptions = React.useMemo(
        () => buildNamedFilterOptions(saleInvoices.map((row) => row.ledgerName)),
        [saleInvoices]
    );
    const registerProductGroupOptions = React.useMemo(
        () => buildNamedFilterOptions(saleInvoices.flatMap((row) => row.productGroupNames ?? [])),
        [saleInvoices]
    );
    const registerProductBrandOptions = React.useMemo(
        () => buildNamedFilterOptions(saleInvoices.flatMap((row) => row.productBrandNames ?? [])),
        [saleInvoices]
    );
    const registerProductOptions = React.useMemo(
        () => buildNamedFilterOptions(saleInvoices.flatMap((row) => row.productNames ?? [])),
        [saleInvoices]
    );
    const registerDeliveryStatusOptions = React.useMemo(
        () => buildNamedFilterOptions(saleInvoices.map((row) => row.deliveryStatus ?? 'Pending')),
        [saleInvoices]
    );
    const registerPlaceOfSupplyOptions = React.useMemo<RegisterFilterOption[]>(
        () => [
            { label: 'All', value: 'all' },
            { label: 'Intra-State (Own State)', value: 'intra_state' },
            { label: 'Inter-State (Other State)', value: 'inter_state' }
        ],
        []
    );
    const registerCustomerTypeOptions = React.useMemo<RegisterFilterOption[]>(
        () => [
            { label: 'All', value: 'all' },
            { label: 'B2B (GST Registered)', value: 'b2b' },
            { label: 'B2C (Unregistered)', value: 'b2c' }
        ],
        []
    );

    const filteredSaleInvoices = React.useMemo(() => {
        const query = registerSearch.trim();
        const normalizedQuery = registerSearchMatchCase ? query : query.toLowerCase();
        const wholeWordPattern =
            query && registerSearchWholeWord
                ? new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(query)}(?=$|[^A-Za-z0-9])`, registerSearchMatchCase ? '' : 'i')
                : null;
        const fromDateKey = toDateDayKey(registerFromDate);
        const toDateKey = toDateDayKey(registerToDate);
        return saleInvoices.filter((row) => {
            const idText = String(row.saleInvoiceId ?? '');
            const voucherText = row.voucherNumber ?? '';
            const partyText = row.ledgerName ?? '';
            const groupText = row.ledgerGroupName ?? '';
            const remarkText = row.remarks ?? '';
            const dateText = formatVoucherDate(row.voucherDateText);
            const amountText = formatAmount(Number(row.totalAmount || 0));
            const taxText = formatAmount(Number(row.totalTaxAmount || 0));
            const grossText = formatAmount(Number(row.totalGrossAmount || 0));
            const finalText = formatAmount(Number(row.totalFinalAmount || 0));
            const cashReceiptText = formatAmount(Number(row.cashReceiptAmount || 0));
            const bankReceiptText = formatAmount(Number(row.bankReceiptAmount || 0));
            const paidText = formatAmount(Number(row.paidAmount || 0));
            const dueText = formatAmount(Number(row.dueAmount || 0));
            const totalText = formatAmount(Number(row.totalNetAmount || 0));
            const voucherDate = parseVoucherDateText(row.voucherDateText);
            const voucherDateKey = toDateDayKey(voucherDate);
            const normalizedPartyGroup = normalizeFilterValue(row.ledgerGroupName);
            const normalizedParty = normalizeFilterValue(row.ledgerName);
            const normalizedDeliveryStatus = normalizeFilterValue(row.deliveryStatus ?? 'Pending');
            const normalizedProductGroups = (row.productGroupNames ?? []).map((value) => normalizeFilterValue(value));
            const normalizedProductBrands = (row.productBrandNames ?? []).map((value) => normalizeFilterValue(value));
            const normalizedProducts = (row.productNames ?? []).map((value) => normalizeFilterValue(value));
            const placeOfSupply = row.isOtherState ? 'inter_state' : 'intra_state';
            const customerType = row.hasLedgerGst ? 'b2b' : 'b2c';
            const hasLinkedDocs =
                (row.estimateId != null && Number(row.estimateId) > 0) ||
                Number(row.linkedCreditNoteCount ?? 0) > 0 ||
                Number(row.linkedDebitNoteCount ?? 0) > 0;

            if (!registerIncludeCancelled && row.isCancelled) return false;
            if (registerPartyGroupFilter !== 'all' && normalizedPartyGroup !== registerPartyGroupFilter) return false;
            if (registerPartyFilter !== 'all' && normalizedParty !== registerPartyFilter) return false;
            if (registerProductGroupFilter !== 'all' && !normalizedProductGroups.includes(registerProductGroupFilter)) return false;
            if (registerProductBrandFilter !== 'all' && !normalizedProductBrands.includes(registerProductBrandFilter)) return false;
            if (registerProductFilter !== 'all' && !normalizedProducts.includes(registerProductFilter)) return false;
            if (registerDeliveryStatusFilter !== 'all' && normalizedDeliveryStatus !== registerDeliveryStatusFilter) return false;
            if (registerPlaceOfSupplyFilter !== 'all' && placeOfSupply !== registerPlaceOfSupplyFilter) return false;
            if (registerCustomerTypeFilter !== 'all' && customerType !== registerCustomerTypeFilter) return false;
            if (registerDisputedOnly && !row.isDisputed) return false;
            if (registerLinkedOnly && !hasLinkedDocs) return false;
            if (fromDateKey != null && (voucherDateKey == null || voucherDateKey < fromDateKey)) return false;
            if (toDateKey != null && (voucherDateKey == null || voucherDateKey > toDateKey)) return false;
            if (!query) return true;

            const searchableText = [
                idText,
                voucherText,
                partyText,
                groupText,
                remarkText,
                dateText,
                amountText,
                taxText,
                grossText,
                finalText,
                row.deliveryStatus ?? 'Pending',
                row.isOtherState ? 'Inter-State Other State' : 'Intra-State Own State',
                row.hasLedgerGst ? 'B2B GST Registered' : 'B2C Unregistered',
                cashReceiptText,
                bankReceiptText,
                paidText,
                dueText,
                totalText,
                ...(row.productGroupNames ?? []),
                ...(row.productBrandNames ?? []),
                ...(row.productNames ?? [])
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
        registerFromDate,
        registerToDate,
        registerIncludeCancelled,
        registerPartyGroupFilter,
        registerPartyFilter,
        registerProductGroupFilter,
        registerProductBrandFilter,
        registerProductFilter,
        registerDeliveryStatusFilter,
        registerPlaceOfSupplyFilter,
        registerCustomerTypeFilter,
        registerDisputedOnly,
        registerLinkedOnly,
        saleInvoices
    ]);

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

    const resetRegisterFilters = React.useCallback(() => {
        setRegisterFromDate(null);
        setRegisterToDate(null);
        setRegisterIncludeCancelled(false);
        setRegisterPartyGroupFilter('all');
        setRegisterPartyFilter('all');
        setRegisterProductGroupFilter('all');
        setRegisterProductBrandFilter('all');
        setRegisterProductFilter('all');
        setRegisterDeliveryStatusFilter('all');
        setRegisterPlaceOfSupplyFilter('all');
        setRegisterCustomerTypeFilter('all');
        setRegisterDisputedOnly(false);
        setRegisterLinkedOnly(false);
    }, []);

    const handlePrintEntry = React.useCallback(() => {
        if (typeof window === 'undefined') return;
        setFooterUtilityNotice(
            `Print preferences: Scheme ${printSchemeEnabled ? 'On' : 'Off'}, Ledger ${printLedgerEnabled ? 'On' : 'Off'}.`
        );
        window.print();
    }, [printLedgerEnabled, printSchemeEnabled]);

    const handleCopyEntry = React.useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
            setFooterUtilityNotice('Copy failed: clipboard access is unavailable.');
            return;
        }
        const invoiceNo = header.voucherNumber?.trim() || '-';
        const invoiceDate = header.voucherDate
            ? `${String(header.voucherDate.getDate()).padStart(2, '0')}/${String(header.voucherDate.getMonth() + 1).padStart(
                  2,
                  '0'
              )}/${header.voucherDate.getFullYear()}`
            : '-';
        const party = header.partyName?.trim() || '-';
        const linesCount = computation.lines.length;
        const netAmount = formatAmount(computation.totals.totalNetAmount);
        const text = `Invoice No: ${invoiceNo}\nDate: ${invoiceDate}\nParty: ${party}\nLines: ${linesCount}\nNet Amount: ${netAmount}\nPrint Scheme: ${
            printSchemeEnabled ? 'Yes' : 'No'
        }\nPrint Ledger: ${printLedgerEnabled ? 'Yes' : 'No'}`;
        try {
            await navigator.clipboard.writeText(text);
            setFooterUtilityNotice('Invoice summary copied to clipboard.');
        } catch {
            setFooterUtilityNotice('Copy failed: unable to write to clipboard.');
        }
    }, [
        computation.lines.length,
        computation.totals.totalNetAmount,
        header.partyName,
        header.voucherDate,
        header.voucherNumber,
        printLedgerEnabled,
        printSchemeEnabled
    ]);

    const handleRegisterShortcutKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
        const key = event.key.toLowerCase();
        if (key !== 'f11') return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof document === 'undefined') return;
        const input =
            (document.getElementById('invoice-register-search-input') as HTMLInputElement | null) ??
            (document.querySelector('.invoice-register-report-search .app-register-search__input') as HTMLInputElement | null);
        input?.focus();
        input?.select();
    }, []);

    const handleEntryShortcutKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            if (!isEntryView || saving || loadingInvoice) return;
            const key = event.key.toLowerCase();
            const hasSaveModifier = event.ctrlKey || event.metaKey;

            if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                if (key === 'f2') {
                    event.preventDefault();
                    event.stopPropagation();
                    onRequestSave();
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

            if (!hasSaveModifier || event.altKey || event.shiftKey) return;
            if (key === 's') {
                event.preventDefault();
                event.stopPropagation();
                onRequestSave();
                return;
            }

            if (key === 'enter' && !isEditView) {
                event.preventDefault();
                event.stopPropagation();
                onRequestSaveAndAddNew();
            }
        },
        [
            isEditView,
            isEntryView,
            loadingInvoice,
            onAddLine,
            onCancelEntry,
            onRequestSave,
            onRequestSaveAndAddNew,
            saving
        ]
    );

    const showLegacyPreservedNotice = isEditView && hasPreservedDetails;
    const entryJumpFromDateKey = toDateDayKey(entryJumpFromDate);
    const entryJumpToDateKey = toDateDayKey(entryJumpToDate);
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
        return quickJumpSourceRows
            .map((row) => {
                const saleInvoiceId = Number(row.saleInvoiceId);
                if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0 || seen.has(saleInvoiceId)) return null;
                seen.add(saleInvoiceId);
                const voucherNumber = row.voucherNumber?.trim() || '';
                const voucherDate = formatVoucherDate(row.voucherDateText);
                const ledgerName = row.ledgerName?.trim() || '';
                const labelParts = [`#${saleInvoiceId}`];
                if (voucherNumber) labelParts.push(voucherNumber);
                if (voucherDate && voucherDate !== '-') labelParts.push(voucherDate);
                if (ledgerName) labelParts.push(ledgerName);
                return {
                    label: labelParts.join(' • '),
                    value: saleInvoiceId,
                    searchText: `${saleInvoiceId} ${voucherNumber} ${voucherDate} ${ledgerName}`.toLowerCase()
                } satisfies Option;
            })
            .filter((option): option is Option => option != null)
            .sort((a, b) => a.value - b.value);
    }, [quickJumpSourceRows]);
    const quickJumpInvoiceId = isEditView ? editingSaleInvoiceId : null;
    const clearEntryJumpRange = React.useCallback(() => {
        setEntryJumpFromDate(null);
        setEntryJumpToDate(null);
    }, []);
    const handleQuickJumpInvoice = React.useCallback(
        (nextValue: number | null | undefined) => {
            const nextInvoiceId = nextValue != null ? Number(nextValue) : null;
            if (nextInvoiceId == null || !Number.isFinite(nextInvoiceId) || nextInvoiceId <= 0) return;
            onOpenEdit(nextInvoiceId);
        },
        [onOpenEdit]
    );

    const confirmDeleteInvoice = React.useCallback((saleInvoiceId: number) => {
        if (typeof window === 'undefined') return true;
        return window.confirm(
            `Delete invoice #${saleInvoiceId}? This action marks the invoice as cancelled.`
        );
    }, []);

    const resolveRegisterRowClassName = React.useCallback((row: SaleInvoiceListItem) => {
        const dueAmount = Number(row.dueAmount || 0);
        if (row.isCancelled) return 'invoice-register-row--cancelled';
        if (dueAmount > 0) return 'invoice-register-row--due';
        return '';
    }, []);

    const renderRegisterMetricGrid = React.useCallback(
        (metrics: RegisterMetric[]) => (
            <div className="invoice-register-metrics-grid">
                {metrics.map((metric) => (
                    <div
                        key={metric.label}
                        className={`invoice-register-metric invoice-register-metric--${metric.tone ?? 'default'}`}
                    >
                        <span className="invoice-register-metric__label">{metric.label}</span>
                        <span className="invoice-register-metric__value">{formatAmount(Number(metric.value || 0))}</span>
                    </div>
                ))}
            </div>
        ),
        []
    );

    const renderRegisterDocumentCell = React.useCallback(
        (row: SaleInvoiceListItem) => (
            <div className="invoice-register-cell-stack">
                <div className="invoice-register-cell-title invoice-register-cell-title--mono">{row.voucherNumber || '-'}</div>
                <small className="invoice-register-cell-muted">{formatVoucherDate(row.voucherDateText)}</small>
            </div>
        ),
        []
    );

    const renderRegisterPartyCell = React.useCallback(
        (row: SaleInvoiceListItem) => (
            <div className="invoice-register-cell-stack">
                <div className="invoice-register-cell-title" title={row.ledgerName || undefined}>
                    {row.ledgerName || '-'}
                </div>
                <small className="invoice-register-cell-muted" title={row.ledgerGroupName || undefined}>
                    {row.ledgerGroupName || '-'}
                </small>
                <small
                    className="invoice-register-cell-muted invoice-register-cell-muted--ellipsis"
                    title={row.remarks || undefined}
                >
                    {row.remarks || 'No remark'}
                </small>
            </div>
        ),
        []
    );

    const renderRegisterValueCell = React.useCallback(
        (row: SaleInvoiceListItem) =>
            renderRegisterMetricGrid([
                { label: 'Amount', value: row.totalAmount },
                { label: 'Tax', value: row.totalTaxAmount, tone: 'info' },
                { label: 'Final', value: row.totalFinalAmount },
                { label: 'Net', value: row.totalNetAmount, tone: 'positive' }
            ]),
        [renderRegisterMetricGrid]
    );

    const renderRegisterSettlementCell = React.useCallback(
        (row: SaleInvoiceListItem) => {
            const dueAmount = Number(row.dueAmount || 0);
            const paidAmount = Number(row.paidAmount || 0);
            return renderRegisterMetricGrid([
                { label: 'Cash Rcpt', value: row.cashReceiptAmount },
                { label: 'Bank Rcpt', value: row.bankReceiptAmount },
                { label: 'Paid', value: paidAmount, tone: paidAmount > 0 ? 'positive' : 'default' },
                { label: 'Due', value: dueAmount, tone: dueAmount > 0 ? 'danger' : 'positive' }
            ]);
        },
        [renderRegisterMetricGrid]
    );

    const renderRegisterStatusLinksCell = React.useCallback((row: SaleInvoiceListItem) => {
        const linkedCreditNoteCount = Number(row.linkedCreditNoteCount || 0);
        const linkedDebitNoteCount = Number(row.linkedDebitNoteCount || 0);
        const hasLinkedDocs = (row.estimateId != null && Number(row.estimateId) > 0) || linkedCreditNoteCount > 0 || linkedDebitNoteCount > 0;
        return (
            <div className="invoice-register-cell-stack">
                <div className="invoice-register-chip-row">
                    {row.isCancelled ? (
                        <span className="invoice-form-status-chip invoice-form-status-chip--danger">Cancelled</span>
                    ) : (
                        <span className="invoice-form-status-chip invoice-form-status-chip--mode">Active</span>
                    )}
                    {row.isDisputed ? (
                        <span className="invoice-form-status-chip invoice-form-status-chip--warning">Disputed</span>
                    ) : null}
                    {row.isChecked ? (
                        <span className="invoice-form-status-chip invoice-form-status-chip--positive">Checked</span>
                    ) : null}
                    {hasLinkedDocs ? (
                        <span className="invoice-form-status-chip invoice-form-status-chip--info">Linked</span>
                    ) : null}
                </div>
                <div className="invoice-register-links-grid">
                    <small>Est: {row.estimateId ?? '-'}</small>
                    <small>CN: {linkedCreditNoteCount}</small>
                    <small>DN: {linkedDebitNoteCount}</small>
                </div>
            </div>
        );
    }, []);

    return (
        <div className="cash-exp-split invoice-form-layout">
            {isEntryView ? (
                <div className="flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
                <div className="flex flex-column gap-1">
                        <h2 className="m-0">GST Sales Invoice</h2>
                        <p className="text-600 m-0">
                            {isEditView
                                ? 'Edit GST sales invoice in dedicated entry page.'
                                : 'Create GST sales invoice in dedicated entry page.'}
                        </p>
                    </div>
                    <div className="app-workspace-toolbar flex align-items-center justify-content-end gap-2 flex-wrap ml-auto">
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
                            <span className="invoice-entry-quick-jump__label">Invoice No</span>
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
                        <span className="invoice-form-status-chip invoice-form-status-chip--info">Matches: {quickJumpInvoiceOptions.length}</span>
                        {entryJumpRangeInvalid ? (
                            <span className="invoice-form-status-chip invoice-form-status-chip--danger">Invalid Date Range</span>
                        ) : null}
                        <Button
                            type="button"
                            label="Reset"
                            text
                            className="app-action-compact"
                            onClick={clearEntryJumpRange}
                            disabled={entryJumpFromDate == null && entryJumpToDate == null}
                        />
                        <Button
                            label="Back to Register"
                            icon="pi pi-arrow-left"
                            outlined
                            className="app-action-compact"
                            onClick={onCancelEntry}
                            disabled={saving}
                        />
                    </div>
                </div>
            ) : null}

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}
            {productsLoading && <Message severity="info" text="Loading product catalog..." className="w-full mt-3" />}
            {loadingInvoice && isEntryView && <Message severity="info" text="Loading invoice for edit..." className="w-full mt-3" />}

            {isEntryView ? (
                <div
                    className="voucher-form cash-exp-split__form p-3 cash-exp-form cash-exp-form--receipt cash-exp-form--cash mt-2"
                    onKeyDownCapture={handleEntryShortcutKeyDown}
                >
                    <div className="invoice-form-status-row mb-2">
                        <span className="invoice-form-status-chip invoice-form-status-chip--mode">
                            {isEditView ? 'Edit Mode' : 'New Entry'}
                        </span>
                        <span className="invoice-form-status-chip">
                            {header.placeOfSupply === 'other_state' ? 'Other State (IGST)' : 'In State (SGST/CGST)'}
                        </span>
                        <span className="invoice-form-status-chip">Lines: {computation.lines.length}</span>
                        <span className="invoice-form-status-chip">
                            Inventory Pending: {pendingInventoryCount}
                        </span>
                        <span className="invoice-form-status-chip invoice-form-status-chip--amount">
                            Net: {formatAmount(computation.totals.totalNetAmount)}
                        </span>
                        {hasUnsavedEntryChanges ? (
                            <span className="invoice-form-status-chip invoice-form-status-chip--warning">Unsaved Changes</span>
                        ) : null}
                    </div>

                    <div className="invoice-form-legacy-actions mb-2">
                        <div className="flex flex-wrap align-items-center gap-2">
                            <Button
                                type="button"
                                icon={legacyActionFlags.estimate ? 'pi pi-file-edit' : 'pi pi-lock'}
                                label="Estimate"
                                className="app-action-compact p-button-outlined"
                                onClick={() => onRequestLegacyAction('estimate')}
                                disabled={saving || loadingInvoice}
                            />
                            <Button
                                type="button"
                                icon={legacyActionFlags.creditNote ? 'pi pi-minus-circle' : 'pi pi-lock'}
                                label="Credit Note"
                                className="app-action-compact p-button-outlined"
                                onClick={() => onRequestLegacyAction('creditNote')}
                                disabled={saving || loadingInvoice}
                            />
                            <Button
                                type="button"
                                icon={legacyActionFlags.debitNote ? 'pi pi-plus-circle' : 'pi pi-lock'}
                                label="Debit Note"
                                className="app-action-compact p-button-outlined"
                                onClick={() => onRequestLegacyAction('debitNote')}
                                disabled={saving || loadingInvoice}
                            />
                            <div className="flex align-items-center gap-2 ml-2">
                                <Checkbox
                                    inputId="invoice-show-tax-columns"
                                    checked={showTaxColumns}
                                    onChange={(event) => setShowTaxColumns(!!event.checked)}
                                    disabled={saving || loadingInvoice}
                                />
                                <label htmlFor="invoice-show-tax-columns" className="text-700">
                                    Show Tax Column
                                </label>
                            </div>
                        </div>
                        <div className="invoice-form-status-row mt-2">
                            <span className="invoice-form-status-chip">Estimate: {linkedEstimateId ?? '-'}</span>
                            <span className="invoice-form-status-chip">Credit Notes: {linkedCreditNoteCount}</span>
                            <span className="invoice-form-status-chip">Debit Notes: {linkedDebitNoteCount}</span>
                            <span className="invoice-form-status-chip">Links: Editable</span>
                        </div>
                    </div>

                    {legacyActionNotice ? <Message severity="info" text={legacyActionNotice} className="w-full mb-3" /> : null}

                    {showLegacyPreservedNotice && (
                        <Message
                            severity="warn"
                            text="This invoice contains legacy linked details (tax/credit/debit). They are preserved during update."
                            className="w-full mb-3"
                        />
                    )}

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
                    />

                    <InvoiceLinesTable
                        lines={computation.lines}
                        placeOfSupply={header.placeOfSupply}
                        showTaxColumns={showTaxColumns}
                        productOptions={productOptions}
                        mrpOptionsByProductId={mrpOptionsByProductId}
                        unitOptions={unitOptions}
                        taxLedgerOptions={taxLedgerOptions}
                        warehouseOptions={warehouseOptions}
                        lineErrorsByKey={lineErrorsByKey}
                        inventoryStatusByLineKey={inventoryStatusByLineKey}
                        onSelectProduct={onSelectProduct}
                        onSelectMrp={onSelectMrp}
                        onLineChange={onLineChange}
                        onInventoryChange={onInventoryChange}
                        onDeleteLine={onDeleteLine}
                        onDuplicateLine={onDuplicateLine}
                        onAddLine={onAddLine}
                    />

                    <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                            type="button"
                            icon="pi pi-list"
                            label={`Type Details (${typeDetails.length})`}
                            className="app-action-compact p-button-outlined"
                            onClick={() => setTypeDetailsDialogVisible(true)}
                            disabled={saving || loadingInvoice}
                        />
                        <Button
                            type="button"
                            icon="pi pi-calculator"
                            label={`Additional Tax (${additionalTaxations.length})`}
                            className="app-action-compact p-button-outlined"
                            onClick={() => setAdditionalTaxationDialogVisible(true)}
                            disabled={saving || loadingInvoice}
                        />
                        <span className="invoice-form-status-chip">Additional Tax Total: {formatAmount(totalAdditionalTaxAmount)}</span>
                    </div>

                    <InvoiceTotalsPanel
                        computation={computation}
                        taxSummaryRows={taxSummaryRows}
                        ledgerById={ledgerById}
                        onTaxLessChange={onTaxLessChange}
                        onResetTaxLess={onResetTaxLess}
                        disabled={saving || loadingInvoice}
                    />

                    <Dialog
                        visible={typeDetailsDialogVisible}
                        onHide={() => setTypeDetailsDialogVisible(false)}
                        header="Type Details"
                        style={{ width: 'min(1100px, 95vw)' }}
                        modal
                        maximizable
                    >
                        <InvoiceTypeDetailsSection
                            lines={typeDetails}
                            products={products}
                            productOptions={productOptions}
                            attributeOptionsByType={typeDetailOptionsByType}
                            attributeOptionsLoading={typeDetailOptionsLoading}
                            disabled={saving || loadingInvoice}
                            onAddLine={onAddTypeDetail}
                            onLineChange={onChangeTypeDetail}
                            onDeleteLine={onDeleteTypeDetail}
                        />
                    </Dialog>

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

                    <div className="app-entry-actionsbar invoice-form-actionsbar mt-3">
                        <div className="flex justify-content-center flex-wrap app-entry-form-actions">
                            <div className="app-entry-form-action-with-hint">
                                <Button
                                    label={isEditView ? 'Update Invoice' : 'Save Invoice'}
                                    icon="pi pi-check"
                                    className="app-action-compact"
                                    disabled={!canSave || saving || loadingInvoice}
                                    loading={saving}
                                    onClick={onRequestSave}
                                />
                                <small className="app-entry-form-action-hint">Ctrl+S / F2</small>
                            </div>
                            {!isEditView ? (
                                <div className="app-entry-form-action-with-hint">
                                    <Button
                                        label="Save & Add New"
                                        icon="pi pi-plus"
                                        className="app-action-compact p-button-outlined"
                                        disabled={!canSave || saving || loadingInvoice}
                                        loading={saving}
                                        onClick={onRequestSaveAndAddNew}
                                    />
                                    <small className="app-entry-form-action-hint">Ctrl+Enter</small>
                                </div>
                            ) : null}
                            {isEditView && editingSaleInvoiceId != null ? (
                                <div className="app-entry-form-action-with-hint">
                                    <Button
                                        label="Delete"
                                        icon="pi pi-trash"
                                        severity="danger"
                                        outlined
                                        className="app-action-compact"
                                        disabled={saving || loadingInvoice}
                                        onClick={() => {
                                            if (!confirmDeleteInvoice(editingSaleInvoiceId)) return;
                                            void onDeleteInvoice(editingSaleInvoiceId);
                                        }}
                                    />
                                    <small className="app-entry-form-action-hint">Cancel invoice</small>
                                </div>
                            ) : null}
                            <div className="app-entry-form-action-with-hint">
                                <Button
                                    label="Cancel"
                                    className="app-action-compact p-button-secondary p-button-outlined"
                                    onClick={onCancelEntry}
                                    disabled={saving}
                                />
                                <small className="app-entry-form-action-hint">Esc</small>
                            </div>
                            <div className="app-entry-form-toggle-with-hint">
                                <label className="app-entry-form-toggle" htmlFor="invoice-print-scheme">
                                    <Checkbox
                                        inputId="invoice-print-scheme"
                                        checked={printSchemeEnabled}
                                        onChange={(event) => setPrintSchemeEnabled(!!event.checked)}
                                        disabled={saving || loadingInvoice}
                                    />
                                    <span>Print Scheme</span>
                                </label>
                                <small className="app-entry-form-action-hint">Footer option</small>
                            </div>
                            <div className="app-entry-form-toggle-with-hint">
                                <label className="app-entry-form-toggle" htmlFor="invoice-print-ledger">
                                    <Checkbox
                                        inputId="invoice-print-ledger"
                                        checked={printLedgerEnabled}
                                        onChange={(event) => setPrintLedgerEnabled(!!event.checked)}
                                        disabled={saving || loadingInvoice}
                                    />
                                    <span>Ledger</span>
                                </label>
                                <small className="app-entry-form-action-hint">Footer option</small>
                            </div>
                            <div className="app-entry-form-action-with-hint">
                                <Button
                                    label="Print"
                                    icon="pi pi-print"
                                    className="app-action-compact p-button-outlined"
                                    onClick={handlePrintEntry}
                                    disabled={saving || loadingInvoice}
                                />
                                <small className="app-entry-form-action-hint">Ctrl+P</small>
                            </div>
                            <div className="app-entry-form-action-with-hint">
                                <Button
                                    label="Copy"
                                    icon="pi pi-copy"
                                    className="app-action-compact p-button-outlined"
                                    onClick={() => {
                                        void handleCopyEntry();
                                    }}
                                    disabled={saving || loadingInvoice}
                                />
                                <small className="app-entry-form-action-hint">Summary</small>
                            </div>
                            <div className="app-entry-form-action-with-hint">
                                <Button
                                    label="Close"
                                    icon="pi pi-times-circle"
                                    className="app-action-compact p-button-outlined"
                                    onClick={onCancelEntry}
                                    disabled={saving}
                                />
                                <small className="app-entry-form-action-hint">Back</small>
                            </div>
                        </div>
                        {footerUtilityNotice ? <Message severity="info" text={footerUtilityNotice} className="mt-2" /> : null}
                    </div>
                </div>
            ) : (
                <div className="card app-gradient-card mt-3 invoice-register-card" onKeyDownCapture={handleRegisterShortcutKeyDown}>
                    <ReportHeader
                        title="Invoice Register"
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
                    <AppDataTable
                        className="invoice-register-table"
                        value={filteredSaleInvoices}
                        loading={loading}
                        paginator
                        rows={10}
                        dataKey="saleInvoiceId"
                        rowClassName={resolveRegisterRowClassName}
                        responsiveLayout="scroll"
                        headerLeft={
                            <>
                                <div className="invoice-register-filterbar">
                                    <div className="flex flex-column gap-1">
                                        <label className="text-600 text-sm">From Date</label>
                                        <AppDateInput
                                            inputId="invoice-register-from-date"
                                            value={registerFromDate}
                                            onChange={(next) => setRegisterFromDate(next)}
                                            fiscalYearStart={fiscalYearStart}
                                            fiscalYearEnd={fiscalYearEnd}
                                            className="app-entry-date"
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1">
                                        <label className="text-600 text-sm">To Date</label>
                                        <AppDateInput
                                            inputId="invoice-register-to-date"
                                            value={registerToDate}
                                            onChange={(next) => setRegisterToDate(next)}
                                            fiscalYearStart={fiscalYearStart}
                                            fiscalYearEnd={fiscalYearEnd}
                                            className="app-entry-date"
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1">
                                        <label className="text-600 text-sm">Cancellation</label>
                                        <div className="flex align-items-center gap-2">
                                            <InputSwitch
                                                inputId="invoice-register-cancelled-switch"
                                                checked={registerIncludeCancelled}
                                                onChange={(event) => setRegisterIncludeCancelled(!!event.value)}
                                                className="app-inputswitch"
                                            />
                                            <span className="text-600 text-sm">
                                                {registerIncludeCancelled ? 'Cancelled' : 'Not cancelled'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Party Group</label>
                                        <AppDropdown
                                            value={registerPartyGroupFilter}
                                            options={registerPartyGroupOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterPartyGroupFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                            filter
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Party Name</label>
                                        <AppDropdown
                                            value={registerPartyFilter}
                                            options={registerPartyOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterPartyFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                            filter
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Product Group</label>
                                        <AppDropdown
                                            value={registerProductGroupFilter}
                                            options={registerProductGroupOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterProductGroupFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                            filter
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Product Brand</label>
                                        <AppDropdown
                                            value={registerProductBrandFilter}
                                            options={registerProductBrandOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterProductBrandFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                            filter
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Product</label>
                                        <AppDropdown
                                            value={registerProductFilter}
                                            options={registerProductOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterProductFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                            filter
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Delivery Process Status</label>
                                        <AppDropdown
                                            value={registerDeliveryStatusFilter}
                                            options={registerDeliveryStatusOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterDeliveryStatusFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                            filter
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Place of Supply</label>
                                        <AppDropdown
                                            value={registerPlaceOfSupplyFilter}
                                            options={registerPlaceOfSupplyOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterPlaceOfSupplyFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                        />
                                    </div>
                                    <div className="flex flex-column gap-1" style={{ minWidth: '12rem' }}>
                                        <label className="text-600 text-sm">Customer Type (GST)</label>
                                        <AppDropdown
                                            value={registerCustomerTypeFilter}
                                            options={registerCustomerTypeOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setRegisterCustomerTypeFilter(String(event.value ?? 'all'))}
                                            className="w-12rem"
                                        />
                                    </div>
                                    <div className="flex align-items-center gap-2">
                                        <Checkbox
                                            inputId="invoice-register-disputed-only"
                                            checked={registerDisputedOnly}
                                            onChange={(event) => setRegisterDisputedOnly(!!event.checked)}
                                        />
                                        <label htmlFor="invoice-register-disputed-only">Disputed Only</label>
                                    </div>
                                    <div className="flex align-items-center gap-2">
                                        <Checkbox
                                            inputId="invoice-register-linked-only"
                                            checked={registerLinkedOnly}
                                            onChange={(event) => setRegisterLinkedOnly(!!event.checked)}
                                        />
                                        <label htmlFor="invoice-register-linked-only">Linked Only</label>
                                    </div>
                                    <div className="flex align-items-center gap-2">
                                        <Button
                                            label="Reset Filters"
                                            text
                                            className="app-action-compact"
                                            onClick={resetRegisterFilters}
                                            disabled={
                                                !registerFromDate &&
                                                !registerToDate &&
                                                !registerIncludeCancelled &&
                                                registerPartyGroupFilter === 'all' &&
                                                registerPartyFilter === 'all' &&
                                                registerProductGroupFilter === 'all' &&
                                                registerProductBrandFilter === 'all' &&
                                                registerProductFilter === 'all' &&
                                                registerDeliveryStatusFilter === 'all' &&
                                                registerPlaceOfSupplyFilter === 'all' &&
                                                registerCustomerTypeFilter === 'all' &&
                                                !registerDisputedOnly &&
                                                !registerLinkedOnly
                                            }
                                        />
                                    </div>
                                    <small className="text-600">F11 to focus search</small>
                                </div>
                            </>
                        }
                        headerRight={
                            <div className="invoice-register-actions">
                                {registerSearch.trim() ? (
                                    <Button
                                        label="Clear Search"
                                        text
                                        className="app-action-compact"
                                        onClick={() => setRegisterSearch('')}
                                        disabled={loading}
                                    />
                                ) : null}
                                <AppReportActions
                                    onRefresh={() => onRefresh()}
                                    showRefresh
                                    refreshDisabled={loading || saving}
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
                        }
                        recordSummary={`Showing ${filteredSaleInvoices.length} of ${saleInvoices.length}`}
                        emptyMessage={
                            registerSearch.trim() ||
                            registerFromDate ||
                            registerToDate ||
                            registerIncludeCancelled ||
                            registerPartyGroupFilter !== 'all' ||
                            registerPartyFilter !== 'all' ||
                            registerProductGroupFilter !== 'all' ||
                            registerProductBrandFilter !== 'all' ||
                            registerProductFilter !== 'all' ||
                            registerDeliveryStatusFilter !== 'all' ||
                            registerPlaceOfSupplyFilter !== 'all' ||
                            registerCustomerTypeFilter !== 'all' ||
                            registerDisputedOnly ||
                            registerLinkedOnly
                                ? 'No invoices match your filters.'
                                : 'No invoices found.'
                        }
                        onRowDoubleClick={(event) => {
                            const row = event.data as SaleInvoiceListItem;
                            onOpenEdit(Number(row.saleInvoiceId));
                        }}
                    >
                        <Column
                            field="voucherNumber"
                            header="Invoice No / Date"
                            sortable
                            body={renderRegisterDocumentCell}
                            style={{ minWidth: '11rem' }}
                        />
                        <Column
                            field="ledgerName"
                            header="Party / Group / Remark"
                            sortable
                            body={renderRegisterPartyCell}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            field="totalNetAmount"
                            header="Invoice Value"
                            sortable
                            body={renderRegisterValueCell}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            field="paidAmount"
                            header="Settlement"
                            body={renderRegisterSettlementCell}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            field="status"
                            header="Status + Links"
                            body={renderRegisterStatusLinksCell}
                            style={{ minWidth: '12rem' }}
                        />
                        <Column
                            header="Action"
                            body={(row: SaleInvoiceListItem) => (
                                <div className="flex align-items-center gap-1">
                                    <Button
                                        icon="pi pi-pencil"
                                        text
                                        onClick={() => onOpenEdit(Number(row.saleInvoiceId))}
                                        aria-label={`Edit invoice ${row.saleInvoiceId}`}
                                        disabled={saving}
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        text
                                        severity="danger"
                                        onClick={() => {
                                            const saleInvoiceId = Number(row.saleInvoiceId);
                                            if (!confirmDeleteInvoice(saleInvoiceId)) return;
                                            void onDeleteInvoice(saleInvoiceId);
                                        }}
                                        aria-label={`Delete invoice ${row.saleInvoiceId}`}
                                        disabled={saving || row.isCancelled}
                                    />
                                </div>
                            )}
                            style={{ width: '8rem' }}
                        />
                    </AppDataTable>
                </div>
            )}

            <PhaseOneWarningDialog
                visible={phaseOneWarningVisible}
                onCancel={onCancelPhaseOneWarning}
                onContinue={onConfirmPhaseOneWarning}
                loading={saving}
            />
        </div>
    );
}
