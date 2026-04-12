/* ================================================================
   CrowdSense AI – Frontend Application
   ================================================================ */

const API = '';  // Same-origin; proxied by FastAPI

// ── State ────────────────────────────────────────────────────────
let currentLang = 'en';
let translations = {};
let crowdData = null;
let userZone = 'A1';
let userOrders = [];
let stallsData = [];
let helpData = [];
let zonesData = [];
let orderCart = {};
let orderStallId = '';
let heatmapInterval = null;

// ── Zone positions for heatmap ──────────────────────────────────
const ZONE_POS = {
  GATE_N: [50,8], GATE_S: [50,92], GATE_E: [92,50], GATE_W: [8,50],
  A1: [25,22], A2: [42,22], A3: [58,22], A4: [75,22],
  B1: [25,47], B2: [42,47], B3: [58,47], B4: [75,47],
  C1: [25,72], C2: [42,72], C3: [58,72], C4: [75,72],
  EXIT_MAIN: [50,3], EXIT_EAST: [95,32], EXIT_WEST: [5,72],
};

const ZONE_LIST = [
  'A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','C3','C4',
  'GATE_N','GATE_S','GATE_E','GATE_W','EXIT_MAIN','EXIT_EAST','EXIT_WEST'
];

// ══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();
  initTheme();
  initNavigation();
  initLanguage();
  populateZoneSelects();
  await Promise.all([loadCrowdData(), loadStalls(), loadHelp()]);
  startHeatmapUpdates();
  initChat();
  initRouting();
});

// ══════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ══════════════════════════════════════════════════════════════════
async function loadTranslations() {
  try {
    const res = await fetch('translations.json');
    translations = await res.json();
  } catch {
    translations = {};
  }
}

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val !== key) el.placeholder = val;
  });
}

// ══════════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('cs-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cs-theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ══════════════════════════════════════════════════════════════════
// LANGUAGE
// ══════════════════════════════════════════════════════════════════
function initLanguage() {
  const saved = localStorage.getItem('cs-lang') || 'en';
  currentLang = saved;
  applyTranslations();
  highlightLang(saved);

  document.getElementById('langToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('langDropdown').classList.toggle('show');
  });

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = btn.getAttribute('data-lang');
      currentLang = lang;
      localStorage.setItem('cs-lang', lang);
      applyTranslations();
      highlightLang(lang);
      document.getElementById('langDropdown').classList.remove('show');
      // Re-render dynamic content
      if (crowdData) renderStats(crowdData);
      renderQueues();
      renderStalls();
      renderHelp();
    });
  });

  document.addEventListener('click', () => {
    document.getElementById('langDropdown').classList.remove('show');
  });
}

function highlightLang(lang) {
  document.querySelectorAll('.lang-option').forEach(o => {
    o.classList.toggle('active', o.getAttribute('data-lang') === lang);
  });
}

// ══════════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════════
function initNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.getAttribute('data-section');
      switchSection(section);
    });
  });
}

function switchSection(name) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const tab = document.querySelector(`.nav-tab[data-section="${name}"]`);
  const section = document.getElementById(`section-${name}`);
  if (tab) tab.classList.add('active');
  if (section) section.classList.add('active');
}

// ══════════════════════════════════════════════════════════════════
// ZONE SELECTS
// ══════════════════════════════════════════════════════════════════
function populateZoneSelects() {
  const selects = ['routeFrom', 'routeTo', 'userZoneSelect'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    if (id !== 'userZoneSelect') {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = t('route_select_zone');
      sel.appendChild(opt);
    }
    ZONE_LIST.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z;
      opt.textContent = z;
      if (id === 'userZoneSelect' && z === userZone) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  const userZoneSel = document.getElementById('userZoneSelect');
  if (userZoneSel) {
    userZoneSel.addEventListener('change', () => {
      userZone = userZoneSel.value;
      updateZoneHint();
    });
    updateZoneHint();
  }
}

function updateZoneHint() {
  const el = document.getElementById('userZoneHint');
  const translationKey = 'hint_' + userZone.toLowerCase().replace('_', '');
  if (el) el.textContent = `📍 ${t(translationKey) !== translationKey ? t(translationKey) : userZone}`;
}

// ══════════════════════════════════════════════════════════════════
// CROWD DATA & HEATMAP
// ══════════════════════════════════════════════════════════════════
async function loadCrowdData() {
  try {
    const res = await fetch(`${API}/api/v1/crowd/snapshot`);
    crowdData = await res.json();
    renderStats(crowdData);
    drawHeatmap(crowdData);
  } catch (err) {
    console.error('Failed to load crowd data:', err);
  }
}

function renderStats(data) {
  if (!data || !data.zones) return;
  const zones = data.zones.filter(z => !z.zone_id.startsWith('EXIT'));
  const avg = zones.reduce((s, z) => s + z.current_density, 0) / zones.length;
  const busiest = zones.reduce((a, b) => a.current_density > b.current_density ? a : b);
  const quietest = zones.reduce((a, b) => a.current_density < b.current_density ? a : b);
  const avgPredicted = zones.reduce((s, z) => s + z.predicted_density, 0) / zones.length;
  const trend = avgPredicted > avg + 0.02 ? t('increasing') : avgPredicted < avg - 0.02 ? t('decreasing') : t('stable');

  document.getElementById('statAvgDensity').textContent = `${(avg * 100).toFixed(0)}%`;
  document.getElementById('statBusiest').textContent = busiest.zone_id;
  document.getElementById('statQuietest').textContent = quietest.zone_id;
  document.getElementById('statTrend').textContent = trend;
}

function drawHeatmap(data) {
  const canvas = document.getElementById('heatmapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  const W = rect.width;
  const H = rect.height;

  // Background
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
  for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

  // Draw stadium outline
  ctx.strokeStyle = isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const cx = W * 0.5, cy = H * 0.5;
  ctx.ellipse(cx, cy, W * 0.42, H * 0.43, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Draw field
  ctx.fillStyle = isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.08)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, W * 0.15, H * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.35)';
  ctx.font = '600 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t('field'), cx, cy + 4);

  if (!data || !data.zones) return;

  // Density map for zones
  const densityMap = {};
  data.zones.forEach(z => densityMap[z.zone_id] = z);

  // Draw connections first (edges)
  const edges = [
    ['GATE_N','A1'],['GATE_N','A2'],['A1','A2'],['A2','A3'],['A3','A4'],
    ['A1','B1'],['A2','B2'],['A3','B3'],['A4','B4'],
    ['B1','B2'],['B2','B3'],['B3','B4'],
    ['B1','C1'],['B2','C2'],['B3','C3'],['B4','C4'],
    ['C1','C2'],['C2','C3'],['C3','C4'],
    ['GATE_S','C3'],['GATE_S','C4'],['GATE_E','B4'],['GATE_W','B1'],
  ];
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)';
  ctx.lineWidth = 1;
  edges.forEach(([a, b]) => {
    const pa = ZONE_POS[a], pb = ZONE_POS[b];
    if (!pa || !pb) return;
    ctx.beginPath();
    ctx.moveTo(W * pa[0] / 100, H * pa[1] / 100);
    ctx.lineTo(W * pb[0] / 100, H * pb[1] / 100);
    ctx.stroke();
  });

  // Draw zone nodes
  Object.entries(ZONE_POS).forEach(([zoneId, [px, py]]) => {
    const x = W * px / 100;
    const y = H * py / 100;
    const zone = densityMap[zoneId];
    const density = zone ? zone.current_density : 0.3;

    // Glow
    const radius = zoneId.startsWith('EXIT') || zoneId.startsWith('GATE') ? 16 : 22;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
    const color = densityColor(density);
    gradient.addColorStop(0, color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Node circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
    ctx.font = `600 ${radius > 18 ? 10 : 8}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = zoneId.replace('GATE_', 'G-').replace('EXIT_', 'E-');
    ctx.fillText(label, x, y - 1);

    // Density percentage
    ctx.fillStyle = isDark ? 'rgba(241,245,249,0.6)' : 'rgba(15,23,42,0.5)';
    ctx.font = '500 8px JetBrains Mono, monospace';
    const count = zone ? zone.headcount : Math.floor(density * 200);
    ctx.fillText(`${(density * 100).toFixed(0)}% | ${count} ppl`, x, y + radius + 10);
  });
}

function densityColor(d) {
  if (d < 0.35) return 'rgb(16, 185, 129)';
  if (d < 0.65) return 'rgb(245, 158, 11)';
  return 'rgb(239, 68, 68)';
}

function startHeatmapUpdates() {
  heatmapInterval = setInterval(async () => {
    await loadCrowdData();
  }, 8000);

  window.addEventListener('resize', () => {
    if (crowdData) drawHeatmap(crowdData);
  });
}

// ══════════════════════════════════════════════════════════════════
// ROUTING
// ══════════════════════════════════════════════════════════════════
function initRouting() {
  document.getElementById('findRouteBtn').addEventListener('click', findRoute);
  document.getElementById('findExitBtn').addEventListener('click', findBestExit);
}

async function findRoute() {
  const from = document.getElementById('routeFrom').value;
  const to = document.getElementById('routeTo').value;
  if (!from || !to) return;

  try {
    const res = await fetch(`${API}/api/v1/routing/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: from, destination: to }),
    });
    const data = await res.json();
    displayRoute(data);
  } catch (err) {
    console.error('Route error:', err);
  }
}

async function findBestExit() {
  const from = document.getElementById('routeFrom').value || userZone;
  try {
    const res = await fetch(`${API}/api/v1/routing/exit/${from}`);
    const data = await res.json();
    displayRoute(data);
  } catch (err) {
    console.error('Exit route error:', err);
  }
}

function displayRoute(data) {
  const container = document.getElementById('routeResult');
  const pathEl = document.getElementById('routePath');
  const costEl = document.getElementById('routeCost');

  if (!data.path || data.path.length === 0) {
    container.style.display = 'block';
    pathEl.innerHTML = '<span style="color:var(--accent-5);">No route found</span>';
    costEl.textContent = 'N/A';
    return;
  }

  container.style.display = 'block';
  costEl.textContent = data.total_cost.toFixed(2);

  pathEl.innerHTML = data.path.map((node, i) => {
    const arrow = i < data.path.length - 1 ? '<span class="route-arrow">→</span>' : '';
    let currDensity = '';
    if (data.steps && data.steps[i] && data.steps[i].density !== undefined) {
      currDensity = ` <span style="font-size:0.75em; opacity:0.8;">(${(data.steps[i].density * 100).toFixed(0)}%)</span>`;
    }
    return `<span class="route-node" style="animation-delay:${i * 0.08}s">${node}${currDensity}</span>${arrow}`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════
// QUEUES
// ══════════════════════════════════════════════════════════════════
async function loadQueues() {
  try {
    const res = await fetch(`${API}/api/v1/queue/all`);
    return await res.json();
  } catch { return []; }
}

async function renderQueues() {
  const queues = await loadQueues();
  const grid = document.getElementById('queueGrid');
  if (!grid) return;

  grid.innerHTML = queues.map(q => {
    const level = q.queue_length === 0 ? 'low' : q.queue_length < 3 ? 'medium' : 'high';
    const statusBadge = q.is_accepting_orders
      ? `<span class="badge badge-success">${t('queue_open')}</span>`
      : `<span class="badge badge-warning">${t('queue_paused')}</span>`;

    return `
      <div class="card queue-card ${level}">
        <div class="card-header">
          <div class="card-title">${t(q.stall_name)}</div>
          ${statusBadge}
        </div>
        <div class="queue-length" style="font-size:1.5rem;">${q.queue_length} <span style="font-size:0.9rem; font-weight:normal;">${t('queue_total')}</span></div>
        <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:0.85rem; color:var(--text-secondary);">
          <div>${t('queue_online')} <strong>${q.online_queue_length}</strong></div>
          <div>${t('queue_offline')} <strong>${q.offline_queue_length}</strong></div>
        </div>
        <div class="queue-wait" style="margin-top:12px;">~${q.estimated_wait_minutes} ${t('queue_wait')}</div>
      </div>
    `;
  }).join('');
}

function renderOrders() {
  const container = document.getElementById('ordersContainer');
  const noMsg = document.getElementById('noOrdersMsg');
  if (userOrders.length === 0) {
    if (noMsg) noMsg.style.display = 'block';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';

  const renderList = (list) => list.map(o => `
    <div class="order-item">
      <div>
        <div class="order-token" style="font-size:1.1rem; color:var(--accent-1); margin-bottom:4px;">${t(o.stall_name)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">${t('order_id')} ${o.order_id}</div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">${o.items.map(i => `${t(i.name)} x${i.quantity}`).join(', ')}</div>
      </div>
      <div style="text-align:right;">
        <div class="badge ${o.status === 'ready' ? 'badge-success' : o.status === 'preparing' ? 'badge-warning' : o.status === 'cancelled' ? 'badge-danger' : 'badge-info'}">${t('status_' + o.status)}</div>
        <div style="font-family:var(--font-mono); font-weight:700; color:var(--accent-4); margin-top:4px;">${t('currency')}${o.total.toFixed(2)}</div>
        <div style="font-size:0.75rem; color:var(--success); margin-top:2px;">${t('payment_paid')}</div>
        ${o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${t('queue_position')} ${o.queue_position + 1}</div>` : ''}
        ${o.status === 'pending' ? `<button class="btn btn-ghost" style="margin-top:6px; padding:4px 8px; font-size:0.75rem;" onclick="cancelOrder('${o.order_id}')">${t('order_cancel_btn')}</button>` : ''}
      </div>
    </div>
  `).join('');

  const activeOrders = userOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  const pastOrders = userOrders.filter(o => ['collected', 'cancelled'].includes(o.status));

  let finalHtml = `<div style="margin-bottom:12px; font-size:0.8rem; color:var(--text-secondary);"><i>${t('order_cancel_note')}</i></div>`;
  
  if (activeOrders.length > 0) {
    finalHtml += `<h3 style="margin:16px 0 8px; font-size:1rem; color:var(--accent-1);">${t('active_orders')}</h3>` + renderList(activeOrders);
  }
  if (pastOrders.length > 0) {
    finalHtml += `<h3 style="margin:24px 0 8px; font-size:1rem; color:var(--text-muted);">${t('past_orders')}</h3>` + renderList(pastOrders);
  }

  container.innerHTML = finalHtml;
}

window.cancelOrder = async function(orderId) {
  try {
    await fetch(`${API}/api/v1/queue/order/${orderId}/status?status=cancelled`, { method: 'PATCH' });
    const order = userOrders.find(o => o.order_id === orderId);
    if (order) order.status = 'cancelled';
    renderOrders();
  } catch (err) {
    console.error('Cancel error:', err);
  }
};

// ══════════════════════════════════════════════════════════════════
// ORDER MODAL
// ══════════════════════════════════════════════════════════════════
function openOrderModal(stallId) {
  orderStallId = stallId;
  orderCart = {};
  const stall = stallsData.find(s => s.stall_id === stallId);
  if (!stall) return;

  const comboss = stall.offers.filter(o => o.combo_price);

  const body = document.getElementById('orderModalBody');
  body.innerHTML = `
    <h3 style="font-size:1rem; margin-bottom:16px; color:var(--accent-1);">${t(stall.name)}</h3>
    ${stall.menu.map(item => `
      <div class="menu-item" style="padding:12px 0;">
        <div>
          <div class="menu-item-name">${t(item.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${item.description ? t(item.description) : ''}</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="menu-item-price">${t('currency')}${item.price.toFixed(2)}</span>
          <div class="qty-control">
            <button class="qty-btn" onclick="adjustQty('${item.item_id}', -1, ${item.price}, '${item.name.replace(/'/g, "\\'")}')">−</button>
            <span class="qty-value" id="qty-${item.item_id}">0</span>
            <button class="qty-btn" onclick="adjustQty('${item.item_id}', 1, ${item.price}, '${item.name.replace(/'/g, "\\'")}')">+</button>
          </div>
        </div>
      </div>
    `).join('')}
    ${comboss.length > 0 ? `
      <h4 style="font-size:0.9rem; margin:16px 0 8px; color:var(--accent-2);">${t('combos_deals')}</h4>
      ${comboss.map(offer => `
        <div class="menu-item" style="padding:12px 0;">
          <div>
            <div class="menu-item-name">${t(offer.title)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${offer.description ? t(offer.description) : ''}</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="menu-item-price">$${offer.combo_price.toFixed(2)}</span>
            <div class="qty-control">
              <button class="qty-btn" onclick="adjustQty('${offer.offer_id}', -1, ${offer.combo_price}, '${offer.title.replace(/'/g, "\\'")}')">−</button>
              <span class="qty-value" id="qty-${offer.offer_id}">0</span>
              <button class="qty-btn" onclick="adjustQty('${offer.offer_id}', 1, ${offer.combo_price}, '${offer.title.replace(/'/g, "\\'")}')">+</button>
            </div>
          </div>
        </div>
      `).join('')}
    ` : ''}
  `;

  document.getElementById('orderModalTotal').textContent = `${t('currency')}0.00`;
  document.getElementById('orderModal').style.display = 'flex';

  document.getElementById('placeOrderBtn').onclick = () => {
    closeOrderModal();
    openPaymentModal(stallId);
  };
}

function closeOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
}

function adjustQty(itemId, delta, price, name) {
  if (!orderCart[itemId]) orderCart[itemId] = { item_id: itemId, name, price, quantity: 0 };
  orderCart[itemId].quantity = Math.max(0, orderCart[itemId].quantity + delta);
  const el = document.getElementById(`qty-${itemId}`);
  if (el) el.textContent = orderCart[itemId].quantity;
  updateOrderTotal();
}

function updateOrderTotal() {
  const total = Object.values(orderCart).reduce((s, i) => s + i.price * i.quantity, 0);
  document.getElementById('orderModalTotal').textContent = `${t('currency')}${total.toFixed(2)}`;
}

let currentDiscountOffer = null;
let currentStallOffers = [];

window.updatePaymentTotal = function() {
  const subtotal = Object.values(orderCart).reduce((s, i) => s + i.price * i.quantity, 0);
  const offerSelect = document.getElementById('paymentOfferSelect');
  const offerId = offerSelect ? offerSelect.value : '0';
  const offer = currentStallOffers.find(o => o.offer_id === offerId);
  let discountAmount = 0;

  if (offer) {
    discountAmount = subtotal * (offer.discount_percent / 100);
  }

  const finalTotal = subtotal - discountAmount;
  const el = document.getElementById('paymentModalTotal');
  if (el) {
    el.innerHTML = `
      ${discountAmount > 0 ? `<span style="font-size:0.85rem; color:var(--text-muted); text-decoration:line-through; margin-right:8px;">${t('currency')}${subtotal.toFixed(2)}</span>` : ''}
      ${t('currency')}${finalTotal.toFixed(2)}
    `;
  }
};

function openPaymentModal(stallId) {
  const items = Object.values(orderCart).filter(i => i.quantity > 0);
  if (items.length === 0) return;

  const stall = stallsData.find(s => s.stall_id === stallId);
  currentStallOffers = stall ? stall.offers.filter(o => o.discount_percent > 0) : [];

  const itemsHtml = items.map(i => `
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <span>${i.name} x${i.quantity}</span>
      <span>$${(i.price * i.quantity).toFixed(2)}</span>
    </div>
  `).join('');

  document.getElementById('paymentSummaryItems').innerHTML = itemsHtml;

  const offerSelect = document.getElementById('paymentOfferSelect');
  if (offerSelect) {
    offerSelect.innerHTML = `<option value="0">${t('payment_no_offer')}</option>` + currentStallOffers.map(o => `
      <option value="${o.offer_id}">${t(o.title)} (${o.discount_percent}${t('offer_off')})</option>
    `).join('');
  }

  window.updatePaymentTotal();
  document.getElementById('paymentModal').style.display = 'flex';

  document.getElementById('confirmPaymentBtn').onclick = () => confirmPaymentAndOrder(stallId);
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
}

window.closePaymentModal = closePaymentModal;

async function confirmPaymentAndOrder(stallId) {
  const items = Object.values(orderCart).filter(i => i.quantity > 0);
  if (items.length === 0) return;

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const offerSelect = document.getElementById('paymentOfferSelect');
  const offerId = offerSelect ? offerSelect.value : '0';
  const offer = currentStallOffers.find(o => o.offer_id === offerId);
  let discountAmount = 0;
  if (offer) {
    discountAmount = subtotal * (offer.discount_percent / 100);
  }

  const btn = document.getElementById('confirmPaymentBtn');
  const cancelBtn = document.querySelector('#paymentModal .btn-ghost');
  const loading = document.getElementById('paymentLoading');
  const success = document.getElementById('paymentSuccess');

  if (btn) btn.style.display = 'none';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (loading) loading.style.display = 'block';

  setTimeout(async () => {
    if (loading) loading.style.display = 'none';
    if (success) success.style.display = 'block';

    setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/v1/queue/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stall_id: stallId, items, user_name: 'Guest', discount_applied: discountAmount }),
        });
        const order = await res.json();
        userOrders.push(order);
        closePaymentModal();
        renderOrders();
        renderQueues();
        switchSection('queue');
      } catch (err) {
        console.error('Order error:', err);
      } finally {
        if (btn) btn.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'block';
        if (success) success.style.display = 'none';
      }
    }, 1500);
  }, 1500);
}

// ══════════════════════════════════════════════════════════════════
// STALLS
// ══════════════════════════════════════════════════════════════════
async function loadStalls() {
  try {
    const res = await fetch(`${API}/api/v1/stalls`);
    stallsData = await res.json();
    renderStalls();
  } catch { stallsData = []; }
}

function renderStalls(filter = 'all') {
  const grid = document.getElementById('stallsGrid');
  if (!grid) return;

  const filtered = filter === 'all' ? stallsData : stallsData.filter(s => s.category === filter);

  grid.innerHTML = filtered.map(stall => {
    const catIcons = { food: '🍔', merchandise: '🛍️', entertainment: '🎮' };
    const offersHtml = stall.offers.filter(o => o.active).map(o => {
      let info = '';
      if (o.combo_price) info = `${t('currency')}${o.combo_price}`;
      else if (o.discount_percent) info = `${o.discount_percent}${t('offer_off')}`;
      return `<div class="offer-badge">🏷️ ${t(o.title)}${info ? ` – ${info}` : ''}</div>`;
    }).join(' ');

    const menuHtml = stall.menu.slice(0, 4).map(item =>
      `<div class="menu-item">
        <span class="menu-item-name">${t(item.name)}</span>
        <span class="menu-item-price">${t('currency')}${item.price.toFixed(2)}</span>
      </div>`
    ).join('');

    return `
      <div class="card stall-card">
        <div class="card-header">
          <div class="card-title">${catIcons[stall.category] || ''} ${t(stall.name)}</div>
          <span class="stall-category-badge ${stall.category}">${t('stalls_' + stall.category)}</span>
        </div>
        <div class="zone-hint" style="margin-bottom:10px;">📍 ${stall.zone_id} – ${stall.location_hint}</div>
        ${offersHtml ? `<div style="margin-bottom:10px; display:flex; gap:6px; flex-wrap:wrap;">${offersHtml}</div>` : ''}
        <div style="margin-bottom:12px;">${menuHtml}</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" style="flex:1;" onclick="navigateToStall('${stall.zone_id}')">${t('stalls_navigate')}</button>
          <button class="btn btn-primary" style="flex:1;" onclick="openOrderModal('${stall.stall_id}')">${t('stalls_order_now')}</button>
        </div>
      </div>
    `;
  }).join('');

  // Filter tab handlers
  document.querySelectorAll('#stallFilters .filter-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('#stallFilters .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderStalls(tab.getAttribute('data-filter'));
    };
  });
}

function navigateToStall(zoneId) {
  document.getElementById('routeFrom').value = userZone;
  document.getElementById('routeTo').value = zoneId;
  switchSection('routes');
  findRoute();
}

// ══════════════════════════════════════════════════════════════════
// HELP
// ══════════════════════════════════════════════════════════════════
async function loadHelp() {
  try {
    const res = await fetch(`${API}/api/v1/help`);
    helpData = await res.json();
    renderHelp();
  } catch { helpData = []; }
}

function renderHelp() {
  const grid = document.getElementById('helpGrid');
  if (!grid) return;

  const typeIcons = { medical: '🏥', first_aid: '🩹', info_desk: 'ℹ️' };
  const typeLabels = { medical: t('help_medical'), first_aid: t('help_first_aid'), info_desk: t('help_info_desk') };

  grid.innerHTML = helpData.map(loc => `
    <div class="card help-card">
      <div class="help-icon">${typeIcons[loc.type] || '📍'}</div>
      <div>
        <div class="card-title" style="margin-bottom:4px;">${t(loc.name)}</div>
        <span class="badge badge-info">${typeLabels[loc.type] || loc.type}</span>
        <div class="zone-hint" style="margin-top:6px;">📍 Zone ${loc.zone_id}</div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-top:6px;">${t(loc.description)}</p>
        ${loc.phone ? `<a href="tel:${loc.phone}" class="help-phone">📞 ${t('help_call')} ${loc.phone}</a>` : ''}
        <button class="btn btn-secondary" style="margin-top:8px; width:100%;" onclick="navigateToStall('${loc.zone_id}')">${t('help_navigate')}</button>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════════
// AI ASSISTANT CHAT
// ══════════════════════════════════════════════════════════════════
function initChat() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  sendBtn.addEventListener('click', () => {
    const msg = input.value.trim();
    if (msg) sendChat(msg);
    input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const msg = input.value.trim();
      if (msg) sendChat(msg);
      input.value = '';
    }
  });
}

async function sendChat(message) {
  const messages = document.getElementById('chatMessages');
  const suggestionsEl = document.getElementById('chatSuggestions');

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = message;
  messages.appendChild(userBubble);
  messages.scrollTop = messages.scrollHeight;

  // Loading
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'chat-bubble assistant';
  loadingBubble.innerHTML = '<div class="loading-bar"></div>';
  messages.appendChild(loadingBubble);
  messages.scrollTop = messages.scrollHeight;

  try {
    const res = await fetch(`${API}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_zone: userZone, lang: currentLang }),
    });
    const data = await res.json();

    // Replace loading with response
    loadingBubble.innerHTML = formatMarkdown(data.reply);

    // Update suggestions
    if (data.suggestions && data.suggestions.length > 0) {
      suggestionsEl.innerHTML = data.suggestions.map(s =>
        `<button class="chat-suggestion" onclick="sendChat('${s.replace(/'/g, "\\'")}')">${s}</button>`
      ).join('');
    }
  } catch {
    loadingBubble.innerHTML = '❌ Sorry, I encountered an error. Please try again.';
  }

  messages.scrollTop = messages.scrollHeight;
  document.getElementById('chatInput').value = '';
}

function formatMarkdown(text) {
  // Simple markdown: bold, newlines
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ══════════════════════════════════════════════════════════════════
// INITIAL RENDER
// ══════════════════════════════════════════════════════════════════
setTimeout(() => {
  renderQueues();
  renderOrders();
}, 500);
