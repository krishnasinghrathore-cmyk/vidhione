import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from 'react';
import type {
    AutoComplete,
    AutoCompleteChangeEvent,
    AutoCompleteCompleteEvent
} from 'primereact/autocomplete';
import AppAutoComplete from '@/components/AppAutoComplete';
import { useVoucherTypeOptions, type VoucherTypeOption } from '@/lib/accounts/voucherTypes';

type VoucherTypeAutoCompleteProps = Omit<
    React.ComponentProps<typeof AppAutoComplete>,
    'value' | 'suggestions' | 'completeMethod' | 'onChange' | 'field'
> & {
    value: number | null;
    onChange: (value: number | null, option?: VoucherTypeOption | null) => void;
    options?: VoucherTypeOption[];
    loading?: boolean;
    loadingPlaceholder?: string;
    onSelectNext?: () => void;
    skip?: boolean;
};

const VoucherTypeAutoComplete = forwardRef<AutoComplete, VoucherTypeAutoCompleteProps>((
    {
        value,
        onChange,
        options: optionsProp,
        loading: loadingProp,
        loadingPlaceholder,
        onSelectNext,
        placeholder,
        onBlur,
        onFocus,
        onKeyDown,
        onKeyDownCapture,
        onDropdownClick,
        autoHighlight,
        disabled,
        readOnly,
        skip,
        ...rest
    },
    ref
) => {
    const autoCompleteRef = useRef<AutoComplete | null>(null);
    useImperativeHandle(ref, () => autoCompleteRef.current as AutoComplete);

    const { options: queryOptions, loading: queryLoading } = useVoucherTypeOptions({
        skip: skip || Boolean(optionsProp)
    });

    const options = optionsProp ?? queryOptions;
    const loading = loadingProp ?? queryLoading;
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<VoucherTypeOption[]>([]);

    const selectedOption = useMemo(
        () => (value == null ? null : options.find((option) => Number(option.value) === Number(value)) ?? null),
        [options, value]
    );

    useEffect(() => {
        if (!query) {
            setSuggestions(options);
        }
    }, [options, query]);

    const filterOptions = (input: string) => {
        const needle = input.trim().toLowerCase();
        if (!needle) return options;
        return options.filter((option) => option.label.toLowerCase().includes(needle));
    };

    const handleComplete = (event: AutoCompleteCompleteEvent) => {
        const nextQuery = event.query ?? '';
        setQuery(nextQuery);
        setSuggestions(filterOptions(nextQuery));
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value as VoucherTypeOption | string | null;
        if (nextValue == null) {
            setQuery('');
            onChange(null, null);
            return;
        }
        if (typeof nextValue === 'string') {
            setQuery(nextValue);
            if (!nextValue.trim()) {
                onChange(null, null);
            }
            return;
        }
        setQuery('');
        onChange(nextValue.value ?? null, nextValue);
        if (onSelectNext) {
            window.setTimeout(onSelectNext, 0);
        }
    };

    const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
        onBlur?.(event);
        setQuery('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onSelectNext) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (overlayVisible) return;
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(onSelectNext, 0);
    };

    const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        onKeyDownCapture?.(event);
        if (event.defaultPrevented || event.key !== 'Enter' || !onSelectNext) return;
        const overlay = autoCompleteRef.current?.getOverlay?.();
        const overlayVisible = Boolean(overlay && overlay.offsetParent !== null);
        if (!overlayVisible) return;
        if (query.trim().length > 0) return;
        const highlighted = overlay?.querySelector(
            'li[data-p-highlight="true"], li.p-highlight, li[aria-selected="true"]'
        );
        if (highlighted) return;
        event.preventDefault();
        event.stopPropagation();
        autoCompleteRef.current?.hide?.();
        window.setTimeout(onSelectNext, 0);
    };

    const handleDropdownClick = (event: any) => {
        onDropdownClick?.(event);
        setQuery('');
        setSuggestions([...options]);
    };

    const displayValue = query.length ? query : selectedOption;
    const resolvedPlaceholder = loading
        ? loadingPlaceholder ?? 'Loading voucher types...'
        : placeholder ?? 'Select voucher type';

    return (
        <AppAutoComplete
            {...rest}
            ref={autoCompleteRef}
            value={displayValue}
            suggestions={suggestions}
            completeMethod={handleComplete}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={onFocus}
            onKeyDown={handleKeyDown}
            onKeyDownCapture={handleKeyDownCapture}
            onDropdownClick={handleDropdownClick}
            field="label"
            loading={loading}
            showLoadingIcon
            showEmptyMessage
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            readOnly={readOnly}
            autoHighlight={autoHighlight ?? query.trim().length > 0}
        />
    );
});

VoucherTypeAutoComplete.displayName = 'VoucherTypeAutoComplete';

export default VoucherTypeAutoComplete;
