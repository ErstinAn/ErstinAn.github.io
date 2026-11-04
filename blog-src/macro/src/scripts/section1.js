(()=>{
// Render only measured points. Null values break a line; no synthetic outcomes.
const S1Charts=(()=>{
  const colors={'Muon':'#364854','MACRO-fro':'#007D85','MACRO-spec':'#885277'};
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const format=(template,values)=>template.replace(/\{(\w+)\}/g,(_,key)=>String(values[key]));
  const round=x=>Number(x.toFixed(4));
  const dimensions=(width,height=228)=>({width:Math.max(240,width),height,left:49,right:Math.max(240,width)-18,top:32,bottom:height-52});
  const scale=(value,min,max,start,end,log=false)=>start+(log?Math.log(value/min)/Math.log(max/min):(value-min)/(max-min))*(end-start);
  function text(x,y,value,extra=''){return `<text x="${round(x)}" y="${round(y)}" ${extra}>${escape(value)}</text>`;}
  function geometry(kind,model,width){
    const g=dimensions(width);
    if(kind==='ablation')return {...g,xmin:.005,xmax:.03,ymin:2.72,ymax:2.93,xticks:[.005,.007,.01,.03],yticks:[2.75,2.8,2.85,2.9]};
    return {...g,xmin:.5,xmax:5,ymin:model==='240M'?20.4:15.25,ymax:model==='240M'?21.15:15.46,xticks:[.5,1,2,5],yticks:model==='240M'?[20.4,20.6,20.8,21]:[15.25,15.3,15.35,15.4,15.45]};
  }
  function points(data,kind,model='240M'){
    const source=data[kind],xs=kind==='ablation'?source.learning_rates:source.radius_multipliers;
    return source.series.filter(s=>kind==='ablation'||s.model===model).flatMap((s,si)=>s.values.map((value,xi)=>({method:s.method,model:s.model,learning_rate:s.learning_rate,si,xi,x:xs[xi],value,status:s.status?.[xi]||'finite'})));
  }
  function readout(point,kind,copy){
    if(kind==='ablation')return point.status==='diverged'?copy.ablation.diverged_readout:format(copy.ablation.readout,{method:point.method,learning_rate:point.x,loss:point.value.toFixed(3)});
    return format(copy.radius.readout,{model:point.model,method:point.method,radius:point.x,ppl:point.value.toFixed(3)});
  }
  function legend(data,kind,model,copy){
    const series=data[kind].series.filter(s=>kind==='ablation'||s.model===model);
    return series.map(s=>`<span><i style="border-color:${colors[s.method]}"${s.method==='MACRO-spec'?' class="s1-dashed"':''}></i>${escape(kind==='radius'?format(copy.radius.legend,{method:s.method,learning_rate:s.learning_rate}):s.method)}</span>`).join('');
  }
  function plot(data,kind,model,copy,width=780){
    const g=geometry(kind,model,width),id='s1-'+kind,p=points(data,kind,model),t=copy[kind];
    const x=v=>scale(v,g.xmin,g.xmax,g.left,g.right,true),y=v=>scale(v,g.ymin,g.ymax,g.bottom,g.top);
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" role="group" aria-labelledby="${id}-svg-title" data-width="${g.width}"><title id="${id}-svg-title">${escape(t.alt)}</title>`;
    g.yticks.forEach(v=>{svg+=`<line class="s1-grid" x1="${g.left}" x2="${g.right}" y1="${round(y(v))}" y2="${round(y(v))}"/>`+text(g.left-8,y(v)+4,v.toFixed(kind==='radius'?2:2),'text-anchor="end"');});
    g.xticks.forEach(v=>{const xx=x(v),narrow=g.width<370;svg+=text(xx,g.bottom+21,String(v),narrow?`text-anchor="end" transform="rotate(-30 ${round(xx)} ${g.bottom+21})"`:'text-anchor="middle"');});
    svg+=text((g.left+g.right)/2,g.height-2,t.x_axis,'text-anchor="middle"');
    const seriesCount=kind==='ablation'?3:2;
    for(let si=0;si<seriesCount;si++){
      const row=p.filter(q=>q.si===si&&q.x>=g.xmin);let previous=false;
      const d=row.map(q=>{if(q.value===null){previous=false;return '';}const command=previous?'L':'M';previous=true;return command+round(x(q.x))+','+round(y(q.value));}).join(' ');
      svg+=`<path class="s1-line" stroke="${colors[row[0].method]}" ${row[0].method==='MACRO-spec'?'stroke-dasharray="5 3"':''} d="${d}"/>`;
    }
    p.forEach((q,index)=>{
      if(q.value===null||q.x<g.xmin)return;
      const label=readout(q,kind,copy);
      svg+=`<circle class="s1-point" data-s1-point="${index}" data-s1-plot="${kind}" cx="${round(x(q.x))}" cy="${round(y(q.value))}" r="4.5" fill="${colors[q.method]}" tabindex="0" role="button" aria-label="${escape(label)}"><title>${escape(label)}</title></circle>`;
    });
    // The dashed upward arrow is a qualitative outcome annotation. Its endpoint
    // is outside the loss domain, not an invented loss value at LR 0.03.
    if(kind==='ablation'){
      const last=p.filter(q=>q.method==='Muon'&&q.value!==null).at(-1);
      const sx=x(last.x),sy=y(last.value),ex=x(.03),ey=22;
      const length=Math.hypot(ex-sx,ey-sy),ux=(ex-sx)/length,uy=(ey-sy)/length;
      const left=[ex-ux*7-uy*3.5,ey-uy*7+ux*3.5],right=[ex-ux*7+uy*3.5,ey-uy*7-ux*3.5];
      svg+=`<g class="s1-diverged" data-s1-diverged="true" tabindex="0" role="button" aria-label="${escape(t.diverged_readout)}"><title>${escape(t.diverged_readout)}</title><path class="s1-divergence-arrow" data-s1-diverged="true" d="M${round(sx)},${round(sy)} L${round(ex)},${ey}"/><path class="s1-divergence-head" data-s1-diverged="true" d="M${round(left[0])},${round(left[1])} L${round(ex)},${ey} L${round(right[0])},${round(right[1])}"/><path class="s1-nan-cross" data-s1-diverged="true" d="M${round(ex-5)},11 L${round(ex+5)},21 M${round(ex+5)},11 L${round(ex-5)},21"/>${text(ex-12,20,t.diverged,'text-anchor="end" data-s1-diverged="true"')}</g>`;
    }
    return svg+'</svg>';
  }
  const radiusColors={'0.1':'#D93236','0.5':'#DC7D22','1':'#2E8A45','2':'#2679B7','5':'#8D61B4'};
  function gammaSeries(data,method){return data.gamma.series.map((s,index)=>({...s,index})).filter(s=>s.method===method);}
  function gammaGeometry(data,width){
    const g=dimensions(width,300),steps=data.gamma.series.flatMap(s=>s.points.map(p=>p.step));
    return {...g,top:18,bottom:248,xmin:Math.min(...steps),xmax:Math.max(...steps),ymin:10,ymax:400,yticks:[10,20,50,100,200,400],xticks:[0,1000,2000,3000]};
  }
  function gammaReadout(series,point,copy){return format(copy.gamma.readout,{step:point.step,radius:series.radius_setting,norm:point.value.toFixed(3)});}
  function gammaNearest(series,step){return series.points.filter(p=>p.value!==null).reduce((a,b)=>!a||Math.abs(b.step-step)<Math.abs(a.step-step)?b:a,null);}
  function gammaPlot(data,method,copy,width=780,highlight=null){
    const g=gammaGeometry(data,width),x=v=>scale(v,g.xmin,g.xmax,g.left,g.right),y=v=>scale(v,g.ymin,g.ymax,g.bottom,g.top,true);
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" data-width="${g.width}" data-left="${g.left}" data-right="${g.right}" role="group" aria-labelledby="s1-gamma-svg-title"><title id="s1-gamma-svg-title">${escape(copy.gamma.alt)}</title>`;
    g.yticks.forEach(v=>{svg+=`<line class="s1-grid" x1="${g.left}" x2="${g.right}" y1="${round(y(v))}" y2="${round(y(v))}"/>`+text(g.left-8,y(v)+4,v,'text-anchor="end"');});
    g.xticks.filter(v=>v>=g.xmin&&v<=g.xmax).forEach(v=>{svg+=text(x(v),g.bottom+22,v,'text-anchor="middle"');});
    svg+=text((g.left+g.right)/2,g.height-2,copy.gamma.x_axis,'text-anchor="middle"');
    gammaSeries(data,method).forEach(s=>{
      let previous=false;
      const d=s.points.map(p=>{if(p.value===null){previous=false;return '';}const command=previous?'L':'M';previous=true;return command+round(x(p.step))+','+round(y(p.value));}).join(' ');
      const label=s.method+' · '+copy.gamma.legend_title+' '+s.radius_setting;
      svg+=`<g data-s1-gamma-key="${s.index}" opacity="${highlight===null||highlight===s.radius_setting?1:.2}"><path class="s1-gamma-line" stroke="${radiusColors[s.radius_setting]}" d="${d}"/><path class="s1-gamma-hit" data-s1-gamma-curve="${s.index}" d="${d}" tabindex="0" role="button" aria-label="${escape(label)}"><title>${escape(label)}</title></path>`;
      s.points.forEach((p,i)=>{if(p.value===null)return;svg+=`<circle class="s1-gamma-point" data-s1-gamma-curve="${s.index}" data-s1-gamma-sample="${i}" cx="${round(x(p.step))}" cy="${round(y(p.value))}" r="2.7" fill="${radiusColors[s.radius_setting]}" aria-label="${escape(gammaReadout(s,p,copy))}"><title>${escape(gammaReadout(s,p,copy))}</title></circle>`;});
      svg+='</g>';
    });
    return svg+`<line id="s1-gamma-cursor" class="s1-gamma-cursor" y1="${g.top}" y2="${g.bottom}" visibility="hidden"/><circle id="s1-gamma-marker" class="s1-gamma-marker" r="5" visibility="hidden"/></svg>`;
  }
  function gammaLegend(data,copy){return [...new Set(data.gamma.series.map(s=>s.radius_setting))].sort((a,b)=>a-b).map(r=>`<button id="s1-gamma-radius-${String(r).replace('.','-')}" disabled data-s1-gamma-radius="${r}" aria-pressed="false"><i style="border-color:${radiusColors[r]}"></i>${r}</button>`).join('');}
  return {colors,escape,format,dimensions,geometry,scale,points,readout,legend,plot,radiusColors,gammaSeries,gammaGeometry,gammaReadout,gammaNearest,gammaPlot,gammaLegend};
})();

const S1Data={{include:data/section1.json}};
const S1Copy={{include:src/copy/section1.json}};
(()=>{
  const root=document.getElementById('section-1'),$=id=>root.querySelector(`[id="${id}"]`),all=s=>[...root.querySelectorAll(s)];
  let model='240M';
  const active={ablation:null,radius:null};
  const gamma={method:'MACRO-fro',radius:null,step:null,index:null};
  function select(kind,event){
    const target=event.target,data=target.dataset||{};
    if(kind==='ablation'&&data.s1Diverged!==undefined){
      active.ablation='diverged';$('s1-ablation-readout').textContent=S1Copy.ablation.diverged_readout;
    }else if(data.s1Point!==undefined){
      active[kind]=Number(data.s1Point);
      const point=S1Charts.points(S1Data,kind,model)[active[kind]];
      if(point.value===null)return;
      $('s1-'+kind+'-readout').textContent=S1Charts.readout(point,kind,S1Copy);
    }else return;
    mark(kind);
  }
  function mark(kind){
    all('[data-s1-point]').filter(el=>el.dataset.s1Plot===kind).forEach(el=>el.classList.toggle('s1-selected',Number(el.dataset.s1Point)===active[kind]));
  }
  function render(kind){
    $('s1-'+kind+'-chart').innerHTML=S1Charts.plot(S1Data,kind,model,S1Copy,$('s1-'+kind+'-chart').clientWidth||780);
    if(kind==='radius')$('s1-radius-legend').innerHTML=S1Charts.legend(S1Data,kind,model,S1Copy);
    mark(kind);
  }
  for(const kind of ['ablation','radius']){
    const chart=$('s1-'+kind+'-chart');
    for(const type of ['pointerover','click','focusin'])chart.addEventListener(type,event=>select(kind,event));
    chart.addEventListener('keydown',event=>{
      if(['Enter',' '].includes(event.key)){event.preventDefault();select(kind,event);}
    });
  }
  all('[data-s1-model]').forEach(button=>button.addEventListener('click',()=>{
    model=button.dataset.s1Model;
    all('[data-s1-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s1Model===model)));
    active.radius=null;$('s1-radius-readout').textContent='';render('radius');
  }));
  function markGamma(){
    all('[data-s1-gamma-key]').forEach(el=>{
      const series=S1Data.gamma.series[Number(el.dataset.s1GammaKey)];
      el.setAttribute('opacity',gamma.radius===null||series.radius_setting===gamma.radius?'1':'.2');
    });
    all('[data-s1-gamma-radius]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.s1GammaRadius)===gamma.radius)));
    const cursor=$('s1-gamma-cursor'),marker=$('s1-gamma-marker');
    const show=gamma.index!==null&&gamma.step!==null;
    cursor.setAttribute('visibility',show?'visible':'hidden');marker.setAttribute('visibility',show?'visible':'hidden');
    if(show){
      const series=S1Data.gamma.series[gamma.index],point=S1Charts.gammaNearest(series,gamma.step);
      const g=S1Charts.gammaGeometry(S1Data,$('s1-gamma-chart').clientWidth||780);
      const x=S1Charts.scale(point.step,g.xmin,g.xmax,g.left,g.right),y=S1Charts.scale(point.value,g.ymin,g.ymax,g.bottom,g.top,true);
      cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);marker.setAttribute('cx',x);marker.setAttribute('cy',y);marker.setAttribute('fill',S1Charts.radiusColors[series.radius_setting]);
      $('s1-gamma-readout').textContent=S1Charts.gammaReadout(series,point,S1Copy);
    }
  }
  function selectGamma(index,step){
    const series=S1Data.gamma.series[index],point=S1Charts.gammaNearest(series,step);
    gamma.index=index;gamma.radius=series.radius_setting;gamma.step=point.step;markGamma();
  }
  function gammaPointer(event){
    const data=event.target.dataset||{};
    if(data.s1GammaCurve===undefined)return;
    const index=Number(data.s1GammaCurve),series=S1Data.gamma.series[index];
    let step=gamma.step??series.points[0].step;
    if(data.s1GammaSample!==undefined)step=series.points[Number(data.s1GammaSample)].step;
    else if(Number.isFinite(event.clientX)){
      const svg=$('s1-gamma-chart').querySelector('svg'),bounds=svg.getBoundingClientRect();
      const x=(event.clientX-bounds.left)/bounds.width*Number(svg.dataset.width),g=S1Charts.gammaGeometry(S1Data,Number(svg.dataset.width));
      step=S1Charts.scale(x,g.left,g.right,g.xmin,g.xmax);
    }
    selectGamma(index,step);
  }
  for(const type of ['pointermove','click','focusin'])$('s1-gamma-chart').addEventListener(type,gammaPointer);
  $('s1-gamma-chart').addEventListener('keydown',event=>{
    const index=event.target.dataset?.s1GammaCurve;
    if(index===undefined||!['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key))return;
    event.preventDefault();
    const series=S1Data.gamma.series[Number(index)],points=series.points.filter(p=>p.value!==null);
    const old=gamma.index===Number(index)?points.findIndex(p=>p.step===gamma.step):0;
    const next=event.key==='Home'?0:event.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,old+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0)));
    selectGamma(Number(index),points[next].step);
  });
  function renderGamma(){
    $('s1-gamma-chart').innerHTML=S1Charts.gammaPlot(S1Data,gamma.method,S1Copy,$('s1-gamma-chart').clientWidth||780,gamma.radius);
    markGamma();
  }
  all('[data-s1-gamma-method]').forEach(button=>button.addEventListener('click',()=>{
    gamma.method=button.dataset.s1GammaMethod;
    all('[data-s1-gamma-method]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s1GammaMethod===gamma.method)));
    gamma.index=gamma.radius===null?null:S1Charts.gammaSeries(S1Data,gamma.method).find(s=>s.radius_setting===gamma.radius).index;
    renderGamma();
  }));
  all('[data-s1-gamma-radius]').forEach(button=>button.addEventListener('click',()=>{
    const radius=Number(button.dataset.s1GammaRadius);
    if(radius===gamma.radius){gamma.radius=null;gamma.index=null;gamma.step=null;$('s1-gamma-readout').textContent='';markGamma();return;}
    const series=S1Charts.gammaSeries(S1Data,gamma.method).find(s=>s.radius_setting===radius);
    selectGamma(series.index,gamma.step??series.points.at(-1).step);
  }));
  all('button:disabled,input:disabled,select:disabled').forEach(el=>el.disabled=false);
  function resize(){renderGamma();render('ablation');render('radius');}
  window.addEventListener('resize',()=>requestAnimationFrame(resize));
  if(typeof ResizeObserver!=='undefined'){
    let previous=0;new ResizeObserver(entries=>{
      const width=Math.round(entries[0].contentRect.width);
      if(width!==previous){previous=width;resize();}
    }).observe(root);
  }
  resize();
})();

})();