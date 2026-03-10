import{g as Te}from"./useQuery-55f3f513.js";const Me=2,ae=["pageHeader","reportHeader","body","reportFooter","pageFooter"],B=(e,t,i)=>Math.min(i,Math.max(t,e)),L=e=>Math.round(e*100)/100,g=e=>typeof e=="string"?e.trim():"",G=(e,t)=>{const i=Number(e);return Number.isFinite(i)?i:t},j=e=>`${e}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,ke={pageHeader:"Page Header",reportHeader:"Report Header",body:"Body",reportFooter:"Report Footer",pageFooter:"Page Footer"},Ne={pageHeader:28,reportHeader:36,body:120,reportFooter:24,pageFooter:20},fe=(e,t)=>{const i=g(e);return i||t},V=e=>{const t=new Set,i=/\b(?:field|fields|sum|avg|min|max|first|last|count|distinctCount)\s*\(\s*(['"])(.*?)\1/gi;let o=i.exec(e);for(;o;){const r=g(o[2]);r&&t.add(r),o=i.exec(e)}return Array.from(t)},z=(e,t)=>({id:g(e.id)||j(t),type:t,xMm:L(B(G(e.xMm,10),0,400)),yMm:L(B(G(e.yMm,10),0,600)),widthMm:L(B(G(e.widthMm,t==="line"?80:t==="table"||t==="list"?160:60),1,400)),heightMm:L(B(G(e.heightMm,t==="line"?1:t==="table"?48:t==="list"?68:12),1,600)),fontSizePt:B(G(e.fontSizePt,t==="table"||t==="list"?9:10),6,28),fontWeight:e.fontWeight==="bold"?"bold":"normal",textAlign:e.textAlign==="center"||e.textAlign==="right"?e.textAlign:"left",borderWidth:B(G(e.borderWidth,t==="rectangle"||t==="table"||t==="list"?1:0),0,4),borderColor:fe(e.borderColor,"#334155"),fillColor:fe(e.fillColor,t==="table"||t==="list"?"#ffffff":"transparent"),textColor:fe(e.textColor,"#111827"),borderColorExpression:g(e.borderColorExpression),fillColorExpression:g(e.fillColorExpression),textColorExpression:g(e.textColorExpression),fontWeightExpression:g(e.fontWeightExpression),hiddenExpression:g(e.hiddenExpression),pageBreakBefore:e.pageBreakBefore===!0,pageBreakAfter:e.pageBreakAfter===!0,keepTogether:e.keepTogether===!0}),Ae=(e,t="")=>({id:g(e.id)||j("col"),fieldKey:g(e.fieldKey)||t,label:g(e.label)||g(e.fieldKey)||t||"Column",widthMm:L(B(G(e.widthMm,28),10,120)),align:e.align==="center"||e.align==="right"?e.align:"left",includeTotal:e.includeTotal===!0,repeatValue:e.repeatValue!==!1}),Ge=e=>{const t=g(e.fieldKey);return t?{id:g(e.id)||j("grp"),fieldKey:t,label:g(e.label)||t,sortDirection:e.sortDirection==="desc"?"desc":"asc",showHeader:e.showHeader!==!1,showSubtotal:e.showSubtotal===!0,subtotalLabel:g(e.subtotalLabel)||"Subtotal",pageBreakBefore:e.pageBreakBefore===!0,pageBreakAfter:e.pageBreakAfter===!0,keepTogether:e.keepTogether===!0,keepWithNext:e.keepWithNext===!0}:null},Le=e=>{const t=g(e.fieldKey);return t?{id:g(e.id)||j("sort"),fieldKey:t,direction:e.direction==="desc"?"desc":"asc"}:null},We=e=>{if(!e||typeof e!="object")return null;const t=e,i=t.type;return i!=="text"&&i!=="field"&&i!=="image"&&i!=="line"&&i!=="rectangle"?null:i==="text"?{...z(t,i),text:g(t.text)||"Text",expression:g(t.expression),canGrow:t.canGrow!==!1,canShrink:t.canShrink===!0}:i==="field"?{...z(t,i),fieldKey:g(t.fieldKey),fallbackText:g(t.fallbackText),expression:g(t.expression),canGrow:t.canGrow!==!1,canShrink:t.canShrink===!0}:i==="image"?{...z(t,i),sourceKind:t.sourceKind==="company_logo"||t.sourceKind==="field"?t.sourceKind:"url",url:g(t.url),fieldKey:g(t.fieldKey),expression:g(t.expression),fit:t.fit==="cover"||t.fit==="fill"?t.fit:"contain"}:z(t,i)},St=()=>({...z({},"text"),text:"Text",expression:"",canGrow:!0,canShrink:!1}),ve=(e="")=>({...z({},"field"),fieldKey:e,fallbackText:"",expression:"",canGrow:!0,canShrink:!1}),vt=()=>({...z({widthMm:28,heightMm:18},"image"),sourceKind:"url",url:"",fieldKey:"",expression:"",fit:"contain"}),$t=()=>({...z({heightMm:1,widthMm:80,borderWidth:1},"line")}),Tt=()=>({...z({heightMm:18,widthMm:60,borderWidth:1},"rectangle")}),Mt=(e=[])=>({...z({widthMm:170,heightMm:54,borderWidth:1,fontSizePt:9},"table"),datasetKey:"main",columns:e.slice(0,6).map(t=>Ae({fieldKey:t,label:t,widthMm:28},t)),rowGroups:[],sorts:[],showHeader:!0,showGrandTotal:!1,zebraStriping:!0}),kt=(e=[])=>{const t=[],i=e[0]??"",o=e[1]??"";return i&&t.push({...ve(i),id:j("detail"),xMm:4,yMm:3,widthMm:72,heightMm:8,fontWeight:"bold"}),o&&t.push({...ve(o),id:j("detail"),xMm:4,yMm:12,widthMm:72,heightMm:6,fontSizePt:8}),{...z({widthMm:170,heightMm:72,borderWidth:1,fontSizePt:9},"list"),datasetKey:"main",sourcePath:"",rowHeightMm:20,gapMm:1,showRowDivider:!0,zebraStriping:!1,items:t}},Nt=e=>{const t=JSON.parse(JSON.stringify(e));return t.id=j(e.type),t.xMm=L(e.xMm+3),t.yMm=L(e.yMm+3),t.type==="table"&&(t.columns=t.columns.map(i=>({...i,id:j("col")})),t.rowGroups=t.rowGroups.map(i=>({...i,id:j("grp")})),t.sorts=t.sorts.map(i=>({...i,id:j("sort")}))),t.type==="list"&&(t.items=t.items.map(i=>({...i,id:j("detail")}))),t},_e=(e="")=>({version:Me,datasets:[{id:j("ds"),key:"main",label:"Main Dataset",dataSourceKey:e,role:"primary"}],parameters:[],defaultFontFamily:"Segoe UI, Arial, sans-serif",repeatPerRow:!1,sections:ae.reduce((t,i)=>(t[i]={key:i,label:ke[i],heightMm:Ne[i],items:[]},t),{})}),Oe=e=>{if(!e||typeof e!="object")return null;const t=e,i=t.type;if(i!=="text"&&i!=="field"&&i!=="image"&&i!=="line"&&i!=="rectangle"&&i!=="table"&&i!=="list")return null;if(i==="text")return{...z(t,i),text:g(t.text)||"Text",expression:g(t.expression),canGrow:t.canGrow!==!1,canShrink:t.canShrink===!0};if(i==="field")return{...z(t,i),fieldKey:g(t.fieldKey),fallbackText:g(t.fallbackText),expression:g(t.expression),canGrow:t.canGrow!==!1,canShrink:t.canShrink===!0};if(i==="image")return{...z(t,i),sourceKind:t.sourceKind==="company_logo"||t.sourceKind==="field"?t.sourceKind:"url",url:g(t.url),fieldKey:g(t.fieldKey),expression:g(t.expression),fit:t.fit==="cover"||t.fit==="fill"?t.fit:"contain"};if(i==="line"||i==="rectangle")return z(t,i);if(i==="list"){const r=Array.isArray(t.items)?t.items.map(n=>We(n)).filter(n=>!!n):[];return{...z(t,i),datasetKey:g(t.datasetKey)||"main",sourcePath:g(t.sourcePath),rowHeightMm:L(B(G(t.rowHeightMm,20),8,120)),gapMm:L(B(G(t.gapMm,1),0,20)),showRowDivider:t.showRowDivider!==!1,zebraStriping:t.zebraStriping===!0,items:r}}const o=Array.isArray(t.columns)?t.columns.map(r=>Ae(r)).filter(r=>g(r.fieldKey).length>0):[];return{...z(t,i),datasetKey:g(t.datasetKey)||"main",columns:o,rowGroups:Array.isArray(t.rowGroups)?t.rowGroups.map(r=>Ge(r)).filter(r=>!!r):[],sorts:Array.isArray(t.sorts)?t.sorts.map(r=>Le(r)).filter(r=>!!r):[],showHeader:t.showHeader!==!1,showGrandTotal:t.showGrandTotal===!0,zebraStriping:t.zebraStriping!==!1}},qe=(e,t)=>{const i=t&&typeof t=="object"?t:{},o=Array.isArray(i.items)?i.items.map(Oe).filter(r=>!!r):[];return{key:e,label:ke[e],heightMm:L(B(G(i.heightMm,Ne[e]),10,400)),items:o}},Ue=(e,t="")=>{const i=_e(t);if(!e||typeof e!="object")return i;const o=e,r=Array.isArray(o.datasets)?o.datasets.map(s=>{const l=s,c=g(l.key)||"main";return{id:g(l.id)||j("ds"),key:c,label:g(l.label)||(c==="main"?"Main Dataset":c),dataSourceKey:g(l.dataSourceKey)||t,role:"primary"}}).filter(s=>s.key.length>0):i.datasets,n=Array.isArray(o.parameters)?o.parameters.map(s=>{const l=s,c=g(l.key);if(!c)return null;const d=l.dataType==="number"||l.dataType==="date"||l.dataType==="boolean"?l.dataType:"string";return{id:g(l.id)||j("param"),key:c,label:g(l.label)||c,dataType:d,defaultValue:g(l.defaultValue),required:l.required===!0}}).filter(s=>!!s):[],a=ae.reduce((s,l)=>{var c;return s[l]=qe(l,(c=o.sections)==null?void 0:c[l]),s},{});return{version:Me,datasets:r.length>0?r:i.datasets,parameters:n,defaultFontFamily:g(o.defaultFontFamily)||i.defaultFontFamily,repeatPerRow:o.repeatPerRow===!0,sections:a}},ze=e=>e?ae.some(t=>{var i;return(((i=e.sections[t])==null?void 0:i.items)??[]).length>0}):!1,At=e=>{if(!e)return[];const t=new Set,i=o=>{o.trim()&&V(o).forEach(r=>t.add(r))};return ae.forEach(o=>{var r;(((r=e.sections[o])==null?void 0:r.items)??[]).forEach(n=>{i(n.hiddenExpression),i(n.borderColorExpression),i(n.fillColorExpression),i(n.textColorExpression),i(n.fontWeightExpression),n.type==="field"&&n.fieldKey.trim()&&t.add(n.fieldKey.trim()),n.type==="text"&&n.expression.trim()&&V(n.expression).forEach(a=>t.add(a)),n.type==="field"&&n.expression.trim()&&V(n.expression).forEach(a=>t.add(a)),n.type==="table"&&(n.columns.forEach(a=>{a.fieldKey.trim()&&t.add(a.fieldKey.trim())}),n.rowGroups.forEach(a=>{a.fieldKey.trim()&&t.add(a.fieldKey.trim())}),n.sorts.forEach(a=>{a.fieldKey.trim()&&t.add(a.fieldKey.trim())})),n.type==="image"&&(n.fieldKey.trim()&&t.add(n.fieldKey.trim()),n.expression.trim()&&V(n.expression).forEach(a=>t.add(a))),n.type==="list"&&n.items.forEach(a=>{i(a.hiddenExpression),i(a.borderColorExpression),i(a.fillColorExpression),i(a.textColorExpression),i(a.fontWeightExpression),a.type==="field"&&a.fieldKey.trim()&&t.add(a.fieldKey.trim()),a.type==="image"&&(a.fieldKey.trim()&&t.add(a.fieldKey.trim()),a.expression.trim()&&V(a.expression).forEach(s=>t.add(s))),(a.type==="text"||a.type==="field")&&a.expression.trim()&&V(a.expression).forEach(s=>t.add(s))})})}),Array.from(t)},Ve=Te`
    query ReportTemplatePrintTemplates($moduleKey: String, $includeInactive: Boolean, $limit: Int) {
        reportTemplates(moduleKey: $moduleKey, includeInactive: $includeInactive, limit: $limit) {
            moduleKey
            usageKey
            dataSourceKey
            pageSettingsJson
            printSettingsJson
            selectedFieldsJson
            isDefaultFlag
        }
    }
`,Qe=Te`
    query ReportTemplatePrintDataSources($moduleKey: String) {
        reportDataSources(moduleKey: $moduleKey) {
            moduleKey
            dataSourceKey
            label
            fields {
                key
                label
                dataType
                path
            }
        }
    }
`,m=e=>(e==null?void 0:e.trim())??"",S=e=>m(e).toLowerCase(),O=e=>{if(e==null)return null;const t=Number(e);return Number.isFinite(t)?t:null},P=(e,t,i)=>Math.min(i,Math.max(t,e)),ge=(e,t)=>{const i=m(e);if(!i)return t;try{return JSON.parse(i)??t}catch{return t}},Je=e=>{const t=ge(e,[]);if(!Array.isArray(t))return[];const i=[];return t.forEach(o=>{if(typeof o=="string"){const d=m(o);d&&i.push({key:d});return}if(!o||typeof o!="object"||!("key"in o))return;const r=o,n=m(String(r.key??""));if(!n)return;const a=S(typeof r.align=="string"?r.align:""),s=a==="right"?"right":a==="center"?"center":a==="left"?"left":void 0,l=O(r.widthMm),c={key:n,includeTotal:r.includeTotal===!0||r.total===!0};typeof r.label=="string"&&(c.label=m(r.label)),typeof r.path=="string"&&(c.path=m(r.path)),typeof r.dataType=="string"&&(c.dataType=m(r.dataType)),s&&(c.align=s),l!=null&&(c.widthMm=P(l,8,120)),i.push(c)}),i},h=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),J="__REPORT_PAGE_NUMBER__",X="__REPORT_TOTAL_PAGES__",oe=e=>{const t=typeof e=="string"?e:String(e??"");if(!t.includes(J)&&!t.includes(X))return h(t);const i=new RegExp(`${J}|${X}`,"g");let o="",r=0,n=i.exec(t);for(;n;)o+=h(t.slice(r,n.index)),o+=n[0]===J?'<span class="definition-system-token definition-page-number"></span>':'<span class="definition-system-token definition-total-pages"></span>',r=n.index+n[0].length,n=i.exec(t);return o+=h(t.slice(r)),o},Ye=e=>e.split(J).join("99").split(X).join("99"),se=(e,t)=>e.expression.trim()?de(te({expression:e.expression,row:t.row,rows:t.rows,rowIndex:t.rowIndex,fieldTypes:t.fieldTypes,documentTitle:t.documentTitle,subtitle:t.subtitle,companyName:t.companyName,companyAddress:t.companyAddress,printSettings:t.printSettings})):e.text,le=(e,t)=>e.expression.trim()?de(te({expression:e.expression,row:t.row,rows:t.rows,rowIndex:t.rowIndex,fieldTypes:t.fieldTypes,documentTitle:t.documentTitle,subtitle:t.subtitle,companyName:t.companyName,companyAddress:t.companyAddress,printSettings:t.printSettings}))||e.fallbackText:(()=>{const i=re({fieldKey:e.fieldKey,row:t.row,documentTitle:t.documentTitle,subtitle:t.subtitle,companyName:t.companyName,companyAddress:t.companyAddress,printSettings:t.printSettings}),o=t.fieldTypes.get(S(e.fieldKey))??"string";return W(i,o)||e.fallbackText})(),Ze=(e,t,i,o)=>{const r=Ye(e||"");if(!r.trim())return o;const n=.352778,a=1.2,s=.8,l=i*n*1.18,c=Math.max(i*n*.5,.7),d=Math.max(t-a,4),p=Math.max(1,Math.floor(d/c)),w=r.split(/\r?\n/).reduce((u,f)=>u+Math.max(1,Math.ceil((f||" ").length/p)),0),v=s+w*l;return Math.max(o,Math.round(v*100)/100)},q=e=>{const t=Ze(e.display,e.widthMm,e.fontSizePt,1);return e.canGrow&&e.canShrink?Math.max(1,t):e.canGrow?Math.max(e.heightMm,t):e.canShrink?Math.max(1,Math.min(e.heightMm,t)):e.heightMm},ee=e=>{const t=m(e.hiddenExpression);if(!t)return!1;const i=te({expression:t,row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings});return i==="#Error"?!1:Z(i)},Re=e=>{const t=l=>{const c=m(l);if(!c)return"";const d=te({expression:c,row:e.context.row,rows:e.context.rows,rowIndex:e.context.rowIndex,fieldTypes:e.context.fieldTypes,documentTitle:e.context.documentTitle,subtitle:e.context.subtitle,companyName:e.context.companyName,companyAddress:e.context.companyAddress,printSettings:e.context.printSettings});return d==="#Error"||d==null?"":String(d).trim()},i=t(e.item.borderColorExpression)||e.item.borderColor,o=t(e.item.fillColorExpression)||e.item.fillColor,r=t(e.item.textColorExpression)||e.item.textColor,n=t(e.item.fontWeightExpression),a=S(n),s=a==="bold"||a==="700"||a==="true"||a==="1"||a==="yes"?"bold":a==="normal"||a==="400"||a==="false"||a==="0"||a==="no"?"normal":e.item.fontWeight;return{borderColor:i,fillColor:o,textColor:r,fontWeight:s}},Xe=(e,t)=>ee({hiddenExpression:e.hiddenExpression,row:t.row,rows:t.rows,rowIndex:t.rowIndex,fieldTypes:t.fieldTypes,documentTitle:t.documentTitle,subtitle:t.subtitle,companyName:t.companyName,companyAddress:t.companyAddress,printSettings:t.printSettings})?0:e.type==="text"?q({display:se(e,t),widthMm:e.widthMm,fontSizePt:e.fontSizePt,heightMm:e.heightMm,canGrow:e.canGrow,canShrink:e.canShrink}):e.type==="field"?q({display:le(e,t),widthMm:e.widthMm,fontSizePt:e.fontSizePt,heightMm:e.heightMm,canGrow:e.canGrow,canShrink:e.canShrink}):e.heightMm,be=e=>Math.max(e.item.rowHeightMm,e.item.items.reduce((t,i)=>{const o=Xe(i,{row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings});return o<=0?t:Math.max(t,i.yMm+o)},0)),H=(e,t)=>{const i=m(t);if(!i)return;const o=i.split(".").filter(Boolean);if(!o.length)return;let r=e;for(const n of o){if(r==null||typeof r!="object")return;r=r[n]}return r},W=(e,t)=>{if(e==null)return"";if(e instanceof Date)return e.toLocaleDateString("en-GB");const i=S(t);if(i==="boolean")return e?"Yes":"No";if(i==="number"){const o=Number(e);if(Number.isFinite(o)){const r=Math.abs(o%1)<1e-6;return o.toLocaleString(void 0,{minimumFractionDigits:r?0:2,maximumFractionDigits:2})}}return String(e)},et=e=>{const t=[];let i=0;for(;i<e.length;){const o=e[i];if(/\s/.test(o)){i+=1;continue}if(o==="("||o===")"){t.push({type:"paren",value:o}),i+=1;continue}if(o===","){t.push({type:"comma"}),i+=1;continue}if(o==='"'||o==="'"){const r=o;i+=1;let n="";for(;i<e.length;){const a=e[i];if(a==="\\"){n+=e[i+1]??"",i+=2;continue}if(a===r){i+=1;break}n+=a,i+=1}t.push({type:"string",value:n});continue}if(/[0-9.-]/.test(o)){let r=o;for(i+=1;i<e.length&&/[0-9.]/.test(e[i]);)r+=e[i],i+=1;const n=Number(r);if(Number.isFinite(n)){t.push({type:"number",value:n});continue}}if(/[A-Za-z_$]/.test(o)){let r=o;for(i+=1;i<e.length&&/[A-Za-z0-9_$.]/.test(e[i]);)r+=e[i],i+=1;const n=S(r);if(n==="true"){t.push({type:"boolean",value:!0});continue}if(n==="false"){t.push({type:"boolean",value:!1});continue}if(n==="null"){t.push({type:"null"});continue}t.push({type:"identifier",value:r});continue}throw new Error(`Unsupported character "${o}" in expression.`)}return t},tt=e=>{const t=m(e).replace(/^=/,"").trim();if(!t)throw new Error("Empty expression.");const i=et(t);let o=0;const r=()=>{const a=i[o];if(!a)throw new Error("Unexpected end of expression.");if(a.type==="string")return o+=1,{kind:"string",value:a.value};if(a.type==="number")return o+=1,{kind:"number",value:a.value};if(a.type==="boolean")return o+=1,{kind:"boolean",value:a.value};if(a.type==="null")return o+=1,{kind:"null"};if(a.type==="identifier"){o+=1;const s=i[o];if((s==null?void 0:s.type)==="paren"&&s.value==="("){o+=1;const l=[];for(;o<i.length;){const c=i[o];if((c==null?void 0:c.type)==="paren"&&c.value===")"){o+=1;break}l.push(r());const d=i[o];if((d==null?void 0:d.type)==="comma"){o+=1;continue}if((d==null?void 0:d.type)==="paren"&&d.value===")"){o+=1;break}throw new Error('Expected "," or ")" in expression.')}return{kind:"call",name:a.value,args:l}}return{kind:"identifier",name:a.value}}throw new Error("Invalid expression token.")},n=r();if(o!==i.length)throw new Error("Unexpected trailing expression tokens.");return n},U=e=>e==null?"":typeof e=="string"?e:String(e),Z=e=>{if(typeof e=="boolean")return e;if(typeof e=="number")return e!==0;if(typeof e=="string"){const t=S(e);return!(!t||t==="false"||t==="0"||t==="no"||t==="null")}return!!e},Q=(e,t)=>{const i=Number(e),o=Number(t);if(Number.isFinite(i)&&Number.isFinite(o))return i===o?0:i>o?1:-1;const r=m(e==null?"":String(e)),n=m(t==null?"":String(t));return r.localeCompare(n,"en",{sensitivity:"base"})},de=e=>e==null?"":e instanceof Date?e.toLocaleDateString("en-GB"):typeof e=="number"?W(e,"number"):typeof e=="boolean"?W(e,"boolean"):Array.isArray(e)?e.map(t=>de(t)).join(", "):String(e),it=e=>{if(!e||typeof e!="object")return null;const t=e,i=t.type;if(i!=="text"&&i!=="field"&&i!=="line"&&i!=="box")return null;const o=m(String(t.id??""));if(!o)return null;const r=Number(t.xMm??0),n=Number(t.yMm??0),a=Number(t.widthMm??1),s=Number(t.heightMm??1);return!Number.isFinite(r)||!Number.isFinite(n)||!Number.isFinite(a)||!Number.isFinite(s)?null:{id:o,type:i,xMm:r,yMm:n,widthMm:Math.max(1,a),heightMm:Math.max(1,s),text:typeof t.text=="string"?t.text:void 0,fieldKey:typeof t.fieldKey=="string"?t.fieldKey:void 0,fontSizePt:Number.isFinite(Number(t.fontSizePt))?Number(t.fontSizePt):void 0,fontWeight:t.fontWeight==="bold"?"bold":t.fontWeight==="normal"?"normal":void 0,textAlign:t.textAlign==="center"||t.textAlign==="right"||t.textAlign==="left"?t.textAlign:void 0,borderWidth:Number.isFinite(Number(t.borderWidth))?Number(t.borderWidth):void 0}},nt=e=>{if(!e||typeof e!="object")return null;const t=e,i=Array.isArray(t.elements)?t.elements.map(it).filter(r=>!!r):[];if(!i.length)return null;const o=Number(t.version??1);return{version:Number.isFinite(o)&&o>0?o:1,elements:i}},He=e=>{var c,d,p,w;const t=ge(e,{}),i=S(t.pageSize),o=i==="a5"?"A5":i==="letter"?"Letter":i==="legal"?"Legal":"A4",r=S(t.orientation)==="landscape"?"landscape":"portrait",n=P(O((c=t.margins)==null?void 0:c.top)??12,0,50),a=P(O((d=t.margins)==null?void 0:d.right)??12,0,50),s=P(O((p=t.margins)==null?void 0:p.bottom)??18,0,50),l=P(O((w=t.margins)==null?void 0:w.left)??12,0,50);return{pageSize:o,orientation:r,margins:{top:n,right:a,bottom:s,left:l},layout:nt(t.layout),reportDefinition:Ue(t.reportDefinition)}},De=e=>{const t=ge(e,{}),i=m(typeof t.headerText=="string"?t.headerText:""),o=m(typeof t.footerText=="string"?t.footerText:"")||"Page",r=t.showCompanyHeader!==!1,n=!!t.showRowNumbers,a=S(typeof t.renderMode=="string"?t.renderMode:""),s=a==="legacy_invoice_ledger"?"legacy_invoice_ledger":a==="legacy_loading_sheet"?"legacy_loading_sheet":"standard",l=m(typeof t.companyNameOverride=="string"?t.companyNameOverride:""),c=m(typeof t.companyAddressOverride=="string"?t.companyAddressOverride:""),d=m(typeof t.companyLogoUrl=="string"?t.companyLogoUrl:""),p=P(O(t.companyLogoWidthMm)??18,8,80),w=S(typeof t.companyHeaderAlign=="string"?t.companyHeaderAlign:""),v=w==="left"?"left":w==="right"?"right":"center",u=P(O(t.companyNameFontSizePt)??15,8,28),f=P(O(t.companyAddressFontSizePt)??11,7,20),b=t.showHeaderDivider===!0,y=t.showTotalsRow===!0;return{headerText:i,footerText:o,showCompanyHeader:r,showRowNumbers:n,renderMode:s,companyNameOverride:l,companyAddressOverride:c,companyLogoUrl:d,companyLogoWidthMm:p,companyHeaderAlign:v,companyNameFontSizePt:u,companyAddressFontSizePt:f,showHeaderDivider:b,showTotalsRow:y}},ot=(e,t)=>{if(!e.length)return null;const i=t.map(o=>S(o)).filter(Boolean);for(const o of i){const r=e.filter(n=>S(n.usageKey)===o);if(r.length)return r.find(n=>!!n.isDefaultFlag)??r[0]}return e.find(o=>!!o.isDefaultFlag)??e[0]},rt=(e,t,i)=>{if(!e.length)return null;const o=S(t),r=e.filter(s=>S(s.moduleKey)===o),n=r.length?r:e,a=S(i);if(a){const s=n.find(l=>S(l.dataSourceKey)===a);if(s)return s}return n[0]??null},at=(e,t)=>{const i=Array.isArray(e.fields)?e.fields:[];if(!i.length)return[];const o=new Map;i.forEach(l=>{const c=S(l.key);!c||o.has(c)||o.set(c,l)});const r=i.slice(0,8).map(l=>({key:l.key})),n=t.length?t:r,a=new Set,s=[];return n.forEach(l=>{const c=m(l.key),d=S(c);if(!d||a.has(d))return;const p=o.get(d);if(!p)return;a.add(d);const w=m(l.dataType)||m(p.dataType)||"string",u=l.align??(S(w)==="number"?"right":"left");s.push({key:m(p.key),label:m(l.label)||m(p.label)||m(p.key),dataType:w,path:m(l.path)||m(p.path)||m(p.key),align:u,widthMm:l.widthMm!=null?P(l.widthMm,8,120):null,includeTotal:l.includeTotal===!0})}),s},st={A4:{width:210,height:297},A5:{width:148,height:210},Letter:{width:216,height:279},Legal:{width:216,height:356}},ne=e=>{const t=m(e);return t&&(t.startsWith("data:image/")||t.startsWith("https://")||t.startsWith("http://")||t.startsWith("/"))?t:""},lt=e=>{const t=m(e);return t&&/^[A-Za-z0-9\s"',-]+$/.test(t)?t:"Segoe UI, Arial, sans-serif"},ce=e=>{const t=m(e.printSettings.companyNameOverride)||m(e.companyName),i=m(e.printSettings.companyAddressOverride)||m(e.companyAddress),o=ne(e.printSettings.companyLogoUrl);if(!e.printSettings.showCompanyHeader)return{html:"",hasContent:!1};if(!t&&!i&&!o)return{html:"",hasContent:!1};const r=e.printSettings.companyHeaderAlign==="left"?"company-header--left":e.printSettings.companyHeaderAlign==="right"?"company-header--right":"company-header--center",n=e.printSettings.showHeaderDivider?'<div class="company-header-divider"></div>':"",a=o?`<img class="company-logo" src="${h(o)}" alt="Company Logo" style="width:${e.printSettings.companyLogoWidthMm}mm;" />`:"";return{html:`
      <div class="company-header ${r}">
        <div class="company-header-row">
          ${a}
          <div class="company-header-text">
            ${t?`<div class="company-name" style="font-size:${e.printSettings.companyNameFontSizePt}pt;">${h(t)}</div>`:""}
            ${i?`<div class="company-address" style="font-size:${e.printSettings.companyAddressFontSizePt}pt;">${h(i)}</div>`:""}
          </div>
        </div>
        ${n}
      </div>
    `,hasContent:!0}},dt=e=>{const t=m(e.printSettings.headerText)||m(e.documentTitle)||"Report",i=m(e.subtitle),o=ce({companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}),r=[e.printSettings.showRowNumbers?'<th class="row-index-cell">#</th>':"",...e.columns.map(l=>{const c=l.widthMm!=null?` style="width:${l.widthMm}mm"`:"";return`<th class="${(l.align==="right"?" col-align-right":l.align==="center"?" col-align-center":" col-align-left").trim()}"${c}>${h(l.label)}</th>`})].join(""),n=e.rows.map((l,c)=>{const d=e.columns.map(w=>{const v=H(l,w.path),u=v!==void 0?v:H(l,w.key),f=W(u,w.dataType);return`<td class="${w.align==="right"?"col-align-right":w.align==="center"?"col-align-center":"col-align-left"}">${h(f)}</td>`}).join("");return`<tr>${e.printSettings.showRowNumbers?`<td class="row-index-cell">${c+1}</td>`:""}${d}</tr>`}).join(""),a=e.printSettings.showTotalsRow&&e.rows.length>0,s=(()=>{if(!a)return"";let l=!1;const c=e.columns.map(p=>{const w=S(p.dataType)==="number",v=p.includeTotal||w,u=p.align==="right"?"col-align-right":p.align==="center"?"col-align-center":"col-align-left";if(!v)return l?`<td class="${u}"></td>`:(l=!0,`<td class="${u} totals-label-cell"><strong>Total</strong></td>`);const f=e.rows.reduce((y,N)=>{const $=H(N,p.path)??H(N,p.key),x=Number($);return Number.isFinite(x)?y+x:y},0),b=W(f,"number");return`<td class="${u}"><strong>${h(b)}</strong></td>`}).join("");return`<tr class="totals-row">${e.printSettings.showRowNumbers?'<td class="row-index-cell"></td>':""}${c}</tr>`})();return`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${h(m(e.documentTitle)||"Report")}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #475569;
        --line: #dbe2ea;
        --head-bg: #eef3f8;
        --zebra-bg: #f8fafc;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${e.pageSettings.pageSize} ${e.pageSettings.orientation};
        margin: ${e.pageSettings.margins.top}mm ${e.pageSettings.margins.right}mm ${e.pageSettings.margins.bottom}mm ${e.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 11px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header {
        margin-bottom: 4px;
      }
      .company-header-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .company-header--left .company-header-row {
        justify-content: flex-start;
      }
      .company-header--center .company-header-row {
        justify-content: center;
      }
      .company-header--right .company-header-row {
        justify-content: flex-end;
      }
      .company-header-text {
        display: flex;
        flex-direction: column;
      }
      .company-name {
        font-weight: 700;
      }
      .company-address {
        margin-top: 1px;
        color: var(--muted);
      }
      .company-logo {
        max-height: 24mm;
        object-fit: contain;
      }
      .company-header-divider {
        margin-top: 2px;
        border-top: 1px solid #d3dde8;
      }
      .report-title {
        text-align: center;
        font-weight: 700;
        font-size: 13px;
        margin: 0 0 3px;
      }
      .report-subtitle {
        text-align: center;
        color: var(--muted);
        margin: 0 0 8px;
        white-space: pre-line;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
        padding: 5px 6px;
      }
      thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      tbody tr:nth-child(even) td {
        background: var(--zebra-bg);
      }
      .row-index-cell {
        width: 34px;
        text-align: right;
      }
      .col-align-left { text-align: left; }
      .col-align-center { text-align: center; }
      .col-align-right { text-align: right; }
      .totals-row td {
        background: #e8eef6 !important;
        border-top: 2px solid #9fb3ca;
      }
      .totals-label-cell {
        font-weight: 700;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 10px;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${o.html}
    <h1 class="report-title">${h(t)}</h1>
    ${i?`<p class="report-subtitle">${h(i)}</p>`:""}
    <div class="report-footer">${h(e.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
    <table>
      <thead>
        <tr>${r}</tr>
      </thead>
      <tbody>
        ${n}
        ${s}
      </tbody>
    </table>
  </body>
</html>`},ct=e=>{const t=m(e.printSettings.headerText)||m(e.documentTitle)||"Report",i=m(e.subtitle),o=ce({companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}),r=st[e.pageSettings.pageSize],n=e.pageSettings.orientation==="landscape"?r.height:r.width,a=e.pageSettings.orientation==="landscape"?r.width:r.height,s=Math.max(20,n-e.pageSettings.margins.left-e.pageSettings.margins.right),l=Math.max(30,a-e.pageSettings.margins.top-e.pageSettings.margins.bottom),c=e.layout.elements.reduce((v,u)=>Math.max(v,Number(u.yMm||0)+Number(u.heightMm||0)),0),d=Math.max(l,c+4),p=new Map(e.columns.map(v=>[S(v.key),v.dataType])),w=e.rows.map((v,u)=>{const f=e.layout.elements.map(y=>{const N=Number(y.xMm??0),$=Number(y.yMm??0),x=Math.max(1,Number(y.widthMm??1)),T=Math.max(1,Number(y.heightMm??1)),D=P(Number(y.fontSizePt??10),6,28),K=y.fontWeight==="bold"?"700":"400",C=y.textAlign==="center"||y.textAlign==="right"?y.textAlign:"left",F=P(Number(y.borderWidth??0),0,3),E=["position:absolute",`left:${N}mm`,`top:${$}mm`,`width:${x}mm`,`height:${T}mm`,`font-size:${D}pt`,`font-weight:${K}`,`text-align:${C}`,"overflow:hidden","white-space:nowrap","text-overflow:ellipsis"];if(y.type==="line")return E.push(`border-top:${Math.max(.5,F||1)}pt solid #1f2937`),E.push("height:0"),`<div class="layout-element layout-line" style="${E.join(";")}"></div>`;y.type==="box"?E.push(`border:${Math.max(.5,F||1)}pt solid #1f2937`):F>0&&E.push(`border:${F}pt solid #334155`),E.push("padding:0.3mm 0.6mm");let I="";if(y.type==="text")I=m(y.text);else if(y.type==="field"){const ie=m(y.fieldKey),pe=H(v,ie),ue=p.get(S(ie))??"string";I=W(pe,ue)}return`<div class="layout-element layout-${h(y.type)}" style="${E.join(";")}">${h(I)}</div>`}).join(""),b=e.rows.length>1?`${i?`${i} | `:""}Record ${u+1} of ${e.rows.length}`:i;return`
        <section class="layout-page">
          ${o.html}
          <h1 class="report-title">${h(t)}</h1>
          ${b?`<p class="report-subtitle">${h(b)}</p>`:""}
          <div class="layout-canvas">${f}</div>
        </section>
      `}).join("");return`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${h(m(e.documentTitle)||"Report")}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #475569;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${e.pageSettings.pageSize} ${e.pageSettings.orientation};
        margin: ${e.pageSettings.margins.top}mm ${e.pageSettings.margins.right}mm ${e.pageSettings.margins.bottom}mm ${e.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 10pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header {
        margin-bottom: 1.5mm;
      }
      .company-header-row {
        display: flex;
        align-items: center;
        gap: 2mm;
      }
      .company-header--left .company-header-row {
        justify-content: flex-start;
      }
      .company-header--center .company-header-row {
        justify-content: center;
      }
      .company-header--right .company-header-row {
        justify-content: flex-end;
      }
      .company-header-text {
        display: flex;
        flex-direction: column;
      }
      .company-name {
        font-weight: 700;
      }
      .company-address {
        margin-top: 0.8mm;
        color: var(--muted);
      }
      .company-logo {
        max-height: 24mm;
        object-fit: contain;
      }
      .company-header-divider {
        margin-top: 1mm;
        border-top: 1px solid #d3dde8;
      }
      .report-title {
        margin: 0 0 1mm;
        text-align: center;
        font-size: 12pt;
      }
      .report-subtitle {
        margin: 0 0 2mm;
        text-align: center;
        color: var(--muted);
        font-size: 9pt;
      }
      .layout-page {
        page-break-after: always;
      }
      .layout-page:last-of-type {
        page-break-after: auto;
      }
      .layout-canvas {
        position: relative;
        width: ${s}mm;
        min-height: ${d}mm;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${w}
    <div class="report-footer">${h(e.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
  </body>
</html>`},me=e=>!e||typeof e!="object"?{}:e,k=e=>m(typeof e=="string"?e:String(e??"")),R=e=>{const t=Number(e);return Number.isFinite(t)?t:0},A=e=>{const t=R(e);return Number.isFinite(t)?t.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2}):""},_=e=>{const t=R(e);return Number.isFinite(t)?Math.abs(t%1)<1e-6?String(Math.trunc(t)):t.toLocaleString(void 0,{minimumFractionDigits:0,maximumFractionDigits:3}):""},he=e=>{const t=m(e);return t?h(t).replace(/\n+/g,"<br />"):""},mt=e=>{const t=e.lines;return Array.isArray(t)?t.map((i,o)=>{const r=me(i);return{sNo:Math.max(1,Math.trunc(R(r.sNo||o+1))),item:k(r.item),itemF:k(r.itemF),remark:k(r.remark),typeDetails:k(r.typeDetails),taxRate:R(r.taxRate),mrp:R(r.mrp),qty:R(r.qty),unitQ:k(r.unitQ),free:R(r.free),unitF:k(r.unitF),productDiscAmt:R(r.productDiscAmt),rate:R(r.rate),qtyxRate:R(r.qtyxRate)}}).filter(i=>i.item||Math.abs(i.qty)>1e-6||Math.abs(i.qtyxRate)>1e-6):[]},pt=e=>{const t=e.item||"Item",o=[e.remark?`${t} (${e.remark})`:t];return e.typeDetails&&o.push(e.typeDetails),e.free>0&&e.itemF&&S(e.itemF)!==S(t)&&o.push(e.itemF),o.map(r=>h(r)).join("<br />")},ut=e=>{const t=m(e.printSettings.headerText)||m(e.documentTitle)||"Invoice",i=m(e.subtitle),o=ce({companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}),r=e.rows.map((n,a)=>{const s=me(n),l=mt(s);if(!l.length)return"";const c=k(s.voucherNumber),d=k(s.voucherDateText),p=k(s.ledger),w=k(s.address1),v=k(s.city),u=k(s.tinNo),f=k(s.amountInWords),b=k(s.taxs),y=k(s.addAmts),N=k(s.taxableAmts),$=k(s.creditNoteText),x=k(s.debitNoteText),T=k(s.irn),D=R(s.totalTaxationAmt),K=R(s.totalAdditionalTaxAmt),C=k(s.ledgerAdditionalTax),F=l.some(M=>Math.abs(M.productDiscAmt)>1e-6),E=`
              <tr>
                <th class="col-sno">S.No.</th>
                <th class="col-item">Item</th>
                <th class="col-tax">Tax %</th>
                <th class="col-num">MRP</th>
                <th class="col-num">Qty</th>
                <th class="col-num">Free</th>
                ${F?'<th class="col-num">Scheme</th>':""}
                <th class="col-num">Rate</th>
                <th class="col-num">Qty x Rate</th>
              </tr>
            `,I=l.map(M=>{const Ie=[_(M.qty),M.unitQ].filter(Boolean).join(" ").trim(),Pe=M.free>0?[_(M.free),M.unitF].filter(Boolean).join(" ").trim():"",Be=M.productDiscAmt>0?A(M.productDiscAmt):"";return`
                  <tr>
                    <td class="col-sno">${h(String(M.sNo))}</td>
                    <td class="col-item">${pt(M)}</td>
                    <td class="col-tax col-num">${Math.abs(M.taxRate)>1e-6?A(M.taxRate):""}</td>
                    <td class="col-num">${Math.abs(M.mrp)>1e-6?A(M.mrp):""}</td>
                    <td class="col-num">${h(Ie)}</td>
                    <td class="col-num">${h(Pe)}</td>
                    ${F?`<td class="col-num">${h(Be)}</td>`:""}
                    <td class="col-num">${A(M.rate)}</td>
                    <td class="col-num">${A(M.qtyxRate)}</td>
                  </tr>
                `}).join(""),ie=["Amount","Scheme","Ext. Sch.","Replacement","CD","Sp. Less","Gross Amt"],pe=[A(s.totalQtyxRate),A(s.totalProDisAmt),A(s.totalDisplayAmt),A(s.totalReplacementAmt),A(s.totalCashDisAmt),A(s.totalLessSpecialAmt),A(s.totalGrossAmt)],ue=K>0?`GST / ${C||"Additional Tax"}`:"GST",Ce=K>0?`${A(D)} / ${A(K)}`:A(D),Se=T?`IRN: ${T}`:a<e.rows.length-1?"Continued...":"";return`
          <section class="legacy-invoice-page">
            ${o.html}
            <h1 class="legacy-title">${h(t)}</h1>
            ${i?`<p class="legacy-subtitle">${h(i)}</p>`:""}
            <div class="legacy-header-grid">
              <div class="legacy-header-cell">
                <div class="legacy-label">Party</div>
                <div class="legacy-value legacy-value-bold">${h(p)}</div>
                <div class="legacy-value">${h([w,v].filter(Boolean).join(", "))}</div>
              </div>
              <div class="legacy-header-cell legacy-header-cell--right">
                <div class="legacy-label">Invoice No</div>
                <div class="legacy-value legacy-value-bold">${h(c)}</div>
                <div class="legacy-label">Date: <span class="legacy-value">${h(d)}</span></div>
                ${u?`<div class="legacy-label">GSTIN: <span class="legacy-value">${h(u)}</span></div>`:""}
              </div>
            </div>
            <table class="legacy-lines-table">
              <thead>${E}</thead>
              <tbody>${I}</tbody>
            </table>
            <div class="legacy-summary-grid">
              ${ie.map(M=>`<div class="legacy-summary-head-cell">${h(M)}</div>`).join("")}
              ${pe.map(M=>`<div class="legacy-summary-value-cell">${h(M)}</div>`).join("")}
              <div class="legacy-summary-head-cell">${h(ue)}</div>
              <div class="legacy-summary-value-cell legacy-summary-value-cell--wide">${h(Ce)}</div>
              <div class="legacy-summary-head-cell">Net Amt</div>
              <div class="legacy-summary-value-cell legacy-summary-value-cell--net">${h(A(s.totalNetAmt))}</div>
            </div>
            <div class="legacy-footer-grid">
              <div class="legacy-tax-breakup">
                <div class="legacy-tax-col">
                  <div class="legacy-tax-title">Tax</div>
                  <div class="legacy-tax-value">${he(b)}</div>
                </div>
                <div class="legacy-tax-col">
                  <div class="legacy-tax-title">Add Amt</div>
                  <div class="legacy-tax-value legacy-tax-value--right">${he(y)}</div>
                </div>
                <div class="legacy-tax-col">
                  <div class="legacy-tax-title">Taxable Amt</div>
                  <div class="legacy-tax-value legacy-tax-value--right">${he(N)}</div>
                </div>
              </div>
              <div class="legacy-words">${h(f)}</div>
            </div>
            ${[$,x].filter(Boolean).map(M=>`<div class="legacy-note-line">${h(M)}</div>`).join("")||""}
            ${Se?`<div class="legacy-irn">${h(Se)}</div>`:""}
          </section>
        `}).join("");return`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${h(m(e.documentTitle)||"Invoice")}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #cfd8e3;
        --head-bg: #eef3f8;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${e.pageSettings.pageSize} ${e.pageSettings.orientation};
        margin: ${e.pageSettings.margins.top}mm ${e.pageSettings.margins.right}mm ${e.pageSettings.margins.bottom}mm ${e.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Courier New", Courier, monospace;
        font-size: 8.5pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header { margin-bottom: 2mm; }
      .company-header-row { display: flex; align-items: center; gap: 2mm; }
      .company-header--left .company-header-row { justify-content: flex-start; }
      .company-header--center .company-header-row { justify-content: center; }
      .company-header--right .company-header-row { justify-content: flex-end; }
      .company-header-text { display: flex; flex-direction: column; }
      .company-name { font-weight: 700; }
      .company-address { margin-top: 0.7mm; color: var(--muted); }
      .company-logo { max-height: 24mm; object-fit: contain; }
      .company-header-divider { margin-top: 1mm; border-top: 1px solid #d3dde8; }
      .legacy-invoice-page {
        page-break-after: always;
        padding-bottom: 2mm;
      }
      .legacy-invoice-page:last-of-type {
        page-break-after: auto;
      }
      .legacy-title {
        margin: 0 0 1mm;
        text-align: center;
        font-size: 11pt;
      }
      .legacy-subtitle {
        margin: 0 0 1.5mm;
        text-align: center;
        color: var(--muted);
        font-size: 8pt;
      }
      .legacy-header-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2mm;
        margin-bottom: 1.5mm;
      }
      .legacy-header-cell {
        border: 1px solid var(--line);
        padding: 1mm 1.2mm;
        min-height: 14mm;
      }
      .legacy-header-cell--right {
        text-align: right;
      }
      .legacy-label {
        color: var(--muted);
        font-size: 8pt;
      }
      .legacy-value {
        margin-top: 0.2mm;
      }
      .legacy-value-bold {
        font-weight: 700;
      }
      .legacy-lines-table {
        width: 100%;
        border-collapse: collapse;
      }
      .legacy-lines-table th,
      .legacy-lines-table td {
        border: 1px solid var(--line);
        padding: 0.8mm 1mm;
        vertical-align: top;
      }
      .legacy-lines-table thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      .legacy-lines-table .col-sno {
        width: 6%;
        text-align: right;
      }
      .legacy-lines-table .col-item {
        width: 35%;
      }
      .legacy-lines-table .col-tax {
        width: 8%;
      }
      .legacy-lines-table .col-num {
        text-align: right;
        white-space: nowrap;
      }
      .legacy-summary-grid {
        margin-top: 1.5mm;
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        border: 1px solid var(--line);
        border-right: none;
        border-bottom: none;
      }
      .legacy-summary-head-cell,
      .legacy-summary-value-cell {
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        padding: 0.8mm 1mm;
      }
      .legacy-summary-head-cell {
        background: var(--head-bg);
        font-weight: 700;
        text-align: center;
      }
      .legacy-summary-value-cell {
        text-align: right;
      }
      .legacy-summary-value-cell--wide {
        grid-column: span 3;
      }
      .legacy-summary-value-cell--net {
        font-weight: 700;
        font-size: 10pt;
      }
      .legacy-footer-grid {
        margin-top: 1.5mm;
        display: grid;
        grid-template-columns: 45% 55%;
        gap: 1.5mm;
      }
      .legacy-tax-breakup {
        display: grid;
        grid-template-columns: 32% 34% 34%;
        border: 1px solid var(--line);
        min-height: 14mm;
      }
      .legacy-tax-col {
        border-right: 1px solid var(--line);
      }
      .legacy-tax-col:last-child {
        border-right: none;
      }
      .legacy-tax-title {
        background: var(--head-bg);
        border-bottom: 1px solid var(--line);
        padding: 0.7mm 0.9mm;
        font-weight: 700;
      }
      .legacy-tax-value {
        padding: 0.9mm;
        white-space: pre-line;
      }
      .legacy-tax-value--right {
        text-align: right;
      }
      .legacy-words {
        border: 1px solid var(--line);
        padding: 1mm 1.2mm;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        text-align: right;
        font-weight: 700;
      }
      .legacy-note-line {
        margin-top: 1mm;
      }
      .legacy-irn {
        margin-top: 1mm;
        text-align: center;
        color: var(--muted);
        font-size: 7.5pt;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${r}
    <div class="report-footer">${h(e.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
  </body>
</html>`},ft=e=>{const t=m(e.printSettings.headerText)||m(e.documentTitle)||"Loading Sheet",i=m(e.subtitle),o=ce({companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}),r=e.rows.map((c,d)=>{const p=me(c);return{sNo:d+1,item:k(p.item),typeDetails:k(p.typeDetails),mrp:R(p.mrp),qty:R(p.qty),free:R(p.free),totalQty:R(p.totalQty),netAmt:R(p.netAmt),invoices:k(p.invoices)}}),n=r.reduce((c,d)=>({qty:c.qty+d.qty,free:c.free+d.free,totalQty:c.totalQty+d.totalQty,netAmt:c.netAmt+d.netAmt}),{qty:0,free:0,totalQty:0,netAmt:0}),a=Array.from(new Set(r.flatMap(c=>c.invoices.split(",").map(d=>m(d)).filter(Boolean)))).join(", "),s=r.map(c=>`
          <tr>
            <td class="col-sno">${c.sNo}</td>
            <td class="col-item">${h(c.item)}${c.typeDetails?`<br /><span class="type-details">${h(c.typeDetails)}</span>`:""}</td>
            <td class="col-num">${Math.abs(c.mrp)>1e-6?A(c.mrp):""}</td>
            <td class="col-num">${_(c.qty)}</td>
            <td class="col-num">${_(c.free)}</td>
            <td class="col-num">${_(c.totalQty)}</td>
            <td class="col-num">${A(c.netAmt)}</td>
          </tr>
        `).join(""),l=`
      <section class="legacy-loading-page">
        ${o.html}
        <h1 class="legacy-loading-title">${h(t)}</h1>
        ${i?`<p class="legacy-loading-subtitle">${h(i)}</p>`:""}
        <table class="legacy-loading-table">
          <thead>
            <tr>
              <th class="col-sno">S. No.</th>
              <th class="col-item">Item</th>
              <th class="col-num">MRP</th>
              <th class="col-num">Qty</th>
              <th class="col-num">Free</th>
              <th class="col-num">Total Qty</th>
              <th class="col-num">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${s}
            <tr class="total-row">
              <td></td>
              <td class="col-item"><strong>Total</strong></td>
              <td></td>
              <td class="col-num"><strong>${h(_(n.qty))}</strong></td>
              <td class="col-num"><strong>${h(_(n.free))}</strong></td>
              <td class="col-num"><strong>${h(_(n.totalQty))}</strong></td>
              <td class="col-num"><strong>${h(A(n.netAmt))}</strong></td>
            </tr>
            <tr class="invoice-row">
              <td></td>
              <td class="col-item"><strong>Invoices</strong><br /><span class="type-details">${h(a||"-")}</span></td>
              <td colspan="5"></td>
            </tr>
          </tbody>
        </table>
      </section>
    `;return`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${h(m(e.documentTitle)||"Loading Sheet")}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #cfd8e3;
        --head-bg: #eef3f8;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${e.pageSettings.pageSize} ${e.pageSettings.orientation};
        margin: ${e.pageSettings.margins.top}mm ${e.pageSettings.margins.right}mm ${e.pageSettings.margins.bottom}mm ${e.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 10px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .company-header { margin-bottom: 4px; }
      .company-header-row { display: flex; align-items: center; gap: 8px; }
      .company-header--left .company-header-row { justify-content: flex-start; }
      .company-header--center .company-header-row { justify-content: center; }
      .company-header--right .company-header-row { justify-content: flex-end; }
      .company-header-text { display: flex; flex-direction: column; }
      .company-name { font-weight: 700; }
      .company-address { margin-top: 1px; color: var(--muted); }
      .company-logo { max-height: 24mm; object-fit: contain; }
      .company-header-divider { margin-top: 2px; border-top: 1px solid #d3dde8; }
      .legacy-loading-page {
        page-break-after: always;
      }
      .legacy-loading-page:last-of-type {
        page-break-after: auto;
      }
      .legacy-loading-title {
        margin: 0;
        text-align: center;
        font-size: 14px;
      }
      .legacy-loading-subtitle {
        margin: 2px 0 8px;
        text-align: center;
        color: var(--muted);
      }
      .legacy-loading-table {
        width: 100%;
        border-collapse: collapse;
      }
      .legacy-loading-table th,
      .legacy-loading-table td {
        border: 1px solid var(--line);
        padding: 5px 6px;
      }
      .legacy-loading-table thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      .legacy-loading-table .col-sno {
        width: 48px;
        text-align: right;
      }
      .legacy-loading-table .col-item {
        width: 36%;
      }
      .legacy-loading-table .col-num {
        text-align: right;
        white-space: nowrap;
      }
      .legacy-loading-table .type-details {
        color: var(--muted);
      }
      .legacy-loading-table .total-row td {
        background: #eef4fb;
      }
      .legacy-loading-table .invoice-row td {
        background: #f8fbff;
      }
      .report-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
      }
      .report-footer-page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    ${l}
    <div class="report-footer">${h(e.printSettings.footerText)} <span class="report-footer-page-number"></span></div>
  </body>
</html>`},re=e=>{const t=S(e.fieldKey);if(t)return t==="$companyname"||t==="companyname"?m(e.printSettings.companyNameOverride)||m(e.companyName):t==="$companyaddress"||t==="companyaddress"?m(e.printSettings.companyAddressOverride)||m(e.companyAddress):t==="$documenttitle"||t==="documenttitle"?m(e.documentTitle):t==="$subtitle"||t==="subtitle"?m(e.subtitle):t==="$pagenumber"||t==="pagenumber"?J:t==="$totalpages"||t==="totalpages"?X:H(e.row,e.fieldKey)},Ke=e=>{if(e.sourceKind==="company_logo")return ne(e.printSettings.companyLogoUrl);if(e.sourceKind==="field"){const t=e.expression.trim()?te({expression:e.expression,row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}):re({fieldKey:e.fieldKey,row:e.row,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings});return ne(U(t))}return ne(e.url)},te=e=>{const t=m(e.expression);if(!t)return;const i=tt(t),o=r=>{if(r.kind==="string"||r.kind==="number"||r.kind==="boolean")return r.value;if(r.kind==="null")return null;if(r.kind==="identifier")return re({fieldKey:r.name,row:e.row,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings});const n=S(r.name),a=r.args.map(d=>o(d)),s=r.args[0]?r.args[0].kind==="identifier"?m(r.args[0].name):r.args[0].kind==="string"?m(r.args[0].value):m(U(a[0])):"",l=d=>e.fieldTypes.get(S(d))??"string",c=d=>d?e.rows.map(p=>H(p,d)):[];if(n==="field"||n==="fields")return s?re({fieldKey:s,row:e.row,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}):void 0;if(n==="sum")return c(s).reduce((d,p)=>{const w=Number(p);return Number.isFinite(w)?d+w:d},0);if(n==="avg"){const d=c(s).map(p=>Number(p)).filter(p=>Number.isFinite(p));return d.length?d.reduce((p,w)=>p+w,0)/d.length:0}if(n==="min"||n==="max"){const d=c(s).filter(p=>p!=null);return d.length?d.reduce((p,w)=>{if(p==null)return w;const v=we(p,w,l(s),"asc");return n==="min"?v<=0?p:w:v>=0?p:w},d[0]):void 0}if(n==="first")return s&&e.rows.length>0?H(e.rows[0],s):void 0;if(n==="last")return s&&e.rows.length>0?H(e.rows[e.rows.length-1],s):void 0;if(n==="count")return s?c(s).filter(d=>m(U(d)).length>0).length:e.rows.length;if(n==="distinctcount")return s?new Set(c(s).map(d=>m(U(d)))).size:0;if(n==="concat")return a.map(d=>de(d)).join("");if(n==="coalesce")return a.find(d=>d==null?!1:typeof d=="string"?m(d).length>0:!0);if(n==="if")return Z(a[0])?a[1]:a[2];if(n==="eq")return Q(a[0],a[1])===0;if(n==="ne")return Q(a[0],a[1])!==0;if(n==="gt")return Q(a[0],a[1])>0;if(n==="gte")return Q(a[0],a[1])>=0;if(n==="lt")return Q(a[0],a[1])<0;if(n==="lte")return Q(a[0],a[1])<=0;if(n==="and")return a.every(d=>Z(d));if(n==="or")return a.some(d=>Z(d));if(n==="not")return!Z(a[0]);if(n==="number"){const d=Number(a[0]);return Number.isFinite(d)?d:0}if(n==="round"){const d=Number(a[0]),p=Math.max(0,Math.min(6,Number(a[1]??0)));if(!Number.isFinite(d))return 0;const w=10**p;return Math.round(d*w)/w}if(n==="abs"){const d=Number(a[0]);return Number.isFinite(d)?Math.abs(d):0}if(n==="upper")return U(a[0]).toUpperCase();if(n==="lower")return U(a[0]).toLowerCase();if(n==="trim")return U(a[0]).trim();if(n==="formatnumber"){const d=Number(a[0]);if(!Number.isFinite(d))return"";const p=Math.max(0,Math.min(6,Number(a[1]??2)));return d.toLocaleString(void 0,{minimumFractionDigits:p,maximumFractionDigits:p})}if(n==="formatdate"){const d=a[0];if(d instanceof Date)return d.toLocaleDateString("en-GB");const p=d==null?null:new Date(String(d));return p&&!Number.isNaN(p.getTime())?p.toLocaleDateString("en-GB"):""}if(n==="rownumber")return e.rowIndex;if(n==="rowscount")return e.rows.length;if(n==="companyname")return m(e.printSettings.companyNameOverride)||m(e.companyName);if(n==="companyaddress")return m(e.printSettings.companyAddressOverride)||m(e.companyAddress);if(n==="documenttitle")return m(e.documentTitle);if(n==="subtitle")return m(e.subtitle);if(n==="pagenumber")return J;if(n==="totalpages")return X;throw new Error(`Unsupported expression function "${r.name}".`)};try{return o(i)}catch{return"#Error"}},we=(e,t,i,o)=>{const r=o==="desc"?-1:1;if(S(i)==="number"){const l=Number(e),c=Number(t),d=Number.isFinite(l)?l:0,p=Number.isFinite(c)?c:0;return d===p?0:d>p?r:-r}const a=m(e==null?"":String(e)),s=m(t==null?"":String(t));return a.localeCompare(s,"en",{sensitivity:"base"})*r},ht=(e,t,i)=>t.length?[...e].sort((o,r)=>{for(const n of t){const a=m(n.fieldKey);if(!a)continue;const s=i.get(S(a))??"string",l=we(H(o,a),H(r,a),s,n.direction);if(l!==0)return l}return 0}):[...e],ye=e=>e==="right"?"col-align-right":e==="center"?"col-align-center":"col-align-left",yt=e=>{const t=(u,f,b)=>{if(u==null&&f==null)return!0;if(u==null||f==null)return!1;if(b==="number"){const y=Number(u),N=Number(f);if(Number.isFinite(y)&&Number.isFinite(N))return Math.abs(y-N)<1e-6}return m(String(u))===m(String(f))},i=ht(e.rows,e.item.sorts.map(u=>({fieldKey:u.fieldKey,direction:u.direction})),e.fieldTypes),o=u=>e.item.columns.map(f=>{const b=new Array(u.length).fill(1);if(f.repeatValue!==!1)return b;let y=0;for(;y<u.length;){const N=e.fieldTypes.get(S(f.fieldKey))??"string",$=H(u[y],f.fieldKey);let x=y+1;for(;x<u.length;){const T=H(u[x],f.fieldKey);if(!t($,T,N))break;x+=1}b[y]=x-y;for(let T=y+1;T<x;T+=1)b[T]=0;y=x}return b}),r=u=>{const f=o(u);return u.map((b,y)=>{const N=e.item.columns.map((x,T)=>{var I;const D=H(b,x.fieldKey),K=e.fieldTypes.get(S(x.fieldKey))??"string",C=((I=f[T])==null?void 0:I[y])??1;if(C===0)return"";const F=W(D,K),E=C>1?` rowspan="${C}"`:"";return`<td class="${ye(x.align)}"${E}>${h(F)}</td>`}).join("");return`<tr>${e.printSettings.showRowNumbers?`<td class="row-index-cell">${y+1}</td>`:""}${N}</tr>`}).join("")},n=(u,f)=>{const b=e.item.columns.map((N,$)=>{const x=e.fieldTypes.get(S(N.fieldKey))??"string",T=ye(N.align);if(!N.includeTotal)return $===0?`<td class="${T}"><strong>${h(f)}</strong></td>`:`<td class="${T}"></td>`;const D=u.reduce((K,C)=>{const F=Number(H(C,N.fieldKey));return Number.isFinite(F)?K+F:K},0);return`<td class="${T}"><strong>${h(W(D,x))}</strong></td>`}).join("");return`${e.printSettings.showRowNumbers?'<td class="row-index-cell"></td>':""}${b}`},a=(u,f,b)=>`<tr class="${b}">${n(u,f)}</tr>`,s=(u,f)=>["definition-table-group",`definition-table-group--depth-${f}`,u.pageBreakBefore?"definition-table-group--page-break-before":"",u.pageBreakAfter?"definition-table-group--page-break-after":"",u.keepTogether?"definition-table-group--keep-together":""].filter(Boolean).join(" "),l=(u,f)=>["group-header-row",`group-header-row--depth-${f}`,u.keepWithNext?"group-header-row--keep-with-next":"",u.pageBreakBefore?"group-header-row--page-break-before":""].filter(Boolean).join(" "),c=(u,f)=>["group-subtotal-row",`group-subtotal-row--depth-${f}`,u.pageBreakAfter?"group-subtotal-row--page-break-after":""].filter(Boolean).join(" "),d=(u,f)=>{const b=e.item.rowGroups[f];if(!b)return r(u);const y=new Map;return u.forEach($=>{const x=H($,b.fieldKey),T=x==null?"__null__":String(x),D=y.get(T)??{value:x,rows:[]};D.rows.push($),y.set(T,D)}),Array.from(y.values()).sort(($,x)=>we($.value,x.value,e.fieldTypes.get(S(b.fieldKey))??"string",b.sortDirection)).map($=>{const x=f+1<e.item.rowGroups.length?d($.rows,f+1):r($.rows),T=b.showHeader?`<tr class="${l(b,f)}"><td colspan="${e.item.columns.length+(e.printSettings.showRowNumbers?1:0)}"><strong>${h(b.label||b.fieldKey)}</strong>: ${h(W($.value,e.fieldTypes.get(S(b.fieldKey))??"string"))}</td></tr>`:"",D=b.showSubtotal?a($.rows,b.subtotalLabel||"Subtotal",c(b,f)):"",K=`${T}${x}${D}`;return f===0?`<tbody class="${s(b,f)}">${K}</tbody>`:K}).join("")},p=e.item.showHeader?`<thead><tr>${e.printSettings.showRowNumbers?'<th class="row-index-cell">#</th>':""}${e.item.columns.map(u=>`<th class="${ye(u.align)}" style="width:${u.widthMm}mm">${h(u.label)}</th>`).join("")}</tr></thead>`:"",w=e.item.rowGroups.length>0?d(i,0):`<tbody>${r(i)}</tbody>`,v=e.item.showGrandTotal?`<tbody><tr class="grand-total-row">${n(i,"Total")}</tr></tbody>`:"";return`
      <div class="definition-table-wrap">
        <table class="definition-table${e.item.zebraStriping?" definition-table--zebra":""}">
          ${p}
          ${w}
          ${v}
        </table>
      </div>
    `},gt=e=>{const t={row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings};if(ee({hiddenExpression:e.item.hiddenExpression,row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}))return"";const i=Re({item:e.item,context:t}),o=["position:absolute",`left:${e.item.xMm}mm`,`top:${e.item.yMm}mm`,`width:${e.item.widthMm}mm`,`font-size:${e.item.fontSizePt}pt`,`font-weight:${i.fontWeight==="bold"?700:400}`,`text-align:${e.item.textAlign}`,`color:${i.textColor}`];if(e.item.keepTogether&&(o.push("break-inside:avoid"),o.push("page-break-inside:avoid")),e.item.pageBreakBefore&&(o.push("break-before:page"),o.push("page-break-before:always")),e.item.pageBreakAfter&&(o.push("break-after:page"),o.push("page-break-after:always")),e.item.type!=="line"&&e.item.type!=="text"&&e.item.type!=="field"&&o.push(`min-height:${e.item.heightMm}mm`),e.item.type==="rectangle"?o.push(`border:${Math.max(.5,e.item.borderWidth||1)}pt solid ${i.borderColor}`):e.item.borderWidth>0&&o.push(`border:${e.item.borderWidth}pt solid ${i.borderColor}`),i.fillColor&&i.fillColor!=="transparent"&&e.item.type!=="line"&&o.push(`background:${i.fillColor}`),e.item.type==="line")return o.push("height:0"),o.push(`border-top:${Math.max(.5,e.item.borderWidth||1)}pt solid ${i.borderColor}`),`<div class="definition-item definition-item--line" style="${o.join(";")}"></div>`;if(e.item.type==="text"){o.push("padding:0.4mm 0.6mm"),o.push("white-space:pre-wrap");const r=se(e.item,t),n=q({display:r,widthMm:e.item.widthMm,fontSizePt:e.item.fontSizePt,heightMm:e.item.heightMm,canGrow:e.item.canGrow,canShrink:e.item.canShrink});return o.push(e.item.canGrow?`min-height:${n}mm`:`height:${n}mm`),e.item.canGrow||o.push("overflow:hidden"),`<div class="definition-item definition-item--text" style="${o.join(";")}">${oe(r)}</div>`}if(e.item.type==="field"){const r=le(e.item,t);o.push("padding:0.4mm 0.6mm"),o.push("white-space:pre-wrap");const n=q({display:r,widthMm:e.item.widthMm,fontSizePt:e.item.fontSizePt,heightMm:e.item.heightMm,canGrow:e.item.canGrow,canShrink:e.item.canShrink});return o.push(e.item.canGrow?`min-height:${n}mm`:`height:${n}mm`),e.item.canGrow||o.push("overflow:hidden"),`<div class="definition-item definition-item--field" style="${o.join(";")}">${oe(r)}</div>`}if(e.item.type==="image"){const r=Ke({sourceKind:e.item.sourceKind,url:e.item.url,fieldKey:e.item.fieldKey,expression:e.item.expression,row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings});return o.push("display:flex"),o.push("align-items:center"),o.push("justify-content:center"),r?`<div class="definition-item definition-item--image" style="${o.join(";")}"><img src="${h(r)}" alt="" style="width:100%; height:${e.item.heightMm}mm; object-fit:${e.item.fit};" /></div>`:(o.push("padding:0.4mm 0.6mm"),`<div class="definition-item definition-item--image" style="${o.join(";")}">Image</div>`)}return o.push("padding:0.4mm 0.6mm"),`<div class="definition-item definition-item--rectangle" style="${o.join(";")}"></div>`},bt=e=>{const t=xe(e.item,e.row,e.rows);return`<div class="definition-list-wrap">${t.map((o,r)=>{const n=be({item:e.item,row:o,rows:t,rowIndex:r+1,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}),a=e.item.items.map(l=>gt({item:l,row:o,rows:t,rowIndex:r+1,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings})).join("");return`<div class="definition-list-row" style="${["position:relative",`min-height:${n}mm`,"break-inside:avoid","page-break-inside:avoid",e.item.gapMm>0&&r<t.length-1?`margin-bottom:${e.item.gapMm}mm`:"",e.item.showRowDivider&&r<t.length-1?`border-bottom:${Math.max(.5,e.item.borderWidth||.5)}pt solid ${e.item.borderColor}`:"",e.item.zebraStriping&&r%2===1?"background:rgba(148,163,184,0.08)":""].filter(Boolean).join(";")}">${a}</div>`}).join("")}</div>`},xe=(e,t,i)=>{const o=m(e.sourcePath);if(!o)return i.length>0?i:[{}];const r=H(t,o);return Array.isArray(r)?r.filter(n=>!!n&&typeof n=="object"):[{}]},Fe=(e,t,i,o,r,n,a,s,l,c)=>{const d={row:t,rows:i,rowIndex:1,fieldTypes:r,documentTitle:n,subtitle:a,companyName:s,companyAddress:l,printSettings:c};if(ee({hiddenExpression:e.hiddenExpression,row:t,rows:i,rowIndex:o,fieldTypes:r,documentTitle:n,subtitle:a,companyName:s,companyAddress:l,printSettings:c}))return 0;if(e.type==="table")return e.heightMm+20;if(e.type==="list"){const p=xe(e,t,i),w=p.reduce((v,u,f)=>{const b=be({item:e,row:u,rows:p,rowIndex:f+1,fieldTypes:r,documentTitle:n,subtitle:a,companyName:s,companyAddress:l,printSettings:c});return v+b+(f<p.length-1?e.gapMm:0)},0);return Math.max(e.heightMm,w)}return e.type==="text"?q({display:se(e,d),widthMm:e.widthMm,fontSizePt:e.fontSizePt,heightMm:e.heightMm,canGrow:e.canGrow,canShrink:e.canShrink}):e.type==="field"?q({display:le(e,d),widthMm:e.widthMm,fontSizePt:e.fontSizePt,heightMm:e.heightMm,canGrow:e.canGrow,canShrink:e.canShrink}):e.heightMm},$e=e=>{const t={row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings};if(ee({hiddenExpression:e.item.hiddenExpression,row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}))return"";const i=Re({item:e.item,context:t}),o=e.item.type==="list"?e.item:null,r=o!=null?Math.max(o.heightMm,xe(o,e.row,e.rows).reduce((a,s,l,c)=>{const d=be({item:o,row:s,rows:c,rowIndex:l+1,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings});return a+d+(l<c.length-1?o.gapMm:0)},0)):e.item.heightMm,n=["position:absolute",`left:${e.item.xMm}mm`,`top:${Math.max(0,e.item.yMm-e.yOffsetMm)}mm`,`width:${e.item.widthMm}mm`,`font-size:${e.item.fontSizePt}pt`,`font-weight:${i.fontWeight==="bold"?700:400}`,`text-align:${e.item.textAlign}`,`color:${i.textColor}`];if(e.item.keepTogether&&(n.push("break-inside:avoid"),n.push("page-break-inside:avoid")),e.item.pageBreakBefore&&(n.push("break-before:page"),n.push("page-break-before:always")),e.item.pageBreakAfter&&(n.push("break-after:page"),n.push("page-break-after:always")),e.item.type!=="line"&&e.item.type!=="text"&&e.item.type!=="field"&&n.push(`min-height:${o!=null?r:e.item.heightMm}mm`),e.item.type==="rectangle"||e.item.type==="table"||e.item.type==="list"?n.push(`border:${Math.max(.5,e.item.borderWidth||1)}pt solid ${i.borderColor}`):e.item.borderWidth>0&&n.push(`border:${e.item.borderWidth}pt solid ${i.borderColor}`),i.fillColor&&i.fillColor!=="transparent"&&e.item.type!=="line"&&n.push(`background:${i.fillColor}`),e.item.type==="line")return n.push("height:0"),n.push(`border-top:${Math.max(.5,e.item.borderWidth||1)}pt solid ${i.borderColor}`),`<div class="definition-item definition-item--line" style="${n.join(";")}"></div>`;if(e.item.type==="text"){n.push("padding:0.4mm 0.6mm"),n.push("white-space:pre-wrap");const a=se(e.item,t),s=q({display:a,widthMm:e.item.widthMm,fontSizePt:e.item.fontSizePt,heightMm:e.item.heightMm,canGrow:e.item.canGrow,canShrink:e.item.canShrink});return n.push(e.item.canGrow?`min-height:${s}mm`:`height:${s}mm`),e.item.canGrow||n.push("overflow:hidden"),`<div class="definition-item definition-item--text" style="${n.join(";")}">${oe(a)}</div>`}if(e.item.type==="field"){const a=le(e.item,t);n.push("padding:0.4mm 0.6mm"),n.push("white-space:pre-wrap");const s=q({display:a,widthMm:e.item.widthMm,fontSizePt:e.item.fontSizePt,heightMm:e.item.heightMm,canGrow:e.item.canGrow,canShrink:e.item.canShrink});return n.push(e.item.canGrow?`min-height:${s}mm`:`height:${s}mm`),e.item.canGrow||n.push("overflow:hidden"),`<div class="definition-item definition-item--field" style="${n.join(";")}">${oe(a)}</div>`}if(e.item.type==="image"){const a=Ke({sourceKind:e.item.sourceKind,url:e.item.url,fieldKey:e.item.fieldKey,expression:e.item.expression,row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings});return n.push("display:flex"),n.push("align-items:center"),n.push("justify-content:center"),a?`<div class="definition-item definition-item--image" style="${n.join(";")}"><img src="${h(a)}" alt="" style="width:100%; height:${e.item.heightMm}mm; object-fit:${e.item.fit};" /></div>`:(n.push("padding:0.4mm 0.6mm"),`<div class="definition-item definition-item--image" style="${n.join(";")}">Image</div>`)}return e.item.type==="table"?(n.push("padding:0.8mm"),`<div class="definition-item definition-item--table" style="${n.join(";")}">${yt({item:e.item,rows:e.rows,fieldTypes:e.fieldTypes,printSettings:e.printSettings})}</div>`):e.item.type==="list"?(n.push("padding:0.8mm"),`<div class="definition-item definition-item--list" style="${n.join(";")}">${bt({item:e.item,row:e.row,rows:e.rows,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings})}</div>`):(n.push("padding:0.4mm 0.6mm"),`<div class="definition-item definition-item--rectangle" style="${n.join(";")}"></div>`)},Y=e=>{if(!e.items.length)return"";const t=e.items.filter(l=>!ee({hiddenExpression:l.hiddenExpression,row:e.row,rows:e.rows,rowIndex:e.rowIndex,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings}));if(!t.length)return"";const i=e.allowManualPageBreaks!==!1,o=t.some(l=>l.pageBreakBefore||l.pageBreakAfter);if(!i||!o){const l=t.map(c=>$e({item:c,row:e.row,rows:e.rows,rowIndex:e.rowIndex,yOffsetMm:0,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings})).join("");return`<section class="${e.className}" style="position:relative; min-height:${e.heightMm}mm;">${l}</section>`}const n=[...t.map((l,c)=>({item:l,index:c}))].sort((l,c)=>l.item.yMm-c.item.yMm||l.item.xMm-c.item.xMm||l.index-c.index),a=[];let s=[];return n.forEach(l=>{s.length>0&&l.item.pageBreakBefore&&(a.push(s),s=[]),s.push(l),l.item.pageBreakAfter&&(a.push(s),s=[])}),s.length>0&&a.push(s),a.map((l,c)=>{const d=[...l].sort((f,b)=>f.index-b.index).map(f=>f.item),p=Math.min(...d.map(f=>f.yMm)),w=Math.max(1,d.reduce((f,b)=>{const y=Fe(b,e.row,e.rows,e.rowIndex,e.fieldTypes,e.documentTitle,e.subtitle,e.companyName,e.companyAddress,e.printSettings);return y<=0?f:Math.max(f,b.yMm+y-p)},0)),v=d.map(f=>$e({item:f,row:e.row,rows:e.rows,rowIndex:e.rowIndex,yOffsetMm:p,fieldTypes:e.fieldTypes,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings})).join(""),u=["position:relative",`min-height:${w}mm`,c>0?"break-before:page":"",c>0?"page-break-before:always":"",d.some(f=>f.keepTogether)?"break-inside:avoid":"",d.some(f=>f.keepTogether)?"page-break-inside:avoid":""].filter(Boolean).join(";");return`<section class="${e.className}" style="${u}">${v}</section>`}).join("")},wt=e=>{const t=e.rows[0]??{},i=new Map(e.columns.map($=>[S($.key),$.dataType])),o=e.reportDefinition.repeatPerRow?[t]:e.rows,r=Y({items:e.reportDefinition.sections.pageHeader.items,heightMm:e.reportDefinition.sections.pageHeader.heightMm,row:t,rows:o,rowIndex:1,fieldTypes:i,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings,className:"definition-page-header",allowManualPageBreaks:!1}),n=($,x,T)=>{const D=Y({items:e.reportDefinition.sections.reportHeader.items,heightMm:e.reportDefinition.sections.reportHeader.heightMm,row:$,rows:T,rowIndex:x,fieldTypes:i,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings,className:"definition-report-header",allowManualPageBreaks:!0}),K=Y({items:e.reportDefinition.sections.body.items,heightMm:Math.max(e.reportDefinition.sections.body.heightMm,e.reportDefinition.sections.body.items.reduce((F,E)=>{const I=Fe(E,$,T,x,i,e.documentTitle,e.subtitle,e.companyName,e.companyAddress,e.printSettings);return I<=0?F:Math.max(F,E.yMm+I)},0)),row:$,rows:T,rowIndex:x,fieldTypes:i,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings,className:"definition-body",allowManualPageBreaks:!0}),C=Y({items:e.reportDefinition.sections.reportFooter.items,heightMm:e.reportDefinition.sections.reportFooter.heightMm,row:$,rows:T,rowIndex:x,fieldTypes:i,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings,className:"definition-report-footer",allowManualPageBreaks:!0});return`${D}${K}${C}`},a=e.reportDefinition.repeatPerRow?e.rows.map(($,x)=>`<section class="${x<e.rows.length-1?"definition-document definition-document--page-break":"definition-document"}">${n($,x+1,[$])}</section>`).join(""):n(t,1,e.rows),s=Y({items:e.reportDefinition.sections.pageFooter.items,heightMm:e.reportDefinition.sections.pageFooter.heightMm,row:t,rows:o,rowIndex:1,fieldTypes:i,documentTitle:e.documentTitle,subtitle:e.subtitle,companyName:e.companyName,companyAddress:e.companyAddress,printSettings:e.printSettings,className:"definition-page-footer",allowManualPageBreaks:!1}),l=r.length>0,c=s.length>0,d=m(e.printSettings.footerText).length>0,p=l?e.reportDefinition.sections.pageHeader.heightMm:0,w=c?e.reportDefinition.sections.pageFooter.heightMm:0,v=d?6:0,u=w+v,f=e.pageSettings.margins.top+p,b=e.pageSettings.margins.bottom+u,y=l?`<div class="definition-fixed-header">${r}</div>`:"",N=c||d?`<div class="definition-fixed-footer">${c?s:""}${d?`<div class="definition-system-footer">${h(e.printSettings.footerText)} <span class="definition-system-footer-page"></span></div>`:""}</div>`:"";return`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${h(m(e.documentTitle)||"Report")}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #475569;
        --line: #dbe2ea;
        --head-bg: #eef3f8;
        --zebra-bg: #f8fafc;
      }
      * { box-sizing: border-box; }
      @page {
        size: ${e.pageSettings.pageSize} ${e.pageSettings.orientation};
        margin: ${f}mm ${e.pageSettings.margins.right}mm ${b}mm ${e.pageSettings.margins.left}mm;
      }
      body {
        margin: 0;
        color: var(--ink);
        font-family: ${lt(e.reportDefinition.defaultFontFamily)};
        font-size: 10pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .definition-content {
        width: 100%;
      }
      .definition-fixed-header {
        position: fixed;
        top: -${p}mm;
        left: 0;
        right: 0;
        height: ${p}mm;
        background: #fff;
        overflow: hidden;
      }
      .definition-fixed-footer {
        position: fixed;
        bottom: -${u}mm;
        left: 0;
        right: 0;
        min-height: ${u}mm;
        background: #fff;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .definition-page-header,
      .definition-report-header,
      .definition-body,
      .definition-report-footer,
      .definition-page-footer {
        width: 100%;
      }
      .definition-report-header,
      .definition-report-footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .definition-document--page-break {
        break-after: page;
        page-break-after: always;
      }
      .definition-document:last-of-type {
        break-after: auto;
        page-break-after: auto;
      }
      .definition-table {
        width: 100%;
        border-collapse: collapse;
      }
      .definition-table thead {
        display: table-header-group;
      }
      .definition-table th,
      .definition-table td {
        border: 1px solid var(--line);
        padding: 5px 6px;
        vertical-align: top;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .definition-table thead th {
        background: var(--head-bg);
        font-weight: 700;
      }
      .definition-table--zebra tbody tr:nth-child(even) td {
        background: var(--zebra-bg);
      }
      .row-index-cell {
        width: 34px;
        text-align: right;
      }
      .col-align-left { text-align: left; }
      .col-align-center { text-align: center; }
      .col-align-right { text-align: right; }
      .group-header-row td {
        background: #f1f5f9;
        font-weight: 700;
      }
      .definition-table-group--page-break-before,
      .group-header-row--page-break-before {
        break-before: page;
        page-break-before: always;
      }
      .definition-table-group--page-break-after,
      .group-subtotal-row--page-break-after {
        break-after: page;
        page-break-after: always;
      }
      .definition-table-group--keep-together {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .group-header-row--keep-with-next {
        break-after: avoid;
        page-break-after: avoid;
      }
      .group-header-row--keep-with-next + tr {
        break-before: avoid;
        page-break-before: avoid;
      }
      .group-subtotal-row td {
        background: #eef4fb;
      }
      .grand-total-row td {
        background: #e8eef6;
        border-top: 2px solid #9fb3ca;
      }
      .definition-list-row,
      .group-header-row,
      .group-subtotal-row,
      .grand-total-row {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .definition-system-footer {
        min-height: ${v}mm;
        font-size: 9pt;
        color: var(--muted);
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        border-top: 1px solid var(--line);
        padding-top: 1mm;
      }
      .definition-system-token {
        display: inline-block;
        min-width: 1ch;
      }
      .definition-page-number::after,
      .definition-system-footer-page::after {
        content: counter(page);
      }
      .definition-total-pages::after {
        content: counter(pages);
      }
    </style>
  </head>
    <body>
      ${y}
      ${N}
      <main class="definition-content">
      ${a}
      </main>
    </body>
</html>`},Ee=e=>e.printSettings.renderMode==="legacy_invoice_ledger"&&e.rows.some(t=>Array.isArray(me(t).lines))?ut({documentTitle:e.documentTitle,companyName:e.companyName,companyAddress:e.companyAddress,subtitle:e.subtitle,pageSettings:e.pageSettings,printSettings:e.printSettings,rows:e.rows}):e.printSettings.renderMode==="legacy_loading_sheet"?ft({documentTitle:e.documentTitle,companyName:e.companyName,companyAddress:e.companyAddress,subtitle:e.subtitle,pageSettings:e.pageSettings,printSettings:e.printSettings,rows:e.rows}):ze(e.pageSettings.reportDefinition)?wt({...e,reportDefinition:e.pageSettings.reportDefinition}):e.pageSettings.layout&&e.pageSettings.layout.elements.length>0?ct({...e,layout:e.pageSettings.layout}):dt(e),je=e=>{if(typeof window>"u")return!1;const t=window.open("","_blank");if(!t)return!1;t.document.open(),t.document.write(e),t.document.close(),t.focus();const i=()=>{t.print()};return t.document.readyState==="complete"?window.setTimeout(i,30):t.onload=i,t.onafterprint=()=>{t.close()},!0},zt=e=>{if(typeof window>"u")return!1;const t=Array.isArray(e.rows)?e.rows:[];if(!t.length)return!1;const i=!!(e.layout&&Array.isArray(e.layout.elements)&&e.layout.elements.length>0),o=ze(e.reportDefinition??null),r=(Array.isArray(e.columns)?e.columns:[]).map(l=>{const c=m(l.key);return c?{key:c,label:m(l.label)||c,dataType:m(l.dataType)||"string",path:m(l.path)||c}:null}).filter(l=>!!l);if(!r.length&&!i&&!o)return!1;const n=He(JSON.stringify({...e.pageSettings??{},layout:e.layout??null,reportDefinition:e.reportDefinition??null})),a=De(JSON.stringify(e.printSettings??{})),s=Ee({documentTitle:m(e.documentTitle)||"Report Preview",companyName:e.companyName??null,companyAddress:e.companyAddress??null,subtitle:e.subtitle,pageSettings:n,printSettings:a,columns:r,rows:t});return je(s)},Rt=async e=>{var v,u;if(typeof window>"u")return!1;const t=Array.isArray(e.rows)?e.rows:[];if(!t.length)return!1;const i=m(e.moduleKey);if(!i)return!1;const o=Array.from(new Set([...e.usageKeys??[],"print"].map(f=>m(f)).filter(f=>f.length>0)));let r=[];try{r=((v=(await e.apolloClient.query({query:Ve,fetchPolicy:"network-only",variables:{moduleKey:i,includeInactive:!1,limit:200}})).data)==null?void 0:v.reportTemplates)??[]}catch{return!1}const n=ot(r,o);if(!n)return!1;let a=[];try{a=((u=(await e.apolloClient.query({query:Qe,fetchPolicy:"cache-first",variables:{moduleKey:i}})).data)==null?void 0:u.reportDataSources)??[]}catch{return!1}const s=rt(a,i,n.dataSourceKey);if(!s)return!1;const l=Je(n.selectedFieldsJson),c=at(s,l);if(!c.length)return!1;const d=He(n.pageSettingsJson),p=De(n.printSettingsJson),w=Ee({documentTitle:e.title??s.label??`${i} report`,companyName:e.companyName??null,companyAddress:e.companyAddress??null,subtitle:e.subtitle,pageSettings:d,printSettings:p,columns:c,rows:t});return je(w)};export{ae as R,kt as a,St as b,_e as c,ve as d,$t as e,Mt as f,vt as g,Tt as h,Nt as i,ze as j,At as k,Rt as l,Ue as n,zt as p};
