import{j as e,ao as Jt,ap as _t,B,aX as ns,u as rs,r as b}from"./index-a2e62377.js";import{C as S}from"./column.esm-81c99a02.js";import{D as dt}from"./datatable.esm-b891b45f.js";import{D as Ut}from"./dialog.esm-6e6fddb6.js";import{C as ds}from"./confirmdialog.esm-d0f3c502.js";import{T as os}from"./toast.esm-b4e71f30.js";import{C as cs,c as us}from"./confirmpopup.esm-10c3d8e4.js";import{T as ms,a as De}from"./tabview.esm-baba8001.js";import{u as ps,f as wt,A as xs,g as gs,M as hs,a as bs,b as Vt,e as Ns,d as fs,h as Is,j as ys,i as js,c as Ss,k as vs}from"./masterDryRun-e195d4c4.js";import{A as Ls}from"./AppDataTable-ff6b8365.js";import{A as f}from"./AppInput-10952e09.js";import{G as $s}from"./GeoImportDialog-35880566.js";import{f as p,u as Cs,g as Ps,a as As,M as Ts,b as le,c as Oe,d as N,e as Fs}from"./masterDialogLayout-1fd44051.js";import{u as Rs}from"./ledgerGroups-1f2f8c53.js";import{u as Ds}from"./areas-a4b4ae89.js";import{r as Os}from"./fiscalRange-d7f67286.js";import{A as ut,v as Es}from"./AppDateInput-ceb6f146.js";import{i as ot,A as Gs}from"./masterLookupCache-09ded647.js";import{C as z}from"./checkbox.esm-afaac66b.js";import{A as J}from"./AppDropdown-800ebb2b.js";import{A as Bs}from"./AppMultiSelect-e91c3da8.js";import{u as ie,g as w}from"./useQuery-55f3f513.js";import{u as Ee}from"./useMutation-fc9212b2.js";import{o as Ms,s as h,n as K}from"./types-eaf96456.js";import"./paginator.esm-e234ed6f.js";import"./inputnumber.esm-991f482d.js";import"./index.esm-1ebbc8e4.js";import"./index.esm-2f3fd837.js";import"./dropdown.esm-7710effc.js";import"./index.esm-287dfa04.js";import"./overlayservice.esm-bf9b13ee.js";import"./virtualscroller.esm-c60a9a04.js";import"./index.esm-23a64aa1.js";import"./index.esm-716d0587.js";import"./index.esm-b05ab7aa.js";import"./index.esm-29a8c0d6.js";import"./index.esm-81904cc2.js";import"./index.esm-10fa0e2b.js";import"./TransitionGroup-03c23142.js";import"./index.esm-4880a95e.js";import"./AppCompactToggle-348b435c.js";import"./splitbutton.esm-f8323715.js";import"./skeleton.esm-8641005e.js";import"./reportExport-834d722d.js";import"./useLazyQuery-83424a52.js";import"./useIsomorphicLayoutEffect-da2e447d.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-e0ea7a14.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";import"./multiselect.esm-e8c9a563.js";const ct=(t,s,u,y)=>t.getFullYear()===s&&t.getMonth()===u&&t.getDate()===y,mt=t=>{if(t instanceof Date)return Number.isNaN(t.getTime())?null:t;if(typeof t!="string")return null;const s=t.trim();if(!s)return null;const u=s.match(/^(\d{4})(\d{2})(\d{2})$/);if(u){const d=Number(u[1]),c=Number(u[2])-1,C=Number(u[3]),L=new Date(d,c,C);return!Number.isNaN(L.getTime())&&ct(L,d,c,C)?L:null}const y=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(y){const d=Number(y[1]),c=Number(y[2])-1,C=Number(y[3]),L=new Date(d,c,C);return!Number.isNaN(L.getTime())&&ct(L,d,c,C)?L:null}const g=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(g){const d=Number(g[3]),c=Number(g[2])-1,C=Number(g[1]),L=new Date(d,c,C);return!Number.isNaN(L.getTime())&&ct(L,d,c,C)?L:null}return null},ea=t=>{const s=mt(t);return s?new Date(s.getFullYear(),s.getMonth(),s.getDate()):null},pt=t=>{if(!t)return"";const s=t.getFullYear(),u=String(t.getMonth()+1).padStart(2,"0"),y=String(t.getDate()).padStart(2,"0");return`${s}-${u}-${y}`},qt=t=>{if(!t)return[];try{const s=JSON.parse(t);return Array.isArray(s)?s.map(u=>typeof u=="string"?{label:u,value:u}:{label:u.label??u.value??String(u),value:u.value??u.label??String(u)}):[]}catch{return[]}},ks=({definition:t,value:s,errorMessage:u,fiscalRange:y,inputId:g,onEnterNext:d,onChange:c})=>{const C=t.required?e.jsx("span",{className:"p-error",children:"*"}):null,L=x=>{if(x.key!=="Enter"&&x.key!=="NumpadEnter")return;if(x.preventDefault(),x.stopPropagation(),!d){Jt(x.currentTarget,_t(x.currentTarget));return}d()!==!0&&Jt(x.currentTarget,_t(x.currentTarget))};switch(t.fieldType){case"number":return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[t.label," ",C]}),e.jsx(f,{inputType:"number",inputId:g,value:typeof s=="number"?s:s!=null?Number(s):null,onValueChange:x=>c(typeof x.value=="number"?x.value:null),onEnterNext:d,useGrouping:!1,maxFractionDigits:2,placeholder:t.label,style:{width:"100%"}}),u&&e.jsx("small",{className:"p-error",children:u})]});case"boolean":return e.jsxs("div",{className:"flex flex-column gap-2",children:[e.jsxs("label",{className:"font-medium",children:[t.label," ",C]}),e.jsxs("div",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:g??`extra-${t.key}`,checked:!!s,onChange:x=>c(x.checked),onKeyDown:L}),e.jsx("label",{htmlFor:g??`extra-${t.key}`,className:"text-600",children:t.label})]}),u&&e.jsx("small",{className:"p-error",children:u})]});case"date":return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[t.label," ",C]}),e.jsx(ut,{inputId:g,value:mt(s),onChange:x=>c(x?pt(x):null),onEnterNext:d,placeholder:"DD/MM/YYYY",fiscalYearStart:y.start??null,fiscalYearEnd:y.end??null,enforceFiscalRange:!0}),u&&e.jsx("small",{className:"p-error",children:u})]});case"select":return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[t.label," ",C]}),e.jsx(J,{inputId:g,value:s??null,options:qt(t.options),onChange:x=>c(x.value),onEnterNext:d,placeholder:`Select ${t.label}`,showClear:!0,filter:!0}),u&&e.jsx("small",{className:"p-error",children:u})]});case"multi-select":return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[t.label," ",C]}),e.jsx(Bs,{inputId:g,value:Array.isArray(s)?s:[],options:qt(t.options),onChange:x=>c(x.value??[]),onEnterNext:d,placeholder:`Select ${t.label}`,display:"chip"}),u&&e.jsx("small",{className:"p-error",children:u})]});default:return e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[t.label," ",C]}),e.jsx(f,{id:g,value:s??"",onChange:x=>c(x.target.value),onEnterNext:d,placeholder:t.label}),u&&e.jsx("small",{className:"p-error",children:u})]})}},Ys=(t,s)=>t[s]?e.jsx("small",{className:"p-error",children:t[s]}):null,Js=({form:t,formErrors:s,fiscalRange:u,groupedFieldDefinitions:y,labels:g,fieldIds:d,isEditingProtectedLedger:c,isEditing:C,extraValues:L,onFormChange:x,onAddContactPerson:P,onUpdateContactPerson:r,onRemoveContactPerson:V,onAddLedgerSalesTax:I,onUpdateLedgerSalesTax:Z,onRemoveLedgerSalesTax:Be,onUpdateExtraField:Me})=>{const q=(m,$)=>`ledger-contact-${m}-${$}`,_=(m,$)=>`ledger-sales-tax-${m}-${$}`,re=m=>`ledger-extra-field-${m}`,de=y.flatMap(m=>m.definitions),ke=m=>{const $=t.contactPersons[m+1];if($)return p(q($.rowId,"name")),!0;const v=t.ledgerSalesTaxes[0];if(v)return p(_(v.rowId,"tax-name")),!0;const Se=de[0];return Se?(p(re(Se.key)),!0):(p(d.openingBalance),!0)},Ye=m=>{const $=t.ledgerSalesTaxes[m+1];if($)return p(_($.rowId,"tax-name")),!0;const v=de[0];return v?(p(re(v.key)),!0):(p(d.openingBalance),!0)},Je=m=>{const $=de[m+1];return $?(p(re($.key)),!0):(p(d.openingBalance),!0)};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex align-items-center justify-content-between",children:[e.jsx("span",{className:"font-medium text-700",children:"Contact Persons"}),e.jsx(B,{label:"Add Contact",icon:"pi pi-plus",text:!0,size:"small",onClick:P})]}),t.contactPersons.length===0&&e.jsx("small",{className:"text-600",children:"No contact rows added."}),t.contactPersons.map((m,$)=>e.jsxs("div",{className:"border-1 surface-border border-round p-2 flex flex-column gap-2",children:[e.jsxs("div",{className:"flex align-items-center justify-content-between",children:[e.jsxs("span",{className:"text-700 text-sm",children:["Contact #",$+1]}),e.jsx(B,{icon:"pi pi-trash",text:!0,rounded:!0,className:"p-button-danger p-button-text",onClick:()=>V(m.rowId)})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Name"}),e.jsx(f,{id:q(m.rowId,"name"),value:m.name,onChange:v=>r(m.rowId,{name:v.target.value}),onEnterNext:()=>p(q(m.rowId,"designation")),placeholder:"Contact name"})]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Designation"}),e.jsx(f,{id:q(m.rowId,"designation"),value:m.designation,onChange:v=>r(m.rowId,{designation:v.target.value}),onEnterNext:()=>p(q(m.rowId,"mobile")),placeholder:"Designation"})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Mobile"}),e.jsx(f,{id:q(m.rowId,"mobile"),value:m.mobileNumber,onChange:v=>r(m.rowId,{mobileNumber:v.target.value}),onEnterNext:()=>p(q(m.rowId,"email")),placeholder:"Mobile"})]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Email"}),e.jsx(f,{id:q(m.rowId,"email"),value:m.email,onChange:v=>r(m.rowId,{email:v.target.value}),onEnterNext:()=>ke($),placeholder:"Email"})]})]})]},m.rowId)),e.jsxs("div",{className:"flex align-items-center justify-content-between",children:[e.jsx("span",{className:"font-medium text-700",children:"Ledger Sales Taxes"}),e.jsx(B,{label:"Add Tax Row",icon:"pi pi-plus",text:!0,size:"small",onClick:I})]}),t.ledgerSalesTaxes.length===0&&e.jsx("small",{className:"text-600",children:"No sales-tax rows added."}),t.ledgerSalesTaxes.map((m,$)=>e.jsxs("div",{className:"border-1 surface-border border-round p-2 flex flex-column gap-2",children:[e.jsxs("div",{className:"flex align-items-center justify-content-between",children:[e.jsxs("span",{className:"text-700 text-sm",children:["Tax Row #",$+1]}),e.jsx(B,{icon:"pi pi-trash",text:!0,rounded:!0,className:"p-button-danger p-button-text",onClick:()=>Be(m.rowId)})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Name"}),e.jsx(f,{id:_(m.rowId,"tax-name"),value:m.taxName,onChange:v=>Z(m.rowId,{taxName:v.target.value}),onEnterNext:()=>p(_(m.rowId,"gst-number")),placeholder:"Tax row name"})]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"GST No"}),e.jsx(f,{id:_(m.rowId,"gst-number"),value:m.gstNumber,onChange:v=>Z(m.rowId,{gstNumber:v.target.value}),onEnterNext:()=>p(_(m.rowId,"tax-rate")),placeholder:"GST number"})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Rate"}),e.jsx(f,{id:_(m.rowId,"tax-rate"),value:m.taxRate,onChange:v=>Z(m.rowId,{taxRate:v.target.value}),onEnterNext:()=>p(_(m.rowId,"effective-date")),placeholder:"Tax rate"})]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Effective Date"}),e.jsx(ut,{inputId:_(m.rowId,"effective-date"),value:ea(m.effectiveDate),onChange:v=>Z(m.rowId,{effectiveDate:pt(v)}),onEnterNext:()=>Ye($),placeholder:"DD/MM/YYYY"})]})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:`ledger-sales-tax-active-${m.rowId}`,checked:m.isActiveFlag===1,onChange:v=>Z(m.rowId,{isActiveFlag:v.checked?1:0})}),e.jsx("label",{htmlFor:`ledger-sales-tax-active-${m.rowId}`,className:"font-medium",children:"Active"})]})]},m.rowId)),y.length>0&&e.jsxs("div",{className:"flex flex-column gap-2",children:[e.jsx("span",{className:"font-medium text-700",children:"Additional Fields"}),y.map(m=>e.jsxs("div",{className:"flex flex-column gap-2",children:[e.jsx("span",{className:"text-600 text-sm",children:m.groupName}),e.jsx("div",{className:"grid",children:m.definitions.map($=>e.jsx("div",{className:"col-12 md:col-6",children:e.jsx(ks,{definition:$,value:L[$.key],errorMessage:s[`extraFields.${$.key}`],fiscalRange:u,inputId:re($.key),onEnterNext:()=>Je(de.findIndex(v=>v.key===$.key)),onChange:v=>Me($.key,v)})},$.id))})]},m.groupName))]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:g.openingBalance}),e.jsx("small",{className:"text-600",children:"Numeric amount; select Dr/Cr on the right."}),e.jsx(f,{id:d.openingBalance,value:t.openingBalanceAmount,onChange:m=>x({openingBalanceAmount:m.target.value}),onEnterNext:()=>p(d.balanceType),placeholder:"0.00",disabled:C&&c}),Ys(s,"openingBalanceAmount")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:g.drcr}),e.jsx(J,{inputId:d.balanceType,value:t.balanceType,options:[{label:"Dr",value:1},{label:"Cr",value:-1}],onChange:m=>x({balanceType:m.value}),onEnterNext:()=>p(d.save),placeholder:"Select",disabled:C&&c})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-4",children:[e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-active-flag",checked:t.isActiveFlag===1,onChange:m=>x({isActiveFlag:m.checked?1:0}),disabled:C&&c}),e.jsx("label",{htmlFor:"ledger-active-flag",className:"font-medium",children:"Active"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-reverse-charge-flag",checked:t.isReverseChargeApplicableFlag===1,onChange:m=>x({isReverseChargeApplicableFlag:m.checked?1:0})}),e.jsx("label",{htmlFor:"ledger-reverse-charge-flag",className:"font-medium",children:"Reverse Charge Applicable"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-export-flag",checked:t.isExportFlag===1,onChange:m=>x({isExportFlag:m.checked?1:0})}),e.jsx("label",{htmlFor:"ledger-export-flag",className:"font-medium",children:"Export Ledger"})]})]})]})},k=(t,s)=>t[s]?e.jsx("small",{className:"p-error",children:t[s]}):null,_s=({form:t,formErrors:s,isEditingProtectedLedger:u,ledgerGroupOptions:y,countryOptions:g,stateOptions:d,districtOptions:c,cityOptions:C,areaOptions:L,fieldIds:x,labels:P,onFormChange:r,onOpenGeoImport:V})=>e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[P.name," ",e.jsx("span",{className:"p-error",children:"*"})]}),e.jsx(f,{id:x.ledgerName,autoFocus:!0,value:t.name,onChange:I=>r({name:I.target.value}),onEnterNext:()=>p(x.ledgerGroup),placeholder:"Ledger name",className:s.name?"p-invalid":void 0}),k(s,"name")]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsxs("label",{className:"font-medium",children:[P.group," ",e.jsx("span",{className:"p-error",children:"*"})]}),e.jsx(J,{inputId:x.ledgerGroup,value:t.ledgerGroupId,options:y,onChange:I=>r({ledgerGroupId:I.value??""}),onEnterNext:()=>p(x.ledgerAlias),placeholder:"Select group",filter:!0,showClear:!0,disabled:u,className:s.ledgerGroupId?"p-invalid":void 0}),k(s,"ledgerGroupId")]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Alias"}),e.jsx(f,{id:x.ledgerAlias,value:t.alias,onChange:I=>r({alias:I.target.value}),onEnterNext:()=>p(x.ledgerPostalCode),placeholder:"Short alias"}),k(s,"alias")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Postal Code"}),e.jsx(f,{id:x.ledgerPostalCode,value:t.postalCode,onChange:I=>r({postalCode:I.target.value}),onEnterNext:()=>p(x.ledgerAddress1),placeholder:"Postal code"}),k(s,"postalCode")]})]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Address Line 1"}),e.jsx(f,{id:x.ledgerAddress1,value:t.addressLine1,onChange:I=>r({addressLine1:I.target.value}),onEnterNext:()=>p(x.ledgerAddress2),placeholder:"Street / Building"}),k(s,"addressLine1")]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Address Line 2"}),e.jsx(f,{id:x.ledgerAddress2,value:t.addressLine2,onChange:I=>r({addressLine2:I.target.value}),onEnterNext:()=>p(x.ledgerAddress3),placeholder:"Area / Landmark"}),k(s,"addressLine2")]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Address Line 3"}),e.jsx(f,{id:x.ledgerAddress3,value:t.addressLine3,onChange:I=>r({addressLine3:I.target.value}),onEnterNext:()=>p(x.ledgerCountry),placeholder:"Additional details"}),k(s,"addressLine3")]}),e.jsxs("div",{className:"flex align-items-center justify-content-between",children:[e.jsx("span",{className:"font-medium text-700",children:"Location"}),e.jsx(B,{label:"Import from master",icon:"pi pi-download",text:!0,size:"small",onClick:V})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Country"}),e.jsx(J,{inputId:x.ledgerCountry,value:t.countryId,options:g,onChange:I=>r({countryId:I.value??"",stateId:"",districtId:"",cityId:"",areaId:""}),onEnterNext:()=>p(x.ledgerState),placeholder:"Select country",filter:!0,showClear:!0,className:s.countryId?"p-invalid":void 0}),k(s,"countryId")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"State"}),e.jsx(J,{inputId:x.ledgerState,value:t.stateId,options:d,onChange:I=>r({stateId:I.value??"",districtId:"",cityId:"",areaId:""}),onEnterNext:()=>p(x.ledgerDistrict),placeholder:t.countryId?"Select state":"Select country first",filter:!0,showClear:!0,disabled:!t.countryId,className:s.stateId?"p-invalid":void 0}),k(s,"stateId")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"District"}),e.jsx(J,{inputId:x.ledgerDistrict,value:t.districtId,options:c,onChange:I=>r({districtId:I.value??"",cityId:"",areaId:""}),onEnterNext:()=>p(x.ledgerCity),placeholder:t.stateId?"Select district":"Select state first",filter:!0,showClear:!0,disabled:!t.stateId,className:s.districtId?"p-invalid":void 0}),k(s,"districtId")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"City"}),e.jsx(J,{inputId:x.ledgerCity,value:t.cityId,options:C,onChange:I=>r({cityId:I.value??"",areaId:""}),onEnterNext:()=>p(x.ledgerArea),placeholder:t.districtId?"Select city":"Select district first",filter:!0,showClear:!0,disabled:!t.districtId,className:s.cityId?"p-invalid":void 0}),k(s,"cityId")]})]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Area"}),e.jsx(J,{inputId:x.ledgerArea,value:t.areaId,options:L,onChange:I=>r({areaId:I.value??""}),onEnterNext:()=>p(x.ledgerSave),placeholder:t.cityId?"Select area":"Select city first",filter:!0,showClear:!0,disabled:!t.cityId,className:s.areaId?"p-invalid":void 0}),k(s,"areaId")]})]}),R=(t,s)=>t[s]?e.jsx("small",{className:"p-error",children:t[s]}):null,Us=({form:t,formErrors:s,maxShippingAddresses:u,shippingCityOptions:y,labels:g,fieldIds:d,onFormChange:c,onAddShippingAddress:C,onUpdateShippingAddress:L,onRemoveShippingAddress:x})=>{const P=(r,V)=>`ledger-shipping-${r}-${V}`;return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex align-items-center justify-content-between",children:[e.jsx("span",{className:"font-medium text-700",children:"Shipping Details"}),e.jsx(B,{label:"Add Address",icon:"pi pi-plus",text:!0,size:"small",onClick:C,disabled:t.shippingAddresses.length>=u})]}),t.shippingAddresses.map((r,V)=>e.jsxs("div",{className:"border-1 surface-border border-round p-2 flex flex-column gap-2",children:[e.jsxs("div",{className:"flex align-items-center justify-content-between",children:[e.jsxs("span",{className:"text-700 text-sm",children:["Shipping Address #",V+1]}),e.jsx(B,{icon:"pi pi-trash",text:!0,rounded:!0,className:"p-button-danger p-button-text",onClick:()=>x(r.rowId),disabled:t.shippingAddresses.length<=1})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship Address Line 1"}),e.jsx(f,{id:P(r.rowId,"address-line-1"),value:r.addressLine1,onChange:I=>L(r.rowId,{addressLine1:I.target.value}),onEnterNext:()=>p(P(r.rowId,"address-line-2")),placeholder:"Shipping address line 1"})]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship Address Line 2"}),e.jsx(f,{id:P(r.rowId,"address-line-2"),value:r.addressLine2,onChange:I=>L(r.rowId,{addressLine2:I.target.value}),onEnterNext:()=>p(P(r.rowId,"address-line-3")),placeholder:"Shipping address line 2"})]})]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship Address Line 3"}),e.jsx(f,{id:P(r.rowId,"address-line-3"),value:r.addressLine3,onChange:I=>L(r.rowId,{addressLine3:I.target.value}),onEnterNext:()=>p(P(r.rowId,"city")),placeholder:"Shipping address line 3"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship City"}),e.jsx(J,{inputId:P(r.rowId,"city"),value:r.cityId,options:y,onChange:I=>L(r.rowId,{cityId:I.value??""}),onEnterNext:()=>p(P(r.rowId,"postal-code")),placeholder:"Select shipping city",filter:!0,showClear:!0,className:s[`shippingAddresses.${r.rowId}.cityId`]?"p-invalid":void 0}),R(s,`shippingAddresses.${r.rowId}.cityId`)]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship Postal Code"}),e.jsx(f,{id:P(r.rowId,"postal-code"),value:r.postalCode,onChange:I=>L(r.rowId,{postalCode:I.target.value}),onEnterNext:()=>p(P(r.rowId,"office-phone")),placeholder:"Shipping postal code"})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship Office Phone"}),e.jsx(f,{id:P(r.rowId,"office-phone"),value:r.officePhone,onChange:I=>L(r.rowId,{officePhone:I.target.value}),onEnterNext:()=>p(P(r.rowId,"residence-phone")),placeholder:"Shipping office phone"})]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship Residence Phone"}),e.jsx(f,{id:P(r.rowId,"residence-phone"),value:r.residencePhone,onChange:I=>L(r.rowId,{residencePhone:I.target.value}),onEnterNext:()=>p(P(r.rowId,"mobile")),placeholder:"Shipping residence phone"})]})]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Ship Mobile"}),e.jsx("small",{className:"text-600",children:"10-13 digits, numbers only."}),e.jsx(f,{id:P(r.rowId,"mobile"),value:r.mobileNumber,onChange:I=>L(r.rowId,{mobileNumber:I.target.value}),onEnterNext:()=>{const I=t.shippingAddresses[V+1];return I?(p(P(I.rowId,"address-line-1")),!0):(p(d.creditLimitDays),!0)},placeholder:"Shipping mobile"}),R(s,`shippingAddresses.${r.rowId}.mobileNumber`)]})]},r.rowId)),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Credit Limit (Days)"}),e.jsx(f,{id:d.creditLimitDays,value:t.creditLimitNoOfDays,onChange:r=>c({creditLimitNoOfDays:r.target.value}),onEnterNext:()=>p(d.creditLimitBills),placeholder:"No of days"}),R(s,"creditLimitNoOfDays")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Credit Limit (Bills)"}),e.jsx(f,{id:d.creditLimitBills,value:t.creditLimitNoOfBills,onChange:r=>c({creditLimitNoOfBills:r.target.value}),onEnterNext:()=>p(d.officePhone),placeholder:"No of bills"}),R(s,"creditLimitNoOfBills")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Office Phone"}),e.jsx(f,{id:d.officePhone,value:t.officePhone,onChange:r=>c({officePhone:r.target.value}),onEnterNext:()=>p(d.residencePhone),placeholder:"Office phone"}),R(s,"officePhone")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Residence Phone"}),e.jsx(f,{id:d.residencePhone,value:t.residencePhone,onChange:r=>c({residencePhone:r.target.value}),onEnterNext:()=>p(d.mobile),placeholder:"Residence phone"}),R(s,"residencePhone")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:g.mobile}),e.jsx("small",{className:"text-600",children:"10-13 digits, numbers only."}),e.jsx(f,{id:d.mobile,value:t.mobileNumber,onChange:r=>c({mobileNumber:r.target.value}),onEnterNext:()=>p(d.gst),placeholder:"Mobile"}),R(s,"mobileNumber")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:g.gst}),e.jsx("small",{className:"text-600",children:"15 chars, A-Z/0-9 (GSTIN)."}),e.jsx(f,{id:d.gst,value:t.gstNumber,onChange:r=>c({gstNumber:r.target.value}),onEnterNext:()=>p(d.email),placeholder:"GST"}),R(s,"gstNumber")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Email"}),e.jsx(f,{id:d.email,value:t.email,onChange:r=>c({email:r.target.value}),onEnterNext:()=>p(d.website),placeholder:"Email"}),R(s,"email")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Website"}),e.jsx(f,{id:d.website,value:t.website,onChange:r=>c({website:r.target.value}),onEnterNext:()=>p(d.pan),placeholder:"Website"}),R(s,"website")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"PAN No"}),e.jsx(f,{id:d.pan,value:t.panNumber,onChange:r=>c({panNumber:r.target.value}),onEnterNext:()=>p(d.tin),placeholder:"PAN"}),R(s,"panNumber")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"TIN No"}),e.jsx(f,{id:d.tin,value:t.tinNumber,onChange:r=>c({tinNumber:r.target.value}),onEnterNext:()=>p(d.tin2),placeholder:"TIN"}),R(s,"tinNumber")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"TIN No 2"}),e.jsx(f,{id:d.tin2,value:t.tinNumber2,onChange:r=>c({tinNumber2:r.target.value}),onEnterNext:()=>p(d.tin3),placeholder:"TIN No 2"}),R(s,"tinNumber2")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"TIN No 3"}),e.jsx(f,{id:d.tin3,value:t.tinNumber3,onChange:r=>c({tinNumber3:r.target.value}),onEnterNext:()=>p(d.tinFrom2),placeholder:"TIN No 3"}),R(s,"tinNumber3")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"TIN No From 2"}),e.jsx(f,{id:d.tinFrom2,value:t.tinNumberFrom2,onChange:r=>c({tinNumberFrom2:r.target.value}),onEnterNext:()=>p(d.tinFrom3),placeholder:"TIN No From 2"}),R(s,"tinNumberFrom2")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"TIN No From 3"}),e.jsx(f,{id:d.tinFrom3,value:t.tinNumberFrom3,onChange:r=>c({tinNumberFrom3:r.target.value}),onEnterNext:()=>p(d.save),placeholder:"TIN No From 3"}),R(s,"tinNumberFrom3")]})]})]})},O=(t,s)=>t[s]?e.jsx("small",{className:"p-error",children:t[s]}):null,ws=({form:t,formErrors:s,ledgerOptions:u,ledgerOptionsErrorMessage:y,fieldIds:g,onFormChange:d})=>e.jsxs(e.Fragment,{children:[y&&e.jsxs("small",{className:"p-error block mb-2",children:["Ledger options error: ",y]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Rate"}),e.jsx(f,{id:g.taxRate,value:t.taxRate,onChange:c=>d({taxRate:c.target.value}),onEnterNext:()=>p(g.taxTypeCode),placeholder:"Tax rate"}),O(s,"taxRate")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Type Code"}),e.jsx(f,{id:g.taxTypeCode,value:t.taxTypeCode,onChange:c=>d({taxTypeCode:c.target.value}),onEnterNext:()=>p(g.taxCalculation),placeholder:"Tax type code"}),O(s,"taxTypeCode")]})]}),e.jsx("div",{className:"flex align-items-center justify-content-between",children:e.jsx("span",{className:"font-medium text-700",children:"Tax Configuration"})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Calculation"}),e.jsx(f,{id:g.taxCalculation,value:t.taxCalculation,onChange:c=>d({taxCalculation:c.target.value}),onEnterNext:()=>p(g.taxNature),placeholder:"Tax calculation code"}),O(s,"taxCalculation")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Nature"}),e.jsx(f,{id:g.taxNature,value:t.taxNature,onChange:c=>d({taxNature:c.target.value}),onEnterNext:()=>p(g.taxCapitalGoods),placeholder:"Tax nature code"}),O(s,"taxNature")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Capital Goods"}),e.jsx(f,{id:g.taxCapitalGoods,value:t.taxCapitalGoods,onChange:c=>d({taxCapitalGoods:c.target.value}),onEnterNext:()=>p(g.taxAccountsUpdate),placeholder:"Tax capital goods flag/code"}),O(s,"taxCapitalGoods")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Accounts Update"}),e.jsx(f,{id:g.taxAccountsUpdate,value:t.taxAccountsUpdate,onChange:c=>d({taxAccountsUpdate:c.target.value}),onEnterNext:()=>p(g.taxRoundOffSales),placeholder:"Tax accounts update flag/code"}),O(s,"taxAccountsUpdate")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Round Off (Sales)"}),e.jsx(f,{id:g.taxRoundOffSales,value:t.taxRoundOffSales,onChange:c=>d({taxRoundOffSales:c.target.value}),onEnterNext:()=>p(g.taxRoundOffPurchase),placeholder:"Sales round-off code"}),O(s,"taxRoundOffSales")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Round Off (Purchase)"}),e.jsx(f,{id:g.taxRoundOffPurchase,value:t.taxRoundOffPurchase,onChange:c=>d({taxRoundOffPurchase:c.target.value}),onEnterNext:()=>p(g.taxPurchaseLedger),placeholder:"Purchase round-off code"}),O(s,"taxRoundOffPurchase")]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Purchase Ledger"}),e.jsx(J,{inputId:g.taxPurchaseLedger,value:t.taxFPurchaseLedgerId,options:u,onChange:c=>d({taxFPurchaseLedgerId:c.value??""}),onEnterNext:()=>p(g.taxSalesLedger),placeholder:"Select ledger",showClear:!0,filter:!0,className:s.taxFPurchaseLedgerId?"p-invalid":void 0}),O(s,"taxFPurchaseLedgerId")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Sales Ledger"}),e.jsx(J,{inputId:g.taxSalesLedger,value:t.taxFSalesLedgerId,options:u,onChange:c=>d({taxFSalesLedgerId:c.value??""}),onEnterNext:()=>p(g.taxSalesLedger2),placeholder:"Select ledger",showClear:!0,filter:!0,className:s.taxFSalesLedgerId?"p-invalid":void 0}),O(s,"taxFSalesLedgerId")]})]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Tax Sales Ledger 2"}),e.jsx(J,{inputId:g.taxSalesLedger2,value:t.taxFSalesLedger2Id,options:u,onChange:c=>d({taxFSalesLedger2Id:c.value??""}),onEnterNext:()=>p(g.partyType),placeholder:"Select ledger",showClear:!0,filter:!0,className:s.taxFSalesLedger2Id?"p-invalid":void 0}),O(s,"taxFSalesLedger2Id")]}),e.jsx("div",{className:"flex align-items-center justify-content-between",children:e.jsx("span",{className:"font-medium text-700",children:"Operational Controls"})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Party Type"}),e.jsx(f,{id:g.partyType,value:t.typeOfParty,onChange:c=>d({typeOfParty:c.target.value}),onEnterNext:()=>p(g.interestRate),placeholder:"Type of party"}),O(s,"typeOfParty")]}),e.jsxs("span",{className:"flex-1 flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"Interest Rate"}),e.jsx(f,{id:g.interestRate,value:t.intRate,onChange:c=>d({intRate:c.target.value}),onEnterNext:()=>t.isStopGst===1?(p(g.gstStopDate),!0):(p(g.save),!0),placeholder:"Interest rate"}),O(s,"intRate")]})]}),e.jsxs("div",{className:"flex flex-column gap-1",children:[e.jsx("label",{className:"font-medium",children:"GST Stop Date"}),e.jsx(ut,{inputId:g.gstStopDate,value:ea(t.gstStopDate),onChange:c=>d({gstStopDate:pt(c)}),onEnterNext:()=>p(g.save),placeholder:"DD/MM/YYYY",disabled:t.isStopGst!==1}),O(s,"gstStopDate")]}),e.jsxs("div",{className:"flex flex-wrap gap-4",children:[e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-generate-bill-flag",checked:t.isGenerateBill===1,onChange:c=>d({isGenerateBill:c.checked?1:0})}),e.jsx("label",{htmlFor:"ledger-generate-bill-flag",className:"font-medium",children:"Generate Bill"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-print-bill-flag",checked:t.isPrintBill===1,onChange:c=>d({isPrintBill:c.checked?1:0})}),e.jsx("label",{htmlFor:"ledger-print-bill-flag",className:"font-medium",children:"Print Bill"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-tax-applicable-flag",checked:t.isTaxApplicable===1,onChange:c=>d({isTaxApplicable:c.checked?1:0})}),e.jsx("label",{htmlFor:"ledger-tax-applicable-flag",className:"font-medium",children:"Tax Applicable"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-stop-gst-flag",checked:t.isStopGst===1,onChange:c=>d({isStopGst:c.checked?1:0,gstStopDate:c.checked?t.gstStopDate:""})}),e.jsx("label",{htmlFor:"ledger-stop-gst-flag",className:"font-medium",children:"Stop GST"})]}),e.jsxs("span",{className:"flex align-items-center gap-2",children:[e.jsx(z,{inputId:"ledger-tcs-applicable-flag",checked:t.isTcsApplicable===1,onChange:c=>d({isTcsApplicable:c.checked?1:0})}),e.jsx("label",{htmlFor:"ledger-tcs-applicable-flag",className:"font-medium",children:"TCS Applicable"})]})]})]}),Ge=3,Vs=/^[0-9]{10,13}$/,qs=w`
  query LedgerSummaries($search: String, $limit: Int, $offset: Int, $sortField: String, $sortOrder: Int) {
    ledgerSummaries(search: $search, limit: $limit, offset: $offset, sortField: $sortField, sortOrder: $sortOrder) {
      total
      items {
        ledgerId
        name
        ledgerGroupId
        areaId
        shipAddressLine1
        shipAddressLine2
        shipAddressLine3
        shipCityId
        shipPostalCode
        shipOfficePhone
        shipResidencePhone
        shipMobileNumber
        creditLimitNoOfDays
        creditLimitNoOfBills
        taxCalculation
        taxNature
        taxCapitalGoods
        taxRoundOffSales
        taxRoundOffPurchase
        taxFPurchaseLedgerId
        taxFSalesLedgerId
        taxFSalesLedger2Id
        taxAccountsUpdate
        isGenerateBill
        typeOfParty
        isPrintBill
        isTaxApplicable
        isStopGst
        gstStopDate
        intRate
        isTcsApplicable
        alias
        groupName
        addressLine1
        addressLine2
        addressLine3
        address
        cityId
        cityName
        districtId
        districtName
        stateId
        stateName
        countryId
        countryName
        postalCode
        mobileNumber
        officePhone
        residencePhone
        email
        website
        panNumber
        tinNumber
        tinNumber2
        tinNumber3
        tinNumberFrom2
        tinNumberFrom3
        contactPersonsJson
        ledgerSalesTaxesJson
        gstNumber
        taxRate
        taxTypeCode
        isReverseChargeApplicableFlag
        isExportFlag
        openingBalanceAmount
        balanceType
        isActiveFlag
        extraFields
      }
    }
  }
`,zs=w`
  query GeoCountries($search: String, $limit: Int) {
    geoCountries(search: $search, limit: $limit) {
      countryId
      name
      iso2
    }
  }
`,Hs=w`
  query GeoStates($countryId: Int, $search: String, $limit: Int) {
    geoStates(countryId: $countryId, search: $search, limit: $limit) {
      stateId
      countryId
      name
      stateCode
    }
  }
`,Ks=w`
  query GeoDistricts($stateId: Int, $search: String, $limit: Int) {
    geoDistricts(stateId: $stateId, search: $search, limit: $limit) {
      districtId
      stateId
      countryId
      name
    }
  }
`,Ws=w`
  query GeoCities($districtId: Int, $stateId: Int, $search: String, $limit: Int) {
    geoCities(districtId: $districtId, stateId: $stateId, search: $search, limit: $limit) {
      cityId
      districtId
      stateId
      countryId
      name
    }
  }
`,Zs=w`
  query LedgerOptions($search: String, $limit: Int) {
    ledgerOptions(search: $search, limit: $limit) {
      ledgerId
      name
    }
  }
`,Qs=w`
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
`,Xs=w`
  mutation CreateLedger(
    $name: String!
    $ledgerGroupId: Int!
    $areaId: Int
    $shipAddressLine1: String
    $shipAddressLine2: String
    $shipAddressLine3: String
    $shipCityId: Int
    $shipPostalCode: String
    $shipOfficePhone: String
    $shipResidencePhone: String
    $shipMobileNumber: String
    $creditLimitNoOfDays: Int
    $creditLimitNoOfBills: Int
    $taxCalculation: Int
    $taxNature: Int
    $taxCapitalGoods: Int
    $taxRoundOffSales: Int
    $taxRoundOffPurchase: Int
    $taxFPurchaseLedgerId: Int
    $taxFSalesLedgerId: Int
    $taxFSalesLedger2Id: Int
    $taxAccountsUpdate: Int
    $isGenerateBill: Int
    $typeOfParty: String
    $isPrintBill: Int
    $isTaxApplicable: Int
    $isStopGst: Int
    $gstStopDate: String
    $intRate: Float
    $isTcsApplicable: Int
    $alias: String
    $addressLine1: String
    $addressLine2: String
    $addressLine3: String
    $cityId: Int
    $districtId: Int
    $stateId: Int
    $countryId: Int
    $postalCode: String
    $mobileNumber: String
    $officePhone: String
    $residencePhone: String
    $email: String
    $website: String
    $panNumber: String
    $tinNumber: String
    $tinNumber2: String
    $tinNumber3: String
    $tinNumberFrom2: String
    $tinNumberFrom3: String
    $contactPersonsJson: String
    $ledgerSalesTaxesJson: String
    $taxRate: Float
    $taxTypeCode: Int
    $gstNumber: String
    $isReverseChargeApplicableFlag: Int
    $isExportFlag: Int
    $openingBalanceAmount: Float
    $balanceType: Int
    $isActiveFlag: Int
    $extraFields: String
  ) {
    createLedger(
      name: $name
      ledgerGroupId: $ledgerGroupId
      areaId: $areaId
      shipAddressLine1: $shipAddressLine1
      shipAddressLine2: $shipAddressLine2
      shipAddressLine3: $shipAddressLine3
      shipCityId: $shipCityId
      shipPostalCode: $shipPostalCode
      shipOfficePhone: $shipOfficePhone
      shipResidencePhone: $shipResidencePhone
      shipMobileNumber: $shipMobileNumber
      creditLimitNoOfDays: $creditLimitNoOfDays
      creditLimitNoOfBills: $creditLimitNoOfBills
      taxCalculation: $taxCalculation
      taxNature: $taxNature
      taxCapitalGoods: $taxCapitalGoods
      taxRoundOffSales: $taxRoundOffSales
      taxRoundOffPurchase: $taxRoundOffPurchase
      taxFPurchaseLedgerId: $taxFPurchaseLedgerId
      taxFSalesLedgerId: $taxFSalesLedgerId
      taxFSalesLedger2Id: $taxFSalesLedger2Id
      taxAccountsUpdate: $taxAccountsUpdate
      isGenerateBill: $isGenerateBill
      typeOfParty: $typeOfParty
      isPrintBill: $isPrintBill
      isTaxApplicable: $isTaxApplicable
      isStopGst: $isStopGst
      gstStopDate: $gstStopDate
      intRate: $intRate
      isTcsApplicable: $isTcsApplicable
      alias: $alias
      addressLine1: $addressLine1
      addressLine2: $addressLine2
      addressLine3: $addressLine3
      cityId: $cityId
      districtId: $districtId
      stateId: $stateId
      countryId: $countryId
      postalCode: $postalCode
      mobileNumber: $mobileNumber
      officePhone: $officePhone
      residencePhone: $residencePhone
      email: $email
      website: $website
      panNumber: $panNumber
      tinNumber: $tinNumber
      tinNumber2: $tinNumber2
      tinNumber3: $tinNumber3
      tinNumberFrom2: $tinNumberFrom2
      tinNumberFrom3: $tinNumberFrom3
      contactPersonsJson: $contactPersonsJson
      ledgerSalesTaxesJson: $ledgerSalesTaxesJson
      taxRate: $taxRate
      taxTypeCode: $taxTypeCode
      gstNumber: $gstNumber
      isReverseChargeApplicableFlag: $isReverseChargeApplicableFlag
      isExportFlag: $isExportFlag
      openingBalanceAmount: $openingBalanceAmount
      balanceType: $balanceType
      isActiveFlag: $isActiveFlag
      extraFields: $extraFields
    ) {
      ledgerId
      name
      areaId
      shipAddressLine1
      shipAddressLine2
      shipAddressLine3
      shipCityId
      shipPostalCode
      shipOfficePhone
      shipResidencePhone
      shipMobileNumber
      creditLimitNoOfDays
      creditLimitNoOfBills
      taxCalculation
      taxNature
      taxCapitalGoods
      taxRoundOffSales
      taxRoundOffPurchase
      taxFPurchaseLedgerId
      taxFSalesLedgerId
      taxFSalesLedger2Id
      taxAccountsUpdate
      isGenerateBill
      typeOfParty
      isPrintBill
      isTaxApplicable
      isStopGst
      gstStopDate
      intRate
      isTcsApplicable
      groupName
      address
      cityName
      districtName
      stateName
      countryName
      postalCode
      mobileNumber
      officePhone
      residencePhone
      email
      website
      panNumber
      tinNumber
      tinNumber2
      tinNumber3
      tinNumberFrom2
      tinNumberFrom3
      contactPersonsJson
      ledgerSalesTaxesJson
      gstNumber
      taxRate
      taxTypeCode
      isReverseChargeApplicableFlag
      isExportFlag
      openingBalanceAmount
      balanceType
      isActiveFlag
      extraFields
    }
  }
`,el=w`
  mutation UpdateLedger(
    $ledgerId: Int!
    $name: String
    $ledgerGroupId: Int
    $areaId: Int
    $shipAddressLine1: String
    $shipAddressLine2: String
    $shipAddressLine3: String
    $shipCityId: Int
    $shipPostalCode: String
    $shipOfficePhone: String
    $shipResidencePhone: String
    $shipMobileNumber: String
    $creditLimitNoOfDays: Int
    $creditLimitNoOfBills: Int
    $taxCalculation: Int
    $taxNature: Int
    $taxCapitalGoods: Int
    $taxRoundOffSales: Int
    $taxRoundOffPurchase: Int
    $taxFPurchaseLedgerId: Int
    $taxFSalesLedgerId: Int
    $taxFSalesLedger2Id: Int
    $taxAccountsUpdate: Int
    $isGenerateBill: Int
    $typeOfParty: String
    $isPrintBill: Int
    $isTaxApplicable: Int
    $isStopGst: Int
    $gstStopDate: String
    $intRate: Float
    $isTcsApplicable: Int
    $alias: String
    $addressLine1: String
    $addressLine2: String
    $addressLine3: String
    $cityId: Int
    $districtId: Int
    $stateId: Int
    $countryId: Int
    $postalCode: String
    $mobileNumber: String
    $officePhone: String
    $residencePhone: String
    $email: String
    $website: String
    $panNumber: String
    $tinNumber: String
    $tinNumber2: String
    $tinNumber3: String
    $tinNumberFrom2: String
    $tinNumberFrom3: String
    $contactPersonsJson: String
    $ledgerSalesTaxesJson: String
    $taxRate: Float
    $taxTypeCode: Int
    $gstNumber: String
    $isReverseChargeApplicableFlag: Int
    $isExportFlag: Int
    $openingBalanceAmount: Float
    $balanceType: Int
    $isActiveFlag: Int
    $extraFields: String
  ) {
    updateLedger(
      ledgerId: $ledgerId
      name: $name
      ledgerGroupId: $ledgerGroupId
      areaId: $areaId
      shipAddressLine1: $shipAddressLine1
      shipAddressLine2: $shipAddressLine2
      shipAddressLine3: $shipAddressLine3
      shipCityId: $shipCityId
      shipPostalCode: $shipPostalCode
      shipOfficePhone: $shipOfficePhone
      shipResidencePhone: $shipResidencePhone
      shipMobileNumber: $shipMobileNumber
      creditLimitNoOfDays: $creditLimitNoOfDays
      creditLimitNoOfBills: $creditLimitNoOfBills
      taxCalculation: $taxCalculation
      taxNature: $taxNature
      taxCapitalGoods: $taxCapitalGoods
      taxRoundOffSales: $taxRoundOffSales
      taxRoundOffPurchase: $taxRoundOffPurchase
      taxFPurchaseLedgerId: $taxFPurchaseLedgerId
      taxFSalesLedgerId: $taxFSalesLedgerId
      taxFSalesLedger2Id: $taxFSalesLedger2Id
      taxAccountsUpdate: $taxAccountsUpdate
      isGenerateBill: $isGenerateBill
      typeOfParty: $typeOfParty
      isPrintBill: $isPrintBill
      isTaxApplicable: $isTaxApplicable
      isStopGst: $isStopGst
      gstStopDate: $gstStopDate
      intRate: $intRate
      isTcsApplicable: $isTcsApplicable
      alias: $alias
      addressLine1: $addressLine1
      addressLine2: $addressLine2
      addressLine3: $addressLine3
      cityId: $cityId
      districtId: $districtId
      stateId: $stateId
      countryId: $countryId
      postalCode: $postalCode
      mobileNumber: $mobileNumber
      officePhone: $officePhone
      residencePhone: $residencePhone
      email: $email
      website: $website
      panNumber: $panNumber
      tinNumber: $tinNumber
      tinNumber2: $tinNumber2
      tinNumber3: $tinNumber3
      tinNumberFrom2: $tinNumberFrom2
      tinNumberFrom3: $tinNumberFrom3
      contactPersonsJson: $contactPersonsJson
      ledgerSalesTaxesJson: $ledgerSalesTaxesJson
      taxRate: $taxRate
      taxTypeCode: $taxTypeCode
      gstNumber: $gstNumber
      isReverseChargeApplicableFlag: $isReverseChargeApplicableFlag
      isExportFlag: $isExportFlag
      openingBalanceAmount: $openingBalanceAmount
      balanceType: $balanceType
      isActiveFlag: $isActiveFlag
      extraFields: $extraFields
    ) {
      ledgerId
      name
      ledgerGroupId
      areaId
      shipAddressLine1
      shipAddressLine2
      shipAddressLine3
      shipCityId
      shipPostalCode
      shipOfficePhone
      shipResidencePhone
      shipMobileNumber
      creditLimitNoOfDays
      creditLimitNoOfBills
      taxCalculation
      taxNature
      taxCapitalGoods
      taxRoundOffSales
      taxRoundOffPurchase
      taxFPurchaseLedgerId
      taxFSalesLedgerId
      taxFSalesLedger2Id
      taxAccountsUpdate
      isGenerateBill
      typeOfParty
      isPrintBill
      isTaxApplicable
      isStopGst
      gstStopDate
      intRate
      isTcsApplicable
      addressLine1
      addressLine2
      addressLine3
      groupName
      address
      cityId
      cityName
      districtId
      districtName
      stateId
      stateName
      countryId
      countryName
      postalCode
      mobileNumber
      officePhone
      residencePhone
      email
      website
      panNumber
      tinNumber
      tinNumber2
      tinNumber3
      tinNumberFrom2
      tinNumberFrom3
      contactPersonsJson
      ledgerSalesTaxesJson
      gstNumber
      taxRate
      taxTypeCode
      isReverseChargeApplicableFlag
      isExportFlag
      openingBalanceAmount
      balanceType
      isActiveFlag
      extraFields
    }
  }
`,tl=w`
  mutation DeleteLedger($ledgerId: Int!) {
    deleteLedger(ledgerId: $ledgerId)
  }
`,al=w`
  mutation EnsureLedgerYearBalance($ledgerId: Int!) {
    ensureLedgerYearBalance(ledgerId: $ledgerId)
  }
`,sl=new Set([-1,-2]),ne=t=>{if(!t)return!1;const s=Number(t.ledgerId??0);return s<=0||sl.has(s)},zt=t=>(t==null?void 0:t.isActiveFlag)===1?"Yes":"No",Ht=t=>{if(!t.openingBalanceAmount)return"";const s=Number(t.openingBalanceAmount);if(Number.isNaN(s))return t.openingBalanceAmount;const u=new Intl.NumberFormat("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(s)),y=t.balanceType&&t.balanceType>0?"Dr":"Cr";return`${u} ${y}`},ye=t=>{if(!t)return null;try{return JSON.parse(t)}catch{return null}},pe=t=>t&&typeof t=="object"?t:{},je=()=>`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,xe=t=>({rowId:(t==null?void 0:t.rowId)!=null?String(t.rowId):je(),addressLine1:String((t==null?void 0:t.addressLine1)??""),addressLine2:String((t==null?void 0:t.addressLine2)??""),addressLine3:String((t==null?void 0:t.addressLine3)??""),cityId:(t==null?void 0:t.cityId)!=null?String(t.cityId):"",postalCode:String((t==null?void 0:t.postalCode)??""),officePhone:String((t==null?void 0:t.officePhone)??""),residencePhone:String((t==null?void 0:t.residencePhone)??""),mobileNumber:String((t==null?void 0:t.mobileNumber)??"")}),xt=t=>[t.addressLine1,t.addressLine2,t.addressLine3,t.cityId,t.postalCode,t.officePhone,t.residencePhone,t.mobileNumber].some(s=>s.trim().length>0),ll=t=>Array.isArray(t)?t.map(s=>{const u=s&&typeof s=="object"?s:{};return xe({rowId:u.rowId!=null?String(u.rowId):void 0,addressLine1:String(u.addressLine1??""),addressLine2:String(u.addressLine2??""),addressLine3:String(u.addressLine3??""),cityId:u.cityId!=null&&!Number.isNaN(Number(u.cityId))?String(Number(u.cityId)):"",postalCode:String(u.postalCode??""),officePhone:String(u.officePhone??""),residencePhone:String(u.residencePhone??""),mobileNumber:String(u.mobileNumber??"")})}).filter(xt).slice(0,Ge):[],il=t=>{const s=xe({addressLine1:t.shipAddressLine1??"",addressLine2:t.shipAddressLine2??"",addressLine3:t.shipAddressLine3??"",cityId:t.shipCityId!=null?String(t.shipCityId):"",postalCode:t.shipPostalCode??"",officePhone:t.shipOfficePhone??"",residencePhone:t.shipResidencePhone??"",mobileNumber:t.shipMobileNumber??""});return xt(s)?[s]:[xe()]},Kt=(t,s)=>{const u=ll(s.shipAddresses);return u.length>0?u:t?il(t):[xe()]},nl=t=>t.map(s=>({addressLine1:s.addressLine1.trim(),addressLine2:s.addressLine2.trim(),addressLine3:s.addressLine3.trim(),cityId:s.cityId.trim().length>0&&!Number.isNaN(Number(s.cityId))?Number(s.cityId):null,postalCode:s.postalCode.trim(),officePhone:s.officePhone.trim(),residencePhone:s.residencePhone.trim(),mobileNumber:s.mobileNumber.trim()})).filter(s=>[s.addressLine1,s.addressLine2,s.addressLine3,s.cityId!=null?String(s.cityId):"",s.postalCode,s.officePhone,s.residencePhone,s.mobileNumber].some(u=>u.trim().length>0)).slice(0,Ge),rl=t=>{const s={};return t.forEach(u=>{const y=u.cityId.trim(),g=u.mobileNumber.trim();y&&Number.isNaN(Number(y))&&(s[`shippingAddresses.${u.rowId}.cityId`]="Shipping city must be numeric"),g&&!Vs.test(g)&&(s[`shippingAddresses.${u.rowId}.mobileNumber`]="Enter a valid shipping mobile (10-13 digits)")}),s},dl=()=>({rowId:je(),name:"",designation:"",mobileNumber:"",email:""}),ol=()=>({rowId:je(),taxName:"",gstNumber:"",taxRate:"",effectiveDate:"",isActiveFlag:1}),Wt=t=>{const s=ye(t);return Array.isArray(s)?s.map(u=>{const y=u&&typeof u=="object"?u:{};return{rowId:String(y.rowId??je()),name:String(y.name??""),designation:String(y.designation??""),mobileNumber:String(y.mobileNumber??""),email:String(y.email??"")}}):[]},Zt=t=>{const s=ye(t);return Array.isArray(s)?s.map(u=>{const y=u&&typeof u=="object"?u:{};return{rowId:String(y.rowId??je()),taxName:String(y.taxName??""),gstNumber:String(y.gstNumber??""),taxRate:String(y.taxRate??""),effectiveDate:String(y.effectiveDate??""),isActiveFlag:Number(y.isActiveFlag??1)===1?1:0}}):[]},cl=t=>t.map(s=>({name:s.name.trim(),designation:s.designation.trim(),mobileNumber:s.mobileNumber.trim(),email:s.email.trim()})).filter(s=>s.name||s.designation||s.mobileNumber||s.email),ul=t=>t.map(s=>({taxName:s.taxName.trim(),gstNumber:s.gstNumber.trim(),taxRate:s.taxRate.trim(),effectiveDate:s.effectiveDate.trim(),isActiveFlag:s.isActiveFlag===1?1:0})).filter(s=>s.taxName||s.gstNumber||s.taxRate||s.effectiveDate),Qt=t=>t==null?!0:typeof t=="string"?t.trim().length===0:Array.isArray(t)?t.length===0:!1,Y={pageTitle:"Ledgers",pageSubtitle:"Maintain ledger accounts used across billing and accounts.",searchPlaceholder:"Search by name and press Enter",newButton:"New Ledger",editDialog:"Edit Ledger",newDialog:"New Ledger",form:{name:"Name",group:"Group",mobile:"Mobile",gst:"GST No",openingBalance:"Opening Balance",drcr:"Dr/Cr"},actions:{saved:"Ledger saved successfully",deleted:"Ledger deleted",error:"Error"}},Xt=()=>({name:"",ledgerGroupId:"",areaId:"",shipAddressLine1:"",shipAddressLine2:"",shipAddressLine3:"",shipCityId:"",shipPostalCode:"",shipOfficePhone:"",shipResidencePhone:"",shipMobileNumber:"",creditLimitNoOfDays:"",creditLimitNoOfBills:"",taxCalculation:"",taxNature:"",taxCapitalGoods:"",taxRoundOffSales:"",taxRoundOffPurchase:"",taxFPurchaseLedgerId:"",taxFSalesLedgerId:"",taxFSalesLedger2Id:"",taxAccountsUpdate:"",isGenerateBill:0,typeOfParty:"",isPrintBill:0,isTaxApplicable:0,isStopGst:0,gstStopDate:"",intRate:"",isTcsApplicable:0,alias:"",addressLine1:"",addressLine2:"",addressLine3:"",countryId:"",stateId:"",districtId:"",cityId:"",postalCode:"",mobileNumber:"",officePhone:"",residencePhone:"",email:"",website:"",panNumber:"",tinNumber:"",tinNumber2:"",tinNumber3:"",tinNumberFrom2:"",tinNumberFrom3:"",gstNumber:"",taxRate:"",taxTypeCode:"",openingBalanceAmount:"",balanceType:1,isActiveFlag:1,isReverseChargeApplicableFlag:0,isExportFlag:0,shippingAddresses:[xe()],contactPersons:[],ledgerSalesTaxes:[],extraFields:{}}),ml=Ms({name:h().trim().min(1,"Name is required"),ledgerGroupId:h().trim().min(1,"Group is required"),areaId:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Area must be numeric"),shipAddressLine1:h().optional(),shipAddressLine2:h().optional(),shipAddressLine3:h().optional(),shipCityId:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Shipping city must be numeric"),shipPostalCode:h().optional(),shipOfficePhone:h().optional(),shipResidencePhone:h().optional(),shipMobileNumber:h().optional().refine(t=>!t||/^[0-9]{10,13}$/.test(t),"Enter a valid shipping mobile (10-13 digits)"),creditLimitNoOfDays:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Credit limit days must be numeric"),creditLimitNoOfBills:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Credit limit bills must be numeric"),taxCalculation:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax calculation must be numeric"),taxNature:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax nature must be numeric"),taxCapitalGoods:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax capital goods must be numeric"),taxRoundOffSales:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax round-off sales must be numeric"),taxRoundOffPurchase:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax round-off purchase must be numeric"),taxFPurchaseLedgerId:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax purchase ledger must be numeric"),taxFSalesLedgerId:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax sales ledger must be numeric"),taxFSalesLedger2Id:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax sales ledger 2 must be numeric"),taxAccountsUpdate:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax accounts update must be numeric"),isGenerateBill:K(),typeOfParty:h().optional(),isPrintBill:K(),isTaxApplicable:K(),isStopGst:K(),gstStopDate:h().optional().refine(t=>!t||/^\d{4}-\d{2}-\d{2}$/.test(t),"GST stop date must be YYYY-MM-DD"),intRate:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Interest rate must be numeric"),isTcsApplicable:K(),alias:h().optional(),addressLine1:h().optional(),addressLine2:h().optional(),addressLine3:h().optional(),countryId:h().optional(),stateId:h().optional(),districtId:h().optional(),cityId:h().optional(),postalCode:h().optional(),mobileNumber:h().optional().refine(t=>!t||/^[0-9]{10,13}$/.test(t),"Enter a valid mobile (10-13 digits)"),officePhone:h().optional(),residencePhone:h().optional(),email:h().optional().refine(t=>!t||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t),"Enter a valid email"),website:h().optional(),panNumber:h().optional(),tinNumber:h().optional(),tinNumber2:h().optional(),tinNumber3:h().optional(),tinNumberFrom2:h().optional(),tinNumberFrom3:h().optional(),gstNumber:h().optional().refine(t=>!t||/^[0-9A-Z]{15}$/.test(t),"Enter a valid GSTIN (15 chars, A-Z/0-9)"),taxRate:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax rate must be numeric"),taxTypeCode:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Tax type must be numeric"),openingBalanceAmount:h().optional().refine(t=>!t||!Number.isNaN(Number(t)),"Opening balance must be numeric"),balanceType:K(),isActiveFlag:K(),isReverseChargeApplicableFlag:K(),isExportFlag:K()}).refine(t=>!(!t.cityId&&(t.addressLine1&&t.addressLine1.trim()||t.addressLine2&&t.addressLine2.trim()||t.addressLine3&&t.addressLine3.trim())),{message:"Select a city when address is provided",path:["cityId"]}).refine(t=>!(t.cityId&&!t.districtId),{message:"Select a district for the city",path:["districtId"]}).refine(t=>!(t.districtId&&!t.stateId),{message:"Select a state for the district",path:["stateId"]}).refine(t=>!(t.stateId&&!t.countryId),{message:"Select a country for the state",path:["countryId"]}).refine(t=>!(t.isStopGst===1&&!t.gstStopDate),{message:"GST stop date is required when Stop GST is enabled",path:["gstStopDate"]});function ci(){var Et;const t="ledger-name-input",s="ledger-group-input",u="ledger-alias-input",y="ledger-postal-code-input",g="ledger-address-line-1-input",d="ledger-address-line-2-input",c="ledger-address-line-3-input",C="ledger-country-input",L="ledger-state-input",x="ledger-district-input",P="ledger-city-input",r="ledger-area-input",V="ledger-credit-limit-days-input",I="ledger-credit-limit-bills-input",Z="ledger-office-phone-input",Be="ledger-residence-phone-input",Me="ledger-mobile-input",q="ledger-gst-input",_="ledger-email-input",re="ledger-website-input",de="ledger-pan-input",ke="ledger-tin-input",Ye="ledger-tin-2-input",Je="ledger-tin-3-input",m="ledger-tin-from-2-input",$="ledger-tin-from-3-input",v="ledger-tax-rate-input",Se="ledger-tax-type-code-input",ta="ledger-tax-calculation-input",aa="ledger-tax-nature-input",sa="ledger-tax-capital-goods-input",la="ledger-tax-accounts-update-input",ia="ledger-tax-round-off-sales-input",na="ledger-tax-round-off-purchase-input",ra="ledger-tax-purchase-ledger-input",da="ledger-tax-sales-ledger-input",oa="ledger-tax-sales-ledger-2-input",ca="ledger-party-type-input",ua="ledger-interest-rate-input",ma="ledger-gst-stop-date-input",pa="ledger-opening-balance-input",xa="ledger-balance-type-input",ge="ledger-save-button",ve=ns(),{companyContext:M}=rs(),[Q,ga]=b.useState(10),[gt,he]=b.useState(0),[X,ht]=b.useState(""),[be,ha]=b.useState("name"),[Ne,ba]=b.useState(1),[Na,Le]=b.useState(!1),[F,bt]=b.useState(null),[fa,_e]=b.useState(!1),[o,Ia]=b.useState(null),[ya,ja]=b.useState([]),[$e,oe]=b.useState({}),[Ce,Ue]=b.useState(""),[ee,Nt]=b.useState(!1),[Sa,ft]=b.useState(!1),[It,va]=b.useState(!1),[yt,jt]=b.useState(""),[i,D]=b.useState(()=>Xt()),{data:te,loading:La,error:St,refetch:W}=ie(qs,{variables:{search:"",limit:Q,offset:gt,sortField:"name",sortOrder:1}}),{options:we}=Rs(),{options:fe}=Ds(),{options:Pe}=Cs(),{data:Ve}=ie(zs,{variables:{search:null,limit:2e3}}),{data:qe}=ie(Hs,{variables:{countryId:i.countryId?Number(i.countryId):null,search:null,limit:2e3},skip:!i.countryId}),{data:ze}=ie(Ks,{variables:{stateId:i.stateId?Number(i.stateId):null,search:null,limit:2e3},skip:!i.stateId}),{data:He}=ie(Ws,{variables:{districtId:i.districtId?Number(i.districtId):null,stateId:i.stateId?Number(i.stateId):null,search:null,limit:2e3},skip:!i.districtId&&!i.stateId}),{data:Ae,error:Ke}=ie(Zs,{variables:{limit:2e3},...Gs}),[$a]=Ee(Xs),[Ca]=Ee(el),[Pa]=Ee(tl),[Aa]=Ee(al),E=b.useRef(null),We=b.useRef(new Set),vt=b.useMemo(()=>Os((M==null?void 0:M.fiscalYearStart)??null,(M==null?void 0:M.fiscalYearEnd)??null),[M==null?void 0:M.fiscalYearEnd,M==null?void 0:M.fiscalYearStart]),Lt=b.useRef(null),{permissions:ce}=ps(ve),Ie=a=>{var l;return js(ce,a)?!0:((l=E.current)==null||l.show({severity:"warn",summary:"Permission Denied",detail:Ss(a)}),!1)},U=b.useMemo(()=>{var a;return((a=te==null?void 0:te.ledgerSummaries)==null?void 0:a.items)??[]},[te]),$t=b.useMemo(()=>wt(U,F),[U,F]),Ct=b.useMemo(()=>wt(U,o),[U,o]),Pt=((Et=te==null?void 0:te.ledgerSummaries)==null?void 0:Et.total)??U.length??0,ae=b.useMemo(()=>JSON.stringify(i),[i]),At=b.useMemo(()=>ae!==yt,[ae,yt]),Te=b.useMemo(()=>!!(F&&Ce&&Ce===ae),[ae,Ce,F]),Ze=b.useMemo(()=>ne(F),[F]),Ta=b.useMemo(()=>Ps(!!F,ee,Te),[F,Te,ee]),Qe=b.useMemo(()=>Wt(o==null?void 0:o.contactPersonsJson),[o==null?void 0:o.contactPersonsJson]),Xe=b.useMemo(()=>Zt(o==null?void 0:o.ledgerSalesTaxesJson),[o==null?void 0:o.ledgerSalesTaxesJson]),et=b.useMemo(()=>{if(!o)return[];const a=pe(ye(o.extraFields??null)??{});return Kt(o,a).filter(xt)},[o]),Tt=()=>{Fs({saving:ee,isDirty:At,onDiscard:()=>{Le(!1),oe({})}})};b.useEffect(()=>{const a=setTimeout(()=>{he(0),W({search:X||null,limit:Q,offset:0,sortField:be,sortOrder:Ne})},400);return()=>clearTimeout(a)},[X,Q,be,Ne,W]);const Fa=a=>{a.key==="Enter"&&(he(0),W({search:X||null,limit:Q,offset:0}))},tt=(Ve==null?void 0:Ve.geoCountries)??[],Ft=(qe==null?void 0:qe.geoStates)??[],Rt=(ze==null?void 0:ze.geoDistricts)??[],Dt=(He==null?void 0:He.geoCities)??[],Ra=b.useMemo(()=>{const a=new Map;return fe.forEach(l=>{a.set(l.areaId,l.label)}),a},[fe]),Da=b.useMemo(()=>{const a=new Map;return Pe.forEach(l=>{a.set(l.cityId,l.label)}),a},[Pe]),Oa=b.useMemo(()=>Pe.map(a=>({label:a.label,value:String(a.cityId)})),[Pe]),at=b.useMemo(()=>((Ae==null?void 0:Ae.ledgerOptions)??[]).map(a=>{var l;return{label:((l=a.name)==null?void 0:l.trim())||`Ledger #${a.ledgerId}`,value:String(a.ledgerId)}}),[Ae]),st=b.useMemo(()=>{const a=new Map;return at.forEach(l=>{const n=Number(l.value);Number.isFinite(n)&&a.set(n,l.label)}),a},[at]),Ea=b.useMemo(()=>we.map(a=>{var l;return{label:a.label,value:((l=a.value)==null?void 0:l.toString())??""}}).filter(a=>a.value.length>0),[we]),Ga=b.useMemo(()=>tt.map(a=>{var l;return{label:`${a.name??""}${a.iso2?` (${a.iso2})`:""}`,value:((l=a.countryId)==null?void 0:l.toString())??""}}),[tt]),Ba=b.useMemo(()=>Ft.map(a=>{var l;return{label:`${a.name??""}${a.stateCode?` (${a.stateCode})`:""}`,value:((l=a.stateId)==null?void 0:l.toString())??""}}),[Ft]),Ma=b.useMemo(()=>Rt.map(a=>{var l;return{label:a.name??String(a.districtId),value:((l=a.districtId)==null?void 0:l.toString())??""}}),[Rt]),ka=b.useMemo(()=>Dt.map(a=>{var l;return{label:a.name??String(a.cityId),value:((l=a.cityId)==null?void 0:l.toString())??""}}),[Dt]),Ot=b.useMemo(()=>{const a=i.cityId?Number(i.cityId):null;return a?fe.filter(l=>l.cityId==null||Number(l.cityId)===a):fe},[fe,i.cityId]),Ya=b.useMemo(()=>Ot.map(a=>({label:a.label,value:String(a.areaId)})),[Ot]),lt=tt.find(a=>{var l;return((l=a.countryId)==null?void 0:l.toString())===i.countryId}),Ja=(lt==null?void 0:lt.iso2)??null,{data:Fe}=ie(Qs,{variables:{entity:"ledger",countryCode:Ja,limit:500}}),se=b.useMemo(()=>(Fe==null?void 0:Fe.fieldDefinitions)??[],[Fe]),_a=b.useMemo(()=>{const a=new Map;return se.forEach(l=>{var j,T;const n=((j=l.groupName)==null?void 0:j.trim())||"Additional";a.has(n)||a.set(n,[]),(T=a.get(n))==null||T.push(l)}),Array.from(a.entries()).map(([l,n])=>({groupName:l,definitions:n.sort((j,T)=>(j.orderNo??0)-(T.orderNo??0))}))},[se]);b.useEffect(()=>{se.length&&D(a=>{const l={...pe(a.extraFields)};let n=!1;return se.forEach(j=>{if(l[j.key]!==void 0||!j.defaultValue)return;const T=ye(j.defaultValue);l[j.key]=T,n=!0}),n?{...a,extraFields:l}:a})},[se]);const Re=a=>{D(l=>({...l,...a}))},Ua=()=>{Ue(""),Ie("add")&&(bt(null),D(Xt()),oe({}),Le(!0))},it=a=>{if(!a)return;const l=Number(a);!Number.isFinite(l)||l<=0||We.current.has(l)||(We.current.add(l),Aa({variables:{ledgerId:l}}).catch(()=>{We.current.delete(l)}))},nt=a=>{var j,T;if(Ue(""),!a||!Ie("edit"))return;it(a.ledgerId),bt(a);const l=pe(ye(a.extraFields??null)??{}),n=Kt(a,l);D({name:a.name??"",ledgerGroupId:(a.ledgerGroupId??((j=we.find(G=>(G.name??G.label)===a.groupName))==null?void 0:j.value)??"").toString(),areaId:a.areaId!=null?String(a.areaId):"",shipAddressLine1:a.shipAddressLine1??"",shipAddressLine2:a.shipAddressLine2??"",shipAddressLine3:a.shipAddressLine3??"",shipCityId:a.shipCityId!=null?String(a.shipCityId):"",shipPostalCode:a.shipPostalCode??"",shipOfficePhone:a.shipOfficePhone??"",shipResidencePhone:a.shipResidencePhone??"",shipMobileNumber:a.shipMobileNumber??"",creditLimitNoOfDays:a.creditLimitNoOfDays!=null?String(a.creditLimitNoOfDays):"",creditLimitNoOfBills:a.creditLimitNoOfBills!=null?String(a.creditLimitNoOfBills):"",taxCalculation:a.taxCalculation!=null?String(a.taxCalculation):"",taxNature:a.taxNature!=null?String(a.taxNature):"",taxCapitalGoods:a.taxCapitalGoods!=null?String(a.taxCapitalGoods):"",taxRoundOffSales:a.taxRoundOffSales!=null?String(a.taxRoundOffSales):"",taxRoundOffPurchase:a.taxRoundOffPurchase!=null?String(a.taxRoundOffPurchase):"",taxFPurchaseLedgerId:a.taxFPurchaseLedgerId!=null?String(a.taxFPurchaseLedgerId):"",taxFSalesLedgerId:a.taxFSalesLedgerId!=null?String(a.taxFSalesLedgerId):"",taxFSalesLedger2Id:a.taxFSalesLedger2Id!=null?String(a.taxFSalesLedger2Id):"",taxAccountsUpdate:a.taxAccountsUpdate!=null?String(a.taxAccountsUpdate):"",isGenerateBill:a.isGenerateBill??0,typeOfParty:a.typeOfParty??"",isPrintBill:a.isPrintBill??0,isTaxApplicable:a.isTaxApplicable??0,isStopGst:a.isStopGst??0,gstStopDate:a.gstStopDate??"",intRate:a.intRate!=null?String(a.intRate):"",isTcsApplicable:a.isTcsApplicable??0,alias:a.alias??"",addressLine1:a.addressLine1??"",addressLine2:a.addressLine2??"",addressLine3:a.addressLine3??"",countryId:(a.countryId??"").toString(),stateId:(a.stateId??"").toString(),districtId:(a.districtId??"").toString(),cityId:(a.cityId??"").toString(),postalCode:a.postalCode??"",mobileNumber:a.mobileNumber??"",officePhone:a.officePhone??"",residencePhone:a.residencePhone??"",email:a.email??"",website:a.website??"",panNumber:a.panNumber??"",tinNumber:a.tinNumber??"",tinNumber2:a.tinNumber2??"",tinNumber3:a.tinNumber3??"",tinNumberFrom2:a.tinNumberFrom2??"",tinNumberFrom3:a.tinNumberFrom3??"",gstNumber:a.gstNumber??"",taxRate:a.taxRate??"",taxTypeCode:a.taxTypeCode!=null?String(a.taxTypeCode):"",openingBalanceAmount:a.openingBalanceAmount??"",balanceType:a.balanceType??1,isActiveFlag:a.isActiveFlag??1,isReverseChargeApplicableFlag:a.isReverseChargeApplicableFlag??0,isExportFlag:a.isExportFlag??0,shippingAddresses:n,contactPersons:Wt(a.contactPersonsJson),ledgerSalesTaxes:Zt(a.ledgerSalesTaxesJson),extraFields:l}),oe({}),Le(!0),ne(a)&&((T=E.current)==null||T.show({severity:"info",summary:"Accounting Rule Applied",detail:"This is a protected accounting ledger. Group, opening balance, Dr/Cr, and active state are read-only.",life:6e3}))},rt=a=>{a&&Ie("view")&&(it(a.ledgerId),Ia(a),_e(!0))},wa=a=>{const l=Vt(U,$t,a);l&&nt(l)},Va=a=>{const l=Vt(U,Ct,a);l&&rt(l)},qa=async()=>{var Gt,Bt,Mt,kt;if(!Ie(F?"edit":"add"))return;const a=rl(i.shippingAddresses),l=nl(i.shippingAddresses),n=l[0]??null,j={...i,shipAddressLine1:(n==null?void 0:n.addressLine1)??"",shipAddressLine2:(n==null?void 0:n.addressLine2)??"",shipAddressLine3:(n==null?void 0:n.addressLine3)??"",shipCityId:(n==null?void 0:n.cityId)!=null?String(n.cityId):"",shipPostalCode:(n==null?void 0:n.postalCode)??"",shipOfficePhone:(n==null?void 0:n.officePhone)??"",shipResidencePhone:(n==null?void 0:n.residencePhone)??"",shipMobileNumber:(n==null?void 0:n.mobileNumber)??""},T=ml.safeParse(j);if(!T.success||Object.keys(a).length>0){const A={};T.success||T.error.issues.forEach(ue=>{if(ue.path[0]){const me=ue.path[0];if(me==="shipCityId"||me==="shipMobileNumber")return;A[me]=ue.message}}),Object.assign(A,a),oe(A),(Gt=E.current)==null||Gt.show({severity:"warn",summary:"Please fix validation errors"});return}const G={},H={...pe(i.extraFields)};if(l.length>0?H.shipAddresses=l:delete H.shipAddresses,se.forEach(A=>{A.required&&Qt(H[A.key])&&(G[`extraFields.${A.key}`]=`${A.label} is required`)}),se.forEach(A=>{if(A.fieldType!=="date")return;const ue=H[A.key];if(Qt(ue))return;const me=mt(ue);if(!me){G[`extraFields.${A.key}`]=`${A.label} must be a valid date`;return}const Yt=Es({date:me},vt);Yt.ok||(G[`extraFields.${A.key}`]=Yt.errors.date??`${A.label} must be within the financial year`)}),Object.keys(G).length>0){oe(G),(Bt=E.current)==null||Bt.show({severity:"warn",summary:"Please fill required extra fields"});return}if(oe({}),!!Ns({isEditing:!!F,lastDigest:Ce,currentDigest:ae,setLastDigest:Ue,toastRef:E,entityLabel:"record"})){Nt(!0);try{const A={name:i.name,ledgerGroupId:Number(i.ledgerGroupId),areaId:i.areaId?Number(i.areaId):null,shipAddressLine1:(n==null?void 0:n.addressLine1)||null,shipAddressLine2:(n==null?void 0:n.addressLine2)||null,shipAddressLine3:(n==null?void 0:n.addressLine3)||null,shipCityId:(n==null?void 0:n.cityId)??null,shipPostalCode:(n==null?void 0:n.postalCode)||null,shipOfficePhone:(n==null?void 0:n.officePhone)||null,shipResidencePhone:(n==null?void 0:n.residencePhone)||null,shipMobileNumber:(n==null?void 0:n.mobileNumber)||null,creditLimitNoOfDays:i.creditLimitNoOfDays?Number(i.creditLimitNoOfDays):null,creditLimitNoOfBills:i.creditLimitNoOfBills?Number(i.creditLimitNoOfBills):null,taxCalculation:i.taxCalculation?Number(i.taxCalculation):null,taxNature:i.taxNature?Number(i.taxNature):null,taxCapitalGoods:i.taxCapitalGoods?Number(i.taxCapitalGoods):null,taxRoundOffSales:i.taxRoundOffSales?Number(i.taxRoundOffSales):null,taxRoundOffPurchase:i.taxRoundOffPurchase?Number(i.taxRoundOffPurchase):null,taxFPurchaseLedgerId:i.taxFPurchaseLedgerId?Number(i.taxFPurchaseLedgerId):null,taxFSalesLedgerId:i.taxFSalesLedgerId?Number(i.taxFSalesLedgerId):null,taxFSalesLedger2Id:i.taxFSalesLedger2Id?Number(i.taxFSalesLedger2Id):null,taxAccountsUpdate:i.taxAccountsUpdate?Number(i.taxAccountsUpdate):null,isGenerateBill:i.isGenerateBill??0,typeOfParty:i.typeOfParty||null,isPrintBill:i.isPrintBill??0,isTaxApplicable:i.isTaxApplicable??0,isStopGst:i.isStopGst??0,gstStopDate:i.gstStopDate||null,intRate:i.intRate?Number(i.intRate):null,isTcsApplicable:i.isTcsApplicable??0,alias:i.alias||null,addressLine1:i.addressLine1||null,addressLine2:i.addressLine2||null,addressLine3:i.addressLine3||null,countryId:i.countryId?Number(i.countryId):null,stateId:i.stateId?Number(i.stateId):null,districtId:i.districtId?Number(i.districtId):null,cityId:i.cityId?Number(i.cityId):null,postalCode:i.postalCode||null,mobileNumber:i.mobileNumber||null,officePhone:i.officePhone||null,residencePhone:i.residencePhone||null,email:i.email||null,website:i.website||null,panNumber:i.panNumber||null,tinNumber:i.tinNumber||null,tinNumber2:i.tinNumber2||null,tinNumber3:i.tinNumber3||null,tinNumberFrom2:i.tinNumberFrom2||null,tinNumberFrom3:i.tinNumberFrom3||null,contactPersonsJson:JSON.stringify(cl(i.contactPersons)),ledgerSalesTaxesJson:JSON.stringify(ul(i.ledgerSalesTaxes)),gstNumber:i.gstNumber||null,taxRate:i.taxRate?Number(i.taxRate):null,taxTypeCode:i.taxTypeCode?Number(i.taxTypeCode):null,isReverseChargeApplicableFlag:i.isReverseChargeApplicableFlag??0,isExportFlag:i.isExportFlag??0,openingBalanceAmount:i.openingBalanceAmount?Number(i.openingBalanceAmount):null,balanceType:i.balanceType??1,isActiveFlag:i.isActiveFlag??1,extraFields:JSON.stringify(H)};F?await Ca({variables:{ledgerId:F.ledgerId,...A}}):await $a({variables:A}),ot(ve),await W(),jt(ae),It||Le(!1),(Mt=E.current)==null||Mt.show({severity:"success",summary:"Saved",detail:"Ledger saved successfully"})}catch(A){(kt=E.current)==null||kt.show({severity:"error",summary:"Error",detail:A.message})}finally{Nt(!1)}}},za=async a=>{var l,n;if(a)try{await Pa({variables:{ledgerId:a.ledgerId}}),ot(ve),await W(),(l=E.current)==null||l.show({severity:"success",summary:"Deleted",detail:"Ledger deleted"})}catch(j){const T=typeof(j==null?void 0:j.message)=="string"?j.message:"",G=/protected accounting ledger|referenced in \d+ record/i.test(T)?T:vs(j,"ledger");(n=E.current)==null||n.show({severity:"error",summary:"Error",detail:G})}},Ha=async(a,l)=>{var j,T,G;if(!Ie("delete"))return;if(ne(l)){(j=E.current)==null||j.show({severity:"warn",summary:"Cannot Delete",detail:"Protected accounting ledgers cannot be deleted.",life:7e3});return}const n=await fs("LEDGER",l.ledgerId);if(!n.canDelete){(T=E.current)==null||T.show({severity:"warn",summary:"Cannot Delete",detail:Is("ledger",n),life:7e3});return}(G=E.current)==null||G.show({severity:"info",summary:"Dry Delete Check Passed",detail:"No references found. Confirm delete to execute the actual delete.",life:4500}),us({target:a.currentTarget,message:`Dry Delete Check passed. ${ys("ledger")}`,icon:"pi pi-exclamation-triangle",acceptClassName:"p-button-danger",acceptLabel:"Yes",rejectLabel:"No",defaultFocus:"reject",dismissable:!0,onShow:()=>{setTimeout(()=>{const H=document.querySelector(".p-confirm-popup .p-confirm-popup-reject");H==null||H.focus()},0)},accept:()=>za(l)})},Ka=()=>{D(a=>a.shippingAddresses.length>=Ge?a:{...a,shippingAddresses:[...a.shippingAddresses,xe()]})},Wa=(a,l)=>{D(n=>({...n,shippingAddresses:n.shippingAddresses.map(j=>j.rowId===a?{...j,...l}:j)}))},Za=a=>{D(l=>l.shippingAddresses.length<=1?l:{...l,shippingAddresses:l.shippingAddresses.filter(n=>n.rowId!==a)})},Qa=()=>{D(a=>({...a,contactPersons:[...a.contactPersons,dl()]}))},Xa=(a,l)=>{D(n=>({...n,contactPersons:n.contactPersons.map(j=>j.rowId===a?{...j,...l}:j)}))},es=a=>{D(l=>({...l,contactPersons:l.contactPersons.filter(n=>n.rowId!==a)}))},ts=()=>{D(a=>({...a,ledgerSalesTaxes:[...a.ledgerSalesTaxes,ol()]}))},as=(a,l)=>{D(n=>({...n,ledgerSalesTaxes:n.ledgerSalesTaxes.map(j=>j.rowId===a?{...j,...l}:j)}))},ss=a=>{D(l=>({...l,ledgerSalesTaxes:l.ledgerSalesTaxes.filter(n=>n.rowId!==a)}))},ls=pe(i.extraFields),is=(a,l)=>{D(n=>({...n,extraFields:{...pe(n.extraFields),[a]:l}}))};return e.jsxs("div",{className:"card",children:[e.jsx(os,{ref:E}),e.jsx(ds,{}),e.jsx(cs,{}),e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"m-0",children:Y.pageTitle}),e.jsx("p",{className:"mt-2 mb-0 text-600",children:Y.pageSubtitle})]}),e.jsx("div",{className:"flex justify-content-end",children:e.jsx(xs,{...gs("ledgers"),buttonAriaLabel:"Open Ledgers help"})})]}),St&&e.jsxs("p",{className:"text-red-500 mb-3",children:["Error loading ledgers: ",St.message]}),e.jsxs(Ls,{value:U,ref:Lt,className:"ledger-table",paginator:!0,rows:Q,stripedRows:!0,size:"small",loading:La,totalRecords:Pt,lazy:!0,first:gt,dataKey:"ledgerId",onPage:a=>{ga(a.rows),he(a.first),W({search:X||null,limit:a.rows,offset:a.first,sortField:be,sortOrder:Ne})},rowsPerPageOptions:[10,20,50],selection:ya,onSelectionChange:a=>{const l=a.value??[];ja(l),l.forEach(n=>it(n.ledgerId))},sortField:be,sortOrder:Ne,onSort:a=>{const l=a.sortField||"name",n=a.sortOrder??1;ha(l),ba(n),he(0),W({search:X||null,limit:Q,offset:0,sortField:l,sortOrder:n})},onRowDoubleClick:a=>ce.canEdit?nt(a.data):rt(a.data),headerLeft:e.jsxs("span",{className:"p-input-icon-left",style:{position:"relative",minWidth:"320px"},children:[e.jsx("i",{className:"pi pi-search"}),e.jsx(f,{value:X,onChange:a=>ht(a.target.value),onKeyDown:Fa,placeholder:Y.searchPlaceholder,style:{paddingRight:"2.5rem",width:"100%"}}),X&&e.jsx("button",{type:"button",className:"p-link",style:{position:"absolute",right:"0.5rem",top:"50%",transform:"translateY(-50%)"},onClick:()=>{ht(""),he(0),W({search:"",limit:Q,offset:0,sortField:be,sortOrder:Ne})},children:e.jsx("i",{className:"pi pi-times"})})]}),headerRight:e.jsxs(e.Fragment,{children:[e.jsx(B,{label:Y.newButton,icon:"pi pi-plus",className:"app-action-compact",onClick:Ua,disabled:!ce.canAdd}),e.jsx(B,{label:"Export",icon:"pi pi-download",className:"p-button-info",onClick:()=>{var a;return(a=Lt.current)==null?void 0:a.exportCSV()}}),e.jsx(B,{label:"Print",icon:"pi pi-print",className:"p-button-warning",onClick:()=>window.print()}),e.jsxs("div",{className:"text-600 text-sm",children:["Showing ",U.length," of ",Pt," records"]})]}),children:[e.jsx(S,{selectionMode:"multiple",style:{width:"3rem"}}),e.jsx(S,{field:"name",header:"Name",sortable:!0}),e.jsx(S,{header:"Rules",body:a=>ne(a)?e.jsx("span",{className:"text-orange-600 text-sm",children:"Protected"}):"",style:{width:"7rem"}}),e.jsx(S,{field:"groupName",header:"Group",sortable:!0}),e.jsx(S,{field:"address",header:"Address",sortable:!0}),e.jsx(S,{field:"cityName",header:"City",sortable:!0}),e.jsx(S,{field:"stateName",header:"State",sortable:!0}),e.jsx(S,{field:"mobileNumber",header:"Mobile",sortable:!0}),e.jsx(S,{field:"gstNumber",header:"GST No",sortable:!0}),e.jsx(S,{header:"Opening Balance",body:Ht,style:{textAlign:"right"},sortable:!0}),e.jsx(S,{header:"Active",body:zt,style:{width:"6rem"},sortable:!0}),e.jsx(S,{header:"Actions",body:a=>e.jsxs("div",{className:"flex gap-2",children:[e.jsx(B,{icon:"pi pi-eye",rounded:!0,text:!0,className:"p-button-text",onClick:()=>rt(a),disabled:!ce.canView}),e.jsx(B,{icon:"pi pi-pencil",rounded:!0,text:!0,className:"p-button-primary p-button-text",onClick:()=>nt(a),disabled:!ce.canEdit}),e.jsx(B,{icon:"pi pi-trash",rounded:!0,text:!0,className:"p-button-danger p-button-text",onClick:l=>{Ha(l,a)},disabled:!ce.canDelete||ne(a),tooltip:ne(a)?"Protected accounting ledger":void 0,tooltipOptions:{position:"top"}})]}),style:{width:"8rem"}})]}),e.jsx(Ut,{header:F?Y.editDialog:Y.newDialog,visible:Na,style:{width:"72rem",maxWidth:"96vw"},modal:!0,onShow:()=>{jt(ae),As(t)},onHide:Tt,children:e.jsxs("div",{className:"flex flex-column gap-3",children:[F&&e.jsx("div",{className:`p-2 border-round text-sm ${Te?"surface-100 text-green-700":"surface-100 text-700"}`,children:Te?"Dry check passed. Click Apply Changes to save.":"Dry save flow: first click runs dry check, second click saves changes."}),F&&Ze&&e.jsx("small",{className:"text-600",children:"Accounting rule: Group, Opening Balance, Dr/Cr, and Active fields are locked for protected ledgers."}),e.jsxs(ms,{className:"ledger-master-form-tabs",children:[e.jsx(De,{header:"General",children:e.jsx(_s,{form:i,formErrors:$e,isEditingProtectedLedger:!!F&&Ze,ledgerGroupOptions:Ea,countryOptions:Ga,stateOptions:Ba,districtOptions:Ma,cityOptions:ka,areaOptions:Ya,fieldIds:{ledgerName:t,ledgerGroup:s,ledgerAlias:u,ledgerPostalCode:y,ledgerAddress1:g,ledgerAddress2:d,ledgerAddress3:c,ledgerCountry:C,ledgerState:L,ledgerDistrict:x,ledgerCity:P,ledgerArea:r,ledgerSave:ge},labels:{name:Y.form.name,group:Y.form.group},onFormChange:Re,onOpenGeoImport:()=>ft(!0)})}),e.jsx(De,{header:"Shipping & IDs",children:e.jsx(Us,{form:i,formErrors:$e,maxShippingAddresses:Ge,shippingCityOptions:Oa,labels:{mobile:Y.form.mobile,gst:Y.form.gst},fieldIds:{creditLimitDays:V,creditLimitBills:I,officePhone:Z,residencePhone:Be,mobile:Me,gst:q,email:_,website:re,pan:de,tin:ke,tin2:Ye,tin3:Je,tinFrom2:m,tinFrom3:$,save:ge},onFormChange:Re,onAddShippingAddress:Ka,onUpdateShippingAddress:Wa,onRemoveShippingAddress:Za})}),e.jsx(De,{header:"Tax & Controls",children:e.jsx(ws,{form:i,formErrors:$e,ledgerOptions:at,ledgerOptionsErrorMessage:(Ke==null?void 0:Ke.message)??null,fieldIds:{taxRate:v,taxTypeCode:Se,taxCalculation:ta,taxNature:aa,taxCapitalGoods:sa,taxAccountsUpdate:la,taxRoundOffSales:ia,taxRoundOffPurchase:na,taxPurchaseLedger:ra,taxSalesLedger:da,taxSalesLedger2:oa,partyType:ca,interestRate:ua,gstStopDate:ma,save:ge},onFormChange:Re})}),e.jsx(De,{header:"Contacts & Extras",children:e.jsx(Js,{form:i,formErrors:$e,fiscalRange:vt,groupedFieldDefinitions:_a,labels:{openingBalance:Y.form.openingBalance,drcr:Y.form.drcr},fieldIds:{openingBalance:pa,balanceType:xa,save:ge},isEditingProtectedLedger:Ze,isEditing:!!F,extraValues:ls,onFormChange:Re,onAddContactPerson:Qa,onUpdateContactPerson:Xa,onRemoveContactPerson:es,onAddLedgerSalesTax:ts,onUpdateLedgerSalesTax:as,onRemoveLedgerSalesTax:ss,onUpdateExtraField:is})})]}),e.jsx(hs,{index:$t,total:U.length,onNavigate:wa,navigateDisabled:ee,bulkMode:{checked:It,onChange:va,onLabel:"Bulk",offLabel:"Standard",disabled:ee},onCancel:Tt,cancelDisabled:ee,onSave:qa,saveDisabled:ee||!At,saveLabel:Ta,saveButtonId:ge})]})}),e.jsx($s,{visible:Sa,onHide:()=>ft(!1),onApply:a=>{ot(ve),D(l=>({...l,countryId:a.countryId?String(a.countryId):l.countryId,stateId:a.stateId?String(a.stateId):"",districtId:a.districtId?String(a.districtId):"",cityId:a.cityId?String(a.cityId):"",areaId:""}))},title:"Import location from master"}),e.jsx(Ut,{header:"Ledger Details",visible:fa,style:{width:Ts.wide},modal:!0,onHide:()=>_e(!1),footer:e.jsx(bs,{index:Ct,total:U.length,onNavigate:Va,onClose:()=>_e(!1)}),children:o&&e.jsxs("div",{className:"flex flex-column gap-3",children:[e.jsx(le,{title:"Basic Info",children:e.jsxs(Oe,{columns:2,children:[e.jsx(N,{label:"Name",value:o.name??"-"}),e.jsx(N,{label:"Alias",value:o.alias||"-"}),e.jsx(N,{label:"Protected Accounting Ledger",value:ne(o)?"Yes":"No"}),e.jsx(N,{label:"Group",value:o.groupName??"-"}),e.jsx(N,{label:"Type Of Party",value:o.typeOfParty||"-"}),e.jsx(N,{label:"Opening Balance",value:Ht(o)||"-"}),e.jsx(N,{label:"Active",value:zt(o)||"-"})]})}),e.jsx(le,{title:"Address & Contact",children:e.jsxs(Oe,{columns:2,children:[e.jsx(N,{label:"Address",value:[o.addressLine1,o.addressLine2,o.addressLine3].filter(Boolean).join(", ")||o.address||"-"}),e.jsx(N,{label:"Area",value:o.areaId?Ra.get(o.areaId)??`#${o.areaId}`:"-"}),e.jsx(N,{label:"City",value:o.cityName||"-"}),e.jsx(N,{label:"District",value:o.districtName||"-"}),e.jsx(N,{label:"State",value:o.stateName||"-"}),e.jsx(N,{label:"Country",value:o.countryName||"-"}),e.jsx(N,{label:"Postal Code",value:o.postalCode||"-"}),e.jsx(N,{label:"Mobile",value:o.mobileNumber||"-"}),e.jsx(N,{label:"Office Phone",value:o.officePhone||"-"}),e.jsx(N,{label:"Residence Phone",value:o.residencePhone||"-"}),e.jsx(N,{label:"Email",value:o.email||"-"}),e.jsx(N,{label:"Website",value:o.website||"-"})]})}),e.jsx(le,{title:"Tax IDs",children:e.jsxs(Oe,{columns:2,children:[e.jsx(N,{label:"PAN No",value:o.panNumber||"-"}),e.jsx(N,{label:"GST No",value:o.gstNumber||"-"}),e.jsx(N,{label:"TIN No",value:o.tinNumber||"-"}),e.jsx(N,{label:"TIN No 2",value:o.tinNumber2||"-"}),e.jsx(N,{label:"TIN No 3",value:o.tinNumber3||"-"}),e.jsx(N,{label:"TIN No From 2",value:o.tinNumberFrom2||"-"}),e.jsx(N,{label:"TIN No From 3",value:o.tinNumberFrom3||"-"})]})}),e.jsx(le,{title:"Tax & Controls",children:e.jsxs(Oe,{columns:2,children:[e.jsx(N,{label:"Credit Limit (Days)",value:o.creditLimitNoOfDays??"-"}),e.jsx(N,{label:"Credit Limit (Bills)",value:o.creditLimitNoOfBills??"-"}),e.jsx(N,{label:"Tax Rate",value:o.taxRate||"-"}),e.jsx(N,{label:"Tax Type Code",value:o.taxTypeCode??"-"}),e.jsx(N,{label:"Tax Calculation",value:o.taxCalculation??"-"}),e.jsx(N,{label:"Tax Nature",value:o.taxNature??"-"}),e.jsx(N,{label:"Tax Capital Goods",value:o.taxCapitalGoods??"-"}),e.jsx(N,{label:"Tax Round Off (Sales)",value:o.taxRoundOffSales??"-"}),e.jsx(N,{label:"Tax Round Off (Purchase)",value:o.taxRoundOffPurchase??"-"}),e.jsx(N,{label:"Tax Purchase Ledger",value:o.taxFPurchaseLedgerId!=null?st.get(Number(o.taxFPurchaseLedgerId))??`#${o.taxFPurchaseLedgerId}`:"-"}),e.jsx(N,{label:"Tax Sales Ledger",value:o.taxFSalesLedgerId!=null?st.get(Number(o.taxFSalesLedgerId))??`#${o.taxFSalesLedgerId}`:"-"}),e.jsx(N,{label:"Tax Sales Ledger 2",value:o.taxFSalesLedger2Id!=null?st.get(Number(o.taxFSalesLedger2Id))??`#${o.taxFSalesLedger2Id}`:"-"}),e.jsx(N,{label:"Tax Accounts Update",value:o.taxAccountsUpdate??"-"}),e.jsx(N,{label:"Generate Bill",value:o.isGenerateBill===1?"Yes":"No"}),e.jsx(N,{label:"Print Bill",value:o.isPrintBill===1?"Yes":"No"}),e.jsx(N,{label:"Tax Applicable",value:o.isTaxApplicable===1?"Yes":"No"}),e.jsx(N,{label:"Stop GST",value:o.isStopGst===1?"Yes":"No"}),e.jsx(N,{label:"GST Stop Date",value:o.gstStopDate||"-"}),e.jsx(N,{label:"Interest Rate",value:o.intRate??"-"}),e.jsx(N,{label:"TCS Applicable",value:o.isTcsApplicable===1?"Yes":"No"}),e.jsx(N,{label:"Reverse Charge Applicable",value:o.isReverseChargeApplicableFlag===1?"Yes":"No"}),e.jsx(N,{label:"Export Ledger",value:o.isExportFlag===1?"Yes":"No"})]})}),e.jsx(le,{title:"Shipping Addresses",description:`${et.length} ${et.length===1?"address":"addresses"}`,children:e.jsx("div",{className:"border-1 surface-border border-round overflow-hidden",children:e.jsxs(dt,{value:et,dataKey:"rowId",responsiveLayout:"scroll",size:"small",className:"p-datatable-sm",emptyMessage:"No shipping addresses added.",scrollable:!0,scrollHeight:"12rem",children:[e.jsx(S,{header:"#",body:(a,l)=>l.rowIndex+1,style:{width:"4rem"}}),e.jsx(S,{header:"Address",body:a=>[a.addressLine1,a.addressLine2,a.addressLine3].filter(Boolean).join(", ")||"-"}),e.jsx(S,{header:"City",body:a=>a.cityId?Da.get(Number(a.cityId))??`#${a.cityId}`:"-"}),e.jsx(S,{header:"Postal Code",body:a=>a.postalCode||"-"}),e.jsx(S,{header:"Office",body:a=>a.officePhone||"-"}),e.jsx(S,{header:"Residence",body:a=>a.residencePhone||"-"}),e.jsx(S,{header:"Mobile",body:a=>a.mobileNumber||"-"})]})})}),e.jsx(le,{title:"Contact Persons",description:`${Qe.length} ${Qe.length===1?"contact":"contacts"}`,children:e.jsx("div",{className:"border-1 surface-border border-round overflow-hidden",children:e.jsxs(dt,{value:Qe,dataKey:"rowId",responsiveLayout:"scroll",size:"small",className:"p-datatable-sm",emptyMessage:"No contact persons added.",scrollable:!0,scrollHeight:"12rem",children:[e.jsx(S,{header:"#",body:(a,l)=>l.rowIndex+1,style:{width:"4rem"}}),e.jsx(S,{header:"Name",body:a=>a.name||"-"}),e.jsx(S,{header:"Designation",body:a=>a.designation||"-"}),e.jsx(S,{header:"Mobile",body:a=>a.mobileNumber||"-"}),e.jsx(S,{header:"Email",body:a=>a.email||"-"})]})})}),e.jsx(le,{title:"Ledger Sales Taxes",description:`${Xe.length} ${Xe.length===1?"tax row":"tax rows"}`,children:e.jsx("div",{className:"border-1 surface-border border-round overflow-hidden",children:e.jsxs(dt,{value:Xe,dataKey:"rowId",responsiveLayout:"scroll",size:"small",className:"p-datatable-sm",emptyMessage:"No ledger sales taxes added.",scrollable:!0,scrollHeight:"12rem",children:[e.jsx(S,{header:"#",body:(a,l)=>l.rowIndex+1,style:{width:"4rem"}}),e.jsx(S,{header:"Tax Name",body:a=>a.taxName||"-"}),e.jsx(S,{header:"GST No",body:a=>a.gstNumber||"-"}),e.jsx(S,{header:"Tax Rate",body:a=>a.taxRate||"-"}),e.jsx(S,{header:"Effective Date",body:a=>a.effectiveDate||"-"}),e.jsx(S,{header:"Status",body:a=>a.isActiveFlag===1?"Active":"Inactive"})]})})})]})})]})}export{ci as default};
