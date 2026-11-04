(()=>{
/* Pure numerical routines, shared verbatim by the page and Node tests.
   Teaching scope: positive normal candidates in [0.25, 4], binary64 addition.
   No intermediate float32 conversion and no decimal rounding quantizer. */
const BF16 = (() => {
  const decode = code => (1 + (code & 127) / 128) * 2 ** ((code >> 7) - 127);
  function bracket(x) {
    if (!Number.isFinite(x) || x < 0.25 || x > 4) throw new RangeError('Candidate outside [0.25, 4]');
    let a = 128, b = 0x7f7f;
    while (a <= b) {
      const c = (a + b) >> 1;
      if (decode(c) <= x) a = c + 1; else b = c - 1;
    }
    return {code: b, lower: decode(b), upper: decode(b + 1)};
  }
  function quantize(x) {
    const {code, lower, upper} = bracket(x);
    const midpoint = (lower + upper) / 2;
    return x < midpoint ? lower : x > midpoint ? upper : (code % 2 === 0 ? lower : upper);
  }
  function neighbors(w) {
    const {code, lower} = bracket(w);
    if (lower !== w) throw new RangeError('Weight must be representable in BF16');
    return {previous: decode(code - 1), current: w, next: decode(code + 1), code,
      leftGap: w - decode(code - 1), rightGap: decode(code + 1) - w};
  }
  function update(w, delta) {
    const candidate = w + delta, stored = quantize(candidate);
    return {w, delta, candidate, stored, realized: stored - w, ratio: Math.abs(delta / w)};
  }
  function gaussian(rhoOverTau) {
    if (rhoOverTau === null || rhoOverTau === undefined || !Number.isFinite(rhoOverTau) || rhoOverTau < 0) return null;
    if (rhoOverTau === 0) return {pDrop:1,retained:0};
    return {pDrop: 2 / Math.PI * Math.atan2(1,rhoOverTau), retained: rhoOverTau / Math.hypot(rhoOverTau,1)};
  }
  return {decode, bracket, quantize, neighbors, update, gaussian};
})();
if (typeof module !== 'undefined') module.exports = BF16;

const fmt = n => n===null||n===undefined?'Not available':Number(n.toFixed(8)).toString();
const sign = n => n===null||n===undefined?'Not available':(n>0?'+':'')+fmt(n);
const short = n => Math.abs(n)>=1000?(n/1000).toFixed(n%1000?1:0)+'k':Math.abs(n)>0&&Math.abs(n)<.01?n.toExponential(1):Number(n.toFixed(3)).toString();
const colors={'Muon':'#364854','MACRO-fro':'#007D85','MACRO-spec':'#885277'};
const escapeHTML=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const ChartModel = (()=>{
  function startStep(data,state){if(state.timeline!=='common-norm'||state.view==='validation')return 1;const rec=data.models[state.model].methods.Muon;return rec.matrices[rec.default_matrix].norm.find(row=>row[1]>0&&row[2]>0)[0];}
  function initial(data){const model='240M',end=data.models[model].total_steps,state={model,view:'weight',timeline:'common-norm',matrix:data.models[model].methods.Muon.default_matrix,methods:['Muon'],step:end,window:'full',locked:false,modelMetric:'retained',gapScale:'all'};state.domain=[startStep(data,state),end];return state;}
  function macroInitial(data){const s=initial(data);return {...s,view:'ratio',timeline:'all',domain:[4700,9000],step:9000,window:'custom',methods:['MACRO-fro','MACRO-spec'],gapScale:'visible',lossScale:'symlog'};}
  function windowRange(data,state,name){const T=data.models[state.model].total_steps,start=startStep(data,state);return name==='early'?[start,Math.ceil(T*.1)]:name==='late'?[Math.ceil(T*.8),T]:[start,T];}
  function selectView(state,view){state.view=view;state.gapScale='all';}
  function nearest(rows,step){let a=0,b=rows.length-1;while(a<b){const mid=(a+b)>>1;if(rows[mid][0]<step)a=mid+1;else b=mid;}if(a>0&&Math.abs(rows[a-1][0]-step)<=Math.abs(rows[a][0]-step))a--;return rows[a];}
  function selectStep(data,state,step){const [a,b]=state.domain;let t=Math.max(a,Math.min(b,Math.round(step)));if(state.view==='validation'){const rows=data.models[state.model].methods.Muon.validation.filter(r=>r[0]>=a&&r[0]<=b);if(rows.length)t=nearest(rows,t)[0];}state.step=t;return t;}
  function matrix(data,state){const m=data.models[state.model].methods.Muon;return m.matrices?.[state.matrix]??null;}
  function ratioRows(data,state,method){const rec=data.models[state.model].methods[method];return method==='Muon'?matrix(data,state)?.ratio??null:rec.ratio;}
  function read(data,state,method){const m=data.models[state.model].methods[method];if(state.view==='validation'){const row=nearest(m.validation,state.step);return {time:row[0],fp32:row[2],bf16:row[3],gap:row[4],ratio:null,retained:null,pDrop:null,weightFP32:null,weightBF16:null,update:null};}const r=m.training?.[state.step-1],rows=ratioRows(data,state,method),q=method==='Muon'?rows?.find(row=>row[0]===state.step):rows?.[state.step-1],n=method==='Muon'?matrix(data,state)?.norm.find(row=>row[0]===state.step):null;return {time:state.step,fp32:r?.[1]??null,bf16:r?.[2]??null,gap:r?.[3]??null,ratio:q?.[2]??null,retained:q?.[4]??null,pDrop:q?.[3]??null,weightFP32:n?.[1]??null,weightBF16:n?.[2]??null,update:q?.[5]??null,effectiveLR:q?.[6]??null,lr:m.lr_logged?.[state.step-1]?.[1]??q?.[1]??null};}
  function series(data,state,type){const out=[];for(const method of state.methods){const m=data.models[state.model].methods[method],ratios=ratioRows(data,state,method);if(type==='upper'&&state.view==='validation'){for(const [i,precision] of [[2,'FP32'],[3,'BF16']])out.push({label:method+' '+precision,method,dash:precision==='FP32'?'5 4':'',points:m.validation.map(r=>[r[0],r[i]])});}else if(type==='upper'&&state.view==='weight'){if(method==='Muon'&&matrix(data,state))for(const [i,precision] of [[1,'FP32'],[2,'BF16']])out.push({label:method+' · '+precision,method,dash:precision==='FP32'?'5 4':'',points:matrix(data,state).norm.map(r=>[r[0],r[i]])});}else if(type==='upper'){if(ratios)out.push({label:method==='Muon'?'Muon · estimated ρ':'MACRO-fro · ρ = η',method,dash:'6 3',points:ratios.map(r=>[r[0],r[2]])});}else if(type==='model'){if(ratios)out.push({label:method+' · model estimate',method,dash:'6 3',points:ratios.map(r=>[r[0],r[state.modelMetric==='retained'?4:3]])});}else{const rows=state.view==='validation'?m.validation:m.training;if(rows)out.push({label:method+' · '+(state.view==='validation'?'ΔLval':'ΔLtrain'),method,dash:'',points:rows.map(r=>[r[0],r[state.view==='validation'?4:3]])});}}return out;}
  function segments(points){const all=[];let seg=[];for(const p of points){if(p[1]===null||!Number.isFinite(p[1])){if(seg.length)all.push(seg);seg=[];}else seg.push(p);}if(seg.length)all.push(seg);return all;}
  function thin(points,budget=600){if(points.length<=budget)return points;const bucket=Math.ceil(points.length/Math.max(1,Math.floor(budget/4))),indices=new Set([0,points.length-1]);for(let a=0;a<points.length;a+=bucket){let min=a,max=a;const end=Math.min(points.length,a+bucket);for(let i=a;i<end;i++){if(points[i][1]<points[min][1])min=i;if(points[i][1]>points[max][1])max=i;}for(const i of [a,min,max,end-1])indices.add(i);}return [...indices].sort((a,b)=>a-b).map(i=>points[i]);}
  function muonDirection(m,n,eta){if(!(m>0&&n>0&&Number.isFinite(eta)))return null;const d=Math.min(m,n),scale=Math.sqrt(Math.max(1,m/n));return {directionF:Math.sqrt(d),directionRMS:1/Math.sqrt(Math.max(m,n)),effectiveLR:eta*scale,updateF:eta*scale*Math.sqrt(d),updateRMS:eta*scale/Math.sqrt(Math.max(m,n))};}
  function lrAt(step,rec){const current=step-1,decay=rec.total_steps-rec.warmup_steps;let factor;if(current<rec.warmup_steps)factor=(current+1)/rec.warmup_steps;else if(current<rec.warmup_steps+1)factor=1;else factor=rec.min_lr_factor+(1-rec.min_lr_factor)*.5*(1+Math.cos(Math.PI*(current-rec.warmup_steps)/decay));return rec.peak_lr*factor;}
  function setRange(data,state,a,b){const total=data.models[state.model].total_steps;if(!Number.isInteger(a)||!Number.isInteger(b)||a<startStep(data,state)||b>total||a>=b)return false;if(state.view==='validation'&&data.models[state.model].methods.Muon.validation.filter(r=>r[0]>=a&&r[0]<=b).length<2)return false;state.domain=[a,b];state.window='custom';selectStep(data,state,state.step);return true;}
  return {initial,macroInitial,startStep,windowRange,selectView,nearest,selectStep,read,series,matrix,ratioRows,segments,thin,muonDirection,lrAt,setRange};
})();
// Axis transforms affect display coordinates only. Source gaps retain their sign and precision.
const Axis = (()=>{
  const linearThreshold=.001;
  function symlog(v){const a=Math.abs(v)/linearThreshold;return Math.sign(v)*(a<=1?a:1+Math.log10(a));}
  function oneSignificant(v){return Number(v.toPrecision(1));}
  function normTicks(min,max){return [...new Set(Array.from({length:5},(_,i)=>oneSignificant(min+(max-min)*i/4)))].filter(v=>v>=min&&v<=max);}
  function symlogTicks(min,max){
    const extent=Math.max(Math.abs(min),Math.abs(max)),ticks=[0];
    if(extent<linearThreshold)return Array.from({length:5},(_,i)=>min+(max-min)*i/4);
    for(let power=-3;power<=Math.ceil(Math.log10(extent));power++)for(const sign of [-1,1]){const v=sign*10**power;if(v>=min&&v<=max)ticks.push(v);}
    return ticks.sort((a,b)=>a-b);
  }
  function normLabel(v){const a=Math.abs(v);return a>=1e6||a>0&&a<.01?v.toExponential(0):a>=1000?(v/1000)+'k':String(v);}
  function logLabel(v){return v!==0&&Math.abs(v)<.001?v.toExponential(0):Number(v.toPrecision(3)).toString();}
  return {linearThreshold,symlog,normTicks,symlogTicks,normLabel,logLabel};
})();
const Draw = (()=>{
  const text=(x,y,t,a='')=>`<text x="${x}" y="${y}" ${a}>${escapeHTML(t)}</text>`;
  const line=(x1,y1,x2,y2,a='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${a}/>`;
  function plot(data,state,type,width=780){
    const W=Math.max(280,width),H=210,L=49,R=W-17,T=15,B=172,rows=ChartModel.series(data,state,type),[a,b]=state.domain,x=s=>L+(s-a)/(b-a||1)*(R-L);
    const full=rows.flatMap(r=>r.points.filter(p=>p[0]>=ChartModel.startStep(data,state)&&p[1]!==null&&Number.isFinite(p[1])).map(p=>p[1]));
    const visible=rows.flatMap(r=>r.points.filter(p=>p[0]>=a&&p[0]<=b&&p[1]!==null&&Number.isFinite(p[1])).map(p=>p[1]));
    const values=type==='gap'&&state.gapScale==='all'?full:visible;
    if(type==='upper'&&state.view==='ratio'&&rows.length)values.push(data.tau);
    let ymin=Math.min(0,...values),ymax=Math.max(0,...values);
    if(type==='model'){ymin=0;ymax=1;}else {const p=(ymax-ymin||1)*.07;ymax+=p;if(ymin<0)ymin-=p;}
    const logGap=type==='gap'&&state.lossScale==='symlog',weight=type==='upper'&&state.view==='weight';
    const transform=logGap?Axis.symlog:v=>v,lo=transform(ymin),hi=transform(ymax),y=v=>B-(transform(v)-lo)/(hi-lo||1)*(B-T);
    const ticks=logGap?Axis.symlogTicks(ymin,ymax):weight?Axis.normTicks(ymin,ymax):Array.from({length:5},(_,i)=>ymin+(ymax-ymin)*i/4);
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(rows.map(r=>r.label).join('; '))}. Selected step ${state.step}.${logGap?' Symmetric log scale; linear within plus or minus 0.001.':''}" data-left="${L}" data-right="${R}" data-width="${W}">`;
    for(const v of ticks){const yy=y(v);svg+=line(L,yy,R,yy,`stroke="${Math.abs(v)<1e-12?'#A0A8AA':'#DDE1DC'}"`)+text(L-8,yy+4,type==='model'?(v*100).toFixed(0)+'%':weight?Axis.normLabel(v):logGap?Axis.logLabel(v):short(v),'text-anchor="end" class="tick"');}
    if(ymin<0)svg+=line(L,y(0),R,y(0),'stroke="#7A868B" stroke-dasharray="3 3"');
    const count=W<440?3:4;
    for(let i=0;i<=count;i++){const t=Math.round(a+(b-a)*i/count),xx=x(t);svg+=line(xx,T,xx,B,'stroke="#E2E5E0"')+text(xx,194,short(t),'text-anchor="middle" class="tick"');}
    if(type==='upper'&&state.view==='ratio'&&rows.length)svg+=line(L,y(data.tau),R,y(data.tau),'stroke="#A88148" stroke-dasharray="2 5"')+text(R-2,y(data.tau)-5,'BF16 reference τ','text-anchor="end" class="reference-label"');
    if(!rows.length)svg+=text((L+R)/2,85,type==='upper'&&state.view==='ratio'?'No ratio estimate for this selection.':'No weight-norm data for this selection.','text-anchor="middle" class="tick"');
    for(const row of rows){const points=row.points.filter(p=>p[0]>=a&&p[0]<=b);for(const seg of ChartModel.segments(points)){const samples=ChartModel.thin(seg,Math.ceil((R-L)*1.3));svg+=`<path d="${samples.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(2)+','+y(p[1]).toFixed(2)).join(' ')}" fill="none" stroke="${colors[row.method]}" stroke-width="1.7" ${row.dash?`stroke-dasharray="${row.dash}"`:''}/>`;}}
    svg+=line(x(state.step),T,x(state.step),B,'stroke="#202A33" stroke-width="1" stroke-dasharray="3 3" class="cursor"');
    for(const row of rows){const p=ChartModel.nearest(row.points,state.step);if(p[0]===state.step&&p[1]!==null)svg+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3.5" fill="${colors[row.method]}" stroke="#F8F7F4" stroke-width="1.3"/>`;}
    return svg+text(R,H-1,'Training step','text-anchor="end" class="tick"')+'</svg>';
  }
  function scalar(w,delta,width=780){
    const W=Math.max(280,width),L=24,R=W-24,H=180,s=BF16.update(w,delta),n=BF16.neighbors(w),u=n.rightGap;
    // Both modes use a local absolute axis; changing weight also updates the printed ULP.
    const span=Math.max(u*2.25,Math.abs(delta)*1.2),x=v=>L+(v-(w-span))/(2*span)*(R-L),xl=x(w-n.leftGap/2),xr=x(w+n.rightGap/2);
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Current weight ${w}; proposed value ${fmt(s.candidate)}; stored weight ${fmt(s.stored)}; actual change ${sign(s.realized)}.">`;
    svg+=`<rect x="${xl}" y="34" width="${xr-xl}" height="114" fill="#F1EADB"/>`;
    svg+=text(xl-4,21,fmt(w-n.leftGap/2),'text-anchor="end" class="midpoint"')+text(xr+4,21,fmt(w+n.rightGap/2),'text-anchor="start" class="midpoint"');
    for(let i=-3;i<=3;i++){const v=BF16.decode(n.code+i),xx=x(v);if(xx<L||xx>R)continue;svg+=line(xx,38,xx,152,'stroke="#D9DDD9"');if(W>=500||Math.abs(i)<=1)svg+=text(xx,171,W<500?(i===0?fmt(w):i<0?'−1 ULP':'+1 ULP'):fmt(v),'text-anchor="middle" class="tick"');}
    svg+=line(L,148,R,148,'stroke="#869093"')+line(xl,27,xl,149,'stroke="#AD9166" stroke-dasharray="3 4"')+line(xr,27,xr,149,'stroke="#AD9166" stroke-dasharray="3 4"');
    for(const [v,yy,color,kind,label] of [[w,54,'#202A33','dot','w'],[s.candidate,91,'#007C91','diamond','w + δ'],[s.stored,128,'#A56716','ring','w⁺']]){const xx=x(v);svg+=text(L,yy-10,label,`fill="${color}" class="lane"`)+line(xx,yy+5,xx,147,`stroke="${color}" opacity="0.25"`);svg+=kind==='diamond'?`<path d="M${xx} ${yy-6} l6 6 l-6 6 l-6 -6 Z" fill="${color}"/>`:`<circle cx="${xx}" cy="${yy}" r="${kind==='dot'?4.5:6}" fill="${kind==='dot'?color:'#F8F7F4'}" stroke="${color}" stroke-width="2"/>`;}
    return svg+'</svg>';
  }
  return {plot,scalar};
})();

const Presentation = (()=>{
  const integer=x=>x.toLocaleString('en-US');
  const raw=x=>x===null||x===undefined?'Not available':String(x);
  const gap=x=>x===null||x===undefined?'No loss sample at this step.':(x>0?'+':'')+x.toFixed(4);
  const significant=(x,digits=4)=>x===null||x===undefined?'Not available':Number(x.toPrecision(digits)).toString();
  function small(x,digits=4){if(x===null||x===undefined)return 'Not available';if(x!==0&&Math.abs(x)<.01){const [mantissa,power]=x.toExponential(digits-1).split('e');return `${mantissa} × 10<sup>${Number(power)}</sup>`;}return significant(x,digits);}
  const percent=x=>x===null||x===undefined?'Not available':(x*100).toFixed(2)+'%';
  function scalarText(w,delta){const r=BF16.update(w,delta),n=BF16.neighbors(w),bracket=BF16.bracket(r.candidate),tie=r.candidate===(bracket.lower+bracket.upper)/2;return {result:`<span>Proposed value <b>${fmt(r.candidate)}</b></span><span>Stored weight <b>${fmt(r.stored)}</b></span><span>Actual change <b>${sign(r.realized)}</b></span>`,status:delta===0?'The proposed update is zero.':tie?'The proposed value is exactly at a rounding boundary.':r.realized===0?'Rounding cancels this update.':`The stored weight changes by ${sign(r.realized)}.`,ulp:`Local ULP: ${fmt(n.rightGap)}.`};}
  function viewCopy(state){const training=state.view!=='validation',weight=state.view==='weight';const selected=[];if(state.methods.includes('Muon'))selected.push('Muon uses an estimated update norm.');if(state.methods.includes('MACRO-fro'))selected.push('MACRO-fro uses ρₜ = ηₜ.');return {note:!training?'Validation loss at evaluation checkpoints. Solid: BF16. Dashed: FP32.':weight?(state.methods.includes('Muon')?'Solid: BF16. Dashed: FP32.':''):selected.join(' '),upper:!training?'Validation loss':weight?'Weight norm ‖Wₜ‖F':'Update-to-weight ratio ρₜ',kind:state.view==='ratio'?'Estimate':'Measured',lower:training?'Training-loss gap · BF16 − FP32':'Validation-loss gap · BF16 − FP32'};}
  function readout(data,state){let html=`<span class="method-read"><b>Step ${integer(state.step)}</b> · ${(state.step*data.models[state.model].tokens_per_step/1e9).toFixed(3)}B tokens</span>`;for(const method of state.methods){const r=ChartModel.read(data,state,method);html+=`<span class="method-read">${method} · ${r.gap===null?'No loss sample at this step.':'Loss gap '+gap(r.gap)}</span>`;if(state.view==='validation')continue;if(method==='Muon'){html+=r.weightBF16===null||r.weightFP32===null?'<span class="method-read">No weight-norm sample at this step.</span>':`<span class="method-read">Weight norm: BF16 ${significant(r.weightBF16)} · FP32 ${significant(r.weightFP32)}</span>`;if(state.view==='ratio'&&r.ratio!==null)html+=`<span class="method-read">Estimated update norm ${small(r.update)} · Estimated ratio ${small(r.ratio,3)}</span>`;}else if(state.view==='ratio'&&r.ratio!==null)html+=`<span class="method-read">${method} · ρₜ = ηₜ ${small(r.ratio,3)}</span>`;}return html;}
  function sourceValues(data,state){return state.methods.map(method=>{const r=ChartModel.read(data,state,method),m=data.models[state.model].methods[method],matrix=method==='Muon'?ChartModel.matrix(data,state):null;return `<p><b>${state.model} ${method}</b> · Step ${integer(r.time)}<br>FP32 loss: ${raw(r.fp32)} · BF16 loss: ${raw(r.bf16)} · Loss gap: ${raw(r.gap)}<br>FP32: <code>${m.fp32_run}</code><br>BF16: <code>${m.bf16_run}</code>${method==='Muon'?`<br><a href="${m.source_urls.FP32}" target="_blank" rel="noopener noreferrer">FP32 W&amp;B run</a> · <a href="${m.source_urls.BF16}" target="_blank" rel="noopener noreferrer">BF16 W&amp;B run</a><br>Norm key: <code>${escapeHTML(matrix?.key??'Not available')}</code><br>FP32 norm: ${raw(r.weightFP32)} · BF16 norm: ${raw(r.weightBF16)}<br>Estimated update norm: ${raw(r.update)} · Estimated ratio: ${raw(r.ratio)}<br>Logged LR: ${raw(r.lr)} · Shape: ${matrix.shape.join(' × ')}`:r.ratio!==null?`<br>ρₜ = ηₜ: ${raw(r.ratio)}<br>Model retention: ${raw(r.retained)} · Model cancellation: ${raw(r.pDrop)}`:''}</p>`;}).join('');}
  function modelReadout(data,state){const fro=ChartModel.read(data,state,'MACRO-fro'),spec=ChartModel.read(data,state,'MACRO-spec');return `<span class="method-read"><b>Step ${integer(state.step)}</b></span><span class="method-read">MACRO-fro · ${fro.gap===null?'No loss sample at this step.':'Loss gap '+gap(fro.gap)}</span><span class="method-read">MACRO-spec · ${spec.gap===null?'No loss sample at this step.':'Loss gap '+gap(spec.gap)}</span><span class="method-read">Model for MACRO-fro: retained magnitude ${percent(fro.retained)} · canceled coordinates ${percent(fro.pDrop)}</span>`;}
  function modelTitle(state){return state.modelMetric==='retained'?'MACRO-fro · retained absolute-update fraction':'MACRO-fro · canceled-coordinate fraction';}
  function runTable(data){return Object.entries(data.models).map(([model,m])=>`<h4>${model} · ${integer(m.total_steps)} steps</h4>`+Object.entries(m.methods).map(([method,r])=>`<p><b>${method}</b> · peak LR ${r.peak_lr} · warmup ${integer(r.warmup_steps)} · weight decay ${r.weight_decay}<br>FP32 <code>${r.fp32_run}</code><br>BF16 <code>${r.bf16_run}</code></p>`).join('')).join('');}
  function shape(data,state){const rec=data.models[state.model].methods.Muon,matrix=ChartModel.matrix(data,state),[m,n]=matrix.shape,eta=rec.lr_logged[state.step-1][1],r=ChartModel.muonDirection(m,n,eta);return `${state.model} · ${matrix.label} · Shape ${m} × ${n}. Logged LR: ${raw(eta)}. Effective LR: ${raw(r.effectiveLR)}. Estimated update Frobenius norm: ${raw(r.updateF)}. Estimated update RMS: ${raw(r.updateRMS)}.`;}
  return {scalarText,viewCopy,readout,sourceValues,modelReadout,modelTitle,runTable,shape};
})();

(()=>{
  'use strict';
  const data=JSON.parse(document.getElementById('figure-data').textContent);
  const state=ChartModel.initial(data),macro=ChartModel.macroInitial(data);
  const scalar={mode:'update',w:1.5,delta:.002};
  const root=document.getElementById('section-3'),sources=document.getElementById('article-methods-panel');
  const $=id=>id==='main'?root:root.querySelector('[id="'+id+'"]')||sources.querySelector('[id="'+id+'"]');
  const all=s=>[...root.querySelectorAll(s),...sources.querySelectorAll(s)];
  const pressed=(selector,key,value)=>all(selector).forEach(el=>el.setAttribute('aria-pressed',String(el.dataset[key]===value)));
  const chartWidth=id=>Math.max(280,Math.round($(id).clientWidth||780));
  const setHTML=(id,value)=>{$(id).innerHTML=value;};
  const setText=(id,value)=>{$(id).textContent=value;};
  function renderScalar(){
    const w=scalar.mode==='update'?1.5:scalar.w,delta=scalar.mode==='update'?scalar.delta:.004,copy=Presentation.scalarText(w,delta);
    setHTML('scalar-chart',Draw.scalar(w,delta,chartWidth('scalar-chart')));
    setHTML('scalar-result',copy.result);setText('scalar-status',copy.status);setText('scalar-ulp',copy.ulp);
    $('update-controls').hidden=scalar.mode!=='update';$('weight-controls').hidden=scalar.mode!=='weight';
    $('delta').value=scalar.delta;setText('delta-label',sign(scalar.delta));
    pressed('[data-scalar-mode]','scalarMode',scalar.mode);pressed('[data-weight]','weight',String(scalar.w));
  }
  function renderTimeline(s,prefix){
    const T=data.models[s.model].total_steps,start=ChartModel.startStep(data,s);
    $(prefix+'range-start').min=start;$(prefix+'range-end').min=start+1;
    $(prefix+'time-step').min=s.domain[0];$(prefix+'time-step').max=s.domain[1];$(prefix+'time-step').value=s.step;setText(prefix+'time-label',s.step.toLocaleString('en-US'));
    $(prefix+'time-step').setAttribute('aria-valuetext',`Step ${s.step}, ${s.view} view`);
    $(prefix+'range-start').max=T-1;$(prefix+'range-end').max=T;$(prefix+'range-start').value=s.domain[0];$(prefix+'range-end').value=s.domain[1];
    $(prefix+'fit-gap').checked=s.gapScale==='visible';$(prefix+'cursor-lock').setAttribute('aria-pressed',String(s.locked));setText(prefix+'cursor-lock',s.locked?'Unlock cursor':'Lock cursor');
  }
  function renderEvidence(){
    const training=state.view!=='validation',rec=data.models[state.model].methods.Muon;
    $('evidence-view').value=state.view;pressed('[data-model]','model',state.model);pressed('[data-window]','window',state.window);
    all('[data-method]').forEach(el=>{el.checked=state.methods.includes(el.dataset.method);el.disabled=state.methods.length===1&&el.checked;});
    if(!rec.display_parameters.includes(state.matrix))state.matrix=rec.default_matrix;
    if($('matrix').dataset.model!==state.model){setHTML('matrix',rec.display_parameters.map(name=>`<option value="${escapeHTML(name)}">${rec.matrices[name].label}</option>`).join(''));$('matrix').dataset.model=state.model;}
    $('matrix').value=state.matrix;$('matrix-control').hidden=!training||!state.methods.includes('Muon');
    const copy=Presentation.viewCopy(state);setText('view-note',copy.note);$('view-note').hidden=!copy.note;
    setText('upper-title',copy.upper);setText('upper-kind',copy.kind);$('upper-kind').classList.toggle('estimate',state.view==='ratio');setText('lower-title',copy.lower);
    for(const [id,type] of [['upper-chart','upper'],['lower-chart','gap']])setHTML(id,Draw.plot(data,state,type,chartWidth(id)));
    renderTimeline(state,'');
    setHTML('readout',Presentation.readout(data,state));setHTML('source-values',Presentation.sourceValues(data,state));
    const selected=ChartModel.matrix(data,state),shape=selected.shape;setHTML('shape',`<option value="${shape.join(',')}">${state.model} · ${selected.label}: ${shape.join(' × ')} · source-derived</option>`);$('shape').value=shape.join(',');$('shape').disabled=true;setText('shape-result',Presentation.shape(data,state));
  }
  function renderMacro(){
    pressed('[data-macro-model]','macroModel',macro.model);pressed('[data-macro-window]','macroWindow',macro.window);pressed('[data-model-metric]','modelMetric',macro.modelMetric);
    setText('model-title',Presentation.modelTitle(macro));
    $('macro-loss-scale').value=macro.lossScale;
    setText('macro-scale-note',macro.lossScale==='symlog'?'Symlog shows zero and negative gaps, with a linear region from −0.001 to +0.001.':'Linear scale shows the signed loss gap.');
    setHTML('model-chart',Draw.plot(data,macro,'model',chartWidth('model-chart')));setHTML('model-loss-chart',Draw.plot(data,macro,'gap',chartWidth('model-loss-chart')));
    setHTML('model-readout',Presentation.modelReadout(data,macro));setHTML('macro-source-values',Presentation.sourceValues(data,macro));
    renderTimeline(macro,'macro-');
  }
  function render(){renderEvidence();renderMacro();}
  let frame=0;const pending=new Set();
  function schedule(draw=render){pending.add(draw);if(!frame)frame=requestAnimationFrame(()=>{frame=0;const draws=[...pending];pending.clear();draws.forEach(fn=>fn());});}
  function setView(view){const prior=state.window;ChartModel.selectView(state,view);if(prior==='custom'){const a=Math.max(state.domain[0],ChartModel.startStep(data,state));if(!ChartModel.setRange(data,state,a,state.domain[1])){state.domain=ChartModel.windowRange(data,state,'full');state.window='full';}}else state.domain=ChartModel.windowRange(data,state,prior);ChartModel.selectStep(data,state,state.step);setText('range-error','');renderEvidence();}
  function setWindow(name,s=state,prefix=''){s.domain=ChartModel.windowRange(data,s,name);s.window=name;ChartModel.selectStep(data,s,s.step);setText(prefix+'range-error','');s===state?renderEvidence():renderMacro();}
  all('button:disabled,input:disabled,select:disabled').forEach(el=>el.disabled=false);
  all('[data-scalar-mode]').forEach(el=>el.addEventListener('click',()=>{scalar.mode=el.dataset.scalarMode;renderScalar();}));
  all('[data-weight]').forEach(el=>el.addEventListener('click',()=>{scalar.w=Number(el.dataset.weight);renderScalar();}));
  all('[data-delta]').forEach(el=>el.addEventListener('click',()=>{scalar.delta=Number(el.dataset.delta);renderScalar();}));
  $('delta').addEventListener('input',e=>{scalar.delta=Number(e.target.value);renderScalar();});
  $('delta').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();scalar.delta=e.key==='Home'?-.012:e.key==='End'?.012:Math.max(-.012,Math.min(.012,Number((scalar.delta+(['ArrowRight','ArrowUp'].includes(e.key)?1:-1)*.0001).toFixed(8))));renderScalar();});
  $('scalar-reset').addEventListener('click',()=>{scalar.mode='update';scalar.w=1.5;scalar.delta=.002;renderScalar();});
  $('evidence-view').addEventListener('change',e=>setView(e.target.value));
  all('[data-model]').forEach(el=>el.addEventListener('click',()=>{state.model=el.dataset.model;state.step=data.models[state.model].total_steps;setWindow(state.window==='custom'?'full':state.window);}));
  all('[data-method]').forEach(el=>el.addEventListener('change',()=>{state.methods=all('[data-method]').filter(x=>x.checked).map(x=>x.dataset.method);renderEvidence();}));
  all('[data-window]').forEach(el=>el.addEventListener('click',()=>setWindow(el.dataset.window)));
  all('[data-macro-model]').forEach(el=>el.addEventListener('click',()=>{const range=macro.domain.slice();macro.model=el.dataset.macroModel;macro.step=data.models[macro.model].total_steps;if(macro.window==='custom'){if(!ChartModel.setRange(data,macro,range[0],Math.min(range[1],data.models[macro.model].total_steps)))ChartModel.setRange(data,macro,4700,9000);renderMacro();}else setWindow(macro.window,macro,'macro-');}));
  $('macro-loss-scale').addEventListener('change',e=>{macro.lossScale=e.target.value;renderMacro();});
  all('[data-macro-window]').forEach(el=>el.addEventListener('click',()=>setWindow(el.dataset.macroWindow,macro,'macro-')));
  function rangeError(s,a,b){const T=data.models[s.model].total_steps,valid=Number.isInteger(a)&&Number.isInteger(b)&&a>=ChartModel.startStep(data,s)&&b<=T&&a<b;return valid&&s.view==='validation'?'Choose a range with at least two validation checkpoints.':'Choose two different steps within the run.';}
  function bindTimeline(s,prefix,draw){
    $(prefix+'time-step').addEventListener('input',e=>{ChartModel.selectStep(data,s,Number(e.target.value));schedule(draw);});
    $(prefix+'cursor-lock').addEventListener('click',()=>{s.locked=!s.locked;draw();});
    $(prefix+'fit-gap').addEventListener('change',e=>{s.gapScale=e.target.checked?'visible':'all';draw();});
    $(prefix+'apply-range').addEventListener('click',()=>{if(!ChartModel.setRange(data,s,Number($(prefix+'range-start').value),Number($(prefix+'range-end').value))){setText(prefix+'range-error',rangeError(s,Number($(prefix+'range-start').value),Number($(prefix+'range-end').value)));return;}setText(prefix+'range-error','');draw();});
  }
  bindTimeline(state,'',renderEvidence);bindTimeline(macro,'macro-',renderMacro);
  $('time-step').addEventListener('keydown',e=>{if(state.view==='validation'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const rows=data.models[state.model].methods.Muon.validation.filter(r=>r[0]>=state.domain[0]&&r[0]<=state.domain[1]),i=rows.findIndex(r=>r[0]===state.step),dir=['ArrowRight','ArrowUp'].includes(e.key)?1:-1;state.step=rows[Math.max(0,Math.min(rows.length-1,i+dir))][0];renderEvidence();}});
  $('matrix').addEventListener('change',e=>{state.matrix=e.target.value;renderEvidence();});
  all('[data-model-metric]').forEach(el=>el.addEventListener('click',()=>{macro.modelMetric=el.dataset.modelMetric;renderMacro();}));
  all('.chart.linked').forEach(el=>{
    const s=el.dataset.panel==='macro'?macro:state,prefix=s===macro?'macro-':'',draw=s===macro?renderMacro:renderEvidence;
    let drag=null;
    const at=e=>{const svg=el.querySelector('svg');if(!svg)return s.step;const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*Number(svg.dataset.width),l=Number(svg.dataset.left),r=Number(svg.dataset.right);return Math.round(s.domain[0]+Math.max(0,Math.min(1,(x-l)/(r-l)))*(s.domain[1]-s.domain[0]));};
    el.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType!=='touch')return;drag={start:at(e),shift:e.shiftKey,touch:e.pointerType==='touch',x:e.clientX,locked:s.locked};el.setPointerCapture(e.pointerId);if(!e.shiftKey){ChartModel.selectStep(data,s,at(e));schedule(draw);}});
    el.addEventListener('pointermove',e=>{if(drag?.shift)return;if(drag||!s.locked){ChartModel.selectStep(data,s,at(e));schedule(draw);}});
    el.addEventListener('pointerup',e=>{if(!drag)return;if(drag.shift){const end=at(e);if(!ChartModel.setRange(data,s,Math.min(drag.start,end),Math.max(drag.start,end)))setText(prefix+'range-error',rangeError(s,Math.min(drag.start,end),Math.max(drag.start,end)));}else{ChartModel.selectStep(data,s,at(e));s.locked=drag.touch||Math.abs(e.clientX-drag.x)>5?true:!drag.locked;}drag=null;draw();});
    el.addEventListener('pointercancel',()=>{drag=null;});
  });
  if(typeof ResizeObserver!=='undefined'){let last=0;new ResizeObserver(entries=>{const width=Math.round(entries[0].contentRect.width);if(width!==last){last=width;renderScalar();schedule();}}).observe($('main'));}else window.addEventListener('resize',()=>{renderScalar();schedule();});
  renderScalar();render();
})();

})();