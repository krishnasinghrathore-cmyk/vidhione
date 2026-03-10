import{r as l,j as s,B as q}from"./index-a2e62377.js";import{D as Z}from"./dialog.esm-6e6fddb6.js";import{A as y}from"./AppDropdown-800ebb2b.js";import{u as f}from"./useLazyQuery-83424a52.js";import{u as C}from"./useMutation-fc9212b2.js";import{g as o}from"./useQuery-55f3f513.js";const tt=o`
    query AuthGeoCountries($search: String, $limit: Int) {
        authGeoCountries(search: $search, limit: $limit) {
            id
            iso2
            iso3
            name
        }
    }
`,et=o`
    query AuthGeoStates($countryId: Int!, $search: String, $limit: Int) {
        authGeoStates(countryId: $countryId, search: $search, limit: $limit) {
            id
            countryId
            code
            name
        }
    }
`,st=o`
    query AuthGeoDistricts($stateId: Int!, $search: String, $limit: Int) {
        authGeoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            id
            stateId
            name
        }
    }
`,it=o`
    query AuthGeoCities($districtId: Int!, $search: String, $limit: Int) {
        authGeoCities(districtId: $districtId, search: $search, limit: $limit) {
            id
            districtId
            name
        }
    }
`,lt=o`
    mutation EnsureGeoCountry($authCountryId: Int!) {
        ensureGeoCountry(authCountryId: $authCountryId) {
            countryId
        }
    }
`,rt=o`
    mutation EnsureGeoState($authStateId: Int!) {
        ensureGeoState(authStateId: $authStateId) {
            stateId
            countryId
        }
    }
`,at=o`
    mutation EnsureGeoDistrict($authDistrictId: Int!) {
        ensureGeoDistrict(authDistrictId: $authDistrictId) {
            districtId
            stateId
            countryId
        }
    }
`,nt=o`
    mutation EnsureGeoCity($authCityId: Int!) {
        ensureGeoCity(authCityId: $authCityId) {
            cityId
            districtId
            stateId
            countryId
        }
    }
`,R=c=>{const u=c.code||c.iso2||c.iso3;return u?`${c.name} (${u})`:c.name};function It({visible:c,onHide:u,onApply:h,title:k}){var w,A,T,_;const[r,j]=l.useState(null),[a,S]=l.useState(null),[n,I]=l.useState(null),[x,d]=l.useState(null),[v,M]=f(tt,{fetchPolicy:"network-only"}),[G,P]=f(et,{fetchPolicy:"network-only"}),[$,Q]=f(st,{fetchPolicy:"network-only"}),[E,F]=f(it,{fetchPolicy:"network-only"}),[B]=C(lt),[L]=C(rt),[Y]=C(at),[z]=C(nt);l.useEffect(()=>{c&&v({variables:{search:null,limit:200}})},[c,v]),l.useEffect(()=>{r&&G({variables:{countryId:r,search:null,limit:200}})},[r,G]),l.useEffect(()=>{a&&$({variables:{stateId:a,search:null,limit:200}})},[a,$]),l.useEffect(()=>{n&&E({variables:{districtId:n,search:null,limit:200}})},[n,E]);const N=((w=M.data)==null?void 0:w.authGeoCountries)??[],g=((A=P.data)==null?void 0:A.authGeoStates)??[],D=((T=Q.data)==null?void 0:T.authGeoDistricts)??[],p=((_=F.data)==null?void 0:_.authGeoCities)??[],H=l.useMemo(()=>N.map(e=>({label:R(e),value:e.id})),[N]),J=l.useMemo(()=>g.map(e=>({label:R(e),value:e.id})),[g]),K=l.useMemo(()=>D.map(e=>({label:e.name,value:e.id})),[D]),V=l.useMemo(()=>p.map(e=>({label:e.name,value:e.id})),[p]),m=()=>{j(null),S(null),I(null),d(null)},W=async()=>{var e,i,O,U;if(x){const t=(e=(await z({variables:{authCityId:x}})).data)==null?void 0:e.ensureGeoCity;h({countryId:(t==null?void 0:t.countryId)??null,stateId:(t==null?void 0:t.stateId)??null,districtId:(t==null?void 0:t.districtId)??null,cityId:(t==null?void 0:t.cityId)??null}),u(),m();return}if(n){const t=(i=(await Y({variables:{authDistrictId:n}})).data)==null?void 0:i.ensureGeoDistrict;h({countryId:(t==null?void 0:t.countryId)??null,stateId:(t==null?void 0:t.stateId)??null,districtId:(t==null?void 0:t.districtId)??null}),u(),m();return}if(a){const t=(O=(await L({variables:{authStateId:a}})).data)==null?void 0:O.ensureGeoState;h({countryId:(t==null?void 0:t.countryId)??null,stateId:(t==null?void 0:t.stateId)??null}),u(),m();return}if(r){const t=(U=(await B({variables:{authCountryId:r}})).data)==null?void 0:U.ensureGeoCountry;h({countryId:(t==null?void 0:t.countryId)??null}),u(),m()}},X=!r;return s.jsxs(Z,{visible:c,onHide:()=>{u(),m()},header:k??"Import from Master",style:{width:"min(720px, 96vw)"},modal:!0,children:[s.jsxs("div",{className:"grid",children:[s.jsxs("div",{className:"col-12 md:col-6",children:[s.jsx("label",{className:"font-medium text-700",children:"Country"}),s.jsx("div",{className:"flex align-items-center gap-2 mt-2",children:s.jsx(y,{value:r,options:H,placeholder:"Search country",filter:!0,onFilter:e=>{const i=e.filter??"";v({variables:{search:i||null,limit:200}})},onChange:e=>{const i=e.value??null;j(i),S(null),I(null),d(null)},showClear:!0,className:"w-full"})})]}),s.jsxs("div",{className:"col-12 md:col-6",children:[s.jsx("label",{className:"font-medium text-700",children:"State"}),s.jsx("div",{className:"flex align-items-center gap-2 mt-2",children:s.jsx(y,{value:a,options:J,placeholder:r?"Search state":"Select country first",filter:!0,disabled:!r,onFilter:e=>{const i=e.filter??"";r&&G({variables:{countryId:r,search:i||null,limit:200}})},onChange:e=>{const i=e.value??null;S(i),I(null),d(null)},showClear:!0,className:"w-full"})})]}),s.jsxs("div",{className:"col-12 md:col-6",children:[s.jsx("label",{className:"font-medium text-700",children:"District"}),s.jsx("div",{className:"flex align-items-center gap-2 mt-2",children:s.jsx(y,{value:n,options:K,placeholder:a?"Search district":"Select state first",filter:!0,disabled:!a,onFilter:e=>{const i=e.filter??"";a&&$({variables:{stateId:a,search:i||null,limit:200}})},onChange:e=>{const i=e.value??null;I(i),d(null)},showClear:!0,className:"w-full"})})]}),s.jsxs("div",{className:"col-12 md:col-6",children:[s.jsx("label",{className:"font-medium text-700",children:"City"}),s.jsx("div",{className:"flex align-items-center gap-2 mt-2",children:s.jsx(y,{value:x,options:V,placeholder:n?"Search city":"Select district first",filter:!0,disabled:!n,onFilter:e=>{const i=e.filter??"";n&&E({variables:{districtId:n,search:i||null,limit:200}})},onChange:e=>d(e.value??null),showClear:!0,className:"w-full"})})]}),s.jsx("div",{className:"col-12",children:s.jsx("small",{className:"text-600",children:"Pick as deep as you need; Apply will import the selected level."})})]}),s.jsxs("div",{className:"flex justify-content-end gap-2 mt-3",children:[s.jsx(q,{label:"Cancel",severity:"secondary",onClick:u}),s.jsx(q,{label:"Apply",onClick:W,disabled:X})]})]})}export{It as G};
