import{j as d}from"./jsx-runtime-DiklIkkE.js";import{o as m,a as l,s as i,e as c}from"./types-D0iEVBL-.js";import"./index-DRjF_FHU.js";const u=i().refine(e=>e.startsWith("https://")||e.startsWith("/")||e.startsWith("./"),{message:"URL must be https or a relative path"}),f=["allow-forms","allow-popups","allow-popups-to-escape-sandbox","allow-same-origin","allow-scripts"],g=l(c(f)).default([]).transform(e=>Array.from(new Set([...e,"allow-scripts"]))),x=m({url:u,sandbox:g,allow:l(i()).default([])});function p({panel:e}){const t=x.parse(e.config);return d.jsx("iframe",{title:e.title,src:t.url,sandbox:t.sandbox.join(" "),allow:t.allow.join("; "),referrerPolicy:"no-referrer",style:{width:"100%",height:"100%",border:0}})}p.__docgenInfo={description:"",methods:[],displayName:"IframeWidget",props:{panel:{required:!0,tsType:{name:"Panel"},description:""},data:{required:!0,tsType:{name:"WidgetData",elements:[{name:"null"}],raw:"WidgetData<null>"},description:""}}};function h(){const e="2026-04-30T12:00:00.000Z";return{panel:{id:"iframe-1",dashboard_id:"demo",data_source_id:null,title:"Embedded view",widget_type:"iframe",x:0,y:0,width:6,height:4,config:{url:"https://aguspe.github.io/tiler-ts/embedded.html",sandbox:["allow-scripts"],allow:[]},created_at:e,updated_at:e},records:[]}}const _={title:"Widgets/Iframe",component:p},r=h(),a={args:{panel:{...r.panel,config:{...r.panel.config,url:"https://example.com"}},data:{resolved:null,empty:!1}}};var o,s,n;a.parameters={...a.parameters,docs:{...(o=a.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    panel: {
      ...ex.panel,
      config: {
        ...ex.panel.config,
        url: "https://example.com"
      }
    },
    data: {
      resolved: null,
      empty: false
    }
  }
}`,...(n=(s=a.parameters)==null?void 0:s.docs)==null?void 0:n.source}}};const W=["ExampleCom"];export{a as ExampleCom,W as __namedExportsOrder,_ as default};
