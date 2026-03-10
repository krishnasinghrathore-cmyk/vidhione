import{j as a,R as he,B as Q,u as Le,r as p,b9 as F}from"./index-a2e62377.js";import{T as we}from"./toast.esm-b4e71f30.js";import{C as Ye}from"./checkbox.esm-afaac66b.js";import{I as Ee}from"./inputnumber.esm-991f482d.js";import{A as Ae,v as Oe}from"./AppDateInput-ceb6f146.js";import{A as X}from"./AppDropdown-800ebb2b.js";import{A as m}from"./AppInput-10952e09.js";import{A as Te}from"./AppMultiSelect-e91c3da8.js";import{G as Fe}from"./GeoImportDialog-35880566.js";import{R as Me}from"./ReportHeader-67858879.js";import{r as De}from"./fiscalRange-d7f67286.js";import{g as D,u as G}from"./useQuery-55f3f513.js";import{o as fe,s as M,n as se,a as Re,Z as Ve}from"./types-eaf96456.js";import{u as pe}from"./useMutation-fc9212b2.js";import"./index.esm-716d0587.js";import"./index.esm-81904cc2.js";import"./index.esm-10fa0e2b.js";import"./TransitionGroup-03c23142.js";import"./index.esm-1ebbc8e4.js";import"./calendar.esm-0d561fb4.js";import"./index.esm-287dfa04.js";import"./index.esm-4880a95e.js";import"./index.esm-b05ab7aa.js";import"./index.esm-e0ea7a14.js";import"./overlayservice.esm-bf9b13ee.js";import"./inputmask.esm-c4d749fd.js";import"./overlaypanel.esm-9aca1fab.js";import"./dropdown.esm-7710effc.js";import"./virtualscroller.esm-c60a9a04.js";import"./multiselect.esm-e8c9a563.js";import"./dialog.esm-6e6fddb6.js";import"./useLazyQuery-83424a52.js";import"./useIsomorphicLayoutEffect-da2e447d.js";const K={name:"",alias:"",addressLine1:"",addressLine2:"",addressLine3:"",cityId:null,districtId:null,stateId:null,countryId:null,postalCode:"",email:"",website:"",officePhone:"",residencePhone:"",mobileNumber:"",faxNumber:"",serviceTaxNumber:"",panNumber:"",cstNumber:"",vatNumber:"",tinNumber:"",financialYearStart:"",financialYearEnd:"",bankName:"",branchName:"",accountNumber:"",ifscCode:"",signImagePath:"",rtgsNumber:"",pfNumber:"",esiNumber:"",extraFields:{},customPairs:[]},N=e=>e??"",h=e=>{const t=e.trim();return t||null},de=e=>{if(!e)return null;try{return JSON.parse(e)}catch{return null}},z=e=>!e||typeof e!="object"||Array.isArray(e)?{}:e,ye=e=>{if(e instanceof Date)return Number.isNaN(e.getTime())?null:e;if(typeof e=="string"){const t=e.trim();if(!t)return null;const r=/^\d{4}-\d{2}-\d{2}$/.test(t)?`${t}T00:00:00`:t,i=new Date(r);return Number.isNaN(i.getTime())?null:i}return null},xe=e=>e==null?!0:typeof e=="string"?e.trim().length===0:Array.isArray(e)?e.length===0:!1,Ie=()=>`kv_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,qe=e=>{if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return String(e);try{return JSON.stringify(e)}catch{return""}},je=e=>{const t=e.trim();if(!t)return null;try{return JSON.parse(t)}catch{return t}},ve=e=>{if(!e)return[];try{const t=JSON.parse(e);return Array.isArray(t)?t.map(r=>{if(typeof r=="string")return{label:r,value:r};if(r&&typeof r=="object"){const i=r,n=i.label??i.value??"",c=i.value??i.label??"";return{label:String(n),value:c}}return{label:String(r),value:r}}):[]}catch{return[]}},$e=e=>new Set(e.map(t=>t.key.trim()).filter(Boolean)),Ge=e=>new Set(e.map(t=>t.key.trim().toLowerCase()).filter(Boolean)),Se=e=>{const t=new Set,r=[];return e.forEach(i=>{const n=i.key.trim().toLowerCase();if(!n){r.push(i);return}t.has(n)||(t.add(n),r.push(i))}),r},le=(e,t)=>{const r=z(de(e.extraFields)),i=$e(t),n={},c=[];return Object.entries(r).forEach(([o,b])=>{if(i.has(o)){n[o]=b;return}c.push({id:Ie(),key:o,value:qe(b)})}),t.forEach(o=>{if(n[o.key]!==void 0||!o.defaultValue)return;const b=de(o.defaultValue);b!==null&&(n[o.key]=b)}),{name:N(e.name),alias:N(e.alias),addressLine1:N(e.addressLine1),addressLine2:N(e.addressLine2),addressLine3:N(e.addressLine3),cityId:e.cityId??null,districtId:e.districtId??null,stateId:e.stateId??null,countryId:e.countryId??null,postalCode:N(e.postalCode),email:N(e.email),website:N(e.website),officePhone:N(e.officePhone),residencePhone:N(e.residencePhone),mobileNumber:N(e.mobileNumber),faxNumber:N(e.faxNumber),serviceTaxNumber:N(e.serviceTaxNumber),panNumber:N(e.panNumber),cstNumber:N(e.cstNumber),vatNumber:N(e.vatNumber),tinNumber:N(e.tinNumber),financialYearStart:N(e.financialYearStart),financialYearEnd:N(e.financialYearEnd),bankName:N(e.bankName),branchName:N(e.branchName),accountNumber:N(e.accountNumber),ifscCode:N(e.ifscCode),signImagePath:N(e.signImagePath),rtgsNumber:N(e.rtgsNumber),pfNumber:N(e.pfNumber),esiNumber:N(e.esiNumber),extraFields:n,customPairs:Se(c)}},B=(e,t)=>{const r=$e(t),i=Ge(t),n={};Object.entries(z(e.extraFields)).forEach(([x,y])=>{r.has(x)&&(n[x]=y)});const c=[];e.customPairs.forEach(x=>{var E;const y=x.key.trim();if(!y){c.push(x);return}const v=y.toLowerCase();if(i.has(v)){const C=(E=t.find(A=>A.key.trim().toLowerCase()===v))==null?void 0:E.key;C&&n[C]===void 0&&x.value.trim()&&(n[C]=je(x.value));return}c.push({...x,key:y})}),t.forEach(x=>{if(n[x.key]!==void 0||!x.defaultValue)return;const y=de(x.defaultValue);y!==null&&(n[x.key]=y)});const o=Se(c),b=JSON.stringify(e.extraFields)!==JSON.stringify(n),I=JSON.stringify(e.customPairs)!==JSON.stringify(o);return!b&&!I?e:{...e,extraFields:n,customPairs:o}},Ke=e=>{const t={...z(e.extraFields)};return e.customPairs.forEach(r=>{const i=r.key.trim();i&&(t[i]=je(r.value))}),JSON.stringify(t)},ge=(e,t)=>{var n,c;if(!e.length)return null;const r=(n=t==null?void 0:t.companyName)==null?void 0:n.trim().toLowerCase(),i=(c=t==null?void 0:t.companyAlias)==null?void 0:c.trim().toLowerCase();if(r||i){const o=e.find(b=>{var y,v;const I=(y=b.name)==null?void 0:y.trim().toLowerCase(),x=(v=b.alias)==null?void 0:v.trim().toLowerCase();return r&&I===r||i&&x===i});if(o)return o}return e[0]??null},Be=e=>{const t=new Map;return e.forEach(r=>{var n,c;const i=((n=r.groupName)==null?void 0:n.trim())||"Additional";t.has(i)||t.set(i,[]),(c=t.get(i))==null||c.push(r)}),Array.from(t.entries()).map(([r,i])=>({groupName:r,definitions:i.sort((n,c)=>(n.orderNo??0)-(c.orderNo??0))}))},ze=(e,t)=>{if(!e)return null;const r=t.find(i=>i.countryId===e);return(r==null?void 0:r.iso2)??null},Y=(e,t)=>a.jsxs("div",{className:"flex align-items-center justify-content-between gap-2",children:[a.jsx("div",{className:"voucher-options-modal__section-title",children:e}),t]}),Je=({form:e,formErrors:t,loading:r,saving:i,error:n,hasCompany:c,countries:o,states:b,districts:I,cities:x,groupedFieldDefinitions:y,fiscalRange:v,geoImportVisible:E,onSetGeoImportVisible:C,onReset:A,onSave:_,onFormChange:d})=>{const L=r||i,J=z(e.extraFields),S=(s,l)=>{d(j=>({...j,extraFields:{...z(j.extraFields),[s]:l}}))},O=(s,l)=>{d(j=>({...j,customPairs:j.customPairs.map(u=>u.id===s?{...u,...l}:u)}))},w=s=>{d(l=>({...l,customPairs:l.customPairs.filter(j=>j.id!==s)}))},g=()=>{d(s=>({...s,customPairs:[...s.customPairs,{id:Ie(),key:"",value:""}]}))},V=s=>{const l=J[s.key],j=`extraFields.${s.key}`,u=t[j];switch(s.fieldType){case"number":{const $=typeof l=="number"?l:typeof l=="string"&&l.trim()?Number(l):null,P=$!=null&&Number.isFinite($)?$:null;return a.jsxs("div",{className:"flex flex-column gap-1",children:[a.jsxs("label",{className:"block text-600 mb-1",children:[s.label,s.required?a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"}):null]}),a.jsx(Ee,{value:P,onValueChange:te=>S(s.key,te.value??null),className:u?"w-full p-invalid":"w-full",useGrouping:!1}),u?a.jsx("small",{className:"p-error",children:u}):null]})}case"boolean":return a.jsxs("div",{className:"flex flex-column gap-2",children:[a.jsxs("label",{className:"block text-600 mb-1",children:[s.label,s.required?a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"}):null]}),a.jsxs("div",{className:"flex align-items-center gap-2",children:[a.jsx(Ye,{inputId:`extra-${s.key}`,checked:!!l,onChange:$=>S(s.key,$.checked)}),a.jsx("label",{htmlFor:`extra-${s.key}`,className:"text-600",children:s.label})]}),u?a.jsx("small",{className:"p-error",children:u}):null]});case"date":{const $=ye(l);return a.jsxs("div",{className:"flex flex-column gap-1",children:[a.jsxs("label",{className:"block text-600 mb-1",children:[s.label,s.required?a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"}):null]}),a.jsx(Ae,{value:$,onChange:P=>S(s.key,P?P.toISOString().slice(0,10):null),placeholder:"DD/MM/YYYY",fiscalYearStart:(v==null?void 0:v.start)??null,fiscalYearEnd:(v==null?void 0:v.end)??null,enforceFiscalRange:!0,className:u?"p-invalid":void 0}),u?a.jsx("small",{className:"p-error",children:u}):null]})}case"select":{const $=ve(s.options);return a.jsxs("div",{className:"flex flex-column gap-1",children:[a.jsxs("label",{className:"block text-600 mb-1",children:[s.label,s.required?a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"}):null]}),a.jsx(X,{value:l??null,options:$,onChange:P=>S(s.key,P.value),placeholder:`Select ${s.label}`,showClear:!0,filter:!0,className:u?"w-full p-invalid":"w-full"}),u?a.jsx("small",{className:"p-error",children:u}):null]})}case"multi-select":{const $=ve(s.options);return a.jsxs("div",{className:"flex flex-column gap-1",children:[a.jsxs("label",{className:"block text-600 mb-1",children:[s.label,s.required?a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"}):null]}),a.jsx(Te,{value:Array.isArray(l)?l:[],options:$,onChange:P=>S(s.key,P.value??[]),placeholder:`Select ${s.label}`,display:"chip",className:u?"w-full p-invalid":"w-full"}),u?a.jsx("small",{className:"p-error",children:u}):null]})}default:return a.jsxs("div",{className:"flex flex-column gap-1",children:[a.jsxs("label",{className:"block text-600 mb-1",children:[s.label,s.required?a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"}):null]}),a.jsx(m,{value:String(l??""),onChange:$=>S(s.key,$.target.value),placeholder:s.label,className:u?"w-full p-invalid":"w-full"}),u?a.jsx("small",{className:"p-error",children:u}):null]})}};return a.jsxs(a.Fragment,{children:[a.jsx(Me,{title:"Company Profile",subtitle:"Legacy-aligned company master profile with dynamic fields and key-value metadata."}),n?a.jsx("p",{className:"text-red-500 mt-2 mb-0",children:n}):null,!c&&!r?a.jsx("p",{className:"mt-2 mb-0 text-600",children:"No company record is configured yet. Fill this form and save to create the primary company profile."}):null,a.jsxs("div",{className:"company-profile-form voucher-options-modal__form flex flex-column mt-3",children:[a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Basic Information"),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsxs("label",{className:"block text-600 mb-1",children:["Company Name",a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"})]}),a.jsx(m,{value:e.name,onChange:s=>d(l=>({...l,name:s.target.value})),className:t.name?"w-full p-invalid":"w-full"}),t.name?a.jsx("small",{className:"p-error",children:t.name}):null]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsxs("label",{className:"block text-600 mb-1",children:["Company Alias",a.jsx("span",{className:"text-red-500 ml-1","aria-hidden":"true",children:"*"})]}),a.jsx(m,{value:e.alias,onChange:s=>d(l=>({...l,alias:s.target.value})),className:t.alias?"w-full p-invalid":"w-full"}),t.alias?a.jsx("small",{className:"p-error",children:t.alias}):null]})]})]}),a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Address & Location",a.jsx(Q,{label:"Import from master",icon:"pi pi-download",className:"p-button-text p-button-sm",onClick:()=>C(!0),disabled:L})),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[a.jsxs("div",{className:"col-12",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Address Line 1"}),a.jsx(m,{value:e.addressLine1,onChange:s=>d(l=>({...l,addressLine1:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Address Line 2"}),a.jsx(m,{value:e.addressLine2,onChange:s=>d(l=>({...l,addressLine2:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Address Line 3"}),a.jsx(m,{value:e.addressLine3,onChange:s=>d(l=>({...l,addressLine3:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Country"}),a.jsx(X,{value:e.countryId,options:o.map(s=>({label:`${s.name??""}${s.iso2?` (${s.iso2})`:""}`,value:s.countryId})),onChange:s=>d(l=>({...l,countryId:s.value??null,stateId:null,districtId:null,cityId:null})),placeholder:"Select country",showClear:!0,filter:!0,className:t.countryId?"w-full p-invalid":"w-full"}),t.countryId?a.jsx("small",{className:"p-error",children:t.countryId}):null]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"State"}),a.jsx(X,{value:e.stateId,options:b.map(s=>({label:`${s.name??""}${s.stateCode?` (${s.stateCode})`:""}`,value:s.stateId})),onChange:s=>d(l=>({...l,stateId:s.value??null,districtId:null,cityId:null})),placeholder:e.countryId?"Select state":"Select country first",showClear:!0,filter:!0,disabled:!e.countryId,className:t.stateId?"w-full p-invalid":"w-full"}),t.stateId?a.jsx("small",{className:"p-error",children:t.stateId}):null]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"District"}),a.jsx(X,{value:e.districtId,options:I.map(s=>({label:s.name??String(s.districtId),value:s.districtId})),onChange:s=>d(l=>({...l,districtId:s.value??null,cityId:null})),placeholder:e.stateId?"Select district":"Select state first",showClear:!0,filter:!0,disabled:!e.stateId,className:t.districtId?"w-full p-invalid":"w-full"}),t.districtId?a.jsx("small",{className:"p-error",children:t.districtId}):null]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"City"}),a.jsx(X,{value:e.cityId,options:x.map(s=>({label:s.name??String(s.cityId),value:s.cityId})),onChange:s=>d(l=>({...l,cityId:s.value??null})),placeholder:e.districtId?"Select city":"Select district first",showClear:!0,filter:!0,disabled:!e.districtId,className:t.cityId?"w-full p-invalid":"w-full"}),t.cityId?a.jsx("small",{className:"p-error",children:t.cityId}):null]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Postal Code"}),a.jsx(m,{value:e.postalCode,onChange:s=>d(l=>({...l,postalCode:s.target.value})),className:"w-full"})]})]})]}),a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Contact"),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Email"}),a.jsx(m,{value:e.email,onChange:s=>d(l=>({...l,email:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Website"}),a.jsx(m,{value:e.website,onChange:s=>d(l=>({...l,website:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Office Phone"}),a.jsx(m,{value:e.officePhone,onChange:s=>d(l=>({...l,officePhone:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Residence Phone"}),a.jsx(m,{value:e.residencePhone,onChange:s=>d(l=>({...l,residencePhone:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Mobile Number"}),a.jsx(m,{value:e.mobileNumber,onChange:s=>d(l=>({...l,mobileNumber:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Fax Number"}),a.jsx(m,{value:e.faxNumber,onChange:s=>d(l=>({...l,faxNumber:s.target.value})),className:"w-full"})]})]})]}),a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Tax & IDs"),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Service Tax Number"}),a.jsx(m,{value:e.serviceTaxNumber,onChange:s=>d(l=>({...l,serviceTaxNumber:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"PAN Number"}),a.jsx(m,{value:e.panNumber,onChange:s=>d(l=>({...l,panNumber:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"CST Number"}),a.jsx(m,{value:e.cstNumber,onChange:s=>d(l=>({...l,cstNumber:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"VAT Number"}),a.jsx(m,{value:e.vatNumber,onChange:s=>d(l=>({...l,vatNumber:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"TIN Number"}),a.jsx(m,{value:e.tinNumber,onChange:s=>d(l=>({...l,tinNumber:s.target.value})),className:"w-full"})]})]})]}),a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Fiscal Year"),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Financial Year Start"}),a.jsx(m,{value:e.financialYearStart,onChange:s=>d(l=>({...l,financialYearStart:s.target.value})),className:"w-full",placeholder:"YYYYMMDD or DD/MM/YYYY"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Financial Year End"}),a.jsx(m,{value:e.financialYearEnd,onChange:s=>d(l=>({...l,financialYearEnd:s.target.value})),className:"w-full",placeholder:"YYYYMMDD or DD/MM/YYYY"})]})]})]}),a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Banking"),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Bank Name"}),a.jsx(m,{value:e.bankName,onChange:s=>d(l=>({...l,bankName:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Branch Name"}),a.jsx(m,{value:e.branchName,onChange:s=>d(l=>({...l,branchName:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Account Number"}),a.jsx(m,{value:e.accountNumber,onChange:s=>d(l=>({...l,accountNumber:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"IFSC Code"}),a.jsx(m,{value:e.ifscCode,onChange:s=>d(l=>({...l,ifscCode:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"RTGS Number"}),a.jsx(m,{value:e.rtgsNumber,onChange:s=>d(l=>({...l,rtgsNumber:s.target.value})),className:"w-full"})]})]})]}),a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Other"),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[a.jsxs("div",{className:"col-12",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Sign Image Path"}),a.jsx(m,{value:e.signImagePath,onChange:s=>d(l=>({...l,signImagePath:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"PF Number"}),a.jsx(m,{value:e.pfNumber,onChange:s=>d(l=>({...l,pfNumber:s.target.value})),className:"w-full"})]}),a.jsxs("div",{className:"col-12 md:col-6",children:[a.jsx("label",{className:"block text-600 mb-1",children:"ESI Number"}),a.jsx(m,{value:e.esiNumber,onChange:s=>d(l=>({...l,esiNumber:s.target.value})),className:"w-full"})]})]})]}),y.length>0?a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Dynamic Fields"),a.jsx("div",{className:"voucher-options-modal__divider"}),a.jsx("div",{className:"grid voucher-options-modal__grid",children:y.map(s=>a.jsxs(he.Fragment,{children:[a.jsx("div",{className:"col-12",children:a.jsx("span",{className:"text-600 text-sm",children:s.groupName})}),s.definitions.map(l=>a.jsx("div",{className:"col-12 md:col-6",children:V(l)},l.id))]},s.groupName))})]}):null,a.jsxs("div",{className:"voucher-options-modal__section",children:[Y("Additional Key-Value Fields",a.jsx(Q,{label:"Add Field",icon:"pi pi-plus",className:"p-button-text p-button-sm",onClick:g,disabled:L})),a.jsx("div",{className:"voucher-options-modal__divider"}),e.customPairs.length===0?a.jsx("p",{className:"m-0 text-600 text-sm",children:"Add custom metadata fields as key/value pairs. These are stored in the extraFields JSON."}):a.jsxs("div",{className:"grid voucher-options-modal__grid",children:[e.customPairs.map(s=>{const l=t[`customPairs.${s.id}.key`],j=t[`customPairs.${s.id}.value`];return a.jsxs(he.Fragment,{children:[a.jsxs("div",{className:"col-12 md:col-4",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Key"}),a.jsx(m,{value:s.key,onChange:u=>O(s.id,{key:u.target.value}),placeholder:"e.g. gstPortalCode",className:l?"w-full p-invalid":"w-full"}),l?a.jsx("small",{className:"p-error",children:l}):null]}),a.jsxs("div",{className:"col-12 md:col-7",children:[a.jsx("label",{className:"block text-600 mb-1",children:"Value"}),a.jsx(m,{value:s.value,onChange:u=>O(s.id,{value:u.target.value}),placeholder:"Value",className:j?"w-full p-invalid":"w-full"}),j?a.jsx("small",{className:"p-error",children:j}):null]}),a.jsx("div",{className:"col-12 md:col-1 flex align-items-end",children:a.jsx(Q,{icon:"pi pi-trash",className:"p-button-text p-button-danger",onClick:()=>w(s.id),disabled:L,"aria-label":"Remove key value field"})})]},s.id)}),t.customPairs?a.jsx("div",{className:"col-12",children:a.jsx("small",{className:"p-error",children:t.customPairs})}):null]})]}),a.jsxs("div",{className:"flex justify-content-end gap-2 mt-2",children:[a.jsx(Q,{label:"Reset",outlined:!0,onClick:A,disabled:i}),a.jsx(Q,{label:i?"Saving...":"Save Changes",icon:i?"pi pi-spin pi-spinner":"pi pi-check",onClick:_,disabled:i})]})]}),a.jsx(Fe,{visible:E,onHide:()=>C(!1),onApply:s=>{d(l=>({...l,countryId:s.countryId??l.countryId,stateId:s.stateId??null,districtId:s.districtId??null,cityId:s.cityId??null})),C(!1)},title:"Import location from master"})]})},oe=`
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
`,Ue=D`
    query CompanyProfileCompanies($search: String, $limit: Int) {
        companies(search: $search, limit: $limit) {
            ${oe}
        }
    }
`,He=D`
    query CompanyProfileGeoCountries($search: String, $limit: Int) {
        geoCountries(search: $search, limit: $limit) {
            countryId
            name
            iso2
        }
    }
`,We=D`
    query CompanyProfileGeoStates($countryId: Int, $search: String, $limit: Int) {
        geoStates(countryId: $countryId, search: $search, limit: $limit) {
            stateId
            countryId
            name
            stateCode
        }
    }
`,Ze=D`
    query CompanyProfileGeoDistricts($stateId: Int, $search: String, $limit: Int) {
        geoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            districtId
            stateId
            countryId
            name
        }
    }
`,Qe=D`
    query CompanyProfileGeoCities($districtId: Int, $stateId: Int, $search: String, $limit: Int) {
        geoCities(districtId: $districtId, stateId: $stateId, search: $search, limit: $limit) {
            cityId
            districtId
            stateId
            countryId
            name
        }
    }
`,Xe=D`
    query CompanyProfileFieldDefinitions($entity: String!, $countryCode: String, $limit: Int) {
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
`,ea=D`
    mutation CompanyProfileCreateCompany(
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
            ${oe}
        }
    }
`,aa=D`
    mutation CompanyProfileUpdateCompany(
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
            ${oe}
        }
    }
`,sa=fe({name:M().trim().min(1,"Company name is required"),alias:M().trim().min(1,"Company alias is required"),countryId:se().nullable().optional(),stateId:se().nullable().optional(),districtId:se().nullable().optional(),cityId:se().nullable().optional(),addressLine1:M().optional(),addressLine2:M().optional(),addressLine3:M().optional()}).refine(e=>!(!e.cityId&&(e.addressLine1&&e.addressLine1.trim()||e.addressLine2&&e.addressLine2.trim()||e.addressLine3&&e.addressLine3.trim())),{message:"Select a city when address is provided",path:["cityId"]}).refine(e=>!(e.cityId&&!e.districtId),{message:"Select a district for the city",path:["districtId"]}).refine(e=>!(e.districtId&&!e.stateId),{message:"Select a state for the district",path:["stateId"]}).refine(e=>!(e.stateId&&!e.countryId),{message:"Select a country for the state",path:["countryId"]}),la=fe({id:M().min(1),key:M().trim().min(1,"Key is required").max(80,"Key is too long"),value:M().max(500,"Value is too long")}),ta=Re(la).superRefine((e,t)=>{const r=new Map;e.forEach((i,n)=>{const c=i.key.trim().toLowerCase();if(!c)return;const o=r.get(c);if(o&&o!==i.id){t.addIssue({code:Ve.custom,message:"Duplicate key",path:[n,"key"]});return}r.set(c,i.id)})}),ra=(e,t)=>{const r={},i=ta.safeParse(e);return i.success||i.error.issues.forEach(n=>{var I;const c=typeof n.path[0]=="number"?Number(n.path[0]):-1,o=String(n.path[1]??"key");if(c<0){r.customPairs=n.message;return}const b=(I=e[c])==null?void 0:I.id;if(!b){r.customPairs=n.message;return}r[`customPairs.${b}.${o}`]=n.message}),e.forEach(n=>{const c=n.key.trim();if(!c)return;const o=c.toLowerCase();t.has(o)&&(r[`customPairs.${n.id}.key`]="This key is already used by a dynamic field definition")}),r},ia=e=>({name:e.name.trim(),alias:e.alias.trim(),addressLine1:h(e.addressLine1),addressLine2:h(e.addressLine2),addressLine3:h(e.addressLine3),cityId:e.cityId,districtId:e.districtId,stateId:e.stateId,countryId:e.countryId,postalCode:h(e.postalCode),email:h(e.email),website:h(e.website),officePhone:h(e.officePhone),residencePhone:h(e.residencePhone),mobileNumber:h(e.mobileNumber),faxNumber:h(e.faxNumber),serviceTaxNumber:h(e.serviceTaxNumber),panNumber:h(e.panNumber),cstNumber:h(e.cstNumber),vatNumber:h(e.vatNumber),tinNumber:h(e.tinNumber),financialYearStart:h(e.financialYearStart),financialYearEnd:h(e.financialYearEnd),bankName:h(e.bankName),branchName:h(e.branchName),accountNumber:h(e.accountNumber),ifscCode:h(e.ifscCode),signImagePath:h(e.signImagePath),rtgsNumber:h(e.rtgsNumber),pfNumber:h(e.pfNumber),esiNumber:h(e.esiNumber),extraFields:Ke(e)}),na=e=>{const t={},r=sa.safeParse(e);return r.success||r.error.issues.forEach(i=>{i.path[0]&&(t[String(i.path[0])]=i.message)}),t},ca=(e,t,r)=>{const i={},n=z(e.extraFields);return t.forEach(c=>{const o=n[c.key];if(c.required&&xe(o)&&(i[`extraFields.${c.key}`]=`${c.label} is required`),c.fieldType!=="date"||xe(o))return;const b=ye(o);if(!b){i[`extraFields.${c.key}`]=`${c.label} must be a valid date`;return}const I=Oe({date:b},r);I.ok||(i[`extraFields.${c.key}`]=I.errors.date??`${c.label} must be within the financial year`)}),i},da=()=>{const{companyContext:e,refresh:t}=Le(),[r,i]=p.useState(K),[n,c]=p.useState(K),[o,b]=p.useState({}),[I,x]=p.useState(!1),[y,v]=p.useState(null),[E,C]=p.useState(!1),[A,_]=p.useState(null),d=p.useMemo(()=>De((e==null?void 0:e.fiscalYearStart)??null,(e==null?void 0:e.fiscalYearEnd)??null),[e==null?void 0:e.fiscalYearEnd,e==null?void 0:e.fiscalYearStart]),{data:L,loading:J,error:S,refetch:O}=G(Ue,{client:F,variables:{search:null,limit:2e3},fetchPolicy:"cache-and-network",nextFetchPolicy:"cache-first",notifyOnNetworkStatusChange:!0}),w=p.useMemo(()=>(L==null?void 0:L.companies)??[],[L]),g=p.useMemo(()=>ge(w,{companyName:(e==null?void 0:e.companyName)??null,companyAlias:(e==null?void 0:e.companyAlias)??null}),[w,e==null?void 0:e.companyAlias,e==null?void 0:e.companyName]),{data:V}=G(He,{client:F,variables:{search:null,limit:2e3}}),s=p.useMemo(()=>(V==null?void 0:V.geoCountries)??[],[V]),l=r.countryId??(g==null?void 0:g.countryId)??null,j=p.useMemo(()=>ze(l,s),[l,s]),{data:u}=G(We,{client:F,variables:{countryId:r.countryId??null,search:null,limit:2e3},skip:!r.countryId}),$=p.useMemo(()=>(u==null?void 0:u.geoStates)??[],[u]),{data:P}=G(Ze,{client:F,variables:{stateId:r.stateId??null,search:null,limit:2e3},skip:!r.stateId}),te=p.useMemo(()=>(P==null?void 0:P.geoDistricts)??[],[P]),{data:ee}=G(Qe,{client:F,variables:{districtId:null,stateId:null,search:null,limit:2e3}}),ue=p.useMemo(()=>(ee==null?void 0:ee.geoCities)??[],[ee]),Pe=p.useMemo(()=>ue.filter(k=>!(r.districtId&&k.districtId!==r.districtId||r.stateId&&k.stateId!==r.stateId)),[ue,r.districtId,r.stateId]),{data:ae}=G(Xe,{client:F,variables:{entity:"company",countryCode:j,limit:500}}),f=p.useMemo(()=>(ae==null?void 0:ae.fieldDefinitions)??[],[ae]),Ce=p.useMemo(()=>Be(f),[f]),[me]=pe(ea,{client:F}),[be]=pe(aa,{client:F});p.useEffect(()=>{if(!g){if(w.length>0)return;i(K),c(K),v(null),b({}),_(null);return}if(A===g.companyId)return;const k=le(g,f),q=B(k,f);i(q),c(q),b({}),v(null),_(g.companyId)},[g,w.length,f,A]),p.useEffect(()=>{f.length&&(i(k=>B(k,f)),c(k=>B(k,f)))},[f]);const re=p.useCallback(async()=>{var W;v(null);const q=((W=(await O({search:null,limit:2e3})).data)==null?void 0:W.companies)??[],U=ge(q,{companyName:(e==null?void 0:e.companyName)??null,companyAlias:(e==null?void 0:e.companyAlias)??null});if(!U){i(K),c(K),b({}),_(null);return}const ie=le(U,f),H=B(ie,f);i(H),c(H),b({}),_(U.companyId)},[O,e==null?void 0:e.companyAlias,e==null?void 0:e.companyName,f]),ke=p.useCallback(()=>{i(n),v(null),b({})},[n]),_e=p.useCallback(async()=>{var W,Ne;const k=na(r),q=new Set(f.map(T=>T.key.trim().toLowerCase()).filter(Boolean)),U=ra(r.customPairs,q),ie=ca(r,f,d),H={...k,...U,...ie};if(Object.keys(H).length>0)throw b(H),new Error("Please fix validation errors before saving");b({}),x(!0),v(null);try{const T=ia(r);if(g!=null&&g.companyId){const R=((W=(await be({variables:{companyId:g.companyId,...T}})).data)==null?void 0:W.updateCompany)??null;if(R){const ce=le(R,f),Z=B(ce,f);i(Z),c(Z),_(R.companyId)}}else{const R=((Ne=(await me({variables:T})).data)==null?void 0:Ne.createCompany)??null;if(R){const ce=le(R,f),Z=B(ce,f);i(Z),c(Z),_(R.companyId)}}await t(),await re()}catch(T){const ne=T instanceof Error?T.message:"Failed to save company profile";throw v(ne),T}finally{x(!1)}},[g==null?void 0:g.companyId,me,f,d,r,re,t,be]);return{form:r,setForm:i,snapshot:n,formErrors:o,setFormErrors:b,activeCompany:g,hasCompany:!!g,countries:s,states:$,districts:te,filteredCities:Pe,fieldDefinitions:f,groupedFieldDefinitions:Ce,fiscalRange:d,geoImportVisible:E,setGeoImportVisible:C,loading:J,saving:I,error:y??(S==null?void 0:S.message)??null,loadCompany:re,saveCompany:_e,resetForm:ke}};function Ga(){const e=p.useRef(null),{form:t,setForm:r,formErrors:i,hasCompany:n,loading:c,saving:o,error:b,countries:I,states:x,districts:y,filteredCities:v,groupedFieldDefinitions:E,fiscalRange:C,geoImportVisible:A,setGeoImportVisible:_,saveCompany:d,resetForm:L}=da(),J=async()=>{var S,O;try{await d(),(S=e.current)==null||S.show({severity:"success",summary:"Saved",detail:n?"Company profile updated.":"Company profile created."})}catch(w){const g=w instanceof Error?w.message:"Failed to save company profile";(O=e.current)==null||O.show({severity:"error",summary:"Error",detail:g})}};return a.jsxs("div",{className:"card app-gradient-card p-fluid",children:[a.jsx(we,{ref:e}),a.jsx(Je,{form:t,formErrors:i,hasCompany:n,loading:c,saving:o,error:b,countries:I,states:x,districts:y,cities:v,groupedFieldDefinitions:E,fiscalRange:C,geoImportVisible:A,onSetGeoImportVisible:_,onReset:L,onSave:J,onFormChange:r})]})}export{Ga as default};
