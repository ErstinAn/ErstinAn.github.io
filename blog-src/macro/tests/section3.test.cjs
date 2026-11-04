/* Runs the exact numeric code embedded in the delivered HTML. No dependencies. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'..'),root=path.join(__dirname,'fixtures'),html=fs.readFileSync(path.join(out,'index.html'),'utf8');
const code=html.split('<script id="section-3-script">(()=>{\n')[1].split('\nconst fmt =')[0],ctx=vm.createContext({});
vm.runInContext(code+'\nthis.core=BF16;',ctx);const q=ctx.core;
const cases=JSON.parse(fs.readFileSync(path.join(root,'numerical_test_cases.json'),'utf8'));
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
for(const c of cases.cases)test(c.id,()=>{const r=q.update(c.w,c.delta);assert.equal(r.stored,c.expected_stored_value);assert.equal(r.realized,c.expected_realized_delta);});
test('power-of-two asymmetric neighbors',()=>{const n=q.neighbors(1);assert.equal(n.leftGap,.00390625);assert.equal(n.rightGap,.0078125);});
test('both sides of even midpoint without FP32 double rounding',()=>{const mid=1.50390625,eps=Number.EPSILON;assert.equal(q.quantize(mid-eps),1.5);assert.equal(q.quantize(mid),1.5);assert.equal(q.quantize(mid+eps),1.5078125);assert.equal(Math.fround(mid+eps),mid);});
test('both sides of odd midpoint',()=>{const mid=1.51171875,eps=Number.EPSILON;assert.equal(q.quantize(mid-eps),1.5078125);assert.equal(q.quantize(mid),1.515625);assert.equal(q.quantize(mid+eps),1.515625);});
test('left midpoint and signed updates',()=>{assert.equal(q.update(1.5,-.00390625).stored,1.5);assert.equal(q.update(1.5,0).realized,0);});
test('Gaussian supplied case and distinct statistics',()=>{const m=cases.threshold_model,g=q.gaussian(m.rho_over_tau);assert.ok(Math.abs(g.pDrop-m.expected_p_drop)<1e-14);assert.ok(Math.abs(g.retained-m.expected_retained_absolute_update_fraction)<1e-14);assert.ok(Math.abs(m.tau-1/510)<1e-17);});
test('Gaussian limits and monotonicity',()=>{const lo=q.gaussian(.01),hi=q.gaussian(100);assert.ok(lo.pDrop>hi.pDrop);assert.ok(lo.retained<hi.retained);assert.ok(lo.pDrop>.99);assert.ok(hi.retained>.999);});
test('all 6 source endpoint values and displayed table values',()=>{const expected=JSON.parse(fs.readFileSync(path.join(root,'precision_gap.json'),'utf8')),actual=JSON.parse(html.match(/<script id="figure-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);for(const r of expected.records){assert.equal(actual.models[r.model].methods[r.optimizer].reported_validation_gap,r.delta_val_loss);assert.ok(html.includes('>+'+r.delta_val_loss.toFixed(4)+'</td>'));}});
test('finite declared scope rejects unsupported inputs',()=>{for(const x of [NaN,Infinity,-Infinity,0,-1,.249,4.001])assert.throws(()=>q.quantize(x));});
// Independent exhaustive BF16 grid (not using implementation decode/bracket).
const grid=[];for(let e=-3;e<=3;e++)for(let m=128;m<256;m++)grid.push({v:m*2**(e-7),even:m%2===0});
let sampled=0;
test('independent grid: 2,049 candidates plus 1,536 midpoint probes',()=>{
  const reference=x=>{let best=null,dist=Infinity;for(const n of grid){const d=Math.abs(x-n.v);if(d<dist||(d===dist&&n.even)){dist=d;best=n.v;}}return best;};
  for(let i=0;i<=2048;i++){const x=.25+3.75*i/2048;assert.equal(q.quantize(x),reference(x));sampled++;}
  for(let i=0;i<grid.length-1;i++){const mid=(grid[i].v+grid[i+1].v)/2;if(mid<.25||mid>4)continue;for(const x of [mid-mid*Number.EPSILON,mid,mid+mid*Number.EPSILON]){assert.equal(q.quantize(x),reference(x));sampled++;}}
});
test('Gaussian zero, missing, and extreme positive inputs',()=>{assert.equal(q.gaussian(0).pDrop,1);assert.equal(q.gaussian(0).retained,0);for(const n of [null,undefined,NaN,Infinity,-1])assert.equal(q.gaussian(n),null);for(const n of [1e-300,1e-12,1e12,1e300]){const r=q.gaussian(n);for(const x of Object.values(r)){assert.ok(Number.isFinite(x));assert.ok(x>=0&&x<=1);}}});
console.log(JSON.stringify({result:'PASS',groups:checks,independentSamples:sampled,sourceCases:cases.cases.length},null,2));
