import{Q as le,r as a,S as ce,U as me,W as O,ag as ue,c as B,at as fe,V as pe,ae as ye,a2 as z,a4 as ge,ad as ve}from"./index-a2e62377.js";import{C as be}from"./index.esm-716d0587.js";import{E as de,I as he}from"./index.esm-81904cc2.js";import{T as Oe}from"./index.esm-10fa0e2b.js";import{T as we}from"./TransitionGroup-03c23142.js";function x(){return x=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},x.apply(this,arguments)}function J(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function _e(e){if(Array.isArray(e))return J(e)}function Ne(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function V(e,t){if(e){if(typeof e=="string")return J(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);if(n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set")return Array.from(e);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return J(e,t)}}function je(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function W(e){return _e(e)||Ne(e)||V(e)||je()}function j(e){"@babel/helpers - typeof";return j=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},j(e)}function Ce(e,t){if(j(e)!=="object"||e===null)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||"default");if(j(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(e)}function Se(e){var t=Ce(e,"string");return j(t)==="symbol"?t:String(t)}function X(e,t,n){return t=Se(t),t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function Pe(e){if(Array.isArray(e))return e}function Ee(e,t){var n=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(n!=null){var r,p,w,u,l=[],h=!0,s=!1;try{if(w=(n=n.call(e)).next,t===0){if(Object(n)!==n)return;h=!1}else for(;!(h=(r=w.call(n)).done)&&(l.push(r.value),l.length!==t);h=!0);}catch(b){s=!0,p=b}finally{try{if(!h&&n.return!=null&&(u=n.return(),Object(u)!==u))return}finally{if(s)throw p}}return l}}function Ie(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Y(e,t){return Pe(e)||Ee(e,t)||V(e,t)||Ie()}var xe=`
@layer primereact {
    .p-message-wrapper {
        display: flex;
        align-items: center;
    }

    .p-message-icon {
        flex-shrink: 0;
    }
    
    .p-message-close {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .p-message-close.p-link {
        margin-left: auto;
        overflow: hidden;
        position: relative;
    }
    
    .p-message-enter {
        opacity: 0;
    }
    
    .p-message-enter-active {
        opacity: 1;
        transition: opacity .3s;
    }
    
    .p-message-exit {
        opacity: 1;
        max-height: 1000px;
    }
    
    .p-message-exit-active {
        opacity: 0;
        max-height: 0;
        margin: 0;
        overflow: hidden;
        transition: max-height .3s cubic-bezier(0, 1, 0, 1), opacity .3s, margin .3s;
    }
    
    .p-message-exit-active .p-message-close {
        display: none;
    }
}
`,ke={uimessage:{root:function(t){var n=t.severity;return B("p-message p-component",X({},"p-message-".concat(n),n))},wrapper:"p-message-wrapper",detail:"p-message-detail",summary:"p-message-summary",icon:"p-message-icon",buttonicon:"p-message-close-icon",button:"p-message-close p-link",transition:"p-message"}},I=le.extend({defaultProps:{__TYPE:"Messages",__parentMetadata:null,id:null,className:null,style:null,transitionOptions:null,onRemove:null,onClick:null,children:void 0},css:{classes:ke,styles:xe}});function F(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(p){return Object.getOwnPropertyDescriptor(e,p).enumerable})),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?F(Object(n),!0).forEach(function(r){X(e,r,n[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):F(Object(n)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(n,r))})}return e}var Z=a.memo(a.forwardRef(function(e,t){var n=e.message,r=e.metaData,p=e.ptCallbacks,w=p.ptm,u=p.ptmo,l=p.cx,h=e.index,s=n.message,b=s.severity,k=s.content,C=s.summary,T=s.detail,A=s.closable,S=s.life,M=s.sticky,R=s.className,D=s.style,g=s.contentClassName,o=s.contentStyle,c=s.icon,N=s.closeIcon,m=s.pt,y={index:h},v=i(i({},r),y),P=fe(function(){q(null)},S||3e3,!M),U=Y(P,1),ee=U[0],_=function(f,d){return w(f,i({hostName:e.hostName},d))},q=function(f){ee(),e.onClose&&e.onClose(e.message),f&&(f.preventDefault(),f.stopPropagation())},te=function(){e.onClick&&e.onClick(e.message)},ne=function(){if(A!==!1){var f=ye("close"),d=O({className:l("uimessage.buttonicon"),"aria-hidden":!0},_("buttonicon",v),u(m,"buttonicon",i(i({},y),{},{hostName:e.hostName}))),$=N||a.createElement(ve,d),H=z.getJSXIcon($,i({},d),{props:e}),K=O({type:"button",className:l("uimessage.button"),"aria-label":f,onClick:q},_("button",v),u(m,"button",i(i({},y),{},{hostName:e.hostName})));return a.createElement("button",K,H,a.createElement(ge,null))}return null},re=function(){if(e.message){var f=O({className:l("uimessage.icon")},_("icon",v),u(m,"icon",i(i({},y),{},{hostName:e.hostName}))),d=c;if(!c)switch(b){case"info":d=a.createElement(he,f);break;case"warn":d=a.createElement(de,f);break;case"error":d=a.createElement(Oe,f);break;case"success":d=a.createElement(be,f);break}var $=z.getJSXIcon(d,i({},f),{props:e}),H=O({className:l("uimessage.summary")},_("summary",v),u(m,"summary",i(i({},y),{},{hostName:e.hostName}))),K=O({className:l("uimessage.detail")},_("detail",v),u(m,"detail",i(i({},y),{},{hostName:e.hostName})));return k||a.createElement(a.Fragment,null,$,a.createElement("span",H,C),a.createElement("span",K,T))}return null},ae=ne(),se=re(),oe=O({className:B(g,l("uimessage.wrapper")),style:o},_("wrapper",v),u(m,"wrapper",i(i({},y),{},{hostName:e.hostName}))),ie=O({ref:t,className:B(R,l("uimessage.root",{severity:b})),style:D,onClick:te},_("root",v),u(m,"root",i(i({},y),{},{hostName:e.hostName})));return a.createElement("div",ie,a.createElement("div",oe,se,ae))}));Z.displayName="UIMessage";function G(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(p){return Object.getOwnPropertyDescriptor(e,p).enumerable})),n.push.apply(n,r)}return n}function L(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?G(Object(n),!0).forEach(function(r){X(e,r,n[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):G(Object(n)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(n,r))})}return e}var Q=0,Te=a.memo(a.forwardRef(function(e,t){var n=a.useContext(ce),r=I.getProps(e,n),p=a.useState([]),w=Y(p,2),u=w[0],l=w[1],h=a.useRef(null),s=L(L({props:r},r.__parentMetadata),{},{state:{messages:u}}),b=I.setMetaData(s);me(I.css.styles,b.isUnstyled,{name:"messages"});var k=function(o){o&&l(function(c){return C(c,o,!0)})},C=function(o,c,N){var m;if(Array.isArray(c)){var y=c.reduce(function(P,U){return P.push({_pId:Q++,message:U}),P},[]);N?m=o?[].concat(W(o),W(y)):y:m=y}else{var v={_pId:Q++,message:c};N?m=o?[].concat(W(o),[v]):[v]:m=[v]}return m},T=function(){l([])},A=function(o){l(function(c){return C(c,o,!1)})},S=function(o){var c=o._pId?o.message:o;l(function(N){return N.filter(function(m){return m._pId!==o._pId&&!pe.deepEquals(m.message,c)})}),r.onRemove&&r.onRemove(c)},M=function(o){S(o)};a.useImperativeHandle(t,function(){return{props:r,show:k,replace:A,remove:S,clear:T,getElement:function(){return h.current}}});var R=O({id:r.id,className:r.className,style:r.style},I.getOtherProps(r),b.ptm("root")),D=O({classNames:b.cx("transition"),unmountOnExit:!0,timeout:{enter:300,exit:300},options:r.transitionOptions},b.ptm("transition"));return a.createElement("div",x({ref:h},R),a.createElement(we,null,u&&u.map(function(g,o){var c=a.createRef();return a.createElement(ue,x({nodeRef:c,key:g._pId},D),a.createElement(Z,{hostName:"Messages",ref:c,message:g,onClick:r.onClick,onClose:M,ptCallbacks:b,metaData:s,index:o}))})))}));Te.displayName="Messages";export{Te as M};
