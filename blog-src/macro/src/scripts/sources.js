// Keep native disclosure controls; reveal a referenced source before navigation.
(()=>{
 const footer=document.getElementById('article-sources');
 function sourceTarget(hash){
  if(!hash||hash[0]!=='#')return;
  let id;try{id=decodeURIComponent(hash.slice(1));}catch{return;}
  const target=document.getElementById(id);
  return target&&footer.contains(target)?target:null;
 }
 function reveal(hash){
  const target=sourceTarget(hash);
  if(!target)return;
  for(let node=target;node;node=node.parentElement){
   if(node.tagName==='DETAILS')node.open=true;
   if(node===footer)break;
  }
 }
 document.querySelectorAll('a').forEach(anchor=>{
  const hash=anchor.getAttribute('href');
  if(sourceTarget(hash))anchor.addEventListener('click',()=>reveal(hash));
 });
 window.addEventListener('hashchange',()=>reveal(window.location?.hash));
 reveal(window.location?.hash);
})();
