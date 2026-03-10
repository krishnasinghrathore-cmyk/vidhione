import{au as p,av as k,aw as D}from"./index-a2e62377.js";const N=(e,n)=>({textileDocumentId:e.textileDocumentId,documentType:e.documentType,documentNumber:e.documentNumber,documentDate:e.documentDate,stockEffect:e.stockEffect,partyLedgerId:e.partyLedgerId,brokerLedgerId:e.brokerLedgerId,jobberLedgerId:e.jobberLedgerId,transporterId:e.transporterId,godownId:e.godownId,linkedPurchaseOrderId:e.linkedPurchaseOrderId,linkedFabricInwardId:e.linkedFabricInwardId,linkedPackingSlipId:e.linkedPackingSlipId,linkedDeliveryChallanId:e.linkedDeliveryChallanId,linkedSaleInvoiceId:e.linkedSaleInvoiceId,linkedJobWorkIssueId:e.linkedJobWorkIssueId,linkedDailyOutwardId:e.linkedDailyOutwardId,linkedInhouseProcessId:e.linkedInhouseProcessId,linkedInhouseProductionId:e.linkedInhouseProductionId,referenceNumber:e.referenceNumber,jobberChallanNo:e.jobberChallanNo,jobberChallanDate:e.jobberChallanDate,remarkForStatement:e.remarkForStatement,remarks:e.remarks,capabilityTagsJson:e.capabilityTagsJson,metaJson:e.metaJson,lines:(e.lines??[]).map(t=>({lineNumber:t.lineNumber,productId:t.productId,unitId:t.unitId,designId:t.designId,designName:t.designName,receiptNo:t.receiptNo,baleNo:t.baleNo,lotNo:t.lotNo,comboNo:t.comboNo,rollNo:t.rollNo,lineReferenceNumber:t.lineReferenceNumber,lineJobberLedgerId:t.lineJobberLedgerId,sourceTextileDocumentId:t.sourceTextileDocumentId,sourceTextileDocumentLineId:t.sourceTextileDocumentLineId,linkedSaleInvoiceLineId:t.linkedSaleInvoiceLineId,linkedInhouseProcessId:t.linkedInhouseProcessId,linkedInhouseProductionId:t.linkedInhouseProductionId,pieces:t.pieces,quantity:t.quantity,rate:t.rate,fabricRate:t.fabricRate,shrinkagePercent:t.shrinkagePercent,amount:t.amount,remarks:t.remarks,metaJson:t.metaJson})),...n}),$=p("/textile/graphql"),a=async(e,n,t=!0)=>{var I,m,b;const o=new Headers;o.set("Content-Type","application/json");const s=k();s&&o.set("Authorization",`Bearer ${s}`);const i=await fetch($,{method:"POST",headers:o,credentials:"include",body:JSON.stringify({query:e,variables:n})}),u=await i.text(),r=u?JSON.parse(u):null,c=(r==null?void 0:r.errors)??[];if(c.length){const g=(m=(I=c[0])==null?void 0:I.extensions)==null?void 0:m.code;if(t&&g==="UNAUTHENTICATED"&&await D())return await a(e,n,!1);throw new Error(((b=c[0])==null?void 0:b.message)||"Request failed")}if(!i.ok||!(r!=null&&r.data))throw new Error(`Request failed (${i.status})`);return r.data},d=`
    textileDocumentId
    documentType
    documentNumber
    documentDate
    stockEffect
    partyLedgerId
    brokerLedgerId
    jobberLedgerId
    transporterId
    godownId
    linkedPurchaseOrderId
    linkedFabricInwardId
    linkedPackingSlipId
    linkedDeliveryChallanId
    linkedSaleInvoiceId
    linkedJobWorkIssueId
    linkedDailyOutwardId
    linkedInhouseProcessId
    linkedInhouseProductionId
    referenceNumber
    jobberChallanNo
    jobberChallanDate
    remarkForStatement
    remarks
    capabilityTagsJson
    metaJson
    totalPieces
    totalQuantity
    totalAmount
    isCancelled
    createdAt
    updatedAt
`,l=`
    textileDocumentLineId
    textileDocumentId
    lineNumber
    productId
    unitId
    designId
    designName
    receiptNo
    baleNo
    lotNo
    comboNo
    rollNo
    lineReferenceNumber
    lineJobberLedgerId
    sourceTextileDocumentId
    sourceTextileDocumentLineId
    linkedSaleInvoiceLineId
    linkedInhouseProcessId
    linkedInhouseProductionId
    pieces
    quantity
    rate
    fabricRate
    shrinkagePercent
    amount
    remarks
    metaJson
    createdAt
`,S=async e=>(await a(`query TextileDocuments($documentType: String!, $partyLedgerId: String, $jobberLedgerId: String, $productId: String, $fromDate: String, $toDate: String, $search: String, $includeCancelled: Boolean, $limit: Float, $offset: Float) {
            textileDocuments(documentType: $documentType, partyLedgerId: $partyLedgerId, jobberLedgerId: $jobberLedgerId, productId: $productId, fromDate: $fromDate, toDate: $toDate, search: $search, includeCancelled: $includeCancelled, limit: $limit, offset: $offset) {
                ${d}
                lineCount
            }
        }`,e)).textileDocuments,L=async e=>(await a(`query TextileDocument($textileDocumentId: String!) {
            textileDocument(textileDocumentId: $textileDocumentId) {
                ${d}
                lines {
                    ${l}
                }
            }
        }`,{textileDocumentId:e})).textileDocument,T=async e=>(await a(`mutation SaveTextileDocument($input: TextileDocumentInput!) {
            saveTextileDocument(input: $input) {
                ok
                document {
                    ${d}
                    lines {
                        ${l}
                    }
                }
            }
        }`,{input:e})).saveTextileDocument.document,f=async(e,n)=>(await a(`mutation SetTextileDocumentCancelled($textileDocumentId: String!, $isCancelled: Boolean!) {
            setTextileDocumentCancelled(textileDocumentId: $textileDocumentId, isCancelled: $isCancelled) {
                ok
                document {
                    ${d}
                    lines {
                        ${l}
                    }
                }
            }
        }`,{textileDocumentId:e,isCancelled:n})).setTextileDocumentCancelled.document,h=async e=>(await a(`query TextileFabricStatement($documentType: String, $partyLedgerId: String, $jobberLedgerId: String, $productId: String, $fromDate: String, $toDate: String, $includeCancelled: Boolean) {
            textileFabricStatement(documentType: $documentType, partyLedgerId: $partyLedgerId, jobberLedgerId: $jobberLedgerId, productId: $productId, fromDate: $fromDate, toDate: $toDate, includeCancelled: $includeCancelled) {
                textileDocumentId
                textileDocumentLineId
                documentType
                documentNumber
                documentDate
                stockEffect
                partyLedgerId
                jobberLedgerId
                lineJobberLedgerId
                productId
                unitId
                designId
                designName
                receiptNo
                baleNo
                lotNo
                comboNo
                rollNo
                lineReferenceNumber
                piecesIn
                piecesOut
                quantityIn
                quantityOut
                signedPieces
                signedQuantity
                signedAmount
                runningPiecesBalance
                runningQuantityBalance
                runningAmountBalance
            }
        }`,e)).textileFabricStatement,C=async e=>(await a(`query TextileFabricStockStatement($partyLedgerId: String, $jobberLedgerId: String, $productId: String, $includeCancelled: Boolean) {
            textileFabricStockStatement(partyLedgerId: $partyLedgerId, jobberLedgerId: $jobberLedgerId, productId: $productId, includeCancelled: $includeCancelled) {
                partyLedgerId
                jobberLedgerId
                lineJobberLedgerId
                productId
                unitId
                designId
                designName
                receiptNo
                baleNo
                lotNo
                comboNo
                rollNo
                balancePieces
                balanceQuantity
                balanceAmount
                lastDocumentDate
            }
        }`,e)).textileFabricStockStatement;export{f as a,h as b,C as c,L as g,S as l,T as s,N as t};
