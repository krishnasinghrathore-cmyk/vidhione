'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { useAuth } from '@/lib/auth/context';
import {
    getTextileDocument,
    listTextileDocuments,
    saveTextileDocument,
    setTextileDocumentCancelled,
    type TextileDocument
} from '@/lib/textile/api';
import {
    defaultTextilePresetKey,
    isTextileIndustry,
    resolveTextileCapabilities,
    type TextileCapabilityState
} from '@/lib/textile/config';
import type { TextileDocumentFilters, TextileDocumentScreenConfig } from './config';
import { TextileDocumentForm } from './TextileDocumentForm';
import { TextileDocumentList } from './TextileDocumentList';
import { useTextileLookups } from './lookups';
import {
    buildTextileDocumentInput,
    createEmptyLineDraft,
    createEmptyTextileDocumentDraft,
    createEmptyTextileDraftErrors,
    textileDocumentToDraft,
    type TextileDocumentDraft,
    type TextileDraftErrors,
    type TextileDraftHeaderField,
    type TextileDraftLineField
} from './validation';

const DEFAULT_FILTERS: TextileDocumentFilters = {
    search: '',
    fromDate: null,
    toDate: null,
    includeCancelled: false
};

const formatDocumentLabel = (screen: TextileDocumentScreenConfig) =>
    screen.title.replace(/^Textile\s+/i, '').replace(/s$/i, '');

const buildDownstreamLockMessage = (document: TextileDocument | null, screen: TextileDocumentScreenConfig) => {
    if (!document?.textileDocumentId) return null;

    const subject = formatDocumentLabel(screen).toLowerCase();
    const directLinks = [
        { value: document.linkedSaleInvoiceId, label: 'GST invoice' },
        { value: document.linkedDeliveryChallanId, label: 'delivery challan' },
        { value: document.linkedPackingSlipId, label: 'packing slip' },
        { value: document.linkedFabricInwardId, label: 'fabric inward' },
        { value: document.linkedDailyOutwardId, label: 'daily outward' },
        { value: document.linkedJobWorkIssueId, label: 'job work issue' },
        { value: document.linkedInhouseProcessId, label: 'in-house process' },
        { value: document.linkedInhouseProductionId, label: 'in-house production' }
    ];

    const directLink = directLinks.find((entry) => typeof entry.value === 'string' && entry.value.trim());
    if (directLink?.value) {
        return `This ${subject} is locked because linked ${directLink.label} #${directLink.value} already exists.`;
    }

    if (document.lines.some((line) => typeof line.linkedSaleInvoiceLineId === 'string' && line.linkedSaleInvoiceLineId.trim())) {
        return `This ${subject} is locked because one or more lines are already linked to a GST invoice.`;
    }

    if (document.lines.some((line) => typeof line.linkedInhouseProcessId === 'string' && line.linkedInhouseProcessId.trim())) {
        return `This ${subject} is locked because one or more lines are already linked to an in-house process.`;
    }

    if (document.lines.some((line) => typeof line.linkedInhouseProductionId === 'string' && line.linkedInhouseProductionId.trim())) {
        return `This ${subject} is locked because one or more lines are already linked to in-house production.`;
    }

    return null;
};

export function TextileDocumentPage({ screen }: { screen: TextileDocumentScreenConfig }) {
    const location = useLocation();
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const { setPageTitle } = useContext(LayoutContext);
    const { tenantIndustryKey, tenantSettings } = useAuth();
    const lookups = useTextileLookups();
    const textileTenant = isTextileIndustry(tenantIndustryKey);
    const presetKey = textileTenant
        ? tenantSettings?.textilePresetKey ?? defaultTextilePresetKey(tenantIndustryKey)
        : null;
    const capabilities = useMemo<TextileCapabilityState>(
        () => resolveTextileCapabilities(presetKey, tenantSettings?.textileCapabilities ?? null),
        [presetKey, tenantSettings?.textileCapabilities]
    );

    const [filters, setFilters] = useState<TextileDocumentFilters>(DEFAULT_FILTERS);
    const [items, setItems] = useState([] as Awaited<ReturnType<typeof listTextileDocuments>>);
    const [draft, setDraft] = useState<TextileDocumentDraft>(() => createEmptyTextileDocumentDraft());
    const [activeDocument, setActiveDocument] = useState<TextileDocument | null>(null);
    const [errors, setErrors] = useState<TextileDraftErrors>(() => createEmptyTextileDraftErrors());
    const [listLoading, setListLoading] = useState(false);
    const [loadingDocument, setLoadingDocument] = useState(false);
    const [saving, setSaving] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const routeStateDocumentId = useMemo(() => {
        const state = location.state as { textileDocumentId?: string | null } | null;
        return typeof state?.textileDocumentId === 'string' && state.textileDocumentId.trim()
            ? state.textileDocumentId.trim()
            : null;
    }, [location.state]);

    useEffect(() => {
        setPageTitle(screen.title);
        return () => setPageTitle(null);
    }, [screen.title, setPageTitle]);

    const downstreamLockMessage = useMemo(() => buildDownstreamLockMessage(activeDocument, screen), [activeDocument, screen]);

    const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3500 });
    };

    const clearFieldError = (field: TextileDraftHeaderField) => {
        setErrors((prev) => {
            if (!prev.header[field] && !prev.form) return prev;
            const nextHeader = { ...prev.header };
            delete nextHeader[field];
            return { ...prev, form: null, header: nextHeader };
        });
    };

    const clearLineFieldError = (clientId: string, field: TextileDraftLineField) => {
        setErrors((prev) => {
            const currentLine = prev.lines[clientId];
            if (!currentLine?.[field] && !prev.form) return prev;
            const nextLine = { ...(currentLine ?? {}) };
            delete nextLine[field];
            const nextLines = { ...prev.lines };
            if (Object.keys(nextLine).length > 0) {
                nextLines[clientId] = nextLine;
            } else {
                delete nextLines[clientId];
            }
            return { ...prev, form: null, lines: nextLines };
        });
    };

    const loadDocuments = async (activeFilters: TextileDocumentFilters) => {
        setListLoading(true);
        setListError(null);
        try {
            const result = await listTextileDocuments({
                documentType: screen.documentType,
                fromDate: activeFilters.fromDate ? activeFilters.fromDate.toISOString().slice(0, 10) : null,
                toDate: activeFilters.toDate ? activeFilters.toDate.toISOString().slice(0, 10) : null,
                search: activeFilters.search.trim() || null,
                includeCancelled: activeFilters.includeCancelled,
                limit: 200,
                offset: 0
            });
            setItems(result);
        } catch (error: any) {
            setListError(error.message || 'Unable to load textile documents');
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        void loadDocuments(DEFAULT_FILTERS);
    }, [screen.documentType]);

    const handleCreateNew = React.useCallback(() => {
        setDraft(createEmptyTextileDocumentDraft());
        setActiveDocument(null);
        setErrors(createEmptyTextileDraftErrors());
    }, []);

    const handleSelect = React.useCallback(async (textileDocumentId: string) => {
        setLoadingDocument(true);
        try {
            const result = await getTextileDocument(textileDocumentId);
            if (!result) {
                setActiveDocument(null);
                showToast('warn', 'Document not found');
                return;
            }
            setActiveDocument(result);
            setDraft(textileDocumentToDraft(result));
            setErrors(createEmptyTextileDraftErrors());
        } catch (error: any) {
            setActiveDocument(null);
            showToast('error', 'Unable to load textile document', error.message);
        } finally {
            setLoadingDocument(false);
        }
    }, []);

    useEffect(() => {
        if (!routeStateDocumentId) return;
        void handleSelect(routeStateDocumentId);
    }, [handleSelect, routeStateDocumentId]);

    const handleSave = async () => {
        const validation = buildTextileDocumentInput(draft, screen, capabilities);
        if (!validation.ok) {
            setErrors(validation.errors);
            showToast('warn', 'Review the highlighted textile fields');
            return;
        }

        setSaving(true);
        try {
            const saved = await saveTextileDocument(validation.input);
            setActiveDocument(saved);
            setDraft(textileDocumentToDraft(saved));
            setErrors(createEmptyTextileDraftErrors());
            await loadDocuments(filters);
            showToast('success', `${formatDocumentLabel(screen)} ${draft.textileDocumentId ? 'updated' : 'created'}`);
        } catch (error: any) {
            const message = error?.message || 'Unable to save textile document';
            setErrors((prev) => ({ ...prev, form: message }));
            showToast('error', 'Unable to save textile document', message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleCancelled = async () => {
        if (!draft.textileDocumentId) return;
        const nextCancelled = !draft.isCancelled;
        const confirmed = window.confirm(
            nextCancelled ? 'Cancel this textile document?' : 'Reopen this textile document?'
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            const result = await setTextileDocumentCancelled(draft.textileDocumentId, nextCancelled);
            setActiveDocument(result);
            setDraft(textileDocumentToDraft(result));
            setErrors(createEmptyTextileDraftErrors());
            await loadDocuments(filters);
            showToast('success', nextCancelled ? 'Document cancelled' : 'Document reopened');
        } catch (error: any) {
            const message = error?.message || 'Unable to update document status';
            setErrors((prev) => ({ ...prev, form: message }));
            showToast('error', 'Unable to update document status', message);
        } finally {
            setSaving(false);
        }
    };

    const handleHeaderChange = (field: TextileDraftHeaderField, value: string | Date | null) => {
        clearFieldError(field);
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    const handleLineChange = (clientId: string, field: TextileDraftLineField, value: string) => {
        clearLineFieldError(clientId, field);
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.map((line) => {
                if (line.clientId !== clientId) return line;
                const nextLine = { ...line, [field]: value };
                if (field === 'productId') {
                    const defaultUnitId = lookups.productDefaultUnitById.get(value);
                    if (defaultUnitId && !nextLine.unitId) nextLine.unitId = defaultUnitId;
                }
                return nextLine;
            })
        }));
    };

    const handleAddLine = () => {
        setErrors((prev) => ({ ...prev, form: null }));
        setDraft((prev) => ({ ...prev, lines: [...prev.lines, createEmptyLineDraft()] }));
    };

    const handleRemoveLine = (clientId: string) => {
        setDraft((prev) => {
            const nextLines = prev.lines.filter((line) => line.clientId !== clientId);
            return {
                ...prev,
                lines: nextLines.length > 0 ? nextLines : [createEmptyLineDraft()]
            };
        });
        setErrors((prev) => {
            const nextLines = { ...prev.lines };
            delete nextLines[clientId];
            return { ...prev, lines: nextLines };
        });
    };

    const canAccessScreen = textileTenant && capabilities[screen.capability];

    if (!textileTenant) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">{screen.title}</h2>
                <p className="text-600 mb-3">This route is only available when the tenant industry is Textile.</p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    if (!canAccessScreen) {
        return (
            <div className="card">
                <h2 className="m-0 mb-2">{screen.title}</h2>
                <p className="text-600 mb-3">
                    This route requires the <strong>{screen.capability}</strong> textile capability for the active tenant.
                </p>
                <Button label="Back to Textile Workspace" onClick={() => navigate('/apps/textile')} />
            </div>
        );
    }

    return (
        <div className="grid">
            <Toast ref={toastRef} />
            <div className="col-12">
                <div className="flex align-items-center justify-content-between gap-3 mb-3">
                    <div>
                        <h2 className="m-0">{screen.title}</h2>
                        <p className="mt-2 mb-0 text-600">{screen.description}</p>
                    </div>
                    <Button
                        type="button"
                        label="Textile Workspace"
                        className="p-button-text app-action-compact"
                        onClick={() => navigate('/apps/textile')}
                    />
                </div>
            </div>

            {lookups.loading && (
                <div className="col-12">
                    <Message severity="info" text="Loading textile lookups for ledgers, products, units, transporters, and godowns." className="w-full" />
                </div>
            )}

            <div className="col-12 lg:col-7">
                <TextileDocumentForm
                    screen={screen}
                    draft={draft}
                    errors={errors}
                    capabilities={capabilities}
                    lookups={lookups}
                    saving={saving}
                    loadingDocument={loadingDocument}
                    downstreamLockMessage={downstreamLockMessage}
                    onHeaderChange={handleHeaderChange}
                    onLineChange={handleLineChange}
                    onAddLine={handleAddLine}
                    onRemoveLine={handleRemoveLine}
                    onReset={handleCreateNew}
                    onSave={handleSave}
                    onToggleCancelled={handleToggleCancelled}
                />
            </div>

            <div className="col-12 lg:col-5">
                <TextileDocumentList
                    screen={screen}
                    items={items}
                    filters={filters}
                    loading={listLoading}
                    errorMessage={listError}
                    ledgerNameById={lookups.ledgerNameById}
                    onFiltersChange={setFilters}
                    onRefresh={() => void loadDocuments(filters)}
                    onCreateNew={handleCreateNew}
                    onSelect={(textileDocumentId) => void handleSelect(textileDocumentId)}
                />
            </div>
        </div>
    );
}

