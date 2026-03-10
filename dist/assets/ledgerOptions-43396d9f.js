import{b9 as N}from"./index-a2e62377.js";import{A as L}from"./masterLookupCache-09ded647.js";import{g as O,u as h}from"./useQuery-55f3f513.js";const A=O`
    query LedgerOptionsByPurpose(
        $purpose: String!
        $ledgerGroupId: Int
        $areaId: Int
        $areaIds: [Int!]
        $excludeLedgerId: Int
        $search: String
        $limit: Int
        $includeNone: Boolean
    ) {
        ledgerOptionsByPurpose(
            purpose: $purpose
            ledgerGroupId: $ledgerGroupId
            areaId: $areaId
            areaIds: $areaIds
            excludeLedgerId: $excludeLedgerId
            search: $search
            limit: $limit
            includeNone: $includeNone
        ) {
            ledgerId
            name
            address
            groupName
        }
    }
`,x=O`
    query LedgerSummaryNameFallback($search: String, $ledgerGroupId: Int, $limit: Int) {
        ledgerSummaries(
            search: $search
            ledgerGroupId: $ledgerGroupId
            limit: $limit
            offset: 0
            sortField: "name"
            sortOrder: 1
        ) {
            items {
                ledgerId
                name
                address
                groupName
            }
        }
    }
`,C=d=>{var c,I;const l=((c=d.purpose)==null?void 0:c.trim())??"",t=d.skip||!l,a=d.limit??2e3,u=d.search??null,i=d.ledgerGroupId??null,{data:n,loading:S,error:G,refetch:y}=h(A,{client:N,variables:{purpose:l,ledgerGroupId:i,areaId:d.areaId??null,areaIds:d.areaIds??null,excludeLedgerId:d.excludeLedgerId??null,search:u,limit:a,includeNone:d.includeNone??null},skip:t,...L}),m=(n==null?void 0:n.ledgerOptionsByPurpose)??[],E=m.some(r=>{var e;return!(((e=r.name)==null?void 0:e.trim())??"")}),_=!t&&E,{data:o,loading:B}=h(x,{client:N,variables:{search:u,ledgerGroupId:i,limit:a},skip:!_,...L}),p=new Map;return(((I=o==null?void 0:o.ledgerSummaries)==null?void 0:I.items)??[]).forEach(r=>{const s=Number(r.ledgerId);Number.isFinite(s)&&p.set(s,r)}),{options:m.map(r=>{var g,$;const s=Number(r.ledgerId),e=p.get(s),P=((g=r.name)==null?void 0:g.trim())||(($=e==null?void 0:e.name)==null?void 0:$.trim())||`Ledger ${r.ledgerId}`,R=r.address??(e==null?void 0:e.address)??null,b=r.groupName??(e==null?void 0:e.groupName)??null;return{value:s,label:P,address:R,groupName:b}}),loading:S||B,error:G,refetch:y}};export{C as u};
