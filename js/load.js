/* JYYR shared runtime loader */
(function(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if(!window.jyyrIcon)return;
    document.querySelectorAll('[data-icon]').forEach(n=>{
      const name=n.dataset.icon;
      const holder=document.createElement('span');
      holder.innerHTML=window.jyyrIcon(name);
      const el=holder.firstElementChild;
      if(el)n.replaceWith(el);
    });
  });
})();
