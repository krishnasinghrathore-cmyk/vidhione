import{r as s,b9 as p}from"./index-a2e62377.js";import{A as I}from"./masterLookupCache-09ded647.js";import{g as A,u as d}from"./useQuery-55f3f513.js";const h=A`
    query AreaLookup($search: String, $limit: Int) {
        areas(search: $search, limit: $limit) {
            areaId
            name
            cityId
        }
    }
`,$=(e={})=>{const l=s.useMemo(()=>({search:e.search??null,limit:e.limit??2e3}),[e.limit,e.search]),{data:r,loading:m,error:n,refetch:c}=d(h,{client:p,variables:l,skip:e.skip,...I}),a=s.useMemo(()=>(r==null?void 0:r.areas)??[],[r]),u=s.useMemo(()=>a.map(t=>{var o;const i=Number(t.areaId);return{value:i,label:((o=t.name)==null?void 0:o.trim())||`Area ${i}`,areaId:i,cityId:t.cityId!=null?Number(t.cityId):null}}),[a]);return{rows:a,options:u,loading:m,error:n,refetch:c}};export{$ as u};
