import React, { useMemo, useState } from 'react';
import type { AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import AppAutoComplete from '@/components/AppAutoComplete';
import type { InvoiceProduct } from '../types';

type ProductSearchOption = {
    label: string;
    value: number;
};

type InvoiceItemSearchProps = {
    products: InvoiceProduct[];
    onAddItem: (productId: number) => void;
    disabled?: boolean;
};

export function InvoiceItemSearch({ products, onAddItem, disabled }: InvoiceItemSearchProps) {
    const [value, setValue] = useState<ProductSearchOption | string | null>(null);
    const [suggestions, setSuggestions] = useState<ProductSearchOption[]>([]);

    const options = useMemo(
        () =>
            products.map((product) => ({
                label: `${product.name}${product.code ? ` • ${product.code}` : ''}${product.hsnCode ? ` • HSN ${product.hsnCode}` : ''}`,
                value: product.productId
            })),
        [products]
    );

    const applySelection = (productId: number | null) => {
        if (!productId) return;
        onAddItem(productId);
        setValue(null);
        setSuggestions([]);
    };

    const findBestMatch = (query: string) => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return null;
        return (
            products.find((product) => product.searchText.startsWith(normalized)) ??
            products.find((product) => product.searchText.includes(normalized)) ??
            null
        );
    };

    const complete = (event: AutoCompleteCompleteEvent) => {
        const query = event.query.trim().toLowerCase();
        if (!query) {
            setSuggestions(options.slice(0, 25));
            return;
        }
        const filtered = options.filter((option) => option.label.toLowerCase().includes(query));
        setSuggestions(filtered.slice(0, 25));
    };

    const handleAdd = () => {
        if (value && typeof value === 'object' && typeof value.value === 'number') {
            applySelection(value.value);
            return;
        }
        if (typeof value === 'string') {
            const match = findBestMatch(value);
            if (match) {
                applySelection(match.productId);
            }
        }
    };

    const handleChange = (event: AutoCompleteChangeEvent) => {
        const nextValue = event.value;
        if (typeof nextValue === 'string') {
            setValue(nextValue);
            return;
        }
        if (nextValue && typeof nextValue === 'object' && 'value' in nextValue) {
            const typed = nextValue as ProductSearchOption;
            setValue(typed);
            return;
        }
        setValue(null);
    };

    return (
        <div className="p-3 border-1 surface-border border-round mt-3">
            <div className="flex align-items-center justify-content-between gap-2 mb-2">
                <h4 className="m-0">Add Line Item Section</h4>
            </div>
            <div className="flex flex-column lg:flex-row align-items-stretch lg:align-items-center gap-2">
                <div className="flex-1">
                    <AppAutoComplete
                        value={value}
                        suggestions={suggestions}
                        completeMethod={complete}
                        onChange={handleChange}
                        dropdown={false}
                        field="label"
                        placeholder="Search item by name, code, or HSN"
                        className="w-full"
                        disabled={disabled}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            handleAdd();
                        }}
                    />
                </div>
                <Button
                    label="Add Item"
                    icon="pi pi-plus"
                    onClick={handleAdd}
                    disabled={disabled || products.length === 0}
                />
            </div>
        </div>
    );
}
