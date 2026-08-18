/* ========================================
   POPUP
======================================== */

function closeQRIS() {
    document
        .getElementById("popupQRIS")
        .classList.remove("show");
}

function closeDANA() {
    document
        .getElementById("popupDANA")
        .classList.remove("show");
}

function showError(msg) {
    const text=document.getElementById("popupText");
    const popup=document.getElementById("popupError");
    if(text) text.innerText=String(msg??"Terjadi kesalahan.");
    if(popup) popup.classList.add("show");
}

function closePopup() {
    document.getElementById("popupError")?.classList.remove("show");
}

/* ========================================
   LOADING
======================================== */

function showLoading() {
    document.getElementById("loading")?.classList.add("show");
}

function hideLoading() {
    document.getElementById("loading")?.classList.remove("show");
}

/* ========================================
   SUCCESS
======================================== */

function showSuccess(msg) {
    const text=document.getElementById("successText");
    const popup=document.getElementById("popupSuccess");
    if(text && msg) text.textContent=String(msg);
    if(popup) popup.classList.add("show");
}

function closeSuccess() {
    document.getElementById("popupSuccess")?.classList.remove("show");
}


/* ==========================================================
   ADMIN DIALOGS
   Generic prompt/confirm modal used by feature modules.
========================================================== */
(function(){
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function adminDialog(mode, title, message='', value='', options={}){
    return new Promise(resolve=>{
      const id='jyyrAdminDialog';
      document.getElementById(id)?.remove();
      const box=document.createElement('div');
      box.id=id;
      box.className='popup show jyyr-feature-popup';
      const multiline=options.multiline===true;
      const input=mode==='prompt' ? (multiline
        ? `<textarea id="jyyrAdminDialogInput" class="input admin-dialog-input" rows="5" placeholder="${esc(options.placeholder||'')}">${esc(value??'')}</textarea>`
        : `<input id="jyyrAdminDialogInput" class="input admin-dialog-input" value="${esc(value??'')}" placeholder="${esc(options.placeholder||'')}" ${options.type==='number'?'inputmode="decimal"':''} ${options.type==='password'?'type="password"':''}>`) : '';
      const okLabel=options.okLabel||'Lanjutkan';
      const cancelLabel=options.cancelLabel||'Batal';
      box.innerHTML=`<div class="popup-box feature-box admin-dialog-box"><div class="feature-head"><div><h3>${esc(title)}</h3>${message?`<p class="admin-dialog-message">${esc(message)}</p>`:''}</div><button type="button" class="btn-close" aria-label="Tutup">${window.jyyrIcon?.('close')||''}</button></div>${input}<div class="popup-actions admin-dialog-actions"><button type="button" class="admin-confirm-cancel" id="jyyrAdminDialogCancel">${esc(cancelLabel)}</button><button type="button" class="admin-confirm-ok${options.danger?' admin-confirm-danger':''}" id="jyyrAdminDialogOk">${esc(okLabel)}</button></div></div>`;
      document.body.appendChild(box);
      const close=result=>{box.remove();resolve(result);};
      box.querySelector('.btn-close').onclick=()=>close(null);
      box.querySelector('#jyyrAdminDialogCancel').onclick=()=>close(null);
      box.querySelector('#jyyrAdminDialogOk').onclick=()=>{
        if(mode==='confirm') return close(true);
        const el=box.querySelector('#jyyrAdminDialogInput');
        let v=el?.value??'';
        if(options.trim!==false) v=v.trim();
        if(options.required && !v){el?.focus();return;}
        if(options.type==='number'){
          const n=Number(v);
          if(!Number.isFinite(n)){el?.focus();return;}
          v=n;
        }
        close(v);
      };
      if(mode==='prompt') setTimeout(()=>box.querySelector('#jyyrAdminDialogInput')?.focus(),30);
      box.addEventListener('keydown',e=>{
        if(e.key==='Escape')close(null);
        if(e.key==='Enter'&&!multiline&&e.target?.id==='jyyrAdminDialogInput')box.querySelector('#jyyrAdminDialogOk')?.click();
      });
    });
  }

  window.jyyrAdminPrompt=(title,value='',options={})=>adminDialog('prompt',title,'',value,options);
  window.jyyrAdminConfirm=(title,message='',options={})=>adminDialog('confirm',title,message,'',options);
})();
