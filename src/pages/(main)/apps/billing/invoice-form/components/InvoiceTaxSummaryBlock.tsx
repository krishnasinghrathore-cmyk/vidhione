import React from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import { formatAmount } from '../../helpers';
import type { TaxSummaryRow } from '../types';
import type { LedgerSummary } from '../../useLedgerLookup';

type TaxLedgerOption = {
    label: string;
    value: number;
};

type InvoiceTaxSummaryBlockProps = {
    taxSummaryRows: TaxSummaryRow[];
    ledgerById: Map<number, LedgerSummary>;
    taxLedgerOptions?: TaxLedgerOption[];
    taxAddTotal: number;
    taxLessTotal: number;
    allowTaxLessEdit?: boolean;
    disabled?: boolean;
    onTaxLessChange: (args: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => void;
    onResetTaxLess?: () => void;
};

export function InvoiceTaxSummaryBlock({
    taxSummaryRows,
    ledgerById,
    taxLedgerOptions = [],
    taxAddTotal,
    taxLessTotal,
    allowTaxLessEdit = false,
    disabled,
    onTaxLessChange,
    onResetTaxLess
}: InvoiceTaxSummaryBlockProps) {
    const taxLabelByLedgerId = React.useMemo(() => {
        const map = new Map<number, string>();
        taxLedgerOptions.forEach((option) => {
            const ledgerId = Number(option.value);
            if (!Number.isFinite(ledgerId) || ledgerId <= 0) return;
            map.set(ledgerId, option.label);
        });
        return map;
    }, [taxLedgerOptions]);

    return (
        <div className="invoice-summary-card invoice-summary-card--compact">
            <div className="flex align-items-center justify-content-between gap-2 mb-2">
                <h4 className="m-0 invoice-summary-card__title">Tax Summary</h4>
                {allowTaxLessEdit ? (
                    <Button
                        type="button"
                        label="Clear Less"
                        text
                        className="app-action-compact"
                        onClick={onResetTaxLess}
                        disabled={disabled || taxSummaryRows.length === 0}
                    />
                ) : null}
            </div>
            <DataTable
                value={taxSummaryRows}
                dataKey="ledgerId"
                responsiveLayout="scroll"
                size="small"
                className="invoice-tax-summary-table"
            >
                <Column
                    header="Tax"
                    body={(row: { ledgerId: number }) =>
                        ledgerById.get(row.ledgerId)?.name ||
                        taxLabelByLedgerId.get(row.ledgerId) ||
                        `Ledger ${row.ledgerId}`
                    }
                    footer={<span className="invoice-tax-summary-table__total-label">Total</span>}
                />
                <Column
                    header="Add"
                    body={(row: { addAmount: number }) => (
                        <span className="invoice-tax-summary-table__amount">{formatAmount(row.addAmount)}</span>
                    )}
                    footer={<span className="invoice-tax-summary-table__amount invoice-tax-summary-table__amount--total">{formatAmount(taxAddTotal)}</span>}
                    style={{ width: '7.2rem' }}
                />
                <Column
                    header="Less"
                    body={(row: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) =>
                        allowTaxLessEdit ? (
                            <InputNumber
                                value={row.lessAmount}
                                onValueChange={(event) =>
                                    onTaxLessChange({
                                        ledgerId: row.ledgerId,
                                        lessAmount: Number(event.value ?? 0),
                                        addAmount: Number(row.addAmount ?? 0),
                                        taxableAmount: Number(row.taxableAmount ?? 0)
                                    })
                                }
                                className="invoice-tax-summary-less-input"
                                min={0}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                disabled={disabled}
                            />
                        ) : (
                            <span className="invoice-tax-summary-table__amount">{formatAmount(row.lessAmount)}</span>
                        )
                    }
                    footer={<span className="invoice-tax-summary-table__amount invoice-tax-summary-table__amount--total">{formatAmount(taxLessTotal)}</span>}
                    style={{ width: '7.2rem' }}
                />
            </DataTable>
        </div>
    );
}
