'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Link } from 'react-router-dom';

type RuleDoc = {
    title: string;
    summary: string;
    file: string;
    version: string;
    ruleDate: string;
};

const RULE_DOCS: RuleDoc[] = [
    {
        title: 'Posting Date Policy',
        summary: 'Defines when voucher date vs posting date is used across vouchers, reports, and validations.',
        file: 'docs/knowledge-book/accounts-posting-date-policy.md',
        version: '1.0',
        ruleDate: 'February 16, 2026'
    },
    {
        title: 'Cancellation Policy',
        summary: 'Defines cancellation controls, audit behavior, and blocked actions.',
        file: 'docs/knowledge-book/accounts-cancellation-policy.md',
        version: '1.0',
        ruleDate: 'February 16, 2026'
    },
    {
        title: 'Reconciliation Policy',
        summary: 'Defines reconciled status behavior, edit restrictions, and filter behavior.',
        file: 'docs/knowledge-book/accounts-reconciliation-policy.md',
        version: '1.0',
        ruleDate: 'February 16, 2026'
    },
    {
        title: 'Period Lock Policy',
        summary: 'Defines posting-period lock checks and how locked-period actions are blocked.',
        file: 'docs/knowledge-book/accounts-period-lock-policy.md',
        version: '1.0',
        ruleDate: 'February 16, 2026'
    },
    {
        title: 'Voucher Save Parity Playbook',
        summary: 'Defines dry-check and legacy-vs-new validation steps to confirm edit/save parity and prevent data loss.',
        file: 'docs/knowledge-book/accounts-voucher-save-parity-playbook.md',
        version: '1.0',
        ruleDate: 'February 17, 2026'
    },
    {
        title: 'Voucher Save Parity Log Template',
        summary: 'Scenario-wise CSV evidence template for recording legacy/new parity results and sign-off.',
        file: 'docs/knowledge-book/accounts-voucher-save-parity-log-template.csv',
        version: '1.0',
        ruleDate: 'February 17, 2026'
    }
];

function AccountingRulesHelpPage() {
    const toastRef = React.useRef<Toast>(null);
    const [viewerVisible, setViewerVisible] = React.useState(false);
    const [viewerDoc, setViewerDoc] = React.useState<RuleDoc | null>(null);
    const [viewerContent, setViewerContent] = React.useState('');
    const [viewerError, setViewerError] = React.useState<string | null>(null);
    const [viewerLoading, setViewerLoading] = React.useState(false);

    const showToast = React.useCallback(
        (severity: 'success' | 'warn' | 'error', summary: string, detail: string) => {
            toastRef.current?.show({
                severity,
                summary,
                detail
            });
        },
        []
    );

    const copyPath = React.useCallback(
        async (filePath: string) => {
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(filePath);
                } else {
                    throw new Error('Clipboard API unavailable');
                }
                showToast('success', 'Copied', filePath);
            } catch {
                showToast('warn', 'Copy failed', `Please copy manually: ${filePath}`);
            }
        },
        [showToast]
    );

    const openDoc = React.useCallback(
        async (rule: RuleDoc) => {
            setViewerVisible(true);
            setViewerDoc(rule);
            setViewerContent('');
            setViewerError(null);
            setViewerLoading(true);
            try {
                const response = await fetch(`/${rule.file}`);
                if (!response.ok) {
                    throw new Error(`Failed to load document (${response.status})`);
                }
                const content = await response.text();
                setViewerContent(content);
            } catch {
                setViewerError(
                    'Could not load this file from app runtime. Use Copy Path and open the document from repository.'
                );
            } finally {
                setViewerLoading(false);
            }
        },
        []
    );

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    <Toast ref={toastRef} />
                    <div className="flex flex-column gap-2 mb-4">
                        <h2 className="m-0">Accounting Rules</h2>
                        <p className="m-0 text-700">
                            This page maps user-facing accounting behavior to documented policy files in the project knowledge book.
                        </p>
                        <Link to="/pages/help" className="text-primary hover:underline font-medium">
                            Back to Help Center
                        </Link>
                    </div>

                    <div className="grid">
                        {RULE_DOCS.map((rule) => (
                            <div key={rule.file} className="col-12 md:col-6">
                                <div className="surface-border border-1 border-round p-3 h-full">
                                    <div className="text-xl font-semibold mb-2">{rule.title}</div>
                                    <p className="m-0 text-700 mb-3">{rule.summary}</p>
                                    <div className="text-sm text-600 line-height-3">
                                        <div>
                                            <strong>Rule Version:</strong> {rule.version}
                                        </div>
                                        <div>
                                            <strong>Rule Date:</strong> {rule.ruleDate}
                                        </div>
                                        <div>
                                            <strong>Doc File:</strong> <code>{rule.file}</code>
                                        </div>
                                    </div>
                                    <div className="flex align-items-center gap-2 mt-3">
                                        <Button
                                            label="Copy Path"
                                            icon="pi pi-copy"
                                            className="p-button-text p-button-sm"
                                            onClick={() => {
                                                void copyPath(rule.file);
                                            }}
                                        />
                                        <Button
                                            label="Open Doc"
                                            icon="pi pi-folder-open"
                                            className="p-button-sm"
                                            onClick={() => {
                                                void openDoc(rule);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Dialog
                        visible={viewerVisible}
                        onHide={() => setViewerVisible(false)}
                        header={viewerDoc ? `Document: ${viewerDoc.title}` : 'Document'}
                        style={{ width: 'min(95vw, 74rem)' }}
                        modal
                    >
                        {viewerDoc ? (
                            <div className="flex flex-column gap-3">
                                <div className="text-sm text-700">
                                    <strong>File:</strong> <code>{viewerDoc.file}</code>
                                </div>
                                {viewerLoading ? (
                                    <div className="text-700">Loading document...</div>
                                ) : null}
                                {viewerError ? (
                                    <div className="p-3 border-1 surface-border border-round bg-yellow-50 text-900">
                                        {viewerError}
                                    </div>
                                ) : null}
                                {!viewerLoading && !viewerError ? (
                                    <pre
                                        className="m-0 p-3 border-1 surface-border border-round"
                                        style={{
                                            maxHeight: '60vh',
                                            overflow: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.4
                                        }}
                                    >
                                        {viewerContent}
                                    </pre>
                                ) : null}
                            </div>
                        ) : null}
                    </Dialog>
                </div>
            </div>
        </div>
    );
}

export default AccountingRulesHelpPage;
