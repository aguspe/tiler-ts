import{j as g}from"./jsx-runtime-DiklIkkE.js";import{o as u,e as f,s as d}from"./types-D0iEVBL-.js";import"./index-DRjF_FHU.js";const h=d().refine(e=>e.startsWith("https://")||e.startsWith("/")||e.startsWith("./"),{message:"URL must be https or a relative path"}),_=u({url:h,alt:d().default(""),fit:f(["cover","contain"]).default("cover")});function c({panel:e}){const t=_.parse(e.config);return g.jsx("img",{src:t.url,alt:t.alt,referrerPolicy:"no-referrer",style:{width:"100%",height:"100%",objectFit:t.fit}})}c.__docgenInfo={description:"",methods:[],displayName:"ImageWidget",props:{panel:{required:!0,tsType:{name:"Panel"},description:""},data:{required:!0,tsType:{name:"WidgetData",elements:[{name:"null"}],raw:"WidgetData<null>"},description:""}}};function y(){const e="2026-04-30T12:00:00.000Z";return{panel:{id:"image-1",dashboard_id:"demo",data_source_id:null,title:"Logo",widget_type:"image",x:0,y:0,width:4,height:3,config:{url:"https://aguspe.github.io/tiler-ts/assets/logo.png",alt:"tiler-ts logo",fit:"contain"},created_at:e,updated_at:e},records:[]}}const W={title:"Widgets/Image",component:c},m=y(),a={args:{panel:m.panel,data:{resolved:null,empty:!1}}},o={args:{panel:{...m.panel,config:{url:"https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg",alt:"Vue logo (placeholder demo image)",fit:"contain"}},data:{resolved:null,empty:!1}}};var n,s,r;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: null,
      empty: false
    }
  }
}`,...(r=(s=a.parameters)==null?void 0:s.docs)==null?void 0:r.source}}};var i,l,p;o.parameters={...o.parameters,docs:{...(i=o.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    panel: {
      ...ex.panel,
      config: {
        url: "https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg",
        alt: "Vue logo (placeholder demo image)",
        fit: "contain"
      }
    },
    data: {
      resolved: null,
      empty: false
    }
  }
}`,...(p=(l=o.parameters)==null?void 0:l.docs)==null?void 0:p.source}}};const j=["Default","SVGRelative"];export{a as Default,o as SVGRelative,j as __namedExportsOrder,W as default};
