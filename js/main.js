/* ==========================================================
   SHARED ORDER HISTORY MODEL
   Used by both the database layer and index history UI.
========================================================== */
let historyData = [];

function buildHistoryItem(order, products = []) {
  const product = products.find(p => p.id === order.productId);
  return {
    waktu: order.time ? new Date(order.time).toLocaleString("id-ID") : "-",
    user: order.target || "-",
    layanan: order.layanan || "-",
    jumlah: Number(order.jumlah || 0),
    total: Number(order.total || 0),
    id: order.id,
    value: {
      layanan: product ? `${product.price}|${product.max}|${product.min}` : "",
      metode: order.metode,
      productId: order.productId || null
    },
    status: order.status,
    buyer: order.buyer,
    productId: order.productId || null
  };
}

/* ==========================================================
   JYYR ACCOUNT / USER / ADMIN SYSTEM — SUPABASE EDITION
   Supabase Auth + PostgreSQL + RLS are the source of truth.
   localStorage is used only as a short-lived UI cache.
========================================================== */
(async function(){
  const KEYS={products:'jyyr_cache_products',orders:'jyyr_cache_orders',levels:'jyyr_cache_levels',broadcasts:'jyyr_cache_broadcasts',payments:'jyyr_cache_payments'};
  const JYYR_CACHE_VERSION='4.9.4';
  const JYYR_LEGACY_KEYS=[
    'saldo','user','riwayat','history','jyyr_session',
    'jyyr_products','jyyr_orders','jyyr_levels','jyyr_broadcasts','jyyr_payments','jyyr_users'
  ];
  const JYYR_CACHE_KEYS=[...Object.values(KEYS),'jyyr_cache_users',...JYYR_LEGACY_KEYS];
  const purgeStaleJyyRCache=()=>{
    try{
      const current=localStorage.getItem('jyyr_cache_version');
      if(current!==JYYR_CACHE_VERSION){
        JYYR_CACHE_KEYS.forEach(k=>localStorage.removeItem(k));
        localStorage.setItem('jyyr_cache_version',JYYR_CACHE_VERSION);
      }
    }catch(_){/* private/restricted storage: database remains source of truth */}
  };
  purgeStaleJyyRCache();
  const { createClient } = window.supabase;
  const supabaseClient = createClient(window.JYYR_SUPABASE_URL, window.JYYR_SUPABASE_PUBLISHABLE_KEY);
  window.jyyrSupabase=supabaseClient;
  window.jyyrDBReady=false;
  window._jyyrAccount=null;
  window.JYYRState={
    session:null, account:null, role:'user',
    products:[], orders:[], payments:[], levels:[], broadcasts:[], users:[],
    ui:{popup:null,loading:false,activeAdminTab:null}
  };

  const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(e){return d}};
  const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
  const mapProduct=p=>({id:p.id,name:p.name,category:p.category,price:Number(p.price),max:Number(p.max_quantity),min:Number(p.min_quantity),icon:p.icon,active:p.active,sortOrder:Number(p.sort_order??0)});
  const mapLevel=l=>({id:l.id,name:l.name,minPoint:Number(l.min_point),reward:Number(l.reward)});
  const mapBroadcast=b=>({id:b.id,title:b.title,message:b.message,time:b.created_at});
  const mapOrder=o=>({id:o.id,userId:o.user_id,buyer:o.profiles?.username||o.product_name,layanan:o.product_name,jumlah:Number(o.quantity),total:Number(o.total),metode:o.payment_method,status:o.status,time:o.created_at,productId:o.product_id,target:o.target});
  const mapPayment=p=>({id:p.id,orderId:p.order_id,method:p.method,proofPath:p.proof_path,status:p.status,reviewedBy:p.reviewed_by,reviewedAt:p.reviewed_at,createdAt:p.created_at,order:p.orders||null});

  async function loadFromDatabase(){
    const {data:{session},error:sessionError}=await supabaseClient.auth.getSession();
    if(sessionError) throw sessionError;
    if(!session){ window.location.replace('login.html'); return false; }
    const uid=session.user.id;
    const {data:profile,error:profileError}=await supabaseClient.from('profiles').select('*').eq('id',uid).single();
    if(profileError) throw profileError;
    window._jyyrAccount={id:profile.id,name:profile.full_name,username:profile.username,role:profile.role,admin_level:profile.admin_level||null,saldo:Number(profile.saldo),point:Number(profile.point),createdAt:profile.created_at};
    window.JYYRState.session=session;
    window.JYYRState.account=window._jyyrAccount;
    window.JYYRState.role=window.jyyrRoleLabel(window._jyyrAccount);

    const [prodRes,levelRes,broadcastRes,orderRes,allProfilesRes,paymentRes]=await Promise.all([
      supabaseClient.from('products').select('*').order('category',{ascending:true}).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
      supabaseClient.from('levels').select('*').order('min_point',{ascending:true}),
      supabaseClient.from('broadcasts').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('orders').select('*,profiles(username)').order('created_at',{ascending:false}),
      window.jyyrHasAdminAccess(window._jyyrAccount) ? supabaseClient.from('profiles').select('*').order('created_at',{ascending:false}) : Promise.resolve({data:null,error:null}),
      window.jyyrHasAdminAccess(window._jyyrAccount) ? supabaseClient.from('payments').select('*,orders(id,user_id,product_name,target,quantity,total,payment_method,status,profiles(username))').order('created_at',{ascending:false}) : Promise.resolve({data:null,error:null})
    ]);
    for(const r of [prodRes,levelRes,broadcastRes,orderRes,allProfilesRes,paymentRes]) if(r.error) throw r.error;
    const products=(prodRes.data||[]).map(mapProduct);
    const levels=(levelRes.data||[]).map(mapLevel);
    const broadcasts=(broadcastRes.data||[]).map(mapBroadcast);
    const allOrders=(orderRes.data||[]).map(mapOrder);
    const visibleOrders=window.jyyrHasAdminAccess(window._jyyrAccount)?allOrders:allOrders.filter(o=>o.userId===uid);
    const users=(allProfilesRes.data||[]).map(u=>({id:u.id,name:u.full_name,username:u.username,role:u.role,saldo:Number(u.saldo),point:Number(u.point),createdAt:u.created_at}));
    set(KEYS.products,products); set(KEYS.levels,levels); set(KEYS.broadcasts,broadcasts); set(KEYS.orders,visibleOrders);
    if(window.jyyrHasAdminAccess(window._jyyrAccount)) set(KEYS.payments,(paymentRes.data||[]).map(mapPayment));
    if(window.jyyrHasAdminAccess(window._jyyrAccount)) set('jyyr_cache_users',users);
    window.JYYRState.products=products;
    window.JYYRState.levels=levels;
    window.JYYRState.broadcasts=broadcasts;
    window.JYYRState.orders=visibleOrders;
    window.JYYRState.payments=(paymentRes.data||[]).map(mapPayment);
    window.JYYRState.users=users;
    historyData=visibleOrders.filter(o=>o.userId===uid).map(o=>buildHistoryItem(o,products));
    localStorage.removeItem('jyyr_session');
    localStorage.removeItem('history');
    window.jyyrDBReady=true;
    return true;
  }

  window.currentAccount=()=>window._jyyrAccount;
  window.jyyrRoleLabel=u=>{
    if(!u)return 'user';
    const rawRole=String(u.role||'user').toLowerCase();
    const level=String(u.admin_level||'').toLowerCase();
    if(rawRole==='user')return 'user';
    if(level==='super_admin'||level==='owner'||rawRole==='super_admin')return 'owner';
    if(level==='readonly'||rawRole==='readonly')return 'readonly';
    return rawRole==='admin'?'admin':'user';
  };
  window.jyyrHasAdminAccess=u=>{
    const label=window.jyyrRoleLabel(u);
    return label==='owner'||label==='admin'||label==='readonly';
  };
  window.jyyrCanWriteAdmin=u=>{
    const label=window.jyyrRoleLabel(u);
    return label==='owner'||label==='admin';
  };
  window.openAuth=(mode='login')=>{ window.location.href='login.html'+(mode==='register'?'?mode=register':''); };
  window.closeAuth=()=>{};
  window.logoutUser=async()=>{
    try{await supabaseClient.auth.signOut();}
    catch(e){console.warn('logout',e);}
    finally{window.location.href='login.html';}
  };
  function updateAccountUI(){
    const u=currentAccount();
    const status=document.getElementById('accountStatus'); const adminBtn=document.getElementById('adminPanelBtn');
    if(status){
      const username=String(u?.username||'User').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
      status.innerHTML=u?`👤 <span class="account-username">${username}</span> <span class="account-role-sep">•</span> <span class="account-role">${jyyrRoleLabel(u)}</span>`:'👤 User • user';
    }
    if(adminBtn) adminBtn.style.display=(u&&window.jyyrHasAdminAccess(u))?'inline-flex':'none';
  }
  window.updateAccountUI=updateAccountUI;

  window.openDashboard=()=>{const u=currentAccount();if(!u)return openAuth('login');renderDashboard(u);document.getElementById('popupDashboard')?.classList.add('show');};
  window.closeDashboard=()=>document.getElementById('popupDashboard')?.classList.remove('show');
  function renderDashboard(u){
    const orders=get(KEYS.orders,[]).filter(o=>o.userId===u.id);
    const level=get(KEYS.levels,[]).slice().reverse().find(l=>u.point>=l.minPoint)||{name:'Basic'};
    document.getElementById('dashSaldo').textContent='Rp '+Number(u.saldo||0).toLocaleString('id-ID');
    document.getElementById('dashPoint').textContent=Number(u.point||0).toLocaleString('id-ID');
    document.getElementById('dashLevel').textContent=level.name;
    document.getElementById('dashOrders').textContent=orders.length;
    const bc=get(KEYS.broadcasts,[]).slice(0,10);
    document.getElementById('userNotifications').innerHTML=bc.length?bc.map(b=>`<div class="broadcast-item"><b>${escapeHtml(b.title)}</b><br>${escapeHtml(b.message)}<br><small>${new Date(b.time).toLocaleString('id-ID')}</small></div>`).join(''):'Belum ada notifikasi.';
    document.getElementById('userOrders').innerHTML=orders.length?orders.slice().reverse().map(o=>`<div class="order-item"><div class="order-id">${escapeHtml(o.id)}</div><div class="order-service">${escapeHtml(o.layanan)} <span class="order-qty">• ${Number(o.jumlah).toLocaleString('id-ID')}</span></div><div class="order-bottom"><span>Rp ${Number(o.total).toLocaleString('id-ID')}</span><span>•</span><span class="badge">${escapeHtml(o.status||'pending')}</span></div></div>`).join(''):'Belum ada pesanan.';
  }

  window.openAdminPanel=()=>{
    const u=currentAccount();
    if(!u||!window.jyyrHasAdminAccess(u))return openAuth('login');
    if(!/admin\.html(?:$|[?#])/.test(location.pathname+location.search)){
      location.href='admin.html?tab=overview'; return;
    }
    const welcome=document.getElementById('adminWelcome');
    if(welcome)welcome.textContent='Login sebagai '+u.username+' • '+jyyrRoleLabel(u);
    const popup=document.getElementById('popupAdmin');
    if(popup)popup.classList.add('show');
    const requested=new URLSearchParams(location.search).get('tab');
    const allowed=['overview','products','users','orders','payments','levels','broadcast','notifications','reports','security','system','support'];
    const tab=allowed.includes(requested)?requested:'overview';
    if(typeof window.adminTab==='function') window.adminTab(tab);
  };
  window.closeAdminPanel=()=>{const popup=document.getElementById('popupAdmin');if(popup)popup.classList.remove('show');};



  function renderServiceDropdown(){const box=document.getElementById('serviceList');if(!box)return;const ps=get(KEYS.products,[]).filter(p=>p.active).slice().sort((a,b)=>{const rank={tiktok:0,instagram:1};const ac=String(a.category||'').trim().toLowerCase(),bc=String(b.category||'').trim().toLowerCase();return (rank[ac]??2)-(rank[bc]??2)||((a.sortOrder??0)-(b.sortOrder??0));});if(!ps.length){box.innerHTML='<div class="dropdown-item">Tidak ada produk aktif</div>';return;}const groups={};ps.forEach(p=>(groups[p.category]??=[]).push(p));box.innerHTML=Object.entries(groups).map(([cat,arr])=>`<div class="dropdown-item" style="pointer-events:none;opacity:.6"><b>${escapeHtml(cat)}</b></div>${arr.map(p=>`<div class="dropdown-item" data-id="${p.id}" data-icon="${escapeHtml(safeImageUrl(p.icon))}" data-text="${escapeHtml(p.name)} — Rp${p.price} / 1 (Min ${p.min})" data-value="${p.price}|${p.max}|${p.min}" onclick="selectItem(this,event)"><img src="${escapeHtml(safeImageUrl(p.icon))}" width="18" style="vertical-align:middle;margin-right:6px">${escapeHtml(p.name)} : Rp${p.price}</div>`).join('')}`).join('');const first=ps[0];document.getElementById('layanan').value=`${first.price}|${first.max}|${first.min}`;document.getElementById('layanan').dataset.productId=first.id||'';document.getElementById('selectedText').innerHTML=`<img src="${escapeHtml(safeImageUrl(first.icon))}" width="18" style="vertical-align:middle;margin-right:6px">${escapeHtml(first.name)} — Rp${first.price} / 1 (Min ${first.min})`;updateHarga();}
  function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function safeImageUrl(value){try{const u=new URL(String(value||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(_){return '';}}
  window.escapeHtml=escapeHtml;

  // Order/payment entry points remain defined once in index.js.

  window.simpanRiwayat=async function(user,layanan,jumlah,total,id,value){
    const u=currentAccount();
    if(!u) throw new Error('Sesi login tidak ditemukan.');

    const productId=(value?.productId)||document.getElementById('layanan')?.dataset.productId||null;
    if(!productId) throw new Error('Produk tidak ditemukan. Silakan pilih produk lagi.');

    const paymentMethod=value?.metode==='qris'?'qris':'dana';
    const target=String(user||'').trim();
    const qty=Number(jumlah);

    if(!target || target.length < 3 || target.length > 500) throw new Error('Username/link target tidak valid.');
    if(!Number.isInteger(qty) || qty <= 0) throw new Error('Jumlah order tidak valid.');

    let proofPath=null;
    let createdOrderId=null;

    try{
      // IMPORTANT: harga, min/max quantity, nama produk, dan total dihitung
      // sepenuhnya oleh database. Nilai dari DOM/browser tidak dipercaya.
      const {data:order,error}=await supabaseClient.rpc('create_order_secure',{
        p_order_id:id,
        p_product_id:productId,
        p_target:target,
        p_quantity:qty,
        p_payment_method:paymentMethod
      });
      if(error) throw error;
      if(!order?.id) throw new Error('Database tidak mengembalikan order.');
      createdOrderId=order.id;

      if(paymentMethod==='qris'){
        const file=document.getElementById('bukti')?.files?.[0];
        if(!file) throw new Error('Bukti QRIS belum dipilih.');
        const allowedTypes=['image/jpeg','image/png','image/webp'];
        if(!allowedTypes.includes(file.type)) throw new Error('Format bukti harus JPG, PNG, atau WEBP.');
        if(file.size > 2 * 1024 * 1024) throw new Error('Ukuran bukti maksimal 2 MB.');

        const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
        proofPath=`${u.id}/${id}.${ext}`;
        const upload=await supabaseClient.storage.from('payment-proofs').upload(proofPath,file,{upsert:false,contentType:file.type});
        if(upload.error) throw upload.error;
      }

      const {data:payment,error:payError}=await supabaseClient.from('payments').insert({
        order_id:id,
        method:paymentMethod,
        proof_path:proofPath,
        status:'pending'
      }).select().single();
      if(payError) throw payError;

      const mappedOrder={
        ...mapOrder(order),
        total:Number(order.total),
        jumlah:Number(order.quantity),
        unitPrice:Number(order.unit_price)
      };
      const os=get(KEYS.orders,[]);
      os.unshift(mappedOrder);
      set(KEYS.orders,os);

      // Supabase adalah source of truth. Hanya cache order utama yang diperbarui;
      // riwayat ditarik ulang dari tabel orders saat dibuka.
      window._jyyrAccount=u;
      return {order,payment};
    }catch(e){
      if(proofPath){
        try{await supabaseClient.storage.from('payment-proofs').remove([proofPath]);}catch(_){}
      }
      // RPC order is rolled back only inside its own transaction. If payment
      // creation/upload fails afterwards, remove the still-pending order.
      if(createdOrderId){
        try{await supabaseClient.rpc('cancel_pending_order',{p_order_id:createdOrderId});}catch(_){}
      }
      throw e;
    }
  };

  try{
    const ok=await loadFromDatabase();
    if(!ok)return;
    renderServiceDropdown(); updateAccountUI();
  }catch(e){
    console.error(e);
    showError('Gagal memuat database Supabase: '+(e?.message||'periksa konfigurasi/RLS.'));
    setTimeout(()=>window.location.replace('login.html'),2500);
  }
})();
