import React, { useEffect, useMemo, useState } from 'react';
import AppAutoComplete from '@/components/AppAutoComplete';

export type AppAutoCompleteDropdownOption<TValue extends string | number = number> = {
    label: string;
    value: TValue;
};

type AppAutoCompleteDropdownProps<TValue extends string | number = number> = {
    value: TValue | null | undefined;
    options: AppAutoCompleteDropdownOption<TValue>[];
    onChange: (event: { value: TValue | null }) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    showClear?: boolean;
    dropdown?: boolean;
    filter?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
};

const normalizeText = (value: string | number | null | undefined) => String(value ?? '').trim().toLowerCase();

export default function AppAutoCompleteDropdown<TValue extends string | number = number>({
    value,
    options,
    onChange,
    placeholder,
    className,
    disabled,
    showClear = true,
    dropdown = true,
    filter = true,
    onKeyDown
}: AppAutoCompleteDropdownProps<TValue>) {
    const [suggestions, setSuggestions] = useState<AppAutoCompleteDropdownOption<TValue>[]>(options);

    useEffect(() => {
        setSuggestions(options);
    }, [options]);

    const selectedOption = useMemo(() => {
        const selected = options.find((option) => option.value === value) ?? null;
        if (selected) return selected;
        if (value == null) return null;
        return {
            label: String(value),
            value
        } satisfies AppAutoCompleteDropdownOption<TValue>;
    }, [options, value]);

    return (
        <AppAutoComplete
            value={selectedOption}
            suggestions={suggestions}
            completeMethod={(event) => {
                if (!filter) {
                    setSuggestions(options);
                    return;
                }
                const query = normalizeText(event.query);
                if (!query) {
                    setSuggestions(options);
                    return;
                }
                setSuggestions(
                    options.filter((option) => normalizeText(option.label).includes(query))
                );
            }}
            field="label"
            forceSelection
            dropdown={dropdown}
            showClear={showClear}
            placeholder={placeholder}
            className={className}
            disabled={disabled}
            onChange={(event) => {
                const nextValue = event.value;
                if (!nextValue || typeof nextValue !== 'object' || !('value' in nextValue)) {
                    onChange({ value: null });
                    return;
                }
                onChange({
                    value: (nextValue as AppAutoCompleteDropdownOption<TValue>).value
                });
            }}
            onKeyDown={onKeyDown}
        />
    );
}
