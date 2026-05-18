const API_KEY = '38eee32788cbe019ade5c13ae12af828';

/* --SPLASH HIDE (CSS animation fallback)-- */
setTimeout(() => {
  const sp = document.getElementById('splash');
  if (sp) sp.classList.add('hidden');
}, 3800);

/* --STARS-- */
(function initStars() {
  const layer = document.getElementById('starsLayer');
  for (let i = 0; i < 100; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random() * 1.8 + 0.5;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random() * 100}%;left:${Math.random() * 100}%;--dur:${2 + Math.random() * 4}s;--del:${Math.random() * 6}s;`;
    layer.appendChild(s);
  }
})();

/* --WEATHER BACKGROUND EFFECTS-- */
function makeClouds(n = 5) {
  const w = document.getElementById('cloudWrap');
  w.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'wx-cloud';
    const cw = 100 + Math.random() * 180, ch = cw * 0.35,
      top = 5 + Math.random() * 40, dur = 30 + Math.random() * 40,
      del = -(Math.random() * dur), op = 0.03 + Math.random() * 0.07;
    c.style.cssText = `width:${cw}px;height:${ch}px;top:${top}%;border-radius:${ch}px;opacity:${op};animation-duration:${dur}s;animation-delay:${del}s;`;
    w.appendChild(c);
  }
}
makeClouds();

function makeRain(n = 70) {
  const w = document.getElementById('rainWrap');
  w.innerHTML = '';
  w.style.display = 'block';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'raindrop';
    const h = 10 + Math.random() * 18;
    d.style.cssText = `left:${Math.random() * 100}%;height:${h}px;animation-duration:${0.5 + Math.random() * 0.5}s;animation-delay:${Math.random()}s;opacity:${0.4 + Math.random() * 0.5};`;
    w.appendChild(d);
  }
}

function stopRain() {
  document.getElementById('rainWrap').style.display = 'none';
}

function makeSnow(n = 50) {
  const w = document.getElementById('snowWrap');
  w.innerHTML = '';
  w.style.display = 'block';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'snowflake';
    const sz = 2 + Math.random() * 4, drift = (Math.random() - 0.5) * 70;
    s.style.cssText = `left:${Math.random() * 100}%;width:${sz}px;height:${sz}px;--drift:${drift}px;animation-duration:${3 + Math.random() * 5}s;animation-delay:${Math.random() * 5}s;`;
    w.appendChild(s);
  }
}

function stopSnow() {
  document.getElementById('snowWrap').style.display = 'none';
}

/* --Weather condition → effect lookup table-- */
const WX = {
  Clear:        { clouds: 2,  rain: false, snow: false, thunder: false },
  Clouds:       { clouds: 9,  rain: false, snow: false, thunder: false },
  Rain:         { clouds: 11, rain: true,  snow: false, thunder: false },
  Drizzle:      { clouds: 7,  rain: true,  snow: false, thunder: false, lite: true },
  Thunderstorm: { clouds: 12, rain: true,  snow: false, thunder: true },
  Snow:         { clouds: 6,  rain: false, snow: true,  thunder: false },
  Mist:         { clouds: 12, rain: false, snow: false, thunder: false },
  Haze:         { clouds: 5,  rain: false, snow: false, thunder: false }
};

function applyWx(main) {
  const t = WX[main] || WX.Clouds;
  makeClouds(t.clouds);
  if (t.rain) makeRain(t.lite ? 30 : 70); else stopRain();
  if (t.snow) makeSnow(); else stopSnow();
  document.getElementById('wxThunder').style.display = t.thunder ? 'block' : 'none';
}

/* --LEAFLET MAP SETUP--*/
const TILES = {
  osm:       { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                          attr: '© OpenStreetMap', maxZoom: 19 },
  dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                               attr: '© CARTO',         maxZoom: 19, sub: 'abcd' },
  topo:      { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                            attr: '© OpenTopoMap',   maxZoom: 17 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri',           maxZoom: 18 }
};

const map = L.map('map', { center: [20, 10], zoom: 2 });
let curTile = null;

function setTileLayer(k, btn) {
  if (curTile) map.removeLayer(curTile);
  const c = TILES[k];
  curTile = L.tileLayer(c.url, { attribution: c.attr, maxZoom: c.maxZoom || 19, subdomains: c.sub || 'abc' }).addTo(map);
  document.querySelectorAll('.map-style-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
setTileLayer('osm', document.querySelector('.map-style-btn.active'));

map.on('click', e => fetchByCoords(e.latlng.lat, e.latlng.lng));
map.getContainer().style.cursor = 'crosshair';

function fullExtent() {
  map.flyTo([20, 10], 2, { duration: 1.4 });
  if (activeMarker) { activeMarker.remove(); activeMarker = null; }
  document.getElementById('dash').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('cityInput').value = '';
  makeClouds(5); stopRain(); stopSnow();
  document.getElementById('wxThunder').style.display = 'none';
  lastWx = null;
  document.getElementById('mobPeekCard').classList.remove('visible');
  document.getElementById('peekHint').classList.remove('visible');
  if (mobOpen) closeMobileSidebar();
  toast('🌐 Map reset to full extent', 'ok');
}

/* --MAP MARKER-- */
let activeMarker = null;

function placeMarker(lat, lon, temp, name) {
  if (activeMarker) { activeMarker.remove(); activeMarker = null; }
  const { color } = tempStyle(temp);
  const t = Math.round(temp);
  const html = `<div class="mk-wrap"><div class="mk-bubble" style="border-color:${color};color:${color};box-shadow:0 0 12px ${color}55;">${t}°C<span style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:${color};display:block;width:0;height:0;"></span></div><div class="mk-pin" style="background:${color};box-shadow:0 0 6px ${color};width:3px;height:12px;border-radius:2px;"></div></div>`;
  const icon = L.divIcon({ html, className: '', iconAnchor: [0, 40], popupAnchor: [0, -44] });
  activeMarker = L.marker([lat, lon], { icon })
    .bindPopup(`<b>${name}</b><br/>${t}°C · ${EMOJI[lastWx?.weather?.[0]?.main] || '🌡️'}`)
    .addTo(map).openPopup();
  map.flyTo([lat, lon], Math.max(map.getZoom(), 9), { duration: 1.4 });
}

/* --SEARCH AUTOCOMPLETE-- */
let sugTimer = null, sugActive = -1, sugItems = [];

function onSearchInput() {
  const v = document.getElementById('cityInput').value.trim();
  clearTimeout(sugTimer);
  if (v.length < 2) { hideSug(); return; }
  sugTimer = setTimeout(() => fetchSug(v), 350);
}

async function fetchSug(q) {
  showSugLoad();
  try {
    const r = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${API_KEY}`);
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) { hideSug(); return; }
    sugItems = data; sugActive = -1;
    const box = $('suggestions');
    box.innerHTML = '';
    data.forEach((item, i) => {
      const d = document.createElement('div');
      d.className = 'sug-item';
      d.dataset.idx = i;
      const st = item.state ? `, ${item.state}` : '';
      d.innerHTML = `<span class="sug-pin">📍</span><span class="sug-name">${item.name}${st}</span><span class="sug-country">${item.country}</span>`;
      d.onmousedown = () => selSug(i);
      box.appendChild(d);
    });
    box.classList.add('show');
  } catch { hideSug(); }
}

function showSugLoad() {
  const b = $('suggestions');
  b.innerHTML = `<div class="sug-loading"><div class="sug-dot"></div><div class="sug-dot"></div><div class="sug-dot"></div> Searching…</div>`;
  b.classList.add('show');
}

function hideSug() {
  $('suggestions').classList.remove('show');
  sugActive = -1;
}

function selSug(i) {
  const item = sugItems[i];
  if (!item) return;
  $('cityInput').value = item.name;
  hideSug();
  fetchByCoords(item.lat, item.lon, item.name);
}

function onSearchKey(e) {
  const items = document.querySelectorAll('.sug-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    sugActive = Math.min(sugActive + 1, items.length - 1);
    items.forEach((el, i) => el.classList.toggle('active', i === sugActive));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    sugActive = Math.max(sugActive - 1, 0);
    items.forEach((el, i) => el.classList.toggle('active', i === sugActive));
  } else if (e.key === 'Enter') {
    if (sugActive >= 0 && items[sugActive]) items[sugActive].dispatchEvent(new MouseEvent('mousedown'));
    else searchCity();
    hideSug();
  } else if (e.key === 'Escape') {
    hideSug();
  }
}

document.addEventListener('click', e => {
  if (!$('searchBox').contains(e.target)) hideSug();
});

/* --CHART (Chart.js)-- */
let fChart = null, fData = null, chartType = 'temp';

function buildDataset(type) {
  if (!fData) return { labels: [], data: [], color: '#7c5cfc', label: '—' };
  const sl = fData.slice(0, 16);
  const labels = sl.map(i => {
    const d = new Date(i.dt * 1000);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
  });
  let data, color, label;
  switch (type) {
    case 'temp':     data = sl.map(i => Math.round(i.main.temp));       color = '#fbbf24'; label = 'Temp °C';    break;
    case 'rain':     data = sl.map(i => Math.round((i.pop || 0) * 100)); color = '#60a5fa'; label = 'Rain %';     break;
    case 'humidity': data = sl.map(i => i.main.humidity);               color = '#00d4ff'; label = 'Humidity %'; break;
    case 'wind':     data = sl.map(i => Math.round(i.wind.speed * 3.6)); color = '#34d399'; label = 'Wind km/h';  break;
  }
  return { labels, data, color, label };
}

function renderChart(type) {
  const { labels, data, color, label } = buildDataset(type);
  const ctx = $('forecastChart').getContext('2d');
  if (fChart) { fChart.destroy(); fChart = null; }
  fChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label, data,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,18,48,.97)',
          borderColor: 'rgba(255,255,255,.1)',
          borderWidth: 1,
          titleColor: '#e8eeff',
          bodyColor: color,
          titleFont: { family: 'DM Mono', size: 9 },
          bodyFont:  { family: 'DM Mono', size: 11 }
        }
      },
      scales: {
        x: { ticks: { color: '#3d4f7a', font: { family: 'DM Mono', size: 8 }, maxRotation: 40, minRotation: 25 }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#3d4f7a', font: { family: 'DM Mono', size: 8 } },                                   grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

function switchChart(type, btn) {
  chartType = type;
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChart(type);
}

/* --5-DAY FORECAST RENDERER-- */
function renderDaily(list) {
  const days = {};
  list.forEach(i => {
    const k = i.dt_txt.split(' ')[0];
    if (!days[k]) days[k] = [];
    days[k].push(i);
  });
  const todayKey = new Date().toISOString().split('T')[0];
  const grid = $('dailyGrid');
  grid.innerHTML = '';
  Object.entries(days).slice(0, 7).forEach(([ds, items]) => {
    const temps = items.map(i => i.main.temp);
    const maxT = Math.round(Math.max(...temps)), minT = Math.round(Math.min(...temps));
    const pop = Math.round(Math.max(...items.map(i => i.pop || 0)) * 100);
    const mid = items.find(i => i.dt_txt.includes('12:00')) || items[Math.floor(items.length / 2)];
    const emoji = EMOJI[mid.weather[0].main] || '🌡️', desc = mid.weather[0].description;
    const d = new Date(ds + 'T12:00:00'), dayName = ds === todayKey ? 'Today' : d.toLocaleDateString('en', { weekday: 'short' });
    const barW = Math.min(100, Math.max(8, Math.round((maxT + 10) / 55 * 100)));
    const row = document.createElement('div');
    row.className = 'daily-row';
    row.innerHTML = `<span class="d-day${ds === todayKey ? ' today' : ''}">${dayName}</span><span class="d-ico">${emoji}</span><span class="d-desc">${desc}</span><span class="d-pop">${pop > 0 ? '💧' + pop + '%' : ''}</span><span class="d-temps"><span class="d-max">${maxT}°</span><span class="d-min"> /${minT}°</span></span><div class="d-bar-wrap"><div class="d-bar" style="width:${barW}%"></div></div>`;
    grid.appendChild(row);
  });
}

/* --API CALLS-- */
function searchCity() {
  const city = $('cityInput').value.trim();
  if (!city) { toast('Enter a city name.', 'warn'); return; }
  hideSug();
  fetchByCityName(city);
}

async function fetchByCityName(name) {
  loaderTxt('Fetching "' + name + '"…');
  showLoader(true);
  try {
    const [wR, fR] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(name)}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(name)}&appid=${API_KEY}&units=metric`)
    ]);
    const w = await wR.json(), f = await fR.json();
    if (Number(w.cod) !== 200) throw new Error(w.message || 'City not found');
    renderDash(w, f.list || []);
    addHist(name);
    toast(`✅ ${w.name}, ${w.sys.country}`, 'ok');
  } catch (e) {
    toast('❌ ' + e.message, 'error');
  } finally {
    showLoader(false);
  }
}

async function fetchByCoords(lat, lon, hint) {
  loaderTxt('Fetching weather…');
  showLoader(true);
  try {
    const [wR, fR] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
    ]);
    const w = await wR.json(), f = await fR.json();
    if (Number(w.cod) !== 200) throw new Error(w.message || 'Not found');
    renderDash(w, f.list || []);
    $('cityInput').value = hint || w.name;
    addHist(hint || w.name);
    toast(`✅ ${w.name}, ${w.sys.country}`, 'ok');
    if (window.innerWidth <= 768) openMobileSidebar();
  } catch (e) {
    toast('❌ ' + e.message, 'error');
  } finally {
    showLoader(false);
  }
}

/* --DASHBOARD RENDERER-- */
let lastWx = null;

function renderDash(d, fList) {
  lastWx = d; fData = fList;
  const temp = d.main.temp, st = tempStyle(temp), wxMain = d.weather[0].main;
  placeMarker(d.coord.lat, d.coord.lon, temp, d.name);
  applyWx(wxMain);
  $('emptyState').style.display = 'none';
  $('dash').style.display = 'flex';

  /* --Hero card-- */
  $('hero').style.background = st.bg;
  set('hCity',    d.name);
  set('hCountry', d.sys.country + ' · ' + d.weather[0].main.toUpperCase());
  set('hTime',    'Local ' + localTime(Math.floor(Date.now() / 1000), d.timezone));
  set('hEmoji',   EMOJI[wxMain] || '🌡️');
  set('hTemp',    Math.round(temp));
  set('hBadge',   st.label);
  set('hDesc',    d.weather[0].description);
  set('hFeels',   'Feels like ' + Math.round(d.main.feels_like) + '°C');

  /* --Stats-- */
  set('cHumidity', d.main.humidity + '%');
  set('cWind',     Math.round(d.wind.speed * 3.6) + ' km/h');
  set('cPressure', d.main.pressure + ' hPa');
  set('cVis',      d.visibility != null ? (d.visibility / 1000).toFixed(1) + ' km' : 'N/A');
  set('cClouds',   d.clouds.all + '%');
  set('cMinMax',   Math.round(d.main.temp_min) + '°/' + Math.round(d.main.temp_max) + '°');

  /* --Wind-- */
  set('wSpeed', Math.round(d.wind.speed * 3.6) + ' km/h (' + d.wind.speed + ' m/s)');
  set('wDir',   d.wind.deg + '° ' + deg2dir(d.wind.deg));
  set('wGust',  d.wind.gust != null ? Math.round(d.wind.gust * 3.6) + ' km/h' : 'N/A');

  /* --Coordinates-- */
  set('coLat',     d.coord.lat.toFixed(5) + '°');
  set('coLon',     d.coord.lon.toFixed(5) + '°');
  set('coCountry', d.sys.country);

  /* --Raw JSON-- */
  $('rawBox').textContent = JSON.stringify(d, null, 2);

  /* --Chart & daily forecast-- */
  if (fList.length > 0) { renderChart(chartType); renderDaily(fList); }

  /* --Mobile peek card-- */
  set('peekCity', d.name);
  set('peekCond', d.weather[0].description);
  set('peekEmoji', EMOJI[wxMain] || '🌡️');
  set('peekTemp', Math.round(temp));
  if (window.innerWidth <= 768) {
    $('mobPeekCard').classList.add('visible');
    $('peekHint').classList.add('visible');
  }
}

/* --MOBILE SIDEBAR (BOTTOM SHEET)-- */
let mobOpen = false;

function openMobileSidebar() {
  mobOpen = true;
  $('sidebar').classList.add('mob-open');
  $('mobPeekCard').classList.remove('visible');
  $('peekHint').classList.remove('visible');
}

function closeMobileSidebar() {
  mobOpen = false;
  $('sidebar').classList.remove('mob-open');
  if (lastWx && window.innerWidth <= 768) {
    $('mobPeekCard').classList.add('visible');
    $('peekHint').classList.add('visible');
  }
}

function toggleMobileSidebar() {
  if (mobOpen) closeMobileSidebar(); else openMobileSidebar();
}

/* --Swipe down to close-- */
let touchY = 0;
$('sidebar').addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
$('sidebar').addEventListener('touchend',   e => { if (e.changedTouches[0].clientY - touchY > 55) closeMobileSidebar(); }, { passive: true });

/* --SEARCH HISTORY-- */
let hist = [];

function addHist(city) {
  hist = hist.filter(c => c.toLowerCase() !== city.toLowerCase());
  hist.unshift(city);
  if (hist.length > 5) hist.pop();
  const row = $('histRow');
  row.innerHTML = '';
  hist.forEach(c => {
    const t = document.createElement('div');
    t.className = 'hist-tag';
    t.textContent = c;
    t.onclick = () => { $('cityInput').value = c; searchCity(); };
    row.appendChild(t);
  });
}

/* --UTILITY HELPERS-- */

/* --Weather condition → emoji-- */
const EMOJI = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Smoke: '🌫️',
  Haze: '🌫️', Dust: '🌪️', Fog: '🌫️', Tornado: '🌪️', Squall: '💨'
};

/* --Temperature → colour, label, hero gradient-- */
function tempStyle(t) {
  if (t <  0) return { color: '#3b82f6', label: '❄ FREEZING', bg: 'linear-gradient(135deg,rgba(14,30,80,0.9),rgba(29,78,216,0.85))' };
  if (t < 10) return { color: '#60a5fa', label: '🥶 COLD',    bg: 'linear-gradient(135deg,rgba(14,30,80,0.9),rgba(37,99,235,0.85))' };
  if (t < 20) return { color: '#10b981', label: '🌿 MILD',    bg: 'linear-gradient(135deg,rgba(2,30,14,0.9),rgba(5,150,105,0.85))' };
  if (t < 30) return { color: '#f59e0b', label: '☀ WARM',     bg: 'linear-gradient(135deg,rgba(28,15,2,0.9),rgba(217,119,6,0.85))' };
  return             { color: '#ef4444', label: '🔥 HOT',      bg: 'linear-gradient(135deg,rgba(31,4,4,0.9),rgba(220,38,38,0.85))' };
}

/* --UTC offset → local time string-- */
function localTime(unix, tz) {
  const d = new Date((unix + tz) * 1000);
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
}

/* --Wind degrees → compass direction-- */
function deg2dir(d) {
  return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(d / 22.5) % 16];
}

/* --DOM shorthand-- */
function $(id)       { return document.getElementById(id); }
function set(id, v)  { const e = $(id); if (e) e.textContent = v; }

/* --Loader-- */
function showLoader(v)  { $('loader').classList.toggle('show', v); }
function loaderTxt(t)   { $('loaderTxt').textContent = t; }

/* --Toast notification-- */
function toast(msg, type = 'error') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3200);
}

/* --Raw JSON toggle-- */
let rawOpen = false;
function toggleRaw() {
  rawOpen = !rawOpen;
  $('rawBox').classList.toggle('open', rawOpen);
  document.querySelector('.raw-toggle').textContent = rawOpen ? 'Hide' : 'Show';
}
