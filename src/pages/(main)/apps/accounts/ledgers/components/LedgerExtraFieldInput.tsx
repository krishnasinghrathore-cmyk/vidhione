import React from 'react';
import { Checkbox } from 'primereact/checkbox';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import { focusNextElement, resolveEnterScope } from '@/lib/enterNavigation';
import type { FiscalRange } from '@/lib/fiscalRange';
import { formatDateForStorage, parseExtraDateValue } from '../ledgerFormDate';
import type { FieldDefinition } from '../ledgerFormTypes';

type LedgerExtraFieldInputProps = {
    definition: FieldDefinition;
    value: any;
    errorMessage?: string;
    fiscalRange: FiscalRange;
    inputId?: string;
    onEnterNext?: () => boolean | void;
    onChange: (value: any) => void;
};

type ParsedOption = {
    label: string;
    value: any;
};

const parseOptions = (raw?: string | null): ParsedOption[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((option) =>
            typeof option === 'string'
                ? { label: option, value: option }
                : {
                      label: option.label ?? option.value ?? String(option),
                      value: option.value ?? option.label ?? String(option)
                  }
        );
    } catch {
        return [];
    }
};

export const LedgerExtraFieldInput = ({
    definition,
    value,
    errorMessage,
    fiscalRange,
    inputId,
    onEnterNext,
    onChange
}: LedgerExtraFieldInputProps) => {
    const requiredMark = definition.required ? <span className="p-error">*</span> : null;
    const handleCheckboxEnter = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' && event.key !== 'NumpadEnter') return;
        event.preventDefault();
        event.stopPropagation();
        if (!onEnterNext) {
            focusNextElement(event.currentTarget, resolveEnterScope(event.currentTarget));
            return;
        }
        const handled = onEnterNext();
        if (handled === true) return;
        focusNextElement(event.currentTarget, resolveEnterScope(event.currentTarget));
    };

    switch (definition.fieldType) {
        case 'number':
            return (
                <div className="flex flex-column gap-1">
                    <label className="font-medium">
                        {definition.label} {requiredMark}
                    </label>
                    <AppInput
                        inputType="number"
                        inputId={inputId}
                        value={typeof value === 'number' ? value : value != null ? Number(value) : null}
                        onValueChange={(e) => onChange(typeof e.value === 'number' ? e.value : null)}
                        onEnterNext={onEnterNext}
                        useGrouping={false}
                        maxFractionDigits={2}
                        placeholder={definition.label}
                        style={{ width: '100%' }}
                    />
                    {errorMessage && <small className="p-error">{errorMessage}</small>}
                </div>
            );
        case 'boolean':
            return (
                <div className="flex flex-column gap-2">
                    <label className="font-medium">
                        {definition.label} {requiredMark}
                    </label>
                    <div className="flex align-items-center gap-2">
                        <Checkbox
                            inputId={inputId ?? `extra-${definition.key}`}
                            checked={Boolean(value)}
                            onChange={(e) => onChange(e.checked)}
                            onKeyDown={handleCheckboxEnter}
                        />
                        <label htmlFor={inputId ?? `extra-${definition.key}`} className="text-600">
                            {definition.label}
                        </label>
                    </div>
                    {errorMessage && <small className="p-error">{errorMessage}</small>}
                </div>
            );
        case 'date':
            return (
                <div className="flex flex-column gap-1">
                    <label className="font-medium">
                        {definition.label} {requiredMark}
                    </label>
                    <AppDateInput
                        inputId={inputId}
                        value={parseExtraDateValue(value)}
                        onChange={(next) => onChange(next ? formatDateForStorage(next) : null)}
                        onEnterNext={onEnterNext}
                        placeholder="DD/MM/YYYY"
                        fiscalYearStart={fiscalRange.start ?? null}
                        fiscalYearEnd={fiscalRange.end ?? null}
                        enforceFiscalRange
                    />
                    {errorMessage && <small className="p-error">{errorMessage}</small>}
                </div>
            );
        case 'select':
            return (
                <div className="flex flex-column gap-1">
                    <label className="font-medium">
                        {definition.label} {requiredMark}
                    </label>
                    <AppDropdown
                        inputId={inputId}
                        value={value ?? null}
                        options={parseOptions(definition.options)}
                        onChange={(e) => onChange(e.value)}
                        onEnterNext={onEnterNext}
                        placeholder={`Select ${definition.label}`}
                        showClear
                        filter
                    />
                    {errorMessage && <small className="p-error">{errorMessage}</small>}
                </div>
            );
        case 'multi-select':
            return (
                <div className="flex flex-column gap-1">
                    <label className="font-medium">
                        {definition.label} {requiredMark}
                    </label>
                    <AppMultiSelect
                        inputId={inputId}
                        value={Array.isArray(value) ? value : []}
                        options={parseOptions(definition.options)}
                        onChange={(e) => onChange(e.value ?? [])}
                        onEnterNext={onEnterNext}
                        placeholder={`Select ${definition.label}`}
                        display="chip"
                    />
                    {errorMessage && <small className="p-error">{errorMessage}</small>}
                </div>
            );
        default:
            return (
                <div className="flex flex-column gap-1">
                    <label className="font-medium">
                        {definition.label} {requiredMark}
                    </label>
                    <AppInput
                        id={inputId}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        onEnterNext={onEnterNext}
                        placeholder={definition.label}
                    />
                    {errorMessage && <small className="p-error">{errorMessage}</small>}
                </div>
            );
    }
};
