import React from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { classNames } from 'primereact/utils';
import AppInput from '@/components/AppInput';
import { formatVoucherPreview } from '../utils';
import type { VoucherTypeFormErrors, VoucherTypeFormState } from '../types';

type VoucherNumberingSectionProps = {
    form: VoucherTypeFormState;
    errors: VoucherTypeFormErrors;
    onFormPatch: (patch: Partial<VoucherTypeFormState>) => void;
};

export function VoucherNumberingSection({ form, errors, onFormPatch }: VoucherNumberingSectionProps) {
    const VOUCHER_NO_PART_MAX_LENGTH = 12;
    const preview = formatVoucherPreview(form.prefix, form.voucherStartNumber, form.suffix, form.isManualVoucherNo);
    const inputWidthStyle = { width: '100%' } as const;
    const startFromValue = form.voucherStartNumber == null ? '' : String(form.voucherStartNumber);

    return (
        <div className="voucher-options-modal__section">
            <div className="voucher-options-modal__section-title">Voucher Numbering</div>
            <div className="voucher-options-modal__divider" />
            <div className="grid voucher-options-modal__grid">
                <div className="col-12 md:col-7">
                    <div className="grid voucher-options-modal__grid">
                        <div className="col-12 md:col-3">
                            <label htmlFor="voucher-manual-switch" className="block text-600 mb-1">
                                Numbering Mode
                            </label>
                            <div className="flex align-items-center gap-2">
                                <InputSwitch
                                    inputId="voucher-manual-switch"
                                    checked={form.isManualVoucherNo}
                                    onChange={(event) => {
                                        const nextManual = Boolean(event.value);
                                        onFormPatch({
                                            isManualVoucherNo: nextManual,
                                            voucherStartNumber: nextManual ? form.voucherStartNumber : form.voucherStartNumber ?? 1
                                        });
                                    }}
                                    className="app-inputswitch"
                                />
                                <small className="voucher-options-modal__status">
                                    {form.isManualVoucherNo ? 'Manual entry' : 'Auto numbering'}
                                </small>
                            </div>
                            <small className="voucher-options-modal__helper block mt-1">
                                {form.isManualVoucherNo
                                    ? 'Manual voucher number can be entered in voucher entry forms.'
                                    : 'Auto numbering applies in voucher entry forms.'}
                            </small>
                        </div>

                        <div className={classNames('col-12 md:col-3', form.isManualVoucherNo && 'voucher-options-modal__dimmed')}>
                            <label className="block text-600 mb-1">Prefix</label>
                            <AppInput
                                value={form.prefix}
                                onChange={(event) => onFormPatch({ prefix: event.target.value.slice(0, VOUCHER_NO_PART_MAX_LENGTH) })}
                                className={classNames('w-full', form.isManualVoucherNo && 'app-field-noneditable')}
                                compact
                                style={inputWidthStyle}
                                placeholder="Prefix"
                                maxLength={VOUCHER_NO_PART_MAX_LENGTH}
                                disabled={form.isManualVoucherNo}
                            />
                        </div>

                        <div className={classNames('col-12 md:col-3', form.isManualVoucherNo && 'voucher-options-modal__dimmed')}>
                            <label className="block text-600 mb-1">
                                Start From
                                {!form.isManualVoucherNo ? (
                                    <span className="text-red-500 ml-1" aria-hidden="true">
                                        *
                                    </span>
                                ) : null}
                            </label>
                            <AppInput
                                value={startFromValue}
                                onChange={(event) => {
                                    const raw = event.target.value ?? '';
                                    const digitsOnly = raw.replace(/\D/g, '');
                                    onFormPatch({
                                        voucherStartNumber: digitsOnly ? Number.parseInt(digitsOnly, 10) : null
                                    });
                                }}
                                inputMode="numeric"
                                className={classNames(
                                    errors.voucherStartNumber ? 'w-full p-invalid' : 'w-full',
                                    form.isManualVoucherNo && 'app-field-noneditable'
                                )}
                                compact
                                onKeyDown={(event) => {
                                    if (event.ctrlKey || event.metaKey || event.altKey) return;
                                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter'];
                                    if (allowedKeys.includes(event.key)) return;
                                    if (/^\d$/.test(event.key)) return;
                                    event.preventDefault();
                                }}
                                onPaste={(event) => {
                                    const text = event.clipboardData.getData('text') ?? '';
                                    if (!/^\d+$/.test(text.trim())) {
                                        event.preventDefault();
                                    }
                                }}
                                style={inputWidthStyle}
                                disabled={form.isManualVoucherNo}
                            />
                            {errors.voucherStartNumber && <small className="p-error">{errors.voucherStartNumber}</small>}
                        </div>

                        <div className={classNames('col-12 md:col-3', form.isManualVoucherNo && 'voucher-options-modal__dimmed')}>
                            <label className="block text-600 mb-1">Suffix</label>
                            <AppInput
                                value={form.suffix}
                                onChange={(event) => onFormPatch({ suffix: event.target.value.slice(0, VOUCHER_NO_PART_MAX_LENGTH) })}
                                className={classNames('w-full', form.isManualVoucherNo && 'app-field-noneditable')}
                                compact
                                style={inputWidthStyle}
                                placeholder="Suffix"
                                maxLength={VOUCHER_NO_PART_MAX_LENGTH}
                                disabled={form.isManualVoucherNo}
                            />
                        </div>
                    </div>
                </div>

                <div className="col-12 md:col-5">
                    <label className="block text-600 mb-1">Live Preview</label>
                    <div className="voucher-options-modal__preview-slot">
                        <div className="voucher-options-modal__preview-chip" aria-live="polite">
                            Preview: <span className="font-medium text-900">{preview}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
