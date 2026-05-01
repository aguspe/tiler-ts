import{j as o}from"./jsx-runtime-DiklIkkE.js";import{o as Z,n as i,s as l,r as B,u as C,b as L,e as y}from"./types-D0iEVBL-.js";import"./index-DRjF_FHU.js";function N(){const a="2026-04-30T12:00:00.000Z",d={id:"meter-1",dashboard_id:"demo",data_source_id:"ds-1",title:"Avg duration (ms)",widget_type:"meter",x:0,y:0,width:3,height:2,config:{aggregation:"avg",value_column:"duration_ms",time_window:"24h",min:0,max:1e3,target:200,suffix:" ms"},created_at:a,updated_at:a},e=Array.from({length:50},(b,r)=>({id:`r${r}`,data_source_id:"ds-1",payload:{duration_ms:120+r%10*30},recorded_at:new Date(Date.parse(a)-r*6e4).toISOString(),source_ref:null,ingested_via:"webhook",created_at:a}));return{panel:d,records:e}}const R=Z({value_column:l().regex(/^[A-Za-z0-9_]+$/).optional(),aggregation:y(["sum","avg","min","max","count","first","last"]).default("avg"),time_window:y(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),filter:B(C([l(),i(),L()])).optional(),min:i().default(0),max:i().default(100),target:i().optional(),prefix:l().default(""),suffix:l().default(""),decimals:i().int().min(0).max(6).default(0)});function W({panel:a,data:d}){const e=R.parse(a.config),r=(Math.max(e.min,Math.min(e.max,d.resolved))-e.min)/(e.max-e.min||1),t=80,n=100,s=95,x=Math.PI-r*Math.PI,S=n+t*Math.cos(x),I=s-t*Math.sin(x),P=r>.5?1:0,h=e.target;let v=null;if(h!==void 0){const g=(h-e.min)/(e.max-e.min||1),c=Math.PI-Math.max(0,Math.min(1,g))*Math.PI,O=n+(t-10)*Math.cos(c),F=s-(t-10)*Math.sin(c),q=n+(t+4)*Math.cos(c),z=s-(t+4)*Math.sin(c);v=o.jsx("line",{x1:O,y1:F,x2:q,y2:z,stroke:"var(--tiler-color-warn)",strokeWidth:2})}const E=g=>g.toLocaleString(void 0,{minimumFractionDigits:e.decimals,maximumFractionDigits:e.decimals});return o.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",padding:8},children:[o.jsxs("svg",{viewBox:"0 0 200 110",style:{width:"100%",flex:1},"aria-hidden":!0,children:[o.jsx("path",{d:`M ${n-t},${s} A ${t},${t} 0 0 1 ${n+t},${s}`,fill:"none",stroke:"var(--tiler-color-muted)",strokeWidth:10,strokeOpacity:.25}),o.jsx("path",{d:`M ${n-t},${s} A ${t},${t} 0 ${P} 1 ${S.toFixed(1)},${I.toFixed(1)}`,fill:"none",stroke:"var(--tiler-color-accent)",strokeWidth:10}),v]}),o.jsxs("div",{style:{textAlign:"center",fontSize:"1.1rem",fontWeight:600},children:[e.prefix,E(d.resolved),e.suffix]})]})}W.__docgenInfo={description:"",methods:[],displayName:"MeterWidget",props:{panel:{required:!0,tsType:{name:"Panel"},description:""},data:{required:!0,tsType:{name:"WidgetData",elements:[{name:"number"}],raw:"WidgetData<number>"},description:""}}};const H={title:"Widgets/Meter",component:W},f=N(),m={args:{panel:f.panel,data:{resolved:250,empty:!1}}},p={args:{panel:f.panel,data:{resolved:200,empty:!1}}},u={args:{panel:f.panel,data:{resolved:850,empty:!1}}};var _,M,$;m.parameters={...m.parameters,docs:{...(_=m.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: 250,
      empty: false
    }
  }
}`,...($=(M=m.parameters)==null?void 0:M.docs)==null?void 0:$.source}}};var T,w,A;p.parameters={...p.parameters,docs:{...(T=p.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: 200,
      empty: false
    }
  }
}`,...(A=(w=p.parameters)==null?void 0:w.docs)==null?void 0:A.source}}};var j,k,D;u.parameters={...u.parameters,docs:{...(j=u.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    panel: ex.panel,
    data: {
      resolved: 850,
      empty: false
    }
  }
}`,...(D=(k=u.parameters)==null?void 0:k.docs)==null?void 0:D.source}}};const J=["Default","AtTarget","OverTarget"];export{p as AtTarget,m as Default,u as OverTarget,J as __namedExportsOrder,H as default};
