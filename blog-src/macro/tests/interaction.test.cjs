/* Delivered scripts in a DOM contract. Not a browser or CSS renderer. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createDOM}=require('./dom-contract.cjs'),out=path.join(__dirname,'..');
const crypto=require('node:crypto');
const page=fs.readFileSync(process.env.BLOG_HTML||path.join(out,'index.html'),'utf8');
const actual=createDOM(page,JSON.parse(fs.readFileSync(process.env.BLOG_DOM_FIXTURE,'utf8')));
// Compact accepted-state hashes replace old-version HTML and DOM snapshots.
const oldIds=actual.elements.filter(el=>{if(!el.id||['section-0','section-1','section-2','section-3','s2-mean-balance-details'].includes(el.id))return false;for(let n=el;n;n=n.parent)if(['section-0','section-1','section-2','section-3'].includes(n.id))return true;return false;}).map(el=>el.id);
oldIds.push('source-values','macro-source-values','shape','shape-result','run-table');
const snapshot=(env,ids)=>JSON.stringify(ids.map(id=>{const el=env.$(id);return[id,...['innerHTML','value','textContent','disabled','hidden','checked'].map(p=>el[p])];}));
const capture=process.env.BLOG_CAPTURE_SNAPSHOTS;
const baseline=capture?[]:JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/interaction.json'),'utf8'));
const snapshots=[];
const same=()=>{
 const digest=crypto.createHash('sha256').update(snapshot(actual,oldIds)).digest('hex');
 if(!capture)assert.equal(digest,baseline[snapshots.length],'interaction snapshot '+snapshots.length);
 snapshots.push(digest);
};
const control=(kind,view)=>actual.groups('s4Control').find(b=>b.dataset.s4Control===kind&&b.dataset.s4View===view);
const data=JSON.parse(page.split('const S4Data=')[1].split(';\n')[0]);
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const states={standard:[],efficiency:[],warmup:[]};
function pick(kind,index,type='click'){
 actual.$('s4-'+kind+'-chart').fire(type,{target:{dataset:{s4Kind:kind,s4Point:String(index)}},key:type==='keydown'?'Enter':undefined});
 return actual.$('s4-'+kind+'-readout').textContent;
}
test('initial controls and readouts match the approved page; Section 4 controls enable independently',()=>{
 same();assert.ok(actual.groups('s4Control').every(b=>!b.disabled));
 for(const kind of ['standard','efficiency','warmup'])assert.equal(actual.groups('s4Control').filter(b=>b.dataset.s4Control===kind&&b.attrs['aria-pressed']==='true').length,1);
 assert.equal(actual.$('s4-warmup-source-detail').open,false);
});
test('Sources starts closed and footnote navigation reveals only the referenced disclosure',()=>{
 const panel=actual.$('article-sources-panel'),methods=actual.$('article-methods-panel');assert.equal(panel.open,false);assert.equal(methods.open,false);
 const anchors=actual.elements.filter(el=>el.tag==='a'&&el.events.click);
 assert.ok(anchors.length>0);
 for(const anchor of anchors){
  panel.open=false;methods.open=false;
  const target=actual.$(decodeURIComponent(anchor.attrs.href.slice(1)));
  assert.ok(panel.contains(target)||methods.contains(target));anchor.fire('click');
  assert.equal(panel.open,panel.contains(target));assert.equal(methods.open,methods.contains(target));
  for(let node=target;node&&node!==actual.$('article-sources');node=node.parentElement)if(node.tagName==='DETAILS')assert.equal(node.open,true);
 }
 panel.open=false;methods.open=false;actual.win.location={hash:'#s4-warmup-source-detail'};actual.win.events.hashchange();
 assert.equal(panel.open,true);assert.equal(actual.$('s4-warmup-source-detail').open,true);assert.equal(methods.open,false);
 panel.open=false;actual.win.location={hash:'#run-details'};actual.win.events.hashchange();
 assert.equal(methods.open,true);assert.equal(actual.$('run-details').open,true);assert.equal(panel.open,false);same();
});
test('all standard model states retain reported ± values and correct missing rows',()=>{
 const unaffected=snapshot(actual,['s4-efficiency-chart','s4-warmup-chart']);
 for(const model of ['240M','600M','1.2B']){
  control('standard',model).fire('click');
  const svg=actual.$('s4-standard-chart').innerHTML;
  
  assert.equal((svg.match(/data-s4-mean=/g)||[]).length,model==='1.2B'?5:7);
  if(model==='1.2B')assert.equal((svg.match(/Not reported/g)||[]).length,2);
  data.standard.models[model].forEach((s,index)=>{
   if(s.mean===null)return;
   const expected=`${model} · ${s.method} · PPL ${s.mean.toFixed(2)} ± ${s.plus_minus.toFixed(3)}`;
   for(const type of ['pointerover','click','focusin','keydown'])assert.equal(pick('standard',index,type),expected);
   states.standard.push(expected);
  });
 }
 assert.equal(snapshot(actual,['s4-efficiency-chart','s4-warmup-chart']),unaffected);same();
});
test('all efficiency metrics show raw values, direction helper and a Muon reference',()=>{
 const unaffected=snapshot(actual,['s4-standard-chart','s4-warmup-chart']);
 for(const [key,label]of [['e2e_seconds','E2E time'],['tps_per_gpu','TPS/GPU'],['mfu_percent','MFU']]){
  control('efficiency',key).fire('click');
  assert.equal(actual.$('s4-efficiency-helper').textContent,key==='e2e_seconds'?'Lower is better.':'Higher is better.');
  assert.ok(actual.$('s4-efficiency-chart').innerHTML.includes('Muon reference'));
  data.efficiency.methods.forEach((s,index)=>{
   const value=key==='e2e_seconds'?s[key].toFixed(4)+' s':key==='mfu_percent'?s[key].toFixed(2)+'%':s[key].toLocaleString('en-US');
   const expected=`240M · ${s.method} · ${label} ${value}`;
   for(const type of ['pointerover','click','focusin','keydown'])assert.equal(pick('efficiency',index,type),expected);
   states.efficiency.push(expected);
  });
 }
 assert.equal(snapshot(actual,['s4-standard-chart','s4-warmup-chart']),unaffected);same();
});
test('both warmup models expose all tested settings and slide values without changing other figures',()=>{
 const unaffected=snapshot(actual,['s4-standard-chart','s4-efficiency-chart']);
 for(const model of ['240M','600M']){
  control('warmup',model).fire('click');
  assert.equal((actual.$('s4-warmup-chart').innerHTML.match(/data-s4-warmup-point=/g)||[]).length,12);
  Object.entries(data.warmup.models[model].series).forEach(([method,values],si)=>values.forEach((value,j)=>{
   const expected=`${model} · ${method} · Warmup ${j*5}% · PPL ${value.toFixed(3)}`;
   for(const type of ['pointerover','click','focusin','keydown'])assert.equal(pick('warmup',si*4+j,type),expected);
   states.warmup.push(expected);
  }));
 }
 assert.equal(snapshot(actual,['s4-standard-chart','s4-efficiency-chart']),unaffected);same();
});
test('events from a nested SVG shape reach its accessible parent target',()=>{
 control('standard','240M').fire('click');
 const child=actual.elements.find(el=>el.attrs['data-s4-mean']==='0');assert.ok(child.parentElement.dataset.s4Point==='0');
 for(const type of ['pointerover','click']){
  actual.$('s4-standard-chart').fire(type,{target:child});
  assert.equal(actual.$('s4-standard-readout').textContent,'240M · Muon · PPL 20.72 ± 0.010');
 }
});
test('chapter and rotation controls match the approved interaction snapshots',()=>{
 const newIds=['s4-standard-chart','s4-standard-readout','s4-efficiency-chart','s4-efficiency-readout','s4-warmup-chart','s4-warmup-readout'];
 const saved=snapshot(actual,newIds),change=(e,id,value,type='change')=>{e.$(id).value=value;e.$(id).fire(type);};
 const actions=[
  e=>e.button('s0Stage','sign').fire('click'),e=>{e.$('s0-oblique-details').open=true;e.$('s0-oblique-details').fire('toggle');},
  e=>change(e,'s0-lr',.005),e=>e.$('s0-loss-chart').fire('focusin',{target:{dataset:{s0Point:'8'}}}),
  e=>e.button('s1GammaMethod','MACRO-spec').fire('click'),e=>e.button('s1GammaRadius','1').fire('click'),
  e=>e.$('s1-ablation-chart').fire('click',{target:{dataset:{s1Diverged:'true'}}}),e=>e.button('s1Model','600M').fire('click'),
  e=>e.$('s2-fro-chart').fire('keydown',{target:{dataset:{s2Curve:'fro',s2Index:'1'}},key:'Home'}),
  e=>e.$('s2-u-chart').fire('keydown',{target:{dataset:{s2Curve:'u',s2Index:'3'}},key:'End'}),
  e=>e.$('s2-v-chart').fire('pointermove',{target:{dataset:{s2Curve:'v',s2Index:'2'}},clientX:300}),
  e=>e.groups('s2Legend').find(b=>b.dataset.s2Legend==='spec'&&b.dataset.s2Index==='1').fire('click'),
  e=>e.button('model','600M').fire('click'),e=>change(e,'evidence-view','ratio'),e=>change(e,'matrix','layers.0.feed_forward.w1'),
  e=>change(e,'time-step',233,'input'),e=>e.button('macroModel','600M').fire('click'),e=>e.button('macroWindow','full').fire('click'),
  e=>change(e,'macro-time-step',3668,'input'),e=>change(e,'macro-loss-scale','linear'),e=>e.button('delta','0.004').fire('click')
 ];
 for(const action of actions){action(actual);same();assert.equal(snapshot(actual,newIds),saved);}
});
test('resize at narrow widths keeps finite SVGs and existing controls unchanged',()=>{
 for(const width of [780,500,380,334,284,264,240]){
  for(const env of [actual]){env.elements.forEach(el=>el.clientWidth=width);env.win.events.resize();env.flush();}
  same();
  for(const kind of ['standard','efficiency','warmup'])assert.ok(!/(?:cx|cy|x|y|d|viewBox)="[^"]*(?:NaN|Infinity)/.test(actual.$('s4-'+kind+'-chart').innerHTML));
 }
});
test('fixed article text/captions and shared sources are not rewritten',()=>{
 for(const id of ['section-0','section-1','section-2','section-3','section-4','s4-sources','s4-standard-caption','s4-efficiency-caption','s4-warmup-caption'])assert.ok(!actual.writes.has(id));
 const allowed=new Set(['s4-standard-chart','s4-standard-readout','s4-efficiency-chart','s4-efficiency-readout','s4-efficiency-helper','s4-warmup-chart','s4-warmup-readout']);
 for(const id of actual.writes)if(id.startsWith('s4-'))assert.ok(allowed.has(id),id);
 for(const name of ['S4Charts','S4Data','S4Copy','s4State','s4Active'])assert.equal(vm.runInContext('typeof '+name,actual.context),'undefined');
});

if(capture)fs.writeFileSync(capture,JSON.stringify(snapshots,null,2)+'\n');
else assert.equal(snapshots.length,baseline.length);
console.log('PASS: '+count+' interaction groups; '+snapshots.length+' snapshots; '+oldIds.length+' protected IDs. Node DOM contract, not a browser.');
