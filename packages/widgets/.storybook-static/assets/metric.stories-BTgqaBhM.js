import{a as w,b as T,c as D}from"./index-C-j-JZab.js";import{o as b,n as l,s as o,r as W,u as S,b as j,e as m}from"./types-D0iEVBL-.js";import{j as p}from"./jsx-runtime-DiklIkkE.js";import"./index-DRjF_FHU.js";const h=b({value_column:o().regex(/^[A-Za-z0-9_]+$/).optional(),aggregation:m(["sum","avg","min","max","count","first","last"]).default("count"),time_window:m(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),filter:W(S([o(),l(),j()])).optional(),prefix:o().default(""),suffix:o().default(""),decimals:l().int().min(0).max(6).default(0)});function M({panel:e,records:r,now:t}){const a=h.parse(e.config),i=w(r,a.time_window,t),d=T(i,a.filter);return{resolved:D(d,{aggregation:a.aggregation,value_column:a.value_column}),empty:d.length===0}}function $(){const e="2026-04-30T12:00:00.000Z",r={id:"m-1",dashboard_id:"demo",data_source_id:"ds-1",title:"Total runs (24h)",widget_type:"metric",x:0,y:0,width:3,height:2,config:{aggregation:"count",time_window:"24h"},created_at:e,updated_at:e},t=Array.from({length:47},(a,i)=>({id:`r${i}`,data_source_id:"ds-1",payload:{status:"pass",duration_ms:100+i},recorded_at:new Date(Date.parse(e)-i*6e4).toISOString(),source_ref:null,ingested_via:"webhook",created_at:e}));return{panel:r,records:t}}function v({panel:e,data:r}){const t=h.parse(e.config),a=r.resolved.toLocaleString(void 0,{minimumFractionDigits:t.decimals,maximumFractionDigits:t.decimals});return p.jsx("div",{className:"tiler-metric",style:{display:"flex",flexDirection:"column",justifyContent:"center",height:"100%",padding:8},children:p.jsxs("div",{className:"tiler-metric__value",style:{fontSize:"clamp(1.5rem, 6vw, 3rem)",fontWeight:600,lineHeight:1.1},children:[t.prefix,a,t.suffix]})})}v.__docgenInfo={description:"",methods:[],displayName:"MetricWidget",props:{panel:{required:!0,tsType:{name:"Panel"},description:""},data:{required:!0,tsType:{name:"WidgetData",elements:[{name:"number"}],raw:"WidgetData<number>"},description:""}}};const q={title:"Widgets/Metric",component:v},n=$(),k=M({panel:n.panel,records:n.records,now:new Date(n.panel.created_at)}),s={args:{panel:n.panel,data:k}},c={args:{panel:{...n.panel,title:"Revenue",config:{...n.panel.config,prefix:"$",suffix:"k",decimals:1}},data:{resolved:12.4,empty:!1}}};var u,f,g;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data
  }
}`,...(g=(f=s.parameters)==null?void 0:f.docs)==null?void 0:g.source}}};var x,_,y;c.parameters={...c.parameters,docs:{...(x=c.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    panel: {
      ...ex.panel,
      title: "Revenue",
      config: {
        ...ex.panel.config,
        prefix: "$",
        suffix: "k",
        decimals: 1
      }
    },
    data: {
      resolved: 12.4,
      empty: false
    }
  }
}`,...(y=(_=c.parameters)==null?void 0:_.docs)==null?void 0:y.source}}};const z=["Default","WithPrefixSuffix"];export{s as Default,c as WithPrefixSuffix,z as __namedExportsOrder,q as default};
