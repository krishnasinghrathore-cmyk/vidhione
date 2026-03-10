import{Q as O,r as a,S,U as j,W as u,a2 as w,c as y}from"./index-a2e62377.js";function s(t){"@babel/helpers - typeof";return s=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},s(t)}function h(t,e){if(s(t)!=="object"||t===null)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var r=n.call(t,e||"default");if(s(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function E(t){var e=h(t,"string");return s(e)==="symbol"?e:String(e)}function p(t,e,n){return e=E(e),e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}var x={value:"p-tag-value",icon:"p-tag-icon",root:function(e){var n=e.props;return y("p-tag p-component",p(p({},"p-tag-".concat(n.severity),n.severity!==null),"p-tag-rounded",n.rounded))}},N=`
@layer primereact {
    .p-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .p-tag-icon,
    .p-tag-value,
    .p-tag-icon.pi {
        line-height: 1.5;
    }
    
    .p-tag.p-tag-rounded {
        border-radius: 10rem;
    }
}
`,l=O.extend({defaultProps:{__TYPE:"Tag",value:null,severity:null,rounded:!1,icon:null,style:null,className:null,children:void 0},css:{classes:x,styles:N}});function m(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter(function(o){return Object.getOwnPropertyDescriptor(t,o).enumerable})),n.push.apply(n,r)}return n}function T(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?m(Object(n),!0).forEach(function(r){p(t,r,n[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):m(Object(n)).forEach(function(r){Object.defineProperty(t,r,Object.getOwnPropertyDescriptor(n,r))})}return t}var _=a.forwardRef(function(t,e){var n=a.useContext(S),r=l.getProps(t,n),o=l.setMetaData({props:r}),c=o.ptm,i=o.cx,g=o.isUnstyled;j(l.css.styles,g,{name:"tag"});var f=a.useRef(null),v=u({className:i("icon")},c("icon")),b=w.getJSXIcon(r.icon,T({},v),{props:r});a.useImperativeHandle(e,function(){return{props:r,getElement:function(){return f.current}}});var d=u({ref:f,className:y(r.className,i("root")),style:r.style},l.getOtherProps(r),c("root")),P=u({className:i("value")},c("value"));return a.createElement("span",d,b,a.createElement("span",P,r.value),a.createElement("span",null,r.children))});_.displayName="Tag";export{_ as T};
