import{g as t}from"./useQuery-55f3f513.js";const s=t`
    query WealthSecurities {
        securities {
            id
            isin
            symbol
            name
        }
    }
`,n=t`
    mutation WealthUpsertSecurity($isin: String, $symbol: String, $name: String!) {
        upsertSecurity(isin: $isin, symbol: $symbol, name: $name) {
            id
            isin
            symbol
            name
        }
    }
`,o=t`
    query WealthPricesList($limit: Int) {
        pricesList(limit: $limit) {
            securityId
            pdate
            closePrice
        }
    }
`,c=t`
    query WealthPriceAt($securityId: String!, $asOfDate: String!) {
        pricesList(securityId: $securityId, asOfDate: $asOfDate, limit: 1) {
            securityId
            pdate
            closePrice
        }
    }
`,l=t`
    mutation WealthUpsertPrice($securityId: String!, $pdate: String!, $closePrice: String!) {
        upsertPrice(securityId: $securityId, pdate: $pdate, closePrice: $closePrice) {
            securityId
            pdate
            closePrice
        }
    }
`,u=t`
    query WealthCorporateActionsList($limit: Int) {
        corporateActionsList(limit: $limit) {
            id
            securityId
            actionDate
            actionType
            ratio
            price
            notes
        }
    }
`,S=t`
    mutation WealthUpsertCorporateAction(
        $securityId: String!
        $actionDate: String!
        $actionType: String!
        $ratio: String
        $price: String
        $notes: String
    ) {
        upsertCorporateAction(
            securityId: $securityId
            actionDate: $actionDate
            actionType: $actionType
            ratio: $ratio
            price: $price
            notes: $notes
        ) {
            id
            securityId
            actionDate
            actionType
        }
    }
`,I=t`
    query WealthTransactionsPage($limit: Int, $offset: Int) {
        transactionsPage(limit: $limit, offset: $offset) {
            items {
                id
                tdate
                ttype
                segment
                invoiceDate
                qty
                price
                fees
                notes
                sourceDoc
                accountId
                securityId
                isin
                symbol
                name
            }
            meta {
                total
                limit
                offset
                hasMore
                nextOffset
            }
        }
    }
`,T=t`
    mutation WealthUpsertTransaction(
        $accountId: String!
        $securityId: String!
        $tdate: String!
        $ttype: String!
        $segment: String
        $invoiceDate: String
        $qty: String!
        $price: String!
        $fees: String
        $notes: String
        $sourceDoc: String
    ) {
        upsertTransaction(
            accountId: $accountId
            securityId: $securityId
            tdate: $tdate
            ttype: $ttype
            segment: $segment
            invoiceDate: $invoiceDate
            qty: $qty
            price: $price
            fees: $fees
            notes: $notes
            sourceDoc: $sourceDoc
        ) {
            id
            tdate
            ttype
            segment
            invoiceDate
            qty
            price
            fees
        }
    }
`,m=[{label:"Split",value:"SPLIT"},{label:"Bonus",value:"BONUS"},{label:"Rights",value:"RIGHTS"},{label:"Dividend",value:"DIVIDEND"},{label:"Capital Reduction",value:"CAPITAL_REDUCTION"},{label:"Expense",value:"EXPENSE"}],$=[{label:"BUY",value:"BUY"},{label:"SELL",value:"SELL"},{label:"DIVIDEND",value:"DIVIDEND"},{label:"SPLIT",value:"SPLIT"},{label:"BONUS",value:"BONUS"},{label:"RIGHTS",value:"RIGHTS"},{label:"EXPENSE",value:"EXPENSE"}],E=[{label:"Cash",value:"CASH"},{label:"SLBM",value:"SLBM"},{label:"F&O",value:"FAO"}],r=new Intl.NumberFormat("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}),g=e=>{const i=typeof e=="number"?e:Number(e);return Number.isFinite(i)?r.format(i):"-"},p=e=>e==="SPLIT"?"Factor (share multiplier). FV split 10->2 enter 5; merge 2->10 enter 0.2":e==="BONUS"?"Bonus ratio (bonus shares per share). 1:1 enter 1; 1:2 enter 0.5":e==="RIGHTS"?"Rights ratio (rights shares per share). 1:5 enter 0.2":e==="CAPITAL_REDUCTION"?"Factor (remaining share multiplier). Example 1:2 reduction enter 0.5":"Ratio",d=e=>e==="RIGHTS"?"Rights issue price":e==="DIVIDEND"?"Dividend per share":"Cash / price",A=e=>e==="DIVIDEND"?"TDS":e==="BUY"||e==="SELL"?"Brokerage / Fees":"Fees",y=e=>e==="SELL"?"Net Proceeds":e==="BUY"?"Cost of Purchase":"Net Amount";export{s as W,n as a,o as b,l as c,c as d,m as e,g as f,p as g,d as h,u as i,S as j,$ as k,E as l,A as m,y as n,I as o,T as p};
