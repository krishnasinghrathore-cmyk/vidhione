import{b9 as a,r as s}from"./index-a2e62377.js";import{A as m}from"./masterLookupCache-09ded647.js";import{g as d,u as g}from"./useQuery-55f3f513.js";const i=d`
    query LedgerGroups {
        ledgerGroups {
            ledgerGroupId
            name
            groupTypeCode
        }
    }
`,b=(p={})=>{const{data:o,loading:u,error:n,refetch:t}=g(i,{client:a,skip:p.skip,...m}),r=s.useMemo(()=>(o==null?void 0:o.ledgerGroups)??[],[o]);return{options:s.useMemo(()=>[...r].sort((e,l)=>(e.name??"").localeCompare(l.name??"","en",{sensitivity:"base"})).map(e=>({value:Number(e.ledgerGroupId),label:e.name??`Group ${e.ledgerGroupId}`,name:e.name??null,groupTypeCode:e.groupTypeCode!=null?Number(e.groupTypeCode):null})),[r]),loading:u,error:n,refetch:t}};export{b as u};
