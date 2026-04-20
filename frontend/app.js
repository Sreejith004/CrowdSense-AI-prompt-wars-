/* ================================================================
   CrowdSense AI – Frontend Application
   ================================================================ */

const API = '';  // Same-origin; proxied by FastAPI

// ── State ────────────────────────────────────────────────────────
let currentLang = 'en';
let translations = {};
let crowdData = null;
let userZone = '';
let userOrders = [];
let stallsData = [];
let helpData = [];
let zonesData = [];
let orderCart = {};
let orderStallId = '';
let heatmapInterval = null;
let isLoggedIn = false;
let currentUserId = null;
let currentUserIdentifier = '';
let waterPointsData = [];
let nearestWaterData = null;

// ── Context State ──────────────────────────────────────────────
let currentStadium = null;
let currentMatch = null;
let currentSeat = null;
let currentZone = null;
let targetZone = null;
let isLoading = false;

const STADIUM_LIST = [
  { id: 'Chepauk', name: 'Chepauk Stadium', city: 'chennai' },
  { id: 'Wankhede', name: 'Wankhede Stadium', city: 'mumbai' },
  { id: 'NarendraModi', name: 'Narendra Modi Stadium', city: 'ahmedabad' }
];

const MOCK_SCHEDULE = {
  'Chepauk': { match: 'CSK vs MI', live: true },
  'Wankhede': { match: 'IND vs NZ', live: false },
  'NarendraModi': { match: 'GT vs RR', live: true }
};

// ── Zone positions for heatmap ──────────────────────────────────
const ZONE_POS = {
  GATE_N: [50,17], GATE_S: [50,94], GATE_E: [85,55], GATE_W: [15,55],
  A1: [30,33], A2: [43,33], A3: [57,33], A4: [70,33],
  B1: [30,55], B2: [43,55], B3: [57,55], B4: [70,55],
  C1: [30,78], C2: [43,78], C3: [57,78], C4: [70,78],
  EXIT_MAIN: [50,4], EXIT_EAST: [95,33], EXIT_WEST: [5,78],
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
  initLanguage();
  initAuth();
  
  // Handle context before data loading
  await initContext();
  
  populateZoneSelects();
  
  if (currentStadium) {
    await refreshContextData();
  } else {
    // Show stadium selection
    switchSection('stadium-selection');
  }

  startHeatmapUpdates();
  initChat();
  initRouting();
  initNavigation();
  initStadiumSelection();
});

async function initContext() {
  // 1. URL Params (Priority)
  const params = parseUrlParams();
  
  if (params.stadium) {
    currentStadium = params.stadium;
    currentMatch = params.match || getCurrentMatch(params.stadium);
    if (params.seat || params.zone) {
      if (params.seat) currentSeat = params.seat;
      targetZone = params.zone || getZoneFromSeat(params.seat);
      currentZone = targetZone; // Show the ticket's zone in the context bar
    }
    localStorage.setItem('cs-selected-stadium', currentStadium);
  } else {
    // 2. Local Storage
    const stored = localStorage.getItem('cs-selected-stadium');
    if (stored && STADIUM_LIST.some(s => s.id === stored)) {
      currentStadium = stored;
      currentMatch = getCurrentMatch(stored);
    }
  }
}

function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    stadium: urlParams.get('stadium'),
    match: urlParams.get('match'),
    seat: urlParams.get('seat'),
    zone: urlParams.get('zone')
  };
}

function getZoneFromSeat(seat) {
  if (!seat) return null;
  const firstChar = seat.charAt(0).toUpperCase();
  // Map A12 -> A1, B5 -> B1, etc. (Just using the prefix for current zone mapping logic)
  if (ZONE_LIST.includes(firstChar + '1')) return firstChar + '1';
  return 'A1'; // Fallback
}

function getCurrentMatch(stadiumId) {
  const sched = MOCK_SCHEDULE[stadiumId];
  return sched ? sched.match : 'No Match Today';
}

async function refreshContextData() {
  if (!currentStadium) return;
  isLoading = true;
  updateLoadingUI();
  
  await Promise.all([loadCrowdData(), loadStalls(), loadHelp(), loadFacilities()]);
  
  isLoading = false;
  updateLoadingUI();
  updateContextBar();
  renderStalls();
  renderHelp();
  renderQueues();
  switchSection('dashboard');
  applyTranslations();
}

function updateLoadingUI() {
  // Simple loading indicator toggle
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = isLoading ? 'flex' : 'none';
}

function updateContextBar() {
  const stadiumName = currentStadium ? t(currentStadium) : 'N/A';
  const matchKey = currentMatch || 'match_none';
  const matchDisplay = t(matchKey);
  const matchInfo = MOCK_SCHEDULE[currentStadium];
  
  document.getElementById('ctxStadium').textContent = stadiumName;
  document.getElementById('ctxMatch').textContent = matchDisplay;
  document.getElementById('ctxSeat').textContent = currentSeat || t('not_available');
  
  // Translation for 'Not Selected'
  const zoneDisplay = currentZone ? currentZone : (userZone || t('not_selected'));
  document.getElementById('ctxZone').textContent = zoneDisplay;
  
  const liveBadge = document.getElementById('ctxLiveBadge');
  if (liveBadge) liveBadge.style.display = (matchInfo && matchInfo.live) ? 'inline-block' : 'none';
  
  const bar = document.getElementById('contextBar');
  if (bar) {
    if (currentStadium) {
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  }
}

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
    el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    el.placeholder = val;
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
    
    // Instantly redraw heatmap for theme change
    if (crowdData) {
      drawHeatmap(crowdData);
      if (document.getElementById('fullMapOverlay') && document.getElementById('fullMapOverlay').style.display === 'flex') {
        drawHeatmap(crowdData, 'fullMapCanvas');
      }
    }
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
      initStadiumSelection(); // Re-render stadium cards (for Chennai, Mumbai, Ahmedabad)
      renderQueues();
      renderStalls();
      renderHelp();
      updateContextBar();
      renderOrders();
      if (document.getElementById('waterSection').style.display === 'block') {
        renderWaterGrid();
      }
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
      if (!currentStadium && tab.getAttribute('data-section') !== 'stadium-selection') {
        alert('Please select a stadium first.');
        return;
      }
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
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = t('route_select_zone');
    sel.appendChild(opt);
    ZONE_LIST.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z;
      opt.textContent = z;
      if (id === 'userZoneSelect' && z === userZone) opt.selected = true;
      if (id === 'routeFrom' && z === userZone) opt.selected = true;
      if (id === 'routeTo' && z === targetZone) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  const userZoneSel = document.getElementById('userZoneSelect');
  if (userZoneSel) {
    userZoneSel.addEventListener('change', () => {
      userZone = userZoneSel.value;
      updateZoneHint();
      const rf = document.getElementById('routeFrom');
      if (rf) { rf.value = userZone; syncRouteToState(); }
    });
    updateZoneHint();
  }

  const rf = document.getElementById('routeFrom');
  if (rf) {
    rf.addEventListener('change', syncRouteToState);
    syncRouteToState();
  }
}

function syncRouteToState() {
  const rf = document.getElementById('routeFrom');
  const rt = document.getElementById('routeTo');
  if (!rf || !rt) return;
  const fromVal = rf.value;
  Array.from(rt.options).forEach(opt => {
    if (opt.value && opt.value === fromVal) {
      opt.disabled = true;
    } else {
      opt.disabled = false;
    }
  });
  if (rt.value === fromVal) rt.value = '';
}

function updateZoneHint() {
  const el = document.getElementById('userZoneHint');
  if (!userZone) {
    if (el) {
      el.removeAttribute('data-i18n');
      el.textContent = `📍 ${t('not_selected')}`;
    }
    return;
  }
  const translationKey = 'hint_' + userZone.toLowerCase().replace('_', '');
  if (el) {
    el.setAttribute('data-i18n', translationKey);
    el.textContent = `📍 ${t(translationKey) !== translationKey ? t(translationKey) : userZone}`;
  }
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

function drawHeatmap(data, canvasId = 'heatmapCanvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  const W = rect.width;
  const H = rect.height;
  const isMobile = W < 450;
  const scale = isMobile ? 0.8 : 1;

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
  ctx.font = `600 ${isMobile ? 10 : 11}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(t('field'), cx, cy + (isMobile ? 3 : 4));

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

    // Node scaling
    let radius = (zoneId.startsWith('EXIT') || zoneId.startsWith('GATE') ? 16 : 22) * scale;
    if (isMobile) {
      radius = zoneId.startsWith('EXIT') || zoneId.startsWith('GATE') ? 12 : 15;
    }
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

    // Label (Inside Circle)
    ctx.fillStyle = '#ffffff'; // White text contrasts nicely with node colors
    ctx.font = `700 ${isMobile ? 8 : 10}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Shorten long labels to ensure they perfectly fit inside the radius
    let label = zoneId.replace('GATE_', 'G-');
    if (label === 'EXIT_MAIN') label = 'E-M';
    if (label === 'EXIT_EAST') label = 'E-E';
    if (label === 'EXIT_WEST') label = 'E-W';
    
    ctx.fillText(label, x, y);

    // Density percentage (Below Circle)
    ctx.fillStyle = isDark ? 'rgba(241,245,249,0.8)' : 'rgba(15,23,42,0.8)';
    ctx.font = `${isMobile ? 8 : 9}px JetBrains Mono, monospace`;
    const count = zone ? zone.headcount : Math.floor(density * 200);
    const densityLabelY = y + radius + (isMobile ? 12 : 14);
    ctx.fillText(`${(density * 100).toFixed(0)}% | ${count} ppl`, x, densityLabelY);
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
    if (crowdData) {
      drawHeatmap(crowdData);
      if (document.getElementById('fullMapOverlay').style.display === 'flex') {
        drawHeatmap(crowdData, 'fullMapCanvas');
      }
    }
  });

  // Expand button logic
  const expandBtn = document.getElementById('btnExpandMap');
  const closeFullMapBtn = document.getElementById('btnCloseFullMap');
  const fullMapOverlay = document.getElementById('fullMapOverlay');

  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      fullMapOverlay.style.display = 'flex';
      document.body.classList.add('map-expanded');
      drawHeatmap(crowdData, 'fullMapCanvas');
    });
  }

  if (closeFullMapBtn) {
    closeFullMapBtn.addEventListener('click', () => {
      fullMapOverlay.style.display = 'none';
      document.body.classList.remove('map-expanded');
    });
  }
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
    const url = currentStadium ? `${API}/api/v1/queue/all?stadium=${currentStadium}` : `${API}/api/v1/queue/all`;
    const res = await fetch(url);
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
        ${o.stadium_name || o.match_name ? `<div style="font-size:0.72rem; color:var(--accent-2); margin-bottom:3px;">🏟️ ${o.stadium_name || ''} ${o.match_name ? '• ' + o.match_name : ''}</div>` : ''}
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">${t('order_id')} ${o.order_id}</div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">${o.items.map(i => `${t(i.name)} x${i.quantity}`).join(', ')}</div>
      </div>
      <div style="text-align:right;">
        <div class="badge ${o.status === 'ready' ? 'badge-success' : o.status === 'preparing' ? 'badge-warning' : o.status === 'cancelled' ? 'badge-danger' : 'badge-info'}">${t('status_' + o.status)}</div>
        <div style="font-family:var(--font-mono); font-weight:700; color:var(--accent-4); margin-top:4px;">${t('currency')}${o.total.toFixed(2)}</div>
        <div style="font-size:0.75rem; color:var(--success); margin-top:2px;">${t('payment_paid')}</div>
        ${o.refund_status && o.refund_status !== 'none' ? `<div style="font-size:0.75rem; color:var(--accent-3); margin-top:2px;">💰 ${t('refund_status')}: ${t('refund_' + o.refund_status)}</div>` : ''}
        ${o.status === 'cancelled' && (!o.refund_status || o.refund_status === 'none') ? `<div style="font-size:0.75rem; color:var(--warning); margin-top:2px;">💰 ${t('refund_status')}: ${t('refund_pending')}</div>` : ''}
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
    const res = await fetch(`${API}/api/v1/queue/order/${orderId}/status?status=cancelled`, { method: 'PATCH' });
    const data = await res.json();
    
    if (data.error) {
       alert(data.error);
       return;
    }
    
    // Refresh history
    loadUserOrders();
  } catch (err) {
    console.error('Cancel error:', err);
  }
};

// ══════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ══════════════════════════════════════════════════════════════════
function initAuth() {
  const savedId = localStorage.getItem('cs_user_id');
  const savedIdent = localStorage.getItem('cs_user_identifier');

  if (savedId) {
    isLoggedIn = true;
    currentUserId = savedId;
    currentUserIdentifier = savedIdent;
    updateAuthUI();
    loadUserOrders();
  }

  // Header login button
  document.getElementById('headerLoginBtn').addEventListener('click', openLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Modal tab logic
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.getAttribute('data-mode');
      document.getElementById('passwordGroup').style.display = mode === 'password' ? 'block' : 'none';
      document.getElementById('otpGroup').style.display = mode === 'otp' ? 'block' : 'none';
    });
  });

  // Form submits
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });
  document.getElementById('signupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSignup();
  });
  document.getElementById('forgotForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleResetSubmit();
  });
}

function updateAuthUI() {
  const loginBtn = document.getElementById('headerLoginBtn');
  const profile = document.getElementById('userProfile');
  const displayId = document.getElementById('displayUserId');

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (profile) profile.style.display = 'flex';
    if (displayId) displayId.textContent = currentUserIdentifier;
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (profile) profile.style.display = 'none';
  }
}

window.openLogin = function() {
  closeAuthModals();
  document.getElementById('loginModal').style.display = 'flex';
};

window.openSignup = function() {
  closeAuthModals();
  document.getElementById('signupModal').style.display = 'flex';
};

window.openForgotPassword = function() {
  closeAuthModals();
  document.getElementById('forgotModal').style.display = 'flex';
};

window.closeAuthModals = function() {
  ['loginModal', 'signupModal', 'forgotModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
};

// ── Validation Helpers ──────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidMobile(mobile) {
  return /^\d{10}$/.test(mobile);
}

function showInputError(inputId, messageKey) {
  const el = document.getElementById(inputId);
  if (!el) return;
  
  el.classList.add('input-error');
  
  // Remove existing error text if any
  const existing = el.parentNode.querySelector('.error-text');
  if (existing) existing.remove();
  
  const errEl = document.createElement('span');
  errEl.className = 'error-text';
  errEl.textContent = t(messageKey);
  el.parentNode.insertBefore(errEl, el.nextSibling);
}

function clearInputErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.error-text').forEach(el => el.remove());
}

function validateIdentifier(id, identifierValue) {
  clearInputErrors();
  if (!identifierValue) return false;

  // Smarter detection: if it has letters or an '@', treat as email. Otherwise mobile.
  const isEmailAttempt = /[a-zA-Z]/.test(identifierValue) || identifierValue.includes('@');
  
  if (isEmailAttempt) {
    if (!isValidEmail(identifierValue)) {
      showInputError(id, 'invalid_email');
      alert(t('invalid_email'));
      return false;
    }
  } else {
    if (!isValidMobile(identifierValue)) {
      showInputError(id, 'invalid_mobile');
      alert(t('invalid_mobile'));
      return false;
    }
  }
  return true;
}

async function handleLogin() {
  const identifier = document.getElementById('loginIdentifier').value;
  const password = document.getElementById('loginPassword').value;
  const otp = document.getElementById('loginOtp').value;
  const mode = document.querySelector('.auth-tab.active').getAttribute('data-mode');

  if (!validateIdentifier('loginIdentifier', identifier)) return;

  try {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, otp, mode })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || 'Login failed');
      return;
    }

    const data = await res.json();
    isLoggedIn = true;
    currentUserId = data.user_id;
    currentUserIdentifier = data.identifier;

    localStorage.setItem('cs_user_id', currentUserId);
    localStorage.setItem('cs_user_identifier', currentUserIdentifier);

    updateAuthUI();
    closeAuthModals();
    loadUserOrders();
  } catch (err) {
    console.error('Login error:', err);
    alert('An unexpected error occurred during login.');
  }
}

async function handleSignup() {
  const identifier = document.getElementById('signupIdentifier').value;
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;

  if (!validateIdentifier('signupIdentifier', identifier)) return;

  try {
    const res = await fetch(`${API}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, confirm_password: confirm })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || 'Signup failed');
      return;
    }

    alert('Account created! Please login.');
    openLogin();
  } catch (err) {
    console.error('Signup error:', err);
  }
}

window.handleForgotStep1 = async function() {
  const identifier = document.getElementById('forgotIdentifier').value;
  if (!validateIdentifier('forgotIdentifier', identifier)) return;
  try {
    const res = await fetch(`${API}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });

    if (!res.ok) {
      alert('User not found');
      return;
    }

    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
  } catch (err) {
    console.error('Forgot error:', err);
  }
};

async function handleResetSubmit() {
  const identifier = document.getElementById('forgotIdentifier').value;
  const reset_code = document.getElementById('forgotCode').value;
  const new_password = document.getElementById('forgotNewPassword').value;

  try {
    const res = await fetch(`${API}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, reset_code, new_password })
    });

    if (!res.ok) {
      alert('Invalid code or error');
      return;
    }

    alert('Password reset successful! Please login.');
    openLogin();
  } catch (err) {
    console.error('Reset error:', err);
  }
}

function handleLogout() {
  localStorage.removeItem('cs_user_id');
  localStorage.removeItem('cs_user_identifier');
  sessionStorage.removeItem('cs_user_id');
  sessionStorage.removeItem('cs_user_identifier');
  
  // Refresh the page but KEEP seat/zone URL params for stadium navigation
  window.location.reload();
}

async function loadUserOrders() {
  if (!isLoggedIn || !currentUserId) return;
  try {
    const res = await fetch(`${API}/api/v1/queue/user-orders/${currentUserId}`);
    userOrders = await res.json();
    renderOrders();
  } catch (err) {
    console.error('Failed to load user orders:', err);
  }
}

// ══════════════════════════════════════════════════════════════════
// ORDER MODAL
// ══════════════════════════════════════════════════════════════════
function openOrderModal(stallId) {
  orderStallId = stallId;
  orderCart = {};
  const stall = stallsData.find(s => s.stall_id === stallId);
  if (!stall) return;

  // Guest Check
  if (!isLoggedIn) {
    alert(t('error_login_required') || 'Please login to place order');
    openLogin();
    return;
  }

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
            <span class="menu-item-price">${t('currency')}${offer.combo_price.toFixed(2)}</span>
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
      <span>${t(i.name)} x${i.quantity}</span>
      <span>${t('currency')}${(i.price * i.quantity).toFixed(2)}</span>
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
          body: JSON.stringify({ 
            stall_id: stallId, 
            items, 
            user_name: currentUserIdentifier || 'Guest', 
            user_id: currentUserId,
            discount_applied: discountAmount,
            stadium_name: currentStadium ? STADIUM_LIST.find(s => s.id === currentStadium)?.name : null,
            match_name: currentMatch || null
          }),
        });
        const order = await res.json();
        
        if (order.error) {
          alert(order.error);
          return;
        }

        userOrders.unshift(order);
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
    const url = currentStadium ? `${API}/api/v1/stalls?stadium=${currentStadium}` : `${API}/api/v1/stalls`;
    const res = await fetch(url);
    stallsData = await res.json();
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

    const menuHtml = stall.menu.map(item =>
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
        <div class="zone-hint" style="margin-bottom:10px;">📍 ${stall.zone_id} – ${t(stall.location_hint)}</div>
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
    const url = currentStadium ? `${API}/api/v1/help?stadium=${currentStadium}` : `${API}/api/v1/help`;
    const res = await fetch(url);
    helpData = await res.json();
  } catch { helpData = []; }
}

async function loadFacilities() {
  try {
    const url = currentStadium ? `${API}/api/v1/facilities/water?stadium=${currentStadium}` : `${API}/api/v1/facilities/water`;
    const res = await fetch(url);
    // Logic for facilities might be handled per-request in openWaterSection
  } catch { }
}

function initStadiumSelection() {
  const container = document.getElementById('stadiumList');
  if (!container) return;
  
  container.innerHTML = STADIUM_LIST.map(stadium => `
    <div class="card clickable-card stadium-card" onclick="selectStadium('${stadium.id}')">
      <div class="card-title" data-i18n="${stadium.id}">${stadium.name}</div>
      <div class="card-subtitle" data-i18n="${stadium.city}">${t(stadium.city)}</div>
    </div>
  `).join('');
  
  // IMMEDIATELY apply translations to the newly created card elements
  applyTranslations();
}

window.selectStadium = async function(stadiumId) {
  currentStadium = stadiumId;
  currentMatch = getCurrentMatch(stadiumId);
  currentSeat = null;
  currentZone = null;
  localStorage.setItem('cs-selected-stadium', stadiumId);
  
  await refreshContextData();
};

window.changeStadium = function() {
  currentStadium = null;
  currentMatch = null;
  currentSeat = null;
  currentZone = null;
  localStorage.removeItem('cs-selected-stadium');
  
  document.getElementById('contextBar').style.display = 'none';
  switchSection('stadium-selection');
};

function renderHelp() {
  const grid = document.getElementById('helpGrid');
  if (!grid) return;

  const typeIcons = { medical: '🏥', first_aid: '🩹', info_desk: 'ℹ️' };
  const typeLabels = { medical: t('help_medical'), first_aid: t('help_first_aid'), info_desk: t('help_info_desk') };

  let html = helpData.map(loc => `
    <div class="card help-card">
      <div class="help-icon">${typeIcons[loc.type] || '📍'}</div>
      <div>
        <div class="card-title" style="margin-bottom:4px;">${t(loc.name)}</div>
        <span class="badge badge-info">${typeLabels[loc.type] || loc.type}</span>
        <div class="zone-hint" style="margin-top:6px;">📍 ${t('label_zone')} ${loc.zone_id}</div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-top:6px;">${t(loc.description)}</p>
        ${loc.phone ? `<a href="tel:${loc.phone}" class="help-phone">📞 ${t('help_call')} ${loc.phone}</a>` : ''}
        <button class="btn btn-secondary" style="margin-top:8px; width:100%;" onclick="navigateToStall('${loc.zone_id}')">${t('help_navigate')}</button>
      </div>
    </div>
  `).join('');

  // Add Water Card
  html += `
    <div class="card help-card" style="border: 2px solid var(--accent-4); background: var(--bg-card);">
      <div class="help-icon">💧</div>
      <div>
        <div class="card-title" style="margin-bottom:4px;">${t('help_water')}</div>
        <span class="badge" style="background: var(--accent-4); color: white;">${t('help_facility') || 'Facility'}</span>
        <div class="zone-hint" style="margin-top:6px;">📍 ${t('help_multiple_locations') || 'Multiple Locations'}</div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-top:6px;">${t('help_water_desc') || 'Stay hydrated! Find free purified drinking water points near you.'}</p>
        <button class="btn btn-primary" style="margin-top:8px; width:100%; background: var(--accent-4); border:none;" onclick="openWaterSection()">${t('help_water')}</button>
      </div>
    </div>
  `;

  grid.innerHTML = html;
}

window.openWaterSection = async function() {
  const section = document.getElementById('waterSection');
  if (!section) return;

  try {
    // Load all water points
    const res = await fetch(`${API}/api/v1/facilities/water`);
    waterPointsData = await res.json();

    // Load nearest
    const nearestRes = await fetch(`${API}/api/v1/facilities/water/nearest/${userZone}`);
    nearestWaterData = await nearestRes.json();

    renderWaterGrid();

    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('Failed to load water points:', err);
  }
};

function renderWaterGrid() {
  const grid = document.getElementById('waterGrid');
  if (!grid) return;

  grid.innerHTML = waterPointsData.map(wp => {
    const isNearest = nearestWaterData && wp.id === nearestWaterData.id;
    return `
      <div class="card" style="${isNearest ? 'border: 2px solid var(--accent-4); transform: scale(1.02); box-shadow: var(--shadow-lg);' : ''}">
        ${isNearest ? `<div style="background: var(--accent-4); color:white; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px; margin-bottom:8px; display:inline-block;">${t('water_recommended')}</div>` : ''}
        <div class="card-title" style="font-size:1rem;">🚰 ${t(wp.name)}</div>
        <div class="zone-hint" style="margin:8px 0;">📍 ${t('stalls_zone')} ${wp.zone}</div>
        ${wp.nearby_landmark ? `<p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">📍 ${t(wp.nearby_landmark)}</p>` : ''}
        <button class="btn btn-secondary btn-sm w-100" onclick="navigateToLocation('${wp.zone}')">${t('get_route')}</button>
      </div>
    `;
  }).join('');
}

window.closeWaterSection = function() {
  document.getElementById('waterSection').style.display = 'none';
};

window.navigateToLocation = function(zoneId) {
  // Use existing routing UI
  document.getElementById('routeFrom').value = userZone;
  document.getElementById('routeTo').value = zoneId;
  switchSection('routes');
  findRoute();
};

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
