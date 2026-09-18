// ============================================================
// admin.js - Dashboard Okupansi Griya Aleena
// ============================================================

const API = 'https://griya-api.lintangglangitt.workers.dev';
let TOKEN = localStorage.getItem('ga_token') || '';
let USER = JSON.parse(localStorage.getItem('ga_user') || '{}');
let ROOMS = [];
let OCCS = [];
let EDITING_ID = null;
let ACTIVE_ROOM_FILTER = 'all';
let ACTIVE_INCOME_FILTER = null;

// ─── Konfigurasi Pemilik ──────────────────────────────────
const PEMILIK = {
  nama: '',
  no_ktp: '',
  alamat: 'Jl. Margasatwa, Gg. Sadewa No. 14, Sekaran 005/005, Kec. Gunungpati, Kota Semarang, Jawa Tengah, 50229',
  alamat_singkat: 'Jl. Margasatwa, Gg. Sadewa No. 14, Sekaran, Gunungpati, Semarang.',
  no_hp: '0898-5446-121',
};

if (!TOKEN) window.location.href = 'ibun.html';

// ─── API helper ────────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('ga_token');
    localStorage.removeItem('ga_user');
    window.location.href = 'ibun.html';
    throw new Error('Sesi berakhir');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Utility ───────────────────────────────────────────────
function rupiah(n) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(n || 0);
}
function rupiahFull(n) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(n || 0) + ',00';
}
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateLong(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / 86400000);
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function hitungDurasi(mulai, selesai, tipe) {
  const d1 = new Date(mulai);
  const d2 = new Date(selesai);
  const hari = Math.ceil((d2 - d1) / 86400000);
  const bulan = Math.round(hari / 30);
  const label = { harian: 'hari', mingguan: 'minggu', bulanan: 'bulan', semesteran: 'semester', tahunan: 'tahun' };
  const satuan = label[tipe] || 'hari';
  let jumlah;
  if (tipe === 'harian') jumlah = hari;
  else if (tipe === 'mingguan') jumlah = Math.round(hari / 7);
  else if (tipe === 'bulanan') jumlah = bulan;
  else if (tipe === 'semesteran') jumlah = Math.round(bulan / 6);
  else if (tipe === 'tahunan') jumlah = Math.round(bulan / 12);
  else jumlah = hari;
  return `${jumlah} ${satuan}`;
}
function generateInvoiceNo(id, tgl) {
  const d = new Date(tgl || todayISO());
  const yyyymm = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');
  return `INV-${yyyymm}-${String(id).padStart(4, '0')}`;
}
function generateKuitansiNo(id, tgl) {
  const d = new Date(tgl || todayISO());
  const yyyymm = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');
  return `KU-${yyyymm}-${String(id).padStart(4, '0')}`;
}
function terbilangAngka(n) {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n < 12) return satuan[n];
  if (n < 20) return terbilangAngka(n - 10) + ' belas';
  if (n < 100) return terbilangAngka(Math.floor(n / 10)) + ' puluh ' + terbilangAngka(n % 10);
  if (n < 200) return 'seratus ' + terbilangAngka(n - 100);
  if (n < 1000) return terbilangAngka(Math.floor(n / 100)) + ' ratus ' + terbilangAngka(n % 100);
  if (n < 2000) return 'seribu ' + terbilangAngka(n - 1000);
  if (n < 1000000) return terbilangAngka(Math.floor(n / 1000)) + ' ribu ' + terbilangAngka(n % 1000);
  if (n < 1000000000) return terbilangAngka(Math.floor(n / 1000000)) + ' juta ' + terbilangAngka(n % 1000000);
  return terbilangAngka(Math.floor(n / 1000000000)) + ' miliar ' + terbilangAngka(n % 1000000000);
}
function terbilangRupiah(n) {
  n = Math.floor(Number(n) || 0);
  if (n === 0) return 'nol rupiah';
  return terbilangAngka(n).replace(/\s+/g, ' ').trim() + ' rupiah';
}
function getHariIndonesia() {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return hari[new Date().getDay()];
}
function printDoc(namaFile) {
  const originalTitle = document.title;
  document.title = namaFile;
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1500);
}

// ─── Logout ────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('ga_token');
  localStorage.removeItem('ga_user');
  window.location.href = 'ibun.html';
});

// ─── Init ──────────────────────────────────────────────────
async function init() {
  document.getElementById('user-name').textContent = USER.nama_lengkap || USER.username || '—';
  document.getElementById('today-label').textContent = `(${fmtDate(todayISO())})`;

  await Promise.all([loadRooms(), loadOccs(), loadStats()]);
  fillYearFilter();
  renderRooms();
  renderTable();
  setupIncomeCardListeners();

  if (USER.role !== 'owner') {
    document.getElementById('btn-users').style.display = 'none';
  }
}

async function loadRooms() {
  const data = await api('/rooms');
  ROOMS = data.rooms || [];
}
async function loadOccs() {
  const data = await api('/occupancies');
  OCCS = data.occupancies || [];
}
async function loadStats() {
  const s = await api('/stats');
  document.getElementById('st-total').textContent = s.total_kamar;
  document.getElementById('st-terisi').textContent = s.terisi;
  document.getElementById('st-kosong').textContent = s.kosong;
  document.getElementById('st-okupansi').textContent = s.okupansi_persen + '%';
  document.getElementById('st-income-all').textContent = rupiahFull(s.penghasilan_keseluruhan);
  document.getElementById('st-income-year').textContent = rupiahFull(s.penghasilan_tahun_ini);
  document.getElementById('st-income-month').textContent = rupiahFull(s.penghasilan_bulan_ini);
}

// ─── Kartu Pembayaran jadi Filter ──────────────────────────
function setupIncomeCardListeners() {
  document.querySelectorAll('.stat-card.clickable').forEach(card => {
    card.addEventListener('click', () => toggleIncomeFilter(card.dataset.filter));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleIncomeFilter(card.dataset.filter);
      }
    });
  });
}

function toggleIncomeFilter(filter) {
  if (ACTIVE_INCOME_FILTER === filter) {
    ACTIVE_INCOME_FILTER = null;
  } else {
    ACTIVE_INCOME_FILTER = filter;
    document.getElementById('filter-tahun').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('search').value = '';
    ACTIVE_ROOM_FILTER = 'all';
  }
  updateIncomeCardUI();
  renderRooms();
  renderTable();
}

function updateIncomeCardUI() {
  document.querySelectorAll('.stat-card.clickable').forEach(card => {
    card.classList.toggle('active', card.dataset.filter === ACTIVE_INCOME_FILTER);
  });
}

// ─── Filter Tahun ──────────────────────────────────────────
function fillYearFilter() {
  const sel = document.getElementById('filter-tahun');
  const currentVal = sel.value;
  const years = new Set();

  OCCS.forEach(o => {
    if (!o.tanggal_mulai || !o.tanggal_selesai) return;
    const y1 = Number(o.tanggal_mulai.slice(0, 4));
    const y2 = Number(o.tanggal_selesai.slice(0, 4));
    for (let y = y1; y <= y2; y++) years.add(y);
  });

  const sorted = [...years].sort((a, b) => a - b);
  sel.innerHTML = '<option value="">Semua Tahun</option>' +
    sorted.map(y => `<option value="${y}">${y}</option>`).join('');

  if (currentVal && sorted.includes(Number(currentVal))) {
    sel.value = currentVal;
  }
}

// ─── Render Room Cards ─────────────────────────────────────
function renderRooms() {
  const grid = document.getElementById('rooms-grid');
  const today = todayISO();

  const allCard = `
    <div class="room-card all-card ${ACTIVE_ROOM_FILTER === 'all' ? 'active' : ''}" data-room="all">
      <h3>ALL</h3>
      <div class="room-tipe">SEMUA KAMAR</div>
    </div>
  `;

  const roomCards = ROOMS.map(room => {
    const active = OCCS.find(o =>
      o.room_id === room.id &&
      o.tanggal_mulai <= today &&
      o.tanggal_selesai >= today
    );

    let statusClass = 'status-kosong';
    let statusLabel = 'Kosong';
    let penyewa = '—';
    let tanggal = 'Belum ada penghuni';

    if (active) {
      penyewa = active.nama_penyewa;
      tanggal = `${fmtDate(active.tanggal_mulai)} — ${fmtDate(active.tanggal_selesai)}`;
      const sisa = daysBetween(today, active.tanggal_selesai);
      if (active.status_bayar === 'lunas') {
        statusClass = sisa <= 14 ? 'status-habis' : 'status-terisi';
        statusLabel = sisa <= 14 ? `⚠️ Habis dalam ${sisa} hari` : 'Terisi';
      } else {
        statusClass = 'status-dp';
        statusLabel = active.status_bayar === 'dp' ? 'DP' : 'Belum Bayar';
      }
    }

    const isActive = String(ACTIVE_ROOM_FILTER) === String(room.id);

    return `
      <div class="room-card ${statusClass} ${isActive ? 'active' : ''}" data-room="${room.id}">
        <h3>${escapeHtml(room.nama_kamar)}</h3>
        <div class="room-tipe">${escapeHtml(room.tipe)}</div>
        <div class="room-penyewa">${escapeHtml(penyewa)}</div>
        <div class="room-tanggal">${escapeHtml(tanggal)}</div>
        <span class="room-status">${escapeHtml(statusLabel)}</span>
      </div>
    `;
  }).join('');

  grid.innerHTML = allCard + roomCards;

  grid.querySelectorAll('.room-card').forEach(el => {
    el.addEventListener('click', () => {
      ACTIVE_ROOM_FILTER = el.dataset.room;
      ACTIVE_INCOME_FILTER = null;
      updateIncomeCardUI();
      renderRooms();
      renderTable();
    });
  });
}

// ─── Helper filter income ──────────────────────────────────
function passesIncomeFilter(o) {
  if (!ACTIVE_INCOME_FILTER) return true;
  if (o.status_bayar !== 'lunas') return false;

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = String(now.getMonth() + 1).padStart(2, '0');
  const startY = o.tanggal_mulai.slice(0, 4);
  const startM = o.tanggal_mulai.slice(5, 7);

  if (ACTIVE_INCOME_FILTER === 'all') return true;
  if (ACTIVE_INCOME_FILTER === 'year') return startY === String(curYear);
  if (ACTIVE_INCOME_FILTER === 'month') return startY === String(curYear) && startM === curMonth;
  return true;
}

// ─── Render Table ──────────────────────────────────────────
function renderTable() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const fTahun = document.getElementById('filter-tahun').value;
  const fs = document.getElementById('filter-status').value;
  const today = todayISO();

  const filtered = OCCS.filter(o => {
    if (!passesIncomeFilter(o)) return false;

    if (!ACTIVE_INCOME_FILTER) {
      if (fTahun) {
        const y1 = Number(o.tanggal_mulai.slice(0, 4));
        const y2 = Number(o.tanggal_selesai.slice(0, 4));
        const targetY = Number(fTahun);
        if (!(y1 <= targetY && y2 >= targetY)) return false;
      }
      if (fs && o.status_bayar !== fs) return false;
      if (q && !(o.nama_penyewa.toLowerCase().includes(q) || (o.no_hp || '').includes(q))) return false;
    }

    if (ACTIVE_ROOM_FILTER !== 'all' && String(o.room_id) !== String(ACTIVE_ROOM_FILTER)) return false;

    return true;
  });

  const tbody = document.getElementById('occ-body');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:#5a7373;">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const sudahSelesai = o.tanggal_selesai < today;
    const akanHabis = !sudahSelesai &&
      o.tanggal_selesai >= today &&
      daysBetween(today, o.tanggal_selesai) <= 14 &&
      o.tanggal_mulai <= today;

    const badgeClass = { lunas: 'lunas', dp: 'dp', belum: 'belum' }[o.status_bayar] || 'belum';
    const link = o.link_kontrak
      ? `<a href="${escapeHtml(o.link_kontrak)}" target="_blank" class="btn-icon" title="Buka kontrak">📄</a>`
      : '—';

    const rowClass = sudahSelesai ? 'kontrak-selesai' : (akanHabis ? 'akan-habis' : 'baris-aktif');

    return `
      <tr class="${rowClass}">
        <td><strong>${escapeHtml(o.nama_kamar)}</strong></td>
        <td>${escapeHtml(o.nama_penyewa)}</td>
        <td>${escapeHtml(o.no_hp || '—')}</td>
        <td><span class="badge tipe">${escapeHtml(o.tipe_sewa)}</span></td>
        <td>${fmtDate(o.tanggal_mulai)}</td>
        <td>${fmtDate(o.tanggal_selesai)}</td>
        <td><strong>${rupiahFull(o.harga_total)}</strong></td>
        <td><span class="badge ${badgeClass}">${escapeHtml(o.status_bayar)}</span></td>
        <td>${link}</td>
        <td>
          <div class="btn-row">
            <button class="btn-icon" data-invoice="${o.id}" title="Print Invoice">🧾</button>
            <button class="btn-icon" data-kuitansi="${o.id}" title="Print Kuitansi">💰</button>
            <button class="btn-icon" data-perjanjian="${o.id}" title="Print Perjanjian">📄</button>
            <button class="btn-icon" data-edit="${o.id}" title="Edit">✏️</button>
            <button class="btn-icon danger" data-del="${o.id}" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-invoice]').forEach(b =>
    b.addEventListener('click', () => openInvoice(Number(b.dataset.invoice))));
  tbody.querySelectorAll('[data-kuitansi]').forEach(b =>
    b.addEventListener('click', () => openKuitansi(Number(b.dataset.kuitansi))));
  tbody.querySelectorAll('[data-perjanjian]').forEach(b =>
    b.addEventListener('click', () => openPerjanjian(Number(b.dataset.perjanjian))));
  tbody.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openModal(Number(b.dataset.edit))));
  tbody.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteOcc(Number(b.dataset.del))));
}

// ═══════════════════════════════════════════════════════════
// HEADER BERSAMA
// ═══════════════════════════════════════════════════════════

function buildDocHeader(title, no) {
  return `
    <div class="inv-header">
      <div class="inv-brand">
        <img src="foto/logo.png" alt="" onerror="this.style.display='none'">
        <div>
          <h1>GRIYA ALEENA</h1>
          <p>Kos Putri Nyaman, Kampus Unnes Sekaran.<br>
          ${escapeHtml(PEMILIK.alamat_singkat)} Telp/WA: ${escapeHtml(PEMILIK.no_hp)}</p>
        </div>
      </div>
      <div class="inv-title-block">
        <h2>${escapeHtml(title)}</h2>
        <div class="inv-no">No. ${escapeHtml(no)}</div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// INVOICE
// ═══════════════════════════════════════════════════════════

function openInvoice(id) {
  const o = OCCS.find(x => x.id === id);
  if (!o) return;

  const invoiceNo = generateInvoiceNo(o.id, o.tanggal_mulai);
  const today = fmtDateLong(todayISO());
  const durasi = hitungDurasi(o.tanggal_mulai, o.tanggal_selesai, o.tipe_sewa);

  const html = `
    ${buildDocHeader('INVOICE', invoiceNo)}

    <div class="inv-section">
      <div class="inv-section-title">Ditagihkan kepada:</div>
      <dl class="inv-info-grid">
        <dt>Nama</dt><dd>${escapeHtml(o.nama_penyewa)}</dd>
        ${o.no_hp ? `<dt>No. HP</dt><dd>${escapeHtml(o.no_hp)}</dd>` : ''}
        ${o.asal_kampus ? `<dt>Kampus</dt><dd>${escapeHtml(o.asal_kampus)}</dd>` : ''}
        <dt>Kamar</dt><dd>${escapeHtml(o.nama_kamar)} (${escapeHtml(o.tipe)})</dd>
      </dl>
    </div>

    <table class="inv-table">
      <thead>
        <tr>
          <th>Tipe Sewa</th>
          <th>Periode Sewa</th>
          <th style="text-align:right">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(o.tipe_sewa.charAt(0).toUpperCase() + o.tipe_sewa.slice(1))}</td>
          <td>
            ${escapeHtml(fmtDateLong(o.tanggal_mulai))} — ${escapeHtml(fmtDateLong(o.tanggal_selesai))}
            <div class="inv-period">Durasi: ${escapeHtml(durasi)}</div>
          </td>
          <td class="inv-amount">${escapeHtml(rupiahFull(o.harga_total))}</td>
        </tr>
      </tbody>
    </table>

    <div class="inv-total">
      <div>
        <div class="inv-total-label">Total Pembayaran</div>
      </div>
      <div class="inv-total-value">${escapeHtml(rupiahFull(o.harga_total))}</div>
    </div>

    ${o.catatan ? `<div class="inv-notes"><strong>Catatan:</strong> ${escapeHtml(o.catatan)}</div>` : ''}

    <div class="inv-signature">
      <div class="inv-sign-date">Semarang, ${escapeHtml(today)}</div>
      <div>Hormat kami,</div>
      <div class="inv-sign-line">&nbsp;</div>
      <div class="inv-sign-role">Pemilik Griya Aleena</div>
    </div>

    <div class="inv-footer">
      Invoice ini dibuat otomatis oleh sistem Griya Aleena. Simpan sebagai bukti pembayaran yang sah.
    </div>

    <div class="invoice-actions">
      <button class="inv-btn-close" onclick="closeInvoice()">Tutup</button>
      <button class="inv-btn-print" onclick="printDoc('Invoice - ${escapeHtml(o.nama_penyewa).replace(/'/g, "\\'")}')">🖨️ Print / Simpan PDF</button>
    </div>
  `;

  document.getElementById('invoice-content').innerHTML = html;
  document.getElementById('invoice-modal').classList.add('open');
}

function closeInvoice() {
  document.getElementById('invoice-modal').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
// KUITANSI
// ═══════════════════════════════════════════════════════════

function openKuitansi(id) {
  const o = OCCS.find(x => x.id === id);
  if (!o) return;

  const noKuitansi = generateKuitansiNo(o.id, o.tanggal_mulai);
  const today = fmtDateLong(todayISO());
  const durasi = hitungDurasi(o.tanggal_mulai, o.tanggal_selesai, o.tipe_sewa);

  const html = `
    ${buildDocHeader('KUITANSI', noKuitansi)}

    <div class="inv-section">
      <div class="inv-section-title">Telah diterima dari:</div>
      <dl class="inv-info-grid">
        <dt>Nama</dt><dd>${escapeHtml(o.nama_penyewa)}</dd>
        ${o.no_hp ? `<dt>No. HP</dt><dd>${escapeHtml(o.no_hp)}</dd>` : ''}
        <dt>Kamar</dt><dd>${escapeHtml(o.nama_kamar)} (${escapeHtml(o.tipe)})</dd>
      </dl>
    </div>

    <p style="font-size:0.9rem;margin-bottom:8px;">Untuk pembayaran sewa kamar kos dengan rincian:</p>
    <table class="inv-table">
      <thead>
        <tr>
          <th>Tipe Sewa</th>
          <th>Periode</th>
          <th style="text-align:right">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(o.tipe_sewa.charAt(0).toUpperCase() + o.tipe_sewa.slice(1))}</td>
          <td>
            ${escapeHtml(fmtDateLong(o.tanggal_mulai))} — ${escapeHtml(fmtDateLong(o.tanggal_selesai))}
            <div class="inv-period">Durasi: ${escapeHtml(durasi)}</div>
          </td>
          <td class="inv-amount">${escapeHtml(rupiahFull(o.harga_total))}</td>
        </tr>
      </tbody>
    </table>

    <div class="kuitansi-amount-box">
      <div class="kuitansi-amount-label">Jumlah Dibayar</div>
      <div class="kuitansi-amount-value">${escapeHtml(rupiahFull(o.harga_total))}</div>
      <div class="kuitansi-amount-text">(${escapeHtml(terbilangRupiah(o.harga_total))})</div>
      ${o.status_bayar === 'lunas' ? '<div class="kuitansi-check">✓ LUNAS</div>' : ''}
      ${o.status_bayar === 'dp' ? '<div class="kuitansi-check" style="background:#F5A623">DP</div>' : ''}
    </div>

    ${o.catatan ? `<div class="inv-notes"><strong>Catatan:</strong> ${escapeHtml(o.catatan)}</div>` : ''}

    <p style="font-size:0.85rem;color:#5a7373;margin-bottom:24px;">
      Kuitansi ini merupakan bukti sah pembayaran sewa kamar kos di Griya Aleena.
      Mohon disimpan dengan baik.
    </p>

    <div class="inv-signature">
      <div class="inv-sign-date">Semarang, ${escapeHtml(today)}</div>
      <div>Penerima,</div>
      <div class="inv-sign-line">&nbsp;</div>
      <div class="inv-sign-role">Pemilik Griya Aleena</div>
    </div>

    <div class="inv-footer">
      Terima kasih atas kepercayaan Anda. Semoga betah tinggal di Griya Aleena. 🏠
    </div>

    <div class="invoice-actions">
      <button class="inv-btn-close" onclick="closeKuitansi()">Tutup</button>
      <button class="inv-btn-print" onclick="printDoc('Kuitansi - ${escapeHtml(o.nama_penyewa).replace(/'/g, "\\'")}')">🖨️ Print / Simpan PDF</button>
    </div>
  `;

  document.getElementById('kuitansi-content').innerHTML = html;
  document.getElementById('kuitansi-modal').classList.add('open');
}

function closeKuitansi() {
  document.getElementById('kuitansi-modal').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
// PERJANJIAN
// ═══════════════════════════════════════════════════════════

function openPerjanjian(id) {
  const o = OCCS.find(x => x.id === id);
  if (!o) return;

  const field = (label, value) => `
    <div class="pj-field">
      <div class="pj-label">${escapeHtml(label)}</div>
      <div class="pj-colon">:</div>
      <div class="pj-value-line ${value ? '' : 'empty'}">${value ? escapeHtml(value) : '&nbsp;'}</div>
    </div>
  `;

  const totalBiaya = rupiahFull(o.harga_total);
  const tipeUpper = o.tipe_sewa.charAt(0).toUpperCase() + o.tipe_sewa.slice(1);
  const kamarTipe = o.tipe === 'AC' ? 'AC' : 'NON AC';

  const html = `
    <div class="perjanjian-logo">
      <img src="foto/logo.png" alt="Griya Aleena" onerror="this.style.display='none'">
    </div>

    <h1>PERJANJIAN DAN TATA TERTIB BERSAMA<br>GRIYA ALEENA</h1>

    <p>
      Pada hari ini <span class="pj-fill pj-fill-sm">${escapeHtml(getHariIndonesia())}</span>
      tanggal <span class="pj-fill pj-fill-sm">${escapeHtml(fmtDateLong(todayISO()))}</span>
      telah disepakati Perjanjian dan Tata Tertib Bersama terkait sewa-menyewa kamar kos antara:
    </p>

    <h2>1. Pemilik Kos</h2>
    <div class="pj-info-block">
      ${field('Nama', PEMILIK.nama)}
      ${field('Nomor KTP/SIM', PEMILIK.no_ktp)}
      ${field('Alamat', PEMILIK.alamat)}
      ${field('Nomor HP', '')}
    </div>
    <p>Selanjutnya disebut <strong>Pemilik</strong>.</p>

    <h2>2. Penyewa Kos</h2>
    <div class="pj-info-block">
      ${field('Nama', o.nama_penyewa)}
      ${field('Nomor KTP/SIM', o.no_ktp)}
      ${field('Alamat', o.alamat_penyewa)}
      ${field('Nomor HP', o.no_hp)}
    </div>
    <p>Selanjutnya disebut <strong>Penyewa</strong>.</p>

    <h2>3. Data Orang Tua/Wali</h2>
    <div class="pj-info-block">
      ${field('Nama', o.nama_ortu || '')}
      ${field('Nomor KTP/SIM', o.no_ktp_ortu || '')}
      ${field('Alamat', o.alamat_ortu || '')}
      ${field('Nomor HP', o.no_hp_ortu || '')}
    </div>
    <p>Data orang tua/wali di atas dicatat sebagai penanggung jawab.</p>

    <p style="margin-top:16px;">
      Pemilik dan Penyewa sepakat mengikat diri dalam Perjanjian dan Tata Tertib Bersama dengan ketentuan sebagai berikut:
    </p>

    <h2>Pasal 1 – Objek Sewa</h2>
    <ol>
      <li>Pemilik menyewakan kamar kos yang beralamat di ${escapeHtml(PEMILIK.alamat)} kepada Penyewa.</li>
      <li>Kamar kos yang disewakan hanya diperuntukkan bagi satu orang Penyewa dan tidak diperbolehkan dialihgunakan atau disewakan kembali kepada pihak lain tanpa persetujuan tertulis dari Pemilik.</li>
      <li>Fasilitas dasar yang disiapkan oleh Pemilik meliputi:
        <p style="margin-top:6px;"><strong>a. Fasilitas Pribadi Penyewa</strong></p>
        <ul>
          <li>Satu unit kamar kos</li>
          <li>Kamar mandi dalam</li>
          <li>Lemari pakaian besi sliding</li>
          <li>Kasur busa, bantal, dan guling</li>
          <li>Kipas angin dinding</li>
          <li>Meja kayu</li>
          <li>Rol kabel</li>
        </ul>
        <p><strong>b. Fasilitas Umum</strong> (dipakai bersama dengan penghuni kos lainnya)</p>
        <ul>
          <li>Dapur bersama</li>
          <li>Kulkas bersama</li>
          <li>Mesin cuci bersama dan tempat jemuran</li>
          <li>Kompor gas (mengisi gas sendiri jika habis)</li>
          <li>Alat-alat masak</li>
          <li>Wastafel</li>
          <li>Garasi motor</li>
        </ul>
      </li>
    </ol>

    <h2>Pasal 2 – Masa Sewa</h2>
    <ol>
      <li>Masa sewa kamar kos dimulai pada tanggal <strong>${escapeHtml(fmtDateLong(o.tanggal_mulai))}</strong> dan akan berakhir pada tanggal <strong>${escapeHtml(fmtDateLong(o.tanggal_selesai))}</strong>.</li>
      <li>Perpanjangan/pengakhiran sewa harus diinformasikan oleh Penyewa paling lambat 30 (tiga puluh) hari sebelum masa sewa berakhir.</li>
      <li>Keterlambatan menginformasikan perpanjangan/pengakhiran sewa kepada Pemilik dapat berakibat denda bagi Penyewa.</li>
    </ol>

    <h2>Pasal 3 – Biaya Sewa dan Pembayaran</h2>
    <ol>
      <li>Biaya sewa yang disepakati Para Pihak adalah sebagai berikut:
        <div class="pj-info-block" style="margin-top:8px;">
          <p><strong>Kamar ${escapeHtml(kamarTipe)}</strong></p>
          ${field('Durasi', tipeUpper)}
          ${field('Biaya', totalBiaya)}
          ${field('Periode', fmtDateLong(o.tanggal_mulai) + ' — ' + fmtDateLong(o.tanggal_selesai))}
        </div>
      </li>
      <li>Pembayaran harus dilunasi sebelum unit kamar ditempati oleh Penyewa.</li>
      <li>Setiap kamar memiliki meteran listrik pribadi. Setiap Penyewa mengisi token listrik prabayar sendiri sesuai yang dibutuhkan (Penyewa boleh membawa alat elektronik yang dibutuhkan).</li>
      <li>Penyewa bebas biaya air bulanan dan bebas iuran sampah bulanan.</li>
    </ol>

    <h2>Pasal 4 – Tata Tertib</h2>
    <ol>
      <li>Penyewa wajib menjaga ketertiban dan tidak mengganggu kenyamanan penghuni lain.</li>
      <li>Penyewa bertanggung jawab atas kebersihan kamar masing-masing dan kebersihan fasilitas umum (dapur bersama, kulkas bersama, mesin cuci bersama, garasi, dan lain-lain).</li>
      <li>Penyewa wajib menjaga dan menggunakan seluruh fasilitas serta barang milik kos (seperti perabot, peralatan bersama, dan properti lainnya) dengan hati-hati, serta dilarang merusak, mengubah, atau memindahkan tanpa izin dari Pemilik.</li>
      <li>Penggunaan fasilitas umum harus dilakukan secara tertib, bergantian, dan penuh tanggung jawab.</li>
      <li>Kebijakan jam malam berlaku pukul 22:00 WIB, di mana setelah jam tersebut tidak diperkenankan menerima tamu, berisik, dan/atau melakukan aktivitas yang mengganggu penghuni lain.</li>
      <li>Volume musik, televisi, atau aktivitas lain yang menghasilkan suara keras harus dijaga agar tidak mengganggu lingkungan.</li>
      <li>Sampah harus dibuang secara teratur pada tempat yang telah disediakan.</li>
    </ol>

    <h2>Pasal 5 – Larangan</h2>
    <ol>
      <li>Dilarang membawa tamu lawan jenis ke dalam kamar kos.</li>
      <li>Dilarang menutup pintu kamar apabila sedang menerima tamu di area kos.</li>
      <li>Dilarang merokok di dalam kamar dan seluruh area dalam kos.</li>
      <li>Dilarang membawa, menyimpan, atau menggunakan narkotika, psikotropika, zat adiktif lainnya (termasuk sabu-sabu, ganja, ekstasi, dan sejenisnya), minuman keras, serta barang terlarang lainnya dalam bentuk apa pun.</li>
      <li>Dilarang membawa barang berbahaya seperti senjata tajam, senjata api, bahan peledak, zat kimia berbahaya, zat mudah terbakar serta barang-barang lain yang dapat membahayakan keselamatan, keamanan, atau kenyamanan penghuni lainnya.</li>
    </ol>

    <h2>Pasal 6 – Keamanan dan Keselamatan</h2>
    <ol>
      <li>Penyewa wajib menjaga kunci kamar dan/atau kunci gerbang, serta segera melaporkan kepada pemilik kos apabila terjadi kehilangan.</li>
      <li>Penyewa bertanggung jawab menjaga keamanan barang pribadinya masing-masing. Pemilik Kos tidak bertanggung jawab atas kehilangan akibat kelalaian Penyewa.</li>
      <li>Penyewa dilarang meminjamkan kunci kamar dan/atau gerbang kepada orang lain tanpa seizin Pemilik Kos.</li>
    </ol>

    <h2>Pasal 7 – Kerusakan dan Perbaikan</h2>
    <ol>
      <li>Penyewa bertanggung jawab atas kerusakan yang diakibatkan oleh kelalaian Penyewa.</li>
      <li>Jika ditemukan kerusakan pada properti, Penyewa wajib melaporkannya kepada pemilik kos secepatnya untuk dapat diperbaiki.</li>
    </ol>

    <h2>Pasal 8 – Pengakhiran Sewa</h2>
    <ol>
      <li>Jika Penyewa ingin mengakhiri sewa sebelum waktu yang disepakati, maka uang sewa yang sudah dibayarkan tidak dapat dikembalikan.</li>
      <li>Jika Penyewa mengakhiri sewa sebelum waktu yang disepakati, Penyewa diperbolehkan mencari pengganti hak sewa/mengoper sewa ke orang lain hanya jika mendapatkan persetujuan tertulis dari Pemilik.</li>
      <li>Pemilik berhak menolak calon pengganti yang diajukan oleh Penyewa untuk menggantikan hak sewa/oper sewa atas pertimbangan pribadi Pemilik (misal: atas pertimbangan bahwa calon pengganti terkesan tidak bertanggung jawab, tidak dapat mematuhi tata tertib kos, dan/atau hal lain.)</li>
      <li>Pemilik berhak memutus perjanjian jika Penyewa melanggar perjanjian dan tata tertib yang telah disepakati tanpa mengembalikan uang sewa yang telah dibayarkan.</li>
    </ol>

    <h2>Pasal 9 – Lain-lain</h2>
    <ol>
      <li>Segala hal yang belum diatur dalam Perjanjian ini akan dibahas bersama antara kedua pihak.</li>
      <li>Setiap sengketa yang timbul dari Perjanjian ini akan diselesaikan terlebih dahulu secara kekeluargaan melalui musyawarah untuk mencapai mufakat, sebelum menempuh jalur hukum.</li>
      <li>Perjanjian ini dibuat dalam dua rangkap, masing-masing untuk Pemilik dan Penyewa, dan memiliki kekuatan hukum yang sama.</li>
    </ol>

    <p style="margin-top:20px;">
      Demikian perjanjian ini dibuat dan ditandatangani oleh kedua belah pihak tanpa paksaan dari pihak mana pun.
    </p>

    <div class="pj-tanggal">
      Semarang, <span class="pj-tanggal-fill">${escapeHtml(fmtDateLong(todayISO()))}</span>
    </div>

    <div class="pj-sign-row">
      <div class="pj-sign-col">
        <div class="pj-sign-label">Pemilik,</div>
        <div class="pj-sign-name">&nbsp;</div>
      </div>
      <div class="pj-sign-col">
        <div class="pj-sign-label">Penyewa,</div>
        <div class="pj-sign-name">&nbsp;</div>
      </div>
    </div>

    <div class="pj-lampiran">
      <h3>Lampiran:</h3>
      <ol type="a">
        <li>Fotokopi KTP/SIM Pemilik.</li>
        <li>Fotokopi KTP/SIM Penyewa dan fotokopi KTP/SIM orang tua Penyewa.</li>
        <li>Fotokopi Kartu Tanda Mahasiswa Penyewa.</li>
      </ol>
    </div>

    <div class="inv-footer">
      Perjanjian ini dicetak otomatis dari sistem Griya Aleena. Wajib ditandatangani oleh kedua pihak.
    </div>

    <div class="invoice-actions">
      <button class="inv-btn-close" onclick="closePerjanjian()">Tutup</button>
      <button class="inv-btn-print" onclick="printDoc('Perjanjian - ${escapeHtml(o.nama_penyewa).replace(/'/g, "\\'")}')">🖨️ Print / Simpan PDF</button>
    </div>
  `;

  document.getElementById('perjanjian-content').innerHTML = html;
  document.getElementById('perjanjian-modal').classList.add('open');
}

function closePerjanjian() {
  document.getElementById('perjanjian-modal').classList.remove('open');
}

// Close modal saat klik backdrop
['invoice-modal', 'kuitansi-modal', 'perjanjian-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', (e) => {
    if (e.target.id === id) {
      document.getElementById(id).classList.remove('open');
    }
  });
});

// ─── Filters ───────────────────────────────────────────────
document.getElementById('search').addEventListener('input', renderTable);
document.getElementById('filter-tahun').addEventListener('change', renderTable);
document.getElementById('filter-status').addEventListener('change', renderTable);

// ─── Modal Okupansi ────────────────────────────────────────
const modalOcc = document.getElementById('modal-occ');
const formOcc = document.getElementById('form-occ');

document.getElementById('btn-add').addEventListener('click', () => openModal(null));
modalOcc.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => modalOcc.classList.remove('open')));
modalOcc.addEventListener('click', e => {
  if (e.target === modalOcc) modalOcc.classList.remove('open');
});


function fillRoomSelect(currentEditingId = null) {
  const fr = document.getElementById('f-room');
  const today = todayISO();

  // Cari room_id yang sedang di-edit (kalau mode Edit)
  let editingRoomId = null;
  if (currentEditingId) {
    const editingOcc = OCCS.find(x => x.id === currentEditingId);
    if (editingOcc) editingRoomId = editingOcc.room_id;
  }

  fr.innerHTML = ROOMS.map(r => {
    // Cek apakah kamar ini sedang terisi (ada okupansi aktif hari ini)
    const activeOcc = OCCS.find(o =>
      o.room_id === r.id &&
      o.tanggal_mulai <= today &&
      o.tanggal_selesai >= today
    );

    // Kalau terisi DAN bukan kamar yang sedang di-edit → disabled
    const isDisabled = activeOcc && activeOcc.room_id !== editingRoomId;
    const disabledAttr = isDisabled ? 'disabled' : '';

    // Kalau disabled, tambahkan keterangan
    const label = isDisabled
      ? `${r.nama_kamar} (${r.tipe}) — TERISI`
      : `${r.nama_kamar} (${r.tipe})`;

    return `<option value="${r.id}" ${disabledAttr}>${escapeHtml(label)}</option>`;
  }).join('');
}


function openModal(id) {
  EDITING_ID = id;
  const f = formOcc;
  f.reset();
  fillRoomSelect(id);   // ← kirim ID yang di-edit (null kalau tambah baru)

  if (id) {
    const o = OCCS.find(x => x.id === id);
    if (!o) return;
    document.getElementById('modal-title').textContent = 'Edit Okupansi';
    document.getElementById('f-id').value = o.id;
    document.getElementById('f-room').value = o.room_id;
    document.getElementById('f-tipe').value = o.tipe_sewa;
    document.getElementById('f-mulai').value = o.tanggal_mulai;
    document.getElementById('f-selesai').value = o.tanggal_selesai;
    document.getElementById('f-harga').value = o.harga_total;
    document.getElementById('f-link').value = o.link_kontrak || '';
    document.getElementById('f-status').value = o.status_bayar;
    document.getElementById('f-nama').value = o.nama_penyewa;
    document.getElementById('f-ktp').value = o.no_ktp || '';
    document.getElementById('f-alamat').value = o.alamat_penyewa || '';
    document.getElementById('f-hp').value = o.no_hp || '';
    document.getElementById('f-kampus').value = o.asal_kampus || '';
    document.getElementById('f-nama-ortu').value = o.nama_ortu || '';
    document.getElementById('f-ktp-ortu').value = o.no_ktp_ortu || '';
    document.getElementById('f-alamat-ortu').value = o.alamat_ortu || '';
    document.getElementById('f-hp-ortu').value = o.no_hp_ortu || '';
    document.getElementById('f-catatan').value = o.catatan || '';
  } else {
    document.getElementById('modal-title').textContent = 'Tambah Okupansi';
    document.getElementById('f-mulai').value = todayISO();
  }
  modalOcc.classList.add('open');
}

formOcc.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    room_id: Number(document.getElementById('f-room').value),
    tipe_sewa: document.getElementById('f-tipe').value,
    tanggal_mulai: document.getElementById('f-mulai').value,
    tanggal_selesai: document.getElementById('f-selesai').value,
    harga_total: Number(document.getElementById('f-harga').value),
    link_kontrak: document.getElementById('f-link').value.trim() || null,
    status_bayar: document.getElementById('f-status').value,
    nama_penyewa: document.getElementById('f-nama').value.trim(),
    no_ktp: document.getElementById('f-ktp').value.trim() || null,
    alamat_penyewa: document.getElementById('f-alamat').value.trim() || null,
    no_hp: document.getElementById('f-hp').value.trim() || null,
    asal_kampus: document.getElementById('f-kampus').value.trim() || null,
    nama_ortu: document.getElementById('f-nama-ortu').value.trim() || null,
    no_ktp_ortu: document.getElementById('f-ktp-ortu').value.trim() || null,
    alamat_ortu: document.getElementById('f-alamat-ortu').value.trim() || null,
    no_hp_ortu: document.getElementById('f-hp-ortu').value.trim() || null,
    catatan: document.getElementById('f-catatan').value.trim() || null,
  };

  try {
    if (EDITING_ID) {
      await api(`/occupancies/${EDITING_ID}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/occupancies', { method: 'POST', body: JSON.stringify(payload) });
    }
    modalOcc.classList.remove('open');
    await Promise.all([loadOccs(), loadStats()]);
    fillYearFilter();
    renderRooms();
    renderTable();
  } catch (err) {
    alert('Gagal simpan: ' + err.message);
  }
});

async function deleteOcc(id) {
  if (!confirm('Yakin hapus data ini?')) return;
  try {
    await api(`/occupancies/${id}`, { method: 'DELETE' });
    await Promise.all([loadOccs(), loadStats()]);
    fillYearFilter();
    renderRooms();
    renderTable();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ─── Export CSV ────────────────────────────────────────────
document.getElementById('btn-export').addEventListener('click', () => {
  const rows = [
    ['Kamar','Penyewa','No HP','Asal Kampus','Tipe Sewa','Mulai','Selesai','Total','Status','Link Kontrak','Catatan','No KTP','Alamat','Nama Ortu','No KTP Ortu','No HP Ortu','Alamat Ortu'],
    ...OCCS.map(o => [
      o.nama_kamar, o.nama_penyewa, o.no_hp || '', o.asal_kampus || '',
      o.tipe_sewa, o.tanggal_mulai, o.tanggal_selesai,
      o.harga_total, o.status_bayar, o.link_kontrak || '', o.catatan || '',
      o.no_ktp || '', o.alamat_penyewa || '', o.nama_ortu || '',
      o.no_ktp_ortu || '', o.no_hp_ortu || '', o.alamat_ortu || ''
    ])
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `okupansi-griya-aleena-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Import CSV ────────────────────────────────────────────
document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!confirm(`Import ${file.name}?\n\nPastikan format CSV sesuai template export.`)) {
    e.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      alert('CSV kosong atau format tidak valid');
      e.target.value = '';
      return;
    }

    const payload = rows.map(r => ({
      nama_kamar: r['Kamar'] || r['kamar'] || '',
      nama_penyewa: r['Penyewa'] || r['penyewa'] || '',
      no_hp: r['No HP'] || r['no_hp'] || '',
      asal_kampus: r['Asal Kampus'] || r['asal_kampus'] || '',
      tipe_sewa: (r['Tipe Sewa'] || r['tipe_sewa'] || 'bulanan').toLowerCase(),
      tanggal_mulai: normalizeDate(r['Mulai'] || r['mulai'] || ''),
      tanggal_selesai: normalizeDate(r['Selesai'] || r['selesai'] || ''),
      harga_total: Number(String(r['Total'] || r['total'] || '0').replace(/[^0-9]/g, '')),
      status_bayar: (r['Status'] || r['status'] || 'belum').toLowerCase(),
      link_kontrak: r['Link Kontrak'] || r['link_kontrak'] || null,
      catatan: r['Catatan'] || r['catatan'] || null,
      no_ktp: r['No KTP'] || r['no_ktp'] || null,
      alamat_penyewa: r['Alamat'] || r['alamat_penyewa'] || null,
      nama_ortu: r['Nama Ortu'] || r['nama_ortu'] || null,
      no_ktp_ortu: r['No KTP Ortu'] || r['no_ktp_ortu'] || null,
      no_hp_ortu: r['No HP Ortu'] || r['no_hp_ortu'] || null,
      alamat_ortu: r['Alamat Ortu'] || r['alamat_ortu'] || null,
    }));

    const result = await api('/occupancies/bulk', {
      method: 'POST',
      body: JSON.stringify({ rows: payload }),
    });

    const wrap = document.getElementById('import-result');
    let html = `
      <p style="margin-bottom:12px;">
        <strong>✅ Sukses:</strong> ${result.sukses} baris<br>
        <strong>❌ Gagal:</strong> ${result.gagal} baris
      </p>
    `;
    if (result.errors && result.errors.length) {
      html += `<div style="background:#fdecec;padding:12px;border-radius:8px;font-size:0.85rem;">
        <strong>Detail error:</strong><br>
        ${result.errors.map(e => escapeHtml(e)).join('<br>')}
      </div>`;
    }
    wrap.innerHTML = html;
    document.getElementById('modal-import-result').classList.add('open');

    await Promise.all([loadOccs(), loadStats()]);
    fillYearFilter();
    renderRooms();
    renderTable();
  } catch (err) {
    alert('Gagal import: ' + err.message);
  } finally {
    e.target.value = '';
  }
});

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (c === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else { cur += c; }
  }
  result.push(cur);
  return result;
}

function normalizeDate(s) {
  if (!s) return '';
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
    jun: '06', jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10',
    nov: '11', des: '12', dec: '12',
    januari: '01', februari: '02', maret: '03', april: '04',
    juni: '06', juli: '07', agustus: '08', september: '09',
    oktober: '10', november: '11', desember: '12'
  };
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = months[m[2].toLowerCase()] || '01';
    return `${m[3]}-${mon}-${day}`;
  }
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return s;
}

document.getElementById('modal-import-result').querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => document.getElementById('modal-import-result').classList.remove('open')));
document.getElementById('modal-import-result').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-import-result')) {
    document.getElementById('modal-import-result').classList.remove('open');
  }
});

// ─── Users Modal ───────────────────────────────────────────
const modalUsers = document.getElementById('modal-users');
document.getElementById('btn-users').addEventListener('click', async () => {
  modalUsers.classList.add('open');
  await renderUsersList();
});
modalUsers.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', () => modalUsers.classList.remove('open')));
modalUsers.addEventListener('click', e => {
  if (e.target === modalUsers) modalUsers.classList.remove('open');
});

async function renderUsersList() {
  const wrap = document.getElementById('users-list');
  if (USER.role !== 'owner') {
    wrap.innerHTML = '<p style="color:#5a7373;font-size:0.85rem;">Hanya owner yang dapat mengelola user.</p>';
    return;
  }
  try {
    const { users } = await api('/users');
    wrap.innerHTML = users.map(u => `
      <div class="user-item">
        <div class="u-info">
          <strong>${escapeHtml(u.username)}</strong>
          <small>${escapeHtml(u.nama_lengkap || '')} · ${escapeHtml(u.role)}</small>
        </div>
        ${u.username !== USER.username
          ? `<button class="btn-icon danger" data-deluser="${u.id}" title="Hapus">🗑️</button>`
          : '<small style="color:#5a7373;">(Anda)</small>'}
      </div>
    `).join('');

    wrap.querySelectorAll('[data-deluser]').forEach(b =>
      b.addEventListener('click', async () => {
        if (!confirm('Hapus user ini?')) return;
        try {
          await api(`/users/${b.dataset.deluser}`, { method: 'DELETE' });
          renderUsersList();
        } catch (err) { alert(err.message); }
      }));
  } catch (err) {
    wrap.innerHTML = `<p style="color:#e74c3c;">${escapeHtml(err.message)}</p>`;
  }
}

document.getElementById('form-user').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('u-username').value.trim(),
        password: document.getElementById('u-pass').value,
        nama_lengkap: document.getElementById('u-nama').value.trim(),
        role: document.getElementById('u-role').value,
      }),
    });
    e.target.reset();
    renderUsersList();
  } catch (err) { alert(err.message); }
});

// ─── Start ─────────────────────────────────────────────────
init().catch(err => {
  console.error(err);
  alert('Gagal memuat data: ' + err.message);
});
