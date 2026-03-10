import{Q as T,r as n,S as U,U as $,a6 as z,W as v,c as A,V as O,a2 as k}from"./index-a2e62377.js";function u(e){"@babel/helpers - typeof";return u=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},u(e)}function H(e,t){if(u(e)!=="object"||e===null)return e;var r=e[Symbol.toPrimitive];if(r!==void 0){var a=r.call(e,t||"default");if(u(a)!=="object")return a;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(e)}function B(e){var t=H(e,"string");return u(t)==="symbol"?t:String(t)}function M(e,t,r){return t=B(t),t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function S(){return S=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var a in r)Object.prototype.hasOwnProperty.call(r,a)&&(e[a]=r[a])}return e},S.apply(this,arguments)}function q(e){if(Array.isArray(e))return e}function J(e,t){var r=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(r!=null){var a,o,p,i,l=[],s=!0,m=!1;try{if(p=(r=r.call(e)).next,t===0){if(Object(r)!==r)return;s=!1}else for(;!(s=(a=p.call(r)).done)&&(l.push(a.value),l.length!==t);s=!0);}catch(f){m=!0,o=f}finally{try{if(!s&&r.return!=null&&(i=r.return(),Object(i)!==i))return}finally{if(m)throw o}}return l}}function E(e,t){(t==null||t>e.length)&&(t=e.length);for(var r=0,a=new Array(t);r<t;r++)a[r]=e[r];return a}function K(e,t){if(e){if(typeof e=="string")return E(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if(r==="Object"&&e.constructor&&(r=e.constructor.name),r==="Map"||r==="Set")return Array.from(e);if(r==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return E(e,t)}}function W(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function j(e,t){return q(e)||J(e,t)||K(e,t)||W()}var X={root:function(t){var r=t.props,a=t.state;return A("p-avatar p-component",{"p-avatar-image":O.isNotEmpty(r.image)&&!a.imageFailed,"p-avatar-circle":r.shape==="circle","p-avatar-lg":r.size==="large","p-avatar-xl":r.size==="xlarge","p-avatar-clickable":!!r.onClick})},label:"p-avatar-text",icon:"p-avatar-icon"},L=`
@layer primereact {
    .p-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        font-size: 1rem;
    }
    
    .p-avatar.p-avatar-image {
        background-color: transparent;
    }
    
    .p-avatar.p-avatar-circle {
        border-radius: 50%;
    }
    
    .p-avatar.p-avatar-circle img {
        border-radius: 50%;
    }
    
    .p-avatar .p-avatar-icon {
        font-size: 1rem;
    }
    
    .p-avatar img {
        width: 100%;
        height: 100%;
    }
    
    .p-avatar-clickable {
        cursor: pointer;
    }
}
`,b=T.extend({defaultProps:{__TYPE:"Avatar",className:null,icon:null,image:null,imageAlt:"avatar",imageFallback:"default",label:null,onImageError:null,shape:"square",size:"normal",style:null,template:null,children:void 0},css:{classes:X,styles:L}});function P(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter(function(o){return Object.getOwnPropertyDescriptor(e,o).enumerable})),r.push.apply(r,a)}return r}function Q(e){for(var t=1;t<arguments.length;t++){var r=arguments[t]!=null?arguments[t]:{};t%2?P(Object(r),!0).forEach(function(a){M(e,a,r[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):P(Object(r)).forEach(function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(r,a))})}return e}var V=n.forwardRef(function(e,t){var r=n.useContext(U),a=b.getProps(e,r),o=n.useRef(null),p=n.useState(!1),i=j(p,2),l=i[0],s=i[1],m=n.useState(!1),f=j(m,2),w=f[0],_=f[1],d=b.setMetaData({props:a,state:{imageFailed:l,nested:w}}),y=d.ptm,h=d.cx,I=d.isUnstyled;$(b.css.styles,I,{name:"avatar"});var x=function(){if(O.isNotEmpty(a.image)&&!l){var c=v({src:a.image,onError:N},y("image"));return n.createElement("img",S({alt:a.imageAlt},c))}else if(a.label){var C=v({className:h("label")},y("label"));return n.createElement("span",C,a.label)}else if(a.icon){var D=v({className:h("icon")},y("icon"));return k.getJSXIcon(a.icon,Q({},D),{props:a})}return null},N=function(c){a.imageFallback==="default"?a.onImageError||(s(!0),c.target.src=null):c.target.src=a.imageFallback,a.onImageError&&a.onImageError(c)};n.useEffect(function(){var g=z.isAttributeEquals(o.current.parentElement,"data-pc-name","avatargroup");_(g)},[]),n.useImperativeHandle(t,function(){return{props:a,getElement:function(){return o.current}}});var R=v({ref:o,style:a.style,className:A(a.className,h("root",{imageFailed:l}))},b.getOtherProps(a),y("root")),F=a.template?O.getJSXElement(a.template,a):x();return n.createElement("div",R,F,a.children)});V.displayName="Avatar";export{V as A};
