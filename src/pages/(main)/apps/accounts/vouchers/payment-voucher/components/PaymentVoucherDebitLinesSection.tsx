'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import AppDataTable from '@/components/AppDataTable';
import AppInput from '@/components/AppInput';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import type { LedgerOption } from '@/lib/accounts/ledgerOptions';
import { LabelWithIcon } from './LabelWithIcon';
import type { DebitLineDraft } from '../types';
import type { PaymentVoucherViewProps } from '../usePaymentVoucherState';
import {
    AMOUNT_CURRENCY_ICON,
    AMOUNT_CURRENCY_SYMBOL,
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
        focusLineEditorAmountInput,
        syncLineEditorAmountInput,
        paymentAgainstAddressMap,
        ledgerGroupOptions,
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
    const lineEditorModeLabel = lineEditorDraft.mode === 'edit' ? 'Editing selected line' : 'Adding new line';

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
                        headerClassName="text-center"
                        body={(line: DebitLineDraft) => (
                            <span>{line.ledgerGroupId != null ? (ledgerGroupLabelMap.get(Number(line.ledgerGroupId)) ?? `Group ${line.ledgerGroupId}`) : '-'}</span>
                        )}
                        style={{ width: '12rem' }}
                    />
                    <Column
                        header={<LabelWithIcon icon="pi-wallet">Ledger (Dr)</LabelWithIcon>}
                        headerClassName="text-center"
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
                        headerClassName="text-center"
                        body={() => <span className="text-700">Dr</span>}
                        style={{ width: '5rem' }}
                    />
                    <Column
                        header={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount</LabelWithIcon>}
                        headerClassName="text-right"
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

                <div className="app-entry-line-editor">
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
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-sitemap">Ledger Group</LabelWithIcon>
                            </label>
                            <LedgerGroupAutoComplete
                                value={lineEditorDraft.ledgerGroupId}
                                onChange={(nextValue) => {
                                    updateLineEditorDraft({
                                        ledgerGroupId: nextValue,
                                        ledgerId: null,
                                        ledgerOption: null,
                                        label: null
                                    });
                                }}
                                placeholder="Ledger group"
                                loadingPlaceholder="Loading groups..."
                                onSelectNext={() => lineEditorLedgerRef.current?.focus?.()}
                                style={{ width: '100%' }}
                                panelStyle={{ width: '16rem' }}
                                disabled={!isFormActive || saving}
                                appendTo={autoCompleteAppendTarget}
                                ref={(element) => {
                                    lineEditorLedgerGroupRef.current = element;
                                }}
                            />
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--ledger">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-wallet">Ledger (Dr)</LabelWithIcon>
                            </label>
                            <LedgerAutoComplete
                                variant="purpose"
                                purpose="PAYMENT-AGAINST"
                                value={lineEditorDraft.ledgerId}
                                selectedOption={lineEditorDraft.ledgerOption ?? lineEditorFallbackOption}
                                onChange={(value, option) => {
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
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--address">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-map-marker">Address</LabelWithIcon>
                            </label>
                            <div className="flex align-items-center gap-2 ledger-meta-panel">
                                <div className="flex align-items-center border-1 surface-border border-round surface-card px-3 py-2 ledger-meta-address">
                                    <span className="text-700 text-sm">{lineEditorAddress ?? 'Address not available'}</span>
                                </div>
                                {lineEditorBalanceLabel && (
                                    <div className="flex align-items-center gap-2 ledger-meta-balance">
                                        <span className={`text-sm font-semibold ${lineEditorBalanceClass}`}>
                                            {lineEditorBalanceLabel}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--drcr">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon="pi-sort-alt">Dr/Cr</LabelWithIcon>
                            </label>
                            <div className="app-entry-control app-entry-drcr border-1 surface-border border-round surface-card px-3 py-2 text-center">
                                <span className="text-700">Dr</span>
                            </div>
                        </div>

                        <div className="app-entry-line-editor__field app-entry-line-editor__field--amount">
                            <label className="block text-600 mb-1">
                                <LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount</LabelWithIcon>
                            </label>
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
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    applyLineDraft();
                                }}
                            />
                        </div>
                    </div>

                    <div className="app-entry-line-editor__actions">
                        <Button
                            label={lineEditorDraft.mode === 'edit' ? 'Update Line' : 'Add Line'}
                            icon={lineEditorDraft.mode === 'edit' ? 'pi pi-check' : 'pi pi-plus'}
                            className="app-action-compact"
                            onClick={applyLineDraft}
                            disabled={!isFormActive || saving || !isLineDraftValid}
                        />
                        <Button
                            label="Cancel"
                            icon="pi pi-times"
                            className="app-action-compact p-button-outlined"
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
