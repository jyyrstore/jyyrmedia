(function(){
  const rup=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function go(tab){
    const allowed=['overview','products','users','orders','payments','levels','broadcast','notifications','reports','security','system','support'];
    if(!allowed.includes(tab)) return;
    location.assign('admin.html?tab='+encodeURIComponent(tab));
  }
  window.openAdminTab=go;

  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  const setLoading=()=>{
    setText('dashProducts','—'); setText('dashUsers','—'); setText('dashOrders','—');
    setText('dashRevenue','Rp —'); setText('dashPending','—');
    setText('productStatus','Memuat...'); setText('orderStatus','Memuat...');
  };

  async function render(){
    const u=window.currentAccount?.();
    if(!u) return;
    if(!['owner','admin','readonly'].includes(window.jyyrRoleLabel?.(u)||'user')){ location.replace('index.html'); return; }
    setText('dashboardWelcome','Login sebagai '+(u.username||'-'));
    setText('accountStatusDash','Admin • '+(u.username||'-'));
    setText('dbStatus',window.jyyrDBReady?'Terhubung':'Memuat...');
    setText('systemStatus',window.jyyrDBReady?'● Online':'● Memuat');
    if(!window.jyyrSupabase){ setLoading(); return; }
    try{
      const db=window.jyyrSupabase;
      const [productsRes,usersRes,ordersRes,paymentsRes,recentRes]=await Promise.all([
        db.from('products').select('id,active').eq('active',true),
        db.from('profiles').select('id,role').eq('role','user'),
        db.from('orders').select('id,total,status,created_at'),
        db.from('payments').select('id,status'),
        db.from('orders').select('id,product_name,total,status,created_at,profiles(username)').order('created_at',{ascending:false}).limit(5)
      ]);
      for(const r of [productsRes,usersRes,ordersRes,paymentsRes,recentRes]) if(r.error) throw r.error;
      const products=productsRes.data||[];
      const users=usersRes.data||[];
      const orders=ordersRes.data||[];
      const payments=paymentsRes.data||[];
      const latest=recentRes.data||[];
      const revenue=orders.filter(o=>['success','completed'].includes(String(o.status||'').toLowerCase())).reduce((n,o)=>n+Number(o.total||0),0);
      const pending=payments.filter(p=>String(p.status||'').toLowerCase()==='pending').length;
      setText('dashProducts',products.length.toLocaleString('id-ID'));
      setText('dashUsers',users.length.toLocaleString('id-ID'));
      setText('dashOrders',orders.length.toLocaleString('id-ID'));
      setText('dashRevenue',rup(revenue));
      setText('dashPending',pending.toLocaleString('id-ID'));
      setText('productStatus',products.length+' aktif');
      setText('orderStatus',orders.length+' transaksi');
      setText('dbStatus','Terhubung');
      setText('systemStatus','● Online');
      const list=document.getElementById('recentOrders');
      list.innerHTML=latest.length?latest.map(o=>{
        const username=o.profiles?.username||'-';
        return `<div class="recent-item"><div class="recent-main"><b>${esc(o.product_name||'Produk')}</b><small>${esc(o.id||'-')} • ${esc(username)}</small></div><div class="recent-side"><strong>${rup(o.total)}</strong><span class="recent-status">${esc(o.status||'pending')}</span></div></div>`;
      }).join(''):'<div class="dashboard-empty">Belum ada transaksi.</div>';
    }catch(e){
      console.error('[JYYR Dashboard]',e);
      setText('dbStatus','Error');
      setText('systemStatus','● Gagal memuat');
      setText('productStatus','Error');
      setText('orderStatus','Error');
      document.getElementById('recentOrders').innerHTML='<div class="dashboard-empty">Gagal memuat data dashboard.</div>';
    }
  }

  const timer=setInterval(()=>{
    if(window.jyyrDBReady){clearInterval(timer);render();}
  },100);
  setTimeout(()=>{clearInterval(timer);if(!window.jyyrDBReady){setText('systemStatus','● Gagal memuat');document.getElementById('recentOrders').innerHTML='<div class="dashboard-empty">Koneksi database belum siap.</div>'; }},15000);
  window.addEventListener('focus',()=>{if(window.jyyrDBReady)render();});
})();
