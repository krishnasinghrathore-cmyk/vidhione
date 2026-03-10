import{Q as g,r as s,S as h,U as P,W as S,c as u}from"./index-a2e62377.js";function a(t){"@babel/helpers - typeof";return a=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},a(t)}function O(t,e){if(a(t)!=="object"||t===null)return t;var r=t[Symbol.toPrimitive];if(r!==void 0){var n=r.call(t,e||"default");if(a(n)!=="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function w(t){var e=O(t,"string");return a(e)==="symbol"?e:String(e)}function k(t,e,r){return e=w(e),e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}var j={root:function(e){var r=e.props;return u("p-skeleton p-component",{"p-skeleton-circle":r.shape==="circle","p-skeleton-none":r.animation==="none"})}},x=`
@layer primereact {
    .p-skeleton {
        position: relative;
        overflow: hidden;
    }
    
    .p-skeleton::after {
        content: "";
        animation: p-skeleton-animation 1.2s infinite;
        height: 100%;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        transform: translateX(-100%);
        z-index: 1;
    }
    
    .p-skeleton-circle {
        border-radius: 50%;
    }
    
    .p-skeleton-none::after {
        animation: none;
    }
}

@keyframes p-skeleton-animation {
    from {
        transform: translateX(-100%);
    }
    to {
        transform: translateX(100%);
    }
}
`,R={root:{position:"relative"}},i=g.extend({defaultProps:{__TYPE:"Skeleton",shape:"rectangle",size:null,width:"100%",height:"1rem",borderRadius:null,animation:"wave",style:null,className:null},css:{classes:j,inlineStyles:R,styles:x}});function c(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter(function(o){return Object.getOwnPropertyDescriptor(t,o).enumerable})),r.push.apply(r,n)}return r}function p(t){for(var e=1;e<arguments.length;e++){var r=arguments[e]!=null?arguments[e]:{};e%2?c(Object(r),!0).forEach(function(n){k(t,n,r[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):c(Object(r)).forEach(function(n){Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(r,n))})}return t}var E=s.memo(s.forwardRef(function(t,e){var r=s.useContext(h),n=i.getProps(t,r),o=i.setMetaData({props:n}),f=o.ptm,m=o.cx,y=o.sx,d=o.isUnstyled;P(i.css.styles,d,{name:"skeleton"});var l=s.useRef(null);s.useImperativeHandle(e,function(){return{props:n,getElement:function(){return l.current}}});var b=n.size?{width:n.size,height:n.size,borderRadius:n.borderRadius}:{width:n.width,height:n.height,borderRadius:n.borderRadius},v=S({ref:l,className:u(n.className,m("root")),style:p(p({},b),y("root")),"aria-hidden":!0},i.getOtherProps(n),f("root"));return s.createElement("div",v)}));E.displayName="Skeleton";export{E as S};
