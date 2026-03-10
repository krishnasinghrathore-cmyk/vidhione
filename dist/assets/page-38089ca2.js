import{b7 as ae,r as s,P as N,j as t,I as oe,B as v}from"./index-a2e62377.js";import{C as a}from"./column.esm-81c99a02.js";import{A as ne}from"./AppDataTable-ff6b8365.js";import{A as ie}from"./AppDateInput-ceb6f146.js";import{A as j}from"./AppDropdown-800ebb2b.js";import{a as le}from"./date-f6fe8ef4.js";import{f as re,a as ce,W as me,b as ue}from"./shared-6416695c.js";import{p as de}from"./reportSearchParams-df19d8db.js";import{u as P,g as Q}from"./useQuery-55f3f513.js";import"./splitbutton.esm-f8323715.js";import"./index.esm-287dfa04.js";import"./overlayservice.esm-bf9b13ee.js";import"./datatable.esm-b891b45f.js";import"./paginator.esm-e234ed6f.js";import"./inputnumber.esm-991f482d.js";import"./index.esm-1ebbc8e4.js";import"./index.esm-2f3fd837.js";import"./dropdown.esm-7710effc.js";import"./virtualscroller.esm-c60a9a04.js";import"./index.esm-23a64aa1.js";import"./index.esm-716d0587.js";import"./index.esm-b05ab7aa.js";import"./index.esm-29a8c0d6.js";import"./skeleton.esm-8641005e.js";import"./reportExport-834d722d.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-4880a95e.js";import"./index.esm-e0ea7a14.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";import"./types-eaf96456.js";const pe=Q`
    query Securities {
        securities {
            id
            isin
            symbol
            name
        }
    }
`,fe=Q`
    query HoldingsPage($asOfDate: String, $accountId: String, $investorProfileId: String, $securityId: String, $isin: String, $scope: String, $limit: Int, $offset: Int) {
        holdingsPage(asOfDate: $asOfDate, accountId: $accountId, investorProfileId: $investorProfileId, securityId: $securityId, isin: $isin, scope: $scope, limit: $limit, offset: $offset) {
            items {
                rowKey
                scope
                securityId
                isin
                symbol
                name
                accountId
                accountName
                accountCode
                investorProfileId
                investorProfileName
                qty
                avgCost
                buyValue
                cmp
                cmpDate
                currentValue
                totalPnl
                changePct
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
`,he=[{label:"Household",value:"HOUSEHOLD"},{label:"Investor",value:"INVESTOR"},{label:"Demat Account",value:"ACCOUNT"}],xe=n=>le(n),c=(n,i=2)=>{if(n==null||n==="")return"";const r=Number(n);return Number.isFinite(r)?new Intl.NumberFormat("en-IN",{minimumFractionDigits:i,maximumFractionDigits:i}).format(r):String(n)};function Ge(){var B,W;const[n]=ae(),i=s.useMemo(()=>de(n),[n]),[r,Y]=s.useState(20),[E,S]=s.useState(0),[$,L]=s.useState(i.asOfDate),[u,H]=s.useState(i.scope),[d,C]=s.useState(i.accountId),[l,R]=s.useState(i.investorProfileId),[w,F]=s.useState(i.securityId),[T,U]=s.useState(""),{data:A}=P(me,{client:N}),{data:g}=P(ue,{client:N}),{data:b}=P(pe,{client:N}),p=(A==null?void 0:A.accounts)??[],V=s.useMemo(()=>l?p.filter(e=>e.investorProfileId===l):p,[p,l]),M=s.useMemo(()=>{const e={};return p.forEach(o=>{e[o.id]=o}),e},[p]);s.useEffect(()=>{if(!d||!l)return;const e=M[d];(e==null?void 0:e.investorProfileId)!==l&&C("")},[M,d,l]);const k=s.useMemo(()=>V.map(e=>({label:re(e),value:e.id})),[V]),G=s.useMemo(()=>((g==null?void 0:g.investorProfiles)??[]).map(e=>({label:ce(e),value:e.id})),[g]),K=s.useMemo(()=>((b==null?void 0:b.securities)??[]).map(e=>({label:e.symbol||e.name,value:e.id})),[b]),y=(e=r,o=E)=>({asOfDate:xe($),scope:u,accountId:d||null,investorProfileId:l||null,securityId:w||null,isin:T.trim()||null,limit:e,offset:o}),{data:m,loading:z,error:_,refetch:I}=P(fe,{client:N,variables:y()}),q=((B=m==null?void 0:m.holdingsPage)==null?void 0:B.items)??[],O=s.useMemo(()=>q.map(e=>({...e,securityLabel:e.symbol||e.name||e.isin||e.securityId,investorLabel:e.investorProfileName||"Unassigned",accountLabel:e.accountCode?`${e.accountName} (${e.accountCode})`:e.accountName||e.accountId||"-"})),[q]),f=(W=m==null?void 0:m.holdingsPage)==null?void 0:W.meta,J=(f==null?void 0:f.total)??O.length,X=u!=="HOUSEHOLD",Z=u==="ACCOUNT",ee=e=>{const o=e.totalPnl,h=Number(o),x=c(o,2);if(!Number.isFinite(h))return x||"";const D=h>=0?"text-green-600 font-medium":"text-red-500 font-medium";return t.jsx("span",{className:D,children:x})},te=e=>{const o=e.changePct,h=Number(o),x=o==null?"":`${c(o,2)}%`;if(!Number.isFinite(h))return x;const D=h>=0?"text-green-600":"text-red-500";return t.jsx("span",{className:D,children:x})},se=()=>{L(null),H("HOUSEHOLD"),C(""),R(""),F(""),U(""),S(0),I({asOfDate:null,scope:"HOUSEHOLD",accountId:null,investorProfileId:null,securityId:null,isin:null,limit:r,offset:0})};return t.jsxs("div",{className:"card",children:[t.jsxs("div",{className:"mb-3",children:[t.jsx("h2",{className:"m-0",children:"Holdings"}),t.jsx("p",{className:"mt-2 mb-0 text-600",children:"Portfolio snapshot computed from transactions, corporate actions, and the latest available close price up to the selected as-of date."})]}),_&&t.jsxs("p",{className:"text-red-500 mb-3",children:["Error loading holdings: ",_.message]}),t.jsxs(ne,{value:O,paginator:!0,rows:r,first:E,totalRecords:J,lazy:!0,loading:z,dataKey:"rowKey",exportFileName:`wealth-holdings-${u.toLowerCase()}`,onPage:e=>{Y(e.rows),S(e.first),I(y(e.rows,e.first))},rowsPerPageOptions:[10,20,50,100],headerLeft:t.jsxs(t.Fragment,{children:[t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"As of"}),t.jsx(ie,{value:$,onChange:e=>L(e),style:{width:"140px"}})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"Scope"}),t.jsx(j,{value:u,options:he,onChange:e=>H(e.value),style:{minWidth:"11rem"}})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"Investor"}),t.jsx(j,{value:l,options:G,onChange:e=>R(e.value??""),placeholder:"All",showClear:!0})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"Account"}),t.jsx(j,{value:d,options:k,onChange:e=>C(e.value??""),placeholder:"All",showClear:!0})]}),t.jsxs("span",{className:"flex align-items-center gap-2",children:[t.jsx("label",{className:"text-600 text-sm",children:"Security"}),t.jsx(j,{value:w,options:K,onChange:e=>F(e.value??""),placeholder:"All",filter:!0,showClear:!0})]}),t.jsxs("span",{className:"p-input-icon-left",children:[t.jsx("i",{className:"pi pi-search"}),t.jsx(oe,{value:T,onChange:e=>U(e.target.value),placeholder:"ISIN contains..."})]})]}),headerRight:t.jsxs(t.Fragment,{children:[t.jsx(v,{label:"Apply",icon:"pi pi-filter",onClick:()=>{S(0),I(y(r,0))}}),t.jsx(v,{label:"Clear",icon:"pi pi-times",className:"p-button-text",onClick:se}),t.jsx(v,{label:"Export",icon:"pi pi-download"}),t.jsx(v,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-secondary",onClick:()=>I(y())})]}),recordSummary:f?`Showing ${O.length} of ${f.total}`:void 0,emptyMessage:"No holdings found",stripedRows:!0,size:"small",children:[X&&t.jsx(a,{field:"investorLabel",header:"Investor"}),Z&&t.jsx(a,{field:"accountLabel",header:"Demat Account"}),t.jsx(a,{field:"securityLabel",header:"Security",body:e=>e.securityLabel}),t.jsx(a,{field:"isin",header:"ISIN"}),t.jsx(a,{field:"qty",header:"Qty",body:e=>c(e.qty,2),style:{textAlign:"right"}}),t.jsx(a,{field:"avgCost",header:"Avg Cost",body:e=>c(e.avgCost,2),style:{textAlign:"right"}}),t.jsx(a,{field:"buyValue",header:"Buy Value",body:e=>c(e.buyValue,2),style:{textAlign:"right"}}),t.jsx(a,{field:"cmp",header:"CMP",body:e=>e.cmp?c(e.cmp,2):"-",style:{textAlign:"right"}}),t.jsx(a,{field:"cmpDate",header:"Price Date",body:e=>e.cmpDate||"-",style:{width:"8rem"}}),t.jsx(a,{field:"currentValue",header:"Current Value",body:e=>e.currentValue?c(e.currentValue,2):"-",style:{textAlign:"right"}}),t.jsx(a,{field:"totalPnl",header:"Total P&L",body:ee,style:{textAlign:"right"}}),t.jsx(a,{field:"changePct",header:"Change %",body:te,style:{textAlign:"right"}})]})]})}export{Ge as default};
