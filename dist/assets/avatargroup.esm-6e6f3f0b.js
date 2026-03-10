import{Q as v,r as a,S as i,U as d,W as f,c as y}from"./index-a2e62377.js";var g={root:"p-avatar-group p-component"},x=`
@layer primereact {
    .p-avatar-group .p-avatar + .p-avatar {
        margin-left: -1rem;
    }
    
    .p-avatar-group {
        display: flex;
        align-items: center;
    }
}
`,r=v.extend({defaultProps:{__TYPE:"AvatarGroup",style:null,className:null,children:void 0},css:{classes:g,styles:x}}),P=a.forwardRef(function(n,o){var p=a.useContext(i),e=r.getProps(n,p),t=r.setMetaData({props:e}),l=t.ptm,u=t.cx,c=t.isUnstyled;d(r.css.styles,c,{name:"avatargroup"});var s=a.useRef(null);a.useImperativeHandle(o,function(){return{props:e,getElement:function(){return s.current}}});var m=f({ref:s,style:e.style,className:y(e.className,u("root"))},r.getOtherProps(e),l("root"));return a.createElement("div",m,e.children)});P.displayName="AvatarGroup";export{P as A};
