'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import AppDataTable from '@/components/AppDataTable';
import AppDrCrToggle from '@/components/AppDrCrToggle';
import AppInput from '@/components/AppInput';
import { AppNotchedField } from '@/components/AppNotchedField';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import type { LedgerOption } from '@/lib/accounts/ledgerOptions';
import { LabelWithIcon } from './LabelWithIcon';
import type { DebitLineDraft } from '../types';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';
import {
    AMOUNT_CURRENCY_ICON,
    AMOUNT_CURRENCY_SYMBOL,
    DR_ONLY_VALUE,
    formatAmount,
    resolveAddress
} from '../utils';

type PaymentVoucherDebitLinesSectionProps = {
    viewProps: PaymentVoucherViewProps;
    renderFormError: (key: string) => React.ReactNode;
};

export function PaymentVoucherDebitLinesSection({
    viewProps,
    renderFormError
}: PaymentVoucherDebitLinesSectionProps) {
    const {
        isFormActive,
        saving,
        lines,
        selectedLine,
        selectedLineKey,
        setSelectedLineKey,
        lineEditorDraft,
        lineEditorCarryGroupId,
        updateLineEditorDraft,
        lineEditorLedgerGroupRef,
        lineEditorLedgerRef,
        lineEditorAmountRef,
        focusLineEditorLedgerGroupInput,
        focusLineEditorAmountInput,
        syncLineEditorAmountInput,
        paymentAgainstAddressMap,
        ledgerGroupOptions,
        ledgerGroupOptionsLoading,
        lineEditorAddress,
        lineEditorBalanceLabel,
        lineEditorBalanceClass,
        startEditLine,
        applyLineDraft,
        cancelLineDraft,
        confirmRemoveLine,
        isLineDraftValid,
        differenceLabel,
        totalDebit,
        autoCompleteAppendTarget,
        cashLedgerId
    } = viewProps;

    const ledgerGroupLabelMap = React.useMemo(() => {
        const map = new Map<number, string>();
        ledgerGroupOptions.forEach((option) => {
            map.set(Number(option.value), option.label ?? option.name ?? `Group ${option.value}`);
        });
        return map;
    }, [ledgerGroupOptions]);

    const lineEditorFallbackOption: LedgerOption | null =
        lineEditorDraft.ledgerId != null
            ? {
                  value: lineEditorDraft.ledgerId,
                  label: lineEditorDraft.label ?? `Ledger ${lineEditorDraft.ledgerId}`
              } as LedgerOption
            : null;
    const [lineEditorPreviewOption, setLineEditorPreviewOption] = React.useState<LedgerOption | null>(null);
    const previewLedgerId = lineEditorPreviewOption?.value != null ? Number(lineEditorPreviewOption.value) : null;
    const previewLedgerAddress = lineEditorPreviewOption?.address ?? null;
    const lineEditorPreviewAddress = React.useMemo(
        () =>
            resolveAddress(
                previewLedgerAddress,
                previewLedgerId != null ? paymentAgainstAddressMap.get(previewLedgerId) ?? null : null
            ),
        [paymentAgainstAddressMap, previewLedgerAddress, previewLedgerId]
    );
    const displayedLineEditorAddress = lineEditorPreviewAddress ?? lineEditorAddress;
    const lineEditorModeLabel = lineEditorDraft.mode === 'edit' ? 'Editing selected line' : 'Adding new line';
    const debitLinesGridRef = React.useRef<HTMLDivElement | null>(null);

    const focusDebitLinesGrid = React.useCallback((preferLastLine = false) => {
        const grid = debitLinesGridRef.current;
        if (!grid) return;
        const targetLineKey = preferLastLine
            ? (lines.length > 0 ? lines[lines.length - 1]?.key ?? null : null)
            : (selectedLineKey ?? (lines.length > 0 ? lines[0].key : null));
        if (targetLineKey && targetLineKey !== selectedLineKey) {
            setSelectedLineKey(targetLineKey);
        }
        const targetIndex = targetLineKey ? lines.findIndex((line) => line.key === targetLineKey) : -1;
        window.setTimeout(() => {
            const host = debitLinesGridRef.current;
            if (!host) return;
            const rows = Array.from(host.querySelectorAll<HTMLTableRowElement>('.p-datatable-tbody > tr'));
            const row = targetIndex >= 0 ? rows[targetIndex] ?? null : null;
            if (row) {
                row.setAttribute('tabindex', '-1');
                row.focus();
                return;
            }
            host.focus();
        }, 0);
    }, [lines, selectedLineKey, setSelectedLineKey]);

    const handleDebitLinesGridKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.defaultPrevented || event.key !== 'Enter') return;
            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName?.toLowerCase();
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'button') return;
            if (target?.getAttribute('role') === 'button') return;
            const focusedRow = target?.closest('tr');
            const rows = Array.from(debitLinesGridRef.current?.querySelectorAll<HTMLTableRowElement>('.p-datatable-tbody > tr') ?? []);
            const focusedIndex = focusedRow ? rows.indexOf(focusedRow as HTMLTableRowElement) : -1;
            const focusedLineKey = focusedIndex >= 0 ? lines[focusedIndex]?.key ?? null : null;
            const targetLineKey = focusedLineKey ?? selectedLineKey ?? (lines.length > 0 ? lines[0].key : null);
            if (!targetLineKey) return;
            event.preventDefault();
            event.stopPropagation();
            if (!selectedLineKey || selectedLineKey !== targetLineKey) {
                setSelectedLineKey(targetLineKey);
            }
            startEditLine(targetLineKey);
        },
        [lines, selectedLineKey, setSelectedLineKey, startEditLine]
    );

    const handleLineEditorShortcutKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.defaultPrevented) return;
            if (event.key === 'Home') {
                event.preventDefault();
                event.stopPropagation();
                focusLineEditorLedgerGroupInput();
                return;
            }
            if (event.key === 'End') {
                event.preventDefault();
                event.stopPropagation();
                focusLineEditorAmountInput();
            }
        },
        [focusLineEditorAmountInput, focusLineEditorLedgerGroupInput]
    );

    const differenceFooter = (
        <span className="text-600">
            Difference (Cr - Dr): <strong>{differenceLabel}</strong>
        </span>
    );

    const totalFooter = (
        <span className="text-600">
            {`Total (Dr • ${AMOUNT_CURRENCY_SYMBOL}): `}<strong>{formatAmount(totalDebit)}</strong>
        </span>
    );

    return (
        <div className="app-entry-section app-entry-section--lines">
            <div className="app-entry-lines">
                <div className="app-entry-lines-header">
                    <div className="app-entry-lines-title">
                        <LabelWithIcon icon="pi-list">To (Ledger Dr)</LabelWithIcon>
                    </div>
                </div>

                <div
                    ref={debitLinesGridRef}
                    tabIndex={0}
                    className="app-entry-lines-grid"
                    onKeyDown={handleDebitLinesGridKeyDown}
                    onKeyDownCapture={handleDebitLinesGridKeyDown}
                >
                    <AppDataTable
                        value={lines}
                        dataKey="key"
                        size="small"
                        stripedRows
                        className="app-entry-lines-table"
                        selectionMode="single"
                        selection={selectedLine}
                        onSelectionChange={(event: any) => {
                            const line = (event.value as DebitLineDraft | null) ?? null;
                            setSelectedLineKey(line?.key ?? null);
                        }}
                        rowClassName={(line: DebitLineDraft) => (line.key === selectedLineKey ? 'app-entry-line-row--selected' : '')}
                        emptyMessage="No debit lines added yet."
                    >
                        <Column
                            header={<LabelWithIcon icon="pi-sitemap">Ledger Group</LabelWithIcon>}
                            headerClassName="app-entry-header-left"
                            body={(line: DebitLineDraft) => (
                                <span>{line.ledgerGroupId != null ? (ledgerGroupLabelMap.get(Number(line.ledgerGroupId)) ?? `Group ${line.ledgerGroupId}`) : '-'}</span>
                            )}
                            style={{ width: '12rem' }}
                        />
                        <Column
                            header={<LabelWithIcon icon="pi-wallet">Ledger (Dr)</LabelWithIcon>}
                            headerClassName="app-entry-header-left"
                            body={(line: DebitLineDraft) => {
                                const ledgerAddress = resolveAddress(
                                    line.ledgerOption?.address,
                                    line.ledgerId != null ? paymentAgainstAddressMap.get(Number(line.ledgerId)) ?? null : null
                                );
                                const addressLabel = ledgerAddress ?? 'Address not available';
                                return (
                                    <div className="flex flex-column gap-1">
                                        <span>{line.label ?? line.ledgerOption?.label ?? (line.ledgerId ? `Ledger ${line.ledgerId}` : '-')}</span>
                                        <span className="text-600 text-sm">{addressLabel}</span>
                                    </div>
                                );
                            }}
                            style={{ width: '20rem' }}
                            footer={differenceFooter}
                            footerStyle={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                        />
                        <Column
                            header={<LabelWithIcon icon="pi-sort-alt">Dr/Cr</LabelWithIcon>}
                            headerClassName="app-entry-header-center"
                            body={() => <span className="text-700">Dr</span>}
                            style={{ width: '5rem', textAlign: 'center' }}
                        />
                        <Column
                            header={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount</LabelWithIcon>}
                            headerClassName="app-entry-header-right"
                            body={(line: DebitLineDraft) => <span>{line.amount != null ? formatAmount(Number(line.amount)) : ''}</span>}
                            style={{ width: '9rem', textAlign: 'right' }}
                            footer={totalFooter}
                            footerStyle={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                        />
                        <Column
                            header={<LabelWithIcon icon="pi-cog">Actions</LabelWithIcon>}
                            headerClassName="text-center"
                            body={(line: DebitLineDraft) => (
                                <div className="flex align-items-center justify-content-center gap-1 app-entry-line-actions">
                                    <Button
                                        icon="pi pi-pencil"
                                        className="p-button-text p-button-sm"
                                        onClick={() => {
                                            setSelectedLineKey(line.key);
                                            startEditLine(line.key);
                                        }}
                                        disabled={!isFormActive || saving}
                                        tooltip="Edit line"
                                        tooltipOptions={{ position: 'top' }}
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        className="p-button-text p-button-danger p-button-sm"
                                        onClick={() => confirmRemoveLine(line.key)}
                                        disabled={!isFormActive || saving}
                                        tooltip="Remove line"
                                        tooltipOptions={{ position: 'top' }}
                                    />
                                </div>
                            )}
                            style={{ width: '6rem' }}
                        />
                    </AppDataTable>
                </div>

                <div className="app-entry-line-editor" onKeyDownCapture={handleLineEditorShortcutKeyDown}>
                    <div className="app-entry-line-editor__meta">
                        <span
                            className={`app-entry-line-editor__mode ${
                                lineEditorDraft.mode === 'edit' ? 'app-entry-line-editor__mode--edit' : 'app-entry-line-editor__mode--add'
                            }`}
                        >
                            {lineEditorModeLabel}
                        </span>
                    </div>

                    <div className="app-entry-line-editor__fields">
                        <div className="app-entry-line-editor__field app-entry-line-editor__field--group">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-sitemap">Ledger Group</LabelWithIcon>}
                                className="app-notched-input--line-editor"
                                style={{ width: '100%' }}
                            >
                                <LedgerGroupAutoComplete
                                    value={lineEditorDraft.ledgerGroupId}
                                    options={ledgerGroupOptions}
                                    loading={ledgerGroupOptionsLoading}
                                    loadingWhenPanelOpenOnly
                                    onChange={(nextValue) => {
                                        setLineEditorPreviewOption(null);
                                        const normalizedCurrentGroupId =
                                            lineEditorDraft.ledgerGroupId != null ? Number(lineEditorDraft.ledgerGroupId) : null;
                                        const normalizedNextGroupId = nextValue != null ? Number(nextValue) : null;
                                        const hasGroupChanged = normalizedCurrentGroupId !== normalizedNextGroupId;
                                        updateLineEditorDraft({
                                            ledgerGroupId: normalizedNextGroupId,
                                            ...(hasGroupChanged
                                                ? {
                                                      ledgerId: null,
                                                      ledgerOption: null,
                                                      label: null
                                                  }
                                                : {})
                                        });
                                    }}
                                    placeholder="Ledger group"
                                    loadingPlaceholder="Loading groups..."
                                    onSelectNext={() => lineEditorLedgerRef.current?.focus?.()}
                                    style={{ width: '100%' }}
                                    panelStyle={{ width: '16rem' }}
                                    disabled={!isFormActive || saving}
                                    appendTo={autoCompleteAppendTarget}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Escape') return;
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setLineEditorPreviewOption(null);
                                        lineEditorLedgerGroupRef.current?.hide?.();
                                        window.setTimeout(() => focusDebitLinesGrid(true), 0);
                                    }}
                                    ref={(element) => {
                                        lineEditorLedgerGroupRef.current = element;
                                    }}
                                />
                            </AppNotchedField>
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--ledger">
                            <div className="flex justify-content-end mb-1">
                                {lineEditorBalanceLabel && (
                                    <span className={`app-entry-ledger-balance ${lineEditorBalanceClass}`}>
                                        {lineEditorBalanceLabel}
                                    </span>
                                )}
                            </div>
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-wallet">Ledger (Dr)</LabelWithIcon>}
                                className="app-notched-input--line-editor"
                                style={{ width: '100%' }}
                            >
                                <LedgerAutoComplete
                                    variant="purpose"
                                    purpose="PAYMENT-AGAINST"
                                    loadingWhenPanelOpenOnly
                                    value={lineEditorDraft.ledgerId}
                                    selectedOption={lineEditorDraft.ledgerOption ?? lineEditorFallbackOption}
                                    onChange={(value, option) => {
                                        setLineEditorPreviewOption(null);
                                        const inferredGroupFromExistingLine =
                                            value == null
                                                ? null
                                                : lines.find((line) => Number(line.ledgerId || 0) === Number(value) && line.ledgerGroupId != null)
                                                      ?.ledgerGroupId ?? null;
                                        const resolvedGroupId =
                                            lineEditorDraft.ledgerGroupId ??
                                            inferredGroupFromExistingLine ??
                                            lineEditorCarryGroupId ??
                                            null;
                                        const nextLabel =
                                            value == null
                                                ? null
                                                : option?.label ?? lineEditorDraft.label ?? `Ledger ${value}`;
                                        updateLineEditorDraft({
                                            ledgerGroupId: resolvedGroupId,
                                            ledgerId: value,
                                            ledgerOption: option ?? null,
                                            label: nextLabel
                                        });
                                    }}
                                    ledgerGroupId={lineEditorDraft.ledgerGroupId}
                                    onPreviewOptionChange={setLineEditorPreviewOption}
                                    onSelectNext={focusLineEditorAmountInput}
                                    excludeLedgerId={cashLedgerId ?? null}
                                    placeholder="Select ledger"
                                    loadingPlaceholder="Loading ledgers..."
                                    disabled={!isFormActive || saving}
                                    style={{ width: '100%' }}
                                    panelStyle={{ width: '20rem' }}
                                    ref={(element) => {
                                        lineEditorLedgerRef.current = element;
                                    }}
                                    appendTo={autoCompleteAppendTarget}
                                />
                            </AppNotchedField>
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--address">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-map-marker">Address</LabelWithIcon>}
                                className="app-notched-input--line-editor"
                                style={{ width: '100%' }}
                            >
                                <div className="app-notched-input__surface ledger-meta-address">
                                    <span className="text-700 text-sm">{displayedLineEditorAddress ?? 'Address not available'}</span>
                                </div>
                            </AppNotchedField>
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--drcr">
                            <AppNotchedField
                                label={<LabelWithIcon icon="pi-sort-alt">Dr/Cr</LabelWithIcon>}
                                className="app-notched-input--line-editor"
                                style={{ width: '100%' }}
                            >
                                <AppDrCrToggle
                                    value={DR_ONLY_VALUE}
                                    disabled
                                    className="app-entry-control app-entry-drcr"
                                />
                            </AppNotchedField>
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--amount">
                            <AppNotchedField
                                label={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount</LabelWithIcon>}
                                className="app-notched-input--line-editor"
                                style={{ width: '100%' }}
                            >
                                <AppInput
                                    inputType="number"
                                    value={lineEditorDraft.amount}
                                    onValueChange={(event) => {
                                        syncLineEditorAmountInput(undefined, (event.value as number | null) ?? null);
                                    }}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                    inputRef={(element) => {
                                        lineEditorAmountRef.current = element;
                                    }}
                                    inputStyle={{ width: '100%', textAlign: 'right' }}
                                    disabled={!isFormActive || saving}
                                    onKeyUp={(event) => {
                                        const target = event.currentTarget as HTMLInputElement | null;
                                        if (!target) return;
                                        window.setTimeout(() => {
                                            syncLineEditorAmountInput(target.value);
                                        }, 0);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        event.preventDefault();
                                        applyLineDraft();
                                    }}
                                />
                            </AppNotchedField>
                        </div>
                    </div>

                    <div className="app-entry-line-editor__actions">
                        <Button
                            label={lineEditorDraft.mode === 'edit' ? 'Update Line' : 'Add Line'}
                            icon={lineEditorDraft.mode === 'edit' ? 'pi pi-check' : 'pi pi-plus'}
                            className="app-action-compact app-action-compact--line p-button-sm"
                            onClick={applyLineDraft}
                            disabled={!isFormActive || saving || !isLineDraftValid}
                        />
                        <Button
                            label="Cancel"
                            icon="pi pi-times"
                            className="app-action-compact app-action-compact--line p-button-outlined p-button-sm"
                            onClick={cancelLineDraft}
                            disabled={!isFormActive || saving}
                        />
                    </div>
                </div>

                {renderFormError('debitLines')}
            </div>
        </div>
    );
}
