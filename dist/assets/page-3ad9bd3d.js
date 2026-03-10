import{Q as ne,r as s,S as ae,U as se,W as P,c as L,V as ie,_ as we,a0 as ve,a6 as x,Z as oe,a7 as Q,a2 as Se,ae as ce,ag as Pe,a4 as Ee,a1 as ue,j as e,B as pe}from"./index-a2e62377.js";import{P as de}from"./progressbar.esm-5a9c2a89.js";import{T as g}from"./tag.esm-045cf529.js";import{A as j}from"./avatar.esm-6fdca276.js";import{A as Ne}from"./avatargroup.esm-6e6f3f0b.js";import{C as m}from"./chip.esm-b55d323e.js";import{S as C}from"./skeleton.esm-8641005e.js";import{C as Oe}from"./index.esm-e0ea7a14.js";import"./index.esm-10fa0e2b.js";function A(t){"@babel/helpers - typeof";return A=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(r){return typeof r}:function(r){return r&&typeof Symbol=="function"&&r.constructor===Symbol&&r!==Symbol.prototype?"symbol":typeof r},A(t)}function Be(t,r){if(A(t)!=="object"||t===null)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var a=n.call(t,r||"default");if(A(a)!=="object")return a;throw new TypeError("@@toPrimitive must return a primitive value.")}return(r==="string"?String:Number)(t)}function Ce(t){var r=Be(t,"string");return A(r)==="symbol"?r:String(r)}function he(t,r,n){return r=Ce(r),r in t?Object.defineProperty(t,r,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[r]=n,t}var Me={root:function(r){var n=r.props;return L("p-badge p-component",he({"p-badge-no-gutter":ie.isNotEmpty(n.value)&&String(n.value).length===1,"p-badge-dot":ie.isEmpty(n.value),"p-badge-lg":n.size==="large","p-badge-xl":n.size==="xlarge"},"p-badge-".concat(n.severity),n.severity!==null))}},Re=`
@layer primereact {
    .p-badge {
        display: inline-block;
        border-radius: 10px;
        text-align: center;
        padding: 0 .5rem;
    }
    
    .p-overlay-badge {
        position: relative;
    }
    
    .p-overlay-badge .p-badge {
        position: absolute;
        top: 0;
        right: 0;
        transform: translate(50%,-50%);
        transform-origin: 100% 0;
        margin: 0;
    }
    
    .p-badge-dot {
        width: .5rem;
        min-width: .5rem;
        height: .5rem;
        border-radius: 50%;
        padding: 0;
    }
    
    .p-badge-no-gutter {
        padding: 0;
        border-radius: 50%;
    }
}
`,Y=ne.extend({defaultProps:{__TYPE:"Badge",__parentMetadata:null,value:null,severity:null,size:null,style:null,className:null,children:void 0},css:{classes:Me,styles:Re}});function me(t,r){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);r&&(a=a.filter(function(u){return Object.getOwnPropertyDescriptor(t,u).enumerable})),n.push.apply(n,a)}return n}function _e(t){for(var r=1;r<arguments.length;r++){var n=arguments[r]!=null?arguments[r]:{};r%2?me(Object(n),!0).forEach(function(a){he(t,a,n[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):me(Object(n)).forEach(function(a){Object.defineProperty(t,a,Object.getOwnPropertyDescriptor(n,a))})}return t}var v=s.memo(s.forwardRef(function(t,r){var n=s.useContext(ae),a=Y.getProps(t,n),u=Y.setMetaData(_e({props:a},a.__parentMetadata)),f=u.ptm,p=u.cx,i=u.isUnstyled;se(Y.css.styles,i,{name:"badge"});var c=s.useRef(null);s.useImperativeHandle(r,function(){return{props:a,getElement:function(){return c.current}}});var o=P({ref:c,style:a.style,className:L(a.className,p("root"))},Y.getOtherProps(a),f("root"));return s.createElement("span",o,a.value)}));v.displayName="Badge";function re(){return re=Object.assign?Object.assign.bind():function(t){for(var r=1;r<arguments.length;r++){var n=arguments[r];for(var a in n)Object.prototype.hasOwnProperty.call(n,a)&&(t[a]=n[a])}return t},re.apply(this,arguments)}var k=ne.extend({defaultProps:{__TYPE:"ScrollPanel",id:null,style:null,className:null,children:void 0},css:{classes:{root:function(r){var n=r.props;return L("p-scrollpanel p-component",n.className)},wrapper:"p-scrollpanel-wrapper",content:"p-scrollpanel-content",barx:"p-scrollpanel-bar p-scrollpanel-bar-x",bary:"p-scrollpanel-bar p-scrollpanel-bar-y"},styles:`
        @layer primereact {
            .p-scrollpanel-wrapper {
                overflow: hidden;
                width: 100%;
                height: 100%;
                position: relative;
                z-index: 1;
                float: left;
            }
            
            .p-scrollpanel-content {
                height: calc(100% + 18px);
                width: calc(100% + 18px);
                padding: 0 18px 18px 0;
                position: relative;
                overflow: auto;
                box-sizing: border-box;
            }
            
            .p-scrollpanel-bar {
                position: relative;
                background: #c1c1c1;
                border-radius: 3px;
                z-index: 2;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.25s linear;
            }
            
            .p-scrollpanel-bar-y {
                width: 9px;
                top: 0;
            }
            
            .p-scrollpanel-bar-x {
                height: 9px;
                bottom: 0;
            }
            
            .p-scrollpanel-hidden {
                visibility: hidden;
            }
            
            .p-scrollpanel:hover .p-scrollpanel-bar,
            .p-scrollpanel:active .p-scrollpanel-bar {
                opacity: 1;
            }
            
            .p-scrollpanel-grabbed {
                user-select: none;
            }
        }
        `}}),xe=s.forwardRef(function(t,r){var n=s.useContext(ae),a=k.getProps(t,n),u=k.setMetaData({props:a}),f=u.ptm,p=u.cx,i=u.isUnstyled;se(k.css.styles,i,{name:"scrollpanel"});var c=s.useRef(null),o=s.useRef(null),d=s.useRef(null),y=s.useRef(null),w=s.useRef(!1),E=s.useRef(!1),_=s.useRef(null),T=s.useRef(null),M=s.useRef(null),R=s.useRef(null),B=s.useRef(null),H=s.useRef(!1),q=function(){var l=getComputedStyle(c.current),O=getComputedStyle(d.current),J=x.getHeight(c.current)-parseInt(O.height,10);l["max-height"]!=="none"&&J===0&&(o.current.offsetHeight+parseInt(O.height,10)>parseInt(l["max-height"],10)?c.current.style.height=l["max-height"]:c.current.style.height=o.current.offsetHeight+parseFloat(l.paddingTop)+parseFloat(l.paddingBottom)+parseFloat(l.borderTopWidth)+parseFloat(l.borderBottomWidth)+"px")},N=function(){var l=o.current.scrollWidth,O=o.current.clientWidth,J=(c.current.clientHeight-d.current.clientHeight)*-1;M.current=O/l;var le=o.current.scrollHeight,be=o.current.clientHeight,je=(c.current.clientWidth-y.current.clientWidth)*-1;R.current=be/le,B.current=window.requestAnimationFrame(function(){M.current>=1?x.addClass(d.current,"p-scrollpanel-hidden"):(x.removeClass(d.current,"p-scrollpanel-hidden"),d.current.style.cssText="width:"+Math.max(M.current*100,10)+"%; left:"+o.current.scrollLeft/l*100+"%;bottom:"+J+"px;"),R.current>=1?x.addClass(y.current,"p-scrollpanel-hidden"):(x.removeClass(y.current,"p-scrollpanel-hidden"),y.current.style.cssText="height:"+Math.max(R.current*100,10)+"%; top: calc("+o.current.scrollTop/le*100+"% - "+d.current.clientHeight+"px);right:"+je+"px;")})},F=function(l){E.current=!0,T.current=l.pageY,x.addClass(y.current,"p-scrollpanel-grabbed"),x.addClass(document.body,"p-scrollpanel-grabbed"),document.addEventListener("mousemove",D),document.addEventListener("mouseup",X),l.preventDefault()},W=function(l){w.current=!0,_.current=l.pageX,x.addClass(d.current,"p-scrollpanel-grabbed"),x.addClass(document.body,"p-scrollpanel-grabbed"),document.addEventListener("mousemove",D),document.addEventListener("mouseup",X),l.preventDefault()},D=function(l){w.current?U(l):(E.current||U(l),I(l))},U=function(l){var O=l.pageX-_.current;_.current=l.pageX,B.current=window.requestAnimationFrame(function(){o.current.scrollLeft+=O/M.current})},I=function(l){var O=l.pageY-T.current;T.current=l.pageY,B.current=window.requestAnimationFrame(function(){o.current.scrollTop+=O/R.current})},X=function h(l){x.removeClass(y.current,"p-scrollpanel-grabbed"),x.removeClass(d.current,"p-scrollpanel-grabbed"),x.removeClass(document.body,"p-scrollpanel-grabbed"),document.removeEventListener("mousemove",D),document.removeEventListener("mouseup",h),w.current=!1,E.current=!1},V=function(){N()};we(function(){N(),window.addEventListener("resize",N),q(),H.current=!0}),ve(function(){H.current&&window.removeEventListener("resize",N),B.current&&window.cancelAnimationFrame(B.current)}),s.useImperativeHandle(r,function(){return{props:a,refresh:V,getElement:function(){return c.current},getContent:function(){return o.current},getXBar:function(){return d.current},getYBar:function(){return y.current}}});var K=P({id:a.id,ref:c,style:a.style,className:p("root")},k.getOtherProps(a),f("root")),Z=P({className:p("wrapper")},f("wrapper")),G=P({className:p("content"),onScroll:N,onMouseEnter:N},f("content")),b=P({ref:d,className:p("barx"),onMouseDown:W},f("barx")),S=P({ref:y,className:p("bary"),onMouseDown:F},f("bary"));return s.createElement("div",K,s.createElement("div",Z,s.createElement("div",re({ref:o},G),a.children)),s.createElement("div",b),s.createElement("div",S))});xe.displayName="ScrollPanel";function te(){return te=Object.assign?Object.assign.bind():function(t){for(var r=1;r<arguments.length;r++){var n=arguments[r];for(var a in n)Object.prototype.hasOwnProperty.call(n,a)&&(t[a]=n[a])}return t},te.apply(this,arguments)}function z(t){"@babel/helpers - typeof";return z=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(r){return typeof r}:function(r){return r&&typeof Symbol=="function"&&r.constructor===Symbol&&r!==Symbol.prototype?"symbol":typeof r},z(t)}function Te(t,r){if(z(t)!=="object"||t===null)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var a=n.call(t,r||"default");if(z(a)!=="object")return a;throw new TypeError("@@toPrimitive must return a primitive value.")}return(r==="string"?String:Number)(t)}function De(t){var r=Te(t,"string");return z(r)==="symbol"?r:String(r)}function Ie(t,r,n){return r=De(r),r in t?Object.defineProperty(t,r,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[r]=n,t}function Ae(t){if(Array.isArray(t))return t}function ze(t,r){var n=t==null?null:typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(n!=null){var a,u,f,p,i=[],c=!0,o=!1;try{if(f=(n=n.call(t)).next,r===0){if(Object(n)!==n)return;c=!1}else for(;!(c=(a=f.call(n)).done)&&(i.push(a.value),i.length!==r);c=!0);}catch(d){o=!0,u=d}finally{try{if(!c&&n.return!=null&&(p=n.return(),Object(p)!==p))return}finally{if(o)throw u}}return i}}function fe(t,r){(r==null||r>t.length)&&(r=t.length);for(var n=0,a=new Array(r);n<r;n++)a[n]=t[n];return a}function Le(t,r){if(t){if(typeof t=="string")return fe(t,r);var n=Object.prototype.toString.call(t).slice(8,-1);if(n==="Object"&&t.constructor&&(n=t.constructor.name),n==="Map"||n==="Set")return Array.from(t);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return fe(t,r)}}function He(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function ee(t,r){return Ae(t)||ze(t,r)||Le(t,r)||He()}var Fe={root:function(r){var n=r.props;return L("p-scrolltop p-link p-component",{"p-scrolltop-sticky":n.target!=="window"})},icon:"p-scrolltop-icon",transition:"p-scrolltop"},Ue=`
@layer primereact {
    .p-scrolltop {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .p-scrolltop-sticky {
        position: sticky;
    }
    
    .p-scrolltop-sticky.p-link {
        margin-left: auto;
    }
    
    .p-scrolltop-helper {
        display: none;
    }
    
    .p-scrolltop-enter {
        opacity: 0;
    }
    
    .p-scrolltop-enter-active {
        opacity: 1;
        transition: opacity .15s;
    }
    
    .p-scrolltop-exit {
        opacity: 1;
    }
    
    .p-scrolltop-exit-active {
        opacity: 0;
        transition: opacity .15s;
    }
}
`,$=ne.extend({defaultProps:{__TYPE:"ScrollTop",target:"window",threshold:400,icon:null,behavior:"smooth",className:null,style:null,transitionOptions:null,onShow:null,onHide:null,children:void 0},css:{classes:Fe,styles:Ue}});function ge(t,r){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);r&&(a=a.filter(function(u){return Object.getOwnPropertyDescriptor(t,u).enumerable})),n.push.apply(n,a)}return n}function Xe(t){for(var r=1;r<arguments.length;r++){var n=arguments[r]!=null?arguments[r]:{};r%2?ge(Object(n),!0).forEach(function(a){Ie(t,a,n[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):ge(Object(n)).forEach(function(a){Object.defineProperty(t,a,Object.getOwnPropertyDescriptor(n,a))})}return t}var ye=s.memo(s.forwardRef(function(t,r){var n=s.useState(!1),a=ee(n,2),u=a[0],f=a[1],p=s.useContext(ae),i=$.getProps(t,p),c=$.setMetaData({props:i,state:{visible:u}}),o=c.ptm,d=c.cx,y=c.isUnstyled;se($.css.styles,y,{name:"scrolltop"});var w=s.useRef(null),E=s.useRef(null),_=i.target==="parent",T=oe({target:function(){return E.current&&E.current.parentElement},type:"scroll",listener:function(S){F(S.currentTarget.scrollTop)}}),M=ee(T,1),R=M[0],B=oe({target:"window",type:"scroll",listener:function(S){S&&F(x.getWindowScrollTop())}}),H=ee(B,1),q=H[0],N=function(){var S=i.target==="window"?window:E.current.parentElement;S.scroll({top:0,behavior:i.behavior})},F=function(S){f(S>i.threshold)},W=function(){Q.set("overlay",w.current,p&&p.autoZIndex||ue.autoZIndex,p&&p.zIndex.overlay||ue.zIndex.overlay)},D=function(){i.onShow&&i.onShow()},U=function(){Q.clear(w.current),i.onHide&&i.onHide()};s.useImperativeHandle(r,function(){return{props:i,getElement:function(){return elementRef.current}}}),s.useEffect(function(){i.target==="window"?q():i.target==="parent"&&R()},[]),ve(function(){Q.clear(w.current)});var I=P({className:d("icon")},o("icon")),X=i.icon||s.createElement(Oe,I),V=Se.getJSXIcon(X,Xe({},I),{props:i}),K=ce("aria")?ce("aria").scrollTop:void 0,Z=P({ref:w,type:"button",className:L(i.className,d("root")),style:i.style,onClick:N,"aria-label":K},$.getOtherProps(i),o("root")),G=P({classNames:d("transition"),in:u,timeout:{enter:150,exit:150},options:i.transitionOptions,unmountOnExit:!0,onEnter:W,onEntered:D,onExited:U},o("transition"));return s.createElement(s.Fragment,null,s.createElement(Pe,te({nodeRef:w},G),s.createElement("button",Z,V,s.createElement(Ee,null))),_&&s.createElement("span",{ref:E,className:"p-scrolltop-helper"}))}));ye.displayName="ScrollTop";const Je=()=>{const[t,r]=s.useState(0),n=s.useRef(null);return s.useEffect(()=>{const a=setInterval(()=>{r(u=>{const f=u+Math.floor(Math.random()*10)+1;return f>=100?100:f})},2e3);return n.current=a,()=>{clearInterval(n.current),n.current=null}},[]),e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card",children:[e.jsx("h5",{children:"ProgressBar"}),e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col",children:e.jsx(de,{value:t})}),e.jsx("div",{className:"col",children:e.jsx(de,{value:"50",showValue:!1})})]})]})}),e.jsxs("div",{className:"col-12 lg:col-6",children:[e.jsxs("div",{className:"card",children:[e.jsx("h4",{children:"Badge"}),e.jsx("h5",{children:"Numbers"}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(v,{value:"2"}),e.jsx(v,{value:"8",severity:"success"}),e.jsx(v,{value:"4",severity:"info"}),e.jsx(v,{value:"12",severity:"warning"}),e.jsx(v,{value:"3",severity:"danger"})]}),e.jsx("h5",{children:"Positioned Badge"}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx("i",{className:"pi pi-bell mr-4 p-text-secondary p-overlay-badge",style:{fontSize:"2rem"},children:e.jsx(v,{value:"2"})}),e.jsx("i",{className:"pi pi-calendar mr-4 p-text-secondary p-overlay-badge",style:{fontSize:"2rem"},children:e.jsx(v,{value:"10+",severity:"danger"})}),e.jsx("i",{className:"pi pi-envelope p-text-secondary p-overlay-badge",style:{fontSize:"2rem"},children:e.jsx(v,{severity:"danger"})})]}),e.jsx("h5",{children:"Button Badge"}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(pe,{type:"button",label:"Emails",children:e.jsx(v,{value:"8"})}),e.jsx(pe,{type:"button",label:"Messages",icon:"pi pi-users",severity:"warning",children:e.jsx(v,{value:"8",severity:"danger"})})]}),e.jsx("h5",{children:"Sizes"}),e.jsxs("div",{className:"flex flex-wrap gap-2 align-items-end",children:[e.jsx(v,{value:"2"}),e.jsx(v,{value:"4",size:"large",severity:"warning"}),e.jsx(v,{value:"6",size:"xlarge",severity:"success"})]})]}),e.jsxs("div",{className:"card",children:[e.jsx("h4",{children:"Avatar"}),e.jsx("h5",{children:"Avatar Group"}),e.jsxs(Ne,{className:"mb-3",children:[e.jsx(j,{image:"/demo/images/avatar/amyelsner.png",size:"large",shape:"circle"}),e.jsx(j,{image:"/demo/images/avatar/asiyajavayant.png",size:"large",shape:"circle"}),e.jsx(j,{image:"/demo/images/avatar/onyamalimba.png",size:"large",shape:"circle"}),e.jsx(j,{image:"/demo/images/avatar/ionibowcher.png",size:"large",shape:"circle"}),e.jsx(j,{image:"/demo/images/avatar/xuxuefeng.png",size:"large",shape:"circle"}),e.jsx(j,{label:"+2",shape:"circle",size:"large",style:{backgroundColor:"#9c27b0",color:"#ffffff"}})]}),e.jsx("h5",{children:"Label - Circle"}),e.jsxs("div",{className:"flex flex-wrap gap-2 align-items-end",children:[e.jsx(j,{label:"P",size:"xlarge",shape:"circle"}),e.jsx(j,{label:"V",size:"large",style:{backgroundColor:"#2196F3",color:"#ffffff"},shape:"circle"}),e.jsx(j,{label:"U",style:{backgroundColor:"#9c27b0",color:"#ffffff"},shape:"circle"})]}),e.jsx("h5",{children:"Icon - Badge"}),e.jsx(j,{className:"p-overlay-badge",icon:"pi pi-user",size:"xlarge",children:e.jsx(v,{value:"4"})})]}),e.jsxs("div",{className:"card",children:[e.jsx("h4",{children:"ScrollTop"}),e.jsxs(xe,{style:{width:"250px",height:"200px"},children:[e.jsx("p",{children:"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Vitae et leo duis ut diam. Ultricies mi quis hendrerit dolor magna eget est lorem. Amet consectetur adipiscing elit ut. Nam libero justo laoreet sit amet. Pharetra massa massa ultricies mi quis hendrerit dolor magna. Est ultricies integer quis auctor elit sed vulputate. Consequat ac felis donec et. Tellus orci ac auctor augue mauris. Semper feugiat nibh sed pulvinar proin gravida hendrerit lectus a. Tincidunt arcu non sodales neque sodales. Metus aliquam eleifend mi in nulla posuere sollicitudin aliquam ultrices. Sodales ut etiam sit amet nisl purus. Cursus sit amet dictum sit amet. Tristique senectus et netus et malesuada fames ac turpis egestas. Et tortor consequat id porta nibh venenatis cras sed. Diam maecenas ultricies mi eget mauris. Eget egestas purus viverra accumsan in nisl nisi. Suscipit adipiscing bibendum est ultricies integer. Mattis aliquam faucibus purus in massa tempor nec."}),e.jsx(ye,{target:"parent",className:"custom-scrolltop",threshold:100,icon:"pi pi-arrow-up"})]})]})]}),e.jsxs("div",{className:"col-12 lg:col-6",children:[e.jsxs("div",{className:"card",children:[e.jsx("h4",{children:"Tag"}),e.jsx("h5",{children:"Tags"}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(g,{value:"Primary"}),e.jsx(g,{severity:"success",value:"Success"}),e.jsx(g,{severity:"info",value:"Info"}),e.jsx(g,{severity:"warning",value:"Warning"}),e.jsx(g,{severity:"danger",value:"Danger"})]}),e.jsx("h5",{children:"Pills"}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(g,{value:"Primary",rounded:!0}),e.jsx(g,{severity:"success",value:"Success",rounded:!0}),e.jsx(g,{severity:"info",value:"Info",rounded:!0}),e.jsx(g,{severity:"warning",value:"Warning",rounded:!0}),e.jsx(g,{severity:"danger",value:"Danger",rounded:!0})]}),e.jsx("h5",{children:"Icons"}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(g,{icon:"pi pi-user",value:"Primary"}),e.jsx(g,{icon:"pi pi-check",severity:"success",value:"Success"}),e.jsx(g,{icon:"pi pi-info-circle",severity:"info",value:"Info"}),e.jsx(g,{icon:"pi pi-exclamation-triangle",severity:"warning",value:"Warning"}),e.jsx(g,{icon:"pi pi-times",severity:"danger",value:"Danger"})]})]}),e.jsxs("div",{className:"card",children:[e.jsx("h4",{children:"Chip"}),e.jsx("h5",{children:"Basic"}),e.jsxs("div",{className:"flex flex-wrap align-items-center gap-2",children:[e.jsx(m,{label:"Action"}),e.jsx(m,{label:"Comedy"}),e.jsx(m,{label:"Mystery"}),e.jsx(m,{label:"Thriller",removable:!0})]}),e.jsx("h5",{children:"Icon"}),e.jsxs("div",{className:"flex align-items-center flex-wrap gap-1",children:[e.jsx(m,{label:"Apple",icon:"pi pi-apple"}),e.jsx(m,{label:"Facebook",icon:"pi pi-facebook"}),e.jsx(m,{label:"Google",icon:"pi pi-google"}),e.jsx(m,{label:"Microsoft",icon:"pi pi-microsoft",removable:!0})]}),e.jsx("h5",{children:"Image"}),e.jsxs("div",{className:"flex align-items-center flex-wrap gap-1",children:[e.jsx(m,{label:"Amy Elsner",image:"/demo/images/avatar/amyelsner.png"}),e.jsx(m,{label:"Asiya Javayant",image:"/demo/images/avatar/asiyajavayant.png"}),e.jsx(m,{label:"Onyama Limba",image:"/demo/images/avatar/onyamalimba.png"}),e.jsx(m,{label:"Xuxue Feng",image:"/demo/images/avatar/xuxuefeng.png",removable:!0})]}),e.jsx("h5",{children:"Styling"}),e.jsxs("div",{className:"flex align-items-center flex-wrap gap-1 custom-chip",children:[e.jsx(m,{label:"Action"}),e.jsx(m,{label:"Apple",icon:"pi pi-apple"}),e.jsx(m,{label:"Onyama Limba",image:"/demo/images/avatar/onyamalimba.png"}),e.jsx(m,{label:"Xuxue Feng",image:"/demo/images/avatar/xuxuefeng.png",removable:!0})]})]}),e.jsxs("div",{className:"card",children:[e.jsx("h4",{children:"Skeleton"}),e.jsxs("div",{className:"border-round border-1 surface-border p-4",children:[e.jsxs("div",{className:"flex mb-3",children:[e.jsx(C,{shape:"circle",size:"4rem",className:"mr-2"}),e.jsxs("div",{children:[e.jsx(C,{width:"10rem",className:"mb-2"}),e.jsx(C,{width:"5rem",className:"mb-2"}),e.jsx(C,{height:".5rem"})]})]}),e.jsx(C,{width:"100%",height:"150px"}),e.jsxs("div",{className:"flex justify-content-between mt-3",children:[e.jsx(C,{width:"4rem",height:"2rem"}),e.jsx(C,{width:"4rem",height:"2rem"})]})]})]})]})]})};export{Je as default};
