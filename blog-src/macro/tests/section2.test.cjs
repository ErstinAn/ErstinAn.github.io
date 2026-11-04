/* Real rotation data and delivered event handlers; no browser/layout claim. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createDOM}=require('./dom-contract.cjs'),out=path.join(__dirname,'..');
const page=fs.readFileSync(path.join(out,'index.html'),'utf8');
const embed=name=>JSON.parse(page.split('const '+name+'=')[1].split(';\n')[0]);
const data=embed('S2Data'),copy=embed('S2Copy'),meta=embed('S2Meta');
const core=page.split('<script id="s2-script">(()=>{\n')[1].split('\nconst S2Data=')[0];
const context=vm.createContext({});vm.runInContext(core+';this.charts=S2Charts;',context);
const charts=context.charts;
assert.equal(meta.angle_unit,'rad');assert.equal(meta.time_key,'global_step');
assert.equal(meta.spectral_runs_matched,true);
for(const key of ['fro','u','v']){
 const source=data[key];assert.equal(source.steps.length,8500);
 assert.deepEqual(source.steps,Array.from({length:8500},(_,i)=>i));
 assert.deepEqual(source.series.map(s=>s.learning_rate),[.001,.005,.01,.02,.05]);
 for(const s of source.series){assert.equal(s.values.length,8500);assert.ok(s.values.every(v=>v===null||Number.isFinite(v)&&v>0));}
 for(const width of [240,284,380,780]){
  const svg=charts.plot(data,key,copy,meta,width);
  assert.equal((svg.match(/class="s2-series"/g)||[]).length,5);
  assert.ok(!/(?:x|y|cx|cy|d|viewBox)="[^"]*(?:NaN|Infinity)/.test(svg));
 }
}
const env=createDOM(page,JSON.parse(fs.readFileSync(process.env.BLOG_DOM_FIXTURE,'utf8')));
const geometry=env.$('s2-geometry-figure').innerHTML;
assert.equal(env.groups('s2Mode').length,0);
for(const key of ['fro','u','v'])for(let i=0;i<5;i++){
 const target={dataset:{s2Curve:key,s2Index:String(i)}},chart=env.$('s2-'+key+'-chart'),kind=key==='fro'?'fro':'spec';
 for(const type of ['click','focusin'])chart.fire(type,{target});
 for(const keypress of ['Home','ArrowRight','End','ArrowLeft','Enter',' '])chart.fire('keydown',{target,key:keypress});
 for(const step of [0,3913,8499]){
  chart.fire('pointermove',{target,clientX:47+step/8499*(780-12-47)});
  const s=data[key].series[i],angle=Number(s.values[step].toPrecision(6));
  assert.ok(env.$('s2-'+kind+'-readout').textContent.endsWith('Step '+step+' · Learning rate '+s.learning_rate+' · Angle '+angle+' rad'));
 }
}
env.$('s2-u-chart').fire('keydown',{target:{dataset:{s2Curve:'u',s2Index:'2'}},key:'Home'});
assert.equal(env.$('s2-u-cursor').attrs.x1,env.$('s2-v-cursor').attrs.x1);
assert.notEqual(env.$('s2-u-marker').attrs.cy,env.$('s2-v-marker').attrs.cy);
for(const kind of ['fro','spec'])for(let i=0;i<5;i++){
 const b=env.groups('s2Legend').find(b=>b.dataset.s2Legend===kind&&b.dataset.s2Index===String(i));
 b.fire('click');b.fire('click');
}
for(const width of [780,380,284,240]){
 env.elements.forEach(el=>el.clientWidth=width);env.win.events.resize();env.flush();
 assert.equal(env.$('s2-geometry-figure').innerHTML,geometry);
}
assert.ok(!env.writes.has('s2-geometry-figure'));
console.log('PASS: 15 measured rotation curves, all 127,500 samples, rad/step/LR metadata, paired u/v selection, pointer/keyboard/legend controls and four render widths.');
