import{r as t,b9 as j,j as e,B as p,e as _t,u as Gt,R as Ut,be as Yt,b8 as qt,bj as Ht}from"./index-a2e62377.js";import{C as _}from"./column.esm-81c99a02.js";import{C as qe}from"./checkbox.esm-afaac66b.js";import{C as Re,c as Me}from"./confirmpopup.esm-10c3d8e4.js";import{D as $e}from"./dialog.esm-6e6fddb6.js";import{A as R}from"./AppInput-10952e09.js";import{T as et}from"./tag.esm-045cf529.js";import{T as Pe}from"./toast.esm-b4e71f30.js";import{f as Ee,A as Le,g as Te,M as _e,a as Ge,b as De,u as $t,e as Et,i as Dt,c as kt,d as At,h as Ft,j as Rt,k as Mt}from"./masterDryRun-e195d4c4.js";import{A as Oe}from"./AppDataTable-ff6b8365.js";import{h as He,M as Ue,b as ze,c as Fe,d as be,g as Pt,f as at,a as dt,e as Lt,u as Tt}from"./masterDialogLayout-1fd44051.js";import{g as F,u as we}from"./useQuery-55f3f513.js";import{o as Ye,s as Ce,a as Jt,n as We,b as Ot}from"./types-eaf96456.js";import{u as he}from"./useMutation-fc9212b2.js";import{C as Bt}from"./confirmdialog.esm-d0f3c502.js";import{D as Kt}from"./datatable.esm-b891b45f.js";import{A as Ae}from"./AppDropdown-800ebb2b.js";import{G as Vt}from"./GeoImportDialog-35880566.js";import{A as zt,i as ot}from"./masterLookupCache-09ded647.js";import{u as Qe}from"./useLazyQuery-83424a52.js";import{A as Wt}from"./AppMultiSelect-e91c3da8.js";import{v as Qt,A as Xt}from"./AppDateInput-ceb6f146.js";import{r as Zt}from"./fiscalRange-d7f67286.js";import"./index.esm-716d0587.js";import"./overlayservice.esm-bf9b13ee.js";import"./inputnumber.esm-991f482d.js";import"./index.esm-1ebbc8e4.js";import"./index.esm-81904cc2.js";import"./index.esm-10fa0e2b.js";import"./TransitionGroup-03c23142.js";import"./AppCompactToggle-348b435c.js";import"./splitbutton.esm-f8323715.js";import"./index.esm-287dfa04.js";import"./skeleton.esm-8641005e.js";import"./reportExport-834d722d.js";import"./useIsomorphicLayoutEffect-da2e447d.js";import"./paginator.esm-e234ed6f.js";import"./index.esm-2f3fd837.js";import"./dropdown.esm-7710effc.js";import"./virtualscroller.esm-c60a9a04.js";import"./index.esm-23a64aa1.js";import"./index.esm-b05ab7aa.js";import"./index.esm-29a8c0d6.js";import"./multiselect.esm-e8c9a563.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-4880a95e.js";import"./index.esm-e0ea7a14.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";const es=F`
    query Users($search: String, $limit: Int) {
        users(search: $search, limit: $limit) {
            userId
            name
            loginId
            isAddFlag
            isEditFlag
            isDeleteFlag
            isPrintFlag
            isCancelFlag
        }
    }
`,ts=F`
    mutation CreateUser(
        $name: String!
        $loginId: String!
        $password: String!
        $isAddFlag: Int
        $isEditFlag: Int
        $isDeleteFlag: Int
        $isPrintFlag: Int
        $isCancelFlag: Int
    ) {
        createUser(
            name: $name
            loginId: $loginId
            password: $password
            isAddFlag: $isAddFlag
            isEditFlag: $isEditFlag
            isDeleteFlag: $isDeleteFlag
            isPrintFlag: $isPrintFlag
            isCancelFlag: $isCancelFlag
        ) {
            userId
        }
    }
`,ss=F`
    mutation UpdateUser(
        $userId: Int!
        $name: String
        $loginId: String
        $password: String
        $isAddFlag: Int
        $isEditFlag: Int
        $isDeleteFlag: Int
        $isPrintFlag: Int
        $isCancelFlag: Int
    ) {
        updateUser(
            userId: $userId
            name: $name
            loginId: $loginId
            password: $password
            isAddFlag: $isAddFlag
            isEditFlag: $isEditFlag
            isDeleteFlag: $isDeleteFlag
            isPrintFlag: $isPrintFlag
            isCancelFlag: $isCancelFlag
        ) {
            userId
        }
    }
`,as=F`
    mutation DeleteUser($userId: Int!) {
        deleteUser(userId: $userId)
    }
`,ns=Ye({name:Ce().trim().min(1,"Name is required"),loginId:Ce().trim().min(1,"Login ID is required")}),mt={name:"",loginId:"",password:"",isAddFlag:!1,isEditFlag:!1,isDeleteFlag:!1,isPrintFlag:!1,isCancelFlag:!1},Ve=r=>Number(r||0)===1,ct=r=>r?1:0;function is(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(!1),[v,z]=t.useState(!1),[C,W]=t.useState(null),[Q,H]=t.useState(!1),[k,$]=t.useState(null),[x,i]=t.useState(mt),[u,ie]=t.useState(mt),[B,N]=t.useState({}),[M,le]=t.useState(!1),{data:te,loading:ce,error:G,refetch:U}=we(es,{client:j,variables:{search:b.trim()||null,limit:ye}}),[oe]=he(ts,{client:j}),[xe]=he(ss,{client:j}),[se]=he(as,{client:j}),y=t.useMemo(()=>(te==null?void 0:te.users)??[],[te]),Ne=t.useMemo(()=>JSON.stringify(x)!==JSON.stringify(u),[x,u]),fe=t.useMemo(()=>Ee(y,C),[y,C]),re=t.useMemo(()=>Ee(y,k),[y,k]),E=t.useMemo(()=>{const n=b.trim().toLowerCase();return n?y.filter(h=>[h.userId,h.name,h.loginId].map(Z=>String(Z??"").toLowerCase()).join(" ").includes(n)):y},[y,b]),X=()=>{W(null),i(mt),N({}),K(!0)},de=n=>{W(n),i({name:n.name??"",loginId:n.loginId??"",password:"",isAddFlag:Ve(n.isAddFlag),isEditFlag:Ve(n.isEditFlag),isDeleteFlag:Ve(n.isDeleteFlag),isPrintFlag:Ve(n.isPrintFlag),isCancelFlag:Ve(n.isCancelFlag)}),N({}),K(!0)},f=n=>{$(n),H(!0)},D=n=>{const h=De(y,fe,n);h&&de(h)},L=n=>{const h=De(y,re,n);h&&f(h)},Y=async()=>{var h,Z,q,ae;const n=ns.safeParse(x);if(!n.success){const g={};n.error.issues.forEach(P=>{P.path[0]&&(g[String(P.path[0])]=P.message)}),N(g),(h=r.current)==null||h.show({severity:"warn",summary:"Please fix validation errors"});return}if(!C&&!x.password.trim()){N(g=>({...g,password:"Password is required"})),(Z=r.current)==null||Z.show({severity:"warn",summary:"Please set a password"});return}z(!0);try{const g={name:x.name.trim(),loginId:x.loginId.trim(),isAddFlag:ct(x.isAddFlag),isEditFlag:ct(x.isEditFlag),isDeleteFlag:ct(x.isDeleteFlag),isPrintFlag:ct(x.isPrintFlag),isCancelFlag:ct(x.isCancelFlag)},P=x.password.trim();P&&(g.password=P),C?await xe({variables:{userId:C.userId,...g}}):await oe({variables:{...g,password:P}}),await U(),ie(x),M||K(!1),(q=r.current)==null||q.show({severity:"success",summary:"Saved",detail:"User saved."})}catch(g){(ae=r.current)==null||ae.show({severity:"error",summary:"Error",detail:(g==null?void 0:g.message)??"Save failed."})}finally{z(!1)}},pe=async n=>{var h,Z;try{await se({variables:{userId:n}}),await U(),(h=r.current)==null||h.show({severity:"success",summary:"Deleted",detail:"User deleted."})}catch(q){(Z=r.current)==null||Z.show({severity:"error",summary:"Error",detail:(q==null?void 0:q.message)??"Delete failed."})}},d=(n,h)=>{Me({target:n.currentTarget,message:"Delete this user?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>pe(h.userId)})},A=n=>{const h=[];return Ve(n.isAddFlag)&&h.push(e.jsx(et,{value:"Add",severity:"success"},"add")),Ve(n.isEditFlag)&&h.push(e.jsx(et,{value:"Edit",severity:"info"},"edit")),Ve(n.isDeleteFlag)&&h.push(e.jsx(et,{value:"Delete",severity:"danger"},"delete")),Ve(n.isPrintFlag)&&h.push(e.jsx(et,{value:"Print",severity:"secondary"},"print")),Ve(n.isCancelFlag)&&h.push(e.jsx(et,{value:"Cancel",severity:"warning"},"cancel")),h.length===0?e.jsx(et,{value:"-",severity:"secondary"}):e.jsx("div",{className:"flex gap-1 flex-wrap",children:h})},l=n=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>f(n)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>de(n)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:h=>d(h,n)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Users"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain user access for the agency accounts masters."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New User",icon:"pi pi-plus",onClick:X}),e.jsx(Le,{...Te("users"),buttonAriaLabel:"Open Users help"})]})]}),G&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading users: ",G.message]})]}),e.jsxs(Oe,{ref:S,value:E,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"userId",stripedRows:!0,size:"small",loading:ce,onRowDoubleClick:n=>de(n.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:n=>ne(n.target.value),placeholder:"Search user",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>U()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var n;return(n=S.current)==null?void 0:n.exportCSV()},disabled:E.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",E.length," user",E.length===1?"":"s"]})]}),recordSummary:`${E.length} user${E.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{field:"loginId",header:"Login ID",sortable:!0}),e.jsx(_,{header:"Rights",body:A}),e.jsx(_,{header:"Actions",body:l,style:{width:"8rem"}})]}),e.jsx($e,{header:C?"Edit User":"New User",visible:V,style:{width:He.standard},onShow:()=>ie(x),onHide:()=>K(!1),footer:e.jsx(_e,{index:fe,total:y.length,onNavigate:D,navigateDisabled:v,bulkMode:{checked:M,onChange:le,disabled:v},onCancel:()=>K(!1),cancelDisabled:v,onSave:Y,saveLabel:v?"Saving...":"Save",saveDisabled:v||!Ne}),children:e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:x.name,onChange:n=>i(h=>({...h,name:n.target.value})),style:{width:"100%"},className:B.name?"p-invalid":void 0}),B.name&&e.jsx("small",{className:"p-error",children:B.name})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Login ID"}),e.jsx(R,{value:x.loginId,onChange:n=>i(h=>({...h,loginId:n.target.value})),style:{width:"100%"},className:B.loginId?"p-invalid":void 0}),B.loginId&&e.jsx("small",{className:"p-error",children:B.loginId})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsxs("label",{className:"block text-600 mb-1",children:["Password ",C?"(leave blank to keep unchanged)":""]}),e.jsx(R,{value:x.password,onChange:n=>i(h=>({...h,password:n.target.value})),type:"password",autoComplete:"new-password",style:{width:"100%"},className:B.password?"p-invalid":void 0}),B.password&&e.jsx("small",{className:"p-error",children:B.password})]}),e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-2",children:"Rights"}),e.jsxs("div",{className:"flex flex-wrap gap-4",children:[e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(qe,{inputId:"userAdd",checked:x.isAddFlag,onChange:n=>i(h=>({...h,isAddFlag:!!n.checked}))}),e.jsx("label",{htmlFor:"userAdd",className:"text-sm text-600",children:"Add"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(qe,{inputId:"userEdit",checked:x.isEditFlag,onChange:n=>i(h=>({...h,isEditFlag:!!n.checked}))}),e.jsx("label",{htmlFor:"userEdit",className:"text-sm text-600",children:"Edit"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(qe,{inputId:"userDelete",checked:x.isDeleteFlag,onChange:n=>i(h=>({...h,isDeleteFlag:!!n.checked}))}),e.jsx("label",{htmlFor:"userDelete",className:"text-sm text-600",children:"Delete"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(qe,{inputId:"userPrint",checked:x.isPrintFlag,onChange:n=>i(h=>({...h,isPrintFlag:!!n.checked}))}),e.jsx("label",{htmlFor:"userPrint",className:"text-sm text-600",children:"Print"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(qe,{inputId:"userCancel",checked:x.isCancelFlag,onChange:n=>i(h=>({...h,isCancelFlag:!!n.checked}))}),e.jsx("label",{htmlFor:"userCancel",className:"text-sm text-600",children:"Cancel"})]})]})]})]})}),e.jsx($e,{header:"User Details",visible:Q,style:{width:Ue.standard},onHide:()=>H(!1),footer:e.jsx(Ge,{index:re,total:y.length,onNavigate:L,onClose:()=>H(!1)}),children:k&&e.jsxs("div",{className:"flex flex-column gap-3",children:[e.jsx(ze,{title:"Basic Info",children:e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"Name",value:k.name??"-"}),e.jsx(be,{label:"Login ID",value:k.loginId??"-"})]})}),e.jsx(ze,{title:"Access Rights",children:e.jsx(Fe,{columns:1,children:e.jsx(be,{label:"Rights",value:A(k),valueClassName:"font-normal"})})})]})})]})}const ls=F`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
            salesmanIds
        }
    }
`,rs=F`
    query Salesmen($search: String, $limit: Int) {
        salesmen(search: $search, limit: $limit) {
            salesmanId
            name
        }
    }
`,cs=F`
    mutation CreateManager($name: String!, $salesmanIds: [Int!]) {
        createManager(name: $name, salesmanIds: $salesmanIds) {
            managerId
        }
    }
`,os=F`
    mutation UpdateManager($managerId: Int!, $name: String, $salesmanIds: [Int!]) {
        updateManager(managerId: $managerId, name: $name, salesmanIds: $salesmanIds) {
            managerId
        }
    }
`,ds=F`
    mutation DeleteManager($managerId: Int!) {
        deleteManager(managerId: $managerId)
    }
`,ms=Ye({name:Ce().trim().min(1,"Name is required"),salesmanIds:Jt(We().int().positive()).default([])}),ut={name:"",salesmanIds:[]},tt=r=>Array.from(new Set((r??[]).map(S=>Number(S)).filter(S=>Number.isFinite(S)&&S>0))).sort((S,b)=>S-b),ht=r=>`manager-salesman-checkbox-${r}`;function us(){const r="manager-name-input",S="manager-salesman-search-input",b="manager-save-button",ne=t.useRef(null),ye=t.useRef(null),[V,K]=t.useState(""),[v,z]=t.useState(""),C=2e3,[W,Q]=t.useState(!1),[H,k]=t.useState(!1),[$,x]=t.useState(null),[i,u]=t.useState(!1),[ie,B]=t.useState(null),[N,M]=t.useState(ut),[le,te]=t.useState(ut),[ce,G]=t.useState({}),[U,oe]=t.useState(!1),[xe,se]=t.useState(""),{data:y,loading:Ne,error:fe,refetch:re}=we(ls,{client:j,variables:{search:V.trim()||null,limit:C}}),{data:E,loading:X}=we(rs,{client:j,variables:{search:null,limit:2e3}}),[de]=he(cs,{client:j}),[f]=he(os,{client:j}),[D]=he(ds,{client:j}),{permissions:L}=$t(j),Y=t.useMemo(()=>(y==null?void 0:y.managers)??[],[y]),pe=t.useMemo(()=>(E==null?void 0:E.salesmen)??[],[E]),d=t.useMemo(()=>{const a=new Map;return pe.forEach(o=>{var O;a.set(o.salesmanId,((O=o.name)==null?void 0:O.trim())||`Salesman ${o.salesmanId}`)}),a},[pe]),A=t.useMemo(()=>{const a=v.trim().toLowerCase();return a?pe.filter(o=>`${o.salesmanId} ${o.name??""}`.toLowerCase().includes(a)):pe},[pe,v]),l=t.useMemo(()=>JSON.stringify(N),[N]),n=t.useMemo(()=>l!==JSON.stringify(le),[l,le]),h=t.useMemo(()=>Ee(Y,$),[Y,$]),Z=t.useMemo(()=>Ee(Y,ie),[Y,ie]),q=t.useMemo(()=>tt(ie==null?void 0:ie.salesmanIds).map(a=>({salesmanId:a,name:d.get(a)??`Salesman ${a}`})),[ie,d]),ae=t.useMemo(()=>!!($&&xe&&xe===l),[l,xe,$]),g=t.useMemo(()=>Pt(!!$,H,ae),[$,ae,H]),P=a=>{var o;return Dt(L,a)?!0:((o=ne.current)==null||o.show({severity:"warn",summary:"Permission Denied",detail:kt(a)}),!1)},I=()=>{Lt({saving:H,isDirty:n,onDiscard:()=>{Q(!1),G({})}})},m=()=>{se(""),P("add")&&(x(null),z(""),M(ut),G({}),Q(!0))},T=a=>{se(""),P("edit")&&(x(a),z(""),M({name:a.name??"",salesmanIds:tt(a.salesmanIds)}),G({}),Q(!0))},me=a=>{P("view")&&(B(a),u(!0))},ue=a=>{const o=De(Y,h,a);o&&T(o)},ge=a=>{const o=De(Y,Z,a);o&&me(o)},ke=t.useCallback((a,o)=>{M(O=>({...O,salesmanIds:o?tt([...O.salesmanIds,a]):O.salesmanIds.filter(ee=>ee!==a)}))},[]),nt=t.useCallback(()=>{const a=A[0];return a?(at(ht(a.salesmanId)),!0):(at(b),!0)},[A,b]),it=t.useCallback(()=>(at(S),!0),[S]),Je=t.useCallback(()=>{const a=A.map(o=>o.salesmanId);M(o=>({...o,salesmanIds:tt([...o.salesmanIds,...a])}))},[A]),Xe=t.useCallback(()=>{const a=new Set(A.map(o=>o.salesmanId));M(o=>({...o,salesmanIds:o.salesmanIds.filter(O=>!a.has(O))}))},[A]),Be=t.useCallback((a,o,O)=>{if(a.key!=="Enter"&&a.key!=="NumpadEnter")return;a.preventDefault();const ee=N.salesmanIds.includes(o);ke(o,!ee);const c=A[O+1];window.setTimeout(()=>{if(c){at(ht(c.salesmanId));return}at(b)},0)},[A,N.salesmanIds,b,ke]),Ze=async()=>{var o,O,ee;const a=ms.safeParse(N);if(!a.success){const c={};a.error.issues.forEach(w=>{w.path[0]&&(c[String(w.path[0])]=w.message)}),G(c),(o=ne.current)==null||o.show({severity:"warn",summary:"Please fix validation errors"}),dt(r);return}if(Et({isEditing:!!$,lastDigest:xe,currentDigest:l,setLastDigest:se,toastRef:ne,entityLabel:"record"})){k(!0);try{const c={name:N.name.trim(),salesmanIds:tt(N.salesmanIds)};$?await f({variables:{managerId:$.managerId,...c}}):await de({variables:c}),await re(),te(N),U||Q(!1),(O=ne.current)==null||O.show({severity:"success",summary:"Saved",detail:"Manager saved."})}catch(c){(ee=ne.current)==null||ee.show({severity:"error",summary:"Error",detail:(c==null?void 0:c.message)??"Save failed."})}finally{k(!1)}}},Ke=async a=>{var o,O;try{await D({variables:{managerId:a}}),await re(),(o=ne.current)==null||o.show({severity:"success",summary:"Deleted",detail:"Manager deleted."})}catch(ee){(O=ne.current)==null||O.show({severity:"error",summary:"Error",detail:Mt(ee,"manager")})}},lt=async(a,o)=>{var ee;if(!P("delete"))return;const O=await At("MANAGER",o.managerId);if(!O.canDelete){(ee=ne.current)==null||ee.show({severity:"warn",summary:"Cannot Delete",detail:Ft("manager",O),life:7e3});return}Me({target:a.currentTarget,message:`Dry Delete Check passed. ${Rt("manager")}`,icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>Ke(o.managerId)})},rt=a=>{const o=tt(a.salesmanIds);if(!o.length)return e.jsx("span",{className:"text-500",children:"-"});const O=o.map(w=>d.get(w)??`Salesman ${w}`),ee=O.slice(0,2).join(", "),c=O.length>2?`${ee} +${O.length-2}`:ee;return e.jsx("span",{title:O.join(", "),children:c})},s=a=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>me(a),disabled:!L.canView}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>T(a),disabled:!L.canEdit}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:o=>{lt(o,a)},disabled:!L.canDelete})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:ne}),e.jsx(Bt,{}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Managers"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain managers and assign the salesmen mapped under each manager."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New Manager",icon:"pi pi-plus",onClick:m,disabled:!L.canAdd}),e.jsx(Le,{...Te("managers"),buttonAriaLabel:"Open Managers help"})]})]}),fe&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading managers: ",fe.message]})]}),e.jsxs(Oe,{ref:ye,value:Y,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"managerId",stripedRows:!0,size:"small",loading:Ne,onRowDoubleClick:a=>L.canEdit?T(a.data):me(a.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:V,onChange:a=>K(a.target.value),placeholder:"Search manager",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>re()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var a;return(a=ye.current)==null?void 0:a.exportCSV()},disabled:Y.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",Y.length," manager",Y.length===1?"":"s"]})]}),recordSummary:`${Y.length} manager${Y.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{header:"Assigned Salesmen",body:rt}),e.jsx(_,{header:"Actions",body:s,style:{width:"11rem"}})]}),e.jsxs($e,{header:$?"Edit Manager":"New Manager",visible:W,style:{width:He.standard},onShow:()=>{te(N),dt(r)},onHide:I,footer:e.jsx(_e,{index:h,total:Y.length,onNavigate:ue,navigateDisabled:H,bulkMode:{checked:U,onChange:oe,disabled:H},onCancel:I,cancelDisabled:H,onSave:Ze,saveLabel:g,saveDisabled:H||!n,saveButtonId:b}),children:[$&&e.jsx("div",{className:`mb-3 p-2 border-round text-sm ${ae?"surface-100 text-green-700":"surface-100 text-700"}`,children:ae?"Dry check passed. Click Apply Changes to save.":"Dry save flow: first click runs dry check, second click saves changes."}),e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{id:r,autoFocus:!0,value:N.name,onChange:a=>M(o=>({...o,name:a.target.value})),onEnterNext:it,style:{width:"100%"},className:ce.name?"p-invalid":void 0}),ce.name&&e.jsx("small",{className:"p-error",children:ce.name})]}),e.jsxs("div",{className:"col-12",children:[e.jsxs("div",{className:"flex align-items-center justify-content-between gap-3 mb-2 flex-wrap",children:[e.jsx("label",{className:"block text-600 m-0",children:"Salesman List"}),e.jsxs("span",{className:"text-500 text-sm",children:[N.salesmanIds.length," selected"]})]}),e.jsxs("div",{className:"app-manager-salesman-grid",children:[e.jsxs("div",{className:"app-manager-salesman-grid__toolbar",children:[e.jsxs("span",{className:"p-input-icon-left app-manager-salesman-grid__search",children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{id:S,value:v,onChange:a=>z(a.target.value),onEnterNext:nt,placeholder:"Search salesman list",style:{width:"100%"}})]}),e.jsxs("div",{className:"app-manager-salesman-grid__actions",children:[e.jsx(p,{type:"button",label:"Select Visible",className:"p-button-text app-action-compact",onClick:Je,disabled:A.length===0||H}),e.jsx(p,{type:"button",label:"Clear Visible",className:"p-button-text app-action-compact",onClick:Xe,disabled:A.length===0||H})]})]}),e.jsx("div",{className:"app-manager-salesman-grid__table-wrap",children:e.jsxs("table",{className:"app-manager-salesman-grid__table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{width:"5rem"},children:"S.No."}),e.jsx("th",{children:"Salesman"}),e.jsx("th",{style:{width:"7rem"},children:"Select"})]})}),e.jsx("tbody",{children:X?e.jsx("tr",{children:e.jsx("td",{colSpan:3,className:"app-manager-salesman-grid__empty",children:"Loading salesmen..."})}):A.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:3,className:"app-manager-salesman-grid__empty",children:"No salesmen found."})}):A.map((a,o)=>{var ee;const O=N.salesmanIds.includes(a.salesmanId);return e.jsxs("tr",{children:[e.jsx("td",{children:o+1}),e.jsx("td",{children:((ee=a.name)==null?void 0:ee.trim())||`Salesman ${a.salesmanId}`}),e.jsx("td",{children:e.jsx("div",{className:"app-manager-salesman-grid__checkbox",onKeyDown:c=>Be(c,a.salesmanId,o),children:e.jsx(qe,{inputId:ht(a.salesmanId),checked:O,onChange:c=>ke(a.salesmanId,c.checked===!0)})})})]},a.salesmanId)})})]})})]})]})]})]}),e.jsx($e,{header:"Manager Details",visible:i,style:{width:Ue.medium},onHide:()=>u(!1),footer:e.jsx(Ge,{index:Z,total:Y.length,onNavigate:ge,onClose:()=>u(!1)}),children:ie&&e.jsxs("div",{className:"flex flex-column gap-3",children:[e.jsx(Fe,{columns:1,children:e.jsx(be,{label:"Name",value:ie.name??"-"})}),e.jsx(ze,{title:"Assigned Salesmen",description:`${q.length} ${q.length===1?"salesman":"salesmen"}`,children:e.jsx("div",{className:"border-1 surface-border border-round overflow-hidden",children:e.jsxs(Kt,{value:q,dataKey:"salesmanId",responsiveLayout:"scroll",size:"small",className:"p-datatable-sm",emptyMessage:"No salesmen assigned.",scrollable:!0,scrollHeight:"12rem",children:[e.jsx(_,{header:"#",body:(a,o)=>o.rowIndex+1,style:{width:"4rem"}}),e.jsx(_,{header:"Salesman",body:a=>a.name})]})})})]})})]})}const hs=F`
    query Salesmen($search: String, $limit: Int) {
        salesmen(search: $search, limit: $limit) {
            salesmanId
            name
        }
    }
`,xs=F`
    mutation CreateSalesman($name: String!) {
        createSalesman(name: $name) {
            salesmanId
        }
    }
`,ps=F`
    mutation UpdateSalesman($salesmanId: Int!, $name: String) {
        updateSalesman(salesmanId: $salesmanId, name: $name) {
            salesmanId
        }
    }
`,gs=F`
    mutation DeleteSalesman($salesmanId: Int!) {
        deleteSalesman(salesmanId: $salesmanId)
    }
`,fs=Ye({name:Ce().trim().min(1,"Name is required")}),xt={name:""};function bs(){const r="salesman-name-input",S="salesman-save-button",b=t.useRef(null),ne=t.useRef(null),[ye,V]=t.useState(""),K=2e3,[v,z]=t.useState(!1),[C,W]=t.useState(!1),[Q,H]=t.useState(null),[k,$]=t.useState(!1),[x,i]=t.useState(null),[u,ie]=t.useState(xt),[B,N]=t.useState(xt),[M,le]=t.useState({}),[te,ce]=t.useState(!1),[G,U]=t.useState(""),{data:oe,loading:xe,error:se,refetch:y}=we(hs,{client:j,variables:{search:ye.trim()||null,limit:K}}),[Ne]=he(xs,{client:j}),[fe]=he(ps,{client:j}),[re]=he(gs,{client:j}),{permissions:E}=$t(j),X=t.useMemo(()=>(oe==null?void 0:oe.salesmen)??[],[oe]),de=t.useMemo(()=>JSON.stringify(u),[u]),f=t.useMemo(()=>de!==JSON.stringify(B),[de,B]),D=t.useMemo(()=>Ee(X,Q),[X,Q]),L=t.useMemo(()=>Ee(X,x),[X,x]),Y=t.useMemo(()=>!!(Q&&G&&G===de),[de,G,Q]),pe=t.useMemo(()=>Pt(!!Q,C,Y),[Q,Y,C]),d=m=>{var T;return Dt(E,m)?!0:((T=b.current)==null||T.show({severity:"warn",summary:"Permission Denied",detail:kt(m)}),!1)},A=()=>{Lt({saving:C,isDirty:f,onDiscard:()=>{z(!1),le({})}})},l=()=>{U(""),d("add")&&(H(null),ie(xt),le({}),z(!0))},n=m=>{U(""),d("edit")&&(H(m),ie({name:m.name??""}),le({}),z(!0))},h=m=>{d("view")&&(i(m),$(!0))},Z=m=>{const T=De(X,D,m);T&&n(T)},q=m=>{const T=De(X,L,m);T&&h(T)},ae=async()=>{var T,me,ue;const m=fs.safeParse(u);if(!m.success){const ge={};m.error.issues.forEach(ke=>{ke.path[0]&&(ge[String(ke.path[0])]=ke.message)}),le(ge),(T=b.current)==null||T.show({severity:"warn",summary:"Please fix validation errors"}),dt(r);return}if(Et({isEditing:!!Q,lastDigest:G,currentDigest:de,setLastDigest:U,toastRef:b,entityLabel:"record"})){W(!0);try{const ge={name:u.name.trim()};Q?await fe({variables:{salesmanId:Q.salesmanId,...ge}}):await Ne({variables:ge}),await y(),N(u),te||z(!1),(me=b.current)==null||me.show({severity:"success",summary:"Saved",detail:"Salesman saved."})}catch(ge){(ue=b.current)==null||ue.show({severity:"error",summary:"Error",detail:(ge==null?void 0:ge.message)??"Save failed."})}finally{W(!1)}}},g=async m=>{var T,me;try{await re({variables:{salesmanId:m}}),await y(),(T=b.current)==null||T.show({severity:"success",summary:"Deleted",detail:"Salesman deleted."})}catch(ue){(me=b.current)==null||me.show({severity:"error",summary:"Error",detail:Mt(ue,"salesman")})}},P=async(m,T)=>{var ue;if(!d("delete"))return;const me=await At("SALESMAN",T.salesmanId);if(!me.canDelete){(ue=b.current)==null||ue.show({severity:"warn",summary:"Cannot Delete",detail:Ft("salesman",me),life:7e3});return}Me({target:m.currentTarget,message:`Dry Delete Check passed. ${Rt("salesman")}`,icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>g(T.salesmanId)})},I=m=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>h(m),disabled:!E.canView}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>n(m),disabled:!E.canEdit}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:T=>{P(T,m)},disabled:!E.canDelete})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:b}),e.jsx(Bt,{}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Salesmen"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain salesman records for the agency accounts masters."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New Salesman",icon:"pi pi-plus",onClick:l,disabled:!E.canAdd}),e.jsx(Le,{...Te("salesmen"),buttonAriaLabel:"Open Salesmen help"})]})]}),se&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading salesmen: ",se.message]})]}),e.jsxs(Oe,{ref:ne,value:X,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"salesmanId",stripedRows:!0,size:"small",loading:xe,onRowDoubleClick:m=>E.canEdit?n(m.data):h(m.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:ye,onChange:m=>V(m.target.value),placeholder:"Search salesman",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>y()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var m;return(m=ne.current)==null?void 0:m.exportCSV()},disabled:X.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",X.length," salesman",X.length===1?"":"s"]})]}),recordSummary:`${X.length} salesman${X.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{header:"Actions",body:I,style:{width:"11rem"}})]}),e.jsxs($e,{header:Q?"Edit Salesman":"New Salesman",visible:v,style:{width:"min(620px, 96vw)"},onShow:()=>{N(u),dt(r)},onHide:A,footer:e.jsx(_e,{index:D,total:X.length,onNavigate:Z,navigateDisabled:C,bulkMode:{checked:te,onChange:ce,onLabel:"Bulk",offLabel:"Standard",disabled:C},onCancel:A,cancelDisabled:C,onSave:ae,saveDisabled:C||!f,saveLabel:pe,saveButtonId:S}),children:[Q&&e.jsx("div",{className:`mb-3 p-2 border-round text-sm ${Y?"surface-100 text-green-700":"surface-100 text-700"}`,children:Y?"Dry check passed. Click Apply Changes to save.":"Dry save flow: first click runs dry check, second click saves changes."}),e.jsx("div",{className:"grid",children:e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{id:r,autoFocus:!0,value:u.name,onChange:m=>ie(T=>({...T,name:m.target.value})),onEnterNext:()=>at(S),style:{width:"100%"},className:M.name?"p-invalid":void 0}),M.name&&e.jsx("small",{className:"p-error",children:M.name})]})})]}),e.jsx($e,{header:"Salesman Details",visible:k,style:{width:Ue.compact},onHide:()=>$(!1),footer:e.jsx(Ge,{index:L,total:X.length,onNavigate:q,onClose:()=>$(!1)}),children:x&&e.jsx(Fe,{columns:1,children:e.jsx(be,{label:"Name",value:x.name??"-"})})})]})}const Ns=F`
    query Banks($search: String, $limit: Int) {
        banks(search: $search, limit: $limit) {
            bankId
            name
        }
    }
`,ys=F`
    mutation CreateBank($name: String!) {
        createBank(name: $name) {
            bankId
        }
    }
`,vs=F`
    mutation UpdateBank($bankId: Int!, $name: String) {
        updateBank(bankId: $bankId, name: $name) {
            bankId
        }
    }
`,js=F`
    mutation DeleteBank($bankId: Int!) {
        deleteBank(bankId: $bankId)
    }
`,Is=Ye({name:Ce().trim().min(1,"Name is required")}),pt={name:""};function Ss(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(!1),[v,z]=t.useState(!1),[C,W]=t.useState(null),[Q,H]=t.useState(!1),[k,$]=t.useState(null),[x,i]=t.useState(pt),[u,ie]=t.useState(pt),[B,N]=t.useState({}),[M,le]=t.useState(!1),{data:te,loading:ce,error:G,refetch:U}=we(Ns,{client:j,variables:{search:b.trim()||null,limit:ye}}),[oe]=he(ys,{client:j}),[xe]=he(vs,{client:j}),[se]=he(js,{client:j}),y=t.useMemo(()=>(te==null?void 0:te.banks)??[],[te]),Ne=t.useMemo(()=>JSON.stringify(x)!==JSON.stringify(u),[x,u]),fe=t.useMemo(()=>Ee(y,C),[y,C]),re=t.useMemo(()=>Ee(y,k),[y,k]),E=t.useMemo(()=>{const l=b.trim().toLowerCase();return l?y.filter(n=>[n.bankId,n.name].map(h=>String(h??"").toLowerCase()).join(" ").includes(l)):y},[y,b]),X=()=>{W(null),i(pt),N({}),K(!0)},de=l=>{W(l),i({name:l.name??""}),N({}),K(!0)},f=l=>{$(l),H(!0)},D=l=>{const n=De(y,fe,l);n&&de(n)},L=l=>{const n=De(y,re,l);n&&f(n)},Y=async()=>{var n,h,Z;const l=Is.safeParse(x);if(!l.success){const q={};l.error.issues.forEach(ae=>{ae.path[0]&&(q[String(ae.path[0])]=ae.message)}),N(q),(n=r.current)==null||n.show({severity:"warn",summary:"Please fix validation errors"});return}z(!0);try{const q={name:x.name.trim()};C?await xe({variables:{bankId:C.bankId,...q}}):await oe({variables:q}),await U(),ie(x),M||K(!1),(h=r.current)==null||h.show({severity:"success",summary:"Saved",detail:"Bank saved."})}catch(q){(Z=r.current)==null||Z.show({severity:"error",summary:"Error",detail:(q==null?void 0:q.message)??"Save failed."})}finally{z(!1)}},pe=async l=>{var n,h;try{await se({variables:{bankId:l}}),await U(),(n=r.current)==null||n.show({severity:"success",summary:"Deleted",detail:"Bank deleted."})}catch(Z){(h=r.current)==null||h.show({severity:"error",summary:"Error",detail:(Z==null?void 0:Z.message)??"Delete failed."})}},d=(l,n)=>{Me({target:l.currentTarget,message:"Delete this bank?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>pe(n.bankId)})},A=l=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>f(l)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>de(l)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:n=>d(n,l)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Banks"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain bank records for the agency accounts masters."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New Bank",icon:"pi pi-plus",onClick:X}),e.jsx(Le,{...Te("banks"),buttonAriaLabel:"Open Banks help"})]})]}),G&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading banks: ",G.message]})]}),e.jsxs(Oe,{ref:S,value:E,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"bankId",stripedRows:!0,size:"small",loading:ce,onRowDoubleClick:l=>de(l.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:l=>ne(l.target.value),placeholder:"Search bank",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>U()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var l;return(l=S.current)==null?void 0:l.exportCSV()},disabled:E.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",E.length," bank",E.length===1?"":"s"]})]}),recordSummary:`${E.length} bank${E.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{header:"Actions",body:A,style:{width:"8rem"}})]}),e.jsx($e,{header:C?"Edit Bank":"New Bank",visible:V,style:{width:He.compact},onShow:()=>ie(x),onHide:()=>K(!1),footer:e.jsx(_e,{index:fe,total:y.length,onNavigate:D,navigateDisabled:v,bulkMode:{checked:M,onChange:le,disabled:v},onCancel:()=>K(!1),cancelDisabled:v,onSave:Y,saveLabel:v?"Saving...":"Save",saveDisabled:v||!Ne}),children:e.jsx("div",{className:"grid",children:e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:x.name,onChange:l=>i(n=>({...n,name:l.target.value})),style:{width:"100%"},className:B.name?"p-invalid":void 0}),B.name&&e.jsx("small",{className:"p-error",children:B.name})]})})}),e.jsx($e,{header:"Bank Details",visible:Q,style:{width:Ue.compact},onHide:()=>H(!1),footer:e.jsx(Ge,{index:re,total:y.length,onNavigate:L,onClose:()=>H(!1)}),children:k&&e.jsx(Fe,{columns:1,children:e.jsx(be,{label:"Name",value:k.name??"-"})})})]})}const ws=F`
    query Branches($search: String, $limit: Int) {
        branches(search: $search, limit: $limit) {
            branchId
            name
        }
    }
`,Cs=F`
    mutation CreateBranch($name: String!) {
        createBranch(name: $name) {
            branchId
        }
    }
`,$s=F`
    mutation UpdateBranch($branchId: Int!, $name: String) {
        updateBranch(branchId: $branchId, name: $name) {
            branchId
        }
    }
`,Es=F`
    mutation DeleteBranch($branchId: Int!) {
        deleteBranch(branchId: $branchId)
    }
`,Ds=Ye({name:Ce().trim().min(1,"Name is required")}),gt={name:""};function ks(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(!1),[v,z]=t.useState(!1),[C,W]=t.useState(null),[Q,H]=t.useState(!1),[k,$]=t.useState(null),[x,i]=t.useState(gt),[u,ie]=t.useState(gt),[B,N]=t.useState({}),[M,le]=t.useState(!1),{data:te,loading:ce,error:G,refetch:U}=we(ws,{client:j,variables:{search:b.trim()||null,limit:ye}}),[oe]=he(Cs,{client:j}),[xe]=he($s,{client:j}),[se]=he(Es,{client:j}),y=t.useMemo(()=>(te==null?void 0:te.branches)??[],[te]),Ne=t.useMemo(()=>JSON.stringify(x)!==JSON.stringify(u),[x,u]),fe=t.useMemo(()=>Ee(y,C),[y,C]),re=t.useMemo(()=>Ee(y,k),[y,k]),E=t.useMemo(()=>{const l=b.trim().toLowerCase();return l?y.filter(n=>[n.branchId,n.name].map(h=>String(h??"").toLowerCase()).join(" ").includes(l)):y},[y,b]),X=()=>{W(null),i(gt),N({}),K(!0)},de=l=>{W(l),i({name:l.name??""}),N({}),K(!0)},f=l=>{$(l),H(!0)},D=l=>{const n=De(y,fe,l);n&&de(n)},L=l=>{const n=De(y,re,l);n&&f(n)},Y=async()=>{var n,h,Z;const l=Ds.safeParse(x);if(!l.success){const q={};l.error.issues.forEach(ae=>{ae.path[0]&&(q[String(ae.path[0])]=ae.message)}),N(q),(n=r.current)==null||n.show({severity:"warn",summary:"Please fix validation errors"});return}z(!0);try{const q={name:x.name.trim()};C?await xe({variables:{branchId:C.branchId,...q}}):await oe({variables:q}),await U(),ie(x),M||K(!1),(h=r.current)==null||h.show({severity:"success",summary:"Saved",detail:"Branch saved."})}catch(q){(Z=r.current)==null||Z.show({severity:"error",summary:"Error",detail:(q==null?void 0:q.message)??"Save failed."})}finally{z(!1)}},pe=async l=>{var n,h;try{await se({variables:{branchId:l}}),await U(),(n=r.current)==null||n.show({severity:"success",summary:"Deleted",detail:"Branch deleted."})}catch(Z){(h=r.current)==null||h.show({severity:"error",summary:"Error",detail:(Z==null?void 0:Z.message)??"Delete failed."})}},d=(l,n)=>{Me({target:l.currentTarget,message:"Delete this branch?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>pe(n.branchId)})},A=l=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>f(l)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>de(l)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:n=>d(n,l)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Branches"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain branch records for the agency accounts masters."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New Branch",icon:"pi pi-plus",onClick:X}),e.jsx(Le,{...Te("branches"),buttonAriaLabel:"Open Branches help"})]})]}),G&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading branches: ",G.message]})]}),e.jsxs(Oe,{ref:S,value:E,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"branchId",stripedRows:!0,size:"small",loading:ce,onRowDoubleClick:l=>de(l.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:l=>ne(l.target.value),placeholder:"Search branch",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>U()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var l;return(l=S.current)==null?void 0:l.exportCSV()},disabled:E.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",E.length," branch",E.length===1?"":"es"]})]}),recordSummary:`${E.length} branch${E.length===1?"":"es"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{header:"Actions",body:A,style:{width:"8rem"}})]}),e.jsx($e,{header:C?"Edit Branch":"New Branch",visible:V,style:{width:He.compact},onShow:()=>ie(x),onHide:()=>K(!1),footer:e.jsx(_e,{index:fe,total:y.length,onNavigate:D,navigateDisabled:v,bulkMode:{checked:M,onChange:le,disabled:v},onCancel:()=>K(!1),cancelDisabled:v,onSave:Y,saveLabel:v?"Saving...":"Save",saveDisabled:v||!Ne}),children:e.jsx("div",{className:"grid",children:e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:x.name,onChange:l=>i(n=>({...n,name:l.target.value})),style:{width:"100%"},className:B.name?"p-invalid":void 0}),B.name&&e.jsx("small",{className:"p-error",children:B.name})]})})}),e.jsx($e,{header:"Branch Details",visible:Q,style:{width:Ue.compact},contentClassName:"pt-2 pb-2",onHide:()=>H(!1),footer:e.jsx(Ge,{index:re,total:y.length,onNavigate:L,onClose:()=>H(!1)}),children:k&&e.jsx(Fe,{columns:1,children:e.jsx(be,{label:"Name",value:k.name??"-"})})})]})}const As=F`
    query Areas($search: String, $limit: Int) {
        areas(search: $search, limit: $limit) {
            areaId
            name
            cityId
        }
    }
`,Fs=F`
    mutation CreateArea($name: String!, $cityId: Int) {
        createArea(name: $name, cityId: $cityId) {
            areaId
        }
    }
`,Rs=F`
    mutation UpdateArea($areaId: Int!, $name: String, $cityId: Int) {
        updateArea(areaId: $areaId, name: $name, cityId: $cityId) {
            areaId
        }
    }
`,Ms=F`
    mutation DeleteArea($areaId: Int!) {
        deleteArea(areaId: $areaId)
    }
`,Ps=Ye({name:Ce().trim().min(1,"Name is required"),cityId:We().int().nonnegative().nullable()}),ft={name:"",cityId:null};function Ls(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(!1),[v,z]=t.useState(!1),[C,W]=t.useState(null),[Q,H]=t.useState(!1),[k,$]=t.useState(null),[x,i]=t.useState(ft),[u,ie]=t.useState(ft),[B,N]=t.useState({}),[M,le]=t.useState(!1),[te,ce]=t.useState(!1),{data:G,loading:U,error:oe,refetch:xe}=we(As,{client:j,variables:{search:b.trim()||null,limit:ye},...zt}),{rows:se,refetch:y}=Tt({limit:2e3}),[Ne]=he(Fs,{client:j}),[fe]=he(Rs,{client:j}),[re]=he(Ms,{client:j}),E=t.useMemo(()=>(G==null?void 0:G.areas)??[],[G]),X=t.useMemo(()=>JSON.stringify(x)!==JSON.stringify(u),[x,u]),de=t.useMemo(()=>Ee(E,C),[E,C]),f=t.useMemo(()=>Ee(E,k),[E,k]),D=t.useMemo(()=>{const g=new Map;return se.forEach(P=>{const I=[P.name,P.districtName?`(${P.districtName})`:null,P.stateName?P.stateName:null].filter(Boolean).join(" ");g.set(P.cityId,I||`#${P.cityId}`)}),g},[se]),L=t.useMemo(()=>{const g=b.trim().toLowerCase();return g?E.filter(P=>[P.areaId,P.name,P.cityId?D.get(P.cityId):null].map(I=>String(I??"").toLowerCase()).join(" ").includes(g)):E},[E,b,D]),Y=()=>{W(null),i(ft),N({}),K(!0)},pe=g=>{W(g),i({name:g.name??"",cityId:g.cityId??null}),N({}),K(!0)},d=g=>{$(g),H(!0)},A=g=>{const P=De(E,de,g);P&&pe(P)},l=g=>{const P=De(E,f,g);P&&d(P)},n=async()=>{var P,I,m;const g=Ps.safeParse(x);if(!g.success){const T={};g.error.issues.forEach(me=>{me.path[0]&&(T[String(me.path[0])]=me.message)}),N(T),(P=r.current)==null||P.show({severity:"warn",summary:"Please fix validation errors"});return}z(!0);try{const T={name:x.name.trim(),cityId:x.cityId};C?await fe({variables:{areaId:C.areaId,...T}}):await Ne({variables:T}),ot(j),await xe(),ie(x),te||K(!1),(I=r.current)==null||I.show({severity:"success",summary:"Saved",detail:"Area saved."})}catch(T){(m=r.current)==null||m.show({severity:"error",summary:"Error",detail:(T==null?void 0:T.message)??"Save failed."})}finally{z(!1)}},h=async g=>{var P,I;try{await re({variables:{areaId:g}}),ot(j),await xe(),(P=r.current)==null||P.show({severity:"success",summary:"Deleted",detail:"Area deleted."})}catch(m){(I=r.current)==null||I.show({severity:"error",summary:"Error",detail:(m==null?void 0:m.message)??"Delete failed."})}},Z=(g,P)=>{Me({target:g.currentTarget,message:"Delete this area?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>h(P.areaId)})},q=g=>g.cityId?D.get(g.cityId)??g.cityId:e.jsx("span",{className:"text-500",children:"-"}),ae=g=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>d(g)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>pe(g)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:P=>Z(P,g)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Areas"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain area records for the agency accounts masters."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New Area",icon:"pi pi-plus",onClick:Y}),e.jsx(Le,{...Te("areas"),buttonAriaLabel:"Open Areas help"})]})]}),oe&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading areas: ",oe.message]})]}),e.jsxs(Oe,{ref:S,value:L,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"areaId",stripedRows:!0,size:"small",loading:U,onRowDoubleClick:g=>pe(g.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:g=>ne(g.target.value),placeholder:"Search area",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>xe()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var g;return(g=S.current)==null?void 0:g.exportCSV()},disabled:L.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",L.length," area",L.length===1?"":"s"]})]}),recordSummary:`${L.length} area${L.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{header:"City",body:q}),e.jsx(_,{header:"Actions",body:ae,style:{width:"8rem"}})]}),e.jsx($e,{header:C?"Edit Area":"New Area",visible:V,style:{width:He.medium},onShow:()=>ie(x),onHide:()=>K(!1),footer:e.jsx(_e,{index:de,total:E.length,onNavigate:A,navigateDisabled:v,bulkMode:{checked:te,onChange:ce,disabled:v},onCancel:()=>K(!1),cancelDisabled:v,onSave:n,saveLabel:v?"Saving...":"Save",saveDisabled:v||!X}),children:e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:x.name,onChange:g=>i(P=>({...P,name:g.target.value})),style:{width:"100%"},className:B.name?"p-invalid":void 0}),B.name&&e.jsx("small",{className:"p-error",children:B.name})]}),e.jsxs("div",{className:"col-12",children:[e.jsxs("div",{className:"flex align-items-center justify-content-between mb-1",children:[e.jsx("label",{className:"block text-600",children:"City"}),e.jsx(p,{label:"Import from master",icon:"pi pi-download",className:"p-button-text p-button-sm",onClick:()=>le(!0)})]}),e.jsx(Ae,{value:x.cityId,options:se.map(g=>({label:[g.name,g.districtName?`(${g.districtName})`:null,g.stateName?g.stateName:null].filter(Boolean).join(" "),value:g.cityId})),onChange:g=>i(P=>({...P,cityId:g.value??null})),placeholder:"Select city",showClear:!0,filter:!0,className:"w-full"})]})]})}),e.jsx($e,{header:"Area Details",visible:Q,style:{width:Ue.medium},onHide:()=>H(!1),footer:e.jsx(Ge,{index:f,total:E.length,onNavigate:l,onClose:()=>H(!1)}),children:k&&e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"Name",value:k.name??"-"}),e.jsx(be,{label:"City",value:D.get(k.cityId??-1)??"-"})]})}),e.jsx(Vt,{visible:M,onHide:()=>le(!1),onApply:g=>{ot(j),g.cityId&&i(P=>({...P,cityId:g.cityId??null})),y()},title:"Import location from master"})]})}const Ts=F`
    query AuthGeoCountries($search: String, $limit: Int) {
        authGeoCountries(search: $search, limit: $limit) {
            id
            iso2
            name
        }
    }
`,Os=F`
    query AuthGeoStates($countryId: Int!, $search: String, $limit: Int) {
        authGeoStates(countryId: $countryId, search: $search, limit: $limit) {
            id
            countryId
            code
            name
        }
    }
`,Bs=F`
    query AuthGeoDistricts($stateId: Int!, $search: String, $limit: Int) {
        authGeoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            id
            stateId
            name
        }
    }
`,Vs=F`
    query AuthGeoCities($districtId: Int!, $search: String, $limit: Int) {
        authGeoCities(districtId: $districtId, search: $search, limit: $limit) {
            id
            districtId
            name
        }
    }
`,_s=F`
    mutation EnsureGeoCity($authCityId: Int!) {
        ensureGeoCity(authCityId: $authCityId) {
            cityId
            districtId
            districtName
            stateId
            stateName
            countryId
            countryName
            name
        }
    }
`,Gs=F`
    mutation DeleteCity($cityId: Int!) {
        deleteCity(cityId: $cityId)
    }
`;function Us(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(null),[v,z]=t.useState(null),[C,W]=t.useState(null),[Q,H]=t.useState(null),[k,$]=t.useState(!1),{rows:x,loading:i,error:u,refetch:ie}=Tt({search:b.trim()||null,limit:ye}),{data:B,loading:N}=we(Ts,{client:j,variables:{search:null,limit:300},fetchPolicy:"cache-and-network",nextFetchPolicy:"cache-first"}),[M,le]=Qe(Os,{client:j,fetchPolicy:"network-only"}),[te,ce]=Qe(Bs,{client:j,fetchPolicy:"network-only"}),[G,U]=Qe(Vs,{client:j,fetchPolicy:"network-only"}),[oe]=he(Gs,{client:j}),[xe]=he(_s,{client:j}),se=t.useMemo(()=>(B==null?void 0:B.authGeoCountries)??[],[B]),y=t.useMemo(()=>{var d;return((d=le.data)==null?void 0:d.authGeoStates)??[]},[le.data]),Ne=t.useMemo(()=>{var d;return((d=ce.data)==null?void 0:d.authGeoDistricts)??[]},[ce.data]),fe=t.useMemo(()=>{var d;return((d=U.data)==null?void 0:d.authGeoCities)??[]},[U.data]);t.useEffect(()=>{if(V||se.length===0)return;const d=se.find(l=>{var n;return((n=l.iso2)==null?void 0:n.toUpperCase())==="IN"}),A=se[0]??null;K((d==null?void 0:d.id)??(A==null?void 0:A.id)??null)},[se,V]),t.useEffect(()=>{V&&M({variables:{countryId:V,search:null,limit:300}})},[V,M]),t.useEffect(()=>{v&&te({variables:{stateId:v,search:null,limit:300}})},[v,te]),t.useEffect(()=>{C&&G({variables:{districtId:C,search:null,limit:300}})},[C,G]);const re=t.useMemo(()=>{const d=b.trim().toLowerCase();return d?x.filter(A=>[A.cityId,A.name,A.districtName,A.stateName,A.countryName].map(l=>String(l??"").toLowerCase()).join(" ").includes(d)):x},[x,b]),E=t.useMemo(()=>se.map(d=>({label:`${d.name??""}${d.iso2?` (${d.iso2})`:""}`,value:d.id})),[se]),X=t.useMemo(()=>y.map(d=>({label:`${d.name??""}${d.code?` (${d.code})`:""}`,value:d.id})),[y]),de=t.useMemo(()=>Ne.map(d=>({label:d.name??"",value:d.id})),[Ne]),f=t.useMemo(()=>fe.map(d=>({label:d.name??"",value:d.id})),[fe]),D=async d=>{var A,l;try{await oe({variables:{cityId:d}}),ot(j),await ie(),(A=r.current)==null||A.show({severity:"success",summary:"Deleted",detail:"City deleted."})}catch(n){const h=n instanceof Error?n.message:"Delete failed.";(l=r.current)==null||l.show({severity:"error",summary:"Error",detail:h})}},L=async()=>{var d,A,l;if(!Q){(d=r.current)==null||d.show({severity:"warn",summary:"Select City",detail:"Choose a city from master before adding."});return}$(!0);try{await xe({variables:{authCityId:Q}}),H(null),ot(j),await ie(),(A=r.current)==null||A.show({severity:"success",summary:"Added",detail:"City synced from master."})}catch(n){const h=n instanceof Error?n.message:"Failed to sync city from master.";(l=r.current)==null||l.show({severity:"error",summary:"Error",detail:h})}finally{$(!1)}},Y=(d,A)=>{Me({target:d.currentTarget,message:"Delete this city?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>D(A.cityId)})},pe=d=>e.jsx("div",{className:"flex gap-2",children:e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:A=>Y(A,d)})});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Cities"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain city records for the agency accounts masters."})]}),e.jsx("div",{className:"flex justify-content-end",children:e.jsx(Le,{...Te("cities"),buttonAriaLabel:"Open Cities help"})})]}),e.jsxs("div",{className:"surface-50 border-1 surface-border border-round p-3",children:[e.jsxs("div",{className:"grid align-items-end",children:[e.jsxs("div",{className:"col-12 md:col-3",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Country"}),e.jsx(Ae,{value:V,options:E,onChange:d=>{K(d.value??null),z(null),W(null),H(null)},placeholder:"Select country",filter:!0,showClear:!0,loading:N,className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-3",children:[e.jsx("label",{className:"block text-600 mb-1",children:"State from master"}),e.jsx(Ae,{value:v,options:X,onChange:d=>{z(d.value??null),W(null),H(null)},placeholder:V?"Search and select state":"Select country first",filter:!0,showClear:!0,disabled:!V,loading:le.loading,onFilter:d=>{var l;if(!V)return;const A=((l=d.filter)==null?void 0:l.trim())??"";M({variables:{countryId:V,search:A||null,limit:300}})},className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-2",children:[e.jsx("label",{className:"block text-600 mb-1",children:"District from master"}),e.jsx(Ae,{value:C,options:de,onChange:d=>{W(d.value??null),H(null)},placeholder:v?"Search and select district":"Select state first",filter:!0,showClear:!0,disabled:!v,loading:ce.loading,onFilter:d=>{var l;if(!v)return;const A=((l=d.filter)==null?void 0:l.trim())??"";te({variables:{stateId:v,search:A||null,limit:300}})},className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-2",children:[e.jsx("label",{className:"block text-600 mb-1",children:"City from master"}),e.jsx(Ae,{value:Q,options:f,onChange:d=>H(d.value??null),placeholder:C?"Search and select city":"Select district first",filter:!0,showClear:!0,disabled:!C,loading:U.loading,onFilter:d=>{var l;if(!C)return;const A=((l=d.filter)==null?void 0:l.trim())??"";G({variables:{districtId:C,search:A||null,limit:300}})},className:"w-full"})]}),e.jsx("div",{className:"col-12 md:col-2",children:e.jsx(p,{label:k?"Adding...":"Add",icon:k?"pi pi-spin pi-spinner":"pi pi-plus",onClick:L,disabled:!Q||k,className:"w-full"})})]}),e.jsx("small",{className:"text-600",children:"Add cities only from auth master to keep naming consistent and avoid duplicate/manual variations."})]}),u&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading cities: ",u.message]})]}),e.jsxs(Oe,{ref:S,value:re,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"cityId",stripedRows:!0,size:"small",loading:i,headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:d=>ne(d.target.value),placeholder:"Search city",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>ie()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var d;return(d=S.current)==null?void 0:d.exportCSV()},disabled:re.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",re.length," city",re.length===1?"":"ies"]})]}),recordSummary:`${re.length} city${re.length===1?"":"ies"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{field:"districtName",header:"District"}),e.jsx(_,{field:"stateName",header:"State"}),e.jsx(_,{field:"countryName",header:"Country"}),e.jsx(_,{header:"Actions",body:pe,style:{width:"8rem"}})]})]})}const Ys=F`
    query GeoDistricts($search: String, $limit: Int) {
        geoDistricts(search: $search, limit: $limit) {
            districtId
            name
            stateId
            stateName
            countryId
            countryName
        }
    }
`,qs=F`
    query AuthGeoCountries($search: String, $limit: Int) {
        authGeoCountries(search: $search, limit: $limit) {
            id
            iso2
            name
        }
    }
`,Hs=F`
    query AuthGeoStates($countryId: Int!, $search: String, $limit: Int) {
        authGeoStates(countryId: $countryId, search: $search, limit: $limit) {
            id
            countryId
            code
            name
        }
    }
`,Js=F`
    query AuthGeoDistricts($stateId: Int!, $search: String, $limit: Int) {
        authGeoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            id
            stateId
            name
        }
    }
`,Ks=F`
    mutation EnsureGeoDistrict($authDistrictId: Int!) {
        ensureGeoDistrict(authDistrictId: $authDistrictId) {
            districtId
            stateId
            stateName
            countryId
            countryName
            name
        }
    }
`,zs=F`
    mutation DeleteDistrict($districtId: Int!) {
        deleteDistrict(districtId: $districtId)
    }
`;function Ws(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(null),[v,z]=t.useState(null),[C,W]=t.useState(null),[Q,H]=t.useState(!1),{data:k,loading:$,error:x,refetch:i}=we(Ys,{client:j,variables:{search:b.trim()||null,limit:ye}}),{data:u,loading:ie}=we(qs,{client:j,variables:{search:null,limit:300},fetchPolicy:"cache-and-network",nextFetchPolicy:"cache-first"}),[B,N]=Qe(Hs,{client:j,fetchPolicy:"network-only"}),[M,le]=Qe(Js,{client:j,fetchPolicy:"network-only"}),[te]=he(zs,{client:j}),[ce]=he(Ks,{client:j}),G=t.useMemo(()=>(k==null?void 0:k.geoDistricts)??[],[k]),U=t.useMemo(()=>(u==null?void 0:u.authGeoCountries)??[],[u]),oe=t.useMemo(()=>{var f;return((f=N.data)==null?void 0:f.authGeoStates)??[]},[N.data]),xe=t.useMemo(()=>{var f;return((f=le.data)==null?void 0:f.authGeoDistricts)??[]},[le.data]);t.useEffect(()=>{if(V||U.length===0)return;const f=U.find(L=>{var Y;return((Y=L.iso2)==null?void 0:Y.toUpperCase())==="IN"}),D=U[0]??null;K((f==null?void 0:f.id)??(D==null?void 0:D.id)??null)},[U,V]),t.useEffect(()=>{V&&B({variables:{countryId:V,search:null,limit:300}})},[V,B]),t.useEffect(()=>{v&&M({variables:{stateId:v,search:null,limit:300}})},[v,M]);const se=t.useMemo(()=>{const f=b.trim().toLowerCase();return f?G.filter(D=>[D.districtId,D.name,D.stateName,D.countryName].map(L=>String(L??"").toLowerCase()).join(" ").includes(f)):G},[G,b]),y=t.useMemo(()=>U.map(f=>({label:`${f.name??""}${f.iso2?` (${f.iso2})`:""}`,value:f.id})),[U]),Ne=t.useMemo(()=>oe.map(f=>({label:`${f.name??""}${f.code?` (${f.code})`:""}`,value:f.id})),[oe]),fe=t.useMemo(()=>xe.map(f=>({label:f.name??"",value:f.id})),[xe]),re=async f=>{var D,L;try{await te({variables:{districtId:f}}),await i(),(D=r.current)==null||D.show({severity:"success",summary:"Deleted",detail:"District deleted."})}catch(Y){const pe=Y instanceof Error?Y.message:"Delete failed.";(L=r.current)==null||L.show({severity:"error",summary:"Error",detail:pe})}},E=async()=>{var f,D,L;if(!C){(f=r.current)==null||f.show({severity:"warn",summary:"Select District",detail:"Choose a district from master before adding."});return}H(!0);try{await ce({variables:{authDistrictId:C}}),W(null),await i(),(D=r.current)==null||D.show({severity:"success",summary:"Added",detail:"District synced from master."})}catch(Y){const pe=Y instanceof Error?Y.message:"Failed to sync district from master.";(L=r.current)==null||L.show({severity:"error",summary:"Error",detail:pe})}finally{H(!1)}},X=(f,D)=>{Me({target:f.currentTarget,message:"Delete this district?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>re(D.districtId)})},de=f=>e.jsx("div",{className:"flex gap-2",children:e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:D=>X(D,f)})});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Districts"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain district records for the agency accounts masters."})]}),e.jsx("div",{className:"flex justify-content-end",children:e.jsx(Le,{...Te("districts"),buttonAriaLabel:"Open Districts help"})})]}),e.jsxs("div",{className:"surface-50 border-1 surface-border border-round p-3",children:[e.jsxs("div",{className:"grid align-items-end",children:[e.jsxs("div",{className:"col-12 md:col-3",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Country"}),e.jsx(Ae,{value:V,options:y,onChange:f=>{K(f.value??null),z(null),W(null)},placeholder:"Select country",filter:!0,showClear:!0,loading:ie,className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"State from master"}),e.jsx(Ae,{value:v,options:Ne,onChange:f=>{z(f.value??null),W(null)},placeholder:V?"Search and select state":"Select country first",filter:!0,showClear:!0,disabled:!V,loading:N.loading,onFilter:f=>{var L;if(!V)return;const D=((L=f.filter)==null?void 0:L.trim())??"";B({variables:{countryId:V,search:D||null,limit:300}})},className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-3",children:[e.jsx("label",{className:"block text-600 mb-1",children:"District from master"}),e.jsx(Ae,{value:C,options:fe,onChange:f=>W(f.value??null),placeholder:v?"Search and select district":"Select state first",filter:!0,showClear:!0,disabled:!v,loading:le.loading,onFilter:f=>{var L;if(!v)return;const D=((L=f.filter)==null?void 0:L.trim())??"";M({variables:{stateId:v,search:D||null,limit:300}})},className:"w-full"})]}),e.jsx("div",{className:"col-12 md:col-2",children:e.jsx(p,{label:Q?"Adding...":"Add",icon:Q?"pi pi-spin pi-spinner":"pi pi-plus",onClick:E,disabled:!C||Q,className:"w-full"})})]}),e.jsx("small",{className:"text-600",children:"Add districts only from auth master to keep naming consistent and avoid duplicate/manual variations."})]}),x&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading districts: ",x.message]})]}),e.jsxs(Oe,{ref:S,value:se,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"districtId",stripedRows:!0,size:"small",loading:$,headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:f=>ne(f.target.value),placeholder:"Search district",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>i()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var f;return(f=S.current)==null?void 0:f.exportCSV()},disabled:se.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",se.length," district",se.length===1?"":"s"]})]}),recordSummary:`${se.length} district${se.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{field:"stateName",header:"State"}),e.jsx(_,{field:"countryName",header:"Country"}),e.jsx(_,{header:"Actions",body:de,style:{width:"8rem"}})]})]})}const bt={name:"",stateCode:"",eInvoiceStateName:"",ownState:!1},Qs=Ye({name:Ce().trim().min(1,"Name is required"),stateCode:Ce().trim().max(20,"Code must be at most 20 characters").optional(),eInvoiceStateName:Ce().trim().max(150,"eInvoice name must be at most 150 characters").optional(),ownState:Ot()}),Xs=F`
    query GeoStates($search: String, $limit: Int) {
        geoStates(search: $search, limit: $limit) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`,Zs=F`
    query AuthGeoCountries($search: String, $limit: Int) {
        authGeoCountries(search: $search, limit: $limit) {
            id
            iso2
            name
        }
    }
`,jt=F`
    query AuthGeoStates($countryId: Int!, $search: String, $limit: Int) {
        authGeoStates(countryId: $countryId, search: $search, limit: $limit) {
            id
            countryId
            code
            name
        }
    }
`,ea=F`
    mutation EnsureGeoState($authStateId: Int!) {
        ensureGeoState(authStateId: $authStateId) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`,ta=F`
    mutation UpdateGeoState(
        $stateId: Int!
        $name: String
        $stateCode: String
        $ownState: Boolean
        $eInvoiceStateName: String
    ) {
        updateGeoState(
            stateId: $stateId
            name: $name
            stateCode: $stateCode
            ownState: $ownState
            eInvoiceStateName: $eInvoiceStateName
        ) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`,sa=F`
    mutation LinkGeoStateFromAuth($stateId: Int!, $authStateId: Int!, $overwriteName: Boolean) {
        linkGeoStateFromAuth(stateId: $stateId, authStateId: $authStateId, overwriteName: $overwriteName) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`,aa=F`
    mutation DeleteState($stateId: Int!) {
        deleteState(stateId: $stateId)
    }
`;function na(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(null),[v,z]=t.useState(null),[C,W]=t.useState(!1),[Q,H]=t.useState(!1),[k,$]=t.useState(null),[x,i]=t.useState(!1),[u,ie]=t.useState(null),[B,N]=t.useState(!1),[M,le]=t.useState(bt),[te,ce]=t.useState(bt),[G,U]=t.useState({}),[oe,xe]=t.useState(null),[se,y]=t.useState(null),[Ne,fe]=t.useState(!1),[re,E]=t.useState(!1),{data:X,loading:de,error:f,refetch:D}=we(Xs,{client:j,variables:{search:b.trim()||null,limit:ye}}),{data:L,loading:Y}=we(Zs,{client:j,variables:{search:null,limit:300},fetchPolicy:"cache-and-network",nextFetchPolicy:"cache-first"}),[pe,d]=Qe(jt,{client:j,fetchPolicy:"network-only"}),[A,l]=Qe(jt,{client:j,fetchPolicy:"network-only"}),[n]=he(aa,{client:j}),[h]=he(ea,{client:j}),[Z]=he(ta,{client:j}),[q]=he(sa,{client:j}),ae=t.useMemo(()=>(X==null?void 0:X.geoStates)??[],[X]),g=t.useMemo(()=>JSON.stringify(M)!==JSON.stringify(te),[M,te]),P=t.useMemo(()=>Ee(ae,k),[ae,k]),I=t.useMemo(()=>Ee(ae,u),[ae,u]),m=t.useMemo(()=>(L==null?void 0:L.authGeoCountries)??[],[L]),T=t.useMemo(()=>{var c;return((c=d.data)==null?void 0:c.authGeoStates)??[]},[d.data]),me=t.useMemo(()=>{var c;return((c=l.data)==null?void 0:c.authGeoStates)??[]},[l.data]);t.useEffect(()=>{if(V||m.length===0)return;const c=m.find(J=>{var ve;return((ve=J.iso2)==null?void 0:ve.toUpperCase())==="IN"}),w=m[0]??null;K((c==null?void 0:c.id)??(w==null?void 0:w.id)??null)},[m,V]),t.useEffect(()=>{V&&pe({variables:{countryId:V,search:null,limit:300}})},[V,pe]);const ue=t.useMemo(()=>{const c=b.trim().toLowerCase();return c?ae.filter(w=>[w.stateId,w.name,w.stateCode,w.code,w.eInvoiceStateName,w.countryName,w.ownState?"yes":"no"].map(J=>String(J??"").toLowerCase()).join(" ").includes(c)):ae},[ae,b]),ge=t.useMemo(()=>m.map(c=>({label:`${c.name??""}${c.iso2?` (${c.iso2})`:""}`,value:c.id})),[m]),ke=t.useMemo(()=>T.map(c=>({label:`${c.name??""}${c.code?` (${c.code})`:""}`,value:c.id})),[T]),nt=t.useMemo(()=>me.map(c=>({label:`${c.name??""}${c.code?` (${c.code})`:""}`,value:c.id})),[me]),it=c=>{const w=(c??"").trim().toLowerCase();if(w){const Ie=m.find(Se=>(Se.name??"").trim().toLowerCase()===w);if(Ie!=null&&Ie.id)return Ie.id}const J=m.find(Ie=>{var Se;return((Se=Ie.iso2)==null?void 0:Se.toUpperCase())==="IN"}),ve=m[0]??null;return(J==null?void 0:J.id)??(ve==null?void 0:ve.id)??null},Je=c=>{$(c),le({name:c.name??"",stateCode:c.stateCode??c.code??"",eInvoiceStateName:c.eInvoiceStateName??"",ownState:!!c.ownState});const w=it(c.countryName);xe(w),y(null),w&&A({variables:{countryId:w,search:null,limit:300}}),U({}),H(!0)},Xe=c=>{ie(c),i(!0)},Be=c=>{const w=De(ae,P,c);w&&Je(w)},Ze=c=>{const w=De(ae,I,c);w&&Xe(w)},Ke=()=>{B||(H(!1),$(null),le(bt),U({}),xe(null),y(null))},lt=async()=>{var c,w,J,ve;if(k){if(!se){(c=r.current)==null||c.show({severity:"warn",summary:"Select Auth State",detail:"Choose a state from auth master to map."});return}fe(!0);try{const Se=(w=(await q({variables:{stateId:k.stateId,authStateId:se,overwriteName:!0}})).data)==null?void 0:w.linkGeoStateFromAuth;Se&&($(Se),le({name:Se.name??"",stateCode:Se.stateCode??Se.code??"",eInvoiceStateName:Se.eInvoiceStateName??"",ownState:!!Se.ownState})),await D(),(J=r.current)==null||J.show({severity:"success",summary:"Mapped",detail:"State mapped from auth master."})}catch(Ie){const Se=Ie instanceof Error?Ie.message:"Mapping failed.";(ve=r.current)==null||ve.show({severity:"error",summary:"Error",detail:Se})}finally{fe(!1)}}},rt=async()=>{var w,J,ve;if(!k)return;const c=Qs.safeParse(M);if(!c.success){const Ie={};c.error.issues.forEach(Se=>{Se.path[0]&&(Ie[String(Se.path[0])]=Se.message)}),U(Ie),(w=r.current)==null||w.show({severity:"warn",summary:"Fix validation errors"});return}N(!0);try{await Z({variables:{stateId:k.stateId,name:M.name.trim(),stateCode:M.stateCode.trim()||null,ownState:!!M.ownState,eInvoiceStateName:M.eInvoiceStateName.trim()||null}}),await D(),ce(M),re||Ke(),(J=r.current)==null||J.show({severity:"success",summary:"Saved",detail:"State updated."})}catch(Ie){const Se=Ie instanceof Error?Ie.message:"Update failed.";(ve=r.current)==null||ve.show({severity:"error",summary:"Error",detail:Se})}finally{N(!1)}},s=async c=>{var w,J;try{await n({variables:{stateId:c}}),await D(),(w=r.current)==null||w.show({severity:"success",summary:"Deleted",detail:"State deleted."})}catch(ve){const Ie=ve instanceof Error?ve.message:"Delete failed.";(J=r.current)==null||J.show({severity:"error",summary:"Error",detail:Ie})}},a=async()=>{var c,w,J;if(!v){(c=r.current)==null||c.show({severity:"warn",summary:"Select State",detail:"Choose a state from master before adding."});return}W(!0);try{await h({variables:{authStateId:v}}),z(null),await D(),(w=r.current)==null||w.show({severity:"success",summary:"Added",detail:"State synced from master."})}catch(ve){const Ie=ve instanceof Error?ve.message:"Failed to sync state from master.";(J=r.current)==null||J.show({severity:"error",summary:"Error",detail:Ie})}finally{W(!1)}},o=(c,w)=>{Me({target:c.currentTarget,message:"Delete this state?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>s(w.stateId)})},O=c=>c.ownState?"Yes":"No",ee=c=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>Xe(c)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>Je(c)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:w=>o(w,c)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"States"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain state records for the agency accounts masters."})]}),e.jsx("div",{className:"flex justify-content-end",children:e.jsx(Le,{...Te("states"),buttonAriaLabel:"Open States help"})})]}),e.jsxs("div",{className:"surface-50 border-1 surface-border border-round p-3",children:[e.jsxs("div",{className:"grid align-items-end",children:[e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Country"}),e.jsx(Ae,{value:V,options:ge,onChange:c=>{K(c.value??null),z(null)},placeholder:"Select country",filter:!0,showClear:!0,loading:Y,className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"State from master"}),e.jsx(Ae,{value:v,options:ke,onChange:c=>z(c.value??null),placeholder:V?"Search and select state":"Select country first",filter:!0,showClear:!0,disabled:!V,loading:d.loading,onFilter:c=>{var J;if(!V)return;const w=((J=c.filter)==null?void 0:J.trim())??"";pe({variables:{countryId:V,search:w||null,limit:300}})},className:"w-full"})]}),e.jsx("div",{className:"col-12 md:col-2",children:e.jsx(p,{label:C?"Adding...":"Add",icon:C?"pi pi-spin pi-spinner":"pi pi-plus",onClick:a,disabled:!v||C,className:"w-full"})})]}),e.jsx("small",{className:"text-600",children:"Add states only from auth master to keep naming consistent and avoid duplicate/manual variations."})]}),f&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading states: ",f.message]})]}),e.jsxs(Oe,{ref:S,value:ue,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"stateId",stripedRows:!0,size:"small",loading:de,onRowDoubleClick:c=>Je(c.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:c=>ne(c.target.value),placeholder:"Search state",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>D()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var c;return(c=S.current)==null?void 0:c.exportCSV()},disabled:ue.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",ue.length," state",ue.length===1?"":"s"]})]}),recordSummary:`${ue.length} state${ue.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{field:"stateCode",header:"Code",sortable:!0}),e.jsx(_,{field:"eInvoiceStateName",header:"eInvoice Name",sortable:!0}),e.jsx(_,{header:"Own State",body:O,sortable:!0,sortField:"ownState"}),e.jsx(_,{field:"countryName",header:"Country"}),e.jsx(_,{header:"Actions",body:ee,style:{width:"8rem"}})]}),e.jsx($e,{header:k?`Edit State #${k.stateId}`:"Edit State",visible:Q,style:{width:He.standard},onShow:()=>ce(M),onHide:Ke,footer:e.jsx(_e,{index:P,total:ae.length,onNavigate:Be,navigateDisabled:B,bulkMode:{checked:re,onChange:E,disabled:B},onCancel:Ke,cancelDisabled:B,onSave:rt,saveLabel:B?"Saving...":"Save",saveDisabled:B||!g}),children:e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12 md:col-8",children:e.jsxs("div",{className:"surface-50 border-1 surface-border border-round p-3 mb-3",children:[e.jsxs("div",{className:"grid align-items-end",children:[e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Auth Country"}),e.jsx(Ae,{value:oe,options:ge,onChange:c=>{const w=c.value??null;xe(w),y(null),w&&A({variables:{countryId:w,search:null,limit:300}})},placeholder:"Select country",filter:!0,showClear:!0,loading:Y,className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-5",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Auth State"}),e.jsx(Ae,{value:se,options:nt,onChange:c=>y(c.value??null),placeholder:oe?"Search and select state":"Select country first",filter:!0,showClear:!0,disabled:!oe,loading:l.loading,onFilter:c=>{var J;if(!oe)return;const w=((J=c.filter)==null?void 0:J.trim())??"";A({variables:{countryId:oe,search:w||null,limit:300}})},className:"w-full"})]}),e.jsx("div",{className:"col-12 md:col-3",children:e.jsx(p,{label:Ne?"Mapping...":"Map from Auth",icon:Ne?"pi pi-spin pi-spinner":"pi pi-link",onClick:lt,disabled:!se||Ne,className:"w-full"})})]}),e.jsx("small",{className:"text-600",children:"Maps this client state to selected auth state and applies canonical name/code."})]})}),e.jsxs("div",{className:"col-12 md:col-8",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:M.name,onChange:c=>le(w=>({...w,name:c.target.value})),className:`w-full ${G.name?"p-invalid":""}`}),G.name&&e.jsx("small",{className:"p-error",children:G.name})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Code"}),e.jsx(R,{value:M.stateCode,onChange:c=>le(w=>({...w,stateCode:c.target.value})),className:`w-full ${G.stateCode?"p-invalid":""}`}),G.stateCode&&e.jsx("small",{className:"p-error",children:G.stateCode})]}),e.jsxs("div",{className:"col-12 md:col-8",children:[e.jsx("label",{className:"block text-600 mb-1",children:"eInvoice State Name"}),e.jsx(R,{value:M.eInvoiceStateName,onChange:c=>le(w=>({...w,eInvoiceStateName:c.target.value})),className:`w-full ${G.eInvoiceStateName?"p-invalid":""}`}),G.eInvoiceStateName&&e.jsx("small",{className:"p-error",children:G.eInvoiceStateName})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Own State"}),e.jsxs("div",{className:"flex align-items-center gap-2 border-1 surface-border border-round px-3 py-2",children:[e.jsx(_t,{checked:!!M.ownState,onChange:c=>le(w=>({...w,ownState:!!c.value}))}),e.jsx("span",{className:"text-700",children:M.ownState?"Yes":"No"})]})]}),e.jsx("div",{className:"col-12",children:e.jsx("small",{className:"text-600",children:"Country is managed by master mapping. Use Add from master for canonical link, then edit names/flags as needed."})})]})}),e.jsx($e,{header:"State Details",visible:x,style:{width:Ue.medium},onHide:()=>i(!1),footer:e.jsx(Ge,{index:I,total:ae.length,onNavigate:Ze,onClose:()=>i(!1)}),children:u&&e.jsxs("div",{className:"flex flex-column gap-2",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Name:"})," ",u.name??"-"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Code:"})," ",u.stateCode??u.code??"-"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"eInvoice Name:"})," ",u.eInvoiceStateName??"-"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Own State:"})," ",u.ownState?"Yes":"No"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Country:"})," ",u.countryName??"-"]})]})})]})}const ia=F`
    query Companies($search: String, $limit: Int) {
        companies(search: $search, limit: $limit) {
            companyId
            name
            alias
            addressLine1
            addressLine2
            addressLine3
            cityId
            districtId
            stateId
            countryId
            postalCode
            email
            website
            officePhone
            residencePhone
            mobileNumber
            faxNumber
            serviceTaxNumber
            panNumber
            cstNumber
            vatNumber
            tinNumber
            financialYearStart
            financialYearEnd
            bankName
            branchName
            accountNumber
            ifscCode
            signImagePath
            rtgsNumber
            pfNumber
            esiNumber
            extraFields
        }
    }
`,la=F`
    query GeoCountries($search: String, $limit: Int) {
        geoCountries(search: $search, limit: $limit) {
            countryId
            name
            iso2
        }
    }
`,ra=F`
    query GeoStates($countryId: Int, $search: String, $limit: Int) {
        geoStates(countryId: $countryId, search: $search, limit: $limit) {
            stateId
            countryId
            name
            stateCode
        }
    }
`,ca=F`
    query GeoDistricts($stateId: Int, $search: String, $limit: Int) {
        geoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            districtId
            stateId
            countryId
            name
        }
    }
`,oa=F`
    query GeoCities($districtId: Int, $stateId: Int, $search: String, $limit: Int) {
        geoCities(districtId: $districtId, stateId: $stateId, search: $search, limit: $limit) {
            cityId
            districtId
            stateId
            countryId
            name
        }
    }
`,da=F`
    query FieldDefinitions($entity: String!, $countryCode: String, $limit: Int) {
        fieldDefinitions(entity: $entity, countryCode: $countryCode, limit: $limit) {
            id
            key
            label
            fieldType
            groupName
            orderNo
            required
            defaultValue
            options
        }
    }
`,ma=F`
    mutation CreateCompany(
        $name: String!
        $alias: String!
        $addressLine1: String
        $addressLine2: String
        $addressLine3: String
        $cityId: Int
        $districtId: Int
        $stateId: Int
        $countryId: Int
        $postalCode: String
        $email: String
        $website: String
        $officePhone: String
        $residencePhone: String
        $mobileNumber: String
        $faxNumber: String
        $serviceTaxNumber: String
        $panNumber: String
        $cstNumber: String
        $vatNumber: String
        $tinNumber: String
        $financialYearStart: String
        $financialYearEnd: String
        $bankName: String
        $branchName: String
        $accountNumber: String
        $ifscCode: String
        $signImagePath: String
        $rtgsNumber: String
        $pfNumber: String
        $esiNumber: String
        $extraFields: String
    ) {
        createCompany(
            name: $name
            alias: $alias
            addressLine1: $addressLine1
            addressLine2: $addressLine2
            addressLine3: $addressLine3
            cityId: $cityId
            districtId: $districtId
            stateId: $stateId
            countryId: $countryId
            postalCode: $postalCode
            email: $email
            website: $website
            officePhone: $officePhone
            residencePhone: $residencePhone
            mobileNumber: $mobileNumber
            faxNumber: $faxNumber
            serviceTaxNumber: $serviceTaxNumber
            panNumber: $panNumber
            cstNumber: $cstNumber
            vatNumber: $vatNumber
            tinNumber: $tinNumber
            financialYearStart: $financialYearStart
            financialYearEnd: $financialYearEnd
            bankName: $bankName
            branchName: $branchName
            accountNumber: $accountNumber
            ifscCode: $ifscCode
            signImagePath: $signImagePath
            rtgsNumber: $rtgsNumber
            pfNumber: $pfNumber
            esiNumber: $esiNumber
            extraFields: $extraFields
        ) {
            companyId
        }
    }
`,ua=F`
    mutation UpdateCompany(
        $companyId: Int!
        $name: String
        $alias: String
        $addressLine1: String
        $addressLine2: String
        $addressLine3: String
        $cityId: Int
        $districtId: Int
        $stateId: Int
        $countryId: Int
        $postalCode: String
        $email: String
        $website: String
        $officePhone: String
        $residencePhone: String
        $mobileNumber: String
        $faxNumber: String
        $serviceTaxNumber: String
        $panNumber: String
        $cstNumber: String
        $vatNumber: String
        $tinNumber: String
        $financialYearStart: String
        $financialYearEnd: String
        $bankName: String
        $branchName: String
        $accountNumber: String
        $ifscCode: String
        $signImagePath: String
        $rtgsNumber: String
        $pfNumber: String
        $esiNumber: String
        $extraFields: String
    ) {
        updateCompany(
            companyId: $companyId
            name: $name
            alias: $alias
            addressLine1: $addressLine1
            addressLine2: $addressLine2
            addressLine3: $addressLine3
            cityId: $cityId
            districtId: $districtId
            stateId: $stateId
            countryId: $countryId
            postalCode: $postalCode
            email: $email
            website: $website
            officePhone: $officePhone
            residencePhone: $residencePhone
            mobileNumber: $mobileNumber
            faxNumber: $faxNumber
            serviceTaxNumber: $serviceTaxNumber
            panNumber: $panNumber
            cstNumber: $cstNumber
            vatNumber: $vatNumber
            tinNumber: $tinNumber
            financialYearStart: $financialYearStart
            financialYearEnd: $financialYearEnd
            bankName: $bankName
            branchName: $branchName
            accountNumber: $accountNumber
            ifscCode: $ifscCode
            signImagePath: $signImagePath
            rtgsNumber: $rtgsNumber
            pfNumber: $pfNumber
            esiNumber: $esiNumber
            extraFields: $extraFields
        ) {
            companyId
        }
    }
`,ha=F`
    mutation DeleteCompany($companyId: Int!) {
        deleteCompany(companyId: $companyId)
    }
`,xa=Ye({name:Ce().trim().min(1,"Name is required"),alias:Ce().trim().min(1,"Alias is required"),countryId:We().nullable().optional(),stateId:We().nullable().optional(),districtId:We().nullable().optional(),cityId:We().nullable().optional(),addressLine1:Ce().optional(),addressLine2:Ce().optional(),addressLine3:Ce().optional()}).refine(r=>!(!r.cityId&&(r.addressLine1&&r.addressLine1.trim()||r.addressLine2&&r.addressLine2.trim()||r.addressLine3&&r.addressLine3.trim())),{message:"Select a city when address is provided",path:["cityId"]}).refine(r=>!(r.cityId&&!r.districtId),{message:"Select a district for the city",path:["districtId"]}).refine(r=>!(r.districtId&&!r.stateId),{message:"Select a state for the district",path:["stateId"]}).refine(r=>!(r.stateId&&!r.countryId),{message:"Select a country for the state",path:["countryId"]}),Nt={name:"",alias:"",addressLine1:"",addressLine2:"",addressLine3:"",cityId:null,districtId:null,stateId:null,countryId:null,postalCode:"",email:"",website:"",officePhone:"",residencePhone:"",mobileNumber:"",faxNumber:"",serviceTaxNumber:"",panNumber:"",cstNumber:"",vatNumber:"",tinNumber:"",financialYearStart:"",financialYearEnd:"",bankName:"",branchName:"",accountNumber:"",ifscCode:"",signImagePath:"",rtgsNumber:"",pfNumber:"",esiNumber:"",extraFields:{}},je=r=>{const S=r.trim();return S||null},It=r=>{if(!r)return null;try{return JSON.parse(r)}catch{return null}},st=r=>r&&typeof r=="object"?r:{},pa=r=>{if(r instanceof Date)return Number.isNaN(r.getTime())?null:r;if(typeof r=="string"){const S=r.trim();if(!S)return null;const b=/^\d{4}-\d{2}-\d{2}$/.test(S)?`${S}T00:00:00`:S,ne=new Date(b);return Number.isNaN(ne.getTime())?null:ne}return null},St=r=>r==null?!0:typeof r=="string"?r.trim().length===0:Array.isArray(r)?r.length===0:!1;function ga(){const r=t.useRef(null),S=t.useRef(null),{companyContext:b}=Gt(),[ne,ye]=t.useState(""),V=2e3,[K,v]=t.useState(!1),[z,C]=t.useState(!1),[W,Q]=t.useState(null),[H,k]=t.useState(!1),[$,x]=t.useState(null),[i,u]=t.useState(Nt),[ie,B]=t.useState(Nt),[N,M]=t.useState({}),[le,te]=t.useState(!1),[ce,G]=t.useState(!1),U=t.useMemo(()=>Zt((b==null?void 0:b.fiscalYearStart)??null,(b==null?void 0:b.fiscalYearEnd)??null),[b==null?void 0:b.fiscalYearEnd,b==null?void 0:b.fiscalYearStart]),{data:oe,loading:xe,error:se,refetch:y}=we(ia,{client:j,variables:{search:ne.trim()||null,limit:V}}),{data:Ne}=we(la,{client:j,variables:{search:null,limit:2e3}}),{data:fe}=we(ra,{client:j,variables:{countryId:i.countryId??null,search:null,limit:2e3},skip:!i.countryId}),{data:re}=we(ca,{client:j,variables:{stateId:i.stateId??null,search:null,limit:2e3},skip:!i.stateId}),{data:E}=we(oa,{client:j,variables:{districtId:null,stateId:null,search:null,limit:2e3}}),[X]=he(ma,{client:j}),[de]=he(ua,{client:j}),[f]=he(ha,{client:j}),D=t.useMemo(()=>(oe==null?void 0:oe.companies)??[],[oe]),L=t.useMemo(()=>JSON.stringify(i)!==JSON.stringify(ie),[i,ie]),Y=t.useMemo(()=>Ee(D,W),[D,W]),pe=t.useMemo(()=>Ee(D,$),[D,$]),d=t.useMemo(()=>(Ne==null?void 0:Ne.geoCountries)??[],[Ne]),A=t.useMemo(()=>(fe==null?void 0:fe.geoStates)??[],[fe]),l=t.useMemo(()=>(re==null?void 0:re.geoDistricts)??[],[re]),n=t.useMemo(()=>(E==null?void 0:E.geoCities)??[],[E]),h=t.useMemo(()=>n.filter(s=>!(i.districtId&&s.districtId!==i.districtId||i.stateId&&s.stateId!==i.stateId)),[n,i.districtId,i.stateId]),Z=d.find(s=>s.countryId===i.countryId),q=(Z==null?void 0:Z.iso2)??null,{data:ae}=we(da,{client:j,variables:{entity:"company",countryCode:q,limit:500}}),g=t.useMemo(()=>(ae==null?void 0:ae.fieldDefinitions)??[],[ae]),P=t.useMemo(()=>{const s=new Map;return g.forEach(a=>{var O,ee;const o=((O=a.groupName)==null?void 0:O.trim())||"Additional";s.has(o)||s.set(o,[]),(ee=s.get(o))==null||ee.push(a)}),Array.from(s.entries()).map(([a,o])=>({groupName:a,definitions:o.sort((O,ee)=>(O.orderNo??0)-(ee.orderNo??0))}))},[g]);t.useEffect(()=>{g.length&&u(s=>{const a={...st(s.extraFields)};let o=!1;return g.forEach(O=>{if(a[O.key]!==void 0||!O.defaultValue)return;const ee=It(O.defaultValue);a[O.key]=ee,o=!0}),o?{...s,extraFields:a}:s})},[g]);const I=t.useMemo(()=>{const s=new Map;return n.forEach(a=>{const o=a.name??`#${a.cityId}`;s.set(a.cityId,o)}),s},[n]),m=t.useMemo(()=>{const s=ne.trim().toLowerCase();return s?D.filter(a=>[a.companyId,a.name,a.alias,a.cityId?I.get(a.cityId):null,a.mobileNumber,a.email].map(o=>String(o??"").toLowerCase()).join(" ").includes(s)):D},[D,ne,I]),T=()=>{Q(null),u(Nt),M({}),v(!0)},me=s=>{Q(s),u({name:s.name??"",alias:s.alias??"",addressLine1:s.addressLine1??"",addressLine2:s.addressLine2??"",addressLine3:s.addressLine3??"",cityId:s.cityId??null,districtId:s.districtId??null,stateId:s.stateId??null,countryId:s.countryId??null,postalCode:s.postalCode??"",email:s.email??"",website:s.website??"",officePhone:s.officePhone??"",residencePhone:s.residencePhone??"",mobileNumber:s.mobileNumber??"",faxNumber:s.faxNumber??"",serviceTaxNumber:s.serviceTaxNumber??"",panNumber:s.panNumber??"",cstNumber:s.cstNumber??"",vatNumber:s.vatNumber??"",tinNumber:s.tinNumber??"",financialYearStart:s.financialYearStart??"",financialYearEnd:s.financialYearEnd??"",bankName:s.bankName??"",branchName:s.branchName??"",accountNumber:s.accountNumber??"",ifscCode:s.ifscCode??"",signImagePath:s.signImagePath??"",rtgsNumber:s.rtgsNumber??"",pfNumber:s.pfNumber??"",esiNumber:s.esiNumber??"",extraFields:st(It(s.extraFields??null)??{})}),M({}),v(!0)},ue=s=>{x(s),k(!0)},ge=s=>{const a=De(D,Y,s);a&&me(a)},ke=s=>{const a=De(D,pe,s);a&&ue(a)},nt=async()=>{var O,ee,c,w;const s=xa.safeParse(i);if(!s.success){const J={};s.error.issues.forEach(ve=>{ve.path[0]&&(J[String(ve.path[0])]=ve.message)}),M(J),(O=r.current)==null||O.show({severity:"warn",summary:"Please fix validation errors"});return}const a={},o=st(i.extraFields);if(g.forEach(J=>{J.required&&St(o[J.key])&&(a[`extraFields.${J.key}`]=`${J.label} is required`)}),g.forEach(J=>{if(J.fieldType!=="date")return;const ve=o[J.key];if(St(ve))return;const Ie=pa(ve);if(!Ie){a[`extraFields.${J.key}`]=`${J.label} must be a valid date`;return}const Se=Qt({date:Ie},U);Se.ok||(a[`extraFields.${J.key}`]=Se.errors.date??`${J.label} must be within the financial year`)}),Object.keys(a).length>0){M(a),(ee=r.current)==null||ee.show({severity:"warn",summary:"Please fill required extra fields"});return}M({}),C(!0);try{const J={name:i.name.trim(),alias:i.alias.trim(),addressLine1:je(i.addressLine1),addressLine2:je(i.addressLine2),addressLine3:je(i.addressLine3),countryId:i.countryId,stateId:i.stateId,districtId:i.districtId,cityId:i.cityId,postalCode:je(i.postalCode),email:je(i.email),website:je(i.website),officePhone:je(i.officePhone),residencePhone:je(i.residencePhone),mobileNumber:je(i.mobileNumber),faxNumber:je(i.faxNumber),serviceTaxNumber:je(i.serviceTaxNumber),panNumber:je(i.panNumber),cstNumber:je(i.cstNumber),vatNumber:je(i.vatNumber),tinNumber:je(i.tinNumber),financialYearStart:je(i.financialYearStart),financialYearEnd:je(i.financialYearEnd),bankName:je(i.bankName),branchName:je(i.branchName),accountNumber:je(i.accountNumber),ifscCode:je(i.ifscCode),signImagePath:je(i.signImagePath),rtgsNumber:je(i.rtgsNumber),pfNumber:je(i.pfNumber),esiNumber:je(i.esiNumber),extraFields:JSON.stringify(st(i.extraFields))};W?await de({variables:{companyId:W.companyId,...J}}):await X({variables:J}),await y(),B(i),ce||v(!1),(c=r.current)==null||c.show({severity:"success",summary:"Saved",detail:"Company saved."})}catch(J){(w=r.current)==null||w.show({severity:"error",summary:"Error",detail:(J==null?void 0:J.message)??"Save failed."})}finally{C(!1)}},it=async s=>{var a,o;try{await f({variables:{companyId:s}}),await y(),(a=r.current)==null||a.show({severity:"success",summary:"Deleted",detail:"Company deleted."})}catch(O){(o=r.current)==null||o.show({severity:"error",summary:"Error",detail:(O==null?void 0:O.message)??"Delete failed."})}},Je=(s,a)=>{Me({target:s.currentTarget,message:"Delete this company?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>it(a.companyId)})},Xe=st(i.extraFields),Be=(s,a)=>{u(o=>({...o,extraFields:{...st(o.extraFields),[s]:a}}))},Ze=s=>{if(!s)return[];try{const a=JSON.parse(s);if(Array.isArray(a))return a.map(o=>typeof o=="string"?{label:o,value:o}:{label:o.label??o.value??String(o),value:o.value??o.label??o})}catch{return[]}return[]},Ke=s=>{const a=Xe[s.key],o=`extraFields.${s.key}`,O=s.required?e.jsx("span",{className:"p-error",children:"*"}):null;switch(s.fieldType){case"number":return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[s.label," ",O]}),e.jsx(R,{inputType:"number",value:typeof a=="number"?a:a!=null?Number(a):null,onValueChange:ee=>Be(s.key,ee.value??null),className:"w-full",placeholder:s.label}),N[o]&&e.jsx("small",{className:"p-error",children:N[o]})]});case"boolean":return e.jsxs("div",{className:"flex flex-column gap-2",children:[e.jsxs("label",{className:"font-medium",children:[s.label," ",O]}),e.jsxs("div",{className:"flex align-items-center gap-2",children:[e.jsx(qe,{inputId:`extra-${s.key}`,checked:!!a,onChange:ee=>Be(s.key,ee.checked)}),e.jsx("label",{htmlFor:`extra-${s.key}`,className:"text-600",children:s.label})]}),N[o]&&e.jsx("small",{className:"p-error",children:N[o]})]});case"date":{const ee=a?new Date(a):null;return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[s.label," ",O]}),e.jsx(Xt,{value:ee&&!Number.isNaN(ee.getTime())?ee:null,onChange:c=>Be(s.key,c?c.toISOString().slice(0,10):null),placeholder:"DD/MM/YYYY",fiscalYearStart:(U==null?void 0:U.start)??null,fiscalYearEnd:(U==null?void 0:U.end)??null,enforceFiscalRange:!0}),N[o]&&e.jsx("small",{className:"p-error",children:N[o]})]})}case"select":{const ee=Ze(s.options);return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[s.label," ",O]}),e.jsx(Ae,{value:a??null,options:ee,onChange:c=>Be(s.key,c.value),placeholder:`Select ${s.label}`,showClear:!0,filter:!0}),N[o]&&e.jsx("small",{className:"p-error",children:N[o]})]})}case"multi-select":{const ee=Ze(s.options);return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[s.label," ",O]}),e.jsx(Wt,{value:Array.isArray(a)?a:[],options:ee,onChange:c=>Be(s.key,c.value??[]),placeholder:`Select ${s.label}`,display:"chip"}),N[o]&&e.jsx("small",{className:"p-error",children:N[o]})]})}default:return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[s.label," ",O]}),e.jsx(R,{value:a??"",onChange:ee=>Be(s.key,ee.target.value),placeholder:s.label}),N[o]&&e.jsx("small",{className:"p-error",children:N[o]})]})}},lt=s=>s.cityId?I.get(s.cityId)??s.cityId:e.jsx("span",{className:"text-500",children:"-"}),rt=s=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>ue(s)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>me(s)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:a=>Je(a,s)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Companies"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain company profiles for the agency accounts masters."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New Company",icon:"pi pi-plus",onClick:T}),e.jsx(Le,{...Te("companies"),buttonAriaLabel:"Open Companies help"})]})]}),se&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading companies: ",se.message]})]}),e.jsxs(Oe,{ref:S,value:m,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"companyId",stripedRows:!0,size:"small",loading:xe,onRowDoubleClick:s=>me(s.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:ne,onChange:s=>ye(s.target.value),placeholder:"Search company",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>y()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var s;return(s=S.current)==null?void 0:s.exportCSV()},disabled:m.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",m.length," company",m.length===1?"":"ies"]})]}),recordSummary:`${m.length} company${m.length===1?"":"ies"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{field:"alias",header:"Alias",sortable:!0}),e.jsx(_,{header:"City",body:lt}),e.jsx(_,{field:"mobileNumber",header:"Mobile"}),e.jsx(_,{field:"email",header:"Email"}),e.jsx(_,{header:"Actions",body:rt,style:{width:"8rem"}})]}),e.jsx($e,{header:W?"Edit Company":"New Company",visible:K,style:{width:He.wide},onShow:()=>B(i),onHide:()=>v(!1),footer:e.jsx(_e,{index:Y,total:D.length,onNavigate:ge,navigateDisabled:z,bulkMode:{checked:ce,onChange:G,disabled:z},onCancel:()=>v(!1),cancelDisabled:z,onSave:nt,saveLabel:z?"Saving...":"Save",saveDisabled:z||!L}),children:e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12",children:e.jsx("h4",{className:"m-0 text-600",children:"Basic"})}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:i.name,onChange:s=>u(a=>({...a,name:s.target.value})),style:{width:"100%"},className:N.name?"p-invalid":void 0}),N.name&&e.jsx("small",{className:"p-error",children:N.name})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Alias"}),e.jsx(R,{value:i.alias,onChange:s=>u(a=>({...a,alias:s.target.value})),style:{width:"100%"},className:N.alias?"p-invalid":void 0}),N.alias&&e.jsx("small",{className:"p-error",children:N.alias})]}),e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Address Line 1"}),e.jsx(R,{value:i.addressLine1,onChange:s=>u(a=>({...a,addressLine1:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Address Line 2"}),e.jsx(R,{value:i.addressLine2,onChange:s=>u(a=>({...a,addressLine2:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Address Line 3"}),e.jsx(R,{value:i.addressLine3,onChange:s=>u(a=>({...a,addressLine3:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12",children:[e.jsxs("div",{className:"flex align-items-center justify-content-between mb-2",children:[e.jsx("label",{className:"block text-600",children:"Location"}),e.jsx(p,{label:"Import from master",icon:"pi pi-download",className:"p-button-text p-button-sm",onClick:()=>te(!0)})]}),e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Country"}),e.jsx(Ae,{value:i.countryId,options:d.map(s=>({label:`${s.name??""}${s.iso2?` (${s.iso2})`:""}`,value:s.countryId})),onChange:s=>u(a=>({...a,countryId:s.value??null,stateId:null,districtId:null,cityId:null})),placeholder:"Select country",showClear:!0,filter:!0,className:"w-full"}),N.countryId&&e.jsx("small",{className:"p-error",children:N.countryId})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"State"}),e.jsx(Ae,{value:i.stateId,options:A.map(s=>({label:`${s.name??""}${s.stateCode?` (${s.stateCode})`:""}`,value:s.stateId})),onChange:s=>u(a=>({...a,stateId:s.value??null,districtId:null,cityId:null})),placeholder:i.countryId?"Select state":"Select country first",showClear:!0,filter:!0,disabled:!i.countryId,className:"w-full"}),N.stateId&&e.jsx("small",{className:"p-error",children:N.stateId})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"District"}),e.jsx(Ae,{value:i.districtId,options:l.map(s=>({label:s.name??String(s.districtId),value:s.districtId})),onChange:s=>u(a=>({...a,districtId:s.value??null,cityId:null})),placeholder:i.stateId?"Select district":"Select state first",showClear:!0,filter:!0,disabled:!i.stateId,className:"w-full"}),N.districtId&&e.jsx("small",{className:"p-error",children:N.districtId})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"City"}),e.jsx(Ae,{value:i.cityId,options:h.map(s=>({label:s.name??String(s.cityId),value:s.cityId})),onChange:s=>u(a=>({...a,cityId:s.value??null})),placeholder:i.districtId?"Select city":"Select district first",showClear:!0,filter:!0,disabled:!i.districtId,className:"w-full"}),N.cityId&&e.jsx("small",{className:"p-error",children:N.cityId})]})]})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Postal Code"}),e.jsx(R,{value:i.postalCode,onChange:s=>u(a=>({...a,postalCode:s.target.value})),style:{width:"100%"}})]}),e.jsx("div",{className:"col-12 mt-2",children:e.jsx("h4",{className:"m-0 text-600",children:"Contact"})}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Email"}),e.jsx(R,{value:i.email,onChange:s=>u(a=>({...a,email:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Website"}),e.jsx(R,{value:i.website,onChange:s=>u(a=>({...a,website:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Office Phone"}),e.jsx(R,{value:i.officePhone,onChange:s=>u(a=>({...a,officePhone:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Residence Phone"}),e.jsx(R,{value:i.residencePhone,onChange:s=>u(a=>({...a,residencePhone:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Mobile"}),e.jsx(R,{value:i.mobileNumber,onChange:s=>u(a=>({...a,mobileNumber:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Fax"}),e.jsx(R,{value:i.faxNumber,onChange:s=>u(a=>({...a,faxNumber:s.target.value})),style:{width:"100%"}})]}),e.jsx("div",{className:"col-12 mt-2",children:e.jsx("h4",{className:"m-0 text-600",children:"Tax & IDs"})}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Service Tax No"}),e.jsx(R,{value:i.serviceTaxNumber,onChange:s=>u(a=>({...a,serviceTaxNumber:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"PAN No"}),e.jsx(R,{value:i.panNumber,onChange:s=>u(a=>({...a,panNumber:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"CST No"}),e.jsx(R,{value:i.cstNumber,onChange:s=>u(a=>({...a,cstNumber:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"VAT No"}),e.jsx(R,{value:i.vatNumber,onChange:s=>u(a=>({...a,vatNumber:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"TIN No"}),e.jsx(R,{value:i.tinNumber,onChange:s=>u(a=>({...a,tinNumber:s.target.value})),style:{width:"100%"}})]}),P.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"col-12 mt-2",children:e.jsx("h4",{className:"m-0 text-600",children:"Additional Fields"})}),P.map(s=>e.jsxs(Ut.Fragment,{children:[e.jsx("div",{className:"col-12",children:e.jsx("span",{className:"text-600 text-sm",children:s.groupName})}),s.definitions.map(a=>e.jsx("div",{className:"col-12 md:col-6",children:Ke(a)},a.id))]},s.groupName))]}),e.jsx("div",{className:"col-12 mt-2",children:e.jsx("h4",{className:"m-0 text-600",children:"Fiscal Year"})}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Financial Year Start"}),e.jsx(R,{value:i.financialYearStart,onChange:s=>u(a=>({...a,financialYearStart:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Financial Year End"}),e.jsx(R,{value:i.financialYearEnd,onChange:s=>u(a=>({...a,financialYearEnd:s.target.value})),style:{width:"100%"}})]}),e.jsx("div",{className:"col-12 mt-2",children:e.jsx("h4",{className:"m-0 text-600",children:"Banking"})}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Bank Name"}),e.jsx(R,{value:i.bankName,onChange:s=>u(a=>({...a,bankName:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Branch Name"}),e.jsx(R,{value:i.branchName,onChange:s=>u(a=>({...a,branchName:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Account Number"}),e.jsx(R,{value:i.accountNumber,onChange:s=>u(a=>({...a,accountNumber:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"IFSC Code"}),e.jsx(R,{value:i.ifscCode,onChange:s=>u(a=>({...a,ifscCode:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"RTGS No"}),e.jsx(R,{value:i.rtgsNumber,onChange:s=>u(a=>({...a,rtgsNumber:s.target.value})),style:{width:"100%"}})]}),e.jsx("div",{className:"col-12 mt-2",children:e.jsx("h4",{className:"m-0 text-600",children:"Other"})}),e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Sign Image Path"}),e.jsx(R,{value:i.signImagePath,onChange:s=>u(a=>({...a,signImagePath:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"PF No"}),e.jsx(R,{value:i.pfNumber,onChange:s=>u(a=>({...a,pfNumber:s.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"ESI No"}),e.jsx(R,{value:i.esiNumber,onChange:s=>u(a=>({...a,esiNumber:s.target.value})),style:{width:"100%"}})]})]})}),e.jsx($e,{header:"Company Details",visible:H,style:{width:Ue.wide},onHide:()=>k(!1),footer:e.jsx(Ge,{index:pe,total:D.length,onNavigate:ke,onClose:()=>k(!1)}),children:$&&e.jsxs("div",{className:"flex flex-column gap-3",children:[e.jsx(ze,{title:"Basic Info",children:e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"Name",value:$.name??"-"}),e.jsx(be,{label:"Alias",value:$.alias??"-"}),e.jsx(be,{label:"City",value:I.get($.cityId??-1)??"-"}),e.jsx(be,{label:"Postal Code",value:$.postalCode??"-"})]})}),e.jsx(ze,{title:"Address & Contact",children:e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"Address",value:[$.addressLine1,$.addressLine2,$.addressLine3].filter(Boolean).join(", ")||"-"}),e.jsx(be,{label:"Mobile",value:$.mobileNumber??"-"}),e.jsx(be,{label:"Email",value:$.email??"-"}),e.jsx(be,{label:"Website",value:$.website??"-"})]})}),e.jsx(ze,{title:"Tax & Financial",children:e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"PAN",value:$.panNumber??"-"}),e.jsx(be,{label:"TIN",value:$.tinNumber??"-"}),e.jsx(be,{label:"Financial Year Start",value:$.financialYearStart??"-"}),e.jsx(be,{label:"Financial Year End",value:$.financialYearEnd??"-"})]})}),e.jsx(ze,{title:"Bank Details",children:e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"Bank",value:$.bankName??"-"}),e.jsx(be,{label:"Branch",value:$.branchName??"-"}),e.jsx(be,{label:"Account No",value:$.accountNumber??"-"}),e.jsx(be,{label:"IFSC",value:$.ifscCode??"-"})]})})]})}),e.jsx(Vt,{visible:le,onHide:()=>te(!1),onApply:s=>{u(a=>({...a,countryId:s.countryId??a.countryId,stateId:s.stateId??null,districtId:s.districtId??null,cityId:s.cityId??null}))},title:"Import location from master"})]})}const fa=F`
    query Forms($search: String, $limit: Int) {
        forms(search: $search, limit: $limit) {
            formId
            name
            formType
            orderNo
            menuName
        }
    }
`,ba=F`
    mutation CreateForm($name: String!, $formType: String, $orderNo: Int, $menuName: String) {
        createForm(name: $name, formType: $formType, orderNo: $orderNo, menuName: $menuName) {
            formId
        }
    }
`,Na=F`
    mutation UpdateForm($formId: Int!, $name: String, $formType: String, $orderNo: Int, $menuName: String) {
        updateForm(formId: $formId, name: $name, formType: $formType, orderNo: $orderNo, menuName: $menuName) {
            formId
        }
    }
`,ya=F`
    mutation DeleteForm($formId: Int!) {
        deleteForm(formId: $formId)
    }
`,va=Ye({name:Ce().trim().min(1,"Name is required"),formType:Ce(),orderNo:We().int().nonnegative().nullable(),menuName:Ce()}),yt={name:"",formType:"",orderNo:null,menuName:""},wt=r=>{const S=r.trim();return S||null};function ja(){const r=t.useRef(null),S=t.useRef(null),[b,ne]=t.useState(""),ye=2e3,[V,K]=t.useState(!1),[v,z]=t.useState(!1),[C,W]=t.useState(null),[Q,H]=t.useState(!1),[k,$]=t.useState(null),[x,i]=t.useState(yt),[u,ie]=t.useState(yt),[B,N]=t.useState({}),[M,le]=t.useState(!1),{data:te,loading:ce,error:G,refetch:U}=we(fa,{client:j,variables:{search:b.trim()||null,limit:ye}}),[oe]=he(ba,{client:j}),[xe]=he(Na,{client:j}),[se]=he(ya,{client:j}),y=t.useMemo(()=>(te==null?void 0:te.forms)??[],[te]),Ne=t.useMemo(()=>JSON.stringify(x)!==JSON.stringify(u),[x,u]),fe=t.useMemo(()=>Ee(y,C),[y,C]),re=t.useMemo(()=>Ee(y,k),[y,k]),E=t.useMemo(()=>{const l=b.trim().toLowerCase();return l?y.filter(n=>[n.formId,n.name,n.formType,n.menuName,n.orderNo].map(h=>String(h??"").toLowerCase()).join(" ").includes(l)):y},[y,b]),X=()=>{W(null),i(yt),N({}),K(!0)},de=l=>{W(l),i({name:l.name??"",formType:l.formType??"",orderNo:l.orderNo??null,menuName:l.menuName??""}),N({}),K(!0)},f=l=>{$(l),H(!0)},D=l=>{const n=De(y,fe,l);n&&de(n)},L=l=>{const n=De(y,re,l);n&&f(n)},Y=async()=>{var n,h,Z;const l=va.safeParse(x);if(!l.success){const q={};l.error.issues.forEach(ae=>{ae.path[0]&&(q[String(ae.path[0])]=ae.message)}),N(q),(n=r.current)==null||n.show({severity:"warn",summary:"Please fix validation errors"});return}z(!0);try{const q={name:x.name.trim(),formType:wt(x.formType),orderNo:x.orderNo,menuName:wt(x.menuName)};C?await xe({variables:{formId:C.formId,...q}}):await oe({variables:q}),await U(),ie(x),M||K(!1),(h=r.current)==null||h.show({severity:"success",summary:"Saved",detail:"Form saved."})}catch(q){(Z=r.current)==null||Z.show({severity:"error",summary:"Error",detail:(q==null?void 0:q.message)??"Save failed."})}finally{z(!1)}},pe=async l=>{var n,h;try{await se({variables:{formId:l}}),await U(),(n=r.current)==null||n.show({severity:"success",summary:"Deleted",detail:"Form deleted."})}catch(Z){(h=r.current)==null||h.show({severity:"error",summary:"Error",detail:(Z==null?void 0:Z.message)??"Delete failed."})}},d=(l,n)=>{Me({target:l.currentTarget,message:"Delete this form?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>pe(n.formId)})},A=l=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>f(l)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>de(l)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:n=>d(n,l)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Forms"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain form master entries and menu ordering."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{className:"app-action-compact",label:"New Form",icon:"pi pi-plus",onClick:X}),e.jsx(Le,{...Te("forms"),buttonAriaLabel:"Open Forms help"})]})]}),G&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading forms: ",G.message]})]}),e.jsxs(Oe,{ref:S,value:E,paginator:!0,rows:12,rowsPerPageOptions:[12,24,50,100],dataKey:"formId",stripedRows:!0,size:"small",loading:ce,onRowDoubleClick:l=>de(l.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:b,onChange:l=>ne(l.target.value),placeholder:"Search forms",style:{width:"100%"}})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>U()}),e.jsx(p,{label:"Print",icon:"pi pi-print",className:"p-button-text",onClick:()=>window.print()}),e.jsx(p,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var l;return(l=S.current)==null?void 0:l.exportCSV()},disabled:E.length===0}),e.jsxs("span",{className:"text-600 text-sm",children:["Showing ",E.length," form",E.length===1?"":"s"]})]}),recordSummary:`${E.length} form${E.length===1?"":"s"}`,children:[e.jsx(_,{field:"name",header:"Name",sortable:!0}),e.jsx(_,{field:"formType",header:"Type",sortable:!0}),e.jsx(_,{field:"menuName",header:"Menu"}),e.jsx(_,{field:"orderNo",header:"Order",sortable:!0}),e.jsx(_,{header:"Actions",body:A,style:{width:"8rem"}})]}),e.jsx($e,{header:C?"Edit Form":"New Form",visible:V,style:{width:He.medium},onShow:()=>ie(x),onHide:()=>K(!1),footer:e.jsx(_e,{index:fe,total:y.length,onNavigate:D,navigateDisabled:v,bulkMode:{checked:M,onChange:le,disabled:v},onCancel:()=>K(!1),cancelDisabled:v,onSave:Y,saveLabel:v?"Saving...":"Save",saveDisabled:v||!Ne}),children:e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:x.name,onChange:l=>i(n=>({...n,name:l.target.value})),style:{width:"100%"},className:B.name?"p-invalid":void 0}),B.name&&e.jsx("small",{className:"p-error",children:B.name})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Form Type"}),e.jsx(R,{value:x.formType,onChange:l=>i(n=>({...n,formType:l.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Menu Name"}),e.jsx(R,{value:x.menuName,onChange:l=>i(n=>({...n,menuName:l.target.value})),style:{width:"100%"}})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Order No"}),e.jsx(R,{inputType:"number",value:x.orderNo,onValueChange:l=>i(n=>({...n,orderNo:typeof l.value=="number"?l.value:null})),useGrouping:!1,style:{width:"100%"}})]})]})}),e.jsx($e,{header:"Form Details",visible:Q,style:{width:Ue.medium},onHide:()=>H(!1),footer:e.jsx(Ge,{index:re,total:y.length,onNavigate:L,onClose:()=>H(!1)}),children:k&&e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"Name",value:k.name??"-"}),e.jsx(be,{label:"Type",value:k.formType??"-"}),e.jsx(be,{label:"Menu",value:k.menuName??"-"}),e.jsx(be,{label:"Order",value:k.orderNo??"-"})]})})]})}const Ct=F`
    query PaymentViaMasters($search: String, $limit: Int, $includeInactive: Boolean) {
        paymentViaMasters(search: $search, limit: $limit, includeInactive: $includeInactive) {
            paymentViaId
            code
            name
            orderNo
            isActive
        }
    }
`,Ia=F`
    mutation CreatePaymentViaMaster($code: String!, $name: String!, $orderNo: Int, $isActive: Boolean) {
        createPaymentViaMaster(code: $code, name: $name, orderNo: $orderNo, isActive: $isActive) {
            paymentViaId
        }
    }
`,Sa=F`
    mutation UpdatePaymentViaMaster($paymentViaId: Int!, $code: String, $name: String, $orderNo: Int, $isActive: Boolean) {
        updatePaymentViaMaster(paymentViaId: $paymentViaId, code: $code, name: $name, orderNo: $orderNo, isActive: $isActive) {
            paymentViaId
        }
    }
`,wa=F`
    mutation DeletePaymentViaMaster($paymentViaId: Int!) {
        deletePaymentViaMaster(paymentViaId: $paymentViaId)
    }
`,Ca=Ye({code:Ce().trim().min(1,"Code is required"),name:Ce().trim().min(1,"Name is required"),isActive:Ot()}),vt={code:"",name:"",isActive:!0};function $a(){const r=t.useRef(null),[S,b]=t.useState(""),ne=2e3,[ye,V]=t.useState(!0),[K,v]=t.useState(!1),[z,C]=t.useState(!1),[W,Q]=t.useState(null),[H,k]=t.useState(!1),[$,x]=t.useState(null),[i,u]=t.useState(vt),[ie,B]=t.useState(vt),[N,M]=t.useState({}),[le,te]=t.useState(!1),[ce,G]=t.useState([]),[U,oe]=t.useState(!1),{data:xe,loading:se,error:y,refetch:Ne}=we(Ct,{client:j,variables:{search:S.trim()||null,limit:ne,includeInactive:ye}}),[fe]=he(Ia,{client:j}),[re]=he(Sa,{client:j}),[E]=he(wa,{client:j}),X=t.useMemo(()=>(xe==null?void 0:xe.paymentViaMasters)??[],[xe]);t.useEffect(()=>{G(X)},[X]);const de=t.useMemo(()=>JSON.stringify(i)!==JSON.stringify(ie),[i,ie]),f=t.useMemo(()=>Ee(ce,W),[ce,W]),D=t.useMemo(()=>Ee(ce,$),[ce,$]),L=t.useMemo(()=>!S.trim()&&ye,[ye,S]),Y=t.useMemo(()=>{const I=S.trim().toLowerCase();return I?ce.filter(m=>[m.paymentViaId,m.code,m.name,m.orderNo].map(T=>String(T??"").toLowerCase()).join(" ").includes(I)):ce},[ce,S]),pe=()=>{Q(null),u(vt),M({}),v(!0)},d=I=>{Q(I),u({code:I.code??"",name:I.name??"",isActive:I.isActive!==!1}),M({}),v(!0)},A=I=>{x(I),k(!0)},l=I=>{const m=De(ce,f,I);m&&d(m)},n=I=>{const m=De(ce,D,I);m&&A(m)},h=async()=>{const{data:I}=await j.query({query:Ct,variables:{search:null,limit:ne,includeInactive:!0},fetchPolicy:"network-only"});return((I==null?void 0:I.paymentViaMasters)??[]).reduce((T,me)=>{const ue=Number(me.orderNo??0);return Number.isFinite(ue)?Math.max(T,ue):T},0)+1},Z=async I=>{var me,ue;if(!L||U)return;const m=I.map((ge,ke)=>({row:ge,nextOrderNo:ke+1})).filter(({row:ge,nextOrderNo:ke})=>Number(ge.orderNo??0)!==ke),T=I.map((ge,ke)=>({...ge,orderNo:ke+1}));if(G(T),!!m.length){oe(!0);try{await Promise.all(m.map(({row:ge,nextOrderNo:ke})=>re({variables:{paymentViaId:ge.paymentViaId,orderNo:ke}}))),await Ne(),(me=r.current)==null||me.show({severity:"success",summary:"Order Updated",detail:"Payment via display order updated."})}catch(ge){G(X),(ue=r.current)==null||ue.show({severity:"error",summary:"Error",detail:(ge==null?void 0:ge.message)??"Reorder failed."})}finally{oe(!1)}}},q=async()=>{var m,T,me;const I=Ca.safeParse(i);if(!I.success){const ue={};I.error.issues.forEach(ge=>{ge.path[0]&&(ue[String(ge.path[0])]=ge.message)}),M(ue),(m=r.current)==null||m.show({severity:"warn",summary:"Please fix validation errors"});return}C(!0);try{const ue={code:i.code.trim().toUpperCase(),name:i.name.trim(),isActive:!!i.isActive};if(W)await re({variables:{paymentViaId:W.paymentViaId,...ue}});else{const ge=await h();await fe({variables:{...ue,orderNo:ge}})}await Ne(),B(i),le||v(!1),(T=r.current)==null||T.show({severity:"success",summary:"Saved",detail:"Payment via saved."})}catch(ue){(me=r.current)==null||me.show({severity:"error",summary:"Error",detail:(ue==null?void 0:ue.message)??"Save failed."})}finally{C(!1)}},ae=async I=>{var m,T;try{await E({variables:{paymentViaId:I}}),await Ne(),(m=r.current)==null||m.show({severity:"success",summary:"Deleted",detail:"Payment via deleted."})}catch(me){(T=r.current)==null||T.show({severity:"error",summary:"Error",detail:(me==null?void 0:me.message)??"Delete failed."})}},g=(I,m)=>{Me({target:I.currentTarget,message:"Delete this payment via?",icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,accept:()=>ae(m.paymentViaId)})},P=I=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(p,{icon:"pi pi-eye",className:"p-button-text",onClick:()=>A(I)}),e.jsx(p,{icon:"pi pi-pencil",className:"p-button-text",onClick:()=>d(I)}),e.jsx(p,{icon:"pi pi-trash",className:"p-button-text",severity:"danger",onClick:m=>g(m,I)})]});return e.jsxs("div",{className:"card",children:[e.jsx(Pe,{ref:r}),e.jsx(Re,{}),e.jsx($e,{header:W?"Edit Payment Via":"New Payment Via",visible:K,style:{width:He.medium},onShow:()=>B(i),onHide:()=>v(!1),footer:e.jsx(_e,{index:f,total:X.length,onNavigate:l,navigateDisabled:z,bulkMode:{checked:le,onChange:te,disabled:z},onCancel:()=>v(!1),cancelDisabled:z,onSave:q,saveLabel:z?"Saving...":"Save",saveDisabled:z||!de}),children:e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Code"}),e.jsx(R,{value:i.code,onChange:I=>u(m=>({...m,code:I.target.value})),style:{width:"100%"}}),N.code&&e.jsx("small",{className:"text-red-500",children:N.code})]}),e.jsxs("div",{className:"col-12 md:col-8",children:[e.jsx("label",{className:"block text-600 mb-1",children:"Name"}),e.jsx(R,{value:i.name,onChange:I=>u(m=>({...m,name:I.target.value})),style:{width:"100%"}}),N.name&&e.jsx("small",{className:"text-red-500",children:N.name})]}),e.jsx("div",{className:"col-12 md:col-6",children:e.jsxs("div",{className:"flex align-items-center gap-2 mt-2",children:[e.jsx(qe,{inputId:"payment-via-active",checked:i.isActive,onChange:I=>u(m=>({...m,isActive:!!I.checked}))}),e.jsx("label",{htmlFor:"payment-via-active",children:"Active"})]})}),e.jsx("div",{className:"col-12",children:e.jsx("small",{className:"text-600",children:"Display order is managed from the list by dragging rows."})})]})}),e.jsx($e,{header:"Payment Via Details",visible:H,style:{width:Ue.medium},onHide:()=>k(!1),footer:e.jsx(Ge,{index:D,total:X.length,onNavigate:n,onClose:()=>k(!1)}),children:$&&e.jsxs(Fe,{columns:2,children:[e.jsx(be,{label:"Code",value:$.code??"-"}),e.jsx(be,{label:"Name",value:$.name??"-"}),e.jsx(be,{label:"Display Order",value:$.orderNo??"-"}),e.jsx(be,{label:"Active",value:$.isActive===!1?"No":"Yes"})]})}),e.jsxs("div",{className:"flex flex-column gap-2 mb-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:"Payment Via"}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:"Maintain bank payment modes for vouchers."}),e.jsx("p",{className:"mt-2 mb-0 text-500 text-sm",children:L?"Drag rows from the handle to set display order.":"Clear search and enable Show inactive to reorder display order."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-start",children:[e.jsx(p,{label:"New Payment Via",icon:"pi pi-plus",className:"app-action-compact",onClick:pe}),e.jsx(Le,{...Te("paymentVia"),buttonAriaLabel:"Open Payment Via help"})]})]}),y&&e.jsxs("p",{className:"text-red-500 m-0",children:["Error loading payment via: ",y.message]})]}),e.jsxs(Oe,{value:Y,paginator:!0,rows:15,rowsPerPageOptions:[15,30,50,100],dataKey:"paymentViaId",stripedRows:!0,size:"small",loading:se||U,reorderableRows:L,onRowReorder:I=>{Z(I.value)},headerLeft:e.jsxs("div",{className:"flex flex-column md:flex-row gap-2",style:{minWidth:"320px"},children:[e.jsxs("span",{className:"p-input-icon-left",style:{minWidth:"220px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(R,{value:S,onChange:I=>b(I.target.value),placeholder:"Search payment via",style:{width:"100%"}})]}),e.jsxs("div",{className:"flex align-items-center gap-2",children:[e.jsx(qe,{inputId:"payment-via-include-inactive",checked:ye,onChange:I=>V(!!I.checked)}),e.jsx("label",{htmlFor:"payment-via-include-inactive",children:"Show inactive"})]})]}),headerRight:e.jsx(p,{label:"Refresh",icon:"pi pi-refresh",className:"p-button-text",onClick:()=>Ne()}),recordSummary:`${Y.length} payment via${Y.length===1?"":"s"}`,children:[L?e.jsx(_,{rowReorder:!0,style:{width:"3rem"}}):null,e.jsx(_,{field:"paymentViaId",header:"ID",style:{width:"6rem"}}),e.jsx(_,{field:"code",header:"Code",style:{width:"8rem"}}),e.jsx(_,{field:"name",header:"Name"}),e.jsx(_,{field:"orderNo",header:"Order",style:{width:"7rem",textAlign:"right"}}),e.jsx(_,{field:"isActive",header:"Active",body:I=>I.isActive===!1?"No":"Yes",style:{width:"6rem",textAlign:"center"}}),e.jsx(_,{header:"Actions",body:P,style:{width:"6rem"}})]})]})}const Ea={users:e.jsx(is,{}),managers:e.jsx(us,{}),salesmen:e.jsx(bs,{}),banks:e.jsx(Ss,{}),branches:e.jsx(ks,{}),areas:e.jsx(Ls,{}),cities:e.jsx(Us,{}),districts:e.jsx(Ws,{}),states:e.jsx(na,{}),companies:e.jsx(ga,{}),forms:e.jsx(ja,{}),"payment-via":e.jsx($a,{})};function wn(){const{section:r}=Yt(),S=r?Ht[r]:void 0,b=r?Ea[r]:void 0;if(b)return b;const ne=(S==null?void 0:S.label)??"Accounts",ye=S?`${S.groupLabel} - ${S.label} from the legacy agency app will be implemented here.`:"Additional account masters and utilities will be implemented here.";return e.jsxs("div",{className:"card",children:[e.jsx("h2",{className:"mb-2",children:ne}),e.jsx("p",{className:"text-600",children:ye}),S&&e.jsx("div",{className:"mt-3",children:e.jsx(qt,{to:"/apps/accounts",children:"Back to Accounts"})})]})}export{wn as default};
