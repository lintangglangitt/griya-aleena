// ============================================================
// app.js - Griya Aleena Sekaran
// Versi: 3.1 (Fix Path Config)
// ============================================================

// ─── CONFIG GLOBAL ────────────────────────────────────────────
let CONFIG = null;

// ─── LOAD CONFIG ──────────────────────────────────────────────
async function loadConfig() {
  try {
    // Gunakan relative path (./) agar kompatibel dengan semua environment
    const timestamp = new Date().getTime();
    const response = await fetch(`./config.json?v=${timestamp}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    
    const config = await response.json();
    
    // Validasi data
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config data');
    }
    
    // Simpan ke global
    CONFIG = config;
    
    // Render semua konten
    renderAll(config);
    
    console.log('✅ Config loaded successfully from: ./config.json');
    
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    showErrorMessage('Gagal memuat data. Silakan refresh halaman.');
  }
}

// ─── RENDER ALL SECTIONS ──────────────────────────────────────
function renderAll(config) {
  renderHero(config);
  renderFasilitas(config);
  renderFasilitasPlus(config);
  renderPricing(config);
  renderLokasi(config);
  renderTestimoni(config);
  renderContacts(config);
  renderEarlyBird(config);
  renderSpecialRequirements(config);
  
  // Init countdown
  if (config.countdown && config.countdown.target) {
    initCountdown(config.countdown.target);
  }
  
  // Hapus loading state
  document.querySelectorAll('.loading-text').forEach(el => {
    el.style.display = 'none';
  });
  
  console.log('✅ All sections rendered successfully');
}

// ─── ERROR MESSAGE ────────────────────────────────────────────
function showErrorMessage(message) {
  const existing = document.querySelector('.config-error');
  if (existing) existing.remove();
  
  const div = document.createElement('div');
  div.className = 'config-error';
  div.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    background: #dc3545;
    color: white;
    padding: 20px;
    text-align: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 4px 20px rgba(220,53,69,0.3);
    animation: slideDown 0.3s ease;
  `;
  div.innerHTML = `
    <strong>⚠️ ${message}</strong>
    <div style="margin-top: 12px;">
      <button onclick="location.reload()" style="
        background: white;
        border: none;
        color: #dc3545;
        padding: 8px 24px;
        border-radius: 20px;
        font-weight: 700;
        cursor: pointer;
        margin-right: 8px;
      ">🔄 Refresh Halaman</button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: transparent;
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 8px 24px;
        border-radius: 20px;
        cursor: pointer;
      ">Tutup</button>
    </div>
  `;
  document.body.prepend(div);
  
  // Tambahkan animation
  if (!document.getElementById('error-animation')) {
    const style = document.createElement('style');
    style.id = 'error-animation';
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── COUNTDOWN ─────────────────────────────────────────────────
function initCountdown(targetDate) {
  const cdD = document.getElementById('cd-d');
  const cdH = document.getElementById('cd-h');
  const cdM = document.getElementById('cd-m');
  const cdS = document.getElementById('cd-s');

  if (!cdD || !cdH || !cdM || !cdS) return;

  const target = new Date(targetDate);
  
  if (isNaN(target.getTime())) {
    console.warn('⚠️ Invalid countdown target date:', targetDate);
    return;
  }

  function update() {
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      cdD.textContent = '00';
      cdH.textContent = '00';
      cdM.textContent = '00';
      cdS.textContent = '00';
      return;
    }

    cdD.textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
    cdH.textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
    cdM.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    cdS.textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

// ─── FORMAT RUPIAH ────────────────────────────────────────────
function formatRupiah(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

// ─── RENDER HERO ──────────────────────────────────────────────
function renderHero(config) {
  if (config.site) {
    // Hero Badge
    const badge = document.querySelector('.hero-badge');
    if (badge && config.site.heroBadge) {
      badge.innerHTML = `<span class="badge-dot"></span> ${config.site.heroBadge}`;
    }
    
    // Hero Sub
    const sub = document.querySelector('.hero-sub');
    if (sub && config.site.heroSub) {
      sub.textContent = config.site.heroSub;
    }
  }
}

// ─── RENDER FASILITAS ─────────────────────────────────────────
function renderFasilitas(config) {
  const container = document.querySelector('.fas-grid');
  if (!container) return;

  const items = config.fasilitas || [];
  if (items.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);">Data fasilitas belum tersedia</p>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="fas-card">
      <div class="fas-icon amber">${item.emoji || '📦'}</div>
      <div class="fas-text">
        <h4>${item.text || 'Fasilitas'}</h4>
        <p>${item.desc || ''}</p>
      </div>
    </div>
  `).join('');
}

// ─── RENDER FASILITAS PLUS ────────────────────────────────────
function renderFasilitasPlus(config) {
  const container = document.querySelector('.plus-list');
  if (!container) return;

  const items = config.fasilitasPlus || [];
  if (items.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);">Data fasilitas plus belum tersedia</p>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="plus-item">
      <div class="plus-check">✓</div>
      <p>${item}</p>
    </div>
  `).join('');
}

// ─── RENDER PRICING ───────────────────────────────────────────
function renderPricing(config) {
  const container = document.querySelector('.harga-container');
  if (!container) return;

  const pricing = config.pricing;
  if (!pricing) {
    container.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;">Data harga belum tersedia</p>';
    return;
  }

  const floorKeys = ['l1ac', 'l1nac', 'l2ac', 'l2nac'];
  const floorLabels = {
    l1ac: { title: '🏠 Lantai 1', type: 'AC', badge: 'ac-badge', emoji: '❄️' },
    l1nac: { title: '🏠 Lantai 1', type: 'Non-AC', badge: 'nonac-badge', emoji: '🌀' },
    l2ac: { title: '🏢 Lantai 2', type: 'AC', badge: 'ac-badge', emoji: '❄️' },
    l2nac: { title: '🏢 Lantai 2', type: 'Non-AC', badge: 'nonac-badge', emoji: '🌀' }
  };

  const floorGroups = {
    '🏠 Lantai 1': { ac: null, nac: null },
    '🏢 Lantai 2': { ac: null, nac: null }
  };

  floorKeys.forEach((key) => {
    const label = floorLabels[key];
    const data = pricing[key];
    if (!data) return;
    const group = floorGroups[label.title];
    if (label.type === 'AC') group.ac = { key, data, label };
    else group.nac = { key, data, label };
  });

  let html = '';
  Object.keys(floorGroups).forEach((floorTitle) => {
    const group = floorGroups[floorTitle];
    const cards = [];
    if (group.ac) cards.push(buildPriceCard(group.ac));
    if (group.nac) cards.push(buildPriceCard(group.nac));
    if (cards.length === 0) return;
    html += `
      <div class="lantai-block">
        <div class="lantai-title">${floorTitle}</div>
        <div class="harga-cards">${cards.join('')}</div>
      </div>
    `;
  });

  container.innerHTML = html || '<p style="color:rgba(255,255,255,0.5);text-align:center;">Data harga belum tersedia</p>';
}

function buildPriceCard(item) {
  const { data, label } = item;
  const { monthly, semesterMonths, yearMonths, semesterEB, semesterSpecial, yearEB, yearSpecial } = data;

  const semesterBase = monthly * semesterMonths;
  const yearBase = monthly * yearMonths;

  return `
    <div class="harga-card">
      <div class="room-type-badge ${label.badge}">${label.emoji} Kamar ${label.type}</div>
      <div class="price-segment bulanan-strike">
        <div class="harga-durasi">Bulanan</div>
        <div class="harga-price-row">
          <span class="harga-normal">${formatRupiah(monthly)}</span>
          <span class="harga-period">/ bulan</span>
        </div>
      </div>
      <div class="price-sep"></div>
      <div class="price-segment">
        <div class="harga-durasi">Semesteran (${semesterMonths} Bulan)</div>
        <div class="price-calc-row">${semesterMonths} × ${formatRupiah(monthly)} = <span class="calc-base">Rp ${formatRupiah(semesterBase)}</span></div>
        <div class="price-calc-row early">Diskon Early Bird: Potongan ${formatRupiah(semesterEB)} → <span class="calc-early">Rp ${formatRupiah(semesterBase - semesterEB)}</span></div>
        <div class="price-calc-row spesial">Diskon Prestasi/Kurang Mampu: Potongan ${formatRupiah(semesterSpecial)} → <span class="calc-spesial">Rp ${formatRupiah(semesterBase - semesterSpecial)}</span></div>
      </div>
      <div class="price-sep"></div>
      <div class="price-segment">
        <div class="harga-durasi">Tahunan (${yearMonths} Bulan) <span class="hemat-tag">💡 Paling Hemat</span></div>
        <div class="price-calc-row">${yearMonths} × ${formatRupiah(monthly)} = <span class="calc-base">Rp ${formatRupiah(yearBase)}</span></div>
        <div class="price-calc-row early">Diskon Early Bird: Potongan ${formatRupiah(yearEB)} → <span class="calc-early">Rp ${formatRupiah(yearBase - yearEB)}</span></div>
        <div class="price-calc-row spesial">Diskon Prestasi/Kurang Mampu: Potongan ${formatRupiah(yearSpecial)} → <span class="calc-spesial">Rp ${formatRupiah(yearBase - yearSpecial)}</span></div>
      </div>
    </div>
  `;
}

// ─── RENDER LOKASI ─────────────────────────────────────────────
function renderLokasi(config) {
  // Map
  const mapContainer = document.querySelector('.lokasi-map iframe');
  if (mapContainer && config.location && config.location.mapsUrl) {
    mapContainer.src = config.location.mapsUrl;
  }

  // Jarak
  const jarakContainer = document.querySelector('.jarak-list');
  if (jarakContainer && config.jarak) {
    jarakContainer.innerHTML = config.jarak.map((item) => `
      <div class="jarak-item">
        <span class="jarak-icon">${item.icon || '📍'}</span>
        <div class="jarak-info">
          <h5>${item.title || ''}</h5>
          <p>${item.desc || ''}</p>
        </div>
        <span class="jarak-time">${item.time || ''}</span>
      </div>
    `).join('');
  }
}

// ─── RENDER TESTIMONI ──────────────────────────────────────────
function renderTestimoni(config) {
  const container = document.querySelector('.testi-grid');
  if (!container) return;

  const items = config.testimonials || [];
  if (items.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);text-align:center;">Belum ada testimoni</p>';
    return;
  }

  container.innerHTML = items.map((item) => {
    const stars = '★'.repeat(Math.min(item.stars || 5, 5));
    const initials = item.name.split(' ').map(w => w[0]).join('').toUpperCase();
    return `
      <div class="testi-card">
        <div class="testi-stars">${stars}</div>
        <p class="testi-text">"${item.text || ''}"</p>
        <div class="testi-author">
          <div class="testi-avatar">${initials || '?'}</div>
          <div>
            <div class="testi-name">${item.name || 'Anonim'}</div>
            <div class="testi-role">${item.role || ''}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── WHATSAPP TEMPLATE ────────────────────────────────────────
function getWhatsAppTemplate(contactName = '') {
  if (CONFIG && CONFIG.whatsapp && CONFIG.whatsapp.template) {
    let template = CONFIG.whatsapp.template;
    if (contactName) {
      template = template.replace(/{name}/g, contactName);
    }
    return encodeURIComponent(template);
  }
  // Fallback template (hardcode minimal)
  return encodeURIComponent('Hello Griya Aleena..\nSaya ingin bertanya lebih lanjut.');
}

function buildWhatsAppUrl(phoneNumber, contactName = '') {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  let waNumber = cleanNumber;
  if (!waNumber.startsWith('62')) {
    waNumber = '62' + waNumber;
  }
  const template = getWhatsAppTemplate(contactName);
  return `https://wa.me/${waNumber}?text=${template}`;
}

// ─── RENDER CONTACTS ──────────────────────────────────────────
function renderContacts(config) {
  const container = document.querySelector('.kontak-cards-wrap');
  if (!container) return;

  const contacts = config.contacts || [];
  if (contacts.length === 0) {
    container.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;">Kontak belum tersedia</p>';
    return;
  }

  container.innerHTML = `
    <div style="display:flex; justify-content:center; margin-top:36px;">
      <div class="kontak-card" style="min-width:340px; max-width:480px; width:100%; gap:20px;">
        <div class="k-label" style="margin-bottom:0;">Hubungi Langsung</div>
        <div style="width:100%; height:1px; background:rgba(255,255,255,0.1);"></div>
        ${contacts.map((contact, index) => {
          const waUrl = buildWhatsAppUrl(contact.wa, contact.name);
          return `
            <div style="width:100%;">
              <div style="font-size:1.5rem; color:rgba(255,255,255,0.45); margin-bottom:6px;">${contact.name || 'Kontak'}</div>
              <a class="wa-btn" href="${waUrl}" target="_blank" style="width:100%; justify-content:center; padding:13px 20px; font-size:0.95rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Chat WhatsApp
              </a>
            </div>
            ${index < contacts.length - 1 ? '<div style="width:100%; height:1px; background:rgba(255,255,255,0.1);"></div>' : ''}
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── RENDER EARLY BIRD ────────────────────────────────────────
function renderEarlyBird(config) {
  const container = document.querySelector('.early-bird-container');
  if (!container) return;

  const req = config.earlyBirdRequirement || 'Booking kamar sebelum 15 Juli 2026.';
  container.innerHTML = `
    <div class="diskon-syarat">
      <h4b>🐦 Syarat Diskon Early Bird</h4b>
      <div class="syarat-item">
        <h5>⏱️ ${req}</h5>
      </div>
    </div>
  `;
}

// ─── RENDER SPECIAL REQUIREMENTS ──────────────────────────────
function renderSpecialRequirements(config) {
  const container = document.querySelector('.diskon-syarat-container');
  if (!container) return;

  const req = config.specialRequirements;
  if (!req) {
    container.innerHTML = '';
    return;
  }

  let itemsHtml = '';
  Object.keys(req).forEach((key) => {
    const section = req[key];
    if (!section || !section.items) return;
    const items = section.items.map(item => `<li>${item}</li>`).join('');
    itemsHtml += `
      <div class="syarat-item">
        <h5>${section.title || ''}</h5>
        <ul>${items}</ul>
      </div>
    `;
  });

  if (!itemsHtml) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="diskon-syarat">
      <h4>🎁 Syarat Diskon Prestasi/Kurang Mampu</h4>
      <div class="syarat-grid">${itemsHtml}</div>
    </div>
  `;
}

// ─── INIT ──────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadConfig);
} else {
  loadConfig();
}

// ─── DEBUG ────────────────────────────────────────────────────
window.__debug = {
  reloadConfig: loadConfig,
  formatRupiah: formatRupiah,
  config: () => CONFIG,
};

console.log('✅ app.js v3.1 loaded');
console.log('🔧 Gunakan window.__debug untuk debugging');
