import{Q as x,r as a,S,U as E,c,W as p}from"./index-a2e62377.js";function b(){return b=Object.assign?Object.assign.bind():function(n){for(var r=1;r<arguments.length;r++){var t=arguments[r];for(var e in t)Object.prototype.hasOwnProperty.call(t,e)&&(n[e]=t[e])}return n},b.apply(this,arguments)}function m(n){"@babel/helpers - typeof";return m=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(r){return typeof r}:function(r){return r&&typeof Symbol=="function"&&r.constructor===Symbol&&r!==Symbol.prototype?"symbol":typeof r},m(n)}function _(n,r){if(m(n)!=="object"||n===null)return n;var t=n[Symbol.toPrimitive];if(t!==void 0){var e=t.call(n,r||"default");if(m(e)!=="object")return e;throw new TypeError("@@toPrimitive must return a primitive value.")}return(r==="string"?String:Number)(n)}function N(n){var r=_(n,"string");return m(r)==="symbol"?r:String(r)}function k(n,r,t){return r=N(r),r in n?Object.defineProperty(n,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):n[r]=t,n}var B={root:function(r){var t=r.props;return t.mode==="indeterminate"?c("p-progressbar p-component p-progressbar-indeterminate"):c("p-progressbar p-component p-progressbar-determinate")},value:"p-progressbar-value p-progressbar-value-animate",label:"p-progressbar-label",container:"p-progressbar-indeterminate-container"},C=`
@layer primereact {
  .p-progressbar {
      position: relative;
      overflow: hidden;
  }
  
  .p-progressbar-determinate .p-progressbar-value {
      height: 100%;
      width: 0%;
      position: absolute;
      display: none;
      border: 0 none;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
  }
  
  .p-progressbar-determinate .p-progressbar-label {
      display: inline-flex;
  }
  
  .p-progressbar-determinate .p-progressbar-value-animate {
      transition: width 1s ease-in-out;
  }
  
  .p-progressbar-indeterminate .p-progressbar-value::before {
        content: '';
        position: absolute;
        background-color: inherit;
        top: 0;
        left: 0;
        bottom: 0;
        will-change: left, right;
        -webkit-animation: p-progressbar-indeterminate-anim 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
                animation: p-progressbar-indeterminate-anim 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
  }
  
  .p-progressbar-indeterminate .p-progressbar-value::after {
      content: '';
      position: absolute;
      background-color: inherit;
      top: 0;
      left: 0;
      bottom: 0;
      will-change: left, right;
      -webkit-animation: p-progressbar-indeterminate-anim-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
              animation: p-progressbar-indeterminate-anim-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
      -webkit-animation-delay: 1.15s;
              animation-delay: 1.15s;
  }
}

@-webkit-keyframes p-progressbar-indeterminate-anim {
  0% {
    left: -35%;
    right: 100%; }
  60% {
    left: 100%;
    right: -90%; }
  100% {
    left: 100%;
    right: -90%; }
}
@keyframes p-progressbar-indeterminate-anim {
  0% {
    left: -35%;
    right: 100%; }
  60% {
    left: 100%;
    right: -90%; }
  100% {
    left: 100%;
    right: -90%; }
}

@-webkit-keyframes p-progressbar-indeterminate-anim-short {
  0% {
    left: -200%;
    right: 100%; }
  60% {
    left: 107%;
    right: -8%; }
  100% {
    left: 107%;
    right: -8%; }
}
@keyframes p-progressbar-indeterminate-anim-short {
  0% {
    left: -200%;
    right: 100%; }
  60% {
    left: 107%;
    right: -8%; }
  100% {
    left: 107%;
    right: -8%; }
}
`,D={value:function(r){var t=r.props,e=Math.max(t.value,2),o=t.value?t.color:"transparent";return t.mode==="indeterminate"?{backgroundColor:t.color}:{width:e+"%",display:"flex",backgroundColor:o}}},u=x.extend({defaultProps:{__TYPE:"ProgressBar",__parentMetadata:null,id:null,value:null,showValue:!0,unit:"%",style:null,className:null,mode:"determinate",displayValueTemplate:null,color:null,children:void 0},css:{classes:B,styles:C,inlineStyles:D}});function y(n,r){var t=Object.keys(n);if(Object.getOwnPropertySymbols){var e=Object.getOwnPropertySymbols(n);r&&(e=e.filter(function(o){return Object.getOwnPropertyDescriptor(n,o).enumerable})),t.push.apply(t,e)}return t}function V(n){for(var r=1;r<arguments.length;r++){var t=arguments[r]!=null?arguments[r]:{};r%2?y(Object(t),!0).forEach(function(e){k(n,e,t[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(t)):y(Object(t)).forEach(function(e){Object.defineProperty(n,e,Object.getOwnPropertyDescriptor(t,e))})}return n}var M=a.memo(a.forwardRef(function(n,r){var t=a.useContext(S),e=u.getProps(n,t),o=u.setMetaData(V({props:e},e.__parentMetadata)),i=o.ptm,s=o.cx,h=o.isUnstyled;E(u.css.styles,h,{name:"progressbar"});var d=a.useRef(null),P=function(){if(e.showValue&&e.value!=null){var l=e.displayValueTemplate?e.displayValueTemplate(e.value):e.value+e.unit;return l}return null},w=function(){var l=P(),g=p({className:c(e.className,s("root")),style:e.style,role:"progressbar","aria-valuemin":"0","aria-valuenow":e.value,"aria-valuemax":"100"},u.getOtherProps(e),i("root")),v=p({className:s("value"),style:{width:e.value+"%",display:"flex",backgroundColor:e.color}},i("value")),j=p({className:s("label")},i("label"));return a.createElement("div",b({id:e.id,ref:d},g),a.createElement("div",v,l!=null&&a.createElement("div",j,l)))},O=function(){var l=p({className:c(e.className,s("root")),style:e.style,role:"progressbar","aria-valuemin":"0","aria-valuenow":e.value,"aria-valuemax":"100"},u.getOtherProps(e),i("root")),g=p({className:s("container")},i("container")),v=p({className:s("value"),style:{backgroundColor:e.color}},i("value"));return a.createElement("div",b({id:e.id,ref:d},l),a.createElement("div",g,a.createElement("div",v)))};if(a.useImperativeHandle(r,function(){return{props:e,getElement:function(){return d.current}}}),e.mode==="determinate")return w();if(e.mode==="indeterminate")return O();throw new Error(e.mode+" is not a valid mode for the ProgressBar. Valid values are 'determinate' and 'indeterminate'")}));M.displayName="ProgressBar";export{M as P};
