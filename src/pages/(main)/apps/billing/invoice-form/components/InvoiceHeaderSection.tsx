import React, { useMemo, useRef, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import type { AutoComplete } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { classNames } from 'primereact/utils';
import AppDateInput from '@/components/AppDateInput';
import AppInput from '@/components/AppInput';
import { AppNotchedField } from '@/components/AppNotchedField';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import type { LedgerGroupOption } from '@/lib/accounts/ledgerGroups';
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

const LEDGER_CURRENT_BALANCE = gql`
    query LedgerCurrentBalance($ledgerId: Int!, $toDate: String, $cancelled: Int) {
        ledgerCurrentBalance(ledgerId: $ledgerId, toDate: $toDate, cancelled: $cancelled) {
            amount
            drCr
        }
    }
`;

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
    isEditView = false,
    header,
    fiscalYearStart,
    fiscalYearEnd,
    ledgerOptions,
    ledgerById,
    ledgerLoading,
    onHeaderChange,
    headerErrors
}: InvoiceHeaderSectionProps) {
    const [voucherDateInputError, setVoucherDateInputError] = useState<string | null>(null);
    const ledgerGroupInputRef = useRef<AutoComplete | null>(null);
    const partyLedgerInputRef = useRef<AutoComplete | null>(null);

    const selectedLedger = header.partyLedgerId ? ledgerById.get(header.partyLedgerId) ?? null : null;

    const ledgerGroupOptions = useMemo<LedgerGroupOption[]>(() => {
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
        return options.sort((a, b) => a.value - b.value);
    }, [ledgerById, ledgerOptions]);

    const partyLedgerOptions = useMemo<PartyLedgerOption[]>(
        () =>
            ledgerOptions
                .filter((option) =>
                    header.ledgerGroupId == null ? true : ledgerById.get(option.value)?.ledgerGroupId === header.ledgerGroupId
                )
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
                }),
        [header.ledgerGroupId, ledgerById, ledgerOptions]
    );

    const selectedAddress = [selectedLedger?.address, selectedLedger?.cityName, selectedLedger?.stateName]
        .map((value) => (value ?? '').trim())
        .filter(Boolean)
        .join(', ');

    const voucherDateHeaderError = useMemo(
        () => headerErrors.find((message) => message.toLowerCase().includes('voucher date')) ?? null,
        [headerErrors]
    );
    const partyHeaderError = useMemo(
        () =>
            headerErrors.find((message) => {
                const text = message.toLowerCase();
                return text.includes('party ledger') || text.includes('party name');
            }) ?? null,
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

    return (
        <div className="app-entry-section app-entry-section--header">
            <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <h4 className="m-0">Header Section</h4>
                <span className="invoice-form-status-chip">
                    {header.placeOfSupply === 'other_state' ? 'Other State (IGST)' : 'In State (SGST/CGST)'}
                </span>
            </div>

            <div className="app-entry-row invoice-header-row invoice-header-row--compact">
                <div className="app-entry-field">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-hashtag">Invoice Prefix</HeaderLabel>}
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

                <div className="app-entry-field">
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

                <div className="app-entry-field">
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
            </div>

            <div className="app-entry-row invoice-header-row invoice-header-row--compact">
                <div className="app-entry-field app-entry-field--wide">
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
                                onHeaderChange({
                                    ledgerGroupId: groupId,
                                    partyLedgerId: shouldReplaceLedger ? defaultLedgerIdForGroup : header.partyLedgerId,
                                    partyName: shouldReplaceLedger ? (defaultLedger?.name ?? '') : header.partyName,
                                    partyGstin: shouldReplaceLedger ? (defaultLedger?.gstNumber?.trim() ?? '') : header.partyGstin
                                });
                            }}
                            className="app-entry-control"
                            style={{ width: '100%' }}
                            panelStyle={{ width: '20rem' }}
                            onSelectNext={focusPartyLedgerInput}
                        />
                    </AppNotchedField>
                </div>

                <div className="app-entry-field app-entry-field--xwide app-entry-ledger-field app-entry-ledger-field--cash">
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
                                    partyGstin: gstin
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

                <div className="app-entry-field app-entry-field--xwide">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-map-marker">Address</HeaderLabel>}
                        className="app-notched-input--line-editor"
                        style={{ width: '100%' }}
                    >
                        <div className="app-notched-input__surface ledger-meta-address">
                            <span className="text-700 text-sm">{selectedAddress || 'Address not available'}</span>
                        </div>
                    </AppNotchedField>
                </div>

                <div className="invoice-header-other-state">
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="invoice-other-state"
                            checked={header.placeOfSupply === 'other_state'}
                            onChange={(event) => onHeaderChange({ placeOfSupply: event.checked ? 'other_state' : 'in_state' })}
                        />
                        <label htmlFor="invoice-other-state">Other State</label>
                    </div>
                </div>
            </div>

            <div className="app-entry-row invoice-header-row invoice-header-row--compact">
                <div className="invoice-header-checks">
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="invoice-has-scheme"
                            checked={header.hasScheme}
                            onChange={(event) => onHeaderChange({ hasScheme: !!event.checked })}
                        />
                        <label htmlFor="invoice-has-scheme">Scheme</label>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId="invoice-disputed"
                            checked={header.isDisputed}
                            onChange={(event) => onHeaderChange({ isDisputed: !!event.checked })}
                        />
                        <label htmlFor="invoice-disputed">Disputed</label>
                    </div>
                    {isEditView ? (
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="invoice-cancelled"
                                checked={header.isCancelled}
                                onChange={(event) => onHeaderChange({ isCancelled: !!event.checked })}
                            />
                            <label htmlFor="invoice-cancelled">Cancel Invoice</label>
                        </div>
                    ) : null}
                </div>

                <div className="app-entry-field app-entry-field--xwide">
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
                                focusById('invoice-bizom-no');
                            }}
                            className="app-entry-control"
                        />
                    </AppNotchedField>
                </div>

                <div className="app-entry-field app-entry-field--wide">
                    <AppNotchedField
                        label={<HeaderLabel icon="pi-id-card">Bizom Invoice No</HeaderLabel>}
                        className="app-notched-input--entry-main"
                        style={{ width: '100%' }}
                    >
                        <AppInput
                            id="invoice-bizom-no"
                            value={header.bizomInvoiceNumber}
                            onChange={(event) => onHeaderChange({ bizomInvoiceNumber: event.target.value })}
                            className="app-entry-control"
                        />
                    </AppNotchedField>
                </div>
            </div>

            {headerErrors.length > 0 ? (
                <div className="p-2 border-1 border-red-300 border-round bg-red-50 text-red-700 mt-2">{headerErrors.join(' ')}</div>
            ) : null}
        </div>
    );
}
