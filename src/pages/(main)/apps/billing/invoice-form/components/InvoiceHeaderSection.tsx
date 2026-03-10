import React, { useMemo, useRef, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import type { AutoComplete } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { classNames } from 'primereact/utils';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { AppNotchedField } from '@/components/AppNotchedField';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import { useLedgerGroupOptions, type LedgerGroupOption } from '@/lib/accounts/ledgerGroups';
import { formatAmount, toDateText } from '../../helpers';
import type { LedgerOption, LedgerSummary } from '../../useLedgerLookup';
import type { InvoiceHeaderDraft } from '../types';

type InvoiceHeaderSectionProps = {
    isEditView?: boolean;
    header: InvoiceHeaderDraft;
    fiscalYearStart: Date | null;
    fiscalYearEnd: Date | null;
    ledgerOptions: LedgerOption[];
    ledgerById: Map<number, LedgerSummary>;
    ledgerLoading: boolean;
    onHeaderChange: (patch: Partial<InvoiceHeaderDraft>) => void;
    headerErrors: string[];
    salesmanFeatureAvailable?: boolean;
    secondarySalesmanFeatureAvailable?: boolean;
    showSchemeToggle?: boolean;
    showBizomInvoiceField?: boolean;
    showInterStateToggle?: boolean;
    showTextileJobworkFields?: boolean;
    topActions?: React.ReactNode;
};

type PartyLedgerOption = {
    label: string;
    value: number | null;
    address: string | null;
};

type LedgerCurrentBalanceQuery = {
    ledgerCurrentBalance: {
        amount: number | string | null;
        drCr: string | null;
    } | null;
};

type SalesmanRow = {
    salesmanId: number | null;
    name: string | null;
};

type SalesmenQuery = {
    salesmen: SalesmanRow[];
};

const LEDGER_CURRENT_BALANCE = gql`
    query LedgerCurrentBalance($ledgerId: Int!, $toDate: String, $cancelled: Int) {
        ledgerCurrentBalance(ledgerId: $ledgerId, toDate: $toDate, cancelled: $cancelled) {
            amount
            drCr
        }
    }
`;

const INVOICE_SALESMEN_QUERY = gql`
    query InvoiceSalesmen($search: String, $limit: Int) {
        salesmen(search: $search, limit: $limit) {
            salesmanId
            name
        }
    }
`;

const PARTY_LEDGER_GROUP_TYPE_CODES = new Set<number>([31, 32, 40]);
const normalizeLedgerGroupLabel = (value?: string | null) =>
    (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const isPartyLedgerGroupLabel = (value?: string | null) => {
    const key = normalizeLedgerGroupLabel(value);
    return (
        key.includes('sundrydebtor')
        || key.includes('sundrycreditor')
        || key === 'partyac'
        || key.includes('partyaccount')
        || key.includes('partyac')
    );
};

const focusById = (id: string) => {
    if (typeof document === 'undefined') return;
    const element = document.getElementById(id) as HTMLElement | null;
    element?.focus();
};

const resolveDateInputError = (value: Date | null, raw: string) => {
    if (!/\d/.test(raw)) return null;
    if (value) return null;
    return 'Enter a valid date in DD/MM/YYYY within the financial year.';
};

const isVoucherDateValidationMessage = (message: string) => message.toLowerCase().includes('voucher date');
const isPartyValidationMessage = (message: string) => {
    const text = message.toLowerCase();
    return text.includes('party ledger') || text.includes('party name');
};

const focusAutoCompleteInput = (ref: React.RefObject<AutoComplete | null>) => {
    ref.current?.getInput?.()?.focus();
};

function HeaderLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <span className="app-entry-label-with-icon">
            <i className={`pi ${icon}`} aria-hidden="true" />
            <span>{children}</span>
        </span>
    );
}

export function InvoiceHeaderSection({
    header,
    fiscalYearStart,
    fiscalYearEnd,
    ledgerOptions,
    ledgerById,
    ledgerLoading,
    onHeaderChange,
    headerErrors,
    salesmanFeatureAvailable = false,
    secondarySalesmanFeatureAvailable = false,
    showSchemeToggle = true,
    showBizomInvoiceField = true,
    showInterStateToggle = true,
    showTextileJobworkFields = false,
    topActions
}: InvoiceHeaderSectionProps) {
    const [voucherDateInputError, setVoucherDateInputError] = useState<string | null>(null);
    const ledgerGroupInputRef = useRef<AutoComplete | null>(null);
    const partyLedgerInputRef = useRef<AutoComplete | null>(null);
    const jobberLedgerInputRef = useRef<AutoComplete | null>(null);
    const { options: allLedgerGroupOptions } = useLedgerGroupOptions();

    const selectedLedger = header.partyLedgerId ? ledgerById.get(header.partyLedgerId) ?? null : null;
    const selectedAddressFromLedger = [selectedLedger?.address, selectedLedger?.cityName, selectedLedger?.stateName]
        .map((value) => (value ?? '').trim())
        .filter(Boolean)
        .join(', ');
    const selectedGstin = (header.partyGstin?.trim() || selectedLedger?.gstNumber?.trim() || '').trim();

    const ledgerGroupOptions = useMemo<LedgerGroupOption[]>(() => {
        if (allLedgerGroupOptions.length > 0) {
            const filtered = allLedgerGroupOptions.filter((option) => {
                const groupTypeCode = option.groupTypeCode != null ? Number(option.groupTypeCode) : null;
                if (groupTypeCode != null && PARTY_LEDGER_GROUP_TYPE_CODES.has(groupTypeCode)) return true;
                return isPartyLedgerGroupLabel(option.label ?? option.name);
            });
            if (filtered.length === 0) return allLedgerGroupOptions;
            if (header.ledgerGroupId != null && !filtered.some((option) => Number(option.value) === Number(header.ledgerGroupId))) {
                const current = allLedgerGroupOptions.find((option) => Number(option.value) === Number(header.ledgerGroupId));
                if (current) return [current, ...filtered];
            }
            return filtered;
        }
        const seen = new Set<number>();
        const options: LedgerGroupOption[] = [];
        ledgerOptions.forEach((option) => {
            const groupId = ledgerById.get(option.value)?.ledgerGroupId;
            if (groupId == null || seen.has(groupId)) return;
            seen.add(groupId);
            options.push({
                label: `Group ${groupId}`,
                value: groupId,
                name: `Group ${groupId}`,
                groupTypeCode: null
            });
        });
        const sorted = options.sort((a, b) => a.value - b.value);
        const filtered = sorted.filter((option) => {
            const groupTypeCode = option.groupTypeCode != null ? Number(option.groupTypeCode) : null;
            if (groupTypeCode != null && PARTY_LEDGER_GROUP_TYPE_CODES.has(groupTypeCode)) return true;
            return isPartyLedgerGroupLabel(option.label ?? option.name);
        });
        if (filtered.length === 0) return sorted;
        if (header.ledgerGroupId != null && !filtered.some((option) => Number(option.value) === Number(header.ledgerGroupId))) {
            const current = sorted.find((option) => Number(option.value) === Number(header.ledgerGroupId));
            if (current) return [current, ...filtered];
        }
        return filtered;
    }, [allLedgerGroupOptions, header.ledgerGroupId, ledgerById, ledgerOptions]);

    const allowedLedgerGroupIds = useMemo(
        () =>
            new Set(
                ledgerGroupOptions
                    .map((option) => Number(option.value))
                    .filter((value) => Number.isFinite(value) && value > 0)
            ),
        [ledgerGroupOptions]
    );

    const partyLedgerOptions = useMemo<PartyLedgerOption[]>(
        () => {
            const options = ledgerOptions
                .filter((option) => {
                    const ledgerGroupId = ledgerById.get(option.value)?.ledgerGroupId ?? null;
                    if (ledgerGroupId == null) return false;
                    if (allowedLedgerGroupIds.size > 0 && !allowedLedgerGroupIds.has(Number(ledgerGroupId))) return false;
                    if (header.ledgerGroupId == null) return true;
                    return ledgerGroupId === header.ledgerGroupId;
                })
                .map((option) => {
                    const ledger = ledgerById.get(option.value);
                    const address = [ledger?.address, ledger?.cityName, ledger?.stateName]
                        .map((value) => (value ?? '').trim())
                        .filter(Boolean)
                        .join(', ');
                    return {
                        label: option.label,
                        value: option.value,
                        address: address || null
                    };
                });

            const selectedOptionAddress =
                header.partyLedgerId != null
                    ? (options.find((option) => option.value === header.partyLedgerId)?.address ?? null)
                    : null;
            const selectedAddress = selectedAddressFromLedger || selectedOptionAddress || header.partyAddress?.trim() || null;
            if (header.partyLedgerId != null && !options.some((option) => option.value === header.partyLedgerId)) {
                options.unshift({
                    label: header.partyName?.trim() || `Ledger ${header.partyLedgerId}`,
                    value: header.partyLedgerId,
                    address: selectedAddress || null
                });
            }

            return options;
        },
        [
            allowedLedgerGroupIds,
            header.ledgerGroupId,
            header.partyAddress,
            header.partyLedgerId,
            header.partyName,
            ledgerById,
            ledgerOptions,
            selectedAddressFromLedger
        ]
    );
    const selectedAddress = useMemo(() => {
        const selectedOptionAddress =
            header.partyLedgerId != null
                ? (partyLedgerOptions.find((option) => option.value === header.partyLedgerId)?.address ?? null)
                : null;
        return selectedAddressFromLedger || selectedOptionAddress || header.partyAddress?.trim() || '';
    }, [header.partyAddress, header.partyLedgerId, partyLedgerOptions, selectedAddressFromLedger]);

    const jobberLedgerOptions = useMemo<PartyLedgerOption[]>(() => {
        const options = ledgerOptions.map((option) => {
            const ledger = ledgerById.get(option.value) ?? null;
            const address = [ledger?.address, ledger?.cityName, ledger?.stateName]
                .map((value) => (value ?? '').trim())
                .filter(Boolean)
                .join(', ');
            return {
                label: option.label,
                value: option.value,
                address: address || null
            };
        });

        if (header.textileJobberLedgerId != null && !options.some((option) => option.value === header.textileJobberLedgerId)) {
            const ledger = ledgerById.get(header.textileJobberLedgerId) ?? null;
            const address = [ledger?.address, ledger?.cityName, ledger?.stateName]
                .map((value) => (value ?? '').trim())
                .filter(Boolean)
                .join(', ');
            options.unshift({
                label: ledger?.name?.trim() || 'Ledger ' + header.textileJobberLedgerId,
                value: header.textileJobberLedgerId,
                address: address || null
            });
        }

        return options;
    }, [header.textileJobberLedgerId, ledgerById, ledgerOptions]);

    const voucherDateHeaderError = useMemo(
        () => headerErrors.find((message) => isVoucherDateValidationMessage(message)) ?? null,
        [headerErrors]
    );
    const partyHeaderError = useMemo(
        () => headerErrors.find((message) => isPartyValidationMessage(message)) ?? null,
        [headerErrors]
    );
    const globalHeaderErrors = useMemo(
        () => headerErrors.filter((message) => !isVoucherDateValidationMessage(message) && !isPartyValidationMessage(message)),
        [headerErrors]
    );

    const voucherDateError = voucherDateInputError ?? voucherDateHeaderError;
    const balanceDateText = useMemo(() => (header.voucherDate ? toDateText(header.voucherDate) : null), [header.voucherDate]);

    const { data: balanceData, loading: balanceLoading } = useQuery<LedgerCurrentBalanceQuery>(LEDGER_CURRENT_BALANCE, {
        skip: header.partyLedgerId == null || !balanceDateText,
        variables: {
            ledgerId: header.partyLedgerId ?? 0,
            toDate: balanceDateText,
            cancelled: 0
        }
    });
    const { data: salesmenData, loading: salesmenLoading } = useQuery<SalesmenQuery>(INVOICE_SALESMEN_QUERY, {
        skip: !salesmanFeatureAvailable,
        variables: { search: null, limit: 500 }
    });
    const showSalesmanField = salesmanFeatureAvailable;
    const showSecondarySalesmanField = salesmanFeatureAvailable && secondarySalesmanFeatureAvailable;
    const salesmanOptions = useMemo(() => {
        if (!showSalesmanField) return [];
        const options = (salesmenData?.salesmen ?? [])
            .map((row) => {
                const value = row.salesmanId != null ? Number(row.salesmanId) : null;
                if (value == null || !Number.isFinite(value) || value <= 0) return null;
                const label = row.name?.trim() || `Salesman ${value}`;
                return { label, value };
            })
            .filter((row): row is { label: string; value: number } => row != null);
        const ensureSelectedOption = (value: number | null | undefined) => {
            const normalized = value != null ? Number(value) : null;
            if (normalized == null || !Number.isFinite(normalized) || normalized <= 0) return;
            if (options.some((option) => option.value === normalized)) return;
            options.unshift({ label: `Salesman ${normalized}`, value: normalized });
        };
        ensureSelectedOption(header.salesmanId);
        ensureSelectedOption(header.salesman2Id);
        return options;
    }, [header.salesman2Id, header.salesmanId, salesmenData?.salesmen, showSalesmanField]);

    const partyLedgerBalanceLabel = useMemo(() => {
        if (!header.partyLedgerId) return null;
        if (balanceLoading) return 'Loading...';
        const balance = balanceData?.ledgerCurrentBalance;
        if (!balance) return `${formatAmount(0)} Dr`;
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [balanceData, balanceLoading, header.partyLedgerId]);

    const partyLedgerBalanceClass = useMemo(() => {
        if (balanceLoading) return 'text-600';
        const drCr = balanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'text-red-600' : 'text-green-600';
    }, [balanceData, balanceLoading]);

    const focusLedgerGroupInput = () => {
        focusAutoCompleteInput(ledgerGroupInputRef);
    };

    const focusPartyLedgerInput = () => {
        focusAutoCompleteInput(partyLedgerInputRef);
    };
    const focusJobberLedgerInput = () => {
        focusAutoCompleteInput(jobberLedgerInputRef);
    };
    const focusAfterTextileRemarkField = () => {
        if (showBizomInvoiceField) {
            focusById('invoice-bizom-no');
            return;
        }
        if (showInterStateToggle) {
            focusById('invoice-other-state');
        }
    };
    const focusAfterRemarkField = () => {
        if (showTextileJobworkFields) {
            focusJobberLedgerInput();
            return;
        }
        focusAfterTextileRemarkField();
    };
    const metaRowClassName = classNames('app-entry-row invoice-header-row invoice-header-row--compact invoice-header-row--meta', {
        'invoice-header-row--meta--single-salesman': showSalesmanField && !showSecondarySalesmanField,
        'invoice-header-row--meta--no-salesman': !showSalesmanField
    });

    return (
        <div className="app-entry-section app-entry-section--header">
            <div className="app-entry-row invoice-header-row invoice-header-row--compact invoice-header-row--top">
                <div className="app-entry-field invoice-header-field invoice-header-field--prefix">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-hashtag">Prefix</HeaderLabel>}
                        className="app-notched-input--entry-main"
                        style={{ width: '100%' }}
                    >
                        <AppInput
                            id="invoice-voucher-prefix"
                            value={header.voucherNumberPrefix}
                            onChange={(event) => onHeaderChange({ voucherNumberPrefix: event.target.value })}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                focusById('invoice-voucher-number');
                            }}
                            className="app-entry-control"
                        />
                    </AppNotchedField>
                </div>

                <div className="app-entry-field invoice-header-field invoice-header-field--number">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-file-edit">Invoice No</HeaderLabel>}
                        className="app-notched-input--entry-main"
                        style={{ width: '100%' }}
                    >
                        <AppInput
                            id="invoice-voucher-number"
                            value={header.voucherNumber}
                            onChange={(event) => onHeaderChange({ voucherNumber: event.target.value })}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                focusById('invoice-voucher-date');
                            }}
                            className="app-entry-control"
                        />
                    </AppNotchedField>
                </div>

                <div className="app-entry-field invoice-header-field invoice-header-field--date">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-calendar">Date *</HeaderLabel>}
                        className="app-notched-input--entry-main"
                        style={{ width: '100%' }}
                    >
                        <AppDateInput
                            inputId="invoice-voucher-date"
                            value={header.voucherDate}
                            onChange={(nextValue) => {
                                onHeaderChange({ voucherDate: nextValue });
                                setVoucherDateInputError(null);
                            }}
                            onCommit={(nextValue, raw) => {
                                setVoucherDateInputError(resolveDateInputError(nextValue, raw));
                            }}
                            fiscalYearStart={fiscalYearStart}
                            fiscalYearEnd={fiscalYearEnd}
                            enforceFiscalRange
                            className={classNames('app-entry-control', { 'p-invalid': !!voucherDateError })}
                            onEnterNext={() => {
                                focusLedgerGroupInput();
                                return true;
                            }}
                        />
                    </AppNotchedField>
                    {voucherDateError && <small className="text-red-500">{voucherDateError}</small>}
                </div>

                {topActions ? (
                    <div className="app-entry-field invoice-header-field invoice-header-field--top-actions">{topActions}</div>
                ) : null}
            </div>

            <div className="app-entry-row invoice-header-row invoice-header-row--compact invoice-header-row--party">
                <div className="app-entry-field app-entry-field--wide invoice-header-field invoice-header-field--ledger-group">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-sitemap">Ledger Group</HeaderLabel>}
                        className="app-notched-input--entry-main"
                        style={{ width: '100%' }}
                    >
                        <LedgerGroupAutoComplete
                            ref={ledgerGroupInputRef}
                            inputId="invoice-ledger-group"
                            value={header.ledgerGroupId}
                            options={ledgerGroupOptions}
                            onChange={(groupId) => {
                                const currentLedgerGroupId =
                                    header.partyLedgerId != null
                                        ? ledgerById.get(header.partyLedgerId)?.ledgerGroupId ?? null
                                        : null;
                                const shouldReplaceLedger = groupId != null && currentLedgerGroupId !== groupId;
                                const defaultLedgerIdForGroup =
                                    groupId != null
                                        ? (ledgerOptions.find((option) => ledgerById.get(option.value)?.ledgerGroupId === groupId)?.value ??
                                          null)
                                        : null;
                                const defaultLedger = defaultLedgerIdForGroup
                                    ? (ledgerById.get(defaultLedgerIdForGroup) ?? null)
                                    : null;
                                const defaultAddress = [defaultLedger?.address, defaultLedger?.cityName, defaultLedger?.stateName]
                                    .map((value) => (value ?? '').trim())
                                    .filter(Boolean)
                                    .join(', ');
                                onHeaderChange({
                                    ledgerGroupId: groupId,
                                    partyLedgerId: shouldReplaceLedger ? defaultLedgerIdForGroup : header.partyLedgerId,
                                    partyName: shouldReplaceLedger ? (defaultLedger?.name ?? '') : header.partyName,
                                    partyGstin: shouldReplaceLedger ? (defaultLedger?.gstNumber?.trim() ?? '') : header.partyGstin,
                                    partyAddress: shouldReplaceLedger ? defaultAddress : header.partyAddress
                                });
                            }}
                            className="app-entry-control"
                            style={{ width: '100%' }}
                            panelStyle={{ width: '20rem' }}
                            onSelectNext={focusPartyLedgerInput}
                        />
                    </AppNotchedField>
                </div>

                <div className="app-entry-field app-entry-field--xwide app-entry-ledger-field app-entry-ledger-field--cash invoice-header-field invoice-header-field--ledger">
                    <div className="app-entry-ledger-balance-row">
                        {partyLedgerBalanceLabel ? (
                            <span className={`app-entry-ledger-balance ${partyLedgerBalanceClass}`}>{partyLedgerBalanceLabel}</span>
                        ) : null}
                    </div>
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-wallet">Ledger *</HeaderLabel>}
                        className="app-notched-input--entry-main"
                        style={{ width: '100%' }}
                    >
                        <LedgerAutoComplete
                            ref={partyLedgerInputRef}
                            variant="party"
                            inputId="invoice-party-ledger"
                            value={header.partyLedgerId}
                            options={partyLedgerOptions}
                            onChange={(nextId) => {
                                const ledger = nextId ? ledgerById.get(nextId) ?? null : null;
                                const gstin = ledger?.gstNumber?.trim() ?? '';
                                onHeaderChange({
                                    partyLedgerId: nextId,
                                    ledgerGroupId: ledger?.ledgerGroupId ?? header.ledgerGroupId,
                                    partyName: ledger?.name ?? '',
                                    partyGstin: gstin,
                                    partyAddress: [ledger?.address, ledger?.cityName, ledger?.stateName]
                                        .map((value) => (value ?? '').trim())
                                        .filter(Boolean)
                                        .join(', ')
                                });
                            }}
                            placeholder="Select party ledger"
                            loading={ledgerLoading}
                            loadingPlaceholder="Loading ledgers..."
                            className={classNames('app-entry-control', { 'p-invalid': !!partyHeaderError })}
                            ledgerGroupId={header.ledgerGroupId}
                            onSelectNext={() => focusById('invoice-remarks')}
                        />
                    </AppNotchedField>
                    {partyHeaderError && <small className="text-red-500">{partyHeaderError}</small>}
                </div>

                <div className="app-entry-field app-entry-field--xwide invoice-header-field invoice-header-field--address">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-map-marker">Address</HeaderLabel>}
                        className="app-notched-input--line-editor"
                        style={{ width: '100%' }}
                    >
                        <div className="app-notched-input__surface ledger-meta-address invoice-header-address-meta">
                            <span className="invoice-header-address-meta__address">{selectedAddress || 'Address not available'}</span>
                            <span className="invoice-header-address-meta__gstin-inline">GSTIN: {selectedGstin || '-'}</span>
                        </div>
                    </AppNotchedField>
                </div>

            </div>

            <div className={metaRowClassName}>
                {showSchemeToggle ? (
                    <div className="invoice-header-checks invoice-header-field invoice-header-field--checks">
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="invoice-has-scheme"
                                checked={header.hasScheme}
                                onChange={(event) => onHeaderChange({ hasScheme: !!event.checked })}
                            />
                            <label htmlFor="invoice-has-scheme">Scheme</label>
                        </div>
                    </div>
                ) : null}

                {showSalesmanField ? (
                    <div className="app-entry-field invoice-header-field invoice-header-field--salesman">
                        <AppNotchedField
                            label={<HeaderLabel icon="pi-user">Salesman</HeaderLabel>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <AppDropdown
                                inputId="invoice-salesman-1"
                                value={header.salesmanId}
                                options={salesmanOptions}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => {
                                    const nextSalesmanId = event.value != null ? Number(event.value) : null;
                                    onHeaderChange({
                                        salesmanId: nextSalesmanId,
                                        salesman2Id:
                                            nextSalesmanId != null && header.salesman2Id === nextSalesmanId
                                                ? null
                                                : header.salesman2Id
                                    });
                                }}
                                showClear
                                filter
                                placeholder="Select salesman"
                                loading={salesmenLoading}
                                className="app-entry-control"
                                onEnterNext={() => {
                                    focusById(showSecondarySalesmanField ? 'invoice-salesman-2' : 'invoice-remarks');
                                    return true;
                                }}
                            />
                        </AppNotchedField>
                    </div>
                ) : null}

                {showSecondarySalesmanField ? (
                    <div className="app-entry-field invoice-header-field invoice-header-field--salesman2">
                        <AppNotchedField
                            label={<HeaderLabel icon="pi-users">Salesman 2</HeaderLabel>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <AppDropdown
                                inputId="invoice-salesman-2"
                                value={header.salesman2Id}
                                options={salesmanOptions}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => {
                                    const nextSalesmanId = event.value != null ? Number(event.value) : null;
                                    onHeaderChange({
                                        salesman2Id: nextSalesmanId,
                                        salesmanId:
                                            nextSalesmanId != null && header.salesmanId === nextSalesmanId
                                                ? null
                                                : header.salesmanId
                                    });
                                }}
                                showClear
                                filter
                                placeholder="Optional"
                                loading={salesmenLoading}
                                className="app-entry-control"
                                onEnterNext={() => {
                                    focusById('invoice-remarks');
                                    return true;
                                }}
                            />
                        </AppNotchedField>
                    </div>
                ) : null}

                <div className="app-entry-field app-entry-field--xwide invoice-header-field invoice-header-field--remark">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-pencil">Remark</HeaderLabel>}
                        className="app-notched-input--entry-main"
                        style={{ width: '100%' }}
                    >
                        <AppInput
                            id="invoice-remarks"
                            value={header.remarks}
                            onChange={(event) => onHeaderChange({ remarks: event.target.value })}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                focusAfterRemarkField();
                            }}
                            className="app-entry-control"
                        />
                    </AppNotchedField>
                </div>

                {showBizomInvoiceField ? (
                    <div className="app-entry-field app-entry-field--wide invoice-header-field invoice-header-field--bizom">
                        <AppNotchedField
                            label={<HeaderLabel icon="pi-id-card">Bizom Invoice No</HeaderLabel>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <AppInput
                                id="invoice-bizom-no"
                                value={header.bizomInvoiceNumber}
                                onChange={(event) => onHeaderChange({ bizomInvoiceNumber: event.target.value })}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    if (showInterStateToggle) {
                                        focusById('invoice-other-state');
                                    }
                                }}
                                className="app-entry-control"
                            />
                        </AppNotchedField>
                    </div>
                ) : null}

                {showInterStateToggle ? (
                    <div className="invoice-header-other-state invoice-header-field invoice-header-field--other-state">
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="invoice-other-state"
                                checked={header.placeOfSupply === 'other_state'}
                                onChange={(event) => onHeaderChange({ placeOfSupply: event.checked ? 'other_state' : 'in_state' })}
                            />
                            <label htmlFor="invoice-other-state">Inter-State (IGST)</label>
                        </div>
                    </div>
                ) : null}
            </div>

            {showTextileJobworkFields ? (
                <div className="app-entry-row invoice-header-row invoice-header-row--compact invoice-header-row--textile-jobwork">
                    <div className="app-entry-field invoice-header-field invoice-header-field--jobber-ledger">
                        <AppNotchedField
                            label={<HeaderLabel icon="pi-briefcase">Jobber</HeaderLabel>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <LedgerAutoComplete
                                ref={jobberLedgerInputRef}
                                variant="party"
                                inputId="invoice-jobber-ledger"
                                value={header.textileJobberLedgerId}
                                options={jobberLedgerOptions}
                                onChange={(nextId) => onHeaderChange({ textileJobberLedgerId: nextId })}
                                placeholder="Select jobber"
                                loading={ledgerLoading}
                                loadingPlaceholder="Loading ledgers..."
                                showClear
                                className="app-entry-control"
                                onSelectNext={() => focusById('invoice-jobber-challan-no')}
                            />
                        </AppNotchedField>
                    </div>

                    <div className="app-entry-field invoice-header-field invoice-header-field--jobber-challan-no">
                        <AppNotchedField
                            label={<HeaderLabel icon="pi-ticket">Jober Challan No</HeaderLabel>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <AppInput
                                id="invoice-jobber-challan-no"
                                value={header.textileJobberChallanNo}
                                onChange={(event) => onHeaderChange({ textileJobberChallanNo: event.target.value })}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    focusById('invoice-jobber-challan-date');
                                }}
                                className="app-entry-control"
                            />
                        </AppNotchedField>
                    </div>

                    <div className="app-entry-field invoice-header-field invoice-header-field--jobber-challan-date">
                        <AppNotchedField
                            label={<HeaderLabel icon="pi-calendar">Jober Date</HeaderLabel>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <AppDateInput
                                inputId="invoice-jobber-challan-date"
                                value={header.textileJobberChallanDate}
                                onChange={(nextValue) => onHeaderChange({ textileJobberChallanDate: nextValue })}
                                fiscalYearStart={fiscalYearStart}
                                fiscalYearEnd={fiscalYearEnd}
                                enforceFiscalRange
                                className="app-entry-control"
                                onEnterNext={() => {
                                    focusById('invoice-textile-statement-remark');
                                    return true;
                                }}
                            />
                        </AppNotchedField>
                    </div>

                    <div className="app-entry-field app-entry-field--xwide invoice-header-field invoice-header-field--statement-remark">
                        <AppNotchedField
                            label={<HeaderLabel icon="pi-comment">Statement Remark</HeaderLabel>}
                            className="app-notched-input--entry-main"
                            style={{ width: '100%' }}
                        >
                            <AppInput
                                id="invoice-textile-statement-remark"
                                value={header.textileRemarkForStatement}
                                onChange={(event) => onHeaderChange({ textileRemarkForStatement: event.target.value })}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    focusAfterTextileRemarkField();
                                }}
                                className="app-entry-control"
                            />
                        </AppNotchedField>
                    </div>
                </div>
            ) : null}

            {globalHeaderErrors.length > 0 ? (
                <div className="p-2 border-1 border-red-300 border-round bg-red-50 text-red-700 mt-2">
                    {globalHeaderErrors.join(' ')}
                </div>
            ) : null}
        </div>
    );
}
