import{r as s,L as fe,u as ge,j as t,b8 as L,B as x,I as xe}from"./index-a2e62377.js";import{C as u}from"./column.esm-81c99a02.js";import{T as D}from"./tag.esm-045cf529.js";import{A as ve}from"./AppDataTable-ff6b8365.js";import{a as H,A as J}from"./AppDateInput-ceb6f146.js";import{A as Y}from"./AppDropdown-800ebb2b.js";import{u as be,V as je}from"./VoucherTypeAutoComplete-05fdd911.js";import{A as De}from"./masterLookupCache-09ded647.js";import{r as F}from"./fiscalRange-d7f67286.js";import{u as X,g as te}from"./useQuery-55f3f513.js";import"./splitbutton.esm-f8323715.js";import"./index.esm-287dfa04.js";import"./overlayservice.esm-bf9b13ee.js";import"./datatable.esm-b891b45f.js";import"./paginator.esm-e234ed6f.js";import"./inputnumber.esm-991f482d.js";import"./index.esm-1ebbc8e4.js";import"./index.esm-2f3fd837.js";import"./dropdown.esm-7710effc.js";import"./virtualscroller.esm-c60a9a04.js";import"./index.esm-23a64aa1.js";import"./index.esm-716d0587.js";import"./index.esm-b05ab7aa.js";import"./index.esm-29a8c0d6.js";import"./skeleton.esm-8641005e.js";import"./reportExport-834d722d.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-4880a95e.js";import"./index.esm-e0ea7a14.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";import"./types-eaf96456.js";import"./AppAutoComplete-712e0696.js";import"./autocomplete.esm-a549ca28.js";import"./index.esm-10fa0e2b.js";const ye=te`
    query LedgerLookup($search: String, $limit: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                groupName
            }
        }
    }
`,Ne=te`
    query PostingDetails(
        $search: String
        $ledgerId: Int
        $voucherTypeId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $reconciled: Int
        $limit: Int
        $offset: Int
    ) {
        postingDetails(
            search: $search
            ledgerId: $ledgerId
            voucherTypeId: $voucherTypeId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            reconciled: $reconciled
            limit: $limit
            offset: $offset
        ) {
            items {
                id
                voucherId
                date
                voucherNo
                voucherType
                ledgerId
                ledgerName
                groupName
                narration
                debit
                credit
                isCancelledFlag
                reconciliationDateText
                reconciliationRemark
            }
            totalCount
            debitTotal
            creditTotal
        }
    }
`,y=n=>new Intl.NumberFormat("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n),Z=n=>{const r=n.getFullYear(),c=String(n.getMonth()+1).padStart(2,"0"),m=String(n.getDate()).padStart(2,"0");return`${r}${c}${m}`},ee=n=>{if(!n)return"";const r=n.trim(),c=r.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(c)return`${c[3]}/${c[2]}/${c[1]}`;const m=r.match(/^(\d{4})(\d{2})(\d{2})$/);if(m)return`${m[3]}/${m[2]}/${m[1]}`;const h=new Date(r);return Number.isNaN(h.getTime())?r:h.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})};function lt(){var K,z,Q;const{setPageTitle:n}=s.useContext(fe),{companyContext:r}=ge(),[c,m]=s.useState(""),[h,re]=s.useState(null),[N,se]=s.useState(null),$=s.useRef(F((r==null?void 0:r.fiscalYearStart)??null,(r==null?void 0:r.fiscalYearEnd)??null)),[l,S]=s.useState([$.current.start??null,$.current.end??null]),[T,ae]=s.useState(-1),[I,le]=s.useState(-1),[R,ie]=s.useState(20),[w,V]=s.useState(0),[v,f]=s.useState({}),oe=s.useRef(null),O=s.useRef(null),k=s.useRef(null),C=s.useRef(null),M=s.useRef(null);s.useEffect(()=>(n("Audit (Posting Details)"),()=>n(null)),[n]);const{data:b}=X(ye,{variables:{search:null,limit:500},...De}),{options:ne,loading:ce}=be(),B=l[0]?Z(l[0]):null,W=l[1]?Z(l[1]):null,i=s.useMemo(()=>F((r==null?void 0:r.fiscalYearStart)??null,(r==null?void 0:r.fiscalYearEnd)??null),[r==null?void 0:r.fiscalYearStart,r==null?void 0:r.fiscalYearEnd]),A=s.useRef(!1),j=s.useMemo(()=>({search:c.trim()?c.trim():null,ledgerId:h,voucherTypeId:N,fromDate:B,toDate:W,cancelled:T,reconciled:I,limit:R,offset:w}),[T,w,B,h,I,R,c,W,N]),[E,P]=s.useState(null),p=E!==null,{data:o,loading:de,error:_,refetch:q}=X(Ne,{variables:E??j,skip:!E}),ue=s.useMemo(()=>{var a;const e=((a=b==null?void 0:b.ledgerSummaries)==null?void 0:a.items)??[];return[{label:"All ledgers",value:null}].concat(e.map(d=>({label:`${d.name??""}${d.groupName?` (${d.groupName})`:""}`.trim()||`Ledger ${d.ledgerId}`,value:Number(d.ledgerId)})))},[b]),U=e=>{var a,d;(d=(a=e.current)==null?void 0:a.focus)==null||d.call(a)};s.useEffect(()=>{const e=setTimeout(()=>{if(!!(l[0]||l[1])){const d=H({fromDate:l[0],toDate:l[1]});if(!d.ok){f(d.errors);return}}f({}),V(0)},300);return()=>clearTimeout(e)},[l,i]),s.useEffect(()=>{if(A.current)return;const e=F((r==null?void 0:r.fiscalYearStart)??null,(r==null?void 0:r.fiscalYearEnd)??null);$.current=e,S([e.start??null,e.end??null])},[r==null?void 0:r.fiscalYearStart,r==null?void 0:r.fiscalYearEnd]);const g=s.useMemo(()=>{var e;return p?((e=o==null?void 0:o.postingDetails)==null?void 0:e.items)??[]:[]},[o,p]),G=p?((K=o==null?void 0:o.postingDetails)==null?void 0:K.totalCount)??g.length??0:0,me=p?((z=o==null?void 0:o.postingDetails)==null?void 0:z.debitTotal)??g.reduce((e,a)=>e+a.debit,0):0,pe=p?((Q=o==null?void 0:o.postingDetails)==null?void 0:Q.creditTotal)??g.reduce((e,a)=>e+a.credit,0):0,he=()=>{const e=H({fromDate:l[0],toDate:l[1]});if(!e.ok){f(e.errors);return}if(f({}),!p){P({...j,offset:0});return}const a={...j,offset:0};P(a),q(a)};return t.jsxs("div",{className:"card",children:[t.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[t.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[t.jsxs("div",{children:[t.jsx("h2",{className:"m-0",children:"Audit (Posting Details)"}),t.jsx("p",{className:"mt-2 mb-0 text-600",children:"Posting details report for audit and troubleshooting."})]}),t.jsxs("div",{className:"flex gap-2 flex-wrap",children:[t.jsx(L,{to:"/apps/accounts/ledger-reconciliation",children:t.jsx(x,{label:"Ledger Reconciliation",icon:"pi pi-check-square",className:"p-button-outlined"})}),t.jsx(L,{to:"/apps/accounts/voucher-entry",children:t.jsx(x,{label:"Voucher Entry",icon:"pi pi-pencil",className:"p-button-outlined"})}),t.jsx(L,{to:"/apps/accounts",children:t.jsx(x,{label:"Back",icon:"pi pi-arrow-left",className:"p-button-outlined"})})]})]}),_&&t.jsxs("p",{className:"text-red-500 m-0",children:["Error loading posting details: ",_.message]})]}),t.jsxs(ve,{value:g,paginator:!0,rows:R,rowsPerPageOptions:[20,50,100],totalRecords:G,lazy:!0,first:w,onPage:e=>{if(ie(e.rows),V(e.first),!p)return;const a={...j,limit:e.rows,offset:e.first};P(a),q(a)},dataKey:"id",stripedRows:!0,size:"small",loading:de,headerLeft:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex align-items-center gap-2",children:[t.jsx(J,{value:l[0],onChange:e=>{A.current=!0,S(a=>[e,a[1]]),f({})},placeholder:"From date",fiscalYearStart:(i==null?void 0:i.start)??null,fiscalYearEnd:(i==null?void 0:i.end)??null,inputRef:oe,onEnterNext:()=>{var e;return(e=O.current)==null?void 0:e.focus()},autoFocus:!0,selectOnFocus:!0,style:{width:"130px"}}),t.jsx(J,{value:l[1],onChange:e=>{A.current=!0,S(a=>[a[0],e]),f({})},placeholder:"To date",fiscalYearStart:(i==null?void 0:i.start)??null,fiscalYearEnd:(i==null?void 0:i.end)??null,inputRef:O,onEnterNext:()=>{var e;return(e=k.current)==null?void 0:e.focus()},style:{width:"130px"}})]}),(v.fromDate||v.toDate)&&t.jsx("small",{className:"text-red-500",children:v.fromDate||v.toDate}),t.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"260px"},children:[t.jsx("i",{className:"pi pi-search"}),t.jsx(xe,{value:c,onChange:e=>m(e.target.value),placeholder:"Search ledger / voucher / narration",inputRef:k,style:{width:"100%"}})]}),t.jsx(Y,{value:h,options:ue,onChange:e=>re(e.value),placeholder:"Ledger",filter:!0,showClear:!0,style:{minWidth:"260px"}}),t.jsx(je,{value:N,options:ne,loading:ce,onChange:e=>se(e),placeholder:"Voucher type",loadingPlaceholder:"Loading voucher types...",onSelectNext:()=>U(C),style:{minWidth:"200px"}}),t.jsx(Y,{value:T,options:[{label:"All",value:-1},{label:"Not cancelled",value:0},{label:"Cancelled",value:1}],onChange:e=>ae(e.value),placeholder:"Status",onEnterNext:()=>U(M),ref:C,style:{minWidth:"160px"}}),t.jsx(Y,{value:I,options:[{label:"All",value:-1},{label:"Unreconciled",value:0},{label:"Reconciled",value:1}],onChange:e=>le(e.value),placeholder:"Reconciled",ref:M,style:{minWidth:"170px"}})]}),headerRight:t.jsxs(t.Fragment,{children:[t.jsx(D,{value:`Dr ${y(me)}`,severity:"info"}),t.jsx(D,{value:`Cr ${y(pe)}`,severity:"secondary"}),t.jsx(x,{label:"Refresh",icon:"pi pi-refresh",onClick:he}),t.jsx(x,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()})]}),recordSummary:`${g.length} row${g.length===1?"":"s"} • Total ${G}`,children:[t.jsx(u,{field:"date",header:"Date",body:e=>ee(e.date),sortable:!0,style:{width:"8rem"}}),t.jsx(u,{field:"voucherNo",header:"Voucher No",sortable:!0,style:{width:"7rem"}}),t.jsx(u,{field:"voucherType",header:"Type",sortable:!0,style:{width:"9rem"}}),t.jsx(u,{header:"Ledger",body:e=>t.jsxs("span",{children:[e.ledgerName,e.groupName?t.jsxs("span",{className:"text-600",children:[" (",e.groupName,")"]}):null]}),style:{width:"18rem"}}),t.jsx(u,{field:"narration",header:"Narration",body:e=>e.narration??""}),t.jsx(u,{field:"debit",header:"Dr",body:e=>e.debit?y(e.debit):"",style:{width:"8.5rem",textAlign:"right"}}),t.jsx(u,{field:"credit",header:"Cr",body:e=>e.credit?y(e.credit):"",style:{width:"8.5rem",textAlign:"right"}}),t.jsx(u,{header:"Recon Date",body:e=>ee(e.reconciliationDateText),style:{width:"9rem"}}),t.jsx(u,{header:"Recon Remark",body:e=>e.reconciliationRemark??""}),t.jsx(u,{header:"Status",body:e=>e.isCancelledFlag===1?t.jsx(D,{value:"Cancelled",severity:"danger"}):t.jsx(D,{value:"OK",severity:"success"}),style:{width:"7rem"}})]})]})}export{lt as default};
