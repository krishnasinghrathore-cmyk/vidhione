import{Q as we,r as i,S as Ee,U as Oe,Z as De,_ as ye,ab as Ne,$ as be,a7 as de,a1 as ce,a0 as En,W as p,c as C,V as se,a2 as ae,a6 as A,a4 as Te,bI as On,a5 as ht,af as tt,aj as Nn,ag as Qe,f as St,a as It,j as k,B as xt,I as Pt}from"./index-a2e62377.js";import{B as rt}from"./index.esm-23a64aa1.js";import{A as at}from"./index.esm-1ebbc8e4.js";import{A as bn}from"./index.esm-2f3fd837.js";import{C as kn}from"./index.esm-b05ab7aa.js";import{O as wt}from"./overlayservice.esm-bf9b13ee.js";import{M as $n}from"./menu.esm-5ba2ffdb.js";import{C as it}from"./index.esm-287dfa04.js";function Je(e){"@babel/helpers - typeof";return Je=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},Je(e)}function Et(e,n){if(Je(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(Je(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function Ot(e){var n=Et(e,"string");return Je(n)==="symbol"?n:String(n)}function ot(e,n,t){return n=Ot(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function Nt(e){if(Array.isArray(e))return e}function kt(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function An(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function Ct(e,n){if(e){if(typeof e=="string")return An(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return An(e,n)}}function _t(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Xe(e,n){return Nt(e)||kt(e,n)||Ct(e,n)||_t()}var jt={start:"p-menubar-start",end:"p-menubar-end",button:"p-menubar-button",root:function(n){var t=n.mobileActiveState;return C("p-menubar p-component",{"p-menubar-mobile-active":t})},separator:"p-menu-separator",icon:"p-menuitem-icon",label:"p-menuitem-text",submenuIcon:"p-submenu-icon",menuitem:function(n){var t=n.item,r=n.activeItemState;return C("p-menuitem",{"p-menuitem-active":r===t})},menu:"p-menubar-root-list",submenu:"p-submenu-list",action:function(n){var t=n.item;return C("p-menuitem-link",{"p-disabled":t.disabled})}},Mt=`
@layer primereact {
    .p-menubar {
        display: flex;
        align-items: center;
    }
    
    .p-menubar ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    .p-menubar .p-menuitem-link {
        cursor: pointer;
        display: flex;
        align-items: center;
        text-decoration: none;
        overflow: hidden;
        position: relative;
    }
    
    .p-menubar .p-menuitem-text {
        line-height: 1;
    }
    
    .p-menubar .p-menuitem {
        position: relative;
    }
    
    .p-menubar-root-list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .p-menubar-root-list > li ul {
        display: none;
        z-index: 1;
    }
    
    .p-menubar-root-list > .p-menuitem-active > .p-submenu-list {
        display: block;
    }
    
    .p-menubar .p-submenu-list {
        display: none;
        position: absolute;
        z-index: 1;
    }
    
    .p-menubar .p-submenu-list > .p-menuitem-active > .p-submenu-list {
        display: block;
        left: 100%;
        top: 0;
    }
    
    .p-menubar .p-submenu-list .p-menuitem-link .p-submenu-icon {
        margin-left: auto;
    }
    
    .p-menubar .p-menubar-custom,
    .p-menubar .p-menubar-end {
        margin-left: auto;
        align-self: center;
    }
    
    .p-menubar-button {
        display: none;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        text-decoration: none;
    }
}
`,rn=we.extend({defaultProps:{__TYPE:"Menubar",id:null,model:null,style:null,className:null,start:null,submenuIcon:null,menuIcon:null,end:null,children:void 0},css:{classes:jt,styles:Mt}});function Rn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function Sn(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Rn(Object(t),!0).forEach(function(r){ot(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Rn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var Cn=i.memo(i.forwardRef(function(e,n){var t=i.useState(null),r=Xe(t,2),s=r[0],d=r[1],m=e.ptm,S=e.cx,g=function(a,o){return m(o,{props:e,hostName:e.hostName,context:{active:s===a}})},P=De({type:"click",listener:function(a){n&&n.current&&!n.current.contains(a.target)&&d(null)}}),v=Xe(P,1),O=v[0],Y=function(a,o){if(o.disabled||e.mobileActive){a.preventDefault();return}e.root?(s||e.popup)&&d(o):d(o)},R=function(a,o){if(o.disabled){a.preventDefault();return}o.url||a.preventDefault(),o.command&&o.command({originalEvent:a,item:o}),o.items?d(s&&o===s?null:o):b()},$=function(a,o){var w=a.currentTarget.parentElement;switch(a.which){case 40:e.root?o.items&&K(o,w):T(w),a.preventDefault();break;case 38:!e.root&&E(w),a.preventDefault();break;case 39:if(e.root){var j=N(w);j&&j.children[0].focus()}else o.items&&K(o,w);a.preventDefault();break;case 37:e.root&&E(w),a.preventDefault();break}e.onKeyDown&&e.onKeyDown(a,w)},J=function(a,o){e.root?a.which===38&&o.previousElementSibling==null&&z(o):a.which===37&&z(o)},K=function(a,o){d(a),setTimeout(function(){o.children[1].children[0].children[0].focus()},50)},z=function(a){d(null),a.parentElement.previousElementSibling.focus()},T=function(a){var o=N(a);o&&o.children[0].focus()},E=function(a){var o=u(a);o&&o.children[0].focus()},N=function c(a){var o=a.nextElementSibling;return o?A.getAttribute(o,'[data-p-disabled="true"]')||!A.getAttribute(o,'[data-pc-section="menuitem"]')?c(o):o:null},u=function c(a){var o=a.previousElementSibling;return o?A.getAttribute(o,'[data-p-disabled="true"]')||!A.getAttribute(o,'[data-pc-section="menuitem"]')?c(o):o:null},b=function(){d(null),e.onLeafClick&&e.onLeafClick()};ye(function(){O()}),be(function(){!e.parentActive&&d(null)},[e.parentActive]);var f=function(a){var o=e.id+"_separator_"+a,w=p({id:o,key:o,className:S("separator"),role:"separator"},m("separator",{hostName:e.hostName}));return i.createElement("li",w)},y=function(a,o){return a.items?i.createElement(Cn,{id:e.id+"_"+o,hostName:e.hostName,menuProps:e.menuProps,model:a.items,mobileActive:e.mobileActive,onLeafClick:b,onKeyDown:J,parentActive:a===s,submenuIcon:e.submenuIcon,ptm:m,cx:S}):null},x=function(a,o){if(a.visible===!1)return null;var w=a.id||e.id+"_"+o,j=C("p-menuitem-link",{"p-disabled":a.disabled}),Z=C("p-menuitem-icon",a.icon),V=p({className:S("icon")},g(a,"icon")),F=ae.getJSXIcon(a.icon,Sn({},V),{props:e.menuProps}),ee=p({className:S("label")},g(a,"label")),ne=a.label&&i.createElement("span",ee,a.label),W="p-submenu-icon",D=p({className:S("submenuIcon")},g(a,"submenuIcon")),G=a.items&&ae.getJSXIcon(e.root?e.submenuIcon||i.createElement(at,D):e.submenuIcon||i.createElement(bn,D),Sn({},D),{props:Sn({menuProps:e.menuProps},e)}),le=y(a,o),pe=p({href:a.url||"#",role:"menuitem",className:S("action",{item:a}),target:a.target,"aria-haspopup":a.items!=null,onClick:function(re){return R(re,a)},onKeyDown:function(re){return $(re,a)}},g(a,"action")),ie=i.createElement("a",pe,F,ne,G,i.createElement(Te,null));if(a.template){var me={onClick:function(re){return R(re,a)},onKeyDown:function(re){return $(re,a)},className:j,labelClassName:"p-menuitem-text",iconClassName:Z,submenuIconClassName:W,element:ie,props:e};ie=se.getJSXElement(a.template,a,me)}var ve=p({id:w,key:w,role:"none",className:C(a.className,S("menuitem",{item:a,activeItemState:s})),onMouseEnter:function(re){return Y(re,a)},"data-p-disabled":a.disabled||!1},g(a,"menuitem"));return i.createElement("li",ve,ie,le)},_=function(a,o){return a.separator?f(o):x(a,o)},M=function(){return e.model?e.model.map(_):null},I=e.root?"menubar":"menu",H=e.root?"menu":"submenu",X=M(),U=p({ref:n,className:S(H),style:!e.root&&{display:e.parentActive?"block":"none"},role:I},m(H));return i.createElement("ul",U,X)}));Cn.displayName="MenubarSub";function Dn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function $t(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Dn(Object(t),!0).forEach(function(r){ot(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Dn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var lt=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=rn.getProps(e,t),s=i.useState(r.id),d=Xe(s,2),m=d[0],S=d[1],g=i.useState(!1),P=Xe(g,2),v=P[0],O=P[1],Y=i.useRef(null),R=i.useRef(null),$=i.useRef(null),J=rn.setMetaData({props:r,state:{id:m,mobileActive:v}}),K=J.ptm,z=J.cx,T=J.isUnstyled;Oe(rn.css.styles,T,{name:"menubar"});var E=De({type:"click",listener:function(w){v&&x(w)&&O(!1)}}),N=Xe(E,2),u=N[0],b=N[1],f=function(w){w.preventDefault(),O(function(j){return!j})},y=function(){O(!1)},x=function(w){return R.current!==w.target&&!R.current.contains(w.target)&&$.current!==w.target&&!$.current.contains(w.target)};ye(function(){m||S(Ne())}),be(function(){v?(de.set("menu",R.current,t&&t.autoZIndex||ce.autoZIndex,t&&t.zIndex.menu||ce.zIndex.menu),u()):(b(),de.clear(R.current))},[v]),En(function(){de.clear(R.current)}),i.useImperativeHandle(n,function(){return{props:r,toggle:f,getElement:function(){return Y.current},getRootMenu:function(){return R.current},getMenuButton:function(){return $.current}}});var _=function(){if(r.start){var w=se.getJSXElement(r.start,r),j=p({className:z("start")},K("start"));return i.createElement("div",j,w)}return null},M=function(){if(r.end){var w=se.getJSXElement(r.end,r),j=p({className:z("end")},K("end"));return i.createElement("div",j,w)}return null},I=function(){if(r.model&&r.model.length<1)return null;var w=p({ref:$,href:"#",role:"button",tabIndex:0,className:z("button"),onClick:function(ne){return f(ne)}},K("button")),j=p(K("popupIcon")),Z=r.menuIcon||i.createElement(rt,j),V=ae.getJSXIcon(Z,$t({},j),{props:r}),F=i.createElement("a",w,V);return F},H=_(),X=M(),U=I(),c=i.createElement(Cn,{hostName:"Menubar",id:m,ref:R,menuProps:r,model:r.model,root:!0,mobileActive:v,onLeafClick:y,submenuIcon:r.submenuIcon,ptm:K,cx:z}),a=p({id:r.id,className:C(r.className,z("root",{mobileActiveState:v})),style:r.style},rn.getOtherProps(r),K("root"));return i.createElement("div",a,H,U,c,X)}));lt.displayName="Menubar";function Ue(e){"@babel/helpers - typeof";return Ue=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},Ue(e)}function At(e,n){if(Ue(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(Ue(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function Rt(e){var n=At(e,"string");return Ue(n)==="symbol"?n:String(n)}function Dt(e,n,t){return n=Rt(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function Tt(e){if(Array.isArray(e))return e}function Lt(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function Tn(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function Ht(e,n){if(e){if(typeof e=="string")return Tn(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return Tn(e,n)}}function Bt(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Kt(e,n){return Tt(e)||Lt(e,n)||Ht(e,n)||Bt()}var zt={icon:"p-menuitem-icon",action:"p-menuitem-link",label:"p-menuitem-text",home:function(n){var t=n._className,r=n.disabled;return C("p-breadcrumb-home",{"p-disabled":r},t)},separatorIcon:"p-breadcrumb-chevron",separator:"p-menuitem-separator",menuitem:function(n){var t=n.item;return C("p-menuitem",t.className,{"p-disabled":t.disabled})},menu:"p-breadcrumb-list",root:function(n){var t=n.props;return C("p-breadcrumb p-component",t.className)}},Xt=`
@layer primereact {
    .p-breadcrumb {
        overflow-x: auto;
    }
    
    .p-breadcrumb ul {
        margin: 0;
        padding: 0;
        list-style-type: none;
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
    }
    
    .p-breadcrumb .p-menuitem-text {
        line-height: 1;
    }
    
    .p-breadcrumb .p-menuitem-link {
        text-decoration: none;
        display: flex;
        align-items: center;
    }
    
    .p-breadcrumb .p-menuitem-separator {
        display: flex;
        align-items: center;
    }
    
    .p-breadcrumb::-webkit-scrollbar {
        display: none;
    }
}
`,an=we.extend({defaultProps:{__TYPE:"BreadCrumb",id:null,model:null,home:null,separatorIcon:null,style:null,className:null,children:void 0},css:{classes:zt,styles:Xt}});function Ln(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function Hn(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Ln(Object(t),!0).forEach(function(r){Dt(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Ln(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var ut=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=an.getProps(e,t),s=i.useState(r.id),d=Kt(s,2),m=d[0],S=d[1],g=i.useRef(null),P=an.setMetaData({props:r,state:{id:m}}),v=P.ptm,O=P.cx,Y=P.isUnstyled;Oe(an.css.styles,Y,{name:"breadcrumb"});var R=function(y,x){if(x.disabled){y.preventDefault();return}x.url||y.preventDefault(),x.command&&x.command({originalEvent:y,item:x})},$=function(y){var x=r.home;if(x){if(x.visible===!1)return null;var _=x.icon,M=x.target,I=x.url,H=x.disabled,X=x.style,U=x.className,c=x.template,a=x.label,o=p({className:O("icon")},v("icon")),w=ae.getJSXIcon(_,Hn({},o),{props:r}),j=p({href:I||"#",className:O("action"),"aria-disabled":H,target:M,onClick:function(G){return R(G,x)}},v("action")),Z=p({className:O("label")},v("label")),V=a&&i.createElement("span",Z,a),F=i.createElement("a",j,w,V);if(c){var ee={onClick:function(G){return R(G,x)},className:"p-menuitem-link",labelClassName:"p-menuitem-text",element:F,props:r};F=se.getJSXElement(c,x,ee)}var ne=m+"_home",W=p({id:ne,key:ne,className:O("home",{_className:U,disabled:H}),style:X},v("home"));return i.createElement("li",W,F)}return null},J=function(y){var x=m+"_sep_"+y,_=p({className:O("separatorIcon")},v("separatorIcon")),M=r.separatorIcon||i.createElement(kn,_),I=ae.getJSXIcon(M,Hn({},_),{props:r}),H=p({id:x,key:x,className:O("separator"),role:"separator"},v("separator"));return i.createElement("li",H,I)},K=function(y,x){if(y.visible===!1)return null;var _=p({className:O("label")},v("label")),M=y.label&&i.createElement("span",_,y.label),I=p({href:y.url||"#",className:O("action"),target:y.target,onClick:function(o){return R(o,y)},"aria-disabled":y.disabled},v("action")),H=i.createElement("a",I,M);if(y.template){var X={onClick:function(o){return R(o,y)},className:"p-menuitem-link",labelClassName:"p-menuitem-text",element:H,props:r};H=se.getJSXElement(y.template,y,X)}var U=y.id||m+"_"+x,c=p({id:U,key:U,className:O("menuitem",{item:y}),style:y.style},v("menuitem"));return i.createElement("li",c,H)},z=function(){if(r.model){var y=r.model.map(function(x,_){if(x.visible===!1)return null;var M=K(x,_),I=_===r.model.length-1?null:J(_),H=m+"_"+_;return i.createElement(i.Fragment,{key:H},M,I)});return y}return null};ye(function(){m||S(Ne())}),i.useImperativeHandle(n,function(){return{props:r,getElement:function(){return g.current}}});var T=$(),E=z(),N=J("home"),u=p({className:O("menu")},v("menu")),b=p({id:r.id,ref:g,className:O("root"),style:r.style,"aria-label":"Breadcrumb"},an.getOtherProps(r),v("root"));return i.createElement("nav",b,i.createElement("ul",u,T,N,E))}));ut.displayName="BreadCrumb";function We(e){"@babel/helpers - typeof";return We=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},We(e)}function Jt(e,n){if(We(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(We(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function Ut(e){var n=Jt(e,"string");return We(n)==="symbol"?n:String(n)}function Wt(e,n,t){return n=Ut(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function Zt(e){if(Array.isArray(e))return e}function Vt(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function Bn(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function Ft(e,n){if(e){if(typeof e=="string")return Bn(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return Bn(e,n)}}function Yt(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function qt(e,n){return Zt(e)||Vt(e,n)||Ft(e,n)||Yt()}var Qt={icon:function(n){var t=n.item;return C("p-menuitem-icon",t.icon)},label:"p-steps-title",step:"p-steps-number",action:"p-menuitem-link",menuitem:function(n){var t=n.active,r=n.disabled,s=n.item;return C("p-steps-item",s.className,{"p-highlight p-steps-current":t,"p-disabled":r})},root:function(n){var t=n.props;return C("p-steps p-component",{"p-readonly":t.readOnly},t.className)}},Gt=`
@layer primereact {
    .p-steps {
        position: relative;
    }
    
    .p-steps ul {
        padding: 0;
        margin: 0;
        list-style-type: none;
        display: flex;
    }
    
    .p-steps-item {
        position: relative;
        display: flex;
        justify-content: center;
        flex: 1 1 auto;
    }
    
    .p-steps-item .p-menuitem-link {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
        text-decoration: none;
    }
    
    .p-steps.p-readonly .p-steps-item {
        cursor: auto;
    }
    
    .p-steps-item.p-steps-current .p-menuitem-link {
        cursor: default;
    }
    
    .p-steps-title {
        white-space: nowrap;
    }
    
    .p-steps-number {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .p-steps-title {
        display: block;
    }
}
`,on=we.extend({defaultProps:{__TYPE:"Steps",id:null,model:null,activeIndex:0,readOnly:!0,style:null,className:null,onSelect:null,children:void 0},css:{classes:Qt,styles:Gt}});function Kn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function er(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Kn(Object(t),!0).forEach(function(r){Wt(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Kn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var st=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=on.getProps(e,t),s=i.useState(r.id),d=qt(s,2),m=d[0],S=d[1],g=i.useRef(null),P=on.setMetaData({props:r,state:{id:m}}),v=P.ptm,O=P.cx,Y=P.isUnstyled;Oe(on.css.styles,Y,{name:"steps"});var R=function(E,N,u){if(r.readOnly||N.disabled){E.preventDefault();return}r.onSelect&&r.onSelect({originalEvent:E,item:N,index:u}),N.url||E.preventDefault(),N.command&&N.command({originalEvent:E,item:N,index:u})},$=function(E,N){if(E.visible===!1)return null;var u=E.id||m+"_"+N,b=N===r.activeIndex,f=E.disabled||N!==r.activeIndex&&r.readOnly,y=f?-1:"",x=C("p-menuitem-icon",E.icon),_=p({className:O("icon",{item:E})},v("icon")),M=ae.getJSXIcon(E.icon,er({},_),{props:r}),I=p({className:O("label")},v("label")),H=E.label&&i.createElement("span",I,E.label),X=p({className:O("step")},v("step")),U=p({href:E.url||"#",className:O("action"),role:"presentation",target:E.target,onClick:function(j){return R(j,E,N)},tabIndex:y},v("action")),c=i.createElement("a",U,i.createElement("span",X,N+1),M,H);if(E.template){var a={onClick:function(j){return R(j,E,N)},className:"p-menuitem-link",labelClassName:"p-steps-title",numberClassName:"p-steps-number",iconClassName:x,element:c,props:r,tabIndex:y,active:b,disabled:f};c=se.getJSXElement(E.template,E,a)}var o=p({key:u,id:u,className:O("menuitem",{active:b,disabled:f,item:E}),style:E.style,role:"tab","aria-selected":b,"aria-expanded":b},v("menuitem"));return i.createElement("li",o,c)},J=function(){var E=p({role:"tablist"},v("menu"));if(r.model){var N=r.model.map($);return i.createElement("ul",E,N)}return null};ye(function(){m||S(Ne())}),i.useImperativeHandle(n,function(){return{props:r,getElement:function(){return g.current}}});var K=p({id:r.id,ref:g,className:O("root"),style:r.style},on.getOtherProps(r),v("root")),z=J();return i.createElement("div",K,z)}));st.displayName="Steps";function Ze(e){"@babel/helpers - typeof";return Ze=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},Ze(e)}function nr(e,n){if(Ze(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(Ze(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function tr(e){var n=nr(e,"string");return Ze(n)==="symbol"?n:String(n)}function rr(e,n,t){return n=tr(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function ar(e){if(Array.isArray(e))return e}function ir(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function zn(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function or(e,n){if(e){if(typeof e=="string")return zn(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return zn(e,n)}}function lr(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Xn(e,n){return ar(e)||ir(e,n)||or(e,n)||lr()}var ur={icon:function(n){var t=n._icon;return C("p-menuitem-icon",t)},label:"p-menuitem-text",action:"p-menuitem-link",menuitem:function(n){var t=n._className,r=n.active,s=n.disabled;return C("p-tabmenuitem",{"p-highlight":r,"p-disabled":s},t)},inkbar:"p-tabmenu-ink-bar",menu:"p-tabmenu-nav p-reset",root:function(n){var t=n.props;return C("p-tabmenu p-component",t.className)}},sr=`
@layer primereact {
    .p-tabmenu {
        overflow-x: auto;
    }
    
    .p-tabmenu-nav {
        display: flex;
        margin: 0;
        padding: 0;
        list-style-type: none;
        flex-wrap: nowrap;
    }
    
    .p-tabmenu-nav a {
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        position: relative;
        text-decoration: none;
        text-decoration: none;
        overflow: hidden;
    }
    
    .p-tabmenu-nav a:focus {
        z-index: 1;
    }
    
    .p-tabmenu-nav .p-menuitem-text {
        line-height: 1;
    }
    
    .p-tabmenu-ink-bar {
        display: none;
        z-index: 1;
    }
    
    .p-tabmenu::-webkit-scrollbar {
        display: none;
    }
}
`,ln=we.extend({defaultProps:{__TYPE:"TabMenu",id:null,model:null,activeIndex:0,style:null,className:null,onTabChange:null,children:void 0},css:{classes:ur,styles:sr}});function Jn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function cr(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Jn(Object(t),!0).forEach(function(r){rr(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Jn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var ct=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=ln.getProps(e,t),s=i.useState(r.id),d=Xn(s,2),m=d[0],S=d[1],g=i.useState(r.activeIndex),P=Xn(g,2),v=P[0],O=P[1],Y=i.useRef(null),R=i.useRef(null),$=i.useRef(null),J=i.useRef({}),K=r.onTabChange?r.activeIndex:v,z=ln.setMetaData({props:r,state:{id:m,activeIndex:v}}),T=z.ptm,E=z.cx,N=z.isUnstyled,u=function(c,a,o){return T(c,{context:{item:a,index:o}})};Oe(ln.css.styles,N,{name:"tabmenu"});var b=function(c,a,o){if(a.disabled){c.preventDefault();return}a.url||c.preventDefault(),a.command&&a.command({originalEvent:c,item:a}),r.onTabChange?r.onTabChange({originalEvent:c,value:a,index:o}):O(o)},f=function(c){return c===(K||0)},y=function(){if(r.model){var c=J.current["tab_".concat(K)];R.current.style.width=A.getWidth(c)+"px",R.current.style.left=A.getOffset(c).left-A.getOffset($.current).left+"px"}};ye(function(){m||S(Ne())}),i.useImperativeHandle(n,function(){return{props:r,getElement:function(){return Y.current}}}),i.useEffect(function(){y()});var x=function(c,a){if(c.visible===!1)return null;var o=c.className,w=c.style,j=c.disabled,Z=c.icon,V=c.label,F=c.template,ee=c.url,ne=c.target,W=c.id||m+"_"+a,D=f(a),G=C("p-menuitem-icon",Z),le=p({className:E("icon",{_icon:Z})},u("icon",c,a)),pe=ae.getJSXIcon(Z,cr({},le),{props:r}),ie=p({className:E("label")},u("label",c,a)),me=V&&i.createElement("span",ie,V),ve=p({href:ee||"#",className:E("action"),target:ne,onClick:function(fe){return b(fe,c,a)},role:"presentation"},u("action",c,a)),oe=i.createElement("a",ve,pe,me,i.createElement(Te,null));if(F){var re={onClick:function(fe){return b(fe,c,a)},className:"p-menuitem-link",labelClassName:"p-menuitem-text",iconClassName:G,element:oe,props:r,active:D,index:a,disabled:j};oe=se.getJSXElement(F,c,re)}var ge=p({ref:J.current["tab_".concat(a)],id:W,key:W,className:E("menuitem",{_className:o,active:D,disabled:j}),style:w,role:"tab","aria-selected":D,"aria-expanded":D,"aria-disabled":j},u("menuitem",c,a));return i.createElement("li",ge,oe)},_=function(){return r.model.map(x)};if(r.model){var M=_(),I=p({ref:R,className:E("inkbar")},T("inkbar")),H=p({ref:$,className:E("menu"),role:"tablist"},T("menu")),X=p({id:r.id,ref:Y,className:E("root"),style:r.style},ln.getOtherProps(r),T("root"));return i.createElement("div",X,i.createElement("ul",H,M,i.createElement("li",I)))}return null}));ct.displayName="TabMenu";function In(){return In=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var t=arguments[n];for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r])}return e},In.apply(this,arguments)}function mr(e){if(Array.isArray(e))return e}function pr(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function Un(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function fr(e,n){if(e){if(typeof e=="string")return Un(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return Un(e,n)}}function dr(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function je(e,n){return mr(e)||pr(e,n)||fr(e,n)||dr()}var br={root:function(n){var t=n.props,r=n.context;return C("p-tieredmenu p-component",{"p-tieredmenu-overlay":t.popup,"p-input-filled":r&&r.inputStyle==="filled"||ce.inputStyle==="filled","p-ripple-disabled":r&&r.ripple===!1||ce.ripple===!1},t.className)},separator:"p-menu-separator",icon:function(n){var t=n._icon;return C("p-menuitem-icon",t)},label:"p-menuitem-text",submenuIcon:"p-submenu-icon",action:function(n){var t=n.disabled;return C("p-menuitem-link",{"p-disabled":t})},menuitem:function(n){var t=n._className,r=n.active;return C("p-menuitem",{"p-menuitem-active":r},t)},menu:function(n){var t=n.subProps;return C({"p-submenu-list":!t.root})},submenu:function(n){var t=n.subProps;return C({"p-submenu-list":!t.root})},transition:"p-connected-overlay"},vr={submenu:function(n){var t=n.subProps;return{display:!t.root&&t.parentActive?"block":"none"}}},yr=`
@layer primereact {
    .p-tieredmenu-overlay {
        position: absolute;
    }
    
    .p-tieredmenu ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    .p-tieredmenu .p-submenu-list {
        position: absolute;
        min-width: 100%;
        z-index: 1;
        display: none;
    }
    
    .p-tieredmenu .p-menuitem-link {
        cursor: pointer;
        display: flex;
        align-items: center;
        text-decoration: none;
        overflow: hidden;
        position: relative;
    }
    
    .p-tieredmenu .p-menuitem-text {
        line-height: 1;
    }
    
    .p-tieredmenu .p-menuitem {
        position: relative;
    }
    
    .p-tieredmenu .p-menuitem-link .p-submenu-icon {
        margin-left: auto;
    }
    
    .p-tieredmenu .p-menuitem-active > .p-submenu-list {
        display: block;
        left: 100%;
        top: 0;
    }
    
    .p-tieredmenu .p-menuitem-active > .p-submenu-list-flipped {
        left: -100%;
    }
}
`,un=we.extend({defaultProps:{__TYPE:"TieredMenu",id:null,model:null,popup:!1,style:null,className:null,autoZIndex:!0,baseZIndex:0,breakpoint:void 0,scrollHeight:"400px",appendTo:null,transitionOptions:null,onShow:null,onHide:null,submenuIcon:null,children:void 0},css:{classes:br,styles:yr,inlineStyles:vr}});function Ve(e){"@babel/helpers - typeof";return Ve=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},Ve(e)}function gr(e,n){if(Ve(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(Ve(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function hr(e){var n=gr(e,"string");return Ve(n)==="symbol"?n:String(n)}function Sr(e,n,t){return n=hr(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function Wn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function Zn(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Wn(Object(t),!0).forEach(function(r){Sr(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Wn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var _n=i.memo(function(e){var n=i.useState(null),t=je(n,2),r=t[0],s=t[1],d=i.useRef(null),m=e.ptm,S=e.cx,g=e.sx,P=function(a,o){return m(o,{hostName:e.hostName,context:{active:r===a}})},v=De({type:"click",listener:function(a){!e.isMobileMode&&d.current&&!d.current.contains(a.target)&&s(null)}}),O=je(v,1),Y=O[0],R=Nn({listener:function(){!e.isMobileMode&&s(null)}}),$=je(R,1),J=$[0],K=function(){if(d.current){var a=d.current.parentElement,o=A.getOffset(a),w=A.getViewport(),j=d.current.offsetParent?d.current.offsetWidth:A.getHiddenElementOuterWidth(d.current),Z=A.getOuterWidth(a.children[0]),V=parseInt(o.top,10)+d.current.offsetHeight-A.getWindowScrollTop();V>w.height?d.current.style.top=w.height-V+"px":d.current.style.top="0px",parseInt(o.left,10)+Z+j>w.width-A.calculateScrollbarWidth()&&A.addClass(d.current,"p-submenu-list-flipped")}},z=function(a,o){if(o.disabled||e.isMobileMode){a.preventDefault();return}e.root?(r||e.popup)&&s(o):s(o)},T=function(a,o){if(o.disabled){a.preventDefault();return}o.url||a.preventDefault(),o.command&&o.command({originalEvent:a,item:o}),(e.root||e.isMobileMode)&&o.items&&s(r&&o===r?null:o),o.items||f(a)},E=function(a,o){var w=a.currentTarget.parentElement;switch(a.which){case 40:var j=u(w);j&&j.children[0].focus(),a.preventDefault();break;case 38:var Z=b(w);Z&&Z.children[0].focus(),a.preventDefault();break;case 39:o.items&&(s(o),setTimeout(function(){w.children[1].children[0].children[0].focus()},50)),a.preventDefault();break}e.onKeyDown&&e.onKeyDown(a,w)},N=function(a,o){a.which===37&&(s(null),o.parentElement.previousElementSibling.focus())},u=function c(a){var o=a.nextElementSibling;return o?A.hasClass(o,"p-disabled")||!A.hasClass(o,"p-menuitem")?c(o):o:null},b=function c(a){var o=a.previousElementSibling;return o?A.hasClass(o,"p-disabled")||!A.hasClass(o,"p-menuitem")?c(o):o:null},f=function(a){(!e.isMobileMode||e.popup)&&(s(null),e.onLeafClick&&e.onLeafClick(a),e.onHide&&e.onHide(a))};ye(function(){Y(),J()}),be(function(){e.parentActive||s(null),!e.root&&e.parentActive&&!e.isMobileMode&&K()},[e.parentActive]),be(function(){e.onItemToggle&&e.onItemToggle()},[r]);var y=function(a){var o="separator_"+a,w=p({key:o,className:S("separator"),role:"separator"},m("separator",{hostName:e.hostName}));return i.createElement("li",w)},x=function(a,o){return a.items?i.createElement(_n,{id:e.id+"_"+o,menuProps:e.menuProps,model:a.items,onLeafClick:f,popup:e.popup,onKeyDown:N,parentActive:a===r,isMobileMode:e.isMobileMode,onItemToggle:e.onItemToggle,submenuIcon:e.submenuIcon,ptm:e.ptm,cx:S,sx:g}):null},_=function(a,o){if(a.visible===!1)return null;var w=a.id,j=a.className,Z=a.style,V=a.disabled,F=a.icon,ee=a.label,ne=a.items,W=a.target,D=a.url,G=a.template,le=w||e.id+"_"+o,pe=r===a,ie=C("p-menuitem-link",{"p-disabled":V}),me=C("p-menuitem-icon",F),ve=p({className:S("icon",{_icon:F})},P(a,"icon")),oe=ae.getJSXIcon(F,Zn({},ve),{props:e.menuProps}),re=p({className:S("label")},P(a,"label")),ge=ee&&i.createElement("span",re,ee),he="p-submenu-icon",fe=p({className:S("submenuIcon")},P(a,"submenuIcon")),Se=a.items&&ae.getJSXIcon(e.submenuIcon||i.createElement(bn,fe),Zn({},fe),{props:e.menuProps}),He=x(a,o),Be=p({href:D||"#",className:S("action",{disabled:V}),target:W,role:"menuitem","aria-haspopup":ne!=null,onClick:function(te){return T(te,a)},onKeyDown:function(te){return E(te,a)},"aria-disabled":V},P(a,"action")),ke=i.createElement("a",Be,oe,ge,Se,i.createElement(Te,null));if(G){var Ke={onClick:function(te){return T(te,a)},onKeyDown:function(te){return E(te,a)},className:ie,labelClassName:"p-menuitem-text",iconClassName:me,submenuIconClassName:he,element:ke,props:e,active:pe,disabled:V};ke=se.getJSXElement(G,a,Ke)}var Q=p({key:le,id:le,className:S("menuitem",{_className:j,active:pe}),style:Z,onMouseEnter:function(te){return z(te,a)},role:"none"},P(a,"menuitem"));return i.createElement("li",Q,ke,He)},M=function(a,o){return a.separator?y(o):_(a,o)},I=function(){return e.model?e.model.map(M):null},H=I(),X=e.root?"menu":"submenu",U=p({ref:d,className:S(X,{subProps:e}),style:g(X,{subProps:e}),role:e.root?"menubar":"menu","aria-orientation":"horizontal"},m(X,{hostName:e.hostName}));return i.createElement("ul",U,H)});_n.displayName="TieredMenuSub";var mt=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=un.getProps(e,t),s=i.useState(r.id),d=je(s,2),m=d[0],S=d[1],g=i.useState(!r.popup),P=je(g,2),v=P[0],O=P[1],Y=i.useState(null),R=je(Y,2),$=R[0],J=R[1],K=un.setMetaData({props:r,state:{id:m,visible:v,attributeSelector:$}}),z=K.ptm,T=K.cx,E=K.sx,N=K.isUnstyled;Oe(un.css.styles,N,{name:"tieredmenu"});var u=i.useRef(null),b=i.useRef(null),f=i.useRef(null),y=On("screen and (max-width: ".concat(r.breakpoint,")"),!!r.breakpoint),x=ht({target:b,overlay:u,listener:function(D,G){var le=G.valid;le&&c(D)},when:v}),_=je(x,2),M=_[0],I=_[1],H=function(D){r.popup&&wt.emit("overlay-click",{originalEvent:D,target:b.current})},X=function(D){r.popup&&(v?c(D):U(D))},U=function(D){b.current=D.currentTarget,O(!0),r.onShow&&r.onShow(D)},c=function(D){r.popup&&(b.current=D.currentTarget,O(!1),r.onHide&&r.onHide(D))},a=function(){r.popup&&y&&A.absolutePosition(u.current,b.current)},o=function(){if(!f.current){f.current=A.createInlineStyle(t&&t.nonce||ce.nonce);var D="".concat($),G=`
@media screen and (max-width: `.concat(r.breakpoint,`) {
    .p-tieredmenu[`).concat(D,`] > ul {
        max-height: `).concat(r.scrollHeight,`;
        overflow: `).concat(r.scrollHeight?"auto":"",`;
    }

    .p-tieredmenu[`).concat(D,`] .p-submenu-list {
        position: relative;
    }

    .p-tieredmenu[`).concat(D,`] .p-menuitem-active > .p-submenu-list {
        left: 0;
        box-shadow: none;
        border-radius: 0;
        padding: 0 0 0 calc(var(--inline-spacing) * 2); /* @todo */
    }

    .p-tieredmenu[`).concat(D,`] .p-menuitem-active > .p-menuitem-link > .p-submenu-icon {
        transform: rotate(-180deg);
    }

    .p-tieredmenu[`).concat(D,`] .p-submenu-icon:before {
        content: "\\e930";
    }

    `).concat(r.popup?"":".p-tieredmenu[".concat(D,"] { width: 100%; }"),`
}
`);f.current.innerHTML=G}},w=function(){f.current=A.removeInlineStyle(f.current)},j=function(){r.autoZIndex&&de.set("menu",u.current,t&&t.autoZIndex||ce.autoZIndex,r.baseZIndex||t&&t.zIndex.menu||ce.zIndex.menu),A.addStyles(u.current,{position:"absolute",top:"0",left:"0"}),A.absolutePosition(u.current,b.current),$&&r.breakpoint&&(u.current.setAttribute($,""),o())},Z=function(){M()},V=function(){b.current=null,I()},F=function(){de.clear(u.current),w()};ye(function(){var W=Ne();!m&&S(W),r.breakpoint&&!$&&J(W)}),be(function(){return $&&u.current&&(u.current.setAttribute($,""),o()),function(){w()}},[$,r.breakpoint]),En(function(){de.clear(u.current)}),i.useImperativeHandle(n,function(){return{props:r,toggle:X,show:U,hide:c,getElement:function(){return u.current}}});var ee=function(){var D=p({ref:u,id:r.id,className:T("root"),style:r.style,onClick:H},un.getOtherProps(r),z("root")),G=p({classNames:T("transition"),in:v,timeout:{enter:120,exit:100},options:r.transitionOptions,unmountOnExit:!0,onEnter:j,onEntered:Z,onExit:V,onExited:F},z("transition"));return i.createElement(Qe,In({nodeRef:u},G),i.createElement("div",D,i.createElement(_n,{id:m,hostName:"TieredMenu",menuProps:r,model:r.model,root:!0,popup:r.popup,onHide:c,isMobileMode:y,onItemToggle:a,submenuIcon:r.submenuIcon,ptm:z,cx:T,sx:E})))},ne=ee();return r.popup?i.createElement(tt,{element:ne,appendTo:r.appendTo}):ne}));mt.displayName="TieredMenu";function Le(){return Le=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var t=arguments[n];for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r])}return e},Le.apply(this,arguments)}function Ir(e){if(Array.isArray(e))return e}function xr(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function Vn(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function Pr(e,n){if(e){if(typeof e=="string")return Vn(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return Vn(e,n)}}function wr(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Pe(e,n){return Ir(e)||xr(e,n)||Pr(e,n)||wr()}var Er=`
@layer primereact {
    .p-contextmenu ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    .p-contextmenu .p-submenu-list {
        position: absolute;
        min-width: 100%;
        z-index: 1;
    }
    
    .p-contextmenu .p-menuitem-link {
        cursor: pointer;
        display: flex;
        align-items: center;
        text-decoration: none;
        overflow: hidden;
        position: relative;
    }
    
    .p-contextmenu .p-menuitem-text {
        line-height: 1;
    }
    
    .p-contextmenu .p-menuitem {
        position: relative;
    }
    
    .p-contextmenu .p-menuitem-link .p-submenu-icon {
        margin-left: auto;
    }
    
    .p-contextmenu-enter {
        opacity: 0;
    }
    
    .p-contextmenu-enter-active {
        opacity: 1;
        transition: opacity 250ms;
    }
}
`,Or={root:function(n){var t=n.context;return C("p-contextmenu p-component",{"p-input-filled":t&&t.inputStyle==="filled"||ce.inputStyle==="filled","p-ripple-disabled":t&&t.ripple===!1||ce.ripple===!1})},menu:function(n){var t=n.menuProps;return C({"p-submenu-list":!t.root})},menuitem:function(n){var t=n.item,r=n.active;return C("p-menuitem",{"p-menuitem-active":r},t.className)},action:function(n){var t=n.item;return C("p-menuitem-link",{"p-disabled":t.disabled})},icon:"p-menuitem-icon",submenuIcon:"p-submenu-icon",label:"p-menuitem-text",separator:"p-menu-separator",transition:"p-contextmenu",submenuTransition:"p-contextmenusub"},sn=we.extend({defaultProps:{__TYPE:"ContextMenu",id:null,model:null,style:null,className:null,global:!1,autoZIndex:!0,baseZIndex:0,breakpoint:void 0,scrollHeight:"400px",appendTo:null,transitionOptions:null,onShow:null,onHide:null,submenuIcon:null,children:void 0},css:{classes:Or,styles:Er}});function Fe(e){"@babel/helpers - typeof";return Fe=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},Fe(e)}function Nr(e,n){if(Fe(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(Fe(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function kr(e){var n=Nr(e,"string");return Fe(n)==="symbol"?n:String(n)}function xn(e,n,t){return n=kr(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function Fn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function Yn(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Fn(Object(t),!0).forEach(function(r){xn(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Fn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var jn=i.memo(function(e){var n=i.useState(null),t=Pe(n,2),r=t[0],s=t[1],d=i.useRef(null),m=e.root||!e.resetMenu,S=e.ptm,g=e.cx,P=function(f,y){return S(y,{hostName:e.hostName,context:{active:r===f}})};e.resetMenu===!0&&r!==null&&s(null);var v=function(f,y){if(y.disabled||e.isMobileMode){f.preventDefault();return}s(y)},O=function(f,y){if(y.disabled){f.preventDefault();return}y.url||f.preventDefault(),y.command&&y.command({originalEvent:f,item:y}),e.isMobileMode&&y.items&&s(r&&y===r?null:y),y.items||e.onLeafClick(f)},Y=function(){if(!e.isMobileMode){var f=d.current.parentElement,y=A.getOffset(f),x=A.getViewport(),_=d.current.offsetParent?d.current.offsetWidth:A.getHiddenElementOuterWidth(d.current),M=A.getOuterWidth(f.children[0]),I=parseInt(y.top,10)+d.current.offsetHeight-A.getWindowScrollTop();I>x.height?d.current.style.top=x.height-I+"px":d.current.style.top="0px",parseInt(y.left,10)+M+_>x.width-A.calculateScrollbarWidth()?d.current.style.left=-1*_+"px":d.current.style.left=M+"px"}},R=function(){Y()};be(function(){m&&Y()});var $=function(f){var y=e.id+"_separator_"+f,x=p({id:y,key:y,className:g("separator"),role:"separator"},S("separator",{hostName:e.hostName}));return i.createElement("li",x)},J=function(f,y){return f.items?i.createElement(jn,{id:e.id+"_"+y,hostName:e.hostName,menuProps:e.menuProps,model:f.items,resetMenu:f!==r,onLeafClick:e.onLeafClick,isMobileMode:e.isMobileMode,submenuIcon:e.submenuIcon,ptm:S,cx:g}):null},K=function(f,y){if(f.visible===!1)return null;var x=r===f,_=f.id||e.id+"_"+y,M=p({className:g("icon")},P(f,"icon")),I=ae.getJSXIcon(f.icon,Yn({},M),{props:e.menuProps}),H=p({className:g("submenuIcon")},P(f,"submenuIcon")),X=p({className:g("label")},P(f,"label")),U=f.items&&ae.getJSXIcon(e.submenuIcon||i.createElement(bn,H),Yn({},H),{props:e.menuProps}),c=f.label&&i.createElement("span",X,f.label),a=J(f,y),o=p({href:f.url||"#",className:g("action",{item:f}),target:f.target,onClick:function(F){return O(F,f)},role:"menuitem","aria-haspopup":f.items!=null,"aria-disabled":f.disabled},P(f,"action")),w=i.createElement("a",o,I,c,U,i.createElement(Te,null));if(f.template){var j={onClick:function(F){return O(F,f)},className:"p-menuitem-link",labelClassName:"p-menuitem-text",iconClassName:"p-menuitem-icon",submenuIconClassName:g("submenuIcon"),element:w,props:e,active:x};w=se.getJSXElement(f.template,f,j)}var Z=p(xn(xn({id:_,key:_,role:"none",className:g("menuitem",{item:f,active:x}),style:f.style},"key",_),"onMouseEnter",function(F){return v(F,f)}),P(f,"menuitem"));return i.createElement("li",Z,w,a)},z=function(f,y){return f.separator?$(y):K(f,y)},T=function(){return e.model?e.model.map(z):null},E=T(),N=p({className:g("menu",{menuProps:e})},S("menu",{hostName:e.hostName})),u=p({classNames:g("submenuTransition"),in:m,timeout:{enter:0,exit:0},unmountOnExit:!0,onEnter:R},S("menu.transition",{hostName:e.hostName}));return i.createElement(Qe,Le({nodeRef:d},u),i.createElement("ul",Le({ref:d},N),E))});jn.displayName="ContextMenuSub";var pt=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=sn.getProps(e,t),s=i.useState(r.id),d=Pe(s,2),m=d[0],S=d[1],g=i.useState(!1),P=Pe(g,2),v=P[0],O=P[1],Y=i.useState(!1),R=Pe(Y,2),$=R[0],J=R[1],K=i.useState(!1),z=Pe(K,2),T=z[0],E=z[1],N=i.useState(null),u=Pe(N,2),b=u[0],f=u[1],y=sn.setMetaData({props:r,state:{id:m,visible:v,reshow:$,resetMenu:T,attributeSelector:b}}),x=y.ptm,_=y.cx,M=y.isUnstyled;Oe(sn.css.styles,M,{name:"contextmenu"});var I=i.useRef(null),H=i.useRef(null),X=i.useRef(null),U=On("screen and (max-width: ".concat(r.breakpoint,")"),!!r.breakpoint),c=De({type:"click",listener:function(B){Se(B)&&B.button!==2&&(me(B),E(!0))}}),a=Pe(c,2),o=a[0],w=a[1],j=De({type:"contextmenu",when:r.global,listener:function(B){ie(B)}}),Z=Pe(j,1),V=Z[0],F=Nn({listener:function(B){v&&!A.isTouchDevice()&&me(B)}}),ee=Pe(F,2),ne=ee[0],W=ee[1],D=function(){if(!X.current){X.current=A.createInlineStyle(t&&t.nonce||ce.nonce);var B="".concat(b),te=`
@media screen and (max-width: `.concat(r.breakpoint,`) {
    .p-contextmenu[`).concat(B,`] > ul {
        max-height: `).concat(r.scrollHeight,`;
        overflow: `).concat(r.scrollHeight?"auto":"",`;
    }

    .p-contextmenu[`).concat(B,`] .p-submenu-list {
        position: relative;
    }

    .p-contextmenu[`).concat(B,`] .p-menuitem-active > .p-submenu-list {
        left: 0;
        box-shadow: none;
        border-radius: 0;
        padding: 0 0 0 calc(var(--inline-spacing) * 2); /* @todo */
    }

    .p-contextmenu[`).concat(B,`] .p-menuitem-active > .p-menuitem-link > .p-submenu-icon {
        transform: rotate(-180deg);
    }

    .p-contextmenu[`).concat(B,`] .p-submenu-icon:before {
        content: "\\e930";
    }
}
`);X.current.innerHTML=te}},G=function(){X.current=A.removeInlineStyle(X.current)},le=function(){E(!1)},pe=function(){E(!1)},ie=function(B){B.stopPropagation(),B.preventDefault(),H.current=B,v?J(!0):(O(!0),r.onShow&&r.onShow(H.current))},me=function(B){H.current=B,O(!1),J(!1),r.onHide&&r.onHide(H.current)},ve=function(){A.addStyles(I.current,{position:"absolute"}),r.autoZIndex&&de.set("menu",I.current,t&&t.autoZIndex||ce.autoZIndex,r.baseZIndex||t&&t.zIndex.menu||ce.zIndex.menu),he(H.current),b&&r.breakpoint&&(I.current.setAttribute(b,""),D())},oe=function(){He()},re=function(){Be(),de.clear(I.current)},ge=function(){de.clear(I.current),G()},he=function(B){if(B){var te=B.pageX+1,Ie=B.pageY+1,$e=I.current.offsetParent?I.current.offsetWidth:A.getHiddenElementOuterWidth(I.current),Ge=I.current.offsetParent?I.current.offsetHeight:A.getHiddenElementOuterHeight(I.current),en=A.getViewport();te+$e-document.body.scrollLeft>en.width&&(te-=$e),Ie+Ge-document.body.scrollTop>en.height&&(Ie-=Ge),te<document.body.scrollLeft&&(te=document.body.scrollLeft),Ie<document.body.scrollTop&&(Ie=document.body.scrollTop),I.current.style.left=te+"px",I.current.style.top=Ie+"px"}},fe=function(B){E(!0),me(B),B.stopPropagation()},Se=function(B){return I&&I.current&&!(I.current.isSameNode(B.target)||I.current.contains(B.target))},He=function(){ne(),o()},Be=function(){W(),w()};ye(function(){var Q=Ne();!m&&S(Q),r.global&&V(),r.breakpoint&&!b&&f(Q)}),be(function(){r.global&&V()},[r.global]),be(function(){return b&&I.current&&(I.current.setAttribute(b,""),D()),function(){G()}},[b,r.breakpoint]),be(function(){v?(O(!1),J(!1),E(!0)):!$&&!v&&T&&ie(H.current)},[$]),En(function(){de.clear(I.current)}),i.useImperativeHandle(n,function(){return{props:r,show:ie,hide:me,getElement:function(){return I.current}}});var ke=function(){var B=p({id:r.id,className:C(r.className,_("root",{context:t})),style:r.style,onClick:function($e){return le()},onMouseEnter:function($e){return pe()}},sn.getOtherProps(r),x("root")),te=p({classNames:_("transition"),in:v,timeout:{enter:250,exit:0},options:r.transitionOptions,unmountOnExit:!0,onEnter:ve,onEntered:oe,onExit:re,onExited:ge},x("transition"));return i.createElement(Qe,Le({nodeRef:I},te),i.createElement("div",Le({ref:I},B),i.createElement(jn,{hostName:"ContextMenu",id:m,menuProps:r,model:r.model,root:!0,resetMenu:T,onLeafClick:fe,isMobileMode:U,submenuIcon:r.submenuIcon,ptm:x,cx:_})))},Ke=ke();return i.createElement(tt,{element:Ke,appendTo:r.appendTo})}));pt.displayName="ContextMenu";function dn(){return dn=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var t=arguments[n];for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r])}return e},dn.apply(this,arguments)}function Ye(e){"@babel/helpers - typeof";return Ye=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},Ye(e)}function Cr(e,n){if(Ye(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(Ye(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function _r(e){var n=Cr(e,"string");return Ye(n)==="symbol"?n:String(n)}function jr(e,n,t){return n=_r(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function Mr(e){if(Array.isArray(e))return e}function $r(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function qn(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function Ar(e,n){if(e){if(typeof e=="string")return qn(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return qn(e,n)}}function Rr(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Re(e,n){return Mr(e)||$r(e,n)||Ar(e,n)||Rr()}var Dr={root:function(n){var t=n.props,r=n.mobileActiveState;return C("p-megamenu p-component",{"p-megamenu-horizontal":t.orientation==="horizontal","p-megamenu-vertical":t.orientation==="vertical","p-megamenu-mobile-active":r})},separator:"p-menu-separator",submenuIcon:"p-submenu-icon",action:function(n){var t=n.item;return C("p-menuitem-link",{"p-disabled":t.disabled})},submenuItem:"p-menuitem",submenuHeader:function(n){var t=n.submenu;return C("p-megamenu-submenu-header",{"p-disabled":t.disabled})},submenu:"p-megamenu-submenu",panel:"p-megamenu-panel",grid:"p-megamenu-grid",icon:"p-menuitem-icon",label:"p-menuitem-text",column:function(n){var t=n.category,r=t.items?t.items.length:0,s;switch(r){case 2:s="p-megamenu-col-6";break;case 3:s="p-megamenu-col-4";break;case 4:s="p-megamenu-col-3";break;case 6:s="p-megamenu-col-2";break;default:s="p-megamenu-col-12";break}return s},headerAction:function(n){var t=n.category;return C("p-menuitem-link",{"p-disabled":t.disabled})},menuButton:"p-megamenu-button",menuitem:function(n){var t=n.category,r=n.activeItemState;return C("p-menuitem",{"p-menuitem-active":t===r})},menubar:"p-megamenu-root-list",menu:"p-megamenu-root-list",start:"p-megamenu-start",end:"p-megamenu-end"},Tr=`
@layer primereact {
    .p-megamenu {
        display: flex;
    }
    
    .p-megamenu-root-list {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    .p-megamenu-root-list > .p-menuitem {
        position: relative;
    }
    
    .p-megamenu .p-menuitem-link {
        cursor: pointer;
        display: flex;
        align-items: center;
        text-decoration: none;
        overflow: hidden;
        position: relative;
    }
    
    .p-megamenu .p-menuitem-text {
        line-height: 1;
    }
    
    .p-megamenu-panel {
        display: none;
        position: absolute;
        width: auto;
        z-index: 1;
    }
    
    .p-megamenu-root-list > .p-menuitem-active > .p-megamenu-panel {
        display: block;
    }
    
    .p-megamenu-submenu {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    /* Horizontal */
    .p-megamenu-horizontal {
        align-items: center;
    }
    
    .p-megamenu-horizontal .p-megamenu-root-list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .p-megamenu-horizontal .p-megamenu-custom,
    .p-megamenu-horizontal .p-megamenu-end {
        margin-left: auto;
        align-self: center;
    }
    
    /* Vertical */
    .p-megamenu-vertical {
        flex-direction: column;
    }
    
    .p-megamenu-vertical .p-megamenu-root-list {
        flex-direction: column;
    }
    
    .p-megamenu-vertical .p-megamenu-root-list > .p-menuitem-active > .p-megamenu-panel {
        left: 100%;
        top: 0;
    }
    
    .p-megamenu-vertical .p-megamenu-root-list > .p-menuitem > .p-menuitem-link > .p-submenu-icon {
        margin-left: auto;
    }
    
    .p-megamenu-grid {
        display: flex;
    }
    
    .p-megamenu-col-2,
    .p-megamenu-col-3,
    .p-megamenu-col-4,
    .p-megamenu-col-6,
    .p-megamenu-col-12 {
        flex: 0 0 auto;
        padding: 0.5rem;
    }
    
    .p-megamenu-col-2 {
        width: 16.6667%;
    }
    
    .p-megamenu-col-3 {
        width: 25%;
    }
    
    .p-megamenu-col-4 {
        width: 33.3333%;
    }
    
    .p-megamenu-col-6 {
        width: 50%;
    }
    
    .p-megamenu-col-12 {
        width: 100%;
    }
    
    .p-megamenu-button {
        display: none;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        text-decoration: none;
    }
}
`,cn=we.extend({defaultProps:{__TYPE:"MegaMenu",id:null,model:null,style:null,className:null,orientation:"horizontal",breakpoint:void 0,scrollHeight:"400px",start:null,submenuIcon:null,menuIcon:null,end:null,children:void 0},css:{classes:Dr,styles:Tr}});function Qn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function mn(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Qn(Object(t),!0).forEach(function(r){jr(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Qn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var Pn=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=cn.getProps(e,t),s=i.useState(r.id),d=Re(s,2),m=d[0],S=d[1],g=i.useState(null),P=Re(g,2),v=P[0],O=P[1],Y=i.useState(null),R=Re(Y,2),$=R[0],J=R[1],K=i.useState(!1),z=Re(K,2),T=z[0],E=z[1],N=i.useRef(null),u=i.useRef(null),b=i.useRef(null),f=r.orientation==="horizontal",y=r.orientation==="vertical",x=On("screen and (max-width: ".concat(r.breakpoint,")"),!!r.breakpoint),_=cn.setMetaData({props:r,state:{id:m,activeItem:v,attributeSelector:$,mobileActive:T}}),M=_.ptm,I=_.cx,H=_.isUnstyled;Oe(cn.css.styles,H,{name:"megamenu"});var X=function(l,h,q){return M(h,{context:{active:v===l,item:l,index:q}})},U=De({type:"click",listener:function(l){(!x||T)&&me(l)&&(O(null),E(!1))}}),c=Re(U,1),a=c[0],o=Nn({listener:function(){(!x||T)&&(O(null),E(!1))}}),w=Re(o,1),j=w[0],Z=function(l,h){if(h.disabled){l.preventDefault();return}h.url||l.preventDefault(),h.command&&h.command({originalEvent:l,item:h}),O(null),E(!1)},V=function(l,h){if(h.disabled||x){l.preventDefault();return}v&&O(h)},F=function(l,h){if(h.disabled){l.preventDefault();return}h.url||l.preventDefault(),h.command&&(h.command({originalEvent:l,item:r.item}),l.preventDefault()),h.items&&(O(v&&v===h?null:h),l.preventDefault())},ee=function(l,h){var q=l.currentTarget.parentElement;switch(l.which){case 40:f?ne(h):pe(q),l.preventDefault();break;case 38:y?ie(q):h.items&&h===v&&W(),l.preventDefault();break;case 39:f?pe(q):ne(h),l.preventDefault();break;case 37:f?ie(q):h.items&&h===v&&W(),l.preventDefault();break}},ne=function(l){l.items&&O(l)},W=function(l){O(null)},D=function(l){l.preventDefault(),E(function(h){return!h}),O(null)},G=function L(l){var h=l.nextElementSibling;return h?A.getAttribute(h,'[data-p-disabled="true"]')||!A.getAttribute(h,'[data-pc-section="menuitem"]')?L(h):h:null},le=function L(l){var h=l.previousElementSibling;return h?A.getAttribute(h,'[data-p-disabled="true"]')||!A.getAttribute(h,'[data-pc-section="menuitem"]')?L(h):h:null},pe=function(l){var h=G(l);h&&h.children[0].focus()},ie=function(l){var h=le(l);h&&h.children[0].focus()},me=function(l){return N.current&&!(N.current.isSameNode(l.target)||N.current.contains(l.target)||b.current&&b.current.contains(l.target))};i.useImperativeHandle(n,function(){return{props:r,getElement:function(){return N.current}}}),ye(function(){var L=Ne();!m&&S(L),r.breakpoint&&!$&&J(L),a(),j()}),be(function(){var L=A.findSingle(N.current,".p-menuitem-active > .p-megamenu-panel");return v&&!x&&de.set("menu",L,t&&t.autoZIndex||ce.autoZIndex,t&&t.zIndex.menu||ce.zIndex.menu),x&&L&&L.previousElementSibling.scrollIntoView({block:"nearest",inline:"nearest"}),function(){de.clear(L)}},[v]);var ve=function(l){var h=m+"_separator__"+l,q=p({id:h,key:h,className:I("separator"),role:"separator"},M("separator"));return i.createElement("li",q)},oe=function(l){if(l.items){var h=p({className:I("submenuIcon")},M("submenuIcon")),q=y?r.submenuIcon||i.createElement(bn,h):r.submenuIcon||i.createElement(at,h),ue=ae.getJSXIcon(q,mn({},h),{props:r});return ue}return null},re=function(l,h){if(l.visible===!1)return null;if(l.separator)return ve(h);var q=l.id||m+"_"+h,ue=C("p-menuitem-link",{"p-disabled":l.disabled}),xe=p({className:C(l.icon,I("icon"))},M("icon")),Ae=p({className:I("label")},M("label")),Ce=C(l.icon,"p-menuitem-icon"),vn=ae.getJSXIcon(l.icon,mn({},xe),{props:r}),yn=l.label&&i.createElement("span",Ae,l.label),gn=p({href:l.url||"#",className:I("action",{item:l}),target:l.target,onClick:function(hn){return Z(hn,l)},role:"menuitem","aria-disabled":l.disabled},X(l,"action",h)),nn=p({key:q,id:q,className:C(l.className,I("submenuItem")),style:l.style,role:"none"},X(l,"submenuItem",h)),ze=i.createElement("a",gn,vn,yn,i.createElement(Te,null));if(l.template){var tn={onClick:function(hn){return Z(hn,l)},className:ue,labelClassName:"p-menuitem-text",iconClassName:Ce,element:ze,props:r};ze=se.getJSXElement(l.template,l,tn)}return i.createElement("li",nn,ze)},ge=function(l,h){if(l.visible===!1)return null;var q=l.items.map(re),ue=l.id||m+"_sub_"+h,xe=p({id:ue,key:ue,className:C(l.className,I("submenuHeader",{submenu:l})),style:l.style,role:"presentation","data-p-disabled":l.disabled},M("submenuHeader"));return i.createElement(i.Fragment,{key:ue},i.createElement("li",xe,l.label),q)},he=function(l){return l.map(ge)},fe=function(l,h,q){var ue=l.label+"_column_"+q,xe=he(h),Ae=p({key:ue,className:I("column",{category:l})},M("column")),Ce=p({className:I("submenu"),style:{display:v===l?"block":"none"},role:"menu"},M("submenu"));return i.createElement("div",Ae,i.createElement("ul",Ce,xe))},Se=function(l){return l.items?l.items.map(function(h,q){return fe(l,h,q)}):null},He=function(l){if(l.items){var h=Se(l),q=p({className:I("panel")},M("panel")),ue=p({className:I("grid")},M("grid"));return i.createElement("div",q,i.createElement("div",ue,h))}return null},Be=function(){if(!u.current){u.current=A.createInlineStyle(t&&t.nonce||ce.nonce);var l="".concat($),h=`
@media screen and (max-width: `.concat(r.breakpoint,`) {
    .p-megamenu[`).concat(l,`] > .p-megamenu-root-list .p-menuitem-active .p-megamenu-panel {
        position: relative;
        left: 0;
        box-shadow: none;
        border-radius: 0;
        background: inherit;
    }

    .p-megamenu[`).concat(l,`] .p-menuitem-active > .p-menuitem-link > .p-submenu-icon {
        transform: rotate(-180deg);
    }

    .p-megamenu[`).concat(l,`] .p-megamenu-grid {
        flex-wrap: wrap;
    }

    `).concat(f?`
.p-megamenu[`.concat(l,`] .p-megamenu-button {
    display: flex;
}

.p-megamenu[`).concat(l,`].p-megamenu-horizontal {
    position: relative;
}

.p-megamenu[`).concat(l,`].p-megamenu-horizontal .p-megamenu-root-list {
    display: none;
}

.p-megamenu-horizontal[`).concat(l,`] div[class*="p-megamenu-col-"] {
    width: auto;
    flex: 1;
    padding: 0;
}

.p-megamenu[`).concat(l,`].p-megamenu-mobile-active .p-megamenu-root-list {
    display: flex;
    flex-direction: column;
    position: absolute;
    width: 100%;
    top: 100%;
    left: 0;
    z-index: 1;
}
        `):"",`

    `).concat(y?`
.p-megamenu-vertical[`.concat(l,`] {
    width: 100%;
}

.p-megamenu-vertical[`).concat(l,`] .p-megamenu-root-list {
    max-height: `).concat(r.scrollHeight,`;
    overflow: `).concat(r.scrollHeight?"auto":"",`;
}
.p-megamenu-vertical[`).concat(l,`] div[class*="p-megamenu-col-"] {
    width: 100%;
    padding: 0;
}

.p-megamenu-vertical[`).concat(l,`] .p-megamenu-submenu {
    width: 100%;
}

.p-megamenu-vertical[`).concat(l,`] div[class*="p-megamenu-col-"] .p-megamenu-submenu-header {
    background: inherit;
}

.p-megamenu-vertical[`).concat(l,`] .p-submenu-icon:before {
    content: "\\e930";
}
        `):"",`
}
`);u.current.innerHTML=h}},ke=function(){u.current=A.removeInlineStyle(u.current)};be(function(){return $&&N.current&&(N.current.setAttribute($,""),Be()),function(){ke()}},[$,r.breakpoint]);var Ke=function(l,h){var q=p({className:I("icon")},X(l,"icon",h)),ue=ae.getJSXIcon(l.icon,mn({},q),{props:r}),xe=p({className:I("label")},X(l,"label",h)),Ae=l.label&&i.createElement("span",xe,l.label),Ce=l.template?se.getJSXElement(l.template,l):null,vn=oe(l),yn=He(l),gn=p({href:l.url||"#",className:I("headerAction",{category:l}),target:l.target,onClick:function(_e){return F(_e,l)},onKeyDown:function(_e){return ee(_e,l)},role:"menuitem","aria-haspopup":l.items!=null,"data-p-disabled":l.disabled},X(l,"headerAction",h)),nn=l.id||m+"_cat_"+h,ze=p({key:nn,id:nn,className:C(l.className,I("menuitem",{category:l,activeItemState:v})),style:l.style,onMouseEnter:function(_e){return V(_e,l)},role:"none","data-p-disabled":l.disabled||!1},X(l,"menuitem",h));return i.createElement("li",ze,i.createElement("a",gn,ue,Ae,Ce,vn,i.createElement(Te,null)),yn)},Q=function(){var l=p({className:I("menu"),role:"menubar"},M("menu"));return r.model?i.createElement("ul",l,r.model.map(function(h,q){return Ke(h,q)})):null},B=function(){var l=p({className:I("start")},M("start"));if(r.start){var h=se.getJSXElement(r.start,r);return i.createElement("div",l,h)}return null},te=function(){var l=p({className:I("end")},M("end"));if(r.end){var h=se.getJSXElement(r.end,r);return i.createElement("div",l,h)}return null},Ie=function(){if(r.orientation==="vertical"||r.model&&r.model.length<1)return null;var l=p({className:I("menuButton"),href:"#",role:"button",tabIndex:0,onClick:function(Ce){return D(Ce)}},M("menuButton")),h=p(M("menuButtonIcon")),q=r.menuIcon||i.createElement(rt,h),ue=ae.getJSXIcon(q,mn({},h),{props:r}),xe=i.createElement("a",dn({ref:b},l),ue);return xe},$e=p({className:C(r.className,I("root",{mobileActiveState:T})),style:r.style},cn.getOtherProps(r),M("root")),Ge=Q(),en=B(),yt=te(),gt=Ie();return i.createElement("div",dn({id:r.id,ref:N},$e),en,gt,Ge,yt)}));Pn.displayName="MegaMenu";function Me(){return Me=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var t=arguments[n];for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r])}return e},Me.apply(this,arguments)}function qe(e){"@babel/helpers - typeof";return qe=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},qe(e)}function Lr(e,n){if(qe(e)!=="object"||e===null)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var r=t.call(e,n||"default");if(qe(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function Hr(e){var n=Lr(e,"string");return qe(n)==="symbol"?n:String(n)}function ft(e,n,t){return n=Hr(n),n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function wn(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=new Array(n);t<n;t++)r[t]=e[t];return r}function Br(e){if(Array.isArray(e))return wn(e)}function Kr(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function dt(e,n){if(e){if(typeof e=="string")return wn(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);if(t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set")return Array.from(e);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return wn(e,n)}}function zr(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function bt(e){return Br(e)||Kr(e)||dt(e)||zr()}function Xr(e){if(Array.isArray(e))return e}function Jr(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,s,d,m,S=[],g=!0,P=!1;try{if(d=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;g=!1}else for(;!(g=(r=d.call(t)).done)&&(S.push(r.value),S.length!==n);g=!0);}catch(v){P=!0,s=v}finally{try{if(!g&&t.return!=null&&(m=t.return(),Object(m)!==m))return}finally{if(P)throw s}}return S}}function Ur(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function fn(e,n){return Xr(e)||Jr(e,n)||dt(e,n)||Ur()}var Wr={headerIcon:function(n){var t=n.item;return C("p-menuitem-icon",t.icon)},headerSubmenuIcon:"p-panelmenu-icon",headerLabel:"p-menuitem-text",headerAction:"p-panelmenu-header-link",panel:function(n){var t=n.item;return C("p-panelmenu-panel",t.className)},header:function(n){var t=n.active,r=n.item;return C("p-component p-panelmenu-header",{"p-highlight":t&&!!r.items,"p-disabled":r.disabled})},menuContent:"p-panelmenu-content",root:function(n){var t=n.props;return C("p-panelmenu p-component",t.className)},separator:"p-menu-separator",toggleableContent:function(n){var t=n.active;return C("p-toggleable-content",{"p-toggleable-content-collapsed":!t})},icon:function(n){var t=n.item;return C("p-menuitem-icon",t.icon)},label:"p-menuitem-text",submenuicon:"p-panelmenu-icon",action:function(n){var t=n.item;return C("p-menuitem-link",{"p-disabled":t.disabled})},menuitem:function(n){var t=n.item;return C("p-menuitem",t.className)},menu:"p-submenu-list",submenu:"p-submenu-list",transition:"p-toggleable-content"},Zr=`
@layer primereact {
    .p-panelmenu .p-panelmenu-header-link {
        display: flex;
        align-items: center;
        user-select: none;
        cursor: pointer;
        position: relative;
        text-decoration: none;
    }
    
    .p-panelmenu .p-panelmenu-header-link:focus {
        z-index: 1;
    }
    
    .p-panelmenu .p-submenu-list {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    .p-panelmenu .p-menuitem-link {
        display: flex;
        align-items: center;
        user-select: none;
        cursor: pointer;
        text-decoration: none;
    }
    
    .p-panelmenu .p-menuitem-text {
        line-height: 1;
    }
}
`,pn=we.extend({defaultProps:{__TYPE:"PanelMenu",id:null,model:null,style:null,submenuIcon:null,className:null,multiple:!1,transitionOptions:null,children:void 0},css:{classes:Wr,styles:Zr}});function Gn(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function et(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Gn(Object(t),!0).forEach(function(r){ft(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):Gn(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var Mn=i.memo(function(e){var n=i.useState(null),t=fn(n,2),r=t[0],s=t[1],d=e.ptm,m=e.cx,S=function(u,b){return d(u,et({hostName:e.hostName},b))},g=function(u,b){return S(b,{context:{active:O(u)}})},P=function(){if(e.model){if(e.multiple)return e.model.filter(function(b){return b.expanded});var u=null;return e.model.forEach(function(b){b.expanded&&(u?b.expanded=!1:u=b)}),u}return null},v=function(u,b){if(b.disabled){u.preventDefault();return}b.url||u.preventDefault(),b.command&&b.command({originalEvent:u,item:b});var f=r,y=O(b);y?(b.expanded=!1,s(e.multiple?f.filter(function(x){return x!==b}):null)):(!e.multiple&&f&&(f.expanded=!1),b.expanded=!0,s(e.multiple?[].concat(bt(f||[]),[b]):b))},O=function(u){return r&&(e.multiple?r.indexOf(u)>-1:r===u)};ye(function(){s(P())});var Y=function(u){var b=e.id+"_sep_"+u,f=p({id:b,key:b,className:m("separator"),role:"separator"},S("separator"));return i.createElement("li",f)},R=function(u,b,f){var y=i.createRef(),x=p({className:m("toggleableContent",{active:b})},S("toggleableContent"));if(u.items){var _=p({classNames:m("transition"),timeout:{enter:1e3,exit:450},in:b,unmountOnExit:!0},S("transition"));return i.createElement(Qe,Me({nodeRef:y},_),i.createElement("div",Me({ref:y},x),i.createElement(Mn,{id:e.id+"_"+f,menuProps:e.menuProps,model:u.items,multiple:e.multiple,submenuIcon:e.submenuIcon,ptm:d,cx:m})))}return null},$=function(u,b){if(u.visible===!1)return null;var f=u.id||e.id+"_"+b,y=O(u),x=C("p-menuitem-link",{"p-disabled":u.disabled}),_=C("p-menuitem-icon",u.icon),M=p({className:m("icon",{item:u})},g(u,"icon")),I=ae.getJSXIcon(u.icon,et({},M),{props:e.menuProps}),H=p({className:m("label")},g(u,"label")),X=u.label&&i.createElement("span",H,u.label),U="p-panelmenu-icon",c=p({className:m("submenuicon")},g(u,"submenuicon")),a=u.items&&ae.getJSXIcon(y?e.submenuIcon||i.createElement(it,c):e.submenuIcon||i.createElement(kn,c)),o=R(u,y,b),w=p({href:u.url||"#",className:m("action",{item:u}),target:u.target,onClick:function(ee){return v(ee,u)},role:"menuitem","aria-disabled":u.disabled},g(u,"action")),j=i.createElement("a",w,a,I,X);if(u.template){var Z={onClick:function(ee){return v(ee,u)},className:x,labelClassName:"p-menuitem-text",iconClassName:_,submenuIconClassName:U,element:j,props:e,leaf:!u.items,active:y};j=se.getJSXElement(u.template,u,Z)}var V=p({key:f,id:f,className:m("menuitem",{item:u}),style:u.style,role:"none"},g(u,"menuitem"));return i.createElement("li",V,j,o)},J=function(u,b){return u.separator?Y(b):$(u,b)},K=function(){return e.model?e.model.map(J):null},z=K(),T=e.root?"menu":"submenu",E=p({className:C(m(T),e.className),role:"tree"},d(T));return i.createElement("ul",E,z)});Mn.displayName="PanelMenuSub";function nt(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(s){return Object.getOwnPropertyDescriptor(e,s).enumerable})),t.push.apply(t,r)}return t}function Vr(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?nt(Object(t),!0).forEach(function(r){ft(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):nt(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}var vt=i.memo(i.forwardRef(function(e,n){var t=i.useContext(Ee),r=pn.getProps(e,t),s=i.useState(r.id),d=fn(s,2),m=d[0],S=d[1],g=i.useState(null),P=fn(g,2),v=P[0],O=P[1],Y=i.useState(!1),R=fn(Y,2),$=R[0],J=R[1],K=i.useRef(null),z=m+"_header",T=m+"_content",E=pn.setMetaData({props:r,state:{id:m,activeItem:v,animationDisabled:$}}),N=E.ptm,u=E.cx,b=E.isUnstyled;Oe(pn.css.styles,b,{name:"panelmenu"});var f=function(){if(r.model){if(r.multiple)return r.model.filter(function(o){return o.expanded});var a=null;return r.model.forEach(function(o){o.expanded&&(a?o.expanded=!1:a=o)}),a}return null},y=function(a,o){if(o.disabled){a.preventDefault();return}o.url||a.preventDefault(),o.command&&o.command({originalEvent:a,item:o});var w=v,j=x(o);j?(o.expanded=!1,O(r.multiple?w.filter(function(Z){return Z!==o}):null)):(!r.multiple&&w&&(w.expanded=!1),o.items&&(o.expanded=!0,O(r.multiple?[].concat(bt(w||[]),[o]):o)))},x=function(a){return v&&(r.multiple?v.indexOf(a)>-1:v===a)},_=function(a,o){return N(o,{context:{active:x(a)}})};i.useImperativeHandle(n,function(){return{props:r,getElement:function(){return K.current}}}),ye(function(){m||S(Ne()),O(f())}),be(function(){J(!0),O(f())},[r.model]);var M=function(){J(!1)},I=function(a,o){if(a.visible===!1)return null;var w=a.id||m+"_"+o,j=x(a),Z=C("p-menuitem-icon",a.icon),V=p({className:u("headerIcon",{item:a})},_(a,"headerIcon")),F=ae.getJSXIcon(a.icon,Vr({},V),{props:r}),ee="p-panelmenu-icon",ne=p({className:u("headerSubmenuIcon")},_(a,"headerSubmenuIcon")),W=a.items&&ae.getJSXIcon(j?r.submenuIcon||i.createElement(it,ne):r.submenuIcon||i.createElement(kn,ne)),D=p({className:u("headerLabel")},_(a,"headerLabel")),G=a.label&&i.createElement("span",D,a.label),le=i.createRef(),pe=p({href:a.url||"#",className:u("headerAction"),onClick:function(Se){return y(Se,a)},"aria-expanded":j,id:z,"aria-controls":T,"aria-disabled":a.disabled},_(a,"headerAction")),ie=i.createElement("a",pe,W,F,G);if(a.template){var me={onClick:function(Se){return y(Se,a)},className:"p-panelmenu-header-link",labelClassName:"p-menuitem-text",submenuIconClassName:ee,iconClassName:Z,element:ie,props:r,leaf:!a.items,active:j};ie=se.getJSXElement(a.template,a,me)}var ve=p({key:w,className:u("panel",{item:a}),style:a.style},_(a,"panel")),oe=p({className:u("header",{active:j,item:a}),style:a.style},_(a,"header")),re=p({className:u("menuContent")},_(a,"menuContent")),ge=p({className:u("toggleableContent",{active:j}),role:"region","aria-labelledby":z},_(a,"toggleableContent")),he=p({classNames:u("transition"),timeout:{enter:1e3,exit:450},onEnter:M,disabled:$,in:j,unmountOnExit:!0,options:r.transitionOptions},_(a,"transition"));return i.createElement("div",ve,i.createElement("div",oe,ie),i.createElement(Qe,Me({nodeRef:le},he),i.createElement("div",Me({id:T,ref:le},ge),i.createElement("div",re,i.createElement(Mn,{hostName:"PanelMenu",id:w,menuProps:r,model:a.items,className:"p-panelmenu-root-submenu",multiple:r.multiple,submenuIcon:r.submenuIcon,root:!0,ptm:N,cx:u})))))},H=function(){return r.model?r.model.map(I):null},X=H(),U=p({className:u("root"),style:r.style},pn.getOtherProps(r),N("root"));return i.createElement("div",Me({id:r.id,ref:K},U),X)}));vt.displayName="PanelMenu";const ra=({children:e})=>{const[n,t]=i.useState(0),r=i.useRef(null),s=i.useRef(null),d=St(),m=It(),S=i.useCallback(()=>{const u=m.pathname.split("/");switch(u[u.length-1]){case"seat":t(1);break;case"payment":t(2);break;case"confirmation":t(3);break}},[m.pathname]);i.useEffect(()=>{S()},[S]);const g=[{label:"Customers",icon:"pi pi-fw pi-table",items:[{label:"New",icon:"pi pi-fw pi-user-plus",items:[{label:"Customer",icon:"pi pi-fw pi-plus"},{label:"Duplicate",icon:"pi pi-fw pi-copy"}]},{label:"Edit",icon:"pi pi-fw pi-user-edit"}]},{label:"Orders",icon:"pi pi-fw pi-shopping-cart",items:[{label:"View",icon:"pi pi-fw pi-list"},{label:"Search",icon:"pi pi-fw pi-search"}]},{label:"Shipments",icon:"pi pi-fw pi-envelope",items:[{label:"Tracker",icon:"pi pi-fw pi-compass"},{label:"Map",icon:"pi pi-fw pi-map-marker"},{label:"Manage",icon:"pi pi-fw pi-pencil"}]},{label:"Profile",icon:"pi pi-fw pi-user",items:[{label:"Settings",icon:"pi pi-fw pi-cog"},{label:"Billing",icon:"pi pi-fw pi-file"}]},{label:"Quit",icon:"pi pi-fw pi-sign-out"}],P={icon:"pi pi-home",to:"/"},v=[{label:"Computer"},{label:"Notebook"},{label:"Accessories"},{label:"Backpacks"},{label:"Item"}],O=[{label:"Personal",command:()=>d("/uikit/menu")},{label:"Seat",command:()=>d("/uikit/menu/seat")},{label:"Payment",command:()=>d("/uikit/menu/payment")},{label:"Confirmation",command:()=>d("/uikit/menu/confirmation")}],Y=[{label:"Customers",icon:"pi pi-fw pi-table",items:[{label:"New",icon:"pi pi-fw pi-user-plus",items:[{label:"Customer",icon:"pi pi-fw pi-plus"},{label:"Duplicate",icon:"pi pi-fw pi-copy"}]},{label:"Edit",icon:"pi pi-fw pi-user-edit"}]},{label:"Orders",icon:"pi pi-fw pi-shopping-cart",items:[{label:"View",icon:"pi pi-fw pi-list"},{label:"Search",icon:"pi pi-fw pi-search"}]},{label:"Shipments",icon:"pi pi-fw pi-envelope",items:[{label:"Tracker",icon:"pi pi-fw pi-compass"},{label:"Map",icon:"pi pi-fw pi-map-marker"},{label:"Manage",icon:"pi pi-fw pi-pencil"}]},{label:"Profile",icon:"pi pi-fw pi-user",items:[{label:"Settings",icon:"pi pi-fw pi-cog"},{label:"Billing",icon:"pi pi-fw pi-file"}]},{separator:!0},{label:"Quit",icon:"pi pi-fw pi-sign-out"}],R=[{label:"Save",icon:"pi pi-save"},{label:"Update",icon:"pi pi-refresh"},{label:"Delete",icon:"pi pi-trash"},{separator:!0},{label:"Home",icon:"pi pi-home"}],$=[{label:"Customers",items:[{label:"New",icon:"pi pi-fw pi-plus"},{label:"Edit",icon:"pi pi-fw pi-user-edit"}]},{label:"Orders",items:[{label:"View",icon:"pi pi-fw pi-list"},{label:"Search",icon:"pi pi-fw pi-search"}]}],J=[{label:"Save",icon:"pi pi-save"},{label:"Update",icon:"pi pi-refresh"},{label:"Delete",icon:"pi pi-trash"},{separator:!0},{label:"Options",icon:"pi pi-cog"}],K=[{label:"Fashion",icon:"pi pi-fw pi-tag",items:[[{label:"Woman",items:[{label:"Woman Item"},{label:"Woman Item"},{label:"Woman Item"}]},{label:"Men",items:[{label:"Men Item"},{label:"Men Item"},{label:"Men Item"}]}],[{label:"Kids",items:[{label:"Kids Item"},{label:"Kids Item"}]},{label:"Luggage",items:[{label:"Luggage Item"},{label:"Luggage Item"},{label:"Luggage Item"}]}]]},{label:"Electronics",icon:"pi pi-fw pi-desktop",items:[[{label:"Computer",items:[{label:"Computer Item"},{label:"Computer Item"}]},{label:"Camcorder",items:[{label:"Camcorder Item"},{label:"Camcorder Item"},{label:"Camcorder Item"}]}],[{label:"TV",items:[{label:"TV Item"},{label:"TV Item"}]},{label:"Audio",items:[{label:"Audio Item"},{label:"Audio Item"},{label:"Audio Item"}]}],[{label:"Sports.7",items:[{label:"Sports.7.1"},{label:"Sports.7.2"}]}]]},{label:"Furniture",icon:"pi pi-fw pi-image",items:[[{label:"Living Room",items:[{label:"Living Room Item"},{label:"Living Room Item"}]},{label:"Kitchen",items:[{label:"Kitchen Item"},{label:"Kitchen Item"},{label:"Kitchen Item"}]}],[{label:"Bedroom",items:[{label:"Bedroom Item"},{label:"Bedroom Item"}]},{label:"Outdoor",items:[{label:"Outdoor Item"},{label:"Outdoor Item"},{label:"Outdoor Item"}]}]]},{label:"Sports",icon:"pi pi-fw pi-star",items:[[{label:"Basketball",items:[{label:"Basketball Item"},{label:"Basketball Item"}]},{label:"Football",items:[{label:"Football Item"},{label:"Football Item"},{label:"Football Item"}]}],[{label:"Tennis",items:[{label:"Tennis Item"},{label:"Tennis Item"}]}]]}],z=[{label:"Customers",icon:"pi pi-fw pi-table",items:[{label:"New",icon:"pi pi-fw pi-user-plus",items:[{label:"Customer",icon:"pi pi-fw pi-plus"},{label:"Duplicate",icon:"pi pi-fw pi-copy"}]},{label:"Edit",icon:"pi pi-fw pi-user-edit"}]},{label:"Orders",icon:"pi pi-fw pi-shopping-cart",items:[{label:"View",icon:"pi pi-fw pi-list"},{label:"Search",icon:"pi pi-fw pi-search"}]},{label:"Shipments",icon:"pi pi-fw pi-envelope",items:[{label:"Tracker",icon:"pi pi-fw pi-compass"},{label:"Map",icon:"pi pi-fw pi-map-marker"},{label:"Manage",icon:"pi pi-fw pi-pencil"}]},{label:"Profile",icon:"pi pi-fw pi-user",items:[{label:"Settings",icon:"pi pi-fw pi-cog"},{label:"Billing",icon:"pi pi-fw pi-file"}]}],T=u=>{var b;(b=r.current)==null||b.toggle(u)},E=u=>{var b;(b=s.current)==null||b.show(u)},N=()=>k.jsxs("span",{className:"p-input-icon-left",children:[k.jsx("i",{className:"pi pi-search"}),k.jsx(Pt,{type:"text",placeholder:"Search"})]});return k.jsxs("div",{className:"grid p-fluid",children:[k.jsx("div",{className:"col-12",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"Menubar"}),k.jsx(lt,{model:g,end:N})]})}),k.jsx("div",{className:"col-12",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"Breadcrumb"}),k.jsx(ut,{home:P,model:v})]})}),k.jsx("div",{className:"col-12 md:col-6",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"Steps"}),k.jsx(st,{model:O,activeIndex:n,onSelect:u=>t(u.index),readOnly:!1}),m.pathname==="/uikit/menu"?k.jsxs("div",{className:"flex align-items-center py-5 px-3",children:[k.jsx("i",{className:"pi pi-fw pi-user mr-2 text-2xl"}),k.jsx("p",{className:"m-0 text-lg",children:"Personal Component Content via Child Route"})]}):k.jsx(k.Fragment,{children:e})]})}),k.jsx("div",{className:"col-12 md:col-6",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"TabMenu"}),k.jsx(ct,{model:O,activeIndex:n,onTabChange:u=>t(u.index)}),m.pathname==="/uikit/menu"?k.jsxs("div",{className:"flex align-items-center py-5 px-3",children:[k.jsx("i",{className:"pi pi-fw pi-user mr-2 text-2xl"}),k.jsx("p",{className:"m-0 text-lg",children:"Personal Component Content via Child Route"})]}):k.jsx(k.Fragment,{children:e})]})}),k.jsx("div",{className:"col-12 md:col-4",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"Tiered Menu"}),k.jsx(mt,{model:Y})]})}),k.jsx("div",{className:"col-12 md:col-4",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"Plain Menu"}),k.jsx($n,{model:$})]})}),k.jsxs("div",{className:"col-12 md:col-4",children:[k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"Overlay Menu"}),k.jsx($n,{ref:r,model:R,popup:!0}),k.jsx(xt,{type:"button",label:"Options",icon:"pi pi-angle-down",onClick:T,style:{width:"auto"}})]}),k.jsxs("div",{className:"card",onContextMenu:E,children:[k.jsx("h5",{children:"ContextMenu"}),"Right click to display.",k.jsx(pt,{ref:s,model:J,breakpoint:"767px"})]})]}),k.jsx("div",{className:"col-12 md:col-6",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"MegaMenu - Horizontal"}),k.jsx(Pn,{model:K,breakpoint:"767px"}),k.jsx("h5",{style:{marginTop:"1.55em"},children:"MegaMenu - Vertical"}),k.jsx(Pn,{model:K,orientation:"vertical",breakpoint:"767px"})]})}),k.jsx("div",{className:"col-12 md:col-6",children:k.jsxs("div",{className:"card",children:[k.jsx("h5",{children:"PanelMenu"}),k.jsx(vt,{model:z})]})})]})};export{ra as default};
