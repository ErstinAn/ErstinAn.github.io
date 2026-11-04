const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const out=path.join(__dirname,'..'),page=fs.readFileSync(path.join(out,'index.html'),'utf8');
const core=page.split('<script id="s1-script">(()=>{\n')[1].split('\nconst S1Data=')[0],ctx=vm.createContext({});
vm.runInContext(core+';globalThis.charts=S1Charts;',ctx);const charts=ctx.charts;
const data=JSON.parse(page.split('const S1Data=')[1].split(';\n')[0]),copy=JSON.parse(page.split('const S1Copy=')[1].split(';\n')[0]);
const expected={
 '240M':[[20.669,20.542,20.526,20.518],[21.103,20.678,20.535,20.457]],
 '600M':[[15.329,15.296,15.297,15.329],[15.434,15.312,15.277,15.288]]
};
for(const model of ['240M','600M']){
 const points=charts.points(data,'radius',model);assert.equal(points.length,8);
 points.forEach((p,i)=>{assert.equal(p.value,expected[model][Math.floor(i/4)][i%4]);assert.ok(charts.readout(p,'radius',copy).includes(p.value.toFixed(3)));});
 const legend=charts.legend(data,'radius',model,copy);assert.ok(legend.includes(model==='240M'?'0.016':'0.012'));assert.ok(legend.includes('0.008'));
 for(const width of [240,264,284,334,500,780]){
  const svg=charts.plot(data,'radius',model,copy,width),g=charts.geometry('radius',model,width);
  assert.ok(!/NaN|Infinity/.test(svg));assert.equal((svg.match(/<circle/g)||[]).length,8);
  const coords=[...svg.matchAll(/cx="([\d.]+)" cy="([\d.]+)"/g)];
  coords.forEach((m,i)=>{const p=points[i],x=g.left+Math.log(p.x/.5)/Math.log(10)*(g.right-g.left),y=g.bottom-(p.value-g.ymin)/(g.ymax-g.ymin)*(g.bottom-g.top);assert.ok(Math.abs(+m[1]-x)<.000051);assert.ok(Math.abs(+m[2]-y)<.000051);});
 }
}
const outcomes=charts.points(data,'ablation');assert.equal(outcomes.length,15);assert.equal(outcomes.filter(p=>p.value!==null).length,14);
assert.equal(charts.readout(outcomes[4],'ablation',copy),'Muon · Learning rate 0.03 · NaN (diverged)');
for(const width of [240,264,284,334,500,780]){
 const svg=charts.plot(data,'ablation','240M',copy,width);assert.ok(!/(?:cx|cy|x|y|d|viewBox)="[^"]*(?:NaN|Infinity)/.test(svg));assert.equal((svg.match(/<circle/g)||[]).length,11);
 assert.ok(!svg.includes('data-s1-point="4"'));assert.ok(svg.includes('Muon · NaN'));
 assert.equal((svg.match(/data-s1-diverged="true"/g)||[]).length,5);
}
for(const method of ['MACRO-fro','MACRO-spec'])for(const width of [240,284,334,500,780]){
 const svg=charts.gammaPlot(data,method,copy,width),g=charts.gammaGeometry(data,width);
 assert.equal((svg.match(/class="s1-gamma-line"/g)||[]).length,5);
 assert.equal((svg.match(/data-s1-gamma-sample=/g)||[]).length,50);
 assert.equal(g.ymin,10);assert.equal(g.ymax,400);
 assert.ok(!/NaN|Infinity/.test(svg));
}
const gap=structuredClone(data);gap.gamma.series[0].points[3].value=null;
const gapSVG=charts.gammaPlot(gap,'MACRO-fro',copy),firstPath=gapSVG.match(/class="s1-gamma-line"[^>]* d="([^"]+)"/)[1];
assert.equal((firstPath.match(/M/g)||[]).length,2);
assert.notEqual(charts.gammaNearest(gap.gamma.series[0],1080).step,1080);
console.log('PASS: all 16 PPL values, fixed model ranges/learning rates, 11 visible finite losses + NaN annotation, 100 gamma samples, missing-sample path breaks, six widths, log-x/linear-y coordinates and three-decimal readouts.');
