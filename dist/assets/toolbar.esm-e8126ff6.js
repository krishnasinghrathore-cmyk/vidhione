import{Q as E,c as P,r as t,S as N,V as c,U as T,W as n}from"./index-a2e62377.js";var o=E.extend({defaultProps:{__TYPE:"Toolbar",id:null,style:null,className:null,left:null,right:null,start:null,center:null,end:null,children:void 0},css:{classes:{root:function(l){var s=l.props;return P("p-toolbar p-component",s.className)},start:"p-toolbar-group-start p-toolbar-group-left",center:"p-toolbar-group-center",end:"p-toolbar-group-end p-toolbar-group-right"},styles:`
        @layer primereact {
            .p-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
            }
            
            .p-toolbar-group-start,
            .p-toolbar-group-center,
            .p-toolbar-group-end {
                display: flex;
                align-items: center;
            }
            
            .p-toolbar-group-left,
            .p-toolbar-group-right {
                display: flex;
                align-items: center;
            }
        }
        `}}),h=t.memo(t.forwardRef(function(i,l){var s=t.useContext(N),e=o.getProps(i,s),u=t.useRef(null),m=c.getJSXElement(e.left||e.start,e),d=c.getJSXElement(e.center,e),g=c.getJSXElement(e.right||e.end,e),p=o.setMetaData({props:e}),r=p.ptm,a=p.cx,b=p.isUnstyled;T(o.css.styles,b,{name:"toolbar"}),t.useImperativeHandle(l,function(){return{props:e,getElement:function(){return u.current}}});var f=n({className:a("start")},r("start")),v=n({className:a("center")},r("center")),y=n({className:a("end")},r("end")),x=n({id:e.id,ref:u,style:e.style,className:a("root"),role:"toolbar"},o.getOtherProps(e),r("root"));return t.createElement("div",x,t.createElement("div",f,m),t.createElement("div",v,d),t.createElement("div",y,g))}));h.displayName="Toolbar";export{h as T};
