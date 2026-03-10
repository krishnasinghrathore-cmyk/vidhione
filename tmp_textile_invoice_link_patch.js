const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function mustReplace(text, search, replacement, description) {
  if (!text.includes(search)) {
    throw new Error(`Missing pattern for ${description}`);
  }
  return text.replace(search, replacement);
}

function mustReplaceRegex(text, pattern, replacement, description) {
  if (!pattern.test(text)) {
    throw new Error(`Missing regex pattern for ${description}`);
  }
  return text.replace(pattern, replacement);
}

const textileApiFile = 'src/lib/textile/api.ts';
let textileApiText = read(textileApiFile);
textileApiText = mustReplaceRegex(
  textileApiText,
  /(export type TextileDocumentInput = \{[\s\S]*?\n\};)\r?\n\r?\n(type GraphqlError =)/,
  (_match, typeBlock, nextType) => {
    const helper = `export const toTextileDocumentInput = (\n    document: TextileDocument,\n    overrides: Partial<TextileDocumentInput> = {}\n): TextileDocumentInput => {\n    const baseInput: TextileDocumentInput = {\n        textileDocumentId: document.textileDocumentId,\n        documentType: document.documentType,\n        documentNumber: document.documentNumber,\n        documentDate: document.documentDate,\n        stockEffect: document.stockEffect,\n        partyLedgerId: document.partyLedgerId,\n        brokerLedgerId: document.brokerLedgerId,\n        jobberLedgerId: document.jobberLedgerId,\n        transporterId: document.transporterId,\n        godownId: document.godownId,\n        linkedPurchaseOrderId: document.linkedPurchaseOrderId,\n        linkedFabricInwardId: document.linkedFabricInwardId,\n        linkedPackingSlipId: document.linkedPackingSlipId,\n        linkedDeliveryChallanId: document.linkedDeliveryChallanId,\n        linkedSaleInvoiceId: document.linkedSaleInvoiceId,\n        linkedJobWorkIssueId: document.linkedJobWorkIssueId,\n        linkedDailyOutwardId: document.linkedDailyOutwardId,\n        linkedInhouseProcessId: document.linkedInhouseProcessId,\n        linkedInhouseProductionId: document.linkedInhouseProductionId,\n        referenceNumber: document.referenceNumber,\n        jobberChallanNo: document.jobberChallanNo,\n        jobberChallanDate: document.jobberChallanDate,\n        remarkForStatement: document.remarkForStatement,\n        remarks: document.remarks,\n        capabilityTagsJson: document.capabilityTagsJson,\n        metaJson: document.metaJson,\n        lines: document.lines.map((line) => ({\n            lineNumber: line.lineNumber,\n            productId: line.productId,\n            unitId: line.unitId,\n            designId: line.designId,\n            designName: line.designName,\n            receiptNo: line.receiptNo,\n            baleNo: line.baleNo,\n            lotNo: line.lotNo,\n            comboNo: line.comboNo,\n            rollNo: line.rollNo,\n            lineReferenceNumber: line.lineReferenceNumber,\n            lineJobberLedgerId: line.lineJobberLedgerId,\n            sourceTextileDocumentId: line.sourceTextileDocumentId,\n            sourceTextileDocumentLineId: line.sourceTextileDocumentLineId,\n            linkedSaleInvoiceLineId: line.linkedSaleInvoiceLineId,\n            linkedInhouseProcessId: line.linkedInhouseProcessId,\n            linkedInhouseProductionId: line.linkedInhouseProductionId,\n            pieces: line.pieces,\n            quantity: line.quantity,\n            rate: line.rate,\n            fabricRate: line.fabricRate,\n            shrinkagePercent: line.shrinkagePercent,\n            amount: line.amount,\n            remarks: line.remarks,\n            metaJson: line.metaJson\n        }))\n    };\n\n    return {\n        ...baseInput,\n        ...overrides,\n        lines: overrides.lines ?? baseInput.lines\n    };\n};`;
    return `${typeBlock}\n\n${helper}\n\n${nextType}`;
  },
  'textile api helper'
);
write(textileApiFile, textileApiText.replace(/\r?\n/g, '\r\n'));

const dispatchFile = 'src/pages/(main)/apps/textile/dispatch-book/TextileDispatchBookScreen.tsx';
let dispatchText = read(dispatchFile);
dispatchText = mustReplace(
  dispatchText,
  `import { listTextileDocuments } from '@/lib/textile/api';\n`,
  `import { listTextileDocuments } from '@/lib/textile/api';\nimport { buildTextileInvoiceSourceRouteState } from '@/lib/textile/navigation';\n`,
  'dispatch import'
);
dispatchText = mustReplace(
  dispatchText,
  `    if (!isTextileTenant) {\n`,
  `    const openDispatchDocument = (row: TextileDispatchBookRow) => {\n        if (row.saleInvoiceId != null) {\n            navigate(\`/apps/textile/gst-invoices/edit/\${row.saleInvoiceId}\`);\n            return;\n        }\n        if (!row.textileDocumentId) return;\n        const route = row.stage === 'packing_slip' ? '/apps/textile/packing-slips' : '/apps/textile/delivery-challans';\n        navigate(route, { state: { textileDocumentId: row.textileDocumentId } });\n    };\n\n    const openDispatchInvoice = (row: TextileDispatchBookRow) => {\n        const linkedInvoiceId =\n            row.saleInvoiceId != null\n                ? row.saleInvoiceId\n                : row.linkedSaleInvoiceId != null && Number.isFinite(Number(row.linkedSaleInvoiceId)) && Number(row.linkedSaleInvoiceId) > 0\n                  ? Number(row.linkedSaleInvoiceId)\n                  : null;\n        if (linkedInvoiceId != null) {\n            navigate(\`/apps/textile/gst-invoices/edit/\${linkedInvoiceId}\`);\n            return;\n        }\n        if (row.stage === 'invoice' || !row.textileDocumentId) return;\n        navigate('/apps/textile/gst-invoices/new', {\n            state: buildTextileInvoiceSourceRouteState({\n                textileSourceDocumentId: row.textileDocumentId,\n                textileSourceDocumentType: row.stage,\n                textileSourceDocumentNumber: row.documentNumber\n            })\n        });\n    };\n\n    if (!isTextileTenant) {\n`,
  'dispatch helpers'
);
dispatchText = mustReplaceRegex(
  dispatchText,
  /<Column\s+header="Actions"[\s\S]*?style=\{\{ width: '7rem' \}\}\s*\/?>/,
  `<Column\n                            header="Actions"\n                            exportable={false}\n                            body={(row: TextileDispatchBookRow) => (\n                                <div className="flex flex-wrap gap-2">\n                                    <Button\n                                        type="button"\n                                        label="Open"\n                                        className="p-button-text app-action-compact"\n                                        onClick={() => openDispatchDocument(row)}\n                                    />\n                                    {row.stage !== 'invoice' ? (\n                                        <Button\n                                            type="button"\n                                            label={row.linkedSaleInvoiceId ? 'Open Invoice' : 'Invoice'}\n                                            className="p-button-text app-action-compact"\n                                            onClick={() => openDispatchInvoice(row)}\n                                            disabled={row.isCancelled}\n                                        />\n                                    ) : null}\n                                </div>\n                            )}\n                            style={{ width: '13rem' }}\n                        />`,
  'dispatch actions'
);
write(dispatchFile, dispatchText.replace(/\r?\n/g, '\r\n'));

const invoiceContainerFile = 'src/pages/(main)/apps/billing/invoice-form/InvoiceFormContainer.tsx';
let invoiceText = read(invoiceContainerFile);
invoiceText = mustReplace(
  invoiceText,
  `import { defaultTextilePresetKey, isTextileIndustry, resolveTextileCapabilities } from '@/lib/textile/config';\n`,
  `import { defaultTextilePresetKey, isTextileIndustry, resolveTextileCapabilities } from '@/lib/textile/config';\nimport { getTextileDocument, saveTextileDocument, toTextileDocumentInput } from '@/lib/textile/api';\nimport { parseTextileInvoiceSourceRouteState, type TextileInvoiceSourceRouteState } from '@/lib/textile/navigation';\n`,
  'invoice imports'
);
invoiceText = mustReplace(
  invoiceText,
  `    const invoiceRoutes = useMemo(() => resolveInvoiceRoutePaths(location.pathname), [location.pathname]);\n`,
  `    const invoiceRoutes = useMemo(() => resolveInvoiceRoutePaths(location.pathname), [location.pathname]);\n    const textileInvoiceSource = useMemo(() => parseTextileInvoiceSourceRouteState(location.state), [location.state]);\n`,
  'invoice source state'
);
invoiceText = mustReplace(
  invoiceText,
  `    const hydratedRouteInvoiceIdRef = useRef<number | null>(null);\n`,
  `    const hydratedRouteInvoiceIdRef = useRef<number | null>(null);\n    const hydratedTextileSourceDocumentIdRef = useRef<string | null>(null);\n`,
  'invoice source ref'
);
invoiceText = mustReplace(
  invoiceText,
  `    const hydrateInvoice = useCallback(\n`,
  `    const hydrateTextileSourceDocument = useCallback(\n        async (source: TextileInvoiceSourceRouteState) => {\n            setLoadingInvoice(true);\n            setError(null);\n            setHasUnsavedEntryChanges(false);\n            try {\n                const sourceDocument = await getTextileDocument(source.textileSourceDocumentId);\n                if (!sourceDocument) {\n                    setLegacyActionNotice('Selected textile source document was not found.');\n                    return;\n                }\n\n                const sourcePartyLedgerId = toPositiveId(sourceDocument.partyLedgerId);\n                const sourcePartyLedger = sourcePartyLedgerId != null ? ledgerById.get(sourcePartyLedgerId) ?? null : null;\n                const sourceTransporterId = toPositiveId(sourceDocument.transporterId);\n                const sourceLines = (sourceDocument.lines ?? []).map((line, index) => {\n                    const itemId = toPositiveId(line.productId);\n                    const baseLine = itemId != null\n                        ? applyProductToLine(createEmptyLine(null, index + 1), itemId)\n                        : createEmptyLine(null, index + 1);\n                    const product = itemId != null ? productById.get(itemId) ?? null : null;\n                    const quantity = round2(Math.max(0, Number(line.quantity ?? 0)));\n                    const rate = round2(Math.max(0, Number(line.rate ?? line.fabricRate ?? 0)));\n\n                    return {\n                        ...baseLine,\n                        lineNumber: index + 1,\n                        itemId,\n                        itemName: baseLine.itemName || product?.name || (itemId != null ? \`Product \${itemId}\` : ''),\n                        itemCode: baseLine.itemCode || product?.code || null,\n                        hsnCode: baseLine.hsnCode || product?.hsnCode || '',\n                        unitId: toPositiveId(line.unitId) ?? baseLine.unitId,\n                        unitName: baseLine.unitName ?? product?.unitName ?? null,\n                        quantity: quantity > 0 ? quantity : 1,\n                        rate,\n                        sellingRate: baseLine.sellingRate ?? (rate > 0 ? rate : null),\n                        remarks: line.remarks ?? '',\n                        textileJobberLedgerId: toPositiveId(line.lineJobberLedgerId)\n                    } satisfies InvoiceLineDraft;\n                });\n\n                setHeader((previous) => ({\n                    ...createDefaultHeader(),\n                    voucherDate: fromDateText(sourceDocument.documentDate) ?? previous.voucherDate ?? new Date(),\n                    voucherNumberPrefix: previous.voucherNumberPrefix,\n                    documentType: 'invoice',\n                    partyLedgerId: sourcePartyLedgerId,\n                    ledgerGroupId: toPositiveId(sourcePartyLedger?.ledgerGroupId),\n                    salesmanId: null,\n                    salesman2Id: null,\n                    textileJobberLedgerId: toPositiveId(sourceDocument.jobberLedgerId),\n                    textileJobberChallanNo: sourceDocument.jobberChallanNo ?? '',\n                    textileJobberChallanDate: fromDateText(sourceDocument.jobberChallanDate),\n                    textileRemarkForStatement: sourceDocument.remarkForStatement ?? '',\n                    partyName: sourcePartyLedger?.name ?? '',\n                    partyGstin: sourcePartyLedger?.gstNumber?.trim() ?? '',\n                    partyAddress: formatLedgerAddress(sourcePartyLedger),\n                    placeOfSupply: previous.placeOfSupply,\n                    priceList: previous.priceList,\n                    warehouseId: null,\n                    isVatIncluded: previous.isVatIncluded,\n                    hasScheme: previous.hasScheme,\n                    isDisputed: false,\n                    isCancelled: false,\n                    remarks: sourceDocument.remarks ?? '',\n                    bizomInvoiceNumber: '',\n                    billNumber: '',\n                    estimateId: null\n                }));\n\n                if (sourceLines.length === 0) {\n                    inventorySnapshotByLineKeyRef.current = {};\n                    setLines([createEmptyLine(null)]);\n                } else {\n                    inventorySnapshotByLineKeyRef.current = sourceLines.reduce<Record<string, string>>((acc, line) => {\n                        acc[line.key] = serializeLineInventory(line.inventory);\n                        return acc;\n                    }, {});\n                    setLines(reindexLines(sourceLines));\n                }\n\n                setTypeDetails([]);\n                setAdditionalTaxations([]);\n                setPreservedDetails(EMPTY_PRESERVED_DETAILS);\n                if (sourceTransporterId != null) {\n                    setTransportDraft((previous) => ({\n                        ...previous,\n                        isApplied: previous.isApplied || sourceTransporterId != null,\n                        transporterId: sourceTransporterId\n                    }));\n                }\n\n                const idsToEnsure = new Set<number>();\n                sourceLines.forEach((line) => {\n                    if (line.itemId) idsToEnsure.add(line.itemId);\n                });\n                idsToEnsure.forEach((id) => {\n                    if (!productById.has(id)) {\n                        void ensureProductDetail(id);\n                    }\n                });\n\n                const sourceLabel = source.textileSourceDocumentType === 'packing_slip' ? 'Packing Slip' : 'Delivery Challan';\n                const sourceNumber = source.textileSourceDocumentNumber || sourceDocument.documentNumber || source.textileSourceDocumentId;\n                setLegacyActionNotice(\n                    \`Source \${sourceLabel} \${sourceNumber} selected. Saving this invoice will link it back to the textile document.\`\n                );\n            } catch (nextError) {\n                setLegacyActionNotice(null);\n                setError(nextError instanceof Error ? nextError.message : 'Failed to load textile source document');\n            } finally {\n                setLoadingInvoice(false);\n            }\n        },\n        [applyProductToLine, ensureProductDetail, ledgerById, productById]\n    );\n\n    const hydrateInvoice = useCallback(\n`,
  'invoice source hydrate helper'
);
invoiceText = mustReplace(
  invoiceText,
  `    }, [editingSaleInvoiceId, hydrateInvoice, resetDraftState, routeSaleInvoiceId, routeView]);\n\n    useEffect(() => {\n        if (routeView !== 'edit') return;\n`,
  `    }, [editingSaleInvoiceId, hydrateInvoice, resetDraftState, routeSaleInvoiceId, routeView]);\n\n    useEffect(() => {\n        if (routeView !== 'new') {\n            hydratedTextileSourceDocumentIdRef.current = null;\n            return;\n        }\n        if (!textileInvoiceSource) {\n            if (hydratedTextileSourceDocumentIdRef.current != null) {\n                hydratedTextileSourceDocumentIdRef.current = null;\n                resetDraftState();\n            }\n            return;\n        }\n        if (hydratedTextileSourceDocumentIdRef.current === textileInvoiceSource.textileSourceDocumentId) {\n            return;\n        }\n        hydratedTextileSourceDocumentIdRef.current = textileInvoiceSource.textileSourceDocumentId;\n        resetDraftState();\n        void hydrateTextileSourceDocument(textileInvoiceSource);\n    }, [hydrateTextileSourceDocument, resetDraftState, routeView, textileInvoiceSource]);\n\n    useEffect(() => {\n        if (routeView !== 'edit') return;\n`,
  'invoice source effect'
);
invoiceText = mustReplace(
  invoiceText,
  `    const createOrUpdateInvoice = useCallback(async (options?: { openNewAfterSave?: boolean }) => {\n`,
  `    const linkTextileSourceDocumentToInvoice = useCallback(async (textileDocumentId: string, saleInvoiceId: number) => {\n        const sourceDocument = await getTextileDocument(textileDocumentId);\n        if (!sourceDocument) return;\n        if ((sourceDocument.linkedSaleInvoiceId ?? '').trim() === String(saleInvoiceId)) return;\n        await saveTextileDocument(toTextileDocumentInput(sourceDocument, { linkedSaleInvoiceId: String(saleInvoiceId) }));\n    }, []);\n\n    const createOrUpdateInvoice = useCallback(async (options?: { openNewAfterSave?: boolean }) => {\n`,
  'invoice link helper'
);
invoiceText = mustReplace(
  invoiceText,
  `            const payload = buildPayload();\n            const openNewAfterSave = options?.openNewAfterSave === true && routeView !== 'edit';\n\n            if (routeView === 'edit' && editingSaleInvoiceId) {\n                await invoicingApi.updateSaleInvoice({\n                    saleInvoiceId: editingSaleInvoiceId,\n                    ...payload,\n                    isCancelled: header.isCancelled\n                });\n            } else {\n                await invoicingApi.createSaleInvoice(payload);\n            }\n\n            pendingSaveModeRef.current = 'default';\n`,
  `            const payload = buildPayload();\n            const openNewAfterSave = options?.openNewAfterSave === true && routeView !== 'edit';\n            let persistedSaleInvoiceId = routeView === 'edit' ? editingSaleInvoiceId : null;\n\n            if (routeView === 'edit' && editingSaleInvoiceId) {\n                await invoicingApi.updateSaleInvoice({\n                    saleInvoiceId: editingSaleInvoiceId,\n                    ...payload,\n                    isCancelled: header.isCancelled\n                });\n            } else {\n                const createdSaleInvoice = await invoicingApi.createSaleInvoice(payload);\n                persistedSaleInvoiceId = createdSaleInvoice.saleInvoiceId;\n            }\n\n            if (persistedSaleInvoiceId != null && textileInvoiceSource) {\n                try {\n                    await linkTextileSourceDocumentToInvoice(\n                        textileInvoiceSource.textileSourceDocumentId,\n                        persistedSaleInvoiceId\n                    );\n                } catch {\n                    // Keep invoice save successful even if textile backlink update fails.\n                }\n            }\n\n            pendingSaveModeRef.current = 'default';\n`,
  'invoice save backlink'
);
invoiceText = mustReplace(
  invoiceText,
  `    }, [\n        buildPayload,\n        editingSaleInvoiceId,\n        fiscalRange,\n        header.isCancelled,\n        header.voucherDate,\n        invoiceRoutes,\n        navigate,\n        routeView,\n        validation.isValid\n    ]);\n`,
  `    }, [\n        buildPayload,\n        editingSaleInvoiceId,\n        fiscalRange,\n        header.isCancelled,\n        header.voucherDate,\n        invoiceRoutes,\n        linkTextileSourceDocumentToInvoice,\n        navigate,\n        routeView,\n        textileInvoiceSource,\n        validation.isValid\n    ]);\n`,
  'invoice save deps'
);
write(invoiceContainerFile, invoiceText.replace(/\r?\n/g, '\r\n'));
