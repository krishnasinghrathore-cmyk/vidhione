import{r as o}from"./index-a2e62377.js";import{A as i}from"./masterLookupCache-09ded647.js";import{g as n,u as l}from"./useQuery-55f3f513.js";const g=n`
    query LedgerLookup($search: String, $limit: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                ledgerGroupId
                gstNumber
                taxRate
                taxTypeCode
                address
                cityName
                stateName
            }
        }
    }
`,I=()=>{const{data:s,loading:m,error:a}=l(g,{variables:{search:null,limit:2e3},...i}),t=o.useMemo(()=>{var r;const e=((r=s==null?void 0:s.ledgerSummaries)==null?void 0:r.items)??[];return Array.isArray(e)?e:[]},[s]),d=o.useMemo(()=>{const e=new Map;for(const r of t)r&&typeof r.ledgerId=="number"&&e.set(Number(r.ledgerId),r);return e},[t]),u=o.useMemo(()=>t.filter(e=>typeof e.ledgerId=="number").map(e=>({label:`${e.name||`Ledger ${e.ledgerId}`}${e.gstNumber?` • GSTIN ${e.gstNumber}`:""}`,value:Number(e.ledgerId)})),[t]);return{ledgers:t,ledgerById:d,ledgerOptions:u,loading:m,error:a}};export{I as u};
