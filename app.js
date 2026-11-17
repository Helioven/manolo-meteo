'use strict';
const API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const FAVORITE_KEY = 'manolo-meteo-favorite-v1';
const VIEW_KEY = 'manolo-meteo-viewed-v1';
const FAVORITES_KEY = 'manolo-meteo-favorites-v2';
const MAX_FAVORITES = 5;
// Política experimental: a los 30 minutos no se generan consejos con previsiones antiguas.
const ADVICE_CACHE_MAX_AGE = 30 * 60 * 1000;
const DEFAULT_CITY = Object.freeze({id:0,name:'Córdoba',admin1:'Andalucía',country:'España',country_code:'ES',latitude:37.8795,longitude:-4.7803,timezone:'Europe/Madrid'});
const el = id => document.getElementById(id);
const tr = (es,en) => globalThis.MeteoUI?.tr(es,en) ?? es;
const english = () => globalThis.MeteoUI?.language === 'en';
function setVisualWeather(next){document.body.dataset.weather=next}
function validCity(c) { return c && typeof c.name === 'string' && c.name.length <= 100 && Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90 && Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180 && typeof c.timezone === 'string' && /^[A-Za-z0-9_+\/-]+$/.test(c.timezone); }
function favoriteCity() {
  try { const c = JSON.parse(localStorage.getItem(FAVORITE_KEY) || 'null'); return validCity(c) ? c : DEFAULT_CITY; }
  catch (_) { return DEFAULT_CITY; }
}
function readFavorites() {
 try {
  const saved=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'null');
  if(Array.isArray(saved))return saved.filter(validCity).filter((c,i,all)=>all.findIndex(x=>Math.abs(c.latitude-x.latitude)<.001&&Math.abs(c.longitude-x.longitude)<.001)===i).slice(0,MAX_FAVORITES);
 }catch(_){}
 // Restaurar solo una favorita heredada realmente guardada; la ciudad predeterminada no es una favorita.
 try {
  const legacy=JSON.parse(localStorage.getItem(FAVORITE_KEY)||'null');
  return validCity(legacy) ? [legacy] : [];
 }catch(_){return [];}
}
function viewedCity() {
  try { const c = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null'); return validCity(c) ? c : favoriteCity(); }
  catch (_) { return favoriteCity(); }
}
const state = { data: null, selected: 0, cacheAt: null, hourHorizon: 12, loadPhase:'loading', degradedRaw:null, city: viewedCity(), favorites: readFavorites(), requestId:0, searchId:0 };
function isSameCity(a,b) {
  return a && b && Number.isFinite(a.latitude) && Number.isFinite(b.latitude) &&
    Math.abs(a.latitude-b.latitude) < 0.001 && Math.abs(a.longitude-b.longitude) < 0.001;
}
function isFavorite(city){return !state.geo && state.favorites.some(c=>isSameCity(c,city))}
function saveFavorites(){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(state.favorites))}catch(_){}}
function renderFavorite(){
 const list=el('favorite-list');list.replaceChildren();
 el('favorite-count').textContent=state.favorites.length+'/5';
 el('favorite-add').hidden=!!state.geo || isFavorite(state.city);
 el('favorite-add').disabled=state.favorites.length>=MAX_FAVORITES;
 el('favorite-add').textContent=state.favorites.length>=MAX_FAVORITES?tr('Máximo de 5 ciudades','Maximum of 5 cities'):tr('☆ Guardar ciudad actual','☆ Save current city');
 el('favorite-empty').hidden=state.favorites.length!==0;
 el('location-favorite-label').textContent=state.geo ? tr('📍 Ubicación temporal · Open-Meteo','📍 Temporary location · Open-Meteo') : isFavorite(state.city)?tr('★ Favorita','★ Favourite'):tr('📍 Consulta temporal','📍 Temporary location');
 el('location-reset').hidden=!state.geo && isSameCity(state.city,DEFAULT_CITY);
 for(const city of state.favorites){
  const chip=document.createElement('div');chip.className='city-chip'+(!state.geo && isSameCity(city,state.city)?' active':'');
  const open=document.createElement('button');open.type='button';open.className='city-chip-open';open.textContent=city.name;
  open.title=cityLabel(city);open.setAttribute('aria-label',tr('Consultar ','View ')+cityLabel(city));
  open.setAttribute('aria-current',!state.geo && isSameCity(city,state.city)?'true':'false');
  open.addEventListener('click',()=>{if(state.geo || !isSameCity(city,state.city))setCity(city)});
  const remove=document.createElement('button');remove.type='button';remove.className='city-chip-remove';remove.textContent='×';
  remove.title=tr('Quitar ','Remove ')+city.name;remove.setAttribute('aria-label',tr('Quitar ','Remove ')+cityLabel(city)+tr(' de favoritas',' from favourites'));
  remove.addEventListener('click',()=>{const restoreFocus=document.activeElement===remove;state.favorites=state.favorites.filter(c=>!isSameCity(c,city));saveFavorites();renderFavorite();if(restoreFocus){const next=typeof list.querySelector==='function'?list.querySelector('.city-chip-remove'):null;(next||(!el('favorite-add').hidden?el('favorite-add'):el('location-toggle'))).focus()}});
  chip.append(open,remove);list.appendChild(chip);
 }
}
function saveCurrentFavorite(){
 if(state.geo || isFavorite(state.city)||state.favorites.length>=MAX_FAVORITES)return;
 const restoreFocus=document.activeElement===el('favorite-add');
 state.favorites.push({...state.city});saveFavorites();renderFavorite();
 if(restoreFocus){const buttons=typeof el('favorite-list').querySelectorAll==='function'?el('favorite-list').querySelectorAll('.city-chip-open'):[];(buttons[buttons.length-1]||el('location-toggle')).focus()}
}
const zone = () => state.city.timezone;
const localeDate = (date, options) => new Intl.DateTimeFormat(english() ? 'en-GB' : 'es-ES', { ...options, timeZone:'UTC' }).format(new Date(`${date}T12:00:00Z`));
const cacheKey = () => `manolo-meteo-forecast-int004-${state.city.latitude}-${state.city.longitude}-${encodeURIComponent(state.city.timezone)}`;
function countryName(city) { if(!english() || !city.country_code)return city.country;try{return new Intl.DisplayNames(['en'],{type:'region'}).of(city.country_code) || city.country}catch(_){return city.country} }
function cityLabel(city) { return [city.name,city.admin1,countryName(city)].filter(Boolean).filter((item,i,a) => a.indexOf(item)===i).join(', '); }
function setSearchExpanded(expanded, focus = false) {
 const panel=el('location-expanded'),toggle=el('location-toggle');
 panel.hidden=!expanded;
 toggle.setAttribute('aria-expanded',String(expanded));
 toggle.lastElementChild.textContent=expanded?'⌃':'⌄';
 if(expanded){el('location-hint').hidden=false;el('location-hint').textContent=tr('Escribe una ciudad.','Type a city.');}
 if(!expanded) cancelCitySearch();
 if(expanded && focus) el('location-search').focus();
}
// Las coordenadas detectadas solo viven en memoria y no se guardan como ciudad.
let geoSequence=0, geoController=null, geoMessage='';
const GEO_MAX_ACCURACY_METRES=10000;
function renderGeoUI(){
 renderSearchClear();
 const button=el('geo-button'),note=el('geo-explanation'),status=el('geo-status');
 el('location-results').setAttribute('aria-label',tr('Resultados de búsqueda','Search results'));
 el('search-privacy').textContent=tr('Al escribir, el texto se envía a Open-Meteo para buscar localidades.','As you type, your search text is sent to Open-Meteo to find locations.');
 el('brand-home').setAttribute('aria-label',tr('Manolo Meteo — volver al inicio','Manolo Meteo — back to top'));
 button.textContent=tr('Usar mi ubicación','Use my location');
 note.textContent=tr('Tu ubicación se envía a Open-Meteo para consultar el tiempo. No se guarda como ciudad.','Your location is sent to Open-Meteo to check the weather. It is not saved as a city.');
 const messages={
  locating:tr('Solicitando tu ubicación…','Requesting your location…'),
  fetching:tr('Consultando la previsión de tu ubicación…','Fetching the forecast for your location…'),
  denied:tr('No se ha concedido el permiso. Puedes buscar una ciudad.','Location permission was not granted. You can search for a city.'),
  unavailable:tr('No se ha podido obtener tu ubicación. Puedes buscar una ciudad.','Your location could not be obtained. You can search for a city.'),
  timeout:tr('La solicitud ha tardado demasiado. Puedes volver a intentarlo o buscar una ciudad.','The request timed out. You can try again or search for a city.'),
  inaccurate:tr('La ubicación no es suficientemente precisa (más de 10 km). Busca una ciudad o inténtalo de nuevo.','The location is not accurate enough (over 10 km). Search for a city or try again.'),
  invalid:tr('La ubicación recibida no es válida. Busca una ciudad o inténtalo de nuevo.','The received location is invalid. Search for a city or try again.'),
  provider:tr('No se ha podido obtener una previsión verificable. Se conserva la ciudad anterior.','A verifiable forecast could not be obtained. The previous city is preserved.')
 };
 status.textContent=messages[geoMessage]||'';status.hidden=!geoMessage;
}
function cancelGeo(){
 ++geoSequence;
 if(geoController){geoController.abort();geoController=null}
 geoMessage='';el('geo-button').disabled=false;renderGeoUI();
}
async function useMyLocation(){
 const token=++geoSequence, selection=state.requestId;
 if(geoController)geoController.abort();geoController=null;
 const button=el('geo-button');button.disabled=true;geoMessage='locating';renderGeoUI();
 let timer;
 try{
  if(!navigator.geolocation || !globalThis.isSecureContext)throw {geoCode:'unavailable'};
  const pos=await new Promise((resolve,reject)=>{
   let pendingDenied=null;
   timer=setTimeout(()=>reject(pendingDenied || {geoCode:'timeout'}),12000);
   const onError=err=>{
    const result={geoCode:err?.code===1?'denied':err?.code===3?'timeout':'unavailable'};
    if(err?.code!==1 || typeof navigator.permissions?.query!=='function'){reject(result);return}
    pendingDenied=result;
    try{
     Promise.resolve(navigator.permissions.query({name:'geolocation'})).then(permission=>{
      if(permission.state!=='granted')reject(result);
     },()=>reject(result));
    }catch(_){reject(result)}
   };
   try{navigator.geolocation.getCurrentPosition(resolve,onError,{enableHighAccuracy:false,maximumAge:0,timeout:12000})}catch(_){reject({geoCode:'unavailable'})}
  });
  clearTimeout(timer);timer=null;
  if(token!==geoSequence || selection!==state.requestId)return;
  const lat=pos?.coords?.latitude,lon=pos?.coords?.longitude,accuracy=pos?.coords?.accuracy;
  if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(accuracy)||accuracy<=0)throw {geoCode:'invalid'};
  if(accuracy>GEO_MAX_ACCURACY_METRES)throw {geoCode:'inaccurate'};
  geoMessage='fetching';renderGeoUI();
  const controller=new AbortController();geoController=controller;timer=setTimeout(()=>controller.abort(),15000);
  const response=await fetch(`${API}?${forecastParams({latitude:lat,longitude:lon},'auto')}`,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw {geoCode:'provider'};
  const raw=await response.json();
  if(token!==geoSequence || selection!==state.requestId)return;
  const data=prepareForecast(raw),candidate={id:null,name:tr('Mi ubicación','My location'),admin1:'',country:'',country_code:'',latitude:lat,longitude:lon,timezone:raw?.timezone};
  if(!validCity(candidate)||!valid(data)||!globalThis.MeteoSafety)throw {geoCode:'provider'};
  const identity=safetyCity(candidate),receivedAt=Date.now();
  try{MeteoSafety.normalize({city:identity,owner:identity,raw:data,receivedAt,now:receivedAt,source:'Open-Meteo'})}catch(_){throw {geoCode:'provider'}}
  ++state.requestId;state.geo=true;state.city=candidate;state.data=data;state.selected=0;state.cacheAt=receivedAt;state.degradedRaw=null;state.loadPhase='fresh';safetyMemo=null;
  geoMessage='';setSearchExpanded(false);updateCityUI();render();refreshLocalizedStatus();el('location-toggle').focus();
 }catch(err){
  if(token!==geoSequence || selection!==state.requestId)return;
  geoMessage=err?.geoCode || (err?.name==='AbortError'?'timeout':'provider');renderGeoUI();
 }finally{
  if(timer)clearTimeout(timer);
  if(token===geoSequence){geoController=null;button.disabled=false;renderGeoUI()}
 }
}
function updateCityUI() {
  const c = state.city;
  if(state.geo)c.name=tr('Mi ubicación','My location');
  renderGeoUI();
  el('current-location-name').textContent = c.name;
  el('location-meta').textContent = state.geo ? tr('Ubicación temporal','Temporary location')+' · '+c.timezone : `${[c.admin1, countryName(c)].filter(Boolean).join(', ')} · ${c.timezone} · ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`;
  el('hero-location').textContent = c.name;
  el('official-links').hidden = c.id !== DEFAULT_CITY.id || c.country_code !== 'ES';
  el('location-reset').hidden = !state.geo && isSameCity(c, DEFAULT_CITY);
  document.body.classList.toggle('outside-cordoba', !(Math.abs(c.latitude-DEFAULT_CITY.latitude)<.03 && Math.abs(c.longitude-DEFAULT_CITY.longitude)<.03));
  document.title = `Manolo Meteo · ${c.name}`;
  renderFavorite();
}
function setCity(city) {
  if (!validCity(city)) return;
  cancelGeo(); state.geo=false;
  const focused=document.activeElement, fromSearch=!!(focused && typeof el('location-expanded').contains==='function' && el('location-expanded').contains(focused)), fromFavorites=!!(focused && typeof el('favorite-list').contains==='function' && el('favorite-list').contains(focused));
  state.city = {id:city.id ?? null,name:city.name,admin1:city.admin1 || '',country:city.country || '',country_code:city.country_code || '',latitude:city.latitude,longitude:city.longitude,timezone:city.timezone};
  try { localStorage.setItem(VIEW_KEY, JSON.stringify(state.city)); } catch (_) {}
  el('location-search').value = '';
  el('location-results').replaceChildren();
  el('location-results').hidden = true;
  setSearchExpanded(false);
  updateCityUI();
  if(fromSearch || fromFavorites) el('location-toggle').focus();
  state.data = null;
  state.cacheAt = null; state.degradedRaw=null;state.loadPhase='loading';
  resetForecast();
  renderNextHours();
  el('current-icon').textContent = '◌';
  el('current-high').textContent = '--°';
  el('current-low').textContent = '--°';
  el('current-rain').textContent = '--%';
  el('current-feels').textContent = '--°';
  el('current-humidity').textContent = '--%';
  el('current-wind').textContent = '-- km/h';
  el('sunrise').textContent = '--:--';
  el('sunset').textContent = '--:--';
  el('daylight').textContent = tr('Horas de luz: —','Daylight: —');
  el('current-temp').textContent = '--';
  el('current-desc').textContent = tr('Consultando la nueva localidad…','Loading the new location…');
  el('day-list').textContent = tr('Cargando previsión…','Loading forecast…');
  el('day-chart').textContent = tr('Cargando…','Loading…');
  el('hour-list').textContent = tr('Cargando…','Loading…');
  load();
}
let phraseExpiryTimer=null;
function clearPhrase(){if(phraseExpiryTimer!==null&&typeof clearTimeout==='function')clearTimeout(phraseExpiryTimer);phraseExpiryTimer=null;const n=el('advice-phrase');if(n){n.textContent='';n.hidden=true}}
function resetForecast() {
  globalThis.MeteoVisual?.clear();
  clearPhrase();
  el('day-range-legend').hidden = true;
  const placeholders = {
    'today-date':tr('Consultando previsión…','Loading forecast…'), 'hero-state':tr('CARGANDO','LOADING'), 'temp-kind':tr('Temperatura','Temperature'),
    'feels-label':tr('Sensación','Feels like'), 'humidity-label':tr('Humedad','Humidity'), 'wind-label':tr('Viento','Wind'),
    'selected-title':'—', 'selected-icon':'◌', 'selected-description':tr('Consultando la nueva localidad…','Loading the new location…'),
    'detail-high':'—', 'detail-low':'—', 'detail-rain':'—', 'day-extras':'',
    'advice-pill':tr('Sin datos','No data'), 'advice-text':tr('Consultando la previsión…','Loading forecast…'),
    'advice-practical':tr('Esperando datos de esta localidad.','Waiting for data for this location.'), 'advice-context':'',
  };
  for (const [id, text] of Object.entries(placeholders)) el(id).textContent = text;
  el('advice-pill').className = 'advice-pill';
  setVisualWeather('clear');
  document.body.dataset.uxSky = 'neutral';
  syncAdviceView();
}
let searchTimer=null, searchController=null, searchActive=-1;
function cancelCitySearch(){
 clearTimeout(searchTimer);searchTimer=null;++state.searchId;
 if(searchController)searchController.abort();searchController=null;
 const input=el('location-search'),results=el('location-results');
 results.hidden=true;results.replaceChildren();input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');searchActive=-1;
 el('location-submit').disabled=false;renderSearchClear();
}
function showSearchHint(es,en){const hint=el('location-hint');hint.hidden=false;hint.textContent=tr(es,en)}
function renderSearchClear(){
 const button=el('location-clear');
 button.hidden=!el('location-search').value;
 button.setAttribute('aria-label',tr('Borrar búsqueda','Clear search'));
 button.title=tr('Borrar búsqueda','Clear search');
}
function setActiveSuggestion(index){
 const options=Array.from(el('location-results').querySelectorAll('[role=option]'));if(!options.length)return;
 searchActive=(index+options.length)%options.length;
 options.forEach((option,i)=>option.setAttribute('aria-selected',String(i===searchActive)));
 el('location-search').setAttribute('aria-activedescendant',options[searchActive].id);options[searchActive].scrollIntoView({block:'nearest'});
}
async function searchCities(event){
 event?.preventDefault();cancelCitySearch();
 const query=el('location-search').value.trim(),results=el('location-results');
 if(query.length<2){showSearchHint('Escribe al menos dos letras.','Enter at least two letters.');return}
 const id=state.searchId,controller=new AbortController();searchController=controller;
 showSearchHint('Buscando…','Searching…');
 try{
  const params=new URLSearchParams({name:query,count:'8',language:english()?'en':'es',format:'json'});
  const res=await fetch(`${GEOCODING_API}?${params}`,{cache:'no-store',signal:controller.signal});
  if(!res.ok)throw Error('HTTP '+res.status);const body=await res.json();
  if(id!==state.searchId)return;
  const cities=(Array.isArray(body.results)?body.results:[]).filter(validCity);
  if(!cities.length){showSearchHint('No se encontraron coincidencias.','No matches found.');return}
  cities.forEach((city,i)=>{const button=document.createElement('button');button.type='button';button.id='city-option-'+i;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.tabIndex=-1;button.textContent='📍 '+cityLabel(city);button.addEventListener('click',()=>{cancelCitySearch();setCity(city)});results.appendChild(button)});
  results.hidden=false;el('location-search').setAttribute('aria-expanded','true');showSearchHint('Elige una localidad.','Choose a location.');
 }catch(err){if(id===state.searchId&&err.name!=='AbortError')showSearchHint('No se pudo completar la búsqueda. Inténtalo de nuevo.','Could not complete the search. Try again.')}
 finally{if(id===state.searchId)searchController=null}
}
function weather(code, night = false) {
  if (code === 0) return { icon: night ? '☾' : '☀', label: tr('Despejado','Clear') };
  if ([1, 2].includes(code)) return { icon: night ? '☁︎' : '⛅', label: tr('Poco nuboso','Partly cloudy') };
  if (code === 3) return { icon: '☁︎', label: tr('Nublado','Overcast') };
  if ([45, 48].includes(code)) return { icon: '≋', label: tr('Niebla','Fog') };
  if ([56, 57, 66, 67].includes(code)) return { icon: '🌧', label: tr('Precipitación helada','Freezing precipitation') };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: '☂', label: tr('Llovizna','Drizzle') };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧', label: tr('Lluvia','Rain') };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄', label: tr('Nieve','Snow') };
  if ([95, 96, 97, 99].includes(code)) return { icon: '⛈', label: tr('Tormentas','Thunderstorms') };
  return { icon: '☁', label: tr('Variable','Variable') };
}
function weatherTheme(code) {
  if ([95, 96, 97, 99].includes(code)) return 'storm';
  if ([61, 63, 65, 66, 67, 80, 81, 82, 51, 53, 55, 56, 57].includes(code)) return 'rain';
  if ([45, 48].includes(code)) return 'fog';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if (code === 3) return 'cloudy';
  if ([1, 2].includes(code)) return 'partly';
  return 'clear';
}
function getLocalHour() {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: zone() }).format(new Date()));
}
function timeThemeFallback(hour) {
  if (hour < 6) return 'night';
  if (hour < 9) return 'morning';
  if (hour < 18) return 'day';
  if (hour < 21) return 'sunset';
  return 'night';
}
function minutesInZone(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:zone() }).formatToParts(date);
  return Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
}
function solarMinutes(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value)) return null;
  const hh = Number(value.slice(11,13)), mm = Number(value.slice(14,16));
  return hh < 24 && mm < 60 ? hh * 60 + mm : null;
}
function solarTheme() {
  const daily = state.data?.daily;
  const parts = new Intl.DateTimeFormat('en-GB', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:zone()}).formatToParts(new Date());
  const datePart = type => parts.find(p => p.type === type).value;
  const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
  const index = daily?.time?.indexOf(today) ?? -1;
  const sunrise = solarMinutes(daily?.sunrise?.[index]);
  const sunset = solarMinutes(daily?.sunset?.[index]);
  if (sunrise === null || sunset === null || sunset <= sunrise) return state.data?.current?.is_day === 1 ? 'day' : state.data?.current?.is_day === 0 ? 'night' : 'unknown';
  const now = minutesInZone();
  if (now < sunrise - 30 || now >= sunset + 30) return 'night';
  if (now < sunrise + 30) return 'morning';
  if (now < sunset - 30) return 'day';
  return 'sunset';
}
function renderSolar(index) {
  if (!state.data) return;
  const d = state.data.daily, day = d.time?.[index];
  const rise = d.sunrise?.[index], set = d.sunset?.[index];
  const start = typeof rise === 'string' && rise.startsWith(day + 'T') ? MeteoSafety.resolveLocal(rise, zone()) : null;
  const end = typeof set === 'string' && set.startsWith(day + 'T') ? MeteoSafety.resolveLocal(set, zone()) : null;
  el('sunrise').textContent = start === null ? '—' : rise.slice(11,16);
  el('sunset').textContent = end === null ? '—' : set.slice(11,16);
  const minutes = start !== null && end !== null && end > start ? Math.round((end-start)/60000) : null;
  el('daylight').textContent = minutes === null ? tr('Duración no disponible; pueden faltar datos solares o existir día o noche polar.','Daylight duration unavailable; solar data may be missing or polar day or night may occur.') : `${tr('Horas de luz:','Daylight:')} ${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')} min`;
  el('solar-selected-date').textContent = day ? dateHeading(day) + ' · ' + zone() : tr('Fecha no disponible','Date unavailable');
}

function applyTheme(code) {
 document.body.dataset.time=solarTheme();setVisualWeather(weatherTheme(code));
 document.body.dataset.uxSky='neutral';
 globalThis.MeteoVisual?.render({code,time:document.body.dataset.time,temperature:currentForDisplay(state.data?.current).temperature_2m});
 const note=el('sky-illustration-note');note.hidden=document.body.dataset.skyRecovery!=='night-clear';note.textContent=tr('Cielo ilustrativo: la luna no indica la fase real.','Illustrative sky: the moon does not show the actual phase.');
}

function refreshVisualTheme() {
  if (!state.data) return;
  const current = currentForDisplay(state.data.current).weather_code;
  const code = Number.isInteger(current) && globalThis.MeteoSafety?.classifyWmo(current) ? current : null;
  applyTheme(code);
  if (code === null) document.body.dataset.uxSky = 'neutral';
}

function rounded(value, suffix = '°') { return Number.isFinite(value) ? Math.round(value) + suffix : '—'; }
function roundedProbability(value) { return Number.isFinite(value) && value >= 0 && value <= 100 ? rounded(value, '%') : '—'; }
// La marca horaria de Open-Meteo cierra el intervalo de probabilidad, no lo inicia.
function hourlyProbabilityDescription(stamp, value, instant = null) {
  const probability = Number.isFinite(value) && value >= 0 && value <= 100 ? rounded(value, '%') : tr('no disponible','unavailable');
  const end = Number.isFinite(instant) ? instant : MeteoSafety.resolveLocal(stamp, zone());
  if (!Number.isFinite(end)) return tr(`Probabilidad de precipitación: ${probability}; intervalo de la hora anterior no verificable por hora local ambigua o inválida.`,`Precipitation probability: ${probability}; the preceding-hour interval cannot be verified because the local time is ambiguous or invalid.`);
  const interval = MeteoSafety.rangeText(end - 3600000, end, zone());
  return tr(`Probabilidad de precipitación en la hora anterior (${interval}): ${probability}.`,`Precipitation probability for the preceding hour (${interval}): ${probability}.`);
}
function dateHeading(day) { return localeDate(day, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, x => x.toUpperCase()); }
function dayShort(day) { return localeDate(day, { weekday: 'short', day: 'numeric' }).replace('.', ''); }

function dayHours(day) {
  const h = state.data.hourly;
  const result = [];
  for (let i = 0; i < h.time.length; i++) {
    if (h.time[i].startsWith(day + 'T')) result.push({
      time: h.time[i],
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
// Cada decisión usa las mismas horas futuras y las mismas variables.
function adviceIsStale(now = Date.now()) {
  return state.cacheAt !== null && (!Number.isFinite(state.cacheAt) || now - state.cacheAt < 0 || now - state.cacheAt > ADVICE_CACHE_MAX_AGE);
}
function rangeLabel(rows) {
  const first = rows[0].time.slice(11,16);
  const lastHour = rows[rows.length - 1].hour;
  const end = String(lastHour + 1).padStart(2, '0') + ':00';
  return first + '–' + end;
}
function contiguousGroups(rows) {
  const groups = [];
  for (const row of rows) {
    const group = groups[groups.length - 1];
    if (!group || row.hour !== group[group.length - 1].hour + 1) groups.push([row]);
    else group.push(row);
  }
  return groups;
}
function legacyChooseAdvice(index, now = new Date()) {
  const neutral = (message) => ({text:'Manolo prefiere no adivinar.', practical:message, explanation:'Comprueba la previsión actualizada y los avisos oficiales.', pill:{text:tr('Sin datos','No data'), className:'advice-pill'}});
  if (adviceIsStale(now.getTime())) return neutral('La previsión tiene más de seis horas o una fecha no válida; actualízala para obtener un consejo.');
  const day = state.data.daily.time[index];
  const stamp = localHourStamp(now);
  const allHours = dayHours(day);
  if (allHours.length < 23) return neutral('La previsión horaria de este día está incompleta.');
  const remaining = allHours.filter(h => h.time.slice(0,13) > stamp.slice(0,13));
  if (!remaining.length) return neutral('No quedan horas futuras disponibles para este día.');
  // Un dato ausente nunca equivale a cero. No aconsejar con cobertura parcial.
  if (remaining.some(h => !Number.isFinite(h.temp) || !Number.isFinite(h.rain) || h.rain < 0 || h.rain > 100 || !Number.isFinite(h.wind) || !Number.isFinite(h.code)))
    return neutral('Faltan datos horarios para valorar este periodo con seguridad.');
  const storm = remaining.filter(h => [95,96,99].includes(h.code));
  const wet = remaining.filter(h => h.rain >= 30);
  const maximum = Math.max(...remaining.map(h => h.rain));
  const candidates = remaining.filter(h => h.hour >= 8 && h.hour <= 22);
  const ranked = candidates.map(h => ({...h, score:(100-h.rain) + (30-Math.abs(22-h.temp)*2) - Math.max(h.wind-18,0)}));
  const best = ranked.length ? Math.max(...ranked.map(h => h.score)) : null;
  // Hasta 3 puntos de diferencia se consideran equivalentes, no una precisión meteorológica.
  const equivalent = ranked.filter(h => best - h.score <= 3);
  const group = contiguousGroups(equivalent).sort((a,b) => b.length-a.length)[0];
  const range = group ? rangeLabel(group) : null;
  const reasons = group ? `En ${range}: ${Math.round(Math.min(...group.map(h=>h.temp)))}–${Math.round(Math.max(...group.map(h=>h.temp)))} °C, lluvia hasta ${Math.round(Math.max(...group.map(h=>h.rain)))} % y viento hasta ${Math.round(Math.max(...group.map(h=>h.wind)))} km/h.` : '';
  let type, text, practical, explanation;
  if (storm.length) {
    type=tr('Precaución','Caution'); text='El cielo pide respeto. ⛈️';
    practical=`Posible tormenta en ${contiguousGroups(storm).map(rangeLabel).join(', ')}. Busca refugio y consulta avisos oficiales.`;
    explanation=`La previsión horaria indica tormenta en esas horas.${wet.length ? ` Probabilidad de precipitación de al menos 30 % en ${contiguousGroups(wet).map(rangeLabel).join(', ')}, con máximo del ${Math.round(maximum)} %; no significa lluvia segura.` : ''}`;
  } else if (wet.length) {
    type=maximum>=65?'Paraguas':tr('Variable','Variable'); text='El cielo tiene planes propios. ☂';
    practical=`Considera llevar paraguas: posibilidad de precipitación en ${contiguousGroups(wet).map(rangeLabel).join(', ')}.`;
    explanation=`Probabilidad horaria máxima del ${Math.round(maximum)} %; no significa lluvia segura. ${reasons}`;
  } else if (remaining.some(h=>h.temp>=33)) {
    type='Calor'; text='El termómetro viene con carácter. ☀';
    practical=`Busca sombra y agua.${range ? ` Para salir, valora ${range}.` : ''}`; explanation=`Máxima horaria restante: ${Math.round(Math.max(...remaining.map(h=>h.temp)))} °C. ${reasons}`;
  } else if (remaining.some(h=>h.wind>=35)) {
    type=tr('Viento','Wind'); text='Hoy el aire quiere protagonismo. 🌬';
    practical=`Busca zonas resguardadas.${range ? ` Valora salir en ${range}.` : ''}`; explanation=`Viento horario máximo restante: ${Math.round(Math.max(...remaining.map(h=>h.wind)))} km/h. ${reasons}`;
  } else if (remaining.some(h=>h.temp<=6)) {
    type='Chaqueta'; text='Una capa extra puede venir bien. 🧥';
    practical=`Lleva abrigo para las horas frías.${range ? ` Para salir, valora ${range}.` : ''}`; explanation=`Temperatura horaria mínima restante: ${Math.round(Math.min(...remaining.map(h=>h.temp)))} °C. ${reasons}`;
  } else {
    type='Terraza'; text='Puede ser un buen día para salir. ☕';
    practical=range ? `Entre las horas comparables, valora ${range}.` : 'No hay suficientes horas diurnas para recomendar una franja.';
    explanation=reasons || 'Consulta las horas disponibles antes de salir.';
  }
  const styles = {'Precaución':'danger','Paraguas':'rain','Variable':'mix','Calor':'warm','Viento':'mix','Chaqueta':'cold','Terraza':'ok'};
  return {text, practical, explanation, pill:{text:type, className:'advice-pill advice-pill--' + styles[type]}};
}
function chart(points) {
  if (!points.length) return tr('Sin datos horarios disponibles para esta fecha.','No hourly data is available for this date.');
  const values = points.filter(p => Number.isFinite(p.temp) && Number.isInteger(p.hour) && p.hour >= 0 && p.hour <= 23);
  if (!values.length) return tr('Sin temperaturas horarias disponibles.','No hourly temperatures are available.');
  const W = 600, H = 136, L = 30, R = 16, T = 13, B = 26;
  let mn = Math.min(...values.map(x => x.temp)) - 2, mx = Math.max(...values.map(x => x.temp)) + 2;
  if (mx <= mn) mx = mn + 1;
  const x = hour => L + hour * (W - L - R) / 23, y = v => T + (mx - v) * (H - T - B) / (mx - mn);
  // Puntos observados únicamente: no interpolar sobre horas sin temperatura.
  const line = values.map(p => `<circle cx="${x(p.hour).toFixed(1)}" cy="${y(p.temp).toFixed(1)}" r="3.5" fill="#ffbd78"/>`).join('');
  const ticks = [0,6,12,18,23].map(hour => `<text x="${x(hour).toFixed(1)}" y="${H-8}" font-size="12" text-anchor="middle" fill="#9fbedb">${String(hour).padStart(2,'0')}:00</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr('Muestras de temperatura horaria; los huecos no se interpolan','Hourly temperature samples; gaps are not interpolated')}"><defs><linearGradient id="warm" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffc269"/><stop offset="1" stop-color="#ff7d66"/></linearGradient></defs><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#35577a"/><line x1="${L}" x2="${W - R}" y1="${T + 20}" y2="${T + 20}" stroke="#35577a" stroke-dasharray="4 5"/>${line}${ticks}<text x="${L}" y="13" font-size="12" fill="#e6bd8c">${rounded(Math.max(...values.map(v => v.temp)))}</text></svg>`;
}


/* Previsión independiente de 6 horas: siempre usa el reloj local de la ciudad,
   no el día elegido en el pronóstico de 7 días. */
function localHourStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit',
    hourCycle:'h23', timeZone:zone()
  }).formatToParts(date);
  const value = key => parts.find(part => part.type === key)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}
function nextSixHours(data, now = new Date()) {
  const h = data?.hourly;
  if (!h?.time?.length) return [];
  // Exclusión de la hora actual, que ya ha empezado; cubrimos las 6 horas completas siguientes.
  const start = localHourStamp(now).slice(0,13);
  const rows = [];
  for (let i = 0; i < h.time.length; i++) {
    if (h.time[i].slice(0,13) <= start) continue;
    const temp = h.temperature_2m?.[i], rain = h.precipitation_probability?.[i], code = h.weather_code?.[i];
    if (!Number.isFinite(temp) || !Number.isFinite(rain) || rain < 0 || rain > 100 || !Number.isFinite(code)) return [];
    rows.push({ time:h.time[i], temp, rain, code });
    if (rows.length === 6) break;
  }
  return rows.length === 6 ? rows : [];
}
function legacyHourlyAdvice(rows) {
  if (!rows.length) return {kind:'neutral',text:'No hay datos suficientes para las próximas horas.'};
  const maxRain = Math.max(...rows.map(r => r.rain));
  const firstWet = rows.find(r => r.rain >= 40);
  if (maxRain >= 70) return {kind:'wet',text:`☂ Probabilidad de lluvia alta (hasta ${Math.round(maxRain)}%). Mejor tener paraguas a mano.`};
  if (firstWet) return {kind:'mixed',text:`🌦 Posibles chubascos desde las ${firstWet.time.slice(11,16)} (hasta ${Math.round(maxRain)}% de probabilidad).`};
  if (maxRain >= 20) return {kind:'mixed',text:`🌤 Puede caer alguna gota: probabilidad máxima del ${Math.round(maxRain)}%.`};
  return {kind:'dry',text:`☕ Pocas probabilidades de lluvia en las próximas seis horas (máximo ${Math.round(maxRain)}%). Terraza candidata.`};
}
// Adaptador experimental local: ante un fallo no se usa el consejo antiguo.
let safetyMemo=null;
function safetyCity(city=state.city){return {id:[city.latitude,city.longitude,city.timezone].join('|'),name:city.name,latitude:city.latitude,longitude:city.longitude,timezone:city.timezone}}
function safetySnapshot(now=Date.now()){
 if(!state.data||!Number.isFinite(state.cacheAt)||!globalThis.MeteoSafety)throw Error('Previsión o motor de seguridad no disponible.');
 const city=safetyCity(),key=city.id+'|'+state.cacheAt;
 if(safetyMemo&&safetyMemo.data===state.data&&safetyMemo.key===key)return safetyMemo.snapshot;
 const snapshot=MeteoSafety.normalize({city,owner:city,raw:state.data,receivedAt:state.cacheAt,source:'Open-Meteo',now});safetyMemo={data:state.data,key,snapshot};return snapshot;
}
function safetyEvaluation(view,day,now=Date.now()){
 try{return MeteoSafety.evaluate(safetySnapshot(now),{view,day,now})}catch(_){return {status:'invalid',coverage:'none',exposureAllowed:false,warnings:[],recommendation:null,coverageNotice:'No hay datos actualizados suficientes para evaluar el periodo.',reason:'No se puede evaluar con seguridad.'}}
}
function safetyWarningText(w){
 if(english()) return globalThis.MeteoEnglishDraft ? MeteoEnglishDraft.warning(w,zone()) : 'Weather risk detected. Consult official sources.';
 const dates=[...w.periods.map(p=>w.kind==='precipitation' && Number.isFinite(p.referenceIntervalStart) && Number.isFinite(p.referenceIntervalEnd) ? 'Intervalo de probabilidad: '+MeteoSafety.rangeText(p.referenceIntervalStart,p.referenceIntervalEnd,zone()) : p.label),...w.currentLabels.map(x=>'Dato actual: '+x),...w.staleCurrentLabels.map(x=>'Dato actual fuera de vigencia: '+x),...(w.withoutReliableTime?['sin hora fiable']:[])];
 const probs=(w.samples||[]).map(x=>x.probability).filter(x=>Number.isFinite(x)&&x>=0&&x<=100);
 const probability=w.kind==='precipitation'&&probs.length?' Probabilidad horaria máxima: '+Math.round(Math.max(...probs))+' %; es una posibilidad, no certeza.':'';
 return w.description+(dates.length?' ('+dates.join('; ')+')':'')+'.'+probability+' '+w.precaution;
}
// Formato de presentación: utiliza los instantes originales y la zona de la localidad.
function councilRangeText(start, end, timeZone, language = english() ? 'en' : 'es') {
 if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
 try {
  const locale = language === 'en' ? 'en-GB' : 'es-ES';
  const options = {timeZone, year:'numeric', month:'long', day:'numeric', weekday:'long'};
  const date = ms => new Intl.DateTimeFormat(locale, options).format(new Date(ms));
  const time = ms => new Intl.DateTimeFormat(locale, {timeZone, hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms));
  const offset = ms => new Intl.DateTimeFormat('en-GB',{timeZone,timeZoneName:'shortOffset'}).formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName')?.value || '';
  const first = MeteoSafety.localParts(start,timeZone).day, last = MeteoSafety.localParts(end,timeZone).day;
  const a = offset(start), b = offset(end), changed = a !== b;
  const from = time(start) + (changed ? ' ' + a : ''), to = time(end) + (changed ? ' ' + b : '');
  return first === last ? `${date(start)}, ${from}–${to}` : (language === 'en' ? `${date(start)}, ${from} to ${date(end)}, ${to}` : `del ${date(start)}, ${from}, al ${date(end)}, ${to}`);
 } catch (_) { return null; }
}
function chooseAdvice(index, now = new Date()) {
 const day=state.data?.daily?.time?.[index],r=safetyEvaluation('day',day,now.getTime()),warnings=(r.warnings||[]).map(safetyWarningText),rec=r.recommendation;
 if(english()) {
  const v=globalThis.MeteoEnglishDraft?.render(r,zone()) || {warnings:['Weather risk information unavailable. Check official sources.'],coverage:'Insufficient information.',recommendation:'Check the forecast before making plans.',details:''};
  return {text:v.warnings.length?'Forecast risks: '+v.warnings.join(' '):r.status==='clear'?'Forecast assessed for the selected day.':v.coverage||'Insufficient information.', practical:rec && councilRangeText(rec.start,rec.end,zone(),'en') ? 'A relatively more favourable period: '+councilRangeText(rec.start,rec.end,zone(),'en')+'. This does not guarantee safety.' : v.recommendation,explanation:[v.coverage,v.details].filter(Boolean).join(' '),pill:{text:v.warnings.length?'Caution':rec?'Period':'No data',className:'advice-pill advice-pill--'+(v.warnings.length?'danger':rec?'ok':'mix')}};
 }
 const text=warnings.length?'Previsión con riesgos: '+warnings.join(' '):r.status==='clear'?'Previsión evaluada para el día seleccionado.':r.reason||'No hay datos suficientes.';
 const practical=rec?'Franja relativamente más favorable: '+(councilRangeText(rec.start,rec.end,zone(),'es') || rec.label)+'. No garantiza seguridad.': r.abstention||r.precaution||'Consulta la previsión actualizada antes de decidir.';
 const explanation=[r.coverageNotice,rec?`Datos de la franja: ${Math.round(rec.temperatureMin)}–${Math.round(rec.temperatureMax)} °C; probabilidad horaria máxima ${Math.round(rec.probabilityMax)} %; viento máximo ${Math.round(rec.windMax)} km/h. No garantiza seguridad.`:null].filter(Boolean).join(' ');
 return {text,practical,explanation,pill:{text:warnings.length?tr('Precaución','Caution'):rec?'Franja':tr('Sin datos','No data'),className:'advice-pill advice-pill--'+(warnings.length?'danger':rec?'ok':'mix')}};
}
// Contexto de presentación enlazado a la ventana del motor, nunca a una condición momentánea.
function advicePeriodContext(result, day, now = Date.now()) {
 if (!result?.window || result.city?.id !== safetyCity().id || !Number.isFinite(now) || !Number.isFinite(result.window.start) || !Number.isFinite(result.window.end) || result.window.end <= result.window.start) return null;
 const today = MeteoSafety.localParts(now, zone()).day;
 if (!day || day < today || (day === today && result.window.start !== now) || result.window.start < now) return null;
 return {kind:day === today ? 'remaining-day' : 'full-day',day,timeZone:zone(),now,start:result.window.start,end:result.window.end};
}
// Presentación visual del periodo seleccionado; no altera la evaluación de seguridad.
function avatarForPeriod(result, dailyCode, day, now = Date.now()) {
 const neutral = 'seleccion-002/11_neutro-definitivo.webp', scene = name => 'seleccion-002/' + name + '.webp';
 if (!result || result.coverage !== 'complete' || ['invalid','stale','unknown'].includes(result.status) || !result.samples?.length || !day) return neutral;
 const rows = result.samples, kinds = (result.warnings || []).map(w => w.kind);
 if (rows.some(r => !Number.isInteger(r.code) || !Number.isFinite(r.temperature) || !Number.isFinite(r.probability))) return neutral;
 const visualGroup = c => c === 0 ? 'sun' : [1,2].includes(c) ? 'partly' : c === 3 ? 'cloud' : [51,53,61,80].includes(c) ? 'lightRain' : [55,81].includes(c) ? 'rain' : [95,96,97,99].includes(c) ? 'storm' : [71,73,75,77,85,86].includes(c) ? 'snow' : null;
 const groups = new Set(rows.map(r => visualGroup(r.code))), today = MeteoSafety.localParts(now, zone()).day;
 const dailyGroup = visualGroup(dailyCode), dailyMatches = day === today || (dailyGroup && groups.has(dailyGroup));
 if (!dailyMatches || groups.has(null)) return neutral;
 const all = fn => rows.every(fn);
 if (groups.has('storm')) {
  if (kinds.some(k => !['storm','rain','precipitation'].includes(k)) || [...groups].some(g => !['sun','partly','cloud','lightRain','rain','storm'].includes(g))) return neutral;
  return scene('10_tormenta');
 }
 if (groups.has('snow')) {
  if (groups.size !== 1 || kinds.some(k => !['snow','cold','precipitation'].includes(k)) || !all(r => r.temperature <= 0)) return neutral;
  return scene('08_frio_nieve');
 }
 if (kinds.some(k => ['storm','ice','snow','heavy','wind','fog'].includes(k))) return neutral;
 const thermal = t => t <= 0 ? 'extremeCold' : t <= 6 ? 'cold' : t >= 33 ? 'heat' : 'ordinary';
 const temperatures = new Set(rows.map(r => thermal(r.temperature)));
 if (temperatures.size !== 1) return neutral;
 const category = [...temperatures][0];
 // Frío moderado sigue siendo fiel con nubosidad variable, sin admitir mezclas con riesgos.
 const benignColdSky = category === 'cold' && [...groups].every(g => ['sun','partly','cloud'].includes(g)) && result.status === 'clear' && kinds.length === 0 && result.risks?.length === 0 && all(r => r.probability < 30);
 if (groups.size !== 1 && !benignColdSky) return neutral;
 const group = groups.size === 1 ? [...groups][0] : 'partly';
 if ((kinds.includes('heat') && category !== 'heat') || (kinds.includes('cold') && category !== 'extremeCold')) return neutral;
 if (['sun','partly','cloud'].includes(group) && kinds.some(k => ['rain','precipitation'].includes(k))) return neutral;
 if (['sun','partly','cloud'].includes(group) && all(r => r.probability < 30)) {
  if (category === 'extremeCold') return 'frio-extremo.webp';
  if (category === 'cold') return scene('07_frio_ligero');
  if (category === 'heat') return scene('09_calor_extremo');
  if (group === 'cloud') return scene('04_nublado');
  if (group === 'sun') {
   const sunrise = MeteoSafety.resolveLocal(state.data?.daily?.sunrise?.[state.selected], zone());
   const sunset = MeteoSafety.resolveLocal(state.data?.daily?.sunset?.[state.selected], zone());
   if (sunrise !== null && sunset !== null && sunrise < sunset && result.window?.start < sunset && result.window?.end > sunrise) return scene('03_soleado');
  }
 }
 if (category === 'ordinary' && !kinds.some(k => ['heat','cold'].includes(k))) {
  if (group === 'lightRain') return scene('05_lluvia_ligera');
  if (group === 'rain') return scene('06_lluvia');
 }
 return neutral;
}
// Presentación: la advertencia conserva exactamente las señales del evaluador.
function syncAdviceView(degradedSix = []) {
 const text = el('advice-text').textContent || '';
 const day = state.data?.daily?.time?.[state.selected];
 const now = Date.now();
 const result = state.data && day ? safetyEvaluation('day', day, now) : null;
 const warnings = result?.warnings || [];
 const sixResult = state.data ? safetyEvaluation('six', null, now) : null;
 const sixWarnings = sixResult?.warnings || [];
 const incomplete = result ? result.coverage !== 'complete' || ['invalid','stale','unknown'].includes(result.status) : /insuficiente|no hay datos|no se puede|sin hora fiable|insufficient|no data|unavailable|not enough/i.test(text);
 const sixOnly = [...sixWarnings.map(safetyWarningText), ...degradedSix].filter(t => !text.includes(t));
 const sixIncomplete = !!sixResult && (sixResult.coverage !== 'complete' || ['invalid','stale','unknown'].includes(sixResult.status));
 el('advice-warning').hidden = !(warnings.length || sixWarnings.length || sixOnly.length || incomplete || sixIncomplete);
 el('advice-six-warning').textContent = sixOnly.length ? tr('Próximas seis horas: ','Next six hours: ') + sixOnly.join(' ') : '';
 el('advice-six-warning').hidden = !sixOnly.length;
 const coverageText = [english() && result?.coverageNotice ? 'Some data is missing; known risks remain relevant.' : result?.coverageNotice, sixIncomplete ? tr('Faltan datos fiables para evaluar completamente las próximas seis horas.','There is not enough reliable data to assess the next six hours fully.') : ''].filter(Boolean).join(' ');
 el('advice-coverage').textContent = coverageText;
 el('advice-coverage').hidden = !coverageText;
 const dailyCode = state.data?.daily?.weather_code?.[state.selected];
 const dailyCondition = Number.isInteger(dailyCode) && globalThis.MeteoSafety?.classifyWmo(dailyCode) ? ([56,57,66,67].includes(dailyCode) ? tr('Precipitación helada','Freezing precipitation') : weather(dailyCode).label) : null;
 const period = advicePeriodContext(result, day, now);
 const codes = new Set((result?.samples || []).map(r => r.code));
 const periodCode = codes.size === 1 ? [...codes][0] : null;
 const periodCondition = Number.isInteger(periodCode) && MeteoSafety.classifyWmo(periodCode) ? ([56,57,66,67].includes(periodCode) ? tr('Precipitación helada','Freezing precipitation') : weather(periodCode).label) : tr('Condiciones variables','Variable conditions');
 el('advice-observation').textContent = result && !incomplete ? period?.kind === 'remaining-day' ? tr(`Resto de hoy en ${state.city.name}: ${periodCondition.toLowerCase()}.`,`Rest of today in ${state.city.name}: ${periodCondition.toLowerCase()}.`) : tr(`Previsión del ${dateHeading(day).toLowerCase()} para ${state.city.name}${dailyCondition ? ': ' + dailyCondition.toLowerCase() : ''}.`,`Forecast for ${dateHeading(day)} in ${state.city.name}${dailyCondition ? ': ' + dailyCondition.toLowerCase() : ''}.`) : state.data ? tr('La información disponible no cubre todo el periodo.','Available information does not cover the entire period.') : tr('Esperando datos fiables para esta localidad.','Waiting for reliable data for this location.');
 const practical = el('advice-practical').textContent || '';
 el('advice-practical').hidden = !el('advice-warning').hidden && practical.length > 12 && text.includes(practical);
 // La recomendación ya incluye la advertencia; evitar duplicarla en la tarjeta.
 el('advice-margin').hidden = true;
 const avatar = el('advice-avatar-img'), chosenAvatar = avatarForPeriod(result, dailyCode, day, now);
 const neutralAvatar = 'referencia-met-ux-003/assets/seleccion-002/11_neutro-definitivo.webp';
 avatar.onerror = () => { if (avatar.src.endsWith('/11_neutro-definitivo.webp')) el('advice-avatar').hidden = true; else avatar.src = neutralAvatar; };
 const avatarSrc = 'referencia-met-ux-003/assets/' + chosenAvatar;
 if (avatar.getAttribute('src') !== avatarSrc) avatar.src = avatarSrc;
 el('advice-avatar').hidden = false;
 const stormCaption = el('advice-avatar-caption');
 stormCaption.hidden = chosenAvatar !== 'seleccion-002/10_tormenta.webp';
 stormCaption.textContent = stormCaption.hidden ? '' : tr('Posible tormenta en parte del periodo.','Possible thunderstorm during part of the period.');
}
function hourlyAdvice(){
 const r=safetyEvaluation('six',null,Date.now()),warnings=(r.warnings||[]).map(safetyWarningText);
 if(english()) {
  const v=globalThis.MeteoEnglishDraft?.render(r,zone(),{view:'six'});
  if(!v)return {kind:'neutral',text:'Unable to assess risks. Check official sources.'};
  if(v.warnings.length)return {kind:'mixed',text:'Next six hours: '+v.warnings.join(' ')+(v.coverage?' '+v.coverage:'')};
  if(r.status!=='clear')return {kind:'neutral',text:v.coverage||'Insufficient data for the next six hours.'};
  return {kind:'dry',text:'The assessed samples show no defined risks in the next six hours. This does not guarantee safety.'};
 }
 if(warnings.length)return {kind:'mixed',text:'Próximas seis horas desde ahora: '+warnings.join(' ')+(r.coverageNotice?' '+r.coverageNotice:'')};
 if(r.status!=='clear')return {kind:'neutral',text:r.coverageNotice||r.reason||'No hay datos suficientes para las próximas seis horas.'};
 return {kind:'dry',text:'En las próximas seis horas no se detectan los riesgos evaluados en las muestras. No garantiza seguridad.'};
}
function renderNextHours() {
  const list = el('next-hours-list'), advice = el('next-hours-advice');
  list.replaceChildren();
  el('hours-data-note').textContent = '';
  if (!state.data) {
    list.textContent = tr('Previsión horaria no disponible o en carga.','Hourly forecast unavailable or loading.');
    advice.className = 'next-hours-advice'; advice.textContent = tr('Consultando las próximas horas…','Loading the next few hours…');
    el('next-hours-caption').textContent = tr('Hora local · Open-Meteo','Local time · Open-Meteo'); return;
  }
  if (adviceIsStale()) {
    advice.className = 'next-hours-advice'; advice.textContent = tr('Previsión antigua: actualiza para consultar las próximas horas.','Forecast is stale: refresh to view the coming hours.');
    el('next-hours-caption').textContent = `${tr("Hora local","Local time")} · ${state.city.name} · ${zone()} · Open-Meteo`; return;
  }
  const h = state.data.hourly, now = Date.now(), rows = []; let skipped = 0;
  for (let i=0; i<(h?.time?.length || 0); i++) {
    const stamp = h.time[i];
    if (typeof stamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(stamp)) { skipped++; continue; }
    const ms = MeteoSafety.resolveLocal(stamp,zone());
    if (ms === null) { if (stamp >= localHourStamp().slice(0,13)) skipped++; continue; }
    if (ms <= now) continue;
    rows.push({time:stamp,ms,temp:h.temperature_2m?.[i],rain:h.precipitation_probability?.[i],code:h.weather_code?.[i]});
  }
  rows.sort((a,b)=>a.ms-b.ms);
  const visible = rows.filter(row => row.ms <= now + state.hourHorizon * 3600000); let lastDay='';
  el('next-hours-caption').textContent = `${tr("Hora local","Local time")} · ${state.city.name} · ${zone()} · Open-Meteo`;
  if (!visible.length) list.textContent = tr('No hay horas futuras verificables.','No verifiable future hours are available.');
  for (const row of visible) {
    const day = row.time.slice(0,10);
    if (day !== lastDay) { const marker=document.createElement('span'); marker.className='ux3-day-marker'; marker.textContent=dateHeading(day); list.appendChild(marker); lastDay=day; }
    const index=state.data.daily?.time?.indexOf(day), sunrise=state.data.daily?.sunrise?.[index],sunset=state.data.daily?.sunset?.[index];
    const night=!!(sunrise&&sunset&&(row.time<sunrise||row.time>=sunset));
    const known=Number.isInteger(row.code)&&MeteoSafety.classifyWmo(row.code), w=known?weather(row.code,night):{icon:'—',label:tr('Condición no disponible','Condition unavailable')};
    const probability=Number.isFinite(row.rain)&&row.rain>=0&&row.rain<=100?rounded(row.rain,'%'):'—';
    const node=document.createElement('div');node.className='ux3-hour';node.setAttribute('role','group');node.setAttribute('aria-label',`${dateHeading(day)}, ${row.time.slice(11,16)}, ${w.label}, ${tr("temperatura","temperature")} ${rounded(row.temp)}. ${hourlyProbabilityDescription(row.time, row.rain, row.ms)}`);
    const time=document.createElement('b');time.textContent=row.time.slice(11,16);
    const icon=document.createElement('span');icon.className='ux3-hour-icon';icon.textContent=w.icon;icon.setAttribute('aria-hidden','true');
    const temp=document.createElement('b');temp.textContent=rounded(row.temp);
    const rain=document.createElement('small');rain.textContent=probability;
    node.append(time,icon,temp,rain);
    if (Number.isFinite(row.rain) && row.rain >= 0 && row.rain <= 100) {
      const track=document.createElement('span'),fill=document.createElement('span');
      track.className='hour-probability-track';track.setAttribute('aria-hidden','true');
      fill.className='hour-probability-fill';fill.style.width=`${row.rain}%`;track.appendChild(fill);node.appendChild(track);
    }
    list.appendChild(node);
  }
  el('hours-data-note').textContent = [visible.length<state.hourHorizon ? tr(`Solo hay ${visible.length} horas futuras verificables disponibles.`,`Only ${visible.length} verifiable future hours are available.`) : '', skipped ? tr('Se omitieron marcas horarias no verificables o ambiguas.','Unverifiable or ambiguous hourly timestamps were omitted.') : ''].filter(Boolean).join(' ');
  const result=hourlyAdvice(); advice.className='next-hours-advice next-hours-advice--'+result.kind; advice.textContent=result.text;
}

// Escala únicamente visual, calculada sobre los valores redondeados que se muestran.
function weekTemperatureScale(d) {
  const pairs=(d?.time || []).map((_,i)=>{
    const min=d.temperature_2m_min?.[i],max=d.temperature_2m_max?.[i];
    return Number.isFinite(min)&&Number.isFinite(max)&&min<=max ? {min:Math.round(min),max:Math.round(max)} : null;
  });
  const valid=pairs.filter(Boolean);
  if(!valid.length)return {pairs,low:null,high:null,span:null,partial:true};
  const low=Math.min(...valid.map(x=>x.min)),high=Math.max(...valid.map(x=>x.max)),span=high-low;
  if(!Number.isFinite(span))return {pairs,low:null,high:null,span:null,partial:true};
  return {pairs,low,high,span,partial:valid.length!==pairs.length};
}
function render() {
  const a = state.data; if (!a) return;
  const d = a.daily; const cur = currentForDisplay(a.current);
  el('day-list').innerHTML = '';
  const scale=weekTemperatureScale(d),legend=el('day-range-legend');
  legend.hidden=false;
  legend.textContent=scale.low===null ? tr('Rango semanal no disponible.','Weekly range unavailable.') : (scale.partial ? tr('Escala parcial de días con datos: ','Partial scale for days with data: ') : tr('Escala semanal: ','Weekly scale: ')) + `${scale.low}°–${scale.high}°` + tr(' · mín.–máx. redondeadas',' · rounded lows–highs');
  d.time.forEach((day, i) => {
    const code = d.weather_code[i];
    const w = Number.isInteger(code) && MeteoSafety.classifyWmo(code) ? weather(code) : {icon:'—',label:tr('Condición no disponible','Condition unavailable')};
    const button = document.createElement('button');
    button.className = 'day-card' + (i === state.selected ? ' active' : '');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(i === state.selected));
    button.setAttribute('aria-label', `${dateHeading(day)}, ${w.label}, ${tr("máxima","high")} ${rounded(d.temperature_2m_max[i])}, ${tr("mínima","low")} ${rounded(d.temperature_2m_min[i])}, ${tr("probabilidad de precipitación","precipitation probability")} ${roundedProbability(d.precipitation_probability_max[i])}`);
    const pair=scale.pairs[i];let bar='';
    if(pair && scale.low!==null){
      const left=scale.span===0?50:(pair.min-scale.low)/scale.span*100;
      const width=scale.span===0?0:(pair.max-pair.min)/scale.span*100;
      bar=`<span class="day-range" aria-hidden="true"><span class="day-range-fill${width===0?' day-range-point':''}" style="left:${left}%;width:${width}%"></span></span>`;
    } else bar='<span class="day-range day-range-unavailable" aria-hidden="true"></span>';
    button.innerHTML = `<span class="day-name">${dayShort(day)}</span><span class="day-icon" aria-hidden="true">${w.icon}</span><span class="day-min">${rounded(d.temperature_2m_min[i])}</span>${bar}<span class="day-max">${rounded(d.temperature_2m_max[i])}</span><span class="day-rain">${roundedProbability(d.precipitation_probability_max[i])}</span>`;
    button.addEventListener('click', () => { state.selected = i; renderDetail(); });
    el('day-list').appendChild(button);
  });
  renderDetail();
  renderNextHours();
}

// Guardia de presentación: reutiliza el límite técnico existente de 30 minutos.
// No altera muestras, umbrales meteorológicos, avisos ni selección del Consejo.
function currentForDisplay(cur, now = Date.now()) {
 if(!cur || typeof cur !== 'object') return {};
 let time=null;
 try { const unit=state.data?.current_units?.time || state.data?.hourly_units?.time; time=unit==='unixtime' && Number.isFinite(cur.time) ? cur.time*1000 : globalThis.MeteoSafety?.resolveLocal(cur.time,zone()); } catch(_) {}
 return Number.isFinite(time) && time<=now && now-time<=ADVICE_CACHE_MAX_AGE ? cur : {};
}
function currentSampleNotice(){return currentForDisplay(state.data?.current)===state.data?.current?'':tr(' · Dato actual caducado o sin fecha verificable.',' · Current data is stale or has no verifiable timestamp.');}
function renderDetail() {
  const a = state.data, d = a.daily, i = state.selected, dayCode = d.weather_code[i];
  const w = Number.isInteger(dayCode) && MeteoSafety.classifyWmo(dayCode) ? weather(dayCode) : {icon:'—',label:tr('Condición no disponible','Condition unavailable')};
  const cur = currentForDisplay(a.current);
  const today = d.time[i] === localHourStamp().slice(0, 10);
  renderSolar(i);
  // La portada muestra siempre el dato actual de la localidad; el detalle mantiene el día seleccionado.
  const todayIndex = d.time.indexOf(localHourStamp().slice(0, 10));
  const currentCode = Number.isInteger(cur.weather_code) && globalThis.MeteoSafety?.classifyWmo(cur.weather_code) ? cur.weather_code : null;
  const heroWeather = currentCode === null ? { icon:'◌', label:tr('Condición actual no disponible','Current conditions unavailable') } : weather(currentCode, !(cur.is_day ?? 1));
  applyTheme(currentCode);
  if (currentCode === null) document.body.dataset.uxSky = 'neutral';
  el('hero-state').textContent = currentForDisplay(a.current) === a.current ? tr('AHORA · TIEMPO ACTUAL','NOW · CURRENT WEATHER') : tr('DATO ACTUAL NO VERIFICABLE','CURRENT DATA NOT VERIFIABLE');
  el('today-date').textContent = todayIndex >= 0 ? dateHeading(d.time[todayIndex]) : tr('Fecha local no disponible','Local date unavailable');
  el('current-icon').textContent = heroWeather.icon;
  el('current-icon').dataset.icon = currentCode === null ? 'unknown' : weatherTheme(currentCode);
  el('current-temp').textContent = rounded(cur.temperature_2m, '');
  el('temp-kind').textContent = currentForDisplay(a.current) === a.current ? tr('Temperatura actual','Current temperature') : tr('Temperatura actual no disponible','Current temperature unavailable');
  el('current-desc').textContent = heroWeather.label;
  el('current-high').textContent = rounded(todayIndex >= 0 ? d.temperature_2m_max[todayIndex] : null);
  el('current-low').textContent = rounded(todayIndex >= 0 ? d.temperature_2m_min[todayIndex] : null);
  el('current-rain').textContent = roundedProbability(todayIndex >= 0 ? d.precipitation_probability_max[todayIndex] : null);
  const selectedHours = dayHours(d.time[i]);
  const at14 = selectedHours.find(p => p.hour === 14);
  el('feels-label').textContent = tr('Sensación','Feels like');
  el('current-feels').textContent = rounded(cur.apparent_temperature);
  el('humidity-label').textContent = tr('Humedad','Humidity');
  el('current-humidity').textContent = rounded(cur.relative_humidity_2m, '%');
  el('wind-label').textContent = tr('Viento','Wind');
  el('current-wind').textContent = rounded(cur.wind_speed_10m, ' km/h');
  document.querySelectorAll('.day-card').forEach((b, j) => { b.classList.toggle('active', i === j); b.setAttribute('aria-pressed', String(i === j)); });
  el('selected-title').textContent = dateHeading(d.time[i]);
  el('selected-icon').textContent = w.icon;
  el('selected-icon').dataset.icon = weatherTheme(d.weather_code[i]);
  el('selected-description').textContent = `${w.label}. ${tr("Probabilidad máxima de precipitación","Maximum precipitation probability")}: ${roundedProbability(d.precipitation_probability_max[i])}.`;
  el('detail-high').textContent = rounded(d.temperature_2m_max[i]);
  el('detail-low').textContent = rounded(d.temperature_2m_min[i]);
  el('detail-rain').textContent = roundedProbability(d.precipitation_probability_max[i]);
  const hours = selectedHours;
  el('day-chart').innerHTML = chart(hours);
  el('hour-list').innerHTML = '';
  hours.forEach(p => {
    const node = document.createElement('div');
    node.className = 'hour-item';
    const night = p.hour <= 7 || p.hour >= 21;
    const detailWeather=Number.isInteger(p.code)&&MeteoSafety.classifyWmo(p.code)?weather(p.code,night):{icon:'—'};
    const probability=Number.isFinite(p.rain)&&p.rain>=0&&p.rain<=100?rounded(p.rain,'%'):'—';
    node.setAttribute('role', 'group');
    node.setAttribute('aria-label', `${dateHeading(d.time[i])}, ${p.time.slice(11,16)}, ${detailWeather.label || tr('Condición no disponible','Condition unavailable')}, ${tr('temperatura','temperature')} ${rounded(p.temp)}. ${hourlyProbabilityDescription(p.time, p.rain)}`);
    node.innerHTML = `<span>${String(p.hour).padStart(2, '0')}:00</span><span class="hour-icon" aria-hidden="true">${detailWeather.icon}</span><strong>${rounded(p.temp)}</strong><small>☂ ${probability}</small>`;
    el('hour-list').appendChild(node);
  });
  const noon = at14;
  el('day-extras').innerHTML = `<div class="extra"><small title="${tr('Humedad prevista a las 14:00','Forecast humidity at 14:00')}">💧 ${tr('Humedad','Humidity')}</small><b>${noon ? rounded(noon.humidity, '%') : '—'}</b></div><div class="extra"><small>🌬 ${tr('Viento máx.','Max. wind')}</small><b>${rounded(d.wind_speed_10m_max[i], ' km/h')}</b></div><div class="extra"><small>☀ ${tr('UV máx.','Max. UV')}</small><b>${rounded(d.uv_index_max[i], '')}</b></div>`;
  const advice = chooseAdvice(i);
  el('advice-text').textContent = advice.text;
  el('advice-practical').textContent = advice.practical;
  el('advice-pill').textContent = advice.pill.text;
  el('advice-pill').className = advice.pill.className;
  el('advice-context').textContent = tr(`${advice.explanation} Previsión del ${dateHeading(d.time[i]).toLowerCase()} · ${state.city.name}. No sustituye los avisos oficiales.`,`${advice.explanation} Forecast for ${dateHeading(d.time[i])} · ${state.city.name}. This does not replace official warnings.`);
  syncAdviceView();
  // El selector experimental no altera el resultado ni la advertencia meteorológica.
  clearPhrase();
  const phraseNode=el('advice-phrase');
  if(phraseNode && typeof setTimeout==='function'){
    let phrase=null;
    const now=Date.now(),evaluation=safetyEvaluation('day',d.time[i],now),period=advicePeriodContext(evaluation,d.time[i],now);
    const periodLabel=period && councilRangeText(period.start,period.end,zone());
    if(periodLabel)el('advice-context').textContent += tr(' Periodo meteorológico evaluado: ',' Assessed weather period: ') + periodLabel + ' (' + zone() + ').';
    try{phrase=globalThis.MeteoPhrasePrototype?.select({evaluation,period,cityId:safetyCity().id,day:d.time[i],dailyCode:d.weather_code[i],language:english()?'en':'es',catalog:globalThis.MeteoPhraseCatalog})||null}catch(_){phrase=null}
    const remaining=state.cacheAt+ADVICE_CACHE_MAX_AGE-Date.now();
    if(phrase && Number.isFinite(remaining) && remaining>0){phraseNode.textContent=phrase.text;phraseNode.hidden=false;phraseExpiryTimer=setTimeout(clearPhrase,remaining+1)}
  }
}

function prepareForecast(data){
 if(!data||!data.hourly||!Array.isArray(data.hourly.time)||!data.daily||!Array.isArray(data.daily.time))return data;
 const fill=(part,keys)=>{const out={...part};for(const k of keys){const a=Array.isArray(part[k])?part[k]:[];out[k]=part.time.map((_,i)=>a[i]??null)}return out};
 return {...data,current:data.current&&typeof data.current==='object'?data.current:{},hourly:fill(data.hourly,['temperature_2m','precipitation_probability','relative_humidity_2m','wind_speed_10m','weather_code','uv_index']),daily:fill(data.daily,['weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max','wind_speed_10m_max','uv_index_max','sunrise','sunset'])};
}

// Respuesta incompleta: señales verificables por variable; nunca recomienda franjas.
function degradedAssessment(raw, city, now=Date.now()){
 const base={day:[],six:[],unlocated:[],identity:false};
 if(!globalThis.MeteoSafety||!raw||!validCity(city))return base;
 const lat=raw.latitude,lon=raw.longitude;
 if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180)return base;
 const rad=Math.PI/180,q=Math.sin((lat-city.latitude)*rad/2)**2+Math.cos(lat*rad)*Math.cos(city.latitude*rad)*Math.sin((lon-city.longitude)*rad/2)**2;
 if(12742*Math.asin(Math.sqrt(Math.min(1,q)))>100)return base;
 base.identity=true;
 const zoneOK=raw.timezone===city.timezone;
 let today;try{today=MeteoSafety.localParts(now,city.timezone).day}catch(_){return base}
 const items=[];const h=raw.hourly||{},times=Array.isArray(h.time)?h.time:[],codes=Array.isArray(h.weather_code)?h.weather_code:[];
 const namedUnit=raw.hourly_units?.time, aligned=Array.isArray(h.time)&&times.length===codes.length;
 const resolve=(value,unit)=>{if(!zoneOK)return null;try{if(unit==='iso8601'&&typeof value==='string')return MeteoSafety.resolveLocal(value,city.timezone);if(unit==='unixtime'&&typeof value==='number'&&Number.isFinite(value))return value*1000}catch(_){}return null};
 for(let i=0;i<Math.min(Math.max(times.length,codes.length),5000);i++){const kind=MeteoSafety.classifyWmo(codes[i]);if(kind&&kind!=='sky')items.push({kind,at:resolve(aligned?times[i]:null,namedUnit),current:false})}
 const addNumeric=(kind,at,current,value,unit,probability=false)=>items.push({kind,at,current,value,unit,probability});
 for(const [key,unit,kindOf,minimum,maximum] of [
  ['temperature_2m','°C',v=>v>=33?'heat':v<=0?'cold':null,-90,65],
  ['wind_speed_10m','km/h',v=>v>=35?'wind':null,0,400],
  ['precipitation_probability','%',v=>v>=30?'precipitation':null,0,100]]){
  const values=Array.isArray(h[key])?h[key]:[];if(raw.hourly_units?.[key]!==unit)continue;
  const matched=Array.isArray(h.time)&&times.length===values.length;
  for(let i=0;i<Math.min(values.length,5000);i++){const value=values[i];if(!Number.isFinite(value)||value<minimum||value>maximum)continue;const kind=kindOf(value);if(kind)addNumeric(kind,resolve(matched?times[i]:null,namedUnit),false,value,unit,key==='precipitation_probability')}
 }
 const c=raw.current;if(c&&typeof c==='object'){
  const at=resolve(c.time,raw.current_units?.time),kind=MeteoSafety.classifyWmo(c.weather_code);if(kind&&kind!=='sky')items.push({kind,at,current:true});
  if(raw.current_units?.temperature_2m==='°C'&&Number.isFinite(c.temperature_2m)&&c.temperature_2m>=-90&&c.temperature_2m<=65){if(c.temperature_2m>=33)addNumeric('heat',at,true,c.temperature_2m,'°C');else if(c.temperature_2m<=0)addNumeric('cold',at,true,c.temperature_2m,'°C')}
  if(raw.current_units?.wind_speed_10m==='km/h'&&Number.isFinite(c.wind_speed_10m)&&c.wind_speed_10m>=35&&c.wind_speed_10m<=400)addNumeric('wind',at,true,c.wind_speed_10m,'km/h');
 }
 for(const item of items){const {kind,at,current,value,unit,probability}=item;const term=english()?MeteoEnglishDraft.terms(kind):[MeteoSafety.textRisk(kind),MeteoSafety.precaution(kind)],text=term[0],prec=term[1],number=Number.isFinite(value)?` ${Math.round(value)} ${unit}${probability?tr(' de probabilidad; no indica intensidad ni certeza',' probability; does not indicate intensity or certainty'):''}.`:'';
  if(!Number.isFinite(at)){base.unlocated.push(tr(`${text} (señal sin hora fiable; valor no asignado a un intervalo). ${prec}`,`${text} (time is not reliable; no interval assigned). ${prec}`));continue}
  if(current&&(at>now||now-at>45*60000)){base.unlocated.push(tr(`${text} (dato actual fuera de vigencia; no representa condiciones actuales). ${prec}`,`${text} (stale current data; not representative of current conditions). ${prec}`));continue}
  const start=probability?at-3600000:at,end=probability?at:at+3600000;
  const stamp=MeteoSafety.localParts(start,city.timezone),stop=MeteoSafety.localParts(end,city.timezone);
  const label=probability?tr(`${text}: ${Math.round(value)} % en la hora ${stamp.day} ${stamp.clock}–${stop.day} ${stop.clock}; no indica intensidad ni certeza. ${prec}`,`${text}: ${Math.round(value)}% for ${stamp.day} ${stamp.clock}–${stop.day} ${stop.clock}; does not indicate intensity or certainty. ${prec}`):tr(`${text} (muestra ${stamp.day} ${stamp.clock})${number}. ${prec}`,`${text} (sample ${stamp.day} ${stamp.clock})${number}. ${prec}`);
  if(end>now&&(stamp.day===today||stop.day===today))base.day.push(label);
  if((current&&at<=now)||(!current&&start<now+6*3600000&&end>now))base.six.push(label);
 }
 // Los agregados diarios solo describen el día completo, no asignan una hora ni se trasladan a seis horas.
 const daily=raw.daily||{},days=Array.isArray(daily.time)?daily.time:[],units=raw.daily_units||{};
 for(const [key,unit,kindOf,minimum,maximum] of [
  ['temperature_2m_max','°C',v=>v>=33?'heat':null,-90,65],
  ['temperature_2m_min','°C',v=>v<=0?'cold':null,-90,65],
  ['wind_speed_10m_max','km/h',v=>v>=35?'wind':null,0,400],
  ['precipitation_probability_max','%',v=>v>=30?'precipitation':null,0,100]]){
  const values=Array.isArray(daily[key])?daily[key]:[];if(units[key]!==unit)continue;
  for(let i=0;i<Math.min(values.length,500);i++){
   const value=values[i];if(!Number.isFinite(value)||value<minimum||value>maximum)continue;const kind=kindOf(value);if(!kind)continue;
   const day=days[i], valid=zoneOK&&units.time==='iso8601'&&days.length===values.length&&typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
   const term=english()?MeteoEnglishDraft.terms(kind):[MeteoSafety.textRisk(kind),MeteoSafety.precaution(kind)],text=term[0],prec=term[1];if(!valid){base.unlocated.push(tr(`${text} (dato diario sin fecha fiable; valor no asignado a un intervalo). ${prec}`,`${text} (daily value without a reliable date; no interval assigned). ${prec}`));continue}
   if(day===today)base.day.push(tr(`${text} (agregado del día completo ${day}, sin hora concreta): ${Math.round(value)} ${unit}${kind==='precipitation'?'; no indica intensidad ni certeza':''}. ${prec}`,`${text} (daily aggregate for ${day}; no specific time): ${Math.round(value)} ${unit}${kind==='precipitation'?'; does not indicate intensity or certainty':''}. ${prec}`));
  }
 }
 for(const key of ['day','six','unlocated'])base[key]=[...new Set(base[key])];return base;
}
function showDegradedForecast(raw,now=Date.now()){
 state.degradedRaw=raw;state.loadPhase='partial';
 const a=degradedAssessment(raw,state.city,now),uncertain=tr('Información insuficiente para evaluar el periodo completo; no se descarta riesgo. Consulta fuentes oficiales y evita decidir actividades expuestas sin una previsión fiable.','Insufficient information to assess the whole period; risk cannot be ruled out. Check official sources and avoid planning exposed activities without a reliable forecast.');
 const identity=a.identity?'':tr(' No se ha podido verificar la identidad de la localidad.',' The location identity could not be verified.');
 const summary=items=>items.length?tr('Señales conocidas: ','Known signals: ')+items.join(' ')+' ':'';
 state.data=null;state.cacheAt=null;resetForecast();
 for(const id of ['current-temp','current-high','current-low','current-rain','current-feels','current-humidity','current-wind','sunrise','sunset','daylight'])el(id).textContent='—';
 el('current-desc').textContent=tr('Información meteorológica insuficiente.','Insufficient weather information.');el('current-icon').textContent='◌';el('selected-description').textContent=tr('Previsión incompleta.','Forecast incomplete.');el('solar-selected-date').textContent=tr('Fecha no disponible','Date unavailable');el('day-list').textContent=tr('Previsión diaria incompleta.','Daily forecast incomplete.');el('day-chart').textContent=tr('Sin datos suficientes.','Insufficient data.');el('hour-list').textContent=tr('Sin datos suficientes.','Insufficient data.');el('next-hours-list').textContent=tr('Previsión horaria incompleta.','Hourly forecast incomplete.');
 el('advice-pill').textContent=tr('Precaución','Caution');el('advice-pill').className='advice-pill advice-pill--danger';
 el('advice-text').textContent=summary(a.day)+summary(a.unlocated)+uncertain+identity;
 el('advice-practical').textContent=tr('No se recomienda ninguna franja con la información disponible.','No time window can be recommended from the available information.');
 el('advice-context').textContent=tr('No se han estimado horas ni valores ausentes. ','No missing times or values have been estimated. ')+state.city.name+'.';
 el('next-hours-advice').className='next-hours-advice next-hours-advice--mixed';
 el('next-hours-advice').textContent=summary(a.six)+summary(a.unlocated)+uncertain+identity;
 el('status').className='status error';el('status').textContent=tr('No ha sido posible elaborar una previsión completa: datos incompletos o no verificables. No se recomiendan franjas.','A complete forecast could not be prepared: data is incomplete or unverifiable. No time window is recommended.');
 syncAdviceView(a.six);
}
function validCachedForecast(saved){
 if(!saved||!Number.isFinite(saved.at)||saved.city?.id!==safetyCity().id||!valid(saved.data)||!globalThis.MeteoSafety)return false;
 try{const identity=safetyCity();MeteoSafety.normalize({city:identity,owner:identity,raw:saved.data,receivedAt:saved.at,now:saved.at,source:'Open-Meteo'});return true}catch(_){return false}
}
function valid(data) {
  const d = data?.daily, h = data?.hourly;
  if (!data?.current || !Array.isArray(d?.time) || d.time.length !== 7 || !Array.isArray(h?.time)) return false;
  if (!d.time.every(t => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t)) || !h.time.every(t => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t))) return false;
  const daily = ['weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max','wind_speed_10m_max','uv_index_max','sunrise','sunset'];
  const hourly = ['temperature_2m','precipitation_probability','relative_humidity_2m','wind_speed_10m','weather_code','uv_index'];
  return daily.every(k => Array.isArray(d[k]) && d[k].length === d.time.length) && hourly.every(k => Array.isArray(h[k]) && h[k].length === h.time.length);
}
function forecastParams(city, requestedZone=city.timezone) {
 return new URLSearchParams({latitude:city.latitude,longitude:city.longitude,timezone:requestedZone,forecast_days:'7',
  current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
  daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset',
  hourly:'temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code,uv_index'});
}
async function load() {
  const requestId = ++state.requestId;
  state.loadPhase='loading';state.degradedRaw=null;
  el('refresh').disabled = true;
  el('status').className = 'status';
  el('status').textContent = tr('Actualizando previsión…','Updating forecast…');
  const params = forecastParams(state.city);
  try {
    const response = await fetch(`${API}?${params}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    if (requestId !== state.requestId) return;
    const data = prepareForecast(raw);
    if (!valid(data)) { if(state.geo)throw Error('Previsión de ubicación incompleta'); showDegradedForecast(raw); return; }
    const identity=safetyCity();const receivedAt=Date.now();
    if(!globalThis.MeteoSafety)throw Error('Motor de seguridad no disponible');
    try { MeteoSafety.normalize({city:identity,owner:identity,raw:data,receivedAt,now:receivedAt,source:'Open-Meteo'}); } catch (_) { if(state.geo)throw Error('Previsión de ubicación no verificable'); showDegradedForecast(raw); return; }
    state.data = data; state.selected = 0; state.cacheAt = receivedAt; state.loadPhase='fresh';
    if(!state.geo)try { localStorage.setItem(cacheKey(), JSON.stringify({ at: state.cacheAt, city:safetyCity(), data })); } catch (_) {}
    render();
    el('status').textContent = `✓ ${tr("Previsión actualizada","Forecast updated")} · ${new Intl.DateTimeFormat("en-GB", { timeZone: zone(), hour: "2-digit", minute: "2-digit", hourCycle:"h23" }).format(new Date())} · ${tr("Fuente","Source")}: Open-Meteo${currentSampleNotice()}`;
  } catch (err) {
    if (requestId !== state.requestId) return;
    let saved = state.geo && state.data && Number.isFinite(state.cacheAt) ? {at:state.cacheAt,city:safetyCity(),data:state.data} : null;
    if(!state.geo)try { saved = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); } catch (_) {}
    if (validCachedForecast(saved)) {
      state.data = saved.data; state.selected = 0; state.cacheAt = saved.at; state.loadPhase='cached'; render();
      const when = new Intl.DateTimeFormat(english()?'en-GB':'es-ES', { timeZone: zone(), year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(new Date(saved.at));
      el('status').className = 'status error';
      el('status').textContent = tr(`Sin conexión. Mostrando última previsión guardada (${when}). Los datos pueden estar desactualizados.${adviceIsStale() ? " Consejos desactivados por antigüedad." : ""}`,`Offline. Showing the last saved forecast (${when}). Data may be out of date.${adviceIsStale() ? " Advice is disabled because the forecast is stale." : ""}`);
    } else {
      state.data = null; state.cacheAt = null; state.loadPhase='error';
      resetForecast();
      el('day-list').textContent = tr('Sin previsión disponible.','Forecast unavailable.');
      el('day-chart').textContent = tr('Sin datos disponibles.','Data unavailable.');
      el('hour-list').textContent = tr('Sin datos disponibles.','Data unavailable.');
      for (const id of ['current-temp','current-high','current-low','current-rain','current-feels','current-humidity','current-wind','sunrise','sunset','daylight']) el(id).textContent = '—';
      el('current-icon').textContent = '◌';
      el('current-desc').textContent = tr('Sin previsión disponible.','Forecast unavailable.');
      el('advice-text').textContent = tr('No hay datos para elaborar un consejo.','No data is available to prepare advice.');
      el('advice-practical').textContent = tr('Comprueba la conexión y vuelve a intentarlo.','Check your connection and try again.');
      el('status').className = 'status error';
      el('status').textContent = tr('No ha sido posible consultar el tiempo. Comprueba la conexión y pulsa ↻ para reintentar. No se muestran datos inventados.','Could not retrieve the forecast. Check your connection and press ↻ to retry. No invented data is displayed.');
      renderNextHours();
      el('next-hours-advice').textContent = tr('No hay previsión horaria disponible. Comprueba la conexión y vuelve a intentarlo.','No hourly forecast is available. Check your connection and try again.');
      syncAdviceView();
    }
  } finally { if (requestId === state.requestId) el('refresh').disabled = false; }
}

function refreshLocalizedStatus() {
 const phase=state.loadPhase;
 if(phase==='loading'){el('status').textContent=tr('Actualizando previsión…','Updating forecast…');return}
 if(phase==='fresh' && Number.isFinite(state.cacheAt)){
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone(),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(state.cacheAt));
  el('status').textContent=`✓ ${tr('Previsión actualizada','Forecast updated')} · ${time} · ${tr('Fuente','Source')}: Open-Meteo${currentSampleNotice()}`;return;
 }
 if(phase==='cached' && Number.isFinite(state.cacheAt)){
  const when=new Intl.DateTimeFormat(english()?'en-GB':'es-ES',{timeZone:zone(),year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(state.cacheAt));
  el('status').textContent=tr(`Sin conexión. Mostrando última previsión guardada (${when}). Los datos pueden estar desactualizados.${adviceIsStale()?' Consejos desactivados por antigüedad.':''}`,`Offline. Showing the last saved forecast (${when}). Data may be out of date.${adviceIsStale()?' Advice is disabled because the forecast is stale.':''}`);return;
 }
 if(phase==='error')el('status').textContent=tr('No ha sido posible consultar el tiempo. Comprueba la conexión y pulsa ↻ para reintentar. No se muestran datos inventados.','Could not retrieve the forecast. Check your connection and press ↻ to retry. No invented data is displayed.');
}
function switchLanguage(value) {
 if(!globalThis.MeteoUI)return;
 if(value==='en'&&!globalThis.MeteoEnglishDraft){el('language-selector').value='es';return}
 MeteoUI.set(value);el('language-selector').value=MeteoUI.language;
 if(!el('location-expanded').hidden){if(el('location-search').value.trim().length>=2) searchCities();else showSearchHint('Escribe una ciudad.','Type a city.');}
 updateCityUI();
 if(state.data)render();
 else if(state.degradedRaw)showDegradedForecast(state.degradedRaw);
 else if(state.loadPhase==='error'){
  resetForecast();el('current-desc').textContent=tr('Sin previsión disponible.','Forecast unavailable.');
  el('advice-text').textContent=tr('No hay datos para elaborar un consejo.','No data is available to prepare advice.');
  el('advice-practical').textContent=tr('Comprueba la conexión y vuelve a intentarlo.','Check your connection and try again.');
  el('day-list').textContent=tr('Sin previsión disponible.','Forecast unavailable.');
  renderNextHours();el('next-hours-advice').textContent=tr('No hay previsión horaria disponible. Comprueba la conexión y vuelve a intentarlo.','No hourly forecast is available. Check your connection and try again.');syncAdviceView();
 } else {
  resetForecast();
  el('current-desc').textContent=tr('Consultando la nueva localidad…','Loading the new location…');
  el('day-list').textContent=tr('Cargando previsión…','Loading forecast…');
  el('day-chart').textContent=tr('Cargando…','Loading…');el('hour-list').textContent=tr('Cargando…','Loading…');
  el('solar-selected-date').textContent=tr('Fecha no disponible','Date unavailable');
  el('daylight').textContent=tr('Horas de luz: —','Daylight: —');renderNextHours();
 }
 refreshLocalizedStatus();MeteoUI.apply();
}
el('language-selector').addEventListener('change',event=>switchLanguage(event.target.value));
for (const count of [6,12,24,48]) el('horizon-'+count).addEventListener('click', () => {
 state.hourHorizon=count;
 for (const n of [6,12,24,48]) el('horizon-'+n).setAttribute('aria-pressed',String(n===count));
 renderNextHours();
});
for (const [id,direction] of [['hours-back',-1],['hours-forward',1]]) el(id).addEventListener('click',()=>{
 const scroller=el('hours-scroll');
 scroller.scrollBy({left:direction*240,behavior:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});
el('location-toggle').addEventListener('click', () => {
 const expanded=el('location-toggle').getAttribute('aria-expanded')==='true';
 if(expanded){
  ++state.searchId;
  el('location-submit').disabled=false;
  el('location-results').hidden=true;
  el('location-search').value='';
  el('location-hint').hidden=true;
 }
 setSearchExpanded(!expanded,!expanded);
});
el('location-form').addEventListener('submit', searchCities);
el('geo-button').addEventListener('click',useMyLocation);
el('favorite-add').addEventListener('click',saveCurrentFavorite);
el('location-search').addEventListener('input',()=>{
 cancelCitySearch();const query=el('location-search').value.trim();
 if(query.length<2){showSearchHint('Escribe una ciudad.','Type a city.');return}
 showSearchHint('Buscando…','Searching…');searchTimer=setTimeout(()=>searchCities(),250);
});
el('location-search').addEventListener('keydown',event=>{
 const options=el('location-results').querySelectorAll('[role=option]');
 if(event.key==='Escape'){event.preventDefault();cancelCitySearch();showSearchHint('Escribe una ciudad.','Type a city.');return}
 if(!options.length||el('location-results').hidden)return;
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setActiveSuggestion(searchActive<0?(event.key==='ArrowUp'?options.length-1:0):searchActive+(event.key==='ArrowDown'?1:-1));}
 else if(event.key==='Enter'&&searchActive>=0){event.preventDefault();options[searchActive].click()}
});
el('location-clear').addEventListener('click',()=>{
 cancelCitySearch();el('location-search').value='';renderSearchClear();
 showSearchHint('Escribe una ciudad.','Type a city.');el('location-search').focus();
});
el('location-reset').addEventListener('click', () => { ++state.searchId; el('location-submit').disabled = false; setCity(DEFAULT_CITY); });
if(globalThis.MeteoUI){if(MeteoUI.language==='en'&&!globalThis.MeteoEnglishDraft)MeteoUI.set('es');el('language-selector').value=MeteoUI.language;el('language-selector').disabled=!globalThis.MeteoEnglishDraft;MeteoUI.apply();}
updateCityUI();
setInterval(() => {
  refreshVisualTheme();
  if (state.data) { renderNextHours(); renderDetail(); }
}, 60000);
el('refresh').addEventListener('click', () => { cancelGeo(); load(); });


load();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then(registration => {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) registration.update().catch(() => {});
      });
    })
    .catch(() => {});
}

// Navegación local, sin alterar la localidad ni recargar.
el('brand-home').addEventListener('click',event=>{event.preventDefault();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});






