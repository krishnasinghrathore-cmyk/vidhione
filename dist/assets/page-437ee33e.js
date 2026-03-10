import{r as s,u as kt,j as t,B as v,I as at,b8 as rt}from"./index-a2e62377.js";import{C as N}from"./column.esm-81c99a02.js";import{D as Ct}from"./dialog.esm-6e6fddb6.js";import{I as st}from"./inputnumber.esm-991f482d.js";import{T as Tt}from"./toast.esm-b4e71f30.js";import{A as Et}from"./AppDataTable-ff6b8365.js";import{A as re,a as Vt,v as ke}from"./AppDateInput-ceb6f146.js";import{A as _}from"./AppDropdown-800ebb2b.js";import{A as Ft}from"./AppInput-10952e09.js";import{L as lt}from"./LedgerAutoComplete-e39b4a77.js";import{u as nt}from"./ledgerOptions-43396d9f.js";import{r as Ce}from"./fiscalRange-d7f67286.js";import{V as Rt}from"./voucherTypeIds-4d0ce300.js";import{d as Lt,g as Yt}from"./voucherActionsState-7dff2933.js";import{u as H,g as D}from"./useQuery-55f3f513.js";import{u as Te}from"./useMutation-fc9212b2.js";import"./index.esm-1ebbc8e4.js";import"./index.esm-716d0587.js";import"./index.esm-81904cc2.js";import"./index.esm-10fa0e2b.js";import"./TransitionGroup-03c23142.js";import"./splitbutton.esm-f8323715.js";import"./index.esm-287dfa04.js";import"./overlayservice.esm-bf9b13ee.js";import"./datatable.esm-b891b45f.js";import"./paginator.esm-e234ed6f.js";import"./index.esm-2f3fd837.js";import"./dropdown.esm-7710effc.js";import"./virtualscroller.esm-c60a9a04.js";import"./index.esm-23a64aa1.js";import"./index.esm-b05ab7aa.js";import"./index.esm-29a8c0d6.js";import"./skeleton.esm-8641005e.js";import"./reportExport-834d722d.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-4880a95e.js";import"./index.esm-e0ea7a14.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";import"./types-eaf96456.js";import"./AppAutoComplete-712e0696.js";import"./autocomplete.esm-a549ca28.js";import"./LedgerCurrentBalanceInline-c077fdcc.js";import"./masterLookupCache-09ded647.js";import"./useIsomorphicLayoutEffect-da2e447d.js";const Bt=D`
    query VoucherTypes {
        voucherTypes {
            voucherTypeId
            voucherTypeCode
            displayName
            voucherTypeName
            isVoucherNoAutoFlag
        }
    }
`,Mt=D`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
        }
    }
`,Pt=D`
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
`,Ot=D`
    query BankCashDepositRegister(
        $bankLedgerId: Int
        $cashLedgerId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        bankCashDepositRegister(
            bankLedgerId: $bankLedgerId
            cashLedgerId: $cashLedgerId
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
                debitLedgerName
                debitLedgerGroupName
                debitLedgerNames
                debitLedgerAmounts
                creditLedgerName
                creditLedgerNames
                creditLedgerAmounts
                totalNetAmount
                narration
                isCancelledFlag
                managerId
                managerName
                managerDetails
                managerDetailsAmount
                monthName
                yearMonth
            }
            totalCount
        }
    }
`,Ut=D`
    query VoucherEntryById($voucherId: Int!) {
        voucherEntryById(voucherId: $voucherId) {
            header {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDate
                postingDate
                narration
                totalNetAmount
                isCancelledFlag
                managerId
            }
            lines {
                ledgerId
                drCrFlag
                amount
            }
            managerAllocations {
                voucherManagerAllocationId
                managerId
                allocationAmount
                remarks
            }
        }
    }
`,_t=D`
    mutation CreateVoucher(
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $managerId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $managerAllocations: [VoucherManagerAllocationInput!]
        $lines: [VoucherLineInput!]!
    ) {
        createVoucher(
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            managerId: $managerId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
            managerAllocations: $managerAllocations
            lines: $lines
        ) {
            voucherId
        }
    }
`,Ht=D`
    mutation UpdateVoucherEntry(
        $voucherId: Int!
        $voucherTypeId: Int!
        $voucherDateText: String!
        $postingDateText: String
        $voucherNumber: String
        $narrationText: String
        $managerId: Int
        $primaryLedgerId: Int
        $isDepositFlag: Int
        $managerAllocations: [VoucherManagerAllocationInput!]
        $lines: [VoucherLineInput!]!
    ) {
        updateVoucherEntry(
            voucherId: $voucherId
            voucherTypeId: $voucherTypeId
            voucherDateText: $voucherDateText
            postingDateText: $postingDateText
            voucherNumber: $voucherNumber
            narrationText: $narrationText
            managerId: $managerId
            primaryLedgerId: $primaryLedgerId
            isDepositFlag: $isDepositFlag
            managerAllocations: $managerAllocations
            lines: $lines
        )
    }
`,qt=D`
    mutation SetVoucherCancelled($voucherId: Int!, $isCancelledFlag: Int!) {
        setVoucherCancelled(voucherId: $voucherId, isCancelledFlag: $isCancelledFlag)
    }
`,se=l=>{if(!l)return null;const r=l.getFullYear(),h=String(l.getMonth()+1).padStart(2,"0"),E=String(l.getDate()).padStart(2,"0");return`${r}${h}${E}`},ot=l=>{if(!l)return"";const r=new Date(l);return Number.isNaN(r.getTime())?l:r.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})},le=l=>new Intl.NumberFormat("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}).format(l),Ee=l=>Math.round(l*100)/100,Gt=l=>{if(l==null)return!1;if(typeof l=="boolean")return l;if(typeof l=="number")return l!==0;if(typeof l=="string"){const r=l.trim().toLowerCase();if(!r)return!1;if(r==="true"||r==="yes"||r==="y")return!0;const h=Number(r);return Number.isFinite(h)?h!==0:!1}return!1},it=()=>`${Date.now()}_${Math.random().toString(16).slice(2)}`;function Ba(){var Ze;const l=s.useRef(null),{companyContext:r}=kt(),[h,E]=s.useState(null),[ne,ct]=s.useState(0),oe=s.useRef(Ce((r==null?void 0:r.fiscalYearStart)??null,(r==null?void 0:r.fiscalYearEnd)??null)),[x,ie]=s.useState([oe.current.start??null,oe.current.end??null]),[q,G]=s.useState({}),[ce,ut]=s.useState(20),[K,C]=s.useState(0),dt=s.useRef(null),Ve=s.useRef(null),Fe=s.useRef(null),mt="bank-cash-deposit-refresh",z=s.useRef(!1),[p,V]=s.useState(!1),[c,Re]=s.useState(null),[F,ue]=s.useState(""),[W,de]=s.useState(new Date),[me,he]=s.useState(new Date),[Le,ge]=s.useState(null),[Ye,pe]=s.useState(null),[I,fe]=s.useState(null),[y,ve]=s.useState(null),[g,be]=s.useState(""),[T,Ne]=s.useState(null),[R,L]=s.useState([]),[Q,A]=s.useState(!1),{data:X}=H(Bt),{options:Be}=nt({purpose:"CONTRA-BANK",limit:2e3}),{options:Me}=nt({purpose:"CONTRA-CASH",limit:2e3}),{data:J}=H(Mt,{variables:{search:null,limit:5e3}}),j=s.useMemo(()=>((X==null?void 0:X.voucherTypes)??[]).find(a=>Number(a.voucherTypeId)===Rt.Contra)??null,[X]),Y=s.useMemo(()=>j?Number(j.voucherTypeId):null,[j]),Pe=s.useMemo(()=>Gt(j==null?void 0:j.isVoucherNoAutoFlag),[j]),Oe=(r==null?void 0:r.companyFiscalYearId)??null,Ue=(r==null?void 0:r.fiscalYearStart)??null,_e=(r==null?void 0:r.fiscalYearEnd)??null,Z=!!Y,xe=s.useMemo(()=>({voucherTypeId:Y??0,companyFiscalYearId:Oe??null,fiscalYearStart:Ue,fiscalYearEnd:_e}),[Oe,_e,Ue,Y]),{data:Ie,refetch:He,error:qe}=H(Pt,{skip:!Z,variables:xe});s.useEffect(()=>{var e;if(!p||c){z.current=!1;return}if(!qe){z.current=!1;return}z.current||((e=l.current)==null||e.show({severity:"warn",summary:"Configuration",detail:"Unable to generate voucher number. Please contact administrator."}),z.current=!0)},[p,c,qe]);const ye=x[0]?se(x[0]):null,De=x[1]?se(x[1]):null,n=s.useMemo(()=>Ce((r==null?void 0:r.fiscalYearStart)??null,(r==null?void 0:r.fiscalYearEnd)??null),[r==null?void 0:r.fiscalYearStart,r==null?void 0:r.fiscalYearEnd]),Ae=s.useRef(!1),Ge=!!(ye&&De),ht=e=>{var a,u;(u=(a=e.current)==null?void 0:a.focus)==null||u.call(a)};s.useEffect(()=>{if(Ae.current)return;const e=Ce((r==null?void 0:r.fiscalYearStart)??null,(r==null?void 0:r.fiscalYearEnd)??null);oe.current=e,ie([e.start??null,e.end??null])},[r==null?void 0:r.fiscalYearStart,r==null?void 0:r.fiscalYearEnd]);const w=s.useMemo(()=>({bankLedgerId:h,cashLedgerId:I,fromDate:ye,toDate:De,cancelled:ne,limit:ce,offset:K}),[h,I,ne,K,ye,ce,De]),[je,we]=s.useState(null),B=je!==null,{data:S,loading:gt,error:Ke,refetch:ee}=H(Ot,{variables:je??w,skip:!je}),{data:b,refetch:ze}=H(Ut,{skip:!c,variables:{voucherId:c??0}}),[pt]=Te(_t),[ft]=Te(Ht),[vt]=Te(qt),bt=s.useMemo(()=>{const e=Be.map(a=>({label:a.label,value:Number(a.value)})).filter(a=>Number.isFinite(a.value)&&a.value>0);return[{label:"All bank ledgers",value:null}].concat(e)},[Be]),Nt=s.useMemo(()=>{const e=Me.map(a=>({label:a.label,value:Number(a.value)})).filter(a=>Number.isFinite(a.value)&&a.value>0);return[{label:"All cash ledgers",value:null}].concat(e)},[Me]),We=s.useMemo(()=>{const e=(J==null?void 0:J.managers)??[];return[{label:"Select manager",value:null}].concat(e.map(a=>({label:a.name??`Manager ${a.managerId}`,value:Number(a.managerId)})))},[J]),Qe=s.useMemo(()=>{var e;return B?((e=S==null?void 0:S.bankCashDepositRegister)==null?void 0:e.items)??[]:[]},[S,B]),M=B?((Ze=S==null?void 0:S.bankCashDepositRegister)==null?void 0:Ze.totalCount)??Qe.length??0:0,{uiState:Xe,baseUiState:Je}=s.useMemo(()=>Lt(p,c!=null,Q),[p,c,Q]),d=s.useMemo(()=>Yt({uiState:Xe,baseUiState:Je,hasVoucherId:c!=null,canRefresh:Ge,hasRegisterRows:M>0}),[Ge,c,M,Je,Xe]),xt=s.useMemo(()=>Ee(R.reduce((e,a)=>e+Number(a.allocationAmount||0),0)),[R]),It=()=>{const e=Vt({fromDate:x[0],toDate:x[1]});if(!e.ok){G(e.errors);return}if(G({}),!B){we(w);return}we(w),ee(w)};s.useEffect(()=>{p&&(c||Z&&He(xe).catch(()=>{}))},[Z,p,c,xe,He]),s.useEffect(()=>{!p||!c||ze({voucherId:c}).catch(()=>{})},[p,c,ze]),s.useEffect(()=>{var P,O,U;if(!p||!c)return;const e=(P=b==null?void 0:b.voucherEntryById)==null?void 0:P.header;if(!e)return;ue(e.voucherNumber??""),de(e.voucherDate?new Date(`${e.voucherDate}T00:00:00`):new Date),he(e.postingDate?new Date(`${e.postingDate}T00:00:00`):new Date),be(e.narration??""),Ne(e.managerId!=null?Number(e.managerId):null);const a=((O=b==null?void 0:b.voucherEntryById)==null?void 0:O.lines)??[],u=a.some(i=>Number(i.drCrFlag)===2),m=i=>u?i===1:i===0,te=i=>u?i===2:i===1,f=a.find(i=>m(Number(i.drCrFlag))),$=a.find(i=>te(Number(i.drCrFlag)));E((f==null?void 0:f.ledgerId)!=null?Number(f.ledgerId):h),fe(($==null?void 0:$.ledgerId)!=null?Number($.ledgerId):I),ve((f==null?void 0:f.amount)!=null?Number(f.amount):null);const ae=((U=b==null?void 0:b.voucherEntryById)==null?void 0:U.managerAllocations)??[];L(ae.map(i=>({key:it(),managerId:i.managerId!=null?Number(i.managerId):null,allocationAmount:i.allocationAmount!=null?Number(i.allocationAmount):null,remarks:i.remarks??""})))},[h,I,p,b,c]);const yt=()=>{Re(null),ue(Z?(Ie==null?void 0:Ie.nextVoucherNumber)??"":""),de(new Date),he(new Date),ve(null),be(""),Ne(null),L([]),A(!1),V(!0)},Se=e=>{if(!e.voucherDate)return!1;const a=new Date(`${e.voucherDate}T00:00:00`);return Number.isNaN(a.getTime())?!1:ke({date:a},n).ok},Dt=e=>{var a;if(!Se(e)){(a=l.current)==null||a.show({severity:"warn",summary:"Restricted",detail:"Editing is allowed only within the current fiscal year."});return}Re(e.voucherId),A(!1),V(!0)},At=()=>{L(e=>[...e,{key:it(),managerId:T??null,allocationAmount:null,remarks:""}])},$e=(e,a)=>{L(u=>u.map(m=>m.key===e?{...m,...a}:m))},jt=e=>L(a=>a.filter(u=>u.key!==e)),wt=async()=>{var f,$,ae,P,O,U,i,et,tt;const e=ke({date:W},n);if(!e.ok){const o=e.errors.date??"Voucher date is required";ge(o),(f=l.current)==null||f.show({severity:"warn",summary:"Validation",detail:o});return}const a=ke({date:me},n);if(!a.ok){const o=a.errors.date??"Posting date is required";pe(o),($=l.current)==null||$.show({severity:"warn",summary:"Validation",detail:o});return}if(ge(null),pe(null),!Y){(ae=l.current)==null||ae.show({severity:"error",summary:"Missing",detail:"Contra voucher type not found."});return}if(!h||!I||!y||y<=0){(P=l.current)==null||P.show({severity:"warn",summary:"Validation",detail:"Select bank/cash ledgers and enter amount."});return}if(!W)return;const u=R.map(o=>({managerId:o.managerId,allocationAmount:o.allocationAmount,remarks:o.remarks})).filter(o=>o.managerId&&o.allocationAmount&&Number(o.allocationAmount)>0).map(o=>{var k;return{managerId:Number(o.managerId),allocationAmount:Number(o.allocationAmount),remarks:(k=o.remarks)!=null&&k.trim()?o.remarks.trim():null}}),m=u.length>0?u:T?[{managerId:Number(T),allocationAmount:Number(y),remarks:null}]:[];if(m.length===0){(O=l.current)==null||O.show({severity:"warn",summary:"Validation",detail:"Add at least one manager allocation."});return}const te=Ee(m.reduce((o,k)=>o+Number(k.allocationAmount||0),0));if(Math.abs(te-Ee(Number(y)))>.01){(U=l.current)==null||U.show({severity:"warn",summary:"Validation",detail:`Manager allocation total (${le(te)}) must match voucher amount (${le(Number(y))}).`});return}A(!0);try{const o=[{ledgerId:h,drCrFlag:0,amount:Number(y),narrationText:g!=null&&g.trim()?g.trim():null},{ledgerId:I,drCrFlag:1,amount:Number(y),narrationText:g!=null&&g.trim()?g.trim():null}],k={voucherTypeId:Y,voucherDateText:se(W),postingDateText:se(me),voucherNumber:F!=null&&F.trim()?F.trim():null,narrationText:g!=null&&g.trim()?g.trim():null,managerId:T!=null?Number(T):null,primaryLedgerId:Number(h),isDepositFlag:0,managerAllocations:m,lines:o};c?(await ft({variables:{voucherId:c,...k}}),(i=l.current)==null||i.show({severity:"success",summary:"Updated",detail:"Bank cash deposit updated."})):(await pt({variables:k}),(et=l.current)==null||et.show({severity:"success",summary:"Saved",detail:"Bank cash deposit saved."})),V(!1),A(!1),await ee(w)}catch(o){A(!1),(tt=l.current)==null||tt.show({severity:"error",summary:"Error",detail:(o==null?void 0:o.message)??"Failed to save."})}},St=async e=>{var a,u;if(!Se(e)){(a=l.current)==null||a.show({severity:"warn",summary:"Restricted",detail:"Editing is allowed only within the current fiscal year."});return}if(!d.rowDelete.disabled){A(!0);try{const m=e.isCancelledFlag?0:1;await vt({variables:{voucherId:e.voucherId,isCancelledFlag:m}}),await ee(w)}catch(m){(u=l.current)==null||u.show({severity:"error",summary:"Error",detail:(m==null?void 0:m.message)??"Failed to update status."})}finally{A(!1)}}},$t=e=>{const a=Se(e),u="Editing is allowed only within the current fiscal year.";return t.jsxs("div",{className:"flex gap-2",children:[t.jsx(v,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>Dt(e),disabled:!a||d.rowEdit.disabled,title:a?void 0:u}),t.jsx(v,{icon:e.isCancelledFlag?"pi pi-undo":"pi pi-times",className:"p-button-text",onClick:()=>St(e),severity:e.isCancelledFlag?"secondary":"danger",disabled:!a||d.rowDelete.disabled,title:a?void 0:u})]})};return t.jsxs("div",{className:"card",children:[t.jsx(Tt,{ref:l}),t.jsx(Ct,{header:c?"Edit Bank Cash Deposit":"Add Bank Cash Deposit",visible:p,style:{width:"min(980px, 96vw)"},onHide:()=>V(!1),footer:t.jsxs("div",{className:"flex justify-content-between align-items-center w-full",children:[t.jsxs("div",{className:"text-600",children:["Allocations: ",t.jsx("strong",{children:le(xt)})]}),t.jsxs("div",{className:"flex gap-2",children:[d.cancelForm.visible?t.jsx(v,{label:"Cancel",className:"p-button-text",onClick:()=>V(!1),disabled:d.cancelForm.disabled}):null,d.saveForm.visible?t.jsx(v,{label:Q?"Saving...":"Save",icon:"pi pi-check",onClick:wt,disabled:d.saveForm.disabled,loading:Q}):null]})]}),children:t.jsxs("div",{className:"grid",children:[t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Voucher No"}),t.jsx(Ft,{value:F,onChange:e=>ue(e.target.value),className:Pe?void 0:"app-field-noneditable",readOnly:!Pe})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Voucher Date"}),t.jsx(re,{value:W,onChange:e=>{de(e),ge(null)},fiscalYearStart:(n==null?void 0:n.start)??null,fiscalYearEnd:(n==null?void 0:n.end)??null,enforceFiscalRange:!0,style:{width:"100%"}}),Le&&t.jsx("small",{className:"text-red-500",children:Le})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Posting Date"}),t.jsx(re,{value:me,onChange:e=>{he(e),pe(null)},fiscalYearStart:(n==null?void 0:n.start)??null,fiscalYearEnd:(n==null?void 0:n.end)??null,enforceFiscalRange:!0,style:{width:"100%"}}),Ye&&t.jsx("small",{className:"text-red-500",children:Ye})]}),t.jsxs("div",{className:"col-12 md:col-3",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Amount"}),t.jsx(st,{value:y,onValueChange:e=>ve(e.value),min:0,mode:"decimal"})]}),t.jsxs("div",{className:"col-12 md:col-6",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Bank Ledger (Dr)"}),t.jsx(_,{value:h,options:bt.filter(e=>e.value),onChange:e=>E(e.value),placeholder:"Select bank ledger",filter:!0,showClear:!0,style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12 md:col-6",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Cash Ledger (Cr)"}),t.jsx(_,{value:I,options:Nt.filter(e=>e.value),onChange:e=>fe(e.value),placeholder:"Select cash ledger",filter:!0,showClear:!0,style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12 md:col-6",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Paid By"}),t.jsx(_,{value:T,options:We.filter(e=>e.value),onChange:e=>Ne(e.value),placeholder:"Select manager",filter:!0,showClear:!0,style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12 md:col-6",children:[t.jsx("label",{className:"block text-600 mb-1",children:"Narration"}),t.jsx(at,{value:g,onChange:e=>be(e.target.value),style:{width:"100%"}})]}),t.jsxs("div",{className:"col-12",children:[t.jsxs("div",{className:"flex align-items-center justify-content-between",children:[t.jsx("div",{className:"text-700 font-medium",children:"Manager Allocations"}),t.jsx(v,{label:"Add Allocation",icon:"pi pi-plus",className:"p-button-text",onClick:At,disabled:d.uiState==="SAVING"})]}),t.jsxs("div",{className:"mt-2 flex flex-column gap-2",children:[R.length===0&&t.jsx("div",{className:"text-600 text-sm",children:"No allocations added yet. Add rows to match the voucher amount."}),R.map(e=>t.jsxs("div",{className:"grid align-items-center",children:[t.jsx("div",{className:"col-12 md:col-5",children:t.jsx(_,{value:e.managerId,options:We.filter(a=>a.value),onChange:a=>$e(e.key,{managerId:a.value}),placeholder:"Manager",filter:!0,showClear:!0,style:{width:"100%"}})}),t.jsx("div",{className:"col-12 md:col-3",children:t.jsx(st,{value:e.allocationAmount,onValueChange:a=>$e(e.key,{allocationAmount:a.value}),min:0,mode:"decimal",placeholder:"Amount",style:{width:"100%"}})}),t.jsx("div",{className:"col-12 md:col-3",children:t.jsx(at,{value:e.remarks,onChange:a=>$e(e.key,{remarks:a.target.value}),placeholder:"Remark",style:{width:"100%"}})}),t.jsx("div",{className:"col-12 md:col-1 flex justify-content-end",children:t.jsx(v,{icon:"pi pi-trash",className:"p-button-text p-button-danger",onClick:()=>jt(e.key),disabled:d.uiState==="SAVING"})})]},e.key))]})]})]})}),t.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[t.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[t.jsxs("div",{children:[t.jsx("h2",{className:"m-0",children:"Bank Cash Deposit"}),t.jsx("p",{className:"mt-2 mb-0 text-600",children:"Contra vouchers where a Bank ledger is debited and Cash is credited."})]}),t.jsxs("div",{className:"flex gap-2 flex-wrap",children:[d.addVoucher.visible?t.jsx(v,{label:"Add",icon:"pi pi-plus",onClick:yt,disabled:d.addVoucher.disabled}):null,t.jsx(rt,{to:"/apps/accounts/voucher-entry?voucherTypeCode=1",children:t.jsx(v,{label:"Voucher Entry",icon:"pi pi-pencil",className:"p-button-outlined"})}),t.jsx(rt,{to:"/apps/accounts",children:t.jsx(v,{label:"Back",icon:"pi pi-arrow-left",className:"p-button-outlined"})})]})]}),Ke&&t.jsxs("p",{className:"text-red-500 m-0",children:["Error loading deposits: ",Ke.message]})]}),t.jsxs(Et,{value:Qe,paginator:!0,rows:ce,rowsPerPageOptions:[20,50,100],totalRecords:M,lazy:!0,first:K,onPage:e=>{if(ut(e.rows),C(e.first),!B)return;const a={...w,limit:e.rows,offset:e.first};we(a),ee(a)},dataKey:"voucherId",stripedRows:!0,size:"small",loading:gt,headerLeft:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex align-items-center gap-2",children:[t.jsx(re,{value:x[0],onChange:e=>{C(0),Ae.current=!0,ie(a=>[e,a[1]]),G({})},placeholder:"From date",fiscalYearStart:(n==null?void 0:n.start)??null,fiscalYearEnd:(n==null?void 0:n.end)??null,inputRef:dt,onEnterNext:()=>{var e;return(e=Ve.current)==null?void 0:e.focus()},autoFocus:!0,selectOnFocus:!0,style:{width:"130px"}}),t.jsx(re,{value:x[1],onChange:e=>{C(0),Ae.current=!0,ie(a=>[a[0],e]),G({})},placeholder:"To date",fiscalYearStart:(n==null?void 0:n.start)??null,fiscalYearEnd:(n==null?void 0:n.end)??null,inputRef:Ve,onEnterNext:()=>ht(Fe),style:{width:"130px"}})]}),(q.fromDate||q.toDate)&&t.jsx("small",{className:"text-red-500",children:q.fromDate||q.toDate}),t.jsx(lt,{variant:"purpose",purpose:"CONTRA-BANK",value:h,onChange:e=>{C(0),E(e)},placeholder:"Bank ledger",loadingPlaceholder:"Loading bank ledgers...",ref:Fe,style:{minWidth:"240px"}}),t.jsx(lt,{variant:"purpose",purpose:"CONTRA-CASH",value:I,onChange:e=>{C(0),fe(e)},placeholder:"Cash ledger",loadingPlaceholder:"Loading cash ledgers...",style:{minWidth:"220px"}}),t.jsx(_,{value:ne,options:[{label:"All",value:-1},{label:"Not cancelled",value:0},{label:"Cancelled",value:1}],onChange:e=>{C(0),ct(e.value)},placeholder:"Status",style:{minWidth:"160px"}})]}),headerRight:t.jsxs(t.Fragment,{children:[d.refresh.visible?t.jsx(v,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",id:mt,onClick:It,disabled:d.refresh.disabled}):null,d.printRegister.visible?t.jsx(v,{label:"Print Register",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print(),disabled:d.printRegister.disabled}):null]}),recordSummary:`${M} voucher${M===1?"":"s"}`,children:[t.jsx(N,{header:"SN",body:(e,a)=>Number(K)+Number(a.rowIndex??0)+1,style:{width:"4rem"}}),t.jsx(N,{field:"voucherNumber",header:"Voucher No",style:{width:"8rem"}}),t.jsx(N,{field:"voucherDate",header:"Voucher Date",body:e=>ot(e.voucherDate??null),style:{width:"9rem"}}),t.jsx(N,{field:"postingDate",header:"Posting",body:e=>ot(e.postingDate??null),style:{width:"9rem"}}),t.jsx(N,{field:"totalNetAmount",header:"Net Amt",body:e=>le(Number(e.totalNetAmount||0)),style:{width:"9rem",textAlign:"right"}}),t.jsx(N,{field:"narration",header:"Narration",body:e=>e.narration??""}),t.jsx(N,{field:"isCancelledFlag",header:"Cancelled",body:e=>e.isCancelledFlag?"Cancelled":"",style:{width:"8rem"}}),t.jsx(N,{field:"managerDetails",header:"Manager Details",body:e=>t.jsx("span",{style:{whiteSpace:"pre-line"},children:(e.managerDetails??"").trim()}),style:{width:"14rem"}}),t.jsx(N,{field:"managerDetailsAmount",header:"Amt",body:e=>t.jsx("span",{style:{whiteSpace:"pre-line"},children:(e.managerDetailsAmount??"").trim()}),style:{width:"9rem",textAlign:"right"}}),t.jsx(N,{header:"Actions",body:$t,style:{width:"8rem"}})]})]})}export{Ba as default};
