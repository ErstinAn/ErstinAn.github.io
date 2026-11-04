(()=>{
/* Pure SVG rendering and calculations; measured histories are never changed. */
const S2Charts=(()=>{
 const colors=['#D93236','#DC7D22','#2E8A45','#2679B7','#8D61B4'];
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const coord=v=>Number(v.toFixed(4));
 const number=v=>v===0?'0':Number(v.toPrecision(6)).toString();
 function bounds(kind,width=780){
  const w=Math.max(240,Math.round(width)),h=278,left=47,right=w-12,top=15,bottom=231;
  const ymin=kind==='fro'?.0007:.002,ymax=kind==='fro'?.07:1;
  return {w,h,left,right,top,bottom,xmin:0,xmax:8499,ymin,ymax,
   xticks:w<500?[0,4000,8000]:[0,2000,4000,6000,8000],yticks:kind==='fro'?[.001,.005,.01,.05]:[.002,.01,.05,.1,.5,1]};
 }
 const x=(step,g)=>g.left+(step-g.xmin)/(g.xmax-g.xmin)*(g.right-g.left);
 const y=(angle,g)=>g.bottom-Math.log(angle/g.ymin)/Math.log(g.ymax/g.ymin)*(g.bottom-g.top);
 function settingsLabel(series,meta){return String(series.learning_rate);}
 function legend(data,kind,copy,meta){
  const key=kind==='fro'?'fro':'u';
  return data[key].series.map((s,i)=>`<button type="button" disabled data-s2-legend="${kind}" data-s2-index="${i}" aria-pressed="false" aria-controls="s2-${key}-chart${kind==='spec'?' s2-v-chart':''}"><i style="border-color:${colors[i]}"></i>${escape(settingsLabel(s,meta))}</button>`).join('');
 }
 function plot(data,key,copy,meta,width=780){
  const kind=key==='fro'?'fro':'spec',g=bounds(kind,width),s=data[key],words=key==='fro'?copy.frobenius:copy.spectral;
  const title=key==='fro'?words.title:key==='u'?words.left_title:words.right_title;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" role="group" aria-label="${escape(title)}" data-width="${g.w}" data-left="${g.left}" data-right="${g.right}">`;
  for(const tick of g.yticks){const py=coord(y(tick,g));svg+=`<line x1="${g.left}" x2="${g.right}" y1="${py}" y2="${py}" class="s2-grid"/><text x="${g.left-8}" y="${py+4}" text-anchor="end">${tick}</text>`;}
  for(const tick of g.xticks)svg+=`<text x="${coord(x(tick,g))}" y="${g.bottom+22}" text-anchor="middle">${tick}</text>`;
  svg+=`<text x="${(g.left+g.right)/2}" y="${g.h-5}" text-anchor="middle">${escape(words.x_axis)}</text>`;
  s.series.forEach((series,i)=>{
   let path='',started=false;
   series.values.forEach((value,j)=>{
    if(value===null){started=false;return;}
    if(value<=0)throw Error('A nonpositive sample requires a linear axis; no epsilon replacement is allowed.');
    path+=(started?'L':'M')+coord(x(s.steps[j],g))+','+coord(y(value,g));started=true;
   });
   svg+=`<g data-s2-line="${key}" data-s2-index="${i}"><path d="${path}" stroke="${colors[i]}" class="s2-series"/><path d="${path}" class="s2-hit" tabindex="0" role="button" data-s2-curve="${key}" data-s2-index="${i}" aria-label="${escape(title+' · '+settingsLabel(series,meta))}" aria-describedby="s2-${kind}-help s2-${kind}-readout"/></g>`;
  });
  svg+=`<line id="s2-${key}-cursor" x1="0" x2="0" y1="${g.top}" y2="${g.bottom}" visibility="hidden" class="s2-cursor"/><circle id="s2-${key}-marker" cx="0" cy="0" r="3.5" visibility="hidden" class="s2-marker"/>`;
  return svg+'</svg>';
 }
 function nearest(steps,target){let lo=0,hi=steps.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(steps[mid]<target)lo=mid+1;else hi=mid;}return lo&&target-steps[lo-1]<=steps[lo]-target?lo-1:lo;}
 function readout(data,key,index,sample,copy,meta){
  const series=data[key].series[index],value=series.values[sample],unit=meta.units_verified?' rad':'';
  const setting=copy[key==='fro'?'frobenius':'spectral'].legend_title+' '+settingsLabel(series,meta);
  return (key==='fro'?'':(key==='u'?copy.spectral.left_title:copy.spectral.right_title)+' · ')+`${copy.general.step} ${data[key].steps[sample]} · ${setting} · ${copy.general.angle} ${value===null?copy.general.missing:number(value)+unit}`;
 }
 return {escape,colors,number,bounds,x,y,settingsLabel,legend,plot,nearest,readout};
})();

const S2Data={{include:data/section2.json}};
const S2Copy={{include:src/copy/section2.json}};
const S2Meta={{include:data/rotation-metadata.json}};
const S2Tables={{include:data/weight-decay.json}};
const s2Root=document.getElementById('section-2');
const s2Id=id=>s2Root.querySelector('[id="'+id+'"]');
const s2Selection={fro:null,spec:null};
const s2ChartWidth=key=>Math.max(240,s2Id('s2-'+key+'-chart').clientWidth||780);
function s2Highlight(kind){
 const selection=s2Selection[kind],keys=kind==='fro'?['fro']:['u','v'];
 s2Root.querySelectorAll('[data-s2-line]').forEach(group=>{
  if(keys.includes(group.dataset.s2Line))group.setAttribute('opacity',String(!selection||Number(group.dataset.s2Index)===selection.index?1:.17));
 });
 s2Root.querySelectorAll('[data-s2-legend]').forEach(b=>{
  if(b.dataset.s2Legend===kind)b.setAttribute('aria-pressed',String(!!selection&&Number(b.dataset.s2Index)===selection.index));
 });
 for(const key of keys){
  const cursor=s2Id('s2-'+key+'-cursor'),marker=s2Id('s2-'+key+'-marker');
  if(!selection){cursor.setAttribute('visibility','hidden');marker.setAttribute('visibility','hidden');continue;}
  const sample=S2Charts.nearest(S2Data[key].steps,selection.step),value=S2Data[key].series[selection.index].values[sample];
  // Source metadata confirms matching runs and exact time keys in u/v.
  const show=key===selection.key||(S2Meta.spectral_runs_matched&&S2Data[key].steps[sample]===selection.step);
  if(!show||value===null){cursor.setAttribute('visibility','hidden');marker.setAttribute('visibility','hidden');continue;}
  const g=S2Charts.bounds(kind,s2ChartWidth(key)),px=S2Charts.x(S2Data[key].steps[sample],g),py=S2Charts.y(value,g);
  cursor.setAttribute('x1',px);cursor.setAttribute('x2',px);cursor.setAttribute('visibility','visible');
  marker.setAttribute('cx',px);marker.setAttribute('cy',py);marker.setAttribute('fill',S2Charts.colors[selection.index]);marker.setAttribute('visibility','visible');
 }
 const readout=s2Id('s2-'+kind+'-readout');
 readout.textContent=selection?S2Charts.readout(S2Data,selection.key,selection.index,selection.sample,S2Copy,S2Meta):'';
}
function s2Select(key,index,sample){
 const kind=key==='fro'?'fro':'spec';
 sample=Math.max(0,Math.min(S2Data[key].steps.length-1,sample));
 s2Selection[kind]={key,index,sample,step:S2Data[key].steps[sample]};
 s2Highlight(kind);
}
function s2RenderPlots(){
 for(const key of ['fro','u','v'])s2Id('s2-'+key+'-chart').innerHTML=S2Charts.plot(S2Data,key,S2Copy,S2Meta,s2ChartWidth(key));
 s2Highlight('fro');s2Highlight('spec');
}
s2Root.querySelectorAll('[data-s2-legend]').forEach(button=>{
 button.disabled=false;button.addEventListener('click',()=>{
  const kind=button.dataset.s2Legend,index=Number(button.dataset.s2Index),previous=s2Selection[kind];
  if(previous?.index===index){s2Selection[kind]=null;s2Highlight(kind);return;}
  const key=kind==='fro'?'fro':previous?.key||'u';
  s2Select(key,index,previous?.sample??S2Data[key].steps.length-1);
 });
});
for(const key of ['fro','u','v']){
 const chart=s2Id('s2-'+key+'-chart'),kind=key==='fro'?'fro':'spec';
 function inspect(event){
  if(event.target.dataset?.s2Curve!==key)return;
  const index=Number(event.target.dataset.s2Index),previous=s2Selection[kind];
  let sample=previous?.sample??S2Data[key].steps.length-1;
  if(Number.isFinite(event.clientX)){
   const svg=chart.querySelector('svg'),rect=svg.getBoundingClientRect(),g=S2Charts.bounds(kind,s2ChartWidth(key));
   const px=(event.clientX-rect.left)/rect.width*g.w;
   sample=S2Charts.nearest(S2Data[key].steps,g.xmin+(px-g.left)/(g.right-g.left)*(g.xmax-g.xmin));
  }
  if(event.type==='keydown'||event.key){
   if(event.key==='Home')sample=0;
   else if(event.key==='End')sample=S2Data[key].steps.length-1;
   else if(event.key==='ArrowLeft')sample--;
   else if(event.key==='ArrowRight')sample++;
   else if(event.key!=='Enter'&&event.key!==' ')return;
   event.preventDefault();
  }
  s2Select(key,index,sample);
 }
 for(const type of ['pointermove','click','focusin','keydown'])chart.addEventListener(type,inspect);
}
s2RenderPlots();
let s2ResizeQueued=false;
window.addEventListener('resize',()=>{
 if(s2ResizeQueued)return;s2ResizeQueued=true;
 requestAnimationFrame(()=>{s2ResizeQueued=false;s2RenderPlots();});
});

})();