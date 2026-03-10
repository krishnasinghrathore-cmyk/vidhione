import React from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import AppInput from '@/components/AppInput';

type ProductOfferBatchSmsDialogProps = {
    visible: boolean;
    productLabel: string;
    maxRecipients: number | null;
    messageText: string;
    sending: boolean;
    onHide: () => void;
    onMaxRecipientsChange: (value: number | null) => void;
    onMessageTextChange: (value: string) => void;
    onSend: () => void;
};

export const ProductOfferBatchSmsDialog = ({
    visible,
    productLabel,
    maxRecipients,
    messageText,
    sending,
    onHide,
    onMaxRecipientsChange,
    onMessageTextChange,
    onSend
}: ProductOfferBatchSmsDialogProps) => {
    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" className="p-button-text app-action-compact" onClick={onHide} disabled={sending} />
            <Button label="Send Batch SMS" icon="pi pi-megaphone" className="app-action-compact" onClick={onSend} loading={sending} />
        </div>
    );

    return (
        <Dialog
            header={productLabel ? `Send Batch Product Offer SMS - ${productLabel}` : 'Send Batch Product Offer SMS'}
            visible={visible}
            style={{ width: 'min(640px, 96vw)' }}
            onHide={onHide}
            footer={footer}
        >
            <div className="flex flex-column gap-3">
                <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                    Uses the tenant SMS binding <code>inventory.product_offer</code> and targets ledgers mapped to this product&apos;s brand. Recipient numbers are resolved from mobile, office, then residence phone.
                </div>
                <div>
                    <label htmlFor="product-offer-batch-max-recipients" className="block text-700 mb-2">Max recipients</label>
                    <AppInput
                        inputId="product-offer-batch-max-recipients"
                        inputType="number"
                        value={maxRecipients}
                        onValueChange={(event) => onMaxRecipientsChange(typeof event.value === 'number' ? event.value : null)}
                        useGrouping={false}
                        minFractionDigits={0}
                        maxFractionDigits={0}
                        disabled={sending}
                    />
                    <small className="text-600">Optional. Defaults to 25 and is capped server-side for safe batch sends.</small>
                </div>
                <div>
                    <label htmlFor="product-offer-batch-message-text" className="block text-700 mb-2">Offer text override</label>
                    <InputTextarea
                        id="product-offer-batch-message-text"
                        value={messageText}
                        onChange={(event) => onMessageTextChange(event.target.value)}
                        rows={5}
                        autoResize
                        className="w-full"
                        disabled={sending}
                    />
                    <small className="text-600">Optional. Leave blank to use the SMS binding text or default product offer message.</small>
                </div>
            </div>
        </Dialog>
    );
};