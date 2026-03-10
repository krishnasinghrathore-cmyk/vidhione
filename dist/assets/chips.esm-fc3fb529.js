import{Q as ae,r as u,S as ie,U as le,V as g,a6 as O,_ as ue,W as y,c as E,T as se,as as N,a2 as ce}from"./index-a2e62377.js";import{T as pe}from"./index.esm-10fa0e2b.js";function D(){return D=Object.assign?Object.assign.bind():function(n){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var e in r)Object.prototype.hasOwnProperty.call(r,e)&&(n[e]=r[e])}return n},D.apply(this,arguments)}function w(n){"@babel/helpers - typeof";return w=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},w(n)}function fe(n,t){if(w(n)!=="object"||n===null)return n;var r=n[Symbol.toPrimitive];if(r!==void 0){var e=r.call(n,t||"default");if(w(e)!=="object")return e;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(n)}function me(n){var t=fe(n,"string");return w(t)==="symbol"?t:String(t)}function de(n,t,r){return t=me(t),t in n?Object.defineProperty(n,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):n[t]=r,n}function R(n,t){(t==null||t>n.length)&&(t=n.length);for(var r=0,e=new Array(t);r<t;r++)e[r]=n[r];return e}function ve(n){if(Array.isArray(n))return R(n)}function ye(n){if(typeof Symbol<"u"&&n[Symbol.iterator]!=null||n["@@iterator"]!=null)return Array.from(n)}function U(n,t){if(n){if(typeof n=="string")return R(n,t);var r=Object.prototype.toString.call(n).slice(8,-1);if(r==="Object"&&n.constructor&&(r=n.constructor.name),r==="Map"||r==="Set")return Array.from(n);if(r==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return R(n,t)}}function he(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function I(n){return ve(n)||ye(n)||U(n)||he()}function be(n){if(Array.isArray(n))return n}function ge(n,t){var r=n==null?null:typeof Symbol<"u"&&n[Symbol.iterator]||n["@@iterator"];if(r!=null){var e,h,P,m,b=[],d=!0,f=!1;try{if(P=(r=r.call(n)).next,t===0){if(Object(r)!==r)return;d=!1}else for(;!(d=(e=P.call(r)).done)&&(b.push(e.value),b.length!==t);d=!0);}catch(v){f=!0,h=v}finally{try{if(!d&&r.return!=null&&(m=r.return(),Object(m)!==m))return}finally{if(f)throw h}}return b}}function Pe(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Oe(n,t){return be(n)||ge(n,t)||U(n,t)||Pe()}var we=`
@layer primereact {
    .p-chips {
        display: inline-flex;
    }
    
    .p-chips-multiple-container {
        margin: 0;
        padding: 0;
        list-style-type: none;
        cursor: text;
        overflow: hidden;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .p-chips-token {
        cursor: default;
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
    }
    
    .p-chips-input-token {
        flex: 1 1 auto;
        display: inline-flex;
    }
    
    .p-chips-token-icon {
        cursor: pointer;
    }
    
    .p-chips-input-token input {
        border: 0 none;
        outline: 0 none;
        background-color: transparent;
        margin: 0;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
        width: 100%;
    }
    
    .p-fluid .p-chips {
        display: flex;
    }
    
    .p-chips-icon-left,
    .p-chips-icon-right {
        position: relative;
        display: inline-block;
    }
    
    .p-chips-icon-left > i,
    .p-chips-icon-right > i,
    .p-chips-icon-left > svg,
    .p-chips-icon-right > svg,
    .p-chips-icon-left > .p-chips-prefix,
    .p-chips-icon-right > .p-chips-suffix {
        position: absolute;
        top: 50%;
        margin-top: -0.5rem;
    }
    
    .p-fluid .p-chips-icon-left,
    .p-fluid .p-chips-icon-right {
        display: block;
        width: 100%;
    }
}
`,Ie={removeTokenIcon:"p-chips-token-icon",label:"p-chips-token-label",token:"p-chips-token p-highlight",inputToken:"p-chips-input-token",container:function(t){var r=t.props,e=t.focusedState;return E("p-inputtext p-chips-multiple-container",{"p-disabled":r.disabled,"p-focus":e})},root:function(t){var r=t.isFilled,e=t.focusedState;return E("p-chips p-component p-inputwrapper",{"p-inputwrapper-filled":r,"p-inputwrapper-focus":e})}},k=ae.extend({defaultProps:{__TYPE:"Chips",addOnBlur:null,allowDuplicate:!0,ariaLabelledBy:null,autoFocus:!1,className:null,disabled:null,id:null,inputId:null,inputRef:null,itemTemplate:null,keyfilter:null,max:null,name:null,onAdd:null,onBlur:null,onChange:null,onFocus:null,onKeyDown:null,onRemove:null,placeholder:null,readOnly:!1,removable:!0,removeIcon:null,separator:null,style:null,tooltip:null,tooltipOptions:null,value:null,children:void 0},css:{classes:Ie,styles:we}});function K(n,t){var r=Object.keys(n);if(Object.getOwnPropertySymbols){var e=Object.getOwnPropertySymbols(n);t&&(e=e.filter(function(h){return Object.getOwnPropertyDescriptor(n,h).enumerable})),r.push.apply(r,e)}return r}function M(n){for(var t=1;t<arguments.length;t++){var r=arguments[t]!=null?arguments[t]:{};t%2?K(Object(r),!0).forEach(function(e){de(n,e,r[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(r)):K(Object(r)).forEach(function(e){Object.defineProperty(n,e,Object.getOwnPropertyDescriptor(r,e))})}return n}var ke=u.memo(u.forwardRef(function(n,t){var r=u.useContext(ie),e=k.getProps(n,r),h=u.useState(!1),P=Oe(h,2),m=P[0],b=P[1],d=k.setMetaData({props:e,state:{focused:m}}),f=d.ptm,v=d.cx,H=d.isUnstyled;le(k.css.styles,H,{name:"chips"});var T=u.useRef(null),W=u.useRef(null),c=u.useRef(e.inputRef),_=function(o,a){if(!(e.disabled&&e.readOnly)){var i=I(e.value),l=i.splice(a,1);F(l,a)&&(e.onRemove&&e.onRemove({originalEvent:o,value:l}),e.onChange&&e.onChange({originalEvent:o,value:i,stopPropagation:function(){o.stopPropagation()},preventDefault:function(){o.preventDefault()},target:{name:e.name,id:e.id,value:i}}))}},S=function(o,a,i){if(a&&a.trim().length){var l=e.value?I(e.value):[];if(e.allowDuplicate||l.indexOf(a)===-1){var p=!0;e.onAdd&&(p=e.onAdd({originalEvent:o,value:a})),p!==!1&&l.push(a)}C(o,l,i)}},L=function(){O.focus(c.current)},$=function(o){var a=o.target.value,i=e.value||[];if(e.onKeyDown&&e.onKeyDown(o),!o.defaultPrevented)switch(o.key){case"Backspace":c.current.value.length===0&&i.length>0&&_(o,i.length-1);break;case"Enter":a&&a.trim().length&&(!e.max||e.max>i.length)&&S(o,a,!0);break;default:e.keyfilter&&N.onKeyPress(o,e.keyfilter),j()?o.preventDefault():e.separator===","&&(o.key===e.separator||O.isAndroid()&&o.which===229)&&S(o,a,!0);break}},C=function(o,a,i){e.onChange&&e.onChange({originalEvent:o,value:a,stopPropagation:function(){o.stopPropagation()},preventDefault:function(){o.preventDefault()},target:{name:e.name,id:e.id,value:a}}),c.current.value="",i&&o.preventDefault()},J=function(o){if(e.separator){var a=(o.clipboardData||window.clipboardData).getData("Text");if(e.keyfilter&&N.onPaste(o,e.keyfilter),a){var i=e.value||[],l=a.split(e.separator);l=l.filter(function(p){return(e.allowDuplicate||i.indexOf(p)===-1)&&p.trim().length}),i=[].concat(I(i),I(l)),C(o,i,!0)}}},Q=function(o){b(!0),e.onFocus&&e.onFocus(o)},X=function(o){if(e.addOnBlur){var a=o.target.value,i=e.value||[];a&&a.trim().length&&(!e.max||e.max>i.length)&&S(o,a,!0)}b(!1),e.onBlur&&e.onBlur(o)},j=function(){return e.max&&e.value&&e.max===e.value.length},A=c.current&&c.current.value,Y=u.useMemo(function(){return g.isNotEmpty(e.value)||g.isNotEmpty(A)},[e.value,A]),F=function(o,a){return g.getPropValue(e.removable,{value:o,index:a,props:e})};u.useImperativeHandle(t,function(){return{props:e,focus:function(){return O.focus(c.current)},getElement:function(){return T.current},getInput:function(){return c.current}}}),u.useEffect(function(){g.combinedRefs(c,e.inputRef)},[c,e.inputRef]),ue(function(){e.autoFocus&&O.focus(c.current,e.autoFocus)});var q=function(o,a){var i=y({className:v("removeTokenIcon"),onClick:function(x){return _(x,a)},"aria-hidden":"true"},f("removeTokenIcon")),l=e.removeIcon||u.createElement(pe,i),p=ce.getJSXIcon(l,M({},i),{props:e});return!e.disabled&&!e.readOnly&&F(o,a)?p:null},z=function(o,a){var i=e.itemTemplate?e.itemTemplate(o):o,l=y({className:v("label")},f("label")),p=u.createElement("span",l,i),B=q(o,a),x=y({key:a,className:v("token"),"data-p-highlight":!0},f("token"));return u.createElement("li",x,p,B)},G=function(){var o=y({className:v("inputToken")},f("inputToken")),a=y(M({id:e.inputId,ref:c,placeholder:e.placeholder,type:"text",name:e.name,disabled:e.disabled||j(),onKeyDown:function(l){return $(l)},onPaste:function(l){return J(l)},onFocus:function(l){return Q(l)},onBlur:function(l){return X(l)},readOnly:e.readOnly},te),f("input"));return u.createElement("li",o,u.createElement("input",a))},V=function(){return e.value?e.value.map(z):null},Z=function(){var o=V(),a=G(),i=y({ref:W,className:v("container",{focusedState:m}),onClick:function(p){return L()},"data-p-disabled":e.disabled,"data-p-focus":m},f("container"));return u.createElement("ul",i,o,a)},ee=g.isNotEmpty(e.tooltip),ne=k.getOtherProps(e),te=g.reduceKeys(ne,O.ARIA_PROPS),re=Z(),oe=y({id:e.id,ref:T,className:E(e.className,v("root",{isFilled:Y,focusedState:m})),style:e.style},f("root"));return u.createElement(u.Fragment,null,u.createElement("div",oe,re),ee&&u.createElement(se,D({target:c,content:e.tooltip},e.tooltipOptions,{pt:f("tooltip")})))}));ke.displayName="Chips";export{ke as C};
