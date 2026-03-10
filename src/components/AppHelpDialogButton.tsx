'use client';

import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { classNames } from 'primereact/utils';

type AppHelpDialogSection = {
    title: string;
    items: string[];
};

type AppHelpDialogButtonProps = {
    title: string;
    summary?: string;
    sections?: AppHelpDialogSection[];
    buttonAriaLabel?: string;
    className?: string;
    dialogWidth?: string;
};

export function AppHelpDialogButton({
    title,
    summary,
    sections = [],
    buttonAriaLabel,
    className,
    dialogWidth = 'min(560px, 96vw)'
}: AppHelpDialogButtonProps) {
    const [visible, setVisible] = useState(false);

    return (
        <>
            <Button
                type="button"
                icon="pi pi-info-circle"
                className={classNames('p-button-text app-action-compact app-page-help-button', className)}
                aria-label={buttonAriaLabel ?? `${title} help`}
                onClick={() => setVisible(true)}
            />
            <Dialog
                header={`${title} Help`}
                visible={visible}
                style={{ width: dialogWidth }}
                modal
                onHide={() => setVisible(false)}
                footer={
                    <div className="flex justify-content-end">
                        <Button
                            label="Close"
                            className="p-button-text app-action-compact"
                            onClick={() => setVisible(false)}
                        />
                    </div>
                }
            >
                <div className="app-page-help-dialog">
                    {summary ? <p className="app-page-help-dialog__summary">{summary}</p> : null}
                    {sections.map((section) => (
                        <div key={section.title} className="app-page-help-dialog__section">
                            <h4 className="app-page-help-dialog__section-title">{section.title}</h4>
                            <ul className="app-page-help-dialog__list">
                                {section.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Dialog>
        </>
    );
}
