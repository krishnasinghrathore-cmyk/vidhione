'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import AppDrCrToggle from '@/components/AppDrCrToggle';
import AppInput from '@/components/AppInput';
import { AppNotchedField } from '@/components/AppNotchedField';
import LedgerAutoComplete from '@/components/LedgerAutoComplete';
import LedgerGroupAutoComplete from '@/components/LedgerGroupAutoComplete';
import type { LedgerOption } from '@/lib/accounts/ledgerOptions';
import { LabelWithIcon } from './LabelWithIcon';
import type { DebitLineDraft } from '../types';
import type { VoucherViewProps } from '../useVoucherState';
import {
    AMOUNT_CURRENCY_ICON,
    formatAmount,
    resolveAddress
} from '../utils';

type VoucherDebitLinesSectionProps = {
    viewProps: VoucherViewProps;
    renderFormError: (key: string) => React.ReactNode;
};

type AutoPostingSummaryRow = {
    key: string;
    ledgerId: number | null;
    ledgerGroupLabel: string;
    ledgerLabel: string;
    drCrLabel: 'Dr' | 'Cr';
    amount: number;
    narrationText: string | null;
};

export function VoucherDebitLinesSection({
    viewProps,
    renderFormError
}: VoucherDebitLinesSectionProps) {
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
        lineSectionTitle,
        lineEntryLedgerLabel,
        allowLineDrCrSelection,
        lineEntryDrCrLabel,
        lineEntryPurpose,
        differenceSummaryLabel,
        lineEntryTotalLabel,
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
        cashLedgerId,
        cashLedgerOption,
        cashLedgerGroupLabel,
        paymentLedgerLabel,
        headerDrCrLabel,
        effectivePrimaryLedgerAmount,
        supplementaryHeaderPostingLinesDisplay,
        isLineEditorLocked
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
    const lineEntryDrCrValue = Number(lineEditorDraft.drCrFlag) === 1 ? 'Cr' : 'Dr';
    const resolveDrCrLabel = React.useCallback(
        (drCrFlag: number | null | undefined): 'Dr' | 'Cr' => (Number(drCrFlag) === 1 ? 'Cr' : 'Dr'),
        []
    );
    const debitLinesGridRef = React.useRef<HTMLDivElement | null>(null);
    const lineEditorDrCrToggleRef = React.useRef<HTMLButtonElement | null>(null);

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
            if (isLineEditorLocked) return;
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
        [isLineEditorLocked, lines, selectedLineKey, setSelectedLineKey, startEditLine]
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
    const focusLineEditorDrCrToggle = React.useCallback(() => {
        if (!allowLineDrCrSelection || !isFormActive || saving) return false;
        const toggle = lineEditorDrCrToggleRef.current;
        if (!toggle || toggle.disabled) return false;
        toggle.focus();
        return document.activeElement === toggle;
    }, [allowLineDrCrSelection, isFormActive, saving]);
    const focusLineEditorAfterLedgerSelect = React.useCallback(() => {
        if (!allowLineDrCrSelection) {
            focusLineEditorAmountInput();
            return;
        }
        window.setTimeout(() => {
            if (focusLineEditorDrCrToggle()) return;
            focusLineEditorAmountInput();
        }, 0);
    }, [allowLineDrCrSelection, focusLineEditorAmountInput, focusLineEditorDrCrToggle]);

    const differenceFooter = <span className="text-600">{differenceSummaryLabel}: <strong>{differenceLabel}</strong></span>;

    const totalFooter = (
        <span className="text-600">
            {`${lineEntryTotalLabel}: `}<strong>{formatAmount(totalDebit)}</strong>
        </span>
    );

    const normalizedLineEntryDrCrLabel: 'Dr' | 'Cr' = lineEntryDrCrLabel === 'Cr' ? 'Cr' : 'Dr';
    const normalizedHeaderDrCrLabel: 'Dr' | 'Cr' = headerDrCrLabel === 'Cr' ? 'Cr' : 'Dr';
    const autoPostingSummaryRows = React.useMemo<AutoPostingSummaryRow[]>(() => {
        const rowsByKey = new Map<string, AutoPostingSummaryRow>();
        const buildRowKey = (ledgerId: number | null, ledgerLabel: string, drCrLabel: 'Dr' | 'Cr') => {
            const normalizedLedgerLabel = (ledgerLabel || '').trim().toLowerCase();
            const ledgerIdentity = ledgerId != null ? `id:${ledgerId}` : `label:${normalizedLedgerLabel}`;
            return `${ledgerIdentity}|${drCrLabel}`;
        };
        const appendRow = (row: AutoPostingSummaryRow) => {
            const rowKey = buildRowKey(row.ledgerId, row.ledgerLabel, row.drCrLabel);
            const existing = rowsByKey.get(rowKey);
            if (!existing) {
                rowsByKey.set(rowKey, row);
                return;
            }
            existing.amount += Number(row.amount || 0);
            if (!existing.ledgerGroupLabel && row.ledgerGroupLabel) {
                existing.ledgerGroupLabel = row.ledgerGroupLabel;
            }
            const currentNarration = (existing.narrationText ?? '').trim();
            const nextNarration = (row.narrationText ?? '').trim();
            if (!currentNarration && nextNarration) {
                existing.narrationText = nextNarration;
                return;
            }
            if (currentNarration && nextNarration && currentNarration !== nextNarration) {
                existing.narrationText = 'Multiple auto entries';
            }
        };

        lines.forEach((line, index) => {
            const amount = Number(line.amount ?? 0);
            if (!Number.isFinite(amount) || amount <= 0) return;
            const ledgerId = line.ledgerId != null ? Number(line.ledgerId) : null;
            const fallbackLineDrCrFlag = normalizedLineEntryDrCrLabel === 'Cr' ? 1 : 0;
            const ledgerLabel =
                line.label ?? line.ledgerOption?.label ?? (ledgerId != null ? `Ledger ${ledgerId}` : '-');
            appendRow({
                key: `entry-${line.key || index}`,
                ledgerId,
                ledgerGroupLabel:
                    line.ledgerGroupId != null
                        ? (ledgerGroupLabelMap.get(Number(line.ledgerGroupId)) ?? `Group ${line.ledgerGroupId}`)
                        : '-',
                ledgerLabel,
                drCrLabel: resolveDrCrLabel(line.drCrFlag ?? fallbackLineDrCrFlag),
                amount,
                narrationText: null
            });
        });

        const primaryPostingAmount = Number(effectivePrimaryLedgerAmount ?? 0);
        if (cashLedgerId != null && Number.isFinite(primaryPostingAmount) && primaryPostingAmount > 0) {
            appendRow({
                key: 'primary-ledger',
                ledgerId: Number(cashLedgerId),
                ledgerGroupLabel: cashLedgerGroupLabel ?? '-',
                ledgerLabel: cashLedgerOption?.label?.trim() || paymentLedgerLabel || `Ledger ${cashLedgerId}`,
                drCrLabel: normalizedHeaderDrCrLabel,
                amount: primaryPostingAmount,
                narrationText: null
            });
        }

        supplementaryHeaderPostingLinesDisplay.forEach((line, index) => {
            const amount = Number(line.amount ?? 0);
            if (!Number.isFinite(amount) || amount <= 0) return;
            const drCrLabel: 'Dr' | 'Cr' = line.drCrLabel === 'Cr' ? 'Cr' : 'Dr';
            const ledgerId = line.ledgerId != null ? Number(line.ledgerId) : null;
            const ledgerLabel = line.ledgerLabel || (ledgerId != null ? `Ledger ${ledgerId}` : '-');
            appendRow({
                key: `supp-${line.ledgerId ?? index}-${index}`,
                ledgerId,
                ledgerGroupLabel: line.ledgerGroupLabel || '-',
                ledgerLabel,
                drCrLabel,
                amount,
                narrationText: line.narrationText ?? null
            });
        });

        return Array.from(rowsByKey.values()).sort((left, right) => {
            if (left.drCrLabel !== right.drCrLabel) {
                return left.drCrLabel === 'Dr' ? -1 : 1;
            }
            return left.key.localeCompare(right.key);
        });
    }, [
        cashLedgerId,
        cashLedgerGroupLabel,
        cashLedgerOption?.label,
        effectivePrimaryLedgerAmount,
        ledgerGroupLabelMap,
        lines,
        normalizedHeaderDrCrLabel,
        normalizedLineEntryDrCrLabel,
        paymentLedgerLabel,
        resolveDrCrLabel,
        supplementaryHeaderPostingLinesDisplay
    ]);
    const sortedSupplementaryHeaderPostingLines = React.useMemo(
        () =>
            [...supplementaryHeaderPostingLinesDisplay].sort((left, right) => {
                const leftDrCr = left.drCrLabel === 'Dr' ? 'Dr' : 'Cr';
                const rightDrCr = right.drCrLabel === 'Dr' ? 'Dr' : 'Cr';
                if (leftDrCr !== rightDrCr) {
                    return leftDrCr === 'Dr' ? -1 : 1;
                }
                const leftLedger = String(left.ledgerLabel ?? '').trim();
                const rightLedger = String(right.ledgerLabel ?? '').trim();
                return leftLedger.localeCompare(rightLedger);
            }),
        [supplementaryHeaderPostingLinesDisplay]
    );

    const autoPostingTotals = React.useMemo(
        () =>
            autoPostingSummaryRows.reduce(
                (summary, row) => {
                    if (row.drCrLabel === 'Dr') {
                        summary.dr += Number(row.amount || 0);
                    } else {
                        summary.cr += Number(row.amount || 0);
                    }
                    return summary;
                },
                { dr: 0, cr: 0 }
            ),
        [autoPostingSummaryRows]
    );
    const autoPostingDifference = autoPostingTotals.dr - autoPostingTotals.cr;
    const autoPostingDifferenceLabel = `${formatAmount(Math.abs(autoPostingDifference))} ${autoPostingDifference >= 0 ? 'Dr' : 'Cr'}`;
    const entrySectionTitle = isLineEditorLocked ? 'Auto Posting' : lineSectionTitle;

    if (isLineEditorLocked) {
        return (
            <div className="app-entry-section app-entry-section--lines">
                <div className="app-entry-lines">
                    <div className="app-entry-lines-header">
                        <div className="app-entry-lines-title">
                            <LabelWithIcon icon="pi-list">{entrySectionTitle}</LabelWithIcon>
                        </div>
                    </div>

                    <small className="text-600">
                        Bill-wise mode is enabled. Posting lines are auto-generated from selected bills.
                    </small>

                    <div className="app-entry-preserved-lines">
                        <div className="app-entry-preserved-lines__title">
                            <LabelWithIcon icon="pi-info-circle">Auto Posting Summary</LabelWithIcon>
                        </div>
                        <DataTable
                            value={autoPostingSummaryRows}
                            dataKey="key"
                            size="small"
                            stripedRows
                            className="app-entry-lines-table app-entry-lines-table--auto-postings"
                            emptyMessage="Select party ledger and bills to generate auto postings."
                        >
                            <Column
                                header={<LabelWithIcon icon="pi-sitemap">Ledger Group</LabelWithIcon>}
                                headerClassName="app-entry-header-left"
                                body={(row: AutoPostingSummaryRow) => <span>{row.ledgerGroupLabel || '-'}</span>}
                                style={{ width: '12rem' }}
                            />
                            <Column
                                header={<LabelWithIcon icon="pi-wallet">Ledger</LabelWithIcon>}
                                headerClassName="app-entry-header-left"
                                body={(row: AutoPostingSummaryRow) => (
                                    <div className="flex flex-column gap-1">
                                        <span>{row.ledgerLabel}</span>
                                        {row.narrationText ? (
                                            <span className="text-600 text-sm">{row.narrationText}</span>
                                        ) : null}
                                    </div>
                                )}
                                style={{ width: '20rem' }}
                            />
                            <Column
                                header={<LabelWithIcon icon="pi-sort-alt">Dr/Cr</LabelWithIcon>}
                                headerClassName="app-entry-header-center"
                                body={(row: AutoPostingSummaryRow) => <span className="text-700">{row.drCrLabel}</span>}
                                style={{ width: '5rem', textAlign: 'center' }}
                            />
                            <Column
                                header={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount</LabelWithIcon>}
                                headerClassName="app-entry-header-right"
                                body={(row: AutoPostingSummaryRow) => <span>{formatAmount(Number(row.amount ?? 0))}</span>}
                                style={{ width: '9rem', textAlign: 'right' }}
                            />
                        </DataTable>
                    </div>

                    <div className="app-entry-auto-posting-totals">
                        <span>
                            <strong>Total Dr:</strong> {formatAmount(autoPostingTotals.dr)}
                        </span>
                        <span>
                            <strong>Total Cr:</strong> {formatAmount(autoPostingTotals.cr)}
                        </span>
                        <span>
                            <strong>Difference:</strong> {autoPostingDifferenceLabel}
                        </span>
                    </div>

                    {renderFormError('debitLines')}
                </div>
            </div>
        );
    }

    return (
        <div className="app-entry-section app-entry-section--lines">
            <div className="app-entry-lines">
                <div className="app-entry-lines-header">
                    <div className="app-entry-lines-title">
                        <LabelWithIcon icon="pi-list">{entrySectionTitle}</LabelWithIcon>
                    </div>
                </div>

                <div
                    ref={debitLinesGridRef}
                    tabIndex={0}
                    className="app-entry-lines-grid"
                    onKeyDown={handleDebitLinesGridKeyDown}
                    onKeyDownCapture={handleDebitLinesGridKeyDown}
                >
                    <DataTable
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
                        emptyMessage="No lines added yet."
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
                            header={<LabelWithIcon icon="pi-wallet">{lineEntryLedgerLabel}</LabelWithIcon>}
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
                                body={(line: DebitLineDraft) => (
                                    <span className="text-700">
                                        {allowLineDrCrSelection ? resolveDrCrLabel(line.drCrFlag) : lineEntryDrCrLabel}
                                    </span>
                                )}
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
                            body={(line: DebitLineDraft) =>
                                isLineEditorLocked ? (
                                    <span className="text-600 text-sm">Auto</span>
                                ) : (
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
                                )
                            }
                            style={{ width: '6rem' }}
                        />
                    </DataTable>
                </div>

                {sortedSupplementaryHeaderPostingLines.length > 0 ? (
                    <div className="app-entry-preserved-lines">
                        <div className="app-entry-preserved-lines__title">
                            <LabelWithIcon icon="pi-info-circle">Auto Account Postings</LabelWithIcon>
                        </div>
                        <DataTable
                            value={sortedSupplementaryHeaderPostingLines}
                            size="small"
                            stripedRows
                            className="app-entry-lines-table app-entry-lines-table--auto-postings"
                        >
                            <Column
                                header={<LabelWithIcon icon="pi-sitemap">Ledger Group</LabelWithIcon>}
                                headerClassName="app-entry-header-left"
                                body={(line: any) => <span>{line.ledgerGroupLabel || '-'}</span>}
                                style={{ width: '12rem' }}
                            />
                            <Column
                                header={<LabelWithIcon icon="pi-wallet">{lineEntryLedgerLabel}</LabelWithIcon>}
                                headerClassName="app-entry-header-left"
                                body={(line: any) => (
                                    <div className="flex flex-column gap-1">
                                        <span>{line.ledgerLabel}</span>
                                        {line.narrationText ? <span className="text-600 text-sm">{line.narrationText}</span> : null}
                                    </div>
                                )}
                                style={{ width: '20rem' }}
                            />
                            <Column
                                header={<LabelWithIcon icon="pi-sort-alt">Dr/Cr</LabelWithIcon>}
                                headerClassName="app-entry-header-center"
                                body={(line: any) => <span className="text-700">{line.drCrLabel}</span>}
                                style={{ width: '5rem', textAlign: 'center' }}
                            />
                            <Column
                                header={<LabelWithIcon icon={AMOUNT_CURRENCY_ICON}>Amount</LabelWithIcon>}
                                headerClassName="app-entry-header-right"
                                body={(line: any) => <span>{formatAmount(Number(line.amount ?? 0))}</span>}
                                style={{ width: '9rem', textAlign: 'right' }}
                            />
                            <Column
                                header={<LabelWithIcon icon="pi-cog">Actions</LabelWithIcon>}
                                headerClassName="text-center"
                                body={() => <span className="text-600 text-sm">Auto</span>}
                                style={{ width: '6rem', textAlign: 'center' }}
                            />
                        </DataTable>
                    </div>
                ) : null}

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
                                label={<LabelWithIcon icon="pi-wallet">{lineEntryLedgerLabel}</LabelWithIcon>}
                                className="app-notched-input--line-editor"
                                style={{ width: '100%' }}
                            >
                                <LedgerAutoComplete
                                    variant="purpose"
                                    purpose={lineEntryPurpose}
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
                                    onSelectNext={focusLineEditorAfterLedgerSelect}
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
                                    value={lineEntryDrCrValue}
                                    onChange={(nextValue) => {
                                        if (!allowLineDrCrSelection) return;
                                        updateLineEditorDraft({ drCrFlag: nextValue === 'Cr' ? 1 : 0 });
                                    }}
                                    disabled={!allowLineDrCrSelection || !isFormActive || saving}
                                    className="app-entry-control app-entry-drcr"
                                    ref={lineEditorDrCrToggleRef}
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
