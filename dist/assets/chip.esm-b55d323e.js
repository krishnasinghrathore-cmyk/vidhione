import{Q as T,r as a,S as U,U as k,c as w,V as K,W as m,a2 as S}from"./index-a2e62377.js";import{T as B}from"./index.esm-10fa0e2b.js";function f(e){"@babel/helpers - typeof";return f=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},f(e)}function $(e,t){if(f(e)!=="object"||e===null)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||"default");if(f(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(e)}function H(e){var t=$(e,"string");return f(t)==="symbol"?t:String(t)}function J(e,t,n){return t=H(t),t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function d(){return d=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},d.apply(this,arguments)}function M(e){if(Array.isArray(e))return e}function X(e,t){var n=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(n!=null){var r,i,y,c,p=[],s=!0,u=!1;try{if(y=(n=n.call(e)).next,t===0){if(Object(n)!==n)return;s=!1}else for(;!(s=(r=y.call(n)).done)&&(p.push(r.value),p.length!==t);s=!0);}catch(l){u=!0,i=l}finally{try{if(!s&&n.return!=null&&(c=n.return(),Object(c)!==c))return}finally{if(u)throw i}}return p}}function P(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function V(e,t){if(e){if(typeof e=="string")return P(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);if(n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set")return Array.from(e);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return P(e,t)}}function W(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function L(e,t){return M(e)||X(e,t)||V(e,t)||W()}var Q={root:function(t){var n=t.props;return w("p-chip p-component",{"p-chip-image":n.image!=null})},removeIcon:"p-chip-remove-icon",icon:"p-chip-icon",label:"p-chip-text"},Y=`
@layer primereact {
    .p-chip {
        display: inline-flex;
        align-items: center;
    }
    
    .p-chip-text {
        line-height: 1.5;
    }
    
    .p-chip-icon.pi {
        line-height: 1.5;
    }
    
    .p-chip .p-chip-remove-icon {
        line-height: 1.5;
        cursor: pointer;
    }
    
    .p-chip img {
        border-radius: 50%;
    }
}
`,h=T.extend({defaultProps:{__TYPE:"Chip",label:null,icon:null,image:null,removable:!1,removeIcon:null,className:null,style:null,template:null,imageAlt:"chip",onImageError:null,onRemove:null,children:void 0},css:{classes:Q,styles:Y}});function j(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(i){return Object.getOwnPropertyDescriptor(e,i).enumerable})),n.push.apply(n,r)}return n}function I(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?j(Object(n),!0).forEach(function(r){J(e,r,n[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):j(Object(n)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(n,r))})}return e}var q=a.memo(a.forwardRef(function(e,t){var n=a.useContext(U),r=h.getProps(e,n),i=a.useRef(null),y=a.useState(!0),c=L(y,2),p=c[0],s=c[1],u=h.setMetaData({props:r}),l=u.ptm,b=u.cx,E=u.isUnstyled;k(h.css.styles,E,{name:"chip"});var _=function(o){(o.key==="Enter"||o.key==="Backspace")&&O(o)},O=function(o){s(!1),r.onRemove&&r.onRemove(o)},x=function(){var o=[],g=m({key:"removeIcon",tabIndex:0,className:b("removeIcon"),role:"button",onClick:O,onKeyDown:_},l("removeIcon")),A=r.removeIcon||a.createElement(B,g);if(r.image){var R=m({key:"image",src:r.image,onError:r.onImageError},l("image"));o.push(a.createElement("img",d({alt:r.imageAlt},R)))}else if(r.icon){var D=m({key:"icon",className:b("icon")},l("icon"));o.push(S.getJSXIcon(r.icon,I({},D),{props:r}))}if(r.label){var N=m({key:"label",className:b("label")},l("label"));o.push(a.createElement("span",N,r.label))}return r.removable&&o.push(S.getJSXIcon(A,I({},g),{props:r})),o},C=function(){var o=r.template?K.getJSXElement(r.template,r):x(),g=m({ref:i,style:r.style,className:w(r.className,b("root")),"aria-label":r.label},h.getOtherProps(r),l("root"));return a.createElement("div",g,o)};return a.useImperativeHandle(t,function(){return{props:r,getElement:function(){return i.current}}}),p&&C()}));q.displayName="Chip";export{q as C};
