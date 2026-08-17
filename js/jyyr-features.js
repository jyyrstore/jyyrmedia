
/* =========================================================
   JYYR STORE V4 FEATURE PACK
   No external API. Supabase/Auth/Storage only.
   Loaded after app.js.
========================================================= */
(function(){
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const rup=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
  const fmt=d=>d?new Date(d).toLocaleString('id-ID'):'-';
  const client=()=>window.jyyrSupabase;
  const account=()=>window.currentAccount?.();
  let featureReady=false; let deferredInstallPrompt=null;
  let adminCache={users:[],products:[],orders:[],payments:[],levels:[],settings:null};

  async function ready(){
    for(let i=0;i<120;i++){
      if(window.jyyrDBReady && client() && account()) return true;
      await wait(100);
    }
    return false;
  }
  async function q(promise){const r=await promise;if(r.error)throw r.error;return r.data;}
  function toast(msg,type='ok'){
    if(window.showSuccess && type==='ok') return window.showSuccess(msg);
    if(window.showError) return window.showError(msg);
    const n=document.createElement('div');n.className='jyyr-fallback-toast '+(type==='err'?'err':'ok');n.textContent=String(msg||'');document.body.appendChild(n);setTimeout(()=>n.remove(),3200);
  }
  function isAdmin(){
    const u=account();
    return !!u && ['owner','admin','readonly'].includes(window.jyyrRoleLabel?.(u));
  }
  function isWriter(){
    const u=account();
    return !!u && ['owner','admin'].includes(window.jyyrRoleLabel?.(u));
  }
  function adminDialog(mode, title, message='', value='', options={}){
    return new Promise(resolve=>{
      const id='jyyrAdminDialog'; document.getElementById(id)?.remove();
      const box=document.createElement('div'); box.id=id; box.className='popup show jyyr-feature-popup';
      const multiline=options.multiline===true;
      const input=mode==='prompt' ? (multiline
        ? `<textarea id="jyyrAdminDialogInput" class="input admin-dialog-input" rows="5" placeholder="${esc(options.placeholder||'')}">${esc(value??'')}</textarea>`
        : `<input id="jyyrAdminDialogInput" class="input admin-dialog-input" value="${esc(value??'')}" placeholder="${esc(options.placeholder||'')}" ${options.type==='number'?'inputmode="decimal"':''} ${options.type==='password'?'type="password"':''}>`) : '';
      const okLabel=options.okLabel||'Lanjutkan', cancelLabel=options.cancelLabel||'Batal';
      box.innerHTML=`<div class="popup-box feature-box admin-dialog-box"><div class="feature-head"><div><h3>${esc(title)}</h3>${message?`<p class="admin-dialog-message">${esc(message)}</p>`:''}</div><button type="button" class="btn-close" aria-label="Tutup">${jyyrIcon('close')}</button></div>${input}<div class="popup-actions admin-dialog-actions"><button type="button" class="admin-confirm-cancel" id="jyyrAdminDialogCancel">${esc(cancelLabel)}</button><button type="button" class="admin-confirm-ok${options.danger?' admin-confirm-danger':''}" id="jyyrAdminDialogOk">${esc(okLabel)}</button></div></div>`;
      document.body.appendChild(box);
      const close=result=>{box.remove();resolve(result);};
      box.querySelector('.btn-close').onclick=()=>close(null);
      box.querySelector('#jyyrAdminDialogCancel').onclick=()=>close(null);
      box.querySelector('#jyyrAdminDialogOk').onclick=()=>{
        if(mode==='confirm') return close(true);
        const el=box.querySelector('#jyyrAdminDialogInput'); let v=el?.value??'';
        if(options.trim!==false) v=v.trim();
        if(options.required && !v){el?.focus();return;}
        if(options.type==='number'){const n=Number(v);if(!Number.isFinite(n)){el?.focus();return;}v=n;}
        close(v);
      };
      if(mode==='prompt') setTimeout(()=>box.querySelector('#jyyrAdminDialogInput')?.focus(),30);
      box.addEventListener('keydown',e=>{if(e.key==='Escape')close(null);if(e.key==='Enter'&&!multiline&&e.target?.id==='jyyrAdminDialogInput')box.querySelector('#jyyrAdminDialogOk')?.click();});
    });
  }
  const adminPrompt=(title,value='',options={})=>adminDialog('prompt',title,'',value,options);
  const adminConfirm=(title,message='',options={})=>adminDialog('confirm',title,message,'',options);
  window.jyyrAdminPrompt=adminPrompt;
  window.jyyrAdminConfirm=adminConfirm;

  async function getProfile(){
    const u=account(); if(!u||!client()) return null;
    const p=await q(client().from('profiles').select('*').eq('id',u.id).single());
    window._jyyrFeatureProfile=p;
    if(p && account() && String(account().id)===String(p.id)){
      // Keep the runtime account snapshot synchronized with the authoritative profile row.
      window._jyyrAccount={...account(),
        id:p.id,
        name:p.full_name,
        username:p.username,
        role:p.role,
        admin_level:p.admin_level||null,
        saldo:Number(p.saldo),
        point:Number(p.point),
        createdAt:p.created_at
      };
      window.updateAccountUI?.();
    }
    return p;
  }
  async function audit(action,type='',id=null,details={}){
    try{ await client().rpc('audit',{p_action:action,p_target_type:type,p_target_id:id,p_details:details}); }catch(e){ console.warn('audit',e); }
  }

  /* =======================================================
     USER WALLET / NOTIFICATION / PROFILE / SUPPORT
  ======================================================= */
  async function expirePoints(){
    try{await client().rpc('expire_points_for_user');}catch(e){console.warn(e);}
  }

  async function renderUserEnhancements(){
    if(!account()) return;
    await expirePoints();
    const p=await getProfile();
    const dash=document.querySelector('#popupDashboard .dashboard-box');
    if(!dash) return;
    if(!document.getElementById('jyyrUserTools')){
      const tools=document.createElement('div');
      tools.id='jyyrUserTools';
      tools.className='feature-grid';
      tools.innerHTML=`
        <button class="feature-btn" onclick="jyyrWallet()">${jyyrIcon('wallet')} Wallet</button>
        <button class="feature-btn" onclick="jyyrPointHistory()">${jyyrIcon('trophy')} Point</button><button class="feature-btn" onclick="jyyrLeaderboard()">${jyyrIcon('trophy')} Ranking</button>
        <button class="feature-btn" onclick="jyyrNotifications()">${jyyrIcon('bell')} Notifikasi</button>
        <button class="feature-btn" onclick="jyyrProfile()">${jyyrIcon('user')} Profil</button>
        <button class="feature-btn" onclick="jyyrTickets()">${jyyrIcon('message')} Bantuan</button><button class="feature-btn" onclick="jyyrBenefits()">${jyyrIcon('gift')} Benefit</button>
        <button class="feature-btn" onclick="jyyrFAQ()">${jyyrIcon('help')} FAQ</button>`;
      dash.insertBefore(tools,dash.querySelector('.dashboard-section'));
    }
    const ann=await q(client().from('store_settings').select('system_announcement,maintenance_mode,maintenance_message,store_open,kill_switch').eq('id',true).single()).catch(()=>null);
    if(ann && (ann.system_announcement||ann.maintenance_mode||!ann.store_open||ann.kill_switch)){
      let box=document.getElementById('jyyrSystemNotice');
      if(!box){box=document.createElement('div');box.id='jyyrSystemNotice';box.className='feature-notice';dash.insertBefore(box,dash.querySelector('.dashboard-section'));}
      box.innerHTML=ann.maintenance_mode||ann.kill_switch||!ann.store_open
        ? `<b>${jyyrIcon('alert')} Toko sementara ditutup</b><br>${esc(ann.maintenance_message||'Silakan coba lagi nanti.')}`
        : `<b>${jyyrIcon('broadcast')} Pengumuman</b><br>${esc(ann.system_announcement)}`;
    }
    if(p?.account_status!=='active'){
      await client().auth.signOut();
      location.href='login.html';
    }
  }

  window.jyyrWallet=async function(){
    const u=account(); if(!u)return;
    const [p,led,deps]=await Promise.all([
      getProfile(),
      q(client().from('balance_ledger').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(100)),
      q(client().from('wallet_deposits').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(50))
    ]);
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrFeaturePopup';
    box.innerHTML=`<div class="popup-box feature-box">
      <div class="feature-head"><h3>${jyyrIcon('wallet')} Wallet</h3><button class="btn-close" onclick="jyyrCloseFeature()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <div class="feature-wallet-balance">${rup(p.saldo)}</div>
      <div class="feature-grid">
        <button class="feature-btn" onclick="jyyrDeposit()">${jyyrIcon('plus')} Deposit Saldo</button>
        <button class="feature-btn" onclick="jyyrBalanceHistory()">${jyyrIcon('receipt')} Riwayat Saldo</button>
      </div>
      <h4>Riwayat saldo</h4>
      <div class="feature-list">${led.length?led.map(x=>`<div class="feature-row"><div><b>${esc(x.reason)}</b><small>${fmt(x.created_at)}</small></div><strong class="${Number(x.delta)>=0?'positive':'negative'}">${Number(x.delta)>=0?'+':''}${rup(x.delta)}</strong></div>`).join(''):'Belum ada transaksi saldo.'}</div>
      <h4>Deposit</h4>
      <div class="feature-list">${deps.length?deps.map(x=>`<div class="feature-row"><div><b>${rup(x.amount)} ${x.method.toUpperCase()}</b><small>${fmt(x.created_at)}</small></div><span class="status-pill">${esc(x.status)}</span></div>`).join(''):'Belum ada deposit.'}</div>
    </div>`;
    document.body.appendChild(box);
  };
  window.jyyrBalanceHistory=()=>jyyrWallet();
  window.jyyrCloseFeature=()=>document.getElementById('jyyrFeaturePopup')?.remove();

  window.jyyrDeposit=async function(){
    const s=await q(client().from('store_settings').select('*').eq('id',true).single());
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrDepositPopup';
    box.innerHTML=`<div class="popup-box feature-box">
      <div class="feature-head"><h3>${jyyrIcon('plus')} Deposit Saldo</h3><button class="btn-close" onclick="document.getElementById('jyyrDepositPopup')?.remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <p>Minimum ${rup(s.min_deposit)} • Maksimum ${rup(s.max_deposit)}${Number(s.deposit_bonus_percent)||Number(s.deposit_bonus_fixed)?` • Bonus deposit aktif`:''}</p>
      <input id="depositAmount" class="input" type="number" min="${s.min_deposit}" max="${s.max_deposit}" placeholder="Nominal deposit">
      <div class="payment"><div class="pay-item active" data-deposit-method="dana" onclick="jyyrDepositMethod(this,'dana')">DANA</div><div class="pay-item" data-deposit-method="qris" onclick="jyyrDepositMethod(this,'qris')">QRIS</div></div>
      <input id="depositMethod" type="hidden" value="dana">
      <label class="upload-box"><input id="depositProof" type="file" accept="image/jpeg,image/png,image/webp" onchange="jyyrDepositPreview(this)">${jyyrIcon('photoPlus')} Upload bukti</label>
      <img id="depositPreview" style="display:none;max-width:100%;border-radius:12px">
      <button class="success-btn full" onclick="jyyrSubmitDeposit()">Kirim Deposit</button>
    </div>`;
    document.body.appendChild(box);
  };
  window.jyyrDepositMethod=(el,m)=>{document.querySelectorAll('[data-deposit-method]').forEach(x=>x.classList.remove('active'));el.classList.add('active');document.getElementById('depositMethod').value=m;};
  window.jyyrDepositPreview=el=>{const f=el.files?.[0];if(!f)return;if(f.size>2*1024*1024)return toast('Bukti maksimal 2MB','err');const img=document.getElementById('depositPreview');img.src=URL.createObjectURL(f);img.style.display='block';};
  window.jyyrSubmitDeposit=async function(){
    let path=null;
    try{
      const amount=Number(document.getElementById('depositAmount').value), method=document.getElementById('depositMethod').value, file=document.getElementById('depositProof').files?.[0];
      const s=await q(client().from('store_settings').select('*').eq('id',true).single());
      if(amount<s.min_deposit||amount>s.max_deposit)throw new Error(`Nominal harus ${rup(s.min_deposit)} - ${rup(s.max_deposit)}`);
      if(!file)throw new Error(`Bukti ${method.toUpperCase()} wajib diupload.`);
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024)throw new Error('Bukti tidak valid.');
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
      path=`${account().id}/deposit-${crypto.randomUUID()}.${ext}`;
      const up=await client().storage.from('payment-proofs').upload(path,file,{upsert:false,contentType:file.type});
      if(up.error)throw up.error;
      await q(client().rpc('create_wallet_deposit',{p_amount:amount,p_method:method,p_proof_path:path}));
      document.getElementById('jyyrDepositPopup')?.remove();toast('Deposit berhasil dikirim dan menunggu verifikasi admin.');
    }catch(e){
      if(path){try{await client().storage.from('payment-proofs').remove([path]);}catch(_){} }
      toast(e.message||'Deposit gagal','err');
    }
  };

  window.jyyrPointHistory=async function(){
    const rows=await q(client().from('point_ledger').select('*').eq('user_id',account().id).order('created_at',{ascending:false}).limit(100));
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrPointPopup';
    box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('trophy')} Riwayat Point</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
    <div class="feature-list">${rows.length?rows.map(x=>`<div class="feature-row"><div><b>${esc(x.reason)}</b><small>${fmt(x.created_at)}${x.expires_at?` • Exp ${fmt(x.expires_at)}`:''}</small></div><strong>${Number(x.delta)>=0?'+':''}${Number(x.delta)}</strong></div>`).join(''):'Belum ada riwayat point.'}</div></div>`;
    document.body.appendChild(box);
  };

  window.jyyrLeaderboard=async()=>{const rows=await q(client().rpc('get_public_leaderboard',{p_limit:20}));const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('trophy')} Leaderboard</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div><div class="feature-list">${rows.map((x,i)=>`<div class="feature-row"><b>#${i+1} ${esc(x.username)}</b><strong>${Number(x.point).toLocaleString('id-ID')} point</strong></div>`).join('')}</div></div>`;document.body.appendChild(box);};
  window.jyyrNotifications=async function(){
    const rows=await q(client().from('notifications').select('*').or(`user_id.eq.${account().id},user_id.is.null`).or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`).order('created_at',{ascending:false}).limit(100));
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrNotificationPopup';
    box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('bell')} Notification Center</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
    <button class="mini-btn" onclick="jyyrMarkAllNotifications()">${jyyrIcon('check')} Tandai semua dibaca</button>
    <div class="feature-list">${rows.length?rows.map(x=>`<button class="feature-row notification-row ${x.read_at?'read':'unread'}" onclick="jyyrReadNotification('${x.id}')"><div><b>${esc(x.title)}</b><small>${esc(x.message)} • ${fmt(x.created_at)}</small></div><span>${x.read_at?jyyrIcon('check'):'●'}</span></button>`).join(''):'Belum ada notifikasi.'}</div></div>`;
    document.body.appendChild(box);
  };
  window.jyyrReadNotification=async id=>{await q(client().rpc('mark_notification_read',{p_id:id}));jyyrNotifications();};
  window.jyyrMarkAllNotifications=async()=>{await q(client().from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',account().id).is('read_at',null));jyyrNotifications();};

  window.jyyrProfile=async function(){
    const p=await getProfile();
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrProfilePopup';
    box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('user')} Profil</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <input id="selfName" class="input" value="${esc(p.full_name)}" placeholder="Nama lengkap">
      <input id="selfUsername" class="input" value="${esc(p.username)}" placeholder="Username" disabled>
      <input id="selfEmail" class="input" value="${esc((await client().auth.getUser()).data.user?.email||'')}" disabled>
      <button class="success-btn full" onclick="jyyrSaveProfile()">${jyyrIcon('check')} Simpan</button>
      <select class="input" onchange="jyyrSetTheme(this.value)"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select><button class="mini-btn full" onclick="jyyrChangePassword()">${jyyrIcon('lock')} Ganti Password</button><button class="mini-btn full" onclick="jyyrInstallPWA()">${jyyrIcon('dashboard')} Install JYYR ke HP</button><button class="mini-btn full" onclick="jyyrLogoutAll()">${jyyrIcon('logout')} Logout Semua Perangkat</button>
    </div>`;
    document.body.appendChild(box);document.querySelector('#jyyrProfilePopup select').value=localStorage.getItem('jyyr_ui_theme')||'dark';
  };
  window.jyyrSaveProfile=async()=>{
    try{
      const name=document.getElementById('selfName')?.value.trim();
      if(!name) return toast('Nama lengkap wajib diisi.','err');
      await q(client().from('profiles').update({full_name:name}).eq('id',account().id));
      await getProfile();
      document.getElementById('jyyrProfilePopup')?.remove();
      toast('Profil diperbarui.');
    }catch(e){toast(e.message,'err');}
  };
  window.jyyrLogoutAll=async()=>{if(!(await adminConfirm('Logout Semua Perangkat?','Semua sesi Supabase akan ditutup.',{okLabel:'Logout'})))return;await client().auth.signOut({scope:'global'});location.href='login.html';};
  window.jyyrChangePassword=async()=>{const p=await adminPrompt('Ganti Password','',{type:'password',required:true,placeholder:'Minimal 6 karakter'});if(p===null)return;if(String(p).length<6)return toast('Password minimal 6 karakter.','err');const r=await client().auth.updateUser({password:p});if(r.error)toast(r.error.message,'err');else toast('Password berhasil diubah.');};

  window.jyyrBenefits=async()=>{const p=await getProfile();const lv=await q(client().from('levels').select('*').lte('min_point',Number(p.point||0)).order('min_point',{ascending:false}).limit(1));const l=lv?.[0];const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('gift')} ${esc(l?.name||'Basic')} Benefit</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div><p>Diskon: <b>${Number(l?.discount_percent||0)}%</b></p><p>Minimal point level: ${Number(l?.min_point||0).toLocaleString('id-ID')}</p><p>Reward level: ${rup(l?.reward||0)}</p><p>Point: ${Number(p.point||0).toLocaleString('id-ID')}</p></div>`;document.body.appendChild(box);};
  window.jyyrTickets=async function(){
    const tickets=await q(client().from('support_tickets').select('*').eq('user_id',account().id).order('created_at',{ascending:false}));
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrTicketPopup';
    box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('message')} Support Ticket</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <button class="success-btn full" onclick="jyyrNewTicket()">${jyyrIcon('plus')} Buat Ticket</button>
      <div class="feature-list">${tickets.length?tickets.map(t=>`<button class="feature-row" onclick="jyyrOpenTicket('${t.id}')"><div><b>${esc(t.subject)}</b><small>${esc(t.priority)} • ${esc(t.status)} • ${fmt(t.created_at)}</small></div>›</button>`).join(''):'Belum ada ticket.'}</div>
    </div>`;
    document.body.appendChild(box);
  };
  window.jyyrNewTicket=async()=>{
    const subject=await adminPrompt('Subjek Ticket','',{required:true,placeholder:'Contoh: Pembayaran belum masuk'});if(subject===null)return;
    const message=await adminPrompt('Jelaskan Masalah','',{multiline:true,required:true,placeholder:'Jelaskan masalah secara detail'});if(message===null)return;
    try{const t=await q(client().from('support_tickets').insert({user_id:account().id,subject}).select().single());await q(client().from('ticket_messages').insert({ticket_id:t.id,sender_id:account().id,message}));toast('Ticket dibuat.');jyyrTickets();}catch(e){toast(e.message,'err');}
  };
  window.jyyrOpenTicket=async id=>{
    const t=await q(client().from('support_tickets').select('*').eq('id',id).single());
    const ms=await q(client().from('ticket_messages').select('*').eq('ticket_id',id).order('created_at',{ascending:true}));
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrOpenTicket';
    box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('message')} ${esc(t.subject)}</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <div class="feature-list">${ms.map(m=>`<div class="feature-row"><div><b>${m.sender_id===account().id?'Kamu':'Admin'}</b><small>${esc(m.message)} • ${fmt(m.created_at)}</small></div></div>`).join('')}</div>
      ${t.status!=='closed'?`<textarea id="ticketReply" class="input" placeholder="Balas..."></textarea><button class="success-btn full" onclick="jyyrReplyTicket('${id}')">Kirim</button>`:'<p>Ticket ditutup.</p>'}</div>`;
    document.body.appendChild(box);
  };
  window.jyyrReplyTicket=async id=>{const msg=document.getElementById('ticketReply').value.trim();if(!msg)return;await q(client().from('ticket_messages').insert({ticket_id:id,sender_id:account().id,message:msg}));document.getElementById('jyyrOpenTicket')?.remove();jyyrOpenTicket(id);};

  window.jyyrFAQ=async function(){
    const [faq,help]=await Promise.all([q(client().from('faq_items').select('*').eq('active',true).order('sort_order')),q(client().from('help_articles').select('*').eq('active',true).order('sort_order'))]);
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';
    box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('help')} FAQ & Help Center</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <h4>FAQ</h4>${faq.map(x=>`<details class="feature-detail"><summary>${esc(x.question)}</summary><p>${esc(x.answer)}</p></details>`).join('')}
      <h4>Help Center</h4>${help.map(x=>`<details class="feature-detail"><summary>${esc(x.title)}</summary><p>${esc(x.content)}</p></details>`).join('')}
    </div>`;document.body.appendChild(box);
  };


  /* ---------------- Theme / UI preference ---------------- */
  function applyTheme(v){
    const root=document.documentElement;
    root.dataset.jyyrTheme=v;
    if(v==='system') root.dataset.jyyrDark=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
    else root.dataset.jyyrDark=v;
    localStorage.setItem('jyyr_ui_theme',v); localStorage.removeItem('jyyr_theme');
  }
  window.jyyrSetTheme=v=>{applyTheme(v);toast('Tema disimpan.');};
  applyTheme(localStorage.getItem('jyyr_ui_theme')||'dark');

  /* =======================================================
     ADMIN DATA / NAVIGATION
  ======================================================= */
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;});
  window.jyyrInstallPWA=async()=>{if(!deferredInstallPrompt)return toast('Browser belum menyediakan tombol install. Gunakan menu browser > Install app.','err');deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;};
  const tabs={
    overview:['Dashboard','overview'],
    products:['Products','products'],
    users:['Users','users'],
    orders:['Orders','orders'],
    payments:['Payments','payments'],
    levels:['Loyalty','levels'],
    notifications:['Notifications','notifications'],
    reports:['Reports','reports'],
    security:['Security','security'],
    system:['System','system'],
    support:['Support','support'],
    broadcast:['Broadcast','broadcast']
  };
  function enhanceAdminSelects(){
    const root=document.getElementById('adminContent');
    if(!root)return;
    root.querySelectorAll('select.input:not([data-jyyr-customized])').forEach(select=>{
      if(!select.options.length)return;
      select.dataset.jyyrCustomized='1';
      const wrap=document.createElement('div');
      wrap.className='jyyr-custom-select';
      wrap.dataset.for=select.id||'';
      const button=document.createElement('button');
      button.type='button';
      button.className='jyyr-custom-select-button';
      button.setAttribute('aria-haspopup','listbox');
      button.setAttribute('aria-expanded','false');
      const menu=document.createElement('div');
      menu.className='jyyr-custom-select-menu';
      menu.setAttribute('role','listbox');
      const sync=()=>{
        const current=select.options[select.selectedIndex];
        button.textContent=current?.textContent||'';
        menu.querySelectorAll('[role="option"]').forEach(x=>x.classList.toggle('active',x.dataset.value===select.value));
      };
      [...select.options].forEach(option=>{
        const item=document.createElement('button');
        item.type='button';
        item.className='jyyr-custom-select-option';
        item.setAttribute('role','option');
        item.dataset.value=option.value;
        item.textContent=option.textContent;
        item.onclick=()=>{
          select.value=option.value;
          select.dispatchEvent(new Event('change',{bubbles:true}));
          sync();
          wrap.classList.remove('open');
          button.setAttribute('aria-expanded','false');
        };
        menu.appendChild(item);
      });
      button.onclick=()=>{
        const open=wrap.classList.toggle('open');
        button.setAttribute('aria-expanded',String(open));
        document.querySelectorAll('.jyyr-custom-select.open').forEach(x=>{if(x!==wrap)x.classList.remove('open');});
      };
      select.style.position='absolute';
      select.style.width='1px';
      select.style.height='1px';
      select.style.opacity='0';
      select.style.pointerEvents='none';
      select.setAttribute('aria-hidden','true');
      select.tabIndex=-1;
      wrap.append(button,menu);
      select.parentNode.insertBefore(wrap,select);
      wrap.appendChild(select);
      sync();
    });
  }
  document.addEventListener('click',e=>{
    if(!e.target.closest('.jyyr-custom-select')) document.querySelectorAll('.jyyr-custom-select.open').forEach(x=>x.classList.remove('open'));
  });

  function setActive(tab){
    const buttons=[...document.querySelectorAll('.admin-tabs .admin-tab')];
    // HARD RESET: never allow more than one visual/ARIA active tab.
    buttons.forEach(b=>{
      b.classList.remove('active');
      b.setAttribute('aria-selected','false');
      b.setAttribute('tabindex','-1');
    });
    const activeButton=buttons.find(b=>(b.dataset.featureTab||b.dataset.adminTab||'')===tab);
    if(activeButton){
      activeButton.classList.add('active');
      activeButton.setAttribute('aria-selected','true');
      activeButton.setAttribute('tabindex','0');
      // Keep the selected tab visible INSIDE the horizontal tab rail.
      // Never move the whole page and never leave the active button clipped.
      const rail=activeButton.closest('.admin-tabs');
      requestAnimationFrame(()=>{
        if(!rail)return;
        const left=activeButton.offsetLeft;
        const right=left+activeButton.offsetWidth;
        const viewLeft=rail.scrollLeft+8;
        const viewRight=rail.scrollLeft+rail.clientWidth-8;
        if(left<viewLeft){
          rail.scrollTo({left:Math.max(0,left-8),behavior:'smooth'});
        }else if(right>viewRight){
          rail.scrollTo({left:Math.max(0,right-rail.clientWidth+8),behavior:'smooth'});
        }
      });
    }
  }
  window.adminTab=async function(tab){
    if(!tabs[tab]) return;
    setActive(tab);
    if(window.JYYRState) window.JYYRState.ui.activeAdminTab=tab;
    const el=document.getElementById('adminContent');if(!el)return;
    el.innerHTML='<div class="feature-loading">Memuat...</div>';
    try{await getProfile();await loadAdminCache();await featureRenderers[tab]?.();requestAnimationFrame(enhanceAdminSelects);}catch(e){console.error(e);el.innerHTML=`<div class="feature-error">${esc(e.message||'Gagal memuat')}</div>`;}
  };
  async function loadAdminCache(){
    if(!isAdmin())return;
    const c=client();
    const [users,products,orders,payments,levels,settings]=await Promise.all([
      q(c.from('profiles').select('*').order('created_at',{ascending:false})),
      q(c.from('products').select('*').order('category').order('sort_order')),
      q(c.from('orders').select('*,profiles(username)').order('created_at',{ascending:false}).limit(1000)),
      q(c.from('payments').select('*,orders(id,user_id,product_name,target,quantity,total,payment_method,status,profiles(username))').order('created_at',{ascending:false}).limit(1000)),
      q(c.from('levels').select('*').order('min_point')),
      q(c.from('store_settings').select('*').eq('id',true).single())
    ]);
    adminCache={users,products,orders,payments,levels,settings};
  }

  function statCard(label,value){return `<div class="stat-card"><span>${label}</span><b>${value}</b></div>`;}
  function statsStrip(items){return `<div class="admin-stats-wrap"><div class="admin-stats-strip">${items.map(([label,value])=>`<div class="admin-stat-item"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div><div class="admin-stats-hint">← Geser →</div></div>`;}
  function adminToolbar(inputId,placeholder,extra=''){return `<div class="feature-toolbar"><input id="${inputId}" class="input" placeholder="${placeholder}" oninput="jyyrFilterCurrent()">${extra}</div>`;}
  let currentFilterFn=null;
  window.jyyrFilterCurrent=()=>currentFilterFn?.();
  function featureTable(rows,headers,actions=''){
    return `<div class="feature-table-wrap"><table class="feature-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">Tidak ada data.</td></tr>`}</tbody></table></div>`;
  }

  /* ---------------- Dashboard ---------------- */
  async function renderOverview(){
    const o=adminCache.orders,p=adminCache.products,u=adminCache.users,pay=adminCache.payments;
    const success=o.filter(x=>x.status==='success'),fail=o.filter(x=>x.status==='failed'),cancel=o.filter(x=>x.status==='cancelled');
    const revenue=success.reduce((s,x)=>s+Number(x.total),0);
    const today=new Date();today.setHours(0,0,0,0);
    const todayOrders=o.filter(x=>new Date(x.created_at)>=today);
    const topProducts={};o.forEach(x=>topProducts[x.product_name]=(topProducts[x.product_name]||0)+1);
    const top=Object.entries(topProducts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topUsers={};o.forEach(x=>{const n=x.profiles?.username||x.user_id;topUsers[n]=(topUsers[n]||0)+1;});
    const tu=Object.entries(topUsers).sort((a,b)=>b[1]-a[1]).slice(0,5);
    document.getElementById('adminContent').innerHTML=`
      <div class="admin-section-head"><div><h3>${jyyrIcon('chart')} Dashboard & Statistik</h3><small>Ringkasan real-time dari Supabase.</small></div><button class="mini-btn" onclick="adminTab('reports')">${jyyrIcon('file')} Laporan</button></div>
      ${statsStrip([['Omzet',rup(revenue)],['Order',o.length],['Sukses',success.length],['Gagal',fail.length],['Dibatalkan',cancel.length],['User',u.filter(x=>x.role==='user').length],['Payment pending',pay.filter(x=>x.status==='pending').length],['Order hari ini',todayOrders.length]])}
      <div class="feature-columns"><div class="dashboard-section"><h4>${jyyrIcon('package')} Top Products</h4>${top.map(x=>`<div class="feature-row"><b>${esc(x[0])}</b><span>${x[1]} order</span></div>`).join('')||'Belum ada data'}</div>
      <div class="dashboard-section"><h4>${jyyrIcon('users')} Top Users</h4>${tu.map(x=>`<div class="feature-row"><b>${esc(x[0])}</b><span>${x[1]} order</span></div>`).join('')||'Belum ada data'}</div></div>
      <div class="dashboard-section"><h4>${jyyrIcon('chart')} Grafik 7 Hari</h4><div class="bar-chart">${Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-i));const next=new Date(d);next.setDate(next.getDate()+1);const oo=o.filter(x=>new Date(x.created_at)>=d&&new Date(x.created_at)<next);const val=oo.reduce((s,x)=>s+(x.status==='success'?Number(x.total):0),0);const max=Math.max(1,...Array.from({length:7},(_,j)=>{const z=new Date();z.setHours(0,0,0,0);z.setDate(z.getDate()-(6-j));const n=new Date(z);n.setDate(n.getDate()+1);return o.filter(x=>new Date(x.created_at)>=z&&new Date(x.created_at)<n&&x.status==='success').reduce((s,x)=>s+Number(x.total),0)}));return `<div class="bar-col"><div class="bar" style="height:${Math.max(4,val/max*100)}%"></div><small>${d.toLocaleDateString('id-ID',{weekday:'short'})}</small><b>${rup(val)}</b></div>`}).join('')}</div></div>
      <div class="dashboard-section"><h4>${jyyrIcon('chart')} Perbandingan</h4><div class="feature-grid">${['Hari ini','7 hari','30 hari'].map((x,i)=>statCard(x,i===0?todayOrders.length:i===1?o.filter(v=>new Date(v.created_at)>new Date(Date.now()-7*864e5)).length:o.filter(v=>new Date(v.created_at)>new Date(Date.now()-30*864e5)).length)).join('')}</div></div>`;
  }

  /* ---------------- Products ---------------- */
  async function renderProducts(){
    const categories=await q(client().from('categories').select('*').order('sort_order'));
    const products=adminCache.products;
    document.getElementById('adminContent').innerHTML=`
      <div class="admin-section-head"><div><h3>${jyyrIcon('store')} Product Management</h3><small>Draft, jadwal, kategori, bulk action, statistik.</small></div><button class="mini-btn" onclick="jyyrAddProduct()">${jyyrIcon('plus')} Produk</button></div>
      ${adminToolbar('productSearch','Cari produk / kategori...','<select id="productFilter" class="input" onchange="jyyrFilterCurrent()"><option value="">Semua</option><option value="published">Published</option><option value="draft">Draft</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>')}
      <div class="dashboard-section"><h4>${jyyrIcon('category')} Category Manager</h4><div class="feature-form-inline"><input id="catName" class="input" placeholder="Nama kategori"><input id="catDesc" class="input" placeholder="Deskripsi"><button class="success-btn" onclick="jyyrAddCategory()">Tambah</button></div>
      <div class="feature-list">${categories.map(c=>`<div class="feature-row category-feature-row"><div><b>${esc(c.name)}</b><small>${esc(c.description)}</small></div><div class="admin-actions category-actions"><button type="button" onclick="jyyrEditCategory('${c.id}')">${jyyrIcon('edit')} Edit</button><button type="button" class="danger-btn" onclick="jyyrDeleteCategory('${c.id}')">${jyyrIcon('trash')} Hapus</button></div></div>`).join('')}</div></div>
      <div class="feature-form-inline"><button class="mini-btn" onclick="jyyrBulkProduct('active')">Bulk Aktif</button><button class="mini-btn" onclick="jyyrBulkProduct('inactive')">Bulk Nonaktif</button><button class="mini-btn" onclick="jyyrBulkProduct('draft')">Bulk Draft</button><button class="mini-btn" onclick="jyyrBulkProduct('published')">Bulk Publish</button></div><div id="productFeatureList"></div><div id="productStatsFeature"></div>`;
    const render=()=>{
      const term=(document.getElementById('productSearch')?.value||'').toLowerCase(), f=document.getElementById('productFilter')?.value||'';
      const arr=products.filter(p=>(!term||`${p.name} ${p.category}`.toLowerCase().includes(term))&&(!f||(f==='published'||f==='draft'?p.product_status===f:f==='active'?p.active:!p.active)));
      document.getElementById('productFeatureList').innerHTML=arr.map(p=>`<div class="admin-product-row feature-product-row"><label class="product-check-wrap"><input type="checkbox" class="product-check" value="${p.id}" aria-label="Pilih ${esc(p.name)}"></label><div class="admin-product-main"><img src="${esc(p.icon)}" width="38" height="38" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.category)} • Min ${p.min_quantity} • Max ${p.max_quantity}</small></div></div><div class="admin-product-price"><span>Rp ${rup(p.price).replace('Rp ','')}</span><small>per 1</small></div><div class="feature-product-meta">${p.product_status==='draft'?`${jyyrIcon('edit')} Draft`:`${jyyrIcon('check')} Published`}${p.active?'':` • ${jyyrIcon('cancel')} Off`}</div><div class="admin-actions product-action-strip"><button type="button" class="product-move-action" aria-label="Naikkan posisi ${esc(p.name)}" onclick="jyyrMoveProductUp('${p.id}')">${jyyrIcon('arrowUp')} Naik</button><button type="button" class="product-edit-action" aria-label="Edit ${esc(p.name)}" onclick="jyyrProductEdit('${p.id}')">${jyyrIcon('edit')} Edit</button><button type="button" aria-label="Duplikasi ${esc(p.name)}" onclick="jyyrDuplicateProduct('${p.id}')">${jyyrIcon('file')} Salin</button><button type="button" aria-label="Preview ${esc(p.name)}" onclick="jyyrPreviewProduct('${p.id}')">${jyyrIcon('eye')} Lihat</button><button type="button" class="product-delete-action danger-btn" aria-label="Hapus ${esc(p.name)}" onclick="jyyrDeleteProduct('${p.id}')">${jyyrIcon('trash')} Hapus</button><button type="button" class="product-toggle-action" aria-label="${p.active?'Nonaktifkan':'Aktifkan'} ${esc(p.name)}" onclick="jyyrToggleProduct('${p.id}')">${jyyrIcon(p.active?'lock':'unlock')} ${p.active?'Off':'On'}</button></div></div>`).join('')||'<div class="feature-empty">Tidak ada produk.</div>';
      const counts={};adminCache.orders.forEach(o=>counts[o.product_name]=(counts[o.product_name]||0)+1);
      const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
      const now=Date.now(),w7=adminCache.orders.filter(o=>new Date(o.created_at).getTime()>now-7*864e5),w30=adminCache.orders.filter(o=>new Date(o.created_at).getTime()>now-30*864e5);
      document.getElementById('productStatsFeature').innerHTML=`<div class="dashboard-section"><h4>${jyyrIcon('chart')} Statistik Produk • Best Seller</h4>${top.map((x,i)=>{const a7=w7.filter(o=>o.product_name===x[0]).length,a30=w30.filter(o=>o.product_name===x[0]).length;return `<div class="feature-row"><div><b>#${i+1} ${esc(x[0])}</b><small>Total ${x[1]} • 7 hari ${a7} • 30 hari ${a30}</small></div></div>`}).join('')||'Belum ada order.'}</div>`;
    };
    currentFilterFn=render;render();requestAnimationFrame(enhanceAdminSelects);
  }
  window.jyyrAddCategory=async()=>{if(!isWriter())return toast('Read-only admin tidak dapat mengubah.','err');const n=document.getElementById('catName').value.trim();if(!n)return;try{await q(client().from('categories').insert({name:n,description:document.getElementById('catDesc').value.trim()}));audit('Add category','category',n);renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrEditCategory=async id=>{const c=await q(client().from('categories').select('*').eq('id',id).single());const n=await adminPrompt('Edit Nama Kategori',c.name,{required:true,placeholder:'Nama kategori'});if(n===null)return;const d=await adminPrompt('Edit Deskripsi Kategori',c.description||'',{multiline:true,placeholder:'Deskripsi kategori'});if(d===null)return;try{await q(client().from('categories').update({name:n,description:d}).eq('id',id));if(n!==c.name)await q(client().from('products').update({category:n}).eq('category',c.name));audit('Edit category','category',id);renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrDeleteCategory=async id=>{if(!(await adminConfirm('Hapus Kategori?','Kategori akan dihapus. Produk yang memakai kategori ini tidak ikut terhapus.',{okLabel:'Hapus'})))return;try{await q(client().from('categories').delete().eq('id',id));renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrAddProduct=async()=>{if(!isWriter())return toast('Read-only admin tidak dapat mengubah produk.','err');const n=await adminPrompt('Nama Produk','',{required:true});if(n===null)return;const c=await adminPrompt('Kategori','TikTok',{required:true});if(c===null)return;const price=await adminPrompt('Harga / 1','75',{type:'number',required:true});if(price===null)return;const min=await adminPrompt('Minimal Quantity','50',{type:'number',required:true});if(min===null)return;const max=await adminPrompt('Maksimal Quantity','99999',{type:'number',required:true});if(max===null)return;if(max<min)return toast('Max tidak boleh lebih kecil dari Min.','err');try{await q(client().from('products').insert({name:n,category:c||'Lainnya',price,min_quantity:min,max_quantity:max,product_status:'published',active:true}));toast('Produk berhasil ditambahkan.');await loadAdminCache();renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrMoveProductUp=async id=>{if(!isWriter())return toast('Read-only admin tidak dapat mengubah posisi produk.','err');try{await q(client().rpc('move_product_up',{p_product_id:id}));toast('Posisi produk dinaikkan.');await loadAdminCache();renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrProductEdit=async id=>{if(!isWriter())return toast('Read-only admin tidak dapat mengubah produk.','err');const p=adminCache.products.find(x=>x.id===id);if(!p)return;const name=await adminPrompt('Nama Produk',p.name,{required:true});if(name===null)return;const desc=await adminPrompt('Deskripsi',p.description||'',{multiline:true});if(desc===null)return;const terms=await adminPrompt(' Ketentuan',p.terms||'',{multiline:true});if(terms===null)return;const notes=await adminPrompt('️ Catatan',p.notes||'',{multiline:true});if(notes===null)return;const price=await adminPrompt('Harga / 1',p.price,{type:'number',required:true});if(price===null)return;const min=await adminPrompt('Minimal Quantity',p.min_quantity,{type:'number',required:true});if(min===null)return;const max=await adminPrompt('Maksimal Quantity',p.max_quantity,{type:'number',required:true});if(max===null)return;if(max<min)return toast('Max tidak boleh lebih kecil dari Min.','err');const published=await adminConfirm('Status Produk','Pilih Published untuk menampilkan produk sebagai terbit, atau Draft untuk menyimpannya sebagai draft.',{okLabel:'Published'});if(published===null)return;const schedule=await adminPrompt('Jadwal Mulai ISO',p.scheduled_at||'',{});if(schedule===null)return;const until=await adminPrompt('Jadwal Berakhir ISO',p.scheduled_until||'',{});if(until===null)return;try{await q(client().from('products').update({name,description:desc||'',terms:terms||'',notes:notes||'',price,min_quantity:min,max_quantity:max,product_status:published?'published':'draft',scheduled_at:schedule||null,scheduled_until:until||null}).eq('id',id));toast('Produk berhasil diperbarui.');await loadAdminCache();renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrDuplicateProduct=async id=>{if(!isWriter())return toast('Read-only admin tidak dapat mengubah produk.','err');const p=adminCache.products.find(x=>x.id===id);if(!p)return;const name=await adminPrompt('⧉ Nama Produk Baru',p.name+' Copy',{required:true});if(name===null)return;try{const copy={name,category:p.category,price:p.price,min_quantity:p.min_quantity,max_quantity:p.max_quantity,icon:p.icon,active:p.active,description:p.description||'',terms:p.terms||'',notes:p.notes||'',product_status:p.product_status||'published',scheduled_at:p.scheduled_at||null,scheduled_until:p.scheduled_until||null};await q(client().from('products').insert(copy));toast('Produk berhasil diduplikasi.');await loadAdminCache();renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrToggleProduct=async id=>{if(!isWriter())return toast('Read-only admin tidak dapat mengubah produk.','err');const p=adminCache.products.find(x=>x.id===id);if(!p)return;try{await q(client().from('products').update({active:!p.active}).eq('id',id));await loadAdminCache();renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrDeleteProduct=async id=>{if(!isWriter())return toast('Read-only admin tidak dapat menghapus produk.','err');const p=adminCache.products.find(x=>x.id===id);if(!p)return;if(!(await adminConfirm('Hapus Produk?','Produk ini akan dihapus dari database dan tidak dapat dipulihkan.',{okLabel:'Hapus'})))return;try{await q(client().from('products').delete().eq('id',id));toast('Produk berhasil dihapus.');await loadAdminCache();renderProducts();}catch(e){toast(e.message,'err');}};
  window.jyyrPreviewProduct=id=>{const p=adminCache.products.find(x=>x.id===id);if(!p)return;const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('eye')} Preview</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div><img src="${esc(p.icon)}" class="feature-product-icon"><h3>${esc(p.name)}</h3><p>${esc(p.description||'Belum ada deskripsi.')}</p><p>${esc(p.terms||'')}</p><b>${rup(p.price)} / 1</b><p>Min ${p.min_quantity} • Max ${p.max_quantity}</p><p>Best seller otomatis berdasarkan order.</p></div>`;document.body.appendChild(box);};

  window.jyyrBulkProduct=async action=>{if(!isWriter())return toast('Read-only admin tidak dapat mengubah produk.','err');const ids=[...document.querySelectorAll('.product-check:checked')].map(x=>x.value);if(!ids.length)return toast('Pilih produk dulu.','err');const vals=action==='active'?{active:true}:action==='inactive'?{active:false}:{product_status:action};try{await q(client().from('products').update(vals).in('id',ids));toast(`${ids.length} produk diperbarui.`);await loadAdminCache();renderProducts();}catch(e){toast(e.message,'err');}};

  /* ---------------- Users ---------------- */
  async function renderUsers(){
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('users')} User Management</h3><small>Search, filter, status, verification, activity, notes.</small></div></div>
      ${adminToolbar('userSearch','Cari username / nama / email...','<select id="userFilter" class="input" onchange="jyyrFilterCurrent()"><option value="">Semua</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option><option value="verified">Verified</option></select>')}
      <div id="userFeatureList"></div>`;
    const render=()=>{
      const term=(document.getElementById('userSearch')?.value||'').toLowerCase(),f=document.getElementById('userFilter')?.value||'';
      const arr=adminCache.users.filter(u=>u.role==='user'&&(!term||`${u.username} ${u.full_name}`.toLowerCase().includes(term))&&(!f||u.account_status===f||(f==='verified'&&u.verified)));
      document.getElementById('userFeatureList').innerHTML=arr.map(u=>`<div class="feature-user-card"><div><b>${esc(u.username)}</b><small>${esc(u.full_name)} • ${esc(u.account_status||'active')} ${u.verified?jyyrIcon('check'):''}</small></div><div><b>${rup(u.saldo)}</b><small>${Number(u.point).toLocaleString('id-ID')} point • ${fmt(u.created_at)}</small></div><div class="admin-actions"><button onclick="jyyrUserDetail('${u.id}')">${jyyrIcon('file')} Detail</button><button onclick="jyyrUserStatus('${u.id}','suspended')">${jyyrIcon('lock')} Suspend</button><button onclick="jyyrUserStatus('${u.id}','banned')">${jyyrIcon('cancel')} Ban</button><button onclick="jyyrUserStatus('${u.id}','active')">${jyyrIcon('unlock')} Unban</button></div></div>`).join('')||'<div class="feature-empty">Tidak ada user.</div>';
    };currentFilterFn=render;render();
  }
  window.jyyrUserStatus=async(id,status)=>{try{await q(client().rpc('admin_set_user_status',{p_user_id:id,p_status:status}));audit('Set user status','user',id,{status});loadAdminCache().then(renderUsers);}catch(e){toast(e.message,'err');}};
  window.jyyrUserDetail=async id=>{
    const u=adminCache.users.find(x=>x.id===id);if(!u)return;
    const [orders,bal,points,notes,log]=await Promise.all([
      q(client().from('orders').select('*').eq('user_id',id).order('created_at',{ascending:false})),
      q(client().from('balance_ledger').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(50)),
      q(client().from('point_ledger').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(50)),
      q(client().from('user_notes').select('*').eq('user_id',id).order('created_at',{ascending:false})),
      q(client().from('login_activity').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(20))
    ]);
    const spent=orders.reduce((s,x)=>s+Number(x.total||0),0);
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('user')} ${esc(u.username)}</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <div class="admin-content-grid">${statCard('Saldo',rup(u.saldo))}${statCard('Point',u.point)}${statCard('Order',orders.length)}${statCard('Belanja',rup(spent))}</div>
      <p>Status: <b>${esc(u.account_status||'active')}</b> • Verified: <b>${u.verified?'Ya':'Belum'}</b></p>
      <div class="feature-form-inline"><input id="editUserName" class="input" value="${esc(u.full_name)}"><button class="success-btn" onclick="jyyrAdminEditUser('${id}')">Simpan Profil</button><button class="mini-btn" onclick="jyyrVerifyUser('${id}',${!u.verified})">${u.verified?'Batalkan Verifikasi':'Verifikasi'}</button></div>
      <div class="feature-form-inline"><input id="adjustBalance" class="input" type="number" placeholder="+/- saldo"><input id="adjustReason" class="input" placeholder="Alasan"><button class="mini-btn" onclick="jyyrAdjustBalance('${id}')">Saldo</button><input id="adjustPoint" class="input" type="number" placeholder="+/- point"><button class="mini-btn" onclick="jyyrAdjustPoint('${id}')">Point</button></div>
      <button class="mini-btn" onclick="jyyrAddUserNote('${id}')">Catatan</button>
      <h4>Catatan</h4>${notes.map(n=>`<div class="feature-row"><span>${esc(n.note)}</span><small>${fmt(n.created_at)}</small></div>`).join('')||'Tidak ada'}
      <h4>Riwayat login</h4>${log.map(n=>`<div class="feature-row"><span>${esc(n.event)}</span><small>${fmt(n.created_at)}</small></div>`).join('')||'Tidak ada'}
      <h4>Order</h4>${orders.slice(0,20).map(o=>`<div class="feature-row"><b>${esc(o.id)}</b><span>${esc(o.status)} • ${rup(o.total)}</span></div>`).join('')||'Tidak ada'}
    </div>`;document.body.appendChild(box);
  };
  window.jyyrAdminEditUser=async id=>{const u=adminCache.users.find(x=>x.id===id);const name=document.getElementById('editUserName').value;try{await q(client().rpc('admin_update_user_profile',{p_user_id:id,p_name:name,p_username:u.username}));toast('Profil user diperbarui.');}catch(e){toast(e.message,'err');}};
  window.jyyrVerifyUser=async(id,v)=>{try{await q(client().rpc('admin_verify_user',{p_user_id:id,p_verified:v}));toast(v?'User diverifikasi.':'Verifikasi dibatalkan.');}catch(e){toast(e.message,'err');}};
  window.jyyrAdjustBalance=async id=>{const d=Number(document.getElementById('adjustBalance').value),r=document.getElementById('adjustReason').value.trim();if(!d||!r)return toast('Isi nominal dan alasan.','err');try{await q(client().rpc('admin_adjust_balance',{p_user_id:id,p_delta:d,p_reason:r}));toast('Saldo diperbarui.');}catch(e){toast(e.message,'err');}};
  window.jyyrAdjustPoint=async id=>{const d=Number(document.getElementById('adjustPoint').value),r=document.getElementById('adjustReason').value.trim()||'Admin adjustment';if(!d)return;try{await q(client().rpc('admin_adjust_point',{p_user_id:id,p_delta:d,p_reason:r}));toast('Point diperbarui.');}catch(e){toast(e.message,'err');}};
  window.jyyrAddUserNote=async id=>{const n=await adminPrompt('Catatan Internal','', {multiline:true,required:true,placeholder:'Catatan untuk user ini'});if(n===null)return;try{await q(client().from('user_notes').insert({user_id:id,note:n,created_by:account().id}));toast('Catatan disimpan.');}catch(e){toast(e.message,'err');}};

  /* ---------------- Orders ---------------- */
  async function renderOrders(){
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('package')} Order Management</h3><small>Search, filter, timeline, notes, refund, invoice.</small></div></div>
    ${adminToolbar('orderSearch','Cari ID / username / produk / target...','<select id="orderFilter" class="input" onchange="jyyrFilterCurrent()"><option value="">Semua status</option><option>pending</option><option>processing</option><option>success</option><option>cancelled</option><option>failed</option></select><input id="orderDate" class="input" type="date" onchange="jyyrFilterCurrent()">')}
    <div class="feature-form-inline"><button class="mini-btn" onclick="jyyrBulkOrder('processing')">Processing</button><button class="mini-btn" onclick="jyyrBulkOrder('success')">Success</button><button class="mini-btn" onclick="jyyrBulkOrder('cancelled')">Cancel</button><button class="mini-btn" onclick="jyyrBulkOrder('failed')">Failed</button><button class="mini-btn" onclick="jyyrExport('orders','csv')">CSV</button><button class="mini-btn" onclick="jyyrPrintOrders()">Invoice</button></div>
    <div id="orderFeatureList"></div>`;
    const render=()=>{
      const term=(document.getElementById('orderSearch')?.value||'').toLowerCase(),f=document.getElementById('orderFilter')?.value||'',date=document.getElementById('orderDate')?.value||'';
      const arr=adminCache.orders.filter(o=>(!term||`${o.id} ${o.product_name} ${o.target} ${o.profiles?.username||''}`.toLowerCase().includes(term))&&(!f||o.status===f)&&(!date||o.created_at.slice(0,10)===date));
      document.getElementById('orderFeatureList').innerHTML=arr.map(o=>`<div class="feature-user-card"><label><input type="checkbox" class="order-check" value="${esc(o.id)}"></label><div><b>${esc(o.id)}</b><small>${esc(o.profiles?.username||o.user_id)} • ${esc(o.product_name)}</small></div><div><b>${rup(o.total)}</b><small>${esc(o.status)} • ${fmt(o.created_at)}</small></div><div class="admin-actions"><button onclick="jyyrOrderDetail('${esc(o.id)}')">${jyyrIcon('file')} Detail</button><button onclick="jyyrRetryOrder('${esc(o.id)}')">${jyyrIcon('refresh')}</button><button onclick="jyyrOrderStatus('${esc(o.id)}','processing')">▶</button><button onclick="jyyrOrderStatus('${esc(o.id)}','success')">${jyyrIcon('check')}</button><button onclick="jyyrRefund('${esc(o.id)}')">${jyyrIcon('back')}</button></div></div>`).join('')||'<div class="feature-empty">Tidak ada order.</div>';
    };currentFilterFn=render;render();
  }
  window.jyyrRetryOrder=async id=>{try{await q(client().from('orders').update({status:'pending',cancel_reason:null,reject_reason:null}).eq('id',id));await q(client().from('order_events').insert({order_id:id,status:'pending',note:'Retry internal oleh admin',created_by:account().id}));toast('Order dikembalikan ke Pending.');loadAdminCache().then(renderOrders);}catch(e){toast(e.message,'err');}};
  window.jyyrOrderStatus=async(id,status)=>{const reason=(status==='cancelled'||status==='failed')?await adminPrompt(status==='cancelled'?'Alasan Pembatalan':'Alasan Gagal','',{multiline:true,required:true}):null;if((status==='cancelled'||status==='failed')&&reason===null)return;try{await q(client().from('orders').update({status,cancel_reason:status==='cancelled'?reason:null,reject_reason:status==='failed'?reason:null}).eq('id',id));toast('Status order diperbarui.');loadAdminCache().then(renderOrders);}catch(e){toast(e.message,'err');}};
  window.jyyrOrderDetail=async id=>{
    const o=adminCache.orders.find(x=>x.id===id);if(!o)return;
    const ev=await q(client().from('order_events').select('*').eq('order_id',id).order('created_at',{ascending:true}));
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('package')} ${esc(o.id)}</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div>
      <div class="admin-content-grid">${statCard('Total',rup(o.total))}${statCard('Status',esc(o.status))}${statCard('Qty',o.quantity)}${statCard('Target',esc(o.target))}</div>
      <p>User: ${esc(o.profiles?.username||o.user_id)}<br>Produk: ${esc(o.product_name)}<br>Payment: ${esc(o.payment_method)}<br>Dibuat: ${fmt(o.created_at)}</p>
      <textarea id="orderAdminNote" class="input" placeholder="Admin note">${esc(o.admin_note||'')}</textarea><textarea id="orderCustomerNote" class="input" placeholder="Customer note">${esc(o.customer_note||'')}</textarea>
      <button class="success-btn full" onclick="jyyrSaveOrderNotes('${esc(id)}')">${jyyrIcon('check')} Simpan Catatan</button>
      <div class="feature-form-inline"><button class="mini-btn" onclick="jyyrInvoice('${esc(id)}')">${jyyrIcon('receipt')} Invoice</button><button class="mini-btn" onclick="jyyrRefund('${esc(id)}')">${jyyrIcon('back')} Refund</button></div>
      <h4>Timeline</h4>${ev.map(x=>`<div class="timeline-item"><b>${esc(x.status||'event')}</b><small>${esc(x.note)} • ${fmt(x.created_at)}</small></div>`).join('')}</div>`;document.body.appendChild(box);
  };
  window.jyyrSaveOrderNotes=async id=>{try{await q(client().from('orders').update({admin_note:document.getElementById('orderAdminNote').value,customer_note:document.getElementById('orderCustomerNote').value}).eq('id',id));toast('Catatan tersimpan.');}catch(e){toast(e.message,'err');}};
  window.jyyrRefund=async id=>{const o=adminCache.orders.find(x=>x.id===id);if(!o)return;const amount=await adminPrompt('Nominal Refund',o.total,{type:'number',required:true,placeholder:`Maksimal ${rup(o.total)}`});if(amount===null||amount<=0||amount>Number(o.total))return toast('Nominal refund tidak valid.','err');const reason=await adminPrompt('Alasan Refund','',{multiline:true,required:true});if(reason===null)return;try{await q(client().rpc('admin_refund_order',{p_order_id:id,p_amount:amount,p_reason:reason}));toast('Refund berhasil.');loadAdminCache().then(renderOrders);}catch(e){toast(e.message,'err');}};
  window.jyyrBulkOrder=async status=>{const ids=[...document.querySelectorAll('.order-check:checked')].map(x=>x.value);if(!ids.length)return toast('Pilih order dulu.','err');const reason=(status==='cancelled'||status==='failed')?await adminPrompt(status==='cancelled'?'Alasan Pembatalan':'Alasan Gagal','',{multiline:true,required:true}):null;if((status==='cancelled'||status==='failed')&&reason===null)return;try{await q(client().rpc('admin_bulk_order_status',{p_ids:ids,p_status:status,p_reason:reason}));toast(`${ids.length} order diperbarui.`);loadAdminCache().then(renderOrders);}catch(e){toast(e.message,'err');}};

  /* ---------------- Payments / deposits ---------------- */
  async function renderPayments(){
    const deposits=await q(client().from('wallet_deposits').select('*').order('created_at',{ascending:false}).limit(500));
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('card')} Payment Management</h3><small>Payment order + deposit wallet.</small></div></div>
      ${adminToolbar('paymentSearch','Cari payment / order / username...','<select id="paymentFilter" class="input" onchange="jyyrFilterCurrent()"><option value="">Semua</option><option>pending</option><option>verified</option><option>rejected</option></select>')}
      <h4>Order Payments</h4><div id="paymentFeatureList"></div><h4>Deposit Wallet</h4><div id="depositFeatureList"></div>`;
    const render=()=>{
      const term=(document.getElementById('paymentSearch')?.value||'').toLowerCase(),f=document.getElementById('paymentFilter')?.value||'';
      const pays=adminCache.payments.filter(p=>(!term||`${p.id} ${p.order?.id||''} ${p.order?.profiles?.username||''}`.toLowerCase().includes(term))&&(!f||p.status===f));
      document.getElementById('paymentFeatureList').innerHTML=pays.map(p=>`<div class="feature-user-card"><div><b>${esc(p.id)}</b><small>${esc(p.order?.profiles?.username||'')} • ${esc(p.method)}</small></div><div><b>${rup(p.order?.total)}</b><small>${esc(p.status)} • ${fmt(p.created_at)}</small></div><div class="admin-actions">${p.status==='pending'?`<button onclick="jyyrReviewPayment('${p.id}','verified')">${jyyrIcon('check')}</button><button onclick="jyyrReviewPayment('${p.id}','rejected')">${jyyrIcon('cancel')}</button>`:''}<button onclick="jyyrPaymentDetail('${p.id}')">${jyyrIcon('file')} Detail</button></div></div>`).join('')||'<div class="feature-empty">Tidak ada payment.</div>';
      document.getElementById('depositFeatureList').innerHTML=deposits.map(d=>`<div class="feature-user-card"><div><b>${esc(adminCache.users.find(u=>String(u.id)===String(d.user_id))?.username||d.user_id)}</b><small>${esc(d.method)} • ${fmt(d.created_at)}</small></div><div><b>${rup(d.amount)}</b><small>${esc(d.status)}${Number(d.bonus)?' • bonus '+rup(d.bonus):''}</small></div><div class="admin-actions">${d.status==='pending'?`<button onclick="jyyrReviewDeposit('${d.id}','verified')">${jyyrIcon('check')}</button><button onclick="jyyrReviewDeposit('${d.id}','rejected')">${jyyrIcon('cancel')}</button>`:''}</div></div>`).join('')||'Tidak ada deposit.';
    };currentFilterFn=render;render();
  }
  window.jyyrReviewPayment=async(id,status)=>{try{await q(client().rpc('admin_review_payment',{p_payment_id:id,p_status:status}));toast(status==='verified'?'Payment diverifikasi.':'Payment ditolak.');loadAdminCache().then(renderPayments);}catch(e){toast(e.message,'err');}};
  window.jyyrReviewDeposit=async(id,status)=>{const reason=status==='rejected'?await adminPrompt('Alasan Penolakan Deposit','',{multiline:true,required:true}):null;if(status==='rejected'&&reason===null)return;try{await q(client().rpc('admin_review_deposit',{p_id:id,p_status:status,p_reason:reason}));toast('Deposit diperbarui.');renderPayments();}catch(e){toast(e.message,'err');}};
  window.jyyrPaymentDetail=async id=>{const p=adminCache.payments.find(x=>x.id===id);const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.innerHTML=`<div class="popup-box feature-box"><div class="feature-head"><h3>${jyyrIcon('card')} Payment</h3><button class="btn-close" onclick="this.closest('.popup').remove()" aria-label="Tutup">${jyyrIcon('close')}</button></div><button class="mini-btn" onclick="jyyrPaymentReceipt('${p.id}')">${jyyrIcon('receipt')} Receipt</button><p>ID: ${esc(p.id)}<br>Order: ${esc(p.order?.id)}<br>User: ${esc(p.order?.profiles?.username||'')}<br>Method: ${esc(p.method)}<br>Status: ${esc(p.status)}<br>Dibuat: ${fmt(p.created_at)}<br>Reviewed: ${fmt(p.reviewed_at)}</p></div>`;document.body.appendChild(box);};

  window.jyyrPaymentReceipt=id=>{const p=adminCache.payments.find(x=>x.id===id);if(!p)return;const w=open('','_blank');w.document.write(`<html><head><title>Payment Receipt</title></head><body><h1>JYYR STORE</h1><h2>Payment Receipt</h2><p>Payment ID: ${esc(p.id)}<br>Order: ${esc(p.order?.id)}<br>User: ${esc(p.order?.profiles?.username||'')}<br>Method: ${esc(p.method)}<br>Amount: ${rup(p.order?.total)}<br>Status: ${esc(p.status)}<br>Created: ${fmt(p.created_at)}</p><script>window.print()<\/script></body></html>`);w.document.close();};

  /* ---------------- Loyalty ---------------- */
  async function renderLevels(){
    const levels=adminCache.levels,milestones=await q(client().from('point_milestones').select('*').order('threshold')),expiry=await q(client().from('point_expiry_settings').select('*').eq('id',true).single());
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('trophy')} Level, Point & Loyalty</h3><small>Reward otomatis, diskon, milestone, expiry.</small></div></div>
      <div class="feature-list levels-list">${levels.map(l=>`<div class="feature-row level-feature-card"><div class="level-feature-main"><b>${esc(l.name)}</b><small>Min ${l.min_point} point • Reward ${rup(l.reward)} • Diskon ${l.discount_percent||0}%</small></div><button class="level-edit-btn" aria-label="Edit ${esc(l.name)}" title="Edit ${esc(l.name)}" onclick="jyyrEditLevel('${l.id}')"><span>${jyyrIcon('edit')}</span></button></div>`).join('')}</div>
      <div class="dashboard-section"><h4>Milestone</h4><div class="feature-form-inline"><input id="milestoneThreshold" class="input" type="number" placeholder="Threshold"><input id="milestonePoint" class="input" type="number" placeholder="Bonus point"><input id="milestoneBalance" class="input" type="number" placeholder="Bonus saldo"><button class="success-btn" onclick="jyyrAddMilestone()">Tambah</button></div>
      ${milestones.map(m=>`<div class="feature-row"><b>${m.threshold}</b><span>+${m.bonus_point} point • ${rup(m.bonus_balance)}</span><button onclick="jyyrDeleteMilestone('${m.id}')">${jyyrIcon('trash')}</button></div>`).join('')}</div>
      <div class="dashboard-section"><h4>Point Expiration</h4><label><input id="expiryEnabled" type="checkbox" ${expiry.enabled?'checked':''}> Aktif</label><input id="expiryDays" class="input" type="number" value="${expiry.days}" min="1"><div class="expiry-actions"><button type="button" class="mini-btn" onclick="jyyrSaveExpiry()">Simpan Expiry</button><button type="button" class="mini-btn" onclick="jyyrRunExpiry()">Jalankan Sekarang</button></div></div>
      <div class="dashboard-section"><h4>Ranking / Leaderboard</h4>${adminCache.users.filter(u=>u.role==='user').sort((a,b)=>b.point-a.point).slice(0,10).map((u,i)=>`<div class="feature-row"><b>#${i+1} ${esc(u.username)} <span class="admin-role-badge">• user</span></b><span>${Number(u.point).toLocaleString('id-ID')} point • ${esc(u.admin_level||'')}</span></div>`).join('')||'Belum ada user.'}</div>`;
  }
  window.jyyrEditLevel=async id=>{const l=adminCache.levels.find(x=>String(x.id)===String(id));if(!l)return;const name=await adminPrompt('Nama Level',l.name,{required:true});if(name===null)return;const min=await adminPrompt('Minimal Point',l.min_point,{type:'number',required:true});if(min===null)return;const reward=await adminPrompt('Reward Saldo',l.reward,{type:'number',required:true});if(reward===null)return;const disc=await adminPrompt('Diskon Persen',l.discount_percent||0,{type:'number',required:true});if(disc===null)return;try{await q(client().from('levels').update({name,min_point:min,reward,discount_percent:disc}).eq('id',id));await loadAdminCache();renderLevels();toast('Level berhasil diperbarui.');}catch(e){toast(e.message,'err');}};
  window.jyyrAddMilestone=async()=>{const threshold=Number(document.getElementById('milestoneThreshold').value),bp=Number(document.getElementById('milestonePoint').value)||0,bb=Number(document.getElementById('milestoneBalance').value)||0;if(!threshold)return;try{await q(client().from('point_milestones').insert({threshold,bonus_point:bp,bonus_balance:bb}));renderLevels();}catch(e){toast(e.message,'err');}};
  window.jyyrDeleteMilestone=async id=>{if(!(await adminConfirm('Hapus Milestone?','Milestone ini akan dihapus permanen.',{okLabel:'Hapus'})))return;try{await q(client().from('point_milestones').delete().eq('id',id));renderLevels();toast('Milestone dihapus.');}catch(e){toast(e.message,'err');}};
  window.jyyrSaveExpiry=async()=>{try{await q(client().from('point_expiry_settings').update({enabled:expiryEnabled.checked,days:Number(expiryDays.value)}).eq('id',true));toast('Pengaturan expiry disimpan.');renderLevels();}catch(e){toast(e.message,'err');}};
  window.jyyrRunExpiry=async()=>{try{const n=await q(client().rpc('expire_points_for_user'));toast(`Point expired: ${n||0}`);}catch(e){toast(e.message,'err');}};

  /* ---------------- Broadcast ---------------- */
  async function renderBroadcastFeature(){
    const rows=await q(client().from('broadcasts').select('*').order('created_at',{ascending:false}).limit(100));
    document.getElementById('adminContent').innerHTML=`
      <div class="admin-section-head"><div><h3>${jyyrIcon('broadcast')} Broadcast</h3><small>Broadcast dibaca dan ditulis langsung ke Supabase.</small></div></div>
      <div class="dashboard-section broadcast-compose-card">
        <div class="feature-form-inline broadcast-compose-grid">
          <input id="bTitle" class="input" placeholder="Judul broadcast">
          <textarea id="bMessage" class="input" rows="4" placeholder="Pesan broadcast"></textarea>
          <button class="success-btn broadcast-send-btn" type="button" onclick="jyyrSendBroadcastFeature()">${jyyrIcon('broadcast')} Kirim Broadcast</button>
        </div>
      </div>
      <div class="dashboard-section"><h4>Riwayat Broadcast</h4><div class="feature-list broadcast-list-feature">
        ${rows.map(b=>`<div class="feature-row broadcast-feature-row"><div class="broadcast-feature-content"><b>${esc(b.title)}</b><small>${esc(b.message)}</small><small>${fmt(b.created_at)}</small></div><button type="button" class="danger-btn broadcast-feature-delete" onclick="jyyrDeleteBroadcastFeature('${esc(b.id)}')">${jyyrIcon('trash')} Hapus</button></div>`).join('')||'<div class="feature-empty">Belum ada broadcast.</div>'}
      </div></div>`;
  }
  window.jyyrSendBroadcastFeature=async()=>{
    if(!isWriter())return toast('Read-only admin tidak dapat mengirim broadcast.','err');
    const title=document.getElementById('bTitle')?.value.trim(),message=document.getElementById('bMessage')?.value.trim();
    if(!title||!message)return toast('Judul dan pesan wajib diisi.','err');
    try{await q(client().from('broadcasts').insert({title,message,created_by:account().id}));await audit('Create broadcast','broadcast',null,{title});toast('Broadcast berhasil dikirim.');await renderBroadcastFeature();}
    catch(e){toast(e.message,'err');}
  };
  window.jyyrDeleteBroadcastFeature=async id=>{
    if(!isWriter())return toast('Read-only admin tidak dapat menghapus broadcast.','err');
    const row=await q(client().from('broadcasts').select('id,title').eq('id',id).single());
    if(!(await adminConfirm('Hapus Broadcast?',`Broadcast "${row.title||'Tanpa judul'}" akan dihapus.`,{okLabel:'Hapus',danger:true})))return;
    try{await q(client().from('broadcasts').delete().eq('id',id));await audit('Delete broadcast','broadcast',id);toast('Broadcast berhasil dihapus.');await renderBroadcastFeature();}
    catch(e){toast(e.message,'err');}
  };

  /* ---------------- Notifications ---------------- */
  async function renderNotifications(){
    const ns=await q(client().from('notifications').select('*').order('created_at',{ascending:false}).limit(200));
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('bell')} Notification Center</h3><small>Broadcast semua, VIP, VVIP, user tertentu, terjadwal.</small></div></div>
      <div class="feature-form-inline"><input id="notifTitle" class="input" placeholder="Judul"><input id="notifMessage" class="input" placeholder="Pesan"><select id="notifAudience" class="input"><option value="all">Semua</option><option value="vip">VIP</option><option value="vvip">VVIP</option><option value="user">User tertentu</option></select><input id="notifUser" class="input" placeholder="User UUID (untuk user tertentu)"><input id="notifSchedule" class="input" type="datetime-local"><button class="success-btn" onclick="jyyrSendNotification()">Kirim</button></div>
      <div class="feature-list">${ns.map(n=>`<div class="feature-row"><div><b>${esc(n.title)}</b><small>${esc(n.message)} • ${n.user_id||'Semua'} • ${fmt(n.created_at)}</small></div></div>`).join('')}</div>`;
  }
  window.jyyrSendNotification=async()=>{
    const title=document.getElementById('notifTitle').value.trim(),message=document.getElementById('notifMessage').value.trim(),aud=document.getElementById('notifAudience').value,user=document.getElementById('notifUser').value.trim()||null,sched=document.getElementById('notifSchedule').value;
    if(!title||!message)return toast('Judul dan pesan wajib.','err');
    let ids=adminCache.users.filter(u=>u.role==='user').map(u=>u.id);if(aud==='user')ids=[user];if(aud==='vip'||aud==='vvip'){const target=aud==='vip'?adminCache.levels.find(l=>l.name.toLowerCase()==='vip'):adminCache.levels.find(l=>l.name.toLowerCase()==='vvip');const min=target?.min_point||0;ids=adminCache.users.filter(u=>u.role==='user'&&u.point>=min).map(u=>u.id);}
    try{await q(client().from('notifications').insert(ids.map(id=>({user_id:id,title,message,type:'broadcast',scheduled_at:sched?new Date(sched).toISOString():null,created_by:account().id}))));toast('Notifikasi dibuat.');renderNotifications();}catch(e){toast(e.message,'err');}
  };

  /* ---------------- Reports ---------------- */
  async function renderReports(){
    const o=adminCache.orders,p=adminCache.payments,u=adminCache.users,pro=adminCache.products;
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('file')} Reports</h3><small>CSV, Excel-compatible, print/PDF.</small></div></div>
    <div class="feature-grid">${[['orders','Transaksi'],['payments','Pembayaran'],['users','User'],['products','Produk'],['wallet','Wallet'],['vouchers','Voucher'],['refunds','Refund']].map(([k,n])=>`<button class="feature-btn" onclick="jyyrExport('${k}','csv')">${jyyrIcon('file')} ${n} CSV</button>`).join('')}</div>
    <div class="feature-grid"><button class="feature-btn" onclick="jyyrExport('orders','xls')">${jyyrIcon('file')} Excel Order</button><button class="feature-btn" onclick="jyyrPrintReport()">${jyyrIcon('file')} PDF / Print</button></div>
    <div class="admin-content-grid">${statCard('Omzet',rup(o.filter(x=>x.status==='success').reduce((s,x)=>s+Number(x.total),0)))}${statCard('Transaksi',o.length)}${statCard('User',u.filter(x=>x.role==='user').length)}${statCard('Produk',pro.length)}</div>`;
  }
  function csvEscape(v){return `"${String(v??'').replace(/"/g,'""')}"`;}
  window.jyyrExport=(type,fmtType)=>{
    let arr=[],cols=[];
    if(type==='orders'){arr=adminCache.orders;cols=['id','product_name','target','quantity','unit_price','total','payment_method','status','created_at'];}
    if(type==='payments'){arr=adminCache.payments;cols=['id','order_id','method','status','created_at'];}
    if(type==='users'){arr=adminCache.users.filter(x=>x.role==='user');cols=['id','username','full_name','saldo','point','account_status','verified','created_at'];}
    if(type==='products'){arr=adminCache.products;cols=['id','name','category','price','min_quantity','max_quantity','active','product_status'];}
    if(type==='refunds'){client().from('refunds').select('*').order('created_at',{ascending:false}).then(r=>{if(r.error)return toast(r.error.message,'err');const cols=['id','order_id','user_id','amount','reason','created_at'];const body=[cols.join(','),...r.data.map(x=>cols.map(c=>csvEscape(x[c])).join(','))].join('\n');const blob=new Blob(["\ufeff"+body],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jyyr-refunds.csv';a.click();URL.revokeObjectURL(url);});return;} if(type==='vouchers'){client().from('vouchers').select('*').order('created_at',{ascending:false}).then(r=>{if(r.error)return toast(r.error.message,'err');const cols=['id','code','discount_percent','discount_amount','usage_limit','used_count','active','expires_at','created_at'];const body=[cols.join(','),...r.data.map(x=>cols.map(c=>csvEscape(x[c])).join('\n'))].join('\n');const blob=new Blob(["\ufeff"+body],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jyyr-vouchers.csv';a.click();URL.revokeObjectURL(url);});return;} if(type==='wallet'){cols=['id','user_id','delta','balance_after','reason','created_at'];client().from('balance_ledger').select('*').order('created_at',{ascending:false}).then(r=>{if(r.error)return toast(r.error.message,'err');const body=[cols.join(','),...r.data.map(x=>cols.map(c=>csvEscape(x[c])).join(','))].join('\n');const blob=new Blob(["\ufeff"+body],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jyyr-wallet.csv';a.click();URL.revokeObjectURL(url);});return;}
    const body=[cols.join(','),...arr.map(x=>cols.map(c=>csvEscape(x[c])).join(','))].join('\n');
    const blob=new Blob(["\ufeff"+body],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`jyyr-${type}.${fmtType==='xls'?'xls':'csv'}`;a.click();URL.revokeObjectURL(url);
  };
  window.jyyrPrintReport=()=>{const w=open('','_blank');w.document.write(`<html><head><title>JYYR Report</title></head><body><h1>JYYR STORE Report</h1><p>Dicetak ${fmt(new Date())}</p>${document.getElementById('adminContent').innerHTML}<script>window.print()<\/script></body></html>`);w.document.close();};
  window.jyyrPrintOrders=()=>{const ids=[...document.querySelectorAll('.order-check:checked')].map(x=>x.value);const arr=ids.length?adminCache.orders.filter(x=>ids.includes(x.id)):adminCache.orders.slice(0,50);const w=open('','_blank');w.document.write(`<html><head><title>JYYR Invoice</title></head><body><h1>JYYR STORE Invoice</h1>${arr.map(o=>`<hr><h3>${esc(o.id)}</h3><p>${esc(o.product_name)}<br>Target: ${esc(o.target)}<br>Qty: ${o.quantity}<br>Total: ${rup(o.total)}<br>Status: ${esc(o.status)}<br>${fmt(o.created_at)}</p>`).join('')}<script>window.print()<\/script></body></html>`);w.document.close();};
  window.jyyrInvoice=id=>{const o=adminCache.orders.find(x=>x.id===id);if(!o)return;const w=open('','_blank');w.document.write(`<html><head><title>Invoice ${esc(o.id)}</title></head><body><h1>JYYR STORE</h1><h2>Invoice ${esc(o.id)}</h2><p>Produk: ${esc(o.product_name)}<br>Target: ${esc(o.target)}<br>Jumlah: ${o.quantity}<br>Harga: ${rup(o.unit_price)}<br>Total: ${rup(o.total)}<br>Status: ${esc(o.status)}<br>Tanggal: ${fmt(o.created_at)}</p><script>window.print()<\/script></body></html>`);w.document.close();};

  /* ---------------- Security ---------------- */
  async function renderSecurity(){
    const p=window._jyyrFeatureProfile||await getProfile();
    const sess=await client().auth.getSession();
    const factors=await client().auth.mfa.listFactors().catch(()=>({data:{all:[]}}));
    const logs=await q(client().from('admin_audit_logs').select('*').order('created_at',{ascending:false}).limit(200));
    const login=await q(client().from('login_activity').select('*').order('created_at',{ascending:false}).limit(100));
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('shield')} Security Admin</h3><small>Audit, 2FA, sessions, permissions.</small></div></div>
      <div class="dashboard-section"><h4>Permission</h4><p>Level: <b>${esc(p.admin_level||'admin')}</b></p><p>readonly tidak boleh melakukan aksi tulis melalui RPC/Policy.</p><select id="adminLevelSelect" class="input"><option value="admin" ${p.admin_level==='admin'?'selected':''}>Admin</option><option value="readonly" ${p.admin_level==='readonly'?'selected':''}>Read-only</option><option value="super_admin" ${p.admin_level==='super_admin'?'selected':''}>Super Admin</option></select><button class="mini-btn" onclick="jyyrSetOwnAdminLevel()">Simpan level</button>
      <div class="feature-list">${adminCache.users.filter(x=>x.role==='admin').map(a=>`<div class="feature-row"><div><b>${esc(a.username)} <span class="admin-role-badge">• ${esc(a.admin_level==='super_admin'?'owner':(a.admin_level||'admin'))}</span></b><small>${esc(a.admin_level||'admin')}</small></div>${p.admin_level==='super_admin'?`<select class="input" onchange="jyyrSetAdminLevel('${a.id}',this.value)"><option value="admin" ${a.admin_level==='admin'?'selected':''}>Admin</option><option value="readonly" ${a.admin_level==='readonly'?'selected':''}>Read-only</option><option value="super_admin" ${a.admin_level==='super_admin'?'selected':''}>Super Admin</option></select>`:''}</div>`).join('')}</div></div>
      <div class="dashboard-section"><h4>Session Management</h4><p>Session aktif: ${sess.data.session?'Ya':'Tidak'} • Exp ${sess.data.session?fmt(new Date(sess.data.session.expires_at*1000)):'-'}</p><div class="security-action-stack"><button class="mini-btn" onclick="window.jyyrSupabase.auth.signOut({scope:'others'}).then(()=>toast('Sesi perangkat lain ditutup.'))">${jyyrIcon('logout')} Logout perangkat lain</button><button class="mini-btn" onclick="window.jyyrSupabase.auth.signOut({scope:'global'}).then(()=>location.href='login.html')">${jyyrIcon('logout')} Logout semua sesi</button></div></div><div class="dashboard-section"><h4>2FA / MFA</h4><p>Faktor terdaftar: ${(factors.data?.all||[]).length}</p><div class="security-action-stack"><button class="mini-btn" onclick="jyyrEnroll2FA()">${jyyrIcon('plus')} Aktifkan TOTP</button></div></div>
      <div class="dashboard-section"><h4>Audit Log</h4>${logs.map(x=>`<div class="feature-row"><div><b>${esc(x.action)}</b><small>${esc(x.target_type)} ${esc(x.target_id||'')} • ${fmt(x.created_at)}</small></div></div>`).join('')}</div>
      <div class="dashboard-section"><h4>Login Activity</h4>${login.map(x=>`<div class="feature-row"><div><b>${esc(x.event)}</b><small>${esc(x.user_agent||'')} • ${fmt(x.created_at)}</small></div></div>`).join('')}</div>`;
  }
  window.jyyrSetAdminLevel=async(id,v)=>{try{await q(client().rpc('admin_set_admin_level',{p_user_id:id,p_level:v}));toast('Permission admin diperbarui.');renderSecurity();}catch(e){toast(e.message,'err');}};
  window.jyyrSetOwnAdminLevel=async()=>{const v=document.getElementById('adminLevelSelect').value;if(v==='super_admin'&&window._jyyrFeatureProfile.admin_level!=='super_admin')return toast('Hanya Super Admin yang boleh mengangkat admin.','err');try{await q(client().from('profiles').update({admin_level:v}).eq('id',account().id));await getProfile();toast('Level admin diperbarui.');}catch(e){toast(e.message,'err');}};
  window.jyyrEnroll2FA=async()=>{
    try{
      const r=await client().auth.mfa.enroll({factorType:'totp',friendlyName:'JYYR Admin TOTP'});
      if(r.error)throw r.error;
      const data=r.data;const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.innerHTML=`<div class="popup-box feature-box"><h3>Aktifkan 2FA</h3><img src="${data.totp.qr_code}" style="width:220px;max-width:100%"><p>Secret: <code>${esc(data.totp.secret)}</code></p><input id="mfaCode" class="input" inputmode="numeric" maxlength="6" placeholder="Kode 6 digit"><button class="success-btn full" onclick="jyyrVerify2FA('${data.id}')">Verifikasi</button></div>`;document.body.appendChild(box);
    }catch(e){toast(e.message||'MFA gagal','err');}
  };
  window.jyyrVerify2FA=async factorId=>{try{const c=await q(client().auth.mfa.challenge({factorId}));const code=document.getElementById('mfaCode').value.trim();await q(client().auth.mfa.verify({factorId,challengeId:c.id,code}));document.querySelector('.jyyr-feature-popup:last-child')?.remove();toast('2FA berhasil diaktifkan.');}catch(e){toast(e.message,'err');}};

  /* ---------------- System ---------------- */
  async function renderSystem(){
    const s=adminCache.settings;
    const errors=await q(client().from('error_logs').select('*').order('created_at',{ascending:false}).limit(100)).catch(()=>[]);
    const proofRes=await client().from('payments').select('id',{count:'exact',head:true}); const proofCount=proofRes.count||0;


    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('settings')} System Management</h3><small>Maintenance, kill switch, store open/close, health.</small></div></div>
      <div class="dashboard-section"><h4>Store Control</h4><label><input id="sysOpen" type="checkbox" ${s.store_open?'checked':''}> Store Open</label><label><input id="sysMaintenance" type="checkbox" ${s.maintenance_mode?'checked':''}> Maintenance Mode</label><label><input id="sysKill" type="checkbox" ${s.kill_switch?'checked':''}> Kill Switch Order</label>
      <input id="sysMin" class="input" type="number" value="${s.min_deposit}"><input id="sysMax" class="input" type="number" value="${s.max_deposit}"><input id="sysBalance" class="input" type="number" value="${s.max_balance}">
      <input id="sysBonusP" class="input" type="number" step=".01" value="${s.deposit_bonus_percent}" placeholder="Bonus deposit %"><input id="sysBonusF" class="input" type="number" value="${s.deposit_bonus_fixed}" placeholder="Bonus deposit fixed">
      <textarea id="sysMsg" class="input">${esc(s.maintenance_message)}</textarea><textarea id="sysAnn" class="input" placeholder="System announcement">${esc(s.system_announcement)}</textarea>
      <button class="success-btn full" onclick="jyyrSaveSystem()">${jyyrIcon('check')} Simpan System</button></div>
      <div class="dashboard-section"><h4>Health</h4><div class="feature-grid">${statCard('Supabase',client()?'Online':'Offline')}${statCard('Auth',sessState())}${statCard('Storage',proofCount+' proof records')}${statCard('Database','Connected')}</div></div>
      <div class="dashboard-section"><h4>Error Log / Frontend Monitor</h4>${errors.map(x=>`<div class="feature-row"><div><b>${esc(x.type)}</b><small>${esc(x.message)} • ${fmt(x.created_at)}</small></div></div>`).join('')||'Tidak ada error tercatat.'}</div>`;
  }
  function sessState(){return account()?'Online':'Offline';}
  window.jyyrSaveSystem=async()=>{try{await q(client().rpc('admin_update_store_settings',{p_min_deposit:Number(sysMin.value),p_max_deposit:Number(sysMax.value),p_max_balance:Number(sysBalance.value),p_bonus_percent:Number(sysBonusP.value)||0,p_bonus_fixed:Number(sysBonusF.value)||0,p_store_open:sysOpen.checked,p_maintenance:sysMaintenance.checked,p_kill_switch:sysKill.checked,p_message:sysMsg.value,p_announcement:sysAnn.value}));toast('System settings disimpan.');loadAdminCache().then(renderSystem);}catch(e){toast(e.message,'err');}};

  /* ---------------- Support ---------------- */
  async function renderSupport(){
    const tickets=await q(client().from('support_tickets').select('*,profiles(username)').order('updated_at',{ascending:false}));
    const faq=await q(client().from('faq_items').select('*').order('sort_order'));
    const help=await q(client().from('help_articles').select('*').order('sort_order'));
    document.getElementById('adminContent').innerHTML=`<div class="admin-section-head"><div><h3>${jyyrIcon('message')} Customer Support</h3><small>Ticket, FAQ, Help Center.</small></div></div>
      <div class="admin-subsection-head"><h4>${jyyrIcon('receipt')} Tickets</h4><small>Kelola tiket dan balasan pelanggan.</small></div>
      <div class="feature-list support-ticket-list">${tickets.map(t=>`<div class="feature-user-card support-ticket-card"><div><b>${esc(t.subject)}</b><small>${esc(t.profiles?.username||t.user_id)} • ${esc(t.priority)} • ${esc(t.status)}</small></div><button class="mini-btn support-open-btn" onclick="jyyrAdminTicket('${t.id}')">${jyyrIcon('message')} Buka</button></div>`).join('')||'<div class="feature-empty">Tidak ada ticket.</div>'}</div>
      <div class="admin-subsection-head"><h4>${jyyrIcon('help')} FAQ</h4><small>Pertanyaan umum yang tampil di halaman bantuan.</small></div>
      <div class="feature-form-inline support-compose-form"><input id="faqQ" class="input support-wide-input" placeholder="Question"><input id="faqA" class="input support-answer-input" placeholder="Answer"><button class="success-btn support-add-btn" onclick="jyyrAddFAQ()">${jyyrIcon('plus')} Tambah</button></div>
      <div class="feature-list support-entry-list">${faq.map(x=>`<div class="feature-row support-entry-row"><div><b>${esc(x.question)}</b></div><button class="support-delete-btn danger-btn" aria-label="Hapus FAQ" onclick="jyyrDeleteFAQ('${x.id}')">${jyyrIcon('trash')}</button></div>`).join('')||'<div class="feature-empty">Belum ada FAQ.</div>'}</div>
      <div class="admin-subsection-head"><h4>${jyyrIcon('file')} Help Center</h4><small>Panduan singkat untuk pelanggan.</small></div>
      <div class="feature-form-inline support-compose-form support-help-form"><input id="helpT" class="input support-wide-input" placeholder="Title"><textarea id="helpC" class="input support-answer-input" placeholder="Content"></textarea><button class="success-btn support-add-btn" onclick="jyyrAddHelp()">${jyyrIcon('plus')} Tambah</button></div>
      <div class="feature-list support-entry-list">${help.map(x=>`<div class="feature-row support-entry-row"><div><b>${esc(x.title)}</b></div><button class="support-delete-btn danger-btn" aria-label="Hapus artikel bantuan" onclick="jyyrDeleteHelp('${x.id}')">${jyyrIcon('trash')}</button></div>`).join('')||'<div class="feature-empty">Belum ada artikel bantuan.</div>'}</div>`;
  }
  window.jyyrAdminTicket=async id=>{
    const t=await q(client().from('support_tickets').select('*').eq('id',id).single());
    const ms=await q(client().from('ticket_messages').select('*').eq('ticket_id',id).order('created_at'));
    const history=ms.map(x=>`${x.sender_id===account().id?'Admin':'User'}: ${x.message}`).join('\n');
    const msg=await adminPrompt('Balasan Ticket',history,{multiline:true,placeholder:'Balasan admin'});
    if(msg!==null&&msg.trim()){
      const internal=await adminConfirm('Catatan Internal?','Pilih Ya jika balasan hanya untuk admin.',{okLabel:'Internal',cancelLabel:'Terlihat User'});
      await q(client().from('ticket_messages').insert({ticket_id:id,sender_id:account().id,message:msg,internal:!!internal}));
    }
    const pr=await adminPrompt('Priority',t.priority,{required:true,placeholder:'low / normal / high / urgent'});
    if(pr===null)return;
    const st=await adminPrompt('Status',t.status,{required:true,placeholder:'open / pending / closed'});
    if(st===null)return;
    await q(client().from('support_tickets').update({status:st,priority:pr}).eq('id',id));
    renderSupport();
  };
  window.jyyrAddFAQ=async()=>{const qv=faqQ.value.trim(),a=faqA.value.trim();if(!qv||!a)return;await q(client().from('faq_items').insert({question:qv,answer:a}));renderSupport();};
  window.jyyrDeleteFAQ=async id=>{await q(client().from('faq_items').delete().eq('id',id));renderSupport();};
  window.jyyrAddHelp=async()=>{const t=helpT.value.trim(),c=helpC.value.trim();if(!t||!c)return;await q(client().from('help_articles').insert({title:t,content:c}));renderSupport();};
  window.jyyrDeleteHelp=async id=>{await q(client().from('help_articles').delete().eq('id',id));renderSupport();};

  const featureRenderers={overview:renderOverview,products:renderProducts,users:renderUsers,orders:renderOrders,payments:renderPayments,levels:renderLevels,broadcast:renderBroadcastFeature,notifications:renderNotifications,reports:renderReports,security:renderSecurity,system:renderSystem,support:renderSupport};

  /* =======================================================
     ADMIN TAB INJECTION + PRODUCT/CHECKOUT ENHANCEMENTS
  ======================================================= */
  function injectAdminTabs(){
    const tabsEl=document.querySelector('.admin-tabs');if(!tabsEl)return;
    const old=tabsEl.querySelectorAll('[data-feature-tab]');
    old.forEach(x=>x.remove());
    const add=(tab,label,icon)=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='admin-tab';
      b.dataset.featureTab=tab;
      b.setAttribute('aria-label',label);
      b.innerHTML=`${jyyrIcon(icon)}<span>${esc(label)}</span>`;
      b.onclick=()=>adminTab(tab);
      tabsEl.appendChild(b);
    };
    add('notifications','Notifikasi','bell');
    add('reports','Laporan','chart');
    add('security','Security','shield');
    add('system','System','settings');
    add('support','Support','message');
  }

  // Checkout helpers consumed by the single app.js updateHarga()/bukaPembayaran()
  // implementations. No wrapper replaces the global functions.
  window.jyyrGetCheckoutDiscount=async function(){
    let discount=0;
    try{
      const p=window._jyyrFeatureProfile||await getProfile();
      const lv=await q(client().from('levels').select('discount_percent,min_point').lte('min_point',Number(p?.point||0)).order('min_point',{ascending:false}).limit(1));
      discount=Number(lv?.[0]?.discount_percent||0);
    }catch(_){}
    return Math.max(0,Math.min(100,discount));
  };

  async function enhanceCheckout(){
    const orderBtn=document.getElementById('orderBtn');if(!orderBtn||orderBtn.dataset.walletEnhanced)return;
    orderBtn.dataset.walletEnhanced='1';
    const pay=document.querySelector('.payment');
    if(pay){
      const b=document.createElement('div');b.className='pay-item';b.textContent='SALDO';b.onclick=()=>{document.querySelectorAll('.pay-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('metode').value='balance';};
      pay.appendChild(b);
    }
    window.jyyrHandleBalanceCheckout=async function(){
      const u=account();
      if(!u){
        openAuth('login');
        toast('Silakan login atau daftar terlebih dahulu untuk memesan.','err');
        return;
      }
      const data=document.getElementById('layanan')?.value?.split('|')||[];
      const qty=Number(document.getElementById('jumlah')?.value||0);
      const min=Number(data[2]||0),max=Number(data[1]||0),price=Number(data[0]||0);
      if(!qty||qty<min||qty>max)return;
      const discount=await window.jyyrGetCheckoutDiscount();
      const raw=price*qty,total=raw*(1-discount/100);
      if(!(await adminConfirm('Konfirmasi Pembelian',`Total: ${rup(total)}${discount?`\nDiskon level: ${discount}%`:''}\nSaldo saat ini: ${rup(u.saldo)}`,{okLabel:'Bayar Sekarang'})))return;
      window._jyyrBalanceCheckout={total};
      await window.confirmBalanceOrder?.();
    };
    window.confirmBalanceOrder=async function(){
      const productId=document.getElementById('layanan').dataset.productId,target=document.getElementById('username').value.trim(),qty=Number(document.getElementById('jumlah').value);
      try{
        if(!productId||!target||!qty)throw new Error('Data order belum lengkap.');
        const id='JYR-'+Date.now()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
        const order=await q(client().rpc('create_balance_order',{p_order_id:id,p_product_id:productId,p_target:target,p_quantity:qty}));
        document.getElementById('popupDANA')?.classList.remove('show');document.getElementById('popupQRIS')?.classList.remove('show');
        toast(`Order ${order.id} berhasil dibuat dengan saldo.`);
        if(window.refreshRiwayat)refreshRiwayat();
        const u=await getProfile();window._jyyrAccount={...account(),admin_level:u.admin_level||account().admin_level||null,saldo:Number(u.saldo),point:Number(u.point)};
      }catch(e){toast(e.message,'err');}
    };
  }

  window.addEventListener('error',e=>{try{if(client()&&account())client().from('error_logs').insert({user_id:account().id,type:'frontend',message:String(e.message||'Unknown error'),stack:String(e.error?.stack||'')});}catch(_){}});
  window.addEventListener('unhandledrejection',e=>{try{if(client()&&account())client().from('error_logs').insert({user_id:account().id,type:'unhandledrejection',message:String(e.reason?.message||e.reason||'Unhandled rejection')});}catch(_){}});

  async function enforceAdminMFA(){
    if(!isAdmin())return;
    const aal=await client().auth.mfa.getAuthenticatorAssuranceLevel().catch(()=>null);
    if(!aal||aal.currentLevel==='aal2'||aal.nextLevel!=='aal2')return;
    const factors=await client().auth.mfa.listFactors();const factor=(factors.data?.totp||[]).find(x=>x.status==='verified')||factors.data?.all?.find(x=>x.status==='verified');
    if(!factor)return;
    const ch=await client().auth.mfa.challenge({factorId:factor.id});if(ch.error)throw ch.error;
    const box=document.createElement('div');box.className='popup show jyyr-feature-popup';box.id='jyyrMfaGate';
    box.innerHTML=`<div class="popup-box feature-box"><h3>${jyyrIcon('lock')} Verifikasi Admin</h3><p>Masukkan kode authenticator 6 digit untuk melanjutkan.</p><input id="jyyrMfaGateCode" class="input" inputmode="numeric" maxlength="6" placeholder="000000"><button class="success-btn full" onclick="jyyrVerifyGate('${factor.id}','${ch.data.id}')">Verifikasi</button></div>`;
    document.body.appendChild(box);
  }
  window.jyyrVerifyGate=async(factorId,challengeId)=>{try{const code=document.getElementById('jyyrMfaGateCode').value.trim();const r=await client().auth.mfa.verify({factorId,challengeId,code});if(r.error)throw r.error;document.getElementById('jyyrMfaGate')?.remove();toast('Verifikasi admin berhasil.');}catch(e){toast(e.message,'err');}};

  async function boot(){
    if(featureReady)return;
    if(!(await ready()))return;
    featureReady=true;
    await getProfile();
    await enforceAdminMFA();
    injectAdminTabs();
    enhanceAdminSelects();
    enhanceCheckout();
    renderUserEnhancements();
    // admin.html owns URL-driven tab navigation. Do not override ?tab= here.
    // The page boot reads ?tab= and calls the single adminTab() route.
  }

  // Reboot after auth/data initialization.
  const timer=setInterval(()=>{if(window.jyyrDBReady){boot();clearInterval(timer);}},150);
  setTimeout(()=>clearInterval(timer),30000);

  // expose manual boot for testing
  window.jyyrFeatureBoot=boot;
})();
