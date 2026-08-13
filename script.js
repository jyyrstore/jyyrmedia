/* ========================================
   LOCK DOWNLOAD
======================================== */

document.addEventListener("contextmenu", (e) => e.preventDefault());

/* ========================================
   LIGHTWEIGHT BACKGROUND
   Particle engine removed for mobile performance.
======================================== */

const particles = document.getElementById("particles");
if (particles) particles.replaceChildren();

/* ========================================
   PREVIEW BUKTI
======================================== */

function previewBukti(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Validasi tipe
    if (!file.type.startsWith("image/")) {
        showError("File harus gambar!");
        event.target.value = "";
        document.getElementById("previewImg").style.display = "none";
        return;
    }

    // Validasi ukuran maksimal 2MB
    if (file.size > 2 * 1024 * 1024) {
        showError("Max ukuran gambar 2MB!");
        event.target.value = "";
        document.getElementById("previewImg").style.display = "none";
        return;
    }

    document.getElementById("uploadText").innerText = file.name;

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = document.getElementById("previewImg");
        img.src = e.target.result;
        img.style.display = "block";
    };

    reader.readAsDataURL(file);
}

/* ========================================
   RIWAYAT
======================================== */

let historyData = JSON.parse(localStorage.getItem("history") || "[]");

function simpanRiwayat(user, layanan, jumlah, total, id, value) {
    const sessionId = localStorage.getItem('jyyr_session');
    const users = JSON.parse(localStorage.getItem('jyyr_users') || '[]');
    const buyer = users.find(u => u.id === sessionId);
    const record = {
        waktu: new Date().toLocaleString(),
        user,
        layanan,
        jumlah,
        total,
        id,
        value,
        status: 'pending',
        buyer: buyer ? buyer.username : user,
        userId: buyer ? buyer.id : null
    };
    historyData.push(record);
    localStorage.setItem("history", JSON.stringify(historyData));

    const orders = JSON.parse(localStorage.getItem('jyyr_orders') || '[]');
    if (!orders.some(o => o.id === id)) {
        orders.push({
            id, userId: record.userId, buyer: record.buyer, layanan, jumlah, total,
            metode: value && value.metode ? value.metode : 'dana', status: 'pending', time: Date.now()
        });
        localStorage.setItem('jyyr_orders', JSON.stringify(orders));
    }

    // Point hanya diproses oleh Supabase setelah pembayaran diverifikasi.
}

function lihatRiwayat() {
    const box = document.getElementById("listRiwayat");

    if (historyData.length === 0) {
        box.innerHTML = "Belum ada pesanan";
    } else {
        let html = "";

        historyData
            .slice()
            .reverse()
            .forEach((item, index) => {
                html += `
<div style="border-bottom:1px solid rgba(255,255,255,.1);padding:10px 0">
    <b>ID: ${item.id || "-"}</b><br>
    <b>${item.user}</b><br>
    ${item.layanan}<br>
    Jumlah: ${item.jumlah}<br>
    ${item.total}<br>
    <small>${item.waktu}</small><br><br>

    <button onclick="orderLagi(${historyData.length - 1 - index})">
        🔄 Order Lagi
    </button>
</div>
`;
            });

        box.innerHTML = html;
    }

    document.getElementById("popupRiwayat").classList.add("show");
}

function orderLagi(index) {
    const item = historyData[index];

    document.getElementById("username").value = item.user;
    document.getElementById("jumlah").value = item.jumlah;

    // Kembalikan layanan
    document.getElementById("layanan").value =
        item.value && item.value.layanan
            ? item.value.layanan
            : "75|99999|50";

    updateHarga();

    const itemLayanan = document.querySelector(
        `.dropdown-item[data-value="${item.value.layanan}"]`
    );

    if (itemLayanan) {
        document.getElementById("layanan").value =
            itemLayanan.dataset.value;

        document.getElementById("selectedText").innerHTML = `
<img src="${itemLayanan.dataset.icon}"
     width="18"
     style="vertical-align:middle;margin-right:6px;">
${itemLayanan.dataset.text}
`;
    }

    if (item.value.metode === "qris") {
        document
            .querySelectorAll(".pay-item")
            .forEach((i) => i.classList.remove("active"));

        document
            .querySelectorAll(".pay-item")[1]
            .classList.add("active");

        document.getElementById("metode").value = "qris";
    } else {
        document
            .querySelectorAll(".pay-item")
            .forEach((i) => i.classList.remove("active"));

        document
            .querySelectorAll(".pay-item")[0]
            .classList.add("active");

        document.getElementById("metode").value = "dana";
    }

    closeRiwayat();
}

function hapusRiwayat() {
    historyData = [];
    localStorage.removeItem("history");
    lihatRiwayat();
}

function closeRiwayat() {
    document
        .getElementById("popupRiwayat")
        .classList.remove("show");
}

/* ========================================
   PAYMENT
======================================== */

function selectPay(el, metode) {
    document.querySelectorAll(".pay-item").forEach((item) => {
        item.classList.remove("active");
    });

    el.classList.add("active");
    document.getElementById("metode").value = metode;
}

/* ========================================
   VALIDASI PEMBAYARAN
======================================== */

function bukaPembayaran() {
    // Pesanan hanya boleh dibuat oleh user yang sudah login.
    if (typeof currentAccount === "function" && !currentAccount()) {
        openAuth('login');
        showError("Silakan login atau daftar terlebih dahulu untuk memesan.");
        return;
    }
    const user = document.getElementById("username").value.trim();
    const jumlah = parseInt(document.getElementById("jumlah").value);

    const data = document
        .getElementById("layanan")
        .value
        .split("|");

    const min = parseInt(data[2]);
    const max = parseInt(data[1]);

    const input = document.getElementById("jumlah");

    input.classList.remove("input-error");

    if (!user) {
        showError("Username wajib diisi!");
        return;
    }

    if (!jumlah) {
        input.classList.add("input-error");
        showError("Masukkan jumlah pesanan!");
        return;
    }

    if (jumlah < min) {
        input.classList.add("input-error");
        showError("Minimal order adalah " + min);
        return;
    }

    if (jumlah > max) {
        input.classList.add("input-error");
        showError("Maksimal order adalah " + max);
        return;
    }

    const metode = document.getElementById("metode").value;

    if (metode === "qris") {
        document
            .getElementById("popupQRIS")
            .classList.add("show");
    } else {
        document
            .getElementById("popupDANA")
            .classList.add("show");
    }
}

/* ========================================
   UTIL
======================================== */

function copyDana() {
    const no = document.getElementById("nomorDana").innerText;

    navigator.clipboard
        .writeText(no)
        .then(() => showError("Nomor DANA disalin!"))
        .catch(() => showError("Gagal menyalin nomor."));
}

function openDeskripsi() {
    document
        .getElementById("popupDeskripsi")
        .classList.add("show");
}

function closeDeskripsi() {
    document
        .getElementById("popupDeskripsi")
        .classList.remove("show");
}

/* ========================================
   DROPDOWN
======================================== */

function toggleDropdown() {
    document
        .querySelector(".dropdown")
        .classList.toggle("active");
}

function selectItem(el, event) {

    // Ripple Effect
    if (event) {

        const circle = document.createElement("span");
        circle.className = "ripple";

        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        circle.style.width = size + "px";
        circle.style.height = size + "px";

        circle.style.left =
            event.clientX - rect.left - size / 2 + "px";

        circle.style.top =
            event.clientY - rect.top - size / 2 + "px";

        el.appendChild(circle);

        setTimeout(() => {
            circle.remove();
        }, 600);
    }

    const value = el.dataset.value;
    const productId = el.dataset.id || null;
    const icon = el.dataset.icon;
    const text = el.dataset.text;

    document.getElementById("layanan").value = value;
    document.getElementById("layanan").dataset.productId = productId || '';

    document.getElementById("selectedText").innerHTML = `
<img src="${icon}"
     width="18"
     style="vertical-align:middle;margin-right:6px;">
${text}
`;

    document.querySelectorAll(".dropdown-item").forEach((item) => {
        item.classList.remove("active");
    });

    el.classList.add("active");

    document
        .querySelector(".dropdown")
        .classList.remove("active");

    updateHarga();
}

/* ========================================
   HITUNG HARGA
======================================== */

function updateHarga() {

    const data = document
        .getElementById("layanan")
        .value
        .split("|");

    const harga = parseFloat(data[0]);
    const max = parseInt(data[1]);
    const min = parseInt(data[2]);

    const input = document.getElementById("jumlah");
    const jumlah = parseInt(input.value) || 0;

    const totalBox = document.getElementById("total");

    input.classList.remove("input-error");

    if (!jumlah) {
        totalBox.innerHTML = "Total: Rp 0";
        return;
    }

    if (jumlah < min) {
        totalBox.innerHTML =
            "<span class='error'>⚠️ Minimal " + min + "</span>";

        input.classList.add("input-error");
        return;
    }

    if (jumlah > max) {
        totalBox.innerHTML =
            "<span class='error'>⚠️ Maksimal " + max + "</span>";

        input.classList.add("input-error");
        return;
    }

    const total = harga * jumlah;

    totalBox.innerHTML =
        "Total: Rp " + total.toLocaleString("id-ID");
}

/* ========================================
   CONFIRM BAYAR
======================================== */

function confirmBayar() {

    const btn = document.getElementById("orderBtn");
    if (!btn) return;

    // Cegah double klik
    if (btn.disabled) return;

    btn.disabled = true;
    btn.innerText = "Memproses...";

    const user = document.getElementById("username").value.trim();
    const layananText = document.getElementById("selectedText").innerText.trim();
    const jumlah = Number(document.getElementById("jumlah").value);
    const totalText = document.getElementById("total").innerText;

    const metode = document.getElementById("metode").value;
    const metodeText = metode.toUpperCase();

    const tanggal = new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    // ID Pesanan
    const orderId = "JYYR-" + Date.now();

    const data = document
        .getElementById("layanan")
        .value
        .split("|");

    const harga = Number(data[0]);
    const max = Number(data[1]);
    const min = Number(data[2]);

    const input = document.getElementById("jumlah");
    input.classList.remove("input-error");

    /* ================= VALIDASI ================= */

    const resetButton = () => {
        btn.disabled = false;
        btn.innerText = "Bayar Sekarang";
    };

    if (!user) {
        resetButton();
        showError("Username wajib diisi!");
        return;
    }

    if (user.length < 3) {
        resetButton();
        showError("Username minimal 3 karakter!");
        return;
    }

    if (!jumlah || isNaN(jumlah)) {
        input.classList.add("input-error");
        resetButton();
        showError("Masukkan jumlah pesanan!");
        return;
    }

    if (jumlah < min) {
        input.classList.add("input-error");
        resetButton();
        showError("Minimal order adalah " + min);
        return;
    }

    if (jumlah > max) {
        input.classList.add("input-error");
        resetButton();
        showError("Maksimal order adalah " + max);
        return;
    }

  /* ================= VALIDASI QRIS ================= */

    if (metode === "qris") {

        const fileInput = document.getElementById("bukti");
        const file = fileInput?.files?.[0];

        if (!file) {
            resetButton();
            showError("⚠ Upload bukti pembayaran dulu!");
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            resetButton();
            showError("⚠ Format bukti harus JPG, PNG, atau WEBP!");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            resetButton();
            showError("⚠ Ukuran file maksimal 2 MB!");
            return;
        }
    }

    /* ================= CLOSE POPUP ================= */

    document
        .getElementById("popupQRIS")
        .classList.remove("show");

    document
        .getElementById("popupDANA")
        .classList.remove("show");

    showLoading();

    const nomor = "6283890777348";

    const text = `Halo Admin JYYR STORE

Saya SUDAH BAYAR

====================

📦 Layanan: ${layananText}
👤 User/Link: ${user}
🆔 ID Pesanan: ${orderId}
📅 Tanggal: ${tanggal}
💳 Metode: ${metodeText}
🔢 Jumlah: ${jumlah.toLocaleString("id-ID")}
💰 ${totalText}

====================`;

    setTimeout(() => {

        hideLoading();

        const totalAngka =
            parseInt(totalText.replace(/[^\d]/g, "")) || 0;

        Promise.resolve(simpanRiwayat(
            user,
            layananText,
            jumlah,
            totalAngka,
            orderId,
            {
                layanan: document.getElementById("layanan").value,
                metode: metode,
                productId: document.getElementById('layanan')?.dataset.productId || null
            }
        )).then(() => {
            window.open(
                "https://wa.me/" +
                    nomor +
                    "?text=" +
                    encodeURIComponent(text),
                "_blank"
            );

            showSuccess();

            setTimeout(() => {

 /* ================= RESET FORM ================= */

            document.getElementById("username").value = "";
            document.getElementById("jumlah").value = "";
            document.getElementById("total").innerText =
                "Total: Rp 0";

            // Reset dropdown
            document.getElementById("selectedText").innerHTML = `
<img src="https://i.ibb.co.com/PZg1TdRR/FOLLOWERS-Jyy-R.png"
     width="18"
     style="vertical-align:middle;margin-right:6px;">
TikTok Followers — Rp75 / 1 (Min 50)
`;

            document.getElementById("layanan").value =
                "75|99999|50";

            // Reset metode pembayaran
            document.getElementById("metode").value = "dana";

            document
                .querySelectorAll(".pay-item")
                .forEach((i) => i.classList.remove("active"));

            document
                .querySelector(".pay-item")
                .classList.add("active");

            // Reset upload QRIS
            const fileInput =
                document.getElementById("bukti");

            if (fileInput) {
                fileInput.value = "";

                document.getElementById(
                    "previewImg"
                ).style.display = "none";

                document.getElementById(
                    "uploadText"
                ).innerText =
                    "📸 Upload Bukti Pembayaran";
            }

            // Aktifkan tombol lagi
            btn.disabled = false;
            btn.innerText = "Bayar Sekarang";

            }, 1000);
        }).catch((e) => {
            hideLoading();
            resetButton();
            showError('Pesanan gagal disimpan: ' + (e?.message || 'coba lagi.'));
        });

    }, 1000);

}

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
    document.getElementById("popupText").innerText = msg;

    document
        .getElementById("popupError")
        .classList.add("show");
}

function closePopup() {
    document
        .getElementById("popupError")
        .classList.remove("show");
}

/* ========================================
   GLOBAL EVENT
======================================== */

document.addEventListener("click", function (e) {

    const dropdown = document.querySelector(".dropdown");

    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
    }

});

/* ========================================
   LOADING
======================================== */

function showLoading() {
    document
        .getElementById("loading")
        .classList.add("show");
}

function hideLoading() {
    document
        .getElementById("loading")
        .classList.remove("show");
}

/* ========================================
   SUCCESS
======================================== */

function showSuccess() {
    document
        .getElementById("popupSuccess")
        .classList.add("show");
}

function closeSuccess() {
    document
        .getElementById("popupSuccess")
        .classList.remove("show");
}

/* ========================================
   BUTTON ANIMATION
======================================== */

const orderBtn = document.getElementById("orderBtn");

if (orderBtn) {

    orderBtn.addEventListener("click", function () {

        this.style.transform = "scale(0.97)";

        setTimeout(() => {
            this.style.transform = "scale(1)";
        }, 150);

    });

}

/* ========================================
   CLOSE POPUP WHEN CLICK OUTSIDE
======================================== */

document.querySelectorAll(".popup").forEach((popup) => {

    popup.addEventListener("click", function (e) {

        // Popup konfirmasi broadcast wajib ditutup lewat tombol Batal/Konfirmasi.
        if (popup.id === "popupBroadcastConfirm") return;

        if (e.target === popup) {
            popup.classList.remove("show");
        }

    });

});

/* ==========================================================
   JYYR ACCOUNT / USER / ADMIN SYSTEM — SUPABASE EDITION
   Supabase Auth + PostgreSQL + RLS are the source of truth.
   localStorage is used only as a short-lived UI cache.
========================================================== */
(async function(){
  const KEYS={products:'jyyr_products',orders:'jyyr_orders',levels:'jyyr_levels',broadcasts:'jyyr_broadcasts',payments:'jyyr_payments'};
  const { createClient } = window.supabase;
  const supabaseClient = createClient(window.JYYR_SUPABASE_URL, window.JYYR_SUPABASE_PUBLISHABLE_KEY);
  window.jyyrSupabase=supabaseClient;
  window.jyyrDBReady=false;
  window._jyyrAccount=null;

  const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(e){return d}};
  const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const mapProduct=p=>({id:p.id,name:p.name,category:p.category,price:Number(p.price),max:Number(p.max_quantity),min:Number(p.min_quantity),icon:p.icon,active:p.active});
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
    window._jyyrAccount={id:profile.id,name:profile.full_name,username:profile.username,role:profile.role,saldo:Number(profile.saldo),point:Number(profile.point),createdAt:profile.created_at};

    const [prodRes,levelRes,broadcastRes,orderRes,allProfilesRes,paymentRes]=await Promise.all([
      supabaseClient.from('products').select('*').order('created_at',{ascending:true}),
      supabaseClient.from('levels').select('*').order('min_point',{ascending:true}),
      supabaseClient.from('broadcasts').select('*').order('created_at',{ascending:false}),
      supabaseClient.from('orders').select('*,profiles(username)').order('created_at',{ascending:false}),
      window._jyyrAccount.role==='admin' ? supabaseClient.from('profiles').select('*').order('created_at',{ascending:false}) : Promise.resolve({data:null,error:null}),
      window._jyyrAccount.role==='admin' ? supabaseClient.from('payments').select('*,orders(id,user_id,product_name,target,quantity,total,payment_method,status,profiles(username))').order('created_at',{ascending:false}) : Promise.resolve({data:null,error:null})
    ]);
    for(const r of [prodRes,levelRes,broadcastRes,orderRes,allProfilesRes,paymentRes]) if(r.error) throw r.error;
    const products=(prodRes.data||[]).map(mapProduct);
    const levels=(levelRes.data||[]).map(mapLevel);
    const broadcasts=(broadcastRes.data||[]).map(mapBroadcast);
    const allOrders=(orderRes.data||[]).map(mapOrder);
    const visibleOrders=window._jyyrAccount.role==='admin'?allOrders:allOrders.filter(o=>o.userId===uid);
    const users=(allProfilesRes.data||[]).map(u=>({id:u.id,name:u.full_name,username:u.username,role:u.role,saldo:Number(u.saldo),point:Number(u.point),createdAt:u.created_at}));
    set(KEYS.products,products); set(KEYS.levels,levels); set(KEYS.broadcasts,broadcasts); set(KEYS.orders,visibleOrders);
    if(window._jyyrAccount.role==='admin') set(KEYS.payments,(paymentRes.data||[]).map(mapPayment));
    if(window._jyyrAccount.role==='admin') set('jyyr_users',users);
    historyData=visibleOrders.filter(o=>o.userId===uid).map(o=>{const pp=products.find(p=>p.id===o.productId);return {waktu:new Date(o.time).toLocaleString('id-ID'),user:o.target,layanan:o.layanan,jumlah:o.jumlah,total:o.total,id:o.id,value:{layanan:pp?`${pp.price}|${pp.max}|${pp.min}`:'',metode:o.metode},status:o.status,buyer:o.buyer,userId:o.userId};});
    localStorage.removeItem('jyyr_session');
    window.jyyrDBReady=true;
    return true;
  }

  async function dbUpdate(table,values,filter){
    let q=supabaseClient.from(table).update(values);
    Object.entries(filter).forEach(([k,v])=>q=q.eq(k,v));
    const {error}=await q; if(error) throw error;
  }
  function dbError(e){ console.error(e); showError(e?.message||'Gagal menyimpan ke database.'); }

  window.currentAccount=()=>window._jyyrAccount;
  window.openAuth=(mode='login')=>{ window.location.href='login.html'+(mode==='register'?'?mode=register':''); };
  window.closeAuth=()=>{};
  window.logoutUser=async()=>{await supabaseClient.auth.signOut();window.location.href='login.html';};
  function updateAccountUI(){
    const u=currentAccount();
    const status=document.getElementById('accountStatus'); const adminBtn=document.getElementById('adminPanelBtn');
    if(status) status.textContent=u?`👤 ${u.username}`:'👤 User';
    if(adminBtn) adminBtn.style.display=(u&&u.role==='admin')?'inline-flex':'none';
  }

  window.openDashboard=()=>{const u=currentAccount();if(!u)return openAuth('login');renderDashboard(u);document.getElementById('popupDashboard').classList.add('show');};
  window.closeDashboard=()=>document.getElementById('popupDashboard').classList.remove('show');
  function renderDashboard(u){
    const orders=get(KEYS.orders,[]).filter(o=>o.userId===u.id);
    const level=get(KEYS.levels,[]).slice().reverse().find(l=>u.point>=l.minPoint)||{name:'Basic'};
    document.getElementById('dashSaldo').textContent='Rp '+Number(u.saldo||0).toLocaleString('id-ID');
    document.getElementById('dashPoint').textContent=Number(u.point||0).toLocaleString('id-ID');
    document.getElementById('dashLevel').textContent=level.name;
    document.getElementById('dashOrders').textContent=orders.length;
    const bc=get(KEYS.broadcasts,[]).slice(0,10);
    document.getElementById('userNotifications').innerHTML=bc.length?bc.map(b=>`<div class="broadcast-item"><b>${escapeHtml(b.title)}</b><br>${escapeHtml(b.message)}<br><small>${new Date(b.time).toLocaleString('id-ID')}</small></div>`).join(''):'Belum ada notifikasi.';
    document.getElementById('userOrders').innerHTML=orders.length?orders.slice().reverse().map(o=>`<div class="broadcast-item"><b>${o.id}</b><br>${escapeHtml(o.layanan)} • ${Number(o.jumlah).toLocaleString('id-ID')}<br>Rp ${Number(o.total).toLocaleString('id-ID')} • <span class="badge">${o.status||'pending'}</span></div>`).join(''):'Belum ada pesanan.';
  }

  window.openAdminPanel=()=>{const u=currentAccount();if(!u||u.role!=='admin')return openAuth('login');document.getElementById('adminWelcome').textContent='Login sebagai '+u.username;document.getElementById('popupAdmin').classList.add('show');adminTab('overview');};
  window.closeAdminPanel=()=>document.getElementById('popupAdmin').classList.remove('show');
  window.adminTab=(tab)=>{document.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));const b=[...document.querySelectorAll('.admin-tab')].find(x=>x.getAttribute('onclick')?.includes("'"+tab+"'"));if(b)b.classList.add('active');const map={overview:renderOverview,products:renderProducts,users:renderUsers,orders:renderOrders,payments:renderPayments,levels:renderLevels,broadcast:renderBroadcast};map[tab]?.();};

  function renderOverview(){
    const ps=get(KEYS.products,[]),us=get('jyyr_users',[]),os=get(KEYS.orders,[]),revenue=os.filter(o=>o.status==='success').reduce((s,o)=>s+Number(o.total||0),0),pendingPayments=get(KEYS.payments,[]).filter(p=>p.status==='pending').length;
    document.getElementById('adminContent').innerHTML=`<div class="admin-note">🟢 Database Supabase aktif. Data utama sekarang tersimpan online.</div><div class="admin-content-grid" style="margin-top:10px"><div class="stat-card"><span>Produk aktif</span><b>${ps.filter(p=>p.active).length}</b></div><div class="stat-card"><span>Total user</span><b>${us.filter(u=>u.role==='user').length}</b></div><div class="stat-card"><span>Total transaksi</span><b>${os.length}</b></div><div class="stat-card"><span>Omzet sukses</span><b>Rp ${revenue.toLocaleString('id-ID')}</b></div><div class="stat-card"><span>Pembayaran pending</span><b>${pendingPayments}</b></div></div><div class="dashboard-section"><h4>⚡ Sistem</h4><p style="font-size:12px">Auth, produk, user, transaksi, level, point, dan broadcast terhubung ke Supabase.</p></div>`;
  }
  function renderProducts(){const ps=get(KEYS.products,[]);document.getElementById('adminContent').innerHTML=`<h4>➕ Tambah Produk</h4><div class="admin-form"><input class="input" id="pName" placeholder="Nama produk"><input class="input" id="pCategory" placeholder="Kategori (TikTok/Instagram)"><input class="input" id="pPrice" type="number" step="0.01" placeholder="Harga / 1"><input class="input" id="pMin" type="number" placeholder="Min"><input class="input" id="pMax" type="number" placeholder="Max"><input class="input" id="pIcon" placeholder="URL icon"><button class="success-btn full" onclick="addProduct()">Tambah Produk</button></div><div class="dashboard-section"><h4>📦 Daftar Produk</h4><div class="admin-product-list">${ps.map(p=>`<div class="admin-product-row"><div class="admin-product-main"><img src="${p.icon}" width="30" height="30" style="object-fit:contain"><div><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.category)} • Min ${p.min} • Max ${p.max}</small></div></div><div class="admin-product-price">Rp ${Number(p.price).toLocaleString('id-ID')} / 1</div><div class="admin-actions"><button onclick="openEditProduct('${p.id}')">✏️ Edit</button><button onclick="toggleProduct('${p.id}')">${p.active?'Nonaktifkan':'Aktifkan'}</button><button class="danger-btn" onclick="deleteProduct('${p.id}')">Hapus</button></div></div>`).join('')}</div></div>`;}
  let editingProductId=null;
  window.openEditProduct=id=>{const p=get(KEYS.products,[]).find(x=>x.id===id);if(!p)return;editingProductId=id;document.getElementById('editProductName').textContent=`${p.name} • ${p.category}`;document.getElementById('editProductPrice').value=p.price??'';document.getElementById('editProductMin').value=p.min??'';document.getElementById('editProductMax').value=p.max??'';document.getElementById('popupEditProduct').classList.add('show');setTimeout(()=>document.getElementById('editProductPrice')?.focus(),80);};
  window.closeEditProduct=()=>{editingProductId=null;document.getElementById('popupEditProduct')?.classList.remove('show');};
  window.saveEditProduct=async()=>{if(!editingProductId)return;const price=Number(document.getElementById('editProductPrice').value),min=Number(document.getElementById('editProductMin').value),max=Number(document.getElementById('editProductMax').value);if(!Number.isFinite(price)||price<=0)return showError('Harga harus lebih dari 0.');if(!Number.isInteger(min)||min<1)return showError('Min harus berupa angka bulat minimal 1.');if(!Number.isInteger(max)||max<1)return showError('Max harus berupa angka bulat minimal 1.');if(max<min)return showError('Max tidak boleh lebih kecil dari Min.');try{await dbUpdate('products',{price,min_quantity:min,max_quantity:max,updated_at:new Date().toISOString()},{id:editingProductId});const ps=get(KEYS.products,[]);const p=ps.find(x=>x.id===editingProductId);if(p){p.price=price;p.min=min;p.max=max;}set(KEYS.products,ps);renderServiceDropdown();renderProducts();closeEditProduct();showSuccess('Harga, Min, dan Max produk berhasil diperbarui.');}catch(e){dbError(e);}};
  window.addProduct=async()=>{const p={name:document.getElementById('pName').value.trim(),category:document.getElementById('pCategory').value.trim()||'Lainnya',price:+document.getElementById('pPrice').value,min:+document.getElementById('pMin').value,max:+document.getElementById('pMax').value,icon:document.getElementById('pIcon').value.trim()||'https://cdn-icons-png.flaticon.com/512/1828/1828640.png',active:true};if(!p.name||!p.price||!p.min||!p.max)return showError('Lengkapi data produk.');if(p.max<p.min)return showError('Max tidak boleh lebih kecil dari Min.');try{const {data,error}=await supabaseClient.from('products').insert({name:p.name,category:p.category,price:p.price,min_quantity:p.min,max_quantity:p.max,icon:p.icon,active:true}).select().single();if(error)throw error;get(KEYS.products,[]).push(mapProduct(data));set(KEYS.products,get(KEYS.products,[]));renderServiceDropdown();renderProducts();showSuccess('Produk berhasil ditambahkan.');}catch(e){dbError(e);}};
  window.toggleProduct=async id=>{const ps=get(KEYS.products,[]),p=ps.find(x=>x.id===id);if(!p)return;try{await dbUpdate('products',{active:!p.active},{id});p.active=!p.active;set(KEYS.products,ps);renderServiceDropdown();renderProducts();}catch(e){dbError(e);}};
  window.deleteProduct=async id=>{if(!confirm('Hapus produk ini?'))return;try{const {error}=await supabaseClient.from('products').delete().eq('id',id);if(error)throw error;set(KEYS.products,get(KEYS.products,[]).filter(x=>x.id!==id));renderServiceDropdown();renderProducts();}catch(e){dbError(e);}};

  function renderUsers(){const us=get('jyyr_users',[]);document.getElementById('adminContent').innerHTML=`<div class="dashboard-section"><h4>👥 Kelola User</h4><table class="admin-table"><tr><th>User</th><th>Saldo</th><th>Point</th><th>Level</th><th>Aksi</th></tr>${us.map(u=>{const l=get(KEYS.levels,[]).slice().reverse().find(x=>u.point>=x.minPoint)||{name:'Basic'};return `<tr><td><b>${escapeHtml(u.name)}</b><br>@${escapeHtml(u.username)} ${u.role==='admin'?'<span class="badge">ADMIN</span>':''}</td><td>Rp ${Number(u.saldo||0).toLocaleString('id-ID')}</td><td>${u.point||0}</td><td>${l.name}</td><td>${u.role==='user'?`<div class="admin-actions"><button onclick="addUserPoint('${u.id}')">+ Point</button><button onclick="addUserSaldo('${u.id}')">+ Saldo</button></div>`:'-'}</td></tr>`}).join('')}</table></div>`;}
  window.addUserPoint=async id=>{const n=Number(prompt('Tambah point:',100));if(!Number.isInteger(n)||n<=0)return;const u=get('jyyr_users',[]).find(x=>x.id===id);if(!u)return;try{await dbUpdate('profiles',{point:Number(u.point||0)+n},{id});u.point+=n;set('jyyr_users',get('jyyr_users',[]));renderUsers();}catch(e){dbError(e);}};
  window.addUserSaldo=async id=>{const n=Number(prompt('Tambah saldo:',1000));if(!Number.isFinite(n)||n<=0)return;const u=get('jyyr_users',[]).find(x=>x.id===id);if(!u)return;try{await dbUpdate('profiles',{saldo:Number(u.saldo||0)+n},{id});u.saldo+=n;set('jyyr_users',get('jyyr_users',[]));if(currentAccount()?.id===id)window._jyyrAccount.saldo=u.saldo;renderUsers();}catch(e){dbError(e);}};

  async function renderPayments(){
    const box=document.getElementById('adminContent');
    box.innerHTML='<div class="admin-note">⏳ Memuat pembayaran...</div>';
    try{
      const {data,error}=await supabaseClient.from('payments').select('*,orders(id,user_id,product_name,target,quantity,total,payment_method,status,profiles(username))').order('created_at',{ascending:false});
      if(error)throw error;
      const payments=(data||[]).map(mapPayment);
      set(KEYS.payments,payments);
      const pending=payments.filter(p=>p.status==='pending');
      box.innerHTML=`<div class="dashboard-section"><h4>💳 Verifikasi Pembayaran</h4><p style="font-size:12px;color:#c4b5fd">Verifikasi bukti QRIS atau pembayaran DANA terlebih dahulu. Point user baru diberikan setelah pembayaran <b>verified</b>.</p></div><div class="payment-admin-list">${pending.length?pending.map(p=>{const o=p.order||{};return `<div class="payment-admin-card"><div class="payment-admin-main"><b>${escapeHtml(o.id||p.orderId)}</b><small>👤 ${escapeHtml(o.profiles?.username||'-')} • ${escapeHtml(o.product_name||'-')}</small><small>🎯 ${escapeHtml(o.target||'-')} • Qty ${Number(o.quantity||0).toLocaleString('id-ID')}</small><strong>Rp ${Number(o.total||0).toLocaleString('id-ID')} • ${String(p.method||'').toUpperCase()}</strong><small>${new Date(p.createdAt).toLocaleString('id-ID')}</small></div><div class="payment-admin-proof">${p.proofPath?'<button class="admin-actions-btn" onclick="viewPaymentProof(\''+escapeHtml(p.id)+'\')">🖼️ Lihat Bukti</button>':'<span class="badge">Tanpa bukti</span>'}</div><div class="admin-actions"><button class="success-btn" onclick="reviewPayment('${escapeHtml(p.id)}','verified')">✅ Verifikasi</button><button class="danger-btn" onclick="reviewPayment('${escapeHtml(p.id)}','rejected')">❌ Tolak</button></div></div>`}).join(''):'<div class="dashboard-section">Tidak ada pembayaran pending.</div>'}</div><div class="dashboard-section"><h4>🗂️ Riwayat Pembayaran</h4><table class="admin-table"><tr><th>Order</th><th>Metode</th><th>Status</th><th>Review</th></tr>${payments.filter(p=>p.status!=='pending').slice(0,30).map(p=>{const o=p.order||{};return `<tr><td><b>${escapeHtml(o.id||p.orderId)}</b><br>${escapeHtml(o.profiles?.username||'-')}</td><td>${escapeHtml(String(p.method||'').toUpperCase())}</td><td><span class="badge payment-status-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td><td>${p.reviewedAt?new Date(p.reviewedAt).toLocaleString('id-ID'):'-'}</td></tr>`}).join('')||'<tr><td colspan="4">Belum ada riwayat review.</td></tr>'}</table></div>`;
    }catch(e){dbError(e);box.innerHTML='<div class="dashboard-section">Gagal memuat pembayaran.</div>';}
  }

  window.viewPaymentProof=async id=>{
    const p=get(KEYS.payments,[]).find(x=>x.id===id);if(!p?.proofPath)return;
    try{
      const {data,error}=await supabaseClient.storage.from('payment-proofs').createSignedUrl(p.proofPath,300);
      if(error)throw error;
      if(data?.signedUrl)window.open(data.signedUrl,'_blank');
    }catch(e){dbError(e);}
  };

  window.reviewPayment=async(id,status)=>{
    const label=status==='verified'?'verifikasi':'tolak';
    if(!confirm(`Yakin ingin ${label} pembayaran ini?`))return;
    try{
      const {error}=await supabaseClient.rpc('admin_review_payment',{p_payment_id:id,p_status:status});
      if(error)throw error;
      await loadFromDatabase();
      renderPayments();
      if(status==='verified')showSuccess('Pembayaran berhasil diverifikasi. Point user diproses otomatis.');
      else showSuccess('Pembayaran ditolak dan order dibatalkan.');
    }catch(e){dbError(e);}
  };

  function renderOrders(){const os=get(KEYS.orders,[]).slice().reverse();document.getElementById('adminContent').innerHTML=`<div class="dashboard-section"><h4>🧾 Semua Transaksi</h4><table class="admin-table"><tr><th>ID/User</th><th>Produk</th><th>Total</th><th>Status</th><th>Aksi</th></tr>${os.length?os.map(o=>`<tr><td><b>${o.id}</b><br>${escapeHtml(o.buyer||o.user||'-')}</td><td>${escapeHtml(o.layanan)}<br>Qty: ${o.jumlah}</td><td>Rp ${Number(o.total||0).toLocaleString('id-ID')}</td><td><span class="badge">${o.status||'pending'}</span></td><td><div class="admin-actions"><button onclick="setOrderStatus('${o.id}','processing')">Proses</button><button onclick="setOrderStatus('${o.id}','success')">Sukses</button><button class="danger-btn" onclick="setOrderStatus('${o.id}','cancelled')">Batal</button></div></td></tr>`).join(''):'<tr><td colspan="5">Belum ada transaksi.</td></tr>'}</table></div>`;}
  window.setOrderStatus=async(id,status)=>{try{const payment=get(KEYS.payments,[]).find(p=>p.orderId===id);if((status==='processing'||status==='success')&&payment?.status!=='verified')return showError('Verifikasi pembayaran terlebih dahulu.');await dbUpdate('orders',{status,updated_at:new Date().toISOString()},{id});const os=get(KEYS.orders,[]),o=os.find(x=>x.id===id);if(o)o.status=status;set(KEYS.orders,os);renderOrders();}catch(e){dbError(e);}};

  function renderLevels(){const ls=get(KEYS.levels,[]);document.getElementById('adminContent').innerHTML=`<h4>➕ Tambah Level</h4><div class="admin-form"><input class="input" id="lName" placeholder="Nama level"><input class="input" id="lPoint" type="number" placeholder="Minimal point"><input class="input" id="lReward" type="number" placeholder="Reward saldo"><button class="success-btn full" onclick="addLevel()">Tambah Level</button></div><table class="admin-table"><tr><th>Level</th><th>Minimal Point</th><th>Reward</th><th>Aksi</th></tr>${ls.map(l=>`<tr><td>${escapeHtml(l.name)}</td><td>${l.minPoint}</td><td>Rp ${Number(l.reward||0).toLocaleString('id-ID')}</td><td><button class="danger-btn" onclick="deleteLevel('${escapeHtml(l.name)}')">Hapus</button></td></tr>`).join('')}</table>`;}
  window.addLevel=async()=>{const l={name:document.getElementById('lName').value.trim(),minPoint:+document.getElementById('lPoint').value,reward:+document.getElementById('lReward').value||0};if(!l.name)return showError('Nama level wajib diisi.');if(l.minPoint<0)return showError('Minimal point tidak boleh negatif.');try{const {data,error}=await supabaseClient.from('levels').insert({name:l.name,min_point:l.minPoint,reward:l.reward}).select().single();if(error)throw error;const ls=get(KEYS.levels,[]);ls.push(mapLevel(data));ls.sort((a,b)=>a.minPoint-b.minPoint);set(KEYS.levels,ls);renderLevels();}catch(e){dbError(e);}};
  window.deleteLevel=async name=>{try{const {error}=await supabaseClient.from('levels').delete().eq('name',name);if(error)throw error;set(KEYS.levels,get(KEYS.levels,[]).filter(x=>x.name!==name));renderLevels();}catch(e){dbError(e);}};

  function renderBroadcast(){const bs=get(KEYS.broadcasts,[]);document.getElementById('adminContent').innerHTML=`<h4>📢 Kirim Broadcast</h4><div class="admin-form"><input class="input" id="bTitle" placeholder="Judul"><textarea class="input full" id="bMessage" placeholder="Pesan"></textarea><button class="success-btn full" onclick="sendBroadcast()">Kirim ke Semua User</button></div><div class="broadcast-list">${bs.slice().reverse().map(b=>`<div class="broadcast-item"><div class="broadcast-content"><b>${escapeHtml(b.title)}</b><br>${escapeHtml(b.message)}<br><small>${new Date(b.time).toLocaleString('id-ID')}</small></div><button type="button" class="danger-btn broadcast-delete-btn" onclick="deleteBroadcast('${escapeHtml(b.id)}')">🗑️ Hapus</button></div>`).join('')}</div>`;}
  window.sendBroadcast=async()=>{const title=document.getElementById('bTitle').value.trim(),message=document.getElementById('bMessage').value.trim();if(!title||!message)return showError('Judul dan pesan wajib diisi.');try{const {data,error}=await supabaseClient.from('broadcasts').insert({title,message,created_by:currentAccount().id}).select().single();if(error)throw error;const bs=get(KEYS.broadcasts,[]);bs.unshift(mapBroadcast(data));set(KEYS.broadcasts,bs);renderBroadcast();showSuccess('Broadcast berhasil dikirim ke semua user.');}catch(e){dbError(e);}};
  let pendingBroadcastDeleteId=null;
  window.deleteBroadcast=id=>{const item=get(KEYS.broadcasts,[]).find(b=>b.id===id);if(!item)return;pendingBroadcastDeleteId=id;const name=document.getElementById('broadcastConfirmName');if(name)name.textContent=item.title||'Broadcast tanpa judul';document.getElementById('popupBroadcastConfirm')?.classList.add('show');};
  window.closeBroadcastConfirm=()=>{pendingBroadcastDeleteId=null;document.getElementById('popupBroadcastConfirm')?.classList.remove('show');};
  window.confirmDeleteBroadcast=async()=>{if(!pendingBroadcastDeleteId)return closeBroadcastConfirm();const id=pendingBroadcastDeleteId;try{const {error}=await supabaseClient.from('broadcasts').delete().eq('id',id);if(error)throw error;set(KEYS.broadcasts,get(KEYS.broadcasts,[]).filter(b=>b.id!==id));closeBroadcastConfirm();renderBroadcast();showSuccess('Broadcast berhasil dihapus.');}catch(e){dbError(e);}};

  function renderServiceDropdown(){const box=document.getElementById('serviceList');if(!box)return;const ps=get(KEYS.products,[]).filter(p=>p.active);if(!ps.length){box.innerHTML='<div class="dropdown-item">Tidak ada produk aktif</div>';return;}const groups={};ps.forEach(p=>(groups[p.category]??=[]).push(p));box.innerHTML=Object.entries(groups).map(([cat,arr])=>`<div class="dropdown-item" style="pointer-events:none;opacity:.6"><b>${escapeHtml(cat)}</b></div>${arr.map(p=>`<div class="dropdown-item" data-id="${p.id}" data-icon="${p.icon}" data-text="${escapeHtml(p.name)} — Rp${p.price} / 1 (Min ${p.min})" data-value="${p.price}|${p.max}|${p.min}" onclick="selectItem(this,event)"><img src="${p.icon}" width="18" style="vertical-align:middle;margin-right:6px">${escapeHtml(p.name)} : Rp${p.price}</div>`).join('')}`).join('');const first=ps[0];document.getElementById('layanan').value=`${first.price}|${first.max}|${first.min}`;document.getElementById('layanan').dataset.productId=first.id||'';document.getElementById('selectedText').innerHTML=`<img src="${first.icon}" width="18" style="vertical-align:middle;margin-right:6px">${escapeHtml(first.name)} — Rp${first.price} / 1 (Min ${first.min})`;updateHarga();}
  function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  window.escapeHtml=escapeHtml;

  // Keep the existing order/payment UI, but write the actual order to Supabase.
  const oldConfirm=window.confirmBayar;
  window.confirmBayar=function(){const u=currentAccount();if(!u){openAuth('login');showError('Silakan login atau daftar terlebih dahulu.');return;}oldConfirm();};
  const oldOpenPayment=window.bukaPembayaran;
  window.bukaPembayaran=function(){const u=currentAccount();if(!u){openAuth('login');showError('Silakan login atau daftar terlebih dahulu untuk memesan.');return;}oldOpenPayment();};

  window.simpanRiwayat=async function(user,layanan,jumlah,total,id,value){
    const u=currentAccount(); if(!u)throw new Error('Sesi login tidak ditemukan.');
    const productId=(value?.productId)||document.getElementById('layanan')?.dataset.productId||null;
    const parts=(value?.layanan||'').split('|');
    const product=get(KEYS.products,[]).find(p=>p.id===productId)||get(KEYS.products,[]).find(p=>String(p.price)===String(parts[0])&&String(p.max)===String(parts[1])&&String(p.min)===String(parts[2]));
    const paymentMethod=value?.metode==='qris'?'qris':'dana';
    const orderPayload={id,user_id:u.id,product_id:productId||product?.id||null,product_name:layanan,target:user,quantity:Number(jumlah),unit_price:product?Number(product.price):Number(total)/Number(jumlah),total:Number(total),payment_method:paymentMethod,status:'pending'};
    let createdOrder=false, proofPath=null;
    try{
      const {data:order,error}=await supabaseClient.from('orders').insert(orderPayload).select('*,profiles(username)').single();
      if(error)throw error;
      createdOrder=true;
      if(paymentMethod==='qris'){
        const file=document.getElementById('bukti')?.files?.[0];
        if(!file)throw new Error('Bukti QRIS belum dipilih.');
        const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
        proofPath=`${u.id}/${id}.${ext}`;
        const upload=await supabaseClient.storage.from('payment-proofs').upload(proofPath,file,{upsert:true,contentType:file.type});
        if(upload.error)throw upload.error;
      }
      const {error:payError}=await supabaseClient.from('payments').insert({order_id:id,method:paymentMethod,proof_path:proofPath,status:'pending'});
      if(payError)throw payError;
      const os=get(KEYS.orders,[]);os.unshift(mapOrder(order));set(KEYS.orders,os);
      historyData.unshift({waktu:new Date().toLocaleString('id-ID'),user,layanan,jumlah,total,id,value,status:'pending',buyer:u.username,userId:u.id});
      set(KEYS.orders,os);
      window._jyyrAccount=u;
    }catch(e){
      if(proofPath){try{await supabaseClient.storage.from('payment-proofs').remove([proofPath]);}catch(_){} }
      if(createdOrder){try{await supabaseClient.from('orders').delete().eq('id',id);}catch(_){} }
      throw e;
    }
  };

  try{
    const ok=await loadFromDatabase();
    if(!ok)return;
    renderServiceDropdown(); updateAccountUI();
    if(currentAccount().role==='admin') setTimeout(()=>openAdminPanel(),80);
  }catch(e){
    console.error(e);
    showError('Gagal memuat database Supabase: '+(e?.message||'periksa konfigurasi/RLS.'));
    setTimeout(()=>window.location.replace('login.html'),2500);
  }
})();
