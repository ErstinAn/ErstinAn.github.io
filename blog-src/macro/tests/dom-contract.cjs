/* Minimal DOM contract for delivered inline scripts. Not a browser or layout engine. */
const vm=require('node:vm'),assert=require('node:assert/strict');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const decode=s=>String(s).replace(/<[^>]*>/g,'').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#160;','\u00a0');
function createDOM(html,fixture){
  const writes=new Set(),queue=[],listeners={},stages=[];
  let focused=null;
  class Element{
    constructor(row){
      this.tag=row.tag;this.attrs={...row.attrs};this.id=this.attrs.id;this.parentIndex=row.parent;this.dataset={};
      for(const [key,value] of Object.entries(this.attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
      this.events={};this._value=String(row.value);this._innerHTML=row.innerHTML;this._textContent=row.textContent;
      this.checked='checked'in this.attrs;this.disabled='disabled'in this.attrs;this.hidden='hidden'in this.attrs;this.open='open'in this.attrs;this.clientWidth=780;
      this.classes=new Set((this.attrs.class||'').split(' '));this.classList={toggle:(key,value)=>value?this.classes.add(key):this.classes.delete(key)};
    }
    get value(){return this._value;}set value(value){this._value=String(value);}
    get parentElement(){return this.parent;}
    get tagName(){return this.tag.toUpperCase();}
    contains(other){for(let node=other;node;node=node.parent)if(node===this)return true;return false;}
    get innerHTML(){return this._innerHTML;}set innerHTML(value){this._innerHTML=String(value);this._textContent=decode(value);if(this.id)writes.add(this.id);}
    get textContent(){return this._textContent;}set textContent(value){this._textContent=String(value);this._innerHTML=escape(value);if(this.id)writes.add(this.id);}
    setAttribute(key,value){this.attrs[key]=String(value);}
    getAttribute(key){return this.attrs[key]??null;}
    addEventListener(type,handler){assert.ok(!this.events[type],`duplicate ${type} binding on ${this.id}`);this.events[type]=handler;}
    focus(){focused=this.id;}
    setPointerCapture(){}
    querySelector(selector){
      if(selector==='svg'){
        if(!this.innerHTML.includes('<svg'))return null;
        const dataset=Object.fromEntries([...this.innerHTML.matchAll(/data-(left|right|width|ymax)="([^"]+)"/g)].map(m=>[m[1],m[2]]));
        return {dataset,getBoundingClientRect:()=>({left:0,width:this.clientWidth})};
      }
      return query(selector,this)[0]??null;
    }
    querySelectorAll(selector){return query(selector,this);}
    fire(type,args={}){let prevented=false;assert.ok(this.events[type],`${this.id||JSON.stringify(this.dataset)} has ${type}`);this.events[type]({target:this,preventDefault(){prevented=true;},...args});flush();return prevented;}
  }
  const elements=fixture.map(row=>new Element(row));
  for(const el of elements)el.parent=el.parentIndex===null?null:elements[el.parentIndex];
  const nodes=new Map(elements.filter(el=>el.id).map(el=>[el.id,el]));
  const dataText=html.match(/<script id="figure-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  nodes.set('figure-data',{textContent:dataText});
  function within(el,scope){if(!scope)return true;for(let parent=el.parent;parent;parent=parent.parent)if(parent===scope)return true;return false;}
  function query(selector,scope=null){
    const candidates=elements.filter(el=>within(el,scope));
    if(selector==='a')return candidates.filter(el=>el.tag==='a');
    if(selector==='.chart.linked')return candidates.filter(el=>el.classes.has('chart')&&el.classes.has('linked'));
    if(selector==='button:disabled,input:disabled,select:disabled')return candidates.filter(el=>['button','input','select'].includes(el.tag)&&el.disabled);
    let m=selector.match(/^\[data-([\w-]+)\]$/);if(m)return candidates.filter(el=>('data-'+m[1])in el.attrs);
    m=selector.match(/^\[id="([^"]+)"\]$/);if(m)return candidates.filter(el=>el.id===m[1]);
    throw Error('Unsupported DOM contract selector '+selector);
  }
  function flush(){while(queue.length)queue.shift()();}
  const win={events:{},addEventListener(type,handler){(listeners[type]??=[]).push(handler);this.events[type]=()=>listeners[type].forEach(fn=>fn());}};
  const context=vm.createContext({document:{getElementById:id=>nodes.get(id)??null,querySelectorAll:selector=>query(selector)},window:win,requestAnimationFrame:fn=>{queue.push(fn);return queue.length;}});
  for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
    if(script[1].includes('application/json'))continue;
    vm.runInContext(script[2],context);flush();
    stages.push({script:script[1],s0Disabled:elements.filter(el=>el.id?.startsWith('s0-')&&['button','input','select'].includes(el.tag)).map(el=>el.disabled)});
  }
  const groups=name=>elements.filter(el=>name in el.dataset),button=(group,value)=>groups(group).find(el=>el.dataset[group]===value),$=id=>nodes.get(id);
  return {elements,nodes,writes,context,stages,dataText,win,flush,groups,button,$,focused:()=>focused};
}
module.exports={createDOM};
