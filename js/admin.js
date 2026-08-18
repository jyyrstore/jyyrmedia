document.addEventListener('DOMContentLoaded',()=>{
  const allowedTabs=['overview','products','users','orders','payments','levels','broadcast','notifications','reports','security','system','support'];
  let tries=0;
  const boot=()=>{
    const u=window.currentAccount?.();
    if(!u){
      if(++tries<100) return setTimeout(boot,100);
      return;
    }
    const role=window.jyyrRoleLabel?.(u)||'user';
    if(!['owner','admin','readonly'].includes(role)){
      location.replace('index.html'); return;
    }
    const text='Login sebagai '+u.username+' • '+role;
    document.getElementById('adminPageWelcome').textContent=text;
    document.getElementById('adminWelcome').textContent=text;
    const requested=new URLSearchParams(location.search).get('tab');
    const tab=allowedTabs.includes(requested)?requested:'overview';
    if(typeof window.adminTab==='function') window.adminTab(tab);
  };
  boot();
});
