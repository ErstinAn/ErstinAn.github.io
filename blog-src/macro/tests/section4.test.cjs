const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const out=path.join(__dirname,'..'),page=fs.readFileSync(path.join(out,'index.html'),'utf8');
const data=JSON.parse(page.split('const S4Data=')[1].split(';\n')[0]),copy=JSON.parse(page.split('const S4Copy=')[1].split(';\n')[0]);
const ctx=vm.createContext({});vm.runInContext(page.match(/<script id="s4-script">\(\(\)=>\{\n([\s\S]*?)\nconst S4Data=/)[1]+';this.c=S4Charts;',ctx);const c=ctx.c;
let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<.000051,`${a} != ${b}`);
test('all 19 reported means and ± values use exact row order and local linear axes',()=>{
 for(const model of copy.standard.models)for(const width of [780,500,380,284,264,240]){
  const svg=c.dot(data,model,copy,width),g=c.dimensions('standard',model,width),rows=data.standard.models[model],points=[...svg.matchAll(/data-s4-mean="(\d+)" cx="([\d.]+)" cy="([\d.]+)"/g)],errors=[...svg.matchAll(/<path d="M([\d.]+),([\d.]+)H([\d.]+)[^"]*" stroke="[^"]+" class="s4-error"/g)];
  assert.equal(points.length,model==='1.2B'?5:7);assert.equal(errors.length,points.length);
  const finite=rows.filter(s=>s.mean!==null);
  points.forEach((m,i)=>{const index=Number(m[1]),s=rows[index];near(Number(m[2]),g.left+(s.mean-g.xmin)/(g.xmax-g.xmin)*(g.right-g.left));near(Number(m[3]),34+index*35);near(Number(errors[i][1]),g.left+(s.mean-s.plus_minus-g.xmin)/(g.xmax-g.xmin)*(g.right-g.left));near(Number(errors[i][3]),g.left+(s.mean+s.plus_minus-g.xmin)/(g.xmax-g.xmin)*(g.right-g.left));assert.ok(svg.includes(s.mean.toFixed(2)+' ± '+s.plus_minus.toFixed(3)));});
  assert.equal((svg.match(/class="s4-best-ring"/g)||[]).length,1);
  assert.ok(svg.includes('Lowest mean'));
  if(model==='1.2B'){assert.equal((svg.match(/Not reported/g)||[]).length,2);assert.ok(!svg.includes('data-s4-mean="3"'));assert.ok(!svg.includes('data-s4-mean="4"'));}
  else assert.equal((svg.match(/stroke-dasharray="3 2"/g)||[]).length,2);
  assert.deepEqual(rows.map(r=>r.method),JSON.parse(JSON.stringify(c.order)));
  for(const row of finite)assert.ok(row.mean-row.plus_minus>=g.xmin&&row.mean+row.plus_minus<=g.xmax);
 }
});
test('all 21 raw efficiency values, zero baseline and Muon reference match their metrics',()=>{
 for(const key of ['e2e_seconds','tps_per_gpu','mfu_percent'])for(const width of [780,380,284,240]){
  const svg=c.bars(data,key,copy,width),g=c.dimensions('efficiency',key,width),bars=[...svg.matchAll(/data-s4-bar="(\d+)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)];assert.equal(bars.length,7);
  bars.forEach((m,i)=>{const row=data.efficiency.methods[i];assert.equal(Number(m[1]),i);assert.equal(Number(m[2]),g.left);near(Number(m[4]),row[key]/g.xmax*(g.right-g.left));const value=key==='e2e_seconds'?row[key].toFixed(4):key==='mfu_percent'?row[key].toFixed(2)+'%':row[key].toLocaleString('en-US');assert.ok(svg.includes('>'+value+'</text>'));});
  const ref=Number(svg.match(/data-s4-reference="true" x1="([\d.]+)"/)[1]);near(ref,g.left+data.efficiency.methods[0][key]/g.xmax*(g.right-g.left));
  assert.ok(svg.includes('Muon reference'));assert.ok(svg.includes(copy.efficiency.metrics.find(m=>m.key===key).axis));
 }
});
test('all 24 warmup observations and per-method minima, including slide-only 600M 10%',()=>{
 for(const model of copy.warmup.models)for(const width of [780,380,284,240]){
  const svg=c.warmup(data,model,copy,width),g=c.dimensions('warmup',model,width),source=data.warmup.models[model],methods=Object.keys(source.series);
  const points=[...svg.matchAll(/data-s4-warmup-point="(\d+)" cx="([\d.]+)" cy="([\d.]+)"/g)];assert.equal(points.length,12);
  for(const p of points){const index=Number(p[1]),si=Math.floor(index/4),j=index%4,value=source.series[methods[si]][j];near(Number(p[2]),g.left+source.warmup_percent[j]/15*(g.right-g.left));near(Number(p[3]),g.bottom+(value-g.ymin)/(g.ymax-g.ymin)*(g.top-g.bottom));assert.ok(svg.includes('PPL '+value.toFixed(3)));}
  const best=[...svg.matchAll(/data-s4-best="(\d+)"/g)].map(m=>Number(m[1]));assert.equal(best.length,3);
  methods.forEach((method,i)=>assert.equal(best[i],4*i+source.series[method].indexOf(Math.min(...source.series[method]))));
  for(const path of svg.matchAll(/data-s4-warmup-series="\d+" d="([^"]+)"/g))assert.equal((path[1].match(/[ML]/g)||[]).length,4);
 }
 assert.deepEqual(Object.values(data.warmup.models['600M'].series).map(values=>values[2]),[15.370,15.252,15.300]);
});
test('numeric drawing extents stay inside viewBoxes at narrow widths',()=>{
 for(const kind of ['standard','efficiency','warmup'])for(const view of kind==='efficiency'?copy.efficiency.metrics.map(m=>m.key):copy[kind].models)for(const width of [240,264,284,334,380,780]){
  const svg=c.plot(data,kind,view,copy,width),g=c.dimensions(kind,view,width);
  assert.ok(!/(?:x|y|cx|cy|d|viewBox)="[^"]*(?:NaN|Infinity)/.test(svg));
  for(const m of svg.matchAll(/(?:\s|^)(x|x1|x2|cx)="([\d.]+)"/g))assert.ok(Number(m[2])>=0&&Number(m[2])<=g.w,`${kind} ${view} ${m[0]}`);
  for(const m of svg.matchAll(/(?:\s|^)(y|y1|y2|cy)="([\d.]+)"/g))assert.ok(Number(m[2])>=0&&Number(m[2])<=g.h,`${kind} ${view} ${m[0]}`);
 }
});
console.log(JSON.stringify({status:'passed',groups,actual_browser_or_text_layout:false},null,2));
