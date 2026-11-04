(()=>{
// Pure renderers: source observations only; no smoothing, resampling or normalization.
const S0Charts=(()=>{
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const rates=[.001,.003,.005,.01,.03],colors=['#2678AE','#C46D21','#328654','#BD4A47','#8864AF'];
  const color=lr=>colors[rates.indexOf(lr)]||'#4B626C';
  const methods=['MACRO-oobl','MACRO-iobl'],methodColors=['#287F84','#9A587F'];
  const n=x=>Number(x.toFixed(3));
  const layout=width=>({width:Math.max(240,width),height:254,left:43,right:Math.max(240,width)-17,top:22,bottom:199});
  function svgStart(g,title,id){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" data-width="${g.width}" data-left="${g.left}" data-right="${g.right}" role="group" aria-labelledby="${id}-svg-title"><title id="${id}-svg-title">${escape(title)}</title>`;}
  function label(x,y,value,extra=''){return `<text x="${n(x)}" y="${n(y)}" ${extra}>${escape(value)}</text>`;}
  function grid(g,ticks,y){return ticks.map(t=>`<line class="s0-grid-line" x1="${g.left}" x2="${g.right}" y1="${n(y(t))}" y2="${n(y(t))}"/>`+label(g.left-8,y(t)+4,Number(t.toFixed(3)),'text-anchor="end"')).join('');}
  const lossRows=data=>methods.flatMap((method,mi)=>data.validation.records.map((r,ri)=>({method,mi,ri,lr:r.learning_rate,loss:r[method],fro:r['MACRO-fro'],difference:r[method]-r['MACRO-fro']})));
  function lossReadout(p,text){return readout(text.panel_a.tooltip_labels,[p.lr,p.method,p.loss.toFixed(6),p.fro.toFixed(6),p.difference.toFixed(6)]);}
  function normReadout(series,point,text){return readout(text.panel_b.tooltip_labels,[series.method,series.learning_rate,point[0],point[1].toFixed(6)]);}
  function readout(labels,values){return '<dl>'+labels.map((name,i)=>`<div><dt>${escape(name)}</dt><dd>${escape(values[i])}</dd></div>`).join('')+'</dl>';}
  function lossPlot(data,text,width=365){
    const g=layout(width),x=lr=>g.left+Math.log(lr/.001)/Math.log(30)*(g.right-g.left),y=v=>g.bottom-(v+.002)/.052*(g.bottom-g.top);
    let svg=svgStart(g,text.panel_a.title,'s0-loss')+grid(g,[0,.01,.02,.03,.04,.05],y);
    svg+=`<line class="s0-baseline" x1="${g.left}" x2="${g.right}" y1="${n(y(0))}" y2="${n(y(0))}"/>`+label(g.right-3,y(0)-6,text.panel_a.baseline_label,'text-anchor="end" class="s0-baseline-label"');
    rates.forEach(lr=>{const xx=x(lr),narrow=g.width<330;svg+=label(xx,g.bottom+22,lr,narrow?`text-anchor="end" transform="rotate(-32 ${n(xx)} ${g.bottom+22})"`:'text-anchor="middle"');});
    svg+=label((g.left+g.right)/2,249,text.panel_a.x_label,'text-anchor="middle"');
    const rows=lossRows(data);
    methods.forEach((method,mi)=>{
      const selected=rows.filter(r=>r.method===method);
      svg+=`<path class="s0-loss-line" stroke="${methodColors[mi]}" ${mi?'stroke-dasharray="5 3"':''} d="${selected.map((p,i)=>(i?'L':'M')+n(x(p.lr))+','+n(y(p.difference))).join(' ')}"/>`;
      selected.forEach(p=>{
        const aria=text.panel_a.tooltip_labels.map((l,i)=>l+': '+[p.lr,p.method,p.loss.toFixed(6),p.fro.toFixed(6),p.difference.toFixed(6)][i]).join('; ');
        svg+=`<circle class="s0-loss-point" data-s0-point="${p.mi*5+p.ri}" cx="${n(x(p.lr))}" cy="${n(y(p.difference))}" r="5" fill="${methodColors[mi]}" tabindex="0" role="button" aria-label="${escape(aria)}"><title>${escape(aria)}</title></circle>`;
      });
    });
    return svg+'</svg>';
  }
  function rowBounds(data){
    const series=data.row_norm.series,values=series.flatMap(s=>s.points.filter(p=>p[1]!==null).map(p=>p[1])),steps=series.flatMap(s=>s.points.map(p=>p[0]));
    return {min:Math.floor(Math.min(...values)*10)/10,max:Math.ceil(Math.max(...values)*10)/10,end:Math.max(...steps)};
  }
  function normPlot(data,text,width=365,lr='all',active=-1){
    if(!data.row_norm.series.length)return `<p>${escape(text.panel_b.missing)}</p>`;
    const g=layout(width),bounds=rowBounds(data),x=t=>g.left+t/bounds.end*(g.right-g.left),y=v=>g.bottom-(v-bounds.min)/(bounds.max-bounds.min)*(g.bottom-g.top);
    const ticks=Array.from({length:5},(_,i)=>bounds.min+(bounds.max-bounds.min)*i/4);
    let svg=svgStart(g,text.panel_b.title,'s0-norm')+grid(g,ticks,y);
    [0,1000,2000,3000].filter(t=>t<=bounds.end).forEach(t=>{svg+=label(x(t),g.bottom+22,t,'text-anchor="middle"');});
    svg+=label((g.left+g.right)/2,249,text.panel_b.x_label,'text-anchor="middle"');
    data.row_norm.series.forEach((s,i)=>{
      if(lr!=='all'&&s.learning_rate!==Number(lr))return;
      let previous=false;
      const path=s.points.map(p=>{if(p[1]===null){previous=false;return '';}const command=previous?'L':'M';previous=true;return command+n(x(p[0]))+','+n(y(p[1]));}).join(' ');
      const aria=`${text.panel_b.tooltip_labels[0]}: ${s.method}; ${text.panel_b.lr_label}: ${s.learning_rate}`;
      svg+=`<path class="s0-norm-line" data-s0-curve="${i}" stroke="${color(s.learning_rate)}" stroke-width="${active===i?3:1.9}" opacity="${active===-1||active===i?1:.22}" ${s.method==='MACRO-iobl'?'stroke-dasharray="6 4"':''} d="${path}" tabindex="0" role="button" aria-label="${escape(aria)}"><title>${escape(aria)}</title></path>`;
    });
    return svg+'<circle id="s0-norm-marker" class="s0-active-point" r="4.5" visibility="hidden"/></svg>';
  }
  function closestPoint(series,step){return series.points.filter(p=>p[1]!==null).reduce((a,b)=>!a||Math.abs(b[0]-step)<Math.abs(a[0]-step)?b:a,null);}
  return {escape,rates,color,methodColors,layout,lossRows,lossPlot,normPlot,lossReadout,normReadout,rowBounds,closestPoint};
})();

const S0Data={{include:data/section0.json}};
const S0Content={{include:src/copy/section0.json}};
(()=>{
  const root=document.getElementById('section-0'),$=id=>root.querySelector(`[id="${id}"]`),all=q=>[...root.querySelectorAll(q)];
  let stage=0,lr='all',active=-1,activePoint=null;
  const stages=all('[data-s0-stage]'),lossRows=S0Charts.lossRows(S0Data);
  function renderStage(){
    const current=S0Content.stages[stage];
    $('s0-stage-formula').innerHTML=current.formula;
    $('s0-stage-explanation').innerHTML=current.explanation;
    $('s0-stage-definition').innerHTML=current.definition;
    $('s0-stage-definition').hidden=!current.definition;
    stages.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===stage)));
  }
  stages.forEach((button,i)=>{
    button.addEventListener('click',()=>{stage=i;renderStage();});
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();stage=event.key==='Home'?0:event.key==='End'?4:(i+(event.key==='ArrowRight'?1:4))%5;
      renderStage();stages[stage].focus();
    });
  });
  function lossSelection(event){
    const index=event.target.dataset?.s0Point;
    if(index===undefined)return;
    $('s0-loss-readout').innerHTML=S0Charts.lossReadout(lossRows[Number(index)],S0Content);
    all('[data-s0-point]').forEach(p=>p.classList.toggle('s0-selected',p.dataset.s0Point===index));
  }
  for(const type of ['pointerover','click','focusin'])$('s0-loss-chart').addEventListener(type,lossSelection);
  $('s0-loss-chart').addEventListener('keydown',event=>{
    if(['Enter',' '].includes(event.key)){event.preventDefault();lossSelection(event);}
  });
  function highlight(){
    all('[data-s0-curve]').forEach(p=>{
      const selected=Number(p.dataset.s0Curve)===active;
      p.setAttribute('opacity',active===-1||selected?'1':'.22');
      p.setAttribute('stroke-width',selected?'3':'1.9');
    });
    const marker=$('s0-norm-marker');
    if(!marker)return;
    marker.setAttribute('visibility',activePoint?'visible':'hidden');
    if(activePoint){
      const width=$('s0-norm-chart').clientWidth||365,g=S0Charts.layout(width),b=S0Charts.rowBounds(S0Data);
      marker.setAttribute('cx',g.left+activePoint[0]/b.end*(g.right-g.left));
      marker.setAttribute('cy',g.bottom-(activePoint[1]-b.min)/(b.max-b.min)*(g.bottom-g.top));
      marker.setAttribute('fill',S0Charts.color(S0Data.row_norm.series[active].learning_rate));
    }
  }
  function selectCurve(index,step){
    active=index;
    const series=S0Data.row_norm.series[index];
    activePoint=S0Charts.closestPoint(series,step);
    $('s0-norm-readout').innerHTML=S0Charts.normReadout(series,activePoint,S0Content);
    highlight();
  }
  function normPointer(event){
    const index=event.target.dataset?.s0Curve;
    if(index===undefined)return;
    let step=0;
    if(Number.isFinite(event.clientX)){
      const svg=$('s0-norm-chart').querySelector('svg'),bounds=svg.getBoundingClientRect();
      const x=(event.clientX-bounds.left)/bounds.width*Number(svg.dataset.width);
      step=(x-Number(svg.dataset.left))/(Number(svg.dataset.right)-Number(svg.dataset.left))*S0Charts.rowBounds(S0Data).end;
    }
    selectCurve(Number(index),step);
  }
  for(const type of ['pointermove','click','focusin'])$('s0-norm-chart').addEventListener(type,normPointer);
  $('s0-norm-chart').addEventListener('keydown',event=>{
    const index=event.target.dataset?.s0Curve;
    if(index===undefined||!['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key))return;
    event.preventDefault();
    const points=S0Data.row_norm.series[Number(index)].points.filter(p=>p[1]!==null);
    const previous=active===Number(index)&&activePoint?points.findIndex(p=>p[0]===activePoint[0]):0;
    const next=event.key==='Home'?0:event.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,previous+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0)));
    selectCurve(Number(index),points[next][0]);
  });
  function renderPlots(){
    // Do not measure a hidden disclosure; static SVG remains usable without JS.
    if(!$('s0-oblique-details').open)return;
    $('s0-loss-chart').innerHTML=S0Charts.lossPlot(S0Data,S0Content,$('s0-loss-chart').clientWidth||365);
    $('s0-norm-chart').innerHTML=S0Charts.normPlot(S0Data,S0Content,$('s0-norm-chart').clientWidth||365,lr,active);
    highlight();
  }
  $('s0-lr').addEventListener('change',event=>{
    lr=event.target.value;active=-1;activePoint=null;
    $('s0-norm-readout').textContent='';
    all('[data-s0-lr-key]').forEach(key=>key.hidden=lr!=='all'&&Number(key.dataset.s0LrKey)!==Number(lr));
    renderPlots();
  });
  $('s0-oblique-details').addEventListener('toggle',()=>requestAnimationFrame(renderPlots));
  window.addEventListener('resize',()=>requestAnimationFrame(renderPlots));
  if(typeof ResizeObserver!=='undefined'){
    let previous=0;
    new ResizeObserver(entries=>{const width=Math.round(entries[0].contentRect.width);if(width!==previous){previous=width;renderPlots();}}).observe($('s0-oblique-panels'));
  }
  all('button:disabled,input:disabled,select:disabled').forEach(el=>el.disabled=false);
  renderStage();renderPlots();
})();

})();