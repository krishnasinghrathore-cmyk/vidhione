import{r as s,u as lr,j as t,b8 as jt,B as p,e as ir,I as Ge}from"./index-a2e62377.js";import{C as d}from"./column.esm-81c99a02.js";import{I as ur}from"./inputnumber.esm-991f482d.js";import{M as cr}from"./menu.esm-5ba2ffdb.js";import{T as St}from"./tag.esm-045cf529.js";import{T as dr}from"./toast.esm-b4e71f30.js";import{A as mr}from"./AppCompactToggle-348b435c.js";import{A as $t}from"./AppDataTable-ff6b8365.js";import{A as U,a as hr,v as be}from"./AppDateInput-ceb6f146.js";import{A as pr}from"./AppDropdown-800ebb2b.js";import{A as gr}from"./AppInput-10952e09.js";import{L as Ue}from"./LedgerAutoComplete-e39b4a77.js";import{L as fr}from"./LedgerGroupAutoComplete-0a48d498.js";import{A as br}from"./masterLookupCache-09ded647.js";import{u as vr}from"./ledgerGroups-1f2f8c53.js";import{r as Ct}from"./fiscalRange-d7f67286.js";import{V as xr}from"./voucherTypeIds-4d0ce300.js";import{u as C,g as v}from"./useQuery-55f3f513.js";import{u as He}from"./useMutation-fc9212b2.js";import"./index.esm-1ebbc8e4.js";import"./overlayservice.esm-bf9b13ee.js";import"./index.esm-716d0587.js";import"./index.esm-81904cc2.js";import"./index.esm-10fa0e2b.js";import"./TransitionGroup-03c23142.js";import"./splitbutton.esm-f8323715.js";import"./index.esm-287dfa04.js";import"./datatable.esm-b891b45f.js";import"./paginator.esm-e234ed6f.js";import"./index.esm-2f3fd837.js";import"./dropdown.esm-7710effc.js";import"./virtualscroller.esm-c60a9a04.js";import"./index.esm-23a64aa1.js";import"./index.esm-b05ab7aa.js";import"./index.esm-29a8c0d6.js";import"./skeleton.esm-8641005e.js";import"./reportExport-834d722d.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-4880a95e.js";import"./index.esm-e0ea7a14.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";import"./types-eaf96456.js";import"./AppAutoComplete-712e0696.js";import"./autocomplete.esm-a549ca28.js";import"./LedgerCurrentBalanceInline-c077fdcc.js";import"./ledgerOptions-43396d9f.js";import"./useIsomorphicLayoutEffect-da2e447d.js";const Ir=v`
    query VoucherTypes {
        voucherTypes {
            voucherTypeId
            voucherTypeCode
            displayName
            voucherTypeName
            isVoucherNoAutoFlag
        }
    }
`,Nr=v`
    query LedgerLookup($search: String, $limit: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                groupName
                ledgerGroupId
            }
        }
    }
`,yr=v`
    query ChequeIssueBooks($bankLedgerId: Int, $limit: Int) {
        chequeIssueBooks(bankLedgerId: $bankLedgerId, limit: $limit) {
            chequeIssueBookId
            voucherNumber
            voucherDate
            chequeStartNumber
            chequeEndNumber
            remarks
            isCancelledFlag
        }
    }
`,wr=v`
    query NextVoucherNumber(
        $voucherTypeId: Int!
        $companyFiscalYearId: Int
        $fiscalYearStart: String
        $fiscalYearEnd: String
    ) {
        nextVoucherNumber(
            voucherTypeId: $voucherTypeId
            companyFiscalYearId: $companyFiscalYearId
            fiscalYearStart: $fiscalYearStart
            fiscalYearEnd: $fiscalYearEnd
        )
    }
`,Dr=v`
    query ChequeIssueRegister(
        $bankLedgerId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        chequeIssueRegister(
            bankLedgerId: $bankLedgerId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            limit: $limit
            offset: $offset
        ) {
            items {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDate
                postingDate
                refNo
                refDate
                debitLedgerName
                debitLedgerGroupName
                debitLedgerNames
                debitLedgerAmounts
                creditLedgerName
                creditLedgerNames
                creditLedgerAmounts
                totalNetAmount
                narration
                chequeInFavourText
                chequeIssueBookId
                isCancelledFlag
            }
            totalCount
        }
    }
`,jr=v`
    query VoucherEntryById($voucherId: Int!) {
        voucherEntryById(voucherId: $voucherId) {
            header {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDate
                postingDate
                refNo
                refDate
                narration
                chequeInFavourText
                chequeIssueBookId
                isCancelledFlag
            }
            lines {
                ledgerId
                drCrFlag
                amount
            }
        }
    }
`,Sr=v`
    mutation CreateVoucher(
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $purchaseVoucherNumber: String
        $purchaseVoucherDateText: String
        $chequeInFavourText: String
        $chequeIssueBookId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        createVoucher(
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            purchaseVoucherNumber: $purchaseVoucherNumber
            purchaseVoucherDateText: $purchaseVoucherDateText
            chequeInFavourText: $chequeInFavourText
            chequeIssueBookId: $chequeIssueBookId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
            lines: $lines
        ) {
            voucherId
        }
    }
`,$r=v`
    mutation UpdateVoucherEntry(
        $voucherId: Int!
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $purchaseVoucherNumber: String
        $purchaseVoucherDateText: String
        $chequeInFavourText: String
        $chequeIssueBookId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        updateVoucherEntry(
            voucherId: $voucherId
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            purchaseVoucherNumber: $purchaseVoucherNumber
            purchaseVoucherDateText: $purchaseVoucherDateText
            chequeInFavourText: $chequeInFavourText
            chequeIssueBookId: $chequeIssueBookId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
            lines: $lines
        )
    }
`,Lr=v`
    mutation SetVoucherCancelled($voucherId: Int!, $isCancelledFlag: Int!) {
        setVoucherCancelled(voucherId: $voucherId, isCancelledFlag: $isCancelledFlag)
    }
`,H=n=>{if(!n)return null;const a=n.getFullYear(),i=String(n.getMonth()+1).padStart(2,"0"),L=String(n.getDate()).padStart(2,"0");return`${a}${i}${L}`},Ke=n=>{if(!n)return"";const a=new Date(n);return Number.isNaN(a.getTime())?n:a.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})},Qe=n=>new Intl.NumberFormat("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n),Lt=n=>Math.round(n*100)/100,Tr=n=>{if(n==null)return!1;if(typeof n=="boolean")return n;if(typeof n=="number")return n!==0;if(typeof n=="string"){const a=n.trim().toLowerCase();if(!a)return!1;if(a==="true"||a==="yes"||a==="y")return!0;const i=Number(a);return Number.isFinite(i)?i!==0:!1}return!1},Tt=()=>`${Date.now()}_${Math.random().toString(16).slice(2)}`,kr=n=>new Date(n.getFullYear(),n.getMonth(),n.getDate()),kt=(n,a)=>{const i=Ct(n,a);let f=kr(new Date);return i.end&&i.end<f&&(f=i.end),i.start&&f<i.start&&(f=i.start),{start:i.start,end:f}};function js(){var gt;const n=s.useRef(null),{companyContext:a}=lr(),[i,L]=s.useState(null),[f,Et]=s.useState(0),ve=s.useRef(kt((a==null?void 0:a.fiscalYearStart)??null,(a==null?void 0:a.fiscalYearEnd)??null)),[x,xe]=s.useState([ve.current.start??null,ve.current.end??null]),[K,Q]=s.useState({}),[Ie,qt]=s.useState(20),[Ne,E]=s.useState(0),[ye,ze]=s.useState("format-1"),Ft=s.useRef(null),We=s.useRef(null),Xe=s.useRef(null),Vt=s.useRef(null),Je=s.useRef(null),At="bank-cheque-issue-refresh",Ze=s.useRef(null),z=s.useRef(!1),[b,we]=s.useState(!1),[h,De]=s.useState(null),[q,F]=s.useState(""),[W,X]=s.useState(new Date),[je,J]=s.useState(new Date),[Se,Z]=s.useState(""),[ee,te]=s.useState(new Date),[et,$e]=s.useState(null),[tt,Le]=s.useState(null),[rt,Te]=s.useState(null),[V,re]=s.useState(""),[ke,se]=s.useState(null),[A,ae]=s.useState(""),[B,Ce]=s.useState(null),[R,I]=s.useState(null),[ne,oe]=s.useState(null),[le,Y]=s.useState([]),[st,Bt]=s.useState(!1),[Ee,Rt]=s.useState(!0),[qe,ie]=s.useState(!1),{data:ue}=C(Ir),{options:Yt,loading:Pt}=vr(),{data:ce,loading:at}=C(Nr,{variables:{search:null,limit:5e3},...br}),y=s.useMemo(()=>((ue==null?void 0:ue.voucherTypes)??[]).find(r=>Number(r.voucherTypeId)===xr.Payment)??null,[ue]),P=s.useMemo(()=>y?Number(y.voucherTypeId):null,[y]),nt=s.useMemo(()=>Tr(y==null?void 0:y.isVoucherNoAutoFlag),[y]),ot=(a==null?void 0:a.companyFiscalYearId)??null,lt=(a==null?void 0:a.fiscalYearStart)??null,it=(a==null?void 0:a.fiscalYearEnd)??null,T=!!P,de=s.useMemo(()=>({voucherTypeId:P??0,companyFiscalYearId:ot??null,fiscalYearStart:lt,fiscalYearEnd:it}),[ot,it,lt,P]),{data:k,refetch:Fe,error:ut}=C(wr,{skip:!T,variables:de});s.useEffect(()=>{var e;if(!b||h){z.current=!1;return}if(!ut){z.current=!1;return}z.current||((e=n.current)==null||e.show({severity:"warn",summary:"Configuration",detail:"Unable to generate voucher number. Please contact administrator."}),z.current=!0)},[b,h,ut]);const Ve=x[0]?H(x[0]):null,Ae=x[1]?H(x[1]):null,l=s.useMemo(()=>Ct((a==null?void 0:a.fiscalYearStart)??null,(a==null?void 0:a.fiscalYearEnd)??null),[a==null?void 0:a.fiscalYearStart,a==null?void 0:a.fiscalYearEnd]),Be=s.useRef(!1),Mt=!!(Ve&&Ae),ct=e=>{var r,o;(o=(r=e.current)==null?void 0:r.focus)==null||o.call(r)};s.useEffect(()=>{if(Be.current)return;const e=kt((a==null?void 0:a.fiscalYearStart)??null,(a==null?void 0:a.fiscalYearEnd)??null);ve.current=e,xe([e.start??null,e.end??null])},[a==null?void 0:a.fiscalYearStart,a==null?void 0:a.fiscalYearEnd]);const w=s.useMemo(()=>({bankLedgerId:i,fromDate:Ve,toDate:Ae,cancelled:f,limit:Ie,offset:Ne}),[i,f,Ne,Ve,Ie,Ae]),[Re,Ye]=s.useState(null),M=Re!==null,{data:D,loading:_t,error:dt,refetch:me}=C(Dr,{variables:Re??w,skip:!Re}),{data:j,refetch:mt}=C(jr,{skip:!h,variables:{voucherId:h??0}}),{data:he}=C(yr,{skip:!i,variables:{bankLedgerId:i??0,limit:5e3}}),[Ot]=He(Sr),[Gt]=He($r),[Ut]=He(Lr),_=s.useMemo(()=>{var r;return(((r=ce==null?void 0:ce.ledgerSummaries)==null?void 0:r.items)??[]).map(o=>({label:`${o.name??""}${o.groupName?` (${o.groupName})`:""}`.trim()||`Ledger ${o.ledgerId}`,value:Number(o.ledgerId),groupName:String(o.groupName??""),ledgerGroupId:o.ledgerGroupId!=null?Number(o.ledgerGroupId):null}))},[ce]),Ht=s.useMemo(()=>{const e=new Map;return _.forEach(r=>e.set(Number(r.value),String(r.label))),e},[_]),S=s.useMemo(()=>B?_.filter(r=>Number(r.ledgerGroupId||0)===Number(B)):_,[_,B]),[pe,g]=s.useState(""),[ht,Pe]=s.useState([]),Kt=s.useMemo(()=>R!=null?S.find(e=>Number(e.value)===Number(R))??null:null,[S,R]),Qt=pe.length?pe:Kt;s.useEffect(()=>{const e=pe.trim().toLowerCase();if(!e){Pe(S);return}Pe(S.filter(r=>r.label.toLowerCase().includes(e)))},[S,pe]);const zt=s.useMemo(()=>{const r=((he==null?void 0:he.chequeIssueBooks)??[]).filter(o=>!o.isCancelledFlag);return[{label:"Select cheque book",value:null}].concat(r.map(o=>({label:[o.voucherNumber?o.voucherNumber:`Book ${o.chequeIssueBookId}`,o.chequeStartNumber!=null&&o.chequeEndNumber!=null?`(${o.chequeStartNumber} to ${o.chequeEndNumber})`:null].filter(Boolean).join(" "),value:Number(o.chequeIssueBookId)})))},[he]),pt=s.useMemo(()=>{var e;return M?((e=D==null?void 0:D.chequeIssueRegister)==null?void 0:e.items)??[]:[]},[D,M]),Me=M?((gt=D==null?void 0:D.chequeIssueRegister)==null?void 0:gt.totalCount)??pt.length??0:0,Wt=s.useMemo(()=>[{label:"Format 1",icon:ye==="format-1"?"pi pi-check":void 0,command:()=>{ze("format-1"),window.print()}},{label:"Format 2",icon:ye==="format-2"?"pi pi-check":void 0,command:()=>{ze("format-2"),window.print()}}],[ye]),Xt=s.useMemo(()=>Lt(le.reduce((e,r)=>e+Number(r.amount||0),0)),[le]),Jt=()=>{const e=hr({fromDate:x[0],toDate:x[1]});if(!e.ok){Q(e.errors);return}if(Q({}),!M){Ye(w);return}Ye(w),me(w)};s.useEffect(()=>{b&&(h||T&&Fe(de).catch(()=>{}))},[T,b,h,de,Fe]),s.useEffect(()=>{!b||!h||mt({voucherId:h}).catch(()=>{})},[b,h,mt]),s.useEffect(()=>{var O,G;if(!b||!h)return;const e=(O=j==null?void 0:j.voucherEntryById)==null?void 0:O.header;if(!e)return;F(e.voucherNumber??""),X(e.voucherDate?new Date(`${e.voucherDate}T00:00:00`):new Date),J(e.postingDate?new Date(`${e.postingDate}T00:00:00`):new Date),Z(e.refNo??""),te(e.refDate?new Date(`${e.refDate}T00:00:00`):new Date),re(e.chequeInFavourText??""),se(e.chequeIssueBookId!=null?Number(e.chequeIssueBookId):null),ae(e.narration??"");const r=((G=j==null?void 0:j.voucherEntryById)==null?void 0:G.lines)??[],o=r.some(c=>Number(c.drCrFlag)===2),m=c=>o?c===1:c===0,N=c=>o?c===2:c===1,$=r.find(c=>N(Number(c.drCrFlag))),ge=r.filter(c=>m(Number(c.drCrFlag)));L(($==null?void 0:$.ledgerId)!=null?Number($.ledgerId):i),Y(ge.map(c=>({key:Tt(),ledgerId:c.ledgerId!=null?Number(c.ledgerId):null,amount:c.amount!=null?Number(c.amount):null})))},[i,b,j,h]);const Zt=()=>{De(null),F(T?(k==null?void 0:k.nextVoucherNumber)??"":""),X(new Date),J(new Date),Z(""),te(new Date),re(""),se(null),ae(""),Ce(null),I(null),g(""),oe(null),Y([]),ie(!1),we(!0)},_e=e=>{if(!e.voucherDate)return!1;const r=new Date(`${e.voucherDate}T00:00:00`);return Number.isNaN(r.getTime())?!1:be({date:r},l).ok},er=e=>{var r;if(!_e(e)){(r=n.current)==null||r.show({severity:"warn",summary:"Restricted",detail:"Editing is allowed only within the current fiscal year."});return}De(e.voucherId),ie(!1),we(!0)},tr=()=>{var e;if(!R||!ne||ne<=0){(e=n.current)==null||e.show({severity:"warn",summary:"Validation",detail:"Select a ledger and enter amount."});return}Y(r=>[...r,{key:Tt(),ledgerId:Number(R),amount:Number(ne)}]),oe(null)},rr=e=>Y(r=>r.filter(o=>o.key!==e)),sr=async()=>{var $,ge,O,G,c,ft,bt,vt,xt,It,Nt,yt,wt;const e=be({date:W},l);if(!e.ok){const u=e.errors.date??"Voucher date is required";$e(u),($=n.current)==null||$.show({severity:"warn",summary:"Validation",detail:u});return}const r=be({date:je},l);if(!r.ok){const u=r.errors.date??"Posting date is required";Le(u),(ge=n.current)==null||ge.show({severity:"warn",summary:"Validation",detail:u});return}const o=be({date:ee},l);if(!o.ok){const u=o.errors.date??"Cheque date is required";Te(u),(O=n.current)==null||O.show({severity:"warn",summary:"Validation",detail:u});return}if($e(null),Le(null),Te(null),!P){(G=n.current)==null||G.show({severity:"error",summary:"Missing",detail:"Payment voucher type not found."});return}if(!i){(c=n.current)==null||c.show({severity:"warn",summary:"Validation",detail:"Select bank ledger."});return}if(!W)return;if(!ke){(ft=n.current)==null||ft.show({severity:"warn",summary:"Validation",detail:"Select cheque book."});return}if(!Se.trim()){(bt=n.current)==null||bt.show({severity:"warn",summary:"Validation",detail:"Enter cheque number."});return}if(!ee)return;const m=le.filter(u=>u.ledgerId&&u.amount&&Number(u.amount)>0).map(u=>({ledgerId:Number(u.ledgerId),amount:Number(u.amount)}));if(m.length===0){(vt=n.current)==null||vt.show({severity:"warn",summary:"Validation",detail:"Add at least one debit line."});return}const N=Lt(m.reduce((u,Oe)=>u+Number(Oe.amount||0),0));if(N<=0){(xt=n.current)==null||xt.show({severity:"warn",summary:"Validation",detail:"Total amount must be greater than zero."});return}ie(!0);try{const u=A!=null&&A.trim()?A.trim():null,Oe=[{ledgerId:i,drCrFlag:1,amount:N,narrationText:u},...m.map(fe=>({ledgerId:fe.ledgerId,drCrFlag:0,amount:fe.amount,narrationText:u}))],Dt={voucherTypeId:P,voucherDateText:H(W),postingDateText:H(je),voucherNumber:q!=null&&q.trim()?q.trim():null,narrationText:u,purchaseVoucherNumber:Se.trim(),purchaseVoucherDateText:H(ee),chequeInFavourText:V!=null&&V.trim()?V.trim():null,chequeIssueBookId:Number(ke),primaryLedgerId:Number(i),isDepositFlag:0,lines:Oe};if(h?(await Gt({variables:{voucherId:h,...Dt}}),(It=n.current)==null||It.show({severity:"success",summary:"Updated",detail:"Cheque issue updated."})):(await Ot({variables:Dt}),(Nt=n.current)==null||Nt.show({severity:"success",summary:"Saved",detail:"Cheque issue saved."})),await me(w),st&&(De(null),F(T?(k==null?void 0:k.nextVoucherNumber)??"":""),X(new Date),J(new Date),Z(""),te(new Date),re(""),ae(""),Ce(null),I(null),g(""),oe(null),Y([]),T)){const fe=await Fe(de);F(((yt=fe.data)==null?void 0:yt.nextVoucherNumber)??"")}}catch(u){(wt=n.current)==null||wt.show({severity:"error",summary:"Error",detail:(u==null?void 0:u.message)??"Failed to save."})}finally{ie(!1)}},ar=async e=>{var r,o;if(!_e(e)){(r=n.current)==null||r.show({severity:"warn",summary:"Restricted",detail:"Editing is allowed only within the current fiscal year."});return}try{const m=e.isCancelledFlag?0:1;await Ut({variables:{voucherId:e.voucherId,isCancelledFlag:m}}),await me(w)}catch(m){(o=n.current)==null||o.show({severity:"error",summary:"Error",detail:(m==null?void 0:m.message)??"Failed to update status."})}},nr=e=>e.isCancelledFlag?t.jsx(St,{value:"Cancelled",severity:"danger"}):t.jsx(St,{value:"Active",severity:"success"}),or=e=>{const r=_e(e),o="Editing is allowed only within the current fiscal year.";return t.jsxs("div",{className:"flex gap-2",children:[t.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>er(e),disabled:!r,title:r?void 0:o}),t.jsx(p,{icon:e.isCancelledFlag?"pi pi-undo":"pi pi-times",className:"p-button-text",onClick:()=>ar(e),severity:e.isCancelledFlag?"secondary":"danger",disabled:!r,title:r?void 0:o})]})};return t.jsxs("div",{className:"card app-gradient-card",children:[t.jsx(dr,{ref:n}),t.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[t.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[t.jsxs("div",{children:[t.jsx("h2",{className:"m-0",children:"Bank Cheque Issue"}),t.jsx("p",{className:"mt-2 mb-0 text-600",children:"Payment vouchers where a Bank ledger is credited and one or more ledgers are debited."})]}),t.jsxs("div",{className:"flex gap-2 flex-wrap",children:[t.jsx(jt,{to:"/apps/accounts/voucher-entry?voucherTypeCode=2",children:t.jsx(p,{label:"Voucher Entry",icon:"pi pi-pencil",className:"p-button-outlined"})}),t.jsx(jt,{to:"/apps/accounts",children:t.jsx(p,{label:"Back",icon:"pi pi-arrow-left",className:"p-button-outlined"})})]})]}),dt&&t.jsxs("p",{className:"text-red-500 m-0",children:["Error loading cheque issues: ",dt.message]})]}),t.jsxs($t,{value:pt,paginator:!0,rows:Ie,rowsPerPageOptions:[20,50,100],totalRecords:Me,lazy:!0,first:Ne,onPage:e=>{if(qt(e.rows),E(e.first),!M)return;const r={...w,limit:e.rows,offset:e.first};Ye(r),me(r)},dataKey:"voucherId",stripedRows:!0,size:"small",loading:_t,headerLeft:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex align-items-center gap-2",children:[t.jsx(U,{value:x[0],onChange:e=>{E(0),Be.current=!0,xe(r=>[e,r[1]]),Q({})},placeholder:"From date",fiscalYearStart:(l==null?void 0:l.start)??null,fiscalYearEnd:(l==null?void 0:l.end)??null,inputRef:Ft,onEnterNext:()=>{var e;return(e=We.current)==null?void 0:e.focus()},autoFocus:!0,selectOnFocus:!0,style:{width:"130px"}}),t.jsx(U,{value:x[1],onChange:e=>{E(0),Be.current=!0,xe(r=>[r[0],e]),Q({})},placeholder:"To date",fiscalYearStart:(l==null?void 0:l.start)??null,fiscalYearEnd:(l==null?void 0:l.end)??null,inputRef:We,onEnterNext:()=>ct(Xe),style:{width:"130px"}})]}),(K.fromDate||K.toDate)&&t.jsx("small",{className:"text-red-500",children:K.fromDate||K.toDate}),t.jsx(Ue,{variant:"purpose",purpose:"CONTRA-BANK",value:i,onChange:e=>{E(0),L(e)},placeholder:"Bank ledger",loadingPlaceholder:"Loading bank ledgers...",ref:Xe,style:{minWidth:"240px"}}),t.jsx("div",{className:"flex align-items-center gap-2",children:t.jsx(mr,{checked:f===1,onChange:e=>{E(0),Et(e?1:0)},onLabel:"Cancelled",offLabel:"Not cancelled"})})]}),headerRight:t.jsxs(t.Fragment,{children:[t.jsx(p,{label:"Add",icon:"pi pi-plus",onClick:Zt}),t.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",id:At,onClick:Jt,disabled:!Mt}),t.jsx(cr,{model:Wt,popup:!0,ref:Ze}),t.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:e=>{var r;return(r=Ze.current)==null?void 0:r.toggle(e)}})]}),recordSummary:`${Me} voucher${Me===1?"":"s"}`,children:[t.jsx(d,{field:"voucherDate",header:"Voucher Date",body:e=>Ke(e.voucherDate??null),style:{width:"9rem"}}),t.jsx(d,{field:"voucherNumber",header:"Voucher No",style:{width:"8rem"}}),t.jsx(d,{field:"postingDate",header:"Posting Date",body:e=>Ke(e.postingDate??null),style:{width:"9rem"}}),t.jsx(d,{field:"creditLedgerName",header:"Ledger (Cr)",body:e=>e.creditLedgerName??e.creditLedgerNames??"",style:{minWidth:"14rem"}}),t.jsx(d,{field:"refNo",header:"Cheque No",style:{width:"9rem"}}),t.jsx(d,{field:"refDate",header:"Cheque Date",body:e=>Ke(e.refDate??null),style:{width:"9rem"}}),t.jsx(d,{field:"totalNetAmount",header:"Net Amt",body:e=>Qe(Number(e.totalNetAmount||0)),style:{width:"9rem",textAlign:"right"}}),t.jsx(d,{header:"Ag. Ledger (Dr)",body:e=>t.jsx("span",{style:{whiteSpace:"pre-line"},children:(e.debitLedgerNames??e.debitLedgerName??"").trim()}),style:{minWidth:"16rem"}}),t.jsx(d,{header:"Ag. Amt",body:e=>t.jsx("span",{style:{whiteSpace:"pre-line"},children:(e.debitLedgerAmounts??"").trim()}),style:{width:"9rem",textAlign:"right"}}),t.jsx(d,{field:"chequeInFavourText",header:"Chq. In Favour",body:e=>e.chequeInFavourText??""}),t.jsx(d,{field:"narration",header:"Narration",body:e=>e.narration??""}),t.jsx(d,{field:"debitLedgerGroupName",header:"Ledger Group",style:{width:"12rem"}}),t.jsx(d,{field:"isCancelledFlag",header:"Status",body:nr,style:{width:"8rem"}}),t.jsx(d,{header:"Actions",body:or,style:{width:"8rem"}})]}),b&&t.jsxs("div",{className:`mt-3 p-3 surface-50 border-round entry-form ${Ee?"entry-form--pinned":""}`,children:[t.jsxs("div",{className:"flex flex-wrap align-items-center justify-content-between gap-3 mb-3",children:[t.jsx("div",{className:"font-semibold",children:h?"Edit Cheque Issue":"Add Cheque Issue"}),t.jsxs("div",{className:"flex align-items-center gap-3",children:[t.jsxs("div",{className:"flex align-items-center gap-2",children:[t.jsx(ir,{checked:st,onChange:e=>Bt(!!e.value),className:"app-inputswitch"}),t.jsx("span",{className:"text-600 text-sm",children:"Fast Add"})]}),t.jsx(p,{icon:"pi pi-thumbtack",className:`p-button-text p-button-rounded entry-form__pin ${Ee?"entry-form__pin--pinned":"entry-form__pin--unpinned"}`,onClick:()=>Rt(e=>!e),tooltip:Ee?"Unpin form":"Pin form",tooltipOptions:{position:"left"}})]})]}),t.jsx("div",{className:"entry-form__body",children:t.jsxs("div",{className:"grid",children:[t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Voucher No"}),t.jsx(gr,{value:q,onChange:e=>F(e.target.value),className:nt?void 0:"app-field-noneditable",readOnly:!nt})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Voucher Date"}),t.jsx(U,{value:W,onChange:e=>{X(e),$e(null)},fiscalYearStart:(l==null?void 0:l.start)??null,fiscalYearEnd:(l==null?void 0:l.end)??null,enforceFiscalRange:!0,style:{width:"100%"}}),et&&t.jsx("small",{className:"text-red-500",children:et})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Posting Date"}),t.jsx(U,{value:je,onChange:e=>{J(e),Le(null)},fiscalYearStart:(l==null?void 0:l.start)??null,fiscalYearEnd:(l==null?void 0:l.end)??null,enforceFiscalRange:!0,style:{width:"100%"}}),tt&&t.jsx("small",{className:"text-red-500",children:tt})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Bank Ledger (Cr)"}),t.jsx(Ue,{variant:"purpose",purpose:"CONTRA-BANK",value:i,onChange:e=>{L(e),se(null)},placeholder:"Select bank ledger",loadingPlaceholder:"Loading bank ledgers...",style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Cheque No"}),t.jsx(Ge,{value:Se,onChange:e=>Z(e.target.value)})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Cheque Date"}),t.jsx(U,{value:ee,onChange:e=>{te(e),Te(null)},fiscalYearStart:(l==null?void 0:l.start)??null,fiscalYearEnd:(l==null?void 0:l.end)??null,enforceFiscalRange:!0,style:{width:"100%"}}),rt&&t.jsx("small",{className:"text-red-500",children:rt})]}),t.jsxs("div",{className:"col-12 md:col-6",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Cheque Book"}),t.jsx(pr,{value:ke,options:zt.filter(e=>e.value),onChange:e=>se(e.value),placeholder:i?"Select cheque book":"Select bank first",filter:!0,showClear:!0,style:{width:"100%"},disabled:!i})]}),t.jsxs("div",{className:"col-12 md:col-6",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Cheque In Favour"}),t.jsx(Ge,{value:V,onChange:e=>re(e.target.value),style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12 md:col-6",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Narration"}),t.jsx(Ge,{value:A,onChange:e=>ae(e.target.value),style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12",children:[t.jsx("div",{className:"text-700 font-medium mb-2",children:"Debit Lines (Ag. Ledger)"}),t.jsxs("div",{className:"grid align-items-end",children:[t.jsxs("div",{className:"col-12 md:col-4",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Ledger Group"}),t.jsx(fr,{value:B,options:Yt,loading:Pt,onChange:e=>{Ce(e),I(null),g("")},placeholder:"Ledger group",loadingPlaceholder:"Loading groups...",onSelectNext:()=>ct(Je),ref:Vt,style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12 md:col-5",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Ledger (Dr)"}),t.jsx(Ue,{value:Qt,suggestions:ht,ledgerGroupId:B,completeMethod:e=>{const r=e.query??"";g(r)},onDropdownClick:()=>{g(""),Pe(S)},onChange:e=>{const r=e.value;if(r==null){g(""),I(null);return}if(typeof r=="string"){const o=r.trim();if(!o){g(""),I(null);return}const m=ht.find(N=>N.label.toLowerCase()===o.toLowerCase())??S.find(N=>N.label.toLowerCase()===o.toLowerCase())??null;if(m){g(""),I(Number(m.value));return}g(r),I(null);return}g(""),I(Number(r.value))},field:"label",loading:at,showLoadingIcon:!0,placeholder:at?"Loading ledgers...":"Select ledger",ref:Je,style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12 md:col-2",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Amount"}),t.jsx(ur,{value:ne,onValueChange:e=>oe(e.value),min:0,mode:"decimal",style:{width:"100%"}})]}),t.jsx("div",{className:"col-12 md:col-1 flex justify-content-end",children:t.jsx(p,{icon:"pi pi-plus",className:"p-button-text",onClick:tr})})]}),t.jsx("div",{className:"mt-2",children:t.jsxs($t,{value:le,dataKey:"key",size:"small",stripedRows:!0,children:[t.jsx(d,{header:"Ledger",body:e=>e.ledgerId?Ht.get(Number(e.ledgerId))??`Ledger ${e.ledgerId}`:""}),t.jsx(d,{header:"Amount",body:e=>Qe(Number(e.amount||0)),style:{width:"10rem",textAlign:"right"}}),t.jsx(d,{header:"",body:e=>t.jsx(p,{icon:"pi pi-trash",className:"p-button-text p-button-danger",onClick:()=>rr(e.key)}),style:{width:"4rem"}})]})})]})]})}),t.jsxs("div",{className:"flex justify-content-between align-items-center w-full pt-3 mt-3 border-top-1 surface-border",children:[t.jsxs("div",{className:"text-600",children:["Total: ",t.jsx("strong",{children:Qe(Xt)})]}),t.jsxs("div",{className:"flex gap-2",children:[t.jsx(p,{label:"Close",className:"p-button-text",onClick:()=>we(!1),disabled:qe}),t.jsx(p,{label:qe?"Saving...":"Save",icon:"pi pi-check",onClick:sr,disabled:qe})]})]})]})]})}export{js as default};
