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

