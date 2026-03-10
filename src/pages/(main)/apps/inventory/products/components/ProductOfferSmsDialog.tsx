import React from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import AppInput from '@/components/AppInput';

type ProductOfferSmsDialogProps = {
    visible: boolean;
    productLabel: string;
    recipientName: string;
    recipientPhone: string;
    messageText: string;
    sending: boolean;
    onHide: () => void;
    onRecipientNameChange: (value: string) => void;
    onRecipientPhoneChange: (value: string) => void;
    onMessageTextChange: (value: string) => void;
    onSend: () => void;
};

export const ProductOfferSmsDialog = ({
    visible,
    productLabel,
    recipientName,
    recipientPhone,
    messageText,
    sending,
    onHide,
    onRecipientNameChange,
    onRecipientPhoneChange,
    onMessageTextChange,
    onSend
}: ProductOfferSmsDialogProps) => {
    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" className="p-button-text app-action-compact" onClick={onHide} disabled={sending} />
            <Button label="Send Offer SMS" icon="pi pi-send" className="app-action-compact" onClick={onSend} loading={sending} />
        </div>
    );

    return (
        <Dialog
            header={productLabel ? `Send Product Offer SMS - ${productLabel}` : 'Send Product Offer SMS'}
            visible={visible}
            style={{ width: 'min(640px, 96vw)' }}
            onHide={onHide}
            footer={footer}
        >
            <div className="flex flex-column gap-3">
                <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                    Uses the tenant SMS binding <code>inventory.product_offer</code>. Leave custom text blank to use the configured template or the default product-offer message.
                </div>
                <div>
                    <label htmlFor="product-offer-recipient-name" className="block text-700 mb-2">Recipient name</label>
                    <AppInput
                        inputId="product-offer-recipient-name"
                        value={recipientName}
                        onChange={(event) => onRecipientNameChange(event.target.value)}
                        disabled={sending}
                    />
                </div>
                <div>
                    <label htmlFor="product-offer-recipient-phone" className="block text-700 mb-2">Recipient phone</label>
                    <AppInput
                        inputId="product-offer-recipient-phone"
                        value={recipientPhone}
                        onChange={(event) => onRecipientPhoneChange(event.target.value)}
                        disabled={sending}
                    />
                </div>
                <div>
                    <label htmlFor="product-offer-message-text" className="block text-700 mb-2">Offer text override</label>
                    <InputTextarea
                        id="product-offer-message-text"
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
