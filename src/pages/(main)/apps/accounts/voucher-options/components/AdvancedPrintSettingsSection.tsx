import React from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import AppInput from '@/components/AppInput';
import type { VoucherTypeFormState } from '../types';

type AdvancedPrintSettingsSectionProps = {
    form: VoucherTypeFormState;
    expanded: boolean;
    onToggleExpanded: () => void;
    onFormPatch: (patch: Partial<VoucherTypeFormState>) => void;
};

export function AdvancedPrintSettingsSection({
    form,
    expanded,
    onToggleExpanded,
    onFormPatch
}: AdvancedPrintSettingsSectionProps) {
    const inputWidthStyle = { width: '100%' } as const;

    return (
        <Accordion
            className="voucher-options-modal__accordion"
            activeIndex={expanded ? 0 : undefined}
            onTabChange={(event) => {
                const nextExpanded = Array.isArray(event.index) ? event.index.includes(0) : event.index === 0;
                if (nextExpanded !== expanded) {
                    onToggleExpanded();
                }
            }}
        >
            <AccordionTab header="Advanced Print Settings">
                <div className="grid voucher-options-modal__grid">
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Disclaimer 1</label>
                        <AppInput
                            value={form.disclaimer1}
                            onChange={(event) => onFormPatch({ disclaimer1: event.target.value })}
                            className="w-full"
                            compact
                            style={inputWidthStyle}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Disclaimer 2</label>
                        <AppInput
                            value={form.disclaimer2}
                            onChange={(event) => onFormPatch({ disclaimer2: event.target.value })}
                            className="w-full"
                            compact
                            style={inputWidthStyle}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Disclaimer 3</label>
                        <AppInput
                            value={form.disclaimer3}
                            onChange={(event) => onFormPatch({ disclaimer3: event.target.value })}
                            className="w-full"
                            compact
                            style={inputWidthStyle}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Disclaimer 4</label>
                        <AppInput
                            value={form.disclaimer4}
                            onChange={(event) => onFormPatch({ disclaimer4: event.target.value })}
                            className="w-full"
                            compact
                            style={inputWidthStyle}
                        />
                    </div>
                </div>
            </AccordionTab>
        </Accordion>
    );
}
