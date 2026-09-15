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

if (!TOKEN) window.location.href = 'login.html';

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
    window.location.href = 'login.html';
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
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

// ─── Logout ────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('ga_token');
  localStorage.removeItem('ga_user');
  window.location.href = 'login.html';
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
  document.getElementById('st-income-all').textContent = rupiah(s.penghasilan_keseluruhan);
  document.getElementById('st-income-year').textContent = rupiah(s.penghasilan_tahun_ini);
  document.getElementById('st-income-month').textContent = rupiah(s.penghasilan_bulan_ini);
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
    if (filter === 'all') {
      ACTIVE_ROOM_FILTER = 'all';
    }
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
        <td><strong>${rupiah(o.harga_total)}</strong></td>
        <td><span class="badge ${badgeClass}">${escapeHtml(o.status_bayar)}</span></td>
        <td>${link}</td>
        <td>
          <div class="btn-row">
            <button class="btn-icon" data-edit="${o.id}" title="Edit">✏️</button>
            <button class="btn-icon danger" data-del="${o.id}" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openModal(Number(b.dataset.edit))));
  tbody.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteOcc(Number(b.dataset.del))));
}

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

function fillRoomSelect() {
  const fr = document.getElementById('f-room');
  fr.innerHTML = ROOMS.map(r => 
    `<option value="${r.id}">${escapeHtml(r.nama_kamar)} (${escapeHtml(r.tipe)})</option>`
  ).join('');
}

function openModal(id) {
  EDITING_ID = id;
  const f = formOcc;
  f.reset();
  fillRoomSelect();

  if (id) {
    const o = OCCS.find(x => x.id === id);
    if (!o) return;
    document.getElementById('modal-title').textContent = 'Edit Okupansi';
    document.getElementById('f-id').value = o.id;
    document.getElementById('f-room').value = o.room_id;
    document.getElementById('f-nama').value = o.nama_penyewa;
    document.getElementById('f-hp').value = o.no_hp || '';
    document.getElementById('f-kampus').value = o.asal_kampus || '';
    document.getElementById('f-tipe').value = o.tipe_sewa;
    document.getElementById('f-status').value = o.status_bayar;
    document.getElementById('f-mulai').value = o.tanggal_mulai;
    document.getElementById('f-selesai').value = o.tanggal_selesai;
    document.getElementById('f-harga').value = o.harga_total;
    document.getElementById('f-link').value = o.link_kontrak || '';
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
    nama_penyewa: document.getElementById('f-nama').value.trim(),
    no_hp: document.getElementById('f-hp').value.trim() || null,
    asal_kampus: document.getElementById('f-kampus').value.trim() || null,
    tipe_sewa: document.getElementById('f-tipe').value,
    tanggal_mulai: document.getElementById('f-mulai').value,
    tanggal_selesai: document.getElementById('f-selesai').value,
    harga_total: Number(document.getElementById('f-harga').value),
    status_bayar: document.getElementById('f-status').value,
    link_kontrak: document.getElementById('f-link').value.trim() || null,
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
    ['Kamar','Penyewa','No HP','Asal Kampus','Tipe Sewa','Mulai','Selesai','Total','Status','Link Kontrak','Catatan'],
    ...OCCS.map(o => [
      o.nama_kamar, o.nama_penyewa, o.no_hp || '', o.asal_kampus || '',
      o.tipe_sewa, o.tanggal_mulai, o.tanggal_selesai,
      o.harga_total, o.status_bayar, o.link_kontrak || '', o.catatan || ''
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
