import React from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { classNames } from 'primereact/utils';

type DiscountMode = 'RATE' | 'AMOUNT';

type DiscountSplitInputProps = {
    mode: DiscountMode;
    rateLabel: string;
    amountLabel?: string;
    rateValue: number | null;
    amountValue: number | null;
    onRateChange: (value: number) => void;
    onAmountChange: (value: number) => void;
    onToggleToRate: () => void;
    onToggleToAmount: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onKeyDownFallback?: (event: React.KeyboardEvent<HTMLElement>) => void;
    maxFractionDigits?: number;
    rateMax?: number;
};

const focusPairedSplitInput = (sourceInput: HTMLInputElement | null) => {
    if (!sourceInput) return;
    const splitEntry = sourceInput.closest('.invoice-line-editor__split-entry');
    if (!(splitEntry instanceof HTMLElement)) return;
    const inputs = Array.from(splitEntry.querySelectorAll<HTMLInputElement>('input')).filter((input) => !input.disabled);
    if (inputs.length < 2) return;
    const currentIndex = inputs.indexOf(sourceInput);
    if (currentIndex < 0) return;
    const pairedInput = inputs[currentIndex === 0 ? 1 : 0];
    if (!pairedInput) return;
    pairedInput.focus();
    pairedInput.select();
};

export function DiscountSplitInput({
    mode,
    rateLabel,
    amountLabel = 'Amt',
    rateValue,
    amountValue,
    onRateChange,
    onAmountChange,
    onToggleToRate,
    onToggleToAmount,
    onFocus,
    onBlur,
    onKeyDownFallback,
    maxFractionDigits = 2,
    rateMax = 99.99
}: DiscountSplitInputProps) {
    const handleSplitKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'F3') {
            event.preventDefault();
            const sourceInput = event.currentTarget;
            if (mode === 'RATE') {
                onToggleToAmount();
            } else {
                onToggleToRate();
            }
            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => {
                    focusPairedSplitInput(sourceInput);
                });
            }
            return;
        }
        onKeyDownFallback?.(event as unknown as React.KeyboardEvent<HTMLElement>);
    };

    return (
        <>
            <div className="invoice-line-editor__split-caption" aria-hidden="true">
                <span className="invoice-line-editor__split-caption-item">{rateLabel}</span>
                <span className="invoice-line-editor__split-caption-item">{amountLabel}</span>
            </div>
            <div className="invoice-line-editor__split-entry">
                <InputNumber
                    value={rateValue}
                    onValueChange={(event) => onRateChange(event.value != null ? Number(event.value) : 0)}
                    className={classNames('app-input invoice-line-editor__control invoice-line-editor__split-input', {
                        'invoice-line-editor__split-input--active': mode === 'RATE'
                    })}
                    min={0}
                    max={rateMax}
                    maxFractionDigits={maxFractionDigits}
                    format={false}
                    useGrouping={false}
                    readOnly={mode !== 'RATE'}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={handleSplitKeyDown}
                />
                <InputNumber
                    value={amountValue}
                    onValueChange={(event) => onAmountChange(event.value != null ? Number(event.value) : 0)}
                    className={classNames('app-input invoice-line-editor__control invoice-line-editor__split-input', {
                        'invoice-line-editor__split-input--active invoice-line-editor__control--amount-mode': mode === 'AMOUNT'
                    })}
                    min={0}
                    maxFractionDigits={maxFractionDigits}
                    format={false}
                    useGrouping={false}
                    readOnly={mode !== 'AMOUNT'}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={handleSplitKeyDown}
                />
            </div>
        </>
    );
}
