import{j as v}from"./jsx-runtime-DiklIkkE.js";import{r as l}from"./index-DRjF_FHU.js";import{o as S,b as k,s as C,e as D}from"./types-D0iEVBL-.js";const W=S({format:D(["24h","12h"]).default("24h"),timezone:C().default("UTC"),show_seconds:k().default(!1)});function _({panel:a}){const e=W.parse(a.config),[r,w]=l.useState(()=>new Date);l.useEffect(()=>{const x=e.show_seconds?1e3:6e4,T=setInterval(()=>w(new Date),x);return()=>clearInterval(T)},[e.show_seconds]);const y=new Intl.DateTimeFormat("en-US",{hour:"2-digit",minute:"2-digit",second:e.show_seconds?"2-digit":void 0,hour12:e.format==="12h",timeZone:e.timezone});return v.jsx("time",{dateTime:r.toISOString(),children:y.format(r)})}_.__docgenInfo={description:"",methods:[],displayName:"ClockWidget",props:{panel:{required:!0,tsType:{name:"Panel"},description:""},data:{required:!0,tsType:{name:"WidgetData",elements:[{name:"null"}],raw:"WidgetData<null>"},description:""}}};function E(){const a="2026-04-30T13:42:30.000Z";return{panel:{id:"clock-1",dashboard_id:"demo",data_source_id:null,title:"Build clock",widget_type:"clock",x:9,y:0,width:3,height:2,config:{format:"24h",timezone:"UTC",show_seconds:!1},created_at:a,updated_at:a},records:[]}}const z={title:"Widgets/Clock",component:_},n=E(),t={args:{panel:n.panel,data:{resolved:null,empty:!1}}},o={args:{panel:{...n.panel,config:{...n.panel.config,format:"12h"}},data:{resolved:null,empty:!1}}},s={args:{panel:{...n.panel,config:{...n.panel.config,show_seconds:!0}},data:{resolved:null,empty:!1}}};var c,d,i;t.parameters={...t.parameters,docs:{...(c=t.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: null,
      empty: false
    }
  }
}`,...(i=(d=t.parameters)==null?void 0:d.docs)==null?void 0:i.source}}};var p,m,u;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    panel: {
      ...ex.panel,
      config: {
        ...ex.panel.config,
        format: "12h"
      }
    },
    data: {
      resolved: null,
      empty: false
    }
  }
}`,...(u=(m=o.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var f,g,h;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    panel: {
      ...ex.panel,
      config: {
        ...ex.panel.config,
        show_seconds: true
      }
    },
    data: {
      resolved: null,
      empty: false
    }
  }
}`,...(h=(g=s.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};const F=["Default24h","Format12h","WithSeconds"];export{t as Default24h,o as Format12h,s as WithSeconds,F as __namedExportsOrder,z as default};
