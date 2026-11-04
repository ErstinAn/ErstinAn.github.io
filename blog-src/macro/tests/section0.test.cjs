const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const out=path.join(__dirname,'..'),page=fs.readFileSync(path.join(out,'index.html'),'utf8');
const core=page.split('<script id="s0-script">(()=>{\n')[1].split('\nconst S0Data=')[0];
const context=vm.createContext({});vm.runInContext(core+';globalThis.charts=S0Charts;',context);
const c=context.charts,data=JSON.parse(page.split('const S0Data=')[1].split(';\n')[0]),text=JSON.parse(page.split('const S0Content=')[1].split(';\n')[0]);
for(const width of [240,284,334,365,396,668,780]){
 for(const svg of [c.lossPlot(data,text,width),c.normPlot(data,text,width)]){
  assert.ok(!/NaN|Infinity/.test(svg));
  assert.ok(svg.includes(`viewBox="0 0 ${width} 254"`));
  for(const [_,x,y] of svg.matchAll(/[ML]([\d.]+),([\d.]+)/g)){assert.ok(+x>=43&&+x<=width-17);assert.ok(+y>=22&&+y<=199);}
 }
}
// Probe a negative contrast to ensure the renderer preserves the sign.
const negative=structuredClone(data);negative.validation.records[0]['MACRO-oobl']=negative.validation.records[0]['MACRO-fro']-.001;
const point=c.lossRows(negative)[0];assert.ok(point.difference<0);assert.ok(c.lossReadout(point,text).includes('-0.001000'));
// Missing observations break the path. A readout selects an existing observation.
const missing=structuredClone(data);missing.row_norm.series[0].points[5][1]=null;
const plot=c.normPlot(missing,text),line=plot.match(/data-s0-curve="0"[^>]*d="([^"]+)"/)[1];
assert.equal((line.match(/M/g)||[]).length,2);assert.equal((line.match(/[ML]/g)||[]).length,19);
assert.notEqual(c.closestPoint(missing.row_norm.series[0],900)[0],900);
assert.equal(c.normPlot({row_norm:{series:[]}},text),'<p>Data not available.</p>');
const {createDOM}=require('./dom-contract.cjs');
const env=createDOM(page,JSON.parse(fs.readFileSync(process.env.BLOG_DOM_FIXTURE,'utf8')));
for(const stage of text.stages){
 env.button('s0Stage',stage.key).fire('click');
 assert.equal(env.$('s0-stage-formula').innerHTML,stage.formula);
 assert.equal(env.$('s0-stage-explanation').innerHTML,stage.explanation);
 assert.equal(env.$('s0-stage-definition').innerHTML,stage.definition);
 assert.equal(env.$('s0-stage-definition').hidden,!stage.definition);
 assert.equal(env.groups('s0Stage').filter(b=>b.attrs['aria-pressed']==='true').length,1);
}
env.button('s0Stage','retract').fire('keydown',{key:'Home'});
assert.equal(env.$('s0-stage-formula').innerHTML,text.stages[0].formula);
env.button('s0Stage','momentum').fire('keydown',{key:'ArrowRight'});
assert.equal(env.$('s0-stage-definition').innerHTML,text.stages[1].definition);
console.log('PASS: signed contrasts, finite SVG coordinates at seven widths, explicit missing-record path gaps, unavailable-data state. No browser/layout claim.');
console.log('PASS: all five stages show the reviewed formulas and roles; keyboard stage navigation works.');
