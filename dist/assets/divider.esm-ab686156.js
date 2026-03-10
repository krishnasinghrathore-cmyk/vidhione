import{Q as m,r,S as h,U as b,W as p,c as x}from"./index-a2e62377.js";var z={root:function(i){var e=i.props,n=i.horizontal,t=i.vertical;return x("p-divider p-component p-divider-".concat(e.layout," p-divider-").concat(e.type),{"p-divider-left":n&&(!e.align||e.align==="left"),"p-divider-right":n&&e.align==="right","p-divider-center":n&&e.align==="center"||t&&(!e.align||e.align==="center"),"p-divider-top":t&&e.align==="top","p-divider-bottom":t&&e.align==="bottom"},e.className)},content:"p-divider-content"},D=`
@layer primereact {
    .p-divider-horizontal {
        display: flex;
        width: 100%;
        position: relative;
        align-items: center;
    }
    
    .p-divider-horizontal:before {
        position: absolute;
        display: block;
        top: 50%;
        left: 0;
        width: 100%;
        content: "";
    }
    
    .p-divider-horizontal.p-divider-left {
        justify-content: flex-start;
    }
    
    .p-divider-horizontal.p-divider-right {
        justify-content: flex-end;
    }
    
    .p-divider-horizontal.p-divider-center {
        justify-content: center;
    }
    
    .p-divider-content {
        z-index: 1;
    }
    
    .p-divider-vertical {
        min-height: 100%;
        margin: 0 1rem;
        display: flex;
        position: relative;
        justify-content: center;
    }
    
    .p-divider-vertical:before {
        position: absolute;
        display: block;
        top: 0;
        left: 50%;
        height: 100%;
        content: "";
    }
    
    .p-divider-vertical.p-divider-top {
        align-items: flex-start;
    }
    
    .p-divider-vertical.p-divider-center {
        align-items: center;
    }
    
    .p-divider-vertical.p-divider-bottom {
        align-items: flex-end;
    }
    
    .p-divider-solid.p-divider-horizontal:before {
        border-top-style: solid;
    }
    
    .p-divider-solid.p-divider-vertical:before {
        border-left-style: solid;
    }
    
    .p-divider-dashed.p-divider-horizontal:before {
        border-top-style: dashed;
    }
    
    .p-divider-dashed.p-divider-vertical:before {
        border-left-style: dashed;
    }
    
    .p-divider-dotted.p-divider-horizontal:before {
        border-top-style: dotted;
    }
    
    .p-divider-dotted.p-divider-horizontal:before {
        border-left-style: dotted;
    }
}
`,P={root:function(i){var e=i.props;return{justifyContent:e.layout==="horizontal"?e.align==="center"||e.align===null?"center":e.align==="left"?"flex-start":e.align==="right"?"flex-end":null:null,alignItems:e.layout==="vertical"?e.align==="center"||e.align===null?"center":e.align==="top"?"flex-start":e.align==="bottom"?"flex-end":null:null}}},o=m.extend({defaultProps:{__TYPE:"Divider",align:null,layout:"horizontal",type:"solid",style:null,className:null,children:void 0},css:{classes:z,styles:D,inlineStyles:P}}),E=r.forwardRef(function(l,i){var e=r.useContext(h),n=o.getProps(l,e),t=o.setMetaData({props:n}),d=t.ptm,a=t.cx,v=t.sx,c=t.isUnstyled;b(o.css.styles,c,{name:"divider"});var s=r.useRef(null),f=n.layout==="horizontal",u=n.layout==="vertical";r.useImperativeHandle(i,function(){return{props:n,getElement:function(){return s.current}}});var y=p({ref:s,style:v("root"),className:a("root",{horizontal:f,vertical:u}),role:"separator"},o.getOtherProps(n),d("root")),g=p({className:a("content")},d("content"));return r.createElement("div",y,r.createElement("div",g,n.children))});E.displayName="Divider";export{E as D};
