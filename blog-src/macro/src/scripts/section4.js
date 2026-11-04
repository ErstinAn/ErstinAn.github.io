(()=>{
/* Endpoint measurements only. Reported ± values retain their source meaning. */
const S4Charts=(()=>{
 const colors={'Muon':'#364854','MuonH-fro':'#6D8584','MuonH-spec':'#9295A6','FSO':'#797F86','SSO':'#A08F79','MACRO-fro':'#007D85','MACRO-spec':'#885277'};
 const order=['Muon','MuonH-fro','MuonH-spec','FSO','SSO','MACRO-fro','MACRO-spec'];
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const n=v=>Number(v.toFixed(4));
 const scale=(v,min,max,a,b)=>a+(v-min)/(max-min)*(b-a);
 const label=(x,y,s,attrs='')=>`<text x="${n(x)}" y="${n(y)}" ${attrs}>${escape(s)}</text>`;
 function dimensions(kind,view,width=780){
  const w=Math.max(240,Math.round(width)),narrow=w<500;
  if(kind==='warmup')return{w,h:270,left:48,right:w-18,top:18,bottom:218,xmin:0,xmax:15,ymin:view==='240M'?20.50:15.18,ymax:view==='240M'?20.90:15.44,yticks:view==='240M'?[20.5,20.6,20.7,20.8,20.9]:[15.2,15.25,15.3,15.35,15.4]};
  const limits=kind==='standard'?{'240M':[20.46,21.03],'600M':[15.20,15.40],'1.2B':[12.82,13.02]}:null;
  const range=kind==='standard'?limits[view]:[0,{e2e_seconds:1.9,tps_per_gpu:230000,mfu_percent:45}[view]];
  return{w,h:kind==='standard'?344:340,left:narrow?104:128,right:w-(kind==='efficiency'?narrow?66:83:18),top:34,bottom:274,row:35,xmin:range[0],xmax:range[1],narrow};
 }
 function formatMetric(value,key,withUnit=true){
  if(key==='e2e_seconds')return value.toFixed(4)+(withUnit?' s':'');
  if(key==='mfu_percent')return value.toFixed(2)+'%';
  return value.toLocaleString('en-US');
 }
 function readout(data,kind,view,index,copy){
  if(kind==='standard'){
   const s=data.standard.models[view][index];
   return `${view} · ${s.method} · ${s.mean===null?copy.standard.missing:'PPL '+s.mean.toFixed(2)+' ± '+s.plus_minus.toFixed(3)}`;
  }
  if(kind==='efficiency'){
   const s=data.efficiency.methods[index],metric=copy.efficiency.metrics.find(m=>m.key===view);
   return `240M · ${s.method} · ${metric.label} ${formatMetric(s[view],view)}`;
  }
  const methods=Object.keys(data.warmup.models[view].series),si=Math.floor(index/4),pi=index%4,s=data.warmup.models[view];
  return `${view} · ${methods[si]} · Warmup ${s.warmup_percent[pi]}% · PPL ${s.series[methods[si]][pi].toFixed(3)}`;
 }
 function targetAttrs(kind,index,description){return `data-s4-point="${index}" data-s4-kind="${kind}" tabindex="0" role="button" aria-label="${escape(description)}"`;}
 function dot(data,model,copy,width=780){
  const g=dimensions('standard',model,width),rows=data.standard.models[model],best=Math.min(...rows.filter(s=>s.mean!==null).map(s=>s.mean));
  const x=v=>scale(v,g.xmin,g.xmax,g.left,g.right);
  const ticks=model==='240M'?[20.5,20.75,21]:model==='600M'?[15.2,15.3,15.4]:[12.85,12.925,13];
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" role="group" aria-label="${escape(model+' · '+copy.standard.title)}">`;
  for(const tick of ticks)svg+=`<line class="s4-grid" x1="${n(x(tick))}" x2="${n(x(tick))}" y1="23" y2="${g.bottom}"/>`+label(x(tick),g.bottom+23,tick===12.925?'12.925':tick.toFixed(2),'text-anchor="middle"');
  rows.forEach((s,i)=>{
   const yy=g.top+i*g.row,desc=readout(data,'standard',model,i,copy),attrs=targetAttrs('standard',i,desc);
   svg+=label(g.left-10,yy+4,s.method,'text-anchor="end" class="s4-method"');
   if(s.mean===null){svg+=label(g.left+5,yy+4,copy.standard.missing,'class="s4-missing"');return;}
   const xx=x(s.mean),lo=x(s.mean-s.plus_minus),hi=x(s.mean+s.plus_minus),isBest=s.mean===best;
   svg+=`<g ${attrs} class="s4-point-target"><title>${escape(desc)}</title><rect x="${n(Math.min(lo,xx-12))}" y="${yy-13}" width="${n(Math.max(24,hi-lo))}" height="26" fill="transparent"/><path d="M${n(lo)},${yy}H${n(hi)}M${n(lo)},${yy-4}V${yy+4}M${n(hi)},${yy-4}V${yy+4}" stroke="${colors[s.method]}" class="s4-error"${s.double_loop?' stroke-dasharray="3 2"':''}/><circle data-s4-mean="${i}" cx="${n(xx)}" cy="${yy}" r="4.7" fill="${s.double_loop?'#FCFBF8':colors[s.method]}" stroke="${colors[s.method]}" stroke-width="1.8"/>`;
   if(isBest)svg+=`<circle cx="${n(xx)}" cy="${yy}" r="8" class="s4-best-ring" stroke="${colors[s.method]}"/>`+label(xx+12,yy-10,copy.standard.best,'class="s4-best-label"');
   svg+='</g>';
  });
  return svg+label((g.left+g.right)/2,g.h-9,copy.standard.axis,'text-anchor="middle"')+'</svg>';
 }
 function bars(data,key,copy,width=780){
  const g=dimensions('efficiency',key,width),rows=data.efficiency.methods,metric=copy.efficiency.metrics.find(m=>m.key===key),x=v=>scale(v,0,g.xmax,g.left,g.right);
  const ref=x(rows.find(s=>s.method==='Muon')[key]);
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" role="group" aria-label="${escape('240M · '+metric.label)}">`;
  const ticks=key==='e2e_seconds'?[0,1,1.9]:key==='tps_per_gpu'?[0,100000,200000]:[0,20,40];
  for(const tick of ticks)svg+=`<line class="s4-grid" x1="${n(x(tick))}" x2="${n(x(tick))}" y1="22" y2="${g.bottom}"/>`+label(x(tick),g.bottom+23,key==='tps_per_gpu'?(tick===0?'0':tick/1000+'k'):tick,'text-anchor="middle"');
  rows.forEach((s,i)=>{
   const yy=g.top+i*g.row,desc=readout(data,'efficiency',key,i,copy);
   svg+=label(g.left-10,yy+4,s.method,'text-anchor="end" class="s4-method"');
   svg+=`<g ${targetAttrs('efficiency',i,desc)} class="s4-point-target"><title>${escape(desc)}</title><rect data-s4-bar="${i}" x="${g.left}" y="${yy-8}" width="${n(x(s[key])-g.left)}" height="16" fill="${s.double_loop?'#FCFBF8':colors[s.method]}" stroke="${colors[s.method]}"${s.double_loop?' stroke-dasharray="4 2"':''}/>`+label(x(s[key])+6,yy+4,formatMetric(s[key],key,false),'class="s4-value"')+'</g>';
  });
  svg+=`<line data-s4-reference="true" x1="${n(ref)}" x2="${n(ref)}" y1="18" y2="${g.bottom}" class="s4-reference"/>`+label(ref,11,copy.efficiency.reference,'text-anchor="middle" class="s4-reference-label"');
  return svg+label(g.w/2,g.h-9,metric.axis,'text-anchor="middle"')+'</svg>';
 }
 function warmup(data,model,copy,width=780){
  const g=dimensions('warmup',model,width),source=data.warmup.models[model],x=v=>scale(v,0,15,g.left,g.right),y=v=>scale(v,g.ymin,g.ymax,g.bottom,g.top);
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" role="group" aria-label="${escape(model+' · '+copy.warmup.title)}">`;
  for(const tick of g.yticks)svg+=`<line class="s4-grid" x1="${g.left}" x2="${g.right}" y1="${n(y(tick))}" y2="${n(y(tick))}"/>`+label(g.left-8,y(tick)+4,tick.toFixed(2),'text-anchor="end"');
  source.warmup_percent.forEach(v=>{svg+=label(x(v),g.bottom+23,v+'%','text-anchor="middle"');});
  Object.entries(source.series).forEach(([method,values],si)=>{
   svg+=`<path data-s4-warmup-series="${si}" d="${values.map((value,j)=>(j?'L':'M')+n(x(source.warmup_percent[j]))+','+n(y(value))).join('')}" class="s4-series" stroke="${colors[method]}"${method==='MACRO-spec'?' stroke-dasharray="5 3"':''}/>`;
   values.forEach((value,j)=>{
    const index=si*4+j,xx=x(source.warmup_percent[j]),yy=y(value),isBest=value===Math.min(...values),desc=readout(data,'warmup',model,index,copy)+(isBest?' · '+copy.warmup.best:'');
    svg+=`<g ${targetAttrs('warmup',index,desc)} class="s4-point-target"><title>${escape(desc)}</title><circle cx="${n(xx)}" cy="${n(yy)}" r="12" fill="transparent"/><circle data-s4-warmup-point="${index}" cx="${n(xx)}" cy="${n(yy)}" r="4.5" fill="${colors[method]}" stroke="#FCFBF8" stroke-width="1.2"/>`;
    if(isBest)svg+=`<circle data-s4-best="${index}" cx="${n(xx)}" cy="${n(yy)}" r="8" class="s4-best-ring" stroke="${colors[method]}"/>`;
    svg+='</g>';
   });
  });
  return svg+label((g.left+g.right)/2,g.h-4,copy.warmup.x_axis,'text-anchor="middle"')+'</svg>';
 }
 function legend(copy){return ['Muon','MACRO-fro','MACRO-spec'].map(method=>`<span><i style="border-color:${colors[method]}"${method==='MACRO-spec'?' class="s4-dashed"':''}></i>${method}</span>`).join('')+`<span class="s4-best-key">○ ${escape(copy.warmup.best)}</span>`;}
 function plot(data,kind,view,copy,width=780){return kind==='standard'?dot(data,view,copy,width):kind==='efficiency'?bars(data,view,copy,width):warmup(data,view,copy,width);}
 return {colors,order,escape,dimensions,scale,formatMetric,readout,dot,bars,warmup,legend,plot};
})();

const S4Data={{include:data/section4.json}};
const S4Copy={{include:src/copy/section4.json}};
const s4Root=document.getElementById('section-4');
const s4Id=id=>s4Root.querySelector('[id="'+id+'"]');
const s4State={standard:'240M',efficiency:'e2e_seconds',warmup:'240M'};
const s4Active={standard:null,efficiency:null,warmup:null};
function s4Mark(kind){
 s4Root.querySelectorAll('[data-s4-point]').forEach(el=>{
  if(el.dataset.s4Kind===kind)el.classList.toggle('s4-selected',Number(el.dataset.s4Point)===s4Active[kind]);
 });
}
function s4Render(kind){
 const chart=s4Id('s4-'+kind+'-chart');
 chart.innerHTML=S4Charts.plot(S4Data,kind,s4State[kind],S4Copy,chart.clientWidth||780);
 if(kind==='efficiency')s4Id('s4-efficiency-helper').textContent=S4Copy.efficiency.metrics.find(m=>m.key===s4State.efficiency).helper;
 s4Mark(kind);
}
for(const kind of ['standard','efficiency','warmup']){
 const chart=s4Id('s4-'+kind+'-chart');
 function select(event){
  if(event.key&&!['Enter',' '].includes(event.key))return;
  let target=event.target;
  while(target&&target!==chart&&target.dataset?.s4Point===undefined)target=target.parentElement;
  if(!target||target===chart||target.dataset.s4Kind!==kind)return;
  if(event.key)event.preventDefault();
  const index=Number(target.dataset.s4Point);
  s4Active[kind]=index;
  s4Id('s4-'+kind+'-readout').textContent=S4Charts.readout(S4Data,kind,s4State[kind],index,S4Copy);
  s4Mark(kind);
 }
 for(const type of ['pointerover','click','focusin','keydown'])chart.addEventListener(type,select);
}
s4Root.querySelectorAll('[data-s4-control]').forEach(button=>{
 button.disabled=false;button.addEventListener('click',()=>{
  const kind=button.dataset.s4Control;s4State[kind]=button.dataset.s4View;s4Active[kind]=null;
  s4Root.querySelectorAll('[data-s4-control]').forEach(el=>{
   if(el.dataset.s4Control===kind)el.setAttribute('aria-pressed',String(el.dataset.s4View===s4State[kind]));
  });
  s4Id('s4-'+kind+'-readout').textContent='';s4Render(kind);
 });
});
function s4Resize(){for(const kind of ['standard','efficiency','warmup'])s4Render(kind);}
window.addEventListener('resize',()=>requestAnimationFrame(s4Resize));
s4Resize();

})();