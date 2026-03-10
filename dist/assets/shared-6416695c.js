import{g as n}from"./useQuery-55f3f513.js";const s=n`
    query InvestorProfiles {
        investorProfiles {
            id
            name
            pan
            relationship
            email
            phone
            isActive
            notes
            createdAt
        }
    }
`,a=n`
    query WealthAccounts {
        accounts {
            id
            name
            code
            investorProfileId
            investorProfileName
            brokerName
            depository
            dpId
            clientId
            dematNumber
            holderName
            pan
            isPrimary
            isActive
            openedOn
            notes
            createdAt
        }
    }
`,i=e=>{var r;const t=(r=e.relationship)==null?void 0:r.trim();return t?`${e.name} (${t})`:e.name},m=e=>e.code?`${e.name} (${e.code})`:e.name,l=e=>{if(!e)return null;const t=new Date(`${e}T00:00:00`);return Number.isNaN(t.getTime())?null:t};export{a as W,i as a,s as b,l as c,m as f};
