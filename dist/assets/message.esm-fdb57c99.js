import{Q as h,c as b,r as s,S as I,U as C,W as f,V as g,a2 as _}from"./index-a2e62377.js";import{C as M}from"./index.esm-716d0587.js";import{E as N,I as D}from"./index.esm-81904cc2.js";import{T}from"./index.esm-10fa0e2b.js";function y(){return y=Object.assign?Object.assign.bind():function(n){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var t in r)Object.prototype.hasOwnProperty.call(r,t)&&(n[t]=r[t])}return n},y.apply(this,arguments)}function o(n){"@babel/helpers - typeof";return o=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},o(n)}function U(n,e){if(o(n)!=="object"||n===null)return n;var r=n[Symbol.toPrimitive];if(r!==void 0){var t=r.call(n,e||"default");if(o(t)!=="object")return t;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(n)}function R(n){var e=U(n,"string");return o(e)==="symbol"?e:String(e)}function B(n,e,r){return e=R(e),e in n?Object.defineProperty(n,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):n[e]=r,n}var c=h.extend({defaultProps:{__TYPE:"Message",id:null,className:null,style:null,text:null,icon:null,severity:"info",content:null,children:void 0},css:{classes:{root:function(e){var r=e.props;return b("p-inline-message p-component",{"p-inline-message-info":r.severity==="info","p-inline-message-warn":r.severity==="warn","p-inline-message-error":r.severity==="error","p-inline-message-success":r.severity==="success","p-inline-message-icon-only":!r.text})},icon:"p-inline-message-icon",text:"p-inline-message-text"},styles:`
        @layer primereact {
            .p-inline-message {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                vertical-align: top;
            }

            .p-inline-message-icon {
                flex-shrink: 0;
            }
            
            .p-inline-message-icon-only .p-inline-message-text {
                visibility: hidden;
                width: 0;
            }
            
            .p-fluid .p-inline-message {
                display: flex;
            }        
        }
        `}});function v(n,e){var r=Object.keys(n);if(Object.getOwnPropertySymbols){var t=Object.getOwnPropertySymbols(n);e&&(t=t.filter(function(l){return Object.getOwnPropertyDescriptor(n,l).enumerable})),r.push.apply(r,t)}return r}function J(n){for(var e=1;e<arguments.length;e++){var r=arguments[e]!=null?arguments[e]:{};e%2?v(Object(r),!0).forEach(function(t){B(n,t,r[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(r)):v(Object(r)).forEach(function(t){Object.defineProperty(n,t,Object.getOwnPropertyDescriptor(r,t))})}return n}var X=s.memo(s.forwardRef(function(n,e){var r=s.useContext(I),t=c.getProps(n,r),l=s.useRef(null),p=c.setMetaData({props:t}),m=p.ptm,u=p.cx,d=p.isUnstyled;C(c.css.styles,d,{name:"message"});var O=function(){if(t.content)return g.getJSXElement(t.content,t);var j=g.getJSXElement(t.text,t),i=f({className:u("icon")},m("icon")),a=t.icon;if(!a)switch(t.severity){case"info":a=s.createElement(D,i);break;case"warn":a=s.createElement(N,i);break;case"error":a=s.createElement(T,i);break;case"success":a=s.createElement(M,i);break}var w=_.getJSXIcon(a,J({},i),{props:t}),S=f({className:u("text")},m("text"));return s.createElement(s.Fragment,null,w,s.createElement("span",S,j))};s.useImperativeHandle(e,function(){return{props:t,getElement:function(){return l.current}}});var P=O(),x=f({className:b(t.className,u("root")),style:t.style,role:"alert","aria-live":"polite"},c.getOtherProps(t),m("root"));return s.createElement("div",y({id:t.id,ref:l},x),P)}));X.displayName="Message";export{X as M};
