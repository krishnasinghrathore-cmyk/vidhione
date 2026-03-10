import{Q as B,c as x,r as l,S as C,U as J,W as p,V as c}from"./index-a2e62377.js";function d(){return d=Object.assign?Object.assign.bind():function(n){for(var e=1;e<arguments.length;e++){var i=arguments[e];for(var t in i)Object.prototype.hasOwnProperty.call(i,t)&&(n[t]=i[t])}return n},d.apply(this,arguments)}function s(n){"@babel/helpers - typeof";return s=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},s(n)}function X(n,e){if(s(n)!=="object"||n===null)return n;var i=n[Symbol.toPrimitive];if(i!==void 0){var t=i.call(n,e||"default");if(s(t)!=="object")return t;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(n)}function D(n){var e=X(n,"string");return s(e)==="symbol"?e:String(e)}function y(n,e,i){return e=D(e),e in n?Object.defineProperty(n,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):n[e]=i,n}var v=B.extend({defaultProps:{__TYPE:"Timeline",align:"left",className:null,content:null,dataKey:null,layout:"vertical",marker:null,opposite:null,value:null,children:void 0},css:{classes:{marker:"p-timeline-event-marker",connector:"p-timeline-event-connector",event:"p-timeline-event",opposite:"p-timeline-event-opposite",separator:"p-timeline-event-separator",content:"p-timeline-event-content",root:function(e){var i=e.props;return x("p-timeline p-component",y(y({},"p-timeline-".concat(i.align),!0),"p-timeline-".concat(i.layout),!0),i.className)}},styles:`
        @layer primereact {
            .p-timeline {
                display: flex;
                flex-grow: 1;
                flex-direction: column;
            }
        
            .p-timeline-left .p-timeline-event-opposite {
                text-align: right;
            }
        
            .p-timeline-left .p-timeline-event-content {
                text-align: left;
            }
        
            .p-timeline-right .p-timeline-event {
                flex-direction: row-reverse;
            }
        
            .p-timeline-right .p-timeline-event-opposite {
                text-align: left;
            }
        
            .p-timeline-right .p-timeline-event-content {
                text-align: right;
            }
        
            .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(even) {
                flex-direction: row-reverse;
            }
        
            .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(odd) .p-timeline-event-opposite {
                text-align: right;
            }
        
            .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(odd) .p-timeline-event-content {
                text-align: left;
            }
        
            .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(even) .p-timeline-event-opposite {
                text-align: left;
            }
        
            .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(even) .p-timeline-event-content {
                text-align: right;
            }
        
            .p-timeline-event {
                display: flex;
                position: relative;
                min-height: 70px;
            }
        
            .p-timeline-event:last-child {
                min-height: 0;
            }
        
            .p-timeline-event-opposite {
                flex: 1;
                padding: 0 1rem;
            }
        
            .p-timeline-event-content {
                flex: 1;
                padding: 0 1rem;
            }
        
            .p-timeline-event-separator {
                flex: 0;
                display: flex;
                align-items: center;
                flex-direction: column;
            }
        
            .p-timeline-event-marker {
                display: flex;
                align-self: baseline;
            }
        
            .p-timeline-event-connector {
                flex-grow: 1;
            }
        
            .p-timeline-horizontal {
                flex-direction: row;
            }
        
            .p-timeline-horizontal .p-timeline-event {
                flex-direction: column;
                flex: 1;
            }
        
            .p-timeline-horizontal .p-timeline-event:last-child {
                flex: 0;
            }
        
            .p-timeline-horizontal .p-timeline-event-separator {
                flex-direction: row;
            }
        
            .p-timeline-horizontal .p-timeline-event-connector  {
                width: 100%;
            }
        
            .p-timeline-bottom .p-timeline-event {
                flex-direction: column-reverse;
            }
        
            .p-timeline-horizontal.p-timeline-alternate .p-timeline-event:nth-child(even) {
                flex-direction: column-reverse;
            }
        }
    `}}),H=l.memo(l.forwardRef(function(n,e){var i=l.useContext(C),t=v.getProps(n,i),f=v.setMetaData({props:t}),g=f.ptm,a=f.cx,b=f.isUnstyled;J(v.css.styles,b,{name:"timeline"});var m=function(o,r){return g(o,{context:{index:r}})},h=l.useRef(null),P=function(o,r){return t.dataKey?c.resolveFieldData(o,t.dataKey):"pr_id__".concat(r)},E=function(){return t.value&&t.value.map(function(o,r){var w=c.getJSXElement(t.opposite,o,r),_=p({className:a("marker")},m("marker",r)),T=c.getJSXElement(t.marker,o,r)||l.createElement("div",_),O=p({className:a("connector")},m("connector",r)),z=r!==t.value.length-1&&l.createElement("div",O),K=c.getJSXElement(t.content,o,r),k=p({className:a("event")},m("event",r)),j=p({className:a("opposite")},m("opposite",r)),R=p({className:a("separator")},m("separator",r)),U=p({className:a("content")},m("content",r));return l.createElement("div",d({key:P(o,r)},k),l.createElement("div",j,w),l.createElement("div",R,T,z),l.createElement("div",U,K))})};l.useImperativeHandle(e,function(){return{props:t,getElement:function(){return h.current}}});var N=E(),S=p({ref:h,className:x(t.className,a("root"))},v.getOtherProps(t),g("root"));return l.createElement("div",S,N)}));H.displayName="Timeline";export{H as T};
