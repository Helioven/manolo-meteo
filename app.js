'use strict';
const LAT = 37.8795, LON = -4.7803, ZONE = 'Europe/Madrid';
const API = 'https://api.open-meteo.com/v1/forecast';
const CACHE_KEY = 'manolo-meteo-forecast-v1-6-1';
const el = id => document.getElementById(id);
const state = { data: null, selected: 0, demo: false, demoWeather: 'clear', demoTime: 'day' };
const localeDate = (date, options) => new Intl.DateTimeFormat('es-ES', { ...options, timeZone: ZONE }).format(new Date(`${date}T12:00:00+02:00`));

function weather(code, night = false) {
  if (code === 0) return { icon: night ? '☾' : '☀', label: 'Despejado' };
  if ([1, 2].includes(code)) return { icon: night ? '☁︎' : '⛅', label: 'Poco nuboso' };
  if (code === 3) return { icon: '☁︎', label: 'Nublado' };
  if ([45, 48].includes(code)) return { icon: '≋', label: 'Niebla' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: '☂', label: 'Llovizna' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧', label: 'Lluvia' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄', label: 'Nieve' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈', label: 'Tormentas' };
  return { icon: '☁', label: 'Variable' };
}
function weatherTheme(code) {
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([61, 63, 65, 66, 67, 80, 81, 82, 51, 53, 55, 56, 57].includes(code)) return 'rain';
  if ([45, 48].includes(code)) return 'fog';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if (code === 3) return 'cloudy';
  if ([1, 2].includes(code)) return 'partly';
  return 'clear';
}
function getCórdobaHour() {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: ZONE }).format(new Date()));
}
function timeTheme(hour) {
  if (hour < 6) return 'night';
  if (hour < 9) return 'morning';
  if (hour < 18) return 'day';
  if (hour < 21) return 'sunset';
  return 'night';
}
function applyTheme(code) {
  const body = document.body;
  body.dataset.time = state.demo ? state.demoTime : timeTheme(getCórdobaHour());
  body.dataset.weather = state.demo ? state.demoWeather : weatherTheme(code);
  body.classList.toggle('demo-active', state.demo);
  el('hero-visual-note').textContent = state.demo ? 'VISTA SIMULADA · SOLO EFECTOS' : '';
  const summary = el('demo-summary');
  summary.hidden = !state.demo;
  if (state.demo) {
    const labels = {clear:'Despejado',partly:'Poco nuboso',cloudy:'Nublado',rain:'Lluvia',storm:'Tormenta',fog:'Niebla',snow:'Nieve'};
    const periods = {morning:'Amanecer',day:'Día',sunset:'Atardecer',night:'Noche'};
    el('demo-summary-title').textContent = `SIMULACIÓN: ${labels[state.demoWeather]} · ${periods[state.demoTime]}`;
  }
}
function refreshVisualTheme() {
  if (!state.data) return;
  const d = state.data.daily;
  const code = state.selected === 0 ? (state.data.current?.weather_code ?? d.weather_code[0]) : d.weather_code[state.selected];
  applyTheme(code);
}

function rounded(value, suffix = '°') { return Number.isFinite(value) ? Math.round(value) + suffix : '—'; }
function dateHeading(day) { return localeDate(day, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, x => x.toUpperCase()); }
function dayShort(day) { return localeDate(day, { weekday: 'short', day: 'numeric' }).replace('.', ''); }

function dayHours(day) {
  const h = state.data.hourly;
  const result = [];
  for (let i = 0; i < h.time.length; i++) {
    if (h.time[i].startsWith(day + 'T')) result.push({
      hour: +h.time[i].slice(11, 13),
      temp: h.temperature_2m[i],
      rain: h.precipitation_probability[i],
      code: h.weather_code[i],
      humidity: h.relative_humidity_2m[i],
      wind: h.wind_speed_10m[i],
      uv: h.uv_index[i]
    });
  }
  return result;
}
function hashSeed(text) { return [...text].reduce((n, ch) => n + ch.charCodeAt(0), 0); }
function pickVariant(text, list) { return list[hashSeed(text) % list.length]; }
function dayPartLabel(hour) {
  if (hour < 12) return 'por la mañana';
  if (hour < 15) return 'al mediodía';
  if (hour < 18) return 'por la tarde';
  if (hour < 21) return 'al atardecer';
  return 'por la noche';
}
function bestWindowFromHours(hours) {
  if (!hours.length) return 'a media tarde';
  const candidates = hours.filter(h => h.hour >= 8 && h.hour <= 22).map(h => ({
    ...h,
    score: (100 - Math.min(h.rain, 100)) + (30 - Math.abs(22 - h.temp) * 2) - Math.max(h.wind - 18, 0)
  }));
  const best = candidates.sort((a, b) => b.score - a.score)[0] || hours[Math.floor(hours.length / 2)];
  return `${String(best.hour).padStart(2, '0')}:00 (${dayPartLabel(best.hour)})`;
}
function practicalText({ rain, high, low, wind, code, bestWindow }) {
  if ([95, 96, 99].includes(code)) return 'Mejor plan bajo techo. Si tienes que salir, revisa antes los avisos oficiales y evita confiarte.';
  if (rain >= 65) return 'Llévate paraguas y calzado que no sufra. Mejor evita las horas con más precipitación si puedes.';
  if (rain >= 30) return `Puede escaparse un chaparrón. Si sales, el mejor margen parece ${bestWindow}.`;
  if (high >= 33) return `Busca sombra y agua. Lo más amable del día será ${bestWindow}, no la hora del castigo solar.`;
  if (high >= 29) return `Se puede hacer vida normal, pero la mejor franja para terraza o paseo es ${bestWindow}.`;
  if (low <= 6) return `Abrigo ligero por la mañana y luego te sobrarán capas. Lo más agradable llegará ${bestWindow}.`;
  if (wind >= 35) return `Elige una terraza resguardada. Para caminar, mejor ${bestWindow}, cuando se note menos el aire.`;
  return `Día cómodo en general. Si quieres elegir momento, vete a ${bestWindow} y quedas como un estratega del clima.`;
}
function chooseAdvice(index) {
  const d = state.data.daily;
  const day = d.time[index];
  const rain = d.precipitation_probability_max[index] ?? 0;
  const high = d.temperature_2m_max[index] ?? 0;
  const low = d.temperature_2m_min[index] ?? 0;
  const code = d.weather_code[index];
  const wind = d.wind_speed_10m_max[index] ?? 0;
  const hours = dayHours(day);
  const bestWindow = bestWindowFromHours(hours);

  const groups = {
    storm: [
      'Hoy el cielo viene en modo Manuel Tormenta con doble bombo. ⛈️ No es día para improvisar aventuras.',
      'Si el cielo tuviera batería, hoy la estaría aporreando. ⛈️ Mejor prudencia y techo cerca.',
      'Esto no es nubecita simpática: pinta a día de respeto meteorológico. ⛈️'
    ],
    rainy: [
      'Paraguas, tío. Hoy el cielo parece que ha decidido hacer limpieza general. ☔',
      'Día de paraguas con contrato indefinido. ☔ Mejor llevarlo que hacer el héroe.',
      'La nube viene con ganas. Hoy el look oficial es paraguas en mano. ☔'
    ],
    mixed: [
      'Puede haber sorpresas. No parece un diluvio, pero Córdoba también sabe trolear de vez en cuando. 🌦️',
      'No es drama meteorológico, pero sí día de “por si acaso”. 🌦️',
      'El cielo está en modo indeciso. Mejor ir con un plan B ligero. 🌦️'
    ],
    hot: [
      'El verano no quiere recoger las maletas. 😂 Córdoba le ha dado una semana extra.',
      'Treinta y pico en octubre: el otoño ha pedido una excedencia. 😅',
      'El calendario dice otoño; el termómetro se está riendo. ☀️😂'
    ],
    breezy: [
      'Hoy hay viento de sobra para peinar a toda una banda de glam metal. 🤘',
      'Si sales, que no te sorprenda el aire: hoy la melena cotiza al alza. 🌬️',
      'Día ventoso. Si llevas peinado serio, despídete de él. 🌬️😂'
    ],
    chilly: [
      'Abrígate al madrugar, lobo. 🧥 El heroísmo térmico no da puntos extra.',
      'Mañana fresquita: café, chaqueta y dignidad. ☕🧥',
      'A primera hora apetece más manga larga que épica innecesaria. 🧥'
    ],
    mild: [
      'Terraza aprobada por el comité meteorológico de Manolo. ☕😎',
      'Día muy apañado. Si no disfrutas hoy una terraza, ya me dirás cuándo. 😎',
      'El cielo hoy te está dando permiso oficial para callejear sin drama. 😎'
    ]
  };

  let type = 'mild';
  if ([95, 96, 99].includes(code)) type = 'storm';
  else if (rain >= 65) type = 'rainy';
  else if (rain >= 30) type = 'mixed';
  else if (high >= 30) type = 'hot';
  else if (wind >= 35) type = 'breezy';
  else if (low <= 5 || high <= 14) type = 'chilly';

  const pillMap = {
    storm: { text: 'Precaución', className: 'advice-pill advice-pill--danger' },
    rainy: { text: 'Paraguas', className: 'advice-pill advice-pill--rain' },
    mixed: { text: 'Variable', className: 'advice-pill advice-pill--mix' },
    hot: { text: 'Calorcito', className: 'advice-pill advice-pill--warm' },
    breezy: { text: 'Viento', className: 'advice-pill advice-pill--mix' },
    chilly: { text: 'Chaqueta', className: 'advice-pill advice-pill--cold' },
    mild: { text: 'Terraza', className: 'advice-pill advice-pill--ok' }
  };

  return {
    text: pickVariant(`${day}-${type}`, groups[type]),
    practical: practicalText({ rain, high, low, wind, code, bestWindow }),
    pill: pillMap[type]
  };
}
function chart(points) {
  if (!points.length) return 'Sin datos horarios disponibles para esta fecha.';
  const samples = points.filter(p => p.hour % 3 === 2 || p.hour % 3 === 0);
  const values = samples.length ? samples : points;
  const W = 600, H = 172, L = 30, R = 16, T = 15, B = 32;
  let mn = Math.min(...values.map(x => x.temp)) - 2, mx = Math.max(...values.map(x => x.temp)) + 2;
  if (mx <= mn) mx = mn + 1;
  const x = i => L + i * (W - L - R) / Math.max(values.length - 1, 1), y = v => T + (mx - v) * (H - T - B) / (mx - mn);
  const path = values.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.temp).toFixed(1)).join(' ');
  const line = values.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.temp)}" r="3.5" fill="#ffbd78"/>`).join('');
  const ticks = values.filter((_, i) => i % 2 === 0).map(p => { const i = values.indexOf(p); return `<text x="${x(i)}" y="${H - 8}" font-size="12" text-anchor="middle" fill="#9fbedb">${String(p.hour).padStart(2, '0')}h</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de temperatura horaria"><defs><linearGradient id="warm" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffc269"/><stop offset="1" stop-color="#ff7d66"/></linearGradient></defs><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#35577a"/><line x1="${L}" x2="${W - R}" y1="${T + 20}" y2="${T + 20}" stroke="#35577a" stroke-dasharray="4 5"/><path d="${path}" fill="none" stroke="url(#warm)" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5"/>${line}${ticks}<text x="${L}" y="13" font-size="12" fill="#e6bd8c">${rounded(Math.max(...values.map(v => v.temp)))}</text></svg>`;
}

function render() {
  const a = state.data; if (!a) return;
  const d = a.daily; const cur = a.current || {};
  el('day-list').innerHTML = '';
  d.time.forEach((day, i) => {
    const w = weather(d.weather_code[i]);
    const button = document.createElement('button');
    button.className = 'day-card' + (i === state.selected ? ' active' : '');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(i === state.selected));
    button.setAttribute('aria-label', `${dateHeading(day)}, máxima ${rounded(d.temperature_2m_max[i])}, mínima ${rounded(d.temperature_2m_min[i])}, lluvia ${rounded(d.precipitation_probability_max[i], '%')}`);
    button.innerHTML = `<span class="day-name">${dayShort(day)}</span><span class="day-icon" aria-hidden="true">${w.icon}</span><span class="day-temp"><i>${rounded(d.temperature_2m_min[i])}</i> / <em>${rounded(d.temperature_2m_max[i])}</em></span><span class="day-rain">☂ ${rounded(d.precipitation_probability_max[i], '%')}</span>`;
    button.addEventListener('click', () => { state.selected = i; renderDetail(); });
    el('day-list').appendChild(button);
  });
  renderDetail();
}

function renderDetail() {
  const a = state.data, d = a.daily, i = state.selected, w = weather(d.weather_code[i]);
  const cur = a.current || {};
  const today = i === 0;
  // La cabecera muestra observación actual SOLO en hoy; otros días, previsión de máxima.
  // Las condiciones visuales corresponden al día seleccionado, no siempre a hoy.
  const heroWeather = today ? weather(cur.weather_code ?? d.weather_code[0], !(cur.is_day ?? 1)) : w;
  applyTheme(today ? (cur.weather_code ?? d.weather_code[0]) : d.weather_code[i]);
  el('hero-state').textContent = today ? 'AHORA · TIEMPO ACTUAL' : 'PREVISIÓN · DÍA SELECCIONADO';
  el('today-date').textContent = localeDate(d.time[i], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, x => x.toUpperCase());
  el('current-icon').textContent = heroWeather.icon;
  el('current-icon').dataset.icon = weatherTheme(today ? (cur.weather_code ?? d.weather_code[0]) : d.weather_code[i]);
  el('current-temp').textContent = rounded(today ? cur.temperature_2m : d.temperature_2m_max[i], '');
  el('temp-kind').textContent = today ? 'Temperatura actual' : 'Máxima prevista';
  el('current-desc').textContent = heroWeather.label;
  el('current-high').textContent = rounded(d.temperature_2m_max[i]);
  el('current-low').textContent = rounded(d.temperature_2m_min[i]);
  el('current-rain').textContent = rounded(d.precipitation_probability_max[i], '%');
  const selectedHours = dayHours(d.time[i]);
  const at14 = selectedHours.find(p => p.hour === 14) || selectedHours[Math.floor(selectedHours.length / 2)];
  el('feels-label').textContent = today ? 'Sensación' : 'Humedad (14h)';
  el('current-feels').textContent = today ? rounded(cur.apparent_temperature) : (at14 ? rounded(at14.humidity, '%') : '—');
  el('humidity-label').textContent = today ? 'Humedad' : 'UV máximo';
  el('current-humidity').textContent = today ? rounded(cur.relative_humidity_2m, '%') : rounded(d.uv_index_max[i], '');
  el('wind-label').textContent = today ? 'Viento' : 'Viento máx.';
  el('current-wind').textContent = rounded(today ? cur.wind_speed_10m : d.wind_speed_10m_max[i], ' km/h');
  document.querySelectorAll('.day-card').forEach((b, j) => { b.classList.toggle('active', i === j); b.setAttribute('aria-pressed', String(i === j)); });
  el('selected-title').textContent = dateHeading(d.time[i]);
  el('selected-icon').textContent = w.icon;
  el('selected-icon').dataset.icon = weatherTheme(d.weather_code[i]);
  el('selected-description').textContent = `${w.label}. Probabilidad máxima de precipitación: ${rounded(d.precipitation_probability_max[i], '%')}.`;
  el('detail-high').textContent = rounded(d.temperature_2m_max[i]);
  el('detail-low').textContent = rounded(d.temperature_2m_min[i]);
  el('detail-rain').textContent = rounded(d.precipitation_probability_max[i], '%');
  const hours = selectedHours;
  el('day-chart').innerHTML = chart(hours);
  el('hour-list').innerHTML = '';
  const pick = hours.filter(p => [8, 11, 14, 17, 20, 23].includes(p.hour));
  (pick.length ? pick : hours.filter((_, j) => j % 3 === 0)).forEach(p => {
    const node = document.createElement('div');
    node.className = 'hour-item';
    const night = p.hour <= 7 || p.hour >= 21;
    node.innerHTML = `<span>${String(p.hour).padStart(2, '0')}:00</span><span class="hour-icon">${weather(p.code, night).icon}</span><strong>${rounded(p.temp)}</strong><small>☂ ${rounded(p.rain, '%')}</small>`;
    el('hour-list').appendChild(node);
  });
  const noon = at14;
  el('day-extras').innerHTML = `<div class="extra"><small>💧 Humedad (14 h)</small><b>${noon ? rounded(noon.humidity, '%') : '—'}</b></div><div class="extra"><small>🌬 Viento máx.</small><b>${rounded(d.wind_speed_10m_max[i], ' km/h')}</b></div><div class="extra"><small>☀ UV máx.</small><b>${rounded(d.uv_index_max[i], '')}</b></div>`;
  const advice = chooseAdvice(i);
  el('advice-text').textContent = advice.text;
  el('advice-practical').textContent = advice.practical;
  el('advice-pill').textContent = advice.pill.text;
  el('advice-pill').className = advice.pill.className;
  el('advice-context').textContent = `Basado en la previsión del ${dateHeading(d.time[i]).toLowerCase()}. No sustituye los avisos oficiales.`;
}

function initRainLayer() {
  const layer = document.querySelector('.rain-layer');
  if (!layer) return;
  layer.innerHTML = '';
  layer.dataset.ready = '1';
  const total = 78;
  for (let i = 0; i < total; i++) {
    const drop = document.createElement('span');
    const back = i % 4 === 0;
    drop.className = 'drop' + (back ? ' back' : '');
    const left = (i / total) * 100 + (Math.random() * 2.8 - 1.4);
    const dur = back ? (1.15 + Math.random() * 0.55) : (0.82 + Math.random() * 0.48);
    const delay = -Math.random() * 1.8;
    const len = back ? (14 + Math.round(Math.random() * 14)) : (18 + Math.round(Math.random() * 22));
    const width = back ? (1.2 + Math.random() * 0.5) : (1.8 + Math.random() * 0.9);
    const alpha = back ? (0.22 + Math.random() * 0.22) : (0.42 + Math.random() * 0.36);
    drop.style.left = `${Math.max(0, Math.min(99, left)).toFixed(2)}%`;
    drop.style.setProperty('--dur', `${dur.toFixed(2)}s`);
    drop.style.setProperty('--delay', `${delay.toFixed(2)}s`);
    drop.style.setProperty('--len', `${len}px`);
    drop.style.setProperty('--alpha', alpha.toFixed(2));
    drop.style.setProperty('--w', `${width.toFixed(2)}px`);
    layer.appendChild(drop);
  }
}

function initSnowLayer() {
  const layer = document.querySelector('.snow-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const total = 40;
  for (let i = 0; i < total; i++) {
    const flake = document.createElement('span');
    let kind = 'mid';
    if (i % 5 === 0) kind = 'front';
    else if (i % 3 === 0) kind = 'back';
    flake.className = `flake ${kind}`;
    const left = (i / total) * 100 + (Math.random() * 4 - 2);
    const dur = kind === 'front' ? (7.2 + Math.random() * 4.2) : kind === 'back' ? (10.5 + Math.random() * 5.2) : (8.5 + Math.random() * 4.8);
    const delay = -Math.random() * 11;
    const drift = kind === 'front' ? (Math.random() * 70 - 35) : kind === 'back' ? (Math.random() * 30 - 15) : (Math.random() * 48 - 24);
    const size = kind === 'front' ? (4 + Math.round(Math.random() * 4)) : kind === 'back' ? (2 + Math.round(Math.random() * 2)) : (3 + Math.round(Math.random() * 3));
    const alpha = kind === 'front' ? (0.55 + Math.random() * 0.28) : kind === 'back' ? (0.22 + Math.random() * 0.18) : (0.34 + Math.random() * 0.22);
    flake.style.left = `${Math.max(0, Math.min(99, left)).toFixed(2)}%`;
    flake.style.setProperty('--dur', `${dur.toFixed(2)}s`);
    flake.style.setProperty('--delay', `${delay.toFixed(2)}s`);
    flake.style.setProperty('--drift', `${drift.toFixed(1)}px`);
    flake.style.setProperty('--size', `${size}px`);
    flake.style.setProperty('--alpha', alpha.toFixed(2));
    layer.appendChild(flake);
  }
}

function valid(data) {
  return data && data.current && data.daily && Array.isArray(data.daily.time) && data.daily.time.length === 7 && data.hourly && Array.isArray(data.hourly.time);
}
async function load() {
  el('refresh').disabled = true;
  el('status').className = 'status';
  el('status').textContent = 'Actualizando previsión…';
  const params = new URLSearchParams({
    latitude: LAT,
    longitude: LON,
    timezone: ZONE,
    forecast_days: '7',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max',
    hourly: 'temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code,uv_index'
  });
  try {
    const response = await fetch(`${API}?${params}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!valid(data)) throw new Error('Datos incompletos');
    state.data = data; state.selected = 0;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (_) {}
    render();
    el('status').textContent = `✓ Previsión actualizada · ${new Intl.DateTimeFormat('es-ES', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date())} h · Fuente: Open-Meteo`;
  } catch (err) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) {}
    if (saved && valid(saved.data)) {
      state.data = saved.data; state.selected = 0; render();
      const when = new Intl.DateTimeFormat('es-ES', { timeZone: ZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(saved.at));
      el('status').className = 'status error';
      el('status').textContent = `Sin conexión. Mostrando última previsión guardada (${when}). Los datos pueden estar desactualizados.`;
    } else {
      el('status').className = 'status error';
      el('status').textContent = 'No ha sido posible consultar el tiempo. Comprueba la conexión y pulsa ↻ para reintentar. No se muestran datos inventados.';
    }
  } finally { el('refresh').disabled = false; }
}

el('demo-enabled').addEventListener('change', event => {
  state.demo = event.target.checked;
  el('demo-controls').hidden = !state.demo;
  refreshVisualTheme();
});
el('demo-weather').addEventListener('change', event => {
  state.demoWeather = event.target.value;
  refreshVisualTheme();
});
el('demo-time').addEventListener('change', event => {
  state.demoTime = event.target.value;
  refreshVisualTheme();
});
setInterval(() => { if (!state.demo) refreshVisualTheme(); }, 60000);
el('refresh').addEventListener('click', load);
initRainLayer();
initSnowLayer();
load();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
