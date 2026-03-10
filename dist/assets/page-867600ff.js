import{b7 as te,r as s,P as v,j as t,B as N}from"./index-a2e62377.js";import{C as a}from"./column.esm-81c99a02.js";import{A as se}from"./AppDataTable-ff6b8365.js";import{A as U}from"./AppDateInput-ceb6f146.js";import{A as R}from"./AppDropdown-800ebb2b.js";import{a as ie}from"./date-f6fe8ef4.js";import{p as ae}from"./reportSearchParams-df19d8db.js";import{f as V,a as le,W as oe,b as re}from"./shared-6416695c.js";import{u as S,g as W}from"./useQuery-55f3f513.js";import"./splitbutton.esm-f8323715.js";import"./index.esm-287dfa04.js";import"./overlayservice.esm-bf9b13ee.js";import"./datatable.esm-b891b45f.js";import"./paginator.esm-e234ed6f.js";import"./inputnumber.esm-991f482d.js";import"./index.esm-1ebbc8e4.js";import"./index.esm-2f3fd837.js";import"./dropdown.esm-7710effc.js";import"./virtualscroller.esm-c60a9a04.js";import"./index.esm-23a64aa1.js";import"./index.esm-716d0587.js";import"./index.esm-b05ab7aa.js";import"./index.esm-29a8c0d6.js";import"./skeleton.esm-8641005e.js";import"./reportExport-834d722d.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-4880a95e.js";import"./index.esm-e0ea7a14.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";import"./types-eaf96456.js";const ne=W`
    query Securities {
        securities {
            id
            isin
            symbol
            name
        }
    }
`,ce=W`
    query RealizedPnlPage($fromDate: String, $toDate: String, $accountId: String, $investorProfileId: String, $securityId: String, $isin: String, $limit: Int, $offset: Int) {
        realizedPnlPage(fromDate: $fromDate, toDate: $toDate, accountId: $accountId, investorProfileId: $investorProfileId, securityId: $securityId, isin: $isin, limit: $limit, offset: $offset) {
            items {
                securityId
                isin
                symbol
                name
                accountId
                accountName
                investorProfileId
                investorProfileName
                tdate
                qty
                sellPrice
                sellValue
                costBasis
                fees
                realized
            }
            meta {
                total
                limit
                offset
                hasMore
                nextOffset
            }
        }
    }
`,u=l=>ie(l),f=(l,o=2)=>{if(l==null||l==="")return"";const n=Number(l);return Number.isFinite(n)?new Intl.NumberFormat("en-IN",{minimumFractionDigits:o,maximumFractionDigits:o}).format(n):String(l)};function qe(){var q,Q;const[l]=te(),o=s.useMemo(()=>ae(l),[l]),[n,Y]=s.useState(20),[L,A]=s.useState(0),[g,z]=s.useState(o.fromDate),[y,F]=s.useState(o.toDate),[c,D]=s.useState(o.accountId),[i,O]=s.useState(o.investorProfileId),[b,M]=s.useState(o.securityId),{data:$}=S(oe,{client:v}),{data:P}=S(re,{client:v}),{data:C}=S(ne,{client:v}),p=($==null?void 0:$.accounts)??[],B=(C==null?void 0:C.securities)??[],T=s.useMemo(()=>i?p.filter(e=>e.investorProfileId===i):p,[p,i]),k=s.useMemo(()=>T.map(e=>({label:V(e),value:e.id})),[T]),H=s.useMemo(()=>((P==null?void 0:P.investorProfiles)??[]).map(e=>({label:le(e),value:e.id})),[P]),G=s.useMemo(()=>(B??[]).map(e=>({label:e.symbol||e.name,value:e.id})),[B]),m=s.useMemo(()=>{const e={};return p.forEach(r=>{e[r.id]=r}),e},[p]);s.useEffect(()=>{if(!c||!i)return;const e=m[c];(e==null?void 0:e.investorProfileId)!==i&&D("")},[m,c,i]);const{data:d,loading:K,error:w,refetch:j}=S(ce,{client:v,variables:{fromDate:u(g),toDate:u(y),accountId:c||null,investorProfileId:i||null,securityId:b||null,isin:null,limit:n,offset:L}}),_=((q=d==null?void 0:d.realizedPnlPage)==null?void 0:q.items)??[],E=s.useMemo(()=>_.map(e=>{var r,h,I;return{...e,securityLabel:e.symbol||e.name||e.securityId,investorLabel:e.investorProfileName||e.accountId&&((r=m[e.accountId])==null?void 0:r.investorProfileName)||"-",accountLabel:e.accountName?e.accountId&&((h=m[e.accountId])!=null&&h.code)?`${e.accountName} (${(I=m[e.accountId])==null?void 0:I.code})`:e.accountName:e.accountId?V(m[e.accountId]??{id:e.accountId,name:e.accountId}):"-"}}),[m,_]),x=(Q=d==null?void 0:d.realizedPnlPage)==null?void 0:Q.meta,Z=(x==null?void 0:x.total)??E.length,J=e=>{const r=e.realized,h=Number(r),I=f(r,2);if(!Number.isFinite(h))return I||"";const ee=h>=0?"text-green-600 font-medium":"text-red-500 font-medium";return t.jsx("span",{className:ee,children:I})},X=()=>{z(null),F(null),D(""),O(""),M(""),A(0),j({fromDate:null,toDate:null,accountId:null,investorProfileId:null,securityId:null,isin:null,limit:n,offset:0})};return t.jsxs("div",{className:"card",children:[t.jsxs("div",{className:"mb-3",children:[t.jsx("h2",{className:"m-0",children:"Realized P&L"}),t.jsx("p",{className:"mt-2 mb-0 text-600",children:"FIFO-based realized profit and loss from SELL transactions, now visible per investor and demat account."})]}),w&&t.jsxs("p",{className:"text-red-500 mb-3",children:["Error loading realized P&L: ",w.message]}),t.jsxs(se,{value:E,paginator:!0,rows:n,first:L,totalRecords:Z,lazy:!0,loading:K,dataKey:"tdate",exportFileName:"wealth-realized-pnl",onPage:e=>{Y(e.rows),A(e.first),j({fromDate:u(g),toDate:u(y),accountId:c||null,investorProfileId:i||null,securityId:b||null,isin:null,limit:e.rows,offset:e.first})},rowsPerPageOptions:[10,20,50,100],headerLeft:t.jsxs(t.Fragment,{children:[t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"From"}),t.jsx(U,{value:g,onChange:e=>z(e),style:{width:"140px"}})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"To"}),t.jsx(U,{value:y,onChange:e=>F(e),style:{width:"140px"}})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"Investor"}),t.jsx(R,{value:i,options:H,onChange:e=>O(e.value??""),placeholder:"All",showClear:!0})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"Account"}),t.jsx(R,{value:c,options:k,onChange:e=>D(e.value??""),placeholder:"All",showClear:!0})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"Security"}),t.jsx(R,{value:b,options:G,onChange:e=>M(e.value??""),placeholder:"All",filter:!0,showClear:!0})]})]}),headerRight:t.jsxs(t.Fragment,{children:[t.jsx(N,{label:"Apply",icon:"pi pi-filter",onClick:()=>{A(0),j({fromDate:u(g),toDate:u(y),accountId:c||null,investorProfileId:i||null,securityId:b||null,isin:null,limit:n,offset:0})}}),t.jsx(N,{label:"Clear",icon:"pi pi-times",className:"p-button-text",onClick:X}),t.jsx(N,{label:"Export",icon:"pi pi-download"}),t.jsx(N,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-secondary",onClick:()=>j()})]}),recordSummary:x?`Showing ${E.length} of ${x.total}`:void 0,emptyMessage:"No realized P&L rows found",stripedRows:!0,size:"small",children:[t.jsx(a,{field:"tdate",header:"Date",style:{width:"8rem"}}),t.jsx(a,{field:"securityLabel",header:"Security"}),t.jsx(a,{field:"investorLabel",header:"Investor"}),t.jsx(a,{field:"accountLabel",header:"Account"}),t.jsx(a,{field:"qty",header:"Qty",body:e=>f(e.qty,2),style:{textAlign:"right"}}),t.jsx(a,{field:"sellPrice",header:"Sell Price",body:e=>f(e.sellPrice,2),style:{textAlign:"right"}}),t.jsx(a,{field:"sellValue",header:"Sell Value",body:e=>f(e.sellValue,2),style:{textAlign:"right"}}),t.jsx(a,{field:"costBasis",header:"Cost Basis",body:e=>f(e.costBasis,2),style:{textAlign:"right"}}),t.jsx(a,{field:"fees",header:"Fees",body:e=>f(e.fees,2),style:{textAlign:"right"}}),t.jsx(a,{field:"realized",header:"Realized",body:J,style:{textAlign:"right"}})]})]})}export{qe as default};
