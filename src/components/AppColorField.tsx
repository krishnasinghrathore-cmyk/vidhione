import React from 'react';
import AppInput from '@/components/AppInput';

type AppColorFieldProps = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onEnterNext?: () => boolean | void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
};

const normalizeColorValue = (value: string) => {
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
    return '#10b981';
};

export default function AppColorField({
    id,
    value,
    onChange,
    onEnterNext,
    placeholder = '#10B981',
    disabled,
    className,
    style
}: AppColorFieldProps) {
    const previewColor = normalizeColorValue(value);

    return (
        <div className={`flex align-items-center gap-2 ${className ?? ''}`.trim()} style={style}>
            <AppInput
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onEnterNext={onEnterNext}
                placeholder={placeholder}
                disabled={disabled}
                style={{ flex: 1 }}
            />
            <span
                aria-hidden="true"
                style={{
                    width: '1.75rem',
                    height: '1.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    background: previewColor,
                    flex: '0 0 auto'
                }}
            />
            <input
                aria-label="Select color"
                type="color"
                value={previewColor}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                style={{
                    width: '2.5rem',
                    height: '2rem',
                    padding: 0,
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    borderRadius: '6px',
                    background: 'transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                }}
            />
        </div>
    );
}
