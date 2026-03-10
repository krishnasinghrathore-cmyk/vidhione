import{Q as oe,r as l,S as le,U as ie,a5 as ce,a6 as g,_ as se,ab as ue,a0 as pe,a7 as U,af as fe,c as ve,a1 as k,W as C,ag as ye,ad as de,a2 as me,ae as be,a4 as ge,V as Ee}from"./index-a2e62377.js";import{O as T}from"./overlayservice.esm-bf9b13ee.js";function L(){return L=Object.assign?Object.assign.bind():function(n){for(var e=1;e<arguments.length;e++){var t=arguments[e];for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r])}return n},L.apply(this,arguments)}function j(n){"@babel/helpers - typeof";return j=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},j(n)}function he(n,e){if(j(n)!=="object"||n===null)return n;var t=n[Symbol.toPrimitive];if(t!==void 0){var r=t.call(n,e||"default");if(j(r)!=="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(n)}function Oe(n){var e=he(n,"string");return j(e)==="symbol"?e:String(e)}function Pe(n,e,t){return e=Oe(e),e in n?Object.defineProperty(n,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):n[e]=t,n}function we(n){if(Array.isArray(n))return n}function xe(n,e){var t=n==null?null:typeof Symbol<"u"&&n[Symbol.iterator]||n["@@iterator"];if(t!=null){var r,d,v,s,m=[],p=!0,f=!1;try{if(v=(t=t.call(n)).next,e===0){if(Object(t)!==t)return;p=!1}else for(;!(p=(r=v.call(t)).done)&&(m.push(r.value),m.length!==e);p=!0);}catch(i){f=!0,d=i}finally{try{if(!p&&t.return!=null&&(s=t.return(),Object(s)!==s))return}finally{if(f)throw d}}return m}}function $(n,e){(e==null||e>n.length)&&(e=n.length);for(var t=0,r=new Array(e);t<e;t++)r[t]=n[t];return r}function Se(n,e){if(n){if(typeof n=="string")return $(n,e);var t=Object.prototype.toString.call(n).slice(8,-1);if(t==="Object"&&n.constructor&&(t=n.constructor.name),t==="Map"||t==="Set")return Array.from(n);if(t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return $(n,e)}}function Ce(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function D(n,e){return we(n)||xe(n,e)||Se(n,e)||Ce()}var Ie=function(e){var t=l.useRef(void 0);return l.useEffect(function(){t.current=e}),t.current},ke=function(e){return l.useEffect(function(){return e},[])},je=function(e){var t=e.target,r=t===void 0?"document":t,d=e.type,v=e.listener,s=e.options,m=e.when,p=m===void 0?!0:m,f=l.useRef(null),i=l.useRef(null),w=Ie(s),P=function(){var E=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};Ee.isNotEmpty(E.target)&&(o(),(E.when||p)&&(f.current=g.getTargetElement(E.target))),!i.current&&f.current&&(i.current=function(O){return v&&v(O)},f.current.addEventListener(d,i.current,s))},o=function(){i.current&&(f.current.removeEventListener(d,i.current,s),i.current=null)};return l.useEffect(function(){p?f.current=g.getTargetElement(r):(o(),f.current=null)},[r,p]),l.useEffect(function(){i.current&&(i.current!==v||w!==s)&&(o(),p&&P())},[v,s]),ke(function(){o()}),[P,o]},Re=function(e,t,r){var d=function(i){(i.key==="Esc"||i.key==="Escape")&&(i.stopImmediatePropagation(),r(i))},v=je({type:"keydown",listener:d}),s=D(v,2),m=s[0],p=s[1];return l.useEffect(function(){if(t&&e.current)return m(),function(){p()}}),[e,r]},Te={root:function(e){var t=e.props,r=e.context;return ve("p-overlaypanel p-component",t.className,{"p-input-filled":r&&r.inputStyle==="filled"||k.inputStyle==="filled","p-ripple-disabled":r&&r.ripple===!1||k.ripple===!1})},closeIcon:"p-overlaypanel-close-icon",closeButton:"p-overlaypanel-close p-link",content:"p-overlaypanel-content",transition:"p-overlaypanel"},Le=`
@layer primereact {
    .p-overlaypanel {
        position: absolute;
        margin-top: 10px;
        /* Github #3122: Prevent animation flickering  */
        top: -9999px;
        left: -9999px;
    }
    
    .p-overlaypanel-flipped {
        margin-top: 0;
        margin-bottom: 10px;
    }
    
    .p-overlaypanel-close {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        position: relative;
    }
    
    /* Animation */
    .p-overlaypanel-enter {
        opacity: 0;
        transform: scaleY(0.8);
    }
    
    .p-overlaypanel-enter-active {
        opacity: 1;
        transform: scaleY(1);
        transition: transform .12s cubic-bezier(0, 0, 0.2, 1), opacity .12s cubic-bezier(0, 0, 0.2, 1);
    }
    
    .p-overlaypanel-enter-done {
        transform: none;
    }
    
    .p-overlaypanel-exit {
        opacity: 1;
    }
    
    .p-overlaypanel-exit-active {
        opacity: 0;
        transition: opacity .1s linear;
    }
    
    .p-overlaypanel:after, .p-overlaypanel:before {
        bottom: 100%;
        left: calc(var(--overlayArrowLeft, 0) + 1.25rem);
        content: " ";
        height: 0;
        width: 0;
        position: absolute;
        pointer-events: none;
    }
    
    .p-overlaypanel:after {
        border-width: 8px;
        margin-left: -8px;
    }
    
    .p-overlaypanel:before {
        border-width: 10px;
        margin-left: -10px;
    }
    
    .p-overlaypanel-flipped:after, .p-overlaypanel-flipped:before {
        bottom: auto;
        top: 100%;
    }
    
    .p-overlaypanel.p-overlaypanel-flipped:after {
        border-bottom-color: transparent;
    }
    
    .p-overlaypanel.p-overlaypanel-flipped:before {
        border-bottom-color: transparent
    }
}
`,I=oe.extend({defaultProps:{__TYPE:"OverlayPanel",id:null,dismissable:!0,showCloseIcon:!1,closeIcon:null,style:null,className:null,appendTo:null,breakpoints:null,ariaCloseLabel:null,transitionOptions:null,onShow:null,onHide:null,children:void 0,closeOnEscape:!0},css:{classes:Te,styles:Le}});function K(n,e){var t=Object.keys(n);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(n);e&&(r=r.filter(function(d){return Object.getOwnPropertyDescriptor(n,d).enumerable})),t.push.apply(t,r)}return t}function _e(n){for(var e=1;e<arguments.length;e++){var t=arguments[e]!=null?arguments[e]:{};e%2?K(Object(t),!0).forEach(function(r){Pe(n,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(t)):K(Object(t)).forEach(function(r){Object.defineProperty(n,r,Object.getOwnPropertyDescriptor(t,r))})}return n}var Ae=l.forwardRef(function(n,e){var t=l.useContext(le),r=I.getProps(n,t),d=l.useState(!1),v=D(d,2),s=v[0],m=v[1],p=I.setMetaData({props:r,state:{visible:s}}),f=p.ptm,i=p.cx;p.sx;var w=p.isUnstyled;ie(I.css.styles,w,{name:"overlaypanel"});var P=l.useRef(""),o=l.useRef(null),y=l.useRef(null),E=l.useRef(!1),O=l.useRef(null),h=l.useRef(null),z=ce({target:y,overlay:o,listener:function(a,c){var b=c.type,S=c.valid;if(S)switch(b){case"outside":r.dismissable&&!E.current&&x();break;case"resize":case"scroll":case"orientationchange":R();break}E.current=!1},when:s}),B=D(z,2),M=B[0],Y=B[1];Re(h,r.closeOnEscape,function(){x()});var Z=function(a){return o&&o.current&&!(o.current.isSameNode(a)||o.current.contains(a))},V=function(a,c){return y.current!=null&&y.current!==(c||a.currentTarget||a.target)},W=function(a){x(),a.preventDefault()},q=function(a){E.current=!0,T.emit("overlay-click",{originalEvent:a,target:y.current})},H=function(){E.current=!0},G=function(a,c){s?(x(),V(a,c)&&(y.current=c||a.currentTarget||a.target,setTimeout(function(){_(a,y.current)},200))):_(a,c)},_=function(a,c){y.current=c||a.currentTarget||a.target,s?R():(m(!0),h.current=function(b){!Z(b.target)&&(E.current=!0)},T.on("overlay-click",h.current))},x=function(){m(!1),T.off("overlay-click",h.current),h.current=null},J=function(){o.current.setAttribute(P.current,""),U.set("overlay",o.current,t&&t.autoZIndex||k.autoZIndex,t&&t.zIndex.overlay||k.zIndex.overlay),g.addStyles(o.current,{position:"absolute",top:"0",left:"0"}),R()},Q=function(){M(),r.onShow&&r.onShow()},X=function(){Y()},F=function(){U.clear(o.current),r.onHide&&r.onHide()},R=function(){if(y.current&&o.current){g.absolutePosition(o.current,y.current);var a=g.getOffset(o.current),c=g.getOffset(y.current),b=0;a.left<c.left&&(b=c.left-a.left),o.current.style.setProperty("--overlayArrowLeft","".concat(b,"px")),a.top<c.top?(o.current.setAttribute("data-p-overlaypanel-flipped","true"),w&&g.addClass(o.current,"p-overlaypanel-flipped")):(o.current.setAttribute("data-p-overlaypanel-flipped","false"),w&&g.removeClass(o.current,"p-overlaypanel-flipped"))}},ee=function(){if(!O.current){O.current=g.createInlineStyle(t&&t.nonce||k.nonce);var a="";for(var c in r.breakpoints)a+=`
                    @media screen and (max-width: `.concat(c,`) {
                        .p-overlaypanel[`).concat(P.current,`] {
                            width: `).concat(r.breakpoints[c],`;
                        }
                    }
                `);O.current.innerHTML=a}};se(function(){P.current=ue(),r.breakpoints&&ee()}),pe(function(){O.current=g.removeInlineStyle(O.current),h.current&&(T.off("overlay-click",h.current),h.current=null),U.clear(o.current)}),l.useImperativeHandle(e,function(){return{props:r,toggle:G,show:_,hide:x,align:R,getElement:function(){return o.current}}});var ne=function(){var a=C({className:i("closeIcon"),"aria-hidden":!0},f("closeIcon")),c=r.closeIcon||l.createElement(de,a),b=me.getJSXIcon(c,_e({},a),{props:r}),S=r.ariaCloseLabel||be("close"),A=C({type:"button",className:i("closeButton"),onClick:function(ae){return W(ae)},"aria-label":S},f("closeButton"));return r.showCloseIcon?l.createElement("button",A,b,l.createElement(ge,null)):null},te=function(){var a=ne(),c=C({id:r.id,className:i("root",{context:t}),style:r.style,onClick:function(N){return q(N)}},I.getOtherProps(r),f("root")),b=C({className:i("content"),onClick:function(N){return H()},onMouseDown:H},I.getOtherProps(r),f("content")),S=C({classNames:i("transition"),in:s,timeout:{enter:120,exit:100},options:r.transitionOptions,unmountOnExit:!0,onEnter:J,onEntered:Q,onExit:X,onExited:F},f("transition"));return l.createElement(ye,L({nodeRef:o},S),l.createElement("div",L({ref:o},c),l.createElement("div",b,r.children),a))},re=te();return l.createElement(fe,{element:re,appendTo:r.appendTo})});Ae.displayName="OverlayPanel";export{Ae as O};
