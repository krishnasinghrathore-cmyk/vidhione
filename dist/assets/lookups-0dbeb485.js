import{r as i}from"./index-a2e62377.js";import{u as Y}from"./useLedgerLookup-6c31bc14.js";import{g,u as p}from"./useQuery-55f3f513.js";const k=g`
    query TextileProducts($search: String, $limit: Int) {
        products(search: $search, limit: $limit, isActiveFlag: 1) {
            productId
            name
            code
            units {
                unitId
            }
        }
    }
`,A=g`
    query TextileUnits($limit: Int) {
        units(limit: $limit) {
            unitId
            name
        }
    }
`,C=g`
    query TextileTransporters($search: String, $limit: Int) {
        transporters(search: $search, limit: $limit) {
            transporterId
            name
            alias
        }
    }
`,W=g`
    query TextileGodowns($limit: Int) {
        godowns(limit: $limit) {
            godownId
            name
        }
    }
`,u=(m,I)=>({value:String(m),label:I}),J=()=>{const{ledgers:m,loading:I,error:$}=Y(),{data:N,loading:R,error:b}=p(k,{variables:{search:null,limit:1e3}}),{data:f,loading:y,error:w}=p(A,{variables:{limit:500}}),{data:T,loading:U,error:M}=p(C,{variables:{search:null,limit:500}}),{data:S,loading:O,error:L}=p(W,{variables:{limit:500}}),E=i.useMemo(()=>m.map(t=>{var r,s;const e=Number(t.ledgerId),n=((r=t.name)==null?void 0:r.trim())||`Ledger ${e}`,o=(s=t.gstNumber)!=null&&s.trim()?` | GSTIN ${t.gstNumber.trim()}`:"";return u(e,`${n}${o}`)}),[m]),h=i.useMemo(()=>{var e;const t=new Map;for(const n of m){const o=Number(n.ledgerId);Number.isFinite(o)&&t.set(String(o),((e=n.name)==null?void 0:e.trim())||`Ledger ${o}`)}return t},[m]),a=(N==null?void 0:N.products)??[],x=i.useMemo(()=>a.map(t=>{var r,s;const e=Number(t.productId),n=((r=t.name)==null?void 0:r.trim())||`Product ${e}`,o=(s=t.code)!=null&&s.trim()?` (${t.code.trim()})`:"";return u(e,`${n}${o}`)}),[a]),F=i.useMemo(()=>{var e;const t=new Map;for(const n of a){const o=Number(n.productId);Number.isFinite(o)&&t.set(String(o),((e=n.name)==null?void 0:e.trim())||`Product ${o}`)}return t},[a]),_=i.useMemo(()=>{var e,n;const t=new Map;for(const o of a){const r=Number(o.productId),s=(n=(e=o.units)==null?void 0:e[0])==null?void 0:n.unitId;!Number.isFinite(r)||!Number.isFinite(s)||t.set(String(r),String(s))}return t},[a]),c=(f==null?void 0:f.units)??[],B=i.useMemo(()=>c.map(t=>{var n;const e=Number(t.unitId);return u(e,((n=t.name)==null?void 0:n.trim())||`Unit ${e}`)}),[c]),v=i.useMemo(()=>{var e;const t=new Map;for(const n of c){const o=Number(n.unitId);Number.isFinite(o)&&t.set(String(o),((e=n.name)==null?void 0:e.trim())||`Unit ${o}`)}return t},[c]),d=(T==null?void 0:T.transporters)??[],q=i.useMemo(()=>d.map(t=>{var r,s;const e=Number(t.transporterId),n=((r=t.name)==null?void 0:r.trim())||`Transporter ${e}`,o=(s=t.alias)!=null&&s.trim()?` | ${t.alias.trim()}`:"";return u(e,`${n}${o}`)}),[d]),G=i.useMemo(()=>{var e;const t=new Map;for(const n of d){const o=Number(n.transporterId);Number.isFinite(o)&&t.set(String(o),((e=n.name)==null?void 0:e.trim())||`Transporter ${o}`)}return t},[d]),l=(S==null?void 0:S.godowns)??[],P=i.useMemo(()=>l.map(t=>{var n;const e=Number(t.godownId);return u(e,((n=t.name)==null?void 0:n.trim())||`Godown ${e}`)}),[l]),Q=i.useMemo(()=>{var e;const t=new Map;for(const n of l){const o=Number(n.godownId);Number.isFinite(o)&&t.set(String(o),((e=n.name)==null?void 0:e.trim())||`Godown ${o}`)}return t},[l]),X=[$==null?void 0:$.message,b==null?void 0:b.message,w==null?void 0:w.message,M==null?void 0:M.message,L==null?void 0:L.message].filter(t=>!!t);return{ledgerOptions:E,ledgerNameById:h,productOptions:x,productNameById:F,productDefaultUnitById:_,unitOptions:B,unitNameById:v,transporterOptions:q,transporterNameById:G,godownOptions:P,godownNameById:Q,loading:I||R||y||U||O,errorMessages:X}};export{J as u};
