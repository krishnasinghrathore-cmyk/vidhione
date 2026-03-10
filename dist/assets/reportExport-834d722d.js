import{ah as $}from"./index-a2e62377.js";const L=e=>e==null?"":typeof e=="boolean"?e?"Yes":"No":String(e),w=e=>/[",\n]/.test(e)?`"${e.replace(/"/g,'""')}"`:e,x=(e,t)=>{const r=e.trim(),n=r.toLowerCase(),o=`.${t}`;return n.endsWith(o)?r:`${r}${o}`},E=e=>{const t=[],r=n=>{const o=n==null?void 0:n.trim();o&&t.push(o)};return r(e.companyName??null),r(e.companyAddress??null),r(e.title??null),e.subtitle&&e.subtitle.split(`
`).forEach(n=>{r(n)}),t},k=e=>{const t=E(e);return t.length?[...t.map(r=>[r]),[]]:[]},z=e=>{const t=[],r=(n,o)=>{const l=n==null?void 0:n.trim();l&&t.push({text:l,font:o})};return r(e.companyName??null,{bold:!0,size:14}),r(e.companyAddress??null,{size:11}),r(e.title??null,{bold:!0,size:12}),e.subtitle&&e.subtitle.split(`
`).forEach(n=>{r(n,{size:10})}),t},y=e=>{const t=e.columns.map(o=>o.header),r=e.rows.map(o=>e.columns.map(l=>L(l.value(o)))),n=k(e);return{header:t,rows:r,metaRows:n}},j=e=>{if(!e.rows.length)return;const{header:t,rows:r,metaRows:n}=y(e),l=[...n.map(c=>c.map(m=>w(m)).join(",")),t.map(c=>w(c)).join(","),...r.map(c=>c.map(m=>w(m)).join(","))].join(`
`),s=new Blob([l],{type:"text/csv;charset=utf-8;"}),p=URL.createObjectURL(s),d=document.createElement("a");d.href=p,d.download=x(e.fileName,"csv"),d.click(),URL.revokeObjectURL(p)},H=async e=>{if(!e.rows.length)return;const{header:t,rows:r}=y(e),n=await $(()=>import("./exceljs.min-36d631ea.js").then(a=>a.e),["assets/exceljs.min-36d631ea.js","assets/index-a2e62377.js","assets/index-0881a611.css"]),o=n.default??n,l=new o.Workbook,s=l.addWorksheet(e.sheetName??"Report"),p=z(e),d=Math.max(1,t.length);p.length&&(p.forEach(a=>{const i=s.addRow([a.text]);d>1&&s.mergeCells(i.number,1,i.number,d);const f=i.getCell(1);f.alignment={horizontal:"center"},a.font&&(i.font=a.font)}),s.addRow([]));const c=s.addRow(t);c.font={bold:!0},c.eachCell(a=>{a.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF1F5F9"}},a.border={top:{style:"thin",color:{argb:"FFE5E7EB"}},left:{style:"thin",color:{argb:"FFE5E7EB"}},bottom:{style:"thin",color:{argb:"FFE5E7EB"}},right:{style:"thin",color:{argb:"FFE5E7EB"}}}}),s.addRows(r);const m=c.number;if(s.pageSetup={...s.pageSetup,margins:{left:.7,right:.7,top:.75,bottom:.75,header:.3,footer:.3}},s.pageSetup.printTitlesRow=`1:${m}`,e.footerLeft||e.footerRight){const a=(e.footerLeft??"").replace(/\s+/g," ").trim(),i=(e.footerRight??"Page").replace(/\s+/g," ").trim();s.headerFooter={oddFooter:`${a?`&L${a}`:""}&R${i} &P`,evenFooter:`${a?`&L${a}`:""}&R${i} &P`}}const u=await l.xlsx.writeBuffer(),g=new Blob([u],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),b=URL.createObjectURL(g),h=document.createElement("a");h.href=b,h.download=x(e.fileName,"xlsx"),h.click(),URL.revokeObjectURL(b)},R=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),N=e=>{var i;if(!e.rows.length)return;const t=window.open("","_blank");if(!t)return;const{header:r,rows:n}=y(e),o=f=>R(f).replace(/\n/g,"<br />"),l=r.map(f=>`<th>${o(f)}</th>`).join(""),s=n.map(f=>`<tr>${f.map(v=>`<td>${o(v)}</td>`).join("")}</tr>`).join(""),p=e.title?`<div class="report-title">${o(e.title)}</div>`:"",d=e.subtitle?`<div class="report-subtitle">${o(e.subtitle)}</div>`:"",c=e.companyName?`<div class="report-company">${o(e.companyName)}</div>`:"",m=e.companyAddress?`<div class="report-address">${o(e.companyAddress)}</div>`:"",u=e.footerLeft?`<div class="report-footer-left">${o(e.footerLeft)}</div>`:'<div class="report-footer-left"></div>',g=((i=e.footerRight)==null?void 0:i.trim())||"Page",b=`<div class="report-footer-right">${o(g)} <span class="report-footer-page-number"></span></div>`,h=`<div class="report-footer">${u}${b}</div>`;t.document.open(),t.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${R(x(e.fileName,"pdf"))}</title>
  <style>
    :root {
      color-scheme: light;
      --report-ink: #111827;
      --report-muted: #4b5563;
      --report-line: #e5e7eb;
      --report-header: #f1f5f9;
      --report-footer: #e8eef5;
      --report-zebra: #f8fafc;
    }
    * { box-sizing: border-box; }
    @page { margin: 12mm 12mm 18mm; }
    body {
      font-family: "Roboto", "Segoe UI", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: var(--report-ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      counter-reset: page;
    }
    .report-header {
      text-align: center;
      margin-bottom: 10px;
    }
    .report-company { font-size: 16px; font-weight: 700; }
    .report-address { font-size: 12px; color: var(--report-muted); margin-top: 4px; }
    .report-title { font-size: 13px; font-weight: 600; margin-top: 6px; }
    .report-subtitle { font-size: 11px; color: var(--report-muted); margin-top: 4px; white-space: pre-line; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
    th, td { border: 1px solid var(--report-line); padding: 6px 8px; text-align: left; vertical-align: top; }
    thead th {
      background: var(--report-header);
      font-weight: 600;
      font-size: 11px;
    }
    tbody tr:nth-child(even) td { background: var(--report-zebra); }
    tfoot td { background: var(--report-footer); font-weight: 600; }
    tr { page-break-inside: avoid; }
    .report-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 12mm 6mm;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--report-muted);
    }
    .report-footer-left,
    .report-footer-right {
      white-space: nowrap;
    }
    .report-footer-page-number::after { content: counter(page); }
  </style>
</head>
<body>
  <div class="report-header">
    ${c}
    ${m}
    ${p}
    ${d}
  </div>
  ${h}
  <table>
    <thead><tr>${l}</tr></thead>
    <tbody>${s}</tbody>
  </table>
</body>
</html>`),t.document.close(),t.focus();const a=()=>{t.print()};t.document.readyState==="complete"?setTimeout(a,0):t.onload=a,t.onafterprint=()=>{t.close()}};export{H as a,N as b,j as e};
