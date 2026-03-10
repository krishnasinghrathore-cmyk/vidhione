import{Q as Ee,V as O,r as i,S as dt,U as vt,_ as bt,$ as Te,W as d,c as H,a6 as T,ab as ft,a2 as j,a3 as Ie,a4 as F,ad as mt}from"./index-a2e62377.js";import{C as yt}from"./index.esm-4880a95e.js";import{C as ht}from"./index.esm-b05ab7aa.js";function q(t,e){(e==null||e>t.length)&&(e=t.length);for(var a=0,n=new Array(e);a<e;a++)n[a]=t[a];return n}function gt(t){if(Array.isArray(t))return q(t)}function wt(t){if(typeof Symbol<"u"&&t[Symbol.iterator]!=null||t["@@iterator"]!=null)return Array.from(t)}function Ne(t,e){if(t){if(typeof t=="string")return q(t,e);var a=Object.prototype.toString.call(t).slice(8,-1);if(a==="Object"&&t.constructor&&(a=t.constructor.name),a==="Map"||a==="Set")return Array.from(t);if(a==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(a))return q(t,e)}}function St(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Pt(t){return gt(t)||wt(t)||Ne(t)||St()}function D(t){"@babel/helpers - typeof";return D=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},D(t)}function Ct(t,e){if(D(t)!=="object"||t===null)return t;var a=t[Symbol.toPrimitive];if(a!==void 0){var n=a.call(t,e||"default");if(D(n)!=="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function Tt(t){var e=Ct(t,"string");return D(e)==="symbol"?e:String(e)}function ke(t,e,a){return e=Tt(e),e in t?Object.defineProperty(t,e,{value:a,enumerable:!0,configurable:!0,writable:!0}):t[e]=a,t}function It(t){if(Array.isArray(t))return t}function xt(t,e){var a=t==null?null:typeof Symbol<"u"&&t[Symbol.iterator]||t["@@iterator"];if(a!=null){var n,u,v,p,y=[],w=!0,N=!1;try{if(v=(a=a.call(t)).next,e===0){if(Object(a)!==a)return;w=!1}else for(;!(w=(n=v.call(a)).done)&&(y.push(n.value),y.length!==e);w=!0);}catch(A){N=!0,u=A}finally{try{if(!w&&a.return!=null&&(p=a.return(),Object(p)!==p))return}finally{if(N)throw u}}return y}}function Ot(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function R(t,e){return It(t)||xt(t,e)||Ne(t,e)||Ot()}function xe(t,e){var a=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter(function(u){return Object.getOwnPropertyDescriptor(t,u).enumerable})),a.push.apply(a,n)}return a}function U(t){for(var e=1;e<arguments.length;e++){var a=arguments[e]!=null?arguments[e]:{};e%2?xe(Object(a),!0).forEach(function(n){ke(t,n,a[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(a)):xe(Object(a)).forEach(function(n){Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(a,n))})}return t}var Et={navcontent:"p-tabview-nav-content",nav:"p-tabview-nav",inkbar:"p-tabview-ink-bar",panelcontainer:function(e){var a=e.props;return H("p-tabview-panels",a.panelContainerClassName)},prevbutton:"p-tabview-nav-prev p-tabview-nav-btn p-link",nextbutton:"p-tabview-nav-next p-tabview-nav-btn p-link",root:function(e){var a=e.props;return H("p-tabview p-component",{"p-tabview-scrollable":a.scrollable},a.className)},navcontainer:"p-tabview-nav-container",tab:{header:function(e){var a=e.selected,n=e.disabled,u=e.headerClassName,v=e._className;return H("p-unselectable-text",{"p-tabview-selected p-highlight":a,"p-disabled":n},u,v)},headertitle:"p-tabview-title",headeraction:"p-tabview-nav-link",content:function(e){var a=e.props,n=e.selected,u=e.getTabProp,v=e.tab,p=e.isSelected,y=e.shouldUseTab,w=e.index;return y(v,w)&&(!a.renderActiveOnly||p(w))?H(u(v,"contentClassName"),u(v,"className"),"p-tabview-panel",{"p-hidden":!n}):void 0}}},Nt=`
@layer primereact {
    .p-tabview-nav-container {
        position: relative;
    }
    
    .p-tabview-scrollable .p-tabview-nav-container {
        overflow: hidden;
    }
    
    .p-tabview-nav-content {
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        overscroll-behavior: contain auto;
        position: relative;
    }
    
    .p-tabview-nav {
        display: flex;
        margin: 0;
        padding: 0;
        list-style-type: none;
        flex: 1 1 auto;
    }
    
    .p-tabview-nav-link {
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        position: relative;
        text-decoration: none;
        overflow: hidden;
    }
    
    .p-tabview-ink-bar {
        display: none;
        z-index: 1;
    }
    
    .p-tabview-nav-link:focus {
        z-index: 1;
    }
    
    .p-tabview-close {
        z-index: 1;
    }
    
    .p-tabview-title {
        line-height: 1;
        white-space: nowrap;
    }
    
    .p-tabview-nav-btn {
        position: absolute;
        top: 0;
        z-index: 2;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .p-tabview-nav-prev {
        left: 0;
    }
    
    .p-tabview-nav-next {
        right: 0;
    }
    
    .p-tabview-nav-content::-webkit-scrollbar {
        display: none;
    }
}
`,kt={tab:{header:function(e){var a=e.headerStyle,n=e._style;return U(U({},a||{}),n||{})},content:function(e){var a=e.props,n=e.getTabProp,u=e.tab,v=e.isSelected,p=e.shouldUseTab,y=e.index;return p(u,y)&&(!a.renderActiveOnly||v(y))?U(U({},n(u,"contentStyle")||{}),n(u,"style")||{}):void 0}}},V=Ee.extend({defaultProps:{__TYPE:"TabView",id:null,activeIndex:0,className:null,onBeforeTabChange:null,onBeforeTabClose:null,onTabChange:null,onTabClose:null,panelContainerClassName:null,panelContainerStyle:null,renderActiveOnly:!0,scrollable:!1,style:null,children:void 0},css:{classes:Et,styles:Nt,inlineStyles:kt}}),E=Ee.extend({defaultProps:{__TYPE:"TabPanel",className:null,closable:!1,contentClassName:null,contentStyle:null,disabled:!1,header:null,headerClassName:null,headerStyle:null,headerTemplate:null,leftIcon:null,rightIcon:null,prevButton:null,nextButton:null,closeIcon:null,style:null,children:void 0},getCProp:function(e,a){return O.getComponentProp(e,a,E.defaultProps)},getCProps:function(e){return O.getComponentProps(e,E.defaultProps)},getCOtherProps:function(e){return O.getComponentDiffProps(e,E.defaultProps)}});function Oe(t,e){var a=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter(function(u){return Object.getOwnPropertyDescriptor(t,u).enumerable})),a.push.apply(a,n)}return a}function Y(t){for(var e=1;e<arguments.length;e++){var a=arguments[e]!=null?arguments[e]:{};e%2?Oe(Object(a),!0).forEach(function(n){ke(t,n,a[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(a)):Oe(Object(a)).forEach(function(n){Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(a,n))})}return t}var Bt=function(){},_t=i.forwardRef(function(t,e){var a=i.useContext(dt),n=V.getProps(t,a),u=i.useState(n.id),v=R(u,2),p=v[0],y=v[1],w=i.useState(!0),N=R(w,2),A=N[0],Q=N[1],Be=i.useState(!1),G=R(Be,2),Z=G[0],ee=G[1],_e=i.useState([]),te=R(_e,2),P=te[0],ne=te[1],je=i.useState(n.activeIndex),re=R(je,2),W=re[0],ae=re[1],oe=i.useRef(null),h=i.useRef(null),le=i.useRef(null),L=i.useRef(null),ie=i.useRef(null),se=i.useRef(null),K=i.useRef({}),J=n.onTabChange?n.activeIndex:W,ce={props:n,state:{id:p,isPrevButtonDisabled:A,isNextButtonDisabled:Z,hiddenTabsState:P,activeIndex:W}},k=V.setMetaData(Y({},ce)),g=k.ptm,Re=k.ptmo,m=k.cx,ue=k.sx,De=k.isUnstyled;vt(V.css.styles,De,{name:"tabview"});var I=function(r,o){return Re(S(r,"pt"),o,{props:r.props,parent:ce})},B=function(r){return r===J},S=function(r,o){return E.getCProp(r,o)},_=function(r){return r&&O.isValidChild(r,"TabPanel")&&P.every(function(o){return o!==r.key})},Ae=function(r){var o=i.Children.map(n.children,function(l,s){if(_(l))return{tab:l,index:s}});return o.find(function(l){var s=l.tab,b=l.index;return!S(s,"disabled")&&b>=r})||o.reverse().find(function(l){var s=l.tab,b=l.index;return!S(s,"disabled")&&r>b})},pe=function(r,o){r.preventDefault();var l=n.onBeforeTabClose,s=n.onTabClose,b=n.children,C=b[o].key;l&&l({originalEvent:r,index:o})===!1||(ne([].concat(Pt(P),[C])),s&&s({originalEvent:r,index:o}))},$=function(r,o,l){if(r&&r.preventDefault(),!S(o,"disabled")){if(n.onBeforeTabChange&&n.onBeforeTabChange({originalEvent:r,index:l})===!1)return;n.onTabChange?n.onTabChange({originalEvent:r,index:l}):ae(l)}ve(l)},de=function(r,o,l){r.key==="Enter"&&$(r,o,l)},$e=function(){var r=K.current["tab_".concat(J)];L.current.style.width=T.getWidth(r)+"px",L.current.style.left=T.getOffset(r).left-T.getOffset(le.current).left+"px"},ve=function(r){var o=K.current["tab_".concat(r)];o&&o.scrollIntoView&&o.scrollIntoView({block:"nearest"})},He=function(){var r=h.current,o=r.scrollLeft,l=r.scrollWidth,s=T.getWidth(h.current);Q(o===0),ee(o===l-s)},Ue=function(r){n.scrollable&&He(),r.preventDefault()},be=function(){return[ie.current,se.current].reduce(function(r,o){return o?r+T.getWidth(o):r},0)},Ve=function(){var r=T.getWidth(h.current)-be(),o=h.current.scrollLeft-r;h.current.scrollLeft=o<=0?0:o},We=function(){var r=T.getWidth(h.current)-be(),o=h.current.scrollLeft+r,l=h.current.scrollWidth-r;h.current.scrollLeft=o>=l?l:o},Le=function(){Q(!0),ee(!1),ne([]),n.onTabChange?n.onTabChange({index:J}):ae(n.activeIndex)};i.useEffect(function(){$e()}),bt(function(){p||y(ft())}),Te(function(){if(O.isNotEmpty(P)){var c=Ae(P[P.length-1]);c&&$(null,c.tab,c.index)}},[P]),Te(function(){n.activeIndex!==W&&ve(n.activeIndex)},[n.activeIndex]),i.useImperativeHandle(e,function(){return{props:n,reset:Le,getElement:function(){return oe.current}}});var Ke=function(r,o){var l=B(o),s=E.getCProps(r),b=s.headerStyle,C=s.headerClassName,X=s.style,z=s.className,fe=s.disabled,me=s.leftIcon,ye=s.rightIcon,tt=s.header,he=s.headerTemplate,nt=s.closable,rt=s.closeIcon,at=p+"_header_"+o,ge=p+"_content_"+o,ot=fe?null:0,we=me&&j.getJSXIcon(me,void 0,{props:n}),lt=d({className:m("tab.headertitle")},I(r,"headertitle")),Se=i.createElement("span",lt,tt),Pe=ye&&j.getJSXIcon(ye,void 0,{props:n}),Ce="p-tabview-close",it=rt||i.createElement(mt,{className:Ce,onClick:function(f){return pe(f,o)}}),st=nt?j.getJSXIcon(it,{className:Ce,onClick:function(f){return pe(f,o)}},{props:n}):null,ct=d({id:at,role:"tab",className:m("tab.headeraction"),tabIndex:ot,"aria-controls":ge,"aria-selected":l,onClick:function(f){return $(f,r,o)},onKeyDown:function(f){return de(f,r,o)}},I(r,"headeraction")),M=i.createElement("a",ct,we,Se,Pe,st,i.createElement(F,null));if(he){var ut={className:"p-tabview-nav-link",titleClassName:"p-tabview-title",onClick:function(f){return $(f,r,o)},onKeyDown:function(f){return de(f,r,o)},leftIconElement:we,titleElement:Se,rightIconElement:Pe,element:M,props:n,index:o,selected:l,ariaControls:ge};M=O.getJSXElement(he,ut)}var pt=d({ref:function(f){return K.current["tab_".concat(o)]=f},className:m("tab.header",{selected:l,disabled:fe,headerClassName:C,_className:z}),style:ue("tab.header",{headerStyle:b,_style:X}),role:"presentation"},I(r,"root"),I(r,"header"));return i.createElement("li",pt,M)},Je=function(){return i.Children.map(n.children,function(r,o){if(_(r))return Ke(r,o)})},Xe=function(){var r=Je(),o=d({id:p,ref:h,className:m("navcontent"),style:n.style,onScroll:Ue},g("navcontent")),l=d({ref:le,className:m("nav"),role:"tablist"},g("nav")),s=d({ref:L,className:m("inkbar")},g("inkbar"));return i.createElement("div",o,i.createElement("ul",l,r,i.createElement("li",s)))},ze=function(){var r=d({className:m("panelcontainer"),style:n.panelContainerStyle},g("panelcontainer")),o=i.Children.map(n.children,function(l,s){if(_(l)&&(!n.renderActiveOnly||B(s))){var b=B(s),C=p+"_content_"+s,X=p+"_header_"+s,z=d({id:C,className:m("tab.content",{props:n,selected:b,getTabProp:S,tab:l,isSelected:B,shouldUseTab:_,index:s}),style:ue("tab.content",{props:n,getTabProp:S,tab:l,isSelected:B,shouldUseTab:_,index:s}),role:"tabpanel","aria-labelledby":X,"aria-hidden":!b},E.getCOtherProps(l),I(l,"root"),I(l,"content"));return i.createElement("div",z,n.renderActiveOnly?b&&S(l,"children"):S(l,"children"))}});return i.createElement("div",r,o)},Me=function(){var r=d(g("previcon")),o=n.prevButton||i.createElement(yt,r),l=j.getJSXIcon(o,Y({},r),{props:n}),s=d({ref:ie,type:"button",className:m("prevbutton"),"aria-label":Ie("previousPageLabel"),onClick:function(C){return Ve()}},g("prevbutton"));return n.scrollable&&!A?i.createElement("button",s,l,i.createElement(F,null)):null},Fe=function(){var r=d({"aria-hidden":"true"},g("nexticon")),o=n.nextButton||i.createElement(ht,r),l=j.getJSXIcon(o,Y({},r),{props:n}),s=d({ref:se,type:"button",className:m("nextbutton"),"aria-label":Ie("nextPageLabel"),onClick:function(C){return We()}},g("nextbutton"));if(n.scrollable&&!Z)return i.createElement("button",s,l,i.createElement(F,null))},Ye=d({id:p,ref:oe,style:n.style,className:m("root")},V.getOtherProps(n),g("root")),qe=d({className:m("navcontainer")},g("navcontainer")),Qe=Xe(),Ge=ze(),Ze=Me(),et=Fe();return i.createElement("div",Ye,i.createElement("div",qe,Ze,Qe,et),Ge)});Bt.displayName="TabPanel";_t.displayName="TabView";export{_t as T,Bt as a};
