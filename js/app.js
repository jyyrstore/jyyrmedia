/* ========================================
   JYYR UI ICONS — TABLER OUTLINE
   Presentation-only helper. No business logic.
======================================== */
(function(){
  const paths={
    close:'<path d="M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18"/><path d="M9 8l6 8"/><path d="M15 8l-6 8"/>',
    home:'<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>',
    trash:'<path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>',
    lock:'<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M8 11v-4a4 4 0 1 1 8 0v4"/>',
    unlock:'<path d="M3 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -6"/><path d="M9 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M13 11v-4a4 4 0 1 1 8 0v4"/>',
    edit:'<path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415"/><path d="M16 5l3 3"/>',
    cancel:'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M18.364 5.636l-12.728 12.728"/>',
    back:'<path d="M9 14l-4 -4l4 -4"/><path d="M5 10h11a4 4 0 1 1 0 8h-1"/>',
    check:'<path d="M9 12l2 2l4 -4"/><path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9"/>',
    alert:'<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0"/><path d="M12 16h.01"/>',
    mail:'<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10"/><path d="M3 7l9 6l9 -6"/>',
    eye:'<path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/>',
    eyeOff:'<path d="M10.585 10.587a2 2 0 0 0 2.829 2.828"/><path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87"/><path d="M3 3l18 18"/>',
    settings:'<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 2.924 0 3.35a1.724 1.724 0 0 0 1.066 2.573c-.94 1.543 .826 3.31 2.37 2.37c1 .608 2.296 .07 2.572 -1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
    user:'<path d="M12 13a3 3 0 1 0 0 -6a3 3 0 0 0 0 6"/><path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9"/><path d="M6 20.05v-.05a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v.05"/>',
    users:'<path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
    bell:'<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
    coin:'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M14.8 9a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1"/><path d="M12 7v10"/>',
    cash:'<path d="M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3"/><path d="M7 10a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8"/><path d="M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>',
    deposit:'<path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M12.25 18h-7.25a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v4.5"/><path d="M18 12h.01"/><path d="M6 12h.01"/><path d="M16 19h6"/><path d="M19 16v6"/>',
    dashboard:'<path d="M4 18v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2"/><path d="M4 9h16"/><path d="M10 14l2 2l2 -2"/>',
    store:'<path d="M3 21l18 0"/><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4"/><path d="M5 21l0 -10.15"/><path d="M19 21l0 -10.15"/><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4"/>',
    logout:'<path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"/><path d="M9 12h12l-3 -3"/><path d="M18 15l3 -3"/>',
    logout2:'<path d="M10 8v-2a2 2 0 0 1 2 -2h7a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-2"/><path d="M15 12h-12l3 -3"/><path d="M6 15l-3 -3"/>',
    brandShopee:'<path d="M4 7l.867 12.143a2 2 0 0 0 2 1.857h10.276a2 2 0 0 0 2 -1.857l.867 -12.143h-16l-.01 0"/><path d="M8.5 7c0 -1.653 1.5 -4 3.5 -4s3.5 2.347 3.5 4"/><path d="M9.5 17c.413 .462 1 1 2.5 1s2.5 -.897 2.5 -2s-1 -1.5 -2.5 -2s-2 -1.47 -2 -2c0 -1.104 1 -2 2 -2s1.5 0 2.5 1"/>',
    wallet:'<path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12"/><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4"/>',
    photoPlus:'<path d="M15 8h.01"/><path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l4 4"/><path d="M14 14l1 -1c.67 -.644 1.45 -.824 2.182 -.54"/><path d="M16 19h6"/><path d="M19 16v6"/>',
    photoCancel:'<path d="M15 8h.01"/><path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l3 3"/><path d="M14 14l1 -1c.616 -.593 1.328 -.792 2.008 -.598"/><path d="M16 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M17 21l4 -4"/>',
    card:'<path d="M3 8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -8"/><path d="M3 10l18 0"/><path d="M7 15l.01 0"/><path d="M11 15l2 0"/>',
    search:'<path d="M3 10a7 7 0 1 0 14 0a7 7 0 0 0 -14 0"/><path d="M21 21l-6 -6"/>',
    category:'<path d="M4 4h6v6h-6l0 -6"/><path d="M14 4h6v6h-6l0 -6"/><path d="M4 14h6v6h-6l0 -6"/><path d="M14 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
    package:'<path d="M12 3l8 4.5v9l-8 4.5l-8-4.5v-9z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M4 7.5l8 4.5"/>',
    receipt:'<path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-3 2l-3 -2z"/><path d="M9 9h6"/><path d="M9 13h6"/>',
    trophy:'<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1 -10 0z"/><path d="M7 6h-3v2a4 4 0 0 0 4 4"/><path d="M17 6h3v2a4 4 0 0 1 -4 4"/>',
    broadcast:'<path d="M15 8a5 5 0 0 1 0 8"/><path d="M17.7 5.3a9 9 0 0 1 0 13.4"/><path d="M9 12h-1a2 2 0 0 0 -2 2v1a2 2 0 0 0 2 2h1l4 3v-14z"/>',
    chart:'<path d="M4 19v-8"/><path d="M10 19v-14"/><path d="M16 19v-5"/><path d="M22 19v-9"/>',
    plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
    refresh:'<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>',
    arrowRight:'<path d="M5 12h14"/><path d="M13 18l6 -6l-6 -6"/>',
    arrowDown:'<path d="M12 5v14"/><path d="M18 13l-6 6l-6 -6"/>',
    arrowUp:'<path d="M12 19V5"/><path d="M6 11l6 -6l6 6"/>',
    file:'<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v13h-14z"/><path d="M9 13h6"/><path d="M9 17h6"/>',
    shield:'<path d="M12 3l7 4v5c0 5 -3.5 8 -7 9c-3.5 -1 -7 -4 -7 -9v-5z"/><path d="M9 12l2 2l4 -4"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M12 17v.01"/><path d="M12 13a2 2 0 1 0 -2 -2"/><path d="M10 9a2 2 0 1 1 2 2"/>',
    message:'<path d="M4 20l3.5 -3h8.5a4 4 0 0 0 4 -4v-5a4 4 0 0 0 -4 -4h-8a4 4 0 0 0 -4 4z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/>',
    crown:'<path d="M3 8l4 3l5 -6l5 6l4 -3l-2 10h-14z"/><path d="M5 21h14"/>',
    star:'<path d="M12 3l2.7 5.5l6.3.9l-4.5 4.4l1.1 6.2l-5.6 -3l-5.6 3l1.1 -6.2l-4.5 -4.4l6.3 -.9z"/>',
    gift:'<path d="M20 12v8a1 1 0 0 1 -1 1h-14a1 1 0 0 1 -1 -1v-8"/><path d="M2 7h20v5h-20z"/><path d="M12 7v14"/><path d="M12 7H8.5a2.5 2.5 0 1 1 0 -5c3.5 0 3.5 5 3.5 5"/><path d="M12 7h3.5a2.5 2.5 0 1 0 0 -5c-3.5 0 -3.5 5 -3.5 5"/>'
  };
  window.jyyrIcon=(name,label='')=>`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${label?` aria-label="${String(label).replace(/"/g,'&quot;')}"`:''} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/>${paths[name]||paths.file}</svg>`;
})();

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
   RIWAYAT — SUPABASE SOURCE OF TRUTH
======================================== */

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
        userId: order.userId
    };
}

async function refreshRiwayat() {
    const box = document.getElementById("listRiwayat");
    const u = typeof currentAccount === "function" ? currentAccount() : null;
    if (!box || !u || !window.jyyrSupabase) return;

    box.innerHTML = "Memuat riwayat...";

    try {
        const { data, error } = await window.jyyrSupabase
            .from("orders")
            .select("*")
            .eq("user_id", u.id)
            .order("created_at", { ascending: false });
        if (error) throw error;

        const products = getProductsCache();
        const orders = (data || []).map(mapOrderPublic);
        historyData = orders.map(o => buildHistoryItem(o, products));
        renderRiwayatList();
    } catch (e) {
        console.error(e);
        box.innerHTML = "Gagal memuat riwayat pesanan.";
        showError(e?.message || "Gagal memuat riwayat.");
    }
}

function getProductsCache() {
    try { return JSON.parse(localStorage.getItem("jyyr_cache_products") || "[]"); }
    catch (_) { return []; }
}

function mapOrderPublic(o) {
    return {
        id: o.id,
        userId: o.user_id,
        buyer: "",
        layanan: o.product_name,
        jumlah: Number(o.quantity),
        total: Number(o.total),
        metode: o.payment_method,
        status: o.status,
        time: o.created_at,
        productId: o.product_id,
        target: o.target
    };
}

function renderRiwayatList() {
    const box = document.getElementById("listRiwayat");
    if (!box) return;

    if (!historyData.length) {
        box.innerHTML = "Belum ada pesanan";
        return;
    }

    box.innerHTML = historyData.map((item, index) => `
<div style="border-bottom:1px solid rgba(255,255,255,.1);padding:10px 0">
    <b>ID: ${escapeHtml(item.id || "-")}</b><br>
    <b>${escapeHtml(item.user || "-")}</b><br>
    ${escapeHtml(item.layanan || "-")}<br>
    Jumlah: ${Number(item.jumlah || 0).toLocaleString("id-ID")}<br>
    Rp ${Number(item.total || 0).toLocaleString("id-ID")}<br>
    Status: <b>${escapeHtml(item.status || "pending")}</b><br>
    <small>${escapeHtml(item.waktu || "-")}</small><br><br>
    <button onclick="orderLagi(${index})">${jyyrIcon('refresh')} Order Lagi</button>
</div>`).join("");
}

async function lihatRiwayat() {
    const popup = document.getElementById("popupRiwayat");
    if (popup) popup.classList.add("show");
    await refreshRiwayat();
}

function orderLagi(index) {
    const item = historyData[index];
    if (!item) return;

    document.getElementById("username").value = item.user || "";
    document.getElementById("jumlah").value = item.jumlah || "";

    const productId = item.value?.productId || null;
    let itemLayanan = productId
        ? [...document.querySelectorAll(".dropdown-item[data-id]")].find(el => el.dataset.id === productId)
        : null;

    if (!itemLayanan && item.value?.layanan) {
        itemLayanan = [...document.querySelectorAll(".dropdown-item[data-value]")]
            .find(el => el.dataset.value === item.value.layanan);
    }

    if (!itemLayanan) {
        showError("Produk pada pesanan lama sudah tidak tersedia/aktif.");
        return;
    }

    selectItem(itemLayanan);

    const payItems = document.querySelectorAll(".pay-item");
    const qris = item.value?.metode === "qris";
    payItems.forEach(i => i.classList.remove("active"));
    if (payItems[qris ? 1 : 0]) payItems[qris ? 1 : 0].classList.add("active");
    document.getElementById("metode").value = qris ? "qris" : "dana";
    updateHarga();
    closeRiwayat();
}

/* Riwayat sekarang adalah data database. Tombol lama "Hapus Riwayat"
   tidak boleh menghapus order asli, sehingga fungsinya menjadi refresh. */
function hapusRiwayat() {
    return refreshRiwayat();
}

function closeRiwayat() {
    document.getElementById("popupRiwayat")?.classList.remove("show");
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
    // Satu-satunya entry point pembayaran. Auth + validasi dilakukan di sini.
    const buyer = typeof currentAccount === "function" ? currentAccount() : null;
    if (!buyer) {
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

    // Saldo ditangani oleh feature pack melalui helper khusus, tanpa wrapper
    // yang mengganti window.bukaPembayaran.
    if (metode === "balance") {
        if (typeof window.jyyrHandleBalanceCheckout === "function") {
            Promise.resolve(window.jyyrHandleBalanceCheckout()).catch((error) => {
                console.error('Balance checkout error:', error);
                showError(error?.message || 'Gagal memproses pembayaran saldo.');
            });
        } else {
            showError("Fitur pembayaran saldo belum siap. Silakan coba lagi.");
        }
        return;
    }

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

async function updateHarga() {

    const data = document
        .getElementById("layanan")?.value
        ?.split("|") || [];

    const harga = parseFloat(data[0]);
    const max = parseInt(data[1]);
    const min = parseInt(data[2]);

    const input = document.getElementById("jumlah");
    const jumlah = parseInt(input?.value) || 0;
    const totalBox = document.getElementById("total");

    if (!input || !totalBox) return;

    input.classList.remove("input-error");

    if (!jumlah) {
        totalBox.innerHTML = "Total: Rp 0";
        return;
    }

    if (jumlah < min) {
        totalBox.innerHTML =
            `<span class="error">${jyyrIcon('alert')} Minimal ${min}</span>`;
        input.classList.add("input-error");
        return;
    }

    if (jumlah > max) {
        totalBox.innerHTML =
            `<span class="error">${jyyrIcon('alert')} Maksimal ${max}</span>`;
        input.classList.add("input-error");
        return;
    }

    const raw = harga * jumlah;
    let discount = 0;
    if (typeof window.jyyrGetCheckoutDiscount === "function") {
        try {
            discount = Number(await window.jyyrGetCheckoutDiscount()) || 0;
        } catch (_) {
            discount = 0;
        }
    }

    discount = Math.max(0, Math.min(100, Number(discount) || 0));
    const total = Math.round(raw * (1 - discount / 100) * 100) / 100;

    // Keep the last client-side checkout calculation available to the
    // confirmation flow so the visible total and WhatsApp message stay
    // consistent. The database remains the final source of truth.
    window._jyyrCheckoutDiscount = discount;
    window._jyyrCheckoutTotal = total;
    window._jyyrCheckoutRawTotal = raw;

    totalBox.innerHTML =
        "Total: Rp " + total.toLocaleString("id-ID") +
        (discount ? " <small style='opacity:.7'>Diskon level " + discount +
        "% • normal Rp " + raw.toLocaleString("id-ID") + "</small>" : "");
}

/* ========================================
   CONFIRM BAYAR
======================================== */

async function confirmBayar() {

    const buyer = typeof currentAccount === "function" ? currentAccount() : null;
    if (!buyer) {
        openAuth('login');
        showError("Silakan login atau daftar terlebih dahulu.");
        return;
    }

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

    const hargaTampilan = Number(data[0]);
    const max = Number(data[1]);
    const min = Number(data[2]);

    // Dipakai oleh semua jalur validasi agar tombol selalu kembali aktif.
    const resetButton = () => {
        btn.disabled = false;
        btn.innerText = "Bayar Sekarang";
    };

    if (!Number.isFinite(hargaTampilan) || hargaTampilan <= 0 || !Number.isInteger(min) || min <= 0 || !Number.isInteger(max) || max < min) {
        resetButton();
        showError("Data layanan tidak valid. Silakan pilih layanan lagi.");
        return;
    }

    const input = document.getElementById("jumlah");
    input.classList.remove("input-error");

    /* ================= VALIDASI ================= */

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
            showError("Upload bukti pembayaran dulu!");
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            resetButton();
            showError("Format bukti harus JPG, PNG, atau WEBP!");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            resetButton();
            showError("Ukuran file maksimal 2 MB!");
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

    const buyerAccount = typeof currentAccount === "function" ? currentAccount() : null;
    const buyerUsername = buyerAccount?.username || "-";

    // Re-read the checkout discount at confirmation time so the WhatsApp
    // amount follows the same level pricing shown in the checkout UI.
    let discount = Number(window._jyyrCheckoutDiscount) || 0;
    if (typeof window.jyyrGetCheckoutDiscount === "function") {
        try {
            discount = Number(await window.jyyrGetCheckoutDiscount()) || 0;
        } catch (_) {
            // Keep the already-rendered checkout discount if the helper fails.
        }
    }
    discount = Math.max(0, Math.min(100, discount));
    const rawTotal = hargaTampilan * jumlah;
    const totalAngkaTampilan = Math.round(rawTotal * (1 - discount / 100) * 100) / 100;

    const text = `HALO ADMIN JYYR STORE
MY ORDER PROCESS
====================

📦 Layanan: ${layananText}
👤 User: ${buyerUsername}
🔗Link: ${user}
🆔 ID Pesanan: ${orderId}
📅 Tanggal: ${tanggal}
💳 Metode: ${metodeText}
🔢 Jumlah: ${jumlah.toLocaleString("id-ID")}
💰 Total: Rp ${totalAngkaTampilan.toLocaleString("id-ID")}

====================`;

    setTimeout(() => {

        hideLoading();

        const totalAngka = totalAngkaTampilan;

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

            // Reset dropdown dari produk aktif di Supabase — tidak ada fallback hardcoded.
            renderServiceDropdown();

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
                ).innerHTML =
                    `${jyyrIcon('photoPlus')} Upload Bukti Pembayaran`;
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
    const text=document.getElementById("popupText");
    const popup=document.getElementById("popupError");
    if(text) text.innerText=String(msg??"Terjadi kesalahan.");
    if(popup) popup.classList.add("show");
}

function closePopup() {
    document.getElementById("popupError")?.classList.remove("show");
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

        if (e.target === popup) {
            popup.classList.remove("show");
        }

    });

});

/* ==========================================================
   POPUP SCROLL LOCK
   Covers both static popups and dynamically injected feature popups.
========================================================== */
(function(){
  let frame=0;
  const sync=()=>{
    frame=0;
    document.body.classList.toggle('popup-open',!!document.querySelector('.popup.show'));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  sync();
})();

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

  async function dbUpdate(table,values,filter){
    let q=supabaseClient.from(table).update(values);
    Object.entries(filter).forEach(([k,v])=>q=q.eq(k,v));
    const {error}=await q; if(error) throw error;
  }
  function dbError(e){ console.error(e); showError(e?.message||'Gagal menyimpan ke database.'); }

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

  // Order/payment entry points remain defined once in app.js.

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
