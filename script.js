
const targetAinun = 125000;
const targetDzikri = 300000;

let transaksi = [];

const form = document.getElementById("formTabungan");
const pesan = document.getElementById("pesan");
const stiker = document.getElementById("stiker");

// Format angka menjadi Rupiah
function rupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(angka);
}

// Menghitung total tabungan berdasarkan nama
function hitungTotal(nama) {
    return transaksi
        .filter(item => item.nama === nama)
        .reduce((total, item) => total + item.nominal, 0);
}

// Menghitung total setoran pada bulan ini
function hitungBulanan(nama) {
    const sekarang = new Date();

    return transaksi
        .filter(item => {
            const tanggal = new Date(item.waktu);

            return item.nama === nama &&
                tanggal.getMonth() === sekarang.getMonth() &&
                tanggal.getFullYear() === sekarang.getFullYear();
        })
        .reduce((total, item) => total + item.nominal, 0);
}

// Menampilkan perkembangan target bulanan
function tampilkanTarget(id, nama, target) {
    const total = hitungBulanan(nama);
    const persen = Math.min((total / target) * 100, 100);
    const kekurangan = Math.max(target - total, 0);

    let status = total >= target
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

// Memperbarui seluruh dashboard
function perbaruiDashboard() {
    const totalA = hitungTotal("Ainunnia Warohmah");
    const totalD = hitungTotal("Dzikri Maulanal Hakim");

    document.getElementById("totalAinun").textContent = rupiah(totalA);
    document.getElementById("totalDzikri").textContent = rupiah(totalD);
    document.getElementById("totalBersama").textContent = rupiah(totalA + totalD);

    tampilkanTarget("targetAinun", "Ainunnia Warohmah", targetAinun);
    tampilkanTarget("targetDzikri", "Dzikri Maulanal Hakim", targetDzikri);

    tampilkanRiwayat();
    perbaruiGrafik();
}

// Menampilkan riwayat transaksi
function tampilkanRiwayat() {
    const tabel = document.getElementById("riwayatTabungan");

    if (transaksi.length === 0) {
        tabel.innerHTML = `
            <tr>
                <td colspan="4">Belum ada transaksi.</td>
            </tr>
        `;
        return;
    }

    tabel.innerHTML = "";

    [...transaksi].reverse().forEach(item => {
        const tanggal = new Date(item.waktu);

        const baris = `
            <tr>
                <td>${item.nama}</td>
                <td>${rupiah(item.nominal)}</td>
                <td>${tanggal.toLocaleString("id-ID")}</td>
                <td>${item.keterangan || "-"}</td>
            </tr>
        `;

        tabel.innerHTML += baris;
    });
}

// Membuat grafik tabungan bulanan
const grafik = new Chart(
    document.getElementById("grafikTabungan"),
    {
        type: "bar",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Ainun",
                    data: [],
                    backgroundColor: "#e99ac4"
                },
                {
                    label: "Dzikri",
                    data: [],
                    backgroundColor: "#a88be0"
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    }
);

function perbaruiGrafik() {
    const bulan = [];
    const dataAinun = [];
    const dataDzikri = [];

    const sekarang = new Date();

    // Menampilkan enam bulan terakhir
    for (let i = 5; i >= 0; i--) {
        const tanggal = new Date(
            sekarang.getFullYear(),
            sekarang.getMonth() - i,
            1
        );

        const bulanIndex = tanggal.getMonth();
        const tahun = tanggal.getFullYear();

        bulan.push(tanggal.toLocaleDateString("id-ID", {
            month: "short",
            year: "numeric"
        }));

        const totalA = transaksi
            .filter(item => {
                const waktu = new Date(item.waktu);
                return item.nama === "Ainunnia Warohmah" &&
                    waktu.getMonth() === bulanIndex &&
                    waktu.getFullYear() === tahun;
            })
            .reduce((total, item) => total + item.nominal, 0);

        const totalD = transaksi
            .filter(item => {
                const waktu = new Date(item.waktu);
                return item.nama === "Dzikri Maulanal Hakim" &&
                    waktu.getMonth() === bulanIndex &&
                    waktu.getFullYear() === tahun;
            })
            .reduce((total, item) => total + item.nominal, 0);

        dataAinun.push(totalA);
        dataDzikri.push(totalD);
    }

    grafik.data.labels = bulan;
    grafik.data.datasets[0].data = dataAinun;
    grafik.data.datasets[1].data = dataDzikri;
    grafik.update();
}

// Menyimpan transaksi baru
form.addEventListener("submit", function(event) {
    event.preventDefault();

    const nama = document.getElementById("nama").value;
    const nominal = Number(document.getElementById("nominal").value);
    const keterangan = document.getElementById("keterangan").value.trim();

    if (!nama || nominal <= 0 || !Number.isSafeInteger(nominal)) {
        pesan.textContent = "Masukkan nama dan nominal yang valid.";
        return;
    }

    const minimum = nama === "Ainunnia Warohmah"
        ? targetAinun
        : targetDzikri;

    if (nominal < minimum) {
        pesan.textContent =
            "Setoran minimal " + rupiah(minimum) + " untuk pengguna ini.";
        return;
    }

    transaksi.push({
        nama: nama,
        nominal: nominal,
        keterangan: keterangan,
        waktu: new Date().toISOString()
    });

    form.reset();
    pesan.textContent = "Transaksi berhasil dicatat! ♡";

    perbaruiDashboard();
    tampilkanStiker();
});

// Menampilkan stiker kejutan
function tampilkanStiker() {
    const stikerLucu = [
        "🎉",
        "🐻",
        "🐰",
        "🌷",
        "💗",
        "✨",
        "🧸"
    ];

    const pesanLucu = [
        "Yeay! Satu langkah lebih dekat dengan impian kita 😉!",
        "Tabungan bertambah, jangan di ambil sebelum tunangan atau nikah yaa!",
        "kalau mulai males nabung, ingetin aja tujuan kita nabung ini buat apa 😁",
        "Hebat! Ayo terus semangat menabung bersama!",
        "Satu transaksi, satu langkah menuju masa depan!"
    ];

    const angka = Math.floor(Math.random() * stikerLucu.length);
    const pesanAngka = Math.floor(Math.random() * pesanLucu.length);

    document.getElementById("emojiStiker").textContent = stikerLucu[angka];
    document.getElementById("pesanStiker").textContent = pesanLucu[pesanAngka];

    stiker.classList.remove("hidden");
}

// Menutup stiker
document.getElementById("tutupStiker").addEventListener("click", function() {
    stiker.classList.add("hidden");
});

// Tampilan awal
perbaruiDashboard();
