import React from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { classNames } from 'primereact/utils';
import AppDatePicker from '@/components/AppDatePicker';
import type { VoucherTypeFormErrors, VoucherTypeFormState } from '../types';

type LockPeriodSectionProps = {
    form: VoucherTypeFormState;
    errors: VoucherTypeFormErrors;
    onFormPatch: (patch: Partial<VoucherTypeFormState>) => void;
};

export function LockPeriodSection({ form, errors, onFormPatch }: LockPeriodSectionProps) {
    const reportDateWidthStyle = { width: '150px' } as const;

    return (
        <div className="voucher-options-modal__section">
            <div className="voucher-options-modal__section-title">Lock Period</div>
            <div className="voucher-options-modal__divider" />
            <div className="grid voucher-options-modal__grid">
                <div className="col-12 md:col-3">
                    <label htmlFor="voucher-lock-switch" className="block text-600 mb-1">
                        Lock Editing
                    </label>
                    <div className="flex align-items-center gap-2">
                        <InputSwitch
                            inputId="voucher-lock-switch"
                            checked={form.isLocked}
                            onChange={(event) => {
                                const nextLocked = Boolean(event.value);
                                onFormPatch({
                                    isLocked: nextLocked,
                                    lockFromDate: nextLocked ? form.lockFromDate : null,
                                    lockToDate: nextLocked ? form.lockToDate : null
                                });
                            }}
                            className="app-inputswitch"
                        />
                        <small className="voucher-options-modal__status">{form.isLocked ? 'Locked' : 'Unlocked'}</small>
                    </div>
                    <small className="voucher-options-modal__helper block mt-1">
                        Vouchers in this period can&apos;t be edited or deleted.
                    </small>
                </div>

                <div className={classNames('col-12 md:col-3', !form.isLocked && 'voucher-options-modal__dimmed')}>
                    <label className="block text-600 mb-1">
                        Date From
                        {form.isLocked ? (
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        ) : null}
                    </label>
                    <AppDatePicker
                        value={form.lockFromDate}
                        onChange={(value) => onFormPatch({ lockFromDate: value })}
                        className={classNames('voucher-options-modal__report-date', !form.isLocked && 'app-field-noneditable')}
                        inputClassName={errors.lockFromDate ? 'w-full p-invalid' : 'w-full'}
                        compact
                        style={reportDateWidthStyle}
                        disabled={!form.isLocked}
                        placeholder="From date"
                    />
                    {errors.lockFromDate && <small className="p-error">{errors.lockFromDate}</small>}
                </div>

                <div className={classNames('col-12 md:col-3', !form.isLocked && 'voucher-options-modal__dimmed')}>
                    <label className="block text-600 mb-1">
                        Date To
                        {form.isLocked ? (
                            <span className="text-red-500 ml-1" aria-hidden="true">
                                *
                            </span>
                        ) : null}
                    </label>
                    <AppDatePicker
                        value={form.lockToDate}
                        onChange={(value) => onFormPatch({ lockToDate: value })}
                        className={classNames('voucher-options-modal__report-date', !form.isLocked && 'app-field-noneditable')}
                        inputClassName={errors.lockToDate ? 'w-full p-invalid' : 'w-full'}
                        compact
                        style={reportDateWidthStyle}
                        disabled={!form.isLocked}
                        placeholder="To date"
                    />
                    {errors.lockToDate && <small className="p-error">{errors.lockToDate}</small>}
                </div>

                <div className="col-12 md:col-3" />
            </div>
        </div>
    );
}
