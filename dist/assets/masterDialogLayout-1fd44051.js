import{j as n,c,r as d,b9 as N}from"./index-a2e62377.js";import{A as x}from"./masterLookupCache-09ded647.js";import{g as h,u as y}from"./useQuery-55f3f513.js";import{c as b}from"./confirmdialog.esm-d0f3c502.js";function A({label:e,value:i,className:t,valueClassName:s}){return n.jsxs("div",{className:c("surface-50 border-1 surface-border border-round p-3 h-full app-master-detail-card",t),children:[n.jsx("div",{className:"text-500 text-xs mb-2",children:e}),n.jsx("div",{className:c("text-900 font-semibold app-master-detail-card__value",s),children:i})]})}function M({children:e,columns:i=2,className:t}){return n.jsx("div",{className:c("app-master-detail-grid",`app-master-detail-grid--cols-${i}`,t),children:e})}function E({title:e,description:i,children:t,className:s}){return n.jsxs("section",{className:c("app-master-detail-section",s),children:[e?n.jsx("div",{className:"app-master-detail-section__title",children:e}):null,i?n.jsx("div",{className:"app-master-detail-section__description",children:i}):null,t]})}const _=h`
    query GeoCityLookup($districtId: Int, $stateId: Int, $search: String, $limit: Int, $includeInactive: Boolean) {
        geoCities(
            districtId: $districtId
            stateId: $stateId
            search: $search
            limit: $limit
            includeInactive: $includeInactive
        ) {
            cityId
            name
            districtId
            districtName
            stateId
            stateName
            countryId
            countryName
        }
    }
`,S=(e={})=>{const i=d.useMemo(()=>({districtId:e.districtId??null,stateId:e.stateId??null,search:e.search??null,limit:e.limit??2e3,includeInactive:e.includeInactive??null}),[e.districtId,e.includeInactive,e.limit,e.search,e.stateId]),{data:t,loading:s,error:m,refetch:p}=y(_,{client:N,variables:i,skip:e.skip,...x}),r=d.useMemo(()=>(t==null?void 0:t.geoCities)??[],[t]),I=d.useMemo(()=>r.map(a=>{var u;const l=Number(a.cityId),f=((u=a.name)==null?void 0:u.trim())??"",o=[a.districtName,a.stateName].filter(Boolean).join(", "),v=[f||`City ${l}`,o?`(${o})`:null].filter(Boolean).join(" ");return{value:l,label:v,cityId:l,districtId:a.districtId!=null?Number(a.districtId):null,districtName:a.districtName??null,stateId:a.stateId!=null?Number(a.stateId):null,stateName:a.stateName??null,countryId:a.countryId!=null?Number(a.countryId):null,countryName:a.countryName??null}}),[r]);return{rows:r,options:I,loading:s,error:m,refetch:p}},C=e=>{if(typeof document>"u")return!1;const i=document.getElementById(e);return i?(i.focus(),!0):!1},T=e=>{typeof window>"u"||window.requestAnimationFrame(()=>{window.requestAnimationFrame(()=>{C(e)})})},O=(e,i,t)=>i?e?t?"Applying...":"Checking...":"Saving...":e?t?"Apply Changes":"Run Dry Check":"Save",L=({saving:e,isDirty:i,onDiscard:t})=>{if(!e){if(!i){t();return}b({header:"Discard changes?",message:"You have unsaved changes. Discard and close this form?",icon:"pi pi-exclamation-triangle",rejectLabel:"Keep Editing",acceptLabel:"Discard",acceptClassName:"p-button-danger",defaultFocus:"reject",accept:t,reject:()=>{}})}},B={compact:"min(520px, 96vw)",medium:"min(640px, 96vw)",standard:"min(720px, 96vw)",wide:"min(980px, 96vw)"},G={compact:"min(520px, 96vw)",medium:"min(640px, 96vw)",standard:"min(720px, 96vw)",wide:"min(900px, 96vw)"};export{G as M,T as a,E as b,M as c,A as d,L as e,C as f,O as g,B as h,S as u};
