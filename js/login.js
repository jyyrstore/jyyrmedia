(function(){
  const { createClient } = window.supabase;
  const client = createClient(window.JYYR_SUPABASE_URL, window.JYYR_SUPABASE_PUBLISHABLE_KEY);
  let mode = new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login';

  const form=document.getElementById('authForm');
  const nameWrap=document.getElementById('nameWrap');
  const name=document.getElementById('regName');
  const regEmail=document.getElementById('regEmail');
  const user=document.getElementById('authUsername');
  const pass=document.getElementById('authPassword');
  const submit=document.getElementById('authSubmit');
  const sw=document.getElementById('authSwitch');
  const sub=document.getElementById('loginSubtitle');
  const err=document.getElementById('authError');
  const passwordToggle=document.getElementById('passwordToggle');

  passwordToggle.onclick=()=>{
    const visible=pass.type==='text';
    pass.type=visible?'password':'text';
    passwordToggle.classList.toggle('is-visible',!visible);
    passwordToggle.setAttribute('aria-pressed',String(!visible));
    passwordToggle.setAttribute('aria-label',visible?'Tampilkan password':'Sembunyikan password');
    passwordToggle.title=visible?'Tampilkan password':'Sembunyikan password';
  };

  function sync(){
    const reg=mode==='register';
    nameWrap.classList.toggle('hidden',!reg);
    regEmail.classList.toggle('hidden',!reg);
    name.required=reg;
    regEmail.required=reg;
    user.required=true;
    user.placeholder=reg?'Username (tanpa @)':'Email atau Username';
    submit.textContent=reg?'Buat Akun':'Masuk';
    sw.textContent=reg?'Sudah punya akun? Login':'Belum punya akun? Daftar';
    sub.textContent=reg?'BUAT AKUN JYYR STORE':'LOGIN UNTUK MELANJUTKAN';
    pass.autocomplete=reg?'new-password':'current-password';
    err.textContent='';
  }

  sw.onclick=()=>{ mode=mode==='login'?'register':'login'; sync(); };
  document.getElementById('forgotBtn').onclick=async()=>{
    const email=user.value.trim();
    if(!email||!email.includes('@')){err.textContent='Masukkan email akun untuk reset password.';return;}
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    err.textContent=error?error.message:'Link reset password sudah dikirim ke email.';
  };
  async function logActivity(event){
    try{await client.from('login_activity').insert({user_id:null,event,user_agent:navigator.userAgent});}catch(_){}
  }
  async function logUserActivity(uid,event){
    try{await client.from('login_activity').insert({user_id:uid,event,user_agent:navigator.userAgent});}catch(_){}
  }

  form.onsubmit=async e=>{
    e.preventDefault();
    err.textContent='';
    submit.disabled=true;
    submit.textContent=mode==='register'?'Membuat akun...':'Memproses...';
    try{
      const username=user.value.trim().toLowerCase();
      const password=pass.value;
      if(password.length<6) throw new Error('Password minimal 6 karakter.');
      if(mode==='register'){
        if(!/^[a-z0-9_.-]+$/.test(username)) throw new Error('Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung. Jangan gunakan @.');
        if(username.length<3) throw new Error('Username minimal 3 karakter.');
        const email=regEmail.value.trim().toLowerCase();
        if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Masukkan email yang valid, misalnya nama@gmail.com.');
        const {data:existingEmail,error:profileCheckError}=await client.rpc('get_auth_email_by_username',{p_username:username});
        if(profileCheckError) throw profileCheckError;
        if(Array.isArray(existingEmail) && existingEmail.length) throw new Error('Username sudah digunakan.');
        const {data,error}=await client.auth.signUp({email,password,options:{data:{username,full_name:name.value.trim() || username}}});
        if(error) throw error;
        if(!data.session){
          err.textContent='Akun berhasil dibuat. Silakan cek email untuk konfirmasi sebelum login.';
          submit.disabled=false;
          submit.textContent='Buat Akun';
          return;
        }
        location.replace('index.html');
      }else{
        let email=username;
        if(!username.includes('@')){
          const {data:emailRow,error:emailError}=await client.rpc('get_auth_email_by_username',{p_username:username});
          if(emailError) throw emailError;
          email=Array.isArray(emailRow)?emailRow[0]?.email:emailRow?.email;
          if(!email) throw new Error('Username tidak ditemukan.');
        }
        const {error}=await client.auth.signInWithPassword({email:email.toLowerCase(),password});
        if(error){await logActivity('failed_login');throw error;}
        await logUserActivity((await client.auth.getUser()).data.user?.id,'login');
        location.replace('index.html');
      }
    }catch(e){
      err.textContent=e?.message||'Terjadi kesalahan.';
    }finally{
      submit.disabled=false;
      submit.textContent=mode==='register'?'Buat Akun':'Masuk';
    }
  };

  const recovery=location.hash.includes('type=recovery')||location.search.includes('recovery=1');
  if(recovery){
    mode='recovery';
    sync();
    nameWrap.classList.add('hidden');
    regEmail.classList.add('hidden');
    user.classList.add('hidden');
    name.required=false;
    regEmail.required=false;
    user.required=false;
    pass.required=true;
    pass.placeholder='Password baru';
    sub.textContent='RESET PASSWORD';
    submit.textContent='Simpan Password';
    sw.style.display='none';
    document.getElementById('forgotBtn').style.display='none';
    form.onsubmit=async e=>{
      e.preventDefault();
      const p=pass.value;
      err.textContent='';
      if(p.length<6){err.textContent='Password minimal 6 karakter.';return;}
      submit.disabled=true;
      submit.textContent='Menyimpan...';
      const {error}=await client.auth.updateUser({password:p});
      if(error){err.textContent=error.message;submit.disabled=false;submit.textContent='Simpan Password';}
      else{err.textContent='Password berhasil diubah. Silakan login.';setTimeout(()=>location.replace('login.html'),1000);}
    };
  }else{
    client.auth.getSession().then(({data})=>{if(data.session) location.replace('index.html');});
    sync();
  }
})();
