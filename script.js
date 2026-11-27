
/* =====================================================
   OUR LITTLE SAVINGS v3.0
   SUPABASE EDITION
===================================================== */

/* =====================================================
   1. KONFIGURASI SUPABASE
===================================================== */

// GANTI dengan Project URL dari Supabase
const SUPABASE_URL = "https://cssvmoqvrudjktowpfeu.supabase.co";

// GANTI dengan Publishable Key dari Supabase
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_85hezRXUxREi8UPdBNGoXA_W2LyJa-W";

// GANTI kedua UID berikut dengan UID dari Supabase.
// Jangan tertukar antara UID Ainun dan UID Dzikri.
const USER_NAME_BY_ID = {
    "36059195-372d-415a-b354-db5552715c6d": "Ainunnia Warohmah",
    "bad13b66-1e12-4949-97f1-df5f3355f0e2": "Dzikri Maulanal Hakim"
};

const targetAinun = 125000;
const targetDzikri = 300000;

const KUNCI_PENYIMPANAN = "ourLittleSavingsData";
const KUNCI_MIGRASI = "ourLittleSavingsMigration_v3";

const daftarNama = [
    "Ainunnia Warohmah",
    "Dzikri Maulanal Hakim"
];

const supabaseSiap =
    typeof window.supabase !== "undefined" &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("ISI_PROJECT") &&
    !SUPABASE_PUBLISHABLE_KEY.includes("ISI_PUBLISHABLE");

let db = null;

if (supabaseSiap) {
    db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
}

/* =====================================================
   2. ELEMEN HTML
===================================================== */

// Login
const authSection = document.getElementById("authSection");
const formLogin = document.getElementById("formLogin");
const emailLogin = document.getElementById("emailLogin");
const passwordLogin = document.getElementById("passwordLogin");
const tombolLogin = document.getElementById("tombolLogin");
const pesanLogin = document.getElementById("pesanLogin");

// Akun
const userBar = document.getElementById("userBar");
const namaPenggunaAktif = document.getElementById("namaPenggunaAktif");
const tombolLogout = document.getElementById("tombolLogout");

// Aplikasi
const appContent = document.getElementById("appContent");

const form = document.getElementById("formTabungan");
const pesan = document.getElementById("pesan");
const stiker = document.getElementById("stiker");

const inputNama = document.getElementById("nama");
const inputNominal = document.getElementById("nominal");
const inputTanggal = document.getElementById("tanggal");
const inputKeterangan = document.getElementById("keterangan");

const tombolSimpan = document.getElementById("tombolSimpan");
const tombolBatal = document.getElementById("tombolBatal");
const judulForm = document.getElementById("judulForm");

let grafikBatang;
let grafikLingkaran;
let grafikGaris;

let idSedangDiedit = null;
let penggunaAktif = null;
let namaAktif = null;
let channelRealtime = null;
let sedangMemuat = false;

/* =====================================================
   3. LOCAL STORAGE DAN ID
===================================================== */

function muatTransaksiLokal() {
    try {
        const data = localStorage.getItem(KUNCI_PENYIMPANAN);

        if (!data) return [];

        const hasil = JSON.parse(data);

        if (!Array.isArray(hasil)) return [];

        return hasil.filter(item =>
            item &&
            typeof item.id === "string" &&
            daftarNama.includes(item.nama) &&
            Number.isSafeInteger(Number(item.nominal)) &&
            Number(item.nominal) > 0 &&
            typeof item.tanggal === "string"
        ).map(item => ({
            ...item,
            nominal: Number(item.nominal),
            keterangan: item.keterangan || ""
        }));

    } catch (error) {
        console.error("Gagal membaca data lokal:", error);
        return [];
    }
}

function simpanTransaksiLokal(data) {
    try {
        localStorage.setItem(
            KUNCI_PENYIMPANAN,
            JSON.stringify(data)
        );

        return true;

    } catch (error) {
        console.error("Gagal menyimpan data lokal:", error);
        return false;
    }
}

function buatID() {
    if (window.crypto &&
        typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    throw new Error(
        "Browser tidak mendukung pembuatan ID aman. Gunakan browser terbaru."
    );
}

function idValidUUID(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/* =====================================================
   4. TANGGAL DAN FORMAT RUPIAH
===================================================== */

function tanggalHariIni() {
    const sekarang = new Date();

    const tahun = sekarang.getFullYear();
    const bulan = String(sekarang.getMonth() + 1).padStart(2, "0");
    const hari = String(sekarang.getDate()).padStart(2, "0");

    return `${tahun}-${bulan}-${hari}`;
}

function buatTanggal(tanggalString) {
    const [tahun, bulan, hari] =
        tanggalString.split("-").map(Number);

    return new Date(tahun, bulan - 1, hari);
}

function tanggalValid(tanggal) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
        return false;
    }

    const hasil = buatTanggal(tanggal);

    return !Number.isNaN(hasil.getTime()) &&
        hasil.getFullYear() === Number(tanggal.slice(0, 4)) &&
        hasil.getMonth() + 1 === Number(tanggal.slice(5, 7)) &&
        hasil.getDate() === Number(tanggal.slice(8, 10));
}

function rupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(angka);
}

function formatTanggal(tanggalString) {
    return buatTanggal(tanggalString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

/* =====================================================
   5. LOGIN DAN LOGOUT
===================================================== */

function tampilkanLogin() {
    authSection.classList.remove("hidden");
    userBar.classList.add("hidden");
    appContent.classList.add("hidden");
}

function tampilkanAplikasi() {
    authSection.classList.add("hidden");
    userBar.classList.remove("hidden");
    appContent.classList.remove("hidden");
}

function aturIdentitasPengguna(user) {
    const nama = USER_NAME_BY_ID[user.id];

    if (!nama) {
        throw new Error(
            "UID akun ini belum terdaftar. Periksa konfigurasi UID di script.js."
        );
    }

    penggunaAktif = user;
    namaAktif = nama;

    namaPenggunaAktif.textContent = nama;

    // Nama otomatis mengikuti akun yang login.
    inputNama.value = nama;
    inputNama.disabled = true;
}

async function login(email, password) {
    if (!db) {
        throw new Error(
            "Konfigurasi Supabase belum lengkap. Periksa URL dan Publishable Key."
        );
    }

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    return data.user;
}

formLogin.addEventListener("submit", async function(event) {
    event.preventDefault();

    pesanLogin.textContent = "";

    tombolLogin.disabled = true;
    tombolLogin.textContent = "Sedang masuk...";

    try {
        const user = await login(
            emailLogin.value.trim(),
            passwordLogin.value
        );

        if (!USER_NAME_BY_ID[user.id]) {
            await db.auth.signOut();

            throw new Error(
                "Akun berhasil dikenali, tetapi UID belum dipasangkan dengan nama pengguna."
            );
        }

        passwordLogin.value = "";
        pesanLogin.textContent = "Login berhasil! ♡";

    } catch (error) {
        console.error("Login gagal:", error);
        pesanLogin.textContent =
            "Login gagal: " + error.message;

    } finally {
        tombolLogin.disabled = false;
        tombolLogin.textContent = "Masuk ♡";
    }
});

tombolLogout.addEventListener("click", async function() {
    const yakin = confirm("Yakin ingin keluar dari akun?");

    if (!yakin) return;

    tombolLogout.disabled = true;

    try {
        const { error } = await db.auth.signOut();

        if (error) throw error;

    } catch (error) {
        alert("Gagal logout: " + error.message);

    } finally {
        tombolLogout.disabled = false;
    }
});

/* =====================================================
   6. MEMUAT DATA DARI SUPABASE
===================================================== */

let transaksi = [];

async function muatTransaksiOnline() {
    if (!penggunaAktif) return;

    const { data, error } = await db
        .from("transaksi")
        .select("*")
        .order("tanggal", { ascending: false });

    if (error) {
        console.error("Gagal mengambil transaksi:", error);
        pesan.textContent =
            "Gagal memuat data online: " + error.message;
        return;
    }

    transaksi = data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        nama: item.nama,
        nominal: Number(item.nominal),
        tanggal: item.tanggal,
        keterangan: item.keterangan || ""
    }));

    perbaruiDashboard();
}

/* =====================================================
   7. MIGRASI DATA LAMA
===================================================== */

async function migrasiDataLama() {
    if (!penggunaAktif || !namaAktif) return;

    const kunciMigrasi =
        KUNCI_MIGRASI + "_" + penggunaAktif.id;

    if (localStorage.getItem(kunciMigrasi) === "selesai") {
        return;
    }

    const dataLokal = muatTransaksiLokal().filter(
        item => item.nama === namaAktif
    );

    if (dataLokal.length === 0) {
        localStorage.setItem(kunciMigrasi, "selesai");
        return;
    }

    pesan.textContent =
        "Memeriksa data tabungan lama...";

    const { data: dataOnline, error: errorAmbil } = await db
        .from("transaksi")
        .select("id")
        .eq("user_id", penggunaAktif.id);

    if (errorAmbil) {
        throw errorAmbil;
    }

    const idOnline = new Set(
        dataOnline.map(item => item.id)
    );

    const dataBaru = [];

    // Perbaiki ID lama yang bukan UUID.
    const dataLokalDiperbarui = muatTransaksiLokal();

    for (const item of dataLokalDiperbarui) {
        if (!idValidUUID(item.id)) {
            item.id = buatID();
        }
    }

    simpanTransaksiLokal(dataLokalDiperbarui);

    const dataMilikPengguna = dataLokalDiperbarui.filter(
        item => item.nama === namaAktif
    );

    for (const item of dataMilikPengguna) {
        if (idOnline.has(item.id)) continue;

        dataBaru.push({
            id: item.id,
            user_id: penggunaAktif.id,
            nama: namaAktif,
            nominal: item.nominal,
            tanggal: item.tanggal,
            keterangan: item.keterangan || ""
        });
    }

    if (dataBaru.length > 0) {
        const { error: errorInsert } = await db
            .from("transaksi")
            .insert(dataBaru);

        if (errorInsert) {
            throw errorInsert;
        }
    }

    // Tandai migrasi selesai hanya setelah seluruh proses berhasil.
    localStorage.setItem(kunciMigrasi, "selesai");

    pesan.textContent =
        dataBaru.length > 0
            ? `${dataBaru.length} transaksi lama berhasil dipindahkan!`
            : "Data lama sudah diperiksa. Tidak ada transaksi baru untuk dipindahkan.";
}

/* =====================================================
   8. MENYIMPAN TRANSAKSI KE SUPABASE
===================================================== */

async function tambahTransaksi(data) {
    const { error } = await db
        .from("transaksi")
        .insert({
            id: buatID(),
            user_id: penggunaAktif.id,
            nama: namaAktif,
            nominal: data.nominal,
            tanggal: data.tanggal,
            keterangan: data.keterangan
        });

    if (error) throw error;
}

async function perbaruiTransaksiOnline(id, data) {
    const { error } = await db
        .from("transaksi")
        .update({
            nominal: data.nominal,
            tanggal: data.tanggal,
            keterangan: data.keterangan
        })
        .eq("id", id)
        .eq("user_id", penggunaAktif.id);

    if (error) throw error;
}

async function hapusTransaksiOnline(id) {
    const { error } = await db
        .from("transaksi")
        .delete()
        .eq("id", id)
        .eq("user_id", penggunaAktif.id);

    if (error) throw error;
}

/* =====================================================
   9. PERHITUNGAN TABUNGAN
===================================================== */

function hitungTotal(nama) {
    return transaksi
        .filter(item => item.nama === nama)
        .reduce((total, item) => total + item.nominal, 0);
}

function hitungBulanan(nama) {
    const sekarang = new Date();

    return transaksi
        .filter(item => {
            const tanggal = buatTanggal(item.tanggal);

            return item.nama === nama &&
                tanggal.getMonth() === sekarang.getMonth() &&
                tanggal.getFullYear() === sekarang.getFullYear();
        })
        .reduce((total, item) => total + item.nominal, 0);
}

/* =====================================================
   10. GRAFIK
===================================================== */

function buatDataBulanan() {
    const labels = [];
    const dataAinun = [];
    const dataDzikri = [];

    const tahunSekarang = new Date().getFullYear();

    for (let i = 0; i < 12; i++) {
        const tanggal = new Date(tahunSekarang, i, 1);

        const bulan = tanggal.getMonth();
        const tahun = tanggal.getFullYear();

        labels.push(
            tanggal.toLocaleDateString("id-ID", {
                month: "short",
                year: "numeric"
            })
        );

        const totalA = transaksi
            .filter(item => {
                const waktu = buatTanggal(item.tanggal);

                return item.nama === daftarNama[0] &&
                    waktu.getMonth() === bulan &&
                    waktu.getFullYear() === tahun;
            })
            .reduce((total, item) => total + item.nominal, 0);

        const totalD = transaksi
            .filter(item => {
                const waktu = buatTanggal(item.tanggal);

                return item.nama === daftarNama[1] &&
                    waktu.getMonth() === bulan &&
                    waktu.getFullYear() === tahun;
            })
            .reduce((total, item) => total + item.nominal, 0);

        dataAinun.push(totalA);
        dataDzikri.push(totalD);
    }

    return { labels, dataAinun, dataDzikri };
}

const opsiGrafik = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "bottom",
            labels: {
                usePointStyle: true,
                padding: 18,
                font: {
                    family: "DM Sans"
                }
            }
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    return context.dataset.label + ": " +
                        rupiah(context.raw);
                }
            }
        }
    }
};

function buatGrafik() {
    if (typeof Chart === "undefined") {
        pesan.textContent =
            "Grafik belum dapat dimuat. Periksa koneksi internet.";
        return;
    }

    if (grafikBatang) return;

    grafikBatang = new Chart(
        document.getElementById("grafikBatang"),
        {
            type: "bar",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Ainun",
                        data: [],
                        backgroundColor: "#e99ac4",
                        borderRadius: 8
                    },
                    {
                        label: "Dzikri",
                        data: [],
                        backgroundColor: "#a88be0",
                        borderRadius: 8
                    }
                ]
            },
            options: {
                ...opsiGrafik,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => rupiah(value)
                        }
                    }
                }
            }
        }
    );

    grafikLingkaran = new Chart(
        document.getElementById("grafikLingkaran"),
        {
            type: "doughnut",
            data: {
                labels: ["Ainunnia", "Dzikri"],
                datasets: [{
                    label: "Total kontribusi",
                    data: [0, 0],
                    backgroundColor: ["#e99ac4", "#a88be0"],
                    borderColor: "#ffffff",
                    borderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                ...opsiGrafik,
                cutout: "62%"
            }
        }
    );

    grafikGaris = new Chart(
        document.getElementById("grafikGaris"),
        {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Ainun",
                        data: [],
                        borderColor: "#e99ac4",
                        backgroundColor: "rgba(233,154,196,0.15)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: "Dzikri",
                        data: [],
                        borderColor: "#a88be0",
                        backgroundColor: "rgba(168,139,224,0.12)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                ...opsiGrafik,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => rupiah(value)
                        }
                    }
                }
            }
        }
    );

    perbaruiGrafik();
}

function perbaruiGrafik() {
    if (!grafikBatang || !grafikLingkaran || !grafikGaris) {
        return;
    }

    const data = buatDataBulanan();

    grafikBatang.data.labels = data.labels;
    grafikBatang.data.datasets[0].data = data.dataAinun;
    grafikBatang.data.datasets[1].data = data.dataDzikri;
    grafikBatang.update();

    grafikLingkaran.data.datasets[0].data = [
        hitungTotal(daftarNama[0]),
        hitungTotal(daftarNama[1])
    ];
    grafikLingkaran.update();

    grafikGaris.data.labels = data.labels;
    grafikGaris.data.datasets[0].data = data.dataAinun;
    grafikGaris.data.datasets[1].data = data.dataDzikri;
    grafikGaris.update();
}

/* =====================================================
   11. TARGET BULANAN DAN DASHBOARD
===================================================== */

function tampilkanTarget(id, nama, target) {
    const total = hitungBulanan(nama);
    const persen = Math.min((total / target) * 100, 100);
    const kekurangan = Math.max(target - total, 0);

    const status = total >= target
        ? "Target bulan ini tercapai! 🎉"
        : "Kurang " + rupiah(kekurangan);

    document.getElementById(id).innerHTML = `
        <strong>${nama}</strong><br>
        ${rupiah(total)} / ${rupiah(target)}
        <div class="progress">
            <div class="progress-bar" style="width: ${persen}%"></div>
        </div>
        <span>${status} (${persen.toFixed(1)}%)</span>
    `;
}

function perbaruiDashboard() {
    const totalA = hitungTotal(daftarNama[0]);
    const totalD = hitungTotal(daftarNama[1]);

    document.getElementById("totalAinun").textContent = rupiah(totalA);
    document.getElementById("totalDzikri").textContent = rupiah(totalD);
    document.getElementById("totalBersama").textContent =
        rupiah(totalA + totalD);

    tampilkanTarget("targetAinun", daftarNama[0], targetAinun);
    tampilkanTarget("targetDzikri", daftarNama[1], targetDzikri);

    tampilkanRiwayat();
    perbaruiGrafik();
}

/* =====================================================
   12. RIWAYAT TRANSAKSI
===================================================== */

function tampilkanRiwayat() {
    const tabel = document.getElementById("riwayatTabungan");
    tabel.innerHTML = "";

    if (transaksi.length === 0) {
        tabel.innerHTML = `
            <tr>
                <td colspan="5" class="empty-history">
                    Belum ada transaksi.
                </td>
            </tr>
        `;
        return;
    }

    const daftarTransaksi = [...transaksi].sort((a, b) => {
        return b.tanggal.localeCompare(a.tanggal);
    });

    daftarTransaksi.forEach(item => {
        const baris = document.createElement("tr");

        if (item.id === idSedangDiedit) {
            baris.classList.add("editing-row");
        }

        const nama = document.createElement("td");
        nama.textContent = item.nama;

        const nominal = document.createElement("td");
        nominal.textContent = rupiah(item.nominal);

        const tanggal = document.createElement("td");
        tanggal.textContent = formatTanggal(item.tanggal);

        const keterangan = document.createElement("td");
        keterangan.textContent = item.keterangan || "-";

        const aksi = document.createElement("td");
        aksi.className = "action-cell";

        // Hanya pemilik transaksi yang bisa mengedit atau menghapus.
        if (item.user_id === penggunaAktif.id) {
            const tombolEdit = document.createElement("button");
            tombolEdit.type = "button";
            tombolEdit.textContent = "Edit";
            tombolEdit.className = "action-button edit-button";
            tombolEdit.addEventListener(
                "click",
                () => editTransaksi(item.id)
            );

            const tombolHapus = document.createElement("button");
            tombolHapus.type = "button";
            tombolHapus.textContent = "Hapus";
            tombolHapus.className = "action-button delete-button";
            tombolHapus.addEventListener(
                "click",
                () => hapusTransaksi(item.id)
            );

            aksi.append(tombolEdit, tombolHapus);
        } else {
            aksi.textContent = "—";
        }

        baris.append(nama, nominal, tanggal, keterangan, aksi);
        tabel.appendChild(baris);
    });
}

/* =====================================================
   13. EDIT TRANSAKSI
===================================================== */

function editTransaksi(id) {
    const item = transaksi.find(
        transaksiItem => transaksiItem.id === id
    );

    if (!item || item.user_id !== penggunaAktif.id) {
        pesan.textContent =
            "Kamu hanya dapat mengedit transaksi milik akunmu.";
        return;
    }

    idSedangDiedit = id;

    inputNama.value = namaAktif;
    inputNominal.value = item.nominal;
    inputTanggal.value = item.tanggal;
    inputKeterangan.value = item.keterangan;

    judulForm.textContent = "Edit Transaksi Tabungan";
    tombolSimpan.textContent = "Simpan Perubahan ♡";
    tombolBatal.classList.remove("hidden");

    pesan.textContent = "Silakan perbaiki data transaksi.";

    form.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    tampilkanRiwayat();
}

function resetModeForm() {
    idSedangDiedit = null;

    form.reset();

    inputNama.value = namaAktif;
    inputTanggal.value = tanggalHariIni();

    judulForm.textContent = "Catat Tabungan Baru";
    tombolSimpan.textContent = "Simpan Tabungan ♡";
    tombolBatal.classList.add("hidden");
}

/* =====================================================
   14. HAPUS TRANSAKSI
===================================================== */

async function hapusTransaksi(id) {
    const item = transaksi.find(
        transaksiItem => transaksiItem.id === id
    );

    if (!item || item.user_id !== penggunaAktif.id) {
        pesan.textContent =
            "Kamu hanya dapat menghapus transaksi milik akunmu.";
        return;
    }

    const yakin = confirm(
        `Hapus transaksi ${item.nama} sebesar ${rupiah(item.nominal)} pada ${formatTanggal(item.tanggal)}?`
    );

    if (!yakin) return;

    try {
        pesan.textContent = "Menghapus transaksi...";

        await hapusTransaksiOnline(id);

        if (idSedangDiedit === id) {
            resetModeForm();
        }

        await muatTransaksiOnline();

        pesan.textContent = "Transaksi berhasil dihapus.";

    } catch (error) {
        console.error("Gagal menghapus:", error);
        pesan.textContent =
            "Gagal menghapus transaksi: " + error.message;
    }
}

/* =====================================================
   15. FORM SETORAN
===================================================== */

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!penggunaAktif || !namaAktif) return;

    if (sedangMemuat) return;

    const nominal = Number(inputNominal.value);
    const tanggal = inputTanggal.value;
    const keterangan = inputKeterangan.value.trim();

    // Identitas tidak diambil dari pilihan pengguna.
    const nama = namaAktif;

    if (
        !daftarNama.includes(nama) ||
        !Number.isSafeInteger(nominal) ||
        nominal <= 0 ||
        !tanggalValid(tanggal)
    ) {
        pesan.textContent =
            "Periksa kembali nominal dan tanggal transaksi.";
        return;
    }

    sedangMemuat = true;
    tombolSimpan.disabled = true;

    try {
        if (idSedangDiedit !== null) {
            const item = transaksi.find(
                transaksiItem => transaksiItem.id === idSedangDiedit
            );

            if (!item || item.user_id !== penggunaAktif.id) {
                throw new Error("Transaksi tidak ditemukan atau bukan milikmu.");
            }

            pesan.textContent = "Menyimpan perubahan...";

            await perbaruiTransaksiOnline(idSedangDiedit, {
                nominal,
                tanggal,
                keterangan
            });

            resetModeForm();

            pesan.textContent =
                "Perubahan transaksi berhasil disimpan! ♡";

        } else {
            pesan.textContent = "Menyimpan tabungan...";

            await tambahTransaksi({
                nominal,
                tanggal,
                keterangan
            });

            resetModeForm();

            pesan.textContent =
                "Transaksi berhasil dicatat! ♡";

            tampilkanStiker();
        }

        await muatTransaksiOnline();

    } catch (error) {
        console.error("Gagal menyimpan transaksi:", error);

        pesan.textContent =
            "Gagal menyimpan transaksi: " + error.message;

    } finally {
        sedangMemuat = false;
        tombolSimpan.disabled = false;
    }
});

tombolBatal.addEventListener("click", function() {
    resetModeForm();

    pesan.textContent =
        "Edit dibatalkan. Tidak ada perubahan disimpan.";

    tampilkanRiwayat();
});

/* =====================================================
   16. STIKER KEJUTAN
===================================================== */

function tampilkanStiker() {
    const stikerLucu = [
        "🎉", "🐻", "🐰", "🌷", "💗",
        "✨", "🧸", "🦋", "🌸", "💐"
    ];

    const pesanLucu = [
        "Yeay! Satu langkah lebih dekat dengan impian kita!",
        "Tabungan bertambah, tetap semangat menabung bersama!",
        "Ingat tujuan kita. Setiap setoran punya arti!",
        "Hebat! Ayo terus semangat menabung bersama!",
        "Satu transaksi, satu langkah menuju masa depan!",
        "Setiap usaha kecil punya arti besar. 💗"
    ];

    const angka = Math.floor(Math.random() * stikerLucu.length);
    const pesanAngka = Math.floor(Math.random() * pesanLucu.length);

    document.getElementById("emojiStiker").textContent =
        stikerLucu[angka];

    document.getElementById("pesanStiker").textContent =
        pesanLucu[pesanAngka];

    stiker.classList.remove("hidden");
}

document.getElementById("tutupStiker").addEventListener("click", function() {
    stiker.classList.add("hidden");
});

/* =====================================================
   17. REALTIME SUPABASE
===================================================== */

function hentikanRealtime() {
    if (channelRealtime) {
        db.removeChannel(channelRealtime);
        channelRealtime = null;
    }
}

function mulaiRealtime() {
    hentikanRealtime();

    if (!penggunaAktif) return;

    channelRealtime = db
        .channel("transaksi-bersama-" + penggunaAktif.id)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "transaksi"
            },
            async function() {
                await muatTransaksiOnline();
            }
        )
        .subscribe(status => {
            console.log("Status Realtime:", status);
        });
}

/* =====================================================
   18. SAAT PENGGUNA BERHASIL LOGIN
===================================================== */

async function setelahLogin(user) {
    try {
        aturIdentitasPengguna(user);

        tampilkanAplikasi();

        inputNama.value = namaAktif;
        inputNama.disabled = true;

        inputTanggal.value = tanggalHariIni();

        pesan.textContent = "Menghubungkan tabungan...";

        buatGrafik();

        await muatTransaksiOnline();

        await migrasiDataLama();

        await muatTransaksiOnline();

        mulaiRealtime();

        pesan.textContent =
            "Tabungan online berhasil terhubung! ♡";

    } catch (error) {
        console.error("Persiapan akun gagal:", error);

        pesan.textContent =
            "Gagal memuat akun: " + error.message;
    }
}

/* =====================================================
   19. PERUBAHAN STATUS LOGIN
===================================================== */

async function prosesPerubahanAuth(event, session) {
    if (event === "SIGNED_OUT" || !session) {
        hentikanRealtime();

        penggunaAktif = null;
        namaAktif = null;
        transaksi = [];

        resetModeForm();

        tampilkanLogin();

        if (grafikBatang) {
            grafikBatang.destroy();
            grafikBatang = null;
        }

        if (grafikLingkaran) {
            grafikLingkaran.destroy();
            grafikLingkaran = null;
        }

        if (grafikGaris) {
            grafikGaris.destroy();
            grafikGaris = null;
        }

        return;
    }

    if (
        penggunaAktif &&
        penggunaAktif.id === session.user.id &&
        appContent.classList.contains("hidden") === false
    ) {
        return;
    }

    await setelahLogin(session.user);
}

/* =====================================================
   20. INISIALISASI APLIKASI
===================================================== */

async function mulaiAplikasi() {
    inputTanggal.value = tanggalHariIni();

    tampilkanLogin();

    if (!db) {
        pesanLogin.textContent =
            "Konfigurasi Supabase belum diisi. Periksa bagian konfigurasi di script.js.";
        tombolLogin.disabled = true;
        return;
    }

    const { data, error } = await db.auth.getSession();

    if (error) {
        pesanLogin.textContent =
            "Gagal memeriksa sesi: " + error.message;
        return;
    }

    if (data.session) {
        await setelahLogin(data.session.user);
    }

    db.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
            prosesPerubahanAuth(event, session);
        }, 0);
    });
}

mulaiAplikasi();
