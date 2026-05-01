import{j as n}from"./jsx-runtime-DiklIkkE.js";import{o as $,n as x,s,r as F,u as q,b as A,e as c}from"./types-D0iEVBL-.js";import"./index-DRjF_FHU.js";function C(){const e="2026-04-30T12:00:00.000Z",r={id:"nwd-1",dashboard_id:"demo",data_source_id:"ds-1",title:"Failures (24h)",widget_type:"number_with_delta",x:0,y:0,width:3,height:2,config:{aggregation:"count",time_window:"24h",delta_window:"24h",sparkline_bucket:"1h",filter:{status:"fail"},color:"#ef4444"},created_at:e,updated_at:e},t=Array.from({length:30},(o,a)=>({id:`r${a}`,data_source_id:"ds-1",payload:{status:a%4===0?"fail":"pass"},recorded_at:new Date(Date.parse(e)-a*60*6e4).toISOString(),source_ref:null,ingested_via:"webhook",created_at:e}));return{panel:r,records:t}}const R=$({value_column:s().regex(/^[A-Za-z0-9_]+$/).optional(),aggregation:c(["sum","avg","min","max","count","first","last"]).default("count"),time_window:c(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),delta_window:c(["1m","5m","15m","1h","4h","24h","7d","30d"]).default("24h"),sparkline_bucket:c(["30s","1m","5m","1h","1d"]).default("1h"),filter:F(q([s(),x(),A()])).optional(),color:s().optional(),prefix:s().default(""),suffix:s().default(""),decimals:x().int().min(0).max(6).default(0)});function N({values:e,color:r="currentColor",height:t=28}){if(e.length<2)return null;const o=Math.max(...e),a=Math.min(...e),l=o-a||1,i=100,d=i/(e.length-1),g=e.map((p,h)=>`${(h*d).toFixed(1)},${(t-(p-a)/l*t).toFixed(1)}`).join(" ");return n.jsx("svg",{width:"100%",height:t,viewBox:`0 0 ${i} ${t}`,preserveAspectRatio:"none","aria-hidden":!0,style:{display:"block"},children:n.jsx("polyline",{points:g,fill:"none",stroke:r,strokeWidth:1.5})})}N.__docgenInfo={description:"",methods:[],displayName:"Sparkline",props:{values:{required:!0,tsType:{name:"Array",elements:[{name:"number"}],raw:"number[]"},description:""},color:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:'"currentColor"',computed:!1}},height:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"28",computed:!1}}}};function S({panel:e,data:r}){const t=R.parse(e.config),{value:o,delta:a,delta_pct:l,spark:i}=r.resolved,d=h=>h.toLocaleString(void 0,{minimumFractionDigits:t.decimals,maximumFractionDigits:t.decimals}),g=a>0?"▲":a<0?"▼":"■",p=t.color??"currentColor";return n.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",padding:8,color:p},children:[n.jsxs("div",{style:{fontSize:"clamp(1.4rem, 5vw, 2.4rem)",fontWeight:600,lineHeight:1.1},children:[t.prefix,d(o),t.suffix]}),n.jsxs("div",{style:{fontSize:"0.85rem",opacity:.85,marginTop:4},children:[g," ",d(Math.abs(a)),l!==null&&` (${l.toFixed(1)}%)`]}),n.jsx("div",{style:{flex:1,marginTop:8},children:n.jsx(N,{values:i,color:p})})]})}S.__docgenInfo={description:"",methods:[],displayName:"NumberWithDeltaWidget",props:{panel:{required:!0,tsType:{name:"Panel"},description:""},data:{required:!0,tsType:{name:"WidgetData",elements:[{name:"NumberWithDeltaResolved"}],raw:"WidgetData<NumberWithDeltaResolved>"},description:""}}};const I={title:"Widgets/Number With Delta",component:S},_=C(),m={args:{panel:_.panel,data:{resolved:{value:142,delta:18,delta_pct:14.5,spark:[10,12,11,14,18,17,22,24]},empty:!1}}},u={args:{panel:_.panel,data:{resolved:{value:12,delta:-3,delta_pct:-20,spark:[4,5,4,3,2,3,2,1]},empty:!1}}},f={args:{panel:_.panel,data:{resolved:{value:50,delta:0,delta_pct:0,spark:[50,50,50,50,50]},empty:!1}}};var y,v,b;m.parameters={...m.parameters,docs:{...(y=m.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: {
        value: 142,
        delta: 18,
        delta_pct: 14.5,
        spark: [10, 12, 11, 14, 18, 17, 22, 24]
      },
      empty: false
    }
  }
}`,...(b=(v=m.parameters)==null?void 0:v.docs)==null?void 0:b.source}}};var w,D,k;u.parameters={...u.parameters,docs:{...(w=u.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: {
        value: 12,
        delta: -3,
        delta_pct: -20,
        spark: [4, 5, 4, 3, 2, 3, 2, 1]
      },
      empty: false
    }
  }
}`,...(k=(D=u.parameters)==null?void 0:D.docs)==null?void 0:k.source}}};var T,W,j;f.parameters={...f.parameters,docs:{...(T=f.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: {
        value: 50,
        delta: 0,
        delta_pct: 0,
        spark: [50, 50, 50, 50, 50]
      },
      empty: false
    }
  }
}`,...(j=(W=f.parameters)==null?void 0:W.docs)==null?void 0:j.source}}};const M=["PositiveDelta","NegativeDelta","ZeroDelta"];export{u as NegativeDelta,m as PositiveDelta,f as ZeroDelta,M as __namedExportsOrder,I as default};
